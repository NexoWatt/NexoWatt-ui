#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (msg) => {
  console.error(`[ts-charging-storage-policy] ${msg}`);
  process.exit(1);
};
const assertIncludes = (rel, text, label) => {
  const content = read(rel);
  if (!content.includes(text)) fail(`${label || text} fehlt in ${rel}.`);
};

assertIncludes('src-ts/runtime-executables/www/ems-apps.ts', 'storageAssistCustomerAllowed', 'Installer-Freigabe storageAssistCustomerAllowed');
assertIncludes('src-ts/runtime-executables/www/ems-apps.ts', 'Kunde darf Speicher-Mitnutzung bedienen', 'Installer-Haken für Speicher-Mitnutzung');
assertIncludes('src-ts/runtime-executables/www/app.ts', 'evcsStorageAssistRow', 'LIVE-Speicherbedienung');
assertIncludes('src-ts/runtime-executables/www/app.ts', 'evcsStorageAssistCustomerAllowed', 'LIVE-Sichtbarkeit über Installer-Freigabe');
assertIncludes('src-ts/runtime-executables/www/evcs.ts', 'data-ems-storage-assist-btn', 'EVCS-Speicherbedienung');
assertIncludes('www/index.html', 'evcsStorageAssistRow', 'LIVE-HTML Speicherreihe');
assertIncludes('src-ts/runtime-executables/main.ts', 'storage_assist_locked', 'Backend-Gate für gesperrte Speicher-Mitnutzung');
assertIncludes('src-ts/runtime-executables/main.ts', 'userStorageAssistEnabled', 'Backend-User-State userStorageAssistEnabled');
assertIncludes('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storagePolicyJson', 'EVCS-Speicherpolicy-Diagnose');
assertIncludes('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storageAssistCustomerAllowed', 'EVCS-Installer-Gate in Ladelogik');
assertIncludes('src-ts/ems/charging-management/charging-allocation.ts', 'batteryContributionW', 'TS-Allocation Speicherbeitrag');
assertIncludes('src-ts/runtime-executables/ems/modules/storage-control.ts', 'evcsStorageProtectedW', 'Storage-Control Schutzleistung');
assertIncludes('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'batteryContributionW', 'generierter TS-Allocation-Mirror Speicherbeitrag');
assertIncludes('www/app.js', 'evcsStorageAssistRow', 'generierte LIVE-Runtime Speicherbedienung');
assertIncludes('www/evcs.js', 'data-ems-storage-assist-btn', 'generierte EVCS-Runtime Speicherbedienung');

const appTs = read('src-ts/runtime-executables/www/app.ts');
if (!appTs.includes("storageAssistRow.style.display = (!!hasEms && installerAllowed) ? '' : 'none';")) {
  fail('LIVE-Speicherbedienung muss ohne Installer-Freigabe unsichtbar bleiben.');
}
const mainTs = read('src-ts/runtime-executables/main.ts');
if (!/if \(b && !installerAllowed\)[\s\S]*storage_assist_locked/.test(mainTs)) {
  fail('Backend muss Speicher-Mitnutzung bei fehlender Installer-Freigabe blockieren.');
}

console.log('[ts-charging-storage-policy] OK: EVCS Speicher-Mitnutzung ist Installer-gegated, kundenseitig bedienbar und in TS/Runtime verdrahtet.');
