/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/charging-budget-helpers.ts
 * Quell-Hash: sha256:62bc8802e6d8ebaa86aade83dd5a12e02b9eebb679cd9028b4452214c28d7807
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/charging-budget-helpers.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Datei: ems/charging-budget-helpers.js
 * Rolle: Typisierte, seiteneffektfreie EVCS-Budget-Helfer.
 *
 * Zweck:
 * - Ermittelt die installierte Leistung einzelner Ladepunkte und der gesamten
 *   Ladeinfrastruktur einschließlich gemeinsam genutzter Stationslimits.
 * - Reserviert im bereits durch NVP, Phasen, §14a und weitere Gates begrenzten
 *   EVCS-Budget die technische Mindestleistung aller versorgbaren Auto-, Boost-
 *   und Min+PV-Ladepunkte.
 *
 * Sicherheitsregel:
 * Diese Funktionen erzeugen keine Gerätesollwerte und schreiben keine States.
 * Sie liefern ausschließlich deterministische Grenz- und Reservierungswerte an
 * die produktive Lademanagement-Runtime.
 */

'use strict';

/**
 * Ermittelt die installierte Maximalleistung eines aktivierten und steuerbaren
 * Ladepunkts. Explizite Leistung, Strom-/Phasenangaben und der AppCenter-
 * Fallback werden in dieser Reihenfolge ausgewertet.
 *
 * @param {any} wallbox Ladepunktkonfiguration.
 * @param {number} [fallbackPerConnectorW=11000] Nennleistung je Ladepunkt.
 * @returns {number} Installierte Ladepunktleistung in Watt.
 */
function deriveChargingConnectorCapacityW() {
  const wallbox = arguments[0];
  const fallbackPerConnectorW = arguments.length > 1 ? Number(arguments[1]) : 11000;
  const wb = wallbox && typeof wallbox === 'object' ? wallbox : {};
  if (wb.enabled === false) return 0;
  const controlBasis = String(wb.controlBasis || 'auto').trim().toLowerCase();
  const controllable = controlBasis !== 'none' && !!(wb.setCurrentAId || wb.setPowerWId);
  if (!controllable) return 0;

  const explicitPowerW = Number(wb.maxPowerW);
  if (Number.isFinite(explicitPowerW) && explicitPowerW > 0) {
    return Math.max(0, Math.round(explicitPowerW));
  }

  const maxCurrentA = Number(wb.maxA);
  const phases = Number(wb.phases) === 1 ? 1 : 3;
  const voltageV = Number.isFinite(Number(wb.voltageV)) && Number(wb.voltageV) > 0
    ? Number(wb.voltageV)
    : 230;
  if (Number.isFinite(maxCurrentA) && maxCurrentA > 0) {
    return Math.max(0, Math.round(maxCurrentA * phases * voltageV));
  }

  const fallbackW = Number(fallbackPerConnectorW);
  return Number.isFinite(fallbackW) && fallbackW > 0 ? Math.round(fallbackW) : 0;
}

/**
 * Summiert alle aktivierten, steuerbaren Ladepunkte. Ports derselben Station
 * werden in der effektiven Summe auf das gemeinsame Stationslimit begrenzt.
 *
 * @param {{wallboxes?: any[], stationGroups?: any[], fallbackPerConnectorW?: number}} [options]
 * @returns {{rawCapacityW:number, effectiveCapacityW:number, wallboxCount:number, stationCount:number}}
 */
