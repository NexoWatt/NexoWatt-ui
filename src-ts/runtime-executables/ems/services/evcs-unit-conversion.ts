// @runtime-transpile
/**
 * Normalisiert Ladepunkt-Messwerte in die internen NexoWatt-Einheiten.
 * - Momentanleistung bleibt intern W.
 * - Kumulierte Ladeenergie bleibt intern kWh.
 */
'use strict';

declare const module: { exports: unknown };

type EvcsEnergyNormalizationOptions = {
  inputIsWh?: boolean;
};

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Wandelt einen kumulierten Ladeenergie-Zähler in kWh um.
 * Technisch korrekt ist Wh -> kWh (Division durch 1000); Wh kann nicht direkt
 * in kW umgerechnet werden, weil kW eine Leistung und keine Energiemenge ist.
 */
function normalizeEvcsEnergyTotalKwh(value: unknown, options: EvcsEnergyNormalizationOptions = {}): unknown {
  const n = finiteNumber(value);
  if (n === null) return value;
  return options.inputIsWh === true ? (n / 1000) : n;
}

module.exports = {
  normalizeEvcsEnergyTotalKwh,
};
