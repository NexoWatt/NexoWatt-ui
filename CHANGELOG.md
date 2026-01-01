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
