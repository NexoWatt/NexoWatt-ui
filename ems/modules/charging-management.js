/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/charging-management.ts
 * Quell-Hash: sha256:4e01f1da16bf52e91b4e72fe721d2cee1818c88702c27259aa5cafa8e597e13e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/charging-management.js.
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
 * Datei: ems/modules/charging-management.js
 * Rolle im Projekt: Lademanagement.
 * Zweck: Regelt EVCS-/Wallbox-Ziele, Ladeleistung, PV-/Tarif-/Peak-Logik und Ladeprofile.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Lademanagement für EVCS/Wallboxen: Modi, PV-Laden, Mindestladen, Boost, Zielplanung und Leistungsgrenzen.
 * Zusammenhänge:
 * - Hängt an EVCS-DPs und zentralen EMS-Budgets.
 * - Kundenansicht ist www/evcs.js, Konfiguration im App-Center.
 * Wartungshinweise:
 * - Bei Anlagen ohne EVCS müssen Module/UI keine Wallbox anzeigen.
 */

'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');
const { ReasonCodes } = require('../reasons');

/**
 * Code-Teil: chargingManagementTsRuntimeMirror
 *
 * Zweck:
 * Lädt den neuen TypeScript-Spiegel für EVCS-/Charging-Management-Vorbereitung.
 * Ab 0.7.123 übernimmt TypeScript produktiv die sicherheitsrelevanten Budget-Caps,
 * während Ladepunktverteilung und Setpoint-Schreiben weiterhin JavaScript bleiben.
 *
 * Zusammenhang:
 * Diese Brücke ist die Vorbereitung, um das sehr große charging-management.js später
 * in kleinere TypeScript-Helfer zu zerlegen.
 */
let chargingManagementTsRuntimeMirror = null;
try {
    chargingManagementTsRuntimeMirror = require('../../lib/ts-mirrors/ems/charging-management/charging-management-runtime');
} catch (_eChargingTsMirror) {
    chargingManagementTsRuntimeMirror = null;
}

/**
 * Code-Teil: requireChargingControlTsMirror
 *
 * Zweck:
 * Lädt den TypeScript-Spiegel für den EVCS-/Charging-Management-Control-Shadow.
 *
 * Zusammenhang:
 * In 0.7.124 bleibt die produktive Ladelogik JavaScript. TypeScript bereitet den
 * Control-Shadow als rückfallfähigen Produktiv-Kandidaten vor und schreibt Diagnose
 * nach `tsControlShadowJson` sowie `tsControlProductivePrepJson`.
 */
function requireChargingControlTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-control');
    } catch (_e) {
        return null;
    }
}


/**
 * Code-Teil: requireChargingAllocationTsMirror
 * Zweck: Lädt den TS-Shadow für Wallbox-Allocation. Der Spiegel berechnet in diesem
 * Kombi-Schritt noch keine ioBroker-Schreiboperationen, sondern baut den geprüften
 * Produktiv-Kandidaten für die spätere Verteilung.
 */
function requireChargingAllocationTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-allocation');
    } catch (_e) {
        return null;
    }
}


/**
 * Code-Teil: requireChargingPhaseSelectionTsMirror
 * Zweck: Lädt die TS-Entscheidungsschicht für AC-1p/3p-Auto-Phasenwahl im PV-Überschussladen.
 */
function requireChargingPhaseSelectionTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-phase-selection');
    } catch (_e) {
        return null;
    }
}

/**
 * Code-Teil: requireChargingWritePlanTsMirror
 * Zweck: Lädt den TS-Shadow für den späteren Setpoint-Write-Plan. JavaScript bleibt
 * Executor; TypeScript validiert in diesem Schritt nur die Schreibabsicht.
 */
function requireChargingWritePlanTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-write-plan');
    } catch (_e) {
        return null;
    }
}

/**
 * Code-Teil: requireChargingNormalSourceTsMirror
 * Zweck: Lädt den TS-Lockdown für den EVCS-Normalpfad. Dieser Vertrag bündelt
 * Control, Budget-Caps, Allocation, Write-Plan und Executor als Freigabe-Gate
 * für den späteren JS-Abbau.
 */
function requireChargingNormalSourceTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/charging-management/charging-normal-source');
    } catch (_e) {
        return null;
    }
}

let chargingBudgetTsMirror = null;
try {
    chargingBudgetTsMirror = require('../../lib/ts-mirrors/ems/charging-management/charging-budget');
} catch (_eChargingBudgetTsMirror) {
    chargingBudgetTsMirror = null;
}
/**
 * Code-Teil: toSafeIdPart
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function toSafeIdPart(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
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
function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

/**
 * Code-Teil: computePvManagedDemandIntentW
 * Zweck: Ermittelt den PV-Anteil eines aktiven Ladebedarfs unabhaengig von
 * kurzzeitigem Zaehler-/Hystereseversatz. PV-only reserviert den kompletten
 * Bedarf; Min+PV reserviert nur den Anteil oberhalb der konfigurierten
 * Mindestleistung. Normal-/Boost-Laden erzeugt keinen PV-Intent.
 */
function computePvManagedDemandIntentW(modeRaw, demandReserveW, minPowerW = 0) {
    const mode = String(modeRaw || '').trim().toLowerCase();
    const demandW = Math.max(0, Number(demandReserveW) || 0);
    const minW = Math.max(0, Number(minPowerW) || 0);
    if (mode === 'pv') return demandW;
    if (mode === 'minpv') return Math.max(0, demandW - Math.min(demandW, minW));
    return 0;
}

/**
 * Code-Teil: computeEvcsPvBudgetReservationW
 * Zweck: Vereint tatsaechlich verwendeten PV-Anteil und aktiven PV-Ladeintent
 * zu einer stabilen zentralen EVCS-Reservierung. Die Reservierung wird immer
 * durch Gesamtbedarf und den kundenseitigen EVCS-Allocation-Cap begrenzt.
 * Ein flackerndes pvAvailable-Hysteresesignal darf sie nicht auf 0 setzen.
 */
function computeEvcsPvBudgetReservationW({ reserveW = 0, actualPvW = 0, intentPvW = 0, allocationCapW = 0 } = {}) {
    const totalDemandW = Math.max(0, Number(reserveW) || 0);
    const pvDemandW = Math.max(0, Number(actualPvW) || 0, Number(intentPvW) || 0);
    const capW = Number.isFinite(Number(allocationCapW))
        ? Math.max(0, Number(allocationCapW))
        : totalDemandW;
    return Math.max(0, Math.min(totalDemandW, capW, pvDemandW));
}
/**
 * Code-Teil: toBool
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function toBool(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') {
        if (!Number.isFinite(v)) return null;
        return v !== 0;
    }
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if (s === 'true' || s === 'on' || s === 'yes' || s === 'ja' || s === '1' || s === 'plugged' || s === 'connected') return true;
    if (s === 'false' || s === 'off' || s === 'no' || s === 'nein' || s === '0' || s === 'unplugged' || s === 'disconnected') return false;
    return null;
}

// --- Tarif forecast helpers ------------------------------------------------

/**
 * Normalizes either €/kWh or ct/kWh into €/kWh.
 * Heuristic: values with |v| > 2 are interpreted as ct/kWh (common sources: 31.5, 40, ...).
 * Allows small negative prices.
 *
 * @param {any} v
 * @param {number|null} [fallback=null]
 * @returns {number|null}
 */
/**
 * Code-Teil: normalizePriceEurPerKwh
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizePriceEurPerKwh(v, fallback = null) {
    let n = (typeof v === 'number') ? v : num(v, fallback);
    if (!Number.isFinite(n)) return fallback;

    // Auto-convert ct/kWh -> €/kWh
    const abs = Math.abs(n);
    if (abs > 2 && abs <= 500) {
        n = n / 100;
    }

    // Plausibility (allow small negative prices)
    if (!Number.isFinite(n) || n < -2 || n > 2) return fallback;
    return n;
}

/**
 * Parse an hourly price curve from either JSON string or already-parsed array/object.
 * Expected (tibber-like) schema: [{ total: 0.318, startsAt: "...", endsAt: "..." }, ...]
 * Also supports a plain numeric array (e.g. [32.1, 30.8, ...]) interpreted as ct/kWh per hour
 * starting at the current full hour.
 *
 * @param {any} raw
 * @returns {Array<{startMs:number,endMs:number,priceEurKwh:number}>}
 */
/**
 * Code-Teil: parsePriceCurve
 * Zweck: Parst Rohdaten in ein sicheres internes Format.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function parsePriceCurve(raw) {
    if (raw === null || raw === undefined) return [];

    let data = raw;
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s) return [];
        try {
            data = JSON.parse(s);
        } catch {
            return [];
        }
    }

    // Some providers wrap the array
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const arr = data.prices || data.data || data.items || data.values || null;
        if (Array.isArray(arr)) {
            data = arr;
        } else {
            return [];
        }
    }

    if (!Array.isArray(data)) return [];

    // Numeric array without timestamps → assume hourly from current full hour
    try {
        /**
         * Code-Teil: Arrow-Funktion `isNumLike`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: isNumLike
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const isNumLike = (v) => {
            if (typeof v === 'number') return Number.isFinite(v);
            if (typeof v === 'string') {
                const s = v.trim();
                if (!s) return false;
                const n = Number(s);
                return Number.isFinite(n);
            }
            return false;
        };
        const hasObject = data.some((it) => it && typeof it === 'object' && !Array.isArray(it));
        const hasNum = data.some((it) => isNumLike(it));

        if (hasNum && !hasObject) {
            const out = [];
            const base = new Date();
            base.setMinutes(0, 0, 0);
            const baseMs = base.getTime();

            let idx = 0;
            for (const it of data) {
                if (!isNumLike(it)) {
                    idx++;
                    continue;
                }
                const rawN = (typeof it === 'number') ? it : Number(String(it).trim());
                const priceEurKwh = normalizePriceEurPerKwh(rawN, null);
                if (!Number.isFinite(priceEurKwh)) {
                    idx++;
                    continue;
                }
                const startMs = baseMs + idx * 3600 * 1000;
                const endMs = startMs + 3600 * 1000;
                out.push({ startMs, endMs, priceEurKwh });
                idx++;
            }
            return out;
        }
    } catch (_e) {}

    const out = [];
    for (const it of data) {
        if (!it || typeof it !== 'object') continue;

        // Price field heuristics
        let pRaw = null;
        if (it.total !== undefined) pRaw = it.total;
        else if (it.price !== undefined) pRaw = it.price;
        else if (it.value !== undefined) pRaw = it.value;
        else if (it.marketprice !== undefined) pRaw = it.marketprice;
        else if (it.marketPrice !== undefined) pRaw = it.marketPrice;
        else if (it.energyPrice !== undefined) pRaw = it.energyPrice;

        if (pRaw === null && it.price && typeof it.price === 'object') {
            if (it.price.total !== undefined) pRaw = it.price.total;
            else if (it.price.value !== undefined) pRaw = it.price.value;
        }

        const price = normalizePriceEurPerKwh(pRaw, null);
        if (typeof price !== 'number' || !Number.isFinite(price)) continue;

        // Time field heuristics
        const startRaw = (it.startsAt !== undefined) ? it.startsAt
            : (it.start !== undefined) ? it.start
                : (it.startTime !== undefined) ? it.startTime
                    : (it.from !== undefined) ? it.from
                        : (it.begin !== undefined) ? it.begin
                            : (it.timestamp !== undefined) ? it.timestamp
                                : (it.time !== undefined) ? it.time
                                    : null;

        let startMs = null;
        if (typeof startRaw === 'number' && Number.isFinite(startRaw)) {
            startMs = (startRaw < 1e12) ? startRaw * 1000 : startRaw;
        } else if (typeof startRaw === 'string') {
            const t = Date.parse(startRaw);
            if (Number.isFinite(t)) startMs = t;
        }
        if (!startMs) continue;

        const endRaw = (it.endsAt !== undefined) ? it.endsAt
            : (it.end !== undefined) ? it.end
                : (it.endTime !== undefined) ? it.endTime
                    : (it.to !== undefined) ? it.to
                        : (it.until !== undefined) ? it.until
                            : null;

        let endMs = null;
        if (typeof endRaw === 'number' && Number.isFinite(endRaw)) {
            endMs = (endRaw < 1e12) ? endRaw * 1000 : endRaw;
        } else if (typeof endRaw === 'string') {
            const t = Date.parse(endRaw);
            if (Number.isFinite(t)) endMs = t;
        }

        // Default: 1 hour
        if (!endMs) endMs = startMs + 60 * 60 * 1000;
        if (endMs <= startMs) endMs = startMs + 60 * 60 * 1000;

        out.push({ startMs, endMs, priceEurKwh: price });
    }

    out.sort((a, b) => a.startMs - b.startMs);
    return out;
}

// --- Time helpers (Goal-Charging) -------------------------------------------

/**
 * Snap a unix timestamp to a 15‑minute grid (00/15/30/45) in local time.
 * Keeps the date, but may roll over to next hour/day when rounding minutes.
 *
 * @param {number} ts
 * @returns {number}
 */
/**
 * Code-Teil: quantizeTsTo15Min
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function quantizeTsTo15Min(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return 0;
    try {
        const dt = new Date(n);
        dt.setSeconds(0, 0);
        const m = dt.getMinutes();
        const snapped = Math.round(m / 15) * 15;
        dt.setMinutes(snapped, 0, 0);
        return dt.getTime();
    } catch {
        return Math.round(n);
    }
}

/**
 * Given an existing goal deadline timestamp, compute the next upcoming occurrence
 * of the same local HH:MM (today or next days), at least 1 minute in the future.
 * This keeps the goal schedule repeating daily ("finish by 06:00 every day").
 *
 * @param {number} deadlineTs
 * @param {number} nowMs
 * @returns {number}
 */
/**
 * Code-Teil: nextOccurrenceSameClock
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nextOccurrenceSameClock(deadlineTs, nowMs) {
    const n = Number(deadlineTs);
    const now = Number(nowMs);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (!Number.isFinite(now) || now <= 0) return n;
    try {
        const base = new Date(n);
        const hh = base.getHours();
        const mm = base.getMinutes();

        const cur = new Date(now);
        const d = new Date(cur);
        d.setHours(hh, mm, 0, 0);

        // If the selected time is in the past (or within 1 minute), schedule for the next day.
        if (d.getTime() <= now + 60000) d.setDate(d.getDate() + 1);
        return d.getTime();
    } catch {
        return n;
    }
}
/**
 * Code-Teil: floorToStep
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function floorToStep(value, step) {
    const v = Number(value);
    const s = Number(step);
    if (!Number.isFinite(v)) return value;
    if (!Number.isFinite(s) || s <= 0) return v;
    // Always round DOWN to avoid budget overshoot / limit violations
    return Math.floor(v / s) * s;
}
/**
 * Code-Teil: rampUp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function rampUp(prevValue, targetValue, maxDeltaUp) {
    const t = Number(targetValue);
    const p = Number(prevValue);
    const d = Number(maxDeltaUp);
    if (!Number.isFinite(t)) return targetValue;
    if (!Number.isFinite(d) || d <= 0) return t;
    if (!Number.isFinite(p)) return t;
    if (t <= p) return t; // never limit ramp-down (safety)
    return (t > (p + d)) ? (p + d) : t;
}
/**
 * Code-Teil: choosePositiveMin
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function choosePositiveMin(...values) {
    let best = 0;
    for (const raw of values) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) continue;
        if (!(best > 0) || n < best) best = n;
    }
    return best > 0 ? best : 0;
}
/**
 * Code-Teil: availabilityReason
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function availabilityReason(cfgEnabled, userEnabled, online) {
    if (!cfgEnabled) return ReasonCodes.DISABLED;
    if (!userEnabled) return ReasonCodes.CONTROL_DISABLED;
    if (!online) return ReasonCodes.OFFLINE;
    return ReasonCodes.SKIPPED;
}

/**
 * Code-Teil: normalizeEvcsOnlineFlag
 * Zweck: Normalisiert echte Wallbox-Erreichbarkeit aus bool/number/string Datenpunkten.
 * Zusammenhang: EVCS Online-Gate und VIS-Zustand; explizite onlineId-Werte sind authoritative.
 */
function normalizeEvcsOnlineFlag(value, fallback = null) {
    if (value === true || value === false) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (!s) return fallback;
        if (['true', '1', 'on', 'yes', 'ja', 'online', 'connected', 'available', 'reachable', 'ready'].includes(s)) return true;
        if (['false', '0', 'off', 'no', 'nein', 'offline', 'disconnected', 'unavailable', 'unreachable', 'faulted', 'error'].includes(s)) return false;
    }
    return fallback;
}
/**
 * Code-Teil: normalizeChargerType
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeChargerType(v) {
    const s = String(v || 'AC').trim().toUpperCase();
    return (s === 'DC') ? 'DC' : 'AC';
}
/**
 * Code-Teil: normalizeControlBasis
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeControlBasis(v) {
    const s = String(v || 'auto').trim().toLowerCase();
    if (s === 'currenta' || s === 'a' || s === 'current') return 'currentA';
    if (s === 'powerw' || s === 'w' || s === 'power') return 'powerW';
    return 'auto';
}
/**
 * Code-Teil: normalizeWallboxModeOverride
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeWallboxModeOverride(v) {
    const raw = (v === null || v === undefined) ? '' : String(v);
    const s = raw.trim().toLowerCase();
    if (!s) return 'auto';
    if (s === 'auto' || s === 'default' || s === 'global') return 'auto';

    // PV only
    if (s === 'pv' || s === 'pvsurplus' || s === 'pv_surplus' || s === 'pvonly' || s === 'pv_only') return 'pv';

    // Min + PV (allow grid for min, PV for the rest)
    if (s === 'minpv' || s === 'min_pv' || s === 'min+pv' || s === 'min_plus_pv') return 'minpv';

    // Boost (allow grid, prefer allocation)
    if (s === 'boost' || s === 'turbo') return 'boost';

    return 'auto';
}

/**
 * Code-Teil: Klasse `ChargingManagementModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ChargingManagementModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Wallbox-/EVCS-Lademanagement und Zielladen.
/**
 * Klasse: ChargingManagementModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ChargingManagementModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._known = new Set(); // wallbox channels created
        this._knownStations = new Set(); // station channels created
        this._stationRoundRobinOffset = new Map(); // stationKey -> next offset for round-robin fairness
        this._stationRoundRobinLastRotateMs = new Map(); // stationKey -> ms of last rotation (avoid per-tick flapping)
        this._chargingSinceMs = new Map(); // safeKey -> ms since epoch
        this._chargingLastActiveMs = new Map(); // safeKey -> ms of last detected activity
        this._chargingLastSeenMs = new Map(); // safeKey -> ms of last processing (cleanup)
        this._boostSinceMs = new Map(); // safeKey -> ms since epoch (boost start)

        // EV connection tracking (for Zielladen + safe setpoints)
        this._vehiclePluggedPrev = new Map(); // safeKey -> boolean
        this._vehiclePluggedSinceMs = new Map(); // safeKey -> ms of last plug-in (rising edge)
        // Gate B: PV hysteresis state (global, for PV-only modes)
        this._pvAvailable = false;
        this._pvAboveSinceMs = 0;
        this._pvBelowSinceMs = 0;
        // Gate C: Speicher-Unterstützung (Hysterese)
        this._storageAssistActive = false;
        // Gate T: Tarif-Freigaben (Debounce gegen Flattern)
        this._tariffGridChargeAllowed = true;
        this._tariffGridChargeAllowedTrueSinceMs = 0;
        this._tariffDischargeAllowed = true;
        this._tariffDischargeAllowedTrueSinceMs = 0;
        this._restoredRuntime = new Set(); // safeKey -> restored persisted session/boost state
        this._lastCmdTargetW = new Map(); // safeKey -> last commanded target power (for ramp limiting)
        this._lastCmdTargetA = new Map(); // safeKey -> last commanded target current (for ramp limiting)
        this._lastDiagLogMs = 0; // MU6.2: rate limit diagnostics log
        // TS-Migration 0.7.122: letzte EVCS-/Charging-Management-TS-Vorbereitungsdiagnose.
        this._chargingManagementTsRuntimePrepLast = null;

        // Fast local state publisher (performance):
        // With many EVCS (e.g. 50+), awaiting hundreds of setStateAsync calls per tick can
        // easily push the tick time into seconds. We therefore de-duplicate and batch
        // local state writes and flush them asynchronously with limited concurrency.
        this._pubQueue = new Map(); // id -> {val:any, ack:boolean}
        this._pubCache = new Map(); // id -> {val:any, ts:number}
        this._pubFlushTimer = null;
        this._pubFlushInFlight = false;
        this._pubLastFlushMs = 0;
        this._pubFlushIntervalMs = 50; // do not flush more often than this

        // PV-Überschuss Glättung:
        // - fast5s: aktive Regelung (reagiert deutlich schneller auf Änderungen)
        // - slow5m: Diagnose/Referenz (glättet Langzeitverlauf für Transparenz)
        // Hintergrund: Der 5-Minuten-Mittelwert ist für eine Live-Regelung zu träge
        // und kann unnötigen Netzbezug bzw. späte Reaktionen verursachen.
        this._pvSurplusAvg = {
            fast5s: { windowMs: 5 * 1000, samples: [], head: 0, sumW: 0 },
            slow5m: { windowMs: 5 * 60 * 1000, samples: [], head: 0, sumW: 0 },
        };
        this._pvStartupUntilMs = new Map(); // safeKey -> ms until PV start settle hold is active
        this._pvStartReadySinceMs = new Map(); // safeKey -> ms since PV-only start conditions are continuously satisfied
        this._pvBelowMinSinceMs = new Map(); // safeKey -> ms since a running PV-only session is continuously below the technical minimum
        this._pvMinRunUntilMs = new Map(); // safeKey -> ms until a freshly started PV-only session should be kept stable
        this._pvStartCooldownUntilMs = new Map(); // safeKey -> ms until a failed PV-only start may be retried
        // TS-Migration 0.7.124: letzter EVCS-/Charging-Control-Shadow und Produktiv-Kandidat.
        this._chargingControlTsShadowLast = null;
        this._chargingControlTsProductivePrepLast = null;
        this._chargingControlTsProductiveLast = null;
        this._chargingAllocationTsShadowLast = null;
        this._chargingAllocationTsProductivePrepLast = null;
        this._chargingAllocationTsProductiveLast = null;
        this._chargingAllocationTsNormalSourceLast = null;
        this._chargingWritePlanTsShadowLast = null;
        this._chargingWritePlanTsProductivePrepLast = null;
        this._chargingWritePlanTsProductiveLast = null;
        this._chargingWritePlanExecutorLast = null;
        this._chargingBudgetTsProductiveLast = null;
        this._chargingNormalSourceTsLockdownLast = null;
        this._chargingTsNormalSourceLast = null;
        this._chargingLegacyDecisionTreeLast = null;
        this._chargingEvcsJsRemovalTsLast = null;
        this._adapterTsRuntimeHandoverLast = null;
        // EVCS AC-Phasenautomatik (1p/3p PV-Überschuss): Zustandsmarker für Hysterese, Cooldown und Settle-Zeit.
        this._chargingPhaseHighSinceMs = new Map();
        this._chargingPhaseLowSinceMs = new Map();
        this._chargingPhaseCooldownUntilMs = new Map();
        this._chargingPhaseSettleUntilMs = new Map();
        this._chargingPhaseAssumedBySafe = new Map();
        this._chargingPhaseSelectionTsLast = null;
    }


    /**
     * Code-Teil: _publishChargingControlTsShadow
     *
     * Zweck:
     * Berechnet und veröffentlicht den TypeScript-Shadow-Plan für EVCS/Charging-Management.
     *
     * Zusammenhang:
     * Die produktive EVCS-Ladelogik bleibt in 0.7.124 JavaScript. Diese Methode baut den
     * typisierten Vergleichsstatus plus einen Produktiv-Kandidaten für Control-/Summary-
     * Werte, damit die spätere Übernahme kontrolliert und rückfallfähig bleibt.
     *
     * Wichtig:
     * Fehler im TS-Spiegel dürfen die Ladefunktion nicht abbrechen. Deshalb wird jeder
     * Fehler in JSON-Diagnose geschrieben und der JS-Pfad bleibt führend.
     */
    async _publishChargingControlTsShadow(input) {
        const mirror = requireChargingControlTsMirror();
        let status;
        let productivePrep = null;
        let productiveDecision = null;
        try {
            if (!mirror || typeof mirror.buildChargingControlShadowPlan !== 'function') {
                productivePrep = {
                    source: 'ts-charging-control-productive-prep-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                productiveDecision = {
                    source: 'ts-charging-control-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                status = {
                    source: 'ts-charging-control-shadow-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    productivePrep,
                    productiveDecision,
                    productivePrepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    ts: Date.now(),
                };
            } else {
                const plan = mirror.buildChargingControlShadowPlan(input || {});
                const comparison = (typeof mirror.compareChargingControlShadowPlan === 'function')
                    ? mirror.compareChargingControlShadowPlan(input || {}, plan)
                    : { ok: true, mismatchCount: 0, mismatches: [] };
                productivePrep = (typeof mirror.buildChargingControlProductivePrep === 'function')
                    ? mirror.buildChargingControlProductivePrep(input || {}, plan, comparison)
                    : {
                        source: 'ts-charging-control-productive-prep-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-productive-prep-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                productiveDecision = (typeof mirror.buildChargingControlProductive === 'function')
                    ? mirror.buildChargingControlProductive(input || {}, plan, comparison)
                    : {
                        source: 'ts-charging-control-productive-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-productive-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                status = {
                    ...plan,
                    comparison,
                    productivePrep,
                    productiveDecision,
                    ok: !!(plan && plan.ok && comparison && comparison.ok),
                    mismatchCount: comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0,
                    productive: !!(productiveDecision && productiveDecision.productive),
                    productivePrepared: !!(productivePrep && productivePrep.prepared),
                    fallback: !(productiveDecision && productiveDecision.productive),
                    fallbackReason: productiveDecision && productiveDecision.fallbackReason ? productiveDecision.fallbackReason : '',
                    nextAction: productiveDecision && productiveDecision.nextAction
                        ? productiveDecision.nextAction
                        : 'EVCS/Charging-Management TS-Control ist aktivierbar; Ladepunktverteilung und Setpoint-Schreiben bleiben getrennt abgesichert.',
                    ts: Date.now(),
                };
            }
        } catch (e) {
            productivePrep = {
                source: 'ts-charging-control-productive-prep-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            productiveDecision = {
                source: 'ts-charging-control-productive-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            status = {
                source: 'ts-charging-control-shadow-v1',
                available: false,
                ok: false,
                productive: false,
                productivePrep,
                productiveDecision,
                productivePrepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                ts: Date.now(),
            };
        }
        this._chargingControlTsShadowLast = status;
        this._chargingControlTsProductivePrepLast = productivePrep;
        this._chargingControlTsProductiveLast = productiveDecision;
        try {
            await this._queueState('chargingManagement.control.tsControlShadowJson', JSON.stringify(status), true);
            await this._queueState('chargingManagement.control.tsControlProductivePrepJson', JSON.stringify(productivePrep || {}), true);
            await this._queueState('chargingManagement.control.tsControlProductiveJson', JSON.stringify(productiveDecision || {}), true);
            await this._queueState('chargingManagement.control.tsControlSource', productiveDecision && productiveDecision.productive ? 'ts-control' : (productivePrep && productivePrep.prepared ? 'ts-control-prepared' : 'js-runtime'), true);

            // TS-Migration 0.7.125: Control-/Summary-Werte werden bei sauberem
            // Shadow-Vergleich produktiv aus dem TS-Vertrag übernommen. Das ist
            // bewusst nur die Control-Ebene; Ladepunktverteilung, Boost/PV/Min+PV,
            // Failsafe-Stopps und Setpoint-Schreiben bleiben weiterhin JavaScript.
            const apply = productiveDecision && productiveDecision.productive ? productiveDecision.apply : null;
            if (apply && typeof apply === 'object') {
                await this._queueState('chargingManagement.control.active', !!apply.active, true);
                await this._queueState('chargingManagement.control.mode', String(apply.mode || ''), true);
                await this._queueState('chargingManagement.control.status', String(apply.status || ''), true);
                await this._queueState('chargingManagement.control.budgetMode', String(apply.budgetMode || ''), true);
                await this._queueState('chargingManagement.control.budgetW', Number.isFinite(Number(apply.budgetW)) ? Number(apply.budgetW) : 0, true);
                await this._queueState('chargingManagement.control.usedW', Number.isFinite(Number(apply.usedW)) ? Number(apply.usedW) : 0, true);
                await this._queueState('chargingManagement.control.remainingW', Number.isFinite(Number(apply.remainingW)) ? Number(apply.remainingW) : 0, true);
                await this._queueState('chargingManagement.wallboxCount', Number.isFinite(Number(apply.wallboxCount)) ? Number(apply.wallboxCount) : 0, true);
                await this._queueState('chargingManagement.summary.onlineWallboxes', Number.isFinite(Number(apply.onlineWallboxes)) ? Number(apply.onlineWallboxes) : 0, true);
                // 0.8.64: TS-Control darf EVCS Ist nicht aus Reserve/Setpoint überschreiben.
                // Summary-Ist wird im JS-Hauptpfad aus frischer Messleistung `totalFreshActualPowerW`
                // gesetzt. Nur wenn der TS-Plan später ausdrücklich `actualW`/`measuredPowerW`
                // liefert, darf er hier die Summary-Istleistung schreiben.
                const applyActualW = Number.isFinite(Number(apply.actualW)) ? Number(apply.actualW) : (Number.isFinite(Number(apply.measuredPowerW)) ? Number(apply.measuredPowerW) : null);
                if (applyActualW !== null) await this._queueState('chargingManagement.summary.totalPowerW', Math.max(0, applyActualW), true);
                await this._queueState('chargingManagement.summary.totalTargetPowerW', Number.isFinite(Number(apply.totalTargetPowerW)) ? Number(apply.totalTargetPowerW) : 0, true);
                await this._queueState('chargingManagement.summary.totalTargetCurrentA', Number.isFinite(Number(apply.totalTargetCurrentA)) ? Number(apply.totalTargetCurrentA) : 0, true);
                await this._queueState('chargingManagement.control.pausedByPeakShaving', !!apply.pausedByPeakShaving, true);
                await this._queueState('chargingManagement.control.pvAvailable', !!apply.pvAvailable, true);
                await this._queueState('chargingManagement.control.gridCapBinding', !!apply.gridCapBinding, true);
                await this._queueState('chargingManagement.control.phaseCapBinding', !!apply.phaseCapBinding, true);
                await this._queueState('chargingManagement.control.para14aBinding', !!apply.para14aBinding, true);
                await this._queueState('chargingManagement.control.storageAssistActive', !!apply.storageAssistActive, true);
                await this._queueState('chargingManagement.control.storageAssistW', Number.isFinite(Number(apply.storageAssistW)) ? Number(apply.storageAssistW) : 0, true);
            }
        } catch (_eWrite) {}
        return status;
    }

    /**
     * Code-Teil: _publishChargingAllocationTsShadow
     *
     * Zweck:
     * Veröffentlicht den TypeScript-Shadow für Wallbox-Allocation plus Setpoint-Write-Plan.
     * Das ist der beschleunigte Kombi-Schritt: Zielverteilung wird typisiert gespiegelt
     * und produktiv vorbereitet, während JavaScript weiterhin die realen Setpoints schreibt.
     */
    async _publishChargingAllocationTsShadow(input) {
        const allocationMirror = requireChargingAllocationTsMirror();
        const writePlanMirror = requireChargingWritePlanTsMirror();
        const phaseMirror = requireChargingPhaseSelectionTsMirror();
        let phasePlan = null;
        let allocationInput = input || {};
        let shadow = null;
        let productivePrep = null;
        let productiveDecision = null;
        let normalSourceDecision = null;
        let writePlan = null;
        let writePlanProductivePrep = null;
        let writePlanProductive = null;
        try {
            if (phaseMirror && typeof phaseMirror.buildChargingPhaseSelectionPlan === 'function') {
                phasePlan = phaseMirror.buildChargingPhaseSelectionPlan((input && input.phaseSelection) ? input.phaseSelection : (input || {}));
            } else {
                phasePlan = {
                    source: 'ts-charging-phase-selection-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-phase-selection-mirror',
                    wallboxes: [],
                    blockers: ['missing-ts-phase-selection-mirror'],
                    warnings: [],
                    ts: Date.now(),
                };
            }
        } catch (e) {
            phasePlan = {
                source: 'ts-charging-phase-selection-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-phase-selection-runtime-error',
                error: e && e.message ? e.message : String(e),
                wallboxes: [],
                blockers: ['ts-phase-selection-runtime-error'],
                warnings: [],
                ts: Date.now(),
            };
        }
        allocationInput = { ...(input || {}), phasePlan };
        try {
            if (!allocationMirror || typeof allocationMirror.buildChargingAllocationShadowPlan !== 'function') {
                shadow = {
                    source: 'ts-charging-allocation-shadow-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    ts: Date.now(),
                };
                productivePrep = {
                    source: 'ts-charging-allocation-productive-prep-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                productiveDecision = {
                    source: 'ts-charging-allocation-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    apply: null,
                    ts: Date.now(),
                };
                normalSourceDecision = {
                    source: 'ts-charging-allocation-normal-source-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    normalSource: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-allocation-mirror',
                    apply: null,
                    ts: Date.now(),
                };
            } else {
                const plan = allocationMirror.buildChargingAllocationShadowPlan(allocationInput || {});
                const comparison = (typeof allocationMirror.compareChargingAllocationShadowPlan === 'function')
                    ? allocationMirror.compareChargingAllocationShadowPlan(allocationInput || {}, plan)
                    : { ok: true, mismatchCount: 0, mismatches: [] };
                productivePrep = (typeof allocationMirror.buildChargingAllocationProductivePrep === 'function')
                    ? allocationMirror.buildChargingAllocationProductivePrep(allocationInput || {}, plan, comparison)
                    : {
                        source: 'ts-charging-allocation-productive-prep-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-allocation-prep-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                productiveDecision = (typeof allocationMirror.buildChargingAllocationProductive === 'function')
                    ? allocationMirror.buildChargingAllocationProductive(allocationInput || {}, plan, comparison)
                    : {
                        source: 'ts-charging-allocation-productive-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-allocation-productive-helper',
                        comparison,
                        plan,
                        apply: null,
                    };
                normalSourceDecision = (typeof allocationMirror.buildChargingAllocationNormalSource === 'function')
                    ? allocationMirror.buildChargingAllocationNormalSource(allocationInput || {}, plan, comparison)
                    : {
                        source: 'ts-charging-allocation-normal-source-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        normalSource: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-allocation-normal-source-helper',
                        diagnosticComparison: comparison,
                        diagnosticMismatchCount: comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0,
                        plan,
                        apply: null,
                    };
                shadow = {
                    ...plan,
                    phasePlan,
                    comparison,
                    productivePrep,
                    productiveDecision,
                    normalSourceDecision,
                    ok: !!(plan && plan.ok && (normalSourceDecision && normalSourceDecision.normalSource ? true : (comparison && comparison.ok))),
                    mismatchCount: comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0,
                    productive: !!((normalSourceDecision && normalSourceDecision.normalSource) || (productiveDecision && productiveDecision.productive)),
                    normalSource: !!(normalSourceDecision && normalSourceDecision.normalSource),
                    productivePrepared: !!(productivePrep && productivePrep.prepared),
                    fallback: !((normalSourceDecision && normalSourceDecision.normalSource) || (productiveDecision && productiveDecision.productive)),
                    fallbackReason: normalSourceDecision && normalSourceDecision.fallbackReason ? normalSourceDecision.fallbackReason : (productiveDecision && productiveDecision.fallbackReason ? productiveDecision.fallbackReason : ''),
                    ts: Date.now(),
                };
            }
        } catch (e) {
            shadow = {
                source: 'ts-charging-allocation-shadow-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                ts: Date.now(),
            };
            productivePrep = {
                source: 'ts-charging-allocation-productive-prep-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            productiveDecision = {
                source: 'ts-charging-allocation-productive-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
            normalSourceDecision = {
                source: 'ts-charging-allocation-normal-source-v1',
                available: false,
                ok: false,
                productive: false,
                normalSource: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                apply: null,
                ts: Date.now(),
            };
        }

        try {
            if (!writePlanMirror || typeof writePlanMirror.buildChargingSetpointWritePlan !== 'function') {
                writePlan = {
                    source: 'ts-charging-setpoint-write-plan-shadow-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-write-plan-mirror',
                    entries: [],
                    ts: Date.now(),
                };
                writePlanProductivePrep = {
                    source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-write-plan-mirror',
                    entries: [],
                    apply: null,
                    ts: Date.now(),
                };
                writePlanProductive = {
                    source: 'ts-charging-setpoint-write-plan-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    prepared: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-write-plan-mirror',
                    entries: [],
                    apply: null,
                    ts: Date.now(),
                };
            } else {
                const allocationDecisionForWritePlan = normalSourceDecision && normalSourceDecision.normalSource ? normalSourceDecision : productiveDecision;
                const productiveAllocationPlan = allocationDecisionForWritePlan && allocationDecisionForWritePlan.apply
                    ? { wallboxes: allocationDecisionForWritePlan.apply.wallboxes || [] }
                    : (productivePrep && productivePrep.plan ? productivePrep.plan : shadow);
                writePlan = writePlanMirror.buildChargingSetpointWritePlan({
                    ...(allocationInput || {}),
                    allocationPlan: productiveAllocationPlan,
                    allowWrites: false,
                });
                writePlanProductivePrep = (typeof writePlanMirror.buildChargingSetpointWritePlanProductivePrep === 'function')
                    ? writePlanMirror.buildChargingSetpointWritePlanProductivePrep({
                        ...(allocationInput || {}),
                        allocationPlan: productiveAllocationPlan,
                        allowWrites: false,
                    }, writePlan)
                    : {
                        source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-write-plan-productive-prep-helper',
                        entries: writePlan && Array.isArray(writePlan.entries) ? writePlan.entries : [],
                        apply: null,
                        ts: Date.now(),
                    };
                writePlanProductive = (typeof writePlanMirror.buildChargingSetpointWritePlanProductive === 'function')
                    ? writePlanMirror.buildChargingSetpointWritePlanProductive({
                        ...(allocationInput || {}),
                        allocationPlan: productiveAllocationPlan,
                        allowWrites: !!(allocationDecisionForWritePlan && (allocationDecisionForWritePlan.normalSource || allocationDecisionForWritePlan.productive)),
                    }, writePlan)
                    : {
                        source: 'ts-charging-setpoint-write-plan-productive-v1',
                        available: false,
                        ok: false,
                        productive: false,
                        prepared: false,
                        fallback: true,
                        fallbackReason: 'missing-ts-write-plan-productive-helper',
                        entries: writePlan && Array.isArray(writePlan.entries) ? writePlan.entries : [],
                        apply: null,
                        ts: Date.now(),
                    };
            }
        } catch (e) {
            writePlan = {
                source: 'ts-charging-setpoint-write-plan-shadow-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                entries: [],
                ts: Date.now(),
            };
            writePlanProductivePrep = {
                source: 'ts-charging-setpoint-write-plan-productive-prep-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                entries: [],
                apply: null,
                ts: Date.now(),
            };
            writePlanProductive = {
                source: 'ts-charging-setpoint-write-plan-productive-v1',
                available: false,
                ok: false,
                productive: false,
                prepared: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                entries: [],
                apply: null,
                ts: Date.now(),
            };
        }

        this._chargingPhaseSelectionTsLast = phasePlan;
        this._chargingAllocationTsShadowLast = shadow;
        this._chargingAllocationTsProductivePrepLast = productivePrep;
        this._chargingAllocationTsProductiveLast = productiveDecision;
        this._chargingAllocationTsNormalSourceLast = normalSourceDecision;
        this._chargingWritePlanTsShadowLast = writePlan;
        this._chargingWritePlanTsProductivePrepLast = writePlanProductivePrep;
        this._chargingWritePlanTsProductiveLast = writePlanProductive;
        try {
            await this._queueState('chargingManagement.control.phaseSelectionJson', JSON.stringify(phasePlan || {}), true);
            await this._queueState('chargingManagement.control.phaseSelectionSource', phasePlan && phasePlan.available !== false ? 'ts-phase-selection' : 'unavailable', true);
            await this._queueState('chargingManagement.control.tsAllocationShadowJson', JSON.stringify(shadow || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationProductivePrepJson', JSON.stringify(productivePrep || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationProductiveJson', JSON.stringify(productiveDecision || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationNormalSourceJson', JSON.stringify(normalSourceDecision || {}), true);
            await this._queueState('chargingManagement.control.tsAllocationSource', normalSourceDecision && normalSourceDecision.normalSource ? 'ts-normal-source' : (productiveDecision && productiveDecision.productive ? 'ts-allocation' : (productivePrep && productivePrep.prepared ? 'ts-allocation-prepared' : 'js-runtime')), true);
            await this._queueState('chargingManagement.control.tsWritePlanShadowJson', JSON.stringify(writePlan || {}), true);
            await this._queueState('chargingManagement.control.tsWritePlanProductivePrepJson', JSON.stringify(writePlanProductivePrep || {}), true);
            await this._queueState('chargingManagement.control.tsWritePlanProductiveJson', JSON.stringify(writePlanProductive || {}), true);
            await this._queueState('chargingManagement.control.tsWritePlanSource', writePlanProductive && writePlanProductive.productive ? 'ts-write-plan' : (writePlanProductivePrep && writePlanProductivePrep.prepared ? 'ts-write-plan-prepared' : (writePlan && writePlan.available !== false ? 'ts-write-plan-shadow' : 'js-runtime')), true);
        } catch (_eWrite) {}
        return { phasePlan, shadow, productivePrep, productiveDecision, normalSourceDecision, writePlan, writePlanProductivePrep, writePlanProductive };
    }

    /**
     * Code-Teil: _mapChargingWallboxesForTsAllocation
     * Zweck: Normalisiert die aktuelle Runtime-Wallboxliste für den TypeScript-Allocation-/Write-Plan.
     * Dadurch verwenden Normalpfad, Peak-Rampdown und Failsafe denselben TS-Vertrag.
     */
    _mapChargingWallboxesForTsAllocation(wbList) {
        return (Array.isArray(wbList) ? wbList : []).map(w => ({
            safe: w && w.safe,
            key: w && w.key,
            name: w && w.name,
            enabled: !!(w && w.enabled),
            online: !!(w && w.online),
            cfgEnabled: !!(w && w.cfgEnabled),
            userEnabled: !!(w && w.userEnabled),
            vehiclePlugged: w ? w.vehiclePlugged : undefined,
            charging: !!(w && w.charging),
            effectiveMode: w && w.effectiveMode,
            userMode: w && w.userMode,
            chargerType: w && w.chargerType,
            controlBasis: w && w.controlBasis,
            phases: w && w.phases,
            phaseMode: w && w.phaseMode,
            configuredPhaseCount: w && w.configuredPhaseCount,
            currentPhaseCount: w && w.currentPhaseCount,
            targetPhaseCount: w && w.targetPhaseCount,
            allocationPhaseCount: w && w.allocationPhaseCount,
            phaseSwitchRequired: w && w.phaseSwitchRequired,
            phaseSwitchAllowed: w && w.phaseSwitchAllowed,
            phaseSwitchCommandAllowed: w && w.phaseSwitchCommandAllowed,
            phaseSwitchKey: w && w.phaseSwitchKey,
            phaseSwitchValue: w && w.phaseSwitchValue,
            phaseSwitchReason: w && w.phaseSwitchReason,
            phaseSwitchSafetyStopRequired: w && w.phaseSwitchSafetyStopRequired,
            phaseSwitchCooldownRemainingMs: w && w.phaseSwitchCooldownRemainingMs,
            stopBeforePhaseSwitch: w && w.stopBeforePhaseSwitch,
            storageAssistCustomerAllowed: !!(w && w.storageAssistCustomerAllowed),
            userStorageAssistEnabled: !!(w && w.userStorageAssistEnabled),
            effectiveStorageAssist: !!(w && w.effectiveStorageAssist),
            storageAssistBlockedReason: w && w.storageAssistBlockedReason,
            batteryContributionW: w && w.batteryContributionW,
            voltageV: w && w.voltageV,
            minPowerW: w && w.minPW,
            maxPowerW: w && w.maxPW,
            minA: w && w.minA,
            maxA: w && w.maxA,
            actualPowerW: w && w.actualPowerW,
            priority: w && w.priority,
            stationKey: w && w.stationKey,
            connectorNo: w && w.connectorNo,
            setAKey: w && w.setAKey,
            setWKey: w && w.setWKey,
            enableKey: w && w.enableKey,
            hasSetpoint: !!(w && (w.hasSetpoint || w.setAKey || w.setWKey)),
            hasSetPower: !!(w && w.setWKey),
            hasSetCurrent: !!(w && w.setAKey),
            staleAny: !!(w && w.staleAny),
        }));
    }


    /**
     * Code-Teil: _publishChargingPhaseSelectionRuntimeStates
     * Zweck: Übernimmt Hysterese-/Cooldown-Zustände aus der TS-Phasenwahl und veröffentlicht lesbare Diagnose pro Ladepunkt.
     */
    async _publishChargingPhaseSelectionRuntimeStates(phasePlan, wbList) {
        const decisions = phasePlan && Array.isArray(phasePlan.wallboxes) ? phasePlan.wallboxes : [];
        const bySafe = new Map((Array.isArray(wbList) ? wbList : []).filter(w => w && w.safe).map(w => [String(w.safe), w]));
        for (const d of decisions) {
            if (!d || typeof d !== 'object') continue;
            const safe = String(d.safe || '').trim();
            if (!safe) continue;
            const w = bySafe.get(safe);
            const high = Number(d.nextHighSinceMs || 0);
            const low = Number(d.nextLowSinceMs || 0);
            if (this._chargingPhaseHighSinceMs) {
                if (Number.isFinite(high) && high > 0) this._chargingPhaseHighSinceMs.set(safe, high);
                else this._chargingPhaseHighSinceMs.delete(safe);
            }
            if (this._chargingPhaseLowSinceMs) {
                if (Number.isFinite(low) && low > 0) this._chargingPhaseLowSinceMs.set(safe, low);
                else this._chargingPhaseLowSinceMs.delete(safe);
            }
            if (!w || !w.ch) continue;
            try { await this._queueState(`${w.ch}.phaseMode`, String(d.mode || w.phaseMode || ''), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.currentPhaseCount`, Number(d.currentPhaseCount || w.currentPhaseCount || 0), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.targetPhaseCount`, Number(d.targetPhaseCount || w.targetPhaseCount || 0), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.phaseSwitchState`, d.switchRequired ? (d.switchCommandAllowed ? 'command-ready' : (d.safetyStopRequired ? 'safe-stop-before-switch' : 'pending')) : 'idle', true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.phaseSwitchReason`, String(d.reason || d.blocker || d.warning || ''), true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.phaseCooldownRemainingMs`, Number(d.cooldownRemainingMs || 0), true); } catch { /* ignore */ }
        }
    }

    /**
     * Code-Teil: _publishChargingNormalSourceState
     * Zweck: Veröffentlicht den EVCS-TypeScript-Normalquellen-Lockdown. Dieser Status
     * fasst zusammen, ob Control, Budget-Caps, Allocation und Write-Plan gleichzeitig
     * produktiv sind und JavaScript nur noch ioBroker-Executor bzw. harter Notfallback ist.
     */
    async _publishChargingNormalSourceState(inputOrTsAllocationState, tsWritePlanProductive = null, tsWritePlanUsed = false, debugAlloc = [], context = 'normal', legacyFallbackReason = '', legacyDecisionTree = null) {
        const mirror = requireChargingNormalSourceTsMirror();
        let payload = null;
        const first = inputOrTsAllocationState && typeof inputOrTsAllocationState === 'object' ? inputOrTsAllocationState : null;
        const objectInput = !!(first && (
            Object.prototype.hasOwnProperty.call(first, 'allocation')
            || Object.prototype.hasOwnProperty.call(first, 'writePlan')
            || Object.prototype.hasOwnProperty.call(first, 'executor')
            || Object.prototype.hasOwnProperty.call(first, 'budget')
            || Object.prototype.hasOwnProperty.call(first, 'control')
        ));
        const tsAllocationState = objectInput ? null : first;
        const candidateCount = Array.isArray(debugAlloc) ? debugAlloc.filter(a => a && typeof a === 'object' && a.type !== 'budget').length : 0;
        const allocationDecision = objectInput
            ? (first.allocation || null)
            : (tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision) ? (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision) : null);
        const executorFallback = {
            used: !!tsWritePlanUsed,
            ok: !!tsWritePlanUsed,
            source: tsWritePlanUsed ? 'ts-write-plan' : 'js-hard-fallback',
            role: tsWritePlanUsed ? 'executor-only' : 'hard-fallback-only',
            appliedCount: 0,
            failedCount: tsWritePlanUsed ? 0 : 1,
            skippedCount: 0,
        };
        const input = objectInput ? {
            context: first.context || context,
            mode: first.mode || '',
            status: first.status || '',
            safetyStop: !!first.safetyStop,
            safetyReason: first.safetyReason || '',
            control: first.control || this._chargingControlTsProductiveLast || null,
            budget: first.budget || this._chargingBudgetTsProductiveLast || null,
            allocation: allocationDecision,
            writePlan: first.writePlan || tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
            executor: first.executor || this._chargingWritePlanExecutorLast || executorFallback,
            legacy: first.legacy || legacyDecisionTree || this._chargingLegacyDecisionTreeLast || null,
            ts: Date.now(),
        } : {
            context,
            mode: '',
            status: '',
            safetyStop: String(context || '').includes('safety') || String(context || '').includes('failsafe') || String(context || '').includes('rampdown'),
            safetyReason: '',
            control: this._chargingControlTsProductiveLast || null,
            budget: this._chargingBudgetTsProductiveLast || null,
            allocation: allocationDecision,
            writePlan: tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
            executor: this._chargingWritePlanExecutorLast || executorFallback,
            legacy: legacyDecisionTree || this._chargingLegacyDecisionTreeLast || null,
            ts: Date.now(),
        };
        try {
            const buildNormalSource = mirror && (
                mirror.buildChargingNormalSourceDecision
                || mirror.buildChargingNormalSourceLockdown
                || mirror.buildChargingTsNormalSourceLockdown
            );
            if (!buildNormalSource) {
                payload = {
                    source: 'ts-charging-normal-source-lockdown-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    tsNormalSource: false,
                    runtimeSource: 'javascript-hard-fallback',
                    normalSource: 'javascript-hard-fallback',
                    jsRole: 'executor-and-hard-fallback',
                    context: String(input.context || 'normal'),
                    fallback: true,
                    fallbackReason: 'missing-ts-normal-source-mirror',
                    blockers: ['missing-ts-normal-source-mirror'],
                    candidateCount,
                    ts: Date.now(),
                };
            } else {
                payload = buildNormalSource(input);
                if (payload && typeof payload === 'object' && candidateCount && payload.candidateCount === undefined) payload.candidateCount = candidateCount;
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-normal-source-lockdown-v1',
                available: false,
                ok: false,
                productive: false,
                tsNormalSource: false,
                runtimeSource: 'javascript-hard-fallback',
                normalSource: 'javascript-hard-fallback',
                jsRole: 'executor-and-hard-fallback',
                context: String(input.context || 'normal'),
                fallback: true,
                fallbackReason: 'ts-normal-source-runtime-error',
                error: e && e.message ? e.message : String(e),
                candidateCount,
                ts: Date.now(),
            };
        }
        this._chargingNormalSourceTsLast = payload;
        this._chargingNormalSourceTsLockdownLast = payload;
        try {
            const runtimeSource = payload && payload.runtimeSource ? String(payload.runtimeSource) : 'javascript-hard-fallback';
            const normalSourceValue = runtimeSource === 'typescript' ? 'ts-normal-source' : 'javascript-hard-fallback';
            await this._queueState('chargingManagement.control.tsNormalSourceJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSourceLockdownJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSource', normalSourceValue, true);
            await this._queueState('chargingManagement.control.tsRuntimeSource', runtimeSource, true);
            await this._queueState('chargingManagement.control.tsMigrationReady', runtimeSource === 'typescript', true);
        } catch (_eNormalSource) {}
        try {
            await this._publishChargingEvcsJavascriptRemovalState(payload, input);
        } catch (_eRemovalState) {}
        return payload;
    }

    /**
     * Code-Teil: _publishChargingEvcsJavascriptRemovalState
     * Zweck: Veröffentlicht das finale TypeScript-Freigabe-Gate für den Abbau des
     * alten EVCS-JavaScript-Entscheidungsbaums. Wichtig: Node/ioBroker führt am Ende
     * weiterhin generiertes JavaScript aus; fachliche EVCS-Entscheidungen liegen bei
     * grünem Gate aber vollständig in TypeScript.
     */
    async _publishChargingEvcsJavascriptRemovalState(normalSourcePayload, input = {}) {
        const mirror = requireChargingNormalSourceTsMirror();
        let payload = null;
        try {
            const buildRemoval = mirror && (
                mirror.buildChargingEvcsJavascriptRemovalDecision
                || mirror.buildChargingJavascriptRemovalDecision
                || mirror.buildChargingTsFinalHandoverDecision
            );
            if (!buildRemoval) {
                payload = {
                    source: 'ts-charging-evcs-js-removal-ready-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    readyForJavascriptRemoval: false,
                    readyForEvcsJsDecisionTreeRemoval: false,
                    readyForAdapterTsRuntime: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-removal-mirror',
                    runtimeSource: 'javascript-hard-fallback',
                    jsRole: 'executor-and-hard-fallback',
                    blockers: ['missing-ts-removal-mirror'],
                    ts: Date.now(),
                };
            } else {
                payload = buildRemoval({
                    context: input.context || (normalSourcePayload && normalSourcePayload.context) || 'normal',
                    normalSource: normalSourcePayload || this._chargingNormalSourceTsLockdownLast || null,
                    allocation: input.allocation || this._chargingAllocationTsNormalSourceLast || this._chargingAllocationTsProductiveLast || null,
                    writePlan: input.writePlan || this._chargingWritePlanTsProductiveLast || null,
                    executor: input.executor || this._chargingWritePlanExecutorLast || null,
                    legacy: input.legacy || this._chargingLegacyDecisionTreeLast || null,
                    budget: input.budget || this._chargingBudgetTsProductiveLast || null,
                    control: input.control || this._chargingControlTsProductiveLast || null,
                    ts: Date.now(),
                });
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-evcs-js-removal-ready-v1',
                available: false,
                ok: false,
                productive: false,
                readyForJavascriptRemoval: false,
                readyForEvcsJsDecisionTreeRemoval: false,
                readyForAdapterTsRuntime: false,
                fallback: true,
                fallbackReason: 'ts-removal-runtime-error',
                error: e && e.message ? e.message : String(e),
                runtimeSource: 'javascript-hard-fallback',
                jsRole: 'executor-and-hard-fallback',
                ts: Date.now(),
            };
        }

        this._chargingEvcsJsRemovalTsLast = payload;
        this._adapterTsRuntimeHandoverLast = payload;
        try {
            const ready = !!(payload && payload.readyForEvcsJsDecisionTreeRemoval);
            const adapterRuntimeSource = ready ? 'typescript-source-with-generated-js-runtime-boundary' : 'javascript-hard-fallback';
            await this._queueState('chargingManagement.control.tsEvcsJsRemovalJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsEvcsJsRemovalReady', ready, true);
            await this._queueState('chargingManagement.control.tsAdapterRuntimeHandoverJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsAdapterRuntimeSource', adapterRuntimeSource, true);
            await this._queueState('chargingManagement.control.tsAdapterMigrationReady', ready, true);
        } catch (_eRemoval) {}
        return payload;
    }

    /**
     * Code-Teil: _publishChargingLegacyDecisionTreeState
     * Zweck: Schreibt die kompakte EVCS-Handover-Diagnose für TS-Write-Plan, JS-Executor und JS-Fallback.
     */
    async _publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, context = 'normal', legacyFallbackReason = '') {
        const fallbackReason = tsWritePlanUsed ? '' : (legacyFallbackReason || (tsWritePlanProductive && tsWritePlanProductive.fallbackReason) || 'ts-write-plan-not-productive');
        const normalSourceDecision = tsAllocationState && tsAllocationState.normalSourceDecision ? tsAllocationState.normalSourceDecision : null;
        const tsAllocationNormalSource = !!(normalSourceDecision && normalSourceDecision.normalSource);
        const tsAllocationProductive = !!(tsAllocationState && tsAllocationState.productiveDecision && tsAllocationState.productiveDecision.productive);
        const tsNormalSourceActive = !!(tsAllocationNormalSource && tsWritePlanUsed);
        const diagnosticMismatchCount = normalSourceDecision && Number.isFinite(Number(normalSourceDecision.diagnosticMismatchCount)) ? Number(normalSourceDecision.diagnosticMismatchCount) : 0;
        const normalSourceLockdown = {
            source: 'ts-charging-normal-source-lockdown-v1',
            context: String(context || 'normal'),
            ok: tsNormalSourceActive,
            normalSourceActive: tsNormalSourceActive,
            tsAllocationNormalSource,
            tsAllocationProductive,
            tsWritePlanProductive: !!(tsWritePlanProductive && tsWritePlanProductive.productive),
            tsWritePlanUsed: !!tsWritePlanUsed,
            jsRole: tsWritePlanUsed ? 'executor-only' : 'hard-fallback-only',
            normalWritePath: tsNormalSourceActive ? 'ts-normal-source-write-plan-with-js-executor' : (tsWritePlanUsed ? 'ts-write-plan-with-js-executor' : 'js-hard-fallback'),
            jsComparisonMode: tsAllocationNormalSource ? 'diagnostic-only' : 'blocking-until-normal-source',
            diagnosticMismatchCount,
            fallbackReason,
            hardFallbackOnly: !tsWritePlanUsed,
            hardFallbackReasons: [
                'missing-ts-mirror',
                'missing-ts-allocation-mirror',
                'missing-ts-write-plan-mirror',
                'stale-meter',
                'stale-budget',
                'ts-runtime-error',
                'write-plan-not-productive',
                'invalid-apply-plan',
                'executor-error',
            ],
            removedFromNormalPath: [
                'direct-js-setpoint-write-loop',
                'direct-js-failsafe-write-loop',
                'direct-js-peak-rampdown-write-loop',
                'js-only-safety-stop-write-plan',
                'ts-js-allocation-mismatch-as-normal-path-blocker',
            ],
            ts: Date.now(),
        };
        const legacyDecisionTree = {
            // Kompatibilitätsmarker für ältere Checks: source: 'ts-charging-legacy-js-decision-tree-reduction-v4'
            source: 'ts-charging-legacy-js-decision-tree-reduction-v5',
            context: String(context || 'normal'),
            jsRole: tsWritePlanUsed ? 'executor-only' : 'executor-and-hard-fallback',
            normalWritePath: normalSourceLockdown.normalWritePath,
            tsAllocationProductive,
            tsAllocationNormalSource,
            tsNormalSourceActive,
            tsWritePlanProductive: !!(tsWritePlanProductive && tsWritePlanProductive.productive),
            tsAllocationSource: tsAllocationNormalSource ? 'ts-normal-source' : (tsAllocationProductive ? 'ts-allocation' : 'js-runtime-hard-fallback'),
            tsWritePlanSource: tsWritePlanUsed ? 'ts-write-plan' : 'js-runtime-hard-fallback',
            fallbackReason,
            directSetpointLoopsRemoved: true,
            normalSourceLockdownViaTs: true,
            jsComparisonDiagnosticOnly: tsAllocationNormalSource,
            safetyStopHandoverViaTsWritePlan: true,
            staleMeterSafeStopCanUseTsPlan: true,
            peakRampdownSafeStopCanUseTsPlan: true,
            executorOnlySetpointWriter: '_executeChargingSetpointEntries',
            removedFromNormalPath: normalSourceLockdown.removedFromNormalPath,
            retainedAsHardFallback: normalSourceLockdown.hardFallbackReasons,
            diagnosticMismatchCount,
            normalSourceLockdown,
            candidateCount: Array.isArray(debugAlloc) ? debugAlloc.filter(a => a && typeof a === 'object' && a.type !== 'budget').length : 0,
            ts: Date.now(),
        };
        this._chargingLegacyDecisionTreeLast = legacyDecisionTree;
        this._chargingNormalSourceLockdownLast = normalSourceLockdown;
        try {
            await this._queueState('chargingManagement.control.tsLegacyDecisionTreeJson', JSON.stringify(legacyDecisionTree), true);
            await this._queueState('chargingManagement.control.tsNormalSourceLockdownJson', JSON.stringify(normalSourceLockdown), true);
            await this._queueState('chargingManagement.control.tsNormalSourceJson', JSON.stringify(normalSourceLockdown), true);
            await this._queueState('chargingManagement.control.tsNormalSource', normalSourceLockdown.normalSourceActive ? 'ts-normal-source' : (normalSourceLockdown.hardFallbackOnly ? 'hard-fallback-only' : 'ts-write-plan'), true);
        } catch (_eLegacyDecision) {}
        try {
            const safetyStopContext = String(context || '').includes('safety') || String(context || '').includes('rampdown');
            const tsNormalSource = await this._publishChargingTsNormalSourceState(context, tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, safetyStopContext);
            if (tsNormalSource && typeof tsNormalSource === 'object') {
                legacyDecisionTree.normalSourceLockdown = tsNormalSource;
                legacyDecisionTree.tsNormalSourceActive = tsNormalSource.runtimeSource === 'typescript';
                legacyDecisionTree.tsNormalSourceReadyForJsRemoval = tsNormalSource.runtimeSource === 'typescript';
                await this._queueState('chargingManagement.control.tsLegacyDecisionTreeJson', JSON.stringify(legacyDecisionTree), true);
            }
        } catch (_eNormalSourceLockdown) {}
        return legacyDecisionTree;
    }

    /**
     * Code-Teil: _publishChargingTsNormalSourceState
     * Zweck: Verdichtet den EVCS-Handover zu einem TS-Normalquellen-Status.
     * Dadurch ist pro Tick sichtbar, ob Control/Budget/Allocation/Write-Plan
     * produktiv aus TypeScript laufen und JavaScript nur noch Executor ist.
     */
    async _publishChargingTsNormalSourceState(context, tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason = '', safetyStop = false) {
        const mirror = requireChargingNormalSourceTsMirror();
        let payload = null;
        try {
            const allocationProductive = tsAllocationState && tsAllocationState.productiveDecision
                ? tsAllocationState.productiveDecision
                : (this._chargingAllocationTsProductiveLast || null);
            const buildNormalSource = mirror && (
                mirror.buildChargingNormalSourceDecision
                || mirror.buildChargingNormalSourceLockdown
                || mirror.buildChargingTsNormalSourceLockdown
            );
            if (!buildNormalSource) {
                payload = {
                    source: 'ts-charging-normal-source-lockdown-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    tsNormalSource: false,
                    runtimeSource: 'javascript-hard-fallback',
                    normalSource: 'javascript-hard-fallback',
                    fallback: true,
                    fallbackReason: 'missing-ts-normal-source-mirror',
                    context: String(context || 'normal'),
                    ts: Date.now(),
                };
            } else {
                const allocationNormalSource = tsAllocationState && tsAllocationState.normalSourceDecision
                    ? tsAllocationState.normalSourceDecision
                    : null;
                payload = buildNormalSource({
                    context,
                    control: this._chargingControlTsProductiveLast || null,
                    budget: this._chargingBudgetTsProductiveLast || null,
                    allocation: allocationNormalSource || allocationProductive || null,
                    writePlan: tsWritePlanProductive || this._chargingWritePlanTsProductiveLast || null,
                    executor: this._chargingWritePlanExecutorLast || null,
                    legacy: this._chargingLegacyDecisionTreeLast || null,
                    tsWritePlanUsed: !!tsWritePlanUsed,
                    fallbackReason: legacyFallbackReason || '',
                    safetyStop: !!safetyStop,
                    ts: Date.now(),
                });
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-normal-source-lockdown-v1',
                available: false,
                ok: false,
                productive: false,
                tsNormalSource: false,
                runtimeSource: 'javascript-hard-fallback',
                normalSource: 'javascript-hard-fallback',
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                context: String(context || 'normal'),
                ts: Date.now(),
            };
        }
        this._chargingTsNormalSourceLast = payload;
        this._chargingNormalSourceTsLockdownLast = payload;
        try {
            const runtimeSource = payload && payload.runtimeSource ? String(payload.runtimeSource) : 'javascript-hard-fallback';
            const normalSourceValue = runtimeSource === 'typescript' ? 'ts-normal-source' : 'js-hard-fallback';
            await this._queueState('chargingManagement.control.tsNormalSourceJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSourceLockdownJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsNormalSource', normalSourceValue, true);
            await this._queueState('chargingManagement.control.tsRuntimeSource', runtimeSource, true);
            await this._queueState('chargingManagement.control.tsMigrationReady', runtimeSource === 'typescript', true);
        } catch (_eNormalSource) {}
        try {
            await this._publishChargingEvcsJavascriptRemovalState(payload, input);
        } catch (_eRemovalState) {}
        return payload;
    }

    /**
     * Code-Teil: _executeChargingSetpointEntries
     * Zweck: Führt einen bereits berechneten Setpoint-Plan aus. Die fachliche Zielentscheidung
     * kommt im Normalfall aus TypeScript; diese Methode bleibt bewusst nur ioBroker-Executor.
     */
    async _executeChargingSetpointEntries(entries, wbList, debugAlloc, executorSource, fallbackReason = '') {
        const result = {
            source: executorSource || 'unknown',
            fallbackReason: fallbackReason || '',
            ok: true,
            executorRole: executorSource === 'ts-write-plan' ? 'javascript-executor-for-ts-plan' : 'javascript-hard-fallback',
            usesTsEntryBasis: executorSource === 'ts-write-plan',
            fallbackOnExecutorError: true,
            appliedCount: 0,
            skippedCount: 0,
            failedCount: 0,
            entries: [],
            ts: Date.now(),
        };
        const bySafe = new Map();
        for (const w of Array.isArray(wbList) ? wbList : []) {
            if (w && w.safe) bySafe.set(String(w.safe), w);
        }
        const debugBySafe = new Map();
        for (const item of Array.isArray(debugAlloc) ? debugAlloc : []) {
            if (item && typeof item === 'object' && item.safe) debugBySafe.set(String(item.safe), item);
        }
        const plannedEntries = Array.isArray(entries) ? entries : [];
        for (const entry of plannedEntries) {
            const safe = String(entry && entry.safe ? entry.safe : '').trim();
            if (!safe) continue;
            const w = bySafe.get(safe);
            if (!w) {
                result.skippedCount += 1;
                result.entries.push({ safe, status: 'missing-wallbox', applied: false });
                continue;
            }
            const targetWNum = Number(entry.targetPowerW ?? entry.targetW ?? 0);
            const targetANum = Number(entry.targetCurrentA ?? entry.targetA ?? 0);
            const targetW = Number.isFinite(targetWNum) && targetWNum > 0 ? Math.round(targetWNum) : 0;
            const targetA = Number.isFinite(targetANum) && targetANum > 0 ? Number(targetANum) : 0;
            const rawEntryBasis = String(entry.basis || entry.controlBasis || w.controlBasis || '').trim().toLowerCase();
            const plannedBasis = (rawEntryBasis === 'current' || rawEntryBasis === 'currenta' || rawEntryBasis === 'current_a' || rawEntryBasis === 'a' || rawEntryBasis === 'amp' || rawEntryBasis === 'amps')
                ? 'currentA'
                : ((rawEntryBasis === 'power' || rawEntryBasis === 'powerw' || rawEntryBasis === 'w' || rawEntryBasis === 'watt' || rawEntryBasis === 'watts') ? 'powerW' : (w.controlBasis || 'auto'));
            const plannedSetpointKey = String(entry.setpointKey || '').trim();
            const shouldWrite = !!(entry.writeRequired !== false && !entry.blocked);
            const isPhaseSwitchEntry = String(entry.type || '').trim() === 'phaseSwitch' || rawEntryBasis === 'phase' || rawEntryBasis === 'phasemode';
            let applied = false;
            let applyStatus = shouldWrite ? 'planned' : (entry && entry.reason ? String(entry.reason) : 'skipped');
            let applyWrites = null;
            if (isPhaseSwitchEntry) {
                const phaseValue = entry ? entry.targetValue : undefined;
                if (!shouldWrite) {
                    result.skippedCount += 1;
                } else if (!this.dp || !plannedSetpointKey || !(this.dp.getEntry && this.dp.getEntry(plannedSetpointKey))) {
                    applyStatus = 'missing-phase-switch-setpoint';
                    result.failedCount += 1;
                    result.ok = false;
                } else {
                    try {
                        let writeResult = false;
                        if (typeof phaseValue === 'boolean' && this.dp.writeBoolean) {
                            writeResult = await this.dp.writeBoolean(plannedSetpointKey, phaseValue, false);
                        } else {
                            const n = Number(phaseValue);
                            if (Number.isFinite(n) && this.dp.writeNumber) {
                                writeResult = await this.dp.writeNumber(plannedSetpointKey, n, false);
                            } else {
                                const dpEntry = this.dp.getEntry(plannedSetpointKey);
                                await this.adapter.setForeignStateAsync(dpEntry.objectId, phaseValue, false);
                                if (this.dp.lastWriteByObjectId && typeof this.dp.lastWriteByObjectId.set === 'function') {
                                    this.dp.lastWriteByObjectId.set(dpEntry.objectId, { val: phaseValue, ts: Date.now() });
                                }
                                writeResult = true;
                            }
                        }
                        applied = writeResult !== false;
                        applyStatus = applied ? 'phase-switch-applied' : 'phase-switch-write-skipped';
                        applyWrites = [{ key: plannedSetpointKey, value: phaseValue, basis: 'phase' }];
                        if (applied) {
                            result.appliedCount += 1;
                            const targetPhase = Number(entry.targetPhaseCount || 0);
                            if (targetPhase === 1 || targetPhase === 3) {
                                if (this._chargingPhaseAssumedBySafe && typeof this._chargingPhaseAssumedBySafe.set === 'function') this._chargingPhaseAssumedBySafe.set(w.safe, targetPhase);
                                const cooldownMs = Number(w.phaseSwitchCooldownMs || 15 * 60 * 1000);
                                const settleMs = Number(w.phaseSwitchSettleMs || 30 * 1000);
                                const nowMs = Date.now();
                                if (this._chargingPhaseCooldownUntilMs && typeof this._chargingPhaseCooldownUntilMs.set === 'function') this._chargingPhaseCooldownUntilMs.set(w.safe, nowMs + (Number.isFinite(cooldownMs) && cooldownMs > 0 ? cooldownMs : 15 * 60 * 1000));
                                if (this._chargingPhaseSettleUntilMs && typeof this._chargingPhaseSettleUntilMs.set === 'function') this._chargingPhaseSettleUntilMs.set(w.safe, nowMs + (Number.isFinite(settleMs) && settleMs > 0 ? settleMs : 30 * 1000));
                            }
                        } else {
                            result.skippedCount += 1;
                        }
                    } catch (e) {
                        applyStatus = e && e.message ? `phase_switch_executor_error:${e.message}` : 'phase_switch_executor_error';
                        result.failedCount += 1;
                        result.ok = false;
                    }
                }
            } else if (!shouldWrite) {
                result.skippedCount += 1;
            } else if (!this.dp) {
                applyStatus = 'no_dp_registry';
                result.failedCount += 1;
                result.ok = false;
            } else {
                try {
                    const consumerBase = w.consumer || {
                        type: 'evcs',
                        key: w.safe,
                        name: w.name,
                        controlBasis: w.controlBasis,
                        setAKey: w.setAKey || '',
                        setWKey: w.setWKey || '',
                        enableKey: w.enableKey || '',
                    };
                    const consumer = {
                        ...consumerBase,
                        controlBasis: plannedBasis,
                        setAKey: plannedBasis === 'currentA' && plannedSetpointKey ? plannedSetpointKey : (consumerBase.setAKey || w.setAKey || ''),
                        setWKey: plannedBasis === 'powerW' && plannedSetpointKey ? plannedSetpointKey : (consumerBase.setWKey || w.setWKey || ''),
                    };
                    const res = await applySetpoint(
                        { adapter: this.adapter, dp: this.dp },
                        consumer,
                        { targetW, targetA, basis: plannedBasis },
                    );
                    applied = !!res?.applied;
                    applyStatus = String(res?.status || (applied ? 'applied' : 'write_failed'));
                    applyWrites = res?.writes || null;
                    if (applied) result.appliedCount += 1;
                    else {
                        result.failedCount += 1;
                        result.ok = false;
                    }
                } catch (e) {
                    applyStatus = e && e.message ? `executor_error:${e.message}` : 'executor_error';
                    result.failedCount += 1;
                    result.ok = false;
                }
            }
            try { await this._queueState(`${w.ch}.targetCurrentA`, targetA, true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.targetPowerW`, targetW, true); } catch { /* ignore */ }
            if (isPhaseSwitchEntry) {
                try { await this._queueState(`${w.ch}.phaseSwitchState`, applyStatus, true); } catch { /* ignore */ }
                try { await this._queueState(`${w.ch}.targetPhaseCount`, Number(entry.targetPhaseCount || 0), true); } catch { /* ignore */ }
            }
            try { await this._queueState(`${w.ch}.applied`, applied, true); } catch { /* ignore */ }
            try { await this._queueState(`${w.ch}.applyStatus`, applyStatus, true); } catch { /* ignore */ }
            try {
                await this._queueState(`${w.ch}.applyWrites`, applyWrites ? JSON.stringify(applyWrites) : '', true);
            } catch {
                try { await this._queueState(`${w.ch}.applyWrites`, '', true); } catch { /* ignore */ }
            }
            try {
                if (this._lastCmdTargetW && typeof this._lastCmdTargetW.set === 'function') this._lastCmdTargetW.set(w.safe, targetW);
                if (this._lastCmdTargetA && typeof this._lastCmdTargetA.set === 'function') this._lastCmdTargetA.set(w.safe, targetA);
            } catch {
                // ignore runtime cache errors
            }
            const dbg = debugBySafe.get(safe);
            if (dbg && typeof dbg === 'object') {
                dbg.applied = applied;
                dbg.applyStatus = applyStatus;
                dbg.applyWrites = applyWrites;
                dbg.executorSource = executorSource || '';
                dbg.writePlanFallbackReason = fallbackReason || '';
                dbg.executorBasis = plannedBasis;
                dbg.executorSetpointKey = plannedSetpointKey || '';
                if (isPhaseSwitchEntry) {
                    dbg.phaseSwitchApplied = applied;
                    dbg.phaseSwitchValue = entry.targetValue;
                }
            }
            result.entries.push({ safe, targetW, targetA, basis: isPhaseSwitchEntry ? 'phase' : plannedBasis, setpointKey: plannedSetpointKey || '', applied, status: applyStatus, source: executorSource || '', targetPhaseCount: Number(entry.targetPhaseCount || 0), targetValue: entry.targetValue });
        }
        this._chargingWritePlanExecutorLast = result;
        try {
            await this._queueState('chargingManagement.control.tsWritePlanExecutorJson', JSON.stringify(result), true);
        } catch {
            // diagnostics only
        }
        return result;
    }

    /**
     * Code-Teil: _executeChargingTsSetpointPlan
     * Zweck: Führt den produktiven TypeScript-Write-Plan über den JS/ioBroker-Executor aus.
     */
    async _executeChargingTsSetpointPlan(writePlanProductive, wbList, debugAlloc) {
        const entries = writePlanProductive && writePlanProductive.productive && writePlanProductive.apply && Array.isArray(writePlanProductive.apply.entries)
            ? writePlanProductive.apply.entries
            : null;
        if (!entries) return false;
        const result = await this._executeChargingSetpointEntries(entries, wbList, debugAlloc, 'ts-write-plan', '');
        return !!(result && result.ok === true);
    }

    /**
     * Code-Teil: _executeChargingLegacySetpointFallback
     * Zweck: Nutzt die bisherigen JS-Zielwerte nur noch als Fallback, wenn der TS-Write-Plan
     * nicht produktiv freigegeben werden konnte.
     */
    async _executeChargingLegacySetpointFallback(wbList, debugAlloc, fallbackReason = 'ts-write-plan-fallback') {
        const bySafe = new Map();
        for (const w of Array.isArray(wbList) ? wbList : []) {
            if (w && w.safe) bySafe.set(String(w.safe), w);
        }
        const entries = [];
        for (const item of Array.isArray(debugAlloc) ? debugAlloc : []) {
            if (!item || typeof item !== 'object' || item.type === 'budget' || !item.safe) continue;
            const safe = String(item.safe);
            const w = bySafe.get(safe);
            if (!w) continue;
            const targetW = Number(item.targetPowerW ?? item.targetW ?? 0);
            const targetA = Number(item.targetCurrentA ?? item.targetA ?? 0);
            const hasSetpoint = !!(w.setAKey || w.setWKey);
            const shouldWrite = hasSetpoint && !!w.online && (!!w.enabled || (!!w.cfgEnabled && !w.userEnabled) || targetW > 0 || targetA > 0);
            entries.push({
                safe,
                targetPowerW: Number.isFinite(targetW) && targetW > 0 ? targetW : 0,
                targetCurrentA: Number.isFinite(targetA) && targetA > 0 ? targetA : 0,
                basis: w.controlBasis === 'currentA' ? 'current' : 'power',
                setpointKey: w.controlBasis === 'currentA' ? (w.setAKey || '') : (w.setWKey || ''),
                writeRequired: shouldWrite,
                blocked: !shouldWrite,
                reason: item.reason || fallbackReason,
            });
        }
        await this._executeChargingSetpointEntries(entries, wbList, debugAlloc, 'js-fallback', fallbackReason);
        return true;
    }



    /**
     * Default publishing options for certain "noisy" diagnostic counters.
     * @param {string} id
     * @returns {{deadband?:number,minIntervalMs?:number}}
     */
    /**
     * Code-Teil: Methode `_pubDefaults`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _pubDefaults
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _pubDefaults(id) {
        const s = String(id || '');
        if (!s) return {};

        // Debug payloads are large and not user-critical → slow down.
        if (s.startsWith('chargingManagement.debug.')) return { minIntervalMs: 5000 };

        // Always-changing counters → update slower to avoid DB spam.
        if (s.endsWith('.idleMs') || s.endsWith('.meterAgeMs') || s.endsWith('.statusAgeMs')) return { minIntervalMs: 5000 };

        // Reduce jitter on live power/current values (UI only, not control).
        if (s.endsWith('.actualPowerW') || s.endsWith('.targetPowerW') || s.endsWith('.stationRemainingW') || s.endsWith('.headroomW') || s.endsWith('.remainingW') || s.endsWith('.usedW') || s.endsWith('.targetSumW')) return { deadband: 5 };
        if (s.endsWith('.actualCurrentA') || s.endsWith('.targetCurrentA') || s.endsWith('.gridWorstPhaseA') || s.endsWith('.gridMaxPhaseA') || s.endsWith('.worstPhaseA')) return { deadband: 0.05 };

        return {};
    }

    /**
     * Rolling-Mean für PV-Überschuss (W) in einem benannten Fenster.
     * @param {'fast5s'|'slow5m'} bucketKey
     * @param {number} nowMs
     * @param {number} sampleW
     * @returns {number} avgW
     */
    /**
     * Code-Teil: Methode `_pvSurplusAvgPush`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _pvSurplusAvgPush
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _pvSurplusAvgPush(bucketKey, nowMs, sampleW) {
        const buckets = this._pvSurplusAvg || {};
        const bucket = buckets && Object.prototype.hasOwnProperty.call(buckets, bucketKey) ? buckets[bucketKey] : null;
        const v = (typeof sampleW === 'number' && Number.isFinite(sampleW)) ? sampleW : 0;
        const now = (typeof nowMs === 'number' && Number.isFinite(nowMs)) ? nowMs : Date.now();

        if (!bucket || typeof bucket !== 'object') return v;
        if (!Array.isArray(bucket.samples)) bucket.samples = [];
        if (!Number.isFinite(bucket.head) || bucket.head < 0) bucket.head = 0;
        if (!Number.isFinite(bucket.sumW)) bucket.sumW = 0;

        const windowMs = (typeof bucket.windowMs === 'number' && Number.isFinite(bucket.windowMs) && bucket.windowMs > 0)
            ? bucket.windowMs
            : 0;
        if (!windowMs) return v;

        bucket.samples.push({ t: now, v });
        bucket.sumW += v;

        const cutoff = now - windowMs;
        while (bucket.head < bucket.samples.length && bucket.samples[bucket.head].t < cutoff) {
            bucket.sumW -= bucket.samples[bucket.head].v;
            bucket.head++;
        }

        // gelegentlich kompaktieren (Performance, kein Array.shift)
        if (bucket.head > 100) {
            bucket.samples = bucket.samples.slice(bucket.head);
            bucket.head = 0;
        }

        const count = Math.max(1, bucket.samples.length - bucket.head);
        return bucket.sumW / count;
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
    _getAdapterNumberFromCache(key, fallback = null) {
        const sid = String(key || '').trim();
        if (!sid) return fallback;

        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const n = this.adapter._nwGetNumberFromCache(sid);
                if (typeof n === 'number' && Number.isFinite(n)) return n;
            }
        } catch {
            // ignore
        }

        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[sid] : null;
            const n = Number(rec && rec.value);
            if (Number.isFinite(n)) return n;
        } catch {
            // ignore
        }

        return fallback;
    }

    /**
     * Queue a local state update (fast). This avoids awaiting many adapter.setStateAsync calls inside the tick loop.
     * Writes are de-duplicated by id and flushed asynchronously with limited concurrency.
     *
     * @param {string} id
     * @param {any} value
     * @param {boolean} [ack=true]
     * @param {{deadband?:number,minIntervalMs?:number}} [opts]
     * @returns {Promise<true|null>}
     */
    /**
     * Code-Teil: Methode `_queueState`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _queueState
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _queueState(id, value, ack = true, opts = null) {
        const sid = String(id || '').trim();
        if (!sid) return null;

        const now = Date.now();
        const o = Object.assign({}, this._pubDefaults(sid), (opts || {}));

        // Normalize value for storage
        let v = value;
        if (v === undefined) v = null;
        if (typeof v === 'number' && !Number.isFinite(v)) v = 0;
        if (v !== null && typeof v === 'object') {
            try {
                v = JSON.stringify(v);
            } catch {
                v = String(v);
            }
        }

        const prev = this._pubCache.get(sid);
        if (prev) {
            // min interval gate (drop until next tick)
            const mi = Number(o.minIntervalMs);
            if (Number.isFinite(mi) && mi > 0 && Number.isFinite(prev.ts) && (now - prev.ts) < mi) {
                return null;
            }

            // equality / deadband
            if (typeof v === 'number' && typeof prev.val === 'number' && Number.isFinite(v) && Number.isFinite(prev.val)) {
                const db = Number(o.deadband);
                if (Number.isFinite(db) && db > 0) {
                    if (Math.abs(v - prev.val) < db) return null;
                } else if (v === prev.val) {
                    return null;
                }
            } else {
                if (v === prev.val) return null;
            }
        }

        // optimistic cache update (we previously ignored setState errors anyway)
        this._pubCache.set(sid, { val: v, ts: now });
        this._pubQueue.set(sid, { val: v, ack: !!ack });
        this._schedulePubFlush();
        return true;
    }

    /**
     * Read a local state using the adapter's in-memory stateCache first (fast),
     * falling back to getStateAsync only on cache misses.
     *
     * @param {string} id
     * @returns {Promise<{val:any,ts:number,lc?:number,ack?:boolean}|null>}
     */
    /**
     * Code-Teil: Methode `_getStateCached`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getStateCached
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _getStateCached(id) {
        const sid = String(id || '').trim();
        if (!sid) return null;

        const a = this.adapter;
        const now = Date.now();

        // Fast path: in-memory stateCache (maintained by main.js onStateChange)
        try {
            const sc = a && a.stateCache;
            if (sc) {
                const e = sc[sid];
                if (e && Object.prototype.hasOwnProperty.call(e, 'value')) {
                    const ts = (typeof e.ts === 'number' && Number.isFinite(e.ts)) ? e.ts : now;
                    return { val: e.value, ts, lc: ts, ack: true };
                }

                // If called with full id, attempt keyFromId mapping
                if (typeof a.keyFromId === 'function' && typeof a.namespace === 'string') {
                    const pref = a.namespace + '.';
                    if (sid.startsWith(pref)) {
                        const k = a.keyFromId(sid);
                        if (k && sc[k] && Object.prototype.hasOwnProperty.call(sc[k], 'value')) {
                            const ts = (typeof sc[k].ts === 'number' && Number.isFinite(sc[k].ts)) ? sc[k].ts : now;
                            return { val: sc[k].value, ts, lc: ts, ack: true };
                        }
                    }
                }
            }
        } catch {
            // ignore
        }

        // Fallback: DB read
        try {
            const st = await a.getStateAsync(sid);
            // Prime cache (best-effort)
            try {
                const sc = a && a.stateCache;
                if (sc) {
                    const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : now));
                    sc[sid] = { value: st ? st.val : null, ts: ts || now };
                }
            } catch {
                // ignore
            }
            return st || null;
        } catch {
            return null;
        }
    }

    /**
     * Code-Teil: Methode `_setTimeout`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setTimeout
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _setTimeout(fn, ms) {
        const a = this.adapter;
        if (!a || a._nwShuttingDown || typeof fn !== 'function') return null;
        const guarded = (...args) => {
            if (!this.adapter || this.adapter._nwShuttingDown) return;
            return fn(...args);
        };
        return (typeof a._nwSetTimeout === 'function')
            ? a._nwSetTimeout(guarded, ms)
            : ((typeof a.setTimeout === 'function') ? a.setTimeout(guarded, ms) : setTimeout(guarded, ms));
    }
    /**
     * Code-Teil: _clearTimeout
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _clearTimeout(timer) {
        if (!timer) return;
        const a = this.adapter;
        if (a && typeof a.clearTimeout === 'function') a.clearTimeout(timer);
        else clearTimeout(timer);
    }

    /**
     * Code-Teil: Methode `_schedulePubFlush`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _schedulePubFlush
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _schedulePubFlush() {
        if (!this.adapter || this.adapter._nwShuttingDown) {
            this._pubQueue.clear();
            return;
        }
        if (this._pubFlushTimer) return;

        const now = Date.now();
        const last = Number(this._pubLastFlushMs) || 0;
        const diff = now - last;
        const delay = diff >= this._pubFlushIntervalMs ? 0 : (this._pubFlushIntervalMs - diff);

        this._pubFlushTimer = this._setTimeout(() => {
            this._pubFlushTimer = null;
            this._flushPubQueue().catch(() => {});
        }, delay);
    }

    /**
     * Code-Teil: Methode `_flushPubQueue`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _flushPubQueue
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _flushPubQueue() {
        if (!this.adapter || this.adapter._nwShuttingDown) {
            this._pubQueue.clear();
            return;
        }
        if (this._pubFlushInFlight) {
            // A flush is already running; make sure we flush again afterwards.
            this._schedulePubFlush();
            return;
        }

        this._pubFlushInFlight = true;
        try {
            const entries = Array.from(this._pubQueue.entries());
            this._pubQueue.clear();
            if (!entries.length) return;

            this._pubLastFlushMs = Date.now();

            const concurrency = 25;
            for (let i = 0; i < entries.length; i += concurrency) {
                const slice = entries.slice(i, i + concurrency);
                await Promise.all(slice.map(([sid, p]) => {
                    try {
                        return this.adapter.setStateAsync(sid, p.val, p.ack).catch(() => {});
                    } catch {
                        return Promise.resolve();
                    }
                }));
            }
        } finally {
            this._pubFlushInFlight = false;
            // If new entries arrived while flushing, schedule another run.
            if (this._pubQueue.size > 0) this._schedulePubFlush();
        }
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
    /**
     * Code-Teil: stop
     * Zweck: Leert die gebündelte Diagnose-/State-Publish-Queue beim Adapter-Unload.
     * Zusammenhang: Die Queue arbeitet mit einem kurzen Timer und darf nach gesetztem
     * Shutdown-Guard keinen weiteren Timerzyklus erzeugen.
     */
    stop() {
        if (this._pubFlushTimer) {
            try { this._clearTimeout(this._pubFlushTimer); } catch (_e) {}
            this._pubFlushTimer = null;
        }
        try { this._pubQueue.clear(); } catch (_e) {}
        this._pubFlushInFlight = false;
    }

    _isEnabled() {
        // Backwards compatible default: older configs may not have the new flag stored yet.
        // If the flag is missing, enable the module when at least one chargepoint
        // is configured (EVCS table). This ensures runtime control states exist and
        // the UI doesn't fall back to legacy mode unexpectedly.
        const v = this.adapter && this.adapter.config ? this.adapter.config.enableChargingManagement : undefined;
        if (typeof v === 'boolean') return v;

        try {
            const cnt = Number(this.adapter && this.adapter.config && this.adapter.config.settingsConfig && this.adapter.config.settingsConfig.evcsCount);
            if (Number.isFinite(cnt) && cnt > 0) return true;
        } catch {
            // ignore
        }

        try {
            const list = (this.adapter && Array.isArray(this.adapter.evcsList)) ? this.adapter.evcsList : [];
            if (list && list.length) return true;
        } catch {
            // ignore
        }

        return false;
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
        if (!this._isEnabled()) return;

        await this.adapter.setObjectNotExistsAsync('chargingManagement', {
            type: 'channel',
            common: { name: 'Charging Management' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.control', {
            type: 'channel',
            common: { name: 'Control' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('chargingManagement.stations', {
            type: 'channel',
            common: { name: 'Stations' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mk
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        // Runtime toggle (writable): Enable/disable the STALE_METER fail-safe without reprogramming.
        // - false: never block charging due to stale metering (still publishes diagnostics)
        // - true : apply stale policy (default: block if config is 'off')
        // NOTE: This is intentionally a STATE (not adapter config) so installers can flip it
        // instantly from scripts/UI without restarting the adapter.
        await this.adapter.setObjectNotExistsAsync('chargingManagement.control.failsafeEnabled', {
            type: 'state',
            common: {
                name: 'Failsafe enabled (STALE_METER)',
                type: 'boolean',
                role: 'switch.enable',
                read: true,
                write: true,
                def: false,
                states: { true: 'Ein', false: 'Aus' },
            },
            native: {},
        });
        // Initialize only once (do not overwrite existing user choice)
        try {
            const st = await this.adapter.getStateAsync('chargingManagement.control.failsafeEnabled');
            if (!st || typeof st.val !== 'boolean') {
                await this.adapter.setStateAsync('chargingManagement.control.failsafeEnabled', { val: false, ack: true });
            }
        } catch {
            // ignore
        }

        await mk('chargingManagement.wallboxCount', 'Ladepunkt count', 'number', 'value');
        await mk('chargingManagement.stationCount', 'Station count', 'number', 'value');
        await mk('chargingManagement.summary.totalPowerW', 'Total actual power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalReservedPowerW', 'Total reserved/commanded power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalCurrentA', 'Total current (A)', 'number', 'value.current');
        await mk('chargingManagement.summary.onlineWallboxes', 'Online Ladepunkte', 'number', 'value');
        await mk('chargingManagement.summary.totalTargetPowerW', 'Total target power (W)', 'number', 'value.power');
        await mk('chargingManagement.summary.totalTargetCurrentA', 'Total target current (A)', 'number', 'value.current');
        await mk('chargingManagement.summary.lastUpdate', 'Last update', 'number', 'value.time');

        await mk('chargingManagement.control.active', 'Control active', 'boolean', 'indicator');
        await mk('chargingManagement.control.mode', 'Mode', 'string', 'text');
        await mk('chargingManagement.control.status', 'Status', 'string', 'text');
        await mk('chargingManagement.control.budgetMode', 'Budget mode', 'string', 'text');
        await mk('chargingManagement.control.budgetW', 'Budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.usedW', 'Reserved/used budget (W)', 'number', 'value.power');
        await mk('chargingManagement.control.actualW', 'Actual measured EVCS power (W)', 'number', 'value.power');
        await mk('chargingManagement.control.reserveW', 'Reserved/commanded EVCS power (W)', 'number', 'value.power');
        await mk('chargingManagement.control.activeDemandReserveW', 'Active EVCS demand reserve (W)', 'number', 'value.power');
        await mk('chargingManagement.control.activeDemandWallboxes', 'Active EVCS demand wallboxes', 'number', 'value');
        await mk('chargingManagement.control.gridEvcsActualForCapW', 'EVCS actual used for grid cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridEvcsReserveIgnoredForCapW', 'EVCS reserved ignored for grid cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.remainingW', 'Remaining (W)', 'number', 'value.power');
        await mk('chargingManagement.control.tsControlShadowJson', 'TypeScript EVCS-Control Shadow / Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsControlProductivePrepJson', 'TypeScript EVCS-Control Produktiv-Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsControlProductiveJson', 'TypeScript EVCS-Control produktiv (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsControlSource', 'TypeScript EVCS-Control source/prep state', 'string', 'text');
        await mk('chargingManagement.control.tsAllocationShadowJson', 'TypeScript EVCS-Allocation Shadow (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationProductivePrepJson', 'TypeScript EVCS-Allocation Produktiv-Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationProductiveJson', 'TypeScript EVCS-Allocation produktiv (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationNormalSourceJson', 'TypeScript EVCS-Allocation Normalquelle (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAllocationSource', 'TypeScript EVCS-Allocation source/prep state', 'string', 'text');
        await mk('chargingManagement.control.phaseSelectionJson', 'EVCS AC-Phasenwahl 1p/3p Auto-PV (JSON)', 'string', 'json');
        await mk('chargingManagement.control.phaseSelectionSource', 'EVCS AC-Phasenwahl source', 'string', 'text');
        await mk('chargingManagement.control.tsWritePlanShadowJson', 'TypeScript EVCS-Setpoint Write-Plan Shadow (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanProductivePrepJson', 'TypeScript EVCS-Setpoint Write-Plan Produktiv-Vorbereitung (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanProductiveJson', 'TypeScript EVCS-Setpoint Write-Plan produktiv (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanExecutorJson', 'TypeScript EVCS-Setpoint Write-Plan Executor-Diagnose (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsNormalSourceLockdownJson', 'TypeScript EVCS-Normalquelle Lockdown / JS-Abbau-Freigabe (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsNormalSourceJson', 'TypeScript EVCS-Normalquelle Lockdown / JS-Abbau-Freigabe (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsNormalSource', 'TypeScript EVCS-Normalquelle source/lockdown state', 'string', 'text');
        await mk('chargingManagement.control.tsRuntimeSource', 'TypeScript EVCS runtime source', 'string', 'text');
        await mk('chargingManagement.control.tsMigrationReady', 'TypeScript EVCS migration ready', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsEvcsJsRemovalJson', 'TypeScript EVCS JS-Entscheidungsbaum Abbau-Freigabe (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsEvcsJsRemovalReady', 'TypeScript EVCS JS decision-tree removal ready', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsAdapterRuntimeHandoverJson', 'TypeScript Adapter Runtime-Handover / generierte JS-Grenze (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsAdapterRuntimeSource', 'TypeScript Adapter runtime source', 'string', 'text');
        await mk('chargingManagement.control.tsAdapterMigrationReady', 'TypeScript Adapter migration ready', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsLegacyDecisionTreeJson', 'TypeScript EVCS Legacy-JS Executor/Fallback-Reduktion (JSON)', 'string', 'json');
        await mk('chargingManagement.control.tsWritePlanSource', 'TypeScript EVCS-Write-Plan source/prep state', 'string', 'text');
        await mk('chargingManagement.control.pausedByPeakShaving', 'Paused by peak shaving', 'boolean', 'indicator');
        await mk('chargingManagement.control.tsBudgetJson', 'TypeScript charging budget shadow JSON', 'string', 'json');
        await mk('chargingManagement.control.tsBudgetSource', 'TypeScript charging budget source', 'string', 'text');


        // MU6.8: Failsafe diagnostics (Stale Meter/Budget)
        await mk('chargingManagement.control.staleMeter', 'Meter stale (failsafe)', 'boolean', 'indicator');
        await mk('chargingManagement.control.staleBudget', 'Budget stale (failsafe)', 'boolean', 'indicator');
        await mk('chargingManagement.control.failsafeDetails', 'Failsafe details', 'string', 'text');
        await mk('chargingManagement.control.failsafePolicy', 'Failsafe policy (effective)', 'string', 'text');

        // Gate T: Tarif-Freigaben (für Transparenz)
        await mk('chargingManagement.control.gridChargeAllowed', 'Grid charge allowed (Tarif)', 'boolean', 'indicator');
        await mk('chargingManagement.control.dischargeAllowed', 'Discharge allowed (Tarif)', 'boolean', 'indicator');

        // Gate B: PV hysteresis diagnostics
        await mk('chargingManagement.control.pvCapRawW', 'PV surplus raw cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvCapEffectiveW', 'PV cap effective (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAvailable', 'PV available (hysteresis)', 'boolean', 'indicator');
        await mk('chargingManagement.control.pvAllocationMode', 'PV surplus allocation mode', 'string', 'text');
        await mk('chargingManagement.control.pvAllocationEvcsSharePct', 'PV surplus EVCS share (%)', 'number', 'value.percent');
        await mk('chargingManagement.control.pvAllocationEvcsCapW', 'PV surplus EVCS allocation cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAllocationUncappedW', 'PV surplus EVCS cap before allocation (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvAllocationStorageActualChargeW', 'Storage actual charge considered for PV allocation (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvActiveDemandReserveW', 'Actual PV share reserved by active EVCS demand (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvActiveDemandIntentW', 'PV intent reserved during EVCS ramp/telemetry lag (W)', 'number', 'value.power');

        // Debug: PV surplus without EVCS (instant + smoothed)
        // Used to verify sign conventions / smoothing for PV-only charging.
        await mk('chargingManagement.control.pvSurplusNoEvRawW', 'PV surplus (no EVCS) instant (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvSurplusNoEvAvg5mW', 'PV surplus (no EVCS) 5min avg (W)', 'number', 'value.power');

        // PV surplus calc internals: EVCS power used to reconstruct PV surplus without EVCS consumption
        // (helps diagnosing start/stop "hopping" when meters update delayed)
        await mk('chargingManagement.control.pvEvcsActualW', 'EVCS actual power sum (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvEvcsCmdW', 'EVCS last commanded power sum (W)', 'number', 'value.power');
        await mk('chargingManagement.control.pvEvcsUsedW', 'EVCS power used for PV surplus calc (W)', 'number', 'value.power');

        // Gate A: hard grid safety caps (transparency)
        await mk('chargingManagement.control.gridImportLimitW', 'Grid import limit (W) configured', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportLimitW_effective', 'Grid import limit (W) effective', 'number', 'value.power');
        await mk('chargingManagement.control.gridImportW', 'Grid power (W) (import + / export -)', 'number', 'value.power');
        await mk('chargingManagement.control.gridBaseLoadW', 'Estimated base load (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridBaseLoadRawW', 'Raw base load before clamp (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridLocalSupportW', 'Local PV/storage support for EVCS (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridCapEvcsW', 'Grid-based EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.gridCapBinding', 'Grid cap binding', 'boolean', 'indicator');
        await mk('chargingManagement.control.gridMaxPhaseA', 'Grid max phase current (A) configured', 'number', 'value.current');
        await mk('chargingManagement.control.gridWorstPhaseA', 'Grid worst phase current (A)', 'number', 'value.current');
        await mk('chargingManagement.control.gridPhaseCapEvcsW', 'Phase-based EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.phaseCapBinding', 'Phase cap binding', 'boolean', 'indicator');

        // Gate A2: §14a EnWG (optional)
        await mk('chargingManagement.control.para14aActive', '§14a active', 'boolean', 'indicator');
        await mk('chargingManagement.control.para14aMode', '§14a mode', 'string', 'text');
        await mk('chargingManagement.control.para14aCapEvcsW', '§14a EVCS cap (W)', 'number', 'value.power');
        await mk('chargingManagement.control.para14aBinding', '§14a binding', 'boolean', 'indicator');

        // Gate C: Speicher-Unterstützung (Transparenz)
        await mk('chargingManagement.control.storageAssistActive', 'Storage assist active', 'boolean', 'indicator');
        await mk('chargingManagement.control.storageAssistW', 'Storage assist (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageAssistSoCPct', 'Storage SoC (%)', 'number', 'value.percent');
        await mk('chargingManagement.control.storageProtectedLoadW', 'EVCS load protected from storage (W)', 'number', 'value.power');
        await mk('chargingManagement.control.storageProtectedWallboxes', 'EVCS wallboxes protected from storage', 'number', 'value');
        await mk('chargingManagement.control.storageProtectedLoadTs', 'EVCS storage-protection timestamp', 'number', 'value.time');
        await mk('chargingManagement.control.storageAssistRequestedLoadW', 'EVCS load allowed to use storage (W)', 'number', 'value.power');
        await this.adapter.setObjectNotExistsAsync('chargingManagement.debug', {
            type: 'channel',
            common: { name: 'Debug' },
            native: {},
        });

        await mk('chargingManagement.debug.lastRun', 'Last run', 'number', 'value.time');
        await mk('chargingManagement.debug.sortedOrder', 'Sorted order (safe keys)', 'string', 'text');
        await mk('chargingManagement.debug.allocations', 'Allocations (JSON)', 'string', 'text');
        await mk('chargingManagement.debug.tsRuntimePrepJson', 'Charging Management TS runtime preparation/shadow (JSON)', 'string', 'json');
    }

    /**
     * Code-Teil: Methode `_ensureWallboxChannel`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _ensureWallboxChannel
     * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureWallboxChannel(key) {
        const safe = toSafeIdPart(key);
        const ch = `chargingManagement.wallboxes.${safe}`;
        if (this._known.has(ch)) return ch;

        await this.adapter.setObjectNotExistsAsync('chargingManagement.wallboxes', {
            type: 'channel',
            common: { name: 'Ladepunkte' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: safe },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, write = false, extraCommon = null) => {
            const common = Object.assign({ name, type, role, read: true, write: !!write }, extraCommon || {});
            await this.adapter.setObjectNotExistsAsync(`${ch}.${id}`, {
                type: 'state',
                common,
                native: {},
            });
        };

        await mk('name', 'Name', 'string', 'text');
        // Enabled flags
        await mk('cfgEnabled', 'Config enabled', 'boolean', 'indicator');
        await mk('userEnabled', 'Regelung aktiv (User)', 'boolean', 'switch.enable', true, { def: true, states: { true: 'Aktiv', false: 'Aus' } });
        await mk('enabled', 'Enabled (effective)', 'boolean', 'indicator');
        await mk('online', 'Online', 'boolean', 'indicator');

        // Runtime, per-wallbox mode override (writable for VIS)
        // Values: auto | pv | minpv | boost
        await mk(
            'userMode',
            'User mode (auto|pv|minpv|boost)',
            'string',
            'text',
            true,
            {
                states: {
                    auto: 'auto (global)',
                    pv: 'pv surplus only',
                    minpv: 'min + pv',
                    boost: 'boost',
                },
            },
        );

        // Default value for the writable runtime state (do not overwrite user choice)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userMode`);
            if (!st || st.val === null || st.val === undefined || String(st.val).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userMode`, 'auto', true);
            }
        } catch {
            // ignore
        }

        // Runtime, per-wallbox AC phase mode override (writable for VIS/LIVE UI)
        // Values: fixed-1p | fixed-3p | auto-pv
        await mk(
            'userPhaseMode',
            'User AC phase mode (fixed-1p|fixed-3p|auto-pv)',
            'string',
            'text',
            true,
            {
                states: {
                    'fixed-1p': 'fest 1-phasig',
                    'fixed-3p': 'fest 3-phasig',
                    'auto-pv': 'auto PV 1p/3p',
                },
            },
        );

        // Default value for writable phase-mode state (do not overwrite user choice).
        // Keep it empty here because the config default is known only inside the runtime tick;
        // the tick initializes it once from the configured Ladepunkt-Phasenmodus.
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userPhaseMode`);
            if (!st || st.val === null || st.val === undefined) {
                await this.adapter.setStateAsync(`${ch}.userPhaseMode`, '', true);
            }
        } catch {
            // ignore
        }

        // Default value for userEnabled (writable)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userEnabled`, true, true);
            }
        } catch {
            // ignore
        }

        // Zeit-Ziel Laden (Depot-/Deadline-Laden) — optional und im Endkunden-UI steuerbar
        await mk('goalEnabled', 'Zeit-Ziel Laden aktiv (User)', 'boolean', 'switch.enable', true, { def: false, states: { true: 'An', false: 'Aus' } });
        await mk('goalTargetSocPct', 'Ziel-SoC (%)', 'number', 'value.percent', true, { def: 100, min: 0, max: 100, unit: '%' });
        await mk('goalFinishTs', 'Fertig bis (Zeitpunkt ms)', 'number', 'value.time', true, { def: 0 });
        await mk('goalBatteryKwh', 'Akkukapazität (kWh) (optional)', 'number', 'value', true, { def: 0, unit: 'kWh' });

        // Vehicle connection (derived from evcs.<index>.active when mapped via main.js)
        await mk('vehiclePlugged', 'Fahrzeug verbunden', 'boolean', 'indicator');
        await mk('vehiclePluggedSource', 'Fahrzeug verbunden (Quelle)', 'string', 'text');
        await mk('goalSocAvailable', 'Fahrzeug-SoC verfügbar', 'boolean', 'indicator');


        // Ziel-Laden: berechnete Werte (read-only)
        await mk('goalActive', 'Zeit-Ziel aktiv (berechnet)', 'boolean', 'indicator');
        await mk('goalRemainingMin', 'Restzeit (min)', 'number', 'value');
        await mk('goalRequiredPowerW', 'Benötigte Leistung (W)', 'number', 'value.power');
        await mk('goalDesiredPowerW', 'Ziel-Leistung (W)', 'number', 'value.power');
        await mk('goalShortfallW', 'Leistungsdefizit (W)', 'number', 'value.power');
        await mk('goalStatus', 'Zeit-Ziel Status', 'string', 'text');

        // Defaults for writable goal states (do not overwrite user choice)
        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.goalEnabled`, false, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalTargetSocPct`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalTargetSocPct`, 100, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalFinishTs`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalFinishTs`, 0, true);
            }
        } catch {
            // ignore
        }

        try {
            const st = await this.adapter.getStateAsync(`${ch}.goalBatteryKwh`);
            const cur = st ? Number(st.val) : NaN;
            if (!Number.isFinite(cur)) {
                await this.adapter.setStateAsync(`${ch}.goalBatteryKwh`, 0, true);
            }
        } catch {
            // ignore
        }

        await mk('effectiveMode', 'Effective mode', 'string', 'text');
        await mk('goalTariffOverride', 'Ziel: Tarif-Sperre übersteuert', 'boolean', 'indicator');
        await mk('goalTariffOverrideReason', 'Ziel: Tarif-Override Grund', 'string', 'text');
        await mk('priority', 'Priority', 'number', 'value');
        await mk('chargerType', 'Charger type', 'string', 'text');
        await mk('controlBasis', 'Control basis', 'string', 'text');
        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('connectorNo', 'Connector no.', 'number', 'value');
        await mk('stationMaxPowerW', 'Station max power (W)', 'number', 'value.power');
        await mk('stationRemainingW', 'Station remaining (W)', 'number', 'value.power');
        await mk('allowBoost', 'Boost allowed', 'boolean', 'indicator');
        await mk('boostActive', 'Boost active', 'boolean', 'indicator');
        await mk('boostSince', 'Boost since (ms)', 'number', 'value.time');
        await mk('boostUntil', 'Boost until (ms)', 'number', 'value.time');
        await mk('boostRemainingMin', 'Boost remaining (min)', 'number', 'value');
        await mk('boostTimeoutMin', 'Boost timeout (min) (effective)', 'number', 'value');
        await mk('phases', 'Phases', 'number', 'value');
        await mk('phaseMode', 'AC Phasenmodus effektiv (fixed-1p|fixed-3p|auto-pv)', 'string', 'text');
        await mk('phaseSwitchSupported', 'AC Phasenumschaltung unterstützt/zugeordnet', 'boolean', 'indicator');
        await mk('currentPhaseCount', 'Aktuelle AC-Phasen', 'number', 'value');
        await mk('targetPhaseCount', 'Ziel AC-Phasen', 'number', 'value');
        await mk('phaseSwitchState', 'Phasenumschaltung Status', 'string', 'text');
        await mk('phaseSwitchReason', 'Phasenumschaltung Grund', 'string', 'text');
        await mk('phaseCooldownRemainingMs', 'Phasenumschaltung Cooldown Rest (ms)', 'number', 'value.time');

        // Speicher-Mitnutzung pro Ladepunkt: Installer-Freigabe + Kundenwahl + effektive Regelentscheidung
        await mk('storageAssistCustomerAllowed', 'Speicher-Mitnutzung im Kunden-UI freigegeben', 'boolean', 'indicator');
        await mk('userStorageAssistEnabled', 'Speicher für Laden mitnutzen (User)', 'boolean', 'switch.enable', true, { def: false, states: { true: 'Mitnutzen', false: 'Schützen' } });
        await mk('effectiveStorageAssist', 'Speicher-Mitnutzung effektiv', 'boolean', 'indicator');
        await mk('storageAssistBlockedReason', 'Speicher-Mitnutzung Grund', 'string', 'text');
        await mk('batteryContributionW', 'Speicheranteil EVCS (W)', 'number', 'value.power');
        try {
            const st = await this.adapter.getStateAsync(`${ch}.userStorageAssistEnabled`);
            const cur = st ? st.val : null;
            if (cur === null || cur === undefined || String(cur).trim() === '') {
                await this.adapter.setStateAsync(`${ch}.userStorageAssistEnabled`, false, true);
            }
        } catch {
            // ignore
        }

        await mk('minPowerW', 'Min power (W)', 'number', 'value.power');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('para14aCapW', '§14a cap (W)', 'number', 'value.power');
        await mk('para14aCapped', '§14a cap aktiv', 'boolean', 'indicator');
        await mk('actualPowerW', 'Actual power (W)', 'number', 'value.power');
        await mk('actualCurrentA', 'Actual current (A)', 'number', 'value.current');
        await mk('charging', 'Charging', 'boolean', 'indicator');
        await mk('chargingSince', 'Charging since (ms)', 'number', 'value.time');
        await mk('chargingRaw', 'Charging raw (threshold)', 'boolean', 'indicator');
        await mk('lastActive', 'Last active (ms)', 'number', 'value.time');
        await mk('idleMs', 'Idle since last active (ms)', 'number', 'value.time');
        await mk('allocationRank', 'Allocation rank', 'number', 'value');
        await mk('targetCurrentA', 'Target current (A)', 'number', 'value.current');
        await mk('targetPowerW', 'Target power (W)', 'number', 'value.power');
        await mk('applied', 'Applied', 'boolean', 'indicator');
        await mk('applyStatus', 'Apply status', 'string', 'text');
        await mk('applyWrites', 'Apply writes (json)', 'string', 'text');
        await mk('reason', 'Reason', 'string', 'text');

        // Diagnostics
        await mk('mappingOk', 'Mapping OK', 'boolean', 'indicator');
        await mk('hasSetpoint', 'Has setpoint', 'boolean', 'indicator');
        await mk('mappingIssues', 'Mapping issues (json)', 'string', 'text');
        await mk('meterAgeMs', 'Meter age (ms)', 'number', 'value');
        await mk('meterStale', 'Meter stale', 'boolean', 'indicator');
        await mk('statusAgeMs', 'Status age (ms)', 'number', 'value');
        await mk('statusStale', 'Status stale', 'boolean', 'indicator');

        this._known.add(ch);
        return ch;
    }


    /**
     * Code-Teil: Methode `_ensureStationChannel`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _ensureStationChannel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureStationChannel(stationKey) {
        const safe = toSafeIdPart(stationKey);
        const ch = `chargingManagement.stations.${safe}`;
        if (this._knownStations.has(ch)) return ch;

        await this.adapter.setObjectNotExistsAsync('chargingManagement.stations', {
            type: 'channel',
            common: { name: 'Stations' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: safe || String(stationKey || '') || 'station' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mk
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(`${ch}.${id}`, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('stationKey', 'Station key', 'string', 'text');
        await mk('name', 'Name', 'string', 'text');
        await mk('maxPowerW', 'Max power (W)', 'number', 'value.power');
        await mk('remainingW', 'Remaining (W)', 'number', 'value.power');
        await mk('usedW', 'Used (W)', 'number', 'value.power');
        await mk('binding', 'Binding', 'boolean', 'indicator');
        await mk('headroomW', 'Headroom (W)', 'number', 'value.power');
        await mk('targetSumW', 'Target sum (W)', 'number', 'value.power');
        await mk('connectorCount', 'Connector count', 'number', 'value');
        await mk('boostConnectors', 'Boost connectors', 'number', 'value');
        await mk('pvLimitedConnectors', 'PV-limited connectors', 'number', 'value');
        await mk('connectors', 'Connectors (safe keys)', 'string', 'text');
        await mk('lastUpdate', 'Last update', 'number', 'value.time');

        this._knownStations.add(ch);
        return ch;
    }


    /**
     * Code-Teil: Methode `_getPeakShavingActive`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getPeakShavingActive
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _getPeakShavingActive() {
        // Prefer centralized snapshot (Phase 4.0)
        try {
            const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
            if (caps && caps.peak && typeof caps.peak.active === 'boolean') {
                return caps.peak.active;
            }
        } catch {
            // ignore
        }
        try {
            const st = await this.adapter.getStateAsync('peakShaving.control.active');
            return st ? !!st.val : false;
        } catch {
            return false;
        }
    }

    /**
     * Code-Teil: Methode `_getPeakShavingBudgetW`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getPeakShavingBudgetW
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _getPeakShavingBudgetW() {
        // Prefer centralized snapshot (Phase 4.0)
        try {
            const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
            if (caps && caps.peak && typeof caps.peak.budgetW === 'number' && Number.isFinite(caps.peak.budgetW)) {
                return caps.peak.budgetW;
            }
        } catch {
            // ignore
        }
        try {
            const st = await this.adapter.getStateAsync('peakShaving.dynamic.availableForControlledW');
            const n = st ? Number(st.val) : NaN;
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /**
     * Code-Teil: _runChargingBudgetTsProductive
     *
     * Zweck:
     * Berechnet die sicherheitsrelevanten EVCS-/Charging-Budget-Caps über TypeScript
     * und übernimmt sie produktiv, wenn der JS/TS-Vergleich sauber ist.
     *
     * Zusammenhang:
     * Dieser Schritt übernimmt nur Grid-Cap, Phasen-Cap, §14a-Cap und den effektiven
     * Budgetmodus. Ladepunktverteilung, PV-/Min+PV-Logik und Setpoint-Schreiben bleiben
     * weiterhin JavaScript.
     *
     * Sicherheitsregel:
     * Wenn TypeScript fehlt, Fehler wirft oder vom JavaScript-Referenzwert abweicht,
     * bleibt der bestehende JavaScript-Wert produktiv. `tsBudgetJson` speichert den
     * Fallback-Grund für Debug und App-Center.
     */
    async _runChargingBudgetTsProductive(input, jsRuntime) {
        let payload = null;
        try {
            if (!chargingBudgetTsMirror || typeof chargingBudgetTsMirror.buildChargingBudgetProductiveDecision !== 'function') {
                payload = {
                    source: 'ts-charging-budget-productive-v1',
                    available: false,
                    ok: false,
                    productive: false,
                    fallback: true,
                    fallbackReason: 'missing-ts-mirror',
                    shadow: { source: 'ts-charging-budget-shadow-v1', available: false, ok: false, mismatchCount: 0, mismatches: [], ts: null },
                };
            } else {
                payload = chargingBudgetTsMirror.buildChargingBudgetProductiveDecision(jsRuntime || {}, input || {});
            }
        } catch (e) {
            payload = {
                source: 'ts-charging-budget-productive-v1',
                available: false,
                ok: false,
                productive: false,
                fallback: true,
                fallbackReason: 'ts-runtime-error',
                error: e && e.message ? e.message : String(e),
                shadow: { source: 'ts-charging-budget-shadow-v1', available: false, ok: false, mismatchCount: 0, mismatches: [], ts: null },
            };
        }
        this._chargingBudgetTsProductiveLast = payload;
        try {
            await this._queueState('chargingManagement.control.tsBudgetJson', JSON.stringify(payload || {}), true);
            await this._queueState('chargingManagement.control.tsBudgetSource', payload && payload.productive ? 'ts-budget-caps' : 'js-runtime', true);
        } catch (_e) {
            // Diagnose darf die produktive Ladepunktregelung nicht stören.
        }
        return payload;
    }

    /**
     * Code-Teil: _runChargingBudgetTsShadow
     * Zweck: Kompatibilitäts-Wrapper für ältere interne Aufrufe. Neue Runtime nutzt
     * `_runChargingBudgetTsProductive`, der bei sauberem Vergleich TS produktiv macht.
     */
    async _runChargingBudgetTsShadow(input, jsRuntime) {
        return this._runChargingBudgetTsProductive(input, jsRuntime);
    }

    /**
     * Step 2.2.1:
     * - Mixed AC/DC operation via per-wallbox chargerType + controlBasis
     * - Budget distribution in W (supports DC fast chargers up to 1000 kW and beyond)
     */
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
        if (!this._isEnabled()) return;

        const cfg = this.adapter.config.chargingManagement || {};
        // Alte Gateway-EVCS-vor-Speicher-Priorität deaktiviert.
        // Der Hybrid-/Gateway-Priorität-Haken steuert ab 0.6.255 ausschließlich die
        // Speicher-Sonderpolicy (Gateway-No-Write / Zusatz-PV-Laden / Low-PV-Regelung).
        // Standard-/Farm-/Wallbox-Verhalten bleibt dadurch unverändert.
        const feneconEvPriorityActive = false;

        // NOTE:
        // "off" is not intended to be a user-facing operating mode. On/Off is handled
        // via the App-Center toggle (adapter.config.enableChargingManagement).
        // If we still get "off" here while at least one setpoint is mapped, fall back
        // to "mixed" so Boost/Auto behave as expected.
        let mode = String(cfg.mode || 'off'); // pvSurplus | mixed
        try {
            const hasAnySetpoint = !!(this.adapter && this.adapter.config && this.adapter.config._chargingHasAnySetpoint);
            const cmEnabled = (this.adapter && this.adapter.config && this.adapter.config.enableChargingManagement !== false);
            if (mode === 'off' && cmEnabled && hasAnySetpoint) {
                mode = 'mixed';
            }
        } catch (_e) {}
        const wallboxes = Array.isArray(cfg.wallboxes) ? cfg.wallboxes : [];

        // Ziel‑Laden: "standard" = gleichmäßige Ø‑Leistung, "smart" = nutzt Tarif‑Freigaben (wenn vorhanden)
        // und kann Sperren bei knappen Deadlines automatisch aufheben.
        const goalStrategy = (String(cfg.goalStrategy || 'standard').trim().toLowerCase() === 'smart') ? 'smart' : 'standard';

        // Priorisierung / Tarif‑Bonus (Ziel‑Laden):
        // Zeit‑Ziel Laden muss (wenn möglich) die Deadline erreichen – auch wenn ein dynamischer Tarif
        // das Netzladen gerade sperrt. Gleichzeitig soll der Tarif als Optimierungs‑Bonus wirken:
        // wir laden bevorzugt in günstigen Fenstern und heben die Sperre nur dann auf, wenn es sonst
        // nicht bis zur Deadline reicht (Forecast/Latest‑Start).
        //
        // Policy:
        // - goalTariffOverrideMode = 'forecast' (default): Tarif wirkt; Override nur wenn nötig
        // - goalTariffOverrideMode = 'always': Ziel übersteuert Tarif immer (Legacy)
        // - goalTariffOverrideMode = 'never' : Ziel respektiert Tarif immer (kann Deadline verfehlen)
        //
        // Backwards compat: legacy boolean `goalTariffOverrideAlways`:
        //   true  -> 'always'
        //   false -> 'forecast'
        const goalTariffOverrideModeRaw = String(cfg.goalTariffOverrideMode || '').trim().toLowerCase();
        let goalTariffOverrideMode = (goalTariffOverrideModeRaw === 'always' || goalTariffOverrideModeRaw === 'forecast' || goalTariffOverrideModeRaw === 'never')
            ? goalTariffOverrideModeRaw
            : 'forecast';
        if (cfg.goalTariffOverrideAlways === true) goalTariffOverrideMode = 'always';
        if (cfg.goalTariffOverrideAlways === false) goalTariffOverrideMode = 'forecast';

        // Forecast/Notfall‑Parameter (konservative Defaults; optional über Installer konfigurierbar)
        const goalForecastSafetyFactor = clamp(num(cfg.goalForecastSafetyFactor, 1.10), 1, 2);
        const goalForecastReserveMin = clamp(num(cfg.goalForecastReserveMin, 10), 0, 24 * 60);
        const goalForecastMinCoverage = clamp(num(cfg.goalForecastMinCoverage, 0.75), 0, 1);

        // When a vehicle is plugged in, some EVs/wallboxes update SoC with a delay.
        // We wait briefly for a fresh SoC update (if the stored SoC timestamp predates plug-in) and then
        // fall back to "no-SoC" planning. Keep this short so Zielladen remains responsive on systems
        // that do not provide a real SoC at all (often reporting a static 0%).
        const goalSocWaitFallbackSec = clamp(num(cfg.goalSocWaitFallbackSec, 30), 0, 15 * 60);

        // Smart‑Parameter (Optimierung)
        const goalCheapBoostFactor = clamp(num(cfg.goalCheapBoostFactor, 1.25), 1, 3);
        const goalCheapPriceFactor = clamp(num(cfg.goalCheapPriceFactor, 0.90), 0.1, 2);

        // Legacy Fallback‑Schwellen (wenn kein Forecast verfügbar ist)
        const goalTariffOverrideUrgency = clamp(num(cfg.goalTariffOverrideUrgency, 0.70), 0, 1);
        const goalTariffOverrideMinRemainingMin = clamp(num(cfg.goalTariffOverrideMinRemainingMin, 60), 0, 7 * 24 * 60);

        // -----------------------------------------------------------------
        // §14a EnWG snapshot (provided by Para14aModule)
        // -----------------------------------------------------------------
        const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
        const para14aActive = !!(p14a && p14a.active);
        const para14aMode = para14aActive ? String(p14a.mode || '') : '';
        const para14aCapsBySafe = (para14aActive && p14a && p14a.evcsCapsBySafe && typeof p14a.evcsCapsBySafe === 'object') ? p14a.evcsCapsBySafe : {};
        const para14aTotalCapW = (para14aActive && p14a && typeof p14a.evcsTotalCapW === 'number' && Number.isFinite(p14a.evcsTotalCapW) && p14a.evcsTotalCapW > 0)
            ? p14a.evcsTotalCapW
            : null;

        // Stationsgruppen (optional): gemeinsame Leistungsgrenze pro Station (z. B. DC‑Station mit mehreren Ladepunkten)
        // Hinweis: Stationsgruppen werden im Installer-UI unter settingsConfig gepflegt.
        // Für maximale Robustheit akzeptieren wir beides:
        // - chargingManagement.stationGroups (direktes Modul-Config)
        // - settingsConfig.stationGroups (Installer/EVCS-Konfiguration)
        let stationGroups = Array.isArray(cfg.stationGroups) ? cfg.stationGroups : [];
        if (!stationGroups || !stationGroups.length) {
            const sc = (this.adapter && this.adapter.config && this.adapter.config.settingsConfig && typeof this.adapter.config.settingsConfig === 'object')
                ? this.adapter.config.settingsConfig
                : null;
            if (sc && Array.isArray(sc.stationGroups)) stationGroups = sc.stationGroups;
        }
        if (!stationGroups || !stationGroups.length) {
            if (this.adapter && Array.isArray(this.adapter.stationGroups)) stationGroups = this.adapter.stationGroups;
        }
        /** @type {Map<string, number>} */
        const stationCapByKey = new Map();
        /** @type {Map<string, string>} */
        const stationNameByKey = new Map();
        for (const g of stationGroups) {
            if (!g) continue;
            const sk = String(g.stationKey || '').trim();
            if (!sk) continue;
            const sName = (typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : '';
            if (sName) stationNameByKey.set(sk, sName);

            // Allow config in W (maxPowerW) or kW (maxPowerKw)
            let capW = null;
            if (g.maxPowerW !== undefined && g.maxPowerW !== null && String(g.maxPowerW).trim() !== '' && Number.isFinite(Number(g.maxPowerW))) {
                capW = Number(g.maxPowerW);
            } else if (g.maxPowerKw !== undefined && g.maxPowerKw !== null && String(g.maxPowerKw).trim() !== '' && Number.isFinite(Number(g.maxPowerKw))) {
                capW = Number(g.maxPowerKw) * 1000;
            }
            capW = clamp(num(capW, null), 0, 1e12);

            if (!Number.isFinite(capW) || capW <= 0) continue;

            const prev = stationCapByKey.get(sk);
            stationCapByKey.set(sk, (typeof prev === 'number' && Number.isFinite(prev)) ? Math.min(prev, capW) : capW);
        }

        const voltageV = clamp(num(cfg.voltageV, 230), 50, 400);
        const defaultPhases = Number(cfg.defaultPhases || 3) === 1 ? 1 : 3;
        const defaultMinA = clamp(num(cfg.minCurrentA, 6), 0, 2000);
        const defaultMaxA = clamp(num(cfg.maxCurrentA, 16), 0, 2000);

        const acMinPower3pW = clamp(num(cfg.acMinPower3pW, 4200), 0, 1e12);
        const phaseAutoEnabled = cfg.phaseAutoEnabled !== false;
        const phaseSwitchUpThresholdW = clamp(num(cfg.phaseSwitchUpThresholdW, 4800), 0, 1e12);
        const phaseSwitchDownThresholdW = clamp(num(cfg.phaseSwitchDownThresholdW, 3700), 0, 1e12);
        const phaseSwitchUpStableMs = clamp(num(cfg.phaseSwitchUpStableSec, 300), 0, 86400) * 1000;
        const phaseSwitchDownStableMs = clamp(num(cfg.phaseSwitchDownStableSec, 120), 0, 86400) * 1000;
        const phaseSwitchCooldownMs = clamp(num(cfg.phaseSwitchCooldownSec, 900), 0, 86400) * 1000;
        const phaseSwitchSettleMs = clamp(num(cfg.phaseSwitchSettleSec, 30), 0, 3600) * 1000;
        const phaseSwitchSafePowerW = clamp(num(cfg.phaseSwitchSafePowerW, 150), 0, 10000);
        const activityThresholdW = clamp(num(cfg.activityThresholdW, 200), 0, 1e12);
        const stopGraceSec = clamp(num(cfg.stopGraceSec, 30), 0, 3600);
        const sessionKeepSec = clamp(num(cfg.sessionKeepSec, 300), 0, 86400);
        const stopGraceMs = stopGraceSec * 1000;
        const sessionKeepMs = Math.max(sessionKeepSec, stopGraceSec) * 1000;
        const sessionCleanupStaleMs = Math.max(sessionKeepMs * 2, 30 * 60 * 1000); // avoid memory leaks for removed wallboxes

        // Boost timeouts (minutes). Default: DC=60 (1h), AC=300 (5h). Set to 0 to disable auto-timeout.
        const boostTimeoutMinAc = clamp(num(cfg.boostTimeoutMinAc, 300), 0, 1000000);
        const boostTimeoutMinDc = clamp(num(cfg.boostTimeoutMinDc, 60), 0, 1000000);
        // Budget selection
        const budgetMode = String(cfg.totalBudgetMode || 'unlimited'); // unlimited | static | fromPeakShaving | fromDatapoint
        const staticBudgetW = clamp(num(cfg.staticMaxChargingPowerW, 0), 0, 1e12);
        const budgetPowerId = String(cfg.budgetPowerId || '').trim();
        // Optional: provide grid power / PV surplus as explicit datapoints (avoids global Datapoints tab)
        const gridPowerId = String(cfg.gridPowerId || '').trim();
        const pvSurplusPowerId = String(cfg.pvSurplusPowerId || '').trim();
        const pauseWhenPeakShavingActive = cfg.pauseWhenPeakShavingActive !== false; // default true
        const pauseBehavior = String(cfg.pauseBehavior || 'followPeakBudget'); // rampDownToZero | followPeakBudget

        // MU6.8: stale detection (failsafe)
        // IMPORTANT:
        // Many real-world grid meters/aliases update slowly or only on change.
        // A too aggressive default triggers false "failsafe stale meter".
        // The embedded engine sets 300s as its safe default; keep module fallback consistent.
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 300), 1, 3600);
        const staleTimeoutMs = staleTimeoutSec * 1000;

        // Smart‑Ziel: Preis‑Signal (optional). Wird nur genutzt, wenn entsprechende Datapoints vorhanden sind.
        // Hinweis: Das Preis‑Signal ist ein reines Optimierungssignal; bei fehlenden Preisen bleibt die Strategie funktionsfähig.
        let priceCurrent = null;
        let priceAverage = null;
        let isCheapNow = false;
        if (goalStrategy === 'smart' && this.dp) {
            const pc = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh('priceCurrent', staleTimeoutMs, null) : this.dp.getNumber('priceCurrent', null);
            const pa = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh('priceAverage', staleTimeoutMs, null) : this.dp.getNumber('priceAverage', null);
            priceCurrent = (typeof pc === 'number' && Number.isFinite(pc)) ? pc : null;
            priceAverage = (typeof pa === 'number' && Number.isFinite(pa) && pa > 0) ? pa : null;
            if (priceCurrent !== null && priceAverage !== null) {
                isCheapNow = priceCurrent <= (priceAverage * goalCheapPriceFactor);
            }
        }

        // MU6.8b: separate stale thresholds for wallbox signals.
        // Many devices update "event-driven" (e.g. power stays 0 for long), so treating them as stale after
        // the global failsafe timeout would disable control incorrectly.
        // - wallboxMeterStaleTimeoutSec: diagnostics only (does NOT disable control), default 300s
        // - wallboxStatusStaleTimeoutSec: diagnostics only, default 86400s (24h)
        const wbMeterStaleTimeoutSec = clamp(num(cfg.wallboxMeterStaleTimeoutSec, 300), 5, 86400);
        const wbStatusStaleTimeoutSec = clamp(num(cfg.wallboxStatusStaleTimeoutSec, 86400), 5, 86400);
        const wbMeterStaleTimeoutMs = wbMeterStaleTimeoutSec * 1000;
        const wbStatusStaleTimeoutMs = wbStatusStaleTimeoutSec * 1000;


        // MU6.11: ramp limiting + setpoint step (anti-flutter, but keep safety by never limiting ramp-down)
        const maxDeltaWPerTick = clamp(num(cfg.maxDeltaWPerTick, 0), 0, 1e12); // 0 = unlimited
        const maxDeltaAPerTick = clamp(num(cfg.maxDeltaAPerTick, 0), 0, 1e6); // 0 = unlimited
        const stepW = clamp(num(cfg.stepW, 0), 0, 1e12); // 0 = no stepping
        const stepA = clamp(num(cfg.stepA, 0.1), 0, 1e6); // 0 = no stepping

        // PV-only Start / Ramp / Stop profile:
        // - require a stable 3-phase capable start budget before enabling charging
        // - start at the technical minimum (6 A / ~4.2 kW three-phase) and ramp up softly
        // - keep a short minimum run / stop debounce so slow wallboxes & vehicles do not flap
        const pvStartStableMs = clamp(num(cfg.pvStartStableSec, 10), 0, 3600) * 1000;
        const pvConnectorStopDelayMs = clamp(num(cfg.pvConnectorStopDelaySec, Math.max(num(cfg.pvStopDelaySec, 30), 45)), 0, 3600) * 1000;
        const pvMinRunMs = clamp(num(cfg.pvMinRunSec, 45), 0, 3600) * 1000;
        const pvRunDeficitToleranceW = clamp(num(cfg.pvRunDeficitToleranceW, 600), 0, 1e12);
        const pvStartRetryCooldownMs = clamp(num(cfg.pvStartRetryCooldownSec, num(cfg.pvRestartCooldownSec, 180)), 0, 3600) * 1000;
        const pvRampUpAperTick = clamp(num(cfg.pvRampUpAperTick, 0.5), 0, 1e6);
        const pvRampUpWPerTick = clamp(num(cfg.pvRampUpWPerTick, 350), 0, 1e12);

        if (budgetPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.budgetPowerW', objectId: budgetPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (gridPowerId && this.dp) {
            // IMPORTANT: enable alive-prefix heartbeat for grid metering. Many meters/adapters are event-driven
            // and do not update state.ts while the measurement stays stable.
            await this.dp.upsert({ key: 'cm.gridPowerW', objectId: gridPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        }
        if (pvSurplusPowerId && this.dp) {
            await this.dp.upsert({ key: 'cm.pvSurplusW', objectId: pvSurplusPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }

        // Gate A: reuse PeakShaving meter phase currents (if configured) as optional hard safety caps.
        // This allows phase protection even when PeakShaving module is disabled.
        const psCfgForPhase = (this.adapter && this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
        if (this.dp && psCfgForPhase) {
            if (psCfgForPhase.l1CurrentId) await this.dp.upsert({ key: 'ps.l1A', objectId: String(psCfgForPhase.l1CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
            if (psCfgForPhase.l2CurrentId) await this.dp.upsert({ key: 'ps.l2A', objectId: String(psCfgForPhase.l2CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
            if (psCfgForPhase.l3CurrentId) await this.dp.upsert({ key: 'ps.l3A', objectId: String(psCfgForPhase.l3CurrentId).trim(), dataType: 'number', direction: 'in', unit: 'A' });
        }

        // Measurements and object mapping
        let totalPowerW = 0;
        // 0.8.61: Gate-A Netzbudget muss mit frischen realen Ladepunkt-Messwerten rechnen.
        // `totalPowerW` kann wegen Setpoint-Fallbacks bewusst weiter als Reservierung/Regelwert
        // dienen. Für die Netzanschluss-Grenze darf ein alter Ladepunkt-Setpoint aber nicht als
        // aktueller Verbrauch vom Netzanschluss abgezogen werden, sonst entsteht ein zu hoher
        // EVCS-Cap (z.B. 40 kW Anschluss + stale 10.9 kW = falsch 50.9 kW).
        let totalFreshActualPowerW = 0;
        let totalStaleActualIgnoredForGridW = 0;
        let totalCurrentA = 0;
        let onlineCount = 0;

        /** @type {Array<any>} */
        const wbList = [];

        const now = Date.now();
        await this._queueState('chargingManagement.debug.lastRun', now, true);
        await this._queueState('chargingManagement.debug.sortedOrder', '', true);
        await this._queueState('chargingManagement.debug.allocations', '[]', true);

        /**
         * Code-Teil: Arrow-Funktion `publishEvPriorityCaps`
         * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: publishEvPriorityCaps
         * Zweck: Veröffentlicht berechnete Werte als State/API-Snapshot.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const publishEvPriorityCaps = (patch) => {
            try {
                const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : {};
                const prev = (caps && caps.evPriority && typeof caps.evPriority === 'object') ? caps.evPriority : {};
                this.adapter._emsCaps = Object.assign({}, caps, {
                    evPriority: Object.assign({}, prev, patch || {}, { ts: now }),
                });
            } catch {
                // ignore
            }
        };

        // Reset the shared EV-priority snapshot on every tick so Storage-Control never sees stale flags
        // when Charging-Management is off or returns early in this cycle.
        publishEvPriorityCaps({
            active: false,
            blockStorageCharge: false,
            requestedCount: 0,
            limitedWallboxes: 0,
            starvedW: 0,
            pendingW: 0,
            storageYieldW: 0,
            storageSource: '',
        });

        // Speicher-Schutz fuer EVCS/Wallbox:
        // Wenn der Kunde am Ladepunkt "Speicher schuetzen" gewaehlt hat oder der
        // Installateur die Speicher-Mitnutzung nicht freigegeben hat, darf die
        // Speicher-Eigenverbrauchsoptimierung den NVP-Import dieser Wallbox nicht
        // wegregeln. Die Speicherregelung liest diese Summe herstellerneutral und
        // verschiebt ihr NVP-Ziel um diese Leistung nach oben. So funktioniert der
        // Schutz auch bei Herstellern wie E3/DC, die nicht ueber einen signed-DP,
        // sondern ueber SET_POWER_MODE/SET_POWER_VALUE geschrieben werden.
        let storageProtectedLoadW = 0;
        let storageProtectedWallboxes = 0;
        let storageAssistRequestedLoadW = 0;
        for (let wbIndex = 0; wbIndex < wallboxes.length; wbIndex++) {
            const wb = wallboxes[wbIndex];
            const key = String(wb.key || '').trim();
            if (!key) continue;

            const safe = toSafeIdPart(key);
            const ch = await this._ensureWallboxChannel(key);

            // Serienreife/Robustheit: restore persisted runtime timers after adapter restart.
            // This keeps Boost timeouts + "first-started" charging order stable across restarts.
            if (!this._restoredRuntime.has(safe)) {
                try {
                    const cs = await this._getStateCached(`${ch}.chargingSince`);
                    const csVal = cs ? Number(cs.val) : 0;
                    if (Number.isFinite(csVal) && csVal > 0) this._chargingSinceMs.set(safe, csVal);
                } catch {
                    // ignore
                }
                try {
                    const bs = await this._getStateCached(`${ch}.boostSince`);
                    const bsVal = bs ? Number(bs.val) : 0;
                    if (Number.isFinite(bsVal) && bsVal > 0) this._boostSinceMs.set(safe, bsVal);
                } catch {
                    // ignore
                }
                this._restoredRuntime.add(safe);
            }

            // Runtime mode override (writable state, used by VIS)
            // If the runtime state is empty, initialize it ONCE from config default (userModeDefault).
            let userMode = 'auto';
            try {
                const st = await this._getStateCached(`${ch}.userMode`);
                const cur = st ? st.val : null;
                const def = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');

                if (cur === null || cur === undefined || String(cur).trim() === '') {
                    try {
                        await this._queueState(`${ch}.userMode`, def, true);
                    } catch {
                        // ignore
                    }
                    userMode = def;
                } else {
                    userMode = normalizeWallboxModeOverride(cur);
                }
            } catch {
                userMode = normalizeWallboxModeOverride(wb.userModeDefault || wb.userMode || 'auto');
            }

            const cfgEnabled = wb.enabled !== false;

            // Runtime: end-customer can disable EMS regulation per charge point
            let userEnabled = true;
            try {
                const stEn = await this._getStateCached(`${ch}.userEnabled`);
                const curEn = stEn ? stEn.val : null;
                if (curEn === null || curEn === undefined || String(curEn).trim() === '') {
                    try { await this._queueState(`${ch}.userEnabled`, true, true); } catch { /* ignore */ }
                    userEnabled = true;
                } else {
                    userEnabled = !!curEn;
                }
            } catch {
                userEnabled = true;
            }

            const enabled = cfgEnabled && userEnabled;


            // Ladepunkt-Metadaten (Stationsgruppe / Connector)
            const stationKey = String(wb.stationKey || '').trim();
            const connectorNo = clamp(num(wb.connectorNo, 0), 0, 9999);
            const allowBoost = wb.allowBoost !== false;

            // Optional per-wallbox boost timeout override (minutes). 0/empty = use global default by chargerType
            const boostTimeoutMinOverride = clamp(num(wb.boostTimeoutMin, null), 0, 1000000);

            const stationMaxPowerW = (stationKey && stationCapByKey.has(stationKey))
                ? stationCapByKey.get(stationKey)
                : clamp(num(wb.stationMaxPowerW, null), 0, 1e12);
            const priority = clamp(num(wb.priority, 999), 1, 999);
            const chargerType = normalizeChargerType(wb.chargerType);
            const controlBasisCfg = normalizeControlBasis(wb.controlBasis);

            // For AC: phases/current bounds apply. For DC: phases are informational; distribution is watt-based.
            const phases = Number(wb.phases || defaultPhases) === 1 ? 1 : 3;
            const normalizePhaseModeRuntime = (value, fallbackPhases) => {
                const raw = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
                if (raw === 'autopv' || raw === 'pvauto' || raw === 'auto13' || raw === 'auto1p3p' || raw === 'auto') return 'auto-pv';
                if (raw === 'fixed1p' || raw === '1p' || raw === 'onephase' || raw === 'fixed1') return 'fixed-1p';
                if (raw === 'fixed3p' || raw === '3p' || raw === 'threephase' || raw === 'fixed3') return 'fixed-3p';
                return Number(fallbackPhases) === 1 ? 'fixed-1p' : 'fixed-3p';
            };
            let userPhaseMode = normalizePhaseModeRuntime(wb.userPhaseMode || wb.phaseMode, phases);
            try {
                const stPhase = await this._getStateCached(`${ch}.userPhaseMode`);
                const curPhase = stPhase ? stPhase.val : null;
                const defPhase = normalizePhaseModeRuntime(wb.phaseMode, phases);
                if (curPhase === null || curPhase === undefined || String(curPhase).trim() === '') {
                    try { await this._queueState(`${ch}.userPhaseMode`, defPhase, true); } catch { /* ignore */ }
                    userPhaseMode = defPhase;
                } else {
                    userPhaseMode = normalizePhaseModeRuntime(curPhase, phases);
                }
            } catch {
                userPhaseMode = normalizePhaseModeRuntime(wb.userPhaseMode || wb.phaseMode, phases);
            }
            const phaseMode = chargerType === 'AC' ? userPhaseMode : 'fixed-1p';
            const phaseSwitchId = String(wb.phaseSwitchId || wb.phaseSwitchKey || wb.phaseModeWriteId || '').trim();
            const phaseFeedbackId = String(wb.phaseFeedbackId || wb.phaseFeedbackKey || wb.phaseModeReadId || '').trim();
            const phaseSwitchValue1p = (wb.phaseSwitchValue1p !== undefined && wb.phaseSwitchValue1p !== null && String(wb.phaseSwitchValue1p).trim() !== '') ? wb.phaseSwitchValue1p : 1;
            const phaseSwitchValue3p = (wb.phaseSwitchValue3p !== undefined && wb.phaseSwitchValue3p !== null && String(wb.phaseSwitchValue3p).trim() !== '') ? wb.phaseSwitchValue3p : 3;
            const stopBeforePhaseSwitch = wb.stopBeforePhaseSwitch !== false;
            const wbPhaseSwitchUpThresholdW = clamp(num(wb.phaseSwitchUpThresholdW, phaseSwitchUpThresholdW), 0, 1e12);
            const wbPhaseSwitchDownThresholdW = clamp(num(wb.phaseSwitchDownThresholdW, phaseSwitchDownThresholdW), 0, 1e12);
            const wbPhaseSwitchUpStableMs = clamp(num(wb.phaseSwitchUpStableSec, phaseSwitchUpStableMs / 1000), 0, 86400) * 1000;
            const wbPhaseSwitchDownStableMs = clamp(num(wb.phaseSwitchDownStableSec, phaseSwitchDownStableMs / 1000), 0, 86400) * 1000;
            const wbPhaseSwitchCooldownMs = clamp(num(wb.phaseSwitchCooldownSec, phaseSwitchCooldownMs / 1000), 0, 86400) * 1000;
            const wbPhaseSwitchSettleMs = clamp(num(wb.phaseSwitchSettleSec, phaseSwitchSettleMs / 1000), 0, 3600) * 1000;

            const storageAssistCustomerAllowed = wb.storageAssistCustomerAllowed === true;
            let userStorageAssistEnabled = false;
            try {
                const stStorage = await this._getStateCached(`${ch}.userStorageAssistEnabled`);
                const curStorage = stStorage ? stStorage.val : null;
                if (curStorage === null || curStorage === undefined || String(curStorage).trim() === '') {
                    try { await this._queueState(`${ch}.userStorageAssistEnabled`, false, true); } catch { /* ignore */ }
                    userStorageAssistEnabled = false;
                } else {
                    userStorageAssistEnabled = curStorage === true || String(curStorage).trim().toLowerCase() === 'true' || String(curStorage).trim() === '1';
                }
            } catch {
                userStorageAssistEnabled = false;
            }
            const storageAssistRequested = !!(storageAssistCustomerAllowed && userStorageAssistEnabled);
            try {
                await this._queueState(`${ch}.storageAssistCustomerAllowed`, !!storageAssistCustomerAllowed, true);
                if (!storageAssistCustomerAllowed && userStorageAssistEnabled) {
                    await this._queueState(`${ch}.userStorageAssistEnabled`, false, true);
                    userStorageAssistEnabled = false;
                }
            } catch {
                // ignore
            }

            let minA = clamp(num(wb.minA, defaultMinA), 0, 2000);
            const maxA = clamp(num(wb.maxA, defaultMaxA), 0, 2000);

            const minPowerWCfg = clamp(num(wb.minPowerW, null), 0, 1e12);
            const maxPowerWCfg = clamp(num(wb.maxPowerW, null), 0, 1e12);

            // Track whether the installer/user explicitly configured local caps (useful for diagnostics/reasons)
            const userLimitSet = (
                (wb && wb.maxA !== undefined && wb.maxA !== null && String(wb.maxA).trim() !== '' && Number.isFinite(Number(wb.maxA)) && Number(wb.maxA) > 0)
                || (wb && wb.maxPowerW !== undefined && wb.maxPowerW !== null && String(wb.maxPowerW).trim() !== '' && Number.isFinite(Number(wb.maxPowerW)) && Number(wb.maxPowerW) > 0)
                || (wb && wb.stationMaxPowerW !== undefined && wb.stationMaxPowerW !== null && String(wb.stationMaxPowerW).trim() !== '' && Number.isFinite(Number(wb.stationMaxPowerW)) && Number(wb.stationMaxPowerW) > 0)
            );

            // datapoint IDs
            const actualPowerWId = String(wb.actualPowerWId || '').trim();
            const actualCurrentAId = String(wb.actualCurrentAId || '').trim();
            const setCurrentAId = String(wb.setCurrentAId || '').trim();
            const setPowerWId = String(wb.setPowerWId || '').trim();
            const enableId = String(wb.enableId || '').trim();
            const onlineId = String(wb.onlineId || '').trim();
            const statusId = String(wb.statusId || '').trim();

            // phase measurement IDs (optional)
            const l1Id = String(wb.phaseL1AId || '').trim();
            const l2Id = String(wb.phaseL2AId || '').trim();
            const l3Id = String(wb.phaseL3AId || '').trim();

            // Register dp mappings
            if (this.dp) {
                if (actualPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.pW`, objectId: actualPowerWId, dataType: 'number', direction: 'in', unit: 'W' });
                if (actualCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.iA`, objectId: actualCurrentAId, dataType: 'number', direction: 'in', unit: 'A' });
                // Some EVCS/OCPP stacks expire control setpoints after ~60s unless refreshed.
                // Periodically re-apply the setpoint even if unchanged to prevent charge stop/start loops.
                if (setCurrentAId) await this.dp.upsert({ key: `cm.wb.${safe}.setA`, objectId: setCurrentAId, dataType: 'number', direction: 'out', unit: 'A', deadband: 0.1, maxWriteIntervalMs: 45000 });
                if (setPowerWId) await this.dp.upsert({ key: `cm.wb.${safe}.setW`, objectId: setPowerWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25, maxWriteIntervalMs: 45000 });
                if (enableId) await this.dp.upsert({ key: `cm.wb.${safe}.en`, objectId: enableId, dataType: 'boolean', direction: 'out' });
                if (onlineId) await this.dp.upsert({ key: `cm.wb.${safe}.onlineRaw`, objectId: onlineId, dataType: 'mixed', direction: 'in' });
                if (statusId) await this.dp.upsert({ key: `cm.wb.${safe}.st`, objectId: statusId, dataType: 'mixed', direction: 'in' });
                if (phaseSwitchId) await this.dp.upsert({ key: `cm.wb.${safe}.phaseSet`, objectId: phaseSwitchId, dataType: 'mixed', direction: 'out' });
                if (phaseFeedbackId) await this.dp.upsert({ key: `cm.wb.${safe}.phaseFb`, objectId: phaseFeedbackId, dataType: 'mixed', direction: 'in' });

                if (l1Id) await this.dp.upsert({ key: `cm.wb.${safe}.l1A`, objectId: l1Id, dataType: 'number', direction: 'in', unit: 'A' });
                if (l2Id) await this.dp.upsert({ key: `cm.wb.${safe}.l2A`, objectId: l2Id, dataType: 'number', direction: 'in', unit: 'A' });
                if (l3Id) await this.dp.upsert({ key: `cm.wb.${safe}.l3A`, objectId: l3Id, dataType: 'number', direction: 'in', unit: 'A' });
            }

            // Read measurements (cache-based)
            const pW = (actualPowerWId && this.dp) ? this.dp.getNumber(`cm.wb.${safe}.pW`, null) : null;
            const iA = (actualCurrentAId && this.dp) ? this.dp.getNumber(`cm.wb.${safe}.iA`, null) : null;

            // Online detection: an explicit onlineId is authoritative; statusId is only fallback.
            // This keeps display status texts such as "Available" separate from reachability.
            const onlineRaw = (onlineId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.onlineRaw`) : null;
            const statusRaw = (statusId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.st`) : null;
            let online = enabled;
            if (onlineId) {
                online = normalizeEvcsOnlineFlag(onlineRaw, false);
            } else if (statusId) {
                online = normalizeEvcsOnlineFlag(statusRaw, false);
                if (online === null) online = true;
            }

            const normalizePhaseFeedbackRuntime = (value) => {
                const raw = String(value ?? '').trim().toLowerCase();
                if (!raw) return null;
                if (raw === '1' || raw === '1p' || raw === 'one' || raw.includes('1-phase') || raw.includes('single')) return 1;
                if (raw === '3' || raw === '3p' || raw === 'three' || raw.includes('3-phase')) return 3;
                const n = Number(raw.replace(',', '.'));
                if (Number.isFinite(n)) return Math.round(n) === 1 ? 1 : (Math.round(n) === 3 ? 3 : null);
                return null;
            };
            const phaseFeedbackRaw = (phaseFeedbackId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.phaseFb`) : null;
            const feedbackPhaseCount = normalizePhaseFeedbackRuntime(phaseFeedbackRaw);
            const assumedPhaseCount = this._chargingPhaseAssumedBySafe && this._chargingPhaseAssumedBySafe.has(safe) ? this._chargingPhaseAssumedBySafe.get(safe) : null;
            const currentPhaseCount = chargerType === 'AC'
                ? (feedbackPhaseCount === 1 || feedbackPhaseCount === 3 ? feedbackPhaseCount : ((assumedPhaseCount === 1 || assumedPhaseCount === 3) ? assumedPhaseCount : phases))
                : 1;
            const effectiveRuntimePhaseCount = chargerType === 'AC' ? currentPhaseCount : 1;

            // Diagnostics: freshness + mapping completeness
            const hasSetpoint = !!(setCurrentAId || setPowerWId);
            const mappingIssues = [];
            if (!hasSetpoint) mappingIssues.push('no_setpoint');
            if (!actualPowerWId) mappingIssues.push('no_power_meter');
            if (!statusId) mappingIssues.push('no_status_dp');

            let meterAgeMs = 0;
            let meterStale = false;
            if (actualPowerWId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.pW`);
                meterAgeMs = (Number.isFinite(age) && age >= 0) ? Math.round(age) : 0;
                meterStale = !(Number.isFinite(age)) ? true : (age > wbMeterStaleTimeoutMs);
            }

            let statusAgeMs = 0;
            let statusStale = false;
            if (statusId && this.dp && typeof this.dp.getAgeMs === 'function') {
                const age = this.dp.getAgeMs(`cm.wb.${safe}.st`);
                statusAgeMs = (Number.isFinite(age) && age >= 0) ? Math.round(age) : 0;
                statusStale = !(Number.isFinite(age)) ? true : (age > wbStatusStaleTimeoutMs);
            }

            const staleAny = !!(meterStale || statusStale);

            // Note: staleness flags are diagnostics only. Online/offline is derived from the status value.

            // Publish diagnostics (UI)
            try {
                await this._queueState(`${ch}.mappingOk`, hasSetpoint, true);
                await this._queueState(`${ch}.hasSetpoint`, hasSetpoint, true);
                await this._queueState(`${ch}.mappingIssues`, JSON.stringify(mappingIssues), true);
                await this._queueState(`${ch}.meterAgeMs`, meterAgeMs, true);
                await this._queueState(`${ch}.meterStale`, !!meterStale, true);
                await this._queueState(`${ch}.statusAgeMs`, statusAgeMs, true);
                await this._queueState(`${ch}.statusStale`, !!statusStale, true);
            } catch {
                // ignore
            }

            // Charging detection (used for arrival-based stepwise allocation)
            // If the wallbox meter is stale (event-driven update), fall back to the last commanded target.
            const pWNum = (typeof pW === 'number' && Number.isFinite(pW)) ? pW : 0;
            let pWUsed = (online && enabled) ? pWNum : 0;
            if (online && enabled && meterStale) {
                const prevCmdW = this._lastCmdTargetW.get(safe);
                pWUsed = (typeof prevCmdW === 'number' && Number.isFinite(prevCmdW)) ? prevCmdW : 0;
            }
            const pWAbs = Math.abs(pWUsed);
            const isChargingRaw = online && enabled && pWAbs >= activityThresholdW;
            
            // Session tracking / stickiness
            this._chargingLastSeenMs.set(safe, now);
            
            let chargingSince = 0;
            let lastActive = 0;
            const prevSince = this._chargingSinceMs.get(safe);
            if (typeof prevSince === 'number' && Number.isFinite(prevSince) && prevSince > 0) chargingSince = prevSince;
            const prevLastActive = this._chargingLastActiveMs.get(safe);
            if (typeof prevLastActive === 'number' && Number.isFinite(prevLastActive) && prevLastActive > 0) lastActive = prevLastActive;
            
            if (!enabled) {
                // Disabled by config: clear immediately
                chargingSince = 0;
                lastActive = 0;
                this._chargingSinceMs.delete(safe);
                this._chargingLastActiveMs.delete(safe);
            } else if (isChargingRaw) {
                // If we were idle longer than sessionKeepMs, start a new session
                if (!chargingSince || !lastActive || (now - lastActive) > sessionKeepMs) chargingSince = now;
                lastActive = now;
                this._chargingSinceMs.set(safe, chargingSince);
                this._chargingLastActiveMs.set(safe, lastActive);
            } else {
                // Not actively charging: keep session for a while to avoid splits on short dips
                if (chargingSince && lastActive) {
                    const idleMs = now - lastActive;
                    const offlineTooLong = (!online && idleMs > stopGraceMs);
                    if (idleMs > sessionKeepMs || offlineTooLong) {
                        chargingSince = 0;
                        lastActive = 0;
                        this._chargingSinceMs.delete(safe);
                        this._chargingLastActiveMs.delete(safe);
                    }
                } else {
                    this._chargingSinceMs.delete(safe);
                    this._chargingLastActiveMs.delete(safe);
                }
            }
            
            // NOTE: JS '&&' returns the last evaluated operand, which can be a number (e.g. 0)
            // -> enforce proper boolean types for ioBroker states (common.type = boolean).
            const inGrace = !!(chargingSince && lastActive && (now - lastActive) <= stopGraceMs);
            const isCharging = !!(online && enabled && (isChargingRaw || inGrace));
            const chargingSinceForState = isCharging ? chargingSince : 0;
            try {
                await this._queueState(`${ch}.phaseMode`, phaseMode, true);
                await this._queueState(`${ch}.currentPhaseCount`, currentPhaseCount, true);
                await this._queueState(`${ch}.targetPhaseCount`, currentPhaseCount, true);
                await this._queueState(`${ch}.phaseSwitchReason`, '', true);
                const cdUntil = this._chargingPhaseCooldownUntilMs && this._chargingPhaseCooldownUntilMs.has(safe) ? Number(this._chargingPhaseCooldownUntilMs.get(safe)) : 0;
                await this._queueState(`${ch}.phaseCooldownRemainingMs`, Math.max(0, cdUntil - now), true);
            } catch {
                // ignore phase diagnostics
            }
            // Determine effective control basis for this device
            const hasSetA = !!setCurrentAId;
            const hasSetW = !!setPowerWId;

            let controlBasis = controlBasisCfg;
            if (controlBasis === 'currentA') {
                controlBasis = hasSetA ? 'currentA' : (hasSetW ? 'powerW' : 'auto');
            } else if (controlBasis === 'powerW') {
                controlBasis = hasSetW ? 'powerW' : (hasSetA ? 'currentA' : 'auto');
            }

            if (controlBasis === 'auto') {
                if (chargerType === 'DC') {
                    controlBasis = hasSetW ? 'powerW' : (hasSetA ? 'currentA' : 'none');
                } else {
                    controlBasis = hasSetA ? 'currentA' : (hasSetW ? 'powerW' : 'none');
                }
            }

            // Compute min/max power caps for distribution (W)
            const vFactor = voltageV * effectiveRuntimePhaseCount;

            let minPW = 0;
            let maxPW = 0;

            if (chargerType === 'DC') {
                // For DC we primarily operate in W.
                minPW = (typeof minPowerWCfg === 'number' && Number.isFinite(minPowerWCfg)) ? minPowerWCfg : 0;

                // Default DC max to 1000kW if not configured
                const DEFAULT_DC_MAX_W = 1_000_000;
                if (typeof maxPowerWCfg === 'number' && Number.isFinite(maxPowerWCfg) && maxPowerWCfg > 0) {
                    maxPW = maxPowerWCfg;
                } else {
                    maxPW = DEFAULT_DC_MAX_W;
                }

                if (maxPW < minPW) minPW = maxPW;
            } else {
                // AC: if controlling by power, allow explicit min/max power, else derive from min/max current
                const minFromA = Math.max(0, minA) * vFactor;
                const maxFromA = Math.max(0, maxA) * vFactor;

                if (controlBasis === 'powerW') {
                    minPW = (typeof minPowerWCfg === 'number' && Number.isFinite(minPowerWCfg) && minPowerWCfg > 0) ? minPowerWCfg : minFromA;
                    maxPW = (typeof maxPowerWCfg === 'number' && Number.isFinite(maxPowerWCfg) && maxPowerWCfg > 0) ? maxPowerWCfg : maxFromA;
                } else {
                    minPW = minFromA;
                    maxPW = maxFromA;
                }

                if (maxPW < minPW) minPW = maxPW;

                // For AC, enforce a practical 3-phase minimum only when we can command *power* directly.
                // When controlling by current (A), the wallbox already has a physical minimum current (typically 6 A).
                // Enforcing a power minimum here would lead to fractional currents (e.g. 6.1 A) which some chargers
                // or adapters do not accept and can cause start/stop behaviour.
                if (controlBasis === 'powerW' && effectiveRuntimePhaseCount === 3 && acMinPower3pW > 0) {
                    minPW = Math.max(minPW, acMinPower3pW);
                }

                // Note: if maxPW < minPW after enforcement, this wallbox cannot be started.
            }

            const maxPWBefore14a = maxPW;
            let para14aCapW = 0;
            let para14aCapped = false;

            // -------------------------------------------------------------
            // §14a EnWG per-wallbox cap (if active)
            // Apply after min/max derivation so we can safely clamp.
            // -------------------------------------------------------------
            if (para14aActive) {
                const capW = (para14aCapsBySafe && typeof para14aCapsBySafe[safe] === 'number' && Number.isFinite(para14aCapsBySafe[safe]))
                    ? Number(para14aCapsBySafe[safe])
                    : null;
                if (typeof capW === 'number' && Number.isFinite(capW) && capW > 0) {
                    para14aCapW = capW;
                    // Mark §14a as binding for this connector only if it reduces the effective max.
                    if (Number.isFinite(maxPWBefore14a) && capW < (maxPWBefore14a - 1)) {
                        para14aCapped = true;
                    }

                    maxPW = Math.min(maxPW, capW);
                    if (maxPW < minPW) minPW = maxPW;
                }
            }

            const pWFreshActualForGridW = (online && enabled && !meterStale && typeof pW === 'number' && Number.isFinite(pW)) ? Math.max(0, Math.abs(pW)) : 0;
            const pWStaleIgnoredForGridW = (online && enabled && meterStale && typeof pW === 'number' && Number.isFinite(pW)) ? Math.max(0, Math.abs(pW)) : 0;

            // Speicher-Schutz: Nur frische, reale Wallbox-Leistung wird als
            // geschuetzte Last an die Speicherregelung uebergeben. Stale Setpoint-
            // Fallbacks duerfen den Speicher nicht kuenstlich sperren.
            if (pWFreshActualForGridW > 0) {
                if (storageAssistRequested) {
                    storageAssistRequestedLoadW += pWFreshActualForGridW;
                } else {
                    storageProtectedLoadW += pWFreshActualForGridW;
                    storageProtectedWallboxes += 1;
                }
            }

            if (typeof pWUsed === 'number' && Number.isFinite(pWUsed)) totalPowerW += pWUsed;
            totalFreshActualPowerW += pWFreshActualForGridW;
            totalStaleActualIgnoredForGridW += pWStaleIgnoredForGridW;
            if (typeof iA === 'number' && !meterStale) totalCurrentA += iA;
            if (online) onlineCount += 1;

            await this._queueState(`${ch}.name`, String(wb.name || key), true);
            await this._queueState(`${ch}.cfgEnabled`, cfgEnabled, true);
            await this._queueState(`${ch}.enabled`, enabled, true);
            await this._queueState(`${ch}.online`, online, true);
            await this._queueState(`${ch}.priority`, priority, true);
            await this._queueState(`${ch}.chargerType`, chargerType, true);
            await this._queueState(`${ch}.controlBasis`, controlBasis, true);
            await this._queueState(`${ch}.stationKey`, stationKey || '', true);
            await this._queueState(`${ch}.connectorNo`, connectorNo || 0, true);
            await this._queueState(`${ch}.stationMaxPowerW`, (typeof stationMaxPowerW === 'number' && Number.isFinite(stationMaxPowerW)) ? stationMaxPowerW : 0, true);
            await this._queueState(`${ch}.allowBoost`, !!allowBoost, true);
            await this._queueState(`${ch}.phases`, phases, true);
            await this._queueState(`${ch}.phaseSwitchSupported`, !!phaseSwitchId && chargerType === 'AC', true);
            await this._queueState(`${ch}.phaseMode`, phaseMode, true);
            // userPhaseMode is writable; do NOT overwrite here. phaseMode above is the effective mode.
            await this._queueState(`${ch}.minPowerW`, minPW, true);
            await this._queueState(`${ch}.maxPowerW`, maxPW, true);
            await this._queueState(`${ch}.para14aCapW`, para14aCapW || 0, true);
            await this._queueState(`${ch}.para14aCapped`, !!para14aCapped, true);
            await this._queueState(`${ch}.actualPowerW`, typeof pW === 'number' ? pW : 0, true);
            await this._queueState(`${ch}.actualCurrentA`, typeof iA === 'number' ? iA : 0, true);

            await this._queueState(`${ch}.charging`, isCharging, true);
            await this._queueState(`${ch}.chargingSince`, chargingSinceForState, true);
            await this._queueState(`${ch}.chargingRaw`, isChargingRaw, true);
            await this._queueState(`${ch}.lastActive`, lastActive || 0, true);
            await this._queueState(`${ch}.idleMs`, lastActive ? (now - lastActive) : 0, true);
            await this._queueState(`${ch}.allocationRank`, 0, true);
            // userMode is writable; do NOT overwrite here. effectiveMode will be set later.
            // Zeit-Ziel Laden (Depot-/Deadline-Laden)
            let goalEnabled = false;
            let goalTargetSocPct = 100;
            let goalFinishTs = 0;
            let goalBatteryKwhUser = 0;

            try {
                const st = await this._getStateCached(`${ch}.goalEnabled`);
                goalEnabled = !!(st && st.val);
            } catch {
                goalEnabled = false;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalTargetSocPct`);
                const v = st ? Number(st.val) : NaN;
                goalTargetSocPct = Number.isFinite(v) ? clamp(v, 0, 100) : 100;
            } catch {
                goalTargetSocPct = 100;
            }

            try {
                const st = await this._getStateCached(`${ch}.goalFinishTs`);
                const v = st ? Number(st.val) : NaN;
                goalFinishTs = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
            } catch {
                goalFinishTs = 0;
            }

            // UX/Serienreife: Zeit‑Ziel Laden soll wie eine tägliche Uhrzeit funktionieren.
            // 1) Minuten immer auf 15‑Min Raster quantisieren (00/15/30/45).
            // 2) Wenn die Deadline erreicht/überschritten wurde: automatisch auf die nächste
            //    kommende gleiche Uhrzeit (nächster Tag) weiterschieben, damit es täglich weiterläuft.
            if (goalFinishTs > 0) {
                let nextTs = quantizeTsTo15Min(goalFinishTs);
                if (goalEnabled && nextTs > 0 && now >= nextTs) {
                    nextTs = nextOccurrenceSameClock(nextTs, now);
                }
                if (nextTs > 0 && nextTs !== goalFinishTs) {
                    goalFinishTs = nextTs;
                    try { await this._queueState(`${ch}.goalFinishTs`, goalFinishTs, true); } catch {
                        // ignore
                    }
                }
            }

            try {
                const st = await this._getStateCached(`${ch}.goalBatteryKwh`);
                const v = st ? Number(st.val) : NaN;
                goalBatteryKwhUser = Number.isFinite(v) ? Math.max(0, v) : 0;
            } catch {
                goalBatteryKwhUser = 0;
            }

            let goalActive = false;
            let goalStatus = 'inactive';
            let goalVehicleSocPct = null;
            let goalSocAvailable = false;
            let goalRemainingMin = 0;
            let goalRequiredW = 0;
            let goalDesiredW = 0;
            let goalShortfallW = 0;
            let goalUrgency = 0;
            let goalDeltaSocPct = 0;
            let goalOverdue = false;

            // Stable mapping from wallbox to EVCS index (independent from safe key)
            const evcsIndex = (wb && wb.evcsIndex !== undefined && wb.evcsIndex !== null) ? Number(wb.evcsIndex) : NaN;

            // Vehicle connection (mapped via main.js: evcs.<index>.active). Important:
            // If a non-zero setpoint was written while the car was unplugged, some wallboxes
            // may start charging immediately on plug-in (cached setpoint). We therefore track
            // the plug state and force 0W whenever the vehicle is not connected.
            //
            // Robustness:
            // Some EVCS/OCPP adapters report "active" as "charging" (true only when power flows),
            // while the connector can already be physically connected in states like
            // "Preparing"/"SuspendedEVSE". To avoid false "no_vehicle" states we also infer the
            // plug state from the wallbox status string when available.
            /** @type {boolean|null} */
            let vehiclePlugged = null;
            let vehiclePluggedSinceMs = 0;

            /**
             * Code-Teil: Arrow-Funktion `inferPlugFromStatus`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
            /**
             * Code-Teil: inferPlugFromStatus
             * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
             */
            const inferPlugFromStatus = (raw) => {
                try {
                    if (raw === null || raw === undefined) return null;
                    if (typeof raw !== 'string') return null;
                    const s = raw.trim().toLowerCase();
                    if (!s) return null;

                    // Typical OCPP status strings
                    if (s === 'preparing' || s === 'charging' || s === 'finishing' || s === 'suspendedevse' || s === 'suspendedev' || s === 'occupied' || s === 'reserved') return true;
                    if (s === 'available' || s === 'idle' || s === 'unplugged' || s === 'notconnected' || s === 'not_connected' || s === 'free' || s === 'ready') return false;

                    // Heuristics for vendor-specific strings
                    if (s.includes('suspend') || s.includes('charg') || s.includes('prepare') || s.includes('occupied') || s.includes('plug') || (s.includes('connect') && !s.includes('disconnect'))) return true;
                    if (s.includes('available') || s.includes('idle') || s.includes('unplug') || s.includes('no_vehicle') || s.includes('not connected') || s.includes('disconnect')) return false;

                    return null;
                } catch {
                    return null;
                }
            };

            /** @type {boolean|null} */
            let plugByDp = null;
            let plugByDpTsMs = 0;

            if (Number.isFinite(evcsIndex) && evcsIndex > 0) {
                try {
                    const stPlg = await this._getStateCached(`evcs.${Math.round(evcsIndex)}.active`);
                    plugByDp = stPlg ? toBool(stPlg.val) : null;
                    const tsPlg = stPlg ? Number(stPlg.ts) : NaN;
                    plugByDpTsMs = (Number.isFinite(tsPlg) && tsPlg > 0) ? Math.round(tsPlg) : 0;
                } catch {
                    plugByDp = null;
                    plugByDpTsMs = 0;
                }
            }

            // Prefer EVCS status string (OCPP) if available for plug inference.
            // Some setups map cm.wb.<key>.st to a boolean "online" flag, while the actual
            // OCPP status (e.g. SuspendedEVSE) is available on evcs.<index>.status.
            // Using evcs.status avoids false "no_vehicle" deadlocks (0A forever).
            let statusForPlug = statusRaw;
            let statusForPlugSource = 'wb.status';
            if (Number.isFinite(evcsIndex) && evcsIndex > 0) {
                try {
                    const stS = await this._getStateCached(`evcs.${Math.round(evcsIndex)}.status`);
                    const vS = stS ? stS.val : null;
                    if (typeof vS === 'string' && vS.trim()) {
                        statusForPlug = vS;
                        statusForPlugSource = 'evcs.status';
                    }
                } catch {
                    // ignore
                }
            }

            const plugByStatus = inferPlugFromStatus(statusForPlug);

            // If there is actual power flow, the vehicle must be connected.
            const plugByPower = !!isChargingRaw;

            // Final decision (safety default: unplugged if we cannot determine reliably)
            let plugSource = 'unknown';
            if (plugByPower) {
                vehiclePlugged = true;
                plugSource = 'power';
            } else if (plugByStatus === true || plugByStatus === false) {
                vehiclePlugged = plugByStatus;
                plugSource = `status:${statusForPlugSource}`;
            } else if (plugByDp === true || plugByDp === false) {
                vehiclePlugged = plugByDp;
                plugSource = 'dp';
            } else {
                vehiclePlugged = false;
                plugSource = 'default';
            }

            // Track plug transitions (used for SoC freshness gating)
            if (vehiclePlugged === true || vehiclePlugged === false) {
                const prev = this._vehiclePluggedPrev.get(safe);
                if (prev !== vehiclePlugged) {
                    if (vehiclePlugged === true) {
                        const since = (plugSource === 'dp' && plugByDpTsMs > 0) ? plugByDpTsMs : now;
                        this._vehiclePluggedSinceMs.set(safe, since);
                    } else {
                        this._vehiclePluggedSinceMs.delete(safe);
                    }
                } else if (vehiclePlugged === true) {
                    const have = this._vehiclePluggedSinceMs.get(safe);
                    if (!Number.isFinite(have) || have <= 0) {
                        const since = (plugSource === 'dp' && plugByDpTsMs > 0) ? plugByDpTsMs : now;
                        this._vehiclePluggedSinceMs.set(safe, since);
                    }
                }
                this._vehiclePluggedPrev.set(safe, vehiclePlugged);
            }

            vehiclePluggedSinceMs = this._vehiclePluggedSinceMs.get(safe) || 0;

            let pvStartupHoldUntilMs = this._pvStartupUntilMs.get(safe) || 0;
            let pvMinRunUntilMs = this._pvMinRunUntilMs.get(safe) || 0;
            let pvStartCooldownUntilMs = this._pvStartCooldownUntilMs.get(safe) || 0;
            if (!enabled || !online || vehiclePlugged === false) {
                this._pvStartupUntilMs.delete(safe);
                this._pvStartReadySinceMs.delete(safe);
                this._pvBelowMinSinceMs.delete(safe);
                this._pvMinRunUntilMs.delete(safe);
                this._pvStartCooldownUntilMs.delete(safe);
                pvStartupHoldUntilMs = 0;
                pvMinRunUntilMs = 0;
                pvStartCooldownUntilMs = 0;
            } else {
                if (pvStartupHoldUntilMs > 0 && now >= pvStartupHoldUntilMs) {
                    this._pvStartupUntilMs.delete(safe);
                    pvStartupHoldUntilMs = 0;
                }
                if (pvMinRunUntilMs > 0 && now >= pvMinRunUntilMs) {
                    this._pvMinRunUntilMs.delete(safe);
                    pvMinRunUntilMs = 0;
                }
                if (pvStartCooldownUntilMs > 0 && now >= pvStartCooldownUntilMs) {
                    this._pvStartCooldownUntilMs.delete(safe);
                    pvStartCooldownUntilMs = 0;
                }
            }

            try {
                await this._queueState(`${ch}.vehiclePlugged`, vehiclePlugged === true, true);
                await this._queueState(`${ch}.vehiclePluggedSource`, String(plugSource || ''), true);
            } catch {
                // ignore
            }

            // Goal-Charging (Zielladen) is only supported in AUTO mode.
            if (goalEnabled) {
                if (userMode !== 'auto') {
                    goalStatus = 'auto_only';
                } else
                if (!Number.isFinite(evcsIndex) || evcsIndex <= 0) {
                    goalStatus = 'no_index';
                } else
                if (vehiclePlugged === false) {
                    // Only compute once a vehicle is actually connected.
                    goalStatus = 'no_vehicle';
                } else {
                    try {
                        const stSoc = await this._getStateCached(`evcs.${Math.round(evcsIndex)}.vehicleSoc`);
                        const socVal = stSoc ? Number(stSoc.val) : NaN;

                        const socIsValid = Number.isFinite(socVal) && socVal >= 0 && socVal <= 100;

                        // Avoid using very old SoC values after long unplugged periods.
                        // On plug-in we wait for a fresh SoC update (if the state timestamp is older than the plug time).
                        const socTs = (stSoc && typeof stSoc.ts === 'number' && Number.isFinite(stSoc.ts)) ? Math.round(stSoc.ts) : 0;
                        const socAgeMs = (socTs > 0 && now >= socTs) ? (now - socTs) : 0;

                        const SOC_STALE_MS = 48 * 3600 * 1000; // 48h
                        const SOC_RECENT_GRACE_MS = 10 * 60 * 1000; // 10 min
                        const SOC_AFTER_PLUG_TOL_MS = 2 * 60 * 1000; // 2 min tolerance
                        const SOC_WAIT_FALLBACK_MS = Math.round(goalSocWaitFallbackSec * 1000); // after plug-in: fall back to no-SoC planning

                        const waitedSincePlugMs = (vehiclePlugged === true && vehiclePluggedSinceMs > 0 && now >= vehiclePluggedSinceMs)
                            ? (now - vehiclePluggedSinceMs)
                            : 0;

                        let canUseSoc = false;

                        if (socIsValid) {
                            if (socAgeMs > SOC_STALE_MS) {
                                // SoC too old -> wait for an update after plug-in; then fall back.
                                if (waitedSincePlugMs > 0 && waitedSincePlugMs >= SOC_WAIT_FALLBACK_MS) {
                                    canUseSoc = false;
                                } else {
                                    goalStatus = 'soc_stale';
                                }
                            } else if (vehiclePlugged === true && vehiclePluggedSinceMs > 0 && socTs > 0
                                && socTs < (vehiclePluggedSinceMs - SOC_AFTER_PLUG_TOL_MS)
                                && socAgeMs > SOC_RECENT_GRACE_MS) {
                                // SoC timestamp predates plug-in -> wait for refresh; then fall back.
                                if (waitedSincePlugMs > 0 && waitedSincePlugMs >= SOC_WAIT_FALLBACK_MS) {
                                    canUseSoc = false;
                                } else {
                                    goalStatus = 'waiting_soc';
                                }
                            } else {
                                canUseSoc = true;
                            }
                        }

                        // If we are waiting for a SoC refresh, do not compute a goal plan yet.
                        if (goalStatus === 'soc_stale' || goalStatus === 'waiting_soc') {
                            // keep goalActive=false
                        } else {
                            if (canUseSoc) {
                                goalSocAvailable = true;
                                goalVehicleSocPct = clamp(socVal, 0, 100);
                                goalDeltaSocPct = Math.max(0, goalTargetSocPct - goalVehicleSocPct);
                            } else {
                                // No SoC available -> still support Zeit-Ziel Laden by planning worst-case from 0% SoC.
                                goalSocAvailable = false;
                                goalVehicleSocPct = null;
                                goalDeltaSocPct = clamp(goalTargetSocPct, 0, 100);
                            }

                            if (goalDeltaSocPct <= 0.01) {
                                goalStatus = 'reached';
                            } else {
                                // Deadline optional: if no timestamp is set, keep the goal configured but do not influence allocation
                                if (!Number.isFinite(goalFinishTs) || goalFinishTs <= 0) {
                                    goalStatus = 'no_deadline';
                                } else {
                                    const remMs = goalFinishTs - now;
                                    goalOverdue = remMs < 0;
                                    const remMsClamped = Math.max(0, remMs);
                                    goalRemainingMin = Math.max(0, Math.round(remMsClamped / 60000));

                                    // Battery capacity: user value wins; otherwise default by charger type.
                                    const defaultBatteryKwh = (chargerType === 'DC') ? 200 : 60;
                                    const batteryKwh = (goalBatteryKwhUser && goalBatteryKwhUser > 0) ? goalBatteryKwhUser : defaultBatteryKwh;

                                    // Required average power to reach target SoC by deadline
                                    const remH = Math.max(0.05, remMsClamped / 3600000); // >= 3 min
                                    const requiredWh = (batteryKwh * 1000) * (goalDeltaSocPct / 100);
                                    const reqW = requiredWh / remH;
                                    goalRequiredW = clamp(reqW, 0, maxPW);

                                    // Desired command (cap): average required power, but never below technical minimum if we still need energy.
                                    goalDesiredW = (goalRequiredW > 0) ? Math.min(maxPW, Math.max(goalRequiredW, minPW)) : 0;

                                    // Urgency score for sorting (0..1+), based on desired power relative to max.
                                    goalUrgency = (maxPW > 0) ? (goalDesiredW / maxPW) : 0;

                                    goalActive = true;
                                    goalStatus = goalOverdue ? 'overdue' : 'active';
                                }
                            }
                        }
                    } catch {
                        // If SoC is not readable at all, fall back to no-SoC planning.
                        goalSocAvailable = false;
                        goalVehicleSocPct = null;
                        goalDeltaSocPct = clamp(goalTargetSocPct, 0, 100);

                        if (goalDeltaSocPct <= 0.01) {
                            goalStatus = 'reached';
                        } else if (!Number.isFinite(goalFinishTs) || goalFinishTs <= 0) {
                            goalStatus = 'no_deadline';
                        } else {
                            const remMs = goalFinishTs - now;
                            goalOverdue = remMs < 0;
                            const remMsClamped = Math.max(0, remMs);
                            goalRemainingMin = Math.max(0, Math.round(remMsClamped / 60000));

                            const defaultBatteryKwh = (chargerType === 'DC') ? 200 : 60;
                            const batteryKwh = (goalBatteryKwhUser && goalBatteryKwhUser > 0) ? goalBatteryKwhUser : defaultBatteryKwh;

                            const remH = Math.max(0.05, remMsClamped / 3600000); // >= 3 min
                            const requiredWh = (batteryKwh * 1000) * (goalDeltaSocPct / 100);
                            const reqW = requiredWh / remH;
                            goalRequiredW = clamp(reqW, 0, maxPW);

                            goalDesiredW = (goalRequiredW > 0) ? Math.min(maxPW, Math.max(goalRequiredW, minPW)) : 0;
                            goalUrgency = (maxPW > 0) ? (goalDesiredW / maxPW) : 0;

                            goalActive = true;
                            goalStatus = goalOverdue ? 'overdue' : 'active';
                        }
                    }
                }
            }

            // Publish computed goal states (shortfall will be updated after command calculation)
            try {
                await this._queueState(`${ch}.goalSocAvailable`, !!goalSocAvailable, true);
                await this._queueState(`${ch}.goalActive`, !!goalActive, true);
                await this._queueState(`${ch}.goalRemainingMin`, goalRemainingMin || 0, true);
                await this._queueState(`${ch}.goalRequiredPowerW`, Math.round(goalRequiredW || 0), true);
                await this._queueState(`${ch}.goalDesiredPowerW`, Math.round(goalDesiredW || 0), true);
                await this._queueState(`${ch}.goalShortfallW`, Math.round(goalShortfallW || 0), true);
                await this._queueState(`${ch}.goalStatus`, String(goalStatus || 'inactive'), true);
            } catch {
                // ignore
            }

            wbList.push({
                key,
                safe,
                orderIndex: wbIndex,
                ch,
                name: String(wb.name || key),
                cfgEnabled,
                userEnabled,
                enabled,
                online,
                staleAny,
                meterStale,
                meterAgeMs,
                statusStale,
                statusAgeMs,
                hasSetpoint,
                mappingIssues,
                charging: isCharging,
                chargingSinceMs: chargingSinceForState,
                actualPowerW: pWNum,
                pvStartupHoldUntilMs,
                pvMinRunUntilMs,
                pvStartCooldownUntilMs,
                userMode,
                evcsIndex: (Number.isFinite(evcsIndex) && evcsIndex > 0) ? Math.round(evcsIndex) : 0,
                vehiclePlugged,
                goalEnabled,
                goalActive,
                goalStatus,
                goalTargetSocPct,
                goalFinishTs,
                goalBatteryKwhUser,
                goalVehicleSocPct,
                goalSocAvailable,
                goalDeltaSocPct,
                goalRemainingMin,
                goalRequiredW,
                goalDesiredW,
                goalUrgency,
                goalOverdue,
                stationKey,
                connectorNo,
                stationMaxPowerW,
                allowBoost,
                boostTimeoutMinOverride,
                priority,
                chargerType,
                controlBasis,
                phases: effectiveRuntimePhaseCount,
                configuredPhaseCount: phases,
                currentPhaseCount,
                targetPhaseCount: currentPhaseCount,
                allocationPhaseCount: effectiveRuntimePhaseCount,
                phaseMode,
                phaseSwitchKey: phaseSwitchId ? `cm.wb.${safe}.phaseSet` : '',
                phaseSwitchValue1p,
                phaseSwitchValue3p,
                stopBeforePhaseSwitch,
                phaseSwitchUpThresholdW: wbPhaseSwitchUpThresholdW,
                phaseSwitchDownThresholdW: wbPhaseSwitchDownThresholdW,
                phaseSwitchUpStableMs: wbPhaseSwitchUpStableMs,
                phaseSwitchDownStableMs: wbPhaseSwitchDownStableMs,
                phaseSwitchCooldownMs: wbPhaseSwitchCooldownMs,
                phaseSwitchSettleMs: wbPhaseSwitchSettleMs,
                storageAssistCustomerAllowed,
                userStorageAssistEnabled,
                storageAssistRequested,
                effectiveStorageAssist: false,
                storageAssistBlockedReason: storageAssistCustomerAllowed ? (userStorageAssistEnabled ? 'pending' : 'user-disabled') : 'installer-locked',
                batteryContributionW: 0,
                phaseSwitchSafePowerW,
                highSinceMs: this._chargingPhaseHighSinceMs && this._chargingPhaseHighSinceMs.has(safe) ? this._chargingPhaseHighSinceMs.get(safe) : 0,
                lowSinceMs: this._chargingPhaseLowSinceMs && this._chargingPhaseLowSinceMs.has(safe) ? this._chargingPhaseLowSinceMs.get(safe) : 0,
                cooldownUntilMs: this._chargingPhaseCooldownUntilMs && this._chargingPhaseCooldownUntilMs.has(safe) ? this._chargingPhaseCooldownUntilMs.get(safe) : 0,
                settleUntilMs: this._chargingPhaseSettleUntilMs && this._chargingPhaseSettleUntilMs.has(safe) ? this._chargingPhaseSettleUntilMs.get(safe) : 0,
                voltageV,
                minA,
                maxA,
                minPW,
                maxPW,
                para14aCapW,
                para14aCapped,
                userLimitSet,
                vFactor,
                setAKey: hasSetA ? `cm.wb.${safe}.setA` : null,
                setWKey: hasSetW ? `cm.wb.${safe}.setW` : null,
                enableKey: enableId ? `cm.wb.${safe}.en` : null,
                consumer: {
                    type: 'evcs',
                    key: safe,
                    name: String(wb.name || key),
                    controlBasis,
                    setAKey: hasSetA ? `cm.wb.${safe}.setA` : '',
                    setWKey: hasSetW ? `cm.wb.${safe}.setW` : '',
                    enableKey: enableId ? `cm.wb.${safe}.en` : '',
                },
});
        }

        await this._queueState('chargingManagement.wallboxCount', wbList.length, true);
        await this._queueState('chargingManagement.summary.totalPowerW', totalFreshActualPowerW, true);
        await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
        await this._queueState('chargingManagement.summary.totalCurrentA', totalCurrentA, true);
        await this._queueState('chargingManagement.summary.onlineWallboxes', onlineCount, true);

        // Determine budget
        let budgetW = Number.POSITIVE_INFINITY;
        let effectiveBudgetMode = budgetMode;
        /** @type {any|null} */
        let budgetDebug = null;

        /**
         * Code-Teil: Arrow-Funktion `getFirstDpNumber`
         * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: getFirstDpNumber
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const getFirstDpNumber = (keys) => {
            if (!this.dp) return null;
            for (const k of keys) {
                const v = (typeof this.dp.getNumberFresh === 'function') ? this.dp.getNumberFresh(k, staleTimeoutMs, null) : this.dp.getNumber(k, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
            return null;
        };

        
        /**
         * MU6.8: state staleness helper (uses state.ts / state.lc).
         * @param {string} id
         * @param {number} maxAgeMs
         * @returns {Promise<boolean>}
         */
        /**
         * Code-Teil: Arrow-Funktion `isStateStale`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: isStateStale
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const isStateStale = async (id, maxAgeMs) => {
            try {
                const st = await this._getStateCached(id);
                const ts = st && (typeof st.ts === 'number' ? st.ts : (typeof st.lc === 'number' ? st.lc : 0));
                if (!ts) return true;
                return (Date.now() - ts) > maxAgeMs;
            } catch {
                return true;
            }
        };


        // Tariff-derived permissions (optional; provided by tarif-vis.js)
        // gridChargeAllowed: whether EVCS may use grid import (Tarif-Sperre)
        // dischargeAllowed: whether the storage may discharge for comfort use-cases (EVCS assist, self-consumption)
        let gridChargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.gridChargeAllowed')) {
            // See storage-control.js: do NOT treat this as "stale" on a short timeout.
            // These flags can remain unchanged for hours (cheap window), but are still valid.
            gridChargeAllowedRaw = this.dp.getBoolean('cm.gridChargeAllowed', true);
        }

        let dischargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.dischargeAllowed')) {
            dischargeAllowedRaw = this.dp.getBoolean('cm.dischargeAllowed', true);
        }

        // Zeitvariables Netzentgelt (HT/NT) Overlay:
        // Falls Netzentgelt aktiv ist, kann es die Netzlade-Freigabe erzwingen:
        // - NT: Netzladen erlauben (auch wenn der Stromtarif gerade sperrt)
        // - HT: Netzladen sperren (PV bleibt möglich)
        // Hintergrund: Diese Logik muss zuverlässig laufen, auch wenn tarif-vis Flags
        // kurzzeitig stale/inkonsistent sind.
        try {
            const stNfEn = await this._getStateCached('tarif.netFeeEnabled');
            const stNfMode = await this._getStateCached('tarif.netFeeMode');
            const nfEnabled = stNfEn ? !!stNfEn.val : false;
            const nfMode = stNfMode ? String(stNfMode.val || '') : '';
            if (nfEnabled) {
                if (nfMode === 'NT') gridChargeAllowedRaw = true;
                else if (nfMode === 'HT') gridChargeAllowedRaw = false;
            }
        } catch {
            // ignore
        }

        // Gate E – Negativpreis / Netzbezug bevorzugt:
        // Wenn der dynamische effektive Tarif negativ ist, darf das Lade-/Lastmanagement
        // Netzladen freigeben und PV-only nur für Auto/Global-Modi aufheben. Harte Limits
        // (Netzanschluss, Phasen, §14a, Peak-Shaving) bleiben weiter aktiv.
        let tariffNegativeActive = false;
        let tariffGridImportPreferred = false;
        try {
            const stNeg = await this._getStateCached('tarif.negativpreisAktiv');
            const stPref = await this._getStateCached('tarif.netzbezugBevorzugt');
            tariffNegativeActive = stNeg ? !!stNeg.val : false;
            tariffGridImportPreferred = stPref ? !!stPref.val : tariffNegativeActive;
        } catch {
            tariffNegativeActive = false;
            tariffGridImportPreferred = false;
        }

        if (tariffGridImportPreferred) {
            gridChargeAllowedRaw = true;
            dischargeAllowedRaw = false;
        }

        // Debounce gegen Flattern:
        // - Sperren (false) wirken sofort (Safety-first)
        // - Freigaben (true) erst nach stabiler True-Phase (hold)
        const permHoldMs = Math.round(clamp(num(cfg.tariffPermissionHoldSec, 10), 0, 3600) * 1000);
        const permNowMs = Date.now();

        let gridChargeAllowed = gridChargeAllowedRaw;
        if (permHoldMs > 0) {
            if (!gridChargeAllowedRaw) {
                this._tariffGridChargeAllowed = false;
                this._tariffGridChargeAllowedTrueSinceMs = 0;
            } else {
                if (this._tariffGridChargeAllowed) {
                    // already enabled
                } else {
                    if (!this._tariffGridChargeAllowedTrueSinceMs) this._tariffGridChargeAllowedTrueSinceMs = permNowMs;
                    if ((permNowMs - this._tariffGridChargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffGridChargeAllowed = true;
                    }
                }
            }
            gridChargeAllowed = !!this._tariffGridChargeAllowed;
        }

        let dischargeAllowed = dischargeAllowedRaw;
        if (permHoldMs > 0) {
            if (!dischargeAllowedRaw) {
                this._tariffDischargeAllowed = false;
                this._tariffDischargeAllowedTrueSinceMs = 0;
            } else {
                if (this._tariffDischargeAllowed) {
                    // already enabled
                } else {
                    if (!this._tariffDischargeAllowedTrueSinceMs) this._tariffDischargeAllowedTrueSinceMs = permNowMs;
                    if ((permNowMs - this._tariffDischargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffDischargeAllowed = true;
                    }
                }
            }
            dischargeAllowed = !!this._tariffDischargeAllowed;
        }

        try {
            await this._queueState('chargingManagement.control.gridChargeAllowed', !!gridChargeAllowed, true);
            await this._queueState('chargingManagement.control.dischargeAllowed', !!dischargeAllowed, true);
        } catch {
            // ignore
        }

        // Global default PV-only behaviour (same as before)
        const pvSurplusOnlyCfgBase = cfg.pvSurplusOnly === true || mode === 'pvSurplus';
        // Bei Negativpreis wird Netzbezug wirtschaftlich bevorzugt. Deshalb darf die
        // globale PV-only-Vorgabe im Automatikpfad temporär aufgehoben werden. Explizite
        // Wallbox-Modi wie "PV" bleiben User-Wunsch und werden weiter respektiert.
        const pvSurplusOnlyCfg = tariffGridImportPreferred ? false : pvSurplusOnlyCfgBase;
        const forcePvSurplusOnly = !gridChargeAllowed;

        // Determine effective per-wallbox mode (runtime override via VIS)
        // effectiveMode values:
        // - normal: budget-based, grid allowed
        // - pv: PV surplus only (no grid import intended)
        // - minpv: always try to keep minPower from grid, but any extra only from PV budget
        // - boost: like normal, but preferred in allocation order
        let anyGridAllowedActive = false;
        let anyPvLimitedActive = false;
        let anyBoostActive = false;

        // -----------------------------------------------------------------
        // Tarif‑Forecast für Zeit‑Ziel Laden (optional)
        // -----------------------------------------------------------------
        // Wenn der Tarif gerade Netzladung sperrt (forcePvSurplusOnly=true), wollen wir im
        // "forecast"‑Modus NICHT pauschal übersteuern, sondern prüfen:
        // Reichen die erwarteten Tarif‑Freigaben bis zur Deadline aus?
        // Falls nein → Notfall: Override (damit das Ziel trotzdem erreicht wird).

        /** @type {null|{active:boolean,modeInt:number|null,prioInt:number|null,allowEvcsCheap:boolean,ref:number|null,exp:number|null,cheap:number|null,cheapManual:number|null,segments:Array<{startMs:number,endMs:number,priceEurKwh:number,allowGrid:boolean}>}} */
        let tariffForecast = null;
        const goalForecastReserveMs = Math.round(goalForecastReserveMin * 60 * 1000);

        if (forcePvSurplusOnly && !pvSurplusOnlyCfg && goalTariffOverrideMode === 'forecast') {
            const anyGoal = wbList.some((w) => w && w.enabled && w.online && w.goalActive && Number.isFinite(Number(w.goalFinishTs)) && Number(w.goalFinishTs) > now);
            if (anyGoal) {
                const maxGoalFinishTs = wbList.reduce((m, w) => {
                    const ts = (w && w.goalActive) ? Number(w.goalFinishTs) : NaN;
                    return Number.isFinite(ts) ? Math.max(m, ts) : m;
                }, 0);

                const horizonEndMs = (Number.isFinite(maxGoalFinishTs) && maxGoalFinishTs > now) ? maxGoalFinishTs : (now + 48 * 3600 * 1000);

                try {
                    // Tariff meta (produced by tarif-vis.js)
                    const stActive = await this._getStateCached('tarif.aktiv');
                    const active = stActive ? !!stActive.val : false;

                    const stMode = await this._getStateCached('tarif.modus');
                    const modeInt = stMode ? Number(stMode.val) : NaN;

                    const stPrio = await this._getStateCached('tarif.prioritaet');
                    const prioInt = stPrio ? Number(stPrio.val) : NaN;
                    const allowEvcsCheap = (prioInt === 2 || prioInt === 3);

                    const stRef = await this._getStateCached('tarif.preisRefEurProKwh');
                    const priceRef = stRef ? Number(stRef.val) : NaN;
                    const stGrenze = await this._getStateCached('tarif.preisGrenzeEurProKwh');
                    const priceExpensive = stGrenze ? Number(stGrenze.val) : NaN;
                    const stCheap = await this._getStateCached('tarif.preisSchwelleGuensigEurProKwh');
                    const priceCheap = stCheap ? Number(stCheap.val) : NaN;

                    const ref = Number.isFinite(priceRef) ? priceRef : null;
                    const exp = Number.isFinite(priceExpensive) ? priceExpensive : null;
                    const cheap = Number.isFinite(priceCheap) ? priceCheap : null;

                    const delta = (ref !== null && exp !== null) ? Math.max(0, exp - ref) : null;
                    const cheapManual = (ref !== null && delta !== null) ? (ref - delta) : null;

                    // Price curves from provider mapping (via dp registry)
                    let rawToday = null;
                    let rawTomorrow = null;
                    if (this.dp && typeof this.dp.getEntry === 'function') {
                        if (this.dp.getEntry('tarif.pricesTodayJson')) rawToday = this.dp.getRaw('tarif.pricesTodayJson');
                        if (this.dp.getEntry('tarif.pricesTomorrowJson')) rawTomorrow = this.dp.getRaw('tarif.pricesTomorrowJson');
                    }

                    const curve = [
                        ...parsePriceCurve(rawToday),
                        ...parsePriceCurve(rawTomorrow),
                    ].filter((it) => it && Number.isFinite(it.startMs) && Number.isFinite(it.endMs) && Number.isFinite(it.priceEurKwh));
                    curve.sort((a, b) => a.startMs - b.startMs);

                    const segs = [];
                    const eps = 1e-9;
                    for (const it of curve) {
                        const startMs = it.startMs;
                        const endMs = it.endMs;
                        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= now) continue;
                        if (startMs >= horizonEndMs) break;

                        const p = it.priceEurKwh;

                        // Approximate tariff state for planning (no hysteresis; conservative enough).
                        let state = 'neutral';
                        if (active && exp !== null && p >= (exp - eps)) {
                            state = 'teuer';
                        } else if (active) {
                            if (Number(modeInt) === 2 && cheap !== null && p <= (cheap + eps)) state = 'guenstig';
                            else if (Number(modeInt) !== 2 && cheapManual !== null && p <= (cheapManual + eps)) state = 'guenstig';
                        }

                        let allowGrid = true;
                        if (active) {
                            if (p < -1e-9) allowGrid = true;
                            else if (state === 'teuer') allowGrid = false;
                            else if (state === 'guenstig') allowGrid = !!allowEvcsCheap;
                            else allowGrid = true;
                        }

                        segs.push({ startMs, endMs, priceEurKwh: p, allowGrid });
                    }

                    tariffForecast = {
                        active,
                        modeInt: Number.isFinite(modeInt) ? Number(modeInt) : null,
                        prioInt: Number.isFinite(prioInt) ? Number(prioInt) : null,
                        allowEvcsCheap: !!allowEvcsCheap,
                        ref,
                        exp,
                        cheap,
                        cheapManual,
                        segments: segs,
                    };
                } catch (_e) {
                    tariffForecast = null;
                }
            }
        }

        /**
         * Compute allowed & covered duration for the given time range based on the forecast segments.
         * @param {Array<{startMs:number,endMs:number,allowGrid:boolean}>} segments
         * @param {number} startMs
         * @param {number} endMs
         * @returns {{allowedMs:number, coveredMs:number}}
         */
        /**
         * Code-Teil: Arrow-Funktion `computeAllowedAndCoverageMs`
         * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: computeAllowedAndCoverageMs
         * Zweck: Berechnet abgeleitete Werte.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const computeAllowedAndCoverageMs = (segments, startMs, endMs) => {
            let allowedMs = 0;
            let coveredMs = 0;
            if (!Array.isArray(segments) || segments.length === 0) return { allowedMs, coveredMs };
            for (const seg of segments) {
                if (!seg) continue;
                const s = Math.max(startMs, seg.startMs);
                const e = Math.min(endMs, seg.endMs);
                if (e <= s) continue;
                coveredMs += (e - s);
                if (seg.allowGrid) allowedMs += (e - s);
            }
            return { allowedMs, coveredMs };
        };

        /**
         * Decide whether we must override a tariff grid-charging lock in order to still reach the
         * configured goal deadline.
         *
         * @param {any} w wallbox entry
         * @returns {{override:boolean, reason:string}}
         */
        /**
         * Code-Teil: Arrow-Funktion `decideGoalTariffOverride`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: decideGoalTariffOverride
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const decideGoalTariffOverride = (w) => {
            try {
                if (!w || !w.goalActive) return { override: false, reason: '' };

                if (w.goalOverdue) return { override: true, reason: 'overdue' };

                const finishTs = Number(w.goalFinishTs);
                if (!Number.isFinite(finishTs) || finishTs <= now) return { override: true, reason: 'overdue' };

                const deltaSoc = Number(w.goalDeltaSocPct);
                if (!Number.isFinite(deltaSoc) || deltaSoc <= 0) return { override: false, reason: 'no_need' };

                const maxP = Number(w.maxPW);
                if (!Number.isFinite(maxP) || maxP <= 0) return { override: true, reason: 'no_power' };

                const battUser = Number(w.goalBatteryKwhUser);
                const battDefault = (String(w.chargerType || '').toUpperCase() === 'DC') ? 200 : 60;
                const battKwh = (Number.isFinite(battUser) && battUser > 0) ? battUser : battDefault;

                // Energy needed (Wh) with safety factor
                const needWhRaw = battKwh * 1000 * (deltaSoc / 100);
                const needWh = needWhRaw * goalForecastSafetyFactor;

                // Latest possible start time if we charge continuously with max power.
                const requiredMs = (needWh > 0) ? Math.round((needWh * 3600000) / maxP) : 0;
                const latestStart = finishTs - requiredMs;
                if (now >= (latestStart - goalForecastReserveMs)) {
                    return { override: true, reason: 'latest_start' };
                }

                // If we have a tariff forecast, estimate how much "allowed" time remains until the deadline.
                if (tariffForecast && Array.isArray(tariffForecast.segments) && tariffForecast.segments.length > 0) {
                    const { allowedMs, coveredMs } = computeAllowedAndCoverageMs(tariffForecast.segments, now, finishTs);
                    const remMs = finishTs - now;
                    if (remMs > 0 && coveredMs >= (remMs * goalForecastMinCoverage)) {
                        const deliverableWh = maxP * (allowedMs / 3600000);
                        if (deliverableWh + 1e-6 >= needWh) {
                            return { override: false, reason: 'forecast_ok' };
                        }

                        // Ohne Fahrzeug-SoC ist die Energiemenge nur eine konservative Schätzung
                        // (typisch: Ziel-% auf Basis der hinterlegten Akku-Kapazität). In diesem Fall
                        // soll der Tarif nachts weiter den Vorrang behalten und wir warten bis zum
                        // echten Latest-Start, statt schon tagsüber teuer zu laden.
                        if (w.goalSocAvailable !== true) {
                            return { override: false, reason: 'forecast_wait_no_soc' };
                        }

                        return { override: true, reason: 'forecast_insufficient' };
                    }
                    // Forecast exists but doesn't cover the full horizon reliably → fall back to latest-start.
                    return { override: false, reason: 'forecast_unreliable' };
                }

                // No forecast: fall back to legacy urgency thresholds (extra safety) and otherwise wait
                // until latest-start is reached.
                const remMin = (typeof w.goalRemainingMin === 'number' && Number.isFinite(w.goalRemainingMin)) ? w.goalRemainingMin : null;
                const urg = (typeof w.goalUrgency === 'number' && Number.isFinite(w.goalUrgency)) ? w.goalUrgency : null;
                const legacyOverride = (remMin !== null && remMin <= goalTariffOverrideMinRemainingMin)
                    || (urg !== null && urg >= goalTariffOverrideUrgency);
                if (legacyOverride) return { override: true, reason: 'legacy_urgency' };

                return { override: false, reason: 'wait' };
            } catch {
                return { override: false, reason: 'err' };
            }
        };

        for (const w of wbList) {
            let override = normalizeWallboxModeOverride(w.userMode);
            const boostNotAllowed = (override === 'boost' && w.allowBoost === false);
            if (boostNotAllowed) {
                override = 'auto';
                // If boost is disabled for this chargepoint, reset runtime mode to avoid confusing UI
                try {
                    await this._queueState(`${w.ch}.userMode`, 'auto', true);
                } catch {
                    // ignore
                }
            }

            // Effective boost timeout (minutes): per-wallbox override > global by charger type
            const typeDefaultMin = (String(w.chargerType || '').toUpperCase() === 'DC') ? boostTimeoutMinDc : boostTimeoutMinAc;
            const effBoostTimeoutMin = (Number.isFinite(Number(w.boostTimeoutMinOverride)) && Number(w.boostTimeoutMinOverride) > 0)
                ? Number(w.boostTimeoutMinOverride)
                : typeDefaultMin;

            // Ziel‑Laden Priorität / Tarif‑Bonus:
            // - Globale PV‑Only Einstellungen (pvSurplusOnlyCfg/Mode PV) bleiben dominant.
            // - Wenn der Tarif Netzladen sperrt (forcePvSurplusOnly), hängt das Verhalten vom
            //   goalTariffOverrideMode ab:
            //   - always   : Ziel übersteuert sofort (Legacy)
            //   - forecast : Tarif wirkt; Override nur wenn nötig (Forecast/Latest‑Start)
            //   - never    : nie übersteuern (kann Deadline verfehlen)
            let forcePvForW = forcePvSurplusOnly;
            let goalTariffOverrideActive = false;
            let goalTariffOverrideReason = '';
            if (forcePvForW && !pvSurplusOnlyCfg && w.enabled && w.online && w.goalActive) {
                if (goalTariffOverrideMode === 'always') {
                    forcePvForW = false;
                    goalTariffOverrideActive = true;
                    goalTariffOverrideReason = 'always';
                } else if (goalTariffOverrideMode === 'never') {
                    goalTariffOverrideReason = 'never';
                } else {
                    const dec = decideGoalTariffOverride(w);
                    if (dec && dec.override) {
                        forcePvForW = false;
                        goalTariffOverrideActive = true;
                    }
                    goalTariffOverrideReason = (dec && dec.reason) ? String(dec.reason) : (goalTariffOverrideActive ? 'override' : 'wait');
                }
            }

            // Boost runtime timer: starts when the chargepoint is actually charging in boost mode
            let boostSince = this._boostSinceMs.get(w.safe) || 0;
            let boostUntil = 0;
            let boostRemainingMin = 0;
            let boostTimedOut = false;

            if (override === 'boost') {
                const timeoutMs = (effBoostTimeoutMin > 0) ? Math.round(effBoostTimeoutMin * 60 * 1000) : 0;

                if ((!boostSince || !Number.isFinite(boostSince)) && w.charging) {
                    boostSince = now;
                }

                if (timeoutMs > 0 && boostSince && Number.isFinite(boostSince)) {
                    boostUntil = boostSince + timeoutMs;
                    boostRemainingMin = Math.max(0, Math.ceil((boostUntil - now) / 60000));

                    if (now >= boostUntil) {
                        boostTimedOut = true;
                        override = 'auto';
                        this._boostSinceMs.delete(w.safe);
                        boostSince = 0;
                        boostUntil = 0;
                        boostRemainingMin = 0;

                        // Switch off boost in runtime state (so VIS toggles back)
                        try {
                            await this._queueState(`${w.ch}.userMode`, 'auto', true);
                        } catch {
                            // ignore
                        }
                    } else {
                        this._boostSinceMs.set(w.safe, boostSince);
                    }
                } else {
                    // No timeout configured (0) or not started yet
                    if (boostSince && Number.isFinite(boostSince)) this._boostSinceMs.set(w.safe, boostSince);
                }
            } else {
                // Not in boost: clear timer state
                this._boostSinceMs.delete(w.safe);
                boostSince = 0;
            }

            // Determine effective per-wallbox mode (after possible timeout/not-allowed handling)
            let eff = 'normal';

            if (override === 'boost') {
                // "Boost" is an explicit user command: always behave as grid-allowed fast charging.
                // (Hard limits like §14a / Grid caps / Phase caps still apply later in the pipeline.)
                eff = 'boost';
            } else if (override === 'pv') {
                // Gate E: Bei negativem dynamischem Tarif wird Netzbezug bewusst bevorzugt.
                // Dann heben wir auch den PV-Modus temporär auf, damit die Ladepunkte
                // wirtschaftlich Netzstrom abnehmen können. Harte Netz-/Phasen-/§14a-
                // Grenzen bleiben weiter aktiv.
                eff = tariffGridImportPreferred ? 'normal' : 'pv';
            } else if (override === 'minpv') {
                // "Min+PV" hält normalerweise die Mindestladung und begrenzt Mehrleistung auf PV.
                // Bei Negativpreis wird daraus temporär ein normaler netzfreigegebener Modus.
                eff = tariffGridImportPreferred ? 'normal' : 'minpv';
            } else {
                // auto: follow global defaults
                eff = (forcePvForW || pvSurplusOnlyCfg) ? 'pv' : 'normal';
            }

            w.effectiveMode = eff;
            w._boostTimedOut = boostTimedOut;
            w._boostNotAllowed = boostNotAllowed;
            w._boostTimeoutMinEffective = effBoostTimeoutMin;

            if (w.enabled && w.online) {
                if (eff === 'pv' || eff === 'minpv') anyPvLimitedActive = true;
                if (eff === 'boost' || eff === 'minpv' || eff === 'normal') anyGridAllowedActive = true;
                if (eff === 'boost') anyBoostActive = true;
            }

            // Expose effective mode + boost runtime details for VIS/debugging
            try {
                await this._queueState(`${w.ch}.effectiveMode`, eff, true);
                await this._queueState(`${w.ch}.goalTariffOverride`, !!goalTariffOverrideActive, true);
                await this._queueState(`${w.ch}.goalTariffOverrideReason`, String(goalTariffOverrideReason || ''), true);
                await this._queueState(`${w.ch}.boostTimeoutMin`, Number.isFinite(effBoostTimeoutMin) ? effBoostTimeoutMin : 0, true);
                await this._queueState(`${w.ch}.boostActive`, eff === 'boost', true);
                await this._queueState(`${w.ch}.boostSince`, boostSince || 0, true);
                await this._queueState(`${w.ch}.boostUntil`, boostUntil || 0, true);
                await this._queueState(`${w.ch}.boostRemainingMin`, boostRemainingMin || 0, true);
            } catch {
                // ignore
            }
        }

        /**
         * Code-Teil: Arrow-Funktion `wallboxHasEvPriorityDemand`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: wallboxHasEvPriorityDemand
         * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const wallboxHasEvPriorityDemand = (w) => {
            if (!w || !w.enabled || !w.online) return false;
            const eff = String(w.effectiveMode || 'normal');
            if (eff !== 'pv' && eff !== 'minpv') return false;
            if (w.charging === true) return true;
            if (w.vehiclePlugged === true) return true;
            if (w.goalActive === true && w.vehiclePlugged !== false) return true;
            return false;
        };

        const evPriorityWallboxes = feneconEvPriorityActive
            ? wbList.filter(w => wallboxHasEvPriorityDemand(w))
            : [];
        const evPriorityRequested = !!(feneconEvPriorityActive && evPriorityWallboxes.length > 0);
        let evPriorityStorageYieldW = 0;
        let evPriorityStorageSource = '';
        let evPriorityLimitedWallboxes = 0;
        let evPriorityStarvedW = 0;
        let evPriorityPendingW = 0;

        // For backwards compatibility: only cap the *total* budget by PV when
        // (a) PV-only is globally active (config or tariff) AND
        // (b) no active wallbox is in a grid-allowed mode (normal/minpv/boost).
        const capTotalBudgetByPv = (pvSurplusOnlyCfg || forcePvSurplusOnly) && !anyGridAllowedActive;
        const needPvBudget = anyPvLimitedActive || capTotalBudgetByPv;
        // Das PV-Gate ist inzwischen ein zentrales Diagnose-/Budget-Signal für nachgelagerte Apps
        // (z. B. Heizstab). Deshalb muss der PV-Überschuss auch dann berechnet und veröffentlicht
        // werden, wenn gerade keine Wallbox im PV-Modus aktiv ist. Wichtig: Das beeinflusst NICHT
        // die EVCS-Budgetbegrenzung; angewendet wird pvCapW weiterhin nur, wenn needPvBudget/capTotalBudgetByPv aktiv ist.
        const needPvDiagnostics = true;

        // PV surplus / cap (used for PV-limited wallboxes; and optionally to cap total budget)
        let pvCapW = null;
        let pvSurplusW = null;
        let gridW = null;
        let gridImportW = 0;
        let gridImportNoEvW = null;
        let pvStartReadyBudgetW = null;

        // Gate B: PV hysteresis diagnostics (defaults)
        let pvCapRawWState = 0;
        let pvCapEffectiveWState = 0;
        let pvAvailableState = false;
        // Debug: PV surplus without EVCS (instant + smoothed)
        let pvSurplusNoEvRawWState = 0;
        let pvSurplusNoEvAvg5mWState = 0;
        // Central EMS budget coordinator: reserve the PV part used by EVCS later in the tick.
        let pvEvcsUsedWForBudget = 0;
        // Kundenauswahl aus dem zentralen EMS-Budget. Diese Diagnose bleibt auch
        // sichtbar, wenn aktuell keine Wallbox im PV-Modus laeuft.
        let pvAllocationModeState = 'both';
        let pvAllocationEvcsSharePctState = 50;
        let pvAllocationEvcsCapWState = 0;
        let pvAllocationUncappedWState = 0;
        let pvAllocationStorageActualChargeWState = 0;

        if (needPvBudget || needPvDiagnostics) {
            // PV-Überschuss sauber ermitteln:
            // Problem (vorher): PV-Cap wurde aus dem NVP (grid export) direkt abgeleitet.
            // Sobald die Wallbox startet, sinkt der Export (weil EVCS selbst verbraucht)
            // und der Algorithmus hat die Wallbox wieder abgeschaltet.
            //
            // Lösung: PV-Überschuss OHNE EVCS-Verbrauch berechnen:
            //   pvSurplusNoEv = (-gridW) + evcsW
            //   gridW: Import + / Export -, evcsW: aktuelle EVCS-Leistung (W)
            // => entspricht pvW - (Hauslast ohne EVCS)
            // Zusätzlich: 5-Minuten Durchschnitt für stabilere Regelung.

            const pvSurplusCfgW = getFirstDpNumber(['cm.pvSurplusW']);
            gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);

            // EVCS power estimation for PV surplus reconstruction
            // Why: Some wallboxes/meter datapoints update delayed. If we derive PV surplus only from the NVP
            // export (or from grid power + *actual* EVCS power), PV-only charging can "hop" around the AC
            // 3-phase minimum (~4.2kW): EVCS starts -> NVP export drops -> meter still reports 0W EVCS -> PV
            // budget collapses -> EVCS stops -> export rises -> ...
            //
            // Fix: Estimate EVCS consumption per connector using the last commanded setpoint as a fallback
            // whenever the measured power is still below the activity threshold (start-up / meter lag).
            let pvEvcsActualW = 0;
            let pvEvcsCmdW = 0;
            let pvEvcsUsedW = 0;

            try {
                for (const w of wbList) {
                    if (!w || !w.safe) continue;
                    if (!w.enabled || !w.online) continue;

                    const a = (typeof w.actualPowerW === 'number' && Number.isFinite(w.actualPowerW))
                        ? Math.max(0, Math.abs(w.actualPowerW))
                        : 0;
                    pvEvcsActualW += a;

                    const prevCmd = (this._lastCmdTargetW && typeof this._lastCmdTargetW.get === 'function')
                        ? this._lastCmdTargetW.get(w.safe)
                        : null;
                    const c = (typeof prevCmd === 'number' && Number.isFinite(prevCmd)) ? Math.max(0, prevCmd) : 0;
                    pvEvcsCmdW += c;

                    // If we recently commanded charging but the meter still reports ~0W, assume meter lag and
                    // use the command as the best available estimate for the current EVCS consumption.
                    let used = a;
                    if (c >= activityThresholdW && a < activityThresholdW) {
                        used = c;
                    }
                    pvEvcsUsedW += used;
                }
            } catch {
                // ignore
            }

            // Fallback (should not happen): use measured total power only
            if (!Number.isFinite(pvEvcsUsedW) || pvEvcsUsedW < 0) pvEvcsUsedW = 0;
            if (pvEvcsUsedW === 0) {
                pvEvcsUsedW = (typeof totalPowerW === 'number' && Number.isFinite(totalPowerW)) ? Math.max(0, totalPowerW) : 0;
                pvEvcsActualW = pvEvcsUsedW;
                pvEvcsCmdW = pvEvcsUsedW;
            }
            pvEvcsUsedWForBudget = Math.max(0, Math.round(pvEvcsUsedW || 0));

            // Diagnostics (UI)
            try {
                await this._queueState('chargingManagement.control.pvEvcsActualW', Math.round(pvEvcsActualW || 0), true);
                await this._queueState('chargingManagement.control.pvEvcsCmdW', Math.round(pvEvcsCmdW || 0), true);
                await this._queueState('chargingManagement.control.pvEvcsUsedW', Math.round(pvEvcsUsedW || 0), true);
            } catch {
                // ignore
            }

            const battSignedW = getFirstDpNumber(['st.batteryPowerW', 'ps.batteryW']);
            const storageChargeNowW = (typeof battSignedW === 'number' && Number.isFinite(battSignedW))
                ? Math.max(0, -battSignedW)
                : 0;
            const storageDischargeNowW = (typeof battSignedW === 'number' && Number.isFinite(battSignedW))
                ? Math.max(0, battSignedW)
                : 0;

            if (evPriorityRequested && storageChargeNowW > 0) {
                try {
                    const stStorageSource = await this._getStateCached('speicher.regelung.quelle');
                    evPriorityStorageSource = stStorageSource && stStorageSource.val !== null && stStorageSource.val !== undefined
                        ? String(stStorageSource.val || '')
                        : '';
                } catch {
                    evPriorityStorageSource = '';
                }

                const storageSourceNorm = String(evPriorityStorageSource || '').trim().toLowerCase();
                const nvpNoImport = (typeof gridW === 'number' && Number.isFinite(gridW) && gridW <= 150);
                const sourceLooksLikePvCharge = storageSourceNorm === 'pv'
                    || storageSourceNorm.includes('pv')
                    || storageSourceNorm.includes('überschuss')
                    || storageSourceNorm.includes('ueberschuss')
                    || storageSourceNorm.includes('nulleinspeisung')
                    || storageSourceNorm.includes('zero')
                    || storageSourceNorm === ''
                    || storageSourceNorm === 'idle'
                    || storageSourceNorm === 'fenecon';

                // EV-Priorität: Wenn ein PV-/Min+PV-Ladepunkt Bedarf hat und der Speicher gerade
                // PV-Überschuss aufnimmt, wird diese Leistung im EVCS-PV-Budget freigegeben.
                // Der Speicher-Regler bekommt im selben Tick das Block-Flag und nimmt seine
                // PV-Ladung zurück, sodass Wallboxen den Überschuss zuerst bekommen.
                if (nvpNoImport && sourceLooksLikePvCharge) {
                    evPriorityStorageYieldW = storageChargeNowW;
                }
            }

            /**
             * Code-Teil: Arrow-Funktion `pvDirectW`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
            /**
             * Code-Teil: pvDirectW
             * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
             */
            const pvDirectW = (() => {
                const dpPv = getFirstDpNumber(['ps.pvW']);
                if (typeof dpPv === 'number' && Number.isFinite(dpPv)) return Math.max(0, dpPv);

                const cachePv = this._getAdapterNumberFromCache('derived.core.pv.totalW', null);
                if (typeof cachePv === 'number' && Number.isFinite(cachePv)) return Math.max(0, cachePv);

                const cachePvRaw = this._getAdapterNumberFromCache('pvPower', null);
                if (typeof cachePvRaw === 'number' && Number.isFinite(cachePvRaw)) return Math.max(0, cachePvRaw);

                return null;
            })();

            /**
             * Code-Teil: Arrow-Funktion `loadTotalDirectW`
             * Zweck: lädt Daten aus API, State-Cache oder Konfiguration und stößt danach Rendering an.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
            /**
             * Code-Teil: loadTotalDirectW
             * Zweck: Lädt Daten aus API, States oder Konfiguration.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
             */
            const loadTotalDirectW = (() => {
                const loadDerived = this._getAdapterNumberFromCache('derived.core.building.loadTotalW', null);
                if (typeof loadDerived === 'number' && Number.isFinite(loadDerived)) return Math.max(0, loadDerived);

                const loadMapped = this._getAdapterNumberFromCache('consumptionTotal', null);
                if (typeof loadMapped === 'number' && Number.isFinite(loadMapped)) return Math.max(0, loadMapped);

                return null;
            })();

            let pvSurplusNoEvW = null;
            if (typeof pvDirectW === 'number' && Number.isFinite(pvDirectW)
                && typeof loadTotalDirectW === 'number' && Number.isFinite(loadTotalDirectW)) {
                // Bevorzugte direkte Berechnung des gesamten verteilbaren PV-Potentials:
                //   PV - Verbrauch ohne EVCS
                // Die aktuelle Speicherladung wird hier bewusst NICHT abgezogen. Sonst
                // waere der bereits vom Speicher gebundene PV-Anteil fuer Wallboxen unsichtbar
                // und die neue zentrale Prioritaet koennte ihn nicht zwischen Speicher und
                // E-Mobilitaet verteilen. Wer welchen Anteil bekommt, entscheidet danach
                // ausschliesslich `ems.budget.gates.pvAllocation`.
                const evcsForLoadW = (pvEvcsUsedW > pvEvcsActualW && loadTotalDirectW >= (pvEvcsUsedW - 100))
                    ? pvEvcsUsedW
                    : pvEvcsActualW;
                const baseLoadNoEvW = Math.max(0, loadTotalDirectW - evcsForLoadW);
                pvSurplusNoEvW = Math.max(0, pvDirectW - baseLoadNoEvW);
                gridImportNoEvW = Math.max(0, baseLoadNoEvW - pvDirectW);
            } else if (typeof gridW === 'number' && Number.isFinite(gridW)) {
                // Fallback-Rekonstruktion ohne direkte PV-/Verbrauchs-DPs. Wir rechnen
                // sowohl EVCS als auch die aktuelle Speicherladung zum sichtbaren Export
                // zurueck. Batterie-Entladung wird abgezogen, weil sie kein PV-Ueberschuss
                // ist und das Wallbox-Budget niemals kuenstlich vergroessern darf.
                pvSurplusNoEvW = Math.max(0, (-gridW) + pvEvcsUsedW + storageChargeNowW - storageDischargeNowW);
                gridImportNoEvW = Math.max(0, gridW - pvEvcsUsedW - storageChargeNowW + storageDischargeNowW);
            } else if (typeof pvSurplusCfgW === 'number' && Number.isFinite(pvSurplusCfgW)) {
                // Fallback wenn kein Grid-DP verfügbar (z. B. nur PV-Surplus DP konfiguriert)
                pvSurplusNoEvW = Math.max(0, pvSurplusCfgW);
            }

            // Publish raw value (before smoothing) for debugging
            pvSurplusNoEvRawWState = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW)) ? pvSurplusNoEvW : 0;

            const pvSurplusFastW = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW))
                ? this._pvSurplusAvgPush('fast5s', now, pvSurplusNoEvW)
                : 0;
            const pvSurplusAvg5mW = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW))
                ? this._pvSurplusAvgPush('slow5m', now, pvSurplusNoEvW)
                : 0;

            // Active control must fall FAST when PV collapses, but may rise more smoothly.
            // Therefore we use an asymmetric control value:
            // - rising edge: short rolling mean (avoids start/stop noise)
            // - falling edge: raw surplus immediately clamps the budget
            /**
             * Code-Teil: Arrow-Funktion `pvSurplusControlW`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
            /**
             * Code-Teil: pvSurplusControlW
             * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
             */
            const pvSurplusControlW = (() => {
                const raw = (typeof pvSurplusNoEvW === 'number' && Number.isFinite(pvSurplusNoEvW)) ? pvSurplusNoEvW : 0;
                const fast = (typeof pvSurplusFastW === 'number' && Number.isFinite(pvSurplusFastW)) ? pvSurplusFastW : raw;
                return Math.max(0, Math.min(raw, fast));
            })();

            // Active control uses the asymmetric fast window; the 5min window stays visible for diagnostics.
            pvSurplusW = pvSurplusControlW;
            pvSurplusNoEvAvg5mWState = (typeof pvSurplusAvg5mW === 'number' && Number.isFinite(pvSurplusAvg5mW)) ? pvSurplusAvg5mW : 0;

            const pvCapRawW = (typeof pvSurplusControlW === 'number' && Number.isFinite(pvSurplusControlW) && pvSurplusControlW > 0) ? pvSurplusControlW : 0;
            // PV-Überschussladen soll etwas ruhiger laufen und nicht auf Kante 0 W Netzbezug regeln.
            // Deshalb rechnen wir standardmäßig eine kleine Reserve auf die EV-Ladeleistung drauf.
            // Effektiv bleibt dadurch im PV-Budget ein Puffer (Default 500 W), der kurze Messwertsprünge,
            // Rundungsfehler und minimale Hauslaständerungen abfedert, ohne die restliche Logik zu ändern.
            const pvChargeReserveW = clamp(num(cfg.pvChargeReserveW, 500), 0, 1e12);
            const pvCapBudgetW = Math.max(0, pvCapRawW - pvChargeReserveW);
            pvAllocationUncappedWState = pvCapBudgetW;
            pvAllocationStorageActualChargeWState = Math.max(0, Math.round(storageChargeNowW || 0));

            // Die Kundenauswahl wird im Core-Limits-Modul aus demselben physikalischen
            // PV-Budget erzeugt. Sie begrenzt nur PV-/Min+PV-Wallboxen; Normal-/Boost-
            // und dynamische Tarifpfade bleiben davon unberuehrt.
            const centralBudget = this.adapter && this.adapter._emsBudget;
            const allocationGate = centralBudget
                && centralBudget.gates
                && centralBudget.gates.pvAllocation
                && typeof centralBudget.gates.pvAllocation === 'object'
                ? centralBudget.gates.pvAllocation
                : null;
            if (allocationGate) {
                pvAllocationModeState = String(allocationGate.mode || 'both');
                pvAllocationEvcsSharePctState = Number.isFinite(Number(allocationGate.evcsSharePct))
                    ? Math.max(0, Math.min(100, Number(allocationGate.evcsSharePct)))
                    : 50;
                pvAllocationEvcsCapWState = Number.isFinite(Number(allocationGate.evcsCapW))
                    ? Math.max(0, Number(allocationGate.evcsCapW))
                    : pvCapBudgetW;
            } else {
                // Rueckwaertskompatibler Fallback, falls Core-Limits in einem alten
                // Laufzeitstand noch keinen Allocation-Gate bereitstellt.
                pvAllocationModeState = 'legacy-full-evcs';
                pvAllocationEvcsSharePctState = 100;
                pvAllocationEvcsCapWState = pvCapBudgetW;
            }
            const pvCapAllocatedW = Math.max(0, Math.min(pvCapBudgetW, pvAllocationEvcsCapWState));
            pvStartReadyBudgetW = pvCapAllocatedW;
            pvCapW = pvCapAllocatedW;

            // -----------------------------------------------------------------
            // Gate B: PV hysteresis / start-stop protection
            // Prevent rapid start/stop when PV surplus is very low / fluctuating.
            // For PV-only modes this is a START gate (no grid import intended).
            // -----------------------------------------------------------------
            const pvStartThresholdW = clamp(num(cfg.pvStartThresholdW, 800), 0, 1e12);
            const pvStopThresholdW  = clamp(num(cfg.pvStopThresholdW, 200), 0, 1e12);
            const pvStartDelayMs    = clamp(num(cfg.pvStartDelaySec, 10), 0, 3600) * 1000;
            const pvStopDelayMs     = clamp(num(cfg.pvStopDelaySec, 30), 0, 3600) * 1000;
            const pvAbortImportW    = clamp(num(cfg.pvAbortImportW, 600), 0, 1e12);

            // Ensure stop threshold is not above start threshold (avoid inverted hysteresis)
            const startW = pvStartThresholdW;
            const stopW  = Math.min(pvStopThresholdW, (startW > 0 ? startW : pvStopThresholdW));

            const pvStartSettleMs = clamp(num(cfg.pvStartSettleSec, 20), 0, 3600) * 1000;
            const pvStartupHoldActive = (pvStartSettleMs > 0)
                && wbList.some((w) => w && w.enabled && w.online
                    && (w.effectiveMode === 'pv' || w.effectiveMode === 'minpv')
                    && Number.isFinite(Number(w.pvStartupHoldUntilMs))
                    && Number(w.pvStartupHoldUntilMs) > now);

            gridImportW = (typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.max(0, gridW) : 0;
            // Wichtig: Den Stop-Gate nicht auf EV-eigenen Start-/Hochlauf-Import triggern.
            // Während der Start-Einschwingzeit tolerieren wir kurze Übergänge, damit die Wallbox
            // sauber am Fahrzeug ankommt und nicht sofort wieder auf 0 fällt.
            if (!(typeof gridImportNoEvW === 'number' && Number.isFinite(gridImportNoEvW))) {
                gridImportNoEvW = (typeof gridW === 'number' && Number.isFinite(gridW))
                    ? Math.max(0, gridW - pvEvcsUsedW - storageChargeNowW + storageDischargeNowW)
                    : 0;
            }
            const forcedBelow = !pvStartupHoldActive && (pvAbortImportW > 0 && gridImportNoEvW > pvAbortImportW);
            const suppressStopGate = pvStartupHoldActive && pvCapAllocatedW > 0;

            const above = (!forcedBelow) && ((startW > 0) ? (pvCapAllocatedW >= startW) : (pvCapAllocatedW > 0));
            const below = !suppressStopGate && (forcedBelow || (pvCapAllocatedW <= stopW));

            let pvAvail = !!this._pvAvailable;

            if (above) {
                if (!this._pvAboveSinceMs) this._pvAboveSinceMs = now;
                this._pvBelowSinceMs = 0;
                if (!pvAvail && (pvStartDelayMs <= 0 || (now - this._pvAboveSinceMs) >= pvStartDelayMs)) {
                    pvAvail = true;
                }
            } else if (below) {
                if (!this._pvBelowSinceMs) this._pvBelowSinceMs = now;
                this._pvAboveSinceMs = 0;
                if (pvAvail && (pvStopDelayMs <= 0 || (now - this._pvBelowSinceMs) >= pvStopDelayMs)) {
                    pvAvail = false;
                }
            } else {
                // Between thresholds: keep current state, reset timers to require stable crossing again
                this._pvAboveSinceMs = 0;
                this._pvBelowSinceMs = 0;
            }

            this._pvAvailable = pvAvail;
            pvCapW = pvAvail ? pvCapAllocatedW : 0;

            pvCapRawWState = pvCapRawW;
            pvCapEffectiveWState = (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : 0;
            pvAvailableState = pvAvail;

        }

        if (!needPvBudget && !needPvDiagnostics) {
            this._pvAvailable = false;
            this._pvAboveSinceMs = 0;
            this._pvBelowSinceMs = 0;
            pvCapRawWState = 0;
            pvCapEffectiveWState = 0;
            pvAvailableState = false;
            pvSurplusNoEvRawWState = 0;
            pvSurplusNoEvAvg5mWState = 0;
        }

        // Publish PV diagnostics (even if PV budgeting is not active)
        try {
            await this._queueState('chargingManagement.control.pvCapRawW', pvCapRawWState || 0, true);
            await this._queueState('chargingManagement.control.pvCapEffectiveW', pvCapEffectiveWState || 0, true);
            await this._queueState('chargingManagement.control.pvAvailable', !!pvAvailableState, true);
            await this._queueState('chargingManagement.control.pvSurplusNoEvRawW', pvSurplusNoEvRawWState || 0, true);
            await this._queueState('chargingManagement.control.pvSurplusNoEvAvg5mW', pvSurplusNoEvAvg5mWState || 0, true);
            await this._queueState('chargingManagement.control.pvAllocationMode', String(pvAllocationModeState || 'both'), true);
            await this._queueState('chargingManagement.control.pvAllocationEvcsSharePct', Math.round(Number(pvAllocationEvcsSharePctState) || 0), true);
            await this._queueState('chargingManagement.control.pvAllocationEvcsCapW', Math.round(Number(pvAllocationEvcsCapWState) || 0), true);
            await this._queueState('chargingManagement.control.pvAllocationUncappedW', Math.round(Number(pvAllocationUncappedWState) || 0), true);
            await this._queueState('chargingManagement.control.pvAllocationStorageActualChargeW', Math.round(Number(pvAllocationStorageActualChargeWState) || 0), true);
        } catch {
            // ignore
        }

        if (budgetMode === 'engine') {
            /** @type {Array<{k:string, w:number}>} */
            const components = [];

            // Static hard cap (optional)
            if (staticBudgetW > 0) components.push({ k: 'static', w: staticBudgetW });

            // External cap (optional)
            const ext = (budgetPowerId && this.dp) ? this.dp.getNumber('cm.budgetPowerW', null) : null;
            if (typeof ext === 'number' && Number.isFinite(ext) && ext > 0) components.push({ k: 'external', w: ext });

            // Peak-shaving cap (optional)
            const peak = await this._getPeakShavingBudgetW();
            if (typeof peak === 'number' && Number.isFinite(peak) && peak > 0) components.push({ k: 'peakShaving', w: peak });

            // Tariff cap (optional via globalDatapoints mapping)
            /**
             * Code-Teil: Arrow-Funktion `coreTariffW`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
            /**
             * Code-Teil: coreTariffW
             * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
             */
            const coreTariffW = (() => {
                try {
                    const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
                    const n = caps && caps.tariff ? num(caps.tariff.budgetW, null) : null;
                    return (typeof n === 'number' && Number.isFinite(n) && n > 0) ? n : null;
                } catch {
                    return null;
                }
            })();

            const tariffRaw = (typeof coreTariffW === 'number') ? coreTariffW : getFirstDpNumber(['cm.tariffBudgetW', 'cm.tariffLimitW']);

            // Boost: user explicitly requests full charging -> ignore tariff budget cap.
            if (!anyBoostActive && typeof tariffRaw === 'number' && Number.isFinite(tariffRaw) && tariffRaw > 0) {
                let tariffEff = tariffRaw;
                let tariffKey = 'tariff';

                // If the storage tariff charging is blocked by PV-Reserve (Forecast),
                // do NOT reserve EVCS power for the storage. In that case "tariffBudgetW"
                // can be artificially low (baseW - reserveW) and would block EVCS charging.
                try {
                    const stPvBlock = await this._getStateCached('speicher.regelung.tarifPvBlock');
                    const pvBlock = stPvBlock ? !!stPvBlock.val : false;

                    if (pvBlock) {
                        const stBase = await this._getStateCached('tarif.ladeparkMaxW');
                        const baseW = stBase ? Number(stBase.val) : NaN;

                        if (Number.isFinite(baseW) && baseW > 0 && baseW >= tariffRaw) {
                            tariffEff = baseW;
                            tariffKey = 'tariff(pvReserve)';
                        }
                    }
                } catch {
                    // ignore
                }

                components.push({ k: tariffKey, w: tariffEff });
            }

            // PV-surplus cap (legacy / compatibility): only used to cap the *total* budget when required.
            if (capTotalBudgetByPv && typeof pvCapW === 'number' && Number.isFinite(pvCapW)) {
                components.push({ k: 'pvSurplus', w: pvCapW });
            }

if (components.length) {
                let min = Number.POSITIVE_INFINITY;
                for (const c of components) {
                    const w = Number(c.w);
                    if (Number.isFinite(w)) min = Math.min(min, w);
                }
                budgetW = Number.isFinite(min) ? min : Number.POSITIVE_INFINITY;

                const eps = 0.001;
                const bind = components
                    .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - budgetW) <= eps)
                    .map(c => c.k);

                effectiveBudgetMode = `engine:${bind.length ? bind.join('+') : 'unlimited'}`;
            } else {
                budgetW = Number.POSITIVE_INFINITY;
                effectiveBudgetMode = 'engine:unlimited';
            }

            budgetDebug = {
                engine: true,
                mode,
                pvSurplusOnlyCfg,
                pvSurplusOnlyCfgBase,
                tariffNegativeActive,
                tariffGridImportPreferred,
                forcePvSurplusOnly,
                gridChargeAllowed,
                dischargeAllowed,
                capTotalBudgetByPv,
                anyPvLimitedActive,
                anyGridAllowedActive,
                pvCapRawW: (typeof pvCapRawWState === 'number' && Number.isFinite(pvCapRawWState)) ? pvCapRawWState : null,
                pvCapW: (typeof pvCapW === 'number' && Number.isFinite(pvCapW)) ? pvCapW : null,
                pvCapEffectiveW: (typeof pvCapEffectiveWState === 'number' && Number.isFinite(pvCapEffectiveWState)) ? pvCapEffectiveWState : null,
                pvAvailable: !!pvAvailableState,
                gridW: (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null,
                gridImportNoEvW: (typeof gridImportNoEvW === 'number' && Number.isFinite(gridImportNoEvW)) ? gridImportNoEvW : null,
                pvSurplusW: (typeof pvSurplusW === 'number' && Number.isFinite(pvSurplusW)) ? pvSurplusW : null,
                pvSurplusAvg5mW: (typeof pvSurplusNoEvAvg5mWState === 'number' && Number.isFinite(pvSurplusNoEvAvg5mWState)) ? pvSurplusNoEvAvg5mWState : null,
                pvAllocationMode: String(pvAllocationModeState || ''),
                pvAllocationEvcsSharePct: Math.round(Number(pvAllocationEvcsSharePctState) || 0),
                pvAllocationEvcsCapW: Math.round(Number(pvAllocationEvcsCapWState) || 0),
                pvAllocationUncappedW: Math.round(Number(pvAllocationUncappedWState) || 0),
                pvAllocationStorageActualChargeW: Math.round(Number(pvAllocationStorageActualChargeWState) || 0),
                evPriorityStorageYieldW: Math.round(evPriorityStorageYieldW || 0),
                components,
            };
        } else if (budgetMode === 'static') {
            budgetW = staticBudgetW > 0 ? staticBudgetW : Number.POSITIVE_INFINITY;
        } else if (budgetMode === 'fromDatapoint') {
            const b = (budgetPowerId && this.dp) ? this.dp.getNumber('cm.budgetPowerW', null) : null;
            budgetW = (typeof b === 'number' && b > 0) ? b : Number.POSITIVE_INFINITY;
        } else if (budgetMode === 'fromPeakShaving') {
            const b = await this._getPeakShavingBudgetW();
            budgetW = (typeof b === 'number' && b > 0) ? b : Number.POSITIVE_INFINITY;
        } else {
            budgetW = Number.POSITIVE_INFINITY;
        }


        // Backwards compatibility: if PV-only is globally active AND no wallbox is grid-allowed,
        // enforce the PV cap for ALL budget modes.
        if (capTotalBudgetByPv && typeof pvCapW === 'number' && Number.isFinite(pvCapW)) {
            const cap = Math.max(0, pvCapW);
            const cur = (typeof budgetW === 'number' && Number.isFinite(budgetW)) ? budgetW : Number.POSITIVE_INFINITY;
            budgetW = Math.max(0, Math.min(cur, cap));

            if (!String(effectiveBudgetMode || '').includes('pvSurplus')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+pvSurplus`;
            }

            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.pvCapAppliedW = cap;
                budgetDebug.budgetAfterPvCapW = budgetW;
            }
        }

        // ---------------------------------------------------------------------
        // Gate A: HARD GRID SAFETY CAPS (always top priority)
        // - Grid import limit (Netzanschlussleistung) based on live meter (W)
        // - Optional phase current limit (A) based on live meter (L1/L2/L3)
        // These caps apply regardless of Boost/PV modes and regardless of the selected budget mode.
        // ---------------------------------------------------------------------

        // Config sources for the grid connection import limit (W):
        // - installerConfig.gridConnectionPower (single source of truth)
        // - legacy fallback: PeakShaving.maxPowerW (only if EMS limit is not configured)
        // Phase 4.0: prefer centralized caps snapshot (ems.core) if available.
        const coreCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const coreGridCfgW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridConnectionLimitW_cfg, null) : null;
        const coreGridEffW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridImportLimitW_effective, null) : null;
        const coreGridMarginW = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridSafetyMarginW, null) : null;
        const coreMaxPhaseA = coreCaps && coreCaps.grid ? num(coreCaps.grid.gridMaxPhaseA_cfg, null) : null;

        const instLimitW = clamp(num(this.adapter?.config?.installerConfig?.gridConnectionPower, 0), 0, 1e12);
        const psLimitW = clamp(num(this.adapter?.config?.peakShaving?.maxPowerW, 0), 0, 1e12);
        const gridImportLimitW = (Number.isFinite(coreGridCfgW) && coreGridCfgW > 0)
            ? coreGridCfgW
            : ((typeof instLimitW === 'number' && Number.isFinite(instLimitW) && instLimitW > 0)
                ? instLimitW
                : ((typeof psLimitW === 'number' && Number.isFinite(psLimitW) && psLimitW > 0) ? psLimitW : 0));

        // Safety margin (W): prefer core snapshot, fallback to PeakShaving.safetyMarginW.
        const gridMarginW = (Number.isFinite(coreGridMarginW) && coreGridMarginW >= 0)
            ? coreGridMarginW
            : clamp(num(this.adapter?.config?.peakShaving?.safetyMarginW, 0), 0, 1e12);

        // Effective import cap (W): prefer core snapshot (may include Grid-Constraints / RLM caps).
        const gridImportLimitEffW = (Number.isFinite(coreGridEffW) && coreGridEffW > 0)
            ? coreGridEffW
            : (gridImportLimitW > 0 ? Math.max(0, gridImportLimitW - gridMarginW) : 0);

        // Optional phase limit (A): prefer core snapshot.
        const gridMaxPhaseA = (Number.isFinite(coreMaxPhaseA) && coreMaxPhaseA > 0)
            ? coreMaxPhaseA
            : clamp(num(this.adapter?.config?.peakShaving?.maxPhaseA, 0), 0, 20000);

        // Read grid power (import + / export -) if needed for caps
        const needGridSafetyCaps = gridImportLimitEffW > 0 || gridMaxPhaseA > 0;
        if (needGridSafetyCaps) {
            // Ensure we have a gridW reading even if PV logic is not active
            if (typeof gridW !== 'number' || !Number.isFinite(gridW)) {
                gridW = getFirstDpNumber(['cm.gridPowerW', 'grid.powerW', 'ps.gridPowerW']);
            }
        }

        // Derive base load and EVCS cap from import limit
        let gridBaseLoadW = null;
        let gridBaseLoadRawW = null;
        let gridLocalSupportW = null;
        let gridCapEvcsW = null;
        let gridCapBinding = false;
        const budgetBeforeGridCaps = budgetW;
        const budgetModeBeforeGridCaps = String(effectiveBudgetMode || budgetMode || 'unlimited');

        if (gridImportLimitEffW > 0 && typeof gridW === 'number' && Number.isFinite(gridW)) {
            // 0.8.61: load-management grid cap regression guard.
            //
            // A battery discharge can make the old approximation `gridW - EVCS`
            // negative while the building still consumes power. Using that negative
            // value increased the visible EVCS cap above the physical connection
            // (e.g. 40 kW -> 50.94 kW). That is unsafe and confusing.
            //
            // Prefer the central energy-flow building load without EV/extras when it
            // is fresh. That keeps the cap aligned with "Netzanschluss minus realer
            // Verbrauch". If the central value is not available, fall back to the
            // grid equation but clamp the effective base load to >= 0. In every case
            // the cap is hard-clamped to the effective grid limit.
            const gridEvcsActualForCapW = Number.isFinite(totalFreshActualPowerW) ? Math.max(0, Number(totalFreshActualPowerW)) : 0;
            const gridEvcsReserveIgnoredForCapW = Math.max(0, (Number.isFinite(totalPowerW) ? Number(totalPowerW) : 0) - gridEvcsActualForCapW);
            // Wichtig: Für das Netzanschluss-Gate zählt nur frisch gemessene EVCS-Leistung.
            // Alte Setpoints/Reservierungen dürfen nicht vom Netzbezug abgezogen werden,
            // sonst sieht Gate A ein fiktives freies Budget und der Status bleibt bei
            // alten Ladeleistungen stehen, obwohl der Energiefluss EVCS = 0 W zeigt.
            gridBaseLoadRawW = gridW - gridEvcsActualForCapW;
            let derivedBaseLoadW = null;
            let derivedBaseLoadSource = '';
            try {
                const candidates = [
                    ['derived.core.building.loadRestW', 'derived.core.building.loadRestW'],
                    ['historie.core.building.loadRestW', 'historie.core.building.loadRestW'],
                    ['derived.core.building.loadTotalW', 'derived.core.building.loadTotalW'],
                    ['historie.core.building.loadTotalW', 'historie.core.building.loadTotalW'],
                    ['consumptionTotal', 'consumptionTotal'],
                ];
                for (const [id, source] of candidates) {
                    const st = await this._getStateCached(id);
                    const ts = st && Number(st.ts || st.lc || 0);
                    const fresh = !Number.isFinite(ts) || ts <= 0 || (Date.now() - ts) <= Math.max(staleTimeoutMs, 120000);
                    const v = st ? Number(st.val) : NaN;
                    if (fresh && Number.isFinite(v) && v >= 0) {
                        derivedBaseLoadW = Math.max(0, v);
                        derivedBaseLoadSource = source;
                        break;
                    }
                }
            } catch (_eBaseLoad) {}
            gridBaseLoadW = Number.isFinite(Number(derivedBaseLoadW)) ? Math.max(0, Number(derivedBaseLoadW)) : Math.max(0, gridBaseLoadRawW);
            gridLocalSupportW = Math.max(0, gridBaseLoadW - Math.max(0, gridBaseLoadRawW));
            // Max EVCS total to keep grid import under limit: baseLoad + EVCS <= limit.
            // Hard cap: EVCS Cap (Netz sicher) must stay <= effective grid limit.
            gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW);
            try {
                budgetDebug = budgetDebug || {};
                budgetDebug.gridBaseLoadSource = derivedBaseLoadSource || 'gridW-minus-fresh-evcs-clamped';
                budgetDebug.gridEvcsActualForCapW = gridEvcsActualForCapW;
                budgetDebug.gridEvcsReserveIgnoredForCapW = gridEvcsReserveIgnoredForCapW;
            } catch (_eBaseLoadDebug) {}

            // Apply cap (always)
            const before = budgetW;
            if (!Number.isFinite(budgetW)) {
                budgetW = gridCapEvcsW;
            } else {
                budgetW = Math.min(budgetW, gridCapEvcsW);
            }
            gridCapBinding = (Number.isFinite(gridCapEvcsW) && (before !== budgetW));

            if (!String(effectiveBudgetMode || '').includes('gridImport')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+gridImport`;
            }
        }

        // Phase-based cap (conservative: assumes additional power may hit the worst phase)
        let worstPhaseA = null;
        let phaseCapEvcsW = null;
        let phaseCapBinding = false;

        if (gridMaxPhaseA > 0) {
            const l1 = getFirstDpNumber(['ps.l1A']);
            const l2 = getFirstDpNumber(['ps.l2A']);
            const l3 = getFirstDpNumber(['ps.l3A']);
            const phases = [l1, l2, l3].filter(v => typeof v === 'number' && Number.isFinite(v));
            if (phases.length) {
                worstPhaseA = Math.max(...phases);
                const slackA = gridMaxPhaseA - worstPhaseA;
                // Conservative conversion: 1-phase equivalent (230V)
                const v = voltageV;
                phaseCapEvcsW = clamp((Number.isFinite(totalPowerW) ? totalPowerW : 0) + (Number.isFinite(slackA) ? slackA : 0) * v, 0, 1e12);

                const before = budgetW;
                if (!Number.isFinite(budgetW)) {
                    budgetW = phaseCapEvcsW;
                } else {
                    budgetW = Math.min(budgetW, phaseCapEvcsW);
                }
                phaseCapBinding = (Number.isFinite(phaseCapEvcsW) && (before !== budgetW));

                if (!String(effectiveBudgetMode || '').includes('phaseCap')) {
                    effectiveBudgetMode = `${effectiveBudgetMode}+phaseCap`;
                }
            } else {
                // No phase readings while a phase limit is configured => treat as stale (handled by stale logic below)
                worstPhaseA = null;
            }
        }

        // ---------------------------------------------------------------------
        // Gate A2: §14a EnWG cap (optional, provided by Para14aModule)
        // If active, cap the EVCS budget in addition to other safety caps.
        // ---------------------------------------------------------------------
        let para14aBinding = false;
        if (para14aActive && typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW) && para14aTotalCapW > 0) {
            const before = budgetW;
            if (!Number.isFinite(budgetW)) {
                budgetW = para14aTotalCapW;
            } else {
                budgetW = Math.min(budgetW, para14aTotalCapW);
            }
            para14aBinding = (before !== budgetW);

            if (!String(effectiveBudgetMode || '').includes('14a')) {
                effectiveBudgetMode = `${effectiveBudgetMode}+14a`;
            }
        }

        /**
         * TS-Migration 0.7.123: Budget-Caps produktiv über TypeScript übernehmen.
         *
         * Wichtig:
         * - Der TS-Helfer darf nur Grid-/Phasen-/§14a-Caps übernehmen.
         * - Ladepunktverteilung, Failsafe, Boost und Setpoint-Schreiben bleiben weiterhin JavaScript.
         * - Merksatz für die Migration: Ladepunktverteilung und Setpoint-Schreiben bleiben weiterhin JavaScript.
         * - Ladepunktverteilung, Failsafe, Boost und Setpoint-Schreiben bleiben JS.
         * - PV-/Min+PV-Logik und Wallbox-Verteilung bleiben ebenfalls JS.
         * - Bei Mismatch/Fehler bleibt JS führend.
         */
        const chargingBudgetTsProductive = await this._runChargingBudgetTsProductive({
            budgetW: Number.isFinite(budgetBeforeGridCaps) ? budgetBeforeGridCaps : null,
            budgetMode: budgetModeBeforeGridCaps,
            gridBaseLoadRawW: (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : null,
            gridLocalSupportW: (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : null,
            gridCapEvcsW: (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : null,
            // For TS parity this flag means 'cap is active/available'; the returned apply.gridCapBinding still means 'actually binding'.
            gridCapBinding: (gridImportLimitEffW > 0 && typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)),
            phaseCapEvcsW: (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : null,
            // For TS parity this flag means 'cap is active/available'; the returned apply.phaseCapBinding still means 'actually binding'.
            phaseCapBinding: (gridMaxPhaseA > 0 && typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)),
            para14aActive: !!para14aActive,
            para14aTotalCapW: (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : null,
            para14aMode: para14aMode || '',
        }, {
            budgetAfterW: Number.isFinite(budgetW) ? Math.round(budgetW) : null,
            effectiveBudgetMode: String(effectiveBudgetMode || ''),
            gridCapApplied: !!gridCapBinding,
            phaseCapApplied: !!phaseCapBinding,
            para14aApplied: !!para14aBinding,
        });
        if (chargingBudgetTsProductive && chargingBudgetTsProductive.productive && chargingBudgetTsProductive.apply) {
            const tsApply = chargingBudgetTsProductive.apply;
            budgetW = (typeof tsApply.budgetW === 'number' && Number.isFinite(tsApply.budgetW)) ? tsApply.budgetW : Number.POSITIVE_INFINITY;
            effectiveBudgetMode = String(tsApply.effectiveBudgetMode || effectiveBudgetMode || 'unlimited');
            gridCapBinding = !!tsApply.gridCapBinding;
            phaseCapBinding = !!tsApply.phaseCapBinding;
            para14aBinding = !!tsApply.para14aBinding;
            if (typeof tsApply.gridCapEvcsW === 'number' && Number.isFinite(tsApply.gridCapEvcsW)) gridCapEvcsW = tsApply.gridCapEvcsW;
            if (typeof tsApply.phaseCapEvcsW === 'number' && Number.isFinite(tsApply.phaseCapEvcsW)) phaseCapEvcsW = tsApply.phaseCapEvcsW;
            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.tsBudgetProductive = true;
                budgetDebug.tsBudgetSource = 'ts-budget-productive';
                budgetDebug.tsBudgetFallback = false;
                budgetDebug.budgetAfterSafetyCapsW = Number.isFinite(budgetW) ? budgetW : null;
            }
        } else if (budgetDebug && typeof budgetDebug === 'object') {
            budgetDebug.tsBudgetProductive = false;
            budgetDebug.tsBudgetSource = 'js-runtime';
            budgetDebug.tsBudgetFallback = true;
            budgetDebug.tsBudgetFallbackReason = chargingBudgetTsProductive && chargingBudgetTsProductive.fallbackReason ? chargingBudgetTsProductive.fallbackReason : 'unknown';
        }

        // Publish cap diagnostics (even when caps are not configured)
        try {
            await this._queueState('chargingManagement.control.gridImportLimitW', gridImportLimitW || 0, true);
            await this._queueState('chargingManagement.control.gridImportLimitW_effective', gridImportLimitEffW || 0, true);
            await this._queueState('chargingManagement.control.gridImportW', (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : 0, true);
            await this._queueState('chargingManagement.control.gridBaseLoadW', (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : 0, true);
            await this._queueState('chargingManagement.control.gridBaseLoadRawW', (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : 0, true);
            await this._queueState('chargingManagement.control.gridLocalSupportW', (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : 0, true);
            await this._queueState('chargingManagement.control.gridEvcsActualForCapW', (typeof totalFreshActualPowerW === 'number' && Number.isFinite(totalFreshActualPowerW)) ? totalFreshActualPowerW : 0, true);
            await this._queueState('chargingManagement.control.gridEvcsReserveIgnoredForCapW', Math.max(0, (Number.isFinite(totalPowerW) ? totalPowerW : 0) - (Number.isFinite(totalFreshActualPowerW) ? totalFreshActualPowerW : 0)), true);
            await this._queueState('chargingManagement.control.gridCapEvcsW', (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : 0, true);
            await this._queueState('chargingManagement.control.gridCapBinding', !!gridCapBinding, true);
            await this._queueState('chargingManagement.control.gridMaxPhaseA', gridMaxPhaseA || 0, true);
            await this._queueState('chargingManagement.control.gridWorstPhaseA', (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : 0, true);
            await this._queueState('chargingManagement.control.gridPhaseCapEvcsW', (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : 0, true);
            await this._queueState('chargingManagement.control.phaseCapBinding', !!phaseCapBinding, true);

            // §14a transparency
            await this._queueState('chargingManagement.control.para14aActive', !!para14aActive, true);
            await this._queueState('chargingManagement.control.para14aMode', para14aMode || '', true);
            await this._queueState('chargingManagement.control.para14aCapEvcsW', (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : 0, true);
            await this._queueState('chargingManagement.control.para14aBinding', !!para14aBinding, true);
        } catch {
            // ignore
        }

        // Extend debug payload
        if (budgetDebug && typeof budgetDebug === 'object') {
            budgetDebug.gridImportLimitW = gridImportLimitW || 0;
            budgetDebug.gridImportLimitEffW = gridImportLimitEffW || 0;
            budgetDebug.gridW = (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null;
            // 0.8.64: EVCS-Ist darf nie aus Reservierung/Setpoint kommen.
            // Für Gate-/Statusdiagnose ist ausschließlich der frische Messwert gültig;
            // Reservierung bleibt separat als totalReservedPowerW sichtbar.
            // 0.8.65: Die finale EVCS-Reservierung wird nach der Allocation aus aktivem Ladebedarf gesetzt.
            budgetDebug.evcsActualW = (typeof totalFreshActualPowerW === 'number' && Number.isFinite(totalFreshActualPowerW)) ? totalFreshActualPowerW : 0;
            budgetDebug.evcsPotentialReservedW = (typeof totalPowerW === 'number' && Number.isFinite(totalPowerW)) ? totalPowerW : 0;
            budgetDebug.gridBaseLoadW = (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : null;
            budgetDebug.gridBaseLoadRawW = (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : null;
            budgetDebug.gridLocalSupportW = (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : null;
            budgetDebug.gridCapEvcsW = (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : null;
            budgetDebug.gridCapBinding = !!gridCapBinding;
            budgetDebug.gridMaxPhaseA = gridMaxPhaseA || 0;
            budgetDebug.worstPhaseA = (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : null;
            budgetDebug.phaseCapEvcsW = (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : null;
            budgetDebug.phaseCapBinding = !!phaseCapBinding;
            budgetDebug.para14aActive = !!para14aActive;
            budgetDebug.para14aMode = para14aMode || '';
            budgetDebug.para14aCapEvcsW = (typeof para14aTotalCapW === 'number' && Number.isFinite(para14aTotalCapW)) ? para14aTotalCapW : null;
            budgetDebug.para14aBinding = !!para14aBinding;
            budgetDebug.budgetBeforeSafetyCapsW = Number.isFinite(budgetBeforeGridCaps) ? budgetBeforeGridCaps : null;
            budgetDebug.budgetAfterSafetyCapsW = Number.isFinite(budgetW) ? budgetW : null;
        }

        const peakActive = await this._getPeakShavingActive();
        const pausedByPeakShaving = pauseWhenPeakShavingActive && peakActive;
        let pauseFollowPeakBudget = false;
        let pauseFollowGridCaps = false;

        // Gate C: Speicher-Unterstützung (optional)
        // Ziel: Bei hohem Speicher-SoC kann zusätzliche Ladeleistung durch Batterie-Entladung bereitgestellt werden,
        // ohne den Netzanschluss (Import-Limit) zu überlasten. Die Entladung wird über das Storage-Control-Modul umgesetzt.
        let storageSoC = getFirstDpNumber(['st.socPct']);
        let storageAssistW = 0;
        let storageAssistActive = false;
        let storagePolicyGlobalBlocker = '';
        const budgetBeforeStorageAssistW = Number.isFinite(budgetW) ? Math.max(0, budgetW) : budgetW;

        try {
            const saEnabled = cfg.storageAssistEnabled === true;
            const saApply = (typeof cfg.storageAssistApply === 'string') ? cfg.storageAssistApply : 'boostOnly';
            const startSoc = clamp(num(cfg.storageAssistStartSocPct, 60), 0, 100);
            const stopSoc = clamp(num(cfg.storageAssistStopSocPct, 40), 0, 100);

            const maxW_cfg = num(cfg.storageAssistMaxDischargeW, 0);
            const maxW_storage = num(this.adapter && this.adapter.config && this.adapter.config.storage && this.adapter.config.storage.maxDischargeW, 0);
            const maxW = (Number.isFinite(maxW_cfg) && maxW_cfg > 0) ? maxW_cfg : (Number.isFinite(maxW_storage) ? maxW_storage : 0);

            const storageAssistWallboxes = wbList.filter(w => w && w.enabled && w.online && w.storageAssistRequested === true);
            const anyStorageAssistRequested = storageAssistWallboxes.length > 0;
            const anyStorageBoostActive = storageAssistWallboxes.some(w => String(w.effectiveMode || '').toLowerCase() === 'boost');
            const anyGridAllowedStorageActive = storageAssistWallboxes.some(w => ['normal', 'boost', 'minpv'].includes(String(w.effectiveMode || '').toLowerCase()));
            const allowByMode = (saApply === 'boostAndAuto') ? anyStorageAssistRequested : anyStorageBoostActive;

            if (!anyStorageAssistRequested) storagePolicyGlobalBlocker = 'no-wallbox-request';
            else if (!saEnabled) storagePolicyGlobalBlocker = 'storage-assist-disabled';
            else if (!allowByMode) storagePolicyGlobalBlocker = 'mode-not-allowed';
            else if (!anyGridAllowedStorageActive) storagePolicyGlobalBlocker = 'mode-pv-only';
            else if (!dischargeAllowed) storagePolicyGlobalBlocker = 'discharge-not-allowed';
            else if (pausedByPeakShaving) storagePolicyGlobalBlocker = 'paused-by-peak-shaving';
            else if (!(maxW > 0)) storagePolicyGlobalBlocker = 'no-storage-discharge-limit';
            else if (!Number.isFinite(storageSoC)) storagePolicyGlobalBlocker = 'storage-soc-unavailable';
            else storagePolicyGlobalBlocker = '';

            if (!storagePolicyGlobalBlocker) {
                // Hysterese: Start/Stop-Schwellen vermeiden Flattern
                if (this._storageAssistActive) {
                    if (storageSoC <= stopSoc) this._storageAssistActive = false;
                } else {
                    if (storageSoC >= startSoc) this._storageAssistActive = true;
                }
            } else {
                this._storageAssistActive = false;
            }

            storageAssistActive = !!this._storageAssistActive;
            if (!storageAssistActive && !storagePolicyGlobalBlocker && Number.isFinite(storageSoC)) {
                storagePolicyGlobalBlocker = storageSoC < startSoc ? 'storage-soc-low' : 'storage-assist-idle';
            }

            // Nur sinnvoll, wenn das Budget aktuell durch Netz/Phase gedeckelt ist
            if (storageAssistActive && (gridCapBinding || phaseCapBinding) && maxW > 0) {
                const desiredExtra = Number.isFinite(budgetBeforeGridCaps) ? Math.max(0, budgetBeforeGridCaps - budgetW) : maxW;
                storageAssistW = clamp(Math.min(maxW, desiredExtra), 0, maxW);

                // Budget anheben: zusätzliche Leistung wird aus dem Speicher bereitgestellt (Storage-Control setzt Entladung)
                if (storageAssistW > 0 && Number.isFinite(budgetW)) {
                    budgetW = budgetW + storageAssistW;
                    if (!String(effectiveBudgetMode || '').includes('storageAssist')) {
                        effectiveBudgetMode = `${effectiveBudgetMode}+storageAssist`;
                    }
                } else if (!storagePolicyGlobalBlocker) {
                    storagePolicyGlobalBlocker = 'no-storage-budget-needed';
                }
            } else if (storageAssistActive && !(gridCapBinding || phaseCapBinding) && !storagePolicyGlobalBlocker) {
                storagePolicyGlobalBlocker = 'no-grid-or-phase-cap';
            }

        } catch (_e) {
            // ignore
            this._storageAssistActive = false;
            storageAssistW = 0;
            storageAssistActive = false;
            storagePolicyGlobalBlocker = 'runtime-error';
        }

        try {
            for (const w of wbList) {
                const effectiveStorageAssist = !!(storageAssistActive && storageAssistW > 0 && w.storageAssistRequested === true);
                let storageReason = '';
                if (!w.storageAssistCustomerAllowed) storageReason = 'installer-locked';
                else if (!w.userStorageAssistEnabled) storageReason = 'user-disabled';
                else if (effectiveStorageAssist) storageReason = 'allowed';
                else storageReason = storagePolicyGlobalBlocker || 'not-active';
                w.effectiveStorageAssist = effectiveStorageAssist;
                w.storageAssistBlockedReason = storageReason;
                w.batteryContributionW = 0;
                await this._queueState(`${w.ch}.effectiveStorageAssist`, effectiveStorageAssist, true);
                await this._queueState(`${w.ch}.storageAssistBlockedReason`, storageReason, true);
                await this._queueState(`${w.ch}.batteryContributionW`, 0, true);
            }
        } catch {
            // ignore
        }

        // Publish diagnostics for UI
        try {
            await this._queueState('chargingManagement.control.storageAssistSoCPct', Number.isFinite(storageSoC) ? storageSoC : 0, true);
            await this._queueState('chargingManagement.control.storageAssistActive', !!storageAssistActive, true);
            await this._queueState('chargingManagement.control.storageAssistW', Number.isFinite(storageAssistW) ? storageAssistW : 0, true);
            await this._queueState('chargingManagement.control.storageProtectedLoadW', Math.max(0, Math.round(Number(storageProtectedLoadW || 0))), true);
            await this._queueState('chargingManagement.control.storageProtectedWallboxes', Math.max(0, Math.round(Number(storageProtectedWallboxes || 0))), true);
            await this._queueState('chargingManagement.control.storageProtectedLoadTs', now, true);
            await this._queueState('chargingManagement.control.storageAssistRequestedLoadW', Math.max(0, Math.round(Number(storageAssistRequestedLoadW || 0))), true);
        } catch {
            // ignore
        }


        // MU6.8: If metering/budget inputs are stale, enforce safe targets (0) to avoid overloading the grid connection.
        let staleMeter = false;
        let staleBudget = false;

        if (!this.dp) {
            staleMeter = true; // cannot validate inputs without DP registry
        } else {
            const gridKeys = ['cm.gridPowerW', 'grid.powerW', 'grid.powerRawW', 'ems.gridPowerW', 'ps.gridPowerW'];
            const configuredGridKeys = gridKeys.filter(k => !!this.dp.getEntry(k));

            // Robust STALE_METER handling:
            // If a connected DP + watchdog/heartbeat DP are configured, use them as the source of truth.
            // This avoids false STALE_METER when the power value is stable (setStateChanged -> ts/lc not updated).
            const connEntry = this.dp.getEntry('cm.gridConnected');
            const wdEntry = this.dp.getEntry('cm.gridWatchdog');
            const connId = connEntry?.srcObjectId;
            const wdId = wdEntry?.srcObjectId;
            const hasConn = !!connId;
            const hasWd = !!wdId;

            if (hasConn || hasWd) {
                // Connected / Online DP
                let connected = true;
                if (hasConn) {
                    const connRaw = this.dp.getRaw('cm.gridConnected');
                    // Be permissive: treat missing/unknown as connected (we primarily rely on watchdog freshness).
                    // Only explicit false/0 should force disconnect.
                    const isFalse = (connRaw === false || connRaw === 0 || connRaw === 'false' || connRaw === '0');
                    connected = !isFalse;
                }

                // Watchdog / Heartbeat DP
                let watchdogFresh = true;
                if (hasWd) {
                    // If the watchdog is a "lastSeenMs" timestamp we compute age from its *value*.
                    // Otherwise we use the alivePrefix heartbeat age (ANY state update under the same device prefix).
                    let watchdogAgeMs = Infinity;
                    const nowMs = Date.now();

                    const looksLikeLastSeen = /lastSeenMs$/i.test(String(wdId || ''));
                    if (looksLikeLastSeen) {
                        const lastSeenMs = this.dp.getNumber('cm.gridWatchdog', null);
                        if (typeof lastSeenMs === 'number' && Number.isFinite(lastSeenMs) && lastSeenMs > 0) {
                            watchdogAgeMs = Math.max(0, nowMs - lastSeenMs);
                        }
                    } else {
                        // Use getAgeMs (includes robust alias fallback). getAliveAgeMs can be Infinity for ioBroker alias
                        // wrappers because alias objects may not emit state-change events under their own ID.
                        watchdogAgeMs = this.dp.getAgeMs('cm.gridWatchdog');

                        // As a last resort (e.g., state missing), fall back to alive-age if available.
                        if (!Number.isFinite(watchdogAgeMs) && typeof this.dp.getAliveAgeMs === 'function') {
                            const a = this.dp.getAliveAgeMs('cm.gridWatchdog');
                            if (Number.isFinite(a)) watchdogAgeMs = a;
                        }
                    }

                    watchdogFresh = Number.isFinite(watchdogAgeMs) && watchdogAgeMs <= staleTimeoutMs;
                }

                // Decision (STALE_METER):
                // ✅ If an explicit CONNECTED/ONLINE dp is mapped (e.g. nexowatt-devices … aliases.r.online),
                //    treat it as authoritative and *only* use it.
                //    This prevents false STALE_METER when values are stable or written "on change".
                //
                // Otherwise (no connected dp):
                // - If watchdog exists: require watchdogFresh
                if (hasConn) {
                    staleMeter = !connected;
                } else if (hasWd) {
                    staleMeter = !watchdogFresh;
                } else {
                    staleMeter = true;
                }
            } else if (configuredGridKeys.length === 0) {
                // No grid power configured -> safe fallback.
                staleMeter = true;
            } else {
                let anyFresh = false;
                for (const k of configuredGridKeys) {
                    if (!this.dp.isStale(k, staleTimeoutMs)) {
                        anyFresh = true;
                        break;
                    }
                }
                staleMeter = !anyFresh;
            }

            // Gate A: If a phase limit is configured, phase current metering must be present and fresh.
            if (!staleMeter && gridMaxPhaseA > 0) {
                const phaseKeys = ['ps.l1A', 'ps.l2A', 'ps.l3A'];
                const configuredPhaseKeys = phaseKeys.filter(k => !!this.dp.getEntry(k));
                if (configuredPhaseKeys.length === 0) {
                    staleMeter = true;
                } else {
                    for (const k of configuredPhaseKeys) {
                        if (this.dp.isStale(k, staleTimeoutMs)) {
                            staleMeter = true;
                            break;
                        }
                    }
                }
            }

            // External budget datapoint (if used)
            if (!staleMeter && (budgetMode === 'fromDatapoint' || budgetMode === 'engine') && budgetPowerId && this.dp.getEntry('cm.budgetPowerW')) {
                staleBudget = this.dp.isStale('cm.budgetPowerW', staleTimeoutMs);
            }
        }

        // Peak-shaving-derived budget is a dynamic state; check ts/lc (if used)
        if (!staleMeter && !staleBudget && (budgetMode === 'fromPeakShaving' || budgetMode === 'engine')) {
            const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
            // Only treat as relevant if peak shaving is active or the user explicitly uses fromPeakShaving.
            const psActive = peakActive;
            if (budgetMode === 'fromPeakShaving' || psActive) staleBudget = !!psBudgetStale;
        }

        // ---------------------------------------------------------------
        // STALE_METER policy
        // ---------------------------------------------------------------
        // The STALE_METER watchdog is meant as a *safety net* to prevent accidental
        // overload if the grid meter stops updating. However, in some environments
        // (aliases / event-driven meters / stable values) false positives can occur.
        //
        // To keep the EMS operational while we refine the watchdog, we support a
        // policy switch:
        //   - 'off'   : never block charging (default – runs the logic even if stale)
        //   - 'warn'  : do not block, but expose stale flags/diagnostics
        //   - 'block' : enforce failsafe (set EVCS targets to 0) when stale
        //
        // NOTE: 'off' and 'warn' still publish the stale flags in the UI, but will
        // not interrupt charging.
        // Runtime override: allow installers to toggle failsafe on/off via datapoint.
        // If enabled and config is still 'off', we default to 'block' (safety-first).
        let failsafeEnabled = false;
        try {
            const stFs = await this._getStateCached('chargingManagement.control.failsafeEnabled');
            if (stFs && typeof stFs.val === 'boolean') failsafeEnabled = !!stFs.val;
            else if (stFs && (stFs.val === 1 || stFs.val === '1' || stFs.val === 'true')) failsafeEnabled = true;
        } catch {
            // ignore
        }

        let stalePolicyRaw = String(cfg.staleFailsafeMode || cfg.stalePolicy || 'off').trim().toLowerCase();
        let stalePolicy = (stalePolicyRaw === 'block' || stalePolicyRaw === 'warn' || stalePolicyRaw === 'off') ? stalePolicyRaw : 'off';

        if (!failsafeEnabled) {
            stalePolicy = 'off';
        } else if (stalePolicy === 'off') {
            stalePolicy = 'block';
        }

        // Important: only trigger FAILSAFE on *meter* staleness.
        // Budget signals can stay constant for long periods and may be written "on change",
        // which would falsely trip a stale detector based on timestamps.
        const staleDetected = (mode !== 'off') && staleMeter;
        const staleBlocks = staleDetected && (stalePolicy === 'block');

        // Publish stale diagnostics for UI transparency (even when not in failsafe)
        try {
            let details = '';
            if (this.dp) {
                const parts = [];
                try {
                    const keys = ['cm.gridPowerW', 'grid.powerW', 'grid.powerRawW', 'ems.gridPowerW', 'ps.gridPowerW']
                        .filter(k => !!this.dp.getEntry(k));
                    if (keys.length) {
                        const ages = keys.map(k => {
                            const a = this.dp.getAgeMs(k);
                            const aTxt = (!Number.isFinite(a) || a === Number.POSITIVE_INFINITY) ? '∞' : String(Math.round(a / 1000));
                            return `${k}:${aTxt}s`;
                        });
                        parts.push(`grid=${ages.join(',')}`);
                    } else {
                        parts.push('grid=none');
                    }
                } catch (_e) {
                    // ignore
                }
                details = parts.join(' ');
            }
            await this._queueState('chargingManagement.control.staleMeter', !!staleMeter, true);
            await this._queueState('chargingManagement.control.staleBudget', !!staleBudget, true);
            // Keep the name for backwards compatibility with the UI.
            await this._queueState('chargingManagement.control.failsafeDetails', staleDetected ? details : '', true);
            await this._queueState('chargingManagement.control.failsafePolicy', String(stalePolicy || ''), true);
        } catch {
            // ignore
        }

        // Only enforce failsafe when policy == 'block'.
        if (staleBlocks) {
            const reason = ReasonCodes.STALE_METER;

            await this._queueState('chargingManagement.control.active', true, true);
            await this._queueState('chargingManagement.control.mode', mode, true);
            await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
            await this._queueState('chargingManagement.control.pausedByPeakShaving', false, true);
            await this._queueState('chargingManagement.control.status', 'failsafe_stale_meter', true);
            await this._queueState('chargingManagement.control.budgetW', 0, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', 0, true);
            await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
            await this._queueState('chargingManagement.control.reserveW', 0, true);
            await this._queueState('chargingManagement.control.activeDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandIntentW', 0, true);
            await this._queueState('chargingManagement.control.activeDemandWallboxes', 0, true);

            // Phase 4.2: Even in failsafe, publish Gate A (Netz/Phasen) diagnostics so the
            // App-Center can show the configured grid limits. The control itself is still forced
            // to 0W/0A below.
            try {
                await this._queueState('chargingManagement.control.gridImportLimitW', (typeof gridImportLimitW === 'number' && Number.isFinite(gridImportLimitW)) ? gridImportLimitW : 0, true);
                await this._queueState('chargingManagement.control.gridImportLimitW_effective', (typeof gridImportLimitEffW === 'number' && Number.isFinite(gridImportLimitEffW)) ? gridImportLimitEffW : 0, true);
                await this._queueState('chargingManagement.control.gridImportW', (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : 0, true);
                await this._queueState('chargingManagement.control.gridBaseLoadW', (typeof gridBaseLoadW === 'number' && Number.isFinite(gridBaseLoadW)) ? gridBaseLoadW : 0, true);
                await this._queueState('chargingManagement.control.gridBaseLoadRawW', (typeof gridBaseLoadRawW === 'number' && Number.isFinite(gridBaseLoadRawW)) ? gridBaseLoadRawW : 0, true);
                await this._queueState('chargingManagement.control.gridLocalSupportW', (typeof gridLocalSupportW === 'number' && Number.isFinite(gridLocalSupportW)) ? gridLocalSupportW : 0, true);
                await this._queueState('chargingManagement.control.gridCapEvcsW', (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW)) ? gridCapEvcsW : 0, true);
                await this._queueState('chargingManagement.control.gridCapBinding', false, true);

                // Use the current (namespaced) diagnostics states to avoid ioBroker "missing object" warnings.
                await this._queueState('chargingManagement.control.gridWorstPhaseA', (typeof worstPhaseA === 'number' && Number.isFinite(worstPhaseA)) ? worstPhaseA : 0, true);
                await this._queueState('chargingManagement.control.gridPhaseCapEvcsW', (typeof phaseCapEvcsW === 'number' && Number.isFinite(phaseCapEvcsW)) ? phaseCapEvcsW : 0, true);
                await this._queueState('chargingManagement.control.phaseCapBinding', false, true);
            } catch {
                // ignore
            }

            // Gate C: Speicher-Unterstützung in Failsafe immer deaktivieren
            this._storageAssistActive = false;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);

            await this._queueState('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

            /** @type {any[]} */
            const debugAlloc = [];
            let totalTargetPowerW = 0;
            let totalTargetCurrentA = 0;

            for (const w of wbList) {
                const targetW = 0;
                const targetA = 0;

                let applied = false;
                let applyStatus = 'skipped';
                /** @type {any|null} */
                let applyWrites = null;

                if (w.online && (w.enabled || (!!w.cfgEnabled && !w.userEnabled))) {
                    // 0.7.127: Failsafe setzt den sicheren Zielwert nur noch als
                    // Executor-/Fallback-Plan. Der einzige EVCS-Setpoint-Schreiber bleibt
                    // _executeChargingSetpointEntries.
                    applyStatus = 'planned_by_js_safety_executor';
                    const reasonToSet = (!!w.cfgEnabled && !w.userEnabled) ? ReasonCodes.CONTROL_DISABLED : reason;
                    await this._queueState(`${w.ch}.reason`, reasonToSet, true);
                } else {
                    await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online), true);
                }

                await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
                await this._queueState(`${w.ch}.targetPowerW`, 0, true);
                try { await this._queueState(`${w.ch}.stationRemainingW`, 0, true); } catch { /* ignore */ }
                await this._queueState(`${w.ch}.applied`, applied, true);
                await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
                if (applyWrites) {
                    try {
                        await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                    } catch {
                        await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                    }
                } else {
                    await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                }

                debugAlloc.push({
                    safe: w.safe,
                    name: w.name,
                    charging: !!w.charging,
                    chargingSinceMs: w.chargingSinceMs || 0,
                    online: !!w.online,
                    enabled: !!w.enabled,
                    priority: w.priority,
                    controlBasis: w.controlBasis,
                    chargerType: w.chargerType,
                    stationKey: w.stationKey || '',
                    connectorNo: w.connectorNo || 0,
                    stationMaxPowerW: (typeof w.stationMaxPowerW === 'number' && Number.isFinite(w.stationMaxPowerW)) ? w.stationMaxPowerW : null,
                    targetW,
                    targetA,
                    applied,
                    applyStatus,
                    applyWrites,
                    reason: (w.online && (w.enabled || (!!w.cfgEnabled && !w.userEnabled))) ? ((!!w.cfgEnabled && !w.userEnabled) ? ReasonCodes.CONTROL_DISABLED : reason) : (w.staleAny ? ReasonCodes.STALE_METER : availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online)),
                });
            }

            const tsAllocationState = await this._publishChargingAllocationTsShadow({
                mode,
                budgetMode: effectiveBudgetMode,
                budgetW: 0,
                usedW: 0,
                remainingW: 0,
                totalPowerW,
                totalTargetPowerW: 0,
                totalTargetCurrentA: 0,
                pvAvailableW: 0,
                pvAvailable: false,
                gridCapEvcsW,
                gridCapBinding: false,
                phaseCapEvcsW,
                phaseCapBinding: false,
                para14aActive,
                para14aCapEvcsW: para14aTotalCapW,
                para14aBinding,
                storageAssistActive: false,
                storageAssistW: 0,
                pausedByPeakShaving: false,
                safetyStop: true,
                safetyReason: 'stale-meter-safety-stop',
                staleMeter,
                staleBudget,
                preferTsNativeAllocation: true,
                tsNormalSourceLock: true,
                allowJsComparisonFallback: false,
                wallboxes: this._mapChargingWallboxesForTsAllocation(wbList),
                allocations: debugAlloc,
            });
            const tsWritePlanProductive = tsAllocationState && tsAllocationState.writePlanProductive ? tsAllocationState.writePlanProductive : null;
            const tsWritePlanUsed = await this._executeChargingTsSetpointPlan(tsWritePlanProductive, wbList, debugAlloc);
            const legacyFallbackReason = tsWritePlanProductive && tsWritePlanProductive.fallbackReason
                ? tsWritePlanProductive.fallbackReason
                : 'stale-meter-safety-fallback';
            if (!tsWritePlanUsed) {
                await this._executeChargingLegacySetpointFallback(wbList, debugAlloc, legacyFallbackReason);
            }
            await this._publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'stale-meter-safety-fallback', legacyFallbackReason);
            await this._publishChargingTsNormalSourceState('stale-meter-safety-fallback', tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, true);
            await this._publishChargingNormalSourceState({
                context: 'stale-meter-safety-fallback',
                mode,
                status: 'failsafe_stale_meter',
                safetyStop: true,
                safetyReason: 'stale-meter-safety-stop',
                budget: chargingBudgetTsProductive,
                allocation: tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision),
                writePlan: tsWritePlanProductive,
                executor: this._chargingWritePlanExecutorLast,
                legacy: this._chargingLegacyDecisionTreeLast,
            });

    
        publishEvPriorityCaps({
            active: !!evPriorityRequested,
            blockStorageCharge: !!(evPriorityRequested && (evPriorityLimitedWallboxes > 0 || evPriorityPendingW > 0)),
            requestedCount: evPriorityWallboxes.length,
            limitedWallboxes: evPriorityLimitedWallboxes,
            starvedW: Math.round(Math.max(evPriorityStarvedW || 0, evPriorityPendingW || 0)),
            pendingW: Math.round(evPriorityPendingW || 0),
            storageYieldW: Math.round(evPriorityStorageYieldW || 0),
            storageSource: String(evPriorityStorageSource || ''),
        });

        // ---- Stations (DC multi-connector) diagnostics ----
        try {
            const stationKeys = Array.from(stationCapW.keys());
            await this._queueState('chargingManagement.stationCount', stationKeys.length, true);

            for (const sk of stationKeys) {
                const ch = await this._ensureStationChannel(sk);
                const cap = stationCapW.get(sk);
                const rem = stationRemainingW.get(sk);
                const used = (typeof cap === 'number' && Number.isFinite(cap) && typeof rem === 'number' && Number.isFinite(rem))
                    ? Math.max(0, cap - rem)
                    : 0;
                const headroom = (typeof rem === 'number' && Number.isFinite(rem)) ? Math.max(0, rem) : 0;
                let binding = false;
                if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0 && typeof rem === 'number' && Number.isFinite(rem)) {
                    const tol = Math.max(50, cap * 0.005); // 0.5% oder 50W
                    binding = rem <= tol;
                }

                const name = stationNameByKey.get(sk) || '';
                const targetSum = stationTargetSumW.get(sk) || 0;
                const cnt = stationConnectorCount.get(sk) || 0;
                const bc = stationBoostCount.get(sk) || 0;
                const pvc = stationPvLimitedCount.get(sk) || 0;
                const connsSet = stationConnectors.get(sk);
                const conns = connsSet ? Array.from(connsSet).filter(s => s).join(',') : '';

                await this._queueState(`${ch}.stationKey`, sk, true);
                await this._queueState(`${ch}.name`, name, true);
                await this._queueState(`${ch}.maxPowerW`, (typeof cap === 'number' && Number.isFinite(cap)) ? cap : 0, true);
                await this._queueState(`${ch}.remainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
                await this._queueState(`${ch}.usedW`, used, true);
                await this._queueState(`${ch}.binding`, !!binding, true);
                await this._queueState(`${ch}.headroomW`, headroom, true);
                await this._queueState(`${ch}.targetSumW`, targetSum, true);
                await this._queueState(`${ch}.connectorCount`, cnt, true);
                await this._queueState(`${ch}.boostConnectors`, bc, true);
                await this._queueState(`${ch}.pvLimitedConnectors`, pvc, true);
                await this._queueState(`${ch}.connectors`, conns, true);
                await this._queueState(`${ch}.lastUpdate`, Date.now(), true);
            }
        } catch {
            // ignore
        }

        await this._queueState('chargingManagement.summary.totalPowerW', totalFreshActualPowerW, true);
        await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
        await this._queueState('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
            await this._queueState('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
            await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);

            try {
                const s = JSON.stringify(debugAlloc);
                await this._queueState('chargingManagement.debug.allocations', s, true);
            } catch {
                await this._queueState('chargingManagement.debug.allocations', '[]', true);
            }

            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                }
            }

            return;
        }

        const controlActive = mode !== 'off';
        await this._queueState('chargingManagement.control.active', controlActive, true);
        await this._queueState('chargingManagement.control.mode', mode, true);
        await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
        await this._queueState('chargingManagement.control.pausedByPeakShaving', pausedByPeakShaving, true);

        if (mode === 'off') {
            await this._queueState('chargingManagement.control.status', 'off', true);
            await this._queueState('chargingManagement.control.budgetW', Number.isFinite(budgetW) ? budgetW : 0, true);
            await this._queueState('chargingManagement.control.usedW', 0, true);
            await this._queueState('chargingManagement.control.remainingW', Number.isFinite(budgetW) ? budgetW : 0, true);
            await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
            await this._queueState('chargingManagement.control.reserveW', 0, true);
            await this._queueState('chargingManagement.control.activeDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandReserveW', 0, true);
            await this._queueState('chargingManagement.control.pvActiveDemandIntentW', 0, true);
            await this._queueState('chargingManagement.control.activeDemandWallboxes', 0, true);
            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                }
            }

            await this._publishChargingControlTsShadow({ mode, budgetMode: effectiveBudgetMode, status: 'failsafe_stale_meter', active: true, budgetW: 0, usedW: 0, remainingW: 0, totalPowerW: totalFreshActualPowerW, totalTargetPowerW: 0, totalTargetCurrentA: 0, wallboxCount: wbList.length, onlineWallboxes: onlineCount, connectedCount: wbList.filter(w => w && w.vehiclePlugged !== false).length, pausedByPeakShaving: false, staleMeter, staleBudget, gridImportLimitW, gridImportLimitEffW, gridImportW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding, storageAssistActive: false, storageAssistW: 0 });

            const tsControlOffState = await this._publishChargingControlTsShadow({ mode, budgetMode: effectiveBudgetMode, status: 'off', active: false, budgetW: Number.isFinite(budgetW) ? budgetW : 0, usedW: 0, remainingW: Number.isFinite(budgetW) ? budgetW : 0, totalPowerW: totalFreshActualPowerW, totalTargetPowerW: 0, totalTargetCurrentA: 0, wallboxCount: wbList.length, onlineWallboxes: onlineCount, connectedCount: wbList.filter(w => w && w.vehiclePlugged !== false).length, pausedByPeakShaving, staleMeter, staleBudget, gridImportLimitW, gridImportLimitEffW, gridImportW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding, storageAssistActive, storageAssistW });
            await this._publishChargingNormalSourceState({
                context: 'mode-off',
                mode,
                status: 'off',
                budget: chargingBudgetTsProductive,
                control: tsControlOffState && tsControlOffState.productiveDecision,
                legacy: this._chargingLegacyDecisionTreeLast,
            });

            await this._queueState('chargingManagement.summary.totalPowerW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
            await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
            await this._queueState('chargingManagement.summary.totalTargetPowerW', 0, true);
            await this._queueState('chargingManagement.summary.totalTargetCurrentA', 0, true);
            await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
            return;
        }

        if (pausedByPeakShaving) {
            const pb = (pauseBehavior === 'followPeakBudget') ? 'followPeakBudget' : 'rampDownToZero';

            if (pb === 'followPeakBudget') {
                const psBudgetStale = await isStateStale('peakShaving.dynamic.availableForControlledW', staleTimeoutMs);
                const psBudgetRaw = await this._getPeakShavingBudgetW();
                const psBudgetW = (!psBudgetStale && typeof psBudgetRaw === 'number' && Number.isFinite(psBudgetRaw)) ? Math.max(0, psBudgetRaw) : null;

                if (psBudgetW !== null) {
                    budgetW = psBudgetW;
                    effectiveBudgetMode = 'fromPeakShaving';
                    // Ensure control state reflects the effective mode (overrides earlier value)
                    await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                }

                // Gate A: If PeakShaving is active but no dynamic budget is available (e.g. static mode),
                // fall back to the already computed hard grid safety caps instead of ramping to 0.
                if (!pauseFollowPeakBudget && (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW))) {
                    const before = budgetW;
                    if (!Number.isFinite(budgetW)) budgetW = gridCapEvcsW;
                    else budgetW = Math.min(budgetW, gridCapEvcsW);

                    // Keep effectiveBudgetMode as-is (it already includes +gridImport/+phaseCap when active)
                    await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                    pauseFollowPeakBudget = true;
                    pauseFollowGridCaps = true;
                }
            }

            
            // If the user selected rampDownToZero but we can still compute safe hard caps (Gate A),
            // follow those caps instead of forcing 0A. Only ramp down to 0 when no safe budget is available.
            if (!pauseFollowPeakBudget && pb !== 'followPeakBudget' && (typeof gridCapEvcsW === 'number' && Number.isFinite(gridCapEvcsW))) {
                const before = budgetW;
                if (!Number.isFinite(budgetW)) budgetW = gridCapEvcsW;
                else budgetW = Math.min(budgetW, gridCapEvcsW);

                // Keep effectiveBudgetMode as-is (it already includes +gridImport/+phaseCap when active)
                await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                pauseFollowPeakBudget = true;
                pauseFollowGridCaps = true;
            }

// Default / safe pause behavior: ramp down to 0 (do not keep last setpoints)
            if (!pauseFollowPeakBudget) {
                const reason = ReasonCodes.PAUSED_BY_PEAK_SHAVING;

                await this._queueState('chargingManagement.control.active', true, true);
                await this._queueState('chargingManagement.control.mode', mode, true);
                await this._queueState('chargingManagement.control.budgetMode', effectiveBudgetMode, true);
                await this._queueState('chargingManagement.control.pausedByPeakShaving', true, true);
                await this._queueState('chargingManagement.control.status', 'paused_by_peak_shaving_ramp_down', true);
                await this._queueState('chargingManagement.control.budgetW', 0, true);
                await this._queueState('chargingManagement.control.usedW', 0, true);
                await this._queueState('chargingManagement.control.remainingW', 0, true);
                await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
                await this._queueState('chargingManagement.control.reserveW', 0, true);
                await this._queueState('chargingManagement.control.activeDemandReserveW', 0, true);
                await this._queueState('chargingManagement.control.pvActiveDemandReserveW', 0, true);
                await this._queueState('chargingManagement.control.pvActiveDemandIntentW', 0, true);
                await this._queueState('chargingManagement.control.activeDemandWallboxes', 0, true);

            // Gate C: Speicher-Unterstützung in Failsafe immer deaktivieren
            this._storageAssistActive = false;
            await this._queueState('chargingManagement.control.storageAssistActive', false, true);
            await this._queueState('chargingManagement.control.storageAssistW', 0, true);

                await this._queueState('chargingManagement.debug.sortedOrder', wbList.map(w => w.safe).join(','), true);

                /** @type {any[]} */
                const debugAlloc = [];
                let totalTargetPowerW = 0;
                let totalTargetCurrentA = 0;

                for (const w of wbList) {
                    const targetW = 0;
                    const targetA = 0;

                    let applied = false;
                    let applyStatus = 'skipped';
                    /** @type {any|null} */
                    let applyWrites = null;

                    if (w.enabled && w.online) {
                        // 0.7.127: Peak-Shaving-Rampdown läuft nicht mehr als eigener
                        // JS-Schreibblock, sondern als Safety-Fallback-Plan über den
                        // zentralen Executor.
                        applyStatus = 'planned_by_js_safety_executor';
                        await this._queueState(`${w.ch}.reason`, reason, true);
                    } else {
                        await this._queueState(`${w.ch}.reason`, availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online), true);
                    }

                    await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
                    await this._queueState(`${w.ch}.targetPowerW`, 0, true);
                    await this._queueState(`${w.ch}.applied`, applied, true);
                    await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
                    if (applyWrites) {
                        try {
                            await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                        } catch {
                            await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                        }
                    } else {
                        await this._queueState(`${w.ch}.applyWrites`, '{}', true);
                    }

                    debugAlloc.push({
                        safe: w.safe,
                        name: w.name,
                        charging: !!w.charging,
                        chargingSinceMs: w.chargingSinceMs || 0,
                        online: !!w.online,
                        enabled: !!w.enabled,
                        targetW,
                        targetA,
                        applied,
                        status: applyStatus,
                        reason: (w.enabled && w.online) ? reason : (w.staleAny ? ReasonCodes.STALE_METER : availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online)),
                    });

                    // totals stay 0
                    totalTargetPowerW += targetW;
                    if (Number.isFinite(targetA) && targetA > 0) totalTargetCurrentA += targetA;
                }

                const tsAllocationState = await this._publishChargingAllocationTsShadow({
                    mode,
                    budgetMode: effectiveBudgetMode,
                    budgetW: 0,
                    usedW: 0,
                    remainingW: 0,
                    totalPowerW,
                    totalTargetPowerW: 0,
                    totalTargetCurrentA: 0,
                    pvAvailableW: 0,
                    pvAvailable: false,
                    gridCapEvcsW,
                    gridCapBinding: false,
                    phaseCapEvcsW,
                    phaseCapBinding: false,
                    para14aActive,
                    para14aCapEvcsW: para14aTotalCapW,
                    para14aBinding,
                    storageAssistActive: false,
                    storageAssistW: 0,
                    pausedByPeakShaving: true,
                    safetyStop: true,
                    safetyReason: 'peak-shaving-safety-stop',
                    staleMeter,
                    staleBudget,
                    preferTsNativeAllocation: true,
                    tsNormalSourceLock: true,
                    allowJsComparisonFallback: false,
                    wallboxes: this._mapChargingWallboxesForTsAllocation(wbList),
                    allocations: debugAlloc,
                });
                const tsWritePlanProductive = tsAllocationState && tsAllocationState.writePlanProductive ? tsAllocationState.writePlanProductive : null;
                const tsWritePlanUsed = await this._executeChargingTsSetpointPlan(tsWritePlanProductive, wbList, debugAlloc);
                const legacyFallbackReason = tsWritePlanProductive && tsWritePlanProductive.fallbackReason
                    ? tsWritePlanProductive.fallbackReason
                    : 'peak-shaving-safety-fallback';
                if (!tsWritePlanUsed) {
                    await this._executeChargingLegacySetpointFallback(wbList, debugAlloc, legacyFallbackReason);
                }
                await this._publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'peak-shaving-safety-fallback', legacyFallbackReason);
                await this._publishChargingTsNormalSourceState('peak-shaving-safety-fallback', tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, true);
                await this._publishChargingNormalSourceState({
                    context: 'peak-shaving-safety-fallback',
                    mode,
                    status: 'paused_by_peak_shaving_ramp_down',
                    safetyStop: true,
                    safetyReason: 'peak-shaving-safety-stop',
                    budget: chargingBudgetTsProductive,
                    allocation: tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision),
                    writePlan: tsWritePlanProductive,
                    executor: this._chargingWritePlanExecutorLast,
                    legacy: this._chargingLegacyDecisionTreeLast,
                });

                try {
                    const s = JSON.stringify(debugAlloc);
                    await this._queueState('chargingManagement.debug.allocations', diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
                } catch {
                    await this._queueState('chargingManagement.debug.allocations', '[]', true);
                }

                // Cleanup session tracking for removed wallboxes (avoid memory leaks)
                for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                    const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                    if (!ls || (now - ls) > sessionCleanupStaleMs) {
                        this._chargingLastSeenMs.delete(safeKey);
                        this._chargingLastActiveMs.delete(safeKey);
                        this._chargingSinceMs.delete(safeKey);
                    }
                }

                await this._publishChargingControlTsShadow({ mode, budgetMode: effectiveBudgetMode, status: 'paused_by_peak_shaving_ramp_down', active: true, budgetW: 0, usedW: 0, remainingW: 0, totalPowerW: totalFreshActualPowerW, totalTargetPowerW: 0, totalTargetCurrentA: 0, wallboxCount: wbList.length, onlineWallboxes: onlineCount, connectedCount: wbList.filter(w => w && w.vehiclePlugged !== false).length, pausedByPeakShaving: true, staleMeter, staleBudget, gridImportLimitW, gridImportLimitEffW, gridImportW, gridCapEvcsW, gridCapBinding, phaseCapEvcsW, phaseCapBinding, para14aActive, para14aCapEvcsW: para14aTotalCapW, para14aBinding, storageAssistActive: false, storageAssistW: 0 });

                await this._queueState('chargingManagement.summary.totalPowerW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
                await this._queueState('chargingManagement.summary.totalReservedPowerW', 0, true);
                await this._queueState('chargingManagement.summary.totalTargetPowerW', 0, true);
                await this._queueState('chargingManagement.summary.totalTargetCurrentA', 0, true);
                await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
                return;
            }
        }

        // Priority distribution in W across mixed AC/DC chargers
        const sorted = wbList
            .filter(w => w.enabled && w.online)
            .sort((a, b) => {
                // Boosted wallboxes first (explicit user choice)
                const ab = a.effectiveMode === 'boost' ? 1 : 0;
                const bb = b.effectiveMode === 'boost' ? 1 : 0;
                if (ab !== bb) return bb - ab;

                // Zeit-Ziel Laden ("Depot-/Deadline-Laden") vor normaler Priorität:
                // - zuerst alle aktiven Ziel-Laden Sessions
                // - innerhalb Ziel-Laden: früheste Deadline zuerst, dann höchste benötigte Leistung
                const ag = a.goalActive ? 1 : 0;
                const bg = b.goalActive ? 1 : 0;
                if (ag !== bg) return bg - ag;
                if (ag && bg) {
                    const af = (Number.isFinite(a.goalFinishTs) && a.goalFinishTs > 0) ? a.goalFinishTs : Infinity;
                    const bf = (Number.isFinite(b.goalFinishTs) && b.goalFinishTs > 0) ? b.goalFinishTs : Infinity;
                    if (af !== bf) return af - bf;
                    const au = Number.isFinite(a.goalUrgency) ? a.goalUrgency : 0;
                    const bu = Number.isFinite(b.goalUrgency) ? b.goalUrgency : 0;
                    if (au !== bu) return bu - au;
                }

                const ac = a.charging ? 1 : 0;
                const bc = b.charging ? 1 : 0;
                if (ac !== bc) return bc - ac; // charging first

                // Earlier charging sessions first (arrival order). Non-charging get Infinity and fall back to priority.
                const as = (Number.isFinite(a.chargingSinceMs) && a.chargingSinceMs > 0) ? a.chargingSinceMs : Infinity;
                const bs = (Number.isFinite(b.chargingSinceMs) && b.chargingSinceMs > 0) ? b.chargingSinceMs : Infinity;
                if (as !== bs) return as - bs;

                const ap = Number.isFinite(a.priority) ? a.priority : 9999;
                const bp = Number.isFinite(b.priority) ? b.priority : 9999;
                if (ap !== bp) return ap - bp;

                // If everything is equal, keep the configured list order stable (installer can reorder in UI)
                const ao = Number.isFinite(a.orderIndex) ? a.orderIndex : 0;
                const bo = Number.isFinite(b.orderIndex) ? b.orderIndex : 0;
                if (ao !== bo) return ao - bo;

                const ask = String(a.safe || '');
                const bsk = String(b.safe || '');
                return ask.localeCompare(bsk);
            });


        // MU3.1.1 (Sprint 3.1): Optional round-robin fairness within station groups.
        // This keeps overall prioritization, but rotates the order of NON-boost connectors inside the same station
        // so that one connector does not always take the full station cap first.
        // Default behavior:
        // - Without stations (no cap): sequential (stable ordering)
        // - With stations (cap present): round-robin (fairness across connectors)
        const _stationAllocModeRaw = (cfg.stationAllocationMode !== undefined && cfg.stationAllocationMode !== null)
            ? String(cfg.stationAllocationMode).trim()
            : '';
        const stationAllocMode = String(_stationAllocModeRaw || (stationCapByKey && stationCapByKey.size ? 'roundrobin' : 'sequential')).trim().toLowerCase();
        if (stationAllocMode === 'roundrobin' || stationAllocMode === 'round_robin' || stationAllocMode === 'rr') {
            /** @type {Map<string, number[]>} */
            const idxByStation = new Map();
            for (let i = 0; i < sorted.length; i++) {
                const w = sorted[i];
                const sk = String(w.stationKey || '').trim();
                if (!sk) continue;
                // Only for real station groups (cap > 0)
                const cap = w.stationMaxPowerW;
                if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) continue;
                // Keep boost connectors at the top: rotate only non-boost connectors.
                if (String(w.effectiveMode || '') === 'boost') continue;
                // Ziel-Laden soll seine Priorität behalten: nicht in Round-Robin rotieren
                if (w.goalActive) continue;

                const arr = idxByStation.get(sk) || [];
                arr.push(i);
                idxByStation.set(sk, arr);
            }

            const rrIntervalMs = 10 * 1000; // rotate at most every 10s (serienreif, weniger UI-Flattern)
            for (const [sk, positions] of idxByStation.entries()) {
                const n = positions.length;
                if (n <= 1) continue;

                const prev = this._stationRoundRobinOffset.get(sk);
                let offset = (typeof prev === 'number' && Number.isFinite(prev) ? prev : 0) % n;

                const lastRot = this._stationRoundRobinLastRotateMs.get(sk);
                if (typeof lastRot !== 'number' || !Number.isFinite(lastRot) || lastRot <= 0) {
                    // first seen -> keep offset, start timer
                    this._stationRoundRobinLastRotateMs.set(sk, now);
                } else if ((now - lastRot) >= rrIntervalMs) {
                    offset = (offset + 1) % n;
                    this._stationRoundRobinOffset.set(sk, offset);
                    this._stationRoundRobinLastRotateMs.set(sk, now);
                }

                if (offset > 0) {
                    const elems = positions.map(pos => sorted[pos]);
                    const rotated = elems.slice(offset).concat(elems.slice(0, offset));
                    for (let j = 0; j < n; j++) {
                        sorted[positions[j]] = rotated[j];
                    }
                }
}
        }


        // MU3.1: expose allocation order for transparency
        for (let i = 0; i < sorted.length; i++) {
            const w = sorted[i];
            await this._queueState(`${w.ch}.allocationRank`, i + 1, true);
        }
        await this._queueState('chargingManagement.debug.sortedOrder', sorted.map(w => w.safe).join(','), true);


        // Stationsbudgets (gemeinsame Leistungsgrenzen je Station)
        /** @type {Map<string, number>} */
        const stationRemainingW = new Map();
        for (const w of sorted) {
            const sk = String(w.stationKey || '').trim();
            const cap = w.stationMaxPowerW;
            if (!sk) continue;
            if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) continue;
            const prev = stationRemainingW.get(sk);
            stationRemainingW.set(sk, (typeof prev === 'number' && Number.isFinite(prev)) ? Math.min(prev, cap) : cap);
        }

        // Ensure all configured station groups exist in the map (even if currently no connector is online)
        for (const [sk, cap] of stationCapByKey.entries()) {
            const prev = stationRemainingW.get(sk);
            if (typeof prev !== 'number' || !Number.isFinite(prev)) {
                stationRemainingW.set(sk, cap);
            }
        }

        // Copy initial station caps for diagnostics (stationCapW remains constant within this tick)
        /** @type {Map<string, number>} */
        const stationCapW = new Map();
        for (const [sk, cap] of stationRemainingW.entries()) {
            if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0) stationCapW.set(sk, cap);
        }

        // Station diagnostics accumulators
        /** @type {Map<string, number>} */
        const stationTargetSumW = new Map();
        /** @type {Map<string, number>} */
        const stationConnectorCount = new Map();
        /** @type {Map<string, number>} */
        const stationBoostCount = new Map();
        /** @type {Map<string, number>} */
        const stationPvLimitedCount = new Map();
        /** @type {Map<string, Set<string>>} */
        const stationConnectors = new Map();

        const debugAlloc = [];
        // MU4.1: publish budget engine inputs for transparency in debug output
        try {
            debugAlloc.push({
                type: 'budget',
                budgetW: Number.isFinite(budgetW) ? budgetW : null,
                budgetMode: effectiveBudgetMode,
                details: budgetDebug,
            });
        } catch {
            // ignore
        }

        let remainingW = budgetW;
        let nonStorageRemainingW = Number.isFinite(budgetBeforeStorageAssistW) ? Math.max(0, budgetBeforeStorageAssistW) : remainingW;
        let storageAssistRemainingW = Number.isFinite(storageAssistW) ? Math.max(0, storageAssistW) : 0;
        let usedW = 0;

        // Shared PV budget (only relevant if at least one wallbox is PV-limited)
        let pvRemainingW = (!needPvBudget || typeof pvCapW !== 'number' || !Number.isFinite(pvCapW)) ? Number.POSITIVE_INFINITY : Math.max(0, pvCapW);
        let pvUsedW = 0;

        let totalTargetPowerW = 0;
        let totalTargetCurrentA = 0;
        let evcsActiveDemandReserveW = 0;
        let evcsActiveDemandPvReserveW = 0;
        // PV-Intent bleibt waehrend Wallbox-Rampe, Start-Hysterese und zaeher
        // Leistungstelemetrie sichtbar. Ohne diesen zweiten Wert kann die zentrale
        // Budgetierung den EVCS-Anteil fuer einen Tick auf 0 setzen und der Speicher
        // nimmt anschliessend den kompletten PV-Ueberschuss.
        let evcsActiveDemandPvIntentW = 0;
        let evcsActiveDemandWallboxes = 0;

        // More specific budget limitation reason based on the active caps in this tick.
        // Used for per-connector diagnostics (without changing the underlying allocation math).
        /**
         * Code-Teil: Arrow-Funktion `pickBudgetReason`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: pickBudgetReason
         * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const pickBudgetReason = () => {
            if (para14aActive && para14aBinding) return ReasonCodes.LIMITED_BY_14A;
            if (gridCapBinding && phaseCapBinding) return ReasonCodes.LIMIT_POWER_AND_PHASE;
            if (gridCapBinding) return ReasonCodes.LIMITED_BY_GRID_IMPORT;
            if (phaseCapBinding) return ReasonCodes.LIMITED_BY_PHASE_CAP;
            return ReasonCodes.LIMITED_BY_BUDGET;
        };

        for (const w of sorted) {
            const effMode = String(w.effectiveMode || 'normal');
            const isPvOnly = effMode === 'pv';
            const isMinPv = effMode === 'minpv';
            const isBoost = effMode === 'boost';
            const isPvManaged = isPvOnly || isMinPv;

            const prevCmdW = this._lastCmdTargetW.get(w.safe);
            const prevCmdA = this._lastCmdTargetA.get(w.safe);
            const prevCmdWNorm = (typeof prevCmdW === 'number' && Number.isFinite(prevCmdW)) ? Math.max(0, prevCmdW) : 0;
            const prevCmdANorm = (typeof prevCmdA === 'number' && Number.isFinite(prevCmdA)) ? Math.max(0, prevCmdA) : 0;
            const prevCmdWasActive = prevCmdWNorm >= activityThresholdW || (w.vFactor > 0 && (prevCmdANorm * w.vFactor) >= activityThresholdW);
            const actualNowW = (typeof w.actualPowerW === 'number' && Number.isFinite(w.actualPowerW)) ? Math.max(0, Math.abs(w.actualPowerW)) : 0;
            const actualOrCmdActive = !!w.charging || actualNowW >= activityThresholdW || prevCmdWasActive;
            const startupHoldActive = isPvManaged && Number.isFinite(Number(w.pvStartupHoldUntilMs)) && Number(w.pvStartupHoldUntilMs) > now;
            const minRunActive = isPvOnly && Number.isFinite(Number(w.pvMinRunUntilMs)) && Number(w.pvMinRunUntilMs) > now;
            const startCooldownActive = isPvOnly && !actualOrCmdActive
                && Number.isFinite(Number(w.pvStartCooldownUntilMs))
                && Number(w.pvStartCooldownUntilMs) > now;
            const pvTechnicalMinW = (w.chargerType === 'AC' && Number(w.phases || 0) === 3)
                ? Math.max(0, Math.max(num(w.minPW, 0), acMinPower3pW))
                : Math.max(0, num(w.minPW, 0));
            const pvStartCommandA = (w.controlBasis === 'currentA' && w.setAKey)
                ? Math.max(0, num(w.minA, 0))
                : 0;
            const pvStartCommandW = (w.controlBasis === 'currentA' && w.setAKey)
                ? ((pvStartCommandA > 0 && w.vFactor > 0) ? (pvStartCommandA * w.vFactor) : 0)
                : pvTechnicalMinW;

            // Station diagnostics: count active connectors per station (only if station group has a cap)
            const _sk = (w.stationKey && stationCapW && stationCapW.has(w.stationKey)) ? String(w.stationKey) : '';
            if (_sk) {
                stationConnectorCount.set(_sk, (stationConnectorCount.get(_sk) || 0) + 1);
                if (isBoost) stationBoostCount.set(_sk, (stationBoostCount.get(_sk) || 0) + 1);
                if (isPvOnly || isMinPv) stationPvLimitedCount.set(_sk, (stationPvLimitedCount.get(_sk) || 0) + 1);
                const set = stationConnectors.get(_sk) || new Set();
                set.add(String(w.safe || ''));
                stationConnectors.set(_sk, set);
            }


            let targetW = 0;
            let targetA = 0;
            let reason = pickBudgetReason();

            // Budget view for this wallbox
            const storageEligible = !!(storageAssistActive && w.effectiveStorageAssist === true && storageAssistRemainingW > 0);
            const baseAvailW = Number.isFinite(nonStorageRemainingW) ? Math.max(0, nonStorageRemainingW) : (Number.isFinite(remainingW) ? Math.max(0, remainingW) : Number.POSITIVE_INFINITY);
            const storageExtraAvailW = storageEligible ? Math.max(0, storageAssistRemainingW) : 0;
            const totalAvailW = Number.isFinite(remainingW)
                ? Math.max(0, Math.min(remainingW, baseAvailW + storageExtraAvailW))
                : Number.POSITIVE_INFINITY;
            const pvAvailW = Number.isFinite(pvRemainingW) ? Math.max(0, pvRemainingW) : Number.POSITIVE_INFINITY;

            // Stationsgruppe (gemeinsame Leistungsgrenze pro Station)
            const stationAvailW = (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey))
                ? Math.max(0, stationRemainingW.get(w.stationKey))
                : Number.POSITIVE_INFINITY;

            const availW = isPvOnly
                ? Math.min(totalAvailW, pvAvailW, stationAvailW)
                : Math.min(totalAvailW, stationAvailW);

            // Track which constraint is currently binding (helps to set a meaningful reason code)
            let limiter = 'none'; // 'station' | 'total' | 'pv' | 'none'
            try {
                const tol = 1e-6;
                if (Number.isFinite(availW)) {
                    // Station limit has precedence for diagnostics (hard cap, shared across connectors)
                    if (Number.isFinite(stationAvailW) && stationAvailW < Number.POSITIVE_INFINITY && stationAvailW <= (availW + tol)) {
                        limiter = 'station';
                    } else if (isPvOnly && Number.isFinite(pvAvailW) && pvAvailW < Number.POSITIVE_INFINITY && pvAvailW <= (availW + tol)) {
                        limiter = 'pv';
                    } else if (Number.isFinite(totalAvailW) && totalAvailW < Number.POSITIVE_INFINITY && totalAvailW <= (availW + tol)) {
                        limiter = 'total';
                    }
                }
            } catch {
                limiter = 'none';
            }

            // Helper for minpv diagnostics (we want to know if station/total was the cap)
            let minpvMaxTotal = null;

            // Raw target calculation
            if (w.controlBasis === 'none') {
                reason = ReasonCodes.NO_SETPOINT;
                targetW = 0;
                targetA = 0;
            } else if (isMinPv) {
                // min+pv: keep min from total budget (grid allowed), extra only from PV budget
                const maxTotal = Math.min(totalAvailW, stationAvailW, w.maxPW);
                minpvMaxTotal = maxTotal;
                const minBase = (w.minPW > 0) ? w.minPW : 0;

                if (!Number.isFinite(maxTotal) || maxTotal <= 0) {
                    targetW = 0;
                    reason = ReasonCodes.NO_BUDGET;
                } else if (minBase > 0 && maxTotal < minBase) {
                    targetW = 0;
                    // If there is no budget at all, call it NO_BUDGET, otherwise BELOW_MIN
                    reason = (totalAvailW <= 0) ? ReasonCodes.NO_BUDGET : ReasonCodes.BELOW_MIN;
                } else {
                    const baseW = minBase;
                    const extraCap = Math.min(pvAvailW, Math.max(0, maxTotal - baseW));
                    targetW = baseW + (Number.isFinite(extraCap) ? extraCap : 0);
                    reason = ReasonCodes.ALLOCATED;
                }
            } else if (!Number.isFinite(availW)) {
                // Unlimited for this wallbox (budget-wise)
                targetW = w.maxPW;
                reason = ReasonCodes.UNLIMITED;
            } else if (availW <= 0) {
                targetW = 0;
                // Distinguish PV constraint from total budget constraint
                reason = (isPvOnly && pvAvailW <= 0 && totalAvailW > 0) ? (ReasonCodes.NO_PV_SURPLUS) : ReasonCodes.NO_BUDGET;
            } else if (availW >= w.minPW || w.minPW === 0) {
                targetW = Math.min(availW, w.maxPW);
                reason = ReasonCodes.ALLOCATED;
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else {
                targetW = 0;
                reason = isPvOnly ? (ReasonCodes.NO_PV_SURPLUS) : ReasonCodes.BELOW_MIN;
            }

            // Refine reason codes for transparency: station caps, grid caps and user-defined limits.
            try {
                const budgetReason = pickBudgetReason();
                const stationFinite = (Number.isFinite(stationAvailW) && stationAvailW < Number.POSITIVE_INFINITY);
                const totalFinite = (Number.isFinite(totalAvailW) && totalAvailW < Number.POSITIVE_INFINITY);
                const tol = 1e-6;

                if (w.controlBasis !== 'none') {
                    // If we are fully blocked, prefer the hard limiter if it is obvious.
                    if (targetW <= 0) {
                        if (stationFinite && stationAvailW <= 0 && totalAvailW > 0 && (!isPvOnly || pvAvailW > 0)) {
                            reason = ReasonCodes.LIMITED_BY_STATION_CAP;
                        } else if (reason === ReasonCodes.NO_BUDGET && limiter === 'total') {
                            // Prefer a more specific budget reason (grid import / phase cap / §14a)
                            reason = budgetReason;
                        }
                    } else {
                        // Station is the binding min (hard shared cap)
                        if (stationFinite && stationAvailW < w.maxPW - tol) {
                            const nearStation = Math.abs(targetW - Math.min(stationAvailW, w.maxPW)) <= Math.max(1, 0.01 * w.maxPW);
                            if ((limiter === 'station' && nearStation) || (isMinPv && Number.isFinite(minpvMaxTotal) && minpvMaxTotal === stationAvailW && nearStation)) {
                                reason = ReasonCodes.LIMITED_BY_STATION_CAP;
                            }
                        }

                        // Total budget is binding (grid/phase/§14a)
                        if (totalFinite && totalAvailW < w.maxPW - tol) {
                            const nearTotal = Math.abs(targetW - Math.min(totalAvailW, w.maxPW)) <= Math.max(1, 0.01 * w.maxPW);
                            if ((limiter === 'total' && nearTotal) || (isMinPv && Number.isFinite(minpvMaxTotal) && minpvMaxTotal === totalAvailW && nearTotal)) {
                                // Do not override a station cap reason if station is already the limiting factor.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP) {
                                    reason = budgetReason;
                                }
                            }
                        }

                        // User cap: budgets allow more than maxPW, but local limit blocks.
                        if (reason !== ReasonCodes.UNLIMITED && w.userLimitSet && w.maxPW > 0) {
                            const budgetsAllowMore = (!Number.isFinite(availW)) || (availW > (w.maxPW + 1));
                            if (budgetsAllowMore && targetW >= (w.maxPW - Math.max(1, 0.01 * w.maxPW))) {
                                // Only if we are not already clearly limited by station or budget.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP && reason !== budgetReason) {
                                    reason = ReasonCodes.LIMITED_BY_USER_LIMIT;
                                }
                            }
                        }

                        // §14a per-connector cap: budgets allow more than the effective maxPW, but §14a limits the connector.
                        if (para14aActive && w.para14aCapped && w.maxPW > 0) {
                            const budgetsAllowMore = (!Number.isFinite(availW)) || (availW > (w.maxPW + 1));
                            if (budgetsAllowMore && targetW >= (w.maxPW - Math.max(1, 0.01 * w.maxPW))) {
                                // Only override if station cap is not the dominant limiter.
                                if (reason !== ReasonCodes.LIMITED_BY_STATION_CAP) {
                                    reason = ReasonCodes.LIMITED_BY_14A;
                                }
                            }
                        }
                    }
                }
            } catch {
                // ignore
            }

            // Zeit-Ziel Laden: Wenn aktiv, die Leistung auf den errechneten Durchschnitt begrenzen
            // (so können mehrere Fahrzeuge im Depot parallel "bis Uhrzeit X" geplant werden).
            if (w.goalActive && w.goalDesiredW > 0 && effMode !== 'boost') {
                let desired = Math.min(w.maxPW, Math.max(0, w.goalDesiredW));

                // Smart‑Ziel: wenn der Preis gerade klar "günstig" ist, darf das Ziel-Laden etwas früher vorladen,
                // um in teureren Phasen später weniger laden zu müssen. Das bleibt ein Cap (kein Zwang),
                // Budgets/Stationslimits bleiben dominant.
                if (goalStrategy === 'smart' && isCheapNow && !isPvOnly) {
                    desired = Math.min(w.maxPW, desired * goalCheapBoostFactor);
                }
                if (Number.isFinite(desired) && desired >= 0) {
                    // Nur begrenzen (nicht nach oben erzwingen) – PV-/Budget- und Stationslimits bleiben gültig.
                    if (targetW > desired + 1) {
                        targetW = desired;
                    }
                }
            }

                        // Zeit‑Ziel Laden: Wenn nach dem Einstecken auf eine frische SoC‑Aktualisierung gewartet wird,
            // pausieren wir die Ladung temporär (verhindert Start mit stalen/falschen Zielwerten).
            if (w.goalEnabled && (w.goalStatus === 'waiting_soc' || w.goalStatus === 'soc_stale')) {
                targetW = 0;
                targetA = 0;
                reason = ReasonCodes.NO_SETPOINT;
            }

// Safety: if the vehicle is not plugged, always force 0W.
            // Otherwise some chargers may start charging immediately on plug-in
            // if a non-zero setpoint was written while unplugged.
            if (w.vehiclePlugged === false) {
                targetW = 0;
                targetA = 0;
                reason = ReasonCodes.NO_VEHICLE;
            }

            // PV-only Start / Ramp / Stop state machine
            // Goal:
            // - do not start a 3-phase session until the technical minimum is stably available
            // - after start, keep the session alive briefly so slow wallboxes / vehicles can ramp up
            // - only stop after a sustained deficit (small shortfalls may be bridged briefly)
            if (isPvOnly) {
                const startReadyKey = String(w.safe || '');
                const needStartW = Math.max(0, pvTechnicalMinW || pvStartCommandW || 0);
                const startReadyBudgetW = Math.max(0, Math.min(
                    stationAvailW,
                    (typeof pvStartReadyBudgetW === 'number' && Number.isFinite(pvStartReadyBudgetW)) ? pvStartReadyBudgetW : pvAvailW,
                    Number.isFinite(w.maxPW) ? w.maxPW : Number.POSITIVE_INFINITY,
                ));
                const startBudgetW = Math.max(0, Math.min(totalAvailW, stationAvailW, pvAvailW, Number.isFinite(w.maxPW) ? w.maxPW : Number.POSITIVE_INFINITY));
                const holdBudgetW = Math.max(0, Math.min(totalAvailW, stationAvailW, Number.isFinite(w.maxPW) ? w.maxPW : Number.POSITIVE_INFINITY));
                let startReadySince = this._pvStartReadySinceMs.get(startReadyKey) || 0;
                let belowMinSince = this._pvBelowMinSinceMs.get(startReadyKey) || 0;
                const canTrackPvRun = w.vehiclePlugged !== false && w.enabled && w.online && w.controlBasis !== 'none';

                if (!canTrackPvRun) {
                    this._pvStartReadySinceMs.delete(startReadyKey);
                    this._pvBelowMinSinceMs.delete(startReadyKey);
                } else {
                    if (startCooldownActive) {
                        this._pvStartReadySinceMs.delete(startReadyKey);
                        startReadySince = 0;
                        if (targetW > 0) {
                            targetW = 0;
                            targetA = 0;
                            reason = ReasonCodes.NO_PV_SURPLUS;
                        }
                    } else if (!actualOrCmdActive) {
                        if (needStartW <= 0 || startReadyBudgetW >= needStartW) {
                            if (!startReadySince) {
                                startReadySince = now;
                                this._pvStartReadySinceMs.set(startReadyKey, startReadySince);
                            }
                        } else {
                            this._pvStartReadySinceMs.delete(startReadyKey);
                            startReadySince = 0;
                        }
                    } else {
                        this._pvStartReadySinceMs.delete(startReadyKey);
                        startReadySince = 0;
                    }

                    const startStable = actualOrCmdActive
                        || needStartW <= 0
                        || (startReadySince > 0 && (pvStartStableMs <= 0 || (now - startReadySince) >= pvStartStableMs));

                    if (!actualOrCmdActive && targetW > 0 && !startStable) {
                        targetW = 0;
                        targetA = 0;
                        reason = ReasonCodes.NO_PV_SURPLUS;
                    }

                    if (actualOrCmdActive && needStartW > 0) {
                        const deficitW = Math.max(0, needStartW - startBudgetW);
                        const belowMinNow = deficitW > 1;
                        if (belowMinNow) {
                            if (!belowMinSince) {
                                belowMinSince = now;
                                this._pvBelowMinSinceMs.set(startReadyKey, belowMinSince);
                            }
                        } else {
                            this._pvBelowMinSinceMs.delete(startReadyKey);
                            belowMinSince = 0;
                        }

                        const stopDelayElapsed = belowMinSince > 0
                            && (pvConnectorStopDelayMs <= 0 || (now - belowMinSince) >= pvConnectorStopDelayMs);
                        const canHoldAtMin = holdBudgetW >= Math.max(1, needStartW)
                            && deficitW <= pvRunDeficitToleranceW;
                        const shouldKeepAlive = (startupHoldActive || minRunActive || !stopDelayElapsed) && canHoldAtMin;

                        if ((targetW <= 0 || targetW < needStartW) && belowMinNow && shouldKeepAlive) {
                            targetW = Math.min(Math.max(needStartW, 0), holdBudgetW);
                            targetA = 0;
                            reason = ReasonCodes.ALLOCATED;
                        } else if ((targetW <= 0 || targetW < needStartW) && belowMinNow && stopDelayElapsed) {
                            targetW = 0;
                            targetA = 0;
                            reason = ReasonCodes.NO_PV_SURPLUS;
                        }
                    } else if (!actualOrCmdActive) {
                        this._pvBelowMinSinceMs.delete(startReadyKey);
                    }
                }
            } else {
                this._pvStartReadySinceMs.delete(String(w.safe || ''));
                this._pvBelowMinSinceMs.delete(String(w.safe || ''));
                if (!isPvManaged) this._pvMinRunUntilMs.delete(String(w.safe || ''));
                if (!isPvManaged) this._pvStartCooldownUntilMs.delete(String(w.safe || ''));
            }

            // Convert to A for AC current-based control
            if (w.controlBasis === 'currentA' && w.setAKey) {
                const vFactor = w.vFactor;
                const maxA = w.maxA;
                const minA = w.minA;

                // Keep a hard W limit to avoid rounding up above our computed target (PV/budget safety)
                const hardLimitW = clamp(num(targetW, 0), 0, w.maxPW);

                let aRaw = (hardLimitW > 0 && vFactor > 0) ? (hardLimitW / vFactor) : 0;
                aRaw = clamp(aRaw, 0, maxA);

                // round DOWN to 0.1A to avoid budget overshoot
                let aRounded = Math.floor(aRaw * 10) / 10;

                // Apply minA (avoid rounding-down dropping below min)
                if (aRounded > 0 && aRounded < minA) {
                    // try rounding up to the next 0.1A step if that would satisfy minA
                    const aUp = Math.ceil(aRaw * 10) / 10;
                    if (aUp >= minA && aUp <= maxA) {
                        aRounded = aUp;
                    } else {
                        aRounded = 0;
                    }
                }

                // Clamp again to hardLimitW (avoid minA rounding up exceeding targetW)
                if (aRounded > 0 && vFactor > 0) {
                    const wRounded = aRounded * vFactor;
                    if (wRounded > hardLimitW + 0.001) {
                        const aMax = Math.floor((hardLimitW / vFactor) * 10) / 10;
                        aRounded = clamp(aMax, 0, maxA);
                    }
                }

                if (aRounded < minA) aRounded = 0;
                targetA = aRounded;
                targetW = targetA * vFactor;

                // Safety: enforce min power after quantization
                if (targetW > 0 && w.minPW > 0 && targetW < w.minPW) {
                    targetA = 0;
                    targetW = 0;
                    reason = ReasonCodes.BELOW_MIN;
                }
            } else if (w.chargerType === 'AC') {
                // purely informational for power-based AC
                const vFactor = w.vFactor;
                targetA = (targetW > 0 && vFactor > 0) ? (targetW / vFactor) : 0;
            } else {
                // DC: current is not summed
                targetA = 0;
            }

            // MU6.11 + PV-only soft-start:
            // - respect global/per-wallbox ramp limits
            // - for PV / Min+PV prefer a soft ramp profile
            // - on a fresh start jump directly to the technical minimum, then ramp upwards slowly
            let wbMaxDeltaW = clamp(num(w.maxDeltaWPerTick, maxDeltaWPerTick), 0, 1e12);
            let wbMaxDeltaA = clamp(num(w.maxDeltaAPerTick, maxDeltaAPerTick), 0, 1e6);
            if (isPvManaged) {
                wbMaxDeltaW = choosePositiveMin(wbMaxDeltaW, num(w.pvRampUpWPerTick, 0), pvRampUpWPerTick);
                wbMaxDeltaA = choosePositiveMin(wbMaxDeltaA, num(w.pvRampUpAperTick, 0), pvRampUpAperTick);
            }
            const wbStepW = clamp(num(w.stepW, stepW), 0, 1e12);
            const wbStepA = clamp(num(w.stepA, stepA), 0, 1e6);

            let cmdW = targetW;
            let cmdA = targetA;
            const pvManagedStartNow = isPvManaged && !prevCmdWasActive && cmdW > 0 && w.enabled && w.online && w.vehiclePlugged !== false;

            if (w.controlBasis === 'currentA' && w.setAKey) {
                cmdA = floorToStep(cmdA, wbStepA);
                cmdA = clamp(cmdA, 0, w.maxA);
                if (cmdA > 0 && w.minA > 0 && cmdA < w.minA) cmdA = 0;

                if (pvManagedStartNow) {
                    cmdA = clamp(Math.max(pvStartCommandA || w.minA || 0, w.minA || 0), 0, w.maxA);
                } else {
                    cmdA = rampUp(prevCmdA, cmdA, wbMaxDeltaA);
                }

                if (cmdA > 0 && w.minA > 0 && cmdA < w.minA) cmdA = 0;
                cmdW = (cmdA > 0 && w.vFactor > 0) ? (cmdA * w.vFactor) : 0;
            } else {
                cmdW = floorToStep(cmdW, wbStepW);
                if (cmdW > 0 && w.minPW > 0 && cmdW < w.minPW) cmdW = 0;

                if (pvManagedStartNow) {
                    const minStartW = Math.max(pvStartCommandW || w.minPW || 0, w.minPW || 0);
                    cmdW = clamp(minStartW, 0, w.maxPW);
                } else {
                    cmdW = rampUp(prevCmdW, cmdW, wbMaxDeltaW);
                }

                if (cmdW > 0 && w.minPW > 0 && cmdW < w.minPW) cmdW = 0;

                if (w.chargerType === 'AC') {
                    cmdA = (cmdW > 0 && w.vFactor > 0) ? (cmdW / w.vFactor) : 0;
                } else {
                    cmdA = 0;
                }
            }

            try {
                if (feneconEvPriorityActive && wallboxHasEvPriorityDemand(w)) {
                    const tolW = Math.max(50, (typeof w.maxPW === 'number' && Number.isFinite(w.maxPW) && w.maxPW > 0) ? (w.maxPW * 0.01) : 50);

                    if (isPvOnly) {
                        const pvShortage = reason === ReasonCodes.NO_PV_SURPLUS || limiter === 'pv';
                        if (pvShortage && cmdW < (w.maxPW - tolW)) {
                            evPriorityLimitedWallboxes += 1;
                            evPriorityStarvedW += Math.max(0, w.maxPW - cmdW);
                        }
                    } else if (isMinPv) {
                        const minBaseW = (w.minPW > 0) ? w.minPW : 0;
                        const maxTotalW = (typeof minpvMaxTotal === 'number' && Number.isFinite(minpvMaxTotal)) ? Math.max(0, minpvMaxTotal) : 0;
                        const extraPossibleW = Math.max(0, Math.min(w.maxPW, maxTotalW) - Math.min(minBaseW, maxTotalW));
                        const extraDeliveredW = Math.max(0, cmdW - Math.min(minBaseW, cmdW));
                        const pvShortage = Number.isFinite(pvAvailW) && (pvAvailW + tolW) < extraPossibleW;
                        if (pvShortage && (extraDeliveredW + tolW) < extraPossibleW) {
                            evPriorityLimitedWallboxes += 1;
                            evPriorityStarvedW += Math.max(0, extraPossibleW - extraDeliveredW);
                        }
                    }

                    // Prioritätslücke unabhängig vom aktuellen PV-Limiter:
                    // Wenn ein PV-/Min+PV-Ladepunkt noch nicht bis zur nicht-PV-begrenzten
                    // technischen/harten Grenze hochgeregelt ist, darf der Speicher den PV-Überschuss
                    // nicht parallel wegfangen. Erst wenn die Wallbox ihr mögliches Ziel erreicht hat,
                    // darf Rest-PV in den Speicher gehen.
                    const nonPvAvailW = Math.min(
                        w.maxPW,
                        Number.isFinite(totalAvailW) ? totalAvailW : Number.POSITIVE_INFINITY,
                        Number.isFinite(stationAvailW) ? stationAvailW : Number.POSITIVE_INFINITY,
                    );
                    const nonPvTargetW = Number.isFinite(nonPvAvailW) ? Math.max(0, nonPvAvailW) : Math.max(0, w.maxPW || 0);
                    const evPriorityCanUseNow = (targetW > tolW) || (cmdW > tolW) || actualOrCmdActive;
                    const openW = Math.max(0, nonPvTargetW - Math.max(0, cmdW));
                    if (evPriorityCanUseNow && openW > tolW) {
                        evPriorityPendingW += openW;
                    }
                }
            } catch {
                // ignore
            }

            // Station diagnostics: sum commanded power per station
            if (_sk) {
                stationTargetSumW.set(_sk, (stationTargetSumW.get(_sk) || 0) + cmdW);
            }

            let batteryContributionThisW = 0;

            // Apply total budget accounting (use commanded power). The base pool is available
            // to all wallboxes; the storage-assist pool is only available to wallboxes where
            // installer freigegeben + customer enabled + storage policy is currently allowed.
            if (Number.isFinite(remainingW)) {
                const consumedW = Math.max(0, cmdW);
                let baseConsumedW = 0;
                if (Number.isFinite(nonStorageRemainingW)) {
                    baseConsumedW = Math.min(Math.max(0, nonStorageRemainingW), consumedW);
                    nonStorageRemainingW = Math.max(0, nonStorageRemainingW - baseConsumedW);
                } else {
                    baseConsumedW = consumedW;
                }
                if (storageEligible && storageAssistRemainingW > 0) {
                    const restW = Math.max(0, consumedW - baseConsumedW);
                    batteryContributionThisW = Math.min(storageAssistRemainingW, restW);
                    storageAssistRemainingW = Math.max(0, storageAssistRemainingW - batteryContributionThisW);
                }
                remainingW = Math.max(0, remainingW - consumedW);
                usedW += consumedW;
            }

            try {
                w.batteryContributionW = batteryContributionThisW;
                await this._queueState(`${w.ch}.batteryContributionW`, Math.round(batteryContributionThisW), true);
            } catch {
                // ignore
            }

            // Apply station cap accounting (shared between connectors of same station)
            if (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey)) {
                const prev = stationRemainingW.get(w.stationKey);
                if (typeof prev === 'number' && Number.isFinite(prev)) {
                    stationRemainingW.set(w.stationKey, Math.max(0, prev - cmdW));
                }
            }

            // Apply PV budget accounting (shared pool)
            let pvUsedThisW = 0;
            if (Number.isFinite(pvRemainingW)) {
                if (isPvOnly) {
                    pvUsedThisW = cmdW;
                } else if (isMinPv) {
                    const base = (w.minPW > 0) ? Math.min(cmdW, w.minPW) : 0;
                    pvUsedThisW = Math.max(0, cmdW - base);
                } else {
                    pvUsedThisW = 0;
                }

                pvRemainingW = Math.max(0, pvRemainingW - pvUsedThisW);
                pvUsedW += pvUsedThisW;
            }

            totalTargetPowerW += cmdW;
            if (Number.isFinite(cmdA) && cmdA > 0) totalTargetCurrentA += cmdA;

            // 0.8.65: Zentralbudget nur für echten Ladebedarf reservieren.
            // Online/idle Ladepunkte oder alte Zielwerte dürfen nachgelagerte Verbraucher nicht blockieren.
            const demandActualW = Math.max(0, actualNowW);
            const demandCommandW = Math.max(0, Number.isFinite(cmdW) ? cmdW : 0);
            const demandTargetW = Math.max(0, Number.isFinite(targetW) ? targetW : 0);
            const activeChargingDemand = !!(
                w.enabled
                && w.online
                && w.controlBasis !== 'none'
                && w.vehiclePlugged !== false
                && (
                    w.charging === true
                    || demandActualW >= activityThresholdW
                    || demandCommandW >= activityThresholdW
                    || demandTargetW >= activityThresholdW
                    || (w.goalActive === true && Math.max(demandCommandW, demandTargetW) > 0)
                )
            );
            const demandReserveThisW = activeChargingDemand ? Math.max(demandActualW, demandCommandW, demandTargetW) : 0;
            if (demandReserveThisW > 0) {
                evcsActiveDemandReserveW += demandReserveThisW;

                // PV-Reservierung besteht aus zwei bewusst getrennten Signalen:
                // 1) tatsaechlich im aktuellen Allocation-Schritt genutzter PV-Anteil,
                // 2) aktiver PV-Ladeintent aus Ist-, Kommando- oder Zielwert.
                // Der Intent verhindert eine kurzzeitige Freigabe des EVCS-Anteils an
                // den Speicher, wenn PV-Hysterese oder Wallbox-Telemetrie fuer einen
                // einzelnen Tick noch keinen pvUsedThisW liefern. Der zentrale EVCS-Cap
                // begrenzt diesen Wert spaeter weiterhin strikt auf die Kundenvorgabe.
                const demandPvActualThisW = Math.max(0, Math.min(demandReserveThisW, pvUsedThisW || 0));
                const demandPvIntentThisW = computePvManagedDemandIntentW(effMode, demandReserveThisW, w.minPW);
                evcsActiveDemandPvReserveW += demandPvActualThisW;
                evcsActiveDemandPvIntentW += demandPvIntentThisW;
                evcsActiveDemandWallboxes += 1;
            }

            // Writes (consumer abstraction)
            let applied = false;
            let applyStatus = 'skipped';
            /** @type {any|null} */
            let applyWrites = null;

            // TS-Migration 0.7.126:
            // Die Zielwerte wurden oben weiterhin als Fallback-Referenz berechnet, werden
            // aber nicht mehr direkt hier geschrieben. Nach dem vollständigen Allocation-
            // Snapshot übernimmt der produktive TS-Write-Plan den normalen Schreibpfad;
            // diese JS-Werte dienen nur noch als Executor-Fallback.
            applyStatus = 'planned_by_ts_write_plan';

            // MU6.11: Remember last commanded setpoints for ramp limiting
            this._lastCmdTargetW.set(w.safe, cmdW);
            this._lastCmdTargetA.set(w.safe, cmdA);

            // If a PV-only start attempt collapses before the wallbox reports real power,
            // wait briefly before trying again. This prevents repeated short start pulses
            // while still allowing the same PV window to recover after a few minutes.
            try {
                if (isPvOnly && actualNowW >= activityThresholdW) {
                    this._pvStartCooldownUntilMs.delete(w.safe);
                } else if (isPvOnly
                    && pvStartRetryCooldownMs > 0
                    && prevCmdWasActive
                    && cmdW < activityThresholdW
                    && actualNowW < activityThresholdW
                    && w.charging !== true
                    && w.enabled
                    && w.online
                    && w.vehiclePlugged !== false
                    && (reason === ReasonCodes.NO_PV_SURPLUS || reason === ReasonCodes.BELOW_MIN || limiter === 'pv')) {
                    this._pvStartCooldownUntilMs.set(w.safe, now + pvStartRetryCooldownMs);
                    this._pvStartReadySinceMs.delete(w.safe);
                    this._pvBelowMinSinceMs.delete(w.safe);
                    this._pvStartupUntilMs.delete(w.safe);
                    this._pvMinRunUntilMs.delete(w.safe);
                } else if (!isPvOnly || w.vehiclePlugged === false || !w.enabled || !w.online) {
                    this._pvStartCooldownUntilMs.delete(w.safe);
                }
            } catch {
                // ignore
            }

            // PV-Start Einschwingzeit + Mindestlaufzeit:
            // Einige Wallboxen/Fahrzeuge übernehmen nach der Freigabe die neue Leistung verzögert.
            // Damit wir direkt nach dem Start nicht wieder auf 0 regeln, halten wir eine kurze
            // Settling-Phase offen und merken uns zusätzlich eine kleine Mindestlaufzeit.
            try {
                const pvStartSettleMs = clamp(num(cfg.pvStartSettleSec, 20), 0, 3600) * 1000;
                const cmdStartsNow = isPvManaged
                    && pvStartSettleMs >= 0
                    && w.enabled
                    && w.online
                    && w.vehiclePlugged !== false
                    && !prevCmdWasActive
                    && cmdW >= activityThresholdW;

                if (cmdStartsNow) {
                    if (pvStartSettleMs > 0) this._pvStartupUntilMs.set(w.safe, now + pvStartSettleMs);
                    else this._pvStartupUntilMs.delete(w.safe);
                    if (isPvOnly && pvMinRunMs > 0) this._pvMinRunUntilMs.set(w.safe, now + pvMinRunMs);
                    else if (!isPvOnly) this._pvMinRunUntilMs.delete(w.safe);
                    this._pvStartReadySinceMs.delete(w.safe);
                    this._pvBelowMinSinceMs.delete(w.safe);
                } else if (actualNowW >= activityThresholdW || cmdW < activityThresholdW || w.vehiclePlugged === false
                    || !w.enabled || !w.online || !isPvManaged) {
                    this._pvStartupUntilMs.delete(w.safe);
                    if (cmdW < activityThresholdW || !isPvOnly) this._pvMinRunUntilMs.delete(w.safe);
                    if (cmdW < activityThresholdW) this._pvBelowMinSinceMs.delete(w.safe);
                } else {
                    const holdUntil = this._pvStartupUntilMs.get(w.safe) || 0;
                    if (holdUntil > 0 && now >= holdUntil) this._pvStartupUntilMs.delete(w.safe);
                    const minRunUntil = this._pvMinRunUntilMs.get(w.safe) || 0;
                    if (minRunUntil > 0 && now >= minRunUntil) this._pvMinRunUntilMs.delete(w.safe);
                }
            } catch {
                // ignore
            }

            // Ziel-Laden: Shortfall & Status Update (nach Quantisierung/Ramp)
            try {
                let goalShortfallNow = 0;
                let goalStatusNow = String(w.goalStatus || (w.goalEnabled ? 'active' : 'inactive'));

                if (!w.goalEnabled) {
                    goalStatusNow = 'inactive';
                    goalShortfallNow = 0;
                } else if (w.goalStatus === 'reached' || w.goalStatus === 'no_index' || w.goalStatus === 'no_deadline') {
                    goalStatusNow = String(w.goalStatus);
                    goalShortfallNow = 0;
                } else if (w.goalActive && w.goalDesiredW > 0) {
                    goalShortfallNow = Math.max(0, Math.round(w.goalDesiredW - cmdW));
                    if (w.goalOverdue) {
                        goalStatusNow = 'overdue';
                    // Allow some measurement/rounding deviation (e.g. 200–300 W) before flagging "Unterversorgung".
                    } else if (goalShortfallNow > 300) {
                        goalStatusNow = 'shortfall';
                    } else {
                        goalStatusNow = 'active';
                    }
                } else {
                    goalShortfallNow = 0;
                }

                await this._queueState(`${w.ch}.goalShortfallW`, goalShortfallNow, true);
                await this._queueState(`${w.ch}.goalStatus`, goalStatusNow, true);
            } catch {
                // ignore
            }

            await this._queueState(`${w.ch}.targetCurrentA`, cmdA, true);
            await this._queueState(`${w.ch}.targetPowerW`, cmdW, true);
            // Stationsgruppe: verbleibendes Stationsbudget (nach Abzug dieses Connectors)
            try {
                const rem = (w.stationKey && stationRemainingW && stationRemainingW.has(w.stationKey))
                    ? stationRemainingW.get(w.stationKey)
                    : null;
                await this._queueState(`${w.ch}.stationRemainingW`, (typeof rem === 'number' && Number.isFinite(rem)) ? rem : 0, true);
            } catch {
                // ignore
            }
            await this._queueState(`${w.ch}.applied`, applied, true);
            await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
            if (applyWrites) {
                try {
                    await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                } catch {
                    await this._queueState(`${w.ch}.applyWrites`, '', true);
                }
            } else {
                await this._queueState(`${w.ch}.applyWrites`, '', true);
            }
            await this._queueState(`${w.ch}.reason`, reason, true);

            debugAlloc.push({
                safe: w.safe,
                name: w.name,
                effectiveMode: effMode,
                userMode: w.userMode,
                charging: !!w.charging,
                chargingSinceMs: w.chargingSinceMs || 0,
                online: !!w.online,
                enabled: !!w.enabled,
                connected: w.vehiclePlugged !== false,
                priority: w.priority,
                controlBasis: w.controlBasis,
                chargerType: w.chargerType,
                minPowerW: w.minPW,
                maxPowerW: w.maxPW,
                phaseCount: w.phases,
                stationKey: w.stationKey || '',
                connectorNo: w.connectorNo || 0,
                rawTargetW: targetW,
                rawTargetA: targetA,
                targetW: cmdW,
                targetA: cmdA,
                activeDemand: !!activeChargingDemand,
                demandReserveW: demandReserveThisW,
                pvUsedW: pvUsedThisW,
                batteryContributionW: batteryContributionThisW,
                storageAssistCustomerAllowed: !!w.storageAssistCustomerAllowed,
                userStorageAssistEnabled: !!w.userStorageAssistEnabled,
                effectiveStorageAssist: !!w.effectiveStorageAssist,
                storageAssistBlockedReason: String(w.storageAssistBlockedReason || ''),
                pvRemainingW: Number.isFinite(pvRemainingW) ? pvRemainingW : null,
                applied,
                applyStatus,
                applyWrites,
                reason,
                boost: isBoost,
                pvLimited: isPvOnly || isMinPv,
                hasSetpoint: !!(w.setAKey || w.setWKey),
                setAKey: w.setAKey || '',
                setWKey: w.setWKey || '',
                enableKey: w.enableKey || '',
                writeRequired: !!((w.setAKey || w.setWKey) && !!w.online),
            });
        }

        // wallboxes that are disabled/offline: expose targets as 0
        // Special case: if the installer enabled the chargepoint, but the end-customer
        // switched off the EMS regulation (userEnabled=false), we actively write a 0-setpoint.
        // Automatic EMS control must not toggle the wallbox enable/freigabe during normal
        // regulation, because many EVCS/vehicles react badly to repeated enable flapping.
        for (const w of wbList) {
            if (w.enabled && w.online) continue;

            let applied = false;
            let applyStatus = 'skipped';
            /** @type {any|null} */
            let applyWrites = null;

            // Regelung AUS (user): force a safe stop while staying online
            if (!!w.cfgEnabled && !!w.online && !w.userEnabled) {
                // TS-Migration 0.7.126: Auch der sichere 0-Wert bei kundenseitig
                // deaktivierter Regelung wird im Normalpfad vom produktiven TS-Write-Plan
                // ausgeführt. JS bleibt Executor/Fallback, schreibt hier aber nicht doppelt.
                applyStatus = 'planned_by_ts_write_plan';
            }

            await this._queueState(`${w.ch}.targetCurrentA`, 0, true);
            await this._queueState(`${w.ch}.targetPowerW`, 0, true);
            await this._queueState(`${w.ch}.applied`, applied, true);
            await this._queueState(`${w.ch}.applyStatus`, applyStatus, true);
            if (applyWrites) {
                try {
                    await this._queueState(`${w.ch}.applyWrites`, JSON.stringify(applyWrites), true);
                } catch {
                    await this._queueState(`${w.ch}.applyWrites`, '', true);
                }
            } else {
                await this._queueState(`${w.ch}.applyWrites`, '', true);
            }
            const offReason = availabilityReason(!!w.cfgEnabled, !!w.userEnabled, !!w.online);
            await this._queueState(`${w.ch}.reason`, offReason, true);
            debugAlloc.push({
                safe: w.safe,
                name: w.name,
                effectiveMode: String(w.effectiveMode || 'normal'),
                userMode: w.userMode || '',
                charging: !!w.charging,
                chargingSinceMs: w.chargingSinceMs || 0,
                online: !!w.online,
                enabled: !!w.enabled,
                connected: w.vehiclePlugged !== false,
                priority: w.priority,
                controlBasis: w.controlBasis,
                chargerType: w.chargerType,
                minPowerW: w.minPW,
                maxPowerW: w.maxPW,
                phaseCount: w.phases,
                stationKey: w.stationKey || '',
                connectorNo: w.connectorNo || 0,
                rawTargetW: 0,
                rawTargetA: 0,
                targetW: 0,
                targetA: 0,
                activeDemand: false,
                demandReserveW: 0,
                pvUsedW: 0,
                pvRemainingW: Number.isFinite(pvRemainingW) ? pvRemainingW : null,
                applied,
                applyStatus,
                applyWrites,
                reason: offReason,
                boost: false,
                pvLimited: false,
                hasSetpoint: !!(w.setAKey || w.setWKey),
                setAKey: w.setAKey || '',
                setWKey: w.setWKey || '',
                enableKey: w.enableKey || '',
                writeRequired: !!((w.setAKey || w.setWKey) && !!w.online && (!!w.cfgEnabled && !w.userEnabled)),
            });
        }


        const evcsControlReserveW = Math.max(0, Math.round(evcsActiveDemandReserveW));
        const evcsControlPvReserveW = Math.max(0, Math.round(evcsActiveDemandPvReserveW));
        const evcsControlPvIntentW = Math.max(0, Math.round(evcsActiveDemandPvIntentW));
        const evcsControlRemainingW = Number.isFinite(budgetW)
            ? Math.max(0, Math.round(Number(budgetW) - evcsControlReserveW))
            : 0;
        try {
            if (budgetDebug && typeof budgetDebug === 'object') {
                budgetDebug.evcsReservedW = evcsControlReserveW;
                budgetDebug.evcsActiveDemandReserveW = evcsControlReserveW;
                budgetDebug.evcsActiveDemandPvReserveW = evcsControlPvReserveW;
                budgetDebug.evcsActiveDemandPvIntentW = evcsControlPvIntentW;
                budgetDebug.evcsActiveDemandWallboxes = evcsActiveDemandWallboxes;
            }
            const budgetEntry = debugAlloc.find(a => a && a.type === 'budget');
            if (budgetEntry && budgetEntry.details && typeof budgetEntry.details === 'object') {
                budgetEntry.details.evcsReservedW = evcsControlReserveW;
                budgetEntry.details.evcsActiveDemandReserveW = evcsControlReserveW;
                budgetEntry.details.evcsActiveDemandPvReserveW = evcsControlPvReserveW;
                budgetEntry.details.evcsActiveDemandPvIntentW = evcsControlPvIntentW;
                budgetEntry.details.evcsActiveDemandWallboxes = evcsActiveDemandWallboxes;
            }
        } catch {
            // diagnostics only
        }

        const tsWallboxesForAllocation = this._mapChargingWallboxesForTsAllocation(wbList);
        const tsAllocationState = await this._publishChargingAllocationTsShadow({
            mode,
            budgetMode: effectiveBudgetMode,
            budgetW,
            usedW: Number.isFinite(budgetW) ? usedW : totalTargetPowerW,
            remainingW: Number.isFinite(budgetW) ? remainingW : 0,
            totalPowerW: totalFreshActualPowerW,
            totalTargetPowerW,
            totalTargetCurrentA,
            pvAvailableW: pvCapW,
            pvAvailable: pvAvailableState,
            gridCapEvcsW,
            gridCapBinding,
            phaseCapEvcsW,
            phaseCapBinding,
            para14aActive,
            para14aCapEvcsW: para14aTotalCapW,
            para14aBinding,
            storageAssistActive,
            storageAssistW,
            pausedByPeakShaving,
            staleMeter,
            staleBudget,
            preferTsNativeAllocation: true,
            tsNormalSourceLock: true,
            allowJsComparisonFallback: false,
            wallboxes: tsWallboxesForAllocation,
            allocations: debugAlloc,
            phaseSelection: {
                now,
                mode,
                budgetMode: effectiveBudgetMode,
                pvAvailableW: pvCapW,
                stablePvAvailableW: (typeof pvSurplusNoEvAvg5mWState === 'number' && Number.isFinite(pvSurplusNoEvAvg5mWState)) ? pvSurplusNoEvAvg5mWState : pvCapW,
                budgetW,
                remainingW: Number.isFinite(budgetW) ? remainingW : pvCapW,
                staleMeter,
                staleBudget,
                phaseAutoEnabled,
                switchUpThresholdW: phaseSwitchUpThresholdW,
                switchDownThresholdW: phaseSwitchDownThresholdW,
                switchUpStableMs: phaseSwitchUpStableMs,
                switchDownStableMs: phaseSwitchDownStableMs,
                switchCooldownMs: phaseSwitchCooldownMs,
                switchSettleMs: phaseSwitchSettleMs,
                switchSafePowerW: phaseSwitchSafePowerW,
                wallboxes: tsWallboxesForAllocation,
                ts: now,
            },
        });
        await this._publishChargingPhaseSelectionRuntimeStates(tsAllocationState && tsAllocationState.phasePlan ? tsAllocationState.phasePlan : null, wbList);

        const tsWritePlanProductive = tsAllocationState && tsAllocationState.writePlanProductive ? tsAllocationState.writePlanProductive : null;
        const tsWritePlanUsed = await this._executeChargingTsSetpointPlan(
            tsWritePlanProductive,
            wbList,
            debugAlloc,
        );
        const legacyFallbackReason = tsWritePlanProductive && tsWritePlanProductive.fallbackReason
            ? tsWritePlanProductive.fallbackReason
            : 'ts-write-plan-not-productive';
        if (!tsWritePlanUsed) {
            await this._executeChargingLegacySetpointFallback(wbList, debugAlloc, legacyFallbackReason);
        }
        await this._publishChargingLegacyDecisionTreeState(tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, debugAlloc, 'normal-allocation-write-plan', legacyFallbackReason);
        await this._publishChargingTsNormalSourceState('normal-allocation-write-plan', tsAllocationState, tsWritePlanProductive, tsWritePlanUsed, legacyFallbackReason, false);


        publishEvPriorityCaps({
            active: !!evPriorityRequested,
            blockStorageCharge: !!(evPriorityRequested && (evPriorityLimitedWallboxes > 0 || evPriorityPendingW > 0)),
            requestedCount: evPriorityWallboxes.length,
            limitedWallboxes: evPriorityLimitedWallboxes,
            starvedW: Math.round(Math.max(evPriorityStarvedW || 0, evPriorityPendingW || 0)),
            pendingW: Math.round(evPriorityPendingW || 0),
            storageYieldW: Math.round(evPriorityStorageYieldW || 0),
            storageSource: String(evPriorityStorageSource || ''),
        });

        // MU6.1: diagnostics logging (compact, decision-leading)
        const diagCfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        const diagEnabled = !!(diagCfg && diagCfg.enabled);
        const diagLevel = (diagCfg && (diagCfg.logLevel === 'info' || diagCfg.logLevel === 'debug')) ? diagCfg.logLevel : 'debug';
        const diagMaxJsonLenNum = diagCfg ? Number(diagCfg.maxJsonLen) : NaN;
        const diagMaxJsonLen = (Number.isFinite(diagMaxJsonLenNum) && diagMaxJsonLenNum >= 1000) ? diagMaxJsonLenNum : 20000;

        if (diagEnabled) {
            const nowDiag = Date.now();
            const logIntSecNum = diagCfg ? Number(diagCfg.logIntervalSec) : NaN;
            const logIntSec = (Number.isFinite(logIntSecNum) && logIntSecNum >= 0) ? logIntSecNum : 10;
            const logIntMs = Math.round(logIntSec * 1000);
            const shouldLog = (logIntMs <= 0) || ((nowDiag - (this._lastDiagLogMs || 0)) >= logIntMs);
            if (!shouldLog) {
                // skip logging this tick
            } else {
                this._lastDiagLogMs = nowDiag;
                try {
                const order = sorted.map(w => w.safe).join('>');
                const top = debugAlloc
                    .filter(a => a && typeof a.safe === 'string')
                    .slice(0, 10)
                    .map(a => `${a.safe}:${Math.round(Number(a.targetW || 0))}W/${(Number.isFinite(Number(a.targetA)) ? Number(a.targetA).toFixed(1) : '0.0')}A(${a.reason || ''})`)
                    .join(' ');
                const msg = `[CM] mode=${mode} budgetMode=${effectiveBudgetMode} budget=${Math.round(Number(budgetW || 0))}W used=${Math.round(Number(usedW || 0))}W reserve=${Math.round(Number(evcsControlReserveW || 0))}W rem=${Math.round(Number(remainingW || 0))}W online=${onlineCount}/${wbList.length} order=${order}` + (top ? (` targets=${top}`) : '');
                const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[diagLevel] === 'function') ? this.adapter.log[diagLevel] : this.adapter.log.debug;
                fn.call(this.adapter.log, msg);
            } catch {
                // ignore
            }
            }
        }

        try {
            const s = JSON.stringify(debugAlloc);
            await this._queueState('chargingManagement.debug.allocations', s.length > diagMaxJsonLen ? (s.slice(0, diagMaxJsonLen) + '...') : s, true);
        } catch {
            await this._queueState('chargingManagement.debug.allocations', '[]', true);
        }

        // Gate A: expose which top-level limiter is active
        let finalStatus = 'ok';
        if (pauseFollowPeakBudget) {
            finalStatus = pauseFollowGridCaps ? 'peak_active_follow_grid_caps' : 'peak_active_follow_peak_budget';
        } else if (gridCapBinding && phaseCapBinding) {
            finalStatus = 'limited_grid_import_and_phase';
        } else if (gridCapBinding) {
            finalStatus = 'limited_grid_import';
        } else if (phaseCapBinding) {
            finalStatus = 'limited_phase_cap';
        }
        const tsControlState = await this._publishChargingControlTsShadow({
            mode,
            budgetMode: effectiveBudgetMode,
            status: finalStatus,
            active: controlActive,
            budgetW,
            usedW: evcsControlReserveW,
            remainingW: evcsControlRemainingW,
            totalPowerW: totalFreshActualPowerW,
            totalTargetPowerW,
            totalTargetCurrentA,
            wallboxCount: wbList.length,
            onlineWallboxes: onlineCount,
            connectedCount: wbList.filter(w => w && w.vehiclePlugged !== false && (w.charging || w.enabled || w.online)).length,
            pausedByPeakShaving,
            staleMeter,
            staleBudget,
            pvAvailable: pvAvailableState,
            gridImportLimitW,
            gridImportLimitEffW,
            gridImportW,
            gridCapEvcsW,
            gridCapBinding,
            phaseCapEvcsW,
            phaseCapBinding,
            para14aActive,
            para14aCapEvcsW: para14aTotalCapW,
            para14aBinding,
            storageAssistActive,
            storageAssistW,
        });
        const tsControlApply = tsControlState && tsControlState.productiveDecision && tsControlState.productiveDecision.productive && tsControlState.productiveDecision.apply
            ? tsControlState.productiveDecision.apply
            : null;
        await this._queueState('chargingManagement.control.active', tsControlApply ? tsControlApply.active : controlActive, true);
        await this._queueState('chargingManagement.control.mode', tsControlApply ? tsControlApply.mode : mode, true);
        await this._queueState('chargingManagement.control.budgetMode', tsControlApply ? tsControlApply.budgetMode : effectiveBudgetMode, true);
        await this._queueState('chargingManagement.control.status', tsControlApply ? tsControlApply.status : finalStatus, true);
        await this._queueState('chargingManagement.control.budgetW', tsControlApply ? tsControlApply.budgetW : (Number.isFinite(budgetW) ? budgetW : 0), true);
        await this._queueState('chargingManagement.control.usedW', tsControlApply ? tsControlApply.usedW : evcsControlReserveW, true);
        await this._queueState('chargingManagement.control.actualW', Math.max(0, Math.round(Number(totalFreshActualPowerW || 0))), true);
        await this._queueState('chargingManagement.control.reserveW', evcsControlReserveW, true);
        await this._queueState('chargingManagement.control.activeDemandReserveW', evcsControlReserveW, true);
        await this._queueState('chargingManagement.control.pvActiveDemandReserveW', evcsControlPvReserveW, true);
        await this._queueState('chargingManagement.control.pvActiveDemandIntentW', evcsControlPvIntentW, true);
        await this._queueState('chargingManagement.control.activeDemandWallboxes', evcsActiveDemandWallboxes, true);
        await this._queueState('chargingManagement.control.remainingW', tsControlApply ? tsControlApply.remainingW : evcsControlRemainingW, true);

        await this._publishChargingNormalSourceState({
            context: 'normal-allocation-write-plan',
            mode,
            status: finalStatus,
            safetyStop: false,
            budget: chargingBudgetTsProductive,
            control: tsControlState && tsControlState.productiveDecision,
            allocation: tsAllocationState && (tsAllocationState.normalSourceDecision || tsAllocationState.productiveDecision),
            writePlan: tsWritePlanProductive,
            executor: this._chargingWritePlanExecutorLast,
            legacy: this._chargingLegacyDecisionTreeLast,
        });

        // Central EMS Budget & Gates: EVCS is the first flexible consumer group.
        // This does not change EVCS allocation; it only reserves the already decided target/usage
        // for downstream apps (thermal, heating rod, generic loads) in the same tick.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            if (rt && typeof rt.reserve === 'function') {
                const evcsActualW = Math.max(0, Math.round(Number(totalFreshActualPowerW || 0)));
                const evcsReserveW = evcsControlReserveW;
                const evcsAllocationCapW = Number.isFinite(Number(pvAllocationEvcsCapWState))
                    ? Math.max(0, Number(pvAllocationEvcsCapWState))
                    : evcsReserveW;
                // Nicht an pvAvailableState koppeln: Dieses Hysterese-Signal darf den
                // bereits aktiven/angeforderten EVCS-PV-Anteil nicht fuer einen einzelnen
                // Tick freigeben. Der Allocation-Cap bleibt die harte Obergrenze.
                const evcsPvReserveW = computeEvcsPvBudgetReservationW({
                    reserveW: evcsReserveW,
                    actualPvW: evcsControlPvReserveW,
                    intentPvW: evcsControlPvIntentW,
                    allocationCapW: evcsAllocationCapW,
                });
                rt.reserve({
                    key: 'evcs',
                    app: 'chargingManagement',
                    label: 'Ladepunkte',
                    priority: 100,
                    actualW: evcsActualW,
                    requestedW: evcsReserveW,
                    reserveW: evcsReserveW,
                    pvReserveW: evcsPvReserveW,
                    pvOnly: false,
                    mode: String(mode || ''),
                });
            }
        } catch (_e) {
            // budget diagnostics only
        }

            // Cleanup session tracking for removed wallboxes (avoid memory leaks)
            for (const [safeKey, lastSeenTs] of this._chargingLastSeenMs.entries()) {
                const ls = (typeof lastSeenTs === 'number' && Number.isFinite(lastSeenTs)) ? lastSeenTs : 0;
                if (!ls || (now - ls) > sessionCleanupStaleMs) {
                    this._chargingLastSeenMs.delete(safeKey);
                    this._chargingLastActiveMs.delete(safeKey);
                    this._chargingSinceMs.delete(safeKey);
                    this._lastCmdTargetW.delete(safeKey);
                    this._lastCmdTargetA.delete(safeKey);
                    this._boostSinceMs.delete(safeKey);
                }
            }

        await this._queueState('chargingManagement.summary.totalReservedPowerW', evcsControlReserveW, true);
        await this._queueState('chargingManagement.summary.totalTargetPowerW', totalTargetPowerW, true);
        await this._queueState('chargingManagement.summary.totalTargetCurrentA', totalTargetCurrentA, true);
        await this._queueState('chargingManagement.summary.lastUpdate', Date.now(), true);
    }
}

module.exports = { ChargingManagementModule, computePvManagedDemandIntentW, computeEvcsPvBudgetReservationW };
