/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/netoperator-interface.ts
 * Quell-Hash: sha256:318faf6b634943879bb70d85e617e7de1d0579474b96c75e9f1272485e0a4d4a
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/netoperator-interface.js.
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
exports.NetOperatorInterfaceModule = void 0;
const netoperator_canonical_model_1 = require("../services/netoperator-canonical-model");
const netoperator_driver_registry_1 = require("../services/netoperator-driver-registry");
const netoperator_modbus_tcp_1 = require("../services/netoperator-modbus-tcp");
function finite(value, fallback) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function safeText(value) {
    return String(value === null || value === undefined ? '' : value).trim();
}
function deepEqual(a, b) {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch (_error) {
        return false;
    }
}
function descriptorObjectId(descriptor) {
    return safeText(descriptor && descriptor.objectId);
}
function transformStateValue(value, descriptor) {
    let transformed = value;
    if (typeof transformed === 'number') {
        transformed = transformed * finite(descriptor.scale, 1) + finite(descriptor.offset, 0);
    }
    if (descriptor.bit !== undefined && typeof transformed === 'number') {
        transformed = ((Math.round(transformed) >> Number(descriptor.bit)) & 1) === 1;
    }
    if (descriptor.enumMap && Object.prototype.hasOwnProperty.call(descriptor.enumMap, String(transformed))) {
        transformed = descriptor.enumMap[String(transformed)];
    }
    return transformed;
}
class NetOperatorInterfaceModule {
    constructor(adapter, dpRegistry) {
        this.connector = null;
        this.connectorSignature = '';
        this.lastPollAt = 0;
        this.lastSnapshot = null;
        this.lastRaw = {};
        this.audit = [];
        this.lastCommand = null;
        this.lastReceivedAt = 0;
        this.lastValidAt = 0;
        this.adapter = adapter;
        this.dp = dpRegistry || null;
        this.registry = new netoperator_driver_registry_1.NetOperatorDriverRegistry();
    }
    config() {
        const cfg = this.adapter && this.adapter.config && this.adapter.config.netOperatorInterface;
        return cfg && typeof cfg === 'object' ? cfg : {};
    }
    async ensureObject(id, name, type, role = 'state', unit = '') {
        const common = { name, type, role, read: true, write: false };
        if (unit)
            common.unit = unit;
        await this.adapter.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    }
    async restoreAudit() {
        try {
            if (!this.adapter || typeof this.adapter.getStateAsync !== 'function')
                return;
            const state = await this.adapter.getStateAsync('netoperator.audit.eventsJson');
            if (!state || typeof state.val !== 'string' || !state.val.trim())
                return;
            const parsed = JSON.parse(state.val);
            if (!Array.isArray(parsed))
                return;
            this.audit = parsed.filter((entry) => entry && typeof entry === 'object').slice(-2000);
            const current = this.audit.length ? this.audit[this.audit.length - 1]?.current : null;
            this.lastCommand = current && typeof current === 'object' ? current : null;
        }
        catch (_error) {
            this.audit = [];
            this.lastCommand = null;
        }
    }
    async init() {
        this.registry.load();
        const channels = [
            'netoperator', 'netoperator.grid', 'netoperator.grid.command', 'netoperator.grid.p',
            'netoperator.grid.q', 'netoperator.grid.cosphi', 'netoperator.grid.mode', 'netoperator.pcc',
            'netoperator.pcc.p', 'netoperator.pcc.q', 'netoperator.pcc.u', 'netoperator.controller',
            'netoperator.eos', 'netoperator.audit', 'netoperator.driver', 'netoperator.diagnostics',
        ];
        for (const channel of channels) {
            await this.adapter.setObjectNotExistsAsync(channel, { type: 'channel', common: { name: channel }, native: {} });
        }
        await this.ensureObject('netoperator.enabled', 'Netzbetreiber-Schnittstelle aktiv', 'boolean', 'indicator');
        await this.ensureObject('netoperator.status', 'Status Netzbetreiber-Schnittstelle', 'string', 'text');
        await this.ensureObject('netoperator.mode', 'Betriebsmodus', 'string', 'text');
        await this.ensureObject('netoperator.transport', 'Aktiver Transport', 'string', 'text');
        await this.ensureObject('netoperator.readOnly', 'Read-only / keine Asset-Schreibbefehle', 'boolean', 'indicator');
        await this.ensureObject('netoperator.operationEngineIntegration', 'Operation-Engine-Integration', 'string', 'text');
        await this.ensureObject('netoperator.failSafePolicy', 'Dokumentierter Fail-Safe-Vertrag', 'string', 'text');
        await this.ensureObject('netoperator.commandBinding', 'Externe Vorgabe bindend', 'boolean', 'indicator');
        await this.ensureObject('netoperator.commandPriority', 'Aktive Priorität', 'number', 'value');
        await this.ensureObject('netoperator.commandAction', 'Aktive Vorgabe', 'string', 'text');
        await this.ensureObject('netoperator.commandReason', 'Begründung', 'string', 'text');
        await this.ensureObject('netoperator.commandId', 'Command-ID', 'string', 'text');
        await this.ensureObject('netoperator.driver.id', 'Treiber-ID', 'string', 'text');
        await this.ensureObject('netoperator.driver.manufacturer', 'Hersteller', 'string', 'text');
        await this.ensureObject('netoperator.driver.model', 'Reglermodell', 'string', 'text');
        await this.ensureObject('netoperator.driver.mappingVersion', 'Mapping-Version', 'string', 'text');
        await this.ensureObject('netoperator.driver.ready', 'Treiber vollständig gemappt', 'boolean', 'indicator');
        await this.ensureObject('netoperator.driver.validationJson', 'Treiberprüfung JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.latencyMs', 'Kommunikationslatenz', 'number', 'value.interval', 'ms');
        await this.ensureObject('netoperator.diagnostics.lastReceivedAt', 'Letztes empfangenes Telegramm', 'number', 'value.time', 'ms');
        await this.ensureObject('netoperator.diagnostics.lastValidAt', 'Letztes gültiges Telegramm', 'number', 'value.time', 'ms');
        await this.ensureObject('netoperator.diagnostics.lastError', 'Letzter Fehler', 'string', 'text');
        await this.ensureObject('netoperator.diagnostics.warningsJson', 'Kommunikationswarnungen JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.rawJson', 'Rohwerte/Registersicht JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.snapshotJson', 'Kanonischer Snapshot JSON', 'string', 'json');
        await this.ensureObject('netoperator.diagnostics.canonicalQualityJson', 'Qualität und Gültigkeit kanonischer Signale', 'string', 'json');
        await this.ensureObject('netoperator.audit.lastJson', 'Letztes Netzbetreiber-Ereignis', 'string', 'json');
        await this.ensureObject('netoperator.audit.eventsJson', 'Netzbetreiber-Ereignisse', 'string', 'json');
        for (const definition of Object.values(netoperator_canonical_model_1.CANONICAL_FIELDS)) {
            const type = definition.type === 'boolean' ? 'boolean' : definition.type === 'number' || definition.type === 'datetime' ? 'number' : 'string';
            const role = definition.type === 'boolean' ? 'indicator' : definition.type === 'number' ? 'value' : definition.type === 'datetime' ? 'value.time' : 'text';
            await this.ensureObject(`netoperator.${definition.key}`, definition.label, type, role, definition.unit || '');
        }
        await this.restoreAudit();
        this.adapter._netOperatorInterface = this;
    }
    closeConnector() {
        if (this.connector) {
            try {
                this.connector.close();
            }
            catch (_error) { /* ignore */ }
        }
        this.connector = null;
        this.connectorSignature = '';
    }
    stop() {
        this.closeConnector();
        if (this.adapter) {
            this.adapter._netOperatorEnvelope = null;
            if (this.adapter._netOperatorInterface === this)
                this.adapter._netOperatorInterface = null;
        }
    }
    async deactivate() {
        this.closeConnector();
        this.adapter._netOperatorEnvelope = null;
        await this.adapter.setStateAsync('netoperator.enabled', false, true);
        await this.adapter.setStateAsync('netoperator.status', 'disabled', true);
        await this.adapter.setStateAsync('netoperator.readOnly', true, true);
        await this.adapter.setStateAsync('netoperator.operationEngineIntegration', 'prepared-not-active', true);
    }
    appendAudit(snapshot) {
        const command = snapshot.command;
        const current = {
            commandId: command.commandId,
            priority: command.priority,
            action: command.action,
            binding: command.binding,
            reason: command.reason,
            values: {
                enable: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.command.enable'),
                trip: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.command.trip'),
                release: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.command.release'),
                pLimitKw: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.limit_kw'),
                pTargetKw: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.target_kw'),
                pTargetPct: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.p.target_pct'),
                qTargetKvar: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.q.target_kvar'),
                cosPhi: (0, netoperator_canonical_model_1.canonicalValue)(snapshot, 'grid.cosphi.target'),
            },
        };
        if (this.lastCommand && deepEqual(this.lastCommand, current))
            return;
        const event = {
            schema: 'nexowatt.netoperator-audit.v1',
            timestamp: Date.now(),
            source: snapshot.source,
            driverId: snapshot.driverId,
            mappingVersion: snapshot.mappingVersion,
            previous: this.lastCommand,
            current,
            reaction: 'canonical-envelope-updated',
            result: snapshot.valid ? 'accepted-diagnostic' : 'rejected-invalid-or-stale',
        };
        this.lastCommand = current;
        this.audit.push(event);
        const limit = Math.max(20, Math.min(2000, Math.round(finite(this.config().auditLimit, 500))));
        this.audit = this.audit.slice(-limit);
        this.adapter.setStateAsync('netoperator.audit.lastJson', JSON.stringify(event), true).catch(() => undefined);
        this.adapter.setStateAsync('netoperator.audit.eventsJson', JSON.stringify(this.audit), true).catch(() => undefined);
    }
    async readStateDescriptor(descriptor) {
        const objectId = descriptorObjectId(descriptor);
        if (!objectId)
            throw new Error('state-object-id-missing');
        const state = await this.adapter.getForeignStateAsync(objectId);
        if (!state)
            throw new Error('state-missing');
        return { state, value: transformStateValue(state.val, descriptor), objectId };
    }
    async readStateMap(profile) {
        const startedAt = Date.now();
        const rawValues = {};
        const metadata = {};
        const raw = {};
        const requiredErrors = [];
        const optionalErrors = [];
        let successfulReads = 0;
        for (const [key, mapping] of Object.entries(profile.signals || {})) {
            if (mapping.access === 'write')
                continue;
            const objectId = descriptorObjectId(mapping);
            if (!objectId)
                continue;
            const required = mapping.required === true || netoperator_canonical_model_1.REQUIRED_READ_KEYS.includes(key);
            try {
                const primary = await this.readStateDescriptor(mapping);
                successfulReads += 1;
                let quality = Number(primary.state.q) > 0 ? 'bad' : 'good';
                let timestamp = Number(primary.state.ts) || Date.now();
                const detail = { objectId, value: primary.value, ack: primary.state.ack === true, ts: Number(primary.state.ts) || 0, q: primary.state.q ?? null };
                const qualityDescriptor = mapping.quality;
                if (qualityDescriptor && descriptorObjectId(qualityDescriptor)) {
                    const qualityRead = await this.readStateDescriptor(qualityDescriptor);
                    quality = Number(qualityRead.state.q) > 0 ? 'bad' : (0, netoperator_modbus_tcp_1.classifyQuality)(qualityRead.value, qualityDescriptor);
                    detail.quality = { objectId: qualityRead.objectId, value: qualityRead.value, classification: quality, ts: Number(qualityRead.state.ts) || 0, q: qualityRead.state.q ?? null };
                }
                if (mapping.timestamp && descriptorObjectId(mapping.timestamp)) {
                    const timestampRead = await this.readStateDescriptor(mapping.timestamp);
                    const parsed = (0, netoperator_canonical_model_1.strictTimestamp)(timestampRead.value);
                    if (parsed !== null)
                        timestamp = parsed;
                    else
                        quality = 'bad';
                    detail.timestamp = { objectId: timestampRead.objectId, value: timestampRead.value, parsed, ts: Number(timestampRead.state.ts) || 0, q: timestampRead.state.q ?? null };
                }
                rawValues[key] = primary.value;
                metadata[key] = { timestamp, quality, source: objectId, enumMap: mapping.enumMap };
                raw[key] = detail;
            }
            catch (error) {
                const message = `${key}:${error instanceof Error ? error.message : String(error)}`;
                (required ? requiredErrors : optionalErrors).push(message);
                metadata[key] = { timestamp: Date.now(), quality: 'bad', source: objectId, enumMap: mapping.enumMap };
            }
        }
        const transportOk = requiredErrors.length === 0 && successfulReads > 0;
        if (!Object.prototype.hasOwnProperty.call(rawValues, 'controller.comm_ok'))
            rawValues['controller.comm_ok'] = transportOk;
        return {
            ok: transportOk,
            rawValues,
            metadata,
            latencyMs: Date.now() - startedAt,
            error: requiredErrors.join(';'),
            warnings: optionalErrors,
            raw,
        };
    }
    connectorFor(cfg, profile) {
        const transport = cfg.transport || {};
        const signature = JSON.stringify({ id: profile.id, mappingVersion: profile.mappingVersion, host: transport.host, port: transport.port, unitId: transport.unitId, timeoutMs: transport.timeoutMs });
        if (!this.connector || signature !== this.connectorSignature) {
            this.closeConnector();
            this.connector = new netoperator_modbus_tcp_1.NetOperatorModbusTcpConnector({ host: safeText(transport.host), port: transport.port, unitId: transport.unitId, timeoutMs: transport.timeoutMs }, profile);
            this.connectorSignature = signature;
        }
        return this.connector;
    }
    async publish(snapshot, extra) {
        this.lastSnapshot = snapshot;
        this.lastRaw = extra.raw || {};
        if (extra.transportOk)
            this.lastReceivedAt = snapshot.receivedAt;
        if (snapshot.valid)
            this.lastValidAt = snapshot.receivedAt;
        this.adapter._netOperatorEnvelope = {
            schema: 'nexowatt.netoperator-operation-envelope.v1',
            generatedAt: snapshot.generatedAt,
            valid: snapshot.valid,
            fresh: snapshot.fresh,
            commOk: snapshot.commOk,
            command: snapshot.command,
            values: Object.fromEntries(Object.entries(snapshot.values).map(([key, value]) => [key, value && value.valid ? value.value : null])),
            certifiedControllerAuthority: true,
            readOnly: true,
            hardwareWrite: false,
            operationEngineIntegration: 'prepared-not-active',
            failSafePolicy: safeText(this.config().failSafePolicy || 'project-specific'),
        };
        await this.adapter.setStateAsync('netoperator.enabled', true, true);
        await this.adapter.setStateAsync('netoperator.status', extra.status, true);
        await this.adapter.setStateAsync('netoperator.mode', safeText(this.config().mode || 'diagnostic'), true);
        await this.adapter.setStateAsync('netoperator.transport', extra.transportType || '', true);
        await this.adapter.setStateAsync('netoperator.readOnly', true, true);
        await this.adapter.setStateAsync('netoperator.operationEngineIntegration', 'prepared-not-active', true);
        await this.adapter.setStateAsync('netoperator.failSafePolicy', safeText(this.config().failSafePolicy || 'project-specific'), true);
        await this.adapter.setStateAsync('netoperator.commandBinding', snapshot.valid && snapshot.command.binding, true);
        await this.adapter.setStateAsync('netoperator.commandPriority', snapshot.command.priority, true);
        await this.adapter.setStateAsync('netoperator.commandAction', snapshot.command.action, true);
        await this.adapter.setStateAsync('netoperator.commandReason', snapshot.valid ? snapshot.command.reason : `invalid:${snapshot.errors.join(',')}`, true);
        await this.adapter.setStateAsync('netoperator.commandId', snapshot.command.commandId, true);
        await this.adapter.setStateAsync('netoperator.driver.id', extra.profile?.id || '', true);
        await this.adapter.setStateAsync('netoperator.driver.manufacturer', extra.profile?.manufacturer || '', true);
        await this.adapter.setStateAsync('netoperator.driver.model', extra.profile?.model || '', true);
        await this.adapter.setStateAsync('netoperator.driver.mappingVersion', extra.profile?.mappingVersion || '', true);
        await this.adapter.setStateAsync('netoperator.driver.ready', extra.validation?.ready === true, true);
        await this.adapter.setStateAsync('netoperator.driver.validationJson', JSON.stringify(extra.validation || {}), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.latencyMs', Math.round(extra.latencyMs || 0), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.lastReceivedAt', this.lastReceivedAt, true);
        await this.adapter.setStateAsync('netoperator.diagnostics.lastValidAt', this.lastValidAt, true);
        await this.adapter.setStateAsync('netoperator.diagnostics.lastError', extra.error || snapshot.errors.join(';'), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.warningsJson', JSON.stringify(extra.warnings || []), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.rawJson', JSON.stringify(extra.raw || {}), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.snapshotJson', JSON.stringify(snapshot), true);
        await this.adapter.setStateAsync('netoperator.diagnostics.canonicalQualityJson', JSON.stringify(Object.fromEntries(Object.entries(snapshot.values || {}).map(([key, entry]) => [key, {
                valid: entry?.valid === true,
                quality: entry?.quality || 'bad',
                timestamp: Number(entry?.timestamp) || 0,
                source: entry?.source || '',
                reason: entry?.reason || 'missing',
            }]))), true);
        // Ungültige/stale Werte werden niemals als physikalische 0 bzw. false
        // veröffentlicht. Der letzte gültige Roh-State bleibt stehen; Qualität und
        // Frische liegen separat im Snapshot. Eine spätere Operation Engine darf
        // ausschließlich den validierten Envelope verwenden.
        for (const [key, definition] of Object.entries(netoperator_canonical_model_1.CANONICAL_FIELDS)) {
            if (definition.access !== 'read')
                continue;
            const entry = snapshot.values[key];
            if (!entry || entry.valid !== true)
                continue;
            const value = entry.value;
            if (definition.type === 'boolean' && typeof value === 'boolean')
                await this.adapter.setStateAsync(`netoperator.${key}`, value, true);
            else if ((definition.type === 'number' || definition.type === 'datetime') && typeof value === 'number')
                await this.adapter.setStateAsync(`netoperator.${key}`, value, true);
            else if (value !== null && value !== undefined)
                await this.adapter.setStateAsync(`netoperator.${key}`, String(value), true);
        }
        this.appendAudit(snapshot);
    }
    maxAgeMs(cfg, profile) {
        const configured = finite(cfg.signalMaxAgeSec, 5) * 1000;
        const profileValue = finite(profile?.watchdog?.maxAgeMs, configured);
        return Math.max(1000, Math.min(3600000, configured > 0 ? configured : profileValue));
    }
    async tick() {
        const cfg = this.config();
        if (cfg.enabled !== true || cfg.mode === 'off') {
            await this.deactivate();
            return;
        }
        this.registry.load();
        const resolved = this.registry.resolve(cfg);
        if (!resolved.profile || !resolved.validation.ok) {
            this.closeConnector();
            const snapshot = (0, netoperator_canonical_model_1.buildCanonicalSnapshot)({ commOk: false, source: 'profile', driverId: safeText(cfg.driverId), maxAgeMs: this.maxAgeMs(cfg, resolved.profile), errors: [resolved.error || 'driver-profile-invalid'] });
            await this.publish(snapshot, { status: 'mapping-required', profile: resolved.profile, validation: resolved.validation, transportType: safeText(cfg.transport?.type), transportOk: false, latencyMs: 0, error: resolved.error || 'driver-profile-invalid', warnings: [], raw: {} });
            return;
        }
        // Platzhalterprofile werden nicht zyklisch mit leeren Registeradressen
        // gepollt. Erst ein vollständig gemappter Treiber darf den Transport öffnen.
        if (!resolved.validation.ready) {
            this.closeConnector();
            const snapshot = (0, netoperator_canonical_model_1.buildCanonicalSnapshot)({
                commOk: false,
                source: `${resolved.profile.manufacturer}/${resolved.profile.model}`,
                driverId: resolved.profile.id,
                mappingVersion: resolved.profile.mappingVersion,
                maxAgeMs: this.maxAgeMs(cfg, resolved.profile),
                errors: ['driver-mapping-incomplete'],
            });
            await this.publish(snapshot, {
                status: 'mapping-required',
                profile: resolved.profile,
                validation: resolved.validation,
                transportType: safeText(cfg.transport?.type || resolved.profile.defaultProtocol),
                transportOk: false,
                latencyMs: 0,
                error: 'driver-mapping-incomplete',
                warnings: resolved.validation.warnings || [],
                raw: {},
            });
            return;
        }
        const pollIntervalMs = Math.max(250, Math.min(60000, Math.round(finite(cfg.transport?.pollIntervalMs, 1000))));
        if (this.lastSnapshot && Date.now() - this.lastPollAt < pollIntervalMs)
            return;
        this.lastPollAt = Date.now();
        const transportType = safeText(cfg.transport?.type || resolved.profile.defaultProtocol || 'modbus-tcp').toLowerCase();
        let pollResult;
        if (!resolved.profile.protocols.includes(transportType)) {
            this.closeConnector();
            pollResult = { ok: false, rawValues: {}, metadata: {}, latencyMs: 0, error: `transport-not-declared-by-profile:${transportType}`, warnings: [], raw: {} };
        }
        else if (transportType === 'state-map') {
            this.closeConnector();
            pollResult = await this.readStateMap(resolved.profile);
        }
        else if (transportType === 'modbus-tcp') {
            pollResult = await this.connectorFor(cfg, resolved.profile).poll();
        }
        else {
            this.closeConnector();
            pollResult = { ok: false, rawValues: {}, metadata: {}, latencyMs: 0, error: `transport-not-implemented:${transportType}`, warnings: [], raw: {} };
        }
        const snapshot = (0, netoperator_canonical_model_1.buildCanonicalSnapshot)({
            rawValues: pollResult.rawValues,
            metadata: pollResult.metadata,
            receivedAt: Date.now(),
            maxAgeMs: this.maxAgeMs(cfg, resolved.profile),
            commOk: pollResult.ok,
            source: `${resolved.profile.manufacturer}/${resolved.profile.model}`,
            driverId: resolved.profile.id,
            mappingVersion: resolved.profile.mappingVersion,
            errors: pollResult.error ? [pollResult.error] : [],
        });
        const status = !pollResult.ok
            ? 'communication-error'
            : !snapshot.fresh
                ? 'stale'
                : snapshot.valid
                    ? (cfg.mode === 'active' && cfg.commissioned === true && cfg.installerApproved === true ? 'ready-active-integration-locked' : 'ready-diagnostic')
                    : 'invalid-canonical-data';
        await this.publish(snapshot, {
            status,
            profile: resolved.profile,
            validation: resolved.validation,
            transportType,
            transportOk: pollResult.ok,
            latencyMs: pollResult.latencyMs,
            error: pollResult.error,
            warnings: pollResult.warnings || [],
            raw: pollResult.raw,
        });
    }
    getPublicStatus() {
        return {
            ok: true,
            schema: 'nexowatt.netoperator-status-api.v1',
            generatedAt: Date.now(),
            enabled: this.config().enabled === true,
            mode: this.config().mode || 'off',
            readOnly: true,
            hardwareWrite: false,
            certifiedControllerAuthority: true,
            operationEngineIntegration: 'prepared-not-active',
            lastReceivedAt: this.lastReceivedAt,
            lastValidAt: this.lastValidAt,
            snapshot: this.lastSnapshot,
            audit: this.audit.slice(-50),
            driverProfiles: this.registry.list(),
        };
    }
    getRawDiagnostics() {
        return {
            ok: true,
            schema: 'nexowatt.netoperator-service-diagnostics.v1',
            generatedAt: Date.now(),
            config: {
                ...this.config(),
                customProfileJson: this.config().customProfileJson ? '[configured]' : '',
                writebackEnabled: false,
            },
            registryDiagnostics: this.registry.getDiagnostics(),
            lastReceivedAt: this.lastReceivedAt,
            lastValidAt: this.lastValidAt,
            raw: this.lastRaw,
            snapshot: this.lastSnapshot,
            audit: this.audit.slice(-200),
            readOnly: true,
            hardwareWrite: false,
            operationEngineIntegration: 'prepared-not-active',
        };
    }
    async testConnection(configOverride) {
        const cfg = configOverride && typeof configOverride === 'object' ? configOverride : this.config();
        this.registry.load();
        const resolved = this.registry.resolve(cfg);
        if (!resolved.profile || !resolved.validation.ok)
            return { ok: false, error: resolved.error || 'driver-profile-invalid', validation: resolved.validation };
        const transportType = safeText(cfg.transport?.type || resolved.profile.defaultProtocol || 'modbus-tcp').toLowerCase();
        let result;
        if (!resolved.profile.protocols.includes(transportType)) {
            result = { ok: false, error: `transport-not-declared-by-profile:${transportType}`, latencyMs: 0, rawValues: {}, metadata: {}, warnings: [], raw: {} };
        }
        else if (transportType === 'state-map') {
            result = await this.readStateMap(resolved.profile);
        }
        else if (transportType === 'modbus-tcp') {
            const transport = cfg.transport || {};
            const connector = new netoperator_modbus_tcp_1.NetOperatorModbusTcpConnector({ host: safeText(transport.host), port: transport.port, unitId: transport.unitId, timeoutMs: transport.timeoutMs }, resolved.profile);
            try {
                result = await connector.poll();
            }
            finally {
                connector.close();
            }
        }
        else {
            result = { ok: false, error: `transport-not-implemented:${transportType}`, latencyMs: 0, rawValues: {}, metadata: {}, warnings: [], raw: {} };
        }
        return {
            ok: result.ok,
            error: result.error || '',
            warnings: result.warnings || [],
            latencyMs: result.latencyMs || 0,
            validation: resolved.validation,
            profile: { id: resolved.profile.id, manufacturer: resolved.profile.manufacturer, model: resolved.profile.model, mappingVersion: resolved.profile.mappingVersion },
            mappedValues: Object.keys(result.rawValues || {}).length,
            readOnly: true,
            hardwareWrite: false,
        };
    }
}
exports.NetOperatorInterfaceModule = NetOperatorInterfaceModule;
