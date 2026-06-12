#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-resolver-mirror-runtime.js
 *
 * Zweck:
 * Führt produktionsnahe Runtime-Fälle direkt gegen die generierten Resolver-Spiegel aus.
 * Das ist der Sicherheitsgurt vor einer späteren Integration in `main.js` oder `www/app.js`.
 */

const path = require('path');
const root = path.resolve(__dirname, '..');
const energy = require(path.join(root, 'lib/ts-mirrors/resolvers/energy-flow-resolver.js'));
const visibility = require(path.join(root, 'lib/ts-mirrors/resolvers/feature-visibility-resolver.js'));

/** Code-Teil: fail — bricht mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-resolver-mirror-runtime] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: expect — kleine Assertion-Funktion ohne Testframework. */
function expect(condition, message) {
  if (!condition) fail(message);
}

/**
 * Code-Teil: runEnergyFlowCases
 * Zweck: Prüft die kritischen Energieflussfälle, die später nicht kaputtgehen dürfen.
 */
function runEnergyFlowCases() {
  const cases = [
    {
      name: 'split storage 0 W remains measured',
      result: energy.resolveStorageFlow({ hasConfiguredSplitDp: true, chargeW: 0, dischargeW: 0, socPct: 44 }),
      check: (r) => r.source === 'split-dp' && r.chargeW === 0 && r.dischargeW === 0 && r.socPct === 44,
    },
    {
      name: 'signed storage positive means discharge',
      result: energy.resolveStorageFlow({ hasConfiguredSignedDp: true, signedW: 1900, signedConvention: 'positive-discharge' }),
      check: (r) => r.source === 'signed-dp' && r.dischargeW === 1900 && r.chargeW === 0,
    },
    {
      name: 'signed storage negative means charge',
      result: energy.resolveStorageFlow({ hasConfiguredSignedDp: true, signedW: -2400, signedConvention: 'positive-discharge' }),
      check: (r) => r.source === 'signed-dp' && r.chargeW === 2400 && r.dischargeW === 0,
    },
    {
      name: 'calculated storage only without configured dp',
      result: energy.resolveStorageFlow({ balance: { pvW: 6500, gridImportW: 0, gridExportW: 2000, additionalKnownLoadW: 1700 } }),
      check: (r) => r.source === 'calculated' && r.chargeW === 2800 && r.hasConfiguredStorageDp === false,
    },
  ];

  for (const item of cases) {
    expect(item.check(item.result), `Energiefluss-Fall fehlgeschlagen: ${item.name} -> ${JSON.stringify(item.result)}`);
  }
}

/**
 * Code-Teil: runSnapshotCase
 * Zweck: Prüft einen vollständigen Snapshot mit PV, Netz, Speicher und Gebäudelast.
 */
function runSnapshotCase() {
  const snap = energy.buildEnergyFlowSnapshot({
    ts: Date.now(),
    pvW: 6500,
    buildingLoadW: 1700,
    grid: { hasConfiguredSplitDp: true, importW: 0, exportW: 2000 },
    storage: { hasConfiguredSplitDp: false, hasConfiguredSignedDp: false, socPct: 44 },
  });
  expect(snap.storage.source === 'calculated', 'Snapshot muss ohne Speicher-DP berechneten Speicherfallback nutzen.');
  expect(snap.storage.chargeW === 2800, 'Snapshot muss den berechneten Speicher-Ladewert 2800 W liefern.');
  expect(snap.buildingLoadW === 1700, 'Direkter Gebäudeverbrauch muss Quelle der Wahrheit bleiben.');
}

/**
 * Code-Teil: runVisibilityCases
 * Zweck: Prüft, dass Anlagen ohne Wallbox/Farm weiterhin keine falschen Features zeigen.
 */
function runVisibilityCases() {
  const noFeatures = visibility.deriveCustomerFeatureVisibility({
    evcsEnabled: true,
    evcsProofs: [{ hasAnyRealDatapoint: false }],
    storageFarmEnabled: true,
    storageFarmProofs: [{ hasAnyRealDatapoint: false }],
    aiAdvisorAppEnabled: true,
    aiAdvisorCustomerEnabled: false,
  });
  expect(noFeatures.hasEvcs === false, 'EVCS darf ohne echten Ladepunkt nicht sichtbar sein.');
  expect(noFeatures.hasStorageFarm === false, 'Speicherfarm darf ohne echten Farm-DP nicht sichtbar sein.');
  expect(noFeatures.hasAiAdvisor === false, 'KI-Berater muss Kundenschalter Aus respektieren.');
}

runEnergyFlowCases();
runSnapshotCase();
runVisibilityCases();
console.log('[verify-ts-resolver-mirror-runtime] OK: Resolver-Mirror-Runtime-Fälle bestanden.');
