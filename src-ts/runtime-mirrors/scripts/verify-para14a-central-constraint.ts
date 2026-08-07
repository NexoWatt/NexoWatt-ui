// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-para14a-central-constraint.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-para14a-central-constraint.js
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
 * Original-Hash: 45a259939c1fa32ef0f8c889abce31474dea0d68954df26207768ca4e0252605
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
 * Regression 0.8.118: §14a arbeitet als zentraler Constraint.
 * Fachmodule bleiben alleinige Hardware-Schreiber; Legacy-Direktwrites sind opt-in.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  resolvePara14aSignal,
  buildPara14aConstraintSnapshot,
} = require('../lib/ts-mirrors/ems/para14a/para14a-constraint');
const { computeCentralBudgetGrant } = require('../ems/modules/core-limits');
const { Para14aModule } = require('../ems/modules/para14a');

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
  constructor() {
    this.entries = new Map();
    this.values = new Map();
    this.writes = [];
  }
  async upsert(entry) { this.entries.set(entry.key, { ...entry }); }
  getEntry(key) { return this.entries.get(key) || null; }
  setValue(key, value, ageMs = 0) { this.values.set(key, { value, ts: Date.now() - ageMs }); }
  getRaw(key, fallback = null) { return this.values.has(key) ? this.values.get(key).value : fallback; }
  getAgeMs(key) { return this.values.has(key) ? Math.max(0, Date.now() - this.values.get(key).ts) : null; }
  getNumberFresh(key, maxAgeMs, fallback = null) {
    const age = this.getAgeMs(key);
    const value = this.getRaw(key, fallback);
    const number = Number(value);
    return age !== null && age <= maxAgeMs && Number.isFinite(number) ? number : fallback;
  }
  async writeNumber(key, value) { this.writes.push({ key, value: Number(value) }); return true; }
  async writeBoolean(key, value) { this.writes.push({ key, value: !!value }); return true; }
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
function makeAdapter(installerConfig) {
  const states = new Map();
  return {
    config: { installerConfig },
    evcsList: [
      { key: 'lp1', setCurrentAId: 'wb.1.current', maxPowerW: 11040 },
      { key: 'lp2', setPowerWId: 'wb.2.power', maxPowerW: 11000 },
    ],
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(id, { val, ts: Date.now(), ack: true });
    },
    async getStateAsync(id) { return states.get(id) || null; },
    updateValue() {},
    _states: states,
  };
}

