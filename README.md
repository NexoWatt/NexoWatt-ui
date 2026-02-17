# NexoWatt UI (ioBroker Adapter)

The **NexoWatt UI** is the responsive web visualization (dashboard) for the **NexoWatt EMS** inside ioBroker.

It provides a mobile-friendly UI for:
- Live energy flow (PV, grid, battery, building load)
- EVCS / wallbox overview & control (if enabled)
- History / reports
- SmartHome tiles (optional)

**Manufacturer / project page:** https://github.com/NexoWatt

## Installation

### Via ioBroker Admin (recommended)
Once the adapter is included in the ioBroker repositories (Latest/Stable), you can install it in:
`Admin → Adapters → NexoWatt UI`

### Via CLI / npm (works immediately after npm publish)
```bash
cd /opt/iobroker
iobroker install iobroker.nexowatt-ui
```

## Configuration
Open the adapter instance in ioBroker Admin and link the required datapoints (or use NexoWatt-device aliases).

## Changelog
See `CHANGELOG.md`.

## License
This adapter is **not open source**. See `LICENSE`.

---

# NexoWatt UI (ioBroker Adapter)

Die **NexoWatt UI** ist die responsive Visualisierungsoberfläche (Web-UI) des **NexoWatt EMS** in ioBroker.

Typische Bereiche/Funktionen:
- Live-Energiefluss (PV, Netz, Speicher, Gebäude)
- E‑Mobilität (EVCS / Wallboxen) inkl. Steuerung (optional)
- Historie / Reports
- SmartHome Kacheln (optional)

**Hersteller / Projektseite:** https://github.com/NexoWatt

## Installation

### Über ioBroker Admin (empfohlen)
Sobald der Adapter im ioBroker Repository (Latest/Stable) gelistet ist:
`Admin → Adapter → NexoWatt UI`

### Über CLI / npm (direkt nach npm Publish möglich)
```bash
cd /opt/iobroker
iobroker install iobroker.nexowatt-ui
```

## Konfiguration
Adapter-Instanz im Admin öffnen und die benötigten Datenpunkte verknüpfen (oder NexoWatt-device Aliases nutzen).

## Changelog
Siehe `CHANGELOG.md`.

## Lizenz
Dieser Adapter ist **nicht Open Source**. Details siehe `LICENSE`.
