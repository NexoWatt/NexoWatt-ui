### 0.4.35 (2025-12-15)
- Schritt 3: EVCS Datenmodell pro Wallbox (States unter evcs.<n>.* inkl. Aggregat evcs.totalPowerW)
- Admin: Wallbox-Tabelle erweitert um optionale DP-Mappings (Leistung, Energiezähler, Status, Freigabe, Modus)
- Fix: Korrigierte Trunkierungs-/"..."-Artefakte in main.js (subscribeConfiguredStates & /config)

### 0.4.34 (2025-12-15)
- Schritt 2: Mehrfach-Wallbox Grundlage erweitert: EVCS-Liste (Namen) via Admin-Config, Adapter leitet Liste + Count ab und liefert sie in /config.settingsConfig.
- Adapter-State settings.evcsCount ergänzt (für VIS/Navigation ab >1 Wallbox).

## 0.4.33 (2025-12-15)
- EVCS: Admin-Config um "Anzahl Wallboxen" erweitert (settingsConfig.evcsCount)
- EVCS: Adapter liest wallboxCount aus Config und loggt "Wallboxen konfiguriert: X"

### 0.4.32 (2025-12-07)
- SmartHome A7: Szene-Kacheln zeigen jetzt klar „Aktiv“/„Bereit“ im Wertbereich, basierend auf dem Szenenstatus (active/on).
- SmartHome A7: Sensor-Kacheln verwenden einheitliche Anzeigeformatierung für Zahlenwerte und zeigen bei fehlendem Wert einen Platzhalter.

### 0.4.31 (2025-12-07)
- SmartHome A6: RTR-Kachel mit Anzeige der Ist- und Solltemperatur und ±0,5 °C Setpoint-Bedienung in der VIS.
- SmartHome A10: Erste Version des SmartHome-Config-Editors in der VIS mit Datenpunkt-Picker, der die SmartHomeConfig direkt in der Adapter-Instanz speichert.

### 0.4.30 (2025-12-05)
- Neu (B8): NexoLogic-Szenen direkt aus SmartHomeConfig-Geräten (Typ „scene“) generiert.
- Backend: /api/logic/blocks liest SmartHomeConfig.rooms/functions/devices und erzeugt Logik-Blöcke für Szenen.
- Backend: Fallback auf legacy smartHome.datapoints.*-Szenen, wenn keine SmartHomeConfig-Szenen konfiguriert sind.
- VIS: Szenen-Kacheln in NexoLogic sind antippbar und lösen über /api/smarthome/toggle die zugehörige Szene aus.

### 0.4.29 (2025-12-05)
- Neu (B7): Favoriten-Unterstützung für SmartHome-Geräte.
- Admin: Checkbox „Favorit“ pro Gerät in der SmartHomeConfig („Geräte / Kacheln“).
- VIS: Favoriten-Tab („★ Favoriten“) in der SmartHome-Ansicht filtert auf als Favorit markierte Geräte.
- VIS: Favoriten-Kacheln sind optisch hervorgehoben (Rahmen / Glow).

### 0.4.28 (2025-12-05)
- Neu (B6): Raum-Navigation als Tabs in der SmartHome-Ansicht (ähnlich Gira-Seiten).
- VIS: Tabs „Alle Räume“ + einzelne Räume oberhalb der SmartHome-Kacheln.
- VIS: Funktionsfilter bleiben als Chips (Licht, Beschattung, Heizung, Szenen, …) unterhalb der Tabs erhalten.
- Technik: Tabs & Filter nutzen die room/function-Felder aus dem SmartHomeConfig-basierten Rendering.

### 0.4.27 (2025-12-05)
- Neu: Raum- und Funktionsfilter in der SmartHome-Ansicht.
- UI: Filter-Chips oberhalb der Kacheln (Räume/Funktionen) zur schnellen Einschränkung der Anzeige.
- Technik: Filter basieren auf den im SmartHome-Rendering gelieferten room/function-Feldern (SmartHomeConfig).

