
'use strict';

/**
 * Forecast-aware economic gate for the existing single-writer charging path.
 * It never writes hardware and never raises a safety-limited request. It may
 * only keep the existing request or defer it while the configured target is
 * still provably reachable in better PV/price slots.
 */
const SLOT_MS = 15 * 60 * 1000;

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function bool(value, fallback = false) {
  if (value === true || value === false) return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true','1','yes','on','an','enabled','active','aktiv'].includes(v)) return true;
    if (['false','0','no','off','aus','disabled','inactive','inaktiv'].includes(v)) return false;
  }
  return fallback;
}
function str(value, fallback = '') { return value == null ? fallback : String(value); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function deepEntries(value, depth = 0, seen = new Set()) {
  if (value == null || depth > 5 || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const out = [];
  for (const [key, item] of Object.entries(value)) {
    out.push([key, item]);
    if (item && typeof item === 'object') out.push(...deepEntries(item, depth + 1, seen));
  }
  return out;
}
function pick(context, keys, fallback) {
  const wanted = new Set(keys.map(k => String(k).toLowerCase()));
  for (const [key, value] of deepEntries(context)) {
    if (wanted.has(String(key).toLowerCase()) && value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}
function targetEpoch(nowMs, hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str(hhmm).trim());
  if (!m) return 0;
  const d = new Date(nowMs);
  d.setHours(clamp(Number(m[1]),0,23), clamp(Number(m[2]),0,59), 0, 0);
  if (d.getTime() <= nowMs + 30_000) d.setDate(d.getDate() + 1);
  return d.getTime();
}
function normalizeSlots(items, type, nowMs, deadlineMs) {
  if (!Array.isArray(items)) return [];
  const out=[];
  for (const raw of items) {
    if (raw == null) continue;
    let startMs = num(raw.startMs ?? raw.ts ?? raw.timeMs ?? raw.timestampMs, NaN);
    if (!Number.isFinite(startMs)) {
      const parsed = Date.parse(raw.start ?? raw.time ?? raw.timestamp ?? raw.date ?? '');
      if (Number.isFinite(parsed)) startMs = parsed;
    }
    if (!Number.isFinite(startMs)) continue;
    let endMs = num(raw.endMs, startMs + SLOT_MS);
    if (endMs <= startMs) endMs = startMs + SLOT_MS;
    if (endMs <= nowMs || startMs >= deadlineMs) continue;
    const slot={ startMs, endMs };
    if (type === 'pv') {
      slot.powerW = Math.max(0, num(raw.surplusW ?? raw.powerW ?? raw.pvPowerW ?? raw.valueW, 0));
      slot.energyWh = Math.max(0, num(raw.surplusWh ?? raw.energyWh, slot.powerW * (endMs-startMs)/3600000));
      slot.confidence = clamp(num(raw.confidence, 1),0,1);
    } else {
      slot.price = num(raw.priceEurPerKWh ?? raw.price ?? raw.totalPrice ?? raw.value, NaN);
      slot.state = str(raw.state ?? raw.classification ?? raw.tariffState).toLowerCase();
      slot.fresh = raw.fresh === undefined ? true : bool(raw.fresh, false);
    }
    out.push(slot);
  }
  return out.sort((a,b)=>a.startMs-b.startMs);
}
function createQuarterSlots(nowMs, deadlineMs) {
  const start = Math.floor(nowMs / SLOT_MS) * SLOT_MS;
  const out=[];
  for (let t=start; t<deadlineMs; t+=SLOT_MS) out.push({startMs:t,endMs:Math.min(deadlineMs,t+SLOT_MS)});
  return out;
}
function overlapEnergyWh(slot, forecasts, maxPowerW) {
  let wh=0;
  for (const f of forecasts) {
    const overlap=Math.max(0, Math.min(slot.endMs,f.endMs)-Math.max(slot.startMs,f.startMs));
    if (!overlap) continue;
    const p=Math.min(maxPowerW, Math.max(0,num(f.powerW,0)));
    wh += p * overlap / 3600000 * clamp(num(f.confidence,1),0,1);
  }
  return wh;
}
function priceForSlot(slot, prices) {
  const matches=prices.filter(p=>p.startMs<slot.endMs && p.endMs>slot.startMs && p.fresh!==false);
  if (!matches.length) return {known:false,price:Infinity,state:'unknown'};
  const vals=matches.map(p=>num(p.price,Infinity)).filter(Number.isFinite);
  return {known:vals.length>0, price:vals.length?Math.min(...vals):Infinity, state:matches.map(p=>p.state).find(Boolean)||'unknown'};
}
function normalizePriority(value) {
  const v=str(value,'auto').trim().toLowerCase();
  if (['1','storage','speicher'].includes(v)) return 'storage';
  if (['3','ev','evcs','charger','ladestation','fahrzeug'].includes(v)) return 'evcs';
  return 'auto';
}
function normalizeTariffMode(value) {
  const v=str(value,'automatic').trim().toLowerCase();
  return ['1','manual','manuell'].includes(v) ? 'manual' : 'automatic';
}
function findArrays(context, keyNeedles) {
  const needles=keyNeedles.map(v=>v.toLowerCase());
  for (const [key,value] of deepEntries(context)) {
    const k=String(key).toLowerCase();
    if (Array.isArray(value) && needles.some(n=>k.includes(n))) return value;
  }
  return [];
}
function operatingStrategy(context) {
  const intent=pick(context,['operatingStrategyIntent','strategyIntent','activeStrategyIntent'],null);
  if (!intent || typeof intent!=='object') return {className:'none',pause:false,minW:0,maxW:Infinity,targetW:0,reason:''};
  const className=str(intent.className ?? intent.class ?? intent.priorityClass,'soll').toLowerCase();
  return {
    className,
    pause:bool(intent.pause ?? intent.block ?? intent.stop,false),
    minW:Math.max(0,num(intent.minW ?? intent.minimumPowerW,0)),
    maxW:Math.max(0,num(intent.maxW ?? intent.maximumPowerW,Infinity)),
    targetW:Math.max(0,num(intent.targetW ?? intent.requestedPowerW,0)),
    reason:str(intent.reason,'')
  };
}

function planForecastAwareAuto(args = {}) {
  const nowMs=num(args.nowMs,Date.now());
  const currentRequestW=Math.max(0,num(args.currentRequestW,0));
  const context=args.context || {};
  const snapshot=args.forecast || {};
  const targetEnabled=bool(pick(context,[
    'targetChargingEnabled','targetEnabled','zielLadenAktiv','targetChargeEnabled','timeTargetEnabled'
  ],false),false);
  const result={
    targetEnabled,
    action:'realtime',
    requestedPowerW:currentRequestW,
    reason:'Zeit-Ziel deaktiviert: ausschließlich aktuelle Bedingungen',
    targetTime:'', targetEpochMs:0, neededEnergyWh:0, latestStartMs:0,
    nextWindowStartMs:0, nextWindowEndMs:0, pvPlannedWh:0, gridPlannedWh:0,
    forecastSource:str(snapshot.source,'none'), priceForecastAvailable:false,
    pvForecastAvailable:false, deadlineOverride:false, targetAtRisk:false,
    tariffMode:normalizeTariffMode(pick(context,['tariffMode','modeTariff','tarifModus'],'automatic')),
    tariffPriority:normalizePriority(pick(context,['tariffPriority','priorityTariff','tarifPrioritaet'],'auto')),
    operatingStrategyClass:'none', operatingStrategyReason:'', noFuturePlanning:!targetEnabled
  };
  const strategy=operatingStrategy(context);
  result.operatingStrategyClass=strategy.className;
  result.operatingStrategyReason=strategy.reason;
  if (!targetEnabled) return result;

  const targetTime=str(pick(context,['targetTime','finishAt','targetFinishTime','fertigUm','departureTime'],'')).trim();
  const deadlineMs=targetEpoch(nowMs,targetTime);
  result.targetTime=targetTime;
  result.targetEpochMs=deadlineMs;
  result.noFuturePlanning=false;
  if (!deadlineMs) {
    result.action='fallback';
    result.reason='Zeit-Ziel aktiv, aber Zielzeit fehlt oder ist ungültig';
    return result;
  }
  const targetSoc=clamp(num(pick(context,['targetSoc','zielSoc','targetSoC'],100),100),0,100);
  const currentSoc=clamp(num(pick(context,['vehicleSoc','currentSoc','soc','fahrzeugSoc'],0),0),0,100);
  const capacityKWh=Math.max(1,num(pick(context,['batteryCapacityKWh','vehicleBatteryKWh','capacityKWh','akkukapazitaetKWh'],60),60));
  const efficiency=clamp(num(pick(context,['chargingEfficiency','efficiency'],0.92),0.92),0.5,1);
  const maxPowerW=Math.max(1000,num(pick(context,['maxPowerW','maximumPowerW','configuredMaxPowerW','deviceMaxPowerW'],currentRequestW||11000),currentRequestW||11000));
  const minPowerW=Math.max(0,num(pick(context,['minPowerW','minimumPowerW','technicalMinPowerW'],0),0));
  const needWh=Math.max(0,(targetSoc-currentSoc)/100*capacityKWh*1000/efficiency);
  result.neededEnergyWh=needWh;
  if (needWh<=50) {
    result.action='target-reached'; result.requestedPowerW=0; result.reason='Ziel-SoC bereits erreicht'; return result;
  }
  const maxNetWhPerMs=maxPowerW/3600000*efficiency;
  const latestStartMs=deadlineMs - needWh/maxNetWhPerMs;
  result.latestStartMs=latestStartMs;

  const pvRaw=(snapshot && Array.isArray(snapshot.slots)) ? snapshot.slots : findArrays(context,['pvforecastslots','pvslots','forecastcurve','pvcurve']);
  const priceRaw=findArrays(context,['priceforecastslots','priceslots','tariffforecast','priceforecast','forecastprices']);
  const pv=normalizeSlots(pvRaw,'pv',nowMs,deadlineMs);
  const prices=normalizeSlots(priceRaw,'price',nowMs,deadlineMs);
  result.pvForecastAvailable=pv.length>0 && snapshot.fresh!==false;
  result.priceForecastAvailable=prices.length>0;

  const manualThreshold=num(pick(context,['manualCheapPrice','cheapPriceThreshold','strompreis','manualPriceThreshold'],NaN),NaN);
  const slots=createQuarterSlots(nowMs,deadlineMs);
  const scored=slots.map((slot,index)=>{
    const durationH=(slot.endMs-slot.startMs)/3600000;
    const capacityWh=maxPowerW*durationH*efficiency;
    const pvWh=Math.min(capacityWh,overlapEnergyWh(slot,pv,maxPowerW)*efficiency);
    const price=priceForSlot(slot,prices);
    let score=1000;
    if (pvWh>10) score=-100000 - pvWh;
    else if (price.known) score=price.price*1000;
    else score=1000 + index*0.01;
    if (result.tariffMode==='manual' && Number.isFinite(manualThreshold) && price.known) {
      score += price.price<=manualThreshold ? -500 : 500;
    }
    if (result.tariffPriority==='storage') score += 120;
    if (result.tariffPriority==='evcs') score -= 120;
    return {...slot,index,capacityWh,pvWh,price,score,allocatedWh:0};
  });
  let remaining=needWh;
  // PV is always selected first, then the lowest economic score.
  for (const slot of [...scored].sort((a,b)=>a.score-b.score || a.startMs-b.startMs)) {
    if (remaining<=0) break;
    const alloc=Math.min(remaining,slot.capacityWh);
    slot.allocatedWh=alloc;
    remaining-=alloc;
    result.pvPlannedWh+=Math.min(alloc,slot.pvWh);
    result.gridPlannedWh+=Math.max(0,alloc-slot.pvWh);
  }
  const selected=scored.filter(s=>s.allocatedWh>1).sort((a,b)=>a.startMs-b.startMs);
  const current=scored.find(s=>s.startMs<=nowMs && s.endMs>nowMs) || scored[0];
  const selectedCurrent=current && current.allocatedWh>1;
  const future=selected.find(s=>s.startMs>nowMs);
  if (future) { result.nextWindowStartMs=future.startMs; result.nextWindowEndMs=future.endMs; }

  const availableCapacityWh=scored.reduce((sum,s)=>sum+s.capacityWh,0);
  result.targetAtRisk=availableCapacityWh+1<needWh;
  const deadlineReached = nowMs>=latestStartMs || result.targetAtRisk || remaining>1;
  result.deadlineOverride=deadlineReached;

  // MUSS strategy pause remains authoritative; SOLL/KANN may be overridden by the deadline.
  if (strategy.pause && ['muss','must','safety'].includes(strategy.className)) {
    result.action='strategy-must-pause'; result.requestedPowerW=0;
    result.reason=strategy.reason || 'Betriebsstrategie MUSS sperrt den Ladepunkt';
    result.targetAtRisk=true; return result;
  }

  if (deadlineReached) {
    result.action='deadline-load';
    result.requestedPowerW=currentRequestW;
    result.reason=result.targetAtRisk
      ? 'Ziel gefährdet: wirtschaftliche Wartebedingungen aufgehoben'
      : 'Spätester sicherer Start erreicht';
    return result;
  }
  if (strategy.pause && ['soll','should','kann','may'].includes(strategy.className)) {
    result.action='strategy-wait'; result.requestedPowerW=0;
    result.reason=strategy.reason || 'Betriebsstrategie stellt Laden zurück'; return result;
  }
  if (selectedCurrent) {
    result.action='planned-load';
    result.requestedPowerW=currentRequestW;
    const pvPart=Math.min(current.allocatedWh,current.pvWh);
    result.reason=pvPart>10 ? 'Geplantes PV-Ladefenster aktiv' : 'Geplantes günstiges Ladefenster aktiv';
    return result;
  }
  result.action='planned-wait';
  result.requestedPowerW=0;
  if (result.pvForecastAvailable && result.priceForecastAvailable) result.reason='Bessere PV-/Preisfenster vor der Zielzeit reichen aus';
  else if (result.pvForecastAvailable) result.reason='Prognostiziertes PV-Fenster vor der Zielzeit reicht aus';
  else if (result.priceForecastAvailable) result.reason='Günstigeres Preisfenster vor der Zielzeit reicht aus';
  else result.reason='Konservatives Warten bis zum spätesten sicheren Start';
  return result;
}

module.exports={ SLOT_MS, targetEpoch, normalizeSlots, planForecastAwareAuto };
