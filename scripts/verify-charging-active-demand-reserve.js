#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p, 'utf8'); }
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[charging-active-demand-reserve] missing ${label}: ${needle}`); process.exit(1); } }
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[charging-active-demand-reserve] forbidden ${label}: ${needle}`); process.exit(1); } }
const cm = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) { console.error('[charging-active-demand-reserve] invalid SemVer'); process.exit(1); }
must(cm, 'let evcsActiveDemandReserveW = 0;', 'active-demand reserve accumulator');
must(cm, 'const activeChargingDemand = !!(', 'active-demand predicate');
must(cm, "w.vehiclePlugged !== false", 'only connected/unknown-plug demand reserves');
must(cm, 'demandActualW >= activityThresholdW', 'actual power counts as demand');
must(cm, 'demandCommandW >= activityThresholdW', 'commanded setpoint counts as demand');
must(cm, 'demandTargetW >= activityThresholdW', 'target setpoint counts as demand');
must(cm, 'const evcsControlReserveW = Math.max(0, Math.round(evcsActiveDemandReserveW));', 'control reserve comes from active demand');
must(cm, "chargingManagement.control.activeDemandReserveW", 'diagnostic active demand reserve state');
must(cm, "chargingManagement.control.activeDemandWallboxes", 'diagnostic active wallbox count state');
must(cm, 'const evcsReserveW = evcsControlReserveW;', 'central EMS reserve uses active demand');
must(cm, 'requestedW: evcsReserveW', 'central request uses active demand');
must(cm, 'reserveW: evcsReserveW', 'central reserve uses active demand');
must(cm, 'function computeEvcsPvBudgetReservationW(', 'central helper combines actual PV use and active PV intent');
must(cm, 'const pvDemandW = Math.max(0, Number(actualPvW) || 0, Number(intentPvW) || 0);', 'PV reserve uses active demand and current PV intent');
must(cm, 'return Math.max(0, Math.min(totalDemandW, capW, pvDemandW));', 'PV reserve remains capped by active demand and central allocation');
must(cm, 'const evcsPvReserveW = computeEvcsPvBudgetReservationW({', 'central EMS reservation uses the stable PV demand helper');
mustNot(cm, 'pvAvailableState ? evcsControlPvReserveW : 0', 'single-tick PV hysteresis must not clear an active PV reservation');
must(cm, "chargingManagement.summary.totalReservedPowerW', evcsControlReserveW", 'summary reserve is active demand reserve');
mustNot(cm, 'const evcsReserveW = Math.max(0, Math.round(Number.isFinite(budgetW) ? usedW : totalTargetPowerW));', 'old ghost reserve formula removed');
console.log('[charging-active-demand-reserve] OK');
