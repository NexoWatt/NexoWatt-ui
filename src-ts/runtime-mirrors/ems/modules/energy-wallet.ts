// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/energy-wallet.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/modules/energy-wallet.js
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
 * Original-Hash: e2c903218112944508dc87e4abaf763ed1467c1b6bb08d4299ff2c164ae4e821
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
 * Quelle: src-ts/runtime-executables/ems/modules/energy-wallet.ts
 * Quell-Hash: sha256:a2fcb0750459979c89598f62ec2648b42c6b598b9c27e81a27c491e8b9e04de5
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/energy-wallet.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/modules/energy-wallet.js
 *
 * Zweck:
 * Berechnet das NexoWatt Energie-Wertkonto für Home und EOS. Das Modul ist bewusst
 * anzeigend/auswertend und schreibt keine Gerätesollwerte. Einstellungen bleiben im
 * Installer-/App-Center, das Kundenfrontend zeigt nur Wert, Nutzen und einfache Hinweise.
 *
 * 0.8.16:
 * - Tages-, Monats- und Jahreswerte werden getrennt persistiert.
 * - Neustarts übernehmen vorhandene ioBroker-State-Werte, wenn die Periodenschlüssel passen.
 * - Plausibilitätsdiagnosen verhindern blindes Integrieren bei fehlenden/stalen Quellen.
 */
'use strict';

const { BaseModule } = require('./base');

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
function num(v, fallback = null) {
  const n = Number(v);
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
function round(v, digits = 3) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Number(digits) || 0)));
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
function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Code-Teil: todayKeyLocal
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function todayKeyLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Code-Teil: monthKeyLocal
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function monthKeyLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Code-Teil: yearKeyLocal
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function yearKeyLocal(date = new Date()) {
  return String(date.getFullYear());
}

