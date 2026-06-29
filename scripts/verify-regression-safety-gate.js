#!/usr/bin/env node
'use strict';
/**
 * NexoWatt 0.8.59 Regression Safety Gate.
 * Sichert, dass kritische App-Center-/Runtime-Bereiche nicht wieder durch neue
 * Module beschädigt werden. Der Test ist statisch, aber absichtlich hart.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, needle, label) {
  const s = read(rel);
  if (!s.includes(needle)) {
    console.error(`[regression-safety-gate] FEHLT ${label || needle} in ${rel}`);
    process.exit(1);
  }
}
function mustNot(rel, needle, label) {
  const s = read(rel);
  if (s.includes(needle)) {
    console.error(`[regression-safety-gate] VERBOTEN ${label || needle} in ${rel}`);
    process.exit(1);
  }
}
const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '0.8.59') {
  console.error(`[regression-safety-gate] package.json Version ist ${pkg.version}, erwartet 0.8.59`);
  process.exit(1);
}
const scripts = pkg.scripts || {};
for (const name of [
  'test:storagefarm-appcenter-restore',
  'test:storagefarm-appcenter-hydration',
  'test:storage-farm-config-fallback',
  'test:app-center-structure-cleanup',
  'test:no-release-artifacts',
]) {
  if (!scripts[name]) {
    console.error(`[regression-safety-gate] npm-Script fehlt: ${name}`);
    process.exit(1);
  }
}
must('src-ts/runtime-executables/www/ems-apps.ts', 'function applyAppCenterRegressionSafetyGate(patch)', 'Save-Gate Funktion TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'storageFarmBeforeCount', 'Speicherfarm Vorher/Nachher Check TS');
must('src-ts/runtime-executables/www/ems-apps.ts', '__saveGuardRestored', 'Speicherfarm Save-Guard Restore TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'applyAppCenterRegressionSafetyGate(collectPatchFromUI())', 'Save-Gate Aufruf TS');
must('src-ts/runtime-executables/www/ems-apps.ts', 'hydrateStorageFarmConfigFromRuntimeState', 'Speicherfarm Runtime-Hydration bleibt erhalten');
must('www/ems-apps.js', 'function applyAppCenterRegressionSafetyGate(patch)', 'Save-Gate Funktion Runtime');
must('www/ems-apps.js', 'applyAppCenterRegressionSafetyGate(collectPatchFromUI())', 'Save-Gate Aufruf Runtime');
must('scripts/verify-storagefarm-appcenter-restore.js', 'storageFarm.configJson', 'Speicherfarm Restore-Test configJson');
must('scripts/verify-storagefarm-appcenter-hydration.js', 'storagesStatusJson', 'Speicherfarm Hydration-Test status fallback');
mustNot('src-ts/runtime-executables/www/ems-apps.ts', 'appsList.appendChild(buildMeshMicrogridCard())', 'Mesh Detailkarte darf nicht in Apps gerendert werden');
console.log('[regression-safety-gate] OK: App-Center Save-Gate und kritische Regressionstests sind vorhanden.');
