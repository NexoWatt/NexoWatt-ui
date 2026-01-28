'use strict';

/**
 * Universal datapoint registry for manufacturer-independent configuration.
 *
 * The registry stores:
 * - key -> objectId mapping
 * - optional transforms (scale, offset, invert, min/max, deadband)
 * - a value cache fed by stateChange events
 *
 * Modules may upsert additional datapoints derived from their module configuration.
 */
// Unit auto-scaling helpers (e.g., convert kW -> W when a device reports in kW but EMS expects W)
function _normalizeUnit(unit) {
    if (!unit) return '';
    return String(unit).trim().replace(/\s+/g, '').toLowerCase();
}

function _computeUnitScale(fromUnit, toUnit) {
    const from = _normalizeUnit(fromUnit);
    const to = _normalizeUnit(toUnit);
    if (!from || !to || from === to) return 1;

    // Power family (base: W)
    const POWER = { w: 1, kw: 1e3, mw: 1e6, gw: 1e9 };
    // Energy family (base: Wh)
    const ENERGY = { wh: 1, kwh: 1e3, mwh: 1e6, gwh: 1e9 };

    if (Object.prototype.hasOwnProperty.call(POWER, from) && Object.prototype.hasOwnProperty.call(POWER, to)) {
        return POWER[from] / POWER[to];
    }
    if (Object.prototype.hasOwnProperty.call(ENERGY, from) && Object.prototype.hasOwnProperty.call(ENERGY, to)) {
        return ENERGY[from] / ENERGY[to];
    }

    return 1;
}

class DatapointRegistry {
    /**
     * @param {any} adapter
     * @param {Array<any>} entries
     */
    constructor(adapter, entries) {
        this.adapter = adapter;

        /** @type {Map<string, any>} */
        this.byKey = new Map();

        /** @type {Map<string, string>} */
        this.keyByObjectId = new Map();

        /** @type {Map<string, {val:any, ts:number, ack:boolean}>} */
        this.cacheByObjectId = new Map();

        /** @type {Map<string, {val:any, ts:number}>} */
        this.lastWriteByObjectId = new Map();

        this._initEntries = Array.isArray(entries) ? entries : [];
    }

    async init() {
        for (const e of this._initEntries) {
            await this.upsert(e);
        }
    }

    /**
     * Add or update a datapoint mapping. Preserves existing transform settings if a new entry omits them.
     * @param {any} entry
     */
    async upsert(entry) {
        if (!entry) return;
        const key = String(entry.key || '').trim();
        const objectId = String(entry.objectId || entry.id || '').trim();
        if (!key || !objectId) return;

        const prev = this.byKey.get(key);

        const normalized = {
            key,
            name: entry.name || prev?.name || '',
            objectId,
            dataType: entry.dataType || prev?.dataType || entry.type || 'number',
            direction: entry.direction || prev?.direction || entry.dir || 'in',
            unit: entry.unit || prev?.unit || '',
            unitIn: prev?.unitIn || '',
            unitScale: (prev?.unitScale !== undefined ? Number(prev.unitScale) : 1),
            scale: (entry.scale !== undefined ? Number(entry.scale) : prev?.scale),
            offset: (entry.offset !== undefined ? Number(entry.offset) : prev?.offset),
            invert: (entry.invert !== undefined ? !!entry.invert : prev?.invert),
            deadband: (entry.deadband !== undefined ? Number(entry.deadband) : prev?.deadband),
            // If set (>0), a duplicate write (within deadband) is forced after this time.
            // Useful for devices/adapters that expect periodic refresh (e.g. some EVCS/OCPP stacks).
            maxWriteIntervalMs: (entry.maxWriteIntervalMs !== undefined ? Number(entry.maxWriteIntervalMs) : prev?.maxWriteIntervalMs),
            min: (entry.min !== undefined ? Number(entry.min) : prev?.min),
            max: (entry.max !== undefined ? Number(entry.max) : prev?.max),
            note: entry.note || prev?.note || '',
        };

        if (!Number.isFinite(normalized.scale)) normalized.scale = 1;
        if (!Number.isFinite(normalized.offset)) normalized.offset = 0;
        if (!Number.isFinite(normalized.deadband)) normalized.deadband = 0;
        if (!Number.isFinite(normalized.maxWriteIntervalMs) || normalized.maxWriteIntervalMs < 0) normalized.maxWriteIntervalMs = 0;

        // min/max: keep undefined if invalid
        if (!Number.isFinite(normalized.min)) normalized.min = undefined;
        if (!Number.isFinite(normalized.max)) normalized.max = undefined;



        // Auto unit scaling based on source object's unit (common.unit)
        // Example: meter reports 0.73 kW but EMS expects W -> multiply by 1000 internally.
        if (typeof this.adapter.getForeignObjectAsync === 'function') {
            try {
                const obj = await this.adapter.getForeignObjectAsync(objectId);
                const inUnit = obj?.common?.unit;
                normalized.unitIn = inUnit ? String(inUnit) : '';
                const factor = _computeUnitScale(normalized.unitIn, normalized.unit);
                if (Number.isFinite(factor) && factor !== 0 && factor !== 1) {
                    // Avoid obvious double scaling if user already applied the same factor via `scale`.
                    const eps = 1e-9;
                    const invFactor = factor !== 0 ? 1 / factor : 0;
                    if (Math.abs(normalized.scale - factor) < eps || Math.abs(normalized.scale - invFactor) < eps) {
                        normalized.unitScale = 1;
                    } else {
                        normalized.unitScale = factor;
                    }
                } else {
                    normalized.unitScale = 1;
                }
            } catch (e) {
                // ignore
            }
        }
        this.byKey.set(key, normalized);
        this.keyByObjectId.set(objectId, key);

        // Subscribe (idempotent; the runtime tolerates multiple subscribe calls)
        try {
            await this.adapter.subscribeForeignStatesAsync(objectId);
        } catch (e) {
            this.adapter.log.warn(`Datapoint subscribe failed for '${objectId}': ${e?.message || e}`);
        }

        // Prime cache
        try {
            const st = await this.adapter.getForeignStateAsync(objectId);
            if (st) this.handleStateChange(objectId, st);
        } catch (e) {
            // ignore (not all foreign states exist immediately)
        }
    }

