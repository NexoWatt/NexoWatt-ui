/**
 * Datei: src-ts/backend/connection/connection-state.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der `info.connection`-Logik aus `main.js` vor.
 *
 * Zusammenhang:
 * `info.connection` darf nur den echten Adapter-/Webserverstatus widerspiegeln. Optionale
 * Teilfehler nach dem Webserverstart dürfen die Verbindung nicht fälschlich offline setzen.
 */
export type ConnectionReason = 'startup' | 'webserver-listening' | 'heartbeat' | 'partial-init-warning' | 'webserver-error' | 'webserver-closed' | 'unload' | 'startup-failed';
export interface ConnectionStateDecision {
    readonly connected: boolean;
    readonly reason: ConnectionReason;
    readonly message: string;
}
/**
 * Code-Teil: decideConnectionState
 *
 * Zweck:
 * Erzeugt eine fachliche Entscheidung für `info.connection`.
 *
 * Wichtig:
 * `partial-init-warning` bleibt online, wenn der Webserver bereits läuft. Genau dieser Fall war
 * früher kritisch, weil optionale Bereiche den Adapter fälschlich offline wirken lassen konnten.
 */
export declare function decideConnectionState(reason: ConnectionReason): ConnectionStateDecision;
//# sourceMappingURL=connection-state.d.ts.map