'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/main/info-connection.ts
 * Quell-Hash: sha256:e243c795c1543456c618ffdb2249fbe07abc86c54230afdf32bb45c7aa088d2f
 * Erzeugung: npm run sync:ts-main-helpers
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel eines echten TypeScript-Helfers für main.js.
 * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv; sie bilden die sichere
 * Grundlage für die spätere schrittweise Auslagerung.
 */
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
