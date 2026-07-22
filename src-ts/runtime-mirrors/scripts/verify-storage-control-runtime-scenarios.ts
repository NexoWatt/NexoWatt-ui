// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-control-runtime-scenarios.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-control-runtime-scenarios.js
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
 * Original-Hash: e515b1ac46a6ffb8025bb791e5a442c00e8edb85351692652477d4c2e7bc8bee
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
 * Runtime-Szenariotest 0.8.94: Speichergrundlogik, NVP-Hold und Feldschutz.
 *
 * Zweck:
 * - Eigenverbrauch darf einen alten sehr hohen Entlade-Sollwert nicht weiterführen.
 * - Vertrauenswürdige Batterie-Istleistung muss stabile Eigenverbrauchsregelung erlauben.
 * - Ein am NVP-Ziel wirksamer Sollwert bleibt aktiv; 0 W bleibt ein expliziter Stop.
 * - Bei echtem Stop-/Wartebedarf sowie SoC-/Messwertschutz darf weiterhin sofort 0 W geschrieben werden.
 * - Richtungswechsel werden dagegen direkt ohne 0-W-Zwischenrunde ausgegeben.
 *
 * Dieser Test instanziiert das echte Storage-Modul mit einem kleinen ioBroker-/DP-Stub,
 * damit nicht nur Textmuster, sondern der produktive Tick-Pfad geprüft wird.
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
  lastWrite(key = 'st.targetPowerW') {
    const matches = this.writes.filter(w => w.key === key);
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
function makeAdapter(extraConfig = {}) {
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
        ...(extraConfig.storage || {}),
      },
      ...(extraConfig.root || {}),
    },
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
async function runTick({ gridW, gridRawW = gridW, soc = 80, battPowerW = null, lastTargetW = null, lastSource = '', extraConfig = {} }) {
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
  return { targetW: dp.lastWrite(), dp, adapter };
}

(async () => {
  // Sicherheitskritischer Feldfall: alter hoher Entlade-Sollwert, aber keine
  // vertrauenswuerdige Speicher-Istleistung. Ohne diesen physikalischen Anker
  // kann der sichere NVP-Headroom nicht bestimmt werden; Entladen muss daher
  // explizit gestoppt werden, statt einen alten Befehl fortzufuehren.
  const high = await runTick({ gridW: 2600, gridRawW: 2600, battPowerW: null, lastTargetW: 71600, lastSource: 'eigenverbrauch' });
  assert.strictEqual(high.targetW, 0, `feedbackloser alter Entlade-Sollwert muss sicher gestoppt werden: ${high.targetW}`);
  assert.strictEqual(
    (await high.adapter.getStateAsync('speicher.regelung.antiExportAktion'))?.val,
    'stop-missing-storage-feedback',
    'Anti-Export-Diagnose muss fehlende Speicher-Istleistung eindeutig melden',
  );

  // Mit echter Batterie-Istleistung darf die Regelung den Speicher stabil nahe Hauslast halten.
  const stable = await runTick({ gridW: 120, gridRawW: 120, battPowerW: 3000, lastTargetW: 3000, lastSource: 'eigenverbrauch' });
  assert(stable.targetW >= 2800 && stable.targetW <= 3400, `vertrauenswürdiges Batteriefeedback hält nicht stabil: ${stable.targetW}`);

  // Auch im NVP-Zielband darf ein positiver Entladebefehl ohne frische
  // Speicher-Istleistung nicht gehalten werden. Der NVP allein beweist nicht,
  // welche reale Speicherwirkung noch aktiv ist.
  const boundedHold = await runTick({ gridW: 80, gridRawW: 80, battPowerW: null, lastTargetW: 3000, lastSource: 'eigenverbrauch' });
  assert.strictEqual(boundedHold.targetW, 0, `feedbackloser Deadband-Entladebefehl muss sicher gestoppt werden: ${boundedHold.targetW}`);
  assert.strictEqual(
    (await boundedHold.adapter.getStateAsync('speicher.regelung.antiExportAktion'))?.val,
    'stop-missing-storage-feedback',
  );

  // Dasselbe gilt fuer groessere alte Entladevorgaben: ohne Messanker kein Hold.
  const largeBalancedHold = await runTick({ gridW: 80, gridRawW: 80, battPowerW: null, lastTargetW: 8000, lastSource: 'eigenverbrauch' });
  assert.strictEqual(largeBalancedHold.targetW, 0, `grosser feedbackloser Entladebefehl muss sicher gestoppt werden: ${largeBalancedHold.targetW}`);
  assert.strictEqual(
    (await largeBalancedHold.adapter.getStateAsync('speicher.regelung.antiExportAktion'))?.val,
    'stop-missing-storage-feedback',
  );

  // PV-Überschuss-Laden wird auf den aktuellen RAW-Export begrenzt.
  const pv = await runTick({ gridW: -5000, gridRawW: -5000, battPowerW: null, lastTargetW: 0, lastSource: 'idle', extraConfig: { storage: { pvMaxDeltaWPerTick: 10000 } } });
  assert(pv.targetW <= -4500 && pv.targetW >= -5200, `PV-Laden folgt nicht dem Export-Cap: ${pv.targetW}`);

  // NVP im Zielband: Die laufende PV-Ladung bleibt aktiv. 0 W ist kein Regelergebnis,
  // sondern nur ein expliziter Stopbefehl.
  const holdCharge = await runTick({ gridW: 0, gridRawW: 0, battPowerW: null, lastTargetW: -10000, lastSource: 'pv' });
  assert.strictEqual(holdCharge.targetW, -10000, `NVP-Ziel darf laufende PV-Ladung nicht stoppen: ${holdCharge.targetW}`);

  // Echter Netzbezug bei laufender Ladung ist dagegen eine klare Stop-/Korrekturbedingung.
  const stopChargeOnImport = await runTick({ gridW: 1000, gridRawW: 1000, battPowerW: null, lastTargetW: -10000, lastSource: 'pv' });
  assert.strictEqual(stopChargeOnImport.targetW, 0, `Netzbezug muss feedbacklose PV-Ladung sicher stoppen: ${stopChargeOnImport.targetW}`);

  console.log('[storage-control-runtime-scenarios] OK: Speicher-Eigenverbrauch, Anti-Export-Fail-Safe, Demand-Caps und explizite Stopbedingungen laufen durch echte Tick-Szenarien.');
})().catch((err) => {
  console.error('[storage-control-runtime-scenarios] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
