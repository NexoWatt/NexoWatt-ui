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
