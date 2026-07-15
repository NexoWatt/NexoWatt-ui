#!/usr/bin/env node
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

function read(p) { return fs.readFileSync(p, 'utf8'); }
function must(file, needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`[pv-physical-cap] Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}
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
