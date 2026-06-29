# NexoWatt UI 0.8.60 – Core-Limits TS-Shadow Log-Fix

## Zweck

Diese Version behebt den wiederkehrenden Logeintrag:

```text
[core-limits-ts-shadow] JS/TS budget mismatch: grid.effectiveW
```

Die Warnung entstand bei Anlagen ohne konfiguriertes Netzimportlimit, weil die JavaScript-Runtime diesen Fall als `grid.headroomW = null` interpretiert, während der TypeScript-Shadow aus Sicherheitsgründen `grid.effectiveW = 0` mit `missing-input` berechnet.

## Was wurde geändert?

- Die Abweichung `JS null/unlimited` gegen `TS 0/missing-input` wird als gutartige Info-Diagnose klassifiziert.
- Es gibt keinen minütlichen Warn-Spam mehr im ioBroker-Log.
- Die Diagnose bleibt im `ems.budget.tsShadowJson` sichtbar.
- Der produktive TS-Takeover bleibt in diesem Fall gesperrt; die stabile JS-Runtime bleibt führend.

## Wichtig

Diese Version ändert keine EMS-Regelstrecke:

- keine Änderung an Export Guard / 0-Einspeisung
- keine Änderung an Speicherfarm
- keine Änderung an Mesh/Microgrid
- keine Änderung an Hardware-Schreibpfaden

## Nach dem Update

Adapter aktualisieren und Log beobachten. Die Warnung zu `grid.effectiveW` sollte nicht mehr minütlich erscheinen.
