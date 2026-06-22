import type { CustomerFeatureVisibilitySnapshot } from './feature-visibility-diagnostics';
/**
 * Datei: src-ts/frontend/feature-visibility-shadow-compare.ts
 *
 * Zweck:
 * Bereitet den sicheren Vergleich zwischen alter JavaScript-Sichtbarkeitslogik und
 * neuer TypeScript-Sichtbarkeitslogik vor.
 *
 * Zusammenhang:
 * Bevor EVCS/Farm/SmartHome/Wetter/KI im produktiven Frontend auf TypeScript-Helfer
 * umgestellt werden, muss die neue TS-Entscheidung parallel gegen die alte JS-Logik
 * geprüft werden. Diese Datei liefert dafür einen reinen Vergleichshelfer ohne DOM.
 *
 * Wichtig:
 * Dieser Helfer darf keine Feature-Sichtbarkeit setzen. Er meldet nur Abweichungen.
 * Damit können wir in einem späteren Schritt einen Shadow-Compare in `www/app.js`
 * einbauen, ohne das Dashboard-Verhalten sofort zu verändern.
 */
/** Feature-Schlüssel, die im Kundenfrontend sichtbar/unsichtbar geschaltet werden. */
export type ShadowFeatureKey = keyof CustomerFeatureVisibilitySnapshot;
/** Einzelne Abweichung zwischen alter JS-Logik und neuer TS-Logik. */
export interface FeatureVisibilityShadowMismatch {
    /** Betroffenes Feature, z. B. `hasEvcs` oder `hasStorageFarm`. */
    readonly key: ShadowFeatureKey;
    /** Ergebnis der bestehenden JavaScript-Runtime-Logik. */
    readonly legacyValue: boolean;
    /** Ergebnis der neuen TypeScript-Spiegellogik. */
    readonly nextValue: boolean;
    /** Deutsche Diagnose, warum diese Abweichung wichtig ist. */
    readonly messageDe: string;
}
/** Ergebnis eines kompletten Shadow-Vergleichs. */
export interface FeatureVisibilityShadowCompareResult {
    /** `true`, wenn alte und neue Sichtbarkeit vollständig gleich sind. */
    readonly matches: boolean;
    /** Alle gefundenen Abweichungen. */
    readonly mismatches: ReadonlyArray<FeatureVisibilityShadowMismatch>;
    /** Kompakter deutscher Text für Debug-Konsole oder spätere Diagnose-States. */
    readonly summaryDe: string;
}
/**
 * Code-Teil: compareFeatureVisibility
 *
 * Zweck:
 * Vergleicht zwei vollständige Sichtbarkeitszustände.
 *
 * Zusammenhang:
 * Späterer Kandidat für einen Shadow-Compare in `www/app.js`. Die bestehende Runtime
 * berechnet weiter die echte Anzeige; die TS-Logik läuft parallel und liefert nur
 * Diagnose, falls sich Entscheidungen unterscheiden.
 *
 * Wichtig:
 * Diese Funktion verändert keine DOM-Elemente und keine globalen Flags. Sie ist
 * dadurch risikoarm und kann vor einer produktiven Umstellung getestet werden.
 */
export declare function compareFeatureVisibility(legacy: Partial<CustomerFeatureVisibilitySnapshot>, next: Partial<CustomerFeatureVisibilitySnapshot>): FeatureVisibilityShadowCompareResult;
/**
 * Code-Teil: hasBlockingVisibilityMismatch
 *
 * Zweck:
 * Erkennt Abweichungen, die für Kundenanlagen besonders kritisch wären.
 *
 * Zusammenhang:
 * EVCS und Speicherfarm dürfen niemals sichtbar werden, wenn sie nicht vorhanden sind.
 * Darum werden Abweichungen bei diesen Features später als besonders wichtig geloggt.
 */
export declare function hasBlockingVisibilityMismatch(result: FeatureVisibilityShadowCompareResult): boolean;
/**
 * Code-Teil: formatFeatureVisibilityShadowLog
 *
 * Zweck:
 * Baut einen kompakten deutschen Logtext aus dem Vergleichsergebnis.
 *
 * Zusammenhang:
 * Für den späteren Runtime-Shadow-Modus wollen wir keine großen Objekte ungefiltert
 * in die Browserkonsole schreiben, sondern verständliche kurze Diagnosezeilen.
 */
export declare function formatFeatureVisibilityShadowLog(result: FeatureVisibilityShadowCompareResult): string;
//# sourceMappingURL=feature-visibility-shadow-compare.d.ts.map