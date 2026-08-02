// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-smarthome-customer-dp-mapping.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-smarthome-customer-dp-mapping.js
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
 * Original-Hash: c3f91b6143732b188c94a77131e2e8e80ba988f347675383e4dc1757c4e8a513
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

/** Customers may discover/map SmartHome DPs, while arbitrary test writes remain installer-only. */
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
const ui = read('src-ts/runtime-executables/www/smarthome-config.ts');
const html = read('www/smarthome-config.html');

assert.match(main, /customer:\s*\[[\s\S]*'smarthome\.configureCustomer'/);
assert.match(main, /const requireCustomerSmartHome = requireCapability\('smarthome\.configureCustomer'\)/);
assert.match(main, /const requireCustomerDpDiscovery = requireCapability\(\['appcenter\.open', 'smarthome\.configureCustomer', 'nexologic\.configureCustomer'\]\)/);
assert.match(main, /app\.get\(\['\/api\/object\/tree', '\/api\/smarthome\/object\/tree'\], requireCustomerDpDiscovery/);
assert.match(main, /app\.get\(\['\/smarthome-config\.html', '\/smarthome-config'\][\s\S]*'smarthome\.configureCustomer'/);
assert.match(main, /app\.post\('\/api\/smarthome\/config', requireCustomerSmartHome/);
assert.match(main, /app\.post\('\/api\/object\/validate', requireInstaller/);
assert.match(html, /data-nw-required-capability="smarthome\.configureCustomer"/);
assert.doesNotMatch(html, /admin-guard\.js/);
assert.match(ui, /\/api\/object\/tree/);
assert.doesNotMatch(ui, /\/api\/smarthome\/object\/tree/);
assert.match(ui, /addEventListener\(['"]input['"]/);

console.log('[smarthome-customer-dp-mapping] OK: customer DP discovery and mapping are enabled; arbitrary hardware validation/write remains installer-only.');
