# TypeScript-Schritt 0.7.69 – Resolver-Spiegel für spätere Runtime-Integration

## Zweck dieser Version

Diese Version baut die nächste sichere Brücke in der TypeScript-Migration: Die
produktionsnahen TypeScript-Resolver unter `src-ts/resolvers/` werden jetzt als
CommonJS-Spiegel unter `lib/ts-mirrors/` erzeugt und geprüft.

Wichtig: Die produktive Adapter-Runtime nutzt diese Spiegel in 0.7.69 noch nicht.
`main.js`, `www/app.js`, `core-limits.js`, `heating-rod-control.js`, History und
SmartHome bleiben unverändert.

## Neue Struktur

```text
src-ts/resolvers/energy-flow-resolver.ts
src-ts/resolvers/feature-visibility-resolver.ts
        ↓ Build
lib/ts-mirrors/resolvers/energy-flow-resolver.js
lib/ts-mirrors/resolvers/feature-visibility-resolver.js
```

Benötigte reine Helfer werden mitgespiegelt:

```text
lib/ts-mirrors/utils/energy-flow.js
lib/ts-mirrors/utils/number.js
```

## Warum dieser Schritt wichtig ist

Vor einer produktiven Umstellung muss klar sein, dass die TypeScript-Resolver auch als
Node-lauffähige JavaScript-Module funktionieren. Diese Version prüft deshalb nicht nur
Dateien und Hashes, sondern importiert die Spiegel zur Laufzeit und testet kritische
Fälle.

## Kritische fachliche Regeln

- Speicher-Split-DPs mit `0 W` bleiben gültige Messwerte.
- Signed Speicher-DPs werden sauber in Laden/Entladen aufgeteilt.
- Bilanz-Fallback ist nur erlaubt, wenn kein echter Speicher-DP vorhanden ist.
- EVCS bleibt unsichtbar, wenn kein echter Ladepunkt-Datenpunkt existiert.
- Speicherfarm bleibt unsichtbar, wenn keine echte Farm-Konfiguration vorhanden ist.

## Neue Befehle

```bash
npm run sync:ts-resolver-mirrors
npm run check:ts-resolver-mirrors
npm run test:resolver-mirrors
npm run test:resolver-mirror-runtime
```

## Pflege-Regel

Wenn eine Quelle unter `src-ts/resolvers/` oder den benötigten `src-ts/utils/` geändert
wird:

```bash
npm run sync:ts-resolver-mirrors
npm run test:resolver-mirrors
```

Erst danach committen.
