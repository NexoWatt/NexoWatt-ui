(function(){
  function el(id){ return document.getElementById(id); }

  function q(name){
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function fmtDate(iso){ return iso || ''; }

  function fmtNum(n, d){
    const x = Number(n);
    if (!isFinite(x)) return '';
    return x.toFixed(d);
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

  function init(){
    const reloadBtn = el('reloadBtn');
    const printBtn = el('printBtn');

    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', loadAndPrint);

    load();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();