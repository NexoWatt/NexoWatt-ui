#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decideStorageZeroWrite } = require('../ems/services/storage-zero-write-policy');

function action(input, expected, label) {
  const result = decideStorageZeroWrite(input);
  assert.strictEqual(result.action, expected, `${label}: ${JSON.stringify(result)}`);
  return result;
}

action({ targetW: -2400, lastTargetW: -1800 }, 'write-target', 'Nicht-null Sollwert wird geschrieben');
const targetBand = action({ targetW: 0, lastTargetW: -2400, nvpW: 60, nvpTargetW: 50, nvpDeadbandW: 100 }, 'hold-write', 'NVP-Zielband hält Ladung');
assert.strictEqual(targetBand.outputW, -2400);
action({ targetW: 0, lastTargetW: 1800, measurementGap: true, measurementGapAgeMs: 5000, measurementGraceMs: 30000 }, 'hold-write', 'kurze Messlücke hält Entladung');
action({ targetW: 0, lastTargetW: -1800, budgetZero: true, budgetZeroAgeMs: 4000, budgetGraceMs: 20000 }, 'hold-write', 'transientes Nullbudget hält Ladung');
action({ targetW: 0, lastTargetW: -1800, feedForwardTargetW: -1500 }, 'hold-write', 'Feed-forward bestätigt Ladung');
action({ targetW: 0, lastTargetW: -1800, nvpW: 40, nvpTargetW: 50, nvpDeadbandW: 100, holdByNoWrite: true }, 'hold-no-write', 'Sungrow hält per No-Write');
action({ targetW: 0, lastTargetW: -1800, explicitStop: true, reason: 'SoC >= Ladegrenze' }, 'write-stop', 'expliziter Stop schreibt 0 W');
action({ targetW: 0, lastTargetW: -1800, budgetZero: true, budgetZeroConfirmed: true, budgetZeroAgeMs: 25000 }, 'write-stop', 'bestätigt verbrauchtes PV-Budget stoppt Laden');
action({ targetW: 0, lastTargetW: 0 }, 'idle-no-write', 'Leerlauf erzeugt keinen zyklischen 0-W-Write');

const control = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
for (const needle of [
  'decideStorageZeroWrite',
  "zeroDecision.action === 'hold-write'",
  "zeroDecision.action === 'hold-no-write'",
  "zeroDecision.action === 'write-stop'",
  'zeroWriteFirewallMeasurementGapAgeMs',
]) assert(control.includes(needle), `Integrationsanker fehlt: ${needle}`);

console.log('[storage-zero-write-firewall-v2] OK: 0 W bleibt ein expliziter Stop; Zielband, Mess-/Budgetlücken und Feed-forward halten den aktiven Sollwert.');
