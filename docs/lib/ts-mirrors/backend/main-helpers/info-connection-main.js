'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/main-helpers/info-connection-main.ts
 * Quell-Hash: sha256:4163efa29b0eccea3d069028a0f151c497ca1032051fcd9c0660edeef97bad1d
 * Erzeugung: npm run sync:ts-backend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer backendnahen TypeScript-Quelle.
 * Sie wird in 0.7.68 noch nicht von main.js genutzt, legt aber die spätere
 * sichere Migration für StateCache, Lizenz und Feature-Sichtbarkeit fest.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in den passenden Dateien unter src-ts/backend/ vornehmen.
 * 2. npm run sync:ts-backend-mirrors ausführen.
 * 3. npm run test:backend-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMainInfoConnectionPlan = buildMainInfoConnectionPlan;
const connection_state_1 = require("../connection/connection-state");
/**
 * Code-Teil: buildMainInfoConnectionPlan
 *
 * Zweck:
 * Baut einen typisierten Schreibplan für `info.connection`.
 *
 * Wichtig:
 * Der Helfer schreibt nicht selbst. Er gibt nur die Entscheidung zurück, damit `main.js` später
 * zentral und testbar setzen kann.
 */
function buildMainInfoConnectionPlan(reason, ts = Date.now()) {
    const decision = (0, connection_state_1.decideConnectionState)(reason);
    return {
        id: 'info.connection',
        value: decision.connected,
        ack: true,
        reason: decision.reason,
        message: decision.message,
        ts,
    };
}
