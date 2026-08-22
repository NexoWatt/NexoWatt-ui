
'use strict';
const assert=require('node:assert/strict');
const {planForecastAwareAuto,targetEpoch}=require('../ems/services/forecast-aware-auto-planner');
const {buildSlots,poaIrradiance}=require('../ems/services/open-meteo-forecast-runtime');
const now=Date.parse('2026-08-21T06:00:00+02:00');
function ctx(extra={}){return {targetChargingEnabled:true,targetTime:'16:00',targetSoc:100,vehicleSoc:50,batteryCapacityKWh:70,maxPowerW:11000,minPowerW:4200,chargingEfficiency:.92,...extra};}
let p=planForecastAwareAuto({nowMs:now,currentRequestW:11000,context:{targetChargingEnabled:false}});
assert.equal(p.noFuturePlanning,true);assert.equal(p.requestedPowerW,11000);assert.equal(p.action,'realtime');
const dl=targetEpoch(now,'16:00');
const pv=[{startMs:Date.parse('2026-08-21T10:00:00+02:00'),endMs:Date.parse('2026-08-21T15:00:00+02:00'),powerW:11000,energyWh:55000,confidence:1}];
p=planForecastAwareAuto({nowMs:now,currentRequestW:11000,context:ctx(),forecast:{source:'open-meteo',fresh:true,slots:pv}});
assert.equal(p.action,'planned-wait');assert.equal(p.requestedPowerW,0);assert.equal(p.targetEpochMs,dl);assert.ok(p.pvPlannedWh>0);
const prices=[];for(let t=now;t<dl;t+=900000)prices.push({startMs:t,endMs:t+900000,priceEurPerKWh:t<Date.parse('2026-08-21T12:00:00+02:00')?.45:.18,fresh:true});
p=planForecastAwareAuto({nowMs:now,currentRequestW:11000,context:ctx({priceForecastSlots:prices}),forecast:{source:'none',fresh:false,slots:[]}});
assert.equal(p.requestedPowerW,0);assert.equal(p.action,'planned-wait');assert.equal(p.priceForecastAvailable,true);
p=planForecastAwareAuto({nowMs:Date.parse('2026-08-21T14:30:00+02:00'),currentRequestW:11000,context:ctx(),forecast:{source:'none',fresh:false,slots:[]}});
assert.equal(p.deadlineOverride,true);assert.equal(p.requestedPowerW,11000);
p=planForecastAwareAuto({nowMs:now,currentRequestW:11000,context:ctx({operatingStrategyIntent:{className:'MUSS',pause:true,reason:'Sicherheitsreserve'}}),forecast:{source:'none',fresh:false,slots:[]}});
assert.equal(p.requestedPowerW,0);assert.equal(p.action,'strategy-must-pause');
assert.ok(Number.isFinite(poaIrradiance(now,51,7,30,0,500,400,100)));
console.log('RC71 forecast-aware planner tests passed');
