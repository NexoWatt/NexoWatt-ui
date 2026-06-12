import type { NullableNumber, Percent, Watt } from '../contracts/units';

/**
 * Datei: src-ts/utils/number.ts
 *
 * Zweck:
 * Kleine, reine Zahlen-Helfer für die spätere TypeScript-Migration.
 * Diese Funktionen werden in 0.7.58 noch nicht von der produktiven Runtime genutzt.
 *
 * Zusammenhang:
 * Energiefluss, Heizstab, History und KI-Berater nutzen im JavaScript aktuell viele
 * eigene Number-/Clamp-/Fallback-Helfer. Diese Datei ist die zukünftige gemeinsame
 * Basis, damit die Werte überall gleich behandelt werden.
 *
 * Kritische Regel:
 * `0` ist ein gültiger Messwert. Diese Helfer dürfen 0 niemals als „fehlend“ werten.
 */

/** Prüft, ob ein Wert eine endliche Zahl ist. 0 ist ausdrücklich gültig. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Wandelt einen unbekannten Wert robust in eine Zahl oder null um. */
export function toNumberOrNull(value: unknown): NullableNumber {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Begrenzung für numerische Konfigurationswerte. */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Positive Wattwerte: negative/fehlende Werte werden zu 0. */
export function positiveWatt(value: unknown): Watt {
  const n = toNumberOrNull(value);
  return n === null ? 0 : Math.max(0, n);
}

/** Prozentwerte auf 0 bis 100 normieren. */
export function percent(value: unknown, fallback: Percent = 0): Percent {
  const n = toNumberOrNull(value);
  return clampNumber(n === null ? fallback : n, 0, 100);
}

/** Rundet Werte für Status-/Diagnoseausgaben, nicht für Regelungsentscheidungen. */
export function roundForDisplay(value: unknown, digits = 1): NullableNumber {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  const factor = 10 ** Math.max(0, Math.min(6, Math.round(digits)));
  return Math.round(n * factor) / factor;
}
