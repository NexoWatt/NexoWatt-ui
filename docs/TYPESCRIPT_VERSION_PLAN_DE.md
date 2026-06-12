# TypeScript-Migrationsplan ab 0.7.58

## 0.7.58 – Build- und Testbasis

TypeScript-Struktur, Typ-Smoke-Test, Declaration-Build und Scaffold-Prüfung.

## 0.7.59 – kleine Helfer/Skripte

Risikoarme Utilities und Build-/Prüfskripte nach TypeScript migrieren.

## 0.7.60 – reine Resolver-Helfer

Reine Funktionen für Watt, Prozent, signed/split DP-Auflösung und Stale-Regeln typisieren.

## 0.7.61 – Energiefluss-/Speicher-Resolver

Kritische Speicher- und Netzauflösung mit Regression-Tests nach TypeScript migrieren.

## 0.7.62 – Core-Limits und Heizstab

EMS-Budget und Heizstabregelung auf typisierte Helfer umstellen.

## 0.7.63 – main.js API-/State-Helfer

API-, StateCache-, Lizenz- und Feature-Visibility-Helfer auslagern.

## 0.7.64+ – Frontend-Helfer, KI, History, SmartHome

Schrittweise Migration der großen UI- und Zusatzbereiche.

## 0.7.59 – erster kleiner Migrationsschritt mit Kommentaren

- Bereich: Wartungs-/Publish-Skripte, nicht produktive EMS-/VIS-Logik.
- TypeScript-Quelle: `src-ts/scripts/publish-check-rules.ts`.
- JavaScript-Spiegel: `scripts/publish-check-rules.js`, damit `publish:check` ohne TypeScript-Build läuft.
- Geänderte Nutzung: `scripts/verify-publish.js` ruft die ausgelagerten Regeln auf.
- Kommentarregel: Jede neue Regel hat einen deutschen Kommentar mit Zweck, Zusammenhang und TypeScript-Hinweis.
- Risiko: niedrig, weil Energiefluss, Speicher, Heizstab, KI, History und SmartHome nicht verändert wurden.
