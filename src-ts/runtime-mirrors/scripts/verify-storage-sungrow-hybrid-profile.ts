// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-sungrow-hybrid-profile.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-sungrow-hybrid-profile.js
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
 * Original-Hash: 91ffb81258e58862a8df30c75f702ecda2d07e15246bb3cd9a2e817c4560ca71
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
 * Regression 0.8.86: Sungrow Hybrid ESS Herstellerprofil.
 *
 * Zweck:
 * - Sungrow SH/RS/RT/MG-Hybrid-ESS wird im Tagesbetrieb nicht blind nach
 *   Gebaeudelast oder PV-Deckung gefuehrt, sondern am NVP bilanziert.
 * - Wenn der NVP ausserhalb des Zielbandes liegt, wird der alte/aktuelle
 *   Batteriefluss mit der neuen NVP-Abweichung verrechnet: neue Vorgabe =
 *   Batterie-Istleistung + (NVP-Ist - Ziel).
 * - Nur wenn der NVP im Zielband liegt, werden PV-/Tagesvorgaben auf 0 gesetzt
 *   und Sungrow darf intern weiterregeln.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
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
  writesFor(key) { return this.writes.filter(w => w.key === key); }
  lastWrite(key) {
    const matches = this.writesFor(key);
    return matches.length ? matches[matches.length - 1].value : null;
  }
}

