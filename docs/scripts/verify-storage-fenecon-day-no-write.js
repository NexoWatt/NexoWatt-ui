#!/usr/bin/env node
'use strict';
/**
 * Runtime-Regression 0.8.82: FENECON/OpenEMS/FEMS Tages-No-Write.
 *
 * Zweck:
 * - Im FENECON-Tages-/PV-Betrieb darf NexoWatt keinen 0-W- oder Kleinsollwert
 *   permanent auf den Speicher schreiben. Nur so kann der FEMS/OpenEMS-Watchdog
 *   die externe Vorgabe auslaufen lassen und die interne 0-Einspeise-/Speicherlogik
 *   wieder selbst regeln.
 * - Der optionale NexoWatt-Assist darf erst bei dauerhaftem Netzbezug schreiben
 *   und muss hart am aktuellen NVP-Bedarf begrenzt bleiben. Die Gebäudelast darf
 *   dafür nicht blind als Entladesollwert verwendet werden.
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
  // Tages-/PV-Betrieb mit aktivem FENECON-No-Write und ohne Assist:
  // Trotz Netzbezug darf kein externer 0-W- oder Eigenverbrauchs-Sollwert geschrieben werden.
  const noWrite = await runTick({
    gridW: 650,
    gridRawW: 650,
    extraConfig: { storage: { feneconAssistEnabled: false } },
  });
  assert.strictEqual(noWrite.dp.writesFor('st.targetPowerW').length, 0, `FENECON-No-Write hat trotzdem auf den Ziel-DP geschrieben: ${JSON.stringify(noWrite.dp.writes)}`);
  assert.strictEqual(noWrite.adapter._states.get('speicher.regelung.feneconHybridSchreibmodus').val, 'no-write', 'FENECON-Schreibmodus muss no-write sein');
  assert.strictEqual(noWrite.adapter._states.get('speicher.regelung.schreibStatus').val, 'fenecon-fems:no-write', 'Schreibstatus muss No-Write diagnostizieren');

  // Auch mit aktiver Speicherfarm darf der FENECON-No-Write den Farm-Schreibpfad
  // nicht durch die Hintertuer mit 0 W oder Eigenverbrauchsleistung refreshen.
  const farmNoWrite = await runTick({
    gridW: 900,
    gridRawW: 900,
    extraConfig: {
      root: { enableStorageFarm: true },
      storageFarm: { storages: [{ enabled: true, setSignedPowerId: 'fenecon.target' }] },
      storage: { feneconAssistEnabled: false },
    },
  });
  assert.strictEqual(farmNoWrite.adapter._farmWrites.length, 0, `FENECON-No-Write darf auch bei Speicherfarm nicht verteilen: ${JSON.stringify(farmNoWrite.adapter._farmWrites)}`);

  // Assist mit 0s Testverzögerung für den Regressionstest:
  // Bei dauerhaftem Netzbezug darf NexoWatt schreiben, aber nur NVP-begrenzt.
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
  assert(assist.targetW > 0, `FENECON-Assist sollte bei dauerhaftem Netzbezug eine kleine Entladung schreiben: ${assist.targetW}`);
  assert(assist.targetW <= 1800, `FENECON-Assist darf nur am NVP-Bedarf begrenzt schreiben, nicht an Gebäudelast/alten Werten: ${assist.targetW}`);
  assert.strictEqual(assist.adapter._states.get('speicher.regelung.feneconHybridAssistAktiv').val, true, 'Assist-Diagnose muss aktiv sein');
  assert.strictEqual(assist.adapter._states.get('speicher.regelung.feneconHybridSchreibmodus').val, 'write-assist-on-demand', 'Assist muss als bedarfsgerechter Schreibmodus markiert sein');

  const farmAssist = await runTick({
    gridW: 1700,
    gridRawW: 1700,
    extraConfig: {
      root: { enableStorageFarm: true },
      storageFarm: { storages: [{ enabled: true, setSignedPowerId: 'fenecon.target' }] },
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

  // Ohne Tages-No-Write darf der FENECON-Sondermodus weiterhin wie eine normale
  // externe Regelung arbeiten. Damit ist der neue Haken wirklich steuernd und kein Zwang.
  const externalAllowed = await runTick({
    gridW: 650,
    gridRawW: 650,
    extraConfig: {
      storage: {
        feneconDayNoWriteEnabled: false,
        feneconAssistEnabled: false,
        feneconDayClockFallbackEnabled: false,
        feneconPvPassthroughThresholdW: 100000,
      },
    },
  });
  assert(externalAllowed.targetW !== null, 'Bei deaktiviertem Tages-No-Write muss der externe Standard-Schreibpfad weiter möglich sein');

  console.log('[storage-fenecon-day-no-write] OK: FENECON Tages-No-Write pausiert externe Vorgaben; Assist schreibt nur NVP-begrenzt.');
})().catch((err) => {
  console.error('[storage-fenecon-day-no-write] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
