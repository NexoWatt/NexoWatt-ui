// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-appcenter-override-precedence.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-appcenter-override-precedence.js
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
 * Original-Hash: 9fc72a98bdfecb5f034f1547fef127205e37fd62a1446b23b5560ee6d50861a0
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
 * Regression 0.8.108: Explizite AppCenter-Speicher-Messwerte bleiben vor
 * Speicherfarm- und Bilanz-Fallbacks autoritativ. Signed und getrennte
 * Lade-/Entlade-Istwerte werden in die interne Speicherregelung übernommen.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bridge = require(path.join(root, 'ems/services/storage-override-bridge.js'));

/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/**
 * Code-Teil: adapterWith
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function adapterWith(units = {}, settings = {}) {
  return {
    config: { settings, storage: { datapoints: {} } },
    async getForeignObjectAsync(id) {
      return units[id] ? { common: { unit: units[id] } } : null;
    },
  };
}

/**
 * Code-Teil: FakeRegistry
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class FakeRegistry {
  constructor(rows) { this.rows = rows || {}; }
  getEntry(key) { return this.rows[key] || null; }
  getNumber(key, fallback = null) {
    const row = this.rows[key];
    const n = row ? Number(row.val) : NaN;
    return Number.isFinite(n) ? n : fallback;
  }
  getAgeMs(key) {
    const row = this.rows[key];
    return row && Number.isFinite(Number(row.ageMs)) ? Number(row.ageMs) : null;
  }
}

(async () => {
  let adapter = await adapterWith({ 'meter.signed': 'kW' });
  let result = await bridge.applyStorageMeasurementOverrides(adapter, {
    storageSoc: 'meter.soc',
    batteryPower: 'meter.signed',
    storageChargePower: 'meter.charge',
    storageDischargePower: 'meter.discharge',
  });
  assert.strictEqual(result.source, 'appcenter-signed-override');
  assert.strictEqual(adapter.config.storage.datapoints.socObjectId, 'meter.soc');
  assert.strictEqual(adapter.config.storage.datapoints.batteryPowerObjectId, 'meter.signed');
  assert.strictEqual(adapter.config.storage.datapoints.batteryPowerScale, 1000);
  assert.strictEqual(adapter.config.storage.datapoints.batteryChargePowerObjectId, '');

  adapter = await adapterWith({ 'meter.charge': 'W', 'meter.discharge': 'kW' });
  result = await bridge.applyStorageMeasurementOverrides(adapter, {
    storageChargePower: 'meter.charge',
    storageDischargePower: 'meter.discharge',
  });
  assert.strictEqual(result.source, 'appcenter-split-override');
  assert.strictEqual(adapter.config.storage.datapoints.batteryChargePowerObjectId, 'meter.charge');
  assert.strictEqual(adapter.config.storage.datapoints.batteryDischargePowerObjectId, 'meter.discharge');
  assert.strictEqual(adapter.config.storage.datapoints.batteryDischargePowerScale, 1000);

  const split = bridge.resolveSplitBatteryFeedback(new FakeRegistry({
    'st.batteryChargePowerW': { objectId: 'meter.charge', val: 2900, ageMs: 100 },
    'st.batteryDischargePowerW': { objectId: 'meter.discharge', val: 400, ageMs: 120 },
    'st.targetPowerW': { objectId: 'ctrl.target', val: 0, ageMs: 0 },
  }), { datapoints: { batteryFeedbackSource: 'appcenter-split-override' } }, 15000);
  assert.ok(split && split.trusted, 'Split-Istleistung muss vertrauenswürdig sein');
  assert.strictEqual(split.observedW, -2500, 'Entladen minus Laden muss signed Feedback ergeben');

  const rejected = bridge.resolveSplitBatteryFeedback(new FakeRegistry({
    'st.batteryChargePowerW': { objectId: 'device.aliases.ctrl.chargePowerW', val: 3000, ageMs: 100 },
    'st.targetChargePowerW': { objectId: 'device.aliases.ctrl.chargePowerW', val: 3000, ageMs: 100 },
  }), { datapoints: {} }, 15000);
  assert.strictEqual(rejected, null, 'Steuer-/Sollwert-DP darf nie Istfeedback werden');

  const main = read('src-ts/runtime-executables/main.ts');
  const engine = read('src-ts/runtime-executables/ems/engine.ts');
  const storage = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
  assert.ok(engine.includes('applyStorageMeasurementOverrides(adapter, dps)'), 'Engine muss AppCenter-Override-Bridge aufrufen');
  assert.ok(main.includes('if (sfEnabled && !anyStorageMapped)'), 'Farm darf nur ohne explizites Power-Mapping führen');
  assert.ok(main.includes("if (sfEnabled && !String(historyDps.storageSoc || '').trim())"), 'Farm-SoC darf AppCenter-SoC nicht überschreiben');
  assert.ok(main.includes('if (!hasPowerOverride)'), 'Farm-Kompatibilitätsspiegel muss Power-Overrides respektieren');
  assert.ok(storage.includes('explicitAppCenterPowerOverride'), 'Speicherregelung muss AppCenter-Istwert vor Farm halten');
  assert.ok(storage.includes('resolveSplitBatteryFeedback'), 'Speicherregelung muss Split-Istwerte nutzen');

  console.log('[storage-appcenter-override-precedence] OK: AppCenter-Speicherwerte bleiben autoritativ; signed/split Feedback ist farm- und setpoint-sicher.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
