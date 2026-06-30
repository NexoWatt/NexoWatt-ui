// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-core-limits-pv-physical-cap.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-core-limits-pv-physical-cap.js
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
 * Original-Hash: c893876abbc79e09be9d78ece6f9ff87c436059f645dc13e32e1448967addab9
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[pv-physical-cap] Missing in ${file}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[pv-physical-cap] Forbidden in ${file}: ${needle}`); process.exit(1); } }
const ts='src-ts/runtime-executables/ems/modules/core-limits.ts';
must('package.json','"version": "0.8.65"');
must(ts,'const pvBudgetFlowRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);');
must(ts,'const pvPhysicalCapW = Math.max(0, pvPowerW);');
must(ts,'const pvBudgetRawW = Math.min(pvBudgetFlowRawW, pvPhysicalCapW);');
must(ts,'ems.budget.pvBudgetPhysicalCapW');
must(ts,"source: 'min(physicalPV,nvp+controlledLoads+storageCharge-storageDischarge)'");
mustNot(ts,'const pvBudgetRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);');
/**
 * Code-Teil: calc
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const calc=(pvPowerW, gridExportW, flexUsedW, storageChargeW, storageDischargeW)=>{
  const flow=Math.max(0,gridExportW+flexUsedW+storageChargeW-storageDischargeW);
  const cap=Math.max(0,pvPowerW);
  return {flow, cap, raw:Math.min(flow,cap), clamped:Math.max(0,flow-Math.min(flow,cap))};
};
const night=calc(0,70,10970,0,2460);
if(night.raw!==0 || night.flow!==8580 || night.clamped!==8580){ console.error('[pv-physical-cap] night example failed', night); process.exit(1); }
const day=calc(20000,5000,10000,0,0);
if(day.raw!==15000 || day.clamped!==0){ console.error('[pv-physical-cap] day example failed', day); process.exit(1); }
console.log('[pv-physical-cap] OK: PV budget is capped by physical PV production.');
