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
 * Original-Hash: c796131bff5416d012d258ecc1023a866ad24241028cc05e6815ad89a6f85788
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
 * Quell-Hash: sha256:d5ab93300c5500bb05284dc5c3b3e1c92eb64f305ada16966f2732bc8333e0fb
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
 * Code-Teil: severityClass
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function severityClass(severity) {
    const s = String(severity || '').toLowerCase();
    if (s === 'critical') return 'severity-critical';
    if (s === 'warn') return 'severity-warn';
    return 'severity-info';
  }
/**
 * Code-Teil: renderPlanning
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function renderPlanning(payload) {
    const planning = payload && payload.planning ? payload.planning : {};
    const actions = Array.isArray(planning.actions) ? planning.actions : [];
    const grid = planning.gridLimit || {};
    setText('meshReadiness', planning.readinessScorePercent == null ? '--' : fmtPct(planning.readinessScorePercent));
    setText('meshGridLimitDiag', grid.message || 'Keine Netzlimit-Diagnose vorhanden.');
    setText('meshPlanSummary', actions.length
      ? `${actions.length} geplante Diagnose-Entscheidung(en), davon ${planning.criticalActionCount || 0} kritisch. Read-only: keine Hardware-Schreibbefehle.`
      : 'Keine geplanten Aktionen. Read-only: keine Hardware-Schreibbefehle.');

    const rows = $('meshPlanRows');
    if (rows) {
      if (!actions.length) {
        rows.innerHTML = '<tr><td colspan="9" class="muted">Keine geplanten Entscheidungen vorhanden.</td></tr>';
      } else {
        rows.innerHTML = actions.map(a => `<tr>` +
          `<td>${esc(a.rank || '')}</td>` +
          `<td class="${severityClass(a.severity)}">${esc(a.category || '')}</td>` +
          `<td>${esc(a.trigger || '')}</td>` +
          `<td>${esc(a.nodeName || a.nodeId || '')}<br><span class="muted">${esc(a.nodeId || '')}</span></td>` +
          `<td>${esc(a.targetNodeName || a.targetNodeId || '--')}</td>` +
          `<td>${esc(a.priority || '')}</td>` +
          `<td>${fmtW(a.plannedPowerW || 0)}</td>` +
          `<td>${esc(a.direction || '')}</td>` +
          `<td>${esc(a.reason || '')}<br><span class="muted">read-only · kein Hardware-Write</span></td>` +
        `</tr>`).join('');
      }
    }
    const order = Array.isArray(planning.priorityOrder) ? planning.priorityOrder : [];
    setText('meshPriorityOrder', order.length
      ? order.map(o => `${o.rank}. ${o.name || o.id} (${o.type}/${o.role}, Priorität ${o.priority})`).join(' · ')
      : 'Keine Prioritätsreihenfolge vorhanden.');
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
      renderPlanning(payload);
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
