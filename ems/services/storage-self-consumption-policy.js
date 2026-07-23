/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/storage-self-consumption-policy.ts
 * Quell-Hash: sha256:e34610d3840c8d2bb0cc3702192a9904adc159b4bbb9477d4db4961f55f7aadd
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-self-consumption-policy.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function boolOrNull(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'ja', 'on', 'an'].includes(text))
            return true;
        if (['false', '0', 'no', 'nein', 'off', 'aus'].includes(text))
            return false;
    }
    return null;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function firstFinite(values, fallback) {
    for (const value of values) {
        const n = finiteOrNull(value);
        if (n !== null)
            return n;
    }
    return fallback;
}
function firstBoolean(values, fallback) {
    for (const value of values) {
        const b = boolOrNull(value);
        if (b !== null)
            return b;
    }
    return fallback;
}
function normalizeMultiUsePolicy(multiUse, defaults) {
    const reserveEnabled = firstBoolean([multiUse.reserveEnabled], true);
    const peakEnabled = firstBoolean([multiUse.peakEnabled], true);
    const selfEnabled = firstBoolean([multiUse.selfEnabled], true);
    const legacyReserveTo = clamp(firstFinite([multiUse.reserveToSocPct], 10), 0, 100);
    const legacyPeakTo = clamp(firstFinite([multiUse.peakToSocPct], 50), legacyReserveTo, 100);
    const legacySelfTo = clamp(firstFinite([multiUse.selfToSocPct], 100), legacyPeakTo, 100);
    const reserveMinSocPct = clamp(firstFinite([
        multiUse.reserveMinSocPct,
        multiUse.reserveToSocPct,
    ], legacyReserveTo), 0, 100);
    const reserveTargetSocPct = clamp(firstFinite([
        multiUse.reserveTargetSocPct,
    ], reserveMinSocPct), reserveMinSocPct, 100);
    const reserveBaseMin = reserveEnabled ? reserveMinSocPct : 0;
    const lskMinSocPct = clamp(firstFinite([
        multiUse.lskMinSocPct,
    ], reserveBaseMin), reserveBaseMin, 100);
    const lskMaxSocPct = clamp(firstFinite([
        multiUse.lskMaxSocPct,
        multiUse.peakToSocPct,
    ], legacyPeakTo), lskMinSocPct, 100);
    const selfBaseMin = peakEnabled ? lskMaxSocPct : reserveBaseMin;
    const selfMinSocPct = clamp(firstFinite([
        multiUse.selfMinSocPct,
    ], selfBaseMin), selfBaseMin, 100);
    const selfMaxSocPct = clamp(firstFinite([
        multiUse.selfMaxSocPct,
        multiUse.selfToSocPct,
    ], legacySelfTo), selfMinSocPct, 100);
    return {
        mode: 'multiuse',
        source: 'installerConfig.storageMultiUse',
        multiUseConfigured: true,
        multiUseActive: true,
        staleMultiUseIgnored: false,
        legacyStorageValuesIgnored: true,
        reserve: {
            enabled: reserveEnabled,
            minSocPct: reserveMinSocPct,
            targetSocPct: reserveTargetSocPct,
        },
        lsk: {
            enabled: peakEnabled,
            dischargeEnabled: peakEnabled && firstBoolean([multiUse.lskDischargeEnabled], true),
            chargeEnabled: peakEnabled && firstBoolean([multiUse.lskChargeEnabled], true),
            minSocPct: lskMinSocPct,
            maxSocPct: lskMaxSocPct,
        },
        self: {
            enabled: selfEnabled,
            minSocPct: selfMinSocPct,
            maxSocPct: selfMaxSocPct,
            targetGridImportW: Math.max(0, firstFinite([
                multiUse.selfTargetGridImportW,
            ], defaults.targetGridImportW)),
            importThresholdW: Math.max(0, firstFinite([
                multiUse.selfImportThresholdW,
            ], defaults.importThresholdW)),
        },
    };
}
function resolveStorageSocPolicy(input = {}) {
    const storage = isRecord(input.storageConfig) ? input.storageConfig : {};
    const multiUse = isRecord(input.multiUseConfig) ? input.multiUseConfig : null;
    const multiUseConfigured = !!multiUse;
    const multiUseActive = input.multiUseActive === true && !!multiUse;
    const defaultEnabled = firstBoolean([input.standaloneDefaultEnabled], true);
    const defaultMinSocPct = clamp(firstFinite([input.standaloneDefaultMinSocPct], 10), 0, 100);
    const defaultMaxSocPct = clamp(firstFinite([input.standaloneDefaultMaxSocPct], 100), defaultMinSocPct, 100);
    const defaultTargetGridImportW = Math.max(0, firstFinite([
        input.standaloneDefaultTargetGridImportW,
    ], 50));
    const defaultImportThresholdW = Math.max(0, firstFinite([
        input.standaloneDefaultImportThresholdW,
    ], 50));
    const defaults = {
        enabled: defaultEnabled,
        minSocPct: defaultMinSocPct,
        maxSocPct: defaultMaxSocPct,
        targetGridImportW: defaultTargetGridImportW,
        importThresholdW: defaultImportThresholdW,
    };
    if (multiUseActive && multiUse)
        return normalizeMultiUsePolicy(multiUse, defaults);
    // Nur ein nachweislich frueher *aktives* MultiUse darf storage.self* als
    // historisch gespiegelt markieren. Eine reine Schema-/Versionsmarke oder ein
    // vorhandener, aber nie aktivierter MultiUse-Datensatz ist kein Beweis dafuer
    // und darf die Standalone-Konfiguration nicht veraendern.
    const multiUsePolicySourceMarker = String(storage.multiUsePolicySource || '').trim().toLowerCase();
    const previouslyMirroredByMultiUse = boolOrNull(storage.multiUsePolicyApplied) === true
        || multiUsePolicySourceMarker === 'installerconfig.storagemultiuse'
        || multiUsePolicySourceMarker.includes('multiuse-applied');
    const standaloneEnabled = boolOrNull(storage.standaloneSelfDischargeEnabled);
    const standaloneMin = finiteOrNull(storage.standaloneSelfMinSocPct);
    const standaloneMax = finiteOrNull(storage.standaloneSelfMaxSocPct);
    const standaloneTarget = finiteOrNull(storage.standaloneSelfTargetGridImportW);
    const standaloneDeadband = finiteOrNull(storage.standaloneSelfImportThresholdW);
    const hasStandaloneSocSnapshot = standaloneEnabled !== null
        || standaloneMin !== null
        || standaloneMax !== null;
    const hasStandaloneTuningSnapshot = standaloneTarget !== null
        || standaloneDeadband !== null;
    const hasStandaloneSnapshot = hasStandaloneSocSnapshot || hasStandaloneTuningSnapshot;
    const legacyEnabled = boolOrNull(storage.selfDischargeEnabled);
    const legacyMin = finiteOrNull(storage.selfMinSocPct);
    const legacyMax = finiteOrNull(storage.selfMaxSocPct);
    const legacyTarget = finiteOrNull(storage.selfTargetGridImportW);
    const legacyDeadband = finiteOrNull(storage.selfImportThresholdW);
    // SoC-/Freigabewerte sind bei vorhandenem, aber deaktiviertem MultiUse
    // historisch nicht eindeutig: fruehere Versionen haben genau diese Felder
    // aus MultiUse nach storage.* kopiert. Ohne expliziten Standalone-Snapshot
    // gelten deshalb sichere 10..100-%-Defaults. Zielimport und Deadband sind
    // dagegen normale Standalone-Tuningwerte und duerfen weiter genutzt werden,
    // solange kein frueherer MultiUse-Spiegel markiert ist.
    // Die alten storage.self*-SoC-/Freigabefelder sind bei vorhandenem MultiUse-
    // Datensatz historisch mehrdeutig, weil fruehere Versionen sie direkt aus
    // MultiUse gespiegelt haben. Solange kein expliziter Standalone-Snapshot
    // existiert, werden sie bei einem vorhandenen (auch deaktivierten) MultiUse
    // deshalb nicht als eigenstaendige Policy uebernommen. Ein reiner Versions-
    // marker ohne MultiUse-Datensatz reicht dagegen nicht aus, sie zu verwerfen.
    const useLegacyStandaloneSoc = !hasStandaloneSocSnapshot
        && !multiUseConfigured
        && !previouslyMirroredByMultiUse;
    const useLegacyStandaloneTuning = !hasStandaloneTuningSnapshot
        && !previouslyMirroredByMultiUse;
    const selfEnabled = standaloneEnabled !== null
        ? standaloneEnabled
        : (useLegacyStandaloneSoc && legacyEnabled !== null ? legacyEnabled : defaultEnabled);
    const selfMinSocPct = clamp(standaloneMin !== null
        ? standaloneMin
        : (useLegacyStandaloneSoc && legacyMin !== null ? legacyMin : defaultMinSocPct), 0, 100);
    const selfMaxSocPct = clamp(standaloneMax !== null
        ? standaloneMax
        : (useLegacyStandaloneSoc && legacyMax !== null ? legacyMax : defaultMaxSocPct), selfMinSocPct, 100);
    const targetGridImportW = Math.max(0, standaloneTarget !== null
        ? standaloneTarget
        : (useLegacyStandaloneTuning && legacyTarget !== null ? legacyTarget : defaultTargetGridImportW));
    const importThresholdW = Math.max(0, standaloneDeadband !== null
        ? standaloneDeadband
        : (useLegacyStandaloneTuning && legacyDeadband !== null ? legacyDeadband : defaultImportThresholdW));
    let source = 'standalone-default';
    if (hasStandaloneSocSnapshot)
        source = 'storage.standaloneSelf';
    else if (useLegacyStandaloneSoc)
        source = multiUseConfigured
            ? 'storage.self-legacy;inactive-multiuse-ignored'
            : 'storage.self-legacy';
    // Der Migrationsgrund ist aussagekraeftiger als das weiterhin vorhandene,
    // aber deaktivierte MultiUse-Objekt. So ist in Diagnose und Feldtest direkt
    // erkennbar, dass ein historischer Spiegel bewusst verworfen wurde.
    else if (previouslyMirroredByMultiUse)
        source = 'standalone-default-after-multiuse';
    else if (multiUseConfigured)
        source = 'standalone-default-inactive-multiuse';
    return {
        mode: 'standalone',
        source,
        multiUseConfigured,
        multiUseActive: false,
        staleMultiUseIgnored: multiUseConfigured || previouslyMirroredByMultiUse,
        previousMultiUseMirrorDetected: previouslyMirroredByMultiUse,
        legacyStorageValuesIgnored: !useLegacyStandaloneSoc,
        legacyTuningValuesUsed: useLegacyStandaloneTuning,
        standaloneSnapshotAvailable: hasStandaloneSnapshot,
        standaloneSocSnapshotAvailable: hasStandaloneSocSnapshot,
        standaloneTuningSnapshotAvailable: hasStandaloneTuningSnapshot,
        reserve: {
            enabled: false,
            minSocPct: 0,
            targetSocPct: 0,
        },
        lsk: {
            enabled: false,
            dischargeEnabled: false,
            chargeEnabled: false,
            minSocPct: 0,
            maxSocPct: 100,
        },
        self: {
            enabled: selfEnabled,
            minSocPct: selfMinSocPct,
            maxSocPct: selfMaxSocPct,
            targetGridImportW,
            importThresholdW,
        },
    };
}
// Rueckwaertskompatible Aliasnamen fuer bestehende Test-/Migrationshelfer.
function resolveStorageSelfConsumptionPolicy(input = {}) {
    return resolveStorageSocPolicy(input);
}
function resolveStorageOperatingPolicy(input = {}) {
    return resolveStorageSocPolicy(input);
}
module.exports = {
    resolveStorageSocPolicy,
    resolveStorageSelfConsumptionPolicy,
    resolveStorageOperatingPolicy,
};
