/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/pv-surplus-allocation.ts
 * Quell-Hash: sha256:fa5f396b8774ec7e1fb6c3b55a6510dea7100966b34cd81816eee6b44b3b5dd7
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/pv-surplus-allocation.js.
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
exports.normalizePvSurplusPriority = normalizePvSurplusPriority;
exports.buildPvSurplusAllocation = buildPvSurplusAllocation;
function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function roundW(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : 0;
}
function normalizePvSurplusPriority(value) {
    const mode = String(value ?? '').trim().toLowerCase();
    if (mode === 'storage' || mode === 'speicher')
        return 'storage';
    if (mode === 'emobility' || mode === 'e-mobility' || mode === 'evcs' || mode === 'wallbox')
        return 'emobility';
    if (mode === 'dynamic' || mode === 'auto' || mode === 'none' || mode === 'off' || mode === 'disabled')
        return 'dynamic';
    return 'both';
}
function buildPvSurplusAllocation(totalW, modeRaw, evcsSharePctRaw, options = {}) {
    const total = Math.max(0, Number(totalW) || 0);
    const allocationEnabled = options.allocationEnabled !== false;
    const mode = allocationEnabled ? normalizePvSurplusPriority(modeRaw) : 'dynamic';
    const evcsSharePct = clamp(evcsSharePctRaw, 0, 100, 50);
    const storageEligible = options.storageEligible !== false;
    const storageMaxRaw = Number(options.storageMaxChargeW);
    const storageMaxChargeW = Number.isFinite(storageMaxRaw) && storageMaxRaw > 0 ? storageMaxRaw : Number.POSITIVE_INFINITY;
    let storageWantedW = 0;
    let reason = 'shared';
    if (!storageEligible)
        reason = 'storage-not-eligible';
    else if (mode === 'storage') {
        storageWantedW = total;
        reason = 'storage-first';
    }
    else if (mode === 'emobility')
        reason = 'emobility-first';
    else if (mode === 'dynamic')
        reason = allocationEnabled ? 'dynamic-demand-remainder' : 'fixed-allocation-disabled';
    else
        storageWantedW = total * (1 - evcsSharePct / 100);
    const storageGuaranteedW = storageEligible ? Math.max(0, Math.min(total, storageWantedW, storageMaxChargeW)) : 0;
    return {
        mode,
        allocationEnabled,
        evcsSharePct: Math.round(evcsSharePct),
        totalW: roundW(total),
        evcsCapW: roundW(Math.max(0, total - storageGuaranteedW)),
        storageGuaranteedW: roundW(storageGuaranteedW),
        storageEligible,
        storageMaxChargeW: Number.isFinite(storageMaxChargeW) ? roundW(storageMaxChargeW) : null,
        reason,
    };
}
module.exports = { normalizePvSurplusPriority, buildPvSurplusAllocation };
