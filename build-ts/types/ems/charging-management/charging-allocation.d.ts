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
export type ChargingAllocationSource = 'ts-charging-allocation-shadow-v1';
export interface ChargingAllocationWallboxInput {
    safe?: unknown;
    key?: unknown;
    id?: unknown;
    name?: unknown;
    enabled?: unknown;
    online?: unknown;
    cfgEnabled?: unknown;
    userEnabled?: unknown;
    vehiclePlugged?: unknown;
    charging?: unknown;
    effectiveMode?: unknown;
    userMode?: unknown;
    chargerType?: unknown;
    controlBasis?: unknown;
    phases?: unknown;
    phaseMode?: unknown;
    configuredPhaseCount?: unknown;
    currentPhaseCount?: unknown;
    targetPhaseCount?: unknown;
    allocationPhaseCount?: unknown;
    phaseSwitchRequired?: unknown;
    phaseSwitchAllowed?: unknown;
    phaseSwitchCommandAllowed?: unknown;
    phaseSwitchKey?: unknown;
    phaseSwitchValue?: unknown;
    phaseSwitchReason?: unknown;
    phaseSwitchSafetyStopRequired?: unknown;
    phaseSwitchCooldownRemainingMs?: unknown;
    stopBeforePhaseSwitch?: unknown;
    storageAssistCustomerAllowed?: unknown;
    userStorageAssistEnabled?: unknown;
    effectiveStorageAssist?: unknown;
    storageAssistBlockedReason?: unknown;
    batteryContributionW?: unknown;
    voltageV?: unknown;
    minPowerW?: unknown;
    minPW?: unknown;
    maxPowerW?: unknown;
    maxPW?: unknown;
    minA?: unknown;
    maxA?: unknown;
    targetPowerW?: unknown;
    targetCurrentA?: unknown;
    targetW?: unknown;
    targetA?: unknown;
    actualPowerW?: unknown;
    priority?: unknown;
    stationKey?: unknown;
    connectorNo?: unknown;
    setAKey?: unknown;
    setWKey?: unknown;
    enableKey?: unknown;
    hasSetpoint?: unknown;
    hasSetPower?: unknown;
    hasSetCurrent?: unknown;
    allowBoost?: unknown;
    staleAny?: unknown;
    reason?: unknown;
}
export interface ChargingAllocationRuntimeInput {
    mode?: unknown;
    budgetMode?: unknown;
    budgetW?: unknown;
    usedW?: unknown;
    remainingW?: unknown;
    totalPowerW?: unknown;
    totalTargetPowerW?: unknown;
    totalTargetCurrentA?: unknown;
    pvAvailableW?: unknown;
    pvAvailable?: unknown;
    gridCapEvcsW?: unknown;
    gridCapBinding?: unknown;
    phaseCapEvcsW?: unknown;
    phaseCapBinding?: unknown;
    para14aActive?: unknown;
    para14aCapEvcsW?: unknown;
    para14aBinding?: unknown;
    storageAssistActive?: unknown;
    storageAssistW?: unknown;
    pausedByPeakShaving?: unknown;
    staleMeter?: unknown;
    staleBudget?: unknown;
    safetyStop?: unknown;
    safetyReason?: unknown;
    preferTsNativeAllocation?: unknown;
    tsNormalSourceLock?: unknown;
    allowJsComparisonFallback?: unknown;
    wallboxes?: readonly ChargingAllocationWallboxInput[] | null;
    allocations?: readonly Record<string, unknown>[] | null;
    phasePlan?: {
        wallboxes?: readonly Record<string, unknown>[];
    } | null;
    ts?: unknown;
}
export interface ChargingAllocationWallboxPlan {
    safe: string;
    name: string;
    enabled: boolean;
    online: boolean;
    connected: boolean;
    charging: boolean;
    effectiveMode: string;
    userMode: string;
    chargerType: string;
    controlBasis: string;
    phases: number;
    phaseMode: string;
    configuredPhaseCount: number;
    currentPhaseCount: number;
    targetPhaseCount: number;
    allocationPhaseCount: number;
    phaseSwitchRequired: boolean;
    phaseSwitchAllowed: boolean;
    phaseSwitchCommandAllowed: boolean;
    phaseSwitchKey: string;
    phaseSwitchValue: unknown;
    phaseSwitchReason: string;
    phaseSwitchSafetyStopRequired: boolean;
    phaseSwitchCooldownRemainingMs: number;
    stopBeforePhaseSwitch: boolean;
    storageAssistCustomerAllowed: boolean;
    userStorageAssistEnabled: boolean;
    effectiveStorageAssist: boolean;
    storageAssistBlockedReason: string;
    batteryContributionW: number;
    voltageV: number;
    minPowerW: number;
    maxPowerW: number;
    minA: number;
    maxA: number;
    priority: number;
    stationKey: string;
    connectorNo: number;
    setAKey: string;
    setWKey: string;
    enableKey: string;
    targetPowerW: number;
    targetCurrentA: number;
    actualPowerW: number;
    pvUsedW: number;
    blocked: boolean;
    reason: string;
    writeRequired: boolean;
    hasSetpoint: boolean;
    hasPowerSetpoint: boolean;
    hasCurrentSetpoint: boolean;
    boost: boolean;
}
export interface ChargingAllocationShadowPlan {
    source: ChargingAllocationSource;
    available: true;
    ok: boolean;
    productive: false;
    ts: number;
    mode: string;
    budgetMode: string;
    allocationMode: 'js-diagnostic-normalized' | 'ts-native';
    normalSource: 'js-diagnostic-normalized' | 'ts-native-allocation';
    tsNormalSourceLock: boolean;
    jsComparisonDiagnosticOnly: boolean;
    budgetW: number | null;
    usedW: number;
    remainingW: number;
    totalPowerW: number;
    totalTargetPowerW: number;
    totalTargetCurrentA: number;
    wallboxCount: number;
    onlineWallboxes: number;
    connectedCount: number;
    activeTargetCount: number;
    boostCount: number;
    pvLimitedCount: number;
    gates: {
        pausedByPeakShaving: boolean;
        staleMeter: boolean;
        staleBudget: boolean;
        pvAvailable: boolean;
        gridCapBinding: boolean;
        phaseCapBinding: boolean;
        para14aActive: boolean;
        para14aBinding: boolean;
        storageAssistActive: boolean;
        safetyStop: boolean;
        phaseSwitchActive: boolean;
        phaseSwitchCommandReady: boolean;
        tsNativeAllocation: boolean;
    };
    safetyReason: string;
    caps: {
        pvAvailableW: number;
        gridCapEvcsW: number;
        phaseCapEvcsW: number;
        para14aCapEvcsW: number;
        storageAssistW: number;
    };
    wallboxes: ChargingAllocationWallboxPlan[];
    warnings: string[];
    blockers: string[];
}
export interface ChargingAllocationShadowComparison {
    source: 'ts-charging-allocation-shadow-comparison-v1';
    ok: boolean;
    mismatchCount: number;
    mismatches: Array<{
        field: string;
        safe?: string;
        js: unknown;
        ts: unknown;
        diff?: number | null;
    }>;
}
export interface ChargingAllocationProductiveApply {
    wallboxes: ChargingAllocationWallboxPlan[];
    totalTargetPowerW: number;
    totalTargetCurrentA: number;
    budgetW: number | null;
    usedW: number;
    remainingW: number;
}
export interface ChargingAllocationProductivePrepDecision {
    source: 'ts-charging-allocation-productive-prep-v1';
    available: true;
    ok: boolean;
    productive: false;
    prepared: boolean;
    preparedForProductiveTakeover: boolean;
    fallback: boolean;
    fallbackReason: string;
    blockers: string[];
    warnings: string[];
    tsNormalSourceLocked: boolean;
    jsComparisonDiagnosticOnly: boolean;
    comparison: ChargingAllocationShadowComparison;
    plan: ChargingAllocationShadowPlan;
    apply: ChargingAllocationProductiveApply | null;
    safety: {
        keepsSetpointWritingInJavascript: true;
        keepsBoostFailsafeAndPvLogicInJavascriptUntilNextGate: true;
        doesNotWriteIoBrokerStates: true;
    };
    nextAction: string;
}
export interface ChargingAllocationProductiveDecision {
    source: 'ts-charging-allocation-productive-v1';
    available: true;
    ok: boolean;
    productive: boolean;
    prepared: boolean;
    preparedForProductiveTakeover: boolean;
    fallback: boolean;
    fallbackReason: string;
    blockers: string[];
    warnings: string[];
    tsNormalSourceLocked: boolean;
    jsComparisonDiagnosticOnly: boolean;
    comparison: ChargingAllocationShadowComparison;
    plan: ChargingAllocationShadowPlan;
    apply: ChargingAllocationProductiveApply | null;
    safety: {
        setpointWritingViaJavascriptExecutor: true;
        setpointWritingUsesJavascriptExecutorOnly: true;
        javascriptFallbackOnMismatch: true;
        javascriptAllocationIsFallbackOnly: true;
        legacyJavascriptDecisionTreeKeptAsFallbackCandidate: true;
        normalJavascriptDecisionTreeRemovedFromNormalPath: true;
        directJavascriptSetpointLoopsRemoved: true;
        executorFallbackOnlyForHardBlockers: true;
        tsNormalSourceLocked: true;
        jsShadowComparisonDiagnosticOnly: true;
        jsMismatchDoesNotBlockNormalPath: true;
        nativeTsAllocatorCanIgnoreJsTargets: true;
        allowsTsSafetyStopHandover: true;
        safeStopCanBypassStaleBlockersForZeroTargets: true;
        nonZeroSafetyStopRejected: true;
        doesNotWriteIoBrokerStates: true;
    };
    nextAction: string;
}
export interface ChargingAllocationNormalSourceDecision {
    source: 'ts-charging-allocation-normal-source-v1';
    available: true;
    ok: boolean;
    productive: boolean;
    normalSource: boolean;
    prepared: boolean;
    fallback: boolean;
    fallbackReason: string;
    blockers: string[];
    warnings: string[];
    diagnosticComparison: ChargingAllocationShadowComparison;
    diagnosticMismatchCount: number;
    plan: ChargingAllocationShadowPlan;
    apply: ChargingAllocationProductiveApply | null;
    safety: {
        tsIsNormalAllocationSource: true;
        jsComparisonIsDiagnosticOnly: true;
        javascriptAllocationIsHardFallbackOnly: true;
        legacyJavascriptDecisionTreeRemovedFromNormalPath: true;
        hardFallbackOnlyForRuntimeMirrorOrSafetyBlockers: true;
        setpointWritingViaJavascriptExecutor: true;
        directJavascriptSetpointLoopsRemoved: true;
        allowsTsSafetyStopHandover: true;
        doesNotWriteIoBrokerStates: true;
    };
    hardFallbackReasons: string[];
    nextAction: string;
}
/**
 * Code-Teil: buildChargingAllocationShadowPlan
 * Zweck: Baut pro Wallbox einen typisierten Allocation-Plan aus den produktiven JS-Diagnosedaten.
 */
