// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-universal-demand-normalization.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-evcs-universal-demand-normalization.js
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
 * Original-Hash: 4a056261e8ad38ae5e2cf0903a3fafbf1b276deb4e4a7aeb2300499864bab388
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
 * Regression RC19: Herstellerunabhängige EVCS-Zustände müssen auf eine
 * einheitliche Fahrzeug-/Ladebedarfssemantik abgebildet werden. Freie
 * AppCenter-DPs und Wertemappings bleiben autoritativ; OCPP `Available`
 * darf kein Budget reservieren, ABL/IEC B2 dagegen schon.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const charging = require(path.join(root, 'ems/modules/charging-management.js'));
const {
  classifyUniversalEvcsVehicleStatus,
  resolveUniversalEvcsVehicleDemand,
  resolveEvcsSemanticFlag,
  parseEvcsSemanticValues,
  matchesEvcsSemanticStatus,
  isPersistentEvcsVehicleState,
  computePendingPvStartIntentW,
} = charging;

/**
 * Code-Teil: classified
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function classified(status, extra = {}) {
  return classifyUniversalEvcsVehicleStatus({ status, statusFresh: true, ...extra });
}

// ABL / IEC 61851 CP states.
let out = classified('B2 EV has the permission to charge');
assert.deepStrictEqual(
  { state: out.state, plugged: out.plugged, demand: out.demandConfirmed, reason: out.reason },
  { state: 'ready_to_charge', plugged: true, demand: true, reason: 'abl-b2-permission' },
);
out = classified('B1 EV connected');
assert.strictEqual(out.state, 'connected');
assert.strictEqual(out.plugged, true);
assert.strictEqual(out.demandConfirmed, false);
out = classified('A1 no EV connected');
assert.strictEqual(out.state, 'disconnected');
assert.strictEqual(out.demandConfirmed, false);
out = classified('C2 charging enabled');
assert.strictEqual(out.state, 'charging');
assert.strictEqual(out.demandConfirmed, true);

// OCPP semantics.
const ocppExpectations = new Map([
  ['Available', ['disconnected', false]],
  ['Preparing', ['ready_to_charge', true]],
  ['Charging', ['charging', true]],
  ['SuspendedEVSE', ['paused_by_evse', true]],
  ['SuspendedEV', ['paused_by_vehicle', false]],
  ['Finishing', ['finishing', false]],
  ['Faulted', ['faulted', false]],
  ['Unavailable', ['unavailable', false]],
]);
for (const [status, [state, demand]] of ocppExpectations) {
  out = classified(status);
  assert.strictEqual(out.state, state, `${status}: canonical state`);
  assert.strictEqual(out.demandConfirmed, demand, `${status}: demand`);
}

// Generic healthy/disconnected wording must not become a fault/offline state.
out = classified('EV not connected');
assert.strictEqual(out.state, 'disconnected');
out = classified('No error');
assert.notStrictEqual(out.state, 'faulted');
// Bekannte Safety-Zustände dürfen niemals durch ein breites Installer-Mapping
// als Ladebedarf umgedeutet werden.
out = classified('Faulted', { statusDemandValues: '*' });
assert.strictEqual(out.state, 'faulted');
assert.strictEqual(out.demandConfirmed, false);
out = classified('Offline', { statusDemandValues: '*' });
assert.strictEqual(out.state, 'offline');
assert.strictEqual(out.demandConfirmed, false);

// Arbitrary vendor enums/text via AppCenter mappings, including wildcards.
out = classified('VENDOR_STATE_47', { statusDemandValues: 'STATE_1; VENDOR_STATE_47' });
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.demandConfirmed, true);
out = classified('CAR_PRESENT_WAIT', { statusConnectedValues: '*PRESENT*' });
assert.strictEqual(out.state, 'connected');
out = classified('PORT_EMPTY_9', { statusDisconnectedValues: 'PORT_EMPTY*' });
assert.strictEqual(out.state, 'disconnected');
out = classified('VEHICLE_FULL', { statusNoDemandValues: '*FULL' });
assert.strictEqual(out.state, 'paused_by_vehicle');
assert.ok(matchesEvcsSemanticStatus('prefix-ABC-suffix', '*ABC*'));
assert.strictEqual(parseEvcsSemanticValues('["1", "2"]').length, 2);

// Free boolean/enum mappings.
let flag = resolveEvcsSemanticFlag(7, '2, 7, 9', '0');
assert.strictEqual(flag.known, true);
assert.strictEqual(flag.value, true);
flag = resolveEvcsSemanticFlag('NO_REQUEST', 'REQUEST', '*NO_REQUEST*');
assert.strictEqual(flag.known, true);
assert.strictEqual(flag.value, false);

// Explicit semantic DPs are authoritative. Explicit disconnected wins over a
// contradictory demand signal.
out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: false,
  explicitConnectedKnown: true,
  explicitDemand: true,
  explicitDemandKnown: true,
  status: 'Preparing',
  statusFresh: true,
});
assert.strictEqual(out.plugged, false);
assert.strictEqual(out.demandConfirmed, false);
out = resolveUniversalEvcsVehicleDemand({
  explicitConnected: true,
  explicitConnectedKnown: true,
  explicitDemand: true,
  explicitDemandKnown: true,
});
assert.strictEqual(out.state, 'ready_to_charge');
assert.strictEqual(out.demandConfirmed, true);

// ABL B2 must receive the technical PV start reservation. Available must not.
const abl = resolveUniversalEvcsVehicleDemand({
  status: 'B2 EV has the permission to charge',
  statusFresh: true,
});
let intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: abl.demandConfirmed,
  mode: 'pv',
  controlBasis: 'currentA',
  status: 'B2 EV has the permission to charge',
  normalizedVehicleState: abl.state,
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 4140);
intent = computePendingPvStartIntentW({
  enabled: true,
  online: true,
  connected: false,
  mode: 'pv',
  controlBasis: 'currentA',
  status: 'Available',
  normalizedVehicleState: 'disconnected',
  minPowerW: 4140,
  technicalMinW: 4140,
  maxPowerW: 11000,
  totalRemainingW: 11000,
  stationRemainingW: 11000,
  pvRemainingW: 11000,
});
assert.strictEqual(intent.intentW, 0);

// Persistent event-driven states may be held by fresh device liveness, but
// stale safety/charging states are excluded from that contract.
for (const state of ['disconnected', 'connected', 'ready_to_charge', 'paused_by_evse', 'paused_by_vehicle', 'finishing', 'reserved']) {
  assert.strictEqual(isPersistentEvcsVehicleState(state), true, `${state} persistent`);
}
for (const state of ['faulted', 'offline', 'unavailable', 'charging']) {
  assert.strictEqual(isPersistentEvcsVehicleState(state), false, `${state} must not be revived`);
}

// Static end-to-end wiring contract.
const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
for (const needle of [
  'vehicleConnectedId',
  'chargeDemandId',
  'heartbeatId',
  'statusDemandValues',
  'freshPowerMeterLiveness',
  'statusHeldByLiveness',
  'normalizedVehicleState: w.vehicleStateNormalized',
  'vehicle-start-no-response',
]) assert.ok(chargingSource.includes(needle), `charging runtime missing: ${needle}`);

const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
for (const needle of ['vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'statusDemandValues']) {
  assert.ok(engineSource.includes(needle), `engine wiring missing: ${needle}`);
}
const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
for (const needle of ['vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'statusDemandValues']) {
  assert.ok(mainSource.includes(needle), `main config wiring missing: ${needle}`);
}
const appCenterSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
for (const needle of [
  'Fahrzeug verbunden (lesen, optional)',
  'Ladebedarf / Ladebereit (lesen, optional)',
  'Heartbeat / LastSeen (lesen, optional)',
  'Ladebedarf / Herstellerstatus (optional)',
  'statusDemandValues',
  'r.vehicleConnected',
  'r.chargeDemand',
]) assert.ok(appCenterSource.includes(needle), `AppCenter wiring missing: ${needle}`);

console.log('[evcs-universal-demand-normalization] OK: ABL/OCPP/freie Herstellerwerte nutzen eine gemeinsame, sichere Ladebedarfssemantik.');
