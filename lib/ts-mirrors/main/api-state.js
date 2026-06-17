'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/main/api-state.ts
 * Quell-Hash: sha256:752fb0c09d542e38dec8bdfda39901952a36fd6c6a0f3626859d8eaa0a2367ad
 * Erzeugung: npm run sync:ts-main-helpers
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel eines echten TypeScript-Helfers für main.js.
 * main.js nutzt diese Helfer in 0.7.98 noch nicht produktiv; sie bilden die sichere
 * Grundlage für die spätere schrittweise Auslagerung.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMainApiStateEntry = toMainApiStateEntry;
exports.buildMainApiStateResponse = buildMainApiStateResponse;
exports.compareMainApiStateResponseWithRuntime = compareMainApiStateResponseWithRuntime;
const state_cache_1 = require("./state-cache");
/**
 * Code-Teil: toMainApiStateEntry
 *
 * Zweck:
 * Wandelt einen rohen Cache-State in die öffentliche `/api/state`-Form.
 *
 * Wichtig:
 * 0 und false werden ausdrücklich behalten. Nur null/undefined werden ausgelassen.
 */
function toMainApiStateEntry(id, raw) {
    const normalized = (0, state_cache_1.normalizeMainState)(id, raw);
    if (!(0, state_cache_1.hasPresentMainValue)(normalized))
        return undefined;
    return {
        value: normalized.value,
        ...(normalized.ack !== undefined ? { ack: normalized.ack } : {}),
        ...(normalized.ts !== undefined ? { ts: normalized.ts } : {}),
        ...(normalized.lc !== undefined ? { lc: normalized.lc } : {}),
        ...(normalized.q !== undefined ? { q: normalized.q } : {}),
    };
}
/**
 * Code-Teil: buildMainApiStateResponse
 *
 * Zweck:
 * Erstellt aus einem StateCache eine typisierte `/api/state`-Antwort.
 *
 * Zusammenhang:
 * Diese Funktion ist noch nicht produktiv an main.js angebunden. Sie ist die spätere
 * sichere Auslagerungsbasis, damit Frontend und History gleiche Werte erhalten.
 */
function buildMainApiStateResponse(cache, options = {}) {
    const states = {};
    const include = Array.isArray(options.includeOnlyKeys) && options.includeOnlyKeys.length > 0 ? new Set(options.includeOnlyKeys) : null;
    for (const [id, raw] of Object.entries(cache)) {
        if (include && !include.has(id))
            continue;
        const entry = toMainApiStateEntry(id, raw);
        if (entry !== undefined)
            states[id] = entry;
    }
    return { states, generatedAt: options.generatedAt ?? Date.now() };
}
/**
 * Code-Teil: stableApiStateValueText
 *
 * Zweck:
 * Erzeugt einen stabil vergleichbaren Text für Werte aus `/api/state`.
 *
 * Zusammenhang:
 * Der Shadow-Vergleich darf `0`, `false` und leere Strings nicht verlieren. Deshalb
 * wird nicht mit Wahrheit/Falschheit verglichen, sondern mit expliziter JSON-Form.
 */
function stableApiStateValueText(value) {
    if (value === undefined)
        return '__undefined__';
    try {
        return JSON.stringify(value);
    }
    catch (_err) {
        return String(value);
    }
}
/**
 * Code-Teil: compareMainApiStateResponseWithRuntime
 *
 * Zweck:
 * Vergleicht die bisherige `main.js`-Runtime-Antwort von `/api/state` mit der
 * TypeScript-Helferantwort. Diese Funktion ist bewusst nur ein Shadow-/Diagnosewerkzeug.
 *
 * Wichtig:
 * Die produktive API-Antwort bleibt in 0.7.99 unverändert. Abweichungen werden nur
 * protokolliert, damit wir die spätere Auslagerung sicher vorbereiten können.
 */
function compareMainApiStateResponseWithRuntime(runtimeCache, tsResponse = buildMainApiStateResponse(runtimeCache)) {
    const runtimeKeys = Object.keys(runtimeCache || {}).filter((key) => toMainApiStateEntry(key, runtimeCache[key]) !== undefined);
    const tsStates = tsResponse.states || {};
    const tsKeys = Object.keys(tsStates).filter((key) => tsStates[key] !== undefined);
    const allKeys = new Set([...runtimeKeys, ...tsKeys]);
    const mismatches = [];
    for (const key of allKeys) {
        const runtimeEntry = toMainApiStateEntry(key, runtimeCache[key]);
        const tsEntry = tsStates[key];
        if (!runtimeEntry && tsEntry) {
            mismatches.push({ key, reason: 'missing-in-runtime', tsValue: tsEntry.value });
            continue;
        }
        if (runtimeEntry && !tsEntry) {
            mismatches.push({ key, reason: 'missing-in-ts', runtimeValue: runtimeEntry.value });
            continue;
        }
        if (runtimeEntry && tsEntry && stableApiStateValueText(runtimeEntry.value) !== stableApiStateValueText(tsEntry.value)) {
            mismatches.push({ key, reason: 'value-differs', runtimeValue: runtimeEntry.value, tsValue: tsEntry.value });
        }
    }
    return {
        available: true,
        ok: mismatches.length === 0,
        runtimeCount: runtimeKeys.length,
        tsCount: tsKeys.length,
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 25),
        generatedAt: tsResponse.generatedAt,
    };
}
