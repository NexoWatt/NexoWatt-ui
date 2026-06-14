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

export type MainConnectionReason = 'webserver-started' | 'heartbeat' | 'webserver-error' | 'server-closed' | 'adapter-unload' | 'startup-failed';

export interface MainInfoConnectionWritePlan {
  readonly stateId: 'info.connection';
  readonly value: boolean;
  readonly ack: true;
  readonly reason: MainConnectionReason;
  readonly ts: number;
}

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
export function buildMainInfoConnectionWritePlan(value: boolean, reason: MainConnectionReason, ts = Date.now()): MainInfoConnectionWritePlan {
  return { stateId: 'info.connection', value, ack: true, reason, ts };
}
