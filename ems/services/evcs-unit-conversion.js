/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/evcs-unit-conversion.ts
 * Quell-Hash: sha256:34c722404568bd0137b46b52a756e281e0b4fc1b15abfe6fdbc360f94dd55617
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/evcs-unit-conversion.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Normalisiert Ladepunkt-Messwerte in die internen NexoWatt-Einheiten.
 * - Momentanleistung bleibt intern W.
 * - Kumulierte Ladeenergie bleibt intern kWh.
 */
'use strict';
function finiteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
/**
 * Wandelt einen kumulierten Ladeenergie-Zähler in kWh um.
 * Technisch korrekt ist Wh -> kWh (Division durch 1000); Wh kann nicht direkt
 * in kW umgerechnet werden, weil kW eine Leistung und keine Energiemenge ist.
 */
function normalizeEvcsEnergyTotalKwh(value, options = {}) {
    const n = finiteNumber(value);
    if (n === null)
        return value;
    return options.inputIsWh === true ? (n / 1000) : n;
}
module.exports = {
    normalizeEvcsEnergyTotalKwh,
};
