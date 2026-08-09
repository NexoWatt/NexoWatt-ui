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
 * Original-Hash: cc9a36834dc2143178211a061e9c16eba7f6f551a6ad8ca70cf95690236a64e9
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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const guard = fs.readFileSync(path.join(root, 'scripts', 'verify-npm-version-free.js'), 'utf8');
const publishEnv = fs.readFileSync(path.join(root, 'scripts', 'ensure-publish-dev-deps.js'), 'utf8');
const scripts = pkg.scripts || {};
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const expectedTs = '5.8.3';

assert.match(String(scripts['release:check-version-free'] || ''), /verify-npm-version-free\.js/,
  'release:check-version-free must call the version-free guard');
assert.strictEqual(
  String(scripts.prepublishOnly || '').trim(),
  'npm run release:check-version-free && npm run publish:check',
  'prepublishOnly must check the free version first and then execute the complete, read-only publish gate'
);
assert.doesNotMatch(String(scripts.prepublishOnly || ''), /sync:|build:|npm install|npm ci/,
  'prepublishOnly must not rewrite tracked runtime/source files or install dependencies');
assert.strictEqual(String(pkg.devDependencies?.typescript || ''), expectedTs,
  'TypeScript must be pinned exactly to the compiler used for the checked-in runtime artifacts');
assert.strictEqual(String(lock.packages?.['']?.devDependencies?.typescript || ''), expectedTs,
  'package-lock root TypeScript declaration must match package.json exactly');
assert.strictEqual(String(lock.packages?.['node_modules/typescript']?.version || ''), expectedTs,
  'package-lock must resolve the exact release compiler');
assert.strictEqual(String(pkg.publishConfig?.registry || ''), 'https://registry.npmjs.org/',
  'npm publish must be pinned to the public npm registry');
assert.strictEqual(String(pkg.publishConfig?.access || ''), 'public',
  'unscoped adapter package must remain explicitly public on npm');
assert.match(publishEnv, /installed !== expected/,
  'publish environment check must reject a compiler-version mismatch');
assert.doesNotMatch(publishEnv, /npm install|spawnSync|execSync/,
  'publish environment check must remain read-only and must not install packages');
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

console.log(`[npm-version-free-guard] OK: version guard runs first; publish gate is read-only and uses pinned TypeScript ${expectedTs}.`);
