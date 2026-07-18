// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/thermal-control.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/modules/thermal-control.js
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
 * Original-Hash: 0f611b0ef10664995dc286b76037b908cdb9b031fa08149769100e4bff9d481d
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
 * Quelle: src-ts/runtime-executables/ems/modules/thermal-control.ts
 * Quell-Hash: sha256:7fba8c4385a986b1fb8dbd43f7e74176c594902a9c5274e2360d1a6700e25fe6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/thermal-control.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/thermal-control.js
 * Rolle im Projekt: Thermikregelung.
 * Zweck: Steuert thermische Verbraucher wie Wärmepumpe/Warmwasser nach EMS-Strategie.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Thermik-/Wärmesteuerung: flexible Wärmelasten, Warmwasser, SG-Ready-ähnliche Freigaben und Budgets.
 * Zusammenhänge:
 * - Nutzt zentrale EMS-Budgets und ggf. Wetter-/Tariffenster.
 * - Kann mit KI-Komfortfenstern zusammenhängen.
 * Wartungshinweise:
 * - Komfortzeiten und Netzlimits dürfen nicht gegeneinander arbeiten.
 */

'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { ActuatorCommandContract } = require('../services/actuator-command-contract');
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
function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
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
function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}
/**
 * Code-Teil: safeSlot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function safeSlot(slot) {
    const s = Math.round(Number(slot) || 0);
    if (s < 1) return 1;
    if (s > 10) return 10;
    return s;
}
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
 * Code-Teil: normalizeType
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'power';

    // SG-Ready (2 Relais)
    if (s === 'sgready' || s === 'sg-ready' || s === 'sg_ready' || s === 'sg') return 'sgready';

    // Explicit
    if (s === 'power' || s === 'w' || s === 'powerw' || s === 'heizstab' || s === 'heatingrod' || s === 'rod') return 'power';

    // Temperature/setpoint based
    if (s === 'setpoint' || s === 'temp' || s === 'temperature' || s === 'temperaturec' || s === '°c') return 'setpoint';
    if (s === 'heatpump' || s === 'wp' || s === 'waermepumpe' || s === 'wärmepumpe') return 'setpoint';
    if (s === 'hvac' || s === 'klima' || s === 'ac' || s === 'aircondition' || s === 'air_condition') return 'setpoint';

    return 'power';
}
/**
 * Code-Teil: normalizeProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeProfile(raw, type) {
    const s = String(raw || '').trim().toLowerCase();
    if (type !== 'setpoint') return 'none';
    if (s === 'heating' || s === 'heat' || s === 'heizen' || s === 'warmwasser' || s === 'ww') return 'heating';
    if (s === 'cooling' || s === 'cool' || s === 'kuehlen' || s === 'kühlen') return 'cooling';
    return 'heating';
}
/**
 * Code-Teil: defaultSetpointsForProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function defaultSetpointsForProfile(profile) {
    if (profile === 'cooling') {
        return { on: 20, off: 24, boost: 18, unit: '°C' };
    }
    // heating (default)
    return { on: 55, off: 45, boost: 60, unit: '°C' };
}

/**
 * Thermische Verbraucher (Wärmepumpe/Heizung/Klima) – PV‑Überschuss‑Regelung.
 *
 * Phase 4.4:
 * - Regeltyp pro Slot: Leistung (W) oder Setpoint (z.B. °C)
 * - Boost-Override (Zeit) + Manual-Hold nach Schnellsteuerung, damit PV-Auto nicht sofort überschreibt
 * - Für Setpoint-Geräte: Schätzleistung (W) zur PV-Budgetierung
 */
