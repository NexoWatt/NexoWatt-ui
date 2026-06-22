/**
 * Datei: src-ts/frontend/history-controls.ts
 *
 * Zweck:
 * Beschreibt erste Typen und reine Helfer für die spätere Migration der History-Toolbar.
 *
 * Zusammenhang:
 * In der mobilen History gab es Layout- und Sichtbarkeitsfehler. Diese Datei hält fest, welche
 * Aktionen sichtbar sein dürfen, ohne die produktive `www/history.js`-Runtime zu verändern.
 */
/** Aktiver History-Zeitraum. */
export type HistoryMode = 'day' | 'week' | 'month' | 'year';
/** Eingaben für die spätere History-Toolbar-Sichtbarkeit. */
export interface HistoryToolbarInput {
    readonly mode: HistoryMode;
    readonly hasEvcs: boolean;
    readonly hasTariff: boolean;
    readonly canLoad: boolean;
}
/** Einzelne vorbereitete Toolbar-Aktion. */
export interface HistoryToolbarAction {
    readonly key: string;
    readonly label: string;
    readonly visible: boolean;
}
/** Ergebnis der vorbereiteten History-Toolbar-Logik. */
export interface HistoryToolbarState {
    readonly mode: HistoryMode;
    readonly actions: ReadonlyArray<HistoryToolbarAction>;
}
/**
 * Code-Teil: buildHistoryToolbarState
 *
 * Zweck:
 * Baut die spätere Sichtbarkeit von History-Aktionen typisiert auf.
 *
 * Zusammenhang:
 * Der wichtigste Fehlerfall ist EVCS: Ohne echte Wallbox darf im Kundenfrontend kein EVCS-PDF
 * angeboten werden. Diese Regel wird hier als vorbereiteter TS-Vertrag festgehalten.
 */
export declare function buildHistoryToolbarState(input: HistoryToolbarInput): HistoryToolbarState;
//# sourceMappingURL=history-controls.d.ts.map