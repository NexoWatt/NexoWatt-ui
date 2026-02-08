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

function availabilityReason(cfgEnabled, userEnabled, online) {
    if (!cfgEnabled) return ReasonCodes.DISABLED;
    if (!userEnabled) return ReasonCodes.CONTROL_DISABLED;
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
        this._stationRoundRobinLastRotateMs = new Map(); // stationKey -> ms of last rotation (avoid per-tick flapping)
        this._chargingSinceMs = new Map(); // safeKey -> ms since epoch
        this._chargingLastActiveMs = new Map(); // safeKey -> ms of last detected activity
        this._chargingLastSeenMs = new Map(); // safeKey -> ms of last processing (cleanup)
        this._boostSinceMs = new Map(); // safeKey -> ms since epoch (boost start)
        // Gate B: PV hysteresis state (global, for PV-only modes)
        this._pvAvailable = false;
        this._pvAboveSinceMs = 0;
        this._pvBelowSinceMs = 0;
        // Gate C: Speicher-Unterstützung (Hysterese)
        this._storageAssistActive = false;
        // Gate T: Tarif-Freigaben (Debounce gegen Flattern)
        this._tariffGridChargeAllowed = true;
        this._tariffGridChargeAllowedTrueSinceMs = 0;
        this._tariffDischargeAllowed = true;
        this._tariffDischargeAllowedTrueSinceMs = 0;
        this._restoredRuntime = new Set(); // safeKey -> restored persisted session/boost state
        this._lastCmdTargetW = new Map(); // safeKey -> last commanded target power (for ramp limiting)
        this._lastCmdTargetA = new Map(); // safeKey -> last commanded target current (for ramp limiting)
        this._lastDiagLogMs = 0; // MU6.2: rate limit diagnostics log

        // Fast local state publisher (performance):
        // With many EVCS (e.g. 50+), awaiting hundreds of setStateAsync calls per tick can
        // easily push the tick time into seconds. We therefore de-duplicate and batch
        // local state writes and flush them asynchronously with limited concurrency.
        this._pubQueue = new Map(); // id -> {val:any, ack:boolean}
        this._pubCache = new Map(); // id -> {val:any, ts:number}
        this._pubFlushTimer = null;
        this._pubFlushInFlight = false;
        this._pubLastFlushMs = 0;
        this._pubFlushIntervalMs = 50; // do not flush more often than this

        // PV-Überschuss Glättung (5-Minuten Rolling-Mean).
        // Motivation: Bei reinem PV-Überschussladen darf der EVCS-Verbrauch den
        // PV-Überschuss nicht "wegdrücken" (sonst fällt die Regelung unter die
        // 3P-Minimalleistung ~4,2kW und stoppt). Zusätzlich glätten wir den
        // ermittelten PV-Überschuss (5min), um Wolken-/Messrauschen sauber
        // abzufangen (stabilere Regelung).
        this._pvSurplusSamples = [];
        this._pvSurplusHead = 0;
        this._pvSurplusSumW = 0;
    }

    /**
     * Default publishing options for certain "noisy" diagnostic counters.
     * @param {string} id
     * @returns {{deadband?:number,minIntervalMs?:number}}
     */
    _pubDefaults(id) {
        const s = String(id || '');
        if (!s) return {};

        // Debug payloads are large and not user-critical → slow down.
        if (s.startsWith('chargingManagement.debug.')) return { minIntervalMs: 5000 };

        // Always-changing counters → update slower to avoid DB spam.
        if (s.endsWith('.idleMs') || s.endsWith('.meterAgeMs') || s.endsWith('.statusAgeMs')) return { minIntervalMs: 5000 };

        // Reduce jitter on live power/current values (UI only, not control).
        if (s.endsWith('.actualPowerW') || s.endsWith('.targetPowerW') || s.endsWith('.stationRemainingW') || s.endsWith('.headroomW') || s.endsWith('.remainingW') || s.endsWith('.usedW') || s.endsWith('.targetSumW')) return { deadband: 5 };
        if (s.endsWith('.actualCurrentA') || s.endsWith('.targetCurrentA') || s.endsWith('.gridWorstPhaseA') || s.endsWith('.gridMaxPhaseA') || s.endsWith('.worstPhaseA')) return { deadband: 0.05 };

        return {};
    }

    /**
     * 5-Minuten Rolling-Mean für PV-Überschuss (W).
     * @param {number} nowMs
     * @param {number} sampleW
     * @returns {number} avgW
     */
    _pvSurplusAvgPush(nowMs, sampleW) {
        const v = (typeof sampleW === 'number' && Number.isFinite(sampleW)) ? sampleW : 0;
        const now = (typeof nowMs === 'number' && Number.isFinite(nowMs)) ? nowMs : Date.now();
        const windowMs = 5 * 60 * 1000;

        this._pvSurplusSamples.push({ t: now, v });
        this._pvSurplusSumW += v;

        const cutoff = now - windowMs;
        while (this._pvSurplusHead < this._pvSurplusSamples.length && this._pvSurplusSamples[this._pvSurplusHead].t < cutoff) {
            this._pvSurplusSumW -= this._pvSurplusSamples[this._pvSurplusHead].v;
            this._pvSurplusHead++;
        }

        // gelegentlich kompaktieren (Performance, kein Array.shift)
        if (this._pvSurplusHead > 100) {
            this._pvSurplusSamples = this._pvSurplusSamples.slice(this._pvSurplusHead);
            this._pvSurplusHead = 0;
        }

        const count = Math.max(1, this._pvSurplusSamples.length - this._pvSurplusHead);
        return this._pvSurplusSumW / count;
    }

    /**
     * Queue a local state update (fast). This avoids awaiting many adapter.setStateAsync calls inside the tick loop.
     * Writes are de-duplicated by id and flushed asynchronously with limited concurrency.
     *
     * @param {string} id
     * @param {any} value
     * @param {boolean} [ack=true]
     * @param {{deadband?:number,minIntervalMs?:number}} [opts]
     * @returns {Promise<true|null>}
     */
    async _queueState(id, value, ack = true, opts = null) {
        const sid = String(id || '').trim();
        if (!sid) return null;

        const now = Date.now();
        const o = Object.assign({}, this._pubDefaults(sid), (opts || {}));

        // Normalize value for storage
        let v = value;
        if (v === undefined) v = null;
        if (typeof v === 'number' && !Number.isFinite(v)) v = 0;
        if (v !== null && typeof v === 'object') {
            try {
                v = JSON.stringify(v);
            } catch {
                v = String(v);
            }
        }

        const prev = this._pubCache.get(sid);
        if (prev) {
            // min interval gate (drop until next tick)
            const mi = Number(o.minIntervalMs);
            if (Number.isFinite(mi) && mi > 0 && Number.isFinite(prev.ts) && (now - prev.ts) < mi) {
                return null;
            }

            // equality / deadband
            if (typeof v === 'number' && typeof prev.val === 'number' && Number.isFinite(v) && Number.isFinite(prev.val)) {
                const db = Number(o.deadband);
                if (Number.isFinite(db) && db > 0) {
                    if (Math.abs(v - prev.val) < db) return null;
                } else if (v === prev.val) {
                    return null;
                }
            } else {
                if (v === prev.val) return null;
            }
        }

        // optimistic cache update (we previously ignored setState errors anyway)
        this._pubCache.set(sid, { val: v, ts: now });
        this._pubQueue.set(sid, { val: v, ack: !!ack });
        this._schedulePubFlush();
        return true;
    }

    /**
     * Read a local state using the adapter's in-memory stateCache first (fast),
     * falling back to getStateAsync only on cache misses.
     *
     * @param {string} id
     * @returns {Promise<{val:any,ts:number,lc?:number,ack?:boolean}|null>}
     */
    async _getStateCached(id) {
        const sid = String(id || '').trim();
        if (!sid) return null;

        const a = this.adapter;
        const now = Date.now();

        // Fast path: in-memory stateCache (maintained by main.js onStateChange)
        try {
            const sc = a && a.stateCache;
            if (sc) {
                const e = sc[sid];
                if (e && Object.prototype.hasOwnProperty.call(e, 'value')) {
                    const ts = (typeof e.ts === 'number' && Number.isFinite(e.ts)) ? e.ts : now;
                    return { val: e.value, ts, lc: ts, ack: true };
                }

                // If called with full id, attempt keyFromId mapping
                if (typeof a.keyFromId === 'function' && typeof a.namespace === 'string') {
                    const pref = a.namespace + '.';
                    if (sid.startsWith(pref)) {
                        const k = a.keyFromId(sid);
                        if (k && sc[k] && Object.prototype.hasOwnProperty.call(sc[k], 'value')) {
                            const ts = (typeof sc[k].ts === 'number' && Number.isFinite(sc[k].ts)) ? sc[k].ts : now;
                            return { val: sc[k].value, ts, lc: ts, ack: true };
                        }
                    }
                }
            }
        } catch {
            // ignore
        }

        // Fallback: DB read
        try {
            const st = await a.getStateAsync(sid);
            // Prime cache (best-effort)
            try {
                const sc = a && a.stateCache;
                if (sc) {
                    const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : now));
                    sc[sid] = { value: st ? st.val : null, ts: ts || now };
                }
            } catch {
                // ignore
            }
            return st || null;
        } catch {
            return null;
        }
    }

    _schedulePubFlush() {
        if (this._pubFlushTimer) return;

        const now = Date.now();
        const last = Number(this._pubLastFlushMs) || 0;
        const diff = now - last;
        const delay = diff >= this._pubFlushIntervalMs ? 0 : (this._pubFlushIntervalMs - diff);

        this._pubFlushTimer = setTimeout(() => {
            this._pubFlushTimer = null;
            this._flushPubQueue().catch(() => {});
        }, delay);
    }

    async _flushPubQueue() {
        if (this._pubFlushInFlight) {
            // A flush is already running; make sure we flush again afterwards.
            this._schedulePubFlush();
            return;
        }

        this._pubFlushInFlight = true;
        try {
            const entries = Array.from(this._pubQueue.entries());
            this._pubQueue.clear();
            if (!entries.length) return;

            this._pubLastFlushMs = Date.now();

            const concurrency = 25;
            for (let i = 0; i < entries.length; i += concurrency) {
                const slice = entries.slice(i, i + concurrency);
                await Promise.all(slice.map(([sid, p]) => {
                    try {
                        return this.adapter.setStateAsync(sid, p.val, p.ack).catch(() => {});
                    } catch {
                        return Promise.resolve();
                    }
                }));
            }
        } finally {
            this._pubFlushInFlight = false;
            // If new entries arrived while flushing, schedule another run.
            if (this._pubQueue.size > 0) this._schedulePubFlush();
        }
    }

    _isEnabled() {
        // Backwards compatible default: older configs may not have the new flag stored yet.
        // If the flag is missing, enable the module when at least one chargepoint
        // is configured (EVCS table). This ensures runtime control states exist and
        // the UI doesn't fall back to legacy mode unexpectedly.
        const v = this.adapter && this.adapter.config ? this.adapter.config.enableChargingManagement : undefined;
        if (typeof v === 'boolean') return v;

        try {
            const cnt = Number(this.adapter && this.adapter.config && this.adapter.config.settingsConfig && this.adapter.config.settingsConfig.evcsCount);
            if (Number.isFinite(cnt) && cnt > 0) return true;
        } catch {
            // ignore
        }

        try {
            const list = (this.adapter && Array.isArray(this.adapter.evcsList)) ? this.adapter.evcsList : [];
            if (list && list.length) return true;
        } catch {
            // ignore
        }

        return false;
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

        // Gate T: Tarif-Freigaben (für Transparenz)
        await mk('chargingManagement.control.gridChargeAllowed', 'Grid charge allowed (Tarif)', 'boolean', 'indicator');
        await mk('chargingManagement.control.dischargeAllowed', 'Discharge allowed (Tarif)', 'boolean', 'indicator');

        // Gate B: PV hysteresis diagnostics
        await mk('chargingManagement.control.pvCapRawW', 'PV surplus raw cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvCapEffectiveW', 'PV cap effective (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAvailable', 'PV available (hysteresis)', 'boolean', 'indicator');

        // Debug: PV surplus without EVCS (instant + smoothed)
        // Used to verify sign conventions / smoothing for PV-only charging.
        await mk('chargingManagement.control.pvSurplusNoEvRawW', 'PV surplus (no EVCS) instant (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvSurplusNoEvAvg5mW', 'PV surplus (no EVCS) 5min avg (W)', 'number', 'value.power');

        // Gate A: hard grid safety caps (transparency)
        await mk('chargingManagement.control.gridImportLimitW', 'Grid import limit (W) configured', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportLimitW_effective', 'Grid import limit (W) effective', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportW', 'Grid power (W) (import + / export -)', 'number', 'value.power');
        await mk('chargingManagement.control.gridBaseLoadW', 'Estimated base load (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridCapEvcsW', 'Grid-based EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridCapBinding', 'Grid cap binding', 'boolean', 'indicator');
        await mk('chargingManagement.control.gridMaxPhaseA', 'Grid max phase current (A) configured', 'number', 'value.current');
        await mk('chargingManagement.control.gridWorstPhaseA', 'Grid worst phase current (A)', 'number', 'value.current');
        await mk('chargingManagement.control.gridPhaseCapEvcsW', 'Phase-based EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.phaseCapBinding', 'Phase cap binding', 'boolean', 'indicator');

        // Gate A2: §14a EnWG (optional)
        await mk('chargingManagement.control.para14aActive', '§14a active', 'boolean', 'indicator');
        await mk('chargingManagement.control.para14aMode', '§14a mode', 'string', 'text');
        await mk('chargingManagement.control.para14aCapEvcsW', '§14a EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.para14aBinding', '§14a binding', 'boolean', 'indicator');

        // Gate C: Speicher-Unterstützung (Transparenz)
        await mk('chargingManagement.control.storageAssistActive', 'Storage assist active', 'boolean', 'indicator');
        await mk('chargingManagement.control.storageAssistW', 'Storage assist (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistSoCPct', 'Storage SoC (%)', 'number', 'value.percent');
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
        // Enabled flags
        await mk('cfgEnabled', 'Config enabled', 'boolean', 'indicator');
        await mk('userEnabled', 'Regelung aktiv (User)', 'boolean', 'switch.enable', true, { def: true, states: { true: 'Aktiv', false: 'Aus' } });
        await mk('enabled', 'Enabled (effective)', 'boolean', 'indicator');
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

        // Default value for userEnabled (writable)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userEnabled`, true, true);
            }
        } catch {
            // ignore
        }

        // Zeit-Ziel Laden (Depot-/Deadline-Laden) — optional und im Endkunden-UI steuerbar
        await mk('goalEnabled', 'Zeit-Ziel Laden aktiv (User)', 'boolean', 'switch.enable', true, { def: false, states: { true: 'An', false: 'Aus' } });
        await mk('goalTargetSocPct', 'Ziel-SoC (%)', 'number', 'value.percent', true, { def: 100, min: 0, max: 100, unit: '%' });
        await mk('goalFinishTs', 'Fertig bis (Zeitpunkt ms)', 'number', 'value.time', true, { def: 0 });
        await mk('goalBatteryKwh', 'Akkukapazität (kWh) (optional)', 'number', 'value', true, { def: 0, unit: 'kWh' });

        // Ziel-Laden: berechnete Werte (read-only)
        await mk('goalActive', 'Zeit-Ziel aktiv (berechnet)', 'boolean', 'indicator');
        await mk('goalRemainingMin', 'Restzeit (min)', 'number', 'value');
        await mk('goalRequiredPowerW', 'Benötigte Leistung (W)', 'number', 'value.power');
        await mk('goalDesiredPowerW', 'Ziel-Leistung (W)', 'number', 'value.power');
        await mk('goalShortfallW', 'Leistungsdefizit (W)', 'number', 'value.power');
        await mk('goalStatus', 'Zeit-Ziel Status', 'string', 'text');

        // Defaults for writable goal states (do not overwrite user choice)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.goalEnabled`, false, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalTargetSocPct`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalTargetSocPct`, 100, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalFinishTs`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalFinishTs`, 0, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalBatteryKwh`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalBatteryKwh`, 0, true);
            }
        } catch {
            // ignore
        }

        await mk('effectiveMode', 'Effective mode', 'string', 'text');
        await mk('goalTariffOverride', 'Ziel: Tarif-Sperre übersteuert', 'boolean', 'indicator');
        await mk('priority', 'Priority', 'number', 'value');
        await mk('chargerType', 'Charger type', 'string', 'text');
        await mk('controlBasis', 'Control basis', 'string', 'text');
        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('connectorNo', 'Connector no.', 'number', 'value');
        await mk('stationMaxPowerW', 'Station max power (W)', 'number', 'value.power');
        await mk('stationRemainingW', 'Station remaining (W)', 'number', 'value.power');
        await mk('allowBoost', 'Boost allowed', 'boolean', 'indicator');
        await mk('boostActive', 'Boost active', 'boolean', 'indicator');
        await mk('boostSince', 'Boost since (ms)', 'number', 'value.time');
        await mk('boostUntil', 'Boost until (ms)', 'number', 'value.time');
        await mk('boostRemainingMin', 'Boost remaining (min)', 'number', 'value');
        await mk('boostTimeoutMin', 'Boost timeout (min) (effective)', 'number', 'value');
        await mk('phases', 'Phases', 'number', 'value');
        await mk('minPowerW', 'Min power (W)', 'number', 'value.power');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('para14aCapW', '§14a cap (W)', 'number', 'value.power');
        await mk('para14aCapped', '§14a cap aktiv', 'boolean', 'indicator');
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
        await mk('applyWrites', 'Apply writes (json)', 'string', 'text');
        await mk('reason', 'Reason', 'string', 'text');

        // Diagnostics
        await mk('mappingOk', 'Mapping OK', 'boolean', 'indicator');
        await mk('hasSetpoint', 'Has setpoint', 'boolean', 'indicator');
        await mk('mappingIssues', 'Mapping issues (json)', 'string', 'text');
        await mk('meterAgeMs', 'Meter age (ms)', 'number', 'value');
        await mk('meterStale', 'Meter stale', 'boolean', 'indicator');
        await mk('statusAgeMs', 'Status age (ms)', 'number', 'value');
        await mk('statusStale', 'Status stale', 'boolean', 'indicator');

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
        await mk('binding', 'Binding', 'boolean', 'indicator');
        await mk('headroomW', 'Headroom (W)', 'number', 'value.power');
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
        // Prefer centralized snapshot (Phase 4.0)
        try {
            const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
            if (caps && caps.peak && typeof caps.peak.active === 'boolean') {
                return caps.peak.active;
            }
        } catch {
            // ignore
        }
        try {
            const st = await this.adapter.getStateAsync('peakShaving.control.active');
            return st ? !!st.val : false;
        } catch {
            return false;
        }
    }

    async _getPeakShavingBudgetW() {
        // Prefer centralized snapshot (Phase 4.0)
        try {
            const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
            if (caps && caps.peak && typeof caps.peak.budgetW === 'number' && Number.isFinite(caps.peak.budgetW)) {
                return caps.peak.budgetW;
            }
        } catch {
            // ignore
        }
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

        // NOTE:
        // "off" is not intended to be a user-facing operating mode. On/Off is handled
        // via the App-Center toggle (adapter.config.enableChargingManagement).
        // If we still get "off" here while at least one setpoint is mapped, fall back
        // to "mixed" so Boost/Auto behave as expected.
        let mode = String(cfg.mode || 'off'); // pvSurplus | mixed
        try {
            const hasAnySetpoint = !!(this.adapter && this.adapter.config && this.adapter.config._chargingHasAnySetpoint);
            const cmEnabled = (this.adapter && this.adapter.config && this.adapter.config.enableChargingManagement !== false);
            if (mode === 'off' && cmEnabled && hasAnySetpoint) {
                mode = 'mixed';
            }
        } catch (_e) {}
        const wallboxes = Array.isArray(cfg.wallboxes) ? cfg.wallboxes : [];

        // Ziel‑Laden: "standard" = gleichmäßige Ø‑Leistung, "smart" = nutzt Tarif‑Freigaben (wenn vorhanden)
        // und kann Sperren bei knappen Deadlines automatisch aufheben.
        const goalStrategy = (String(cfg.goalStrategy || 'standard').trim().toLowerCase() === 'smart') ? 'smart' : 'standard';

        // Smart‑Parameter (konservative Defaults; optional über Installer konfigurierbar)
        const goalTariffOverrideUrgency = clamp(num(cfg.goalTariffOverrideUrgency, 0.70), 0, 1);
        const goalTariffOverrideMinRemainingMin = clamp(num(cfg.goalTariffOverrideMinRemainingMin, 60), 0, 7 * 24 * 60);
        const goalCheapBoostFactor = clamp(num(cfg.goalCheapBoostFactor, 1.25), 1, 3);
        const goalCheapPriceFactor = clamp(num(cfg.goalCheapPriceFactor, 0.90), 0.1, 2);

        // -----------------------------------------------------------------
        // §14a EnWG snapshot (provided by Para14aModule)
        // -----------------------------------------------------------------
        const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
        const para14aActive = !!(p14a && p14a.active);
        const para14aMode = para14aActive ? String(p14a.mode || '') : '';
        const para14aCapsBySafe = (para14aActive && p14a && p14a.evcsCapsBySafe && typeof p14a.evcsCapsBySafe === 'object') ? p14a.evcsCapsBySafe : {};
        const para14aTotalCapW = (para14aActive && p14a && typeof p14a.evcsTotalCapW === 'number' && Number.isFinite(p14a.evcsTotalCapW) && p14a.evcsTotalCapW > 0)
            ? p14a.evcsTotalCapW
            : null;

        // Stationsgruppen (optional): gemeinsame Leistungsgrenze pro Station (z. B. DC‑Station mit mehreren Ladepunkten)
        // Hinweis: Stationsgruppen werden im Installer-UI unter settingsConfig gepflegt.
        // Für maximale Robustheit akzeptieren wir beides:
        // - chargingManagement.stationGroups (direktes Modul-Config)
        // - settingsConfig.stationGroups (Installer/EVCS-Konfiguration)
        let stationGroups = Array.isArray(cfg.stationGroups) ? cfg.stationGroups : [];
        if (!stationGroups || !stationGroups.length) {
            const sc = (this.adapter && this.adapter.config && this.adapter.config.settingsConfig && typeof this.adapter.config.settingsConfig === 'object')
                ? this.adapter.config.settingsConfig
                : null;
            if (sc && Array.isArray(sc.stationGroups)) stationGroups = sc.stationGroups;
        }
        if (!stationGroups || !stationGroups.length) {
            if (this.adapter && Array.isArray(this.adapter.stationGroups)) stationGroups = this.adapter.stationGroups;
        }
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

        // Smart‑Ziel: Preis‑Signal (optional). Wird nur genutzt, wenn entsprechende Datapoints vorhanden sind.
        // Hinweis: Das Preis‑Signal ist ein reines Optimierungssignal; bei fehlenden Preisen bleibt die Strategie funktionsfähig.
        let priceCurrent = null;
        let priceAverage = null;
        let isCheapNow = false;
        if (goalStrategy === 'smart' && this.dp) {
            const pc = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh('priceCurrent', staleTimeoutMs, null) : this.dp.getNumber('priceCurrent', null);
            const pa = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh('priceAverage', staleTimeoutMs, null) : this.dp.getNumber('priceAverage', null);
            priceCurrent = (typeof pc === 'number' && Number.isFinite(pc)) ? pc : null;
            priceAverage = (typeof pa === 'number' && Number.isFinite(pa) && pa > 0) ? pa : null;
            if (priceCurrent !== null && priceAverage !== null) {
                isCheapNow = priceCurrent <= (priceAverage * goalCheapPriceFactor);
            }
        }

        // MU6.8b: separate stale thresholds for wallbox signals.
        // Many devices update "event-driven" (e.g. power stays 0 for long), so treating them as stale after
        // the global failsafe timeout would disable control incorrectly.
        // - wallboxMeterStaleTimeoutSec: diagnostics only (does NOT disable control), default 300s
        // - wallboxStatusStaleTimeoutSec: diagnostics only, default 86400s (24h)
        const wbMeterStaleTimeoutSec = clamp(num(cfg.wallboxMeterStaleTimeoutSec, 300), 5, 86400);
        const wbStatusStaleTimeoutSec = clamp(num(cfg.wallboxStatusStaleTimeoutSec, 86400), 5, 86400);
        const wbMeterStaleTimeoutMs = wbMeterStaleTimeoutSec * 1000;
        const wbStatusStaleTimeoutMs = wbStatusStaleTimeoutSec * 1000;


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

        // Gate A: reuse PeakShaving meter phase currents (if configured) as optional hard safety caps.
        // This allows phase protection even when PeakShaving module is disabled.
        const psCfgForPhase = (this.adapter && this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
        if (this.dp && psCfgForPhase) {
            if (psCfgForPhase.l1CurrentId) await this.dp.upsert({ key: 'ps.l1A', objectId: String(psCfgForPhase.l1CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
            if (psCfgForPhase.l2CurrentId) await this.dp.upsert({ key: 'ps.l2A', objectId: String(psCfgForPhase.l2CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
            if (psCfgForPhase.l3CurrentId) await this.dp.upsert({ key: 'ps.l3A', objectId: String(psCfgForPhase.l3CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
        }

        // Measurements and object mapping
        let totalPowerW = 0;
        let totalCurrentA = 0;
        let onlineCount = 0;

        /** @type {Array<any>} */
        const wbList = [];

        const now = Date.now();
        await this._queueState('chargingManagement.debug.lastRun', now, true);
        await this._queueState('chargingManagement.debug.sortedOrder', '', true);
        await this._queueState('chargingManagement.debug.allocations', '[]', true);
        for (let wbIndex = 0; wbIndex < wallboxes.length; wbIndex++) {
            const wb = wallboxes[wbIndex];
            const key = String(wb.key || '').trim();
            if (!key) continue;

            const safe = toSafeIdPart(key);
            const ch = await this._ensureWallboxChannel(key);

            // Serienreife/Robustheit: restore persisted runtime timers after adapter restart.
            // This keeps Boost timeouts + "first-started" charging order stable across restarts.
            if (!this._restoredRuntime.has(safe)) {
                try {
                    const cs = await this._getStateCached(`${ch}.chargingSince`);
                    const csVal = cs ? Number(cs.val) : 0;
                    if (Number.isFinite(csVal) && csVal > 0) this._chargingSinceMs.set(safe, csVal);
                } catch {
                    // ignore
                }
                try {
                    const bs = await this._getStateCached(`${ch}.boostSince`);
                    const bsVal = bs ? Number(bs.val) : 0;
                    if (Number.isFinite(bsVal) && bsVal > 0) this._boostSinceMs.set(safe, bsVal);
                } catch {
                    // ignore
                }
                this._restoredRuntime.add(safe);
            }

            // Runtime mode override (writable state, used by VIS)
            // If the runtime state is empty, initialize it ONCE from config default (userModeDefault).
            let userMode = 'auto';
            try {
                const st = await this._getStateCached(`${ch}.userMode`);
                const cur = st ? st.val : null;
                const def = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');

                if (cur === null || cur === undefined || String(cur).trim() === '') {
                    try {
                        await this._queueState(`${ch}.userMode`, def, true);
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

            const cfgEnabled = wb.enabled !== false;

            // Runtime: end-customer can disable EMS regulation per charge point
            let userEnabled = true;
            try {
                const stEn = await this._getStateCached(`${ch}.userEnabled`);
                const curEn = stEn ? stEn.val : null;
                if (curEn === null || curEn === undefined || String(curEn).trim() === '') {
                    try { await this._queueState(`${ch}.userEnabled`, true, true); } catch { /* ignore */ }
                    userEnabled = true;
                } else {
                    userEnabled = !!curEn;
                }
            } catch {
                userEnabled = true;
            }

            const enabled = cfgEnabled && userEnabled;


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

            // Track whether the installer/user explicitly configured local caps (useful for diagnostics/reasons)
            const userLimitSet = (
                (wb && wb.maxA !== undefined && wb.maxA !== null && String(wb.maxA).trim() !== '' && Number.isFinite(Number(wb.maxA)) && Number(wb.maxA) > 0)
                || (wb && wb.maxPowerW !== undefined && wb.maxPowerW !== null && String(wb.maxPowerW).trim() !== '' && Number.isFinite(Number(wb.maxPowerW)) && Number(wb.maxPowerW) > 0)
                || (wb && wb.stationMaxPowerW !== undefined && wb.stationMaxPowerW !== null && String(wb.stationMaxPowerW).trim() !== '' && Number.isFinite(Number(wb.stationMaxPowerW)) && Number(wb.stationMaxPowerW) > 0)
            );

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
                // Some EVCS/OCPP stacks expire control setpoints after ~60s unless refreshed.
                // Periodically re-apply the setpoint even if unchanged to prevent charge stop/start loops.
                if (setCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.setA`, objectId: setCurrentAId, dataType: 'number', direction: 'out', unit: 'A', deadband: 0.1, maxWriteIntervalMs: 45000 });
                if (setPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.setW`, objectId: setPowerWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25, maxWriteIntervalMs: 45000 });
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


            // Diagnostics: freshness + mapping completeness
            const hasSetpoint = !!(setCurrentAId || setPowerWId);
            const mappingIssues = [];
            if (!hasSetpoint) mappingIssues.push('no_setpoint');
            if (!actualPowerWId) mappingIssues.push('no_power_meter');
            if (!statusId) mappingIssues.push('no_status_dp');

            let meterAgeMs = 0;
            let meterStale = false;
            if (actualPowerWId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.pW`);
                meterAgeMs = (Number.isFinite(age) && age >= 0) ? Math.round(age) : 0;
                meterStale = !(Number.isFinite(age)) ? true : (age > wbMeterStaleTimeoutMs);
            }

            let statusAgeMs = 0;
            let statusStale = false;
            if (statusId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.st`);
                statusAgeMs = (Number.isFinite(age) && age >= 0) ? Math.round(age) : 0;
                statusStale = !(Number.isFinite(age)) ? true : (age > wbStatusStaleTimeoutMs);
            }

            const staleAny = !!(meterStale || statusStale);

            // Note: staleness flags are diagnostics only. Online/offline is derived from the status value.

            // Publish diagnostics (UI)
            try {
                await this._queueState(`${ch}.mappingOk`, hasSetpoint, true);
                await this._queueState(`${ch}.hasSetpoint`, hasSetpoint, true);
                await this._queueState(`${ch}.mappingIssues`, JSON.stringify(mappingIssues), true);
                await this._queueState(`${ch}.meterAgeMs`, meterAgeMs, true);
                await this._queueState(`${ch}.meterStale`, !!meterStale, true);
                await this._queueState(`${ch}.statusAgeMs`, statusAgeMs, true);
                await this._queueState(`${ch}.statusStale`, !!statusStale, true);
            } catch {
                // ignore
            }

            // Charging detection (used for arrival-based stepwise allocation)
            // If the wallbox meter is stale (event-driven update), fall back to the last commanded target.
            const pWNum = (typeof pW === 'number' && Number.isFinite(pW)) ? pW : 0;
            let pWUsed = (online && enabled) ? pWNum : 0;
            if (online && enabled && meterStale) {
                const prevCmdW = this._lastCmdTargetW.get(safe);
                pWUsed = (typeof prevCmdW === 'number' && Number.isFinite(prevCmdW)) ? prevCmdW : 0;
            }
            const pWAbs = Math.abs(pWUsed);
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
            
            // NOTE: JS '&&' returns the last evaluated operand, which can be a number (e.g. 0)
            // -> enforce proper boolean types for ioBroker states (common.type = boolean).
            const inGrace = !!(chargingSince && lastActive && (now - lastActive) <= stopGraceMs);
            const isCharging = !!(online && enabled && (isChargingRaw || inGrace));
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

                // For AC, enforce a practical 3-phase minimum only when we can command *power* directly.
                // When controlling by current (A), the wallbox already has a physical minimum current (typically 6 A).
                // Enforcing a power minimum here would lead to fractional currents (e.g. 6.1 A) which some chargers
                // or adapters do not accept and can cause start/stop behaviour.
                if (controlBasis === 'powerW' && phases === 3 && acMinPower3pW > 0) {
                    minPW = Math.max(minPW, acMinPower3pW);
                }

                // Note: if maxPW < minPW after enforcement, this wallbox cannot be started.
            }

            const maxPWBefore14a = maxPW;
            let para14aCapW = 0;
            let para14aCapped = false;

            // -------------------------------------------------------------
            // §14a EnWG per-wallbox cap (if active)
            // Apply after min/max derivation so we can safely clamp.
            // -------------------------------------------------------------
            if (para14aActive) {
                const capW = (para14aCapsBySafe && typeof para14aCapsBySafe[safe] === 'number' && Number.isFinite(para14aCapsBySafe[safe]))
                    ? Number(para14aCapsBySafe[safe])
                    : null;
                if (typeof capW === 'number' && Number.isFinite(capW) && capW > 0) {
                    para14aCapW = capW;
                    // Mark §14a as binding for this connector only if it reduces the effective max.
                    if (Number.isFinite(maxPWBefore14a) && capW < (maxPWBefore14a - 1)) {
                        para14aCapped = true;
                    }

                    maxPW = Math.min(maxPW, capW);
                    if (maxPW < minPW) minPW = maxPW;
                }
            }

            if (typeof pWUsed === 'number' && Number.isFinite(pWUsed)) totalPowerW += pWUsed;
            if (typeof iA === 'number') totalCurrentA += iA;
            if (online) onlineCount += 1;

            await this._queueState(`${ch}.name`, String(wb.name || key), true);
            await this._queueState(`${ch}.cfgEnabled`, cfgEnabled, true);
            await this._queueState(`${ch}.enabled`, enabled, true);
            await this._queueState(`${ch}.online`, online, true);
            await this._queueState(`${ch}.priority`, priority, true);
            await this._queueState(`${ch}.chargerType`, chargerType, true);
            await this._queueState(`${ch}.controlBasis`, controlBasis, true);
            await this._queueState(`${ch}.stationKey`, stationKey || '', true);
            await this._queueState(`${ch}.connectorNo`, connectorNo || 0, true);
            await this._queueState(`${ch}.stationMaxPowerW`, (typeof stationMaxPowerW === 'number' && Number.isFinite(stationMaxPowerW)) ? stationMaxPowerW : 0, true);
            await this._queueState(`${ch}.allowBoost`, !!allowBoost, true);
            await this._queueState(`${ch}.phases`, phases, true);
            await this._queueState(`${ch}.minPowerW`, minPW, true);
            await this._queueState(`${ch}.maxPowerW`, maxPW, true);
            await this._queueState(`${ch}.para14aCapW`, para14aCapW || 0, true);
            await this._queueState(`${ch}.para14aCapped`, !!para14aCapped, true);
            await this._queueState(`${ch}.actualPowerW`, typeof pW === 'number' ? pW : 0, true);
            await this._queueState(`${ch}.actualCurrentA`, typeof iA === 'number' ? iA : 0, true);

            await this._queueState(`${ch}.charging`, isCharging, true);
            await this._queueState(`${ch}.chargingSince`, chargingSinceForState, true);
            await this._queueState(`${ch}.chargingRaw`, isChargingRaw, true);
            await this._queueState(`${ch}.lastActive`, lastActive || 0, true);
            await this._queueState(`${ch}.idleMs`, lastActive ? (now - lastActive) : 0, true);
            await this._queueState(`${ch}.allocationRank`, 0, true);
            // userMode is writable; do NOT overwrite here. effectiveMode will be set later.
            // Zeit-Ziel Laden (Depot-/Deadline-Laden)
            let goalEnabled = false;
            let goalTargetSocPct = 100;
            let goalFinishTs = 0;
            let goalBatteryKwhUser = 0;

            try {
                const st = await this._getStateCached(`${ch}.goalEnabled`);
                goalEnabled = !!(st && st.val);
            } catch {
                goalEnabled = false;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalTargetSocPct`);
                const v = st ? Number(st.val) : NaN;
                goalTargetSocPct = Number.isFinite(v) ? clamp(v, 0, 100) : 100;
            } catch {
                goalTargetSocPct = 100;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalFinishTs`);
                const v = st ? Number(st.val) : NaN;
                goalFinishTs = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
            } catch {
                goalFinishTs = 0;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalBatteryKwh`);
                const v = st ? Number(st.val) : NaN;
                goalBatteryKwhUser = Number.isFinite(v) ? Math.max(0, v) : 0;
            } catch {
                goalBatteryKwhUser = 0;
            }

            let goalActive = false;
            let goalStatus = 'inactive';
            let goalVehicleSocPct = null;
            let goalRemainingMin = 0;
            let goalRequiredW = 0;
            let goalDesiredW = 0;
            let goalShortfallW = 0;
            let goalUrgency = 0;
            let goalDeltaSocPct = 0;
            let goalOverdue = false;

            // Stable mapping from wallbox to EVCS index (independent from safe key)
            const evcsIndex = (wb && wb.evcsIndex !== undefined && wb.evcsIndex !== null) ? Number(wb.evcsIndex) : NaN;

            // Goal-Charging (Zielladen) is only supported in AUTO mode.
            if (goalEnabled) {
                if (userMode !== 'auto') {
                    goalStatus = 'auto_only';
                } else
                if (!Number.isFinite(evcsIndex) || evcsIndex <= 0) {
                    goalStatus = 'no_index';
                } else {
                    try {
                        const stSoc = await this._getStateCached(`evcs.${Math.round(evcsIndex)}.vehicleSoc`);
                        const socVal = stSoc ? Number(stSoc.val) : NaN;
                        if (!Number.isFinite(socVal) || socVal < 0 || socVal > 100) {
                            goalStatus = 'no_soc';
                        } else {
                            goalVehicleSocPct = clamp(socVal, 0, 100);
                            goalDeltaSocPct = Math.max(0, goalTargetSocPct - goalVehicleSocPct);

                            if (goalDeltaSocPct <= 0.01) {
                                goalStatus = 'reached';
                            } else {
                                // Deadline optional: if no timestamp is set, keep the goal configured but do not influence allocation
                                if (!Number.isFinite(goalFinishTs) || goalFinishTs <= 0) {
                                    goalStatus = 'no_deadline';
                                } else {
                                    const remMs = goalFinishTs - now;
                                    goalOverdue = remMs < 0;
                                    const remMsClamped = Math.max(0, remMs);
                                    goalRemainingMin = Math.max(0, Math.round(remMsClamped / 60000));

                                    // Battery capacity: user value wins; otherwise default by charger type.
                                    const defaultBatteryKwh = (chargerType === 'DC') ? 200 : 60;
                                    const batteryKwh = (goalBatteryKwhUser && goalBatteryKwhUser > 0) ? goalBatteryKwhUser : defaultBatteryKwh;

                                    // Required average power to reach target SoC by deadline
                                    const remH = Math.max(0.05, remMsClamped / 3600000); // >= 3 min
                                    const requiredWh = (batteryKwh * 1000) * (goalDeltaSocPct / 100);
                                    const reqW = requiredWh / remH;
                                    goalRequiredW = clamp(reqW, 0, maxPW);

                                    // Desired command (cap): average required power, but never below technical minimum if we still need energy.
                                    goalDesiredW = (goalRequiredW > 0) ? Math.min(maxPW, Math.max(goalRequiredW, minPW)) : 0;

                                    // Urgency score for sorting (0..1+), based on desired power relative to max.
                                    goalUrgency = (maxPW > 0) ? (goalDesiredW / maxPW) : 0;

                                    goalActive = true;
                                    goalStatus = goalOverdue ? 'overdue' : 'active';
                                }
                            }
                        }
                    } catch {
                        goalStatus = 'no_soc';
                    }
                }
            }

            // Publish computed goal states (shortfall will be updated after command calculation)
            try {
                await this._queueState(`${ch}.goalActive`, !!goalActive, true);
                await this._queueState(`${ch}.goalRemainingMin`, goalRemainingMin || 0, true);
                await this._queueState(`${ch}.goalRequiredPowerW`, Math.round(goalRequiredW || 0), true);
                await this._queueState(`${ch}.goalDesiredPowerW`, Math.round(goalDesiredW || 0), true);
                await this._queueState(`${ch}.goalShortfallW`, Math.round(goalShortfallW || 0), true);
                await this._queueState(`${ch}.goalStatus`, String(goalStatus || 'inactive'), true);
            } catch {
                // ignore
            }

            wbList.push({
                key,
                safe,
                orderIndex: wbIndex,
                ch,
                name: String(wb.name || key),
                cfgEnabled,
                userEnabled,
                enabled,
                online,
                staleAny,
                meterStale,
                meterAgeMs,
                statusStale,
                statusAgeMs,
                hasSetpoint,
                mappingIssues,
                charging: isCharging,
                chargingSinceMs: chargingSinceForState,
                actualPowerW: pWNum,
                userMode,
                evcsIndex: (Number.isFinite(evcsIndex) && evcsIndex > 0) ? Math.round(evcsIndex) : 0,
                goalEnabled,
                goalActive,
                goalStatus,
                goalTargetSocPct,
                goalFinishTs,
                goalBatteryKwhUser,
                goalVehicleSocPct,
                goalDeltaSocPct,
                goalRemainingMin,
                goalRequiredW,
                goalDesiredW,
                goalUrgency,
                goalOverdue,
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
                para14aCapW,
                para14aCapped,
                userLimitSet,
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

        await this._queueState('chargingManagement.wallboxCount', wbList.length, true);
        await this._queueState('chargingManagement.summary.totalPowerW', totalPowerW, true);
        await this._queueState('chargingManagement.summary.totalCurrentA', totalCurrentA, true);
        await this._queueState('chargingManagement.summary.onlineWallboxes', onlineCount, true);

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
         * MU6.8: state staleness helper (uses state.ts / state.lc).
         * @param {string} id
         * @param {number} maxAgeMs
         * @returns {Promise<boolean>}
         */
        const isStateStale = async (id, maxAgeMs) => {
            try {
                const st = await this._getStateCached(id);
                const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : 0));
                if (!ts) return true;
                return (Date.now() - ts) > maxAgeMs;
            } catch {
                return true;
            }
        };


        // Tariff-derived permissions (optional; provided by tarif-vis.js)
        // gridChargeAllowed: whether EVCS may use grid import (Tarif-Sperre)
        // dischargeAllowed: whether the storage may discharge for comfort use-cases (EVCS assist, self-consumption)
        let gridChargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.gridChargeAllowed')) {
            // See storage-control.js: do NOT treat this as "stale" on a short timeout.
            // These flags can remain unchanged for hours (cheap window), but are still valid.
            gridChargeAllowedRaw = this.dp.getBoolean('cm.gridChargeAllowed', true);
        }

        let dischargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.dischargeAllowed')) {
            dischargeAllowedRaw = this.dp.getBoolean('cm.dischargeAllowed', true);
        }

        // Debounce gegen Flattern:
        // - Sperren (false) wirken sofort (Safety-first)
        // - Freigaben (true) erst nach stabiler True-Phase (hold)
        const permHoldMs = Math.round(clamp(num(cfg.tariffPermissionHoldSec, 10), 0, 3600) * 1000);
        const permNowMs = Date.now();

        let gridChargeAllowed = gridChargeAllowedRaw;
        if (permHoldMs > 0) {
            if (!gridChargeAllowedRaw) {
                this._tariffGridChargeAllowed = false;
                this._tariffGridChargeAllowedTrueSinceMs = 0;
            } else {
                if (this._tariffGridChargeAllowed) {
                    // already enabled
                } else {
                    if (!this._tariffGridChargeAllowedTrueSinceMs) this._tariffGridChargeAllowedTrueSinceMs = permNowMs;
                    if ((permNowMs - this._tariffGridChargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffGridChargeAllowed = true;
                    }
                }
            }
            gridChargeAllowed = !!this._tariffGridChargeAllowed;
        }

        let dischargeAllowed = dischargeAllowedRaw;
        if (permHoldMs > 0) {
            if (!dischargeAllowedRaw) {
                this._tariffDischargeAllowed = false;
                this._tariffDischargeAllowedTrueSinceMs = 0;
            } else {
                if (this._tariffDischargeAllowed) {
                    // already enabled
                } else {
                    if (!this._tariffDischargeAllowedTrueSinceMs) this._tariffDischargeAllowedTrueSinceMs = permNowMs;
                    if ((permNowMs - this._tariffDischargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffDischargeAllowed = true;
                    }
                }
            }
            dischargeAllowed = !!this._tariffDischargeAllowed;
        }

        try {
            await this._queueState('chargingManagement.control.gridChargeAllowed', !!gridChargeAllowed, true);
            await this._queueState('chargingManagement.control.dischargeAllowed', !!dischargeAllowed, true);
        } catch {
            // ignore
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
        let anyBoostActive = false;

        for (const w of wbList) {
            let override = normalizeWallboxModeOverride(w.userMode);
            const boostNotAllowed = (override === 'boost' && w.allowBoost === false);
            if (boostNotAllowed) {
                override = 'auto';
                // If boost is disabled for this chargepoint, reset runtime mode to avoid confusing UI
                try {
                    await this._queueState(`${w.ch}.userMode`, 'auto', true);
                } catch {
                    // ignore
                }
            }

            // Effective boost timeout (minutes): per-wallbox override > global by charger type
            const typeDefaultMin = (String(w.chargerType || '').toUpperCase() === 'DC') ? boostTimeoutMinDc : boostTimeoutMinAc;
            const effBoostTimeoutMin = (Number.isFinite(Number(w.boostTimeoutMinOverride)) && Number(w.boostTimeoutMinOverride) > 0)
                ? Number(w.boostTimeoutMinOverride)
                : typeDefaultMin;

            // Smart‑Ziel: Tarif‑Sperre pro Ladepunkt aufheben, wenn ein aktives Ziel sonst gefährdet ist.
            // Wichtig: Globale PV‑Only Einstellungen (pvSurplusOnlyCfg/Mode PV) werden dadurch nicht überschrieben.
            let forcePvForW = forcePvSurplusOnly;
            let goalTariffOverrideActive = false;
            if (goalStrategy === 'smart' && forcePvForW && !pvSurplusOnlyCfg && w.enabled && w.online && w.goalActive) {
                const remMin = (typeof w.goalRemainingMin === 'number' && Number.isFinite(w.goalRemainingMin)) ? w.goalRemainingMin : null;
                const urg = (typeof w.goalUrgency === 'number' && Number.isFinite(w.goalUrgency)) ? w.goalUrgency : null;
                const shouldOverride = !!w.goalOverdue
                    || (remMin !== null && remMin <= goalTariffOverrideMinRemainingMin)
                    || (urg !== null && urg >= goalTariffOverrideUrgency);
                if (shouldOverride) {
                    forcePvForW = false;
                    goalTariffOverrideActive = true;
                }
            }

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
                            await this._queueState(`${w.ch}.userMode`, 'auto', true);
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
                // "Boost" is an explicit user command: always behave as grid-allowed fast charging.
                // (Hard limits like §14a / Grid caps / Phase caps still apply later in the pipeline.)
                eff = 'boost';
            } else if (override === 'pv') {
                eff = 'pv';
            } else if (override === 'minpv') {
                // "Min+PV" is an explicit user mode:
                // - always keep the minimum charging power active (even if PV=0)
                // - additional power beyond the technical minimum is still limited by PV surplus
                // Therefore we do NOT force it to pure PV mode, even when tariff policy blocks grid-charging.
                eff = 'minpv';
            } else {
                // auto: follow global defaults
                eff = (forcePvForW || pvSurplusOnlyCfg) ? 'pv' : 'normal';
            }

            w.effectiveMode = eff;
            w._boostTimedOut = boostTimedOut;
            w._boostNotAllowed = boostNotAllowed;
            w._boostTimeoutMinEffective = effBoostTimeoutMin;

            if (w.enabled && w.online) {
                if (eff === 'pv' || eff === 'minpv') anyPvLimitedActive = true;
                if (eff === 'boost' || eff === 'minpv' || eff === 'normal') anyGridAllowedActive = true;
                if (eff === 'boost') anyBoostActive = true;
            }

            // Expose effective mode + boost runtime details for VIS/debugging
            try {
                await this._queueState(`${w.ch}.effectiveMode`, eff, true);
                await this._queueState(`${w.ch}.goalTariffOverride`, !!goalTariffOverrideActive, true);
                await this._queueState(`${w.ch}.boostTimeoutMin`, Number.isFinite(effBoostTimeoutMin) ? effBoostTimeoutMin : 0, true);
                await this._queueState(`${w.ch}.boostActive`, eff === 'boost', true);
                await this._queueState(`${w.ch}.boostSince`, boostSince || 0, true);
                await this._queueState(`${w.ch}.boostUntil`, boostUntil || 0, true);
                await this._queueState(`${w.ch}.boostRemainingMin`, boostRemainingMin || 0, true);
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

        // Gate B: PV hysteresis diagnostics (defaults)
        let pvCapRawWState = 0;
        let pvCapEffectiveWState = 0;
        let pvAvailableState = false;
        // Debug: PV surplus without EVCS (instant + smoothed)
        let pvSurplusNoEvRawWState = 0;
        let pvSurplusNoEvAvg5mWState = 0;

        if (needPvBudget) {
            // PV-Überschuss sauber ermitteln:
            // Problem (vorher): PV-Cap wurde aus dem NVP (grid export) direkt abgeleitet.
            // Sobald die Wallbox startet, sinkt der Export (weil EVCS selbst verbraucht)
            // und der Algorithmus hat die Wallbox wieder abgeschaltet.
            //
            // Lösung: PV-Überschuss OHNE EVCS-Verbrauch berechnen:
            //   pvSurplusNoEv = (-gridW) + evcsW
            //   gridW: Import + / Export -, evcsW: aktuelle EVCS-Leistung (W)
            // => entspricht pvW - (Hauslast ohne EVCS)
            // Zusätzlich: 5-Minuten Durchschnitt für stabilere Regelung.

            const pvSurplusCfgW = getFirstDpNumber(['cm.pvSurplusW']);
            gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);

            const evcsNowW = (typeof totalPowerW === 'number' && Number.isFinite(totalPowerW)) ? Math.max(0, totalPowerW) : 0;

            let pvSurplusNoEvW = null;
            if (typeof gridW === 'number' && Number.isFinite(gridW)) {
                pvSurplusNoEvW = Math.max(0, (-gridW) + evcsNowW);
            } else if (typeof pvSurplusCfgW === 'number' && Number.isFinite(pvSurplusCfgW)) {
                // Fallback wenn kein Grid-DP verfügbar (z. B. nur PV-Surplus DP konfiguriert)
                pvSurplusNoEvW = Math.max(0, pvSurplusCfgW);
            }

            // Publish raw value (before smoothing) for debugging
            pvSurplusNoEvRawWState = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW)) ? pvSurplusNoEvW : 0;

            pvSurplusW = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW))
                ? this._pvSurplusAvgPush(now, pvSurplusNoEvW)
                : 0;

            pvSurplusNoEvAvg5mWState = (typeof pvSurplusW === 'number' && Number.isFinite(pvSurplusW)) ? pvSurplusW : 0;

            const pvCapRawW = (typeof pvSurplusW === 'number' && Number.isFinite(pvSurplusW) && pvSurplusW > 0) ? pvSurplusW : 0;
            pvCapW = pvCapRawW;

            // -----------------------------------------------------------------
            // Gate B: PV hysteresis / start-stop protection
            // Prevent rapid start/stop when PV surplus is very low / fluctuating.
            // For PV-only modes this is a START gate (no grid import intended).
            // -----------------------------------------------------------------
            const pvStartThresholdW = clamp(num(cfg.pvStartThresholdW, 800), 0, 1e12);
            const pvStopThresholdW  = clamp(num(cfg.pvStopThresholdW, 200), 0, 1e12);
            const pvStartDelayMs    = clamp(num(cfg.pvStartDelaySec, 10), 0, 3600) * 1000;
            const pvStopDelayMs     = clamp(num(cfg.pvStopDelaySec, 30), 0, 3600) * 1000;
            const pvAbortImportW    = clamp(num(cfg.pvAbortImportW, 200), 0, 1e12);

            // Ensure stop threshold is not above start threshold (avoid inverted hysteresis)
            const startW = pvStartThresholdW;
            const stopW  = Math.min(pvStopThresholdW, (startW > 0 ? startW : pvStopThresholdW));

            const gridImportW = (typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.max(0, gridW) : 0;
            const forcedBelow = (pvAbortImportW > 0 && gridImportW > pvAbortImportW);

            const above = (!forcedBelow) && ((startW > 0) ? (pvCapRawW >= startW) : (pvCapRawW > 0));
            const below = forcedBelow || (pvCapRawW <= stopW);

            let pvAvail = !!this._pvAvailable;

            if (above) {
                if (!this._pvAboveSinceMs) this._pvAboveSinceMs = now;
                this._pvBelowSinceMs = 0;
                if (!pvAvail && (pvStartDelayMs <= 0 || (now - this._pvAboveSinceMs) >= pvStartDelayMs)) {
                    pvAvail = true;
                }
            } else if (below) {
                if (!this._pvBelowSinceMs) this._pvBelowSinceMs = now;
                this._pvAboveSinceMs = 0;
                if (pvAvail && (pvStopDelayMs <= 0 || (now - this._pvBelowSinceMs) >= pvStopDelayMs)) {
                    pvAvail = false;
                }
            } else {
                // Between thresholds: keep current state, reset timers to require stable crossing again
                this._pvAboveSinceMs = 0;
                this._pvBelowSinceMs = 0;
            }

            this._pvAvailable = pvAvail;
            pvCapW = pvAvail ? pvCapRawW : 0;

            pvCapRawWState = pvCapRawW;
            pvCapEffectiveWState = (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : 0;
            pvAvailableState = pvAvail;

        }

        if (!needPvBudget) {
            this._pvAvailable = false;
            this._pvAboveSinceMs = 0;
            this._pvBelowSinceMs = 0;
            pvCapRawWState = 0;
            pvCapEffectiveWState = 0;
            pvAvailableState = false;
            pvSurplusNoEvRawWState = 0;
            pvSurplusNoEvAvg5mWState = 0;
        }

        // Publish PV diagnostics (even if PV budgeting is not active)
        try {
            await this._queueState('chargingManagement.control.pvCapRawW', pvCapRawWState || 0, true);
            await this._queueState('chargingManagement.control.pvCapEffectiveW', pvCapEffectiveWState || 0, true);
            await this._queueState('chargingManagement.control.pvAvailable', !!pvAvailableState, true);
            await this._queueState('chargingManagement.control.pvSurplusNoEvRawW', pvSurplusNoEvRawWState || 0, true);
            await this._queueState('chargingManagement.control.pvSurplusNoEvAvg5mW', pvSurplusNoEvAvg5mWState || 0, true);
        } catch {
            // ignore
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
            const coreTariffW = (() => {
                try {
                    const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
                    const n = caps && caps.tariff ? num(caps.tariff.budgetW, null) : null;
                    return (typeof n === 'number' && Number.isFinite(n) && n > 0) ? n : null;
                } catch {
                    return null;
                }
            })();

            const tariff = (typeof coreTariffW === 'number') ? coreTariffW : getFirstDpNumber(['cm.tariffBudgetW', 'cm.tariffLimitW']);
            // Boost: user explicitly requests full charging -> ignore tariff budget cap.
            if (!anyBoostActive && typeof tariff === 'number' && Number.isFinite(tariff) && tariff > 0) {
                components.push({ k: 'tariff', w: tariff });
            }

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
                dischargeAllowed,
                capTotalBudgetByPv,
                anyPvLimitedActive,
                anyGridAllowedActive,
                pvCapRawW: (typeof pvCapRawWState === 'number' && Number.isFinite(pvCapRawWState)) ? pvCapRawWState : null,
                pvCapW: (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : null,
                pvCapEffectiveW: (typeof pvCapEffectiveWState === 'number' && Number.isFinite(pvCapEffectiveWState)) ? pvCapEffectiveWState : null,
                pvAvailable: !!pvAvailableState,
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

        // ---------------------------------------------------------------------
        // Gate A: HARD GRID SAFETY CAPS (always top priority)
        // - Grid import limit (Netzanschlussleistung) based on live meter (W)
        // - Optional phase current limit (A) based on live meter (L1/L2/L3)
        // These caps apply regardless of Boost/PV modes and regardless of the selected budget mode.
        // ---------------------------------------------------------------------

        // Config sources for the grid connection import limit (W):
        // - installerConfig.gridConnectionPower (single source of truth)
        // - legacy fallback: PeakShaving.maxPowerW (only if EMS limit is not configured)
        // Phase 4.0: prefer centralized caps snapshot (ems.core) if available.
        const coreCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const coreGridCfgW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridConnectionLimitW_cfg, null) : null;
        const coreGridEffW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridImportLimitW_effective, null) : null;
        const coreGridMarginW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridSafetyMarginW, null) : null;
        const coreMaxPhaseA = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridMaxPhaseA_cfg, null) : null;

        const instLimitW = clamp(num(this.adapter?.config?.installerConfig?.gridConnectionPower, 0), 0, 1e12);
        const psLimitW = clamp(num(this.adapter?.config?.peakShaving?.maxPowerW, 0), 0, 1e12);
        const gridImportLimitW = (Number.isFinite(coreGridCfgW) && coreGridCfgW > 0)
            ? coreGridCfgW
            : ((typeof instLimitW === 'number' && Number.isFinite(instLimitW) && instLimitW > 0)
                ? instLimitW
                : ((typeof psLimitW === 'number' && Number.isFinite(psLimitW) && psLimitW > 0) ? psLimitW : 0));

        // Safety margin (W): prefer core snapshot, fallback to PeakShaving.safetyMarginW.
        const gridMarginW = (Number.isFinite(coreGridMarginW) && coreGridMarginW >= 0)
            ? coreGridMarginW
            : clamp(num(this.adapter?.config?.peakShaving?.safetyMarginW, 0), 0, 1e12);

        // Effective import cap (W): prefer core snapshot (may include Grid-Constraints / RLM caps).
        const gridImportLimitEffW = (Number.isFinite(coreGridEffW) && coreGridEffW > 0)
            ? coreGridEffW
            : (gridImportLimitW > 0 ? Math.max(0, gridImportLimitW - gridMarginW) : 0);

        // Optional phase limit (A): prefer core snapshot.
        const gridMaxPhaseA = (Number.isFinite(coreMaxPhaseA) && coreMaxPhaseA > 0)
            ? coreMaxPhaseA
            : clamp(num(this.adapter?.config?.peakShaving?.maxPhaseA, 0), 0, 20000);

        // Read grid power (import + / export -) if needed for caps
        const needGridSafetyCaps = gridImportLimitEffW > 0 || gridMaxPhaseA > 0;
        if (needGridSafetyCaps) {
            // Ensure we have a gridW reading even if PV logic is not active
            if (typeof gridW !== 'number' || !Number.isFinite(gridW)) {
                gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);
            }
        }

        // Derive base load and EVCS cap from import limit
        let gridBaseLoadW = null;
        let gridCapEvcsW = null;
        let gridCapBinding = false;
        const budgetBeforeGridCaps = budgetW;

        if (gridImportLimitEffW > 0 && typeof gridW === 'number' && Number.isFinite(gridW)) {
            // baseLoad includes everything except EV charging (approx.)
            gridBaseLoadW = gridW - (Number.isFinite(totalPowerW) ? totalPowerW : 0);
            // Max EVCS total to keep grid import under limit: baseLoad + EVCS <= limit
            gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, 1e12);

            // Apply cap (always)
            const before = budgetW;
            if (!Number.isFinite(budgetW)) {
                budgetW = gridCapEvcsW;
            } else {
                budgetW = Math.min(budgetW, gridCapEvcsW);
            }
            gridCapBinding = (Number.isFinite(gridCapEvcsW) && (before !== budgetW));

            if (!String(effectiveBudgetMode || '').includes('gridImport')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+gridImport`;
            }
        }

        // Phase-based cap (conservative: assumes additional power may hit the worst phase)
        let worstPhaseA = null;
        let phaseCapEvcsW = null;
        let phaseCapBinding = false;

        if (gridMaxPhaseA > 0) {
            const l1 = getFirstDpNumber(['ps.l1A']);
            const l2 = getFirstDpNumber(['ps.l2A']);
            const l3 = getFirstDpNumber(['ps.l3A']);
            const phases = [l1, l2, l3].filter(v => typeof v === 'number' && Number.isFinite(v));
            if (phases.length) {
                worstPhaseA = Math.max(...phases);
                const slackA = gridMaxPhaseA - worstPhaseA;
                // Conservative conversion: 1-phase equivalent (230V)
                const v = voltageV;
                phaseCapEvcsW = clamp((Number.isFinite(totalPowerW) ? totalPowerW : 0) + (Number.isFinite(slackA) ? slackA : 0) * v, 0, 1e12);

                const before = budgetW;
                if (!Number.isFinite(budgetW)) {
                    budgetW = phaseCapEvcsW;
                } else {
                    budgetW = Math.min(budgetW, phaseCapEvcsW);
                }
                phaseCapBinding = (Number.isFinite(phaseCapEvcsW) && (before !== budgetW));

                if (!String(effectiveBudgetMode || '').includes('phaseCap')) {
                    effectiveBudgetMode = `${effectiveBudgetMode}+phaseCap`;
                }
            } else {
                // No phase readings while a phase limit is configured => treat as stale (handled by stale logic below)
                worstPhaseA = null;
            }
        }

        // ---------------------------------------------------------------------
        // Gate A2: §14a EnWG cap (optional, provided by Para14aModule)
        // If active, cap the EVCS budget in addition to other safety caps.
        // ---------------------------------------------------------------------
        let para14aBinding = false;
        if (para14aActive && typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW) && para14aTotalCapW > 0) {
            const before = budgetW;
            if (!Number.isFinite(budgetW)) {
                budgetW = para14aTotalCapW;
            } else {
                budgetW = Math.min(budgetW, para14aTotalCapW);
            }
            para14aBinding = (before !== budgetW);

            if (!String(effectiveBudgetMode || '').includes('14a')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+14a`;
            }
        }

        // Publish cap diagnostics (even when caps are not configured)
        try {
            await this._queueState('chargingManagement.control.gridImportLimitW', gridImportLimitW || 0, true);
            await this._queueState('chargingManagement.control.gridImportLimitW_effective', gridImportLimitEffW || 0, true);
            await this._queueState('chargingManagement.control.gridImportW', (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : 0, true);
            await this._queueState('chargingManagement.control.gridBaseLoadW', (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : 0, true);
            await this._queueState('chargingManagement.control.gridCapEvcsW', (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : 0, true);
            await this._queueState('chargingManagement.control.gridCapBinding', !!gridCapBinding, true);
            await this._queueState('chargingManagement.control.gridMaxPhaseA', gridMaxPhaseA || 0, true);
            await this._queueState('chargingManagement.control.gridWorstPhaseA', (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : 0, true);
            await this._queueState('chargingManagement.control.gridPhaseCapEvcsW', (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : 0, true);
            await this._queueState('chargingManagement.control.phaseCapBinding', !!phaseCapBinding, true);

            // §14a transparency
            await this._queueState('chargingManagement.control.para14aActive', !!para14aActive, true);
            await this._queueState('chargingManagement.control.para14aMode', para14aMode || '', true);
            await this._queueState('chargingManagement.control.para14aCapEvcsW', (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : 0, true);
            await this._queueState('chargingManagement.control.para14aBinding', !!para14aBinding, true);
        } catch {
            // ignore
        }

        // Extend debug payload
        if (budgetDebug && typeof budgetDebug === 'object') {
            budgetDebug.gridImportLimitW = gridImportLimitW || 0;
            budgetDebug.gridImportLimitEffW = gridImportLimitEffW || 0;
            budgetDebug.gridW = (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null;
            budgetDebug.evcsActualW = (typeof totalPowerW === 'number' && Number.isFinite(totalPowerW)) ? totalPowerW : null;
            budgetDebug.gridBaseLoadW = (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : null;
            budgetDebug.gridCapEvcsW = (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : null;
            budgetDebug.gridCapBinding = !!gridCapBinding;
            budgetDebug.gridMaxPhaseA = gridMaxPhaseA || 0;
            budgetDebug.worstPhaseA = (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : null;
            budgetDebug.phaseCapEvcsW = (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : null;
            budgetDebug.phaseCapBinding = !!phaseCapBinding;
            budgetDebug.para14aActive = !!para14aActive;
            budgetDebug.para14aMode = para14aMode || '';
            budgetDebug.para14aCapEvcsW = (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : null;
            budgetDebug.para14aBinding = !!para14aBinding;
            budgetDebug.budgetBeforeSafetyCapsW = Number.isFinite(budgetBeforeGridCaps) ? budgetBeforeGridCaps : null;
            budgetDebug.budgetAfterSafetyCapsW = Number.isFinite(budgetW) ? budgetW : null;
        }

        const peakActive = await this._getPeakShavingActive();
        const pausedByPeakShaving = pauseWhenPeakShavingActive && peakActive;
        let pauseFollowPeakBudget = false;
        let pauseFollowGridCaps = false;

        // Gate C: Speicher-Unterstützung (optional)
        // Ziel: Bei hohem Speicher-SoC kann zusätzliche Ladeleistung durch Batterie-Entladung bereitgestellt werden,
        // ohne den Netzanschluss (Import-Limit) zu überlasten. Die Entladung wird über das Storage-Control-Modul umgesetzt.
        let storageSoC = getFirstDpNumber(['st.socPct']);
        let storageAssistW = 0;
        let storageAssistActive = false;

        try {
            const saEnabled = cfg.storageAssistEnabled === true;
            const saApply = (typeof cfg.storageAssistApply === 'string') ? cfg.storageAssistApply : 'boostOnly';
            const startSoc = clamp(num(cfg.storageAssistStartSocPct, 60), 0, 100);
            const stopSoc = clamp(num(cfg.storageAssistStopSocPct, 40), 0, 100);

            const maxW_cfg = num(cfg.storageAssistMaxDischargeW, 0);
            const maxW_storage = num(this.adapter && this.adapter.config && this.adapter.config.storage && this.adapter.config.storage.maxDischargeW, 0);
            const maxW = (Number.isFinite(maxW_cfg) && maxW_cfg > 0) ? maxW_cfg : (Number.isFinite(maxW_storage) ? maxW_storage : 0);

            const allowByMode = (saApply === 'boostAndAuto') ? true : !!anyBoostActive;

            if (saEnabled && allowByMode && anyGridAllowedActive && dischargeAllowed && !pausedByPeakShaving && maxW > 0 && Number.isFinite(storageSoC)) {
                // Hysterese: Start/Stop-Schwellen vermeiden Flattern
                if (this._storageAssistActive) {
                    if (storageSoC <= stopSoc) this._storageAssistActive = false;
                } else {
                    if (storageSoC >= startSoc) this._storageAssistActive = true;
                }
            } else {
                this._storageAssistActive = false;
            }

            storageAssistActive = !!this._storageAssistActive;

            // Nur sinnvoll, wenn das Budget aktuell durch Netz/Phase gedeckelt ist
            if (storageAssistActive && (gridCapBinding || phaseCapBinding) && maxW > 0) {
                const desiredExtra = Number.isFinite(budgetBeforeGridCaps) ? Math.max(0, budgetBeforeGridCaps - budgetW) : maxW;
                storageAssistW = clamp(Math.min(maxW, desiredExtra), 0, maxW);

                // Budget anheben: zusätzliche Leistung wird aus dem Speicher bereitgestellt (Storage-Control setzt Entladung)
                if (storageAssistW > 0 && Number.isFinite(budgetW)) {
                    budgetW = budgetW + storageAssistW;
                    if (!String(effectiveBudgetMode || '').includes('storageAssist')) {
                        effectiveBudgetMode = `${effectiveBudgetMode}+storageAssist`;
                    }
                }
            }

        } catch (_e) {
            // ignore
            this._storageAssistActive = false;
            storageAssistW = 0;
            storageAssistActive = false;
        }

        // Publish diagnostics for UI
        try {
            await this._queueState('chargingManagement.control.storageAssistSoCPct', Number.isFinite(storageSoC) ? storageSoC : 0, true);
            await this._queueState('chargingManagement.control.storageAssistActive', !!storageAssistActive, true);
            await this._queueState('chargingManagement.control.storageAssistW', Number.isFinite(storageAssistW) ? storageAssistW : 0, true);
        } catch {
            // ignore
        }


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

            // Gate A: If a phase limit is configured, phase current metering must be present and fresh.
            if (!staleMeter && gridMaxPhaseA > 0) {
                const phaseKeys = ['ps.l1A', 'ps.l2A', 'ps.l3A'];
                const configuredPhaseKeys = phaseKeys.filter(k => !!this.dp.getEntry(k));
                if (configuredPhaseKeys.length === 0) {
                    staleMeter = true;
                } else {
                    for (const k of configuredPhaseKeys) {
                        if (this.dp.isStale(k, staleTimeoutMs)) {
                            staleMeter = true;
                            break;
                        }
                    }
                }
            }

            // External budget datapoint (if used)
            if (!staleMeter && (budgetMode === 'fromDatapoint' || budgetMode === 'engine') && budgetPowerId && this.dp.getEntry('cm.budgetPowerW')) {
                staleBudget = this.dp.isStale('cm.budgetPowerW', staleTimeoutMs);
            }
        }

        // Peak-shaving-derived budget is a dynamic state; check ts/lc (if used)
        if (!staleMeter && !staleBudget && (budgetMode === 'fromPeakShaving' || budgetMode === 'engine')) {
            const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
            // Only treat as relevant if peak shaving is active or the user explicitly uses fromPeakShaving.
            const psActive = peakActive;
            if (budgetMode === 'fromPeakShaving' || psActive) staleBudget = !!psBudgetStale;
        }

        const staleRelevant = (mode !== 'off') && (staleMeter || staleBudget);

        if (staleRelevant) {
            const reason = ReasonCodes.STALE_METER;

            await this._queueState('chargingManagement.control.active', true, true);
            await this._queueState('chargingManagement.control.mode', mode, true);
            await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
            await this._queueState('chargingManagement.control.pausedByPeakShaving', false, true);
            await this._queueState('chargingManagement.control.status', 'failsafe_stale_meter', true);
            await this._queueState('chargingManagement.control.budgetW', 0, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', 0, true);

            // Phase 4.2: Even in failsafe, publish Gate A (Netz/Phasen) diagnostics so the
            // App-Center can show the configured grid limits. The control itself is still forced
            // to 0W/0A below.
            try {
                await this._queueState('chargingManagement.control.gridImportLimitW', (typeof gridImportLimitW === 'number' && Number.isFinite(gridImportLimitW)) ? gridImportLimitW : 0, true);
                await this._queueState('chargingManagement.control.gridImportLimitW_effective', (typeof gridImportLimitEffW === 'number' && Number.isFinite(gridImportLimitEffW)) ? gridImportLimitEffW : 0, true);
                await this._queueState('chargingManagement.control.gridImportW', (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : 0, true);
                await this._queueState('chargingManagement.control.gridBaseLoadW', (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : 0, true);
                await this._queueState('chargingManagement.control.gridCapEvcsW', (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : 0, true);
                await this._queueState('chargingManagement.control.gridCapBinding', false, true);

                await this._queueState('chargingManagement.control.worstPhaseA', (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : 0, true);
                await this._queueState('chargingManagement.control.phaseCapEvcsW', (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : 0, true);
                await this._queueState('chargingManagement.control.phaseCapBinding', false, true);
            } catch {
                // ignore
            }

            // Gate C: Speicher-Unterstützung in Failsafe immer deaktivieren
            this._storageAssistActive = false;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);

            await this._queueState('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

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

                if (w.online && (w.enabled || (!!w.cfgEnabled && !w.userEnabled))) {
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

                    const reasonToSet = (!!w.cfgEnabled && !w.userEnabled) ? ReasonCodes.CONTROL_DISABLED : reason;
                    await this._queueState(`${w.ch}.reason`, reasonToSet, true);
                } else {
                    await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online), true);
                }

                await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
                await this._queueState(`${w.ch}.targetPowerW`, 0, true);
                try { await this._queueState(`${w.ch}.stationRemainingW`, 0, true); } catch { /* ignore */ }
                await this._queueState(`${w.ch}.applied`, applied, true);
                await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
                if (applyWrites) {
                    try {
                        await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                    } catch {
                        await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                    }
                } else {
                    await this._queueState(`${w.ch}.applyWrites`, '{}', true);
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
                    targetW,
                    targetA,
                    applied,
                    applyStatus,
                    applyWrites,
                    reason: (w.online && (w.enabled || (!!w.cfgEnabled && !w.userEnabled))) ? ((!!w.cfgEnabled && !w.userEnabled) ? ReasonCodes.CONTROL_DISABLED : reason) : (w.staleAny ? ReasonCodes.STALE_METER : availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online)),
                });
            }

    
        // ---- Stations (DC multi-connector) diagnostics ----
        try {
            const stationKeys = Array.from(stationCapW.keys());
            await this._queueState('chargingManagement.stationCount', stationKeys.length, true);

            for (const sk of stationKeys) {
                const ch = await this._ensureStationChannel(sk);
                const cap = stationCapW.get(sk);
                const rem = stationRemainingW.get(sk);
                const used = (typeof cap === 'number' && Number.isFinite(cap) && typeof rem === 'number' && Number.isFinite(rem))
                    ? Math.max(0, cap - rem)
                    : 0;
                const headroom = (typeof rem === 'number' && Number.isFinite(rem)) ? Math.max(0, rem) : 0;
                let binding = false;
                if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0 && typeof rem === 'number' && Number.isFinite(rem)) {
                    const tol = Math.max(50, cap * 0.005); // 0.5% oder 50W
                    binding = rem <= tol;
                }

                const name = stationNameByKey.get(sk) || '';
                const targetSum = stationTargetSumW.get(sk) || 0;
                const cnt = stationConnectorCount.get(sk) || 0;
                const bc = stationBoostCount.get(sk) || 0;
                const pvc = stationPvLimitedCount.get(sk) || 0;
                const connsSet = stationConnectors.get(sk);
                const conns = connsSet ? Array.from(connsSet).filter(s => s).join(',') : '';

                await this._queueState(`${ch}.stationKey`, sk, true);
                await this._queueState(`${ch}.name`, name, true);
                await this._queueState(`${ch}.maxPowerW`, (typeof cap === 'number' && Number.isFinite(cap)) ? cap : 0, true);
                await this._queueState(`${ch}.remainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
                await this._queueState(`${ch}.usedW`, used, true);
                await this._queueState(`${ch}.binding`, !!binding, true);
                await this._queueState(`${ch}.headroomW`, headroom, true);
                await this._queueState(`${ch}.targetSumW`, targetSum, true);
                await this._queueState(`${ch}.connectorCount`, cnt, true);
                await this._queueState(`${ch}.boostConnectors`, bc, true);
                await this._queueState(`${ch}.pvLimitedConnectors`, pvc, true);
                await this._queueState(`${ch}.connectors`, conns, true);
                await this._queueState(`${ch}.lastUpdate`, Date.now(), true);
            }
        } catch {
            // ignore
        }

        await this._queueState('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
            await this._queueState('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
            await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);

            try {
                const s = JSON.stringify(debugAlloc);
                await this._queueState('chargingManagement.debug.allocations', s, true);
            } catch {
                await this._queueState('chargingManagement.debug.allocations', '[]', true);
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
        await this._queueState('chargingManagement.control.active', controlActive, true);
        await this._queueState('chargingManagement.control.mode', mode, true);
        await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
        await this._queueState('chargingManagement.control.pausedByPeakShaving', pausedByPeakShaving, true);

        if (mode === 'off') {
            await this._queueState('chargingManagement.control.status', 'off', true);
            await this._queueState('chargingManagement.control.budgetW', Number.isFinite(budgetW) ? budgetW : 0, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', Number.isFinite(budgetW) ? budgetW : 0, true);
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

            await this._queueState('chargingManagement.summary.totalTargetPowerW', 0, true);
            await this._queueState('chargingManagement.summary.totalTargetCurrentA', 0, true);
            await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
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
                    await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                }

                // Gate A: If PeakShaving is active but no dynamic budget is available (e.g. static mode),
                // fall back to the already computed hard grid safety caps instead of ramping to 0.
                if (!pauseFollowPeakBudget && (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW))) {
                    const before = budgetW;
                    if (!Number.isFinite(budgetW)) budgetW = gridCapEvcsW;
                    else budgetW = Math.min(budgetW, gridCapEvcsW);

                    // Keep effectiveBudgetMode as-is (it already includes +gridImport/+phaseCap when active)
                    await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                    pauseFollowGridCaps = true;
                }
            }

            // Default / safe pause behavior: ramp down to 0 (do not keep last setpoints)
            if (!pauseFollowPeakBudget) {
                const reason = ReasonCodes.PAUSED_BY_PEAK_SHAVING;

                await this._queueState('chargingManagement.control.active', true, true);
                await this._queueState('chargingManagement.control.mode', mode, true);
                await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                await this._queueState('chargingManagement.control.pausedByPeakShaving', true, true);
                await this._queueState('chargingManagement.control.status', 'paused_by_peak_shaving_ramp_down', true);
                await this._queueState('chargingManagement.control.budgetW', 0, true);
                await this._queueState('chargingManagement.control.usedW', 0, true);
                await this._queueState('chargingManagement.control.remainingW', 0, true);

            // Gate C: Speicher-Unterstützung in Failsafe immer deaktivieren
            this._storageAssistActive = false;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);

                await this._queueState('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

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

                        await this._queueState(`${w.ch}.reason`, reason, true);
                    } else {
                        await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online), true);
                    }

                    await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
                    await this._queueState(`${w.ch}.targetPowerW`, 0, true);
                    await this._queueState(`${w.ch}.applied`, applied, true);
                    await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
                    if (applyWrites) {
                        try {
                            await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                        } catch {
                            await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                        }
                    } else {
                        await this._queueState(`${w.ch}.applyWrites`, '{}', true);
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
                        reason: (w.enabled && w.online) ? reason : (w.staleAny ? ReasonCodes.STALE_METER : availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online)),
                    });

                    // totals stay 0
                    totalTargetPowerW += targetW;
                    if (Number.isFinite(targetA) && targetA > 0) totalTargetCurrentA += targetA;
                }

                try {
                    const s = JSON.stringify(debugAlloc);
                    await this._queueState('chargingManagement.debug.allocations', diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
                } catch {
                    await this._queueState('chargingManagement.debug.allocations', '[]', true);
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

                await this._queueState('chargingManagement.summary.totalTargetPowerW', 0, true);
                await this._queueState('chargingManagement.summary.totalTargetCurrentA', 0, true);
                await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
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

                // Zeit-Ziel Laden ("Depot-/Deadline-Laden") vor normaler Priorität:
                // - zuerst alle aktiven Ziel-Laden Sessions
                // - innerhalb Ziel-Laden: früheste Deadline zuerst, dann höchste benötigte Leistung
                const ag = a.goalActive ? 1 : 0;
                const bg = b.goalActive ? 1 : 0;
                if (ag !== bg) return bg - ag;
                if (ag && bg) {
                    const af = (Number.isFinite(a.goalFinishTs) && a.goalFinishTs > 0) ? a.goalFinishTs : Infinity;
                    const bf = (Number.isFinite(b.goalFinishTs) && b.goalFinishTs > 0) ? b.goalFinishTs : Infinity;
                    if (af !== bf) return af - bf;
                    const au = Number.isFinite(a.goalUrgency) ? a.goalUrgency : 0;
                    const bu = Number.isFinite(b.goalUrgency) ? b.goalUrgency : 0;
                    if (au !== bu) return bu - au;
                }

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

                // If everything is equal, keep the configured list order stable (installer can reorder in UI)
                const ao = Number.isFinite(a.orderIndex) ? a.orderIndex : 0;
                const bo = Number.isFinite(b.orderIndex) ? b.orderIndex : 0;
                if (ao !== bo) return ao - bo;

                const ask = String(a.safe || '');
                const bsk = String(b.safe || '');
                return ask.localeCompare(bsk);
            });


        // MU3.1.1 (Sprint 3.1): Optional round-robin fairness within station groups.
        // This keeps overall prioritization, but rotates the order of NON-boost connectors inside the same station
        // so that one connector does not always take the full station cap first.
        // Default behavior:
        // - Without stations (no cap): sequential (stable ordering)
        // - With stations (cap present): round-robin (fairness across connectors)
        const _stationAllocModeRaw = (cfg.stationAllocationMode !== undefined && cfg.stationAllocationMode !== null)
            ? String(cfg.stationAllocationMode).trim()
            : '';
        const stationAllocMode = String(_stationAllocModeRaw || (stationCapByKey && stationCapByKey.size ? 'roundrobin' : 'sequential')).trim().toLowerCase();
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
                // Ziel-Laden soll seine Priorität behalten: nicht in Round-Robin rotieren
                if (w.goalActive) continue;

                const arr = idxByStation.get(sk) || [];
                arr.push(i);
                idxByStation.set(sk, arr);
            }

            const rrIntervalMs = 10 * 1000; // rotate at most every 10s (serienreif, weniger UI-Flattern)
            for (const [sk, positions] of idxByStation.entries()) {
                const n = positions.length;
                if (n <= 1) continue;

                const prev = this._stationRoundRobinOffset.get(sk);
                let offset = (typeof prev === 'number' && Number.isFinite(prev) ? prev : 0) % n;

                const lastRot = this._stationRoundRobinLastRotateMs.get(sk);
                if (typeof lastRot !== 'number' || !Number.isFinite(lastRot) || lastRot <= 0) {
                    // first seen -> keep offset, start timer
                    this._stationRoundRobinLastRotateMs.set(sk, now);
                } else if ((now - lastRot) >= rrIntervalMs) {
                    offset = (offset + 1) % n;
                    this._stationRoundRobinOffset.set(sk, offset);
                    this._stationRoundRobinLastRotateMs.set(sk, now);
                }

                if (offset > 0) {
                    const elems = positions.map(pos => sorted[pos]);
                    const rotated = elems.slice(offset).concat(elems.slice(0, offset));
                    for (let j = 0; j < n; j++) {
                        sorted[positions[j]] = rotated[j];
                    }
                }
}
        }


        // MU3.1: expose allocation order for transparency
        for (let i = 0; i < sorted.length; i++) {
            const w = sorted[i];
            await this._queueState(`${w.ch}.allocationRank`, i + 1, true);
        }
        await this._queueState('chargingManagement.debug.sortedOrder', sorted.map(w => w.safe).join(','), true);


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

        // More specific budget limitation reason based on the active caps in this tick.
        // Used for per-connector diagnostics (without changing the underlying allocation math).
        const pickBudgetReason = () => {
            if (para14aActive && para14aBinding) return ReasonCodes.LIMITED_BY_14A;
            if (gridCapBinding && phaseCapBinding) return ReasonCodes.LIMIT_POWER_AND_PHASE;
            if (gridCapBinding) return ReasonCodes.LIMITED_BY_GRID_IMPORT;
            if (phaseCapBinding) return ReasonCodes.LIMITED_BY_PHASE_CAP;
            return ReasonCodes.LIMITED_BY_BUDGET;
        };

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
            let reason = pickBudgetReason();

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

            // Track which constraint is currently binding (helps to set a meaningful reason code)
            let limiter = 'none'; // 'station' | 'total' | 'pv' | 'none'
            try {
                const tol = 1e-6;
                if (Number.isFinite(availW)) {
                    // Station limit has precedence for diagnostics (hard cap, shared across connectors)
                    if (Number.isFinite(stationAvailW) && stationAvailW < Number.POSITIVE_INFINITY && stationAvailW <= (availW + tol)) {
                        limiter = 'station';
                    } else if (isPvOnly && Number.isFinite(pvAvailW) && pvAvailW < Number.POSITIVE_INFINITY && pvAvailW <= (availW + tol)) {
                        limiter = 'pv';
                    } else if (Number.isFinite(totalAvailW) && totalAvailW < Number.POSITIVE_INFINITY && totalAvailW <= (availW + tol)) {
                        limiter = 'total';
                    }
                }
            } catch {
                limiter = 'none';
            }

            // Helper for minpv diagnostics (we want to know if station/total was the cap)
            let minpvMaxTotal = null;

            // Raw target calculation
            if (w.controlBasis === 'none') {
                reason = ReasonCodes.NO_SETPOINT;
                targetW = 0;
                targetA = 0;
            } else if (isMinPv) {
                // min+pv: keep min from total budget (grid allowed), extra only from PV budget
                const maxTotal = Math.min(totalAvailW, stationAvailW, w.maxPW);
                minpvMaxTotal = maxTotal;
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
                reason = (isPvOnly && pvAvailW <= 0 && totalAvailW > 0) ? (ReasonCodes.NO_PV_SURPLUS) : ReasonCodes.NO_BUDGET;
            } else if (availW >= w.minPW || w.minPW === 0) {
                targetW = Math.min(availW, w.maxPW);
                reason = ReasonCodes.ALLOCATED;
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else {
                targetW = 0;
                reason = isPvOnly ? (ReasonCodes.NO_PV_SURPLUS) : ReasonCodes.BELOW_MIN;
            }

            // Refine reason codes for transparency: station caps, grid caps and user-defined limits.
            try {
                const budgetReason = pickBudgetReason();
                const stationFinite = (Number.isFinite(stationAvailW) && stationAvailW < Number.POSITIVE_INFINITY);
                const totalFinite = (Number.isFinite(totalAvailW) && totalAvailW < Number.POSITIVE_INFINITY);
                const tol = 1e-6;

                if (w.controlBasis !== 'none') {
                    // If we are fully blocked, prefer the hard limiter if it is obvious.
                    if (targetW <= 0) {
                        if (stationFinite && stationAvailW <= 0 && totalAvailW > 0 && (!isPvOnly || pvAvailW > 0)) {
                            reason = ReasonCodes.LIMITED_BY_STATION_CAP;
                        } else if (reason === ReasonCodes.NO_BUDGET && limiter === 'total') {
                            // Prefer a more specific budget reason (grid import / phase cap / §14a)
                            reason = budgetReason;
                        }
                    } else {
                        // Station is the binding min (hard shared cap)
                        if (stationFinite && stationAvailW < w.maxPW - tol) {
                            const nearStation = Math.abs(targetW - Math.min(stationAvailW, w.maxPW)) <= Math.max(1, 0.01 * w.maxPW);
                            if ((limiter === 'station' && nearStation) || (isMinPv && Number.isFinite(minpvMaxTotal) && minpvMaxTotal === stationAvailW && nearStation)) {
                                reason = ReasonCodes.LIMITED_BY_STATION_CAP;
                            }
                        }

                        // Total budget is binding (grid/phase/§14a)
                        if (totalFinite && totalAvailW < w.maxPW - tol) {
                            const nearTotal = Math.abs(targetW - Math.min(totalAvailW, w.maxPW)) <= Math.max(1, 0.01 * w.maxPW);
                            if ((limiter === 'total' && nearTotal) || (isMinPv && Number.isFinite(minpvMaxTotal) && minpvMaxTotal === totalAvailW && nearTotal)) {
                                // Do not override a station cap reason if station is already the limiting factor.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP) {
                                    reason = budgetReason;
                                }
                            }
                        }

                        // User cap: budgets allow more than maxPW, but local limit blocks.
                        if (reason !== ReasonCodes.UNLIMITED && w.userLimitSet && w.maxPW > 0) {
                            const budgetsAllowMore = (!Number.isFinite(availW)) || (availW > (w.maxPW + 1));
                            if (budgetsAllowMore && targetW >= (w.maxPW - Math.max(1, 0.01 * w.maxPW))) {
                                // Only if we are not already clearly limited by station or budget.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP && reason !== budgetReason) {
                                    reason = ReasonCodes.LIMITED_BY_USER_LIMIT;
                                }
                            }
                        }

                        // §14a per-connector cap: budgets allow more than the effective maxPW, but §14a limits the connector.
                        if (para14aActive && w.para14aCapped && w.maxPW > 0) {
                            const budgetsAllowMore = (!Number.isFinite(availW)) || (availW > (w.maxPW + 1));
                            if (budgetsAllowMore && targetW >= (w.maxPW - Math.max(1, 0.01 * w.maxPW))) {
                                // Only override if station cap is not the dominant limiter.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP) {
                                    reason = ReasonCodes.LIMITED_BY_14A;
                                }
                            }
                        }
                    }
                }
            } catch {
                // ignore
            }

            // Zeit-Ziel Laden: Wenn aktiv, die Leistung auf den errechneten Durchschnitt begrenzen
            // (so können mehrere Fahrzeuge im Depot parallel "bis Uhrzeit X" geplant werden).
            if (w.goalActive && w.goalDesiredW > 0 && effMode !== 'boost') {
                let desired = Math.min(w.maxPW, Math.max(0, w.goalDesiredW));

                // Smart‑Ziel: wenn der Preis gerade klar "günstig" ist, darf das Ziel-Laden etwas früher vorladen,
                // um in teureren Phasen später weniger laden zu müssen. Das bleibt ein Cap (kein Zwang),
                // Budgets/Stationslimits bleiben dominant.
                if (goalStrategy === 'smart' && isCheapNow && !isPvOnly) {
                    desired = Math.min(w.maxPW, desired * goalCheapBoostFactor);
                }
                if (Number.isFinite(desired) && desired >= 0) {
                    // Nur begrenzen (nicht nach oben erzwingen) – PV-/Budget- und Stationslimits bleiben gültig.
                    if (targetW > desired + 1) {
                        targetW = desired;
                    }
                }
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

            // Ziel-Laden: Shortfall & Status Update (nach Quantisierung/Ramp)
            try {
                let goalShortfallNow = 0;
                let goalStatusNow = String(w.goalStatus || (w.goalEnabled ? 'active' : 'inactive'));

                if (!w.goalEnabled) {
                    goalStatusNow = 'inactive';
                    goalShortfallNow = 0;
                } else if (w.goalStatus === 'reached' || w.goalStatus === 'no_soc' || w.goalStatus === 'no_index' || w.goalStatus === 'no_deadline') {
                    goalStatusNow = String(w.goalStatus);
                    goalShortfallNow = 0;
                } else if (w.goalActive && w.goalDesiredW > 0) {
                    goalShortfallNow = Math.max(0, Math.round(w.goalDesiredW - cmdW));
                    if (w.goalOverdue) {
                        goalStatusNow = 'overdue';
                    // Allow some measurement/rounding deviation (e.g. 200–300 W) before flagging "Unterversorgung".
                    } else if (goalShortfallNow > 300) {
                        goalStatusNow = 'shortfall';
                    } else {
                        goalStatusNow = 'active';
                    }
                } else {
                    goalShortfallNow = 0;
                }

                await this._queueState(`${w.ch}.goalShortfallW`, goalShortfallNow, true);
                await this._queueState(`${w.ch}.goalStatus`, goalStatusNow, true);
            } catch {
                // ignore
            }

            await this._queueState(`${w.ch}.targetCurrentA`, cmdA, true);
            await this._queueState(`${w.ch}.targetPowerW`, cmdW, true);
            // Stationsgruppe: verbleibendes Stationsbudget (nach Abzug dieses Connectors)
            try {
                const rem = (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey))
                    ? stationRemainingW.get(w.stationKey)
                    : null;
                await this._queueState(`${w.ch}.stationRemainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
            } catch {
                // ignore
            }
            await this._queueState(`${w.ch}.applied`, applied, true);
            await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
            if (applyWrites) {
                try {
                    await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                } catch {
                    await this._queueState(`${w.ch}.applyWrites`, '', true);
                }
            } else {
                await this._queueState(`${w.ch}.applyWrites`, '', true);
            }
            await this._queueState(`${w.ch}.reason`, reason, true);

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

        // wallboxes that are disabled/offline: expose targets as 0
        // Special case: if the installer enabled the chargepoint, but the end-customer
        // switched off the EMS regulation (userEnabled=false), we actively write a 0-setpoint
        // (and disable via enableKey, if present). This releases any previous commanded setpoint
        // and guarantees a safe "Regelung AUS" behavior.
        for (const w of wbList) {
            if (w.enabled && w.online) continue;

            let applied = false;
            let applyStatus = 'skipped';
            /** @type {any|null} */
            let applyWrites = null;

            // Regelung AUS (user): force a safe stop while staying online
            if (!!w.cfgEnabled && !!w.online && !w.userEnabled) {
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
                    const res = await applySetpoint(
                        { adapter: this.adapter, dp: this.dp },
                        consumer,
                        { targetW: 0, targetA: 0, basis: w.controlBasis, enable: false },
                    );
                    applied = !!res?.applied;
                    applyStatus = String(res?.status || (applied ? 'applied' : 'write_failed'));
                    applyWrites = res?.writes || null;
                } else {
                    applyStatus = 'no_dp_registry';
                }
            }

            await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
            await this._queueState(`${w.ch}.targetPowerW`, 0, true);
            await this._queueState(`${w.ch}.applied`, applied, true);
            await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
            if (applyWrites) {
                try {
                    await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                } catch {
                    await this._queueState(`${w.ch}.applyWrites`, '', true);
                }
            } else {
                await this._queueState(`${w.ch}.applyWrites`, '', true);
            }
            await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online), true);
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
            await this._queueState('chargingManagement.debug.allocations', s.length > diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
        } catch {
            await this._queueState('chargingManagement.debug.allocations', '[]', true);
        }

        // Gate A: expose which top-level limiter is active
        let finalStatus = 'ok';
        if (pauseFollowPeakBudget) {
            finalStatus = pauseFollowGridCaps ? 'peak_active_follow_grid_caps' : 'peak_active_follow_peak_budget';
        } else if (gridCapBinding && phaseCapBinding) {
            finalStatus = 'limited_grid_import_and_phase';
        } else if (gridCapBinding) {
            finalStatus = 'limited_grid_import';
        } else if (phaseCapBinding) {
            finalStatus = 'limited_phase_cap';
        }
        await this._queueState('chargingManagement.control.status', finalStatus, true);
        await this._queueState('chargingManagement.control.budgetW', Number.isFinite(budgetW) ? budgetW : 0, true);
        await this._queueState('chargingManagement.control.usedW', Number.isFinite(budgetW) ? usedW : totalTargetPowerW, true);
        await this._queueState('chargingManagement.control.remainingW', Number.isFinite(budgetW) ? remainingW : 0, true);

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

        await this._queueState('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
        await this._queueState('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
        await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
    }
}

module.exports = { ChargingManagementModule };