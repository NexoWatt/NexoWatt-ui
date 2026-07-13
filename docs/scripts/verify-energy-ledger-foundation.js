#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, needle, msg) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error(`[energy-ledger] FEHLER: ${msg || needle} fehlt in ${rel}`);
    process.exit(1);
  }
}
function match(rel, regex, msg) {
  const text = read(rel);
  if (!regex.test(text)) {
    console.error(`[energy-ledger] FEHLER: ${msg || regex} fehlt in ${rel}`);
    process.exit(1);
  }
}

need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'nexowatt.local-kwh-ledger.v2', 'Ledger-Schema v2');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'chargeKiosk.stations.*.lastSessionsByLpJson', 'Charge-Kiosk-Sessionquelle dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'OCPP, Modbus, MQTT', 'Hersteller-/Protokolloffenheit dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'processedSessionKeysJson', 'Deduplikation der Sessions');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'entriesRecentJson', 'kompakte Ledger-Eintragsliste');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'todayCsvJson', 'CSV-Exportbasis');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'keine eichrechtsverbindliche Abrechnung', 'rechtlicher Hinweis');
need('src-ts/runtime-executables/ems/module-manager.ts', 'EnergyLedgerModule', 'ModuleManager registriert EnergyLedgerModule');
need('src-ts/runtime-executables/ems/module-manager.ts', "this._licenseAllowsApp('energyLedger')", 'EOS-Lizenzgate für Ledger');
need('src-ts/runtime-executables/www/ems-apps.ts', "id: 'energyLedger'", 'App-Center führt Local kWh Ledger');
need('src-ts/runtime-executables/www/ems-apps.ts', 'schaltet keine Hardware', 'Installer-Hinweis: read-only');
need('src-ts/runtime-executables/main.ts', "ensurePlainObj('energyLedger'", 'Default-Config energyLedger');
match('package.json', /"version"\s*:\s*"0\.8\.(2[7-9]|[3-9][0-9])"/, 'Paketversion >=0.8.59');
console.log('[energy-ledger] OK: Local kWh Ledger Grundlage/Export-Erweiterung ist statisch abgesichert.');
