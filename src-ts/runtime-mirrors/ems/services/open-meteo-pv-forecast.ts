// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/open-meteo-pv-forecast.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/open-meteo-pv-forecast.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 886a315d2083abacba308da638705ae0c61a3b7e7a2c136a8ce85bf84c78d04a
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts
 * Quell-Hash: sha256:e6d0ddffa011bf69f343af1b3c510033d399e4f5222d4b899758d6afb2d2a5bf
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/open-meteo-pv-forecast.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOpenMeteoPvArrays = normalizeOpenMeteoPvArrays;
exports.openMeteoSolarPosition = openMeteoSolarPosition;
exports.openMeteoPlaneOfArrayIrradiance = openMeteoPlaneOfArrayIrradiance;
exports.buildOpenMeteoPvCurve = buildOpenMeteoPvCurve;
exports.startOpenMeteoPvForecastRuntime = startOpenMeteoPvForecastRuntime;
const https = require('node:https');
const SLOT_MS = 15 * 60 * 1000;
const DEFAULT_ERROR = 'open-meteo-pv-not-started';
/**
 * Code-Teil: finite
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(value, min, max, fallback = min) {
    return Math.min(max, Math.max(min, finite(value, fallback)));
}
/**
 * Code-Teil: asBoolean
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function asBoolean(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized))
        return true;
    if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized))
        return false;
    return fallback;
}
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(value, fallback = '') {
    return value === null || value === undefined ? fallback : String(value);
}
/**
 * Code-Teil: parseJson
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function parseJson(value, fallback) {
    if (value && typeof value === 'object')
        return value;
    try {
        return JSON.parse(String(value ?? ''));
    }
    catch {
        return fallback;
    }
}
/**
 * Code-Teil: readSetting
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function readSetting(adapter, key, fallback) {
    const cached = adapter.stateCache?.[`settings.${key}`];
    if (cached && cached.value !== undefined && cached.value !== null)
        return cached.value;
    try {
        const state = await adapter.getStateAsync?.(`settings.${key}`);
        if (state && state.val !== undefined && state.val !== null)
            return state.val;
    }
    catch { /* optional */ }
    const configured = adapter.config?.[key];
    return configured === undefined || configured === null ? fallback : configured;
}
/**
 * Code-Teil: normalizeOpenMeteoPvArrays
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeOpenMeteoPvArrays(values) {
    const advanced = parseJson(values.pvForecastArrays, []);
    if (Array.isArray(advanced) && advanced.length > 0) {
        const rows = advanced
            .filter((item) => !!item && typeof item === 'object')
            .map((item, index) => ({
            name: text(item.name, `PV-Fläche ${index + 1}`),
            kwp: clamp(item.kwp, 0, 100000, 0),
            tiltDeg: clamp(item.tiltDeg ?? item.tilt, 0, 90, 30),
            azimuthDeg: clamp(item.azimuthDeg ?? item.azimuth, -180, 180, 0),
            lossPercent: clamp(item.lossPercent ?? item.lossesPercent, 0, 60, 14),
            inverterLimitW: clamp(item.inverterLimitW, 0, 100000000, 0),
        }))
            .filter((item) => item.kwp > 0);
        if (rows.length > 0)
            return rows;
    }
    const kwp = clamp(values.pvForecastInstalledKwp, 0, 100000, 0);
    return kwp > 0 ? [{
            name: 'PV-Anlage',
            kwp,
            tiltDeg: clamp(values.pvForecastTiltDeg, 0, 90, 30),
            azimuthDeg: clamp(values.pvForecastAzimuthDeg, -180, 180, 0),
            lossPercent: clamp(values.pvForecastLossPercent, 0, 60, 14),
            inverterLimitW: clamp(values.pvForecastInverterLimitW, 0, 100000000, 0),
        }] : [];
}
/**
 * Code-Teil: loadSettings
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function loadSettings(adapter) {
    const keys = [
        ['weatherEnabled', false], ['forecastSourceMode', 'auto'], ['openMeteoPvEnabled', false],
        ['openMeteoLatitude', 0], ['openMeteoLongitude', 0], ['openMeteoTimezone', 'auto'],
        ['forecastUpdateIntervalMin', 30], ['forecastHorizonHours', 48], ['pvForecastPlanningSafetyPct', 85],
        ['pvForecastInstalledKwp', 0], ['pvForecastTiltDeg', 30], ['pvForecastAzimuthDeg', 0],
        ['pvForecastLossPercent', 14], ['pvForecastInverterLimitW', 0], ['pvForecastArrays', '[]'],
        ['weatherUsageMode', 'private'], ['weatherApiKey', ''],
    ];
    const values = {};
    for (const [key, fallback] of keys)
        values[key] = await readSetting(adapter, key, fallback);
    return {
        enabled: asBoolean(values.weatherEnabled, false) && asBoolean(values.openMeteoPvEnabled, false),
        sourceMode: text(values.forecastSourceMode, 'auto').trim().toLowerCase(),
        latitude: clamp(values.openMeteoLatitude, -90, 90, 0),
        longitude: clamp(values.openMeteoLongitude, -180, 180, 0),
        timezone: text(values.openMeteoTimezone, 'auto').trim() || 'auto',
        updateMinutes: clamp(values.forecastUpdateIntervalMin, 5, 180, 30),
        horizonHours: clamp(values.forecastHorizonHours, 6, 72, 48),
        planningSafetyPct: clamp(values.pvForecastPlanningSafetyPct, 30, 100, 85),
        weatherUsageMode: text(values.weatherUsageMode, 'private').trim().toLowerCase(),
        weatherApiKey: text(values.weatherApiKey, '').trim(),
        arrays: normalizeOpenMeteoPvArrays(values),
    };
}
/**
 * Code-Teil: resolveLocation
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function resolveLocation(adapter, settings) {
    if (Math.abs(settings.latitude) > 1e-9 || Math.abs(settings.longitude) > 1e-9) {
        return { latitude: settings.latitude, longitude: settings.longitude };
    }
    try {
        const geo = await adapter._nwGetSystemGeo?.();
        const latitude = finite(geo?.lat, Number.NaN);
        const longitude = finite(geo?.lon, Number.NaN);
        if (Number.isFinite(latitude) && Number.isFinite(longitude))
            return { latitude, longitude };
    }
    catch { /* optional */ }
    try {
        const system = await adapter.getForeignObjectAsync?.('system.config');
        const latitude = finite(system?.common?.latitude, Number.NaN);
        const longitude = finite(system?.common?.longitude, Number.NaN);
        if (Number.isFinite(latitude) && Number.isFinite(longitude))
            return { latitude, longitude };
    }
    catch { /* optional */ }
    return null;
}
/**
 * Code-Teil: requestJson
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function requestJson(adapter, url) {
    if (adapter._nwHttpsGetJson)
        return adapter._nwHttpsGetJson(url, 12000);
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers: { 'user-agent': 'NexoWatt-EOS-PV-Forecast/1.0' } }, (response) => {
            let body = '';
            response.on('data', (chunk) => { body += String(chunk); });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300)
                    return reject(new Error(`HTTP ${response.statusCode}`));
                try {
                    resolve(JSON.parse(body));
                }
                catch (error) {
                    reject(error);
                }
            });
        });
        request.setTimeout(12000, () => request.destroy(new Error('Open-Meteo timeout')));
        request.on('error', reject);
    });
}
/**
 * Code-Teil: openMeteoSolarPosition
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function openMeteoSolarPosition(timestampMs, latitude, longitude) {
    const rad = Math.PI / 180;
    const julianDay = timestampMs / 86400000 + 2440587.5;
    const days = julianDay - 2451545;
    const meanLongitude = (280.46 + 0.9856474 * days) % 360;
    const anomaly = (357.528 + 0.9856003 * days) % 360;
    const ecliptic = (meanLongitude + 1.915 * Math.sin(anomaly * rad) + 0.020 * Math.sin(2 * anomaly * rad)) * rad;
    const obliquity = (23.439 - 0.0000004 * days) * rad;
    const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(ecliptic), Math.cos(ecliptic));
    const declination = Math.asin(Math.sin(obliquity) * Math.sin(ecliptic));
    const sidereal = (280.46061837 + 360.98564736629 * (julianDay - 2451545)) * rad;
    let hourAngle = sidereal + longitude * rad - rightAscension;
    while (hourAngle > Math.PI)
        hourAngle -= 2 * Math.PI;
    while (hourAngle < -Math.PI)
        hourAngle += 2 * Math.PI;
    const latitudeRad = latitude * rad;
    const sinAltitude = Math.sin(latitudeRad) * Math.sin(declination)
        + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle);
    const altitude = Math.asin(clamp(sinAltitude, -1, 1, 0));
    const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * Math.cos(latitudeRad) - Math.sin(latitudeRad) * Math.cos(hourAngle));
    return { altitude, zenith: Math.PI / 2 - altitude, azimuth: (azimuth + 2 * Math.PI) % (2 * Math.PI) };
}
/**
 * Code-Teil: openMeteoPlaneOfArrayIrradiance
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function openMeteoPlaneOfArrayIrradiance(timestampMs, latitude, longitude, array, ghi, dni, dhi) {
    const rad = Math.PI / 180;
    const sun = openMeteoSolarPosition(timestampMs, latitude, longitude);
    if (sun.altitude <= 0)
        return 0;
    const tilt = array.tiltDeg * rad;
    const panelAzimuth = ((array.azimuthDeg + 180) % 360) * rad; // 0° UI = south
    const cosIncidence = Math.cos(sun.zenith) * Math.cos(tilt)
        + Math.sin(sun.zenith) * Math.sin(tilt) * Math.cos(sun.azimuth - panelAzimuth);
    return Math.max(0, dni) * Math.max(0, cosIncidence)
        + Math.max(0, dhi) * (1 + Math.cos(tilt)) / 2
        + Math.max(0, ghi) * 0.2 * (1 - Math.cos(tilt)) / 2;
}
/**
 * Code-Teil: seriesValue
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function seriesValue(data, key, index) {
    return Array.isArray(data?.hourly?.[key]) ? finite(data.hourly[key][index], 0) : 0;
}
/**
 * Code-Teil: buildOpenMeteoPvCurve
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildOpenMeteoPvCurve(data, settings, location, nowMs) {
    const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
    const horizonEnd = nowMs + settings.horizonHours * 3600000;
    const curve = [];
    for (let index = 0; index < times.length - 1; index += 1) {
        const startHour = Date.parse(String(times[index] ?? ''));
        const endHour = Date.parse(String(times[index + 1] ?? ''));
        if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || endHour <= startHour || startHour > horizonEnd)
            continue;
        for (let quarter = 0; quarter < 4; quarter += 1) {
            const timestamp = startHour + quarter * SLOT_MS;
            if (timestamp + SLOT_MS <= nowMs - SLOT_MS || timestamp > horizonEnd)
                continue;
            const fraction = quarter / 4;
/**
 * Code-Teil: interpolate
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
            const interpolate = (key) => seriesValue(data, key, index)
                + (seriesValue(data, key, index + 1) - seriesValue(data, key, index)) * fraction;
            const ghi = interpolate('shortwave_radiation');
            const dni = interpolate('direct_normal_irradiance');
            const dhi = interpolate('diffuse_radiation');
            const ambient = interpolate('temperature_2m');
            let totalPowerW = 0;
            for (const array of settings.arrays) {
                const poa = openMeteoPlaneOfArrayIrradiance(timestamp, location.latitude, location.longitude, array, ghi, dni, dhi);
                const cellTemperature = ambient + 0.03 * poa;
                const temperatureFactor = clamp(1 - 0.004 * (cellTemperature - 25), 0.7, 1.1, 1);
                let powerW = array.kwp * 1000 * (poa / 1000) * (1 - array.lossPercent / 100) * temperatureFactor;
                if (array.inverterLimitW > 0)
                    powerW = Math.min(powerW, array.inverterLimitW);
                totalPowerW += Math.max(0, powerW);
            }
            curve.push({ t: timestamp, dtMs: SLOT_MS, w: Math.round(totalPowerW) });
        }
    }
    return curve.sort((a, b) => a.t - b.t).slice(0, 384);
}
/**
 * Code-Teil: integrateKwh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function integrateKwh(curve, nowMs, hours) {
    const endMs = nowMs + hours * 3600000;
    return curve.reduce((sum, segment) => {
        const overlap = Math.max(0, Math.min(segment.t + segment.dtMs, endMs) - Math.max(segment.t, nowMs));
        return sum + segment.w * overlap / 3600000000;
    }, 0);
}
/**
 * Code-Teil: invalidSnapshot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function invalidSnapshot(nowMs, error, settings) {
    return {
        ts: nowMs, valid: false, source: 'open-meteo-gti', ageMs: 0, points: 0,
        configuredKwp: settings?.arrays.reduce((sum, item) => sum + item.kwp, 0) ?? 0,
        planningSafetyPct: settings?.planningSafetyPct ?? 85,
        kwhNext6h: 0, kwhNext12h: 0, kwhNext24h: 0, peakWNext24h: 0,
        statusText: error, error, curve: [],
    };
}
/**
 * Code-Teil: ensureState
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function ensureState(adapter, id, type, role, unit) {
    try {
        await adapter.setObjectNotExistsAsync?.(id, { type: 'state', common: { name: id, type, role, read: true, write: false, unit }, native: {} });
    }
    catch { /* optional */ }
}
/**
 * Code-Teil: publish
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function publish(adapter, value) {
    const definitions = [
        ['valid', 'boolean', 'indicator'], ['updatedAt', 'number', 'value.time'], ['ageMs', 'number', 'value.interval', 'ms'],
        ['points', 'number', 'value'], ['kwhNext6h', 'number', 'value.energy', 'kWh'], ['kwhNext12h', 'number', 'value.energy', 'kWh'],
        ['kwhNext24h', 'number', 'value.energy', 'kWh'], ['peakWNext24h', 'number', 'value.power', 'W'],
        ['configuredKwp', 'number', 'value.power', 'kWp'], ['planningSafetyPct', 'number', 'value.percent', '%'],
        ['statusText', 'string', 'text'], ['error', 'string', 'text'], ['curveJson', 'string', 'json'],
    ];
    for (const [key, type, role, unit] of definitions)
        await ensureState(adapter, `forecast.openMeteoPv.${key}`, type, role, unit);
    const states = {
        valid: value.valid, updatedAt: value.ts, ageMs: value.ageMs, points: value.points,
        kwhNext6h: Number(value.kwhNext6h.toFixed(3)), kwhNext12h: Number(value.kwhNext12h.toFixed(3)),
        kwhNext24h: Number(value.kwhNext24h.toFixed(3)), peakWNext24h: value.peakWNext24h,
        configuredKwp: value.configuredKwp, planningSafetyPct: value.planningSafetyPct,
        statusText: value.statusText, error: value.error, curveJson: JSON.stringify(value.curve.slice(0, 384)),
    };
    for (const [key, state] of Object.entries(states)) {
        try {
            await adapter.setStateAsync?.(`forecast.openMeteoPv.${key}`, { val: state, ack: true });
        }
        catch { /* optional */ }
    }
}
/**
 * Code-Teil: refresh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function refresh(adapter) {
    const nowMs = Date.now();
    const settings = await loadSettings(adapter);
    if (!settings.enabled || !['auto', 'open-meteo'].includes(settings.sourceMode)) {
        const value = invalidSnapshot(nowMs, 'Open-Meteo PV-Prognose deaktiviert', settings);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    if (settings.arrays.length === 0) {
        const value = invalidSnapshot(nowMs, 'Keine PV-Fläche mit installierter Leistung konfiguriert', settings);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    const location = await resolveLocation(adapter, settings);
    if (!location) {
        const value = invalidSnapshot(nowMs, 'Anlagenstandort nicht konfiguriert', settings);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    if (settings.weatherUsageMode === 'commercial' && !settings.weatherApiKey) {
        const value = invalidSnapshot(nowMs, 'Gewerbliche Open-Meteo-Nutzung benötigt einen API-Key', settings);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    try {
        const baseUrl = settings.weatherUsageMode === 'commercial'
            ? 'https://customer-api.open-meteo.com/v1/forecast'
            : 'https://api.open-meteo.com/v1/forecast';
        const apiKey = settings.weatherUsageMode === 'commercial' ? `&apikey=${encodeURIComponent(settings.weatherApiKey)}` : '';
        const forecastDays = Math.min(5, Math.max(2, Math.ceil(settings.horizonHours / 24) + 1));
        const hourly = 'temperature_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,cloud_cover';
        const url = `${baseUrl}?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`
            + `&hourly=${hourly}&forecast_days=${forecastDays}&timezone=${encodeURIComponent(settings.timezone)}${apiKey}`;
        const data = await requestJson(adapter, url);
        if (!data || data.error)
            throw new Error(text(data?.reason, 'Open-Meteo API error'));
        const curve = buildOpenMeteoPvCurve(data, settings, location, nowMs);
        if (curve.length === 0)
            throw new Error('Keine zukünftigen Einstrahlungswerte verfügbar');
        const value = {
            ts: nowMs, valid: true, source: 'open-meteo-gti', ageMs: 0, points: curve.length,
            configuredKwp: settings.arrays.reduce((sum, item) => sum + item.kwp, 0), planningSafetyPct: settings.planningSafetyPct,
            kwhNext6h: integrateKwh(curve, nowMs, 6), kwhNext12h: integrateKwh(curve, nowMs, 12),
            kwhNext24h: integrateKwh(curve, nowMs, 24),
            peakWNext24h: curve.filter((segment) => segment.t < nowMs + 24 * 3600000).reduce((max, segment) => Math.max(max, segment.w), 0),
            statusText: `Open-Meteo PV-Prognose aktiv (${curve.length} Punkte)`, error: '', curve,
        };
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    catch (error) {
        const previous = adapter._openMeteoPvForecast;
        const message = text(error?.message, String(error));
        if (previous?.valid && previous.ts > 0) {
            const stale = { ...previous, ageMs: Math.max(0, nowMs - previous.ts), statusText: `Letzte Prognose wird weiterverwendet: ${message}`, error: message };
            adapter._openMeteoPvForecast = stale;
            await publish(adapter, stale);
            return stale;
        }
        const value = invalidSnapshot(nowMs, message, settings);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
}
/**
 * Code-Teil: startOpenMeteoPvForecastRuntime
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function startOpenMeteoPvForecastRuntime(adapter) {
    let stopped = false;
    let timer = null;
    let running = null;
/**
 * Code-Teil: clear
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const clear = () => {
        if (!timer)
            return;
        try {
            adapter.clearTimeout ? adapter.clearTimeout(timer) : clearTimeout(timer);
        }
        catch { /* optional */ }
        timer = null;
    };
/**
 * Code-Teil: cycle
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const cycle = async () => {
        if (stopped || adapter._nwShuttingDown)
            return adapter._openMeteoPvForecast ?? invalidSnapshot(Date.now(), DEFAULT_ERROR);
        if (running)
            return running;
        clear();
        running = refresh(adapter).finally(async () => {
            running = null;
            if (!stopped && !adapter._nwShuttingDown) {
                const settings = await loadSettings(adapter).catch(() => ({ updateMinutes: 30 }));
                const delay = clamp(settings.updateMinutes, 5, 180, 30) * 60000;
/**
 * Code-Teil: callback
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
                const callback = () => { cycle().catch(() => { }); };
                timer = adapter.setTimeout ? adapter.setTimeout(callback, delay) : setTimeout(callback, delay);
            }
        });
        return running;
    };
    cycle().catch((error) => adapter.log?.debug?.(`[forecast] ${text(error?.message, error)}`));
    return { refresh: cycle, stop: () => { stopped = true; clear(); } };
}
