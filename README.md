# NexoWatt EOS

NexoWatt EOS is the local platform for energy, charging and building control, including the responsive customer cockpit and installer workspace.

It provides live energy-flow visualization, historical analysis, SmartHome visualization, installer-controlled EMS applications, and selected customer controls for desktop, tablet, and smartphone use.

## Main features

- **LIVE dashboard** with PV, grid, storage, building load, weather, KPIs, quick actions, and AI advisor cards.
- **History and reports** for energy flows, storage, grid import/export, tariff costs, EVCS reports, and yearly reports.
- **SmartHome visualization** with rooms, devices, favorites, and responsive mobile navigation.
- **Installer App-Center** for datapoint mapping, EMS apps, heating rod control, storage farm setup, EVCS/charging management, tariff logic, and diagnostics.
- **Responsive frontend** for desktop, tablet, and smartphone.

## Technical platform compatibility

NexoWatt EOS runs locally as an adapter on the ioBroker platform and is prepared for Node.js 22+. The platform identifier remains technical; all customer-visible product branding uses NexoWatt EOS.

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

The basic HTTP port and IP binding are configured through the underlying platform administration.

EMS datapoint mapping and installer-specific configuration are handled inside the protected NexoWatt EOS App-Center.

## License

This repository is proprietary and not open source.

Copyright (c) 2025 NexoWatt. All rights reserved.

Use, copying, modification, distribution, hosting, or sublicensing is not permitted without explicit written permission from NexoWatt.

See [LICENSE](LICENSE) for details.
