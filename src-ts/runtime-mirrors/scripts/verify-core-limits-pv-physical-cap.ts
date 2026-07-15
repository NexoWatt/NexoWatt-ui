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
 * Original-Hash: 375585eef0a9a3c0400062a46811deadb48c3b6536e3b5c1fdf3b05876ecebf4
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
 * Regression: Das zentrale PV-Budget muss zugleich
 * 1) den signierten NVP beruecksichtigen und
 * 2) durch die tatsaechliche PV-Erzeugung begrenzt bleiben.
 *
 * Netzbezug darf das Budget nicht aufblasen. Flexible Verbraucher und eine
 * bereits laufende Speicherladung werden nur zur Rekonstruktion des hinter
 * der NVP-Messung verborgenen PV-Anteils addiert.
 */
const assert = require('assert');
const fs = require('fs');
const { computePvBudgetFlowRawW } = require('../ems/modules/core-limits');

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
function read(p) { return fs.readFileSync(p, 'utf8'); }
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
function must(file, needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`[pv-physical-cap] Missing in ${file}: ${needle}`);
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
function mustNot(file, needle) {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`[pv-physical-cap] Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
}

const ts = 'src-ts/runtime-executables/ems/modules/core-limits.ts';
const pkg = JSON.parse(read('package.json'));
assert(/^\d+\.\d+\.\d+$/.test(String(pkg.version || '')), 'package.json braucht eine gueltige SemVer-Version');
must(ts, 'function computePvBudgetFlowRawW');
must(ts, 'const pvBudgetFlowRawW = computePvBudgetFlowRawW({');
must(ts, 'const pvPhysicalCapW = Math.max(0, pvPowerW);');
must(ts, 'const pvBudgetRawW = Math.min(pvBudgetFlowRawW, pvPhysicalCapW);');
must(ts, 'ems.budget.pvBudgetPhysicalCapW');
must(ts, "source: 'min(physicalPV,-signedNvp+controlledLoads+storageCharge-storageDischarge)'");
mustNot(ts, 'const pvBudgetFlowRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);');

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
const calc = (pvPowerW, gridW, flexUsedW, storageChargeW, storageDischargeW) => {
  const flow = computePvBudgetFlowRawW({ gridW, flexUsedW, storageChargeW, storageDischargeW });
  const cap = Math.max(0, pvPowerW);
  const raw = Math.min(flow, cap);
  return { flow, cap, raw, clamped: Math.max(0, flow - raw) };
};

const night = calc(0, -70, 10970, 0, 2460);
assert.deepStrictEqual(night, { flow: 8580, cap: 0, raw: 0, clamped: 8580 }, 'Ohne PV darf keine flexible Last ein PV-Budget erzeugen');

const day = calc(20000, -5000, 10000, 0, 0);
assert.deepStrictEqual(day, { flow: 15000, cap: 20000, raw: 15000, clamped: 0 }, 'PV-Export plus flexible Last muss den verbrauchten PV-Anteil rekonstruieren');

const importedWhileCharging = calc(17000, 5900, 8100, 8400, 0);
assert.strictEqual(importedWhileCharging.flow, 10600, 'Netzbezug muss vom rekonstruierten PV-Budget abgezogen werden');
assert.strictEqual(importedWhileCharging.raw, 10600, 'Physikalische PV-Grenze darf den korrekten rekonstruierten Wert nicht veraendern');

const physicallyClamped = calc(5000, -2500, 8100, 8400, 0);
assert.strictEqual(physicallyClamped.flow, 19000, 'Rohdiagnose darf den bilanzierten Gesamtfluss zeigen');
assert.strictEqual(physicallyClamped.raw, 5000, 'Wirksames PV-Budget darf die aktuelle PV-Erzeugung nie uebersteigen');
assert.strictEqual(physicallyClamped.clamped, 14000, 'Abgeschnittener unphysikalischer Anteil muss diagnostizierbar bleiben');

console.log('[pv-physical-cap] OK: signierter NVP und physikalische PV-Erzeugung begrenzen das zentrale PV-Budget korrekt.');
