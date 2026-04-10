(function(){
  const C = window.NWReportCommon;
  if (!C) return;

  const state = { data: null };

  function defaultFromMs(){
    const q = C.getQuery('from');
    if (q) return C.parseInputValue(q, Date.now() - 30 * 24 * 3600 * 1000);
    return Date.now() - 30 * 24 * 3600 * 1000;
  }

  function defaultToMs(){
    const q = C.getQuery('to');
    if (q) return C.parseInputValue(q, Date.now());
    return Date.now();
  }

  function fillInputs(){
    const fromInput = C.el('fromInput');
    const toInput = C.el('toInput');
    if (fromInput) fromInput.value = C.toInputValue(defaultFromMs());
    if (toInput) toInput.value = C.toInputValue(defaultToMs());
  }

  function getRange(){
    const fromInput = C.el('fromInput');
    const toInput = C.el('toInput');
    const fromMs = C.parseInputValue(fromInput && fromInput.value, defaultFromMs());
    const toMs = C.parseInputValue(toInput && toInput.value, defaultToMs());
    return {
      fromMs,
      toMs: Math.max(fromMs + 60000, toMs),
    };
  }

  function renderFlags(meta){
    const wrap = C.el('reportFlags');
    if (!wrap) return;
    wrap.innerHTML = '';
    const items = [];
    items.push('Ereignisnachweis mit exakten Zeitstempeln');
    if (meta && meta.historyInstance) items.push('Historie ' + meta.historyInstance);
    if (meta && meta.retentionTargetDays) items.push('Retention-Ziel ' + C.fmtNum(meta.retentionTargetDays, 0) + ' Tage');
    if (meta && meta.historyReady) items.push('Historie aktiv');
    items.forEach((txt) => {
      const el = document.createElement('span');
      el.className = 'report-pill';
      el.textContent = txt;
      wrap.appendChild(el);
    });
  }

  function renderSummary(summary, meta){
    const grid = C.el('summaryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const items = [
      ['Ereignisse', C.fmtNum(summary && summary.totalEvents, 0)],
      ['Aktivierungen', C.fmtNum(summary && summary.activations, 0)],
      ['Updates', C.fmtNum(summary && summary.updates, 0)],
      ['Freigaben', C.fmtNum(summary && summary.releases, 0)],
      ['Schreibfehler', C.fmtNum(summary && summary.writeFailedEvents, 0)],
      ['Erster Eintrag', summary && summary.firstTs ? C.fmtDateTime(summary.firstTs) : '—'],
      ['Letzter Eintrag', summary && summary.lastTs ? C.fmtDateTime(summary.lastTs) : '—'],
      ['Historie', meta && meta.historyInstance ? meta.historyInstance : '—'],
    ];
    items.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'report-card';
      card.innerHTML = `<small>${C.escapeHtml(label)}</small><b>${C.escapeHtml(value)}</b>`;
      grid.appendChild(card);
    });
  }

  function renderMeta(meta){
    const rangeMeta = C.el('rangeMeta');
    const note = C.el('reportNote');
    if (rangeMeta && meta) {
      const parts = [
        `${C.fmtDateTime(meta.start)} – ${C.fmtDateTime(meta.end)}`,
        '§14a Ereignisnachweis',
      ];
      if (meta.historyInstance) parts.push(`Historie ${meta.historyInstance}`);
      rangeMeta.textContent = parts.join(' · ');
    }
    if (note) {
      note.textContent = 'Der Ausdruck basiert auf den historisierten §14a-Ereignissnapshots. Für jeden Schaltvorgang werden Datum, Uhrzeit, Quelle, Modus, Budget, EVCS-Limit, EV-/Netzleistung und Ergebnis ausgegeben. Die 730-Tage-Aufbewahrung muss in der gemeinsamen Historie/Influx sichergestellt sein.';
    }
    renderFlags(meta || {});
  }

  function renderTable(events){
    const tbody = C.el('tbody');
    const empty = C.el('emptyState');
    if (!tbody) return;
    tbody.innerHTML = '';
    const rows = Array.isArray(events) ? events : [];
    if (empty) empty.classList.toggle('hidden', rows.length > 0);
    if (!rows.length) return;

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td class="report-mono">${C.escapeHtml(C.fmtDateTime(row.ts))}</td>`,
        `<td>${C.escapeHtml(row.eventType || '—')}</td>`,
        `<td>${C.escapeHtml(row.result || '—')}</td>`,
        `<td>${C.escapeHtml(row.source || '—')}</td>`,
        `<td>${C.escapeHtml(row.mode || '—')}</td>`,
        `<td class="report-mono">${C.escapeHtml(row.sessionId || '—')}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.requestedTotalBudgetW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.effectiveEvcsCapW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.pMinW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.evPowerW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.gridPowerW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerAppliedCount, 0))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerFailedCount, 0))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerSkippedCount, 0))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerWriteFailedCount, 0))}</td>`,
        `<td class="wrap">${C.escapeHtml(row.reason || '—')}</td>`
      ].join('');
      tbody.appendChild(tr);
    });
  }

  async function load(){
    const { fromMs, toMs } = getRange();
    C.setUrlParams({ from: fromMs, to: toMs });
    const tbody = C.el('tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="16" class="report-empty">Lade §14a Nachweisdaten…</td></tr>';

    const url = `/api/para14a/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
    const res = await fetch(url).then((r) => r.json()).catch(() => null);
    if (!res || !res.ok) {
      state.data = null;
      renderMeta(null);
      renderSummary(null, null);
      if (tbody) tbody.innerHTML = '';
      const empty = C.el('emptyState');
      if (empty) {
        empty.textContent = '§14a Nachweis konnte nicht geladen werden.';
        empty.classList.remove('hidden');
      }
      return false;
    }

    state.data = res;
    renderMeta(res.meta || {});
    renderSummary(res.summary || {}, res.meta || {});
    renderTable(res.events || []);
    return true;
  }

  async function loadAndPrint(){
    const ok = await load();
    if (!ok) return;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 80));
    window.print();
  }

  function exportCsv(){
    const rows = Array.isArray(state.data && state.data.events) ? state.data.events : [];
    if (!rows.length) return;
    const lines = [
      ['Zeitstempel', 'Ereignis', 'Ergebnis', 'Quelle', 'Modus', 'Sitzung', 'Budget_W', 'EVCS_Limit_W', 'Pmin14a_W', 'EV_Leistung_W', 'Netzleistung_W', 'Applied', 'Failed', 'Skipped', 'WriteFailed', 'Grund'].join(';')
    ];
    rows.forEach((row) => {
      lines.push([
        C.fmtDateTime(row.ts),
        row.eventType || '',
        row.result || '',
        row.source || '',
        row.mode || '',
        row.sessionId || '',
        Number(row.requestedTotalBudgetW || 0).toFixed(0),
        Number(row.effectiveEvcsCapW || 0).toFixed(0),
        Number(row.pMinW || 0).toFixed(0),
        Number(row.evPowerW || 0).toFixed(0),
        Number(row.gridPowerW || 0).toFixed(0),
        Number(row.consumerAppliedCount || 0).toFixed(0),
        Number(row.consumerFailedCount || 0).toFixed(0),
        Number(row.consumerSkippedCount || 0).toFixed(0),
        Number(row.consumerWriteFailedCount || 0).toFixed(0),
        String(row.reason || '').replace(/;/g, ','),
      ].join(';'));
    });
    const start = state.data && state.data.meta ? new Date(state.data.meta.start) : new Date();
    const file = `nexowatt-para14a-nachweis-${start.getFullYear()}${String(start.getMonth()+1).padStart(2,'0')}${String(start.getDate()).padStart(2,'0')}.csv`;
    C.downloadText(file, lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function init(){
    fillInputs();
    C.setupTopbar('history');

    const reloadBtn = C.el('reloadBtn');
    const printBtn = C.el('printBtn');
    const exportBtn = C.el('exportBtn');
    const backBtn = C.el('backBtn');
    const fromInput = C.el('fromInput');
    const toInput = C.el('toInput');

    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', loadAndPrint);
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);
    if (fromInput) fromInput.addEventListener('change', load);
    if (toInput) toInput.addEventListener('change', load);
    if (backBtn) backBtn.addEventListener('click', () => {
      try {
        const ref = document.referrer || '';
        if (ref && ref.indexOf(window.location.origin) === 0 && window.history.length > 1) {
          window.history.back();
          return;
        }
      } catch (_e) {}
      window.location.href = '/settings';
    });

    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
