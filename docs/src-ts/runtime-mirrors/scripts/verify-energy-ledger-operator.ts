// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-ledger-operator.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-energy-ledger-operator.js
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
 * Original-Hash: 1476ab19d6317b3bdf611801cae4a875881847beb4e9abdb6822fb923ebc9aad
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
function read(path) { return fs.readFileSync(path, 'utf8'); }
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
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${label}: missing ${needle} in ${path}`);
    process.exit(1);
  }
  console.log(`[OK] ${label}`);
}
/**
 * Code-Teil: file
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function file(path) {
  if (!fs.existsSync(path)) {
    console.error(`[FAIL] missing ${path}`);
    process.exit(1);
  }
  console.log(`[OK] ${path}`);
}
file('src-ts/runtime-executables/ems/modules/energy-ledger.ts');
file('src-ts/runtime-executables/www/energy-ledger.ts');
file('www/energy-ledger.html');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'buildKwhSourceMix', 'Quelle je kWh helper');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'energyLedger.operator.viewJson', 'Betreiberansicht state');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'energyLedger.walletBridge.summaryJson', 'Energy Wallet Bridge state');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'csvFoundationForPeriod', 'Monats-/Jahres-Exportbasis helper');
must('src-ts/runtime-executables/main.ts', '/api/ledger/local-kwh.csv', 'CSV API route');
must('src-ts/runtime-executables/main.ts', '/ledger/local-kwh', 'Betreiberansicht route');
must('src-ts/runtime-executables/main.ts', 'keine doppelte Zählung', 'No-duplicate comment');
must('src-ts/runtime-executables/www/energy-ledger.ts', '/api/ledger/local-kwh?period=', 'Operator view API usage');
console.log('Energy Ledger operator/export checks passed.');
