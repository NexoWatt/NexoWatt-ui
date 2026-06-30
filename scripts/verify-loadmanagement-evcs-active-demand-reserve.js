#!/usr/bin/env node
'use strict';

/**
 * 0.8.65 regression guard:
 * EVCS darf im zentralen EMS-Budget keinen künstlichen 0-W-Consumer mehr erzeugen.
 * Reserviert wird nur, wenn echte Istleistung oder zugewiesene Ladeleistung vorhanden ist.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, marker) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[loadmanagement-evcs-active-demand-reserve] ${rel}: fehlt ${marker}`);
    process.exit(1);
  }
}
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
