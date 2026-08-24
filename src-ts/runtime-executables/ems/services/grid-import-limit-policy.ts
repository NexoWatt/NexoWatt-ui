// @runtime-transpile
'use strict';

/**
 * RC79: Reine, typisierte Berechnung fuer die zweistufige Netzbezugsbegrenzung.
 *
 * Vorzeichen am NVP:
 * - positiv: Netzbezug
 * - negativ: Netzeinspeisung
 *
 * Das Hard-Limit ist die absolute Anschluss-/RLM-Grenze. Das Soft-Limit liegt
 * darunter und wird fuer die vorausschauende Budgetierung flexibler Lasten
 * genutzt. Negative NVP-Werte erhoehen den verfuegbaren Headroom automatisch.
 */

declare const module: { exports: unknown };

type NumericInput = number | string | null | undefined;
type ImportLimitStage = 'unconfigured' | 'stale' | 'normal' | 'soft' | 'hard';
type SoftLimitMode = 'disabled' | 'explicit' | 'auto-reserve';

type GridImportLimitPolicyInput = {
  nowMs?: NumericInput;
  softLimitEnabled?: boolean;
  hardLimitW?: NumericInput;
  softLimitW?: NumericInput;
  reserveW?: NumericInput;
  hysteresisW?: NumericInput;
  releaseDelaySec?: NumericInput;
  nvpUsable?: boolean;
  signedNvpW?: NumericInput;
  previousStage?: string | null;
  releaseCandidateAtMs?: NumericInput;
};

type GridImportLimitPolicy = {
  enabled: boolean;
  hardLimitW: number;
  softLimitW: number;
  planningLimitW: number;
  reserveW: number;
  configuredReserveW: number;
  softLimitMode: SoftLimitMode;
  hysteresisW: number;
  releaseDelayMs: number;
  signedNvpW: number | null;
  hardHeadroomW: number | null;
  softHeadroomW: number | null;
  hardExcessW: number;
  softExcessW: number;
  requiredReductionW: number;
  stage: ImportLimitStage;
  reason: string;
  releasePending: boolean;
  releaseCandidateAtMs: number;
  nowMs: number;
};

type ZeroExportPvTargetInput = {
  ratedPvW?: NumericInput;
  pvActualW?: NumericInput;
  projectedNvpW?: NumericInput;
  targetNvpW?: NumericInput;
  storageActualW?: NumericInput;
  storageTargetW?: NumericInput;
  storageDischargeDeadbandW?: NumericInput;
  currentLimitW?: NumericInput;
};

type ZeroExportPvTarget = {
  usable: boolean;
  targetW: number | null;
  localAbsorptionW: number | null;
  feedbackCorrectionW: number | null;
  storageDischarging: boolean;
  storageDischargeConflict: boolean;
  reason: string;
};

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveAutoReserveW(hardLimitW: NumericInput, configuredReserveW?: NumericInput): number {
  const hard = Math.max(0, Number(hardLimitW) || 0);
  const configured = finiteOrNull(configuredReserveW);
  if (configured !== null && configured > 0) return Math.min(hard, configured);
  if (!(hard > 0)) return 0;
  return Math.min(hard, clamp(hard * 0.1, 1000, 3000));
}

