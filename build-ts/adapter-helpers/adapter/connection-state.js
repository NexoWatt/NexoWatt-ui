"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInfoConnectionWritePlan = buildInfoConnectionWritePlan;
/**
 * Code-Teil: buildInfoConnectionWritePlan
 *
 * Zweck:
 * Baut einen eindeutigen Schreibplan für `info.connection`.
 */
function buildInfoConnectionWritePlan(online, reason) {
    return { stateId: 'info.connection', value: online, ack: true, reason };
}
