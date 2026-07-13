/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/core-limits.ts
 * Quell-Hash: sha256:499990e7d0bccf8ce3a2f7ae9a40273291e7edfb4a3b27adda3fa960a1b12428
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/core-limits.js.
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
        // 0.7.106: Letzter TS-Shadow für Consumer-Reservierungen.
        // Zweck: makeBudgetRuntime.reserve später aus TypeScript übernehmen, ohne die produktive Reservierung sofort zu riskieren.
        tsReservationLast: null,

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
            const actualW = Math.max(0, Number.isFinite(Number(r.actualW)) ? Number(r.actualW) : reserveW);

            /**
             * Code-Teil: jsReferenceBeforeTsCommit
             *
             * Zweck:
             * Berechnet die alte JavaScript-Reservierung lokal als Referenz, bevor die
             * produktive Runtime auf den TypeScript-Helfer umschaltet.
             *
             * Zusammenhang:
             * 0.7.107 stellt Consumer-Reservierungen produktiv auf TypeScript um. Damit
             * Heizstab, EVCS, Peak-Shaving und Speicherreserve nicht durch eine verdeckte
             * Abweichung beeinflusst werden, wird die alte JS-Rechnung weiterhin parallel
             * als Notfallback berechnet.
             *
             * Wichtig:
             * 0 W ist gültig. Keine Defaultleistung darf hier künstlich entstehen.
             */
            const jsRemainingTotalBefore = Number.isFinite(this.remainingTotalW) ? this.remainingTotalW : Number.POSITIVE_INFINITY;
            const jsRemainingPvBefore = Math.max(0, this.remainingPvW);
            const jsTotalCap = Number.isFinite(jsRemainingTotalBefore) ? jsRemainingTotalBefore : Number.POSITIVE_INFINITY;
            const jsPvCap = Math.max(0, jsRemainingPvBefore);
            const jsCap = r.pvOnly ? Math.min(jsTotalCap, jsPvCap) : jsTotalCap;
            const jsGrantW = Math.max(0, Math.min(requestedW, jsCap));
            const jsNextRemainingTotalW = Number.isFinite(jsRemainingTotalBefore) ? Math.max(0, jsRemainingTotalBefore - reserveW) : Number.POSITIVE_INFINITY;
            const jsNextRemainingPvW = Math.max(0, jsRemainingPvBefore - pvReserveW);
            const jsEntry = {
                key,
                app,
                label: String(r.label || key),
                priority,
                requestedW: roundW(requestedW),
                grantW: roundW(jsGrantW),
                // Public display/API aliases: diagnostics and UIs expect usedW/pvUsedW.
                // Runtime reservations also keep reserveW/pvReserveW for internal clarity.
                usedW: roundW(reserveW),
                pvUsedW: roundW(pvReserveW),
                reserveW: roundW(reserveW),
                pvReserveW: roundW(pvReserveW),
                actualW: roundW(actualW),
                pvOnly: !!r.pvOnly,
                mode: String(r.mode || ''),
                ts: Date.now(),
                remainingTotalW: Number.isFinite(jsNextRemainingTotalW) ? roundW(jsNextRemainingTotalW) : null,
                remainingPvW: roundW(jsNextRemainingPvW),
            };

            /**
             * Code-Teil: tsReservationProductiveCandidate
             *
             * Zweck:
             * Berechnet dieselbe Reservierung über den TypeScript-Helfer. Wenn Ergebnis
             * und JS-Referenz übereinstimmen, wird TS produktiv übernommen. Bei Fehlern
             * oder Abweichungen bleibt JS als Sicherheitsfallback aktiv.
             */
            let tsReservationResult = null;
            let tsReservationError = '';
            try {
                const mirror = requireCoreBudgetTsMirror();
                const compute = mirror && typeof mirror.computeCoreBudgetReservation === 'function' ? mirror.computeCoreBudgetReservation : null;
                if (compute) {
                    tsReservationResult = compute({
                        remainingTotalW: this.remainingTotalW,
                        remainingPvW: this.remainingPvW,
                        consumers: this.consumers,
                        order: this.order,
                    }, r, Date.now());
                }
            } catch (e) {
                tsReservationError = e && e.message ? e.message : String(e);
            }

            const tsEntry = tsReservationResult && tsReservationResult.entry ? tsReservationResult.entry : null;
            const mismatches = tsEntry ? [
                compareShadowWatt('entry.requestedW', jsEntry.requestedW, tsEntry.requestedW),
                compareShadowWatt('entry.grantW', jsEntry.grantW, tsEntry.grantW),
                compareShadowWatt('entry.usedW', jsEntry.usedW, tsEntry.usedW),
                compareShadowWatt('entry.pvUsedW', jsEntry.pvUsedW, tsEntry.pvUsedW),
                compareShadowWatt('entry.actualW', jsEntry.actualW, tsEntry.actualW),
                compareShadowWatt('entry.remainingTotalW', jsEntry.remainingTotalW, tsEntry.remainingTotalW),
                compareShadowWatt('entry.remainingPvW', jsEntry.remainingPvW, tsEntry.remainingPvW),
            ].filter(Boolean) : [];
            const tsOk = !!(tsReservationResult && tsReservationResult.ok && tsEntry && !tsReservationError && mismatches.length === 0);
            const fallbackReason = tsOk
                ? ''
                : (tsReservationError || (!tsEntry ? 'missing-ts-entry' : (mismatches.length ? 'ts-js-mismatch' : 'ts-result-not-ok')));

            /**
             * Code-Teil: productiveTsReservationCommit
             *
             * Zweck:
             * Übernimmt ab 0.7.107 die TS-Reservierung produktiv, wenn der Vergleich sauber
             * war. Dadurch werden `remainingTotalW`, `remainingPvW`, `consumers`, `order`
             * und `flexUsedW` schrittweise aus der TypeScript-Quelle geführt.
             *
             * Notfallback:
             * Bei Abweichung oder Fehler wird exakt die lokal berechnete JS-Referenz
             * geschrieben. So bleibt der Adapter auch bei Fehlern im TS-Spiegel betriebsfähig.
             */
            let entry = jsEntry;
            let flexUsedW = 0;
            if (tsOk) {
                entry = {
                    ...tsEntry,
                    label: String(tsEntry.label || r.label || key),
                    mode: String(tsEntry.mode || r.mode || ''),
                    ts: Number(tsEntry.ts) || Date.now(),
                };
                this.remainingTotalW = tsReservationResult.nextRemainingTotalW === null
                    ? Number.POSITIVE_INFINITY
                    : Math.max(0, Number(tsReservationResult.nextRemainingTotalW) || 0);
                this.remainingPvW = Math.max(0, Number(tsReservationResult.nextRemainingPvW) || 0);
                this.consumers = (tsReservationResult.consumers && typeof tsReservationResult.consumers === 'object')
                    ? tsReservationResult.consumers
                    : { ...this.consumers, [key]: entry };
                this.order = Array.isArray(tsReservationResult.order) ? Array.from(tsReservationResult.order) : this.order.slice();
                if (!this.order.includes(key)) this.order.push(key);
                this.consumers[key] = entry;
                flexUsedW = Math.max(0, Number(tsReservationResult.flexUsedW) || 0);
            } else {
                this.remainingTotalW = jsNextRemainingTotalW;
                this.remainingPvW = jsNextRemainingPvW;
                this.consumers[key] = entry;
                if (!this.order.includes(key)) this.order.push(key);
                const liveConsumersForFlex = this.order.map(k => this.consumers[k] || null).filter(Boolean);
                flexUsedW = liveConsumersForFlex.reduce((sum, c) => sum + Math.max(0, Number(c.usedW ?? c.reserveW) || 0), 0);
            }

            this.tsReservationLast = {
                ts: Date.now(),
                source: 'ts-core-reservation-productive',
                available: !!tsEntry,
                ok: tsOk,
                productive: tsOk,
                fallback: !tsOk,
                fallbackReason,
                key,
                js: {
                    requestedW: jsEntry.requestedW,
                    grantW: jsEntry.grantW,
                    usedW: jsEntry.usedW,
                    pvUsedW: jsEntry.pvUsedW,
                    actualW: jsEntry.actualW,
                    remainingTotalW: jsEntry.remainingTotalW,
                    remainingPvW: jsEntry.remainingPvW,
                },
                tsValues: tsEntry ? {
                    requestedW: tsEntry.requestedW,
                    grantW: tsEntry.grantW,
                    usedW: tsEntry.usedW,
                    pvUsedW: tsEntry.pvUsedW,
                    actualW: tsEntry.actualW,
                    remainingTotalW: tsEntry.remainingTotalW,
                    remainingPvW: tsEntry.remainingPvW,
                } : null,
                mismatches,
                error: tsReservationError,
            };

            try {
                const pfx = `ems.budget.consumers.${key}`;
                const liveConsumers = this.order.map(k => this.consumers[k] || null).filter(Boolean);
                const reserveRoundedW = roundW(entry.reserveW ?? entry.usedW);
                const pvReserveRoundedW = roundW(entry.pvReserveW ?? entry.pvUsedW);
                const actualRoundedW = roundW(entry.actualW);
                if (adapter && typeof adapter.setStateAsync === 'function') {
                    adapter.setStateAsync(`${pfx}.usedW`, reserveRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.pvUsedW`, pvReserveRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.actualW`, actualRoundedW, true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.priority`, roundW(entry.priority ?? priority), true).catch(() => {});
                    adapter.setStateAsync(`${pfx}.mode`, String(entry.mode || ''), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.flexUsedW', roundW(flexUsedW), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.remainingTotalW', Number.isFinite(this.remainingTotalW) ? roundW(this.remainingTotalW) : 0, true).catch(() => {});
                    adapter.setStateAsync('ems.budget.remainingPvW', roundW(this.remainingPvW), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.consumersJson', JSON.stringify(liveConsumers), true).catch(() => {});
                    adapter.setStateAsync('ems.budget.tsReservationJson', JSON.stringify(this.tsReservationLast || {}), true).catch(() => {});
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
                    adapter.updateValue('ems.budget.tsReservationJson', JSON.stringify(this.tsReservationLast || {}), now);
                }
            } catch (_e) {
                // Diagnose-/State-Schreibfehler dürfen Budgetreservierungen nicht abbrechen.
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
        await mk('ems.budget.source', 'Budget source (js-runtime / ts-core-budget)', 'string', 'text');
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
        await mk('ems.budget.pvBudgetFlowRawW', 'PV budget flow reconstruction raw (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetPhysicalCapW', 'PV budget physical PV cap (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.pvBudgetClampedW', 'PV budget clamped by physical PV (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.flexUsedW', 'Already active flexible load (W)', 'number', 'value.power', 'W');
        await mk('ems.budget.binding', 'Budget binding source', 'string', 'text');
        await mk('ems.budget.consumersJson', 'Budget consumers (JSON)', 'string', 'text');
        await mk('ems.budget.snapshot', 'Budget snapshot (JSON)', 'string', 'text');
        await mk('ems.budget.tsShadowJson', 'TypeScript Core-Budget Shadow-Vergleich (JSON)', 'string', 'json');
        await mk('ems.budget.tsProductiveJson', 'TypeScript Core-Budget Produktivstatus (JSON)', 'string', 'json');
        await mk('ems.budget.tsReservationJson', 'TypeScript Consumer-Reservierung Shadow-Vergleich (JSON)', 'string', 'json');
        await mk('ems.budget.tsRestGatesJson', 'TypeScript Forecast-/Tarif-/Peak-Gates produktiv/Fallback (JSON)', 'string', 'json');

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

        // 0.8.63: PV-Budget darf nie durch alte/fremde flexible Lasten oder
        // Batterieentladung künstlich entstehen. Vorher konnte bei PV = 0 W und
        // aktiver EVCS-Reservierung ein positiver PV-Budgetwert entstehen, weil
        // `flexUsedW - storageDischargeW` als rekonstruierter PV-Überschuss
        // gewertet wurde. Das ist für Bestandsanlagen gefährlich: PV-Budget muss
        // physikalisch durch frische PV-Erzeugung gedeckelt sein.
        //
        // Rohdiagnose bleibt erhalten, aber das wirksame PV-Budget wird auf die
        // aktuelle PV-Erzeugung begrenzt. Damit gilt:
        // PV = 0 W  => PV Budget raw/effective = 0 W
        // EVCS/Speicher-Reservierungen bleiben Gesamtbudget-/Prioritätsdaten,
        // erzeugen aber kein PV-Budget mehr.
        const pvBudgetFlowRawW = Math.max(0, gridExportW + flexUsedW + storageChargeW - storageDischargeW);
        const pvPhysicalCapW = Math.max(0, pvPowerW);
        const pvBudgetRawW = Math.min(pvBudgetFlowRawW, pvPhysicalCapW);
        const pvBudgetClampedW = Math.max(0, pvBudgetFlowRawW - pvBudgetRawW);
        const pvReserveW = clamp(num(cmCfg.pvChargeReserveW, 500), 0, 1e12, 500) || 0;
        const pvBudgetEffectiveW = Math.max(0, pvBudgetRawW - pvReserveW);
        const pvAvailable = pvBudgetEffectiveW > 0;

        // Total controlled-load budget for grid-cap/§14a/peak/tariff layer.
        const gridLimitW = coreSnapshot && coreSnapshot.grid ? Number(coreSnapshot.grid.gridImportLimitW_effective || 0) : 0;
        // 0.8.61: Zentrales Gate A konservativ klemmen. Die alte Anzeigeformel
        // `gridLimit - Netz + flexible Lasten` ist als Rohdiagnose nützlich,
        // darf aber das wirksame Netzbudget nicht über das Anschlusslimit heben.
        const gridHeadroomRawW = gridLimitW > 0 ? Math.max(0, gridLimitW - gridImportW + flexUsedW) : Number.POSITIVE_INFINITY;
        const gridHeadroomW = gridLimitW > 0 ? Math.min(gridLimitW, gridHeadroomRawW) : Number.POSITIVE_INFINITY;
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
                pvBudgetFlowRawW: roundW(pvBudgetFlowRawW),
                pvBudgetPhysicalCapW: roundW(pvPhysicalCapW),
                pvBudgetClampedW: roundW(pvBudgetClampedW),
            },
            gates: {
                grid: {
                    importLimitW: roundW(gridLimitW),
                    importW: roundW(gridImportW),
                    exportW: roundW(gridExportW),
                    headroomW: Number.isFinite(gridHeadroomW) ? roundW(gridHeadroomW) : null,
                    headroomRawW: Number.isFinite(gridHeadroomRawW) ? roundW(gridHeadroomRawW) : null,
                },
                pv: {
                    available: !!pvAvailable,
                    rawW: roundW(pvBudgetRawW),
                    flowRawW: roundW(pvBudgetFlowRawW),
                    physicalCapW: roundW(pvPhysicalCapW),
                    clampedW: roundW(pvBudgetClampedW),
                    reserveW: roundW(pvReserveW),
                    effectiveW: roundW(pvBudgetEffectiveW),
                    source: 'min(physicalPV,nvp+controlledLoads+storageCharge-storageDischarge)',
                    clampReason: pvBudgetClampedW > 0 ? 'physical_pv_cap' : '',
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
                // 0.8.60: grid.effectiveW ist im TS-Spiegel ein enger Netzbudget-Begriff,
                // während die produktive JS-Runtime hier historisch `grid.headroomW` mit
                // zusätzlichen High-Level-/Flex-Load-Kontexten vergleicht. Ein einzelner
                // Unterschied an diesem Feld ist deshalb Diagnose, aber kein Grund für
                // minütlichen Warn-Log-Spam. Produktiv bleibt JS trotzdem Fallback, solange
                // der Gesamt-Shadow nicht vollständig passt.
                compareShadowWatt('grid.effectiveW', grid.headroomW, ts && ts.grid ? ts.grid.effectiveW : null),
                compareShadowWatt('total.effectiveW', total.effectiveW, ts && ts.total ? ts.total.effectiveW : null),
            ].filter(Boolean).map((m) => {
                if (m && m.field === 'grid.effectiveW') {
                    return { ...m, diagnosticOnly: true, severity: 'diagnostic', reason: 'grid-headroom-vs-ts-effective-budget' };
                }
                return { ...m, diagnosticOnly: false, severity: 'warn' };
            });
            const warningMismatches = mismatches.filter((m) => !(m && m.diagnosticOnly === true));
            const diagnosticOnlyMismatches = mismatches.filter((m) => m && m.diagnosticOnly === true);
            const result = {
                available: true,
                ok: mismatches.length === 0,
                source: 'ts-mirror-shadow',
                mismatches,
                warningMismatches,
                diagnosticOnlyMismatches,
                logSuppressed: warningMismatches.length === 0 && diagnosticOnlyMismatches.length > 0,
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
                // 0.7.105: Der vollständige TS-Snapshot bleibt für die produktive Gate-
                // Übernahme verfügbar. Er wird nur genutzt, wenn der Shadow-Vergleich OK ist.
                tsSnapshot: ts || null,
            };
            if (warningMismatches.length > 0) {
                const now = Date.now();
                if (!this._coreTsShadowLastWarnMs || now - this._coreTsShadowLastWarnMs > 60000) {
                    this._coreTsShadowLastWarnMs = now;
                    try {
                        this.adapter.log && this.adapter.log.warn && this.adapter.log.warn(`[core-limits-ts-shadow] JS/TS budget mismatch: ${warningMismatches.map(m => m.field).join(', ')}`);
                    } catch (_eLog) {}
                }
            }
            return result;
        } catch (e) {
            return { available: true, ok: false, source: 'ts-mirror-shadow', error: e && e.message ? e.message : String(e), mismatches: [] };
        }
    }


    /**
     * Code-Teil: _runCoreRestGatesTsShadowComparison
     *
     * Zweck:
     * Vergleicht Forecast-, Tarif-, Peak-/Netz- und §14a-Gates aus der bestehenden
     * JavaScript-Runtime mit dem neuen TypeScript-Helfer.
     *
     * Zusammenhang:
     * Diese Gates beeinflussen EVCS-Budgets, Heizstabfreigaben, Peak-Shaving, §14a und
     * KI-Hinweise. Deshalb werden sie in 0.7.120 nur vorbereitet und als Shadow geprüft;
     * produktiv bleibt die bestehende JS-Runtime.
     *
     * Sicherheitsregel:
     * Der Vergleich schreibt keine Produktivwerte. Abweichungen werden nur in
     * `ems.budget.tsRestGatesJson` sichtbar gemacht.
     */
    _runCoreRestGatesTsShadowComparison(budgetSnapshot, coreSnapshot) {
        const mirror = requireCoreBudgetTsMirror();
        const build = mirror && typeof mirror.buildCoreRestGatesShadow === 'function' ? mirror.buildCoreRestGatesShadow : null;
        const now = Date.now();
        if (!build || !budgetSnapshot || typeof budgetSnapshot !== 'object') {
            return { source: 'ts-core-rest-gates-shadow', available: false, ok: false, reason: !build ? 'missing-ts-helper' : 'missing-js-budget-snapshot', mismatches: [], ts: now };
        }
        const compareValue = (mismatches, field, jsValue, tsValue, tolerance = 0) => {
            const numLike = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
            if (numLike(jsValue) || numLike(tsValue)) {
                const jsNum = numLike(jsValue) ? Number(jsValue) : null;
                const tsNum = numLike(tsValue) ? Number(tsValue) : null;
                if (jsNum === null || tsNum === null || Math.abs(jsNum - tsNum) > tolerance) mismatches.push({ field, js: jsNum, ts: tsNum, diff: (jsNum !== null && tsNum !== null) ? Math.round((tsNum - jsNum) * 1000) / 1000 : null, tolerance });
                return;
            }
            const jsText = String(jsValue === undefined || jsValue === null ? '' : jsValue);
            const tsText = String(tsValue === undefined || tsValue === null ? '' : tsValue);
            if (jsText !== tsText) mismatches.push({ field, js: jsText, ts: tsText, tolerance });
        };
        try {
            const js = {
                forecast: budgetSnapshot.gates && budgetSnapshot.gates.forecast ? budgetSnapshot.gates.forecast : {},
                tariff: budgetSnapshot.gates && budgetSnapshot.gates.tariff ? budgetSnapshot.gates.tariff : {},
                peak: coreSnapshot && coreSnapshot.peak ? coreSnapshot.peak : {},
                para14a: coreSnapshot && coreSnapshot.para14a ? coreSnapshot.para14a : {},
                evcsHighLevel: coreSnapshot && coreSnapshot.evcsHighLevel ? coreSnapshot.evcsHighLevel : {},
                grid: coreSnapshot && coreSnapshot.grid ? coreSnapshot.grid : {},
            };
            const tsResult = build({ ...js, ts: now });
            const ts = tsResult && tsResult.gates ? tsResult.gates : {};
            const mismatches = [];
            [
                ['forecast.valid', js.forecast.valid, ts.forecast && ts.forecast.valid, 0],
                ['forecast.usable', js.forecast.usable, ts.forecast && ts.forecast.usable, 0],
                ['forecast.nowW', js.forecast.nowW, ts.forecast && ts.forecast.nowW, 1],
                ['forecast.avgNext1hW', js.forecast.avgNext1hW, ts.forecast && ts.forecast.avgNext1hW, 1],
                ['forecast.status', js.forecast.status, ts.forecast && ts.forecast.status, 0],
                ['tariff.active', js.tariff.active, ts.tariff && ts.tariff.active, 0],
                ['tariff.negativeActive', js.tariff.negativeActive, ts.tariff && ts.tariff.negativeActive, 0],
                ['tariff.gridImportPreferred', js.tariff.gridImportPreferred, ts.tariff && ts.tariff.gridImportPreferred, 0],
                ['tariff.currentPriceEurKwh', js.tariff.currentPriceEurKwh, ts.tariff && ts.tariff.currentPriceEurKwh, 0.0001],
                ['tariff.status', js.tariff.status, ts.tariff && ts.tariff.status, 0],
                ['peak.active', js.peak.active, ts.peak && ts.peak.active, 0],
                ['peak.budgetW', js.peak.budgetW, ts.peak && ts.peak.budgetW, 1],
                ['para14a.active', js.para14a.active, ts.para14a && ts.para14a.active, 0],
                ['para14a.evcsCapW', js.para14a.evcsCapW, ts.para14a && ts.para14a.evcsCapW, 1],
                ['evcsHighLevel.capW', js.evcsHighLevel.capW, ts.evcsHighLevel && ts.evcsHighLevel.capW, 1],
                ['evcsHighLevel.binding', js.evcsHighLevel.binding, ts.evcsHighLevel && ts.evcsHighLevel.binding, 0],
                ['grid.gridImportLimitW_effective', js.grid.gridImportLimitW_effective, ts.grid && ts.grid.gridImportLimitW_effective, 1],
                ['grid.gridImportLimitW_source', js.grid.gridImportLimitW_source, ts.grid && ts.grid.gridImportLimitW_source, 0],
            ].forEach(([field, jsValue, tsValue, tolerance]) => compareValue(mismatches, field, jsValue, tsValue, tolerance));
            return { source: 'ts-core-rest-gates-shadow', available: true, ok: mismatches.length === 0, productive: false, reason: mismatches.length ? 'ts-rest-gates-mismatch' : 'shadow-ok', comparedFields: 18, mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 12), js, tsGates: ts, tsResult, ts: now };
        } catch (e) {
            return { source: 'ts-core-rest-gates-shadow', available: true, ok: false, productive: false, reason: 'ts-runtime-error', error: e && e.message ? e.message : String(e), mismatches: [], ts: now };
        }
    }

    /**
     * Code-Teil: _applyCoreRestGatesTsProductiveSnapshot
     *
     * Zweck:
     * Übernimmt Forecast-, Tarif-, Peak-/Netz- und §14a-Restgates produktiv aus dem
     * TypeScript-Spiegel, wenn der Shadow-Vergleich ohne Abweichungen war.
     *
     * Zusammenhang:
     * Diese Restgates beeinflussen EVCS-High-Level-Caps, Heizstabfreigaben,
     * Speicherreserve, Peak-Shaving und KI-Hinweise. Deshalb bleibt bei jedem Fehler
     * oder Mismatch die bisherige JavaScript-Runtime als Fallback aktiv.
     *
     * Sicherheitsregel:
     * Produktive TS-Übernahme nur bei `restShadow.ok === true`. Ansonsten werden die
     * bisherigen JS-Snapshots unverändert zurückgegeben und `tsRestGatesProductive`
     * dokumentiert den Fallback-Grund.
     */
    _applyCoreRestGatesTsProductiveSnapshot(jsBudgetSnapshot, coreSnapshot, restShadow) {
        const now = Date.now();
        const fallbackBudget = jsBudgetSnapshot && typeof jsBudgetSnapshot === 'object' ? jsBudgetSnapshot : {};
        const fallbackCore = coreSnapshot && typeof coreSnapshot === 'object' ? coreSnapshot : {};
        const fallback = (reason, extra = {}) => {
            const status = {
                ts: now,
                active: false,
                productive: false,
                source: 'js-runtime',
                fallback: true,
                reason,
                ...extra,
            };
            try { fallbackBudget.tsRestGatesProductive = status; } catch (_e) {}
            return { budgetSnapshot: fallbackBudget, coreSnapshot: fallbackCore, status };
        };

        if (!fallbackBudget || !fallbackBudget.gates || typeof fallbackBudget.gates !== 'object') return fallback('missing-js-budget-snapshot');
        if (!restShadow || typeof restShadow !== 'object') return fallback('missing-ts-rest-shadow');
        if (restShadow.available !== true) return fallback('ts-rest-helper-unavailable', { shadow: restShadow });
        if (restShadow.ok !== true) return fallback('ts-rest-gates-mismatch', { mismatches: restShadow.mismatches || [] });

        const tsGates = restShadow.tsGates || (restShadow.tsResult && restShadow.tsResult.gates) || null;
        if (!tsGates || typeof tsGates !== 'object') return fallback('missing-ts-rest-gates', { shadow: restShadow });
        const required = ['forecast', 'tariff', 'peak', 'para14a', 'evcsHighLevel', 'grid'];
        for (const key of required) {
            if (!tsGates[key] || typeof tsGates[key] !== 'object') return fallback('missing-ts-rest-gate-' + key, { shadow: restShadow });
        }

        const nextCore = {
            ...fallbackCore,
            grid: { ...((fallbackCore && fallbackCore.grid) || {}), ...(tsGates.grid || {}), source: 'ts-core-rest-gates' },
            peak: { ...((fallbackCore && fallbackCore.peak) || {}), ...(tsGates.peak || {}), source: 'ts-core-rest-gates' },
            tariff: { ...((fallbackCore && fallbackCore.tariff) || {}), ...(tsGates.tariff || {}), source: 'ts-core-rest-gates' },
            para14a: { ...((fallbackCore && fallbackCore.para14a) || {}), ...(tsGates.para14a || {}), source: 'ts-core-rest-gates' },
            evcsHighLevel: { ...((fallbackCore && fallbackCore.evcsHighLevel) || {}), ...(tsGates.evcsHighLevel || {}), source: 'ts-core-rest-gates' },
        };
        const nextBudget = {
            ...fallbackBudget,
            gates: {
                ...(fallbackBudget.gates || {}),
                forecast: { ...(((fallbackBudget.gates || {}).forecast) || {}), ...(tsGates.forecast || {}), source: 'ts-core-rest-gates' },
                tariff: { ...(((fallbackBudget.gates || {}).tariff) || {}), ...(tsGates.tariff || {}), source: 'ts-core-rest-gates' },
            },
            tsRestGatesShadow: restShadow,
        };
        const status = {
            ts: now,
            active: true,
            productive: true,
            source: 'ts-core-rest-gates',
            fallback: false,
            reason: 'shadow-ok',
            fields: [
                'forecast',
                'tariff',
                'peak',
                'grid',
                'para14a',
                'evcsHighLevel',
            ],
            tsGates,
            shadow: restShadow,
        };
        nextBudget.tsRestGatesProductive = status;
        return { budgetSnapshot: nextBudget, coreSnapshot: nextCore, status };
    }

    /**
     * Code-Teil: _applyCoreBudgetTsProductiveSnapshot
     *
     * Zweck:
     * Übernimmt die von TypeScript berechneten Core-Budget-Gates produktiv, aber nur
     * wenn der vorherige JS/TS-Shadow-Vergleich ohne Abweichungen war.
     *
     * Zusammenhang:
     * Core-Limits sind kritisch für Heizstab, EVCS, Peak-Shaving, KI und Speicherreserve.
     * Darum wird in 0.7.105 nicht die ganze `core-limits.js`-Datei ersetzt, sondern zuerst
     * der bereits geprüfte Gate-Teil: PV-Budget, Grid-Headroom und Gesamtbudget.
     *
     * Sicherheitsregel:
     * - Wenn der TS-Spiegel fehlt, Abweichungen meldet oder unvollständige Daten liefert,
     *   bleibt die bestehende JS-Budgetlogik produktiv.
     * - JS bleibt Fallback/Notbremse.
     * - Forecast-, Tarif-, Consumer- und Raw-Felder bleiben aus der bestehenden JS-Runtime.
     */
    _applyCoreBudgetTsProductiveSnapshot(jsSnapshot, coreTsShadow) {
        const fallback = jsSnapshot && typeof jsSnapshot === 'object' ? jsSnapshot : {};
        const fallbackStatus = (reason, extra = {}) => {
            const status = {
                ts: Date.now(),
                active: false,
                source: 'js-runtime',
                fallback: true,
                reason,
                ...extra,
            };
            try { fallback.tsProductive = status; } catch (_e) {}
            return fallback;
        };

        if (!fallback || !fallback.gates || typeof fallback.gates !== 'object') return fallbackStatus('missing-js-snapshot');
        if (!coreTsShadow || typeof coreTsShadow !== 'object') return fallbackStatus('missing-ts-shadow');
        if (coreTsShadow.available !== true) return fallbackStatus('ts-mirror-unavailable', { shadow: coreTsShadow });
        if (coreTsShadow.ok !== true) return fallbackStatus('shadow-mismatch', { mismatches: coreTsShadow.mismatches || [] });

        const ts = coreTsShadow.tsSnapshot || {};
        const tsPv = ts && ts.pv ? ts.pv : null;
        const tsGrid = ts && ts.grid ? ts.grid : null;
        const tsTotal = ts && ts.total ? ts.total : null;
        if (!tsPv || !tsGrid || !tsTotal) return fallbackStatus('missing-ts-gates', { shadow: coreTsShadow });

        const next = {
            ...fallback,
            mode: 'central-background-ts-core',
            gates: {
                ...(fallback.gates || {}),
                pv: {
                    ...((fallback.gates && fallback.gates.pv) || {}),
                    rawW: roundW(tsPv.rawW),
                    effectiveW: roundW(tsPv.effectiveW),
                    reason: tsPv.reason || ((fallback.gates && fallback.gates.pv && fallback.gates.pv.reason) || ''),
                    source: 'ts-core-budget',
                },
                grid: {
                    ...((fallback.gates && fallback.gates.grid) || {}),
                    headroomW: roundW(tsGrid.effectiveW),
                    reason: tsGrid.reason || ((fallback.gates && fallback.gates.grid && fallback.gates.grid.reason) || ''),
                    source: 'ts-core-budget',
                },
                total: {
                    ...((fallback.gates && fallback.gates.total) || {}),
                    effectiveW: roundW(tsTotal.effectiveW),
                    reason: tsTotal.reason || ((fallback.gates && fallback.gates.total && fallback.gates.total.reason) || ''),
                    source: 'ts-core-budget',
                },
            },
            tsShadow: coreTsShadow,
        };
        const status = {
            ts: Date.now(),
            active: true,
            source: 'ts-core-budget',
            fallback: false,
            reason: 'shadow-ok',
            fields: ['gates.pv.rawW', 'gates.pv.effectiveW', 'gates.grid.headroomW', 'gates.total.effectiveW'],
            js: coreTsShadow.js || null,
            tsValues: coreTsShadow.ts || null,
        };
        next.tsProductive = status;
        return next;
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

        let snapshot = {
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

        let budgetSnapshot = this._makeBudgetSnapshot(now, snapshot);
        const coreRestGatesTsShadow = this._runCoreRestGatesTsShadowComparison(budgetSnapshot, snapshot);
        if (budgetSnapshot && typeof budgetSnapshot === 'object') budgetSnapshot.tsRestGatesShadow = coreRestGatesTsShadow;
        try { this._coreRestGatesTsShadowLast = coreRestGatesTsShadow; } catch (_eRestShadow) {}

        // 0.7.121: Forecast-/Tarif-/Peak-/§14a-Restgates dürfen produktiv aus TS
        // übernommen werden, wenn der Shadow-Vergleich sauber ist. Danach wird der
        // Budget-Snapshot neu aufgebaut, damit Grid-/EVCS-High-Level-Caps auch in
        // remainingTotalW und Verbraucherreservierungen wirken.
        let coreRestGatesProductive = this._applyCoreRestGatesTsProductiveSnapshot(budgetSnapshot, snapshot, coreRestGatesTsShadow);
        if (coreRestGatesProductive && coreRestGatesProductive.status && coreRestGatesProductive.status.active) {
            snapshot = coreRestGatesProductive.coreSnapshot || snapshot;
            budgetSnapshot = this._makeBudgetSnapshot(now, snapshot);
            coreRestGatesProductive = this._applyCoreRestGatesTsProductiveSnapshot(budgetSnapshot, snapshot, coreRestGatesTsShadow);
            budgetSnapshot = (coreRestGatesProductive && coreRestGatesProductive.budgetSnapshot) || budgetSnapshot;
            snapshot = (coreRestGatesProductive && coreRestGatesProductive.coreSnapshot) || snapshot;
        } else if (coreRestGatesProductive && coreRestGatesProductive.budgetSnapshot) {
            budgetSnapshot = coreRestGatesProductive.budgetSnapshot;
        }
        if (budgetSnapshot && typeof budgetSnapshot === 'object') {
            budgetSnapshot.tsRestGatesShadow = coreRestGatesTsShadow;
            budgetSnapshot.tsRestGatesProductive = (coreRestGatesProductive && coreRestGatesProductive.status) || budgetSnapshot.tsRestGatesProductive || null;
        }
        try { this._coreRestGatesTsProductiveLast = (coreRestGatesProductive && coreRestGatesProductive.status) || null; } catch (_eRestProd) {}

        let coreTsShadow = this._runCoreBudgetTsShadowComparison(budgetSnapshot);
        if (budgetSnapshot && typeof budgetSnapshot === 'object') budgetSnapshot.tsShadow = coreTsShadow;
        // 0.7.105: Der geprüfte TS-Core-Budget-Spiegel darf die zentralen Budget-Gates
        // produktiv setzen. Bei jeder Abweichung bleibt die alte JS-Runtime Fallback.
        budgetSnapshot = this._applyCoreBudgetTsProductiveSnapshot(budgetSnapshot, coreTsShadow);
        const budgetRuntime = makeBudgetRuntime(this.adapter, budgetSnapshot);
        try { if (budgetRuntime) budgetRuntime.tsRestGatesLast = coreRestGatesTsShadow; } catch (_eRestAssign) {}
        try { if (budgetRuntime) budgetRuntime.tsRestGatesProductiveLast = (budgetSnapshot && budgetSnapshot.tsRestGatesProductive) || null; } catch (_eRestProdAssign) {}

        const effectiveCoreGrid = (snapshot && snapshot.grid && typeof snapshot.grid === 'object') ? snapshot.grid : {};
        const effectiveCorePeak = (snapshot && snapshot.peak && typeof snapshot.peak === 'object') ? snapshot.peak : {};
        const effectiveCoreTariff = (snapshot && snapshot.tariff && typeof snapshot.tariff === 'object') ? snapshot.tariff : {};
        const effectiveCorePara14a = (snapshot && snapshot.para14a && typeof snapshot.para14a === 'object') ? snapshot.para14a : {};
        const effectiveCoreEvcsHighLevel = (snapshot && snapshot.evcsHighLevel && typeof snapshot.evcsHighLevel === 'object') ? snapshot.evcsHighLevel : {};

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
            await this.adapter.setStateAsync('ems.core.gridConnectionLimitW_cfg', Math.round(Number(effectiveCoreGrid.gridConnectionLimitW_cfg || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridSafetyMarginW', Math.round(Number(effectiveCoreGrid.gridSafetyMarginW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridConstraintsCapW', Math.round(Number(effectiveCoreGrid.gridConstraintsCapW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_physical', Math.round(Number(effectiveCoreGrid.gridImportLimitW_physical || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_peakShaving', Math.round(Number(effectiveCoreGrid.gridImportLimitW_peakShaving || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_source', String(effectiveCoreGrid.gridImportLimitW_source || ''), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_effective', Math.round(Number(effectiveCoreGrid.gridImportLimitW_effective || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridMaxPhaseA_cfg', Math.round(Number(effectiveCoreGrid.gridMaxPhaseA_cfg || 0)), true);

            await this.adapter.setStateAsync('ems.core.peakActive', !!effectiveCorePeak.active, true);
            await this.adapter.setStateAsync('ems.core.peakBudgetW', Math.round(Number(effectiveCorePeak.budgetW || 0)), true);

            await this.adapter.setStateAsync('ems.core.tariffBudgetW', Math.round(Number(effectiveCoreTariff.budgetW || 0)), true);
            await this.adapter.setStateAsync('ems.core.gridChargeAllowed', effectiveCoreTariff.gridChargeAllowed !== false, true);
            await this.adapter.setStateAsync('ems.core.dischargeAllowed', effectiveCoreTariff.dischargeAllowed !== false, true);

            await this.adapter.setStateAsync('ems.core.para14aActive', !!effectiveCorePara14a.active, true);
            await this.adapter.setStateAsync('ems.core.para14aMode', String(effectiveCorePara14a.mode || ''), true);
            await this.adapter.setStateAsync('ems.core.para14aEvcsCapW', Math.round(Number(effectiveCorePara14a.evcsCapW || 0)), true);

            await this.adapter.setStateAsync('ems.core.evcsHighLevelCapW', Math.round(Number(effectiveCoreEvcsHighLevel.capW || 0)), true);
            await this.adapter.setStateAsync('ems.core.evcsHighLevelBinding', String(effectiveCoreEvcsHighLevel.binding || ''), true);
            await this.adapter.setStateAsync('ems.core.snapshot', JSON.stringify(snapshot), true);

            const b = budgetSnapshot;
            await this.adapter.setStateAsync('ems.budget.lastUpdate', now, true);
            await this.adapter.setStateAsync('ems.budget.active', true, true);
            await this.adapter.setStateAsync('ems.budget.mode', b.mode || 'central-background', true);
            await this.adapter.setStateAsync('ems.budget.source', (b.tsRestGatesProductive && b.tsRestGatesProductive.active) ? 'ts-core-budget+rest-gates' : ((b.tsProductive && b.tsProductive.active) ? 'ts-core-budget' : 'js-runtime'), true);
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
            await this.adapter.setStateAsync('ems.budget.pvBudgetFlowRawW', roundW(b.raw.pvBudgetFlowRawW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetPhysicalCapW', roundW(b.raw.pvBudgetPhysicalCapW), true);
            await this.adapter.setStateAsync('ems.budget.pvBudgetClampedW', roundW(b.raw.pvBudgetClampedW), true);
            await this.adapter.setStateAsync('ems.budget.flexUsedW', roundW(b.raw.flexUsedW), true);
            await this.adapter.setStateAsync('ems.budget.binding', b.gates.total.binding || '', true);
            const consumersInit = Object.keys(b.consumers || {}).map(k => ({ key: k, ...(b.consumers[k] || {}) }));
            await this.adapter.setStateAsync('ems.budget.consumersJson', JSON.stringify(consumersInit), true);
            await this.adapter.setStateAsync('ems.budget.snapshot', JSON.stringify(b), true);
            await this.adapter.setStateAsync('ems.budget.tsShadowJson', JSON.stringify(b.tsShadow || coreTsShadow || {}), true);
            await this.adapter.setStateAsync('ems.budget.tsProductiveJson', JSON.stringify(b.tsProductive || {}), true);
            await this.adapter.setStateAsync('ems.budget.tsReservationJson', JSON.stringify((budgetRuntime && budgetRuntime.tsReservationLast) || {}), true);
            await this.adapter.setStateAsync('ems.budget.tsRestGatesJson', JSON.stringify(b.tsRestGatesProductive || b.tsRestGatesShadow || coreRestGatesTsShadow || {}), true);

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
                this.adapter.updateValue('ems.budget.pvBudgetFlowRawW', roundW(b.raw.pvBudgetFlowRawW), now);
                this.adapter.updateValue('ems.budget.pvBudgetPhysicalCapW', roundW(b.raw.pvBudgetPhysicalCapW), now);
                this.adapter.updateValue('ems.budget.pvBudgetClampedW', roundW(b.raw.pvBudgetClampedW), now);
                this.adapter.updateValue('ems.budget.gridW', roundW(b.raw.gridW), now);
                this.adapter.updateValue('ems.budget.flexUsedW', roundW(b.raw.flexUsedW), now);
                this.adapter.updateValue('ems.budget.consumersJson', JSON.stringify(consumersInit), now);
                this.adapter.updateValue('ems.budget.tsReservationJson', JSON.stringify((budgetRuntime && budgetRuntime.tsReservationLast) || {}), now);
                this.adapter.updateValue('ems.budget.tsRestGatesJson', JSON.stringify(b.tsRestGatesProductive || b.tsRestGatesShadow || coreRestGatesTsShadow || {}), now);
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
