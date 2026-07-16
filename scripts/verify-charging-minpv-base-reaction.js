#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-charging-minpv-base-reaction.js
 * Zweck: Regressionstest fuer die Min+PV-Grundlast und die schnelle Reaktion
 * auf Kunden-Moduswechsel. Die technische Mindestleistung muss aus dem normalen
 * Gesamtbudget kommen; nur die Zusatzleistung darf vom PV-Grant abhängen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chargingRuntime = require(path.join(root, 'ems', 'modules', 'charging-management.js'));
const coreLimitsRuntime = require(path.join(root, 'ems', 'modules', 'core-limits.js'));
const chargingAllocation = require(path.join(root, 'lib', 'ts-mirrors', 'ems', 'charging-management', 'charging-allocation.js'));
const { EmsEngine } = require(path.join(root, 'ems', 'engine.js'));

function fail(message, details) {
  console.error(`[charging-minpv-base-reaction] ${message}`);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function allocationWallbox(safe, mode, targetPowerW, minPowerW = 4200) {
  return {
    safe,
    name: safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    charging: false,
    actualPowerW: 0,
    effectiveMode: mode,
    userMode: mode,
    chargerType: 'ac',
    controlBasis: 'power',
    phases: 3,
    voltageV: 230,
    minPowerW,
    maxPowerW: 11000,
    stepW: 10,
    priority: 100,
    orderIndex: 0,
    allocationRank: 1,
    targetPowerW,
    targetCurrentA: targetPowerW > 0 ? targetPowerW / (3 * 230) : 0,
    setWKey: `test.${safe}.setPowerW`,
    hasSetpoint: true,
    hasSetPower: true,
  };
}

function buildFinalAllocation(wallbox, { totalW = 11000, purePvW = 0, physicalPvW = 0 } = {}) {
  return chargingAllocation.buildChargingAllocationShadowPlan({
    mode: 'auto',
    budgetMode: 'engine:central',
    budgetW: totalW,
    remainingW: totalW,
    pvAvailableW: physicalPvW,
    pvPureAvailableW: purePvW,
    pvPhysicalAvailableW: physicalPvW,
    pvAvailable: purePvW > 0,
    preferTsNativeAllocation: false,
    tsNormalSourceLock: false,
    allowJsComparisonFallback: false,
    wallboxes: [wallbox],
    allocations: [{
      safe: wallbox.safe,
      targetW: wallbox.targetPowerW,
      targetA: wallbox.targetCurrentA,
      effectiveMode: wallbox.effectiveMode,
      userMode: wallbox.userMode,
      priority: wallbox.priority,
      allocationRank: wallbox.allocationRank,
      reason: 'runtime-central-allocation',
    }],
    totalTargetPowerW: wallbox.targetPowerW,
    totalTargetCurrentA: wallbox.targetCurrentA,
  });
}

async function main() {
  const computeMinPvAllocationW = chargingRuntime.computeMinPvAllocationW;
  const computeGoalPowerCapW = chargingRuntime.computeGoalPowerCapW;
  const computePendingPvStartIntentW = chargingRuntime.computePendingPvStartIntentW;
  assert(typeof computeMinPvAllocationW === 'function', 'Min+PV-Allocator ist nicht exportiert.');
  assert(typeof computeGoalPowerCapW === 'function', 'Min+PV-Ziellade-Floor ist nicht exportiert.');
  assert(typeof computePendingPvStartIntentW === 'function', 'Pending-Intent-Helfer fehlt.');

  const noPv = computeMinPvAllocationW({
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalAvailableW: 11000,
    stationAvailableW: 11000,
    pvAvailableW: 0,
  });
  assert(noPv.targetW === 4200, 'Min+PV startet/haelt die Mindestleistung bei 0 W PV nicht.', noPv);
  assert(noPv.pvExtraW === 0, 'Min+PV-Grundlast wird als PV-Zusatz verbucht.', noPv);

  const withPv = computeMinPvAllocationW({
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalAvailableW: 11000,
    stationAvailableW: 11000,
    pvAvailableW: 2000,
  });
  assert(withPv.targetW === 6200, 'Min+PV bildet Basis plus PV-Zusatz nicht korrekt.', withPv);
  assert(withPv.pvExtraW === 2000, 'PV-Zusatzleistung ist nicht plausibel.', withPv);

  const hardCap = computeMinPvAllocationW({
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalAvailableW: 4000,
    stationAvailableW: 11000,
    pvAvailableW: 9000,
  });
  assert(hardCap.targetW === 0 && hardCap.reason === 'below-minpv-base', 'Harte Anschlussgrenze unter Minimum wird nicht eingehalten.', hardCap);

  const minPvGoalFloor = computeGoalPowerCapW({
    mode: 'minpv',
    desiredW: 2000,
    minPvBaseW: 4200,
    maxPowerW: 11000,
  });
  assert(minPvGoalFloor === 4200, 'Zeit-/Zielladen drueckt Min+PV unter die technische Mindestleistung.', { minPvGoalFloor });
  const autoGoalCap = computeGoalPowerCapW({
    mode: 'auto',
    desiredW: 2000,
    minPvBaseW: 4200,
    maxPowerW: 11000,
  });
  assert(autoGoalCap === 2000, 'Der Min+PV-Ziellade-Floor veraendert unzulaessig Auto.', { autoGoalCap });

  const pendingMinPv = computePendingPvStartIntentW({
    mode: 'minpv',
    enabled: true,
    online: true,
    connected: true,
    controlBasis: 'powerW',
    status: 'SuspendedEVSE',
    currentPowerW: 0,
    currentPvIntentW: 0,
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalRemainingW: 11000,
    stationRemainingW: 11000,
    pvRemainingW: 0,
  });
  assert(pendingMinPv.intentW === 0, 'Min+PV reserviert bei 0 W PV fälschlich PV-Leistung.', pendingMinPv);
  assert(pendingMinPv.totalDemandW === 4200, 'Min+PV meldet seine netzgestützte Startbasis nicht als Gesamtbedarf.', pendingMinPv);

  const pendingPvOnly = computePendingPvStartIntentW({
    mode: 'pv',
    enabled: true,
    online: true,
    connected: true,
    controlBasis: 'powerW',
    status: 'SuspendedEVSE',
    currentPowerW: 0,
    minPowerW: 4200,
    technicalMinW: 4200,
    maxPowerW: 11000,
    totalRemainingW: 11000,
    stationRemainingW: 11000,
    pvRemainingW: 0,
  });
  assert(pendingPvOnly.intentW === 0 && pendingPvOnly.totalDemandW === 0, 'PV-only bildet ohne PV einen Startbedarf.', pendingPvOnly);

  // Die Kundenpriorisierung Speicher/E-Mobilitaet darf ausschliesslich reine
  // PV-Ladepunkte begrenzen. Min+PV nutzt seine Mindestleistung aus dem normalen
  // Gesamtbudget und den Zusatz aus dem gesamten physikalischen PV-Rest.
  const centralRuntime = {
    remainingTotalW: 20000,
    remainingPvW: 10000,
    gates: { pvAllocation: { mode: 'both', evcsCapW: 2000 } },
  };
  const pureGrant = coreLimitsRuntime.computeCentralBudgetGrant(centralRuntime, {
    key: 'evcs', requestedW: 10000, maxW: 10000, pvOnly: true,
  });
  const physicalGrant = coreLimitsRuntime.computeCentralBudgetGrant(centralRuntime, {
    key: 'evcs', requestedW: 10000, maxW: 10000, pvOnly: true, applyEvcsAllocationCap: false,
  });
  assert(pureGrant.grantW === 2000 && pureGrant.allocationCapApplied === true, 'Reine PV-Ladung ignoriert die Kundenprioritaet.', pureGrant);
  assert(physicalGrant.grantW === 10000 && physicalGrant.allocationCapApplied === false, 'Physikalischer Min+PV-Grant wird faelschlich vom Prioritaetsanteil begrenzt.', physicalGrant);

  const purePlan = buildFinalAllocation(allocationWallbox('pure_priority', 'pv', 8000, 1000), {
    totalW: 11000,
    purePvW: 2000,
    physicalPvW: 6000,
  });
  assert(purePlan.wallboxes[0].targetPowerW === 2000, 'Reine PV-Ladung ueberschreitet den priorisierten EVCS-Anteil.', purePlan.wallboxes[0]);

  const minPvPlan = buildFinalAllocation(allocationWallbox('minpv_priority_exempt', 'minpv', 8000, 4200), {
    totalW: 11000,
    purePvW: 2000,
    physicalPvW: 6000,
  });
  assert(minPvPlan.wallboxes[0].targetPowerW === 8000, 'Min+PV wird faelschlich durch den reinen PV-Prioritaetsanteil gekappt.', minPvPlan.wallboxes[0]);
  assert(minPvPlan.wallboxes[0].pvUsedW === 3800, 'Min+PV verbucht seine Netzgrundlast faelschlich als PV.', minPvPlan.wallboxes[0]);

  const minPvNoPvPlan = buildFinalAllocation(allocationWallbox('minpv_zero_pv', 'minpv', 4200, 4200), {
    totalW: 11000,
    purePvW: 0,
    physicalPvW: 0,
  });
  assert(minPvNoPvPlan.wallboxes[0].targetPowerW === 4200, 'Finaler TS-Guard stoppt Min+PV bei 0 W PV.', minPvNoPvPlan.wallboxes[0]);

  const autoPlan = buildFinalAllocation(allocationWallbox('auto_priority_exempt', 'auto', 8000, 1000), {
    totalW: 11000,
    purePvW: 0,
    physicalPvW: 0,
  });
  assert(autoPlan.wallboxes[0].targetPowerW === 8000, 'Auto wird unzulaessig durch die PV-Prioritaet begrenzt.', autoPlan.wallboxes[0]);

  // Der Sofort-Tick muss mehrere UI-Writes zusammenfassen und darf nicht parallel
  // zu einem bereits laufenden EMS-Tick rechnen.
  const timers = new Set();
  const adapter = {
    _nwShuttingDown: false,
    setTimeout(fn, ms) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        fn();
      }, ms);
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) {
      clearTimeout(timer);
      timers.delete(timer);
    },
    clearInterval,
    log: { warn() {}, info() {} },
  };
  const engine = new EmsEngine(adapter);
  engine.dp = {};
  engine.mm = {};
  let tickCount = 0;
  engine.tick = async () => {
    tickCount += 1;
  };

  assert(engine.requestImmediateTick('mode-a', 10) === true, 'Sofort-Tick wird nicht angenommen.');
  assert(engine.requestImmediateTick('mode-b', 10) === true, 'Entprellter zweiter Sofort-Tick wird nicht angenommen.');
  await sleep(60);
  assert(tickCount === 1, 'Mehrere schnelle Modus-Writes werden nicht zu einem Tick gebündelt.', { tickCount });

  engine._tickRunning = true;
  engine.requestImmediateTick('while-running', 0);
  await sleep(30);
  assert(tickCount === 1, 'Sofort-Tick läuft parallel zu einem aktiven Tick.', { tickCount });
  engine._tickRunning = false;
  engine._scheduleImmediateTick(0);
  await sleep(80);
  assert(tickCount === 2, 'Aufgeschobener Sofort-Tick wird nach dem aktiven Tick nicht ausgeführt.', { tickCount });
  engine.stop();
  for (const timer of timers) clearTimeout(timer);

  const chargingSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'ems', 'modules', 'charging-management.ts'), 'utf8');
  const coreLimitsSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'ems', 'modules', 'core-limits.ts'), 'utf8');
  const engineSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'ems', 'engine.ts'), 'utf8');
  const mainSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'main.ts'), 'utf8');
  const appSource = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'www', 'app.ts'), 'utf8');

  assert(chargingSource.includes('computeMinPvAllocationW'), 'Produktive Runtime verwendet den Min+PV-Basishelfer nicht.');
  assert(chargingSource.includes('minPvBaseStartNeeded'), 'Min+PV-Moduswechsel springt nicht direkt auf die Mindestleistung.');
  assert(chargingSource.includes('desired = computeGoalPowerCapW({'), 'Zeit-/Zielladen kann Min+PV noch unter die Mindestleistung druecken.');
  assert(chargingSource.includes("if (eff !== 'pv') return false;"), 'Alte Speicher/E-Mobilitaets-Prioritaet greift noch in Min+PV ein.');
  assert(!/effectiveMode === ['"]pv['"]\s*\|\|\s*w\.effectiveMode === ['"]minpv['"][\s\S]{0,180}pvStartupHoldUntilMs/.test(chargingSource), 'Min+PV beeinflusst noch die reine PV-Start-/Stop-Hysterese.');
  assert(chargingSource.includes("chargingManagement.control.pvPhysicalCapW"), 'Physikalischer PV-Cap fuer Min+PV ist nicht diagnostizierbar.');
  assert(chargingSource.includes("chargingManagement.control.pvPriorityPurePvOnly"), 'Reine-PV-Prioritaetssemantik ist nicht diagnostizierbar.');
  assert(chargingSource.includes('pvPureAvailableW: pvCapW'), 'Reiner PV-Anteil wird nicht separat an den finalen Allocator uebergeben.');
  assert(chargingSource.includes('pvPhysicalAvailableW: pvPhysicalCapW'), 'Physikalischer Min+PV-PV-Rest fehlt im finalen Allocator.');
  assert(coreLimitsSource.includes('applyEvcsAllocationCap === false'), 'Zentraler Budgetgrant kann Min+PV nicht vom reinen PV-Prioritaetscap trennen.');
  assert(engineSource.includes('requestImmediateTick(reason'), 'EMS-Engine besitzt keinen entprellten Sofort-Tick.');
  assert(mainSource.includes('_nwRequestImmediateEmsTick(`api:${id}`)'), 'API-Moduswechsel fordert keinen unmittelbaren EMS-Tick an.');
  assert(mainSource.includes('_nwRequestImmediateEmsTick(`state:${key}`)'), 'Externe ioBroker-Moduswrites fordern keinen unmittelbaren EMS-Tick an.');
  assert(appSource.includes('pendingMode = desired;') && appSource.includes('applyModeUi(desired);'), 'LIVE-Frontend zeigt den Moduswechsel nicht sofort lokal an.');

  console.log('[charging-minpv-base-reaction] OK: Min+PV-Basis, reine PV-Prioritaet, zentrale Grants und schnelle Modusreaktion sind abgesichert.');
}

main().catch((error) => fail(error && error.stack ? error.stack : String(error)));
