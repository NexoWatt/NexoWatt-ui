# NexoWatt UI – Code-Landkarte für Wartung und spätere TypeScript-Migration

Diese Datei ergänzt die Kommentare direkt im Code. Sie erklärt die großen Zusammenhänge im Projekt, damit Menschen den Aufbau schneller verstehen und spätere TypeScript-Umbauten weniger Risiko haben.

## Grundprinzip

- `main.js` ist der ioBroker-Adapter-Einstieg: Webserver, APIs, Lizenz, States, EMS-Engine und SSE-Livekanal.
- `www/` enthält das Kunden- und Installer-Frontend. Die meisten Seiten sprechen mit APIs aus `main.js`.
- `ems/` enthält die fachliche Energie-/Regelungslogik. Module schreiben States, die Frontend, History und KI-Berater anzeigen.
- `src-admin-tab/` ist die React-Quelle für den ioBroker-Admin-Tab. `admin/react/` ist der gebaute Output.
- `.nwcore/` ist ein interner/duplizierter EMS-Kernbereich. Änderungen hier müssen mit `ems/` abgeglichen werden.

## Kritische Vertragsstellen

1. **State-Namen und DP-Keys** dürfen nicht ohne Fallback/Migration geändert werden. Frontend, History, KI und EMS-Module hängen daran.
2. **Speicherwerte** müssen Split-DP, signed DP und Rechenfallback unterstützen. `0 W` ist ein gültiger Wert.
3. **Feature-Sichtbarkeit** muss Anlagen ohne Wallbox oder Speicherfarm korrekt ausblenden.
4. **Installerbereich** und Kundenfrontend müssen getrennt bleiben.
5. **Lizenzwerte** dürfen nicht durch maskierte Admin-Platzhalter überschrieben werden.
6. **History-Werte** dürfen nicht durch geänderte Bilanzlogik verfälscht werden.

## TypeScript-Migrationsregel

Neue Änderungen sollen künftig schrittweise nach TypeScript migriert werden. Vor jedem Umbau gilt:

- zuerst Zweck und Datenfluss verstehen,
- Typen für Config, State-Snapshot und API-Antworten definieren,
- alte JS-Logik nicht gleichzeitig fachlich ändern,
- Regression-Tests für Speicher, EVCS, Speicherfarm, Lizenz, Heizstab und History behalten.

## Ergänzung 0.7.56 – neuer TypeScript-Bereich

Neuer Projektbereich:

```text
src-ts/contracts
```

Dieser Bereich enthält keine laufende Adapterlogik, sondern typisierte fachliche Verträge. Er dient als Brücke zwischen dokumentiertem JavaScript und späterer TypeScript-Migration.



## Ergänzung 0.7.58 – Build-/Testbasis

Mit 0.7.58 wurden mehrere TypeScript-Konfigurationen getrennt:

```text
tsconfig.base.json
tsconfig.json
tsconfig.build.json
tsconfig.contracts.json
```

Außerdem gibt es Compile-only-Beispiele unter `src-ts/test-fixtures/`. Diese Beispiele laden keine Adapterlogik, prüfen aber die wichtigsten Typverträge für Energiefluss, Feature-Sichtbarkeit, KI-Berater und Lizenz.


## Ergänzung 0.7.60

Siehe `docs/TYPESCRIPT_STEP_0760_DE.md` für die ersten reinen TypeScript-Energiefluss-Helfer.


## 0.7.60 - Energiefluss-Helfer als TypeScript

In 0.7.60 wurden erste reine TypeScript-Helfer für Speicher- und Netzfluss ergänzt. Diese Helfer sind noch nicht produktiv verdrahtet, dokumentieren aber bereits die spätere Logik für signed DPs, Split-DPs und Bilanzfallbacks.
