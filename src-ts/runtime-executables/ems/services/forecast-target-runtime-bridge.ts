// @runtime-transpile
'use strict';

/**
 * Typed bridge between the forecast planner and the legacy charging runtime.
 * It contains no hardware writer and never increases a request above the
 * hard total/station/device caps passed in by charging-management.
 */

declare const require: (id: string) => any;
const { buildForecastAwareTargetPlans } = require('./forecast-aware-target-planner');

type GenericRecord = Record<string, any>;
export type RuntimeReasonHint = 'no-setpoint' | 'allocated' | 'budget' | 'below-min' | null;

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeMode(value: unknown): string {
  const mode = String(value || '').trim().toLowerCase();
  if (['auto', 'default', 'global', ''].includes(mode)) return 'auto';
  if (['minpv', 'min_pv', 'min+pv', 'min_plus_pv'].includes(mode)) return 'minpv';
  if (['pv', 'pvsurplus', 'pv_surplus', 'pvonly', 'pv_only'].includes(mode)) return 'pv';
  if (['boost', 'turbo'].includes(mode)) return 'boost';
  return mode || 'auto';
}

export function buildRuntimeGoalPlanMap(input: GenericRecord): Map<string, GenericRecord> {
  const now = finite(input.now, Date.now());
  const wallboxes: GenericRecord[] = Array.isArray(input.wallboxes) ? input.wallboxes : [];
  const active = wallboxes.filter((wallbox) => wallbox && wallbox.controlAvailable
    && wallbox.goalEnabled === true && wallbox.goalActive === true
    && normalizeMode(wallbox.userMode) === 'auto'
    && finite(wallbox.goalFinishTs, 0) > now && finite(wallbox.goalRequiredWh, 0) > 0);
  const result = new Map<string, GenericRecord>();
  if (!active.length) return result;

  const aggregateMaxW = active.reduce((sum, wallbox) => sum + Math.max(0, finite(wallbox.maxPW, 0)), 0);
  const configuredInfrastructureW = Math.max(0, finite(input.infrastructureCapacityW, finite(input.staticBudgetW, 0)));
  const physicalCapW = configuredInfrastructureW > 0
    ? Math.min(aggregateMaxW || configuredInfrastructureW, configuredInfrastructureW)
    : aggregateMaxW;
  const budgetW = finite(input.budgetW, Number.POSITIVE_INFINITY);
  // A tariff/NT wait may reduce the current budget to zero, but must not make the
  // future target look physically impossible. In that economic-gate case the
  // planner uses the configured EVCS infrastructure cap. The actual current write
  // remains clamped by the live budget later in charging-management.
  const siteCapW = input.economicGateActive === true
    ? physicalCapW
    : Number.isFinite(budgetW)
      ? Math.max(0, Math.min(physicalCapW || budgetW, budgetW))
      : physicalCapW;
  const loadRestW = finite(input.loadRestW, Number.NaN);
  const loadTotalW = finite(input.loadTotalW, Number.NaN);
  const totalActualW = Math.max(0, finite(input.totalActualW, 0));
  const baseLoadW = Number.isFinite(loadRestW) && loadRestW >= 0
    ? loadRestW
    : Number.isFinite(loadTotalW) && loadTotalW >= 0
      ? Math.max(0, loadTotalW - totalActualW)
      : Math.max(0, finite(input.fallbackLoadW, 0));
  const pvSnapshot = input.pvSnapshot && typeof input.pvSnapshot === 'object' ? input.pvSnapshot : null;
  const pvAgeMs = pvSnapshot && Number.isFinite(Number(pvSnapshot.ageMs))
    ? Math.max(0, Number(pvSnapshot.ageMs))
    : pvSnapshot && Number.isFinite(Number(pvSnapshot.ts)) ? Math.max(0, now - Number(pvSnapshot.ts)) : Number.POSITIVE_INFINITY;
  const pvCurve = pvSnapshot?.valid === true && Array.isArray(pvSnapshot.curve)
    && pvSnapshot.curve.length > 0 && pvAgeMs <= Math.max(60_000, finite(input.pvMaxAgeMs, 6 * 3_600_000))
    ? pvSnapshot.curve : [];
  const tariff = input.tariffForecast && typeof input.tariffForecast === 'object' ? input.tariffForecast : null;
  const priceCurve = tariff?.fresh === true && Array.isArray(tariff.segments)
    ? tariff.segments.map((segment: GenericRecord) => ({
        startMs: finite(segment.startMs, Number.NaN),
        endMs: finite(segment.endMs, Number.NaN),
        priceEurKwh: finite(segment.priceEurKwh, Number.NaN),
      })).filter((segment: GenericRecord) => Number.isFinite(segment.startMs)
        && Number.isFinite(segment.endMs) && segment.endMs > segment.startMs && Number.isFinite(segment.priceEurKwh))
    : [];
  const tariffMode = tariff?.active === true
    ? Number(tariff.modeInt) === 1 ? 'manual' : 'automatic'
    : 'none';
  const tariffPriority = [1, 2, 3].includes(Number(tariff?.prioInt)) ? Number(tariff.prioInt) : 2;

  const plans: GenericRecord[] = buildForecastAwareTargetPlans({
    nowMs: now,
    slotMinutes: 15,
    reserveMs: Math.max(0, finite(input.reserveMs, 10 * 60_000)),
    energySafetyFactor: finite(input.energySafetyFactor, 1.05),
    siteCapW,
    baseLoadW,
    currentPvSurplusW: Math.max(0, finite(input.currentPvSurplusW, 0)),
    pvPlanningSafetyPct: finite(pvSnapshot?.planningSafetyPct, 85),
    pvCurve,
    priceCurve,
    gridPlanningAllowed: input.hardPvOnly !== true,
    tariff: {
      active: tariff?.active === true,
      fresh: tariff?.fresh === true,
      mode: tariffMode,
      priority: tariffPriority,
      manualCheapThresholdEurKwh: tariff?.cheapManual ?? null,
      automaticCheapThresholdEurKwh: tariff?.cheap ?? null,
    },
    goals: active.map((wallbox) => ({
      id: String(wallbox.safe || ''),
      enabled: true,
      deadlineMs: finite(wallbox.goalFinishTs, 0),
      requiredWh: finite(wallbox.goalRequiredWh, 0),
      minPowerW: Math.max(0, finite(wallbox.minPW, 0)),
      maxPowerW: Math.max(0, finite(wallbox.maxPW, 0)),
      stationKey: String(wallbox.stationKey || ''),
      stationCapW: Number.isFinite(Number(wallbox.stationMaxPowerW)) ? Math.max(0, Number(wallbox.stationMaxPowerW)) : undefined,
      priority: Math.round(100 - ((Math.max(1, Math.min(999, finite(wallbox.priority, 999))) - 1) / 998) * 100),
      requirement: 'must',
    })),
  });
  for (const plan of plans) if (plan?.id) result.set(String(plan.id), plan);
  return result;
}

