# NexoWatt Kommentarstandard DE

Diese Datei beschreibt, wie der Code ab Version 0.7.54 dokumentiert werden soll.

## Ziel

Jeder fachlich relevante Code-Teil soll direkt im Code erklären:

1. **Zweck:** Was macht dieser Teil?
2. **Zusammenhang:** Welche UI-, API-, State- oder EMS-Bausteine hängen daran?
3. **Wartung/TypeScript:** Was muss beim späteren TypeScript-Umbau typisiert und geprüft werden?

## Kommentar-Tiefe

- Datei-Kopf: erklärt die Gesamtverantwortung der Datei.
- Funktion/Klasse/Methode: erklärt den lokalen Zweck und die wichtigsten Abhängigkeiten.
- Kritische Abschnitte: erhalten zusätzliche Hinweise, z. B. DP-Fallbacks, Lizenzschutz, History, Heizstab, Speicher und KI.

## Wichtig

Kommentare dürfen die Logik nicht ersetzen. Bei jeder späteren Code-Änderung müssen Kommentar und Code gemeinsam aktualisiert werden.
