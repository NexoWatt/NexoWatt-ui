import { type ConnectionReason } from '../connection/connection-state';
import type { TimestampMs } from '../../contracts/units';
/**
 * Datei: src-ts/backend/main-helpers/info-connection-main.ts
 *
 * Zweck:
 * Erster TypeScript-Helfer für die zentrale `info.connection`-Verwaltung aus `main.js`.
 *
 * Zusammenhang:
 * `info.connection` zeigt in ioBroker/Admin, ob Webserver/API/SSE wirklich erreichbar sind.
 * Optional fehlschlagende Teilbereiche dürfen den Adapter nicht offline erscheinen lassen.
 */
export interface MainInfoConnectionPlan {
    readonly id: 'info.connection';
    readonly value: boolean;
    readonly ack: true;
    readonly reason: ConnectionReason;
    readonly message: string;
    readonly ts: TimestampMs;
}
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
export declare function buildMainInfoConnectionPlan(reason: ConnectionReason, ts?: TimestampMs): MainInfoConnectionPlan;
//# sourceMappingURL=info-connection-main.d.ts.map