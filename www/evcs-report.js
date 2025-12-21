(function(){
  function el(id){ return document.getElementById(id); }

  function q(name){
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function fmtDate(iso){ return iso || ''; }

  // Numeric formatting for UI + PDF (German locale, fixed decimals, tabular numbers in CSS).
  const _nfCache = new Map();
  function _getNf(d){
    const key = String(d);
    let nf = _nfCache.get(key);
    if (!nf){
      nf = new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
      _nfCache.set(key, nf);
    }
    return nf;
  }
  function fmtNum(n, d, { emptyZero = true } = {}){
    if (n === null || n === undefined || n === '') {
      return emptyZero ? _getNf(d).format(0) : '';
    }
    const x = Number(n);
    if (!isFinite(x)) return emptyZero ? _getNf(d).format(0) : '';
    return _getNf(d).format(x);
  }
function toISODate(ms){
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd= String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }

  async function load(){
    const rangeMeta = el('rangeMeta');
    const errEl = el('err');
    const thead = el('thead');
    const tbody = el('tbody');
    const tfoot = el('tfoot');

    if (rangeMeta){
      const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
      const toMs   = Number(q('to')   || Date.now());
      rangeMeta.textContent = `${toISODate(fromMs)} – ${toISODate(toMs)}`;
    }

    if (!thead || !tbody){
      if (errEl) errEl.textContent = 'EVCS Bericht: Tabelle konnte nicht initialisiert werden (thead/tbody fehlt).';
      return false;
    }

    if (errEl) errEl.textContent = '';
    thead.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Lade Daten…</td></tr>';

    try{
      const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
      const toMs   = Number(q('to')   || Date.now());

      const url = `/api/evcs/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
      const res = await fetch(url).then(r => r.json()).catch(() => null);

      if (!res || !res.ok){
        tbody.innerHTML = '';
        if (errEl) errEl.textContent = 'Bericht konnte nicht geladen werden.';
        return false;
      }

      const wbs = Array.isArray(res.wallboxes) ? res.wallboxes : [];
      const days = Array.isArray(res.days) ? res.days : [];

      // Stable sorting: wallboxes by index, days by date (ascending)
      wbs.sort((a,b) => (Number(a?.index) || 0) - (Number(b?.index) || 0));
      days.sort((a,b) => String(a?.date || '').localeCompare(String(b?.date || '')));

      // Null handling: ensure totals are present (fallback = sum of wallboxes kWh)
      days.forEach(d => {
        const total = Number(d && d.totalKwh);
        if (!isFinite(total)){
          let s = 0;
          if (d && d.wallboxes){
            wbs.forEach(wb => {
              const idx = String(wb.index);
              const cell = (d.wallboxes[idx] || d.wallboxes[wb.index]) || {};
              const v = Number(cell && cell.kwh);
              if (isFinite(v)) s += v;
            });
          }
          d.totalKwh = s;
        }
      });

      // Period totals (sum kWh + peak max kW per wallbox)
      const periodTotals = { totalKwh: 0, wallboxes: {} };
      wbs.forEach(wb => {
        periodTotals.wallboxes[String(wb.index)] = { kwh: 0, maxKw: 0 };
      });
      days.forEach(d => {
        const dayTotal = Number(d && d.totalKwh);
        if (isFinite(dayTotal)) periodTotals.totalKwh += dayTotal;
        wbs.forEach(wb => {
          const idx = String(wb.index);
          const cell = (d && d.wallboxes && (d.wallboxes[idx] || d.wallboxes[wb.index])) || {};
          const kwh = Number(cell && cell.kwh);
          if (isFinite(kwh)) periodTotals.wallboxes[idx].kwh += kwh;
          const mx = Number(cell && cell.maxKw);
          if (isFinite(mx)) periodTotals.wallboxes[idx].maxKw = Math.max(periodTotals.wallboxes[idx].maxKw || 0, mx);
        });
      });

      // Header: Date + Total + per wallbox (kWh / max kW)
      let h = '<tr>';
      h += '<th>Datum</th>';
      h += '<th>Summe kWh</th>';
      wbs.forEach(wb => {
        const name = (wb && (wb.name || `Wallbox ${wb.index}`) || 'Wallbox').replace(/</g,'&lt;');
        h += `<th>${name}<div class="subhead">kWh</div></th>`;
        h += `<th>${name}<div class="subhead">max kW</div></th>`;
      });
      h += '</tr>';
      thead.innerHTML = h;

      // Rows (set innerHTML once to avoid any insertAdjacentHTML quirks)
      if (days.length === 0){
        if (tfoot) tfoot.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Keine Daten im Zeitraum.</td></tr>';
        return true;
      }

      let rowsHtml = '';
      days.forEach(d => {
        rowsHtml += '<tr>';
        rowsHtml += `<td>${fmtDate(d && d.date)}</td>`;
        rowsHtml += `<td>${fmtNum(d && d.totalKwh, 2)}</td>`;
        wbs.forEach(wb => {
          const idx = String(wb.index);
          const cell = (d && d.wallboxes && (d.wallboxes[idx] || d.wallboxes[wb.index])) || {};
          rowsHtml += `<td>${fmtNum(cell && cell.kwh, 2)}</td>`;
          rowsHtml += `<td>${fmtNum(cell && cell.maxKw, 2)}</td>`;
        });
        rowsHtml += '</tr>';
      });
      tbody.innerHTML = rowsHtml;

      // Footer (period sum row)
      if (tfoot){
        let f = '<tr class="total-row">';
        f += '<th>Summe Zeitraum</th>';
        f += `<th>${fmtNum(periodTotals.totalKwh, 2)}</th>`;
        wbs.forEach(wb => {
          const idx = String(wb.index);
          const t = periodTotals.wallboxes[idx] || { kwh: 0, maxKw: 0 };
          f += `<td>${fmtNum(t.kwh, 2)}</td>`;
          f += `<td>${fmtNum(t.maxKw, 2)}</td>`;
        });
        f += '</tr>';
        tfoot.innerHTML = f;
      }

      return true;
    }catch(e){
      tbody.innerHTML = '';
      if (errEl) errEl.textContent = 'EVCS Bericht: Unerwarteter Fehler beim Rendern.';
      try{ console.error(e); }catch(_){}
      return false;
    }
  }

  async function loadAndPrint(){
    // Ensure data is fully loaded BEFORE opening the print dialog.
    const ok = await load();
    if(!ok) return;

    // Give the browser a moment to paint the updated table before snapshotting for print.
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 80));

    window.print();
  }


  function downloadCsv(){
    const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
    const toMs   = Number(q('to')   || Date.now());
    const url = `/api/evcs/report.csv?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;

    // Trigger a download without navigating away from the report page.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadSessionsCsv(){
    const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
    const toMs   = Number(q('to')   || Date.now());
    const url = `/api/evcs/sessions.csv?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }


  function init(){
    const reloadBtn = el('reloadBtn');
    const printBtn = el('printBtn');
    const csvBtn = el('csvBtn');
    const csvSessionsBtn = el('csvSessionsBtn');

    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', loadAndPrint);
    if (csvBtn) csvBtn.addEventListener('click', downloadCsv);
    if (csvSessionsBtn) csvSessionsBtn.addEventListener('click', downloadSessionsCsv);

    load();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();