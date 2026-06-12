# TypeScript-Migrationsbereich

Dieser Ordner enthält den ersten TypeScript-Scaffold für NexoWatt UI.

Wichtig:

- Die produktive Adapter-Laufzeit bleibt aktuell JavaScript.
- TypeScript wird zunächst für Verträge, Datenstrukturen und neue/kleine Codebereiche genutzt.
- Kritische Laufzeitmodule wie `main.js`, `www/app.js`, `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js` werden später nur schrittweise migriert.
- Jede Datei enthält deutsche Kommentare, damit der fachliche Zweck auch ohne tiefes TypeScript-Wissen nachvollziehbar bleibt.

Prüfung:

```bash
npm run typecheck
```
