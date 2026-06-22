/**
 * Datei: src-ts/frontend/display.ts
 *
 * Zweck:
 * Bündelt kleine, reine Anzeigehelfer für die spätere TypeScript-Migration der Kunden-VIS.
 *
 * Zusammenhang:
 * `www/app.js`, `www/history.js` und `www/smarthome.js` formatieren heute viele Werte direkt.
 * Diese Fassade ist der kontrollierte TS-Einstieg, damit spätere Frontend-Schritte nicht wieder
 * verstreute Formatter und Feature-Labels erzeugen.
 *
 * Wichtig:
 * Diese Datei ist in 0.7.65 noch nicht produktiv im Browser verdrahtet. Sie dient nur als
 * typisierter, kommentierter und getesteter Migrationsbaustein.
 */
/** Schlankes Anzeigeergebnis für reine Frontend-Helfer. */
export interface FrontendDisplayValue {
    readonly text: string;
    readonly value: number | null;
    readonly unit: string;
}
/** Optionen für Prozentdarstellung im Frontend. */
export interface PercentageDisplayOptions {
    /** Anzahl Nachkommastellen. Standard: 0. */
    readonly decimals?: number;
    /** Begrenzung auf 0–100 %. Standard: true. */
    readonly clamp?: boolean;
}
/** Feature-Kürzel, die das Kundenfrontend sichtbar/unsichtbar schalten kann. */
export type FrontendFeatureKind = 'evcs' | 'storagefarm' | 'smarthome' | 'weather' | 'aiAdvisor' | 'settings' | 'history' | 'live';
/** Beschriftung eines Features für spätere Navigation, Menüs und Debug-Ausgaben. */
export interface FrontendFeatureLabel {
    readonly key: FrontendFeatureKind;
    readonly label: string;
    readonly shortLabel: string;
}
/**
 * Code-Teil: formatPowerValue
 *
 * Zweck:
 * Reicht die zentrale Leistungsformatierung als schlankes Anzeigeergebnis weiter.
 *
 * Zusammenhang:
 * Der Wrapper erlaubt später, Frontend-Dateien nur aus `frontend/display` zu importieren, ohne die
 * interne Dateistruktur der Formatter zu kennen.
 */
export declare function formatPowerValue(value: unknown): FrontendDisplayValue;
/**
 * Code-Teil: formatPercentageValue
 *
 * Zweck:
 * Formatiert Prozentwerte mit optionalen Nachkommastellen für SoC, Autarkie und Forecastqualität.
 */
export declare function formatPercentageValue(value: unknown, options?: PercentageDisplayOptions): FrontendDisplayValue;
/**
 * Code-Teil: formatEnergyKwhValue
 *
 * Zweck:
 * Formatiert Energie in kWh/MWh für History und Reports.
 */
export declare function formatEnergyKwhValue(valueKwh: unknown): FrontendDisplayValue;
/**
 * Code-Teil: normalizeFeatureKind
 *
 * Zweck:
 * Wandelt freie UI-/Config-Bezeichnungen in stabile Feature-Schlüssel um.
 *
 * Zusammenhang:
 * Diese Normalisierung schützt später Hamburger-Menü, Topbar und History-Aktionen davor, für
 * nicht vorhandene Anlagenfunktionen falsche Einträge anzuzeigen.
 */
export declare function normalizeFeatureKind(input: unknown): FrontendFeatureKind;
/**
 * Code-Teil: getFeatureLabel
 *
 * Zweck:
 * Liefert einheitliche Beschriftungen für vorbereitete Frontend-Sichtbarkeitsmodelle.
 */
export declare function getFeatureLabel(input: unknown): FrontendFeatureLabel;
//# sourceMappingURL=display.d.ts.map