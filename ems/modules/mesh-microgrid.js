/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/mesh-microgrid.ts
 * Quell-Hash: sha256:f9261e3bb2a619af8128791da07a70486ae060298f3fbfa42d678d9550733622
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/mesh-microgrid.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/modules/mesh-microgrid.js
 *
 * Zweck:
 * EOS Mesh/Microgrid Datenmodell als eigenes, getrenntes App-Modul. Dieses Modul
 * fasst mehrere Energie-Knoten (PV, Speicher, Ladepunkte, Verbraucher, Gebäude,
 * Netzpunkt usw.) zu einem lokalen Cluster zusammen und veröffentlicht daraus
 * neutrale NexoWatt-Intents für spätere Local-First-/Grid-Last-Strategien.
 *
 * Produktgrenze:
 * - Dieses Modul ist eine EOS-App und gehört nicht zur Home-Basis.
 * - Es ist bewusst ein eigenes Modul, damit Microgrid/Nachbarschaft später nicht
 *   in Energie-Wertkonto, Ledger, DC Display oder Export Guard vermischt wird.
 * - Es ist in 0.8.32 read-only: keine Hardware-Schreibbefehle, keine WR-Setpoints,
 *   keine Ladepunkt-Setpoints, keine Schaltlogik.
 *
 * Hersteller-/Protokolloffenheit:
 * Knoten können Daten aus beliebigen ioBroker-Datenpunkten liefern: OCPP, Modbus,
 * MQTT, REST, Herstelleradapter, NexoWatt-Devices oder Aliase. Das Modul sieht nur
 * normalisierte Leistung/SOC/Import/Export und bindet sich nicht an ein Protokoll.
 */
'use strict';

const { BaseModule } = require('./base');

const MODULE_VERSION = 'nexowatt.mesh-microgrid-model.v1';

function safeId(input, fallback = 'node') {
  const s = String(input || '').trim().toLowerCase();
  return (s || fallback).replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || fallback;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Math.round(Number(digits) || 0))));
  return Math.round(n * f) / f;
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeType(type) {
  const t = String(type || '').trim().toLowerCase();
  if (['pv', 'solar', 'producer', 'generation', 'generator'].includes(t)) return 'producer';
  if (['battery', 'storage', 'speicher'].includes(t)) return 'storage';
  if (['grid', 'meter', 'netz', 'netpoint', 'nvp'].includes(t)) return 'grid';
  if (['evcs', 'chargepoint', 'charging', 'wallbox', 'lp', 'dc', 'ac'].includes(t)) return 'chargepoint';
  if (['heatpump', 'thermal', 'heater', 'waermepumpe', 'wärmepumpe'].includes(t)) return 'thermal';
  if (['load', 'consumer', 'building', 'house', 'neighbor', 'nachbar'].includes(t)) return 'consumer';
  return 'generic';
}

function normalizeRole(role, type) {
  const r = String(role || '').trim().toLowerCase();
  if (['producer', 'generation', 'surplus', 'source'].includes(r)) return 'producer';
  if (['consumer', 'demand', 'sink', 'load'].includes(r)) return 'consumer';
  if (['grid', 'netpoint'].includes(r)) return 'grid';
  if (['storage'].includes(r)) return 'storage';
  const t = normalizeType(type);
  if (t === 'producer') return 'producer';
  if (t === 'grid') return 'grid';
  if (t === 'storage') return 'storage';
  return 'consumer';
}

function normalizeNodes(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  return arr.map((node, idx) => {
    const n = node && typeof node === 'object' ? node : {};
    let id = safeId(n.id || n.nodeId || n.key || `node_${idx + 1}`, `node_${idx + 1}`);
    if (seen.has(id)) id = `${id}_${idx + 1}`;
    seen.add(id);
    const type = normalizeType(n.type);
    return {
      id,
      name: String(n.name || n.label || id).trim() || id,
      type,
      role: normalizeRole(n.role, type),
      enabled: n.enabled !== false,
      priority: Math.max(1, Math.min(999, Math.round(num(n.priority, 100)))) || 100,
      powerDp: String(n.powerDp || n.powerWId || n.powerId || '').trim(),
      surplusPowerDp: String(n.surplusPowerDp || n.surplusWId || '').trim(),
      demandPowerDp: String(n.demandPowerDp || n.demandWId || '').trim(),
      socDp: String(n.socDp || n.socId || '').trim(),
      gridImportPowerDp: String(n.gridImportPowerDp || n.importPowerDp || '').trim(),
      gridExportPowerDp: String(n.gridExportPowerDp || n.exportPowerDp || '').trim(),
      maxPowerW: Math.max(0, Math.round(num(n.maxPowerW, 0))),
      note: String(n.note || '').trim(),
    };
  });
}

class MeshMicrogridModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._lastConfigHash = '';
    this._lastPublishTs = 0;
  }

  _cfg() {
    const cfg = this.adapter && this.adapter.config && typeof this.adapter.config === 'object' ? this.adapter.config : {};
    return cfg.meshMicrogrid && typeof cfg.meshMicrogrid === 'object' ? cfg.meshMicrogrid : {};
  }

  _enabled() {
    const cfg = this._cfg();
    return cfg.enabled === true;
  }

  _mode() {
    const cfg = this._cfg();
    const m = String(cfg.mode || 'diagnostic').trim().toLowerCase();
    return ['off', 'diagnostic', 'local_first', 'grid_last'].includes(m) ? m : 'diagnostic';
  }

  _nodes() {
    return normalizeNodes(this._cfg().nodes);
  }

  async init() {
    await this._ensureStates();
    await this._registerDatapoints();
    await this._publishDisabledOrInit('init');
  }

  async _registerDatapoints() {
    if (!this.dp || typeof this.dp.upsert !== 'function') return;
    const nodes = this._nodes();
    for (const node of nodes) {
      const prefix = `mesh.${node.id}`;
      const entries = [
        ['powerW', node.powerDp, 'W'],
        ['surplusW', node.surplusPowerDp, 'W'],
        ['demandW', node.demandPowerDp, 'W'],
        ['socPct', node.socDp, '%'],
        ['gridImportW', node.gridImportPowerDp, 'W'],
        ['gridExportW', node.gridExportPowerDp, 'W'],
      ];
      for (const [key, objectId, unit] of entries) {
        if (!objectId) continue;
        await this.dp.upsert({
          key: `${prefix}.${key}`,
          objectId,
          dataType: 'number',
          direction: 'in',
          unit,
          useAliveForStale: true,
        });
      }
    }
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
    const ch = async (id, name) => a.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await ch('meshMicrogrid', 'EOS Mesh/Microgrid');
    await ch('meshMicrogrid.cluster', 'Mesh/Microgrid Cluster');
    await ch('meshMicrogrid.power', 'Mesh/Microgrid Leistung');
    await ch('meshMicrogrid.intent', 'Mesh/Microgrid Energy Intent');
    await ch('meshMicrogrid.diagnostics', 'Mesh/Microgrid Diagnose');
    await ch('meshMicrogrid.export', 'Mesh/Microgrid Export');
    await ch('meshMicrogrid.operator', 'Mesh/Microgrid Betreiberansicht');

    await mk('meshMicrogrid.enabled', 'Mesh/Microgrid App aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.version', 'Mesh/Microgrid Schema', 'string', 'text', '', MODULE_VERSION);
    await mk('meshMicrogrid.status', 'Mesh/Microgrid Status', 'string', 'text', '', 'init');
    await mk('meshMicrogrid.mode', 'Mesh/Microgrid Modus', 'string', 'text', '', 'diagnostic');
    await mk('meshMicrogrid.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.legalNote', 'Hinweis', 'string', 'text', '', 'Read-only Datenmodell; keine Hardwaresteuerung.');

    await mk('meshMicrogrid.cluster.id', 'Cluster-ID', 'string', 'text', '', 'cluster_01');
    await mk('meshMicrogrid.cluster.name', 'Cluster-Name', 'string', 'text', '', 'Lokaler Energieverbund');
    await mk('meshMicrogrid.cluster.gridLimitW', 'Netzanschluss-/Clusterlimit', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.nodeCount', 'Knoten gesamt', 'number', 'value', '', 0);
    await mk('meshMicrogrid.cluster.activeNodeCount', 'Knoten aktiv', 'number', 'value', '', 0);
    await mk('meshMicrogrid.cluster.localFirstEnabled', 'Local First vorbereitet', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.cluster.gridLastEnabled', 'Grid Last vorbereitet', 'boolean', 'indicator', '', true);

    await mk('meshMicrogrid.power.generationW', 'Lokale Erzeugung/Verfügbarkeit', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.loadW', 'Lokale Last/Nachfrage', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.storageChargeW', 'Speicher Ladebedarf', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.storageDischargeW', 'Speicher Entladeleistung', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.gridImportW', 'Netzbezug im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.gridExportW', 'Einspeisung im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.surplusW', 'Überschuss im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.demandW', 'Restbedarf im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.localUsePotentialW', 'Lokales Nutzungspotenzial', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.gridLimitUsagePercent', 'Netzlimit-Auslastung', 'number', 'value.percent', '%', 0);

    await mk('meshMicrogrid.nodesJson', 'Mesh-Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.topologyJson', 'Mesh-Topologie JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.summaryJson', 'Mesh/Microgrid Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.intent.nodesJson', 'Energy Intents je Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.intent.clusterJson', 'Energy Intent Cluster JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.lastDecisionJson', 'Letzte read-only Entscheidung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.diagnostics.warning', 'Mesh/Microgrid Warnung', 'string', 'text', '', '');
    await mk('meshMicrogrid.diagnostics.missingMappingsJson', 'Fehlende Knoten-Mappings JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.diagnostics.readOnly', 'Read-only Modul', 'boolean', 'indicator', '', true);

    // 0.8.35 Betreiberansicht/Export: Diese States sind bewusst nur Links und
    // Snapshots auf dieselbe Modulwahrheit. Es wird keine zweite Mesh-Logik,
    // kein zweiter Cluster-Rechner und keine Steuerung aufgebaut.
    await mk('meshMicrogrid.export.schema', 'Mesh/Microgrid Export-Schema', 'string', 'text', '', 'nexowatt.mesh-microgrid-export.v1');
    await mk('meshMicrogrid.export.ready', 'Mesh/Microgrid Export bereit', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.export.jsonUrl', 'Mesh/Microgrid JSON Export URL', 'string', 'text', '', '/api/mesh/microgrid');
    await mk('meshMicrogrid.export.csvUrl', 'Mesh/Microgrid CSV Export URL', 'string', 'text', '', '/api/mesh/microgrid.csv');
    await mk('meshMicrogrid.export.snapshotJson', 'Mesh/Microgrid Snapshot JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.operator.viewUrl', 'Mesh/Microgrid Betreiberansicht URL', 'string', 'text', '', '/mesh/microgrid');
  }

  _getNumber(key, fallback = null) {
    try {
      if (this.dp && typeof this.dp.getNumber === 'function') return this.dp.getNumber(key, fallback);
    } catch (_e) {}
    return fallback;
  }

  _nodeSnapshot(node) {
    const prefix = `mesh.${node.id}`;
    const power = this._getNumber(`${prefix}.powerW`, null);
    const surplusIn = this._getNumber(`${prefix}.surplusW`, null);
    const demandIn = this._getNumber(`${prefix}.demandW`, null);
    const soc = this._getNumber(`${prefix}.socPct`, null);
    const gridImportIn = this._getNumber(`${prefix}.gridImportW`, null);
    const gridExportIn = this._getNumber(`${prefix}.gridExportW`, null);

    let generationW = 0;
    let loadW = 0;
    let storageChargeW = 0;
    let storageDischargeW = 0;
    let gridImportW = 0;
    let gridExportW = 0;

    const p = Number.isFinite(Number(power)) ? Number(power) : null;
    const surplus = Math.max(0, num(surplusIn, 0));
    const demand = Math.max(0, num(demandIn, 0));

    if (node.role === 'producer') {
      generationW = Math.max(0, p !== null ? p : surplus);
    } else if (node.role === 'storage') {
      // Sign-Konvention für Speicher im Mesh-Modell:
      // positiv = Entladung/Quelle, negativ = Ladung/Senke. Falls getrennte
      // Surplus-/Demand-DPs vorhanden sind, können sie diese Basis ergänzen.
      if (p !== null) {
        if (p >= 0) storageDischargeW = p;
        else storageChargeW = Math.abs(p);
      }
      storageDischargeW = Math.max(storageDischargeW, surplus);
      storageChargeW = Math.max(storageChargeW, demand);
      generationW += storageDischargeW;
      loadW += storageChargeW;
    } else if (node.role === 'grid') {
      if (gridImportIn !== null || gridExportIn !== null) {
        gridImportW = Math.max(0, num(gridImportIn, 0));
        gridExportW = Math.max(0, num(gridExportIn, 0));
      } else if (p !== null) {
        gridImportW = p > 0 ? p : 0;
        gridExportW = p < 0 ? Math.abs(p) : 0;
      }
    } else {
      loadW = Math.max(0, p !== null ? p : demand);
      if (surplus > 0 && p === null) generationW = surplus;
    }

    if (demand > 0 && node.role !== 'grid') loadW = Math.max(loadW, demand);
    if (surplus > 0 && node.role === 'producer') generationW = Math.max(generationW, surplus);

    const nodeSurplusW = Math.max(0, generationW + storageDischargeW - loadW - storageChargeW);
    const nodeDemandW = Math.max(0, loadW + storageChargeW - generationW - storageDischargeW);
    const status = !node.enabled ? 'disabled' : (nodeSurplusW > 0 ? 'surplus' : (nodeDemandW > 0 ? 'demand' : 'balanced'));

    return {
      ...node,
      powerW: p === null ? null : round(p, 0),
      socPercent: Number.isFinite(Number(soc)) ? clamp(Number(soc), 0, 100) : null,
      generationW: round(generationW, 0),
      loadW: round(loadW, 0),
      storageChargeW: round(storageChargeW, 0),
      storageDischargeW: round(storageDischargeW, 0),
      gridImportW: round(gridImportW, 0),
      gridExportW: round(gridExportW, 0),
      surplusW: round(nodeSurplusW, 0),
      demandW: round(nodeDemandW, 0),
      status,
      intent: {
        schema: 'nexowatt.energy-intent.v1',
        nodeId: node.id,
        type: node.type,
        status,
        availablePowerW: round(nodeSurplusW, 0),
        neededPowerW: round(nodeDemandW, 0),
        priority: node.priority,
        readOnly: true,
      },
    };
  }

  _buildSnapshot() {
    const cfg = this._cfg();
    const enabled = this._enabled();
    const mode = this._mode();
    const nodes = this._nodes();
    const activeNodes = nodes.filter(n => n.enabled);
    const snapshots = activeNodes.map(n => this._nodeSnapshot(n));
    const missing = nodes.filter(n => n.enabled && !n.powerDp && !n.surplusPowerDp && !n.demandPowerDp && !n.gridImportPowerDp && !n.gridExportPowerDp).map(n => ({ id: n.id, name: n.name, type: n.type, warning: 'Keine Leistungs-/Grid-Mappingdaten hinterlegt.' }));

    const sum = (field) => snapshots.reduce((acc, n) => acc + num(n[field], 0), 0);
    const generationW = sum('generationW');
    const loadW = sum('loadW');
    const storageChargeW = sum('storageChargeW');
    const storageDischargeW = sum('storageDischargeW');
    const gridImportW = sum('gridImportW');
    const gridExportW = sum('gridExportW');
    const surplusW = Math.max(0, generationW - loadW);
    const demandW = Math.max(0, loadW - generationW);
    const localUsePotentialW = Math.max(0, Math.min(generationW, loadW));
    const gridLimitW = Math.max(0, Math.round(num(cfg.gridLimitW, 0)));
    const gridUsagePercent = gridLimitW > 0 ? Math.max(0, Math.round((Math.max(gridImportW, gridExportW) / gridLimitW) * 100)) : 0;

    const clusterId = safeId(cfg.clusterId || 'cluster_01', 'cluster_01');
    const clusterName = String(cfg.clusterName || 'Lokaler Energieverbund').trim() || 'Lokaler Energieverbund';
    const status = !enabled ? 'disabled' : (missing.length ? 'warn' : 'ok');
    const warning = !enabled ? '' : (missing.length ? `${missing.length} Mesh/Microgrid-Knoten ohne Leistungszuordnung.` : '');

    const clusterIntent = {
      schema: 'nexowatt.cluster-energy-intent.v1',
      clusterId,
      mode,
      readOnly: true,
      localFirstPrepared: true,
      gridLastPrepared: true,
      generationW: round(generationW, 0),
      loadW: round(loadW, 0),
      surplusW: round(surplusW, 0),
      demandW: round(demandW, 0),
      localUsePotentialW: round(localUsePotentialW, 0),
      gridLimitW,
      gridLimitUsagePercent: gridUsagePercent,
      localFirstDiagnosis: surplusW > 0 ? 'Lokaler Überschuss vorhanden; spätere Strategie kann lokale Senken priorisieren.' : 'Kein lokaler Überschuss vorhanden.',
      gridLastDiagnosis: demandW > 0 ? 'Restbedarf vorhanden; spätere Strategie kann Netzbezug nach lokalen Quellen nachrangig behandeln.' : 'Kein Restbedarf vorhanden.',
      note: '0.8.35 Betreiberansicht: keine automatische Steuerung, nur transparente Vorbereitung.',
    };

    const decision = {
      schema: 'nexowatt.mesh-readonly-decision.v1',
      ts: Date.now(),
      mode,
      action: 'observe-only',
      reason: enabled ? 'Mesh/Microgrid Datenmodell aktiv; Steuerstrategien werden später separat freigegeben.' : 'Mesh/Microgrid App deaktiviert.',
      nextStep: surplusW > 0 ? 'Lokalen Überschuss für Speicher/Ladepunkte/Nachbarn priorisieren (spätere Strategie).' : (demandW > 0 ? 'Lokalen Bedarf mit PV/Speicher/Clusterquellen decken (spätere Strategie).' : 'Cluster aktuell ausgeglichen.'),
      readOnly: true,
    };

    return {
      enabled,
      status,
      warning,
      mode,
      clusterId,
      clusterName,
      gridLimitW,
      nodes,
      snapshots,
      missing,
      clusterIntent,
      decision,
      totals: {
        generationW: round(generationW, 0),
        loadW: round(loadW, 0),
        storageChargeW: round(storageChargeW, 0),
        storageDischargeW: round(storageDischargeW, 0),
        gridImportW: round(gridImportW, 0),
        gridExportW: round(gridExportW, 0),
        surplusW: round(surplusW, 0),
        demandW: round(demandW, 0),
        localUsePotentialW: round(localUsePotentialW, 0),
        gridLimitUsagePercent: gridUsagePercent,
      },
    };
  }

  async _publishDisabledOrInit(reason) {
    const snap = this._buildSnapshot();
    snap.status = this._enabled() ? (snap.status || 'ok') : 'disabled';
    snap.decision.reason = reason === 'init' ? 'Mesh/Microgrid Modul initialisiert.' : snap.decision.reason;
    await this._publish(snap);
  }

  async tick() {
    // Falls der Installer im App-Center Knoten ändert und der EMS-Restart ausbleibt,
    // registrieren wir neue DPs beim nächsten Konfigurationswechsel nach. Das ist nur
    // eine Lese-Registrierung; es entstehen keine Hardware-Schreibpfade.
    try {
      const cfgHash = JSON.stringify(this._cfg());
      if (cfgHash !== this._lastConfigHash) {
        this._lastConfigHash = cfgHash;
        await this._registerDatapoints();
      }
    } catch (_e) {}
    const snap = this._buildSnapshot();
    await this._publish(snap);
  }

  async _publish(snap) {
    const a = this.adapter;
    if (!a || typeof a.setStateAsync !== 'function') return;
    const now = Date.now();
    const set = async (id, val) => {
      try { await a.setStateAsync(id, { val, ack: true }); } catch (_e) {}
    };

    await set('meshMicrogrid.enabled', !!snap.enabled);
    await set('meshMicrogrid.version', MODULE_VERSION);
    await set('meshMicrogrid.status', snap.status || 'ok');
    await set('meshMicrogrid.mode', snap.mode || 'diagnostic');
    await set('meshMicrogrid.lastUpdate', now);
    await set('meshMicrogrid.legalNote', 'EOS Mesh/Microgrid Datenmodell ist read-only; Steuerung/Abrechnung werden später separat freigegeben.');
    await set('meshMicrogrid.cluster.id', snap.clusterId || 'cluster_01');
    await set('meshMicrogrid.cluster.name', snap.clusterName || 'Lokaler Energieverbund');
    await set('meshMicrogrid.cluster.gridLimitW', snap.gridLimitW || 0);
    await set('meshMicrogrid.cluster.nodeCount', Array.isArray(snap.nodes) ? snap.nodes.length : 0);
    await set('meshMicrogrid.cluster.activeNodeCount', Array.isArray(snap.snapshots) ? snap.snapshots.length : 0);
    await set('meshMicrogrid.cluster.localFirstEnabled', snap.mode !== 'off');
    await set('meshMicrogrid.cluster.gridLastEnabled', snap.mode !== 'off');

    const t = snap.totals || {};
    await set('meshMicrogrid.power.generationW', t.generationW || 0);
    await set('meshMicrogrid.power.loadW', t.loadW || 0);
    await set('meshMicrogrid.power.storageChargeW', t.storageChargeW || 0);
    await set('meshMicrogrid.power.storageDischargeW', t.storageDischargeW || 0);
    await set('meshMicrogrid.power.gridImportW', t.gridImportW || 0);
    await set('meshMicrogrid.power.gridExportW', t.gridExportW || 0);
    await set('meshMicrogrid.power.surplusW', t.surplusW || 0);
    await set('meshMicrogrid.power.demandW', t.demandW || 0);
    await set('meshMicrogrid.power.localUsePotentialW', t.localUsePotentialW || 0);
    await set('meshMicrogrid.power.gridLimitUsagePercent', t.gridLimitUsagePercent || 0);

    const nodesJson = JSON.stringify(snap.snapshots || []);
    const topology = {
      schema: 'nexowatt.mesh-topology.v1',
      clusterId: snap.clusterId,
      clusterName: snap.clusterName,
      nodeCount: Array.isArray(snap.nodes) ? snap.nodes.length : 0,
      activeNodeCount: Array.isArray(snap.snapshots) ? snap.snapshots.length : 0,
      nodes: (snap.snapshots || []).map(n => ({ id: n.id, name: n.name, type: n.type, role: n.role, priority: n.priority })),
    };
    const summary = {
      schema: MODULE_VERSION,
      ts: now,
      enabled: !!snap.enabled,
      status: snap.status,
      warning: snap.warning || '',
      clusterId: snap.clusterId,
      clusterName: snap.clusterName,
      mode: snap.mode,
      totals: snap.totals,
      readOnly: true,
      separateEosApp: true,
      operatorViewUrl: '/mesh/microgrid',
      exportUrls: { json: '/api/mesh/microgrid', csv: '/api/mesh/microgrid.csv' },
    };

    await set('meshMicrogrid.nodesJson', nodesJson);
    await set('meshMicrogrid.topologyJson', JSON.stringify(topology));
    await set('meshMicrogrid.summaryJson', JSON.stringify(summary));
    await set('meshMicrogrid.intent.nodesJson', JSON.stringify((snap.snapshots || []).map(n => n.intent)));
    await set('meshMicrogrid.intent.clusterJson', JSON.stringify(snap.clusterIntent || {}));
    await set('meshMicrogrid.lastDecisionJson', JSON.stringify(snap.decision || {}));
    await set('meshMicrogrid.diagnostics.warning', snap.warning || '');
    await set('meshMicrogrid.diagnostics.missingMappingsJson', JSON.stringify(snap.missing || []));
    await set('meshMicrogrid.diagnostics.readOnly', true);

    // Betreiber-/Export-Snapshot für UI und APIs. Dieser Snapshot ist exakt aus
    // den gerade veröffentlichten Knoten-/Clusterwerten abgeleitet und dient nur
    // als bequeme Ansicht. Keine weitere Berechnungsschicht zählt Werte erneut.
    const exportSnapshot = {
      schema: 'nexowatt.mesh-microgrid-export.v1',
      ts: now,
      cluster: { id: snap.clusterId, name: snap.clusterName, mode: snap.mode, gridLimitW: snap.gridLimitW },
      totals: snap.totals || {},
      nodes: snap.snapshots || [],
      intents: (snap.snapshots || []).map(n => n.intent),
      clusterIntent: snap.clusterIntent || {},
      decision: snap.decision || {},
      missingMappings: snap.missing || [],
      readOnly: true,
    };
    await set('meshMicrogrid.export.schema', 'nexowatt.mesh-microgrid-export.v1');
    await set('meshMicrogrid.export.ready', !!snap.enabled);
    await set('meshMicrogrid.export.jsonUrl', '/api/mesh/microgrid');
    await set('meshMicrogrid.export.csvUrl', '/api/mesh/microgrid.csv');
    await set('meshMicrogrid.export.snapshotJson', JSON.stringify(exportSnapshot));
    await set('meshMicrogrid.operator.viewUrl', '/mesh/microgrid');
    this._lastPublishTs = now;
  }
}

module.exports = { MeshMicrogridModule };
