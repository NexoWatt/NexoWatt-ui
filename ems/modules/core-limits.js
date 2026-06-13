/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/core-limits.js
 * Rolle im Projekt: Zentrale Messbasis / Budgets.
 * Zweck: Berechnet EMS-Grundwerte, PV-Budget, Netzbudget und Speicher-/Lastflüsse.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Zentrale EMS-Budget- und Limitberechnung für PV, Netzanschluss, Speicher, §14a, Peak-Shaving und Verbraucherbudgets.
 * Zusammenhänge:
 * - Erzeugt Basiswerte, die Heizstab, EVCS, KI-Berater und LIVE-Dashboard verwenden.
 * - Muss dieselbe Speicher-/Netz-DP-Auflösung wie main.js/www/app.js berücksichtigen.
 * Wartungshinweise:
 * - Sehr kritisch für History und Regelungslogik; Änderungen immer mit Split-DP, Signed-DP und Fallback testen.
 */

'use strict';


/**
 * Datenvertrag: CoreLimitSnapshot
 * Zweck: Fachlicher Vertrag der zentralen EMS-Messbasis.
 * Zusammenhang: Heizstab, EVCS, Peak-Shaving, KI-Berater und Dashboard verlassen sich auf diese Werte.
 * TypeScript-Ziel: CoreLimitSnapshot mit Wattwerten, Prozentwerten und Source-Informationen anlegen.
 */

/**
 * Vertragsstelle: Speicherauflösung
 * Zweck: core-limits.js muss Split-DPs, signed Speicher-DP und Fallback exakt so behandeln wie Frontend und main.js.
 * Wichtig: 0 W ist gültig; ein gemappter Speicher-DP darf nicht durch Bilanzrechnung überschrieben werden.
 */


const { BaseModule } = require('./base');


/**
 * Code-Teil: requireCoreBudgetTsMirror
 *
 * Zweck:
 * Lädt den aus TypeScript erzeugten CommonJS-Spiegel für Core-Limits/Budget.
 *
 * Zusammenhang:
 * In 0.7.77 wird der Spiegel nur im Shadow-Modus genutzt. Die produktive
 * `core-limits.js`-Logik bleibt führend. Der Mirror darf hier keine States
 * überschreiben und keine Verbraucher schalten.
 *
 * Wartung:
 * Wenn der Pfad oder die Exportnamen geändert werden, müssen `test:ems-shadow`
 * und die Mirror-Checks mit angepasst werden.
 */
function requireCoreBudgetTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/core-limits/core-budget');
    } catch (_e) {
        return null;
    }
}

/**
 * Code-Teil: compareShadowWatt
 *
 * Zweck:
 * Vergleicht einen JavaScript-Runtime-Wert mit einem TypeScript-Shadow-Wert.
 * Kleine Rundungsabweichungen werden toleriert, damit Diagnose nicht rauscht.
 *
 * Zusammenhang:
 * Core-Limits-/Heizstab-Shadow-Vergleiche nutzen diese Struktur, damit spätere
 * Auswertung im App-Center nicht jedes Feld anders interpretieren muss.
 */
function compareShadowWatt(field, jsValue, tsValue, toleranceW = 5) {
    const js = Number(jsValue);
    const ts = Number(tsValue);
    if (!Number.isFinite(js) && !Number.isFinite(ts)) return null;
    const ok = Number.isFinite(js) && Number.isFinite(ts) && Math.abs(js - ts) <= toleranceW;
    return ok ? null : { field, js: Number.isFinite(js) ? Math.round(js) : null, ts: Number.isFinite(ts) ? Math.round(ts) : null };
}
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(v, minV, maxV, fallback = null) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    let x = n;
    if (Number.isFinite(minV)) x = Math.max(minV, x);
    if (Number.isFinite(maxV)) x = Math.min(maxV, x);
    return x;
}
/**
 * Code-Teil: roundW
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function roundW(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : fallback;
}
/**
 * Code-Teil: isFiniteNumber
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}
/**
 * Code-Teil: isPeakShavingRuntimeEnabled
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isPeakShavingRuntimeEnabled(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    if (cfg.enablePeakShaving === true) return true;
    const ps = (cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};
    const atypical = (ps.atypical && typeof ps.atypical === 'object') ? ps.atypical : {};
    return atypical.enabled === true;
}
/**
 * Code-Teil: readStateNumber
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function readStateNumber(adapter, id, fallback = null) {
    try {
        const st = await adapter.getStateAsync(id);
        const n = st ? Number(st.val) : NaN;
        return Number.isFinite(n) ? n : fallback;
    } catch {
        return fallback;
    }
}
/**
 * Code-Teil: readStateBool
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function readStateBool(adapter, id, fallback = null) {
    try {
        const st = await adapter.getStateAsync(id);
        if (!st) return fallback;
        if (st.val === null || st.val === undefined) return fallback;
        if (typeof st.val === 'boolean') return st.val;
        if (typeof st.val === 'number') return st.val !== 0;
        if (typeof st.val === 'string') {
            const s = st.val.trim().toLowerCase();
            if (s === 'true' || s === '1' || s === 'on' || s === 'yes' || s === 'active' || s === 'ja') return true;
            if (s === 'false' || s === '0' || s === 'off' || s === 'no' || s === 'inactive' || s === 'nein') return false;
        }
        return !!st.val;
    } catch {
        return fallback;
    }
}
/**
 * Code-Teil: readStateString
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function readStateString(adapter, id, fallback = '') {
    try {
        const st = await adapter.getStateAsync(id);
        if (!st) return fallback;
        const s = String(st.val ?? '').trim();
        return s;
    } catch {
        return fallback;
    }
}
/**
 * Code-Teil: makeBudgetRuntime
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function makeBudgetRuntime(adapter, snapshot) {
    const ts = Number(snapshot && snapshot.ts) || Date.now();
    const totalEffRaw = snapshot && snapshot.gates && snapshot.gates.total ? snapshot.gates.total.effectiveW : Number.POSITIVE_INFINITY;
    const totalEff = (totalEffRaw === null || totalEffRaw === undefined) ? Number.POSITIVE_INFINITY : Number(totalEffRaw);
    const pvEff = snapshot && snapshot.gates && snapshot.gates.pv ? snapshot.gates.pv.effectiveW : 0;

    const rt = {
        ts,
        version: 1,
        gates: snapshot.gates || {},
        raw: snapshot.raw || {},
        remainingTotalW: Number.isFinite(totalEff) ? Math.max(0, totalEff) : Number.POSITIVE_INFINITY,
        remainingPvW: Math.max(0, Number(pvEff) || 0),
        consumers: {},
        order: [],

        /**
         * Code-Teil: Methode `reserve`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: reserve
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        reserve(req) {
            const r = (req && typeof req === 'object') ? req : {};
            const key = String(r.key || r.consumer || r.app || 'unknown').trim() || 'unknown';
            const app = String(r.app || key).trim() || key;
            const priority = Number.isFinite(Number(r.priority)) ? Number(r.priority) : 999;
            const requestedW = Math.max(0, Number.isFinite(Number(r.requestedW)) ? Number(r.requestedW) : 0);
            const reserveW = Math.max(0, Number.isFinite(Number(r.reserveW)) ? Number(r.reserveW) : requestedW);
            const pvReserveW = Math.max(0, Number.isFinite(Number(r.pvReserveW)) ? Number(r.pvReserveW) : (r.pvOnly ? reserveW : 0));
            const totalCap = Number.isFinite(this.remainingTotalW) ? this.remainingTotalW : Number.POSITIVE_INFINITY;
            const pvCap = Math.max(0, this.remainingPvW);
            const cap = r.pvOnly ? Math.min(totalCap, pvCap) : totalCap;
            const grantW = Math.max(0, Math.min(requestedW, cap));

            if (Number.isFinite(this.remainingTotalW)) this.remainingTotalW = Math.max(0, this.remainingTotalW - reserveW);
            this.remainingPvW = Math.max(0, this.remainingPvW - pvReserveW);

            const reserveRoundedW = roundW(reserveW);
            const pvReserveRoundedW = roundW(pvReserveW);
            const actualW = Math.max(0, Number.isFinite(Number(r.actualW)) ? Number(r.actualW) : reserveW);
            const actualRoundedW = roundW(actualW);
            const entry = {
                key,
                app,
                label: String(r.label || key),
                priority,
                requestedW: roundW(requestedW),
                grantW: roundW(grantW),
                // Public display/API aliases: diagnostics and UIs expect usedW/pvUsedW.
                // Runtime reservations also keep reserveW/pvReserveW for internal clarity.
                usedW: reserveRoundedW,
                pvUsedW: pvReserveRoundedW,
                reserveW: reserveRoundedW,
                pvReserveW: pvReserveRoundedW,
                actualW: actualRoundedW,
                pvOnly: !!r.pvOnly,
                mode: String(r.mode || ''),
                ts: Date.now(),
                remainingTotalW: Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : null,
                remainingPvW: roundW(this.remainingPvW),
            };
            this.consumers[key] = entry;
            if (!this.order.includes(key)) this.order.push(key);

            try {
                const pfx = `ems.budget.consumers.${key}`;
                const liveConsumers = this.order.map(k => this.consumers[k] || null).filter(Boolean);
                const flexUsedW = liveConsumers.reduce((sum, c) => sum + Math.max(0, Number(c.usedW ?? c.reserveW) || 0), 0);
                if (adapter && typeof adapter.setStateAsync === 'function') {
                    adapter.setStateAsync(`${pfx}.usedW`, reserveRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.pvUsedW`, pvReserveRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.actualW`, actualRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.priority`, roundW(priority), true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.mode`, String(r.mode || ''), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.flexUsedW', roundW(flexUsedW), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.remainingTotalW', Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : 0, true).catch(() => {});
                    adapter.setStateAsync('ems.budget.remainingPvW', roundW(this.remainingPvW), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.consumersJson', JSON.stringify(liveConsumers), true).catch(() => {});
                }
                if (adapter && typeof adapter.updateValue === 'function') {
                    const now = Date.now();
                    adapter.updateValue(`${pfx}.usedW`, reserveRoundedW, now);
                    adapter.updateValue(`${pfx}.pvUsedW`, pvReserveRoundedW, now);
                    adapter.updateValue(`${pfx}.actualW`, actualRoundedW, now);
                    adapter.updateValue('ems.budget.flexUsedW', roundW(flexUsedW), now);
                    adapter.updateValue('ems.budget.remainingTotalW', Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : 0, now);
                    adapter.updateValue('ems.budget.remainingPvW', roundW(this.remainingPvW), now);
                    adapter.updateValue('ems.budget.consumersJson', JSON.stringify(liveConsumers), now);
                }
            } catch (_e) {
                // Diagnostics only.
            }

            return entry;
        },

        /**
         * Code-Teil: Methode `peek`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: peek
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        peek() {
            return {
                ts: this.ts,
                gates: this.gates,
                raw: this.raw,
                remainingTotalW: Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : null,
                remainingPvW: roundW(this.remainingPvW),
                consumers: this.consumers,
                order: this.order.slice(),
            };
        },
    };

    return rt;
}

/**
 * Phase 4.0/4.8: zentrale Cap-/Budget-/Gate-Snapshot-Schicht.
 *
 * Ziele:
 * - EIN zentraler, pro Tick deterministischer Snapshot für Limits/Budgets.
 * - Gate A/B/C laufen immer im Hintergrund, unabhängig davon, welche App gerade aktiv ist.
 * - Apps können das zentrale Budget lesen/reservieren und regeln dadurch nicht mehr gegeneinander.
 *
 * Wichtiger Grundsatz:
 * - Dieser Core schreibt KEINE Geräte-Setpoints.
 * - Er stellt nur konsistente Caps/Budgets bereit, die andere Module nutzen.
 */
