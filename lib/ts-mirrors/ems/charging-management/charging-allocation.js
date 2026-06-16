'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-allocation.ts
 * Quell-Hash: sha256:8826ccc2e67b7d774ed8f81dbf8c2b4693e09e6860cb2085ca655cc7310dabf3
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-/Wallbox-Allocation-Shadow und Produktiv-Vorbereitung.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
/**
 * Datei: src-ts/ems/charging-management/charging-allocation.ts
 *
 * Zweck:
 * TypeScript-Shadow, Produktiv-Vorbereitung und produktiver Apply-Vertrag für die EVCS-/Wallbox-Allocation.
 * Ab 0.7.126 liefert TS den geprüften Zielplan für die Runtime. Ab 0.7.127
 * ist JavaScript im EVCS-Normalpfad nur noch Executor/Fallback; auch Safety-Rampdowns
 * laufen über denselben Executor-Vertrag statt über eigene Direktwrite-Schleifen.
 *
 * Wichtig:
 * - 0 W / 0 A sind gültige sichere Zielwerte.
 * - Anlagen ohne Ladepunkte dürfen keine EVCS-Sichtbarkeit erzeugen.
 * - Diese Datei schreibt keine ioBroker-States und keine Wallbox-Setpoints.
 * - JS bleibt nur Executor/Fallback; fachliche Apply-Verträge kommen aus TypeScript.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingAllocationShadowPlan = buildChargingAllocationShadowPlan;
exports.compareChargingAllocationShadowPlan = compareChargingAllocationShadowPlan;
exports.buildChargingAllocationProductivePrep = buildChargingAllocationProductivePrep;
exports.buildChargingAllocationProductive = buildChargingAllocationProductive;
function finiteOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const s = value.trim().replace(',', '.');
        if (!s)
            return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function nonNegative(value, fallback = 0) {
    const n = finiteOrNull(value);
    const v = n === null ? fallback : n;
    return v > 0 ? Math.round(v) : 0;
}
function nonNegativeFloat(value, fallback = 0) {
    const n = finiteOrNull(value);
    const v = n === null ? fallback : n;
    return v > 0 ? Number(v.toFixed(3)) : 0;
}
function boolValue(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'connected', 'plugged'].includes(s))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive', 'disconnected', 'unplugged'].includes(s))
            return false;
    }
    return fallback;
}
function str(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
}
function safeKey(value, fallbackIndex = 0) {
    const raw = str(value, `wallbox_${fallbackIndex + 1}`);
    const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return safe || `wallbox_${fallbackIndex + 1}`;
}
function normalizeControlBasis(value) {
    const raw = str(value, 'power').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return raw === 'a' || raw === 'amp' || raw === 'amps' || raw === 'current' || raw === 'currenta' || raw === 'currentampere'
        ? 'current'
        : 'power';
}
function allocationSafe(allocation, fallbackIndex = 0) {
    return safeKey(allocation.safe ?? allocation.key ?? allocation.id ?? allocation.name, fallbackIndex);
}
function buildAllocationMap(allocations) {
    const map = new Map();
    allocations.forEach((allocation, index) => {
        if (!allocation || typeof allocation !== 'object')
            return;
        if (String(allocation.type || '') === 'budget')
            return;
        const safe = allocationSafe(allocation, index);
        if (safe)
            map.set(safe, allocation);
    });
    return map;
}
function normalizeWallboxPlan(wallbox, index, allocation, input) {
    const safe = safeKey(wallbox.safe ?? wallbox.key ?? wallbox.id ?? wallbox.name ?? (allocation ? allocation.safe : null), index);
    const name = str(wallbox.name ?? (allocation ? allocation.name : null), safe);
    const enabled = boolValue(wallbox.enabled, boolValue(allocation ? allocation.enabled : undefined, false));
    const online = boolValue(wallbox.online, boolValue(allocation ? allocation.online : undefined, false));
    const connected = boolValue(wallbox.vehiclePlugged, enabled || online);
    const charging = boolValue(wallbox.charging, boolValue(allocation ? allocation.charging : undefined, false));
    const effectiveMode = str(allocation ? allocation.effectiveMode : undefined, str(wallbox.effectiveMode, str(wallbox.userMode, str(input.mode, 'unknown'))));
    const userMode = str(wallbox.userMode, str(allocation ? allocation.userMode : undefined, ''));
    const chargerType = str(wallbox.chargerType ?? (allocation ? allocation.chargerType : null), 'ac').toLowerCase();
    const controlBasisRaw = str(wallbox.controlBasis ?? (allocation ? allocation.controlBasis : null), 'power').toLowerCase();
    const controlBasis = ['current', 'currenta', 'current_a', 'a', 'amp', 'amps'].includes(controlBasisRaw) ? 'current' : 'power';
    const phases = Math.max(1, Math.min(3, nonNegative(wallbox.phases, chargerType === 'dc' ? 1 : 3) || 1));
    const voltageV = Math.max(1, nonNegative(wallbox.voltageV, 230) || 230);
    const minA = nonNegativeFloat(wallbox.minA, 0);
    const maxA = nonNegativeFloat(wallbox.maxA, 0);
    const derivedMinW = phases * voltageV * minA;
    const derivedMaxW = phases * voltageV * maxA;
    const minPowerW = nonNegative(wallbox.minPowerW ?? wallbox.minPW, derivedMinW);
    const maxPowerW = nonNegative(wallbox.maxPowerW ?? wallbox.maxPW, derivedMaxW);
    const targetPowerW = nonNegative((allocation ? (allocation.targetW ?? allocation.targetPowerW) : undefined) ?? wallbox.targetPowerW ?? wallbox.targetW);
    const targetCurrentA = nonNegativeFloat((allocation ? (allocation.targetA ?? allocation.targetCurrentA) : undefined) ?? wallbox.targetCurrentA ?? wallbox.targetA);
    const actualPowerW = nonNegative(wallbox.actualPowerW ?? (allocation ? allocation.actualPowerW : undefined));
    const pvUsedW = nonNegative(allocation ? allocation.pvUsedW : undefined);
    const hasPowerSetpoint = boolValue(wallbox.hasSetPower, typeof wallbox.setWKey === 'string' && wallbox.setWKey.trim().length > 0);
    const hasCurrentSetpoint = boolValue(wallbox.hasSetCurrent, typeof wallbox.setAKey === 'string' && wallbox.setAKey.trim().length > 0);
    const hasSetpoint = boolValue(wallbox.hasSetpoint, hasPowerSetpoint || hasCurrentSetpoint || !!wallbox.setWKey || !!wallbox.setAKey);
    const reason = str((allocation ? allocation.reason : undefined) ?? wallbox.reason, enabled && online ? '' : 'not_available');
    const blocked = !enabled || !online || reason === 'blocked' || reason === 'stale_meter' || reason === 'control_disabled';
    const writeRequired = hasSetpoint && online && (targetPowerW > 0 || targetCurrentA > 0 || enabled === false || reason === 'control_disabled');
    return {
        safe,
        name,
        enabled,
        online,
        connected,
        charging,
        effectiveMode,
        userMode,
        chargerType,
        controlBasis,
        phases,
        voltageV,
        minPowerW,
        maxPowerW,
        minA,
        maxA,
        priority: nonNegative(wallbox.priority ?? (allocation ? allocation.priority : undefined)),
        stationKey: str(wallbox.stationKey ?? (allocation ? allocation.stationKey : undefined)),
        connectorNo: nonNegative(wallbox.connectorNo ?? (allocation ? allocation.connectorNo : undefined)),
        setAKey: str(wallbox.setAKey ?? (allocation ? allocation.setAKey : undefined)),
        setWKey: str(wallbox.setWKey ?? (allocation ? allocation.setWKey : undefined)),
        enableKey: str(wallbox.enableKey ?? (allocation ? allocation.enableKey : undefined)),
        targetPowerW,
        targetCurrentA,
        actualPowerW,
        pvUsedW,
        blocked,
        reason,
        writeRequired,
        hasSetpoint,
        hasPowerSetpoint,
        hasCurrentSetpoint,
        boost: boolValue(allocation ? allocation.boost : undefined, effectiveMode === 'boost'),
    };
}
/**
 * Code-Teil: buildChargingAllocationShadowPlan
 * Zweck: Baut pro Wallbox einen typisierten Allocation-Plan aus den produktiven JS-Diagnosedaten.
 */