    /**
     * Feed cache from adapter stateChange.
     * @param {string} id
     * @param {any | null | undefined} state
     */
    handleStateChange(id, state) {
        if (!id) return;
        if (!state) {
            this.cacheByObjectId.delete(id);
            return;
        }
        this.cacheByObjectId.set(id, { val: state.val, ts: state.ts || Date.now(), ack: !!state.ack });
    }

    /**
     * @param {string} key
     * @returns {any|null}
     */
    getEntry(key) {
        return this.byKey.get(String(key || '').trim()) || null;
    }

    /**
     * @param {string} key
     * @returns {any|null}
     */
    getRaw(key) {
        const e = this.getEntry(key);
        if (!e) return null;
        const c = this.cacheByObjectId.get(e.objectId);
        return c ? c.val : null;
    }

    /**
     * Age of the cached datapoint value in milliseconds.
     * If the datapoint is unknown or not cached yet, returns +Infinity.
     *
     * @param {string} key
     * @returns {number}
     */
    getAgeMs(key) {
        const e = this.getEntry(key);
        if (!e) return Number.POSITIVE_INFINITY;
        const c = this.cacheByObjectId.get(e.objectId);
        const ts = c && Number.isFinite(c.ts) ? Number(c.ts) : null;
        if (!ts) return Number.POSITIVE_INFINITY;
        const age = Date.now() - ts;
        return age >= 0 ? age : 0;
    }

    /**
     * Returns true if the cached value is older than maxAgeMs.
     * If the datapoint is unknown/not cached, it is treated as stale.
     *
     * @param {string} key
     * @param {number} maxAgeMs
     * @returns {boolean}
     */
    isStale(key, maxAgeMs) {
        const age = this.getAgeMs(key);
        if (!Number.isFinite(age)) return true;
        if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return age === Number.POSITIVE_INFINITY;
        return age > maxAgeMs;
    }

