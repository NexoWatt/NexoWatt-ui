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

function makeAdapter({ runtimePolicy, stateProtectedLoadW = null, storagePatch = {} } = {}) {
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
        ...storagePatch,
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

async function runStorageTick({
  runtimePolicy,
  stateProtectedLoadW = null,
  lastTargetW = 0,
  lastSource = 'eigenverbrauch',
  gridW = 4200,
  battPowerW = null,
  socPct = 80,
  storagePatch = {},
}) {
  // 4,2 kW Bezug entsprechen im Basisszenario praktisch einer laufenden Wallbox.
  // Fuer Baustein 7 koennen NVP und Speicher-Istleistung explizit gesetzt werden.
  const entries = {
    'grid.powerW': entry(gridW, 'grid.filtered'),
    'grid.powerRawW': entry(gridW, 'grid.raw'),
    'st.socPct': entry(socPct, 'battery.soc'),
    'st.targetPowerW': entry(0, 'battery.target'),
  };
  if (battPowerW !== null && battPowerW !== undefined) {
    entries['st.batteryPowerW'] = entry(battPowerW, 'battery.actualPower');
  }
  const dp = new FakeDp(entries);
  const adapter = makeAdapter({ runtimePolicy, stateProtectedLoadW, storagePatch });
  const module = new SpeicherRegelungModule(adapter, dp);
  module._lastTargetW = lastTargetW;
  module._lastSource = lastSource;
  await module.tick();
  return {
    targetW: dp.lastWrite(),
    source: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzQuelle')?.val,
    protectedLoadW: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzLastW')?.val,
    protectionAction: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzAktion')?.val,
    protectionJson: adapter._testStates.get('speicher.regelung.evcsSpeicherSchutzJson')?.val,
    zeroAction: adapter._testStates.get('speicher.regelung.zeroWriteFirewallAction')?.val,
    zeroExplicitStop: adapter._testStates.get('speicher.regelung.zeroWriteFirewallExplicitStop')?.val,
  };
}

(async () => {
  const normalTick = await runStorageTick({
    battPowerW: 0,
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
    battPowerW: 4100,
    gridW: 50,
  });
  assert.strictEqual(protectActiveTick.targetW, 0, 'explicit protect must stop a previously active discharge with one real 0-W command');


  // Baustein 7 / Kundenfall 20.07.2026: Die Wallbox ist geschuetzt, am NVP
  // besteht Netzbezug und der Speicher laedt noch aus einem alten Befehl. Ohne
  // echten Gesamtueberschuss muss ein ausdruecklicher 0-W-Stop geschrieben werden.
  const customerStop = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3580,
      protectedWallboxes: 4,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-global-protect',
    },
    gridW: 3200,
    battPowerW: -2300,
    lastTargetW: -1869,
    lastSource: 'pv',
  });
  assert.strictEqual(customerStop.targetW, 0, `Kundenfall muss laufende Netzladung stoppen, got ${customerStop.targetW} W`);
  assert(String(customerStop.protectionAction || '').includes('stop') && String(customerStop.protectionAction || '').includes('charge'), `Kundenfall braucht eindeutigen Lade-Stop, action=${customerStop.protectionAction}`);
  assert.strictEqual(customerStop.zeroExplicitStop, true, '0-W-Firewall muss den Schutzstop als explizit erkennen');
  assert(String(customerStop.zeroAction || '').includes('write'), `0-W-Stop muss geschrieben werden, action=${customerStop.zeroAction}`);

  // Der Hausverbrauch darf weiterhin durch den Speicher gedeckt werden; die
  // geschuetzte EVCS-Leistung bleibt dagegen am NVP sichtbar.
  const houseStart = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: 5000,
    battPowerW: 0,
  });
  assert.strictEqual(houseStart.targetW, 1950, `Hausdefizit ohne EVCS muss 1950 W Entladung ergeben, got ${houseStart.targetW}`);

  const houseStable = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: 3050,
    battPowerW: 1950,
    lastTargetW: 1950,
  });
  assert.strictEqual(houseStable.targetW, 1950, `laufender Hausausgleich darf nicht auf 0 W pulsen, got ${houseStable.targetW}`);

  // Laden ist nur bei realem Gesamtexport zulaessig und bleibt im NVP-Zielband stabil.
  const realSurplus = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: -400,
    battPowerW: 0,
    lastSource: 'pv',
  });
  assert.strictEqual(realSurplus.targetW, -450, `realer Export muss ca. 450 W Ladung erlauben, got ${realSurplus.targetW}`);

  const chargeStable = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3000,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: 50,
    battPowerW: -450,
    lastTargetW: -450,
    lastSource: 'pv',
  });
  assert.strictEqual(chargeStable.targetW, -450, `laufende PV-Ueberschussladung muss im Zielband stabil bleiben, got ${chargeStable.targetW}`);

  // PV deckt Haus und EVCS bereits; ein noch laufender Entladebefehl darf
  // nicht weiter Export erzeugen, nur weil die normale Regelung bereits einen
  // (hier nicht erlaubten) Ladewechsel anfordern wuerde.
  const stopOldDischarge = await runStorageTick({
    runtimePolicy: {
      protectedLoadW: 3580,
      protectedWallboxes: 1,
      assistRequestedLoadW: 0,
      source: 'charging-runtime-protect',
    },
    gridW: -2250,
    battPowerW: 2300,
    lastTargetW: 2300,
    lastSource: 'eigenverbrauch',
  });
  assert.strictEqual(stopOldDischarge.targetW, 0, `ueberfluessige Entladung muss mit 0 W gestoppt werden, got ${stopOldDischarge.targetW}`);
  assert.strictEqual(stopOldDischarge.zeroExplicitStop, true, 'Entlade-Stop muss die 0-W-Firewall passieren');

  const assistTick = await runStorageTick({
    battPowerW: 0,
    runtimePolicy: {
      protectedLoadW: 0,
      protectedWallboxes: 0,
      assistRequestedLoadW: 4100,
      source: 'charging-runtime',
    },
  });
  assert(assistTick.targetW >= 4000, `assist mode must not protect EVCS load from normal discharge, got ${assistTick.targetW} W`);

  const staleStateIgnored = await runStorageTick({
    battPowerW: 0,
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

  const stateFallbackActiveProtect = await runStorageTick({
    stateProtectedLoadW: 4100,
    lastTargetW: 4100,
    battPowerW: 4100,
    gridW: 50,
  });
  assert.strictEqual(stateFallbackActiveProtect.targetW, 0, 'state fallback must stop an actually active discharge for old runtimes');

  console.log('[evcs-storage-policy-default-self-consumption] OK: normal/protect/assist plus asymmetrischer Hauslast-, Ueberschuss- und 0-W-Schutzstop sind durch den realen Speicher-Tick verifiziert.');
})().catch((err) => {
  console.error('[evcs-storage-policy-default-self-consumption] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