/**
 * Code-Teil: Klasse `ThermalControlModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ThermalControlModule. Aufgabe: gehört zur Heizstab-/Thermiksteuerung. Speicherreserve, PV-Budget und Freigaben müssen mit core-limits übereinstimmen. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: ThermalControlModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ThermalControlModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._devices = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        /** @type {Map<string, {on:boolean, lastOnMs:number, lastOffMs:number}>} */
        this._hyst = new Map();
        this._actuatorContract = new ActuatorCommandContract();
    }

    /**
     * Code-Teil: Methode `_isEnabled`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _isEnabled() {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableThermalControl);
    }
        _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.thermal && typeof this.adapter.config.thermal === 'object')
            ? this.adapter.config.thermal
            : {};
        return cfg;
    }

    /**
     * Code-Teil: Methode `_getManualHoldMin`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getManualHoldMin() {
        const cfg = this._getCfg();
        return clamp(num(cfg.manualHoldMin, 20), 0, 24 * 60);
    }
    /**
     * Code-Teil: _getVisFlowSlots
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisFlowSlots() {
        const vis = (this.adapter && this.adapter.config && this.adapter.config.vis && typeof this.adapter.config.vis === 'object')
            ? this.adapter.config.vis
            : {};
        const fs = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
        const arr = Array.isArray(fs.consumers) ? fs.consumers : [];
        return arr;
    }

    /**
     * Code-Teil: Methode `_getDatapoints`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getDatapoints() {
        return (this.adapter && this.adapter.config && this.adapter.config.datapoints && typeof this.adapter.config.datapoints === 'object')
            ? this.adapter.config.datapoints
            : {};
    }
        _getOverrides() {
        const a = this.adapter;
        if (!a) return {};
        if (!a._thermalOverrides || typeof a._thermalOverrides !== 'object') a._thermalOverrides = {};
        return a._thermalOverrides;
    }

    /**
     * Code-Teil: Methode `_setStateIfChanged`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setStateIfChanged
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setStateIfChanged(id, val) {
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (prev === v) return;
        this._stateCache.set(id, v);
        await this.adapter.setStateAsync(id, v, true);
    }

    /**
     * Code-Teil: Methode `_buildDevicesFromConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _buildDevicesFromConfig() {
        const cfg = this._getCfg();
        const list = Array.isArray(cfg.devices) ? cfg.devices : [];

        const flowConsumers = this._getVisFlowSlots();
        const dps = this._getDatapoints();

        /** @type {Array<any>} */
        const out = [];
        const usedSlots = new Set();

        for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const slot = safeSlot(r.slot ?? r.consumerSlot ?? (i + 1));
            if (usedSlots.has(slot)) continue;
            usedSlots.add(slot);

            const enabled = (typeof r.enabled === 'boolean') ? r.enabled : false;
            const modeRaw = String(r.mode || 'pvAuto').trim().toLowerCase();
            const mode = (modeRaw === 'manual' || modeRaw === 'off') ? modeRaw : 'pvAuto';

            const type = normalizeType(r.type || r.deviceType || r.kind);
            const profile = normalizeProfile(r.profile, type);

            const maxPowerW = clamp(num(r.maxPowerW, 2500), 0, 1e12);
            const startSurplusW = clamp(num(r.startSurplusW, 800), 0, 1e12);
            const stopSurplusW = clamp(num(r.stopSurplusW, 300), 0, 1e12);
            const minOnSec = clamp(num(r.minOnSec, 300), 0, 86400);
            const minOffSec = clamp(num(r.minOffSec, 300), 0, 86400);
            const priority = clamp(num(r.priority, 100 + slot), 1, 999);

            const slotCfg = (flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object') ? flowConsumers[slot - 1] : {};
            const slotTypeRaw = String(slotCfg.consumerType || slotCfg.type || slotCfg.category || '').trim().toLowerCase();
            if (slotTypeRaw === 'heatingrod' || slotTypeRaw === 'heating_rod' || slotTypeRaw === 'heating-rod' || slotTypeRaw === 'heizstab' || slotTypeRaw === 'rod' || slotTypeRaw === 'immersion') {
                continue;
            }
            const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};

            const name = String(r.name || slotCfg.name || '').trim() || `Thermal ${slot}`;

            const powerId = String(dps[`consumer${slot}Power`] || '').trim();
            const switchWriteId = String(ctrl.switchWriteId || '').trim();
            const setpointWriteId = String(ctrl.setpointWriteId || '').trim();

            // Optional SG-Ready wiring (2 relays)
            const sgReadyAWriteId = String(ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim();
            const sgReadyBWriteId = String(ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim();
            const sgReadyAInvert = !!(ctrl.sgReadyAInvert || ctrl.sgReady1Invert);
            const sgReadyBInvert = !!(ctrl.sgReadyBInvert || ctrl.sgReady2Invert);

            const boostEnabled = (typeof r.boostEnabled === 'boolean') ? !!r.boostEnabled : true;
            const boostDurationMin = clamp(num(r.boostDurationMin, 30), 0, 24 * 60);

            // For setpoint devices: derive reasonable default setpoints by profile.
            const defSp = defaultSetpointsForProfile(profile);
            const autoOnSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.autoOnSetpoint)) ? Number(r.autoOnSetpoint) : defSp.on)
                : null;
            const autoOffSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.autoOffSetpoint)) ? Number(r.autoOffSetpoint) : defSp.off)
                : null;
            const boostSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.boostSetpoint)) ? Number(r.boostSetpoint) : defSp.boost)
                : null;

            // For setpoint/SG-Ready devices: power estimate used for PV budget allocation.
            const estimatedPowerW = (type === 'setpoint' || type === 'sgready')
                ? clamp(num(r.estimatedPowerW, 1500), 0, 1e12)
                : null;

            const boostPowerW = (type === 'power')
                ? clamp(num(r.boostPowerW, maxPowerW), 0, 1e12)
                : null;

            const requireReadback = r.requireReadback === true;
            const readbackTimeoutSec = clamp(num(r.readbackTimeoutSec, 5), 0.25, 120);
            const retryDelaySec = clamp(num(r.retryDelaySec, 3), 0.25, 120);
            const maxRetries = clamp(num(r.maxRetries, 3), 0, 20);
            const faultLockSec = clamp(num(r.faultLockSec, 60), 1, 24 * 60 * 60);

            out.push({
                slot,
                id: `c${slot}`,
                name,
                enabled,
                mode,
                type,
                profile,
                maxPowerW,
                startSurplusW,
                stopSurplusW,
                minOnSec,
                minOffSec,
                priority,

                boostEnabled,
                boostDurationMin,
                boostPowerW,
                autoOnSetpoint,
                autoOffSetpoint,
                boostSetpoint,
                estimatedPowerW,
                requireReadback,
                readbackTimeoutSec,
                retryDelaySec,
                maxRetries,
                faultLockSec,

                powerId,
                switchWriteId,
                setpointWriteId,

                sgReadyAWriteId,
                sgReadyBWriteId,
                sgReadyAInvert,
                sgReadyBInvert,


                // User overrides (end customer UI)
                userEnabledKey: `th.user.c${slot}.regEnabled`,
                userModeKey: `th.user.c${slot}.mode`,

                // dp keys (filled in init)
                pWKey: '',
                enableKey: '',
                setWKey: '',

                // SG-Ready dp keys (filled in init)
                sg1Key: '',
                sg2Key: '',
            });
        }

        // deterministic order
        out.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._devices = out;
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
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        // Always create a stable channel tree.
        await this.adapter.setObjectNotExistsAsync('thermal', {
            type: 'channel',
            common: { name: 'Wärmepumpe & Klima' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('thermal.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        
        // Endkunde/Bedienung: persistente User-States pro Verbraucher-Slot (Regelung an/aus + Betriebsmodus).
        // Diese States werden durch die VIS (Schnellsteuerung) gesetzt und überschreiben (optional) die Installer-Konfiguration.
        await this.adapter.setObjectNotExistsAsync('thermal.user', {
            type: 'channel',
            common: { name: 'User' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `ensureDefault`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
                const ensureDefault = async (id, val) => {
            try {
                const s = await this.adapter.getStateAsync(id);
                if (!s || s.val === null || s.val === undefined) {
                    await this.adapter.setStateAsync(id, val, true);
                }
            } catch (_e) {
                try { await this.adapter.setStateAsync(id, val, true); } catch (_e2) {}
            }
        };

        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}`, {
                type: 'channel',
                common: { name: `Consumer ${i}` },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}.regEnabled`, {
                type: 'state',
                common: {
                    name: 'Regelung aktiv',
                    type: 'boolean',
                    role: 'switch.enable',
                    read: true,
                    write: true,
                    def: true,
                },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}.mode`, {
                type: 'state',
                common: {
                    name: 'Betriebsmodus',
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: true,
                    def: 'inherit',
                    states: {
                        inherit: 'System',
                        pvAuto: 'Auto (PV)',
                        manual: 'Manuell',
                        off: 'Aus',
                    },
                },
                native: {},
            });

            await ensureDefault(`thermal.user.c${i}.regEnabled`, true);
            await ensureDefault(`thermal.user.c${i}.mode`, 'inherit');
        }

/**
 * Code-Teil: Arrow-Funktion `mk`
 * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
const mk = async (id, name, type, role, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: false,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('thermal.summary.pvCapW', 'PV cap (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.evcsUsedW', 'EVCS used (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.pvAvailableW', 'PV available for thermal (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.budgetUsedW', 'Budget used (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('thermal.summary.status', 'Status', 'string', 'text');

        // Build devices & register DPs
        this._buildDevicesFromConfig();

        // Read inputs from charging management (remaining PV after EVCS)
        // Subscribe to local states (namespace.*) via dpRegistry for deterministic reads.
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'th.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'th.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
            }
        } catch (_e) {
            // ignore
        }

        
        // User overrides: local states (Regelung + Mode) werden über dpRegistry gecached, damit die Tick-Logik deterministisch bleibt.
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `th.user.c${i}.regEnabled`, objectId: `${ns}.thermal.user.c${i}.regEnabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `th.user.c${i}.mode`, objectId: `${ns}.thermal.user.c${i}.mode`, dataType: 'string', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

// Per device: create channel + register setpoints
        for (const d of this._devices) {
            await this.adapter.setObjectNotExistsAsync(`thermal.devices.${d.id}`, {
                type: 'channel',
                common: { name: d.name },
                native: {},
            });

            await mk(`thermal.devices.${d.id}.slot`, 'Slot', 'number', 'value');
            await mk(`thermal.devices.${d.id}.enabled`, 'Enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.mode`, 'Mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.userEnabled`, 'User enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.userMode`, 'User mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.effectiveEnabled`, 'Effective enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.effectiveMode`, 'Effective mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.type`, 'Type', 'string', 'text');
            await mk(`thermal.devices.${d.id}.profile`, 'Profile', 'string', 'text');

            // targetW is kept for backward compatibility; interpret via targetUnit/targetKind.
            await mk(`thermal.devices.${d.id}.targetW`, 'Target', 'number', 'value');
            await mk(`thermal.devices.${d.id}.targetUnit`, 'Target unit', 'string', 'text');
            await mk(`thermal.devices.${d.id}.targetKind`, 'Target kind', 'string', 'text');

            await mk(`thermal.devices.${d.id}.applied`, 'Applied', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.status`, 'Status', 'string', 'text');
            await mk(`thermal.devices.${d.id}.measuredW`, 'Measured (W)', 'number', 'value.power', 'W');
            await mk(`thermal.devices.${d.id}.owner`, 'Aktor-Owner', 'string', 'text');
            await mk(`thermal.devices.${d.id}.writeAccepted`, 'Write akzeptiert', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.readbackOk`, 'Readback bestätigt', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.writePending`, 'Write/Readback ausstehend', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.retryCount`, 'Write-Wiederholungen', 'number', 'value');
            await mk(`thermal.devices.${d.id}.faultLocked`, 'Aktor-Fehlerverriegelung', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.faultUntil`, 'Aktor-Fehlerverriegelung bis', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.writeContractStatus`, 'Aktor-Vertragsstatus', 'string', 'text');

            // Overrides (written internally via API)
            await mk(`thermal.devices.${d.id}.boostActive`, 'Boost active', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.boostUntil`, 'Boost until (ts)', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.manualUntil`, 'Manual hold until (ts)', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.override`, 'Override', 'string', 'text');

            // DP mapping (read)
            if (this.dp && d.powerId) {
                const k = `th.${d.id}.pW`;
                await this.dp.upsert({ key: k, objectId: d.powerId, dataType: 'number', direction: 'in', unit: 'W' });
                d.pWKey = k;
            }

            // DP mapping (actuation)
            if (this.dp && d.switchWriteId) {
                const k = `th.${d.id}.en`;
                await this.dp.upsert({ key: k, objectId: d.switchWriteId, dataType: 'boolean', direction: 'out' });
                d.enableKey = k;
            }

            // Optional SG-Ready actuation (two digital outputs)
            if (this.dp && d.sgReadyAWriteId) {
                const k = `th.${d.id}.sg1`;
                await this.dp.upsert({ key: k, objectId: d.sgReadyAWriteId, dataType: 'boolean', direction: 'out' });
                d.sg1Key = k;
            }
            if (this.dp && d.sgReadyBWriteId) {
                const k = `th.${d.id}.sg2`;
                await this.dp.upsert({ key: k, objectId: d.sgReadyBWriteId, dataType: 'boolean', direction: 'out' });
                d.sg2Key = k;
            }
            if (this.dp && d.setpointWriteId) {
                const k = `th.${d.id}.set`;
                const unit = (d.type === 'setpoint') ? '°C' : 'W';
                const deadband = (d.type === 'setpoint') ? 0.2 : 25;
                await this.dp.upsert({ key: k, objectId: d.setpointWriteId, dataType: 'number', direction: 'out', unit, deadband });
                d.setWKey = k;
            }

            // init hysteresis state
            if (!this._hyst.has(d.id)) {
                this._hyst.set(d.id, { on: false, lastOnMs: 0, lastOffMs: 0 });
            }
        }
    }

    /**
     * Code-Teil: Methode `_computePvAvailableW`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computePvAvailableW() {
        const cfg = this._getCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        // Primary: central EMS Budget & Gates. Charging management reserves EVCS first,
        // thermal consumers get the next priority layer, and heating rods receive the remaining PV budget.
        const centralRuntimePresent = !!(this.adapter && this.adapter._emsBudget);
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            const snap = rt && typeof rt.peek === 'function' ? rt.peek() : null;
            const age = snap && Number.isFinite(Number(snap.ts)) ? (Date.now() - Number(snap.ts)) : Number.POSITIVE_INFINITY;
            if (snap && age <= staleMs) {
                const pvTotalW = snap.gates && snap.gates.pv ? Number(snap.gates.pv.effectiveW) : 0;
                const remainingPvW = Number(snap.remainingPvW);
                const tariffGate = snap.gates && snap.gates.tariff ? snap.gates.tariff : null;
                const tariffImportPreferred = !!(tariffGate && tariffGate.gridImportPreferred);
                const remainingTotalW = Number(snap.remainingTotalW);
                if (Number.isFinite(remainingPvW) && remainingPvW >= 0) {
                    const evcs = snap.consumers && snap.consumers.evcs ? snap.consumers.evcs : null;
                    const evcsUsedW = evcs && Number.isFinite(Number(evcs.reserveW)) ? Math.max(0, Number(evcs.reserveW)) : 0;
                    const totalGrant = tariffImportPreferred && typeof rt.getTotalGrant === 'function'
                        ? rt.getTotalGrant({ key: 'thermal', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    const pvGrant = !tariffImportPreferred && typeof rt.getPvGrant === 'function'
                        ? rt.getPvGrant({ key: 'thermal', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    const availableByTariffW = tariffImportPreferred
                        ? (totalGrant && Number.isFinite(Number(totalGrant.grantW))
                            ? Math.max(0, Number(totalGrant.grantW))
                            : (Number.isFinite(remainingTotalW) && remainingTotalW >= 0 ? Math.max(0, remainingTotalW) : null))
                        : null;
                    const availablePvGrantW = pvGrant && Number.isFinite(Number(pvGrant.grantW))
                        ? Math.max(0, Number(pvGrant.grantW))
                        : Math.max(0, remainingPvW);
                    return {
                        pvCapW: Math.max(0, Number.isFinite(pvTotalW) ? pvTotalW : availablePvGrantW),
                        evcsUsedW,
                        availableW: availableByTariffW !== null ? availableByTariffW : availablePvGrantW,
                        source: availableByTariffW !== null ? 'ems.budget.tariffNegative' : 'ems.budget.central-grant',
                    };
                }
            }
        } catch (_e) {
            // Die zentrale Runtime bleibt autoritativ. Ein Fehler darf kein
            // lokales Parallelbudget aus NVP/Charging-States aktivieren.
        }

        if (centralRuntimePresent) {
            return {
                pvCapW: 0,
                evcsUsedW: 0,
                availableW: 0,
                source: 'ems.budget.central-stale-or-invalid-blocked',
            };
        }

        // Legacy fallback: Nur fuer Alt-Laufzeiten ohne Core-Limits. Sobald die
        // zentrale Runtime existiert, wird niemals auf ein zweites lokales
        // PV-Budget ausgewichen.
        const pvCapW = this.dp ? this.dp.getNumberFresh('th.cm.pvCapW', staleMs, null) : null;
        const usedW = this.dp ? this.dp.getNumberFresh('th.cm.usedW', staleMs, null) : null;

        if (typeof pvCapW === 'number' && Number.isFinite(pvCapW) && pvCapW > 0) {
            const u = (typeof usedW === 'number' && Number.isFinite(usedW)) ? Math.max(0, usedW) : 0;
            return { pvCapW, evcsUsedW: u, availableW: Math.max(0, pvCapW - u), source: 'cm' };
        }

        // Fallback: net grid power (import + / export -)
        let gridW = this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('ps.gridPowerW', staleMs, null) : null;

        const avail = Math.max(0, -Number(gridW || 0));
        return { pvCapW: avail, evcsUsedW: 0, availableW: avail, source: 'grid' };
    }

    /**
     * Code-Teil: Methode `_hysteresisOnOff`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _hysteresisOnOff(id, desiredOn, minOnSec, minOffSec) {
        const h = this._hyst.get(id) || { on: false, lastOnMs: 0, lastOffMs: 0, initialized: false };
        const now = nowMs();

        const minOnMs = Math.max(0, Math.round(num(minOnSec, 0) * 1000));
        const minOffMs = Math.max(0, Math.round(num(minOffSec, 0) * 1000));

        // First use: do not artificially block the initial transition from OFF -> ON.
        if (!h.initialized) {
            h.initialized = true;
            if (h.on) {
                if (!h.lastOnMs) h.lastOnMs = Math.max(0, now - minOnMs);
            } else {
                if (!h.lastOffMs) h.lastOffMs = 0;
            }
        }

        let on = !!h.on;

        if (desiredOn && !on) {
            if (minOffMs > 0 && h.lastOffMs > 0 && (now - h.lastOffMs) < minOffMs) {
                on = false;
            } else {
                on = true;
                h.lastOnMs = now;
            }
        } else if (!desiredOn && on) {
            if (minOnMs > 0 && h.lastOnMs > 0 && (now - h.lastOnMs) < minOnMs) {
                on = true;
            } else {
                on = false;
                h.lastOffMs = now;
            }
        }

        h.on = on;
        this._hyst.set(id, h);
        return on;
    }

    /**
     * Code-Teil: Methode `_computeBandDesiredOn`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computeBandDesiredOn(id, availableW, startW, stopW) {
        const h = this._hyst.get(id) || { on: false };
        const wasOn = !!h.on;
        const start = Math.max(0, Math.max(num(startW, 0), num(stopW, 0)));
        const stop = Math.max(0, Math.min(num(startW, 0), num(stopW, 0)));
        const avail = Math.max(0, num(availableW, 0));
        if (wasOn) return avail > stop;
        return avail >= start && avail > 0;
    }

    /**
     * Code-Teil: Methode `_readOverrideForDevice`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOverrideForDevice
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readOverrideForDevice(d, now) {
        const ovAll = this._getOverrides();
        const ov = (ovAll && typeof ovAll === 'object' && ovAll[d.id] && typeof ovAll[d.id] === 'object') ? ovAll[d.id] : {};

        const boostUntil = clamp(num(ov.boostUntilMs, 0), 0, 1e18);
        const manualUntil = clamp(num(ov.manualUntilMs, 0), 0, 1e18);

        const boostActive = boostUntil > 0 && now < boostUntil;
        const manualActive = manualUntil > 0 && now < manualUntil;

        return { boostActive, boostUntil, manualActive, manualUntil };
    }

    _deviceOwner(d, manual = false) {
        return manual ? `manual.thermal.${d.id}` : `thermal.${d.id}`;
    }

    _deviceActuatorIds(d) {
        const ids = [];
        for (const key of [d.enableKey, d.setWKey, d.sg1Key, d.sg2Key]) {
            try {
                const entry = key && this.dp && this.dp.getEntry ? this.dp.getEntry(key) : null;
                const id = String(entry && entry.objectId || '').trim();
                if (id && !ids.includes(id)) ids.push(id);
            } catch (_e) {}
        }
        return ids;
    }

    _deviceHasExclusiveAuthority(d, owner) {
        if (String(owner || '').startsWith('manual.')) return true;
        const matrix = this.adapter && this.adapter._stageAActuatorOwnerById;
        const ids = this._deviceActuatorIds(d);
        if (!ids.length || !matrix || typeof matrix !== 'object') return false;
        return ids.every((id) => {
            const row = matrix[id];
            const activeOwners = Array.isArray(row && row.activeOwners)
                ? row.activeOwners.map((value) => String(value || '').trim()).filter(Boolean)
                : [];
            return activeOwners.length === 1 && activeOwners[0] === owner;
        });
    }

    _contractCfg(d, requireReadback = null) {
        return {
            requireReadback: requireReadback === null ? d.requireReadback === true : requireReadback === true,
            ackTimeoutMs: Math.round(Math.max(250, num(d.readbackTimeoutSec, 5) * 1000)),
            retryDelayMs: Math.round(Math.max(250, num(d.retryDelaySec, 3) * 1000)),
            maxRetries: Math.max(0, Math.round(num(d.maxRetries, 3))),
            faultLockMs: Math.round(Math.max(1000, num(d.faultLockSec, 60) * 1000)),
        };
    }

    async _readEntryState(key) {
        try {
            const entry = key && this.dp && this.dp.getEntry ? this.dp.getEntry(key) : null;
            const id = String(entry && entry.objectId || '').trim();
            if (!id || !this.adapter || typeof this.adapter.getForeignStateAsync !== 'function') return null;
            const state = await this.adapter.getForeignStateAsync(id);
            return state && state.val !== undefined ? state.val : null;
        } catch (_e) {
            return null;
        }
    }

    async _readThermalReadback(d, actType) {
        if (actType === 'sgready') {
            return {
                sg1: await this._readEntryState(d.sg1Key),
                sg2: await this._readEntryState(d.sg2Key),
                enable: await this._readEntryState(d.enableKey),
            };
        }
        if (actType === 'setpoint') {
            return {
                setpoint: await this._readEntryState(d.setWKey),
                enable: await this._readEntryState(d.enableKey),
            };
        }
        return {
            targetW: await this._readEntryState(d.setWKey),
            enable: await this._readEntryState(d.enableKey),
        };
    }

    _thermalReadbackMatches(d, actType, target, actual) {
        if (!actual || typeof actual !== 'object') return null;
/**
 * Code-Teil: boolMatch
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const boolMatch = (value, expected) => value === null || value === undefined ? null : !!value === !!expected;
/**
 * Code-Teil: numMatch
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const numMatch = (value, expected) => {
            if (expected === null || expected === undefined) return null;
            const a = Number(value); const b = Number(expected);
            if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
            return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01);
        };
        const results = [];
        if (actType === 'sgready') {
            const raw = String(target && target.state || 'off').trim().toLowerCase();
            let sg1 = raw === 'on' || raw === 'boost' || raw === '1' || raw === '2';
            let sg2 = raw === 'boost' || raw === 'block' || raw === '2' || raw === '3';
            if (d.sgReadyAInvert) sg1 = !sg1;
            if (d.sgReadyBInvert) sg2 = !sg2;
            if (d.sg1Key) results.push(boolMatch(actual.sg1, sg1));
            if (d.sg2Key) results.push(boolMatch(actual.sg2, sg2));
            if (d.enableKey) results.push(boolMatch(actual.enable, raw !== 'off' && raw !== 'normal' && raw !== 'block'));
        } else if (actType === 'setpoint') {
            if (d.setWKey && target && target.setpoint !== undefined && target.setpoint !== null) results.push(numMatch(actual.setpoint, target.setpoint));
            if (d.enableKey && target && target.enable !== undefined && target.enable !== null) results.push(boolMatch(actual.enable, target.enable));
        } else {
            if (d.setWKey) results.push(numMatch(actual.targetW, Math.max(0, Number(target && target.targetW) || 0)));
            if (d.enableKey) results.push(boolMatch(actual.enable, Number(target && target.targetW) > 0));
        }
        const known = results.filter((value) => value !== null);
        if (!known.length) return null;
        return known.every((value) => value === true);
    }

    async _publishThermalContract(d, owner, result) {
        await this._setStateIfChanged(`thermal.devices.${d.id}.owner`, owner);
        await this._setStateIfChanged(`thermal.devices.${d.id}.writeAccepted`, !!result.accepted);
        await this._setStateIfChanged(`thermal.devices.${d.id}.readbackOk`, result.readbackOk === true);
        await this._setStateIfChanged(`thermal.devices.${d.id}.writePending`, !!result.pending);
        await this._setStateIfChanged(`thermal.devices.${d.id}.retryCount`, Math.max(0, Math.round(Number(result.retryCount) || 0)));
        await this._setStateIfChanged(`thermal.devices.${d.id}.faultLocked`, !!result.faultLocked);
        await this._setStateIfChanged(`thermal.devices.${d.id}.faultUntil`, Math.max(0, Math.round(Number(result.faultUntil) || 0)));
        await this._setStateIfChanged(`thermal.devices.${d.id}.writeContractStatus`, String(result.status || ''));
    }

    async _applyThermalCommand(d, actType, consumer, target, reason, options = {}) {
        const manual = options.manual === true;
        const owner = this._deviceOwner(d, manual);
        const cfg = this._contractCfg(d, options.requireReadback === undefined ? null : options.requireReadback);
        const key = `thermal:${d.id}`;
        const now = Date.now();
        const actualBefore = await this._readThermalReadback(d, actType);
        const readbackBefore = this._thermalReadbackMatches(d, actType, target, actualBefore);
        const confirmed = this._actuatorContract.confirmFromReadback(key, target, actualBefore, readbackBefore === true, now);
        if (confirmed) {
            await this._publishThermalContract(d, owner, confirmed);
            return { applied: true, accepted: true, confirmed: true, readbackOk: true, status: confirmed.status, contract: confirmed };
        }
        const decision = this._actuatorContract.prepare(key, target, now, cfg);
        if (!decision.allowed) {
            const current = this._actuatorContract.result(key, now, decision.targetChanged);
            await this._publishThermalContract(d, owner, current);
            return { applied: false, accepted: false, confirmed: false, readbackOk: current.readbackOk, status: current.status, contract: current };
        }
        const enforceAuthority = this._deviceHasExclusiveAuthority(d, owner);
        const writeRes = await withActuatorShadowContext(this.adapter, {
            owner,
            module: 'thermalControl',
            priority: priorityForOwner(owner),
            reason,
            leaseMs: manual ? 5 * 60 * 1000 : 20000,
            kind: manual ? 'manual-thermal' : 'thermal-control',
            enforceAuthority,
            releaseAuthority: options.releaseAuthority === true,
        }, () => applySetpoint({ dp: this.dp, adapter: this.adapter }, consumer, target));
        const accepted = !!(writeRes && writeRes.applied === true);
        const actualAfter = await this._readThermalReadback(d, actType);
        const readbackOk = this._thermalReadbackMatches(d, actType, target, actualAfter);
        const contract = this._actuatorContract.complete(key, target, accepted, readbackOk, actualAfter, Date.now(), cfg);
        await this._publishThermalContract(d, owner, contract);
        return {
            ...writeRes,
            applied: contract.confirmed,
            accepted,
            confirmed: contract.confirmed,
            readbackOk,
            status: contract.status,
            contract,
        };
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        async tick() {
        if (!this._isEnabled()) return;

        const now = nowMs();

        const pv = this._computePvAvailableW();
        let remainingW = Math.max(0, num(pv.availableW, 0));

        let appliedTotalW = 0;
        let budgetUsedW = 0;
        const ctx = { dp: this.dp, adapter: this.adapter };

        for (const d of this._devices) {
            // Publish static info
            await this._setStateIfChanged(`thermal.devices.${d.id}.slot`, d.slot);
            await this._setStateIfChanged(`thermal.devices.${d.id}.enabled`, !!d.enabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.mode`, String(d.mode));

            // User overrides (VIS): enable/disable automation + override operating mode.
            // Values are cached via dpRegistry (local states under thermal.user.*).
            let userEnabled = true;
            try {
                if (this.dp && d.userEnabledKey && this.dp.getEntry && this.dp.getEntry(d.userEnabledKey)) {
                    const b = this.dp.getBoolean(d.userEnabledKey, true);
                    userEnabled = (b === null || b === undefined) ? true : !!b;
                }
            } catch (_e) {
                userEnabled = true;
            }

            let userMode = 'inherit';
            try {
                if (this.dp && d.userModeKey && this.dp.getEntry && this.dp.getEntry(d.userModeKey)) {
                    const raw = this.dp.getRaw(d.userModeKey, null);
                    if (raw !== null && raw !== undefined) userMode = String(raw).trim();
                }
            } catch (_e) {
                userMode = 'inherit';
            }

            /**
             * Code-Teil: Arrow-Funktion `normMode`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
                        const normMode = (m) => {
                const s = String(m || '').trim().toLowerCase();
                if (!s || s === 'inherit' || s === 'system') return 'inherit';
                if (s === 'auto' || s === 'pvauto' || s === 'pv' || s === 'pva') return 'pvAuto';
                if (s === 'manual' || s === 'manuell') return 'manual';
                if (s === 'off' || s === 'aus' || s === '0') return 'off';
                return 'inherit';
            };

            userMode = normMode(userMode);

            const effectiveEnabled = !!d.enabled && !!userEnabled;
            const effectiveMode = (userMode !== 'inherit') ? userMode : String(d.mode || 'pvAuto');

            await this._setStateIfChanged(`thermal.devices.${d.id}.userEnabled`, !!userEnabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.userMode`, String(userMode));
            await this._setStateIfChanged(`thermal.devices.${d.id}.effectiveEnabled`, !!effectiveEnabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.effectiveMode`, String(effectiveMode));

            await this._setStateIfChanged(`thermal.devices.${d.id}.type`, String(d.type));
            await this._setStateIfChanged(`thermal.devices.${d.id}.profile`, String(d.profile));

            const actType = (d.type === 'sgready' || d.sg1Key || d.sg2Key) ? 'sgready' : String(d.type || 'power');
            const targetUnit = (actType === 'setpoint') ? '°C' : (actType === 'sgready' ? '—' : 'W');
            const targetKind = (actType === 'setpoint') ? 'setpoint' : (actType === 'sgready' ? 'sgready' : 'power');
            await this._setStateIfChanged(`thermal.devices.${d.id}.targetUnit`, targetUnit);
            await this._setStateIfChanged(`thermal.devices.${d.id}.targetKind`, targetKind);

            // Read measured power if mapped
            let measuredW = null;
            if (this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey)) {
                measuredW = this.dp.getNumber(d.pWKey, null);
                if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                    await this._setStateIfChanged(`thermal.devices.${d.id}.measuredW`, Math.round(measuredW));
                }
            }

            // Overrides
            const ov = this._readOverrideForDevice(d, now);
            await this._setStateIfChanged(`thermal.devices.${d.id}.boostActive`, !!ov.boostActive);
            await this._setStateIfChanged(`thermal.devices.${d.id}.boostUntil`, ov.boostUntil ? Math.round(ov.boostUntil) : 0);
            await this._setStateIfChanged(`thermal.devices.${d.id}.manualUntil`, ov.manualUntil ? Math.round(ov.manualUntil) : 0);

            // Device disabled OR automation disabled by end-customer -> no writes (but still account measured load)
            if (!effectiveEnabled) {
                // subtract measured usage from remaining budget to avoid over-allocating PV to other consumers
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
                    const used = Math.max(0, measuredW);
                    remainingW = Math.max(0, remainingW - used);
                    budgetUsedW += Math.round(used);
                }

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, userEnabled ? 'disabled' : 'regulation_off');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // Manual-hold (from quick control) – do not overwrite user commands
            if (ov.manualActive && !ov.boostActive) {
                // subtract measured usage from remaining budget to avoid over-allocating PV
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
                    const used = Math.max(0, measuredW);
                    remainingW = Math.max(0, remainingW - used);
                    budgetUsedW += Math.round(used);
                }
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'manual_hold');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'manual_hold');
                continue;
            }

            // Boost override (force on)
            if (ov.boostActive && d.boostEnabled) {
                let usedW = 0;

                if (actType === 'setpoint') {
                    const sp = (typeof d.boostSetpoint === 'number' && Number.isFinite(d.boostSetpoint))
                        ? d.boostSetpoint
                        : (typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint) ? d.autoOnSetpoint : null);

                    const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(d, actType, consumer, { enable: true, setpoint: sp }, 'Thermik Boost Setpoint', { manual: true });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (sp !== null && sp !== undefined && Number.isFinite(Number(sp))) ? Number(sp) : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500))) : 0);
                } else if (actType === 'sgready') {
                    const consumer = {
                        type: 'sgready',
                        key: d.id,
                        name: d.name,
                        sg1Key: d.sg1Key,
                        sg2Key: d.sg2Key,
                        enableKey: d.enableKey,
                        invert1: !!d.sgReadyAInvert,
                        invert2: !!d.sgReadyBInvert,
                    };
                    const res = await this._applyThermalCommand(d, actType, consumer, { state: 'boost' }, 'Thermik Boost SG-Ready', { manual: true });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 2);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500))) : 0);
                } else {
                    const targetW = clamp(num(d.boostPowerW, d.maxPowerW), 0, num(d.maxPowerW, 0));
                    const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(d, actType, consumer, { targetW }, 'Thermik Boost Leistung', { manual: true });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, Math.round(targetW));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = res.accepted ? Math.max(0, Math.round(targetW)) : 0;
                }

                appliedTotalW += Math.max(0, Math.round(usedW));
                budgetUsedW += Math.max(0, Math.round(usedW));
                remainingW = Math.max(0, remainingW - usedW);
                continue;
            }

            // Manual mode -> no writes (but account measured load)
            if (effectiveMode === 'manual') {
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
                    const used = Math.max(0, measuredW);
                    remainingW = Math.max(0, remainingW - used);
                    budgetUsedW += Math.round(used);
                }
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'manual');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // Off -> actively disable/zero (if DPs exist)
            if (effectiveMode === 'off') {
                let usedW = 0;

                if (actType === 'setpoint') {
                    const sp = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;
                    const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(d, actType, consumer, { enable: false, setpoint: sp }, 'Thermik aus Setpoint', { manual: userMode !== 'inherit', releaseAuthority: true });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (sp !== null && sp !== undefined && Number.isFinite(Number(sp))) ? Number(sp) : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                } else if (actType === 'sgready') {
                    const consumer = {
                        type: 'sgready',
                        key: d.id,
                        name: d.name,
                        sg1Key: d.sg1Key,
                        sg2Key: d.sg2Key,
                        enableKey: d.enableKey,
                        invert1: !!d.sgReadyAInvert,
                        invert2: !!d.sgReadyBInvert,
                    };
                    const res = await this._applyThermalCommand(d, actType, consumer, { state: 'off' }, 'Thermik aus SG-Ready', { manual: userMode !== 'inherit', releaseAuthority: true });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                } else {
                    const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(d, actType, consumer, { targetW: 0 }, 'Thermik aus Leistung', { manual: userMode !== 'inherit', releaseAuthority: true });

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                }

                // While ramping down, we still account measured usage.
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) usedW = measuredW;
                appliedTotalW += Math.max(0, Math.round(usedW));
                budgetUsedW += Math.max(0, Math.round(usedW));
                remainingW = Math.max(0, remainingW - usedW);
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // PV auto
            let usedW = 0;

            const startW = Math.max(0, num(d.startSurplusW, 0));
            const stopW = Math.max(0, num(d.stopSurplusW, 0));

            const desiredOn = this._computeBandDesiredOn(d.id, remainingW, startW, stopW);
            const on = this._hysteresisOnOff(d.id, desiredOn, d.minOnSec, d.minOffSec);

            if (actType === 'setpoint') {
                const spOn = (typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint)) ? d.autoOnSetpoint : null;
                const spOff = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;

                const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                const res = await this._applyThermalCommand(d, actType, consumer, { enable: !!on, setpoint: on ? spOn : spOff }, on ? 'Thermik PV-Auto ein' : 'Thermik PV-Auto aus', { releaseAuthority: !on });

                const targetSp = on ? spOn : spOff;
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (targetSp !== null && targetSp !== undefined && Number.isFinite(Number(targetSp))) ? Number(targetSp) : 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, String(res.status || (on ? 'on' : 'off')));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                if (on) {
                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500))) : 0);
                } else {
                    usedW = 0;
                }
            } else if (actType === 'sgready') {
                const consumer = {
                    type: 'sgready',
                    key: d.id,
                    name: d.name,
                    sg1Key: d.sg1Key,
                    sg2Key: d.sg2Key,
                    enableKey: d.enableKey,
                    invert1: !!d.sgReadyAInvert,
                    invert2: !!d.sgReadyBInvert,
                };
                const res = await this._applyThermalCommand(d, actType, consumer, { state: on ? 'on' : 'off' }, on ? 'Thermik PV-Auto SG-Ready ein' : 'Thermik PV-Auto SG-Ready aus', { releaseAuthority: !on });

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, on ? 1 : 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, String(res.status || (on ? 'on' : 'off')));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                if (on) {
                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? Math.max(0, num(d.estimatedPowerW, (Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : 1500))) : 0);
                } else {
                    usedW = 0;
                }
            } else {
                const desiredW = on ? Math.min(remainingW, Math.max(0, num(d.maxPowerW, 0))) : 0;

                const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                const res = await this._applyThermalCommand(d, actType, consumer, { targetW: desiredW }, desiredW > 0 ? 'Thermik PV-Auto Leistung' : 'Thermik PV-Auto aus', { releaseAuthority: desiredW <= 0 });

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, Math.round(desiredW));
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, String(res.status || ''));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : (res.accepted ? Math.max(0, Math.round(desiredW)) : 0);
            }

            appliedTotalW += Math.max(0, Math.round(usedW));
            budgetUsedW += Math.max(0, Math.round(usedW));
            remainingW = Math.max(0, remainingW - usedW);
        }

        this.adapter._thermalBudgetUsedW = Math.round(budgetUsedW);

        // Central EMS Budget & Gates reservation for downstream apps.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            if (rt && typeof rt.reserve === 'function') {
                const used = Math.max(0, Math.round(budgetUsedW || 0));
                const tariffImportPreferred = String(pv.source || '').includes('tariffNegative');
                rt.reserve({
                    key: 'thermal',
                    app: 'thermalControl',
                    label: 'Thermik',
                    priority: 200,
                    requestedW: used,
                    reserveW: used,
                    pvReserveW: tariffImportPreferred ? 0 : used,
                    pvOnly: !tariffImportPreferred,
                    mode: tariffImportPreferred ? 'tariffNegative' : 'pvAuto',
                });
            }
        } catch (_e) {
            // budget diagnostics only
        }

        await this._setStateIfChanged('thermal.summary.pvCapW', Math.round(num(pv.pvCapW, 0)));
        await this._setStateIfChanged('thermal.summary.evcsUsedW', Math.round(num(pv.evcsUsedW, 0)));
        await this._setStateIfChanged('thermal.summary.pvAvailableW', Math.round(num(pv.availableW, 0)));
        await this._setStateIfChanged('thermal.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('thermal.summary.budgetUsedW', Math.round(budgetUsedW));
        await this._setStateIfChanged('thermal.summary.lastUpdate', now);
        await this._setStateIfChanged('thermal.summary.status', (this._devices && this._devices.length) ? `ok_${pv.source}` : 'no_devices');
    }
}

module.exports = { ThermalControlModule };
