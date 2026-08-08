/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts
 * Quell-Hash: sha256:6675275699395ae5bf9289437267ffc3b7ebaabb4745b84a61c3930dd275a5b0
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/fenecon-hybrid-control.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}
function finite(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function clamp(value, minValue, maxValue) {
    let out = value;
    if (minValue !== null)
        out = Math.max(minValue, out);
    if (maxValue !== null)
        out = Math.min(maxValue, out);
    return out;
}
function normalizeObjectId(value) {
    return text(value).replace(/\s+/g, '').toLowerCase();
}
function sameObjectId(a, b) {
    const aa = normalizeObjectId(a);
    const bb = normalizeObjectId(b);
    return !!(aa && bb && aa === bb);
}
function normalizeVendorProfile(value) {
    const raw = text(value).toLowerCase();
    if (['fenecon', 'openems', 'fems', 'fenecon-openems'].includes(raw))
        return 'fenecon-openems';
    if (['sungrow', 'sungrow-ess', 'sungrow-hybrid'].includes(raw))
        return 'sungrow-hybrid';
    if (['e3dc', 'e3/dc', 'e3dc-rscp', 'e3dc-rscp-iobroker'].includes(raw))
        return 'e3dc-rscp';
    return raw || 'generic';
}
function normalizeControlMode(value) {
    const raw = text(value).toLowerCase();
    if (['fems-grid', 'fems', 'fems-nvp', 'native', 'native-grid', 'grid-target'].includes(raw))
        return 'fems-grid';
    if (['direct-ess', 'direct', 'ess', 'set-active-power', 'direct-power'].includes(raw))
        return 'direct-ess';
    // Migration: Die frühere PV-/Tag-Nacht-Automatik wird nicht mehr verwendet.
    // Alte Werte werden auf die sichere kontinuierliche Automatik migriert.
    if (['hybrid-auto', 'pv-pass-through', 'day-fems-night-direct', 'fems-day-direct-night'].includes(raw))
        return 'auto';
    return 'auto';
}
function isFeneconHybrid(config = {}) {
    const profile = normalizeVendorProfile(config.vendorProfile);
    const coupling = text(config.coupling).toLowerCase();
    return profile === 'fenecon-openems' && (coupling === 'dc' || coupling === 'hybrid');
}
function getNativeTargetId(config = {}) {
    return text(config.feneconGridSetpointObjectId
        || config.feneconGridSetpointId
        || config.femsGridSetpointObjectId
        || config.femsGridSetpointId);
}
function getDirectTargetIds(config = {}) {
    return [
        config.setSignedPowerId,
        config.setSignedPowerObjectId,
        config.targetPowerObjectId,
        config.targetPowerId,
        config.setChargePowerId,
        config.setChargePowerObjectId,
        config.targetChargePowerObjectId,
        config.setDischargePowerId,
        config.setDischargePowerObjectId,
        config.targetDischargePowerObjectId,
    ].map(text).filter(Boolean);
}
function getEssActualPowerId(config = {}) {
    return text(config.feneconEssActualPowerObjectId
        || config.feneconEssActualPowerId
        || config.essActualPowerObjectId
        || config.essActualPowerId
        || config.signedPowerId);
}
function hasWritableNativeTarget(config = {}) {
    return !!getNativeTargetId(config);
}
function hasWritableDirectTarget(config = {}, context = {}) {
    if (context.directTargetAvailable === true)
        return true;
    return getDirectTargetIds(config).length > 0;
}
function isPowerBalanceObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.powerbalance(?:$|\.)/.test(id)
        || /(?:^|[._/-])powerbalance(?:$|[._/-])/.test(id)
        || /batterypowerbalance/.test(id);
}
function isLikelyDirectEssSetpointObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.powersetpointw(?:$|\.)/.test(id)
        || /setactivepowerequals/.test(id)
        || /(?:^|[._/-])706(?:$|[._/-])/.test(id);
}
function isLikelyFemsGridTargetObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.(?:gridsetpointw|napsetpointw)(?:$|\.)/.test(id)
        || /setgridactivepower/.test(id)
        || /ctrlbalancing/.test(id);
}
function isLikelyFemsGridMeasurementObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id || isLikelyFemsGridTargetObjectId(id))
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
        || /(?:^|\.)r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
        || /(?:^|[._/-])(?:gridpower|powergrid|nvppower|nappower)(?:$|[._/-])/.test(id);
}
function resolveControlMode(config = {}, context = {}) {
    const requestedMode = normalizeControlMode(config.feneconControlMode || config.controlModeMode || config.feneconHybridControlMode);
    const hybrid = isFeneconHybrid(config);
    const nativeTargetId = getNativeTargetId(config);
    const directTargetIds = getDirectTargetIds(config);
    const nativeTargetIsMeasurement = isLikelyFemsGridMeasurementObjectId(nativeTargetId);
    const nativeTargetWritable = context.nativeTargetWritable !== false;
    const nativeTargetAvailable = !!nativeTargetId && !nativeTargetIsMeasurement && nativeTargetWritable;
    const directTargetAvailable = hasWritableDirectTarget(config, context);
    const writableStorageCountRaw = finite(context.writableStorageCount);
    const writableStorageCount = writableStorageCountRaw === null ? 1 : Math.max(0, Math.round(writableStorageCountRaw));
    const otherWritableStorageCountRaw = finite(context.otherWritableStorageCount);
    const otherWritableStorageCount = otherWritableStorageCountRaw === null
        ? Math.max(0, writableStorageCount - 1)
        : Math.max(0, Math.round(otherWritableStorageCountRaw));
    const common = {
        hybrid,
        requestedMode,
        nativeTargetAvailable,
        nativeTargetIsMeasurement,
        nativeTargetWritable,
        directTargetAvailable,
        nativeTargetId,
        directTargetIds,
        writableStorageCount,
        otherWritableStorageCount,
    };
    if (!hybrid) {
        return {
            ...common,
            eligible: false,
            mode: requestedMode === 'fems-grid' ? 'invalid' : 'direct-ess',
            reason: requestedMode === 'fems-grid'
                ? 'fems-grid-requires-fenecon-dc-hybrid'
                : 'not-fenecon-hybrid',
        };
    }
    if (requestedMode === 'fems-grid') {
        if (nativeTargetIsMeasurement) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-is-measurement' };
        }
        if (!nativeTargetWritable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-not-writable' };
        }
        if (!nativeTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-missing' };
        }
        if (otherWritableStorageCount > 0) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-master-requires-exclusive-storage' };
        }
        return { ...common, eligible: true, mode: 'fems-grid', reason: 'explicit-fems-grid' };
    }
    if (requestedMode === 'direct-ess') {
        if (!directTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'direct-ess-target-missing' };
        }
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'explicit-direct-ess' };
    }
    // Automatik wird beim Speichern/Start deterministisch aufgelöst und danach
    // nicht aufgrund von PV, Forecast oder Tageszeit gewechselt.
    if (otherWritableStorageCount > 0) {
        if (!directTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'auto-mixed-farm-direct-target-missing' };
        }
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-mixed-farm-direct-ess' };
    }
    if (nativeTargetIsMeasurement && directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-grid-measurement-ignored-direct-ess' };
    }
    if (!nativeTargetWritable && nativeTargetId && directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-readonly-grid-target-ignored-direct-ess' };
    }
    if (nativeTargetAvailable) {
        return { ...common, eligible: true, mode: 'fems-grid', reason: 'auto-dedicated-fems-grid-target' };
    }
    if (directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-direct-ess-fallback' };
    }
    if (nativeTargetIsMeasurement) {
        return { ...common, eligible: true, mode: 'invalid', reason: 'auto-grid-measurement-without-direct-target' };
    }
    if (!nativeTargetWritable && nativeTargetId) {
        return { ...common, eligible: true, mode: 'invalid', reason: 'auto-readonly-grid-target-without-direct-target' };
    }
    return { ...common, eligible: true, mode: 'invalid', reason: 'auto-no-writable-fenecon-target' };
}
/**
 * Legacy-Kompatibilität für ältere Aufrufer. PV darf die Reglerhoheit nicht
 * mehr umschalten; daher liefert der Helfer ausschließlich den kontinuierlich
 * aufgelösten Kommandopfad und niemals einen PV-bedingten No-Write-Zustand.
 */
