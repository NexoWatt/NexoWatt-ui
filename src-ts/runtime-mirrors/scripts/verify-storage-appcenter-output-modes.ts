// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-appcenter-output-modes.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-appcenter-output-modes.js
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
 * Original-Hash: c771430a066e6aeeba49c366eef5d8ff728212deb687601d9f89070d08f228ac
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
 * Regression 0.8.124: Alle beschreibbaren Einzel-Speicher-DPs aus dem
 * AppCenter bleiben am finalen Gate-/Executor-Pfad gekoppelt.
 *
 * Geprüft werden freie ioBroker-IDs für:
 * - signed + getrennte Lade-/Entlade-Sollwerte,
 * - Run/Externe-Regelung und Reserve-SoC,
 * - Leistungsgrenzen,
 * - Lade-/Entladefreigaben,
 * - bewusst einseitige Zuordnungen,
 * - echte Mehrfachzuordnungen als Sicherheitskonflikt.
 */
const assert = require('assert');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

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
    this.entries = new Map(Object.entries(entries));
    this.writes = [];
  }
  getEntry(key) { return this.entries.get(key) || null; }
  async writeNumber(key, value) {
    const entry = this.getEntry(key);
    if (!entry) return false;
    this.writes.push({ key, objectId: entry.objectId, value: Number(value), type: 'number' });
    return true;
  }
  async writeBoolean(key, value) {
    const entry = this.getEntry(key);
    if (!entry) return false;
    this.writes.push({ key, objectId: entry.objectId, value: !!value, type: 'boolean' });
    return true;
  }
  last(key) {
    const list = this.writes.filter((row) => row.key === key);
    return list.length ? list[list.length - 1] : null;
  }
  count(key) { return this.writes.filter((row) => row.key === key).length; }
  clear() { this.writes.length = 0; }
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
function makeAdapter(storage = {}) {
  const states = new Map();
  return {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      emsApps: { apps: { storagefarm: { installed: false, enabled: false } } },
      storageFarm: { storages: [] },
      storage: { controlMode: 'targetPower', reserveMinSocPct: 20, ...storage },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async getStateAsync(id) { return states.get(String(id)) || null; },
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(String(id), { val, ts: Date.now(), ack: true });
    },
    async setObjectNotExistsAsync() {},
    _states: states,
  };
}

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
function entry(objectId, extra = {}) { return { objectId, scale: 1, offset: 0, invert: false, ...extra }; }
/**
 * Code-Teil: state
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function state(adapter, id) { const rec = adapter._states.get(id); return rec ? rec.val : undefined; }

/**
 * Code-Teil: verifyTargetPowerAllOutputs
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function verifyTargetPowerAllOutputs() {
  const adapter = makeAdapter({ controlMode: 'targetPower' });
  const dp = new FakeDp({
    'st.targetPowerW': entry('custom.vendor.ctrl.signedTarget'),
    'st.targetChargePowerW': entry('modbus.17.free.chargeTarget'),
    'st.targetDischargePowerW': entry('mqtt.0/site/storage/dischargeTarget'),
    'st.run': entry('javascript.0.storage.externalControl'),
    'st.reserveSocPct': entry('openems.0.edge.controller.reserveSoc'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._effectiveReserveSocPct = 27;

  await mod._applyTargetW(-803, 'final gated charge', 'pv');
  assert.strictEqual(dp.last('st.targetPowerW').value, -803, 'signed AppCenter-DP erhält den finalen Lade-Sollwert nicht');
  assert.strictEqual(dp.last('st.targetChargePowerW').value, 803, 'getrennter Lade-DP wird nicht bedient');
  assert.strictEqual(dp.last('st.targetDischargePowerW').value, 0, 'Gegenrichtung muss sicher auf 0 W gesetzt werden');
  assert.strictEqual(dp.last('st.run').value, true, 'Run-DP folgt dem erfolgreichen gegateten Hauptpfad nicht');
  assert.strictEqual(dp.last('st.reserveSocPct').value, 27, 'Reserve-DP ist nicht mit derselben SoC-Sicherheitsgrenze gekoppelt');
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'signed+split-geschrieben');
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibOk'), true);

  const writtenIds = new Set(dp.writes.map((row) => row.objectId));
  for (const id of [
    'custom.vendor.ctrl.signedTarget',
    'modbus.17.free.chargeTarget',
    'mqtt.0/site/storage/dischargeTarget',
    'javascript.0.storage.externalControl',
    'openems.0.edge.controller.reserveSoc',
  ]) assert(writtenIds.has(id), `frei benannter AppCenter-DP wurde verändert oder ausgelassen: ${id}`);

  // Direkter Richtungswechsel im produktiven Einzel-Speicher-Writer: Der neue
  // positive Sollwert wird im unmittelbar folgenden Aufruf geschrieben. Bei
  // Split-DPs wird die inaktive Richtung im selben Tick auf 0 gesetzt; das ist
  // keine separate 0-W-Runde und der signed Gesamt-Sollwert bleibt non-zero.
  dp.clear();
  await mod._applyTargetW(1207, 'direct charge-to-discharge', 'eigenverbrauch');
  assert.strictEqual(dp.last('st.targetPowerW').value, 1207, 'signed DP muss den Entladesollwert direkt ohne 0-W-Zwischenrunde erhalten');
  assert.strictEqual(dp.last('st.targetChargePowerW').value, 0, 'inaktiver Split-Lade-DP muss im selben Tick auf 0 gesetzt werden');
  assert.strictEqual(dp.last('st.targetDischargePowerW').value, 1207, 'aktiver Split-Entlade-DP muss im selben Tick den vollen Sollwert erhalten');
  assert.strictEqual(dp.last('st.run').value, true, 'Run darf beim direkten Richtungswechsel nicht auf false fallen');
  assert.strictEqual(dp.writes.some((row) => row.key === 'st.targetPowerW' && row.value === 0), false, 'signed DP darf keine 0-W-Zwischenrunde erhalten');
}

/**
 * Code-Teil: verifyLimitsMode
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function verifyLimitsMode() {
  const adapter = makeAdapter({ controlMode: 'limits' });
  const dp = new FakeDp({
    'st.maxChargeW': entry('free.adapter.0.command.maxCharge'),
    'st.maxDischargeW': entry('another.vendor.9.limit.maxDischarge'),
    'st.run': entry('logic.0.storage.run'),
    'st.reserveSocPct': entry('logic.0.storage.reserve'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);
  mod._effectiveReserveSocPct = 31;

  await mod._applyTargetW(-803, 'gated charge limit', 'pv');
  assert.strictEqual(dp.last('st.maxChargeW').value, 803);
  assert.strictEqual(dp.last('st.maxDischargeW').value, 0);
  assert.strictEqual(dp.last('st.run').value, true);
  assert.strictEqual(dp.last('st.reserveSocPct').value, 31);
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'leistungsgrenzen-geschrieben');

  dp.clear();
  await mod._applyTargetW(421, 'gated discharge limit', 'eigenverbrauch');
  assert.strictEqual(dp.last('st.maxChargeW').value, 0);
  assert.strictEqual(dp.last('st.maxDischargeW').value, 421);
  assert.strictEqual(dp.last('st.run').value, true);

  dp.clear();
  await mod._applyTargetW(0, 'safe stop', 'safety');
  assert.strictEqual(dp.last('st.maxChargeW').value, 0);
  assert.strictEqual(dp.last('st.maxDischargeW').value, 0);
  assert.strictEqual(dp.last('st.run').value, false);
}

/**
 * Code-Teil: verifyEnableFlagsMode
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function verifyEnableFlagsMode() {
  const adapter = makeAdapter({ controlMode: 'enableFlags' });
  const dp = new FakeDp({
    'st.chargeEnable': entry('vendor.independent.chargeAllowed'),
    'st.dischargeEnable': entry('vendor.independent.dischargeAllowed'),
    'st.run': entry('vendor.independent.externalMode'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);

  await mod._applyTargetW(-803, 'charge allowed after gates', 'pv');
  assert.strictEqual(dp.last('st.chargeEnable').value, true);
  assert.strictEqual(dp.last('st.dischargeEnable').value, false);
  assert.strictEqual(dp.last('st.run').value, true);
  assert.strictEqual(state(adapter, 'speicher.regelung.schreibStatus'), 'freigabe-flags-geschrieben');

  dp.clear();
  await mod._applyTargetW(803, 'discharge allowed after gates', 'eigenverbrauch');
  assert.strictEqual(dp.last('st.chargeEnable').value, false);
  assert.strictEqual(dp.last('st.dischargeEnable').value, true);

  dp.clear();
  await mod._applyTargetW(0, 'safe stop', 'safety');
  assert.strictEqual(dp.last('st.chargeEnable').value, false);
  assert.strictEqual(dp.last('st.dischargeEnable').value, false);
  assert.strictEqual(dp.last('st.run').value, false);
}

/**
 * Code-Teil: verifyOneDirectionAndConflictSafety
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function verifyOneDirectionAndConflictSafety() {
  // Eine bewusst einseitige Zuordnung ist gültig. Nur die fehlende Richtung
  // wird gesperrt; der vorhandene AppCenter-DP bleibt verwendbar.
  const oneAdapter = makeAdapter({ controlMode: 'limits' });
  const oneDp = new FakeDp({
    'st.maxChargeW': entry('one.direction.only.chargeLimit'),
    'st.run': entry('one.direction.run'),
  });
  const oneMod = new SpeicherRegelungModule(oneAdapter, oneDp);
  await oneMod._applyTargetW(-500, 'one direction charge', 'pv');
  assert.strictEqual(oneDp.last('st.maxChargeW').value, 500);
  assert.strictEqual(state(oneAdapter, 'speicher.regelung.schreibOk'), true);

  oneDp.clear();
  await oneMod._applyTargetW(500, 'unmapped direction', 'eigenverbrauch');
  assert.strictEqual(oneDp.last('st.maxChargeW').value, 0, 'vorhandener Gegen-DP muss beim nicht unterstützten Wunsch sicher genullt werden');
  assert.strictEqual(oneDp.last('st.run').value, false);
  assert.strictEqual(state(oneAdapter, 'speicher.regelung.schreibStatus'), 'zielrichtung-nicht-gemappt');
  assert.strictEqual(state(oneAdapter, 'speicher.regelung.schreibOk'), false);

  // Zwei unterschiedliche Funktionen auf demselben Objekt sind ein echter
  // Sicherheitskonflikt. Der Ausgang bleibt unbeschrieben und ein separater
  // Run-DP wird auf false gesetzt.
  const conflictAdapter = makeAdapter({ controlMode: 'limits' });
  const conflictDp = new FakeDp({
    'st.maxChargeW': entry('same.object.for.two.functions'),
    'st.maxDischargeW': entry('same.object.for.two.functions'),
    'st.run': entry('separate.safe.run'),
  });
  const conflictMod = new SpeicherRegelungModule(conflictAdapter, conflictDp);
  await conflictMod._applyTargetW(-900, 'must be blocked', 'pv');
  assert.strictEqual(conflictDp.writes.some((row) => row.objectId === 'same.object.for.two.functions'), false, 'kollidierender DP wurde trotz Sicherheitskonflikt beschrieben');
  assert.strictEqual(conflictDp.last('st.run').value, false, 'separater Run-DP wurde bei Mapping-Konflikt nicht sicher deaktiviert');
  assert.strictEqual(state(conflictAdapter, 'speicher.regelung.schreibStatus'), 'dp-zuordnung-konflikt');
  const conflictJson = JSON.parse(state(conflictAdapter, 'speicher.regelung.outputMappingConflictJson'));
  assert.strictEqual(conflictJson[0].objectId, 'same.object.for.two.functions');
}

(async () => {
  await verifyTargetPowerAllOutputs();
  await verifyLimitsMode();
  await verifyEnableFlagsMode();
  await verifyOneDirectionAndConflictSafety();
  console.log('[storage-appcenter-output-modes] OK: Alle manuellen Speicher-Ausgänge laufen durch denselben finalen Gate-/Executor-Pfad.');
})().catch((err) => {
  console.error('[storage-appcenter-output-modes] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
