/* NexoWatt – RFID/Ladekarten Abrechnung (Print/PDF view) */
(function () {
  'use strict';

  const qs = new URLSearchParams(window.location.search || '');
  const rfid = String(qs.get('rfid') || '').trim();
  const from = String(qs.get('from') || '').trim();
  const to = String(qs.get('to') || '').trim();

  const elMeta = document.getElementById('metaText');
  const elMetaPrint = document.getElementById('metaTextPrint');
  const tbody = document.querySelector('#reportTable tbody');

  const elSumSessions = document.getElementById('sumSessions');
  const elSumKwh = document.getElementById('sumKwh');
  const elSumPeakKw = document.getElementById('sumPeakKw');

  const btnReload = document.getElementById('reloadBtn');
  const btnCsv = document.getElementById('csvBtn');
  const btnCsvSessions = document.getElementById('csvSessionsBtn');
  const btnPrint = document.getElementById('printBtn');

  const nfKwh = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const nfKw = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfInt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

  function fmtDateRange(fromMs, toMs) {
    const f = Number(fromMs);
    const t = Number(toMs);
    const df = Number.isFinite(f) ? new Date(f) : null;
    const dt = Number.isFinite(t) ? new Date(t) : null;
    const sF = df ? df.toLocaleDateString('de-DE') : '--';
    const sT = dt ? dt.toLocaleDateString('de-DE') : '--';
    return sF + ' – ' + sT;
  }

  function setMeta(text) {
    if (elMeta) elMeta.textContent = text || '';
    if (elMetaPrint) elMetaPrint.textContent = text || '';
  }

  function setError(msg) {
    setMeta(msg || 'Fehler');
    if (tbody) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = msg || 'Fehler';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  function render(report) {
    if (!report || !tbody) return;

    const name = String(report.name || '').trim();
    const r = String(report.rfid || rfid || '').trim();
    const rangeText = fmtDateRange(report.start, report.end);

    const cardText = (r && r !== 'ALL')
      ? ('Karte: ' + (name ? (name + ' (' + r + ')') : r))
      : 'Alle Karten';

    setMeta(cardText + ' | Zeitraum: ' + rangeText);

    tbody.innerHTML = '';

    const days = Array.isArray(report.days) ? report.days : [];
    for (const d of days) {
      const tr = document.createElement('tr');

      const tdDate = document.createElement('td');
      tdDate.textContent = String(d.date || '');
      tr.appendChild(tdDate);

      const tdSess = document.createElement('td');
      tdSess.style.textAlign = 'right';
      tdSess.textContent = nfInt.format(Number(d.sessions) || 0);
      tr.appendChild(tdSess);

      const tdKwh = document.createElement('td');
      tdKwh.style.textAlign = 'right';
      tdKwh.textContent = nfKwh.format(Number(d.kwh) || 0);
      tr.appendChild(tdKwh);

      const tdMax = document.createElement('td');
      tdMax.style.textAlign = 'right';
      tdMax.textContent = nfKw.format(Number(d.maxKw) || 0);
      tr.appendChild(tdMax);

      tbody.appendChild(tr);
    }

    if (elSumSessions) elSumSessions.textContent = nfInt.format(Number(report.totalSessions) || 0);
    if (elSumKwh) elSumKwh.textContent = nfKwh.format(Number(report.totalKwh) || 0);
    if (elSumPeakKw) elSumPeakKw.textContent = nfKw.format(Number(report.peakKw) || 0);
  }

  async function load() {
    if (!rfid) {
      setError('RFID fehlt. Bitte Bericht über die Einstellungen öffnen.');
      return;
    }

    const url = '/api/evcs/rfid/report?rfid=' + encodeURIComponent(rfid)
      + (from ? ('&from=' + encodeURIComponent(from)) : '')
      + (to ? ('&to=' + encodeURIComponent(to)) : '');

    try {
      setMeta('Lade Daten…');
      const r = await fetch(url, { cache: 'no-store' });
      const j = await r.json();
      if (!j || j.ok !== true) {
        setError('Fehler beim Laden des Reports.');
        return;
      }
      render(j);
    } catch (e) {
      setError('Fehler beim Laden des Reports.');
    }
  }

  function openCsv() {
    if (!rfid) return;
    const url = '/api/evcs/rfid/report.csv?rfid=' + encodeURIComponent(rfid)
      + (from ? ('&from=' + encodeURIComponent(from)) : '')
      + (to ? ('&to=' + encodeURIComponent(to)) : '');
    window.open(url, '_blank');
  }

  function openCsvSessions() {
    if (!rfid) return;
    const url = '/api/evcs/sessions.csv?rfid=' + encodeURIComponent(rfid)
      + (from ? ('&from=' + encodeURIComponent(from)) : '')
      + (to ? ('&to=' + encodeURIComponent(to)) : '');
    window.open(url, '_blank');
  }

  if (btnReload) btnReload.addEventListener('click', load);
  if (btnCsv) btnCsv.addEventListener('click', openCsv);
  if (btnCsvSessions) btnCsvSessions.addEventListener('click', openCsvSessions);
  if (btnPrint) btnPrint.addEventListener('click', () => window.print());

  // Auto-load
  load();
})();
