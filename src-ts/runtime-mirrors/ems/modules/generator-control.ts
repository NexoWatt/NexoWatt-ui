// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/generator-control.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/modules/generator-control.js
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
 * Original-Hash: c35a3f9212dc25c2d45010a66d6287b7bda70aada5df3bca4fe7c90d5d563631
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
 * Quelle: src-ts/runtime-executables/ems/modules/generator-control.ts
 * Quell-Hash: sha256:1d3a5e7f9d7c4c4ee8705d3760c3506797d27b8e6e6d383034c7ac0ca405269f
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/generator-control.js.
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
 * Datei: ems/modules/generator-control.js
 * Rolle im Projekt: EMS-Modul generator control.
 * Zweck: Führt eine fachliche EMS-Funktion zyklisch aus und veröffentlicht States für Frontend/Regelung.
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
/**
 * Code-Teil: _num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _num(v, defVal = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : defVal;
}
/**
 * Code-Teil: _bool
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _bool(v, defVal = false) {
    return (typeof v === 'boolean') ? v : !!defVal;
}
/**
 * Code-Teil: _clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _clamp(n, a, b) {
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
}

/**
 * Generator Steuerung (Start/Stop, SoC-geführt).
 *
 * Ziel: robuste Grundlogik + Schnellsteuerung für VIS.
 * - Modus: auto | manual | off
 * - Auto: Start wenn SoC <= Start-Schwelle, Stop wenn SoC >= Stop-Schwelle
 * - Hysterese via getrennte Start/Stop-Schwellen + Mindestlaufzeit/Mindeststillstand
 * - Start/Stop per Write-Datenpunkt (puls oder level)
 *
 * Hinweis:
 * - Die eigentliche Geräteanbindung (z.B. Protokolle) ist nicht Teil dieses Moduls.
 *   Es werden nur gemappte Datenpunkte (Read/Write) genutzt.
 */
