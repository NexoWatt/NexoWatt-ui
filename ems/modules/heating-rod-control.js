'use strict';

const { BaseModule } = require('./base');

function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}

function safeSlot(slot) {
    const s = Math.round(Number(slot) || 0);
    if (s < 1) return 1;
    if (s > 10) return 10;
    return s;
}

function nowMs() {
    return Date.now();
}

function normalizeMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'manual' || s === 'manuell') return 'manual';
    if (s === 'off' || s === 'aus' || s === '0') return 'off';
    return 'pvAuto';
}

function normalizeUserMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s || s === 'inherit' || s === 'system') return 'inherit';
    if (s === 'auto' || s === 'pvauto' || s === 'pv' || s === 'pva') return 'pvAuto';
    if (s === 'manual1' || s === 'stufe1' || s === 'level1') return 'manual1';
    if (s === 'manual2' || s === 'stufe2' || s === 'level2') return 'manual2';
    if (s === 'manual3' || s === 'stufe3' || s === 'level3') return 'manual3';
    if (s === 'off' || s === 'aus' || s === '0') return 'off';
    return 'inherit';
}

function normalizeConsumerType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'generic';
    if (s === 'heatingrod' || s === 'heating_rod' || s === 'heating-rod' || s === 'immersion' || s === 'heizstab' || s === 'rod') return 'heatingRod';
    if (s === 'heatpump' || s === 'heat_pump' || s === 'heat-pump' || s === 'waermepumpe' || s === 'wärmepumpe' || s === 'hvac' || s === 'klima') return 'heatPump';
    return 'generic';
}

function defaultStagePower(maxPowerW, stageCount, idx) {
    const cnt = Math.max(1, Math.round(Number(stageCount) || 1));
    const maxW = Math.max(0, Math.round(Number(maxPowerW) || 0));
    if (!maxW) return 0;
    const base = Math.floor(maxW / cnt);
    const rest = maxW - (base * cnt);
    return base + (idx === cnt - 1 ? rest : 0);
}

function computeStageDefaults(maxPowerW, stageCount) {
    const stages = [];
    let cumulative = 0;
    for (let i = 0; i < stageCount; i++) {
        const powerW = defaultStagePower(maxPowerW, stageCount, i);
        cumulative += powerW;
        const offMargin = Math.max(100, Math.round(powerW * 0.4));
        stages.push({
            index: i + 1,
            powerW,
            onAboveW: cumulative,
            offBelowW: Math.max(0, cumulative - offMargin),
        });
    }
    return stages;
}

function quickManualLevelToStageCount(stageCount, level) {
    const cnt = Math.max(1, Math.round(Number(stageCount) || 1));
    const lvl = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
    const fractions = [0.25, 0.5, 0.75];
    const target = Math.ceil(cnt * fractions[lvl - 1]);
    return Math.max(1, Math.min(cnt, target));
}

class HeatingRodControlModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._devices = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        /** @type {Map<string, any>} */
        this._stageCtl = new Map();
    }

    _isEnabled() {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableHeatingRodControl);
    }

    _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.heatingRod && typeof this.adapter.config.heatingRod === 'object')
            ? this.adapter.config.heatingRod
            : {};
        return cfg;
    }

    _getVisFlowSlots() {
        const vis = (this.adapter && this.adapter.config && this.adapter.config.vis && typeof this.adapter.config.vis === 'object')
            ? this.adapter.config.vis
            : {};
        const fs = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
        const arr = Array.isArray(fs.consumers) ? fs.consumers : [];
        return arr;
    }

    _getDatapoints() {
        return (this.adapter && this.adapter.config && this.adapter.config.datapoints && typeof this.adapter.config.datapoints === 'object')
            ? this.adapter.config.datapoints
            : {};
    }

    async _setStateIfChanged(id, val) {
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (prev === v) return;
        this._stateCache.set(id, v);
        await this.adapter.setStateAsync(id, v, true);
        // Own adapter states must also reach the live /api/state cache immediately.
        // Otherwise the VIS can briefly see stale/0 values (e.g. Heizstab in Energiefluss).
        try {
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue(String(id), v, Date.now());
            }
        } catch (_e) {
            // ignore cache mirror failures
        }
    }

    _buildDevicesFromConfig() {
        const cfg = this._getCfg();
        const list = Array.isArray(cfg.devices) ? cfg.devices : [];
        const flowConsumers = this._getVisFlowSlots();
        const dps = this._getDatapoints();

        /** @type {Array<any>} */
        const out = [];
        const usedSlots = new Set();

        for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const slot = safeSlot(r.slot ?? r.consumerSlot ?? (i + 1));
            if (usedSlots.has(slot)) continue;
            usedSlots.add(slot);

            const slotCfg = (flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object') ? flowConsumers[slot - 1] : {};
            const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};
            const consumerType = normalizeConsumerType(slotCfg.consumerType || slotCfg.type || slotCfg.category);

            const configuredStageCount = (() => {
                let cnt = 0;
                const prevStages = Array.isArray(r.stages) ? r.stages : [];
                for (let s = 1; s <= 12; s++) {
                    const prev = (prevStages[s - 1] && typeof prevStages[s - 1] === 'object') ? prevStages[s - 1] : {};
                    const wId = String(prev.writeId || prev.dpWriteId || prev.writeDp || ctrl[`stage${s}WriteId`] || ctrl[`heatingStage${s}WriteId`] || ((s === 1) ? (ctrl.switchWriteId || '') : '') || '').trim();
                    const rId = String(prev.readId || prev.dpReadId || prev.readDp || ctrl[`stage${s}ReadId`] || ctrl[`heatingStage${s}ReadId`] || ((s === 1) ? (ctrl.switchReadId || '') : '') || '').trim();
                    if (wId || rId) cnt = s;
                }
                return cnt;
            })();

            const stageCount = clamp(num(r.stageCount, configuredStageCount || (Array.isArray(r.stages) ? r.stages.length : 0) || 3), 1, 12);
            const maxPowerW = clamp(num(r.maxPowerW, Math.max(2000, stageCount * 2000)), 0, 1e12);
            const mode = normalizeMode(r.mode);
            const enabled = (typeof r.enabled === 'boolean') ? !!r.enabled : false;
            const minOnSec = clamp(num(r.minOnSec, 60), 0, 86400);
            const minOffSec = clamp(num(r.minOffSec, 60), 0, 86400);
            const priority = clamp(num(r.priority, 200 + slot), 1, 999);
            const boostDurationMin = clamp(num(r.boostDurationMin, cfg.boostDurationMin ?? 60), 0, 1440);
            const name = String(r.name || slotCfg.name || '').trim() || `Heizstab ${slot}`;
            const powerId = String(dps[`consumer${slot}Power`] || '').trim();
            const switchWriteFallback = String(ctrl.switchWriteId || '').trim();
            const switchReadFallback = String(ctrl.switchReadId || '').trim();

            const defaults = computeStageDefaults(maxPowerW, stageCount);
            const stages = [];
            let wiredStages = 0;
            let cumulative = 0;
            for (let s = 1; s <= stageCount; s++) {
                const prevStages = Array.isArray(r.stages) ? r.stages : [];
                const prev = (prevStages[s - 1] && typeof prevStages[s - 1] === 'object') ? prevStages[s - 1] : {};
                const writeId = String(
                    prev.writeId ||
                    prev.dpWriteId ||
                    prev.writeDp ||
                    ctrl[`stage${s}WriteId`] ||
                    ctrl[`heatingStage${s}WriteId`] ||
                    ((s === 1) ? switchWriteFallback : '') ||
                    ''
                ).trim();
                const readId = String(
                    prev.readId ||
                    prev.dpReadId ||
                    prev.readDp ||
                    ctrl[`stage${s}ReadId`] ||
                    ctrl[`heatingStage${s}ReadId`] ||
                    ((s === 1) ? switchReadFallback : '') ||
                    ''
                ).trim();
                const def = defaults[s - 1];
                const powerW = clamp(num(prev.powerW, def.powerW), 0, 1e12);
                cumulative += powerW;
                const onAboveW = clamp(num(prev.onAboveW, def.onAboveW), 0, 1e12);
                const offBelowW = clamp(num(prev.offBelowW, def.offBelowW), 0, onAboveW);
                if (writeId && wiredStages === (s - 1)) wiredStages = s;
                stages.push({
                    index: s,
                    powerW,
                    onAboveW,
                    offBelowW,
                    writeId,
                    readId,
                    writeKey: '',
                    readKey: '',
                });
            }

            out.push({
                slot,
                id: `c${slot}`,
                name,
                enabled,
                mode,
                minOnSec,
                minOffSec,
                priority,
                boostDurationMin,
                maxPowerW,
                stageCount,
                wiredStages,
                consumerType,
                powerId,
                stages,
                userEnabledKey: `hr.user.c${slot}.regEnabled`,
                userModeKey: `hr.user.c${slot}.mode`,
                pWKey: '',
            });
        }

        out.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._devices = out;
    }

    async init() {
        await this.adapter.setObjectNotExistsAsync('heatingRod', {
            type: 'channel',
            common: { name: 'Heizstab' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('heatingRod.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('heatingRod.user', {
            type: 'channel',
            common: { name: 'User' },
            native: {},
        });

        const ensureDefault = async (id, val) => {
            try {
                const s = await this.adapter.getStateAsync(id);
                if (!s || s.val === null || s.val === undefined) {
                    await this.adapter.setStateAsync(id, val, true);
                }
            } catch (_e) {
                try { await this.adapter.setStateAsync(id, val, true); } catch (_e2) {}
            }
        };

        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`heatingRod.user.c${i}`, {
                type: 'channel',
                common: { name: `Consumer ${i}` },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`heatingRod.user.c${i}.regEnabled`, {
                type: 'state',
                common: {
                    name: 'Regelung aktiv',
                    type: 'boolean',
                    role: 'switch.enable',
                    read: true,
                    write: true,
                    def: true,
                },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`heatingRod.user.c${i}.mode`, {
                type: 'state',
                common: {
                    name: 'Betriebsmodus',
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: true,
                    def: 'inherit',
                    states: {
                        inherit: 'System',
                        pvAuto: 'Auto (PV)',
                        manual1: 'Manuell Stufe 1',
                        manual2: 'Manuell Stufe 2',
                        manual3: 'Manuell Stufe 3',
                        off: 'Aus',
                    },
                },
                native: {},
            });

            await ensureDefault(`heatingRod.user.c${i}.regEnabled`, true);
            await ensureDefault(`heatingRod.user.c${i}.mode`, 'inherit');
        }

        const mk = async (id, name, type, role, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: false,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('heatingRod.summary.pvCapW', 'PV cap (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.evcsUsedW', 'EVCS used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.thermalUsedW', 'Thermal budget used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.currentHeatingRodW', 'Current heating rod load (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.installedPvPowerW', 'Installed PV power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvDirectW', 'Current PV direct power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.nonHeatingLoadW', 'Non-heating load for PV-only budget (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvOnlyAvailableW', 'PV-only available power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvOnlyBudgetKnown', 'PV-only budget known', 'boolean', 'indicator');
        await mk('heatingRod.summary.storageReserveW', 'Reserved storage charge power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageChargeW', 'Storage charge power used for coordination (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageDischargeW', 'Storage discharge power used for coordination (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableRawW', 'PV available raw (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableW', 'PV available after thermal (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetUsedW', 'Budget used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.debugJson', 'Debug JSON', 'string', 'json');
        await mk('heatingRod.summary.zeroExportActive', 'Zero/minus feed-in logic active', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportCanProbe', 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportReason', 'Zero/minus feed-in reason', 'string', 'text');
        await mk('heatingRod.summary.zeroExportPvNowW', 'Zero/minus feed-in PV now (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportForecastOk', 'Zero/minus feed-in forecast ok', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportFeedInAtLimit', 'Zero/minus feed-in limit reached', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportProbePending', 'Zero/minus feed-in PV-rise probe pending', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportProbePvGainW', 'Zero/minus feed-in probe PV gain (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportProbeExpectedW', 'Zero/minus feed-in probe expected PV gain (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationMinW', 'PV-Auto minimum PV power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationPvNowW', 'PV-Auto current PV power used for gate (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationAllowed', 'PV-Auto allowed by minimum PV power', 'boolean', 'indicator');
        await mk('heatingRod.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('heatingRod.summary.status', 'Status', 'string', 'text');

        this._buildDevicesFromConfig();

        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'hr.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvSurplusNoEvRawW', objectId: `${ns}.chargingManagement.control.pvSurplusNoEvRawW`, dataType: 'number', direction: 'in', unit: 'W' });
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `hr.user.c${i}.regEnabled`, objectId: `${ns}.heatingRod.user.c${i}.regEnabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `hr.user.c${i}.mode`, objectId: `${ns}.heatingRod.user.c${i}.mode`, dataType: 'string', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

        for (const d of this._devices) {
            await this.adapter.setObjectNotExistsAsync(`heatingRod.devices.${d.id}`, {
                type: 'channel',
                common: { name: d.name },
                native: {},
            });

            await mk(`heatingRod.devices.${d.id}.slot`, 'Slot', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.name`, 'Name', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.enabled`, 'Enabled', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.mode`, 'Mode', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.userEnabled`, 'User enabled', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.userMode`, 'User mode', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.effectiveEnabled`, 'Effective enabled', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.effectiveMode`, 'Effective mode', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.boostActive`, 'Boost active', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.boostUntil`, 'Boost until (ts)', 'number', 'value.time');
            await mk(`heatingRod.devices.${d.id}.override`, 'Override', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.consumerType`, 'Consumer type', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.maxPowerW`, 'Max power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.stageCount`, 'Configured stages', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.wiredStages`, 'Wired stages', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.targetStage`, 'Target stage', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.currentStage`, 'Current stage', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.targetW`, 'Target power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.appliedW`, 'Applied power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.measuredW`, 'Measured (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.status`, 'Status', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.zeroExportActive`, 'Zero/minus feed-in active', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportReason`, 'Zero/minus feed-in reason', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.zeroExportCanProbe`, 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, 'Zero/minus feed-in next probe at', 'number', 'value.time');
            await mk(`heatingRod.devices.${d.id}.zeroExportProbePending`, 'Zero/minus feed-in PV-rise probe pending', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportProbePvGainW`, 'Zero/minus feed-in probe PV gain (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.zeroExportProbeExpectedW`, 'Zero/minus feed-in probe expected PV gain (W)', 'number', 'value.power', 'W');

            if (this.dp && d.powerId) {
                const k = `hr.${d.id}.pW`;
                await this.dp.upsert({ key: k, objectId: d.powerId, dataType: 'number', direction: 'in', unit: 'W' });
                d.pWKey = k;
            }

            for (const stage of d.stages) {
                if (this.dp && stage.writeId) {
                    const k = `hr.${d.id}.s${stage.index}.w`;
                    await this.dp.upsert({ key: k, objectId: stage.writeId, dataType: 'boolean', direction: 'out' });
                    stage.writeKey = k;
                }
                if (this.dp && stage.readId) {
                    const k = `hr.${d.id}.s${stage.index}.r`;
                    await this.dp.upsert({ key: k, objectId: stage.readId, dataType: 'boolean', direction: 'in' });
                    stage.readKey = k;
                }
            }

            if (!this._stageCtl.has(d.id)) {
                this._stageCtl.set(d.id, { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0, pvAutoOwned: false });
            }
        }
    }

    _readCacheNumber(key, fallback = null) {
        if (!key) return fallback;
        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const v = this.adapter._nwGetNumberFromCache(String(key), null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
        } catch (_e) {
            // ignore
        }
        try {
            const cache = this.adapter && this.adapter.stateCache;
            const rec = cache && cache[String(key)];
            const raw = (rec && typeof rec === 'object' && rec.value !== undefined) ? rec.value : rec;
            const n = Number(raw);
            if (Number.isFinite(n)) return n;
        } catch (_e) {
            // ignore
        }
        return fallback;
    }

    _readNumberAny(keys, staleMs, fallback = null) {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const key of list) {
            if (!key) continue;
            try {
                if (this.dp && this.dp.getEntry && this.dp.getEntry(key)) {
                    const v = this.dp.getNumberFresh ? this.dp.getNumberFresh(key, staleMs, null) : this.dp.getNumber(key, null);
                    if (typeof v === 'number' && Number.isFinite(v)) return v;
                }
            } catch (_e) {
                // ignore
            }
            const c = this._readCacheNumber(key, null);
            if (typeof c === 'number' && Number.isFinite(c)) return c;
        }
        return fallback;
    }

    _readStorageSnapshot(staleMs) {
        let chargeW = Math.max(0, num(this._readNumberAny([
            'storageFarm.totalChargePowerW',
            'storageChargePower'
        ], staleMs, null), 0));

        let dischargeW = Math.max(0, num(this._readNumberAny([
            'storageFarm.totalDischargePowerW',
            'storageDischargePower'
        ], staleMs, null), 0));

        const batteryPowerW = this._readNumberAny(['batteryPower'], staleMs, null);
        if (typeof batteryPowerW === 'number' && Number.isFinite(batteryPowerW)) {
            if (batteryPowerW < 0 && chargeW <= 0) chargeW = Math.max(0, Math.abs(batteryPowerW));
            if (batteryPowerW > 0 && dischargeW <= 0) dischargeW = Math.max(0, Math.abs(batteryPowerW));
        }

        const socPct = this._readNumberAny([
            'storageFarm.totalSoc',
            'storageFarm.medianSoc',
            'storageSoc'
        ], staleMs, null);

        return {
            chargeW: Math.round(chargeW),
            dischargeW: Math.round(dischargeW),
            socPct: (typeof socPct === 'number' && Number.isFinite(socPct)) ? socPct : null,
        };
    }

    _getInstalledPvPowerW() {
        const cfg = (this.adapter && this.adapter.config && typeof this.adapter.config === 'object') ? this.adapter.config : {};
        const ic = (cfg.installerConfig && typeof cfg.installerConfig === 'object') ? cfg.installerConfig : {};
        const gc = (cfg.gridConstraints && typeof cfg.gridConstraints === 'object') ? cfg.gridConstraints : {};

        const kwpRaw = ic.installedPvPowerKwp ?? ic.pvInstalledPowerKwp ?? ic.pvRatedPowerKwp;
        const kwp = Number(typeof kwpRaw === 'string' ? kwpRaw.replace(',', '.') : kwpRaw);
        if (Number.isFinite(kwp) && kwp > 0) return Math.round(kwp * 1000);

        const w = Number(ic.installedPvPowerW ?? ic.pvInstalledPowerW ?? gc.pvRatedPowerW);
        return (Number.isFinite(w) && w > 0) ? Math.round(w) : 0;
    }

    _readNonHeatingLoadSnapshot(staleMs, currentHeatingRodW = 0, evcsUsedW = 0) {
        const currentW = Math.max(0, Math.round(num(currentHeatingRodW, 0)));
        const evcsW = Math.max(0, Math.round(num(evcsUsedW, 0)));

        const loadTotalW = this._readNumberAny([
            'derived.core.building.loadTotalW',
            'consumptionTotal'
        ], staleMs, null);
        if (typeof loadTotalW === 'number' && Number.isFinite(loadTotalW)) {
            return {
                known: true,
                valueW: Math.max(0, Math.round(loadTotalW - currentW)),
                source: 'loadTotal-minus-heizstab',
            };
        }

        const loadRestW = this._readNumberAny([
            'derived.core.building.loadRestW'
        ], staleMs, null);
        if (typeof loadRestW === 'number' && Number.isFinite(loadRestW)) {
            return {
                known: true,
                valueW: Math.max(0, Math.round(loadRestW + evcsW)),
                source: 'loadRest-plus-evcs',
            };
        }

        return { known: false, valueW: 0, source: 'unknown' };
    }

    _computeBasePvAvailableW(currentHeatingRodW = 0) {
        const cfg = this._getCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        const pvCapWRaw = this._readNumberAny(['hr.cm.pvCapW', 'chargingManagement.control.pvCapEffectiveW'], staleMs, null);
        const usedWRaw = this._readNumberAny(['hr.cm.usedW', 'chargingManagement.control.usedW'], staleMs, null);
        const pvCapW = (typeof pvCapWRaw === 'number' && Number.isFinite(pvCapWRaw)) ? Math.max(0, pvCapWRaw) : 0;
        const evcsUsedW = (typeof usedWRaw === 'number' && Number.isFinite(usedWRaw)) ? Math.max(0, usedWRaw) : 0;

        const gridW = this._readNumberAny(['grid.powerRawW', 'grid.powerW', 'ps.gridPowerW'], staleMs, null);
        const gridKnown = (typeof gridW === 'number' && Number.isFinite(gridW));
        const exportW = gridKnown ? Math.max(0, -gridW) : 0;
        const importW = gridKnown ? Math.max(0, gridW) : 0;
        const currentW = Math.max(0, num(currentHeatingRodW, 0));
        const storage = this._readStorageSnapshot(staleMs);

        const storageTargetSocPct = clamp(num(cfg.storageTargetSocPct, 90), 0, 100);
        const storageReserveCfgW = Math.max(0, Math.round(num(cfg.storageReserveW, 1000)));
        const storageKnown = storage.chargeW > 0
            || storage.dischargeW > 0
            || (typeof storage.socPct === 'number' && Number.isFinite(storage.socPct))
            || !!(this.adapter && this.adapter.config && (this.adapter.config.enableStorageControl || this.adapter.config.enableStorageFarm));
        const storageReserveW = (storageKnown && !(typeof storage.socPct === 'number' && storage.socPct >= storageTargetSocPct))
            ? storageReserveCfgW
            : 0;

        // NVP-Bilanz vor flexiblen Heizstäben:
        //   Export/Import am Netzpunkt + bereits laufende Heizstableistung + Speicherladung - Speicherentladung.
        // Wichtig: Netzbezug muss abgezogen werden. Sonst hält eine bereits laufende Heizstableistung
        // nachts ihren eigenen vermeintlichen PV-Überschuss künstlich am Leben.
        // Ohne frischen Netzpunktwert darf die aktuelle Heizstableistung NICHT als Überschuss-Fallback
        // verwendet werden; sonst schaltet ein laufender Heizstab bei Dunkelheit nie sauber aus.
        const nvpSurplusBeforeFlexW = gridKnown
            ? Math.max(0, exportW - importW + currentW + storage.chargeW - storage.dischargeW)
            : 0;
        const nvpAvailableW = Math.max(0, nvpSurplusBeforeFlexW - storageReserveW);

        const cmAvailableW = (pvCapW > 0) ? Math.max(0, pvCapW - evcsUsedW - storageReserveW) : 0;

        // Direkter PV-only Deckel: Heizstäbe bekommen nur die aktuell erzeugte PV-Leistung,
        // nachdem Gebäudelast und die gewollte Speicherreserve abgezogen wurden. So kann ein
        // laufender Heizstab seine eigene Leistung nicht mehr über den Akku künstlich am Leben halten.
        const installedPvPowerW = this._getInstalledPvPowerW();
        const pvDirect = this._readPvNowSnapshot(staleMs);
        const pvDirectW = Math.round(num(pvDirect && pvDirect.valueW, 0));
        const nonHeatingLoad = this._readNonHeatingLoadSnapshot(staleMs, currentW, evcsUsedW);
        const pvOnlyBudgetKnown = !!(pvDirect && pvDirect.known && nonHeatingLoad && nonHeatingLoad.known);
        const pvOnlyAvailableW = pvOnlyBudgetKnown
            ? Math.max(0, Math.round(pvDirectW - Math.max(0, num(nonHeatingLoad.valueW, 0)) - storageReserveW))
            : null;

        // Wenn ein frischer Netzpunktwert vorhanden ist, ist er für Heizstäbe die härtere Wahrheit.
        // Ohne Netzpunktwert wird ausschließlich das Charging-Management-Cap genutzt; wenn auch das
        // fehlt, ist die sichere Vorgabe 0 W verfügbar. Ist der direkte PV-only Deckel verfügbar,
        // begrenzt er zusätzlich jede Automatik-Stufe auf PV minus Last minus Speicherreserve.
        let availableW = gridKnown ? nvpAvailableW : cmAvailableW;
        if (pvOnlyBudgetKnown) availableW = Math.min(availableW, pvOnlyAvailableW);
        const baseSource = gridKnown ? 'nvp-storage-reserve' : (pvCapW > 0 ? 'cm-storage-reserve' : 'no-fresh-nvp');
        const source = `${baseSource}${pvOnlyBudgetKnown ? '+pv-only-load' : ''}`;

        // PV-Auto darf keine Netz- oder Speicherenergie nachziehen.
        // Bei echtem Netzbezug oder Speicherentladung muss die Regelung zurücknehmen und darf
        // nicht neu einschalten. Kleine Toleranzen verhindern Flattern durch Messrauschen um 0 W.
        const importToleranceW = Math.max(0, Math.round(num(cfg.gridImportToleranceW ?? cfg.pvImportToleranceW ?? 50)));
        const dischargeToleranceW = Math.max(0, Math.round(num(cfg.storageDischargeToleranceW ?? cfg.pvStorageDischargeToleranceW ?? 100)));
        const gridImportActive = !!(gridKnown && importW > importToleranceW);
        const storageDischargeActive = !!(storage.dischargeW > dischargeToleranceW);
        const nonPvEnergyActive = !!(gridImportActive || storageDischargeActive);
        const forceOff = availableW <= 50 && (storageDischargeActive || (gridImportActive && currentW > 0) || (!gridKnown && currentW > 0 && pvCapW <= 0));

        return {
            pvCapW: Math.max(pvCapW, nvpSurplusBeforeFlexW),
            installedPvPowerW,
            pvDirectW,
            pvDirectKnown: !!(pvDirect && pvDirect.known),
            evcsUsedW,
            nonHeatingLoadW: Math.round(num(nonHeatingLoad && nonHeatingLoad.valueW, 0)),
            nonHeatingLoadSource: String((nonHeatingLoad && nonHeatingLoad.source) || 'unknown'),
            pvOnlyBudgetKnown,
            pvOnlyAvailableW: pvOnlyBudgetKnown ? Math.round(num(pvOnlyAvailableW, 0)) : null,
            availableW,
            source,
            gridKnown,
            gridW: gridKnown ? gridW : null,
            importW,
            importToleranceW,
            gridImportActive,
            exportW,
            currentHeatingRodW: currentW,
            storageChargeW: storage.chargeW,
            storageDischargeW: storage.dischargeW,
            dischargeToleranceW,
            storageDischargeActive,
            nonPvEnergyActive,
            storageSocPct: storage.socPct,
            storageReserveW,
            storageTargetSocPct,
            nvpSurplusBeforeFlexW,
            cmAvailableW,
            nvpAvailableW,
            forceOff,
        };
    }

    _getZeroExportCfg() {
        const cfg = this._getCfg();
        const raw = (cfg.zeroExport && typeof cfg.zeroExport === 'object')
            ? cfg.zeroExport
            : ((cfg.zeroFeedIn && typeof cfg.zeroFeedIn === 'object') ? cfg.zeroFeedIn : {});

        const n = (keyList, def, minV = 0, maxV = 1e12) => {
            const keys = Array.isArray(keyList) ? keyList : [keyList];
            for (const key of keys) {
                if (!key) continue;
                const v = raw[key];
                if (v === null || v === undefined || v === '') continue;
                const nr = Number(v);
                if (Number.isFinite(nr)) return Math.round(clamp(nr, minV, maxV));
            }
            return Math.round(clamp(def, minV, maxV));
        };

        return {
            enabled: !!(raw.enabled || raw.active),
            feedInLimitW: n(['feedInLimitW', 'allowedExportW', 'exportLimitW'], 1000, 0, 1000000),
            feedInToleranceW: n(['feedInToleranceW', 'exportToleranceW'], 150, 0, 100000),
            targetExportBufferW: n(['targetExportBufferW', 'exportBufferW'], 100, 0, 100000),
            minPvPowerW: n(['minPvPowerW', 'minCurrentPvW'], 1000, 0, 1000000),
            requireForecast: raw.requireForecast === false ? false : true,
            minForecastPeakW: n(['minForecastPeakW', 'forecastMinPeakW'], 1000, 0, 1000000),
            minForecastKwh6h: clamp(num(raw.minForecastKwh6h ?? raw.forecastMinKwh6h, 0.5), 0, 100000),
            storageFullSocPct: n(['storageFullSocPct', 'storagePrioritySocPct'], 95, 0, 100),
            gridImportTripW: n(['gridImportTripW', 'maxGridImportW'], 150, 0, 1000000),
            gridImportTripSec: n(['gridImportTripSec', 'gridImportHoldSec'], 5, 0, 3600),
            hardGridImportW: n(['hardGridImportW', 'hardImportW'], 500, 0, 1000000),
            storageDischargeToleranceW: n(['storageDischargeToleranceW', 'batteryDischargeToleranceW'], 300, 0, 1000000),
            storageDischargeTripSec: n(['storageDischargeTripSec', 'batteryDischargeHoldSec'], 8, 0, 3600),
            hardStorageDischargeW: n(['hardStorageDischargeW', 'hardBatteryDischargeW'], 800, 0, 1000000),
            stepUpDelaySec: n(['stepUpDelaySec', 'stepUpWaitSec'], 60, 0, 86400),
            stepDownDelaySec: n(['stepDownDelaySec', 'stepDownWaitSec'], 5, 0, 86400),
            cooldownSec: n(['cooldownSec', 'probeCooldownSec'], 60, 0, 86400),
            pvRiseObserveSec: n(['pvRiseObserveSec', 'probeObserveSec', 'pvFollowObserveSec'], 30, 0, 3600),
            pvRiseMinGainW: n(['pvRiseMinGainW', 'minPvRiseW', 'pvFollowMinGainW'], 150, 0, 1000000),
            pvRiseMinRatioPct: n(['pvRiseMinRatioPct', 'pvFollowMinRatioPct'], 60, 0, 100),
            pvRiseRetrySec: n(['pvRiseRetrySec', 'missingPvRiseRetrySec', 'pvFollowRetrySec'], 600, 0, 86400),
        };
    }

    _getPvAutomationMinW() {
        const cfg = this._getCfg();

        // Global PV-Auto enable threshold. This is intentionally separate from
        // zeroExport.minPvPowerW: the latter only guards additional probe/test loads
        // for hidden/abgeregelte PV. If no explicit value exists yet, use 800 W.
        const candidates = [
            cfg.minPvPowerW,
            cfg.pvAutoMinPvPowerW,
            cfg.minCurrentPvW
        ];

        for (const raw of candidates) {
            if (raw === null || raw === undefined || raw === '') continue;
            const n = Number(raw);
            if (Number.isFinite(n)) return Math.max(0, Math.round(clamp(n, 0, 1000000)));
        }
        return 800;
    }

    _readCacheRaw(key, fallback = null) {
        if (!key) return fallback;
        try {
            const cache = this.adapter && this.adapter.stateCache;
            const rec = cache && cache[String(key)];
            if (rec && typeof rec === 'object' && rec.value !== undefined) return rec.value;
            if (rec !== undefined) return rec;
        } catch (_e) {
            // ignore
        }
        return fallback;
    }

    _readPvNowSnapshot(staleMs) {
        const basePv = this._readNumberAny([
            'derived.core.pv.totalW',
            'derived.core.pv.acW',
            'pvPower',
            'productionTotal',
            // PeakShaving registers the current PV input as ps.pvW. Keep the old
            // ps.pvPowerW alias as compatibility fallback.
            'ps.pvW',
            'ps.pvPowerW',
            'chargingManagement.control.pvPowerW',
            'cm.pvPowerW'
        ], staleMs, null);
        const farmPv = this._readNumberAny(['storageFarm.totalPvPowerW'], staleMs, null);
        let pv = 0;
        let known = false;
        if (typeof basePv === 'number' && Number.isFinite(basePv)) {
            known = true;
            pv = Math.max(pv, basePv);
        }
        if (typeof farmPv === 'number' && Number.isFinite(farmPv)) {
            known = true;
            pv = Math.max(pv, farmPv);
        }
        return { known, valueW: Math.max(0, Math.round(pv)) };
    }

    _readPvNowW(staleMs) {
        return this._readPvNowSnapshot(staleMs).valueW;
    }

    _readForecastSnapshot() {
        // Prefer the in-memory snapshot from PvForecastModule. It is updated in the
        // same ModuleManager cycle before Heizstab, so it is fresher and more reliable
        // than reading the already-published ioBroker states back from cache.
        try {
            const snap = this.adapter && this.adapter._pvForecast;
            if (snap && typeof snap === 'object' && snap.ts) {
                return {
                    valid: !!snap.valid,
                    peakW: Math.max(0, num(snap.peakWNext24h, 0)),
                    kwh6h: Math.max(0, num(snap.kwhNext6h, 0)),
                    kwh12h: Math.max(0, num(snap.kwhNext12h, 0)),
                    kwh24h: Math.max(0, num(snap.kwhNext24h, 0)),
                };
            }
        } catch (_e) {
            // fall through to state-cache fallback
        }

        const boolVal = (key) => {
            const raw = this._readCacheRaw(key, null);
            if (raw === true || raw === 1 || raw === '1') return true;
            if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true;
            return false;
        };
        const numVal = (keys, fallback = 0) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const key of list) {
                const v = this._readCacheNumber(key, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
            return fallback;
        };

        const peakW = Math.max(0, numVal([
            'forecast.pv.peakWNext24h',
            'forecast.pv.maxPowerNext24h',
            'pvForecast.peakWNext24h',
            'pvForecast.maxPowerW'
        ], 0));
        const kwh6h = Math.max(0, numVal([
            'forecast.pv.kwhNext6h',
            'forecast.pv.energyNext6hKwh',
            'pvForecast.kwhNext6h'
        ], 0));
        const kwh12h = Math.max(0, numVal([
            'forecast.pv.kwhNext12h',
            'forecast.pv.energyNext12hKwh',
            'pvForecast.kwhNext12h'
        ], 0));
        const kwh24h = Math.max(0, numVal([
            'forecast.pv.kwhNext24h',
            'forecast.pv.energyNext24hKwh',
            'pvForecast.kwhNext24h'
        ], 0));

        const valid = boolVal('forecast.pv.valid')
            || boolVal('pvForecast.valid')
            || peakW > 0
            || kwh6h > 0
            || kwh12h > 0
            || kwh24h > 0;

        return { valid, peakW, kwh6h, kwh12h, kwh24h };
    }

    _computeZeroExportInfo(pvBase) {
        const cfg = this._getZeroExportCfg();
        if (!cfg.enabled) {
            return { active: false, canProbe: false, reason: 'disabled', cfg };
        }
        if (!pvBase || !pvBase.gridKnown) {
            return { active: true, canProbe: false, reason: 'grid_unknown', cfg };
        }

        const staleTimeoutSec = clamp(num(this._getCfg().staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        const pvNowW = Math.max(this._readPvNowW(staleMs), Math.round(num(pvBase.pvCapW, 0)));
        const feedLimitW = Math.max(0, Math.round(num(cfg.feedInLimitW, 0)));
        const tolW = Math.max(0, Math.round(num(cfg.feedInToleranceW, 0)));
        const exportW = Math.max(0, Math.round(num(pvBase.exportW, 0)));

        // For a true 0-feed-in plant the export value sits close to 0. For a minus-feed-in
        // plant (e.g. -1 kW allowed) the plant is at the cap when measured export is close
        // to the configured allowed export magnitude.
        const exportWindowW = Math.max(tolW, Math.round(num(cfg.targetExportBufferW, 0)));
        const feedInAtLimit = feedLimitW > 0
            ? exportW >= Math.max(0, feedLimitW - exportWindowW)
            : exportW <= exportWindowW;

        const forecast = this._readForecastSnapshot();
        const forecastOk = !cfg.requireForecast || (
            forecast.valid && (
                forecast.peakW >= cfg.minForecastPeakW
                || forecast.kwh6h >= cfg.minForecastKwh6h
                || forecast.kwh12h >= Math.max(cfg.minForecastKwh6h, cfg.minForecastKwh6h * 1.5)
                || forecast.kwh24h >= Math.max(cfg.minForecastKwh6h, cfg.minForecastKwh6h * 2)
            )
        );

        const pvNowOk = pvNowW >= Math.max(0, cfg.minPvPowerW);
        const soc = (typeof pvBase.storageSocPct === 'number' && Number.isFinite(pvBase.storageSocPct)) ? pvBase.storageSocPct : null;
        const storageKnown = soc !== null || num(pvBase.storageChargeW, 0) > 0 || num(pvBase.storageDischargeW, 0) > 0;
        const storageReady = !storageKnown || soc === null || soc >= cfg.storageFullSocPct;
        const noHardNonPv = !(pvBase.importW > cfg.hardGridImportW || pvBase.storageDischargeW > cfg.hardStorageDischargeW);

        let reason = 'ready';
        if (!feedInAtLimit) reason = 'feed_in_not_at_limit';
        else if (!pvNowOk) reason = 'pv_now_too_low';
        else if (!forecastOk) reason = 'forecast_not_ok';
        else if (!storageReady) reason = 'storage_priority';
        else if (!noHardNonPv) reason = 'non_pv_hard_block';

        const canProbe = !!(feedInAtLimit && pvNowOk && forecastOk && storageReady && noHardNonPv);

        return {
            active: true,
            canProbe,
            reason,
            cfg,
            pvNowW,
            feedInAtLimit,
            forecastOk,
            forecast,
            storageReady,
            pvNowOk,
            exportW,
            feedInLimitW: feedLimitW,
            feedInToleranceW: tolW,
        };
    }


    _stageActuatorKey(stage, idx) {
        if (!stage || typeof stage !== 'object') return `stage:${idx + 1}`;
        const keyCandidates = [stage.writeKey, stage.readKey];
        for (const key of keyCandidates) {
            const k = String(key || '').trim();
            if (!k) continue;
            try {
                const entry = this.dp && this.dp.getEntry ? this.dp.getEntry(k) : null;
                const objectId = String(entry && entry.objectId ? entry.objectId : '').trim();
                if (objectId) return objectId;
            } catch (_e) {
                // ignore
            }
        }
        const id = String(stage.writeId || stage.readId || '').trim();
        return id || `stage:${idx + 1}`;
    }

    _capDevicePower(d, valueW) {
        const v = Math.max(0, Math.round(num(valueW, 0)));
        const maxW = Math.max(0, Math.round(num(d && d.maxPowerW, 0)));
        return maxW > 0 ? Math.min(v, maxW) : v;
    }

    _sumStagePower(d, stageCount) {
        const cnt = Math.max(0, Math.min(Math.round(Number(stageCount) || 0), d.stages.length));
        const byActuator = new Map();
        for (let i = 0; i < cnt; i++) {
            const stage = d.stages[i];
            const key = this._stageActuatorKey(stage, i);
            const powerW = Math.max(0, num(stage && stage.powerW, 0));
            byActuator.set(key, Math.max(byActuator.get(key) || 0, powerW));
        }
        let sum = 0;
        for (const powerW of byActuator.values()) sum += powerW;
        return this._capDevicePower(d, sum);
    }

    _maxStageForBudget(d, budgetW) {
        const budget = Math.max(0, Math.round(num(budgetW, 0)));
        const cfg = this._getCfg();
        const tol = Math.max(0, Math.round(num(cfg.pvOnlyStageToleranceW ?? 50, 50)));
        let best = 0;
        for (let stage = 1; stage <= d.stageCount; stage++) {
            const stageW = this._sumStagePower(d, stage);
            if (stageW <= budget + tol) best = stage;
            else break;
        }
        return Math.max(0, Math.min(best, d.stageCount));
    }

    _stageOnSetForTarget(d, stageCount) {
        const cnt = Math.max(0, Math.min(Math.round(Number(stageCount) || 0), d.stages.length));
        const out = new Set();
        for (let i = 0; i < cnt; i++) {
            const stage = d.stages[i];
            // Only stages with an actual write datapoint can change a physical actuator.
            // If no writeKey exists, fall back to a unique virtual key so legacy setups
            // still step down by one row.
            const key = this._stageActuatorKey(stage, i);
            out.add(key);
        }
        return out;
    }

    _sameStageOnSet(a, b) {
        if (!a || !b || a.size !== b.size) return false;
        for (const k of a.values()) {
            if (!b.has(k)) return false;
        }
        return true;
    }

    _previousPhysicalStageBelow(d, observedStage) {
        const obs = Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d.stages.length));
        if (obs <= 0) return 0;
        const currentSet = this._stageOnSetForTarget(d, obs);
        for (let target = obs - 1; target >= 0; target--) {
            const set = this._stageOnSetForTarget(d, target);
            if (!this._sameStageOnSet(currentSet, set)) return target;
        }
        return 0;
    }

    _nextPhysicalStageAbove(d, observedStage) {
        const obs = Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d.stages.length));
        const currentSet = this._stageOnSetForTarget(d, obs);
        for (let target = obs + 1; target <= d.stages.length; target++) {
            const set = this._stageOnSetForTarget(d, target);
            if (!this._sameStageOnSet(currentSet, set)) return target;
        }
        return obs;
    }

    _readMeasuredW(d) {
        if (!(this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey))) return null;
        const v = this.dp.getNumber(d.pWKey, null);
        return (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    }

    _readStageFeedback(d) {
        /** @type {Array<boolean|null>} */
        const states = [];
        const powerByActuator = new Map();
        let contiguous = 0;
        let anyKnown = false;
        for (let i = 0; i < d.stages.length; i++) {
            const stage = d.stages[i];
            let val = null;
            if (this.dp && stage.readKey && this.dp.getEntry && this.dp.getEntry(stage.readKey)) {
                val = this.dp.getBoolean(stage.readKey, null);
            } else if (this.dp && stage.writeKey && this.dp.getEntry && this.dp.getEntry(stage.writeKey)) {
                val = this.dp.getBoolean(stage.writeKey, null);
            }
            states.push(val);
            if (val !== null && val !== undefined) anyKnown = true;
            if (val === true) {
                const key = this._stageActuatorKey(stage, i);
                const powerW = Math.max(0, num(stage.powerW, 0));
                powerByActuator.set(key, Math.max(powerByActuator.get(key) || 0, powerW));
            }
        }
        for (let i = 0; i < states.length; i++) {
            if (states[i] === true) contiguous = i + 1;
            else if (states[i] === false) break;
            else break;
        }
        let appliedPowerW = 0;
        for (const powerW of powerByActuator.values()) appliedPowerW += powerW;
        return {
            states,
            anyKnown,
            currentStage: contiguous,
            appliedPowerW: this._capDevicePower(d, appliedPowerW),
        };
    }

    _ensureStageCtlState(id, observedStage = 0) {
        const prev = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0, pvAutoOwned: false };
        const obs = Math.max(0, Math.round(Number(observedStage) || 0));
        if (!Number.isFinite(prev.targetStage)) prev.targetStage = obs;
        if (obs !== prev.targetStage) prev.targetStage = obs;
        this._stageCtl.set(id, prev);
        return prev;
    }

    _computeDesiredStage(d, remainingW, currentStage) {
        let stage = Math.max(0, Math.min(Math.round(Number(currentStage) || 0), d.stageCount));

        while (stage > 0) {
            const cfg = d.stages[stage - 1];
            if (!cfg) break;
            if (remainingW < Math.max(0, num(cfg.offBelowW, 0))) stage--;
            else break;
        }

        while (stage < d.stageCount) {
            const cfg = d.stages[stage];
            if (!cfg) break;
            if (remainingW >= Math.max(0, num(cfg.onAboveW, 0))) stage++;
            else break;
        }

        return Math.max(0, Math.min(stage, d.stageCount));
    }

    _applyTiming(d, desiredStage, observedStage) {
        const st = this._ensureStageCtlState(d.id, observedStage);
        const now = nowMs();
        const minOnMs = Math.max(0, Math.round(num(d.minOnSec, 0) * 1000));
        const minOffMs = Math.max(0, Math.round(num(d.minOffSec, 0) * 1000));
        let currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage) || 0), d.stageCount));

        if (desiredStage > currentStage) {
            if (minOffMs > 0 && st.lastDecreaseMs > 0 && (now - st.lastDecreaseMs) < minOffMs) {
                return currentStage;
            }
            st.targetStage = desiredStage;
            st.lastIncreaseMs = now;
            this._stageCtl.set(d.id, st);
            return desiredStage;
        }

        if (desiredStage < currentStage) {
            if (minOnMs > 0 && st.lastIncreaseMs > 0 && (now - st.lastIncreaseMs) < minOnMs) {
                return currentStage;
            }
            st.targetStage = desiredStage;
            st.lastDecreaseMs = now;
            this._stageCtl.set(d.id, st);
            return desiredStage;
        }

        return currentStage;
    }

    _applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroInfo, now) {
        const info = zeroInfo || this._computeZeroExportInfo(pvBase);
        const cfg = (info && info.cfg) ? info.cfg : this._getZeroExportCfg();
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let targetStage = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        let reason = (info && info.reason) ? String(info.reason) : 'zero_export';
        let reduceNow = false;
        let hardOff = false;

        const importActive = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.gridImportTripW);
        const dischargeActive = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.storageDischargeToleranceW);
        const hardImport = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.hardGridImportW);
        const hardDischarge = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.hardStorageDischargeW);

        const pvDirectKnown = !!(pvBase && pvBase.pvDirectKnown);
        const pvDirectW = Math.max(0, Math.round(num(pvBase && pvBase.pvDirectW, 0)));
        const observeMs = Math.max(0, Math.round(num(cfg.pvRiseObserveSec, 30) * 1000));
        const retryMs = Math.max(0, Math.round(num(cfg.pvRiseRetrySec, 600) * 1000));
        const ratioPct = Math.max(0, Math.min(100, Math.round(num(cfg.pvRiseMinRatioPct, 60))));
        const minGainW = Math.max(0, Math.round(num(cfg.pvRiseMinGainW, 150)));

        if (importActive) {
            if (!st.zeroImportSinceMs) st.zeroImportSinceMs = now;
        } else {
            st.zeroImportSinceMs = 0;
        }
        if (dischargeActive) {
            if (!st.zeroDischargeSinceMs) st.zeroDischargeSinceMs = now;
        } else {
            st.zeroDischargeSinceMs = 0;
        }

        const importHoldMs = importActive && st.zeroImportSinceMs ? (now - st.zeroImportSinceMs) : 0;
        const dischargeHoldMs = dischargeActive && st.zeroDischargeSinceMs ? (now - st.zeroDischargeSinceMs) : 0;
        hardOff = hardImport || hardDischarge;
        reduceNow = hardOff
            || (importActive && importHoldMs >= Math.max(0, cfg.gridImportTripSec * 1000))
            || (dischargeActive && dischargeHoldMs >= Math.max(0, cfg.storageDischargeTripSec * 1000));

        if (reduceNow) {
            const reduceBase = Math.max(currentStage, observedStage, targetStage);
            const lower = hardOff ? 0 : this._previousPhysicalStageBelow(d, reduceBase);
            targetStage = Math.min(targetStage, lower);
            st.zeroProbe = null;
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.targetStage = targetStage;
            reason = hardOff ? 'hard_non_pv_reduce' : (importActive ? 'grid_import_reduce' : 'storage_discharge_reduce');
            this._stageCtl.set(d.id, st);
            return {
                targetStage,
                reduceNow: true,
                hardOff,
                reason,
                importHoldMs,
                dischargeHoldMs,
                probePending: false,
                pvRiseGainW: 0,
                pvRiseExpectedW: 0,
                allowPvOnlyBypass: false,
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        const pending = (st.zeroProbe && typeof st.zeroProbe === 'object') ? st.zeroProbe : null;
        if (pending && Math.max(0, num(pending.targetStage, 0)) > Math.max(0, num(pending.fromStage, 0))) {
            const pendingTarget = Math.max(0, Math.min(Math.round(num(pending.targetStage, 0)), d.stageCount));
            const pendingFrom = Math.max(0, Math.min(Math.round(num(pending.fromStage, 0)), d.stageCount));
            const startMs = Math.max(0, Math.round(num(pending.startMs, now)));
            const elapsedMs = Math.max(0, now - startMs);
            const expectedGainW = Math.max(0, Math.round(num(pending.expectedGainW, this._sumStagePower(d, pendingTarget) - this._sumStagePower(d, pendingFrom))));
            const baselineKnown = pending.pvKnown !== false;
            const baselinePvW = Math.max(0, Math.round(num(pending.baselinePvW, pvDirectW)));
            const gainW = (pvDirectKnown && baselineKnown) ? Math.round(pvDirectW - baselinePvW) : null;
            const requiredGainW = expectedGainW > 0
                ? Math.max(minGainW, Math.round(expectedGainW * ratioPct / 100))
                : 0;
            targetStage = Math.max(targetStage, pendingTarget);

            if (observeMs > 0 && elapsedMs < observeMs) {
                st.targetStage = targetStage;
                reason = 'probe_observe_pv_rise';
                this._stageCtl.set(d.id, st);
                return {
                    targetStage,
                    reduceNow: false,
                    hardOff: false,
                    reason,
                    importHoldMs,
                    dischargeHoldMs,
                    probePending: true,
                    pvRiseGainW: gainW === null ? 0 : gainW,
                    pvRiseExpectedW: expectedGainW,
                    allowPvOnlyBypass: true,
                    nextAllowedAt: startMs + observeMs,
                };
            }

            if (pvDirectKnown && baselineKnown && expectedGainW > 0 && gainW < requiredGainW) {
                targetStage = pendingFrom;
                st.zeroProbe = null;
                st.zeroPvRiseRetryUntilMs = now + retryMs;
                st.zeroHoldMaxStage = pendingFrom;
                st.zeroLastStepDownMs = now;
                st.lastDecreaseMs = now;
                st.targetStage = targetStage;
                reason = 'pv_rise_missing_reduce';
                this._stageCtl.set(d.id, st);
                return {
                    targetStage,
                    reduceNow: true,
                    hardOff: false,
                    reason,
                    importHoldMs,
                    dischargeHoldMs,
                    probePending: false,
                    pvRiseGainW: gainW,
                    pvRiseExpectedW: expectedGainW,
                    allowPvOnlyBypass: false,
                    nextAllowedAt: st.zeroPvRiseRetryUntilMs || 0,
                };
            }

            // Die PV-Erzeugung ist nach der Testlast plausibel mitgestiegen. Erst jetzt gilt
            // die neue Stufe als bestätigt und der nächste Stufentest darf nach stepUpDelay folgen.
            st.zeroProbe = null;
            st.zeroLastConfirmedStage = pendingTarget;
            st.zeroHoldMaxStage = undefined;
            st.zeroLastStepUpMs = now;
            st.lastIncreaseMs = now;
            st.targetStage = targetStage;
            reason = (!pvDirectKnown || !baselineKnown || expectedGainW <= 0) ? 'pv_rise_unknown_keep' : 'pv_rise_confirmed';
            this._stageCtl.set(d.id, st);
            return {
                targetStage,
                reduceNow: false,
                hardOff: false,
                reason,
                importHoldMs,
                dischargeHoldMs,
                probePending: false,
                pvRiseGainW: gainW === null ? 0 : gainW,
                pvRiseExpectedW: expectedGainW,
                allowPvOnlyBypass: false,
                nextAllowedAt: now + Math.max(0, cfg.stepUpDelaySec * 1000),
            };
        } else if (pending) {
            st.zeroProbe = null;
        }

        // Speicher-Vorrang darf nur die zusätzliche 0-Einspeise-Testlast sperren.
        // Normaler, am Netzpunkt/Speicherladung rekonstruierter PV-Überschuss darf weiter genutzt
        // werden. Deshalb reduzieren wir hier nur, wenn aus der normalen PV-Bilanz kein Ziel mehr
        // übrig ist (targetStage <= 0), aber noch eine physische Stufe läuft.
        if (info && info.active && info.storageReady === false && targetStage <= 0 && Math.max(currentStage, observedStage) > 0) {
            const reduceBase = Math.max(currentStage, observedStage);
            targetStage = Math.min(targetStage, this._previousPhysicalStageBelow(d, reduceBase));
            st.zeroProbe = null;
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.targetStage = targetStage;
            reason = 'storage_priority_reduce';
            this._stageCtl.set(d.id, st);
            return {
                targetStage,
                reduceNow: true,
                hardOff: false,
                reason,
                importHoldMs,
                dischargeHoldMs,
                probePending: false,
                pvRiseGainW: 0,
                pvRiseExpectedW: 0,
                allowPvOnlyBypass: false,
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        const cooldownActive = !!(st.zeroCooldownUntilMs && now < st.zeroCooldownUntilMs);
        const pvRiseRetryActive = !!(st.zeroPvRiseRetryUntilMs && now < st.zeroPvRiseRetryUntilMs);
        if (pvRiseRetryActive) {
            const holdMaxStage = Math.max(0, Math.min(Math.round(num(st.zeroHoldMaxStage, targetStage)), d.stageCount));
            targetStage = Math.min(targetStage, holdMaxStage);
        } else {
            st.zeroHoldMaxStage = undefined;
        }
        const canProbe = !!(info && info.active && info.canProbe && !cooldownActive && !pvRiseRetryActive);

        if (canProbe) {
            const baseStage = Math.max(currentStage, observedStage, targetStage);
            const nextStage = this._nextPhysicalStageAbove(d, baseStage);
            const lastUp = Math.max(num(st.zeroLastStepUpMs, 0), num(st.lastIncreaseMs, 0));
            const stepWaitMs = Math.max(0, cfg.stepUpDelaySec * 1000);
            const mayStep = nextStage > baseStage && (!lastUp || (now - lastUp) >= stepWaitMs);
            if (mayStep) {
                const baseW = this._sumStagePower(d, baseStage);
                const nextW = this._sumStagePower(d, nextStage);
                targetStage = Math.max(targetStage, nextStage);
                st.zeroProbe = {
                    fromStage: baseStage,
                    targetStage: nextStage,
                    startMs: now,
                    baselinePvW: pvDirectW,
                    pvKnown: pvDirectKnown,
                    expectedGainW: Math.max(0, Math.round(nextW - baseW)),
                };
                st.zeroLastStepUpMs = now;
                reason = 'probe_step_up_observe';
            } else {
                reason = (nextStage <= baseStage) ? 'max_physical_stage' : 'waiting_step_up_delay';
            }
        } else if (pvRiseRetryActive) {
            reason = 'pv_rise_retry_wait';
        } else if (cooldownActive) {
            reason = 'cooldown';
        }

        st.targetStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.stageCount));
        this._stageCtl.set(d.id, st);

        return {
            targetStage: st.targetStage,
            reduceNow: false,
            hardOff: false,
            reason,
            importHoldMs,
            dischargeHoldMs,
            probePending: !!(st.zeroProbe && typeof st.zeroProbe === 'object'),
            pvRiseGainW: 0,
            pvRiseExpectedW: Math.max(0, Math.round(num(st.zeroProbe && st.zeroProbe.expectedGainW, 0))),
            allowPvOnlyBypass: !!(st.zeroProbe && typeof st.zeroProbe === 'object'),
            nextAllowedAt: Math.max(num(st.zeroCooldownUntilMs, 0), num(st.zeroPvRiseRetryUntilMs, 0)),
        };
    }

    async _writeBoolForce(key, value, force = false) {
        if (!(this.dp && key && this.dp.getEntry)) return false;
        const entry = this.dp.getEntry(key);
        if (!entry) return false;

        if (!force && this.dp.writeBoolean) {
            return this.dp.writeBoolean(key, !!value, false);
        }

        let raw = !!value;
        if (entry.invert) raw = !raw;

        try {
            await this.adapter.setForeignStateAsync(entry.objectId, raw, false);
            if (this.dp.lastWriteByObjectId && typeof this.dp.lastWriteByObjectId.set === 'function') {
                this.dp.lastWriteByObjectId.set(entry.objectId, { val: raw ? 1 : 0, ts: Date.now() });
            }
            return true;
        } catch (err) {
            this.adapter.log.warn(`Heizstab-Datapoint write failed for '${entry.objectId}': ${err?.message || err}`);
            return false;
        }
    }

    async _applyStageState(d, targetStage, feedback, options = {}) {
        if (!d.wiredStages || d.wiredStages < 1) {
            return { applied: false, status: 'no_stage_write_dp' };
        }

        const effectiveStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.wiredStages));
        const forceAllWrites = !!(options && options.force);
        let anyTrue = false;
        let anyFalse = false;

        // One KNX/relay object may be reused in more than one virtual stage. Writing every row in
        // sequence would otherwise send ON and then OFF to the same datapoint in a single tick.
        // Coalesce by writeKey and write the OR-result exactly once.
        const grouped = new Map();
        for (let i = 0; i < d.stages.length; i++) {
            const stage = d.stages[i];
            if (!stage.writeKey) continue;
            const writeKey = String(stage.writeKey).trim();
            if (!writeKey) continue;
            const actuatorKey = this._stageActuatorKey(stage, i);
            const shouldOn = i < effectiveStage;
            const observed = Array.isArray(feedback && feedback.states) ? feedback.states[i] : null;
            const g = grouped.get(actuatorKey) || { writeKey, shouldOn: false, observedKnown: false, observed: null };
            g.writeKey = g.writeKey || writeKey;
            g.shouldOn = g.shouldOn || shouldOn;
            if (observed !== null && observed !== undefined) {
                g.observedKnown = true;
                // For duplicated rows the read value should be identical. If not, prefer true so
                // an OFF target is still forced, while an ON target is not suppressed accidentally.
                g.observed = (g.observed === true || observed === true) ? true : !!observed;
            }
            grouped.set(actuatorKey, g);
        }

        for (const g of grouped.values()) {
            const force = forceAllWrites || (!!g.observedKnown && g.observed !== g.shouldOn);
            const res = await this._writeBoolForce(g.writeKey, g.shouldOn, force);
            if (res === true) anyTrue = true;
            if (res === false) anyFalse = true;
        }

        let status = 'unchanged';
        if (anyFalse && anyTrue) status = 'applied_partial';
        else if (anyFalse) status = 'write_failed';
        else if (anyTrue) status = 'applied';

        return { applied: !anyFalse, status, targetStage: effectiveStage };
    }

    _getOverrides() {
        return (this.adapter && this.adapter._heatingRodOverrides && typeof this.adapter._heatingRodOverrides === 'object')
            ? this.adapter._heatingRodOverrides
            : {};
    }

    _readOverrideForDevice(d, now) {
        const ovAll = this._getOverrides();
        const ov = (ovAll && typeof ovAll === 'object' && ovAll[d.id] && typeof ovAll[d.id] === 'object') ? ovAll[d.id] : {};
        const boostUntil = clamp(num(ov.boostUntilMs, 0), 0, 1e18);
        const boostActive = boostUntil > 0 && now < boostUntil;
        return { boostUntil, boostActive };
    }

    _setStageCtlTarget(id, targetStage, observedStage = null) {
        const st = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0, pvAutoOwned: false };
        const prev = Math.max(0, Math.round(Number(observedStage !== null && observedStage !== undefined ? observedStage : st.targetStage) || 0));
        const next = Math.max(0, Math.round(Number(targetStage) || 0));
        const now = nowMs();
        if (next > prev) st.lastIncreaseMs = now;
        else if (next < prev) st.lastDecreaseMs = now;
        st.targetStage = next;
        this._stageCtl.set(id, st);
        return st;
    }

    _markPvAutoOwned(id, owned) {
        const st = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0, pvAutoOwned: false };
        st.pvAutoOwned = !!owned;
        if (owned) st.lastPvAutoWriteMs = nowMs();
        else st.zeroProbe = null;
        this._stageCtl.set(id, st);
        return st;
    }

    _computeQuickManualStage(d, userMode) {
        const m = normalizeUserMode(userMode);
        if (m === 'manual1') return Math.min(d.wiredStages || d.stageCount, quickManualLevelToStageCount(d.stageCount, 1));
        if (m === 'manual2') return Math.min(d.wiredStages || d.stageCount, quickManualLevelToStageCount(d.stageCount, 2));
        if (m === 'manual3') return Math.min(d.wiredStages || d.stageCount, quickManualLevelToStageCount(d.stageCount, 3));
        return 0;
    }

    async tick() {
        if (!this._isEnabled()) return;

        const now = nowMs();

        try {
            const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
            if (p14a && p14a.active) {
                await this._setStateIfChanged('heatingRod.summary.status', 'paused_by_14a');
                await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
                this.adapter._heatingRodBudgetUsedW = 0;
                return;
            }
        } catch (_e) {
            // ignore
        }

        const preFeedbackById = new Map();
        let currentHeatingRodW = 0;
        try {
            for (const d of this._devices) {
                const measuredW = this._readMeasuredW(d);
                const feedback = this._readStageFeedback(d);
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback && feedback.appliedPowerW ? feedback.appliedPowerW : 0);
                currentHeatingRodW += usedW;
                preFeedbackById.set(d.id, { measuredW, feedback });
            }
        } catch (_e) {
            currentHeatingRodW = 0;
        }

        const pvBase = this._computeBasePvAvailableW(currentHeatingRodW);
        const zeroExportInfo = this._computeZeroExportInfo(pvBase);
        const minPvAutomationW = this._getPvAutomationMinW();
        const staleTimeoutSec = clamp(num(this._getCfg().staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        const pvNowForAutomationW = Math.max(
            this._readPvNowW(staleMs),
            Math.round(num(pvBase.pvCapW, 0)),
            Math.round(num(zeroExportInfo && zeroExportInfo.pvNowW, 0))
        );
        const pvAutomationAllowedByMin = minPvAutomationW <= 0 || pvNowForAutomationW >= minPvAutomationW;
        const thermalUsedW = Math.max(0, num(this.adapter && this.adapter._thermalBudgetUsedW, 0));
        let remainingW = Math.max(0, num(pvBase.availableW, 0) - thermalUsedW);
        let appliedTotalW = 0;
        let budgetUsedW = 0;
        let zeroAnyProbePending = false;
        let zeroProbePvGainW = 0;
        let zeroProbeExpectedW = 0;

        for (const d of this._devices) {
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.slot`, d.slot);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.name`, d.name);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.enabled`, !!d.enabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.mode`, String(d.mode));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.consumerType`, String(d.consumerType));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.maxPowerW`, Math.round(num(d.maxPowerW, 0)));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.stageCount`, d.stageCount);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.wiredStages`, d.wiredStages);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportActive`, !!zeroExportInfo.active);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportCanProbe`, !!zeroExportInfo.canProbe);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroExportInfo.reason || ''));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num((this._stageCtl.get(d.id) || {}).zeroCooldownUntilMs, 0)));

            let userEnabled = true;
            try {
                if (this.dp && d.userEnabledKey && this.dp.getEntry && this.dp.getEntry(d.userEnabledKey)) {
                    const b = this.dp.getBoolean(d.userEnabledKey, true);
                    userEnabled = (b === null || b === undefined) ? true : !!b;
                }
            } catch (_e) {
                userEnabled = true;
            }

            let userMode = 'inherit';
            try {
                if (this.dp && d.userModeKey && this.dp.getEntry && this.dp.getEntry(d.userModeKey)) {
                    const raw = this.dp.getRaw(d.userModeKey, null);
                    if (raw !== null && raw !== undefined) userMode = String(raw).trim();
                }
            } catch (_e) {
                userMode = 'inherit';
            }
            userMode = normalizeUserMode(userMode);

            const pre = preFeedbackById.get(d.id) || {};
            const measuredW = (typeof pre.measuredW === 'number' && Number.isFinite(pre.measuredW)) ? pre.measuredW : this._readMeasuredW(d);
            if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.measuredW`, Math.round(measuredW));
            }

            const feedback = pre.feedback || this._readStageFeedback(d);
            const observedStage = feedback.anyKnown ? feedback.currentStage : (this._stageCtl.get(d.id)?.targetStage || 0);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.currentStage`, observedStage);

            const ov = this._readOverrideForDevice(d, now);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.boostActive`, !!ov.boostActive);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.boostUntil`, ov.boostUntil ? Math.round(ov.boostUntil) : 0);

            const cfgMode = normalizeMode(d.mode);
            const baseMode = (userMode !== 'inherit') ? userMode : cfgMode;
            const manualStage = this._computeQuickManualStage(d, baseMode);
            const pvModeRequested = (baseMode === 'pvAuto' || baseMode === 'inherit');
            const pvAutomationActive = !!d.enabled && !!userEnabled && pvModeRequested;
            const explicitOff = baseMode === 'off';
            const effectiveMode = ov.boostActive
                ? 'boost'
                : (manualStage > 0
                    ? `manual${Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)))}`
                    : (explicitOff ? 'off' : (pvAutomationActive ? 'pvAuto' : String(baseMode || 'pvAuto'))));
            // d.enabled and userEnabled mean "PV-Auto darf schreiben". They must not block
            // manual customer steps, boost, or an installer/customer doing a manual switch on
            // the native KNX/relay datapoints while PV regulation is disabled.
            const effectiveEnabled = !!(ov.boostActive || manualStage > 0 || pvAutomationActive);

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.userEnabled`, !!userEnabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.userMode`, String(userMode));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.effectiveEnabled`, !!effectiveEnabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.effectiveMode`, String(effectiveMode));

            if (d.consumerType !== 'heatingRod') {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                this._markPvAutoOwned(d.id, false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'slot_type_mismatch');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            // Temporary boost: always full configured/wired power for the configured duration.
            if (ov.boostActive) {
                const fullStage = Math.max(0, Math.min(d.wiredStages || d.stageCount, d.stageCount));
                const res = await this._applyStageState(d, fullStage, feedback, { force: true });
                const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, fullStage), d.wiredStages || d.stageCount));
                this._setStageCtlTarget(d.id, effectiveTargetStage, observedStage);
                this._markPvAutoOwned(d.id, false);
                const targetW = this._sumStagePower(d, effectiveTargetStage);
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : targetW;

                appliedTotalW += Math.round(targetW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);

                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'boost');
                continue;
            }

            // Manual customer steps (1/2/3) bypass the PV automatik, but still use native stage writes.
            if (manualStage > 0) {
                const res = await this._applyStageState(d, manualStage, feedback, { force: true });
                const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, manualStage), d.wiredStages || d.stageCount));
                this._setStageCtlTarget(d.id, effectiveTargetStage, observedStage);
                this._markPvAutoOwned(d.id, false);
                const targetW = this._sumStagePower(d, effectiveTargetStage);
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : targetW;
                const level = Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)));

                appliedTotalW += Math.round(targetW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);

                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `manual${level}_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, `manual${level}`);
                continue;
            }

            // End-customer disabled PV regulation (Regelung AUS): do NOT write OFF.
            // The native actuator may now be switched manually in ioBroker/KNX or via the
            // manual stage buttons above. We only observe/balance so manual heat is not
            // immediately overwritten by the EMS tick.
            if (!userEnabled && pvModeRequested) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markPvAutoOwned(d.id, false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'regulation_off_manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_allowed');
                continue;
            }

            // Installer config: manual = only observe/balance, no writes. Useful for diagnostics / external logic.
            if (baseMode === 'manual') {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += Math.round(usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                this._markPvAutoOwned(d.id, false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'manual_cfg');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (baseMode === 'off') {
                const res = await this._applyStageState(d, 0, feedback, { force: true });
                this._setStageCtlTarget(d.id, 0, observedStage);
                this._markPvAutoOwned(d.id, false);
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            // Installer/admin disabled PV-Auto for this Heizstab device: observe only.
            // This is intentionally not an OFF command, so the customer can still switch
            // the physical Heizstab manually outside PV automation.
            if (!d.enabled && pvModeRequested) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markPvAutoOwned(d.id, false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'pv_auto_disabled_manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_allowed');
                continue;
            }

            // Global PV-Auto gate: unterhalb der Mindest-PV wird die Automatik in einen
            // beobachtenden Zustand versetzt. Nur eine von PV-Auto selbst gehaltene Stufe wird
            // einmalig aus Sicherheitsgründen abgeworfen. Danach bleibt manuelles Schalten auf
            // den nativen Relais-/KNX-Datenpunkten außerhalb der PV-Zeit möglich.
            if (pvAutomationActive && !pvAutomationAllowedByMin) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                const ctl = this._ensureStageCtlState(d.id, observedStage);
                const autoOwnedRunning = !!ctl.pvAutoOwned && (observedStage > 0 || Math.max(0, feedback.appliedPowerW || 0) > 0 || usedW > 50);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);

                if (autoOwnedRunning) {
                    const res = await this._applyStageState(d, 0, feedback, { force: true });
                    this._setStageCtlTarget(d.id, 0, observedStage);
                    const st = this._stageCtl.get(d.id) || ctl;
                    st.pvAutoOwned = false;
                    st.zeroProbe = null;
                    this._stageCtl.set(d.id, st);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `pv_min_not_reached_auto_off_${pvNowForAutomationW}of${minPvAutomationW}W_${String(res.status || '')}`);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                } else {
                    ctl.pvAutoOwned = false;
                    ctl.zeroProbe = null;
                    ctl.targetStage = observedStage;
                    this._stageCtl.set(d.id, ctl);
                    appliedTotalW += Math.round(usedW);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `pv_min_not_reached_observe_manual_allowed_${pvNowForAutomationW}of${minPvAutomationW}W`);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_allowed');
                }
                continue;
            }

            if (d.wiredStages < 1) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                this._markPvAutoOwned(d.id, false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'no_stage_write_dp');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            let desiredStage = this._computeDesiredStage(d, remainingW, observedStage);
            let zeroDecision = null;
            let pvOnlyBudgetCapped = false;
            const pvOnlyMaxStage = pvBase.pvOnlyBudgetKnown ? this._maxStageForBudget(d, remainingW) : d.stageCount;

            // 0-/Minus-Einspeiseanlagen verstecken PV-Überschuss am Netzpunkt, weil der
            // Wechselrichter/FEMS die PV abregelt. In diesem Sondermodus darf PV-Auto vorsichtig
            // eine physische Heizstab-Stufe als Testlast zuschalten, wenn Forecast, PV-Leistung,
            // Speicher-SOC und Einspeiselimit zusammenpassen. Danach entscheidet der Netzpunkt:
            // Netzbezug oder Speicherentladung -> schnell reduzieren; stabil PV -> halten/weiter prüfen.
            if (zeroExportInfo.active) {
                zeroDecision = this._applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroExportInfo, now);
                desiredStage = Math.max(0, Math.min(num(zeroDecision.targetStage, desiredStage), d.stageCount));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroDecision.reason || zeroExportInfo.reason || ''));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num(zeroDecision.nextAllowedAt, 0)));
            }
            const zeroProbePending = !!(zeroDecision && zeroDecision.probePending);
            const zeroProbeGainW = Math.round(num(zeroDecision && zeroDecision.pvRiseGainW, 0));
            const zeroProbeExpectedDeviceW = Math.round(num(zeroDecision && zeroDecision.pvRiseExpectedW, 0));
            if (zeroProbePending) zeroAnyProbePending = true;
            if (zeroDecision) {
                zeroProbePvGainW = zeroProbeGainW;
                zeroProbeExpectedW = zeroProbeExpectedDeviceW;
            }
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportProbePending`, zeroProbePending);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportProbePvGainW`, zeroProbeGainW);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportProbeExpectedW`, zeroProbeExpectedDeviceW);

            const zeroAllowPvOnlyBypass = !!(zeroDecision && zeroDecision.allowPvOnlyBypass);
            if (pvBase.pvOnlyBudgetKnown && !zeroAllowPvOnlyBypass && desiredStage > pvOnlyMaxStage) {
                desiredStage = pvOnlyMaxStage;
                pvOnlyBudgetCapped = true;
            }

            // Reiner PV-Betrieb: bei Netzbezug oder Speicherentladung keine Stufe halten
            // oder neu zuschalten. Bei aktivem 0-Einspeise-Sondermodus werden kurze Transienten
            // nicht sofort gekillt, sondern erst nach den konfigurierten Schutzzeiten.
            let forceNonPvDown = !!(pvBase.nonPvEnergyActive);
            if (zeroExportInfo.active) forceNonPvDown = !!(zeroDecision && zeroDecision.reduceNow);
            if (forceNonPvDown) {
                // Zero-export decisions already calculate the correct fallback stage
                // (for example: failed PV-rise test -> return to the previous stage and wait).
                // Without this guard a lagging feedback value could reduce one stage too far.
                if (zeroDecision && Number.isFinite(Number(zeroDecision.targetStage))) {
                    desiredStage = Math.min(desiredStage, Math.max(0, Math.round(Number(zeroDecision.targetStage) || 0)));
                } else {
                    // Reduce to the next lower *physical* actuator set. This is important for
                    // installations that accidentally map several virtual stages to the same KNX/relay
                    // datapoint: targetStage 3 -> 2 would otherwise still keep the same actuator ON.
                    const lowerPhysicalStage = (zeroDecision && zeroDecision.hardOff)
                        ? 0
                        : this._previousPhysicalStageBelow(d, Math.max(observedStage, desiredStage));
                    desiredStage = Math.min(desiredStage, lowerPhysicalStage);
                }
            }

            const forceStorageProtectOff = !!(pvBase.forceOff && desiredStage <= 0 && !(zeroExportInfo.active && zeroDecision && !zeroDecision.reduceNow));
            let targetStage = forceStorageProtectOff
                ? 0
                : ((forceNonPvDown || zeroAllowPvOnlyBypass) ? desiredStage : this._applyTiming(d, desiredStage, observedStage));
            if (pvBase.pvOnlyBudgetKnown && !zeroAllowPvOnlyBypass && targetStage > pvOnlyMaxStage) {
                targetStage = pvOnlyMaxStage;
                pvOnlyBudgetCapped = true;
            }
            if (forceStorageProtectOff || forceNonPvDown || pvOnlyBudgetCapped) this._setStageCtlTarget(d.id, targetStage, observedStage);
            const forcePvWrite = !!(forceStorageProtectOff || forceNonPvDown || pvOnlyBudgetCapped || zeroAllowPvOnlyBypass || (targetStage <= 0 && ((typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 50) || Math.max(0, feedback.appliedPowerW || 0) > 0)));
            const res = await this._applyStageState(d, targetStage, feedback, { force: forcePvWrite });
            const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, targetStage), d.wiredStages));
            this._markPvAutoOwned(d.id, effectiveTargetStage > 0);
            const targetW = this._sumStagePower(d, effectiveTargetStage);
            const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                ? Math.max(0, measuredW)
                : targetW;

            appliedTotalW += Math.round(targetW);
            budgetUsedW += Math.round(usedW);
            remainingW = Math.max(0, remainingW - usedW);

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
            const zeroSuffix = zeroDecision && zeroDecision.reason ? `_zero_${String(zeroDecision.reason)}` : '';
            const pvOnlySuffix = pvOnlyBudgetCapped ? '_pv_only_budget_cap' : '';
            const autoStatus = forceStorageProtectOff
                ? `storage_protect_${String(res.status || '')}${zeroSuffix}${pvOnlySuffix}`
                : (forceNonPvDown ? `pv_only_protect_${String(res.status || '')}${zeroSuffix}${pvOnlySuffix}` : `${String(res.status || 'pv_auto')}${zeroSuffix}${pvOnlySuffix}`);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, autoStatus);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
        }

        this.adapter._heatingRodBudgetUsedW = Math.round(budgetUsedW);

        await this._setStateIfChanged('heatingRod.summary.pvCapW', Math.round(num(pvBase.pvCapW, 0)));
        await this._setStateIfChanged('heatingRod.summary.evcsUsedW', Math.round(num(pvBase.evcsUsedW, 0)));
        await this._setStateIfChanged('heatingRod.summary.thermalUsedW', Math.round(thermalUsedW));
        await this._setStateIfChanged('heatingRod.summary.currentHeatingRodW', Math.round(num(pvBase.currentHeatingRodW, currentHeatingRodW)));
        await this._setStateIfChanged('heatingRod.summary.installedPvPowerW', Math.round(num(pvBase.installedPvPowerW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvDirectW', Math.round(num(pvBase.pvDirectW, 0)));
        await this._setStateIfChanged('heatingRod.summary.nonHeatingLoadW', Math.round(num(pvBase.nonHeatingLoadW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvOnlyAvailableW', Math.round(num(pvBase.pvOnlyAvailableW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvOnlyBudgetKnown', !!pvBase.pvOnlyBudgetKnown);
        await this._setStateIfChanged('heatingRod.summary.storageReserveW', Math.round(num(pvBase.storageReserveW, 0)));
        await this._setStateIfChanged('heatingRod.summary.storageChargeW', Math.round(num(pvBase.storageChargeW, 0)));
        await this._setStateIfChanged('heatingRod.summary.storageDischargeW', Math.round(num(pvBase.storageDischargeW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableRawW', Math.round(num(pvBase.availableW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableW', Math.round(Math.max(0, num(pvBase.availableW, 0) - thermalUsedW)));
        await this._setStateIfChanged('heatingRod.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('heatingRod.summary.budgetUsedW', Math.round(budgetUsedW));
        await this._setStateIfChanged('heatingRod.summary.zeroExportActive', !!zeroExportInfo.active);
        await this._setStateIfChanged('heatingRod.summary.zeroExportCanProbe', !!zeroExportInfo.canProbe);
        await this._setStateIfChanged('heatingRod.summary.zeroExportReason', String(zeroExportInfo.reason || ''));
        await this._setStateIfChanged('heatingRod.summary.zeroExportPvNowW', Math.round(num(zeroExportInfo.pvNowW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportForecastOk', !!zeroExportInfo.forecastOk);
        await this._setStateIfChanged('heatingRod.summary.zeroExportFeedInAtLimit', !!zeroExportInfo.feedInAtLimit);
        await this._setStateIfChanged('heatingRod.summary.zeroExportProbePending', !!zeroAnyProbePending);
        await this._setStateIfChanged('heatingRod.summary.zeroExportProbePvGainW', Math.round(num(zeroProbePvGainW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportProbeExpectedW', Math.round(num(zeroProbeExpectedW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationMinW', Math.round(num(minPvAutomationW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationPvNowW', Math.round(num(pvNowForAutomationW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationAllowed', !!pvAutomationAllowedByMin);
        await this._setStateIfChanged('heatingRod.summary.debugJson', JSON.stringify({
            source: pvBase.source,
            pvAutomationMinW: Math.round(num(minPvAutomationW, 0)),
            pvAutomationPvNowW: Math.round(num(pvNowForAutomationW, 0)),
            pvAutomationAllowed: !!pvAutomationAllowedByMin,
            gridKnown: !!pvBase.gridKnown,
            gridW: pvBase.gridW,
            importW: Math.round(num(pvBase.importW, 0)),
            importToleranceW: Math.round(num(pvBase.importToleranceW, 0)),
            gridImportActive: !!pvBase.gridImportActive,
            exportW: Math.round(num(pvBase.exportW, 0)),
            currentHeatingRodW: Math.round(num(pvBase.currentHeatingRodW, 0)),
            installedPvPowerW: Math.round(num(pvBase.installedPvPowerW, 0)),
            pvDirectW: Math.round(num(pvBase.pvDirectW, 0)),
            pvDirectKnown: !!pvBase.pvDirectKnown,
            nonHeatingLoadW: Math.round(num(pvBase.nonHeatingLoadW, 0)),
            nonHeatingLoadSource: String(pvBase.nonHeatingLoadSource || 'unknown'),
            pvOnlyBudgetKnown: !!pvBase.pvOnlyBudgetKnown,
            pvOnlyAvailableW: Math.round(num(pvBase.pvOnlyAvailableW, 0)),
            storageChargeW: Math.round(num(pvBase.storageChargeW, 0)),
            storageDischargeW: Math.round(num(pvBase.storageDischargeW, 0)),
            dischargeToleranceW: Math.round(num(pvBase.dischargeToleranceW, 0)),
            storageDischargeActive: !!pvBase.storageDischargeActive,
            nonPvEnergyActive: !!pvBase.nonPvEnergyActive,
            storageSocPct: pvBase.storageSocPct,
            storageReserveW: Math.round(num(pvBase.storageReserveW, 0)),
            storageTargetSocPct: pvBase.storageTargetSocPct,
            nvpSurplusBeforeFlexW: Math.round(num(pvBase.nvpSurplusBeforeFlexW, 0)),
            nvpAvailableW: Math.round(num(pvBase.nvpAvailableW, 0)),
            cmAvailableW: Math.round(num(pvBase.cmAvailableW, 0)),
            availableW: Math.round(num(pvBase.availableW, 0)),
            thermalUsedW: Math.round(thermalUsedW),
            forceOff: !!pvBase.forceOff,
            zeroExport: {
                active: !!zeroExportInfo.active,
                canProbe: !!zeroExportInfo.canProbe,
                reason: zeroExportInfo.reason,
                pvNowW: Math.round(num(zeroExportInfo.pvNowW, 0)),
                feedInAtLimit: !!zeroExportInfo.feedInAtLimit,
                feedInLimitW: Math.round(num(zeroExportInfo.feedInLimitW, 0)),
                forecastOk: !!zeroExportInfo.forecastOk,
                forecast: zeroExportInfo.forecast || null,
                storageReady: !!zeroExportInfo.storageReady,
                probePending: !!zeroAnyProbePending,
                probePvGainW: Math.round(num(zeroProbePvGainW, 0)),
                probeExpectedW: Math.round(num(zeroProbeExpectedW, 0)),
            },
        }));
        await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
        await this._setStateIfChanged('heatingRod.summary.status', (this._devices && this._devices.length) ? `ok_${pvBase.source}${!pvAutomationAllowedByMin ? '_pv_min_block' : ''}${pvBase.forceOff ? '_storage_protect' : ''}${pvBase.nonPvEnergyActive ? '_pv_only_protect' : ''}${zeroExportInfo.active ? `_zero_${String(zeroExportInfo.reason || 'active')}` : ''}` : 'no_devices');
    }
}

module.exports = { HeatingRodControlModule };
