// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-real-plant-shadow-evaluation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-real-plant-shadow-evaluation.js
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
 * Original-Hash: 638265a1e72325c900d6048759953e026d1ff30d7035cfb40dc66e222ba846e6
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
