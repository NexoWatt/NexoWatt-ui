#!/usr/bin/env node
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
