#!/usr/bin/env node
'use strict';

/**
 * RC27 regression: FENECON/OpenEMS native FEMS-NVP control is strictly limited
 * to DC/hybrid systems, exclusive inside a farm and never overlaps with direct
 * ESS commands. Existing FENECON AC and all other vendors remain direct.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const {
  isFeneconHybrid,
  resolveControlMode,
  validateSingleConfig,
  isLikelyFemsGridMeasurementObjectId,
  calculateFemsGridTargetW,
  validateFarmRows,
} = require('../ems/services/fenecon-hybrid-control');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function now() { return Date.now(); }

class FakeDp {
  constructor(entries = {}, foreign = new Map()) {
    this.entries = entries;
    this.foreign = foreign;
    this.writes = [];
    this.lastWriteByObjectId = new Map();
    for (const entry of Object.values(entries)) {
      if (entry && entry.objectId) {
        this.foreign.set(String(entry.objectId), { val: entry.val, ack: true, ts: entry.ts || now(), lc: entry.ts || now() });
      }
    }
  }
  getEntry(key) { return this.entries[key] || null; }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = Math.max(0, now() - Number(rec.ts || now()));
    if (Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
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
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec ? Math.max(0, now() - Number(rec.ts || now())) : null;
  }
  getRaw(key) { return this.entries[key] ? this.entries[key].val : null; }
  async writeNumber(key, value) {
    const entry = this.entries[key];
    if (!entry || !entry.objectId) return false;
    const val = Number(value);
    const ts = now();
    entry.val = val;
    entry.ts = ts;
    this.foreign.set(String(entry.objectId), { val, ack: true, ts, lc: ts });
    this.lastWriteByObjectId.set(String(entry.objectId), { value: val, ts });
    this.writes.push({ key, objectId: String(entry.objectId), value: val });
    return true;
  }
  async writeBoolean(key, value) {
    const entry = this.entries[key];
    if (!entry || !entry.objectId) return false;
    const val = !!value;
    const ts = now();
    entry.val = val;
    entry.ts = ts;
    this.foreign.set(String(entry.objectId), { val, ack: true, ts, lc: ts });
    this.lastWriteByObjectId.set(String(entry.objectId), { value: val, ts });
    this.writes.push({ key, objectId: String(entry.objectId), value: val });
    return true;
  }
}

function entry(objectId, val = 0) {
  return { objectId, val, ts: now(), scale: 1, offset: 0, invert: false, unitScale: 1 };
}

function makeAdapter(storage, foreign) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      emsApps: { apps: { storage: { installed: true, enabled: true }, storagefarm: { installed: false, enabled: false } } },
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        stepW: 1,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 1500,
        feneconApiTimeoutSec: 5,
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

async function testSingleNative() {
  const foreign = new Map();
  const dp = new FakeDp({
    'st.targetPowerW': entry('storage.direct.target', 420),
    'st.feneconGridSetpointW': entry('fems.ctrlBalancing0.SetGridActivePower', 0),
    'st.feneconEssActualPowerW': entry('fems.ess0.ActivePower', -3000),
    'st.feneconMinPowerW': entry('fems.ess0.MinimumPower', -5000),
    'st.feneconMaxPowerW': entry('fems.ess0.MaximumPower', 5000),
  }, foreign);
  const adapter = makeAdapter({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'fems-grid',
  }, foreign);
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._latestNvpRawW = 2000;
  mod._latestNvpSampleTs = now();

  // Requested battery target -1050 W translates to +50 W grid target:
  // 2000 + (-3000) - (-1050) = 50.
  await mod._applyTargetW(-1050, 'hybrid native test', 'self');
  let gridWrites = dp.writes.filter((w) => w.key === 'st.feneconGridSetpointW');
  let directWrites = dp.writes.filter((w) => w.key === 'st.targetPowerW');
  assert.equal(directWrites.at(-1).value, 0, 'direct ESS target must be neutralized before native controller takeover');
  assert.equal(gridWrites.length, 0, 'native FEMS target must wait until the old direct API watchdog is released');
  assert.equal(adapter._states.get('speicher.regelung.schreibStatus').val, 'fenecon-handover-wait');

  // Simulate expiry of the direct ESS watchdog and repeat the same policy target.
  mod._feneconDirectReleaseUntilMs = now() - 1;
  dp.writes.length = 0;
  await mod._applyTargetW(-1050, 'hybrid native takeover completed', 'self');
  gridWrites = dp.writes.filter((w) => w.key === 'st.feneconGridSetpointW');
  directWrites = dp.writes.filter((w) => w.key === 'st.targetPowerW');
  assert.equal(gridWrites.at(-1).value, 50, 'native FEMS target must be translated to +50 W grid import');
  assert.equal(directWrites.length, 0, 'direct ESS target must remain neutral after native takeover');
  assert.equal(adapter._states.get('speicher.regelung.commandFamily').val, 'fenecon-fems-grid');
  assert.equal(adapter._states.get('speicher.regelung.acceptedSollW').val, -1050);
  assert.equal(adapter._states.get('speicher.regelung.commandDpReadbackOk').val, true);

  // Native -> direct must wait for the FEMS API watchdog to expire.
  adapter.config.storage.feneconControlMode = 'direct-ess';
  dp.writes.length = 0;
  await mod._applyTargetW(-900, 'handover test', 'self');
  assert.equal(adapter._states.get('speicher.regelung.schreibStatus').val, 'fenecon-handover-wait');
  assert.equal(dp.writes.some((w) => w.key === 'st.targetPowerW' && w.value === -900), false, 'direct ESS may not overlap an active FEMS command');

  // Simulate watchdog expiry; direct command is then allowed.
  const expired = now() - 6000;
  mod._feneconGridLastWriteMs = expired;
  mod._feneconGridWasActive = true;
  adapter.stateCache['speicher.regelung.feneconGridLastWriteMs'] = { value: expired, ack: true, ts: expired, lc: expired };
  dp.writes.length = 0;
  await mod._applyTargetW(-900, 'handover completed', 'self');
  assert.equal(dp.writes.some((w) => w.key === 'st.targetPowerW' && w.value === -900), true, 'direct ESS must resume after watchdog expiry');
  assert.equal(adapter._states.get('speicher.regelung.commandFamily').val, 'signed');
}

async function testAcRemainsDirect() {
  const foreign = new Map();
  const dp = new FakeDp({
    'st.targetPowerW': entry('storage.direct.target', 0),
    'st.feneconGridSetpointW': entry('fems.ctrlBalancing0.SetGridActivePower', 0),
    'st.feneconEssActualPowerW': entry('fems.ess0.ActivePower', 0),
  }, foreign);
  const adapter = makeAdapter({
    vendorProfile: 'fenecon-openems',
    coupling: 'ac',
    feneconControlMode: 'auto',
  }, foreign);
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._latestNvpRawW = 900;
  mod._latestNvpSampleTs = now();
  await mod._applyTargetW(850, 'AC remains direct', 'self');
  assert.equal(dp.writes.some((w) => w.key === 'st.targetPowerW' && w.value === 850), true);
  assert.equal(dp.writes.some((w) => w.key === 'st.feneconGridSetpointW'), false, 'FENECON AC must never use native FEMS NVP control');
  assert.equal(adapter._states.get('speicher.regelung.commandFamily').val, 'signed');
}

async function testAutoIgnoresGridMeasurementAndWritesDirect() {
  const foreign = new Map();
  const dp = new FakeDp({
    'st.targetPowerW': entry('nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW', 0),
    'st.feneconGridSetpointW': entry('nexowatt-devices.0.devices.ess1.aliases.r.gridPower', 0),
    'st.feneconEssActualPowerW': entry('nexowatt-devices.0.devices.ess1.aliases.r.powerAc', 1200),
  }, foreign);
  const adapter = makeAdapter({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
  }, foreign);
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._latestNvpRawW = 1200;
  mod._latestNvpSampleTs = now();

  await mod._applyTargetW(1150, 'field regression: no PV, direct discharge', 'eigenverbrauch');

  assert.equal(
    dp.writes.some((row) => row.key === 'st.targetPowerW' && row.value === 1150),
    true,
    'aliases.r.gridPower is a measurement and must not suppress the signed ESS command',
  );
  assert.equal(
    dp.writes.some((row) => row.key === 'st.feneconGridSetpointW'),
    false,
    'the read-only grid measurement must never be used as the native FEMS target',
  );
  assert.equal(adapter._states.get('speicher.regelung.commandFamily').val, 'signed');
  const splitDiag = JSON.parse(String(adapter._states.get('speicher.regelung.splitTargetObjIds').val || '{}'));
  assert.equal(splitDiag.feneconControlMode, 'direct-ess');
  assert.equal(splitDiag.feneconControlReason, 'auto-grid-measurement-ignored-direct-ess');
}

async function testDirectSetpointReadbackDrivesNvpCorrection() {
  const foreign = new Map();
  const dp = new FakeDp({
    'st.targetPowerW': entry('fems.ess0.SetActivePowerEquals', -50),
    'st.feneconActualSetpointW': entry('fems.ess0.SetActivePowerEqualsReadback', -50),
    'st.feneconEssActualPowerW': entry('fems.ess0.ActivePower', -1100),
  }, foreign);
  const adapter = makeAdapter({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'direct-ess',
  }, foreign);
  const mod = new SpeicherRegelungModule(adapter, dp);
  const feedback = mod._resolveFeneconDirectNvpFeedback({
    nowMs: now(),
    freshAgeMs: 8000,
    holdAgeMs: 45000,
  });

  assert.equal(feedback && feedback.usable, true, 'direct FENECON command feedback must be available');
  assert.equal(feedback.feedbackW, -50, 'SetActivePowerEquals readback must win over physical ESS ActivePower');
  assert.equal(feedback.source, 'fenecon-direct-setpoint-readback');

  const balance = mod._buildActualAwareNvpBalance({
    rawNvpW: 600,
    fallbackNvpW: 600,
    nvpAgeMs: 0,
    targetNvpW: 50,
    deadbandW: 50,
    batteryPowerW: feedback.feedbackW,
    batteryMeasuredW: feedback.measuredW,
    batteryAgeMs: feedback.sampleAgeMs,
    batteryPowerTrusted: true,
    batteryFeedbackSource: feedback.source,
    batteryFeedbackHeld: feedback.held,
    batteryFeedbackPredicted: false,
    batteryFeedbackPredictionDeltaW: 0,
    batteryFeedbackHoldAgeMs: 45000,
    batteryFeedbackKey: feedback.key,
    batterySampleTs: feedback.sampleTs,
    balanceControlKey: 'fenecon-direct-nvp-regression',
    fastServoActive: true,
    preferRawNvp: true,
    lastTargetW: -50,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 5000,
    maxChargeCorrectionW: 5000,
    feedbackMaxAgeMs: 8000,
    nvpFeedbackMaxAgeMs: 8000,
    feedbackRequireAligned: false,
    stepW: 1,
  });

  assert.equal(balance.active, true);
  assert.equal(balance.targetW, 500, '600 W import with -50 W active command must produce +500 W discharge at a 50 W grid target');
  assert.notEqual(balance.targetW, -550, 'physical hybrid charging power must not be reused as direct command feedback');
}

async function testNativeClampAndAcceptedTarget() {
  const foreign = new Map();
  const dp = new FakeDp({
    'st.feneconGridSetpointW': entry('fems.ctrlBalancing0.SetGridActivePower', 0),
    'st.feneconEssActualPowerW': entry('fems.ess0.ActivePower', 0),
    'st.feneconMinPowerW': entry('fems.ess0.MinimumPower', -500),
    'st.feneconMaxPowerW': entry('fems.ess0.MaximumPower', 800),
  }, foreign);
  const adapter = makeAdapter({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'fems-grid',
  }, foreign);
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._latestNvpRawW = 300;
  mod._latestNvpSampleTs = now();
  await mod._applyTargetW(1200, 'clamp test', 'self');
  assert.equal(dp.writes.filter((w) => w.key === 'st.feneconGridSetpointW').at(-1).value, -500, '300 + 0 - 800 = -500 W grid target');
  assert.equal(adapter._states.get('speicher.regelung.acceptedSollW').val, 800, 'accepted battery target must reflect the FEMS limit');
  assert.equal(adapter._states.get('speicher.regelung.requestSatisfied').val, false);
  assert.equal(adapter._states.get('speicher.regelung.partiallyAccepted').val, true);
}


class FarmAdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.stateCache = {};
    this.internal = new Map();
    this.foreign = new Map();
    this.writes = [];
    this.log = { debug() {}, info() {}, warn() {}, error() {}, silly() {} };
  }
  async setObjectNotExistsAsync() {}
  async getStateAsync(id) { return this.internal.get(String(id)) || null; }
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    const rec = { val, ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : !!ack, ts: Date.now(), lc: Date.now() };
    this.internal.set(String(id), rec);
    this.stateCache[String(id)] = { value: val, ts: rec.ts, lc: rec.lc, ack: rec.ack };
  }
  async getForeignStateAsync(id) { return this.foreign.get(String(id)) || null; }
  async getForeignObjectAsync(id) {
    const sid = String(id || '');
    return { type: 'state', common: { unit: sid.includes('.soc') ? '%' : 'W', write: sid.includes('.set') }, native: {} };
  }
  async setForeignStateAsync(id, value) {
    const objectId = String(id);
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    this.writes.push({ id: objectId, val: Number(val) });
    this.foreign.set(objectId, { val, ack: false, ts: Date.now(), lc: Date.now() });
  }
  setTimeout(fn, ms) { return setTimeout(fn, ms); }
  setInterval(fn, ms) { return setInterval(fn, ms); }
  clearTimeout(ref) { clearTimeout(ref); }
  clearInterval(ref) { clearInterval(ref); }
}

function expressStub() {
  return { use() {}, get() {}, post() {}, put() {}, delete() {}, listen() { return null; } };
}
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

async function testFarmContinuousAuto() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@iobroker/adapter-core') return { Adapter: FarmAdapterStub };
    if (request === 'express') return expressStub;
    if (request === '@iobroker/type-detector') {
      const error = new Error('optional dependency intentionally absent');
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const factory = require(path.join(__dirname, '..', 'main.js'));
    const adapter = factory({});
    adapter.scheduleDerivedFlowUpdate = () => {};
    adapter.updateValue = function updateValue(key, value, ts) {
      this.stateCache[String(key)] = { value, ts: Number(ts) || Date.now(), lc: Number(ts) || Date.now(), ack: true };
    };
    const rows = [
      {
        enabled: true,
        name: 'FENECON Hybrid',
        vendorProfile: 'fenecon-openems',
        coupling: 'dc',
        feneconControlMode: 'auto',
        feneconEssActualPowerId: 'farm.fenecon.actual',
        feneconApiTimeoutSec: 5,
        socId: 'farm.fenecon.soc',
        signedPowerId: 'farm.fenecon.actual',
        setSignedPowerId: 'farm.fenecon.set',
        maxChargeW: 10000,
        maxDischargeW: 10000,
      },
      {
        enabled: true,
        name: 'Farm monitor only',
        vendorProfile: 'generic',
        coupling: 'ac',
        socId: 'farm.monitor.soc',
        signedPowerId: 'farm.monitor.actual',
      },
    ];
    adapter.config = {
      enableStorageControl: false,
      enableStorageFarm: true,
      emsApps: { apps: { storage: { installed: false, enabled: false }, storagefarm: { installed: true, enabled: true } } },
      storage: { staleTimeoutSec: 15, selfMinSocPct: 10 },
      storageFarm: { mode: 'pool', schedulerIntervalMs: 1000, storages: rows },
    };
    const ts = Date.now();
    const seed = (id, val) => adapter.foreign.set(id, { val, ack: true, ts: Date.now(), lc: Date.now() });
    seed('farm.fenecon.pv', 3000);
    seed('farm.fenecon.soc', 70);
    seed('farm.fenecon.actual', 0);
    seed('farm.fenecon.set', 0);
    seed('farm.monitor.soc', 50);
    seed('farm.monitor.actual', 0);
    adapter.internal.set('storageFarm.configJson', { val: JSON.stringify(rows), ack: true, ts, lc: ts });
    adapter.stateCache['storageFarm.configJson'] = { value: JSON.stringify(rows), ack: true, ts, lc: ts };
    adapter.stateCache['settings.deviceStaleTimeoutSec'] = { value: 300, ack: true, ts, lc: ts };

    await adapter.ensureStorageFarmStates();
    await adapter.updateStorageFarmDerived('fenecon-auto-continuous');
    adapter.writes.length = 0;
    const first = await adapter.applyStorageFarmTargetW(2500, { source: 'eigenverbrauch', reason: 'continuous test with PV' });
    assert.equal(first.writeOk, true, JSON.stringify(first));
    assert.ok(adapter.writes.some((row) => row.id === 'farm.fenecon.set' && row.val === 2500), `Farm AUTO without a genuine FEMS grid target must continuously use direct ESS dispatch: ${JSON.stringify(adapter.writes)}`);

    seed('farm.fenecon.pv', 0);
    await adapter.updateStorageFarmDerived('fenecon-auto-continuous-no-pv');
    adapter.writes.length = 0;
    const second = await adapter.applyStorageFarmTargetW(1800, { source: 'eigenverbrauch', reason: 'continuous test without PV' });
    assert.equal(second.writeOk, true, JSON.stringify(second));
    assert.ok(adapter.writes.some((row) => row.id === 'farm.fenecon.set' && row.val === 1800), `Direct farm dispatch must remain active independently of PV: ${JSON.stringify(adapter.writes)}`);
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'dc' }), true);
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'hybrid' }), true);
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'ac' }), false);

  assert.equal(resolveControlMode({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
    feneconEssActualPowerId: 'fems.ess0.ActivePower',
    setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
  }, { writableStorageCount: 1 }).mode, 'fems-grid');

  assert.equal(
    isLikelyFemsGridMeasurementObjectId('nexowatt-devices.0.devices.ess1.aliases.r.gridPower'),
    true,
  );
  const measurementFallback = resolveControlMode({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconGridSetpointId: 'nexowatt-devices.0.devices.ess1.aliases.r.gridPower',
    feneconEssActualPowerId: 'nexowatt-devices.0.devices.ess1.aliases.r.powerAc',
    setSignedPowerId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
  }, { writableStorageCount: 1 });
  assert.equal(measurementFallback.mode, 'direct-ess');
  assert.equal(measurementFallback.reason, 'auto-grid-measurement-ignored-direct-ess');

  assert.equal(resolveControlMode({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconEssActualPowerId: 'fems.ess0.ActivePower',
    setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
  }, { writableStorageCount: 1 }).mode, 'direct-ess');

  assert.equal(resolveControlMode({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
    feneconEssActualPowerId: 'fems.ess0.ActivePower',
    setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
  }, { writableStorageCount: 2, otherWritableStorageCount: 1 }).mode, 'direct-ess');

  assert.equal(resolveControlMode({
    vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto',
  }, { writableStorageCount: 1 }).mode, 'invalid');
  assert.equal(resolveControlMode({
    vendorProfile: 'sungrow-hybrid', coupling: 'dc', feneconControlMode: 'auto', setSignedPowerId: 'x',
  }).mode, 'direct-ess');
  assert.equal(resolveControlMode({
    vendorProfile: 'fenecon-openems', coupling: 'ac', feneconControlMode: 'auto', setSignedPowerId: 'x',
  }).mode, 'direct-ess');

  const directValid = validateSingleConfig({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'direct-ess',
    feneconEssActualPowerId: 'nexowatt-devices.0.devices.ess1.aliases.v1.r.essActivePower',
    setSignedPowerId: 'nexowatt-devices.0.devices.ess1.aliases.v1.ctrl.powerSetpointW',
  });
  assert.equal(directValid.ok, true, directValid.reason);

  const badBalance = validateSingleConfig({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'direct-ess',
    feneconEssActualPowerId: 'nexowatt-devices.0.devices.ess1.aliases.r.powerBalance',
    setSignedPowerId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
  });
  assert.equal(badBalance.ok, false);
  assert.equal(badBalance.reason, 'fenecon-power-balance-not-valid-as-ess-feedback');

  const badSharedCommand = validateSingleConfig({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconGridSetpointId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
    feneconEssActualPowerId: 'nexowatt-devices.0.devices.ess1.aliases.v1.r.essActivePower',
    setSignedPowerId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
  });
  assert.equal(badSharedCommand.ok, false);
  assert.match(badSharedCommand.reason, /equals|direct-ess-setpoint/);

  const badDirectAsGrid = validateSingleConfig({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'fems-grid',
    feneconGridSetpointId: 'fems.ess0.SetActivePowerEquals.706',
    feneconEssActualPowerId: 'fems.ess0.ActivePower.604',
  });
  assert.equal(badDirectAsGrid.ok, false);
  assert.equal(badDirectAsGrid.reason, 'fenecon-grid-target-is-direct-ess-setpoint');

  const measurementAutoValid = validateSingleConfig({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconGridSetpointId: 'nexowatt-devices.0.devices.ess1.aliases.r.gridPower',
    feneconEssActualPowerId: 'nexowatt-devices.0.devices.ess1.aliases.r.powerAc',
    setSignedPowerId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
  });
  assert.equal(measurementAutoValid.ok, true, measurementAutoValid.reason);
  assert.equal(measurementAutoValid.resolution.mode, 'direct-ess');

  const measurementExplicitInvalid = validateSingleConfig({
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'fems-grid',
    feneconGridSetpointId: 'nexowatt-devices.0.devices.ess1.aliases.r.gridPower',
    feneconEssActualPowerId: 'nexowatt-devices.0.devices.ess1.aliases.r.powerAc',
  });
  assert.equal(measurementExplicitInvalid.ok, false);
  assert.equal(measurementExplicitInvalid.reason, 'fems-grid-target-is-measurement');

  const calc = calculateFemsGridTargetW({ nvpW: 2000, essActualW: -3000, batteryTargetW: -1050 });
  assert.deepEqual({ ok: calc.ok, gridTargetW: calc.gridTargetW }, { ok: true, gridTargetW: 50 });

  const singleDirectFarm = validateFarmRows([{
    enabled: true,
    name: 'FENECON Hybrid',
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconEssActualPowerId: 'fems.ess0.ActivePower',
    setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
  }]);
  assert.equal(singleDirectFarm.ok, true, singleDirectFarm.reason);
  assert.equal(singleDirectFarm.nativeMasterCount, 0);
  assert.equal(singleDirectFarm.resolved[0].mode, 'direct-ess');

  const singleNativeFarm = validateFarmRows([{
    enabled: true,
    name: 'FENECON Hybrid Native',
    vendorProfile: 'fenecon-openems',
    coupling: 'dc',
    feneconControlMode: 'auto',
    feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
    feneconEssActualPowerId: 'fems.ess0.ActivePower',
    setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
  }]);
  assert.equal(singleNativeFarm.ok, true, singleNativeFarm.reason);
  assert.equal(singleNativeFarm.nativeMasterCount, 1);
  assert.equal(singleNativeFarm.resolved[0].mode, 'fems-grid');

  const mixedAuto = validateFarmRows([
    {
      enabled: true,
      name: 'FENECON Hybrid',
      vendorProfile: 'fenecon-openems',
      coupling: 'dc',
      feneconControlMode: 'auto',
      feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
      feneconEssActualPowerId: 'fems.ess0.ActivePower',
      setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
    },
    { enabled: true, name: 'Other storage', vendorProfile: 'generic', coupling: 'ac', setSignedPowerId: 'other.direct' },
  ]);
  assert.equal(mixedAuto.ok, true, mixedAuto.reason);
  assert.equal(mixedAuto.nativeMasterCount, 0);
  assert.equal(mixedAuto.resolved.find((row) => row.name === 'FENECON Hybrid').mode, 'direct-ess');

  const invalidMixed = validateFarmRows([
    {
      enabled: true,
      name: 'FENECON Hybrid',
      vendorProfile: 'fenecon-openems',
      coupling: 'dc',
      feneconControlMode: 'fems-grid',
      feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
      feneconEssActualPowerId: 'fems.ess0.ActivePower',
      setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
    },
    { enabled: true, name: 'Other storage', vendorProfile: 'generic', coupling: 'ac', setSignedPowerId: 'other.direct' },
  ]);
  assert.equal(invalidMixed.ok, false);
  assert.match(invalidMixed.reason, /exclusive|master|mixed/i);

  await testSingleNative();
  await testAcRemainsDirect();
  await testAutoIgnoresGridMeasurementAndWritesDirect();
  await testNativeClampAndAcceptedTarget();
  await testDirectSetpointReadbackDrivesNvpCorrection();
  await testFarmContinuousAuto();

  const fs = require('node:fs');
  const mainTs = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/main.ts'), 'utf8');
  const storageTs = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  const appTs = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  assert.match(mainTs, /nwValidateFeneconFarmRows\(sf\.storages\)/);
  assert.match(mainTs, /nwValidateFeneconSingleConfig/);
  assert.doesNotMatch(mainTs, /hybridAutoFeneconRows/);
  assert.doesNotMatch(mainTs, /fenecon-day-no-write/);
  assert.doesNotMatch(storageTs, /_handleFeneconHybridPassThrough/);
  assert.match(storageTs, /st\.feneconEssActualPowerW/);
  assert.match(storageTs, /st\.feneconActualSetpointW/);
  assert.match(storageTs, /fenecon-direct-setpoint-readback/);
  assert.match(storageTs, /FENECON Hybrid: PV-Feed-forward deaktiviert/);
  assert.match(appTs, /r\.essActivePower/);
  assert.match(appTs, /ctrl\.gridSetpointW/);
  assert.match(appTs, /isFeneconGridMeasurementId/);
  assert.match(appTs, /aliases\.r\.gridPower/);
  assert.doesNotMatch(appTs, /ctrl\.powerSetpointW[^\n]+FEMS-NVP/i);

  console.log('[fenecon-hybrid-controller] OK: continuous native/direct FENECON control, grid-measurement fallback, direct-setpoint NVP feedback, strict command-role separation, real AC ESS feedback and mixed-farm safety verified.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
