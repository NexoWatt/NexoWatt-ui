#!/usr/bin/env node
'use strict';

/** Customers may discover/map SmartHome DPs, while arbitrary test writes remain installer-only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
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
