'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(cond, msg) { if (!cond) { console.error('[app-center-structure-cleanup] ' + msg); process.exit(1); } }
const ts = read('src-ts/runtime-executables/www/ems-apps.ts');
const html = read('www/ems-apps.html');
assert(html.includes('id="nw-emsapps-back-installer"'), 'Zurück-zum-Installer-Button fehlt im App-Center-Header.');
assert(html.includes('id="systemProfileCardMount"'), 'System-/Marktprofil-Mount im Reiter Zuordnung fehlt.');
assert(html.includes('id="nlP1CardMount"'), 'NL-P1/DSMR-Mount im Reiter Zuordnung fehlt.');
assert(html.includes('id="chargeKioskCardMount"') || html.includes('id="chargeKioskEvcsSlot"'), 'DC-Stationsdisplay-Mount im Reiter Ladepunkte fehlt.');
assert(ts.includes('App-Center-Schema: Diese Liste enthält nur echte Funktions-Apps'), 'Kommentierte App-Center-Schema-Regel fehlt.');
assert(ts.includes('buildAppCenterPlacementUI'), 'Zentrale Platzierungsfunktion für Zuordnung/Ladepunkte fehlt.');
assert(ts.includes("mount(els.systemProfileMount, buildSystemProfileCard())"), 'Systemprofil wird nicht in den Zuordnung-Mount gerendert.');
assert(ts.includes("mount(els.nlP1Mount, buildNlP1Card())"), 'NL-P1 wird nicht in den Zuordnung-Mount gerendert.');
assert(ts.includes("mount(els.chargeKioskMount, buildChargeKioskCard())"), 'Charge-Kiosk wird nicht in den Ladepunkte-Mount gerendert.');
assert(!ts.includes("{ id: 'nlP1', label: 'NL P1/DSMR'"), 'NL P1/DSMR darf nicht mehr als App-Kachel im APP_CATALOG stehen.');
assert(!ts.includes("{ id: 'chargeKiosk', label: 'DC Station Display'"), 'DC Station Display darf nicht mehr als App-Kachel im APP_CATALOG stehen.');
assert(ts.includes('nw-storagefarm-master-detail'), 'Speicherfarm-Master-Detail-Layout fehlt.');
assert(ts.includes('Speicherliste'), 'Speicherfarm-Speicherliste fehlt.');
console.log('[app-center-structure-cleanup] OK');
