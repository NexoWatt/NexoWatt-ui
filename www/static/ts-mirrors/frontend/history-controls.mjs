/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/frontend/history-controls.ts
 * Quell-Hash: sha256:b4bbd9ee46a9c42ad39eb718c4384ae48fd6b14fd03017cd738932341ee3387f
 * Erzeugung: npm run sync:ts-frontend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein browsernaher JavaScript-Modulspiegel der TypeScript-Quelle.
 * Diese Datei kann produktiv importiert werden, wenn der zugehörige Browsercode
 * bereits auf den jeweiligen TS-Helfer umgestellt wurde.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/frontend/*.ts vornehmen.
 * 2. npm run sync:ts-frontend-mirrors ausführen.
 * 3. npm run test:ts-frontend-mirrors prüfen.
 */
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
export function buildHistoryToolbarState(input) {
    return {
        mode: input.mode,
        actions: [
            { key: 'stack', label: 'Stapel', visible: true },
            { key: 'load', label: 'Laden', visible: input.canLoad },
            { key: 'evcsPdf', label: 'EVCS PDF', visible: input.hasEvcs },
            { key: 'tariffReport', label: 'Tarifnachweis', visible: input.hasTariff },
            { key: 'yearReport', label: 'Jahresreport', visible: true },
        ],
    };
}
