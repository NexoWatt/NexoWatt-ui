#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-backend-mirrors.js
 *
 * Zweck:
 * Prüft die backendnahe TS->JS-Spiegelstrategie ohne TypeScript-Compiler.
 * Dadurch kann der Check in `publish:check` laufen, ohne dass vorher `npm install`
 * oder `npm ci` ausgeführt wurde.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/backend/state-cache/state-cache.ts',
    mirrorRel: 'lib/ts-mirrors/backend/state-cache/state-cache.js',
    exports: ['getStateValue', 'hasExplicitStateValue', 'readNumberFromCache', 'readBooleanFromCache'],
  },
  {
    sourceRel: 'src-ts/backend/feature-visibility/feature-visibility.ts',
    mirrorRel: 'lib/ts-mirrors/backend/feature-visibility/feature-visibility.js',
    exports: ['hasEvcsPresence', 'hasStorageFarmPresence', 'buildFeatureVisibilityState'],
  },
  {
    sourceRel: 'src-ts/backend/license/license-key-safety.ts',
    mirrorRel: 'lib/ts-mirrors/backend/license/license-key-safety.js',
    exports: ['normalizeLicenseInput', 'isMaskedLicenseValue', 'shouldStoreLicenseInput', 'buildMaskedLicenseValidationResult'],
  },
];

/**
 * Code-Teil: fail
 * Zweck: Bricht mit klarer Fehlermeldung ab.
 */
function fail(message) {
  console.error(`[verify-ts-backend-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest Pflichtdateien und vereinheitlicht Zeilenenden.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: sourceHash
 * Zweck: Berechnet denselben Hash, den der Build in die JS-Spiegel schreibt.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: requireContains
 * Zweck: Prüft wichtige Kommentar- und Vertragsanker.
 */
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

/**
 * Code-Teil: verifyHash
 *
 * Zweck:
 * Vergleicht den im JS-Spiegel gespeicherten Quell-Hash mit der aktuellen TS-Quelle.
 * So erkennen wir ohne Compiler, ob ein Spiegel veraltet ist.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-backend-mirrors ausführen.`);
}

/**
 * Code-Teil: verifyRuntimeExports
 *
 * Zweck:
 * Lädt den CommonJS-Spiegel mit Node und prüft erwartete Exporte plus kritische
 * Fachregeln: 0 bleibt gültig, EVCS ohne echten DP bleibt unsichtbar und ein
 * maskierter Lizenzwert darf nicht speicherbar sein.
 */
function verifyRuntimeExports(spec) {
  const mod = require(path.join(root, spec.mirrorRel));
  for (const name of spec.exports) {
    if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
  }

  if (spec.mirrorRel.includes('state-cache')) {
    const cache = { 'storageChargePower': { value: 0, ts: 1 } };
    if (mod.readNumberFromCache(cache, 'storageChargePower', null) !== 0) fail('state-cache Spiegel muss 0 W als gültigen Wert lesen.');
    if (mod.hasExplicitStateValue({ value: false }) !== true) fail('state-cache Spiegel muss false als expliziten Wert erkennen.');
  }

  if (spec.mirrorRel.includes('feature-visibility')) {
    if (mod.hasEvcsPresence([{ hasAnyRealDatapoint: false }]) !== false) fail('feature-visibility Spiegel darf EVCS ohne echten DP nicht sichtbar machen.');
    if (mod.hasEvcsPresence([{ measuredPowerDp: '0_userdata.0.evcs.power' }]) !== true) fail('feature-visibility Spiegel muss echten EVCS-DP erkennen.');
    const state = mod.buildFeatureVisibilityState({ storageFarmEnabled: false, storageFarmProofs: [{ socDp: 'x' }] });
    if (state.hasStorageFarm !== false) fail('Speicherfarm darf ohne Aktivierung nicht sichtbar sein.');
  }

  if (spec.mirrorRel.includes('license')) {
    if (mod.shouldStoreLicenseInput('********') !== false) fail('license Spiegel darf maskierten Lizenzwert nicht speichern.');
    if (mod.shouldStoreLicenseInput('NW-REAL-KEY') !== true) fail('license Spiegel muss echten Lizenzwert akzeptieren.');
  }
}

function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-backend-mirrors', 'check:ts-backend-mirrors', 'test:ts-backend-mirrors']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }

  requireContains('tsconfig.backend-mirrors.json', 'src-ts/backend/state-cache/state-cache.ts');
  requireContains('scripts/build-ts-backend-mirrors.js', 'Code-Teil: checkMirrorIsCurrent');
  requireContains('scripts/build-ts-backend-mirrors.js', 'Code-Teil: writeRuntimeMirror');

  for (const spec of mirrorSpecs) {
    requireContains(spec.sourceRel, 'Code-Teil:');
    requireContains(spec.mirrorRel, 'AUTO-GENERATED FILE');
    requireContains(spec.mirrorRel, 'Quell-Hash: sha256:');
    verifyHash(spec);
    verifyRuntimeExports(spec);
  }

  console.log('[verify-ts-backend-mirrors] OK: Backend-TS->JS-Spiegel sind synchron und lauffähig.');
}

main();
