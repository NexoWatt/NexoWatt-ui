import type { BuildApiStateResponseInput, InfoConnectionUpdate, NormalizedStateEntry } from '../contracts/adapter-api';
import type { AdapterStateValue, CachedState, StateCache } from '../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../contracts/units';
/**
 * Datei: src-ts/adapter/state-cache.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für den State-Cache und erste `/api/state`-Hilfen aus `main.js`.
 * Diese Datei ist noch nicht produktiv angebunden. Sie beschreibt aber die Regeln, die
 * beim späteren Auslagern aus `main.js` eingehalten werden müssen.
 *
 * Zusammenhang:
 * - `main.js` hält aktuell einen Cache aus ioBroker-States.
 * - `/api/state` gibt Teile dieses Caches an das Kundenfrontend aus.
 * - Energiefluss, History, KI-Berater, SmartHome und Feature-Sichtbarkeit lesen daraus.
 *
 * Kritische Regel:
 * `0`, `false` und leere Strings sind gültige Werte. Sie dürfen nicht per `||` oder
 * Wahrheit/Falschheit als fehlend behandelt werden.
 */
export interface StateReadResult<T = unknown> {
    value: T | null;
    key: string | null;
    stateId: StateId | null;
    found: boolean;
    source: 'cache' | 'fallback' | 'missing';
}
export interface StateFreshnessOptions {
    nowMs?: TimestampMs;
    staleAfterMs?: number;
    treatZeroAsFresh?: boolean;
}
/**
 * Code-Teil: normalizeStateEntry
 *
 * Zweck:
 * Normalisiert ein rohes Cache-/ioBroker-State-Objekt in eine einheitliche TypeScript-Form.
 *
 * Zusammenhang:
 * Späterer Kandidat für die Migration aus `main.js`. Alle API- und Diagnosebereiche sollen
 * dieselbe Wert-/Zeitstempelregel verwenden.
 */
export declare function normalizeStateEntry<T = unknown>(id: StateId, raw: AdapterStateValue<T> | CachedState<T> | NormalizedStateEntry<T> | undefined): NormalizedStateEntry<T>;
/**
 * Code-Teil: isStateValuePresent
 *
 * Zweck:
 * Prüft, ob ein normalisierter State fachlich einen Wert enthält.
 *
 * Wichtig:
 * 0 und false sind vorhanden. Nur null/undefined gelten als fehlend.
 */
export declare function isStateValuePresent(entry: NormalizedStateEntry | undefined): boolean;
/**
 * Code-Teil: isStateFreshEnough
 *
 * Zweck:
 * Prüft die Zeitstempel-Frische eines States.
 *
 * Zusammenhang:
 * Für Speicher-/Budget-0-Werte kann `treatZeroAsFresh` gesetzt werden. So bleibt ein
 * korrekter 0-W-Wert gültig, auch wenn sein `lc` lange alt ist.
 */
export declare function isStateFreshEnough(entry: NormalizedStateEntry | undefined, options?: StateFreshnessOptions): boolean;
/**
 * Code-Teil: readFirstAvailableState
 *
 * Zweck:
 * Liest aus mehreren Alias-Schlüsseln den ersten vorhandenen Statewert.
 *
 * Zusammenhang:
 * Viele Werte haben historische Namen. Dieser Helfer dokumentiert, wie Aliase später
 * typisiert und nachvollziehbar gelesen werden.
 */
export declare function readFirstAvailableState<T = unknown>(cache: StateCache, keys: readonly string[], fallback?: T | null): StateReadResult<T>;
/** Code-Teil: readCachedNumber. Zweck: Liest Zahlenwerte für spätere API-/State-Helfer robust aus dem Cache. */
export declare function readCachedNumber(cache: StateCache, key: string, fallback?: number | null): number | null;
/** Code-Teil: readCachedBoolean. Zweck: Liest boolesche Werte, ohne false als fehlend zu behandeln. */
export declare function readCachedBoolean(cache: StateCache, key: string, fallback?: boolean): boolean;
/** Code-Teil: readCachedString. Zweck: Liest Stringwerte und erhält auch leere Strings als bewusste Werte. */
export declare function readCachedString(cache: StateCache, key: string, fallback?: string): string;
/**
 * Code-Teil: buildApiStateResponse
 *
 * Zweck:
 * Baut eine typisierte `/api/state`-ähnliche Antwort aus ausgewählten Cache-Werten.
 *
 * Zusammenhang:
 * Der produktive Endpunkt bleibt in `main.js`. Dieser Helfer ist die spätere
 * Auslagerungsbasis und schützt, dass 0/false nicht verloren gehen.
 */
export declare function buildApiStateResponse(input: BuildApiStateResponseInput): {
    states: Record<string, NormalizedStateEntry<unknown> | undefined>;
    generatedAt: number;
};
/**
 * Code-Teil: createInfoConnectionUpdate
 *
 * Zweck:
 * Baut eine nachvollziehbare `info.connection`-Aktualisierung.
 *
 * Zusammenhang:
 * Später soll `main.js` diesen State nicht mehr verstreut schreiben, sondern über eine
 * zentrale, testbare Regel setzen.
 */
export declare function createInfoConnectionUpdate(value: boolean, reason: InfoConnectionUpdate['reason'], ts?: TimestampMs): InfoConnectionUpdate;
//# sourceMappingURL=state-cache.d.ts.map