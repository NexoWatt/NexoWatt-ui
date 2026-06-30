# 0.8.65 – EVCS-Reservierung, Auto-Modus und Feldtest-Check

## Ziel der Änderung

Version **0.8.65** verhindert, dass EVCS im zentralen EMS-Budget als Verbraucher auftaucht, obwohl gerade keine reale oder zugewiesene Ladeleistung vorhanden ist.

Vorher konnte `ems.budget.consumersJson` einen EVCS-Eintrag mit 0 W enthalten, sobald das Lademanagement aktiv war. Das war diagnostisch missverständlich und konnte in Feldtests so wirken, als würde EVCS Budget „reservieren“, obwohl kein Ladebedarf besteht.

Ab 0.8.65 gilt:

- **EVCS reserviert Budget**, wenn reale Istleistung, Ziel-/Sollleistung oder PV-Reserve > 0 W vorhanden ist.
- **EVCS reserviert kein Budget**, wenn nur eine Wallbox online oder ein Fahrzeug wartend ist, aber aktuell keine Watt zugewiesen werden.
- Die eigentliche Wallbox-Regelung läuft trotzdem normal weiter: 0-W-Setpoints, Sicherheitsstopps, Zielstatus und PV-Wartezustände bleiben aktiv.

## Was berücksichtigt der Auto-Modus?

Der Modus **Auto** ist kein reiner Tarifmodus. Auto ist der übergeordnete Normalbetrieb, in dem mehrere Logiken zusammengeführt werden.

### 1. Lastmanagement bleibt immer hart aktiv

Unabhängig von Auto, PV, Min+PV oder Boost bleiben diese Grenzen aktiv:

- Netzanschluss-/Grid-Import-Limit
- Phasenstromlimit
- §14a-EnWG-Reduzierung
- Stations-/Connector-Caps bei Mehrfachladepunkten
- Wallbox-Minimum/Maximum
- Stale-/Failsafe-Logik, sofern aktiviert

Wichtig für Feldtest: EVCS-Istleistung für das Netz-Gate kommt aus frischen Messwerten, nicht aus Reservierung oder Sollwert.

### 2. Kein dynamischer Tarif vorhanden

Wenn kein dynamischer Tarif gemappt oder aktiv ist, wird Netzladen nicht automatisch gesperrt.

Das bedeutet im Auto-Modus:

- Netzladen ist grundsätzlich erlaubt.
- PV-Erzeugung und PV-Überschuss werden trotzdem berechnet.
- Zeit-Zielladen funktioniert trotzdem.
- Notfall-Netzladen ist weiterhin möglich, wenn eine Zielzeit sonst nicht erreichbar wäre.
- Harte Netz-/Phasen-/§14a-Limits begrenzen weiterhin jede Ladeleistung.

Damit Anlagen ohne dynamischen Tarif nicht blockieren, ist `gridChargeAllowed` im Normalfall **true**.

### 3. Dynamischer Tarif oder Netzentgelt vorhanden

Wenn dynamischer Tarif oder Netzentgelt aktiv sind, kann Auto zusätzlich Preis-/Zeitfenster berücksichtigen:

- günstiges Netzfenster: Netzladen erlaubt beziehungsweise bevorzugt
- teures Fenster/HT: Netzladen kann gesperrt oder auf PV begrenzt werden
- negativer Strompreis: Netzbezug kann bewusst bevorzugt werden; PV-only kann temporär aufgehoben werden
- Ziel-Laden kann bei Deadline-Druck eine Tarif-/PV-Sperre übersteuern, sofern globales hartes PV-only nicht dominant gesetzt ist

### 4. PV-Erzeugung und PV-Überschuss

PV wird auch im Auto-Modus diagnostisch berechnet. Aktiv begrenzend wirkt PV vor allem dann, wenn:

- global PV-only aktiv ist,
- ein Ladepunkt im PV-Modus läuft,
- ein Ladepunkt im Min+PV-Modus läuft,
- oder Auto durch Tarif-/Netzlogik temporär in PV-only fällt.

PV-only nutzt Start-/Stop-Hysterese, Mindestlaufzeit, technische Mindestleistung und Rampenbegrenzung, damit Wallboxen nicht takten.

### 5. Zeit-Zielladen

Zeit-Zielladen ist bewusst im Auto-Modus aktiv. Es berücksichtigt:

- Ziel-SoC
- Zielzeit/Deadline
- Fahrzeug-SoC, falls verfügbar
- konservativen Fallback, wenn SoC fehlt oder stale ist
- Akku-Kapazität aus Konfiguration beziehungsweise Default
- verfügbare Ladeleistung und Deadline-Urgency
- Tarif-/Forecast-Fenster, sofern vorhanden

Wenn SoC kurz nach dem Einstecken fehlt oder stale ist, kann die Ladung zunächst kurz warten, um keinen falschen Zielplan zu starten.

### 6. Notfall-Netzladen

Notfall-Netzladen ist kein zweiter Regler, sondern Teil des Ziel-Ladens in Auto.

Es greift, wenn Ziel-Laden aktiv ist und eine Deadline sonst nicht erreichbar wäre, zum Beispiel:

- Zielzeit überfällig
- spätester Startzeitpunkt erreicht
- Forecast reicht nicht aus
- Tariffenster deckt die benötigte Energiemenge nicht
- keine verlässliche Forecast-Abdeckung vorhanden und Legacy-Urgency-Schwellen greifen

Harte Grenzen bleiben trotzdem gültig: Netzanschluss, Phasen, §14a und Stationscaps werden nicht übersteuert.

## Feldtest-Empfehlung

Für eine Feldtestanlage mit Kunden ohne dynamischen Tarif ist die sichere Standardaussage:

> Auto funktioniert auch ohne dynamischen Tarif. Ohne Tarifdaten wird Netzladen nicht blockiert. Zeit-Zielladen, PV-Berechnung, PV-Modi, Notfall-Netzladen und hartes Lastmanagement bleiben aktiv. Dynamische Preise sind nur ein optionaler Optimierer, keine Voraussetzung für Lademanagement.

Für PV-priorisierten Betrieb ohne dynamischen Tarif sollte global PV-only oder der Wallbox-Modus PV/Min+PV bewusst gesetzt werden. Dann wartet das System auf PV-Überschuss und nutzt Notfall-Netzladen nur bei aktivem Ziel-Laden und Deadline-Druck.

## Diagnosepunkte für Abnahme

- `chargingManagement.control.actualW`: echte EVCS-Istleistung
- `chargingManagement.control.reserveW`: aktuell zugewiesene EVCS-Reservierung/Sollleistung
- `chargingManagement.summary.totalReservedPowerW`: Wallbox-interne EVCS-Reservierung
- `ems.budget.consumersJson`: zentrale EMS-Consumer; EVCS erscheint ab 0.8.65 nur bei aktivem Watt-Bedarf
- `chargingManagement.debug.allocationJson`: Budget-Debug mit `evcsBudgetReservationActive` und Skip-Grund
- `chargingManagement.control.gridEvcsActualForCapW`: EVCS-Ist für Netz-Gate
- `chargingManagement.control.gridEvcsReserveIgnoredForCapW`: Reservierung, die bewusst nicht für die Netz-Istlast verwendet wird

