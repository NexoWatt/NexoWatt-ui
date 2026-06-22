import type { ClockTime } from '../contracts/units';
/**
 * Datei: src-ts/utils/clock.ts
 *
 * Zweck:
 * Reine Helfer für Uhrzeiten im Format `HH:mm`.
 *
 * Zusammenhang:
 * KI-Berater, EV-Zielplanung, Komfortfenster, Ruhezeiten und spätere Zeitfenster im
 * App-Center nutzen dieselbe Uhrzeitlogik. Diese Datei bereitet die spätere Migration
 * dieser Bereiche auf TypeScript vor.
 */
/**
 * Code-Teil: isClockTime
 *
 * Zweck:
 * Prüft, ob ein Wert eine gültige Uhrzeit im Format `HH:mm` ist.
 *
 * Zusammenhang:
 * Kunden- und Installer-Einstellungen dürfen später nicht ungeprüft in Tagesfahrplan,
 * KI-Beratung oder Komfortfenster laufen. Ungültige Zeitwerte werden vorher erkannt.
 *
 * TypeScript-Hinweis:
 * Der Type Guard macht aus einem unbekannten Wert nach erfolgreicher Prüfung eine
 * `ClockTime`.
 */
export declare function isClockTime(value: unknown): value is ClockTime;
/**
 * Code-Teil: normalizeClockTime
 *
 * Zweck:
 * Gibt eine sichere `HH:mm`-Uhrzeit zurück. Ungültige Eingaben fallen auf einen gültigen
 * Fallback zurück.
 *
 * Zusammenhang:
 * Dadurch können UI-Eingaben aus Kunden-/Installerformularen später gefahrlos vom
 * KI-Berater oder von Zeitfensterlogiken verwendet werden.
 */
export declare function normalizeClockTime(value: unknown, fallback?: ClockTime): ClockTime;
/**
 * Code-Teil: clockTimeToMinutes
 *
 * Zweck:
 * Wandelt eine `HH:mm`-Uhrzeit in Minuten seit Tagesbeginn um.
 *
 * Zusammenhang:
 * Für Vergleiche von Zeitfenstern ist eine Zahl einfacher und weniger fehleranfällig
 * als Stringvergleiche. Diese Funktion wird später für Komfort-, Ruhe- und EV-Fenster
 * verwendet.
 */
export declare function clockTimeToMinutes(value: ClockTime): number;
/**
 * Code-Teil: isClockTimeInWindow
 *
 * Zweck:
 * Prüft, ob eine Uhrzeit in einem Zeitfenster liegt. Fenster über Mitternacht werden
 * unterstützt, z. B. `22:00` bis `06:00`.
 *
 * Zusammenhang:
 * Genau diese Logik brauchen KI-Berater und Komfort-/Ruhezeiten. Der Helfer verhindert,
 * dass jede spätere Datei eigene fehleranfällige Mitternachtslogik baut.
 */
export declare function isClockTimeInWindow(current: ClockTime, start: ClockTime, end: ClockTime): boolean;
//# sourceMappingURL=clock.d.ts.map