// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-tariff-storage-status-truth.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-tariff-storage-status-truth.js
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
 * Original-Hash: 75da4cef87e714b3620c0bd42cdc2d7ef548e5119397a44cf7725cb86a963dc8
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
 * Regression 0.8.127: Tarifabsicht, finaler Speicher-Sollwert, Gate-/Write-
 * Ergebnis und Istwert-Rückmeldung müssen getrennt sichtbar bleiben.
 * `tarif.statusText` darf Laden/Entladen nur bei frischer bestätigender
 * Istleistung behaupten.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  TariffStatusModule,
  classifyTariffStorageStatus,
} = require('../ems/modules/tariff-status');

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
  constructor(tariff = {}) {
    this.config = {
      storage: { staleTimeoutSec: 30 },
      tariffStatus: { readbackDeadbandW: 100, readbackGraceSec: 20, readbackMaxAgeSec: 30 },
    };
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    this._states = new Map();
    this._tarifVis = {
      ts: Date.now(),
      aktiv: true,
      tarifAktiv: true,
      modus: 2,
      state: 'teuer',
      preisAktuell: 0.36,
      netFeeEnabled: false,
      netFeeMode: 'off',
      speicherSollW: 3000,
      storageTopology: 'single',
      storageWriterAvailable: true,
      storageAuthorityReason: 'single-active',
      storageIntentStatus: 'discharge',
      storageIntentReason: 'Teurer Tarif – Speicherentladung gewünscht',
      ...tariff,
    };
  }

  async setObjectNotExistsAsync() {}

  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
      ? value.val
      : value;
    this._states.set(String(id), { val, ack: value && typeof value === 'object' ? value.ack : !!ack, ts: Date.now(), lc: Date.now() });
  }

  async getStateAsync(id) {
    return this._states.get(String(id)) || null;
  }

  put(id, value) {
    this._states.set(String(id), { val: value, ack: true, ts: Date.now(), lc: Date.now() });
  }

  value(id) {
    const state = this._states.get(String(id));
    return state ? state.val : undefined;
  }
}

