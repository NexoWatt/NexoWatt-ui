// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nvp-coordinator-storage-pv.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-nvp-coordinator-storage-pv.js
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
 * Original-Hash: b0b347b7541aa7801daee7ada209e3a6bf03dd719b62fb7dd96bf3ab595b2183
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
 * Regression 0.8.128:
 * - Speicher/Farm regelt den NVP zuerst.
 * - PV-/WR-Regelung sieht nur die nach der erwarteten Speicherreaktion
 *   verbleibende Einspeisung.
 * - Blockierte, fehlgeschlagene oder nicht reagierende Speicherbefehle werden
 *   nicht unbegrenzt vorweggenommen.
 * - Richtungswechsel werden ohne künstliche 0-W-Runde prognostiziert.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  NvpCoordinatorModule,
  buildNvpCoordinatorSnapshot,
} = require('../ems/modules/nvp-coordinator');

const base = {
  now: 100000,
  nvpUsable: true,
  nvpSource: 'signed',
  nvpMeasurementAgeMs: 100,
  nvpTargetW: 50,
  deadbandW: 30,
  topology: 'single',
  storageActualAgeMs: 100,
  storageActualTrusted: true,
  storageWriteOk: true,
  storageWriteStatus: 'geschrieben',
  responseAgeMs: 0,
  responseGraceMs: 5000,
  responseDeadbandW: 150,
  actualMaxAgeMs: 30000,
};

// 1) Feldfall: 1.011 W Bezug, Speicher lädt noch 73 W, neues Soll +888 W.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: 1011,
    storageActualW: -73,
    storageTargetW: 888,
  });
  assert.strictEqual(result.storagePendingDeltaW, 961);
  assert.strictEqual(result.projectedNvpW, 50);
  assert.strictEqual(result.pvControlNvpW, 50);
  assert.strictEqual(result.storageCommandCredited, true);
  assert.strictEqual(result.status, 'waiting-storage-response');
}

// 2) 2 kW Export, Speicher kann 1,4 kW aufnehmen: nur 600 W Restexport an PV.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -2000,
    storageActualW: 0,
    storageTargetW: -1400,
  });
  assert.strictEqual(result.projectedNvpW, -600);
  assert.strictEqual(result.pvControlNvpW, -600);
}

// 3) Speicher kann den Export bis auf den Zielbezug aufnehmen: PV bleibt frei.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -1200,
    storageActualW: 0,
    storageTargetW: -1250,
  });
  assert.strictEqual(result.projectedNvpW, 50);
  assert.strictEqual(result.projectedWithinBand, true);
}

// 4) Authority-/Safety-Block: kein optimistisches Vorwegnehmen.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -2000,
    storageActualW: 0,
    storageTargetW: -1400,
    storageWriteOk: false,
    storageWriteStatus: 'blocked-by-actuator-authority',
  });
  assert.strictEqual(result.storageCommandCredited, false);
  assert.strictEqual(result.pvControlNvpW, -2000);
  assert.strictEqual(result.status, 'storage-blocked');
}

// 5) Write-Fehler: PV muss den realen Rest sehen.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -2000,
    storageActualW: 0,
    storageTargetW: -1400,
    storageWriteOk: false,
    storageWriteStatus: 'io-write-fehler',
  });
  assert.strictEqual(result.storageCommandCredited, false);
  assert.strictEqual(result.pvControlNvpW, -2000);
  assert.strictEqual(result.status, 'storage-write-failed');
}

// 6) Speicher reagiert nach Ablauf der Grace-Zeit nicht: Vorwegnahme endet.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -2000,
    storageActualW: 0,
    storageTargetW: -1400,
    responseAgeMs: 6000,
  });
  assert.strictEqual(result.storageCommandCredited, false);
  assert.strictEqual(result.pvControlNvpW, -2000);
  assert.strictEqual(result.status, 'storage-response-timeout');
}

// 7) Direkter Richtungswechsel: Sollwert wechselt ohne 0-W-Zwischenschritt.
{
  const chargeToDischarge = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: 900,
    storageActualW: -500,
    storageTargetW: 400,
  });
  assert.strictEqual(chargeToDischarge.storagePendingDeltaW, 900);
  assert.strictEqual(chargeToDischarge.projectedNvpW, 0);
  assert.strictEqual(chargeToDischarge.storageTargetW, 400);

  const dischargeToCharge = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -900,
    storageActualW: 500,
    storageTargetW: -400,
  });
  assert.strictEqual(dischargeToCharge.storagePendingDeltaW, -900);
  assert.strictEqual(dischargeToCharge.projectedNvpW, 0);
  assert.strictEqual(dischargeToCharge.storageTargetW, -400);
}

