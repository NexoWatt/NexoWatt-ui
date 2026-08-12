#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  inferOcppConnectorNoFromObjectId,
  inferIoBrokerOcppConnectorContext,
  belongsToOcppConnectorContext,
  isKnownOcppSemanticObjectId,
  resolveOcppCanonicalObjectId,
} = require('../ems/modules/charging-management');

const native = inferIoBrokerOcppConnectorContext('ocpp21.0.CP_01.measurements.powerW');
assert.strictEqual(native.detected, true);
assert.strictEqual(native.contractVersion, 'nexowatt-ocpp-0.4-compact');
assert.strictEqual(native.adapterKind, 'nexowatt-ocpp-native-compact');
assert.strictEqual(native.actualPowerId, 'ocpp21.0.CP_01.measurements.powerW');
assert.strictEqual(native.actualCurrentId, 'ocpp21.0.CP_01.measurements.currentA');
assert.strictEqual(native.energyTotalId, 'ocpp21.0.CP_01.measurements.energyKWh');
assert.strictEqual(native.energyTotalWhId, 'ocpp21.0.CP_01.measurements.energyWh');
assert.strictEqual(native.vehicleSocId, 'ocpp21.0.CP_01.measurements.socPercent');
assert.strictEqual(native.statusId, 'ocpp21.0.CP_01.info.status');
assert.strictEqual(native.transactionActiveId, 'ocpp21.0.CP_01.transactions.transactionActive');
assert.strictEqual(native.socketConnectedId, 'ocpp21.0.CP_01.info.socketConnected');
assert.strictEqual(native.dataFreshId, 'ocpp21.0.CP_01.health.dataFresh');
assert.strictEqual(native.heartbeatId, 'ocpp21.0.CP_01.health.lastSeenMs');
assert.strictEqual(native.setPowerId, 'ocpp21.0.CP_01.control.chargeLimit');
assert.strictEqual(native.availabilityId, 'ocpp21.0.CP_01.control.availability');
assert.strictEqual(native.rfidId, 'ocpp21.0.CP_01.info.rfid');

const publicAlias = inferIoBrokerOcppConnectorContext('alias.0.nexowatt.ocpp.0.CP_01.powerW');
assert.strictEqual(publicAlias.adapterKind, 'nexowatt-ocpp-public-alias-compact');
assert.strictEqual(publicAlias.actualPowerId, 'alias.0.nexowatt.ocpp.0.CP_01.powerW');
assert.strictEqual(publicAlias.energyTotalId, 'alias.0.nexowatt.ocpp.0.CP_01.energyKWh');
assert.strictEqual(publicAlias.statusId, 'alias.0.nexowatt.ocpp.0.CP_01.status');
assert.strictEqual(publicAlias.vehicleSocId, 'alias.0.nexowatt.ocpp.0.CP_01.soc');
assert.strictEqual(publicAlias.rfidId, 'alias.0.nexowatt.ocpp.0.CP_01.rfid');
assert.strictEqual(publicAlias.availabilityId, 'alias.0.nexowatt.ocpp.0.CP_01.availability');
assert.strictEqual(publicAlias.heartbeatId, 'ocpp21.0.CP_01.health.lastSeenMs');

const technicalAlias = inferIoBrokerOcppConnectorContext('alias.0.ocpp21.0.CP_01.powerW');
assert.strictEqual(technicalAlias.adapterKind, 'nexowatt-ocpp-technical-alias-compact');
assert.strictEqual(technicalAlias.nativeDeviceRoot, native.nativeDeviceRoot);

assert.strictEqual(inferOcppConnectorNoFromObjectId('ocpp21.0.CP_01.connectors.1_2.status'), 2);
const connector2 = inferIoBrokerOcppConnectorContext('ocpp21.0.CP_01.connectors.1_2.status');
assert.strictEqual(connector2.connectorDetails, true);
assert.strictEqual(connector2.evseNo, 1);
assert.strictEqual(connector2.connectorNo, 2);
assert.strictEqual(connector2.statusId, 'ocpp21.0.CP_01.connectors.1_2.status');

