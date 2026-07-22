// @runtime-transpile
'use strict';

/**
 * SG-Ready consumer actuation over two digital outputs.
 *
 * The consumer is intentionally manufacturer-neutral: all datapoint keys come
 * from the AppCenter mapping and are written through the shared DP registry.
 */

declare const module: { exports: unknown };

type SgReadyState = 'off' | 'on' | 'boost' | 'block';
type WriteResult = boolean | null;

interface SgReadyDpRegistry {
  getEntry?: (key: string) => unknown;
  writeBoolean: (key: string, value: boolean, ack?: boolean) => Promise<boolean>;
}

interface SgReadyAdapter {
  log?: {
    debug?: (message: string) => void;
  };
}

interface SgReadyContext {
  dp?: SgReadyDpRegistry | null;
  adapter?: SgReadyAdapter | null;
}

interface SgReadyConsumer {
  key?: unknown;
  sg1Key?: unknown;
  sg2Key?: unknown;
  enableKey?: unknown;
  invert1?: unknown;
  invert2?: unknown;
}

interface SgReadyTarget {
  state?: unknown;
}

interface SgReadyResult {
  applied: boolean;
  status: 'no_sgready_dp' | 'unchanged' | 'applied' | 'applied_partial' | 'write_failed';
  writes: {
    sg1: WriteResult;
    sg2: WriteResult;
    enable: WriteResult;
  };
  state?: SgReadyState;
}

function mappedKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeState(value: unknown): SgReadyState {
  const raw = String(value ?? 'off').trim().toLowerCase();
  if (!raw || raw === '0' || raw === 'normal') return 'off';
  if (raw === 'on' || raw === '1') return 'on';
  if (raw === 'boost' || raw === '2') return 'boost';
  if (raw === 'block' || raw === 'blocked' || raw === '3') return 'block';
  return 'off';
}

/**
 * Applies a single SG-Ready state without bypassing mapped output checks.
 */
async function applySgReady(
  ctx: SgReadyContext | null | undefined,
  consumer: SgReadyConsumer | null | undefined,
  target: SgReadyTarget | null | undefined,
): Promise<SgReadyResult> {
  const adapter = ctx?.adapter ?? null;
  const dp = ctx?.dp ?? null;
  const sg1Key = mappedKey(consumer?.sg1Key);
  const sg2Key = mappedKey(consumer?.sg2Key);
  const enableKey = mappedKey(consumer?.enableKey);
  const has1 = !!(sg1Key && dp?.getEntry?.(sg1Key));
  const has2 = !!(sg2Key && dp?.getEntry?.(sg2Key));
  const hasEnable = !!(enableKey && dp?.getEntry?.(enableKey));

  if (!has1 && !has2 && !hasEnable) {
    return { applied: false, status: 'no_sgready_dp', writes: { sg1: null, sg2: null, enable: null } };
  }

  const state = normalizeState(target?.state);
  let sg1 = state === 'on' || state === 'boost';
  let sg2 = state === 'boost' || state === 'block';
  const enable = state === 'on' || state === 'boost';
  if (consumer?.invert1) sg1 = !sg1;
  if (consumer?.invert2) sg2 = !sg2;

  let wrote1: WriteResult = null;
  let wrote2: WriteResult = null;
  let wroteEnable: WriteResult = null;
  if (has1 && dp) wrote1 = await dp.writeBoolean(sg1Key, sg1, false);
  if (has2 && dp) wrote2 = await dp.writeBoolean(sg2Key, sg2, false);
  if (enableKey) wroteEnable = hasEnable && dp ? await dp.writeBoolean(enableKey, enable, false) : false;

  const results = [wrote1, wrote2, wroteEnable].filter((value): value is boolean => value !== null);
  const anyFalse = results.some((value) => value === false);
  const anyTrue = results.some((value) => value === true);
  const status: SgReadyResult['status'] = anyFalse && anyTrue
    ? 'applied_partial'
    : anyFalse
      ? 'write_failed'
      : anyTrue
        ? 'applied'
        : 'unchanged';

  adapter?.log?.debug?.(
    `[consumer:sgready] apply '${String(consumer?.key ?? '')}' state=${state} wrote1=${wrote1} wrote2=${wrote2} wroteEn=${wroteEnable} status=${status}`,
  );
  return {
    applied: !anyFalse,
    status,
    writes: { sg1: wrote1, sg2: wrote2, enable: wroteEnable },
    state,
  };
}

module.exports = { applySgReady };
