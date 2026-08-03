#!/usr/bin/env node
'use strict';

/**
 * RC28 regression: A FENECON/OpenEMS DC hybrid in automatic mode must never
 * receive an external battery/grid setpoint while fresh PV is present or the
 * PV measurement is unclear. FEMS owns the plant during that period. Only
 * after fresh PV has remained below the configured release threshold does the
 * existing direct ESS/NVP controller resume. Other vendors and FENECON AC
 * systems remain unchanged.
 */
const assert = require('node:assert/strict');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function now() { return Date.now(); }

class FakeDp {
  constructor(entries = {}, foreign = new Map()) {
    this.entries = entries;
    this.foreign = foreign;
    this.writes = [];
    this.lastWriteByObjectId = new Map();
    for (const rec of Object.values(entries)) {
      if (!rec || !rec.objectId) continue;
      this.foreign.set(String(rec.objectId), { val: rec.val, ack: true, ts: rec.ts || now(), lc: rec.ts || now() });
    }
  }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec ? Math.max(0, now() - Number(rec.ts || now())) : null;
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (Number.isFinite(Number(staleMs)) && age !== null && age > Number(staleMs)) return fallback;
    const value = Number(rec.val);
    return Number.isFinite(value) ? value : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    const value = Number(rec && rec.val);
    return Number.isFinite(value) ? value : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }
  getRaw(key) { return this.entries[key] ? this.entries[key].val : null; }
  async writeNumber(key, value) {
    const rec = this.entries[key];
    if (!rec || !rec.objectId) return false;
    const val = Number(value);
    const ts = now();
    rec.val = val;
    rec.ts = ts;
    this.foreign.set(String(rec.objectId), { val, ack: true, ts, lc: ts });
    this.lastWriteByObjectId.set(String(rec.objectId), { value: val, ts });
    this.writes.push({ key, objectId: String(rec.objectId), value: val });
    return true;
  }
  async writeBoolean(key, value) {
    const rec = this.entries[key];
    if (!rec || !rec.objectId) return false;
    const val = !!value;
    const ts = now();
    rec.val = val;
    rec.ts = ts;
    this.foreign.set(String(rec.objectId), { val, ack: true, ts, lc: ts });
    this.lastWriteByObjectId.set(String(rec.objectId), { value: val, ts });
    this.writes.push({ key, objectId: String(rec.objectId), value: val });
    return true;
  }
  lastWrite(key) {
    return this.writes.filter((row) => row.key === key).at(-1) || null;
  }
}

function entry(objectId, val = 0, ts = now()) {
  return { objectId, val, ts, scale: 1, offset: 0, invert: false, unitScale: 1 };
}

function makeAdapter(storage, foreign) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      emsApps: { apps: { storage: { installed: true, enabled: true }, storagefarm: { installed: false, enabled: false } } },
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        stepW: 1,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 1500,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 20,
        selfMinSocPct: 10,
        selfMaxSocPct: 100,
        feneconApiTimeoutSec: 10,
        feneconPvPassthroughThresholdW: 200,
        feneconPvReleaseThresholdW: 50,
        feneconPvReleaseDelaySec: 0,
        ...storage,
      },
      storageFarm: { storages: [] },
    },
    stateCache: {},
    log: { debug() {}, info() {}, warn() {}, error() {} },
    _nwGetStorageControlAuthority() {
      return {
        selectedTopology: 'single',
        writerActive: true,
        reason: 'single-active',
        singleAppActive: true,
        farmAggregationActive: false,
        farmDispatchActive: false,
        farm: { active: false, dispatchActive: false, rows: [] },
        multiUsePolicyActive: false,
      };
    },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      const ts = now();
      states.set(String(id), { val, ack: true, ts, lc: ts });
      this.stateCache[String(id)] = { value: val, ack: true, ts, lc: ts };
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    async getForeignStateAsync(id) { return foreign.get(String(id)) || null; },
    _states: states,
  };
}

