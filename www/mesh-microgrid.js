/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/mesh-microgrid.ts
 * Quell-Hash: sha256:57e6dca0a67bf67ac62698e518a0760b029c0cc70bb745a9464d138391ceccc5
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
  const $ = (id) => document.getElementById(id);
  const fmtW = (v) => Number.isFinite(Number(v)) ? (Math.abs(Number(v)) >= 1000 ? (Number(v) / 1000).toFixed(2) + ' kW' : Math.round(Number(v)) + ' W') : '--';
  const fmtPct = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v)) + ' %' : '--';
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'surplus') return 'status-surplus';
    if (s === 'demand') return 'status-demand';
    if (s === 'disabled') return 'status-disabled';
    return 'status-balanced';
  }
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

  function severityClass(severity) {
    const s = String(severity || '').toLowerCase();
    if (s === 'critical') return 'severity-critical';
    if (s === 'warn') return 'severity-warn';
    return 'severity-info';
  }
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


  function renderCommandGuard(payload) {
    const guard = payload && payload.commandGuard ? payload.commandGuard : {};
    const commands = Array.isArray(guard.plannedCommands) ? guard.plannedCommands : [];
    const checks = Array.isArray(guard.safetyChecks) ? guard.safetyChecks : [];
    setText('meshCommandGuardStatus', `${guard.status || 'blocked'} · Command-Ausgabe: ${guard.commandOutputAllowed ? 'freigegeben' : 'blockiert'} · direkter Hardware-Write: ${guard.hardwareWrite ? 'ja' : 'nein'}`);
    setText('meshCommandGuardReason', guard.reason || 'CommandGuard wartet auf Feldtest-Freigabe oder Command-State.');
    setText('meshCommandGuardCounts', `${commands.length} Command-Intent(s), ${guard.blockerCount || 0} Blocker, ${guard.warnCount || 0} Warnung(en)`);
    const checkBox = $('meshCommandGuardChecks');
    if (checkBox) {
      checkBox.innerHTML = checks.length
        ? checks.map(c => `<div><b>${esc(c.id || '')}</b>: ${esc(c.severity || '')} · ${esc(c.message || '')}</div>`).join('')
        : '<span class="muted">Keine Safety-Checks vorhanden.</span>';
    }
    const rows = $('meshCommandRows');
    if (rows) {
      if (!commands.length) rows.innerHTML = '<tr><td colspan="8" class="muted">Keine Command-Intents vorhanden.</td></tr>';
      else rows.innerHTML = commands.map(cmd => `<tr>` +
        `<td>${esc(cmd.commandId || '')}</td>` +
        `<td>${esc(cmd.category || '')}</td>` +
        `<td>${esc(cmd.nodeName || cmd.nodeId || '')}<br><span class="muted">${esc(cmd.nodeId || '')}</span></td>` +
        `<td>${esc(cmd.targetNodeName || cmd.targetNodeId || '--')}</td>` +
        `<td>${fmtW(cmd.plannedPowerW || 0)}</td>` +
        `<td>${esc(cmd.direction || '')}</td>` +
        `<td class="${cmd.allowed ? 'severity-info' : 'severity-critical'}">${cmd.allowed ? 'freigegeben' : 'blockiert'}</td>` +
        `<td>${esc(cmd.reason || '')}</td>` +
      `</tr>`).join('');
    }
  }

  function renderFieldControl(payload) {
    const fc = payload && payload.fieldControl ? payload.fieldControl : {};
    const ts = payload && payload.tailscale ? payload.tailscale : {};
    setText('meshFieldStatus', `${fc.mode || 'diagnostic'} · ${fc.enabled ? 'aktiv' : 'aus'}`);
    setText('meshFieldDetails', `Freigabe: ${fc.installerApproved ? 'ja' : 'nein'} · Command-State: ${fc.commandStateDp || '--'} · letzter Status: ${fc.lastWriteStatus || 'idle'} · Ausgabe: ${fc.outputCount || 0}`);
    setText('meshTailscaleStatus', `${ts.enabled ? 'aktiv' : 'aus'} · ${ts.profile || 'mesh-microgrid'}`);
    const peerInfo = Array.isArray(ts.peers) ? ts.peers.map(p => `${p.id || p.url}: ${p.ok ? 'ok' : 'Fehler'}`).join(' · ') : '';
    setText('meshTailscaleDetails', `lokale Node: ${ts.localNodeId || '--'} · Peers: ${ts.peerCount || 0} · Remote-Knoten: ${ts.remoteNodeCount || 0} · Poll: ${ts.lastPollStatus || 'idle'}${peerInfo ? ' · ' + peerInfo : ''}`);
  }

  function renderReceiver(payload) {
    const r = payload && payload.receiver ? payload.receiver : {};
    setText('meshReceiverStatus', `${r.enabled ? 'aktiv' : 'aus'} · ${r.status || 'disabled'}`);
    setText('meshReceiverDetails', `Command-State: ${r.commandStateDp || '--'} · Token: ${r.requireToken ? 'erforderlich' : 'aus'} · TTL: ${r.ttlSec || 120}s · accepted: ${r.acceptedCount || 0} · rejected: ${r.rejectedCount || 0}`);
    const ack = r.lastAck || {};
    const ackText = ack && Object.keys(ack).length
      ? `${ack.status || '--'} · accepted: ${ack.acceptedCount || 0} · rejected: ${ack.rejectedCount || 0} · letzte ID: ${r.lastCommandId || '--'} · Replay blockiert: ${r.replayBlockedCount || 0}`
      : `Noch kein ACK vorhanden. Replay blockiert: ${r.replayBlockedCount || 0}`;
    setText('meshReceiverAck', ackText);
  }

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
      renderCommandGuard(payload);
      renderFieldControl(payload);
      renderReceiver(payload);
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
