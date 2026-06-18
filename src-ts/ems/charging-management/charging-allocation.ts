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
  phasePlan?: { wallboxes?: readonly Record<string, unknown>[] } | null;
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
  mismatches: Array<{ field: string; safe?: string; js: unknown; ts: unknown; diff?: number | null }>;
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

function finiteOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const s = value.trim().replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function nonNegative(value: unknown, fallback = 0): number {
  const n = finiteOrNull(value);
  const v = n === null ? fallback : n;
  return v > 0 ? Math.round(v) : 0;
}

function nonNegativeFloat(value: unknown, fallback = 0): number {
  const n = finiteOrNull(value);
  const v = n === null ? fallback : n;
  return v > 0 ? Number(v.toFixed(3)) : 0;
}

function boolValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'connected', 'plugged'].includes(s)) return true;
    if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive', 'disconnected', 'unplugged'].includes(s)) return false;
  }
  return fallback;
}

function str(value: unknown, fallback = ''): string {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function safeKey(value: unknown, fallbackIndex = 0): string {
  const raw = str(value, `wallbox_${fallbackIndex + 1}`);
  const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  return safe || `wallbox_${fallbackIndex + 1}`;
}


function normalizeControlBasis(value: unknown): 'current' | 'power' {
  const raw = str(value, 'power').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return raw === 'a' || raw === 'amp' || raw === 'amps' || raw === 'current' || raw === 'currenta' || raw === 'currentampere'
    ? 'current'
    : 'power';
}

function allocationSafe(allocation: Record<string, unknown>, fallbackIndex = 0): string {
  return safeKey(allocation.safe ?? allocation.key ?? allocation.id ?? allocation.name, fallbackIndex);
}

function buildAllocationMap(allocations: readonly Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  allocations.forEach((allocation, index) => {
    if (!allocation || typeof allocation !== 'object') return;
    if (String(allocation.type || '') === 'budget') return;
    const safe = allocationSafe(allocation, index);
    if (safe) map.set(safe, allocation);
  });
  return map;
}

function buildPhaseDecisionMap(input: ChargingAllocationRuntimeInput): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const wallboxes = input.phasePlan && Array.isArray(input.phasePlan.wallboxes) ? input.phasePlan.wallboxes : [];
  wallboxes.forEach((decision, index) => {
    if (!decision || typeof decision !== 'object') return;
    const safe = safeKey(decision.safe ?? decision.key ?? decision.id ?? decision.name, index);
    if (safe) map.set(safe, decision);
  });
  return map;
}

function wantsTsNativeAllocation(input: ChargingAllocationRuntimeInput): boolean {
  return boolValue(input.preferTsNativeAllocation, false) || boolValue(input.tsNormalSourceLock, false);
}

function isJsComparisonDiagnosticOnly(input: ChargingAllocationRuntimeInput, plan?: Pick<ChargingAllocationShadowPlan, 'jsComparisonDiagnosticOnly'> | null): boolean {
  if (plan && plan.jsComparisonDiagnosticOnly === true) return true;
  if (wantsTsNativeAllocation(input)) return true;
  return boolValue(input.allowJsComparisonFallback, true) === false;
}

function technicalMinPowerW(wb: ChargingAllocationWallboxPlan): number {
  if (wb.minPowerW > 0) return wb.minPowerW;
  if (wb.minA > 0) return Math.round(Math.max(1, wb.phases || 1) * Math.max(1, wb.voltageV || 230) * wb.minA);
  return 0;
}

function technicalMaxPowerW(wb: ChargingAllocationWallboxPlan): number {
  if (wb.maxPowerW > 0) return wb.maxPowerW;
  if (wb.maxA > 0) return Math.round(Math.max(1, wb.phases || 1) * Math.max(1, wb.voltageV || 230) * wb.maxA);
  return wb.chargerType === 'dc' ? 50000 : 11000;
}