### 0.4.26 (2025-12-05)
- Neu: SmartHome-Rendering nutzt primär das SmartHomeConfig-Modell (rooms/functions/devices).
- Fallback: Wenn keine SmartHomeConfig.devices definiert sind, wird weiterhin das alte SmartHome-Datenpunktschema (smartHome.datapoints.*) verwendet.
- Ziel: Voll generische SmartHome-Kacheln, die über das Admin-Panel „SmartHome – Räume & Geräte (BETA)“ konfiguriert werden können.

### 0.4.25 (2025-12-05)
- Neu: Einfache SmartHome-Konfig-Seite als VIS-Ansicht (`/smarthome-config`).
- Backend: Read-only API `/api/smarthome/config`, die das SmartHomeConfig-Modell liefert.
- UI: Übersicht über Räume, Funktionen und Geräte/Kacheln im NexoWatt-Design (BETA, nur Anzeige).

### 0.4.24 (2025-12-05)
- Neu: Admin-Panel „SmartHome – Räume & Geräte (BETA)“ für das SmartHomeConfig-Modell.
- Admin: Tabellen für Räume, Funktionen und Geräte/Kacheln inkl. IO-Datenpunkte (switch/level/cover/climate/sensor).
- Hinweis: Die neue Config wird in späteren Schritten vom SmartHome-Rendering genutzt; aktuell bleibt das bestehende Modell aktiv.

### 0.4.23 (2025-12-05)
- Neu: SmartHomeConfig-Datenmodell (rooms/functions/devices) im Adapter-native Bereich vorbereitet.
- Backend: Hilfsfunktion getSmartHomeConfig(), die das neue Modell strukturiert bereitstellt.
- Hinweis: Das neue Modell wird in späteren Schritten für eine generische SmartHome-Config-Seite und das SmartHome-Rendering genutzt.

### 0.4.22 (2025-12-05)
- Neu: Erste Logik-Ansicht („NexoLogic“) als eigene Seite mit Übersicht über Szenen-Blöcke.
- Backend: API `/api/logic/blocks`, die einfache Logik-Blöcke aus den SmartHome-Szenen generiert.
- UI: Neue Seite `/logic` im NexoWatt-Design mit Kacheln für Logik-Blöcke (Basis für den späteren Logikeditor).

### 0.4.21 (2025-12-05)
- Neu: Szenen-Kacheln (Typ „scene“) mit frei belegbaren Datenpunkten (z.B. „Alles aus“, „Wohlfühlen“).
- Backend: Szenen werden als eigene Geräte im SmartHome-Modell geführt und über die Toggle-API ausgelöst.
- UI: Szenen-Kacheln erscheinen im NexoWatt-Layout und lassen sich per Tap auslösen (ähnlich Gira-Szenen).

### 0.4.20 (2025-12-05)
- Neu: Sensor-/Info-Kacheln (Typ „sensor“) für reine Werte wie Raumtemperatur und Luftfeuchte.
- Backend: Sensor-Geräte lesen einen reinen Wert (state.value) aus einem Datenpunkt und stellen ihn im SmartHome-Modell bereit.
- UI: Sensor-Kacheln zeigen den Wert mit Einheit im NexoWatt-Kachel-Layout (ohne Bedien-Buttons, read-only).

### 0.4.19 (2025-12-05)
- Neu: RTR-/Raumtemperatur-Kachel (Typ „rtr“) an das SmartHome-Modell angebunden.
- Neu: Backend bildet aktuelle Temperatur, Sollwert und Modus ab und bietet eine Setpoint-API.
- UI: RTR-Kachel zeigt Ist-/Soll-Temperatur im NexoWatt-Design mit +/- Buttons für die Sollwert-Verstellung.

### 0.4.18 (2025-12-05)
- Neu: Jalousie-/Rollladen-Kachel (Typ „blind“) an das SmartHome-Modell angebunden.
- Neu: Backend bildet Jalousie-Position und Fahrbefehle (Auf/Ab/Stop) ab und stellt eine Cover-API bereit.
- UI: Jalousie-Kachel zeigt Position in % (inkl. Balken) und bietet Auf/Ab/Stop-Buttons im NexoWatt-Design.

