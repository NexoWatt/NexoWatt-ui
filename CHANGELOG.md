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
