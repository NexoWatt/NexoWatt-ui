// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-loadmanagement-evcs-active-demand-reserve.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-loadmanagement-evcs-active-demand-reserve.js
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
 * Original-Hash: 2289ad6e679cb9c4283d6ca536c512ba87a06d899352acfef2a775ab37d4c00f
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
 * 0.8.65 regression guard:
 * EVCS darf im zentralen EMS-Budget keinen künstlichen 0-W-Consumer mehr erzeugen.
 * Reserviert wird nur, wenn echte Istleistung oder zugewiesene Ladeleistung vorhanden ist.
 */
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
function must(rel, marker) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[loadmanagement-evcs-active-demand-reserve] ${rel}: fehlt ${marker}`);
    process.exit(1);
  }
}
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
function mustNot(rel, marker) {
  const text = read(rel);
  if (text.includes(marker)) {
    console.error(`[loadmanagement-evcs-active-demand-reserve] ${rel}: verboten ${marker}`);
    process.exit(1);
  }
}

must('package.json', '"version": "0.8.65"');
must('io-package.json', '"0.8.65"');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', '0.8.65: EVCS-Reservierung nur bei aktivem Ladebedarf');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'const evcsHasActiveChargingNeed');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'const evcsShouldReserve');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'if (evcsShouldReserve)');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'budgetDebug.evcsBudgetReservationSkippedReason');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "'no-active-demand'");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "'zero-watt-demand'");
must('src-ts/runtime-executables/ems/modules/charging-management.ts', "ems.budget.consumers.evcs.usedW', 0");
must('ems/modules/charging-management.js', '0.8.65: EVCS-Reservierung nur bei aktivem Ladebedarf');
must('src-ts/ems/charging-management/charging-management-runtime.ts', 'reservationActive: boolean');
must('lib/ts-mirrors/ems/charging-management/charging-management-runtime.js', 'reservationActive');
mustNot('src-ts/runtime-executables/ems/modules/charging-management.ts', "const evcsPvReserveW = Math.max(0, Math.min(evcsReserveW, (pvAvailableState ? Math.round(pvEvcsUsedWForBudget || 0) : 0)));\n                rt.reserve({");

const runtime = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-management-runtime.js'));
const idle = runtime.buildChargingReservationPlan({ mode: 'auto', totalTargetPowerW: 0, usedW: 0, actualW: 0, pvEvcsUsedWForBudget: 0 });
if (!idle || idle.reserveW !== 0 || idle.requestedW !== 0 || idle.pvReserveW !== 0 || idle.actualW !== 0 || idle.reservationActive !== false || idle.skippedReason !== 'no-active-demand') {
  console.error('[loadmanagement-evcs-active-demand-reserve] Idle-Plan erzeugt weiterhin eine aktive Reservierung.');
  process.exit(1);
}
const active = runtime.buildChargingReservationPlan({ mode: 'auto', totalTargetPowerW: 4200, usedW: 4200, actualW: 3900, pvEvcsUsedWForBudget: 1200 });
if (!active || active.reserveW !== 4200 || active.requestedW !== 4200 || active.actualW !== 3900 || active.pvReserveW !== 1200 || active.reservationActive !== true) {
  console.error('[loadmanagement-evcs-active-demand-reserve] Aktiver Ladebedarf wird nicht korrekt reserviert.');
  process.exit(1);
}
const actualOnly = runtime.buildChargingReservationPlan({ mode: 'auto', totalTargetPowerW: 0, usedW: 0, actualW: 900, pvEvcsUsedWForBudget: 0 });
if (!actualOnly || actualOnly.reserveW !== 0 || actualOnly.actualW !== 900 || actualOnly.reservationActive !== true) {
  console.error('[loadmanagement-evcs-active-demand-reserve] Reale Istleistung ohne Soll wird nicht als aktiver EVCS-Bedarf markiert.');
  process.exit(1);
}
console.log('[loadmanagement-evcs-active-demand-reserve] OK: EVCS reserviert im EMS-Budget nur noch bei aktivem Ladebedarf.');
