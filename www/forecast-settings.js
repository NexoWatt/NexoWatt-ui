/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/forecast-settings.ts
 * Quell-Hash: sha256:0a940cb0721e8f3ce6d0d682f635bb1e592c14692f6acfff09358b5e14dc7c4b
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/forecast-settings.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
/** Read-only helper for the customer-visible weather/PV forecast settings. */
(function initForecastSettings() {
    const byId = (id) => document.getElementById(id);
    const stateValue = (key, fallback = null) => {
        const state = window.latestState || {};
        const entry = state[key];
        return entry && Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : fallback;
    };
    const formatEnergy = (value) => {
        const wh = Number(value);
        return Number.isFinite(wh) ? `${(wh / 1000).toFixed(wh >= 10000 ? 1 : 2)} kWh` : '—';
    };
    const updateVisibility = () => {
        const source = String(byId('s_forecastSourceMode')?.value || 'auto');
        const enabled = !!byId('s_openMeteoPvEnabled')?.checked;
        const fields = byId('nwOpenMeteoPvFields');
        if (fields)
            fields.classList.toggle('hidden', !enabled || !['auto', 'open-meteo'].includes(source));
        const fallback = byId('s_forecastFallbackToDatapoints')?.closest('.row');
        if (fallback)
            fallback.classList.toggle('hidden', source !== 'auto');
    };
    const updateStatus = () => {
        const source = String(stateValue('forecast.pv.source', 'none') || 'none');
        const valid = stateValue('forecast.pv.valid', false) === true;
        const ageMs = Number(stateValue('forecast.pv.ageMs', Number.NaN));
        const status = byId('nwForecastStatus');
        const sourceNode = byId('nwForecastSource');
        const updated = byId('nwForecastUpdated');
        const error = byId('nwForecastError');
        if (status)
            status.textContent = valid ? 'Prognose aktiv' : 'Keine aktuelle Prognose';
        if (sourceNode)
            sourceNode.textContent = source;
        if (updated)
            updated.textContent = Number.isFinite(ageMs) ? `vor ${Math.max(0, Math.round(ageMs / 60000))} min` : '—';
        const e6 = byId('nwForecast6h');
        if (e6)
            e6.textContent = formatEnergy(Number(stateValue('forecast.pv.kwhNext6h', 0)) * 1000);
        const e12 = byId('nwForecast12h');
        if (e12)
            e12.textContent = formatEnergy(Number(stateValue('forecast.pv.kwhNext12h', 0)) * 1000);
        const e24 = byId('nwForecast24h');
        if (e24)
            e24.textContent = formatEnergy(Number(stateValue('forecast.pv.kwhNext24h', 0)) * 1000);
        const message = String(stateValue('forecast.pv.statusText', '') || '');
        if (error) {
            error.textContent = valid ? '' : message;
            error.classList.toggle('hidden', valid || !message);
        }
    };
    const setup = () => {
        byId('s_forecastSourceMode')?.addEventListener('change', updateVisibility);
        byId('s_openMeteoPvEnabled')?.addEventListener('change', updateVisibility);
        updateVisibility();
        updateStatus();
        window.setInterval(updateStatus, 3000);
    };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setup, { once: true });
    else
        setup();
})();
