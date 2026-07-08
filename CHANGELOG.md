## 0.8.85

- Speicherfarm-Menü/Topbar: Sichtbarkeit jetzt strikt an `/config.featureVisibility.hasStorageFarm` gebunden. Dieses Flag entsteht nur aus AppCenter `storagefarm` installiert+aktiv und echten Farm-Datenpunkten.
- Backend: alte `enableStorageFarm`-Fallbacks und `storageFarm.*` Runtime-States dürfen den Kundenmenüpunkt nicht mehr allein öffnen.
- Speicherfarm-Runtime-Hydration: rettet weiterhin vorhandene Farm-Zeilen für die Bearbeitung, aktiviert oder installiert die App aber nicht mehr automatisch.
- Frontend-Unterseiten nutzen die zentrale Feature-Sichtbarkeit, damit Live, History, EVCS, Reports, SmartHome und Storagefarm-Seite denselben Gatekeeper verwenden.
- Regressionstest `test:storagefarm-menu-appcenter-gate` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v387` erhöht.

## 0.8.83

- App-Center: Speicherregelung aus der allgemeinen Zuordnung in einen eigenen Reiter „Speicher“ verschoben, damit Einzel-Speicher-Konfigurationen übersichtlicher bleiben.
- Speicherregelungs-App: Speichertyp AC oder DC/Hybrid auswählbar. AC bleibt Standard; DC/Hybrid aktiviert zusätzliche PV-Erzeugungs-Zuordnung für Hybrid-/Gateway-Systeme.
- Einzel-DC-/Hybrid-Speicher: Neuer optionaler Messdatenpunkt `dcPvPowerObjectId` für die PV-Erzeugung des Hybrid-/PV-Wechselrichters. Der Wert ist ausdrücklich Messung/Kontext und kein Batterie-Sollwert.
- Speicher-Mapping/Diagnose: `speicher.mapping.kopplung`, `speicher.mapping.dcPvId`, `speicher.dcPvPowerW`, `speicher.regelung.speicherKopplung` und `speicher.regelung.dcPvPowerW` ergänzt. Alte DC-PV-Reste werden bei AC-Betrieb nicht weiter genutzt.
- Energiefluss/History: Einzel-DC-/Hybrid-PV kann analog zur Speicherfarm in die PV-Summe einfließen, mit Double-Count-Heuristik gegen doppelte Zählung.
- FENECON-/0-Einspeise-Kontext nutzt den Einzel-DC-/Hybrid-PV-Messwert als sauberes PV-/Tages-Signal, falls er gemappt ist.
- Regressionstest `test:storage-single-tab-coupling` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v385` erhöht.

## 0.8.82

- Speicher/FENECON/OpenEMS/FEMS: separater Hersteller-/Gateway-Haken in der Speicher-App ergänzt.
- Neuer Tages-/PV-No-Write-Modus: Bei FENECON kann NexoWatt im Tag-/PV-Betrieb keine externe Speicheranforderung mehr schreiben, damit FEMS/OpenEMS nach Watchdog-Ablauf wieder intern regeln kann.
- Optionaler NexoWatt-Assist ergänzt: Bei dauerhaftem Netzbezug darf NexoWatt zeitverzögert und hart NVP-begrenzt eine kleine Entladevorgabe setzen.
- MultiUse, Peak-Shaving, Tarif- und Reserve-Anforderungen bleiben als übergeordnete Policies schreibberechtigt.
- Speicherfarm-Zusammenspiel: Im FENECON-No-Write wird auch kein Farm-Sollwert verteilt; bei Assist oder übergeordneten Policies verteilt die Farm den NVP-begrenzten Zielwert weiter.
- FENECON-Diagnose um Tag-/PV-No-Write, Forecast-/Tageserkennung und Assist-Status erweitert.
- Regressionstest `test:storage-fenecon-day-no-write` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v384` erhöht.

## 0.8.81

- Speicherlogik komplett nach Rollenmodell nachgezogen: Speicherregelungs-App = reine Eigenverbrauchsoptimierung; MultiUse = führende Policy für Reserve, LSK/Peak-Shaving, EVCS-Kopplung und SoC-Zonen; Speicherfarm = reine Verteil-/Schreibschicht.
- Inaktive MultiUse-Zonen aktivieren keine Reserve-/LSK-/EVCS-Logik mehr und blockieren die normale Eigenverbrauchsregelung nicht.
- Entlade-Demand-Caps verschärft: Eigenverbrauch, Tarif-NVP-Entladung und LSK nutzen keinen alten Sollwert und keine abgeleitete Gebäudelast mehr als Demand-Basis.
- LSK-Cap korrigiert: Begrenzung basiert auf echter Peak-Überschreitung am NVP plus echter Batterie-Istentladung und Sicherheitsreserve, nicht auf gesamtem Import oder altem Sollwert.
- Speicherfarm-Floors an MultiUse-Rollenmodell angepasst: Reserve/LSK-Floors gelten nur bei aktiver MultiUse-Policy; 0-W-Limits bleiben bewusste Sperren pro Richtung.
- Regressionstests für Speicher-Baseline, Policy-Trennung, Lade-Cap und Entlade-Cap ergänzt/aktualisiert.
- Service-Worker Cache auf `nexowatt-cache-v383` erhöht.

## 0.8.79

- Speicher-Entladevorgabe abgesichert: Der letzte Sollwert wird nicht mehr als echte Entladeleistung in den NVP-Demand-Cap zurückgeführt. Dadurch kann die Eigenverbrauchs-/Tarifregelung bei kleinem Netzbezug nicht mehr auf viel zu hohe Entladeleistungen hochintegrieren.
- Harte Nach-Rampen-Begrenzung für NVP-Entladung ergänzt: Tarif- und Eigenverbrauchsmodus werden nach der Rampenlogik auf plausible aktuelle Last begrenzt.
- Speicherfarm-Istwertschutz ergänzt: Ist-Leistungs-DPs, die auf Steuer-/Sollwert-DPs zeigen, werden nicht mehr als echte Lade-/Entladeleistung der Farm verwendet und in der Diagnose markiert.
- Regressionstest für den 71,6-kW-Feldfehler ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v380` erhöht.

## 0.8.78

- Speicherregelung/App-Trennung korrigiert: Speicherregelungs-App startet die normale Eigenverbrauchsoptimierung; Speicherfarm startet die Regelung nicht mehr alleine, sondern bleibt Verteil-/Schreibschicht.
- MultiUse-Policy sauber abgegrenzt: SoC-Zonen werden nur bei aktiver MultiUse-App als führende Policy genutzt; inaktive MultiUse-Konfigurationen blockieren die normale Speicherregelung nicht.
- Speicherfarm-Limits zurückgestellt: Leere Be-/Entlade-Grenzen bedeuten unbegrenzt, 0 W sperrt die jeweilige Richtung bewusst.
- Diagnose ergänzt: Policy-Modus und aktive/ignorierte MultiUse-Policy werden als Speicherregelungs-States bereitgestellt.

## 0.8.77

- Speichersteuerung: Speicherfarm-Sollwerte aktivieren die zentrale Speicherregelung jetzt automatisch, auch wenn MultiUse nicht aktiv/installiert ist.
- MultiUse: Inaktive oder alte MultiUse-SoC-Zonen werden im Runtime-Config neutralisiert, damit Eigenverbrauchs-Entladen bei ausreichend SoC und Netzbezug nicht mehr auf 0 W hängen bleibt.
- Speicherfarm: Leere oder 0-W-Be-/Entladegrenzen bedeuten jetzt konsistent „unbegrenzt“ statt `charge_limit_zero`/`discharge_limit_zero`.
- Eigenverbrauchsregelung: Der Demand-Cap berücksichtigt den letzten eigenen Entlade-Sollwert, damit verzögerte/0-W-Istwerte der Farm den Sollwert nicht künstlich herunterziehen.
- Speicherfarm-UI: Hilfetexte und Platzhalter für Max. Beladen/Entladen auf „leer/0 = unbegrenzt“ korrigiert.
- Service-Worker Cache auf `nexowatt-cache-v378` erhöht.

## 0.8.76

- Heizstab-App: Neuer Reiter/Block „Betriebsart“ für den vorhandenen Auto-Button; auswählbar sind „PV-Überschuss am NVP“ und „0-W-Einspeisung / Forecast“.
- 0-W-/Forecast-Logik ersetzt im Auto-Modus die klassische PV-Überschusssteuerung, statt als zweite Testlast-Aktivierung daneben zu laufen.
- Alte `zeroExport.enabled`-Konfiguration wird nur noch zur Migration gelesen; die Laufzeitentscheidung hängt danach sauber an `heatingRod.autoMode`.
- Schnellsteuerung zeigt weiterhin nur einen Auto-Button und ergänzt Status/Diagnose zur aktiven Auto-Betriebsart.
- TS-Normalpfad überschreibt die JS-Probe-/Live-Guard-Strategie der 0-W-/Forecast-Betriebsart nicht mehr.
- Service-Worker Cache auf `nexowatt-cache-v377` erhöht.

## 0.8.75

- Kunden-/LIVE-Frontend: Passwortschutz für sichtbare Bedienung entfernt. Schnellsteuerung, EVCS, SmartHome, RFID und Kundeneinstellungen können ohne Admin-/Installer-Login genutzt werden.
- Schnellsteuerungs-Gates entfernt: Heizstab/Flow, Schwellwertregeln, Relais, BHKW und Generator werten keine Endkunden-Sperrflags mehr als Frontend-Bedienverbot aus.
- Auth-Leiste/Login-Dialog aus LIVE- und Einstellungsseite entfernt; App-Center-/Installer-/Adminseiten behalten ihren Rollen-/Capability-Schutz.
- Service-Worker Cache auf `nexowatt-cache-v376` erhöht, damit die offenen Controls sicher neu geladen werden.
- Keine Änderung an Export Guard, Netzschutz, Lademanagement-Budget oder Speicherregelung.

## 0.8.74

- History: Zusätzliche Energiefluss-Verbraucher verwenden jetzt eine stärker unterscheidbare 10-Farben-Palette; die gestrichelten Linien bleiben unverändert.
- Kundenmenü: Speicherfarm-Link und Speicherfarm-Reiter werden nur noch angezeigt, wenn die Speicherfarm im App-Center installiert/aktiv ist und eine echte Speicherfarm-Konfiguration vorhanden ist.
- Statische Unterseiten starten die Speicherfarm-Navigation versteckt und lassen sie erst nach der `/config`-Prüfung sichtbar werden.
- Service-Worker-Cache erhöht, damit die aktualisierte History-/Menüansicht nach dem Update zuverlässig neu geladen wird.
- Keine Änderung an EMS-Regelung, Lademanagement, Speicherregelung, Export Guard oder Hardwarewrites.

## 0.8.73

- EVCS/VIS: Ladepunkt-Kacheln behalten beim Hover eine neutrale Optik; der globale grüne Hover-Rand wird auf der EVCS-Seite unterdrückt.
- Grüne Umrandung und dezentes Leuchten werden nur noch über den echten Ladezustand `nw-tile--state-on` angezeigt.
- Keine Änderung an Lademanagement, Speicherregelung, Export Guard oder Hardwarewrites.

## 0.8.71

- Speicherregelung: NVP-basierte Eigenverbrauchs-/Tarif-Entladung gegen überschießende Sollwerte gehärtet.
- Ist-Leistung wird ignoriert, wenn sie auf Steuer-/Setpoint-DPs wie `aliases.ctrl.*`, `powerSetpointW`, `chargePowerW` oder `dischargePowerW` verweist.
- Entlade-Demand-Cap wird nach der Rampenbegrenzung erneut hart angewendet, damit ein alter hoher Sollwert nicht weitergeschleppt wird.
- Neue Diagnose: `speicher.regelung.batteryPowerTrusted`, `batteryPowerIgnoredReason`, `dischargeDemandCapW`, `dischargeDemandCapReason`.

## 0.8.70

- Speicher-App-Center bereinigt: sichtbare Hersteller-/Produktnamen in der Speichersteuerung durch allgemeine DP-Zuordnungs- und Gateway-Begriffe ersetzt.
- Keine Herstellerprofile: Steuerpfad bleibt herstellerunabhängig über Datenpunkt-Zuordnung und Capability-Erkennung.
- Legacy-State-IDs bleiben kompatibel, sichtbare Labels/Hinweise sind neutralisiert.

## 0.8.69

- Speicherregelung: Hersteller-offener Zielpfad für Einzel-Speicher ergänzt. Neben dem allgemeinen signed Sollleistungs-DP können jetzt getrennte positive Lade-/Entlade-Sollwert-DPs gemappt werden.
- Speicherregelung: Optionaler Run-/Externe-Regelung-DP ergänzt, damit Adapter/Bridges wie Sungrow-Profile die externe Sollwertführung aktivieren können.
- Speicherregelung: Eigenverbrauchs-Entladung ist für generische Speicher ohne explizite Gegenkonfiguration standardmäßig aktiv; Reserve, Tariffenster, SoC-Grenzen und Safety-Gates bleiben erhalten.
- Diagnose: Zielpfad, Split-Ziel-DPs, Run-DP und letzter Split-Schreibwert werden als States veröffentlicht.

## 0.8.68

- Access-Control: App-Center und Simulation liefern ohne passende Admin-/Installer-Session nur noch eine Sperrseite; es werden keine Hintergrundwerte geladen oder angezeigt.
- Auth: Pflicht-Login-Modus verhindert, dass Abbrechen den App-Center-Inhalt wieder freilegt.
- Lizenz: /api/license/info gibt Lizenzdaten nur noch für Admin-Rolle aus; Lizenzverwaltung bleibt Admin-only.

## 0.8.66

- Release: Versionsnummer auf 0.8.66 erhöht, damit npm nicht versucht, die bereits veröffentlichte 0.8.65 erneut zu überschreiben.
- EVCS Online-Erkennung: `onlineId` wird jetzt als eigener EVCS-State gespiegelt und im Charging-Management separat von `statusId` verarbeitet. Ein echter Online-/Offline-Datenpunkt ist damit authoritative; Status-Texte wie `Available` bleiben reine Anzeige-/Fallback-Information.
- EVCS VIS: Kachelzustand bevorzugt den echten Online-Zustand (`evcs.<n>.online`/`chargingManagement.wallboxes.lp<n>.online`) und wertet `active=false` weiterhin nur als Idle, nicht als Offline.
- Feldtest-Sicherheit: Active-Demand-Reservierung aus 0.8.65 bleibt unverändert; die zusätzliche Prüfung verhindert falsche Optik und falsche Online-Gates bei gemischten Status-/Online-Datenpunkten.

## 0.8.65

- EVCS/VIS: Ladepunkt-Kacheln unterscheiden Online/Idle und Offline jetzt sauber; online verfügbare Wallboxen werden nicht mehr ausgegraut, offline Ladepunkte werden gedimmt dargestellt.
- Lademanagement/Budget: Die zentrale EVCS-Reservierung wird nur noch aus aktivem Ladebedarf gebildet (frische Istleistung oder gültiger Ziel-/Sollwert bei verbundenem Fahrzeug). Inaktive/idle Ladepunkte blockieren kein Budget mehr.
- Diagnose: Active-Demand-Reserve und Anzahl aktiver Ladebedarf-Ladepunkte werden separat veröffentlicht.
- Keine Änderung an Hardwarewrites, Export Guard, Speicherfarm oder Mesh/Microgrid.

## 0.8.64

- Loadmanagement/Budget: EVCS-Ist wird in Status/Prioritäten nicht mehr aus Reservierung oder Sollwert rekonstruiert.
- Loadmanagement/Budget: Budget-Diagnose trennt EVCS-Ist, EVCS-Reservierung und EVCS-Sollwert klar.
- Core-Limits: PV-Budget bleibt physikalisch durch aktuelle PV-Erzeugung begrenzt; künstliches PV-Budget aus EVCS-Reservierung/Speicherentladung wird verhindert.
- Keine Änderung an Hardwarewrites, Export Guard, Speicherfarm oder Mesh/Microgrid.

## 0.8.63

- Core-Limits/Loadmanagement: Zentrales PV-Budget durch physikalische PV-Erzeugung gedeckelt. Flexible Lasten und Batterieentladung können bei PV=0 kein künstliches PV-Budget mehr erzeugen.
- Statusdiagnose: zusätzliche Rohdiagnose für PV-Budget-Rekonstruktion, physikalischen PV-Cap und geklemmte Leistung ergänzt.
- Keine Änderung an Hardware-Schreibpfaden, Speicherfarm, Export Guard oder Mesh/Microgrid.

## 0.8.62

- Lastmanagement: Gate-A-Netzbudget nutzt nur frisch gemessene EVCS-Istleistung für die Netzanschluss-Kappe. Alte Sollwert-/Reservierungswerte können dadurch kein fiktives EVCS-Cap mehr erzeugen.
- Status/App-Center: EVCS Ist, EVCS Reserviert und EVCS Soll werden getrennt angezeigt.
- Zentrales EMS-Budget: EVCS-Reservierung bleibt für Downstream-Apps erhalten, EVCS-Ist wird aber als echte Messleistung veröffentlicht.

## 0.8.61

- Lademanagement: EVCS-Netzcap konservativ gehärtet. Negative Grundlast durch laufende, lokal gedeckte EVCS-Leistung wird nicht mehr als zusätzliche Netzanschlusskapazität genutzt.
- App-Center Status: zeigt jetzt „Lokale Deckung“ separat und „EVCS Cap (Netz sicher)“ statt eines missverständlichen Caps über dem Netzanschluss.
- Regelung: keine Änderung an Hardwarewrites; nur Budget-/Diagnoseformel für Gate A Netz korrigiert.

## 0.8.60

- Core-Limits: TS-Shadow-Vergleich für `grid.effectiveW` als Diagnose-only klassifiziert, damit kein minütlicher Warn-Log-Spam mehr entsteht.
- Core-Limits: Warnungen werden nur noch für echte Warnfelder ausgegeben; `grid.effectiveW` bleibt im Diagnose-JSON sichtbar.
- Sicherheit: keine Änderung an produktiver Regelung, 0-Einspeisung, Speicherfarm, Mesh/Microgrid oder Hardwarewrites.

## 0.8.59

- App-Center: Regression Safety Gate ergänzt. Bekannte Speicherfarm-Konfigurationen werden beim Speichern nicht mehr versehentlich mit leerer UI-Liste überschrieben.
- Qualität: Kritische Release-Gates für Speicherfarm, App-Center-Struktur, No-Release-Artefakte und Runtime-Sync gebündelt.
- Sicherheit: Keine Änderung an Regelung, Export Guard, Mesh/Microgrid oder Hardware-Schreibpfaden.

## 0.8.58

- Speicherfarm/App-Center: Fehler behoben, durch den die Master-Detail-Ansicht nach dem Hinzufügen oder Wiederherstellen eines Speichers wegen undefiniertem `htmlEscape` abbrechen konnte.
- Speicherfarm/App-Center: Runtime-Fallback erweitert. Wenn `storageFarm.configJson` leer ist, werden sichtbare Speicher aus `storageFarm.storagesStatusJson` oder notfalls aus `storageFarm.storagesTotal` als editierbare Platzhalter wiederhergestellt.
- Sicherheit: keine Änderung an Speicherfarm-Regelung, Dispatch, Export Guard, Mesh/Microgrid oder Hardwarewrites. Nur UI-/Konfigurationswiederherstellung.

## 0.8.57

- Bugfix: Speicherfarm-Konfiguration im App-Center wird wieder aus `storageFarm.configJson`/`storageFarm.groupsJson` hydratisiert, wenn `installer.configJson` keine `storageFarm.storages` enthält.
- Schutz: Speichern im App-Center überschreibt produktiv laufende Speicherfarm-Konfiguration nicht mehr versehentlich mit einer leeren Speicherliste.
- Regressionstest `test:storage-farm-appcenter-restore` ergänzt.
- Keine neue Regelstrecke, keine neue Hardwaresteuerung.

## 0.8.56

- 0-Einspeise: Senken-ACK-Verlauf und Feldprotokoll ergänzt.
- ACK-/Status-States je Senke werden nachgelagert gelesen; kein Schreibtest pro Regel-Tick.
- Fehler/Timeout blockieren nur die betroffene Senke, damit der Export Guard schnell zur nächsten Senke oder WR-Abregelung wechseln kann.
- Neue Diagnose-States unter `gridConstraints.exportLimit.sinkAck*` und `gridConstraints.exportLimit.sinks.*.ack*`.

## 0.8.55

- 0-Einspeise: Senken-Freigabe und schneller Aktivbetrieb ergänzt. Schreibtests werden nicht in jedem Regel-Tick ausgeführt.
- Export Guard nutzt gespeicherte ACK-/Freigabedaten je Senke und blockiert fehlerhafte Ziele temporär, bevor die nächste Senke oder WR-Abregelung als Fallback genutzt wird.
- Neue Runtime-States für Fast-Path, Sink Availability, ACK-Zusammenfassung und Zielblockierung ergänzt.
- Bestehende Export-Guard-Regelstrecke bleibt die einzige Regelstrecke; keine zweite 0-Einspeise-Regelung.

## 0.8.54

- 0-Einspeise Inbetriebnahme-Assistent ergänzt. Bestehender Export Guard wird nicht dupliziert.
- Checkliste für Smartmeter, Installateurfreigabe, 0-W-Limit, WR-Write, Senkenreihenfolge und neutrale Senken ergänzt.
- Write-Test-Vorschau und Feldreport unter `gridConstraints.exportLimit.commissioning.*` ergänzt.
- App-Center Diagnose zeigt Inbetriebnahme-Score und offene Pflichtprüfungen.

## 0.8.53

- Audit-/Regression-Fix: alte Versionsanker in Mesh-/0-Einspeise-Testskripten korrigiert.
- Runtime-TS-Spiegel synchronisiert, damit `check:ts-runtime-mirrors` wieder sauber läuft.
- Keine neue EMS-Regelstrecke, keine direkte Hardwaresteuerung, kein App-Center-Schemawechsel.

## 0.8.52

- Hotfix: 0-Einspeise-Senkenkaskade schreibt konfigurierte Speicher-/Ladepunkt-/Flex-/Mesh-Command-States jetzt im Aktivmodus als neutrale JSON-Commands.
- Hotfix: Fehlende WR-Write-Datenpunkte werden nicht mehr als alleiniger Blocker bewertet, wenn aktive Senken-Command-States vorhanden sind; WR-Abregelung bleibt letzte Stufe.
- Neue Diagnose-States für Sink-Command-Write-Status und Fehlertext ergänzt.

## 0.8.51

- Export Guard/0‑Einspeisung: Senkenreihenfolge festgelegt und sichtbar gemacht: Verbrauch zuerst, Speicher laden, Ladepunkte, flexible Verbraucher, Mesh/Microgrid, WR-Abregelung zuletzt.
- Installer: optionale neutrale Command-State-Felder für Speicher, Ladepunkte, flexible Verbraucher und Mesh/Microgrid ergänzt.
- Runtime-Diagnose: `gridConstraints.exportLimit.sinkPriority*` States und nächster Senken-Schritt ergänzt.
- Architektur: keine zweite Einspeiseregelung; die bestehende Export-Guard-/Grid-Constraints-Regelung bleibt Quelle der Wahrheit.

## 0.8.50

- Mesh/Microgrid: Zielgruppen-Verteilung/Fairness ergänzt. Zielgruppen erhalten transparente Budgets, Mindestanteile, Gewichtung und Reserven.
- CommandGuard: Zielgruppen-Fairness begrenzt/blockiert nur neutrale Command-Intents; keine direkten Hardwarewrites.
- Betreiberansicht: Fairness-Budget und Restbudget je Zielgruppe sichtbar.

## 0.8.49

- Mesh/Microgrid: Zielgruppen-Strategie ergänzt. Knoten können zu Gruppen wie Ladepunkte, Speicher, Verbraucher oder Erzeuger gebündelt werden.
- CommandGuard berücksichtigt Gruppenpriorität, Gruppenlimits und Gruppenbudgets, bevor neutrale Command-Intents ausgegeben werden.
- App-Center: Zielgruppen-JSON im separaten Mesh/Microgrid-Reiter ergänzt; Apps bleibt reiner App-Katalog.
- Betreiberansicht/API/CSV enthalten Zielgruppen, Prioritätsreihenfolge und gruppenbedingte Limit-/Blockiergründe.
- Weiterhin keine direkten OCPP-/Modbus-/MQTT-/Herstellerwrites aus Mesh/Microgrid.

## 0.8.48

- Mesh/Microgrid: Leistungsgrenzen je Knoten ergänzt. `minPowerW`, `maxPowerW`, `maxImportW`, `maxExportW`, `maxChargeW`, `maxDischargeW`, `maxLoadW` und `maxGenerationW` können im Mesh/Microgrid-Reiter gepflegt werden.
- CommandGuard: Node- und Bridge-Ziel-Limits begrenzen oder blockieren neutrale Command-Intents vor der Ausgabe.
- Betreiberansicht und CSV/API: gekürzte und blockierte Commands mit Limitgrund sichtbar.
- Architektur: weiterhin herstellerneutral, keine direkten Hardwarewrites aus Mesh/Microgrid.

## 0.8.47

- Mesh/Microgrid: Bridge-Wiederfreigabe je Ziel ergänzt. ACK-OK gibt blockierte Ziele automatisch wieder frei.
- Mesh/Microgrid: manuelle Ziel-Freigabe über API/Betreiberansicht vorbereitet, ohne direkte Hardwarewrites.
- Mesh/Microgrid: Command-Verlauf je Bridge-Ziel als Diagnose-/Feldtestbasis ergänzt.

## 0.8.46

- Mesh/Microgrid: Bridge-ACK-Gate ergänzt. Optional kann ACK pro lokaler Bridge-Zuordnung als Voraussetzung für Folge-Commands gesetzt werden.
- Mesh/Microgrid: Ziel-Ampel und blockierte Ziele werden als Diagnose-States veröffentlicht; direkte Hardwarewrites bleiben weiterhin ausgeschlossen.
- App-Center: ACK-Gate-Schalter im Reiter Mesh/Microgrid ergänzt; Apps-Reiter bleibt reiner App-Katalog.
- Paket: Keine ZIP/TGZ-Artefakte im Paketbaum; TypeScript bleibt fachliche Quelle.

## 0.8.45

- Mesh/Microgrid: Local Bridge ACK- und Zielstatus ergänzt. Bridge-Zuordnungen können jetzt optionale ACK-/Status-States enthalten, die nur gelesen und herstellerneutral klassifiziert werden.
- Betreiberansicht: Bridge ACK / Zielstatus zeigt ok, pending, timeout, Fehler, veraltete und fehlende Rückmeldungen je Bridge-Ziel.
- App-Center: lokale Bridge-Zuordnung erhält ACK-Auswertung und Timeout, weiterhin im separaten Mesh/Microgrid-Reiter und nicht im Apps-Katalog.
- Sicherheit: keine direkten OCPP-/Modbus-/MQTT-/Herstellerwrites; das Mesh-Modul bleibt bei neutralen JSON-Command-Intents und liest ACKs nur zur Diagnose.

## 0.8.44

- Mesh/Microgrid: Local Bridge Mapping ergänzt. Freigegebene neutrale Mesh-Command-Intents können jetzt lokal auf Ziel-Command-States je Knoten geroutet werden.
- App-Center: Konfiguration bleibt im separaten Reiter Mesh/Microgrid; Apps-Reiter bleibt reiner App-Katalog.
- Betreiberansicht: Local-Bridge-Status, Mappingdiagnose, geroutete/ungemappte Commands und letzte Bridge-Writes sichtbar.
- Sicherheitsgrenze: weiterhin keine direkten OCPP-/Modbus-/MQTT-/REST-/Herstellerwrites aus der Mesh-App; lokale Bridges/Adapter setzen den JSON-Intent um.

## 0.8.43

- Mesh/Microgrid: Zwei-Instanzen-Feldtest mit Peer-Fehlerklassen, Roundtrip-Ampel und Remote-Node-Matrix gehärtet.
- Mesh/Microgrid: Feldtest-Verlauf persistenter als Diagnose-State veröffentlicht und Betreiberansicht erweitert.
- Sicherheit: Weiterhin keine direkten Hardwarewrites; Command-Receiver arbeitet ausschließlich über neutrale JSON-Command-States.

## 0.8.42

- Mesh/Microgrid: Feldtestansicht für zwei Instanzen ergänzt.
- Betreiberansicht zeigt Peer-Matrix, Handshake-Status, Command-/ACK-Verlauf und Fehlerklassifikation für Token, Cluster, TTL und Replay.
- Neuer manueller Probe-Endpunkt `/api/mesh/peer/fieldtest` prüft Handshake, Status und Command-Receiver über das separate Mesh-Tailscale.
- Weiterhin herstellerneutral: keine direkten Hardwarewrites, nur neutrale JSON-Command-Envelopes für lokale Bridges.

## 0.8.41

- Mesh/Microgrid: Peer-Handshake und Command-Receiver für das separate Mesh-Tailscale ergänzt.
- Remote-Kommandos werden tokenisiert, Cluster-geprüft, replay-geschützt und nur als neutraler lokaler JSON-Command-State ausgegeben.
- API-Routen `/api/mesh/handshake`, `/api/mesh/status` und `/api/mesh/command/receive` ergänzt.
- App-Center Mesh/Microgrid-Reiter um Command-Receiver-Konfiguration erweitert; Apps-Reiter bleibt reiner App-Katalog.

## 0.8.40

- Mesh/Microgrid: Feldtest-Steuerung ergänzt. Geplante Aktionen können nach Installateurfreigabe als neutrale JSON-Command-Intents in einen konfigurierten Command-State ausgegeben werden.
- Mesh/Microgrid: Separates Tailscale-Mesh-Profil, lokale Node-ID und Peer-URLs vorbereitet, damit Fernwartung und Energieverbund getrennt bleiben.
- Sicherheit: keine direkten OCPP-/Modbus-/MQTT-/Hersteller-Hardwarewrites; Umsetzung erfolgt nachgelagert über Bridge/Instanz.

## 0.8.39

- Mesh/Microgrid: CommandGuard-Vorbereitung ergänzt. Geplante Diagnoseaktionen werden jetzt als neutrale, blockierte Command-Intents veröffentlicht.
- Mesh/Microgrid: Safety-Prüfungen für EOS-Lizenz, Feature-Freigabe, Netzlimit, Knotenprioritäten, Mapping-Vollständigkeit und Read-only-Gate ergänzt.
- Mesh/Microgrid: API `/api/mesh/microgrid/command-guard` liefert die Guard-Vorschau; POST `/api/mesh/microgrid/command` bleibt absichtlich read-only blockiert.
- Betreiberansicht: CommandGuard-Status, Safety-Checks und blockierte Command-Intents sichtbar gemacht. Keine Hardwaresteuerung.

## 0.8.38

- App-Center Strukturhärtung: Der Apps-Reiter bleibt strikt ein App-Katalog für Installiert/Aktiv und optionale Navigationsbuttons.
- Schnell-Inbetriebnahme (Geräte + DPs) aus dem Apps-Reiter in den Reiter Zuordnung verschoben.
- Optionale Detail-Reiter werden im HTML initial ausgeblendet und erst über den Installiert-Status sichtbar gemacht.
- Regressionstest erweitert, damit neue Detailkonfigurationen nicht erneut im Apps-Reiter landen.
- Service-Worker Cache auf `nexowatt-cache-v338` erhöht.

## 0.8.37

- App-Center: Mesh/Microgrid-Detailkonfiguration aus dem Reiter Apps entfernt. Apps zeigt nur noch Installiert/Aktiv und einen Hinweis.
- Neuer Reiter Mesh/Microgrid, sichtbar nur bei installierter EOS Mesh/Microgrid-App.
- Regressionstest erweitert, damit große Modul-Konfigurationen nicht wieder auf der Apps-Startseite landen.

## 0.8.36

- EOS Mesh/Microgrid: Regelbasis im Diagnosemodus ergänzt. Die Betreiberansicht zeigt geplante Local-First-/Grid-Last-Aktionen, Prioritätsreihenfolge und Netzlimit-Diagnose.
- Wichtig: Alle geplanten Entscheidungen sind read-only (`hardwareWrite=false`) und schreiben keine Hardware-, WR- oder Ladepunkt-Setpoints.
- Mesh/Microgrid CSV-/JSON-Snapshot enthält jetzt Planungsdiagnose und geplante Aktionen.
- Service-Worker Cache auf `nexowatt-cache-v336` erhöht.

## 0.8.35

- EOS Mesh/Microgrid: Betreiberansicht `/mesh/microgrid` ergänzt.
- Neue JSON-/CSV-Snapshot-APIs für Cluster, Knoten, Energy-Intents und Local-First/Grid-Last-Diagnose.
- App-Center verweist aus der Mesh/Microgrid-App auf die Betreiberansicht; die Logik bleibt read-only und schaltet keine Hardware.
- Service-Worker Cache auf `nexowatt-cache-v335` erhöht.

## 0.8.34

- App-Center: Button „Zurück zum Installer“ korrigiert. Der Link springt jetzt auf den ioBroker-/EOS-Admin-Tab `#tab-nexowatt-ui-0` mit Admin-Port statt auf `tab.html` am Adapter-Webserver.
- Admin-Port-Erkennung ergänzt: `adminPort`, `ioBrokerAdminPort` oder `port` können per URL übergeben werden; Standard bleibt 8081.
- Referrer vom Adapter-Port wird nicht mehr als Admin-Ziel verwendet, damit kein Rücksprung auf den falschen Port entsteht.

## 0.8.34

- App-Center: Der Button „Zurück zum Installer“ verweist jetzt zuverlässig auf den ioBroker-/EOS-Admin-Tab `#tab-nexowatt-ui-0` auf dem Admin-Port statt auf `/tab.html` am Adapter-Webserver.
- Regressionstest `test:installer-back-link` ergänzt, damit der falsche `/adapter/nexowatt-ui/tab.html`-/`tab.html`-Rücksprung nicht zurückkommt.
- Service-Worker Cache auf `nexowatt-cache-v334` erhöht.

## 0.8.33

- App-Center-Struktur bereinigt: Apps zeigt nur noch Funktionsmodule; System-/Marktprofil und NL P1/DSMR liegen im Reiter Zuordnung.
- EOS DC Station Display / Stationsseiten wurden in den Reiter Ladepunkte verschoben.
- Button „Zurück zum Installer“ im App-Center-Header ergänzt.
- Speicherfarm-Konfiguration als Master-Detail-Ansicht umgebaut: links Speicherliste, rechts nur das Detailformular des ausgewählten Speichers.
- Kommentare zur verbindlichen App-Center-Sortierregel ergänzt.

## 0.8.33

- App-Center-Struktur bereinigt: Der Apps-Reiter zeigt nur noch Funktionsmodule.
- System & Marktprofil sowie NL P1/DSMR & Teruglevering sind jetzt dem Reiter Zuordnung zugeordnet.
- EOS DC Station Display / Ladestationsseiten sind jetzt dem Reiter Ladepunkte zugeordnet.
- Neuer Button „Zurück zum Installer" im App-Center-Kopfbereich.
- Speicherfarm auf Master-Detail-Ansicht umgestellt: links Speicherliste, rechts nur der ausgewählte Speicher im Detail.
- Schema dokumentiert: Apps = Funktionsmodule, Zuordnung = Mapping/Marktprofil, Ladepunkte = LP/Stationsseiten, Status = Runtime/Diagnose.

## 0.8.32

- EOS: Neue separate App „EOS Mesh/Microgrid“ ergänzt.
- EMS: Read-only Mesh-/Microgrid-Datenmodell mit Knoten, Cluster, Local-First-/Grid-Last-Vorbereitung und Energy-Intent-JSON-States.
- App-Center: Installer kann Mesh-Knoten, Rollen und Datenpunktquellen anlegen; Home bleibt blockiert.
- Sicherheit: Keine Hardware-Schreibbefehle, keine doppelte Ledger-/Wallet-/Export-Guard-Logik, keine Hersteller-/OCPP-Bindung.

## 0.8.30

- Export Guard: Diagnose/Testmodus ergänzt. In diesem Modus werden Einspeiselimit, geplante Aktion und Abregelungsbedarf berechnet, aber keine WR-/PV-Setpoints geschrieben.
- Installer/App-Center: Runtime-Diagnose für Einspeisebegrenzung zeigt aktuelle Einspeisung, erlaubtes Limit, Überschreitung, Abregelung, WR-Schreibfähigkeit, geplante Aktion und Negative-Preis-Strategie.
- Grid Constraints: neue Diagnose-States `runMode`, `diagnosticOnly`, `plannedAction`, `installerMessage` und `installerChecklistJson` ergänzt.
- Release-Hygiene: ZIP-/TGZ-Artefakte bleiben bewusst außerhalb des Pakets und werden durch `.npmignore` ausgeschlossen.

## 0.8.29

- Export Guard Diagnose erweitert: aktuelle Einspeisung gegen erlaubtes Limit, verbleibende Einspeiseleistung und Überschreitung werden sichtbar.
- Abregelungsleistung, fehlende WR-/PV-Write-Datenpunkte und negative-Preis-Strategie werden als Diagnose-States veröffentlicht.
- Energie-Wertkonto übernimmt die Export-Guard-Diagnose als Referenz und bereitet abgeregelte kWh, Abregelungswert und nicht genutzten PV-Wert vor, ohne Ledger-/Wallet-Werte doppelt zu zählen.
- LIVE-Karte zeigt den Export-Guard-Wert nur bei tatsächlicher Abregelung an.

## 0.8.26

- EOS: Local kWh Ledger Grundlage ergänzt. DC-Station-Display-Sessions werden herstellerneutral aus `chargeKiosk.stations.*.lastSessionsByLpJson` als kompakte Ledger-Einträge übernommen.
- Ledger-Summen für Tag, Monat und Jahr mit Solar-/Netzanteil, Wert, Stationen/LPs und Deduplikation über `processedSessionKeysJson` ergänzt.
- Exportbasis `energyLedger.export.todayCsvJson` und Recent-Entries vorbereitet; bewusst keine eichrechtsverbindliche Abrechnung.
- App-Center zeigt das EOS-only Modul `Local kWh Ledger`; die Funktion bleibt read-only und schaltet keine Hardware.
- Service-Worker Cache auf `nexowatt-cache-v326` erhöht.

## 0.8.25

- DC Station Display: Betreiberwerte erweitert. Letzte Session je LP wird persistiert und im Display angezeigt.
- DC Station Display: Betreiber-Tageswerte enthalten Solar-/Netzanteil, abgeschlossenen Umsatz, Exportbereitschaft und Sessiondiagnose.
- CSV-Export: Operator-Export v2 mit aktiven Sessions, persistierten letzten Sessions und Tages-Summen ergänzt.
- Architektur: Session-/Betreiberlogik bleibt hersteller- und protokolloffen, ohne OCPP-only-Kopplung.

## 0.8.24