function buildChargingAllocationShadowPlan(input) {
    const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const allocations = Array.isArray(input.allocations) ? input.allocations : [];
    const allocationMap = buildAllocationMap(allocations);
    const safetyStop = boolValue(input.safetyStop, false);
    const safetyReason = safetyStop ? str(input.safetyReason, boolValue(input.staleMeter) ? 'stale-meter-safety-stop' : 'evcs-safety-stop') : '';
    const plannedRaw = wallboxes.map((wallbox, index) => {
        const key = safeKey(wallbox.safe ?? wallbox.key ?? wallbox.id ?? wallbox.name, index);
        return normalizeWallboxPlan(wallbox, index, allocationMap.get(key) || null, input);
    });
    for (const [safe, allocation] of allocationMap.entries()) {
        if (!plannedRaw.some((w) => w.safe === safe))
            plannedRaw.push(normalizeWallboxPlan({ safe }, plannedRaw.length, allocation, input));
    }
    const planned = safetyStop
        ? plannedRaw.map((wb) => {
            const hasAnySetpoint = !!(wb.hasSetpoint || wb.setAKey || wb.setWKey);
            const canWriteSafeStop = wb.online && hasAnySetpoint;
            return {
                ...wb,
                targetPowerW: 0,
                targetCurrentA: 0,
                pvUsedW: 0,
                boost: false,
                blocked: !canWriteSafeStop,
                reason: canWriteSafeStop ? safetyReason : (wb.online ? 'missing-wallbox-setpoint' : 'offline'),
                writeRequired: canWriteSafeStop,
            };
        })
        : plannedRaw;
    const sumTargetPowerW = planned.reduce((sum, wb) => sum + Math.max(0, wb.targetPowerW || 0), 0);
    const sumTargetCurrentA = planned.reduce((sum, wb) => sum + Math.max(0, wb.targetCurrentA || 0), 0);
    const explicitTotalPower = safetyStop ? 0 : finiteOrNull(input.totalTargetPowerW);
    const explicitTotalCurrent = safetyStop ? 0 : finiteOrNull(input.totalTargetCurrentA);
    const blockers = [];
    const warnings = [];
    if (!planned.length)
        warnings.push('no-wallboxes-configured');
    if (safetyStop)
        warnings.push(safetyReason);
    if (boolValue(input.staleMeter) && !safetyStop)
        blockers.push('stale-meter');
    if (boolValue(input.staleBudget) && !safetyStop)
        blockers.push('stale-budget');
    if (safetyStop && planned.some((wb) => wb.targetPowerW > 0 || wb.targetCurrentA > 0))
        blockers.push('non-zero-safety-stop-target');
    if (planned.length && !planned.some((wb) => wb.hasSetpoint))
        warnings.push('no-wallbox-setpoints');
    if (planned.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint))
        warnings.push('enabled-online-wallbox-without-setpoint');
    return {
        source: 'ts-charging-allocation-shadow-v1',
        available: true,
        ok: blockers.length === 0,
        productive: false,
        ts: finiteOrNull(input.ts) ?? Date.now(),
        mode: str(input.mode, 'unknown'),
        budgetMode: str(input.budgetMode, 'unknown'),
        budgetW: finiteOrNull(input.budgetW),
        usedW: nonNegative(input.usedW, sumTargetPowerW),
        remainingW: nonNegative(input.remainingW),
        totalPowerW: nonNegative(input.totalPowerW),
        totalTargetPowerW: explicitTotalPower === null ? Math.round(sumTargetPowerW) : Math.max(0, Math.round(explicitTotalPower)),
        totalTargetCurrentA: explicitTotalCurrent === null ? Number(sumTargetCurrentA.toFixed(3)) : Math.max(0, Number(explicitTotalCurrent.toFixed(3))),
        wallboxCount: planned.length,
        onlineWallboxes: planned.filter((wb) => wb.online).length,
        connectedCount: planned.filter((wb) => wb.connected).length,
        activeTargetCount: planned.filter((wb) => wb.targetPowerW > 0 || wb.targetCurrentA > 0).length,
        boostCount: planned.filter((wb) => wb.boost).length,
        pvLimitedCount: planned.filter((wb) => wb.pvUsedW > 0 || String(wb.effectiveMode).toLowerCase().includes('pv')).length,
        gates: {
            pausedByPeakShaving: boolValue(input.pausedByPeakShaving),
            staleMeter: boolValue(input.staleMeter),
            staleBudget: boolValue(input.staleBudget),
            pvAvailable: boolValue(input.pvAvailable),
            gridCapBinding: boolValue(input.gridCapBinding),
            phaseCapBinding: boolValue(input.phaseCapBinding),
            para14aActive: boolValue(input.para14aActive),
            para14aBinding: boolValue(input.para14aBinding),
            storageAssistActive: boolValue(input.storageAssistActive),
            safetyStop,
        },
        safetyReason,
        caps: {
            pvAvailableW: nonNegative(input.pvAvailableW),
            gridCapEvcsW: nonNegative(input.gridCapEvcsW),
            phaseCapEvcsW: nonNegative(input.phaseCapEvcsW),
            para14aCapEvcsW: nonNegative(input.para14aCapEvcsW),
            storageAssistW: nonNegative(input.storageAssistW),
        },
        wallboxes: planned,
        warnings,
        blockers,
    };
}
/**
 * Code-Teil: compareChargingAllocationShadowPlan
 * Zweck: Vergleicht TS-Plan mit JS-Summen und JS-Diagnose-Allocation pro Wallbox.
 */
