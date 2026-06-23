// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-app-center-structure-cleanup.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-app-center-structure-cleanup.js
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
 * Original-Hash: 7c7b621b5609ce525c7ade3136b7bb4b87b3eee4563f74c2a9098b7cc0688f1c
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
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: assert
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
