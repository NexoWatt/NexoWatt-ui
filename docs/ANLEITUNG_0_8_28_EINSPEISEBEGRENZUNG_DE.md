# NexoWatt UI 0.8.28 – Einspeisebegrenzung DE/NL

## Zweck

Version 0.8.28 erweitert die bisherige 0-Einspeisung zu einer allgemeinen Einspeisebegrenzung.

Damit kann der Installateur festlegen:

- ob die Begrenzung aktiv genutzt werden darf,
- ob wirklich 0 W eingespeist werden sollen,
- oder welche maximale Einspeiseleistung erlaubt ist.

`0 W` bedeutet weiterhin Nulleinspeisung. Werte größer `0 W` erlauben eine definierte maximale Einspeiseleistung.

## Einrichtung im Installer/App-Center

Pfad:

```text
NexoWatt EMS App-Center
→ Netz / Grid Constraints
→ PV Abregelung / Einspeisebegrenzung
```

Dort einstellen:

```text
Modus: Einspeisebegrenzung oder kombiniert mit EVU-Abregelung
Installer-Freigabe: aktivieren
Maximale Einspeiseleistung: z. B. 0 W, 800 W, 5000 W
Bias: kleiner Importpuffer, z. B. 50 W
Deadband: Regel-Toleranz, z. B. 15 W
```

## Wichtige Bedeutung

```text
Maximale Einspeiseleistung = 0 W
→ Nulleinspeisung

Maximale Einspeiseleistung = 5000 W
→ maximal 5 kW Einspeisung am Netzverknüpfungspunkt
```

Die Regelung nutzt den Netzpunkt mit Vorzeichen:

```text
Import = positiv
Export = negativ
```

## Wechselrichter / Hersteller-Offenheit

Die Funktion ist herstellerneutral. Je Wechselrichter können im App-Center geeignete Write-Datenpunkte zugeordnet werden:

```text
Einspeise-Limit W
PV-Limit W
PV-Limit %
```

Damit bleibt die Steuerung offen für:

```text
Modbus
MQTT
REST
OCPP-nahe Systeme
Herstelleradapter
NexoWatt-Devices
ioBroker-Aliase
```

## Diagnose-States

Neu:

```text
gridConstraints.exportLimit.enabled
gridConstraints.exportLimit.installerApproved
gridConstraints.exportLimit.maxFeedInW
gridConstraints.exportLimit.targetGridW
gridConstraints.exportLimit.exportOverLimitW
gridConstraints.exportLimit.country
gridConstraints.exportLimit.summaryJson
```

## Hinweis

Die Einspeisebegrenzung ist eine technische Betriebs- und Schutzfunktion. Der tatsächlich zulässige Wert muss vom Betreiber/Installateur passend zu Netzbetreiber, Anlage und Standort gesetzt werden.
