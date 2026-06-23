#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-appcenter-structure-cleanup.js
 * Zweck: Regressionstest für das App-Center-Schema ab 0.8.33.
 *
 * Hintergrund:
 * - Der Reiter "Apps" darf nur echte Funktionsmodule zeigen.
 * - Länderprofil und NL P1/DSMR gehören unter "Zuordnung".
 * - DC-Stationsseiten gehören unter "Ladepunkte".
 * - Die Speicherfarm muss bei mehreren Speichern übersichtlich bleiben.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function ok(cond, msg) {
  if (!cond) {
    console.error('[appcenter-structure] ERROR: ' + msg);
    process.exit(1);
  }
}

const ts = read('src-ts/runtime-executables/www/ems-apps.ts');
const js = read('www/ems-apps.js');
const html = read('www/ems-apps.html');
const css = read('www/styles.css');

ok(ts.includes('App-Center-Schema: Diese Liste enthält nur echte Funktions-Apps.'), 'APP_CATALOG-Schema-Kommentar fehlt.');
ok(!/\{ id: 'nlP1', label: 'NL P1\/DSMR'/.test(ts), 'NL P1/DSMR darf nicht als Apps-Kachel im APP_CATALOG stehen.');
ok(!/\{ id: 'chargeKiosk', label: 'DC Station Display'/.test(ts), 'DC Station Display darf nicht als Apps-Kachel im APP_CATALOG stehen.');
ok(ts.includes('buildAppCenterPlacementUI'), 'zentrale Placement-Funktion fehlt.');
ok(js.includes('buildAppCenterPlacementUI'), 'generierte Runtime enthält Placement-Funktion nicht.');

ok(html.includes('id="systemProfileCardMount"'), 'Zuordnung: System-/Marktprofil-Mount fehlt.');
ok(html.includes('id="nlP1CardMount"'), 'Zuordnung: NL P1/DSMR-Mount fehlt.');
ok(html.includes('id="chargeKioskCardMount"'), 'Ladepunkte: DC Station Display-Mount fehlt.');
ok(html.includes('id="nw-emsapps-back-installer"'), 'Zurück-zum-Installer-Button fehlt.');
ok(html.indexOf('id="systemProfileCardMount"') < html.indexOf('id="mappingGrid"'), 'Systemprofil muss vor dem allgemeinen Zuordnungsgrid liegen.');
ok(html.indexOf('id="chargeKioskCardMount"') > html.indexOf('id="stationGroups"'), 'DC Station Display muss im Ladepunkte-Reiter bei Stationen liegen.');

ok(ts.includes('setupInstallerBackButton'), 'Back-Button-Bindung fehlt in TS.');
ok(js.includes('setupInstallerBackButton'), 'Back-Button-Bindung fehlt in Runtime-JS.');

ok(ts.includes('nw-storagefarm-master-detail'), 'Speicherfarm Master-Detail-Layout fehlt in TS.');
ok(css.includes('0.8.33 Speicherfarm Master-Detail'), 'Speicherfarm Master-Detail-CSS fehlt.');
ok(css.includes('.nw-storagefarm-list-btn--active'), 'Speicherfarm aktive Listenmarkierung fehlt.');

console.log('[appcenter-structure] OK: App-Center-Schema, Platzierungen, Back-Button und Speicherfarm-Layout geprüft.');
