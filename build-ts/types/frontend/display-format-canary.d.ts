/**
 * Datei: src-ts/frontend/display-format-canary.ts
 *
 * Zweck:
 * Diese Datei ist der erste sichere Laufzeit-Canary für die Frontend-TypeScript-Migration.
 * Sie vergleicht die alten JavaScript-Formatter aus `www/app.js` mit den neuen TypeScript-
 * Formatter-Spiegeln, ohne die Anzeige bereits produktiv umzuschalten.
 *
 * Zusammenhang:
 * - `src-ts/frontend/display-format.ts` enthält die neue typisierte Formatierung.
 * - `www/static/ts-mirrors/frontend/display-format.mjs` ist der generierte Browser-Spiegel.
 * - `www/app.js` lädt diesen Canary optional und loggt nur Diagnoseinformationen.
 *
 * Wichtig:
 * Dieser Canary darf keine UI-Werte verändern. Er ist nur ein Sicherheitsgurt, damit wir
 * später die Anzeigeformatierung kontrolliert auf TypeScript umstellen können.
 */
/** Kleine Menge an Formatfunktionen, die der Canary aus dem TS-Spiegel erwartet. */
export interface DisplayFormatterMirrorApi {
    readonly formatPowerValue: (value: unknown, options?: {
        readonly signed?: boolean;
        readonly decimals?: number;
    }) => {
        readonly text: string;
    };
    readonly formatEnergyValue: (value: unknown) => {
        readonly text: string;
    };
    readonly formatPercentValue: (value: unknown) => {
        readonly text: string;
    };
}
/** Legacy-Formatter aus `www/app.js`, die weiterhin Quelle der produktiven Anzeige bleiben. */
export interface LegacyDisplayFormatterApi {
    readonly formatPower: (value: unknown) => string;
    readonly formatEnergyKwh: (value: unknown) => string;
    readonly formatPercent?: (value: unknown) => string;
}
/** Einzelner Vergleichsfall zwischen Legacy-JS und TS-Spiegel. */
export interface DisplayFormatterCanaryCase {
    readonly key: string;
    readonly kind: 'power' | 'energy' | 'percent';
    readonly value: unknown;
    readonly expectedLegacy?: string;
}
/** Ergebnis eines einzelnen Canary-Vergleichs. */
export interface DisplayFormatterCanaryResult {
    readonly key: string;
    readonly kind: DisplayFormatterCanaryCase['kind'];
    readonly ok: boolean;
    readonly legacyText: string;
    readonly mirrorText: string;
}
/** Zusammenfassung, die `www/app.js` in die Konsole schreiben kann. */
export interface DisplayFormatterCanarySummary {
    readonly ok: boolean;
    readonly checked: number;
    readonly mismatches: readonly DisplayFormatterCanaryResult[];
    readonly results: readonly DisplayFormatterCanaryResult[];
}
/**
 * Code-Teil: defaultDisplayFormatterCanaryCases
 *
 * Zweck:
 * Enthält bewusst kleine, aber fachlich kritische Anzeige-Testwerte.
 *
 * Zusammenhang:
 * Die Fälle spiegeln Probleme aus dem Projekt wider: `0 W` darf nicht verschwinden,
 * kW-Werte müssen lesbar bleiben und Prozentwerte wie `0 %` sind gültig.
 */
export declare const defaultDisplayFormatterCanaryCases: readonly DisplayFormatterCanaryCase[];
/**
 * Code-Teil: normalizeDisplayTextForCanary
 *
 * Zweck:
 * Normalisiert Anzeige-Texte für den Vergleich, ohne produktive UI-Ausgabe zu verändern.
 *
 * Zusammenhang:
 * Der alte JavaScript-Formatter und der neue TypeScript-Formatter dürfen anfangs leicht
 * unterschiedliche Nachkommastellen liefern. Für 0.7.73 loggen wir solche Abweichungen nur,
 * damit später bewusst entschieden wird, welcher Text Standard wird.
 */
export declare function normalizeDisplayTextForCanary(text: unknown): string;
/**
 * Code-Teil: runDisplayFormatterCanary
 *
 * Zweck:
 * Vergleicht die produktive Legacy-Formatierung mit dem TypeScript-Spiegel.
 *
 * Zusammenhang:
 * `www/app.js` ruft diese Funktion optional nach dem Laden der MJS-Spiegel auf. Das Ergebnis
 * wird nur als Diagnose gespeichert/geloggt. Die Live-Anzeige nutzt in diesem Schritt weiter
 * die vorhandene JavaScript-Formatierung.
 */
export declare function runDisplayFormatterCanary(mirror: DisplayFormatterMirrorApi, legacy: LegacyDisplayFormatterApi, cases?: readonly DisplayFormatterCanaryCase[]): DisplayFormatterCanarySummary;
//# sourceMappingURL=display-format-canary.d.ts.map