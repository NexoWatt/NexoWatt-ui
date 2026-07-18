/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/para14a.ts
 * Quell-Hash: sha256:d6712deb0d8c563f532fbeadd37aab5ee4c33d6f6d0be8b425cec9619c8db480
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/para14a.js.
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
 * Datei: ems/modules/para14a.js
 * Rolle im Projekt: §14a-Modul.
 * Zweck: Erfasst und verarbeitet §14a-relevante Vorgaben und Reports.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: EMS-Regelungsmodul: verarbeitet Konfiguration, States und Budgets für eine bestimmte Energie-Funktion.
 * Zusammenhänge:
 * - Wird von ems/module-manager.js initialisiert und zyklisch getickt.
 * - main.js veröffentlicht die entstehenden States und APIs.
 * Wartungshinweise:
 * - Keine UI-spezifische Logik einbauen; Ausgabe über States/API bereitstellen.
 */

'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');
const { resolvePara14aSignal, buildPara14aConstraintSnapshot } = require('../../lib/ts-mirrors/ems/para14a/para14a-constraint');
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (n < minV) return minV;
    if (n > maxV) return maxV;
    return n;
}
/**
 * Code-Teil: safeIdPart
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function safeIdPart(s) {
    const v = String(s || '').trim();
    if (!v) return '';
    // Keep in sync with Charging-Management's toSafeIdPart()
    return v.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}
/**
 * Code-Teil: normalizeConsumerType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeConsumerType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'wärmepumpe' || s === 'waermepumpe' || s === 'heatpump' || s === 'hp' || s === 'wp') return 'heatPump';
    if (s === 'heizstab' || s === 'heaterrod' || s === 'rod') return 'heatingRod';
    if (s === 'klima' || s === 'klimageraet' || s === 'klimagerät' || s === 'aircondition' || s === 'ac') return 'airCondition';
    if (s === 'speicher' || s === 'storage' || s === 'battery') return 'storage';
    return 'custom';
}
/**
 * Code-Teil: normalizeControlType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeControlType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'onoff' || s === 'on/off' || s === 'switch' || s === 'enable' || s === 'aus' || s === 'sperren') return 'onOff';
    return 'limitW';
}
/**
 * Code-Teil: getGzf
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getGzf(nSteuVE) {
    const n = Math.max(1, Math.round(Number(nSteuVE) || 1));
    if (n <= 1) return 1;
    if (n === 2) return 0.8;
    if (n === 3) return 0.75;
    if (n === 4) return 0.7;
    if (n === 5) return 0.65;
    if (n === 6) return 0.6;
    if (n === 7) return 0.55;
    if (n === 8) return 0.5;
    return 0.45; // >=9
}

/**
 * §14a EnWG helper module.
 *
 * Goals:
 * - Provide a central, adapter-wide §14a state (active/mode)
 * - Compute minimum power distribution (Pmin,14a) for EMS mode
 * - Expose per-wallbox caps via adapter._para14a for Charging-Management
 * - Optionally write setpoints to additional "steuerbare Verbrauchseinrichtungen" (e.g. WP/Heizstab/Klima)
 */
