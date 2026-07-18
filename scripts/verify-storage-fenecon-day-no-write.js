#!/usr/bin/env node
'use strict';
/**
 * Runtime-Regression 0.8.124: FENECON/OpenEMS/FEMS AppCenter-Keepalive.
 *
 * Zweck:
 * - Ein manuell im AppCenter zugeordneter Speicher-Sollwert darf durch das
 *   FENECON-Herstellerprofil niemals auf No-Write gesetzt werden.
 * - Der nach NVP-, SoC-, Budget-, MultiUse- und Sicherheitsgates begrenzte
 *   Sollwert muss auch im Tages-/PV-Betrieb zyklisch geschrieben werden.
 * - Der optionale Assist bleibt hart am aktuellen NVP-Bedarf begrenzt.
 * - Bei fehlendem NVP wird ein sicherer 0-W-Sollwert geschrieben, nicht der
 *   externe Geräte-Watchdog absichtlich auslaufen gelassen.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

function nowMs() { return Date.now(); }

class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  _rec(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this._rec(key);
    if (!rec || typeof rec.ts !== 'number') return null;
    return Math.max(0, nowMs() - rec.ts);
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this._rec(key);
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this._rec(key);
    if (!rec) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this._rec(key);
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
  writesFor(key = 'st.targetPowerW') {
    return this.writes.filter(w => w.key === key);
  }
  lastWrite(key = 'st.targetPowerW') {
    const matches = this.writesFor(key);
    return matches.length ? matches[matches.length - 1].value : null;
  }
}

function makeEntry(val, objectId) {
  return { val, ts: nowMs(), objectId: objectId || `test.${Math.random().toString(36).slice(2)}` };
}

function makeAdapter(extraConfig = {}) {
  const states = new Map();
  const farmWrites = [];
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storageFarm: extraConfig.storageFarm || {},
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 1500,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        feneconGridControlEnabled: true,
        feneconDayNoWriteEnabled: true,
        feneconDayClockFallbackEnabled: true,
        feneconDayStartHour: 0,
        feneconDayEndHour: 24,
        ...(extraConfig.storage || {}),
      },
      ...(extraConfig.root || {}),
    },
    stateCache: extraConfig.stateCache || {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    async applyStorageFarmTargetW(w, meta = {}) {
      farmWrites.push({ w: Number(w), meta });
      return { applied: true, direction: w > 0 ? 'discharge' : (w < 0 ? 'charge' : 'idle'), targetW: Number(w), deliveredW: Number(w), unservedW: 0, results: [] };
    },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache && this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    _states: states,
    _farmWrites: farmWrites,
  };
}

async function runTick({ gridW, gridRawW = gridW, soc = 77, battPowerW = null, lastTargetW = null, lastSource = '', extraConfig = {} }) {
  const entries = {
    'grid.powerW': makeEntry(gridW, 'grid.filtered'),
    'grid.powerRawW': makeEntry(gridRawW, 'grid.raw'),
    'st.socPct': makeEntry(soc, 'battery.soc'),
    'st.targetPowerW': { objectId: 'battery.target', ts: nowMs(), val: 0 },
  };
  if (battPowerW !== null) entries['st.batteryPowerW'] = makeEntry(battPowerW, 'battery.actualPower');
  const dp = new FakeDp(entries);
  const adapter = makeAdapter(extraConfig);
  const mod = new SpeicherRegelungModule(adapter, dp);
  if (lastTargetW !== null) mod._lastTargetW = lastTargetW;
  mod._lastSource = lastSource;
  await mod.tick();
  return { targetW: dp.lastWrite(), dp, adapter, mod };
}

(async () => {
  // Selbst eine aus einer Altversion migrierte No-Write-Konfiguration darf den
  // manuell zugeordneten Ziel-DP nicht mehr abkoppeln.
  const legacyNoWrite = await runTick({
    gridW: 650,
    gridRawW: 650,
    extraConfig: { storage: { feneconAssistEnabled: false, feneconDayNoWriteEnabled: true } },
  });
  assert.strictEqual(legacyNoWrite.dp.writesFor('st.targetPowerW').length, 1, `FENECON muss den AppCenter-Ziel-DP schreiben: ${JSON.stringify(legacyNoWrite.dp.writes)}`);
  assert.notStrictEqual(legacyNoWrite.adapter._states.get('speicher.regelung.feneconHybridSchreibmodus').val, 'no-write', 'FENECON-Schreibmodus darf nicht mehr no-write sein');
  assert.strictEqual(legacyNoWrite.adapter._states.get('speicher.regelung.schreibOk').val, true, 'Der gegatete FENECON-Schreibpfad muss erfolgreich sein');
  assert(!String(legacyNoWrite.adapter._states.get('speicher.regelung.schreibStatus').val).includes('no-write'), 'Schreibstatus darf keinen FENECON-No-Write melden');

  // Ein unveränderter 0-W-Sollwert wird in jedem Tick erneut geschrieben. Das ist
  // der Watchdog-Keepalive, der in der realen Anlage als frische externe Vorgabe
  // sichtbar sein muss.
  const keepalive = await runTick({
    gridW: 50,
    gridRawW: 50,
    extraConfig: { storage: { feneconAssistEnabled: false, feneconDayNoWriteEnabled: true } },
  });
  await keepalive.mod.tick();
  assert.strictEqual(keepalive.dp.writesFor('st.targetPowerW').length, 2, `Unveränderter FENECON-Sollwert muss pro Tick erneuert werden: ${JSON.stringify(keepalive.dp.writes)}`);
  assert.strictEqual(keepalive.dp.writesFor('st.targetPowerW')[0].value, 0, 'Erster Keepalive muss 0 W schreiben');
  assert.strictEqual(keepalive.dp.writesFor('st.targetPowerW')[1].value, 0, 'Zweiter Keepalive muss 0 W erneut schreiben');

  // Auch die Speicherfarm muss den zentral gegateten Sollwert erhalten; der
  // Herstellerpfad darf die Farm-Verteilung nicht mehr unterdrücken.
  const farmWrite = await runTick({
    gridW: 900,
    gridRawW: 900,
    extraConfig: {
      root: { enableStorageFarm: true },
      storageFarm: {
        storages: [
          { enabled: true, setSignedPowerId: 'vendor.free.target.1' },
          { enabled: true, setSignedPowerId: 'another.adapter.target.2' },
        ],
      },
      storage: { feneconAssistEnabled: false, feneconDayNoWriteEnabled: true },
    },
  });
  assert.strictEqual(farmWrite.adapter._farmWrites.length, 1, `FENECON muss genau einen gegateten Farm-Sollwert verteilen: ${JSON.stringify(farmWrite.adapter._farmWrites)}`);

  // Assist mit 0s Testverzögerung: Bei dauerhaftem Netzbezug darf NexoWatt
  // schreiben, aber nur NVP-begrenzt.
  const assist = await runTick({
    gridW: 1700,
    gridRawW: 1700,
    extraConfig: {
      storage: {
        feneconAssistEnabled: true,
        feneconAssistDelaySec: 0,
        feneconAssistImportThresholdW: 500,
        feneconAssistTargetGridImportW: 50,
        feneconAssistBufferW: 150,
      },
    },
  });
  assert(assist.targetW > 0, `FENECON-Assist sollte bei dauerhaftem Netzbezug eine Entladung schreiben: ${assist.targetW}`);
  assert(assist.targetW <= 1800, `FENECON-Assist darf nur am NVP-Bedarf begrenzt schreiben: ${assist.targetW}`);
  assert.strictEqual(assist.adapter._states.get('speicher.regelung.feneconHybridAssistAktiv').val, true, 'Assist-Diagnose muss aktiv sein');
  assert.strictEqual(assist.adapter._states.get('speicher.regelung.feneconHybridSchreibmodus').val, 'write-assist-on-demand', 'Assist muss als bedarfsgerechter Schreibmodus markiert sein');

  const farmAssist = await runTick({
    gridW: 1700,
    gridRawW: 1700,
    extraConfig: {
      root: { enableStorageFarm: true },
      storageFarm: {
        storages: [
          { enabled: true, setSignedPowerId: 'vendor.free.target.1' },
          { enabled: true, setSignedPowerId: 'another.adapter.target.2' },
        ],
      },
      storage: {
        feneconAssistEnabled: true,
        feneconAssistDelaySec: 0,
        feneconAssistImportThresholdW: 500,
        feneconAssistTargetGridImportW: 50,
        feneconAssistBufferW: 150,
      },
    },
  });
  assert.strictEqual(farmAssist.adapter._farmWrites.length, 1, 'FENECON-Assist muss bei Speicherfarm genau einen Farm-Sollwert verteilen');
  assert(farmAssist.adapter._farmWrites[0].w > 0 && farmAssist.adapter._farmWrites[0].w <= 1800, `Farm-Assist muss NVP-begrenzt bleiben: ${JSON.stringify(farmAssist.adapter._farmWrites)}`);

  // Fehlender/veralteter NVP ist ein Sicherheitsfall: Der zugeordnete Ziel-DP
  // bekommt einen echten 0-W-Stopp und bleibt nicht unbeschrieben.
  const noGrid = await runTick({
    gridW: undefined,
    gridRawW: undefined,
    extraConfig: { storage: { feneconAssistEnabled: false, feneconDayNoWriteEnabled: true } },
  });
  assert.strictEqual(noGrid.dp.lastWrite('st.targetPowerW'), 0, `Fehlender NVP muss 0 W auf den AppCenter-Ziel-DP schreiben: ${JSON.stringify(noGrid.dp.writes)}`);
  assert.strictEqual(noGrid.adapter._states.get('speicher.regelung.feneconHybridSchreibmodus').val, 'write-safety-zero', 'Fehlender NVP muss als sicherer Schreibstopp diagnostiziert werden');

  console.log('[storage-fenecon-day-no-write] OK: FENECON-AppCenter-Sollwert bleibt gegatet, wird pro Tick erneuert und schreibt bei fehlendem NVP sicher 0 W.');
})().catch((err) => {
  console.error('[storage-fenecon-day-no-write] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