// 8) Farm fordert +900 W, Hardware akzeptiert nur +400 W: NVP darf nur +400 W vorwegnehmen.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: 900,
    topology: 'farm',
    storageActualW: 0,
    storageTargetW: 400,
    storageCommandEffective: true,
    storageWriteOk: false,
    storagePartiallyAccepted: true,
    storageRequestSatisfied: false,
    storageWriteStatus: 'farm-partial',
    storageFailedW: 500,
  });
  assert.strictEqual(result.projectedNvpW, 500);
  assert.strictEqual(result.storagePartiallyAccepted, true);
  assert.strictEqual(result.status, 'waiting-storage-response-partial');
}

// 9) Erfolgreich akzeptierte flexible Last-/Erzeugeränderungen verändern nur den finalen Rest.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -2000,
    storageActualW: 0,
    storageTargetW: -1400,
    acceptedFlexibleNetLoadDeltaW: 400,
    acceptedFlexibleLoadDeltaW: 700,
    acceptedFlexibleGenerationDeltaW: 300,
    acceptedFlexibleCreditedCount: 2,
  });
  assert.strictEqual(result.projectedAfterStorageW, -600);
  assert.strictEqual(result.projectedNvpW, -200);
  assert.strictEqual(result.acceptedFlexibleNetLoadDeltaW, 400);
}

// 10) Unbekannte, aber akzeptierte Aktorumschaltung: PV wartet auf den nächsten frischen NVP.
{
  const result = buildNvpCoordinatorSnapshot({
    ...base,
    rawNvpW: -1200,
    storageActualW: 0,
    storageTargetW: 0,
    acceptedFlexibleUncertainCount: 1,
  });
  assert.strictEqual(result.status, 'waiting-flexible-actuator');
}