const migrations = [
  ['power', 'ocpp21.0.CP_01.meterValues.Power_Active_Import', native.actualPowerId],
  ['current', 'ocpp21.0.CP_01.meterValues.Current_Import', native.actualCurrentId],
  ['energy', 'ocpp21.0.CP_01.meterValues.Energy_Active_Import_Register_kWh', native.energyTotalId],
  ['status', 'ocpp21.0.CP_01.evse.1.connector.1.status', native.statusId],
  ['transactionActive', 'ocpp21.0.CP_01.transactions.transactionActive', native.transactionActiveId],
  ['online', 'ocpp21.0.CP_01.health.online', native.socketConnectedId],
  ['dataFresh', 'ocpp21.0.CP_01.health.dataFresh', native.dataFreshId],
  ['heartbeat', 'ocpp21.0.CP_01.health.lastSeenMs', native.heartbeatId],
  ['setPower', 'ocpp21.0.CP_01.control.chargeLimit', native.setPowerId],
  ['enable', 'ocpp21.0.CP_01.control.availability', native.availabilityId],
  ['vehicleSoc', 'ocpp21.0.CP_01.meterValues.SoC', native.vehicleSocId],
  ['rfid', 'ocpp21.0.CP_01.info.rfid', native.rfidId],
];
for (const [semantic, source, expected] of migrations) {
  assert.strictEqual(isKnownOcppSemanticObjectId(source, native, semantic), true, `${semantic} legacy source must be known`);
  assert.strictEqual(resolveOcppCanonicalObjectId(source, native, semantic), expected, `${semantic} must migrate to compact contract`);
}
assert.strictEqual(
  resolveOcppCanonicalObjectId('mqtt.0.wallbox.power', native, 'power'),
  'mqtt.0.wallbox.power',
  'Unrelated custom mappings must remain untouched',
);
assert.strictEqual(
  resolveOcppCanonicalObjectId('ocpp21.0.OTHER.meterValues.Power_Active_Import', native, 'power'),
  'ocpp21.0.OTHER.meterValues.Power_Active_Import',
  'Another OCPP station must never be silently rewritten',
);
assert.strictEqual(belongsToOcppConnectorContext(publicAlias.actualPowerId, native), true);

const root = path.resolve(__dirname, '..');
const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');

for (const marker of [
  "contractVersion: 'nexowatt-ocpp-0.4-compact'",
  "`${nativeDeviceRoot}.measurements.powerW`",
  "`${nativeDeviceRoot}.measurements.energyKWh`",
  "`${nativeDeviceRoot}.measurements.socPercent`",
  "function resolveOcppCanonicalObjectId(configuredObjectId, ocppContext, semantic)",
  "mappingIssues.push('ocpp_0_4_compact_mapping_migrated')",
  'ocppDatapointMappingMigrations',
]) assert.ok(chargingSource.includes(marker), `Charging source marker missing: ${marker}`);

for (const marker of [
  "'alias.0.nexowatt.ocpp.*'",
  "'ocpp21.*'",
  "discoveryContract: 'nexowatt-ocpp-0.4-compact'",
  "vehicleSocId: compactPick(aliasId('soc')",
  "rfidReadId: compactPick(aliasId('rfid')",
  "enableWriteId: compactPick(aliasId('availability')",
]) assert.ok(mainSource.includes(marker), `Discovery source marker missing: ${marker}`);

for (const marker of [
  "'vehicleSocId','rfidReadId'",
  'function _isKnownLegacyNexoWattOcppMapping(',
  "out.controlPreference = String(c.controlPreference)",
  'bekannte OCPP-0.3-Pfade wurden auf den kompakten 0.4-Vertrag',
]) assert.ok(uiSource.includes(marker), `Frontend marker missing: ${marker}`);

for (const marker of [
  "const dataFreshId = (wb.dataFreshId || '').trim();",
  "const transactionActiveId = (wb.activeId || wb.transactionActiveId || '').trim();",
  "...(dataFreshId ? { dataFreshId } : {}),",
  "...(transactionActiveId ? { transactionActiveId } : {}),",
]) assert.ok(engineSource.includes(marker), `Engine propagation marker missing: ${marker}`);

console.log('[rc58-ocpp-compact-mapping] OK: OCPP 0.4 compact native/public alias contract, safe legacy migration and installer mapping are consistent.');
