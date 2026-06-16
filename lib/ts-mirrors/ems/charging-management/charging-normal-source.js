'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-normal-source.ts
 * Quell-Hash: sha256:358b483248c64b168203a6458fa70ddf0783d8fb0b05ff706523033bd24a22e9
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-TypeScript-Normalquelle-Lockdown mit JavaScript nur als Executor und hartem Fallback.
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
 * Datei: src-ts/ems/charging-management/charging-normal-source.ts
 *
 * Zweck:
 * Verdichtet die produktiven EVCS-TypeScript-Verträge zu einem einzigen Normalquellen-Gate.
 * Das Gate sagt nicht nur, ob ein einzelner Shadow sauber ist, sondern ob Budget, Control,
 * Allocation, Write-Plan und der JS/ioBroker-Executor im selben Tick als TypeScript-geführter
 * Runtime-Pfad zusammenpassen.
 *
 * Wichtig:
 * TypeScript bleibt die fachliche Normalquelle. JavaScript darf im grünen Gate nur noch den
 * ioBroker-SetState-Executor ausführen. Bei harten Blockern bleibt JavaScript Notfallback.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingTsNormalSourceLockdown = exports.buildChargingNormalSourceLockdown = void 0;
exports.buildChargingNormalSourceDecision = buildChargingNormalSourceDecision;
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function str(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
}
function boolValue(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'ja', 'on', 'ok', 'productive', 'active'].includes(s))
            return true;
        if (['false', '0', 'no', 'nein', 'off', 'fallback', 'inactive'].includes(s))
            return false;
    }
    return fallback;
}
function finiteNumber(value, fallback = 0) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function isProductive(component) {
    return !!component && boolValue(component.productive, false) === true && boolValue(component.fallback, false) !== true;
}
function componentSource(component, fallback) {
    return component ? str(component.source, fallback) : fallback;
}
function componentFallbackReason(component, fallback) {
    if (!component)
        return fallback;
    return str(component.fallbackReason, fallback);
}
function unique(values) {
    const out = [];
    for (const value of values) {
        const v = String(value || '').trim();
        if (v && !out.includes(v))
            out.push(v);
    }
    return out;
}
function collectComponentWarnings(component) {
    const warnings = component && Array.isArray(component.warnings) ? component.warnings : [];
    return warnings.map((entry) => String(entry || '').trim()).filter((entry) => entry.length > 0);
}
/**
 * Code-Teil: buildChargingNormalSourceDecision
 * Zweck: Freigabe-Gate für den vollständigen EVCS-TS-Normalpfad.
 */
