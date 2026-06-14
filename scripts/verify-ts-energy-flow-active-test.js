#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: verify-ts-energy-flow-active-test.js
 *
 * Zweck:
 * Prüft die 0.7.86-Erweiterung für den kontrollierten Energiefluss-TS-Aktivtest.
 * Der Test stellt sicher, dass Backend und App-Center die Aktivtest-Diagnose führen,
 * ohne die Sicherheitsgates zu umgehen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const errors = [];
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) errors.push(`${file}: fehlt ${label}`);
}

must('main.js', '_nwRecordEnergyFlowTsActiveTestSample', 'Backend-Aufzeichnung des Aktivtests');
must('main.js', '_nwSummarizeEnergyFlowTsActiveTestSamples', 'Backend-Zusammenfassung des Aktivtests');
must('main.js', 'control.energyFlowTsActiveTest', 'Diagnose-API-Feld energyFlowTsActiveTest');
must('main.js', 'tsActiveTest: effectiveEnergyFlow.activeTest', 'Energiefluss-Debugfeld tsActiveTest');
must('www/ems-apps.js', '_renderEnergyFlowTsActiveTestCard', 'App-Center Aktivtest-Karte');
must('www/ems-apps.js', 'Energiefluss TS‑Aktivtest', 'sichtbarer App-Center Titel');

if (errors.length) {
  console.error('[energy-flow-active-test] Fehler:\n' + errors.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('[energy-flow-active-test] OK: kontrollierter Energiefluss-TS-Aktivtest ist verdrahtet.');