/**
 * Code-Teil: Klasse `Para14aModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: Para14aModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: Para14aModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class Para14aModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._loads = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        this._activeDpKey = '';
        this._emsSetpointDpKey = '';
        this._signalMemory = { lastFreshActive: null, lastFreshTs: null };
        this._audit = {
            historyInstance: '',
            historyReady: false,
            retentionTargetDays: 730,
            eventSeq: 0,
            traceSeq: 0,
            sessionId: '',
            sessionStartedAt: 0,
            lastTraceAt: 0,
            lastControlSnapshot: null,
            lastControlSignature: '',
        };
    }

    /**
     * Code-Teil: Methode `_isEnabled`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _isEnabled
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _isEnabled() {
        return !!this.adapter?.config?.installerConfig?.para14a;
    }
    /**
     * Code-Teil: _getCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getCfg() {
        const cfg = this.adapter?.config?.installerConfig || {};
        return cfg && typeof cfg === 'object' ? cfg : {};
    }

    /**
     * Code-Teil: Methode `_setState`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _setState(id, val, options = {}) {
        const force = !!options.force;
        const ts = Number(options.ts) || Date.now();
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (!force && prev === v) return false;
        this._stateCache.set(id, v);
        await this.adapter.setStateAsync(id, { val: v, ack: true, ts });
        try {
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue(id, v, ts);
            }
        } catch {
            // ignore
        }
        return true;
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
        return this._setState(id, val, { force: false });
    }
    /**
     * Code-Teil: _setStateForced
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setStateForced(id, val, ts) {
        return this._setState(id, val, { force: true, ts });
    }

    /**
     * Code-Teil: Methode `_roundW`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _roundW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _roundW(v, dflt = 0) {
        const n = Number(v);
        return Number.isFinite(n) ? Math.round(n) : dflt;
    }
    /**
     * Code-Teil: _limitJsonText
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _limitJsonText(v, maxLen = 6000) {
        let s = '';
        try {
            s = (typeof v === 'string') ? v : JSON.stringify(v);
        } catch {
            s = '';
        }
        if (!maxLen || !Number.isFinite(maxLen) || maxLen < 256) maxLen = 6000;
        return s.length > maxLen ? `${s.slice(0, maxLen)}...` : s;
    }

    /**
     * Code-Teil: Methode `_getAdapterNumberFromCache`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAdapterNumberFromCache
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAdapterNumberFromCache(key, dflt = 0) {
        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const n = this.adapter._nwGetNumberFromCache(key);
                if (typeof n === 'number' && Number.isFinite(n)) return n;
            }
        } catch {
            // ignore
        }

        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[key] : null;
            const n = Number(rec && rec.value);
            if (Number.isFinite(n)) return n;
        } catch {
            // ignore
        }

        return dflt;
    }

    /**
     * Code-Teil: _newAuditSessionId
     * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    _newAuditSessionId(ts = Date.now()) {
        return `p14a-${Math.round(ts).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /**
     * Code-Teil: Methode `_getAuditControlSignature`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAuditControlSignature
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAuditControlSignature(snapshot) {
        const s = snapshot && typeof snapshot === 'object' ? snapshot : {};
        return JSON.stringify({
            active: !!s.active,
            source: String(s.source || ''),
            mode: String(s.mode || ''),
            requestedTotalBudgetW: this._roundW(s.requestedTotalBudgetW, 0),
            effectiveEvcsCapW: this._roundW(s.effectiveEvcsCapW, 0),
            minPerDeviceW: this._roundW(s.minPerDeviceW, 0),
            pMinW: this._roundW(s.pMinW, 0),
            nSteuVE: Math.max(0, Math.round(num(s.nSteuVE, 0))),
            evcsCount: Math.max(0, Math.round(num(s.evcsCount, 0))),
        });
    }

    /**
     * Code-Teil: Methode `_buildAuditSnapshot`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildAuditSnapshot
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildAuditSnapshot(data) {
        const s = data && typeof data === 'object' ? data : {};
        const active = !!s.active;
        const failedConsumers = Array.isArray(s.failedConsumers)
            ? s.failedConsumers.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10)
            : [];

        return {
            active,
            source: String(s.source || ''),
            mode: String(s.mode || ''),
            requestedTotalBudgetW: active ? this._roundW(s.requestedTotalBudgetW, 0) : 0,
            effectiveEvcsCapW: active ? this._roundW(s.effectiveEvcsCapW, 0) : 0,
            minPerDeviceW: active ? this._roundW(s.minPerDeviceW, 0) : 0,
            pMinW: active ? this._roundW(s.pMinW, 0) : 0,
            nSteuVE: active ? Math.max(0, Math.round(num(s.nSteuVE, 0))) : 0,
            evcsCount: active ? Math.max(0, Math.round(num(s.evcsCount, 0))) : 0,
            evPowerW: this._roundW(s.evPowerW, 0),
            gridPowerW: this._roundW(s.gridPowerW, 0),
            consumerAppliedCount: Math.max(0, Math.round(num(s.consumerAppliedCount, 0))),
            consumerFailedCount: Math.max(0, Math.round(num(s.consumerFailedCount, 0))),
            consumerSkippedCount: Math.max(0, Math.round(num(s.consumerSkippedCount, 0))),
            consumerWriteFailedCount: Math.max(0, Math.round(num(s.consumerWriteFailedCount, 0))),
            failedConsumers,
        };
    }

    /**
     * Code-Teil: Methode `_getAuditChangeReason`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAuditChangeReason
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAuditChangeReason(prev, next, fallback = 'update') {
        const p = prev && typeof prev === 'object' ? prev : null;
        const n = next && typeof next === 'object' ? next : {};

        if (!p) return fallback;
        if (!p.active && n.active) return 'activate';
        if (p.active && !n.active) return 'release';

        const reasons = [];
        if (p.source !== n.source) reasons.push('source');
        if (p.mode !== n.mode) reasons.push('mode');
        if (p.requestedTotalBudgetW !== n.requestedTotalBudgetW) reasons.push('budget');
        if (p.effectiveEvcsCapW !== n.effectiveEvcsCapW) reasons.push('evcs_cap');
        if (p.minPerDeviceW !== n.minPerDeviceW) reasons.push('min_per_device');
        if (p.pMinW !== n.pMinW) reasons.push('pmin');
        if (p.nSteuVE !== n.nSteuVE) reasons.push('nsteuve');
        if (p.evcsCount !== n.evcsCount) reasons.push('evcs_count');
        return reasons.length ? reasons.slice(0, 3).join('+') : fallback;
    }

    /**
     * Code-Teil: Methode `_initAuditLoggingStates`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _initAuditLoggingStates
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _initAuditLoggingStates(mk) {
        await this.adapter.setObjectNotExistsAsync('para14a.audit', {
            type: 'channel',
            common: { name: '§14a Nachweislog' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('para14a.trace', {
            type: 'channel',
            common: { name: '§14a Verlauf' },
            native: {},
        });

        await mk('para14a.audit.historyEnabled', 'Historie/Influx erkannt', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyInstance', 'Historien-Instanz', 'string', 'text', false);
        await mk('para14a.audit.historyDedicated', 'Eigene §14a Influx-Instanz', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyAutoProvisioned', 'Separate Influx-Bereitstellung', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyProvisionState', 'Historien-Bindungsstatus', 'string', 'text', false);
        await mk('para14a.audit.historyProvisionError', 'Historien-Hinweis/Fehler', 'string', 'text', false);
        await mk('para14a.audit.retentionTargetDays', 'Retention-Ziel (Tage)', 'number', 'value.interval', false, 'd');
        await mk('para14a.audit.sessionActive', '§14a Sitzung aktiv', 'boolean', 'indicator', false);
        await mk('para14a.audit.currentSessionId', 'Aktuelle/letzte Sitzungs-ID', 'string', 'text', false);
        await mk('para14a.audit.eventSeq', 'Ereignis-Sequenz', 'number', 'value', false);
        await mk('para14a.audit.lastEventTs', 'Letztes Ereignis (ts)', 'number', 'value.time', false);
        await mk('para14a.audit.lastEventType', 'Letzter Ereignistyp', 'string', 'text', false);
        await mk('para14a.audit.lastReason', 'Letzter Grund', 'string', 'text', false);
        await mk('para14a.audit.lastSource', 'Letzte Quelle', 'string', 'text', false);
        await mk('para14a.audit.lastMode', 'Letzter Modus', 'string', 'text', false);
        await mk('para14a.audit.lastRequestedTotalBudgetW', 'Letztes Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastEffectiveEvcsCapW', 'Letztes EVCS-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastMinPerDeviceW', 'Letzte Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastPMinW', 'Letztes Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastNSteuVE', 'Letzte nSteuVE', 'number', 'value', false);
        await mk('para14a.audit.lastEvcsCount', 'Letzte EVCS-Anzahl', 'number', 'value', false);
        await mk('para14a.audit.lastEvPowerW', 'Letzte EV-Leistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastGridPowerW', 'Letzte Netzleistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastConsumerAppliedCount', 'Letzte erfolgreich angewendete Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerFailedCount', 'Letzte fehlgeschlagene Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerSkippedCount', 'Letzte übersprungene Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerWriteFailedCount', 'Letzte Schreibfehler Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastResult', 'Letztes Ergebnis', 'string', 'text', false);
        await mk('para14a.audit.lastJson', 'Letztes Ereignis (JSON)', 'string', 'json', false);

        await mk('para14a.trace.seq', 'Trace-Sequenz', 'number', 'value', false);
        await mk('para14a.trace.sampleTs', 'Trace-Zeitstempel', 'number', 'value.time', false);
        await mk('para14a.trace.active', '§14a aktiv', 'boolean', 'indicator', false);
        await mk('para14a.trace.sessionId', 'Sitzungs-ID', 'string', 'text', false);
        await mk('para14a.trace.source', 'Quelle', 'string', 'text', false);
        await mk('para14a.trace.mode', 'Modus', 'string', 'text', false);
        await mk('para14a.trace.requestedTotalBudgetW', 'Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.effectiveEvcsCapW', 'Effektives EVCS-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.pMinW', 'Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.nSteuVE', 'nSteuVE', 'number', 'value', false);
        await mk('para14a.trace.evcsCount', 'EVCS-Anzahl', 'number', 'value', false);
        await mk('para14a.trace.evPowerW', 'EV-Leistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.gridPowerW', 'Netzleistung (W)', 'number', 'value.power', false, 'W');
    }

    /**
     * Code-Teil: Methode `_setupAuditHistory`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setupAuditHistory
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setupAuditHistory() {
        let historyInstance = '';
        let dedicatedHistory = false;
        let autoProvisioned = false;
        let provisionState = '';
        let provisionError = '';

        try {
            if (this.adapter && typeof this.adapter._nwEnsurePara14aInfluxInstance === 'function') {
                const historyInfo = await this.adapter._nwEnsurePara14aInfluxInstance();
                if (historyInfo && typeof historyInfo === 'object') {
                    historyInstance = String(historyInfo.instance || '').trim();
                    dedicatedHistory = historyInfo.dedicated === true;
                    autoProvisioned = historyInfo.autoProvisioned === true;
                    provisionState = String(historyInfo.provisionState || '').trim();
                    provisionError = String(historyInfo.provisionError || '').trim();
                }
            }
        } catch (e) {
            provisionState = provisionState || 'provision_error';
            provisionError = String(e?.message || e || '').trim();
        }

        if (!historyInstance) {
            try {
                if (this.adapter && typeof this.adapter._nwDetectInfluxInstance === 'function') {
                    historyInstance = String((await this.adapter._nwDetectInfluxInstance()) || '').trim();
                    if (historyInstance && !provisionState) provisionState = 'fallback_existing';
                }
            } catch {
                historyInstance = '';
            }
        }

        const historyReady = !!historyInstance && !!(this.adapter && typeof this.adapter._nwEnsureInfluxCustom === 'function');
        this._audit.historyInstance = historyInstance;
        this._audit.historyReady = historyReady;

        await this._setStateIfChanged('para14a.audit.historyEnabled', historyReady);
        await this._setStateIfChanged('para14a.audit.historyInstance', historyInstance);
        await this._setStateIfChanged('para14a.audit.historyDedicated', dedicatedHistory);
        await this._setStateIfChanged('para14a.audit.historyAutoProvisioned', autoProvisioned);
        await this._setStateIfChanged('para14a.audit.historyProvisionState', provisionState);
        await this._setStateIfChanged('para14a.audit.historyProvisionError', provisionError);
        await this._setStateIfChanged('para14a.audit.retentionTargetDays', this._audit.retentionTargetDays);

        if (!historyReady) return;

        const metaIds = [
            'para14a.audit.historyEnabled',
            'para14a.audit.historyInstance',
            'para14a.audit.historyDedicated',
            'para14a.audit.historyAutoProvisioned',
            'para14a.audit.historyProvisionState',
            'para14a.audit.historyProvisionError',
            'para14a.audit.retentionTargetDays',
        ];

        const eventIds = [
            'para14a.audit.sessionActive',
            'para14a.audit.currentSessionId',
            'para14a.audit.eventSeq',
            'para14a.audit.lastEventTs',
            'para14a.audit.lastEventType',
            'para14a.audit.lastReason',
            'para14a.audit.lastSource',
            'para14a.audit.lastMode',
            'para14a.audit.lastRequestedTotalBudgetW',
            'para14a.audit.lastEffectiveEvcsCapW',
            'para14a.audit.lastMinPerDeviceW',
            'para14a.audit.lastPMinW',
            'para14a.audit.lastNSteuVE',
            'para14a.audit.lastEvcsCount',
            'para14a.audit.lastEvPowerW',
            'para14a.audit.lastGridPowerW',
            'para14a.audit.lastConsumerAppliedCount',
            'para14a.audit.lastConsumerFailedCount',
            'para14a.audit.lastConsumerSkippedCount',
            'para14a.audit.lastConsumerWriteFailedCount',
            'para14a.audit.lastResult',
        ];

        const traceIds = [
            'para14a.trace.seq',
            'para14a.trace.sampleTs',
            'para14a.trace.active',
            'para14a.trace.sessionId',
            'para14a.trace.source',
            'para14a.trace.mode',
            'para14a.trace.requestedTotalBudgetW',
            'para14a.trace.effectiveEvcsCapW',
            'para14a.trace.minPerDeviceW',
            'para14a.trace.pMinW',
            'para14a.trace.nSteuVE',
            'para14a.trace.evcsCount',
            'para14a.trace.evPowerW',
            'para14a.trace.gridPowerW',
        ];

        for (const id of metaIds) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: true });
        }
        for (const id of [...eventIds, ...traceIds]) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: false });
        }
    }

    /**
     * Code-Teil: Methode `_emitAuditEvent`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _emitAuditEvent
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _emitAuditEvent(snapshot, eventType, reason, result) {
        const ts = Date.now();
        const eventSeq = Math.max(1, Math.round(num(this._audit.eventSeq, 0)) + 1);
        this._audit.eventSeq = eventSeq;

        const payload = {
            seq: eventSeq,
            ts,
            eventType,
            reason,
            result,
            sessionId: this._audit.sessionId || '',
            active: !!snapshot.active,
            source: String(snapshot.source || ''),
            mode: String(snapshot.mode || ''),
            requestedTotalBudgetW: this._roundW(snapshot.requestedTotalBudgetW, 0),
            effectiveEvcsCapW: this._roundW(snapshot.effectiveEvcsCapW, 0),
            minPerDeviceW: this._roundW(snapshot.minPerDeviceW, 0),
            pMinW: this._roundW(snapshot.pMinW, 0),
            nSteuVE: Math.max(0, Math.round(num(snapshot.nSteuVE, 0))),
            evcsCount: Math.max(0, Math.round(num(snapshot.evcsCount, 0))),
            evPowerW: this._roundW(snapshot.evPowerW, 0),
            gridPowerW: this._roundW(snapshot.gridPowerW, 0),
            consumerAppliedCount: Math.max(0, Math.round(num(snapshot.consumerAppliedCount, 0))),
            consumerFailedCount: Math.max(0, Math.round(num(snapshot.consumerFailedCount, 0))),
            consumerSkippedCount: Math.max(0, Math.round(num(snapshot.consumerSkippedCount, 0))),
            consumerWriteFailedCount: Math.max(0, Math.round(num(snapshot.consumerWriteFailedCount, 0))),
            failedConsumers: Array.isArray(snapshot.failedConsumers) ? snapshot.failedConsumers.slice(0, 10) : [],
        };

        await this._setStateForced('para14a.audit.sessionActive', !!payload.active, ts);
        await this._setStateForced('para14a.audit.currentSessionId', payload.sessionId, ts);
        await this._setStateForced('para14a.audit.eventSeq', payload.seq, ts);
        await this._setStateForced('para14a.audit.lastEventTs', payload.ts, ts);
        await this._setStateForced('para14a.audit.lastEventType', payload.eventType, ts);
        await this._setStateForced('para14a.audit.lastReason', payload.reason, ts);
        await this._setStateForced('para14a.audit.lastSource', payload.source, ts);
        await this._setStateForced('para14a.audit.lastMode', payload.mode, ts);
        await this._setStateForced('para14a.audit.lastRequestedTotalBudgetW', payload.requestedTotalBudgetW, ts);
        await this._setStateForced('para14a.audit.lastEffectiveEvcsCapW', payload.effectiveEvcsCapW, ts);
        await this._setStateForced('para14a.audit.lastMinPerDeviceW', payload.minPerDeviceW, ts);
        await this._setStateForced('para14a.audit.lastPMinW', payload.pMinW, ts);
        await this._setStateForced('para14a.audit.lastNSteuVE', payload.nSteuVE, ts);
        await this._setStateForced('para14a.audit.lastEvcsCount', payload.evcsCount, ts);
        await this._setStateForced('para14a.audit.lastEvPowerW', payload.evPowerW, ts);
        await this._setStateForced('para14a.audit.lastGridPowerW', payload.gridPowerW, ts);
        await this._setStateForced('para14a.audit.lastConsumerAppliedCount', payload.consumerAppliedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerFailedCount', payload.consumerFailedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerSkippedCount', payload.consumerSkippedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerWriteFailedCount', payload.consumerWriteFailedCount, ts);
        await this._setStateForced('para14a.audit.lastResult', payload.result, ts);
        await this._setStateForced('para14a.audit.lastJson', this._limitJsonText(payload, 7000), ts);

        try {
            if (this.adapter && this.adapter.log && typeof this.adapter.log.info === 'function') {
                this.adapter.log.info(`[§14a/audit] ${eventType} (${reason}) session=${payload.sessionId || '-'} cap=${payload.effectiveEvcsCapW}W budget=${payload.requestedTotalBudgetW}W result=${payload.result}`);
            }
        } catch {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_writeAuditTrace`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _writeAuditTrace
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _writeAuditTrace(snapshot, force = false) {
        const now = Date.now();
        const shouldWrite = !!force || (!!snapshot.active && (now - Number(this._audit.lastTraceAt || 0) >= 60000));
        if (!shouldWrite) return;

        this._audit.lastTraceAt = now;
        const seq = Math.max(1, Math.round(num(this._audit.traceSeq, 0)) + 1);
        this._audit.traceSeq = seq;

        const ts = now;
        await this._setStateForced('para14a.trace.seq', seq, ts);
        await this._setStateForced('para14a.trace.sampleTs', ts, ts);
        await this._setStateForced('para14a.trace.active', !!snapshot.active, ts);
        await this._setStateForced('para14a.trace.sessionId', this._audit.sessionId || '', ts);
        await this._setStateForced('para14a.trace.source', String(snapshot.source || ''), ts);
        await this._setStateForced('para14a.trace.mode', String(snapshot.mode || ''), ts);
        await this._setStateForced('para14a.trace.requestedTotalBudgetW', this._roundW(snapshot.requestedTotalBudgetW, 0), ts);
        await this._setStateForced('para14a.trace.effectiveEvcsCapW', this._roundW(snapshot.effectiveEvcsCapW, 0), ts);
        await this._setStateForced('para14a.trace.minPerDeviceW', this._roundW(snapshot.minPerDeviceW, 0), ts);
        await this._setStateForced('para14a.trace.pMinW', this._roundW(snapshot.pMinW, 0), ts);
        await this._setStateForced('para14a.trace.nSteuVE', Math.max(0, Math.round(num(snapshot.nSteuVE, 0))), ts);
        await this._setStateForced('para14a.trace.evcsCount', Math.max(0, Math.round(num(snapshot.evcsCount, 0))), ts);
        await this._setStateForced('para14a.trace.evPowerW', this._roundW(snapshot.evPowerW, 0), ts);
        await this._setStateForced('para14a.trace.gridPowerW', this._roundW(snapshot.gridPowerW, 0), ts);
    }

    /**
     * Code-Teil: Methode `_handleAuditLogging`
     * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _handleAuditLogging
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _handleAuditLogging(snapshot) {
        const prev = this._audit.lastControlSnapshot;
        const sig = this._getAuditControlSignature(snapshot);
        const prevSig = this._audit.lastControlSignature || '';

        let eventType = '';
        let reason = '';

        if (snapshot.active && !(prev && prev.active)) {
            this._audit.sessionId = this._newAuditSessionId();
            this._audit.sessionStartedAt = Date.now();
            eventType = 'activate';
            reason = this._getAuditChangeReason(prev, snapshot, 'activate');
        } else if (!snapshot.active && prev && prev.active) {
            eventType = 'release';
            reason = this._getAuditChangeReason(prev, snapshot, 'release');
        } else if (snapshot.active && sig !== prevSig) {
            if (!this._audit.sessionId) {
                this._audit.sessionId = this._newAuditSessionId();
                this._audit.sessionStartedAt = Date.now();
            }
            eventType = 'update';
            reason = this._getAuditChangeReason(prev, snapshot, 'update');
        }

        if (eventType) {
            const result = (eventType === 'release')
                ? 'released'
                : (snapshot.consumerFailedCount > 0 || snapshot.consumerWriteFailedCount > 0)
                    ? 'write_failed'
                    : (snapshot.consumerAppliedCount > 0 || snapshot.effectiveEvcsCapW > 0)
                        ? 'applied'
                        : 'ok';
            await this._emitAuditEvent(snapshot, eventType, reason, result);
            await this._writeAuditTrace(snapshot, true);
            if (eventType === 'release') {
                this._audit.sessionId = '';
                this._audit.sessionStartedAt = 0;
            }
        } else {
            await this._writeAuditTrace(snapshot, false);
        }

        this._audit.lastControlSnapshot = Object.assign({}, snapshot);
        this._audit.lastControlSignature = sig;
    }

    /**
     * Code-Teil: Methode `_buildLoadsFromConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildLoadsFromConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildLoadsFromConfig() {
        const cfg = this._getCfg();
        const rows = Array.isArray(cfg.para14aConsumers) ? cfg.para14aConsumers : [];

        /** @type {Array<any>} */
        const loads = [];
        const usedIds = new Set();

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i] || {};
            if (r.enabled === false) continue;

            const name = String(r.name || '').trim();
            const type = normalizeConsumerType(r.type);
            const ctrl = normalizeControlType(r.controlType);

            const setWId = String(r.setPowerWId || r.setWId || '').trim();
            const enableId = String(r.enableId || r.enableWriteId || '').trim();

            // Bekannte Fachmodule duerfen als reine Constraint-Zeile ohne eigenen
            // Hardware-DP konfiguriert werden. Nur ein Custom-Verbraucher benoetigt
            // weiterhin einen expliziten Legacy-Ziel-DP.
            if (!setWId && !enableId && type === 'custom') continue;

            const baseId = safeIdPart(r.key || name || `${type}_${i + 1}`) || `c${i + 1}`;
            let id = baseId;
            let n = 2;
            while (usedIds.has(id)) id = `${baseId}_${n++}`;
            usedIds.add(id);

            const installedPowerW = clamp(num(r.installedPowerW || r.powerW || r.ratedW || 0, 0), 0, 1e12);
            const priority = clamp(num(r.priority || 100, 100), 1, 999);

            loads.push({
                id,
                key: String(r.key || id),
                name: name || id,
                type,
                controlType: ctrl,
                installedPowerW,
                priority,
                setWId,
                enableId,
                // internal dp keys (filled in init)
                setWKey: '',
                enableKey: '',
            });
        }

        // deterministic: priority asc, then name
        loads.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._loads = loads;
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
        // Create states always (even if the module is disabled) to make troubleshooting easier.
        await this.adapter.setObjectNotExistsAsync('para14a', {
            type: 'channel',
            common: { name: '§14a EnWG' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, writable = false, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!writable,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('para14a.active', '§14a aktiv (wirksam)', 'boolean', 'indicator', false);
        await mk('para14a.mode', '§14a Modus', 'string', 'text', false);
        await mk('para14a.controlSource', '§14a Quelle', 'string', 'text', false);
        await mk('para14a.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.nSteuVE', 'Anzahl steuerbare Verbrauchseinrichtungen (nSteuVE)', 'number', 'value', false);
        await mk('para14a.gzf', 'Gleichzeitigkeitsfaktor (GZF)', 'number', 'value', false);
        await mk('para14a.pMinW', 'Mindestleistung gesamt Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.emsSetpointW', 'Sollwert EMS (W) (optional)', 'number', 'value.power', false, 'W');
        await mk('para14a.evcsTotalCapW', 'EVCS Gesamtlimit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.totalCapW', '§14a Gesamtlimit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.storageChargeCapW', '§14a Speicher-Ladegrenze (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.thermalCapW', '§14a Thermik-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.heatingRodCapW', '§14a Heizstab-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.airConditionCapW', '§14a Klima-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.customCapW', '§14a Legacy-/Custom-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.signalFresh', '§14a Signal frisch', 'boolean', 'indicator', false);
        await mk('para14a.signalAgeMs', '§14a Signalalter (ms)', 'number', 'value.interval', false, 'ms');
        await mk('para14a.signalStatus', '§14a Signalstatus', 'string', 'text', false);
        await mk('para14a.stalePolicy', '§14a Stale-Policy', 'string', 'text', false);
        await mk('para14a.constraintOnly', '§14a als zentraler Constraint', 'boolean', 'indicator', false);
        await mk('para14a.legacyDirectWritesEnabled', 'Legacy-Direktwrites aktiv', 'boolean', 'indicator', false);
        await mk('para14a.unmanagedConsumerCount', 'Nicht zentral angebundene §14a-Verbraucher', 'number', 'value', false);
        await mk('para14a.debug', 'Debug (JSON)', 'string', 'text', false);
        await this._initAuditLoggingStates(mk);

        // Load config and upsert dp mappings
        this._buildLoadsFromConfig();

        const cfg = this._getCfg();

        // Optional activation datapoint
        const activeId = String(cfg.para14aActiveId || '').trim();
        if (activeId && this.dp) {
            this._activeDpKey = 'p14a.active';
            await this.dp.upsert({ key: this._activeDpKey, objectId: activeId, dataType: 'mixed', direction: 'in' });
        } else {
            this._activeDpKey = '';
        }

        // Optional EMS setpoint datapoint (total allowed max net power for all steuVE)
        const spId = String(cfg.para14aEmsSetpointWId || '').trim();
        if (spId && this.dp) {
            this._emsSetpointDpKey = 'p14a.emsSetpointW';
            await this.dp.upsert({ key: this._emsSetpointDpKey, objectId: spId, dataType: 'number', direction: 'in', unit: 'W' });
        } else {
            this._emsSetpointDpKey = '';
        }

        // Upsert datapoints for load actuation
        for (const l of this._loads) {
            const baseKey = `p14a.${l.id}`;
            try {
                if (l.setWId) {
                    const k = `${baseKey}.setW`;
                    await this.dp?.upsert({ key: k, objectId: l.setWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25 });
                    l.setWKey = k;
                }
                if (l.enableId) {
                    const k = `${baseKey}.enable`;
                    await this.dp?.upsert({ key: k, objectId: l.enableId, dataType: 'boolean', direction: 'out' });
                    l.enableKey = k;
                }

                // Visible states for last applied target
                await this.adapter.setObjectNotExistsAsync(`para14a.consumers.${l.id}`, {
                    type: 'channel',
                    common: { name: l.name },
                    native: {},
                });
                await mk(`para14a.consumers.${l.id}.type`, 'Typ', 'string', 'text', false);
                await mk(`para14a.consumers.${l.id}.targetW`, 'Sollwert (W)', 'number', 'value.power', false, 'W');
                await mk(`para14a.consumers.${l.id}.applied`, 'Angewendet', 'boolean', 'indicator', false);
                await mk(`para14a.consumers.${l.id}.status`, 'Status', 'string', 'text', false);
            } catch (e) {
                this.adapter.log.warn(`[§14a] datapoint init failed for '${l.name}': ${e?.message || e}`);
            }
        }

        await this._setupAuditHistory();
    }

    /**
     * Code-Teil: Methode `_readActiveSignal`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readActiveSignal
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readActiveSignal() {
        const cfg = this._getCfg();
        const maxAgeMs = Math.max(1000, Math.round(num(cfg.para14aSignalMaxAgeSec, 30) * 1000));
        const mapped = !!(this._activeDpKey && this.dp);
        const rawValue = mapped ? this.dp.getRaw(this._activeDpKey, null) : null;
        const ageMs = mapped && typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs(this._activeDpKey) : null;
        const resolution = resolvePara14aSignal({
            enabled: !!cfg.para14a,
            mapped,
            rawValue,
            ageMs,
            maxAgeMs,
            assumeActiveWithoutSignal: cfg.para14aAssumeActiveWithoutSignal === true,
            stalePolicy: cfg.para14aStalePolicy || 'hold-active',
            lastFreshActive: this._signalMemory.lastFreshActive,
            lastFreshTs: this._signalMemory.lastFreshTs,
            nowMs: Date.now(),
        });
        if (resolution.fresh) {
            this._signalMemory.lastFreshActive = resolution.lastFreshActive;
            this._signalMemory.lastFreshTs = resolution.lastFreshTs;
        }
        return resolution;
    }


    /**
     * Code-Teil: Methode `_computeDistribution`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    _computeDistribution({ mode, minPerDeviceW, evcsCount, hasWP, hasKlima, pSumWP, pSumKlima, externalTotalSetpointW }) {
        const baseW = Math.max(0, minPerDeviceW);
        const nSteuVE = Math.max(0, Math.round(evcsCount)) + (hasWP ? 1 : 0) + (hasKlima ? 1 : 0);
        const n = Math.max(1, nSteuVE);
        const gzf = getGzf(n);

        const big = (pSumWP > 11000) || (pSumKlima > 11000);
        const primaryW = (mode === 'ems' && big)
            ? Math.max(0, Math.max(0.4 * pSumWP, 0.4 * pSumKlima))
            : baseW;

        const secondaryW = (n > 1) ? (gzf * baseW) : 0;

        const pMinW = primaryW + (n - 1) * secondaryW;

        // In EMS mode, a Netzbetreiber/Steuerbox may provide an explicit total setpoint.
        // If present, we use it as the effective total budget. Otherwise we use the computed minimum.
        const totalBudgetW = (mode === 'ems' && typeof externalTotalSetpointW === 'number' && Number.isFinite(externalTotalSetpointW) && externalTotalSetpointW > 0)
            ? Math.max(0, externalTotalSetpointW)
            : pMinW;

        return { nSteuVE: n, gzf, pMinW, primaryW, secondaryW, totalBudgetW };
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
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        if (!this.adapter) return;
        const cfg = this._getCfg();
        const signal = this._readActiveSignal();
        const modeRaw = String(cfg.para14aMode || cfg.para14aControlMode || 'direct').trim().toLowerCase();
        const mode = (modeRaw === 'ems' || modeRaw === 'formula') ? 'ems' : 'direct';
        const minPerDeviceW = clamp(num(cfg.para14aMinPerDeviceW, 4200), 0, 1e12);
        const signalMaxAgeMs = Math.max(1000, Math.round(num(cfg.para14aSignalMaxAgeSec, 30) * 1000));
        const setpointMaxAgeMs = Math.max(1000, Math.round(num(cfg.para14aSetpointMaxAgeSec, cfg.para14aSignalMaxAgeSec || 30) * 1000));
        const legacyDirectWritesEnabled = cfg.para14aLegacyDirectWritesEnabled === true;

        const evcsList = Array.isArray(this.adapter.evcsList) ? this.adapter.evcsList : [];
        const controllableEvcs = evcsList.filter((wb) => wb && (String(wb.setCurrentAId || '').trim() || String(wb.setPowerWId || '').trim()));
        const evcs = controllableEvcs.map((wb) => ({
            safe: safeIdPart(wb.key || wb.name || wb.index || ''),
            maxPowerW: Math.max(0, num(wb.maxPowerW || wb.maxPower || wb.ratedPowerW, 0)),
        }));
        const consumers = this._loads.map((load) => ({
            id: load.id,
            type: load.type,
            controlType: load.controlType,
            installedPowerW: load.installedPowerW,
            priority: load.priority,
            setWId: load.setWId,
            enableId: load.enableId,
        }));
        const externalTotalSetpointW = signal.active && mode === 'ems' && this._emsSetpointDpKey && this.dp
            ? this.dp.getNumberFresh(this._emsSetpointDpKey, setpointMaxAgeMs, null)
            : null;
        const constraint = buildPara14aConstraintSnapshot({
            active: signal.active,
            source: signal.source,
            mode,
            minPerDeviceW,
            externalTotalSetpointW,
            evcs,
            consumers,
        });

        this.adapter._para14a = {
            enabled: !!cfg.para14a,
            ...constraint,
            signalFresh: signal.fresh,
            signalStale: signal.stale,
            signalAgeMs: signal.ageMs,
            signalStatus: signal.reason,
            stalePolicy: signal.stalePolicy,
            signalMaxAgeMs,
            legacyDirectWritesEnabled,
            emsSetpointW: Number.isFinite(Number(externalTotalSetpointW)) ? Number(externalTotalSetpointW) : 0,
            totalBudgetW: constraint.totalCapW,
        };

        await this._setStateIfChanged('para14a.active', constraint.active);
        await this._setStateIfChanged('para14a.mode', constraint.mode);
        await this._setStateIfChanged('para14a.controlSource', String(signal.source || ''));
        await this._setStateIfChanged('para14a.minPerDeviceW', Math.round(minPerDeviceW));
        await this._setStateIfChanged('para14a.nSteuVE', constraint.nSteuVE);
        await this._setStateIfChanged('para14a.gzf', constraint.gzf);
        await this._setStateIfChanged('para14a.pMinW', constraint.pMinW);
        await this._setStateIfChanged('para14a.emsSetpointW', Math.round(num(externalTotalSetpointW, 0)));
        await this._setStateIfChanged('para14a.evcsTotalCapW', Math.round(num(constraint.evcsTotalCapW, 0)));
        await this._setStateIfChanged('para14a.totalCapW', Math.round(num(constraint.totalCapW, 0)));
        await this._setStateIfChanged('para14a.storageChargeCapW', Math.round(num(constraint.appCapsW.storage, 0)));
        await this._setStateIfChanged('para14a.thermalCapW', Math.round(num(constraint.appCapsW.thermal, 0)));
        await this._setStateIfChanged('para14a.heatingRodCapW', Math.round(num(constraint.appCapsW.heatingRod, 0)));
        await this._setStateIfChanged('para14a.airConditionCapW', Math.round(num(constraint.appCapsW.airCondition, 0)));
        await this._setStateIfChanged('para14a.customCapW', Math.round(num(constraint.appCapsW.custom, 0)));
        await this._setStateIfChanged('para14a.signalFresh', signal.fresh);
        await this._setStateIfChanged('para14a.signalAgeMs', signal.ageMs === null ? null : Math.round(signal.ageMs));
        await this._setStateIfChanged('para14a.signalStatus', signal.reason);
        await this._setStateIfChanged('para14a.stalePolicy', signal.stalePolicy);
        await this._setStateIfChanged('para14a.constraintOnly', !legacyDirectWritesEnabled);
        await this._setStateIfChanged('para14a.legacyDirectWritesEnabled', legacyDirectWritesEnabled);
        await this._setStateIfChanged('para14a.unmanagedConsumerCount', constraint.unmanagedConsumerCount);

        const consumerAudit = { appliedCount: 0, failedCount: 0, skippedCount: 0, writeFailedCount: 0, failedConsumers: [] };
        for (const load of this._loads) {
            const base = `para14a.consumers.${load.id}`;
            const targetW = constraint.targetCapsById[load.setWId] ?? constraint.targetCapsById[load.enableId] ?? 0;
            await this._setStateIfChanged(`${base}.type`, load.type);
            await this._setStateIfChanged(`${base}.targetW`, Math.round(num(targetW, 0)));
            if (!legacyDirectWritesEnabled) {
                consumerAudit.skippedCount += 1;
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'constraint-only');
                continue;
            }

            let writeTarget = Number(targetW);
            if (!constraint.active) {
                writeTarget = load.controlType === 'limitW' && load.installedPowerW > 0 ? load.installedPowerW : Number.NaN;
            }
            if (!Number.isFinite(writeTarget)) {
                consumerAudit.skippedCount += 1;
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'legacy-restore-unknown');
                continue;
            }
            const consumer = { type: 'load', key: load.id, name: load.name, setWKey: load.setWKey, enableKey: load.enableKey };
            const effectiveTargetW = load.controlType === 'onOff' ? (constraint.active ? 0 : 1) : writeTarget;
            const result = await applySetpoint({ dp: this.dp, adapter: this.adapter }, consumer, { targetW: Math.round(effectiveTargetW) });
            const status = String(result.status || '');
            if (result.applied && status !== 'skipped') consumerAudit.appliedCount += 1;
            else {
                consumerAudit.failedCount += 1;
                if (status === 'write_failed' || status === 'applied_partial') consumerAudit.writeFailedCount += 1;
                if (consumerAudit.failedConsumers.length < 10) consumerAudit.failedConsumers.push(load.name || load.id);
            }
            await this._setStateIfChanged(`${base}.applied`, !!result.applied);
            await this._setStateIfChanged(`${base}.status`, status);
        }

        const debug = { constraint, signal, legacyDirectWritesEnabled, consumerAudit };
        await this._setStateIfChanged('para14a.debug', JSON.stringify(debug));
        const auditSnapshot = this._buildAuditSnapshot({
            active: constraint.active,
            source: signal.source,
            mode: constraint.mode,
            requestedTotalBudgetW: num(constraint.totalCapW, 0),
            effectiveEvcsCapW: num(constraint.evcsTotalCapW, 0),
            minPerDeviceW,
            pMinW: constraint.pMinW,
            nSteuVE: constraint.nSteuVE,
            evcsCount: evcs.length,
            evPowerW: this._getAdapterNumberFromCache('evcs.totalPowerW', 0),
            gridPowerW: this._getAdapterNumberFromCache('ems.gridPowerW', 0),
            consumerAppliedCount: consumerAudit.appliedCount,
            consumerFailedCount: consumerAudit.failedCount,
            consumerSkippedCount: consumerAudit.skippedCount,
            consumerWriteFailedCount: consumerAudit.writeFailedCount,
            failedConsumers: consumerAudit.failedConsumers,
        });
        await this._handleAuditLogging(auditSnapshot);
    }

}

module.exports = { Para14aModule };