function currentForPowerA(wb: ChargingAllocationWallboxPlan, targetPowerW: number): number {
  const denom = Math.max(1, wb.phases || 1) * Math.max(1, wb.voltageV || 230);
  let amps = targetPowerW > 0 ? targetPowerW / denom : 0;
  if (amps > 0 && wb.minA > 0 && amps < wb.minA) amps = wb.minA;
  if (wb.maxA > 0 && amps > wb.maxA) amps = wb.maxA;
  return Number(Math.max(0, amps).toFixed(3));
}

function capFromBinding(binding: unknown, cap: unknown): number | null {
  if (!boolValue(binding, false)) return null;
  const n = finiteOrNull(cap);
  return n === null ? 0 : Math.max(0, Math.round(n));
}

function effectiveNativeBudgetW(input: ChargingAllocationRuntimeInput, candidates: ChargingAllocationWallboxPlan[]): number {
  const maxCandidateW = candidates.reduce((sum, wb) => sum + technicalMaxPowerW(wb), 0);
  const budget = finiteOrNull(input.budgetW);
  const remaining = finiteOrNull(input.remainingW);
  let available = budget === null ? (remaining !== null && remaining > 0 ? remaining : maxCandidateW) : budget;
  if (!Number.isFinite(available) || available < 0) available = 0;
  const caps = [
    capFromBinding(input.gridCapBinding, input.gridCapEvcsW),
    capFromBinding(input.phaseCapBinding, input.phaseCapEvcsW),
    (boolValue(input.para14aActive, false) || boolValue(input.para14aBinding, false)) ? capFromBinding(true, input.para14aCapEvcsW) : null,
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  for (const cap of caps) available = Math.min(available, cap);
  if (boolValue(input.pausedByPeakShaving, false)) available = 0;
  return Math.max(0, Math.round(available));
}

function isChargingCandidate(wb: ChargingAllocationWallboxPlan): boolean {
  const modeText = `${wb.effectiveMode || ''} ${wb.userMode || ''}`.toLowerCase();
  if (!wb.enabled || !wb.online || !wb.connected) return false;
  if (!wb.hasSetpoint) return false;
  if (modeText.includes('off') || modeText.includes('disabled') || modeText.includes('aus')) return false;
  if (wb.phaseSwitchRequired || wb.phaseSwitchSafetyStopRequired) return false;
  return true;
}

function applyTsNativeAllocationPlan(plannedRaw: ChargingAllocationWallboxPlan[], input: ChargingAllocationRuntimeInput): ChargingAllocationWallboxPlan[] {
  const candidates = plannedRaw
    .filter(isChargingCandidate)
    .map((wb, index) => ({ wb, index, priority: Number.isFinite(Number(wb.priority)) ? Number(wb.priority) : 0 }))
    .sort((a, b) => (b.priority - a.priority) || (a.index - b.index));
  const availableW = effectiveNativeBudgetW(input, candidates.map((item) => item.wb));
  const selected = new Map<string, { targetW: number; maxW: number; reason: string }>();
  let remainingW = availableW;

  for (const item of candidates) {
    const wb = item.wb;
    const minW = technicalMinPowerW(wb);
    const maxW = Math.max(minW, technicalMaxPowerW(wb));
    if (remainingW <= 0) {
      selected.set(wb.safe, { targetW: 0, maxW, reason: 'no-budget' });
      continue;
    }
    if (minW > 0 && remainingW < minW) {
      selected.set(wb.safe, { targetW: 0, maxW, reason: 'budget-below-minimum' });
      continue;
    }
    const base = minW > 0 ? minW : 0;
    selected.set(wb.safe, { targetW: base, maxW, reason: base > 0 ? 'ts-native-minimum' : 'ts-native-eligible' });
    remainingW -= base;
  }

  let guard = 0;
  while (remainingW > 0 && guard < 20) {
    guard += 1;
    const adjustable = Array.from(selected.entries()).filter(([, item]) => item.targetW < item.maxW);
    if (!adjustable.length) break;
    const share = Math.max(1, Math.floor(remainingW / adjustable.length));
    let usedThisRound = 0;
    for (const [safe, item] of adjustable) {
      const add = Math.min(item.maxW - item.targetW, share, remainingW - usedThisRound);
      if (add <= 0) continue;
      item.targetW += add;
      item.reason = 'ts-native-allocated';
      usedThisRound += add;
      if (usedThisRound >= remainingW) break;
    }
    if (usedThisRound <= 0) break;
    remainingW -= usedThisRound;
  }

  return plannedRaw.map((wb) => {
    if (wb.phaseSwitchRequired || wb.phaseSwitchSafetyStopRequired) {
      const canWriteSafeStop = wb.online && wb.hasSetpoint;
      const reason = wb.phaseSwitchCommandAllowed
        ? (wb.phaseSwitchReason || 'phase-switch-command-ready')
        : (wb.phaseSwitchReason || 'phase-switch-stop-before-switch');
      return {
        ...wb,
        targetPowerW: 0,
        targetCurrentA: 0,
        pvUsedW: 0,
        blocked: !canWriteSafeStop,
        reason: canWriteSafeStop ? reason : (wb.online ? 'missing-wallbox-setpoint' : 'offline'),
        writeRequired: canWriteSafeStop,
        boost: false,
      };
    }
    const chosen = selected.get(wb.safe);
    let targetPowerW = chosen ? Math.max(0, Math.round(chosen.targetW)) : 0;
    let reason = chosen ? chosen.reason : '';
    let blocked = false;
    if (!wb.online) { blocked = true; reason = 'offline'; }
    else if (!wb.enabled) { blocked = false; reason = 'control_disabled'; }
    else if (!wb.connected) { blocked = true; reason = 'not_connected'; }
    else if (!wb.hasSetpoint) { blocked = true; reason = 'missing-wallbox-setpoint'; }
    else if (targetPowerW <= 0 && !reason) { reason = 'no-budget'; }

    const controlBasis = wb.controlBasis === 'current' ? 'current' : 'power';
    const targetCurrentA = controlBasis === 'current' ? currentForPowerA(wb, targetPowerW) : 0;
    if (controlBasis === 'current' && targetCurrentA > 0) {
      targetPowerW = Math.round(targetCurrentA * Math.max(1, wb.phases || 1) * Math.max(1, wb.voltageV || 230));
    }
    const writeRequired = wb.hasSetpoint && wb.online && (targetPowerW > 0 || targetCurrentA > 0 || (!wb.enabled && !!(wb.setAKey || wb.setWKey)) || reason === 'control_disabled');
    return {
      ...wb,
      targetPowerW,
      targetCurrentA,
      pvUsedW: Math.min(targetPowerW, nonNegative(input.pvAvailableW)),
      blocked,
      reason: reason || 'ts-native-allocated',
      writeRequired,
      boost: String(wb.effectiveMode || '').toLowerCase().includes('boost'),
    };
  });
}

function normalizeWallboxPlan(
  wallbox: ChargingAllocationWallboxInput,
  index: number,
  allocation: Record<string, unknown> | null,
  input: ChargingAllocationRuntimeInput,
  phaseDecision: Record<string, unknown> | null = null,
): ChargingAllocationWallboxPlan {
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
  const configuredPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.configuredPhaseCount : undefined, nonNegative(wallbox.configuredPhaseCount ?? wallbox.phases, chargerType === 'dc' ? 1 : 3)) || 1));
  const currentPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.currentPhaseCount : undefined, nonNegative(wallbox.currentPhaseCount ?? wallbox.phases, configuredPhaseCount)) || configuredPhaseCount));
  const targetPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.targetPhaseCount : undefined, nonNegative(wallbox.targetPhaseCount ?? wallbox.phases, configuredPhaseCount)) || configuredPhaseCount));
  const allocationPhaseCount = Math.max(1, Math.min(3, nonNegative(phaseDecision ? phaseDecision.allocationPhaseCount : undefined, nonNegative(wallbox.allocationPhaseCount ?? wallbox.phases, currentPhaseCount)) || currentPhaseCount));
  const phases = chargerType === 'dc' ? 1 : (allocationPhaseCount === 1 ? 1 : 3);
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
    phaseMode: str((phaseDecision ? phaseDecision.mode : undefined) ?? wallbox.phaseMode, phases === 1 ? 'fixed-1p' : 'fixed-3p'),
    configuredPhaseCount,
    currentPhaseCount,
    targetPhaseCount,
    allocationPhaseCount,
    phaseSwitchRequired: boolValue((phaseDecision ? phaseDecision.switchRequired : undefined) ?? wallbox.phaseSwitchRequired, false),
    phaseSwitchAllowed: boolValue((phaseDecision ? phaseDecision.switchAllowed : undefined) ?? wallbox.phaseSwitchAllowed, true),
    phaseSwitchCommandAllowed: boolValue((phaseDecision ? phaseDecision.switchCommandAllowed : undefined) ?? wallbox.phaseSwitchCommandAllowed, false),
    phaseSwitchKey: str((phaseDecision ? phaseDecision.phaseSwitchKey : undefined) ?? wallbox.phaseSwitchKey),
    phaseSwitchValue: (phaseDecision ? phaseDecision.phaseSwitchValue : undefined) ?? wallbox.phaseSwitchValue ?? targetPhaseCount,
    phaseSwitchReason: str((phaseDecision ? phaseDecision.reason : undefined) ?? wallbox.phaseSwitchReason),
    phaseSwitchSafetyStopRequired: boolValue((phaseDecision ? phaseDecision.safetyStopRequired : undefined) ?? wallbox.phaseSwitchSafetyStopRequired, false),
    phaseSwitchCooldownRemainingMs: nonNegative((phaseDecision ? phaseDecision.cooldownRemainingMs : undefined) ?? wallbox.phaseSwitchCooldownRemainingMs),
    stopBeforePhaseSwitch: boolValue((phaseDecision ? phaseDecision.stopBeforePhaseSwitch : undefined) ?? wallbox.stopBeforePhaseSwitch, true),
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
export function buildChargingAllocationShadowPlan(input: ChargingAllocationRuntimeInput): ChargingAllocationShadowPlan {
  const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
  const allocations = Array.isArray(input.allocations) ? input.allocations : [];
  const allocationMap = buildAllocationMap(allocations);
  const phaseDecisionMap = buildPhaseDecisionMap(input);
  const safetyStop = boolValue(input.safetyStop, false);
  const useTsNativeAllocation = wantsTsNativeAllocation(input);
  const diagnosticOnlyComparison = isJsComparisonDiagnosticOnly(input);
  const safetyReason = safetyStop ? str(input.safetyReason, boolValue(input.staleMeter) ? 'stale-meter-safety-stop' : 'evcs-safety-stop') : '';
  const plannedRaw = wallboxes.map((wallbox, index) => {
    const key = safeKey(wallbox.safe ?? wallbox.key ?? wallbox.id ?? wallbox.name, index);
    return normalizeWallboxPlan(wallbox, index, allocationMap.get(key) || null, input, phaseDecisionMap.get(key) || null);
  });
  if (!useTsNativeAllocation) {
    for (const [safe, allocation] of allocationMap.entries()) {
      if (!plannedRaw.some((w) => w.safe === safe)) plannedRaw.push(normalizeWallboxPlan({ safe }, plannedRaw.length, allocation, input, phaseDecisionMap.get(safe) || null));
    }
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
    : (useTsNativeAllocation ? applyTsNativeAllocationPlan(plannedRaw, input) : plannedRaw);

  const sumTargetPowerW = planned.reduce((sum, wb) => sum + Math.max(0, wb.targetPowerW || 0), 0);
  const sumTargetCurrentA = planned.reduce((sum, wb) => sum + Math.max(0, wb.targetCurrentA || 0), 0);
  const explicitTotalPower = safetyStop ? 0 : (useTsNativeAllocation ? null : finiteOrNull(input.totalTargetPowerW));
  const explicitTotalCurrent = safetyStop ? 0 : (useTsNativeAllocation ? null : finiteOrNull(input.totalTargetCurrentA));
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (useTsNativeAllocation) warnings.push('ts-native-allocation-active');
  if (diagnosticOnlyComparison) warnings.push('js-comparison-diagnostic-only');
  if (!planned.length) warnings.push('no-wallboxes-configured');
  if (safetyStop) warnings.push(safetyReason);
  if (boolValue(input.staleMeter) && !safetyStop) blockers.push('stale-meter');
  if (boolValue(input.staleBudget) && !safetyStop) blockers.push('stale-budget');
  if (safetyStop && planned.some((wb) => wb.targetPowerW > 0 || wb.targetCurrentA > 0)) blockers.push('non-zero-safety-stop-target');
  if (planned.length && !planned.some((wb) => wb.hasSetpoint)) warnings.push('no-wallbox-setpoints');
  if (planned.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint)) warnings.push('enabled-online-wallbox-without-setpoint');
  if (planned.some((wb) => wb.phaseSwitchRequired)) warnings.push('phase-switch-pending');
  if (planned.some((wb) => wb.phaseSwitchCommandAllowed)) warnings.push('phase-switch-command-ready');
  if (planned.some((wb) => wb.phaseSwitchRequired && !wb.phaseSwitchAllowed)) blockers.push('phase-switch-blocked');

  return {
    source: 'ts-charging-allocation-shadow-v1',
    available: true,
    ok: blockers.length === 0,
    productive: false,
    ts: finiteOrNull(input.ts) ?? Date.now(),
    mode: str(input.mode, 'unknown'),
    budgetMode: str(input.budgetMode, 'unknown'),
    allocationMode: useTsNativeAllocation ? 'ts-native' : 'js-diagnostic-normalized',
    normalSource: useTsNativeAllocation ? 'ts-native-allocation' : 'js-diagnostic-normalized',
    tsNormalSourceLock: useTsNativeAllocation,
    jsComparisonDiagnosticOnly: diagnosticOnlyComparison,
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
      phaseSwitchActive: planned.some((wb) => wb.phaseSwitchRequired),
      phaseSwitchCommandReady: planned.some((wb) => wb.phaseSwitchCommandAllowed),
      tsNativeAllocation: useTsNativeAllocation,
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
export function compareChargingAllocationShadowPlan(input: ChargingAllocationRuntimeInput, plan: ChargingAllocationShadowPlan): ChargingAllocationShadowComparison {
  const mismatches: Array<{ field: string; safe?: string; js: unknown; ts: unknown; diff?: number | null }> = [];
  const pushMismatch = (field: string, js: unknown, ts: unknown, diff?: number | null, safe?: string): void => {
    const item: { field: string; safe?: string; js: unknown; ts: unknown; diff?: number | null } = { field, js, ts };
    if (safe) item.safe = safe;
    if (diff !== undefined) item.diff = diff;
    mismatches.push(item);
  };
  const cmpNumber = (field: string, jsValue: unknown, tsValue: unknown, tolerance = 1, safe?: string): void => {
    const js = finiteOrNull(jsValue);
    const ts = finiteOrNull(tsValue);
    if (js === null && ts === null) return;
    if (js === null || ts === null) {
      pushMismatch(field, js, ts, null, safe);
      return;
    }
    const diff = Math.abs(js - ts);
    if (diff > tolerance) pushMismatch(field, js, ts, Number(diff.toFixed(3)), safe);
  };

  cmpNumber('totalTargetPowerW', input.totalTargetPowerW, plan.totalTargetPowerW, 1);
  cmpNumber('totalTargetCurrentA', input.totalTargetCurrentA, plan.totalTargetCurrentA, 0.05);
  cmpNumber('wallboxCount', Array.isArray(input.wallboxes) ? input.wallboxes.length : 0, plan.wallboxCount, 0);

  const tsBySafe = new Map(plan.wallboxes.map((wb) => [wb.safe, wb]));
  const allocations = Array.isArray(input.allocations) ? input.allocations : [];
  allocations.forEach((allocation, index) => {
    if (!allocation || typeof allocation !== 'object' || String(allocation.type || '') === 'budget') return;
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


function buildChargingAllocationApply(plan: ChargingAllocationShadowPlan): ChargingAllocationProductiveApply {
  return {
    wallboxes: plan.wallboxes.map((wb) => ({ ...wb })),
    totalTargetPowerW: plan.totalTargetPowerW,
    totalTargetCurrentA: plan.totalTargetCurrentA,
    budgetW: plan.budgetW,
    usedW: plan.usedW,
    remainingW: plan.remainingW,
  };
}

function collectProductiveBlockers(input: ChargingAllocationRuntimeInput, plan: ChargingAllocationShadowPlan, comparison: ChargingAllocationShadowComparison): string[] {
  const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
  if (!comparison.ok && !isJsComparisonDiagnosticOnly(input, plan)) blockers.push('ts-js-allocation-mismatch');
  if (plan.wallboxes.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint)) blockers.push('missing-wallbox-setpoint');
  return Array.from(new Set(blockers));
}


function collectNormalSourceBlockers(plan: ChargingAllocationShadowPlan): string[] {
  const blockers = Array.isArray(plan.blockers) ? [...plan.blockers] : [];
  if (plan.wallboxes.some((wb) => wb.enabled && wb.online && !wb.hasSetpoint)) blockers.push('missing-wallbox-setpoint');
  return Array.from(new Set(blockers));
}

function normalSourceWarnings(plan: ChargingAllocationShadowPlan, comparison: ChargingAllocationShadowComparison): string[] {
  const warnings = Array.isArray(plan.warnings) ? [...plan.warnings] : [];
  if (comparison && comparison.ok === false) {
    warnings.push(`js-comparison-diagnostic-only:${Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0}`);
  }
  return Array.from(new Set(warnings));
}

/**
 * Code-Teil: buildChargingAllocationProductivePrep
 * Zweck: Bereitet die spätere produktive TS-Allocation vor, ohne Setpoints zu schreiben.
 */
export function buildChargingAllocationProductivePrep(
  input: ChargingAllocationRuntimeInput,
  plan: ChargingAllocationShadowPlan = buildChargingAllocationShadowPlan(input),
  comparison: ChargingAllocationShadowComparison = compareChargingAllocationShadowPlan(input, plan),
): ChargingAllocationProductivePrepDecision {
  const blockers = collectProductiveBlockers(input, plan, comparison);
  const diagnosticOnlyComparison = isJsComparisonDiagnosticOnly(input, plan);
  const comparisonAllowsTakeover = comparison.ok === true || diagnosticOnlyComparison === true;
  const prepared = plan.ok === true && comparisonAllowsTakeover && blockers.length === 0;
  const fallbackReason = prepared
    ? ''
    : (!comparison.ok && !diagnosticOnlyComparison ? 'ts-js-allocation-mismatch' : (blockers[0] || 'ts-allocation-not-ready'));
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
    warnings: Array.from(new Set([...(Array.isArray(plan.warnings) ? plan.warnings : []), ...(!comparison.ok && diagnosticOnlyComparison ? ['ts-js-allocation-mismatch-diagnostic-only'] : [])])),
    tsNormalSourceLocked: wantsTsNativeAllocation(input),
    jsComparisonDiagnosticOnly: diagnosticOnlyComparison,
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
export function buildChargingAllocationProductive(
  input: ChargingAllocationRuntimeInput,
  plan: ChargingAllocationShadowPlan = buildChargingAllocationShadowPlan(input),
  comparison: ChargingAllocationShadowComparison = compareChargingAllocationShadowPlan(input, plan),
): ChargingAllocationProductiveDecision {
  const blockers = collectProductiveBlockers(input, plan, comparison);
  const diagnosticOnlyComparison = isJsComparisonDiagnosticOnly(input, plan);
  const comparisonAllowsTakeover = comparison.ok === true || diagnosticOnlyComparison === true;
  const canApply = plan.ok === true && comparisonAllowsTakeover && blockers.length === 0;
  const fallbackReason = canApply
    ? ''
    : (!comparison.ok && !diagnosticOnlyComparison ? 'ts-js-allocation-mismatch' : (blockers[0] || 'ts-allocation-not-ready'));
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
    warnings: Array.from(new Set([...(Array.isArray(plan.warnings) ? plan.warnings : []), ...(!comparison.ok && diagnosticOnlyComparison ? ['ts-js-allocation-mismatch-diagnostic-only'] : [])])),
    tsNormalSourceLocked: wantsTsNativeAllocation(input),
    jsComparisonDiagnosticOnly: diagnosticOnlyComparison,
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
      tsNormalSourceLocked: true,
      jsShadowComparisonDiagnosticOnly: true,
      jsMismatchDoesNotBlockNormalPath: true,
      nativeTsAllocatorCanIgnoreJsTargets: true,
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


/**
 * Code-Teil: buildChargingAllocationNormalSource
 *
 * Zweck:
 * Schaltet die EVCS-Allocation in den nächsten Migrationsmodus: TypeScript ist im
 * normalen Runtime-Tick die fachliche Quelle. Der alte JS-Vergleich bleibt sichtbar,
 * blockiert aber nicht mehr allein wegen Diagnoseabweichungen; harte Safety-/Runtime-
 * Blocker behalten den JS-Executor/Fallback als Sicherheitsnetz.
 */
export function buildChargingAllocationNormalSource(
  input: ChargingAllocationRuntimeInput,
  plan: ChargingAllocationShadowPlan = buildChargingAllocationShadowPlan(input),
  comparison: ChargingAllocationShadowComparison = compareChargingAllocationShadowPlan(input, plan),
): ChargingAllocationNormalSourceDecision {
  const blockers = collectNormalSourceBlockers(plan);
  const canApply = plan.ok === true && blockers.length === 0;
  const mismatchCount = comparison && Number.isFinite(Number(comparison.mismatchCount)) ? Number(comparison.mismatchCount) : 0;
  const fallbackReason = canApply ? '' : (blockers[0] || 'ts-allocation-normal-source-not-ready');
  return {
    source: 'ts-charging-allocation-normal-source-v1',
    available: true,
    ok: canApply,
    productive: canApply,
    normalSource: canApply,
    prepared: canApply,
    fallback: !canApply,
    fallbackReason,
    blockers,
    warnings: normalSourceWarnings(plan, comparison),
    diagnosticComparison: comparison,
    diagnosticMismatchCount: mismatchCount,
    plan,
    apply: canApply ? buildChargingAllocationApply(plan) : null,
    safety: {
      tsIsNormalAllocationSource: true,
      jsComparisonIsDiagnosticOnly: true,
      javascriptAllocationIsHardFallbackOnly: true,
      legacyJavascriptDecisionTreeRemovedFromNormalPath: true,
      hardFallbackOnlyForRuntimeMirrorOrSafetyBlockers: true,
      setpointWritingViaJavascriptExecutor: true,
      directJavascriptSetpointLoopsRemoved: true,
      allowsTsSafetyStopHandover: true,
      doesNotWriteIoBrokerStates: true,
    },
    hardFallbackReasons: [
      'missing-ts-allocation-mirror',
      'missing-ts-write-plan-mirror',
      'ts-runtime-error',
      'stale-meter',
      'stale-budget',
      'missing-wallbox-setpoint',
      'invalid-apply-plan',
      'executor-error',
    ],
    nextAction: canApply
      ? 'EVCS-Allocation läuft als TypeScript-Normalquelle; JavaScript bleibt ioBroker-Executor und harter Fallback.'
      : 'TS-Normalquelle blockiert; JavaScript darf nur noch als harter Fallback für Runtime-/Safety-Blocker einspringen.',
  };
}
