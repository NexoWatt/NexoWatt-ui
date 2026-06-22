/**
 * Datei: src-ts/frontend/runtime-shadow.ts
 *
 * Zweck:
 * Bereitet eine optionale Laufzeit-Schattenprüfung der browsernahen TypeScript-Spiegel vor.
 * Diese Datei ist ein sicherer Zwischenschritt der Migration: Sie kann die erzeugten MJS-
 * Spiegel im Browser oder in Node importieren, verändert aber keine UI-Werte und keine
 * produktive Adapterlogik.
 *
 * Zusammenhang:
 * - Quelle liegt in `src-ts/frontend/runtime-shadow.ts`.
 * - Spiegel liegt später in `www/static/ts-mirrors/frontend/runtime-shadow.mjs`.
 * - Der Check nutzt die bereits erzeugten MJS-Spiegel wie `display-format.mjs`,
 *   `customer-feature-visibility.mjs` und `history-controls.mjs`.
 *
 * Wichtig für spätere Änderungen:
 * Diese Datei darf keine DOM-Pflichtabhängigkeit bekommen. Sie muss mit Node importierbar
 * bleiben, damit unsere Mirror-Runtime-Checks auch ohne Browser laufen.
 */
/** Ergebnis eines einzelnen Shadow-Checks. */
export interface FrontendTsShadowDetail {
    /** Technischer Name des geprüften Teilbereichs. */
    readonly key: string;
    /** Ob dieser Teilbereich erwartungsgemäß funktioniert hat. */
    readonly ok: boolean;
    /** Kurzer deutscher Hinweis für Log/Diagnose. */
    readonly messageDe: string;
}
/** Gesamtergebnis der optionalen Frontend-Shadow-Prüfung. */
export interface FrontendTsShadowReport {
    /** True, wenn alle Einzelprüfungen erfolgreich waren. */
    readonly ok: boolean;
    /** Kurzer Berichtstext für Entwicklerkonsole oder Diagnose. */
    readonly summaryDe: string;
    /** Einzelprüfungen, damit man Abweichungen später schnell findet. */
    readonly details: ReadonlyArray<FrontendTsShadowDetail>;
}
/**
 * Code-Teil: normalizeMirrorBaseUrl
 *
 * Zweck:
 * Normalisiert die Basis-URL für dynamische MJS-Imports.
 *
 * Zusammenhang:
 * Im Browser wird später z. B. `/static/ts-mirrors/frontend/` genutzt. In Node-Tests
 * wird dagegen eine `file://.../frontend/`-URL übergeben. Beide Varianten müssen am
 * Ende mit `/` enden, damit `base + "display-format.mjs"` gültig ist.
 */
export declare function normalizeMirrorBaseUrl(baseUrl: string): string;
/**
 * Code-Teil: shouldRunFrontendTsMirrorShadow
 *
 * Zweck:
 * Entscheidet, ob die optionale Shadow-Prüfung aktiv werden soll.
 *
 * Zusammenhang:
 * Produktiv soll diese Prüfung nicht automatisch laufen. Sie ist nur ein Diagnosewerkzeug
 * für Entwickler, z. B. über `?tsMirror=1` oder `?tsShadow=1`.
 */
export declare function shouldRunFrontendTsMirrorShadow(queryString: string | undefined): boolean;
/**
 * Code-Teil: runFrontendTsMirrorShadowCheck
 *
 * Zweck:
 * Importiert die erzeugten Frontend-MJS-Spiegel und prüft wenige kritische, bekannte
 * Fehlerfälle aus unserem Projekt.
 *
 * Geprüft wird bewusst nur read-only:
 * - `0 W` muss gültig formatiert werden.
 * - EVCS bleibt ohne echte Wallbox unsichtbar.
 * - History blendet EVCS PDF ohne Wallbox aus.
 *
 * Zusammenhang:
 * Das ist die erste sichere Brücke zwischen TypeScript-Spiegel und späterer Frontend-
 * Runtime. Der Check verändert kein DOM und schreibt keine States.
 */
export declare function runFrontendTsMirrorShadowCheck(baseUrl?: string): Promise<FrontendTsShadowReport>;
//# sourceMappingURL=runtime-shadow.d.ts.map