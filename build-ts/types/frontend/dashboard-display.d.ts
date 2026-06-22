import type { FeatureVisibilityState } from '../contracts/features';
/**
 * Datei: src-ts/frontend/dashboard-display.ts
 *
 * Zweck:
 * Enthält erste Typen und reine Helfer für spätere Dashboard-Anzeige-Modelle.
 *
 * Zusammenhang:
 * Die produktive Datei `www/app.js` setzt Werte heute direkt in das DOM. Diese TypeScript-Datei
 * bereitet vor, dass wir später Wertelisten wie „Aktuelle Werte“ zuerst typisiert berechnen und
 * danach in HTML schreiben.
 *
 * Wichtig:
 * In 0.7.65 wird diese Datei noch nicht produktiv genutzt. Sie ist ein sicherer Migrationsschritt
 * ohne Runtime-Änderung.
 */
/** Eingabe für vorbereitete Dashboard-Wertemodelle. */
export interface DashboardValueInput {
    readonly visibility: FeatureVisibilityState;
    readonly pvW: number;
    readonly buildingLoadW: number;
    readonly gridImportW: number;
    readonly gridExportW: number;
    readonly batterySignedW: number;
    readonly batterySocPct: number | null;
    readonly evcsW: number;
}
/** Einzelne Anzeigezeile für die spätere rechte Karte „Aktuelle Werte“. */
export interface DashboardValueRow {
    readonly key: string;
    readonly label: string;
    readonly valueText: string;
    readonly visible: boolean;
}
/**
 * Code-Teil: buildDashboardValueRows
 *
 * Zweck:
 * Baut typisierte Dashboard-Wertezeilen aus bereits aufgelösten Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion bereitet die spätere Migration der rechten LIVE-Karte „Aktuelle Werte“ vor. Die
 * Feature-Sichtbarkeit entscheidet hier bereits, ob EVCS-Zeilen überhaupt erscheinen dürfen.
 *
 * Wichtig:
 * Diese Funktion löst keine Energieflüsse auf. Sie formatiert nur Werte, die vorher durch Resolver
 * oder Backend-States fachlich korrekt berechnet wurden.
 */
export declare function buildDashboardValueRows(input: DashboardValueInput): DashboardValueRow[];
//# sourceMappingURL=dashboard-display.d.ts.map