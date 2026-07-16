// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-storage-policy-default-self-consumption.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-evcs-storage-policy-default-self-consumption.js
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
 * Original-Hash: 7cde443bca0c39313969b0324dbbe024e71c4684b78d26fea7520bb1d77a99fb
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

/**
 * Code-Teil: nowMs
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const nowMs = () => Date.now();
/**
 * Code-Teil: entry
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const entry = (val, objectId) => ({ val, ts: nowMs(), objectId });

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

/**
 * Code-Teil: runStorageTick
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runStorageTick({ runtimePolicy, stateProtectedLoadW = null }) {
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
  assert.strictEqual(protectTick.targetW, 0, `explicit protect must leave EVCS load on the grid, got ${protectTick.targetW} W`);
  assert.strictEqual(protectTick.protectedLoadW, 4100, 'explicit protect load must reach storage control');

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
  assert.strictEqual(stateFallbackProtect.targetW, 0, 'state fallback must preserve explicit protection for old runtimes');
  assert.strictEqual(stateFallbackProtect.source, 'state-fallback', 'fallback source diagnostic missing');

  console.log('[evcs-storage-policy-default-self-consumption] OK: normal, protect, assist and same-cycle stale-state handling are verified through the real storage tick.');
})().catch((err) => {
  console.error('[evcs-storage-policy-default-self-consumption] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
