'use strict';

const { BaseModule } = require('./base');

function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(v, minV, maxV, fallback = null) {
    const n = num(v, fallback);
    if (n === null) return fallback;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}

function safeIndex(i) {
    const n = Math.round(Number(i) || 0);
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
}

/**
 * Schwellwertsteuerung (generischer Regelbaustein).
 *
 * - Installateur konfiguriert Input/Output, Vergleich, Schwellwert, Hysterese und minOn/minOff.
 * - Optional: Endkunde darf Enable/Schwellwert pro Regel über die VIS anpassen.
 *
 * Robustheit:
 * - fehlende/alte Daten -> keine Schreibaktionen
 * - idempotente Writes (nur bei Änderung)
 */
class ThresholdControlModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._rules = [];
        /** @type {Map<string, {active:boolean, lastOnMs:number, lastOffMs:number, lastChangeMs:number}>} */
        this._hyst = new Map();
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
    }

    _isEnabled() {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableThresholdControl);
    }

    _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.threshold && typeof this.adapter.config.threshold === 'object')
            ? this.adapter.config.threshold
            : {};
        return cfg;
    }

    async _setStateIfChanged(id, val) {
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (prev === v) return;
        this._stateCache.set(id, v);
        try {
            await this.adapter.setStateAsync(id, v, true);
        } catch (_e) {
            // ignore
        }
    }

    _normalizeCompare(raw) {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'below' || s === '<' || s === 'lt' || s === 'less' || s === 'kleiner') return 'below';
        return 'above';
    }

    _normalizeOutType(raw) {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'bool' || s === 'boolean' || s === 'switch') return 'boolean';
        return 'number';
    }

    _buildRulesFromConfig() {
        const cfg = this._getCfg();
        const list = Array.isArray(cfg.rules) ? cfg.rules : [];

        const out = [];
        const used = new Set();

        for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const idx = safeIndex(r.idx ?? r.index ?? (i + 1));
            if (used.has(idx)) continue;
            used.add(idx);

            const enabled = (typeof r.enabled === 'boolean') ? !!r.enabled : false;

            const name = String(r.name || '').trim() || `Regel ${idx}`;

            const inputId = String(r.inputId || r.inputObjectId || '').trim();
            const compare = this._normalizeCompare(r.compare);

            const threshold = clamp(r.threshold, -1e12, 1e12, null);
            const hysteresis = Math.max(0, clamp(r.hysteresis, 0, 1e12, 0));

            const minOnSec = Math.max(0, clamp(r.minOnSec, 0, 86400, 0));
            const minOffSec = Math.max(0, clamp(r.minOffSec, 0, 86400, 0));

            const outType = this._normalizeOutType(r.outputType);
            const outputId = String(r.outputId || r.outputObjectId || '').trim();

            const onValue = (outType === 'boolean')
                ? ((r.onValue === undefined || r.onValue === null) ? true : !!r.onValue)
                : clamp(r.onValue, -1e12, 1e12, 1);

            const offValue = (outType === 'boolean')
                ? ((r.offValue === undefined || r.offValue === null) ? false : !!r.offValue)
                : clamp(r.offValue, -1e12, 1e12, 0);

            const maxAgeMs = Math.max(500, Math.round(clamp(r.maxAgeMs, 500, 10 * 60 * 1000, 5000)));

            const userCanToggle = (typeof r.userCanToggle === 'boolean') ? !!r.userCanToggle : true;
            const userCanSetThreshold = (typeof r.userCanSetThreshold === 'boolean') ? !!r.userCanSetThreshold : true;
            const userCanSetMinOnSec = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : userCanSetThreshold;
            const userCanSetMinOffSec = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : userCanSetThreshold;

            out.push({
                idx,
                id: `r${idx}`,
                enabled,
                name,
                inputId,
                compare,
                threshold,
                hysteresis,
                minOnSec,
                minOffSec,
                outType,
                outputId,
                onValue,
                offValue,
                maxAgeMs,
                userCanToggle,
                userCanSetThreshold,
                userCanSetMinOnSec,
                userCanSetMinOffSec,
            });
        }

        out.sort((a, b) => a.idx - b.idx);
        this._rules = out;
    }

    _getRule(idx) {
        return this._rules.find(r => r && r.idx === idx) || null;
    }

    async init() {
        // Always create a stable channel tree.
        await this.adapter.setObjectNotExistsAsync('threshold', {
            type: 'channel',
            common: { name: 'Schwellwertsteuerung' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('threshold.rules', {
            type: 'channel',
            common: { name: 'Regeln' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('threshold.user', {
            type: 'channel',
            common: { name: 'User' },
            native: {},
        });

        const mk = async (id, name, type, role, unit = undefined, write = false, def = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!write,
                    ...(unit ? { unit } : {}),
                    ...(def !== undefined ? { def } : {}),
                },
                native: {},
            });
        };

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

        // Build rules from current config
        this._buildRulesFromConfig();

        // Create fixed slots (1..10) so the VIS can rely on stable ids.
        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`threshold.user.r${i}`, {
                type: 'channel',
                common: { name: `Regel ${i}` },
                native: {},
            });

            await mk(`threshold.user.r${i}.enabled`, 'Regel aktiv (User)', 'boolean', 'switch.enable', undefined, true, true);
            await mk(`threshold.user.r${i}.threshold`, 'Schwellwert (User)', 'number', 'level', undefined, true, 0);
            await mk(`threshold.user.r${i}.minOnSec`, 'MinOn (User)', 'number', 'value', 's', true, true, 0);
            await mk(`threshold.user.r${i}.minOffSec`, 'MinOff (User)', 'number', 'value', 's', true, true, 0);

            await this.adapter.setObjectNotExistsAsync(`threshold.user.r${i}.mode`, {
                type: 'state',
                common: {
                    name: 'Modus (User)',
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: true,
                    min: 0,
                    max: 2,
                    states: { 0: 'Aus', 1: 'Auto', 2: 'An' },
                },
                native: {},
            });


            await ensureDefault(`threshold.user.r${i}.enabled`, true);

            const enState = await this.adapter.getStateAsync(`threshold.user.r${i}.enabled`);
            const enVal = (enState && enState.val !== null && enState.val !== undefined) ? !!enState.val : true;
            await ensureDefault(`threshold.user.r${i}.mode`, enVal ? 1 : 0);


            const rr = this._getRule(i);
            if (rr && rr.threshold !== null && rr.threshold !== undefined) {
                await ensureDefault(`threshold.user.r${i}.threshold`, Number(rr.threshold));
            } else {
                await ensureDefault(`threshold.user.r${i}.threshold`, 0);
            }
            await ensureDefault(`threshold.user.r${i}.minOnSec`, (rr && rr.minOnSec !== undefined && rr.minOnSec !== null) ? Number(rr.minOnSec) : 0);
            await ensureDefault(`threshold.user.r${i}.minOffSec`, (rr && rr.minOffSec !== undefined && rr.minOffSec !== null) ? Number(rr.minOffSec) : 0);
        }

        // Diagnostics per rule
        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`threshold.rules.r${i}`, {
                type: 'channel',
                common: { name: `Regel ${i}` },
                native: {},
            });

            await mk(`threshold.rules.r${i}.configured`, 'Konfiguriert', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.effectiveEnabled`, 'Effektiv aktiv', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.active`, 'Ausgang aktiv', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.input`, 'Input', 'number', 'value');
            await mk(`threshold.rules.r${i}.thresholdEff`, 'Schwellwert effektiv', 'number', 'value');
            await mk(`threshold.rules.r${i}.status`, 'Status', 'string', 'text');
            await mk(`threshold.rules.r${i}.lastChange`, 'Letzte Umschaltung (ts)', 'number', 'value.time');
            await mk(`threshold.rules.r${i}.lastWriteOk`, 'Letzter Write OK', 'boolean', 'indicator');
        }

        // Register user states (read) in dpRegistry for deterministic reads
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `thr.user.r${i}.enabled`, objectId: `${ns}.threshold.user.r${i}.enabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.threshold`, objectId: `${ns}.threshold.user.r${i}.threshold`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.mode`, objectId: `${ns}.threshold.user.r${i}.mode`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.minOnSec`, objectId: `${ns}.threshold.user.r${i}.minOnSec`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.minOffSec`, objectId: `${ns}.threshold.user.r${i}.minOffSec`, dataType: 'number', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

        // Register rule input/output datapoints (if mapped)
        try {
            if (this.dp) {
                for (const r of this._rules) {
                    if (r.inputId) {
                        await this.dp.upsert({ key: `thr.${r.id}.in`, objectId: r.inputId, dataType: 'number', direction: 'in' });
                    }
                    if (r.outputId) {
                        await this.dp.upsert({ key: `thr.${r.id}.out`, objectId: r.outputId, dataType: (r.outType === 'boolean' ? 'boolean' : 'number'), direction: 'out' });
                    }
                }
            }
        } catch (_e) {
            // ignore
        }
    }

    async tick() {
        const enabled = this._isEnabled();
        const now = Date.now();

        // Update configured flags even if module disabled (UI diagnostics)
        for (let i = 1; i <= 10; i++) {
            const r = this._getRule(i);
            const configured = !!(r && r.inputId && r.outputId && r.threshold !== null && r.threshold !== undefined);
            await this._setStateIfChanged(`threshold.rules.r${i}.configured`, configured);
            if (!enabled) {
                await this._setStateIfChanged(`threshold.rules.r${i}.effectiveEnabled`, false);
                await this._setStateIfChanged(`threshold.rules.r${i}.status`, configured ? 'disabled' : 'unconfigured');
            }
        }

        if (!enabled) return;

        for (const r of this._rules) {
            const id = r.id;
            const idx = r.idx;

            const configured = !!(r.inputId && r.outputId && r.threshold !== null && r.threshold !== undefined);
            if (!configured) {
                await this._setStateIfChanged(`threshold.rules.r${idx}.effectiveEnabled`, false);
                await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'unconfigured');
                continue;
            }

            // User overrides (optional)
            let userEnabled = (this.dp && r.userCanToggle) ? this.dp.getBoolean(`thr.user.r${idx}.enabled`, true) : true;
            // User-Modus (0=Aus, 1=Auto, 2=An). Falls nicht vorhanden: Fallback auf enabled.
            let userMode = 1;
            if (this.dp && r.userCanToggle) {
                const mv = this.dp.getNumber(`thr.user.r${idx}.mode`, NaN);
                if (Number.isFinite(mv)) userMode = Math.max(0, Math.min(2, Math.round(mv)));
                else userMode = userEnabled ? 1 : 0;
            }
            const isManual = (userMode === 0 || userMode === 2);


            let thrEff = Number(r.threshold);
            if (this.dp && r.userCanSetThreshold) {
                const ut = this.dp.getNumber(`thr.user.r${idx}.threshold`, thrEff);
                if (Number.isFinite(ut)) thrEff = ut;
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.thresholdEff`, thrEff);

            const effEnabled = !!(r.enabled && (isManual ? true : userEnabled));
            await this._setStateIfChanged(`threshold.rules.r${idx}.effectiveEnabled`, effEnabled);

            if (!effEnabled) {
                await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'inactive');
                // Do not force outputs; we only stop regulating.
                continue;
            }

            // Input read (freshness)
            const inKey = `thr.${id}.in`;
            let input = null;
            if (this.dp) {
                input = this.dp.getNumberFresh(inKey, r.maxAgeMs, null);
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.input`, input);

            if (typeof input !== 'number') {
                if (!isManual) {
                    await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'stale');
                    continue;
                }
                // Manuell: keine Eingangsprüfung erforderlich
            }

            // State memory
            const mem = this._hyst.get(id) || { active: false, lastOnMs: 0, lastOffMs: 0, lastChangeMs: 0 };
            let want = mem.active;
            let status = mem.active ? 'active' : 'inactive';

            if (isManual) {
                // Manuelle Übersteuerung: sofortiges An/Aus
                want = (userMode === 2);
                status = want ? 'manual_on' : 'manual_off';
            } else {
                // Hysteresis thresholds
                const hyst = Math.max(0, Number(r.hysteresis || 0));
                let onThr = thrEff;
                let offThr = thrEff;

                if (r.compare === 'above') offThr = thrEff - hyst;
                else offThr = thrEff + hyst;

                if (!mem.active) {
                    // OFF -> ON
                    if (r.compare === 'above') {
                        if (input >= onThr) want = true;
                    } else {
                        if (input <= onThr) want = true;
                    }
                } else {
                    // ON -> OFF
                    if (r.compare === 'above') {
                        if (input <= offThr) want = false;
                    } else {
                        if (input >= offThr) want = false;
                    }
                }

                // minOn/minOff constraints (anti-flatter)
                // Optional: these parameters can be Endkunden-tunable via VIS (if enabled per rule)
                const canUserMinOn = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : !!r.userCanSetThreshold;
                const canUserMinOff = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : !!r.userCanSetThreshold;

                const userMinOnSec = canUserMinOn ? this.dp.getNumberFresh(`thr.user.r${idx}.minOnSec`, 7 * 24 * 3600 * 1000, null) : null;
                const userMinOffSec = canUserMinOff ? this.dp.getNumberFresh(`thr.user.r${idx}.minOffSec`, 7 * 24 * 3600 * 1000, null) : null;

                const effMinOnSec = (userMinOnSec !== null && userMinOnSec !== undefined && Number.isFinite(userMinOnSec)) ? userMinOnSec : Number(r.minOnSec || 0);
                const effMinOffSec = (userMinOffSec !== null && userMinOffSec !== undefined && Number.isFinite(userMinOffSec)) ? userMinOffSec : Number(r.minOffSec || 0);

                const minOnMs = Math.max(0, Math.round(effMinOnSec * 1000));
                const minOffMs = Math.max(0, Math.round(effMinOffSec * 1000));

                if (!mem.active && want) {
                    // pending ON?
                    if (minOffMs > 0 && mem.lastOffMs > 0 && (now - mem.lastOffMs) < minOffMs) {
                        want = false;
                        status = 'pending_on';
                    }
                } else if (mem.active && !want) {
                    // pending OFF?
                    if (minOnMs > 0 && mem.lastOnMs > 0 && (now - mem.lastOnMs) < minOnMs) {
                        want = true;
                        status = 'pending_off';
                    }
                }
            }

            // Apply output if state changes
            let wrote = null;
            if (want !== mem.active) {
                const outKey = `thr.${id}.out`;
                if (this.dp) {
                    try {
                        if (r.outType === 'boolean') {
                            const outVal = want ? !!r.onValue : !!r.offValue;
                            wrote = await this.dp.writeBoolean(outKey, outVal, false);
                        } else {
                            const outVal = want ? Number(r.onValue) : Number(r.offValue);
                            wrote = await this.dp.writeNumber(outKey, outVal, false);
                        }
                    } catch (_e) {
                        wrote = false;
                    }
                } else {
                    wrote = false;
                }

                // Update memory
                mem.active = want;
                mem.lastChangeMs = now;
                if (want) mem.lastOnMs = now;
                else mem.lastOffMs = now;
                this._hyst.set(id, mem);

                await this._setStateIfChanged(`threshold.rules.r${idx}.lastChange`, now);
                await this._setStateIfChanged(`threshold.rules.r${idx}.lastWriteOk`, wrote === true || wrote === null);
            } else {
                // keep memory
                this._hyst.set(id, mem);
            }

            await this._setStateIfChanged(`threshold.rules.r${idx}.active`, mem.active);
            await this._setStateIfChanged(`threshold.rules.r${idx}.status`, status);
        }
    }
}

module.exports = { ThresholdControlModule };
