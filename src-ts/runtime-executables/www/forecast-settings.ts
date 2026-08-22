// @runtime-transpile
'use strict';

/** Read-only helper for the customer-visible weather/PV forecast settings. */
(function initForecastSettings(){
  const byId = (id: string): HTMLElement | null => document.getElementById(id);
  const stateValue = (key: string, fallback: unknown = null): unknown => {
    const state = (window as any).latestState || {};
    const entry = state[key];
    return entry && Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : fallback;
  };
  const formatEnergy = (value: unknown): string => {
    const wh = Number(value);
    return Number.isFinite(wh) ? `${(wh / 1000).toFixed(wh >= 10000 ? 1 : 2)} kWh` : '—';
  };
  const updateVisibility = (): void => {
    const source = String((byId('s_forecastSourceMode') as HTMLSelectElement | null)?.value || 'auto');
    const enabled = !!(byId('s_openMeteoPvEnabled') as HTMLInputElement | null)?.checked;
    const fields = byId('nwOpenMeteoPvFields');
    if (fields) fields.classList.toggle('hidden', !enabled || !['auto', 'open-meteo'].includes(source));
    const fallback = byId('s_forecastFallbackToDatapoints')?.closest('.row');
    if (fallback) fallback.classList.toggle('hidden', source !== 'auto');
  };
  const updateStatus = (): void => {
    const source = String(stateValue('forecast.pv.source', 'none') || 'none');
    const valid = stateValue('forecast.pv.valid', false) === true;
    const ageMs = Number(stateValue('forecast.pv.ageMs', Number.NaN));
    const status = byId('nwForecastStatus');
    const sourceNode = byId('nwForecastSource');
    const updated = byId('nwForecastUpdated');
    const error = byId('nwForecastError');
    if (status) status.textContent = valid ? 'Prognose aktiv' : 'Keine aktuelle Prognose';
    if (sourceNode) sourceNode.textContent = source;
    if (updated) updated.textContent = Number.isFinite(ageMs) ? `vor ${Math.max(0, Math.round(ageMs / 60000))} min` : '—';
    const e6 = byId('nwForecast6h'); if (e6) e6.textContent = formatEnergy(Number(stateValue('forecast.pv.kwhNext6h', 0)) * 1000);
    const e12 = byId('nwForecast12h'); if (e12) e12.textContent = formatEnergy(Number(stateValue('forecast.pv.kwhNext12h', 0)) * 1000);
    const e24 = byId('nwForecast24h'); if (e24) e24.textContent = formatEnergy(Number(stateValue('forecast.pv.kwhNext24h', 0)) * 1000);
    const message = String(stateValue('forecast.pv.statusText', '') || '');
    if (error) { error.textContent = valid ? '' : message; error.classList.toggle('hidden', valid || !message); }
  };
  const setup = (): void => {
    byId('s_forecastSourceMode')?.addEventListener('change', updateVisibility);
    byId('s_openMeteoPvEnabled')?.addEventListener('change', updateVisibility);
    updateVisibility(); updateStatus();
    window.setInterval(updateStatus, 3000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true }); else setup();
})();
