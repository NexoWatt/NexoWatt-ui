#!/usr/bin/env node
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
