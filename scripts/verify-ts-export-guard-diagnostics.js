#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, text) {
  if (!read(rel).includes(text)) {
    console.error(`[export-guard-diagnostics] ${rel} enthält nicht: ${text}`);
    process.exit(1);
  }
}
for (const rel of ['src-ts/runtime-executables/ems/modules/grid-constraints.ts', 'ems/modules/grid-constraints.js']) {
  need(rel, 'gridConstraints.exportLimit.currentExportW');
  need(rel, 'gridConstraints.exportLimit.effectiveMaxFeedInW');
  need(rel, 'gridConstraints.exportLimit.exportOverLimitW');
  need(rel, 'gridConstraints.exportLimit.estimatedCurtailmentW');
  need(rel, 'gridConstraints.exportLimit.missingWriteDatapointsJson');
  need(rel, 'gridConstraints.exportLimit.negativePriceStrategy');
  need(rel, '_publishExportLimitStates');
  need(rel, '_writeDiagnosticsForGroup');
}
for (const rel of ['src-ts/runtime-executables/ems/modules/energy-wallet.ts', 'ems/modules/energy-wallet.js']) {
  need(rel, 'curtailedPvKwh');
  need(rel, 'curtailedPvValueEur');
  need(rel, 'unusedPvValueEur');
  need(rel, 'gridConstraints.exportLimit.estimatedCurtailmentW');
}
for (const rel of ['src-ts/runtime-executables/www/app.ts', 'www/app.js']) {
  need(rel, 'energyWalletExportGuardGrid');
}
console.log('[export-guard-diagnostics] OK');
