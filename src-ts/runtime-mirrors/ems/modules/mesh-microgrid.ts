// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/mesh-microgrid.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/modules/mesh-microgrid.js
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
 * Original-Hash: 44f75e5953130382eb8d8326cb1aa8837bfef6251905b25b9433d4085ad772fb
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
 * Quelle: src-ts/runtime-executables/ems/modules/mesh-microgrid.ts
 * Quell-Hash: sha256:5d86327cf8e5ec306099031b99816e4805919cdb919642b3ef5fc51c2e75ef42
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
 * EOS Mesh/Microgrid ist ab 0.8.32 eine eigene App und kein versteckter Teil von
 * Energy Wallet, Local kWh Ledger oder DC Station Display. Dieses Modul legt das
 * neutrale Datenmodell für Energie-Knoten, Cluster, Local-First/Grid-Last und
 * Microgrid-Diagnose an.
 *
 * Wichtig für die Produktarchitektur:
 * - Home bleibt unverändert; das Modul ist EOS-only und wird nur über die separate
 *   App-Freigabe im Installer/App-Center aktiviert.
 * - Diese erste Stufe ist bewusst read-only. Sie bewertet und normalisiert Knoten,
 *   schreibt aber keine Hardware-Sollwerte und keine WR-/Wallbox-/Batterie-Befehle.
 * - Das Modul nutzt bestehende, bereits gebaute Quellen nur als Referenz
 *   (Energy Wallet, Local kWh Ledger, Export Guard, NL P1/DSMR). Es zählt keine
 *   Ledger-Sessions erneut und baut keine zweite Wallet- oder Export-Guard-Logik.
 * - Spätere Versionen können daraus Energy Intent Protocol, Nachbarschaftsversorgung
 *   und Energy-Hub-Optimierung entwickeln, ohne das Datenmodell wieder umzubenennen.
 *
 * Kommentierungsregel:
 * Alle fachlich relevanten Abschnitte sind ausführlich kommentiert, weil Mesh und
 * Microgrid später sicherheits- und betreiberrelevant werden. Änderungen an diesem
 * Modul müssen besonders darauf achten, dass die Read-only-Grenze erhalten bleibt,
 * solange kein separater CommandGuard/WritePlan für Microgrid freigegeben ist.
 */
'use strict';

const { BaseModule } = require('./base');

const MESH_MICROGRID_VERSION = 'nexowatt.mesh-microgrid-model.v1';
const DEFAULT_NODE_LIMIT = 80;

