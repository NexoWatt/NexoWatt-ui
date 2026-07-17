// @runtime-transpile
'use strict';

declare const module: { exports: unknown };

type AllocationOptions = {
  allocationEnabled?: boolean;
  storageEligible?: boolean;
  storageMaxChargeW?: number | null;
};

type AllocationResult = {
  mode: 'storage' | 'emobility' | 'both' | 'dynamic';
  allocationEnabled: boolean;
  evcsSharePct: number;
  totalW: number;
  evcsCapW: number;
  storageGuaranteedW: number;
  storageEligible: boolean;
  storageMaxChargeW: number | null;
  reason: string;
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function roundW(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function normalizePvSurplusPriority(value: unknown): AllocationResult['mode'] {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode === 'storage' || mode === 'speicher') return 'storage';
  if (mode === 'emobility' || mode === 'e-mobility' || mode === 'evcs' || mode === 'wallbox') return 'emobility';
  if (mode === 'dynamic' || mode === 'auto' || mode === 'none' || mode === 'off' || mode === 'disabled') return 'dynamic';
  return 'both';
}

export function buildPvSurplusAllocation(
  totalW: unknown,
  modeRaw: unknown,
  evcsSharePctRaw: unknown,
  options: AllocationOptions = {},
): AllocationResult {
  const total = Math.max(0, Number(totalW) || 0);
  const allocationEnabled = options.allocationEnabled !== false;
  const mode = allocationEnabled ? normalizePvSurplusPriority(modeRaw) : 'dynamic';
  const evcsSharePct = clamp(evcsSharePctRaw, 0, 100, 50);
  const storageEligible = options.storageEligible !== false;
  const storageMaxRaw = Number(options.storageMaxChargeW);
  const storageMaxChargeW = Number.isFinite(storageMaxRaw) && storageMaxRaw > 0 ? storageMaxRaw : Number.POSITIVE_INFINITY;

  let storageWantedW = 0;
  let reason = 'shared';
  if (!storageEligible) reason = 'storage-not-eligible';
  else if (mode === 'storage') { storageWantedW = total; reason = 'storage-first'; }
  else if (mode === 'emobility') reason = 'emobility-first';
  else if (mode === 'dynamic') reason = allocationEnabled ? 'dynamic-demand-remainder' : 'fixed-allocation-disabled';
  else storageWantedW = total * (1 - evcsSharePct / 100);

  const storageGuaranteedW = storageEligible ? Math.max(0, Math.min(total, storageWantedW, storageMaxChargeW)) : 0;
  return {
    mode,
    allocationEnabled,
    evcsSharePct: Math.round(evcsSharePct),
    totalW: roundW(total),
    evcsCapW: roundW(Math.max(0, total - storageGuaranteedW)),
    storageGuaranteedW: roundW(storageGuaranteedW),
    storageEligible,
    storageMaxChargeW: Number.isFinite(storageMaxChargeW) ? roundW(storageMaxChargeW) : null,
    reason,
  };
}

module.exports = { normalizePvSurplusPriority, buildPvSurplusAllocation };