/**
 * Code-Teil: FakeAdapter
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class FakeAdapter {
  constructor() {
    this.config = {
      storage: {
        staleTimeoutSec: 30,
        selfTargetGridImportW: 50,
        selfDeadbandW: 30,
      },
      nvpCoordinator: {
        storageResponseGraceSec: 5,
        logIntervalSec: 5,
      },
    };
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    this._states = new Map();
    this._nvpFreshnessSnapshot = {
      ts: Date.now(),
      usable: true,
      connected: true,
      netW: 1011,
      measurementAgeMs: 100,
      status: 'ok',
      source: 'signed',
    };
  }
  async setObjectNotExistsAsync() {}
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    this._states.set(String(id), { val, ack: !!ack, ts: Date.now(), lc: Date.now() });
  }
  async getStateAsync(id) { return this._states.get(String(id)) || null; }
  put(id, value) { this._states.set(String(id), { val: value, ack: true, ts: Date.now(), lc: Date.now() }); }
  value(id) { const state = this._states.get(String(id)); return state ? state.val : undefined; }
}

// 11) Modul-Integration: GridConstraints erhält exakt den prognostizierten Rest-NVP.
(async () => {
  const adapter = new FakeAdapter();
  adapter.put('speicher.regelung.topologie', 'farm');
  adapter.put('speicher.regelung.sollW', 888);
  adapter.put('speicher.regelung.acceptedSollW', 888);
  adapter.put('speicher.regelung.commandEffective', true);
  adapter.put('speicher.regelung.requestSatisfied', true);
  adapter.put('speicher.regelung.partiallyAccepted', false);
  adapter.put('speicher.regelung.schreibOk', true);
  adapter.put('speicher.regelung.schreibStatus', 'farm');
  adapter.put('speicher.regelung.batteryPowerFeedbackMeasuredW', -73);
  adapter.put('speicher.regelung.batteryPowerFeedbackAgeMs', 100);
  adapter.put('speicher.regelung.batteryPowerBalanceTrusted', true);
  adapter.put('speicher.regelung.batteryPowerTrusted', true);
  adapter.put('speicher.regelung.selfTargetGridImportW', 50);
  adapter.put('storageFarm.totalPowerW', -73);

  let postInput = null;
  const fakeGrid = {
    async tickPostStorage(input) {
      postInput = { ...input };
      return {
        action: 'within_deadband',
        mode: 'group',
        applied: false,
        rawGridW: input.rawNvpW,
        controlGridW: input.pvControlNvpW,
        controlExportW: Math.max(0, -input.pvControlNvpW),
      };
    },
  };

  const module = new NvpCoordinatorModule(adapter, null, fakeGrid, () => true);
  await module.init();
  await module.tick();

  assert(postInput, 'PV-Nachregelung muss aufgerufen werden');
  assert.strictEqual(postInput.rawNvpW, 1011);
  assert.strictEqual(postInput.pvControlNvpW, 50);
  assert.strictEqual(adapter.value('ems.nvpCoordinator.projectedNvpW'), 50);
  assert.strictEqual(adapter.value('ems.nvpCoordinator.storageCommandCredited'), true);
  assert(Array.isArray(adapter._nvpCoordinatorSnapshot.log));
  assert(adapter._nvpCoordinatorSnapshot.log.length >= 1);

  // 12) Lizenz-/App-Gate darf durch den nachgelagerten Direktaufruf nicht umgangen werden.
  let disabledCalls = 0;
  const disabledGrid = {
    async tickPostStorage() {
      disabledCalls += 1;
      return { action: 'unexpected', applied: true };
    },
  };
  const disabledModule = new NvpCoordinatorModule(adapter, null, disabledGrid, () => false);
  await disabledModule.tick();
  assert.strictEqual(disabledCalls, 0, 'Deaktivierte oder nicht lizenzierte Grid-Regelung darf keinen PV-Writepfad ausführen');

  // 13) Architekturvertrag: Planung < Speicher < Koordinator < Tarifstatus.
  const root = path.resolve(__dirname, '..');
  const managerSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
  const gridSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/grid-constraints.ts'), 'utf8');
  const gridIndex = managerSource.indexOf("key: 'gridConstraints'");
  const chargingIndex = managerSource.indexOf("key: 'chargingManagement'");
  const storageIndex = managerSource.indexOf("key: 'speicherRegelung'");
  const multiUseIndex = managerSource.indexOf("key: 'multiUse'");
  const thermalIndex = managerSource.indexOf("key: 'thermalControl'");
  const heatingIndex = managerSource.indexOf("key: 'heatingRodControl'");
  const nexoLogicIndex = managerSource.indexOf("key: 'nexoLogicBudget'");
  const bhkwIndex = managerSource.indexOf("key: 'bhkwControl'");
  const generatorIndex = managerSource.indexOf("key: 'generatorControl'");
  const thresholdIndex = managerSource.indexOf("key: 'thresholdControl'");
  const coordinatorIndex = managerSource.indexOf("key: 'nvpCoordinator'");
  const tariffIndex = managerSource.indexOf("key: 'tariffStatus'");
  assert(gridIndex >= 0
    && chargingIndex > gridIndex
    && storageIndex > chargingIndex
    && multiUseIndex > storageIndex
    && thermalIndex > multiUseIndex
    && heatingIndex > thermalIndex
    && nexoLogicIndex > heatingIndex
    && bhkwIndex > nexoLogicIndex
    && generatorIndex > bhkwIndex
    && thresholdIndex > generatorIndex
    && coordinatorIndex > thresholdIndex
    && tariffIndex > coordinatorIndex,
  'Reihenfolge muss Grid-Planung → EVCS → Speicher → flexible Aktoren/Erzeuger → finaler NVP/PV-Koordinator → Tarifstatus sein');
  assert(managerSource.includes('gridConstraintsModule.setDeferredDynamicPv(true)'), 'Dynamische PV-Regelung muss bis nach dem Speicher verschoben werden');
  assert(managerSource.includes("() => this._licenseAllowsApp('grid') && !!this.adapter.config.enableGridConstraints"), 'Nachgelagerte PV-Regelung muss dasselbe Lizenz-/App-Gate wie GridConstraints verwenden');
  assert(gridSource.includes("status: coordinated ? 'handled_by_central_ems'"), 'Koordinierter Export-Guard darf keine zweite Senken-Schreibstrecke starten');
  assert(gridSource.includes('const sinkCommandReady = !coordinated && sinkCommandReadyRaw'), 'Senkenkommando muss im koordinierten Modus gesperrt sein');

  console.log('[nvp-coordinator-storage-pv] OK: Speicher/Farm regelt zuerst; PV erhält nur den belastbaren Rest-NVP, ohne Doppelwriter oder 0-W-Richtungswechselrunde.');
})().catch((error) => {
  console.error('[nvp-coordinator-storage-pv] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
