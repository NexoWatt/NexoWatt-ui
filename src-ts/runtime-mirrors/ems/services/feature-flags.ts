// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/feature-flags.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/feature-flags.js
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
 * Original-Hash: 4eb44e485dc145c2322882787dd41e5f3542988bb96f0796c6c1b5e09fb5eecc
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/feature-flags.ts
 * Quell-Hash: sha256:228d3c6b10652201a4f827de5ab7f9e59e14d040585bf74046c8bb818bb35dbe
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
  'nlP1',
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
  meshMicrogrid: 'meshMicrogrid',
  mesh: 'mesh',
  microgrid: 'microgrid',
  nlP1: 'nlP1',
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
  'nlP1',
  'nlP1Basic',
  'p1Dsmr',
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
  'meshMicrogrid',
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

/**
 * Code-Teil: normalizeEdition
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeEdition(raw) {
  const e = String(raw || '').trim().toLowerCase();
  if (e === 'eos') return 'eos';
  if (e === 'home' || e === 'hems') return 'hems';
  return 'none';
}

/**
 * Code-Teil: editionLabel
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function editionLabel(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return 'EOS';
  if (ed === 'hems') return 'Home';
  return 'Keine Lizenz';
}

/**
 * Code-Teil: allKnownFeatures
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function allKnownFeatures() {
  return new Set([...HOME_FEATURES, ...EOS_ONLY_FEATURES]);
}

/**
 * Code-Teil: buildFeatureMap
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildFeatureMap(edition) {
  const ed = normalizeEdition(edition);
  const out = {};
  for (const feature of allKnownFeatures()) {
    out[feature] = ed === 'eos' ? true : (ed === 'hems' ? HOME_FEATURES.has(feature) : false);
  }
  return out;
}

/**
 * Code-Teil: appFeature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function appFeature(appId) {
  const id = String(appId || '').trim();
  return APP_FEATURE_MAP[id] || id;
}

/**
 * Code-Teil: appIdToFeature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function appIdToFeature(appId) {
  return appFeature(appId);
}

/**
 * Code-Teil: allowsFeature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function allowsFeature(edition, feature) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return true;
  if (ed !== 'hems') return false;
  return HOME_FEATURES.has(String(feature || '').trim());
}

/**
 * Code-Teil: allowsApp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function allowsApp(edition, appId) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return true;
  if (ed !== 'hems') return false;
  const id = String(appId || '').trim();
  return HOME_APP_IDS.has(id) || allowsFeature(ed, appFeature(id));
}

/**
 * Code-Teil: maxWallboxes
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function maxWallboxes(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'hems') return 3;
  if (ed === 'eos') return 0;
  return 0;
}

/**
 * Code-Teil: homeIncludedApps
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function homeIncludedApps() {
  return Array.from(HOME_APP_IDS);
}

/**
 * Code-Teil: homeIncludedFeatures
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function homeIncludedFeatures() {
  return Array.from(HOME_FEATURES);
}

/**
 * Code-Teil: eosOnlyFeatures
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function eosOnlyFeatures() {
  return Array.from(EOS_ONLY_FEATURES);
}

/**
 * Code-Teil: eosOnlyApps
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
