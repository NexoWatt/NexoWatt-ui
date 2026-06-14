#!/usr/bin/env node
'use strict';
/**
 * Datei: verify-ts-real-plant-shadow-evaluation.js
 *
 * Zweck:
 * Prüft, ob die echte Anlagen-Shadow-Auswertung im Backend und App-Center
 * vorhanden ist. Diese Prüfung schützt die Migrationsdiagnose vor versehentlichem
 * Entfernen.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const mustMain = [
  '_nwBuildTsShadowPlantSample',
  '_nwSummarizeTsShadowPlantSamples',
  '_nwUpdateTsShadowPlantEvaluation',
  'control.tsShadowPlantEvaluation',
  'real-plant-shadow-evaluation-v1',
];
const mustUi = [
  '_renderShadowPlantEvaluationCard',
  'Reale Anlagen-Auswertung',
  'ctrl.tsShadowPlantEvaluation',
  'Rolling-Auswertung der letzten Shadow-Samples',
];
const missing = [];
for (const a of mustMain) if (!main.includes(a)) missing.push(`main.js:${a}`);
for (const a of mustUi) if (!ui.includes(a)) missing.push(`www/ems-apps.js:${a}`);
if (missing.length) {
  console.error('[ts-real-plant-shadow-evaluation] Missing anchors:', missing.join(', '));
  process.exit(1);
}
console.log('[ts-real-plant-shadow-evaluation] OK: reale Anlagen-Shadow-Auswertung ist verdrahtet.');
