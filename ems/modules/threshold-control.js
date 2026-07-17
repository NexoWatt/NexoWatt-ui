/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/threshold-control.ts
 * Quell-Hash: sha256:f145a16cb15e6778b89fbaf77fb3507aeb9b6abeea9fa22b244007909e336a2d
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/threshold-control.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/modules/threshold-control.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/threshold-control.js`.
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
'use strict';

const { BaseModule } = require('./base');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function clamp(v, minV, maxV, fallback = null) {
    const n = num(v, fallback);
    if (n === null) return fallback;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}
function safeIndex(i) {
    const n = Math.round(Number(i) || 0);
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
}

/**
 * Schwellwertsteuerung (generischer Regelbaustein).
 *
 * - Installateur konfiguriert Input/Output, Vergleich, Schwellwert, Hysterese und minOn/minOff.
 * - Optional: Endkunde darf Enable/Schwellwert pro Regel über die VIS anpassen.
 *
 * Robustheit:
 * - fehlende/alte Daten -> keine Schreibaktionen
 * - idempotente Writes (nur bei Änderung)
 */
/**
 * Code-Teil: Klasse `ThresholdControlModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ThresholdControlModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: ThresholdControlModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ThresholdControlModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._rules = [];
        /** @type {Map<string, {active:boolean, lastOnMs:number, lastOffMs:number, lastChangeMs:number}>} */
        this._hyst = new Map();
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
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
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableThresholdControl);
    }
    /**
     * Code-Teil: _getCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.threshold && typeof this.adapter.config.threshold === 'object')
            ? this.adapter.config.threshold
            : {};
        return cfg;
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
        try {
            await this.adapter.setStateAsync(id, v, true);
        } catch (_e) {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_normalizeCompare`
     * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _normalizeCompare
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _normalizeCompare(raw) {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'below' || s === '<' || s === 'lt' || s === 'less' || s === 'kleiner') return 'below';
        return 'above';
    }
    /**
     * Code-Teil: _normalizeOutType
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _normalizeOutType(raw) {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'bool' || s === 'boolean' || s === 'switch') return 'boolean';
        return 'number';
    }

    /**
     * Code-Teil: Methode `_buildRulesFromConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildRulesFromConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildRulesFromConfig() {
        const cfg = this._getCfg();
        const list = Array.isArray(cfg.rules) ? cfg.rules : [];

        const out = [];
        const used = new Set();

        for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const idx = safeIndex(r.idx ?? r.index ?? (i + 1));
            if (used.has(idx)) continue;
            used.add(idx);

            const enabled = (typeof r.enabled === 'boolean') ? !!r.enabled : false;

            const name = String(r.name || '').trim() || `Regel ${idx}`;

            const inputId = String(r.inputId || r.inputObjectId || '').trim();
            const compare = this._normalizeCompare(r.compare);

            const threshold = clamp(r.threshold, -1e12, 1e12, null);
            const hysteresis = Math.max(0, clamp(r.hysteresis, 0, 1e12, 0));

            const minOnSec = Math.max(0, clamp(r.minOnSec, 0, 86400, 0));
            const minOffSec = Math.max(0, clamp(r.minOffSec, 0, 86400, 0));

            const outType = this._normalizeOutType(r.outputType);
            const outputId = String(r.outputId || r.outputObjectId || '').trim();

            const onValue = (outType === 'boolean')
                ? ((r.onValue === undefined || r.onValue === null) ? true : !!r.onValue)
                : clamp(r.onValue, -1e12, 1e12, 1);

            const offValue = (outType === 'boolean')
                ? ((r.offValue === undefined || r.offValue === null) ? false : !!r.offValue)
                : clamp(r.offValue, -1e12, 1e12, 0);

            const maxAgeMs = Math.max(500, Math.round(clamp(r.maxAgeMs, 500, 10 * 60 * 1000, 5000)));

            const userCanToggle = (typeof r.userCanToggle === 'boolean') ? !!r.userCanToggle : true;
            const userCanSetThreshold = (typeof r.userCanSetThreshold === 'boolean') ? !!r.userCanSetThreshold : true;
            const userCanSetMinOnSec = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : userCanSetThreshold;
            const userCanSetMinOffSec = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : userCanSetThreshold;

            out.push({
                idx,
                id: `r${idx}`,
                enabled,
                name,
                inputId,
                compare,
                threshold,
                hysteresis,
                minOnSec,
                minOffSec,
                outType,
                outputId,
                onValue,
                offValue,
                maxAgeMs,
                userCanToggle,
                userCanSetThreshold,
                userCanSetMinOnSec,
                userCanSetMinOffSec,
                requireReadback: r.requireReadback === true,
            });
        }

        out.sort((a, b) => a.idx - b.idx);
        this._rules = out;
    }

    /**
     * Code-Teil: Methode `_getRule`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getRule
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getRule(idx) {
        return this._rules.find(r => r && r.idx === idx) || null;
    }

    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        // Always create a stable channel tree.
        await this.adapter.setObjectNotExistsAsync('threshold', {
            type: 'channel',
            common: { name: 'Schwellwertsteuerung' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('threshold.rules', {
            type: 'channel',
            common: { name: 'Regeln' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('threshold.user', {
            type: 'channel',
            common: { name: 'User' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, unit = undefined, write = false, def = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!write,
                    ...(unit ? { unit } : {}),
                    ...(def !== undefined ? { def } : {}),
                },
                native: {},
            });
        };

        /**
         * Code-Teil: Arrow-Funktion `ensureDefault`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: ensureDefault
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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

        // Build rules from current config
        this._buildRulesFromConfig();

        // Create fixed slots (1..10) so the VIS can rely on stable ids.
        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`threshold.user.r${i}`, {
                type: 'channel',
                common: { name: `Regel ${i}` },
                native: {},
            });

            await mk(`threshold.user.r${i}.enabled`, 'Regel aktiv (User)', 'boolean', 'switch.enable', undefined, true, true);
            await mk(`threshold.user.r${i}.threshold`, 'Schwellwert (User)', 'number', 'level', undefined, true, 0);
            await mk(`threshold.user.r${i}.minOnSec`, 'MinOn (User)', 'number', 'value', 's', true, true, 0);
            await mk(`threshold.user.r${i}.minOffSec`, 'MinOff (User)', 'number', 'value', 's', true, true, 0);

            await this.adapter.setObjectNotExistsAsync(`threshold.user.r${i}.mode`, {
                type: 'state',
                common: {
                    name: 'Modus (User)',
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: true,
                    min: 0,
                    max: 2,
                    states: { 0: 'Aus', 1: 'Auto', 2: 'An' },
                },
                native: {},
            });


            await ensureDefault(`threshold.user.r${i}.enabled`, true);

            const enState = await this.adapter.getStateAsync(`threshold.user.r${i}.enabled`);
            const enVal = (enState && enState.val !== null && enState.val !== undefined) ? !!enState.val : true;
            await ensureDefault(`threshold.user.r${i}.mode`, enVal ? 1 : 0);


            const rr = this._getRule(i);
            if (rr && rr.threshold !== null && rr.threshold !== undefined) {
                await ensureDefault(`threshold.user.r${i}.threshold`, Number(rr.threshold));
            } else {
                await ensureDefault(`threshold.user.r${i}.threshold`, 0);
            }
            await ensureDefault(`threshold.user.r${i}.minOnSec`, (rr && rr.minOnSec !== undefined && rr.minOnSec !== null) ? Number(rr.minOnSec) : 0);
            await ensureDefault(`threshold.user.r${i}.minOffSec`, (rr && rr.minOffSec !== undefined && rr.minOffSec !== null) ? Number(rr.minOffSec) : 0);
        }

        // Diagnostics per rule
        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`threshold.rules.r${i}`, {
                type: 'channel',
                common: { name: `Regel ${i}` },
                native: {},
            });

            await mk(`threshold.rules.r${i}.configured`, 'Konfiguriert', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.effectiveEnabled`, 'Effektiv aktiv', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.active`, 'Ausgang aktiv', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.input`, 'Input', 'number', 'value');
            await mk(`threshold.rules.r${i}.thresholdEff`, 'Schwellwert effektiv', 'number', 'value');
            await mk(`threshold.rules.r${i}.status`, 'Status', 'string', 'text');
            await mk(`threshold.rules.r${i}.lastChange`, 'Letzte Umschaltung (ts)', 'number', 'value.time');
            await mk(`threshold.rules.r${i}.lastWriteOk`, 'Letzter Write OK', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.owner`, 'Aktor-Owner', 'string', 'text');
            await mk(`threshold.rules.r${i}.readbackOk`, 'Readback bestätigt', 'boolean', 'indicator');
        }

        // Register user states (read) in dpRegistry for deterministic reads
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `thr.user.r${i}.enabled`, objectId: `${ns}.threshold.user.r${i}.enabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.threshold`, objectId: `${ns}.threshold.user.r${i}.threshold`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.mode`, objectId: `${ns}.threshold.user.r${i}.mode`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.minOnSec`, objectId: `${ns}.threshold.user.r${i}.minOnSec`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.minOffSec`, objectId: `${ns}.threshold.user.r${i}.minOffSec`, dataType: 'number', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

        // Register rule input/output datapoints (if mapped)
        try {
            if (this.dp) {
                for (const r of this._rules) {
                    if (r.inputId) {
                        await this.dp.upsert({ key: `thr.${r.id}.in`, objectId: r.inputId, dataType: 'number', direction: 'in' });
                    }
                    if (r.outputId) {
                        await this.dp.upsert({ key: `thr.${r.id}.out`, objectId: r.outputId, dataType: (r.outType === 'boolean' ? 'boolean' : 'number'), direction: 'out' });
                    }
                }
            }
        } catch (_e) {
            // ignore
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
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _ruleOwner(r, isManual) {
        return isManual ? `manual.threshold.${r.id}` : `threshold.${r.id}`;
    }

    _ruleHasExclusiveAuthority(r, owner) {
        if (String(owner || '').startsWith('manual.')) return true;
        const matrix = this.adapter && this.adapter._stageAActuatorOwnerById;
        const row = matrix && typeof matrix === 'object' ? matrix[r.outputId] : null;
        const activeOwners = Array.isArray(row && row.activeOwners)
            ? row.activeOwners.map((value) => String(value || '').trim()).filter(Boolean)
            : [];
        return activeOwners.length === 1 && activeOwners[0] === owner;
    }

    async _writeRuleOutput(r, want, isManual) {
        const owner = this._ruleOwner(r, isManual);
        const reason = `${r.name}: ${want ? 'on' : 'off'}`;
        const enforceAuthority = this._ruleHasExclusiveAuthority(r, owner);
        return withActuatorShadowContext(this.adapter, {
            owner, module: 'thresholdControl', priority: priorityForOwner(owner),
            reason, leaseMs: isManual ? 5 * 60 * 1000 : 20000,
            kind: isManual ? 'manual-threshold' : 'threshold-rule', enforceAuthority,
        }, async () => {
            if (!this.dp) return false;
            const outKey = `thr.${r.id}.out`;
            return r.outType === 'boolean'
                ? this.dp.writeBoolean(outKey, want ? !!r.onValue : !!r.offValue, false)
                : this.dp.writeNumber(outKey, want ? Number(r.onValue) : Number(r.offValue), false);
        });
    }

    async _readRuleOutput(r) {
        if (!r || !r.outputId || !this.adapter || typeof this.adapter.getForeignStateAsync !== 'function') return null;
        try {
            const state = await this.adapter.getForeignStateAsync(r.outputId);
            return state && state.val !== undefined ? state.val : null;
        } catch (_error) {
            return null;
        }
    }

    _readbackMatches(r, want, value) {
        if (value === null || value === undefined) return null;
        const expected = want ? r.onValue : r.offValue;
        if (r.outType === 'boolean') return !!value === !!expected;
        const a = Number(value); const b = Number(expected);
        return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.001) : false;
    }

    async tick() {
        const enabled = this._isEnabled();
        const now = Date.now();

        // Update configured flags even if module disabled (UI diagnostics)
        for (let i = 1; i <= 10; i++) {
            const r = this._getRule(i);
            const configured = !!(r && r.inputId && r.outputId && r.threshold !== null && r.threshold !== undefined);
            await this._setStateIfChanged(`threshold.rules.r${i}.configured`, configured);
            if (!enabled) {
                await this._setStateIfChanged(`threshold.rules.r${i}.effectiveEnabled`, false);
                await this._setStateIfChanged(`threshold.rules.r${i}.status`, configured ? 'disabled' : 'unconfigured');
            }
        }

        if (!enabled) return;

        for (const r of this._rules) {
            const id = r.id;
            const idx = r.idx;

            const configured = !!(r.inputId && r.outputId && r.threshold !== null && r.threshold !== undefined);
            if (!configured) {
                await this._setStateIfChanged(`threshold.rules.r${idx}.effectiveEnabled`, false);
                await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'unconfigured');
                continue;
            }

            // User overrides (optional)
            let userEnabled = (this.dp && r.userCanToggle) ? this.dp.getBoolean(`thr.user.r${idx}.enabled`, true) : true;
            // User-Modus (0=Aus, 1=Auto, 2=An). Falls nicht vorhanden: Fallback auf enabled.
            let userMode = 1;
            if (this.dp && r.userCanToggle) {
                const mv = this.dp.getNumber(`thr.user.r${idx}.mode`, NaN);
                if (Number.isFinite(mv)) userMode = Math.max(0, Math.min(2, Math.round(mv)));
                else userMode = userEnabled ? 1 : 0;
            }
            const isManual = (userMode === 0 || userMode === 2);


            let thrEff = Number(r.threshold);
            if (this.dp && r.userCanSetThreshold) {
                const ut = this.dp.getNumber(`thr.user.r${idx}.threshold`, thrEff);
                if (Number.isFinite(ut)) thrEff = ut;
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.thresholdEff`, thrEff);

            const effEnabled = !!(r.enabled && (isManual ? true : userEnabled));
            await this._setStateIfChanged(`threshold.rules.r${idx}.effectiveEnabled`, effEnabled);

            await this._setStateIfChanged(`threshold.rules.r${idx}.owner`, this._ruleOwner(r, isManual));
            if (!effEnabled) {
                await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'inactive');
                // Do not force outputs; we only stop regulating.
                continue;
            }

            // Input read (freshness)
            const inKey = `thr.${id}.in`;
            let input = null;
            if (this.dp) {
                input = this.dp.getNumberFresh(inKey, r.maxAgeMs, null);
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.input`, input);

            if (typeof input !== 'number') {
                if (!isManual) {
                    await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'stale');
                    continue;
                }
                // Manuell: keine Eingangsprüfung erforderlich
            }

            // State memory
            const mem = this._hyst.get(id) || { active: false, initialized: false, lastOnMs: 0, lastOffMs: 0, lastChangeMs: 0 };
            const outputBefore = await this._readRuleOutput(r);
            const onReadback = this._readbackMatches(r, true, outputBefore);
            const offReadback = this._readbackMatches(r, false, outputBefore);
            if (!mem.initialized && (onReadback === true || offReadback === true)) { mem.active = onReadback === true; mem.initialized = true; }
            let want = mem.active;
            let status = mem.active ? 'active' : 'inactive';

            if (isManual) {
                // Manuelle Übersteuerung: sofortiges An/Aus
                want = (userMode === 2);
                status = want ? 'manual_on' : 'manual_off';
            } else {
                // Hysteresis thresholds
                const hyst = Math.max(0, Number(r.hysteresis || 0));
                let onThr = thrEff;
                let offThr = thrEff;

                if (r.compare === 'above') offThr = thrEff - hyst;
                else offThr = thrEff + hyst;

                if (!mem.active) {
                    // OFF -> ON
                    if (r.compare === 'above') {
                        if (input >= onThr) want = true;
                    } else {
                        if (input <= onThr) want = true;
                    }
                } else {
                    // ON -> OFF
                    if (r.compare === 'above') {
                        if (input <= offThr) want = false;
                    } else {
                        if (input >= offThr) want = false;
                    }
                }

                // minOn/minOff constraints (anti-flatter)
                // Optional: these parameters can be Endkunden-tunable via VIS (if enabled per rule)
                const canUserMinOn = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : !!r.userCanSetThreshold;
                const canUserMinOff = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : !!r.userCanSetThreshold;

                const userMinOnSec = canUserMinOn ? this.dp.getNumberFresh(`thr.user.r${idx}.minOnSec`, 7 * 24 * 3600 * 1000, null) : null;
                const userMinOffSec = canUserMinOff ? this.dp.getNumberFresh(`thr.user.r${idx}.minOffSec`, 7 * 24 * 3600 * 1000, null) : null;

                const effMinOnSec = (userMinOnSec !== null && userMinOnSec !== undefined && Number.isFinite(userMinOnSec)) ? userMinOnSec : Number(r.minOnSec || 0);
                const effMinOffSec = (userMinOffSec !== null && userMinOffSec !== undefined && Number.isFinite(userMinOffSec)) ? userMinOffSec : Number(r.minOffSec || 0);

                const minOnMs = Math.max(0, Math.round(effMinOnSec * 1000));
                const minOffMs = Math.max(0, Math.round(effMinOffSec * 1000));

                if (!mem.active && want) {
                    // pending ON?
                    if (minOffMs > 0 && mem.lastOffMs > 0 && (now - mem.lastOffMs) < minOffMs) {
                        want = false;
                        status = 'pending_on';
                    }
                } else if (mem.active && !want) {
                    // pending OFF?
                    if (minOnMs > 0 && mem.lastOnMs > 0 && (now - mem.lastOnMs) < minOnMs) {
                        want = true;
                        status = 'pending_off';
                    }
                }
            }

            let wrote = false;
            try { wrote = await this._writeRuleOutput(r, want, isManual); } catch (_e) { wrote = false; }
            const readbackAfter = await this._readRuleOutput(r);
            const readbackOk = this._readbackMatches(r, want, readbackAfter);
            const accepted = wrote === true || wrote === null;
            const confirmed = readbackOk === true || (accepted && r.requireReadback !== true);

            if (confirmed) {
                if (want !== mem.active || !mem.initialized) {
                    mem.active = want; mem.initialized = true; mem.lastChangeMs = now;
                    if (want) mem.lastOnMs = now; else mem.lastOffMs = now;
                    await this._setStateIfChanged(`threshold.rules.r${idx}.lastChange`, now);
                }
                status = isManual ? (want ? 'manual_on' : 'manual_off') : (want ? 'active' : 'inactive');
            } else if (!accepted) {
                status = 'write_blocked_or_failed';
            } else {
                status = 'readback_pending';
            }
            this._hyst.set(id, mem);
            await this._setStateIfChanged(`threshold.rules.r${idx}.lastWriteOk`, accepted);
            await this._setStateIfChanged(`threshold.rules.r${idx}.readbackOk`, readbackOk === true);

            await this._setStateIfChanged(`threshold.rules.r${idx}.active`, mem.active);
            await this._setStateIfChanged(`threshold.rules.r${idx}.status`, status);
        }
    }
}

module.exports = { ThresholdControlModule };
