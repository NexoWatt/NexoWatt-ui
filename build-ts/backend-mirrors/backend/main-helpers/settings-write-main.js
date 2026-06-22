"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIN_CUSTOMER_SETTING_KEYS = void 0;
exports.isMainCustomerSettingKey = isMainCustomerSettingKey;
exports.normalizeMainSettingValue = normalizeMainSettingValue;
exports.buildMainSettingsWritePlan = buildMainSettingsWritePlan;
const api_set_helpers_1 = require("../api-state/api-set-helpers");
/**
 * Datei: src-ts/backend/main-helpers/settings-write-main.ts
 *
 * Zweck:
 * Bereitet die spätere Auslagerung von `settings.*`-Schreiblogik aus `main.js` vor.
 *
 * Zusammenhang:
 * Kundeneinstellungen werden aus dem Frontend über `/api/set` geschrieben und danach von
 * Energiefluss, Wetter, KI-Berater, History und SmartHome gelesen. Dieser Helfer definiert,
 * welche Werte sicher in `settings.*` landen dürfen und wie sie normalisiert werden.
 */
/** Erster kontrollierter Satz an Kundeneinstellungen, die wir schrittweise aus `main.js` typisieren. */
exports.MAIN_CUSTOMER_SETTING_KEYS = [
    'aiAdvisorEnabled',
    'aiAdvisorMode',
    'aiAdvisorEvReadyBy',
    'aiAdvisorEvTargetSocPct',
    'aiAdvisorThermalReadyBy',
    'aiAdvisorComfortStart',
    'aiAdvisorComfortEnd',
    'aiAdvisorQuietHoursStart',
    'aiAdvisorQuietHoursEnd',
    'weatherEnabled',
    'dynamicTariff',
    'netFeeEnabled',
];
/**
 * Code-Teil: isMainCustomerSettingKey
 *
 * Zweck:
 * Prüft, ob ein Setting-Key zur kontrollierten Kundeneinstellungsgruppe gehört.
 */
function isMainCustomerSettingKey(key) {
    return exports.MAIN_CUSTOMER_SETTING_KEYS.includes((0, api_set_helpers_1.normalizeApiSetKey)(key));
}
/**
 * Code-Teil: normalizeMainSettingValue
 *
 * Zweck:
 * Normalisiert API-Werte für `settings.*`, ohne `false`, `0` oder leere Uhrzeiten zu verlieren.
 */
function normalizeMainSettingValue(key, value) {
    const cleanKey = (0, api_set_helpers_1.normalizeApiSetKey)(key);
    if (cleanKey.endsWith('Enabled') || cleanKey === 'dynamicTariff' || cleanKey === 'netFeeEnabled') {
        if (typeof value === 'boolean')
            return value;
        const s = String(value ?? '').trim().toLowerCase();
        return ['true', '1', 'yes', 'ja', 'on', 'an'].includes(s);
    }
    if (cleanKey.endsWith('Pct')) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
    }
    return String(value ?? '').trim();
}
/**
 * Code-Teil: buildMainSettingsWritePlan
 *
 * Zweck:
 * Erstellt einen Schreibplan für `settings.*`, schreibt aber noch nicht selbst.
 *
 * Zusammenhang:
 * Später kann `main.js` diesen Plan verwenden, statt State-ID, Wertnormalisierung und ack-Regel
 * direkt im API-Handler zusammenzubauen.
 */
function buildMainSettingsWritePlan(key, value) {
    const cleanKey = (0, api_set_helpers_1.normalizeApiSetKey)(key);
    const allowed = isMainCustomerSettingKey(cleanKey);
    return {
        stateId: (0, api_set_helpers_1.buildScopedStateId)('settings', cleanKey),
        value: normalizeMainSettingValue(cleanKey, value),
        ack: false,
        reason: `api-set:settings.${cleanKey}`,
        allowed,
    };
}
