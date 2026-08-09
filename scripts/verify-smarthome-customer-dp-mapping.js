#!/usr/bin/env node
'use strict';

/**
 * RC44 access contract:
 * - SmartHome and NexoLogic belong to the customer workspace and use the same
 *   trust boundary as normal LIVE control (session, LAN/VPN or explicit open policy).
 * - EMS/App-Center, license and simulator remain installer/admin protected.
 * - The raw arbitrary datapoint write test remains installer-only.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const ui = read('src-ts/runtime-executables/www/smarthome-config.ts');
const html = read('www/smarthome-config.html');
const logicHtml = read('www/logic.html');

assert.match(main, /const requireCustomerWorkspace = requireAuth;/);
assert.match(main, /const requireCustomerSmartHome = requireCustomerWorkspace;/);
assert.match(main, /const requireCustomerNexoLogic = requireCustomerWorkspace;/);
assert.match(main, /const requireCustomerDpDiscovery = requireCustomerWorkspace;/);
assert.match(main, /app\.get\(\['\/api\/object\/tree', '\/api\/smarthome\/object\/tree'\], requireCustomerDpDiscovery/);
assert.match(main, /app\.get\('\/api\/logic\/blocks', requireCustomerNexoLogic/);
assert.match(main, /app\.get\('\/api\/logic\/editor', requireCustomerNexoLogic/);
assert.match(main, /app\.post\('\/api\/logic\/editor', requireCustomerNexoLogic/);
assert.match(main, /app\.post\('\/api\/smarthome\/config', requireCustomerSmartHome/);
assert.match(main, /app\.post\('\/api\/smarthome\/dpset', requireInstaller/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'appcenter\.open'/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'simulation\.open'/);
assert.match(main, /const requireAdmin = requireCapability\('license\.manage'\)/);

assert.doesNotMatch(html, /data-nw-required-capability=/);
assert.doesNotMatch(html, /admin-guard\.js/);
assert.doesNotMatch(logicHtml, /data-nw-required-capability=/);
assert.doesNotMatch(logicHtml, /admin-guard\.js/);
assert.match(ui, /\/api\/object\/tree/);
assert.match(ui, /hasCapability\('smarthome\.configure'\)/, 'raw test writes must remain expert-only');
assert.match(ui, /state\.treePrefix = nwDpParentPrefix\(state\.input\.value \|\| ''\)/, 'picker must reopen in the current datapoint folder');

console.log('[smarthome-customer-dp-mapping] OK: SmartHome/NexoLogic are customer workspaces; EMS/license/simulator and raw write tests remain protected.');
