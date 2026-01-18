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

  // --- Zoom & Navigation (History) ---
  // Zoom is implemented for the day chart (line mode) via drag-selection.
  // The date inputs remain as a detailed search tool.
  let zoomStack = []; // stack of {fromMs,toMs}
  let zoomSel = null; // {x0,x1} while dragging
  let zoomDragging = false;
  let zoomDragStartX = 0;
  let zoomSuppressClickUntil = 0;

  function getChartMargins(){
    const W = canvas.width;
    const L = (W < 520) ? 54 : 64;
    const R = (W < 520) ? 48 : 56;
    const T = (W < 520) ? 20 : 24;
    const B = 42;
    return { L, R, T, B };
  }

  // --- Optional Energiefluss series (Verbraucher/Erzeuger) ---
  function getExtras(){
    const ex = (data && data.extras && typeof data.extras === 'object') ? data.extras : null;
    return {
      consumers: Array.isArray(ex && ex.consumers) ? ex.consumers : [],
      producers: Array.isArray(ex && ex.producers) ? ex.producers : []
    };
  }

  function buildSeriesAll(){
    const base = (data && data.series && typeof data.series === 'object') ? data.series : {};
    const ex = getExtras();
    const out = Object.assign({}, base);
    // attach extras as distinct keys (c1..c10, p1..p5)
    ex.consumers.forEach((c)=>{
      const key = 'c' + String(c && c.idx || '');
      if (!key || key==='c') return;
      out[key] = { id: c.id, name: c.name, kind: 'consumer', values: Array.isArray(c.values) ? c.values : [] };
    });
    ex.producers.forEach((p)=>{
      const key = 'p' + String(p && p.idx || '');
      if (!key || key==='p') return;
      out[key] = { id: p.id, name: p.name, kind: 'producer', values: Array.isArray(p.values) ? p.values : [] };
    });
    return out;
  }

  const EXTRA_COLORS = {
    // 10 Verbraucher
    consumer: ['#22d3ee','#38bdf8','#60a5fa','#818cf8','#a78bfa','#c4b5fd','#f0abfc','#f472b6','#fb7185','#fdba74'],
    // 5 Erzeuger
    producer: ['#a3e635','#84cc16','#22c55e','#10b981','#14b8a6']
  };

  function colorForExtra(kind, idx){
    const list = EXTRA_COLORS[kind] || [];
    const i = Math.max(0, Math.min(list.length-1, (Number(idx)||1)-1));
    return list[i] || '#cbd3db';
  }

  function updateLegend(){
    const legend = document.querySelector('.legend');
    if (!legend) return;
    // remove old extra legend items
    Array.from(legend.querySelectorAll('.lg-extra')).forEach(el=>{ try{ el.remove(); }catch(_e){} });

    // Only show extras in line mode to avoid confusion with bar view.
    if (chartMode !== 'day') return;

    const ex = getExtras();

    function addItem(label, color){
      const el = document.createElement('div');
      el.className = 'lg lg-extra';
      const sw = document.createElement('div');
      sw.className = 'sw';
      sw.style.background = color;
      const sp = document.createElement('span');
      sp.textContent = label;
      el.appendChild(sw);
      el.appendChild(sp);
      legend.appendChild(el);
    }

    ex.producers.forEach(p=>{
      const idx = Number(p && p.idx) || 0;
      if (!idx) return;
      const name = (p && p.name) ? String(p.name) : `Erzeuger ${idx}`;
      addItem(name, colorForExtra('producer', idx));
    });
    ex.consumers.forEach(c=>{
      const idx = Number(c && c.idx) || 0;
      if (!idx) return;
      const name = (c && c.name) ? String(c.name) : `Verbraucher ${idx}`;
      addItem(name, colorForExtra('consumer', idx));
    });
  }
  
  function drawBars(){
      const {start, end} = data;
      const series = buildSeriesAll();
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
    const {start, end} = data;
    const series = buildSeriesAll();
    const W = canvas.width;
    const H = canvas.height;
    // Leave enough room for axis labels (rounded canvas corners clip text near the edges).
    // On small screens we keep margins compact.
    const { L, R, T, B } = getChartMargins();
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
    const ex = getExtras();
    const keysBase=['pv','chg','dchg','sell','buy','evcs','load'];
    const keysExtraProd = ex.producers.map(p=> 'p' + String(p && p.idx || '')).filter(k=>k && k!=='p' && series[k]);
    const keysExtraCons = ex.consumers.map(c=> 'c' + String(c && c.idx || '')).filter(k=>k && k!=='c' && series[k]);
    const keys = keysBase.concat(keysExtraProd, keysExtraCons);
    let minKW=0, maxKW=0;
    keys.forEach(k=>{ const vals=(series[k]?.values)||[]; vals.forEach(p=>{ const v=mapKW(k, p[1]); if(v<minKW) minKW=v; if(v>maxKW) maxKW=v; }); });
    if (minKW===0 && maxKW===0) { maxKW = 1; }
    const pad = Math.max(0.05, (maxKW-minKW)*0.08);
    minKW -= pad; maxKW += pad;
    const yPow = (kw)=> T + (H-B-T)*(1 - ((kw - minKW)/((maxKW-minKW)||1)));
    const y0 = yPow(0);

    // SoC axis: in this chart we want SoC to live only in the upper half.
    // 0% should sit on the *power* 0‑line (midline), and 100% should be at the top.
    // This matches the typical reference chart layout (kW with positive/negative, SoC above).
    const ySocBase = Math.min(Math.max(y0, T), H - B);
    const ySoc = (pct)=> {
      const p = Math.max(0, Math.min(100, Number(pct) || 0));
      return ySocBase - (p / 100) * (ySocBase - T);
    };

    // grid
    ctx.strokeStyle='#1d242b'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy = T + i*(H-B-T)/5; ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(W-R,yy); ctx.stroke(); }
    // zero axis for power (emphasized)
    ctx.save(); ctx.strokeStyle='#2a323b'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(L,y0); ctx.lineTo(W-R,y0); ctx.stroke(); ctx.restore();

    // value mapping for sign conventions
    function mapKW(k, w){
      // w in Watts -> return kW with desired sign
      const val = Number(w)||0;
      // dynamic Energiefluss series
      if (String(k||'').startsWith('c')) return -Math.abs(val)/1000; // Verbraucher
      if (String(k||'').startsWith('p')) return  Math.abs(val)/1000; // Erzeuger
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
    function line(k, color, accessor='val', dash, width){
      const vals = (series[k] && series[k].values) || [];
      if(!vals.length) return;
      ctx.save(); ctx.beginPath();
      if (dash) ctx.setLineDash(dash);
      ctx.lineWidth = Number.isFinite(Number(width)) ? Number(width) : 2;
      ctx.strokeStyle = color;
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

    // Extras (Energiefluss-Monitor): Erzeuger/Verbraucher
    ex.producers.forEach(p=>{
      const idx = Number(p && p.idx) || 0;
      if (!idx) return;
      const key = 'p' + idx;
      line(key, colorForExtra('producer', idx), 'val', [4,4], 1.6);
    });
    ex.consumers.forEach(c=>{
      const idx = Number(c && c.idx) || 0;
      if (!idx) return;
      const key = 'c' + idx;
      line(key, colorForExtra('consumer', idx), 'val', [4,4], 1.6);
    });

    line('soc', '#95a5a6', 'val', [6,6]);

    // ------------------------------
    // Axes: labels + tick values
    // ------------------------------
    const fmtKWAxis = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return '';
      if (Math.abs(n) < 0.05) return '0';
      return n.toLocaleString([], { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    };

    ctx.fillStyle = '#cbd3db';
    ctx.font = '12px system-ui, sans-serif';

    // Y (Power) tick labels at grid lines
    ctx.save();
    ctx.fillStyle = '#aeb7bf';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const yy = T + i * (H - B - T) / 5;
      const val = maxKW - i * (maxKW - minKW) / 5;
      ctx.fillText(fmtKWAxis(val), L - 8, yy);
    }
    ctx.restore();

    // Y (SoC) tick labels 0..100% on the right
    ctx.save();
    ctx.fillStyle = '#aeb7bf';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    [0, 20, 40, 60, 80, 100].forEach(p => {
      ctx.fillText(String(p), W - R + 8, ySoc(p));
    });
    ctx.restore();

    // Axis titles (units): render in the top padding area, above the tick labels
    // (matches the reference chart and avoids the previous "stacked" look).
    ctx.save();
    ctx.fillStyle = '#aeb7bf';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    const yTitle = Math.max(12, T - 8);
    // align with tick label columns
    ctx.textAlign = 'right';
    ctx.fillText('kW', L - 8, yTitle);
    ctx.textAlign = 'left';
    ctx.fillText('%', W - R + 8, yTitle);
    ctx.restore();

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

    function toTsMs(t){
    if(t === null || t === undefined) return NaN;
    if(typeof t === 'number'){
      if(!Number.isFinite(t)) return NaN;
      // Heuristic: influxdb can return seconds; we need ms
      return (t > 0 && t < 1e12) ? t * 1000 : t;
    }
    if(t instanceof Date) return t.getTime();
    if(typeof t === 'string'){
      const s = t.trim();
      if(!s) return NaN;
      const asNum = Number(s);
      if(Number.isFinite(asNum)) return (asNum > 0 && asNum < 1e12) ? asNum * 1000 : asNum;
      const parsed = Date.parse(s);
      return Number.isNaN(parsed) ? NaN : parsed;
    }
    const n = Number(t);
    if(Number.isFinite(n)) return (n > 0 && n < 1e12) ? n * 1000 : n;
    return NaN;
  }

  function sumEnergyKWh(vals){
    if(!Array.isArray(vals) || vals.length < 2) return 0;
    const points = vals
      .map(p => [toTsMs(p[0]), Number(p[1])])
      .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .sort((a, b) => a[0] - b[0]);
    if(points.length < 2) return 0;

    let eWh = 0;
    for(let i=0; i<points.length-1; i++){
      const t0 = points[i][0], v0 = Math.abs(points[i][1]);
      const t1 = points[i+1][0], v1 = Math.abs(points[i+1][1]);
      if(t1 <= t0) continue;

      const dt_s = (t1 - t0) / 1000;
      const avgW = (v0 + v1) / 2;
      eWh += avgW * dt_s / 3600;
    }
    return eWh / 1000;
  }

async function load(){
    const from = new Date(document.getElementById('from').value || new Date(Date.now()-24*3600*1000).toISOString().slice(0,16));
    const to   = new Date(document.getElementById('to').value   || new Date().toISOString().slice(0,16));
    // NOTE: Historie wird im 10-Minuten-Raster nach Influx geschrieben.
    // Für die Tagesansicht verwenden wir ebenfalls 10 Minuten (keine "Treppen" durch Hold‑Last).
    // Für Woche/Monat/Jahr reicht eine gröbere Auflösung; dadurch vermeiden wir zudem getHistory-Limits.
    const step = (chartMode==='day') ? 600 : (chartMode==='week' ? 600 : (chartMode==='month' ? 1800 : 21600));
    const url = `/api/history?from=${from.getTime()}&to=${to.getTime()}&step=${step}`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>null);
    if(!res || !res.ok){ alert('History kann nicht geladen werden'); return; }
    data = res;
    // Backward compatible default (older backends won't include extras)
    if (!data.extras) data.extras = { consumers: [], producers: [] };
    updateLegend();
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

    // Extras (optional): Verbraucher/Erzeuger aus Energiefluss
    const ex = (res.extras && typeof res.extras === 'object') ? res.extras : { consumers: [], producers: [] };
    (Array.isArray(ex.producers) ? ex.producers : []).forEach(p=>{
      const idx = Number(p && p.idx) || 0;
      const name = (p && p.name) ? String(p.name) : (idx ? `Erzeuger ${idx}` : 'Erzeuger');
      const kwh = sumEnergyKWh(Array.isArray(p.values) ? p.values : []);
      // Show if configured (backend filters configured slots). Even if empty, show 0.0 for visibility.
      card(`Erzeuger: ${name}`, kwh.toFixed(1) + ' kWh');
    });
    (Array.isArray(ex.consumers) ? ex.consumers : []).forEach(c=>{
      const idx = Number(c && c.idx) || 0;
      const name = (c && c.name) ? String(c.name) : (idx ? `Verbraucher ${idx}` : 'Verbraucher');
      const kwh = sumEnergyKWh(Array.isArray(c.values) ? c.values : []);
      card(`Verbraucher: ${name}`, kwh.toFixed(1) + ' kWh');
    });
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

      // Any explicit mode switch is a manual action -> stop auto live.
      try { __stopAuto(); } catch(_e){}

      // Reset zoom stack when switching modes (zoom is only for day view).
      zoomStack = [];
      zoomSel = null;
      zoomDragging = false;
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}

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
      const t = (ev.touches && ev.touches[0]) ? ev.touches[0]
              : (ev.changedTouches && ev.changedTouches[0]) ? ev.changedTouches[0]
              : null;
      const cx = t ? t.clientX : ev.clientX;
      const cy = t ? t.clientY : ev.clientY;
      const x = cx - rect.left;
      const y = cy - rect.top;

      const {start, end} = data;
      const series = buildSeriesAll();
      const W = canvas.width, H = canvas.height;
      // Use the same margins as the renderer so click-to-inspect aligns with the chart.
      let L = 50, R = 40, T = 10, B = 42;
      if (chartMode === 'day') {
        const m = getChartMargins();
        L = m.L; R = m.R; T = m.T; B = m.B;
      } else if (typeof barState === 'object' && barState) {
        L = Number.isFinite(Number(barState.L)) ? Number(barState.L) : L;
        R = Number.isFinite(Number(barState.R)) ? Number(barState.R) : R;
        T = Number.isFinite(Number(barState.T)) ? Number(barState.T) : T;
        B = Number.isFinite(Number(barState.B)) ? Number(barState.B) : B;
      }

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

      // Optional: Energiefluss Verbraucher/Erzeuger (nur anzeigen wenn vorhanden)
      const ex = getExtras();
      const extraLines = [];
      (Array.isArray(ex.producers) ? ex.producers : []).forEach(p=>{
        const idx = Number(p && p.idx) || 0;
        if (!idx) return;
        const key = 'p' + idx;
        const raw = collect[key]?.[1];
        if (raw==null) return;
        const kw = (Math.abs(raw)||0) / 1000;
        if (kw < 0.001) return;
        extraLines.push({ label: (p && p.name) ? String(p.name) : `Erzeuger ${idx}`, kw });
      });
      (Array.isArray(ex.consumers) ? ex.consumers : []).forEach(c=>{
        const idx = Number(c && c.idx) || 0;
        if (!idx) return;
        const key = 'c' + idx;
        const raw = collect[key]?.[1];
        if (raw==null) return;
        const kw = (Math.abs(raw)||0) / 1000;
        if (kw < 0.001) return;
        extraLines.push({ label: (c && c.name) ? String(c.name) : `Verbraucher ${idx}`, kw });
      });
      if (extraLines.length){
        html += `<div style="margin-top:6px;border-top:1px dashed #2a323b;padding-top:6px;opacity:.9">Energiefluss</div>`;
        extraLines.forEach(it=>{ html += kv2(it.label, it.kw); });
      }
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



    // expose for touch drag/tap handling (used by drag-to-zoom on mobile)
    window.__nxHistoryShowTipFromEvent = showTipFromEvent;

    canvas.addEventListener('mouseleave', ()=>{ tip.style.display='none'; crossX=null; draw(); });
    canvas.addEventListener('click', (ev)=>{ 
      // If a drag-zoom just happened, suppress the click-to-inspect tooltip.
      if (Date.now() < zoomSuppressClickUntil) return;
      showTipFromEvent(ev);
    });
    canvas.addEventListener('touchend', (ev)=>{ 
      if (Date.now() < zoomSuppressClickUntil) return;
      // In day view, touch is used for drag-to-zoom; tap-to-inspect is handled there.
      if (chartMode === 'day') return;
      showTipFromEvent(ev);
    }, {passive:true});
    // (removed duplicate binding)

    // draw crosshair over chart
    const _draw = draw;
    draw = function(){
      _draw();
      if (!data) return;

      // Zoom selection overlay (day chart only)
      if (chartMode === 'day' && zoomSel && Number.isFinite(zoomSel.x0) && Number.isFinite(zoomSel.x1)){
        const { L, R, T, B } = getChartMargins();
        const W = canvas.width;
        const H = canvas.height;
        const x0 = Math.max(L, Math.min(W - R, zoomSel.x0));
        const x1 = Math.max(L, Math.min(W - R, zoomSel.x1));
        const a = Math.min(x0, x1);
        const b = Math.max(x0, x1);
        if (b - a >= 2){
          ctx.save();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 1;
          ctx.fillRect(a, T, b - a, (H - B - T));
          ctx.strokeRect(a + 0.5, T + 0.5, (b - a) - 1, (H - B - T) - 1);
          ctx.restore();
        }
      }

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

  // --- History navigation (◀/▶) + zoom reset button ---
  (function(){
    const prevBtn = document.getElementById('navPrev');
    const nextBtn = document.getElementById('navNext');
    const resetBtn = document.getElementById('resetZoomBtn');

    function showReset(){
      if (!resetBtn) return;
      resetBtn.classList.toggle('hidden', zoomStack.length === 0);
    }
    showReset();

    function addMonths(date, delta){
      const d = new Date(date);
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, maxDay));
      return d;
    }

    function shiftRange(dir){
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      if (!fromEl || !toEl) return;
      const from = new Date(fromEl.value);
      const to = new Date(toEl.value);
      if (!isFinite(from.getTime()) || !isFinite(to.getTime())) return;
      let nf = new Date(from);
      let nt = new Date(to);

      if (chartMode === 'day'){
        nf.setDate(nf.getDate() + dir);
        nt.setDate(nt.getDate() + dir);
      } else if (chartMode === 'week'){
        nf.setDate(nf.getDate() + (dir * 7));
        nt.setDate(nt.getDate() + (dir * 7));
      } else if (chartMode === 'month'){
        nf = addMonths(nf, dir);
        nt = addMonths(nt, dir);
      } else if (chartMode === 'year'){
        nf.setFullYear(nf.getFullYear() + dir);
        nt.setFullYear(nt.getFullYear() + dir);
      }

      // Avoid stepping into the future when the current view ends near "now".
      const now = new Date();
      if (nt.getTime() > now.getTime() && to.getTime() <= (now.getTime() + 5*60*1000)){
        const span = nt.getTime() - nf.getTime();
        nt = now;
        nf = new Date(now.getTime() - span);
      }

      // stop auto-live mode on manual navigation
      try { __stopAuto(); } catch(_e){}

      fromEl.value = toLocal(nf);
      toEl.value = toLocal(nt);
      load();
    }

    if (prevBtn) prevBtn.addEventListener('click', ()=> shiftRange(-1));
    if (nextBtn) nextBtn.addEventListener('click', ()=> shiftRange(+1));
    if (resetBtn) resetBtn.addEventListener('click', ()=>{
      if (!zoomStack.length) return;
      const last = zoomStack.pop();
      showReset();
      if (!last) return;
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      if (!fromEl || !toEl) return;
      fromEl.value = toLocal(new Date(last.fromMs));
      toEl.value = toLocal(new Date(last.toMs));
      try { __stopAuto(); } catch(_e){}
      load();
    });

    // expose helper for other parts (mode switch)
    window.__nxHistoryShowZoomReset = showReset;
  })();

  // --- Drag-to-zoom (day chart) ---
  (function(){
    function xToTs(x, start, end){
      const { L, R } = getChartMargins();
      const W = canvas.width;
      const frac = (x - L) / (W - L - R);
      return start + Math.max(0, Math.min(1, frac)) * (end - start);
    }

    function setInputs(fromMs, toMs){
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      if (!fromEl || !toEl) return;
      fromEl.value = toLocal(new Date(fromMs));
      toEl.value = toLocal(new Date(toMs));
    }

    function clearSel(){
      zoomSel = null;
      zoomDragging = false;
      draw();
    }

    canvas.addEventListener('mousedown', (ev)=>{
      if (chartMode !== 'day') return;
      if (!data) return;
      if (ev.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      zoomDragging = true;
      zoomDragStartX = x;
      zoomSel = { x0: x, x1: x };
      draw();
    });


    // Touch: drag-to-zoom + tap-to-inspect (Tag-Ansicht)
    canvas.addEventListener('touchstart', (ev)=>{
      if (chartMode !== 'day') return;
      if (!data) return;
      if (!ev.touches || ev.touches.length !== 1) return;
      try { ev.preventDefault(); } catch(_e){}
      const rect = canvas.getBoundingClientRect();
      const x = ev.touches[0].clientX - rect.left;
      zoomDragging = true;
      zoomDragStartX = x;
      zoomSel = { x0: x, x1: x };
      draw();
    }, {passive:false});

    canvas.addEventListener('touchmove', (ev)=>{
      if (!zoomDragging) return;
      if (!ev.touches || !ev.touches[0]) return;
      try { ev.preventDefault(); } catch(_e){}
      const rect = canvas.getBoundingClientRect();
      const x = ev.touches[0].clientX - rect.left;
      if (!zoomSel) zoomSel = { x0: zoomDragStartX, x1: x };
      zoomSel.x1 = x;
      draw();
    }, {passive:false});

    canvas.addEventListener('touchend', (ev)=>{
      if (chartMode !== 'day') return;
      if (!zoomDragging) return;
      if (!data){ clearSel(); return; }
      try { ev.preventDefault(); } catch(_e){}
      const rect = canvas.getBoundingClientRect();
      const t = (ev.changedTouches && ev.changedTouches[0]) ? ev.changedTouches[0] : null;
      const x = t ? (t.clientX - rect.left) : zoomDragStartX;
      const a = Math.min(zoomDragStartX, x);
      const b = Math.max(zoomDragStartX, x);
      const px = b - a;

      // selection too small -> treat as tap (tooltip)
      if (px < 18){
        clearSel();
        zoomSuppressClickUntil = Date.now() + 350;
        try { if (typeof window.__nxHistoryShowTipFromEvent === 'function') window.__nxHistoryShowTipFromEvent(ev); } catch(_e){}
        return;
      }

      const { start, end } = data;
      const fromMs = xToTs(a, start, end);
      const toMs = xToTs(b, start, end);

      // push previous range for reset
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const prevFromMs = fromEl ? new Date(fromEl.value).getTime() : start;
      const prevToMs = toEl ? new Date(toEl.value).getTime() : end;
      if (isFinite(prevFromMs) && isFinite(prevToMs)){
        zoomStack.push({ fromMs: prevFromMs, toMs: prevToMs });
      }

      try { __stopAuto(); } catch(_e){}
      setInputs(fromMs, toMs);
      zoomSuppressClickUntil = Date.now() + 400;
      clearSel();
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      load();
    }, {passive:false});

    canvas.addEventListener('touchcancel', ()=>{ if (zoomDragging) clearSel(); });

    // Optional: Ctrl/⌘ + Wheel zoom (Tag) – allows trackpad pinch (ctrlKey) without breaking normal page scroll.
    let __wheelTimer = null;
    let __wheelLast = 0;
    canvas.addEventListener('wheel', (ev)=>{
      if (chartMode !== 'day') return;
      if (!data) return;
      if (!(ev.ctrlKey || ev.metaKey)) return;
      try { ev.preventDefault(); } catch(_e){}

      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      let start = fromEl ? new Date(fromEl.value).getTime() : data.start;
      let end   = toEl ? new Date(toEl.value).getTime() : data.end;
      if (!isFinite(start) || !isFinite(end) || end <= start) return;

      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const ts = xToTs(x, start, end);
      const r = (ts - start) / (end - start);

      const factor = (ev.deltaY < 0) ? 0.85 : 1.18;
      let newRange = (end - start) * factor;
      const minRange = 10 * 60 * 1000; // 10min
      const maxRange = 7 * 24 * 60 * 60 * 1000; // 7d (still ok in day mode)
      if (newRange < minRange) newRange = minRange;
      if (newRange > maxRange) newRange = maxRange;

      const now = Date.now();
      if (now - __wheelLast > 800){
        zoomStack.push({ fromMs: start, toMs: end });
        try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      }
      __wheelLast = now;

      let fromMs = ts - r * newRange;
      let toMs = fromMs + newRange;
      try { __stopAuto(); } catch(_e){}
      setInputs(fromMs, toMs);
      zoomSuppressClickUntil = Date.now() + 250;

      if (__wheelTimer) clearTimeout(__wheelTimer);
      __wheelTimer = setTimeout(()=>{ load(); }, 200);
    }, {passive:false});

    window.addEventListener('mousemove', (ev)=>{
      if (!zoomDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      if (!zoomSel) zoomSel = { x0: zoomDragStartX, x1: x };
      zoomSel.x1 = x;
      draw();
    });

    window.addEventListener('mouseup', (ev)=>{
      if (!zoomDragging) return;
      if (!data){ clearSel(); return; }
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const a = Math.min(zoomDragStartX, x);
      const b = Math.max(zoomDragStartX, x);
      const px = b - a;

      // selection too small -> treat as click, no zoom
      if (px < 18){
        clearSel();
        return;
      }

      const { start, end } = data;
      const fromMs = xToTs(a, start, end);
      const toMs = xToTs(b, start, end);

      // push previous range for reset
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const prevFromMs = fromEl ? new Date(fromEl.value).getTime() : start;
      const prevToMs = toEl ? new Date(toEl.value).getTime() : end;
      if (isFinite(prevFromMs) && isFinite(prevToMs)){
        zoomStack.push({ fromMs: prevFromMs, toMs: prevToMs });
      }

      // stop auto-live on zoom
      try { __stopAuto(); } catch(_e){}

      setInputs(fromMs, toMs);
      zoomSuppressClickUntil = Date.now() + 400;
      clearSel();

      // show reset button
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      load();
    });

    canvas.addEventListener('dblclick', ()=>{
      if (!zoomStack.length) return;
      const resetBtn = document.getElementById('resetZoomBtn');
      if (resetBtn && !resetBtn.classList.contains('hidden')) resetBtn.click();
    });

    canvas.addEventListener('mouseleave', ()=>{ if (zoomDragging) clearSel(); });
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
