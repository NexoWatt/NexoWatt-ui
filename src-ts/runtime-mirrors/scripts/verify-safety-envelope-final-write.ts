// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-safety-envelope-final-write.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-safety-envelope-final-write.js
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
 * Original-Hash: 928b1126cb09e35cb6f1999ead9988fd821a84eb5a0fda6c34507360b14bbefe
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
 * RC39 / 0.8.163 – fail-closed Sicherheitsvertrag.
 *
 * Prüft nicht nur die Planungsberechnung, sondern die letzte Freigabe direkt
 * vor dem Hardware-Write. Ein fehlender Anschlusswert, stale NVP-/Phasenwerte,
 * §14a-0 W, ein alter Regelplan oder ein gelatchter Writer-Fehler dürfen keinen
 * positiven Stellwert durchlassen.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  beginSafetyCycle,
  markSafetyModuleResult,
  buildSafetyEnvelope,
  liveSafetyEnvelope,
  invalidateSafetyEnvelope,
  evaluateFlexibleLoadRequest,
  evaluateSafetyCommandPermission,
  commitFlexibleLoadDecision,
} = require('../ems/services/safety-envelope');
const { ChargingManagementModule } = require('../ems/modules/charging-management');
const { buildPara14aConstraintSnapshot } = require('../lib/ts-mirrors/ems/para14a/para14a-constraint');

