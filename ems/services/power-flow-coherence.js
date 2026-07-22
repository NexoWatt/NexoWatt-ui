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
function nonNegative(value) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean')
        return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.abs(parsed)) : 0;
}
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