/**
 * Code-Teil: Klasse `GeneratorControlModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: GeneratorControlModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: GeneratorControlModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class GeneratorControlModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this.devices = [];

        // runtime hysteresis + anti-spam
        /** @type {Map<string, {wasRunning: boolean|null, lastOnMs: number, lastOffMs: number, lastCmdMs: number, lastCmd: string}>} */
        this._rt = new Map();

        this._inited = false;
        this._MAX_DEV = 10;
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
        await this._ensureObjects();
        await this._loadConfig();
        this._inited = true;
    }
    /**
     * Code-Teil: _ensureObjects
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureObjects() {
        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, common = {}) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: Object.assign({ name, type, role, read: true, write: false }, common),
                native: {}
            });
        };
        /**
         * Code-Teil: Arrow-Funktion `mkWritable`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mkWritable = async (id, name, type, role, common = {}) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: Object.assign({ name, type, role, read: true, write: true }, common),
                native: {}
            });
        };

        /**
         * Code-Teil: Arrow-Funktion `mkChan`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mkChan
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mkChan = async (id, name) => {
            await this.adapter.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
        };

        await mkChan('generator', 'Generator');
        await mkChan('generator.devices', 'Generator Geräte');
        await mkChan('generator.user', 'Generator Benutzer');

        for (let i = 1; i <= this._MAX_DEV; i++) {
            const dBase = `generator.devices.g${i}`;
            const uBase = `generator.user.g${i}`;
            await mkChan(dBase, `Generator ${i}`);
            await mkChan(uBase, `Generator ${i} Bedienung`);

            await mk(`${dBase}.running`, 'Läuft', 'boolean', 'indicator.running');
            await mk(`${dBase}.powerW`, 'Leistung (W)', 'number', 'value.power');
            await mk(`${dBase}.socPct`, 'SoC (%)', 'number', 'value.battery');
            await mk(`${dBase}.status`, 'Status', 'string', 'text');
            await mk(`${dBase}.reason`, 'Grund', 'string', 'text');
            await mk(`${dBase}.lastCommand`, 'Letzter Befehl', 'string', 'text');
            await mk(`${dBase}.lastCommandTs`, 'Letzter Befehl Zeitstempel', 'number', 'value.time');

            await mkWritable(`${uBase}.mode`, 'Modus (auto/manual/off)', 'string', 'text', { def: 'auto' });
            await mkWritable(`${uBase}.command`, 'Befehl (start/stop)', 'string', 'text', { def: '' });
        }
    }

    /**
     * Code-Teil: Methode `_loadConfig`
     * Zweck: lädt Daten aus API, State-Cache oder Konfiguration und stößt danach Rendering an.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _loadConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _loadConfig() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.generator && typeof this.adapter.config.generator === 'object')
            ? this.adapter.config.generator
            : {};

        const list = Array.isArray(cfg.devices) ? cfg.devices : [];
        const used = new Set();
        const out = [];

        for (let i = 0; i < list.length; i++) {
            const it = list[i] || {};
            const idx = Math.max(1, Math.min(this._MAX_DEV, Math.round(_num(it.idx ?? it.index ?? (i + 1), i + 1))));
            if (used.has(idx)) continue;
            used.add(idx);

            const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : false;
            const name = String(it.name || '').trim() || `Generator ${idx}`;

            const startWriteId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
            const stopWriteId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
            const runningReadId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
            const powerReadId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

            const socStartPct = _clamp(_num(it.socStartPct, 25), 0, 100);
            const socStopPct = _clamp(_num(it.socStopPct, 60), 0, 100);
            const minRunMin = _clamp(_num(it.minRunMin, 10), 0, 1440);
            const minOffMin = _clamp(_num(it.minOffMin, 5), 0, 1440);
            const maxAgeSec = _clamp(_num(it.maxAgeSec, 30), 0, 3600);

            const cmdTypeRaw = String(it.commandType || it.cmdType || '').trim().toLowerCase();
            const commandType = (cmdTypeRaw === 'level') ? 'level' : 'pulse';
            const pulseMs = _clamp(Math.round(_num(it.pulseMs ?? it.pulseDurationMs, 800)), 50, 10000);

            const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
            const userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : true;

            out.push({
                idx,
                id: `g${idx}`,
                enabled,
                name,
                showInLive,
                userCanControl,
                startWriteId,
                stopWriteId,
                runningReadId,
                powerReadId,
                socStartPct,
                socStopPct,
                minRunMin,
                minOffMin,
                maxAgeMs: Math.round(maxAgeSec * 1000),
                commandType,
                pulseMs,
            });
        }

        out.sort((a, b) => a.idx - b.idx);
        this.devices = out;

        // Register datapoints for reads (optional) so we can use dp-registry cache.
        if (this.dp) {
            for (const d of this.devices) {
                if (d.runningReadId) {
                    await this.dp.upsert({
                        key: `generator.${d.id}.running`,
                        name: `Generator ${d.idx} Laufstatus`,
                        objectId: d.runningReadId,
                        dataType: 'boolean',
                        direction: 'in',
                        unit: '',
                        scale: 1,
                        offset: 0,
                        invert: false,
                        deadband: 0,
                        note: 'Optional'
                    });
                }
                if (d.powerReadId) {
                    await this.dp.upsert({
                        key: `generator.${d.id}.powerW`,
                        name: `Generator ${d.idx} Leistung`,
                        objectId: d.powerReadId,
                        dataType: 'number',
                        direction: 'in',
                        unit: 'W',
                        scale: 1,
                        offset: 0,
                        invert: false,
                        deadband: 0,
                        note: 'Optional'
                    });
                }
            }
        }

        // Ensure mode defaults exist (do not overwrite user choice)
        for (const d of this.devices) {
            const uModeId = `generator.user.g${d.idx}.mode`;
            try {
                const st = await this.adapter.getStateAsync(uModeId);
                if (!st || st.val === null || st.val === undefined || st.val === '') {
                    await this.adapter.setStateAsync(uModeId, 'auto', true);
                    try { this.adapter.updateValue(uModeId, 'auto', Date.now()); } catch (_e) {}
                }
            } catch (_e) {}
        }
    }

    /**
     * Code-Teil: Methode `_setIfChanged`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setIfChanged
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setIfChanged(id, val, ack = true) {
        try {
            const old = await this.adapter.getStateAsync(id);
            const oldVal = old ? old.val : undefined;
            const same = (oldVal === val) || (Number.isNaN(oldVal) && Number.isNaN(val));
            if (same) return;
        } catch (_e) {
            // ignore
        }
        try {
            await this.adapter.setStateAsync(id, val, ack);
            try { this.adapter.updateValue(id, val, Date.now()); } catch (_e2) {}
        } catch (_e) {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_getRt`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getRt
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getRt(id) {
        const cur = this._rt.get(id);
        if (cur) return cur;
        const init = { wasRunning: null, lastOnMs: 0, lastOffMs: 0, lastCmdMs: 0, lastCmd: '' };
        this._rt.set(id, init);
        return init;
    }

    /**
     * Code-Teil: Methode `_getSocPct`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getSocPct
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _getSocPct() {
        // Prefer aggregated storage farm SoC (if enabled and present)
        try {
            if (this.adapter && this.adapter.config && this.adapter.config.enableStorageFarm) {
                const st = await this.adapter.getStateAsync('storageFarm.totalSoc');
                const v = st && st.val !== null && st.val !== undefined ? Number(st.val) : NaN;
                if (Number.isFinite(v)) return v;
            }
        } catch (_e) {}

        // Fallback to mapped storage SoC (st.socPct)
        if (this.dp) {
            try {
                const staleMs = 30_000;
                const v = this.dp.getNumberFresh('st.socPct', staleMs, null);
                if (typeof v === 'number') return v;
            } catch (_e) {}
        }
        return null;
    }

    /**
     * Code-Teil: Methode `_normalizeMode`
     * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _normalizeMode
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _normalizeMode(v) {
        const s = String(v || '').trim().toLowerCase();
        if (s === 'manuell') return 'manual';
        if (s === 'aus') return 'off';
        if (['auto', 'manual', 'off'].includes(s)) return s;
        return 'auto';
    }

    /**
     * Code-Teil: Methode `_pulseWrite`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _pulseWrite
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _pulseWrite(objectId, pulseMs) {
        if (!objectId || !this.adapter || this.adapter._nwShuttingDown) return false;
        try {
            const writeResult = await this.adapter.setForeignStateAsync(objectId, true, false);
            if (writeResult && writeResult.__nexowattActuatorAuthorityBlocked === true) return false;
/**
 * Code-Teil: reset
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
            const reset = () => {
                if (!this.adapter || this.adapter._nwShuttingDown) return;
                this.adapter.setForeignStateAsync(objectId, false, false).catch(() => {});
            };
            if (typeof this.adapter._nwSetTimeout === 'function') this.adapter._nwSetTimeout(reset, pulseMs);
            else if (typeof this.adapter.setTimeout === 'function' && !this.adapter._nwShuttingDown) this.adapter.setTimeout(reset, pulseMs);
            else if (!this.adapter._nwShuttingDown) setTimeout(reset, pulseMs);
            return true;
        } catch (e) {
            this.adapter.log.warn(`Generator write failed for '${objectId}': ${e?.message || e}`);
            return false;
        }
    }

    /**
     * Code-Teil: Methode `_levelWrite`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _levelWrite
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _levelWrite(objectId, value) {
        if (!objectId) return false;
        try {
            const writeResult = await this.adapter.setForeignStateAsync(objectId, value, false);
            if (writeResult && writeResult.__nexowattActuatorAuthorityBlocked === true) return false;
            return true;
        } catch (e) {
            this.adapter.log.warn(`Generator write failed for '${objectId}': ${e?.message || e}`);
            return false;
        }
    }

    /**
     * Code-Teil: Methode `_sendCommand`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _sendCommand
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _sendCommand(dev, cmd, reason) {
        const now = Date.now();
        const rt = this._getRt(dev.id);

        // anti-spam: at most one command per 5s
        if (rt.lastCmdMs && (now - rt.lastCmdMs) < 5000 && rt.lastCmd === cmd) return false;

        let ok = false;
        if (cmd === 'start') {
            if (dev.commandType === 'level') ok = await this._levelWrite(dev.startWriteId, true);
            else ok = await this._pulseWrite(dev.startWriteId, dev.pulseMs);
        } else if (cmd === 'stop') {
            if (dev.commandType === 'level') ok = await this._levelWrite(dev.stopWriteId, true);
            else ok = await this._pulseWrite(dev.stopWriteId, dev.pulseMs);
        }

        if (ok) {
            rt.lastCmdMs = now;
            rt.lastCmd = cmd;
            await this._setIfChanged(`generator.devices.g${dev.idx}.lastCommand`, cmd, true);
            await this._setIfChanged(`generator.devices.g${dev.idx}.lastCommandTs`, now, true);
            await this._setIfChanged(`generator.devices.g${dev.idx}.reason`, String(reason || ''), true);
        }
        return ok;
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
        if (!this._inited) return;
        if (!Array.isArray(this.devices) || !this.devices.length) return;

        const now = Date.now();
        const soc = await this._getSocPct();

        for (const dev of this.devices) {
            if (!dev || !dev.enabled) continue;

            const dBase = `generator.devices.g${dev.idx}`;
            const uBase = `generator.user.g${dev.idx}`;

            // Read running/power (optional)
            let running = null;
            let powerW = null;

            if (this.dp && dev.runningReadId) {
                const key = `generator.${dev.id}.running`;
                const stale = this.dp.isStale(key, dev.maxAgeMs);
                running = stale ? null : this.dp.getBoolean(key, null);
            }
            if (this.dp && dev.powerReadId) {
                const key = `generator.${dev.id}.powerW`;
                const stale = this.dp.isStale(key, dev.maxAgeMs);
                powerW = stale ? null : this.dp.getNumber(key, null);
            }

            // update runtime tracking (min on/off)
            const rt = this._getRt(dev.id);
            if (typeof running === 'boolean') {
                if (rt.wasRunning === null) {
                    rt.wasRunning = running;
                    if (running) rt.lastOnMs = now; else rt.lastOffMs = now;
                } else if (rt.wasRunning !== running) {
                    rt.wasRunning = running;
                    if (running) rt.lastOnMs = now; else rt.lastOffMs = now;
                }
            }

            // Publish readouts
            await this._setIfChanged(`${dBase}.running`, (typeof running === 'boolean') ? running : false, true);
            await this._setIfChanged(`${dBase}.powerW`, (typeof powerW === 'number' ? Math.round(powerW) : null), true);
            await this._setIfChanged(`${dBase}.socPct`, (typeof soc === 'number' ? Math.round(soc * 10) / 10 : null), true);

            // Mode
            let mode = 'auto';
            try {
                const st = await this.adapter.getStateAsync(`${uBase}.mode`);
                mode = this._normalizeMode(st && st.val !== undefined ? st.val : 'auto');
            } catch (_e) {
                mode = 'auto';
            }

            // Manual command request (from UI)
            let cmdReq = '';
            try {
                const st = await this.adapter.getStateAsync(`${uBase}.command`);
                cmdReq = String(st && st.val ? st.val : '').trim().toLowerCase();
            } catch (_e) {
                cmdReq = '';
            }

            // Execute manual commands only in manual mode
            if (cmdReq === 'start' || cmdReq === 'stop') {
                if (mode === 'manual') {
                    await this._sendCommand(dev, cmdReq, `manual:${cmdReq}`);
                    await this._setIfChanged(`${uBase}.command`, '', true);
                } else {
                    // clear stale request (ignored)
                    await this._setIfChanged(`${uBase}.command`, '', true);
                    await this._setIfChanged(`${dBase}.reason`, 'manual:ignored_not_manual', true);
                }
            }

            // Auto logic
            let status = '';
            let reason = '';

            const haveSoc = (typeof soc === 'number');
            const haveRunning = (typeof running === 'boolean');
            const canActuate = !!(dev.startWriteId && dev.stopWriteId);

            if (!canActuate) {
                status = 'Konfiguration unvollständig (Start/Stop Write fehlt)';
            } else if (mode === 'off') {
                status = 'Aus';
                if (haveRunning && running) {
                    // immediate stop request (best effort)
                    await this._sendCommand(dev, 'stop', 'off:stop');
                    reason = 'off:stop';
                }
            } else if (mode === 'manual') {
                status = 'Manuell';
                reason = 'manual';
            } else { // auto
                if (!haveSoc) {
                    status = 'Auto (SoC fehlt)';
                    reason = 'auto:no_soc';
                } else if (!haveRunning) {
                    status = 'Auto (Status fehlt)';
                    reason = 'auto:no_running';
                } else {
                    // Hysteresis via separate start/stop thresholds + min on/off
                    const startAt = Math.min(dev.socStartPct, dev.socStopPct);
                    const stopAt = Math.max(dev.socStartPct, dev.socStopPct);

                    const minRunMs = Math.round(dev.minRunMin * 60 * 1000);
                    const minOffMs = Math.round(dev.minOffMin * 60 * 1000);

                    const canStartByTime = (!rt.lastOffMs) ? true : ((now - rt.lastOffMs) >= minOffMs);
                    const canStopByTime = (!rt.lastOnMs) ? true : ((now - rt.lastOnMs) >= minRunMs);

                    if (!running && soc <= startAt) {
                        status = `Auto (Start bei ≤ ${startAt}%)`;
                        reason = 'auto:start_soc_low';
                        if (canStartByTime) {
                            await this._sendCommand(dev, 'start', reason);
                        } else {
                            reason = 'auto:start_blocked_min_off';
                        }
                    } else if (running && soc >= stopAt) {
                        status = `Auto (Stop bei ≥ ${stopAt}%)`;
                        reason = 'auto:stop_soc_high';
                        if (canStopByTime) {
                            await this._sendCommand(dev, 'stop', reason);
                        } else {
                            reason = 'auto:stop_blocked_min_run';
                        }
                    } else {
                        status = running ? 'Auto (läuft)' : 'Auto (bereit)';
                        reason = 'auto:idle';
                    }
                }
            }

            if (reason) await this._setIfChanged(`${dBase}.reason`, reason, true);
            await this._setIfChanged(`${dBase}.status`, status, true);
        }
    }
}

module.exports = { GeneratorControlModule };