/**
 * Code-Teil: normalizePriceEurPerKwh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizePriceEurPerKwh(value, fallback) {
  const n = num(value, fallback);
  if (!Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  // Installer geben Preise häufig in ct/kWh ein. Werte >2 und <=500 interpretieren wir als ct/kWh.
  const eur = abs > 2 && abs <= 500 ? n / 100 : n;
  if (!Number.isFinite(eur) || eur < -2 || eur > 5) return fallback;
  return eur;
}

/**
 * Code-Teil: emptyAcc
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function emptyAcc() {
  return {
    pvKwh: 0,
    localUseKwh: 0,
    gridImportKwh: 0,
    gridExportKwh: 0,
    evcsKwh: 0,
    evcsSolarKwh: 0,
    storageChargeKwh: 0,
    storageDischargeKwh: 0,
    avoidedGridCostEur: 0,
    feedInValueEur: 0,
    evcsValueEur: 0,
    storageValueEur: 0,
    potentialAdditionalValueEur: 0,
  };
}

const ACC_KEYS = Object.keys(emptyAcc());

/**
 * Code-Teil: EnergyWalletModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class EnergyWalletModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    const now = new Date();
    this._lastTs = 0;
    this._dayKey = todayKeyLocal(now);
    this._monthKey = monthKeyLocal(now);
    this._yearKey = yearKeyLocal(now);
    this._primed = false;
    this._acc = emptyAcc();
    this._monthAcc = emptyAcc();
    this._yearAcc = emptyAcc();
    this._lastDiagnostics = this._emptyDiagnostics('init');
  }

  _emptyAcc() { return emptyAcc(); }

  _emptyDiagnostics(status = 'init') {
    return {
      status,
      warning: '',
      lastSkippedReason: '',
      dataQualityPercent: status === 'ok' ? 100 : 0,
      missingSources: [],
      staleSources: [],
      clippedSources: [],
      activeSources: {},
      updatedAt: Date.now(),
    };
  }

  async init() {
    await this._ensureStates();
    await this._primeFromStates();
    await this._publish('init');
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;

    await a.setObjectNotExistsAsync('energyWallet', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.today', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto heute' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.month', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto aktueller Monat' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.year', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto aktuelles Jahr' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.diagnostics', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto Diagnose' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.configuredPrices', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto konfigurierte Preise' },
      native: {},
    });

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

    await mk('energyWallet.enabled', 'Energie-Wertkonto aktiv', 'boolean', 'indicator', '', true);
    await mk('energyWallet.editionMode', 'Energie-Wertkonto Editionsmodus', 'string', 'text', '', 'home');
    await mk('energyWallet.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('energyWallet.lastExplanation', 'Letzte Erklärung', 'string', 'text', '', '');
    await mk('energyWallet.explanation', 'Erklärung für Nutzerfrontend', 'string', 'text', '', '');
    await mk('energyWallet.status', 'Status', 'string', 'text', '', 'init');
    await mk('energyWallet.summaryJson', 'Energie-Wertkonto Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('energyWallet.periodsJson', 'Energie-Wertkonto Perioden JSON', 'string', 'json', '', '{}');

    await this._ensurePeriodStates('energyWallet.today', 'Tag', this._dayKey, mk);
    await this._ensurePeriodStates('energyWallet.month', 'Monat', this._monthKey, mk);
    await this._ensurePeriodStates('energyWallet.year', 'Jahr', this._yearKey, mk);

    await mk('energyWallet.diagnostics.status', 'Diagnosestatus', 'string', 'text', '', 'init');
    await mk('energyWallet.diagnostics.warning', 'Diagnosehinweis', 'string', 'text', '', '');
    await mk('energyWallet.diagnostics.lastSkippedReason', 'Letzter übersprungener Grund', 'string', 'text', '', '');
    await mk('energyWallet.diagnostics.dataQualityPercent', 'Datenqualität', 'number', 'value.percent', '%', 0);
    await mk('energyWallet.diagnostics.missingSourcesJson', 'Fehlende Quellen JSON', 'string', 'json', '', '[]');
    await mk('energyWallet.diagnostics.staleSourcesJson', 'Veraltete Quellen JSON', 'string', 'json', '', '[]');
    await mk('energyWallet.diagnostics.clippedSourcesJson', 'Begrenzte Quellen JSON', 'string', 'json', '', '[]');
    await mk('energyWallet.diagnostics.activeSourcesJson', 'Aktive Quellen JSON', 'string', 'json', '', '{}');
    await mk('energyWallet.diagnostics.plausibilityJson', 'Plausibilitätsdiagnose JSON', 'string', 'json', '', '{}');

    await mk('energyWallet.configuredPrices.gridImportEurPerKwh', 'Netzbezugspreis', 'number', 'value.price', '€/kWh', 0.35);
    await mk('energyWallet.configuredPrices.feedInEurPerKwh', 'Einspeisewert', 'number', 'value.price', '€/kWh', 0.08);
  }

  async _ensurePeriodStates(prefix, keyLabel, defKey, mk) {
    await mk(`${prefix}.${prefix.endsWith('today') ? 'dayKey' : prefix.endsWith('month') ? 'monthKey' : 'yearKey'}`, keyLabel, 'string', 'text', '', defKey);
    await mk(`${prefix}.valueEur`, `Wert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.pvKwh`, `PV-Erzeugung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.localUseKwh`, `Lokal genutzte PV-Energie ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.localUsePercent`, `Lokale Nutzungsquote ${keyLabel.toLowerCase()}`, 'number', 'value.percent', '%', 0);
    await mk(`${prefix}.gridImportKwh`, `Netzbezug ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.gridExportKwh`, `Einspeisung/Rücklieferung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.evcsKwh`, `Ladepunkte Energie ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.evcsSolarKwh`, `Solar-Anteil Ladepunkte ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.storageChargeKwh`, `Speicherladung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.storageDischargeKwh`, `Speicherentladung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.avoidedGridCostEur`, `Vermiedener Netzbezug ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.feedInValueEur`, `Einspeisewert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.evcsValueEur`, `Solar-Ladepunktwert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.storageValueEur`, `Speicherwert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.potentialAdditionalValueEur`, `Zusätzliches lokales Nutzungspotenzial ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
  }

  async _primeFromStates() {
    if (this._primed) return;
    this._primed = true;
    const a = this.adapter;
    if (!a || typeof a.getStateAsync !== 'function') return;
    const now = new Date();
    this._dayKey = todayKeyLocal(now);
    this._monthKey = monthKeyLocal(now);
    this._yearKey = yearKeyLocal(now);
    try {
      this._acc = await this._primePeriod('energyWallet.today', 'dayKey', this._dayKey);
      this._monthAcc = await this._primePeriod('energyWallet.month', 'monthKey', this._monthKey);
      this._yearAcc = await this._primePeriod('energyWallet.year', 'yearKey', this._yearKey);
    } catch (_e) {
      this._acc = emptyAcc();
      this._monthAcc = emptyAcc();
      this._yearAcc = emptyAcc();
    }
  }

  async _primePeriod(prefix, keyName, expectedKey) {
    const a = this.adapter;
    const st = await a.getStateAsync(`${prefix}.${keyName}`);
    const stateKey = st && st.val ? String(st.val) : '';
    const acc = emptyAcc();
    if (stateKey !== expectedKey) return acc;
    for (const key of ACC_KEYS) {
      const stateId = `${prefix}.${key}`;
      const s = await a.getStateAsync(stateId);
      const v = num(s && s.val, null);
      if (Number.isFinite(v)) acc[key] = Math.max(0, v);
    }
    return acc;
  }

  _cacheEntry(key) {
    const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
    if (!cache || !key) return null;
    try {
      if (!Object.prototype.hasOwnProperty.call(cache, String(key))) return null;
      const rec = cache[String(key)];
      if (rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value')) return rec;
      if (rec !== undefined && rec !== null) return { value: rec, ts: Date.now() };
    } catch (_e) {}
    return null;
  }

  _readCacheCandidate(keys, options = {}) {
    const list = Array.isArray(keys) ? keys : [keys];
    const staleMs = Number.isFinite(Number(options.staleMs)) ? Number(options.staleMs) : 5 * 60 * 1000;
    const maxAbsW = Number.isFinite(Number(options.maxAbsW)) ? Math.max(1, Number(options.maxAbsW)) : 2_000_000;
    const positive = options.positive === true;
    const now = Date.now();
    const staleSeen = [];

    for (const key of list) {
      const rec = this._cacheEntry(key);
      if (!rec) continue;
      const vRaw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
      let v = num(vRaw, null);
      if (!Number.isFinite(v)) continue;
      const ts = Number(rec && rec.ts ? rec.ts : now);
      if (Number.isFinite(ts) && staleMs > 0 && now - ts > staleMs) {
        staleSeen.push(String(key));
        continue;
      }
      let clipped = false;
      if (positive && v < 0) {
        v = 0;
        clipped = true;
      }
      if (Math.abs(v) > maxAbsW) {
        v = Math.sign(v) * maxAbsW;
        clipped = true;
      }
      return { found: true, key: String(key), value: v, ts, staleSeen, clipped };
    }

    return { found: false, key: '', value: null, ts: 0, staleSeen, clipped: false };
  }

  _readCacheNumber(keys, fallback = null) {
    const c = this._readCacheCandidate(keys, { staleMs: this._staleMs(), maxAbsW: this._maxPlausiblePowerW() });
    return c && c.found && Number.isFinite(Number(c.value)) ? Number(c.value) : fallback;
  }

  _cfg() {
    return (this.adapter && this.adapter.config && this.adapter.config.energyWallet && typeof this.adapter.config.energyWallet === 'object')
      ? this.adapter.config.energyWallet
      : {};
  }

  _staleMs() {
    const cfg = this._cfg();
    const sec = Number(cfg.staleTimeoutSec !== undefined ? cfg.staleTimeoutSec : (cfg.plausibilityStaleTimeoutSec !== undefined ? cfg.plausibilityStaleTimeoutSec : 300));
    return Math.round(clamp(Number.isFinite(sec) ? sec : 300, 30, 3600) * 1000);
  }

  _maxPlausiblePowerW() {
    const cfg = this._cfg();
    const raw = cfg.plausibilityMaxPowerW !== undefined ? cfg.plausibilityMaxPowerW : (cfg.maxPlausiblePowerW !== undefined ? cfg.maxPlausiblePowerW : 2_000_000);
    return Math.round(clamp(raw, 1000, 50_000_000));
  }

  _prices() {
    const cfg = this._cfg();
    const tariffNow = this._readCacheNumber(['priceCurrent', 'tarif.priceCurrent', 'tariff.priceCurrent'], null);
    const gridImport = normalizePriceEurPerKwh(
      cfg.gridImportEurPerKwh !== undefined ? cfg.gridImportEurPerKwh : (cfg.importPriceEurPerKwh !== undefined ? cfg.importPriceEurPerKwh : (cfg.importPriceEurKwh !== undefined ? cfg.importPriceEurKwh : (cfg.gridImportCtKwh !== undefined ? cfg.gridImportCtKwh : tariffNow))),
      0.35
    );
    const feedIn = normalizePriceEurPerKwh(
      cfg.feedInEurPerKwh !== undefined ? cfg.feedInEurPerKwh : (cfg.feedInPriceEurPerKwh !== undefined ? cfg.feedInPriceEurPerKwh : (cfg.feedInPriceEurKwh !== undefined ? cfg.feedInPriceEurKwh : (cfg.feedInCtKwh !== undefined ? cfg.feedInCtKwh : undefined))),
      0.08
    );
    const evcsValue = normalizePriceEurPerKwh(
      cfg.evcsValueEurPerKwh !== undefined ? cfg.evcsValueEurPerKwh : (cfg.evcsValueEurKwh !== undefined ? cfg.evcsValueEurKwh : gridImport),
      gridImport
    );
    return {
      gridImportEurPerKwh: gridImport,
      feedInEurPerKwh: feedIn,
      evcsValueEurPerKwh: evcsValue,
    };
  }

  _snapshotPower() {
    const staleMs = this._staleMs();
    const maxAbsW = this._maxPlausiblePowerW();
    const missingSources = [];
    const staleSources = [];
    const clippedSources = [];
    const activeSources = {};

/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const read = (label, keys, opts = {}) => {
      const c = this._readCacheCandidate(keys, { staleMs, maxAbsW, positive: opts.positive === true });
      if (c.staleSeen && c.staleSeen.length) staleSources.push(...c.staleSeen.map(k => `${label}:${k}`));
      if (c.found) {
        activeSources[label] = c.key;
        if (c.clipped) clippedSources.push(`${label}:${c.key}`);
        return c;
      }
      return c;
    };

    const pv = read('pv', ['ems.budget.pvPowerW', 'pvPower', 'productionPowerW', 'derived.core.pv.totalW'], { positive: true });
    const signedGrid = read('gridSigned', ['ems.gridPowerRawW', 'ems.gridPowerW', 'gridPower', 'gridPowerW'], {});
    const gridBuy = read('gridImport', ['gridBuyPower'], { positive: true });
    const gridSell = read('gridExport', ['gridSellPower'], { positive: true });
    const evcs = read('evcs', ['chargingManagement.control.usedW', 'consumptionEvcs', 'evcs.totalPowerW', 'evcsPower'], { positive: true });
    const storageCharge = read('storageCharge', ['storageFarm.totalChargePowerW', 'storageChargePower'], { positive: true });
    const storageDischarge = read('storageDischarge', ['storageFarm.totalDischargePowerW', 'storageDischargePower'], { positive: true });
    const batterySigned = read('batterySigned', ['batteryPower', 'storagePower'], {});

    const hasPvSource = !!pv.found;
    const hasGridSource = !!(signedGrid.found || gridBuy.found || gridSell.found);
    if (!hasPvSource) missingSources.push('pvPower');
    if (!hasGridSource) missingSources.push('gridPower');

    const pvW = hasPvSource ? Math.max(0, Number(pv.value) || 0) : 0;
    const signedGridW = signedGrid.found ? Number(signedGrid.value) : null;
    const importFallback = Number.isFinite(Number(signedGridW)) ? Math.max(0, Number(signedGridW)) : 0;
    const exportFallback = Number.isFinite(Number(signedGridW)) ? Math.max(0, -Number(signedGridW)) : 0;
    const gridImportW = gridBuy.found ? Math.max(0, Number(gridBuy.value) || 0) : importFallback;
    const gridExportW = gridSell.found ? Math.max(0, Number(gridSell.value) || 0) : exportFallback;
    const evcsW = evcs.found ? Math.max(0, Number(evcs.value) || 0) : 0;

    let storageChargeW = storageCharge.found ? Math.max(0, Number(storageCharge.value) || 0) : 0;
    let storageDischargeW = storageDischarge.found ? Math.max(0, Number(storageDischarge.value) || 0) : 0;
    if (batterySigned.found) {
      const b = Number(batterySigned.value);
      if (storageChargeW <= 0 && b < 0) storageChargeW = Math.max(0, -b);
      if (storageDischargeW <= 0 && b > 0) storageDischargeW = Math.max(0, b);
    }

    const plausibleBalanceWarn = (hasPvSource && hasGridSource && pvW <= 0 && gridExportW > 200)
      ? 'Einspeisung erkannt, aber PV-Leistung ist 0 W. Bitte PV- oder Netz-Vorzeichen prüfen.'
      : '';

    let dataQualityPercent = 100;
    if (!hasPvSource) dataQualityPercent -= 45;
    if (!hasGridSource) dataQualityPercent -= 45;
    if (staleSources.length) dataQualityPercent -= Math.min(25, staleSources.length * 8);
    if (clippedSources.length) dataQualityPercent -= Math.min(25, clippedSources.length * 12);
    if (plausibleBalanceWarn) dataQualityPercent -= 15;
    dataQualityPercent = clamp(dataQualityPercent, 0, 100);

    let status = 'ok';
    let warning = '';
    if (!hasPvSource || !hasGridSource) {
      status = 'waiting-data';
      warning = `Energie-Wertkonto wartet auf ${missingSources.join(' und ')}.`;
    } else if (staleSources.length || clippedSources.length || plausibleBalanceWarn) {
      status = 'warn';
      warning = plausibleBalanceWarn || 'Einige Eingangswerte sind veraltet oder wurden plausibilisiert.';
    }

    const integratable = hasPvSource && hasGridSource && dataQualityPercent >= 40;

    const diagnostics = {
      status,
      warning,
      lastSkippedReason: integratable ? '' : (missingSources.length ? `missing:${missingSources.join(',')}` : 'low-quality'),
      dataQualityPercent: round(dataQualityPercent, 0),
      missingSources,
      staleSources,
      clippedSources,
      activeSources,
      updatedAt: Date.now(),
    };

    return { pvW, gridImportW, gridExportW, evcsW, storageChargeW, storageDischargeW, diagnostics, integratable };
  }

  _isEnabled() {
    const cfg = this._cfg();
    return cfg.enabled !== false;
  }

  async tick() {
    if (!this._isEnabled()) {
      this._lastDiagnostics = this._emptyDiagnostics('disabled');
      try { await this.adapter.setStateAsync('energyWallet.enabled', false, true); } catch (_e) {}
      return;
    }

    const now = Date.now();
    const date = new Date(now);
    const currentDay = todayKeyLocal(date);
    const currentMonth = monthKeyLocal(date);
    const currentYear = yearKeyLocal(date);

    let resetStatus = '';
    if (currentYear !== this._yearKey) {
      this._yearKey = currentYear;
      this._yearAcc = emptyAcc();
      resetStatus = 'reset-year';
    }
    if (currentMonth !== this._monthKey) {
      this._monthKey = currentMonth;
      this._monthAcc = emptyAcc();
      resetStatus = resetStatus || 'reset-month';
    }
    if (currentDay !== this._dayKey) {
      this._dayKey = currentDay;
      this._acc = emptyAcc();
      this._lastTs = now;
      resetStatus = resetStatus || 'reset-day';
      await this._publish(resetStatus);
      return;
    }

    if (!this._lastTs) {
      this._lastTs = now;
      await this._publish('ready');
      return;
    }

    const dtMsRaw = now - this._lastTs;
    this._lastTs = now;
    // Schutz gegen Neustart-/Sleep-Ausreißer. Lange Lücken nicht blind integrieren.
    if (!Number.isFinite(dtMsRaw) || dtMsRaw < 250 || dtMsRaw > 10 * 60 * 1000) {
      this._lastDiagnostics = {
        ...this._emptyDiagnostics('skip-interval'),
        lastSkippedReason: 'interval-out-of-range',
        warning: 'Das Energie-Wertkonto hat eine unplausible Zeitlücke übersprungen.',
        dataQualityPercent: 0,
      };
      await this._publish('skip-interval');
      return;
    }

    const p = this._snapshotPower();
    this._lastDiagnostics = p.diagnostics || this._emptyDiagnostics('ok');
    if (!p.integratable) {
      await this._publish(p.diagnostics && p.diagnostics.status ? p.diagnostics.status : 'waiting-data');
      return;
    }

    const hours = dtMsRaw / 3600000;
    const prices = this._prices();

    const pvKwh = p.pvW / 1000 * hours;
    const exportKwh = p.gridExportW / 1000 * hours;
    const importKwh = p.gridImportW / 1000 * hours;
    const evcsKwh = p.evcsW / 1000 * hours;
    const chargeKwh = p.storageChargeW / 1000 * hours;
    const dischargeKwh = p.storageDischargeW / 1000 * hours;
    const localUseKwh = Math.max(0, pvKwh - exportKwh);
    const evcsSolarKwh = Math.min(evcsKwh, localUseKwh);

    const avoidedGridCost = localUseKwh * prices.gridImportEurPerKwh;
    const feedInValue = exportKwh * prices.feedInEurPerKwh;
    const evcsValue = evcsSolarKwh * prices.evcsValueEurPerKwh;
    const storageValue = Math.min(chargeKwh, localUseKwh) * Math.max(0, prices.gridImportEurPerKwh - prices.feedInEurPerKwh);
    const potential = exportKwh * Math.max(0, prices.gridImportEurPerKwh - prices.feedInEurPerKwh);

    const delta = {
      pvKwh,
      localUseKwh,
      gridImportKwh: importKwh,
      gridExportKwh: exportKwh,
      evcsKwh,
      evcsSolarKwh,
      storageChargeKwh: chargeKwh,
      storageDischargeKwh: dischargeKwh,
      avoidedGridCostEur: avoidedGridCost,
      feedInValueEur: feedInValue,
      evcsValueEur: evcsValue,
      storageValueEur: storageValue,
      potentialAdditionalValueEur: potential,
    };

    this._addDelta(this._acc, delta);
    this._addDelta(this._monthAcc, delta);
    this._addDelta(this._yearAcc, delta);

    await this._publish(p.diagnostics && p.diagnostics.status === 'warn' ? 'warn' : 'ok');
  }

  _addDelta(target, delta) {
    for (const key of ACC_KEYS) {
      const v = Number(delta[key]);
      if (Number.isFinite(v)) target[key] = Math.max(0, Number(target[key] || 0) + v);
    }
  }

  _periodSummary(acc, key) {
    const localUsePercent = acc.pvKwh > 0 ? (acc.localUseKwh / acc.pvKwh * 100) : 0;
    const valueEur = acc.avoidedGridCostEur + acc.feedInValueEur;
    return {
      key,
      valueEur: round(valueEur, 2),
      pvKwh: round(acc.pvKwh, 3),
      localUseKwh: round(acc.localUseKwh, 3),
      localUsePercent: round(localUsePercent, 1),
      gridImportKwh: round(acc.gridImportKwh, 3),
      gridExportKwh: round(acc.gridExportKwh, 3),
      evcsKwh: round(acc.evcsKwh, 3),
      evcsSolarKwh: round(acc.evcsSolarKwh, 3),
      storageChargeKwh: round(acc.storageChargeKwh, 3),
      storageDischargeKwh: round(acc.storageDischargeKwh, 3),
      avoidedGridCostEur: round(acc.avoidedGridCostEur, 2),
      feedInValueEur: round(acc.feedInValueEur, 2),
      evcsValueEur: round(acc.evcsValueEur, 2),
      storageValueEur: round(acc.storageValueEur, 2),
      potentialAdditionalValueEur: round(acc.potentialAdditionalValueEur, 2),
    };
  }

  _summary(status) {
    const prices = this._prices();
    const today = this._periodSummary(this._acc, this._dayKey);
    const month = this._periodSummary(this._monthAcc, this._monthKey);
    const year = this._periodSummary(this._yearAcc, this._yearKey);
    const editionMode = this._isEos() ? 'eos' : 'home';
    const diagnostics = this._lastDiagnostics || this._emptyDiagnostics(status);
    const explanation = this._buildExplanation(today.valueEur, today.localUsePercent, diagnostics, month, year);
    return {
      status,
      dayKey: this._dayKey,
      monthKey: this._monthKey,
      yearKey: this._yearKey,
      editionMode,
      prices,
      valueEur: today.valueEur,
      ...today,
      explanation,
      today,
      month,
      year,
      diagnostics,
      updatedAt: Date.now(),
    };
  }

  _isEos() {
    const info = this.adapter && this.adapter._nwLicenseInfo && typeof this.adapter._nwLicenseInfo === 'object' ? this.adapter._nwLicenseInfo : {};
    return String(info.edition || '').trim().toLowerCase() === 'eos';
  }

  _buildExplanation(valueEur, localUsePercent, diagnostics, month, year) {
    const v = Number(valueEur) || 0;
    const pct = Number(localUsePercent) || 0;
    if (diagnostics && diagnostics.status === 'waiting-data') return diagnostics.warning || 'Das Energie-Wertkonto wartet auf vollständige PV- und Netzdaten.';
    if (diagnostics && diagnostics.status === 'warn' && diagnostics.warning) return diagnostics.warning;
    if (this._acc.pvKwh <= 0.001 && (month.valueEur || 0) > 0) return `Heute wartet das Energie-Wertkonto auf PV-Erzeugung. Im aktuellen Monat sind bereits ${round(month.valueEur, 2)} € Energiewert entstanden.`;
    if (this._acc.pvKwh <= 0.001 && (year.valueEur || 0) > 0) return `Heute wartet das Energie-Wertkonto auf PV-Erzeugung. Dieses Jahr sind bereits ${round(year.valueEur, 2)} € Energiewert entstanden.`;
    if (this._acc.pvKwh <= 0.001) return 'Das Energie-Wertkonto wartet auf PV-Erzeugung.';
    if (pct >= 80) return `Sehr gute lokale Nutzung: ${Math.round(pct)} % deines erzeugten Stroms wurden lokal genutzt.`;
    if (this._acc.gridExportKwh > 0.5) return `Heute wurden ${round(this._acc.gridExportKwh, 1)} kWh eingespeist. Mehr lokale Nutzung könnte den Anlagenwert erhöhen.`;
    return `Heute hat deine Anlage bisher ${round(v, 2)} € Energiewert erzeugt.`;
  }

  async _publish(status) {
    const a = this.adapter;
    if (!a || typeof a.setStateAsync !== 'function') return;
    const s = this._summary(status);
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
      try {
        await a.setStateAsync(id, val, true);
        if (typeof a.updateValue === 'function') a.updateValue(id, val, Date.now());
      } catch (_e) {}
    };

    await set('energyWallet.enabled', this._isEnabled());
    await set('energyWallet.editionMode', s.editionMode);
    await set('energyWallet.lastUpdate', s.updatedAt);
    await set('energyWallet.lastExplanation', s.explanation);
    await set('energyWallet.explanation', s.explanation);
    await set('energyWallet.status', s.status);
    await set('energyWallet.summaryJson', JSON.stringify(s));
    await set('energyWallet.periodsJson', JSON.stringify({ today: s.today, month: s.month, year: s.year }));

    await this._publishPeriod('energyWallet.today', 'dayKey', s.dayKey, s.today, set);
    await this._publishPeriod('energyWallet.month', 'monthKey', s.monthKey, s.month, set);
    await this._publishPeriod('energyWallet.year', 'yearKey', s.yearKey, s.year, set);

    const d = s.diagnostics || this._emptyDiagnostics(s.status);
    await set('energyWallet.diagnostics.status', d.status || s.status);
    await set('energyWallet.diagnostics.warning', d.warning || '');
    await set('energyWallet.diagnostics.lastSkippedReason', d.lastSkippedReason || '');
    await set('energyWallet.diagnostics.dataQualityPercent', round(d.dataQualityPercent, 0));
    await set('energyWallet.diagnostics.missingSourcesJson', JSON.stringify(d.missingSources || []));
    await set('energyWallet.diagnostics.staleSourcesJson', JSON.stringify(d.staleSources || []));
    await set('energyWallet.diagnostics.clippedSourcesJson', JSON.stringify(d.clippedSources || []));
    await set('energyWallet.diagnostics.activeSourcesJson', JSON.stringify(d.activeSources || {}));
    await set('energyWallet.diagnostics.plausibilityJson', JSON.stringify(d));

    await set('energyWallet.configuredPrices.gridImportEurPerKwh', round(s.prices.gridImportEurPerKwh, 4));
    await set('energyWallet.configuredPrices.feedInEurPerKwh', round(s.prices.feedInEurPerKwh, 4));
  }

  async _publishPeriod(prefix, keyName, periodKey, summary, set) {
    await set(`${prefix}.${keyName}`, periodKey);
    await set(`${prefix}.valueEur`, summary.valueEur);
    await set(`${prefix}.pvKwh`, summary.pvKwh);
    await set(`${prefix}.localUseKwh`, summary.localUseKwh);
    await set(`${prefix}.localUsePercent`, summary.localUsePercent);
    await set(`${prefix}.gridImportKwh`, summary.gridImportKwh);
    await set(`${prefix}.gridExportKwh`, summary.gridExportKwh);
    await set(`${prefix}.evcsKwh`, summary.evcsKwh);
    await set(`${prefix}.evcsSolarKwh`, summary.evcsSolarKwh);
    await set(`${prefix}.storageChargeKwh`, summary.storageChargeKwh);
    await set(`${prefix}.storageDischargeKwh`, summary.storageDischargeKwh);
    await set(`${prefix}.avoidedGridCostEur`, summary.avoidedGridCostEur);
    await set(`${prefix}.feedInValueEur`, summary.feedInValueEur);
    await set(`${prefix}.evcsValueEur`, summary.evcsValueEur);
    await set(`${prefix}.storageValueEur`, summary.storageValueEur);
    await set(`${prefix}.potentialAdditionalValueEur`, summary.potentialAdditionalValueEur);
  }
}

module.exports = { EnergyWalletModule };
