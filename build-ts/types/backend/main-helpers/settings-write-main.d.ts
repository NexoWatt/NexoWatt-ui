import type { StateId } from '../../contracts/units';
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
export declare const MAIN_CUSTOMER_SETTING_KEYS: readonly ["aiAdvisorEnabled", "aiAdvisorMode", "aiAdvisorEvReadyBy", "aiAdvisorEvTargetSocPct", "aiAdvisorThermalReadyBy", "aiAdvisorComfortStart", "aiAdvisorComfortEnd", "aiAdvisorQuietHoursStart", "aiAdvisorQuietHoursEnd", "weatherEnabled", "dynamicTariff", "netFeeEnabled"];
export type MainCustomerSettingKey = typeof MAIN_CUSTOMER_SETTING_KEYS[number];
export interface MainSettingsWritePlan {
    readonly stateId: StateId;
    readonly value: string | number | boolean;
    readonly ack: false;
    readonly reason: string;
    readonly allowed: boolean;
}
/**
 * Code-Teil: isMainCustomerSettingKey
 *
 * Zweck:
 * Prüft, ob ein Setting-Key zur kontrollierten Kundeneinstellungsgruppe gehört.
 */
export declare function isMainCustomerSettingKey(key: unknown): key is MainCustomerSettingKey;
/**
 * Code-Teil: normalizeMainSettingValue
 *
 * Zweck:
 * Normalisiert API-Werte für `settings.*`, ohne `false`, `0` oder leere Uhrzeiten zu verlieren.
 */
export declare function normalizeMainSettingValue(key: string, value: unknown): string | number | boolean;
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
export declare function buildMainSettingsWritePlan(key: unknown, value: unknown): MainSettingsWritePlan;
//# sourceMappingURL=settings-write-main.d.ts.map