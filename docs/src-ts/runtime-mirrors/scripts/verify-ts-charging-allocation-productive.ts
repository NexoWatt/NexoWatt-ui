// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-allocation-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-charging-allocation-productive.js
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
 * Original-Hash: 84f644072216960abfe2915e9ebb9a1e84086eb58c293df28295a899399ae3ae
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
 * Datei: scripts/verify-ts-charging-allocation-productive.js
 * Zweck: Prüft die produktive EVCS-Wallbox-Allocation über TypeScript mit JS-Executor/Fallback.
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
function need(rel, marker, label) {
  const text = read(rel);
  if (!text.includes(marker)) {
    console.error(`[ts-charging-allocation-productive] ${rel}: fehlt ${label || marker}`);
    process.exit(1);
  }
}
need('src-ts/ems/charging-management/charging-allocation.ts', 'buildChargingAllocationProductive', 'Allocation-Produktiv-Helfer');
need('src-ts/ems/charging-management/charging-allocation.ts', 'javascriptAllocationIsFallbackOnly', 'JS-Allocation nur Fallback');
need('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'exports.buildChargingAllocationProductive', 'CJS-Export Allocation produktiv');
need('ems/modules/charging-management.js', 'tsAllocationProductiveJson', 'Allocation-Produktiv-State');
need('ems/modules/charging-management.js', 'ts-allocation', 'Allocation-Quelle produktiv');
need('ems/modules/charging-management.js', '_executeChargingLegacySetpointFallback', 'JS-Fallback-Executor');
need('main.js', 'tsAllocationProductiveJson', 'API liefert Allocation produktiv');
need('www/ems-apps.js', 'TS‑Produktiv: EVCS Allocation', 'App-Center zeigt produktive Allocation');
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
const input = {
  mode: 'auto', budgetMode: 'engine:pv', budgetW: 7400, usedW: 3200, remainingW: 4200,
  totalTargetPowerW: 3200, totalTargetCurrentA: 13.9,
  wallboxes: [
    { safe: 'wb_p', name: 'Power WB', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'power', setWKey: 'cm.wb.wb_p.setW' },
    { safe: 'wb_a', name: 'Current WB', enabled: true, online: true, vehiclePlugged: true, controlBasis: 'currentA', setAKey: 'cm.wb.wb_a.setA' },
  ],
  allocations: [
    { safe: 'wb_p', targetW: 3200, targetA: 0, reason: 'allocated', effectiveMode: 'auto' },
    { safe: 'wb_a', targetW: 0, targetA: 0, reason: 'no_pv_surplus', effectiveMode: 'pv' },
  ],
};
const decision = allocation.buildChargingAllocationProductive(input);
if (!decision || !decision.productive || decision.fallback || !decision.apply || decision.apply.wallboxes.length !== 2) {
  console.error('[ts-charging-allocation-productive] Produktive Allocation liefert keinen sauberen Apply-Vertrag.');
  process.exit(1);
}
if (decision.apply.wallboxes[0].targetPowerW !== 3200 || decision.apply.wallboxes[1].controlBasis !== 'current') {
  console.error('[ts-charging-allocation-productive] Zielwerte oder currentA-Normalisierung fehlerhaft.');
  process.exit(1);
}
if (!decision.safety || decision.safety.javascriptAllocationIsFallbackOnly !== true || decision.safety.setpointWritingUsesJavascriptExecutorOnly !== true || decision.safety.normalJavascriptDecisionTreeRemovedFromNormalPath !== true || decision.safety.directJavascriptSetpointLoopsRemoved !== true || decision.safety.executorFallbackOnlyForHardBlockers !== true) {
  console.error('[ts-charging-allocation-productive] Sicherheitsgrenzen für JS-Fallback/Executor/Normalpfad-Cleanup fehlen.');
  process.exit(1);
}
const stale = allocation.buildChargingAllocationProductive({ ...input, staleMeter: true });
if (!stale || stale.productive || !stale.fallback || stale.fallbackReason !== 'stale-meter' || stale.apply !== null) {
  console.error('[ts-charging-allocation-productive] staleMeter erzwingt keinen JS-Fallback.');
  process.exit(1);
}
const plan = allocation.buildChargingAllocationShadowPlan(input);
const mismatch = allocation.buildChargingAllocationProductive(input, plan, { source: 'ts-charging-allocation-shadow-comparison-v1', ok: false, mismatchCount: 1, mismatches: [{ field: 'targetPowerW', safe: 'wb_p', js: 3200, ts: 3100 }] });
if (!mismatch || mismatch.productive || !mismatch.fallback || mismatch.fallbackReason !== 'ts-js-allocation-mismatch') {
  console.error('[ts-charging-allocation-productive] Mismatch führt nicht zum JS-Fallback.');
  process.exit(1);
}
console.log('[ts-charging-allocation-productive] OK: EVCS-Allocation wird produktiv aus TS freigegeben, JS bleibt Executor/Fallback.');
