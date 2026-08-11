/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/charging-diagnostics-api.ts
 * Quell-Hash: sha256:90c7fbfb6ef9aae41cf73c27e6911b72012662b674b55f5dc39a36230562123e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/charging-diagnostics-api.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
const parseJsonState = (raw, fallback) => {
    if (typeof raw !== 'string' || !raw.trim())
        return fallback;
    try {
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
};
const readOwn = async (adapter, id) => {
    const state = await adapter.getStateAsync(id);
    return state ? state.val : null;
};
function compactSafetyEnvelope(adapter) {
    const source = adapter?._emsSafetyEnvelope && typeof adapter._emsSafetyEnvelope === 'object' ? adapter._emsSafetyEnvelope : {};
    return {
        valid: source.valid !== false, emergencyStop: source.emergencyStop === true,
        invalidReason: source.invalidReason ? String(source.invalidReason) : '',
        generation: Number.isFinite(Number(source.generation)) ? Number(source.generation) : 0,
        timestamp: Number.isFinite(Number(source.timestamp || source.ts)) ? Number(source.timestamp || source.ts) : 0,
    };
}
async function buildChargingDiagnosticsExtras(adapter, limitRaw = 200) {
    const limit = Number.isFinite(Number(limitRaw)) ? Math.max(1, Math.min(240, Math.round(Number(limitRaw)))) : 200;
    let audit = null;
    try {
        const iface = adapter?._nwChargingManagementAudit;
        if (iface && typeof iface.getEvents === 'function')
            audit = iface.getEvents(limit);
    }
    catch {
        audit = null;
    }
    if (!audit || typeof audit !== 'object') {
        const snapshot = parseJsonState(await readOwn(adapter, 'chargingManagement.audit.snapshotJson'), null);
        const events = parseJsonState(await readOwn(adapter, 'chargingManagement.audit.recentEventsJson'), []);
        audit = {
            schemaVersion: 1, snapshot, events: Array.isArray(events) ? events.slice(-limit) : [],
            eventCount: await readOwn(adapter, 'chargingManagement.audit.eventCount'), maxEvents: 240,
            lastEventTs: await readOwn(adapter, 'chargingManagement.audit.lastEventTs'),
        };
    }
    return { ok: true, ts: Date.now(), audit, safetyEnvelope: compactSafetyEnvelope(adapter), stageA: adapter?._stageADiagnostics || null };
}
async function clearChargingDiagnosticsAudit(adapter) {
    const iface = adapter?._nwChargingManagementAudit;
    if (iface && typeof iface.clear === 'function') {
        const result = await iface.clear();
        return result && typeof result === 'object' ? result : { ok: true, cleared: true };
    }
    await adapter.setStateAsync('chargingManagement.audit.recentEventsJson', { val: '[]', ack: true });
    await adapter.setStateAsync('chargingManagement.audit.lastEventJson', { val: '{}', ack: true });
    await adapter.setStateAsync('chargingManagement.audit.eventCount', { val: 0, ack: true });
    await adapter.setStateAsync('chargingManagement.audit.lastEventTs', { val: 0, ack: true });
    return { ok: true, cleared: true, fallback: true };
}
function registerChargingDiagnosticsAuditApi(app, adapter, requireInstaller) {
    app.get('/api/ems/charging/audit', requireInstaller, async (req, res) => {
        try {
            return res.json(await buildChargingDiagnosticsExtras(adapter, req?.query?.limit));
        }
        catch (error) {
            adapter.log?.warn?.(`Charging diagnostics API error: ${error?.message || error}`);
            return res.status(500).json({ ok: false, error: 'internal error' });
        }
    });
    app.post('/api/ems/charging/audit/clear', requireInstaller, async (_req, res) => {
        try {
            return res.json(await clearChargingDiagnosticsAudit(adapter));
        }
        catch (error) {
            adapter.log?.warn?.(`Charging diagnostics clear API error: ${error?.message || error}`);
            return res.status(500).json({ ok: false, error: 'internal error' });
        }
    });
}
module.exports = { registerChargingDiagnosticsAuditApi, buildChargingDiagnosticsExtras, clearChargingDiagnosticsAudit, compactSafetyEnvelope };
