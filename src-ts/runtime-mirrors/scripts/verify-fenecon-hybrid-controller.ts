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
 * Original-Hash: 04aa4eafd59cac44fef736084d50975daaa0743471c87bb673e9ee8d3f7135bf
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
const {
  isFeneconHybrid,
  resolveControlMode,
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

(async () => {
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'dc' }), true);
  assert.equal(isFeneconHybrid({ vendorProfile: 'fenecon-openems', coupling: 'ac' }), false);
  assert.equal(resolveControlMode({ vendorProfile: 'sungrow-hybrid', coupling: 'dc', feneconControlMode: 'auto', feneconGridSetpointId: 'x' }).mode, 'direct-ess');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'ac', feneconControlMode: 'auto', feneconGridSetpointId: 'x' }).mode, 'direct-ess');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', feneconGridSetpointId: 'x' }, { writableStorageCount: 1 }).mode, 'fems-grid');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', feneconGridSetpointId: 'x' }, { writableStorageCount: 2, otherWritableStorageCount: 1 }).mode, 'direct-ess');
  assert.equal(resolveControlMode({ vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'fems-grid', feneconGridSetpointId: 'x' }, { writableStorageCount: 2, otherWritableStorageCount: 1 }).mode, 'invalid');

  const calc = calculateFemsGridTargetW({ nvpW: 2000, essActualW: -3000, batteryTargetW: -1050 });
  assert.deepEqual({ ok: calc.ok, gridTargetW: calc.gridTargetW }, { ok: true, gridTargetW: 50 });

  const singleFarm = validateFarmRows([{ enabled: true, name: 'FENECON Hybrid', vendorProfile: 'fenecon-openems', coupling: 'dc', feneconControlMode: 'auto', feneconGridSetpointId: 'fems.grid' }]);
  assert.equal(singleFarm.ok, true);
  assert.equal(singleFarm.nativeMasterCount, 1);

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

  const mainTs = require('node:fs').readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/main.ts'), 'utf8');
  assert.match(mainTs, /nwValidateFeneconFarmRows\(sf\.storages\)/);
  assert.match(mainTs, /fenecon-handover-wait/);
  assert.match(mainTs, /native-fems-watchdog-active/);
  assert.match(mainTs, /commandFamily:\s*'fenecon-fems-grid'/);

  console.log('[fenecon-hybrid-controller] OK: native FEMS control is DC/hybrid-only, exclusive, translated from final EOS policy, clamped correctly and safely handed over.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
