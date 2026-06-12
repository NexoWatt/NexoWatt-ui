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

export const CUSTOMER_SETTING_KEYS = [
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
  'weatherUsageMode',
  'weatherApiKey',
] as const;

export type CustomerSettingKey = (typeof CUSTOMER_SETTING_KEYS)[number];

/** Code-Teil: isCustomerSettingKey. Zweck: Prüft, ob ein Frontend-Key bewusst erlaubt ist. */
export function isCustomerSettingKey(key: string): key is CustomerSettingKey {
  return (CUSTOMER_SETTING_KEYS as readonly string[]).includes(key);
}

/**
 * Code-Teil: normalizeSettingValue
 *
 * Zweck:
 * Normalisiert einfache Kundeneinstellungswerte, ohne false/0/'' falsch zu ersetzen.
 */
export function normalizeSettingValue(value: unknown): string | number | boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const raw = value.trim();
    const lower = raw.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (raw !== '' && /^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    return raw;
  }
  return '';
}

/**
 * Code-Teil: normalizeSettingsWrite
 *
 * Zweck:
 * Baut aus einem Frontend-Schreibwunsch einen späteren `settings.*`-Schreibplan.
 */
export function normalizeSettingsWrite(request: SettingsWriteRequest): NormalizedSettingsWrite | null {
  if (request.scope !== 'settings') return null;
  if (!isCustomerSettingKey(request.key)) return null;
  return {
    stateId: `settings.${request.key}`,
    value: normalizeSettingValue(request.value),
    ack: false,
    diagnosticText: `Kundeneinstellung ${request.key} aus ${request.source} vorbereitet.`,
  };
}