- Energie-Wertkonto: Kundenhinweis und Installateurdiagnose getrennt; die LIVE-Karte zeigt nur kundenrelevante Warnungen, technische Details bleiben in `energyWallet.diagnostics.*`.
- Energie-Wertkonto: Dynamische Zeittarife bekommen Quelle, Alter und Max-Alter-Prüfung. Veraltete Tarifpreise fallen sauber auf den festen Netzstrompreis zurück.
- Kunden-Einstellungen: optionaler Schalter `Preisquelle in LIVE-Karte anzeigen` ergänzt.
- LIVE: optionale Preisquellen-Zeile mit wirksamem Preis, dynamischer Tarifquelle und Alter vorbereitet.
- Service-Worker Cache auf `nexowatt-cache-v324` erhöht.

## 0.8.23

- Energie-Wertkonto: Warnhinweis im LIVE-Dashboard entschärft; optionale veraltete Zusatzquellen wie EVCS/Speicher erzeugen nur noch Diagnosedaten, aber keine Kundenwarnung.
- Kunden-Einstellungen: Energie-Wertkonto bekommt einen eigenen An/Aus-Schalter und der Preisblock wurde unterhalb der dynamischen Tarif-/Netzentgelt-Sektion positioniert.
- Backend/EMS: `settings.energyWalletEnabled` als kundenseitiger Schalter ergänzt; bei Aus wird das Wertkonto deaktiviert und die LIVE-Karte ausgeblendet.
- Service-Worker Cache auf `nexowatt-cache-v323` erhöht.

## 0.8.22

- DC Station Display: Betreiber-/Sessionwerte pro Station robuster persistiert.
- Last-Session-je-LP und Tageskennzeichen für Betreiberwerte ergänzt.
- CSV-Exportbasis für Stations-/Sessiondaten unter `/api/display/station/<token>/operator.csv` vorbereitet.
- npm-Release-Prüfung ergänzt: `npm run release:verify-npm` prüft nach dem Publish, ob die Paketversion wirklich in der Registry sichtbar ist. Dadurch wird vermieden, dass das EOS/ioBroker-Repository eine Version freigibt, die beim Upgrade mit `ETARGET` nicht gefunden wird.
- Service-Worker Cache auf `nexowatt-cache-v322` erhöht.

## 0.8.21

- Burger-Menü-Härtung: `nw-shell.js` übernimmt den Menübutton im Capture-Flow, damit Seiten-spezifische Menühandler und Shell-Fallback nicht doppelt toggeln.
- LIVE/App-Menü markiert den eigenen Handler, sodass die Shell nicht zusätzlich denselben Button bindet.
- 0.8.20-Funktionsstand bleibt enthalten: LP-Bedienung auf DC-Station-Displays, AC-Phasenblock nur bei AC-Ladepunkten und dynamischer Tarif im Energie-Wertkonto.
- Service-Worker Cache auf `nexowatt-cache-v321` erhöht.

## 0.8.20

- DC Station Display: Jede LP-/Connector-Kachel bekommt eine eigene Bedienung für Regelung An/Aus, Modus Auto/Boost/Min+PV/PV, Speicher-Mitnutzung und Ziel-Laden.
- DC Station Display: AC-Phasenumschaltung 1p/3p/Auto PV wird nur bei AC-Ladepunkten mit konfigurierter Phasenumschaltung angezeigt; DC-Ladepunkte bleiben ohne fachlich falschen Phasenblock.
- Display-API: Neue tokenisierte Aktionen `set-enabled`, `set-mode`, `set-storage`, `set-goal` und `set-phase` laufen weiter über die herstellerneutrale NexoWatt-Steuerbrücke und schreiben keine direkten OCPP-/Herstellerbefehle.
- Energie-Wertkonto: Dynamische Zeittarife werden berücksichtigt. Ist der dynamische Tarif aktiv und ein aktueller Preis verfügbar, wird dieser Preis für vermiedenen Netzbezug verwendet.
- Einstellungen: Feste Preisannahmen für das Energie-Wertkonto liegen jetzt im Nutzerfrontend unter Einstellungen/Dynamische Zeittarife; das App-Center bleibt für Verknüpfungen und Installer-Konfiguration zuständig.
- App-Center: Preisfelder aus dem Installerbereich entfernt und durch Hinweis auf die Nutzer-Einstellungen ersetzt.
- Frontend: Burger-Menü zentral gehärtet; doppelte Menü-Handler von App-/Shell-Skripten schließen das Dropdown nicht mehr sofort wieder.
- Service-Worker Cache auf `nexowatt-cache-v320` erhöht.

## 0.8.19

- DC Station Display: Session-/Betreiberbasis ergänzt. Aktive/letzte Sessions werden im Display-Payload klarer gekennzeichnet, Session-Kosten nach Solar-/Netzanteil vorbereitet und Diagnosezustände erweitert.
- DC Station Display: Herstellerneutrale Steuerbrücke vorbereitet. Befehle laufen weiterhin über das NexoWatt-Charging-Management oder optional über einen frei mappbaren JSON-Command-State; damit bleibt die Anzeige nicht OCPP-fest verdrahtet.
- App-Center: Steuerungsprofil und optionaler Command-State pro Display-Station ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v320` erhöht.

## 0.8.18

- EOS DC Station Display: Display-Watchdog je Station mit `displayStatus`, `displayWarning`, `lastSeenAgeSec`, `offlineSince` und Online-/Offline-Zählern ergänzt.
- Display-Frontend: Wartungs-/Offline-Hinweis, Touch-Layouts für 1/2/4 Connectoren und zusätzliche Session-Daten für Dauer, Solar-kWh und Netz-kWh ergänzt.
- Display-API: Wartungsmodus blockiert Start/Stop sicher serverseitig; letzte Display-Kommandos werden zusätzlich als JSON diagnostiziert.
- App-Center: Wartungsmodus, Watchdog-Timeout und Touch-Layout pro DC-Station konfigurierbar.
- Home bleibt unverändert; DC Station Display bleibt EOS-only.

## 0.8.17

- EOS DC Station Display Basis ergänzt: pro angelegter DC-Ladestation gibt es eine tokenisierte Vollbildseite unter `/display/station/<token>`.
- Installer/App-Center: Stationen mit Name, Token, zugeordneten LPs/Connectoren, Solar-/Schnellladen und optionalen Preisen konfigurierbar.
- Backend: tokengefilterte Display-API, Heartbeat und Start/Stop-/Modus-Kommandos mit EOS-Gate und LP-Zuordnungsprüfung.
- Frontend: neue touch-optimierte Display-Seite ohne Navigation, ohne Admin-Funktionen und ohne Rohdatenpunkt-Anzeige.

## 0.8.16

- Energie-Wertkonto: Monats- und Jahreswerte ergänzt (`energyWallet.month.*`, `energyWallet.year.*`).
- Energie-Wertkonto: Persistenz über Adapter-Neustart, Tageswechsel, Monatswechsel und Jahreswechsel gehärtet.
- Energie-Wertkonto: Plausibilitäts-/Datenqualitätsdiagnosen ergänzt (`energyWallet.diagnostics.*`), damit fehlende oder stale PV-/Netzquellen nicht blind integriert werden.
- LIVE: Nutzerkarte zeigt zusätzlich Monatswert, Jahreswert und Datenqualität; Konfiguration bleibt weiterhin ausschließlich im Installer/App-Center.
- Service-Worker Cache auf `nexowatt-cache-v317` erhöht.

## 0.8.15

- Energie-Wertkonto für Home und EOS ergänzt: PV-Wert, lokale Nutzungsquote, vermiedener Netzbezug, Einspeisewert, Speicherwert und Solar-Ladepunktwert werden als `energyWallet.*` States berechnet.
- Home enthält das volle Energie-Wertkonto für Einzelanlagen; EOS behält Betreiber-/Abrechnungsfunktionen wie Ledger, Kiosk, Mesh und Microgrid als spätere Erweiterungen.
- Installer/App-Center erweitert: Preisannahmen für Netzstrom, Einspeisung und Solar-Laden bleiben im Installerbereich; das normale Frontend zeigt nur die Nutzerkarte.
- Feature-Flags auf Home/EOS-Abgrenzung angepasst: `energyWallet` ist Home-Basis, `energyLedger`, `chargeKiosk`, `mesh`, `microgrid` und Betreiberexporte bleiben EOS.
- Service-Worker Cache bleibt mit dem 0.8.14/0.8.15-Build konsistent.

## 0.8.14

- Fundament für Home/EOS-Trennung ergänzt: Home/HEMS bleibt Basislizenz, EOS erhält vorbereitete Zukunfts-Feature-Flags.
- Länderprofil DE/NL vorbereitet und als Installer-Konfiguration im App-Center sichtbar gemacht.
- ioBroker-Systemsprache wird aus `system.config.common.language` übernommen und in `/config`, `system.language` und den Frontend-Shells genutzt.
- Neues Runtime-Modul `country-profile` veröffentlicht Länder-/Marktbegriffe und spätere NL-Fähigkeiten als States.
- Dokumentation ergänzt: Roadmap Home/EOS/NL und Anleitung zum System-/Länderprofil.
- Service-Worker Cache auf `nexowatt-cache-v316` erhöht.

## 0.8.13

- App-Center Ladepunkt-Checkboxen optisch korrigiert.
- Der neue Haken „Kunde darf Speicher-Mitnutzung bedienen“ nutzt jetzt die kompakte `nw-config-checkbox`-Darstellung statt der Browser-Standardgröße.
- Weitere dynamische EVCS-Installer-Checkboxen im Ladepunktbereich auf dieselbe kompakte Darstellung vereinheitlicht.
- Service-Worker Cache auf `nexowatt-cache-v314` erhöht.

## 0.8.12

- EVCS-Speicher-Mitnutzung pro Ladepunkt eingeführt: Installer-Freigabe im App-Center und Kundenwahl im LIVE-/EVCS-Frontend.
- Backend-Gate ergänzt: Ohne Installer-Freigabe bleibt die Speicher-Mitnutzung gesperrt und unsichtbar.
- EVCS-Allocation berücksichtigt Speicherleistung nur für freigegebene und aktivierte Ladepunkte; geschützte Ladepunkte ziehen den Speicher nicht leer.
- Diagnose-States für `storageAssistCustomerAllowed`, `userStorageAssistEnabled`, `effectiveStorageAssist`, `storageAssistBlockedReason` und `batteryContributionW` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v314` erhöht.

## 0.8.11

- EVCS-AC-Phasenbedienung im LIVE-Ladestation-Modal und auf der EVCS-Seite nutzt jetzt direkt die Installer-Konfiguration: Sobald `phaseSwitchId` zugeordnet ist, erscheinen die drei Buttons `1p`, `3p` und `Auto PV`.
- Die Sichtbarkeit hängt nicht mehr nur an `phaseSwitchSupported` aus dem Runtime-State, weil dieser erst nach einem EMS-Tick verfügbar sein kann. Ohne Phasen-Haupt-DP bleibt die Bedienung weiterhin unsichtbar.
- `/api/state` primt die EVCS-Phasenstates (`userPhaseMode`, `phaseMode`, `phaseSwitchSupported`, aktuelle/Zielphase, Umschaltstatus, Cooldown) für LIVE/EVCS zuverlässiger.
- Service-Worker Cache auf `nexowatt-cache-v312` erhöht.

## 0.8.10

- EVCS-AC-Phasenbedienung folgt jetzt der allgemeinen UI-Regel: Ohne zugeordneten Haupt-DP wird die Bedienung nicht gesperrt angezeigt, sondern vollständig ausgeblendet.
- LIVE-Ladestation-Modal und EVCS-Seite zeigen `1p`, `3p` und `Auto PV` nur noch, wenn `phaseSwitchSupported` vom Backend wirklich `true` ist.
- Test `charging-phase-ui` prüft jetzt explizit, dass keine sichtbaren Gesperrt-Hinweise für fehlende Phasenumschalt-DPs zurückkommen.
- Service-Worker Cache auf `nexowatt-cache-v311` erhöht.

## 0.8.9

- EVCS LIVE-Modal und EVCS-Seite zeigen jetzt den AC-Phasenmodus an, wenn die Wallbox per EMS/AC konfiguriert ist.
- Nutzer können direkt zwischen `1p`, `3p` und `Auto PV` wählen; der Wert wird als `userPhaseMode` gespeichert und von der TypeScript-Allocation/Write-Plan-Kette ausgewertet.
- Backend `/api/set` akzeptiert nun `evcs.<n>.phaseMode`/`userPhaseMode`; Diagnose zeigt Phase, Zielphase, Cooldown und Umschaltgrund.
- Service-Worker Cache auf `nexowatt-cache-v310` erhöht.


## 0.8.7

- Hotfix: App-Center baut die lizenzabhängige App-Liste nach dem Laden der EOS/HEMS-Lizenz sofort neu auf.
- Fix: Gültige EOS-Lizenz zeigt wieder alle Apps statt "Keine Apps verfügbar".

## 0.8.6

- Lizenz-Aktivierung-Hotfix: App-Center, Lizenz-API und VIS-Gate aktualisieren den Lizenzstatus jetzt direkt aus der gespeicherten Adapter-Konfiguration. Dadurch werden EOS/HEMS-Schlüssel auch dann wirksam, wenn sie über die Admin-Konfiguration gespeichert wurden und der Runtime-Status noch nicht synchron war.
- App-Center zeigt bei gültiger EOS-Lizenz wieder alle Apps statt „Keine Apps verfügbar“.
- Service-Worker Cache auf `nexowatt-cache-v307` erhöht.
- npm-Publish-Härtung aus 0.8.5 bleibt erhalten; der Lizenzgenerator bleibt separat vom Adapter-Repository.

## 0.8.5

- Windows-Publish-Fix: `scripts/ensure-publish-dev-deps.js` startet npm nicht mehr über `npm.cmd`, sondern über den npm-CLI-Einstieg des laufenden Node-Prozesses. Dadurch wird `spawnSync npm.cmd EINVAL` beim `npm publish` vermieden.
- Service-Worker Cache auf `nexowatt-cache-v306` erhöht.
- EOS/HEMS-Lizenzmodell und App-Center-Cleanup bleiben unverändert; der Lizenzgenerator bleibt separat vom Adapter-Repository.

# Changelog

## 0.8.4
- Release-Cleanup: frische npm-fähige Paketbasis ohne Merge-Konfliktmarker in `package.json`, Service-Worker-Quellen und generierten Runtime-Dateien.
- Service-Worker Cache auf `nexowatt-cache-v305` erhöht.
- EOS/HEMS-Lizenzmodell und App-Center-Cleanup aus 0.8.3 bleiben unverändert; der Lizenzgenerator bleibt weiterhin separat vom Adapter-Repository.

## 0.8.3 - EOS/HEMS-Lizenzmodell und App-Center-Cleanup

- Sichtbare TypeScript-Migrations-/Shadow-Diagnosen aus dem App-Center entfernt; TypeScript bleibt intern weiterhin die kanonische Arbeitsquelle.
- Neues Lizenzmodell mit EOS als Vollprodukt und HEMS als kleiner Edition vorbereitet.
- HEMS enthält Dashboard, Historie, KI-Berater, SmartHome, dynamische Tarife, Lademanagement bis 3 Wallboxen, Speichersteuerung, Klima/Wärmepumpe, Heizstab, Relaissteuerung, §14a und Schwellwertsteuerung.
- EOS erhält Vollzugriff auf HEMS-Funktionen sowie erweiterte Module und künftige Erweiterungen, sofern nicht anders zugeordnet.
- Backend-/API-Gates und App-Center-Filterung für lizenzierte Funktionen ergänzt.

## 0.8.2 - Windows-Publish-Check stabilisiert

- `publish:check` startet jetzt mit einer DevDependency-/TypeScript-Compiler-Vorprüfung.
- Runtime-Typisierungschecks nutzen lokal installiertes TypeScript direkt über `node_modules/typescript/lib/tsc.js`, statt auf `tsc.cmd` im Windows-PATH angewiesen zu sein.
- Fehlende Compiler-Aufrufe zeigen jetzt echte Spawn-/Compilerdiagnosen statt nur einer generischen Meldung.
- App-Center-Farbpolish aus 0.8.1 bleibt erhalten: nicht installierte Apps werden rot markiert.

## 0.8.1 - App-Center Statusfarben und npm-Publish-Fix

- App-Center: Der Status `Installiert = Nein` wird in App-Karten jetzt rot hervorgehoben, damit nicht installierte Module sofort auffallen; `Ja` bleibt grün.
- Die Änderung liegt in der kanonischen TypeScript-Runtime-Quelle `src-ts/runtime-executables/www/ems-apps.ts`; `www/ems-apps.js` bleibt generiertes Runtime-Artefakt.
- `typescript` und die Entwicklungswerkzeuge stehen wieder als echte `devDependencies` in `package.json`, damit `npm install`/`npm ci` auf Windows den lokalen `tsc` für `npm run publish:check` bereitstellen.
- `package-lock.json` wurde auf öffentliche npm-Registry-URLs normalisiert und Version/Manifest/io-package auf `0.8.1` angehoben.
- Service-Worker Cache auf `nexowatt-cache-v302` erhöht und neues Gate `npm run test:app-center-install-colors` ergänzt.

## 0.8.0 - Cockpit-Branding bereinigt und TS-Runtime beibehalten

- Sichtbare Cockpit-Kopfzeilen von `NexoWatt EMS` auf `NexoWatt` umgestellt; der markierte EMS-Zusatz oben links ist aus Live, History, Speicherfarm, Einstellungen und Report-Shells entfernt.
- PWA-/Browser-Branding aktualisiert: Manifest-Version auf `0.8.0`, App-Name auf `NexoWatt` und Startseitentitel auf `NexoWatt UI`.
- Runtime-Regel bleibt unverändert: produktive JavaScript-Dateien sind weiterhin generierte Artefakte aus `src-ts/runtime-executables/**`; der Service Worker wurde in der TypeScript-Quelle auf `nexowatt-cache-v301` erhöht und daraus neu erzeugt.

## 0.7.132 - Legacy-JS-Artefakte nach TypeScript-Handover entfernt

- Entfernt den alten `.nwcore/**`-Doppelbaum samt zugehöriger kanonischer Runtime-Executable-Quelle und TS-Runtime-Spiegeln; die produktive Adapter-Runtime nutzt weiter `ems/**` als generiertes TS-Artefakt.
- Entfernt unbenutzte alte Admin-React-Bundles aus `admin/react/assets`; ausgeliefert bleibt nur das tatsächlich in `admin/react/index.html` referenzierte Bundle.
- Admin-Tab-Quellen unter `src-admin-tab/**` von `.js/.jsx` auf `.ts/.tsx` umgestellt; der Browser bekommt weiterhin das gebaute JS-Bundle.
- Neuer Cleanup-Gate `npm run test:runtime-js-cleanup` stellt sicher, dass `.nwcore` nicht zurückkommt und produktive Runtime-JS-Dateien als generierte TypeScript-Artefakte markiert bleiben.
- Service-Worker Cache auf `nexowatt-cache-v300` erhöht.

## 0.7.131 - Adapter-Runtime auf kanonische TypeScript-Quelle umgestellt

- Neue kanonische Runtime-Quelle: `src-ts/runtime-executables/**` erzeugt die produktiven JavaScript-Artefakte für `main.js`, `ems/**`, `.nwcore/**` und `www/**`.
- Die ausgelieferten Runtime-JS-Dateien sind als generierte Dateien markiert; fachliche Änderungen erfolgen ab diesem Schritt in TypeScript und werden per `npm run sync:ts-runtime-executables` nach JavaScript gebaut.
- EVCS bleibt im Normalpfad TypeScript-geführt: Control, Budget-Caps, Allocation und Write-Plan kommen aus den TS-Helfern; JS ist weiterhin nur die Node/ioBroker-Ausführungsgrenze, Executor und Hard-Fallback.
- Neue Checks: `npm run check:ts-runtime-executables`, `npm run test:runtime-executables` und `npm run test:ts-runtime-executables`; `publish:check` prüft den neuen Runtime-Quellen-Lock.
- Service-Worker Cache auf `nexowatt-cache-v299` erhöht.

## 0.7.130 - EVCS TS-Normalquelle und JS-Hard-Fallback-Lockdown

- EVCS Allocation: neuer Vertrag `buildChargingAllocationNormalSource(...)`; TypeScript ist im normalen Runtime-Tick die fachliche Allocation-Quelle.
- Der bisherige JS/TS-Allocation-Vergleich bleibt als Diagnose sichtbar, blockiert die TS-Normalquelle aber nicht mehr allein wegen `ts-js-allocation-mismatch`.
- Runtime-Handover: Write-Plan nutzt bevorzugt die TS-Normalquelle; JavaScript bleibt ioBroker-Executor und nur noch harter Fallback für Runtime-/Safety-Blocker.
- Neue Diagnose-States: `tsAllocationNormalSourceJson`, `tsNormalSourceLockdownJson`, `tsNormalSourceJson` und `tsNormalSource`.
- App-Center und `/api/state` zeigen EVCS-Allocation-Normalquelle und Normalquellen-Lockdown.
- Neuer Check `npm run test:charging-normal-source-lockdown`; `test:charging-productive-hardening` und `publish:check` prüfen den neuen Gate mit.
- Service-Worker Cache auf `nexowatt-cache-v298` erhöht.

## 0.7.129 - EVCS TS Runtime-Hotfix für Budget-Handover

- EVCS Charging-Management: `gridImportW` tick-weit deklariert, damit Safety-/Control-TS-Handover keine Runtime-ReferenceError mehr auslösen.
- EVCS Budget-Caps: produktiver TS-Handover startet aus dem bereits aufgelösten `effectiveBudgetMode`, damit `engine:pvSurplus+gridImport` nicht auf `engine` zurückfällt.
- Test erweitert: Runtime-Regression für den gemeldeten `effectiveBudgetMode`-Mismatch und den `gridImportW`-Scope-Fehler.

## 0.7.128 - EVCS Safety-Handover über TypeScript gehärtet

- Stale-Meter-Failsafe und Peak-Shaving-Rampdown können den produktiven TS-Allocation- und TS-Write-Plan-Vertrag jetzt als sicheren 0-Setpoint-Handover nutzen.
- `safetyStop`/`safetyReason` ergänzt: TypeScript erzwingt bei Safety-Stop 0 W / 0 A und erlaubt diesen sicheren Stop auch bei stale meter/budget, ohne normale Stale-Blocker zu entschärfen.
- JS bleibt im EVCS-Pfad weiterhin ioBroker-Executor und harter Fallback; der alte JS-only-Safety-Stop-Write-Plan ist als entfernt markiert.
- Legacy-Diagnose auf `ts-charging-legacy-js-decision-tree-reduction-v3` erweitert und App-Center-Karte `TS‑Härtung: EVCS Safety‑Handover` ergänzt.
- Neuer Check `npm run test:charging-safety-handover`; `test:charging-productive-hardening` und `publish:check` prüfen diesen Gate jetzt mit.
- Service-Worker Cache auf `nexowatt-cache-v296` erhöht.

## 0.7.127 - EVCS TS-Produktivpfad gehärtet

- EVCS JS-Executor nutzt im TS-Normalpfad jetzt explizit die vom TypeScript-Write-Plan geplante Basis und den geplanten Setpoint-Datenpunkt.
- Executor-Fehler führen wieder in den Legacy-Fallback statt den Fallbackpfad als erledigt zu markieren.
- Write-Plan-Sicherheitsvertrag um TS-Basis-/Setpoint-Key- und Executor-Fallback-Garantien erweitert.
- EVCS-Tests für produktive Allocation, produktiven Write-Plan und JS-Executor/Fallback entsprechend verschärft.
- Direkte JS-Setpoint-Schreibstellen in Stale-Meter-Failsafe und Peak-Shaving-Rampdown laufen jetzt ebenfalls über den zentralen Executor/Fallback-Pfad.
- Stale-Meter-Failsafe und Peak-Shaving-Rampdown publizieren jetzt ebenfalls TS-Allocation-/Write-Plan-Diagnose statt leerer Legacy-Diagnose.

## 0.7.126 - EVCS Allocation produktiv, Write-Plan produktiv, JS nur Executor/Fallback

- EVCS-/Wallbox-Allocation erhält `buildChargingAllocationProductive` und liefert den produktiven TS-Apply-Vertrag.
- Neuer Diagnose-State `chargingManagement.control.tsAllocationProductiveJson`; `tsAllocationSource` zeigt `ts-allocation` bei sauberer Übernahme.
- EVCS-Setpoint-Write-Plan erhält `buildChargingSetpointWritePlanProductive` als produktiven Vertrag für den JavaScript/ioBroker-Executor.
- Neue Diagnose-States `tsWritePlanProductivePrepJson`, `tsWritePlanProductiveJson`, `tsWritePlanExecutorJson` und `tsLegacyDecisionTreeJson`; `tsWritePlanSource` zeigt `ts-write-plan` bei produktiver Ausführung.
- Der normale Setpoint-Schreibpfad ist deferiert: JS berechnet weiterhin eine Fallback-Referenz, schreibt aber im Normalfall erst nach Freigabe des TS-Write-Plans.
- JS-Allocation/Setpoint-Schreiben bleibt als harter Fallback bei TS-Mismatch, stale meter/budget, fehlendem Mirror oder Runtimefehler aktiv.
- App-Center und `/api/state` zeigen die produktiven EVCS-Allocation- und Write-Plan-Diagnosen.
- Neue Checks `test:charging-allocation-productive`, `test:charging-write-plan-productive` und `test:charging-js-executor-fallback`.
- Service-Worker Cache auf `nexowatt-cache-v294` erhöht.

## 0.7.125 - EVCS TypeScript-Beschleunigung: Control produktiv, Allocation/Write-Plan vorbereitet

- EVCS-/Charging-Control übernimmt Control-/Summary-Werte produktiv über `buildChargingControlProductive` mit JS-Fallback.
- Neuer Diagnose-State `chargingManagement.control.tsControlProductiveJson`; `tsControlSource` zeigt jetzt `ts-control` bei sauberer Übernahme.
- Neue TypeScript-Quelle `charging-allocation.ts` für Wallbox-Zielverteilung als Shadow und Produktiv-Vorbereitung.
- Neue Diagnose-States `tsAllocationShadowJson`, `tsAllocationProductivePrepJson` und `tsAllocationSource`.
- Neue TypeScript-Quelle `charging-write-plan.ts` für Setpoint-Write-Plan-Shadow ohne ioBroker-I/O.
- Neue Diagnose-States `tsWritePlanShadowJson` und `tsWritePlanSource`.
- App-Center zeigt EVCS Control produktiv, EVCS Allocation-Prep und EVCS Write-Plan-Shadow als eigene Karten.
- Ladepunktverteilung und Setpoint-Schreiben bleiben produktiv JavaScript, aber die nächsten Abbau-Gates sind jetzt in einem Schritt vorbereitet.
- Neue Checks `test:charging-control-productive`, `test:charging-allocation-shadow`, `test:charging-allocation-productive-prep` und `test:charging-write-plan-shadow`.
- Service-Worker Cache auf `nexowatt-cache-v293` erhöht.

## 0.7.124 - EVCS / Charging-Management Control-Shadow produktiv vorbereiten

- EVCS-/Charging-Control-Shadow erhält mit `buildChargingControlProductivePrep` einen geprüften Produktiv-Kandidaten für Control-/Summary-Werte.
- Neue Diagnose-States `chargingManagement.control.tsControlProductivePrepJson` und `chargingManagement.control.tsControlSource`.
- Diagnose-API und App-Center zeigen EVCS-Control-Prep sowie EVCS-Budget-Caps als eigene TS-Karten.
- Ladepunktverteilung, Failsafe, Boost, PV-/Min+PV-Logik und Setpoint-Schreiben bleiben weiterhin JavaScript.
- JS-Fallback bleibt bei Mismatch, fehlendem TS-Spiegel, Runtimefehlern oder harten Control-Blockern aktiv.
- Neuer Check `npm run test:charging-control-productive-prep`.
- Service-Worker Cache auf `nexowatt-cache-v292` erhöht.

## 0.7.123 - EVCS Budget-Caps produktiv auf TypeScript

- EVCS-/Charging-Management Budget-Caps werden jetzt produktiv über `buildChargingBudgetSafetyCapsProductive` übernommen, wenn JS/TS-Vergleich sauber ist.
- Übernommen werden Grid-Cap, Phasen-Cap, §14a-Cap und effektiver Budgetmodus.
- Ladepunktverteilung, PV-/Min+PV-Logik und Setpoint-Schreiben bleiben weiterhin JavaScript.
- JS-Fallback bleibt bei Mismatch, fehlendem TS-Spiegel oder Runtimefehler aktiv.
- Neuer Check `npm run test:charging-budget-productive`.
- Service-Worker Cache auf `nexowatt-cache-v291` erhöht.

## 0.7.122 - EVCS / Charging-Management TS produktiv vorbereiten

- TypeScript-Helfer `src-ts/ems/charging-management/charging-budget.ts` für EVCS-Sicherheitscaps vorbereitet.
- Shadow-Vergleich für Grid-Cap, Phasen-Cap, §14a-Cap und Budgetmodus in `charging-management.js` ergänzt.
- Neue Diagnose-States `chargingManagement.control.tsBudgetJson` und `chargingManagement.control.tsBudgetSource`.
- Ladepunktverteilung bleibt produktiv JavaScript; TypeScript rechnet nur parallel als Vorbereitung.
- Service-Worker Cache auf `nexowatt-cache-v290` erhöht.

## 0.7.121 - Core-Limits Restgates produktiv auf TypeScript übernommen

- Forecast-, Tarif-/Negativpreis-, Peak-/Grid- und §14a-/EVCS-High-Level-Gates werden bei sauberem JS/TS-Vergleich produktiv aus dem TypeScript-Helfer übernommen.
- `buildCoreRestGatesProductive` ergänzt und nach `lib/ts-mirrors/ems/core-limits/core-budget.js` gespiegelt.
- `core-limits.js` baut den Budget-Snapshot nach erfolgreicher Restgate-TS-Übernahme neu auf, damit Grid-/EVCS-High-Level-Caps in remainingTotalW und Consumer-Reservierungen wirken.
- `ems.budget.tsRestGatesJson` zeigt jetzt produktiv/Fallback-Status statt nur Shadow-Status.
- JS bleibt Fallback bei TS-Fehlern oder Restgate-Mismatches.
- Service-Worker Cache auf `nexowatt-cache-v289` erhöht.

## 0.7.120 - Core-Limits Restgates als TypeScript-Shadow vorbereitet

- Forecast-, Tarif-/Negativpreis-, Peak-/Netz- und §14a-Gates als TypeScript-Helfer in `src-ts/ems/core-limits/core-budget.ts` vorbereitet.
- `ems/modules/core-limits.js` schreibt jetzt `ems.budget.tsRestGatesJson` als Shadow-Vergleich.
- Die Restgates bleiben in 0.7.120 produktiv weiterhin JavaScript; TypeScript rechnet nur parallel.
- Diagnose-API liefert `emsBudgetTsRestGatesJson` für App-Center/Debug.
- Neuer Check `npm run test:core-limits-rest-gates`.
- Service-Worker Cache auf `nexowatt-cache-v288` erhöht.

## 0.7.119 - Heizstab alte JS-Referenz aus Normaldiagnose entfernen

- Alte Heizstab-JS-Referenz wird bei stabilem TS-Normalpfad aus der normalen Diagnose entfernt.
- Neuer State `heatingRod.summary.tsLegacyNormalDiagnosticsJson` zeigt den finalen Normaldiagnose-Cleanup.
- `legacyJsReferenceJson` und `debugJson.legacyReference` bevorzugen jetzt die kompakte Debug-/Notfallbrücke statt des vollständigen JS-Referenzpayloads.
- App-Center zeigt `JS-Normaldiagnose` und `JS-Normaldiagnose entfernt`.
- Keine neue Heizstab-Schaltlogik; TS bleibt Normalpfad, JS bleibt harte Notfallbrücke.
- Service-Worker Cache auf `nexowatt-cache-v287` erhöht.

## 0.7.118 - Heizstab Cleanup abgeschlossen / JS-Referenz als Entfernungs-Kandidat markiert

- Neuer Diagnose-State `heatingRod.summary.tsLegacyRemovalCandidateJson`.
- Alter JS-Heizstabpfad wird bei stabilem TS-Normalpfad als konkreter Entfernungs-Kandidat markiert.
- Entfernbar markiert: normale JS-Referenz-Entscheidungsbremse, volle JS-Referenzpayloads im Normalpfad und doppelte Blocking-Mismatch-Listen.
- Erhalten bleibt: harte Sicherheitsnotbremse, Runtime-Error-Fallback, kompakte Debug-Brücke und manuelle/externe Sicherheitswächter.
- App-Center zeigt jetzt `JS-Entfernungskandidat` und `JS-Entfernungsphase`.
- Keine neue Heizstab-Schaltlogik; TS bleibt Normalpfad, JS bleibt Notfallback/Debug-Brücke.

## 0.7.117 - Heizstab Legacy-JS-Referenzdetails weiter bereinigt

- Neuer Diagnose-State `heatingRod.summary.tsLegacyPrunedJson` ergänzt.
- Doppelte JS-Referenzdetails werden bei stabilem TS-Normalpfad weiter aus dem normalen Diagnosepfad entfernt.
- `legacyJsReferenceJson` zeigt bei bereinigtem Zustand jetzt den kompakten Pruned-Status statt großer JS-Referenzlisten.
- App-Center zeigt neue Zeilen für JS-Referenzdetails und reduzierte JS-Diagnosedaten.
- Keine neue Heizstab-Schaltlogik; TS bleibt Normalpfad, JS bleibt Notfallback/Debug-Brücke.
- Service-Worker Cache auf `nexowatt-cache-v285` erhöht.

## 0.7.116 - Heizstab Legacy-JS nur noch als Debug-Brücke

- Neuer Diagnose-State `heatingRod.summary.tsLegacyDebugBridgeJson` ergänzt.
- Alter JS-Heizstab-Referenzpfad wird nach stabilem TS-Normalpfad als kompakte Debug-Brücke markiert.
- Vollständige JS-Referenzlisten werden im Normalpfad weiter reduziert; kompakte Samples/Zähler bleiben erhalten.
- App-Center zeigt jetzt `JS-Debug-Brücke` und `JS-Debugdaten`.
- Keine neue Heizstab-Stufenlogik; TS bleibt Normalpfad, JS bleibt Notfallback/Debug-Brücke.

## 0.7.115 - Heizstab JS-Referenzpfad als Removal-Plan vorbereitet
- Service-Worker Cache auf `nexowatt-cache-v283` erhöht.

- Alter Heizstab-JS-Referenzpfad erhält neuen Diagnose-State `heatingRod.summary.tsLegacyRemovalPlanJson`.
- Kompakte JS-Referenzdiagnose ergänzt: bei stabilem TS-Normalpfad werden vollständige Mismatch-Listen aus dem normalen Diagnosepfad genommen und nur noch Zähler + kleine Probe gespeichert.
- TS-Normalpfad bleibt führend; JS wird weiter in Richtung Notfallback/Debug-Brücke verschoben.
- Removal-Plan trennt `removableParts` und `keepParts`, damit später klar ist, was entfernt werden darf und welche Notfallbacks bleiben müssen.
- App-Center zeigt zusätzliche Zeilen `JS-Entfernung`, `JS-Diagnosedaten` und `JS-Cleanup-Kandidat`.
- Alte JS-Referenzdiagnose wird im stabilen TS-Normalpfad auf Zähler und kleine Samples kompaktiert.
- Keine neue Heizstab-Stufenlogik; keine EMS-/Frontend-/API-Fachlogik geändert.

## 0.7.114 - Installations-Hotfix: Runtime-Paket verschlankt

- Installierbares npm/GitHub-Paket verschlankt, damit ioBroker-Installationen auf kleinen Hosts weniger Speicher benötigen.
- `devDependencies` aus der Runtime-Installation entfernt und als `xDevDependenciesForDevelopmentOnly` dokumentiert.
- `files` in `package.json` auf echte Runtime-Dateien reduziert: `admin`, `www`, `main.js`, `io-package.json`, `ems`, `lib`, README und Lizenz.
- Keine produktive EMS-/Heizstab-/Energiefluss-/Frontend-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v282` erhöht.

## 0.7.113 - Heizstab JS-Referenzpfad in Diagnose/Cleanup verschoben

- Neuen Diagnose-State `heatingRod.summary.tsLegacyReferenceJson` ergänzt.
- Neuen Cleanup-State `heatingRod.summary.tsLegacyCleanupJson` ergänzt.
- Alter JavaScript-Heizstab-Referenzpfad wird bei stabilem TS-Normalpfad klar als Diagnose-/Cleanup-Pfad geführt.
- App-Center zeigt jetzt `JS-Referenz Cleanup` und `JS-Entscheidungseinfluss`.
- JS bleibt als harte Notbremse für Safety-Fälle erhalten, aber die alte Referenzentscheidung wird weiter aus dem normalen Entscheidungsweg genommen.
- Keine neue Heizstab-Stufenlogik; Fokus liegt auf Diagnose/Cleanup des alten JS-Referenzpfads.

## 0.7.112 - Heizstab JS-Pfad auf Notfallback begrenzt

- Der alte Heizstab-JS-Pfad wird im stabilen TS-Normalpfad nur noch als Notfallback bei harten Sicherheitsblockern genutzt.
- JS/TS-Referenzabweichungen im TS-Normalpfad werden als `referenceMismatches` dokumentiert und blockieren die TS-Zielstufe nicht mehr.
- Neue Diagnosefelder: `legacyJsPathRole`, `jsReferenceDecisionMode`, `jsFallbackMode`, `jsFallbackLimitedToHardBlockers`, `jsPathReductionStage`.
- App-Center zeigt JS-Fallback-Modus, JS-Pfad-Rolle und JS-Referenzmodus in der Heizstab-TS-Runtime-Auswertung.
- JavaScript bleibt Notfallback bei fehlendem TS-Spiegel, Runtimefehlern und Speicher-/PV-Schutzblockern.

## 0.7.111 - Heizstab TS-Normalpfad übernimmt JS-Referenz

- Heizstab-TS kann nach stabilem Normalpfad-Status die alte JS-Referenz als Normalquelle übernehmen.
- JS-Fallback bleibt bei harten Sicherheitsblockern aktiv: fehlender TS-Spiegel, Runtimefehler, Speicher-/PV-Schutzblocker.
- JS/TS-Referenzabweichungen werden im stabilen Normalpfad weiter diagnostiziert, blockieren aber nicht mehr automatisch den TS-Pfad.
- Neue Diagnosefelder: `jsReferenceReducedCount`, `hardSafetyBlockCount`, `normalPathTakenOver`, `jsFallbackMode`.
- Doppelte `label: Heizstab`-Zeile in der Budgetreservierung bereinigt.
- Keine neue Heizstab-Stufenlogik; nur Normalpfad-Übernahme und Notfallback-Reduktion.

## 0.7.110 - Heizstab TS-Normalpfad vorbereiten

- Heizstab-TS erhält jetzt einen Normalpfad-Status (`ts-heating-rod-normal`), wenn mehrere echte Runtime-Ticks stabil über TS liefen.
- Neuer Diagnose-State `heatingRod.summary.tsNormalSourceJson` ergänzt.
- `heatingRod.summary.source` kann jetzt `js-runtime`, `ts-heating-rod` oder `ts-heating-rod-normal` zeigen.
- App-Center zeigt jetzt `TS NORMAL`, `TS-Normalpfad` und `TS-Normal Ticks` in der Heizstab-Runtime-Auswertung.
- JavaScript bleibt Notfallback bei harten Blockern wie fehlendem TS-Spiegel, Runtimefehler oder JS/TS-Mismatch.
- Keine Änderungen an Core-Limits, Energiefluss, KI, History oder SmartHome.

## 0.7.109 - Heizstab TS Runtime-Auswertung und Fallback-Diagnose

- Heizstab-TS-Produktivpfad sammelt jetzt In-Memory-Samples aus echten Adapter-Ticks.
- Neuer State `heatingRod.summary.tsRuntimeEvaluationJson` mit SampleCount, OK-Quote, Fallbacks, Mismatches und nächster Handlung.
- Diagnose-API liest `heatingRodTsRuntimeEvaluationJson`.
- App-Center zeigt neue Karte „Heizstab TS-Runtime-Auswertung“.
- Keine neue produktive Schaltlogik; die Version beobachtet TS-Nutzung und Fallbacks, damit der alte JS-Pfad später kontrolliert reduziert werden kann.

## 0.7.108 - Heizstab TypeScript produktiv aktiviert

- Heizstab-PV-Auto-Zielstufen können jetzt produktiv aus dem TypeScript-Entscheidungsspiegel übernommen werden.
- TS wird nur aktiv, wenn die TS-Entscheidung mit der bestehenden JS-Referenz übereinstimmt. Bei Abweichung bleibt JavaScript Fallback.
- Neue Diagnose-States: `heatingRod.summary.source` und `heatingRod.summary.tsProductiveJson`.
- Diagnose-API liest `heatingRodTsProductiveJson` und `heatingRodSource`.
- Neuer Check `npm run test:heating-rod-productive` ergänzt.
- Keine Änderung an EVCS, Core-Limits, History, SmartHome, Lizenz oder Frontend-Design.

## 0.7.107 - Core-Limits Consumer-Reservierungen produktiv über TS

- `makeBudgetRuntime.reserve` nutzt den TypeScript-Helfer `computeCoreBudgetReservation` jetzt produktiv.
- Die alte JavaScript-Rechnung bleibt als Referenz-/Fallbackpfad erhalten und wird bei TS-Fehlern oder JS/TS-Abweichungen genutzt.
- `remainingTotalW`, `remainingPvW`, `consumers`, `order`, `consumersJson` und `flexUsedW` werden bei sauberem TS-Vergleich aus dem TS-Ergebnis übernommen.
- `ems.budget.tsReservationJson` zeigt jetzt produktive TS-Nutzung, Fallback und Fallback-Grund.
- Neuer Check `npm run test:core-limits-reservations-productive` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v275` erhöht.

