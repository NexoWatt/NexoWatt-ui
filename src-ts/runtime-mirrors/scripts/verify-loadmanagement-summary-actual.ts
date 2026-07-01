// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-loadmanagement-summary-actual.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-loadmanagement-summary-actual.js
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
 * Original-Hash: 15a193c06eb2453fe548968d26fc8271e9171d9a076f7946f74e7bb966755fe5
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
function read(p){return fs.readFileSync(p,'utf8');}
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
function need(p,s,label){const t=read(p); if(!t.includes(s)){console.error(`[loadmanagement-summary-actual] missing ${label}: ${s}`); process.exit(1);}}
const cm = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
need('package.json','"version": "0.8.66"','version 0.8.66');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','applyActualW','TS-Control darf Summary-Ist nicht aus Reserve überschreiben');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','totalPowerW: totalFreshActualPowerW','TS-Control bekommt Actual statt Reserve');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','summary.totalReservedPowerW','Reservierung bleibt getrennt');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','activeDemandReserveW','Reservierung folgt aktivem Ladebedarf');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsActualW = (typeof totalFreshActualPowerW','Debug actual nutzt frischen Istwert');
const badApply = "await this._queueState('chargingManagement.summary.totalPowerW', Number.isFinite(Number(apply.totalPowerW)) ? Number(apply.totalPowerW) : 0, true);";
if (cm.includes(badApply)) { console.error('[loadmanagement-summary-actual] old apply.totalPowerW overwrite still present'); process.exit(1); }
console.log('[loadmanagement-summary-actual] OK');
