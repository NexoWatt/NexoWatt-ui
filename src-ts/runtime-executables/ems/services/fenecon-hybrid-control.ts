// @runtime-transpile
'use strict';

/**
 * Gemeinsamer FENECON-Hybrid-Vertrag für Einzelspeicher und Speicherfarm.
 *
 * Verbindliche Trennung:
 * - ctrlBalancingX/SetGridActivePower ist ein NVP-Ziel (FEMS-NVP-Regler).
 * - essX/SetActivePowerEquals ist ein direkter Batterie-/ESS-Sollwert.
 * - essX/ActivePower ist die echte AC-seitige Aktor-Rückmeldung.
 * - Hybrid-/Balance-Power und PV-Leistungen sind Anzeige-/Bilanzwerte und
 *   dürfen nicht als Aktorfeedback oder zusätzlicher Sollwert-Feed-forward
 *   verwendet werden.
 * - PV-Erzeugung schaltet die Reglerhoheit nicht um. Der beim Speichern bzw.
 *   Start aufgelöste Pfad arbeitet tagsüber und nachts kontinuierlich.
 */

declare const module: { exports: unknown };

type AnyRecord = Record<string, any>;

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, minValue: number | null, maxValue: number | null): number {
  let out = value;
  if (minValue !== null) out = Math.max(minValue, out);
  if (maxValue !== null) out = Math.min(maxValue, out);
  return out;
}

function normalizeObjectId(value: unknown): string {
  return text(value).replace(/\s+/g, '').toLowerCase();
}

function sameObjectId(a: unknown, b: unknown): boolean {
  const aa = normalizeObjectId(a);
  const bb = normalizeObjectId(b);
  return !!(aa && bb && aa === bb);
}

function normalizeVendorProfile(value: unknown): string {
  const raw = text(value).toLowerCase();
  if (['fenecon', 'openems', 'fems', 'fenecon-openems'].includes(raw)) return 'fenecon-openems';
  if (['sungrow', 'sungrow-ess', 'sungrow-hybrid'].includes(raw)) return 'sungrow-hybrid';
  if (['e3dc', 'e3/dc', 'e3dc-rscp', 'e3dc-rscp-iobroker'].includes(raw)) return 'e3dc-rscp';
  return raw || 'generic';
}

function normalizeControlMode(value: unknown): string {
  const raw = text(value).toLowerCase();
  if (['fems-grid', 'fems', 'fems-nvp', 'native', 'native-grid', 'grid-target'].includes(raw)) return 'fems-grid';
  if (['direct-ess', 'direct', 'ess', 'set-active-power', 'direct-power'].includes(raw)) return 'direct-ess';
  // Migration: Die frühere PV-/Tag-Nacht-Automatik wird nicht mehr verwendet.
  // Alte Werte werden auf die sichere kontinuierliche Automatik migriert.
  if (['hybrid-auto', 'pv-pass-through', 'day-fems-night-direct', 'fems-day-direct-night'].includes(raw)) return 'auto';
  return 'auto';
}

function isFeneconHybrid(config: AnyRecord = {}): boolean {
  const profile = normalizeVendorProfile(config.vendorProfile);
  const coupling = text(config.coupling).toLowerCase();
  return profile === 'fenecon-openems' && (coupling === 'dc' || coupling === 'hybrid');
}

function getNativeTargetId(config: AnyRecord = {}): string {
  return text(
    config.feneconGridSetpointObjectId
    || config.feneconGridSetpointId
    || config.femsGridSetpointObjectId
    || config.femsGridSetpointId,
  );
}

