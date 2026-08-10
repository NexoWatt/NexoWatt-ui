// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-privileged-customer-role-split-rc45.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-privileged-customer-role-split-rc45.js
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
 * Original-Hash: d4f74eee34268769fdd83a696ff9a03b06e074b560ed363afe3c5b6acd67d695
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
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'src-ts/runtime-executables/main.ts'), 'utf8');

const installer = /installer:\s*\[([\s\S]*?)\]\s*,\s*customer:/.exec(source);
const customer = /customer:\s*\[([\s\S]*?)\]\s*,\s*display:/.exec(source);
assert.ok(installer && customer, 'Rollen-Capability-Blöcke nicht gefunden.');

for (const cap of ['appcenter.open', 'simulation.open', 'license.manage']) {
  assert.match(installer[1], new RegExp(`['\"]${cap.replace('.', '\\.') }['\"]`), `Installer-Capability fehlt: ${cap}`);
  assert.doesNotMatch(customer[1], new RegExp(cap.replace('.', '\\.')), `Customer darf ${cap} nicht besitzen.`);
}
for (const cap of ['smarthome.configureCustomer', 'nexologic.configureCustomer']) {
  assert.match(customer[1], new RegExp(cap.replace('.', '\\.')), `Customer-Capability fehlt: ${cap}`);
}

assert.match(source, /const\s+requireCustomerWorkspace\s*=\s*requireAuth/);
assert.match(source, /app\.get\('\/api\/smarthome\/config',\s*requireCustomerSmartHome/);
assert.match(source, /app\.post\('\/api\/smarthome\/config',\s*requireCustomerSmartHome/);
assert.match(source, /app\.get\('\/api\/smarthome\/dpsearch',\s*requireCustomerDpDiscovery/);
assert.match(source, /app\.get\('\/api\/logic\/editor',\s*requireCustomerNexoLogic/);
assert.match(source, /app\.post\('\/api\/logic\/editor',\s*requireCustomerNexoLogic/);

assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'appcenter\.open'/);
assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'simulation\.open'/);
assert.match(source, /requirePageAccessOrRenderLock\(req,\s*res,\s*'license\.manage'/);

const rawWrite = /api\/smarthome\/dptest-write[\s\S]{0,260}/.exec(source);
if (rawWrite) assert.match(rawWrite[0], /requireInstaller|requireCapability/, 'Beliebiger Roh-DP-Schreibtest muss Installer-geschützt bleiben.');

console.log('[rc45-role-split] OK: SmartHome/NexoLogic bleiben Kunden-Arbeitsbereiche; EMS, Lizenz, Simulator und privilegierte Rohzugriffe bleiben Installer/Admin vorbehalten.');
