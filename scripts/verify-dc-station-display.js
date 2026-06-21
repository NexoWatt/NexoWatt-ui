#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function mustContain(rel, needle, message) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error(`[dc-station-display] FEHLER: ${message || needle} fehlt in ${rel}`);
    process.exit(1);
  }
}
function mustMatch(rel, regex, message) {
  const text = read(rel);
  if (!regex.test(text)) {
    console.error(`[dc-station-display] FEHLER: ${message || regex} fehlt in ${rel}`);
    process.exit(1);
  }
}

mustContain('src-ts/runtime-executables/main.ts', "app.get('/api/display/station/:token'", 'GET Display-API');
mustContain('src-ts/runtime-executables/main.ts', "app.post('/api/display/station/:token/heartbeat'", 'Heartbeat-API');
mustContain('src-ts/runtime-executables/main.ts', "app.post('/api/display/station/:token/command'", 'Command-API');
mustContain('src-ts/runtime-executables/main.ts', 'station.maintenanceMode', 'serverseitiger Wartungsmodus-Gate');
mustContain('src-ts/runtime-executables/main.ts', 'lp_not_assigned', 'LP-Zuordnungsschutz');
mustContain('src-ts/runtime-executables/main.ts', 'mode_not_allowed', 'Modus-Gate');
mustContain('src-ts/runtime-executables/main.ts', 'lastCommandJson', 'Command-Diagnose JSON');
mustContain('src-ts/runtime-executables/main.ts', 'lastDisplayInfoJson', 'Heartbeat-Displayinfo');
mustContain('src-ts/runtime-executables/main.ts', 'sessionSolarKwh', 'Session-Solar-kWh');
mustContain('src-ts/runtime-executables/main.ts', 'sessionGridKwh', 'Session-Netz-kWh');
mustContain('src-ts/runtime-executables/main.ts', 'manufacturer-open', 'herstellerneutrale Protokoll-Offenheit');
mustContain('src-ts/runtime-executables/main.ts', '_nwDisplayExecuteStationCommand', 'herstellerneutrale Display-Command-Bruecke');
mustContain('src-ts/runtime-executables/main.ts', 'commandStateId', 'generischer Command-State fuer OCPP/Modbus/MQTT/Herstelleradapter');
mustContain('src-ts/runtime-executables/main.ts', 'directHardwareWrite: false', 'keine direkte Hardwaresteuerung aus Display-API');
mustContain('src-ts/runtime-executables/main.ts', '_nwDisplayLayoutMode', 'Layout-Auswahl');
mustContain('src-ts/runtime-executables/main.ts', 'watchdogTimeoutSec', 'Watchdog-Timeout');
mustContain('src-ts/runtime-executables/main.ts', '_nwDisplayExecuteStationCommand', 'herstelleroffene Command-Bridge');
mustContain('src-ts/runtime-executables/main.ts', 'directHardwareWrite: false', 'Display schreibt nicht direkt auf Hardware');
mustContain('src-ts/runtime-executables/main.ts', 'OCPP, Modbus, MQTT', 'keine OCPP-only Kopplung');
mustContain('src-ts/runtime-executables/main.ts', 'manufacturerOpen', 'herstellerneutrale Kommando-Metadaten');
mustContain('src-ts/runtime-executables/main.ts', '_nwDisplayWriteCommandState', 'frei mappbarer Command-State');
mustContain('src-ts/runtime-executables/main.ts', 'directHardwareWrite: false', 'kein direkter Hardware-/OCPP-Zwang');
mustContain('src-ts/runtime-executables/main.ts', '_nwDisplayBuildOperatorSummary', 'Betreiber-/Session-Zusammenfassung');

mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'chargeKiosk.watchdog.status', 'globaler Watchdog-Status');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'displayStatus', 'Stations-Displaystatus');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'displayWarning', 'Stations-Displaywarnung');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'displayOnlineCount', 'Online-Display-Zaehler');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'sessionSummaryJson', 'Session-Summary State');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'operatorSummaryJson', 'Betreiber-Zusammenfassung State');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'manufacturer-open', 'Charge-Kiosk Modul bleibt herstellerneutral');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'controlBridge', 'herstellerneutrale Steuerbrücke im Modul');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'OCPP, Modbus, MQTT', 'Herstelleroffenheit dokumentiert');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'controlBridge', 'herstellerneutrale Steuerbrücke State');
mustContain('src-ts/runtime-executables/ems/modules/charge-kiosk.ts', 'operatorSummaryJson', 'Betreiber-Summary State');

mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'layoutClass', 'Frontend-Layoutklasse');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'nw-display-banner', 'Display-Warnbanner');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'station.maintenanceMode', 'Wartungsanzeige im Display');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'sessionSolarKwh', 'Frontend Session-Solar-kWh');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'sessionGridKwh', 'Frontend Session-Netz-kWh');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'operatorToday', 'Frontend Betreiber-Tageswert');

// 0.8.21: Burger-Menü darf nicht durch doppelte Seiten-/Shell-Handler sofort wieder schließen.
mustContain('src-ts/runtime-executables/www/nw-shell.ts', 'Burger-Menü-Härtung 0.8.21', 'Burger-Menü-Härtung in Shell');
mustContain('src-ts/runtime-executables/www/nw-shell.ts', "addEventListener('click', nwToggleMenu, true)", 'Capture-Handler für Burger-Menü');
mustContain('src-ts/runtime-executables/www/nw-shell.ts', 'stopImmediatePropagation', 'Doppel-Toggle-Blocker im Burger-Menü');
mustContain('src-ts/runtime-executables/www/app.ts', "btn.dataset.nwMenuBound = 'app'", 'LIVE-Menü markiert eigenen Handler');


// 0.8.20: Jede LP-Kachel bekommt Bedienung; Phasenumschaltung bleibt AC-only.
mustContain('src-ts/runtime-executables/main.ts', 'set-enabled', 'Display-Aktion Regelung An/Aus');
mustContain('src-ts/runtime-executables/main.ts', 'set-mode', 'Display-Aktion Moduswahl');
mustContain('src-ts/runtime-executables/main.ts', 'set-storage', 'Display-Aktion Speicher-Mitnutzung');
mustContain('src-ts/runtime-executables/main.ts', 'set-goal', 'Display-Aktion Ziel-Laden');
mustContain('src-ts/runtime-executables/main.ts', 'set-phase', 'Display-Aktion AC-Phasenumschaltung');
mustContain('src-ts/runtime-executables/main.ts', 'phaseSwitchSupported', 'AC-only Phasengate im Backend');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'renderLpControls', 'LP-Bedienung im Stationsdisplay');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'c.isAc && ctl.phaseSwitchSupported', 'AC-only Phasengate im Frontend');
mustContain('www/dc-station-display.css', 'nw-lp-controls', 'LP-Bedienung CSS');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', 'directHardwareWrite', 'Frontend-Hinweis keine direkte Hardwaresteuerung');
mustContain('www/dc-station-display.css', 'nw-connectors--layout-single', 'Single-Connector-Layout CSS');
mustContain('www/dc-station-display.css', 'nw-connectors--layout-dual', 'Dual-Connector-Layout CSS');
mustContain('www/dc-station-display.css', 'nw-connectors--layout-quad', 'Quad-Connector-Layout CSS');

mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="maintenanceMode"', 'Wartungsmodus im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="watchdogTimeoutSec"', 'Watchdog-Timeout im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="layoutMode"', 'Touch-Layout im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="controlBridge"', 'Herstellerneutrale Steuerbruecke im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="commandStateId"', 'Generischer Command-State im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="controlBridge"', 'Steuerbrücke im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'Kein OCPP-Zwang', 'Installer-Hinweis zur Herstelleroffenheit');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="controlBridge"', 'Steuerbrücke im Installer');
mustContain('src-ts/runtime-executables/www/ems-apps.ts', 'data-ck-field="protocolHint"', 'Protokoll-Hinweis im Installer');
mustMatch('package.json', /"version"\s*:\s*"0\.8\.21"/, 'Paketversion 0.8.21');

console.log('[dc-station-display] OK: Display-API, Watchdog, Layout, Wartungsmodus und Session-/Betreiberbasis und herstelleroffene Steuerbrücke sind abgesichert.');
