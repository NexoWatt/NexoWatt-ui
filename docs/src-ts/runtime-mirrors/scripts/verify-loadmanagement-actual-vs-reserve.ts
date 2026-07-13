// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-loadmanagement-actual-vs-reserve.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-loadmanagement-actual-vs-reserve.js
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
 * Original-Hash: b227d67a5d99c168c26c528532c87cafc5aabc2d0c9b28ca7813637755be4468
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
function read(p){ return fs.readFileSync(p,'utf8'); }
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[loadmanagement-actual-vs-reserve] Missing in ${file}: ${needle}`); process.exit(1); } }
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[loadmanagement-actual-vs-reserve] Forbidden in ${file}: ${needle}`); process.exit(1); } }
must('package.json', '"version": "0.8.66"');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'totalFreshActualPowerW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridEvcsActualForCapW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridEvcsReserveIgnoredForCapW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadRawW = gridW - gridEvcsActualForCapW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "chargingManagement.summary.totalReservedPowerW");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "actualW: evcsActualW");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "pvAvailableState ? evcsControlPvReserveW : 0");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "reserveW: evcsReserveW");
must('src-ts/runtime-executables/main.ts', 'actualW: await getOwn');
must('src-ts/runtime-executables/main.ts', 'gridEvcsReserveIgnoredForCapW');
must('src-ts/runtime-executables/www/ems-apps.ts', 'EVCS Ist für Netz-Gate');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Reservierung ignoriert');
must('src-ts/runtime-executables/www/ems-apps.ts', 'EVCS Reserviert');
// Prevent the previous regression: Gate A must not subtract command/reserve totalPowerW from grid power.
mustNot('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadRawW = gridW - (Number.isFinite(totalPowerW)');
console.log('[loadmanagement-actual-vs-reserve] OK');
