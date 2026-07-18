// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-confirmed-demand-reservation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-evcs-confirmed-demand-reservation.js
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
 * Original-Hash: fff1adaa310943a9b81822deabdfaf7aa616ad1812bb593e0cb4a263db9d4ec0
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
 * Regression 0.8.122: Ladepunkte ohne bestaetigten Fahrzeugbedarf duerfen
 * weder Gesamt- noch PV-Budget reservieren. Alte Sollwerte, stale Stati und
 * OCPP `Reserved` muessen fail-closed behandelt werden.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const charging = require(path.join(root, 'ems/modules/charging-management.js'));
const budgetHelpers = require(path.join(root, 'ems/charging-budget-helpers.js'));

const {
  resolveConfirmedEvcsVehicleDemand,
  computePendingPvStartIntentW,
} = charging;
const { computeChargingMinimumServicePlan } = budgetHelpers;

/**
 * Code-Teil: demand
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function demand(input) {
  return resolveConfirmedEvcsVehicleDemand({ activityThresholdW: 100, ...input });
}

// OCPP Reserved reserviert nur den Ladepunkt, bestaetigt aber kein physisches
// Fahrzeug und keinen Ladebedarf.
let out = demand({ status: 'Reserved', statusFresh: true });
assert.strictEqual(out.plugged, false);
assert.strictEqual(out.demandConfirmed, false);
assert.strictEqual(out.reason, 'status-reserved-no-vehicle');

// Available/Idle/Offline duerfen ebenfalls kein Budget blockieren.
for (const status of ['Available', 'Idle', 'Unplugged', 'Offline']) {
  out = demand({ status, statusFresh: true });
  assert.strictEqual(out.demandConfirmed, false, `${status} darf keinen Ladebedarf bestaetigen`);
}

// SuspendedEVSE bedeutet: Fahrzeug wartet auf Energie vom EMS und darf einen
// technisch fahrbaren Start-Intent reservieren.
out = demand({ status: 'SuspendedEVSE', statusFresh: true });
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, true);

// SuspendedEV bedeutet dagegen: Fahrzeug fordert selbst keine Leistung an.
out = demand({ status: 'SuspendedEV', statusFresh: true });
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);

// Preparing/Charging sind valide Bedarfszustaende. Occupied bestaetigt nur
// Belegung, aber noch keinen Leistungsbedarf.
for (const status of ['Preparing', 'Charging']) {
  out = demand({ status, statusFresh: true });
  assert.strictEqual(out.demandConfirmed, true, `${status} muss einen frischen Ladebedarf bestaetigen`);
}
out = demand({ status: 'Occupied', statusFresh: true });
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);

// Stale Stati erzeugen ohne frischen expliziten Plug-DP keinen Bedarf.
out = demand({ status: 'SuspendedEVSE', statusFresh: false });
assert.strictEqual(out.demandConfirmed, false);

// Frische reale Leistung ist immer autoritativ, auch wenn der Status hinterherhinkt.
out = demand({ actualPowerW: 4200, status: 'Available', statusFresh: true });
assert.strictEqual(out.demandConfirmed, true);
assert.strictEqual(out.source, 'fresh-power');

// Ein explizit frischer Plug-DP darf bei fehlendem/unklarem Status den Bedarf
// bestaetigen; ein explizites FALSE muss sicher freigeben.
out = demand({ explicitPlug: true, explicitPlugKnown: true, statusFresh: false });
assert.strictEqual(out.demandConfirmed, true);
out = demand({ explicitPlug: false, explicitPlugKnown: true, status: 'SuspendedEVSE', statusFresh: false });
assert.strictEqual(out.demandConfirmed, false);

// Pending-PV-Intent: kein bestaetigter Bedarf = 0 W, unabhaengig von alten
// Sollwerten oder einer theoretischen Wallboxleistung.
let intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: false,
  mode: 'pv',
  controlBasis: 'powerW',
  status: 'Reserved',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 0);

intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: true,
  mode: 'pv',
  controlBasis: 'powerW',
  status: 'SuspendedEVSE',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 4140);

// Mindestleistungs-Plan: Ein physisch als verbunden dargestellter Ladepunkt
// wird ausgeschlossen, sobald die neue Bedarfsdiagnose FALSE meldet.
const plan = computeChargingMinimumServicePlan({
  totalBudgetW: 20000,
  wallboxes: [
    {
      safe: 'ghost', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: false, controlBasis: 'powerW', effectiveMode: 'minpv',
      minPW: 4140, maxPW: 11000,
    },
    {
      safe: 'real', enabled: true, online: true, vehiclePlugged: true,
      vehicleDemandConfirmed: true, controlBasis: 'powerW', effectiveMode: 'minpv',
      minPW: 4140, maxPW: 11000,
    },
  ],
});
assert.strictEqual(plan.eligibleCount, 1);
assert.strictEqual(plan.minimumBySafe.get('ghost'), 0);
assert.strictEqual(plan.minimumBySafe.get('real'), 4140);

// Statische Produktivanker: Allocation, Reservierung und Write-Plan nutzen die
// bestaetigte Bedarfsentscheidung statt `online !== false` oder alten Sollwerten.
const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
for (const needle of [
  'resolveConfirmedEvcsVehicleDemand',
  'vehicleDemandConfirmed = vehicleDemand.demandConfirmed === true',
  'w.vehicleDemandConfirmed === true',
  'const demandReserveThisW = activeChargingDemand ?',
  'vehicleDemandReason',
]) {
  assert.ok(source.includes(needle), `Produktivanker fehlt: ${needle}`);
}
assert.ok(source.includes('`evcs.N.active` ist die Kunden-/RFID-Freigabe'), 'Freigabe und Fahrzeugkontakt muessen fachlich getrennt sein');
assert.ok(!source.includes("this._getStateCached(`evcs.${Math.round(evcsIndex)}.active`)"), 'evcs.N.active darf nicht als Fahrzeug-/Plug-Signal gelesen werden');

const allocationSource = fs.readFileSync(path.join(root, 'src-ts/ems/charging-management/charging-allocation.ts'), 'utf8');
assert.ok(allocationSource.includes('const connected = boolValue(wallbox.vehiclePlugged, false);'), 'TS-Allocator muss einen fehlenden Plug-Nachweis fail-closed behandeln');

console.log('[evcs-confirmed-demand-reservation] OK: Ladepunkte ohne bestaetigten Fahrzeugbedarf reservieren weder Gesamt- noch PV-Budget.');
