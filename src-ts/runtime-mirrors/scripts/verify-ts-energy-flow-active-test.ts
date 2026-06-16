// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-active-test.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-energy-flow-active-test.js
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
 * Original-Hash: 220b3122d0c99b098a239cd0a8ae462a1b3b58e929dc80fd7ef7e0ab868fa234
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

/**
 * Code-Teil: verify-ts-energy-flow-active-test.js
 *
 * Zweck:
 * Prüft die 0.7.86-Erweiterung für den kontrollierten Energiefluss-TS-Aktivtest.
 * Der Test stellt sicher, dass Backend und App-Center die Aktivtest-Diagnose führen,
 * ohne die Sicherheitsgates zu umgehen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const errors = [];
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) errors.push(`${file}: fehlt ${label}`);
}

must('main.js', '_nwRecordEnergyFlowTsActiveTestSample', 'Backend-Aufzeichnung des Aktivtests');
must('main.js', '_nwSummarizeEnergyFlowTsActiveTestSamples', 'Backend-Zusammenfassung des Aktivtests');
must('main.js', 'control.energyFlowTsActiveTest', 'Diagnose-API-Feld energyFlowTsActiveTest');
must('main.js', 'tsActiveTest: effectiveEnergyFlow.activeTest', 'Energiefluss-Debugfeld tsActiveTest');
must('www/ems-apps.js', '_renderEnergyFlowTsActiveTestCard', 'App-Center Aktivtest-Karte');
must('www/ems-apps.js', 'Energiefluss TS‑Aktivtest', 'sichtbarer App-Center Titel');

if (errors.length) {
  console.error('[energy-flow-active-test] Fehler:\n' + errors.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('[energy-flow-active-test] OK: kontrollierter Energiefluss-TS-Aktivtest ist verdrahtet.');