### 0.4.17 (2025-12-05)
- Neu: Level-API (/api/smarthome/level) für Dimmer; Kacheln besitzen nun einen interaktiven Slider.
- Neu: Dimmer-Slider setzt Werte direkt auf den hinterlegten Datenpunkt (min/max aus SmartHome-Konfiguration).
- UI: Dimmer-Kacheln zeigen weiterhin den aktuellen Wert und Balken, zusätzlich Slider-Bedienung im NexoWatt-Design.

### 0.4.16 (2025-12-05)
- Neu: Dimmer-Kachel an das neue SmartHome-Modell angebunden (z.B. Grid-Limit, PV-Abregelung).
- Neu: Backend liefert Level-Werte für Dimmer-Geräte und unterstützt 0↔100%-Toggle per API.
- Anpassung: SmartHome-Frontend berücksichtigt Dimmer-Zustände und Level-Anzeige im NexoWatt-Kachel-Layout.

### 0.4.15 (2025-12-05)
- Neu: Erste SmartHome-Switch-Kachel im HomeKit-ähnlichen NexoWatt-Design.
- Neu: Separate SmartHome-Seite (/smarthome.html) mit API-Endpunkten /api/smarthome/devices und /api/smarthome/toggle.
- Nutzung der bestehenden SmartHome-Datenpunkte (Wärmepumpe EIN/AUS, Wallbox-Sperre) als Demo-Geräte.

### 0.4.10 (2025-11-07)
- Fix: Produktion → Gesamt (kWh) und CO₂‑Ersparnis werden korrekt aus den Admin-Datenpunkten gelesen.
- Anzeige: CO₂‑Ersparnis zeigt nun ein ' t' für Tonnen an.

# Changelog

## 0.0.1
- Initial preview release.

## 0.3.26 – 2025-11-01
- Fix: Installer-Login in Formular gehüllt; ENTER/Submit funktioniert zuverlässig.
- Fix: Doppelter Top‑Level-Block mit `await` entfernt (SyntaxError app.js:403).
- Neu: Abbrechen-Button schließt Installer und verhindert unbefugten Zugriff auf Form.

## 0.3.27 – 2025-11-01
- Fix: Unerwartete '}' in app.js entfernt.
- Chore: verborgenes Username-Feld für Passwort-Form (Barrierefreiheit).

## 0.3.28 – 2025-11-01
- Fix: Donut-Render verwendete chg2/dchg2 außerhalb des Blocks → ReferenceError. Jetzt charge/discharge.

## 0.3.29 – 2025-11-01
- Installer-Schutz auf HttpOnly-Cookie umgestellt (Server prüft Session).
- Frontend vereinfacht: kein Token-Handling mehr, Login-Form triggert nur /api/installer/login.
- /config liefert `installerLocked` abhängig von Session.

## 0.3.30 – 2025-11-01
- Default-Passwort für Installer: **install2025!** (falls kein Wert gesetzt).

## 0.3.31 – 2025-11-01
- Fix: Syntaxfehler im Login-Endpoint behoben; /api/set prüft jetzt sauber die Session.

## 0.3.32 – 2025-11-01
- Fix: Doppelte else-/Klammern in main.js entfernt (Login-Route).

## 0.3.33 – 2025-11-01
- Fix: Stray top-level await in app.js entfernt.

## 0.3.34 – 2025-11-01
- Fix: Reste der alten Token-Logik entfernt (SyntaxError in Zeile ~276 beseitigt).

## 0.3.35 – 2025-11-01
- Fix: Fehlende '}' nach initMenu() ergänzt (SyntaxError am Dateiende).

## 0.3.39 - 2025-11-01
- Neu: Eigene Datenpunkte für **Einstellungen** unter `nexowatt-vis.0.settings.*` (notifyEnabled, email, dynamicTariff, storagePower, price, priority, tariffMode)
- /api/set fällt auf lokale States zurück, wenn keine Fremd-ID konfiguriert ist.

### 0.3.40 (2025-11-01)
- Energy Flow Monitor: labels moved under icons, centered battery icon, battery SOC above icon, building power shown above icon inside the circle.

### 0.3.41 (2025-11-01)
- Admin: Übersichtskachel + Admin-Tab mit Auto-Weiterleitung auf `http://<ioBroker-IP>:<VIS-Port>/`.

