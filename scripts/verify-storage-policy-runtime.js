#!/usr/bin/env node
'use strict';
/**
 * Dynamischer Regressionstest 0.8.81 fuer die Speicher-Grundlogik.
 * Dieser Test laeuft ohne Hardware mit Fake-Adapter/Fake-DP und prueft die
 * kritischen Feldfaelle: keine 71-kW-Entladung, MultiUse-Autostart,
 * Speicherfarm als Basisregelung und PV-Ladestopp bei RAW-Netzbezug.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control.js');

class FakeDp {
  constructor(values = {}, entries = {}) {
    this.values = new Map();
    this.entries = { ...entries };
    this.writes = [];
    const now = Date.now();
    for (const [key, val] of Object.entries(values)) this.setValue(key, val, now);
  }

  setValue(key, val, ts = Date.now()) {
    this.values.set(key, { val, ts });
    if (!this.entries[key]) this.entries[key] = { objectId: `fake.${key}` };
  }

  getEntry(key) {
    return this.entries[key] || null;
  }

  getAgeMs(key) {
    const e = this.values.get(key);
    if (!e) return null;
    return Date.now() - Number(e.ts || 0);
  }

  getNumberFresh(key, staleMs, fallback = null) {
    const e = this.values.get(key);
    if (!e) return fallback;
    const age = Date.now() - Number(e.ts || 0);
    if (Number.isFinite(Number(staleMs)) && staleMs >= 0 && age > staleMs) return fallback;
    const n = Number(e.val);
    return Number.isFinite(n) ? n : fallback;
  }

  getNumber(key, fallback = 0) {
    const e = this.values.get(key);
    if (!e) return fallback;
    const n = Number(e.val);
    return Number.isFinite(n) ? n : fallback;
  }

  getBoolean(key, fallback = false) {
    const e = this.values.get(key);
    if (!e) return fallback;
    return e.val === true || e.val === 'true' || e.val === 1 || e.val === '1';
  }

  async writeNumber(key, val) {
    this.writes.push({ type: 'number', key, val });
    this.setValue(key, val);
    return true;
  }

  async writeBoolean(key, val) {
    this.writes.push({ type: 'boolean', key, val });
    this.setValue(key, !!val);
    return true;
  }
}

class FakeAdapter {
  constructor(config, dp) {
    this.config = config;
    this.dp = dp;
    this.states = new Map();
    this.farmWrites = [];
    this._tarifVis = null;
    this._emsCaps = null;
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
  }

  async getStateAsync(id) {
    return this.states.get(id) || null;
  }

  async setStateAsync(id, val, ack = true) {
    const v = (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'val')) ? val.val : val;
    this.states.set(id, { val: v, ack, ts: Date.now() });
  }

  _nwGetNumberFromCache() {
    return null;
  }

  async applyStorageFarmTargetW(w, ctx = {}) {
    this.farmWrites.push({ w, ctx });
    return { applied: true, reason: 'fake-farm' };
  }
}

const targetEntries = {
  'st.targetPowerW': { objectId: 'device.storage.ctrl.targetPowerW' },
  'grid.powerW': { objectId: 'meter.grid.filtered' },
  'grid.powerRawW': { objectId: 'meter.grid.raw' },
  'st.socPct': { objectId: 'device.storage.soc' },
};

function baseStorage(overrides = {}) {
  return {
    controlMode: 'targetPower',
    staleTimeoutSec: 60,
    pvEnabled: true,
    pvExportThresholdW: 100,
    selfTargetGridImportW: 50,
    selfImportThresholdW: 50,
    selfMinSocPct: 20,
    selfMaxSocPct: 100,
    maxChargeW: 0,
    maxDischargeW: 0,
    stepW: 50,
    maxDeltaWPerTick: 500,
    ...overrides,
  };
}

async function runTick({ config, values, entries = targetEntries, lastTargetW = null, lastSource = '' }) {
  const dp = new FakeDp(values, entries);
  const adapter = new FakeAdapter(config, dp);
  const mod = new SpeicherRegelungModule(adapter, dp);
  if (lastTargetW !== null) mod._lastTargetW = lastTargetW;
  if (lastSource) mod._lastSource = lastSource;
  await mod.tick();
  return { dp, adapter, mod };
}

async function testNoRunawaySelfConsumption() {
  const { dp, adapter } = await runTick({
    config: {
      enableStorageControl: true,
      enableMultiUse: false,
      enableStorageFarm: false,
      installerConfig: { storageMultiUse: { enabled: false } },
      storage: baseStorage({ selfDischargeEnabled: false }),
      peakShaving: {},
    },
    values: {
      'grid.powerW': 2600,
      'grid.powerRawW': 2600,
      'st.socPct': 77,
    },
    lastTargetW: 71600,
    lastSource: 'eigenverbrauch',
  });
  const write = dp.writes.find(w => w.key === 'st.targetPowerW');
  assert(write, 'Eigenverbrauch muss einen Sollwert schreiben');
  assert(write.val > 0, `Eigenverbrauch muss bei Netzbezug entladen, bekam ${write.val}`);
  assert(write.val <= 3000, `Entladung darf bei 2,6 kW NVP-Import nicht weglaufen, bekam ${write.val}`);
  assert.strictEqual(adapter.states.get('speicher.regelung.policyMode').val, 'eigenverbrauch');
  assert.strictEqual(adapter.states.get('speicher.regelung.multiUsePolicyIgnored').val, true);
  assert.strictEqual(adapter.states.get('speicher.regelung.schreibOk').val, true);
}

async function testMultiUseStartsPolicy() {
  const { adapter } = await runTick({
    config: {
      enableStorageControl: false,
      enableMultiUse: true,
      enableStorageFarm: false,
      installerConfig: { storageMultiUse: { enabled: true } },
      storage: baseStorage({ selfDischargeEnabled: true }),
      peakShaving: {},
    },
    values: {
      'grid.powerW': 0,
      'grid.powerRawW': 0,
      'st.socPct': 60,
    },
  });
  assert.strictEqual(adapter.states.get('speicher.regelung.aktiv').val, true, 'MultiUse muss Speicherregelung aktivieren');
  assert.strictEqual(adapter.states.get('speicher.regelung.aktivAutoMultiUse').val, true, 'MultiUse-Auto-Diagnose fehlt');
  assert.strictEqual(adapter.states.get('speicher.regelung.policyMode').val, 'multiuse');
}

async function testStorageFarmStartsAndDispatchesPolicy() {
  const entries = { ...targetEntries };
  delete entries['st.targetPowerW'];
  const { dp, adapter } = await runTick({
    config: {
      enableStorageControl: false,
      enableMultiUse: false,
      enableStorageFarm: true,
      installerConfig: {},
      storageFarm: { storages: [
        { enabled: true, setSignedPowerId: 'fake.storage1.ctrl.targetPowerW' },
        { enabled: true, setSignedPowerId: 'fake.storage2.ctrl.targetPowerW' },
      ] },
      storage: baseStorage(),
      peakShaving: {},
    },
    values: {
      'grid.powerW': 3000,
      'grid.powerRawW': 3000,
      'st.socPct': 80,
    },
    entries,
  });
  assert.strictEqual(adapter.states.get('speicher.regelung.aktiv').val, true, 'Aktive Farm muss die Basis-Eigenverbrauchsregelung starten');
  assert.strictEqual(adapter.states.get('speicher.regelung.aktivAutoSpeicherfarm').val, true, 'Farm-Autostart Diagnose fehlt');
  assert.strictEqual(dp.writes.length, 0, 'Aktive Farm darf keinen Einzel-Sollwertpfad verwenden');
  assert.strictEqual(adapter.farmWrites.length, 1, 'Aktive Farm muss den zentralen Sollwert verteilen');
  assert(adapter.farmWrites[0].w > 0 && adapter.farmWrites[0].w <= 3000, `Farm-Sollwert unplausibel: ${adapter.farmWrites[0].w} W`);
}

async function testPvRawImportStopsOldCharge() {
  const { dp, adapter } = await runTick({
    config: {
      enableStorageControl: true,
      enableMultiUse: false,
      enableStorageFarm: false,
      installerConfig: {},
      storage: baseStorage({ selfDischargeEnabled: false, pvExportThresholdW: 100 }),
      peakShaving: {},
    },
    values: {
      'grid.powerW': -1200,
      'grid.powerRawW': 300,
      'st.socPct': 55,
    },
    lastTargetW: -10000,
    lastSource: 'pv',
  });
  const write = dp.writes.find(w => w.key === 'st.targetPowerW');
  assert(write, 'RAW-Import-Stopp muss einen sicheren 0-W-Sollwert schreiben');
  assert(write.val >= 0, `Bei RAW-Netzbezug darf kein negativer Ladesollwert bleiben, bekam ${write.val}`);
  assert.strictEqual(adapter.states.get('speicher.regelung.chargeDemandCapW').val, 0, 'Lade-Demand-Cap muss bei fehlender Ladeanforderung 0 sein');
}

(async () => {
  await testNoRunawaySelfConsumption();
  await testMultiUseStartsPolicy();
  await testStorageFarmStartsAndDispatchesPolicy();
  await testPvRawImportStopsOldCharge();
  console.log('[storage-policy-runtime] OK: Speicher-Policy-Router und Be-/Entlade-Schutz laufen in dynamischen Regressionen.');
})().catch((err) => {
  console.error('[storage-policy-runtime] FEHLER:', err && err.stack ? err.stack : err);
  process.exit(1);
});