/**
 * Code-Teil: freshNvp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function freshNvp(netW, now = Date.now()) {
  return {
    ts: now,
    usable: true,
    fresh: true,
    connected: true,
    netW,
    status: 'ok',
    source: 'test-meter',
    reason: 'test-fresh',
    measurementAgeMs: 0,
    heartbeatAgeMs: 0,
  };
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
function makeDp(phases = {}) {
  const entries = new Map();
  const values = new Map();
  const ages = new Map();
  for (const [key, value] of Object.entries(phases)) {
    entries.set(key, { key, objectId: key });
    values.set(key, value);
    ages.set(key, 0);
  }
  return {
    entries,
    values,
    writes: [],
    getEntry(key) { return entries.get(key) || null; },
    getRaw(key, fallback = null) { return values.has(key) ? values.get(key) : fallback; },
    getMeasurementAgeMs(key) { return ages.has(key) ? ages.get(key) : null; },
    getAgeMs(key) { return ages.has(key) ? ages.get(key) : null; },
    getConnectionStatus(key) { return entries.has(key) ? true : null; },
    async writeNumber(key, value, ack) { this.writes.push({ key, value: Number(value), ack }); return true; },
    async writeBoolean(key, value, ack) { this.writes.push({ key, value: !!value, ack }); return true; },
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
function makeAdapter({
  gridConnectionPower = 10000,
  nvpW = 0,
  nvpTs = Date.now(),
  nvpUsable = true,
  para14a = false,
  paraRuntime = null,
  maxPhaseA = 0,
  generation = 1,
} = {}) {
  const adapter = {
    config: {
      installerConfig: {
        gridConnectionPower,
        para14a,
        gridPhaseCount: 3,
        safetyMeterTimeoutSec: 30,
      },
      peakShaving: { maxPhaseA },
      chargingManagement: { safetyEnvelopeMaxAgeSec: 5, nominalVoltageV: 230 },
    },
    _nvpFreshnessSnapshot: {
      ...freshNvp(nvpW, nvpTs),
      usable: nvpUsable,
      connected: nvpUsable,
      status: nvpUsable ? 'ok' : 'stale',
      reason: nvpUsable ? 'test-fresh' : 'test-unusable',
    },
    _para14a: paraRuntime,
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
    async getStateAsync() { return null; },
    _nwRequestImmediateEmsTick() { return true; },
  };
  beginSafetyCycle(adapter, generation, Date.now());
  if (para14a) markSafetyModuleResult(adapter, 'para14a', true, '', generation, Date.now());
  return adapter;
}

/**
 * Code-Teil: coreSnapshot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function coreSnapshot(adapter, overrides = {}) {
  const connection = Number(adapter?.config?.installerConfig?.gridConnectionPower);
  const maxPhaseA = Number(adapter?.config?.peakShaving?.maxPhaseA) || 0;
  return {
    grid: {
      gridSafetyMarginW: 0,
      gridImportLimitW_physical: Number.isFinite(connection) && connection > 0 ? connection : 0,
      gridImportLimitW_effective: Number.isFinite(connection) && connection > 0 ? connection : 0,
      gridMaxPhaseA_cfg: maxPhaseA,
      ...overrides,
    },
  };
}

/**
 * Code-Teil: release
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function release(adapter, dp, overrides = {}) {
  return buildSafetyEnvelope({
    adapter,
    dp,
    coreSnapshot: coreSnapshot(adapter, overrides),
    now: Date.now(),
    generation: adapter._emsSafetyCycle.generation,
  });
}

(async () => {
  // 1) Verbindliches Inbetriebnahme-Gate: ohne Anschlussgröße keine Freigabe.
  {
    const adapter = makeAdapter({ gridConnectionPower: 0 });
    const dp = makeDp();
    const envelope = release(adapter, dp);
    assert.strictEqual(envelope.valid, false);
    assert.strictEqual(envelope.commissioned, false);
    assert(envelope.invalidReasons.includes('grid-connection-power-missing'));
    const decision = evaluateFlexibleLoadRequest(adapter, { key: 'evcs:a', app: 'evcs', requestedW: 11000, currentActualW: 0 });
    assert.strictEqual(decision.allowedW, 0);
    assert.strictEqual(decision.forceZero, true);
  }

  // 2) Null/stale NVP wird niemals als 0-W-Messung interpretiert.
  {
    const adapter = makeAdapter({ nvpW: null, nvpUsable: false, nvpTs: Date.now() - 60000 });
    const envelope = release(adapter, makeDp());
    assert.strictEqual(envelope.valid, false);
    assert(envelope.invalidReasons.some((row) => String(row).startsWith('nvp-')));
    const decision = evaluateFlexibleLoadRequest(adapter, { key: 'storage:charge', app: 'storage', requestedW: 5000 });
    assert.strictEqual(decision.allowedW, 0);
  }

  // 3) Finale Netzanschluss-Klemmung nutzt den aktuellsten NVP, nicht den alten Plan.
  {
    const adapter = makeAdapter({ gridConnectionPower: 10000, nvpW: 9000 });
    release(adapter, makeDp());
    const decision = evaluateFlexibleLoadRequest(adapter, {
      key: 'evcs:a', app: 'evcs', requestedW: 11000, currentActualW: 0, phaseCount: 3,
    });
    assert.strictEqual(decision.allowedW, 1000);
    assert.strictEqual(decision.binding, 'grid');
  }

  // 3b) Ist der Netzanschluss bereits ueberlastet, muss ein bestehender
  // flexibler Verbraucher aktiv um den Ueberschreitungsbetrag reduziert werden.
  // Nur weiteres Wachstum zu blockieren waere kein harter Anschlussschutz.
  {
    const adapter = makeAdapter({ gridConnectionPower: 10000, nvpW: 12000 });
    release(adapter, makeDp());
    const decision = evaluateFlexibleLoadRequest(adapter, {
      key: 'evcs:active', app: 'evcs', requestedW: 5000, currentActualW: 5000, phaseCount: 3,
    });
    assert.strictEqual(decision.allowedW, 3000);
    assert.strictEqual(decision.binding, 'grid');
    assert.strictEqual(decision.gridIncrementHeadroomW, -2000);
  }

  // 4) §14a-Cap und expliziter 0-W-/Emergency-Stop sind harte Grenzen.
  {
    const para = {
      enabled: true,
      active: true,
      totalCapW: 4200,
      appCapsW: { evcs: 4200, storage: 4200, thermal: 4200, heatingRod: 4200, custom: 4200 },
      evcsCapsBySafe: { lp1: 4200 },
      signalFresh: true,
      signalStale: false,
      signalStatus: 'fresh',
      forceZero: false,
      emergencyStop: false,
    };
    const adapter = makeAdapter({ gridConnectionPower: 20000, nvpW: 0, para14a: true, paraRuntime: para });
    release(adapter, makeDp());
    const limited = evaluateFlexibleLoadRequest(adapter, {
      key: 'evcs:lp1', app: 'evcs', deviceKey: 'lp1', requestedW: 11000, currentActualW: 0,
    });
    assert.strictEqual(limited.allowedW, 4200);
    assert(/para14a/.test(limited.binding));

    adapter._para14a = {
      ...para,
      totalCapW: 0,
      appCapsW: { evcs: 0, storage: 0, thermal: 0, heatingRod: 0, custom: 0 },
      evcsCapsBySafe: { lp1: 0 },
      forceZero: true,
      emergencyStop: true,
    };
    const zeroEnvelope = liveSafetyEnvelope(adapter, makeDp(), { now: Date.now() });
    assert.strictEqual(zeroEnvelope.forceZero, true);
    const zero = evaluateFlexibleLoadRequest(adapter, {
      key: 'evcs:lp1', app: 'evcs', deviceKey: 'lp1', requestedW: 11000,
    });
    assert.strictEqual(zero.allowedW, 0);
    assert.strictEqual(zero.forceZero, true);
  }

  // 5) Aktives Phasenlimit erfordert L1/L2/L3 vollständig und frisch.
  {
    const adapter = makeAdapter({ gridConnectionPower: 30000, nvpW: 0, maxPhaseA: 16 });
    const incomplete = makeDp({ 'ps.l1A': 10, 'ps.l3A': 10 });
    const blocked = release(adapter, incomplete);
    assert.strictEqual(blocked.valid, false);
    assert(blocked.invalidReasons.some((row) => String(row).includes('phase-l2-not-mapped')));

    const complete = makeDp({ 'ps.l1A': 15, 'ps.l2A': 10, 'ps.l3A': 10 });
    const ready = release(adapter, complete);
    assert.strictEqual(ready.valid, true);
    const phaseLimited = evaluateFlexibleLoadRequest(adapter, {
      key: 'evcs:phase', app: 'evcs', requestedW: 5000, currentActualW: 0, phaseCount: 3, voltageV: 230,
    });
    assert.strictEqual(phaseLimited.allowedW, 690);
    assert.strictEqual(phaseLimited.binding, 'phase');

    const overloaded = makeDp({ 'ps.l1A': 18, 'ps.l2A': 10, 'ps.l3A': 10 });
    const overloadedEnvelope = release(adapter, overloaded);
    assert.strictEqual(overloadedEnvelope.valid, true);
    const phaseShedding = evaluateFlexibleLoadRequest(adapter, {
      key: 'evcs:phase-active', app: 'evcs', requestedW: 5000, currentActualW: 5000, phaseCount: 3, voltageV: 230,
    });
    assert.strictEqual(phaseShedding.allowedW, 3620);
    assert.strictEqual(phaseShedding.binding, 'phase');
  }

  // 6) Mehrere flexible Verbraucher teilen denselben verbleibenden Headroom.
  {
    const adapter = makeAdapter({ gridConnectionPower: 10000, nvpW: 2000 });
    release(adapter, makeDp());
    const first = evaluateFlexibleLoadRequest(adapter, { key: 'evcs:a', app: 'evcs', requestedW: 5000, currentActualW: 0 });
    assert.strictEqual(first.allowedW, 5000);
    commitFlexibleLoadDecision(adapter, first, true);
    const second = evaluateFlexibleLoadRequest(adapter, { key: 'heatingRod:b', app: 'heatingRod', requestedW: 5000, currentActualW: 0 });
    assert.strictEqual(second.allowedW, 3000);
    assert.strictEqual(first.allowedW + second.allowedW, 8000);
  }

  // 7) Ein alter EVCS-Plan mit writeRequired=false wird bei stale NVP trotzdem
  // aktiv mit 0 W überschrieben – die finale Firewall kann nicht übersprungen werden.
  {
    const writes = [];
    const adapter = makeAdapter({
      gridConnectionPower: 10000,
      nvpW: null,
      nvpUsable: false,
      nvpTs: Date.now() - 60000,
      para14a: true,
      paraRuntime: {
        enabled: true,
        active: true,
        totalCapW: 4200,
        appCapsW: { evcs: 4200, storage: 4200, thermal: 4200, heatingRod: 4200, custom: 4200 },
        evcsCapsBySafe: { wb1: 4200 },
        signalFresh: true,
        signalStale: false,
        signalStatus: 'fresh',
      },
    });
    const dp = makeDp();
    dp.entries.set('wb.setW', { key: 'wb.setW', objectId: 'wb.setW' });
    dp.writeNumber = async (key, value, ack) => { writes.push({ key, value: Number(value), ack }); return true; };
    release(adapter, dp);
    const module = new ChargingManagementModule(adapter, dp);
    const wallbox = {
      safe: 'wb1', ch: 'chargingManagement.wallboxes.wb1', online: true,
      controlAvailable: true, controlBasis: 'powerW', setWKey: 'wb.setW',
      enableKey: '', name: 'WB1', cfgEnabled: true, userStationEnabled: true,
      userEnabled: true, operationalBlocked: false, enabled: true, maxPW: 11000,
      phases: 3, meterStale: false, actualPowerW: 0,
      consumer: { type: 'evcs', key: 'wb1', controlBasis: 'powerW', setWKey: 'wb.setW' },
    };
    const result = await module._executeChargingSetpointEntries([
      {
        safe: 'wb1', targetPowerW: 11000, targetCurrentA: 0, basis: 'powerW',
        setpointKey: 'wb.setW', writeRequired: false, reason: 'old-precomputed-plan',
      },
    ], [wallbox], [], 'test-final-write', '');
    assert(writes.length >= 1, 'Safety-Stop muss einen echten Hardware-Write erzwingen');
    assert.strictEqual(writes[0].value, 0);
    assert(result.safetyBlockedCount >= 1 || result.safetyClampedCount >= 1);
  }

  // 8) Writer-Fehler bleibt im selben Zyklus gelatcht und kann von einem späteren
  // liveSafetyEnvelope-Aufbau nicht versehentlich wieder freigegeben werden.
  {
    const adapter = makeAdapter({ gridConnectionPower: 10000, nvpW: 1000 });
    const dp = makeDp();
    assert.strictEqual(release(adapter, dp).valid, true);
    invalidateSafetyEnvelope(adapter, 'test-hardware-write-failed', { emergencyStop: true });
    const rebuilt = liveSafetyEnvelope(adapter, dp, { now: Date.now() });
    assert.strictEqual(rebuilt.valid, false);
    assert(rebuilt.invalidReasons.includes('test-hardware-write-failed'));
  }

  // 9) Auch Speicherentladung / nicht importsteigernde Stellbefehle benötigen
  // einen aktuellen Sicherheitsnachweis; 0 W bleibt immer erlaubt.
  {
    const adapter = makeAdapter({ gridConnectionPower: 10000, nvpW: 1000 });
    release(adapter, makeDp());
    const allowed = evaluateSafetyCommandPermission(adapter, { key: 'storage:discharge', app: 'storage', requestedActive: true });
    assert.strictEqual(allowed.allowed, true);
    adapter._nvpFreshnessSnapshot.ts = Date.now() - 60000;
    const blocked = evaluateSafetyCommandPermission(adapter, { key: 'storage:discharge', app: 'storage', requestedActive: true });
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.forceZero, true);
  }

  // 10) Typisierte §14a-Verteilung akzeptiert 0 W als ausdrücklichen Stop und
  // verteilt für alle vorhandenen App-Gruppen exakt 0 W.
  {
    const snapshot = buildPara14aConstraintSnapshot({
      active: true,
      forceZero: true,
      emergencyStop: true,
      mode: 'ems',
      externalTotalSetpointW: 0,
      evcs: [{ safe: 'lp1', maxPowerW: 11000 }],
      consumers: [
        { id: 'storage', type: 'storage', controlType: 'limitW', installedPowerW: 10000 },
        { id: 'thermal', type: 'heatPump', controlType: 'limitW', installedPowerW: 9000 },
        { id: 'rod', type: 'heatingRod', controlType: 'limitW', installedPowerW: 6000 },
        { id: 'custom', type: 'custom', controlType: 'limitW', installedPowerW: 3000 },
      ],
    });
    assert.strictEqual(snapshot.forceZero, true);
    assert.strictEqual(snapshot.totalCapW, 0);
    assert.strictEqual(snapshot.evcsCapsBySafe.lp1, 0);
    assert.strictEqual(snapshot.appCapsW.storage, 0);
    assert.strictEqual(snapshot.appCapsW.thermal, 0);
    assert.strictEqual(snapshot.appCapsW.heatingRod, 0);
    assert.strictEqual(snapshot.appCapsW.custom, 0);
  }

  // 11) Quellanker: alle produktiven flexiblen Writer müssen die gleiche finale
  // Safety-Firewall verwenden. Dieser Test verhindert einen späteren Rückbau.
  {
    const sources = {
      charging: 'src-ts/runtime-executables/ems/modules/charging-management.ts',
      storage: 'src-ts/runtime-executables/ems/modules/storage-control.ts',
      thermal: 'src-ts/runtime-executables/ems/modules/thermal-control.ts',
      heatingRod: 'src-ts/runtime-executables/ems/modules/heating-rod-control.ts',
      multiUse: 'src-ts/runtime-executables/ems/modules/multi-use.ts',
      threshold: 'src-ts/runtime-executables/ems/modules/threshold-control.ts',
      nexoLogic: 'src-ts/runtime-executables/ems/modules/nexologic-budget.ts',
    };
    for (const [name, file] of Object.entries(sources)) {
      const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
      assert(source.includes('evaluateFlexibleLoadRequest'), `${name}: finale Safety-Auswertung fehlt`);
      assert(source.includes('liveSafetyEnvelope'), `${name}: Live-Recheck vor Hardware-Write fehlt`);
      assert(source.includes('invalidateSafetyEnvelope'), `${name}: Write-Fehlerverriegelung fehlt`);
    }
    const storageSource = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
    assert(storageSource.includes('evaluateSafetyCommandPermission'), 'Speicherentladung benötigt den Safety-Command-Vertrag');
    const managerSource = fs.readFileSync(path.resolve(__dirname, '../src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
    assert(managerSource.includes('beginSafetyCycle'));
    assert(managerSource.includes('_nwSafetyCriticalFaults'));
    assert(managerSource.includes("'thresholdControl'"));
  }

  console.log('[safety-envelope-final-write] OK: Inbetriebnahme, NVP, Phasen, §14a, Summenreserve, finaler Hardware-Write und Fehlerverriegelung arbeiten fail-closed.');
})().catch((error) => {
  console.error('[safety-envelope-final-write] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
