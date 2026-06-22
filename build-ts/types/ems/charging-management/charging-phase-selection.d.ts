/**
 * Datei: src-ts/ems/charging-management/charging-phase-selection.ts
 *
 * Zweck:
 * TypeScript-Entscheidungsschicht für AC-1p/3p-Phasenwahl im EVCS-Lademanagement.
 * Die Datei schreibt keine ioBroker-States. Sie entscheidet nur, ob eine Wallbox
 * im PV-Überschussbetrieb einphasig oder dreiphasig laufen soll und ob eine sichere
 * Umschaltsequenz vorbereitet werden darf.
 *
 * Sicherheitsprinzip:
 * - DC-Lader werden nicht phasenautomatisch geschaltet.
 * - Hoch auf 3p nur bei stabil ausreichendem PV-/EVCS-Budget.
 * - Runter auf 1p bei dauerhaft zu niedrigem Überschuss.
 * - Bei stale Meter keine Hoch-Umschaltung.
 * - Phasenumschaltung ist ein schwerer Schaltvorgang: Stop/0-Setpoint vor Umschaltung,
 *   Cooldown und optionale Rückmeldung werden berücksichtigt.
 */
export type ChargingPhaseMode = 'fixed-1p' | 'fixed-3p' | 'auto-pv';
export type ChargingPhaseDirection = 'none' | '1p-to-3p' | '3p-to-1p';
export interface ChargingPhaseWallboxInput {
    safe?: unknown;
    key?: unknown;
    id?: unknown;
    name?: unknown;
    enabled?: unknown;
    online?: unknown;
    vehiclePlugged?: unknown;
    charging?: unknown;
    chargerType?: unknown;
    phaseMode?: unknown;
    phases?: unknown;
    currentPhaseCount?: unknown;
    phaseFeedback?: unknown;
    phaseSwitchKey?: unknown;
    supportsPhaseSwitch?: unknown;
    phaseSwitchValue1p?: unknown;
    phaseSwitchValue3p?: unknown;
    stopBeforePhaseSwitch?: unknown;
    actualPowerW?: unknown;
    minA?: unknown;
    maxA?: unknown;
    voltageV?: unknown;
    switchUpThresholdW?: unknown;
    switchDownThresholdW?: unknown;
    switchUpStableMs?: unknown;
    switchDownStableMs?: unknown;
    switchCooldownMs?: unknown;
    switchSettleMs?: unknown;
    cooldownUntilMs?: unknown;
    highSinceMs?: unknown;
    lowSinceMs?: unknown;
    settleUntilMs?: unknown;
    switchSafePowerW?: unknown;
    onePhaseLine?: unknown;
    reason?: unknown;
}
export interface ChargingPhaseSelectionInput {
    now?: unknown;
    mode?: unknown;
    budgetMode?: unknown;
    pvAvailableW?: unknown;
    stablePvAvailableW?: unknown;
    budgetW?: unknown;
    remainingW?: unknown;
    staleMeter?: unknown;
    staleBudget?: unknown;
    phaseAutoEnabled?: unknown;
    switchUpThresholdW?: unknown;
    switchDownThresholdW?: unknown;
    switchUpStableMs?: unknown;
    switchDownStableMs?: unknown;
    switchCooldownMs?: unknown;
    switchSettleMs?: unknown;
    switchSafePowerW?: unknown;
    wallboxes?: readonly ChargingPhaseWallboxInput[] | null;
    ts?: unknown;
}
export interface ChargingPhaseWallboxDecision {
    safe: string;
    name: string;
    chargerType: string;
    mode: ChargingPhaseMode;
    enabled: boolean;
    online: boolean;
    connected: boolean;
    currentPhaseCount: 1 | 3;
    configuredPhaseCount: 1 | 3;
    targetPhaseCount: 1 | 3;
    allocationPhaseCount: 1 | 3;
    switchRequired: boolean;
    switchDirection: ChargingPhaseDirection;
    switchAllowed: boolean;
    switchCommandAllowed: boolean;
    safetyStopRequired: boolean;
    stopBeforePhaseSwitch: boolean;
    phaseSwitchKey: string;
    phaseSwitchValue: number | string | boolean;
    supportsPhaseSwitch: boolean;
    cooldownActive: boolean;
    cooldownRemainingMs: number;
    cooldownUntilMs: number;
    settleUntilMs: number;
    highSinceMs: number;
    lowSinceMs: number;
    nextHighSinceMs: number;
    nextLowSinceMs: number;
    stableAbove3p: boolean;
    stableBelow1p: boolean;
    stableBudgetW: number;
    switchUpThresholdW: number;
    switchDownThresholdW: number;
    switchUpStableMs: number;
    switchDownStableMs: number;
    switchCooldownMs: number;
    switchSettleMs: number;
    minPower1pW: number;
    minPower3pW: number;
    onePhaseLine: string;
    reason: string;
    blocker: string;
    warning: string;
}
export interface ChargingPhaseSelectionPlan {
    source: 'ts-charging-phase-selection-v1';
    available: true;
    ok: boolean;
    productive: true;
    ts: number;
    mode: string;
    budgetMode: string;
    phaseAutoEnabled: boolean;
    stableBudgetW: number;
    switchRequiredCount: number;
    commandAllowedCount: number;
    safetyStopCount: number;
    cooldownCount: number;
    wallboxCount: number;
    wallboxes: ChargingPhaseWallboxDecision[];
    blockers: string[];
    warnings: string[];
    safety: {
        doesNotWriteIoBrokerStates: true;
        acOnly: true;
        dcIgnored: true;
        highSwitchRequiresStablePvBudget: true;
        staleMeterBlocksPhaseUpshift: true;
        stopBeforePhaseSwitchDefault: true;
        cooldownPreventsFlapping: true;
    };
}
/**
 * Code-Teil: buildChargingPhaseSelectionPlan
 * Zweck: Entscheidet pro AC-Ladepunkt den stabilen 1p/3p-Zielzustand für PV-Überschussladen.
 */
export declare function buildChargingPhaseSelectionPlan(input: ChargingPhaseSelectionInput): ChargingPhaseSelectionPlan;
//# sourceMappingURL=charging-phase-selection.d.ts.map