    /**
     * Read a numeric datapoint only if it is fresh.
     *
     * @param {string} key
     * @param {number} maxAgeMs
     * @param {number|null} fallback
     * @returns {number|null}
     */
    getNumberFresh(key, maxAgeMs, fallback = null) {
        if (this.isStale(key, maxAgeMs)) return fallback;
        return this.getNumber(key, fallback);
    }

/**
     * @param {string} key
     * @param {number|null} fallback
     */
    getNumber(key, fallback = null) {
        const e = this.getEntry(key);
        if (!e) return fallback;
        const raw = this.getRaw(key);
        let n;
        if (typeof raw === 'number') {
            n = raw;
        } else if (typeof raw === 'string') {
            let s = raw.trim();
            // Support German decimal comma and common thousands separators.
            // - '0,40' => 0.40
            // - '31,5' => 31.5
            // - '1.234,56' => 1234.56
            // - '1,234.56' => 1234.56
            if (s.includes(',')) {
                // German/European format: '.' are thousands separators, ',' is decimal separator
                s = s.replace(/\./g, '').replace(/,/g, '.');
            } else {
                // English format: ',' may be thousands separator
                s = s.replace(/,/g, '');
            }
            n = Number(s);
        } else {
            n = Number(raw);
        }
        if (!Number.isFinite(n)) return fallback;

        let v = n;
        if (Number.isFinite(e.unitScale) && e.unitScale !== 1) v = v * e.unitScale;
        if (e.invert) v = -v;
        v = v * e.scale + e.offset;

        if (typeof e.min === 'number' && Number.isFinite(e.min)) v = Math.max(e.min, v);
        if (typeof e.max === 'number' && Number.isFinite(e.max)) v = Math.min(e.max, v);

        return v;
    }

    /**
     * @param {string} key
     * @param {boolean|null} fallback
     */
    getBoolean(key, fallback = null) {
        const e = this.getEntry(key);
        if (!e) return fallback;
        const raw = this.getRaw(key);
        if (raw === null || raw === undefined) return fallback;

        let b = !!raw;
        if (typeof raw === 'string') {
            const s = raw.trim().toLowerCase();
            if (s === 'false' || s === '0' || s === 'off' || s === 'disabled') b = false;
            if (s === 'true' || s === '1' || s === 'on' || s === 'enabled') b = true;
        }
        if (e.invert) b = !b;
        return b;
    }

    /**
     * Writes a numeric value in *physical* units (after transform).
     * The registry performs reverse transform before writing to the raw datapoint.
     * @param {string} key
     * @param {number} value
     * @param {boolean} [ack=false]
     */
    async writeNumber(key, value, ack = false) {
        const e = this.getEntry(key);
        if (!e) return false;

        let v = Number(value);
        if (!Number.isFinite(v)) return false;

        // clamp in physical space
        if (typeof e.min === 'number' && Number.isFinite(e.min)) v = Math.max(e.min, v);
        if (typeof e.max === 'number' && Number.isFinite(e.max)) v = Math.min(e.max, v);

        // reverse transform
        let raw = (v - e.offset) / (e.scale || 1);
        if (e.invert) raw = -raw;

        if (Number.isFinite(e.unitScale) && e.unitScale !== 1) raw = raw / e.unitScale;

        // deadband in physical space against last written value
        const last = this.lastWriteByObjectId.get(e.objectId);
        if (last && Number.isFinite(last.val) && e.deadband > 0 && Math.abs(v - last.val) < e.deadband) {
            // No write needed (idempotent) unless a periodic refresh is configured.
            const maxAge = Number(e.maxWriteIntervalMs);
            const ageOk = Number.isFinite(maxAge) && maxAge > 0 && Number.isFinite(last.ts) && (Date.now() - last.ts) >= maxAge;
            if (!ageOk) {
                return null;
            }
        }

        try {
            await this.adapter.setForeignStateAsync(e.objectId, raw, ack);
            this.lastWriteByObjectId.set(e.objectId, { val: v, ts: Date.now() });
            return true;
        } catch (err) {
            this.adapter.log.warn(`Datapoint write failed for '${e.objectId}': ${err?.message || err}`);
            return false;
        }
    }

    /**
     * @param {string} key
     * @param {boolean} value
     * @param {boolean} [ack=false]
     */
    async writeBoolean(key, value, ack = false) {
        const e = this.getEntry(key);
        if (!e) return false;

        let b = !!value;
        if (e.invert) b = !b;

        // idempotent: skip if unchanged (based on last written physical value)
        const last = this.lastWriteByObjectId.get(e.objectId);
        const phys = b ? 1 : 0;
        if (last && typeof last.val !== 'undefined' && Number.isFinite(last.val) && Number(last.val) === phys) {
            return null;
        }

        try {
            await this.adapter.setForeignStateAsync(e.objectId, b, ack);
            this.lastWriteByObjectId.set(e.objectId, { val: b ? 1 : 0, ts: Date.now() });
            return true;
        } catch (err) {
            this.adapter.log.warn(`Datapoint write failed for '${e.objectId}': ${err?.message || err}`);
            return false;
        }
    }
}

module.exports = { DatapointRegistry };
