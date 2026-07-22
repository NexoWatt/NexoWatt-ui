// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-anti-export-hard-gate.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-anti-export-hard-gate.js
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
 * Original-Hash: 2f1ad2c706638ae960840fb9b91180fdf698b88cf4d2a007f66e1993d0702a19
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
 * Regression 0.8.136 / Baustein 9:
 * - ein frischer signierter NVP ist die letzte Autoritaet vor dem Speicherwriter,
 * - bestaetigte Einspeisung stoppt jede positive Entladevorgabe explizit,
 * - bei Netzbezug wird Entladung auf den physikalisch sicheren Headroom begrenzt,
 * - ohne frischen NVP oder ohne frische Speicher-Istleistung wird nicht entladen,
 * - Sungrow-Hold/No-Write darf einen alten Entladebefehl nicht weiterfahren.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolveStorageAntiExportTarget } = require('../ems/services/storage-anti-export-guard');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

/**
 * Code-Teil: decide
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function decide(patch = {}) {
  return resolveStorageAntiExportTarget({
    requestedTargetW: 3000,
    nvpW: 2000,
    nvpUsable: true,
    nvpTargetW: 50,
    nvpDeadbandW: 50,
    storageActualW: 0,
    storageActualTrusted: true,
    commandEpsilonW: 1,
    ...patch,
  });
}

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
function entry(val, objectId, ageMs = 0) {
  return { val, objectId, ts: nowMs() - Math.max(0, Number(ageMs) || 0) };
}

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
  getMeasurementTimestampMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Number(rec.ts) : null;
  }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, nowMs() - Number(rec.ts)) : null;
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const value = Number(rec.val);
    return Number.isFinite(value) ? value : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const value = Number(rec.val);
    return Number.isFinite(value) ? value : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }
  async writeNumber(key, value) {
    const numeric = Number(value);
    this.writes.push({ key, value: numeric });
    if (this.entries[key]) {
      this.entries[key] = { ...this.entries[key], val: numeric, ts: nowMs() };
    }
    return true;
  }
  async writeBoolean(key, value) {
    const bool = !!value;
    this.writes.push({ key, value: bool });
    if (this.entries[key]) {
      this.entries[key] = { ...this.entries[key], val: bool, ts: nowMs() };
    }
    return true;
  }
  lastWrite(key) {
    const matches = this.writes.filter((row) => row.key === key);
    return matches.length ? matches[matches.length - 1].value : null;
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
function makeAdapter(storagePatch = {}) {
  const states = new Map();
  const now = nowMs();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storageFarm: {},
      datapoints: {
        consumptionTotal: 'meter.load',
        pvPower: 'meter.pv',
      },
      storage: {
        controlMode: 'targetPower',
        coupling: 'dc',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 50000,
        pvMaxDeltaWPerTick: 50000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 10,
        selfMaxSocPct: 100,
        vendorProfile: 'sungrow-hybrid',
        sungrowTargetGridImportW: 50,
        sungrowImportThresholdW: 50,
        sungrowAssistBufferW: 150,
        ...storagePatch,
      },
    },
    stateCache: {
      consumptionTotal: { value: 2000, ts: now },
      pvPower: { value: 0, ts: now },
      'derived.core.pv.totalW': { value: 0, ts: now },
      'derived.core.building.loadTotalW': { value: 2000, ts: now },
      'derived.core.building.loadSource': { value: 'mapped:consumptionTotal', ts: now },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(String(id), { val, ack: true, ts: nowMs(), lc: nowMs() });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    _nwHasMappedDatapoint(key) { return !!String(this.config.datapoints?.[key] || '').trim(); },
    _nwGetNumberFromCache(id) {
      const rec = this.stateCache[id];
      const value = Number(rec && rec.value);
      return Number.isFinite(value) ? value : null;
    },
    _nwGetCacheAgeMs(id, current = nowMs()) {
      const rec = this.stateCache[id];
      return rec && Number.isFinite(Number(rec.ts)) ? Math.max(0, Number(current) - Number(rec.ts)) : null;
    },
    _nwGetNumberFromCacheFresh(id, maxAgeMs, fallback = null, current = nowMs()) {
      const age = this._nwGetCacheAgeMs(id, current);
      if (age !== null && Number.isFinite(Number(maxAgeMs)) && age > Number(maxAgeMs)) return fallback;
      const value = this._nwGetNumberFromCache(id);
      return value === null ? fallback : value;
    },
    _states: states,
  };
}

/**
 * Code-Teil: runSungrowTick
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runSungrowTick({ nvpW, actualW, actualMapped = true, lastTargetW = 3000 }) {
  const entries = {
    'grid.powerW': entry(nvpW, 'grid.filtered'),
    'grid.powerRawW': entry(nvpW, 'grid.raw'),
    'st.socPct': entry(70, 'storage.soc'),
    'st.targetChargePowerW': entry(0, 'storage.ctrl.charge'),
    'st.targetDischargePowerW': entry(lastTargetW, 'storage.ctrl.discharge'),
    'st.run': entry(true, 'storage.ctrl.run'),
  };
  if (actualMapped) entries['st.batteryPowerW'] = entry(actualW, 'storage.actual');
  const dp = new FakeDp(entries);
  const adapter = makeAdapter();
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._lastTargetW = lastTargetW;
  mod._lastSource = 'sungrow-assist';
  await mod.tick();
  return { adapter, dp, mod };
}

(async () => {
  // Reine Sicherheitsentscheidungen.
  let result = decide({ nvpW: -1000, storageActualW: 3000, requestedTargetW: 3000 });
  assert.strictEqual(result.action, 'stop-confirmed-export');
  assert.strictEqual(result.targetW, 0);
  assert.strictEqual(result.explicitStop, true);

  result = decide({ nvpW: 2000, storageActualW: 0, requestedTargetW: 3000 });
  assert.strictEqual(result.action, 'cap-to-nvp-headroom');
  assert.strictEqual(result.targetW, 1950);
  assert.strictEqual(result.predictedNvpW, 50);

  result = decide({ nvpW: 2000, storageActualW: 3000, requestedTargetW: 6000 });
  assert.strictEqual(result.targetW, 4950);
  assert.strictEqual(result.predictedNvpW, 50);

  result = decide({ nvpW: 3200, storageActualW: -2300, requestedTargetW: 4000 });
  assert.strictEqual(result.targetW, 850, 'laufende Speicherladung muss im sicheren Richtungswechsel physikalisch eingerechnet werden');
  assert.strictEqual(result.predictedNvpW, 50);

  result = decide({ nvpW: 2000, storageActualW: null, storageActualTrusted: false, requestedTargetW: 3000 });
  assert.strictEqual(result.action, 'stop-missing-storage-feedback');
  assert.strictEqual(result.targetW, 0);
  assert.strictEqual(result.explicitStop, true);

  result = decide({ nvpW: null, nvpUsable: false, storageActualW: 1000, requestedTargetW: 3000 });
  assert.strictEqual(result.action, 'stop-missing-nvp');
  assert.strictEqual(result.targetW, 0);

  result = decide({ nvpW: 60, storageActualW: 3000, requestedTargetW: 3000 });
  assert.strictEqual(result.action, 'allow-discharge');
  assert.strictEqual(result.targetW, 3000);
  assert.ok(result.predictedNvpW >= 50, 'erlaubte Entladung darf das NVP-Ziel nicht unterschreiten');

  // Reale zentrale Runtime-Kette: Ein alter Sungrow-Entladebefehl darf bei
  // bestätigter Einspeisung weder gehalten noch als No-Write weiterlaufen.
  const exportCase = await runSungrowTick({ nvpW: -1000, actualW: 3000, lastTargetW: 3000 });
  assert.strictEqual(exportCase.dp.lastWrite('st.targetDischargePowerW'), 0, 'Sungrow-Entlade-DP muss explizit auf 0 W gesetzt werden');
  assert.strictEqual(exportCase.dp.lastWrite('st.targetChargePowerW'), 0, 'Gegenrichtung muss beim Sicherheitsstopp ebenfalls 0 W sein');
  assert.strictEqual(exportCase.adapter._states.get('speicher.regelung.antiExportAktiv').val, true);
  assert.strictEqual(exportCase.adapter._states.get('speicher.regelung.antiExportAktion').val, 'stop-confirmed-export');
  assert.strictEqual(exportCase.adapter._states.get('speicher.regelung.acceptedSollW').val, 0);
  assert.strictEqual(exportCase.adapter._states.get('speicher.regelung.schreibOk').val, true, 'bestätigter 0-W-Stopp ist ein erfolgreicher Sicherheitswrite');
  assert.ok(String(exportCase.adapter._states.get('speicher.regelung.sungrowHybridSchreibmodus').val).includes('write-stop-anti-export'));

  const missingActualCase = await runSungrowTick({ nvpW: 2000, actualW: 0, actualMapped: false, lastTargetW: 3000 });
  assert.strictEqual(missingActualCase.dp.lastWrite('st.targetDischargePowerW'), 0, 'ohne frische Speicher-Istleistung darf nicht weiter entladen werden');
  assert.strictEqual(missingActualCase.adapter._states.get('speicher.regelung.antiExportAktion').val, 'stop-missing-storage-feedback');

  // Strukturvertrag: Das Gate muss nach Hersteller-/Budgetlogik und vor
  // 0-W-Firewall/Writer liegen; damit gilt es auch für Farm und alle Profile.
  const source = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
  const gatePos = source.indexOf('Finales herstellerunabhaengiges Anti-Export-Gate');
  const firewallPos = source.indexOf('Herstellerunabhaengige 0-W-Firewall', gatePos);
  const writerPos = source.indexOf('await this._applyTargetW(', gatePos);
  assert.ok(gatePos > 0 && firewallPos > gatePos && writerPos > firewallPos, 'Anti-Export-Gate muss final vor Firewall und Hardwarewriter liegen');
  assert.ok(source.includes("sungrowWriteMode = 'write-stop-anti-export'"), 'Sungrow-Hold muss durch expliziten Stop ersetzt werden');
  assert.ok(source.includes("antiExportExplicitStop\n                || sungrowUpstreamExplicitStop"), '0-W-Firewall muss Anti-Export als ausdruecklichen Stop anerkennen');

  console.log('[storage-anti-export-hard-gate] OK: NVP-Export stoppt Entladung; Import-Headroom wird physikalisch begrenzt; fehlende Messwerte fail-safe.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