### 0.3.42 (2025-11-01)
- Admin: welcomeScreen (legacy) + welcomeScreenPro mit RELATIVEM Link `/adapter/nexowatt-vis/tab.html` – Kachel wird klickbar.

### 0.3.43 (2025-11-01)
- Admin: Datapoint-Beschriftungen nach UI-Kategorien + Default-IDs für FENECON/OpenEMS ergänzt.

### 0.3.44 (2025-11-01)
- Fix: ID-Mismatches im UI behoben (`gridBuyPowerCard/gridSellPowerCard`, `evcsLastChargeKwh`, `consumptionOther`).
- Default `gridFrequency` → `fenecon.0._sum.GridFrequency`.

### 0.3.51 (2025-11-01)
- Fix: /history.html Route hinzugefügt (404 behoben).
- UI: Bestehenden HISTORY-Tab genutzt (kein zusätzlicher Button), Click öffnet /history.html.

### 0.3.52 (2025-11-01)
- Fix: History-Route und API in startServer(app) korrekt registriert (404 beseitigt).

### 0.3.53 (2025-11-01)
- Responsives Layout: Energiefluss proportioniert (kleiner), SVG-Ring reduziert, Breakpoints angepasst.
- Admin: alle Reiter als 2-Spalten-Layout ab md, mobil 1-Spalte; `newLine` entfernt wo sinnvoll.

### 0.3.54 (2025-11-01)
- History-Seite: identischer Header wie LIVE (Brand, Menü, Tabs). HISTORY aktiv, LIVE führt auf '/'.
\n### 0.3.55 (2025-11-01)\n- History: Menü 'Einstellungen' öffnet Live-Seite im Einstellungsmodus.\n- History: Statuspunkt (liveDot) via SSE aktiviert.\n- Live: Unterstützt Query '?settings=1' für direkten Einstiegs in Einstellungen.\n
### 0.3.56 (2025-11-01)
- Live: ?settings=1 öffnet die Einstellungen zuverlässig (DOM-ready).
- Energiefluss: Icons durch hochgeladene PNGs ersetzt (PV, Netz, Wallbox, Batterie, Gebäude).

### 0.3.57 (2025-11-01)
- UI: 'Wallbox' → 'Ladestation'.
- Farbschema Ringe: PV gelb, Batterie grün, Ladestation lila, Gebäude blau.
- Icons kräftiger (Sättigung/Glühen); Gebäude-Icon weiß.
- Mehr Luft unter den Icon-Beschriftungen (Label y=28).
\n### 0.3.58 (2025-11-01)\n- EVCS: Klickbare Karte öffnet Steuer-Modal (Status, Aktiv-Schalter, Modus-Slider 1–3, Leistung).\n- Admin: Neuer Reiter 'EVCS' zum Zuordnen von IDs (Leistung, Status, Aktiv, Modus).\n\n### 0.3.59 (2025-11-01)\n- Mobile: Settings-Form responsiv (Labels oben, volle Breite, größere Slider/Toggle, Installer-Button 100%).\n
### 0.3.60 (2025-11-01)
- Fix: Ring-Farben korrekt zugeordnet (Batterie grün, Ladestation blau, Gebäude blau, PV gelb, Netz rot).
- DOM: Knoten erhalten explizite Klassen (charger/battery) für stabile Farbgebung.

### 0.3.61 (2025-11-01)
- Gebäude-Icon wirklich weiß (stärkerer Filter).
- Ladestation-Modul: Modal öffnet jetzt auch beim Klick auf den **Knoten** im Energiefluss (ID `nodeEvcs`).
- Klickbarer Cursor für Nodes.

## 0.3.74 (2025-11-05)
- History: LIVE-Statuspunkt (status-dot) jetzt **immer aktiv** inkl. Auto-Reconnect.
- Kleine Optik: sanfte Puls-Animation, damit der Status klar sichtbar ist.

## 0.3.75 (2025-11-05)
- History: Klick-Tooltip mit Leistungswerten (PV, Beladung, Entladung, Bezug, Einspeisung, Verbrauch) + SoC und Crosshair.