/**
 * Code-Teil: putStorageChain
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function putStorageChain(adapter, values = {}) {
  const defaults = {
    topology: 'single',
    topologyReason: 'single-active',
    requestW: 900,
    requestSource: 'tarif/eigenverbrauch',
    requestReason: 'Netzbezug ausgleichen',
    finalW: 900,
    finalSource: 'eigenverbrauch',
    finalReason: 'NVP-Zielwert',
    writeOk: true,
    writeStatus: 'geschrieben',
    actualW: 870,
    actualAgeMs: 500,
    actualTrusted: true,
    farmDispatch: null,
  };
  const v = { ...defaults, ...values };
  adapter.put('tarif.aktiv', true);
  adapter.put('speicher.regelung.topologie', v.topology);
  adapter.put('speicher.regelung.topologieGrund', v.topologyReason);
  adapter.put('speicher.regelung.requestW', v.requestW);
  adapter.put('speicher.regelung.requestQuelle', v.requestSource);
  adapter.put('speicher.regelung.requestGrund', v.requestReason);
  adapter.put('speicher.regelung.sollW', v.finalW);
  adapter.put('speicher.regelung.quelle', v.finalSource);
  adapter.put('speicher.regelung.grund', v.finalReason);
  adapter.put('speicher.regelung.schreibOk', v.writeOk);
  adapter.put('speicher.regelung.schreibStatus', v.writeStatus);
  adapter.put('speicher.regelung.batteryPowerFeedbackMeasuredW', v.actualW);
  adapter.put('speicher.regelung.batteryPowerFeedbackAgeMs', v.actualAgeMs);
  adapter.put('speicher.regelung.batteryPowerBalanceTrusted', v.actualTrusted);
  adapter.put('speicher.regelung.batteryPowerTrusted', v.actualTrusted);
  adapter.put('speicher.regelung.zeroWriteFirewallAction', 'pass');
  adapter.put('speicher.regelung.zeroWriteFirewallReason', 'non-zero');
  adapter.put('speicher.regelung.zeroWriteFirewallExplicitStop', v.finalW === 0);
  if (v.farmDispatch) adapter.put('storageFarm.lastDispatchJson', JSON.stringify({ ts: Date.now(), ...v.farmDispatch }));
}

/**
 * Code-Teil: runScenario
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function runScenario({ tariff = {}, storage = {}, ageTargetMs = 0 } = {}) {
  const adapter = new FakeAdapter(tariff);
  putStorageChain(adapter, storage);
  const module = new TariffStatusModule(adapter, null);
  await module.init();
  if (ageTargetMs > 0) {
    const topology = storage.topology || 'single';
    const finalW = Object.prototype.hasOwnProperty.call(storage, 'finalW') ? storage.finalW : 900;
    const writeOk = Object.prototype.hasOwnProperty.call(storage, 'writeOk') ? storage.writeOk : true;
    const writeStatus = storage.writeStatus || 'geschrieben';
    const lower = String(writeStatus || '').toLowerCase();
    const phase = writeOk || lower === 'unverändert'
      ? 'effective'
      : ((lower.includes('no-write') || lower.includes('hold')) ? 'hold' : 'not-effective');
    const direction = finalW < 0 ? 'charge' : (finalW > 0 ? 'discharge' : 'idle');
    module._lastTargetSignature = `${topology}|${direction}|${phase}`;
    module._targetSinceMs = Date.now() - ageTargetMs;
  }
  await module.tick();
  return { adapter, module };
}

(async () => {
  // 1) Bestätigte Entladung darf als tatsächliche Entladung erscheinen.
  {
    const { adapter } = await runScenario();
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharging');
    assert.strictEqual(adapter.value('tarif.speicherFinalW'), 900);
    assert.strictEqual(adapter.value('tarif.speicherReadbackW'), 870);
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'confirmed-discharging');
    assert.match(adapter.value('tarif.statusText'), /Speicher entlädt 870 W/);
    assert.match(adapter.value('tarif.statusText'), /Tarifwunsch Entladen 3000 W/);
    assert.match(adapter.value('tarif.statusText'), /Soll 900 W; Richtung bestätigt/);
  }

  // 2) Gegenläufiger Istwert innerhalb der Einschwingzeit ist nur eine Anforderung.
  {
    const { adapter } = await runScenario({ storage: { actualW: -450, actualTrusted: true } });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharge-requested');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'pending-discharging');
    assert.match(adapter.value('tarif.statusText'), /Entladen 900 W angefordert/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 3) Nach Ablauf der Einschwingzeit wird die Gegenrichtung als Abweichung gemeldet.
  {
    const { adapter } = await runScenario({ storage: { actualW: -450, actualTrusted: true }, ageTargetMs: 30000 });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'mismatch');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'opposite-direction');
    assert.match(adapter.value('tarif.statusText'), /bestätigt die Richtung nicht/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 4) Bestätigtes Laden nutzt die negative Vorzeichenkonvention korrekt.
  {
    const { adapter } = await runScenario({
      tariff: {
        state: 'guenstig',
        speicherSollW: -2500,
        storageIntentStatus: 'charge',
        storageIntentReason: 'Günstiger Tarif – Speicherladen gewünscht',
      },
      storage: {
        requestW: -1800,
        finalW: -1500,
        actualW: -1420,
        finalSource: 'tarif',
        finalReason: 'Günstiges Preisfenster',
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'charging');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'confirmed-charging');
    assert.match(adapter.value('tarif.statusText'), /Speicher lädt 1420 W/);
  }

  // 5) 0 W ist ein echter Warte-/Stoppzustand und keine Lade-/Entladeaussage.
  {
    const { adapter } = await runScenario({
      tariff: {
        state: 'guenstig',
        speicherSollW: -2500,
        storageIntentStatus: 'charge',
        storageIntentReason: 'Günstiger Tarif – Speicherladen gewünscht',
      },
      storage: {
        requestW: -2500,
        finalW: 0,
        actualW: 35,
        finalSource: 'sicherheit',
        finalReason: 'SoC-Maximum erreicht',
        writeOk: true,
        writeStatus: 'geschrieben',
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'waiting');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'confirmed-stop');
    assert.match(adapter.value('tarif.statusText'), /Speicher wartet\/ruht \(0 W bestätigt/);
    assert.match(adapter.value('tarif.statusText'), /SoC-Maximum erreicht/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher lädt|Speicher entlädt/);
  }

  // 6) Ein Gate-/Authority-Block darf nie als laufende Entladung erscheinen.
  {
    const { adapter } = await runScenario({
      storage: {
        topology: 'farm',
        topologyReason: 'farm-active',
        writeOk: false,
        writeStatus: 'farm-nicht-moeglich:blocked-by-actuator-authority',
        actualW: 0,
        actualTrusted: true,
        farmDispatch: {
          targetW: 900,
          deliveredW: 0,
          unservedW: 900,
          results: [{ authorityBlocked: true }],
        },
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'blocked');
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'blocked');
    assert.match(adapter.value('tarif.statusText'), /Speicherbefehl blockiert/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 7) Farm-Teilverteilung bleibt sichtbar, ohne den Readback mit Dispatch zu verwechseln.
  {
    const { adapter } = await runScenario({
      storage: {
        topology: 'farm',
        topologyReason: 'farm-active',
        finalW: 900,
        actualW: 560,
        actualTrusted: true,
        writeOk: true,
        writeStatus: 'farm',
        farmDispatch: {
          targetW: 900,
          deliveredW: 600,
          unservedW: 300,
          results: [{ authorityBlocked: false }],
        },
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharging');
    assert.strictEqual(adapter.value('tarif.speicherFarmDeliveredW'), 600);
    assert.strictEqual(adapter.value('tarif.speicherFarmUnservedW'), 300);
    assert.match(adapter.value('tarif.statusText'), /Farm-Dispatch 600 W von 900 W, offen 300 W/);
  }

  // 8) Stale Tarifabsicht darf eine unabhängige Eigenverbrauchsreaktion nicht als Tarifaktion ausgeben.
  {
    const { adapter } = await runScenario({
      tariff: {
        state: 'unbekannt',
        dynamicTariffStale: true,
        speicherSollW: 0,
        storageIntentStatus: 'wait',
        storageIntentReason: 'Tarifdaten sind zu alt – keine neue Tarifaktion',
      },
      storage: {
        requestW: 1007,
        finalW: 1007,
        actualW: 920,
        finalSource: 'eigenverbrauch',
        finalReason: 'NVP-Netzbezug ausgleichen',
      },
    });
    assert.match(adapter.value('tarif.statusText'), /Tarifwunsch Warten/);
    assert.match(adapter.value('tarif.statusText'), /Tarifdaten sind zu alt/);
    assert.match(adapter.value('tarif.statusText'), /Speicher entlädt 920 W/);
    assert.match(adapter.value('tarif.statusText'), /Quelle eigenverbrauch/);
  }

  // 9) Ohne frische Rückmeldung bleibt es bei einer angeforderten Aktion.
  {
    const { adapter } = await runScenario({ storage: { actualW: null, actualAgeMs: null, actualTrusted: false } });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharge-requested');
    assert.strictEqual(adapter.value('tarif.speicherReadbackFresh'), false);
    assert.match(adapter.value('tarif.statusText'), /keine frische Istwert-Rückmeldung/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 10) Ein veralteter Modul-Snapshot darf keine alte Tarifabsicht als live ausgeben.
  {
    const { adapter } = await runScenario({
      tariff: { ts: Date.now() - 30000, speicherSollW: -5000, storageIntentStatus: 'charge' },
      storage: { finalW: 900, actualW: 860, finalSource: 'eigenverbrauch' },
    });
    assert.strictEqual(adapter.value('tarif.intentSnapshotFresh'), false);
    assert.strictEqual(adapter.value('tarif.speicherIntentW'), 0);
    assert.strictEqual(adapter.value('tarif.speicherIntentStatus'), 'stale');
    assert.match(adapter.value('tarif.statusText'), /Tarifstatus veraltet/);
    assert.match(adapter.value('tarif.statusText'), /Speicher entlädt 860 W/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Tarifwunsch Laden 5000 W/);
  }

  // 11) Reine Klassifikation: no-writer und bewusster No-Write-Hold sind getrennt.
  {
    const noWriter = classifyTariffStorageStatus({ active: true, topology: 'none', finalW: 0, writeStatus: 'kein-aktiver-speicher-ausgang' });
    const hold = classifyTariffStorageStatus({ active: true, topology: 'single', finalW: 700, writeStatus: 'storage:no-write-hold', actualW: 650, actualAgeMs: 1000, actualTrusted: true });
    assert.strictEqual(noWriter.status, 'no-writer');
    assert.strictEqual(hold.status, 'hold');
    assert.strictEqual(hold.gateStatus, 'hold');
  }

  // 12) Ein echter Write-Fehler hat Vorrang vor einem noch laufenden alten Istwert.
  {
    const { adapter } = await runScenario({ storage: { writeOk: false, writeStatus: 'io-write-fehler', actualW: 870, actualTrusted: true } });
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'write-failed');
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'write-failed');
    assert.strictEqual(adapter.value('tarif.speicherCommandEffective'), false);
    assert.match(adapter.value('tarif.statusText'), /Speicherbefehl nicht geschrieben/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 13) `unverändert` hält einen bereits wirksamen Befehl und ist kein Write-Fehler.
  {
    const { adapter } = await runScenario({ storage: { writeOk: false, writeStatus: 'unverändert', actualW: 860, actualTrusted: true } });
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'accepted');
    assert.strictEqual(adapter.value('tarif.speicherCommandEffective'), true);
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharging');
  }

  // 14) Ein alter Farm-Dispatch darf nicht als aktuelle Verteilung erscheinen.
  {
    const { adapter } = await runScenario({ storage: { topology: 'farm', writeStatus: 'farm', actualW: 860, farmDispatch: { ts: Date.now() - 60000, targetW: 900, deliveredW: 600, unservedW: 300 } } });
    assert.strictEqual(adapter.value('tarif.speicherFarmDeliveredW'), null);
    assert.strictEqual(adapter.value('tarif.speicherFarmUnservedW'), null);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Farm-Dispatch/);
  }

  // 15) Architekturvertrag: TarifVis schreibt nur die Absicht; Finalizer kommt nach StorageControl.
  {
    const root = path.resolve(__dirname, '..');
    const tariffSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/tarif-vis.ts'), 'utf8');
    const managerSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
    assert(!tariffSource.includes("_setIfChanged('tarif.statusText'"), 'TarifVis darf den sichtbaren finalen Status nicht mehr vorzeitig schreiben');
    const storageIndex = managerSource.indexOf("key: 'speicherRegelung'");
    const finalizerIndex = managerSource.indexOf("key: 'tariffStatus'");
    assert(storageIndex >= 0 && finalizerIndex > storageIndex, 'TariffStatus muss nach SpeicherRegelung laufen');
  }

  console.log('[tariff-storage-status-truth] OK: Tarifabsicht, Resolver, Gate/Write, Farm-Dispatch und frischer Istwert sind getrennt; Laden/Entladen wird nur bei bestätigtem Readback angezeigt.');
})().catch((error) => {
  console.error('[tariff-storage-status-truth] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
