import type { AdapterStateValue, CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
/**
 * Datei: src-ts/backend/main-helpers/api-state-main.ts
 *
 * Zweck:
 * Erster TypeScript-Helfer für den späteren Aufbau der `/api/state`-Antwort aus `main.js`.
 *
 * Zusammenhang:
 * Das Kundenfrontend, History, SmartHome und KI lesen `/api/state`. Jede Änderung an dieser
 * Antwortstruktur wirkt sich direkt auf die VIS aus. Deshalb wird die Struktur hier schrittweise
 * typisiert, bevor `main.js` produktiv umgestellt wird.
 */
/** Öffentlicher State-Eintrag, wie `/api/state` ihn später typisiert liefern kann. */
export interface MainApiStateEntry<T = unknown> {
    readonly value: T | null;
    readonly ts?: TimestampMs;
    readonly lc?: TimestampMs;
    readonly ack?: boolean;
    readonly q?: number;
}
/** Antwortform für eine kleine, kontrollierte `/api/state`-Helferschicht. */
export interface MainApiStateResponse {
    readonly generatedAt: TimestampMs;
    readonly states: Record<string, MainApiStateEntry | undefined>;
}
/**
 * Code-Teil: toMainApiStateEntry
 *
 * Zweck:
 * Wandelt einen Cache-Eintrag in ein API-fähiges Objekt um.
 *
 * Wichtig:
 * `0` und `false` werden übernommen. Nur wirklich fehlende Werte erzeugen `undefined`.
 */
export declare function toMainApiStateEntry<T = unknown>(raw: AdapterStateValue<T> | CachedState<T> | undefined): MainApiStateEntry<T> | undefined;
/**
 * Code-Teil: buildMainApiStateResponse
 *
 * Zweck:
 * Baut eine typisierte `/api/state`-Teilantwort aus dem StateCache.
 *
 * Zusammenhang:
 * Diese Funktion schreibt nichts und verändert keine Werte. Sie ist ein risikoarmer Schritt,
 * um den großen `/api/state`-Block in `main.js` später zu ersetzen.
 */
export declare function buildMainApiStateResponse(cache: StateCache, includeKeys?: readonly StateId[], generatedAt?: TimestampMs): MainApiStateResponse;
//# sourceMappingURL=api-state-main.d.ts.map