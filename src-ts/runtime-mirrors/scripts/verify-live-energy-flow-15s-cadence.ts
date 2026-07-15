// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-live-energy-flow-15s-cadence.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-live-energy-flow-15s-cadence.js
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
 * Original-Hash: 9d750952f0676ad7c9a5c810f87e7aa1add42150dd5013ce2360505337641ff9
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
 * Regression: Häufige SSE-Messwerte dürfen die sichtbare LIVE-/Energieflussanzeige
 * nur im 15-Sekunden-Takt neu rendern. Die EMS-/Backend-Zyklen bleiben davon getrennt.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const tsPath = path.join(root, 'src-ts', 'runtime-executables', 'www', 'app.ts');
const jsPath = path.join(root, 'www', 'app.js');
const ts = fs.readFileSync(tsPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

for (const [name, source] of [['TS source', ts], ['runtime JS', js]]) {
  assert.match(source, /const LIVE_TELEMETRY_RENDER_INTERVAL_MS = 15000;/, `${name}: 15s interval missing`);
  assert.match(source, /function scheduleLiveTelemetryRender\(force = false\)/, `${name}: telemetry scheduler missing`);
  assert.match(source, /if \(isInitMessage\) scheduleLiveTelemetryRender\(true\);/, `${name}: init must render immediately`);
  assert.match(source, /else if \(isUpdateMessage\) scheduleLiveTelemetryRender\(false\);/, `${name}: SSE updates must use 15s scheduler`);
  assert.doesNotMatch(source, /else if \(isUpdateMessage\)[\s\S]{0,160}scheduleRender\(\);/, `${name}: SSE updates bypass cadence`);
}

// Die Datenerfassung/Regelung darf nicht auf 15 Sekunden verlangsamt werden.
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
assert.match(main, /this\._nwLiveCoreRefreshIntervalMs = 3000;/, 'backend live-input refresh must remain fast');

console.log('[live-energy-flow-15s-cadence] OK');