## 0.3.75 (2025-11-05)
- Historie: Klick-Tooltip mit Leistungswerten je Serie und Crosshair.
- Verbrauch jetzt **unter 0** im Diagramm (negativ), wie gewünscht.

## 0.3.76 (2025-11-05)
- HISTORY: Tooltip in den Haupt-Scope verschoben (kein `canvas is not defined`).
- Crosshair bleibt erhalten; Tooltip-Werte in kW korrekt skaliert.

## 0.3.77 (2025-11-05)
- HISTORY: Responsive Breakpoints (Chart-Höhe, Karten 4→2→1 Spalten, Toolbar Wrap).
- Tooltip: Touch-Unterstützung (tap) neben Klick.

## 0.3.78 (2025-11-05)
- HISTORY: Tooltip-Funktion neu geschrieben; Syntaxfehler behoben.

## 0.3.79 (2025-11-05)
- HISTORY: Datum-Init `toLocal` repariert.

## 0.3.80 (2025-11-05)
- HISTORY: Bereichsauswahl Tag/Woche/Monat/Jahr.
- Woche/Monat/Jahr als Säulendiagramm (kWh), Tag bleibt Linienchart (kW).
- Dynamische Abtastrate und Aggregation.

## 0.3.81 (2025-11-05)
- HISTORY: Tooltip für Balken-Modi zeigt kWh-Gesamtsummen pro Bucket.

## 0.3.82 (2025-11-05)
- HISTORY: Woche/Monat/Jahr jetzt **gestapelte** Balken (kWh).

## 0.3.84
- Fix: Settings values persist in UI after reload (create & read local `settings.*` states on startup).
- Change: Subscribe to built‑in settings states even without external mapping.


## 0.3.85
- EVCS‑Popup: Leistungs‑Kreis füllt sich proportional zur eingestellten Maximalleistung.
- Admin → EVCS: neues Feld **Maximale Ladeleistung (kW)**, Wert wird als `settings.evcsMaxPower` (W) in den States bereitgestellt.


## 0.3.86
- Fix: **Eigenverbrauch** Karte wurde nicht aktualisiert, wenn `datapoints.selfConsumption` gemappt war. Frontend setzt jetzt zusätzlich `selfVerbrauchBar` / `selfVerbrauchValue`.


## 0.3.87
- Fix: **Speicher System** – `Laden` / `Entladen` werden jetzt zusätzlich unter `storageLadenPower` / `storageEntladenPower` gesetzt.


## 0.3.88
- Historie: **Live**‑Schalter hinzugefügt. Wenn aktiv, wird „Bis“ automatisch auf Jetzt gesetzt und der Chart alle 30 s neu geladen.


## 0.3.89
- Historie wieder **wie vorher**: kein Live‑Modus & keine Events‑Verbindung auf history.html. Für Echtzeit weiterhin die **LIVE**‑Seite nutzen.


## 0.3.90
- Fix: SyntaxError in **Historie** nach dem Zurückbauen behoben (verwaiste `})();` entfernt).


## 0.3.91
- Historie: **Live‑Dot** ist wieder aktiv (SSE), ohne Live‑Schalter. Fehlerbehandlung beruhigt, automatischer Reconnect alle 5 s.


## 0.3.92
- Historie: automatisches Nachladen reaktiviert. Liegt **Bis** in der Nähe der aktuellen Zeit, wird alle 30 s nachgeladen – ganz ohne Schalter (wie früher).


## 0.3.93
- Service Worker verbessert: **neuer Cache-Name** und **Network‑First** für JS/HTML, damit Aktualisierungen (z. B. HISTORY) zuverlässig ankommen.

## 0.4.6 - Grid-Einspeisung Restore
- Energiefluss: Einspeisung wird wieder korrekt erkannt, auch bei **negativen** `gridSellPower`-Werten.
- SoC im Batterie-Kreis bleibt sichtbar (`#batterySocIn`).

## 0.4.7 - Batterie-Beladung im Energiefluss
- Fix: Batterie-Beladung im Energiefluss wird auch angezeigt, wenn der Lade-DP **negativ** geliefert wird (Normalisierung auf Beträge).
- Admin: Felder für **CO₂** und **Gesamt kWh** sind im Reiter *Datenpunkte* vorhanden.
