# NexoWatt UI 0.8.33 – App-Center Struktur-Cleanup

## Ziel

Version 0.8.33 räumt den Installer/App-Center-Bereich auf. Der Reiter **Apps** bleibt für echte Funktionsmodule. Technische Zuordnungen, Marktprofile und Ladestationsseiten liegen jetzt in den fachlich passenden Reitern.

## Neue Struktur

### Apps

Hier bleiben Funktionsmodule, zum Beispiel:

- Energie-Wertkonto
- Export Guard / Einspeisebegrenzung
- Local kWh Ledger
- Mesh/Microgrid
- Speicherfarm
- MultiUse
- Peak-Shaving
- KI-Optimierung

### Zuordnung

Hier liegen jetzt:

- System & Marktprofil
- Länderprofil Deutschland/Niederlande
- ioBroker-Systemsprache
- NL P1/DSMR & Teruglevering
- technische Datenpunkt-Mappings

### Ladepunkte

Hier liegen jetzt:

- Ladepunkt- und Stationsgruppen-Konfiguration
- EOS DC Station Display
- Display-Token
- Display-URLs
- LP-/Connector-Zuordnung pro Stationsseite
- herstelleroffene Command-State-Brücke

## Zurück zum Installer

Oben neben den Speicher-/Neuladen-Buttons gibt es jetzt **Zurück zum Installer**. Der Button führt zurück zur zentralen Installer-Startseite im Admin-Bereich.

## Speicherfarm

Die Speicherfarm nutzt jetzt eine Master-Detail-Ansicht:

- links: kompakte Speicherliste
- rechts: Detailbearbeitung des ausgewählten Speichers

Dadurch müssen Installateure bei mehreren Speichern nicht mehr durch alle Detailformulare nach unten scrollen.

## Entwicklungsregel

Neue App-Center-Funktionen müssen ab jetzt nach diesem Schema einsortiert werden:

```text
Apps       = Funktionsmodule
Zuordnung  = Mapping, Land, Marktprofil, technische Verknüpfung
Ladepunkte = LP-, Station- und Display-Konfiguration
Status     = Runtime, Diagnose, Prüfungen
Eigener Reiter = wenn ein Bereich groß genug ist
```

