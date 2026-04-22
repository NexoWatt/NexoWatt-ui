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
        /** @type {Map<string, {targetStage:number,lastIncreaseMs:number,lastDecreaseMs:number}>} */
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
                for (let s = 1; s <= 12; s++) {
                    const wId = String(ctrl[`stage${s}WriteId`] || ctrl[`heatingStage${s}WriteId`] || '').trim();
                    const rId = String(ctrl[`stage${s}ReadId`] || ctrl[`heatingStage${s}ReadId`] || '').trim();
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
            const switchWriteFallback = (stageCount === 1) ? String(ctrl.switchWriteId || '').trim() : '';
            const switchReadFallback = (stageCount === 1) ? String(ctrl.switchReadId || '').trim() : '';

            const defaults = computeStageDefaults(maxPowerW, stageCount);
            const stages = [];
            let wiredStages = 0;
            let cumulative = 0;
            for (let s = 1; s <= stageCount; s++) {
                const prevStages = Array.isArray(r.stages) ? r.stages : [];
                const prev = (prevStages[s - 1] && typeof prevStages[s - 1] === 'object') ? prevStages[s - 1] : {};
                const writeId = String(
                    ctrl[`stage${s}WriteId`] ||
                    ctrl[`heatingStage${s}WriteId`] ||
                    ((s === 1) ? switchWriteFallback : '') ||
                    ''
                ).trim();
                const readId = String(
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
        await mk('heatingRod.summary.pvAvailableRawW', 'PV available raw (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableW', 'PV available after thermal (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetUsedW', 'Budget used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('heatingRod.summary.status', 'Status', 'string', 'text');

        this._buildDevicesFromConfig();

        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'hr.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
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
            await mk(`heatingRod.devices.${d.id}.stageCount`, 'Configured stages', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.wiredStages`, 'Wired stages', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.targetStage`, 'Target stage', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.currentStage`, 'Current stage', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.targetW`, 'Target power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.appliedW`, 'Applied power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.measuredW`, 'Measured (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.status`, 'Status', 'string', 'text');

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
                this._stageCtl.set(d.id, { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 });
            }
        }
    }

    _computeBasePvAvailableW() {
        const cfg = this._getCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        const pvCapW = this.dp ? this.dp.getNumberFresh('hr.cm.pvCapW', staleMs, null) : null;
        const usedW = this.dp ? this.dp.getNumberFresh('hr.cm.usedW', staleMs, null) : null;

        if (typeof pvCapW === 'number' && Number.isFinite(pvCapW) && pvCapW > 0) {
            const u = (typeof usedW === 'number' && Number.isFinite(usedW)) ? Math.max(0, usedW) : 0;
            return { pvCapW, evcsUsedW: u, availableW: Math.max(0, pvCapW - u), source: 'cm' };
        }

        let gridW = this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('ps.gridPowerW', staleMs, null) : null;

        const avail = Math.max(0, -Number(gridW || 0));
        return { pvCapW: avail, evcsUsedW: 0, availableW: avail, source: 'grid' };
    }

    _sumStagePower(d, stageCount) {
        let sum = 0;
        const cnt = Math.max(0, Math.min(Math.round(Number(stageCount) || 0), d.stages.length));
        for (let i = 0; i < cnt; i++) sum += Math.max(0, num(d.stages[i].powerW, 0));
        return Math.round(sum);
    }

    _readMeasuredW(d) {
        if (!(this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey))) return null;
        const v = this.dp.getNumber(d.pWKey, null);
        return (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    }

    _readStageFeedback(d) {
        /** @type {Array<boolean|null>} */
        const states = [];
        let contiguous = 0;
        let anyKnown = false;
        let appliedPowerW = 0;
        for (const stage of d.stages) {
            let val = null;
            if (this.dp && stage.readKey && this.dp.getEntry && this.dp.getEntry(stage.readKey)) {
                val = this.dp.getBoolean(stage.readKey, null);
            } else if (this.dp && stage.writeKey && this.dp.getEntry && this.dp.getEntry(stage.writeKey)) {
                val = this.dp.getBoolean(stage.writeKey, null);
            }
            states.push(val);
            if (val !== null && val !== undefined) anyKnown = true;
            if (val === true) appliedPowerW += Math.max(0, num(stage.powerW, 0));
        }
        for (let i = 0; i < states.length; i++) {
            if (states[i] === true) contiguous = i + 1;
            else if (states[i] === false) break;
            else break;
        }
        return {
            states,
            anyKnown,
            currentStage: contiguous,
            appliedPowerW: Math.round(appliedPowerW),
        };
    }

    _ensureStageCtlState(id, observedStage = 0) {
        const prev = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
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

    async _applyStageState(d, targetStage, feedback) {
        if (!d.wiredStages || d.wiredStages < 1) {
            return { applied: false, status: 'no_stage_write_dp' };
        }

        const effectiveStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.wiredStages));
        let anyTrue = false;
        let anyFalse = false;

        for (let i = 0; i < d.stages.length; i++) {
            const stage = d.stages[i];
            if (!stage.writeKey) continue;
            const shouldOn = i < effectiveStage;
            const observed = Array.isArray(feedback && feedback.states) ? feedback.states[i] : null;
            const force = observed !== null && observed !== shouldOn;
            const res = await this._writeBoolForce(stage.writeKey, shouldOn, force);
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
        const st = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
        const prev = Math.max(0, Math.round(Number(observedStage !== null && observedStage !== undefined ? observedStage : st.targetStage) || 0));
        const next = Math.max(0, Math.round(Number(targetStage) || 0));
        const now = nowMs();
        if (next > prev) st.lastIncreaseMs = now;
        else if (next < prev) st.lastDecreaseMs = now;
        st.targetStage = next;
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

        const pvBase = this._computeBasePvAvailableW();
        const thermalUsedW = Math.max(0, num(this.adapter && this.adapter._thermalBudgetUsedW, 0));
        let remainingW = Math.max(0, num(pvBase.availableW, 0) - thermalUsedW);
        let appliedTotalW = 0;
        let budgetUsedW = 0;

        for (const d of this._devices) {
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.slot`, d.slot);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.name`, d.name);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.enabled`, !!d.enabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.mode`, String(d.mode));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.consumerType`, String(d.consumerType));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.stageCount`, d.stageCount);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.wiredStages`, d.wiredStages);

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

            const measuredW = this._readMeasuredW(d);
            if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.measuredW`, Math.round(measuredW));
            }

            const feedback = this._readStageFeedback(d);
            const observedStage = feedback.anyKnown ? feedback.currentStage : (this._stageCtl.get(d.id)?.targetStage || 0);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.currentStage`, observedStage);

            const ov = this._readOverrideForDevice(d, now);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.boostActive`, !!ov.boostActive);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.boostUntil`, ov.boostUntil ? Math.round(ov.boostUntil) : 0);

            const cfgMode = normalizeMode(d.mode);
            const baseMode = (userMode !== 'inherit') ? userMode : cfgMode;
            const manualStage = this._computeQuickManualStage(d, baseMode);
            const effectiveMode = ov.boostActive
                ? 'boost'
                : (manualStage > 0 ? `manual${Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)))}` : String(baseMode || 'pvAuto'));
            const effectiveEnabled = !!d.enabled && (ov.boostActive || manualStage > 0 || (!!userEnabled && baseMode !== 'off'));

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
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'slot_type_mismatch');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (!d.enabled) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'disabled');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            // Temporary boost: always full configured/wired power for the configured duration.
            if (ov.boostActive) {
                const fullStage = Math.max(0, Math.min(d.wiredStages || d.stageCount, d.stageCount));
                const res = await this._applyStageState(d, fullStage, feedback);
                const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, fullStage), d.wiredStages || d.stageCount));
                this._setStageCtlTarget(d.id, effectiveTargetStage, observedStage);
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
                const res = await this._applyStageState(d, manualStage, feedback);
                const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, manualStage), d.wiredStages || d.stageCount));
                this._setStageCtlTarget(d.id, effectiveTargetStage, observedStage);
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

            // End-customer disabled the automatik (Regelung AUS): actively switch the native Heizstab off.
            if (!userEnabled && (baseMode === 'pvAuto' || baseMode === 'inherit')) {
                const res = await this._applyStageState(d, 0, feedback);
                this._setStageCtlTarget(d.id, 0, observedStage);
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `regulation_off_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
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
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'manual_cfg');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (baseMode === 'off') {
                const res = await this._applyStageState(d, 0, feedback);
                this._setStageCtlTarget(d.id, 0, observedStage);
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

            if (d.wiredStages < 1) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'no_stage_write_dp');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            const desiredStage = this._computeDesiredStage(d, remainingW, observedStage);
            const targetStage = this._applyTiming(d, desiredStage, observedStage);
            const res = await this._applyStageState(d, targetStage, feedback);
            const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, targetStage), d.wiredStages));
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
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, String(res.status || 'pv_auto'));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
        }

        this.adapter._heatingRodBudgetUsedW = Math.round(budgetUsedW);

        await this._setStateIfChanged('heatingRod.summary.pvCapW', Math.round(num(pvBase.pvCapW, 0)));
        await this._setStateIfChanged('heatingRod.summary.evcsUsedW', Math.round(num(pvBase.evcsUsedW, 0)));
        await this._setStateIfChanged('heatingRod.summary.thermalUsedW', Math.round(thermalUsedW));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableRawW', Math.round(num(pvBase.availableW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableW', Math.round(Math.max(0, num(pvBase.availableW, 0) - thermalUsedW)));
        await this._setStateIfChanged('heatingRod.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('heatingRod.summary.budgetUsedW', Math.round(budgetUsedW));
        await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
        await this._setStateIfChanged('heatingRod.summary.status', (this._devices && this._devices.length) ? `ok_${pvBase.source}` : 'no_devices');
    }
}

module.exports = { HeatingRodControlModule };
