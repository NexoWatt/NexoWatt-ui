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

        // -----------------------------------------------------------------
        // Freshness helpers (anti false-stale)
        //
        // Some sources (esp. ioBroker aliases and/or device adapters that only write
        // on value change) can keep a *valid* measurement constant for minutes.
        // If we only look at the datapoint's own state.ts, we may trigger false
        // "failsafe stale meter" although the device is still communicating.
        //
        // For selected inputs we therefore allow a "group heartbeat": if *any*
        // state below a derived prefix updates, the group is considered alive.
        //
        // Example:
        //   nexowatt-devices.0.devices.meter1.r.power   (stable)
        //   nexowatt-devices.0.devices.meter1.r.voltageL1 (updates)
        // The group prefix "...devices.meter1." stays fresh and prevents false staleness.
        // -----------------------------------------------------------------

        /** @type {Map<string, number>} */
        this._alivePrefixTs = new Map();

        // Performance helpers
        // Some modules (e.g. charging management with many EVCS) upsert datapoints
        // on every engine tick. Without caching this can hammer the objects/states DB.

        /** @type {Set<string>} */
        this._subscribedObjectIds = new Set();

        /** @type {Set<string>} */
        this._primedObjectIds = new Set();

        /** @type {Map<string, string>} */
        this._unitByObjectId = new Map();

        /** @type {Map<string, number>} */
        this._unitFetchAttemptMs = new Map();

        /** @type {Map<string, string>} */
        this._aliasIdByObjectId = new Map();

        /** @type {Map<string, number>} */
        this._aliasFetchAttemptMs = new Map();


        // Retry interval for unit detection (common.unit) via getForeignObjectAsync
        this._unitRetryMs = 10 * 60 * 1000; // 10 min

        this._initEntries = Array.isArray(entries) ? entries : [];
    }

    /**
     * Derive a stable "device prefix" from a datapoint id.
     * If the id matches a known device structure (e.g. nexowatt-devices.*.devices.<name>.*)
     * we return that device root. Otherwise we fall back to the parent channel prefix.
     *
     * Returned prefixes always end with a dot, so they can be used as startsWith() match.
     *
     * @param {string} id
     * @returns {string}
     */
    _deriveAlivePrefix(id) {
        const s = String(id || '').trim();
        if (!s) return '';

        // NexoWatt device adapter structure
        //   <adapter>.<inst>.devices.<deviceKey>.<...>
        // => prefix = <adapter>.<inst>.devices.<deviceKey>.
        const m = s.match(/^(.*?\.devices\.[^.]+)\./);
        if (m && m[1]) return `${m[1]}.`;

        // Generic fallback: parent channel
        const lastDot = s.lastIndexOf('.');
        if (lastDot > 0) return `${s.slice(0, lastDot + 1)}`;

        return '';
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
            unitIn: (prev && prev.objectId === objectId) ? (prev.unitIn || '') : '',
            unitScale: (prev && prev.objectId === objectId && prev.unitScale !== undefined ? Number(prev.unitScale) : 1),
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

            // Freshness group / heartbeat
            useAliveForStale: (entry.useAliveForStale !== undefined ? !!entry.useAliveForStale : (prev?.useAliveForStale || false)),
            alivePrefix: (entry.alivePrefix !== undefined && entry.alivePrefix !== null) ? String(entry.alivePrefix || '') : (prev?.alivePrefix || ''),
        };

        if (!Number.isFinite(normalized.scale)) normalized.scale = 1;
        if (!Number.isFinite(normalized.offset)) normalized.offset = 0;
        if (!Number.isFinite(normalized.deadband)) normalized.deadband = 0;
        if (!Number.isFinite(normalized.maxWriteIntervalMs) || normalized.maxWriteIntervalMs < 0) normalized.maxWriteIntervalMs = 0;

        // min/max: keep undefined if invalid
        if (!Number.isFinite(normalized.min)) normalized.min = undefined;
        if (!Number.isFinite(normalized.max)) normalized.max = undefined;

        // -----------------------------------------------------------------
        // Unit detection / caching (common.unit)
        // With many EVCS, datapoints can be upserted on every tick.
        // Avoid hammering the objects DB by caching the detected unit.
        // -----------------------------------------------------------------
        let unitIn = '';
        if (this._unitByObjectId.has(objectId)) {
            unitIn = String(this._unitByObjectId.get(objectId) || '');
        } else if (normalized.unitIn) {
            unitIn = String(normalized.unitIn || '');
        }

        // ioBroker alias support: for inputs we want freshness/value from the alias target
        // because alias states themselves may not emit state changes / timestamps.
        let aliasId = '';
        if (this._aliasIdByObjectId.has(objectId)) {
            aliasId = String(this._aliasIdByObjectId.get(objectId) || '');
        } else if (prev && prev.objectId === objectId && prev.aliasId) {
            aliasId = String(prev.aliasId || '');
        }

        const now = Date.now();
        const lastUnitAttempt = Number(this._unitFetchAttemptMs.get(objectId) || 0);
        const lastAliasAttempt = Number(this._aliasFetchAttemptMs.get(objectId) || 0);
        const lastAttempt = Math.max(lastUnitAttempt, lastAliasAttempt);

        const needUnitFetch = (!this._unitByObjectId.has(objectId) || unitIn === '');
        const needAliasFetch = !this._aliasIdByObjectId.has(objectId);
        const shouldAttemptObjectFetch =
            typeof this.adapter.getForeignObjectAsync === 'function' &&
            (!lastAttempt || (now - lastAttempt) > this._unitRetryMs) &&
            (needUnitFetch || needAliasFetch);

        if (shouldAttemptObjectFetch) {
            this._unitFetchAttemptMs.set(objectId, now);
            this._aliasFetchAttemptMs.set(objectId, now);
            try {
                const obj = await this.adapter.getForeignObjectAsync(objectId);
                if (needUnitFetch) {
                    const inUnit = obj?.common?.unit;
                    unitIn = inUnit ? String(inUnit) : '';
                }
                const aId = obj?.common?.alias?.id;
                aliasId = aId ? String(aId) : '';
            } catch (_e) {
                // ignore
            }
            // Cache even empty to avoid hammering the objects DB.
            this._unitByObjectId.set(objectId, unitIn || '');
            this._aliasIdByObjectId.set(objectId, aliasId || '');
        } else {
            // Remember previously known unit/alias (even if discovered via old entries)
            if (!this._unitByObjectId.has(objectId)) {
                this._unitByObjectId.set(objectId, unitIn || '');
            }
            if (!this._aliasIdByObjectId.has(objectId)) {
                this._aliasIdByObjectId.set(objectId, aliasId || '');
            }
        }

        // If this mapping uses an ioBroker alias, prefer the unit of the alias target.
        // Reason: values/freshness come from srcObjectId (= aliasId) but the alias object itself
        // may have no unit or an incorrect display unit.
        if (aliasId) {
            const cachedAliasUnit = this._unitByObjectId.get(aliasId);
            if (cachedAliasUnit !== undefined) {
                const u = String(cachedAliasUnit || '');
                if (u) unitIn = u;
            } else if (typeof this.adapter.getForeignObjectAsync === 'function') {
                const lastAliasUnitAttempt = Number(this._unitFetchAttemptMs.get(aliasId) || 0);
                if (!lastAliasUnitAttempt || (now - lastAliasUnitAttempt) > this._unitRetryMs) {
                    this._unitFetchAttemptMs.set(aliasId, now);
                    try {
                        const aObj = await this.adapter.getForeignObjectAsync(aliasId);
                        const u = aObj?.common?.unit;
                        const uStr = u ? String(u) : '';
                        this._unitByObjectId.set(aliasId, uStr || '');
                        if (uStr) unitIn = uStr;
                    } catch (_e) {
                        // Cache empty to avoid repeated DB roundtrips; retry after _unitRetryMs
                        this._unitByObjectId.set(aliasId, '');
                    }
                }
            }
        }

        normalized.unitIn = unitIn || '';
        normalized.aliasId = aliasId || '';
        normalized.srcObjectId = normalized.aliasId || normalized.objectId;

        // Derive (or update) alivePrefix if enabled
        // IMPORTANT: If objectId is a NexoWatt-device adapter alias wrapper (..devices.<key>..),
        // we must derive the heartbeat prefix from the *wrapper* (objectId), not from the alias target (srcObjectId).
        // Otherwise we lose the device-level comm.connected / heartbeat updates and can get false STALE_METER.
        try {
            if (normalized.useAliveForStale) {
                const keepPrevPrefix = !!(prev && prev.objectId === normalized.objectId && prev.srcObjectId === normalized.srcObjectId && prev.alivePrefix);

                // Prefer device prefix from wrapper objectId if it matches the NexoWatt device structure.
                const objPrefix = this._deriveAlivePrefix(normalized.objectId);
                const objLooksDevice = !!(objPrefix && String(objPrefix).includes('.devices.'));
                const preferPrefix = objLooksDevice ? objPrefix : '';

                if (!normalized.alivePrefix || !keepPrevPrefix) {
                    normalized.alivePrefix = preferPrefix || this._deriveAlivePrefix(normalized.srcObjectId || normalized.objectId);
                }

                // Normalize prefix formatting
                if (normalized.alivePrefix && !normalized.alivePrefix.endsWith('.')) normalized.alivePrefix = `${normalized.alivePrefix}.`;
            } else {
                normalized.alivePrefix = '';
            }
        } catch (_e) {
            normalized.alivePrefix = normalized.alivePrefix || '';
        }

        // Connection indicators for stale detection.
        // Many meters/adapters write *only on value change*, so state.ts can get old even while the device is
        // communicating fine. For NexoWatt device-adapter structures we can additionally use:
        //   <...devices.<deviceKey>.comm.connected> (per device)
        // and the standard ioBroker adapter flag:
        //   <adapter>.<instance>.info.connection
        // If either indicates "connected", we treat the datapoint as alive and suppress false STALE_METER.
        normalized.aliveConnectedId = '';
        normalized.infoConnectionId = '';
        try {
            if (normalized.useAliveForStale) {
                if (normalized.alivePrefix) {
                    normalized.aliveConnectedId = `${normalized.alivePrefix}comm.connected`;
                }
                const srcForInst = (normalized.alivePrefix && String(normalized.alivePrefix).includes('.devices.')) ? String(normalized.objectId || '') : String(normalized.srcObjectId || normalized.objectId || '');
                const inst = srcForInst.match(/^([^.]+\.\d+)\./);
                if (inst && inst[1]) {
                    normalized.infoConnectionId = `${inst[1]}.info.connection`;
                }
            }
        } catch (_e) {
            normalized.aliveConnectedId = normalized.aliveConnectedId || '';
            normalized.infoConnectionId = normalized.infoConnectionId || '';
        }

        // Register prefix immediately so future state changes can update the heartbeat,
        // even if the datapoint itself has not been primed yet.
        try {
            if (normalized.useAliveForStale && normalized.alivePrefix && !this._alivePrefixTs.has(normalized.alivePrefix)) {
                this._alivePrefixTs.set(normalized.alivePrefix, 0);
            }
        } catch (_e) {}

        // Auto unit scaling based on source object's unit (common.unit)
        // Example: meter reports 0.73 kW but EMS expects W -> multiply by 1000 internally.
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

        const srcObjectId = normalized.srcObjectId || objectId;
        const needSubscribe = (typeof this.adapter.subscribeForeignStatesAsync === 'function') && !this._subscribedObjectIds.has(srcObjectId);
        const needPrime = (typeof this.adapter.getForeignStateAsync === 'function') && !this._primedObjectIds.has(srcObjectId) && !this.cacheByObjectId.has(srcObjectId);

        // Optional: subscribe to a whole device/channel prefix as heartbeat for freshness.
        const alivePattern = (normalized.useAliveForStale && normalized.alivePrefix) ? `${normalized.alivePrefix}*` : '';
        const needAliveSubscribe = !!(alivePattern && typeof this.adapter.subscribeForeignStatesAsync === 'function' && !this._subscribedObjectIds.has(alivePattern));

        const mappingUnchanged = !!(prev
            && prev.objectId === normalized.objectId
            && String(prev.dataType || '') === String(normalized.dataType || '')
            && String(prev.direction || '') === String(normalized.direction || '')
            && String(prev.unit || '') === String(normalized.unit || '')
            && String(prev.unitIn || '') === String(normalized.unitIn || '')
            && Number(prev.unitScale || 1) === Number(normalized.unitScale || 1)
            && Number(prev.scale || 1) === Number(normalized.scale || 1)
            && Number(prev.offset || 0) === Number(normalized.offset || 0)
            && !!prev.invert === !!normalized.invert
            && Number(prev.deadband || 0) === Number(normalized.deadband || 0)
            && Number(prev.maxWriteIntervalMs || 0) === Number(normalized.maxWriteIntervalMs || 0)
            && (prev.min === undefined ? undefined : Number(prev.min)) === (normalized.min === undefined ? undefined : Number(normalized.min))
            && (prev.max === undefined ? undefined : Number(prev.max)) === (normalized.max === undefined ? undefined : Number(normalized.max))
            && String(prev.note || '') === String(normalized.note || '')
            && String(prev.name || '') === String(normalized.name || '')
            && String(prev.aliasId || '') === String(normalized.aliasId || '')
            && String(prev.srcObjectId || '') === String(normalized.srcObjectId || '')
            && !!prev.useAliveForStale === !!normalized.useAliveForStale
            && String(prev.alivePrefix || '') === String(normalized.alivePrefix || '')
            && String(prev.aliveConnectedId || '') === String(normalized.aliveConnectedId || '')
            && String(prev.infoConnectionId || '') === String(normalized.infoConnectionId || '')
        );

        // Fast-path: unchanged mapping and already subscribed/primed -> avoid DB roundtrips.
        if (mappingUnchanged && !needSubscribe && !needPrime && !needAliveSubscribe) {
            this.keyByObjectId.set(objectId, key);
            if (srcObjectId && srcObjectId !== objectId) this.keyByObjectId.set(srcObjectId, key);
            return;
        }

        this.byKey.set(key, normalized);
        this.keyByObjectId.set(objectId, key);
        if (srcObjectId && srcObjectId !== objectId) this.keyByObjectId.set(srcObjectId, key);

        // Subscribe (idempotent; avoid repeating on every tick)
        if (needSubscribe) {
            try {
                await this.adapter.subscribeForeignStatesAsync(srcObjectId);
                this._subscribedObjectIds.add(srcObjectId);
            } catch (e) {
                this.adapter.log.warn(`Datapoint subscribe failed for '${objectId}': ${e?.message || e}`);
            }
        }

        // Subscribe to the alive/heartbeat prefix pattern (optional)
        if (needAliveSubscribe) {
            try {
                await this.adapter.subscribeForeignStatesAsync(alivePattern);
                this._subscribedObjectIds.add(alivePattern);
            } catch (e) {
                this.adapter.log.warn(`Datapoint alive-prefix subscribe failed for '${alivePattern}': ${e?.message || e}`);
            }
        }

        // Prime cache (only once per objectId)
        if (needPrime) {
            try {
                const st = await this.adapter.getForeignStateAsync(srcObjectId);
                // IMPORTANT: prime the cache for the *source* objectId (alias target),
                // otherwise getAgeMs()/isStale() will treat it as missing until the first stateChange event.
                if (st) this.handleStateChange(srcObjectId, st);
            } catch (_e) {
                // ignore (not all foreign states exist immediately)
            } finally {
                // Mark as primed even if missing to avoid hammering the states DB.
                this._primedObjectIds.add(srcObjectId);
            }
        }

        // Prime + subscribe connection indicators (best effort, idempotent)
        // This allows staleness logic to rely on "connected" even if those states rarely change.
        try {
            const connIds = [];
            if (normalized.useAliveForStale) {
                if (normalized.aliveConnectedId) connIds.push(normalized.aliveConnectedId);
                if (normalized.infoConnectionId) connIds.push(normalized.infoConnectionId);
            }

            for (const cid of connIds) {
                if (!cid) continue;

                // subscribe
                if (typeof this.adapter.subscribeForeignStatesAsync === 'function' && !this._subscribedObjectIds.has(cid)) {
                    try {
                        await this.adapter.subscribeForeignStatesAsync(cid);
                        this._subscribedObjectIds.add(cid);
                    } catch (_e) {
                        // ignore
                    }
                }

                // prime
                const needPrimeConn = (typeof this.adapter.getForeignStateAsync === 'function') && !this._primedObjectIds.has(cid) && !this.cacheByObjectId.has(cid);
                if (needPrimeConn) {
                    try {
                        const st = await this.adapter.getForeignStateAsync(cid);
                        if (st) this.handleStateChange(cid, st);
                    } catch (_e) {
                        // ignore
                    } finally {
                        this._primedObjectIds.add(cid);
                    }
                }
            }
        } catch (_e) {
            // ignore
        }

        // Initialize alive timestamp (best effort) when we have a value.
        try {
            if (normalized.useAliveForStale && normalized.alivePrefix && this.cacheByObjectId.has(srcObjectId)) {
                const c = this.cacheByObjectId.get(srcObjectId);
                const ts = c && Number.isFinite(Number(c.ts)) ? Number(c.ts) : Date.now();
                if (!this._alivePrefixTs.has(normalized.alivePrefix)) this._alivePrefixTs.set(normalized.alivePrefix, ts);
            }
        } catch (_e) {}
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

        // Update alive prefixes (heartbeat) on *any* matching foreign state update.
        try {
            if (this._alivePrefixTs && this._alivePrefixTs.size) {
                const ts = state.ts || Date.now();
                for (const p of this._alivePrefixTs.keys()) {
                    if (p && id.startsWith(p)) {
                        this._alivePrefixTs.set(p, ts);
                    }
                }
            }
        } catch (_e) {
            // ignore
        }
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
        const c = this.cacheByObjectId.get(e.srcObjectId || e.objectId);
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
        const c = this.cacheByObjectId.get(e.srcObjectId || e.objectId);
        const ts = c && Number.isFinite(c.ts) ? Number(c.ts) : null;
        if (!ts) return Number.POSITIVE_INFINITY;
        let age = Date.now() - ts;
        age = age >= 0 ? age : 0;

        // If enabled, use "alive prefix" heartbeat as alternative freshness signal.
        // This avoids false stale detections for event-driven datapoints.
        try {
            if (e.useAliveForStale && e.alivePrefix) {
                const aliveTs = this._alivePrefixTs.get(e.alivePrefix);
                if (aliveTs && Number.isFinite(Number(aliveTs))) {
                    let aliveAge = Date.now() - Number(aliveTs);
                    aliveAge = aliveAge >= 0 ? aliveAge : 0;
                    age = Math.min(age, aliveAge);
                }
            }
        } catch (_e) {
            // ignore
        }

        // Additional "connected" override:
        // If the underlying adapter/device reports a positive connection state, treat this input as alive.
        // This is critical for sources that do not update state.ts while values are stable.
        try {
            if (e.useAliveForStale) {
                const connIds = [];
                if (e.aliveConnectedId) connIds.push(String(e.aliveConnectedId));
                if (e.infoConnectionId) connIds.push(String(e.infoConnectionId));
                for (const cid of connIds) {
                    if (!cid) continue;
                    const cst = this.cacheByObjectId.get(cid);
                    const v = cst ? cst.val : null;
                    const connected = (v === true || v === 1 || v === '1' || v === 'true');
                    if (connected) {
                        age = 0;
                        break;
                    }
                }
            }
        } catch (_e) {
            // ignore
        }

        return age;
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