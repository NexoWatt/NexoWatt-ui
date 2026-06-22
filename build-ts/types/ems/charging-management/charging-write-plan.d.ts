/**
 * Datei: src-ts/ems/charging-management/charging-write-plan.ts
 *
 * Zweck:
 * TypeScript-Shadow und produktiver Vertrag für den EVCS-Setpoint-Write-Plan.
 * Die Datei erstellt einen typisierten Schreibplan aus dem Allocation-Plan, führt
 * aber selbst keine ioBroker-Schreiboperation aus. Ab 0.7.126 darf der JS-Executor
 * diesen geprüften TS-Plan ausführen.
 */
export interface ChargingSetpointWritePlanWallboxInput {
    safe?: unknown;
    name?: unknown;
    enabled?: unknown;
    online?: unknown;
    controlBasis?: unknown;
    setAKey?: unknown;
    setWKey?: unknown;
    targetPowerW?: unknown;
    targetCurrentA?: unknown;
    targetW?: unknown;
    targetA?: unknown;
    reason?: unknown;
    phaseSwitchRequired?: unknown;
    phaseSwitchAllowed?: unknown;
    phaseSwitchCommandAllowed?: unknown;
    phaseSwitchKey?: unknown;
    phaseSwitchValue?: unknown;
    phaseSwitchReason?: unknown;
    phaseSwitchSafetyStopRequired?: unknown;
    targetPhaseCount?: unknown;
    currentPhaseCount?: unknown;
}
export interface ChargingSetpointWritePlanInput {
    wallboxes?: readonly ChargingSetpointWritePlanWallboxInput[] | null;
    allocationPlan?: {
        wallboxes?: readonly Record<string, unknown>[];
    } | null;
    allocations?: readonly Record<string, unknown>[] | null;
    staleMeter?: unknown;
    staleBudget?: unknown;
    safetyStop?: unknown;
    safetyReason?: unknown;
    allowWrites?: unknown;
    ts?: unknown;
}
export interface ChargingSetpointWritePlanEntry {
    safe: string;
    name: string;
    type: 'setpoint' | 'phaseSwitch';
    basis: 'power' | 'current' | 'phase';
    setpointKey: string;
    targetPowerW: number;
    targetCurrentA: number;
    targetValue: number | string | boolean;
    targetPhaseCount: number;
    ack: false;
    deadband: number;
    writeRequired: boolean;
    blocked: boolean;
    reason: string;
}
export interface ChargingSetpointWritePlan {
    source: 'ts-charging-setpoint-write-plan-shadow-v1';
    available: true;
    ok: boolean;
    productive: false;
    ts: number;
    writeCount: number;
    blockedCount: number;
    entries: ChargingSetpointWritePlanEntry[];
    blockers: string[];
    warnings: string[];
    safety: {
        doesNotWriteIoBrokerStates: true;
        javascriptExecutorStillRequired: true;
        validatesOnlyWriteIntent: true;
        allowsSafeStopWhileMeterStale: true;
        forceZeroTargetsOnSafetyStop: true;
        nonZeroSafetyStopRejected: true;
    };
}
export interface ChargingSetpointWriteProductivePrepPlan {
    source: 'ts-charging-setpoint-write-plan-productive-prep-v1';
    available: true;
    ok: boolean;
    productive: false;
    prepared: boolean;
    fallback: boolean;
    fallbackReason: string;
    ts: number;
    writeCount: number;
    blockedCount: number;
    entries: ChargingSetpointWritePlanEntry[];
    blockers: string[];
    warnings: string[];
    apply: null | {
        executor: 'javascript-iobroker-setState';
        entries: ChargingSetpointWritePlanEntry[];
        writeCount: number;
    };
    safety: {
        doesNotWriteIoBrokerStates: true;
        javascriptExecutorStillRequired: true;
        validatesOnlyWriteIntent: true;
        javascriptExecutorOnly: true;
        executorUsesTsPlannedBasis: true;
        executorUsesTsPlannedSetpointKey: true;
        fallbackOnExecutorError: true;
        allowsSafeStopWhileMeterStale: true;
        forceZeroTargetsOnSafetyStop: true;
        nonZeroSafetyStopRejected: true;
    };
    nextAction: string;
}
export interface ChargingSetpointWriteProductivePlan {
    source: 'ts-charging-setpoint-write-plan-productive-v1';
    available: true;
    ok: boolean;
    productive: boolean;
    prepared: boolean;
    fallback: boolean;
    fallbackReason: string;
    ts: number;
    writeCount: number;
    blockedCount: number;
    entries: ChargingSetpointWritePlanEntry[];
    blockers: string[];
    warnings: string[];
    apply: null | {
        executor: 'javascript-iobroker-setState';
        entries: ChargingSetpointWritePlanEntry[];
        writeCount: number;
    };
    safety: {
        doesNotWriteIoBrokerStates: true;
        javascriptExecutorStillRequired: true;
        validatesOnlyWriteIntent: true;
        javascriptExecutorOnly: true;
        executorUsesTsPlannedBasis: true;
        executorUsesTsPlannedSetpointKey: true;
        fallbackOnExecutorError: true;
        allowsSafeStopWhileMeterStale: true;
        forceZeroTargetsOnSafetyStop: true;
        nonZeroSafetyStopRejected: true;
    };
    nextAction: string;
}
/**
 * Code-Teil: buildChargingSetpointWritePlan
 * Zweck: Erstellt einen sicheren Write-Intent-Plan, ohne ihn auszuführen.
 */
export declare function buildChargingSetpointWritePlan(input: ChargingSetpointWritePlanInput): ChargingSetpointWritePlan;
/**
 * Code-Teil: buildChargingSetpointWritePlanProductivePrep
 * Zweck: Bereitet den TS-Write-Plan als Executor-Vertrag vor, ohne ihn freizuschalten.
 */
export declare function buildChargingSetpointWritePlanProductivePrep(input: ChargingSetpointWritePlanInput, plan?: ChargingSetpointWritePlan): ChargingSetpointWriteProductivePrepPlan;
/**
 * Code-Teil: buildChargingSetpointWritePlanProductive
 *
 * Zweck:
 * Gibt den Setpoint-Write-Plan als produktiven Vertrag für den JavaScript-Executor frei.
 * TypeScript validiert Zielwerte, Datenpunktwahl, Deadbands und Blocker; die eigentliche
 * ioBroker-Operation bleibt absichtlich im JS-Executor.
 */
export declare function buildChargingSetpointWritePlanProductive(input: ChargingSetpointWritePlanInput, plan?: ChargingSetpointWritePlan): ChargingSetpointWriteProductivePlan;
//# sourceMappingURL=charging-write-plan.d.ts.map