function buildChargingNormalSourceDecision(input) {
    const budget = asRecord(input.budget);
    const control = asRecord(input.control);
    const allocation = asRecord(input.allocation);
    const writePlan = asRecord(input.writePlan);
    const executor = asRecord(input.executor);
    const legacy = asRecord(input.legacy);
    const safetyStop = boolValue(input.safetyStop, false);
    const budgetProductive = isProductive(budget);
    const controlProductive = isProductive(control);
    const allocationProductive = isProductive(allocation);
    const writePlanProductive = isProductive(writePlan);
    const executorSourceValue = componentSource(executor, 'missing-executor');
    const executorOk = executor ? (boolValue(executor.ok, false) === true && executorSourceValue === 'ts-write-plan') : false;
    const legacyJsRole = legacy ? str(legacy.jsRole) : '';
    const legacyFallbackActive = legacyJsRole === 'executor-and-hard-fallback' || boolValue(legacy && legacy.fallbackActive, false);
    const blockers = [];
    if (!safetyStop && !budgetProductive)
        blockers.push(`budget:${componentFallbackReason(budget, 'budget-not-productive')}`);
    if (!safetyStop && !controlProductive)
        blockers.push(`control:${componentFallbackReason(control, 'control-not-productive')}`);
    if (safetyStop && !budget) {
        // Safe 0-setpoint handovers may run before the cap diagnostics are published.
    }
    else if (safetyStop && budget && !budgetProductive)
        blockers.push(`budget:${componentFallbackReason(budget, 'budget-not-productive')}`);
    if (safetyStop && !control) {
        // Same for control diagnostics: the safety write contract is still TS-valid.
    }
    else if (safetyStop && control && !controlProductive)
        blockers.push(`control:${componentFallbackReason(control, 'control-not-productive')}`);
    if (!allocationProductive)
        blockers.push(`allocation:${componentFallbackReason(allocation, 'allocation-not-productive')}`);
    if (!writePlanProductive)
        blockers.push(`writePlan:${componentFallbackReason(writePlan, 'write-plan-not-productive')}`);
    if (!executorOk)
        blockers.push(executor ? `executor:${executorSourceValue === 'ts-write-plan' ? 'not-ok' : `unexpected-source-${executorSourceValue}`}` : 'executor:missing');
    if (legacyFallbackActive)
        blockers.push(`legacy:${str(legacy && legacy.fallbackReason, 'hard-fallback-active')}`);
    const normalizedBlockers = unique(blockers);
    const ok = normalizedBlockers.length === 0;
    const fallbackReason = ok ? '' : (normalizedBlockers[0] ?? 'ts-normal-source-not-ready');
    const runtimeSource = ok ? 'typescript' : 'javascript-hard-fallback';
    const jsRole = ok ? 'executor-only' : 'executor-and-hard-fallback';
    const warnings = unique([
        ...(safetyStop && !budget ? ['budget-snapshot-not-required-for-safety-stop'] : []),
        ...(safetyStop && !control ? ['control-snapshot-not-required-for-safety-stop'] : []),
        ...collectComponentWarnings(budget),
        ...collectComponentWarnings(control),
        ...collectComponentWarnings(allocation),
        ...collectComponentWarnings(writePlan),
    ]);
    return {
        source: 'ts-charging-normal-source-lockdown-v1',
        available: true,
        ok,
        productive: ok,
        tsNormalSource: ok,
        readyForJavascriptRemoval: ok,
        fallback: !ok,
        fallbackReason,
        runtimeSource,
        normalSource: runtimeSource,
        jsRole,
        context: str(input.context, 'normal'),
        mode: str(input.mode, ''),
        status: str(input.status, ''),
        safetyStop,
        safetyReason: str(input.safetyReason, ''),
        blockers: normalizedBlockers,
        warnings,
        components: {
            budgetProductive,
            budgetSource: componentSource(budget, 'missing-budget'),
            controlProductive,
            controlSource: componentSource(control, 'missing-control'),
            allocationProductive,
            allocationSource: componentSource(allocation, 'missing-allocation'),
            writePlanProductive,
            writePlanSource: componentSource(writePlan, 'missing-write-plan'),
            executorOk,
            executorSource: executorSourceValue,
            executorAppliedCount: Math.max(0, Math.round(finiteNumber(executor && executor.appliedCount, 0))),
            executorFailedCount: Math.max(0, Math.round(finiteNumber(executor && executor.failedCount, 0))),
            executorSkippedCount: Math.max(0, Math.round(finiteNumber(executor && executor.skippedCount, 0))),
            legacyFallbackActive,
            legacySource: componentSource(legacy, 'missing-legacy-diagnostic'),
        },
        apply: ok ? {
            source: 'ts-normal-source',
            executor: 'javascript-iobroker-setState',
            decisionSource: 'typescript',
            setpointWriter: 'javascript-executor-only',
        } : null,
        safety: {
            typescriptIsNormalDecisionSource: true,
            javascriptSetpointWritesOnly: true,
            javascriptLegacyDecisionTreeHardFallbackOnly: true,
            noJavascriptNormalSetpointDecision: true,
            fallbackOnlyForHardBlockers: true,
            requiresBudgetControlAllocationWritePlan: true,
            completeEvcsTsHandoverGate: true,
        },
        nextAction: ok
            ? 'EVCS läuft im TypeScript-Normalpfad; JavaScript führt nur noch ioBroker-Setpoints aus.'
            : 'EVCS bleibt im JavaScript-Hard-Fallback, bis alle TS-Komponenten im selben Tick produktiv sind.',
        ts: finiteNumber(input.ts, Date.now()),
    };
}
/** Kompatibilitätsalias für Runtime-Brücken aus der beschleunigten EVCS-Migration. */
exports.buildChargingNormalSourceLockdown = buildChargingNormalSourceDecision;
exports.buildChargingTsNormalSourceLockdown = buildChargingNormalSourceDecision;
