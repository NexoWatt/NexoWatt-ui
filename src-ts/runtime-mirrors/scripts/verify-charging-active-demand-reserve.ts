// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-charging-active-demand-reserve.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-charging-active-demand-reserve.js
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
 * Original-Hash: f43e7bb853196cfea0f1f786011a55e8b3ada4d58d4b5e57cca5d880d1b876e6
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
function read(p){ return fs.readFileSync(p, 'utf8'); }
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
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[charging-active-demand-reserve] missing ${label}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[charging-active-demand-reserve] forbidden ${label}: ${needle}`); process.exit(1); } }
const cm = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
must('package.json', '"version": "0.8.66"', 'version 0.8.66');
must(cm, 'let evcsActiveDemandReserveW = 0;', 'active-demand reserve accumulator');
must(cm, 'const activeChargingDemand = !!(', 'active-demand predicate');
must(cm, "w.vehiclePlugged !== false", 'only connected/unknown-plug demand reserves');
must(cm, 'demandActualW >= activityThresholdW', 'actual power counts as demand');
must(cm, 'demandCommandW >= activityThresholdW', 'commanded setpoint counts as demand');
must(cm, 'demandTargetW >= activityThresholdW', 'target setpoint counts as demand');
must(cm, 'const evcsControlReserveW = Math.max(0, Math.round(evcsActiveDemandReserveW));', 'control reserve comes from active demand');
must(cm, "chargingManagement.control.activeDemandReserveW", 'diagnostic active demand reserve state');
must(cm, "chargingManagement.control.activeDemandWallboxes", 'diagnostic active wallbox count state');
must(cm, 'const evcsReserveW = evcsControlReserveW;', 'central EMS reserve uses active demand');
must(cm, 'requestedW: evcsReserveW', 'central request uses active demand');
must(cm, 'reserveW: evcsReserveW', 'central reserve uses active demand');
must(cm, 'pvAvailableState ? evcsControlPvReserveW : 0', 'PV reserve capped to active demand PV share');
must(cm, "chargingManagement.summary.totalReservedPowerW', evcsControlReserveW", 'summary reserve is active demand reserve');
mustNot(cm, 'const evcsReserveW = Math.max(0, Math.round(Number.isFinite(budgetW) ? usedW : totalTargetPowerW));', 'old ghost reserve formula removed');
console.log('[charging-active-demand-reserve] OK');