## 0.7.106 - Core-Limits Consumer-Reservierungen als TS-Shadow vorbereitet

- TypeScript-Helfer `computeCoreBudgetReservation`, `buildCoreBudgetConsumersList` und `calculateCoreBudgetFlexUsedW` ergänzt.
- `makeBudgetRuntime.reserve` berechnet die bestehende JS-Reservierung weiter produktiv, vergleicht sie aber parallel mit dem TS-Helfer.
- Neuer Diagnose-State `ems.budget.tsReservationJson` für Grant, usedW, pvUsedW, remainingTotalW und remainingPvW.
- App-Center-Diagnose liest `emsBudgetTsReservationJson`.
- Neue Doku: `docs/TYPESCRIPT_STEP_07106_DE.md`.
- Keine produktive Übernahme der Consumer-Reservierung; dieser Schritt bereitet die nächste TS-Übernahme kontrolliert vor.

## 0.7.105 - Core-Limits TypeScript produktiv aktiviert

- Core-Limits nutzt den TypeScript-Core-Budget-Spiegel produktiv für zentrale Budget-Gates: PV-Budget, Grid-Headroom und Gesamtbudget.
- JavaScript bleibt Fallback, wenn TS-Spiegel fehlt, Shadow-Abgleich abweicht oder TS-Gates unvollständig sind.
- Neue Diagnose-States: `ems.budget.source` und `ems.budget.tsProductiveJson`.
- `makeBudgetRuntime` arbeitet nach erfolgreichem Shadow-OK mit dem TS-geprägten BudgetSnapshot.
- Forecast-, Tarif-, Consumer- und Raw-Felder bleiben weiterhin aus der bestehenden JS-Runtime.
- Neuer Check `npm run test:core-limits-productive`.

## 0.7.104 - Energiefluss TS als Normalquelle vorbereitet

- Energiefluss veröffentlicht nach stabiler Fixed-Source-Phase jetzt `energyFlowSource = ts-normal`.
- `tsProductiveActive` erkennt jetzt sowohl `ts-candidate` als auch `ts-normal`.
- JS-Fallback bleibt als Notfallback bei harten Blockern erhalten, wird aber nicht mehr als normaler Betriebsmodus behandelt, sobald TS stabil ist.
- App-Center zeigt `TS NORMAL` und `TS-Normalquelle` im Energiefluss-Aktivtest.
- Neuer tiefer Code-Scan `verify-energy-flow-deep-debug-scan.js` prüft bekannte Fallback-/Source-Regressionsstellen.
- Keine Änderungen an Core-Limits, Heizstab, KI, History oder SmartHome.

## 0.7.103 - Energiefluss TS als feste Quelle vorbereiten

- Energiefluss-TS sammelt jetzt einen Fixed-Source-Status über echte produktive TS-Ticks.
- Neuer State `derived.core.building.tsFixedSourceJson` ergänzt.
- App-Center zeigt „Feste TS-Quelle“ und TS-Fixed-Ticks im Energiefluss-TS-Aktivtest.
- Weiche Warmup-Fallbacks werden reduziert, sobald TS stabil genug lief.
- Harte Blocker wie Shadow-Mismatch, fehlender Spiegel oder ungültige Kandidatenwerte behalten den JS-Fallback aktiv.
- Keine Änderungen an Core-Limits, Heizstab, KI, History oder SmartHome.

## 0.7.102 - Energiefluss TS-Fallback reduziert

- Energiefluss-TS bleibt jetzt aktiv, wenn die reale Anlagen-Auswertung nur wegen fehlender Sample-Anzahl oder OK-Folge noch im Warmup ist.
- Harte Blocker wie Shadow-Mismatches, Kandidatenfehler oder echte Anlagen-Blocker erzwingen weiterhin JS-Fallback.
- Neues Diagnoseflag `plantEvaluationSoftReleased` zeigt, wenn die Anlagen-Auswertung nur weich freigegeben wurde.
- Neuer Check `npm run test:energy-flow-fallback-reduction` ergänzt.
- Keine Änderungen an Core-Limits, Heizstab, KI, History oder SmartHome.

## 0.7.101 - Energiefluss TypeScript produktiv aktivieren

- Energiefluss-TS-Kandidat ist jetzt standardmäßig aktiviert und produktiv freigegeben, bleibt aber durch Shadow-Vergleich, Kandidatenprüfung, Warmup und reale Anlagen-Auswertung abgesichert.
- Wenn ein Gate blockiert, bleibt automatisch die bisherige JavaScript-Runtime produktiv.
- App-Center zeigt TS als neuen Energiefluss-Standardmodus und erlaubt weiterhin Rückschaltung auf JS oder Shadow.
- Neuer Check `test:energy-flow-ts-productive` verhindert, dass die produktive TS-Aktivierung ohne Sicherheitsgates ausgeliefert wird.
- Service-Worker Cache auf `nexowatt-cache-v269` erhöht.

## 0.7.100 - /api/state und /api/set produktiv über TypeScript-Helfer

- `/api/state` nutzt jetzt produktiv den TypeScript-State-Builder mit JS-Fallback. Die externe Antwortform bleibt kompatibel.
- `/api/set` nutzt für bekannte lokale `settings.*`-Werte produktiv den TypeScript-Schreibplan; komplexe Scopes bleiben in der bisherigen JS-Route.
- Kritische Werte wie `0`, `false` und leere Strings werden in den TS-Helfern explizit erhalten.
- `weatherApiKey` bleibt explizit String, damit API-Schlüssel nicht als Zahl/Boolean normalisiert werden.
- Neue Prüfung `npm run test:main-api-productive` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v268` erhöht.

## 0.7.99 - /api/state und /api/set TS-Shadow-Vorbereitung

- `/api/state` bleibt produktiv unverändert, läuft aber zusätzlich durch einen TypeScript-Shadow-Vergleich.
- `/api/set` bleibt produktiv unverändert, erstellt aber zusätzlich einen TypeScript-Schreibplan ohne State-Schreibzugriff.
- Neue TS-Helfer in `src-ts/backend/main-runtime/main-runtime-helpers.ts` für API-State-Zusammenfassung und API-Set-Schreibplan ergänzt.
- Neue Prüfung `npm run test:api-state-set-shadow` ergänzt.
- Wichtig: 0, false und leere Strings bleiben in der Shadow-Logik gültige Werte.

## 0.7.98 - erste main.js-TypeScript-Helfer produktiv mit Fallback

- Neuer TypeScript-Helfer `src-ts/backend/main-runtime/main-runtime-helpers.ts` ergänzt.
- Neuer generierter CommonJS-Spiegel `lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js`.
- `main.js` nutzt den TS-Helfer erstmals kontrolliert produktiv für Lizenz-Platzhalterprüfung, Lizenz-Eingabe-Normalisierung und `info.connection`-Schreibplan.
- Alle Nutzungen haben Fallback auf die bisherige JavaScript-Logik, damit der Adapter bei fehlendem/defektem Spiegel lauffähig bleibt.
- Neue Prüfung `npm run test:main-runtime-helpers` ergänzt.
- Keine Änderung an Energiefluss, Speicher-DP-Runtime, Core-Limits, Heizstab, KI-Berater, History oder SmartHome.

## 0.7.97 - main.ts Runtime-Typisierung vorbereitet

- Adapter-Haupteinstieg `src-ts/runtime-mirrors/main.ts` gezielt typisiert.
- Erste TypeScript-Verträge für StateCache, `/api/state`, `/config`, `/api/set`, Lizenz, SSE, Webserver, `info.connection`, TS-Energiefluss-Schaltentscheidung und Runtime-Internals ergänzt.
- Neuer Check `npm run test:main-runtime-typing` kompiliert den Main-Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `main.ts` vor versehentlichem Überschreiben.
- Keine produktive Runtime-Umschaltung; `main.js` bleibt weiterhin führend.

# 0.7.96 - Kunden-LIVE-App gezielt typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/app.ts` um konkrete Verträge für Kunden-LIVE-Dashboard, Energiefluss-Anzeige, KPI-Karten, Wetter, KI-Berater, Schnellkacheln, Modals, Feature-Sichtbarkeit und API-State erweitert.
- Neuer Check `npm run test:app-runtime-typing` kompiliert den App-Vertragsbereich temporär ohne `@ts-nocheck`.
- Runtime-Mirror-Sync schützt `www/app.ts` jetzt vor blindem Überschreiben.
- Keine produktive Runtime-Logik geändert; `www/app.js` bleibt weiterhin führend.
- Service-Worker Cache auf `nexowatt-cache-v264` erhöht.

## 0.7.96 - Kunden-LIVE-Frontend Runtime-Typisierung

- `src-ts/runtime-mirrors/www/app.ts` gezielt typisiert.
- Erste Verträge für API-State, Konfiguration, Feature-Sichtbarkeit, Energiefluss-Anzeige, Dashboard-Wertezeilen, KI-/Wetterkarten, Schreibbefehle, Modals und Runtime-State ergänzt.
- Neuer Check `npm run test:app-runtime-typing` kompiliert den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `app.ts` jetzt vor blindem Überschreiben.
- Keine produktive LIVE-/Dashboard-Runtime auf TypeScript umgestellt; `www/app.js` bleibt führend.
- Service-Worker Cache auf `nexowatt-cache-v264` erhöht.

# 0.7.96 - App Runtime-Typisierung vorbereitet

- `src-ts/runtime-mirrors/www/app.ts` gezielt typisiert.
- Verträge für LIVE-Dashboard, Energiefluss-Anzeige, KPI, Wetter, KI-Berater, Modals, Schnellsteuerungen und `/api/state` ergänzt.
- Neuer Check `npm run test:app-runtime-typing` prüft den Vertragsbereich ohne `@ts-nocheck`.
- Runtime bleibt weiterhin `www/app.js`; keine produktive Funktionslogik geändert.
- Service-Worker Cache auf `nexowatt-cache-v264` erhöht.

## 0.7.96 - LIVE-Dashboard Runtime-Spiegel typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/app.ts` gezielt typisiert.
- Erste Verträge für `/api/state`, `/config`, Feature-Sichtbarkeit, Energiefluss-Anzeige, KPI, Wetter, KI-Berater und DOM-Referenzen ergänzt.
- Neuer Check `npm run test:app-runtime-typing` prüft den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `app.ts` jetzt vor blindem Überschreiben.
- Keine produktive Runtime-Änderung an `www/app.js`.

## 0.7.95 - App-Center Runtime-Typisierung

- `src-ts/runtime-mirrors/www/ems-apps.ts` gezielt typisiert.
- Erste Verträge für Installer-Konfiguration, Datenpunkt-Mapping, App-Registry, Energiefluss-Konfiguration, Heizstab, EVCS, Speicherfarm, KI-Berater, TS-Schaltmodus und Shadow-Diagnose ergänzt.
- Neuer Check `npm run test:ems-apps-runtime-typing` kompiliert den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `ems-apps.ts` jetzt vor blindem Überschreiben.
- Keine produktive App-Center-/Installer-Runtime auf TypeScript umgestellt; `www/ems-apps.js` bleibt führend.
- Service-Worker Cache auf `nexowatt-cache-v263` erhöht.

## 0.7.94 - SmartHome-Config Runtime-Typisierung

- `src-ts/runtime-mirrors/www/smarthome-config.ts` gezielt mit ersten TypeScript-Verträgen für Installer-Konfiguration typisiert.
- Verträge für Gebäude, Etagen, Räume, Geräte, Funktionen, Pages, Szenen, DP-Zuordnung, Validator und Runtime-State ergänzt.
- `npm run test:smarthome-config-runtime-typing` als gezielter Check ohne `@ts-nocheck` ergänzt.
- Runtime-Mirror-Sync schützt jetzt auch `smarthome-config.ts` vor blindem Überschreiben.
- Keine produktive SmartHome-/Installer-Runtime umgestellt; produktiv bleibt `www/smarthome-config.js`.

# 0.7.94 - SmartHome-Konfiguration Runtime-Typisierung

- `src-ts/runtime-mirrors/www/smarthome-config.ts` gezielt typisiert.
- Erste Datenverträge für Gebäude, Etagen, Räume, Funktionen, Geräte, Szenen, Seiten, Timer, Logik-Uhren, Auto-Erkennung und Validierung ergänzt.
- Temporären TypeScript-Check ohne `@ts-nocheck` für den SmartHome-Config-Vertragsbereich ergänzt.
- Runtime-Spiegel-Sync schützt `smarthome-config.ts` jetzt vor versehentlichem Überschreiben.
- Keine produktive SmartHome-/Installer-Runtime auf TypeScript umgestellt; `www/smarthome-config.js` bleibt führend.
- Service-Worker Cache auf `nexowatt-cache-v262` erhöht.

## 0.7.94 - SmartHome-Konfiguration gezielt typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/smarthome-config.ts` gezielt typisiert.
- Verträge für SmartHome-Installer-Konfiguration ergänzt: Gebäude, Etagen, Räume, Geräte, Funktionen, Seiten, Szenen, Timer, Logik-Uhren, Auto-Erkennung und API-Antworten.
- Neuer Check `npm run test:smarthome-config-runtime-typing` prüft den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `smarthome-config.ts` nun vor versehentlichem Überschreiben.
- Keine produktive Runtime-Änderung; `www/smarthome-config.js` bleibt führend.

# 0.7.93 - SmartHome Runtime-Spiegel gezielt typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/smarthome.ts` um konkrete SmartHome-Verträge ergänzt.
- Geräte, Zustände, Datenpunktbindungen, Räume, Gebäudestruktur, Kacheln, Popover und API-Antworten typisiert vorbereitet.
- Neuer Check `test:smarthome-runtime-typing` ergänzt; der Vertragsbereich wird ohne `@ts-nocheck` kompiliert.
- `sync:ts-runtime-mirrors` schützt `www/smarthome.js` jetzt vor blindem Überschreiben der gezielten Typisierung.
- Keine produktive Runtime-Änderung.

# 0.7.92 - History Runtime-Typisierung vorbereitet

- Vierte große Runtime-Spiegeldatei gezielt typisiert: `src-ts/runtime-mirrors/www/history.ts`.
- Neue History-Verträge ergänzt: Zeitreihen, API-Antworten, Toolbar-Zustand, Report-Sichtbarkeit und Feature-Sichtbarkeit.
- Kritische History-Regeln direkt dokumentiert: 0 W ist gültig, EVCS/Farm nur bei echter Anlage sichtbar, History darf Energieflusswerte nicht anders interpretieren als LIVE/Backend.
- Neuer Smoke-Test `src-ts/tests/history-runtime-typing-smoke.ts` und Check `npm run test:history-runtime-typing`.
- Runtime-Spiegel-Sync schützt `history.ts` jetzt vor blindem Überschreiben.
- Keine produktive Runtime-Änderung.

# 0.7.91 - KI-Berater Runtime-Spiegel gezielt typisiert

- Dritte große Runtime-Spiegeldatei gezielt typisiert: `src-ts/runtime-mirrors/ems/modules/ai-advisor.ts`.
- Erste TypeScript-Verträge für Adapterzugriff, Datenpunkt-Registry, StateCache, KI-Konfiguration, Kategorien, Vorschläge, Tagesplan, Lernzustand, Snapshot und Speicher-SoC ergänzt.
- `AiAdvisorModule` mit ersten expliziten Feldern und typisiertem Konstruktor vorbereitet.
- `_readStorageSocPct`, `_cfg`, `_updateLearning`, `_buildSuggestions`, `_score`, `_publishDisabled` und `_publish` weiter auf spätere TypeScript-Übernahme vorbereitet.
- Neuer Check `npm run test:ai-advisor-runtime-typing` kompiliert eine temporäre KI-Berater-Kopie ohne `@ts-nocheck` im gelockerten Migrationsmodus.
- `sync:ts-runtime-mirrors` schützt den gezielt typisierten KI-Berater-Spiegel vor versehentlichem Überschreiben.
- Keine produktive KI-/EMS-/Frontend-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v259` erhöht.

# 0.7.90 - Heizstab Runtime-Spiegel gezielt typisiert

- Zweite große Runtime-Spiegeldatei gezielt typisiert: `src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts`.
- Erste echte TypeScript-Verträge für Adapterzugriff, Datenpunkt-Registry, Heizstab-Geräte, Stufensteuerung und Budget-Schutz ergänzt.
- `@ts-nocheck` bleibt im normalen Spiegel erhalten; neuer Check kompiliert eine temporäre Kopie ohne `@ts-nocheck` im gelockerten Migrationsmodus.
- Runtime-Spiegel-Sync schützt jetzt auch den gezielt typisierten Heizstab-Spiegel vor versehentlichem Überschreiben.
- TS-Shadow-Sammlung im produktiven Heizstab-JS lokal initialisiert, damit die Diagnose nicht durch eine fehlende Variable stolpert.
- Service-Worker Cache auf `nexowatt-cache-v258` erhöht.

# 0.7.89 - Core-Limits Runtime-Spiegel gezielt typisiert

- Erster großer gezielter Typisierungsschritt an `src-ts/runtime-mirrors/ems/modules/core-limits.ts`.
- Adapter-, State-, Consumer- und Budget-Snapshot-Verträge direkt in der Core-Limits-Spiegeldatei ergänzt.
- `CoreLimitsModule` mit ersten expliziten TypeScript-Feldern vorbereitet.
- Neuer Check `npm run test:core-limits-runtime-typing` kompiliert eine temporäre Core-Limits-Kopie ohne `@ts-nocheck` im gelockerten Migrationsmodus.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v257` erhöht.

## 0.7.88 - Runtime-JS als parallele TypeScript-Spiegel

- Großer Migrationsschritt gestartet: wichtige JavaScript-Runtime-Dateien werden parallel unter `src-ts/runtime-mirrors/` als TypeScript-Spiegel abgelegt.
- Die Spiegel enthalten deutsche Datei- und Code-Teil-Kommentare und dienen als Grundlage für die spätere echte Typisierung.
- Neue Prüfungen: `sync:ts-runtime-mirrors`, `check:ts-runtime-mirrors`, `test:runtime-mirrors`, `typecheck:runtime-mirrors`.
- Keine produktive Runtime-Logik geändert; Energiefluss, Speicher, Heizstab, KI, History, SmartHome, Lizenz und `info.connection` bleiben unverändert.
- Service-Worker Cache auf `nexowatt-cache-v256` erhöht.

# 0.7.87 - TypeScript-Struktur bereinigt und kanonisiert

- `src-ts/` bereinigt: versehentliches JavaScript-Artefakt unter `src-ts/scripts/` entfernt.
- Doppelte Feature-Sichtbarkeitslogik reduziert: `src-ts/backend/visibility` ist jetzt nur noch Kompatibilitätsadapter und leitet auf die kanonische Implementierung unter `src-ts/backend/feature-visibility` weiter.
- Neuer Strukturcheck `npm run check:ts-canonical` ergänzt, damit keine JS-Artefakte mehr in `src-ts/` landen und alte Pfade keine zweite Fachlogik enthalten.
- Neue Dokumentation `docs/TYPESCRIPT_CLEANUP_STRATEGY_0787_DE.md` ergänzt: erklärt, welche TS-Bausteine dauerhaft bleiben, welche nur Adapter sind und wann überflüssige Bausteine entfernt werden.
- Keine produktive Runtime-Logik geändert.

# 0.7.86 - Energiefluss TS-Aktivtest auf echter Anlage beobachten

- Kontrollierten Energiefluss-TypeScript-Aktivtest ergänzt: Backend protokolliert, ob TS tatsächlich als effektive Quelle genutzt wurde oder ob Sicherheitsgates korrekt auf JS zurückfallen.
- App-Center zeigt neue Karte „Energiefluss TS‑Aktivtest“ mit Samples, TS-/JS-Zählung, letzter Quelle, Grund, Blockern und JSON-Dialog.
- Energiefluss-Debug-JSON enthält `tsActiveTest`, damit reale Anlagenläufe nachvollziehbar bleiben.
- Die vorhandenen Gates bleiben verbindlich: Modus, produktive Freigabe, Shadow-OK, Kandidatenprüfung, Warmup und stabile Anlagen-Auswertung.
- Keine Änderungen an Core-Limits, Heizstab, KI, History, SmartHome, Lizenz oder info.connection.
- Service-Worker Cache auf `nexowatt-cache-v254` erhöht.

# 0.7.85 - Energiefluss TS nur nach stabiler Anlagen-Auswertung

- Energiefluss-TS-Kandidatenmodus zusätzlich durch reale Anlagen-Auswertung abgesichert.
- TS darf Energieflusswerte nur nutzen, wenn Modus `ts`, produktive Freigabe, Shadow-Vergleich, Kandidatenprüfung und stabile Anlagen-Auswertung erfüllt sind.
- App-Center zeigt und speichert neue Sicherheitsoptionen für Anlagen-Samples und OK-Samples in Folge.
- Keine Änderungen an produktiver EMS-/Heizstab-/KI-/History-/SmartHome-Logik außerhalb der Energiefluss-Kandidatenfreigabe.

## 0.7.84 - Shadow-Diagnose echte Anlage auswerten

- Backend sammelt einen kleinen Rolling-Buffer der echten TypeScript-Shadow-Diagnoseabrufe.
- App-Center zeigt neue Karte „Reale Anlagen-Auswertung“ mit Samples, OK-Quote, OK-Ticks in Folge und Blockern.
- JSON-Details zur Anlagen-Auswertung sind dauerhaft im Dialog öffnbar.
- Keine produktive Umschaltung und keine Änderung an Energiefluss, Core-Limits oder Heizstab.

## 0.7.83 - App-Center Shadow-JSON Anzeige stabilisiert

- JSON-Anzeige der TypeScript-Shadow-Diagnose im App-Center auf stabilen Dialog umgestellt, damit die Ansicht bei automatischem Refresh nicht sofort wieder zuklappt.
- Shadow-Karten zeigen jetzt zusätzlich eine verständliche Erklärung, warum OK/Abweichung/Fehler angezeigt wird.
- Keine EMS-/Runtime-Logik geändert; produktive Energiefluss-, Core-Limits- und Heizstabwerte bleiben unverändert.

## 0.7.82 - Energiefluss TS sicherer Kandidatenmodus

- Energiefluss-TS-Kandidatenmodus mit zusätzlicher Kandidatenprüfung ergänzt.
- TS-Werte dürfen nur produktiv genutzt werden, wenn Modus `ts`, produktive Freigabe, Shadow-OK und Kandidatenprüfung OK sind.
- Ungültige, negative, fehlende oder unplausible TS-Kandidatenwerte blockieren automatisch und lassen die JS-Runtime führend.
- App-Center zeigt die Kandidatenprüfung jetzt in der TS-Umschaltbereitschaft an.
- Keine sonstige EMS-/Heizstab-/History-/KI-Runtime geändert.

# 0.7.81 - Energiefluss TS-Schaltmodus im App-Center

- Energiefluss-TypeScript-Modus im App-Center sichtbar gemacht: `js`, `shadow`, `ts`.
- Zusätzliche Sicherheitsfreigabe `energyFlowProductionAllowed` im App-Center steuerbar gemacht.
- App-Center zeigt effektive Quelle, Freigabe, Blocker und TS-Nutzungsstatus aus der Shadow-Readiness.
- `tsMigration` wird jetzt über die Installer-Konfiguration geladen und gespeichert.
- Neue Prüfung `npm run test:energy-flow-mode-ui` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v250` erhöht.

# 0.7.80 - Energiefluss TS-Modus kontrolliert vorbereiten

- Internen Energiefluss-TypeScript-Modus `js/shadow/ts` vorbereitet.
- Standard bleibt `shadow`: JavaScript ist produktiv führend, TypeScript rechnet nur Diagnose.
- `ts` wird nur als Kandidatenmodus markiert und schreibt in dieser Version noch keine produktiven Werte.
- App-Center zeigt Energiefluss-Modus und geplante Quelle in der TS-Umschaltbereitschaft.
- Keine Änderung an Energiefluss-, Speicher-, Core-Limits-, Heizstab-, History- oder KI-Runtime.

# 0.7.79 - TS-Shadow-Diagnose auswerten und Energiefluss-Umschaltung vorbereiten

- Diagnose-API erweitert: `control.tsShadowReadiness` fasst Core-Limits-, Heizstab- und Energiefluss-Shadow-Vergleiche zusammen.
- App-Center zeigt jetzt eine eigene Karte „TS-Umschaltbereitschaft“ mit Status, Blockern und nächster Handlung.
- Keine produktive Umschaltung: JS-Runtime bleibt weiterhin autoritativ.
- Neuer Check `npm run test:shadow-readiness` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v247` erhöht.

## 0.7.78 - TypeScript Shadow-Diagnose im App-Center

- App-Center Statusbereich um sichtbare TypeScript-Shadow-Diagnose erweitert.
- Core-Limits-, Heizstab- und Energiefluss-Shadow-Ergebnisse werden als Karten mit OK/Abweichung/Fehler angezeigt.
- Diagnose-API `/api/ems/charging/diagnostics` liefert die benötigten Shadow-JSON-States an das Frontend.
- Keine produktive Runtime-Logik geändert; JS bleibt weiterhin autoritativ.
- Neuer Check `npm run test:shadow-diagnostics-ui`.
- Service-Worker Cache auf `nexowatt-cache-v246` erhöht.

## 0.7.77 - Core-Limits/Heizstab TypeScript Shadow-Vergleich

- Core-Limits-TS-Spiegel läuft jetzt parallel im Shadow-Modus und schreibt Diagnose nach `ems.budget.tsShadowJson`.
- Heizstab-TS-Spiegel läuft parallel im Shadow-Modus und schreibt Diagnose nach `heatingRod.summary.tsShadowJson`.
- Keine produktive Umschaltung: JavaScript-Runtime bleibt für Budgets und Heizstabentscheidungen autoritativ.
- Neuer Check `npm run test:ems-shadow-runtime` prüft Spiegel-Importe und kritische Fachfälle.
- Service-Worker Cache auf `nexowatt-cache-v245` erhöht.

## 0.7.76 - TypeScript EMS-Mirror für Core-Limits und Heizstab

- Neue TypeScript-zu-JavaScript-Spiegel für `src-ts/ems/core-limits/core-budget.ts` und `src-ts/ems/heating-rod/heating-rod-decision.ts` ergänzt.
- Die Spiegel liegen fachlich sauber unter `lib/ts-mirrors/ems/**`; gemeinsame Zahlenhelfer liegen unter `lib/ts-mirrors/utils/number.js`.
- Neue Prüfungen `npm run test:ems-mirrors` und `scripts/verify-ts-ems-mirrors.js` sichern Importierbarkeit und erste Core-/Heizstab-Regressionsfälle ab.
- Keine produktive Runtime-Logik geändert: Core-Limits, Heizstab, Energiefluss, History und KI laufen weiterhin wie in 0.7.75.
- Service-Worker Cache auf `nexowatt-cache-v244` erhöht.

## 0.7.75 - TS Energy-Flow Shadow-Vergleich

- TypeScript-Energiefluss-Resolver wird im Backend erstmals parallel zur produktiven JavaScript-Runtime ausgeführt.
- Die TS-Schicht ist noch nicht autoritativ: Dashboard, History, Heizstab, Core-Limits und KI verwenden weiterhin die bisherigen JavaScript-Werte.
- Abweichungen zwischen alter Runtime und TS-Resolver werden nur diagnostiziert/geloggt und im Debug-JSON `derived.core.building.inputsJson` unter `tsShadow` ergänzt.
- Neuer Check `npm run test:energy-flow-shadow-runtime` prüft die Shadow-Verdrahtung.
- Keine fachliche Änderung an Speicher-, Netz-, PV- oder Heizstablogik.

## 0.7.74 - TypeScript Feature-Sichtbarkeit autoritativ

- TypeScript-Spiegel für EVCS-/Speicherfarm-/SmartHome-/Wetter-/KI-Sichtbarkeit wird in `/config` jetzt autoritativ genutzt.
- Sicherheitsfallback auf die bisherige JavaScript-Runtime bleibt erhalten, falls der TS-Spiegel nicht geladen werden kann.
- Neue Diagnosefelder `featureVisibility` und `featureVisibilityTsPreview` bleiben in `/config` sichtbar.
- Neuer Check `test:feature-visibility-effective-runtime` sichert die produktive Verdrahtung ab.
- Keine Änderungen an Energiefluss, Speicher-DP, Heizstab, KI-Logik, History oder SmartHome-Runtime.

## 0.7.73 - TypeScript Shadow-Bridge Feature-Sichtbarkeit

- TypeScript Shadow-Bridge für spätere Feature-Visibility-Migration ergänzt.
- Generierter CommonJS-Spiegel unter `lib/ts-mirrors/bridges/feature-visibility-shadow.js` ergänzt.
- Neue Checks `sync/check/test:ts-shadow-bridges` ergänzt.
- Keine produktive Runtime-Logik geändert.

# 0.7.72 - TypeScript NodeNext-Konfiguration

