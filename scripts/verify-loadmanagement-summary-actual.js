#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function need(p,s,label){const t=read(p); if(!t.includes(s)){console.error(`[loadmanagement-summary-actual] missing ${label}: ${s}`); process.exit(1);}}
const cm = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
need('package.json','"version": "0.8.64"','version 0.8.64');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','applyActualW','TS-Control darf Summary-Ist nicht aus Reserve überschreiben');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','totalPowerW: totalFreshActualPowerW','TS-Control bekommt Actual statt Reserve');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','summary.totalReservedPowerW','Reservierung bleibt getrennt');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsActualW = (typeof totalFreshActualPowerW','Debug actual nutzt frischen Istwert');
const badApply = "await this._queueState('chargingManagement.summary.totalPowerW', Number.isFinite(Number(apply.totalPowerW)) ? Number(apply.totalPowerW) : 0, true);";
if (cm.includes(badApply)) { console.error('[loadmanagement-summary-actual] old apply.totalPowerW overwrite still present'); process.exit(1); }
console.log('[loadmanagement-summary-actual] OK');
