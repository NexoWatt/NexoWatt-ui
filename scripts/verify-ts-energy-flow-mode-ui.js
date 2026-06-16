#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assertContains(rel, needle){
  const txt = read(rel);
  if (!txt.includes(needle)) {
    console.error(`[ts-energy-flow-mode-ui] FEHLT in ${rel}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: verify-ts-energy-flow-mode-ui
 * Zweck: Prüft, dass der Energiefluss-TS-Schaltmodus im App-Center sichtbar,
 * speicherbar und durch main.js erlaubt ist.
 */
assertContains('www/ems-apps.html', 'energyFlowTsMode');
assertContains('www/ems-apps.html', 'energyFlowTsProductionAllowed');
assertContains('www/ems-apps.js', 'collectEnergyFlowTsMigrationFromUi');
assertContains('www/ems-apps.js', 'applyEnergyFlowTsModeToUi');
assertContains('www/ems-apps.js', 'renderEnergyFlowTsModeStatus');
assertContains('www/ems-apps.js', 'patch.tsMigration');
assertContains('main.js', "'tsMigration'");
assertContains('main.js', 'tsMigration: (n.tsMigration');
assertContains('main.js', '_nwBuildEnergyFlowTsEffectivePlan');
console.log('[ts-energy-flow-mode-ui] OK: Energiefluss-TS-Schaltmodus ist im App-Center sichtbar und speicherbar vorbereitet.');
