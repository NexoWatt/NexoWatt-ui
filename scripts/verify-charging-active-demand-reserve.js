#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p, 'utf8'); }
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[charging-active-demand-reserve] missing ${label}: ${needle}`); process.exit(1); } }
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[charging-active-demand-reserve] forbidden ${label}: ${needle}`); process.exit(1); } }
const cm = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
must('package.json', '"version": "0.8.65"', 'version 0.8.65');
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
must(cm, 'pvAvailableState ? evcsControlPvReserveW : 0', 'PV reserve capped to active demand PV share');
must(cm, "chargingManagement.summary.totalReservedPowerW', evcsControlReserveW", 'summary reserve is active demand reserve');
mustNot(cm, 'const evcsReserveW = Math.max(0, Math.round(Number.isFinite(budgetW) ? usedW : totalTargetPowerW));', 'old ghost reserve formula removed');
console.log('[charging-active-demand-reserve] OK');
