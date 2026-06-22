import type { Percent, Watt } from '../contracts/units';
/**
 * Datei: src-ts/frontend/display-format.ts
 *
 * Zweck:
 * Enthält erste typisierte Frontend-Helfer für die Anzeige von Leistungs-, Energie-
 * und Prozentwerten. Diese Funktionen sind noch nicht produktiv mit `www/app.js`
 * verdrahtet, sondern bereiten die spätere schrittweise Migration vor.
 *
 * Zusammenhang:
 * Das LIVE-Dashboard, die History und viele KPI-Kacheln formatieren aktuell Werte an
 * mehreren Stellen unterschiedlich. Beim späteren TypeScript-Umbau sollen diese
 * Anzeige-Regeln zentral und testbar werden.
 *
 * Wichtig für spätere Änderungen:
 * Diese Datei darf keine DOM-Zugriffe enthalten. Sie bleibt reine Formatlogik, damit
 * sie einfach getestet und später gefahrlos von Frontend-Dateien importiert werden kann.
 */
/** Anzeigeeinheit, die das Frontend für Leistungswerte nutzen soll. */
export type PowerDisplayUnit = 'W' | 'kW' | 'MW';
/** Tonalität für Zahlenwerte in Wertelisten, z. B. Netzbezug rot und Einspeisung grün. */
export type DisplayTone = 'neutral' | 'good' | 'warning' | 'bad' | 'info';
/** Ergebnis einer Frontend-Formatierung. */
export interface DisplayValue {
    /** Fertiger Text für das UI. Beispiel: "1.4 kW". */
    readonly text: string;
    /** Numerischer Rohwert, sofern vorhanden. */
    readonly value: number | null;
    /** Fachliche Einheit nach der Formatierung. */
    readonly unit: string;
    /** UI-Tonalität für spätere CSS-Klassen. */
    readonly tone: DisplayTone;
}
/** Eingaben für eine Leistungsanzeige. */
export interface FormatPowerOptions {
    /** Wenn true, bleibt das Vorzeichen sichtbar. */
    readonly signed?: boolean;
    /** Anzahl Nachkommastellen für kW/MW-Anzeige. */
    readonly decimals?: number;
    /** Tonalität, die an das UI weitergegeben wird. */
    readonly tone?: DisplayTone;
}
/**
 * Code-Teil: toFiniteNumber
 *
 * Zweck:
 * Normalisiert unbekannte Eingaben aus States/API-Antworten auf `number | null`.
 *
 * Zusammenhang:
 * Frontend-Werte kommen oft als Zahl, String oder leerer Wert aus `/api/state`.
 * Diese Funktion ist der erste kleine Baustein, damit spätere UI-Formatter nicht
 * überall selbst `Number(...)` und `isFinite(...)` schreiben müssen.
 */
export declare function toFiniteNumber(value: unknown): number | null;
/**
 * Code-Teil: choosePowerDisplayUnit
 *
 * Zweck:
 * Entscheidet anhand eines Wattwertes, ob die Anzeige in W, kW oder MW erfolgen soll.
 *
 * Zusammenhang:
 * Diese Regel wird später in LIVE, History und App-Center gleich genutzt. Dadurch
 * vermeiden wir Abweichungen wie einmal "1400 W" und einmal "1.4 kW" für dieselbe Größe.
 */
export declare function choosePowerDisplayUnit(watt: Watt): PowerDisplayUnit;
/**
 * Code-Teil: formatPowerValue
 *
 * Zweck:
 * Formatiert eine Leistung in Watt für das Frontend.
 *
 * Wichtig:
 * `0 W` ist ein gültiger Wert und darf nicht als fehlend angezeigt werden. Genau diese
 * Regel war bei Speicher-/EVCS-Werten mehrfach kritisch.
 */
export declare function formatPowerValue(value: unknown, options?: FormatPowerOptions): DisplayValue;
/**
 * Code-Teil: formatEnergyValue
 *
 * Zweck:
 * Formatiert Energie in kWh/MWh für History und KPI-Kacheln.
 *
 * Zusammenhang:
 * Die History und die KPI-Kacheln zeigen Tages-, Jahres- und Gesamtwerte. Diese Funktion
 * hält fest, wann wir kWh oder MWh anzeigen, ohne die Rohwerte zu verändern.
 */
export declare function formatEnergyValue(value: unknown, tone?: DisplayTone): DisplayValue;
/**
 * Code-Teil: formatPercentValue
 *
 * Zweck:
 * Formatiert Prozentwerte für SoC, Autarkie, Eigenverbrauch und Prognosequalität.
 *
 * Wichtig:
 * Der Formatter begrenzt Werte standardmäßig auf 0–100 %, weil viele UI-Elemente damit
 * Fortschrittsbalken steuern. Rohdaten bleiben davon unberührt.
 */
export declare function formatPercentValue(value: unknown, tone?: DisplayTone, clamp?: boolean): DisplayValue;
/**
 * Code-Teil: toneForGridImportExport
 *
 * Zweck:
 * Liefert eine UI-Tonalität für Netzwerte.
 *
 * Zusammenhang:
 * Netzbezug ist in der VIS meistens kritisch/rot, Einspeisung meistens positiv/grün.
 * Diese Zuordnung ist reine Darstellung und ändert keine Energieflusswerte.
 */
export declare function toneForGridImportExport(kind: 'import' | 'export', watt: unknown): DisplayTone;
/** Optionen für den kompatiblen String-Formatter `formatPowerW`. */
export interface LegacyPowerTextOptions {
    /** Wenn true, zeigt der Text bei positiven Werten ein Pluszeichen an. */
    readonly showPositiveSign?: boolean;
    /** Anzahl Nachkommastellen für kW/MW. */
    readonly digits?: number;
}
/**
 * Code-Teil: formatPowerW
 *
 * Zweck:
 * Kompatibler Text-Formatter für ältere TypeScript-Vorbereitungsdateien.
 *
 * Zusammenhang:
 * Frühere TS-Scaffold-Dateien importieren bereits `formatPowerW`. Damit der neue
 * 0.7.65-Formatter keinen alten TS-Vorbereitungsstand bricht, bleibt dieser Alias
 * erhalten und delegiert auf `formatPowerValue`.
 */
export declare function formatPowerW(value: unknown, options?: LegacyPowerTextOptions): string;
/**
 * Code-Teil: clampPercent
 *
 * Zweck:
 * Begrenzung eines Prozentwerts auf 0–100 für Fortschrittsbalken.
 *
 * Wichtig:
 * `null` bedeutet bewusst „kein Prozentwert vorhanden“. `0` bleibt gültig.
 */
export declare function clampPercent(value: unknown): Percent | null;
/**
 * Code-Teil: formatPercent
 *
 * Zweck:
 * Kompatibler String-Formatter für ältere TS-Anzeigevorbereitungen.
 */
export declare function formatPercent(value: unknown): string;
/**
 * Code-Teil: formatEnergyKwh
 *
 * Zweck:
 * Kompatibler String-Formatter für kWh-Werte in History-/KPI-Vorbereitungen.
 */
export declare function formatEnergyKwh(value: unknown): string;
//# sourceMappingURL=display-format.d.ts.map