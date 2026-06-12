#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-resolver-mirrors.js
 *
 * Zweck:
 * Prüft die TS->JS-Spiegel für Resolver ohne TypeScript-Compiler. Dieser Check darf im
 * schnellen `publish:check` laufen, weil er nur vorhandene Dateien, Hashes und Exporte
 * prüft.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/resolvers/energy-flow-resolver.ts',
    mirrorRel: 'lib/ts-mirrors/resolvers/energy-flow-resolver.js',
    exports: ['resolveStorageFlow', 'resolveGridFlow', 'calculateBuildingLoadFromBalance', 'buildEnergyFlowSnapshot'],
  },
  {
    sourceRel: 'src-ts/resolvers/feature-visibility-resolver.ts',
    mirrorRel: 'lib/ts-mirrors/resolvers/feature-visibility-resolver.js',
    exports: ['hasRealEvcsPresenceProof', 'hasRealStorageFarmPresenceProof', 'deriveCustomerFeatureVisibility'],
  },
  {
    sourceRel: 'src-ts/utils/energy-flow.ts',
    mirrorRel: 'lib/ts-mirrors/utils/energy-flow.js',
    exports: ['splitSignedStoragePower', 'resolveSplitStorageDps', 'calculateStorageFromBalance', 'splitSignedGridPower'],
  },
  {
    sourceRel: 'src-ts/utils/number.ts',
    mirrorRel: 'lib/ts-mirrors/utils/number.js',
    exports: ['toNumberOrNull', 'positiveWatt', 'percent'],
  },
];

/** Code-Teil: fail — bricht mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-resolver-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: readRequired — liest Pflichtdateien und normalisiert Zeilenenden. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: sourceHash — berechnet den erwarteten Hash der TypeScript-Quelle. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: verifyHash
 * Zweck: Vergleicht Quell-Hash im JS-Spiegel mit der aktuellen TypeScript-Datei.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-resolver-mirrors ausführen.`);
}

/**
 * Code-Teil: verifyExports
 * Zweck: Lädt den CommonJS-Spiegel und prüft, dass die erwarteten Funktionen vorhanden
 * sind. Damit wird der Mirror nicht nur textuell, sondern auch als Node-Modul geprüft.
 */
function verifyExports(spec) {
  const mod = require(path.join(root, spec.mirrorRel));
  for (const name of spec.exports) {
    if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
  }
  return mod;
}

/**
 * Code-Teil: verifyCriticalRules
 * Zweck: Prüft wenige fachliche Sicherheitsregeln direkt über die Mirrors.
 */
function verifyCriticalRules(loaded) {
  const energy = loaded['lib/ts-mirrors/resolvers/energy-flow-resolver.js'];
  const visibility = loaded['lib/ts-mirrors/resolvers/feature-visibility-resolver.js'];
  const number = loaded['lib/ts-mirrors/utils/number.js'];

  if (number.toNumberOrNull(0) !== 0) fail('number mirror muss 0 als gültige Zahl akzeptieren.');

  const splitStorage = energy.resolveStorageFlow({ hasConfiguredSplitDp: true, chargeW: 0, dischargeW: 0, socPct: 44 });
  if (splitStorage.source !== 'split-dp' || splitStorage.chargeW !== 0 || splitStorage.dischargeW !== 0 || splitStorage.hasConfiguredStorageDp !== true) {
    fail('energy-flow mirror muss Split-Speicher-DPs mit 0 W als gültige Quelle behandeln.');
  }

  const signedCharge = energy.resolveStorageFlow({ hasConfiguredSignedDp: true, signedW: -1800, signedConvention: 'positive-discharge' });
  if (signedCharge.chargeW !== 1800 || signedCharge.dischargeW !== 0 || signedCharge.source !== 'signed-dp') {
    fail('energy-flow mirror muss signed Speicher-DP negativ = Laden korrekt aufteilen.');
  }

  const calculated = energy.resolveStorageFlow({ balance: { pvW: 6500, gridImportW: 0, gridExportW: 2000, additionalKnownLoadW: 1700 } });
  if (calculated.source !== 'calculated' || calculated.chargeW !== 2800) {
    fail('energy-flow mirror muss Speicherfallback aus Bilanz nur ohne Speicher-DP korrekt berechnen.');
  }

  const hiddenEvcs = visibility.deriveCustomerFeatureVisibility({ evcsEnabled: true, evcsProofs: [{ hasAnyRealDatapoint: false }] });
  if (hiddenEvcs.hasEvcs !== false) fail('visibility mirror darf EVCS ohne echten Ladepunkt nicht sichtbar machen.');

  const visibleEvcs = visibility.deriveCustomerFeatureVisibility({ evcsEnabled: true, evcsProofs: [{ measuredPowerDp: '0_userdata.0.evcs.power' }] });
  if (visibleEvcs.hasEvcs !== true) fail('visibility mirror muss echten EVCS-DP sichtbar machen.');
}

function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-resolver-mirrors', 'check:ts-resolver-mirrors', 'test:resolver-mirrors']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }

  readRequired('tsconfig.resolver-mirrors.json');
  readRequired('scripts/build-ts-resolver-mirrors.js');

  const loaded = {};
  for (const spec of mirrorSpecs) {
    const source = readRequired(spec.sourceRel);
    if (!source.includes('Code-Teil:')) fail(`${spec.sourceRel} enthält keine Code-Teil-Kommentare.`);
    const mirror = readRequired(spec.mirrorRel);
    if (!mirror.includes('AUTO-GENERATED FILE')) fail(`${spec.mirrorRel} enthält keinen Generator-Hinweis.`);
    verifyHash(spec);
    loaded[spec.mirrorRel] = verifyExports(spec);
  }

  verifyCriticalRules(loaded);
  console.log('[verify-ts-resolver-mirrors] OK: Resolver-TS->JS-Spiegel sind synchron und fachlich plausibel.');
}

main();