- TypeScript-Konfigurationen für Node-nahe Builds von `Node16/node16` auf `NodeNext/nodenext` umgestellt.
- Frontend-MJS-Mirror-Builds behalten `moduleResolution: Bundler`.
- `verify-tsconfig-modern.js` erzwingt jetzt NodeNext/Bundler statt alter Node16/node10-Resolver.
- Keine Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v240` erhöht.

## 0.7.71 - TypeScript-7-kompatible tsconfig-Struktur

- `moduleResolution: "Node"` durch moderne TypeScript-Konfiguration ersetzt.
- Basis-tsconfig nutzt jetzt `module: "Node16"` und `moduleResolution: "Node16"`.
- Frontend-/MJS-Spiegel nutzen bewusst `moduleResolution: "Bundler"` mit `module: "ES2022"`.
- Neuer Check `npm run check:tsconfig-modern` ergänzt, damit keine veralteten `node10`-/`Node`-Konfigurationen zurückkommen.
- Keine Runtime-Logik geändert.

## 0.7.70 - TypeScript Source Integrity Stabilization

- Reine TS-Migrations-Stabilisierung ohne Runtime-Änderung.
- `scripts/verify-ts-source-syntax.js` ergänzt, um alle `src-ts/**/*.ts` gegen abgeschnittene Dateien, Syntaxfehler und kaputte Exporte zu prüfen.
- Neuer Befehl `npm run check:ts-source-syntax`. Dieser Check benötigt vorher `npm install`/`npm ci`, bleibt aber bewusst außerhalb des schnellen `publish:check`.
- Version und Service-Worker-Cache auf 0.7.70 / `nexowatt-cache-v238` erhöht.

## 0.7.69 - TypeScript Energiefluss-Spiegel und Shadow-Vergleich-Vorstufe

- CommonJS-Spiegel für TypeScript-Energiefluss-Helfer und den produktionsnahen Resolver ergänzt.
- Neue Spiegel unter `lib/ts-mirrors/energy-flow/**` vorbereitet; sie werden noch nicht produktiv von `main.js` oder `www/app.js` genutzt.
- Synchronitäts- und Runtime-Checks für Split-/Signed-Speicher, Fallback, Netz-Signed und 0-W-Fälle ergänzt.
- Build-/Check-Skripte für `sync:ts-energy-flow-mirrors`, `check:ts-energy-flow-mirrors` und `test:energy-flow-mirrors` ergänzt.
- Keine Änderung an Energiefluss-, Speicher-, Heizstab-, KI-, History-, SmartHome- oder Lizenz-Runtime.
- Service-Worker Cache auf `nexowatt-cache-v237` erhöht.

## 0.7.68 - Frontend-MJS-Spiegel Runtime-Check

- Runtime-Importcheck für die generierten Frontend-MJS-Spiegel ergänzt.
- Prüft `display-format.mjs`, `customer-feature-visibility.mjs` und `history-controls.mjs` ohne produktive VIS-Änderung.
- Regressionsfälle für `0 W`, EVCS/Farm-Sichtbarkeit und History-EVCS-PDF ergänzt.
- `publish:check` prüft jetzt zusätzlich, ob die MJS-Spiegel importierbar und fachlich plausibel sind.
- Service-Worker Cache auf `nexowatt-cache-v236` erhöht.

# 0.7.68 - TypeScript Feature-Visibility Regressionen

- TypeScript-Regressionsfälle für kundenseitige Feature-Sichtbarkeit ergänzt.
- EVCS-/Wallbox-Sichtbarkeit, Speicherfarm-Sichtbarkeit, Wetter-, SmartHome- und KI-Sichtbarkeit fachlich abgesichert.
- Neuer Runtime-Test für `buildCustomerFeatureVisibility` ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v236` erhöht.

# 0.7.67 - TypeScript Frontend-Display-MJS-Spiegel

- Ersten kontrollierten TS->MJS-Spiegel fuer browsernahe Frontend-Display-Helfer ergänzt.
- Keine Runtime-Änderung.

## 0.7.67 - TypeScript Frontend-Display-MJS-Spiegel

- Ersten kontrollierten TS->MJS-Spiegel fuer browsernahe Frontend-Display-Helfer ergänzt.
- Neue Spiegeldateien unter `www/static/ts-mirrors/frontend/`: `display-format.mjs`, `customer-feature-visibility.mjs`, `history-controls.mjs`.
- Neue Build-/Check-Skripte: `sync:ts-frontend-mirrors`, `check:ts-frontend-mirrors`, `test:ts-frontend-mirrors`.
- `publish:check` prüft die Frontend-Spiegel synchron, ohne TypeScript-Build auszuführen.
- Keine Runtime-Änderung an Dashboard, History, Energiefluss, SmartHome, EMS, Lizenz oder info.connection.
- Service-Worker Cache auf `nexowatt-cache-v235` erhöht.

## 0.7.66 - TypeScript Build-Output und erster JS-Spiegel

- Erste reproduzierbare TypeScript-zu-JavaScript-Spiegelstrategie eingeführt.
- `src-ts/scripts/publish-check-rules.ts` wird per TypeScript-Build zu `scripts/publish-check-rules.js` gespiegelt.
- Neue Checks: `build:ts:script-mirrors`, `test:ts-script-mirrors` und `test:script-mirrors`.
- `build:ts` erzeugt jetzt zuerst den JS-Spiegel und anschließend die TypeScript-Deklarationen.
- Der generierte JS-Spiegel ist klar als automatisch erzeugt markiert.
- Keine produktive EMS-/VIS-/Speicher-/Heizstab-/KI-/History-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v234` erhöht.

## 0.7.65 - TypeScript Frontend-Anzeigehelfer

- Erste reine Frontend-TypeScript-Helfer unter `src-ts/frontend/` ergänzt.
- Anzeigeformatierung für Leistung, Energie und Prozentwerte vorbereitet.
- Typisierte Dashboard-Wertezeilen vorbereitet, inklusive EVCS-Sichtbarkeit.
- History-Toolbar-Verträge vorbereitet, damit EVCS PDF nur mit echter Wallbox sichtbar wird.
- Runtime-Test für Frontend-Anzeigehelfer ergänzt.
- Keine produktive Runtime-/VIS-Logik geändert.

## 0.7.64 - Git-Konflikt-/TypeScript-Stabilisierung

- Git-Konfliktprüfung `npm run git:conflicts` ergänzt.
- Dokumentation `docs/GIT_CONFLICT_RECOVERY_DE.md` ergänzt, damit lokale Merge-/VS-Code-Konflikte sauber bereinigt werden können.
- `.gitattributes` ergänzt, damit TypeScript-/JavaScript-/JSON-Dateien stabile LF-Zeilenenden verwenden und Binär-/Build-Artefakte klar behandelt werden.
- Keine Runtime-Logik geändert: Energiefluss, Speicher, Heizstab, KI, History, SmartHome, Lizenz und info.connection bleiben unverändert.

# 0.7.63 - TypeScript Adapter-State/API Vorbereitung

- TypeScript-Struktur für adapternahe Helfer ergänzt: `src-ts/adapter/state-cache.ts`, `api-state.ts`, `api-set.ts`, `connection-state.ts` und `settings-writes.ts`.
- Erste typisierte Helfer für StateCache-Normalisierung, `/api/state`-Antworten, `/api/set`-Schreibpläne und `info.connection` vorbereitet.
- Regressionen für 0-W-Statewerte, `false`-Werte, `value`/`val`-Übergangsformen und Kundeneinstellungs-Schreibpläne ergänzt.
- Deutsche Kommentare direkt an den neuen Code-Teilen ergänzt, damit die spätere Migration aus `main.js` nachvollziehbar bleibt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v231` erhöht.

## 0.7.63 - TypeScript API-State und Feature-Sichtbarkeit Vorbereitung

- TypeScript-Verträge für `/api/state`, `/api/set` und SSE-Ereignisse ergänzt.
- Backend-nahe TypeScript-Helfer für StateCache-Normalisierung und API-State-Envelopes vorbereitet.
- Feature-Sichtbarkeit für EVCS, Speicherfarm, SmartHome, Wetter und KI-Berater als TypeScript-Helfer vorbereitet.
- Regressionen für gültige 0-W-/false-Statewerte, fehlende States, EVCS ohne echte Wallbox und Speicherfarm ohne echte Farm ergänzt.
- Neue Checks `test:api-state-feature` und `test:api-state-feature-runtime` ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v231` erhöht.

# 0.7.63 - TypeScript Backend/API-State Vorbereitung

- TypeScript-Vorbereitung für spätere Migration von `main.js`-Hilfsbereichen ergänzt.
- Neue Verträge und Helfer für `/api/state`, Feature-Sichtbarkeit, Lizenzplatzhalter-Schutz und `info.connection`.
- Neue Smoke-/Strukturprüfung `test:backend-api-state` ergänzt.
- Deutsche Kommentare direkt an den neuen TypeScript-Code-Teilen ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v231` erhöht.

## 0.7.62 - TypeScript Core-Limits und Heizstab-Vorbereitung

- TypeScript-Verträge für zentrale EMS-Budgets und Heizstab-/Thermikentscheidungen ergänzt.
- Neue fachliche TS-Struktur unter `src-ts/ems/core-limits` und `src-ts/ems/heating-rod` eingeführt.
- Produktionsnahe Regressionen für Speicherreserve, PV-Budget, Netzlimit und Heizstab-Stufenauswahl ergänzt.
- Neue Checks `test:ems-budget-heating-rod` und `test:ems-budget-heating-rod-runtime` ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v230` erhöht.

# 0.7.61 - TypeScript Energiefluss-Resolver und Regressionen

- Produktionsnahe TypeScript-Vorbereitung für Speicher-, Netz- und Gebäudelast-Resolver ergänzt.
- Neue TypeScript-Resolverbasis für `resolveStorageFlow`, `resolveGridFlow`, `calculateBuildingLoadFromBalance` und Snapshot-Aufbau vorbereitet.
- Energiefluss-Regressionsfälle für Split-DP 0 W, signed Speicher-DP, Bilanz-Fallback, Quellenpriorität und signed/split Netzfluss ergänzt.
- Runtime-Test `npm run test:energy-flow-regression-runtime` ergänzt: TypeScript wird in einen Test-Build kompiliert und mit Node ausgeführt.
- Strukturchecks `test:energy-flow-regressions`, `test:energy-flow-regression` und `test:energy-flow-resolver` halten Kommentare, Anker und neue Dateien fest.
- `publish:check` bleibt ohne TypeScript-Build nutzbar und prüft zusätzlich die Regressionstest-Struktur.
- Keine produktive Energiefluss-, Speicher-, Heizstab-, History-, KI-, Lizenz-, SmartHome- oder Frontend-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v229` erhöht.

## 0.7.60 - TypeScript Energiefluss-Helfer

- Erste reine TypeScript-Helfer für Speicher- und Netzfluss ergänzt.
- `splitSignedStoragePower`, `resolveSplitStorageDps`, `calculateStorageFromBalance`, `chooseStorageFlowResult`, `splitSignedGridPower` und `resolveSplitGridDps` vorbereitet.
- Deutsche Kommentare direkt an den neuen Code-Teilen ergänzt, damit Zweck, Zusammenhänge und spätere Runtime-Migration nachvollziehbar bleiben.
- Compile-only Smoke-Test `src-ts/tests/energy-flow-utils-smoke.ts` ergänzt.
- TypeScript-/Scaffold-Prüfungen um die neuen Energiefluss-Helfer erweitert.
- Keine produktive Energiefluss-, Speicher-, Heizstab-, History-, KI- oder SmartHome-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v228` erhöht.

## 0.7.59 - Erste JS-zu-TS-Migration für Wartungsskripte

- Erste kleine JavaScript-Logik aus dem Publish-Check typisiert vorbereitet: `src-ts/scripts/publish-check-rules.ts`.
- Node-kompatible JS-Spiegeldatei `scripts/publish-check-rules.js` ergänzt, damit `publish:check` weiterhin ohne TypeScript-Build funktioniert.
- `scripts/verify-publish.js` nutzt die ausgelagerten Publish-Regeln und ist dadurch ein erster echter Migrationsschritt ohne EMS-/VIS-Risiko.
- Neue TypeScript-Smoke-Datei `src-ts/tests/publish-check-rules-smoke.ts` ergänzt.
- Deutsche Kommentare direkt an den neuen Code-Teilen ergänzt, damit die Migration nachvollziehbar bleibt.
- Keine Änderungen an Energiefluss, Speicher-DP, Heizstab, KI, History, SmartHome oder Lizenzlogik.
- Service-Worker Cache auf `nexowatt-cache-v227` erhöht.

# 0.7.58 - TypeScript Build- und Testbasis

- TypeScript-Migrationsbasis stabilisiert: Basis-, Check-, Build-, Frontend-JS- und Backend-JS-Konfigurationen ergänzt.
- `npm run typecheck` prüft weiterhin nur die TypeScript-Quellen unter `src-ts`; produktive JavaScript-Laufzeit bleibt unverändert.
- `npm run build:ts` erzeugt nur TypeScript-Declaration-Artefakte (`.d.ts`) und keine produktive Runtime-Ausgabe.
- `scripts/verify-ts-scaffold.js` und `scripts/clean-ts-build.js` für eine saubere Build-/Testbasis ergänzt.
- `src-ts/contracts/testing.ts` und `tests/fixtures/regression-plan.de.json` als Grundlage für spätere Regressionstests ergänzt.
- Dokumentation `docs/TYPESCRIPT_BUILD_BASIS_0758_DE.md` ergänzt.
- Keine Änderung an Energiefluss, Speicher-DP, Heizstab, History, SmartHome, KI, Lizenz oder ioBroker-Verbindungslogik.
- Service-Worker Cache auf `nexowatt-cache-v226` erhöht.

## 0.7.57 - TypeScript-Publish-Check getrennt

- `publish:check` wieder npm-stabil gemacht: Es prüft jetzt JSON/ioBroker-Metadaten/Konfliktmarker/JS-Syntax, ruft aber kein `tsc` mehr direkt auf.
- `typecheck` bleibt als eigener TypeScript-Qualitätscheck erhalten.
- Neues Skript `test:all`: `publish:check` + `typecheck` + `npm pack --dry-run`.
- `prepublishOnly` nutzt nur `publish:check`, damit lokales `npm publish` nicht wegen fehlendem `node_modules/.bin/tsc` scheitert.
- GitHub Actions führen weiterhin strikt `npm ci`, `publish:check`, `typecheck` und `npm pack --dry-run` aus.
- Workflow-Fallback `npm ci || npm install` entfernt, damit CI-Fehler nicht mehr versteckt werden.
- Neue Doku: `docs/TYPESCRIPT_PUBLISH_STRATEGY_0757_DE.md`.
- Service-Worker Cache auf `nexowatt-cache-v225` erhöht.

# 0.7.56 - TypeScript Migration Scaffold

- TypeScript-Migrationsbasis ergänzt: `tsconfig.json` und erster `src-ts`-Bereich.
- Erste TypeScript-Verträge für Einheiten, Energiefluss, Speicherauflösung, Feature-Sichtbarkeit, KI-Berater, Lizenz, Datenpunkte und ioBroker-State-Cache ergänzt.
- Neue npm-Skripte `typecheck` und `test:types` ergänzt; `publish:check` führt jetzt zusätzlich den TypeScript-Typecheck aus.
- Dokumentation zur TypeScript-Migrationsbasis unter `docs/TYPESCRIPT_SCAFFOLD_0756_DE.md` ergänzt.
- Keine Produktivlogik geändert: Energiefluss, Speicher-DP-Resolver, Heizstab, KI, History, SmartHome, Lizenz und Connection-State bleiben unverändert.
- Service-Worker Cache auf `nexowatt-cache-v224` erhöht.

# 0.7.55 - Architektur-, Datenfluss- und TypeScript-Dokumentation

- Dokumentationsvertiefung ohne Funktionsänderungen.
- Neue Dokumente ergänzt: `ARCHITECTURE_DE.md`, `DATAFLOW_DE.md`, `STATES_AND_DATAPOINTS_DE.md`, `CRITICAL_RULES_DE.md`, `TYPESCRIPT_MIGRATION_DE.md`, `MODULE_CHECKLISTS_DE.md` und `CODE_CONTRACTS_DE.md`.
- JSDoc-Vertragsblöcke für zentrale Bereiche ergänzt: Adapter-State/API, LIVE-Dashboard, Core-Limits, Heizstab, KI-Berater, App-Center, History und SmartHome.
- Dokumentiert wurden Datenflüsse, State-/DP-Bedeutungen, kritische Nicht-kaputt-machen-Regeln und Checklisten für spätere Änderungen.
- Keine Änderung an Energiefluss, Heizstab, KI, Lizenz, History, SmartHome oder ioBroker-Verbindungslogik.
- Service-Worker Cache auf `nexowatt-cache-v223` erhöht.

# 0.7.54 - Detail-Kommentare für Wartbarkeit und TypeScript-Migration

- Detail-Kommentare vor Funktionen, Methoden, Express-Routen und UI-Ereignisbindungen ergänzt.
- Kommentare beschreiben Aufgabe, Zusammenhang zu APIs/States/Datenpunkten und Hinweise für die spätere TypeScript-Umstellung.
- HTML/CSS-Vertragsstellen zusätzlich dokumentiert.
- `docs/COMMENTING_STANDARD_DE.md` als Kommentarstandard ergänzt.
- Keine Funktionslogik geändert.
- Service-Worker Cache auf `nexowatt-cache-v222` erhöht.

## 0.7.54 - Detaillierte deutsche Code-Kommentare

- Reine Wartbarkeitsversion ohne Funktionsänderungen.
- Deutsche Abschnittskommentare vor Klassen, Funktionen, Methoden und wichtigen Code-Teilen ergänzt.
- Kommentare erklären Zweck, fachlichen Zusammenhang und TypeScript-Hinweise.
- Kommentarstandard unter `docs/COMMENTING_STANDARD_DE.md` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v222` erhöht.

## 0.7.53 - Deutsche Code-Kommentare und Wartbarkeitsbasis

- Reines Dokumentationsrelease ohne Funktionsänderungen.
- Deutsche Datei-Kommentare für zentrale Backend-, EMS-, Frontend-, Admin-, Report- und Skriptdateien ergänzt.
- Zusätzliche Abschnittskommentare in `main.js`, `www/app.js`, `www/ems-apps.js`, `www/history.js` und `www/smarthome.js` ergänzt.
- `docs/CODEMAP_DE.md` als Code-Landkarte für Wartung und spätere TypeScript-Migration ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v221` erhöht.

## 0.7.52 - info.connection Hotfix

- `info.connection` wird jetzt über eine zentrale Helper-Funktion gesetzt und zusätzlich im `/api/state`/SSE-Cache gespiegelt.
- Nach erfolgreichem HTTP-/SSE-Webserverstart bleibt der Verbindungsstatus per Heartbeat auf `true`, solange der Server erreichbar ist.
- Optionale Teilfehler nach dem Webserverstart setzen die Verbindung nicht mehr fälschlich auf `false`; stattdessen wird eine Warnung geloggt.
- Webserver-`error`/`close`-Events setzen `info.connection` sauber auf `false`.
- Beim Adapter-Unload wird der Heartbeat gestoppt und `info.connection` auf `false` gesetzt.
- Keine Änderung an Energiefluss-, Speicher-, Heizstab-, KI-, History- oder VIS-Logik.
- Service-Worker Cache auf `nexowatt-cache-v220` erhöht.

## 0.7.51 - Lizenz-Hotfix nach ioBroker-Stabilitätsupdate

- Regression aus 0.7.50 behoben: `licenseKey` wird vorübergehend wieder ohne `protectedNative`/`encryptedNative` geführt, weil maskierte ioBroker/Admin-Platzhalter gültige Lizenzschlüssel überschreiben konnten.
- Runtime-Lizenzprüfung liest konfigurierte Schlüssel robuster aus `this.config` und dem Adapter-Objekt.
- `/api/license/save` weist maskierte/geschützte Platzhalter ab und überschreibt damit keine echte Lizenz mehr.
- Admin-Lizenzseite ignoriert maskierte Lizenzwerte beim Laden/Speichern.
- Legacy-Lizenzfeld `common.license` wieder auf `UNLICENSED` gesetzt; `licenseInformation` bleibt für spätere ioBroker-Kompatibilität erhalten.
- Keine Änderung an Energiefluss-, Speicher-, Heizstab-, KI- oder VIS-Logik.
- Service-Worker Cache auf `nexowatt-cache-v219` erhöht.

## 0.7.50 - ioBroker Stability Maintenance

- Node.js Engine auf `>=22` angehoben.
- CI/GitHub-Actions auf Node.js 22.x und 24.x vorbereitet.
- ioBroker-Metadaten ergänzt: `tier`, `dependencies`, `globalDependencies`, `licenseInformation`.
- `licenseKey` via `protectedNative` und `encryptedNative` geschützt.
- `info.connection` State ergänzt und beim Start/Stop gesetzt.
- Admin-Konfiguration nutzt jetzt `native.ip`; `native.bind` bleibt als Legacy-Fallback erhalten.
- `common.news` auf die letzten 7 Einträge gekürzt; doppelte Top-Level-News entfernt.
- Publish-/Stabilitätsprüfung erweitert.
- README auf Englisch als primäre ioBroker-Dokumentation umgestellt.
- Service-Worker Cache auf `nexowatt-cache-v218` erhöht.

## 0.7.49 - Mobile VIS Hotfix History/SmartHome

- History-Seite auf Smartphone/Tablet korrigiert: Zeitraum, Datum, Navigation und Aktionen werden jetzt als responsive Gruppen dargestellt statt als horizontal wegscrollende Riesenkacheln.
- EVCS-PDF und E-Mobilitäts-Legende in History werden nur noch angezeigt, wenn wirklich Ladepunkte konfiguriert sind.
- SmartHome-Mobile-Layout gehärtet: Gebäudenavigation ist wieder ein Drawer und nimmt nicht mehr den Seitenfluss ein.
- SmartHome zeigt einen Lade-/Fehlerzustand statt einer leeren Fläche, falls die Geräte-API langsam ist oder nicht antwortet.
- Service-Worker Cache auf `nexowatt-cache-v217` erhöht.

## 0.7.48 - Speicher-DP/Historie-Hotfix

- Speicher-Lade-/Entlade-DPs werden wieder dauerhaft als Quelle der Wahrheit genutzt, auch wenn ein konstanter 0-Wert lange keinen neuen Zeitstempel bekommt.
- Signed Batterie-DP bleibt unterstützt; getrennte Lade-/Entlade-DPs bleiben unterstützt.
- Rechen-Fallback für Speicherleistung greift nur noch, wenn wirklich kein Speicher-DP konfiguriert ist und eine belastbare Bilanz möglich ist.
- Speicherfarm-Werte übernehmen normale Einzelanlagen nicht mehr über alte Runtime-States.
- Der Energiefluss, Core-Limits, Heizstab-Regelung und Historie verwenden wieder dieselbe konservative Speicherauflösung.

## 0.7.47 - Energiefluss-DP-Resolver und Heizstab-Config-Hotfix

- Energiefluss-Resolver korrigiert: getrennte Lade-/Entlade-DPs bleiben wieder autoritativ und werden nicht mehr pauschal bei Netzeinspeisung unterdrückt.
- Signed Batterie-DP bleibt unterstützt (`-` = Laden, `+` = Entladen, inklusive Invert-Option).
- Rechen-Fallback für Speicherleistung greift nur noch, wenn keine frische Messquelle vorhanden ist bzw. eine Seite fehlt und ein direkter Verbrauchszähler vorhanden ist.
- Core-Limits und Heizstab-Regelung verwenden jetzt dieselbe zentrale Speicherfluss-Auflösung wie der Live-Energiefluss.
- Heizstab-App-Center: Speicher-Reserve und weitere Zahlenfelder werden direkt aus dem DOM vor dem Speichern geflusht, damit Werte nicht auf Defaults zurückspringen.
- Service-Worker Cache auf `nexowatt-cache-v215` erhöht.

## 0.7.46 - Energiefluss- und Heizstab-Budget-Hotfix

- Energiefluss-Bilanz gehärtet: getrennte Batterie-Laden/Entladen-Datenpunkte werden bei gleichzeitigem Netzeinspeisen ohne direkten Hauslast-Zähler gegen Ghost-Entladung plausibilisiert. Dadurch bläht ein falscher `powerDischarge`-Alias nicht mehr Gebäudelast, PV-Budget, KI-Berater und Heizstab-Budget auf.
- Core-Limits und Heizstab-Regelung nutzen dieselbe Schutzlogik, damit Status, PV-Budget und Live-Dashboard identisch rechnen.
- App-Center Schnell-Inbetriebnahme bevorzugt beim Speicher jetzt den signed Batterie-Leistungs-Datenpunkt vor getrennten Lade-/Entlade-Aliasen.
- Heizstab-Konfiguration korrigiert: numerische Felder schreiben sofort in die aktive Konfiguration; `Speicher-Reserve (W)` springt nicht mehr auf den Default `1000 W` zurück.
- Service-Worker Cache auf `nexowatt-cache-v214` erhöht.

## 0.7.45 - App-Center Heizstab-UI Hotfix

- App-Center/Installerseiten erhalten die Installer-Seitenklasse, damit Hero und Hauptcontainer wieder auf derselben breiten Cockpit-Achse liegen.
- Heizstab-Tab auf volle Breite umgestellt: Gerätekarte und Hinweis liegen nicht mehr nebeneinander, damit 1-12 Stufen und DP-Zeilen nicht in die rechte Karte laufen.
- Heizstab-Stufenparameter und Write-/Read-DP-Zuordnung responsiv gehärtet: Karten, Gruppen, Felder und Stage-Grid begrenzen sich sauber auf die verfügbare Breite.
- Seitliches Überlaufen/Überlagern der Heizstab-Konfiguration bei PC-, Tablet- und Smartphone-Breiten behoben.
- Service-Worker Cache auf `nexowatt-cache-v213` erhöht.

## 0.7.44 - Publish-/Package-Hotfix

- `package.json` sauber neu geschrieben und Version auf `0.7.44` gesetzt.
- `io-package.json` und Webmanifest auf `0.7.44` synchronisiert.
- Service-Worker Cache auf `nexowatt-cache-v212` erhöht.
- Publish-Prüfung gegen ungelöste Git-Konfliktmarker bestätigt.

## 0.7.43 - KI-Speicher-SoC-Hotfix

- KI-Energieberater: Speicher-SoC-Ermittlung korrigiert. `storageSoc` ist jetzt die primäre normale Speicher-SoC-Quelle; `storageFarm.totalSoc=0` aus nicht aktiver oder nicht konfigurierter Speicherfarm sowie alte Regelungs-Defaults überdecken den echten Kunden-Frontend-SoC nicht mehr.
- Speicherfarm-SoC wird nur noch genutzt, wenn die Farm aktiv ist und echte SoC-Quellen vorhanden sind; sonst fällt die KI sauber auf den normalen Speicher-SoC zurück.
- Neue Diagnose-States `aiAdvisor.storageSocPct` und `aiAdvisor.storageSocSource`, damit sichtbar ist, welchen Speicher-SoC der KI-Berater wirklich verwendet.
- Service-Worker Cache auf `nexowatt-cache-v211` erhöht.

## 0.7.42 - Batteriefluss-Verknüpfung und striktere Anlagen-Sichtbarkeit

- Batterie-Leistungsanzeige im Cockpit gehärtet: Wenn Lade-/Entlade-Datenpunkte fehlen, stale sind oder nur 0 liefern, aber PV, Netz, Hausverbrauch und SoC eine klare Batterie-Bilanz ergeben, wird Laden/Entladen plausibel aus der Leistungsbilanz abgeleitet.
- Energiefluss-Monitor, aktuelle Werte, KPI-Kachel und Historie nutzen damit wieder konsistente Speicherwerte.
- Backend spiegelt abgeleitete Batterie-Lade-/Entladeleistung auf die öffentlichen Flow-States, damit KI-Berater, Historie und Module dieselbe Speicherlogik sehen.
- EVCS-/Ladestations-Sichtbarkeit weiter verschärft: Alte Bool-Flags allein reichen nicht mehr aus; sichtbar wird EVCS nur bei wirklich konfigurierten Ladepunkt-Zeilen.
- Service-Worker Cache auf `nexowatt-cache-v210` erhöht.

## 0.7.41 - Anlagenabhängige Sichtbarkeit für EVCS und Speicherfarm

- Kunden-Frontend zeigt EVCS/Ladestation nur noch, wenn mindestens ein echter Ladepunkt mit Mess-/Steuer-Datenpunkt konfiguriert ist.
- Default-/Legacy-Placeholder wie `consumptionEvcs` aktivieren keine Wallbox-Anzeige mehr.
- Ladestation-Wert, Schnellzugriff, Energiefluss-Knoten, EVCS-Seite und EVCS-Navigation werden bei Anlagen ohne Wallbox ausgeblendet.
- Speicherfarm-Reiter und Farmansicht werden nur noch angezeigt, wenn die Speicherfarm im Installer aktiv ist und mindestens ein Speicher konfiguriert wurde.
- KI-Energieberater blendet EV-/Wallbox-Empfehlungen bei Anlagen ohne Wallbox aus und formuliert Empfehlungen dann auf Heizstab, Warmwasser und andere flexible Lasten um.
- App-Center erlaubt `0` Ladepunkte als gültige Konfiguration.
- Service-Worker Cache auf `nexowatt-cache-v209` erhöht.

## 0.7.40 - KI-Energieberater Planung & Lernen

- KI‑Energieberater um Tagesfahrplan, EV‑Zielplanung, wetterbasierte Speicherstrategie, Saisonlogik und Komfortfenster erweitert.
- Lastspitzen‑Lernfunktion, Anomalie‑Erkennung und Prognosequalitätsbewertung ergänzt.
- Kunden‑Einstellungen für Optimierungsmodus, EV‑Ziel, Komfort-/Ruhezeiten und Prioritäten ergänzt.
- App‑Center/Admin‑Konfiguration für neue KI‑Bausteine, Schwellwerte, Prioritäten und Kategorien erweitert.
- Neue States unter `aiAdvisor.*` für Tagesfahrplan, Lernhinweise, Prognosequalität, Anomalien, Saison und Komfortfenster ergänzt.

# 0.7.39 - KI-Berater Wetterprognose und Peak-Shaving-Vorwarnung

- KI-Energieberater nutzt jetzt die vorhandene Wetterprognose: Regen-/Wolkenlage, Temperatur und Morgen-Prognose können Empfehlungen zu Speicherreserve, PV-Fenstern, Thermik und Kühlung beeinflussen.
- Peak-Shaving-Beratung korrigiert: Bei konfigurierter Netzanschlussleistung von z. B. 30 kW wird ab 90 % eine Vorwarnung ausgelöst, also ab 27 kW.
- Die Peak-Meldung unterscheidet sauber zwischen „Lastspitzenkappung aktiv“, „Lastspitzenkappung vorbereitet“ und „Lastspitzenkappung nicht konfiguriert“.
- Neue Runtime-States ergänzt: `aiAdvisor.peakUsagePct`, `aiAdvisor.peakStateText`, `aiAdvisor.gridConnectionLimitW`, `aiAdvisor.peakWarnThresholdW` und `aiAdvisor.weatherSummary`.
- App-Center erweitert: Schwellwert „Peak-Warnung ab Netzanschluss (%)“, Schlechtwetter-/Regenrisiko-Schwelle und Kategorie „Wetter / Prognose“.
- Service-Worker Cache auf `nexowatt-cache-v207` erhöht.

# 0.7.38 - Speicherfarm-Route und KI-Berater Kundenschalter

- Fehler behoben: `storagefarm.html` ist jetzt direkt unter `/storagefarm.html`, `/storagefarm`, `/speicherfarm.html` und `/speicherfarm` erreichbar; die 404-Seite beim Topbar-Reiter Speicherfarm ist damit beseitigt.
- Kundenschalter in den Einstellungen ergänzt: Der KI-Energieberater kann vom Kunden unter `Einstellungen → Allgemein` ein- und ausgeschaltet werden.
- Der KI-Energieberater respektiert jetzt die neue Einstellung `settings.aiAdvisorEnabled` sofort im LIVE-Dashboard und im EMS-Modul.
- Kompatibilität zwischen `aiAdvisor.showOnLive` und `aiAdvisor.showInLive` bereinigt, damit App-Center-Konfiguration und LIVE-Anzeige konsistent bleiben.
- Service-Worker Cache auf `nexowatt-cache-v206` erhöht.

# 0.7.37 - SmartHome Halbkreis-Bedienung und Feinschliff


- SmartHome-Dimmer und Jalousien erhalten im großen Bedienpanel zusätzlich einen interaktiven Halbkreis-Regler mit +/− Bedienung; der klassische Slider bleibt als Präzisionssteuerung erhalten.
- Halbkreis-Regler und Slider werden gegenseitig synchronisiert und bleiben mit Live-Vorschau/Commit-Logik kompatibel.
- Service-Worker Cache auf `nexowatt-cache-v204` erhöht.

# 0.7.36 - UI-Polish SmartHome, Einstellungen und Speicherfarm

- Alte Allgemeine-Einstellungen-Sektion vollständig aus dem LIVE-Dashboard entfernt; Einstellungen liegen nur noch auf `settings.html`.
- Speicherfarm bleibt table-only und nutzt auf dem PC die verfügbare Breite/Höhe deutlich besser.
- SmartHome-Kacheln sauberer ausgerichtet, aktive Gebäudestruktur-Einträge wieder kontrastreich lesbar.
- SmartHome-Bedienkacheln mit Halbkreis-Statusanzeige ergänzt; Klick auf Dimmer, RGB, Jalousie, RTR und Player öffnet direkt die große Bedienung.
- Überschrift-/Hero-Kacheln in Einstellungen und Installerbereich auf eine gemeinsame Container-Achse und sauberes Padding gebracht.
- Service-Worker Cache auf `nexowatt-cache-v203` erhöht.

# 0.7.35 - History Vollbreite, Speicherfarm-Tabelle, Admin-Trennung

- History auf Desktop auf volle verfügbare Breite erweitert; Tablet und Smartphone bleiben responsiv.
- Top-Level-Reiter „Speicherfarm“ öffnet jetzt eine eigene table-only Seite (`storagefarm.html`) statt das LIVE-Dashboard als eingebetteten Tab zu zeigen.
- Alte Links auf `?tab=storagefarm` werden auf die neue Speicherfarm-Tabelle umgeleitet.
- Installer-/Konfigurationsseiten unter `/www` sind per Admin-Handoff geschützt und werden aus dem Kundenfrontend nicht mehr direkt verlinkt.
- Admin-React-Handoff ergänzt `nwAdmin=1`, damit App-Center, Simulation und SmartHome-Konfiguration weiterhin aus der ioBroker-Adminseite geöffnet werden können.
- Service-Worker Cache auf `nexowatt-cache-v202` erhöht.

# 0.7.34 - History Full-Width & Speicherfarm-Tab-Fix

- History-Seite auf Desktop/PC auf volle verfügbare Cockpit-Breite erweitert; Tablet- und Smartphone-Breakpoints bleiben touchfreundlich responsiv.
- Diagrammhöhen für History und Preis/Kosten auf Desktop vergrößert, auf Tablet/Smartphone weiterhin kompakt begrenzt.
- Speicherfarm-Tab im Endkunden-Frontend zeigt jetzt ausschließlich die Read-only-Speicherfarm-Tabelle und blendet das LIVE-Dashboard zuverlässig aus.
- Topbar-Links „SPEICHERFARM“ führen auf die Read-only-Tabelle; die Konfiguration bleibt im App-Center intern erreichbar.
- Webcache auf `nexowatt-cache-v201` erhöht.

# 0.7.33 - Frontend-weites Cockpit-Design

- Alle Haupt-Unterseiten optisch an das neue NexoWatt EMS Cockpit angepasst: History, Einstellungen, EVCS, SmartHome, SmartHome-Konfiguration, NexoLogic, App-Center/Speicherfarm, Simulation und Reports.
- Gemeinsame Topbar-, Karten-, Button-, Formular-, Tabellen- und Dialog-Styles ergänzt, damit das komplette Frontend visuell einheitlich wirkt.
- Mobile und Tablet-Breakpoints für Unterseiten erweitert: Toolbars, Einstellungsbereiche, App-Center-Zeilen, Energiefluss-Konfiguration und Tabellen stapeln bzw. scrollen touchfreundlich.
- App-Center, SmartHome-Konfiguration, Simulation und RFID-Report erhalten die gemeinsame mobile Navigation über `nw-shell.js`.
- Webcache auf `nexowatt-cache-v200` erhöht.

# 0.7.32 - Responsive Cockpit-Redesign

- LIVE-Dashboard auf das neue responsive Cockpit-Layout umgebaut: linke System-/Liveübersicht, zentraler Energiefluss und rechte Werte-/Schnellzugriffsleiste.
- Energiefluss-Monitor inklusive Schnellsteuerung für optionale Verbraucher/Erzeuger bleibt erhalten und ist auch auf Tablet/Smartphone touchfreundlich nutzbar.
- Rechte Schnellzugriffsleiste mit Tarif-/EMS-, Ladestation- und Lastmanagement-Kacheln ergänzt; bestehende Modal- und Steuerlogik bleibt angebunden.
- Mobile Breakpoints für Smartphone und Tablet ergänzt; KPI-, Wetter-, Advisor- und Schnellzugriffskarten ordnen sich automatisch einspaltig bzw. zweispaltig an.
- Webcache auf `nexowatt-cache-v199` erhöht.

# 0.7.31 - KI-Energieberater / beratende Optimierung

- Neue App-Center-App „KI-Optimierung“ ergänzt.
- Neuer EMS-Runtime-Baustein `AiAdvisorModule` erzeugt beratende Optimierungsvorschläge unter `aiAdvisor.*`.
- LIVE-Dashboard zeigt eine dezente KI-Energieberater-Kachel mit Top-Empfehlung und Details.
- Kategorien und Schwellwerte für Tarif, PV, Speicher, EVCS, Peak/HLZF, Thermik und Systemhinweise sind im App-Center konfigurierbar.
- Wichtig: Im UI-Adapter bleibt die KI advisor-only; es werden keine Geräte geschaltet. Aktive KI-Schaltentscheidungen bleiben für EOS vorbereitet.
- Webcache auf `nexowatt-cache-v198` erhöht.

# 0.7.30

- Atypische Nachkontrolle: Exportbereich in der §19-Kachel ergänzt mit CSV- und PDF-Export.
- Influx-Nachweis: `historie.peakShaving.atypical.*` wird automatisch angelegt, in das gemeinsame Historie-/Influx-Raster geschrieben und zusätzlich werden die Runtime-States `peakShaving.atypical.review.*` historisiert.
- Neue Runtime-Endpunkte: `/api/peakshaving/atypical/review`, `/api/peakshaving/atypical/review.csv` und `/api/peakshaving/atypical/review.pdf`.
- Webcache auf `nexowatt-cache-v197` erhöht.

# 0.7.29

- App-Center Peak-Shaving: Netzbetreiber-/Quellnachweis für Hochlastzeitfenster ergänzt: Netzbetreiber, Gültigkeitsjahr, Quelle/Dokument, Veröffentlichungsdatum, Quell-URL/Ablage und Bemerkung.
- Atypische Nachkontrolle: Neuer §19-Prüfbereich mit Live-Jahreskontrolle und manuellen Jahres-Endwerten aus RLM-/Zählerexport.
- Runtime: `peakShaving.atypical.review.*` führt gemessene P_abs_max- und P_HLZF_max-Werte mit, berechnet Verlagerung in W/%, Schwellen-/Mindestverlagerungsstatus, Bagatellprüfung und JSON-Snapshot.
- Webcache auf `nexowatt-cache-v196` erhöht.

# 0.7.28

- App-Center: Neuer Reiter „Peak-Shaving“ für die Parametrierung der Lastspitzenkappung ergänzt. Installateure können jetzt Normalbetrieb, atypische HLZF-Kappung, Hybrid-Modus oder reines Monitoring wählen.
- Atypische Lastspitzenkappung: Entnahmeebene, Erheblichkeitsschwelle, Referenz-Jahreshöchstlast, Mindestverlagerung, HLZF-Sicherheitsmarge, Feiertage, Brückentage und Hochlastzeitfenster sind nun direkt über die UI einstellbar.
- Runtime: `peakShaving.strategyMode` trennt Standard-, Atypik-, Hybrid- und Monitoring-Betrieb sauber, sodass im Modus „Atypisch“ außerhalb der HLZF kein permanenter Standard-Cap erzwungen wird.
- Webcache auf `nexowatt-cache-v195` erhöht.

# 0.7.27

- EMS/Peak-Shaving: Atypische Lastspitzenkappung für Hochlastzeitfenster ergänzt (`peakShaving.atypical.*`). Der HLZF-Cap wird im aktiven Zeitfenster mit dem bestehenden Peak-Shaving-/GridConstraints-Limit geminimt und über `peakShaving.control.limitW` in CoreLimits, Speicherregelung und EVCS-Budget weitergereicht.
- Neue Diagnose-States unter `peakShaving.atypical.*` zeigen aktives Hochlastzeitfenster, HLZF-Ziellast, Entnahmeebene, Erheblichkeitsschwelle, Mindestverlagerung und bindende Limitquelle.
- App-Center-Konfiguration wird mit deaktivierten Default-Feldern für `peakShaving.atypical` normalisiert; Lizenzlogik bleibt unverändert.

# 0.7.25

- Lizenzseite beschleunigt: `/api/license/info` wird jetzt zuerst direkt über den Adapter-Runtime-Port abgefragt.
- Der Runtime-Fast-Path wartet nicht mehr vorher auf den ioBroker-Admin-Socket zum Port-Lesen.
- Wenn Runtime UUID und Lizenzstatus liefert, werden langsame Admin-Fallbacks übersprungen.
- Reduziert lange Wartezeiten, bis die System-UUID im Lizenzdialog erscheint.
- Keine EMS-/Regellogik geändert.
- Webcache auf `nexowatt-cache-v194` erhöht.

# 0.7.24

- Lizenz-Admin-Fix: Der gespeicherte vollständige Lizenzschlüssel bleibt nach Verlassen/erneutem Öffnen der Adapterseite sichtbar.
- Lizenzseite liest jetzt zuerst den schnellen Runtime-Endpunkt und danach erst Admin/native-Fallbacks; dadurch ist UUID/Status/Schlüssel schneller und stabiler sichtbar.
- Runtime-Endpunkt `/api/license/info` liefert der Admin-Lizenzseite zusätzlich den aktuell konfigurierten Schlüssel, damit das Eingabefeld auch bei Admin-Socket-Problemen wieder befüllt wird.
- Browser-lokaler Cache bleibt als zusätzlicher Fallback aktiv.
- Keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v193` erhöht.

# 0.7.24

- Lizenzseite verbessert: Nach dem Speichern einer Voll-Lizenz bleibt der Lizenzschlüssel beim erneuten Öffnen wieder sichtbar.
- Die Admin-Seite stellt den Schlüssel aus der nativen Adapter-Konfiguration wieder her; falls die Admin-Abfrage kurzzeitig nicht liefert, wird der zuletzt erfolgreich gespeicherte Admin-Wert lokal im Browser wieder angezeigt.
- Der öffentliche Runtime-Endpunkt `/api/license/info` gibt den vollen Lizenzschlüssel weiterhin nicht aus.
- Reine Admin-/Lizenz-UI-Korrektur; keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v193` erhöht.

# 0.7.23

- Lizenz-Aktivierung behoben: Admin-Callbacks unterstützen jetzt beide ioBroker-Varianten `callback(obj)` und `callback(err, obj)`. Dadurch werden Adapter-Objekt, UUID und Lizenzstatus wieder zuverlässig gelesen.
- UUID-Auslesung robuster gemacht: `system.meta.uuid`, `system.config`, State-Werte und verschachtelte UUID-Felder werden rekursiv geprüft.
- Neuer Runtime-Endpunkt `/api/license/save` vor dem Lizenz-Gate: Lizenzschlüssel kann gespeichert und sofort geprüft werden, auch wenn die Admin-Socket-Verbindung im Browser/iframe hängt.
- `/api/license/info` liest die UUID bei Bedarf erneut nach, falls sie beim Start noch leer war.
- Admin-React neu gebaut. Keine EMS-/Regellogik geändert.
- Webcache auf `nexowatt-cache-v192` erhöht.

# 0.7.22

- Lizenzseite korrigiert: UUID-Auslesung bleibt nicht mehr dauerhaft bei „Lade Daten…“ hängen.
- Admin-Verbindung nutzt jetzt Timeouts für Objekt-/State-Abfragen, damit hängende Socket-Callbacks die UI nicht blockieren.
- UUID-Fallbacks erweitert: `system.meta.uuid` Objekt, `system.meta.uuid` State, `system.config` und Adapter-State `license.uuid`.
- Neuer öffentlicher Runtime-Endpunkt `/api/license/info` vor dem Lizenz-Gate, damit die UUID auch bei gesperrter VIS verfügbar ist.
- Admin-React-Bundle neu gebaut.
- Keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v191` erhöht.

# 0.7.21

- Budget-&-Gates-Diagnose stabilisiert: Die Kachel „Prioritäten / Reservierungen“ bleibt dauerhaft sichtbar und verschwindet nicht mehr bei 0-W-Reservierungen.
- Wenn keine aktive Reservierung vorhanden ist, wird ein ruhiger Platzhalter „Aktive Reservierungen: keine“ angezeigt.
- 0-W-Geisterzeilen werden ausgeblendet; echte Verbraucher/Reservierungen zeigen weiterhin Ist-, Reservierungs- und PV-Leistung.
- Reine UI-/Diagnose-Korrektur; keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v190` erhöht.

# 0.7.20

- Heizstab-PV-Auto Akkuschutz korrigiert: Speicherfarm-0-Werte können echte Speicherentladung aus den Basis-Aliasen nicht mehr verdecken. Dadurch erkennt Gate C Akku-Entladung wieder sauber.
- Harte Speicher-/Netzgrenzen wirken dadurch wieder zuverlässig: bei harter Akku-Entladung wird die PV-Auto-Heizstableistung sofort reduziert/abgeworfen.
- Zentrales Restbudget wird im Heizstab zusätzlich gegen das physische NVP-/Speicher-PV-Cap geprüft. Eine alte eigene Heizstab-Reservierung kann damit nicht mehr als verfügbarer PV-Überschuss gelten.
- Gate D/PV-Forecast wird als Step-up-Plausibilität berücksichtigt: neue höhere Stufen werden nur freigegeben, wenn Live-PV/Forecast die Zielstufe plausibel tragen können.
- EVCS-/Lademanagement-Priorität bleibt unverändert; Ladepunkte haben weiterhin Vorrang vor Thermik/Heizstab.
- Webcache auf `nexowatt-cache-v189` erhöht.

# 0.7.19

- Publish-Sicherheits-Hotfix: `package.json` bereinigt und `publish:check`/`prepublishOnly` ergänzt. Der Check prüft vor `npm publish`, ob `package.json` und `io-package.json` gültiges JSON sind und ob ungelöste Git-Konfliktmarker (`<<<<<<<`, `=======`, `>>>>>>>`) in Projektdateien stehen.
- npm-Paketdateiliste bereinigt: `src-admin-tab`-Quellordner wird nicht mehr in das npm-Paket aufgenommen; die gebauten Admin-/VIS-Dateien bleiben enthalten.
- Keine EMS-Regellogik, keine Gates, keine Speicher-/EVCS-/Heizstab-/Tarif-/VIS-Logik geändert.
- Webcache auf `nexowatt-cache-v189` erhöht.

# 0.7.18

- Heizstab-PV-Auto-Hochstufen korrigiert: stale/verzögerte Stage-Read-DPs setzen das EMS-eigene Ziel nicht mehr bei jedem Tick zurück auf die beobachtete niedrigere Stufe.
- Stage-Feedback nutzt nun frische Read-DPs bevorzugt, fällt bei stale Read-DPs aber auf den Write-/State-DP zurück. Dadurch blockieren alte KNX/OpenKNX-Rückmeldungen das Hochfahren nicht mehr.
- EMS-eigene PV-Auto-Stufen reservieren nach dem Schaltbefehl sofort die kommandierte Zielleistung im zentralen Budget, auch wenn der Leistungsmesser noch verzögert nur die alte Stufe zeigt.
- Behebt Fälle, in denen bei mehreren kW PV-/NVP-Überschuss nur Stufe 1 aktiv blieb und nicht auf Stufe 2/3/4 weitergeschaltet wurde.
- Keine Änderungen an Speicherregelung, Lade-/Lastmanagement, Tariflogik, Peakshaving, MultiUse oder Gate-Berechnung.
- Webcache auf `nexowatt-cache-v188` erhöht.

# 0.7.17

- Energiefluss-Monitor nachgeprüft und robuster gemacht: optionale Verbraucher werden jetzt kollisionsarm rechts verteilt und halten Abstand zu PV, EVCS/Ladestation, Batterie, Gebäude und untereinander.
- Bei vielen optionalen Verbrauchern werden die Zusatzkreise stärker skaliert, damit sie responsiv in der Kachel bleiben.
- Reine UI-/VIS-Anpassung; keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v187` erhöht.

# 0.7.15

- App-Center/Budget-&-Gates-Diagnose sortiert: zentrale Übersicht zuerst, danach Gate A (Netz), Gate A Phasen, Gate A2 (§14a), Gate B (PV), Gate C (Speicher), Gate D (PV-Forecast) und Gate E (Tarif/Negativpreis).
- „Prioritäten / Reservierungen“, Ladebudget und Summary stehen danach als Diagnose-/Verbraucherblöcke.
- Reine UI-/Diagnose-Aufräumung; keine EMS-Regellogik an Speicher, Lade-/Lastmanagement, Heizstab, Peakshaving, MultiUse, Forecast oder Tariflogik geändert.
- Webcache auf `nexowatt-cache-v185` erhöht.

# 0.7.14

- Gate E – Tarif / Negativpreis ergänzt: negative dynamische Preise setzen zentral `ems.budget.tariff.*` und bevorzugen Netzbezug.
- Bei Negativpreis werden Speicher-Netzladen und EVCS-Netzladen freigegeben; tarifbasierte Speicherentladung wird gesperrt.
- Zentrale Budgetkarte zeigt Gate E mit Preis, Negativstatus, Netzbezug bevorzugt, Speicher-/EVCS-Freigabe und PV-Abregel-Empfehlung.
- 0-Einspeisung/PV-Abregelung erhält bei Negativpreis einen Import-Bias, damit PV – sofern technisch steuerbar – zugunsten wirtschaftlichem Netzbezug zurückgenommen werden kann.
- Heizstab und Thermik können in Negativpreisfenstern Gesamtbudget statt reinem PV-Restbudget nutzen; ihre Budget-Reservierung zählt dann nicht als PV-Verbrauch.
- Harte Grenzen bleiben aktiv: Netzanschluss, Phasenlimits, §14a, Peakshaving und Sicherheitslimits werden nicht überstimmt.
- MultiUse und Peakshaving bleiben in ihrer Grundfunktion unverändert.
- Webcache auf `nexowatt-cache-v184` erhöht.

# 0.7.13

- Heizstab-PV-Auto korrigiert: Bei frischem zentralem `ems.budget.remainingPvW` wird Thermik nicht mehr zusätzlich abgezogen, da die zentrale Budget-Schicht Verbraucher nach Priorität bereits berücksichtigt.
- Behebt Fälle, in denen der Heizstab im PV-Auto trotz freiem Gate nicht automatisch startete oder nach manueller Stufe nicht weiter hochschaltete.
- Diagnose erweitert: Debug-JSON zeigt jetzt `pvBudgetFromCentral` und `thermalDeductedW`, damit doppelte Budgetabzüge sofort sichtbar sind.
- Webcache auf `nexowatt-cache-v183` erhöht.

## 0.7.13

- Heizstab-PV-Auto Start-/Hochschaltpfad korrigiert: Wenn die Heizstab-App das frische zentrale `ems.budget.remainingPvW` nutzt, wird `thermalUsedW` nicht mehr erneut lokal abgezogen, weil Thermik/Ladepunkte im zentralen Restbudget bereits nach Priorität berücksichtigt sind.
- Behebt den Fall, dass der Heizstab im PV-Auto trotz PV-Restbudget nicht selbst startet oder nach manuell gesetzter Stufe 1 nicht weiter hochschaltet.
- Legacy-/Fallback-Budgets behalten den lokalen Thermik-Abzug, damit alte NVP-/CM-Pfade weiter geschützt bleiben.
- Keine Änderungen an Speicherregelung, Speicherfarm, Lade-/Lastmanagement, Peakshaving, MultiUse, Thermik-Regelung oder Gate-D-Forecast.
- Webcache auf nexowatt-cache-v183 erhöht.

## 0.7.12

- Heizstab-PV-Auto Startpfad geprüft und robuster gemacht: die PV-Mindestfreigabe nutzt jetzt zusätzlich `ems.budget.pvPowerW` und `derived.core.pv.totalW`, damit PV-Auto nicht blockiert, wenn die zentrale Gate-Schicht PV korrekt sieht, aber der direkte PV-Alias nicht frisch im Heizstabmodul ankommt.
- Heizstab-Istleistung wird im Heizstabmodul jetzt frisch/stale-geprüft gelesen. Alte Consumer-Power-Werte können dadurch keine externe KNX-/Manuell-Erkennung mehr vortäuschen und den PV-Auto-Start blockieren.
- Zentrale Budget-/Reservierungsdiagnose bereinigt: deaktivierte Apps mit 0 W werden nicht mehr als feste Geister-Consumer in `ems.budget.consumersJson` geschrieben; alte/stale Werte deaktivierter Thermik-/Heizstab-Apps fließen nicht mehr in `flexUsedW`.
- Forecast-Gate gegen fehlende Runtime abgesichert, damit die zentrale Gate-Schicht weiterläuft, auch wenn noch kein PV-Forecast-Snapshot vorhanden ist.
- Keine Regeländerungen an Speicherregelung, Speicherfarm, Ladepunktverteilung, Peakshaving, MultiUse oder Forecast-Strategie.
- Webcache auf nexowatt-cache-v182 erhöht.

## 0.7.11

- **Budget-Prioritäten/Reservierungen korrigiert:** Runtime-Reservierungen schreiben jetzt im JSON zusätzlich `usedW`/`pvUsedW`, nicht nur `reserveW`/`pvReserveW`. Dadurch zeigt die App-Center-Karte nicht mehr fälschlich `0 W`, obwohl ein Verbraucher reserviert ist.
- App-Center zeigt in **Prioritäten / Reservierungen** jetzt **Ist**, **Res** und **PV** an und nutzt Reserve-Felder als Fallback.
- `ems.budget.flexUsedW` wird nach Runtime-Reservierungen live in den State- und API-Cache gespiegelt, damit **Zentrale Messbasis → Flexible Lasten** nicht bis zum nächsten Core-Tick bei 0 hängen bleibt.
- Heizstab-Budget-Ownership nach Neustart robuster: Eine noch laufende EMS-/PV-Auto-Stufe kann wieder als eigene Auto-Stufe erkannt und in `ems.budget` reserviert werden, wenn der persistierte Status klar auf Automatik hinweist.
- Externe/manuelle KNX-Schaltungen bleiben geschützt: manuelle/externe Statuswerte werden nicht als Auto-Ownership übernommen.
- Keine Änderungen an Lade-/Lastmanagement, Speicherregelung, Speicherfarm, Peakshaving, MultiUse, Gate D oder der eigentlichen zentralen Core-Gate-Budgetberechnung.
- Webcache auf nexowatt-cache-v181 erhöht.

## 0.7.10

- Hotfix-Rollback für 0.7.9: zentrale Budget-&-Gates-Schicht auf den stabilen 0.7.8-Codepfad zurückgesetzt.
- Experimentelle Schwellwert-Gate-, Thermal- und Core-Diagnoseänderungen aus 0.7.9 entfernt, weil sie die Gate-Aktualisierung in Installationen stören konnten.
- Gegenüber 0.7.8 keine Funktionsänderung an Lade-/Lastmanagement, Speicherregelung, Speicherfarm, Heizstablogik, Peakshaving, MultiUse oder Gate D / PV-Forecast.
- Webcache auf nexowatt-cache-v180 erhöht.

## 0.7.8

- Heizstab-PV-Auto robuster als zentraler Budget-Follower umgesetzt: laufende EMS-eigene Stufen werden als Haltebudget zum zentralen Rest-PV-Budget zurückgerechnet, damit sie bei sauberem NVP nicht nervös abschalten.
- PV-Mindestleistung wirkt jetzt als Start-/Hochschaltgrenze und nicht mehr als harter AUS-Befehl. Bestehende Auto-Stufen werden über Netzbezug- und Speicherentlade-Gates reduziert, manuelle KNX-/Relais-Schaltungen bleiben geschützt.
- Kleine Netz- und Speicher-Schwankungen werden per Hysterese gehalten; Reduzierung erfolgt erst nach einstellbarer Haltezeit, harte Grenzen greifen weiterhin sofort.
- Nur PV-Auto-/Boost-eigene Heizstableistung wird als flexible Last in `ems.budget` reserviert. Externe manuelle Heizstablast zählt als normale Hauslast und bläht das zentrale PV-Budget nicht doppelt auf.
- App-Center Heizstab aufgeräumt: klare Blöcke für **PV-Auto – Budget & Speicher**, **Robustes Schalten** und **Erweitert: harte Schutzgrenzen**.
- Keine Regeländerung an Lade-/Lastmanagement, Speicherregelung, Speicherfarm oder Gate-D-Forecast.

## 0.7.7

- Zentrales **Gate D – PV Forecast** unter `ems.budget.forecast.*` ergänzt.
- Forecast-Gate veröffentlicht jetzt `valid`, `usable`, `confidencePct`, `nowW`, Durchschnittsleistung für 1h/3h, Peaks für 6h/24h sowie Energie-Horizonte für 1h/3h/6h/12h/24h.
- Forecast-Werte liegen zusätzlich im zentralen `ems.budget.snapshot` unter `gates.forecast`, damit Apps und spätere KI-/Prognose-Strategien eine gemeinsame Quelle nutzen können.
- Diagnose im App-Center/Statusbereich um **Gate D – PV Forecast** erweitert.
- Keine Regeländerung an Lade-/Lastmanagement, Speicherregelung, Speicherfarm oder Heizstablogik; das Forecast-Gate ist in dieser Version bewusst nur eine zentrale Informations- und Freigabeschicht.

## 0.7.6

- Zentrale EMS Budget-&-Gates-Schicht eingeführt: `ems.budget.*` läuft dauerhaft im Hintergrund und veröffentlicht PV-Budget, Netzbudget, Speicherladung/-entladung, flexible Lasten und Restbudgets.
- Flexible Verbraucher reservieren Budget jetzt nach Priorität: Ladepunkte/EVCS zuerst, Thermik danach, Heizstab anschließend. Dadurch wird PV-Überschuss nicht mehr von mehreren Apps gleichzeitig doppelt verplant.
- Heizstab-PV-Auto und Thermik-PV-Auto nutzen bevorzugt das zentrale Rest-PV-Budget; ältere NVP-/Lademanagement-Werte bleiben nur als Fallback erhalten.
- Budget-&-Gates-Diagnose im App-Center von „Lademanagement“ auf zentrale EMS-Sicht erweitert, inklusive zentraler Messbasis und Restbudget nach Priorität.
- Lade-/Lastmanagement wurde nur um Budget-Reservierung/Diagnose erweitert; Speicherregelung und Speicherfarm-Verteilung wurden nicht geändert.

## 0.7.5

- Heizstab-PV-Auto unterscheidet jetzt zwischen eigenen Auto-/Boost-Stufen und extern manuell geschalteten KNX-/Relais-Kanälen. Manuelle Kanäle werden beobachtet und nicht mehr durch ein automatisches AUS überschrieben.
- Die PV-Auto-Mindestfreigabe nutzt wieder die tatsächlich gemessene PV-Erzeugung. Rekonstruierte NVP-/Heizstab-Budgetwerte zählen nicht mehr als PV-Erzeugung.
- Wenn die PV-Erzeugung unter die Mindestschwelle fällt, werden nur von der EMS selbst gehaltene Auto-Stufen einmalig abgeworfen; danach bleibt manuelle Schaltbarkeit erhalten.
- Für die Budget-Rekonstruktion wird nur noch EMS-/PV-Auto-eigene Heizstableistung als flexible Last zurückgerechnet. Externe manuelle Heizstableistung zählt als normale Hauslast und bläht das Auto-Budget nicht künstlich auf.
- Heizstab-App-Center aufgeräumt: zentrale PV-Auto-Budgetwerte in einem kompakten Block, 0-/Minus-Einspeise-Testlasten in einem optionalen erweiterten Bereich.
- Lade-/Lastmanagement, Speicherregelung und Speicherfarm-Verteilung wurden nicht geändert.

## 0.7.4

- Heizstab-PV-Auto folgt dem PV-/NVP-Budget jetzt als diskreter Budget-Gate-Verbraucher: sichtbare Einspeisung am NVP, die bereits laufende Heizstableistung und nutzbare Speicherladung oberhalb der Reserve werden gemeinsam für die Stufenzielberechnung genutzt.
- Speicherreserve wird jetzt als fehlende Reserve bilanziert: lädt der Speicher bereits mindestens mit der Reserve, blockiert sie den Heizstab nicht weiter; fehlt Reserve-Ladeleistung, wird sie weiterhin vom Heizstab-Budget zurückgehalten.
- Stufenmodell lernt die reale Heizstableistung aus der Messung der laufenden Stufe. Wenn die Default-Konfiguration z. B. 2 kW pro Stufe annimmt, der reale Heizstab aber 1 kW pro Stufe zieht, kann PV-Auto trotzdem korrekt auf Stufe 2/3 hochfahren.
- Batterie-Richtung wird in der Heizstab-Budgetierung bevorzugt über den signierten `batteryPower` bewertet. Eine aktiv ladende Batterie kann dadurch nicht mehr fälschlich als Speicherentladung den Stufen-Hochlauf blockieren.
- Neue Einstellung im Heizstab-Bereich „Budget-Gates & Lastmanagement“: „Stufe-hoch Wartezeit (s)“. Hochfahren erfolgt maximal eine physische Stufe je Wartezeit; Reduzieren bei dauerhaftem Netzbezug/Speicherentladung bleibt schnell.
- Lade-/Lastmanagement, Speicherregelung und Speicherfarm-Verteilung wurden nicht geändert.

## 0.7.3

- PV-Gate im Lade-/Lastmanagement wird jetzt dauerhaft berechnet und veröffentlicht, auch wenn gerade keine Wallbox im PV-Modus aktiv ist. Dadurch sehen nachgelagerte Apps wie die Heizstabsteuerung den vorhandenen PV-Überschuss zuverlässig.
- Keine Änderung an der EVCS-Budgetverteilung: Das PV-Cap begrenzt Wallboxen weiterhin nur, wenn PV-only/PV-Modus aktiv ist.
- Heizstab-PV-Budget liest stale registrierte Datenpunkte nicht mehr über den rohen Adapter-Cache zurück. Alte Batterie-Entlade-/Netzwerte können dadurch eine echte PV-Freigabe nicht mehr blockieren.

## 0.7.2

- Heizstab-PV-Auto als lesender Budget-Gate-Verbraucher neu aufgebaut: Restbudget und PV-Gate aus dem bestehenden Lade-/Lastmanagement werden nur gelesen und begrenzen die Heizstab-Stufen.
- Keine Änderungen am Lade-/Lastmanagement, an der Speicherregelung oder an der Speicherfarm-Verteilung.
- Heizstab-Stufen bleiben bei kurzen WR-/FEMS-Nachregeltransienten stabil und werden erst nach einstellbarer Netzbezug- oder Speicherentlade-Haltezeit reduziert.
- 0-/Minus-Einspeise-Testlast prüft jetzt nach dem Zuschalten, ob die PV-Erzeugung tatsächlich steigt; bei fehlendem PV-Anstieg wird zurückgeschaltet und erst nach der Retry-Zeit erneut getestet.
- App-Center Heizstab übersichtlicher gegliedert: Speicher-Koordination, Budget-Gates & Lastmanagement sowie 0-Einspeise-Testlast / PV-Nachregelung.

## 0.7.1

- Speicherregelung stabilisiert: NVP-Eigenverbrauchs- und Tarif-Entladung halten im Zielband den letzten aktiven Sollwert, statt kurzzeitig springenden Batterie-Istwerten/Farm-Aggregationen nach unten zu folgen.
- Safety-Clamp nutzt bei aktiver NVP-Regelung zusätzlich den letzten wirksamen Sollwert als Entladebasis. Dadurch werden 0-W- oder Stale-Messaussetzer nicht mehr direkt als Regelgrundlage verwendet.
- Keine Änderungen an Heizstablogik, PV-Überschussladung, Speicherfarm-Verteilung oder 0-Einspeise-Regelung.

## 0.7.0

- Stabile Basis aus der hochgeladenen Version 0.6.262 übernommen.
- Versionssprung auf 0.7.0 für den nächsten Entwicklungsstand.
- Webcache angehoben, damit Browser/App-Center die neue Version zuverlässig neu laden.
- Keine Regeländerungen an Speicher, Speicherfarm, Eigenverbrauch oder Heizstab aus 0.6.267–0.6.270 übernommen.

## 0.6.262
- SmartHome VIS: sensor/status measurement tiles now render their current value large and centered like temperature tiles, including non-temperature Status/Messwerte devices.
- SmartHome Config: sensor devices now expose an Anzeige/Funktionseinheit selector with units °C, W, kW, kWh, Lux, CO₂, V, A, Wh, %, K, m/s, km/h and ppm plus decimal precision.
- SmartHome backend: sensor tiles can fall back to the source datapoint's common.unit when no unit is configured manually. Web cache version bumped.

## 0.6.261

- Heizstab: Globale Mindest-PV-Freigabe für PV-Auto ergänzt. Unterhalb der Schwelle beobachtet die App nur noch und schreibt kein automatisches AUS, damit manuelle KNX-/ioBroker-Schaltungen nicht überschrieben werden.
- Heizstab: 0-/Minus-Einspeise-Logik blockiert normale PV-Überschüsse bei aktivem Speicher-Vorrang nicht mehr; der Speicher-Vorrang sperrt nur zusätzliche Testlast für verdeckte/abgeregelte PV.
- Heizstab: Forecast-Snapshot und aktuelle PV-Leistung werden robuster gelesen (interner Forecast-Snapshot, ps.pvW/Charging-Management-Fallbacks); Diagnose um PV-Auto-Freigabe erweitert.

## 0.6.260

- Historie/Influx-Hotfix: Zusätzliche Erzeuger/Verbraucher aus dem Energiefluss werden beim Speichern im App-Center sofort als kanonische `historie.producers/consumers.*.powerW`-Datenpunkte angelegt und für InfluxDB aktiviert. Kein Adapter-Neustart mehr notwendig.
- Historie/Influx: Optional-Slots werden robuster aus `datapoints.*Power` und alten `vis.flowSlots.*`-Strukturen erkannt.
- Historie/API: Cache wird nach App-Center-Speichern/Import geleert und die Historie-Stati werden sofort einmal geschrieben.
- Speicherfarm-Hotfix aus 0.6.259 bleibt enthalten: Leere direkte Max.-Lade-/Entladefelder bedeuten unbegrenzt und sperren Signed-DP-only-Speicher nicht.

## 0.6.258

- Speicherfarm: Freigabe-/Stör-DPs bleiben optional; leer bedeutet freigegeben. Stale/degraded Messwerte blockieren den Dispatch nicht mehr automatisch, solange keine explizite Sperre/Störung vorliegt.
- Speicherfarm: Istleistungs-DPs sind für die Farm-Verteilung nur noch Mess-/Diagnosewerte; die Sollwertverteilung läuft auch mit Signed-DP-only Systemen weiter.
- Speicherfarm: Maximale Be-/Entladeleistung wird je Speicher als direkte Eingabe gepflegt; dynamische Max-Leistungs-DP-Zuordnungen wurden aus der harten Dispatch-Logik entfernt.
- UI: neuer klarer Bereich „Feste Leistungsgrenzen (direkte Eingabe)“ und separate Vorzeichenoption für Signed-Sollwerte.

## 0.6.257

- Speicherfarm: herstellerneutrale Dispatch-Logik gehärtet; degradierte, stale oder gestörte Speicher werden aus der aktiven Regelung genommen und auf 0 W gesetzt.
- Speicherfarm: feste und dynamische Lade-/Entladegrenzen sowie Verfügbarkeits-, Störungs-, Ladefreigabe- und Entladefreigabe-Datenpunkte je Speicher ergänzt.
- Speicherfarm: Sollwerte werden nur noch auf regelverfügbare Speicher verteilt und auf deren verfügbare Leistung begrenzt; nicht erfüllbare Restleistung wird in der Dispatch-Diagnose ausgewiesen.
- Speicherregelung: Bei aktivem Farmbetrieb kein ungeprüfter Rückfall mehr auf den Einzel-Speicher-Sollwert; dies ist nur noch über eine explizite Expertenfreigabe möglich.
- Speicherfarm-UI/Visualisierung: neue Eingabefelder und Statusanzeige für regelbare Speicher ergänzt.
- PWA/Web-Cache-Version angehoben.

## 0.6.256

- Heizstab: Energiefluss nutzt jetzt die native Heizstab-Leistung (`measuredW` → `appliedW` → `targetW`) statt nur den Verbraucher-DP.
- Heizstab: Schnellsteuerungs-Ring geglättet und gegen kurze 0-W-Readbacks stabilisiert.
- Heizstab: optionale 0-/Minus-Einspeise-Logik für abgeregelte PV ergänzt: Forecast als Startfreigabe, langsames Stufe-hoch, schneller Abwurf bei Netzbezug oder Speicherentladung.
- App Center: neuer Heizstab-Abschnitt „0-Einspeisung / PV-Abregelung nutzen“ mit konservativen Schutzparametern.

## 0.6.255

- FENECON Hybrid nach Kundentest umgestellt: `SetGridActivePower` wird nicht mehr verwendet, weil dieser DP auf der getesteten FENECON/FEMS-Anlage nicht beschreibbar ist.
- Der vorhandene FENECON-Haken im App-Center → Speicher aktiviert jetzt eine FEMS-Prioritätslogik: bei FENECON-PV ab ca. 1 kW schreibt NexoWatt keine externe Batterie-Vorgabe, damit FEMS selbst in den Normalmodus zurückfallen und regeln kann.
- Bei zusätzlicher externer Erzeuger-PV schreibt NexoWatt nur PV-Ladung über den normalen beschreibbaren Sollleistungs-DP und begrenzt den Sollwert auf die erkannte Zusatz-PV.
- Bei wenig/keiner FENECON-PV unter 1 kW übernimmt NexoWatt wieder die normale Speicherregelung für Dynamik-Tarif, Zeit-/Reserve-/LSK-Logiken und erneuert den Sollwert zyklisch innerhalb des FENECON-Watchdogs.
- SpeicherFarm bleibt unverändert; der FENECON-Hybrid-Sondermodus wird bei aktiver Farm weiterhin ignoriert.
- App-Center und Mapping angepasst: kein eigener `FENECON SetGridActivePower`-DP mehr, stattdessen nur der normale `Sollleistung (W)`-DP für die tatsächlich beschreibbare Batterie-Vorgabe.
- PWA/Web-Cache-Version angehoben.

## 0.6.254

- FENECON Hybrid: Der bisherige FENECON-Haken im App-Center → Speicher aktiviert jetzt die neue Netzpunktführung über `ctrlBalancing0/SetGridActivePower` statt der alten direkten AC-Batterie-Sollwertlogik.
- FENECON Netzpunktführung: NexoWatt schreibt ausschließlich neutrale bzw. negative Netzpunkt-Sollwerte (Standard `-100 W`, niemals positive Netzbezugs-Vorgaben). FENECON/FEMS regelt PV, Hausverbrauch und Speicher intern am Netzanschlusspunkt.
- Alte FENECON-Direktlogik abgekoppelt: EVCS-vor-Speicher-Sonderpfade und direkte FENECON-AC-Entladevorgaben werden durch den Haken nicht mehr aktiviert.
- SpeicherFarm bleibt geschützt: Die neue FENECON-Netzpunktführung wird bei aktiver SpeicherFarm ignoriert; bestehende Farm-Fallbacks bleiben unverändert.
- App-Center Speicher: Neuer Datenpunkt `FENECON SetGridActivePower (W)` für `ctrlBalancing0/SetGridActivePower` ergänzt, inklusive Diagnosezuständen für Sollwert, Schreibstatus und Ziel-DP.
- Beim Aktivieren der neuen FENECON-Netzpunktführung wird ein vorhandener direkter Speicher-Sollwert einmalig auf `0 W` freigegeben, damit die alte direkte Vorgabe nicht nachläuft.
- PWA/Web-Cache-Version angehoben.

## 0.6.253

- Heizstab Schnellsteuerung/Manuellbetrieb: Wenn die PV-Regelung im Frontend oder die PV-Auto-Freigabe in der Konfiguration ausgeschaltet ist, schreibt der Adapter keinen physischen AUS-Befehl mehr und übersteuert den Aktor nicht mehr. Manuelle KNX-/ioBroker-Schaltungen bleiben dadurch erhalten.
- Heizstab manuelle Stufen und Boost: Diese Befehle werden jetzt auch bei deaktivierter PV-Regelung zugelassen und als erzwungener Schaltbefehl auf die konfigurierten Stufen-DPs geschrieben.
- Heizstab PV-Auto bleibt streng PV-basiert: Automatikbetrieb schreibt nur bei verfügbarem PV-Überschuss; bei Netzbezug oder Speicherentladung wird sicher auf die nächste niedrigere physische Stufe reduziert bzw. AUS geschrieben – auch bei mehrfach verwendeten Stufen-DPs.
- Heizstab Schnellsteuerung: zusätzlicher Modus „Aus“ ergänzt, damit der Kunde den Heizstab bewusst AUS schreiben kann, ohne die Bedeutung von „PV-Regelung Aus“ zu vermischen.
- PWA/Web-Cache-Version angehoben.

## 0.6.252

- SmartHome Jalousie/Rollladen: Positions-Slider und Aktor-Rückmeldung werden jetzt durchgängig als 0-100 % behandelt.
- SmartHome Level-API: Jalousie-Geräte werden beim Positions-Schreiben jetzt akzeptiert; der Slider schreibt damit wieder korrekt auf den konfigurierten Positions-Write-DP.
- SmartHome Jalousie-Tasten: Auf schreibt 0/false, Ab schreibt 1/true; Stop bleibt ein Trigger. Boolean-Datenpunkte werden automatisch als false/true geschrieben.
- SmartHome Konfiguration: Beim Gerätetyp Jalousie/Rollladen werden Level-Read/Write-Felder sauber angelegt; die DP-Testfunktion und Hinweise zeigen die 0/1-Richtungslogik an.
- PWA/Web-Cache-Version angehoben.

## 0.6.251

- Heizstab PV-Auto korrigiert: Netzbezug wird bei der Überschussrekonstruktion abgezogen, damit laufende Heizstäbe nachts bzw. bei Import nicht künstlich als PV-Überschuss weiterlaufen.
- Heizstab-Stufenausgänge robuster: doppelt verwendete Write-DPs werden pro Tick zusammengefasst, sodass keine widersprüchlichen EIN/AUS-Schreibbefehle mehr auf denselben KNX-/Relais-DP gehen.
- Schnellsteuerung Heizstab: Ringfüllung und Leistungsanzeige nutzen jetzt die konfigurierte Gesamtleistung des Heizstab-Verbunds sowie Max-/Ist-/Sollwerte aus dem Heizstab-Readback.
- io-package-Versionen und News-Blöcke vereinheitlicht.

## 0.6.250
- Heizstab PV-Auto: PV-Überschuss wird jetzt robuster am Netzverknüpfungspunkt rekonstruiert. Bereits laufende Heizstableistung, Speicherladung und Speicherentladung werden berücksichtigt, damit der Heizstab nicht aus Speicherentladung weiterläuft.
- Heizstab/Speicher-Koordination: neue Speicherreserve für PV-Auto ergänzt. Solange der Speicher unter Ziel-SoC liegt, bleibt ein PV-Anteil für die Speicherladung reserviert; überschüssige PV kann parallel in den Heizstab gehen.
- Energiefluss-Schnellsteuerung: Leistungsanzeige im Heizstab-Modal nutzt jetzt denselben Verbraucher-Leistungs-DP wie der Energieflussmonitor und zeigt nicht mehr fälschlich 0 W.
- Live-Schnellsteuerung: Heizstab-Verbraucher werden als eigene Schnellsteuerungs-Kachel angezeigt, sobald die Heizstab-App aktiv und der Verbraucher-Slot quick-control-fähig ist.
- Diagnose erweitert: neue Heizstab-Summary-Werte für Speicherreserve, Speicherladung/-entladung, aktuelle Heizstableistung und Debug-JSON.
- PWA/Web-Cache-Version angehoben.

## 0.6.249
- SpeicherFarm-Regressionsfix: FENECON-EV-Priorität bleibt für Farmen aus, aber Farm-Setups mit gesetztem FENECON-Haken verlieren nicht mehr automatisch die normale Eigenverbrauchs-Entladung.
- SpeicherFarm-Verteilung entschärft: keine harte 0-W-Verteilung mehr durch quadratische SoC-Gewichtung; Online-Speicher oberhalb ihrer SoC-Untergrenze erhalten wieder proportionale Sollwerte.
- SpeicherFarm-Diagnose ergänzt: `storageFarm.lastDispatchJson` zeigt Zielwert, Quelle, SoC-Untergrenze und die verteilten Lade-/Entlade-Sollwerte pro Speicher.
- Charging-Management: Farm-Erkennung für die FENECON-EV-Priorität bool-tolerant gemacht, damit String/Number-Flags die Farm nicht versehentlich in den FENECON-Sonderpfad schieben.
- Web-Cache-Version erhöht.

## 0.6.248
- EVCS/Speicher-Priorität aus 0.6.247 auf den aktiven FENECON-AC-Modus begrenzt. Herkömmliche Speicher behalten damit das bisherige PV-/Speicher-/Wallbox-Verhalten.
- Charging-Management: PV-/Min+PV-Wallboxen lösen die neue Speicher-Vorranglogik nur noch aus, wenn `storage.feneconAcMode` aktiv und keine Speicherfarm eingeschaltet ist.
- Speicher-Regelung: zusätzliches Sicherheits-Gate ergänzt, damit EV-Prioritäts-Caps ohne FENECON-AC-Modus ignoriert werden.
- Speicherfarm: FENECON-Sonderpfad wird bei aktiver Speicherfarm automatisch deaktiviert; dadurch bleibt die Zwei-Speicher-/Farm-Regelung wieder vollständig im bewährten Legacy-Pfad.
- PWA/Web-Cache-Version angehoben.

## 0.6.247
- EVCS/Speicher-Priorität: PV-Überschussladen für PV- und Min+PV-Wallboxen hat jetzt Vorrang vor Speicherladung.
- Charging-Management: Wenn eine PV-limitierte Wallbox Bedarf hat, wird aktuell laufende PV-Speicherladung dem EVCS-PV-Budget zugerechnet. Dadurch kann die Wallbox den Überschuss übernehmen, statt dass der Speicher den Überschuss zuerst wegfängt.
- Speicher-Regelung: PV-Überschuss-Laden des Speichers wird blockiert, solange Ladepunkte den PV-Überschuss noch nutzen können; erst Rest-PV nach Erreichen der Wallbox-/Stationsgrenzen darf wieder in den Speicher.
- Speicher/FENECON: Der AC-Modus bilanziert die Entladung jetzt am Netzverknüpfungspunkt. Bei PV-Überschuss bzw. EVCS-PV-Überschussladen wird die Entladung reduziert oder gestoppt, statt blind der kompletten AC-Last zu folgen.
- Diagnose erweitert: EV-Priorität zeigt jetzt offene Leistung (`pendingW`) und übergebbare Speicherladung (`storageYieldW`); FENECON meldet `nvp-balanced`.
- PWA/Web-Cache-Version angehoben.

## 0.6.246
- SmartHome VIS: Funktions-/Gerätekacheln kompakter und responsiver aufgebaut; kleinere Abstände, schmalere Grid-Spalten und reduzierte Kachelhöhen für bessere Übersicht.
- SmartHome VIS: Temperatur-Kacheln zeigen den Messwert jetzt groß und mittig in der Kachel.
- SmartHome VIS: Temperatur-Sensoren erhalten automatisch die Einheit °C, wenn die Einheit in der Konfiguration fehlt und Name/Funktion als Temperatur erkannt wird.
- PWA/Web-Cache-Version angehoben.

## 0.6.245
- Speicher/FENECON: AC-Sonderlogik neu aufgebaut. Wenn der FENECON-Haken aktiv ist, folgt der Speicher im Eigenverbrauch jetzt der gesamten AC-Last (derived loadTotalW bzw. Fallbacks inkl. EV und Zusatzverbraucher) statt wie der Standardspeicher am NVP zu regeln.
- Speicher/FENECON: Günstiges Tarif-Netzladen behält Vorrang. Tarif-Entladen, EVCS-Assist und PV-Überschuss-Laden greifen im FENECON-AC-Modus nicht mehr parallel dazwischen, damit die Regelung sauber auf einem Pfad bleibt.
- Diagnose erweitert: policyJson enthält jetzt auch die herangezogene FENECON-Lastquelle und den daraus gebildeten Lastfolger-Sollwert.
- PWA/Web-Cache-Version angehoben.

## 0.6.244
- Rollback: Speicher/FENECON wieder auf das Verhalten aus 0.6.240 zurückgesetzt. Die späteren AC-Hybrid-/PV-Formeln aus 0.6.241 bis 0.6.243 sind nicht mehr aktiv.
- Version und PWA/Web-Cache angehoben, damit das Zurückrollen sauber als Update eingespielt werden kann.

## 0.6.243
- Speicher/FENECON: Im AC-Modus wird die Sollleistung jetzt aus der Hybrid-Bilanz `Verbrauch gesamt - PV-Erzeugung - Ziel-Netzbezug` gebildet. Positiver Rest führt zu Entladung, PV-Überschuss zu Ladung.
- Zusätzliche Verbraucher aus dem Energiefluss werden dabei über die abgeleitete Gesamtlast automatisch mit berücksichtigt; als Fallback werden Hauslast + Verbraucher-/EV-Slots verwendet.
- Die FENECON-Sonderlogik übersteuert im AC-Modus jetzt sauber die klassische Eigenverbrauch-/PV-Teilregelung, damit keine widersprüchlichen Sollwerte mehr entstehen.
- PWA/Web-Cache-Version angehoben.

## 0.6.242
- Speicher/FENECON: Die 0.6.241-Direktbilanz wurde zurückgenommen. Im FENECON-AC-Modus regelt der Speicher wieder wie in 0.6.240 am AC-/NVP-Hausverbrauch, damit die Last sauber abgedeckt wird und der Speicher nicht aus dem Netz lädt.
- Speicher/FENECON: PV-Leistung wird nicht mehr in den AC-Sollwert hineingezogen. Überschuss kann dadurch wieder über den FENECON-/DC-Pfad in den Speicher gehen, während der AC-Teil den Hausverbrauch ausregelt.
- 0.6.241-Diagnose-/Bilanzzustände aus der Direktbilanz sind entfernt; der Stand entspricht wieder dem bewährten Verhalten aus 0.6.240.

## 0.6.241
- Speicher/FENECON: Sollwertbildung im FENECON-AC-Modus auf direkte Anlagenbilanz umgestellt. Verwendet jetzt Verbrauch gesamt inkl. interner Zusatzverbraucher minus PV/Erzeuger, damit der Speicher bei PV-Beladung keinen unnötigen Netzbezug mehr zieht.
- Speicher/FENECON: zusätzliche Verbraucher aus den Energiefluss-Slots werden in der Bilanz berücksichtigt; zusätzliche Erzeuger-Slots fließen ebenfalls sauber in die Gegenseite ein.
- Speicher/FENECON: neue Diagnosezustände für Last, Erzeugung, Zusatzverbraucher und berechnete Bilanz ergänzt.

## 0.6.240
- Energiefluss: Die rechte EVCS-/Wallbox-Linie wird jetzt komplett ausgeblendet, solange keine Wallbox wirklich konfiguriert oder gemappt ist. So verschwindet die Geister-Verbindung in Anlagen ohne Wallbox.
- Sobald eine Wallbox vorhanden ist, erscheint die Linie automatisch wieder und verhält sich wie bisher.
- PWA/Web-Cache-Version angehoben.

## 0.6.239
- Energiefluss-Monitor in der Live-Kachel standardmäßig größer dargestellt und nutzt den Platz in der Kachel auf Desktop besser aus.
- Responsive Größenlogik ergänzt: Mit jedem zusätzlichen Verbraucher/Erzeuger skaliert der Energiefluss stufenweise kleiner, damit die Darstellung auf Desktop, Tablet und Smartphone sauber bleibt.
- SVG-Viewport und Statusbreite für den Energiefluss überarbeitet, damit die Live-Ansicht trotz größerer Darstellung stabil und übersichtlich bleibt.
- PWA/Web-Cache-Version angehoben.

## 0.6.238
- Heizstab: Stage-DP-Zuordnung aus dem Energiefluss in die Heizstab-App verschoben; pro Stufe jetzt direkte Write/Read-DP-Pflege im Heizstab-Tab.
- Energiefluss: Verbraucher-Steuerung ist jetzt typabhängig (Allgemein / Wärmepumpe / Heizstab) und blendet nur noch passende Bereiche ein.
- Heizstab-Backend und Quick-Control lesen Stage-DPs jetzt primär aus der Heizstab-App, behalten aber Legacy-Fallbacks aus dem Energiefluss bei.

## 0.6.237
- Heizstab: Endkunden-Schnellsteuerung im Energiefluss-Monitor / in der Steuerungskachel ergänzt. Enthält Regelung Ein/Aus, manuelle Stufen 1/2/3 sowie einen 100%-Boost für 60 Minuten.
- Quick-Control / Live-Kacheln erkennen Heizstab-Verbraucher direkt über den Energiefluss-Slot und zeigen Betriebsart, aktive Stufen und Boost-Status passend an.
- Heizstab-Backend erweitert: User-Override-Modi, Boost-Timer und native Zuordnung für Flow-Quick-Control ohne Zusatz-Script.
- PWA/Web-Cache-Version angehoben.

## 0.6.236
- Neue native Heizstab-App im App-Center: 1..12 Stufen, frei konfigurierbare Stufenleistung sowie Ein-/Aus-Grenzen pro Stufe, direkt verknüpft mit den Verbraucher-Slots im Energiefluss.
- Energiefluss-Verbraucher haben jetzt einen Gerätetyp (Allgemein / Wärmepumpe / Heizstab) und zusätzliche Stage 1..12 Write/Read-Datenpunkte für Relais- oder KNX-Kanäle.
- Thermik-App fachlich getrennt: Fokus auf Wärmepumpe/Klima; Heizstab-Slots werden dort nur noch als Hinweis dargestellt und nicht mehr automatisch geregelt.
- Regelkern verbessert: native Stufen-Hysterese für Heizstäbe, Thermik mit sauberer Band-Hysterese/Budgetierung und Fallback auf Ist-Leistung.
- PWA/Web-Cache-Version angehoben.

## 0.6.235
- Speicher: Neuer FENECON-Modus im App-Center. Aktiviert bei Single-Storage ohne Speicherfarm die Eigenverbrauchs-Entladung auch ohne MultiUse, damit der AC-Teil des Wechselrichters den Hausverbrauch weiter am NVP ausregelt.
- Speicher: FENECON-Modus verwendet standardmäßig 0 W Ziel-Netzbezug, sofern kein eigener Eigenverbrauchs-Zielwert gesetzt ist.
- PWA/Web-Cache-Version angehoben.

## 0.6.234
- Fix: Energiefluss / NVP-Override im Frontend wieder korrekt. /config liefert jetzt Datapoint-Mapping-Flags (und kompatibel die Datapoint-IDs), damit der Live-Energiefluss den gemappten signed NVP-DP wieder als autoritative Quelle verwendet.
- Fix: Grid/PV-Mapping-Prüfung in der VIS verwendet jetzt robuste Mapping-Flags statt leerer /config.datapoints-Fallbacks.

## 0.6.233
- fix(energyflow): signed NVP override (gridPointPower) is now honored strictly by the current mapping; stale mirrored grid values no longer override the active net point in live flow and Historie
- fix(ui): frontend grid resolver now ignores stale NVP values when the override is not mapped and uses the active signed net point immediately for live KPIs

## 0.6.232
- Energiefluss Live-Core-Refresh auf 3s erhöht (statt 5s) für schnellere Nachlese von Netz/PV/Speicher/EVCS-Datenpunkten.
- Basierend auf 0.6.230, ohne weitere Eingriffe in Energiefluss- oder Historienlogik.

## 0.6.229
- PERF(history): doppelte Initial-Ladevorgänge im Frontend werden jetzt zusammengeführt, damit die Historie beim Öffnen nicht mehrfach denselben Request startet.
- PERF(api/history): Kurzzeit-Cache + Inflight-Deduplizierung eingebaut, damit identische Historien-Abfragen nicht mehrfach parallel gegen Influx laufen.
- PERF(history): kWh-Zählerabfragen werden parallelisiert und die exakte Energie-Berechnung verwendet wenn möglich direkt die bereits geladenen Chart-Serien statt dieselben Historien-DPs erneut abzufragen.
- FIX(history): Integrations-Helper bricht am echten Zeitraumende sauber ab und zählt den letzten Randpunkt nicht mehr unnötig als Zusatzintervall.

## 0.6.228
- FIX: Preis-/Netzentgelt-Historie auf Bruttopreislogik umgestellt. Gesamtpreis entspricht jetzt dem angezeigten Live-/Providerpreis; der Basispreis wird aus Gesamtpreis minus Netzentgeltanteil abgeleitet.
- FIX: Tarif-/Netzentgelt-Nachweisbericht verwendet dieselbe Preislogik wie die Historie, damit LIVE, Historie und Report konsistent bleiben.

## 0.6.227
- fix(history): korrigiert überhöhte kWh-Werte in Tag/Woche/Monat/Jahr
- Ursache behoben: exakte Historien-Integration nutzte fälschlich die volle UI-Endzeit statt die tatsächliche Query-Endzeit
- dadurch werden für heutige/teilweise zukünftige Zeiträume keine letzten Leistungswerte mehr bis Tagesende/Monatsende hochintegriert

## 0.6.226

- Live-Status/KPI: Die Autarkie-Kachel wird jetzt konsistent aus Verbrauch und Netzbezug berechnet und folgt damit auch korrekt, wenn nachts der Speicher den Verbrauch deckt oder der Netzanschlusspunkt bei 0 W bleibt.
- VIS-Fallback: Falls ein Netz-Datenpunkt beim ersten Rendern noch nicht angekommen ist, nutzt die Oberfläche nur temporär eine lokale Abschätzung aus PV- und Batterie-Leistung, statt dauerhaft auf einer unpassenden PV-only-Heuristik zu bleiben.
- PWA/Web-Cache-Version angehoben.

## 0.6.225

- Schnell-Inbetriebnahme erweitert: sichere Standard-DPs im Energiefluss werden jetzt per Ein-Klick aus `nexowatt-devices`-Aliasen vorbelegt. Automatisch erkannt werden Netz (Import/Export oder Signed-Fallback), Netz-Online/Heartbeat, PV (bei eindeutiger Quelle) sowie Speicher-SoC/-Leistung (bei eindeutigem ESS/BATTERY). EV und Gebäudeverbrauch bleiben bewusst auf Auto-Summe/Auto-Bilanz, damit Mehrfachgeräte konsistent bleiben.
- Buttontext/Hinweis für die Schnell-Inbetriebnahme aktualisiert.
- PWA/Web-Cache-Version angehoben.

## 0.6.224
- Historie/Energieabgleich: Historienkarten und Energiebalken nutzen jetzt konsequent dieselben kanonischen `historie.*`-Influx-Datenpunkte wie der Live-Bereich.
- Präzise 10-Minuten-Energieintegration für die History-Karten ergänzt, damit Tag/Woche/Monat/Jahr nicht mehr durch grobe Schrittweiten auseinanderlaufen.
- Jahresansicht der Historie auf feinere 1h-Auflösung angehoben; Tag/Woche/Monat lesen wieder im 10-Minuten-Raster.
- Live-Gesamtenergie-Fallbacks (`productionEnergyKwh`, `consumptionEnergyKwh`, `gridEnergyKwh`, `evEnergyKwh`) werden aus der Historie jetzt mit feinerer Integrationsauflösung berechnet.

## 0.6.223
- Energiefluss/Mapping: Der Energiefluss-Monitor unterstützt jetzt auch einen Signed-NVP-Fallback (`gridPointPower`) direkt im Basis-Mapping. Anlagen mit nur einem Netz-Datenpunkt (+ Bezug / - Einspeisung) können damit ohne separate Import-/Export-DPs sauber arbeiten.
- Energiefluss/Live + Historie: Netzbezug und Einspeisung werden bei fehlenden Einzel-DPs automatisch aus dem Signed-NVP-Datenpunkt abgeleitet und für Monitor, Historie und Debug-/Fallback-States sauber weiterverwendet.
- App-Center/UI: Pflichtanzeige für Netz Bezug / Netz Einspeisung berücksichtigt jetzt auch den Signed-Fallback, und doppelte W/kW-Umschalter für denselben Datenpunkt bleiben synchron.

## 0.6.222
- Historie/Tarif: Der Bereich `Preis / Bezug / Kosten` wird jetzt nur noch angezeigt, wenn dynamischer Tarif oder variables Netzentgelt aktuell aktiv sind. Reine Basispreis-Historie ohne aktivierte Tarif-/Netzentgeltfunktion blendet den Abschnitt nicht mehr fälschlich ein.
- Web/PWA: Cache-Version angehoben, damit die korrigierte Historienansicht sicher neu geladen wird.

## 0.6.221
- Charging management audited and hardened.
- Fixed PV-only control so sudden PV drops clamp immediately instead of continuing from a short moving average.
- Removed the extra startup delay after the PV gate opens by allowing the PV start-ready timer to build during the gate delay.
- Scenario-tested Auto, PV, Min+PV, Boost, tariff/goal blocking, no-vehicle and regulation-off behaviour.
- Confirmed that normal EMS regulation no longer toggles the EVCS enable/freigabe datapoint automatically.

## 0.6.220

- charging-management / Regression: Die EVCS-Regelung toggelt die Wallbox-Freigabe nicht mehr automatisch bei Tarif-/PV-Sperren. Auto, PV, Min+PV und Tarif-Sperren bleiben jetzt auf Strom-/Leistungssollwerten, damit die Wallbox nicht mehr an/aus flattert.
- charging-management / Regelung AUS: Auch bei deaktivierter EMS-Regelung wird die Wallbox nicht mehr automatisch über das Enable-DP geschaltet. Stattdessen setzt das EMS den Sollstrom/Sollwert sauber auf 0 und überlässt die eigentliche Freigabe der Wallbox-/Benutzerebene.

## 0.6.219

- charging-management / Tarif: Auto-Zielladen respektiert teure Tarif-Sperren jetzt sauberer. Wenn kein Fahrzeug-SoC verfügbar ist, löst der Forecast das Netzladen nicht mehr vorschnell aus; stattdessen wartet die Logik bis zum echten Latest-Start.
- charging-management / EVCS-Pause: Bei tarifbedingter Netzlade-Sperre wird ein Auto-Ladepunkt ohne PV-Budget jetzt zusätzlich über das Enable-DP pausiert, damit Wallboxen mit trägem oder ignoriertem 0-Sollwert nicht weiterladen. Beim Freigeben wird der Ladepunkt wieder sauber aktiviert.

## 0.6.218

- Historie/Tarif: Neuer Tarif-/Netzentgelt-Nachweis als eigener Ausdruck ergänzt. Der Bericht arbeitet im 15-Minuten-Raster und listet Datum/Uhrzeit, Basispreis, variables Netzentgelt, Gesamtpreis, Netzbezug sowie Basis-/Netzentgelt-/Gesamtkosten zur Gegenprüfung der Stromanbieter-Abrechnung.
- Einstellungen/§14a: Neuer §14a-Ausdruck ergänzt. Der Bericht liest die historisierten Ereignissnapshots aus `para14a.audit.lastJson` und zeigt exakte Zeitstempel, Quelle, Modus, Budget, EVCS-Limit, EV-/Netzleistung und Ergebnis für Nachweiszwecke an.
- UI/Web: Neue Druck-/Nachweis-Buttons in Historie und §14a-Einstellungen ergänzt, gemeinsame Report-Hilfsdateien angelegt und Web-Cache-Version angehoben.


## 0.6.217

- charging-management: Reines PV-Überschussladen hat jetzt eine eigene Start-/Ramp-/Stop-Logik. 3-phasige Wallboxen starten erst, wenn das technische Minimum stabil verfügbar ist, starten dann sauber auf 6 A / ~4,2 kW und rampen im PV-Betrieb weich nach oben.
- charging-management: Laufende PV-only-Sitzungen bekommen eine kurze Mindestlaufzeit und Stop-Entprellung. Kleine kurzfristige Defizite führen dadurch nicht mehr sofort zu An/Aus-Flattern, langsame Wallbox-/Fahrzeug-Hochläufe bleiben stabiler.
- runtime/config: Neue sichere Standardwerte für PV-Start-Stabilität, PV-MinRun, PV-Defizit-Toleranz und sanfte PV-Rampen ergänzt.


## 0.6.216

- Historie: Chart-Initialisierung gehärtet. Die Historie rendert jetzt beim Öffnen wieder automatisch, zieht nach dem ersten Paint ein Re-Render nach und macht bei noch fehlenden Zeitreihen selbstständig einen kurzen Auto-Retry statt erst auf einen Klick zu warten.
- Historie/Tarif: Zusätzliche historisierte Tarif-Provider-States unter `historie.tariff.providerCurrentEurPerKwh` und `historie.tariff.providerAverageEurPerKwh` ergänzt. Außerdem werden die lokalen Tarif-States direkt an die gemeinsame Influx-Historie gebunden, damit der Preisverlauf sauber über die im EMS zugeordneten Tarif-DPs aufgebaut wird.


## 0.6.215

- Historie: Zusätzlichen Preis-/Kostenbereich ergänzt. Wenn dynamischer Tarif oder variables Netzentgelt aktiv sind, zeigt die Historie jetzt den Preisverlauf, den Netzbezug und die daraus berechneten Kosten für Tag, Woche, Monat und Jahr.
- Historie: Neue Preis-Legende ist klickbar, Tooltip lässt sich per Klick außerhalb des Charts oder per ESC schließen, und alle Preis-/Kostenwerte werden mit zwei Nachkommastellen dargestellt.
- Einstellungen: Variables Netzentgelt kann jetzt mit separaten Zuschlägen für ST / NT / HT gepflegt werden; diese Werte fließen in die Preis-Historie und spätere Gegenprüfung der Abrechnung ein.
- Einstellungen/UI: Tarif-/Netzentgelt-Bereich bleibt sichtbar, damit das variable Netzentgelt auch unabhängig vom dynamischen Strompreis sauber konfiguriert werden kann.


## 0.6.214

- charging-management: Initialisierungsfehler `Cannot access 'vehiclePlugged' before initialization` behoben. Der PV-Startup-Hold wird jetzt erst ausgewertet, nachdem der Fahrzeug-/Steckzustand sicher bestimmt wurde.
- charging-management: Dadurch läuft das Modul wieder ohne Fehlerzähler an, und PV-Start-Haltesperren für Wallboxen bleiben funktional erhalten.


## 0.6.213

- Historie: Die Legende unter dem Chart ist jetzt interaktiv. Serien können per Klick direkt im Diagramm ein- und ausgeblendet werden, damit Tages-, Wochen-, Monats- und Jahresansichten besser lesbar bleiben.

- Historie: Tooltip/Marker werden beim Klick außerhalb des Charts wieder geschlossen; zusätzlich werden in Tooltip und Diagramm nur die aktuell sichtbaren Serien berücksichtigt.

- Historie: Neue Kachel `Autarkie` für Tag, Woche, Monat und Jahr ergänzt. Der Wert wird aus Verbrauch und Netzbezug für den gewählten Zeitraum berechnet.

- Web/PWA: Cache-Version angehoben, damit die aktualisierte Historie sicher neu geladen wird.


## 0.6.212

- charging-management: Reiner PV-Überschuss wird jetzt bevorzugt direkt als `PV - Verbrauch ohne EV - Speicherladung` berechnet; Fallback-Rekonstruktion berücksichtigt Batterie-Entladung und überhöht den PV-Cap nicht mehr künstlich.
- charging-management: Kurze PV-Start-Einschwingzeit für Wallboxen/Fahrzeuge ergänzt, damit frische PV-Starts nicht sofort wieder auf 0 W fallen.

## 0.6.211

- Update/Installation: ioBroker wird jetzt per `stopBeforeUpdate` zu einem sauberen Stop vor dem Update angewiesen; zusätzlich ist ein kurzer `stopTimeout` gesetzt, damit der Adapter mit eigenem Webserver geordnet herunterfahren kann.
- Update/Installation: Das lokale `www`-Verzeichnis wird nicht mehr unnötig in die ioBroker-Datenbank hochgeladen (`wwwDontUpload`), weil die VIS direkt aus dem eingebetteten Express-Server ausgeliefert wird. Das reduziert Reibung im GitHub-Updatepfad deutlich.
- Runtime/Shutdown: Der eingebettete HTTP-/SSE-Server schließt beim Entladen jetzt aktiv offene Clients, räumt zusätzliche Timer auf und wartet sauber auf das Server-Close – damit Updates und Neustarts nicht mehr an offenen Verbindungen hängen bleiben.
- Metadaten: GitHub-Repository/Issues/Homepage sowie `extIcon`/`readme` wurden auf die echten NexoWatt-Pfade korrigiert.

## 0.6.210

- Speicherfarm: Die Entladeverteilung priorisiert im Eigenverbrauch jetzt den Speicher mit höherem SoC deutlich stärker. Der jeweils niedrigste SoC wird bei erkennbarer Spreizung gezielt entlastet, sodass ein stärker geladener Speicher die fehlende Leistung übernimmt.
- Speicherfarm: Reagiert ein Speicher auf einen Entlade-Sollwert nicht oder nur stark begrenzt, wird er für die laufende Verteilung automatisch heruntergewichtet und die Leistung auf verfügbare Speicher umgelegt.
- Speicherfarm: Der Übersichts-Zähler `Online x/y` wurde korrigiert und zählt wieder sauber die verfügbaren Speicher statt Doppelzählungen.

## 0.6.209

- EMS/Lademanagement: PV-geführte Wallboxen erhalten jetzt sauber Vorrang vor PV-Speicherladung. Aktive Speicherladung aus PV wird im PV-Budget der Wallboxen wieder freigestellt, damit kleine Hausanlagen die verfügbare PV zuerst an die Ladepunkte geben.
- Speicher-Regelung: PV-Überschussladen des Speichers wird automatisch blockiert, sobald eine PV-geführte Wallbox aktuell durch PV-Mangel begrenzt ist. Dadurch lädt der Speicher keinen relevanten EV-Überschuss mehr weg.
- Diagnose: Die gemeinsame EMS-Laufzeitsicht enthält jetzt einen EV-Prioritäts-Snapshot für Ladepunkte vs. Speicher, damit das Verhalten im Feldtest nachvollziehbar bleibt.

## 0.6.208

- EMS/Lademanagement: PV-Überschussladen nutzt jetzt standardmäßig einen 500-W-Reservepuffer auf dem effektiven PV-Budget. Dadurch bleibt die Überschussladung ruhiger und regelt nicht mehr so hart auf 0 W Netzbezug.
- Runtime-Konfiguration normiert den neuen Charging-Management-Wert `chargingManagement.pvChargeReserveW` automatisch auf 500 W, wenn noch kein Wert gesetzt ist.

## 0.6.207

- Energiefluss: Anzeige mit leichter clientseitiger Hysterese beruhigt – kleine Messwertsprünge und kurze Richtungswechsel flackern in der VIS nicht mehr so stark.
- Energiefluss: Leistungswerte im Monitor werden jetzt durchgängig mit nur noch einer Nachkommastelle angezeigt.
- Web/PWA: Cache-Version angehoben, damit die aktualisierte Energiefluss-Logik sicher geladen wird.

## 0.6.206

- §14a Nachweis-/Audit-Logging nutzt jetzt bewusst die bestehende Historie/Influx-Instanz (standardmäßig `influxdb.0`) statt eine separate §14a-Instanz anzulegen.
- Bereits von NexoWatt automatisch angelegte dedizierte §14a-Influx-Instanzen werden deaktiviert, damit alle Logs sauber auf einer gemeinsamen Historie bleiben.
- Einstellungen → Log / Nachweis: Hinweise und Beschriftungen auf gemeinsame Historie angepasst.
- Web-Cache-Version angehoben.

## 0.6.205
- Einstellungen: Bereich in Seiten aufgeteilt und eine eigene Unterseite `Log / Nachweis` für §14a-Status, Historisierung und Auditdaten ergänzt.
- §14a: Dedizierte InfluxDB-Instanz wird bei Bedarf automatisch bereitgestellt bzw. wiederverwendet; 730-Tage-Retention wird direkt vorbelegt und der Bereitstellungsstatus im Frontend angezeigt.
- Web/PWA: Cache-Version angehoben, damit die neue Einstellungsseite und der Historie-Status zuverlässig geladen werden.

## 0.6.204
- §14a: Neues leichtgewichtiges Nachweis-/Audit-Logging mit Ereignissnapshots unter `para14a.audit.*` und 1-Minuten-Verlauf unter `para14a.trace.*` – optimiert für minimale Laufzeitlast.
- §14a: Erkennt eine Influx-History-Instanz automatisch und aktiviert die Historisierung der Nachweis-States ohne zusätzliche Polling-Last. Für die 2-Jahres-Aufbewahrung bleibt die Retention in Influx separat zu konfigurieren.
- Web/PWA: Cache-Version angehoben, damit die neue §14a-Hinweiskarte im App-Center zuverlässig geladen wird.

## 0.6.203
- SmartHome Config: Neue assistierte Auto-Erkennung über den ioBroker Type-Detector mit Gerätevorschlägen inkl. Quellpfad, gemappten Zuständen und gezielter Übernahme in die SmartHome-Konfiguration.
- SmartHome Config: Der Datenpunkt-Picker kann jetzt zusätzlich die ioBroker-Objektstruktur mit Ordnern, Breadcrumb sowie Start/Zurück browsen und parallel nach ID oder Name suchen.
- Web/PWA: Cache-Version angehoben, damit die neue SmartHome-Erkennung und der DP-Picker zuverlässig geladen werden.

## 0.6.202
- Logik-Editor: Datenpunkt-Auswahl nutzt jetzt zusätzlich die ioBroker-Objektstruktur mit Ordner-Navigation, Breadcrumb, Start/Zurück und paralleler Suche nach ID oder Name.
- Logik-Editor: DP-Picker öffnet bei bereits gesetzten IDs direkt im zugehörigen Elternpfad und erleichtert damit das schnelle Auffinden vorhandener Datenpunkte.
- Web/PWA: Cache-Version angehoben, damit die neue DP-Auswahl zuverlässig geladen wird.

## 0.6.201
- Logik-Editor: Verbindungen lassen sich wieder ohne Löschen eines Blocks trennen – per Rechtsklick auf Leitung oder Zieleingang.
- Logik-Editor: Bausteine aus der Palette können jetzt per Drag & Drop direkt an der gewünschten Position im Arbeitsbereich abgelegt werden.
- Web/PWA: Cache-Version angehoben, damit das Update zuverlässig beim Feldtest ankommt.

## 0.6.200
- EMS/Charging: PV-only stop gate now ignores temporary grid import caused by the active EV load itself; PV surplus control reacts via a short 5s control window while the 5min average remains available for diagnostics.
- Energiefluss / EVCS live inputs are refreshed every 5s and the web cache version was bumped.

## 0.6.199
- Historie/Jahresreport: liest konfigurierte History-Datenpunkte wieder bevorzugt mit automatischem Fallback auf die internen `historie.*` States – alte Verlaufsdaten bleiben damit im Report nutzbar.
- Historie/Jahresreport: kWh-Summen fallen bei 0/zu kleinen Counter-Deltas jetzt auf die Leistungs-Historie zurück; Verbrauch wird zusätzlich über Energiebilanz abgesichert.
- Jahresreport: Restverbrauch (`Sonstiges`) berechnet ohne Batterie-Verluste und wird nicht mehr negativ angezeigt.

## 0.6.198
- Wartung: internes Hilfsskript aus dem Paket entfernt.
- Wartung: Versionsnummer erhöht, damit das Adapter-Update in ioBroker sauber erkannt wird.

## 0.6.197
- EMS/Lademanagement: PV-only Import-Toleranz erhöht (Default `pvAbortImportW` von 200W → 600W) – reduziert unnötige Stop/Start‑Zyklen bei kurzzeitigen Hauslast‑Spitzen/Messrauschen.

## 0.6.196
- EMS/Lademanagement: PV-Überschussladen (PV-only) stabilisiert – bei verzögerten EVCS-Leistungsmesswerten wird zur PV-Überschuss-Rekonstruktion kurzfristig der letzte Sollwert genutzt (verhindert Start/Stop-Hoppen um die ~4,2kW 3-Phasen-Minimalleistung).
- EMS/Lademanagement: Neue Diagnose-States `chargingManagement.control.pvEvcsActualW` / `pvEvcsCmdW` / `pvEvcsUsedW`.

## 0.6.195
- Wartung: Unbenutzte Legacy-Admin/Materialize-Dateien entfernt (index_m.* + templates.json) sowie unnötige/duplizierte Assets (www/admin.png, www/icons/building.png.bak) → kleinere Paketgröße.

## 0.6.194
- Fix: SmartHome Config – ReferenceError **`byId is not defined`** (Szenen/Zeitschaltuhren).
- SmartHome Config: neuer Bereich **Logik‑Uhren** im Reiter **Zeitschaltuhren**
  - Installer kann Zeitfenster (Wochentage + Ein/Aus‑Zeit) definieren.
  - Adapter erzeugt boolean Datenpunkte: **`smarthome.logicClocks.<id>.active`** (für den Logik‑Editor / Flanken‑Auswertung).

## 0.6.193
- SmartHome Zeitschaltuhren: **Jalousie/Rollladen** jetzt auch mit Timer (**AUF/ZU**)
  - im Installer-Konfigurator unter **Zeitschaltuhren**
  - und direkt im SmartHome-Frontend über das **Uhr-Icon** in der Gerätekachel
- SmartHome Config: Timer-Modul listet Geräte jetzt direkt aus der **SmartHome-Konfiguration** (funktioniert auch wenn SmartHome im Adapter noch deaktiviert ist).

## 0.6.192
- SmartHome: **Zeitschaltuhren pro Gerät** ergänzt (Wochentage + EIN/AUS, Dimmer inkl. Level).
- SmartHome: Endkunde kann Zeitschaltuhr **direkt über die Kachel** (Uhr-Icon) einstellen.
- SmartHome Config: neuer **Szenen-Konfigurator** (Adapter führt Szenen aus, inkl. Aktionsliste).

## 0.6.191
- SmartHome-VIS: Gerätekacheln **Premium-Glass Finish**: mehr Tiefe durch **Double-Stroke (inner highlight)** + **dezentes Noise-Grain** (reduziert Banding, wirkt hochwertiger).
- SmartHome-VIS: **Hover/Active** verfeinert (leichte Elevation + sanfterer Press-Effect) – bleibt ruhig und gut lesbar.

## 0.6.190
- SmartHome-VIS: Gerätekacheln: **Titel vollständig lesbarer** – mehr Platz im Header (dynamisches Padding je nach Buttons), **Titel bis 3 Zeilen**, Status bis 2 Zeilen.
- SmartHome-VIS: Grid ist jetzt **adaptiv (auto-fit)** und richtet die Spalten nach der **real verfügbaren Breite** aus (wichtig mit Sidebar) – verhindert zu schmale Kacheln.
- SmartHome-VIS: Tooltip zeigt jetzt immer **vollen Gerätenamen** (Name + Bedienhinweis).

## 0.6.189
- SmartHome-VIS: **Gerätekacheln jetzt einheitlich gleich groß** (keine XL/Spans mehr) → übersichtlicheres Grid.
- SmartHome-VIS: **Lesbarkeit verbessert** (höherer Text-Kontrast, dezenter Header-Scrim, Titel bis 2 Zeilen).
- SmartHome-VIS: RTR-Status kompakter: **Ist/Soll** in der Statuszeile (falls Werte verfügbar).

## 0.6.188
- Fix: **Update-sichere Installer-Konfiguration** – wenn `installer.configJson` nach einem Update leer/reset aussieht, wird automatisch aus dem **0_userdata Backup** wiederhergestellt (DP-Zuordnungen bleiben erhalten).
- Backup: vorherige Backup-Version wird zusätzlich als **backupJsonPrev** gespeichert (zusätzliche Sicherheit bei ungewollten Überschreibungen).

## 0.6.187
- SmartHome Config & VIS: Weitere Raum-/Bereich-Icons ergänzt: **Kinderzimmer**, **Gästezimmer**, **Kaminzimmer**, **Fitness**, **Sauna**, **Werkstatt**, **Technikraum**, **Gartenhaus/Schuppen**, **Carport** (jeweils auch als **3D Varianten** via `3d-...`).
- SmartHome Config: Builder-Library erweitert – neue **Raum-Presets** (Drag&Drop) setzen automatisch **Name + Icon**.

## 0.6.186
- SmartHome Config & VIS: Icon-Bibliothek für **Geschosse/Bereiche** stark erweitert (Etagen-Stack, Keller, Erdgeschoss, Obergeschoss, Dachgeschoss, Garage, Garten/Außenbereich, Terrasse, Pool, Schaltschrank, Server/Netzwerk, Lager, Büro, Waschküche) inkl. **3D Varianten** (`3d-floors`, `3d-basement`, `3d-upper`, `3d-attic`, `3d-garden`, ...).
- SmartHome Config: Standard-Elemente für Geschosse nutzen jetzt die neuen Icons (konsistenter Look im Builder).

## 0.6.185
- SmartHome: **Dynamische Marken-/Modell-Icons** für Geräte ergänzt (Icon-Key z.B. `inv:SMA` oder `wb:Tesla`).
- SmartHome: Neue **3D Icons** ergänzt: **Wechselrichter** (`3d-inverter`) und **Wallbox-Gerät** (`3d-wallbox`).

## 0.6.184
- SmartHome Config & VIS: **Modernes 3D-Icon-Pack erweitert** (PV/Solar, Batterie, Wallbox/Laden, Tür/Fenster/Schloss, Bewegung, Alarm/Sirene, Rauchmelder, Wasser, Lüfter/Klima, Zähler, Schalter/Toggle, Globe/URL).
- SmartHomeConfig: Geräte-Bibliothek zeigt Icon-Keys jetzt als **SVG-Vorschau** (3D Icons direkt sichtbar).

## 0.6.183
- Logik-Editor: **Zurück zur Übersicht** Button ergänzt.
- SmartHome Config & VIS: **Icon-Bibliothek erweitert** (zusätzliche Raum-/Bereich-Icons + neue **3D-Icon-Varianten** per Icon-Key, z.B. `3d-bulb`, `3d-camera`).
- SmartHome VIS: fehlende Icons ergänzt (**Kamera**, **Thermometer**, **Raster**) + Sidebar rendert Icon-Keys als **SVG** (kein "camera"-Text mehr).
- Interne Prototyp-Kommentare bereinigt.

## 0.6.182
- SmartHome-VIS: **Feintuning** – Breadcrumb-Subtitle (zeigt bei Raum-Seiten das zugehörige **Geschoss**), klarere **Raum-Karten** und explizite **Quick-Controls direkt in der Kachel** (Toggle + +/-) für ein app-ähnlicheres Bediengefühl.
- Migration: Erkennung von Legacy **flacher Raum-Navigation** verbessert (funktioniert jetzt auch bei **custom Page-IDs**).

## 0.6.181
- SmartHome-VIS: Sidebar Navigation jetzt **strukturiert**: **Home → Geschoss → Räume** (verschachtelt). Geschosse sind standardmäßig aufgeklappt, damit Räume ohne Extra-Klick sofort auswählbar sind.
- SmartHomeConfig: Button **„Standard-Seiten“** erzeugt jetzt automatisch die **Etagen → Räume** Struktur (statt flacher Raum-Liste).
- Migration: alte, flache Default-Seiten (Home + Räume ohne Etagen) werden in der VIS automatisch auf die neue Etagen-Struktur umgestellt, sobald Geschosse vorhanden sind.

## 0.6.180
- SmartHome-VIS: **Chip-/Filter-Leiste oben rechts entfernt** (Räume/Funktionen/Alle/Favoriten/Textgröße) – Endkunden-UI ist jetzt clean.
- SmartHome-VIS: läuft automatisch im **"Rooms"-Modus** und rendert **Geschoss → Raum → Geräte-Kacheln** wie im Editor (keine versteckten/gespeicherten Filter mehr).

## 0.6.179
- SmartHomeConfig: **Fix für "Speichern" löscht Gebäude-Struktur** – `floors` + `meta` werden jetzt in `/api/smarthome/config` mitpersistiert.
- SmartHome-VIS: Räume können jetzt **nach Geschossen gruppiert** werden (gleiche Hierarchie wie im Editor).
- SmartHome-Builder: Bibliothek **übersichtlicher** (Suche + einklappbare Gruppen) + Drop von Geräte-Templates **im ganzen Arbeitsbereich** möglich.

## 0.6.160
- EMS/Lademanagement: **STALE_METER blockiert standardmäßig nicht mehr** (Hotfix). Dadurch werden Ladepunkte nicht mehr auf 0 gesetzt, wenn der Watchdog fälschlich „veraltet“ meldet.
- EMS/Lademanagement: Neue Policy (intern): `chargingManagement.staleFailsafeMode` = `off|warn|block` (Default: `off`).

## 0.6.161
- EMS/Speicher: **PV‑Reserve Grid‑Charge Block** weniger aggressiv (Fix für „Speicher lädt nicht mehr“ bei niedrigem SoC).
  - `tariffPvReserveMinSocPct` hat jetzt einen **sicheren Default ≥ 20%** (auch wenn Reserve-Min = 0% gesetzt ist).
  - Kapazitäts‑Fallback (wenn keine Batterie‑Kapazität konfiguriert/ermittelbar ist) nutzt eine **größere Schätzung**, damit PV‑Reserve nicht fälschlich bei 10% SoC deckelt.

## 0.6.159
- EMS/Lademanagement: **STALE_METER** nutzt jetzt einen **Device‑Prefix‑Heartbeat** (irgendein State‑Update unter dem Zähler‑Prefix) als Watchdog‑Quelle, um False‑Positives bei stabilen Messwerten zu reduzieren.

## 0.6.158
- EMS/Core: **Engine-Start-Crash behoben** (ReferenceError `gridPointConnectedId` / `gridPointWatchdogId`).
- Zuordnung → Allgemein: **Netzpunkt Connected/Watchdog** ist jetzt wirklich optional und kann sauber gemappt werden, ohne dass der Scheduler stoppt.
- UI: **HTML-Verschachtelung repariert** – die neuen Felder sind jetzt übersichtlich dargestellt.

## 0.6.155
- EMS/Tarif & Netzentgelt: **Netzentgelt (HT/NT) ist jetzt unabhängig vom dynamischen Tarif** – wirkt auch dann, wenn `Dynamischer Zeittarif = AUS`.
- EMS/Tarif: **Statuszeile** zeigt Netzentgelt + Tarif auch bei Tarif AUS (z.B. `Netzentgelt NT | Tarif aus`), damit sofort klar ist, was aktiv ist.
- EMS: Grid‑Freigabe (`gridChargeAllowed`), Entlade‑Freigabe (`dischargeAllowed`) und Ladepark‑Limit berücksichtigen **Netzentgelt** zuverlässig.

## 0.6.143
- EMS/EVCS: **Zielladen nur bei verbundenem Fahrzeug** – wenn kein Fahrzeug steckt (`evcs.active=false`), wird der Sollwert konsequent auf **0 W** gesetzt (verhindert „gecachten“ 11 kW Start beim Einstecken).
- EMS/EVCS: **SoC Freshness** – nach dem Einstecken wartet Zielladen auf eine frische SoC‑Aktualisierung (verhindert Berechnung mit Tage‑altem SoC).
- UI: Neue Diagnose/Hint: `NO_VEHICLE` + Zielladen Status **Fahrzeug nicht verbunden / warte auf SoC**.

## 0.6.142
- EMS/Speicher: **Bugfix Eigenverbrauch-Entladung** – wenn Tarif „günstig“ ist, aber Speicher-Netzladen durch Zeitfenster-Policy („tagsüber“) blockiert ist, darf der Speicher wieder **sauber entladen** (Netzbezug reduzieren).
- EMS/Speicher: **PV‑Reserve Override** – wenn Tarif-Netzladen durch PV‑Reserve/PV‑Forecast blockiert ist (Soll bleibt 0 W), wird Eigenverbrauchs‑Entladung nicht mehr fälschlich gesperrt.
- UI: Service‑Worker Cache‑Version erhöht.

## 0.6.141
- EMS/EVCS: **Tarif als Bonus** – Zeit‑Ziel Laden nutzt Preis‑Forecast (Fallback: Latest‑Start) und übersteuert Tarif‑Netzladesperren nur dann, wenn es sonst nicht bis zur Deadline reicht.
- EMS/EVCS: Neue Diagnose pro Ladepunkt: `goalTariffOverrideReason`.
- Hinweis: Default Policy ist jetzt `forecast` (für Legacy‑Verhalten: `chargingManagement.goalTariffOverrideMode=always` oder `goalTariffOverrideAlways=true`).

## 0.6.140
- EMS/EVCS: **Priorisierung (Start)** – Zeit‑Ziel Laden übersteuert Tarif‑Netzladesperren pro Ladepunkt, damit die Deadline zuverlässig erreicht wird (optional abschaltbar: `chargingManagement.goalTariffOverrideAlways=false`).
- UI (Installer/Diagnose): Im Status „Budget & Gates“ wird im Card **Gesamtbudget** jetzt auch der **Tarif‑Modus (Manuell/Automatik/Aus)** angezeigt.
- UI: Service‑Worker Cache‑Version erhöht (Update wird zuverlässig geladen).

## 0.6.139
- EMS/EVCS: **Failsafe Stale Meter** Fix – redundante Grid‑Power Quellen werden jetzt korrekt behandelt (mindestens eine frische Quelle reicht).
- EMS/EVCS: Neue Diagnose‑States: `chargingManagement.control.staleMeter`, `staleBudget`, `failsafeDetails`.
- UI: Status‑Info zeigt jetzt **Tarif Modus: Manuell**, wenn der Tarif auf manuell steht (sofort sichtbar).

## 0.6.138
- Historie: Jahresreport zeigt jetzt **alle Bereiche auf einer Seite** (Übersicht) – für sofortigen Gesamtüberblick.
- Historie: Reiter bleiben **optional** als Filter, um einzelne Bereiche separat zu betrachten.

## 0.6.137
- Historie: Neuer Jahresreport (Mehrjahres-Tabelle) mit Reitern **Aufsummiert / Erzeuger / Verbraucher / Batterien / Quoten**.
- Historie: Jahresreport öffnet sich direkt aus der Historie über den Button **Jahresreport**.

## 0.6.136
- EMS/EVCS: Zeit‑Ziel Laden – „Fertig um“ jetzt im 15‑Minuten Raster (00/15/30/45)
- EMS/EVCS: Zeit‑Ziel Laden – Wenn die Uhrzeit erreicht ist, wird die Deadline automatisch auf den nächsten Tag fortgeschrieben (tägliche Wiederholung)

## 0.6.135
- EVCS Bericht: Status‑Dot nutzt wieder den Standard‑Live‑Indikator (grün)
- EVCS Bericht: Zurück‑Button ergänzt (zur vorherigen Ansicht)

## 0.6.134
- EVCS Bericht: Tabellendaten werden wieder geladen (Header/Footer‑Wiring) + CSV‑Export Buttons funktionieren wieder

## 0.6.133
- EVCS Bericht (Wallbox Historie): nutzt jetzt den Standard‑Header mit Navigation und wird aus der Historie im gleichen Tab geöffnet (kein extra Browser‑Tab mehr)

## 0.6.132
- Admin/Installer: URL-Liste unter den Buttons entfernt (weniger Verwirrung bei Endkunden).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.131
- SmartHome VIS: Farbkreis/Colorwheel auf High-DPI/iOS korrigiert (Canvas-Rendering).
- SmartHome VIS: Kachel-Bedienung verbessert – Tippen öffnet Panel bei Jalousie + Raumthermostat; Long-Press öffnet Panel bei Detail-Kacheln (sonst Info-Toast).
- SmartHome VIS: Raumthermostat-Popover Layout feiner abgestimmt (zentraler Bereich etwas tiefer für bessere Lesbarkeit).

## 0.6.130
- Historie: Monats-/Jahresansicht – zukünftige Tage/Monate bleiben jetzt **leer (0)** und die Summen-Kacheln werden nicht mehr verfälscht.

## 0.6.129
- EMS/EVCS: Debug‑Anzeige (nur Installer) für **PV‑Überschuss (ohne EVCS)**: *Instant* + *5‑Minuten‑Ø* im Status „Budget & Gates“.

## 0.6.128
- EMS/EVCS: PV‑Überschussladen stabilisiert – PV‑Budget wird jetzt **ohne EVCS‑Eigenverbrauch** berechnet (NVP/Netz + EVCS) + 5‑Minuten‑Mittelwert.

## 0.6.127
- SmartHome VIS: Mobile‑Lesbarkeit verbessert – 1‑Spalten‑Layout unter 420px + Textgrößen‑Umschalter (Kompakt/Normal/Groß)
- SmartHome VIS: Long‑Press Info‑Toast (zeigt den vollen Gerätenamen + Raum/Funktion)

## 0.6.126
- SmartHome VIS: Kachel‑Titel sind auf Smartphones besser lesbar (2‑Zeilen‑Umbruch + Actions als Overlay)
- Lizenz‑Sperrseite: Klarer Hinweis bei abgelaufener Testlizenz (inkl. Ablaufdatum + optionaler System‑UUID)

## 0.6.125
- (Lizenz) Testlizenz (Tage) unterstützt: NW1T-<Tage>-... (Start/Resttage werden update‑sicher gespeichert)
- (Lizenz/Admin) Statusanzeige im Lizenz‑Tab: gültig / gesperrt / Test (Resttage)

## 0.6.124 (2026-02-08)

- Admin/Lizenz: Lizenz-Paket bereinigt.
- Lizenz ist update-sicher: Lizenzschlüssel bleibt in der ioBroker Instanz-Konfiguration erhalten.

## 0.6.123 (2026-02-07)
- Admin/Lizenz: Lizenzseite funktioniert jetzt auch in neueren ioBroker-Admin-Versionen zuverlässig (kein `servConn` erforderlich – socket.io Fallback).
- Admin/Lizenz: UUID-Anzeige im Admin weiter stabilisiert.

## 0.6.122 (2026-02-07)
- Admin/Lizenz: Lizenzseite wird jetzt im **ioBroker-Admin iFrame** geöffnet (servConn verfügbar) – die UUID wird wieder korrekt geladen/angezeigt.
- Admin/Lizenz: Navigation und UUID-Anzeige im Admin weiter stabilisiert.

## 0.6.121 (2026-02-07)
- Admin/Lizenz: Interne Wartung für UUID-gebundene Lizenzbehandlung.

## 0.6.114 (2026-02-03)
- Tarif/Speicher: Netzladen des Speichers ist jetzt **nur** bei günstigem Tarif erlaubt.
- Tarif/Speicher: Ausnahme zur Tages-Sperre – wenn zeitvariables Netzentgelt im **NT** ist, darf auch außerhalb des Zeitfensters geladen werden (weiterhin nur bei günstigem Tarif).
- Tarif/VIS: Status-Text vereinfacht – keine Uhrzeiten mehr; tagsüber wird **„Eigenverbrauchsoptimierung aktiv“** angezeigt.

## 0.6.113 (2026-02-03)
- Tarif/Speicher: Netzladen des Speichers wird jetzt quartalsabhängig zeitlich begrenzt (Q1/Q4: 18:00–06:00, Q2/Q3: 21:00–06:00).
- Tarif/Speicher: Ausnahme bleibt aktiv – wenn zeitvariables Netzentgelt im NT ist, darf der Speicher trotzdem laden.
- Tarif/VIS: Status-Text zeigt bei günstigem Tarif an, wenn Speicher-Netzladen wegen Zeitfenster gesperrt ist.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.112 (2026-02-03)
- SmartHome VIS: Favoriten können jetzt vom Endkunden direkt in der Kachel per Stern ★/☆ umgeschaltet werden (lokal pro Browser, überschreibt optionale Installer-Defaults).
- SmartHome VIS: Favoriten-Filter/Sortierung berücksichtigt Endkunden-Favoriten.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.111 (2026-02-03)
- SmartHome VIS: Favoriten-Chip ist jetzt immer sichtbar (deaktiviert, wenn keine Favoriten gesetzt sind).
- SmartHome VIS: Neuer Chip „★ zuerst“ – Favoriten in Räumen nach oben sortieren (persistiert pro Browser).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.110 (2026-02-03)
- SmartHome Tooltip/Popover: Quick‑Presets (Dimmer: 0/25/50/75/100, Jalousie: 0/50/100).
- SmartHome Tooltip/Popover: Schritt‑Tuning (1/5/10) + +/- Buttons für Dimmer/Jalousie (persistiert pro Browser).
- SmartHome Tooltip/Popover: Schreib‑Feedback (Senden/OK/Fehler) für Slider‑Commit, Presets, +/- und Jalousie‑Tasten.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.109 (2026-02-03)
- SmartHome Tooltip/Popover: Optional „Live‑Vorschau“ für Dimmer/Jalousie (gedrosselt beim Ziehen, finaler Commit beim Loslassen).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.108 (2026-02-03)
- SmartHome Tooltip/Popover: Slider (Dimmer/Jalousie) deutlich touch‑freundlicher (größerer Track/Thumb) + Progress-Fill.
- SmartHome Tooltip/Popover: Live-Wert beim Ziehen (Anzeige) bleibt erhalten, Commit weiterhin erst beim Loslassen.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.107 (2026-02-03)
- SmartHome Tooltip/Popover: Thermostat-Gauge: +/- Buttons unterhalb des Reglers (übersichtlicher, weniger verdeckt).
- SmartHome VIS: Fehlerzustände (DP-Lese/Schreib-Fehler) werden in Kacheln deutlicher hervorgehoben.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.106 (2026-02-03)
- SmartHome Tooltip/Popover: Thermostat-Gauge korrigiert (spiegelverkehr wie Referenz: Bogen oben) + Gradient-Darstellung gefixt.
- SmartHome Tooltip/Popover: Hintergrund-Scroll wird gesperrt solange ein Tooltip offen ist (kein "Seite rauf/runter sliden" mehr).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.105 (2026-02-03)
- NexoLogic: Neue Regelungs-Bausteine (Heizung): PI-Raumtemperaturregler (Anti‑Windup + zyklisches Update), Sommer/Winter‑Umschalter, Fensterkontakt‑Sperre, Heizkurve (Vorlauf‑Soll) und 2‑Punkt‑Mischer (Impuls AUF/ZU).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.104 (2026-02-03)
- NexoLogic UI: Baustein-Palette als einklappbare Ordner (Kategorien) für mehr Übersicht.
- NexoLogic UI: Schnell-Button „SmartHome‑Config“ (Sprung zurück zur SmartHome‑Konfiguration).
- NexoLogic: Neue Regelungs-Bausteine: Raumtemperaturregler (2‑Punkt), Raumtemperaturregler (P) und PWM (Zeitproportional).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.103 (2026-02-02)
- NexoLogic: Neue Bausteine: Flanke steigend/fallend/beide, Treppenlicht, Nachlauf, Impulsverlängerer.
- NexoLogic: Zeitprogramm (Wochen-Schedule + optionaler Feiertag-Eingang A; Feiertage standardmäßig wie Sonntag).
- NexoLogic: Zähler-Bausteine: Impulszähler, Up/Down-Zähler, Betriebsstunden.
- NexoLogic: Skalierung/Mapping (Presets 0..255↔0..100%, 0..10V↔0..100%).
- NexoLogic: SmartHome-Szene auslösen (Szene-Auswahl + Trigger-Flanke, optionaler DP-Fallback).
- Backend: NexoLogic Runtime-Engine an Editor-Blocktypen/Parameter angepasst (u. a. dp_in cast, cmp/hyst, clamp-Params, dp_out Throttle mit Pending-Write).
- UI: Service-Worker Cache-Version erhöht, damit Updates sofort sichtbar sind.

## 0.6.102 (2026-02-02)
- NexoLogic: Mehrere Logikseiten (Pages) im Editor inkl. Umbenennen, Duplizieren und Löschen.
- NexoLogic: Jede Logikseite kann aktiviert/deaktiviert werden (Engine ignoriert deaktivierte Seiten).
- NexoLogic UI: Editor-Layout breiter + Board höher.
- NexoLogic UI: Zoom (Buttons + Strg/Cmd + Mausrad) inkl. Reset (100%) und Fit-to-View.
- Backend: Fix beim Speichern der Logik-Konfiguration (DeepMerge), damit „Speichern“ wieder zuverlässig funktioniert.
- UI/Text: Keine Referenzen auf externe Systeme/Editoren in der Oberfläche/Files.

## 0.6.99 (2026-02-01)
- SmartHome VIS: Kopftext und „Zurück zur Live‑Ansicht“ entfernt (Header ist bereits vorhanden).
- SmartHome VIS: Bedien‑Tooltip/Popover (Icon/⋯) für Dimmer, Jalousie und Raumthermostat (RTR):
  - RTR: Halbkreis‑Slider (Drag) für Solltemperatur.
  - Dimmer/Jalousie: großer Slider im Bedienpanel.
- SmartHome VIS: Slider generell größer/Touch‑friendly.
- UI: Service‑Worker Cache-Version erhöht, damit Änderungen im Browser sofort sichtbar sind.

## 0.6.98 (2026-02-01)
- SmartHomeConfig: Icon-Auswahl überarbeitet (kein Überlappen mehr in mehrspaltigen Karten). Benutzerdefinierte Icons/Emoji optional.
- SmartHomeConfig: UI-Begriffe konsistent auf Deutsch gesetzt (u. a. Vorlage, Nur Anzeige, Sollwert min/max, DP-Test: Lesen/Schreiben).
- UI: Service-Worker Cache-Version erhöht, damit die Änderungen im Browser sofort sichtbar sind.

## 0.6.97 (2026-02-01)
- SmartHome VIS: Hintergrund an das Standard-VIS-Design angepasst (kein blaues Panel mehr).
- SmartHome VIS: Raum-Header jetzt mit kleiner Summary (z. B. Temperatur/Luftfeuchte), wenn entsprechende Sensoren vorhanden sind.
- SmartHomeConfig: Kachel-Reihenfolge per Drag&Drop (Handle) sowie über „Reihenfolge“ (Positions-Index) steuerbar.
- Backend: Geräte-Order wird aus der SmartHomeConfig in die SmartHome-VIS übernommen.

## 0.6.96 (2026-02-01)
- SmartHome VIS: Raum-Sektionen (statt leerer Demo-Ansicht) + Kacheln im „Apple Home“-ähnlichen Look (Glassmorphism) inkl. dynamischer Icons (An/Aus).
- SmartHomeConfig: Kachelgröße (S/M/L/XL) auswählbar + Icon-Picker/Vorschau, damit die Einrichtung schneller und konsistenter wird.
- UI: Service-Worker Cache-Version erhöht, damit SmartHome-Updates sofort sichtbar sind.

## 0.6.95 (2026-02-01)
- SmartHome: VIS-Header/Tabs an die Haupt-UI angeglichen (LIVE/HISTORY/EVCS/SMARTHOME) und Empty-State verbessert (klarer Hinweis bei deaktiviertem SmartHome bzw. wenn keine Kacheln konfiguriert sind).
- SmartHomeConfig: Hinweis ergänzt, wenn SmartHome deaktiviert ist (damit klar ist, warum die VIS-Seite leer bleibt).
- Backend: SmartHomeConfig ist jetzt installer-managed und bleibt über Adapter-Neustarts erhalten. Außerdem folgt SmartHome-Aktivierung zuverlässig dem Admin-Instanzschalter.

## 0.6.93 (2026-02-01)
- SmartHomeConfig: Validator-Panel + Fehler-/Warnliste ergänzt. Betroffene Räume/Funktionen/Geräte werden direkt im Editor markiert, damit das Einrichten stabiler wird.
- UI: Service-Worker Cache-Version erhöht, damit Updates zuverlässig im Browser ankommen.

## 0.6.91 (2026-01-31)
- Tarif: PV-Saisonprofil KI ist jetzt immer aktiv (Standard). Manuelle Quartals-Basisfaktoren sind optional (Feintuning) und werden in der UI standardmäßig eingeklappt.
- UI: Service-Worker Cache-Version erhöht, damit Updates zuverlässig im Browser ankommen.

## 0.6.90 (2026-01-31)
- Tarif: KI-Automatik für das PV-Saisonprofil. Wenn aktiv, wird der Saisonfaktor automatisch anhand der PV-Forecast-Stärke angepasst, damit Kunden nichts manuell feinjustieren müssen (manuelle Quartalswerte bleiben verfügbar).

## 0.6.86 (2026-01-30)
- Tarif/Netzentgelt: Standard (ST) hebelt die dynamische Tarif-Logik nicht mehr aus. Nur NT/HT wirken als Overlay (NT gibt Netzladen frei; HT sperrt). Quartale ohne NT/HT können durch Deaktivieren der NT/HT-Fenster (Von=Bis / 00:00–00:00) als 24/7 Standard betrieben werden.

## 0.6.85 (2026-01-30)
- Tarif: Zeitvariables Netzentgelt (HT/NT) unterstützt jetzt ein quartalsbasiertes Zeitraster (Q1..Q4). NT/HT-Zeiten können pro Quartal gesetzt werden; die restliche Zeit gilt als Standard.

## 0.6.84 (2026-01-30)
- UI: In der Tarif-/Optimierungsansicht wird jetzt sichtbar, wenn Speicher-Netzladen bewusst durch die PV‑Reserve (Forecast‑Headroom) geblockt wird (Transparenz statt „Bug“-Eindruck).

## 0.6.83 (2026-01-30)
- Tarif: PV‑Forecast wird im Nacht-/NT‑Netzladen jetzt auch dann berücksichtigt, wenn keine Speicherkapazität (kWh) gemappt ist (konservative Kapazitäts‑Schätzung als Fallback). Dadurch wird der Speicher bei erwarteter PV‑Erzeugung nicht mehr „blind“ auf 100% aus dem Netz geladen.

## 0.6.82 (2026-01-30)
- UI: Eintrag „Lastspitzenkappung“ in den Endkunden-Einstellungen ausgeblendet (Kundenansicht aufgeräumt).

## 0.6.81 (2026-01-30)
- Tarif: Zeitvariables Netzentgelt (HT/NT) als Zusatz in den Dynamik-Tarif Einstellungen (Toggle + Zeitfenster).
- Logik: Im NT-Fenster dürfen EVCS aus dem Netz laden und der Speicher darf gezielt laden. In HT/zwischen läuft der Speicher wieder in der normalen Eigenverbrauchsoptimierung; EVCS Netzladen ist gesperrt (Ziel-Laden kann weiterhin pro Ladepunkt übersteuern).

## 0.6.80 (2026-01-28)
- Performance: chargingManagement tick massiv beschleunigt bei vielen Ladepunkten (z.B. 50+). Lokale setState-Updates werden jetzt dedupliziert/gebündelt und asynchron mit begrenzter Parallelität geschrieben (kein "await setState"-Bottleneck mehr).
- Performance: Lokale Reads nutzen primär den in-memory stateCache (Fallback nur bei Cache-Miss), wodurch DB-Reads pro Tick stark reduziert werden.
- Performance: Noisy Diagnostik-Counter (z.B. idleMs/meterAgeMs/statusAgeMs + debug States) werden automatisch gedrosselt, damit VIS/DB nicht mit Updates geflutet wird.

## 0.6.79 (2026-01-28)
- Performance: DatapointRegistry.upsert cached Unit-Detection/Subscriptions und primed Foreign-States nur einmal (fixes sehr langsame chargingManagement-Ticks bei vielen EVCS/Ladepunkten, z.B. 50 Stationen).
- UI: EVCS/Ladestation Modal öffnet wieder zuverlässig mit einem Klick (pointerdown-Handling, damit Klicks bei häufigen SSE-Re-Renders nicht „verloren“ gehen).

## 0.6.78 (2026-01-28)
- Chore: Automatisches Version-Bumping hinzugefügt (scripts/bump-version.js). Optionaler Git pre-commit Hook (.githooks) erhöht die Patch-Version bei jedem Commit mit echten Änderungen automatisch.

## 0.6.77 (Simulation v0.4.x)
- Simulation: angepasst an nexowatt-sim v0.4.x (Szenario-Katalog + Start/Stop/Reset direkt in der Simulation-UI).
- Simulation: Sim-Instanz kann beim Aktivieren automatisch eingeschaltet werden (common.enabled=true) und wird beim Deaktivieren optional wieder zurückgesetzt.
- Simulation: Backup/Restore zusätzlicher VIS-Settings für reproduzierbare Tests (z.B. dynamicTariff, tariffMode, storagePower).

## 0.6.76 (EVCS Report Fix)
- EVCS Report/Abrechnung: kWh-Berechnung korrigiert, wenn Historie-Buckets lückenhaft sind (z.B. 10‑Minuten Logging bei 2‑Minuten Aggregation). kWh pro Tag entspricht jetzt wieder den Influx/Historie-Werten (keine Faktor‑5 Unterzählung mehr).

## 0.6.75 (Simulation/Admin + Historie)
- Admin: Neuer Reiter "Simulation" in den Instanzeinstellungen (öffnet Simulation-Steuerung per Link /adapter/nexowatt-ui/simulation.html?instance=<INSTANZ>).
- Simulation: 1-Klick Aktivieren/Deaktivieren inkl. Backup/Restore der App-Center Konfiguration + automatischem DP-Mapping für nexowatt-sim (Grid/PV/Speicher/Tarif/EVCS).
- Historie: Dunkler OpenEMS-ähnlicher Stapel-Chart (optional), SoC rechts 0..100% (0 unten, 100 oben), Tagesansicht baut sich progressiv auf (kein leerer Rest des Tages), kWh-Kacheln bevorzugen Counter-Differenzen (exakt) statt kW-Integration.
- Speicher: Tarif-Netzladen stabilisiert (Anti-Ping-Pong) durch Headroom-Berechnung ohne Rückkopplung.

## 0.6.74 (EMS/Tarif Auto‑KI)
- Backend: Automatik/Forecast: Die „günstig“-Schwelle (min+Band) wird am wirksamen Durchschnittspreis (Ø) gekappt. Ergebnis: Speicher lädt im Auto‑Tarifmodus nicht mehr bei Preisen > Ø.
- Backend: „Nächstes günstiges Fenster“ (naechstesGuensigVon/Bis) nutzt nun dieselbe effektive Schwelle wie die Entscheidung (Forecast/Status sind konsistent).
- Optional (Expert‑Patch): `tariff.autoCheapCapToAvg=false` deaktiviert das Kappen.

## 0.6.73
- UI: EVCS/Ladestation Modal – mobile responsive improvements (smaller gauge, safe-area padding, better scrolling)

## 0.6.72 (EMS/Tarif + App-Center)
- Backend: Tarif-Netzladen nutzt jetzt eine PV‑Reserve (Forecast‑basiertes Headroom). Ergebnis: Wenn PV‑Erzeugung zu erwarten ist, wird der Speicher im günstigen Tarif-Fenster nicht mehr automatisch bis 100% aus dem Netz vollgeladen, sondern bis zu einem dynamischen SoC‑Cap (abhängig von Forecast + Kapazität).
- App‑Center: Kapazität (kWh) im Single‑Speicher ist wieder sauber nutzbar (Eingabefeld sichtbar, Help-Text gestapelt).

## 0.6.71 (EMS/Storage)
- Backend: NVP-Balancing Deadband in der Speicherregelung korrigiert (Eigenverbrauch/Tarif). Kleine Entlade-Sollwerte werden nicht mehr durch das allgemeine 100W-Zero-Band auf 0 gesetzt → weniger Rest-Netzbezug bei aktivem Entladen.
- Backend: Tarif-NVP-Regelung übernimmt standardmäßig die Eigenverbrauch-Zielwerte (selfTargetGridImportW/selfImportThresholdW), sofern keine tarif-spezifischen Werte gesetzt sind.

## 0.6.70 (UI/Tarif Forecast)
- UI: Preis-Forecast Tooltip öffnet jetzt auch per Klick auf die gesamte Tarif-/Optimierungskachel (wie bei der Ladestation).
- UI: EMS-Steuerung der Optimierungskachel liegt nun auf dem Badge "EMS" (Button), damit der Kachel-Klick für Forecast frei ist.
- UI: Chart-Linie geglättet (Auto-Aggregation von 15‑Minuten Slots auf 60‑Minuten für bessere Lesbarkeit).
- UI: Farbliche Segmentierung (günstig/neutral/teuer) über valide Schwellenwerte oder Auto-Quantile-Fallback.
- UI: Browser-Standard-Tooltip (title) am 📈-Icon entfernt (kein Doppelklick mehr nötig auf Touch-Geräten).
- UI: Service-Worker Cache-Version erhöht, damit Updates zuverlässig im Browser ankommen.

## 0.6.69 (UI/Tarif)
- UI: Tooltip in der Tarif-/Optimierungskachel (📈) zeigt den Preisverlauf "heute" als Chart (Forecast).
- UI: Tooltip-Positionierung/Anzeige korrigiert; Service-Worker Cache-Version erhöht.

## 0.6.59 (Mobile/UI/Weather)
- UI: Status-KPIs auf iPhone/kleinen Displays sauber responsiv (stabile 2-Spalten-Kacheln), Schnellsteuerung als 1-Spalte.
- UI: KPI-Zeilen ueberlaufsicher; Gesamtenergien werden automatisch in kWh/MWh/GWh formatiert.
- Wetter: Kachel wird nur angezeigt, wenn Wetterdaten wirklich verfuegbar sind; zusaetzliche kompakte "Morgen"-Zeile.
- Backend: Open-Meteo Daily-Forecast (Morgen) -> neue States: weatherTomorrowMinC/MaxC/PrecipPct/Code/Text.
- Backend: Gesamtenergie-States werden bei Neuinstallation mit 0 initialisiert (keine (null)-Anzeige).

## 0.6.58 (Energiegesamtwerte)
- Gesamtenergie-States (PV/Verbrauch/Netz/EV/CO2 etc.) als eigene Adapter-States; Influx-Logging vorbereitet.
- UI: Anzeige der Gesamtenergien ueber dedizierte Keys (nicht mehr ueber externe EMS-Adapter notwendig).

## 0.6.55 (Admin UI)
- Admin: Legacy EMS-/Admin-Konfigurationsreiter entfernt (EMS/Datenpunkte/§14a/Historie/Ladepunkte werden ausschließlich im App-Center konfiguriert).
- Admin: Diagnose-Einstellungen bleiben verfügbar (Diagnose aktiv, Log-Level, Log-/State-Intervalle, JSON-Länge, Diagnose-States schreiben).
- Admin: Entfernt: Leistungseinheit, "Tarif jetzt" und "Erweiterte Reiter anzeigen".

## 0.6.47 (Hotfix)
- App-Center (installer.configJson) ist Source-of-Truth für installer-verwaltete Konfigbereiche (datapoints/settings/vis/emsApps/…). Admin-Reste beeinflussen EMS/Energiefluss/Tarif nicht mehr.
- UI: Historie Tooltip-Ausrichtung verbessert + doppelte SSE-Verbindung entfernt.

## 0.6.41 (EMS/Tarif)
- Fix: Speicherregelung wird bei aktivem dynamischem Tarif wieder automatisch aktiviert (Auto-Enable), damit Be-/Entladung im Farm-/Einzelspeicher nicht stehen bleibt.

## 0.6.43
- Fix: Historie im Speicherfarm-Modus nutzt Farm-Gesamtwerte für Laden/Entladen/SoC (SoC wieder sichtbar).

## 0.6.38 (Speicherfarm/PV)
- Speicherfarm: PV-Leistung (DC) wird automatisch aus `nexowatt-devices` (aliases.r.pvPower) übernommen, wenn im Farm-Storage kein PV-Datenpunkt gemappt ist. Dadurch wird die PV-Summe im Farm-Modus vollständig (z.B. zwei Hybrid-Systeme → Summe statt nur ein Wert).

## 0.6.37 (EMS/Tarif)
- Tarifregelung: SoC-basierte Ladehysterese im "günstig"-Fenster. Laden startet nur bei SoC <= 98% und stoppt bei SoC >= 100% (dann 0 W / Speicher ruht solange günstig). Verhindert Dauer-Ladeanforderungen bei vollem Speicher.

## 0.6.34 (UI/EMS)
- Energiefluss: Gebäudeverbrauch kann jetzt aus NVP (Bezug/Einspeisung) + PV‑Summe + Speicher‑Laden/Entladen abgeleitet werden (Fallback, wenn kein Hauszähler gemappt ist).
- PV‑Summe (Auto): Wenn kein PV‑Datenpunkt gemappt ist, wird PV aus `nexowatt-devices` (Kategorie `PV_INVERTER`, `aliases.r.power`) summiert.
- Speicherfarm: DC‑PV‑Summe (`storageFarm.totalPvPowerW`) wird im Farm‑Modus zur PV‑Summe addiert (für abgeleitete Gebäude‑Last & PV‑Anzeige).
- Derived‑States: Zusätzliche Diagnose‑States für PV (AC/DC/Total) und Inputs/Qualität.

## 0.6.32 (UI/EMS)
- Speicherfarm: Online/Offline-Erkennung über Device-Connected/Offline-Signale + Heartbeat-Zeitstempel. SoC/Leistung haben keinen UI-Timeout mehr (letzter Wert bleibt sichtbar, solange das Gerät online ist).

## 0.6.28 (UI)
- Historie (Tag): SoC-Achse startet jetzt auf der kW-0-Linie (0% auf der Mittellinie, 100% oben) – SoC nutzt nur den oberen Chartbereich.

## 0.6.26 (UI)
- Historie (Tag): Achsen optisch überarbeitet (mehr Top‑Padding, Achsentitel kW/% oberhalb der Skalen, keine „gestapelten“ Eck‑Labels, bessere Lesbarkeit).

## 0.6.23 (UI/EMS)
- Speicherfarm: Energiefluss nutzt im Farm‑Modus konsequent die Farm‑Summen (SoC/Charge/Discharge) auch wenn Einzel‑Datenpunkte gemappt sind.
- Energiefluss (Farm‑Modus): Batterie‑Richtung/Anzeige basiert auf dem dominanten Netto‑Fluss (Entladen−Laden bzw. Laden−Entladen) – verhindert Fehlanzeige bei Erhaltungsladung einzelner Speicher.
- PWA: Cache-Version erhöht (sicherer Frontend‑Reload nach Update).

## 0.6.22 (UI/EMS)
- Speicherfarm: Robustere Auswertung der Istwerte (Signed / Laden / Entladen) inkl. Parsing von numerischen Strings (z.B. „4,62 kW“) und kW→W‑Konvertierung anhand der DP‑Unit.
- Energiefluss (Farm‑Modus): Anzeige nutzt SoC‑Durchschnitt (Ø) statt Median; DC‑PV‑Farm‑Summe wird im Farm‑Modus zur PV‑Erzeugung addiert.
- Energiefluss: Speicherfarm‑Aktivierung wird zusätzlich über `storageFarm.enabled` erkannt (robuster bei Config/Hot‑Reload).

## 0.6.7 (UI)
- LIVE: Schnellsteuerung – Thermik-Kachel zeigt jetzt ein Icon (visuell konsistent zu den anderen Kacheln).

## 0.6.5 (UI)
- App-Center: Thermik – Eingabefelder/Selects nutzen jetzt das einheitliche Dark-Theme (optisch konsistent zu anderen App-Center Seiten).
- LIVE: Quick-Control Modal – Layout überarbeitet (Gauge rechts, Boost unten), responsiv ohne Überlappungen.

## 0.6.3 (UI)
- App-Center: Thermik-Tab wieder sichtbar (Fix: falscher Config-Ref `config.*` → `currentConfig.*`).
- LIVE: Thermik-Schnellsteuerung wird jetzt bereits angezeigt, wenn die Thermik-App **installiert** ist (auch wenn „Aktiv“ aus ist) – passend zur Logik der anderen Schnellsteuerungs-Kacheln.
- LIVE: Energiefluss – optionale Verbraucher/Erzeuger-Slots sind jetzt klickbar, sobald sie QC/Steuerung unterstützen (öffnet Quick-Control wie bei der Ladestation).

## 0.6.2 (UI)
- LIVE: Thermik/Verbraucher – pro steuerbarem Verbraucher‑Slot wird automatisch eine Schnellsteuerungs‑Kachel erzeugt (öffnet die Schnellsteuerung/Quick‑Control), sobald die Thermik‑App aktiv ist.
- App‑Center: Thermik – Geräte‑Tabelle/Parameter je Slot ist jetzt sauber beschriftet und in verständliche Gruppen gegliedert (Variante, Schwellwerte, Timing, Boost, Setpoint/Leistung/SG‑Ready).

## 0.5.94 (EMS)
- EMS: Speicher – maxChargeW/maxDischargeW sind jetzt standardmäßig **unbegrenzt** (0 = kein Software‑Clamp). Dadurch wird die Entlade-/Ladeleistung nicht mehr künstlich auf 5 kW begrenzt, sofern der Nutzer kein Limit setzen will.
- EMS: Ladepark – „Boost“ überschreibt jetzt die Tarif‑Sperre und ignoriert das Tarif‑Budget‑Limit (Boost = bewusst „jetzt laden“). Nur harte Caps (z.B. §14a, Phasen-/Netzlimits, Stationsgruppen) begrenzen weiterhin.
- EMS: §14a – ohne Aktiv‑Signal wird §14a jetzt **standardmäßig als inaktiv** behandelt. Zusätzlich neues Experten‑Flag „Ohne Aktiv‑Signal als aktiv behandeln“ für installationsspezifische Fallbacks.

## 0.5.93 (EMS)
- EMS: Tarif-Speicherentladung korrigiert: Die in der VIS eingestellte Speicher-Leistung begrenzt nur noch das Tarif-Laden (Netzladen im günstigen Fenster). Die Entladung regelt am Netzverknüpfungspunkt (NVP) und wird nicht mehr durch diesen Nutzerwert gedeckelt (nur maxDischargeW wirkt).
- UI: Tarif-Statusmeldungen vereinfacht ("bis NVP≈0" entfernt).

## 0.5.90 (UI)
- LIVE: Schnellsteuerungs-Kacheln (Schwellwerte/Relais/BHKW/Generator) werden automatisch ausgeblendet, wenn die entsprechende App im App‑Center deaktiviert ist (nicht installiert oder „Aktiv: Aus“).
- LIVE: Relais-Kachel – Zähler/Status-Anzeige korrigiert.
- PWA: Cache-Version erhöht.

## 0.5.89 (UI)
- UI: Energiefluss-Monitor zeigt Leistungswerte jetzt immer in kW (statt Watt) – inkl. optionaler Verbraucher/Erzeuger.
- PWA: Cache-Version erhöht.

## 0.5.88 (Admin UI)
- Admin: Erweiterte Konfigurations-Reiter standardmäßig ausgeblendet (Datenpunkte/§14a/EMS*/Historie/Ladepunkte).
- Admin: Neuer Schalter in „Allgemein“ → „Erweiterte Reiter anzeigen“ zum temporären Einblenden.
- Safety: Inhalte der ausgeblendeten Reiter bleiben zusätzlich per Guard/Gating blockiert (auch wenn ein Reiter z. B. über gespeicherte UI-Auswahl / Direktaufruf angesprungen wird).

