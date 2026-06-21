/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/feature-flags.ts
 * Quell-Hash: sha256:483742f1bac1b857045ab04c17cd993043180d67f00b47568ce040ce2b1032c4
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/feature-flags.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/services/feature-flags.js
 *
 * Zweck:
 * Zentrale Vorbereitung für die saubere Trennung von Home/HEMS und EOS. Die
 * bestehende Lizenzlogik bleibt kompatibel, EOS erhält zusätzlich die neuen
 * Zukunfts-Features als vorbereitete Feature-Flags.
 */
'use strict';

const HOME_FEATURES = new Set([
  'dashboard',
  'history',
  'aiAdvisor',
  'smartHome',
  'dynamicTariffs',
  'tariff',
  'chargingManagement',
  'storageControl',
  'thermalControl',
  'heatingRodControl',
  'relayControl',
  'para14a',
  'thresholdControl',
  'energyFlow',
  'pvForecast',
  'countryProfile',
  'systemLanguage',
  'energyWalletBasic',
]);

const EOS_ONLY_FEATURES = new Set([
  'peakShaving',
  'storageFarm',
  'multiUse',
  'gridLimits',
  'gridConstraints',
  'generatorControl',
  'bhkwControl',
  'advancedChargingPark',
  'advancedDiagnostics',
  'energyWalletPro',
  'energyLedger',
  'chargeKiosk',
  'solarChargeMode',
  'mesh',
  'microgrid',
  'neighborSharing',
  'nlSaldering',
  'nlEnergyHub',
  'aiAutopilot',
]);

function normalizeEdition(raw) {
  const e = String(raw || '').trim().toLowerCase();
  if (e === 'eos') return 'eos';
  if (e === 'home' || e === 'hems') return 'hems';
  return 'none';
}

function buildFeatureMap(edition) {
  const ed = normalizeEdition(edition);
  const all = new Set([...HOME_FEATURES, ...EOS_ONLY_FEATURES]);
  const out = {};
  for (const feature of all) {
    out[feature] = ed === 'eos' ? true : (ed === 'hems' ? HOME_FEATURES.has(feature) : false);
  }
  return out;
}

function allowsFeature(edition, feature) {
  const map = buildFeatureMap(edition);
  return !!map[String(feature || '')];
}

module.exports = {
  HOME_FEATURES,
  EOS_ONLY_FEATURES,
  normalizeEdition,
  buildFeatureMap,
  allowsFeature,
};
