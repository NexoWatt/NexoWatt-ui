import type { StateWritePlan } from '../contracts/api';

/**
 * Datei: src-ts/adapter/connection-state.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für den State `info.connection`.
 *
 * Zusammenhang:
 * `info.connection` darf nur den echten Webserverstatus widerspiegeln. Diese Datei hält
 * die spätere zentrale Schreibregel fest.
 */

export type ConnectionReason = 'webserver-started' | 'heartbeat' | 'webserver-error' | 'unload' | 'startup-failed';

/**
 * Code-Teil: buildInfoConnectionWritePlan
 *
 * Zweck:
 * Baut einen eindeutigen Schreibplan für `info.connection`.
 */
export function buildInfoConnectionWritePlan(online: boolean, reason: ConnectionReason): StateWritePlan<boolean> {
  return { stateId: 'info.connection', value: online, ack: true, reason };
}
