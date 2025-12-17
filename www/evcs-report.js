(function(){
  function q(name){
    const u = new URL(window.location.href);
    const v = u.searchParams.get(name);
    return v;
  }
  function fmtDate(iso){ return iso; }
  function fmtNum(n, d){
    const x = Number(n);
    if (!isFinite(x)) return '';
    return x.toFixed(d);
  }

  const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
  const toMs   = Number(q('to')   || Date.now());

  const rangeMeta = document.getElementById('rangeMeta');
  const errEl = document.getElementById('err');
  const thead = document.getElementById('thead');
  const tbody = document.getElementById('tbody');

  function toISODate(ms){
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd= String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }

  function setMeta(){
    rangeMeta.textContent = `${toISODate(fromMs)} – ${toISODate(toMs)}`;
  }

  async function load(){
    errEl.textContent = '';
    tbody.innerHTML = '';
    thead.innerHTML = '';
    setMeta();

    const url = `/api/evcs/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>null);
    if(!res || !res.ok){
      errEl.textContent = 'Bericht konnte nicht geladen werden.';
      return;
    }

    const wbs = Array.isArray(res.wallboxes) ? res.wallboxes : [];
    const days = Array.isArray(res.days) ? res.days : [];

    // Header: Date + Total + per wallbox (kWh / max kW)
    let h = '<tr>';
    h += '<th>Datum</th>';
    h += '<th>Summe kWh</th>';
    wbs.forEach(wb=>{
      const name = (wb.name || `Wallbox ${wb.index}`).replace(/</g,'&lt;');
      h += `<th>${name}<div class="subhead">kWh</div></th>`;
      h += `<th>${name}<div class="subhead">max kW</div></th>`;
    });
    h += '</tr>';
    thead.innerHTML = h;

    // Rows
    days.forEach(d=>{
      let r = '<tr>';
      r += `<td>${fmtDate(d.date)}</td>`;
      r += `<td>${fmtNum(d.totalKwh, 2)}</td>`;
      wbs.forEach(wb=>{
        const idx = String(wb.index);
        const cell = (d.wallboxes && (d.wallboxes[idx] || d.wallboxes[wb.index])) || {};
        r += `<td>${fmtNum(cell.kwh, 2)}</td>`;
        r += `<td>${fmtNum(cell.maxKw, 2)}</td>`;
      });
      r += '</tr>';
      tbody.insertAdjacentHTML('beforeend', r);
    });

    if(days.length === 0){
      tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Keine Daten im Zeitraum.</td></tr>';
    }
  }

  document.getElementById('printBtn').addEventListener('click', ()=>window.print());
  document.getElementById('reloadBtn').addEventListener('click', load);

  load();
})();