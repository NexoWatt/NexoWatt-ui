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
