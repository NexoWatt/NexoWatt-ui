"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeApiSetKey = normalizeApiSetKey;
exports.buildScopedStateId = buildScopedStateId;
exports.planApiStateWrite = planApiStateWrite;
exports.createApiSetResponse = createApiSetResponse;
/**
 * Datei: src-ts/backend/api-state/api-set-helpers.ts
 *
 * Zweck:
 * Reine TypeScript-Helfer für spätere `/api/set`-Logik aus `main.js`.
 *
 * Zusammenhang:
 * Das Frontend schreibt Einstellungen, Mappings, Lizenz- und Steuerwerte über API-Endpunkte.
 * Aktuell liegt die produktive Logik in `main.js`. Diese Datei bereitet eine kleine,
 * typisierte und testbare Schreibplanung vor.
 */
/**
 * Code-Teil: normalizeApiSetKey
 *
 * Zweck:
 * Entfernt gefährliche Randpunkte und Whitespace aus einem API-Key.
 *
 * Wichtig:
 * Aus `scope` und `key` wird später eine State-ID gebaut. Leere oder kaputte Keys dürfen nicht
 * zu falschen Adapter-States führen.
 */
function normalizeApiSetKey(key) {
    return String(key ?? '').trim().replace(/^\.+|\.+$/g, '');
}
/**
 * Code-Teil: buildScopedStateId
 *
 * Zweck:
 * Baut eine lokale Adapter-State-ID aus Scope und Key.
 *
 * Beispiel:
 * `settings` + `aiAdvisorEnabled` wird zu `settings.aiAdvisorEnabled`.
 */
function buildScopedStateId(scope, key) {
    const cleanScope = normalizeApiSetKey(scope);
    const cleanKey = normalizeApiSetKey(key);
    return [cleanScope, cleanKey].filter(Boolean).join('.');
}
/**
 * Code-Teil: planApiStateWrite
 *
 * Zweck:
 * Erstellt aus einem API-Set-Request eine geplante State-Schreiboperation.
 *
 * Wichtig:
 * Diese Funktion schreibt noch nichts. Sie hält nur die spätere Regel fest, dass API-Requests
 * als Steuer-/Konfigurationsschreibungen standardmäßig `ack=false` verwenden.
 */
function planApiStateWrite(request, ack = false) {
    const stateId = request.id ? normalizeApiSetKey(request.id) : buildScopedStateId(request.scope, request.key);
    return {
        stateId,
        value: request.value,
        ack,
        reason: `api-set:${request.scope}.${request.key}`,
    };
}
/**
 * Code-Teil: createApiSetResponse
 *
 * Zweck:
 * Baut eine kleine typisierte Antwort für erfolgreiche Set-Operationen.
 */
function createApiSetResponse(request, plan) {
    return {
        ok: true,
        scope: request.scope,
        key: request.key,
        writtenStateId: plan.stateId,
        message: 'queued',
    };
}
