// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/mesh-microgrid.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * www/mesh-microgrid.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: e159c5d147071fa2b6564494272c4c11a26d80a46bbe5f3ed52142455940a74e
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/mesh-microgrid.ts
 * Quell-Hash: sha256:f6bb9707e4ad4cb440e67892a0129cec406138836104779700ba786618e0a8be
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/mesh-microgrid.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: www/mesh-microgrid.js
 *
 * Zweck:
 * EOS-Betreiberansicht für die separate Mesh/Microgrid-App. Die Seite liest nur
 * die Snapshot-API `/api/mesh/microgrid` und zeigt Cluster-/Knotenwerte. Sie
 * erzeugt keine eigene Mesh-Logik, schreibt keine Konfiguration und schaltet keine
 * Hardware. Installer-Einstellungen bleiben im App-Center.
 */
(function () {
  'use strict';
/**
 * Code-Teil: $
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const $ = (id) => document.getElementById(id);
/**
 * Code-Teil: fmtW
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const fmtW = (v) => Number.isFinite(Number(v)) ? (Math.abs(Number(v)) >= 1000 ? (Number(v) / 1000).toFixed(2) + ' kW' : Math.round(Number(v)) + ' W') : '--';
/**
 * Code-Teil: fmtPct
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const fmtPct = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v)) + ' %' : '--';
/**
 * Code-Teil: esc
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
/**
 * Code-Teil: setText
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
/**
 * Code-Teil: statusClass
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'surplus') return 'status-surplus';
    if (s === 'demand') return 'status-demand';
    if (s === 'disabled') return 'status-disabled';
    return 'status-balanced';
  }
/**
 * Code-Teil: renderNodes
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function renderNodes(nodes) {
    const body = $('meshRows');
    if (!body) return;
    const list = Array.isArray(nodes) ? nodes : [];
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="12" class="muted">Noch keine Mesh-/Microgrid-Knoten mit Messwerten vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = list.map((n) => {
      const intent = n.intent || {};
      const intentText = `${intent.status || n.status || 'balanced'} · ${fmtW(intent.availablePowerW || 0)} verfügbar · ${fmtW(intent.neededPowerW || 0)} Bedarf`;
      return `<tr>` +
        `<td>${esc(n.name || n.id || '')}<br><span class="muted">${esc(n.id || '')}</span></td>` +
        `<td>${esc(n.type || '')}</td>` +
        `<td>${esc(n.role || '')}</td>` +
        `<td class="${statusClass(n.status)}">${esc(n.status || '')}</td>` +
        `<td>${esc(n.priority || '')}</td>` +
        `<td>${n.powerW === null || n.powerW === undefined ? '--' : fmtW(n.powerW)}</td>` +
        `<td>${fmtW(n.generationW || 0)}</td>` +
        `<td>${fmtW(n.loadW || 0)}</td>` +
        `<td>${fmtW(n.surplusW || 0)}</td>` +
        `<td>${fmtW(n.demandW || 0)}</td>` +
        `<td>${n.socPercent === null || n.socPercent === undefined ? '--' : fmtPct(n.socPercent)}</td>` +
        `<td>${esc(intentText)}</td>` +
      `</tr>`;
    }).join('');
  }
/**
 * Code-Teil: renderDiagnosis
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function renderDiagnosis(payload) {
    const clusterIntent = payload && payload.clusterIntent ? payload.clusterIntent : {};
    const decision = payload && payload.decision ? payload.decision : {};
    const parts = [];
    if (clusterIntent.localFirstDiagnosis) parts.push(clusterIntent.localFirstDiagnosis);
    if (clusterIntent.gridLastDiagnosis) parts.push(clusterIntent.gridLastDiagnosis);
    if (decision.nextStep) parts.push(decision.nextStep);
    parts.push('Read-only: keine automatische Steuerung aktiv.');
    setText('meshDiagnosis', parts.join(' '));
    const missing = payload && Array.isArray(payload.missingMappings) ? payload.missingMappings : [];
    const warning = payload && payload.warning ? String(payload.warning) : '';
    const msg = missing.length
      ? `${warning || 'Fehlende Zuordnungen'}: ` + missing.map(m => `${m.name || m.id}: ${m.warning || 'Mapping fehlt'}`).join(' · ')
      : (warning || 'Keine akuten Mapping-Warnungen.');
    setText('meshWarnings', msg);
  }
/**
 * Code-Teil: load
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  async function load() {
    setText('meshStatus', 'lade…');
    try {
      const res = await fetch('/api/mesh/microgrid', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error((payload && payload.message) || 'Mesh/Microgrid API nicht verfügbar');
      const cluster = payload.cluster || {};
      const totals = payload.totals || {};
      setText('meshStatus', `${payload.status || 'ok'} · ${payload.enabled ? 'aktiv' : 'aus'}`);
      setText('clusterName', cluster.name || cluster.id || '--');
      setText('clusterMode', cluster.mode || '--');
      setText('nodeCount', String((payload.nodes || []).length));
      setText('gridLimit', fmtW(cluster.gridLimitW || 0));
      setText('generationW', fmtW(totals.generationW || 0));
      setText('loadW', fmtW(totals.loadW || 0));
      setText('surplusW', fmtW(totals.surplusW || 0));
      setText('demandW', fmtW(totals.demandW || 0));
      setText('gridImportW', fmtW(totals.gridImportW || 0));
      setText('gridExportW', fmtW(totals.gridExportW || 0));
      setText('localUseW', fmtW(totals.localUsePotentialW || 0));
      setText('gridUsage', fmtPct(totals.gridLimitUsagePercent || 0));
      renderDiagnosis(payload);
      renderNodes(payload.nodes || []);
    } catch (e) {
      setText('meshStatus', 'Fehler');
      const body = $('meshRows');
      if (body) body.innerHTML = `<tr><td colspan="12" class="warn">${esc(e && e.message ? e.message : e)}</td></tr>`;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('refreshMesh');
    if (btn) btn.addEventListener('click', load);
    load();
    window.setInterval(load, 30000);
  });
})();