function compareChargingAllocationShadowPlan(input, plan) {
    const mismatches = [];
    const pushMismatch = (field, js, ts, diff, safe) => {
        const item = { field, js, ts };
        if (safe)
            item.safe = safe;
        if (diff !== undefined)
            item.diff = diff;
        mismatches.push(item);
    };
    const cmpNumber = (field, jsValue, tsValue, tolerance = 1, safe) => {
        const js = finiteOrNull(jsValue);
        const ts = finiteOrNull(tsValue);
        if (js === null && ts === null)
            return;
        if (js === null || ts === null) {
            pushMismatch(field, js, ts, null, safe);
            return;
        }
        const diff = Math.abs(js - ts);
        if (diff > tolerance)
            pushMismatch(field, js, ts, Number(diff.toFixed(3)), safe);
    };
    cmpNumber('totalTargetPowerW', input.totalTargetPowerW, plan.totalTargetPowerW, 1);
    cmpNumber('totalTargetCurrentA', input.totalTargetCurrentA, plan.totalTargetCurrentA, 0.05);
    cmpNumber('wallboxCount', Array.isArray(input.wallboxes) ? input.wallboxes.length : 0, plan.wallboxCount, 0);
    const tsBySafe = new Map(plan.wallboxes.map((wb) => [wb.safe, wb]));
    const allocations = Array.isArray(input.allocations) ? input.allocations : [];
    allocations.forEach((allocation, index) => {
        if (!allocation || typeof allocation !== 'object' || String(allocation.type || '') === 'budget')
            return;
        const safe = allocationSafe(allocation, index);
        const wb = tsBySafe.get(safe);
        if (!wb) {
            mismatches.push({ field: 'wallbox', safe, js: 'present', ts: 'missing', diff: null });
            return;
        }
        cmpNumber('targetPowerW', allocation.targetW ?? allocation.targetPowerW, wb.targetPowerW, 1, safe);
        cmpNumber('targetCurrentA', allocation.targetA ?? allocation.targetCurrentA, wb.targetCurrentA, 0.05, safe);
    });
    return {
        source: 'ts-charging-allocation-shadow-comparison-v1',
        ok: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches,
    };
}
function buildChargingAllocationApply(plan) {
    return {
        wallboxes: plan.wallboxes.map((wb) => ({ ...wb })),
        totalTargetPowerW: plan.totalTargetPowerW,
        totalTargetCurrentA: plan.totalTargetCurrentA,
        budgetW: plan.budgetW,
        usedW: plan.usedW,
        remainingW: plan.remainingW,
    };
}
function collectProductiveBlockers(plan, comparison) {
    const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
    if (!comparison.ok)
        blockers.push('ts-js-allocation-mismatch');
    if (plan.wallboxes.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint))
        blockers.push('missing-wallbox-setpoint');
    return Array.from(new Set(blockers));
}
/**
 * Code-Teil: buildChargingAllocationProductivePrep
 * Zweck: Bereitet die spätere produktive TS-Allocation vor, ohne Setpoints zu schreiben.
 */
