"use strict";
/**
 * Datei: src-ts/main/info-connection.ts
 *
 * Zweck:
 * Echte TypeScript-Helfer für die spätere zentrale Verwaltung von `info.connection`.
 *
 * Zusammenhang:
 * `info.connection` darf nicht von optionalen Teilfehlern überschrieben werden. Er muss den
 * echten Webserver-/Adapterstatus widerspiegeln.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMainInfoConnectionWritePlan = buildMainInfoConnectionWritePlan;
/**
 * Code-Teil: buildMainInfoConnectionWritePlan
 *
 * Zweck:
 * Erstellt einen eindeutigen Schreibplan für `info.connection`.
 *
 * Wichtig:
 * `true` bedeutet: Webserver/Adapter ist wirklich online. `false` darf nur bei echten
 * Server-/Unload-/Startfehlern geschrieben werden.
 */
function buildMainInfoConnectionWritePlan(value, reason, ts = Date.now()) {
    return { stateId: 'info.connection', value, ack: true, reason, ts };
}
