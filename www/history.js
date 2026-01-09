(function(){
  // simple line chart renderer on canvas
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  function resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  window.addEventListener('resize', ()=>{ resize(); draw(); });
  function fmt(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }

  let data=null;
  let chartMode='day'; // 'day' | 'week' | 'month' | 'year'

  
  let barState = null;
  
  function drawBars(){
    const {series, start, end} = data;
    const W=canvas.width, H=canvas.height, L=50, R=40, T=10, B=42;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0e1216'; ctx.fillRect(0,0,W,H);

    const buckets = bucketizeRange(start, end, chartMode);
    const keys=['pv','chg','dchg','sell','buy','evcs','load'];
    const colors={'pv':'#f1c40f','chg':'#27ae60','dchg':'#e67e22','sell':'#3498db','buy':'#e74c3c','evcs':'#ff6bd6','load':'#9b59b6'};
    const seriesAgg = {};
    keys.forEach(k=>{ seriesAgg[k] = aggregateEnergyKWh(series[k]?.values||[], buckets); });

    const totals = buckets.map((_,i)=> keys.reduce((sum,k)=> sum + (seriesAgg[k][i]?.kwh||0), 0));
    let maxKWh = Math.max(1, ...totals);
    const pad = Math.max(0.05, maxKWh*0.1);
    const y = (val)=> T + (H-B-T) * (1 - ((val)/(maxKWh+pad)));

    const n = buckets.length;
    const innerW = (W - L - R);
    const groupW = innerW / Math.max(1,n);
    const barW = Math.max(8, groupW * 0.5);

    ctx.fillStyle='#cbd3db'; ctx.font='12px system-ui, sans-serif';
    ctx.textAlign='right'; ctx.fillText('kWh', L-6, T+12);
    ctx.textAlign='center';

    for(let i=0;i<n;i++){
      const b = buckets[i];
      let lbl='';
      const d = new Date(b.start);
      if(chartMode==='week' || chartMode==='month') lbl = d.toLocaleDateString([], {day:'2-digit', month:'2-digit'});
      else if(chartMode==='year') lbl = d.toLocaleDateString([], {month:'short'});
      const xx = L + i*groupW + groupW/2;
      ctx.fillText(lbl, xx, H-6);
    }

    for(let i=0;i<n;i++){
      const xCenter = L + i*groupW + groupW/2;
      const x0 = xCenter - barW/2;
      let acc = 0;
      for (const k of keys){
        const v = seriesAgg[k][i]?.kwh || 0;
        if (v<=0) continue;
        const yTop = y(acc + v);
        const yBottom = y(acc);
        ctx.fillStyle = colors[k];
        ctx.fillRect(x0, yTop, barW-1, Math.max(1, yBottom - yTop));
        acc += v;
      }
    }

    barState = { buckets, chartMode, L, R, T, B, groupW, barW, seriesAgg };
  }
function draw(){
    if(!data){ ctx.clearRect(0,0,canvas.width,canvas.height); return; }
    if(chartMode!=='day'){ return drawBars(); }
    const {series, start, end} = data;
    const W=canvas.width, H=canvas.height, L=50, R=40, T=10, B=42;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0e1216'; ctx.fillRect(0,0,W,H);

    // build unified time axis
    const times = new Set();
    Object.values(series).forEach(s=>s.values.forEach(p=>times.add(p[0])));
    const xs = Array.from(times).sort((a,b)=>a-b);
    if(xs.length<2) return;

    // Y scales
    // compute max power (kW)
    // X scale
    const x = t => L + (t-start)/(end-start)*(W-L-R);

    // compute min/max (kW) across power series using mapped signs
    const keys=['pv','chg','dchg','sell','buy','evcs','load'];
    let minKW=0, maxKW=0;
    keys.forEach(k=>{ const vals=(series[k]?.values)||[]; vals.forEach(p=>{ const v=mapKW(k, p[1]); if(v<minKW) minKW=v; if(v>maxKW) maxKW=v; }); });
    if (minKW===0 && maxKW===0) { maxKW = 1; }
    const pad = Math.max(0.05, (maxKW-minKW)*0.08);
    minKW -= pad; maxKW += pad;
    const yPow = (kw)=> T + (H-B-T)*(1 - ((kw - minKW)/((maxKW-minKW)||1)));
    const y0 = yPow(0);
    const ySoc = (pct)=> y0 - (pct/100) * (y0 - T);

    // grid
    ctx.strokeStyle='#1d242b'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy = T + i*(H-B-T)/5; ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(W-R,yy); ctx.stroke(); }
    // zero axis for power (emphasized)
    ctx.save(); ctx.strokeStyle='#2a323b'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(L,y0); ctx.lineTo(W-R,y0); ctx.stroke(); ctx.restore();

    // value mapping for sign conventions
    function mapKW(k, w){
      // w in Watts -> return kW with desired sign
      const val = Number(w)||0;
      switch(k){
        case 'load':   return -Math.abs(val)/1000;          // Verbrauch negativ unter 0
        case 'evcs':   return -Math.abs(val)/1000;          // E‑Mobilität Verbrauch negativ
        case 'chg':    return - Math.abs(val)/1000;           // Beladung positiv
        case 'dchg':   return  Math.abs(val)/1000;          // Entladung negativ
        case 'sell':   return -Math.abs(val)/1000;          // Einspeisung negativ
        case 'buy':    return Math.abs(val)/1000;           // Bezug positiv
        default:       return (val)/1000;                   // PV etc. nativ (meist positiv)
      }
    }

    // helpers
    function line(k, color, accessor='val', dash){
      const vals = (series[k] && series[k].values) || [];
      if(!vals.length) return;
      ctx.save(); ctx.beginPath();
      if (dash) ctx.setLineDash(dash);
      ctx.lineWidth = 2; ctx.strokeStyle = color;
      if (k==='soc'){
        let idx=0; let last=null;
        xs.forEach((ts,i)=>{
          while(idx<vals.length && vals[idx][0] <= ts){ last = vals[idx][1]; idx++; }
          if(last==null) return;
          const xx = x(ts); const yy = ySoc(last);
          if (i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
        });
      } else {
        vals.forEach((p,i)=>{ const xx=x(p[0]); const yy = yPow(mapKW(k, p[1])); if (i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy); });
      }
      ctx.stroke(); ctx.restore();
    }

    line('pv',  '#f1c40f');
    line('chg', '#27ae60');
    line('dchg','#e67e22');
    line('sell','#3498db');
    line('buy', '#e74c3c');
    line('evcs','#ff6bd6');
    line('load','#9b59b6');
    line('soc', '#95a5a6', 'val', [6,6]);

    // axes labels
    ctx.fillStyle='#cbd3db'; ctx.font='12px system-ui, sans-serif';
    ctx.fillText('kW', 6, T+12);
    ctx.fillText('%', W-R+6, T+12);
    // x ticks
    ctx.textAlign='center';
    for(let i=0;i<6;i++){
      const tt = start + i*(end-start)/5;
      ctx.fillText(fmt(tt), x(tt), H-6);
    }
  }

  
  function bucketizeRange(fromMs, toMs, mode){
    const start = new Date(fromMs);
    const end = new Date(toMs);
    let buckets = [];
    function pushBucket(s, e){ buckets.push({start:+s, end:+e}); }
    if (mode==='week'){
      // last 7 Tage, tägliche Buckets
      let d0 = new Date(end); d0.setHours(0,0,0,0); d0.setDate(d0.getDate()-6);
      for (let i=0;i<7;i++){ const s = new Date(d0); s.setDate(d0.getDate()+i); const e = new Date(s); e.setDate(s.getDate()+1); pushBucket(s, e); }
    } else if (mode==='month'){
      // aktueller Monat: Tage
      let first = new Date(end.getFullYear(), end.getMonth(), 1);
      let cur = new Date(first);
      while (cur.getMonth()===first.getMonth()){ const s = new Date(cur); const e = new Date(cur); e.setDate(e.getDate()+1); pushBucket(s,e); cur.setDate(cur.getDate()+1); }
    } else if (mode==='year'){
      // aktuelles Jahr: Monate
      let y = end.getFullYear();
      for (let m=0;m<12;m++){ const s = new Date(y,m,1); const e = new Date(y,m+1,1); pushBucket(s,e); }
    }
    else { buckets=[{start:fromMs, end:toMs}]; }
    // clip to requested range
    buckets = buckets.filter(b => b.end>fromMs && b.start<toMs).map(b=>({start:Math.max(b.start, fromMs), end:Math.min(b.end,toMs)}));
    return buckets;
  }
  function aggregateEnergyKWh(vals, buckets){
    // vals: [ [ts, W], ... ], buckets: [{start,end}]
    const out = buckets.map(b=>({mid: (b.start+b.end)/2, kwh:0}));
    if(!vals || vals.length<2) return out;
    let i=0;
    for(let j=0;j<vals.length-1;j++){
      let t0=+vals[j][0], v0=+vals[j][1];
      let t1=+vals[j+1][0], v1=+vals[j+1][1];
      if(!(t1>t0)) continue;
      // walk across buckets
      let segStart=t0, segV0=v0;
      while(segStart < t1){
        // current bucket index
        while(i<out.length && !(segStart < buckets[i].end)) i++;
        if(i>=out.length) break;
        const segEnd = Math.min(t1, buckets[i].end);
        const dt = (segEnd - segStart)/1000;
        const v1interp = v0 + (v1 - v0) * ((segEnd - t0)/(t1 - t0));
        const avgW = (Math.abs(segV0) + Math.abs(v1interp)) / 2;
        out[i].kwh += avgW * dt / 3600 / 1000;
        // next
        segStart = segEnd;
        segV0 = v1interp;
      }
    }
    return out;
  }

  function sumEnergyKWh(vals){
    if(!vals || vals.length < 2) return 0;
    let eWh = 0;
    for(let i=0;i<vals.length-1;i++){
      const t0 = +vals[i][0], v0 = +vals[i][1];
      const t1 = +vals[i+1][0], v1 = +vals[i+1][1];
      if(isFinite(t0) && isFinite(t1) && t1>t0){
        const dt_s = (t1 - t0) / 1000;
        const avgW = (Math.abs(v0) + Math.abs(v1)) / 2;
        eWh += avgW * dt_s / 3600;
      }
    }
    return eWh / 1000;
  }

  async function load(){
    const from = new Date(document.getElementById('from').value || new Date(Date.now()-24*3600*1000).toISOString().slice(0,16));
    const to   = new Date(document.getElementById('to').value   || new Date().toISOString().slice(0,16));
    const step = (chartMode==='day')?60: (chartMode==='week'?300:(chartMode==='month'?1800:21600));
    const url = `/api/history?from=${from.getTime()}&to=${to.getTime()}&step=${step}`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>null);
    if(!res || !res.ok){ alert('History kann nicht geladen werden'); return; }
    data = res;
    draw();
    // cards
    const stepSec = res.step; // legacy info
    const s = res.series;
    const cards = document.getElementById('cards');
    function card(title, val){ const el=document.createElement('div'); el.className='card'; el.innerHTML = `<small>${title}</small><b>${val}</b>`; cards.appendChild(el); }
    cards.innerHTML='';
    card('Erzeugung',  sumEnergyKWh(s.pv.values).toFixed(1) + ' kWh');
    card('Beladung',   sumEnergyKWh(s.chg.values).toFixed(1) + ' kWh');
    card('Entladung',  sumEnergyKWh(s.dchg.values).toFixed(1) + ' kWh');
    card('Einspeisung',sumEnergyKWh(s.sell.values).toFixed(1) + ' kWh');
    card('Bezug',      sumEnergyKWh(s.buy.values).toFixed(1) + ' kWh');
    if (s.evcs) card('E‑Mobilität', sumEnergyKWh(s.evcs.values).toFixed(1) + ' kWh');
    card('Verbrauch',  sumEnergyKWh(s.load.values).toFixed(1) + ' kWh');
  }

  // init date inputs (today)
  const now = new Date();
  const start = new Date(); start.setHours(0,0,0,0);
  function toLocal(dt){ const z=dt.getTimezoneOffset(); const d = new Date(dt.getTime() - z*60000); return d.toISOString().slice(0,16); }
  document.getElementById('from').value = toLocal(start);
  document.getElementById('to').value   = toLocal(now);
  document.getElementById('loadBtn').addEventListener('click', load);

  const evcsReportBtn = document.getElementById('evcsReportBtn');
  if (evcsReportBtn) {
    evcsReportBtn.addEventListener('click', ()=>{
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const fromMs = fromEl && fromEl.value ? +new Date(fromEl.value) : (Date.now() - 7*24*3600*1000);
      const toMs = toEl && toEl.value ? +new Date(toEl.value) : Date.now();
      const url = `/static/evcs-report.html?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
      window.open(url, '_blank');
    });
  }
// range buttons
  (function(){
    const btns = Array.from(document.querySelectorAll('.range-btn'));
    function setActive(mode){
      chartMode = mode;
      btns.forEach(b=> b.classList.toggle('active', b.dataset.range===mode));
      // auto adjust from/to
      const toEl = document.getElementById('to');
      const fromEl = document.getElementById('from');
      const now = new Date();
      if(mode==='day'){
        const d0 = new Date(); d0.setHours(0,0,0,0);
        fromEl.value = toLocal(d0); toEl.value = toLocal(now);
      }else if(mode==='week'){
        const d1 = new Date(); d1.setHours(0,0,0,0); d1.setDate(d1.getDate()-6);
        fromEl.value = toLocal(d1); toEl.value = toLocal(now);
      }else if(mode==='month'){
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        fromEl.value = toLocal(first); toEl.value = toLocal(now);
      }else if(mode==='year'){
        const jan1 = new Date(now.getFullYear(), 0, 1);
        fromEl.value = toLocal(jan1); toEl.value = toLocal(now);
      }
      load();
    }
    btns.forEach(b=> b.addEventListener('click', ()=> setActive(b.dataset.range)));
    // keep initial "Tag" active
  })();



  // === click-to-inspect tooltip (inside main scope) ===
  (function(){
    const wrap = canvas.parentElement || document.body;
    let tip = document.createElement('div');
    tip.className = 'nx-tip';
    tip.style.position = 'absolute';
    tip.style.pointerEvents = 'none';
    tip.style.background = 'rgba(20,24,28,.95)';
    tip.style.border = '1px solid #2a323b';
    tip.style.borderRadius = '10px';
    tip.style.padding = '8px 10px';
    tip.style.fontSize = '12px';
    tip.style.color = '#c8d1d9';
    tip.style.boxShadow = '0 8px 22px rgba(0,0,0,.35)';
    tip.style.display = 'none';
    tip.style.zIndex = '5';
    tip.innerHTML = '';
    wrap.style.position = 'relative';
    wrap.appendChild(tip);

    let crossX = null;

    function xToTs(x, start, end, L, R, W){
      const frac = (x - L) / (W - L - R);
      return start + Math.max(0, Math.min(1, frac)) * (end - start);
    }
    function tsToX(ts, start, end, L, R, W){
      const frac = (ts - start) / (end - start);
      return L + frac * (W - L - R);
    }

    
    
    function showTipFromEvent(ev){
      if (!data) return;
      const rect = canvas.getBoundingClientRect();
      const cx = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
      const cy = (ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY);
      const x = cx - rect.left;
      const y = cy - rect.top;

      const {series, start, end} = data;
      const W=canvas.width, H=canvas.height, L=50, R=40, T=10, B=42;

      // --- BAR TOOLTIP (week/month/year) ---
      if (chartMode !== 'day' && typeof barState === 'object' && barState){
        const buckets = barState.buckets || [];
        const n = buckets.length || 1;
        const groupW = barState.groupW || ( (W-L-R)/n );
        let idx = Math.floor((x - L) / groupW);
        if (idx < 0) idx = 0;
        if (idx > n-1) idx = n-1;

        const d = new Date(buckets[idx].start);
        let header = (chartMode==='year') ? d.toLocaleDateString([], {month:'long'}) : d.toLocaleDateString([], {day:'2-digit', month:'2-digit'});

        function kv(label, val, unit='kWh'){ 
          const v = Number(val||0).toFixed(2);
          return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${label}</span><b>${v} ${unit}</b></div>`; 
        }
        const agg = barState.seriesAgg || {};
        const pv   = agg.pv?.[idx]?.kwh ?? 0;
        const chg  = agg.chg?.[idx]?.kwh ?? 0;
        const dchg = agg.dchg?.[idx]?.kwh ?? 0;
        const buy  = agg.buy?.[idx]?.kwh ?? 0;
        const sell = agg.sell?.[idx]?.kwh ?? 0;
        const load = agg.load?.[idx]?.kwh ?? 0;
        const evcs = agg.evcs?.[idx]?.kwh ?? 0;

        let html = `<div style="margin-bottom:6px;opacity:.9">${header}</div>`;
        html += kv('Erzeugung', pv);
        html += kv('Beladung', chg);
        html += kv('Entladung', dchg);
        html += kv('Bezug', buy);
        html += kv('Einspeisung', sell);
        html += kv('E‑Mobilität', evcs);
        html += kv('Verbrauch', load);
        tip.innerHTML = html;
        tip.style.display = 'block';
        const px = L + idx*groupW + groupW/2;
        const left = Math.min(Math.max(px + 12, 8), W - 220);
        const top  = Math.min(Math.max(y - 60, 8), H - 140);
        tip.style.left = left + 'px';
        tip.style.top  = top + 'px';
        crossX = px;
        draw();
        return;
      }

      // --- LINE TOOLTIP (day) ---
      let nearTs = null, minDist = 1e15;
      const collect = {};
      const targetTs = xToTs(x, start, end, L, R, W);
      for (const [key, s] of Object.entries(series)){
        if (!s.values || !s.values.length) continue;
        let lo=0, hi=s.values.length-1;
        while (lo<hi){
          const mid = Math.floor((lo+hi)/2);
          if (s.values[mid][0] < targetTs) lo = mid+1; else hi = mid;
        }
        const candIdx = Math.max(0, Math.min(s.values.length-1, lo));
        const cand = s.values[candIdx];
        const prev = s.values[Math.max(0, candIdx-1)];
        const best = (Math.abs(prev[0]-targetTs) < Math.abs(cand[0]-targetTs)) ? prev : cand;
        collect[key] = best;
        const d = Math.abs(best[0]-targetTs);
        if (d < minDist){ minDist = d; nearTs = best[0]; }
      }

      if (nearTs==null) return;

      const dt = new Date(nearTs);
      const hh = dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      function kv2(label, val, unit='kW'){ 
        const v = Number(val||0).toFixed(2);
        return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${label}</span><b>${v} ${unit}</b></div>`; 
      }
      const pv = collect.pv?.[1] ?? 0;
      const chg = collect.chg?.[1] ?? 0;
      const dchg = collect.dchg?.[1] ?? 0;
      const buy = collect.buy?.[1] ?? 0;
      const sell = collect.sell?.[1] ?? 0;
      const load = collect.load?.[1] ?? 0;
      const evcs = collect.evcs?.[1] ?? 0;
      const soc = collect.soc?.[1] ?? null;

      let html = `<div style="margin-bottom:6px;opacity:.9">${hh}</div>`;
      html += kv2('Erzeugung', pv/1000);
      html += kv2('Beladung', -(Math.abs(chg)||0)/1000);
      html += kv2('Entladung', (Math.abs(dchg)||0)/1000);
      html += kv2('Bezug', buy/1000);
      html += kv2('Einspeisung', sell/1000);
      html += kv2('E‑Mobilität', (Math.abs(evcs)||0)/1000);
      html += kv2('Verbrauch', load/1000);
      if (soc!=null) html += `<div style="margin-top:6px;border-top:1px dashed #2a323b;padding-top:6px">SoC <b>${soc.toFixed(0)} %</b></div>`;

      tip.innerHTML = html;
      tip.style.display = 'block';
      const px = tsToX(nearTs, start, end, L, R, W);
      const left = Math.min(Math.max(px + 12, 8), W - 220);
      const top  = Math.min(Math.max(y - 60, 8), H - 140);
      tip.style.left = left + 'px';
      tip.style.top  = top + 'px';
      crossX = px;
      draw(); // redraw to show crosshair
    }



    canvas.addEventListener('mouseleave', ()=>{ tip.style.display='none'; crossX=null; draw(); });
    canvas.addEventListener('click', (ev)=>{ showTipFromEvent(ev); });
    canvas.addEventListener('touchstart', (ev)=>{ showTipFromEvent(ev); }, {passive:true});
    /* BINDINGS_INSERTED */
    canvas.addEventListener('touchstart', (ev)=>{ showTipFromEvent(ev); }, {passive:true});

    // draw crosshair over chart
    const _draw = draw;
    draw = function(){
      _draw();
      if (!data) return;
      if (crossX==null) return;
      const W=canvas.width, H=canvas.height;
      ctx.save();
      ctx.strokeStyle = 'rgba(200,200,200,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crossX, 0);
      ctx.lineTo(crossX, H-42);
      ctx.stroke();
      ctx.restore();
    };
  })();
  resize(); load();
  // --- Auto-advance when 'Bis'≈Jetzt (no UI) ---
  let __autoTimer = null;
  let __autoLive = false;
  function __toLocal(dt){ const z=dt.getTimezoneOffset(); const d=new Date(dt.getTime()-z*60000); return d.toISOString().slice(0,16); }
  function __setToNow(){ const toEl = document.getElementById('to'); if (toEl) toEl.value = __toLocal(new Date()); }
  function __startAuto(){ __stopAuto(); __autoLive=true; __setToNow(); __autoTimer=setInterval(()=>{ if(__autoLive){ __setToNow(); load(); } }, 15000); }
  function __stopAuto(){ __autoLive=false; if(__autoTimer){ clearInterval(__autoTimer); __autoTimer=null; } }
  (function(){
    const toEl=document.getElementById('to'); const fromEl=document.getElementById('from'); const btn=document.getElementById('loadBtn');
    function isNearNow(){ try{ const t=new Date(toEl.value).getTime(); return isFinite(t) && Math.abs(Date.now()-t)<5*60*1000; }catch(_){ return true; } }
    if (isNearNow()) __startAuto();
    ['input','change'].forEach(ev=>{ toEl.addEventListener(ev,__stopAuto); fromEl.addEventListener(ev,__stopAuto); });
    if (btn) btn.addEventListener('click', ()=> setTimeout(()=>{ if(isNearNow()) __startAuto(); else __stopAuto(); }, 0));
  })();
})();

  // --- live dot via SSE (like LIVE) ---
  (function(){
    const dot = document.getElementById('liveDot');
    if (!dot) return;
    function connect(){
      try{
        const es = new EventSource('/events');
        dot.classList.remove('live');
        es.onopen = ()=>{ dot.classList.add('live'); };
        es.onerror = ()=>{ dot.classList.remove('live'); try{ es.close(); }catch(_){ }; setTimeout(connect, 5000); };
        es.onmessage = ()=>{};
      }catch(e){ dot.classList.remove('live'); setTimeout(connect, 5000); }
    }
    connect();
  })();

  // --- header interactions (same as index) ---
  (function(){
    const menuBtn = document.getElementById('menuBtn');
    const menu = document.getElementById('menuDropdown');
    if (menuBtn && menu) {
      const close = ()=> menu.classList.add('hidden');
      const toggle = ()=> menu.classList.toggle('hidden');
      menuBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); toggle(); });
      menu.addEventListener('click', (e)=> e.stopPropagation());
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
      document.addEventListener('click', ()=> close());
    }
    const liveBtn = document.getElementById('liveTabBtn');
    if (liveBtn) liveBtn.addEventListener('click', (e)=>{ /* fallback */ if(!liveBtn.getAttribute('onclick')) { e.preventDefault(); window.location.href = './'; } });
    const histBtn = document.getElementById('historyTabBtn');
    if (histBtn) histBtn.addEventListener('click', (e)=>{ /* already here */ });
    // Installateur-/Admin-Zugriff wird im Endkunden-Dashboard nicht angeboten.
  })();


  
  // --- live dot via SSE (same as live) ---
  (function(){
    const dot = document.getElementById('liveDot');
    function connect(){
      try{
        const es = new EventSource('/events');
        if (dot) dot.classList.remove('live');
        es.onopen = ()=>{ if (dot) dot.classList.add('live'); };
        es.onerror = ()=>{ 
          if (dot) dot.classList.remove('live'); 
          try{ es.close(); }catch(_){ } 
          setTimeout(connect, 3000);
        };
        // ignore incoming messages on history page
        es.onmessage = ()=>{};
      }catch(e){
        if (dot) dot.classList.remove('live');
        setTimeout(connect, 3000);
      }
    }
    connect();
  })();


  
  

// menu: open settings by redirecting to live with query
  (function(){
    const settingsBtn = document.getElementById('menuOpenSettings');
    if (settingsBtn) settingsBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.location.href = '/?settings=1';
    });
  })();


// EVCS menu visibility
(function(){
  fetch('/config').then(r=>r.json()).then(cfg=>{
    const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', c < 2);
      const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', c < 2);
    const n = document.getElementById('nav-evcs');
    if (n) n.classList.toggle('hidden', c < 2);
    const sh = !!(cfg.smartHome && cfg.smartHome.enabled);
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !sh);
    const st = document.getElementById('tabSmartHome');
    if (st) st.classList.toggle('hidden', !sh);

    // Speicherfarm Tab/Link (nur wenn im Admin aktiviert)
    const sf = !!(cfg.ems && cfg.ems.storageFarmEnabled);
    const sft = document.getElementById('tabStorageFarm');
    if (sft) sft.classList.toggle('hidden', !sf);
    const sfl = document.getElementById('menuStorageFarmLink');
    if (sfl) sfl.classList.toggle('hidden', !sf);
}).catch(()=>{});
})();