function computeChargingInfrastructureCapacity() {
  const input = arguments[0];
  const options = input && typeof input === 'object' ? input : {};
  const wallboxes = Array.isArray(options.wallboxes) ? options.wallboxes : [];
  const stationGroups = Array.isArray(options.stationGroups) ? options.stationGroups : [];
  const fallbackPerConnectorW = Number.isFinite(Number(options.fallbackPerConnectorW))
    ? Number(options.fallbackPerConnectorW)
    : 11000;
  /** @type {Map<string, number>} */
  const stationCaps = new Map();
  for (const group of stationGroups) {
    const key = String(group && group.stationKey || '').trim();
    const capW = Number(group && (group.maxPowerW !== undefined ? group.maxPowerW : Number(group.maxPowerKw) * 1000));
    if (!key || !Number.isFinite(capW) || capW <= 0) continue;
    const previous = stationCaps.get(key);
    stationCaps.set(key, Number.isFinite(previous) ? Math.min(/** @type {number} */ (previous), capW) : capW);
  }

  let rawCapacityW = 0;
  let standaloneCapacityW = 0;
  let wallboxCount = 0;
  /** @type {Map<string, number>} */
  const stationPortCapacityW = new Map();

  for (const wallbox of wallboxes) {
    const capacityW = Function.prototype.apply.call(deriveChargingConnectorCapacityW, null, [wallbox, fallbackPerConnectorW]);
    if (!(capacityW > 0)) continue;
    wallboxCount += 1;
    rawCapacityW += capacityW;
    const stationKey = String(wallbox && wallbox.stationKey || '').trim();
    if (!stationKey) {
      standaloneCapacityW += capacityW;
      continue;
    }
    stationPortCapacityW.set(stationKey, (stationPortCapacityW.get(stationKey) || 0) + capacityW);
  }

  let effectiveCapacityW = standaloneCapacityW;
  for (const [stationKey, portCapacityW] of stationPortCapacityW.entries()) {
    const stationCapW = stationCaps.get(stationKey);
    effectiveCapacityW += Number.isFinite(stationCapW) && /** @type {number} */ (stationCapW) > 0
      ? Math.min(portCapacityW, /** @type {number} */ (stationCapW))
      : portCapacityW;
  }

  return {
    rawCapacityW: Math.max(0, Math.round(rawCapacityW)),
    effectiveCapacityW: Math.max(0, Math.round(effectiveCapacityW)),
    wallboxCount,
    stationCount: stationPortCapacityW.size,
  };
}

/**
 * Reserviert die technischen Mindestleistungen der verbundenen netzfähigen
 * Ladepunkte, wenn das bereits sicher begrenzte Gesamt- und Stationsbudget für
 * alle Minima ausreicht. Reines PV-Laden bleibt ausschließlich PV-Grant-geführt.
 *
 * @param {{wallboxes?: any[], totalBudgetW?: number, stationCaps?: Map<string, number>|Record<string, number>|null}} [options]
 * @returns {{
 *   preserveAll:boolean,
 *   eligibleCount:number,
 *   totalMinimumW:number,
 *   minimumBySafe:Map<string, number>,
 *   futureMinimumBySafe:Map<string, number>,
 *   futureStationMinimumBySafe:Map<string, number>,
 *   stationMinimumW:Map<string, number>,
 *   totalFits:boolean,
 *   stationsFit:boolean
 * }}
 */
