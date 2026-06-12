# NexoWatt UI – Architekturübersicht

Diese Datei erklärt die grobe Architektur des Adapters so, dass spätere Wartung und TypeScript-Migration nachvollziehbar bleiben. Sie ist bewusst fachlich geschrieben und ergänzt die Kommentare direkt im Code.

## 1. Grundidee

NexoWatt UI besteht aus vier großen Schichten:

```text
ioBroker-Adapterlaufzeit
  main.js

EMS-Regelungs- und Diagnosemodule
  ems/*
  ems/modules/*
  ems/consumers/*

Kunden- und Installer-Frontend
  www/*
  src-admin-tab/*
  admin/*

Projekt-/Release-Werkzeuge
  scripts/*
  package.json
  io-package.json
```

Die Schichten dürfen nicht beliebig durcheinander geändert werden. Die meisten Fehler entstehen, wenn ein State oder Datenpunkt in einer Schicht anders interpretiert wird als in einer anderen Schicht.

## 2. `main.js` – Adapter-Kern

`main.js` ist der Einstiegspunkt des ioBroker-Adapters.

Aufgaben:

- ioBroker-Adapter initialisieren.
- States und Kanäle anlegen.
- externe Datenpunkte aus ioBroker lesen und in `stateCache` spiegeln.
- Webserver starten.
- REST-APIs bereitstellen, z. B. `/api/state`, `/config`, `/api/set`.
- SSE-Liveupdates über `/events` bereitstellen.
- Lizenzprüfung durchführen.
- EMS-Engine starten und stoppen.
- `info.connection` setzen.

Wichtige Zusammenhänge:

- `www/app.js` liest die Werte aus `/api/state`.
- `www/ems-apps.js` schreibt Konfigurationen über App-Center-Endpunkte.
- `ems/modules/*` schreibt abgeleitete EMS-States.
- `history.js` und Reports nutzen die gleichen States wie das Dashboard.

Wichtig für TypeScript:

- `stateCache` braucht später einen klaren Typ.
- API-Antworten brauchen feste Interfaces.
- Mapping-Konfigurationen brauchen eigene Typen.

## 3. `ems/engine.js` – EMS-Laufzeit

Die EMS-Engine koordiniert die einzelnen Regelungs- und Diagnosemodule.

Aufgaben:

- Module initialisieren.
- regelmäßige Ticks ausführen.
- Modulzustände schreiben.
- Module beim Adapter-Stopp sauber beenden.

Typische Module:

```text
core-limits.js
heating-rod-control.js
charging-management.js
peak-shaving.js
ai-advisor.js
pv-forecast.js
```

Wichtig:

- Module dürfen nicht unabhängig andere Bedeutungen für PV, Netz, Speicher oder Lasten erfinden.
- Energieflusswerte müssen überall dieselbe Semantik haben.
- Timer müssen beim `unload` beendet werden.

## 4. `www/app.js` – Kunden-LIVE-Frontend

`www/app.js` ist die zentrale Browserlogik für das Kunden-Dashboard.

Aufgaben:

- Werte aus `/api/state` lesen.
- Livewerte per SSE aktualisieren.
- Energiefluss anzeigen.
- Feature-Sichtbarkeit steuern, z. B. EVCS oder Speicherfarm nur anzeigen, wenn vorhanden.
- Modals und Schnellsteuerungen öffnen.
- Kundeneinstellungen speichern.

Wichtige Zusammenhänge:

- nutzt States aus `main.js` und EMS-Modulen.
- DOM-IDs aus `www/index.html` müssen mit `app.js` übereinstimmen.
- Layout kommt aus `www/styles.css`.

Kritisch:

- Speicher-DP-Logik darf nicht im Frontend anders sein als im Backend.
- Feature-Sichtbarkeit darf keine alten Default-States als echte Hardware interpretieren.
- 0-Werte können echte Werte sein und dürfen nicht automatisch als fehlend gelten.

## 5. `www/ems-apps.js` und `www/ems-apps.html` – Installer/App-Center

Dieser Bereich ist der Installerbereich und darf nicht mit dem einfachen Kundenfrontend vermischt werden.

Aufgaben:

- EMS-Apps aktivieren/deaktivieren.
- Datenpunkte mappen.
- Schwellwerte konfigurieren.
- Heizstab, EVCS, Speicherfarm, KI-Berater und weitere Module parametrieren.

Wichtige Zusammenhänge:

- schreibt in `adapter.config`.
- `main.js` lädt diese Config und spiegelt relevante Werte in States.
- EMS-Module lesen die Konfiguration indirekt über Adapter-Config und Runtime-States.

Kritisch:

- Konfigurationswerte müssen nach dem Speichern wieder korrekt angezeigt werden.
- Zahlenfelder dürfen nicht auf alte Defaults zurückspringen.
- Kundenseiten dürfen keine Installerfunktionen zeigen.

## 6. `www/history.js` – Historie und Reports

Aufgaben:

- historische Werte abrufen.
- Diagramme rendern.
- Reports verlinken oder erzeugen.
- EVCS-/Farm-Anteile nur anzeigen, wenn vorhanden.

Kritisch:

- History darf keine falschen Ersatzwerte schreiben oder anzeigen.
- Speicher-, Netz- und PV-Werte müssen dieselbe Semantik haben wie im LIVE-Dashboard.

## 7. `www/smarthome.js` und `www/smarthome-config.js`

SmartHome ist zweigeteilt:

```text
smarthome.js        Kundenansicht / Bedienung
smarthome-config.js Installer-/Konfigurationsansicht
```

Kritisch:

- Kundenansicht darf keine Installer-Konfiguration enthalten.
- Gebäudestruktur, Räume, Geräte und Funktionen müssen getrennt bleiben.
- Bedienkacheln dürfen nur echte konfigurierte Geräte anzeigen.

## 8. Admin-/React-Bereich

`src-admin-tab/*` enthält die Quellkomponenten für Admin-Tab/React.

`admin/react/assets/*` sind gebaute Bundles. Diese sollen nicht manuell fachlich geändert werden.

Regel:

```text
Fachliche Änderung -> src-admin-tab/src/*
Build-Artefakt     -> admin/react/assets/*
```

## 9. Dokumentationsregel

Kommentare im Code erklären den lokalen Code-Teil. Dokumente in `docs/*` erklären die Zusammenhänge.

Für spätere TypeScript-Migration gilt:

```text
Erst verstehen -> Datenvertrag definieren -> Tests absichern -> Datei/Teil nach TypeScript migrieren.
```