/**
 * Code-Teil: makeEntry
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function makeEntry(val, objectId) {
  return { val, ts: nowMs(), objectId: objectId || `test.${Math.random().toString(36).slice(2)}` };
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
function makeAdapter(extraConfig = {}, stateCache = {}) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storageFarm: {},
      storage: {
        controlMode: 'targetPower',
        coupling: 'dc',
        dcPvPowerObjectId: 'pv.dc',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 50000,
        pvMaxDeltaWPerTick: 50000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
        vendorProfile: 'sungrow-hybrid',
        sungrowPvPassthroughEnabled: true,
        sungrowZeroOnPvCoverage: true,
        sungrowDischargeOnlyOnGridImport: true,
        sungrowPvThresholdW: 300,
        sungrowLoadCoverReserveW: 300,
        sungrowImportThresholdW: 50,
        sungrowTargetGridImportW: 50,
        sungrowAssistBufferW: 150,
        ...(extraConfig.storage || {}),
      },
      ...(extraConfig.root || {}),
    },
    stateCache,
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: nowMs() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache && this.stateCache[id];
      const n = Number(rec && rec.value);
      return Number.isFinite(n) ? n : null;
    },
    _states: states,
  };
}

/**
 * Code-Teil: runTick
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runTick({ gridW, gridRawW = gridW, soc = 77, battPowerW = null, pvW = 0, loadW = 0, extraConfig = {} }) {
  const entries = {
    'grid.powerW': makeEntry(gridW, 'grid.filtered'),
    'grid.powerRawW': makeEntry(gridRawW, 'grid.raw'),
    'st.socPct': makeEntry(soc, 'battery.soc'),
    'st.dcPvPowerW': makeEntry(pvW, 'pv.dc'),
    'st.targetChargePowerW': { objectId: 'battery.chargeTarget', ts: nowMs(), val: 0 },
    'st.targetDischargePowerW': { objectId: 'battery.dischargeTarget', ts: nowMs(), val: 0 },
    'st.run': { objectId: 'battery.run', ts: nowMs(), val: false },
  };
  if (battPowerW !== null) entries['st.batteryPowerW'] = makeEntry(battPowerW, 'battery.actualPower');
  const stateCache = {
    'derived.core.pv.totalW': { value: pvW, ts: nowMs() },
    'derived.core.building.loadTotalW': { value: loadW, ts: nowMs() },
  };
  const dp = new FakeDp(entries);
  const adapter = makeAdapter(extraConfig, stateCache);
  const mod = new SpeicherRegelungModule(adapter, dp);
  await mod.tick();
  return { dp, adapter, mod };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  const control = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  assert(html.includes('id="storageVendorProfile"'), 'AppCenter braucht das Herstellerprofil-Dropdown im Speicher-Reiter');
  assert(html.includes('Sungrow Hybrid ESS'), 'AppCenter muss Sungrow Hybrid ESS anbieten');
  assert(ui.includes('patch.storage.vendorProfile = getStorageVendorProfile();'), 'UI muss das Herstellerprofil speichern');
  assert(control.includes('_buildSungrowHybridContext'), 'Backend muss Sungrow-Kontext berechnen');
  assert(control.includes('sungrowHybridPvDecktLast'), 'Backend muss PV-deckt-Last diagnostizieren');

  // Kundenszenario aus dem Screenshot: PV ca. 17 kW, Last ca. 5,5 kW,
  // NVP zeigt Import, Batterie laedt. Sungrow darf hier nicht blind 0 W setzen:
  // die aktuelle Batterieladung muss um den NVP-Import reduziert werden.
  const pvCoveredImport = await runTick({ gridW: 2500, gridRawW: 2500, pvW: 17000, loadW: 5500, battPowerW: -14100 });
  const pvCoveredCharge = pvCoveredImport.dp.lastWrite('st.targetChargePowerW');
  assert(pvCoveredCharge > 11000 && pvCoveredCharge < 12000, `Sungrow muss laufende Ladung + NVP-Fehler bilanzieren, erwartet ca. 11650 W Laden: ${pvCoveredCharge}`);
  assert.strictEqual(pvCoveredImport.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow NVP-Balancing Laden darf keinen Entlade-Sollwert setzen');
  assert.strictEqual(pvCoveredImport.dp.lastWrite('st.run'), true, 'Sungrow NVP-Balancing muss Run/extern aktivieren');
  assert.strictEqual(pvCoveredImport.adapter._states.get('speicher.regelung.sungrowHybridPvDecktLast').val, true, 'Diagnose muss PV-deckt-Last anzeigen');
  assert.strictEqual(pvCoveredImport.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-charge', 'Schreibmodus muss NVP-Balancing Laden anzeigen');

  // Rest-Netzbezug trotz laufender Entladung: Ziel ist nicht nur der neue Import,
  // sondern aktuelle Batterie-Istentladung + aktuelle NVP-Abweichung.
  const importAssist = await runTick({ gridW: 700, gridRawW: 700, pvW: 15600, loadW: 12700, battPowerW: 400 });
  const dchg = importAssist.dp.lastWrite('st.targetDischargePowerW');
  assert(dchg >= 1000 && dchg <= 1100, `Sungrow muss aktuelle Entladung plus NVP-Fehler schreiben, erwartet ca. 1050 W: ${dchg}`);
  assert.strictEqual(importAssist.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-discharge', 'Schreibmodus muss NVP-Balancing Entladung anzeigen');

  // Ohne ausreichende PV-Deckung darf bei echtem Netzbezug ein NVP-begrenzter
  // Entlade-Assist geschrieben werden.
  const assist = await runTick({ gridW: 2300, gridRawW: 2300, pvW: 100, loadW: 5500, battPowerW: 0 });
  const dchgNoPv = assist.dp.lastWrite('st.targetDischargePowerW');
  assert(dchgNoPv > 0, `Sungrow muss bei Netzbezug ohne PV-Deckung entladen duerfen: ${dchgNoPv}`);
  assert(dchgNoPv <= 2400, `Sungrow-Assist muss am NVP begrenzt bleiben: ${dchgNoPv}`);
  assert.strictEqual(assist.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-discharge', 'Schreibmodus muss NVP-Balancing Entladung anzeigen');

  // Rest-Export trotz laufender Ladung: die alte Ladeleistung und der aktuelle
  // NVP-Export werden addiert, damit 2,9 kW Ladung + 2,9 kW Export zu ca. 5,85 kW werden.
  const pvCharge = await runTick({ gridW: -2900, gridRawW: -2900, pvW: 12000, loadW: 3000, battPowerW: -2900 });
  const chg = pvCharge.dp.lastWrite('st.targetChargePowerW');
  assert(chg >= 5800 && chg <= 5900, `Sungrow muss laufende Ladung plus NVP-Export schreiben, erwartet ca. 5850 W: ${chg}`);
  assert.strictEqual(pvCharge.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow PV-Export darf keinen Entlade-Sollwert setzen');
  assert.strictEqual(pvCharge.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val, 'write-nvp-balance-charge', 'Schreibmodus muss NVP-Balancing Laden anzeigen');

  // Wenn der NVP im Zielband ist, bleibt die alte interne Sungrow-Freigabe erhalten.
  const pvStable = await runTick({ gridW: 80, gridRawW: 80, pvW: 12000, loadW: 3000, battPowerW: 0 });
  assert.strictEqual(pvStable.dp.lastWrite('st.targetChargePowerW'), 0, 'Sungrow NVP im Zielband muss Lade-Sollwert 0 schreiben');
  assert.strictEqual(pvStable.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow NVP im Zielband muss Entlade-Sollwert 0 schreiben');

  console.log('[storage-sungrow-hybrid-profile] OK: Sungrow Herstellerprofil bilanziert am NVP mit Ist-/Altwert plus aktueller Abweichung.');
})().catch((err) => {
  console.error('[storage-sungrow-hybrid-profile] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
