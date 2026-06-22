# NexoWatt UI 0.8.30 – Export Guard Stabilisierung

## Ziel

Diese Version härtet die Einspeisebegrenzung für Deutschland und die Niederlande. Der Installateur kann die Funktion sicher im Testmodus prüfen, bevor WR-/PV-Setpoints geschrieben werden.

## Neuer Betriebsmodus

Im Installer/App-Center unter **Netzlimits → Einspeisebegrenzung / Export Guard** gibt es jetzt:

- **Diagnose/Testmodus**: NexoWatt berechnet die Regelentscheidung und den Write-Plan, schreibt aber keine WR-/PV-Setpoints.
- **Aktiv**: NexoWatt schreibt freigegebene WR-/PV-Setpoints über die vorhandene herstellerneutrale Mapping-Schicht.
- **Aus**: Export Guard bleibt trotz App-Modus ohne Regelwirkung.

## Runtime-Diagnose

Die Diagnosekarte zeigt unter anderem:

- aktuelle Einspeisung
- erlaubtes Einspeiselimit
- Überschreitung
- geschätzte Abregelungsleistung
- WR-Schreibfähigkeit
- Negative-Preis-Strategie
- aktuelle Aktion

## Wichtig

Die Funktion bleibt herstelleroffen. Es wird kein OCPP-only Pfad gebaut. WR-/PV-Write-Datenpunkte können über Modbus, MQTT, REST, Herstelleradapter, NexoWatt-Devices oder ioBroker-Aliase angebunden sein.

## Paketgröße

ZIP/TGZ-Repository-Artefakte werden nicht mehr in das auszuliefernde Repository-ZIP aufgenommen.
