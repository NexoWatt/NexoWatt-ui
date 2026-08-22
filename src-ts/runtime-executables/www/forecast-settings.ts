
'use strict';
(function(){
  const IDS=['forecastSourceMode','openMeteoWeatherEnabled','openMeteoPvEnabled','forecastFallbackToDatapoints','openMeteoLatitude','openMeteoLongitude','openMeteoTimezone','forecastUpdateIntervalMin','forecastHorizonHours','pvForecastArrays'];
  const state={config:{},lastEndpoint:'',mounted:false};
  function byId(id){return document.getElementById('nw-'+id);}
  function val(id){const el=byId(id);if(!el)return undefined;if(el.type==='checkbox')return !!el.checked;if(el.type==='number')return Number(el.value);return el.value;}
  function collect(){const o={};for(const id of IDS)o[id]=val(id);return o;}
  function apply(cfg){state.config=cfg||{};for(const id of IDS){const el=byId(id);if(!el)continue;let v=cfg&&cfg[id];if(v===undefined)continue;if(id==='pvForecastArrays'&&typeof v!=='string')v=JSON.stringify(v,null,2);if(el.type==='checkbox')el.checked=!!v;else el.value=v;}}
  function likelySettings(){const text=(document.body&&document.body.innerText||'').toLowerCase();return /settings|einstellungen/.test(location.pathname+location.search)||text.includes('dynamische zeittarife')||text.includes('admin-zugang & wetter');}
  function mount(){if(state.mounted||!likelySettings())return;state.mounted=true;const host=[...document.querySelectorAll('section,div')].find(x=>/admin-zugang & wetter|wetter heute|dynamische zeittarife/i.test(x.textContent||''))||document.querySelector('main')||document.body;
    const card=document.createElement('section');card.id='nw-forecast-settings';card.style.cssText='margin:18px 0;padding:18px;border:1px solid rgba(40,190,155,.35);border-radius:16px;background:rgba(4,22,31,.78);color:#e8f4f6';
    card.innerHTML=`<h2 style="margin:0 0 6px">Wetter & PV-Prognose</h2><p style="opacity:.75;margin:0 0 16px">Open-Meteo kann als Wetter- und Einstrahlungsquelle genutzt werden. Ist es deaktiviert oder nicht verfügbar, bleibt die bestehende AppCenter-Datenpunktzuordnung als Fallback aktiv.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <label>Quelle<select id="nw-forecastSourceMode"><option value="auto">Automatisch: Open-Meteo, dann Datenpunkte</option><option value="open-meteo">Nur Open-Meteo</option><option value="datapoint">Nur AppCenter-Datenpunkte</option><option value="disabled">Deaktiviert</option></select></label>
      <label><input id="nw-openMeteoWeatherEnabled" type="checkbox"> Wetterprognose aktivieren</label>
      <label><input id="nw-openMeteoPvEnabled" type="checkbox"> PV-Prognose aus Open-Meteo aktivieren</label>
      <label><input id="nw-forecastFallbackToDatapoints" type="checkbox"> Bei Ausfall AppCenter-Datenpunkte verwenden</label>
      <label>Breitengrad<input id="nw-openMeteoLatitude" type="number" step="0.000001"></label>
      <label>Längengrad<input id="nw-openMeteoLongitude" type="number" step="0.000001"></label>
      <label>Zeitzone<input id="nw-openMeteoTimezone" type="text" placeholder="auto"></label>
      <label>Aktualisierung (Min.)<input id="nw-forecastUpdateIntervalMin" type="number" min="5" max="180"></label>
      <label>Prognosehorizont (Std.)<input id="nw-forecastHorizonHours" type="number" min="6" max="72"></label>
    </div><label style="display:block;margin-top:12px">PV-Flächen als JSON<textarea id="nw-pvForecastArrays" rows="7" style="width:100%;font-family:monospace" placeholder='[{"name":"Süd","kwp":30,"tiltDeg":25,"azimuthDeg":0,"lossPercent":14,"inverterLimitW":30000}]'></textarea></label>
    <div style="margin-top:10px;font-size:.9rem;opacity:.75">Azimut: 0° = Süd, −90° = Ost, +90° = West. Mehrere Dachflächen können als mehrere Einträge hinterlegt werden.</div>`;
    host.appendChild(card);apply(state.config);
  }
  const nativeFetch=window.fetch&&window.fetch.bind(window);
  if(nativeFetch){window.fetch=async function(input,init){let nextInit=init;try{const url=String(typeof input==='string'?input:input&&input.url||'');const method=String(init&&init.method||'GET').toUpperCase();if(/settings|config|native/i.test(url)){state.lastEndpoint=url;if(method==='POST'||method==='PUT'||method==='PATCH'){let body=init&&init.body;if(typeof body==='string'&&/^\s*\{/.test(body)){const obj=JSON.parse(body);Object.assign(obj,collect());nextInit={...init,body:JSON.stringify(obj)};}}}}catch{}const res=await nativeFetch(input,nextInit);try{const url=String(typeof input==='string'?input:input&&input.url||'');if(res.ok&&/settings|config|native/i.test(url)){const clone=res.clone();const data=await clone.json();const cfg=data&&((data.native)||data.config||data.settings||data);if(cfg&&typeof cfg==='object'){state.config={...state.config,...cfg};apply(state.config);}}}catch{}return res;};}
  const observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{subtree:true,childList:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  window.nwForecastSettings={collect,apply};
})();
