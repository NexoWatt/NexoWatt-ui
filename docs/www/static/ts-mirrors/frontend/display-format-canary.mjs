/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/frontend/display-format-canary.ts
 * Quell-Hash: sha256:6691a6b7d869cc2f9ad58095841f3a96562ad27f2fa5341337ac4de0ec689ff7
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
export const defaultDisplayFormatterCanaryCases = Object.freeze([
    { key: 'power-zero', kind: 'power', value: 0 },
    { key: 'power-small', kind: 'power', value: 120 },
    { key: 'power-kw', kind: 'power', value: 1400 },
    { key: 'power-negative-storage', kind: 'power', value: -1400 },
    { key: 'energy-zero', kind: 'energy', value: 0 },
    { key: 'energy-mwh', kind: 'energy', value: 1234 },
    { key: 'percent-zero', kind: 'percent', value: 0 },
    { key: 'percent-normal', kind: 'percent', value: 39 },
]);
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
export function normalizeDisplayTextForCanary(text) {
    return String(text ?? '').trim().replace(/\s+/g, ' ');
}
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
export function runDisplayFormatterCanary(mirror, legacy, cases = defaultDisplayFormatterCanaryCases) {
    const results = [];
    for (const item of cases) {
        let legacyText = '';
        let mirrorText = '';
        if (item.kind === 'power') {
            legacyText = legacy.formatPower(item.value);
            mirrorText = mirror.formatPowerValue(item.value).text;
        }
        else if (item.kind === 'energy') {
            legacyText = legacy.formatEnergyKwh(item.value);
            mirrorText = mirror.formatEnergyValue(item.value).text;
        }
        else {
            legacyText = legacy.formatPercent ? legacy.formatPercent(item.value) : `${Math.round(Number(item.value) || 0)} %`;
            mirrorText = mirror.formatPercentValue(item.value).text;
        }
        const normalizedLegacy = normalizeDisplayTextForCanary(item.expectedLegacy ?? legacyText);
        const normalizedMirror = normalizeDisplayTextForCanary(mirrorText);
        results.push({
            key: item.key,
            kind: item.kind,
            ok: normalizedLegacy === normalizedMirror,
            legacyText,
            mirrorText,
        });
    }
    const mismatches = results.filter((row) => !row.ok);
    return {
        ok: mismatches.length === 0,
        checked: results.length,
        mismatches,
        results,
    };
}
