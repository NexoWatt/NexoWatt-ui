"use strict";
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
