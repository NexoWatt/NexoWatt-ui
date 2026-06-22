import type { NormalizedSettingsWrite, SettingsWriteRequest } from '../contracts/adapter-api';
/**
 * Datei: src-ts/adapter/settings-writes.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für einfache Kundeneinstellungen aus `/api/set`.
 *
 * Zusammenhang:
 * Aktuell schreibt `main.js` viele Einstellungen direkt. Diese Datei dokumentiert, welche
 * Keys bewusst erlaubt sind und wie Werte normalisiert werden dürfen.
 */
export declare const CUSTOMER_SETTING_KEYS: readonly ["aiAdvisorEnabled", "aiAdvisorMode", "aiAdvisorOptimizationMode", "aiAdvisorEvReadyBy", "aiAdvisorEvTargetSocPct", "aiAdvisorThermalReadyBy", "aiAdvisorComfortStart", "aiAdvisorComfortEnd", "aiAdvisorQuietHoursStart", "aiAdvisorQuietHoursEnd", "aiAdvisorPriorityStorage", "aiAdvisorPriorityEvcs", "aiAdvisorPriorityThermal", "aiAdvisorPriorityHeatingRod", "aiAdvisorPriorityGeneric", "weatherEnabled", "weatherUsageMode", "weatherApiKey"];
export type CustomerSettingKey = (typeof CUSTOMER_SETTING_KEYS)[number];
/**
 * Migrationshinweis:
 * Diese Liste muss mit `settingsLocalKeys` in `main.js` konsistent bleiben.
 * Sobald `/api/set` produktiv auf diesen TS-Helfer umgestellt wird, darf kein
 * Kundeneinstellungs-Key fehlen, sonst schreibt das Frontend ins Leere.
 */
/** Code-Teil: isCustomerSettingKey. Zweck: Prüft, ob ein Frontend-Key bewusst erlaubt ist. */
export declare function isCustomerSettingKey(key: string): key is CustomerSettingKey;
/**
 * Code-Teil: normalizeSettingValue
 *
 * Zweck:
 * Normalisiert einfache Kundeneinstellungswerte, ohne false/0/'' falsch zu ersetzen.
 */
export declare function normalizeSettingValue(value: unknown): string | number | boolean;
/**
 * Code-Teil: normalizeSettingsWrite
 *
 * Zweck:
 * Baut aus einem Frontend-Schreibwunsch einen späteren `settings.*`-Schreibplan.
 */
export declare function normalizeSettingsWrite(request: SettingsWriteRequest): NormalizedSettingsWrite | null;
//# sourceMappingURL=settings-writes.d.ts.map