// @ts-nocheck
/**
 * Executable TypeScript source: ems/module-manager.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/module-manager.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/module-manager.js
 * Rolle im Projekt: EMS-Modulmanager.
 * Zweck: Initialisiert optionale EMS-Module abhängig von Konfiguration und Lizenz.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Modulverwaltung: registriert, initialisiert und tickt die einzelnen EMS-Module.
 * Zusammenhänge:
 * - Module liegen unter ems/modules/*.js und erben meist von BaseModule.
 * - Fehler in einem Modul dürfen den gesamten Adapter möglichst nicht abschießen.
 * Wartungshinweise:
 * - Neue Module hier nur mit klaren Lifecycle-Methoden einhängen.
 */

'use strict';

const { SpeicherMappingModule } = require('./modules/storage-mapping');
const { SpeicherRegelungModule } = require('./modules/storage-control');
const { GridConstraintsModule } = require('./modules/grid-constraints');
const { PeakShavingModule } = require('./modules/peak-shaving');
const { TarifVisModule } = require('./modules/tarif-vis');
const { PvForecastModule } = require('./modules/pv-forecast');
const { ChargingManagementModule } = require('./modules/charging-management');
const { MultiUseModule } = require('./modules/multi-use');
const { Para14aModule } = require('./modules/para14a');
const { CoreLimitsModule } = require('./modules/core-limits');
const { ThermalControlModule } = require('./modules/thermal-control');
const { HeatingRodControlModule } = require('./modules/heating-rod-control');
const { BhkwControlModule } = require('./modules/bhkw-control');
const { GeneratorControlModule } = require('./modules/generator-control');
const { ThresholdControlModule } = require('./modules/threshold-control');
const { AiAdvisorModule } = require('./modules/ai-advisor');
const { CountryProfileModule } = require('./modules/country-profile');
const { EnergyWalletModule } = require('./modules/energy-wallet');
const { ChargeKioskModule } = require('./modules/charge-kiosk');
const { EnergyLedgerModule } = require('./modules/energy-ledger');
const featureFlags = require('./services/feature-flags');