export declare function buildChargingAllocationShadowPlan(input: ChargingAllocationRuntimeInput): ChargingAllocationShadowPlan;
/**
 * Code-Teil: compareChargingAllocationShadowPlan
 * Zweck: Vergleicht TS-Plan mit JS-Summen und JS-Diagnose-Allocation pro Wallbox.
 */
export declare function compareChargingAllocationShadowPlan(input: ChargingAllocationRuntimeInput, plan: ChargingAllocationShadowPlan): ChargingAllocationShadowComparison;
/**
 * Code-Teil: buildChargingAllocationProductivePrep
 * Zweck: Bereitet die spätere produktive TS-Allocation vor, ohne Setpoints zu schreiben.
 */
export declare function buildChargingAllocationProductivePrep(input: ChargingAllocationRuntimeInput, plan?: ChargingAllocationShadowPlan, comparison?: ChargingAllocationShadowComparison): ChargingAllocationProductivePrepDecision;
/**
 * Code-Teil: buildChargingAllocationProductive
 * Zweck: Macht den geprüften TS-Allocation-Vertrag zum produktiven Zielwertlieferanten.
 * JavaScript bleibt Executor und harter Fallback, schreibt aber bei grünem Vertrag die
 * aus TS normalisierten Zielwerte.
 */
export declare function buildChargingAllocationProductive(input: ChargingAllocationRuntimeInput, plan?: ChargingAllocationShadowPlan, comparison?: ChargingAllocationShadowComparison): ChargingAllocationProductiveDecision;
/**
 * Code-Teil: buildChargingAllocationNormalSource
 *
 * Zweck:
 * Schaltet die EVCS-Allocation in den nächsten Migrationsmodus: TypeScript ist im
 * normalen Runtime-Tick die fachliche Quelle. Der alte JS-Vergleich bleibt sichtbar,
 * blockiert aber nicht mehr allein wegen Diagnoseabweichungen; harte Safety-/Runtime-
 * Blocker behalten den JS-Executor/Fallback als Sicherheitsnetz.
 */
export declare function buildChargingAllocationNormalSource(input: ChargingAllocationRuntimeInput, plan?: ChargingAllocationShadowPlan, comparison?: ChargingAllocationShadowComparison): ChargingAllocationNormalSourceDecision;
//# sourceMappingURL=charging-allocation.d.ts.map