'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');

function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}

function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (n < minV) return minV;
    if (n > maxV) return maxV;
    return n;
}

function safeIdPart(s) {
    const v = String(s || '').trim();
    if (!v) return '';
    // Keep in sync with Charging-Management's toSafeIdPart()
    return v.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

function normalizeConsumerType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'wärmepumpe' || s === 'waermepumpe' || s === 'heatpump' || s === 'hp' || s === 'wp') return 'heatPump';
    if (s === 'heizstab' || s === 'heaterrod' || s === 'rod') return 'heatingRod';
    if (s === 'klima' || s === 'klimageraet' || s === 'klimagerät' || s === 'aircondition' || s === 'ac') return 'airCondition';
    if (s === 'speicher' || s === 'storage' || s === 'battery') return 'storage';
    return 'custom';
}

function normalizeControlType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'onoff' || s === 'on/off' || s === 'switch' || s === 'enable' || s === 'aus' || s === 'sperren') return 'onOff';
    return 'limitW';
}

function getGzf(nSteuVE) {
    const n = Math.max(1, Math.round(Number(nSteuVE) || 1));
    if (n <= 1) return 1;
    if (n === 2) return 0.8;
    if (n === 3) return 0.75;
    if (n === 4) return 0.7;
    if (n === 5) return 0.65;
    if (n === 6) return 0.6;
    if (n === 7) return 0.55;
    if (n === 8) return 0.5;
    return 0.45; // >=9
}

/**
 * §14a EnWG helper module.
 *
 * Goals:
 * - Provide a central, adapter-wide §14a state (active/mode)
 * - Compute minimum power distribution (Pmin,14a) for EMS mode
 * - Expose per-wallbox caps via adapter._para14a for Charging-Management
 * - Optionally write setpoints to additional "steuerbare Verbrauchseinrichtungen" (e.g. WP/Heizstab/Klima)
 */
