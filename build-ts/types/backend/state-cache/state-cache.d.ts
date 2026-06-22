import type { AdapterStateValue, CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
/**
 * Datei: src-ts/backend/state-cache/state-cache.ts
 *
 * Zweck:
 * Reine TypeScript-Helfer für den späteren Umbau der StateCache-Logik aus `main.js`.
 *
 * Zusammenhang:
 * `main.js` sammelt ioBroker-States und liefert sie über `/api/state`, SSE, History und
 * EMS-Module weiter. Diese Helfer definieren, wie Rohwerte wie `value`, `val`, `ts`, `lc`
 * und `ack` später einheitlich verarbeitet werden.
 *
 * Wichtig:
 * 0, false und leere Strings können gültige Werte sein. Diese Datei darf solche Werte nicht
 * per Wahrheitstest (`if (value)`) verlieren, weil sonst Speicher-, History- und Feature-
 * Sichtbarkeitsfehler entstehen können.
 */
export type CacheEntry<T = unknown> = CachedState<T> | AdapterStateValue<T> | undefined;
/**
 * Code-Teil: getStateValue
 *
 * Zweck:
 * Liest aus einem Cache-Eintrag den fachlichen Wert. `value` hat Vorrang, `val` ist der
 * Legacy-Fallback aus ioBroker-State-Objekten.
 *
 * Kritische Regel:
 * `0` und `false` sind gültig. Deshalb wird bewusst auf Property-Vorhandensein geprüft und
 * nicht auf Wahrheit des Werts.
 */
export declare function getStateValue<T = unknown>(entry: CacheEntry<T>, fallback?: T | null): T | null;
/**
 * Code-Teil: getStateTimestamp
 *
 * Zweck:
 * Holt den besten verfügbaren Zeitstempel aus `ts` oder `lc`.
 *
 * Zusammenhang:
 * Diese Information wird später für Diagnose und Aktualitätsanzeigen gebraucht. Sie darf aber
 * nicht allein entscheiden, ob ein konfigurierter Speicher-DP mit 0 W ungültig ist.
 */
export declare function getStateTimestamp(entry: CacheEntry, fallback?: TimestampMs | null): TimestampMs | null;
/**
 * Code-Teil: hasExplicitStateValue
 *
 * Zweck:
 * Prüft, ob ein Cache-Eintrag wirklich einen Wert enthält.
 *
 * Wichtig:
 * Diese Funktion gibt für `0` und `false` true zurück. Genau diese Regel schützt Split-DPs,
 * signed DPs und Feature-Sichtbarkeiten vor falschen Fallbacks.
 */
export declare function hasExplicitStateValue(entry: CacheEntry): boolean;
/**
 * Code-Teil: normalizeCachedState
 *
 * Zweck:
 * Wandelt unterschiedliche Rohformen in eine einheitliche Cache-Form.
 *
 * Zusammenhang:
 * Später kann `main.js` diese Form für `/api/state`, SSE, History und EMS-Module nutzen,
 * damit jeder Bereich dieselbe Interpretation von Werten sieht.
 */
export declare function normalizeCachedState<T = unknown>(id: StateId, entry: CacheEntry<T>): CachedState<T>;
/**
 * Code-Teil: readNumberFromCache
 *
 * Zweck:
 * Liest eine Zahl aus dem Cache. `0` wird als gültige Zahl zurückgegeben.
 */
export declare function readNumberFromCache(cache: StateCache, key: StateId, fallback?: number | null): number | null;
/**
 * Code-Teil: readBooleanFromCache
 *
 * Zweck:
 * Liest Boolean-Werte aus echten Booleans, Zahlen oder typischen Textwerten.
 */
export declare function readBooleanFromCache(cache: StateCache, key: StateId, fallback?: boolean): boolean;
/**
 * Code-Teil: readStringFromCache
 *
 * Zweck:
 * Liest einen String aus dem Cache und hält die Fallback-Regel zentral.
 */
export declare function readStringFromCache(cache: StateCache, key: StateId, fallback?: string): string;
//# sourceMappingURL=state-cache.d.ts.map