// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-npm-version-free-guard-static.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-npm-version-free-guard-static.js
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
 * Original-Hash: c4853217f28cf91d426335fd22e8b3034a35a1f0b9771d29e569a69f41493882
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

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const guard = fs.readFileSync(path.join(root, 'scripts', 'verify-npm-version-free.js'), 'utf8');
const scripts = pkg.scripts || {};

assert.match(String(scripts['release:check-version-free'] || ''), /verify-npm-version-free\.js/,
  'release:check-version-free must call the version-free guard');
assert.ok(String(scripts.prepublishOnly || '').startsWith('npm run release:check-version-free &&'),
  'prepublishOnly must run the version-free guard before all other publish steps');
assert.match(guard, /https:\/\/registry\.npmjs\.org/,
  'public npm registry must be the explicit default');
assert.match(guard, /statusCode === 404/,
  'only HTTP 404 may release a version for publishing');
assert.match(guard, /statusCode >= 200 && response\.statusCode < 300/,
  'existing package versions must block publishing');
assert.match(guard, /setTimeout\(timeoutMs/,
  'registry requests must be bounded by a timeout');
assert.match(guard, /fail-closed|sicherheitshalber blockiert/i,
  'ambiguous registry failures must block publishing');

console.log('[npm-version-free-guard] OK: prepublish duplicate-version protection is fail-closed and uses the public npm registry by default.');
