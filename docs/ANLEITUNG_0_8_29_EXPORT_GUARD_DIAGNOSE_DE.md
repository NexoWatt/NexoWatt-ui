# NexoWatt UI 0.8.29 – Export Guard Diagnose & nicht genutzter PV-Wert

## Zweck

Version 0.8.29 erweitert die Einspeisebegrenzung um eine klare Diagnose für Installateure und bereitet im Energie-Wertkonto die Bewertung von abgeregelter bzw. nicht lokal genutzter PV-Energie vor.

Die Funktion ist für Deutschland und die Niederlande gedacht. Sie ersetzt keine zweite Regelung, sondern erweitert die vorhandene `gridConstraints`-/Export-Guard-Logik.

## Installerbereich

Pfad:

```text
NexoWatt EMS App-Center → Netzlimits → Einspeisebegrenzung / Export Guard
```

Dort werden weiterhin konfiguriert:

```text
Installer-Freigabe
maximale Einspeiseleistung in W
WR-/PV-Write-Datenpunkte
Negative-Preis-Strategie
Bias und Deadband
```

Neu sichtbar ist eine Runtime-Diagnose:

```text
aktuelle Einspeisung
maximal erlaubte Einspeisung
Einspeisung über Limit
geschätzte Abregelungsleistung
Status / Aktion
Negative-Preis-Strategie aktiv/inaktiv
Warnung bei fehlenden WR-Write-Datenpunkten
```

## Wichtige States

```text
gridConstraints.exportLimit.currentExportW
gridConstraints.exportLimit.maxFeedInW
gridConstraints.exportLimit.exportOverLimitW
gridConstraints.exportLimit.estimatedCurtailmentW
gridConstraints.exportLimit.unusedPvPowerW
gridConstraints.exportLimit.writeCapable
gridConstraints.exportLimit.writeWarning
gridConstraints.exportLimit.missingWriteDatapointsJson
gridConstraints.exportLimit.negativePriceActive
gridConstraints.exportLimit.negativePriceStrategy
gridConstraints.exportLimit.summaryJson
```

## Energie-Wertkonto

Das Energie-Wertkonto übernimmt die Export-Guard-Diagnose nur lesend. Es erzeugt keine zweite Regelung und zählt nichts doppelt.

Neue vorbereitete Werte:

```text
energyWallet.today.curtailedPvKwh
energyWallet.today.curtailedPvValueEur
energyWallet.today.unusedPvKwh
energyWallet.today.unusedPvValueEur
```

Diese Werte zeigen vorbereitet:

```text
abgeregelte PV-kWh
nicht lokal genutzte PV-kWh
nicht genutzten PV-Wert
```

## Negative Preise

Wenn die Negative-Preis-Strategie im Installer aktiviert ist und der Tarif dies auslöst, veröffentlicht der Export Guard:

```text
gridConstraints.exportLimit.negativePriceActive = true
```

Die Regelung bleibt trotzdem über die vorhandene Export-Guard-Logik geführt.

## Hinweise

- 0 W maximale Einspeisung bedeutet Nulleinspeisung.
- Werte größer 0 W erlauben eine definierte maximale Einspeisung.
- Die Abregelungsleistung ist eine technische Schätzung auf Basis von WR-Setpoint, Rated-Power oder Überschreitung am Netzpunkt.
- Das ist noch keine eichrechtsverbindliche Abrechnung.
