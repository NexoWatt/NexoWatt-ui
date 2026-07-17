/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.ts
 * Quell-Hash: sha256:39e2195d36bf577ad7af80a0ad1fbfaa2d89733441388b181bf9214df3bc8cf9
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/actuator-shadow-arbiter.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActuatorShadowArbiter = void 0;
exports.priorityForOwner = priorityForOwner;
exports.buildHttpActuatorShadowContext = buildHttpActuatorShadowContext;
exports.installActuatorShadowArbiter = installActuatorShadowArbiter;
exports.withActuatorShadowContext = withActuatorShadowContext;
const { AsyncLocalStorage } = require('node:async_hooks');
const SECRET_TARGET_PATTERN = /(password|passwd|secret|token|apikey|api_key|licensekey|trustedheadersecret)/i;
const SECRET_KEY_PATTERN = /(password|passwd|secret|token|apikey|api_key|licensekey|weatherapikey|email)/i;
function text(value) {
    return String(value ?? '').trim();
}
function clampNumber(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
function normalizeOwner(raw) {
    const value = text(raw).replace(/[^a-zA-Z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
    return value || 'runtime.unscoped';
}
function priorityForOwner(ownerRaw) {
    const owner = normalizeOwner(ownerRaw).toLowerCase();
    if (/(emergency|safety|notstop|failsafe|hardware-stop)/.test(owner))
        return 1000;
    if (/(para14a|gridconstraints|grid-constraints|netzbetreiber)/.test(owner))
        return 900;
    if (/(peakshaving|peak-shaving|gridlimit|anschlusslimit)/.test(owner))
        return 850;
    if (/(manual|api\.|frontend|operator|installer)/.test(owner))
        return 750;
    if (/(charging|evcs|storage|speicher|thermal|heatingrod|heating-rod)/.test(owner))
        return 600;
    if (/(multiuse|threshold|bhkw|generator|relay)/.test(owner))
        return 500;
    if (/(nexologic|logic)/.test(owner))
        return 400;
    if (/(runtime\.unscoped|mapping\.)/.test(owner))
        return 250;
    return 300;
}
function ownerDefaultLeaseMs(ownerRaw) {
    const owner = normalizeOwner(ownerRaw).toLowerCase();
    if (/(manual|api\.|frontend|operator|installer)/.test(owner))
        return 5 * 60 * 1000;
    if (/(nexologic|logic|threshold|relay)/.test(owner))
        return 60 * 1000;
    if (/(module\.|charging|evcs|storage|speicher|thermal|heatingrod|peak|para14a|multiuse)/.test(owner))
        return 15 * 1000;
    return 10 * 1000;
}
function stableFingerprint(value, depth = 0) {
    if (depth > 8)
        return '[depth]';
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'undefined';
    if (typeof value === 'number') {
        if (!Number.isFinite(value))
            return `number:${String(value)}`;
        return `number:${Math.round(value * 1000000) / 1000000}`;
    }
    if (typeof value === 'boolean')
        return `boolean:${value ? '1' : '0'}`;
    if (typeof value === 'string')
        return `string:${value}`;
    if (Array.isArray(value))
        return `[${value.map((entry) => stableFingerprint(entry, depth + 1)).join(',')}]`;
    if (typeof value === 'object') {
        const obj = value;
        return `{${Object.keys(obj).sort().map((key) => `${key}:${stableFingerprint(obj[key], depth + 1)}`).join(',')}}`;
    }
    return `${typeof value}:${String(value)}`;
}
function sanitizePreview(targetId, value, depth = 0) {
    if (SECRET_TARGET_PATTERN.test(targetId))
        return '[redacted]';
    if (depth > 5)
        return '[depth]';
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return value.length > 160 ? `${value.slice(0, 157)}…` : value;
    if (Array.isArray(value))
        return value.slice(0, 12).map((entry) => sanitizePreview(targetId, entry, depth + 1));
    if (typeof value === 'object') {
        const out = {};
        for (const [key, child] of Object.entries(value).slice(0, 20)) {
            if (SECRET_KEY_PATTERN.test(key))
                continue;
            out[key] = sanitizePreview(targetId, child, depth + 1);
        }
        return out;
    }
    return String(value);
}
function extractWritePayload(stateArg, ackArg) {
    if (stateArg && typeof stateArg === 'object' && Object.prototype.hasOwnProperty.call(stateArg, 'val')) {
        const state = stateArg;
        return { value: state.val, ack: typeof state.ack === 'boolean' ? state.ack : (typeof ackArg === 'boolean' ? ackArg : null) };
    }
    return { value: stateArg, ack: typeof ackArg === 'boolean' ? ackArg : null };
}
function valuesDiffer(a, b) {
    if (typeof a.valuePreview === 'number' && typeof b.valuePreview === 'number') {
        const av = Number(a.valuePreview);
        const bv = Number(b.valuePreview);
        const tolerance = Math.max(1, Math.min(Math.abs(av), Math.abs(bv)) * 0.001);
        return Math.abs(av - bv) > tolerance;
    }
    return a.valueFingerprint !== b.valueFingerprint;
}
function compactPath(raw) {
    const value = text(raw).replace(/[?#].*$/, '');
    if (!value)
        return '';
    return value
        .split('/')
        .filter(Boolean)
        .slice(0, 5)
        .map((part) => (/^[0-9a-f]{8,}$/i.test(part) || /^\d+$/.test(part) ? ':id' : part.slice(0, 48)))
        .join('/');
}
function buildHttpActuatorShadowContext(methodRaw, pathRaw) {
    const method = text(methodRaw).toUpperCase() || 'GET';
    const path = `/${compactPath(pathRaw)}`;
    let owner = 'api.manual';
    if (/^\/api\/(evcs|charging)/i.test(path))
        owner = 'manual.evcs';
    else if (/^\/api\/smarthome/i.test(path))
        owner = 'manual.smarthome';
    else if (/^\/api\/(ems|flow|storage)/i.test(path))
        owner = 'manual.ems';
    else if (/^\/api\/mesh/i.test(path))
        owner = 'manual.mesh';
    else if (/^\/api\/logic/i.test(path))
        owner = 'manual.nexologic';
    else if (/^\/api\/(installer|config|set)/i.test(path))
        owner = 'manual.installer';
    return {
        owner,
        module: 'http-api',
        priority: priorityForOwner(owner),
        reason: `${method} ${path}`,
        leaseMs: ownerDefaultLeaseMs(owner),
        kind: 'manual-api',
    };
}
class ActuatorShadowArbiter {
    constructor(adapterOrOptions = {}, maybeOptions = {}) {
        this.storage = new AsyncLocalStorage();
        this.adapter = null;
        this.events = [];
        this.conflicts = new Map();
        this.seq = 0;
        this.requestsTotal = 0;
        this.stopped = false;
        this.installed = false;
        this.originalSetForeignStateAsync = null;
        this.originalSetForeignStateChangedAsync = null;
        const looksLikeAdapter = !!(adapterOrOptions && typeof adapterOrOptions === 'object' && typeof adapterOrOptions.setForeignStateAsync === 'function');
        const options = looksLikeAdapter ? maybeOptions : adapterOrOptions;
        this.adapter = looksLikeAdapter ? adapterOrOptions : null;
        this.historyWindowMs = clampNumber(options.historyWindowMs, 5 * 60 * 1000, 15000, 24 * 60 * 60 * 1000);
        this.conflictWindowMs = clampNumber(options.conflictWindowMs, 15000, 500, 10 * 60 * 1000);
        this.conflictRetentionMs = clampNumber(options.conflictRetentionMs, 5 * 60 * 1000, 15000, 24 * 60 * 60 * 1000);
        this.maxEvents = Math.round(clampNumber(options.maxEvents, 1500, 100, 20000));
        this.maxRecentWrites = Math.round(clampNumber(options.maxRecentWrites, 80, 10, 500));
        this.maxConflicts = Math.round(clampNumber(options.maxConflicts, 80, 10, 500));
    }
    async init() {
        if (this.adapter) {
            this.adapter._actuatorShadowArbiter = this;
            this.adapter._actuatorShadowSnapshot = this.snapshot();
        }
    }
    install(adapterArg) {
        const adapter = adapterArg || this.adapter;
        if (!adapter || typeof adapter.setForeignStateAsync !== 'function')
            return this;
        this.adapter = adapter;
        adapter._actuatorShadowArbiter = this;
        if (this.installed)
            return this;
        this.installed = true;
        this.stopped = false;
        this.originalSetForeignStateAsync = adapter.setForeignStateAsync;
        const self = this;
        adapter.setForeignStateAsync = function shadowSetForeignStateAsync(...args) {
            return self.interceptAsync('setForeignStateAsync', self.originalSetForeignStateAsync, args);
        };
        if (typeof adapter.setForeignStateChangedAsync === 'function') {
            this.originalSetForeignStateChangedAsync = adapter.setForeignStateChangedAsync;
            adapter.setForeignStateChangedAsync = function shadowSetForeignStateChangedAsync(...args) {
                return self.interceptAsync('setForeignStateChangedAsync', self.originalSetForeignStateChangedAsync, args);
            };
        }
        return this;
    }
    uninstall() {
        if (!this.adapter || !this.installed)
            return;
        if (this.originalSetForeignStateAsync)
            this.adapter.setForeignStateAsync = this.originalSetForeignStateAsync;
        if (this.originalSetForeignStateChangedAsync)
            this.adapter.setForeignStateChangedAsync = this.originalSetForeignStateChangedAsync;
        this.installed = false;
    }
    stop() {
        this.stopped = true;
        this.uninstall();
    }
    runWithContext(context, fn) {
        const parent = this.storage.getStore() || {};
        const merged = {
            ...parent,
            ...context,
            owner: normalizeOwner(context.owner || parent.owner),
            module: text(context.module || parent.module),
            reason: text(context.reason || parent.reason),
        };
        const priority = Number.isFinite(Number(context.priority)) ? Number(context.priority) : (Number.isFinite(Number(parent.priority)) ? Number(parent.priority) : null);
        const leaseMs = Number.isFinite(Number(context.leaseMs)) ? Number(context.leaseMs) : (Number.isFinite(Number(parent.leaseMs)) ? Number(parent.leaseMs) : null);
        if (priority !== null)
            merged.priority = priority;
        if (leaseMs !== null)
            merged.leaseMs = leaseMs;
        return this.storage.run(merged, fn);
    }
    getContext() {
        return this.storage.getStore() || {};
    }
    inferOwner(targetId) {
        const context = this.getContext();
        if (context.owner && normalizeOwner(context.owner) !== 'runtime.unscoped')
            return { owner: normalizeOwner(context.owner), inferred: false };
        const ownerMap = this.adapter?._stageAActuatorOwnerById;
        const row = ownerMap && typeof ownerMap === 'object' ? ownerMap[targetId] : null;
        const activeOwners = Array.isArray(row?.activeOwners) ? row.activeOwners.map(normalizeOwner).filter(Boolean) : [];
        if (activeOwners.length === 1)
            return { owner: activeOwners[0], inferred: true };
        if (activeOwners.length > 1)
            return { owner: 'mapping.multiple-active', inferred: true };
        const owners = Array.isArray(row?.owners) ? row.owners.map(normalizeOwner).filter(Boolean) : [];
        if (owners.length === 1)
            return { owner: owners[0], inferred: true };
        return { owner: 'runtime.unscoped', inferred: false };
    }
    createEvent(method, args) {
        const now = Date.now();
        const targetId = text(args[0]);
        const payload = extractWritePayload(args[1], args[2]);
        const context = this.getContext();
        const inferred = this.inferOwner(targetId);
        const owner = inferred.owner;
        const priority = Number.isFinite(Number(context.priority)) ? Number(context.priority) : priorityForOwner(owner);
        const leaseMs = Math.round(clampNumber(context.leaseMs, ownerDefaultLeaseMs(owner), 0, 24 * 60 * 60 * 1000));
        const namespace = text(this.adapter?.namespace);
        const localTarget = !!(namespace && targetId.startsWith(`${namespace}.`));
        const actuatorCandidate = !!targetId && payload.ack !== true && !localTarget && !targetId.startsWith('system.adapter.');
        const event = {
            seq: ++this.seq,
            ts: now,
            completedTs: null,
            targetId,
            method,
            owner,
            module: text(context.module) || owner,
            priority,
            reason: text(context.reason),
            leaseMs,
            validUntil: now + leaseMs,
            cycleId: context.cycleId ?? null,
            requestId: text(context.requestId),
            kind: text(context.kind) || 'runtime-write',
            ack: payload.ack,
            actuatorCandidate,
            inferredOwner: inferred.inferred,
            valuePreview: sanitizePreview(targetId, payload.value),
            valueFingerprint: stableFingerprint(payload.value),
            status: 'requested',
            error: '',
        };
        this.requestsTotal += actuatorCandidate ? 1 : 0;
        this.events.push(event);
        if (this.events.length > this.maxEvents)
            this.events.splice(0, this.events.length - this.maxEvents);
        return event;
    }
    async interceptAsync(method, original, args) {
        if (this.stopped)
            return original.apply(this.adapter, args);
        const event = this.createEvent(method, args);
        try {
            const result = await original.apply(this.adapter, args);
            event.status = 'accepted';
            event.completedTs = Date.now();
            this.detectConflict(event);
            if (this.adapter)
                this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
            return result;
        }
        catch (error) {
            event.status = 'failed';
            event.completedTs = Date.now();
            event.error = error instanceof Error ? error.message.slice(0, 250) : String(error).slice(0, 250);
            if (this.adapter)
                this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
            throw error;
        }
    }
    detectConflict(current) {
        if (!current.actuatorCandidate || current.status !== 'accepted')
            return;
        const cutoff = current.ts - this.conflictWindowMs;
        for (let index = this.events.length - 2; index >= 0; index -= 1) {
            const previous = this.events[index];
            if (previous.ts < cutoff && previous.validUntil < current.ts)
                break;
            if (!previous.actuatorCandidate || previous.status !== 'accepted')
                continue;
            if (previous.targetId !== current.targetId)
                continue;
            if (previous.owner === current.owner)
                continue;
            const sameCycle = current.cycleId !== null && previous.cycleId !== null && current.cycleId === previous.cycleId;
            const leaseOverlap = previous.validUntil >= current.ts || current.validUntil >= previous.ts;
            if (!sameCycle && !leaseOverlap && (current.ts - previous.ts) > this.conflictWindowMs)
                continue;
            if (!valuesDiffer(previous, current))
                continue;
            this.registerConflict(previous, current);
        }
    }
    registerConflict(a, b) {
        const owners = Array.from(new Set([a.owner, b.owner])).sort();
        const key = `${a.targetId}|${owners.join('|')}`;
        const existing = this.conflicts.get(key);
        const conflict = existing || {
            objectId: a.targetId,
            targetId: a.targetId,
            firstTs: Math.min(a.ts, b.ts),
            lastTs: Math.max(a.ts, b.ts),
            owners,
            priorities: {},
            values: {},
            cycleIds: [],
            writeSeqs: [],
            reasons: {},
            count: 0,
            lastWinner: b.owner,
        };
        conflict.lastTs = Math.max(conflict.lastTs, a.ts, b.ts);
        conflict.count += 1;
        conflict.lastWinner = b.owner;
        for (const event of [a, b]) {
            conflict.priorities[event.owner] = event.priority;
            conflict.values[event.owner] = event.valuePreview;
            if (event.reason)
                conflict.reasons[event.owner] = event.reason;
            if (event.cycleId !== null && !conflict.cycleIds.includes(event.cycleId))
                conflict.cycleIds.push(event.cycleId);
            if (!conflict.writeSeqs.includes(event.seq))
                conflict.writeSeqs.push(event.seq);
        }
        conflict.writeSeqs = conflict.writeSeqs.slice(-20);
        conflict.cycleIds = conflict.cycleIds.slice(-10);
        this.conflicts.set(key, conflict);
        if (this.conflicts.size > this.maxConflicts) {
            const oldest = Array.from(this.conflicts.entries()).sort((left, right) => left[1].lastTs - right[1].lastTs)[0];
            if (oldest)
                this.conflicts.delete(oldest[0]);
        }
    }
    snapshot(now = Date.now()) {
        const historyCutoff = now - this.historyWindowMs;
        const conflictCutoff = now - this.conflictRetentionMs;
        const events = this.events.filter((event) => event.ts >= historyCutoff);
        const accepted = events.filter((event) => event.status === 'accepted');
        const actuatorWrites = accepted.filter((event) => event.actuatorCandidate);
        const activeConflicts = Array.from(this.conflicts.values())
            .filter((conflict) => conflict.lastTs >= conflictCutoff)
            .sort((a, b) => b.lastTs - a.lastTs)
            .slice(0, this.maxConflicts);
        const targets = new Map();
        for (const event of actuatorWrites) {
            if (!targets.has(event.targetId))
                targets.set(event.targetId, []);
            targets.get(event.targetId).push(event);
        }
        const targetSummaries = Array.from(targets.entries()).map(([targetId, rows]) => {
            const last = rows[rows.length - 1];
            const owners = Array.from(new Set(rows.map((row) => row.owner)));
            return {
                objectId: targetId,
                targetId,
                writeCount: rows.length,
                owners,
                lastOwner: last.owner,
                lastPriority: last.priority,
                lastValue: last.valuePreview,
                lastTs: last.ts,
                lastReason: last.reason,
                finalExecutedWriter: last.owner,
            };
        }).sort((a, b) => b.lastTs - a.lastTs);
        const ownerStats = {};
        for (const event of events) {
            if (!ownerStats[event.owner])
                ownerStats[event.owner] = { writes: 0, targets: 0, failures: 0 };
            ownerStats[event.owner].writes += event.status === 'accepted' && event.actuatorCandidate ? 1 : 0;
            ownerStats[event.owner].failures += event.status === 'failed' ? 1 : 0;
        }
        for (const [owner, stats] of Object.entries(ownerStats)) {
            stats.targets = new Set(actuatorWrites.filter((event) => event.owner === owner).map((event) => event.targetId)).size;
        }
        const lastWrite = actuatorWrites.length ? actuatorWrites[actuatorWrites.length - 1] : null;
        return {
            active: !this.stopped,
            mode: 'shadow-read-only',
            behaviorChanged: false,
            requestsTotal: this.requestsTotal,
            recentWriteCount: actuatorWrites.length,
            acceptedWriteCount: accepted.length,
            failedWriteCount: events.filter((event) => event.status === 'failed').length,
            observedTargetCount: targets.size,
            activeConflictCount: activeConflicts.length,
            activeConflicts,
            unscopedWriteCount: actuatorWrites.filter((event) => event.owner === 'runtime.unscoped' || event.owner === 'mapping.multiple-active').length,
            lastWriteTs: lastWrite?.ts || 0,
            lastExecutedWriter: lastWrite?.owner || '',
            lastWrite: lastWrite ? {
                seq: lastWrite.seq,
                ts: lastWrite.ts,
                objectId: lastWrite.targetId,
                targetId: lastWrite.targetId,
                owner: lastWrite.owner,
                module: lastWrite.module,
                priority: lastWrite.priority,
                reason: lastWrite.reason,
                value: lastWrite.valuePreview,
                status: lastWrite.status,
                finalExecutedWriter: lastWrite.owner,
            } : null,
            ownerStats,
            targets: targetSummaries.slice(0, 100),
            recentWrites: actuatorWrites.slice(-this.maxRecentWrites).reverse().map((event) => ({
                seq: event.seq,
                ts: event.ts,
                objectId: event.targetId,
                targetId: event.targetId,
                owner: event.owner,
                module: event.module,
                priority: event.priority,
                reason: event.reason,
                leaseMs: event.leaseMs,
                cycleId: event.cycleId,
                value: event.valuePreview,
                status: event.status,
                inferredOwner: event.inferredOwner,
                finalExecutedWriter: event.owner,
            })),
        };
    }
}
exports.ActuatorShadowArbiter = ActuatorShadowArbiter;
function installActuatorShadowArbiter(adapter) {
    if (adapter?._actuatorShadowArbiter instanceof ActuatorShadowArbiter) {
        adapter._actuatorShadowArbiter.install(adapter);
        return adapter._actuatorShadowArbiter;
    }
    const cfg = adapter?.config?.diagnostics || {};
    const arbiter = new ActuatorShadowArbiter({
        historyWindowMs: cfg.actuatorShadowHistoryMs,
        conflictWindowMs: cfg.actuatorShadowConflictWindowMs,
        conflictRetentionMs: cfg.actuatorShadowConflictRetentionMs,
        maxEvents: cfg.actuatorShadowMaxEvents,
        maxRecentWrites: cfg.actuatorShadowMaxRecentWrites,
        maxConflicts: cfg.actuatorShadowMaxConflicts,
    });
    arbiter.install(adapter);
    adapter._actuatorShadowArbiter = arbiter;
    return arbiter;
}
function withActuatorShadowContext(adapter, context, fn) {
    const arbiter = adapter?._actuatorShadowArbiter;
    if (arbiter && typeof arbiter.runWithContext === 'function')
        return arbiter.runWithContext(context, fn);
    return fn();
}
module.exports = {
    ActuatorShadowArbiter,
    installActuatorShadowArbiter,
    withActuatorShadowContext,
    priorityForOwner,
    buildHttpActuatorShadowContext,
};
