/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/consumers/sg-ready.ts
 * Quell-Hash: sha256:d9e958304e67cde097025f4febf05acdca386ecdbdd31c3119fe287a4f4a6bb5
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/consumers/sg-ready.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
function mappedKey(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function normalizeState(value) {
    const raw = String(value ?? 'off').trim().toLowerCase();
    if (!raw || raw === '0' || raw === 'normal')
        return 'off';
    if (raw === 'on' || raw === '1')
        return 'on';
    if (raw === 'boost' || raw === '2')
        return 'boost';
    if (raw === 'block' || raw === 'blocked' || raw === '3')
        return 'block';
    return 'off';
}
/**
 * Applies a single SG-Ready state without bypassing mapped output checks.
 */
async function applySgReady(ctx, consumer, target) {
    const adapter = ctx?.adapter ?? null;
    const dp = ctx?.dp ?? null;
    const sg1Key = mappedKey(consumer?.sg1Key);
    const sg2Key = mappedKey(consumer?.sg2Key);
    const enableKey = mappedKey(consumer?.enableKey);
    const has1 = !!(sg1Key && dp?.getEntry?.(sg1Key));
    const has2 = !!(sg2Key && dp?.getEntry?.(sg2Key));
    const hasEnable = !!(enableKey && dp?.getEntry?.(enableKey));
    if (!has1 && !has2 && !hasEnable) {
        return { applied: false, status: 'no_sgready_dp', writes: { sg1: null, sg2: null, enable: null } };
    }
    const state = normalizeState(target?.state);
    let sg1 = state === 'on' || state === 'boost';
    let sg2 = state === 'boost' || state === 'block';
    const enable = state === 'on' || state === 'boost';
    if (consumer?.invert1)
        sg1 = !sg1;
    if (consumer?.invert2)
        sg2 = !sg2;
    let wrote1 = null;
    let wrote2 = null;
    let wroteEnable = null;
    if (has1 && dp)
        wrote1 = await dp.writeBoolean(sg1Key, sg1, false);
    if (has2 && dp)
        wrote2 = await dp.writeBoolean(sg2Key, sg2, false);
    if (enableKey)
        wroteEnable = hasEnable && dp ? await dp.writeBoolean(enableKey, enable, false) : false;
    const results = [wrote1, wrote2, wroteEnable].filter((value) => value !== null);
    const anyFalse = results.some((value) => value === false);
    const anyTrue = results.some((value) => value === true);
    const status = anyFalse && anyTrue
        ? 'applied_partial'
        : anyFalse
            ? 'write_failed'
            : anyTrue
                ? 'applied'
                : 'unchanged';
    adapter?.log?.debug?.(`[consumer:sgready] apply '${String(consumer?.key ?? '')}' state=${state} wrote1=${wrote1} wrote2=${wrote2} wroteEn=${wroteEnable} status=${status}`);
    return {
        applied: !anyFalse,
        status,
        writes: { sg1: wrote1, sg2: wrote2, enable: wroteEnable },
        state,
    };
}
module.exports = { applySgReady };