/**
 * Code-Teil: nowMs
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nowMs() {
  return Date.now();
}

/**
 * Code-Teil: safeId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function safeId(input, fallback = 'node') {
  const s = String(input == null ? '' : input).trim().toLowerCase();
  return (s || fallback)
    .replace(/[^a-z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || fallback;
}

/**
 * Code-Teil: num
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Code-Teil: round
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function round(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Math.round(Number(digits) || 0))));
  return Math.round(n * f) / f;
}

/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Code-Teil: asBool
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function asBool(value, fallback = false) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  const s = String(value == null ? '' : value).trim().toLowerCase();
  if (['true', 'on', 'yes', 'ja', 'an', 'enabled', 'aktiv'].includes(s)) return true;
  if (['false', 'off', 'no', 'nein', 'aus', 'disabled', 'inaktiv'].includes(s)) return false;
  return fallback;
}

/**
 * Code-Teil: toArray
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_e) {}
  }
  return [];
}

/**
 * Code-Teil: json
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function json(value, fallback = {}) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try { return JSON.parse(value); } catch (_e) {}
  }
  return fallback;
}

/**
 * Code-Teil: MeshMicrogridModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class MeshMicrogridModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._lastHash = '';
    this._lastUpdate = 0;
  }

  _cfg() {
    const root = this.adapter && this.adapter.config && typeof this.adapter.config === 'object' ? this.adapter.config : {};
    const cfg = root.meshMicrogrid && typeof root.meshMicrogrid === 'object' ? root.meshMicrogrid : {};
    return cfg;
  }

  _enabled() {
    const cfg = this._cfg();
    return cfg.enabled === true;
  }

  _clusterId() {
    return safeId(this._cfg().clusterId || 'local_cluster_01', 'local_cluster_01');
  }

  _clusterName() {
    const name = String(this._cfg().clusterName || '').trim();
    return name || 'Lokaler Energieverbund';
  }

  _strategy() {
    const s = String(this._cfg().strategy || 'local_first_grid_last').trim().toLowerCase();
    if (['local_first_grid_last', 'local_first', 'grid_limit', 'diagnostic'].includes(s)) return s;
    return 'local_first_grid_last';
  }

  _readStateValue(id, fallback = null) {
    const a = this.adapter;
    const full = String(id || '').trim();
    if (!full) return fallback;

    // Der Adapter hat je nach Runtime mehrere Cache-Varianten. Wir lesen defensiv,
    // damit das Modul keine harte Kopplung an eine konkrete main.js-Struktur bekommt.
    try {
      if (a && a.stateCache && Object.prototype.hasOwnProperty.call(a.stateCache, full)) {
        const raw = a.stateCache[full];
        return raw && typeof raw === 'object' && 'val' in raw ? raw.val : raw;
      }
    } catch (_e) {}
    try {
      if (a && a._stateCache && Object.prototype.hasOwnProperty.call(a._stateCache, full)) {
        const raw = a._stateCache[full];
        return raw && typeof raw === 'object' && 'val' in raw ? raw.val : raw;
      }
    } catch (_e) {}
    try {
      if (this.dp && typeof this.dp.getNumber === 'function') {
        const n = this.dp.getNumber(full, null);
        if (Number.isFinite(Number(n))) return Number(n);
      }
    } catch (_e) {}
    return fallback;
  }

  _readOwnNumber(id, fallback = 0) {
    const ns = this.adapter && this.adapter.namespace ? `${this.adapter.namespace}.` : '';
    return num(this._readStateValue(`${ns}${id}`, this._readStateValue(id, fallback)), fallback);
  }

  _configNodes() {
    const cfg = this._cfg();
    const nodes = toArray(cfg.nodes).slice(0, clamp(cfg.nodeLimit || DEFAULT_NODE_LIMIT, 1, 250));
    return nodes.map((raw, idx) => this._normalizeNode(raw, idx)).filter(Boolean);
  }

  _normalizeNode(raw, idx) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const id = safeId(r.id || r.key || `node_${idx + 1}`, `node_${idx + 1}`);
    const type = String(r.type || 'generic').trim().toLowerCase();
    const role = String(r.role || 'mixed').trim().toLowerCase();
    const enabled = r.enabled !== false;
    if (!enabled) return null;

    // Ein Mesh-Knoten kann bereits konkrete Messpunkte haben, muss sie aber nicht.
    // Ohne Mapping bleibt er im Datenmodell sichtbar, wird aber als "unmapped" markiert.
    const generationW = this._mappedPower(r.generationPowerId, r.generationW, 0);
    const demandW = this._mappedPower(r.demandPowerId, r.demandW, 0);
    const storageSocPct = this._mappedPower(r.storageSocId, r.storageSocPct, null);
    const gridLimitW = this._mappedPower(r.gridLimitId, r.gridLimitW, 0);

    const surplusW = Math.max(0, generationW - demandW);
    const deficitW = Math.max(0, demandW - generationW);
    const intent = this._intentForNode(type, role, surplusW, deficitW, storageSocPct);
    const mapped = !!(r.generationPowerId || r.demandPowerId || r.storageSocId || r.gridLimitId || Number.isFinite(Number(r.generationW)) || Number.isFinite(Number(r.demandW)));

    return {
      id,
      name: String(r.name || id).trim() || id,
      type,
      role,
      enabled: true,
      mapped,
      generationW: round(generationW, 0),
      demandW: round(demandW, 0),
      surplusW: round(surplusW, 0),
      deficitW: round(deficitW, 0),
      storageSocPct: storageSocPct == null ? null : round(storageSocPct, 1),
      gridLimitW: round(gridLimitW, 0),
      priority: clamp(r.priority || 100, 1, 999),
      intent,
      source: 'installer-config',
    };
  }

  _mappedPower(id, fixed, fallback = 0) {
    if (id) return num(this._readStateValue(id, fallback), fallback);
    if (fixed !== undefined && fixed !== null && String(fixed).trim() !== '') return num(fixed, fallback);
    return fallback;
  }

  _intentForNode(type, role, surplusW, deficitW, storageSocPct) {
    if (surplusW > 50) return 'surplus';
    if (deficitW > 50) return 'demand';
    if (String(type || '').includes('storage') && storageSocPct != null) {
      if (storageSocPct < 25) return 'storage-charge-preferred';
      if (storageSocPct > 85) return 'storage-discharge-available';
    }
    if (role === 'grid') return 'grid-boundary';
    return 'balanced';
  }

  _referenceNodes() {
    const nodes = [];

    // Referenzknoten: Export Guard. Wir lesen nur Diagnosen, damit keine zweite
    // Einspeisebegrenzung entsteht. Diese Daten helfen später dem Microgrid-Planer,
    // das Netzanschlusslimit und überschüssige Einspeisung zu verstehen.
    const maxFeedInW = this._readOwnNumber('gridConstraints.exportLimit.effectiveMaxFeedInW', this._readOwnNumber('gridConstraints.exportLimit.maxFeedInW', 0));
    const currentExportW = this._readOwnNumber('gridConstraints.exportLimit.currentExportW', 0);
    const overLimitW = this._readOwnNumber('gridConstraints.exportLimit.exportOverLimitW', 0);
    if (maxFeedInW > 0 || currentExportW > 0 || overLimitW > 0) {
      nodes.push({
        id: 'export_guard',
        name: 'Export Guard / Netzgrenze',
        type: 'grid-boundary',
        role: 'grid',
        enabled: true,
        mapped: true,
        generationW: round(currentExportW, 0),
        demandW: 0,
        surplusW: round(currentExportW, 0),
        deficitW: 0,
        storageSocPct: null,
        gridLimitW: round(maxFeedInW, 0),
        priority: 10,
        intent: overLimitW > 0 ? 'export-limit-exceeded' : 'grid-boundary',
        source: 'gridConstraints.exportLimit',
      });
    }

    // Referenzknoten: Local kWh Ledger. Er bleibt nur eine Bilanzquelle für bereits
    // abgeschlossene Ladevorgänge. Dieses Modul zählt keine Sessions erneut.
    const ledgerSummary = json(this._readStateValue(`${this.adapter.namespace}.energyLedger.summaryJson`, '{}'), {});
    const ledgerToday = ledgerSummary && ledgerSummary.today ? ledgerSummary.today : null;
    if (ledgerToday && (num(ledgerToday.totalKwh, 0) > 0 || num(ledgerToday.localKwh, 0) > 0)) {
      nodes.push({
        id: 'local_kwh_ledger',
        name: 'Local kWh Ledger',
        type: 'ledger',
        role: 'accounting',
        enabled: true,
        mapped: true,
        generationW: 0,
        demandW: 0,
        surplusW: 0,
        deficitW: 0,
        storageSocPct: null,
        gridLimitW: 0,
        priority: 900,
        intent: 'accounting-reference',
        source: 'energyLedger.summaryJson',
        totalKwhToday: round(ledgerToday.totalKwh || 0, 3),
        localKwhToday: round(ledgerToday.localKwh || ledgerToday.solarKwh || 0, 3),
      });
    }

    // Referenzknoten: NL P1/DSMR. Auch hier wird nur gemessen/normalisiert; die
    // Einspeisebegrenzung bleibt weiterhin beim Export Guard.
    const nlSummary = json(this._readStateValue(`${this.adapter.namespace}.nl.p1.summaryJson`, '{}'), {});
    if (nlSummary && (num(nlSummary.importPowerW, 0) > 0 || num(nlSummary.exportPowerW, 0) > 0)) {
      nodes.push({
        id: 'nl_p1_boundary',
        name: 'NL P1/DSMR Netzpunkt',
        type: 'meter',
        role: 'grid',
        enabled: true,
        mapped: true,
        generationW: round(nlSummary.exportPowerW || 0, 0),
        demandW: round(nlSummary.importPowerW || 0, 0),
        surplusW: round(Math.max(0, num(nlSummary.exportPowerW, 0) - num(nlSummary.importPowerW, 0)), 0),
        deficitW: round(Math.max(0, num(nlSummary.importPowerW, 0) - num(nlSummary.exportPowerW, 0)), 0),
        storageSocPct: null,
        gridLimitW: 0,
        priority: 20,
        intent: num(nlSummary.exportPowerW, 0) > num(nlSummary.importPowerW, 0) ? 'surplus' : 'demand',
        source: 'nl.p1.summaryJson',
      });
    }

    return nodes;
  }

  _allNodes() {
    const configured = this._configNodes();
    const refs = asBool(this._cfg().includeReferenceNodes, true) ? this._referenceNodes() : [];
    const seen = new Set();
    const out = [];
    for (const node of [...configured, ...refs]) {
      const id = safeId(node && node.id, 'node');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ ...node, id });
    }
    return out;
  }

  _snapshot(reason = 'tick') {
    const enabled = this._enabled();
    const nodes = enabled ? this._allNodes() : [];
    const localGenerationW = round(nodes.reduce((sum, n) => sum + num(n.generationW, 0), 0), 0);
    const localDemandW = round(nodes.reduce((sum, n) => sum + num(n.demandW, 0), 0), 0);
    const localSurplusW = round(Math.max(0, localGenerationW - localDemandW), 0);
    const localDeficitW = round(Math.max(0, localDemandW - localGenerationW), 0);
    const localUseW = round(Math.min(localGenerationW, localDemandW), 0);
    const localUsePercent = localGenerationW > 0 ? round((localUseW / Math.max(localGenerationW, 1)) * 100, 1) : 0;
    const gridLimitW = round(num(this._cfg().gridLimitW, 0), 0);
    const importLimitW = round(num(this._cfg().importLimitW, gridLimitW || 0), 0);
    const exportLimitW = round(num(this._cfg().exportLimitW, this._readOwnNumber('gridConstraints.exportLimit.effectiveMaxFeedInW', 0)), 0);
    const strategy = this._strategy();

    const intents = nodes.map((n) => ({
      nodeId: n.id,
      intent: n.intent,
      surplusW: n.surplusW,
      deficitW: n.deficitW,
      priority: n.priority,
      source: n.source,
    })).sort((a, b) => num(a.priority, 999) - num(b.priority, 999));

    const microgridDecision = {
      schema: 'nexowatt.microgrid-decision-preview.v1',
      readOnly: true,
      strategy,
      localFirstActive: enabled && strategy !== 'diagnostic',
      gridLast: enabled && strategy === 'local_first_grid_last',
      action: enabled ? (localSurplusW > 50 ? 'use-local-surplus-first' : (localDeficitW > 50 ? 'cover-local-demand-or-grid' : 'balanced')) : 'disabled',
      note: 'Preview only: keine Hardwaresteuerung, keine zweite Regelung, kein Energy-Ledger-Doppeltzählen.',
    };

    return {
      schema: MESH_MICROGRID_VERSION,
      enabled,
      reason,
      ts: nowMs(),
      clusterId: this._clusterId(),
      clusterName: this._clusterName(),
      strategy,
      nodeCount: nodes.length,
      localGenerationW,
      localDemandW,
      localSurplusW,
      localDeficitW,
      localUsePercent,
      gridLimitW,
      importLimitW,
      exportLimitW,
      nodes,
      intents,
      microgridDecision,
      status: enabled ? 'ok' : 'disabled',
      warning: enabled && nodes.length === 0 ? 'Mesh/Microgrid ist aktiv, aber es sind noch keine Knoten oder Referenzquellen vorhanden.' : '',
    };
  }

  async init() {
    await this._ensureStates();
    await this._publish(this._snapshot('init'));
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
/**
 * Code-Teil: ch
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const ch = async (id, name) => a.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
/**
 * Code-Teil: mk
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await ch('meshMicrogrid', 'EOS Mesh/Microgrid App');
    await ch('meshMicrogrid.cluster', 'Mesh Cluster');
    await ch('meshMicrogrid.microgrid', 'Microgrid Preview');
    await ch('meshMicrogrid.export', 'Mesh/Microgrid Exportbasis');

    await mk('meshMicrogrid.enabled', 'Mesh/Microgrid aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.version', 'Mesh/Microgrid Schema', 'string', 'text', '', MESH_MICROGRID_VERSION);
    await mk('meshMicrogrid.status', 'Mesh/Microgrid Status', 'string', 'text', '', 'init');
    await mk('meshMicrogrid.warning', 'Mesh/Microgrid Hinweis', 'string', 'text', '', '');
    await mk('meshMicrogrid.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.readOnly', 'Read-only Datenmodell', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.legalNote', 'Hinweis', 'string', 'text', '', 'EOS Mesh/Microgrid 0.8.32 ist ein read-only Datenmodell und schaltet keine Hardware.');
    await mk('meshMicrogrid.summaryJson', 'Mesh/Microgrid Zusammenfassung JSON', 'string', 'json', '', '{}');

    await mk('meshMicrogrid.cluster.id', 'Cluster-ID', 'string', 'text', '', 'local_cluster_01');
    await mk('meshMicrogrid.cluster.name', 'Cluster-Name', 'string', 'text', '', 'Lokaler Energieverbund');
    await mk('meshMicrogrid.cluster.strategy', 'Strategie', 'string', 'text', '', 'local_first_grid_last');
    await mk('meshMicrogrid.cluster.nodeCount', 'Knotenanzahl', 'number', 'value', '', 0);
    await mk('meshMicrogrid.cluster.localGenerationW', 'Lokale Erzeugung', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.localDemandW', 'Lokaler Bedarf', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.localSurplusW', 'Lokaler Überschuss', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.localDeficitW', 'Lokales Defizit', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.localUsePercent', 'Lokale Nutzungsquote', 'number', 'value.percent', '%', 0);
    await mk('meshMicrogrid.cluster.gridLimitW', 'Netzlimit Verbund', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.importLimitW', 'Importlimit Verbund', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.exportLimitW', 'Exportlimit Verbund', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.nodesJson', 'Mesh-Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.cluster.intentsJson', 'Energy Intent Preview JSON', 'string', 'json', '', '[]');

    await mk('meshMicrogrid.microgrid.enabled', 'Microgrid Preview aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.microgrid.localFirstActive', 'Local First aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.microgrid.gridLastActive', 'Grid Last aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.microgrid.lastDecisionJson', 'Microgrid Entscheidungs-Preview JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.microgrid.mode', 'Microgrid Modus', 'string', 'text', '', 'read-only-preview');

    await mk('meshMicrogrid.export.schema', 'Export Schema', 'string', 'text', '', MESH_MICROGRID_VERSION);
    await mk('meshMicrogrid.export.nodesJson', 'Export Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.export.ready', 'Export bereit', 'boolean', 'indicator', '', false);
  }

  async tick() {
    await this._publish(this._snapshot('tick'));
  }

  async _publish(snap) {
    const a = this.adapter;
    if (!a || typeof a.setStateAsync !== 'function') return;
    const hash = JSON.stringify({
      enabled: snap.enabled,
      nodeCount: snap.nodeCount,
      localGenerationW: snap.localGenerationW,
      localDemandW: snap.localDemandW,
      localSurplusW: snap.localSurplusW,
      localDeficitW: snap.localDeficitW,
      strategy: snap.strategy,
      nodes: snap.nodes,
      intents: snap.intents,
      warning: snap.warning,
    });
    if (hash === this._lastHash && (Date.now() - (this._lastUpdate || 0)) < 5000) return;
    this._lastHash = hash;
    this._lastUpdate = Date.now();

/**
 * Code-Teil: set
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const set = async (id, val) => {
      try { await a.setStateAsync(id, { val, ack: true }); } catch (_e) {}
    };

    await set('meshMicrogrid.enabled', !!snap.enabled);
    await set('meshMicrogrid.version', MESH_MICROGRID_VERSION);
    await set('meshMicrogrid.status', snap.status || (snap.enabled ? 'ok' : 'disabled'));
    await set('meshMicrogrid.warning', snap.warning || '');
    await set('meshMicrogrid.lastUpdate', snap.ts || Date.now());
    await set('meshMicrogrid.readOnly', true);
    await set('meshMicrogrid.legalNote', 'EOS Mesh/Microgrid 0.8.32 ist ein read-only Datenmodell und schaltet keine Hardware.');
    await set('meshMicrogrid.summaryJson', JSON.stringify(snap));

    await set('meshMicrogrid.cluster.id', snap.clusterId);
    await set('meshMicrogrid.cluster.name', snap.clusterName);
    await set('meshMicrogrid.cluster.strategy', snap.strategy);
    await set('meshMicrogrid.cluster.nodeCount', snap.nodeCount);
    await set('meshMicrogrid.cluster.localGenerationW', snap.localGenerationW);
    await set('meshMicrogrid.cluster.localDemandW', snap.localDemandW);
    await set('meshMicrogrid.cluster.localSurplusW', snap.localSurplusW);
    await set('meshMicrogrid.cluster.localDeficitW', snap.localDeficitW);
    await set('meshMicrogrid.cluster.localUsePercent', snap.localUsePercent);
    await set('meshMicrogrid.cluster.gridLimitW', snap.gridLimitW);
    await set('meshMicrogrid.cluster.importLimitW', snap.importLimitW);
    await set('meshMicrogrid.cluster.exportLimitW', snap.exportLimitW);
    await set('meshMicrogrid.cluster.nodesJson', JSON.stringify(snap.nodes || []));
    await set('meshMicrogrid.cluster.intentsJson', JSON.stringify(snap.intents || []));

    await set('meshMicrogrid.microgrid.enabled', !!snap.enabled);
    await set('meshMicrogrid.microgrid.localFirstActive', !!(snap.microgridDecision && snap.microgridDecision.localFirstActive));
    await set('meshMicrogrid.microgrid.gridLastActive', !!(snap.microgridDecision && snap.microgridDecision.gridLast));
    await set('meshMicrogrid.microgrid.lastDecisionJson', JSON.stringify(snap.microgridDecision || {}));
    await set('meshMicrogrid.microgrid.mode', 'read-only-preview');

    await set('meshMicrogrid.export.schema', MESH_MICROGRID_VERSION);
    await set('meshMicrogrid.export.nodesJson', JSON.stringify(snap.nodes || []));
    await set('meshMicrogrid.export.ready', !!snap.enabled && (snap.nodeCount || 0) > 0);
  }
}

module.exports = { MeshMicrogridModule };