function buildRig({ vendorProfile = 'fenecon-openems', coupling = 'dc', mode = 'auto', pvW = 1000, pvFresh = true, gridW = 800, batteryW = 0, delaySec = 0 } = {}) {
  const foreign = new Map();
  const pvTs = pvFresh ? now() : now() - 60000;
  const dp = new FakeDp({
    'grid.powerW': entry('grid.filtered', gridW),
    'grid.powerRawW': entry('grid.raw', gridW),
    'st.socPct': entry('battery.soc', 70),
    'st.batteryPowerW': entry('battery.actual', batteryW),
    'st.dcPvPowerW': entry('fems.production.dc', pvW, pvTs),
    'st.targetPowerW': entry('fems.ess0.SetActivePowerEquals', 0),
    // The legacy/native target may be mapped, but AUTO must not use it.
    'st.feneconGridSetpointW': entry('fems.ctrlBalancing0.SetGridActivePower', 0),
  }, foreign);
  const adapter = makeAdapter({
    vendorProfile,
    coupling,
    feneconControlMode: mode,
    dcPvPowerObjectId: 'fems.production.dc',
    feneconGridSetpointObjectId: 'fems.ctrlBalancing0.SetGridActivePower',
    targetPowerObjectId: 'fems.ess0.SetActivePowerEquals',
    feneconPvReleaseDelaySec: delaySec,
  }, foreign);
  return { dp, adapter, mod: new SpeicherRegelungModule(adapter, dp) };
}

(async () => {
  // Daytime: AUTO FENECON DC hybrid delegates entirely to FEMS. No direct ESS,
  // no native grid target and, critically, no 0-W stop is written.
  const day = buildRig({ pvW: 4600, gridW: 7400, batteryW: -8500 });
  await day.mod.tick();
  assert.equal(day.dp.writes.length, 0, `PV-active FENECON AUTO must perform zero hardware writes: ${JSON.stringify(day.dp.writes)}`);
  assert.equal(day.adapter._states.get('speicher.regelung.schreibStatus').val, 'fenecon-day-no-write');
  assert.equal(day.adapter._states.get('speicher.regelung.feneconHybridNoWrite').val, true);
  assert.equal(day.adapter._states.get('speicher.regelung.feneconHybridRegelhoheit').val, 'fems');
  assert.equal(day.adapter._states.get('speicher.regelung.commandEffective').val, false);
  assert.equal(day.adapter._states.get('speicher.regelung.requestW').val, null, 'No-Write must not be represented as a 0-W stop request');
  assert.equal(day.adapter._states.get('speicher.regelung.sollW').val, null, 'No-Write must not be represented as a 0-W hardware target');
  assert.equal(day.adapter._states.get('speicher.regelung.acceptedSollW').val, null, 'No external command is accepted while FEMS owns the hybrid');
  assert.equal(day.adapter._states.get('speicher.regelung.zeroWriteFirewallAction').val, 'no-write-fems-authority');
  await day.mod.tick();
  assert.equal(day.dp.writes.length, 0, 'Repeated daytime ticks must not refresh either external command family');

  // Missing/stale PV is fail-safe: do not guess "night" and never send a fixed
  // storage target while the hybrid PV state is unknown.
  const unknownPv = buildRig({ pvW: 0, pvFresh: false, gridW: 900 });
  await unknownPv.mod.tick();
  assert.equal(unknownPv.dp.writes.length, 0, 'Stale PV must leave FEMS in control without external writes');
  assert.equal(unknownPv.adapter._states.get('speicher.regelung.feneconHybridModus').val, 'fems-pv-unknown');

  // Night: fresh PV below the release threshold (delay=0 in this regression)
  // re-enables the existing direct ESS/NVP controller.
  const night = buildRig({ pvW: 0, gridW: 800, batteryW: 0, delaySec: 0 });
  await night.mod.tick();
  const nightWrite = night.dp.lastWrite('st.targetPowerW');
  assert.ok(nightWrite && nightWrite.value > 0, `Night regulation must write a direct discharge target: ${JSON.stringify(night.dp.writes)}`);
  assert.equal(night.dp.writes.some((row) => row.key === 'st.feneconGridSetpointW'), false, 'AUTO must never write SetGridActivePower');
  assert.equal(night.adapter._states.get('speicher.regelung.feneconHybridRegelhoheit').val, 'nexowatt');
  assert.equal(night.adapter._states.get('speicher.regelung.feneconHybridNoWrite').val, false);

  // FENECON AC and all non-FENECON profiles are deliberately unchanged.
  const ac = buildRig({ coupling: 'ac', pvW: 4000, gridW: 800 });
  await ac.mod.tick();
  assert.ok(ac.dp.lastWrite('st.targetPowerW'), 'FENECON AC must remain on direct ESS control');
  const sungrow = buildRig({ vendorProfile: 'sungrow-hybrid', coupling: 'dc', pvW: 4000, gridW: 800 });
  await sungrow.mod.tick();
  assert.ok(sungrow.dp.lastWrite('st.targetPowerW'), 'Other vendors must remain on their existing direct path');

  console.log('[storage-fenecon-day-no-write] OK: FENECON Hybrid AUTO delegates to FEMS with actual/unknown PV and resumes direct ESS control only after fresh PV is absent.');
})().catch((error) => {
  console.error('[storage-fenecon-day-no-write] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
