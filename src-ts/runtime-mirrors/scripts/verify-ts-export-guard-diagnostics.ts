// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-export-guard-diagnostics.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-export-guard-diagnostics.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: fa6dd23763299a472659ae81e8bae95ca04f5de4b8db448339a95863697cdb89
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(rel, text) {
  if (!read(rel).includes(text)) {
    console.error(`[export-guard-diagnostics] ${rel} enthält nicht: ${text}`);
    process.exit(1);
  }
}
for (const rel of ['src-ts/runtime-executables/ems/modules/grid-constraints.ts', 'ems/modules/grid-constraints.js']) {
  need(rel, 'gridConstraints.exportLimit.currentExportW');
  need(rel, 'gridConstraints.exportLimit.effectiveMaxFeedInW');
  need(rel, 'gridConstraints.exportLimit.exportOverLimitW');
  need(rel, 'gridConstraints.exportLimit.estimatedCurtailmentW');
  need(rel, 'gridConstraints.exportLimit.missingWriteDatapointsJson');
  need(rel, 'gridConstraints.exportLimit.negativePriceStrategy');
  need(rel, '_publishExportLimitStates');
  need(rel, '_writeDiagnosticsForGroup');
}
for (const rel of ['src-ts/runtime-executables/ems/modules/energy-wallet.ts', 'ems/modules/energy-wallet.js']) {
  need(rel, 'curtailedPvKwh');
  need(rel, 'curtailedPvValueEur');
  need(rel, 'unusedPvValueEur');
  need(rel, 'gridConstraints.exportLimit.estimatedCurtailmentW');
}
for (const rel of ['src-ts/runtime-executables/www/app.ts', 'www/app.js']) {
  need(rel, 'energyWalletExportGuardGrid');
}
console.log('[export-guard-diagnostics] OK');
