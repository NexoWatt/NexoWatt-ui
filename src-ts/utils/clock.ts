import type { ClockTime } from '../contracts/units';

/**
 * Datei: src-ts/utils/clock.ts
 *
 * Zweck:
 * Reine Helfer für Uhrzeiten im Format HH:mm.
 *
 * Zusammenhang:
 * KI-Berater, EV-Zielplanung, Komfortfenster und Ruhezeiten nutzen dieselbe
 * Uhrzeitlogik. Diese Datei bereitet die spätere Migration dieser Bereiche vor.
 */

/** Prüft eine HH:mm-Uhrzeit. */
export function isClockTime(value: unknown): value is ClockTime {
  if (typeof value !== 'string') return false;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** Normalisiert eine Uhrzeit oder gibt einen sicheren Fallback zurück. */
export function normalizeClockTime(value: unknown, fallback: ClockTime = '00:00'): ClockTime {
  if (!isClockTime(fallback)) throw new Error(`Ungültiger Fallback für ClockTime: ${fallback}`);
  if (!isClockTime(value)) return fallback;
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = String(Number(hourRaw)).padStart(2, '0');
  return `${hour}:${minuteRaw}` as ClockTime;
}

/** Wandelt HH:mm in Minuten seit Tagesbeginn um. */
export function clockTimeToMinutes(value: ClockTime): number {
  const safe = normalizeClockTime(value);
  const [hourRaw, minuteRaw] = safe.split(':');
  return Number(hourRaw) * 60 + Number(minuteRaw);
}

/** Prüft, ob eine Uhrzeit in einem Tagesfenster liegt. Fenster über Mitternacht sind erlaubt. */
export function isClockTimeInWindow(current: ClockTime, start: ClockTime, end: ClockTime): boolean {
  const cur = clockTimeToMinutes(current);
  const from = clockTimeToMinutes(start);
  const to = clockTimeToMinutes(end);
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}
