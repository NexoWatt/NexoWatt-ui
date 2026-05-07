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
        /** @type {{importSinceMs:number, dischargeSinceMs:number}} */
        this._budgetProtect = { importSinceMs: 0, dischargeSinceMs: 0 };
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
        await mk('heatingRod.summary.storageReserveW', 'Reserved storage charge power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageChargeW', 'Storage charge power used for coordination (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageDischargeW', 'Storage discharge power used for coordination (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableRawW', 'PV available raw (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableW', 'PV available after thermal (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetUsedW', 'Budget used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateTotalW', 'Budget gate total (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateRemainingW', 'Budget gate remaining after EVCS (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGatePvW', 'Budget gate PV for heating rod (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateEffectiveW', 'Budget gate effective for heating rod (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateSource', 'Budget gate source', 'string', 'text');
        await mk('heatingRod.summary.gridImportW', 'Grid import used for heating rod gate (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.gridImportLimitW', 'Allowed grid import in PV auto (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.gridImportExceeded', 'Grid import above heating rod limit', 'boolean', 'indicator');
        await mk('heatingRod.summary.storageDischargeExceeded', 'Storage discharge above heating rod limit', 'boolean', 'indicator');
        await mk('heatingRod.summary.debugJson', 'Debug JSON', 'string', 'json');
        await mk('heatingRod.summary.zeroExportActive', 'Zero/minus feed-in logic active', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportCanProbe', 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportReason', 'Zero/minus feed-in reason', 'string', 'text');
        await mk('heatingRod.summary.zeroExportPvNowW', 'Zero/minus feed-in PV now (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportForecastOk', 'Zero/minus feed-in forecast ok', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportFeedInAtLimit', 'Zero/minus feed-in limit reached', 'boolean', 'indicator');
        await mk('heatingRod.summary.pvAutomationMinW', 'PV-Auto minimum PV power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationPvNowW', 'PV-Auto current PV power used for gate (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationAllowed', 'PV-Auto allowed by minimum PV power', 'boolean', 'indicator');
        await mk('heatingRod.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('heatingRod.summary.status', 'Status', 'string', 'text');

        this._buildDevicesFromConfig();

        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'hr.cm.active', objectId: `${ns}.chargingManagement.control.active`, dataType: 'boolean', direction: 'in' });
                await this.dp.upsert({ key: 'hr.cm.budgetW', objectId: `${ns}.chargingManagement.control.budgetW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.remainingW', objectId: `${ns}.chargingManagement.control.remainingW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvCapRawW', objectId: `${ns}.chargingManagement.control.pvCapRawW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvAvailable', objectId: `${ns}.chargingManagement.control.pvAvailable`, dataType: 'boolean', direction: 'in' });
                await this.dp.upsert({ key: 'hr.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvSurplusNoEvRawW', objectId: `${ns}.chargingManagement.control.pvSurplusNoEvRawW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvSurplusNoEvAvg5mW', objectId: `${ns}.chargingManagement.control.pvSurplusNoEvAvg5mW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.gridW', objectId: `${ns}.chargingManagement.control.gridImportW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.staleMeter', objectId: `${ns}.chargingManagement.control.staleMeter`, dataType: 'boolean', direction: 'in' });
                await this.dp.upsert({ key: 'hr.cm.staleBudget', objectId: `${ns}.chargingManagement.control.staleBudget`, dataType: 'boolean', direction: 'in' });
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
                const hasDpEntry = !!(this.dp && this.dp.getEntry && this.dp.getEntry(key));
                if (hasDpEntry) {
                    // Registered datapoints carry freshness metadata. If such a datapoint is
                    // stale, never resurrect the old value from the raw adapter cache. This is
                    // especially important for Batterie-Entladen: an old discharge value would
                    // otherwise block Heizstab step-up although the live NVP/PV budget is clean.
                    if (typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) continue;
                    const v = this.dp.getNumberFresh ? this.dp.getNumberFresh(key, staleMs, null) : this.dp.getNumber(key, null);
                    if (typeof v === 'number' && Number.isFinite(v)) return v;
                    continue;
                }
            } catch (_e) {
                // ignore and try the raw cache fallback for unregistered aliases below
            }
            const c = this._readCacheNumber(key, null);
            if (typeof c === 'number' && Number.isFinite(c)) return c;
        }
        return fallback;
    }

    _readBooleanAny(keys, staleMs, fallback = null) {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const key of list) {
            if (!key) continue;
            try {
                const hasDpEntry = !!(this.dp && this.dp.getEntry && this.dp.getEntry(key));
                if (hasDpEntry) {
                    if (typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) continue;
                    const v = this.dp.getBoolean ? this.dp.getBoolean(key, null) : null;
                    if (v !== null && v !== undefined) return !!v;
                    continue;
                }
            } catch (_e) {
                // ignore and try the raw cache fallback for unregistered aliases below
            }
            const raw = this._readCacheRaw(key, null);
            if (raw === null || raw === undefined) continue;
            if (typeof raw === 'boolean') return raw;
            if (typeof raw === 'number') return raw !== 0;
            if (typeof raw === 'string') {
                const t = raw.trim().toLowerCase();
                if (['true', '1', 'on', 'yes', 'active', 'enabled'].includes(t)) return true;
                if (['false', '0', 'off', 'no', 'inactive', 'disabled'].includes(t)) return false;
            }
        }
        return fallback;
    }

    _getBudgetGateCfg() {
        const cfg = this._getCfg();
        const zero = (cfg.zeroExport && typeof cfg.zeroExport === 'object') ? cfg.zeroExport : {};
        const pickNum = (keys, def, minV = 0, maxV = 1e12) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const key of list) {
                const raw = (cfg[key] !== undefined && cfg[key] !== null && cfg[key] !== '') ? cfg[key] : zero[key];
                if (raw === null || raw === undefined || raw === '') continue;
                const n = Number(raw);
                if (Number.isFinite(n)) return Math.round(clamp(n, minV, maxV));
            }
            return Math.round(clamp(def, minV, maxV));
        };

        return {
            useBudgetGates: true,
            // Robust defaults: Heizstab is a stepped, slow thermal load. Small NVP
            // oscillations must be tolerated instead of instantly dropping a stage.
            maxGridImportW: pickNum(['maxGridImportW', 'gridImportToleranceW', 'pvMaxGridImportW', 'pvImportToleranceW', 'gridImportTripW'], 250, 0, 1000000),
            gridImportHoldSec: pickNum(['gridImportHoldSec', 'gridImportTripSec', 'pvGridImportHoldSec'], 45, 0, 3600),
            hardGridImportW: pickNum(['hardGridImportW', 'pvHardGridImportW'], 1500, 0, 1000000),
            storageDischargeToleranceW: pickNum(['storageDischargeToleranceW', 'pvStorageDischargeToleranceW'], 300, 0, 1000000),
            storageDischargeHoldSec: pickNum(['storageDischargeHoldSec', 'storageDischargeTripSec', 'pvStorageDischargeHoldSec'], 45, 0, 3600),
            hardStorageDischargeW: pickNum(['hardStorageDischargeW', 'pvHardStorageDischargeW'], 2000, 0, 1000000),
            budgetSafetyReserveW: pickNum(['budgetSafetyReserveW', 'pvSafetyReserveW'], 200, 0, 1000000),
            stageUpDelaySec: pickNum(['stageUpDelaySec', 'budgetStageUpDelaySec', 'pvStageUpDelaySec'], 20, 0, 3600),
            minStageRunSec: pickNum(['minStageRunSec', 'minAutoStageRunSec', 'pvMinStageRunSec'], 120, 0, 86400),
            cooldownAfterOffSec: pickNum(['cooldownAfterOffSec', 'autoCooldownAfterOffSec', 'pvCooldownAfterOffSec'], 180, 0, 86400),
        };
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
            const signedW = Math.round(batteryPowerW);
            const noiseW = 25;
            // batteryPower is the canonical direction signal in this adapter:
            // +W = discharge, -W = charge. Prefer that direction over separate
            // charge/discharge aliases, because those can be delayed or vendor-specific.
            // Otherwise a charging battery can look like discharge and block stage-up.
            if (signedW < -noiseW) {
                chargeW = Math.max(chargeW, Math.abs(signedW));
                dischargeW = 0;
            } else if (signedW > noiseW) {
                dischargeW = Math.max(dischargeW, signedW);
                chargeW = 0;
            } else {
                chargeW = 0;
                dischargeW = 0;
            }
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

    _computeBasePvAvailableW(currentHeatingRodW = 0) {
        const cfg = this._getCfg();
        const gateCfg = this._getBudgetGateCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        const finite = (v) => (typeof v === 'number' && Number.isFinite(v));

        const cmActive = this._readBooleanAny(['hr.cm.active', 'chargingManagement.control.active'], staleMs, null);
        const cmStaleMeter = this._readBooleanAny(['hr.cm.staleMeter', 'chargingManagement.control.staleMeter'], staleMs, false);
        const cmStaleBudget = this._readBooleanAny(['hr.cm.staleBudget', 'chargingManagement.control.staleBudget'], staleMs, false);

        const cmBudgetWRaw = this._readNumberAny(['hr.cm.budgetW', 'chargingManagement.control.budgetW'], staleMs, null);
        const cmRemainingWRaw = this._readNumberAny(['hr.cm.remainingW', 'chargingManagement.control.remainingW'], staleMs, null);
        const cmUsedWRaw = this._readNumberAny(['hr.cm.usedW', 'chargingManagement.control.usedW'], staleMs, null);
        const cmPvCapEffectiveRaw = this._readNumberAny(['hr.cm.pvCapW', 'chargingManagement.control.pvCapEffectiveW'], staleMs, null);
        const cmPvCapRawRaw = this._readNumberAny(['hr.cm.pvCapRawW', 'chargingManagement.control.pvCapRawW'], staleMs, null);
        const cmPvNoEvRaw = this._readNumberAny(['hr.cm.pvSurplusNoEvRawW', 'chargingManagement.control.pvSurplusNoEvRawW'], staleMs, null);
        const cmPvNoEvAvg = this._readNumberAny(['hr.cm.pvSurplusNoEvAvg5mW', 'chargingManagement.control.pvSurplusNoEvAvg5mW'], staleMs, null);
        const cmPvAvailable = this._readBooleanAny(['hr.cm.pvAvailable', 'chargingManagement.control.pvAvailable'], staleMs, null);

        const pvCapW = finite(cmPvCapEffectiveRaw) ? Math.max(0, cmPvCapEffectiveRaw) : 0;
        const evcsUsedW = finite(cmUsedWRaw) ? Math.max(0, cmUsedWRaw) : 0;
        const currentW = Math.max(0, num(currentHeatingRodW, 0));

        const gridW = this._readNumberAny([
            'hr.cm.gridW',
            'chargingManagement.control.gridImportW',
            'grid.powerRawW',
            'grid.powerW',
            'ps.gridPowerW'
        ], staleMs, null);
        const gridKnown = finite(gridW);
        const exportW = gridKnown ? Math.max(0, -gridW) : 0;
        const importW = gridKnown ? Math.max(0, gridW) : 0;
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
        // Speicherreserve sauber bilanzieren: Was der Speicher bereits lädt, erfüllt zuerst
        // die Reserve. Nur die noch fehlende Reserve wird vom Heizstab-Budget abgezogen;
        // Speicherladung oberhalb der Reserve darf als nutzbarer PV-Überschuss gelten.
        const storageReserveMissingW = Math.max(0, storageReserveW - Math.max(0, storage.chargeW));
        const storageChargeUsableW = storageReserveW > 0
            ? Math.max(0, Math.max(0, storage.chargeW) - storageReserveW)
            : Math.max(0, storage.chargeW);

        // Gate A/T/§14a/Peak: consume the remaining central budget after EVCS.
        // This is intentionally read-only: Heizstab does not change the load management budget engine.
        let totalGateRemainingW = Number.POSITIVE_INFINITY;
        let totalGateBudgetW = Number.POSITIVE_INFINITY;
        let totalGateSource = 'unlimited';
        const cmLooksActive = cmActive === true
            || evcsUsedW > 0
            || (finite(cmBudgetWRaw) && cmBudgetWRaw > 0)
            || (finite(cmRemainingWRaw) && cmRemainingWRaw > 0);
        if (gateCfg.useBudgetGates && cmLooksActive && !cmStaleBudget && finite(cmRemainingWRaw)) {
            totalGateRemainingW = Math.max(0, cmRemainingWRaw);
            totalGateBudgetW = finite(cmBudgetWRaw) ? Math.max(0, cmBudgetWRaw) : totalGateRemainingW + evcsUsedW;
            totalGateSource = 'chargingManagement.remainingW';
        } else {
            try {
                const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
                const cap = caps && caps.evcsHighLevel ? num(caps.evcsHighLevel.capW, null) : null;
                if (gateCfg.useBudgetGates && typeof cap === 'number' && Number.isFinite(cap) && cap > 0) {
                    totalGateBudgetW = Math.max(0, cap);
                    totalGateRemainingW = Math.max(0, cap - evcsUsedW);
                    totalGateSource = `ems.core.${String(caps.evcsHighLevel.binding || 'highLevel')}`;
                }
            } catch (_e) {
                // ignore core fallback
            }
        }

        // Gate B: prefer the same PV surplus gate that EVCS uses when it is active.
        // It is reconstructed without EVCS; therefore add the current Heizstab load back in,
        // otherwise an already running stage would collapse its own PV budget at 0 export.
        let cmPvGateW = null;
        let cmPvGateSource = '';
        if (!cmStaleMeter) {
            const candidates = [];
            if (finite(cmPvCapEffectiveRaw) && cmPvCapEffectiveRaw > 0) candidates.push({ k: 'cm.pvCapEffectiveW', w: cmPvCapEffectiveRaw });
            if (finite(cmPvCapRawRaw) && cmPvCapRawRaw > 0) candidates.push({ k: 'cm.pvCapRawW', w: cmPvCapRawRaw });
            if (finite(cmPvNoEvRaw) && cmPvNoEvRaw > 0) candidates.push({ k: 'cm.pvSurplusNoEvRawW', w: cmPvNoEvRaw });
            if (finite(cmPvNoEvAvg) && cmPvNoEvAvg > 0) candidates.push({ k: 'cm.pvSurplusNoEvAvg5mW', w: cmPvNoEvAvg });
            if (candidates.length) {
                const best = candidates.reduce((a, b) => (b.w > a.w ? b : a), candidates[0]);
                // The EVCS PV gate reports the currently visible PV surplus. For Heizstab
                // targeting this is a total flexible-load budget: keep the already running
                // Heizstab stage in the budget and only reserve actual battery charging power.
                // A storage reserve must not blindly eat visible NVP export, otherwise the rod
                // can get stuck on stage 1 although several kW are still exported.
                cmPvGateW = Math.max(0, best.w - evcsUsedW + currentW + storageChargeUsableW - storage.dischargeW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);
                cmPvGateSource = `${best.k}+nvp-follow`;
            } else if (cmPvAvailable === false && finite(cmPvCapEffectiveRaw)) {
                cmPvGateW = Math.max(0, currentW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);
                cmPvGateSource = 'cm.pvAvailable.false_hold_only';
            }
        }

        // Fallback/second truth: NVP balance without Heizstab as flexible load.
        // import above the configured tolerance consumes the budget; small import remains allowed
        // to keep the stages running calmly like PV-only EV charging.
        const importExcessW = gridKnown ? Math.max(0, importW - gateCfg.maxGridImportW) : 0;
        const usableStorageChargeForNvpW = storageChargeUsableW;
        const nvpSurplusBeforeFlexW = gridKnown
            ? Math.max(0, exportW + currentW + usableStorageChargeForNvpW - storage.dischargeW - importExcessW)
            : 0;
        const nvpAvailableW = Math.max(0, nvpSurplusBeforeFlexW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);

        let pvBudgetGateW = nvpAvailableW;
        let pvBudgetSource = gridKnown ? 'nvp+ownLoad+storageReserve' : 'no-fresh-nvp';
        let pvBudgetFromCentral = false;
        if (cmPvGateW !== null && Number.isFinite(cmPvGateW) && cmPvGateW > pvBudgetGateW) {
            pvBudgetGateW = cmPvGateW;
            pvBudgetSource = cmPvGateSource || 'cm.pvGate';
        }

        // Primary future path: central EMS Budget & Gates.
        // Charging reserves EVCS first, Thermal reserves second, Heizstab follows the remaining PV budget.
        // We still apply Heizstab-specific Speicherreserve/Sicherheitsreserve here, because this app owns
        // the staged relay decision and must protect manual/external channels.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            const snap = rt && typeof rt.peek === 'function' ? rt.peek() : null;
            const age = snap && Number.isFinite(Number(snap.ts)) ? (Date.now() - Number(snap.ts)) : Number.POSITIVE_INFINITY;
            if (snap && age <= staleMs) {
                const remTotal = Number(snap.remainingTotalW);
                if (Number.isFinite(remTotal) && remTotal >= 0) {
                    totalGateRemainingW = Math.min(totalGateRemainingW, Math.max(0, remTotal));
                    totalGateBudgetW = Number.isFinite(totalGateBudgetW) ? totalGateBudgetW : Math.max(0, remTotal);
                    totalGateSource = 'ems.budget.remainingTotalW';
                }

                const remPv = Number(snap.remainingPvW);
                if (Number.isFinite(remPv) && remPv >= 0) {
                    // Sobald der zentrale Budget-Koordinator frisch ist, ist sein Rest-PV-Budget
                    // maßgeblich. Legacy-NVP/CM-Werte bleiben nur Fallback, damit nach Priorität
                    // keine App wieder ein bereits vergebenes PV-Budget doppelt nutzt.
                    // The central coordinator already subtracts active flexible loads. For a
                    // stepped Heizstab we need a hold budget: add back only the
                    // Heizstab power that this PV-Auto currently owns. Otherwise an
                    // already-running stage would make ems.budget.remainingPvW drop to 0
                    // and the app would nervously switch off although NVP is still clean.
                    const centralPvW = Math.max(0, remPv + currentW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);
                    pvBudgetGateW = centralPvW;
                    pvBudgetSource = 'ems.budget.remainingPvW+ownAutoLoad';
                    pvBudgetFromCentral = true;
                }

                const tariffGate = snap.gates && snap.gates.tariff ? snap.gates.tariff : null;
                const tariffImportPreferred = !!(tariffGate && tariffGate.gridImportPreferred);
                if (tariffImportPreferred && Number.isFinite(remTotal) && remTotal >= 0) {
                    // Gate E: Bei Negativpreis darf der Heizstab als aktivierter flexibler
                    // Verbraucher Netzbudget nutzen. Gate A/A2/Peak bleiben über remTotal aktiv.
                    pvBudgetGateW = Math.max(0, remTotal + currentW - gateCfg.budgetSafetyReserveW);
                    pvBudgetSource = 'ems.budget.tariffNegative.remainingTotalW+ownAutoLoad';
                    pvBudgetFromCentral = true;
                }
            }
        } catch (_e) {
            // legacy NVP/CM fallback remains active
        }

        const effectiveGateW = Math.max(0, Math.min(
            pvBudgetGateW,
            Number.isFinite(totalGateRemainingW) ? totalGateRemainingW : Number.POSITIVE_INFINITY
        ));

        const source = `${pvBudgetSource}|${totalGateSource}`;
        const gridImportActive = !!(gridKnown && importW > gateCfg.maxGridImportW);
        const storageDischargeActive = !!(storage.dischargeW > gateCfg.storageDischargeToleranceW);
        const nonPvEnergyActive = !!(gridImportActive || storageDischargeActive);
        const forceOff = effectiveGateW <= 50 && currentW > 0 && (importW > gateCfg.hardGridImportW || storage.dischargeW > gateCfg.hardStorageDischargeW);

        return {
            pvCapW: Math.max(pvBudgetGateW, pvCapW, nvpSurplusBeforeFlexW),
            evcsUsedW,
            availableW: effectiveGateW,
            source,
            gateCfg,
            useBudgetGates: !!gateCfg.useBudgetGates,
            budgetGateTotalW: Number.isFinite(totalGateBudgetW) ? Math.max(0, totalGateBudgetW) : null,
            budgetGateRemainingW: Number.isFinite(totalGateRemainingW) ? Math.max(0, totalGateRemainingW) : null,
            budgetGatePvW: Math.max(0, pvBudgetGateW),
            budgetGateEffectiveW: Math.max(0, effectiveGateW),
            budgetGateSource: source,
            pvBudgetFromCentral: !!pvBudgetFromCentral,
            tariffGridImportPreferred: String(pvBudgetSource || '').includes('tariffNegative'),
            cmActive,
            cmStaleMeter: !!cmStaleMeter,
            cmStaleBudget: !!cmStaleBudget,
            cmPvAvailable,
            cmPvCapEffectiveW: pvCapW,
            cmPvCapRawW: finite(cmPvCapRawRaw) ? Math.max(0, cmPvCapRawRaw) : 0,
            cmPvSurplusNoEvRawW: finite(cmPvNoEvRaw) ? Math.max(0, cmPvNoEvRaw) : 0,
            gridKnown,
            gridW: gridKnown ? gridW : null,
            importW,
            importToleranceW: gateCfg.maxGridImportW,
            gridImportActive,
            exportW,
            currentHeatingRodW: currentW,
            storageChargeW: storage.chargeW,
            storageDischargeW: storage.dischargeW,
            dischargeToleranceW: gateCfg.storageDischargeToleranceW,
            storageDischargeActive,
            nonPvEnergyActive,
            storageSocPct: storage.socPct,
            storageReserveW,
            storageReserveMissingW,
            storageChargeUsableW,
            storageTargetSocPct,
            usableStorageChargeForNvpW,
            stageUpDelaySec: gateCfg.stageUpDelaySec,
            nvpSurplusBeforeFlexW,
            cmAvailableW: (cmPvGateW !== null && Number.isFinite(cmPvGateW)) ? Math.max(0, cmPvGateW) : 0,
            nvpAvailableW,
            forceOff,
        };
    }

    _updateBudgetGateProtection(pvBase, now) {
        const cfg = (pvBase && pvBase.gateCfg) ? pvBase.gateCfg : this._getBudgetGateCfg();
        const st = this._budgetProtect || { importSinceMs: 0, dischargeSinceMs: 0 };
        const tariffImportPreferred = !!(pvBase && pvBase.tariffGridImportPreferred);
        const importActive = !!(!tariffImportPreferred && pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.maxGridImportW);
        const dischargeActive = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.storageDischargeToleranceW);
        const hardImport = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.hardGridImportW);
        const hardDischarge = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.hardStorageDischargeW);
        if (importActive) {
            if (!st.importSinceMs) st.importSinceMs = now;
        } else {
            st.importSinceMs = 0;
        }
        if (dischargeActive) {
            if (!st.dischargeSinceMs) st.dischargeSinceMs = now;
        } else {
            st.dischargeSinceMs = 0;
        }

        const importHoldMs = importActive && st.importSinceMs ? Math.max(0, now - st.importSinceMs) : 0;
        const dischargeHoldMs = dischargeActive && st.dischargeSinceMs ? Math.max(0, now - st.dischargeSinceMs) : 0;
        const hardOff = !!(hardImport || hardDischarge);
        const reduceNow = hardOff
            || (importActive && importHoldMs >= Math.max(0, cfg.gridImportHoldSec * 1000))
            || (dischargeActive && dischargeHoldMs >= Math.max(0, cfg.storageDischargeHoldSec * 1000));
        const reason = hardOff
            ? (hardImport ? 'hard_grid_import' : 'hard_storage_discharge')
            : (reduceNow ? (importActive ? 'grid_import_hold' : 'storage_discharge_hold') : (importActive || dischargeActive ? 'watch' : 'ok'));

        this._budgetProtect = st;
        return {
            importActive,
            dischargeActive,
            hardImport,
            hardDischarge,
            importHoldMs,
            dischargeHoldMs,
            hardOff,
            reduceNow,
            watchActive: !!((importActive || dischargeActive) && !reduceNow),
            reason,
        };
    }

    _getZeroExportCfg() {
        const cfg = this._getCfg();
        const gateCfg = this._getBudgetGateCfg();
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
            gridImportTripW: gateCfg.maxGridImportW,
            gridImportTripSec: gateCfg.gridImportHoldSec,
            hardGridImportW: gateCfg.hardGridImportW,
            storageDischargeToleranceW: gateCfg.storageDischargeToleranceW,
            storageDischargeTripSec: gateCfg.storageDischargeHoldSec,
            hardStorageDischargeW: gateCfg.hardStorageDischargeW,
            stepUpDelaySec: n(['stepUpDelaySec', 'stepUpWaitSec'], 60, 0, 86400),
            stepDownDelaySec: n(['stepDownDelaySec', 'stepDownWaitSec'], 5, 0, 86400),
            cooldownSec: n(['cooldownSec', 'probeCooldownSec'], 60, 0, 86400),
            probeObserveSec: n(['probeObserveSec', 'pvFollowCheckSec', 'pvNachregelCheckSec'], 45, 0, 3600),
            probeMinPvRisePct: n(['probeMinPvRisePct', 'pvRiseMinPct', 'pvAnstiegMinPct'], 20, 0, 1000),
            probeMinPvRiseW: n(['probeMinPvRiseW', 'pvRiseMinW', 'pvAnstiegMinW'], 150, 0, 1000000),
            probeRetrySec: n(['probeRetrySec', 'retryAfterFailedRiseSec', 'pvRiseRetrySec'], 600, 0, 86400),
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

    _readPvNowW(staleMs) {
        const basePv = this._readNumberAny([
            'pvPower',
            'productionTotal',
            'derived.core.pv.totalW',
            'ems.budget.pvPowerW',
            // PeakShaving registers the current PV input as ps.pvW. Keep the old
            // ps.pvPowerW alias as compatibility fallback.
            'ps.pvW',
            'ps.pvPowerW',
            'chargingManagement.control.pvPowerW',
            'cm.pvPowerW'
        ], staleMs, null);
        const farmPv = this._readNumberAny(['storageFarm.totalPvPowerW'], staleMs, null);
        let pv = 0;
        if (typeof basePv === 'number' && Number.isFinite(basePv)) pv = Math.max(pv, basePv);
        if (typeof farmPv === 'number' && Number.isFinite(farmPv)) pv = Math.max(pv, farmPv);
        return Math.max(0, Math.round(pv));
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
        // Use only the actually measured PV generation for this guard. The reconstructed
        // NVP/own-load budget can include a running Heizstab and must not masquerade as
        // fresh PV generation; otherwise PV-Auto may keep regulating although the roof
        // generation has already fallen away.
        const pvNowW = this._readPvNowW(staleMs);
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

    _readMeasuredW(d, staleMs = null) {
        if (!(this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey))) return null;
        let v = null;
        try {
            if (Number.isFinite(Number(staleMs)) && staleMs > 0 && typeof this.dp.getNumberFresh === 'function') {
                v = this.dp.getNumberFresh(d.pWKey, staleMs, null);
            } else {
                v = this.dp.getNumber(d.pWKey, null);
            }
        } catch (_e) {
            v = null;
        }
        return (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    }

    _readStageFeedback(d, staleMs = null) {
        /** @type {Array<boolean|null>} */
        const states = [];
        const powerByActuator = new Map();
        let contiguous = 0;
        let anyKnown = false;

        const readBoolFresh = (key) => {
            if (!(this.dp && key && this.dp.getEntry && this.dp.getEntry(key))) return { known: false, value: null, stale: false };
            try {
                if (Number.isFinite(Number(staleMs)) && staleMs > 0 && typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) {
                    return { known: false, value: null, stale: true };
                }
                const value = this.dp.getBoolean ? this.dp.getBoolean(key, null) : null;
                return { known: value !== null && value !== undefined, value, stale: false };
            } catch (_e) {
                return { known: false, value: null, stale: false };
            }
        };

        for (let i = 0; i < d.stages.length; i++) {
            const stage = d.stages[i];
            let val = null;

            // Prefer a fresh feedback/read DP. If the feedback DP is stale, fall back
            // to the write/state DP. This is important for KNX/OpenKNX installations
            // where read objects may stay old for hours while the EMS has just written
            // the relay. A stale false feedback must not reset PV-Auto back to stage 1
            // on every tick and block step-up although the NVP/PV budget is available.
            const read = stage.readKey ? readBoolFresh(stage.readKey) : { known: false, value: null, stale: false };
            if (read.known) {
                val = read.value;
            } else if (this.dp && stage.writeKey && this.dp.getEntry && this.dp.getEntry(stage.writeKey)) {
                try { val = this.dp.getBoolean ? this.dp.getBoolean(stage.writeKey, null) : null; } catch (_e) { val = null; }
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
        const prev = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
        const obs = Math.max(0, Math.round(Number(observedStage) || 0));
        if (!Number.isFinite(prev.targetStage)) prev.targetStage = obs;

        const target = Math.max(0, Math.round(Number(prev.targetStage) || 0));
        const ownedStage = Math.max(0, Math.round(Number(prev.autoOwnedStage) || 0));
        const autoOwned = !!(prev.autoOwned && Math.max(target, ownedStage) > 0);

        if (autoOwned) {
            // PV-Auto must not lose its target just because a read/feedback DP lags
            // behind or is stale. Otherwise each tick resets targetStage to the
            // currently observed lower stage and the stepped controller can never
            // climb from stage 1 to stage 2/3/4 despite enough PV budget.
            // If a higher physical stage is observed, sync upwards so external
            // intervention can still be detected by _getAutoOwnership().
            if (obs > target) prev.targetStage = obs;
        } else if (obs !== target) {
            prev.targetStage = obs;
        }

        this._stageCtl.set(id, prev);
        return prev;
    }

    _stagePowerScale(d, observedStage = 0, measuredW = null) {
        const st = (d && d.id && this._stageCtl && this._stageCtl.get) ? (this._stageCtl.get(d.id) || null) : null;
        const learned = st && Number.isFinite(Number(st.stagePowerScale)) ? clamp(Number(st.stagePowerScale), 0.25, 4) : 1;
        const obs = Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d && d.stages ? d.stages.length : 0));
        const measured = Number(measuredW);
        if (obs <= 0 || !Number.isFinite(measured) || measured <= 50) return learned;
        const configuredW = Math.max(0, this._sumStagePower(d, obs));
        if (configuredW <= 50) return learned;
        const ratio = measured / configuredW;
        if (!Number.isFinite(ratio) || ratio <= 0) return learned;
        // Clamp keeps a noisy meter from destroying the stage model, but still corrects
        // common setups where the configured default says 2 kW/stage and the real rod is 1 kW/stage.
        const scale = clamp(ratio, 0.25, 4);
        if (d && d.id && this._stageCtl && this._stageCtl.set) {
            const next = Object.assign({}, st || { targetStage: obs, lastIncreaseMs: 0, lastDecreaseMs: 0 }, { stagePowerScale: scale });
            this._stageCtl.set(d.id, next);
        }
        return scale;
    }

    _sumStagePowerModel(d, stageCount, observedStage = 0, measuredW = null) {
        const configuredW = this._sumStagePower(d, stageCount);
        const scale = this._stagePowerScale(d, observedStage, measuredW);
        return this._capDevicePower(d, Math.round(configuredW * scale));
    }

    _stageThresholdModel(d, stageIndexZeroBased, key, observedStage = 0, measuredW = null, fallbackStageCount = null) {
        const stage = d && d.stages ? d.stages[stageIndexZeroBased] : null;
        const scale = this._stagePowerScale(d, observedStage, measuredW);
        const raw = stage && Number.isFinite(Number(stage[key])) ? Math.max(0, Number(stage[key])) : null;
        if (raw !== null) return Math.round(raw * scale);
        const cnt = fallbackStageCount !== null ? fallbackStageCount : (stageIndexZeroBased + 1);
        return this._sumStagePowerModel(d, cnt, observedStage, measuredW);
    }

    _computeDesiredStage(d, remainingW, currentStage, measuredW = null) {
        let stage = Math.max(0, Math.min(Math.round(Number(currentStage) || 0), d.stageCount));
        const budgetW = Math.max(0, Math.round(num(remainingW, 0)));

        while (stage > 0) {
            const offBelowW = this._stageThresholdModel(d, stage - 1, 'offBelowW', currentStage, measuredW, stage);
            if (budgetW < Math.max(0, offBelowW)) stage--;
            else break;
        }

        while (stage < d.stageCount) {
            const thresholdCfgW = this._stageThresholdModel(d, stage, 'onAboveW', currentStage, measuredW, stage + 1);
            const nextPowerW = this._sumStagePowerModel(d, stage + 1, currentStage, measuredW);
            // Use the lower of the explicit threshold and the learned real cumulative power.
            // This lets PV-Auto follow the real hardware when the default/configured stage
            // power is too high, without breaking installers that intentionally entered
            // higher thresholds for hysteresis.
            const onAboveW = Math.max(0, Math.min(thresholdCfgW, nextPowerW || thresholdCfgW));
            if (budgetW >= onAboveW) stage++;
            else break;
        }

        return Math.max(0, Math.min(stage, d.stageCount));
    }

    _limitBudgetStageStepUp(d, desiredStage, observedStage, now) {
        const cfg = this._getBudgetGateCfg();
        const st = this._ensureStageCtlState(d.id, observedStage);
        const base = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let target = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        if (target <= base) return target;

        const nextPhysical = this._nextPhysicalStageAbove(d, base);
        if (nextPhysical > base) target = Math.min(target, nextPhysical);
        const waitMs = Math.max(0, Math.round(num(cfg.stageUpDelaySec, 10) * 1000));
        const lastUp = Math.max(num(st.budgetLastStepUpMs, 0), num(st.lastIncreaseMs, 0));
        if (waitMs > 0 && lastUp > 0 && (now - lastUp) < waitMs) return base;

        st.budgetLastStepUpMs = now;
        this._stageCtl.set(d.id, st);
        return target;
    }

    _applyTiming(d, desiredStage, observedStage) {
        const st = this._ensureStageCtlState(d.id, observedStage);
        const now = nowMs();
        const gateCfg = this._getBudgetGateCfg();
        const minOnMs = Math.max(
            Math.max(0, Math.round(num(d.minOnSec, 0) * 1000)),
            Math.max(0, Math.round(num(gateCfg.minStageRunSec, 0) * 1000))
        );
        const minOffMsBase = Math.max(0, Math.round(num(d.minOffSec, 0) * 1000));
        let currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage) || 0), d.stageCount));

        if (desiredStage > currentStage) {
            const cooldownMs = currentStage <= 0
                ? Math.max(minOffMsBase, Math.max(0, Math.round(num(gateCfg.cooldownAfterOffSec, 0) * 1000)))
                : minOffMsBase;
            if (cooldownMs > 0 && st.lastDecreaseMs > 0 && (now - st.lastDecreaseMs) < cooldownMs) {
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

    _applyBudgetFollowerStageStrategy(d, desiredStage, observedStage, pvBase, budgetProtection, now, pvAutomationAllowedByMin = true) {
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let targetStage = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        let reason = 'budget_follow';

        const hardOff = !!(budgetProtection && budgetProtection.hardOff);
        const reduceNow = !!(budgetProtection && budgetProtection.reduceNow);
        const watchActive = !!(budgetProtection && budgetProtection.watchActive);

        if (hardOff || reduceNow) {
            const reduceBase = Math.max(currentStage, observedStage, targetStage);
            targetStage = hardOff ? 0 : this._previousPhysicalStageBelow(d, reduceBase);
            st.lastDecreaseMs = now;
            st.targetStage = targetStage;
            this._stageCtl.set(d.id, st);
            reason = hardOff ? 'hard_protect' : String((budgetProtection && budgetProtection.reason) || 'protect_reduce');
            return { targetStage, reduceNow: true, hardOff, reason };
        }

        // PV minimum is a start/step-up gate, not a nervous OFF command. Once PV-Auto
        // owns a stage, NVP import and storage-discharge gates decide when it must go down.
        if (!pvAutomationAllowedByMin && targetStage > currentStage) {
            targetStage = currentStage;
            reason = 'pv_min_hold_no_step_up';
        }

        // During small grid/storage oscillations we hold the current physical stage.
        // The configured hold timers in _updateBudgetGateProtection decide later
        // whether a real down-step is necessary.
        if (watchActive && targetStage > currentStage) {
            targetStage = currentStage;
            reason = String((budgetProtection && budgetProtection.reason) || 'gate_watch');
        }
        if (targetStage < currentStage) {
            targetStage = currentStage;
            reason = watchActive ? 'hold_while_gate_watch' : 'hold_budget_hysteresis';
        }

        if (targetStage > currentStage) {
            targetStage = this._limitBudgetStageStepUp(d, targetStage, observedStage, now);
            if (targetStage > currentStage) reason = 'step_up_budget_ok';
            else reason = 'step_up_wait';
        }

        return { targetStage, reduceNow: false, hardOff: false, reason };
    }

    _applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroInfo, now, measuredW = null) {
        const info = zeroInfo || this._computeZeroExportInfo(pvBase);
        const cfg = (info && info.cfg) ? info.cfg : this._getZeroExportCfg();
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let targetStage = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        let reason = (info && info.reason) ? String(info.reason) : 'zero_export';
        const pvNowW = Math.max(0, Math.round(num(info && info.pvNowW, 0)));
        let reduceNow = false;
        let hardOff = false;

        const importActive = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.gridImportTripW);
        const dischargeActive = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.storageDischargeToleranceW);
        const hardImport = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.hardGridImportW);
        const hardDischarge = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.hardStorageDischargeW);

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
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.zeroProbe = null;
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
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        // Speicher-Vorrang darf nur die zusätzliche 0-Einspeise-Testlast sperren.
        // Normaler, am Netzpunkt/Speicherladung rekonstruierter PV-Überschuss darf weiter genutzt
        // werden. Deshalb reduzieren wir hier nur, wenn aus der normalen PV-Bilanz kein Ziel mehr
        // übrig ist (targetStage <= 0), aber noch eine physische Stufe läuft.
        if (info && info.active && info.storageReady === false && targetStage <= 0 && Math.max(currentStage, observedStage) > 0) {
            const reduceBase = Math.max(currentStage, observedStage);
            targetStage = Math.min(targetStage, this._previousPhysicalStageBelow(d, reduceBase));
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.zeroProbe = null;
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
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        const probe = (st.zeroProbe && typeof st.zeroProbe === 'object') ? st.zeroProbe : null;
        if (probe) {
            const probeStage = Math.max(0, Math.min(Math.round(Number(probe.stage) || 0), d.stageCount));
            const probeStillOn = probeStage > 0 && Math.max(currentStage, observedStage, targetStage) >= probeStage;
            if (!probeStillOn) {
                st.zeroProbe = null;
            } else {
                const observeMs = Math.max(0, Math.round(num(cfg.probeObserveSec, 45) * 1000));
                const startMs = Math.max(0, Math.round(num(probe.startMs, now)));
                const elapsedMs = Math.max(0, now - startMs);
                if (observeMs > 0 && elapsedMs < observeMs) {
                    targetStage = Math.max(targetStage, probeStage);
                    st.targetStage = targetStage;
                    reason = 'probe_observing_pv_rise';
                    this._stageCtl.set(d.id, st);
                    return {
                        targetStage: st.targetStage,
                        reduceNow: false,
                        hardOff: false,
                        reason,
                        importHoldMs,
                        dischargeHoldMs,
                        nextAllowedAt: startMs + observeMs,
                    };
                }

                const riseW = Math.max(0, pvNowW - Math.max(0, Math.round(num(probe.basePvW, 0))));
                const addedPowerW = Math.max(0, Math.round(num(probe.addedPowerW, 0)));
                const needRiseW = Math.max(
                    Math.max(0, Math.round(num(cfg.probeMinPvRiseW, 150))),
                    Math.round(addedPowerW * Math.max(0, num(cfg.probeMinPvRisePct, 20)) / 100)
                );

                if (riseW + 1 < needRiseW) {
                    const reduceBase = Math.max(currentStage, observedStage, targetStage, probeStage);
                    targetStage = this._previousPhysicalStageBelow(d, reduceBase);
                    st.zeroCooldownUntilMs = now + Math.max(0, cfg.probeRetrySec * 1000);
                    st.zeroLastStepDownMs = now;
                    st.lastDecreaseMs = now;
                    st.zeroProbe = null;
                    st.targetStage = targetStage;
                    reason = `probe_pv_rise_failed_${riseW}of${needRiseW}W`;
                    this._stageCtl.set(d.id, st);
                    return {
                        targetStage,
                        reduceNow: true,
                        hardOff: false,
                        reason,
                        importHoldMs,
                        dischargeHoldMs,
                        nextAllowedAt: st.zeroCooldownUntilMs || 0,
                    };
                }

                st.zeroProbe = null;
                reason = `probe_pv_rise_ok_${riseW}of${needRiseW}W`;
            }
        }

        const cooldownActive = !!(st.zeroCooldownUntilMs && now < st.zeroCooldownUntilMs);
        const canProbe = !!(info && info.active && info.canProbe && !cooldownActive);

        if (canProbe) {
            const baseStage = Math.max(currentStage, observedStage, targetStage);
            const nextStage = this._nextPhysicalStageAbove(d, baseStage);
            const lastUp = Math.max(num(st.zeroLastStepUpMs, 0), num(st.lastIncreaseMs, 0));
            const stepWaitMs = Math.max(0, cfg.stepUpDelaySec * 1000);
            const mayStep = nextStage > baseStage && (!lastUp || (now - lastUp) >= stepWaitMs);
            if (mayStep) {
                const basePowerW = this._sumStagePowerModel(d, baseStage, observedStage, measuredW);
                const nextPowerW = this._sumStagePowerModel(d, nextStage, observedStage, measuredW);
                targetStage = Math.max(targetStage, nextStage);
                st.zeroLastStepUpMs = now;
                st.zeroProbe = {
                    stage: nextStage,
                    baseStage,
                    basePvW: pvNowW,
                    addedPowerW: Math.max(0, nextPowerW - basePowerW),
                    startMs: now,
                };
                reason = 'probe_step_up';
            } else {
                reason = (nextStage <= baseStage) ? 'max_physical_stage' : 'waiting_step_up_delay';
            }
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
            nextAllowedAt: st.zeroCooldownUntilMs || 0,
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

    _markAutoOwnership(d, owned, targetStage = 0, source = '') {
        if (!d || !d.id) return null;
        const st = this._stageCtl.get(d.id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
        const stage = Math.max(0, Math.round(Number(targetStage) || 0));
        const now = nowMs();
        st.autoOwned = !!(owned && stage > 0);
        st.autoOwnedStage = st.autoOwned ? stage : 0;
        st.autoOwnedSource = st.autoOwned ? String(source || 'pvAuto') : '';
        st.autoLastWriteMs = now;
        if (st.autoOwned && !st.autoOwnedSinceMs) st.autoOwnedSinceMs = now;
        if (!st.autoOwned) st.autoOwnedSinceMs = 0;
        this._stageCtl.set(d.id, st);
        return st;
    }

    _getAutoOwnership(d, observedStage = 0, measuredW = null, feedback = null) {
        const st = (d && d.id && this._stageCtl && this._stageCtl.get) ? (this._stageCtl.get(d.id) || {}) : {};
        const target = Math.max(0, Math.round(Number(st.targetStage) || 0));
        const obs = Math.max(0, Math.round(Number(observedStage) || 0));
        const measured = (typeof measuredW === 'number' && Number.isFinite(measuredW)) ? Math.max(0, measuredW) : 0;
        const applied = Math.max(0, Number(feedback && feedback.appliedPowerW) || 0);
        const loadPresent = obs > 0 || measured > 50 || applied > 50;
        const autoOwned = !!(st.autoOwned && target > 0 && loadPresent);
        const externalManual = !!(loadPresent && (!autoOwned || (obs > 0 && target > 0 && obs > target)));
        return { st, target, observedStage: obs, loadPresent, autoOwned, externalManual };
    }

    async _readOwnStateValue(id, fallback = null) {
        try {
            const st = await this.adapter.getStateAsync(String(id));
            if (!st || st.val === null || st.val === undefined) return fallback;
            return st.val;
        } catch (_e) {
            return fallback;
        }
    }

    async _restoreAutoOwnershipIfLikely(d, pvAutomationActive, observedStage = 0, measuredW = null, feedback = null) {
        if (!d || !d.id || !pvAutomationActive) return false;
        const own = this._getAutoOwnership(d, observedStage, measuredW, feedback);
        if (own.autoOwned) return true;
        if (!own.loadPresent || own.observedStage <= 0) return false;

        // After adapter restart/update the in-memory ownership is empty, although
        // the KNX/relay stage may still be the EMS PV-Auto stage from before.
        // Restore only with strong evidence from persisted own states. Manual/external
        // KNX switching remains protected and is never adopted just because Auto(PV) is selected.
        const prefix = `heatingRod.devices.${d.id}`;
        const lastTargetRaw = await this._readOwnStateValue(`${prefix}.targetStage`, null);
        const lastStatus = String(await this._readOwnStateValue(`${prefix}.status`, '') || '').toLowerCase();
        const lastOverride = String(await this._readOwnStateValue(`${prefix}.override`, '') || '').toLowerCase();
        const lastTarget = Math.max(0, Math.round(Number(lastTargetRaw) || 0));

        const manualEvidence = /^manual/.test(lastStatus)
            || lastStatus.includes('external_manual')
            || lastStatus.includes('manual_allowed')
            || lastStatus.includes('manual_cfg')
            || lastStatus.startsWith('off_')
            || lastOverride.includes('manual');
        if (manualEvidence) return false;

        const autoEvidence = lastStatus.includes('pv_auto')
            || lastStatus.includes('budget')
            || lastStatus.includes('step_up')
            || lastStatus.includes('gate_')
            || lastStatus.includes('zero_')
            || lastStatus.includes('storage_protect')
            || lastStatus.includes('pv_only_protect')
            || lastOverride === 'boost';
        if (!autoEvidence || lastTarget <= 0) return false;
        if (own.observedStage > lastTarget) return false;

        this._setStageCtlTarget(d.id, lastTarget, own.observedStage);
        this._markAutoOwnership(d, true, lastTarget, 'pvAuto_restore');
        return true;
    }

    async _observeManualExternal(d, observedStage, measuredW, feedback, status = 'external_manual_knx_observed') {
        const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
            ? Math.max(0, measuredW)
            : Math.max(0, feedback && feedback.appliedPowerW ? feedback.appliedPowerW : 0);
        this._setStageCtlTarget(d.id, observedStage, observedStage);
        this._markAutoOwnership(d, false, observedStage, 'external_manual');
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, status);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_external');
        return Math.round(usedW);
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

        const staleTimeoutSec = clamp(num(this._getCfg().staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        const preFeedbackById = new Map();
        let currentHeatingRodW = 0;
        let currentAutoHeatingRodW = 0;
        try {
            for (const d of this._devices) {
                const measuredW = this._readMeasuredW(d, staleMs);
                const feedback = this._readStageFeedback(d, staleMs);
                const observedStagePre = feedback && feedback.anyKnown ? feedback.currentStage : (this._stageCtl.get(d.id)?.targetStage || 0);
                let usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback && feedback.appliedPowerW ? feedback.appliedPowerW : 0);
                const own = this._getAutoOwnership(d, observedStagePre, measuredW, feedback);
                if (own.autoOwned && usedW <= 50) {
                    usedW = this._sumStagePowerModel(d, Math.max(0, own.target || observedStagePre), observedStagePre, measuredW);
                }
                currentHeatingRodW += usedW;
                if (own.autoOwned) currentAutoHeatingRodW += usedW;
                preFeedbackById.set(d.id, { measuredW, feedback });
            }
        } catch (_e) {
            currentHeatingRodW = 0;
            currentAutoHeatingRodW = 0;
        }

        // Only add EMS/PV-Auto-owned heating-rod load back into the NVP budget.
        // A KNX/manual stage is an ordinary house load and must not inflate the
        // automatic step-up budget.
        const pvBase = this._computeBasePvAvailableW(currentAutoHeatingRodW);
        const budgetProtection = this._updateBudgetGateProtection(pvBase, now);
        const zeroExportInfo = this._computeZeroExportInfo(pvBase);
        const minPvAutomationW = this._getPvAutomationMinW();
        const pvNowForAutomationW = this._readPvNowW(staleMs);
        const pvAutomationAllowedByMin = minPvAutomationW <= 0 || pvNowForAutomationW >= minPvAutomationW;
        const thermalUsedW = Math.max(0, num(this.adapter && this.adapter._thermalBudgetUsedW, 0));
        // Wenn pvBase aus der zentralen EMS-Budget-Schicht kommt, ist Thermik mit
        // Priorität 200 dort bereits abgezogen. Dann darf Heizstab Thermik NICHT
        // noch einmal abziehen, sonst startet/steigt PV-Auto trotz freiem Gate nicht.
        const pvBudgetFromCentral = !!(pvBase && pvBase.pvBudgetFromCentral);
        const thermalDeductedW = pvBudgetFromCentral ? 0 : thermalUsedW;
        let remainingW = Math.max(0, num(pvBase.availableW, 0) - thermalDeductedW);
        let appliedTotalW = 0;
        // budgetUsedW is intentionally only EMS/PV-Auto-owned heating-rod load.
        // Extern/manual KNX heat is ordinary house load and must not be reserved again
        // in ems.budget, otherwise the central PV budget is double-counted.
        let budgetUsedW = 0;

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
            const measuredW = (typeof pre.measuredW === 'number' && Number.isFinite(pre.measuredW)) ? pre.measuredW : this._readMeasuredW(d, staleMs);
            if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.measuredW`, Math.round(measuredW));
            }

            const feedback = pre.feedback || this._readStageFeedback(d, staleMs);
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
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
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
                this._markAutoOwnership(d, effectiveTargetStage > 0, effectiveTargetStage, 'boost');
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
                this._markAutoOwnership(d, false, effectiveTargetStage, 'manual_mode');
                const targetW = this._sumStagePower(d, effectiveTargetStage);
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : targetW;
                const level = Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)));

                appliedTotalW += Math.round(targetW);
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
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markAutoOwnership(d, false, observedStage, 'manual_allowed');
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
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markAutoOwnership(d, false, observedStage, 'manual_cfg');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'manual_cfg');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (baseMode === 'off') {
                const res = await this._applyStageState(d, 0, feedback, { force: true });
                this._setStageCtlTarget(d.id, 0, observedStage);
                this._markAutoOwnership(d, false, 0, 'off');
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
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
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markAutoOwnership(d, false, observedStage, 'manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'pv_auto_disabled_manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_allowed');
                continue;
            }

            // Global PV-Auto minimum: this is now only a start/step-up gate.
            // It must not be a hard OFF, because small cloud/PV transients would otherwise
            // kill a stable stage and external KNX/manual switching would feel broken.
            const pvMinBlocksStepUp = !!(pvAutomationActive && !pvBase.tariffGridImportPreferred && !pvAutomationAllowedByMin);

            if (d.wiredStages < 1) {
                const usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW);
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'no_stage_write_dp');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (pvAutomationActive) {
                await this._restoreAutoOwnershipIfLikely(d, pvAutomationActive, observedStage, measuredW, feedback);
            }
            const ownNow = this._getAutoOwnership(d, observedStage, measuredW, feedback);
            if (pvAutomationActive && ownNow.externalManual) {
                const usedW = await this._observeManualExternal(d, observedStage, measuredW, feedback, 'external_manual_knx_observed');
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += usedW;
                continue;
            }

            let desiredStage = this._computeDesiredStage(d, remainingW, observedStage, measuredW);
            let zeroDecision = null;
            let budgetDecision = this._applyBudgetFollowerStageStrategy(d, desiredStage, observedStage, pvBase, budgetProtection, now, !pvMinBlocksStepUp);
            desiredStage = Math.max(0, Math.min(num(budgetDecision.targetStage, desiredStage), d.stageCount));
            // 0-/Minus-Einspeiseanlagen verstecken PV-Überschuss am Netzpunkt, weil der
            // Wechselrichter/FEMS die PV abregelt. In diesem Sondermodus darf PV-Auto vorsichtig
            // eine physische Heizstab-Stufe als Testlast zuschalten, wenn Forecast, PV-Leistung,
            // Speicher-SOC und Einspeiselimit zusammenpassen. Danach entscheidet der Netzpunkt:
            // Netzbezug oder Speicherentladung -> schnell reduzieren; stabil PV -> halten/weiter prüfen.
            if (zeroExportInfo.active) {
                zeroDecision = this._applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroExportInfo, now, measuredW);
                desiredStage = Math.max(0, Math.min(num(zeroDecision.targetStage, desiredStage), d.stageCount));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroDecision.reason || zeroExportInfo.reason || ''));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num(zeroDecision.nextAllowedAt, 0)));
            }

            // Reiner PV-Betrieb: bei Netzbezug oder Speicherentladung keine Stufe halten
            // oder neu zuschalten. Bei aktivem 0-Einspeise-Sondermodus werden kurze Transienten
            // nicht sofort gekillt, sondern erst nach den konfigurierten Schutzzeiten.
            let forceNonPvDown = !!((budgetDecision && budgetDecision.reduceNow) || (budgetProtection && budgetProtection.reduceNow));
            if (zeroExportInfo.active) forceNonPvDown = !!(forceNonPvDown || (zeroDecision && zeroDecision.reduceNow));
            if (forceNonPvDown) {
                // Reduce to the next lower *physical* actuator set. This is important for
                // installations that accidentally map several virtual stages to the same KNX/relay
                // datapoint: targetStage 3 -> 2 would otherwise still keep the same actuator ON.
                const hardOff = !!((budgetProtection && budgetProtection.hardOff) || (zeroDecision && zeroDecision.hardOff));
                const lowerPhysicalStage = hardOff
                    ? 0
                    : this._previousPhysicalStageBelow(d, Math.max(observedStage, desiredStage));
                desiredStage = Math.min(desiredStage, lowerPhysicalStage);
            }

            const forceStorageProtectOff = !!(pvBase.forceOff && desiredStage <= 0 && !(zeroExportInfo.active && zeroDecision && !zeroDecision.reduceNow));
            const targetStage = forceStorageProtectOff
                ? 0
                : (forceNonPvDown ? desiredStage : this._applyTiming(d, desiredStage, observedStage));
            if (forceStorageProtectOff || forceNonPvDown) this._setStageCtlTarget(d.id, targetStage, observedStage);
            const offWouldTouchLoad = targetStage <= 0 && ((typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 50) || Math.max(0, feedback.appliedPowerW || 0) > 0 || observedStage > 0);
            const mayWriteOff = !!(ownNow.autoOwned || forceStorageProtectOff || forceNonPvDown);
            if (targetStage <= 0 && offWouldTouchLoad && !mayWriteOff) {
                const usedW = await this._observeManualExternal(d, observedStage, measuredW, feedback, 'manual_external_off_protected');
                remainingW = Math.max(0, remainingW - usedW);
                appliedTotalW += usedW;
                continue;
            }
            const forcePvWrite = !!(forceStorageProtectOff || forceNonPvDown || (targetStage <= 0 && mayWriteOff && offWouldTouchLoad));
            const res = await this._applyStageState(d, targetStage, feedback, { force: forcePvWrite });
            const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, targetStage), d.wiredStages));
            this._markAutoOwnership(d, effectiveTargetStage > 0, effectiveTargetStage, 'pvAuto');
            const targetW = this._sumStagePowerModel(d, effectiveTargetStage, observedStage, measuredW);
            const measuredUsedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                ? Math.max(0, measuredW)
                : 0;
            // For EMS-owned PV-Auto stages reserve the commanded target immediately.
            // The physical meter can lag one or more cycles behind the relay write;
            // reserving only the old measured 1 kW would let the central budget look
            // like the heater is still on stage 1 and can prevent clean follow-up
            // decisions/diagnostics while the step-up is already commanded.
            const usedW = Math.max(measuredUsedW, targetW);

            appliedTotalW += Math.round(targetW);
            budgetUsedW += Math.round(usedW);
            remainingW = Math.max(0, remainingW - usedW);

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
            const zeroSuffix = zeroDecision && zeroDecision.reason ? `_zero_${String(zeroDecision.reason)}` : '';
            const gateSuffix = budgetProtection && budgetProtection.reason && budgetProtection.reason !== 'ok' ? `_gate_${String(budgetProtection.reason)}` : '';
            const budgetSuffix = budgetDecision && budgetDecision.reason && budgetDecision.reason !== 'budget_follow' ? `_budget_${String(budgetDecision.reason)}` : '';
            const pvMinSuffix = pvMinBlocksStepUp ? `_pv_min_hold_${pvNowForAutomationW}of${minPvAutomationW}W` : '';
            const autoStatus = forceStorageProtectOff
                ? `storage_protect_${String(res.status || '')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}`
                : (forceNonPvDown ? `pv_only_protect_${String(res.status || '')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}` : `${String(res.status || 'pv_auto')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}`);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, autoStatus);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
        }

        this.adapter._heatingRodBudgetUsedW = Math.round(budgetUsedW);

        // Central EMS Budget & Gates reservation. Heizstab is normally a lower-priority PV consumer
        // after Ladepunkte/Thermik. This is diagnostics + downstream accounting only; manual KNX
        // channels remain protected by the ownership logic above.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            if (rt && typeof rt.reserve === 'function') {
                const used = Math.max(0, Math.round(budgetUsedW || 0));
                const tariffImportPreferred = !!(pvBase && pvBase.tariffGridImportPreferred);
                rt.reserve({
                    key: 'heatingRod',
                    app: 'heatingRodControl',
                    label: 'Heizstab',
                    priority: 300,
                    requestedW: used,
                    reserveW: used,
                    pvReserveW: tariffImportPreferred ? 0 : used,
                    actualW: Math.max(0, Math.round(currentHeatingRodW || appliedTotalW || used || 0)),
                    pvOnly: !tariffImportPreferred,
                    mode: tariffImportPreferred ? 'tariffNegative' : 'pvAuto',
                });
            }
        } catch (_e) {
            // budget diagnostics only
        }

        await this._setStateIfChanged('heatingRod.summary.pvCapW', Math.round(num(pvBase.pvCapW, 0)));
        await this._setStateIfChanged('heatingRod.summary.evcsUsedW', Math.round(num(pvBase.evcsUsedW, 0)));
        await this._setStateIfChanged('heatingRod.summary.thermalUsedW', Math.round(thermalUsedW));
        await this._setStateIfChanged('heatingRod.summary.currentHeatingRodW', Math.round(currentHeatingRodW));
        await this._setStateIfChanged('heatingRod.summary.storageReserveW', Math.round(num(pvBase.storageReserveW, 0)));
        await this._setStateIfChanged('heatingRod.summary.storageChargeW', Math.round(num(pvBase.storageChargeW, 0)));
        await this._setStateIfChanged('heatingRod.summary.storageDischargeW', Math.round(num(pvBase.storageDischargeW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableRawW', Math.round(num(pvBase.availableW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableW', Math.round(Math.max(0, num(pvBase.availableW, 0) - thermalDeductedW)));
        await this._setStateIfChanged('heatingRod.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('heatingRod.summary.budgetUsedW', Math.round(budgetUsedW));
        await this._setStateIfChanged('heatingRod.summary.budgetGateTotalW', pvBase.budgetGateTotalW === null ? 0 : Math.round(num(pvBase.budgetGateTotalW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGateRemainingW', pvBase.budgetGateRemainingW === null ? 0 : Math.round(num(pvBase.budgetGateRemainingW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGatePvW', Math.round(num(pvBase.budgetGatePvW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGateEffectiveW', Math.round(num(pvBase.budgetGateEffectiveW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGateSource', String(pvBase.budgetGateSource || pvBase.source || ''));
        await this._setStateIfChanged('heatingRod.summary.gridImportW', Math.round(num(pvBase.importW, 0)));
        await this._setStateIfChanged('heatingRod.summary.gridImportLimitW', Math.round(num(pvBase.importToleranceW, 0)));
        await this._setStateIfChanged('heatingRod.summary.gridImportExceeded', !!(budgetProtection && budgetProtection.importActive));
        await this._setStateIfChanged('heatingRod.summary.storageDischargeExceeded', !!(budgetProtection && budgetProtection.dischargeActive));
        await this._setStateIfChanged('heatingRod.summary.zeroExportActive', !!zeroExportInfo.active);
        await this._setStateIfChanged('heatingRod.summary.zeroExportCanProbe', !!zeroExportInfo.canProbe);
        await this._setStateIfChanged('heatingRod.summary.zeroExportReason', String(zeroExportInfo.reason || ''));
        await this._setStateIfChanged('heatingRod.summary.zeroExportPvNowW', Math.round(num(zeroExportInfo.pvNowW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportForecastOk', !!zeroExportInfo.forecastOk);
        await this._setStateIfChanged('heatingRod.summary.zeroExportFeedInAtLimit', !!zeroExportInfo.feedInAtLimit);
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
            currentHeatingRodW: Math.round(currentHeatingRodW),
            currentAutoHeatingRodW: Math.round(currentAutoHeatingRodW),
            storageChargeW: Math.round(num(pvBase.storageChargeW, 0)),
            storageDischargeW: Math.round(num(pvBase.storageDischargeW, 0)),
            dischargeToleranceW: Math.round(num(pvBase.dischargeToleranceW, 0)),
            storageDischargeActive: !!pvBase.storageDischargeActive,
            nonPvEnergyActive: !!pvBase.nonPvEnergyActive,
            storageSocPct: pvBase.storageSocPct,
            storageReserveW: Math.round(num(pvBase.storageReserveW, 0)),
            storageReserveMissingW: Math.round(num(pvBase.storageReserveMissingW, 0)),
            storageChargeUsableW: Math.round(num(pvBase.storageChargeUsableW, 0)),
            storageTargetSocPct: pvBase.storageTargetSocPct,
            nvpSurplusBeforeFlexW: Math.round(num(pvBase.nvpSurplusBeforeFlexW, 0)),
            usableStorageChargeForNvpW: Math.round(num(pvBase.usableStorageChargeForNvpW, 0)),
            stageUpDelaySec: Math.round(num(pvBase.stageUpDelaySec, 0)),
            nvpAvailableW: Math.round(num(pvBase.nvpAvailableW, 0)),
            cmAvailableW: Math.round(num(pvBase.cmAvailableW, 0)),
            availableW: Math.round(num(pvBase.availableW, 0)),
            thermalUsedW: Math.round(thermalUsedW),
            thermalDeductedW: Math.round(thermalDeductedW),
            pvBudgetFromCentral: !!pvBudgetFromCentral,
            forceOff: !!pvBase.forceOff,
            budgetGate: {
                useBudgetGates: !!pvBase.useBudgetGates,
                totalW: pvBase.budgetGateTotalW,
                remainingW: pvBase.budgetGateRemainingW,
                pvW: Math.round(num(pvBase.budgetGatePvW, 0)),
                effectiveW: Math.round(num(pvBase.budgetGateEffectiveW, 0)),
                source: pvBase.budgetGateSource,
                pvBudgetFromCentral: !!pvBase.pvBudgetFromCentral,
                tariffGridImportPreferred: !!pvBase.tariffGridImportPreferred,
                cmActive: pvBase.cmActive,
                cmStaleMeter: !!pvBase.cmStaleMeter,
                cmStaleBudget: !!pvBase.cmStaleBudget,
                cmPvAvailable: pvBase.cmPvAvailable,
                cmPvCapEffectiveW: Math.round(num(pvBase.cmPvCapEffectiveW, 0)),
                cmPvCapRawW: Math.round(num(pvBase.cmPvCapRawW, 0)),
                cmPvSurplusNoEvRawW: Math.round(num(pvBase.cmPvSurplusNoEvRawW, 0)),
                protection: budgetProtection || null,
            },
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
            },
        }));
        await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
        await this._setStateIfChanged('heatingRod.summary.status', (this._devices && this._devices.length) ? `ok_${pvBase.source}${!pvAutomationAllowedByMin ? '_pv_min_block' : ''}${pvBase.forceOff ? '_storage_protect' : ''}${budgetProtection && budgetProtection.reason !== 'ok' ? `_gate_${String(budgetProtection.reason)}` : ''}${zeroExportInfo.active ? `_zero_${String(zeroExportInfo.reason || 'active')}` : ''}` : 'no_devices');
    }
}

module.exports = { HeatingRodControlModule };
