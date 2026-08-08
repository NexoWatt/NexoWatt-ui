// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/fenecon-hybrid-control.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/fenecon-hybrid-control.js
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
 * Original-Hash: 0d94e699c8f93ef804fc36eca66177d3e1a4a922ccda9c9a720fe0dd7b2e7e40
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
 * Quelle: src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts
 * Quell-Hash: sha256:720b37ed8e1967f1db28325e49750ff7cd141d9e3bf9782f2ed66a32aef06687
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
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}
/**
 * Code-Teil: finite
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finite(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(value, minValue, maxValue) {
    let out = value;
    if (minValue !== null)
        out = Math.max(minValue, out);
    if (maxValue !== null)
        out = Math.min(maxValue, out);
    return out;
}
/**
 * Code-Teil: normalizeObjectId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeObjectId(value) {
    return text(value).replace(/\s+/g, '').toLowerCase();
}
/**
 * Code-Teil: sameObjectId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function sameObjectId(a, b) {
    const aa = normalizeObjectId(a);
    const bb = normalizeObjectId(b);
    return !!(aa && bb && aa === bb);
}
/**
 * Code-Teil: normalizeVendorProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
/**
 * Code-Teil: normalizeControlMode
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
/**
 * Code-Teil: isFeneconHybrid
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isFeneconHybrid(config = {}) {
    const profile = normalizeVendorProfile(config.vendorProfile);
    const coupling = text(config.coupling).toLowerCase();
    return profile === 'fenecon-openems' && (coupling === 'dc' || coupling === 'hybrid');
}
/**
 * Code-Teil: getNativeTargetId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function getNativeTargetId(config = {}) {
    return text(config.feneconGridSetpointObjectId
        || config.feneconGridSetpointId
        || config.femsGridSetpointObjectId
        || config.femsGridSetpointId);
}
/**
 * Code-Teil: getDirectTargetIds
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
/**
 * Code-Teil: getEssActualPowerId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function getEssActualPowerId(config = {}) {
    return text(config.feneconEssActualPowerObjectId
        || config.feneconEssActualPowerId
        || config.essActualPowerObjectId
        || config.essActualPowerId
        || config.signedPowerId);
}
/**
 * Code-Teil: hasWritableNativeTarget
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function hasWritableNativeTarget(config = {}) {
    return !!getNativeTargetId(config);
}
/**
 * Code-Teil: hasWritableDirectTarget
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function hasWritableDirectTarget(config = {}, context = {}) {
    if (context.directTargetAvailable === true)
        return true;
    return getDirectTargetIds(config).length > 0;
}
/**
 * Code-Teil: isPowerBalanceObjectId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isPowerBalanceObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.powerbalance(?:$|\.)/.test(id)
        || /(?:^|[._/-])powerbalance(?:$|[._/-])/.test(id)
        || /batterypowerbalance/.test(id);
}
/**
 * Code-Teil: isLikelyDirectEssSetpointObjectId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isLikelyDirectEssSetpointObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.powersetpointw(?:$|\.)/.test(id)
        || /setactivepowerequals/.test(id)
        || /(?:^|[._/-])706(?:$|[._/-])/.test(id);
}
/**
 * Code-Teil: isLikelyFemsGridTargetObjectId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isLikelyFemsGridTargetObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id)
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.(?:gridsetpointw|napsetpointw)(?:$|\.)/.test(id)
        || /setgridactivepower/.test(id)
        || /ctrlbalancing/.test(id);
}
/**
 * Code-Teil: isLikelyFemsGridMeasurementObjectId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isLikelyFemsGridMeasurementObjectId(value) {
    const id = normalizeObjectId(value);
    if (!id || isLikelyFemsGridTargetObjectId(id))
        return false;
    return /(?:^|\.)aliases(?:\.v1)?\.r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
        || /(?:^|\.)r\.(?:gridpower|gridactivepower|powergrid|nvppower|nappower)(?:$|\.)/.test(id)
        || /(?:^|[._/-])(?:gridpower|powergrid|nvppower|nappower)(?:$|[._/-])/.test(id);
}
/**
 * Code-Teil: resolveControlMode
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function resolveControlMode(config = {}, context = {}) {
    const requestedMode = normalizeControlMode(config.feneconControlMode || config.controlModeMode || config.feneconHybridControlMode);
    const hybrid = isFeneconHybrid(config);
    const nativeTargetId = getNativeTargetId(config);
    const configuredDirectTargetIds = getDirectTargetIds(config);
    const nativeTargetIsMeasurement = isLikelyFemsGridMeasurementObjectId(nativeTargetId);
    const nativeTargetIsDirectEssSetpoint = isLikelyDirectEssSetpointObjectId(nativeTargetId)
        && !isLikelyFemsGridTargetObjectId(nativeTargetId);
    const nativeTargetWritable = context.nativeTargetWritable !== false;
    const nativeTargetAvailable = !!nativeTargetId
        && !nativeTargetIsMeasurement
        && !nativeTargetIsDirectEssSetpoint
        && nativeTargetWritable;
    const migratedDirectTargetId = requestedMode !== 'fems-grid' && nativeTargetIsDirectEssSetpoint
        ? nativeTargetId
        : '';
    const effectiveDirectTargetIds = configuredDirectTargetIds.length
        ? configuredDirectTargetIds
        : (migratedDirectTargetId ? [migratedDirectTargetId] : []);
    const directTargetAvailable = hasWritableDirectTarget(config, context) || !!migratedDirectTargetId;
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
        nativeTargetIsDirectEssSetpoint,
        nativeTargetWritable,
        directTargetAvailable,
        nativeTargetId,
        directTargetIds: configuredDirectTargetIds,
        effectiveDirectTargetIds,
        migratedDirectTargetId,
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
        if (nativeTargetIsDirectEssSetpoint) {
            return { ...common, eligible: true, mode: 'invalid', reason: 'fenecon-grid-target-is-direct-ess-setpoint' };
        }
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
    if (nativeTargetIsDirectEssSetpoint && directTargetAvailable) {
        return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-direct-setpoint-migrated-to-direct-ess' };
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
    if (nativeTargetIsDirectEssSetpoint) {
        return { ...common, eligible: true, mode: 'invalid', reason: 'auto-direct-setpoint-migration-unavailable' };
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
/**
 * Code-Teil: validateSingleConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function validateSingleConfig(config = {}, context = {}) {
    const resolution = resolveControlMode(config, context);
    if (!isFeneconHybrid(config)) {
        return {
            ok: resolution.mode !== 'invalid',
            reason: resolution.mode === 'invalid' ? resolution.reason : 'not-fenecon-hybrid',
            resolution,
        };
    }
    const configuredNativeTargetId = getNativeTargetId(config);
    const nativeTargetId = resolution.nativeTargetIsDirectEssSetpoint && resolution.requestedMode !== 'fems-grid'
        ? ''
        : configuredNativeTargetId;
    const directTargetIds = Array.isArray(resolution.effectiveDirectTargetIds)
        ? resolution.effectiveDirectTargetIds.map(text).filter(Boolean)
        : getDirectTargetIds(config);
    const essActualPowerId = getEssActualPowerId(config);
    if (resolution.mode === 'invalid') {
        return {
            ok: false,
            reason: resolution.reason,
            resolution,
            nativeTargetId,
            configuredNativeTargetId,
            directTargetIds,
            essActualPowerId,
        };
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
    if (configuredNativeTargetId
        && resolution.requestedMode === 'fems-grid'
        && isLikelyDirectEssSetpointObjectId(configuredNativeTargetId)
        && !isLikelyFemsGridTargetObjectId(configuredNativeTargetId)) {
        return {
            ok: false,
            reason: 'fenecon-grid-target-is-direct-ess-setpoint',
            resolution,
            nativeTargetId,
            configuredNativeTargetId,
            directTargetIds,
            essActualPowerId,
        };
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
        configuredNativeTargetId,
        directTargetIds,
        migratedDirectTargetId: text(resolution.migratedDirectTargetId),
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
/**
 * Code-Teil: validateFarmRows
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function validateFarmRows(rowsIn) {
    const rows = Array.isArray(rowsIn)
        ? rowsIn.filter((row) => row && typeof row === 'object' && row.enabled !== false)
        : [];
    const configuredRows = rows.filter((row) => !!(getDirectTargetIds(row).length
        || getNativeTargetId(row)));
    const writableStorageCount = configuredRows.length;
    const resolved = configuredRows.map((row) => {
        const nativeTargetId = getNativeTargetId(row);
        const requestedMode = normalizeControlMode(row.feneconControlMode || row.controlModeMode || row.feneconHybridControlMode);
        const legacyDirectInNativeField = requestedMode !== 'fems-grid'
            && isLikelyDirectEssSetpointObjectId(nativeTargetId)
            && !isLikelyFemsGridTargetObjectId(nativeTargetId);
        const directTargetAvailable = getDirectTargetIds(row).length > 0 || legacyDirectInNativeField;
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