(async () => {
  // Signal safety: stale active signal stays active, stale inactive does not activate.
  const fresh = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: true, ageMs: 100, maxAgeMs: 30000, nowMs: 100000 });
  assert.strictEqual(fresh.active, true);
  assert.strictEqual(fresh.fresh, true);
  const staleHold = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: true, ageMs: 60000, maxAgeMs: 30000, lastFreshActive: true, lastFreshTs: 90000, nowMs: 100000 });
  assert.strictEqual(staleHold.active, true);
  assert.strictEqual(staleHold.reason, 'stale-hold-last-active');
  const staleActiveAfterRestart = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: true, ageMs: 60000, maxAgeMs: 30000, lastFreshActive: null, nowMs: 100000 });
  assert.strictEqual(staleActiveAfterRestart.active, true);
  assert.strictEqual(staleActiveAfterRestart.reason, 'stale-hold-active-value');
  const staleInactive = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: false, ageMs: 60000, maxAgeMs: 30000, lastFreshActive: false, nowMs: 100000 });
  assert.strictEqual(staleInactive.active, false);
  const staleForce = resolvePara14aSignal({ enabled: true, mapped: true, rawValue: false, ageMs: 60000, maxAgeMs: 30000, stalePolicy: 'force-active', nowMs: 100000 });
  assert.strictEqual(staleForce.active, true);

  // Constraint distribution: only configured categories get caps.
  const snapshot = buildPara14aConstraintSnapshot({
    active: true,
    mode: 'direct',
    minPerDeviceW: 4200,
    evcs: [{ safe: 'lp1', maxPowerW: 11040 }, { safe: 'lp2', maxPowerW: 11000 }],
    consumers: [
      { id: 'storage', type: 'storage', controlType: 'limitW', installedPowerW: 10000 },
      { id: 'hp', type: 'heatPump', controlType: 'limitW', installedPowerW: 9000 },
      { id: 'rod', type: 'heatingRod', controlType: 'limitW', installedPowerW: 6000 },
    ],
  });
  assert.strictEqual(snapshot.constraintOnly, true);
  assert.strictEqual(snapshot.evcsTotalCapW, 8400);
  assert(snapshot.appCapsW.storage > 0, 'Speicher-Ladecap fehlt');
  assert(snapshot.appCapsW.thermal > 0, 'Thermik-Cap fehlt');
  assert(snapshot.appCapsW.heatingRod > 0, 'Heizstab-Cap fehlt');
  assert.strictEqual(snapshot.appCapsW.airCondition, null, 'Nicht konfigurierte Kategorie darf kein 0-W-Cap erzeugen');

  // Central grants consume app-specific caps; unrelated apps remain uncapped by §14a.
  const runtime = {
    remainingTotalW: 20000,
    remainingPvW: 20000,
    gates: { para14a: { active: true, appCapsW: snapshot.appCapsW } },
  };
  const storageGrant = computeCentralBudgetGrant(runtime, { key: 'storage', app: 'storage', requestedW: 9000, pvOnly: true });
  assert.strictEqual(storageGrant.grantW, snapshot.appCapsW.storage);
  assert.strictEqual(storageGrant.para14aCapApplied, true);
  const heatingGrant = computeCentralBudgetGrant(runtime, { key: 'heatingRod', app: 'heatingRod', requestedW: 9000, pvOnly: true });
  assert.strictEqual(heatingGrant.grantW, snapshot.appCapsW.heatingRod);
  const unrelatedGrant = computeCentralBudgetGrant(runtime, { key: 'generator', app: 'generator', requestedW: 9000, pvOnly: false });
  assert.strictEqual(unrelatedGrant.grantW, 9000);
  assert.strictEqual(unrelatedGrant.para14aCapApplied, false);

  // Runtime module publishes constraints and does not write hardware by default.
  const installerConfig = {
    para14a: true,
    para14aMode: 'direct',
    para14aMinPerDeviceW: 4200,
    para14aActiveId: 'grid.operator.active',
    para14aSignalMaxAgeSec: 30,
    para14aStalePolicy: 'hold-active',
    para14aLegacyDirectWritesEnabled: false,
    para14aConsumers: [
      { enabled: true, name: 'Speicher', type: 'storage', controlType: 'limitW', maxPowerW: 10000 },
      { enabled: true, name: 'Wärmepumpe', type: 'heatPump', controlType: 'limitW', maxPowerW: 9000, setPowerWId: 'hp.limit' },
    ],
  };
  const dp = new FakeDp();
  const adapter = makeAdapter(installerConfig);
  const module = new Para14aModule(adapter, dp);
  await module.init();
  dp.setValue('p14a.active', true, 100);
  await module.tick();
  assert.strictEqual(adapter._para14a.active, true);
  assert.strictEqual(adapter._para14a.constraintOnly, true);
  assert.strictEqual(adapter._para14a.signalFresh, true);
  assert.strictEqual(dp.writes.length, 0, 'Constraint-only §14a darf keine Verbraucher-DPs schreiben');
  assert.strictEqual(adapter._states.get('para14a.consumers.w_rmepumpe.status').val, 'constraint-only');

  // Static guards: thermal/heating-rod no longer pause wholesale on §14a.
  const thermal = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/thermal-control.ts'), 'utf8');
  const rod = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/heating-rod-control.ts'), 'utf8');
  assert(!thermal.includes("paused_by_14a"), 'Thermik darf bei §14a nicht komplett pausieren');
  assert(!rod.includes("paused_by_14a"), 'Heizstab darf bei §14a nicht komplett pausieren');

  console.log('[para14a-central-constraint] OK: §14a ist ein frischer zentraler Constraint; Fachmodule bleiben Hardware-Schreiber.');
})().catch((error) => {
  console.error('[para14a-central-constraint] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