class Para14aModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._loads = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        this._activeDpKey = '';
        this._emsSetpointDpKey = '';
    }

    _isEnabled() {
        return !!this.adapter?.config?.installerConfig?.para14a;
    }

    _getCfg() {
        const cfg = this.adapter?.config?.installerConfig || {};
        return cfg && typeof cfg === 'object' ? cfg : {};
    }

    async _setStateIfChanged(id, val) {
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (prev === v) return;
        this._stateCache.set(id, v);
        await this.adapter.setStateAsync(id, v, true);
    }

    _buildLoadsFromConfig() {
        const cfg = this._getCfg();
        const rows = Array.isArray(cfg.para14aConsumers) ? cfg.para14aConsumers : [];

        /** @type {Array<any>} */
        const loads = [];
        const usedIds = new Set();

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i] || {};
            if (r.enabled === false) continue;

            const name = String(r.name || '').trim();
            const type = normalizeConsumerType(r.type);
            const ctrl = normalizeControlType(r.controlType);

            const setWId = String(r.setPowerWId || r.setWId || '').trim();
            const enableId = String(r.enableId || r.enableWriteId || '').trim();

            if (!setWId && !enableId) continue;

            const baseId = safeIdPart(r.key || name || `${type}_${i + 1}`) || `c${i + 1}`;
            let id = baseId;
            let n = 2;
            while (usedIds.has(id)) id = `${baseId}_${n++}`;
            usedIds.add(id);

            const installedPowerW = clamp(num(r.installedPowerW || r.powerW || r.ratedW || 0, 0), 0, 1e12);
            const priority = clamp(num(r.priority || 100, 100), 1, 999);

            loads.push({
                id,
                key: String(r.key || id),
                name: name || id,
                type,
                controlType: ctrl,
                installedPowerW,
                priority,
                setWId,
                enableId,
                // internal dp keys (filled in init)
                setWKey: '',
                enableKey: '',
            });
        }

        // deterministic: priority asc, then name
        loads.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._loads = loads;
    }

    async init() {
        // Create states always (even if the module is disabled) to make troubleshooting easier.
        await this.adapter.setObjectNotExistsAsync('para14a', {
            type: 'channel',
            common: { name: '§14a EnWG' },
            native: {},
        });

        const mk = async (id, name, type, role, writable = false, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!writable,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('para14a.active', '§14a aktiv (wirksam)', 'boolean', 'indicator', false);
        await mk('para14a.mode', '§14a Modus', 'string', 'text', false);
        await mk('para14a.controlSource', '§14a Quelle', 'string', 'text', false);
        await mk('para14a.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.nSteuVE', 'Anzahl steuerbare Verbrauchseinrichtungen (nSteuVE)', 'number', 'value', false);
        await mk('para14a.gzf', 'Gleichzeitigkeitsfaktor (GZF)', 'number', 'value', false);
        await mk('para14a.pMinW', 'Mindestleistung gesamt Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.emsSetpointW', 'Sollwert EMS (W) (optional)', 'number', 'value.power', false, 'W');
        await mk('para14a.evcsTotalCapW', 'EVCS Gesamtlimit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.debug', 'Debug (JSON)', 'string', 'text', false);

        // Load config and upsert dp mappings
        this._buildLoadsFromConfig();

        const cfg = this._getCfg();

        // Optional activation datapoint
        const activeId = String(cfg.para14aActiveId || '').trim();
        if (activeId && this.dp) {
            this._activeDpKey = 'p14a.active';
            await this.dp.upsert({ key: this._activeDpKey, objectId: activeId, dataType: 'mixed', direction: 'in' });
        } else {
            this._activeDpKey = '';
        }

        // Optional EMS setpoint datapoint (total allowed max net power for all steuVE)
        const spId = String(cfg.para14aEmsSetpointWId || '').trim();
        if (spId && this.dp) {
            this._emsSetpointDpKey = 'p14a.emsSetpointW';
            await this.dp.upsert({ key: this._emsSetpointDpKey, objectId: spId, dataType: 'number', direction: 'in', unit: 'W' });
        } else {
            this._emsSetpointDpKey = '';
        }

        // Upsert datapoints for load actuation
        for (const l of this._loads) {
            const baseKey = `p14a.${l.id}`;
            try {
                if (l.setWId) {
                    const k = `${baseKey}.setW`;
                    await this.dp?.upsert({ key: k, objectId: l.setWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25 });
                    l.setWKey = k;
                }
                if (l.enableId) {
                    const k = `${baseKey}.enable`;
                    await this.dp?.upsert({ key: k, objectId: l.enableId, dataType: 'boolean', direction: 'out' });
                    l.enableKey = k;
                }

                // Visible states for last applied target
                await this.adapter.setObjectNotExistsAsync(`para14a.consumers.${l.id}`, {
                    type: 'channel',
                    common: { name: l.name },
                    native: {},
                });
                await mk(`para14a.consumers.${l.id}.type`, 'Typ', 'string', 'text', false);
                await mk(`para14a.consumers.${l.id}.targetW`, 'Sollwert (W)', 'number', 'value.power', false, 'W');
                await mk(`para14a.consumers.${l.id}.applied`, 'Angewendet', 'boolean', 'indicator', false);
                await mk(`para14a.consumers.${l.id}.status`, 'Status', 'string', 'text', false);
            } catch (e) {
                this.adapter.log.warn(`[§14a] datapoint init failed for '${l.name}': ${e?.message || e}`);
            }
        }
    }

    _readActiveSignal() {
        const cfg = this._getCfg();

        // Feature must be enabled.
        if (!cfg.para14a) return { active: false, source: 'disabled' };

        // If a dedicated activation datapoint is mapped, it takes precedence.
        if (this._activeDpKey && this.dp) {
            const raw = this.dp.getRaw(this._activeDpKey);
            if (raw === null || raw === undefined) return { active: false, source: 'dp_missing' };
            if (typeof raw === 'boolean') return { active: raw, source: 'dp' };
            if (typeof raw === 'number') return { active: raw !== 0, source: 'dp' };
            if (typeof raw === 'string') {
                const s = raw.trim().toLowerCase();
                if (s === '' || s === '0' || s === 'false' || s === 'off' || s === 'inactive') return { active: false, source: 'dp' };
                if (s === '1' || s === 'true' || s === 'on' || s === 'active') return { active: true, source: 'dp' };
            }
            // fallback: truthy
            return { active: !!raw, source: 'dp' };
        }

        // No activation DP configured -> treat "para14a" as always-on (simplest rollout)
        return { active: true, source: 'config' };
    }

    _computeDistribution({ mode, minPerDeviceW, evcsCount, hasWP, hasKlima, pSumWP, pSumKlima, externalTotalSetpointW }) {
        const baseW = Math.max(0, minPerDeviceW);
        const nSteuVE = Math.max(0, Math.round(evcsCount)) + (hasWP ? 1 : 0) + (hasKlima ? 1 : 0);
        const n = Math.max(1, nSteuVE);
        const gzf = getGzf(n);

        const big = (pSumWP > 11000) || (pSumKlima > 11000);
        const primaryW = (mode === 'ems' && big)
            ? Math.max(0, Math.max(0.4 * pSumWP, 0.4 * pSumKlima))
            : baseW;

        const secondaryW = (n > 1) ? (gzf * baseW) : 0;

        const pMinW = primaryW + (n - 1) * secondaryW;

        // In EMS mode, a Netzbetreiber/Steuerbox may provide an explicit total setpoint.
        // If present, we use it as the effective total budget. Otherwise we use the computed minimum.
        const totalBudgetW = (mode === 'ems' && typeof externalTotalSetpointW === 'number' && Number.isFinite(externalTotalSetpointW) && externalTotalSetpointW > 0)
            ? Math.max(0, externalTotalSetpointW)
            : pMinW;

        return { nSteuVE: n, gzf, pMinW, primaryW, secondaryW, totalBudgetW };
    }

    async tick() {
        // Always keep adapter._para14a up to date, so other modules can safely read it.
        if (!this.adapter) return;

        const cfg = this._getCfg();
        const { active, source } = this._readActiveSignal();

        const modeRaw = String(cfg.para14aMode || cfg.para14aControlMode || 'direct').trim().toLowerCase();
        const mode = (modeRaw === 'ems' || modeRaw === 'formula') ? 'ems' : 'direct';

        const minPerDeviceW = clamp(num(cfg.para14aMinPerDeviceW, 4200), 0, 1e12);

        // EVCS are always part of §14a (Fallgruppe 2.4.1.a)
        const evcsList = Array.isArray(this.adapter.evcsList) ? this.adapter.evcsList : [];
        const controllableEvcs = evcsList.filter(wb => wb && (String(wb.setCurrentAId || '').trim() || String(wb.setPowerWId || '').trim()));
        const evcsCount = controllableEvcs.length;

        // Additional consumers from table
        const hpRows = this._loads.filter(l => l.type === 'heatPump' || l.type === 'heatingRod');
        const klimaRows = this._loads.filter(l => l.type === 'airCondition');
        const hasWP = hpRows.length > 0;
        const hasKlima = klimaRows.length > 0;
        const pSumWP = hpRows.reduce((s, r) => s + num(r.installedPowerW, 0), 0);
        const pSumKlima = klimaRows.reduce((s, r) => s + num(r.installedPowerW, 0), 0);

        // Optional external EMS setpoint (W)
        const externalTotalSetpointW = (active && mode === 'ems' && this._emsSetpointDpKey && this.dp)
            ? this.dp.getNumber(this._emsSetpointDpKey, null)
            : null;

        const dist = this._computeDistribution({
            mode,
            minPerDeviceW,
            evcsCount,
            hasWP,
            hasKlima,
            pSumWP,
            pSumKlima,
            externalTotalSetpointW,
        });

        // Determine which group is primary (for EMS distribution)
        let primaryGroup = null;
        if (mode === 'ems') {
            const big = (pSumWP > 11000) || (pSumKlima > 11000);
            if (big) {
                primaryGroup = (0.4 * pSumWP >= 0.4 * pSumKlima) ? (hasWP ? 'wp' : (hasKlima ? 'klima' : 'evcs')) : (hasKlima ? 'klima' : (hasWP ? 'wp' : 'evcs'));
            } else {
                // Prefer heat pump for comfort, then climate, then EVCS
                primaryGroup = hasWP ? 'wp' : (hasKlima ? 'klima' : 'evcs');
            }
        }

        // Build EVCS caps
        /** @type {Record<string, number>} */
        const evcsCapsBySafe = {};
        let evcsTotalCapW = 0;

        if (active) {
            if (mode === 'direct') {
                // Direktansteuerung: 4,2kW je Verbraucher
                for (const wb of controllableEvcs) {
                    const safe = safeIdPart(wb.key || wb.name || wb.index || '');
                    const capW = minPerDeviceW > 0 ? minPerDeviceW : 0;
                    evcsCapsBySafe[safe] = capW;
                    evcsTotalCapW += capW;
                }
            } else {
                // EMS: allocate primaryW once, secondaryW for the remaining steuVE
                // EVCS are counted individually.
                const caps = [];
                for (let i = 0; i < controllableEvcs.length; i++) {
                    caps.push(dist.secondaryW);
                }
                // If EVCS is the primary group, promote the first EVCS to primaryW.
                if (primaryGroup === 'evcs' && caps.length) caps[0] = dist.primaryW;
                for (let i = 0; i < controllableEvcs.length; i++) {
                    const wb = controllableEvcs[i];
                    const safe = safeIdPart(wb.key || wb.name || wb.index || '');
                    const capW = clamp(num(caps[i], 0), 0, 1e12);
                    evcsCapsBySafe[safe] = capW;
                    evcsTotalCapW += capW;
                }
            }
        }

        // Persist adapter-wide snapshot for other modules (Charging-Management)
        this.adapter._para14a = {
            enabled: !!cfg.para14a,
            active: !!active,
            source,
            mode,
            minPerDeviceW,
            nSteuVE: dist.nSteuVE,
            gzf: dist.gzf,
            pMinW: dist.pMinW,
            totalBudgetW: dist.totalBudgetW,
            emsSetpointW: (typeof externalTotalSetpointW === 'number' && Number.isFinite(externalTotalSetpointW)) ? externalTotalSetpointW : 0,
            evcsCapsBySafe,
            evcsTotalCapW,
        };

        // Publish states
        await this._setStateIfChanged('para14a.active', !!active);
        await this._setStateIfChanged('para14a.mode', mode);
        await this._setStateIfChanged('para14a.controlSource', String(source || ''));
        await this._setStateIfChanged('para14a.minPerDeviceW', Math.round(minPerDeviceW));
        await this._setStateIfChanged('para14a.nSteuVE', dist.nSteuVE);
        await this._setStateIfChanged('para14a.gzf', dist.gzf);
        await this._setStateIfChanged('para14a.pMinW', Math.round(dist.pMinW));
        await this._setStateIfChanged('para14a.emsSetpointW', Math.round(num(externalTotalSetpointW, 0)));
        await this._setStateIfChanged('para14a.evcsTotalCapW', Math.round(evcsTotalCapW));

        // For non-EVCS consumers: write targets only when §14a is active; when inactive, restore to installed power (if provided).
        const debug = {
            active,
            source,
            mode,
            primaryGroup,
            evcsCount,
            hasWP,
            hasKlima,
            pSumWP,
            pSumKlima,
            dist,
        };

        // Group budgets for EMS mode
        let wpGroupBudgetW = 0;
        let klimaGroupBudgetW = 0;

        if (active && mode === 'ems') {
            // First determine how many non-EVCS groups we have and their default budgets
            const nonEvcsBudgets = [];
            if (hasWP) nonEvcsBudgets.push({ group: 'wp', budgetW: dist.secondaryW });
            if (hasKlima) nonEvcsBudgets.push({ group: 'klima', budgetW: dist.secondaryW });

            // Promote primary group if it is not EVCS
            if (primaryGroup === 'wp') {
                const e = nonEvcsBudgets.find(x => x.group === 'wp');
                if (e) e.budgetW = dist.primaryW;
            } else if (primaryGroup === 'klima') {
                const e = nonEvcsBudgets.find(x => x.group === 'klima');
                if (e) e.budgetW = dist.primaryW;
            }

            // Assign budgets
            wpGroupBudgetW = (nonEvcsBudgets.find(x => x.group === 'wp')?.budgetW) || 0;
            klimaGroupBudgetW = (nonEvcsBudgets.find(x => x.group === 'klima')?.budgetW) || 0;
        }

        // Direct-mode group budgets (Wärmepumpe/Klima > 11kW): use scaling factor * sum of connected power.
        // This follows the BNetzA minimum power rule for Fallgruppe 2.4.1.b / 2.4.1.c.
        const scalingFactor = 0.4;
        const wpGroupDirectW = (active && mode === 'direct' && pSumWP > 11000) ? Math.round(Math.max(minPerDeviceW, pSumWP * scalingFactor)) : Math.round(minPerDeviceW);
        const klimaGroupDirectW = (active && mode === 'direct' && pSumKlima > 11000) ? Math.round(Math.max(minPerDeviceW, pSumKlima * scalingFactor)) : Math.round(minPerDeviceW);

        for (const l of this._loads) {
            const base = `para14a.consumers.${l.id}`;
            await this._setStateIfChanged(`${base}.type`, l.type);

            // Determine target
            let targetW = 0;

            if (!active) {
                // restore
                if (l.controlType === 'limitW' && l.installedPowerW > 0) {
                    targetW = l.installedPowerW;
                } else {
                    // If we cannot restore deterministically, we do not write.
                    targetW = NaN;
                }
            } else if (mode === 'direct') {
                if (l.type === 'heatPump' || l.type === 'heatingRod') targetW = wpGroupDirectW;
                else if (l.type === 'airCondition') targetW = klimaGroupDirectW;
                else targetW = minPerDeviceW;
            } else {
                // EMS distribution
                if (l.type === 'heatPump' || l.type === 'heatingRod') targetW = wpGroupBudgetW;
                else if (l.type === 'airCondition') targetW = klimaGroupBudgetW;
                else targetW = dist.secondaryW;
            }

            // Clamp to installed
            if (active && l.installedPowerW > 0 && Number.isFinite(targetW)) {
                targetW = Math.min(targetW, l.installedPowerW);
            }

            // If this is a grouped category, distribute budget proportionally across group members.
            let perDeviceTargetW = targetW;
            if (active && (mode === 'ems' || mode === 'direct')) {
                if (l.type === 'heatPump' || l.type === 'heatingRod') {
                    const sum = hpRows.reduce((s, r) => s + (r.installedPowerW > 0 ? r.installedPowerW : 0), 0);
                    if (hpRows.length > 1 && sum > 0 && l.installedPowerW > 0) {
                        perDeviceTargetW = targetW * (l.installedPowerW / sum);
                    } else if (hpRows.length > 1) {
                        perDeviceTargetW = targetW / hpRows.length;
                    }
                } else if (l.type === 'airCondition') {
                    const sum = klimaRows.reduce((s, r) => s + (r.installedPowerW > 0 ? r.installedPowerW : 0), 0);
                    if (klimaRows.length > 1 && sum > 0 && l.installedPowerW > 0) {
                        perDeviceTargetW = targetW * (l.installedPowerW / sum);
                    } else if (klimaRows.length > 1) {
                        perDeviceTargetW = targetW / klimaRows.length;
                    }
                }
            }

            if (!Number.isFinite(perDeviceTargetW)) {
                // Skip writing (unknown restore)
                await this._setStateIfChanged(`${base}.targetW`, 0);
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'skipped');
                continue;
            }

            // Write
            const ctx = { dp: this.dp, adapter: this.adapter };
            const consumer = {
                type: 'load',
                key: l.id,
                name: l.name,
                setWKey: l.setWKey,
                enableKey: l.enableKey,
            };

            // onOff mode: interpret targetW > 0 => enabled, 0 => disabled
            const effectiveTargetW = (l.controlType === 'onOff') ? (active ? 0 : 1) : perDeviceTargetW;

            const res = await applySetpoint(ctx, consumer, { targetW: Math.round(effectiveTargetW) });
            await this._setStateIfChanged(`${base}.targetW`, Math.round(perDeviceTargetW > 0 ? perDeviceTargetW : 0));
            await this._setStateIfChanged(`${base}.applied`, !!res.applied);
            await this._setStateIfChanged(`${base}.status`, String(res.status || ''));
        }

        try {
            await this._setStateIfChanged('para14a.debug', JSON.stringify(debug));
        } catch {
            // ignore
        }
    }
}

module.exports = { Para14aModule };