function buildChargingAllocationProductivePrep(input, plan = buildChargingAllocationShadowPlan(input), comparison = compareChargingAllocationShadowPlan(input, plan)) {
    const blockers = collectProductiveBlockers(plan, comparison);
    const prepared = plan.ok === true && comparison.ok === true && blockers.length === 0;
    const fallbackReason = prepared
        ? ''
        : (!comparison.ok ? 'ts-js-allocation-mismatch' : (blockers[0] || 'ts-allocation-not-ready'));
    return {
        source: 'ts-charging-allocation-productive-prep-v1',
        available: true,
        ok: prepared,
        productive: false,
        prepared,
        preparedForProductiveTakeover: prepared,
        fallback: !prepared,
        fallbackReason,
        blockers,
        warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
        comparison,
        plan,
        apply: prepared ? buildChargingAllocationApply(plan) : null,
        safety: {
            keepsSetpointWritingInJavascript: true,
            keepsBoostFailsafeAndPvLogicInJavascriptUntilNextGate: true,
            doesNotWriteIoBrokerStates: true,
        },
        nextAction: prepared
            ? 'Allocation-Apply-Vertrag ist vorbereitet; im nächsten Gate kann TS die Zielwerte liefern, während JavaScript nur noch validiert und schreibt.'
            : 'JavaScript bleibt führend; erst Allocation-Mismatches oder harte Blocker bereinigen.',
    };
}
/**
 * Code-Teil: buildChargingAllocationProductive
 * Zweck: Macht den geprüften TS-Allocation-Vertrag zum produktiven Zielwertlieferanten.
 * JavaScript bleibt Executor und harter Fallback, schreibt aber bei grünem Vertrag die
 * aus TS normalisierten Zielwerte.
 */
