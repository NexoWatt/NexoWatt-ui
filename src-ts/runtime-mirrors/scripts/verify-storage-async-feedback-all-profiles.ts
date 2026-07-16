// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-async-feedback-all-profiles.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-async-feedback-all-profiles.js
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
 * Original-Hash: caf6bedace950f1e7c8cd50ad4cdf1451b3791ec4c6bc6cf393d39d6a1619f3b
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
 * Regression 0.8.95: Herstellerunabhaengiger Speicher-Istwert-Puffer.
 *
 * Reale Speicher melden NVP und Batterie-Istleistung oft asynchron. Der Test
 * bildet deshalb einen 20 Sekunden alten Batterie-Istwert bei sekundenaktuellem
 * NVP ab und prueft, dass die Sollleistung nicht zwischen wenigen hundert Watt
 * und mehreren Kilowatt springt.
 *
 * Abgedeckte Schreibpfade:
 * - Generic signed Sollwert
 * - Generic getrennte Lade-/Entlade-Sollwerte
 * - Sungrow Hybrid ESS
 * - E3/DC RSCP SET_POWER_MODE/SET_POWER_VALUE
 * - Speicherfarm-Verteilung
 *
 * Sicherheitsfall:
 * Ohne jemals vorhandenen echten Batterie-Istwert darf ein alter extremer
 * Sollwert weiterhin nicht hochintegriert werden.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