function getDirectTargetIds(config: AnyRecord = {}): string[] {
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

function getEssActualPowerId(config: AnyRecord = {}): string {
  return text(
    config.feneconEssActualPowerObjectId
    || config.feneconEssActualPowerId
    || config.essActualPowerObjectId
    || config.essActualPowerId
    || config.signedPowerId,
  );
}

function hasWritableNativeTarget(config: AnyRecord = {}): boolean {
  return !!getNativeTargetId(config);
}

function hasWritableDirectTarget(config: AnyRecord = {}, context: AnyRecord = {}): boolean {
  if (context.directTargetAvailable === true) return true;
  return getDirectTargetIds(config).length > 0;
}

function isPowerBalanceObjectId(value: unknown): boolean {
  const id = normalizeObjectId(value);
  if (!id) return false;
  return /(?:^|\.)aliases(?:\.v1)?\.r\.powerbalance(?:$|\.)/.test(id)
    || /(?:^|[._/-])powerbalance(?:$|[._/-])/.test(id)
    || /batterypowerbalance/.test(id);
}

function isLikelyDirectEssSetpointObjectId(value: unknown): boolean {
  const id = normalizeObjectId(value);
  if (!id) return false;
  return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.powersetpointw(?:$|\.)/.test(id)
    || /setactivepowerequals/.test(id)
    || /(?:^|[._/-])706(?:$|[._/-])/.test(id);
}

function isLikelyFemsGridTargetObjectId(value: unknown): boolean {
  const id = normalizeObjectId(value);
  if (!id) return false;
  return /(?:^|\.)aliases(?:\.v1)?\.ctrl\.(?:gridsetpointw|napsetpointw)(?:$|\.)/.test(id)
    || /setgridactivepower/.test(id)
    || /ctrlbalancing/.test(id);
}

function resolveControlMode(config: AnyRecord = {}, context: AnyRecord = {}): AnyRecord {
  const requestedMode = normalizeControlMode(config.feneconControlMode || config.controlModeMode || config.feneconHybridControlMode);
  const hybrid = isFeneconHybrid(config);
  const nativeTargetId = getNativeTargetId(config);
  const directTargetIds = getDirectTargetIds(config);
  const nativeTargetAvailable = !!nativeTargetId;
  const directTargetAvailable = hasWritableDirectTarget(config, context);
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
    directTargetAvailable,
    nativeTargetId,
    directTargetIds,
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
  if (nativeTargetAvailable) {
    return { ...common, eligible: true, mode: 'fems-grid', reason: 'auto-dedicated-fems-grid-target' };
  }
  if (directTargetAvailable) {
    return { ...common, eligible: true, mode: 'direct-ess', reason: 'auto-direct-ess-fallback' };
  }
  return { ...common, eligible: true, mode: 'invalid', reason: 'auto-no-writable-fenecon-target' };
}

/**
 * Legacy-Kompatibilität für ältere Aufrufer. PV darf die Reglerhoheit nicht
 * mehr umschalten; daher liefert der Helfer ausschließlich den kontinuierlich
 * aufgelösten Kommandopfad und niemals einen PV-bedingten No-Write-Zustand.
 */
function resolveHybridAuthority(config: AnyRecord = {}, runtime: AnyRecord = {}): AnyRecord {
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

function validateSingleConfig(config: AnyRecord = {}, context: AnyRecord = {}): AnyRecord {
  const resolution = resolveControlMode(config, context);
  if (!isFeneconHybrid(config)) {
    return {
      ok: resolution.mode !== 'invalid',
      reason: resolution.mode === 'invalid' ? resolution.reason : 'not-fenecon-hybrid',
      resolution,
    };
  }

  const nativeTargetId = getNativeTargetId(config);
  const directTargetIds = getDirectTargetIds(config);
  const essActualPowerId = getEssActualPowerId(config);

  if (resolution.mode === 'invalid') {
    return { ok: false, reason: resolution.reason, resolution, nativeTargetId, directTargetIds, essActualPowerId };
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
  if (nativeTargetId && isLikelyDirectEssSetpointObjectId(nativeTargetId) && !isLikelyFemsGridTargetObjectId(nativeTargetId)) {
    return { ok: false, reason: 'fenecon-grid-target-is-direct-ess-setpoint', resolution, nativeTargetId, directTargetIds, essActualPowerId };
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
    directTargetIds,
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
function calculateFemsGridTargetW(input: AnyRecord = {}): AnyRecord {
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

function validateFarmRows(rowsIn: unknown): AnyRecord {
  const rows = Array.isArray(rowsIn)
    ? rowsIn.filter((row) => row && typeof row === 'object' && row.enabled !== false) as AnyRecord[]
    : [];
  const configuredRows = rows.filter((row) => !!(
    getDirectTargetIds(row).length
    || getNativeTargetId(row)
  ));
  const writableStorageCount = configuredRows.length;
  const resolved = configuredRows.map((row) => {
    const directTargetAvailable = getDirectTargetIds(row).length > 0;
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
  } else if (invalidRows.length) {
    reason = invalidRows[0].validation.reason;
  } else if (nativeRows.length === 1 && writableStorageCount > 1) {
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
  resolveHybridAuthority,
  resolveControlMode,
  validateSingleConfig,
  calculateFemsGridTargetW,
  validateFarmRows,
};
