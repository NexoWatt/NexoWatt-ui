// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-fenecon-hybrid-controller.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-fenecon-hybrid-controller.js
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
 * Original-Hash: 9f5c98e3d0850696f265b526752280f23a8f3634b6b14e7ea4be1b24902a879e
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
 * Regression 0.8.147 / RC23: FENECON-Hybrid-Regelpfade.
 *
 * Vertraege:
 * - Automatik bevorzugt den nativen FEMS-NVP-Regler, wenn
 *   SetGridActivePower + ess0/ActivePower gemappt sind.
 * - Der direkte 706-/Signed-/Split-Pfad bleibt ein exklusiver Fallback.
 * - Die zentrale Batterie-Policy wird im nativen Pfad in ein NVP-Ziel
 *   uebersetzt; interne DC-PV wird damit von FEMS selbst verarbeitet.
 * - Direkte ESS-Vorgaben werden an 702/704 begrenzt.
 * - Der NVP-Koordinator bewertet den nativen Pfad am NVP und nicht an einer
 *   langsamen Batterie-Istwertantwort.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');
const { buildNvpCoordinatorSnapshot } = require('../ems/modules/nvp-coordinator');

/**
 * Code-Teil: now
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const now = () => Date.now();
const entry = (val, objectId, ts = now()) => ({ val, objectId, ts });

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
  constructor(entries = {}) {
    this.entries = entries;
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getMeasurementTimestampMs(key) {
    const rec = this.entries[key];
    return rec && Number.isFinite(Number(rec.ts)) ? Number(rec.ts) : null;
  }
  getAgeMs(key) {
    const ts = this.getMeasurementTimestampMs(key);
    return ts === null ? null : Math.max(0, now() - ts);
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
    const n = Number(rec && rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    if ([true, 1, '1', 'true'].includes(rec.val)) return true;
    if ([false, 0, '0', 'false'].includes(rec.val)) return false;
    return fallback;
  }
  getRaw(key) { return this.entries[key] ? this.entries[key].val : null; }
  async writeNumber(key, value) {
    const val = Number(value);
    const prev = this.entries[key] || { objectId: `test.${key}` };
    this.entries[key] = { ...prev, val, ts: now() };
    this.writes.push({ key, value: val });
    return true;
  }
  async writeBoolean(key, value) {
    const val = !!value;
    const prev = this.entries[key] || { objectId: `test.${key}` };
    this.entries[key] = { ...prev, val, ts: now() };
    this.writes.push({ key, value: val });
    return true;
  }
  writesFor(key) { return this.writes.filter((row) => row.key === key); }
  lastWrite(key) {
    const rows = this.writesFor(key);
    return rows.length ? rows.at(-1).value : null;
  }
}

/**
 * Code-Teil: singleAuthority
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function singleAuthority() {
  return {
    selectedTopology: 'single',
    writerActive: true,
    reason: 'fenecon-hybrid-test',
    singleAppActive: true,
    singleSuppressedByFarm: false,
    farmAggregationActive: false,
    farmDispatchActive: false,
    farm: { active: false, dispatchActive: false, rows: [] },
    multiUsePolicyActive: false,
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
function makeAdapter(storageOverrides = {}) {
  const states = new Map();
  return {
    _nwLicenseOk: true,
    _nwLicenseInfo: { ok: true, edition: 'eos' },
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      installerConfig: { storageMultiUse: { enabled: false } },
      storageFarm: {},
      storage: {
        controlMode: 'targetPower',
        vendorProfile: 'fenecon-openems',
        feneconGridControlEnabled: true,
        feneconHybridControlMode: 'auto',
        staleTimeoutSec: 15,
        stepW: 1,
        selfNvpFastServoEnabled: true,
        selfDischargeEnabled: true,
        selfMinSocPct: 0,
        selfMaxSocPct: 100,
        standaloneSelfDischargeEnabled: true,
        standaloneSelfMinSocPct: 0,
        standaloneSelfMaxSocPct: 100,
        standaloneSelfTargetGridImportW: 50,
        standaloneSelfImportThresholdW: 20,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 20,
        maxChargeW: 100000,
        maxDischargeW: 100000,
        ...storageOverrides,
      },
    },
    stateCache: {},
    log: { warn() {}, info() {}, debug() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
        ? value.val
        : value;
      states.set(String(id), { val, ts: now(), ack: true });
    },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    _nwGetNumberFromCache() { return null; },
    _nwGetCacheAgeMs() { return null; },
    _nwGetNumberFromCacheFresh(_id, _age, fallback = null) { return fallback; },
    _nwGetStorageControlAuthority() { return singleAuthority(); },
    _nwGetStorageFarmRuntimeInfo() { return singleAuthority().farm; },
    _states: states,
  };
}

/**
 * Code-Teil: baseEntries
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function baseEntries({ nvpW = 550, essActualW = -250, genericBatteryW = 9999 } = {}) {
  const ts = now();
  return {
    'grid.powerW': entry(nvpW, 'meter.filtered', ts),
    'grid.powerRawW': entry(nvpW, 'meter.raw', ts),
    'st.socPct': entry(80, 'fenecon.soc', ts),
    'st.batteryPowerW': entry(genericBatteryW, 'display.storage.power', ts),
    'st.feneconEssActivePowerW': entry(essActualW, 'fems.ess0.ActivePower', ts),
    'st.feneconGridSetpointW': entry(0, 'fems.ctrlBalancing0.SetGridActivePower', ts),
    'st.targetPowerW': entry(777, 'fems.ess0.SetActivePowerEquals', ts),
  };
}

/**
 * Code-Teil: runStorage
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runStorage(entries, storageOverrides = {}) {
  const dp = new FakeDp(entries);
  const adapter = makeAdapter(storageOverrides);
  const mod = new SpeicherRegelungModule(adapter, dp);
  await mod.tick();
  return { dp, adapter, mod };
}

(async () => {
  // 1) AUTO bevorzugt nativen FEMS-NVP-Pfad. Bei Eigenverbrauch ergibt sich
  // aus 550 W NVP, -250 W ESS-Ist und +250 W Batterie-Ziel exakt +50 W NVP-Ziel.
  const native = await runStorage(baseEntries());
  assert.strictEqual(native.adapter._states.get('speicher.regelung.commandFamily')?.val, 'fenecon-fems-grid');
  assert.strictEqual(native.adapter._states.get('speicher.regelung.sollW')?.val, 250, 'zentrale Batterie-Policy muss +250 W Entladung anfordern');
  assert.strictEqual(native.dp.lastWrite('st.feneconGridSetpointW'), 50, 'nativer FEMS-Pfad muss den NVP auf +50 W setzen');
  assert(!native.dp.writesFor('st.targetPowerW').some((row) => row.value !== 0), 'direkter 706/Signed-Pfad darf im nativen Modus keinen aktiven Befehl erhalten');
  assert.strictEqual(native.adapter._states.get('speicher.regelung.feneconGridSchreibOk')?.val, true);
  assert.strictEqual(native.adapter._states.get('speicher.regelung.batteryPowerFeedbackMeasuredW')?.val, -250, '604-Aktorfeedback muss vor dem allgemeinen Anzeige-DP gewinnen');

  // 2) AUTO faellt ohne vollstaendigen nativen Pfad auf direkte ESS-Leistung zurueck.
  const directEntries = baseEntries({ nvpW: 550, essActualW: 0, genericBatteryW: 0 });
  delete directEntries['st.feneconGridSetpointW'];
  delete directEntries['st.feneconEssActivePowerW'];
  directEntries['st.batteryPowerW'] = entry(0, 'fenecon.display.actual');
  directEntries['st.targetPowerW'] = entry(0, 'fems.ess0.SetActivePowerEquals');
  const directAuto = await runStorage(directEntries, { feneconHybridControlMode: 'auto' });
  assert.strictEqual(directAuto.adapter._states.get('speicher.regelung.commandFamily')?.val, 'signed');
  assert.strictEqual(directAuto.dp.lastWrite('st.targetPowerW'), 500, 'direkter Fallback muss den Batterie-Sollwert schreiben');

  // 3) Explizit nativer Modus darf bei fehlender Zuordnung nicht heimlich direkt schreiben.
  const explicitMissing = await runStorage(directEntries, { feneconHybridControlMode: 'fems-grid-target' });
  assert(!explicitMissing.dp.writesFor('st.targetPowerW').some((row) => row.value !== 0), 'explizit nativer Modus darf nicht auf direkten ESS-Writer zurueckfallen');
  assert(String(explicitMissing.adapter._states.get('speicher.regelung.requestGrund')?.val || '').includes('FENECON-Regelpfad unvollständig'));

  // 4) Direkte ESS-Leistung wird an das frische 702/704-Fenster begrenzt.
  const clampEntries = baseEntries({ nvpW: 1550, essActualW: 0, genericBatteryW: 0 });
  delete clampEntries['st.feneconGridSetpointW'];
  clampEntries['st.feneconMinActivePowerW'] = entry(-300, 'fems.ess0.MinimumPowerSetPoint');
  clampEntries['st.feneconMaxActivePowerW'] = entry(400, 'fems.ess0.MaximumPowerSetPoint');
  clampEntries['st.targetPowerW'] = entry(0, 'fems.ess0.SetActivePowerEquals');
  const directClamp = await runStorage(clampEntries, { feneconHybridControlMode: 'direct-ess' });
  assert.strictEqual(directClamp.dp.lastWrite('st.targetPowerW'), 400, 'direkter Sollwert muss auf FEMS-Maximum 400 W begrenzt werden');
  assert.strictEqual(directClamp.adapter._states.get('speicher.regelung.feneconDirectClampAktiv')?.val, true);

  // 5) Der NVP-Koordinator bewertet den nativen Pfad am NVP-Ziel. Innerhalb
  // der Reaktionszeit wartet PV auf FEMS; danach wird der reale Rest-NVP freigegeben.
  const nativeWaiting = buildNvpCoordinatorSnapshot({
    now: now(),
    nvpUsable: true,
    rawNvpW: 550,
    nvpTargetW: 50,
    deadbandW: 20,
    topology: 'single',
    storageActualW: -250,
    storageActualTrusted: true,
    storageActualAgeMs: 0,
    storageTargetW: 250,
    storageWriteOk: true,
    storageCommandEffective: true,
    storageWriteStatus: 'fenecon-fems-grid-geschrieben',
    nativeFemsGridActive: true,
    nativeFemsGridTargetW: 50,
    nativeFemsGridWriteAccepted: true,
    responseAgeMs: 1000,
    responseGraceMs: 10000,
    responseDeadbandW: 20,
  });
  assert.strictEqual(nativeWaiting.status, 'waiting-fenecon-grid-response');
  assert.strictEqual(nativeWaiting.projectedAfterStorageW, 50, 'PV darf waehrend der FEMS-Reaktionszeit nur den prognostizierten NVP-Rest sehen');

  const nativeTimeout = buildNvpCoordinatorSnapshot({
    ...nativeWaiting,
    now: now(),
    nvpUsable: true,
    rawNvpW: 550,
    storageWriteOk: true,
    storageCommandEffective: true,
    storageWriteStatus: 'fenecon-fems-grid-geschrieben',
    nativeFemsGridActive: true,
    nativeFemsGridTargetW: 50,
    nativeFemsGridWriteAccepted: true,
    responseAgeMs: 11000,
    responseGraceMs: 10000,
    responseDeadbandW: 20,
  });
  assert.strictEqual(nativeTimeout.status, 'fenecon-grid-response-timeout');
  assert.strictEqual(nativeTimeout.projectedAfterStorageW, 550, 'nach Timeout muss PV den echten Rest-NVP bearbeiten duerfen');

  const nativeReached = buildNvpCoordinatorSnapshot({
    ...nativeWaiting,
    now: now(),
    rawNvpW: 55,
    responseAgeMs: 1500,
  });
  assert.strictEqual(nativeReached.status, 'fenecon-grid-target-reached');
  assert.strictEqual(nativeReached.stable, true);

  // 6) AppCenter-/Mapping-Vertrag: neue Rollen vorhanden, alte Loeschlogik entfernt,
  // und FENECON-DC-PV-Hinweis verweist auf den internen DC-Wert statt Gesamt-PV.
  const uiTs = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'www/ems-apps.html'), 'utf8');
  const mappingTs = fs.readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/modules/storage-mapping.ts'), 'utf8');
  assert(uiTs.includes("feneconGridSetpointObjectId"));
  assert(uiTs.includes("feneconEssActivePowerObjectId"));
  assert(uiTs.includes('ProductionDcActualPower'));
  assert(!uiTs.includes('delete patch.storage.datapoints.feneconGridSetpointObjectId'));
  assert(html.includes('storageFeneconControlMode'));
  assert(mappingTs.includes("key: 'st.feneconGridSetpointW'"));
  assert(mappingTs.includes("key: 'st.feneconEssActivePowerW'"));
  assert(mappingTs.includes("key: 'st.feneconMinActivePowerW'"));
  assert(mappingTs.includes("key: 'st.feneconMaxActivePowerW'"));

  console.log('[storage-fenecon-hybrid-controller] OK: nativer FEMS-NVP-Regler, direkter ESS-Fallback, 702/704-Clamp und NVP-Restkoordination sind abgesichert.');
})().catch((error) => {
  console.error('[storage-fenecon-hybrid-controller] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
