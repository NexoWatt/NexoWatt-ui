/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/energy-ledger.ts
 * Quell-Hash: sha256:3b5d6c066f475cf2d753bc2036bc9a7a6e4923694e43df4dc2e1242f432c66e9
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/energy-ledger.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: www/energy-ledger.js
 *
 * Zweck:
 * EOS-Betreiberansicht für das Local kWh Ledger. Die Seite liest ausschließlich
 * die bestehende `/api/ledger/local-kwh` API und rechnet keine eigenen Ledgerwerte.
 * Dadurch bleiben CSV, Anzeige und EMS-Statebaum auf einer gemeinsamen Wahrheit.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fmtKwh = (v) => Number.isFinite(Number(v)) ? Number(v).toFixed(2) + ' kWh' : '--';
  const fmtEur = (v) => Number.isFinite(Number(v)) ? Number(v).toFixed(2) + ' €' : '--';
  const fmtTs = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return '--';
    try { return new Date(n).toLocaleString(); } catch (_e) { return String(n); }
  };
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function period(summary, key) { return summary && summary[key] && typeof summary[key] === 'object' ? summary[key] : {}; }
  function renderSources(payload) {
    const s = payload && payload.sourceSummary && Array.isArray(payload.sourceSummary.bySource) ? payload.sourceSummary.bySource : [];
    setText('ledgerSources', s.length ? s.map(row => `${row.label || row.source}: ${fmtKwh(row.kwh)}`).join(' · ') : 'Noch keine Quellenzuordnung vorhanden.');
  }
  function renderWalletBridge(payload) {
    const bridge = payload && payload.walletBridge ? payload.walletBridge : {};
    const today = bridge.today || {};
    const txt = bridge.status === 'ready' || Object.keys(today).length
      ? `Bridge aktiv: ${fmtKwh(today.totalKwh || today.ledgerEvcsKwh || 0)} / ${fmtEur(today.valueEur || today.ledgerValueEur || 0)} als Referenz für Energy Wallet.`
      : 'Bridge vorbereitet. Ledgerwerte werden nicht doppelt ins Energie-Wertkonto gezählt.';
    setText('walletBridge', txt);
  }
  function renderEntries(entries) {
    const body = $('ledgerRows');
    if (!body) return;
    const list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="9" class="muted">Noch keine Ledger-Einträge.</td></tr>';
      return;
    }
    body.innerHTML = list.slice(0, 120).map(e => `<tr>` +
      `<td>${fmtTs(e.endTs || e.startTs)}</td>` +
      `<td>${esc(e.stationName || e.stationId || '')}</td>` +
      `<td>${esc(e.lp || '')}</td>` +
      `<td>${esc(e.sessionId || '')}</td>` +
      `<td>${esc(e.sourceLabel || (e.kwhSourceMix && e.kwhSourceMix.label) || '')}</td>` +
      `<td>${fmtKwh(e.totalKwh || e.energyKwh || 0)}</td>` +
      `<td>${fmtKwh(e.solarKwh || e.localKwh || 0)}</td>` +
      `<td>${fmtKwh(e.gridKwh || 0)}</td>` +
      `<td>${fmtEur(e.valueEur || 0)}</td>` +
    `</tr>`).join('');
  }
  async function load() {
    setText('ledgerStatus', 'lade…');
    try {
      const res = await fetch('/api/ledger/local-kwh?period=all', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error((payload && payload.message) || 'Ledger API nicht verfügbar');
      const summary = payload.summary || {};
      const today = period(summary, 'today');
      const month = period(summary, 'month');
      const year = period(summary, 'year');
      setText('ledgerStatus', `${payload.schema || 'Ledger'} · ${summary.recentCount || 0} Einträge`);
      setText('todayKwh', fmtKwh(today.totalKwh || today.dcSessionKwh || 0));
      setText('todayLocal', fmtKwh(today.localKwh || today.solarKwh || 0));
      setText('todayGrid', fmtKwh(today.gridKwh || 0));
      setText('todayValue', fmtEur(today.valueEur || 0));
      setText('monthKwh', fmtKwh(month.totalKwh || month.dcSessionKwh || 0));
      setText('monthValue', fmtEur(month.valueEur || 0));
      setText('yearKwh', fmtKwh(year.totalKwh || year.dcSessionKwh || 0));
      setText('yearValue', fmtEur(year.valueEur || 0));
      renderSources(payload);
      renderWalletBridge(payload);
      renderEntries(payload.entries || []);
    } catch (e) {
      setText('ledgerStatus', 'Fehler');
      const body = $('ledgerRows');
      if (body) body.innerHTML = `<tr><td colspan="9" class="warn">${esc(e && e.message ? e.message : e)}</td></tr>`;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('refreshLedger');
    if (btn) btn.addEventListener('click', load);
    load();
    window.setInterval(load, 30000);
  });
})();