function resolveGridImportLimitPolicy(input: GridImportLimitPolicyInput = {}): GridImportLimitPolicy {
  const nowMs = Math.max(0, Math.round(finiteOrNull(input.nowMs) ?? Date.now()));
  const enabled = input.softLimitEnabled !== false;
  const hardLimitW = Math.max(0, finiteOrNull(input.hardLimitW) ?? 0);
  const explicitSoftW = Math.max(0, finiteOrNull(input.softLimitW) ?? 0);
  const reserveW = resolveAutoReserveW(hardLimitW, input.reserveW);
  const hysteresisW = Math.max(0, finiteOrNull(input.hysteresisW) ?? 500);
  const releaseDelayMs = Math.max(0, (finiteOrNull(input.releaseDelaySec) ?? 10) * 1000);
  const nvpUsable = input.nvpUsable === true;
  const signedNvpW = nvpUsable ? finiteOrNull(input.signedNvpW) : null;

  let softLimitW = hardLimitW;
  let softLimitMode: SoftLimitMode = 'disabled';
  if (enabled && hardLimitW > 0) {
    if (explicitSoftW > 0 && explicitSoftW < hardLimitW) {
      softLimitW = explicitSoftW;
      softLimitMode = 'explicit';
    } else {
      softLimitW = Math.max(0, hardLimitW - reserveW);
      softLimitMode = 'auto-reserve';
    }
  }
  softLimitW = Math.min(hardLimitW, Math.max(0, softLimitW));
  const planningLimitW = enabled && softLimitW > 0 ? softLimitW : hardLimitW;

  const rawPreviousStage = String(input.previousStage || '');
  const previousStage: 'normal' | 'soft' | 'hard' = rawPreviousStage === 'soft' || rawPreviousStage === 'hard'
    ? rawPreviousStage
    : 'normal';
  let releaseCandidateAtMs = Math.max(0, finiteOrNull(input.releaseCandidateAtMs) ?? 0);
  let stage: ImportLimitStage = 'normal';
  let reason = 'below-soft-limit';
  let releasePending = false;

  if (!(hardLimitW > 0)) {
    stage = 'unconfigured';
    reason = 'hard-limit-missing';
    releaseCandidateAtMs = 0;
  } else if (!nvpUsable || signedNvpW === null) {
    stage = 'stale';
    reason = 'nvp-not-usable';
    releaseCandidateAtMs = 0;
  } else if (signedNvpW >= hardLimitW) {
    stage = 'hard';
    reason = 'hard-limit-reached';
    releaseCandidateAtMs = 0;
  } else if (enabled && planningLimitW > 0 && signedNvpW >= planningLimitW) {
    stage = 'soft';
    reason = 'soft-limit-reached';
    releaseCandidateAtMs = 0;
  } else if (enabled && previousStage !== 'normal') {
    const releaseThresholdW = Math.max(0, planningLimitW - hysteresisW);
    if (signedNvpW <= releaseThresholdW) {
      if (!(releaseCandidateAtMs > 0)) releaseCandidateAtMs = nowMs;
      if (nowMs - releaseCandidateAtMs >= releaseDelayMs) {
        stage = 'normal';
        reason = 'soft-limit-released';
        releaseCandidateAtMs = 0;
      } else {
        stage = 'soft';
        reason = 'soft-release-delay';
        releasePending = true;
      }
    } else {
      stage = 'soft';
      reason = 'soft-hysteresis-hold';
      releaseCandidateAtMs = 0;
    }
  } else {
    releaseCandidateAtMs = 0;
  }

  const hardHeadroomW = signedNvpW === null || !(hardLimitW > 0)
    ? null
    : hardLimitW - signedNvpW;
  const softHeadroomW = signedNvpW === null || !(planningLimitW > 0)
    ? null
    : planningLimitW - signedNvpW;
  const softExcessW = signedNvpW === null || !(planningLimitW > 0)
    ? 0
    : Math.max(0, signedNvpW - planningLimitW);
  const hardExcessW = signedNvpW === null || !(hardLimitW > 0)
    ? 0
    : Math.max(0, signedNvpW - hardLimitW);

  return {
    enabled,
    hardLimitW: Math.round(hardLimitW),
    softLimitW: Math.round(softLimitW),
    planningLimitW: Math.round(planningLimitW),
    reserveW: Math.round(Math.max(0, hardLimitW - softLimitW)),
    configuredReserveW: Math.round(reserveW),
    softLimitMode,
    hysteresisW: Math.round(hysteresisW),
    releaseDelayMs: Math.round(releaseDelayMs),
    signedNvpW: signedNvpW === null ? null : Math.round(signedNvpW),
    hardHeadroomW: hardHeadroomW === null ? null : Math.round(hardHeadroomW),
    softHeadroomW: softHeadroomW === null ? null : Math.round(softHeadroomW),
    hardExcessW: Math.round(hardExcessW),
    softExcessW: Math.round(softExcessW),
    requiredReductionW: Math.round(stage === 'hard' ? Math.max(softExcessW, hardExcessW) : (stage === 'soft' ? softExcessW : 0)),
    stage,
    reason,
    releasePending,
    releaseCandidateAtMs: Math.round(releaseCandidateAtMs),
    nowMs,
  };
}

/**
 * Feed-forward PV-Ziel fuer 0-Einspeisung.
 *
 * Aus NVP = lokale Aufnahme - PV folgt:
 *   PV_Ziel = PV_Ist + NVP_prognose - NVP_Ziel
 *
 * `projectedNvpW` enthaelt bereits akzeptierte Speicher- und Flex-Aenderungen.
 */
function resolveZeroExportPvTarget(input: ZeroExportPvTargetInput = {}): ZeroExportPvTarget {
  const ratedPvW = Math.max(0, finiteOrNull(input.ratedPvW) ?? 0);
  const pvActualW = finiteOrNull(input.pvActualW);
  const projectedNvpW = finiteOrNull(input.projectedNvpW);
  const targetNvpW = finiteOrNull(input.targetNvpW) ?? 0;
  const storageActualW = finiteOrNull(input.storageActualW) ?? 0;
  const storageTargetW = finiteOrNull(input.storageTargetW) ?? 0;
  const dischargeDeadbandW = Math.max(0, finiteOrNull(input.storageDischargeDeadbandW) ?? 100);
  const storageDischarging = storageActualW > dischargeDeadbandW || storageTargetW > dischargeDeadbandW;
  const currentLimitW = Math.max(0, finiteOrNull(input.currentLimitW) ?? ratedPvW);
  const pvUsable = pvActualW !== null && pvActualW >= 0 && projectedNvpW !== null;
  const curtailed = ratedPvW > 0 && currentLimitW < ratedPvW - 1;

  if (storageDischarging && curtailed && ratedPvW > 0) {
    return {
      usable: pvUsable,
      targetW: Math.round(ratedPvW),
      localAbsorptionW: pvUsable ? Math.round(Math.max(0, pvActualW + projectedNvpW)) : null,
      feedbackCorrectionW: pvUsable ? Math.round(projectedNvpW - targetNvpW) : null,
      storageDischarging: true,
      storageDischargeConflict: true,
      reason: 'release-for-storage-discharge',
    };
  }

  if (!pvUsable || pvActualW === null || projectedNvpW === null) {
    return {
      usable: false,
      targetW: null,
      localAbsorptionW: null,
      feedbackCorrectionW: null,
      storageDischarging,
      storageDischargeConflict: false,
      reason: 'pv-actual-not-usable',
    };
  }

  const localAbsorptionW = Math.max(0, pvActualW + projectedNvpW);
  const targetW = ratedPvW > 0
    ? clamp(pvActualW + projectedNvpW - targetNvpW, 0, ratedPvW)
    : Math.max(0, pvActualW + projectedNvpW - targetNvpW);

  return {
    usable: true,
    targetW: Math.round(targetW),
    localAbsorptionW: Math.round(localAbsorptionW),
    feedbackCorrectionW: Math.round(projectedNvpW - targetNvpW),
    storageDischarging,
    storageDischargeConflict: false,
    reason: 'consumption-storage-feedforward',
  };
}

module.exports = {
  resolveAutoReserveW,
  resolveGridImportLimitPolicy,
  resolveZeroExportPvTarget,
};