## 0.5.86 (Hotfix)
- App‑Center: „Speicherfarm“ (MultiUse Speicher) ist jetzt vollständig über das App‑Center nutzbar (Installieren/Aktivieren + Konfiguration).
- Backend: emsApps‑Normalisierung & Legacy‑Flag‑Mapping korrigiert (u.a. IDs **peak**/**storagefarm**) → Apps werden nach Speichern/Neustart zuverlässig aktiviert.
- PWA: Cache‑Version erhöht.

## 0.5.85 (Hotfix)
- App‑Center: Datensicherung (Export/Import) im Reiter „Status“.
  - Export erzeugt JSON mit kompletter Installer‑Konfiguration (inkl. Datenpunkt‑Zuordnungen).
  - Import stellt Konfiguration wieder her und startet EMS neu.
  - Wiederherstellung aus `0_userdata.0` per Button.
- Automatisches Backup: Bei jedem „Speichern“ wird zusätzlich ein Backup in `0_userdata.0.nexowattVis.backupJson` geschrieben (überlebt Deinstallation/Neuinstallation).
- PWA: Cache‑Version erhöht.

## 0.5.84 (Hotfix)
- Energiefluss: Erzeugungs-Flussrichtung ist jetzt fest (PV/Erzeuger/BHKW/Generator laufen immer **zum Gebäude**; kein Richtungswechsel mehr durch Vorzeichen-Jitter um 0W).

## 0.5.83 (Hotfix)
- App‑Center (BHKW/Generator): Options‑Checkboxes korrigiert (keine Überlappungen mehr). Checkbox‑Styling wird jetzt korrekt am **Input** angewendet, das Label bleibt flexibel.
- App‑Center (BHKW/Generator): kleine Layout‑Politur für die kompakte Optionen‑Zeile (bessere Ausrichtung/Lesbarkeit).

## 0.5.82 (Hotfix)
- OCPP Auto-Zuordnung: Leistung (W) bevorzugt jetzt **meterValues.Power_Active_Import** (statt z.B. lastTransactionConsumption).
- OCPP Auto-Zuordnung: Energie (kWh) bevorzugt jetzt **meterValues.Energy_Active_Import_Register**.
- OCPP Scoring: lastTransactionConsumption wird für Power/Energy stark abgewertet.

## 0.5.81 (Hotfix)
- UI: Energiefluss – BHKW/Generator werden jetzt auf dem **unteren linken Außenring** platziert (sauberer Kreis / keine „Innen“-Überlappungen).
- UI: Energiefluss – BHKW/Generator in **Speicher-Grün** (Ring + Flow-Linie), sichtbar nur bei konfiguriertem Leistungs‑Datenpunkt (W).
- App‑Center: BHKW/Generator – Konfigurationskarten nutzen die verfügbare Breite (Grid ohne leere Spalten) → bessere Lesbarkeit.
- App‑Center: BHKW/Generator – Feld‑Hinweise werden unter den Eingaben angezeigt (kein gequetschtes/überlappendes Layout mehr).

## 0.5.80 (Hotfix)
- Fix (OCPP): Auto-Erkennung unterstützt jetzt das Standard-Pfadlayout des ioBroker OCPP-Adapters (`ocpp.<inst>.<chargePointId>.<connectorNo>...`).
- Fix (OCPP): Heuristik – Connector **0 (Main)** wird bei vorhandenen nummerierten Konnektoren ignoriert (kein doppelter Ladepunkt), Online/Availability-IDs werden aus Main an die Ports vererbt.
- Improve (OCPP): Scoring bevorzugt "Import"-Leistung/Energie (typische OCPP-State-Namen: `Power_Active_Import`, `Energy_Active_Import_Register`).

## 0.5.79 (Hotfix)
- App‑Center: Reiter **BHKW** und **Generator** auf das neue NexoWatt‑Design umgestellt (Config‑Cards statt Legacy‑Layout).
- App‑Center: In BHKW/Generator können Datenpunkte jetzt **wie in den anderen Reitern** über „Auswählen…“ gesucht/zugeordnet werden (inkl. Live‑Badge/Validierung).
- Energiefluss: BHKW/Generator werden angezeigt, sobald **Leistungs‑Datenpunkt (W)** gesetzt ist (Start/Stop bleibt optional für reine Visualisierung).
- PWA: Cache‑Version erhöht.

## 0.5.78 (Hotfix)
- App-Center: **OCPP Auto-Erkennung** im Reiter „Ladepunkte“ (Button „Automatische Erkennung (OCPP)“)
  - erkennt Chargepoints/Connectoren aus ioBroker-OCPP-States,
  - setzt `evcsCount` automatisch,
  - legt `evcsList` inkl. Datenpunkt-Zuordnungen (Power/Status/Online/Setpoints) vor.
- App-Center: Button „Suche Datenpunkte (OCPP)“ – füllt nur **leere** Felder in bestehenden Ladepunkten automatisch.
- Backend: neuer Endpoint **`/api/ocpp/discover`** (Discovery + Mapping-Vorschläge).
- PWA: Cache-Version erhöht.


## 0.5.77 (Hotfix)
- UI: Energiefluss – BHKW & Generator werden links unten zwischen Netz und Batterie dargestellt (nur sichtbar, wenn im App‑Center konfiguriert inkl. Leistungs‑Datenpunkt).
- UI: Energiefluss – Summenleistung über alle aktivierten BHKW/Generator‑Geräte.
- PWA: Cache‑Version erhöht, damit Clients die neue VIS zuverlässig laden.

## 0.5.76 (Hotfix)
- Fix: Energiefluss-Statuszeile zeigt **keinen Platzhalter** mehr ("Optimierung: —") – die Zeile erscheint nur, wenn es eine sinnvolle Meldung gibt.
- Fix: TarifVis Local-States (`tarif.statusText`, `tarif.state`) werden in der UI **auch ohne Admin-Datenpunktmapping** sauber synchronisiert.

## 0.5.75 (Hotfix)
- Fix: Energiefluss – Erzeuger nur im oberen linken Bereich (unterer Bereich bleibt frei für Generator/BHKW).
- Fix: Energiefluss – Erzeuger-Kreise gleiche Größe wie Verbraucher.
- Fix: Energiefluss – Erzeuger-Flussrichtung (Animation) zeigt zum Gebäude/PV (kein invertierter Flow mehr).

## 0.5.74 (Hotfix)
- Fix: TarifVis Status-Text – `tarifStateTxt` korrekt gesetzt (keine Warnungen in `tick()` mehr).
- Fix: Charging-Management – `chargingManagement.wallboxes.*.charging` wird immer als **boolean** geschrieben (kein Type-Warn-Spam mehr).
- UI: Energiefluss – Erzeuger-Positionierung gespiegelt zu Verbrauchern → sauberer Kreis/gleichmäßigere Abstände.

## 0.5.61 (Phase 6.0.1)
- EVCS: Übersicht skaliert auf bis zu **50 Ladepunkte** – Kachelansicht mit Leistung/SoC/Status.
- EVCS: Klick auf Kachel öffnet einen **Tooltip‑Dialog pro Ladepunkt** (alle Details/Settings: Modus, Ziel‑Laden, Aktiv/Regelung, RFID, Station/Boost).
- Fix: Zeit‑Ziel‑Laden – **Uhrzeit‑Picker stabilisiert** (keine unbedienbaren „Focus‑Drops“ durch Live‑Updates).
- App‑Center/Admin: `evcsCount` Limit auf **50** erhöht.


## 0.5.60 (Phase 6.0)
- EMS (Lademanagement): **Smarte Ziel‑Strategie** für Zeit‑Ziel‑Laden
  - nutzt Tarif‑Freigabe (falls vorhanden) weiterhin als Standard‑Schutz vor unerwünschtem Netzladen,
  - **übersteuert** die Tarif‑Sperre pro Ladepunkt bei knappen Deadlines (Restzeit/Dringlichkeit), damit ein Ziel zuverlässig erreicht werden kann,
  - erlaubt in klar „günstigen“ Preisphasen ein moderates **Vorladen** (Cap‑Erweiterung), um spätere teure Phasen zu entlasten.
- App‑Center: neue globale Auswahl **„Ziel‑Strategie (Zeit‑Ziel Laden)“** im Reiter „Ladepunkte“ (Standard/Smart).
- EMS: neuer Diagnose-State je Ladepunkt: **goalTariffOverride**.

## 0.5.59 (Phase 5.9)
- EMS: **Zeit‑Ziel‑Laden (Depot-/Deadline‑Laden)** je Ladepunkt (goalEnabled/goalTargetSocPct/goalFinishTs/goalBatteryKwh) inkl. berechneter Diagnose‑States (goalActive/remaining/required/desired/shortfall/status).
- EMS: Priorisierung in der Verteilung: **boost > Ziel‑Laden > charging > waiting**, Round‑Robin greift nicht für Ziel‑Laden.
- VIS: EVCS‑Seite + Ladepunkt‑Dialog: Endkunden‑UI für Ziel‑Laden (Toggle‑Buttons + Ziel‑SoC + Fertig‑Uhrzeit + optional kWh).
- Backend: /api/set (scope=ems) akzeptiert Ziel‑Laden Keys (evcs.X.goalEnabled/goalTargetSocPct/goalFinishTs/goalBatteryKwh); UI-State‑Prime erweitert.
- Web: neue `.nw-input` Styles für kompakte Eingabefelder.

## 0.5.59 (Phase 5.8)
- VIS: Schalter-UI modernisiert – Toggle-Buttons (An/Aus) statt Checkboxen (Settings + Modals + Ladepunkte), im NexoWatt-Stil.
- EVCS: optionaler Datenpunkt **Fahrzeug-SoC (%)** im App-Center ergänzt.
- EVCS: Fahrzeug-SoC wird – sofern gemappt – in der Ladepunkt-Übersicht und im Ladepunkt-Dialog angezeigt.

## 0.5.54 (2026-01-05)

## 0.5.57 (Phase 5.6)
- App-Center: neuer Reiter „Netzlimits“ (Grid-Constraints) für RLM/0‑Einspeisung inkl. PV/WR-Setpoint‑Zuordnung
- App-Center: Tabs werden abhängig von installierten Apps ein-/ausgeblendet (Thermik/Schwellwert/Relais/Netzlimits/§14a/EVCS)

  - App-Center: Energiefluss/Verbraucher – Steuerung um SG‑Ready (2 Relais) erweitert (Write/Read + Invert).
  - App-Center: Thermik-App unterstützt neuen Regeltyp **SG‑Ready** (Estimated Power + Boost), inkl. Warnhinweis wenn SG‑Ready DPs fehlen.
  - Backend: Quick-Control (/api/set, scope=flow) unterstützt SG‑Ready-Schalten (Relais A/B). QC-Read liefert optional SG‑Ready Status.
  - EMS: Thermik-Modul kann SG‑Ready ansteuern (Relais A/B + optional Enable) und verwendet robuste Fallbacks für Leistungsabschätzung.

## 0.5.56
* (Phase 5.5) Neue App: Relaissteuerung (manuelle Relais / generische Ausgänge) inkl. Installateur-Zuordnung und Endkunden-Bedienung (optional pro Ausgang).
* VIS: Relais-Kachel + Dialog, Statusabfrage und Schalt-/Wertschreiben.
* App-Center: neuer Tab „Relais“ + Validierung für ReadId/WriteId.

## 0.5.51 (2026-01-04)
- Phase 5.0: Energiefluss-Layout Feinschliff
  - Erzeuger (max. 5) links angeordnet (gelb) für sauberes, ruhiges Bild.
  - Verbraucher rechts als Halbkreis mit Versatz (größere Kreise, blau) – weniger „wild“, besser lesbar.
  - Web: Cache-Version erhöht (Service Worker), damit Browser-Assets zuverlässig aktualisieren.

## 0.5.50 (2026-01-04)
- Phase 4.9: Energiefluss-Layout: optionale Verbraucher rechts im Bogen, Erzeuger oben.
- Admin: Tab "Energiefluss" umbenannt in "NexoWatt EMS".
- VIS: Installer/App-Center Button wieder in den Einstellungen verfügbar.

## 0.5.46 (2026-01-04)
- Phase 4.5: VIS – Schnellsteuerung erweitert um **Betriebsmodus** und **Regelung an/aus** für thermische Verbraucher (endkundentauglich).
- Backend: /api/set (scope=flow) unterstützt mode + regEnabled (lokale States), inkl. Reset von Boost/Manual-Hold.
- Backend: /api/flow/qc/read liefert optional thermal-Infos (cfg/user/effective) für UI.
- EMS: Thermische Steuerung berücksichtigt User-Overrides (mode/regEnabled) je Slot und veröffentlicht Diagnose-States (user/effective).
- Web: Cache-Version erhöht (Service Worker), damit Browser-Assets sauber aktualisieren.

## 0.5.40 (2026-01-04)
- Phase 3.11: Energiefluss – Sub-Reiter + Schnellsteuerung für optionale Kreise
  - App-Center: Energiefluss-Setup mit Unterreitern (Basis/Verbraucher/Erzeuger/Optionen) für übersichtliche Einrichtung.
  - Optionale Kreise: Pro Slot zusätzliche Schnellsteuerungs-Zuordnung (Schalten + Sollwert) inkl. optionalem Readback.
  - Dashboard: Optionale Verbraucher/Erzeuger-Kreise werden klickbar, sobald Schnellsteuerung gemappt ist (Modal mit Ein/Aus & Sollwert).
  - VIS Cache: Service-Worker Cache-Bump (v17) für zuverlässige Aktualisierung.

## 0.5.37 (2026-01-04)
- Phase 3.8: Installer-UX Fixes (Netzpunkt / Layout / Cache)
  - Zuordnung: „Netzpunkt-Messung (Import+ / Export-)“ in „Allgemein“ sauber dargestellt (lange Labels umbrechen, kein Overflow der DP-Eingabe).
  - UI: `.nw-config-field-row`/Label-Layout robuster (Wrap/Min-Width), damit DP-Zuordnungen in schmaleren Karten stabil bleiben.
  - VIS Cache: Service-Worker Cache-Bump (v15) für zuverlässige Aktualisierung.

## 0.5.36 (2026-01-04)
- Phase 3.7: Messung/Flows & Ladepunkt-Stabilität
  - Zuordnung: Netzpunkt-Messung (Import+ / Export-) in „Allgemein“ (global für alle Logiken).
  - Energiefluss: zusätzliche Datenpunkte für Batterie Laden/Entladen (storageChargePower/storageDischargePower) + sauberer Fallback.
  - Lademanagement: Stale-Handling für wallboxnahe Messwerte entschärft (event-driven Updates) – keine unnötige Offline-/Control-Sperre mehr.
  - Diagnose: Stale-Flags bleiben sichtbar, beeinflussen aber nicht mehr automatisch die Online-Logik.

## 0.5.35 (2026-01-04)
- Phase 3.6: Station-first & Budget-Transparenz
  - Ladepunkte: Stationen & Ports als verschachtelte Kacheln (Station → Ports) für schnellere Einrichtung (AC/DC).
  - Stationen: Port hinzufügen direkt pro Station, optional Station-Reihenfolge anpassbar.
  - Status: neue „Budget & Gates“ Übersicht (Netz/Phasen/§14a/PV/Speicher) zur Diagnose des Ladebudgets.
  - Admin: zusätzliche Direktseite `appcenter.html` (öffnet das App‑Center automatisch über den Instanz‑Port).

## 0.5.34 (2026-01-04)
- Phase 3.5: Tarife + Live-Kennzahlen + Installer-UX
  - App-Center: Zuordnungskacheln werden nur für installierte Apps angezeigt (weniger Verwirrung beim Setup).
  - Zuordnung: neue Live-Kachel-Datenpunkte (kWh/CO₂/Status) für die unteren Dashboard-Kacheln; optional (Fallback über Historie/Influx möglich).
  - Dynamische Tarife: Netzladung wird bei "neutral"/"unbekannt" nicht mehr pauschal blockiert (nur "teuer" sperrt Netzladen).
  - App-Center: Validierungs-Funktionen sauber in den globalen Scope gezogen (stabile Ausführung, keine Rekursion).
  - Begriffe: "Connector" in der Oberfläche durch "Ladepunkt/Port" ersetzt.

## 0.5.33 (2026-01-03)
- Phase 3.4: Stationsgruppen & harte Limits (Load-Balancing)
  - Harte Stations-Caps: gemeinsames Limit pro Station/Gruppe wirkt zuverlässig über alle Connectors.
  - Diagnose: neue Stationsgruppen-Diagnose im EMS App-Center (Cap, Used, Remaining, Binding, Connectors).
  - Reason-Codes: spezifischer (Netzimport/Phasenlimit/§14a/Stationslimit/User-Limit) für schnellere Fehlersuche.

## 0.5.32 (2026-01-03)
- Phase 3.3: Diagnose & Validierung
  - Installer: Datenpunkt-Validierung (Existenz + Freshness) mit Badge pro Zuordnung (`/api/object/validate`).
  - Status: Ladepunkte-Diagnose im EMS App-Center (`/api/ems/charging/diagnostics`).
  - Lademanagement: Freshness-Checks pro Ladepunkt (Messwert/Status) + sicheres Failover bei stale Daten (Reason `STALE_METER`).
  - VIS Cache: Service-Worker Cache-Bump (verlässliche UI-Updates).

## 0.5.31 (2026-01-03)
- Phase 3.2: Lademanagement + UI/Installer-UX
  - Ladepunkte: stabile Sortierung + Up/Down-Reihenfolge im App-Center (wird auch im Algorithmus als Tie‑Break genutzt).
  - Zuordnung: Apps und Datenpunkt‑Zuordnung als Kacheln im NexoWatt Design.
  - Datenpunkt-Browser: NexoWatt Dialog, Breadcrumb, „Zurück“ + Root, keine Emoji-Icons.
  - API: Objektbaum-Endpunkt auf `/api/object/tree` vereinheitlicht.
  - Code: Branding-Aufräumen (keine Plattform-Nennung in Code-Kommentaren).

## 0.5.29 (2026-01-03)
- Phase 2: EMS App-Center
  - App-Center: Installieren/Aktivieren von EMS-Apps (State `emsApps`) mit Rückwärtskompatibilität zu `enable*` Flags.
  - App-Center UI: Tabs (Apps / Zuordnung / Ladepunkte / Status) + Live-Diagnose.
  - Ladepunkte/Stationsgruppen: Grund-Konfiguration im App-Center (`settingsConfig.evcsCount`, `settingsConfig.evcsList`, `settingsConfig.stationGroups`) inkl. Datenpunkt-Auswahl über Objektbrowser.
  - API: `/api/installer/config` erweitert (u.a. `emsApps`, `settingsConfig`, `gridConstraints`, `diagnostics`) und übernimmt Änderungen direkt in die Runtime.
  - Neu: `/api/ems/status` (Tick/Module/Fehler) für Installateur-Statusansicht.

## 0.5.28 (2026-01-03)
- Installer (Beta): neue EMS-App-/Installer-Seite unter `/ems-apps.html`.
  - Apps als Module: Aktivieren/Deaktivieren der Kern-Logiken (Peak-Shaving, Speicherregelung, Lademanagement, Grid-Constraints, §14a).
  - Zentrale Anlagenparameter (z.B. Netzanschlussleistung) + Basis-Datenpunkt-Zuordnung.
- API: `/api/installer/config` (lesen/schreiben + optional EMS-Neustart) und `/api/object/tree` (Objektbaum) für komfortable Datenpunkt-Auswahl.
- Admin-Tab: Auswahlseite „VIS öffnen“ / „EMS Apps öffnen“.
- Fix: Tarif-Modul – unbeabsichtigter Debug-Reset im Tick entfernt.

## 0.5.23 (Hotfix – Dynamischer Tarif: Dezimal-Komma)
## 0.5.27 (2026-01-03)
- Phase 1: Stabilisierung (Tarif-Modul Fixes, Entfernen externer Referenzen, kleinere Robustheits-Updates)

- Fix Dynamischer Tarif (VIS): Zahlenwerte aus VIS-Inputs werden jetzt robust auch mit deutschem Dezimal-Komma (z.B. „0,40“) geparst.
  - Betroffen: v.a. manueller Strompreis (Schwellwert), sowie generell numerische Tarif-Einstellungen.
  - Dadurch greift „Laden bei günstig / Entladen bei teuer“ zuverlässig.

## 0.5.16 (Versionstand 5 – Peak‑Shaving Grenzwert zentral)

- Admin: Peak‑Shaving „Max. Import (W)“ entfernt. Grenzwert wird zentral aus „EMS → Netzanschlussleistung“ übernommen.
- Peak‑Shaving: Grenzwertquelle preferiert EMS‑Limit; Legacy‑Fallback über `peakShaving.maxPowerW` bleibt für alte Installationen erhalten.
- Charging‑Management (Gate A): nutzt primär EMS‑Limit (Netzanschlussleistung); Legacy‑Fallback nur, wenn EMS‑Limit nicht gesetzt ist.
- Grid‑Constraints (RLM): nutzt für die Berechnung des finalen Import‑Caps das zentrale EMS‑Limit (Legacy‑Fallback weiterhin möglich).

## 0.5.12 (Versionstand 5 – LSK: Mittelwertfenster + Update‑Schwelle)

## 0.5.13

- Fix: Eigenverbrauch-Entladung verwendet für die Netzbezug-Regelung den NVP-Rohwert (verhindert Restbezug bei geglätteter Netzleistung).
- Fix: Eigenverbrauch-Entladung nutzt Ziel+Schwellwert als Deadband (kleiner Restbezug statt Flattern).
- UI/Admin: Optional/Expert-Felder in EMS-Reitern werden korrekt nur im Admin-Expertenmodus angezeigt (expertMode).

- LSK‑Reserve‑Nachladung (Netz‑Refill) nutzt nun ein langes gleitendes Mittelwertfenster (Default **120 s**) und eine Update‑Schwelle (Default **500 W**) für deutlich weniger Sollwert‑Sprünge.
- Sicherheits‑Clamp bleibt aktiv: RAW‑Headroom (Import‑Spikes) reduziert den Nachlade‑Sollwert sofort.
- Admin: neue **Experten‑Parameter** für LSK‑Refill (Mittelwert‑Fenster / Update‑Schwelle).

## 0.5.11 (Versionstand 5 – NVP Durchschnittswerte / stabilere Regelung)
- EMS: Interne Netzleistung wird nun zentral als geglätteter Wert `ems.gridPowerW` (EMA) bereitgestellt. Zusätzlich wird `ems.gridPowerRawW` (roh) veröffentlicht.
  - Dadurch nutzen *alle* EMS-Logiken standardmäßig einen stabileren NVP (weniger „Springen“).
  - `grid.powerW` ist nun bewusst *gefiltert*; RAW bleibt über `grid.powerRawW` verfügbar.
- Speicher-Regelung: LSK-Refill („Reserve über Netz nachladen“) nutzt die **Durchschnittsdifferenz** (Headroom aus geglättetem Import) und clamp't zusätzlich mit RAW-Headroom (Sicherheit bei Import-Spikes).
- Speicher-Regelung: Zusätzliche Deadband-/Hold-Logik für LSK-Refill, um kleine Aufwärts-Korrekturen zu unterdrücken (weniger Setpoint-Flattern).
- Grid-Constraints: überschreibt `grid.powerW` nicht mehr; nutzt stattdessen Fallback-Key `gc.gridPowerW` und bevorzugt den global gefilterten NVP.

## 0.5.10 (Versionstand 5 – LSK-Refill Glättung / weniger Setpoint-Flattern)
- Fix Speicher-Regelung: LSK-„Reserve über Netz nachladen (Headroom)“ nutzt jetzt einen Headroom-Filter („attack fast / release slow“). Dadurch werden Sollwert-Sprünge bei schwankendem Netzbezug deutlich reduziert, ohne Sicherheitsreaktion bei steigender Last zu verlieren.
- Diagnose: Zusätzliche States `speicher.regelung.lskHeadroomW` und `speicher.regelung.lskHeadroomFilteredW` zur Sichtbarkeit/Fehlersuche.

## 0.5.9 (Versionstand 5 – LSK-Refill Fix + Admin Experten-Optionalfelder)
- Fix Speicher-Regelung: LSK-„Reserve über Netz nachladen (Headroom)“ wird nicht mehr durch Tarif-Freigabe blockiert; weiterhin strikt innerhalb des Peak-Shaving-Limits (Import) und bis LSK-Max-SoC.
- Diagnose: Wenn LSK-Refill gewünscht ist, aber kein Peak-Grenzwert/kein Headroom vorhanden ist, wird ein aussagekräftiger Grund in `speicher.regelung.grund` gesetzt.
- Admin UX: Alle als „optional“ gekennzeichneten Felder werden im Admin nur noch im Expertenmodus angezeigt (übersichtlicher).
- Defaults harmonisiert: `storage.reserveEnabled` default = AUS, `storage.reserveTargetSocPct` default = 25.

## 0.5.3 (Versionstand 5 – Speicherfarm Rollen-/Rechtefix)
- Wichtig: Speicherfarm-Konfiguration (Speicher hinzufügen, DP-Zuordnung, Gruppen) ist jetzt ausschließlich im ioBroker-Admin (Installer/Admin) möglich.
- VIS: Speicherfarm-Tab zeigt nur noch Übersicht/Status (read-only) und keine editierbaren DP-Felder mehr.
- Backend: /api/set scope=storageFarm wird blockiert (403), um Änderungen aus der VIS zu verhindern.
- Neu: storageFarm.storagesStatusJson (abgeleitet, ohne DP-IDs) für saubere Endkunden-Ansicht.
- PWA: Service-Worker Cache-Version auf v9 erhöht.

## 0.5.2 (Versionstand 5 – Speicherfarm Admin-UI)
- Admin: neuer Tab „EMS – Speicherfarm“ (nur sichtbar bei aktivierter Speicherfarm) inkl. Tabelle zur Zuordnung der Speicher-Datenpunkte (ähnlich Ladepunkte).
- Adapter: Admin-Konfiguration wird beim Start nach storageFarm.* gespiegelt (mode/configJson/groupsJson), damit VIS/UI und Summenbildung konsistent sind.
- Timer: Farm-Intervall über storageFarm.schedulerIntervalMs (läuft nur wenn Speicherfarm aktiv).
- Cleanup: Speicherfarm-Timer wird onUnload sauber beendet.

## 0.5.1 (Versionstand 5 – Hotfix)
- Fix Speicherfarm: storageFarm.* lokale States werden nun zuverlässig abonniert (namespace.storageFarm.*) und mit Defaults initialisiert. Dadurch bleiben Werte/Tabellen nach Reload/Restart sichtbar.
- PWA: Service-Worker Cache-Version auf v8 erhöht, damit Clients das Update sicher laden.

## 0.5.0 (Versionstand 5)
- VIS: Anmelde-/Login-Bereich (Admin/Installer) entfernt (Frontend + API). Schreibzugriffe erfolgen ohne VIS-eigenes Login.
- EMS: Speicherfarm-Grundfunktion ergänzt: Admin-Schalter (EMS) + neuer Reiter "Speicherfarm" im Frontend inkl. Tabelle zur Anlage mehrerer Speicher und Summenwerte (Ø SoC, Lade-/Entladeleistung).

## 0.4.125
- Admin Feinschliff: Netzanschlussleistung als zentraler Anlagenparameter in EMS verschoben; §14a zeigt nur noch Hinweis.

## 0.4.124
- Admin: §14a tab cleanup (remove unused legacy installer fields)

## 0.4.123

- §14a EnWG: Admin‑UI erweitert (Modus Direkt/EMS, optionales Aktiv‑Signal, optionale EMS‑Sollwert‑DP, Verbraucher‑Tabelle).
- EMS: Pmin,14a/GZF‑Berechnung (inkl. Faktor für WP/Klima > 11kW) und EVCS‑Caps in Charging‑Management.

## 0.4.122

- Rollback: Lizenzpflicht entfernt (Adapter startet ohne Lizenz).
- Admin-Aufräumen + ioBroker-Login/Write-Schutz unverändert.

## 0.4.117 (2025-12-30)
- RC: Admin aufgeräumt – SmartHome-Tabs (vorbereitet + Räume/Geräte) sind jetzt standardmäßig ausgeblendet, damit Installateure nicht verwirrt werden.
- EVCS: Pro Ladepunkt werden EMS-Hinweise/Fehler direkt angezeigt (z.B. „Setpoint fehlt“, „offline“, „Budget/Netzlimit“, „Lastspitzenkappung aktiv“).
- EVCS: Boost-Button wird automatisch deaktiviert, wenn allowBoost=false (außer wenn Boost gerade aktiv ist → dann bleibt „Abbrechen“ möglich).
- PWA: Service-Worker Cache-Version auf v7 erhöht, damit UI-Updates zuverlässig geladen werden.

## 0.4.116 (2025-12-30)
- Fix (EVCS): Modus-Buttons reagieren jetzt mit einem Klick stabil (pointerdown + Pending-Write-Schutz gegen SSE-„Snapback“).
- Fix (EVCS): Optimistische UI-Updates werden nicht mehr durch kurzzeitig alte SSE-Werte überschrieben.
- Fix (PWA): Service-Worker bereinigt und Cache-Version erhöht, damit neue JS/HTML-Dateien zuverlässig geladen werden.

## 0.4.111 (2025-12-30)
- Fix (EVCS): Boost kann jetzt jederzeit manuell beendet werden (Boost‑Button erneut klicken → setzt Mode auf Auto).
- Fix (EMS Init): Charging‑Management wird bei Upgrades mit fehlendem enableChargingManagement-Flag automatisch aktiviert, wenn Ladepunkte konfiguriert sind (damit die EMS‑States + Modus‑Buttons verfügbar sind).
- UX (EVCS/API): Beim Wechsel weg von Boost werden die Boost‑Runtime‑States sofort zurückgesetzt (UI fühlt sich nicht mehr „festgenagelt“).
- Robustheit: Boost/Charging‑Session‑Timer werden nach Adapter‑Restart aus den States wiederhergestellt (Boost‑Timeout + FIFO‑Priorität bleibt stabil).

## 0.4.109 (2025-12-30)
- EVCS-Seite: Ladepunkt-Einstellungen jetzt direkt in der VIS bedienbar (EMS Runtime Mode je Ladepunkt: Auto/Boost/Min+PV/PV).
- EVCS-Seite: Boost-Anzeige inkl. Restzeit (boostRemainingMin), Timeout (boostTimeoutMin) und Priorität (#) bei mehreren Boost-Ladepunkten.
- Fix: /api/set (scope=ems) schreibt auf chargingManagement.wallboxes.lpX.userMode (statt wbX).

## 0.4.108 (2025-12-30)
- Charging: Boost je Ladepunkt mit Auto‑Timeout nach Charger‑Typ (DC default 60min / AC default 300min). Timeout‑Werte sind in der Admin‑UI (Expertenmodus) konfigurierbar und können pro Ladepunkt überschrieben werden.
- Charging: Neue Runtime/Diagnose‑States pro Ladepunkt: boostActive, boostSince, boostUntil, boostRemainingMin, boostTimeoutMin.

## 0.4.107 (2025-12-30)
- EMS (Sprint 3.1): Admin-UI aufgeteilt in eigene EMS‑Tabs: „EMS – Charging“, „EMS – Peak Shaving“, „EMS – Netz‑Constraints“, „EMS – Speicher“ (übersichtlicher, weniger gequetscht).
- Charging (Sprint 3.1): Stations‑Diagnose‑States hinzugefügt: chargingManagement.stations.<stationKey>.* (Cap/Remaining/Used/TargetSum/ConnectorCount etc.) + chargingManagement.stationCount.
- Charging (Sprint 3.1): Optionale Fairness in Stationsgruppen: chargingManagement.stationAllocationMode = roundRobin rotiert die Reihenfolge der nicht‑Boost‑Connectors pro Tick.

## 0.4.106 (2025-12-30)
- EMS (Sprint 3): Neuer Admin-Reiter „EMS“ mit Scheduler-Intervall, Aktivierung Peak-Shaving (Lastspitzenkappung) und Basis-Parameter (inkl. Diagnose-Optionen).
- EMS Engine: Multiuse ModuleManager im VIS aktiviert (Peak-Shaving + Charging-Management laufen im gleichen Scheduler-Takt).
- Ladepunkte (Sprint 2.2): Stationsgruppen (gemeinsame Leistung) + Station-Key/Connector-Metadaten + Boost-Erlaubnis je Ladepunkt.
- Charging-Management: Stationsgruppen-Limit wird bei der Zielwertverteilung berücksichtigt (Summe pro Station wird begrenzt).

## 0.4.103 (2025-12-30)
- Admin: Wallboxen – zentrale Wallbox-Tabelle um EMS-Steuerungs-Datenpunkte erweitert (Sollstrom A / Sollleistung W) inkl. pro-Wallbox EMS-Modus (Auto/PV/Min+PV/Boost).
- Admin: Weitere Monitoring/RFID/Expert-Felder im Admin-Expertenmodus (übersichtlich in Standardansicht).
- Vorbereitung für herstellerunabhängige A↔W-Umrechnung (Phasen/Spannung/Steps/Limits pro Wallbox als Expert-Felder).

## 0.4.102 (2025-12-25)
- Live-Dashboard: CO₂-Wert wird standardmäßig aus der PV-Gesamtproduktion (kWh) berechnet (0,4 kg/kWh -> t CO₂).
- Optional: Wenn ein CO₂-Datenpunkt gemappt ist, wird dieser weiterhin bevorzugt angezeigt.

## 0.4.101 (2025-12-25)
- Live-Dashboard: Wenn kWh-Zählerdatenpunkte nicht gemappt sind, werden die kWh-Werte (Produktion/Verbrauch/Netz sowie EVCS „Letzte Ladung“) automatisch aus InfluxDB (ioBroker History) aus der Leistungszeitreihe berechnet.
- Fallback: Sobald ein kWh-Datenpunkt gemappt ist, hat dieser Vorrang (keine Überschreibung).

## 0.4.100 (2025-12-25)
- Admin: Datenpunkte – kWh-/Zählerfelder und Kennzahlen standardmäßig ausgeblendet (im Admin „Expertenmodus“ sichtbar) und mit Hinweisen/Platzhaltern versehen.
- Keine Änderungen an Umschalt-Reitern oder dynamischem Zeittarif.

## 0.4.99 (2025-12-25)
- Admin: Datenpunkte – Leistungs-Datenpunkte (W) übersichtlicher angeordnet (Reihenfolge + bessere Platzhalter/Hilfetexte).
- Keine Änderungen an Tabs/Umschaltreitern oder Dynamischem Zeittarif.

## 0.4.98 (2025-12-22)
- UI Fix: robustes Number-Casting für SoC/Autarkie/Eigenverbrauch (verhindert Render-Fehler wenn Werte als String kommen, z. B. "19 %").

## 0.4.96 (2025-12-21)

## 0.4.97 (2025-12-21)
- EVCS Report: Button "CSV Sessions (RFID)" hinzugefügt (Download von /api/evcs/sessions.csv mit aktuellem Zeitraum).
- EVCS: Sessions CSV Export: neue Route /api/evcs/sessions.csv (Filter via from/to, Excel-kompatibles CSV mit BOM und ;).

## 0.4.95 (2025-12-21)
- EVCS: Session-Logger für RFID-Abrechnung (Start/Stop, Dauer, kWh, Peak kW, RFID/Name) mit Ringbuffer in evcs.sessionsJson.

## 0.4.94 (2025-12-21)
- EVCS: RFID-Status in der Wallbox-Kachel anzeigen (Gesperrt/Freigegeben, Nutzer), inkl. Tooltip mit RFID/Hint.

## 0.4.93 (2025-12-21)
- EVCS RFID: Freigabe-Logik (Whitelist) mit Sperre/Freigabe über lockWriteId bzw. activeId (Soft-Lock).
- EVCS RFID: neue lokale Status-States je Wallbox (rfidLast, rfidAuthorized, rfidUser, rfidReason, rfidEnforced).

## 0.4.92 (2025-12-21)
- Admin (EVCS): evcsList um RFID-DP (rfidReadId) und Sperre-DP (lockWriteId) erweitert (pro Wallbox konfigurierbar).
- Backend: evcsList liest lockWriteId ein und cached/abonniert optional den State (evcs.<n>.lock).
## 0.4.91 (2025-12-21)
- Feature (EVCS RFID): Anlernen-UI in den Einstellungen (Karte anlernen/Stop, letzte Karte anzeigen, in Whitelist übernehmen & speichern).
- UI: Whitelist-Editor stellt API für Lern-UI bereit (addOrUpdate + auto-save).

## 0.4.90 (2025-12-21)
- Feature (EVCS RFID): Learning-Backend – erkennt die nächste RFID-Karte (aus konfigurierten rfidReadId-Datenpunkten), schreibt lastCaptured/lastCapturedTs und deaktiviert learning.active automatisch.
- Backend: RFID /api/set aktualisiert den Live-State-Cache (SSE/\"/api/state\") sofort; ensureRfidStates initialisiert den Cache-Snapshot.
- Vorbereitung: evcsList unterstützt optional rfidReadId (Alias rfidId/rfid).

## 0.4.89 (2025-12-21)
- Feature (EVCS RFID): Einstellungen – RFID-Freigabe Toggle + Whitelist-Editor (CRUD) inkl. Save/Reload.
- Backend: /api/set unterstützt scope "rfid" (enabled, whitelistJson, learning.active).

## 0.4.88 (2025-12-21)
- Feature (EVCS RFID): Basis-States für Whitelist/Learning angelegt (evcs.rfid.*)

## 0.4.87 (2025-12-21)
- Feature (EVCS Report): CSV/Excel Download-Button im Bericht hinzugefügt (neben Drucken/PDF), nutzt /api/evcs/report.csv mit dem gleichen Zeitraum.

## 0.4.86 (2025-12-21)
- Feature (EVCS Report): CSV/Excel Export unter /api/evcs/report.csv (UTF-8 BOM, ';' Separator, de-DE Zahlenformat).
- Feature (EVCS Report): Summenzeile "Summe Zeitraum" in CSV (kWh Summe + Peak max kW je Wallbox).

## 0.4.85 (2025-12-21)
- Refactor (EVCS Report): Report-Builder in eine wiederverwendbare Funktion ausgelagert (Basis für JSON + CSV), Ausgabe unverändert.

## 0.4.84 (2025-12-21)
- Fix (EVCS Report): Render-Crash behoben (periodTotals korrekt berechnet), Summenzeile „Summe Zeitraum“ funktioniert wieder stabil.

## 0.4.82

## 0.4.83 (2025-12-21)
- EVCS Report: Summenzeile für Zeitraum ergänzt (Gesamt-kWh + kWh je Wallbox, Peak max kW je Wallbox) und im Druck/PDF stabil dargestellt.

- Tweak (EVCS Report): improved table formatting (de-DE number format, fixed decimals).
- Fix (EVCS Report): deterministic sorting (days by date, wallboxes by index).
- Fix (EVCS Report): null/undefined values render as 0 and total kWh falls back to sum of wallboxes.
- Tweak (Print/PDF): table header repeats across pages and rows avoid page breaks.

## 0.4.81

- Fix (EVCS Report UI): Tabelle in Scroll-Container (.table-wrap) gelegt, Sticky-Header innerhalb des Containers (top:0) – dadurch wird die erste Tageszeile nicht mehr optisch überdeckt.

## 0.4.80

- Fix (EVCS Report): getHistory robust (timestamps: ISO/sec/ms/date-only), dynamic count by span/step, aggregation+step to avoid truncation.
- Fix (EVCS Report): power uses average+max with adaptive step; daily peak kW derived from max-series scan.
- Fix (EVCS Report): daily energy prefers internal energyDayKwh (max), fallback to energyTotal via daily max-min (min/max aggregates).

## 0.4.79

- EVCS: enforce mode scale 1..3 everywhere (Boost=1, Min+PV=2, PV=3) and remove 0..2 conversion.
- EVCS: stabilize modal + page slider behavior and fix mode label layout under slider.

## 0.4.78

- Fix EVCS modal HTML (clean markup) and restore proper mode label spacing under the slider.
- Fix EVCS modal mode mapping (prefer 0–2 scale when ambiguous) and stabilize slider by inferring scale from last raw value.

## 0.4.77

- Fix EVCS page mode slider: interpret raw values as 1..3 (Boost/Min+PV/PV) to prevent off-by-one jumps.

## 0.4.76

- EVCS: Mode slider now always writes raw values 1/2/3 (Boost/Min+PV/PV) on EVCS page and EVCS modal.

## 0.4.75

- Fix EVCS modal: read per-wallbox mode/active (evcs.1.*) with robust mode scale mapping and prevent slider jumping.
- Fix EVCS page: preserve falsy datapoint values and convert UI mode to raw mode based on detected scale.
- UI: improve spacing between labels and values in KPI cards and dialogs.


## 0.4.74 (2025-12-20)

- Fix (History): Monats-/Jahresansicht zeigt durch Aggregation per "step" wieder vollständige Daten (keine Lücken durch getHistory-Limits).

## 0.4.73 (2025-12-20)

- Fix (EVCS Bericht): Drucken/PDF rendert wieder zuverlässig (kein beforeprint-Reload mehr, Print startet erst nach vollständig gerendertem Table). Zusätzlich werden Tabellenwerte in der Bildschirmansicht explizit eingefärbt, damit sie nicht von globalem CSS „verschluckt“ werden.

## 0.4.72 (2025-12-20)

- Fix (EVCS Bericht): Tabelle lädt zuverlässig in der Bildschirmansicht (robuste Initialisierung + Ladeindikator) und „Drucken / PDF“ lädt Daten vor dem Drucken.

## 0.4.71 (2025-12-20)

- Fix (EVCS Bericht): Tabellenwerte werden im Browser wieder sichtbar gerendert (td/th erben Textfarbe), auch bei nur 1 Wallbox.

## 0.4.70 (2025-12-20)

- Fix: Einstellungen/Installer – Änderungen werden wieder korrekt per /api/set an die im Admin konfigurierten Datenpunkt-IDs geschrieben (scope/key korrekt übertragen).
- Fix: Backend – config.settings/config.installer werden nur noch ausgewertet, wenn ein gültiger String (Objekt-ID) hinterlegt ist (verhindert Falschauswertung/Fehlerfälle).

## 0.4.62 (2025-12-17)

- Fix (EVCS): Leistungs-Ring im Ladestation-Dialog füllt sich wieder korrekt basierend auf aktueller Leistung vs. eingestellter Maximalleistung.

## 0.4.61 (2025-12-17)

- EVCS: Betriebsmodus-Slider in der Wallbox-Kachel wie im Dialog (Labels Boost / Min+PV / PV + aktive Auswahl).

## 0.4.60 (2025-12-17)

- Fix (EVCS): Header Tabs (LIVE/HISTORY/EVCS) rechts oben wie auf den anderen Seiten.

## 0.4.59 (2025-12-17)

- Fix (EVCS): Route-Alias für `/history/evcs.html` (und `/history/evcs`), damit die EVCS-Seite auch aus der History-Navigation nicht mehr 404 liefert.

## 0.4.58 (2025-12-16)

- Fix: Batterie-Beladung im Energiefluss wird auch angezeigt, wenn der Lade-DP negativ geliefert wird (Normalisierung auf Beträge).
- Admin: Felder für CO₂ und Gesamt-kWh sind im Reiter „Datenpunkte“ vorhanden.

## 0.4.56 (2025-12-16)

- (interne Zwischenversion)

## 0.4.49 (2025-12-16)

- EVCS: Admin „Wallboxen“-Tabelle aufgeräumt (DP-Auswahl als Objekt-Dialog, bessere Labels/Tooltips, Layout optimiert).

## 0.4.46

- Added dedicated settings page (settings.html) with original settings functions and Installer button
- Improved settings auto-open logic in app.js for settings.html and ?settings=1

## 0.4.38 (2025-12-15)

- VIS: Neue EVCS-Seite (/evcs.html) für mehrere Wallboxen.
- Header-Menü: Navigation Live/History/SmartHome/Logic + EVCS (ab 2 Wallboxen sichtbar).
- Live: EVCS-Menüpunkt wird über settingsConfig.evcsCount automatisch ein-/ausgeblendet.