function buildChargingAllocationProductive(input, plan = buildChargingAllocationShadowPlan(input), comparison = compareChargingAllocationShadowPlan(input, plan)) {
    const blockers = collectProductiveBlockers(plan, comparison);
    const canApply = plan.ok === true && comparison.ok === true && blockers.length === 0;
    const fallbackReason = canApply
        ? ''
        : (!comparison.ok ? 'ts-js-allocation-mismatch' : (blockers[0] || 'ts-allocation-not-ready'));
    return {
        source: 'ts-charging-allocation-productive-v1',
        available: true,
        ok: canApply,
        productive: canApply,
        prepared: canApply,
        preparedForProductiveTakeover: canApply,
        fallback: !canApply,
        fallbackReason,
        blockers,
        warnings: Array.isArray(plan.warnings) ? [...plan.warnings] : [],
        comparison,
        plan,
        apply: canApply ? buildChargingAllocationApply(plan) : null,
        safety: {
            setpointWritingViaJavascriptExecutor: true,
            setpointWritingUsesJavascriptExecutorOnly: true,
            javascriptFallbackOnMismatch: true,
            javascriptAllocationIsFallbackOnly: true,
            legacyJavascriptDecisionTreeKeptAsFallbackCandidate: true,
            normalJavascriptDecisionTreeRemovedFromNormalPath: true,
            directJavascriptSetpointLoopsRemoved: true,
            executorFallbackOnlyForHardBlockers: true,
            allowsTsSafetyStopHandover: true,
            safeStopCanBypassStaleBlockersForZeroTargets: true,
            nonZeroSafetyStopRejected: true,
            doesNotWriteIoBrokerStates: true,
        },
        nextAction: canApply
            ? 'TS-Allocation liefert produktiv die finalen Wallbox-Zielwerte; JavaScript führt nur noch den ioBroker-Executor aus und bleibt harter Fallback.'
            : 'JavaScript bleibt führend; Allocation-Mismatch, fehlende Setpoints oder harte Blocker verhindern die TS-Übernahme.',
    };
}
