# NexoWatt UI 0.8.33 – App-Center Struktur-Cleanup

## Ziel

Diese Version räumt den Installerbereich auf, damit neue EOS-Module nicht alle im Reiter **Apps** landen.

## Neue App-Center-Regel

- **Apps**: nur echte Funktionsmodule.
- **Zuordnung**: Länder-/Marktprofil, technische Datenpunkt-Zuordnungen und NL P1/DSMR.
- **Ladepunkte**: Ladepunkt-, Stationsgruppen- und DC-Stationsdisplay-Konfiguration.
- **Status**: Laufzeitdiagnosen und Prüfungen.

## Geändert

### System & Marktprofil

Das System-/Marktprofil befindet sich jetzt unter:

```text
EMS Apps & Konfiguration → Zuordnung
```

Dort wird weiter das Länderprofil **DE/NL** eingestellt. Die UI-Sprache wird weiterhin aus der ioBroker-Systemsprache übernommen.

### NL P1/DSMR & Teruglevering

Die P1/DSMR-Zuordnung befindet sich jetzt ebenfalls unter:

```text
EMS Apps & Konfiguration → Zuordnung
```

Dort werden Importleistung, Exportleistung, Energiezähler und Rücklieferwerte gemappt.

### DC Station Display / Stationsseiten

Die Konfiguration der Stationsseiten befindet sich jetzt unter:

```text
EMS Apps & Konfiguration → Ladepunkte
```

Dort werden Display-Stationen angelegt, Token erzeugt und LPs/Connectoren zugeordnet.

### Zurück zum Installer

Oben im App-Center gibt es jetzt den Button:

```text
Zurück zum Installer
```

Er führt zurück zur zentralen Installer-Startseite.

### Speicherfarm

Die Speicherfarm nutzt jetzt eine übersichtlichere Master-Detail-Bedienung:

```text
links: Speicherliste
rechts: Detailformular des ausgewählten Speichers
```

Dadurch muss der Installateur bei mehreren Speichern nicht mehr durch alle Speicherformulare nach unten scrollen.

## Test

Nach dem Update prüfen:

1. App-Center öffnen.
2. Reiter **Apps**: keine Länder-/P1-/Display-Konfigurationskarten mehr sichtbar.
3. Reiter **Zuordnung**: System & Marktprofil sowie NL P1/DSMR sichtbar.
4. Reiter **Ladepunkte**: DC Station Display sichtbar.
5. Reiter **Speicherfarm**: Speicherliste links, Detail rechts.
6. Button **Zurück zum Installer** oben testen.

