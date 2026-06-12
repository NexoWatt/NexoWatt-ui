# NexoWatt UI

NexoWatt UI is the responsive visualization and customer cockpit for the NexoWatt EMS ioBroker adapter.

It provides live energy-flow visualization, historical analysis, SmartHome visualization, installer-controlled EMS applications, and selected customer controls for desktop, tablet, and smartphone use.

## Main features

- **LIVE dashboard** with PV, grid, storage, building load, weather, KPIs, quick actions, and AI advisor cards.
- **History and reports** for energy flows, storage, grid import/export, tariff costs, EVCS reports, and yearly reports.
- **SmartHome visualization** with rooms, devices, favorites, and responsive mobile navigation.
- **Installer App-Center** for datapoint mapping, EMS apps, heating rod control, storage farm setup, EVCS/charging management, tariff logic, and diagnostics.
- **Responsive frontend** for desktop, tablet, and smartphone.

## ioBroker compatibility

This adapter is maintained for modern ioBroker installations and is prepared for Node.js 22+.

Recommended runtime baseline:

- Node.js: `>=22`
- js-controller: `>=6.0.11`
- Admin: `>=7.0.0`

Before publishing or submitting the adapter, run:

```bash
npm run publish:check
npm run test:package
```

For repository submission, additionally run the official ioBroker Adapter Checker and fix any reported findings.

## Configuration

The basic HTTP port and IP binding are configured through the ioBroker Admin JSONConfig page.

The EMS datapoint mapping and installer-specific configuration are handled inside the NexoWatt EMS App-Center.

## License

This repository is proprietary and not open source.

Copyright (c) 2025 NexoWatt. All rights reserved.

Use, copying, modification, distribution, hosting, or sublicensing is not permitted without explicit written permission from NexoWatt.

See [LICENSE](LICENSE) for details.
