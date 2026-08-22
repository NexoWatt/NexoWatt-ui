/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/open-meteo-forecast-runtime.ts
 * Quell-Hash: sha256:4de3abf17714913c67d5ace6cb6ca8f6954fd1f48af0b5791b7051849d5f9bf6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/open-meteo-forecast-runtime.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */

'use strict';

const https = require('node:https');
const SLOT_MS = 15 * 60 * 1000;
let snapshot={source:'none',fresh:false,updatedAt:0,slots:[],weather:null,error:'not-started'};

function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function bool(v,f=false){if(v===true||v===false)return v;if(typeof v==='number')return v!==0;if(typeof v==='string'){const s=v.toLowerCase();if(['1','true','on','an','yes','enabled','active'].includes(s))return true;if(['0','false','off','aus','no','disabled','inactive'].includes(s))return false;}return f;}
function str(v,f=''){return v==null?f:String(v);}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function parseJson(v,f){if(v&&typeof v==='object')return v;try{return JSON.parse(String(v||''));}catch{return f;}}
function cfg(adapter,key,fallback){
  const c=adapter&&adapter.config||{};
  const aliases={
    forecastSourceMode:['forecastSourceMode','weatherPvForecastSource','pvForecastSource'],
    openMeteoWeatherEnabled:['openMeteoWeatherEnabled','weatherForecastEnabled','weatherEnabled'],
    openMeteoPvEnabled:['openMeteoPvEnabled','pvOpenMeteoEnabled','pvForecastOpenMeteo'],
    forecastFallbackToDatapoints:['forecastFallbackToDatapoints','pvForecastFallbackToDatapoints'],
    latitude:['openMeteoLatitude','latitude','weatherLatitude','lat'],
    longitude:['openMeteoLongitude','longitude','weatherLongitude','lon'],
    timezone:['openMeteoTimezone','weatherTimezone','timezone'],
    updateMin:['forecastUpdateIntervalMin','pvForecastUpdateMin'],
    horizonHours:['forecastHorizonHours','pvForecastHorizonHours'],
    arrays:['pvForecastArrays','openMeteoPvArrays'],
    dpCurve:['pvForecastCurveDp','pvForecastDatapoint','forecastCurveDp']
  };
  for(const k of aliases[key]||[key]) if(c[k]!==undefined&&c[k]!==null&&c[k]!=='') return c[k];
  return fallback;
}
function httpJson(url){
  if(typeof fetch==='function') return fetch(url,{headers:{'user-agent':'NexoWatt-EOS-PV-Forecast/1.0'}}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();});
  return new Promise((resolve,reject)=>{https.get(url,{headers:{'user-agent':'NexoWatt-EOS-PV-Forecast/1.0'}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(new Error(`HTTP ${res.statusCode}`));try{resolve(JSON.parse(b));}catch(e){reject(e);}});}).on('error',reject);});
}
function solarPosition(ts,lat,lon){
  const d=new Date(ts); const rad=Math.PI/180;
  const jd=d.getTime()/86400000+2440587.5; const n=jd-2451545.0;
  const L=(280.46+0.9856474*n)%360; const g=(357.528+0.9856003*n)%360;
  const lambda=(L+1.915*Math.sin(g*rad)+0.020*Math.sin(2*g*rad))*rad;
  const eps=(23.439-0.0000004*n)*rad;
  const ra=Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda));
  const dec=Math.asin(Math.sin(eps)*Math.sin(lambda));
  const gmst=(280.46061837+360.98564736629*(jd-2451545.0))*rad;
  let ha=gmst+lon*rad-ra; while(ha>Math.PI)ha-=2*Math.PI; while(ha<-Math.PI)ha+=2*Math.PI;
  const phi=lat*rad;
  const sinAlt=Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha);
  const alt=Math.asin(clamp(sinAlt,-1,1));
  const az=Math.atan2(-Math.sin(ha),Math.tan(dec)*Math.cos(phi)-Math.sin(phi)*Math.cos(ha));
  return {altitude:alt,zenith:Math.PI/2-alt,azimuth:(az+2*Math.PI)%(2*Math.PI)};
}
function poaIrradiance(ts,lat,lon,tiltDeg,azimuthDeg,ghi,dni,dhi){
  const rad=Math.PI/180; const sun=solarPosition(ts,lat,lon); if(sun.altitude<=0)return 0;
  const tilt=tiltDeg*rad, panelAz=((azimuthDeg+180)%360)*rad; // UI convention: 0=south, -90=east, 90=west
  const cosInc=Math.cos(sun.zenith)*Math.cos(tilt)+Math.sin(sun.zenith)*Math.sin(tilt)*Math.cos(sun.azimuth-panelAz);
  const direct=Math.max(0,dni)*Math.max(0,cosInc);
  const diffuse=Math.max(0,dhi)*(1+Math.cos(tilt))/2;
  const ground=Math.max(0,ghi)*0.2*(1-Math.cos(tilt))/2;
  return Math.max(0,direct+diffuse+ground);
}
function defaultArrays(adapter){
  const raw=parseJson(cfg(adapter,'arrays',[]),[]); if(Array.isArray(raw)&&raw.length)return raw;
  const c=adapter&&adapter.config||{};
  const kwp=num(c.pvInstalledKwp??c.pvKwp??c.installedPvKwp,0);
  return kwp>0?[{name:'PV',kwp,tiltDeg:num(c.pvTiltDeg,30),azimuthDeg:num(c.pvAzimuthDeg,0),lossPercent:num(c.pvLossPercent,14),inverterLimitW:num(c.pvInverterLimitW,0)}]:[];
}
function hourlyValue(data,key,i){const a=data&&data.hourly&&data.hourly[key];return Array.isArray(a)?num(a[i],0):0;}
function interpolate(a,b,f){return a+(b-a)*f;}
function buildSlots(data,adapter,lat,lon){
  const times=(data&&data.hourly&&data.hourly.time)||[]; const arrays=defaultArrays(adapter); if(!times.length||!arrays.length)return [];
  const now=Date.now(); const horizon=Math.max(6,num(cfg(adapter,'horizonHours',48),48))*3600000; const out=[];
  for(let i=0;i<times.length-1;i++){
    const t0=Date.parse(times[i]), t1=Date.parse(times[i+1]); if(!Number.isFinite(t0)||t1<now-3600000||t0>now+horizon)continue;
    for(let q=0;q<4;q++){
      const ts=t0+q*SLOT_MS; const f=q/4;
      const ghi=interpolate(hourlyValue(data,'shortwave_radiation',i),hourlyValue(data,'shortwave_radiation',i+1),f);
      const dni=interpolate(hourlyValue(data,'direct_normal_irradiance',i),hourlyValue(data,'direct_normal_irradiance',i+1),f);
      const dhi=interpolate(hourlyValue(data,'diffuse_radiation',i),hourlyValue(data,'diffuse_radiation',i+1),f);
      const temp=interpolate(hourlyValue(data,'temperature_2m',i),hourlyValue(data,'temperature_2m',i+1),f);
      let powerW=0;
      for(const a of arrays){
        const poa=poaIrradiance(ts,lat,lon,num(a.tiltDeg??a.tilt,30),num(a.azimuthDeg??a.azimuth,0),ghi,dni,dhi);
        const loss=clamp(1-num(a.lossPercent??a.lossesPercent,14)/100,0.4,1);
        const cellTemp=temp+0.03*poa; const tempFactor=clamp(1+num(a.temperatureCoefficient,-0.004)*(cellTemp-25),0.7,1.1);
        let p=Math.max(0,num(a.kwp,0)*1000*(poa/1000)*loss*tempFactor);
        const inv=num(a.inverterLimitW,0); if(inv>0)p=Math.min(p,inv); powerW+=p;
      }
      out.push({startMs:ts,endMs:ts+SLOT_MS,powerW:Math.round(powerW),energyWh:Math.round(powerW*0.25),confidence:1});
    }
  }
  return out.filter(s=>s.endMs>now-60000);
}
async function readDatapointFallback(adapter){
  const ids=[]; const configured=str(cfg(adapter,'dpCurve','')).trim(); if(configured)ids.push(configured);
  const ns=adapter&&adapter.namespace||'nexowatt-ui.0';
  ids.push(`${ns}.pvForecast.curve`,`${ns}.forecast.pv.curve`,`${ns}.pvForecast.slots`,`${ns}.pvForecast.forecastJson`);
  for(const id of ids){
    try{const state=id.startsWith(ns+'.')?await adapter.getStateAsync(id.slice(ns.length+1)):await adapter.getForeignStateAsync(id);const value=state&&state.val;const parsed=parseJson(value,null);if(Array.isArray(parsed)&&parsed.length)return {source:'datapoint',fresh:true,updatedAt:Date.now(),slots:parsed,weather:null,error:''};}catch{}
  }
  return null;
}
async function ensureState(adapter,id,common){
  try{await adapter.setObjectNotExistsAsync(id,{type:'state',common:{read:true,write:false,...common},native:{}});}catch{}
}
async function publish(adapter,s){
  const defs={source:['string','text'],fresh:['boolean','indicator'],updatedAt:['number','value.time'],error:['string','text'],slots:['string','json'],powerNowW:['number','value.power'],energy6hWh:['number','value.energy'],energy12hWh:['number','value.energy'],energy24hWh:['number','value.energy']};
  for(const [k,[type,role]] of Object.entries(defs)) await ensureState(adapter,`forecast.effective.${k}`,{name:k,type,role,unit:k.endsWith('W')?'W':k.endsWith('Wh')?'Wh':undefined});
  const now=Date.now(); const sum=h=>s.slots.filter(x=>x.startMs>=now&&x.startMs<now+h*3600000).reduce((a,x)=>a+num(x.energyWh,0),0);
  const current=s.slots.find(x=>x.startMs<=now&&x.endMs>now);
  const vals={source:s.source,fresh:!!s.fresh,updatedAt:s.updatedAt||0,error:s.error||'',slots:JSON.stringify(s.slots||[]),powerNowW:Math.round(num(current&&current.powerW,0)),energy6hWh:Math.round(sum(6)),energy12hWh:Math.round(sum(12)),energy24hWh:Math.round(sum(24))};
  for(const [k,v] of Object.entries(vals)) try{await adapter.setStateAsync(`forecast.effective.${k}`,{val:v,ack:true});}catch{}
}
async function refresh(adapter){
  const mode=str(cfg(adapter,'forecastSourceMode','auto')).toLowerCase(); const pvEnabled=bool(cfg(adapter,'openMeteoPvEnabled',false),false); const weatherEnabled=bool(cfg(adapter,'openMeteoWeatherEnabled',true),true); const fallback=bool(cfg(adapter,'forecastFallbackToDatapoints',true),true);
  if(mode==='datapoint'||mode==='mapped'||(!pvEnabled&&mode!=='open-meteo')){const dp=await readDatapointFallback(adapter);snapshot=dp||{source:'none',fresh:false,updatedAt:Date.now(),slots:[],weather:null,error:'datapoint-forecast-unavailable'};await publish(adapter,snapshot);return snapshot;}
  const lat=num(cfg(adapter,'latitude',0),0), lon=num(cfg(adapter,'longitude',0),0); const arrays=defaultArrays(adapter);
  if(!lat&&!lon){const dp=fallback?await readDatapointFallback(adapter):null;snapshot=dp||{source:'none',fresh:false,updatedAt:Date.now(),slots:[],weather:null,error:'location-not-configured'};await publish(adapter,snapshot);return snapshot;}
  if(!arrays.length&&pvEnabled){const dp=fallback?await readDatapointFallback(adapter):null;snapshot=dp||{source:'none',fresh:false,updatedAt:Date.now(),slots:[],weather:null,error:'pv-arrays-not-configured'};await publish(adapter,snapshot);return snapshot;}
  try{
    const tz=encodeURIComponent(str(cfg(adapter,'timezone','auto'),'auto'));
    const variables='temperature_2m,cloud_cover,shortwave_radiation,direct_normal_irradiance,diffuse_radiation';
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=${variables}&forecast_days=3&timezone=${tz}`;
    const data=await httpJson(url); const slots=pvEnabled?buildSlots(data,adapter,lat,lon):[];
    const weather=weatherEnabled&&data.hourly?{time:data.hourly.time||[],temperature_2m:data.hourly.temperature_2m||[],cloud_cover:data.hourly.cloud_cover||[]}:null;
    snapshot={source:'open-meteo',fresh:true,updatedAt:Date.now(),slots,weather,error:''};
  }catch(e){const dp=fallback?await readDatapointFallback(adapter):null;snapshot=dp||{source:'open-meteo',fresh:false,updatedAt:Date.now(),slots:[],weather:null,error:String(e&&e.message||e)};}
  await publish(adapter,snapshot); return snapshot;
}
function getForecastSnapshot(){return snapshot;}
function startForecastRuntime(adapter){
  let stopped=false,timer=null;
  const cycle=async()=>{if(stopped)return;try{await refresh(adapter);}catch(e){if(adapter&&adapter.log)adapter.log.warn(`Forecast runtime: ${e&&e.message||e}`);}if(!stopped)timer=setTimeout(cycle,Math.max(5,num(cfg(adapter,'updateMin',30),30))*60000);};
  cycle();
  return {stop(){stopped=true;if(timer)clearTimeout(timer);},refresh:()=>refresh(adapter),getSnapshot:getForecastSnapshot};
}
module.exports={SLOT_MS,solarPosition,poaIrradiance,buildSlots,refresh,startForecastRuntime,getForecastSnapshot};
