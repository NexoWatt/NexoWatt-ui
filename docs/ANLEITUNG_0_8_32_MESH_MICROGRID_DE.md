# NexoWatt UI 0.8.32 – EOS Mesh/Microgrid Datenmodell

## Zweck

Diese Version ergänzt **EOS Mesh/Microgrid** als eigenes App-Modul. Die Funktion ist bewusst von Energy Wallet, Local kWh Ledger und DC Station Display getrennt.

## Aktivierung

Pfad im Installer/App-Center:

```text
NexoWatt EMS App-Center
→ EOS Mesh/Microgrid
```

Voraussetzungen:

```text
EOS-Lizenz aktiv
App „EOS Mesh/Microgrid“ installiert und aktiviert
Mesh/Microgrid App aktiv = An
```

## Was die erste Stufe macht

```text
Energie-Knoten modellieren
Cluster-ID und Cluster-Name setzen
Local First / Grid Last Strategie vorbereiten
Netz-, Import- und Exportlimit als Verbunddaten hinterlegen
Energy-Intent-Preview erzeugen
Microgrid-Entscheidungs-Preview erzeugen
```

## Was diese Stufe ausdrücklich nicht macht

```text
keine Hardwaresteuerung
keine Wechselrichter-Setpoints
keine Wallbox-Setpoints
keine Batterie-Setpoints
keine zweite Export-Guard-Regelung
keine doppelte Ledger-Zählung
```

## Wichtige States

```text
meshMicrogrid.enabled
meshMicrogrid.cluster.nodesJson
meshMicrogrid.cluster.intentsJson
meshMicrogrid.cluster.localSurplusW
meshMicrogrid.cluster.localDeficitW
meshMicrogrid.cluster.localUsePercent
meshMicrogrid.microgrid.lastDecisionJson
meshMicrogrid.export.ready
```

## Nächste Ausbaustufe

Die nächste Stufe kann auf diesem Datenmodell aufbauen:

```text
Mesh-Operatoransicht
Knoten-Diagnose
Energy Intent Protocol
Nachbarschaftsversorgung
Energy Hub / NL-GTO Vorbereitung
CommandGuard für spätere aktive Microgrid-Steuerung
```