/**
 * Code-Teil: Klasse `CoreLimitsModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: CoreLimitsModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Zentrale Leistungsbudgets, PV-/Netz-/Speicherbasis und EMS-Limits.
/**
 * Klasse: CoreLimitsModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class CoreLimitsModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._inited = false;
    }
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        await this.adapter.setObjectNotExistsAsync('ems.core', {
            type: 'channel',
            common: { name: 'EMS Core' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget', {
            type: 'channel',
            common: { name: 'EMS Budget & Gates' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.gates', {
            type: 'channel',
            common: { name: 'Budget Gates' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.consumers', {
            type: 'channel',
            common: { name: 'Budget Consumers' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.forecast', {
            type: 'channel',
            common: { name: 'Budget Gate D - PV Forecast' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('ems.budget.tariff', {
            type: 'channel',
            common: { name: 'Budget Gate E - Tarif / Negativpreis' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, unit = undefined, write = false) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!write,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('ems.core.lastUpdate', 'Last update (ts)', 'number', 'value.time');

        // Grid/Plant Caps
        await mk('ems.core.gridConnectionLimitW_cfg', 'Grid connection limit (W) configured', 'number', 'value.power', 'W');
        await mk('ems.core.gridSafetyMarginW', 'Grid safety margin (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridConstraintsCapW', 'Grid constraints cap (W) (RLM/EVU)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_effective', 'Grid import limit effective (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_physical', 'Grid import limit physical (W) (cfg/EVU minus margin)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_peakShaving', 'Grid import limit from Peak-Shaving (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_source', 'Grid import limit binding source', 'string', 'text');
        await mk('ems.core.gridMaxPhaseA_cfg', 'Grid max phase current (A) configured', 'number', 'value.current', 'A');

        // Peak
        await mk('ems.core.peakActive', 'Peak active', 'boolean', 'indicator');
        await mk('ems.core.peakBudgetW', 'Peak budget for controlled loads (W)', 'number', 'value.power', 'W');

        // Tariff
        await mk('ems.core.tariffBudgetW', 'Tariff cap for controlled loads (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridChargeAllowed', 'Grid charge allowed', 'boolean', 'indicator');
        await mk('ems.core.dischargeAllowed', 'Discharge allowed', 'boolean', 'indicator');

        // §14a
        await mk('ems.core.para14aActive', '§14a active', 'boolean', 'indicator');
        await mk('ems.core.para14aMode', '§14a mode', 'string', 'text');
        await mk('ems.core.para14aEvcsCapW', '§14a EVCS cap (W)', 'number', 'value.power', 'W');

        // Result (high-level)
        await mk('ems.core.evcsHighLevelCapW', 'EVCS high level cap (W) (min of peak/tariff/14a)', 'number', 'value.power', 'W');
        await mk('ems.core.evcsHighLevelBinding', 'EVCS high level binding sources', 'string', 'text');
        await mk('ems.core.snapshot', 'Snapshot (JSON)', 'string', 'text');

        // Central gates. These are app-independent and intentionally live under ems.budget.
        await mk('ems.budget.lastUpdate', 'Budget last update (ts)', 'number', 'value.time');
        await mk('ems.budget.active', 'Budget coordinator active', 'boolean', 'indicator');
        await mk('ems.budget.mode', 'Budget coordinator mode', 'string', 'text');
        await mk('ems.budget.totalBudgetW', 'Total controlled-load budget (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.remainingTotalW', 'Remaining controlled-load budget (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetRawW', 'PV budget raw before reserve (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetW', 'PV budget effective (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.remainingPvW', 'Remaining PV budget (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.gridW', 'Grid power signed (W) (+ import / - export)', 'number', 'value.power', 'W');
        await mk('ems.budget.gridExportW', 'Grid export (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.gridImportW', 'Grid import (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.storageChargeW', 'Storage charge power (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.storageDischargeW', 'Storage discharge power (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvPowerW', 'PV production power (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.flexUsedW', 'Already active flexible load (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.binding', 'Budget binding source', 'string', 'text');
        await mk('ems.budget.consumersJson', 'Budget consumers (JSON)', 'string', 'text');
        await mk('ems.budget.snapshot', 'Budget snapshot (JSON)', 'string', 'text');
        await mk('ems.budget.tsShadowJson', 'TypeScript Core-Budget Shadow-Vergleich (JSON)', 'string', 'json');

        // Gate D - PV Forecast. Advisory background gate for forecast-aware app decisions.
        // It does not write setpoints and does not change the instantaneous PV budget by itself.
        await mk('ems.budget.forecast.valid', 'PV forecast valid', 'boolean', 'indicator');
        await mk('ems.budget.forecast.usable', 'PV forecast usable for app decisions', 'boolean', 'indicator');
        await mk('ems.budget.forecast.ageMs', 'PV forecast age (ms)', 'number', 'value', 'ms');
        await mk('ems.budget.forecast.points', 'PV forecast points', 'number', 'value');
        await mk('ems.budget.forecast.confidencePct', 'PV forecast confidence (%)', 'number', 'value', '%');
        await mk('ems.budget.forecast.nowW', 'PV forecast now (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.avgNext1hW', 'PV forecast average next 1h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.avgNext3hW', 'PV forecast average next 3h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.peakNext6hW', 'PV forecast peak next 6h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.peakNext24hW', 'PV forecast peak next 24h (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.forecast.kwhNext1h', 'PV forecast energy next 1h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext3h', 'PV forecast energy next 3h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext6h', 'PV forecast energy next 6h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext12h', 'PV forecast energy next 12h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.kwhNext24h', 'PV forecast energy next 24h (kWh)', 'number', 'value.energy', 'kWh');
        await mk('ems.budget.forecast.status', 'PV forecast gate status', 'string', 'text');
        await mk('ems.budget.forecast.source', 'PV forecast source', 'string', 'text');
        await mk('ems.budget.forecast.snapshotJson', 'PV forecast gate snapshot (JSON)', 'string', 'json');

        // Gate E - Tarif / Negativpreis. Advisory + permission gate for price-aware control.
        // It does not bypass hard grid/phase/§14a/peak limits; it only tells apps that
        // grid import is economically preferred during negative effective prices.
        await mk('ems.budget.tariff.active', 'Tariff gate active', 'boolean', 'indicator');
        await mk('ems.budget.tariff.state', 'Tariff state', 'string', 'text');
        await mk('ems.budget.tariff.currentPriceEurKwh', 'Current tariff price (€/kWh)', 'number', 'value');
        await mk('ems.budget.tariff.negativeActive', 'Negative price active', 'boolean', 'indicator');
        await mk('ems.budget.tariff.gridImportPreferred', 'Grid import preferred', 'boolean', 'indicator');
        await mk('ems.budget.tariff.storageGridChargeAllowed', 'Storage grid charge allowed by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.evcsGridChargeAllowed', 'EVCS grid charge allowed by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.dischargeAllowed', 'Discharge allowed by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.pvCurtailRecommended', 'PV curtailment recommended by tariff', 'boolean', 'indicator');
        await mk('ems.budget.tariff.negativeMinPriceEurKwh', 'Minimum negative price in horizon (€/kWh)', 'number', 'value');
        await mk('ems.budget.tariff.nextNegativeFrom', 'Next negative price window from (ISO)', 'string', 'text');
        await mk('ems.budget.tariff.nextNegativeTo', 'Next negative price window to (ISO)', 'string', 'text');
        await mk('ems.budget.tariff.status', 'Tariff gate status', 'string', 'text');
        await mk('ems.budget.tariff.snapshotJson', 'Tariff gate snapshot (JSON)', 'string', 'json');

        // Per-consumer diagnostics for currently supported app families.
        for (const key of ['evcs', 'thermal', 'heatingRod', 'generic']) {
            await this.adapter.setObjectNotExistsAsync(`ems.budget.consumers.${key}`, {
                type: 'channel',
                common: { name: `Budget consumer ${key}` },
                native: {},
            });
            await mk(`ems.budget.consumers.${key}.usedW`, `${key} used (W)`, 'number', 'value.power', 'W');
            await mk(`ems.budget.consumers.${key}.pvUsedW`, `${key} PV used (W)`, 'number', 'value.power', 'W');
            await mk(`ems.budget.consumers.${key}.actualW`, `${key} actual power (W)`, 'number', 'value.power', 'W');
            await mk(`ems.budget.consumers.${key}.priority`, `${key} priority`, 'number', 'value');
            await mk(`ems.budget.consumers.${key}.mode`, `${key} mode`, 'string', 'text');
        }

        this._inited = true;
    }

    /**
     * Code-Teil: Methode `_readDpNumberFresh`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readDpNumberFresh
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readDpNumberFresh(keys, maxAgeMs, fallback = null) {
        if (!this.dp || !Array.isArray(keys)) return fallback;
        for (const k of keys) {
            if (!k) continue;
            try {
                const v = this.dp.getNumberFresh(String(k), maxAgeMs, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            } catch (_e) {}
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readCacheNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readCacheNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readCacheNumber(keys, fallback = null) {
        const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
        if (!cache || !Array.isArray(keys)) return fallback;
        for (const k of keys) {
            if (!k) continue;
            try {
                const rec = cache[String(k)];
                const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
                const v = Number(raw);
                if (Number.isFinite(v)) return v;
            } catch (_e) {}
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readCacheNumberMax`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readCacheNumberMax
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readCacheNumberMax(keys, fallback = null) {
        const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
        if (!cache || !Array.isArray(keys)) return fallback;
        let best = null;
        for (const k of keys) {
            if (!k) continue;
            try {
                const rec = cache[String(k)];
                const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
                const v = Number(raw);
                if (Number.isFinite(v)) best = best === null ? v : Math.max(best, v);
            } catch (_e) {}
        }
        return best === null ? fallback : best;
    }

    /**
     * Code-Teil: Methode `_readRuntimeOrStateNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readRuntimeOrStateNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readRuntimeOrStateNumber(keys, fallback = null) {
        const a = this.adapter || {};
        for (const k of keys || []) {
            if (!k) continue;
            try {
                const v = a[String(k)];
                const n = Number(v);
                if (Number.isFinite(n)) return n;
            } catch (_e) {}
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_forecastPowerAt`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastPowerAt
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastPowerAt(curve, ts) {
        if (!Array.isArray(curve) || !curve.length) return 0;
        const t = Number(ts);
        if (!Number.isFinite(t)) return 0;
        let bestFuture = null;
        for (const s of curve) {
            if (!s || typeof s !== 'object') continue;
            const t0 = Number(s.t);
            const dt = Number(s.dtMs);
            const w = Math.max(0, Number(s.w) || 0);
            if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0) continue;
            const t1 = t0 + dt;
            if (t >= t0 && t < t1) return w;
            if (t0 > t && (bestFuture === null || t0 < bestFuture.t)) bestFuture = { t: t0, w };
        }
        // If there is no segment exactly covering now but the next segment starts soon,
        // expose it as a cautious now-value. Forecast sources sometimes publish anchors
        // on 15/30/60 minute boundaries while the EMS tick is in between.
        if (bestFuture && (bestFuture.t - t) <= 30 * 60 * 1000) return bestFuture.w;
        return 0;
    }

    /**
     * Code-Teil: Methode `_forecastIntegrateKwh`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastIntegrateKwh
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastIntegrateKwh(curve, fromMs, toMs) {
        if (!Array.isArray(curve) || !curve.length) return 0;
        const a = Number(fromMs);
        const b = Number(toMs);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
        let wh = 0;
        for (const s of curve) {
            if (!s || typeof s !== 'object') continue;
            const t0 = Number(s.t);
            const dt = Number(s.dtMs);
            let w = Number(s.w);
            if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(w)) continue;
            if (w < 0) w = 0;
            const t1 = t0 + dt;
            if (t1 <= a || t0 >= b) continue;
            const ov0 = Math.max(a, t0);
            const ov1 = Math.min(b, t1);
            const ovMs = ov1 - ov0;
            if (ovMs > 0) wh += w * (ovMs / 3600000);
        }
        return wh / 1000;
    }

    /**
     * Code-Teil: Methode `_forecastPeakW`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastPeakW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastPeakW(curve, fromMs, toMs) {
        if (!Array.isArray(curve) || !curve.length) return 0;
        const a = Number(fromMs);
        const b = Number(toMs);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
        let peak = 0;
        for (const s of curve) {
            if (!s || typeof s !== 'object') continue;
            const t0 = Number(s.t);
            const dt = Number(s.dtMs);
            const w = Math.max(0, Number(s.w) || 0);
            if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0) continue;
            const t1 = t0 + dt;
            if (t1 <= a || t0 >= b) continue;
            peak = Math.max(peak, w);
        }
        return peak;
    }

    /**
     * Code-Teil: Methode `_forecastConfidencePct`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _forecastConfidencePct
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _forecastConfidencePct(valid, ageMs, points) {
        if (!valid) return 0;
        const p = Number(points);
        if (!Number.isFinite(p) || p <= 0) return 0;
        const age = Number(ageMs);
        if (!Number.isFinite(age) || age < 0) return 90;
        if (age <= 2 * 3600000) return 100;
        if (age <= 6 * 3600000) return 85;
        if (age <= 12 * 3600000) return 70;
        if (age <= 24 * 3600000) return 50;
        return 20;
    }

    /**
     * Code-Teil: Methode `_makeForecastGate`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _makeForecastGate
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _makeForecastGate(now) {
        const pf = (this.adapter && this.adapter._pvForecast && typeof this.adapter._pvForecast === 'object')
            ? this.adapter._pvForecast
            : null;
        const curve = (pf && Array.isArray(pf.curve)) ? pf.curve : [];
        const pointsRaw = pf ? pf.points : null;
        const points = Number.isFinite(Number(pointsRaw)) ? Number(pointsRaw) : curve.length;
        const valid = !!(pf && pf.valid && points > 0);
        const ageMs = (pf && pf.ageMs !== null && pf.ageMs !== undefined && Number.isFinite(Number(pf.ageMs)))
            ? Math.max(0, Number(pf.ageMs))
            : null;
        const confidencePct = this._forecastConfidencePct(valid, ageMs, points);

        const kwh1 = valid ? this._forecastIntegrateKwh(curve, now, now + 1 * 3600000) : 0;
        const kwh3 = valid ? this._forecastIntegrateKwh(curve, now, now + 3 * 3600000) : 0;
        const kwh6 = valid ? Math.max(0, Number(pf.kwhNext6h) || 0, this._forecastIntegrateKwh(curve, now, now + 6 * 3600000)) : 0;
        const kwh12 = valid ? Math.max(0, Number(pf.kwhNext12h) || 0, this._forecastIntegrateKwh(curve, now, now + 12 * 3600000)) : 0;
        const kwh24 = valid ? Math.max(0, Number(pf.kwhNext24h) || 0, this._forecastIntegrateKwh(curve, now, now + 24 * 3600000)) : 0;
        const nowW = valid ? this._forecastPowerAt(curve, now) : 0;
        const avgNext1hW = Math.max(0, kwh1 * 1000);
        const avgNext3hW = Math.max(0, (kwh3 * 1000) / 3);
        const peakNext6hW = valid ? this._forecastPeakW(curve, now, now + 6 * 3600000) : 0;
        const peakNext24hW = valid ? Math.max(0, Number(pf.peakWNext24h) || 0, this._forecastPeakW(curve, now, now + 24 * 3600000)) : 0;
        const ageOk = (ageMs === null) || ageMs <= 24 * 3600000;
        const hasFutureYield = (kwh1 > 0.001) || (kwh3 > 0.001) || (kwh6 > 0.001) || peakNext24hW > 0;
        const usable = !!(valid && ageOk && confidencePct >= 40 && hasFutureYield);

        let status = 'missing';
        if (pf && !valid) status = 'invalid';
        if (valid && !ageOk) status = 'stale';
        if (valid && ageOk && !hasFutureYield) status = 'no_future_yield';
        if (usable) status = 'ok';

        return {
            valid,
            usable,
            ageMs: ageMs === null ? null : roundW(ageMs),
            points: roundW(points),
            confidencePct: roundW(confidencePct),
            nowW: roundW(nowW),
            avgNext1hW: roundW(avgNext1hW),
            avgNext3hW: roundW(avgNext3hW),
            peakNext6hW: roundW(peakNext6hW),
            peakNext24hW: roundW(peakNext24hW),
            kwhNext1h: Number.isFinite(kwh1) ? Number(kwh1.toFixed(3)) : 0,
            kwhNext3h: Number.isFinite(kwh3) ? Number(kwh3.toFixed(3)) : 0,
            kwhNext6h: Number.isFinite(kwh6) ? Number(kwh6.toFixed(3)) : 0,
            kwhNext12h: Number.isFinite(kwh12) ? Number(kwh12.toFixed(3)) : 0,
            kwhNext24h: Number.isFinite(kwh24) ? Number(kwh24.toFixed(3)) : 0,
            status,
            source: pf ? 'forecast.pv' : '',
        };
    }

    /**
     * Code-Teil: Methode `_makeBudgetSnapshot`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _makeBudgetSnapshot
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _makeBudgetSnapshot(now, coreSnapshot) {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const cmCfg = (cfg.chargingManagement && typeof cfg.chargingManagement === 'object') ? cfg.chargingManagement : {};
        const staleTimeoutSec = clamp(num(cmCfg.staleTimeoutSec, 15), 1, 3600, 15) || 15;
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        /**
         * Code-Teil: gridW
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const gridW = (() => {
            const dpVal = this._readDpNumberFresh(['grid.powerRawW', 'ems.gridPowerRawW', 'grid.powerW', 'ems.gridPowerW', 'ps.gridPowerW'], staleMs, null);
            if (isFiniteNumber(dpVal)) return dpVal;
            return this._readCacheNumber(['grid.powerRawW', 'ems.gridPowerRawW', 'grid.powerW', 'ems.gridPowerW', 'gridPower', 'gridPowerW'], 0) || 0;
        })();

        const gridImportW = Math.max(0, gridW || 0);
        const gridExportW = Math.max(0, -(gridW || 0));

        /**
         * Code-Teil: Arrow-Funktion `pvPowerW`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: pvPowerW
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const pvPowerW = (() => {
            const dpVal = this._readDpNumberFresh(['ps.pvW', 'cm.pvPowerW'], staleMs, null);
            if (isFiniteNumber(dpVal)) return Math.max(0, dpVal);
            return Math.max(0, this._readCacheNumber(['derived.core.pv.totalW', 'pvPower', 'productionTotal', 'storageFarm.totalPvPowerW'], 0) || 0);
        })();

        // Speicherleistung wird zentral wie im Energiefluss aufgelöst:
        // - getrennte Lade-/Entlade-DPs bleiben vollständig gültig
        // - signed Batterie-DP bleibt gültig (- = Laden, + = Entladen; invertierbar)
        // - nur wenn keine frische Messquelle vorhanden ist, wird rechnerisch über die Bilanz abgeleitet
        let storageChargeW = 0;
        let storageDischargeW = 0;
        let usedCentralStorageFlow = false;
        try {
            const flow = (this.adapter && typeof this.adapter._nwResolveBatteryFlowFromCache === 'function')
                ? this.adapter._nwResolveBatteryFlowFromCache({ maxAgeMs: staleMs, deadbandW: 25 })
                : null;
            if (flow && typeof flow === 'object') {
                usedCentralStorageFlow = true;
                storageChargeW = Math.max(0, Math.round(Number(flow.chargeW) || 0));
                storageDischargeW = Math.max(0, Math.round(Number(flow.dischargeW) || 0));
            }
        } catch (_eFlow) {}

        if (!usedCentralStorageFlow) {
            // Fallback für sehr alte Laufzeiten ohne zentralen Resolver. Keine Plausibilitäts-
            // Unterdrückung hier: gemappte Split-DPs sind autoritativ.
            storageChargeW = Math.max(0, this._readCacheNumberMax(['storageFarm.totalChargePowerW', 'storageChargePower'], 0) || 0);
            storageDischargeW = Math.max(0, this._readCacheNumberMax(['storageFarm.totalDischargePowerW', 'storageDischargePower'], 0) || 0);
            const batteryPowerW = this._readCacheNumber(['batteryPower'], null);
            if (isFiniteNumber(batteryPowerW)) {
                const flowBatteryMapped = !!(cfg.datapoints && String(cfg.datapoints.batteryPower || '').trim());
                const farmActive = !!this._readCacheNumber(['storageFarm.enabled'], 0);
                const invBattery = flowBatteryMapped && !farmActive && !!(cfg.settings && cfg.settings.flowInvertBattery);
                const signed = Math.round(invBattery ? -batteryPowerW : batteryPowerW);
                if (signed < -25) {
                    storageChargeW = Math.max(storageChargeW, Math.abs(signed));
                    storageDischargeW = 0;
                } else if (signed > 25) {
                    storageDischargeW = Math.max(storageDischargeW, signed);
                    storageChargeW = 0;
                }
            }
        }

        const evcsEnabled = cfg.enableChargingManagement !== false;
        const thermalEnabled = cfg.enableThermalControl === true;
        const heatingRodEnabled = cfg.enableHeatingRodControl === true;

        const evcsUsedRawW = Math.max(0, this._readCacheNumber(['chargingManagement.control.usedW', 'evcs.totalPowerW'], 0) || 0);
        const evcsPvUsedRawW = Math.max(0, this._readCacheNumber(['chargingManagement.control.pvEvcsUsedW'], 0) || 0);
        const thermalUsedRawW = Math.max(0, this._readRuntimeOrStateNumber(['_thermalBudgetUsedW'], null) ?? this._readCacheNumber(['thermal.summary.budgetUsedW'], 0) ?? 0);
        const heatingRodUsedRawW = Math.max(0, this._readRuntimeOrStateNumber(['_heatingRodBudgetUsedW'], null) ?? this._readCacheNumber(['heatingRod.summary.budgetUsedW'], 0) ?? 0);

        // Only active EMS-controlled apps may reserve central budget. Disabled apps can
        // still have old summary states from before a restart/update; those must not
        // create ghost reservations or reduce remainingPvW.
        const evcsUsedW = evcsEnabled ? evcsUsedRawW : 0;
        const evcsPvUsedW = evcsEnabled ? evcsPvUsedRawW : 0;
        const thermalUsedW = thermalEnabled ? thermalUsedRawW : 0;
        const heatingRodUsedW = heatingRodEnabled ? heatingRodUsedRawW : 0;
        const flexUsedW = Math.max(0, evcsUsedW + thermalUsedW + heatingRodUsedW);

        // The raw PV budget is reconstructed from the NVP plus already-running controlled loads.
        // Storage charging is added as parked PV, because consumers with lower priority may be allowed
        // to use it later if their app-specific reserve permits it. Active storage discharge is never PV.
        const pvBudgetRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);
        const pvReserveW = clamp(num(cmCfg.pvChargeReserveW, 500), 0, 1e12, 500) || 0;
        const pvBudgetEffectiveW = Math.max(0, pvBudgetRawW - pvReserveW);
        const pvAvailable = pvBudgetEffectiveW > 0;

        // Total controlled-load budget for grid-cap/§14a/peak/tariff layer.
        const gridLimitW = coreSnapshot && coreSnapshot.grid ? Number(coreSnapshot.grid.gridImportLimitW_effective || 0) : 0;
        const gridHeadroomW = gridLimitW > 0 ? Math.max(0, gridLimitW - gridImportW + flexUsedW) : Number.POSITIVE_INFINITY;
        const highLevelCapW = coreSnapshot && coreSnapshot.evcsHighLevel && isFiniteNumber(coreSnapshot.evcsHighLevel.capW)
            ? Math.max(0, Number(coreSnapshot.evcsHighLevel.capW))
            : Number.POSITIVE_INFINITY;
        const totalBudgetW = Math.max(0, Math.min(gridHeadroomW, highLevelCapW));

        const bindings = [];
        if (gridLimitW > 0 && Math.abs(totalBudgetW - gridHeadroomW) <= 1) bindings.push('grid');
        if (Number.isFinite(highLevelCapW) && Math.abs(totalBudgetW - highLevelCapW) <= 1) bindings.push(coreSnapshot.evcsHighLevel.binding || 'highLevel');
        if (!bindings.length) bindings.push('unlimited');

        // Gate D: PV forecast is an advisory gate. It is published centrally so apps
        // can later reserve/shift loads based on prognosis without each app parsing
        // provider JSON separately. It does not alter instantaneous PV budget here.
        const forecastGate = this._makeForecastGate(now);

        // Gate E: tariff/negative-price gate. This is advisory for all apps and
        // permission-like for modules that already consume tariff flags.
        const tSrc = (coreSnapshot && coreSnapshot.tariff && typeof coreSnapshot.tariff === 'object') ? coreSnapshot.tariff : {};
        const tariffGate = {
            active: !!tSrc.active,
            state: String(tSrc.state || ''),
            currentPriceEurKwh: isFiniteNumber(tSrc.currentPriceEurKwh) ? Number(tSrc.currentPriceEurKwh) : null,
            negativeActive: !!tSrc.negativeActive,
            gridImportPreferred: !!tSrc.gridImportPreferred,
            storageGridChargeAllowed: !!tSrc.storageGridChargeAllowed,
            evcsGridChargeAllowed: !!tSrc.evcsGridChargeAllowed,
            dischargeAllowed: tSrc.dischargeAllowed !== false,
            pvCurtailRecommended: !!tSrc.pvCurtailRecommended,
            negativeMinPriceEurKwh: isFiniteNumber(tSrc.negativeMinPriceEurKwh) ? Number(tSrc.negativeMinPriceEurKwh) : null,
            nextNegativeFrom: String(tSrc.nextNegativeFrom || ''),
            nextNegativeTo: String(tSrc.nextNegativeTo || ''),
            status: String(tSrc.status || (tSrc.gridImportPreferred ? 'grid_import_preferred' : (tSrc.active ? 'active' : 'inactive'))),
        };

        return {
            ts: now,
            active: true,
            mode: 'central-background',
            raw: {
                gridW: roundW(gridW),
                gridImportW: roundW(gridImportW),
                gridExportW: roundW(gridExportW),
                pvPowerW: roundW(pvPowerW),
                storageChargeW: roundW(storageChargeW),
                storageDischargeW: roundW(storageDischargeW),
                evcsUsedW: roundW(evcsUsedW),
                evcsPvUsedW: roundW(evcsPvUsedW),
                thermalUsedW: roundW(thermalUsedW),
                heatingRodUsedW: roundW(heatingRodUsedW),
                flexUsedW: roundW(flexUsedW),
                pvReserveW: roundW(pvReserveW),
            },
            gates: {
                grid: {
                    importLimitW: roundW(gridLimitW),
                    importW: roundW(gridImportW),
                    exportW: roundW(gridExportW),
                    headroomW: Number.isFinite(gridHeadroomW) ? roundW(gridHeadroomW) : null,
                },
                pv: {
                    available: !!pvAvailable,
                    rawW: roundW(pvBudgetRawW),
                    reserveW: roundW(pvReserveW),
                    effectiveW: roundW(pvBudgetEffectiveW),
                    source: 'nvp+controlledLoads+storageCharge-storageDischarge',
                },
                storage: {
                    chargeW: roundW(storageChargeW),
                    dischargeW: roundW(storageDischargeW),
                },
                forecast: forecastGate,
                tariff: tariffGate,
                total: {
                    effectiveW: Number.isFinite(totalBudgetW) ? roundW(totalBudgetW) : null,
                    binding: bindings.join('+'),
                },
            },
            consumers: (() => {
                const out = {};
                if (evcsUsedW > 0 || evcsPvUsedW > 0) {
                    out.evcs = { priority: 100, usedW: roundW(evcsUsedW), pvUsedW: roundW(evcsPvUsedW), mode: 'charging' };
                }
                if (thermalUsedW > 0) {
                    out.thermal = { priority: 200, usedW: roundW(thermalUsedW), pvUsedW: roundW(thermalUsedW), mode: 'pvAuto' };
                }
                if (heatingRodUsedW > 0) {
                    out.heatingRod = { priority: 300, usedW: roundW(heatingRodUsedW), pvUsedW: roundW(heatingRodUsedW), mode: 'pvAuto' };
                }
                return out;
            })(),
        };
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

    /**
     * Code-Teil: _runCoreBudgetTsShadowComparison
     *
     * Zweck:
     * Berechnet aus den bereits vorhandenen JavaScript-Runtimewerten zusätzlich
     * einen TypeScript-Shadow-Snapshot und vergleicht zentrale Budgetfelder.
     *
     * Zusammenhang:
     * Dieser Shadow-Vergleich ist die sichere Vorstufe, bevor Core-Limits später
     * produktiv aus TypeScript kommen dürfen. Die produktive Runtime bleibt in
     * 0.7.77 vollständig bei der bestehenden JavaScript-Logik.
     *
     * Wichtig:
     * - Es werden keine produktiven Werte überschrieben.
     * - Abweichungen werden nur im Diagnose-JSON und als gedrosselte Warnung sichtbar.
     * - Die Eingaben sind so gewählt, dass der TS-Spiegel die aktuelle JS-Budgetregel
     *   nachbildet, inklusive PV-Reserve-Abzug.
     */
    _runCoreBudgetTsShadowComparison(budgetSnapshot) {
        const mirror = requireCoreBudgetTsMirror();
        const build = mirror && typeof mirror.buildCoreBudgetSnapshot === 'function' ? mirror.buildCoreBudgetSnapshot : null;
        if (!build || !budgetSnapshot || typeof budgetSnapshot !== 'object') {
            return { available: false, ok: false, source: 'missing-ts-mirror', mismatches: [] };
        }
        try {
            const raw = budgetSnapshot.raw || {};
            const gates = budgetSnapshot.gates || {};
            const pv = gates.pv || {};
            const grid = gates.grid || {};
            const total = gates.total || {};
            const reserveW = Number(raw.pvReserveW || pv.reserveW || 0);
            const importForGridHeadroom = Math.max(0, Number(raw.gridImportW || 0) - Number(raw.flexUsedW || 0));
            const ts = build({
                ts: budgetSnapshot.ts || Date.now(),
                pvSurplusW: Number(pv.rawW || 0),
                storageReserveW: Number.isFinite(reserveW) ? reserveW : 0,
                alreadyReservedW: 0,
                // Die aktuelle JS-Logik zieht pvReserveW immer vom PV-Budget ab. Für den
                // Vergleich erzwingen wir daher eine aktive Reserve, ohne Runtime-Verhalten
                // zu ändern. Spätere produktive TS-Logik darf hier fachlich verfeinert werden.
                storageSocPct: 0,
                storageReserveSocPct: 100,
                allowStorageDischarge: false,
                gridImportW: importForGridHeadroom,
                gridImportLimitW: Number(grid.importLimitW || 0),
                // Shadow-Abgleich: Die bestehende JS-Runtime begrenzt das Gesamtbudget
                // teilweise über zusätzliche High-Level-Caps. Dieser Deckel wird nur für
                // den Vergleich an den TS-Spiegel übergeben, damit nicht unterschiedliche
                // Budgetbegriffe fälschlich als Fehler angezeigt werden.
                totalBudgetCapW: total.effectiveW === null || total.effectiveW === undefined ? null : Number(total.effectiveW),
                allowGridImport: true,
                peakShavingActive: false,
                externalLimitActive: false,
            });
            const mismatches = [
                compareShadowWatt('pv.rawW', pv.rawW, ts && ts.pv ? ts.pv.rawW : null),
                compareShadowWatt('pv.effectiveW', pv.effectiveW, ts && ts.pv ? ts.pv.effectiveW : null),
                compareShadowWatt('grid.effectiveW', grid.headroomW, ts && ts.grid ? ts.grid.effectiveW : null),
                compareShadowWatt('total.effectiveW', total.effectiveW, ts && ts.total ? ts.total.effectiveW : null),
            ].filter(Boolean);
            const result = {
                available: true,
                ok: mismatches.length === 0,
                source: 'ts-mirror-shadow',
                mismatches,
                js: {
                    pvRawW: roundW(pv.rawW),
                    pvEffectiveW: roundW(pv.effectiveW),
                    gridHeadroomW: grid.headroomW === null || grid.headroomW === undefined ? null : roundW(grid.headroomW),
                    totalEffectiveW: total.effectiveW === null || total.effectiveW === undefined ? null : roundW(total.effectiveW),
                },
                ts: {
                    pvRawW: ts && ts.pv ? roundW(ts.pv.rawW) : null,
                    pvEffectiveW: ts && ts.pv ? roundW(ts.pv.effectiveW) : null,
                    gridEffectiveW: ts && ts.grid ? roundW(ts.grid.effectiveW) : null,
                    totalEffectiveW: ts && ts.total ? roundW(ts.total.effectiveW) : null,
                },
            };
            if (!result.ok) {
                const now = Date.now();
                if (!this._coreTsShadowLastWarnMs || now - this._coreTsShadowLastWarnMs > 60000) {
                    this._coreTsShadowLastWarnMs = now;
                    try {
                        this.adapter.log && this.adapter.log.warn && this.adapter.log.warn(`[core-limits-ts-shadow] JS/TS budget mismatch: ${mismatches.map(m => m.field).join(', ')}`);
                    } catch (_eLog) {}
                }
            }
            return result;
        } catch (e) {
            return { available: true, ok: false, source: 'ts-mirror-shadow', error: e && e.message ? e.message : String(e), mismatches: [] };
        }
    }

    async tick() {
        if (!this._inited) {
            try { await this.init(); } catch { /* ignore */ }
        }

        const now = Date.now();
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const psCfg = (cfg && cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};

        // ------------------------------------------------------------
        // Grid connection / physical caps
        // ------------------------------------------------------------
        const gridConnectionLimitW_cfg = clamp(num(cfg?.installerConfig?.gridConnectionPower, 0), 0, 1e12, 0) || 0;
        const gridSafetyMarginW = clamp(num(psCfg?.safetyMarginW, 0), 0, 1e12, 0) || 0;
        const gridMaxPhaseA_cfg = clamp(num(psCfg?.maxPhaseA, 0), 0, 20000, 0) || 0;

        const gridConstraintsCapW = await readStateNumber(this.adapter, 'gridConstraints.control.maxImportW_final', null);

        let gridImportLimitW_physical = 0;
        {
            let base = (gridConnectionLimitW_cfg > 0) ? gridConnectionLimitW_cfg : 0;
            if (typeof gridConstraintsCapW === 'number' && Number.isFinite(gridConstraintsCapW) && gridConstraintsCapW > 0) {
                base = (base > 0) ? Math.min(base, gridConstraintsCapW) : gridConstraintsCapW;
            }
            if (base > 0) gridImportLimitW_physical = Math.max(0, base - gridSafetyMarginW);
        }

        const peakEnabledCfg = isPeakShavingRuntimeEnabled(cfg);
        const peakShavingLimitW_raw = await readStateNumber(this.adapter, 'peakShaving.control.limitW', null);
        const gridImportLimitW_peakShaving = (peakEnabledCfg && typeof peakShavingLimitW_raw === 'number' && Number.isFinite(peakShavingLimitW_raw) && peakShavingLimitW_raw > 0)
            ? peakShavingLimitW_raw
            : 0;

        let gridImportLimitW_effective = 0;
        let gridImportLimitW_source = '';
        {
            const cands = [];
            if (typeof gridImportLimitW_peakShaving === 'number' && gridImportLimitW_peakShaving > 0) cands.push({ k: 'peak', w: gridImportLimitW_peakShaving });
            if (typeof gridImportLimitW_physical === 'number' && gridImportLimitW_physical > 0) cands.push({ k: 'physical', w: gridImportLimitW_physical });

            if (cands.length) {
                let minW = Number.POSITIVE_INFINITY;
                for (const c of cands) {
                    const w = Number(c.w);
                    if (Number.isFinite(w)) minW = Math.min(minW, w);
                }
                gridImportLimitW_effective = Number.isFinite(minW) ? Math.max(0, minW) : 0;

                const eps = 0.001;
                gridImportLimitW_source = cands
                    .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - Number(gridImportLimitW_effective)) <= eps)
                    .map(c => c.k)
                    .join('+');
            }
        }

        // ------------------------------------------------------------
        // Peak / Tariff / §14a caps
        // ------------------------------------------------------------
        const peakActive = await readStateBool(this.adapter, 'peakShaving.control.active', false);
        const peakBudgetW_raw = await readStateNumber(this.adapter, 'peakShaving.dynamic.availableForControlledW', null);
        const peakBudgetW = (peakActive && typeof peakBudgetW_raw === 'number' && Number.isFinite(peakBudgetW_raw) && peakBudgetW_raw > 0)
            ? peakBudgetW_raw
            : null;

        const tariffBudgetW_raw = await readStateNumber(this.adapter, 'tarif.ladeparkLimitW', null);
        const tariffBudgetW = (typeof tariffBudgetW_raw === 'number' && Number.isFinite(tariffBudgetW_raw) && tariffBudgetW_raw > 0)
            ? tariffBudgetW_raw
            : null;

        const gridChargeAllowed = await readStateBool(this.adapter, 'tarif.netzLadenErlaubt', true);
        const dischargeAllowed = await readStateBool(this.adapter, 'tarif.entladenErlaubt', true);

        const tariffActive = await readStateBool(this.adapter, 'tarif.aktiv', false);
        const tariffState = await readStateString(this.adapter, 'tarif.state', '');
        const tariffCurrentPrice = await readStateNumber(this.adapter, 'tarif.preisAktuellEurProKwh', null);
        const tariffNegativeActive = await readStateBool(this.adapter, 'tarif.negativpreisAktiv', false);
        const tariffGridImportPreferred = await readStateBool(this.adapter, 'tarif.netzbezugBevorzugt', tariffNegativeActive);
        const tariffNegativeMinPrice = await readStateNumber(this.adapter, 'tarif.negativPreisMinEurProKwh', null);
        const tariffNextNegativeFrom = await readStateString(this.adapter, 'tarif.naechstesNegativVon', '');
        const tariffNextNegativeTo = await readStateString(this.adapter, 'tarif.naechstesNegativBis', '');
        const tariffStatus = await readStateString(this.adapter, 'tarif.negativpreisStatus', '');

        const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;

        let para14aActive = false;
        let para14aMode = '';
        let para14aEvcsCapW = null;

        if (p14a && typeof p14a === 'object') {
            para14aActive = !!p14a.active;
            para14aMode = para14aActive ? String(p14a.mode || '') : '';
            const cap = (para14aActive && typeof p14a.evcsTotalCapW === 'number' && Number.isFinite(p14a.evcsTotalCapW) && p14a.evcsTotalCapW > 0)
                ? p14a.evcsTotalCapW
                : null;
            para14aEvcsCapW = (typeof cap === 'number') ? cap : null;
        } else {
            const a = await readStateBool(this.adapter, 'para14a.active', false);
            para14aActive = !!a;
            para14aMode = para14aActive ? await readStateString(this.adapter, 'para14a.mode', '') : '';
            const raw = await readStateNumber(this.adapter, 'para14a.evcsTotalCapW', null);
            para14aEvcsCapW = (para14aActive && typeof raw === 'number' && Number.isFinite(raw) && raw > 0) ? raw : null;
        }

        const components = [];
        if (typeof peakBudgetW === 'number') components.push({ k: 'peak', w: peakBudgetW });
        if (typeof tariffBudgetW === 'number') components.push({ k: 'tariff', w: tariffBudgetW });
        if (typeof para14aEvcsCapW === 'number') components.push({ k: '14a', w: para14aEvcsCapW });

        let evcsHighLevelCapW = null;
        let binding = '';
        if (components.length) {
            let minW = Number.POSITIVE_INFINITY;
            for (const c of components) {
                const w = Number(c.w);
                if (Number.isFinite(w)) minW = Math.min(minW, w);
            }
            evcsHighLevelCapW = Number.isFinite(minW) ? Math.max(0, minW) : null;

            const eps = 0.001;
            binding = components
                .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - Number(evcsHighLevelCapW)) <= eps)
                .map(c => c.k)
                .join('+');
        }

        const snapshot = {
            ts: now,
            grid: {
                gridConnectionLimitW_cfg,
                gridSafetyMarginW,
                gridConstraintsCapW: (typeof gridConstraintsCapW === 'number') ? gridConstraintsCapW : null,
                gridImportLimitW_physical,
                gridImportLimitW_peakShaving,
                gridImportLimitW_effective,
                gridImportLimitW_source,
                gridMaxPhaseA_cfg,
            },
            peak: {
                active: !!peakActive,
                budgetW: (typeof peakBudgetW === 'number') ? peakBudgetW : null,
            },
            tariff: {
                budgetW: (typeof tariffBudgetW === 'number') ? tariffBudgetW : null,
                gridChargeAllowed: !!gridChargeAllowed,
                dischargeAllowed: !!dischargeAllowed,
                active: !!tariffActive,
                state: tariffState || '',
                currentPriceEurKwh: isFiniteNumber(tariffCurrentPrice) ? Number(tariffCurrentPrice) : null,
                negativeActive: !!tariffNegativeActive,
                gridImportPreferred: !!tariffGridImportPreferred,
                storageGridChargeAllowed: !!(tariffGridImportPreferred && gridChargeAllowed),
                evcsGridChargeAllowed: !!(tariffGridImportPreferred && gridChargeAllowed),
                pvCurtailRecommended: !!tariffGridImportPreferred,
                negativeMinPriceEurKwh: isFiniteNumber(tariffNegativeMinPrice) ? Number(tariffNegativeMinPrice) : null,
                nextNegativeFrom: tariffNextNegativeFrom || '',
                nextNegativeTo: tariffNextNegativeTo || '',
                status: tariffStatus || (tariffGridImportPreferred ? 'active_grid_import_preferred' : (tariffNegativeActive ? 'negative_detected' : 'inactive')),
            },
            para14a: {
                active: !!para14aActive,
                mode: para14aMode,
                evcsCapW: (typeof para14aEvcsCapW === 'number') ? para14aEvcsCapW : null,
            },
            evcsHighLevel: {
                capW: (typeof evcsHighLevelCapW === 'number') ? evcsHighLevelCapW : null,
                binding,
            },
        };

        const budgetSnapshot = this._makeBudgetSnapshot(now, snapshot);
        const coreTsShadow = this._runCoreBudgetTsShadowComparison(budgetSnapshot);
        if (budgetSnapshot && typeof budgetSnapshot === 'object') budgetSnapshot.tsShadow = coreTsShadow;
        const budgetRuntime = makeBudgetRuntime(this.adapter, budgetSnapshot);

        try {
            this.adapter._emsCaps = snapshot;
            this.adapter._emsBudget = budgetRuntime;
            this.adapter._emsForecastGate = budgetSnapshot && budgetSnapshot.gates ? budgetSnapshot.gates.forecast : null;
            this.adapter._emsTariffGate = budgetSnapshot && budgetSnapshot.gates ? budgetSnapshot.gates.tariff : null;
        } catch {
            // ignore
        }

        try {
            await this.adapter.setStateAsync('ems.core.lastUpdate', now, true);
            await this.adapter.setStateAsync('ems.core.gridConnectionLimitW_cfg', Math.round(gridConnectionLimitW_cfg || 0), true);
            await this.adapter.setStateAsync('ems.core.gridSafetyMarginW', Math.round(gridSafetyMarginW || 0), true);
            await this.adapter.setStateAsync('ems.core.gridConstraintsCapW', Math.round((typeof gridConstraintsCapW === 'number') ? gridConstraintsCapW : 0), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_physical', Math.round(gridImportLimitW_physical || 0), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_peakShaving', Math.round(gridImportLimitW_peakShaving || 0), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_source', gridImportLimitW_source || '', true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_effective', Math.round(gridImportLimitW_effective || 0), true);
            await this.adapter.setStateAsync('ems.core.gridMaxPhaseA_cfg', Math.round(gridMaxPhaseA_cfg || 0), true);

            await this.adapter.setStateAsync('ems.core.peakActive', !!peakActive, true);
            await this.adapter.setStateAsync('ems.core.peakBudgetW', Math.round((typeof peakBudgetW === 'number') ? peakBudgetW : 0), true);

            await this.adapter.setStateAsync('ems.core.tariffBudgetW', Math.round((typeof tariffBudgetW === 'number') ? tariffBudgetW : 0), true);
            await this.adapter.setStateAsync('ems.core.gridChargeAllowed', !!gridChargeAllowed, true);
            await this.adapter.setStateAsync('ems.core.dischargeAllowed', !!dischargeAllowed, true);

            await this.adapter.setStateAsync('ems.core.para14aActive', !!para14aActive, true);
            await this.adapter.setStateAsync('ems.core.para14aMode', para14aMode || '', true);
            await this.adapter.setStateAsync('ems.core.para14aEvcsCapW', Math.round((typeof para14aEvcsCapW === 'number') ? para14aEvcsCapW : 0), true);

            await this.adapter.setStateAsync('ems.core.evcsHighLevelCapW', Math.round((typeof evcsHighLevelCapW === 'number') ? evcsHighLevelCapW : 0), true);
            await this.adapter.setStateAsync('ems.core.evcsHighLevelBinding', binding || '', true);
            await this.adapter.setStateAsync('ems.core.snapshot', JSON.stringify(snapshot), true);

            const b = budgetSnapshot;
            await this.adapter.setStateAsync('ems.budget.lastUpdate', now, true);
            await this.adapter.setStateAsync('ems.budget.active', true, true);
            await this.adapter.setStateAsync('ems.budget.mode', b.mode || 'central-background', true);
            await this.adapter.setStateAsync('ems.budget.totalBudgetW', b.gates.total.effectiveW === null ? 0 : roundW(b.gates.total.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.remainingTotalW', b.gates.total.effectiveW === null ? 0 : roundW(b.gates.total.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetRawW', roundW(b.gates.pv.rawW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetW', roundW(b.gates.pv.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.remainingPvW', roundW(b.gates.pv.effectiveW), true);
            await this.adapter.setStateAsync('ems.budget.gridW', roundW(b.raw.gridW), true);
            await this.adapter.setStateAsync('ems.budget.gridExportW', roundW(b.raw.gridExportW), true);
            await this.adapter.setStateAsync('ems.budget.gridImportW', roundW(b.raw.gridImportW), true);
            await this.adapter.setStateAsync('ems.budget.storageChargeW', roundW(b.raw.storageChargeW), true);
            await this.adapter.setStateAsync('ems.budget.storageDischargeW', roundW(b.raw.storageDischargeW), true);
            await this.adapter.setStateAsync('ems.budget.pvPowerW', roundW(b.raw.pvPowerW), true);
            await this.adapter.setStateAsync('ems.budget.flexUsedW', roundW(b.raw.flexUsedW), true);
            await this.adapter.setStateAsync('ems.budget.binding', b.gates.total.binding || '', true);
            const consumersInit = Object.keys(b.consumers || {}).map(k => ({ key: k, ...(b.consumers[k] || {}) }));
            await this.adapter.setStateAsync('ems.budget.consumersJson', JSON.stringify(consumersInit), true);
            await this.adapter.setStateAsync('ems.budget.snapshot', JSON.stringify(b), true);
            await this.adapter.setStateAsync('ems.budget.tsShadowJson', JSON.stringify(b.tsShadow || coreTsShadow || {}), true);

            const fg = (b.gates && b.gates.forecast) ? b.gates.forecast : {};
            await this.adapter.setStateAsync('ems.budget.forecast.valid', !!fg.valid, true);
            await this.adapter.setStateAsync('ems.budget.forecast.usable', !!fg.usable, true);
            await this.adapter.setStateAsync('ems.budget.forecast.ageMs', fg.ageMs === null || fg.ageMs === undefined ? null : roundW(fg.ageMs), true);
            await this.adapter.setStateAsync('ems.budget.forecast.points', roundW(fg.points), true);
            await this.adapter.setStateAsync('ems.budget.forecast.confidencePct', roundW(fg.confidencePct), true);
            await this.adapter.setStateAsync('ems.budget.forecast.nowW', roundW(fg.nowW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.avgNext1hW', roundW(fg.avgNext1hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.avgNext3hW', roundW(fg.avgNext3hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.peakNext6hW', roundW(fg.peakNext6hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.peakNext24hW', roundW(fg.peakNext24hW), true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext1h', Number.isFinite(Number(fg.kwhNext1h)) ? Number(fg.kwhNext1h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext3h', Number.isFinite(Number(fg.kwhNext3h)) ? Number(fg.kwhNext3h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext6h', Number.isFinite(Number(fg.kwhNext6h)) ? Number(fg.kwhNext6h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext12h', Number.isFinite(Number(fg.kwhNext12h)) ? Number(fg.kwhNext12h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.kwhNext24h', Number.isFinite(Number(fg.kwhNext24h)) ? Number(fg.kwhNext24h) : 0, true);
            await this.adapter.setStateAsync('ems.budget.forecast.status', String(fg.status || ''), true);
            await this.adapter.setStateAsync('ems.budget.forecast.source', String(fg.source || ''), true);
            await this.adapter.setStateAsync('ems.budget.forecast.snapshotJson', JSON.stringify(fg), true);

            const tg = (b.gates && b.gates.tariff) ? b.gates.tariff : {};
            await this.adapter.setStateAsync('ems.budget.tariff.active', !!tg.active, true);
            await this.adapter.setStateAsync('ems.budget.tariff.state', String(tg.state || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.currentPriceEurKwh', tg.currentPriceEurKwh === null || tg.currentPriceEurKwh === undefined ? null : Number(tg.currentPriceEurKwh), true);
            await this.adapter.setStateAsync('ems.budget.tariff.negativeActive', !!tg.negativeActive, true);
            await this.adapter.setStateAsync('ems.budget.tariff.gridImportPreferred', !!tg.gridImportPreferred, true);
            await this.adapter.setStateAsync('ems.budget.tariff.storageGridChargeAllowed', !!tg.storageGridChargeAllowed, true);
            await this.adapter.setStateAsync('ems.budget.tariff.evcsGridChargeAllowed', !!tg.evcsGridChargeAllowed, true);
            await this.adapter.setStateAsync('ems.budget.tariff.dischargeAllowed', tg.dischargeAllowed !== false, true);
            await this.adapter.setStateAsync('ems.budget.tariff.pvCurtailRecommended', !!tg.pvCurtailRecommended, true);
            await this.adapter.setStateAsync('ems.budget.tariff.negativeMinPriceEurKwh', tg.negativeMinPriceEurKwh === null || tg.negativeMinPriceEurKwh === undefined ? null : Number(tg.negativeMinPriceEurKwh), true);
            await this.adapter.setStateAsync('ems.budget.tariff.nextNegativeFrom', String(tg.nextNegativeFrom || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.nextNegativeTo', String(tg.nextNegativeTo || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.status', String(tg.status || ''), true);
            await this.adapter.setStateAsync('ems.budget.tariff.snapshotJson', JSON.stringify(tg), true);

            for (const key of ['evcs', 'thermal', 'heatingRod']) {
                const c = b.consumers[key] || {};
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.usedW`, roundW(c.usedW), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.pvUsedW`, roundW(c.pvUsedW), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.priority`, roundW(c.priority), true);
                await this.adapter.setStateAsync(`ems.budget.consumers.${key}.mode`, String(c.mode || ''), true);
            }

            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue('ems.budget.remainingPvW', roundW(b.gates.pv.effectiveW), now);
                this.adapter.updateValue('ems.budget.pvBudgetW', roundW(b.gates.pv.effectiveW), now);
                this.adapter.updateValue('ems.budget.pvBudgetRawW', roundW(b.gates.pv.rawW), now);
                this.adapter.updateValue('ems.budget.gridW', roundW(b.raw.gridW), now);
                this.adapter.updateValue('ems.budget.flexUsedW', roundW(b.raw.flexUsedW), now);
                this.adapter.updateValue('ems.budget.consumersJson', JSON.stringify(consumersInit), now);
                if (b.gates && b.gates.forecast) {
                    this.adapter.updateValue('ems.budget.forecast.nowW', roundW(b.gates.forecast.nowW), now);
                    this.adapter.updateValue('ems.budget.forecast.avgNext1hW', roundW(b.gates.forecast.avgNext1hW), now);
                    this.adapter.updateValue('ems.budget.forecast.kwhNext6h', Number.isFinite(Number(b.gates.forecast.kwhNext6h)) ? Number(b.gates.forecast.kwhNext6h) : 0, now);
                    this.adapter.updateValue('ems.budget.forecast.usable', !!b.gates.forecast.usable, now);
                }
                if (b.gates && b.gates.tariff) {
                    this.adapter.updateValue('ems.budget.tariff.negativeActive', !!b.gates.tariff.negativeActive, now);
                    this.adapter.updateValue('ems.budget.tariff.gridImportPreferred', !!b.gates.tariff.gridImportPreferred, now);
                    this.adapter.updateValue('ems.budget.tariff.currentPriceEurKwh', b.gates.tariff.currentPriceEurKwh, now);
                    this.adapter.updateValue('ems.budget.tariff.status', String(b.gates.tariff.status || ''), now);
                }
            }
        } catch {
            // ignore
        }
    }
}

module.exports = { CoreLimitsModule };