/**
 * Code-Teil: Klasse `ModuleManager`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ModuleManager. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Modulverwaltung für installierte EMS-Apps und Modul-Lifecycle.
/**
 * Klasse: ModuleManager
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ModuleManager {
    /**
     * @param {any} adapter
     * @param {*} dpRegistry
     */
    constructor(adapter, dpRegistry) {
        this.adapter = adapter;
        this.dp = dpRegistry || null;

        /** @type {Array<{key: string, instance: any, enabledFn: () => boolean}>} */
        this.modules = [];

        this._lastDiagLogMs = 0;
        this._lastDiagWriteMs = 0;
        this._tickCount = 0;

        // Last tick diagnostics (always captured, even if diagnostics are disabled)
        /**
         * @type {{
         *   ts: number,
         *   totalMs: number,
         *   results: Array<{key: string, enabled: boolean, ok: boolean, ms: number, error?: string}>,
         *   errors: Array<string>
         * }|null}
         */
        this.lastTickDiag = null;
    }

    /**
     * Code-Teil: Methode `_getDiagCfg`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getDiagCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _licenseEdition() {
        const info = this.adapter && this.adapter._nwLicenseInfo && typeof this.adapter._nwLicenseInfo === 'object' ? this.adapter._nwLicenseInfo : {};
        if (info && info.ok === true) {
            try { return featureFlags.normalizeEdition(info.edition || 'eos'); } catch (_e) {}
            const e = String(info.edition || 'eos').toLowerCase();
            return (e === 'hems' || e === 'home') ? 'hems' : 'eos';
        }
        return 'none';
    }

    _licenseAllowsApp(appId) {
        const edition = this._licenseEdition();
        try {
            if (featureFlags && typeof featureFlags.allowsApp === 'function') {
                return !!featureFlags.allowsApp(edition, String(appId || ''));
            }
        } catch (_e) {}
        if (edition === 'eos') return true;
        if (edition !== 'hems') return false;
        const hemsApps = new Set(['charging', 'storage', 'thermal', 'heatingrod', 'threshold', 'relay', 'aiAdvisor', 'tariff', 'para14a', 'energyWallet']);
        return hemsApps.has(String(appId || ''));
    }

    _getDiagCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        const enabled = !!(cfg && cfg.enabled);
        const writeStates = enabled && (cfg.writeStates !== false);
        const logLevel = (cfg && (cfg.logLevel === 'info' || cfg.logLevel === 'debug')) ? cfg.logLevel : 'debug';

        const maxJsonLenNum = cfg ? Number(cfg.maxJsonLen) : NaN;
        const maxJsonLen = (Number.isFinite(maxJsonLenNum) && maxJsonLenNum >= 1000) ? maxJsonLenNum : 20000;

        const logIntSecNum = cfg ? Number(cfg.logIntervalSec) : NaN;
        const logIntervalSec = (Number.isFinite(logIntSecNum) && logIntSecNum >= 0) ? logIntSecNum : 10;
        const logIntervalMs = Math.round(logIntervalSec * 1000);

        const stIntSecNum = cfg ? Number(cfg.stateIntervalSec) : NaN;
        const stateIntervalSec = (Number.isFinite(stIntSecNum) && stIntSecNum >= 0) ? stIntSecNum : 10;
        const stateIntervalMs = Math.round(stateIntervalSec * 1000);

        const alwaysOnError = enabled && (cfg ? (cfg.alwaysOnError !== false) : true);

        return { enabled, writeStates, logLevel, maxJsonLen, logIntervalMs, stateIntervalMs, alwaysOnError };
    }


    /**
     * Code-Teil: Methode `_diagLog`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _diagLog
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _diagLog(level, msg) {
        const lvl = (level === 'info' || level === 'debug') ? level : 'debug';
        const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[lvl] === 'function')
            ? this.adapter.log[lvl]
            : (this.adapter && this.adapter.log ? this.adapter.log.debug : null);
        try {
            if (fn) fn.call(this.adapter.log, msg);
        } catch {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_limitJson`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _limitJson
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _limitJson(obj, maxLen) {
        let s = '';
        try {
            s = JSON.stringify(obj);
        } catch {
            s = '[]';
        }
        if (!maxLen || !Number.isFinite(maxLen) || maxLen < 1000) maxLen = 20000;
        return s.length > maxLen ? (s.slice(0, maxLen) + '...') : s;
    }

    /**
     * Code-Teil: Methode `init`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        // Länderprofil / Systemsprache – immer aktiv, damit DE/NL und UI-Sprache zentral bereitstehen.
        this.modules.push({
            key: 'countryProfile',
            instance: new CountryProfileModule(this.adapter, this.dp),
            enabledFn: () => true,
        });

        // Speicher-Zuordnung (Installateur) – registriert st.* Datenpunkte
        this.modules.push({
            key: 'speicherMapping',
            instance: new SpeicherMappingModule(this.adapter, this.dp),
            enabledFn: () => true,
        });

        // Grid constraints (RLM / Nulleinspeisung)
        this.modules.push({
            key: 'gridConstraints',
            instance: new GridConstraintsModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('grid') && !!this.adapter.config.enableGridConstraints,
        });

        // Peak shaving
        this.modules.push({
            key: 'peakShaving',
            instance: new PeakShavingModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('peak') && (!!this.adapter.config.enablePeakShaving || !!(this.adapter.config.peakShaving && this.adapter.config.peakShaving.atypical && this.adapter.config.peakShaving.atypical.enabled)),
        });

        // §14a EnWG (steuerbare Verbrauchseinrichtungen)
        // Runs BEFORE Charging-Management so it can provide caps via adapter._para14a.
        this.modules.push({
            key: 'para14a',
            instance: new Para14aModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('para14a') && !!(this.adapter?.config?.installerConfig?.para14a),
        });

        // Tarif (VIS) – stellt Ladepark-Deckel bereit
        this.modules.push({
            key: 'tarifVis',
            instance: new TarifVisModule(this.adapter, this.dp),
            enabledFn: () => true,
        });

        // PV Forecast (Provider-agnostisch) – liefert kWh/24h usw. für PV-aware Strategien
        // Runs after Tarife (independent), before storage-control so the snapshot is fresh.
        this.modules.push({
            key: 'pvForecast',
            instance: new PvForecastModule(this.adapter, this.dp),
            enabledFn: () => true,
        });

        // Core Caps/Budgets (Snapshot) – runs after sources (peak/tariff/14a) and before actuators.
        this.modules.push({
            key: 'coreLimits',
            instance: new CoreLimitsModule(this.adapter, this.dp),
            enabledFn: () => true,
        });

        // Charging management
        this.modules.push({
            key: 'chargingManagement',
            instance: new ChargingManagementModule(this.adapter, this.dp),
            enabledFn: () => {
                if (!this._licenseAllowsApp('charging')) return false;
                // Backwards compatible default:
                // Older installations may not have the new EMS config persisted yet.
                // If the flag is missing (undefined/null), we enable the module so the
                // runtime control states exist and the EVCS page can operate consistently.
                // If the user explicitly disables it in Admin, we respect that.
                const v = this.adapter && this.adapter.config ? this.adapter.config.enableChargingManagement : undefined;
                if (typeof v === 'boolean') return v;

                // Safe-ish default for upgrades: enable if there is at least one configured
                // chargepoint entry (EVCS list/table). Even without mapped setpoints, the
                // module will simply not write anything, but it will expose states.
                try {
                    const cnt = Number(this.adapter && this.adapter.config && this.adapter.config.settingsConfig && this.adapter.config.settingsConfig.evcsCount);
                    if (Number.isFinite(cnt) && cnt > 0) return true;
                    const list = (this.adapter && Array.isArray(this.adapter.evcsList)) ? this.adapter.evcsList : [];
                    if (list && list.length) return true;
                } catch {
                    // ignore
                }
                return false;
            },
        });

        // Energie-Wertkonto (read-only): Home + EOS. Bewertet PV-Nutzung in Euro, schaltet aber nichts.
        this.modules.push({
            key: 'energyWallet',
            instance: new EnergyWalletModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('energyWallet') && !(
                this.adapter && this.adapter.config && this.adapter.config.energyWallet && this.adapter.config.energyWallet.enabled === false
            ),
        });

        // EOS DC Station Display / Charge Kiosk: tokenisierte Display-Seiten pro DC-Ladestation.
        this.modules.push({
            key: 'chargeKiosk',
            instance: new ChargeKioskModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('chargeKiosk') && !!(
                this.adapter && this.adapter.config && (
                    this.adapter.config.enableChargeKiosk === true ||
                    (this.adapter.config.chargeKiosk && this.adapter.config.chargeKiosk.enabled === true)
                )
            ),
        });

        // EOS Local kWh Ledger: read-only Grundlage für Betreiberwerte, spätere Abrechnung,
        // Nachbarschaftsversorgung und Microgrid/Energy-Hub-Logik. Das Modul nutzt neutrale
        // NexoWatt-Sessiondaten und ist bewusst nicht auf OCPP oder einen Hersteller begrenzt.
        this.modules.push({
            key: 'energyLedger',
            instance: new EnergyLedgerModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('energyLedger') && !!(
                this.adapter && this.adapter.config && (
                    this.adapter.config.enableEnergyLedger === true ||
                    (this.adapter.config.energyLedger && this.adapter.config.energyLedger.enabled === true) ||
                    (this.adapter.config.chargeKiosk && this.adapter.config.chargeKiosk.enabled === true)
                )
            ),
        });

        // Speicher-Regelung (Sollleistung/Reserve/PV/Lastspitze)
        // Läuft NACH dem Lademanagement, damit EVCS-StorageAssist im gleichen Tick berücksichtigt wird.
        this.modules.push({
            key: 'speicherRegelung',
            instance: new SpeicherRegelungModule(this.adapter, this.dp),
            // Wichtig: Die Speicherregelung muss auch dann laufen können, wenn der Installateur
            // das Modul nicht explizit aktiviert hat, der Endkunde aber den dynamischen Tarif
            // (VIS) nutzt. Die eigentliche Schreiblogik entscheidet im Modul selbst, ob
            // tatsächlich Setpoints geschrieben werden (Failsafe).
            enabledFn: () => this._licenseAllowsApp('storage'),
        });

        // Thermische Steuerung (Wärmepumpe/Klima)
        // Läuft NACH dem Lademanagement, damit PV‑Restbudget (pvCapEffective - EVCS used)
        // innerhalb des gleichen Ticks genutzt werden kann.
        this.modules.push({
            key: 'thermalControl',
            instance: new ThermalControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('thermal') && !!this.adapter.config.enableThermalControl,
        });

        // Gestufte Heizstäbe (native 1..12 Stufen)
        // Läuft NACH der Thermik. Damit bekommen Wärmepumpen/Klima zuerst das PV‑Budget,
        // Heizstäbe nutzen anschließend den verbleibenden Restüberschuss.
        this.modules.push({
            key: 'heatingRodControl',
            instance: new HeatingRodControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('heatingrod') && !!this.adapter.config.enableHeatingRodControl,
        });

        // BHKW Steuerung (Start/Stop, SoC-geführt)
        this.modules.push({
            key: 'bhkwControl',
            instance: new BhkwControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('bhkw') && !!this.adapter.config.enableBhkwControl,
        });

        this.modules.push({
            key: 'generatorControl',
            instance: new GeneratorControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('generator') && !!this.adapter.config.enableGeneratorControl,
        });

        // Schwellwertsteuerung (generische Regeln)
        // Läuft NACH der Thermik, damit PV‑Restbudget bereits berücksichtigt ist (falls relevant).
        this.modules.push({
            key: 'thresholdControl',
            instance: new ThresholdControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('threshold') && !!this.adapter.config.enableThresholdControl,
        });



        // KI‑Energieberater / KI‑Optimierung (advisory only)
        // Runs late in the tick so it can read the fresh budget/tariff/peak/storage snapshots.
        this.modules.push({
            key: 'aiAdvisor',
            instance: new AiAdvisorModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('aiAdvisor') && !!(this.adapter.config.enableAiAdvisor || this.adapter.config.enableAiOptimization),
        });

        // Multi use (future)
        this.modules.push({
            key: 'multiUse',
            instance: new MultiUseModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('multiuse') && !!this.adapter.config.enableMultiUse,
        });

        // Init modules
        // Hinweis: Einige Module stellen UI-States bereit (z. B. EVCS), die auch dann
        // vorhanden sein sollen, wenn die Logik aktuell deaktiviert ist.
        const alwaysInit = new Set(['chargingManagement', 'aiAdvisor', 'energyWallet']);
        for (const m of this.modules) {
            const enabled = !!(m && typeof m.enabledFn === 'function' ? m.enabledFn() : false);
            m.enabled = enabled;
            const shouldInit = enabled || alwaysInit.has(m.key);
            if (!shouldInit) continue;
            if (typeof m.instance.init !== 'function') continue;
            try {
                await m.instance.init();
            } catch (e) {
                this.adapter.log.warn(`Module '${m.key}' init error: ${e?.message || e}`);
            }
        }
    }

    
    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        const diag = this._getDiagCfg();
        const now = Date.now();
        const t0 = now;
        this._tickCount = (this._tickCount || 0) + 1;

        /** @type {Array<{key: string, enabled: boolean, ok: boolean, ms: number, error?: string}>} */
        const results = [];
        /** @type {Array<string>} */
        const errors = [];

        for (const m of this.modules) {
            const enabled = !!(m && typeof m.enabledFn === 'function' && m.enabledFn());
            const key = String((m && m.key) || 'unknown');
            if (!enabled || !m || !m.instance || typeof m.instance.tick !== 'function') {
                results.push({ key, enabled: false, ok: true, ms: 0 });
                continue;
            }

            const t1 = Date.now();
            let ok = true;
            let errMsg = '';
            try {
                await m.instance.tick();
            } catch (e) {
                ok = false;
                errMsg = String((e && e.message) ? e.message : e);
                errors.push(`${key}: ${errMsg}`);
                this.adapter.log.warn(`Modul '${key}': Fehler im Regel-Tick: ${errMsg}`);
            }
            const ms = Date.now() - t1;
            results.push({ key, enabled: true, ok, ms, ...(ok ? {} : { error: errMsg }) });
        }

        const totalMs = Date.now() - t0;

        // Persist last results for UI/Installer APIs
        try {
            this.lastTickDiag = {
                ts: now,
                totalMs,
                results,
                errors,
            };
        } catch (_e) {
            // ignore
        }

        if (!diag.enabled) return;

        const hasError = errors.length > 0;
        const shouldLog = (diag.logIntervalMs <= 0)
            || ((now - (this._lastDiagLogMs || 0)) >= diag.logIntervalMs)
            || (diag.alwaysOnError && hasError);

        const shouldWrite = diag.writeStates && (
            (diag.stateIntervalMs <= 0)
            || ((now - (this._lastDiagWriteMs || 0)) >= diag.stateIntervalMs)
            || (diag.alwaysOnError && hasError)
        );

        const parts = results
            .filter(r => r.enabled)
            .map(r => `${r.key}:${r.ms}ms${r.ok ? '' : '!'}`);
        const summary = `tick ${totalMs}ms` + (parts.length ? (' | ' + parts.join(' ')) : '');

        if (shouldLog) {
            this._lastDiagLogMs = now;
            this._diagLog(diag.logLevel, `[DIAG] ${summary}`);
        }

        if (shouldWrite) {
            this._lastDiagWriteMs = now;
            try {
                await this.adapter.setStateAsync('diagnostics.lastTick', t0, true);
                await this.adapter.setStateAsync('diagnostics.lastTickMs', totalMs, true);
                await this.adapter.setStateAsync('diagnostics.summary', summary, true);
                await this.adapter.setStateAsync('diagnostics.tickCount', this._tickCount, true);
                await this.adapter.setStateAsync('diagnostics.lastLog', this._lastDiagLogMs || 0, true);
                await this.adapter.setStateAsync('diagnostics.lastWrite', now, true);

                const modulesJson = this._limitJson(results, diag.maxJsonLen);
                await this.adapter.setStateAsync('diagnostics.modules', modulesJson, true);

                const errText = hasError ? errors.slice(0, 10).join(' | ') : '';
                await this.adapter.setStateAsync('diagnostics.errors', errText, true);
            } catch (e) {
                this.adapter.log.debug(`Diagnostics state write failed: ${String((e && e.message) ? e.message : e)}`);
            }
        }
    }

}

module.exports = { ModuleManager };
