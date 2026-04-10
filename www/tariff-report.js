(function(){
  const C = window.NWReportCommon;
  if (!C) return;

  const state = { data: null };
  const INTERVAL_MINUTES = 15;

  function defaultFromMs(){
    const q = C.getQuery('from');
    if (q) return C.parseInputValue(q, Date.now() - 24 * 3600 * 1000);
    return Date.now() - 24 * 3600 * 1000;
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
    if (meta && meta.dynamicTariff) items.push('dynamischer Tarif aktiv');
    if (meta && meta.netFeeEnabled) items.push('variables Netzentgelt aktiv');
    if (meta && meta.historyInstance) items.push('Historie ' + meta.historyInstance);
    items.push(INTERVAL_MINUTES + '-Minuten-Raster');
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
      ['Preis min', C.fmtPrice(summary && summary.minPrice)],
      ['Preis max', C.fmtPrice(summary && summary.maxPrice)],
      ['Ø Preis', C.fmtPrice(summary && summary.avgPrice)],
      ['Bezug', C.fmtKwh(summary && summary.importKwh)],
      ['Basis-Kosten', C.fmtMoney(summary && summary.baseCost)],
      ['Netzentgelt', C.fmtMoney(summary && summary.netFeeCost)],
      ['Gesamtkosten', C.fmtMoney(summary && summary.totalCost)],
      ['Intervalle', C.fmtNum(summary && summary.intervals, 0)],
    ];
    if (meta && meta.retentionTargetDays) {
      items.push(['Retention-Ziel', C.fmtNum(meta.retentionTargetDays, 0) + ' Tage']);
    }
    items.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'report-card';
      card.innerHTML = `<small>${C.escapeHtml(label)}</small><b>${C.escapeHtml(value)}</b>`;
      grid.appendChild(card);
    });
  }

  function renderTable(intervals){
    const tbody = C.el('tbody');
    const empty = C.el('emptyState');
    if (!tbody) return;
    tbody.innerHTML = '';
    const rows = Array.isArray(intervals) ? intervals : [];
    if (empty) empty.classList.toggle('hidden', rows.length > 0);
    if (!rows.length) return;

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td class="report-mono">${C.escapeHtml(C.fmtDateTime(row.startTs))}</td>`,
        `<td class="report-mono">${C.escapeHtml(C.fmtDateTime(row.endTs))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPrice(row.baseEurPerKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPrice(row.netFeeEurPerKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPrice(row.totalEurPerKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtKwh(row.importKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtMoney(row.baseCostEur))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtMoney(row.netFeeCostEur))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtMoney(row.totalCostEur))}</td>`
      ].join('');
      tbody.appendChild(tr);
    });
  }

  function renderMeta(meta){
    const rangeMeta = C.el('rangeMeta');
    const note = C.el('reportNote');
    if (rangeMeta && meta) {
      const parts = [
        `${C.fmtDateTime(meta.start)} – ${C.fmtDateTime(meta.end)}`,
        `${INTERVAL_MINUTES}-Minuten-Intervalle`,
      ];
      if (meta.historyInstance) parts.push(`Historie ${meta.historyInstance}`);
      rangeMeta.textContent = parts.join(' · ');
    }
    if (note) {
      note.textContent = 'Der Bericht nutzt 15-Minuten-Intervalle mit Datum/Uhrzeit. Kosten = Gesamtpreis × Netzbezug je Intervall und dienen als Nachweis zur Gegenprüfung der Stromanbieter-Abrechnung.';
    }
    renderFlags(meta);
  }

  async function load(){
    const { fromMs, toMs } = getRange();
    C.setUrlParams({ from: fromMs, to: toMs });
    const tbody = C.el('tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="report-empty">Lade Nachweisdaten…</td></tr>';

    const url = `/api/tariff/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
    const res = await fetch(url).then((r) => r.json()).catch(() => null);
    if (!res || !res.ok) {
      state.data = null;
      renderMeta(null);
      renderSummary(null, null);
      if (tbody) tbody.innerHTML = '';
      const empty = C.el('emptyState');
      if (empty) {
        empty.textContent = 'Tarif-/Netzentgelt-Nachweis konnte nicht geladen werden.';
        empty.classList.remove('hidden');
      }
      return false;
    }

    state.data = res;
    renderMeta(res.meta || {});
    renderSummary(res.summary || {}, res.meta || {});
    renderTable(res.intervals || []);
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
    const rows = Array.isArray(state.data && state.data.intervals) ? state.data.intervals : [];
    if (!rows.length) return;
    const lines = [
      ['Start', 'Ende', 'Basispreis_EUR_pro_kWh', 'Netzentgelt_EUR_pro_kWh', 'Gesamtpreis_EUR_pro_kWh', 'Bezug_kWh', 'Basis_Kosten_EUR', 'Netzentgelt_Kosten_EUR', 'Gesamtkosten_EUR'].join(';')
    ];
    rows.forEach((row) => {
      lines.push([
        C.fmtDateTime(row.startTs),
        C.fmtDateTime(row.endTs),
        Number(row.baseEurPerKwh || 0).toFixed(4).replace('.', ','),
        Number(row.netFeeEurPerKwh || 0).toFixed(4).replace('.', ','),
        Number(row.totalEurPerKwh || 0).toFixed(4).replace('.', ','),
        Number(row.importKwh || 0).toFixed(4).replace('.', ','),
        Number(row.baseCostEur || 0).toFixed(4).replace('.', ','),
        Number(row.netFeeCostEur || 0).toFixed(4).replace('.', ','),
        Number(row.totalCostEur || 0).toFixed(4).replace('.', ','),
      ].join(';'));
    });
    const start = state.data && state.data.meta ? new Date(state.data.meta.start) : new Date();
    const file = `nexowatt-tarif-nachweis-${start.getFullYear()}${String(start.getMonth()+1).padStart(2,'0')}${String(start.getDate()).padStart(2,'0')}.csv`;
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
      window.location.href = '/history';
    });

    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
