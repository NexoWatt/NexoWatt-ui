#!/usr/bin/env node
'use strict';

/**
 * RC65 regression contract:
 * - NT may authorize grid charging by itself only when the dynamic tariff is disabled.
 * - With an active dynamic tariff, NT requires fresh cheap/neutral data.
 * - Expensive or stale dynamic tariff data blocks storage and normal EVCS grid charging.
 * - An Auto time-target may override the economic EVCS lock only at the calculated
 *   latest start, while all hard grid/station/§14a/safety limits remain in force.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveStorageGridChargePermission } = require('../ems/modules/tarif-vis');

const root = path.resolve(__dirname, '..');
const master = {
  appCenterAllowed: true,
  priorityAllowsStorage: true,
  storageWriterAvailable: true,
  storagePowerW: 4000,
  manualNetFeeEnabled: true,
  manualNtWindowActive: true,
};

const decide = (input = {}) => resolveStorageGridChargePermission({ ...master, ...input });

assert.strictEqual(decide({ tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' }).allowed, true,
  'NT must work by itself when the dynamic tariff is disabled.');
assert.strictEqual(decide({ tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' }).allowed, true,
  'Fresh cheap tariff may charge inside NT.');
assert.strictEqual(decide({ tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' }).allowed, true,
  'Fresh neutral tariff may charge inside NT.');
assert.strictEqual(decide({ tariffActive: true, currentPriceFresh: true, tariffState: 'teuer' }).allowed, false,
  'Expensive tariff must block inside NT.');
assert.strictEqual(decide({ tariffActive: true, currentPriceFresh: false, tariffState: 'neutral' }).allowed, false,
  'Stale price must block inside NT.');
assert.strictEqual(decide({ tariffActive: true, currentPriceFresh: true, tariffState: 'unknown' }).allowed, false,
  'Unknown active tariff state must fail closed inside NT.');
assert.strictEqual(decide({ tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig', manualNtWindowActive: false }).allowed, false,
  'Variable net fee mode must fail closed outside the configured NT window.');

const storageSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/tarif-vis.ts'), 'utf8');
const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
assert.match(storageSource, /NT-Fenster aktiv, aber der dynamische Tarif ist teuer/);
assert.match(storageSource, /NT-Fenster aktiv, aber der dynamische Tarifpreis fehlt oder ist veraltet/);
assert.match(chargingSource, /tariffDynamicStale/);
assert.match(chargingSource, /decideGoalTariffOverride/);
assert.match(chargingSource, /latest_start/);
assert.doesNotMatch(chargingSource, /if \(nfMode === 'NT'\) gridChargeAllowedRaw = true;/,
  'Charging management must not unconditionally reopen NT during expensive/stale tariff data.');

// The RC60 full-tick suite now contains the RC65 expensive/stale NT cases and
// verifies that only an urgent time-target reopens charging within hard limits.
const fullTick = spawnSync(process.execPath, [path.join(root, 'scripts/verify-rc60-universal-auto-orchestrator.js')], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'pipe',
});
if (fullTick.status !== 0) {
  process.stderr.write(fullTick.stdout || '');
  process.stderr.write(fullTick.stderr || '');
  process.exit(fullTick.status || 1);
}

console.log('[rc65-nt-price-target-override] OK: NT blocks expensive/stale active tariffs; dynamic-off NT remains valid; urgent Auto time-target override remains active.');