function computeChargingMinimumServicePlan() {
  const input = arguments[0];
  const options = input && typeof input === 'object' ? input : {};
  const list = Array.isArray(options.wallboxes) ? options.wallboxes : [];
  const totalBudgetW = options.totalBudgetW === undefined
    ? Number.POSITIVE_INFINITY
    : Number(options.totalBudgetW);
  const stationCapsInput = options.stationCaps || null;
  /** @type {Map<string, number>} */
  const capByStation = new Map();

  if (stationCapsInput instanceof Map) {
    for (const [key, value] of stationCapsInput.entries()) {
      const capW = Number(value);
      if (String(key || '').trim() && Number.isFinite(capW) && capW > 0) {
        capByStation.set(String(key).trim(), capW);
      }
    }
  } else if (stationCapsInput && typeof stationCapsInput === 'object') {
    for (const [key, value] of Object.entries(stationCapsInput)) {
      const capW = Number(value);
      if (String(key || '').trim() && Number.isFinite(capW) && capW > 0) {
        capByStation.set(String(key).trim(), capW);
      }
    }
  }

  /** @type {Map<string, number>} */
  const minimumBySafe = new Map();
  /** @type {Map<string, number>} */
  const stationMinimumW = new Map();
  let totalMinimumW = 0;
  let eligibleCount = 0;

  for (const wallbox of list) {
    const w = wallbox && typeof wallbox === 'object' ? wallbox : {};
    const safe = String(w.safe || '').trim();
    const mode = String(w.effectiveMode || w.userMode || 'normal').trim().toLowerCase();
    const goalBlocked = !!w.goalEnabled && (w.goalStatus === 'waiting_soc' || w.goalStatus === 'soc_stale');
    const eligible = !!safe
      && w.enabled !== false
      && w.online !== false
      && w.vehiclePlugged !== false
      && String(w.controlBasis || 'none').trim().toLowerCase() !== 'none'
      && mode !== 'pv'
      && !goalBlocked;
    if (!eligible) {
      if (safe) minimumBySafe.set(safe, 0);
      continue;
    }

    const maxW = Number.isFinite(Number(w.maxPW ?? w.maxPowerW))
      ? Math.max(0, Number(w.maxPW ?? w.maxPowerW))
      : Number.POSITIVE_INFINITY;
    const minWRaw = Number(w.minPW ?? w.minPowerW);
    const minW = Number.isFinite(minWRaw) ? Math.max(0, Math.min(maxW, minWRaw)) : 0;
    if (!(minW > 0)) {
      minimumBySafe.set(safe, 0);
      continue;
    }

    minimumBySafe.set(safe, minW);
    totalMinimumW += minW;
    eligibleCount += 1;
    const stationKey = String(w.stationKey || '').trim();
    if (stationKey) {
      stationMinimumW.set(stationKey, (stationMinimumW.get(stationKey) || 0) + minW);
      const ownCapW = Number(w.stationMaxPowerW);
      if (!capByStation.has(stationKey) && Number.isFinite(ownCapW) && ownCapW > 0) {
        capByStation.set(stationKey, ownCapW);
      }
    }
  }

  const totalCapW = Number.isFinite(totalBudgetW) ? Math.max(0, totalBudgetW) : Number.POSITIVE_INFINITY;
  const totalFits = !Number.isFinite(totalCapW) || totalCapW + 1e-6 >= totalMinimumW;
  let stationsFit = true;
  for (const [stationKey, requiredW] of stationMinimumW.entries()) {
    const capW = capByStation.get(stationKey);
    if (Number.isFinite(capW) && /** @type {number} */ (capW) > 0 && requiredW > /** @type {number} */ (capW) + 1e-6) {
      stationsFit = false;
      break;
    }
  }
  const preserveAll = eligibleCount > 1 && totalFits && stationsFit;

  /** @type {Map<string, number>} */
  const futureMinimumBySafe = new Map();
  /** @type {Map<string, number>} */
  const futureStationMinimumBySafe = new Map();
  let runningTotalW = 0;
  /** @type {Map<string, number>} */
  const runningByStation = new Map();
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const w = list[index] || {};
    const safe = String(w.safe || '').trim();
    const stationKey = String(w.stationKey || '').trim();
    if (safe) {
      futureMinimumBySafe.set(safe, preserveAll ? runningTotalW : 0);
      futureStationMinimumBySafe.set(safe, preserveAll && stationKey ? (runningByStation.get(stationKey) || 0) : 0);
    }
    const minW = safe ? (minimumBySafe.get(safe) || 0) : 0;
    if (minW > 0) {
      runningTotalW += minW;
      if (stationKey) runningByStation.set(stationKey, (runningByStation.get(stationKey) || 0) + minW);
    }
  }

  return {
    preserveAll,
    eligibleCount,
    totalMinimumW: Math.max(0, Math.round(totalMinimumW)),
    minimumBySafe,
    futureMinimumBySafe,
    futureStationMinimumBySafe,
    stationMinimumW,
    totalFits,
    stationsFit,
  };
}

eval('module').exports = {
  deriveChargingConnectorCapacityW,
  computeChargingInfrastructureCapacity,
  computeChargingMinimumServicePlan,
};
