// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-fenecon-hybrid-controller.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-fenecon-hybrid-controller.js
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
 * Original-Hash: 7bfd3fc857e9504a930ec960f29dc1d542495b048ee07d54cf7b30037939578a
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
  resolveHybridAuthority,
  calculateFemsGridTargetW,
  validateFarmRows,
} = require('../ems/services/fenecon-hybrid-control');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

/**
 * Code-Teil: now
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function now() { return Date.now(); }

/**
 * Code-Teil: FakeDp
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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

/**
 * Code-Teil: entry
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function entry(objectId, val = 0) {
  return { objectId, val, ts: now(), scale: 1, offset: 0, invert: false, unitScale: 1 };
}

/**
 * Code-Teil: makeAdapter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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

/**
 * Code-Teil: testSingleNative
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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

/**
 * Code-Teil: testAcRemainsDirect
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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

/**
 * Code-Teil: testNativeClampAndAcceptedTarget
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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


/**
 * Code-Teil: FarmAdapterStub
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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

/**
 * Code-Teil: expressStub
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function expressStub() {
  return { use() {}, get() {}, post() {}, put() {}, delete() {}, listen() { return null; } };
}
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

/**
 * Code-Teil: testFarmHybridAutoDayNight
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function testFarmHybridAutoDayNight() {
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
        feneconPvDcId: 'farm.fenecon.pv',
        feneconPvPassthroughThresholdW: 200,
        feneconPvReleaseThresholdW: 50,
        feneconPvReleaseDelaySec: 0,
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
/**
 * Code-Teil: seed
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
    await adapter.updateStorageFarmDerived('fenecon-auto-day');
    adapter.writes.length = 0;
    const day = await adapter.applyStorageFarmTargetW(2500, { source: 'eigenverbrauch', reason: 'day test' });
    assert.equal(day.status, 'fenecon-day-no-write', JSON.stringify(day));
    assert.equal(day.writeOk, true);
    assert.equal(day.commandEffective, false);
    assert.equal(adapter.writes.some((row) => row.id === 'farm.fenecon.set'), false, 'Farm AUTO must not write the FENECON target while PV is present');

    seed('farm.fenecon.pv', 0);
    await adapter.updateStorageFarmDerived('fenecon-auto-night');
    adapter.writes.length = 0;
    const night = await adapter.applyStorageFarmTargetW(1800, { source: 'eigenverbrauch', reason: 'night test' });
    assert.equal(night.writeOk, true, JSON.stringify(night));
    assert.ok(adapter.writes.some((row) => row.id === 'farm.fenecon.set' && row.val === 1800), `Night AUTO must resume direct farm dispatch: ${JSON.stringify(adapter.writes)}`);
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'dc' }), true);
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'ac' }), false);
  assert.equal(resolveControlMode({ vendorProfile: 'sungrow-hybrid', coupling: 'dc', feneconControlMode: 'auto', feneconGridSetpointId: 'x' }).mode, 'direct-ess');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'ac', feneconControlMode: 'auto', feneconGridSetpointId: 'x' }).mode, 'direct-ess');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', setSignedPowerId: 'direct' }, { writableStorageCount: 1, directTargetAvailable: true }).mode, 'hybrid-auto');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', setSignedPowerId: 'direct' }, { writableStorageCount: 2, otherWritableStorageCount: 1, directTargetAvailable: true }).mode, 'direct-ess');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto' }, { writableStorageCount: 1 }).mode, 'invalid');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'fems-grid', feneconGridSetpointId: 'x' }, { writableStorageCount: 2, otherWritableStorageCount: 1 }).mode, 'invalid');

  const calc = calculateFemsGridTargetW({ nvpW: 2000, essActualW: -3000, batteryTargetW: -1050 });
  assert.deepEqual({ ok: calc.ok, gridTargetW: calc.gridTargetW }, { ok: true, gridTargetW: 50 });

  const dayAuthority = resolveHybridAuthority({ feneconPvPassthroughThresholdW: 200, feneconPvReleaseThresholdW: 50, feneconPvReleaseDelaySec: 120 }, { nowMs: 100000, pvW: 4600, pvFresh: true, previousAuthority: 'unknown' });
  assert.equal(dayAuthority.authority, 'fems');
  assert.equal(dayAuthority.noWrite, true);
  const unknownAuthority = resolveHybridAuthority({}, { nowMs: 100000, pvW: null, pvFresh: false, previousAuthority: 'nexowatt' });
  assert.equal(unknownAuthority.authority, 'fems', 'unknown PV must fail safe to FEMS authority');
  const releasePending = resolveHybridAuthority({ feneconPvReleaseThresholdW: 50, feneconPvReleaseDelaySec: 120 }, { nowMs: 200000, pvW: 0, pvFresh: true, previousAuthority: 'fems', pvBelowSinceMs: 150000 });
  assert.equal(releasePending.authority, 'fems');
  assert.equal(releasePending.noWrite, true);
  const nightAuthority = resolveHybridAuthority({ feneconPvReleaseThresholdW: 50, feneconPvReleaseDelaySec: 120 }, { nowMs: 300000, pvW: 0, pvFresh: true, previousAuthority: 'fems', pvBelowSinceMs: 150000 });
  assert.equal(nightAuthority.authority, 'nexowatt');
  assert.equal(nightAuthority.noWrite, false);

  const singleFarm = validateFarmRows([{ enabled: true, name: 'FENECON Hybrid', vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', setSignedPowerId: 'fems.direct' }]);
  assert.equal(singleFarm.ok, true);
  assert.equal(singleFarm.nativeMasterCount, 0);
  assert.equal(singleFarm.hybridAutoCount, 1);
  assert.equal(singleFarm.resolved[0].mode, 'hybrid-auto');

  const mixedAuto = validateFarmRows([
    { enabled: true, name: 'FENECON Hybrid', vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', feneconGridSetpointId: 'fems.grid', setSignedPowerId: 'fems.direct' },
    { enabled: true, name: 'Other storage', vendorProfile: 'generic', coupling: 'ac', setSignedPowerId: 'other.direct' },
  ]);
  assert.equal(mixedAuto.ok, true);
  assert.equal(mixedAuto.nativeMasterCount, 0);
  assert.equal(mixedAuto.resolved.find((row) => row.name === 'FENECON Hybrid').mode, 'direct-ess');

  const invalidMixed = validateFarmRows([
    { enabled: true, name: 'FENECON Hybrid', vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'fems-grid', feneconGridSetpointId: 'fems.grid', setSignedPowerId: 'fems.direct' },
    { enabled: true, name: 'Other storage', vendorProfile: 'generic', coupling: 'ac', setSignedPowerId: 'other.direct' },
  ]);
  assert.equal(invalidMixed.ok, false);
  assert.match(invalidMixed.reason, /exclusive|master|mixed/i);

  await testSingleNative();
  await testAcRemainsDirect();
  await testNativeClampAndAcceptedTarget();
  await testFarmHybridAutoDayNight();

  const mainTs = require('node:fs').readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/main.ts'), 'utf8');
  assert.match(mainTs, /nwValidateFeneconFarmRows\(sf\.storages\)/);
  assert.match(mainTs, /hybridAutoFeneconRows/);
  assert.match(mainTs, /fenecon-day-no-write/);
  assert.match(mainTs, /not-required-fems-authority/);
  assert.match(mainTs, /fenecon-handover-wait/);
  assert.match(mainTs, /native-fems-watchdog-active/);
  assert.match(mainTs, /commandFamily:\s*'fenecon-fems-grid'/);

  console.log('[fenecon-hybrid-controller] OK: AUTO delegates FENECON Hybrid to FEMS during actual/unknown PV, resumes direct ESS at night, keeps mixed farms direct and preserves explicit legacy FEMS-NVP control.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
