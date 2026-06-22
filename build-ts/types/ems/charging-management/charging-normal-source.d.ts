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
export type ChargingNormalSourceRuntimeSource = 'typescript' | 'javascript-hard-fallback';
export type ChargingNormalSourceJsRole = 'executor-only' | 'executor-and-hard-fallback';
export interface ChargingNormalSourceInput {
    context?: unknown;
    mode?: unknown;
    status?: unknown;
    safetyStop?: unknown;
    safetyReason?: unknown;
    budget?: Record<string, unknown> | null;
    control?: Record<string, unknown> | null;
    allocation?: Record<string, unknown> | null;
    writePlan?: Record<string, unknown> | null;
    executor?: Record<string, unknown> | null;
    legacy?: Record<string, unknown> | null;
    ts?: unknown;
}
export interface ChargingNormalSourceDecision {
    source: 'ts-charging-normal-source-lockdown-v1';
    available: true;
    ok: boolean;
    productive: boolean;
    tsNormalSource: boolean;
    readyForJavascriptRemoval: boolean;
    fallback: boolean;
    fallbackReason: string;
    runtimeSource: ChargingNormalSourceRuntimeSource;
    normalSource: ChargingNormalSourceRuntimeSource;
    jsRole: ChargingNormalSourceJsRole;
    context: string;
    mode: string;
    status: string;
    safetyStop: boolean;
    safetyReason: string;
    blockers: string[];
    warnings: string[];
    components: {
        budgetProductive: boolean;
        budgetSource: string;
        controlProductive: boolean;
        controlSource: string;
        allocationProductive: boolean;
        allocationSource: string;
        writePlanProductive: boolean;
        writePlanSource: string;
        executorOk: boolean;
        executorSource: string;
        executorAppliedCount: number;
        executorFailedCount: number;
        executorSkippedCount: number;
        legacyFallbackActive: boolean;
        legacySource: string;
    };
    apply: null | {
        source: 'ts-normal-source';
        executor: 'javascript-iobroker-setState';
        decisionSource: 'typescript';
        setpointWriter: 'javascript-executor-only';
    };
    safety: {
        typescriptIsNormalDecisionSource: true;
        javascriptSetpointWritesOnly: true;
        javascriptLegacyDecisionTreeHardFallbackOnly: true;
        noJavascriptNormalSetpointDecision: true;
        fallbackOnlyForHardBlockers: true;
        requiresBudgetControlAllocationWritePlan: true;
        completeEvcsTsHandoverGate: true;
    };
    nextAction: string;
    ts: number;
}
/**
 * Code-Teil: buildChargingNormalSourceDecision
 * Zweck: Freigabe-Gate für den vollständigen EVCS-TS-Normalpfad.
 */
export declare function buildChargingNormalSourceDecision(input: ChargingNormalSourceInput): ChargingNormalSourceDecision;
/** Kompatibilitätsalias für Runtime-Brücken aus der beschleunigten EVCS-Migration. */
export declare const buildChargingNormalSourceLockdown: typeof buildChargingNormalSourceDecision;
export declare const buildChargingTsNormalSourceLockdown: typeof buildChargingNormalSourceDecision;
export interface ChargingEvcsJavascriptRemovalInput {
    context?: unknown;
    normalSource?: Record<string, unknown> | null;
    legacy?: Record<string, unknown> | null;
    executor?: Record<string, unknown> | null;
    allocation?: Record<string, unknown> | null;
    writePlan?: Record<string, unknown> | null;
    budget?: Record<string, unknown> | null;
    control?: Record<string, unknown> | null;
    ts?: unknown;
}
export interface ChargingEvcsJavascriptRemovalDecision {
    source: 'ts-charging-evcs-js-removal-ready-v1';
    available: true;
    ok: boolean;
    productive: boolean;
    readyForJavascriptRemoval: boolean;
    readyForEvcsJsDecisionTreeRemoval: boolean;
    readyForAdapterTsRuntime: boolean;
    fallback: boolean;
    fallbackReason: string;
    runtimeSource: ChargingNormalSourceRuntimeSource;
    jsRole: 'generated-js-runtime-boundary-only' | 'executor-and-hard-fallback';
    remainingJavascriptRole: string;
    context: string;
    blockers: string[];
    warnings: string[];
    components: {
        normalSourceProductive: boolean;
        normalSourceRuntime: string;
        normalSourceJsRole: string;
        allocationNormalSource: boolean;
        writePlanProductive: boolean;
        executorOk: boolean;
        executorSource: string;
        legacyExecutorOnly: boolean;
    };
    removal: {
        evcsDecisionTreeCanBeRemoved: boolean;
        directSetpointLoopsRemoved: true;
        normalJavascriptAllocationRemoved: true;
        legacyJavascriptFallbackHardOnly: boolean;
        javascriptSetStateExecutorBoundaryKept: true;
        generatedJavascriptRuntimeArtifactsKept: true;
    };
    keepJavascriptFor: string[];
    removeJavascriptNormalPath: string[];
    safety: {
        typescriptOwnsEvcsDecisionContracts: true;
        javascriptIsRuntimeBoundaryOnlyWhenOk: true;
        nodeIobrokerStillExecutesGeneratedJavascript: true;
        setStateExecutorRemainsJavascriptUntilAdapterBuildIsTsBootstrap: true;
        noJavascriptEvcsNormalDecisionWhenOk: true;
    };
    nextAction: string;
    ts: number;
}
/**
 * Code-Teil: buildChargingEvcsJavascriptRemovalDecision
 *
 * Zweck:
 * Letztes Freigabe-Gate vor dem Entfernen des alten EVCS-JavaScript-
 * Entscheidungsbaums. Dieses Gate unterscheidet sauber zwischen fachlicher
 * Logik (TypeScript) und der technisch weiterhin nötigen Node/ioBroker-
 * JavaScript-Laufzeitgrenze.
 */
export declare function buildChargingEvcsJavascriptRemovalDecision(input: ChargingEvcsJavascriptRemovalInput): ChargingEvcsJavascriptRemovalDecision;
/** Kompatibilitätsalias für finale Umbauprüfungen. */
export declare const buildChargingJavascriptRemovalDecision: typeof buildChargingEvcsJavascriptRemovalDecision;
export declare const buildChargingTsFinalHandoverDecision: typeof buildChargingEvcsJavascriptRemovalDecision;
//# sourceMappingURL=charging-normal-source.d.ts.map