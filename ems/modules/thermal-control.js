'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');

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

function normalizeType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'power';

    // SG-Ready (2 Relais)
    if (s === 'sgready' || s === 'sg-ready' || s === 'sg_ready' || s === 'sg') return 'sgready';

    // Explicit
    if (s === 'power' || s === 'w' || s === 'powerw' || s === 'heizstab' || s === 'heatingrod' || s === 'rod') return 'power';

    // Temperature/setpoint based
    if (s === 'setpoint' || s === 'temp' || s === 'temperature' || s === 'temperaturec' || s === '°c') return 'setpoint';
    if (s === 'heatpump' || s === 'wp' || s === 'waermepumpe' || s === 'wärmepumpe') return 'setpoint';
    if (s === 'hvac' || s === 'klima' || s === 'ac' || s === 'aircondition' || s === 'air_condition') return 'setpoint';

    return 'power';
}

function normalizeProfile(raw, type) {
    const s = String(raw || '').trim().toLowerCase();
    if (type !== 'setpoint') return 'none';
    if (s === 'heating' || s === 'heat' || s === 'heizen' || s === 'warmwasser' || s === 'ww') return 'heating';
    if (s === 'cooling' || s === 'cool' || s === 'kuehlen' || s === 'kühlen') return 'cooling';
    return 'heating';
}

function defaultSetpointsForProfile(profile) {
    if (profile === 'cooling') {
        return { on: 20, off: 24, boost: 18, unit: '°C' };
    }
    // heating (default)
    return { on: 55, off: 45, boost: 60, unit: '°C' };
}

/**
 * Thermische Verbraucher (Wärmepumpe/Heizung/Klima) – PV‑Überschuss‑Regelung.
 *
 * Phase 4.4:
 * - Regeltyp pro Slot: Leistung (W) oder Setpoint (z.B. °C)
 * - Boost-Override (Zeit) + Manual-Hold nach Schnellsteuerung, damit PV-Auto nicht sofort überschreibt
 * - Für Setpoint-Geräte: Schätzleistung (W) zur PV-Budgetierung
 */
class ThermalControlModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._devices = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        /** @type {Map<string, {on:boolean, lastOnMs:number, lastOffMs:number}>} */
        this._hyst = new Map();
    }

    _isEnabled() {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableThermalControl);
    }

    _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.thermal && typeof this.adapter.config.thermal === 'object')
            ? this.adapter.config.thermal
            : {};
        return cfg;
    }

    _getManualHoldMin() {
        const cfg = this._getCfg();
        return clamp(num(cfg.manualHoldMin, 20), 0, 24 * 60);
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

    _getOverrides() {
        const a = this.adapter;
        if (!a) return {};
        if (!a._thermalOverrides || typeof a._thermalOverrides !== 'object') a._thermalOverrides = {};
        return a._thermalOverrides;
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

            const enabled = (typeof r.enabled === 'boolean') ? r.enabled : false;
            const modeRaw = String(r.mode || 'pvAuto').trim().toLowerCase();
            const mode = (modeRaw === 'manual' || modeRaw === 'off') ? modeRaw : 'pvAuto';

            const type = normalizeType(r.type || r.deviceType || r.kind);
            const profile = normalizeProfile(r.profile, type);

            const maxPowerW = clamp(num(r.maxPowerW, 2500), 0, 1e12);
            const startSurplusW = clamp(num(r.startSurplusW, 800), 0, 1e12);
            const stopSurplusW = clamp(num(r.stopSurplusW, 300), 0, 1e12);
            const minOnSec = clamp(num(r.minOnSec, 300), 0, 86400);
            const minOffSec = clamp(num(r.minOffSec, 300), 0, 86400);
            const priority = clamp(num(r.priority, 100 + slot), 1, 999);

            const slotCfg = (flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object') ? flowConsumers[slot - 1] : {};
            const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};

            const name = String(r.name || slotCfg.name || '').trim() || `Thermal ${slot}`;

            const powerId = String(dps[`consumer${slot}Power`] || '').trim();
            const switchWriteId = String(ctrl.switchWriteId || '').trim();
            const setpointWriteId = String(ctrl.setpointWriteId || '').trim();

            // Optional SG-Ready wiring (2 relays)
            const sgReadyAWriteId = String(ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim();
            const sgReadyBWriteId = String(ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim();
            const sgReadyAInvert = !!(ctrl.sgReadyAInvert || ctrl.sgReady1Invert);
            const sgReadyBInvert = !!(ctrl.sgReadyBInvert || ctrl.sgReady2Invert);

            const boostEnabled = (typeof r.boostEnabled === 'boolean') ? !!r.boostEnabled : true;
            const boostDurationMin = clamp(num(r.boostDurationMin, 30), 0, 24 * 60);

            // For setpoint devices: derive reasonable default setpoints by profile.
            const defSp = defaultSetpointsForProfile(profile);
            const autoOnSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.autoOnSetpoint)) ? Number(r.autoOnSetpoint) : defSp.on)
                : null;
            const autoOffSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.autoOffSetpoint)) ? Number(r.autoOffSetpoint) : defSp.off)
                : null;
            const boostSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.boostSetpoint)) ? Number(r.boostSetpoint) : defSp.boost)
                : null;

            // For setpoint/SG-Ready devices: power estimate used for PV budget allocation.
            const estimatedPowerW = (type === 'setpoint' || type === 'sgready')
                ? clamp(num(r.estimatedPowerW, 1500), 0, 1e12)
                : null;

            const boostPowerW = (type === 'power')
                ? clamp(num(r.boostPowerW, maxPowerW), 0, 1e12)
                : null;

            out.push({
                slot,
                id: `c${slot}`,
                name,
                enabled,
                mode,
                type,
                profile,
                maxPowerW,
                startSurplusW,
                stopSurplusW,
                minOnSec,
                minOffSec,
                priority,

                boostEnabled,
                boostDurationMin,
                boostPowerW,
                autoOnSetpoint,
                autoOffSetpoint,
                boostSetpoint,
                estimatedPowerW,

                powerId,
                switchWriteId,
                setpointWriteId,

                sgReadyAWriteId,
                sgReadyBWriteId,
                sgReadyAInvert,
                sgReadyBInvert,


                // User overrides (end customer UI)
                userEnabledKey: `th.user.c${slot}.regEnabled`,
                userModeKey: `th.user.c${slot}.mode`,

                // dp keys (filled in init)
                pWKey: '',
                enableKey: '',
                setWKey: '',

                // SG-Ready dp keys (filled in init)
                sg1Key: '',
                sg2Key: '',
            });
        }

        // deterministic order
        out.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._devices = out;
    }

    async init() {
        // Always create a stable channel tree.
        await this.adapter.setObjectNotExistsAsync('thermal', {
            type: 'channel',
            common: { name: 'Wärmepumpe & Klima' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('thermal.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        
        // Endkunde/Bedienung: persistente User-States pro Verbraucher-Slot (Regelung an/aus + Betriebsmodus).
        // Diese States werden durch die VIS (Schnellsteuerung) gesetzt und überschreiben (optional) die Installer-Konfiguration.
        await this.adapter.setObjectNotExistsAsync('thermal.user', {
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
            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}`, {
                type: 'channel',
                common: { name: `Consumer ${i}` },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}.regEnabled`, {
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

            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}.mode`, {
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
                        manual: 'Manuell',
                        off: 'Aus',
                    },
                },
                native: {},
            });

            await ensureDefault(`thermal.user.c${i}.regEnabled`, true);
            await ensureDefault(`thermal.user.c${i}.mode`, 'inherit');
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

        await mk('thermal.summary.pvCapW', 'PV cap (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.evcsUsedW', 'EVCS used (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.pvAvailableW', 'PV available for thermal (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('thermal.summary.status', 'Status', 'string', 'text');

        // Build devices & register DPs
        this._buildDevicesFromConfig();

        // Read inputs from charging management (remaining PV after EVCS)
        // Subscribe to local states (namespace.*) via dpRegistry for deterministic reads.
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'th.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'th.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
            }
        } catch (_e) {
            // ignore
        }

        
        // User overrides: local states (Regelung + Mode) werden über dpRegistry gecached, damit die Tick-Logik deterministisch bleibt.
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `th.user.c${i}.regEnabled`, objectId: `${ns}.thermal.user.c${i}.regEnabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `th.user.c${i}.mode`, objectId: `${ns}.thermal.user.c${i}.mode`, dataType: 'string', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

// Per device: create channel + register setpoints
        for (const d of this._devices) {
            await this.adapter.setObjectNotExistsAsync(`thermal.devices.${d.id}`, {
                type: 'channel',
                common: { name: d.name },
                native: {},
            });

            await mk(`thermal.devices.${d.id}.slot`, 'Slot', 'number', 'value');
            await mk(`thermal.devices.${d.id}.enabled`, 'Enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.mode`, 'Mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.userEnabled`, 'User enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.userMode`, 'User mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.effectiveEnabled`, 'Effective enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.effectiveMode`, 'Effective mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.type`, 'Type', 'string', 'text');
            await mk(`thermal.devices.${d.id}.profile`, 'Profile', 'string', 'text');

            // targetW is kept for backward compatibility; interpret via targetUnit/targetKind.
            await mk(`thermal.devices.${d.id}.targetW`, 'Target', 'number', 'value');
            await mk(`thermal.devices.${d.id}.targetUnit`, 'Target unit', 'string', 'text');
            await mk(`thermal.devices.${d.id}.targetKind`, 'Target kind', 'string', 'text');

            await mk(`thermal.devices.${d.id}.applied`, 'Applied', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.status`, 'Status', 'string', 'text');
            await mk(`thermal.devices.${d.id}.measuredW`, 'Measured (W)', 'number', 'value.power', 'W');

            // Overrides (written internally via API)
            await mk(`thermal.devices.${d.id}.boostActive`, 'Boost active', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.boostUntil`, 'Boost until (ts)', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.manualUntil`, 'Manual hold until (ts)', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.override`, 'Override', 'string', 'text');

            // DP mapping (read)
            if (this.dp && d.powerId) {
                const k = `th.${d.id}.pW`;
                await this.dp.upsert({ key: k, objectId: d.powerId, dataType: 'number', direction: 'in', unit: 'W' });
                d.pWKey = k;
            }

            // DP mapping (actuation)
            if (this.dp && d.switchWriteId) {
                const k = `th.${d.id}.en`;
                await this.dp.upsert({ key: k, objectId: d.switchWriteId, dataType: 'boolean', direction: 'out' });
                d.enableKey = k;
            }

            // Optional SG-Ready actuation (two digital outputs)
            if (this.dp && d.sgReadyAWriteId) {
                const k = `th.${d.id}.sg1`;
                await this.dp.upsert({ key: k, objectId: d.sgReadyAWriteId, dataType: 'boolean', direction: 'out' });
                d.sg1Key = k;
            }
            if (this.dp && d.sgReadyBWriteId) {
                const k = `th.${d.id}.sg2`;
                await this.dp.upsert({ key: k, objectId: d.sgReadyBWriteId, dataType: 'boolean', direction: 'out' });
                d.sg2Key = k;
            }
            if (this.dp && d.setpointWriteId) {
                const k = `th.${d.id}.set`;
                const unit = (d.type === 'setpoint') ? '°C' : 'W';
                const deadband = (d.type === 'setpoint') ? 0.2 : 25;
                await this.dp.upsert({ key: k, objectId: d.setpointWriteId, dataType: 'number', direction: 'out', unit, deadband });
                d.setWKey = k;
            }

            // init hysteresis state
            if (!this._hyst.has(d.id)) {
                this._hyst.set(d.id, { on: false, lastOnMs: 0, lastOffMs: 0 });
            }
        }
    }

    _computePvAvailableW() {
        const cfg = this._getCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        // Primary: PV cap (effective) after EVCS, provided by charging module.
        const pvCapW = this.dp ? this.dp.getNumberFresh('th.cm.pvCapW', staleMs, null) : null;
        const usedW = this.dp ? this.dp.getNumberFresh('th.cm.usedW', staleMs, null) : null;

        if (typeof pvCapW === 'number' && Number.isFinite(pvCapW) && pvCapW > 0) {
            const u = (typeof usedW === 'number' && Number.isFinite(usedW)) ? Math.max(0, usedW) : 0;
            return { pvCapW, evcsUsedW: u, availableW: Math.max(0, pvCapW - u), source: 'cm' };
        }

        // Fallback: net grid power (import + / export -)
        let gridW = this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('ps.gridPowerW', staleMs, null) : null;

        const avail = Math.max(0, -Number(gridW || 0));
        return { pvCapW: avail, evcsUsedW: 0, availableW: avail, source: 'grid' };
    }

    _hysteresisOnOff(id, desiredOn, minOnSec, minOffSec) {
        const h = this._hyst.get(id) || { on: false, lastOnMs: 0, lastOffMs: 0 };
        const now = nowMs();

        // Initialize timestamps when first used
        if (!h.lastOnMs && h.on) h.lastOnMs = now;
        if (!h.lastOffMs && !h.on) h.lastOffMs = now;

        const minOnMs = Math.max(0, Math.round(num(minOnSec, 0) * 1000));
        const minOffMs = Math.max(0, Math.round(num(minOffSec, 0) * 1000));

        let on = !!h.on;

        if (desiredOn && !on) {
            // respect minimum off time
            if (minOffMs > 0 && (now - (h.lastOffMs || 0)) < minOffMs) {
                on = false;
            } else {
                on = true;
                h.lastOnMs = now;
            }
        } else if (!desiredOn && on) {
            // respect minimum on time
            if (minOnMs > 0 && (now - (h.lastOnMs || 0)) < minOnMs) {
                on = true;
            } else {
                on = false;
                h.lastOffMs = now;
            }
        }

        h.on = on;
        this._hyst.set(id, h);
        return on;
    }

    _readOverrideForDevice(d, now) {
        const ovAll = this._getOverrides();
        const ov = (ovAll && typeof ovAll === 'object' && ovAll[d.id] && typeof ovAll[d.id] === 'object') ? ovAll[d.id] : {};

        const boostUntil = clamp(num(ov.boostUntilMs, 0), 0, 1e18);
        const manualUntil = clamp(num(ov.manualUntilMs, 0), 0, 1e18);

        const boostActive = boostUntil > 0 && now < boostUntil;
        const manualActive = manualUntil > 0 && now < manualUntil;

        return { boostActive, boostUntil, manualActive, manualUntil };
    }

    async tick() {
        if (!this._isEnabled()) return;

        const now = nowMs();

        // If §14a is active, avoid competing writes.
        try {
            const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
            if (p14a && p14a.active) {
                await this._setStateIfChanged('thermal.summary.status', 'paused_by_14a');
                await this._setStateIfChanged('thermal.summary.lastUpdate', now);
                return;
            }
        } catch (_e) {
            // ignore
        }

        const pv = this._computePvAvailableW();
        let remainingW = Math.max(0, num(pv.availableW, 0));

        let appliedTotalW = 0;
        const ctx = { dp: this.dp, adapter: this.adapter };

        for (const d of this._devices) {
            // Publish static info
            await this._setStateIfChanged(`thermal.devices.${d.id}.slot`, d.slot);
            await this._setStateIfChanged(`thermal.devices.${d.id}.enabled`, !!d.enabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.mode`, String(d.mode));

            // User overrides (VIS): enable/disable automation + override operating mode.
            // Values are cached via dpRegistry (local states under thermal.user.*).
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

            const normMode = (m) => {
                const s = String(m || '').trim().toLowerCase();
                if (!s || s === 'inherit' || s === 'system') return 'inherit';
                if (s === 'auto' || s === 'pvauto' || s === 'pv' || s === 'pva') return 'pvAuto';
                if (s === 'manual' || s === 'manuell') return 'manual';
                if (s === 'off' || s === 'aus' || s === '0') return 'off';
                return 'inherit';
            };

            userMode = normMode(userMode);

            const effectiveEnabled = !!d.enabled && !!userEnabled;
            const effectiveMode = (userMode !== 'inherit') ? userMode : String(d.mode || 'pvAuto');

            await this._setStateIfChanged(`thermal.devices.${d.id}.userEnabled`, !!userEnabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.userMode`, String(userMode));
            await this._setStateIfChanged(`thermal.devices.${d.id}.effectiveEnabled`, !!effectiveEnabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.effectiveMode`, String(effectiveMode));

            await this._setStateIfChanged(`thermal.devices.${d.id}.type`, String(d.type));
            await this._setStateIfChanged(`thermal.devices.${d.id}.profile`, String(d.profile));

            const actType = (d.type === 'sgready' || d.sg1Key || d.sg2Key) ? 'sgready' : String(d.type || 'power');
            const targetUnit = (actType === 'setpoint') ? '°C' : (actType === 'sgready' ? '—' : 'W');
            const targetKind = (actType === 'setpoint') ? 'setpoint' : (actType === 'sgready' ? 'sgready' : 'power');
            await this._setStateIfChanged(`thermal.devices.${d.id}.targetUnit`, targetUnit);
            await this._setStateIfChanged(`thermal.devices.${d.id}.targetKind`, targetKind);

            // Read measured power if mapped
            let measuredW = null;
            if (this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey)) {
                measuredW = this.dp.getNumber(d.pWKey, null);
                if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                    await this._setStateIfChanged(`thermal.devices.${d.id}.measuredW`, Math.round(measuredW));
                }
            }

            // Overrides
            const ov = this._readOverrideForDevice(d, now);
            await this._setStateIfChanged(`thermal.devices.${d.id}.boostActive`, !!ov.boostActive);
            await this._setStateIfChanged(`thermal.devices.${d.id}.boostUntil`, ov.boostUntil ? Math.round(ov.boostUntil) : 0);
            await this._setStateIfChanged(`thermal.devices.${d.id}.manualUntil`, ov.manualUntil ? Math.round(ov.manualUntil) : 0);

            // Device disabled OR automation disabled by end-customer -> no writes (but still account measured load)
            if (!effectiveEnabled) {
                // subtract measured usage from remaining budget to avoid over-allocating PV to other consumers
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
                    remainingW = Math.max(0, remainingW - Math.max(0, measuredW));
                }

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, userEnabled ? 'disabled' : 'regulation_off');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // Manual-hold (from quick control) – do not overwrite user commands
            if (ov.manualActive && !ov.boostActive) {
                // subtract measured usage from remaining budget to avoid over-allocating PV
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
                    remainingW = Math.max(0, remainingW - Math.max(0, measuredW));
                }
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'manual_hold');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'manual_hold');
                continue;
            }

            // Boost override (force on)
            if (ov.boostActive && d.boostEnabled) {
                let usedW = 0;

                if (actType === 'setpoint') {
                    const sp = (typeof d.boostSetpoint === 'number' && Number.isFinite(d.boostSetpoint))
                        ? d.boostSetpoint
                        : (typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint) ? d.autoOnSetpoint : null);

                    const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                    const res = await applySetpoint(ctx, consumer, { enable: true, setpoint: sp });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (sp !== null && sp !== undefined && Number.isFinite(Number(sp))) ? Number(sp) : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500)));
                } else if (actType === 'sgready') {
                    const consumer = {
                        type: 'sgready',
                        key: d.id,
                        name: d.name,
                        sg1Key: d.sg1Key,
                        sg2Key: d.sg2Key,
                        enableKey: d.enableKey,
                        invert1: !!d.sgReadyAInvert,
                        invert2: !!d.sgReadyBInvert,
                    };
                    const res = await applySetpoint(ctx, consumer, { state: 'boost' });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 2);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500)));
                } else {
                    const targetW = clamp(num(d.boostPowerW, d.maxPowerW), 0, num(d.maxPowerW, 0));
                    const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                    const res = await applySetpoint(ctx, consumer, { targetW });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, Math.round(targetW));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = Math.max(0, Math.round(targetW));
                }

                appliedTotalW += Math.max(0, Math.round(usedW));
                remainingW = Math.max(0, remainingW - usedW);
                continue;
            }

            // Manual mode -> no writes (but account measured load)
            if (effectiveMode === 'manual') {
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
                    remainingW = Math.max(0, remainingW - Math.max(0, measuredW));
                }
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'manual');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // Off -> actively disable/zero (if DPs exist)
            if (effectiveMode === 'off') {
                let usedW = 0;

                if (actType === 'setpoint') {
                    const sp = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;
                    const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                    const res = await applySetpoint(ctx, consumer, { enable: false, setpoint: sp });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (sp !== null && sp !== undefined && Number.isFinite(Number(sp))) ? Number(sp) : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                } else if (actType === 'sgready') {
                    const consumer = {
                        type: 'sgready',
                        key: d.id,
                        name: d.name,
                        sg1Key: d.sg1Key,
                        sg2Key: d.sg2Key,
                        enableKey: d.enableKey,
                        invert1: !!d.sgReadyAInvert,
                        invert2: !!d.sgReadyBInvert,
                    };
                    const res = await applySetpoint(ctx, consumer, { state: 'off' });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                } else {
                    const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                    const res = await applySetpoint(ctx, consumer, { targetW: 0 });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                }

                // While ramping down, we still account measured usage.
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) usedW = measuredW;
                appliedTotalW += Math.max(0, Math.round(usedW));
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // PV auto
            let usedW = 0;

            const startW = Math.max(0, num(d.startSurplusW, 0));
            const stopW = Math.max(0, num(d.stopSurplusW, 0));

            let desiredOn = false;
            if (remainingW >= startW && remainingW > 0) desiredOn = true;
            if (remainingW <= stopW) desiredOn = false;

            const on = this._hysteresisOnOff(d.id, desiredOn, d.minOnSec, d.minOffSec);

            if (actType === 'setpoint') {
                const spOn = (typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint)) ? d.autoOnSetpoint : null;
                const spOff = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;

                const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                const res = await applySetpoint(ctx, consumer, { enable: !!on, setpoint: on ? spOn : spOff });

                const targetSp = on ? spOn : spOff;
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (targetSp !== null && targetSp !== undefined && Number.isFinite(Number(targetSp))) ? Number(targetSp) : 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, String(res.status || (on ? 'on' : 'off')));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                if (on) {
                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500)));
                } else {
                    usedW = 0;
                }
            } else if (actType === 'sgready') {
                const consumer = {
                    type: 'sgready',
                    key: d.id,
                    name: d.name,
                    sg1Key: d.sg1Key,
                    sg2Key: d.sg2Key,
                    enableKey: d.enableKey,
                    invert1: !!d.sgReadyAInvert,
                    invert2: !!d.sgReadyBInvert,
                };
                const res = await applySetpoint(ctx, consumer, { state: on ? 'on' : 'off' });

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, on ? 1 : 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, String(res.status || (on ? 'on' : 'off')));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                if (on) {
                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500)));
                } else {
                    usedW = 0;
                }
            } else {
                const desiredW = on ? Math.min(remainingW, Math.max(0, num(d.maxPowerW, 0))) : 0;

                const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                const res = await applySetpoint(ctx, consumer, { targetW: desiredW });

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, Math.round(desiredW));
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, String(res.status || ''));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                usedW = Math.max(0, Math.round(desiredW));
            }

            appliedTotalW += Math.max(0, Math.round(usedW));
            remainingW = Math.max(0, remainingW - usedW);
        }

        await this._setStateIfChanged('thermal.summary.pvCapW', Math.round(num(pv.pvCapW, 0)));
        await this._setStateIfChanged('thermal.summary.evcsUsedW', Math.round(num(pv.evcsUsedW, 0)));
        await this._setStateIfChanged('thermal.summary.pvAvailableW', Math.round(num(pv.availableW, 0)));
        await this._setStateIfChanged('thermal.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('thermal.summary.lastUpdate', now);
        await this._setStateIfChanged('thermal.summary.status', (this._devices && this._devices.length) ? `ok_${pv.source}` : 'no_devices');
    }
}

module.exports = { ThermalControlModule };
