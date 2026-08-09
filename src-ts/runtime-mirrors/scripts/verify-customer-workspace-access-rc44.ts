// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-customer-workspace-access-rc44.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-customer-workspace-access-rc44.js
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
 * Original-Hash: 81f43b86fa84671312eecf0b714013a1f6e9851497ddf162011722431eb55727
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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const smarthome = read('www/smarthome-config.html');
const logic = read('www/logic.html');
const apps = read('www/ems-apps.html');
const simulation = read('www/simulation.html');

assert.match(main, /const requireCustomerWorkspace = requireAuth;/);
assert.match(main, /const requireCustomerSmartHome = requireCustomerWorkspace;/);
assert.match(main, /const requireCustomerNexoLogic = requireCustomerWorkspace;/);
assert.match(main, /app\.get\(\['\/smarthome-config\.html', '\/smarthome-config'\], async \(_req, res\)/);
assert.match(main, /app\.get\(\['\/logic\.html','\/logic'\], async \(_req, res\)/);
assert.doesNotMatch(smarthome, /data-nw-required-capability=/);
assert.doesNotMatch(logic, /data-nw-required-capability=/);
assert.doesNotMatch(smarthome, /admin-guard\.js/);
assert.doesNotMatch(logic, /admin-guard\.js/);

assert.match(apps, /data-nw-required-capability="appcenter\.open"/);
assert.match(simulation, /data-nw-admin-page="simulation"/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'simulation\.open'/);
assert.match(main, /const requireAdmin = requireCapability\('license\.manage'\)/);
assert.match(main, /app\.post\('\/api\/smarthome\/dpset', requireInstaller/);

console.log('[customer-workspace-access-rc44] OK: customer configuration is unlocked; EMS, license, simulator and raw write tests remain protected.');
