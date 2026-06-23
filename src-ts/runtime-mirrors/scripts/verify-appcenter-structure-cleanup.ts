// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-appcenter-structure-cleanup.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-appcenter-structure-cleanup.js
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
 * Original-Hash: f3635838cc35f701be6fdd06303af57803a6875c4c5669c4ee73a59e06395463
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
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: ok
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
