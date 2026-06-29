#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[pv-physical-cap] Missing in ${file}: ${needle}`); process.exit(1); } }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[pv-physical-cap] Forbidden in ${file}: ${needle}`); process.exit(1); } }
const ts='src-ts/runtime-executables/ems/modules/core-limits.ts';
must('package.json','"version": "0.8.64"');
must(ts,'const pvBudgetFlowRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);');
must(ts,'const pvPhysicalCapW = Math.max(0, pvPowerW);');
must(ts,'const pvBudgetRawW = Math.min(pvBudgetFlowRawW, pvPhysicalCapW);');
must(ts,'ems.budget.pvBudgetPhysicalCapW');
must(ts,"source: 'min(physicalPV,nvp+controlledLoads+storageCharge-storageDischarge)'");
mustNot(ts,'const pvBudgetRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);');
const calc=(pvPowerW, gridExportW, flexUsedW, storageChargeW, storageDischargeW)=>{
  const flow=Math.max(0,gridExportW+flexUsedW+storageChargeW-storageDischargeW);
  const cap=Math.max(0,pvPowerW);
  return {flow, cap, raw:Math.min(flow,cap), clamped:Math.max(0,flow-Math.min(flow,cap))};
};
const night=calc(0,70,10970,0,2460);
if(night.raw!==0 || night.flow!==8580 || night.clamped!==8580){ console.error('[pv-physical-cap] night example failed', night); process.exit(1); }
const day=calc(20000,5000,10000,0,0);
if(day.raw!==15000 || day.clamped!==0){ console.error('[pv-physical-cap] day example failed', day); process.exit(1); }
console.log('[pv-physical-cap] OK: PV budget is capped by physical PV production.');
