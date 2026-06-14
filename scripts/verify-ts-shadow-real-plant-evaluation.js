#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-shadow-real-plant-evaluation.js
 *
 * Zweck:
 * Prüft die Diagnose-Erweiterung aus 0.7.84. Die Auswertung sammelt Shadow-
 * Samples einer echten Anlage und zeigt daraus eine klare Handlungsempfehlung.
 *
 * Wichtig:
 * Diese Prüfung ändert keine produktive Runtime. Sie stellt nur sicher, dass die
 * Diagnosefelder und die App-Center-Karte vorhanden bleiben.
 */

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const need = (cond, msg) => { if (!cond) { console.error('[ts-shadow-real-plant-evaluation] ' + msg); process.exit(1); } };

const main = read('main.js');
const ui = read('www/ems-apps.js');

need(main.includes('_nwBuildTsShadowPlantSample'), 'main.js: Plant-Sample Builder fehlt.');
need(main.includes('_nwSummarizeTsShadowPlantSamples'), 'main.js: Plant-Sample Zusammenfassung fehlt.');
need(main.includes('_nwUpdateTsShadowPlantEvaluation'), 'main.js: Rolling-Auswertung fehlt.');
need(main.includes('control.tsShadowPlantEvaluation = this._nwUpdateTsShadowPlantEvaluation(control, control.tsShadowReadiness);'), 'main.js: Diagnose-API hängt tsShadowPlantEvaluation nicht an.');
need(main.includes('_nwBuildTsShadowRealPlantEvaluation'), 'main.js: zusätzliche Sofortauswertung fehlt.');
need(main.includes('control.tsShadowRealPlantEvaluation = this._nwBuildTsShadowRealPlantEvaluation(control);'), 'main.js: Diagnose-API hängt tsShadowRealPlantEvaluation nicht an.');
need(ui.includes('_renderShadowPlantEvaluationCard'), 'www/ems-apps.js: Plant-Auswertungskarte fehlt.');
need(ui.includes('ctrl.tsShadowPlantEvaluation || ctrl.tsShadowRealPlantEvaluation'), 'www/ems-apps.js: UI-Fallback für RealPlant-Auswertung fehlt.');
need(ui.includes('Reale Anlagen-Auswertung'), 'www/ems-apps.js: sichtbarer Kartentitel fehlt.');

console.log('[ts-shadow-real-plant-evaluation] OK: Echte-Anlage-Auswertung ist vorbereitet.');
