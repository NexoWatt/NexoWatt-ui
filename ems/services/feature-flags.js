/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/feature-flags.ts
 * Quell-Hash: sha256:a2c0e0aa413b81ad0db7a6090d33c7a3ce52b05deb6fa9f6b6e70c09b8510e8a
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
 * Zentrale Home/EOS-Feature-Matrix. HEMS bleibt als technischer Legacy-Name
 * für die Home-Lizenz kompatibel. Ab 0.8.15 gehört das Energie-Wertkonto zur
 * Home-Basis und zur EOS-Basis; Betreiber-, Abrechnungs-, Kiosk-, Mesh- und
 * Microgrid-Funktionen bleiben EOS-only.
 */
'use strict';

const HOME_APP_IDS = new Set([
  'charging',
  'storage',
  'thermal',
  'heatingrod',
  'threshold',
  'relay',
  'aiAdvisor',
  'tariff',
  'para14a',
  'energyWallet',
]);

const APP_FEATURE_MAP = Object.freeze({
  charging: 'chargingManagement',
  peak: 'peakShaving',
  storage: 'storageControl',
  storagefarm: 'storageFarm',
  thermal: 'thermalControl',
  heatingrod: 'heatingRodControl',
  bhkw: 'bhkwControl',
  generator: 'generatorControl',
  threshold: 'thresholdControl',
  relay: 'relayControl',
  grid: 'gridConstraints',
  aiAdvisor: 'aiAdvisor',
  tariff: 'dynamicTariffs',
  para14a: 'para14a',
  multiuse: 'multiUse',
  countryProfile: 'countryProfile',
  energyWallet: 'energyWallet',
  energyLedger: 'energyLedger',
  chargeKiosk: 'chargeKiosk',
  mesh: 'mesh',
  microgrid: 'microgrid',
  nlSaldering: 'nlSaldering',
  nlEnergyHub: 'nlEnergyHub',
  aiAutopilot: 'aiAutopilot',
});

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
  'energyWallet',
  'energyWalletBasic',
  'energyWalletPro',
  'energyWalletDetails',
  'energyWalletRecommendations',
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
  'energyWalletOperator',
  'energyLedger',
  'billingExport',
  'chargeKiosk',
  'solarChargeMode',
  'solarChargeBilling',
  'mesh',
  'microgrid',
  'neighborSharing',
  'multiSiteWallet',
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

function editionLabel(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return 'EOS';
  if (ed === 'hems') return 'Home';
  return 'Keine Lizenz';
}

function allKnownFeatures() {
  return new Set([...HOME_FEATURES, ...EOS_ONLY_FEATURES]);
}

function buildFeatureMap(edition) {
  const ed = normalizeEdition(edition);
  const out = {};
  for (const feature of allKnownFeatures()) {
    out[feature] = ed === 'eos' ? true : (ed === 'hems' ? HOME_FEATURES.has(feature) : false);
  }
  return out;
}

function appFeature(appId) {
  const id = String(appId || '').trim();
  return APP_FEATURE_MAP[id] || id;
}

function appIdToFeature(appId) {
  return appFeature(appId);
}

function allowsFeature(edition, feature) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return true;
  if (ed !== 'hems') return false;
  return HOME_FEATURES.has(String(feature || '').trim());
}

function allowsApp(edition, appId) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return true;
  if (ed !== 'hems') return false;
  const id = String(appId || '').trim();
  return HOME_APP_IDS.has(id) || allowsFeature(ed, appFeature(id));
}

function maxWallboxes(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'hems') return 3;
  if (ed === 'eos') return 0;
  return 0;
}

function homeIncludedApps() {
  return Array.from(HOME_APP_IDS);
}

function homeIncludedFeatures() {
  return Array.from(HOME_FEATURES);
}

function eosOnlyFeatures() {
  return Array.from(EOS_ONLY_FEATURES);
}

function eosOnlyApps() {
  return Object.keys(APP_FEATURE_MAP).filter((appId) => !HOME_APP_IDS.has(appId));
}

module.exports = {
  HOME_APP_IDS,
  APP_FEATURE_MAP,
  HOME_FEATURES,
  EOS_ONLY_FEATURES,
  normalizeEdition,
  editionLabel,
  allKnownFeatures,
  buildFeatureMap,
  appFeature,
  appIdToFeature,
  allowsFeature,
  allowsApp,
  maxWallboxes,
  homeIncludedApps,
  homeIncludedFeatures,
  eosOnlyFeatures,
  eosOnlyApps,
};
