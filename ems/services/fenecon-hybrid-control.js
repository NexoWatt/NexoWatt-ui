/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts
 * Quell-Hash: sha256:8acfb3673e10b12836d0d2752ebbdaccb221d084c244a812a3af5a410f4ca9e1
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
    if (['hybrid-auto', 'pv-pass-through', 'day-fems-night-direct', 'fems-day-direct-night'].includes(raw))
        return 'hybrid-auto';
    return 'auto';
}
function isFeneconHybrid(config = {}) {
    const profile = normalizeVendorProfile(config.vendorProfile);
    const coupling = text(config.coupling).toLowerCase();
    return profile === 'fenecon-openems' && coupling === 'dc';
}
function hasWritableNativeTarget(config = {}) {
    return !!text(config.feneconGridSetpointObjectId
        || config.feneconGridSetpointId
        || config.femsGridSetpointObjectId
        || config.femsGridSetpointId);
}
function hasWritableDirectTarget(config = {}, context = {}) {
    if (context.directTargetAvailable === true)
        return true;
    return !!text(config.setSignedPowerId
        || config.setSignedPowerObjectId
        || config.targetPowerObjectId
        || config.targetPowerId
        || config.setChargePowerId
        || config.setChargePowerObjectId
        || config.setDischargePowerId
        || config.setDischargePowerObjectId);
}
/**
 * Zustandsautomat fuer die exklusive FENECON-Hybrid-Automatik.
 *
 * Vertrag:
 * - Frische PV oberhalb der Einschaltschwelle: FEMS besitzt die Regelhoheit,
 *   NexoWatt schreibt weder SetActivePowerEquals noch SetGridActivePower.
 * - PV dauerhaft unterhalb der Ausschaltschwelle: NexoWatt uebernimmt die
 *   direkte ESS-Regelung.
 * - Unklare/veraltete PV-Messung: fail-safe FEMS-Regelung, kein externer Write.
 * - Die Hysterese verhindert Wolken-Flattern; der Wechsel zu FEMS ist sofort,
 *   der Wechsel zur Nachtregelung bewusst zeitverzoegert.
 */
