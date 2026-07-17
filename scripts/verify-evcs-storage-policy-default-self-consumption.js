#!/usr/bin/env node
'use strict';

/**
 * Runtime-Regression 0.8.107: EVCS-Speicherpolicy und Eigenverbrauch.
 *
 * Fachliche Regeln:
 * - Ist die Kundenwahl im AppCenter nicht freigegeben, bleibt die normale
 *   Speicher-Eigenverbrauchsoptimierung aktiv. Eine Wallboxlast darf dann wie
 *   jede andere NVP-Last durch den Speicher gedeckt werden.
 * - Erst die explizite Wahl "Speicher schützen" nimmt die reale Wallboxlast aus
 *   dem Speicher-NVP-Regelkreis heraus.
 * - "Speicher mitnutzen" aktiviert den optionalen Assist, aber keinen Schutz.
 * - Der same-cycle EMS-Snapshot ist autoritativ und darf nicht durch einen alten
 *   asynchron veröffentlichten Schutz-State überschrieben werden.
 */
const assert = require('assert');
const path = require('path');
const {
  ChargingManagementModule,
  resolveEvcsStoragePolicy,
} = require(path.join(__dirname, '..', 'ems', 'modules', 'charging-management.js'));
const { SpeicherRegelungModule } = require(path.join(__dirname, '..', 'ems', 'modules', 'storage-control.js'));

assert.strictEqual(typeof ChargingManagementModule, 'function', 'charging module export missing');
assert.strictEqual(typeof resolveEvcsStoragePolicy, 'function', 'storage policy helper must be exported');

const normal = resolveEvcsStoragePolicy(false, false);
assert.deepStrictEqual(normal, {
  mode: 'normal',
  assistRequested: false,
  protectionRequested: false,
}, 'disabled installer feature must keep normal self-consumption');

const normalLegacyTrue = resolveEvcsStoragePolicy(false, true);
assert.deepStrictEqual(normalLegacyTrue, {
  mode: 'normal',
  assistRequested: false,
  protectionRequested: false,
}, 'hidden/locked feature must not activate assist or protection from stale user state');

const protect = resolveEvcsStoragePolicy(true, false);
assert.deepStrictEqual(protect, {
  mode: 'protect',
  assistRequested: false,
  protectionRequested: true,
}, 'explicit protect choice must exclude wallbox load from storage');

const assist = resolveEvcsStoragePolicy(true, true);
assert.deepStrictEqual(assist, {
  mode: 'assist',
  assistRequested: true,
  protectionRequested: false,
}, 'explicit assist choice must allow storage use without protection');

const nowMs = () => Date.now();
const entry = (val, objectId) => ({ val, ts: nowMs(), objectId });

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, nowMs() - Number(rec.ts)) : null;
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 'true' || rec.val === 1 || rec.val === '1';
  }
  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value) });
    return true;
  }
  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value });
    return true;
  }
  lastWrite(key = 'st.targetPowerW') {
    const rows = this.writes.filter((row) => row.key === key);
    return rows.length ? rows[rows.length - 1].value : null;
  }
}

function makeAdapter({ runtimePolicy, stateProtectedLoadW = null } = {}) {
  const states = new Map();
  if (stateProtectedLoadW !== null) {
    states.set('chargingManagement.control.storageProtectedLoadW', { val: stateProtectedLoadW, ts: nowMs() });
    states.set('chargingManagement.control.storageProtectedWallboxes', { val: stateProtectedLoadW > 0 ? 1 : 0, ts: nowMs() });
    states.set('chargingManagement.control.storageAssistRequestedLoadW', { val: 0, ts: nowMs() });
  }
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 10000,
        pvMaxDeltaWPerTick: 10000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
      },
    },
    _emsCaps: runtimePolicy ? {
      evcsStoragePolicy: {
        ...runtimePolicy,
        ts: nowMs(),
      },
    } : {},
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache && this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    _testStates: states,
  };
}

async function runStorageTick({ runtimePolicy, stateProtectedLoadW = null, lastTargetW = 0, lastSource = 'eigenverbrauch' }) {
  // 4,2 kW Bezug entsprechen hier praktisch einer laufenden Wallbox. Bei normaler
  // Eigenverbrauchsoptimierung soll der Speicher bis auf den 50-W-Zielbezug entladen.
  const dp = new FakeDp({
    'grid.powerW': entry(4200, 'grid.filtered'),
    'grid.powerRawW': entry(4200, 'grid.raw'),
    'st.socPct': entry(80, 'battery.soc'),
    'st.targetPowerW': entry(0, 'battery.target'),
  });
  const adapter = makeAdapter({ runtimePolicy, stateProtectedLoadW });
  const module = new SpeicherRegelungModule(adapter, dp);
  module._lastTargetW = lastTargetW;
  module._lastSource = lastSource;
  await module.tick();
  return {
    targetW: dp.lastWrite(),
    source: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzQuelle')?.val,
    protectedLoadW: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzLastW')?.val,
  };
}

(async () => {
  const normalTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 0,
      source: 'charging-runtime',
    },
  });
  assert(normalTick.targetW >= 4000, `normal self-consumption must discharge for EVCS/NVP load, got ${normalTick.targetW} W`);
  assert.strictEqual(normalTick.protectedLoadW, 0, 'normal mode must not publish protected EVCS load');

  const protectTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 4100,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime',
    },
  });
  assert.strictEqual(protectTick.targetW, null, `explicit protect without a running storage command must stay no-write instead of creating a needless 0-W command, got ${protectTick.targetW} W`);
  assert.strictEqual(protectTick.protectedLoadW, 4100, 'explicit protect load must reach storage control');

  const protectActiveTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 4100,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime',
    },
    lastTargetW: 4100,
  });
  assert.strictEqual(protectActiveTick.targetW, 0, 'explicit protect must stop a previously active discharge with one real 0-W command');

  const assistTick = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 4100,
      source: 'charging-runtime',
    },
  });
  assert(assistTick.targetW >= 4000, `assist mode must not protect EVCS load from normal discharge, got ${assistTick.targetW} W`);

  const staleStateIgnored = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 0,
      source: 'charging-tick-reset',
    },
    stateProtectedLoadW: 4100,
  });
  assert(staleStateIgnored.targetW >= 4000, `same-cycle normal policy must override stale protected state, got ${staleStateIgnored.targetW} W`);
  assert.strictEqual(staleStateIgnored.source, 'charging-tick-reset', 'same-cycle runtime policy source must be used');

  const stateFallbackProtect = await runStorageTick({ stateProtectedLoadW: 4100 });
  assert.strictEqual(stateFallbackProtect.targetW, null, 'state fallback without an active storage command must remain no-write');
  assert.strictEqual(stateFallbackProtect.source, 'state-fallback', 'fallback source diagnostic missing');

  const stateFallbackActiveProtect = await runStorageTick({ stateProtectedLoadW: 4100, lastTargetW: 4100 });
  assert.strictEqual(stateFallbackActiveProtect.targetW, 0, 'state fallback must stop an actually active discharge for old runtimes');

  console.log('[evcs-storage-policy-default-self-consumption] OK: normal, protect, assist and same-cycle stale-state handling are verified through the real storage tick.');
})().catch((err) => {
  console.error('[evcs-storage-policy-default-self-consumption] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
