'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');
const { ReasonCodes } = require('../reasons');

function toSafeIdPart(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

function floorToStep(value, step) {
    const v = Number(value);
    const s = Number(step);
    if (!Number.isFinite(v)) return value;
    if (!Number.isFinite(s) || s <= 0) return v;
    // Always round DOWN to avoid budget overshoot / limit violations
    return Math.floor(v / s) * s;
}

function rampUp(prevValue, targetValue, maxDeltaUp) {
    const t = Number(targetValue);
    const p = Number(prevValue);
    const d = Number(maxDeltaUp);
    if (!Number.isFinite(t)) return targetValue;
    if (!Number.isFinite(d) || d <= 0) return t;
    if (!Number.isFinite(p)) return t;
    if (t <= p) return t; // never limit ramp-down (safety)
    return (t > (p + d)) ? (p + d) : t;
}

function availabilityReason(enabled, online) {
    if (!enabled) return ReasonCodes.DISABLED;
    if (!online) return ReasonCodes.OFFLINE;
    return ReasonCodes.SKIPPED;
}

function normalizeChargerType(v) {
    const s = String(v || 'AC').trim().toUpperCase();
    return (s === 'DC') ? 'DC' : 'AC';
}

function normalizeControlBasis(v) {
    const s = String(v || 'auto').trim().toLowerCase();
    if (s === 'currenta' || s === 'a' || s === 'current') return 'currentA';
    if (s === 'powerw' || s === 'w' || s === 'power') return 'powerW';
    return 'auto';
}

function normalizeWallboxModeOverride(v) {
    const raw = (v === null || v === undefined) ? '' : String(v);
    const s = raw.trim().toLowerCase();
    if (!s) return 'auto';
    if (s === 'auto' || s === 'default' || s === 'global') return 'auto';

    // PV only
    if (s === 'pv' || s === 'pvsurplus' || s === 'pv_surplus' || s === 'pvonly' || s === 'pv_only') return 'pv';

    // Min + PV (allow grid for min, PV for the rest)
    if (s === 'minpv' || s === 'min_pv' || s === 'min+pv' || s === 'min_plus_pv') return 'minpv';

    // Boost (allow grid, prefer allocation)
    if (s === 'boost' || s === 'turbo') return 'boost';

    return 'auto';
}

class ChargingManagementModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._known = new Set(); // wallbox channels created
        this._knownStations = new Set(); // station channels created
        this._stationRoundRobinOffset = new Map(); // stationKey -> next offset for round-robin fairness
        this._chargingSinceMs = new Map(); // safeKey -> ms since epoch
        this._chargingLastActiveMs = new Map(); // safeKey -> ms of last detected activity
        this._chargingLastSeenMs = new Map(); // safeKey -> ms of last processing (cleanup)
        this._boostSinceMs = new Map(); // safeKey -> ms since epoch (boost start)
        this._lastCmdTargetW = new Map(); // safeKey -> last commanded target power (for ramp limiting)
        this._lastCmdTargetA = new Map(); // safeKey -> last commanded target current (for ramp limiting)
        this._lastDiagLogMs = 0; // MU6.2: rate limit diagnostics log
    }

    _isEnabled() {
        return !!this.adapter.config.enableChargingManagement;
    }

    async init() {
        if (!this._isEnabled()) return;

        await this.adapter.setObjectNotExistsAsync('chargingManagement', {
            type: 'channel',
            common: { name: 'Charging Management' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.control', {
            type: 'channel',
            common: { name: 'Control' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.stations', {
            type: 'channel',
            common: { name: 'Stations' },
            native: {},
        });

        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('chargingManagement.wallboxCount', 'Ladepunkt count', 'number', 'value');
        await mk('chargingManagement.stationCount', 'Station count', 'number', 'value');
        await mk('chargingManagement.summary.totalPowerW', 'Total power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalCurrentA', 'Total current (A)', 'number', 'value.current');
        await mk('chargingManagement.summary.onlineWallboxes', 'Online Ladepunkte', 'number', 'value');
        await mk('chargingManagement.summary.totalTargetPowerW', 'Total target power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalTargetCurrentA', 'Total target current (A)', 'number', 'value.current');
        await mk('chargingManagement.summary.lastUpdate', 'Last update', 'number', 'value.time');

        await mk('chargingManagement.control.active', 'Control active', 'boolean', 'indicator');
        await mk('chargingManagement.control.mode', 'Mode', 'string', 'text');
        await mk('chargingManagement.control.status', 'Status', 'string', 'text');
        await mk('chargingManagement.control.budgetMode', 'Budget mode', 'string', 'text');
        await mk('chargingManagement.control.budgetW', 'Budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.usedW', 'Used (W)', 'number', 'value.power');
        await mk('chargingManagement.control.remainingW', 'Remaining (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pausedByPeakShaving', 'Paused by peak shaving', 'boolean', 'indicator');
        await this.adapter.setObjectNotExistsAsync('chargingManagement.debug', {
            type: 'channel',
            common: { name: 'Debug' },
            native: {},
        });

        await mk('chargingManagement.debug.lastRun', 'Last run', 'number', 'value.time');
        await mk('chargingManagement.debug.sortedOrder', 'Sorted order (safe keys)', 'string', 'text');
        await mk('chargingManagement.debug.allocations', 'Allocations (JSON)', 'string', 'text');
    }

    async _ensureWallboxChannel(key) {
        const safe = toSafeIdPart(key);
        const ch = `chargingManagement.wallboxes.${safe}`;
        if (this._known.has(ch)) return ch;

        await this.adapter.setObjectNotExistsAsync('chargingManagement.wallboxes', {
            type: 'channel',
            common: { name: 'Ladepunkte' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: safe },
            native: {},
        });

        const mk = async (id, name, type, role, write = false, extraCommon = null) => {
            const common = Object.assign({ name, type, role, read: true, write: !!write }, extraCommon || {});
            await this.adapter.setObjectNotExistsAsync(`${ch}.${id}`, {
                type: 'state',
                common,
                native: {},
            });
        };

        await mk('name', 'Name', 'string', 'text');
        await mk('enabled', 'Enabled', 'boolean', 'indicator');
        await mk('online', 'Online', 'boolean', 'indicator');

        // Runtime, per-wallbox mode override (writable for VIS)
        // Values: auto | pv | minpv | boost
        await mk(
            'userMode',
            'User mode (auto|pv|minpv|boost)',
            'string',
            'text',
            true,
            {
                states: {
                    auto: 'auto (global)',
                    pv: 'pv surplus only',
                    minpv: 'min + pv',
                    boost: 'boost',
                },
            },
        );

        // Default value for the writable runtime state (do not overwrite user choice)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userMode`);
            if (!st || st.val === null || st.val === undefined || String(st.val).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userMode`, 'auto', true);
            }
        } catch {
            // ignore
        }
        await mk('effectiveMode', 'Effective mode', 'string', 'text');
        await mk('priority', 'Priority', 'number', 'value');
        await mk('chargerType', 'Charger type', 'string', 'text');
        await mk('controlBasis', 'Control basis', 'string', 'text');
        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('connectorNo', 'Connector no.', 'number', 'value');
        await mk('stationMaxPowerW', 'Station max power (W)', 'number', 'value.power');
        await mk('allowBoost', 'Boost allowed', 'boolean', 'indicator');
        await mk('boostActive', 'Boost active', 'boolean', 'indicator');
        await mk('boostSince', 'Boost since (ms)', 'number', 'value.time');
        await mk('boostUntil', 'Boost until (ms)', 'number', 'value.time');
        await mk('boostRemainingMin', 'Boost remaining (min)', 'number', 'value');
        await mk('boostTimeoutMin', 'Boost timeout (min) (effective)', 'number', 'value');
        await mk('phases', 'Phases', 'number', 'value');
        await mk('minPowerW', 'Min power (W)', 'number', 'value.power');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('actualPowerW', 'Actual power (W)', 'number', 'value.power');
        await mk('actualCurrentA', 'Actual current (A)', 'number', 'value.current');
        await mk('charging', 'Charging', 'boolean', 'indicator');
        await mk('chargingSince', 'Charging since (ms)', 'number', 'value.time');
        await mk('chargingRaw', 'Charging raw (threshold)', 'boolean', 'indicator');
        await mk('lastActive', 'Last active (ms)', 'number', 'value.time');
        await mk('idleMs', 'Idle since last active (ms)', 'number', 'value.time');
        await mk('allocationRank', 'Allocation rank', 'number', 'value');
        await mk('targetCurrentA', 'Target current (A)', 'number', 'value.current');
        await mk('targetPowerW', 'Target power (W)', 'number', 'value.power');
        await mk('applied', 'Applied', 'boolean', 'indicator');
        await mk('applyStatus', 'Apply status', 'string', 'text');
        await mk('reason', 'Reason', 'string', 'text');

        this._known.add(ch);
        return ch;
    }


    async _ensureStationChannel(stationKey) {
        const safe = toSafeIdPart(stationKey);
        const ch = `chargingManagement.stations.${safe}`;
        if (this._knownStations.has(ch)) return ch;

        await this.adapter.setObjectNotExistsAsync('chargingManagement.stations', {
            type: 'channel',
            common: { name: 'Stations' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: safe || String(stationKey || '') || 'station' },
            native: {},
        });

        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(`${ch}.${id}`, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('name', 'Name', 'string', 'text');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('remainingW', 'Remaining (W)', 'number', 'value.power');
        await mk('usedW', 'Used (W)', 'number', 'value.power');
        await mk('targetSumW', 'Target sum (W)', 'number', 'value.power');
        await mk('connectorCount', 'Connector count', 'number', 'value');
        await mk('boostConnectors', 'Boost connectors', 'number', 'value');
        await mk('pvLimitedConnectors', 'PV-limited connectors', 'number', 'value');
        await mk('connectors', 'Connectors (safe keys)', 'string', 'text');
        await mk('lastUpdate', 'Last update', 'number', 'value.time');

        this._knownStations.add(ch);
        return ch;
    }


    async _getPeakShavingActive() {
        try {
            const st = await this.adapter.getStateAsync('peakShaving.control.active');
            return st ? !!st.val : false;
        } catch {
            return false;
        }
    }

    async _getPeakShavingBudgetW() {
        try {
            const st = await this.adapter.getStateAsync('peakShaving.dynamic.availableForControlledW');
            const n = st ? Number(st.val) : NaN;
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /**
     * Step 2.2.1:
     * - Mixed AC/DC operation via per-wallbox chargerType + controlBasis
     * - Budget distribution in W (supports DC fast chargers up to 1000 kW and beyond)
     */
    async tick() {
        if (!this._isEnabled()) return;

        const cfg = this.adapter.config.chargingManagement || {};
        const mode = String(cfg.mode || 'off'); // off | pvSurplus | mixed (future)
        const wallboxes = Array.isArray(cfg.wallboxes) ? cfg.wallboxes : [];

        // Stationsgruppen (optional): gemeinsame Leistungsgrenze pro Station (z. B. DC‑Station mit mehreren Ladepunkten)
        const stationGroups = Array.isArray(cfg.stationGroups) ? cfg.stationGroups : [];
        /** @type {Map<string, number>} */
        const stationCapByKey = new Map();
        /** @type {Map<string, string>} */
        const stationNameByKey = new Map();
        for (const g of stationGroups) {
            if (!g) continue;
            const sk = String(g.stationKey || '').trim();
            if (!sk) continue;
            const sName = (typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : '';
            if (sName) stationNameByKey.set(sk, sName);

            // Allow config in W (maxPowerW) or kW (maxPowerKw)
            let capW = null;
            if (g.maxPowerW !== undefined && g.maxPowerW !== null && String(g.maxPowerW).trim() !== '' && Number.isFinite(Number(g.maxPowerW))) {
                capW = Number(g.maxPowerW);
            } else if (g.maxPowerKw !== undefined && g.maxPowerKw !== null && String(g.maxPowerKw).trim() !== '' && Number.isFinite(Number(g.maxPowerKw))) {
                capW = Number(g.maxPowerKw) * 1000;
            }
            capW = clamp(num(capW, null), 0, 1e12);

            if (!Number.isFinite(capW) || capW <= 0) continue;

            const prev = stationCapByKey.get(sk);
            stationCapByKey.set(sk, (typeof prev === 'number' && Number.isFinite(prev)) ? Math.min(prev, capW) : capW);
        }

        const voltageV = clamp(num(cfg.voltageV, 230), 50, 400);
        const defaultPhases = Number(cfg.defaultPhases || 3) === 1 ? 1 : 3;
        const defaultMinA = clamp(num(cfg.minCurrentA, 6), 0, 2000);
        const defaultMaxA = clamp(num(cfg.maxCurrentA, 16), 0, 2000);

        const acMinPower3pW = clamp(num(cfg.acMinPower3pW, 4200), 0, 1e12);
        const activityThresholdW = clamp(num(cfg.activityThresholdW, 200), 0, 1e12);
        const stopGraceSec = clamp(num(cfg.stopGraceSec, 30), 0, 3600);
        const sessionKeepSec = clamp(num(cfg.sessionKeepSec, 300), 0, 86400);
        const stopGraceMs = stopGraceSec * 1000;
        const sessionKeepMs = Math.max(sessionKeepSec, stopGraceSec) * 1000;
        const sessionCleanupStaleMs = Math.max(sessionKeepMs * 2, 30 * 60 * 1000); // avoid memory leaks for removed wallboxes

        // Boost timeouts (minutes). Default: DC=60 (1h), AC=300 (5h). Set to 0 to disable auto-timeout.
        const boostTimeoutMinAc = clamp(num(cfg.boostTimeoutMinAc, 300), 0, 1000000);
        const boostTimeoutMinDc = clamp(num(cfg.boostTimeoutMinDc, 60), 0, 1000000);
        // Budget selection
        const budgetMode = String(cfg.totalBudgetMode || 'unlimited'); // unlimited | static | fromPeakShaving | fromDatapoint
        const staticBudgetW = clamp(num(cfg.staticMaxChargingPowerW, 0), 0, 1e12);
        const budgetPowerId = String(cfg.budgetPowerId || '').trim();
        // Optional: provide grid power / PV surplus as explicit datapoints (avoids global Datapoints tab)
        const gridPowerId = String(cfg.gridPowerId || '').trim();
        const pvSurplusPowerId = String(cfg.pvSurplusPowerId || '').trim();
        const pauseWhenPeakShavingActive = cfg.pauseWhenPeakShavingActive !== false; // default true
        const pauseBehavior = String(cfg.pauseBehavior || 'rampDownToZero'); // rampDownToZero | followPeakBudget

        // MU6.8: stale detection (failsafe)
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleTimeoutMs = staleTimeoutSec * 1000;

        // MU6.11: ramp limiting + setpoint step (anti-flutter, but keep safety by never limiting ramp-down)
        const maxDeltaWPerTick = clamp(num(cfg.maxDeltaWPerTick, 0), 0, 1e12); // 0 = unlimited
        const maxDeltaAPerTick = clamp(num(cfg.maxDeltaAPerTick, 0), 0, 1e6); // 0 = unlimited
        const stepW = clamp(num(cfg.stepW, 0), 0, 1e12); // 0 = no stepping
        const stepA = clamp(num(cfg.stepA, 0.1), 0, 1e6); // 0 = no stepping

        if (budgetPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.budgetPowerW', objectId: budgetPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (gridPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.gridPowerW', objectId: gridPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (pvSurplusPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.pvSurplusW', objectId: pvSurplusPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }

        // Measurements and object mapping
        let totalPowerW = 0;
        let totalCurrentA = 0;
        let onlineCount = 0;

        /** @type {Array<any>} */
        const wbList = [];

        const now = Date.now();
        await this.adapter.setStateAsync('chargingManagement.debug.lastRun', now, true);
        await this.adapter.setStateAsync('chargingManagement.debug.sortedOrder', '', true);
        await this.adapter.setStateAsync('chargingManagement.debug.allocations', '[]', true);
        for (const wb of wallboxes) {
            const key = String(wb.key || '').trim();
            if (!key) continue;

            const safe = toSafeIdPart(key);
            const ch = await this._ensureWallboxChannel(key);

            // Runtime mode override (writable state, used by VIS)
            // If the runtime state is empty, initialize it ONCE from config default (userModeDefault).
            let userMode = 'auto';
            try {
                const st = await this.adapter.getStateAsync(`${ch}.userMode`);
                const cur = st ? st.val : null;
                const def = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');

                if (cur === null || cur === undefined || String(cur).trim() === '') {
                    try {
                        await this.adapter.setStateAsync(`${ch}.userMode`, def, true);
                    } catch {
                        // ignore
                    }
                    userMode = def;
                } else {
                    userMode = normalizeWallboxModeOverride(cur);
                }
            } catch {
                userMode = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');
            }

            const enabled = wb.enabled !== false;

            // Ladepunkt-Metadaten (Stationsgruppe / Connector)
            const stationKey = String(wb.stationKey || '').trim();
            const connectorNo = clamp(num(wb.connectorNo, 0), 0, 9999);
            const allowBoost = wb.allowBoost !== false;

            // Optional per-wallbox boost timeout override (minutes). 0/empty = use global default by chargerType
            const boostTimeoutMinOverride = clamp(num(wb.boostTimeoutMin, null), 0, 1000000);

            const stationMaxPowerW = (stationKey && stationCapByKey.has(stationKey))
                ? stationCapByKey.get(stationKey)
                : clamp(num(wb.stationMaxPowerW, null), 0, 1e12);
            const priority = clamp(num(wb.priority, 999), 1, 999);
            const chargerType = normalizeChargerType(wb.chargerType);
            const controlBasisCfg = normalizeControlBasis(wb.controlBasis);

            // For AC: phases/current bounds apply. For DC: phases are informational; distribution is watt-based.
            const phases = Number(wb.phases || defaultPhases) === 1 ? 1 : 3;
            let minA = clamp(num(wb.minA, defaultMinA), 0, 2000);
            const maxA = clamp(num(wb.maxA, defaultMaxA), 0, 2000);

            const minPowerWCfg = clamp(num(wb.minPowerW, null), 0, 1e12);
            const maxPowerWCfg = clamp(num(wb.maxPowerW, null), 0, 1e12);

            // datapoint IDs
            const actualPowerWId = String(wb.actualPowerWId || '').trim();
            const actualCurrentAId = String(wb.actualCurrentAId || '').trim();
            const setCurrentAId = String(wb.setCurrentAId || '').trim();
            const setPowerWId = String(wb.setPowerWId || '').trim();
            const enableId = String(wb.enableId || '').trim();
            const statusId = String(wb.statusId || '').trim();

            // phase measurement IDs (optional)
            const l1Id = String(wb.phaseL1AId || '').trim();
            const l2Id = String(wb.phaseL2AId || '').trim();
            const l3Id = String(wb.phaseL3AId || '').trim();

            // Register dp mappings
            if (this.dp) {
                if (actualPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.pW`, objectId: actualPowerWId, dataType: 'number', direction: 'in', unit: 'W' });
                if (actualCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.iA`, objectId: actualCurrentAId, dataType: 'number', direction: 'in', unit: 'A' });
                if (setCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.setA`, objectId: setCurrentAId, dataType: 'number', direction: 'out', unit: 'A', deadband: 0.1 });
                if (setPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.setW`, objectId: setPowerWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25 });
                if (enableId) await this.dp.upsert({ key: `cm.wb.${safe}.en`, objectId: enableId, dataType: 'boolean', direction: 'out' });
                if (statusId) await this.dp.upsert({ key: `cm.wb.${safe}.st`, objectId: statusId, dataType: 'mixed', direction: 'in' });

                if (l1Id) await this.dp.upsert({ key: `cm.wb.${safe}.l1A`, objectId: l1Id, dataType: 'number', direction: 'in', unit: 'A' });
                if (l2Id) await this.dp.upsert({ key: `cm.wb.${safe}.l2A`, objectId: l2Id, dataType: 'number', direction: 'in', unit: 'A' });
                if (l3Id) await this.dp.upsert({ key: `cm.wb.${safe}.l3A`, objectId: l3Id, dataType: 'number', direction: 'in', unit: 'A' });
            }

            // Read measurements (cache-based)
            const pW = (actualPowerWId && this.dp) ? this.dp.getNumber(`cm.wb.${safe}.pW`, null) : null;
            const iA = (actualCurrentAId && this.dp) ? this.dp.getNumber(`cm.wb.${safe}.iA`, null) : null;

            // Online detection: status if present, otherwise assume online when enabled
            const statusRaw = (statusId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.st`) : null;
            let online = enabled;
            if (statusId) {
                if (statusRaw === null || statusRaw === undefined) online = false;
                else if (typeof statusRaw === 'boolean') online = statusRaw;
                else if (typeof statusRaw === 'number') online = statusRaw !== 0;
                else if (typeof statusRaw === 'string') {
                    const s = statusRaw.trim().toLowerCase();
                    online = !(s === '' || s === 'offline' || s === 'false' || s === '0' || s === 'disconnected');
                } else {
                    online = true;
                }
            }

            // Charging detection (used for arrival-based stepwise allocation)
            const pWNum = (typeof pW === 'number' && Number.isFinite(pW)) ? pW : 0;
            const pWAbs = Math.abs(pWNum);
            const isChargingRaw = online && enabled && pWAbs >= activityThresholdW;
            
            // Session tracking / stickiness
            this._chargingLastSeenMs.set(safe, now);
            
            let chargingSince = 0;
            let lastActive = 0;
            const prevSince = this._chargingSinceMs.get(safe);
            if (typeof prevSince === 'number' && Number.isFinite(prevSince) && prevSince > 0) chargingSince = prevSince;
            const prevLastActive = this._chargingLastActiveMs.get(safe);
            if (typeof prevLastActive === 'number' && Number.isFinite(prevLastActive) && prevLastActive > 0) lastActive = prevLastActive;
            
            if (!enabled) {
                // Disabled by config: clear immediately
                chargingSince = 0;
                lastActive = 0;
                this._chargingSinceMs.delete(safe);
                this._chargingLastActiveMs.delete(safe);
            } else if (isChargingRaw) {
                // If we were idle longer than sessionKeepMs, start a new session
                if (!chargingSince || !lastActive || (now - lastActive) > sessionKeepMs) chargingSince = now;
                lastActive = now;
                this._chargingSinceMs.set(safe, chargingSince);
                this._chargingLastActiveMs.set(safe, lastActive);
            } else {
                // Not actively charging: keep session for a while to avoid splits on short dips
                if (chargingSince && lastActive) {
                    const idleMs = now - lastActive;
                    const offlineTooLong = (!online && idleMs > stopGraceMs);
                    if (idleMs > sessionKeepMs || offlineTooLong) {
                        chargingSince = 0;
                        lastActive = 0;
                        this._chargingSinceMs.delete(safe);
                        this._chargingLastActiveMs.delete(safe);
                    }
                } else {
                    this._chargingSinceMs.delete(safe);
                    this._chargingLastActiveMs.delete(safe);
                }
            }
            
            const isCharging = online && enabled && (isChargingRaw || (chargingSince && lastActive && (now - lastActive) <= stopGraceMs));
            const chargingSinceForState = isCharging ? chargingSince : 0;
            
            // Determine effective control basis for this device
            const hasSetA = !!setCurrentAId;
            const hasSetW = !!setPowerWId;

            let controlBasis = controlBasisCfg;
            if (controlBasis === 'currentA') {
                controlBasis = hasSetA ? 'currentA' : (hasSetW ? 'powerW' : 'auto');
            } else if (controlBasis === 'powerW') {
                controlBasis = hasSetW ? 'powerW' : (hasSetA ? 'currentA' : 'auto');
            }

            if (controlBasis === 'auto') {
                if (chargerType === 'DC') {
                    controlBasis = hasSetW ? 'powerW' : (hasSetA ? 'currentA' : 'none');
                } else {
                    controlBasis = hasSetA ? 'currentA' : (hasSetW ? 'powerW' : 'none');
                }
            }

            // Compute min/max power caps for distribution (W)
            const vFactor = voltageV * phases;

            let minPW = 0;
            let maxPW = 0;

            if (chargerType === 'DC') {
                // For DC we primarily operate in W.
                minPW = (typeof minPowerWCfg === 'number' && Number.isFinite(minPowerWCfg)) ? minPowerWCfg : 0;

                // Default DC max to 1000kW if not configured
                const DEFAULT_DC_MAX_W = 1_000_000;
                if (typeof maxPowerWCfg === 'number' && Number.isFinite(maxPowerWCfg) && maxPowerWCfg > 0) {
                    maxPW = maxPowerWCfg;
                } else {
                    maxPW = DEFAULT_DC_MAX_W;
                }

                if (maxPW < minPW) minPW = maxPW;
            } else {
                // AC: if controlling by power, allow explicit min/max power, else derive from min/max current
                const minFromA = Math.max(0, minA) * vFactor;
                const maxFromA = Math.max(0, maxA) * vFactor;

                if (controlBasis === 'powerW') {
                    minPW = (typeof minPowerWCfg === 'number' && Number.isFinite(minPowerWCfg) && minPowerWCfg > 0) ? minPowerWCfg : minFromA;
                    maxPW = (typeof maxPowerWCfg === 'number' && Number.isFinite(maxPowerWCfg) && maxPowerWCfg > 0) ? maxPowerWCfg : maxFromA;
                } else {
                    minPW = minFromA;
                    maxPW = maxFromA;
                }

                if (maxPW < minPW) minPW = maxPW;

                if (phases === 3 && acMinPower3pW > 0) {
                    // Practical AC 3-phase minimum: avoid 3p chargers dropping below ~4.2kW.
                    minPW = Math.max(minPW, acMinPower3pW);
                }

                // Quantize min power to 0.1A steps for current-based control (avoid unreachable minPW)
                if (controlBasis === 'currentA' && vFactor > 0 && minPW > 0) {
                    const minAFromMinPW = Math.ceil((minPW / vFactor) * 10) / 10;
                    if (Number.isFinite(minAFromMinPW) && minAFromMinPW > 0) {
                        minA = Math.max(minA, minAFromMinPW);
                        minPW = minAFromMinPW * vFactor;
                    }
                }

                // Note: if maxPW < minPW after enforcement, this wallbox cannot be started.
            }

            if (typeof pW === 'number') totalPowerW += pW;
            if (typeof iA === 'number') totalCurrentA += iA;
            if (online) onlineCount += 1;

            await this.adapter.setStateAsync(`${ch}.name`, String(wb.name || key), true);
            await this.adapter.setStateAsync(`${ch}.enabled`, enabled, true);
            await this.adapter.setStateAsync(`${ch}.online`, online, true);
            await this.adapter.setStateAsync(`${ch}.priority`, priority, true);
            await this.adapter.setStateAsync(`${ch}.chargerType`, chargerType, true);
            await this.adapter.setStateAsync(`${ch}.controlBasis`, controlBasis, true);
            await this.adapter.setStateAsync(`${ch}.stationKey`, stationKey || '', true);
            await this.adapter.setStateAsync(`${ch}.connectorNo`, connectorNo || 0, true);
            await this.adapter.setStateAsync(`${ch}.stationMaxPowerW`, (typeof stationMaxPowerW === 'number' && Number.isFinite(stationMaxPowerW)) ? stationMaxPowerW : 0, true);
            await this.adapter.setStateAsync(`${ch}.allowBoost`, !!allowBoost, true);
            await this.adapter.setStateAsync(`${ch}.phases`, phases, true);
            await this.adapter.setStateAsync(`${ch}.minPowerW`, minPW, true);
            await this.adapter.setStateAsync(`${ch}.maxPowerW`, maxPW, true);
            await this.adapter.setStateAsync(`${ch}.actualPowerW`, typeof pW === 'number' ? pW : 0, true);
            await this.adapter.setStateAsync(`${ch}.actualCurrentA`, typeof iA === 'number' ? iA : 0, true);

            await this.adapter.setStateAsync(`${ch}.charging`, isCharging, true);
            await this.adapter.setStateAsync(`${ch}.chargingSince`, chargingSinceForState, true);
            await this.adapter.setStateAsync(`${ch}.chargingRaw`, isChargingRaw, true);
            await this.adapter.setStateAsync(`${ch}.lastActive`, lastActive || 0, true);
            await this.adapter.setStateAsync(`${ch}.idleMs`, lastActive ? (now - lastActive) : 0, true);
            await this.adapter.setStateAsync(`${ch}.allocationRank`, 0, true);
            // userMode is writable; do NOT overwrite here. effectiveMode will be set later.
            wbList.push({
                key,
                safe,
                ch,
                name: String(wb.name || key),
                enabled,
                online,
                charging: isCharging,
                chargingSinceMs: chargingSinceForState,
                actualPowerW: pWNum,
                userMode,
                stationKey,
                connectorNo,
                stationMaxPowerW,
                allowBoost,
                boostTimeoutMinOverride,
                priority,
                chargerType,
                controlBasis,
                phases,
                voltageV,
                minA,
                maxA,
                minPW,
                maxPW,
                vFactor,
                setAKey: hasSetA ? `cm.wb.${safe}.setA` : null,
                setWKey: hasSetW ? `cm.wb.${safe}.setW` : null,
                enableKey: enableId ? `cm.wb.${safe}.en` : null,
                consumer: {
                    type: 'evcs',
                    key: safe,
                    name: String(wb.name || key),
                    controlBasis,
                    setAKey: hasSetA ? `cm.wb.${safe}.setA` : '',
                    setWKey: hasSetW ? `cm.wb.${safe}.setW` : '',
                    enableKey: enableId ? `cm.wb.${safe}.en` : '',
                },
});
        }

        await this.adapter.setStateAsync('chargingManagement.wallboxCount', wbList.length, true);
        await this.adapter.setStateAsync('chargingManagement.summary.totalPowerW', totalPowerW, true);
        await this.adapter.setStateAsync('chargingManagement.summary.totalCurrentA', totalCurrentA, true);
        await this.adapter.setStateAsync('chargingManagement.summary.onlineWallboxes', onlineCount, true);

        // Determine budget
        let budgetW = Number.POSITIVE_INFINITY;
        let effectiveBudgetMode = budgetMode;
        /** @type {any|null} */
        let budgetDebug = null;

        const getFirstDpNumber = (keys) => {
            if (!this.dp) return null;
            for (const k of keys) {
                const v = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh(k, staleTimeoutMs, null) : this.dp.getNumber(k, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
            return null;
        };

        
        /**
         * MU6.8: ioBroker state staleness helper (uses state.ts / state.lc).
         * @param {string} id
         * @param {number} maxAgeMs
         * @returns {Promise<boolean>}
         */
        const isStateStale = async (id, maxAgeMs) => {
            try {
                const st = await this.adapter.getStateAsync(id);
                const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : 0));
                if (!ts) return true;
                return (Date.now() - ts) > maxAgeMs;
            } catch {
                return true;
            }
        };


        // Tariff-derived grid charge gating (optional; provided by tarif-vis.js)
        let gridChargeAllowed = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.gridChargeAllowed')) {
            const age = this.dp.getAgeMs('cm.gridChargeAllowed');
            const fresh = (age === null || age === undefined) ? true : (age <= staleTimeoutMs);
            gridChargeAllowed = fresh ? this.dp.getBoolean('cm.gridChargeAllowed', true) : false;
        }

        // Global default PV-only behaviour (same as before)
        const pvSurplusOnlyCfg = cfg.pvSurplusOnly === true || mode === 'pvSurplus';
        const forcePvSurplusOnly = !gridChargeAllowed;

        // Determine effective per-wallbox mode (runtime override via VIS)
        // effectiveMode values:
        // - normal: budget-based, grid allowed
        // - pv: PV surplus only (no grid import intended)
        // - minpv: always try to keep minPower from grid, but any extra only from PV budget
        // - boost: like normal, but preferred in allocation order
        let anyGridAllowedActive = false;
        let anyPvLimitedActive = false;

        for (const w of wbList) {
            let override = normalizeWallboxModeOverride(w.userMode);
            const boostNotAllowed = (override === 'boost' && w.allowBoost === false);
            if (boostNotAllowed) {
                override = 'auto';
                // If boost is disabled for this chargepoint, reset runtime mode to avoid confusing UI
                try {
                    await this.adapter.setStateAsync(`${w.ch}.userMode`, 'auto', true);
                } catch {
                    // ignore
                }
            }

            // Effective boost timeout (minutes): per-wallbox override > global by charger type
            const typeDefaultMin = (String(w.chargerType || '').toUpperCase() === 'DC') ? boostTimeoutMinDc : boostTimeoutMinAc;
            const effBoostTimeoutMin = (Number.isFinite(Number(w.boostTimeoutMinOverride)) && Number(w.boostTimeoutMinOverride) > 0)
                ? Number(w.boostTimeoutMinOverride)
                : typeDefaultMin;

            // Boost runtime timer: starts when the chargepoint is actually charging in boost mode
            let boostSince = this._boostSinceMs.get(w.safe) || 0;
            let boostUntil = 0;
            let boostRemainingMin = 0;
            let boostTimedOut = false;

            if (override === 'boost') {
                const timeoutMs = (effBoostTimeoutMin > 0) ? Math.round(effBoostTimeoutMin * 60 * 1000) : 0;

                if ((!boostSince || !Number.isFinite(boostSince)) && w.charging) {
                    boostSince = now;
                }

                if (timeoutMs > 0 && boostSince && Number.isFinite(boostSince)) {
                    boostUntil = boostSince + timeoutMs;
                    boostRemainingMin = Math.max(0, Math.ceil((boostUntil - now) / 60000));

                    if (now >= boostUntil) {
                        boostTimedOut = true;
                        override = 'auto';
                        this._boostSinceMs.delete(w.safe);
                        boostSince = 0;
                        boostUntil = 0;
                        boostRemainingMin = 0;

                        // Switch off boost in runtime state (so VIS toggles back)
                        try {
                            await this.adapter.setStateAsync(`${w.ch}.userMode`, 'auto', true);
                        } catch {
                            // ignore
                        }
                    } else {
                        this._boostSinceMs.set(w.safe, boostSince);
                    }
                } else {
                    // No timeout configured (0) or not started yet
                    if (boostSince && Number.isFinite(boostSince)) this._boostSinceMs.set(w.safe, boostSince);
                }
            } else {
                // Not in boost: clear timer state
                this._boostSinceMs.delete(w.safe);
                boostSince = 0;
            }

            // Determine effective per-wallbox mode (after possible timeout/not-allowed handling)
            let eff = 'normal';

            if (override === 'boost') {
                eff = 'boost';
            } else if (override === 'pv') {
                eff = 'pv';
            } else if (override === 'minpv') {
                // Tariff gating is treated as strict: when grid charging is blocked, minpv behaves like pv.
                eff = forcePvSurplusOnly ? 'pv' : 'minpv';
            } else {
                // auto: follow global defaults
                eff = (forcePvSurplusOnly || pvSurplusOnlyCfg) ? 'pv' : 'normal';
            }

            w.effectiveMode = eff;
            w._boostTimedOut = boostTimedOut;
            w._boostNotAllowed = boostNotAllowed;
            w._boostTimeoutMinEffective = effBoostTimeoutMin;

            if (w.enabled && w.online) {
                if (eff === 'pv' || eff === 'minpv') anyPvLimitedActive = true;
                if (eff === 'boost' || eff === 'minpv' || eff === 'normal') anyGridAllowedActive = true;
            }

            // Expose effective mode + boost runtime details for VIS/debugging
            try {
                await this.adapter.setStateAsync(`${w.ch}.effectiveMode`, eff, true);
                await this.adapter.setStateAsync(`${w.ch}.boostTimeoutMin`, Number.isFinite(effBoostTimeoutMin) ? effBoostTimeoutMin : 0, true);
                await this.adapter.setStateAsync(`${w.ch}.boostActive`, eff === 'boost', true);
                await this.adapter.setStateAsync(`${w.ch}.boostSince`, boostSince || 0, true);
                await this.adapter.setStateAsync(`${w.ch}.boostUntil`, boostUntil || 0, true);
                await this.adapter.setStateAsync(`${w.ch}.boostRemainingMin`, boostRemainingMin || 0, true);
            } catch {
                // ignore
            }
        }

        // For backwards compatibility: only cap the *total* budget by PV when
        // (a) PV-only is globally active (config or tariff) AND
        // (b) no active wallbox is in a grid-allowed mode (normal/minpv/boost).
        const capTotalBudgetByPv = (pvSurplusOnlyCfg || forcePvSurplusOnly) && !anyGridAllowedActive;
        const needPvBudget = anyPvLimitedActive || capTotalBudgetByPv;

        // PV surplus / cap (used for PV-limited wallboxes; and optionally to cap total budget)
        let pvCapW = null;
        let pvSurplusW = null;
        let gridW = null;

        if (needPvBudget) {
            pvSurplusW = getFirstDpNumber(['cm.pvSurplusW']);
            gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);

            // Fallback: if no PV surplus DP, estimate from grid import/export (negative = export)
            if (typeof pvSurplusW !== 'number' || !Number.isFinite(pvSurplusW)) {
                if (typeof gridW === 'number' && Number.isFinite(gridW)) {
                    pvSurplusW = Math.max(0, -gridW);
                }
            }

            pvCapW = (typeof pvSurplusW === 'number' && Number.isFinite(pvSurplusW) && pvSurplusW > 0) ? pvSurplusW : 0;
        }
        if (budgetMode === 'engine') {
            /** @type {Array<{k:string, w:number}>} */
            const components = [];

            // Static hard cap (optional)
            if (staticBudgetW > 0) components.push({ k: 'static', w: staticBudgetW });

            // External cap (optional)
            const ext = (budgetPowerId && this.dp) ? this.dp.getNumber('cm.budgetPowerW', null) : null;
            if (typeof ext === 'number' && Number.isFinite(ext) && ext > 0) components.push({ k: 'external', w: ext });

            // Peak-shaving cap (optional)
            const peak = await this._getPeakShavingBudgetW();
            if (typeof peak === 'number' && Number.isFinite(peak) && peak > 0) components.push({ k: 'peakShaving', w: peak });

            // Tariff cap (optional via globalDatapoints mapping)
            const tariff = getFirstDpNumber(['cm.tariffBudgetW', 'cm.tariffLimitW']);
            if (typeof tariff === 'number' && Number.isFinite(tariff) && tariff > 0) components.push({ k: 'tariff', w: tariff });

            // PV-surplus cap (legacy / compatibility): only used to cap the *total* budget when required.
            if (capTotalBudgetByPv && typeof pvCapW === 'number' && Number.isFinite(pvCapW)) {
                components.push({ k: 'pvSurplus', w: pvCapW });
            }

if (components.length) {
                let min = Number.POSITIVE_INFINITY;
                for (const c of components) {
                    const w = Number(c.w);
                    if (Number.isFinite(w)) min = Math.min(min, w);
                }
                budgetW = Number.isFinite(min) ? min : Number.POSITIVE_INFINITY;

                const eps = 0.001;
                const bind = components
                    .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - budgetW) <= eps)
                    .map(c => c.k);

                effectiveBudgetMode = `engine:${bind.length ? bind.join('+') : 'unlimited'}`;
            } else {
                budgetW = Number.POSITIVE_INFINITY;
                effectiveBudgetMode = 'engine:unlimited';
            }

            budgetDebug = {
                engine: true,
                mode,
                pvSurplusOnlyCfg,
                forcePvSurplusOnly,
                gridChargeAllowed,
                capTotalBudgetByPv,
                anyPvLimitedActive,
                anyGridAllowedActive,
                pvCapW: (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : null,
                gridW: (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null,
                pvSurplusW: (typeof pvSurplusW === 'number' && Number.isFinite(pvSurplusW)) ? pvSurplusW : null,
                components,
            };
        } else if (budgetMode === 'static') {
            budgetW = staticBudgetW > 0 ? staticBudgetW : Number.POSITIVE_INFINITY;
        } else if (budgetMode === 'fromDatapoint') {
            const b = (budgetPowerId && this.dp) ? this.dp.getNumber('cm.budgetPowerW', null) : null;
            budgetW = (typeof b === 'number' && b > 0) ? b : Number.POSITIVE_INFINITY;
        } else if (budgetMode === 'fromPeakShaving') {
            const b = await this._getPeakShavingBudgetW();
            budgetW = (typeof b === 'number' && b > 0) ? b : Number.POSITIVE_INFINITY;
        } else {
            budgetW = Number.POSITIVE_INFINITY;
        }


        // Backwards compatibility: if PV-only is globally active AND no wallbox is grid-allowed,
        // enforce the PV cap for ALL budget modes.
        if (capTotalBudgetByPv && typeof pvCapW === 'number' && Number.isFinite(pvCapW)) {
            const cap = Math.max(0, pvCapW);
            const cur = (typeof budgetW === 'number' && Number.isFinite(budgetW)) ? budgetW : Number.POSITIVE_INFINITY;
            budgetW = Math.max(0, Math.min(cur, cap));

            if (!String(effectiveBudgetMode || '').includes('pvSurplus')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+pvSurplus`;
            }

            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.pvCapAppliedW = cap;
                budgetDebug.budgetAfterPvCapW = budgetW;
            }
        }

        const peakActive = await this._getPeakShavingActive();
        const pausedByPeakShaving = pauseWhenPeakShavingActive && peakActive;
        let pauseFollowPeakBudget = false;

        // MU6.8: If metering/budget inputs are stale, enforce safe targets (0) to avoid overloading the grid connection.
        let staleMeter = false;
        let staleBudget = false;

        if (!this.dp) {
            staleMeter = true; // cannot validate inputs without DP registry
        } else {
            const gridKeys = ['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW'];
            const configuredGridKeys = gridKeys.filter(k => !!this.dp.getEntry(k));

            // Grid metering is required for safe operation
            if (configuredGridKeys.length === 0) {
                staleMeter = true;
            } else {
                for (const k of configuredGridKeys) {
                    if (this.dp.isStale(k, staleTimeoutMs)) {
                        staleMeter = true;
                        break;
                    }
                }
            }

            // External budget datapoint (if used)
            if (!staleMeter && (budgetMode === 'fromDatapoint' || budgetMode === 'engine') && budgetPowerId && this.dp.getEntry('cm.budgetPowerW')) {
                staleBudget = this.dp.isStale('cm.budgetPowerW', staleTimeoutMs);
            }
        }

        // Peak-shaving-derived budget is an ioBroker state; check ts/lc (if used)
        if (!staleMeter && !staleBudget && (budgetMode === 'fromPeakShaving' || budgetMode === 'engine')) {
            const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
            // Only treat as relevant if peak shaving is active or the user explicitly uses fromPeakShaving.
            const psActive = peakActive;
            if (budgetMode === 'fromPeakShaving' || psActive) staleBudget = !!psBudgetStale;
        }

        const staleRelevant = (mode !== 'off') && (staleMeter || staleBudget);

        if (staleRelevant) {
            const reason = ReasonCodes.STALE_METER;

            await this.adapter.setStateAsync('chargingManagement.control.active', true, true);
            await this.adapter.setStateAsync('chargingManagement.control.mode', mode, true);
            await this.adapter.setStateAsync('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
            await this.adapter.setStateAsync('chargingManagement.control.pausedByPeakShaving', false, true);
            await this.adapter.setStateAsync('chargingManagement.control.status', 'failsafe_stale_meter', true);
            await this.adapter.setStateAsync('chargingManagement.control.budgetW', 0, true);
            await this.adapter.setStateAsync('chargingManagement.control.usedW', 0, true);
            await this.adapter.setStateAsync('chargingManagement.control.remainingW', 0, true);

            await this.adapter.setStateAsync('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

            /** @type {any[]} */
            const debugAlloc = [];
            let totalTargetPowerW = 0;
            let totalTargetCurrentA = 0;

            for (const w of wbList) {
                const targetW = 0;
                const targetA = 0;

                let applied = false;
                let applyStatus = 'skipped';
                /** @type {any|null} */
                let applyWrites = null;

                if (w.enabled && w.online) {
                    if (this.dp) {
                        const consumer = w.consumer || {
                            type: 'evcs',
                            key: w.safe,
                            name: w.name,
                            controlBasis: w.controlBasis,
                            setAKey: w.setAKey || '',
                            setWKey: w.setWKey || '',
                            enableKey: w.enableKey || '',
                        };

                        const res = await applySetpoint({ adapter: this.adapter, dp: this.dp }, consumer, { targetW, targetA, basis: w.controlBasis });
                        applied = !!res?.applied;
                        applyStatus = String(res?.status || (applied ? 'applied' : 'write_failed'));
                        applyWrites = res?.writes || null;
                    } else {
                        applyStatus = 'no_dp_registry';
                    }

                    await this.adapter.setStateAsync(`${w.ch}.reason`, reason, true);
                } else {
                    await this.adapter.setStateAsync(`${w.ch}.reason`, availabilityReason(!!w.enabled, !!w.online), true);
                }

                await this.adapter.setStateAsync(`${w.ch}.targetCurrentA`, 0, true);
                await this.adapter.setStateAsync(`${w.ch}.targetPowerW`, 0, true);
                await this.adapter.setStateAsync(`${w.ch}.applied`, applied, true);
                await this.adapter.setStateAsync(`${w.ch}.applyStatus`, applyStatus, true);
                if (applyWrites) {
                    try {
                        await this.adapter.setStateAsync(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                    } catch {
                        await this.adapter.setStateAsync(`${w.ch}.applyWrites`, '{}', true);
                    }
                } else {
                    await this.adapter.setStateAsync(`${w.ch}.applyWrites`, '{}', true);
                }

                debugAlloc.push({
                    safe: w.safe,
                    name: w.name,
                    charging: !!w.charging,
                    chargingSinceMs: w.chargingSinceMs || 0,
                    online: !!w.online,
                    enabled: !!w.enabled,
                    priority: w.priority,
                    controlBasis: w.controlBasis,
                    chargerType: w.chargerType,
                stationKey: w.stationKey || '',
                connectorNo: w.connectorNo || 0,
                stationMaxPowerW: (typeof w.stationMaxPowerW === 'number' && Number.isFinite(w.stationMaxPowerW)) ? w.stationMaxPowerW : null,
                stationRemainingW: (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey)) ? stationRemainingW.get(w.stationKey) : null,
                    targetW,
                    targetA,
                    applied,
                    applyStatus,
                    applyWrites,
                    reason: (w.enabled && w.online) ? reason : availabilityReason(!!w.enabled, !!w.online),
                });
            }

    
        // ---- Stations (DC multi-connector) diagnostics ----
        try {
            const stationKeys = Array.from(stationCapW.keys());
            await this.adapter.setStateAsync('chargingManagement.stationCount', stationKeys.length, true);

            for (const sk of stationKeys) {
                const ch = await this._ensureStationChannel(sk);
                const cap = stationCapW.get(sk);
                const rem = stationRemainingW.get(sk);
                const used = (typeof cap === 'number' && Number.isFinite(cap) && typeof rem === 'number' && Number.isFinite(rem))
                    ? Math.max(0, cap - rem)
                    : 0;

                const name = stationNameByKey.get(sk) || '';
                const targetSum = stationTargetSumW.get(sk) || 0;
                const cnt = stationConnectorCount.get(sk) || 0;
                const bc = stationBoostCount.get(sk) || 0;
                const pvc = stationPvLimitedCount.get(sk) || 0;
                const connsSet = stationConnectors.get(sk);
                const conns = connsSet ? Array.from(connsSet).filter(s => s).join(',') : '';

                await this.adapter.setStateAsync(`${ch}.stationKey`, sk, true);
                await this.adapter.setStateAsync(`${ch}.name`, name, true);
                await this.adapter.setStateAsync(`${ch}.maxPowerW`, (typeof cap === 'number' && Number.isFinite(cap)) ? cap : 0, true);
                await this.adapter.setStateAsync(`${ch}.remainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
                await this.adapter.setStateAsync(`${ch}.usedW`, used, true);
                await this.adapter.setStateAsync(`${ch}.targetSumW`, targetSum, true);
                await this.adapter.setStateAsync(`${ch}.connectorCount`, cnt, true);
                await this.adapter.setStateAsync(`${ch}.boostConnectors`, bc, true);
                await this.adapter.setStateAsync(`${ch}.pvLimitedConnectors`, pvc, true);
                await this.adapter.setStateAsync(`${ch}.connectors`, conns, true);
                await this.adapter.setStateAsync(`${ch}.lastUpdate`, Date.now(), true);
            }
        } catch {
            // ignore
        }

        await this.adapter.setStateAsync('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
            await this.adapter.setStateAsync('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
            await this.adapter.setStateAsync('chargingManagement.summary.lastUpdate', Date.now(), true);

            try {
                const s = JSON.stringify(debugAlloc);
                await this.adapter.setStateAsync('chargingManagement.debug.allocations', s, true);
            } catch {
                await this.adapter.setStateAsync('chargingManagement.debug.allocations', '[]', true);
            }

            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                }
            }

            return;
        }

        const controlActive = mode !== 'off';
        await this.adapter.setStateAsync('chargingManagement.control.active', controlActive, true);
        await this.adapter.setStateAsync('chargingManagement.control.mode', mode, true);
        await this.adapter.setStateAsync('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
        await this.adapter.setStateAsync('chargingManagement.control.pausedByPeakShaving', pausedByPeakShaving, true);

        if (mode === 'off') {
            await this.adapter.setStateAsync('chargingManagement.control.status', 'off', true);
            await this.adapter.setStateAsync('chargingManagement.control.budgetW', Number.isFinite(budgetW) ? budgetW : 0, true);
            await this.adapter.setStateAsync('chargingManagement.control.usedW', 0, true);
            await this.adapter.setStateAsync('chargingManagement.control.remainingW', Number.isFinite(budgetW) ? budgetW : 0, true);
            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                }
            }

            await this.adapter.setStateAsync('chargingManagement.summary.totalTargetPowerW', 0, true);
            await this.adapter.setStateAsync('chargingManagement.summary.totalTargetCurrentA', 0, true);
            await this.adapter.setStateAsync('chargingManagement.summary.lastUpdate', Date.now(), true);
            return;
        }

        if (pausedByPeakShaving) {
            const pb = (pauseBehavior === 'followPeakBudget') ? 'followPeakBudget' : 'rampDownToZero';

            if (pb === 'followPeakBudget') {
                const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
                const psBudgetRaw = await this._getPeakShavingBudgetW();
                const psBudgetW = (!psBudgetStale && typeof psBudgetRaw === 'number' && Number.isFinite(psBudgetRaw)) ? Math.max(0, psBudgetRaw) : null;

                if (psBudgetW !== null) {
                    budgetW = psBudgetW;
                    effectiveBudgetMode = 'fromPeakShaving';
                    // Ensure control state reflects the effective mode (overrides earlier value)
                    await this.adapter.setStateAsync('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                }
            }

            // Default / safe pause behavior: ramp down to 0 (do not keep last setpoints)
            if (!pauseFollowPeakBudget) {
                const reason = ReasonCodes.PAUSED_BY_PEAK_SHAVING;

                await this.adapter.setStateAsync('chargingManagement.control.active', true, true);
                await this.adapter.setStateAsync('chargingManagement.control.mode', mode, true);
                await this.adapter.setStateAsync('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                await this.adapter.setStateAsync('chargingManagement.control.pausedByPeakShaving', true, true);
                await this.adapter.setStateAsync('chargingManagement.control.status', 'paused_by_peak_shaving_ramp_down', true);
                await this.adapter.setStateAsync('chargingManagement.control.budgetW', 0, true);
                await this.adapter.setStateAsync('chargingManagement.control.usedW', 0, true);
                await this.adapter.setStateAsync('chargingManagement.control.remainingW', 0, true);

                await this.adapter.setStateAsync('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

                /** @type {any[]} */
                const debugAlloc = [];
                let totalTargetPowerW = 0;
                let totalTargetCurrentA = 0;

                for (const w of wbList) {
                    const targetW = 0;
                    const targetA = 0;

                    let applied = false;
                    let applyStatus = 'skipped';
                    /** @type {any|null} */
                    let applyWrites = null;

                    if (w.enabled && w.online) {
                        if (this.dp) {
                            const consumer = w.consumer || {
                                type: 'evcs',
                                key: w.safe,
                                name: w.name,
                                controlBasis: w.controlBasis,
                                setAKey: w.setAKey || '',
                                setWKey: w.setWKey || '',
                                enableKey: w.enableKey || '',
                            };

                            const res = await applySetpoint({ adapter: this.adapter, dp: this.dp }, consumer, { targetW, targetA, basis: w.controlBasis });
                            applied = !!res?.applied;
                            applyStatus = String(res?.status || (applied ? 'applied' : 'write_failed'));
                            applyWrites = res?.writes || null;
                        } else {
                            applyStatus = 'no_dp_registry';
                        }

                        await this.adapter.setStateAsync(`${w.ch}.reason`, reason, true);
                    } else {
                        await this.adapter.setStateAsync(`${w.ch}.reason`, availabilityReason(!!w.enabled, !!w.online), true);
                    }

                    await this.adapter.setStateAsync(`${w.ch}.targetCurrentA`, 0, true);
                    await this.adapter.setStateAsync(`${w.ch}.targetPowerW`, 0, true);
                    await this.adapter.setStateAsync(`${w.ch}.applied`, applied, true);
                    await this.adapter.setStateAsync(`${w.ch}.applyStatus`, applyStatus, true);
                    if (applyWrites) {
                        try {
                            await this.adapter.setStateAsync(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                        } catch {
                            await this.adapter.setStateAsync(`${w.ch}.applyWrites`, '{}', true);
                        }
                    } else {
                        await this.adapter.setStateAsync(`${w.ch}.applyWrites`, '{}', true);
                    }

                    debugAlloc.push({
                        safe: w.safe,
                        name: w.name,
                        charging: !!w.charging,
                        chargingSinceMs: w.chargingSinceMs || 0,
                        online: !!w.online,
                        enabled: !!w.enabled,
                        targetW,
                        targetA,
                        applied,
                        status: applyStatus,
                        reason: (w.enabled && w.online) ? reason : availabilityReason(!!w.enabled, !!w.online),
                    });

                    // totals stay 0
                    totalTargetPowerW += targetW;
                    if (Number.isFinite(targetA) && targetA > 0) totalTargetCurrentA += targetA;
                }

                try {
                    const s = JSON.stringify(debugAlloc);
                    await this.adapter.setStateAsync('chargingManagement.debug.allocations', diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
                } catch {
                    await this.adapter.setStateAsync('chargingManagement.debug.allocations', '[]', true);
                }

                // Cleanup session tracking for removed wallboxes (avoid memory leaks)
                for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                    const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                    if (!ls || (now - ls) > sessionCleanupStaleMs) {
                        this._chargingLastSeenMs.delete(safeKey);
                        this._chargingLastActiveMs.delete(safeKey);
                        this._chargingSinceMs.delete(safeKey);
                    }
                }

                await this.adapter.setStateAsync('chargingManagement.summary.totalTargetPowerW', 0, true);
                await this.adapter.setStateAsync('chargingManagement.summary.totalTargetCurrentA', 0, true);
                await this.adapter.setStateAsync('chargingManagement.summary.lastUpdate', Date.now(), true);
                return;
            }
        }

        // Priority distribution in W across mixed AC/DC chargers
        const sorted = wbList
            .filter(w => w.enabled && w.online)
            .sort((a, b) => {
                // Boosted wallboxes first (explicit user choice)
                const ab = a.effectiveMode === 'boost' ? 1 : 0;
                const bb = b.effectiveMode === 'boost' ? 1 : 0;
                if (ab !== bb) return bb - ab;

                const ac = a.charging ? 1 : 0;
                const bc = b.charging ? 1 : 0;
                if (ac !== bc) return bc - ac; // charging first

                // Earlier charging sessions first (arrival order). Non-charging get Infinity and fall back to priority.
                const as = (Number.isFinite(a.chargingSinceMs) && a.chargingSinceMs > 0) ? a.chargingSinceMs : Infinity;
                const bs = (Number.isFinite(b.chargingSinceMs) && b.chargingSinceMs > 0) ? b.chargingSinceMs : Infinity;
                if (as !== bs) return as - bs;

                const ap = Number.isFinite(a.priority) ? a.priority : 9999;
                const bp = Number.isFinite(b.priority) ? b.priority : 9999;
                if (ap !== bp) return ap - bp;

                const ask = String(a.safe || '');
                const bsk = String(b.safe || '');
                return ask.localeCompare(bsk);
            });


        // MU3.1.1 (Sprint 3.1): Optional round-robin fairness within station groups.
        // This keeps overall prioritization, but rotates the order of NON-boost connectors inside the same station
        // so that one connector does not always take the full station cap first.
        const stationAllocMode = String(cfg.stationAllocationMode || 'sequential').trim().toLowerCase();
        if (stationAllocMode === 'roundrobin' || stationAllocMode === 'round_robin' || stationAllocMode === 'rr') {
            /** @type {Map<string, number[]>} */
            const idxByStation = new Map();
            for (let i = 0; i < sorted.length; i++) {
                const w = sorted[i];
                const sk = String(w.stationKey || '').trim();
                if (!sk) continue;
                // Only for real station groups (cap > 0)
                const cap = w.stationMaxPowerW;
                if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) continue;
                // Keep boost connectors at the top: rotate only non-boost connectors.
                if (String(w.effectiveMode || '') === 'boost') continue;

                const arr = idxByStation.get(sk) || [];
                arr.push(i);
                idxByStation.set(sk, arr);
            }

            for (const [sk, positions] of idxByStation.entries()) {
                const n = positions.length;
                if (n <= 1) continue;

                const prev = this._stationRoundRobinOffset.get(sk);
                const offset = (typeof prev === 'number' && Number.isFinite(prev) ? prev : 0) % n;

                if (offset > 0) {
                    const elems = positions.map(pos => sorted[pos]);
                    const rotated = elems.slice(offset).concat(elems.slice(0, offset));
                    for (let j = 0; j < n; j++) {
                        sorted[positions[j]] = rotated[j];
                    }
                }

                this._stationRoundRobinOffset.set(sk, (offset + 1) % n);
            }
        }


        // MU3.1: expose allocation order for transparency
        for (let i = 0; i < sorted.length; i++) {
            const w = sorted[i];
            await this.adapter.setStateAsync(`${w.ch}.allocationRank`, i + 1, true);
        }
        await this.adapter.setStateAsync('chargingManagement.debug.sortedOrder', sorted.map(w => w.safe).join(','), true);


        // Stationsbudgets (gemeinsame Leistungsgrenzen je Station)
        /** @type {Map<string, number>} */
        const stationRemainingW = new Map();
        for (const w of sorted) {
            const sk = String(w.stationKey || '').trim();
            const cap = w.stationMaxPowerW;
            if (!sk) continue;
            if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) continue;
            const prev = stationRemainingW.get(sk);
            stationRemainingW.set(sk, (typeof prev === 'number' && Number.isFinite(prev)) ? Math.min(prev, cap) : cap);
        }

        // Ensure all configured station groups exist in the map (even if currently no connector is online)
        for (const [sk, cap] of stationCapByKey.entries()) {
            const prev = stationRemainingW.get(sk);
            if (typeof prev !== 'number' || !Number.isFinite(prev)) {
                stationRemainingW.set(sk, cap);
            }
        }

        // Copy initial station caps for diagnostics (stationCapW remains constant within this tick)
        /** @type {Map<string, number>} */
        const stationCapW = new Map();
        for (const [sk, cap] of stationRemainingW.entries()) {
            if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0) stationCapW.set(sk, cap);
        }

        // Station diagnostics accumulators
        /** @type {Map<string, number>} */
        const stationTargetSumW = new Map();
        /** @type {Map<string, number>} */
        const stationConnectorCount = new Map();
        /** @type {Map<string, number>} */
        const stationBoostCount = new Map();
        /** @type {Map<string, number>} */
        const stationPvLimitedCount = new Map();
        /** @type {Map<string, Set<string>>} */
        const stationConnectors = new Map();

        const debugAlloc = [];
        // MU4.1: publish budget engine inputs for transparency in debug output
        try {
            debugAlloc.push({
                type: 'budget',
                budgetW: Number.isFinite(budgetW) ? budgetW : null,
                budgetMode: effectiveBudgetMode,
                details: budgetDebug,
            });
        } catch {
            // ignore
        }

        let remainingW = budgetW;
        let usedW = 0;

        // Shared PV budget (only relevant if at least one wallbox is PV-limited)
        let pvRemainingW = (!needPvBudget || typeof pvCapW !== 'number' || !Number.isFinite(pvCapW)) ? Number.POSITIVE_INFINITY : Math.max(0, pvCapW);
        let pvUsedW = 0;

        let totalTargetPowerW = 0;
        let totalTargetCurrentA = 0;

        for (const w of sorted) {
            const effMode = String(w.effectiveMode || 'normal');
            const isPvOnly = effMode === 'pv';
            const isMinPv = effMode === 'minpv';
            const isBoost = effMode === 'boost';

            // Station diagnostics: count active connectors per station (only if station group has a cap)
            const _sk = (w.stationKey && stationCapW && stationCapW.has(w.stationKey)) ? String(w.stationKey) : '';
            if (_sk) {
                stationConnectorCount.set(_sk, (stationConnectorCount.get(_sk) || 0) + 1);
                if (isBoost) stationBoostCount.set(_sk, (stationBoostCount.get(_sk) || 0) + 1);
                if (isPvOnly || isMinPv) stationPvLimitedCount.set(_sk, (stationPvLimitedCount.get(_sk) || 0) + 1);
                const set = stationConnectors.get(_sk) || new Set();
                set.add(String(w.safe || ''));
                stationConnectors.set(_sk, set);
            }


            let targetW = 0;
            let targetA = 0;
            let reason = ReasonCodes.LIMITED_BY_BUDGET;

            // Budget view for this wallbox
            const totalAvailW = Number.isFinite(remainingW) ? Math.max(0, remainingW) : Number.POSITIVE_INFINITY;
            const pvAvailW = Number.isFinite(pvRemainingW) ? Math.max(0, pvRemainingW) : Number.POSITIVE_INFINITY;

            // Stationsgruppe (gemeinsame Leistungsgrenze pro Station)
            const stationAvailW = (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey))
                ? Math.max(0, stationRemainingW.get(w.stationKey))
                : Number.POSITIVE_INFINITY;

            const availW = isPvOnly
                ? Math.min(totalAvailW, pvAvailW, stationAvailW)
                : Math.min(totalAvailW, stationAvailW);

            // Raw target calculation
            if (w.controlBasis === 'none') {
                reason = ReasonCodes.NO_SETPOINT;
                targetW = 0;
                targetA = 0;
            } else if (isMinPv) {
                // min+pv: keep min from total budget (grid allowed), extra only from PV budget
                const maxTotal = Math.min(totalAvailW, stationAvailW, w.maxPW);
                const minBase = (w.minPW > 0) ? w.minPW : 0;

                if (!Number.isFinite(maxTotal) || maxTotal <= 0) {
                    targetW = 0;
                    reason = ReasonCodes.NO_BUDGET;
                } else if (minBase > 0 && maxTotal < minBase) {
                    targetW = 0;
                    // If there is no budget at all, call it NO_BUDGET, otherwise BELOW_MIN
                    reason = (totalAvailW <= 0) ? ReasonCodes.NO_BUDGET : ReasonCodes.BELOW_MIN;
                } else {
                    const baseW = minBase;
                    const extraCap = Math.min(pvAvailW, Math.max(0, maxTotal - baseW));
                    targetW = baseW + (Number.isFinite(extraCap) ? extraCap : 0);
                    reason = ReasonCodes.ALLOCATED;
                }
            } else if (!Number.isFinite(availW)) {
                // Unlimited for this wallbox (budget-wise)
                targetW = w.maxPW;
                reason = ReasonCodes.UNLIMITED;
            } else if (availW <= 0) {
                targetW = 0;
                // Distinguish PV constraint from total budget constraint
                reason = (isPvOnly && pvAvailW <= 0 && totalAvailW > 0) ? (ReasonCodes.NO_PV_SURPLUS || ReasonCodes.NO_BUDGET) : ReasonCodes.NO_BUDGET;
            } else if (availW >= w.minPW || w.minPW === 0) {
                targetW = Math.min(availW, w.maxPW);
                reason = ReasonCodes.ALLOCATED;
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else {
                targetW = 0;
                reason = isPvOnly ? (ReasonCodes.NO_PV_SURPLUS || ReasonCodes.BELOW_MIN) : ReasonCodes.BELOW_MIN;
            }

            // Convert to A for AC current-based control
            if (w.controlBasis === 'currentA' && w.setAKey) {
                const vFactor = w.vFactor;
                const maxA = w.maxA;
                const minA = w.minA;

                // Keep a hard W limit to avoid rounding up above our computed target (PV/budget safety)
                const hardLimitW = clamp(num(targetW, 0), 0, w.maxPW);

                let aRaw = (hardLimitW > 0 && vFactor > 0) ? (hardLimitW / vFactor) : 0;
                aRaw = clamp(aRaw, 0, maxA);

                // round DOWN to 0.1A to avoid budget overshoot
                let aRounded = Math.floor(aRaw * 10) / 10;

                // Apply minA (avoid rounding-down dropping below min)
                if (aRounded > 0 && aRounded < minA) {
                    // try rounding up to the next 0.1A step if that would satisfy minA
                    const aUp = Math.ceil(aRaw * 10) / 10;
                    if (aUp >= minA && aUp <= maxA) {
                        aRounded = aUp;
                    } else {
                        aRounded = 0;
                    }
                }

                // Clamp again to hardLimitW (avoid minA rounding up exceeding targetW)
                if (aRounded > 0 && vFactor > 0) {
                    const wRounded = aRounded * vFactor;
                    if (wRounded > hardLimitW + 0.001) {
                        const aMax = Math.floor((hardLimitW / vFactor) * 10) / 10;
                        aRounded = clamp(aMax, 0, maxA);
                    }
                }

                if (aRounded < minA) aRounded = 0;
                targetA = aRounded;
                targetW = targetA * vFactor;

                // Safety: enforce min power after quantization
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetA = 0;
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else if (w.chargerType === 'AC') {
                // purely informational for power-based AC
                const vFactor = w.vFactor;
                targetA = (targetW > 0 && vFactor > 0) ? (targetW / vFactor) : 0;
            } else {
                // DC: current is not summed
                targetA = 0;
            }

            // MU6.11: Apply stepping + ramp limiting (limit ramp-up only; never limit ramp-down for safety)
            const wbMaxDeltaW = clamp(num(w.maxDeltaWPerTick, maxDeltaWPerTick), 0, 1e12);
            const wbMaxDeltaA = clamp(num(w.maxDeltaAPerTick, maxDeltaAPerTick), 0, 1e6);
            const wbStepW = clamp(num(w.stepW, stepW), 0, 1e12);
            const wbStepA = clamp(num(w.stepA, stepA), 0, 1e6);

            let cmdW = targetW;
            let cmdA = targetA;

            const prevCmdW = this._lastCmdTargetW.get(w.safe);
            const prevCmdA = this._lastCmdTargetA.get(w.safe);

            if (w.controlBasis === 'currentA' && w.setAKey) {
                cmdA = floorToStep(cmdA, wbStepA);
                cmdA = clamp(cmdA, 0, w.maxA);
                if (cmdA > 0 && w.minA > 0 && cmdA < w.minA) cmdA = 0;

                cmdA = rampUp(prevCmdA, cmdA, wbMaxDeltaA);

                if (cmdA > 0 && w.minA > 0 && cmdA < w.minA) cmdA = 0;
                cmdW = (cmdA > 0 && w.vFactor > 0) ? (cmdA * w.vFactor) : 0;
            } else {
                cmdW = floorToStep(cmdW, wbStepW);
                if (cmdW > 0 && w.minPW > 0 && cmdW < w.minPW) cmdW = 0;

                cmdW = rampUp(prevCmdW, cmdW, wbMaxDeltaW);

                if (cmdW > 0 && w.minPW > 0 && cmdW < w.minPW) cmdW = 0;

                if (w.chargerType === 'AC') {
                    cmdA = (cmdW > 0 && w.vFactor > 0) ? (cmdW / w.vFactor) : 0;
                } else {
                    cmdA = 0;
                }
            }

            // Station diagnostics: sum commanded power per station
            if (_sk) {
                stationTargetSumW.set(_sk, (stationTargetSumW.get(_sk) || 0) + cmdW);
            }

            // Apply total budget accounting (use commanded power)
            if (Number.isFinite(remainingW)) {
                remainingW = Math.max(0, remainingW - cmdW);
                usedW += cmdW;
            }

            // Apply station cap accounting (shared between connectors of same station)
            if (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey)) {
                const prev = stationRemainingW.get(w.stationKey);
                if (typeof prev === 'number' && Number.isFinite(prev)) {
                    stationRemainingW.set(w.stationKey, Math.max(0, prev - cmdW));
                }
            }

            // Apply PV budget accounting (shared pool)
            let pvUsedThisW = 0;
            if (Number.isFinite(pvRemainingW)) {
                if (isPvOnly) {
                    pvUsedThisW = cmdW;
                } else if (isMinPv) {
                    const base = (w.minPW > 0) ? Math.min(cmdW, w.minPW) : 0;
                    pvUsedThisW = Math.max(0, cmdW - base);
                } else {
                    pvUsedThisW = 0;
                }

                pvRemainingW = Math.max(0, pvRemainingW - pvUsedThisW);
                pvUsedW += pvUsedThisW;
            }

            totalTargetPowerW += cmdW;
            if (Number.isFinite(cmdA) && cmdA > 0) totalTargetCurrentA += cmdA;

            // Writes (consumer abstraction)
            let applied = false;
            let applyStatus = 'skipped';
            /** @type {any|null} */
            let applyWrites = null;

            if (this.dp) {
                const consumer = w.consumer || {
                    type: 'evcs',
                    key: w.safe,
                    name: w.name,
                    controlBasis: w.controlBasis,
                    setAKey: w.setAKey || '',
                    setWKey: w.setWKey || '',
                    enableKey: w.enableKey || '',
                };

                const res = await applySetpoint({ adapter: this.adapter, dp: this.dp }, consumer, { targetW: cmdW, targetA: cmdA, basis: w.controlBasis });
                applied = !!res?.applied;
                applyStatus = String(res?.status || (applied ? 'applied' : 'write_failed'));
                applyWrites = res?.writes || null;
            } else {
                applyStatus = 'no_dp_registry';
            }

            // MU6.11: Remember last commanded setpoints for ramp limiting
            this._lastCmdTargetW.set(w.safe, cmdW);
            this._lastCmdTargetA.set(w.safe, cmdA);

            await this.adapter.setStateAsync(`${w.ch}.targetCurrentA`, cmdA, true);
            await this.adapter.setStateAsync(`${w.ch}.targetPowerW`, cmdW, true);
            await this.adapter.setStateAsync(`${w.ch}.applied`, applied, true);
            await this.adapter.setStateAsync(`${w.ch}.applyStatus`, applyStatus, true);
            await this.adapter.setStateAsync(`${w.ch}.reason`, reason, true);

            debugAlloc.push({
                safe: w.safe,
                name: w.name,
                effectiveMode: effMode,
                userMode: w.userMode,
                charging: !!w.charging,
                chargingSinceMs: w.chargingSinceMs || 0,
                online: !!w.online,
                enabled: !!w.enabled,
                priority: w.priority,
                controlBasis: w.controlBasis,
                chargerType: w.chargerType,
                rawTargetW: targetW,
                rawTargetA: targetA,
                targetW: cmdW,
                targetA: cmdA,
                pvUsedW: pvUsedThisW,
                pvRemainingW: Number.isFinite(pvRemainingW) ? pvRemainingW : null,
                applied,
                applyStatus,
                applyWrites,
                reason,
                boost: isBoost,
            });
        }

        // wallboxes that are disabled/offline: expose targets as 0 (no writes)
        for (const w of wbList) {
            if (w.enabled && w.online) continue;
            await this.adapter.setStateAsync(`${w.ch}.targetCurrentA`, 0, true);
            await this.adapter.setStateAsync(`${w.ch}.targetPowerW`, 0, true);
            await this.adapter.setStateAsync(`${w.ch}.applied`, false, true);
            await this.adapter.setStateAsync(`${w.ch}.applyStatus`, 'skipped', true);
            await this.adapter.setStateAsync(`${w.ch}.reason`, availabilityReason(!!w.enabled, !!w.online), true);
        }

        // MU6.1: diagnostics logging (compact, decision-leading)
        const diagCfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        const diagEnabled = !!(diagCfg && diagCfg.enabled);
        const diagLevel = (diagCfg && (diagCfg.logLevel === 'info' || diagCfg.logLevel === 'debug')) ? diagCfg.logLevel : 'debug';
        const diagMaxJsonLenNum = diagCfg ? Number(diagCfg.maxJsonLen) : NaN;
        const diagMaxJsonLen = (Number.isFinite(diagMaxJsonLenNum) && diagMaxJsonLenNum >= 1000) ? diagMaxJsonLenNum : 20000;

        if (diagEnabled) {
            const nowDiag = Date.now();
            const logIntSecNum = diagCfg ? Number(diagCfg.logIntervalSec) : NaN;
            const logIntSec = (Number.isFinite(logIntSecNum) && logIntSecNum >= 0) ? logIntSecNum : 10;
            const logIntMs = Math.round(logIntSec * 1000);
            const shouldLog = (logIntMs <= 0) || ((nowDiag - (this._lastDiagLogMs || 0)) >= logIntMs);
            if (!shouldLog) {
                // skip logging this tick
            } else {
                this._lastDiagLogMs = nowDiag;
                try {
                const order = sorted.map(w => w.safe).join('>');
                const top = debugAlloc
                    .filter(a => a && typeof a.safe === 'string')
                    .slice(0, 10)
                    .map(a => `${a.safe}:${Math.round(Number(a.targetW || 0))}W/${(Number.isFinite(Number(a.targetA)) ? Number(a.targetA).toFixed(1) : '0.0')}A(${a.reason || ''})`)
                    .join(' ');
                const msg = `[CM] mode=${mode} budgetMode=${effectiveBudgetMode} budget=${Math.round(Number(budgetW || 0))}W used=${Math.round(Number(usedW || 0))}W rem=${Math.round(Number(remainingW || 0))}W online=${onlineCount}/${wbList.length} order=${order}` + (top ? (` targets=${top}`) : '');
                const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[diagLevel] === 'function') ? this.adapter.log[diagLevel] : this.adapter.log.debug;
                fn.call(this.adapter.log, msg);
            } catch {
                // ignore
            }
            }
        }

        try {
            const s = JSON.stringify(debugAlloc);
            await this.adapter.setStateAsync('chargingManagement.debug.allocations', s.length > diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
        } catch {
            await this.adapter.setStateAsync('chargingManagement.debug.allocations', '[]', true);
        }

        await this.adapter.setStateAsync('chargingManagement.control.status', pauseFollowPeakBudget ? 'paused_follow_peak_budget' : 'ok', true);
        await this.adapter.setStateAsync('chargingManagement.control.budgetW', Number.isFinite(budgetW) ? budgetW : 0, true);
        await this.adapter.setStateAsync('chargingManagement.control.usedW', Number.isFinite(budgetW) ? usedW : totalTargetPowerW, true);
        await this.adapter.setStateAsync('chargingManagement.control.remainingW', Number.isFinite(budgetW) ? remainingW : 0, true);

            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                }
            }

        await this.adapter.setStateAsync('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
        await this.adapter.setStateAsync('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
        await this.adapter.setStateAsync('chargingManagement.summary.lastUpdate', Date.now(), true);
    }
}

module.exports = { ChargingManagementModule };