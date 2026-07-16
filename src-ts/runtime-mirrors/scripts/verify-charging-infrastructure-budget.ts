// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-charging-infrastructure-budget.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-charging-infrastructure-budget.js
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
 * Original-Hash: 3a5873657ca6c4910216f7fa1ccd2a9e5a5d5cca6988771cfd95bbce2ebebb65
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
 * Regression 0.8.105:
 * - Die EVCS-Infrastrukturgrenze summiert alle aktivierten, steuerbaren Ladepunkte.
 * - Gemeinsame Stationslimits reduzieren nur die betroffene Stationssumme.
 * - Ein alter 11-kW-Einzelwert begrenzt den Engine-Modus nicht mehr global.
 * - Reicht das bereits NVP-/Phasen-/§14a-sichere Budget für alle technischen
 *   Mindestleistungen, bleiben alle Auto-/Boost-/Min+PV-Ladepunkte aktiv.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {
  EmsEngine,
  computeChargingInfrastructureCapacity,
} = require(path.join(root, 'ems/engine'));
const {
  computeChargingMinimumServicePlan,
} = require(path.join(root, 'ems/modules/charging-management'));

/**
 * Code-Teil: connector
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function connector(index, options = {}) {
  return {
    index,
    name: options.name || `LP${index}`,
    enabled: options.enabled !== false,
    phases: options.phases === 1 ? 1 : 3,
    voltageV: options.voltageV || 230,
    minCurrentA: options.minCurrentA === undefined ? 6 : options.minCurrentA,
    maxCurrentA: options.maxCurrentA === undefined ? 16 : options.maxCurrentA,
    maxPowerW: options.maxPowerW || 0,
    stationKey: options.stationKey || '',
    controlPreference: options.controlPreference || 'currentA',
    setCurrentAId: options.setCurrentAId === false ? '' : `test.lp${index}.setA`,
    setPowerWId: options.setPowerWId || '',
  };
}

/**
 * Code-Teil: buildEngineConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildEngineConfig({ wallboxes, stationGroups = [], chargingManagement = {}, ratedKw = 11 }) {
  const adapter = {
    config: {
      settingsConfig: { evcsMaxPowerKw: ratedKw, stationGroups },
      chargingManagement,
      datapoints: {},
    },
    evcsList: wallboxes,
  };
  return EmsEngine.prototype._buildChargingConfig.call({
    adapter,
    _gridPowerId: 'nexowatt-ui.0.ems.gridPowerW',
  }).chargingCfg;
}

// Vier unabhängige 11-kW-Ladepunkte ergeben eine Gesamtinfrastruktur von rund 44 kW.
{
  const wallboxes = [1, 2, 3, 4].map((index) => connector(index));
  const cfg = buildEngineConfig({
    wallboxes,
    // Legacy-Rest aus alten Installationen: darf im Engine-Modus nicht mehr
    // die gesamte Ladeinfrastruktur auf einen Port begrenzen.
    chargingManagement: { totalBudgetMode: 'engine', staticMaxChargingPowerW: 11000 },
  });
  assert.strictEqual(cfg.infrastructureWallboxCount, 4);
  assert.strictEqual(cfg.infrastructureRawCapacityW, 44160);
  assert.strictEqual(cfg.infrastructureCapacityW, 44160);
  assert.strictEqual(cfg.staticMaxChargingPowerW, 44160);
}

// Ohne explizite Portgrenze wird die AppCenter-Nennleistung je Ladepunkt verwendet.
{
  const wallboxes = [1, 2, 3, 4].map((index) => connector(index, {
    maxCurrentA: 0,
    maxPowerW: 0,
  }));
  const cfg = buildEngineConfig({ wallboxes, ratedKw: 11 });
  assert.strictEqual(cfg.infrastructureRawCapacityW, 44000);
  assert.strictEqual(cfg.staticMaxChargingPowerW, 44000);
}

// Zwei 22-kW-Ports teilen sich eine 22-kW-Station; zwei weitere 11-kW-Ports
// bleiben unabhängig. Roh = 66 kW, wirksam = 44 kW.
{
  const wallboxes = [
    connector(1, { maxPowerW: 22000, stationKey: 'station_a', setPowerWId: 'test.lp1.setW', setCurrentAId: false }),
    connector(2, { maxPowerW: 22000, stationKey: 'station_a', setPowerWId: 'test.lp2.setW', setCurrentAId: false }),
    connector(3, { maxPowerW: 11000, setPowerWId: 'test.lp3.setW', setCurrentAId: false }),
    connector(4, { maxPowerW: 11000, setPowerWId: 'test.lp4.setW', setCurrentAId: false }),
  ];
  const capacity = computeChargingInfrastructureCapacity({
    wallboxes: buildEngineConfig({ wallboxes, stationGroups: [{ stationKey: 'station_a', maxPowerKw: 22 }] }).wallboxes,
    stationGroups: [{ stationKey: 'station_a', maxPowerW: 22000 }],
    fallbackPerConnectorW: 11000,
  });
  assert.deepStrictEqual(
    { raw: capacity.rawCapacityW, effective: capacity.effectiveCapacityW, count: capacity.wallboxCount },
    { raw: 66000, effective: 44000, count: 4 },
  );
}

// Ein bewusst gewählter Static-Modus darf weiterhin eine feste Gesamtgrenze setzen.
{
  const wallboxes = [1, 2, 3, 4].map((index) => connector(index));
  const cfg = buildEngineConfig({
    wallboxes,
    chargingManagement: { totalBudgetMode: 'static', staticMaxChargingPowerW: 11000 },
  });
  assert.strictEqual(cfg.staticMaxChargingPowerW, 11000);
}

/**
 * Code-Teil: normalizedWallbox
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizedWallbox(safe, mode, stationKey = '', stationMaxPowerW = 0) {
  return {
    safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    controlBasis: 'currentA',
    effectiveMode: mode,
    minPW: 4140,
    maxPW: 11040,
    stationKey,
    stationMaxPowerW,
  };
}

/**
 * Code-Teil: simulateMinimumFirst
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function simulateMinimumFirst(wallboxes, budgetW, stationCaps = new Map()) {
  const plan = computeChargingMinimumServicePlan({ wallboxes, totalBudgetW: budgetW, stationCaps });
  let remainingW = budgetW;
  const stationRemaining = new Map(stationCaps);
  const targets = [];
  for (const wallbox of wallboxes) {
    const futureW = plan.preserveAll ? (plan.futureMinimumBySafe.get(wallbox.safe) || 0) : 0;
    const futureStationW = plan.preserveAll ? (plan.futureStationMinimumBySafe.get(wallbox.safe) || 0) : 0;
    const totalAvailW = Math.max(0, remainingW - futureW);
    const stationAvailRawW = wallbox.stationKey && stationRemaining.has(wallbox.stationKey)
      ? stationRemaining.get(wallbox.stationKey)
      : Number.POSITIVE_INFINITY;
    const stationAvailW = Number.isFinite(stationAvailRawW)
      ? Math.max(0, stationAvailRawW - futureStationW)
      : Number.POSITIVE_INFINITY;
    const rawTargetW = Math.min(totalAvailW, stationAvailW, wallbox.maxPW);
    const targetW = rawTargetW + 1e-6 >= wallbox.minPW ? rawTargetW : 0;
    targets.push(targetW);
    remainingW = Math.max(0, remainingW - targetW);
    if (wallbox.stationKey && stationRemaining.has(wallbox.stationKey)) {
      stationRemaining.set(wallbox.stationKey, Math.max(0, stationRemaining.get(wallbox.stationKey) - targetW));
    }
  }
  return { plan, targets };
}

// Feldszenario: 40-kW-NVP, ca. 5,6-kW-Grundlast => rund 34,4 kW EVCS-Headroom.
// Vier verbundene Ladepunkte müssen dann alle mindestens 6 A erhalten; Boost
// darf Zusatzleistung bekommen, aber keinen späteren Min+PV-Punkt abschalten.
{
  const wallboxes = [
    normalizedWallbox('lp1', 'boost'),
    normalizedWallbox('lp2', 'minpv'),
    normalizedWallbox('lp3', 'auto'),
    normalizedWallbox('lp4', 'minpv'),
  ];
  const { plan, targets } = simulateMinimumFirst(wallboxes, 34400);
  assert.strictEqual(plan.preserveAll, true);
  assert.strictEqual(plan.totalMinimumW, 16560);
  assert.strictEqual(targets.reduce((sum, value) => sum + value, 0), 34400);
  for (const targetW of targets) {
    assert(targetW >= 4140, `Ladepunkt wurde trotz ausreichendem NVP-Budget abgeschaltet: ${targets.join(', ')}`);
  }
}

// Stationslimits bleiben gleichzeitig verbindlich. Reicht die Station für beide
// Minima, müssen beide Ports aktiv bleiben; Zusatzleistung bleibt unter dem Cap.
{
  const wallboxes = [
    normalizedWallbox('station_lp1', 'boost', 'station_a', 9000),
    normalizedWallbox('station_lp2', 'minpv', 'station_a', 9000),
    normalizedWallbox('free_lp3', 'auto'),
  ];
  const stationCaps = new Map([['station_a', 9000]]);
  const { plan, targets } = simulateMinimumFirst(wallboxes, 20000, stationCaps);
  assert.strictEqual(plan.preserveAll, true);
  assert(targets.every((targetW) => targetW >= 4140), `Nicht alle technisch versorgbaren Ladepunkte laufen: ${targets.join(', ')}`);
  assert(targets[0] + targets[1] <= 9000, 'Stationslimit wurde überschritten.');
  assert(targets.reduce((sum, value) => sum + value, 0) <= 20000, 'Gesamtbudget wurde überschritten.');
}

// Ist das sichere Budget kleiner als die Summe aller Minima, darf keine
// Scheinsicherheit entstehen. Dann bleibt die bestehende Prioritätsabschaltung aktiv.
{
  const wallboxes = [
    normalizedWallbox('lp1', 'boost'),
    normalizedWallbox('lp2', 'minpv'),
    normalizedWallbox('lp3', 'auto'),
    normalizedWallbox('lp4', 'minpv'),
  ];
  const plan = computeChargingMinimumServicePlan({ wallboxes, totalBudgetW: 15000 });
  assert.strictEqual(plan.preserveAll, false);
}

// Quellvertrag: Die produktive Runtime muss die faire Restleistung tatsächlich
// vor Min+PV/Auto/Boost anwenden und die Infrastrukturdiagnose veröffentlichen.
{
  const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
  assert(chargingSource.includes('const fairTotalAvailW = Number.isFinite(totalAvailW)'));
  assert(chargingSource.includes('totalAvailableW: fairTotalAvailW'));
  assert(chargingSource.includes('minimumServicePreserved'));
  assert(engineSource.includes('computeChargingInfrastructureCapacity'));
  assert(engineSource.includes('staticMaxChargingPowerW: infrastructureCapacityW'));
}

console.log('[charging-infrastructure-budget] OK: Portsumme, Stationscaps, NVP-Headroom und Mindestversorgung arbeiten gemeinsam.');