export function goalPlanStateRows(plan: GenericRecord | null, wallbox: GenericRecord): Array<[string, unknown]> {
  const reason = wallbox.goalEnabled !== true
    ? 'disabled' : normalizeMode(wallbox.userMode) !== 'auto' ? 'mode-not-auto' : String(wallbox.goalStatus || 'goal-not-active');
  return [
    ['goalPlanAction', plan ? String(plan.action || 'wait') : 'inactive'],
    ['goalPlanReason', plan ? String(plan.reason || '') : reason],
    ['goalPlanSource', plan ? String(plan.source || 'none') : 'none'],
    ['goalPlanTargetPowerW', plan ? Math.max(0, Math.round(finite(plan.plannedNowW, 0))) : 0],
    ['goalPlanPlannedPvWh', plan ? Math.max(0, Math.round(finite(plan.plannedPvWh, 0))) : 0],
    ['goalPlanPlannedGridWh', plan ? Math.max(0, Math.round(finite(plan.plannedGridWh, 0))) : 0],
    ['goalPlanLatestStartTs', plan ? Math.max(0, Math.round(finite(plan.latestStartMs, 0))) : 0],
    ['goalPlanNextWindowStartTs', plan?.nextWindow ? Math.max(0, Math.round(finite(plan.nextWindow.startMs, 0))) : 0],
    ['goalPlanNextWindowEndTs', plan?.nextWindow ? Math.max(0, Math.round(finite(plan.nextWindow.endMs, 0))) : 0],
    ['goalPlanDeadlineOverride', plan?.deadlineOverride === true],
    ['goalPlanTargetReachable', plan?.targetReachable === true],
    ['goalPlanPvForecastUsed', plan?.pvForecastUsed === true],
    ['goalPlanPriceForecastUsed', plan?.priceForecastUsed === true],
    ['goalPlanFallbackMode', plan ? String(plan.fallbackMode || '') : ''],
  ];
}

export function resolvePlanEffectiveMode(userMode: unknown, effectiveMode: unknown, plan: GenericRecord | null, strategy?: GenericRecord, autoSource?: unknown): string {
  const selected = normalizeMode(userMode);
  const overlay = strategy && typeof strategy === 'object' ? strategy : {};
  const strategyControls = String(autoSource || '').trim().toLowerCase() === 'strategy'
    && (overlay.active === true || overlay.fallbackPause === true);
  const requirement = String(overlay.requirement || 'should').trim().toLowerCase();
  const policy = String(overlay.energySourcePolicy || 'pv-preferred').trim().toLowerCase();
  const pvStrategy = strategyControls && ['pv-only', 'pv-preferred'].includes(policy);
  const deadlineMayOverride = plan?.deadlineOverride === true && requirement !== 'must';
  return selected === 'auto' && plan?.action === 'charge' && String(plan.source || '') !== 'pv'
    && (!pvStrategy || deadlineMayOverride) ? 'normal' : String(effectiveMode || 'normal');
}