/**
 * Code-Teil: nowMs
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nowMs() { return Date.now(); }

/**
 * Code-Teil: MutableDp
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class MutableDp {
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }

  getEntry(key) { return this.entries[key] || null; }

  getAgeMs(key) {
    const rec = this.entries[key];
    if (!rec || typeof rec.ts !== 'number') return null;
    return Math.max(0, nowMs() - rec.ts);
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
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }

  setValue(key, value, { keepTimestamp = false } = {}) {
    const rec = this.entries[key] || { objectId: `test.${key}` };
    rec.val = value;
    if (!keepTimestamp || typeof rec.ts !== 'number') rec.ts = nowMs();
    this.entries[key] = rec;
  }

  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value), ts: nowMs() });
    return true;
  }

  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value, ts: nowMs() });
    return true;
  }

  lastWrite(key) {
    const list = this.writes.filter((w) => w.key === key);
    return list.length ? list[list.length - 1].value : null;
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
function entry(value, objectId, ageMs = 0) {
  return {
    val: value,
    objectId,
    ts: nowMs() - Math.max(0, Number(ageMs) || 0),
  };
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
function makeAdapter({ profile = 'generic', farm = false } = {}) {
  const states = new Map();
  const farmWrites = [];
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: farm,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storageFarm: farm ? {
        // Eine Speicherfarm ist fachlich erst ab zwei realen Speicherzeilen aktiv.
        // Der Regressionstest bildet deshalb zwei steuerbare Speicher ab, auch wenn
        // die aggregierte Istleistung zentral über storageFarm.totalPowerW kommt.
        storages: [
          { enabled: true, setSignedPowerId: 'farm.storage.1.setPowerW' },
          { enabled: true, setSignedPowerId: 'farm.storage.2.setPowerW' },
        ],
      } : {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile: profile,
        staleTimeoutSec: 15,
        balanceFeedbackHoldSec: 45,
        balanceFeedbackPredictionSteps: 4,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 500,
        stepW: 1,
        pvEnabled: false,
        selfDischargeEnabled: true,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        maxChargeW: 30000,
        maxDischargeW: 30000,
        sungrowPvThresholdW: 300,
        sungrowLoadCoverReserveW: 300,
        sungrowTargetGridImportW: 50,
        sungrowImportThresholdW: 50,
        sungrowAssistBufferW: 150,
        e3dcZeroMode: 'normal',
      },
    },
    stateCache: {
      'derived.core.pv.totalW': { value: 0, ts: nowMs() },
      'derived.core.building.loadTotalW': { value: 10000, ts: nowMs() },
    },
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) { states.set(id, { val: value, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    async applyStorageFarmTargetW(value, meta) {
      farmWrites.push({ value: Number(value), meta, ts: nowMs() });
      return { applied: true, reason: 'test-farm' };
    },
    _states: states,
    _farmWrites: farmWrites,
  };

  if (farm) {
    const oldTs = nowMs() - 20000;
    states.set('storageFarm.storagesOnline', { val: 2, ts: nowMs() });
    states.set('storageFarm.storagesDispatchAvailable', { val: 2, ts: nowMs() });
    states.set('storageFarm.totalSocOnline', { val: 80, ts: nowMs() });
    states.set('storageFarm.totalChargePowerW', { val: 0, ts: oldTs });
    states.set('storageFarm.totalDischargePowerW', { val: 8400, ts: oldTs });
  }

  return adapter;
}

/**
 * Code-Teil: makeDp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function makeDp({ targetMode = 'signed', profile = 'generic', includeActual = true } = {}) {
  const entries = {
    'grid.powerW': entry(1800, 'grid.filtered'),
    'grid.powerRawW': entry(1800, 'grid.raw'),
    'st.socPct': entry(80, 'battery.soc'),
  };
  if (includeActual) entries['st.batteryPowerW'] = entry(8400, 'battery.actualPower', 20000);

  if (targetMode === 'signed') {
    entries['st.targetPowerW'] = entry(0, 'battery.targetPowerW');
  } else if (targetMode === 'split') {
    entries['st.targetChargePowerW'] = entry(0, 'battery.chargePowerW');
    entries['st.targetDischargePowerW'] = entry(0, 'battery.dischargePowerW');
    entries['st.run'] = entry(false, 'battery.run');
  } else if (targetMode === 'e3dc') {
    entries['st.e3dcSetPowerMode'] = entry(0, 'e3dc.0.EMS.SET_POWER_MODE');
    entries['st.e3dcSetPowerValueW'] = entry(0, 'e3dc.0.EMS.SET_POWER_VALUE');
  }

  // Sungrow uses split targets in the customer setup.
  if (profile === 'sungrow-hybrid' && targetMode !== 'split') {
    entries['st.targetChargePowerW'] = entry(0, 'sungrow.ctrl.chargePowerW');
    entries['st.targetDischargePowerW'] = entry(0, 'sungrow.ctrl.dischargePowerW');
    entries['st.run'] = entry(false, 'sungrow.ctrl.run');
  }

  return new MutableDp(entries);
}

/**
 * Code-Teil: getWrittenTarget
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function getWrittenTarget({ profile, targetMode, dp, adapter }) {
  if (adapter.config.enableStorageFarm) {
    const list = adapter._farmWrites;
    return list.length ? list[list.length - 1].value : null;
  }
  if (profile === 'e3dc-rscp') return dp.lastWrite('st.e3dcSetPowerValueW');
  if (targetMode === 'split' || profile === 'sungrow-hybrid') return dp.lastWrite('st.targetDischargePowerW');
  return dp.lastWrite('st.targetPowerW');
}

/**
 * Code-Teil: runPersistentDischargeProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runPersistentDischargeProfile({ name, profile = 'generic', targetMode = 'signed', farm = false }) {
  const adapter = makeAdapter({ profile, farm });
  const dp = makeDp({ targetMode, profile, includeActual: !farm });
  const mod = new SpeicherRegelungModule(adapter, dp);

  if (process.env.DEBUG_STORAGE_ASYNC === '1') {
    console.log(name, 'module refs', mod.adapter === adapter, mod.dp === dp, mod.adapter, mod.dp);
    console.log(name, 'entries', dp.getEntry('st.batteryPowerW'), dp.getEntry('st.targetPowerW'), dp.getEntry('st.targetChargePowerW'), dp.getEntry('st.targetDischargePowerW'));
  }

  await mod.tick();
  const first = getWrittenTarget({ profile, targetMode, dp, adapter });
  if (process.env.DEBUG_STORAGE_ASYNC === '1') {
    console.log(name, 'first', first, Object.fromEntries([...adapter._states.entries()].filter(([k]) => k.includes('balance') || k.includes('batteryPower')).map(([k,v]) => [k, v.val])));
  }
  assert(first >= 8800 && first <= 9000, `${name}: erster Sollwert muss Ist 8,4 kW + begrenzte NVP-Korrektur sein: ${first}`);

  // Batterie-Istwert bleibt absichtlich 20 s alt. Nur der NVP wird aktualisiert.
  dp.setValue('grid.powerW', 300);
  dp.setValue('grid.powerRawW', 300);
  await mod.tick();
  const second = getWrittenTarget({ profile, targetMode, dp, adapter });
  assert(second >= 9000 && second <= 9300, `${name}: asynchroner Istwert darf Sollwert nicht auf 300 W abwerfen: ${second}`);

  dp.setValue('grid.powerW', 50);
  dp.setValue('grid.powerRawW', 50);
  await mod.tick();
  const held = getWrittenTarget({ profile, targetMode, dp, adapter });
  assert(held >= 9000, `${name}: im NVP-Zielband muss der aktive Nicht-Null-Sollwert gehalten werden: ${held}`);

  const modeState = adapter._states.get('speicher.regelung.batteryPowerFeedbackMode');
  assert(modeState && String(modeState.val).includes('battery-held'), `${name}: Diagnose muss gehaltenes Batterie-Feedback melden`);
  const predictedState = adapter._states.get('speicher.regelung.batteryPowerFeedbackPredicted');
  assert(predictedState && predictedState.val === true, `${name}: begrenzte Sollwertprognose muss nach dem ersten Tick aktiv sein`);

  if (profile === 'e3dc-rscp') {
    assert.strictEqual(dp.lastWrite('st.e3dcSetPowerMode'), 2, `${name}: E3/DC muss DISCHARGE-Modus schreiben`);
  }
  if (profile === 'sungrow-hybrid') {
    const writeMode = adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus');
    assert(writeMode && String(writeMode.val).includes('hold'), `${name}: Sungrow muss im Zielband einen Hold-Schreibmodus melden`);
  }
}

/**
 * Code-Teil: runChargeSequence
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runChargeSequence() {
  const adapter = makeAdapter({ profile: 'generic', farm: false });
  adapter.config.storage.pvEnabled = true;
  const dp = new MutableDp({
    'grid.powerW': entry(-2900, 'grid.filtered'),
    'grid.powerRawW': entry(-2900, 'grid.raw'),
    'st.socPct': entry(60, 'battery.soc'),
    'st.batteryPowerW': entry(-2900, 'battery.actualPower', 20000),
    'st.targetPowerW': entry(0, 'battery.targetPowerW'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);

  await mod.tick();
  const first = dp.lastWrite('st.targetPowerW');
  assert(first <= -3300 && first >= -3500, `Generic Laden: erster Sollwert muss laufende Ladung plus begrenzten Export enthalten: ${first}`);

  dp.setValue('grid.powerW', -300);
  dp.setValue('grid.powerRawW', -300);
  await mod.tick();
  const second = dp.lastWrite('st.targetPowerW');
  assert(second <= -3600 && second >= -3900, `Generic Laden: asynchroner Istwert darf nicht auf -300 W abfallen: ${second}`);

  dp.setValue('grid.powerW', 50);
  dp.setValue('grid.powerRawW', 50);
  await mod.tick();
  const held = dp.lastWrite('st.targetPowerW');
  assert(held <= -3600, `Generic Laden: im Zielband muss die laufende Beladung gehalten werden: ${held}`);
}

/**
 * Code-Teil: runNoFeedbackSafety
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runNoFeedbackSafety() {
  const adapter = makeAdapter({ profile: 'generic', farm: false });
  const dp = makeDp({ targetMode: 'signed', profile: 'generic', includeActual: false });
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = 71600;
  mod._lastTargetWriteMs = nowMs();
  mod._lastSource = 'eigenverbrauch';

  dp.setValue('grid.powerW', 2600);
  dp.setValue('grid.powerRawW', 2600);
  await mod.tick();
  const target = dp.lastWrite('st.targetPowerW');
  assert(target >= 2500 && target <= 2800, `Ohne echten Istwert darf alter 71,6-kW-Sollwert nicht integriert werden: ${target}`);
  const feedback = adapter._states.get('speicher.regelung.batteryPowerBalanceTrusted');
  assert(feedback && feedback.val === false, 'Ohne Batterie-Istwert muss der Feedback-Puffer inaktiv bleiben');
}

(async () => {
  await runPersistentDischargeProfile({ name: 'Generic signed', profile: 'generic', targetMode: 'signed' });
  await runPersistentDischargeProfile({ name: 'Generic split', profile: 'generic', targetMode: 'split' });
  await runPersistentDischargeProfile({ name: 'Sungrow Hybrid', profile: 'sungrow-hybrid', targetMode: 'split' });
  await runPersistentDischargeProfile({ name: 'E3/DC RSCP', profile: 'e3dc-rscp', targetMode: 'e3dc' });
  await runPersistentDischargeProfile({ name: 'Speicherfarm', profile: 'generic', targetMode: 'signed', farm: true });
  await runChargeSequence();
  await runNoFeedbackSafety();

  console.log('[storage-async-feedback-all-profiles] OK: Asynchrone Batterie-/NVP-Telemetrie bleibt bei signed, split, Sungrow, E3/DC und Speicherfarm stabil; ohne echten Istwert bleibt der Hochintegrationsschutz aktiv.');
})().catch((err) => {
  console.error('[storage-async-feedback-all-profiles] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
