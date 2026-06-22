import type { ApiStateEnvelope, ApiStatePayloadValue, ApiStateSource, NormalizedApiStateEntry, RawAdapterStateLike } from '../../contracts/api-state';
import type { StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
/**
 * Code-Teil: extractPayloadValue
 *
 * Zweck:
 * Holt aus verschiedenen Rohformen den fachlichen Nutzwert heraus.
 *
 * Priorität:
 * 1. Feld `value`, wenn vorhanden.
 * 2. Feld `val`, wenn vorhanden.
 * 3. Rohwert selbst, wenn es kein State-Objekt ist.
 *
 * Wichtig:
 * `0`, `false` und `''` bleiben gültige Werte. Nur `undefined` wird zu `null`.
 */
export declare function extractPayloadValue(raw: RawAdapterStateLike): ApiStatePayloadValue;
/**
 * Code-Teil: normalizeApiStateEntry
 *
 * Zweck:
 * Normalisiert einen beliebigen State-Rohwert auf den Typ `NormalizedApiStateEntry`.
 *
 * Zusammenhang:
 * Diese Funktion ist der spätere Kandidat für die zentrale State-Serialisierung in
 * `main.js`. Sie schützt kritische Bereiche wie Energiefluss, Heizstab und Lizenz, weil
 * gültige Null-/False-Werte nicht verloren gehen.
 */
export declare function normalizeApiStateEntry(id: StateId, raw: RawAdapterStateLike, source?: ApiStateSource): NormalizedApiStateEntry;
/**
 * Code-Teil: readCacheEntry
 *
 * Zweck:
 * Liest einen State aus dem typisierten Cache und gibt eine normalisierte API-Form
 * zurück.
 *
 * Zusammenhang:
 * Später kann `main.js` damit `/api/state` aufbauen, ohne an vielen Stellen eigene
 * `val`/`value`-Sonderlogik zu duplizieren.
 */
export declare function readCacheEntry(cache: StateCache, key: StateId): NormalizedApiStateEntry;
/**
 * Code-Teil: isFreshEnough
 *
 * Zweck:
 * Prüft optional, ob ein State-Zeitstempel innerhalb einer erwarteten Frischegrenze liegt.
 *
 * Wichtig:
 * Diese Funktion bewertet nur den Zeitstempel. Sie darf niemals den fachlichen Wert
 * `0` als fehlend betrachten. Gerade Speicher-DPs stehen oft lange korrekt auf 0 W.
 */
export declare function isFreshEnough(entry: NormalizedApiStateEntry, maxAgeMs: number, nowMs: TimestampMs): boolean;
/**
 * Code-Teil: buildApiStateEnvelope
 *
 * Zweck:
 * Baut eine typisierte `/api/state`-Momentaufnahme aus einem StateCache.
 *
 * Zusammenhang:
 * Dieses Modell ist der spätere sichere Ersatz für manuelle Response-Zusammenstellungen
 * in `main.js`. Frontend und History bekommen dadurch eine konsistente State-Form.
 */
export declare function buildApiStateEnvelope(cache: StateCache, requestedKeys?: readonly StateId[], nowMs?: TimestampMs): ApiStateEnvelope;
//# sourceMappingURL=api-state-cache.d.ts.map