function resolveHybridAuthority(config = {}, runtime = {}) {
    const nowMs = Math.max(0, Math.round(finite(runtime.nowMs) ?? Date.now()));
    const pvWRaw = finite(runtime.pvW);
    const pvW = pvWRaw === null ? null : Math.max(0, Math.round(pvWRaw));
    const pvFresh = runtime.pvFresh === true && pvW !== null;
    const onThresholdW = Math.max(0, Math.round(finite(config.pvOnThresholdW)
        ?? finite(config.feneconPvPassthroughThresholdW)
        ?? 200));
    const offThresholdW = Math.max(0, Math.min(onThresholdW, Math.round(finite(config.pvOffThresholdW)
        ?? finite(config.feneconPvReleaseThresholdW)
        ?? 50)));
    const offDelaySec = Math.max(0, Math.min(3600, finite(config.pvOffDelaySec)
        ?? finite(config.feneconPvReleaseDelaySec)
        ?? 120));
    const offDelayMs = Math.round(offDelaySec * 1000);
    const previousRaw = text(runtime.previousAuthority).toLowerCase();
    const previousAuthority = previousRaw === 'nexowatt' ? 'nexowatt' : (previousRaw === 'fems' ? 'fems' : 'unknown');
    let pvBelowSinceMs = Math.max(0, Math.round(finite(runtime.pvBelowSinceMs) ?? 0));
    if (!pvFresh) {
        return {
            authority: 'fems',
            noWrite: true,
            mode: 'fems-pv-unknown',
            reason: 'PV-Messung fehlt oder ist veraltet – FEMS bleibt fail-safe fuehrend',
            pvW,
            pvFresh: false,
            onThresholdW,
            offThresholdW,
            offDelayMs,
            pvBelowSinceMs: 0,
            pvBelowForMs: 0,
        };
    }
    if (pvW >= onThresholdW) {
        return {
            authority: 'fems',
            noWrite: true,
            mode: 'fems-pv-active',
            reason: `PV ${pvW} W >= ${onThresholdW} W – FEMS regelt Hybrid-PV, Haus und Speicher intern`,
            pvW,
            pvFresh: true,
            onThresholdW,
            offThresholdW,
            offDelayMs,
            pvBelowSinceMs: 0,
            pvBelowForMs: 0,
        };
    }
    if (previousAuthority === 'nexowatt') {
        return {
            authority: 'nexowatt',
            noWrite: false,
            mode: 'nexowatt-night-direct',
            reason: pvW <= offThresholdW
                ? `PV ${pvW} W <= ${offThresholdW} W – NexoWatt-Nachtregelung bleibt aktiv`
                : `PV ${pvW} W im Hystereseband ${offThresholdW}..${onThresholdW} W – NexoWatt-Regelung bleibt aktiv`,
            pvW,
            pvFresh: true,
            onThresholdW,
            offThresholdW,
            offDelayMs,
            pvBelowSinceMs: pvW <= offThresholdW ? (pvBelowSinceMs || nowMs) : 0,
            pvBelowForMs: pvW <= offThresholdW && pvBelowSinceMs ? Math.max(0, nowMs - pvBelowSinceMs) : 0,
        };
    }
    if (pvW <= offThresholdW) {
        if (!pvBelowSinceMs)
            pvBelowSinceMs = nowMs;
        const pvBelowForMs = Math.max(0, nowMs - pvBelowSinceMs);
        if (pvBelowForMs >= offDelayMs) {
            return {
                authority: 'nexowatt',
                noWrite: false,
                mode: 'nexowatt-night-direct',
                reason: `PV seit ${Math.round(pvBelowForMs / 1000)} s <= ${offThresholdW} W – NexoWatt uebernimmt direkte ESS-Regelung`,
                pvW,
                pvFresh: true,
                onThresholdW,
                offThresholdW,
                offDelayMs,
                pvBelowSinceMs,
                pvBelowForMs,
            };
        }
        return {
            authority: 'fems',
            noWrite: true,
            mode: 'fems-pv-release-delay',
            reason: `PV ${pvW} W <= ${offThresholdW} W – Nachtuebernahme wartet noch ${Math.ceil((offDelayMs - pvBelowForMs) / 1000)} s`,
            pvW,
            pvFresh: true,
            onThresholdW,
            offThresholdW,
            offDelayMs,
            pvBelowSinceMs,
            pvBelowForMs,
        };
    }
    return {
        authority: 'fems',
        noWrite: true,
        mode: 'fems-pv-hysteresis',
        reason: `PV ${pvW} W im Hystereseband ${offThresholdW}..${onThresholdW} W – FEMS bleibt fuehrend`,
        pvW,
        pvFresh: true,
        onThresholdW,
        offThresholdW,
        offDelayMs,
        pvBelowSinceMs: 0,
        pvBelowForMs: 0,
    };
}
function resolveControlMode(config = {}, context = {}) {
    const requestedMode = normalizeControlMode(config.feneconControlMode || config.controlModeMode || config.feneconHybridControlMode);
    const hybrid = isFeneconHybrid(config);
    const nativeTargetAvailable = hasWritableNativeTarget(config);
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
        directTargetAvailable,
        writableStorageCount,
        otherWritableStorageCount,
    };
    if (!hybrid) {
        return {
            ...common,
            eligible: false,
            mode: requestedMode === 'fems-grid' || requestedMode === 'hybrid-auto' ? 'invalid' : 'direct-ess',
            reason: requestedMode === 'fems-grid' || requestedMode === 'hybrid-auto'
                ? 'fenecon-hybrid-mode-requires-fenecon-dc-hybrid'
                : 'not-fenecon-hybrid',
        };
    }
    if (requestedMode === 'direct-ess') {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'explicit-direct-ess' };
    }
    if (requestedMode === 'fems-grid') {
        if (!nativeTargetAvailable) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-target-missing' };
        }
        if (otherWritableStorageCount > 0) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fems-grid-master-requires-exclusive-storage' };
        }
        return { ...common, eligible: true, mode: 'fems-grid', reason: 'explicit-fems-grid' };
    }
    // Automatik ist der sichere Hybrid-Standard:
    // tagsueber/bei PV keine externe Vorgabe, nachts direkte ESS-Regelung.
    // In gemischten Farmen ist eine FEMS-Regelhoheit nicht exklusiv moeglich;
    // dort bleibt FENECON wie bisher ein direkter Farm-Teilnehmer.
    if (otherWritableStorageCount > 0) {
        if (!directTargetAvailable) {
            return { ...common, eligible: true, requestedMode: 'auto', mode: 'invalid', reason: 'auto-mixed-farm-direct-target-missing' };
        }
        return { ...common, eligible: true, requestedMode: 'auto', mode: 'direct-ess', reason: 'auto-mixed-farm-direct-ess' };
    }
    if (!directTargetAvailable) {
        return { ...common, eligible: true, requestedMode: 'auto', mode: 'invalid', reason: 'hybrid-auto-direct-target-missing' };
    }
    return { ...common, eligible: true, requestedMode: 'auto', mode: 'hybrid-auto', reason: 'auto-pv-fems-night-direct' };
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
    const configuredRows = rows.filter((row) => !!(text(row.setSignedPowerId)
        || text(row.setChargePowerId)
        || text(row.setDischargePowerId)
        || text(row.feneconGridSetpointId)
        || text(row.feneconGridSetpointObjectId)));
    const writableStorageCount = configuredRows.length;
    const resolved = configuredRows.map((row) => {
        const directTargetAvailable = !!(text(row.setSignedPowerId)
            || text(row.setChargePowerId)
            || text(row.setDischargePowerId));
        const result = resolveControlMode({
            vendorProfile: row.vendorProfile,
            coupling: row.coupling,
            feneconControlMode: row.feneconControlMode,
            feneconGridSetpointId: row.feneconGridSetpointId || row.feneconGridSetpointObjectId,
            setSignedPowerId: row.setSignedPowerId,
            setChargePowerId: row.setChargePowerId,
            setDischargePowerId: row.setDischargePowerId,
        }, {
            writableStorageCount,
            otherWritableStorageCount: Math.max(0, writableStorageCount - 1),
            directTargetAvailable,
        });
        let validationReason = '';
        if ((result.mode === 'direct-ess' || result.mode === 'hybrid-auto') && isFeneconHybrid(row) && !directTargetAvailable) {
            validationReason = writableStorageCount > 1
                ? 'fenecon-direct-target-missing-in-mixed-farm'
                : 'fenecon-direct-target-missing';
        }
        return { row, result, directTargetAvailable, validationReason };
    });
    const nativeRows = resolved.filter((item) => item.result.mode === 'fems-grid');
    const hybridAutoRows = resolved.filter((item) => item.result.mode === 'hybrid-auto');
    const invalidRows = resolved.filter((item) => item.result.mode === 'invalid' || item.validationReason);
    let ok = invalidRows.length === 0 && nativeRows.length <= 1;
    let reason = 'ok';
    if (nativeRows.length > 1) {
        ok = false;
        reason = 'multiple-fems-grid-masters';
    }
    else if (invalidRows.length) {
        reason = invalidRows[0].validationReason || invalidRows[0].result.reason;
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
        hybridAutoCount: hybridAutoRows.length,
        hybridAutoName: hybridAutoRows.length ? text(hybridAutoRows[0].row.name) : '',
        resolved: resolved.map((item) => ({
            name: text(item.row.name),
            mode: item.result.mode,
            requestedMode: item.result.requestedMode,
            reason: item.validationReason || item.result.reason,
            directTargetAvailable: item.directTargetAvailable,
        })),
    };
}
module.exports = {
    normalizeVendorProfile,
    normalizeControlMode,
    isFeneconHybrid,
    hasWritableNativeTarget,
    hasWritableDirectTarget,
    resolveHybridAuthority,
    resolveControlMode,
    calculateFemsGridTargetW,
    validateFarmRows,
};
