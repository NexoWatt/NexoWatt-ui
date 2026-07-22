// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/power-flow-coherence.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/power-flow-coherence.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 98a12d1974c4c91f012d0b1614195acb8eb0e7e4f6e0487f1838b6b47e118a34
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/power-flow-coherence.ts
 * Quell-Hash: sha256:07f4f09d6531e401ae0888709867d11633d201f948a35cec1241da6ce9ea34e9
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/power-flow-coherence.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOpposingPowerFlows = normalizeOpposingPowerFlows;
/**
 * Code-Teil: nonNegative
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nonNegative(value) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean')
        return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.abs(parsed)) : 0;
}
/**
 * Code-Teil: normalizeOpposingPowerFlows
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeOpposingPowerFlows(positiveDirectionW, negativeDirectionW, deadbandW = 0) {
    const rawPositiveW = nonNegative(positiveDirectionW);
    const rawNegativeW = nonNegative(negativeDirectionW);
    const deadband = Math.max(0, Number(deadbandW) || 0);
    let signedW = rawPositiveW - rawNegativeW;
    if (Math.abs(signedW) <= deadband)
        signedW = 0;
    return {
        positiveW: signedW > 0 ? signedW : 0,
        negativeW: signedW < 0 ? Math.abs(signedW) : 0,
        signedW,
        rawPositiveW,
        rawNegativeW,
        conflict: rawPositiveW > deadband && rawNegativeW > deadband,
    };
}
module.exports = { normalizeOpposingPowerFlows };
