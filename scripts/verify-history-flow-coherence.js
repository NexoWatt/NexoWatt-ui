#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.136 / Baustein 9:
 * LIVE/History dürfen gegengerichtete Split-DPs nicht gleichzeitig als Bezug
 * und Einspeisung bzw. Laden und Entladen darstellen. Sichtbar ist der physische
 * Nettofluss; rohe Konfliktwerte bleiben nur Diagnose.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { normalizeOpposingPowerFlows } = require('../ems/services/power-flow-coherence');
const { resolveNvpDisplay, resolveNvpMeasurement } = require('../ems/services/measurement-freshness');

function freshChannel(value, ts = 100000) {
  return {
    mapped: true,
    value,
    ts,
    freshness: { fresh: true, measurementFresh: true, heartbeatFresh: false, connected: true, reason: 'measurement-fresh', measurementAgeMs: 0, heartbeatAgeMs: null },
  };
}

(() => {
  let flow = normalizeOpposingPowerFlows(3000, 1000, 0);
  assert.deepStrictEqual(
    { positiveW: flow.positiveW, negativeW: flow.negativeW, signedW: flow.signedW, conflict: flow.conflict },
    { positiveW: 2000, negativeW: 0, signedW: 2000, conflict: true },
  );

  flow = normalizeOpposingPowerFlows(2000, 3000, 0);
  assert.deepStrictEqual(
    { positiveW: flow.positiveW, negativeW: flow.negativeW, signedW: flow.signedW, conflict: flow.conflict },
    { positiveW: 0, negativeW: 1000, signedW: -1000, conflict: true },
  );

  flow = normalizeOpposingPowerFlows(35, 20, 25);
  assert.strictEqual(flow.signedW, 0, 'Nettofluss innerhalb Deadband muss 0 W werden');
  assert.strictEqual(flow.positiveW, 0);
  assert.strictEqual(flow.negativeW, 0);

  const display = resolveNvpDisplay({
    canonicalKnown: false,
    gridNetRaw: null,
    gridBuyRaw: 3000,
    gridSellRaw: 1000,
    gridBuyTs: 100000,
    gridSellTs: 100000,
    maxSkewMs: 5000,
    gridBuyMapped: true,
    gridSellMapped: true,
    gridNetMapped: false,
  });
  assert.strictEqual(display.gridBuyW, 2000);
  assert.strictEqual(display.gridSellW, 0);
  assert.strictEqual(display.gridNetRaw, 2000);
  assert.ok(String(display.src).includes('netted'));

  const measurement = resolveNvpMeasurement({
    signed: null,
    import: freshChannel(3000),
    export: freshChannel(1000),
    maxSkewMs: 5000,
  });
  assert.strictEqual(measurement.usable, true);
  assert.strictEqual(measurement.netW, 2000);
  assert.strictEqual(measurement.importW, 2000);
  assert.strictEqual(measurement.exportW, 0);
  assert.strictEqual(measurement.source, 'split-coherent-netted');

  const root = path.resolve(__dirname, '..');
  const mainTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  assert.ok(mainTs.includes("const { normalizeOpposingPowerFlows } = require('./ems/services/power-flow-coherence');"));
  assert.ok(mainTs.includes('const coherent = normalizeOpposingPowerFlows(d, c, deadbandW);'), 'Speicher-Splitwerte müssen vor LIVE/History genettet werden');
  assert.ok(mainTs.includes('grossChargeW: Math.round(coherent.rawNegativeW)'), 'Rohkonflikte sollen nur Diagnose bleiben');
  assert.ok(mainTs.includes("this._nwSetHistorieValue('historie.core.grid.buyW', gridBuy"), 'Historie muss die normalisierten Grid-Werte verwenden');
  assert.ok(mainTs.includes("this._nwSetHistorieValue('historie.core.storage.chargeW', chg"), 'Historie muss die normalisierten Speicherwerte verwenden');

  console.log('[history-flow-coherence] OK: gegengerichtete Split-DPs werden als exklusiver Nettofluss in LIVE und History dargestellt.');
})();
