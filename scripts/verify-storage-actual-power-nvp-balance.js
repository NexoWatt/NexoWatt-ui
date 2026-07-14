#!/usr/bin/env node
'use strict';
/**
 * Regression 0.8.94: Istleistungsbasiertes Speicher-NVP-Balancing mit
 * stabilem Halten des letzten nicht-null Sollwerts im NVP-Zielband.
 *
 * Geprueft wird die zentrale Regelgleichung fuer Laden und Entladen:
 *   Soll = Batterie-Ist + (NVP-Ist - NVP-Ziel)
 *
 * Zusaetzlich prueft der Test:
 * - kontrollierter Leistungsaufbau statt Sollwert-Spruengen,
 * - schnelle Ruecknahme bei Lastabwurf/Wolken,
 * - Richtungswechsel immer zuerst ueber 0 W,
 * - RAW-NVP bei frischer, zeitlich plausibler Batterie-Istleistung,
 * - sicherer Fallback ohne Hochintegration alter Entlade-Sollwerte,
 * - keine zweite Rampe relativ zu einem alten Sollwert im produktiven Tick,
 * - 0 W bleibt ein ausdruecklicher Stop und wird nicht bei erreichtem NVP-Ziel
 *   versehentlich als neuer Lade-/Entladesollwert geschrieben.
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
    const list = this.writes.filter((w) => w.key === key);
    return list.length ? list[list.length - 1].value : null;
  }
}

function entry(val, objectId, ageMs = 0) {
  return {
    val,
    objectId,
    ts: nowMs() - Math.max(0, Number(ageMs) || 0),
  };
}

function makeAdapter(storagePatch = {}) {
  const states = new Map();
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
        maxDeltaWPerTick: 500,
        pvMaxDeltaWPerTick: 1500,
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
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache() { return null; },
    _states: states,
  };
}

function buildBalance(mod, patch = {}) {
  return mod._buildActualAwareNvpBalance({
    rawNvpW: 700,
    fallbackNvpW: 700,
    nvpAgeMs: 100,
    targetNvpW: 50,
    deadbandW: 50,
    batteryPowerW: 500,
    batteryAgeMs: 100,
    batteryPowerTrusted: true,
    lastTargetW: 500,
    lastTargetAllowed: true,
    maxDischargeCorrectionW: 500,
    maxChargeCorrectionW: 1500,
    feedbackMaxAgeMs: 8000,
    feedbackMaxSkewMs: 5000,
    stepW: 1,
    ...patch,
  });
}

async function runTick({
  gridW,
  gridRawW = gridW,
  battPowerW,
  battAgeMs = 0,
  gridAgeMs = 0,
  socPct = 80,
  lastTargetW = 0,
  lastSource = 'eigenverbrauch',
  storagePatch = {},
}) {
  const dp = new FakeDp({
    'grid.powerW': entry(gridW, 'grid.filtered', gridAgeMs),
    'grid.powerRawW': entry(gridRawW, 'grid.raw', gridAgeMs),
    'st.socPct': entry(socPct, 'battery.soc'),
    'st.batteryPowerW': entry(battPowerW, 'battery.actualPower', battAgeMs),
    'st.targetPowerW': entry(0, 'battery.target'),
  });
  const adapter = makeAdapter(storagePatch);
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = lastTargetW;
  mod._lastSource = lastSource;
  await mod.tick();
  return { targetW: dp.lastWrite(), adapter, mod, dp };
}

(async () => {
  const mod = new SpeicherRegelungModule(makeAdapter(), new FakeDp());

  const discharge = buildBalance(mod);
  assert.strictEqual(discharge.feedbackUsed, true, 'frische Batterie-Istleistung muss verwendet werden');
  assert.strictEqual(Math.round(discharge.rawTargetW), 1150, 'Rohziel muss Ist 500 W + NVP-Differenz 650 W sein');
  assert.strictEqual(Math.round(discharge.targetW), 1000, 'Entladeaufbau muss auf +500 W Korrektur begrenzt werden');

  const follow = buildBalance(mod, {
    rawNvpW: 150,
    fallbackNvpW: 150,
    batteryPowerW: 900,
    lastTargetW: 1000,
  });
  assert.strictEqual(Math.round(follow.targetW), 1000, '900 W Ist + 100 W Restfehler muss 1000 W ergeben');

  const stable = buildBalance(mod, {
    rawNvpW: 50,
    fallbackNvpW: 50,
    batteryPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(Math.round(stable.targetW), 1000, 'im Zielband muss der passende Sollwert stabil bleiben');
  assert.strictEqual(stable.mode, 'feedback-hold-command', 'Zielband muss ohne Messwertzittern halten');

  const explicitChargeHold = buildBalance(mod, {
    rawNvpW: 50,
    fallbackNvpW: 50,
    batteryPowerW: 0,
    batteryAgeMs: 9000,
    lastTargetW: -3000,
    holdLastNonZeroInDeadband: true,
  });
  assert.strictEqual(explicitChargeHold.feedbackUsed, false, 'Hold-Test muss ohne Istfeedback laufen');
  assert.strictEqual(explicitChargeHold.targetW, -3000, 'letzte Ladeanforderung muss im Zielband aktiv bleiben');
  assert.strictEqual(explicitChargeHold.holdingLastCommand, true, 'Lade-Hold muss diagnostiziert werden');
  assert.strictEqual(explicitChargeHold.mode, 'fallback-hold-last-command', 'Lade-Hold braucht eindeutigen Diagnosemodus');

  const explicitDischargeHold = buildBalance(mod, {
    rawNvpW: 50,
    fallbackNvpW: 50,
    batteryPowerW: 0,
    batteryAgeMs: 9000,
    lastTargetW: 2500,
    holdLastNonZeroInDeadband: true,
  });
  assert.strictEqual(explicitDischargeHold.targetW, 2500, 'letzte Entladeanforderung muss im Zielband aktiv bleiben');
  assert.strictEqual(explicitDischargeHold.holdingLastCommand, true, 'Entlade-Hold muss diagnostiziert werden');

  const release = buildBalance(mod, {
    rawNvpW: -600,
    fallbackNvpW: -600,
    batteryPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(Math.round(release.targetW), 350, 'Export muss laufende Entladung um die Differenz reduzieren');
  assert(release.mode.includes('fast-release'), 'Ruecknahme in Richtung 0 muss schnell erfolgen');

  const reverseToZero = buildBalance(mod, {
    rawNvpW: -1200,
    fallbackNvpW: -1200,
    batteryPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(reverseToZero.targetW, 0, 'direkter Wechsel Entladen -> Laden muss zuerst 0 W schreiben');
  assert(reverseToZero.mode.includes('zero-before-reverse'), 'Richtungswechsel muss diagnostiziert werden');

  const charge = buildBalance(mod, {
    rawNvpW: -1000,
    fallbackNvpW: -1000,
    batteryPowerW: -2000,
    lastTargetW: -2000,
  });
  assert.strictEqual(Math.round(charge.rawTargetW), -3050, 'Laderohziel muss -2000 W Ist plus -1050 W NVP-Differenz sein');
  assert.strictEqual(Math.round(charge.targetW), -3050, 'Ladekorrektur innerhalb 1500 W muss voll uebernommen werden');

  const stopChargeBeforeDischarge = buildBalance(mod, {
    rawNvpW: 2500,
    fallbackNvpW: 2500,
    batteryPowerW: -2000,
    lastTargetW: -2000,
  });
  assert.strictEqual(stopChargeBeforeDischarge.targetW, 0, 'Laden -> Entladen muss zuerst ueber 0 W gehen');

  const stale = buildBalance(mod, {
    rawNvpW: 2600,
    fallbackNvpW: 2600,
    batteryPowerW: 3000,
    batteryAgeMs: 9000,
    lastTargetW: 71600,
  });
  assert.strictEqual(stale.feedbackUsed, false, 'alte Batterie-Istleistung darf nicht verwendet werden');
  assert(stale.targetW >= 2500 && stale.targetW <= 2600, `Fallback muss nur aktuellen NVP-Bedarf kommandieren: ${stale.targetW}`);
  assert.strictEqual(stale.baseW, 0, 'alter positiver Entlade-Sollwert darf keine Fallback-Basis sein');

  const staleCharge = buildBalance(mod, {
    rawNvpW: -1000,
    fallbackNvpW: -1000,
    batteryPowerW: -3000,
    batteryAgeMs: 9000,
    lastTargetW: -71600,
  });
  assert.strictEqual(staleCharge.feedbackUsed, false, 'alte Lade-Istleistung darf nicht verwendet werden');
  assert.strictEqual(Math.round(staleCharge.targetW), -1050, 'ohne Istfeedback darf nur die aktuelle Exportdifferenz gelten');
  assert.strictEqual(staleCharge.baseW, 0, 'alter negativer Ladesollwert darf nicht als Istleistung hochintegriert werden');
  assert.strictEqual(staleCharge.mode, 'fallback-direct-export', 'sicherer Lade-Fallback muss diagnostiziert werden');

  const rawWins = buildBalance(mod, {
    rawNvpW: 700,
    fallbackNvpW: -500,
    batteryPowerW: 500,
  });
  assert.strictEqual(rawWins.nvpW, 700, 'bei frischem Istfeedback muss RAW-NVP statt verzoegertem Filter fuehren');
  assert.strictEqual(Math.round(rawWins.targetW), 1000, 'RAW-NVP muss in Istleistung plus Differenz eingehen');

  const skewed = buildBalance(mod, {
    rawNvpW: 700,
    fallbackNvpW: 700,
    batteryPowerW: 500,
    batteryAgeMs: 7000,
    nvpAgeMs: 100,
    feedbackMaxAgeMs: 8000,
    feedbackMaxSkewMs: 5000,
  });
  assert.strictEqual(skewed.feedbackUsed, false, 'stark zeitversetzte NVP-/Batteriewerte duerfen nicht gemeinsam bilanziert werden');

  // Produktiver Tick: Ein alter 5-kW-Sollwert darf den neuen, aus 500 W Ist +
  // 650 W NVP-Fehler (auf 500 W Korrektur begrenzt) berechneten Wert nicht durch
  // eine zweite Sollwert-Rampe wieder nach oben ziehen.
  const tick = await runTick({
    gridW: 700,
    battPowerW: 500,
    lastTargetW: 5000,
  });
  assert.strictEqual(tick.targetW, 1000, `produktiver Tick muss auf Istleistung statt altem Sollwert basieren: ${tick.targetW}`);
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceFeedbackVerwendet').val, true, 'Diagnose muss verwendetes Istfeedback anzeigen');
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceNvpFehlerW').val, 650, 'Diagnose muss die NVP-Differenz anzeigen');
  assert.strictEqual(tick.adapter._states.get('speicher.regelung.balanceIstLeistungW').val, 500, 'Diagnose muss die Istleistung anzeigen');

  const staleTick = await runTick({
    gridW: 2600,
    battPowerW: 3000,
    battAgeMs: 9000,
    lastTargetW: 71600,
  });
  assert.strictEqual(staleTick.adapter._states.get('speicher.regelung.balanceFeedbackVerwendet').val, false, 'stales Istfeedback muss im produktiven Tick deaktiviert werden');
  assert.strictEqual(staleTick.adapter._states.get('speicher.regelung.balanceIstLeistungW').val, null, 'nicht verwendete Istleistung darf nicht als 0-W-Messung erscheinen');
  assert.strictEqual(staleTick.adapter._states.get('speicher.regelung.balanceBasisW').val, 0, 'Fallback-Rechenbasis muss separat sichtbar sein');
  assert(staleTick.targetW >= 2500 && staleTick.targetW <= 2600, `staler Istwert darf alten Sollwert nicht hochintegrieren: ${staleTick.targetW}`);

  const tickCharge = await runTick({
    gridW: -1000,
    battPowerW: -2000,
    lastTargetW: -500,
    lastSource: 'pv',
  });
  assert.strictEqual(tickCharge.targetW, -3050, `Lade-Tick muss Istleistung plus NVP-Differenz schreiben: ${tickCharge.targetW}`);

  const tickReverse = await runTick({
    gridW: -1200,
    battPowerW: 1000,
    lastTargetW: 1000,
  });
  assert.strictEqual(tickReverse.targetW, 0, `Richtungswechsel muss im produktiven Tick zuerst 0 W schreiben: ${tickReverse.targetW}`);

  const holdChargeTick = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    lastTargetW: -3000,
    lastSource: 'pv',
  });
  assert.strictEqual(holdChargeTick.targetW, -3000, `NVP-Ziel darf laufende Beladung nicht mit 0 W stoppen: ${holdChargeTick.targetW}`);
  assert.strictEqual(holdChargeTick.adapter._states.get('speicher.regelung.balanceLetztenSollwertGehalten').val, true, 'produktiver Lade-Hold muss sichtbar sein');

  const holdDischargeTick = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    lastTargetW: 2500,
    lastSource: 'eigenverbrauch',
  });
  assert.strictEqual(holdDischargeTick.targetW, 2500, `NVP-Ziel darf laufende Entladung nicht mit 0 W stoppen: ${holdDischargeTick.targetW}`);
  assert.strictEqual(holdDischargeTick.adapter._states.get('speicher.regelung.balanceGehaltenSollW').val, 2500, 'gehaltener Entladesollwert muss sichtbar sein');

  const chargeSocStop = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    socPct: 100,
    lastTargetW: -3000,
    lastSource: 'pv',
  });
  assert.strictEqual(chargeSocStop.targetW, 0, 'Max-SoC bleibt ein ausdruecklicher Lade-Stop mit 0 W');

  const dischargeSocStop = await runTick({
    gridW: 50,
    battPowerW: 0,
    battAgeMs: 9000,
    socPct: 20,
    lastTargetW: 2500,
    lastSource: 'eigenverbrauch',
  });
  assert.strictEqual(dischargeSocStop.targetW, 0, 'Min-SoC bleibt ein ausdruecklicher Entlade-Stop mit 0 W');

  console.log('[storage-actual-power-nvp-balance] OK: Istleistung plus NVP-Differenz regelt stabil; im Zielband bleibt der letzte nicht-null Sollwert aktiv, waehrend Schutzgrenzen weiterhin 0 W stoppen.');
})().catch((err) => {
  console.error('[storage-actual-power-nvp-balance] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
