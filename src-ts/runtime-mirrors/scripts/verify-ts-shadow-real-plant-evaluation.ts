// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-real-plant-evaluation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-shadow-real-plant-evaluation.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: c10f8a3d2391a5975dbef0af8e8b7e34ede6a00c5f8eb818d38b572ba920750b
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

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
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
