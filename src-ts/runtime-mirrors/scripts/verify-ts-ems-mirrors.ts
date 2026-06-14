// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-ems-mirrors.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-ems-mirrors.js
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
 * Original-Hash: f68db59b51164d84c9f3d0eb28fafd44ae249452d93cb06546e5b606b2b61671
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
 * Datei: scripts/verify-ts-ems-mirrors.js
 *
 * Zweck:
 * Prüft die EMS-TS->JS-Spiegelstrategie ohne produktive Runtime-Umschaltung.
 * Der Check stellt sicher, dass Core-Budget- und Heizstab-Entscheidungs-Spiegel
 * vorhanden, synchron und mit Node importierbar sind.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/utils/number.ts',
    mirrorRel: 'lib/ts-mirrors/utils/number.js',
    exports: ['toNumberOrNull', 'positiveWatt', 'clampNumber'],
  },
  {
    sourceRel: 'src-ts/ems/core-limits/core-budget.ts',
    mirrorRel: 'lib/ts-mirrors/ems/core-limits/core-budget.js',
    exports: ['isStorageReserveActive', 'calculatePvBudgetGate', 'calculateGridBudgetGate', 'buildCoreBudgetSnapshot'],
  },
  {
    sourceRel: 'src-ts/ems/heating-rod/heating-rod-decision.ts',
    mirrorRel: 'lib/ts-mirrors/ems/heating-rod/heating-rod-decision.js',
    exports: ['chooseLargestStageWithinBudget', 'isHeatingRodStorageReserveActive', 'evaluateHeatingRodDecision'],
  },
];

/** Code-Teil: fail — bricht mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-ems-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: readRequired — liest Pflichtdateien und vereinheitlicht Zeilenenden. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: sourceHash — berechnet denselben Hash, den der Build in den Spiegel schreibt. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/** Code-Teil: requireContains — prüft wichtige Kommentar- und Vertragsanker. */
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

/**
 * Code-Teil: verifyHash
 * Zweck: Prüft, ob der Spiegel zum aktuellen TypeScript-Quellstand passt.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-ems-mirrors ausführen.`);
}

/**
 * Code-Teil: verifyRuntimeExports
 *
 * Zweck:
 * Lädt die CommonJS-Spiegel mit Node und prüft kritische Fachregeln:
 * Speicherreserve reduziert PV-Budget, 0 W bleibt gültig und Heizstabstufen werden
 * ohne Rückfall auf falsche Defaults ausgewählt.
 */
function verifyRuntimeExports(spec) {
  const mod = require(path.join(root, spec.mirrorRel));
  for (const name of spec.exports) {
    if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
  }

  if (spec.mirrorRel.includes('utils/number')) {
    if (mod.toNumberOrNull('0') !== 0) fail('number Spiegel muss String "0" als Zahl 0 lesen.');
    if (mod.positiveWatt(-25) !== 0) fail('number Spiegel muss negative Watt-Werte auf 0 begrenzen.');
    if (mod.clampNumber(120, 0, 100) !== 100) fail('number Spiegel muss Werte begrenzen.');
  }

  if (spec.mirrorRel.includes('core-limits')) {
    const snap = mod.buildCoreBudgetSnapshot({
      ts: 1,
      pvSurplusW: 5000,
      storageReserveW: 1000,
      alreadyReservedW: 500,
      storageSocPct: 20,
      storageReserveSocPct: 30,
      allowStorageDischarge: true,
      gridImportW: 5000,
      gridImportLimitW: 30000,
      allowGridImport: true,
    });
    if (snap.storageReserveActive !== true) fail('core-budget Spiegel muss aktive Speicherreserve erkennen.');
    if (snap.pv.effectiveW !== 3500) fail(`core-budget Spiegel erwartet PV effektiv 3500 W, ist ${snap.pv.effectiveW}.`);
    if (snap.grid.effectiveW !== 25000) fail(`core-budget Spiegel erwartet Grid effektiv 25000 W, ist ${snap.grid.effectiveW}.`);
    const zero = mod.calculatePvBudgetGate({ pvSurplusW: 0, storageReserveW: 0, alreadyReservedW: 0, allowStorageDischarge: true });
    if (zero.effectiveW !== 0 || zero.reason !== 'pv-surplus') fail('core-budget Spiegel muss 0 W PV-Budget als gültig behandeln.');
  }

  if (spec.mirrorRel.includes('heating-rod')) {
    const device = {
      id: 'rod1',
      enabled: true,
      mode: 'auto',
      storageReserveW: 1000,
      storageReserveSocPct: 20,
      allowGridImport: false,
      allowStorageDischarge: true,
      stages: [
        { stage: 1, powerW: 1000 },
        { stage: 2, powerW: 2000 },
        { stage: 3, powerW: 3000 },
      ],
    };
    const decision = mod.evaluateHeatingRodDecision({ ts: 1, device, availablePvW: 2500, availableTotalW: 10000, storageSocPct: 55 });
    if (decision.targetStage !== 2 || decision.targetPowerW !== 2000) fail('heating-rod Spiegel muss größte passende Stufe wählen.');
    const blocked = mod.evaluateHeatingRodDecision({ ts: 1, device, availablePvW: 5000, availableTotalW: 10000, storageSocPct: 10 });
    if (blocked.targetStage !== 0 || blocked.reason !== 'storage-reserve') fail('heating-rod Spiegel muss bei Speicherreserve blockieren.');
  }
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-ems-mirrors', 'check:ts-ems-mirrors', 'test:ems-mirrors']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }
  requireContains('tsconfig.ems-mirrors.json', 'src-ts/ems/core-limits/core-budget.ts');
  requireContains('scripts/build-ts-ems-mirrors.js', 'Code-Teil: checkMirrorIsCurrent');
  requireContains('scripts/build-ts-ems-mirrors.js', 'Code-Teil: writeRuntimeMirror');

  for (const spec of mirrorSpecs) {
    requireContains(spec.sourceRel, 'Code-Teil:');
    requireContains(spec.mirrorRel, 'AUTO-GENERATED FILE');
    requireContains(spec.mirrorRel, 'Quell-Hash: sha256:');
    verifyHash(spec);
    verifyRuntimeExports(spec);
  }

  console.log('[verify-ts-ems-mirrors] OK: EMS-TS->JS-Spiegel sind synchron und lauffähig.');
}

main();