function resolveHybridAuthority(config = {}, runtime = {}) {
    const resolution = resolveControlMode(config, runtime);
    return {
        authority: resolution.mode === 'invalid' ? 'blocked' : 'nexowatt',
        noWrite: false,
        mode: resolution.mode,
        reason: resolution.mode === 'invalid'
            ? resolution.reason
            : `Kontinuierlicher FENECON-Regelpfad: ${resolution.reason}`,
        pvW: finite(runtime.pvW),
        pvFresh: runtime.pvFresh === true,
        pvBelowSinceMs: 0,
        pvBelowForMs: 0,
    };
}
function validateSingleConfig(config = {}, context = {}) {
    const resolution = resolveControlMode(config, context);
    if (!isFeneconHybrid(config)) {
        return {
            ok: resolution.mode !== 'invalid',
            reason: resolution.mode === 'invalid' ? resolution.reason : 'not-fenecon-hybrid',
            resolution,
        };
    }
    const nativeTargetId = getNativeTargetId(config);
    const directTargetIds = getDirectTargetIds(config);
    const essActualPowerId = getEssActualPowerId(config);
    if (resolution.mode === 'invalid') {
        return { ok: false, reason: resolution.reason, resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (!essActualPowerId) {
        return { ok: false, reason: 'fenecon-ess-actual-power-missing', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (isPowerBalanceObjectId(essActualPowerId)) {
        return { ok: false, reason: 'fenecon-power-balance-not-valid-as-ess-feedback', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (nativeTargetId && directTargetIds.some((id) => sameObjectId(nativeTargetId, id))) {
        return { ok: false, reason: 'fenecon-grid-target-equals-direct-ess-target', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (nativeTargetId && isLikelyDirectEssSetpointObjectId(nativeTargetId) && !isLikelyFemsGridTargetObjectId(nativeTargetId)) {
        return { ok: false, reason: 'fenecon-grid-target-is-direct-ess-setpoint', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (directTargetIds.some((id) => sameObjectId(essActualPowerId, id))) {
        return { ok: false, reason: 'fenecon-ess-feedback-equals-command-target', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    if (nativeTargetId && sameObjectId(essActualPowerId, nativeTargetId)) {
        return { ok: false, reason: 'fenecon-ess-feedback-equals-grid-target', resolution, nativeTargetId, directTargetIds, essActualPowerId };
    }
    return {
        ok: true,
        reason: 'ok',
        resolution,
        nativeTargetId,
        directTargetIds,
        essActualPowerId,
    };
}
/**
 * Übersetzt den final durch alle EOS-Policies begrenzten Batterie-Sollwert in
 * den Netzpunkt-Sollwert des nativen FEMS-Balancing-Controllers.
 *
 * Vorzeichen:
 *   NVP +W = Netzbezug, -W = Einspeisung
 *   ESS +W = Entladen, -W = Laden
 */
function calculateFemsGridTargetW(input = {}) {
    const nvpW = finite(input.nvpW);
    const essActualW = finite(input.essActualW);
    const batteryTargetW = finite(input.batteryTargetW);
    if (nvpW === null || essActualW === null || batteryTargetW === null) {
        return {
            ok: false,
            reason: nvpW === null ? 'nvp-missing' : (essActualW === null ? 'ess-actual-missing' : 'battery-target-missing'),
            nvpW,
            essActualW,
            batteryTargetW,
            gridTargetW: null,
        };
    }
    const rawGridTargetW = nvpW + essActualW - batteryTargetW;
    const minW = finite(input.minGridTargetW);
    const maxW = finite(input.maxGridTargetW);
    const gridTargetW = Math.round(clamp(rawGridTargetW, minW, maxW));
    return {
        ok: true,
        reason: gridTargetW === Math.round(rawGridTargetW) ? 'calculated' : 'clamped',
        nvpW: Math.round(nvpW),
        essActualW: Math.round(essActualW),
        batteryTargetW: Math.round(batteryTargetW),
        rawGridTargetW: Math.round(rawGridTargetW),
        gridTargetW,
        minGridTargetW: minW,
        maxGridTargetW: maxW,
    };
}
function validateFarmRows(rowsIn) {
    const rows = Array.isArray(rowsIn)
        ? rowsIn.filter((row) => row && typeof row === 'object' && row.enabled !== false)
        : [];
    const configuredRows = rows.filter((row) => !!(getDirectTargetIds(row).length
        || getNativeTargetId(row)));
    const writableStorageCount = configuredRows.length;
    const resolved = configuredRows.map((row) => {
        const directTargetAvailable = getDirectTargetIds(row).length > 0;
        const validation = validateSingleConfig(row, {
            writableStorageCount,
            otherWritableStorageCount: Math.max(0, writableStorageCount - 1),
            directTargetAvailable,
        });
        return { row, validation, result: validation.resolution, directTargetAvailable };
    });
    const nativeRows = resolved.filter((item) => item.result && item.result.mode === 'fems-grid');
    const invalidRows = resolved.filter((item) => !item.validation.ok);
    let ok = invalidRows.length === 0 && nativeRows.length <= 1;
    let reason = 'ok';
    if (nativeRows.length > 1) {
        ok = false;
        reason = 'multiple-fems-grid-masters';
    }
    else if (invalidRows.length) {
        reason = invalidRows[0].validation.reason;
    }
    else if (nativeRows.length === 1 && writableStorageCount > 1) {
        ok = false;
        reason = 'fems-grid-master-with-other-writable-storage';
    }
    return {
        ok,
        reason,
        writableStorageCount,
        nativeMasterCount: nativeRows.length,
        nativeMasterName: nativeRows.length ? text(nativeRows[0].row.name) : '',
        resolved: resolved.map((item) => ({
            name: text(item.row.name),
            mode: item.result ? item.result.mode : 'invalid',
            requestedMode: item.result ? item.result.requestedMode : normalizeControlMode(item.row.feneconControlMode),
            reason: item.validation.reason,
            directTargetAvailable: item.directTargetAvailable,
            essActualPowerId: getEssActualPowerId(item.row),
        })),
    };
}
module.exports = {
    normalizeVendorProfile,
    normalizeControlMode,
    normalizeObjectId,
    sameObjectId,
    isFeneconHybrid,
    getNativeTargetId,
    getDirectTargetIds,
    getEssActualPowerId,
    hasWritableNativeTarget,
    hasWritableDirectTarget,
    isPowerBalanceObjectId,
    isLikelyDirectEssSetpointObjectId,
    isLikelyFemsGridTargetObjectId,
    isLikelyFemsGridMeasurementObjectId,
    resolveHybridAuthority,
    resolveControlMode,
    validateSingleConfig,
    calculateFemsGridTargetW,
    validateFarmRows,
};
