import type { CachedState, StateCache } from '../../contracts/iobroker-states';
import type { StateId, TimestampMs } from '../../contracts/units';
/**
 * Datei: src-ts/backend/main-helpers/state-cache-main.ts
 *
 * Zweck:
 * Erster echter TypeScript-Helferblock für die spätere Auslagerung von StateCache-Zugriffen
 * aus `main.js`.
 *
 * Zusammenhang:
 * `main.js` hält aktuell `this.stateCache` und viele Bereiche lesen daraus direkt. Diese
 * Datei definiert den kanonischen Zugriff für Zahlen, Booleans, Strings und rohe Cache-Einträge.
 *
 * Wichtig:
 * `0`, `false` und `''` können gültige Werte sein. Dieser Helfer darf solche Werte niemals
 * als fehlend behandeln, weil sonst Speicher-, EVCS-, Feature- und Lizenzlogik kippen kann.
 */
/** Beschreibt einen aus `main.js` gelesenen StateCache-Wert inklusive Diagnosequelle. */
export interface MainStateRead<T = unknown> {
    readonly key: StateId;
    readonly value: T | null;
    readonly found: boolean;
    readonly ts: TimestampMs | null;
    readonly source: 'state-cache' | 'fallback' | 'missing';
}
/**
 * Code-Teil: readMainStateValue
 *
 * Zweck:
 * Liest einen einzelnen StateCache-Eintrag so, wie `main.js` ihn später zentral lesen soll.
 *
 * Zusammenhang:
 * Das ist die Grundlage für `/api/state`, Feature-Sichtbarkeit und Diagnose. Wenn wir später
 * direkte Zugriffe wie `this.stateCache[key]?.value` ersetzen, soll diese Funktion die Regel
 * für fehlende und vorhandene Werte liefern.
 */
export declare function readMainStateValue<T = unknown>(cache: StateCache, key: StateId, fallback?: T | null): MainStateRead<T>;
/**
 * Code-Teil: readMainNumber
 *
 * Zweck:
 * Liest Zahlen aus dem `main.js`-StateCache. `0` bleibt ein gültiger Zahlenwert.
 *
 * Zusammenhang:
 * Dieser Helfer ist besonders wichtig für Speicherleistung, Netzleistung, SoC und Budgets.
 */
export declare function readMainNumber(cache: StateCache, key: StateId, fallback?: number | null): number | null;
/**
 * Code-Teil: readMainBoolean
 *
 * Zweck:
 * Liest boolesche Werte aus dem StateCache. `false` ist ein gültiger Wert.
 *
 * Zusammenhang:
 * Wird später für Feature-Sichtbarkeit, KI-Kundenschalter, Wetter aktiv und ähnliche Flags genutzt.
 */
export declare function readMainBoolean(cache: StateCache, key: StateId, fallback?: boolean): boolean;
/**
 * Code-Teil: readMainString
 *
 * Zweck:
 * Liest Strings aus dem StateCache und behält bewusst leere Strings als Wertform bei.
 */
export declare function readMainString(cache: StateCache, key: StateId, fallback?: string): string;
/**
 * Code-Teil: normalizeMainCacheEntry
 *
 * Zweck:
 * Erzeugt die einheitliche Cache-Darstellung für spätere `/api/state`- und SSE-Auslagerungen.
 */
export declare function normalizeMainCacheEntry<T = unknown>(cache: StateCache, key: StateId): CachedState<T>;
//# sourceMappingURL=state-cache-main.d.ts.map