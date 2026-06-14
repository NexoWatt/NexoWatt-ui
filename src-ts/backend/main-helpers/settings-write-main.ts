import type { StateId } from '../../contracts/units';
import { buildScopedStateId, normalizeApiSetKey } from '../api-state/api-set-helpers';

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
export const MAIN_CUSTOMER_SETTING_KEYS = [
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
] as const;

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
export function isMainCustomerSettingKey(key: unknown): key is MainCustomerSettingKey {
  return (MAIN_CUSTOMER_SETTING_KEYS as readonly string[]).includes(normalizeApiSetKey(key));
}

/**
 * Code-Teil: normalizeMainSettingValue
 *
 * Zweck:
 * Normalisiert API-Werte für `settings.*`, ohne `false`, `0` oder leere Uhrzeiten zu verlieren.
 */
export function normalizeMainSettingValue(key: string, value: unknown): string | number | boolean {
  const cleanKey = normalizeApiSetKey(key);
  if (cleanKey.endsWith('Enabled') || cleanKey === 'dynamicTariff' || cleanKey === 'netFeeEnabled') {
    if (typeof value === 'boolean') return value;
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
export function buildMainSettingsWritePlan(key: unknown, value: unknown): MainSettingsWritePlan {
  const cleanKey = normalizeApiSetKey(key);
  const allowed = isMainCustomerSettingKey(cleanKey);
  return {
    stateId: buildScopedStateId('settings', cleanKey) as StateId,
    value: normalizeMainSettingValue(cleanKey, value),
    ack: false,
    reason: `api-set:settings.${cleanKey}`,
    allowed,
  };
}
