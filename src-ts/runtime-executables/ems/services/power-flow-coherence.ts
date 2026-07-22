// @runtime-transpile
'use strict';

/**
 * Normalisiert zwei gegengerichtete positive Leistungswerte auf genau einen
 * signierten Nettofluss. Dadurch koennen LIVE und Historie nicht gleichzeitig
 * Bezug/Einspeisung beziehungsweise Laden/Entladen anzeigen.
 */

declare const module: { exports: unknown };

export type OpposingPowerFlowResult = {
  positiveW: number;
  negativeW: number;
  signedW: number;
  rawPositiveW: number;
  rawNegativeW: number;
  conflict: boolean;
};

function nonNegative(value: unknown): number {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.abs(parsed)) : 0;
}

export function normalizeOpposingPowerFlows(
  positiveDirectionW: unknown,
  negativeDirectionW: unknown,
  deadbandW: unknown = 0,
): OpposingPowerFlowResult {
  const rawPositiveW = nonNegative(positiveDirectionW);
  const rawNegativeW = nonNegative(negativeDirectionW);
  const deadband = Math.max(0, Number(deadbandW) || 0);
  let signedW = rawPositiveW - rawNegativeW;
  if (Math.abs(signedW) <= deadband) signedW = 0;
  return {
    positiveW: signedW > 0 ? signedW : 0,
    negativeW: signedW < 0 ? Math.abs(signedW) : 0,
    signedW,
    rawPositiveW,
    rawNegativeW,
    conflict: rawPositiveW > deadband && rawNegativeW > deadband,
  };
}

module.exports = { normalizeOpposingPowerFlows };
