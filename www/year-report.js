(function(){
  function el(id){ return document.getElementById(id); }

  function q(name){
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch(_e){
      return null;
    }
  }

  function clampInt(v, min, max, def){
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    const i = Math.trunc(n);
    return Math.max(min, Math.min(max, i));
  }

  function toIsoDate(ms){
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }

  function fmtKwh(n){
    const x = Number(n);
    if (!Number.isFinite(x)) return '0.0';
    return x.toFixed(1);
  }

  function fmtPct(n){
    const x = Number(n);
    if (!Number.isFinite(x)) return '0.0';
    return x.toFixed(1);
  }

  function isFiniteNum(n){
    return Number.isFinite(Number(n));
  }

  // Integrate a power series (W) to energy (kWh).
  // Input: [[ts, W], ...] where ts can be ms/seconds/string.
  function toTsMs(t){
    if (t === null || t === undefined) return NaN;
    if (typeof t === 'number') {
      if (!Number.isFinite(t)) return NaN;
      return (t > 0 && t < 1e12) ? t * 1000 : t;
    }
    if (t instanceof Date) return t.getTime();
    if (typeof t === 'string') {
      const s = t.trim();
      if (!s) return NaN;
      const asNum = Number(s);
      if (Number.isFinite(asNum)) return (asNum > 0 && asNum < 1e12) ? asNum * 1000 : asNum;
      const parsed = Date.parse(s);
      return Number.isNaN(parsed) ? NaN : parsed;
    }
    const n = Number(t);
    return Number.isFinite(n) ? ((n > 0 && n < 1e12) ? n * 1000 : n) : NaN;
  }

  function sumEnergyKWh(vals){
    if(!Array.isArray(vals) || vals.length < 2) return 0;
    const pts = vals
      .map(p => [toTsMs(p && p[0]), p && p[1]])
      .map(([ts, v]) => ({ ts, v: Number(v) }))
      .filter(p => Number.isFinite(p.ts) && Number.isFinite(p.v))
      .sort((a,b) => a.ts - b.ts);
    if (pts.length < 2) return 0;

    let eWh = 0;
    for (let i=0; i<pts.length-1; i++){
      const t0 = pts[i].ts;
      const t1 = pts[i+1].ts;
      if (!(t1 > t0)) continue;
      const v0 = Math.abs(pts[i].v);
      const v1 = Math.abs(pts[i+1].v);
      const dt_s = (t1 - t0) / 1000;
      const avgW = (v0 + v1) / 2;
      eWh += avgW * dt_s / 3600;
    }
    return eWh / 1000;
  }

  // ------------------------------
  // Report state
  // ------------------------------
  // Default view: show everything in one table (overview).
  // The other tabs act as optional filters.
  let activeTab = 'all';
  let report = null; // computed data

  function setError(msg){
    const err = el('err');
    if (!err) return;
    if (!msg){
      err.textContent = '';
      err.classList.add('hidden');
      return;
    }
    err.textContent = msg;
    err.classList.remove('hidden');
  }

  function setHint(html){
    const h = el('hint');
    if (!h) return;
    h.innerHTML = html || '';
  }

  function setMeta(text){
    const m = el('rangeMeta');
    if (m) m.textContent = text || '';
  }

  function setTableLoading(){
    const thead = el('thead');
    const tbody = el('tbody');
    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Lade Daten…</td></tr>';
  }

  function getYearsFromQuery(){
    const now = new Date();
    const endYear = clampInt(q('y'), 2000, 2100, now.getFullYear());
    const span = clampInt(q('span'), 1, 10, 4);
    const years = [];
    for (let y = endYear - span + 1; y <= endYear; y++) years.push(y);
    return { endYear, span, years };
  }

  async function fetchYear(year){
    const nowMs = Date.now();
    const fromMs = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime();
    const toMs = Math.min(endMs, nowMs); // year-to-date for current year

    // Keep the year report lightweight: a coarse step is enough for kWh integration,
    // and prevents getHistory limits.
    const step = 21600; // 6h

    const url = `/api/history?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}&step=${encodeURIComponent(step)}`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>null);
    if (!res || !res.ok) return { ok:false, year, fromMs, toMs, res };
    return { ok:true, year, fromMs, toMs, res };
  }

  function computeYearTotals(item){
    const year = item.year;
    const res = item.res || {};
    const series = (res.series && typeof res.series === 'object') ? res.series : {};
    const extras = (res.extras && typeof res.extras === 'object') ? res.extras : { consumers: [], producers: [] };
    const energy = (res.energy && typeof res.energy === 'object') ? res.energy : {};

    const producers = (Array.isArray(extras.producers) ? extras.producers : [])
      .map(p => ({
        idx: Number(p && p.idx) || 0,
        name: (p && p.name) ? String(p.name) : 'Erzeuger',
        id: p && p.id,
        kwh: sumEnergyKWh(Array.isArray(p && p.values) ? p.values : [])
      }))
      .filter(p => p.idx > 0)
      .sort((a,b) => a.idx - b.idx);

    const consumers = (Array.isArray(extras.consumers) ? extras.consumers : [])
      .map(c => ({
        idx: Number(c && c.idx) || 0,
        name: (c && c.name) ? String(c.name) : 'Verbraucher',
        id: c && c.id,
        kwh: sumEnergyKWh(Array.isArray(c && c.values) ? c.values : [])
      }))
      .filter(c => c.idx > 0)
      .sort((a,b) => a.idx - b.idx);

    // Core totals (prefer counters if available)
    const gridImportKwh = isFiniteNum(energy.gridImportKwh) ? Number(energy.gridImportKwh) : sumEnergyKWh(series.buy && series.buy.values);
    const gridExportKwh = isFiniteNum(energy.gridExportKwh) ? Number(energy.gridExportKwh) : sumEnergyKWh(series.sell && series.sell.values);

    const chargeKwh = isFiniteNum(energy.storageChargeKwh) ? Number(energy.storageChargeKwh) : sumEnergyKWh(series.chg && series.chg.values);
    const dischargeKwh = isFiniteNum(energy.storageDischargeKwh) ? Number(energy.storageDischargeKwh) : sumEnergyKWh(series.dchg && series.dchg.values);
    const batteryLossKwh = Math.max(0, (Number.isFinite(chargeKwh) ? chargeKwh : 0) - (Number.isFinite(dischargeKwh) ? dischargeKwh : 0));

    // EV energy (optional)
    const evKwh = isFiniteNum(energy.evKwh) ? Number(energy.evKwh) : sumEnergyKWh(series.evcs && series.evcs.values);

    // Production: if producers are configured, prefer the breakdown sum so the totals match.
    const sumProducers = producers.reduce((s,p)=> s + (Number.isFinite(p.kwh) ? p.kwh : 0), 0);
    let productionKwh = 0;
    if (sumProducers > 0.01) productionKwh = sumProducers;
    else if (isFiniteNum(energy.productionKwh)) productionKwh = Number(energy.productionKwh);
    else productionKwh = sumEnergyKWh(series.pv && series.pv.values);

    // Consumption
    let consumptionKwh = 0;
    if (isFiniteNum(energy.consumptionKwh)) consumptionKwh = Number(energy.consumptionKwh);
    else if (series.load && Array.isArray(series.load.values)) consumptionKwh = sumEnergyKWh(series.load.values);
    else consumptionKwh = (Number.isFinite(gridImportKwh) ? gridImportKwh : 0) + productionKwh - (Number.isFinite(gridExportKwh) ? gridExportKwh : 0);

    // Quotes
    const selfConsumedKwh = Math.max(0, productionKwh - (Number.isFinite(gridExportKwh) ? gridExportKwh : 0));
    const selfConsumptionPct = productionKwh > 0.0001 ? (selfConsumedKwh / productionKwh) * 100 : 0;
    const autarkyPct = consumptionKwh > 0.0001 ? (selfConsumedKwh / consumptionKwh) * 100 : 0;

    return {
      year,
      productionKwh,
      consumptionKwh,
      gridImportKwh,
      gridExportKwh,
      producers,
      consumers,
      evKwh,
      chargeKwh,
      dischargeKwh,
      batteryLossKwh,
      selfConsumptionPct,
      autarkyPct,
      _meta: {
        fromMs: item.fromMs,
        toMs: item.toMs,
        countersEndMs: (res.energy && res.energy.__endMs) ? Number(res.energy.__endMs) : null
      }
    };
  }

  function collectDefs(years, byYear, kind){
    // kind: 'producers' | 'consumers'
    const map = new Map(); // idx -> name
    years.forEach(y => {
      const yr = byYear[y];
      const arr = yr && Array.isArray(yr[kind]) ? yr[kind] : [];
      arr.forEach(it => {
        const idx = Number(it && it.idx) || 0;
        if (!idx) return;
        const name = (it && it.name) ? String(it.name) : '';
        if (!map.has(idx)) map.set(idx, name || (kind === 'producers' ? `Erzeuger ${idx}` : `Verbraucher ${idx}`));
      });
    });
    return Array.from(map.entries())
      .map(([idx, name]) => ({ idx, name }))
      .sort((a,b) => a.idx - b.idx);
  }

  function getYearVal(yearObj, key){
    const v = yearObj ? yearObj[key] : 0;
    return Number.isFinite(Number(v)) ? Number(v) : 0;
  }

  function renderTable(rows, years, byYear, { unit = 'kWh', decimals = 1 } = {}){
    const thead = el('thead');
    const tbody = el('tbody');
    if (!thead || !tbody) return;

    let h = '<tr>';
    h += '<th></th>';
    years.forEach(y => { h += `<th>${y}</th>`; });
    h += '</tr>';
    thead.innerHTML = h;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${years.length + 1}" style="text-align:left;color:#9aa4ad;">Keine Daten / keine Zuordnung.</td></tr>`;
      return;
    }

    const fmt = (n) => {
      const x = Number(n);
      if (!Number.isFinite(x)) return (0).toFixed(decimals);
      return x.toFixed(decimals);
    };

    let html = '';
    rows.forEach(r => {
      html += '<tr>';
      html += `<td>${String(r.label || '').replace(/</g,'&lt;')}</td>`;
      years.forEach(y => {
        const yr = byYear[y];
        const raw = (typeof r.get === 'function') ? r.get(yr, y) : (yr ? yr[r.key] : 0);
        const val = Number.isFinite(Number(raw)) ? Number(raw) : 0;
        html += `<td>${fmt(val)}</td>`;
      });
      html += '</tr>';
    });
    tbody.innerHTML = html;

    // Hint for unit
    const u = unit ? String(unit) : '';
    const suffix = u ? ` <span style="opacity:.7">[${u}]</span>` : '';
    // (We put the unit into the hint below, to keep the table clean.)
  }

  function renderGroupedTable(sections, years, byYear){
    const thead = el('thead');
    const tbody = el('tbody');
    if (!thead || !tbody) return;

    let h = '<tr>';
    h += '<th></th>';
    years.forEach(y => { h += `<th>${y}</th>`; });
    h += '</tr>';
    thead.innerHTML = h;

    const colSpan = years.length + 1;
    const esc = (s) => String(s || '').replace(/</g,'&lt;');

    if (!Array.isArray(sections) || sections.length === 0){
      tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:left;color:#9aa4ad;">Keine Daten.</td></tr>`;
      return;
    }

    let html = '';
    sections.forEach((sec, idx) => {
      const title = esc(sec && sec.title);
      const unit = sec && sec.unit ? String(sec.unit) : '';
      const decimals = Number.isFinite(Number(sec && sec.decimals)) ? Number(sec.decimals) : 1;
      const rows = Array.isArray(sec && sec.rows) ? sec.rows : [];

      html += `<tr class="group-row"><td colspan="${colSpan}">${title}${unit ? ` <span class="group-unit">[${esc(unit)}]</span>` : ''}</td></tr>`;

      if (!rows.length){
        html += `<tr class="empty-row"><td colspan="${colSpan}">Keine Daten / keine Zuordnung.</td></tr>`;
      } else {
        rows.forEach(r => {
          html += '<tr class="data-row">';
          html += `<td>${esc(r.label)}</td>`;
          years.forEach(y => {
            const yr = byYear[y];
            const raw = (typeof r.get === 'function') ? r.get(yr, y) : (yr ? yr[r.key] : 0);
            const val = Number.isFinite(Number(raw)) ? Number(raw) : 0;
            const d = (r && r.decimals !== undefined && r.decimals !== null) ? Number(r.decimals) : decimals;
            const dd = Number.isFinite(d) ? d : decimals;
            html += `<td>${val.toFixed(dd)}</td>`;
          });
          html += '</tr>';
        });
      }

      if (idx !== sections.length - 1){
        html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
      }
    });

    tbody.innerHTML = html;
  }

  function renderActiveTab(){
    if (!report) return;
    const years = report.years;
    const byYear = report.byYear;

    const defsP = report.producerDefs;
    const defsC = report.consumerDefs;

    const includeEvRow = !!report.hasEv && !report.consumerHasEvNamed;

    // --- build sections (rows + hints), used for both overview and optional tab filters ---
    const sectionSummary = {
      id: 'summary',
      title: 'Aufsummiert',
      unit: 'kWh',
      decimals: 1,
      rows: [
        { label: 'Erzeugung', key: 'productionKwh' },
        { label: 'Verbrauch', key: 'consumptionKwh' },
        { label: 'Netzbezug', key: 'gridImportKwh' },
        { label: 'Netzeinspeisung', key: 'gridExportKwh' }
      ],
      hint: 'Hinweis: Werte werden bevorzugt aus kWh‑Zählern (Differenz) berechnet. Falls keine kWh‑Zähler gemappt sind, erfolgt die Berechnung über die Integration der Leistung (W).'
    };

    const sectionProducers = {
      id: 'producers',
      title: 'Erzeuger',
      unit: 'kWh',
      decimals: 1,
      rows: defsP.map(d => ({
        label: d.name,
        get: (yr) => {
          const arr = yr && Array.isArray(yr.producers) ? yr.producers : [];
          const it = arr.find(p => Number(p.idx) === Number(d.idx));
          return it ? it.kwh : 0;
        }
      })),
      hint: 'Erzeuger‑Aufschlüsselung basiert auf den im Energiefluss‑Monitor gemappten Erzeuger‑Slots.'
    };

    const consumerRows = defsC.map(d => ({
      label: d.name,
      get: (yr) => {
        const arr = yr && Array.isArray(yr.consumers) ? yr.consumers : [];
        const it = arr.find(c => Number(c.idx) === Number(d.idx));
        return it ? it.kwh : 0;
      }
    }));

    if (includeEvRow) {
      consumerRows.push({ label: 'E‑Mobilität', key: '__ev', get: (yr) => getYearVal(yr, 'evKwh') });
    }

    // Optional: Rest/Unbekannt (wenn Gesamtverbrauch deutlich größer als Summe der Verbraucher + Batterieverluste)
    const restByYear = years.map(y => {
      const yr = byYear[y];
      const sumC = (yr && Array.isArray(yr.consumers)) ? yr.consumers.reduce((s,c)=> s + (Number.isFinite(c.kwh) ? c.kwh : 0), 0) : 0;
      const ev = includeEvRow ? getYearVal(yr, 'evKwh') : 0;
      const loss = getYearVal(yr, 'batteryLossKwh');
      const total = getYearVal(yr, 'consumptionKwh');
      return total - sumC - ev - loss;
    });
    const restMax = Math.max(...restByYear.map(v => Math.abs(v)));
    if (Number.isFinite(restMax) && restMax > 1.0) {
      consumerRows.push({
        label: 'Sonstiges',
        get: (_yr, y) => {
          const idx = years.indexOf(y);
          return idx >= 0 ? restByYear[idx] : 0;
        }
      });
    }

    const sectionConsumers = {
      id: 'consumers',
      title: 'Verbraucher',
      unit: 'kWh',
      decimals: 1,
      rows: consumerRows,
      hint: 'Verbraucher‑Aufschlüsselung basiert auf den im Energiefluss‑Monitor gemappten Verbraucher‑Slots.' + (includeEvRow ? ' E‑Mobilität wird zusätzlich als Gesamtwert aus der EVCS‑Historie angezeigt.' : '')
    };

    const sectionBattery = {
      id: 'battery',
      title: 'Batterien',
      unit: 'kWh',
      decimals: 1,
      rows: [
        { label: 'Batterieladung', key: 'chargeKwh' },
        { label: 'Batterieentladung', key: 'dischargeKwh' },
        { label: 'Batterieeigenverbrauch', key: 'batteryLossKwh' }
      ],
      hint: 'Batterieeigenverbrauch = Batterieladung − Batterieentladung (Verluste).'
    };

    const sectionQuotes = {
      id: 'quotes',
      title: 'Quoten',
      unit: '%',
      decimals: 1,
      rows: [
        { label: 'Eigenverbrauch', key: 'selfConsumptionPct' },
        { label: 'Autarkie', key: 'autarkyPct' }
      ],
      hint: 'Eigenverbrauch = (Erzeugung − Einspeisung) / Erzeugung. Autarkie = (Erzeugung − Einspeisung) / Verbrauch.'
    };

    const sections = [sectionSummary, sectionProducers, sectionConsumers, sectionBattery, sectionQuotes];
    const byId = Object.create(null);
    sections.forEach(s => { byId[s.id] = s; });

    // Default: one-page overview
    if (activeTab === 'all') {
      renderGroupedTable(sections, years, byYear);
      setHint('Übersicht: Alle Bereiche werden auf einer Seite angezeigt. Tipp: Mit den Reitern oben kannst du optional einzelne Bereiche filtern. ' + sectionSummary.hint);
      return;
    }

    const sec = byId[activeTab];
    if (!sec) {
      // Fallback
      activeTab = 'all';
      renderGroupedTable(sections, years, byYear);
      setHint('Übersicht: Alle Bereiche werden auf einer Seite angezeigt. Tipp: Mit den Reitern oben kannst du optional einzelne Bereiche filtern. ' + sectionSummary.hint);
      return;
    }

    renderTable(sec.rows, years, byYear, { unit: sec.unit, decimals: sec.decimals });
    setHint(sec.hint || '');
  }

  function setActiveTab(tab){
    activeTab = tab;
    const btns = Array.from(document.querySelectorAll('.rep-tab'));
    btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderActiveTab();
  }

  function buildCsv(){
    if (!report) return '';
    const years = report.years;
    const byYear = report.byYear;

    const lines = [];

    function addSection(title, rows){
      lines.push(title);
      lines.push(['', ...years].join(';'));
      rows.forEach(r => {
        const row = [r.label];
        years.forEach(y => {
          const yr = byYear[y];
          const raw = (typeof r.get === 'function') ? r.get(yr, y) : (yr ? yr[r.key] : 0);
          const val = Number.isFinite(Number(raw)) ? Number(raw) : 0;
          row.push(val.toFixed(r.decimals ?? 1));
        });
        lines.push(row.join(';'));
      });
      lines.push('');
    }

    // Summary
    addSection('Aufsummiert [kWh]', [
      { label: 'Erzeugung', key: 'productionKwh', decimals: 1 },
      { label: 'Verbrauch', key: 'consumptionKwh', decimals: 1 },
      { label: 'Netzbezug', key: 'gridImportKwh', decimals: 1 },
      { label: 'Netzeinspeisung', key: 'gridExportKwh', decimals: 1 }
    ]);

    // Producers
    const pRows = report.producerDefs.map(d => ({
      label: d.name,
      decimals: 1,
      get: (yr) => {
        const arr = yr && Array.isArray(yr.producers) ? yr.producers : [];
        const it = arr.find(p => Number(p.idx) === Number(d.idx));
        return it ? it.kwh : 0;
      }
    }));
    addSection('Erzeuger [kWh]', pRows);

    // Consumers
    const cRows = report.consumerDefs.map(d => ({
      label: d.name,
      decimals: 1,
      get: (yr) => {
        const arr = yr && Array.isArray(yr.consumers) ? yr.consumers : [];
        const it = arr.find(c => Number(c.idx) === Number(d.idx));
        return it ? it.kwh : 0;
      }
    }));
    if (report.hasEv && !report.consumerHasEvNamed) {
      cRows.push({ label: 'E‑Mobilität', decimals: 1, get: (yr) => getYearVal(yr, 'evKwh') });
    }
    addSection('Verbraucher [kWh]', cRows);

    // Battery
    addSection('Batterien [kWh]', [
      { label: 'Batterieladung', key: 'chargeKwh', decimals: 1 },
      { label: 'Batterieentladung', key: 'dischargeKwh', decimals: 1 },
      { label: 'Batterieeigenverbrauch', key: 'batteryLossKwh', decimals: 1 }
    ]);

    // Quotes
    addSection('Quoten [%]', [
      { label: 'Eigenverbrauch', key: 'selfConsumptionPct', decimals: 1 },
      { label: 'Autarkie', key: 'autarkyPct', decimals: 1 }
    ]);

    return lines.join('\n');
  }

  function downloadCsv(){
    const csv = buildCsv();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexowatt-jahresreport.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_e){} }, 2500);
  }

  async function load(){
    setError('');
    setTableLoading();

    const { years } = getYearsFromQuery();
    const now = new Date();
    const endYear = years[years.length - 1];
    setMeta(`${years[0]} – ${endYear} (Stand: ${toIsoDate(now.getTime())})`);

    // Fetch each year in parallel
    const results = await Promise.all(years.map(y => fetchYear(y)));
    const ok = results.filter(r => r && r.ok);

    if (!ok.length){
      setError('Jahresreport: Daten konnten nicht geladen werden (History API).');
      const tbody = el('tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Keine Daten.</td></tr>';
      return;
    }

    const byYear = {};
    years.forEach(y => { byYear[y] = null; });
    ok.forEach(item => {
      try { byYear[item.year] = computeYearTotals(item); } catch(_e) { byYear[item.year] = null; }
    });

    const producerDefs = collectDefs(years, byYear, 'producers');
    const consumerDefs = collectDefs(years, byYear, 'consumers');

    // EV row: only add if present, and not already represented by a consumer slot name
    const hasEv = years.some(y => {
      const yr = byYear[y];
      const v = yr ? yr.evKwh : 0;
      return Number.isFinite(Number(v)) && Number(v) > 0.01;
    });
    const consumerHasEvNamed = consumerDefs.some(d => {
      const n = String(d.name || '').toLowerCase();
      return n.includes('e-mobil') || n.includes('emobil') || n.includes('evcs') || n.includes('wallbox');
    });

    report = { years, byYear, producerDefs, consumerDefs, hasEv, consumerHasEvNamed };

    renderActiveTab();
  }

  function init(){
    // Tabs
    Array.from(document.querySelectorAll('.rep-tab')).forEach(btn => {
      btn.addEventListener('click', ()=> setActiveTab(btn.dataset.tab));
    });

    // Optional: allow deep-links into a specific section via ?tab=
    // (default stays on the one-page overview)
    (function(){
      const raw = (q('tab') || '').trim().toLowerCase();
      const allowed = new Set(['all','summary','producers','consumers','battery','quotes']);
      setActiveTab(allowed.has(raw) ? raw : 'all');
    })();

    // Reload / Print / CSV
    const reloadBtn = el('reloadBtn');
    const printBtn = el('printBtn');
    const exportBtn = el('exportBtn');
    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', async ()=>{
      await load();
      // give browser time to paint
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
      window.print();
    });
    if (exportBtn) exportBtn.addEventListener('click', downloadCsv);

    // Info
    const infoBtn = el('infoBtn');
    if (infoBtn) infoBtn.addEventListener('click', ()=>{
      const h = el('hint');
      if (!h) return;
      // Toggle via a small inline flag
      const isCollapsed = h.getAttribute('data-collapsed') === '1';
      if (isCollapsed) {
        h.setAttribute('data-collapsed', '0');
        h.style.display = '';
      } else {
        h.setAttribute('data-collapsed', '1');
        h.style.display = 'none';
      }
    });

    // Back button
    const backBtn = el('backBtn');
    if (backBtn) backBtn.addEventListener('click', () => {
      try{
        const ref = document.referrer || '';
        if (ref && ref.indexOf(window.location.origin) === 0 && window.history.length > 1){
          window.history.back();
          return;
        }
      }catch(_e){}
      window.location.href = '/history';
    });

    // Default meta from query
    const { years } = getYearsFromQuery();
    if (years && years.length){
      const now = new Date();
      setMeta(`${years[0]} – ${years[years.length-1]} (Stand: ${toIsoDate(now.getTime())})`);
    }

    // initial load
    load();

    // Live indicator (Status-Dot) via SSE
    (function(){
      const liveDot = document.getElementById('liveDot');
      if (!liveDot || typeof window.EventSource === 'undefined') return;
      try{
        const es = new EventSource('/events');
        es.onopen = () => { try{ liveDot.classList.add('live'); }catch(_e){} };
        es.onerror = () => { try{ liveDot.classList.remove('live'); }catch(_e){} };
      }catch(_e){}
    })();

    // ------------------------------
    // Header interactions (same behavior as other pages)
    // ------------------------------
    (function setupTopbar(){
      const menuBtn = document.getElementById('menuBtn');
      const menuDropdown = document.getElementById('menuDropdown');
      if (menuBtn && menuDropdown){
        const close = () => menuDropdown.classList.add('hidden');
        const toggle = () => menuDropdown.classList.toggle('hidden');
        menuBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
        menuDropdown.addEventListener('click', (e) => e.stopPropagation());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
        document.addEventListener('click', () => close());
      }
    })();

    // EVCS / SmartHome / Speicherfarm visibility (same logic as History)
    (function(){
      fetch('/config').then(r=>r.json()).then(cfg=>{
        const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
        const l = document.getElementById('menuEvcsLink');
        if (l) l.classList.toggle('hidden', c < 2);
        const t = document.getElementById('tabEvcs');
        if (t) t.classList.toggle('hidden', c < 2);

        const sh = !!(cfg.smartHome && cfg.smartHome.enabled);
        const sl = document.getElementById('menuSmartHomeLink');
        if (sl) sl.classList.toggle('hidden', !sh);
        const st = document.getElementById('tabSmartHome');
        if (st) st.classList.toggle('hidden', !sh);

        const sf = !!(cfg.ems && cfg.ems.storageFarmEnabled);
        const sft = document.getElementById('tabStorageFarm');
        if (sft) sft.classList.toggle('hidden', !sf);
        const sfl = document.getElementById('menuStorageFarmLink');
        if (sfl) sfl.classList.toggle('hidden', !sf);
      }).catch(()=>{});
    })();
  }

  init();
})();