export function applyGoalPlan(input: GenericRecord): { targetW: number; targetA: number; reasonHint: RuntimeReasonHint } {
  const plan = input.plan && typeof input.plan === 'object' ? input.plan : null;
  if (normalizeMode(input.userMode) !== 'auto' || plan?.active !== true || String(input.effectiveMode) === 'boost') {
    return { targetW: Math.max(0, finite(input.targetW, 0)), targetA: Math.max(0, finite(input.targetA, 0)), reasonHint: null };
  }
  const action = String(plan.action || 'wait');
  if (action === 'wait' || action === 'complete') return { targetW: 0, targetA: 0, reasonHint: 'no-setpoint' };
  if (action !== 'charge') return { targetW: 0, targetA: 0, reasonHint: 'budget' };
  if (String(input.effectiveMode || '') === 'pv' && String(plan.source || '') !== 'pv') {
    return { targetW: 0, targetA: 0, reasonHint: 'no-setpoint' };
  }
  const maxPowerW = Math.max(0, finite(input.maxPowerW, 0));
  const minPowerW = Math.max(0, finite(input.minPowerW, 0));
  const requestedW = Math.min(maxPowerW, Math.max(minPowerW, finite(plan.plannedNowW, 0)));
  const hardCapW = Math.max(0, Math.min(
    finite(input.totalAvailableW, Number.POSITIVE_INFINITY),
    finite(input.stationAvailableW, Number.POSITIVE_INFINITY),
    maxPowerW || Number.POSITIVE_INFINITY,
  ));
  const targetW = Math.min(requestedW, hardCapW);
  if (targetW <= 0) return { targetW: 0, targetA: 0, reasonHint: 'budget' };
  if (minPowerW > 0 && targetW + 1 < minPowerW) return { targetW: 0, targetA: 0, reasonHint: 'below-min' };
  return { targetW, targetA: 0, reasonHint: 'allocated' };
}

export function applyStrategyOverlay(input: GenericRecord): { targetW: number; targetA: number; reasonHint: RuntimeReasonHint } {
  let targetW = Math.max(0, finite(input.targetW, 0));
  let targetA = Math.max(0, finite(input.targetA, 0));
  const strategy = input.strategy && typeof input.strategy === 'object' ? input.strategy : {};
  if (normalizeMode(input.userMode) !== 'auto' || String(input.autoSource || '').trim().toLowerCase() !== 'strategy') {
    return { targetW, targetA, reasonHint: null };
  }
  const requirement = String(strategy.requirement || 'should').trim().toLowerCase();
  if (input.plan?.deadlineOverride === true && requirement !== 'must') return { targetW, targetA, reasonHint: null };
  const action = String(strategy.action || 'standard').trim().toLowerCase();
  if (strategy.fallbackPause === true || ['pause', 'off', 'block', 'disable', 'stop'].includes(action)) {
    return { targetW: 0, targetA: 0, reasonHint: 'no-setpoint' };
  }
  if (strategy.active !== true) return { targetW, targetA, reasonHint: null };
  const requestedCapW = finite(strategy.targetPowerW, Number.NaN);
  const maxCapW = finite(strategy.maxPowerW, Number.NaN);
  let capW = Number.isFinite(requestedCapW) ? Math.max(0, requestedCapW) : null;
  if (Number.isFinite(maxCapW) && maxCapW >= 0) capW = capW === null ? maxCapW : Math.min(capW, maxCapW);
  if (capW === null) return { targetW, targetA, reasonHint: null };
  const minPowerW = Math.max(0, finite(input.minPowerW, 0));
  if (capW > 0 && minPowerW > 0 && capW + 1 < minPowerW) return { targetW: 0, targetA: 0, reasonHint: 'below-min' };
  if (targetW > capW + 1) { targetW = capW; targetA = 0; }
  return { targetW, targetA, reasonHint: null };
}

export function resolveGoalCommandStatus(input: GenericRecord): { status: string; shortfallW: number } {
  if (input.goalEnabled !== true) return { status: 'inactive', shortfallW: 0 };
  const existing = String(input.goalStatus || 'active');
  if (['reached', 'no_index', 'no_deadline'].includes(existing)) return { status: existing, shortfallW: 0 };
  const plan = input.plan && typeof input.plan === 'object' ? input.plan : null;
  if (plan?.targetReachable === false) return { status: 'shortfall', shortfallW: Math.max(0, Math.round(finite(plan.plannedNowW, 0) - finite(input.commandW, 0))) };
  if (plan?.action === 'wait') return { status: 'waiting_window', shortfallW: 0 };
  if (plan?.action === 'complete') return { status: 'reached', shortfallW: 0 };
  if (input.goalActive === true && finite(input.goalDesiredW, 0) > 0) {
    const targetW = plan ? finite(plan.plannedNowW, 0) : finite(input.goalDesiredW, 0);
    const shortfallW = Math.max(0, Math.round(targetW - finite(input.commandW, 0)));
    return { status: input.goalOverdue === true ? 'overdue' : shortfallW > 300 ? 'shortfall' : 'active', shortfallW };
  }
  return { status: existing, shortfallW: 0 };
}
