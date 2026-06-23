# NexoWatt UI 0.8.33 – App-Center-Struktur

## Ziel

Das App-Center bleibt übersichtlich, auch wenn EOS mehr Module bekommt.

## Verbindliches Schema

- **Apps**: nur echte Funktionsmodule wie Energie-Wertkonto, Export Guard, Local kWh Ledger, Speicherfarm, Mesh/Microgrid.
- **Zuordnung**: Datenpunkte, Länder-/Marktprofil, NL P1/DSMR, Systemzuordnung und technische Mapping-Grundlagen.
- **Ladepunkte**: Ladepunkte, Stationsgruppen, DC Station Display, Display-URLs, Token und LP-Zuordnung.
- **Status**: Runtime-Diagnose, Prüfungen und Installateurhinweise.
- **Separate Reiter**: für große Funktionsmodule mit eigener Bedienlogik.

## Speicherfarm

Die Speicherfarm nutzt ab 0.8.33 eine Master-Detail-Ansicht:

- links kompakte Speicherliste,
- rechts Detailformular für den ausgewählten Speicher,
- dadurch weniger vertikales Scrollen bei mehreren Speichern.

## Installer-Navigation

Der Button **Zurück zum Installer** führt aus dem App-Center zurück zur zentralen Installer-Startseite im ioBroker-Admin.
