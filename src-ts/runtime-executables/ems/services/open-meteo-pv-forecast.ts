// @runtime-transpile
'use strict';

/**
 * Optional Open-Meteo PV forecast runtime.
 *
 * It only creates read-only forecast data. The existing AppCenter datapoint
 * forecast remains independent and is selected by the pv-forecast module when
 * Open-Meteo is disabled, unavailable or configured as fallback.
 */

declare const require: (id: string) => any;
const https = require('node:https');

export interface PvArrayConfig {
  name: string;
  kwp: number;
  tiltDeg: number;
  azimuthDeg: number;
  lossPercent: number;
  inverterLimitW: number;
}

export interface PvForecastSegment {
  t: number;
  dtMs: number;
  w: number;
}

export interface OpenMeteoPvSnapshot {
  ts: number;
  valid: boolean;
  source: 'open-meteo-gti';
  ageMs: number;
  points: number;
  positivePoints: number;
  requestCount: number;
  lastAttemptAt: number;
  lastSuccessAt: number;
  configuredKwp: number;
  planningSafetyPct: number;
  kwhNext6h: number;
  kwhNext12h: number;
  kwhNext24h: number;
  peakWNext24h: number;
  statusText: string;
  error: string;
  latitude: number;
  longitude: number;
  locationText: string;
  locationSource: string;
  curve: PvForecastSegment[];
}

export const PV_FORECAST_DIAGNOSTIC_STATES = [
  ['updatedAt', 'PV Forecast letzte erfolgreiche Aktualisierung', 'number', 'value.time'],
  ['lastAttemptAt', 'PV Forecast letzter Abrufversuch', 'number', 'value.time'],
  ['lastSuccessAt', 'PV Forecast letzter erfolgreicher Abruf', 'number', 'value.time'],
  ['positivePoints', 'PV Forecast Punkte mit Ertrag', 'number', 'value'],
  ['powerNowW', 'PV Forecast Leistung jetzt (W)', 'number', 'value.power'],
  ['locationText', 'PV Forecast Standort', 'string', 'text'],
  ['locationSource', 'PV Forecast Standortquelle', 'string', 'text'],
  ['latitude', 'PV Forecast Breitengrad', 'number', 'value.gps.latitude'],
  ['longitude', 'PV Forecast Längengrad', 'number', 'value.gps.longitude'],
  ['error', 'PV Forecast Fehler', 'string', 'text'],
] as const;

export interface PvForecastDiagnostics {
  updatedAt: number;
  lastAttemptAt: number;
  lastSuccessAt: number;
  positivePoints: number;
  powerNowW: number;
  locationText: string;
  locationSource: string;
  latitude: number;
  longitude: number;
  error: string;
}

export function buildPvForecastDiagnostics(input: {
  integrated?: Partial<OpenMeteoPvSnapshot> | null;
  useIntegrated?: boolean;
  now?: number;
  mappedAgeMs?: number | null;
  positivePoints?: number;
  powerNowW?: number;
  error?: string;
} = {}): PvForecastDiagnostics {
  const provider = input.integrated && typeof input.integrated === 'object' ? input.integrated : null;
  const useProvider = input.useIntegrated === true;
  const now = finite(input.now, Date.now());
  const mappedAgeMs = input.mappedAgeMs;
  const mappedUpdatedAt = mappedAgeMs === null || mappedAgeMs === undefined
    ? now : Math.max(0, now - Math.max(0, finite(mappedAgeMs, 0)));
  const providerUpdatedAt = provider ? finite(provider.lastSuccessAt ?? provider.ts, 0) : 0;
  const updatedAt = useProvider ? (providerUpdatedAt || now) : mappedUpdatedAt;
  return {
    updatedAt,
    lastAttemptAt: useProvider && provider ? finite(provider.lastAttemptAt ?? provider.ts, updatedAt) : updatedAt,
    lastSuccessAt: useProvider && provider ? finite(provider.lastSuccessAt ?? provider.ts, updatedAt) : updatedAt,
    positivePoints: Math.max(0, Math.round(finite(input.positivePoints, 0))),
    powerNowW: Math.max(0, finite(input.powerNowW, 0)),
    locationText: useProvider && provider ? text(provider.locationText, '') : '',
    locationSource: useProvider && provider ? text(provider.locationSource, '') : '',
    latitude: useProvider && provider ? finite(provider.latitude, 0) : 0,
    longitude: useProvider && provider ? finite(provider.longitude, 0) : 0,
    error: text(input.error ?? (useProvider && provider ? provider.error : ''), ''),
  };
}

export async function publishPvForecastDiagnostics(
  setter: (id: string, value: unknown) => Promise<unknown>,
  diagnostics: PvForecastDiagnostics,
): Promise<void> {
  for (const [key] of PV_FORECAST_DIAGNOSTIC_STATES) {
    const value = key === 'powerNowW' ? Math.round(diagnostics[key]) : diagnostics[key];
    await setter(`forecast.pv.${key}`, value);
  }
}

interface RuntimeSettings {
  enabled: boolean;
  sourceMode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  updateMinutes: number;
  horizonHours: number;
  planningSafetyPct: number;
  weatherUsageMode: string;
  weatherApiKey: string;
  arrays: PvArrayConfig[];
}

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  name: string;
  source: 'system-coordinates' | 'system-geocoding' | 'legacy-manual-fallback';
}

interface AdapterLike {
  namespace?: string;
  config?: Record<string, unknown>;
  stateCache?: Record<string, { value?: unknown }>;
  _openMeteoPvForecast?: OpenMeteoPvSnapshot;
  _nwOpenMeteoGeocodeCache?: { key: string; ts: number; value: ResolvedLocation };
  _nwShuttingDown?: boolean;
  log?: { debug?: (message: string) => void; warn?: (message: string) => void };
  getStateAsync?: (id: string) => Promise<{ val?: unknown } | null>;
  getForeignObjectAsync?: (id: string) => Promise<{ common?: Record<string, unknown> } | null>;
  setObjectNotExistsAsync?: (id: string, obj: unknown) => Promise<void>;
  setStateAsync?: (id: string, state: { val: unknown; ack: boolean }) => Promise<void>;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (timer: unknown) => void;
  _nwGetSystemGeo?: () => Promise<{ lat?: unknown; lon?: unknown; locName?: unknown } | null>;
  _nwHttpsGetJson?: (url: string, timeoutMs?: number) => Promise<any>;
}

const SLOT_MS = 15 * 60 * 1000;
const DEFAULT_ERROR = 'open-meteo-pv-not-started';

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback = min): number {
  return Math.min(max, Math.max(min, finite(value, fallback)));
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized)) return true;
  if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized)) return false;
  return fallback;
}

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

function parseJson(value: unknown, fallback: unknown): unknown {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value ?? '')); } catch { return fallback; }
}

async function readSetting(adapter: AdapterLike, key: string, fallback: unknown): Promise<unknown> {
  const cached = adapter.stateCache?.[`settings.${key}`];
  if (cached && cached.value !== undefined && cached.value !== null) return cached.value;
  try {
    const state = await adapter.getStateAsync?.(`settings.${key}`);
    if (state && state.val !== undefined && state.val !== null) return state.val;
  } catch { /* optional */ }
  const configured = adapter.config?.[key];
  return configured === undefined || configured === null ? fallback : configured;
}

export function normalizeOpenMeteoPvArrays(values: Record<string, unknown>): PvArrayConfig[] {
  const advanced = parseJson(values.pvForecastArrays, []);
  if (Array.isArray(advanced) && advanced.length > 0) {
    const rows = advanced
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => ({
        name: text(item.name, `PV-Fläche ${index + 1}`),
        kwp: clamp(item.kwp, 0, 100000, 0),
        tiltDeg: clamp(item.tiltDeg ?? item.tilt, 0, 90, 30),
        azimuthDeg: clamp(item.azimuthDeg ?? item.azimuth, -180, 180, 0),
        lossPercent: clamp(item.lossPercent ?? item.lossesPercent, 0, 60, 14),
        inverterLimitW: clamp(item.inverterLimitW, 0, 100000000, 0),
      }))
      .filter((item) => item.kwp > 0);
    if (rows.length > 0) return rows;
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

async function loadSettings(adapter: AdapterLike): Promise<RuntimeSettings> {
  const keys: Array<[string, unknown]> = [
    ['weatherEnabled', false], ['forecastSourceMode', 'auto'], ['openMeteoPvEnabled', false],
    ['openMeteoLatitude', 0], ['openMeteoLongitude', 0], ['openMeteoTimezone', 'auto'],
    ['forecastUpdateIntervalMin', 30], ['forecastHorizonHours', 48], ['pvForecastPlanningSafetyPct', 85],
    ['pvForecastInstalledKwp', 0], ['pvForecastTiltDeg', 30], ['pvForecastAzimuthDeg', 0],
    ['pvForecastLossPercent', 14], ['pvForecastInverterLimitW', 0], ['pvForecastArrays', '[]'],
    ['weatherUsageMode', 'private'], ['weatherApiKey', ''],
  ];
  const values: Record<string, unknown> = {};
  for (const [key, fallback] of keys) values[key] = await readSetting(adapter, key, fallback);
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

function coordinate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validCoordinatePair(latitude: number | null, longitude: number | null): latitude is number {
  return latitude !== null && longitude !== null
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180
    && !(Math.abs(latitude) < 1e-9 && Math.abs(longitude) < 1e-9);
}

function normalizeCountryCode(value: unknown): string {
  const raw = text(value, '').trim();
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();
  const normalized = raw.toLowerCase();
  const map: Record<string, string> = {
    deutschland: 'DE', germany: 'DE', de: 'DE',
    niederlande: 'NL', netherlands: 'NL', holland: 'NL', nl: 'NL',
    österreich: 'AT', oesterreich: 'AT', austria: 'AT', at: 'AT',
    schweiz: 'CH', switzerland: 'CH', suisse: 'CH', ch: 'CH',
    belgien: 'BE', belgium: 'BE', be: 'BE',
    luxemburg: 'LU', luxembourg: 'LU', lu: 'LU',
  };
  return map[normalized] || '';
}

function systemLocationHints(common: Record<string, unknown>): { city: string; postalCode: string; country: string; countryCode: string } {
  const address = common.address && typeof common.address === 'object' ? common.address as Record<string, unknown> : {};
  const city = text(common.city ?? common.town ?? common.location ?? address.city ?? address.town, '').trim();
  const postalCode = text(common.postalCode ?? common.postcode ?? common.zip ?? common.zipCode ?? address.postalCode ?? address.postcode ?? address.zip, '').trim();
  const country = text(common.country ?? address.country, '').trim();
  const countryCode = normalizeCountryCode(common.countryCode ?? address.countryCode ?? country);
  return { city, postalCode, country, countryCode };
}

async function geocodeSystemLocation(adapter: AdapterLike, settings: RuntimeSettings, common: Record<string, unknown>): Promise<ResolvedLocation | null> {
  const hints = systemLocationHints(common);
  const candidates = Array.from(new Set([hints.postalCode, hints.city].filter((value) => value.length >= 2)));
  if (!candidates.length) return null;
  if (settings.weatherUsageMode === 'commercial' && !settings.weatherApiKey) return null;

  const cacheKey = JSON.stringify({ candidates, countryCode: hints.countryCode, commercial: settings.weatherUsageMode === 'commercial' });
  const cached = adapter._nwOpenMeteoGeocodeCache;
  if (cached && cached.key === cacheKey && Date.now() - cached.ts < 24 * 3600000) return cached.value;

  const baseUrl = settings.weatherUsageMode === 'commercial'
    ? 'https://customer-geocoding-api.open-meteo.com/v1/search'
    : 'https://geocoding-api.open-meteo.com/v1/search';
  const apiKey = settings.weatherUsageMode === 'commercial' ? `&apikey=${encodeURIComponent(settings.weatherApiKey)}` : '';
  const countryFilter = hints.countryCode ? `&countryCode=${encodeURIComponent(hints.countryCode)}` : '';

  for (const candidate of candidates) {
    const url = `${baseUrl}?name=${encodeURIComponent(candidate)}&count=10&language=de&format=json${countryFilter}${apiKey}`;
    try {
      const data = await requestJson(adapter, url);
      const results = Array.isArray(data?.results) ? data.results : [];
      if (!results.length) continue;
      const preferred = hints.postalCode
        ? results.find((item: any) => Array.isArray(item?.postcodes) && item.postcodes.map(String).includes(hints.postalCode)) || results[0]
        : results[0];
      const latitude = coordinate(preferred?.latitude);
      const longitude = coordinate(preferred?.longitude);
      if (!validCoordinatePair(latitude, longitude)) continue;
      const name = [preferred?.name, preferred?.admin1, preferred?.country].map((item) => text(item, '').trim()).filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join(', ')
        || [hints.postalCode, hints.city, hints.country].filter(Boolean).join(' ');
      const value: ResolvedLocation = { latitude, longitude: longitude as number, name, source: 'system-geocoding' };
      adapter._nwOpenMeteoGeocodeCache = { key: cacheKey, ts: Date.now(), value };
      return value;
    } catch { /* try the next location hint */ }
  }
  return null;
}

async function resolveLocation(adapter: AdapterLike, settings: RuntimeSettings): Promise<ResolvedLocation | null> {
  // Zentrale Standortquelle ist immer der EOS Admin / system.config. Manuell
  // gespeicherte Altkoordinaten bleiben nur als rückwärtskompatibler Fallback.
  try {
    const geo = await adapter._nwGetSystemGeo?.();
    const latitude = coordinate(geo?.lat);
    const longitude = coordinate(geo?.lon);
    if (validCoordinatePair(latitude, longitude)) {
      return {
        latitude,
        longitude: longitude as number,
        name: text(geo?.locName, '').trim() || `${latitude.toFixed(5)}, ${(longitude as number).toFixed(5)}`,
        source: 'system-coordinates',
      };
    }
  } catch { /* optional */ }

  try {
    const system = await adapter.getForeignObjectAsync?.('system.config');
    const common = system?.common && typeof system.common === 'object' ? system.common as Record<string, unknown> : {};
    const latitude = coordinate(common.latitude);
    const longitude = coordinate(common.longitude);
    if (validCoordinatePair(latitude, longitude)) {
      const hints = systemLocationHints(common);
      return {
        latitude,
        longitude: longitude as number,
        name: [hints.postalCode, hints.city, hints.country].filter(Boolean).join(' ') || `${latitude.toFixed(5)}, ${(longitude as number).toFixed(5)}`,
        source: 'system-coordinates',
      };
    }
    const geocoded = await geocodeSystemLocation(adapter, settings, common);
    if (geocoded) return geocoded;
  } catch { /* optional */ }

  if (validCoordinatePair(settings.latitude, settings.longitude)) {
    return {
      latitude: settings.latitude,
      longitude: settings.longitude,
      name: `${settings.latitude.toFixed(5)}, ${settings.longitude.toFixed(5)}`,
      source: 'legacy-manual-fallback',
    };
  }
  return null;
}

async function requestJson(adapter: AdapterLike, url: string): Promise<any> {
  if (adapter._nwHttpsGetJson) return adapter._nwHttpsGetJson(url, 12000);
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'user-agent': 'NexoWatt-EOS-PV-Forecast/1.0' } }, (response: any) => {
      let body = '';
      response.on('data', (chunk: unknown) => { body += String(chunk); });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`HTTP ${response.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(12000, () => request.destroy(new Error('Open-Meteo timeout')));
    request.on('error', reject);
  });
}

export function openMeteoSolarPosition(timestampMs: number, latitude: number, longitude: number): { altitude: number; zenith: number; azimuth: number } {
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
  while (hourAngle > Math.PI) hourAngle -= 2 * Math.PI;
  while (hourAngle < -Math.PI) hourAngle += 2 * Math.PI;
  const latitudeRad = latitude * rad;
  const sinAltitude = Math.sin(latitudeRad) * Math.sin(declination)
    + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(clamp(sinAltitude, -1, 1, 0));
  const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * Math.cos(latitudeRad) - Math.sin(latitudeRad) * Math.cos(hourAngle));
  return { altitude, zenith: Math.PI / 2 - altitude, azimuth: (azimuth + 2 * Math.PI) % (2 * Math.PI) };
}

export function openMeteoPlaneOfArrayIrradiance(timestampMs: number, latitude: number, longitude: number, array: PvArrayConfig, ghi: number, dni: number, dhi: number): number {
  const rad = Math.PI / 180;
  const sun = openMeteoSolarPosition(timestampMs, latitude, longitude);
  if (sun.altitude <= 0) return 0;
  const tilt = array.tiltDeg * rad;
  const panelAzimuth = ((array.azimuthDeg + 180) % 360) * rad; // 0° UI = south
  const cosIncidence = Math.cos(sun.zenith) * Math.cos(tilt)
    + Math.sin(sun.zenith) * Math.sin(tilt) * Math.cos(sun.azimuth - panelAzimuth);
  return Math.max(0, dni) * Math.max(0, cosIncidence)
    + Math.max(0, dhi) * (1 + Math.cos(tilt)) / 2
    + Math.max(0, ghi) * 0.2 * (1 - Math.cos(tilt)) / 2;
}

function seriesValue(data: any, key: string, index: number): number {
  return Array.isArray(data?.hourly?.[key]) ? finite(data.hourly[key][index], 0) : 0;
}

function forecastTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  const raw = text(value, '').trim();
  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    return raw.length <= 10 ? numeric * 1000 : numeric;
  }
  return Date.parse(raw);
}

export function buildOpenMeteoPvCurve(data: any, settings: RuntimeSettings, location: { latitude: number; longitude: number }, nowMs: number): PvForecastSegment[] {
  const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
  const horizonEnd = nowMs + settings.horizonHours * 3600000;
  const curve: PvForecastSegment[] = [];
  for (let index = 0; index < times.length - 1; index += 1) {
    const startHour = forecastTimestamp(times[index]);
    const endHour = forecastTimestamp(times[index + 1]);
    if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || endHour <= startHour || startHour > horizonEnd) continue;
    for (let quarter = 0; quarter < 4; quarter += 1) {
      const timestamp = startHour + quarter * SLOT_MS;
      if (timestamp + SLOT_MS <= nowMs - SLOT_MS || timestamp > horizonEnd) continue;
      const fraction = quarter / 4;
      const interpolate = (key: string) => seriesValue(data, key, index)
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
        if (array.inverterLimitW > 0) powerW = Math.min(powerW, array.inverterLimitW);
        totalPowerW += Math.max(0, powerW);
      }
      curve.push({ t: timestamp, dtMs: SLOT_MS, w: Math.round(totalPowerW) });
    }
  }
  return curve.sort((a, b) => a.t - b.t).slice(0, 384);
}


interface TiltedForecastResponse {
  array: PvArrayConfig;
  data: any;
}

function tiltedForecastBlock(data: any): { time: unknown[]; irradiance: unknown[]; temperature: unknown[] } | null {
  const block = data?.minutely_15 && typeof data.minutely_15 === 'object'
    ? data.minutely_15
    : (data?.hourly && typeof data.hourly === 'object' ? data.hourly : null);
  if (!block) return null;
  const time = Array.isArray(block.time) ? block.time : [];
  const irradiance = Array.isArray(block.global_tilted_irradiance) ? block.global_tilted_irradiance : [];
  const temperature = Array.isArray(block.temperature_2m) ? block.temperature_2m : [];
  return time.length && irradiance.length ? { time, irradiance, temperature } : null;
}

/**
 * Builds the plant curve directly from Open-Meteo Global Tilted Irradiance.
 * Each PV surface is requested with its own tilt/azimuth and then summed. This
 * avoids local solar-position conversion errors and follows Open-Meteo's
 * documented 0° south / -90° east / +90° west convention exactly.
 */
export function buildOpenMeteoTiltedPvCurve(responses: TiltedForecastResponse[], settings: RuntimeSettings, nowMs: number): PvForecastSegment[] {
  const horizonEnd = nowMs + settings.horizonHours * 3600000;
  const powerByTimestamp = new Map<number, number>();
  const durationByTimestamp = new Map<number, number>();

  for (const response of responses) {
    const block = tiltedForecastBlock(response.data);
    if (!block) continue;
    const count = Math.min(block.time.length, block.irradiance.length);
    for (let index = 0; index < count; index += 1) {
      const timestamp = forecastTimestamp(block.time[index]);
      const nextTimestamp = index + 1 < count ? forecastTimestamp(block.time[index + 1]) : timestamp + SLOT_MS;
      if (!Number.isFinite(timestamp) || !Number.isFinite(nextTimestamp) || nextTimestamp <= timestamp) continue;
      if (nextTimestamp <= nowMs - SLOT_MS || timestamp > horizonEnd) continue;
      const gti = Math.max(0, finite(block.irradiance[index], 0));
      const ambient = finite(block.temperature[index], 20);
      const cellTemperature = ambient + 0.03 * gti;
      const temperatureFactor = clamp(1 - 0.004 * (cellTemperature - 25), 0.7, 1.1, 1);
      let powerW = response.array.kwp * 1000 * (gti / 1000)
        * (1 - response.array.lossPercent / 100) * temperatureFactor;
      if (response.array.inverterLimitW > 0) powerW = Math.min(powerW, response.array.inverterLimitW);
      powerByTimestamp.set(timestamp, (powerByTimestamp.get(timestamp) || 0) + Math.max(0, powerW));
      durationByTimestamp.set(timestamp, Math.min(60 * 60 * 1000, Math.max(5 * 60 * 1000, nextTimestamp - timestamp)));
    }
  }

  return [...powerByTimestamp.entries()]
    .map(([t, w]) => ({ t, dtMs: durationByTimestamp.get(t) || SLOT_MS, w: Math.round(w) }))
    .sort((a, b) => a.t - b.t)
    .slice(0, 384);
}

function integrateKwh(curve: PvForecastSegment[], nowMs: number, hours: number): number {
  const endMs = nowMs + hours * 3600000;
  return curve.reduce((sum, segment) => {
    const overlap = Math.max(0, Math.min(segment.t + segment.dtMs, endMs) - Math.max(segment.t, nowMs));
    return sum + segment.w * overlap / 3600000000;
  }, 0);
}

function invalidSnapshot(nowMs: number, error: string, settings?: RuntimeSettings, location?: ResolvedLocation | null): OpenMeteoPvSnapshot {
  return {
    ts: nowMs, valid: false, source: 'open-meteo-gti', ageMs: 0, points: 0, positivePoints: 0, requestCount: 0, lastAttemptAt: nowMs, lastSuccessAt: 0,
    configuredKwp: settings?.arrays.reduce((sum, item) => sum + item.kwp, 0) ?? 0,
    planningSafetyPct: settings?.planningSafetyPct ?? 85,
    kwhNext6h: 0, kwhNext12h: 0, kwhNext24h: 0, peakWNext24h: 0,
    statusText: error, error,
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    locationText: location?.name ?? '',
    locationSource: location?.source ?? 'none',
    curve: [],
  };
}

async function ensureState(adapter: AdapterLike, id: string, type: string, role: string, unit?: string): Promise<void> {
  try {
    await adapter.setObjectNotExistsAsync?.(id, { type: 'state', common: { name: id, type, role, read: true, write: false, unit }, native: {} });
  } catch { /* optional */ }
}

async function publish(adapter: AdapterLike, value: OpenMeteoPvSnapshot): Promise<void> {
  const definitions: Array<[string, string, string, string?]> = [
    ['valid', 'boolean', 'indicator'], ['source', 'string', 'text'], ['updatedAt', 'number', 'value.time'], ['ageMs', 'number', 'value.interval', 'ms'],
    ['points', 'number', 'value'], ['positivePoints', 'number', 'value'], ['requestCount', 'number', 'value'],
    ['lastAttemptAt', 'number', 'value.time'], ['lastSuccessAt', 'number', 'value.time'],
    ['kwhNext6h', 'number', 'value.energy', 'kWh'], ['kwhNext12h', 'number', 'value.energy', 'kWh'],
    ['kwhNext24h', 'number', 'value.energy', 'kWh'], ['peakWNext24h', 'number', 'value.power', 'W'],
    ['configuredKwp', 'number', 'value.power', 'kWp'], ['planningSafetyPct', 'number', 'value.percent', '%'],
    ['latitude', 'number', 'value.gps.latitude', '°'], ['longitude', 'number', 'value.gps.longitude', '°'],
    ['locationText', 'string', 'text'], ['locationSource', 'string', 'text'],
    ['statusText', 'string', 'text'], ['error', 'string', 'text'], ['curveJson', 'string', 'json'],
  ];
  for (const [key, type, role, unit] of definitions) await ensureState(adapter, `forecast.openMeteoPv.${key}`, type, role, unit);
  const states: Record<string, unknown> = {
    valid: value.valid, source: value.source, updatedAt: value.ts, ageMs: value.ageMs, points: value.points,
    positivePoints: value.positivePoints, requestCount: value.requestCount, lastAttemptAt: value.lastAttemptAt, lastSuccessAt: value.lastSuccessAt,
    kwhNext6h: Number(value.kwhNext6h.toFixed(3)), kwhNext12h: Number(value.kwhNext12h.toFixed(3)),
    kwhNext24h: Number(value.kwhNext24h.toFixed(3)), peakWNext24h: value.peakWNext24h,
    configuredKwp: value.configuredKwp, planningSafetyPct: value.planningSafetyPct,
    latitude: value.latitude, longitude: value.longitude, locationText: value.locationText, locationSource: value.locationSource,
    statusText: value.statusText, error: value.error, curveJson: JSON.stringify(value.curve.slice(0, 384)),
  };
  for (const [key, state] of Object.entries(states)) {
    try { await adapter.setStateAsync?.(`forecast.openMeteoPv.${key}`, { val: state, ack: true }); } catch { /* optional */ }
  }
}

async function refresh(adapter: AdapterLike): Promise<OpenMeteoPvSnapshot> {
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
  if (settings.weatherUsageMode === 'commercial' && !settings.weatherApiKey) {
    const value = invalidSnapshot(nowMs, 'Gewerbliche Open-Meteo-Nutzung benötigt einen API-Key', settings);
    adapter._openMeteoPvForecast = value;
    await publish(adapter, value);
    return value;
  }
  const location = await resolveLocation(adapter, settings);
  if (!location) {
    const value = invalidSnapshot(nowMs, 'Anlagenstandort im EOS Admin / in system.config nicht konfiguriert', settings);
    adapter._openMeteoPvForecast = value;
    await publish(adapter, value);
    return value;
  }

  const baseUrl = settings.weatherUsageMode === 'commercial'
    ? 'https://customer-api.open-meteo.com/v1/forecast'
    : 'https://api.open-meteo.com/v1/forecast';
  const apiKey = settings.weatherUsageMode === 'commercial'
    ? `&apikey=${encodeURIComponent(settings.weatherApiKey)}`
    : '';
  const forecastSlots = Math.min(384, Math.max(24, Math.ceil(settings.horizonHours * 4) + 4));
  const responses: TiltedForecastResponse[] = [];
  const requestErrors: string[] = [];

  try {
    // Open-Meteo calculates Global Tilted Irradiance directly for the supplied
    // surface orientation. Each PV surface is requested separately and summed
    // afterwards. This avoids timezone/solar-position conversion errors and
    // follows the provider's documented azimuth convention exactly.
    const settled = await Promise.allSettled(settings.arrays.map(async (array) => {
      const url = `${baseUrl}?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`
        + `&minutely_15=global_tilted_irradiance,temperature_2m&forecast_minutely_15=${forecastSlots}`
        + `&tilt=${encodeURIComponent(array.tiltDeg)}&azimuth=${encodeURIComponent(array.azimuthDeg)}`
        + `&timezone=GMT&timeformat=unixtime${apiKey}`;
      const data = await requestJson(adapter, url);
      if (!data || data.error) throw new Error(text(data?.reason, 'Open-Meteo API error'));
      if (!tiltedForecastBlock(data)) throw new Error(`Keine Global-Tilted-Irradiance für ${array.name}`);
      return { array, data } as TiltedForecastResponse;
    }));

    for (let index = 0; index < settled.length; index += 1) {
      const entry = settled[index];
      if (entry?.status === 'fulfilled') responses.push(entry.value);
      else requestErrors.push(`${settings.arrays[index]?.name || `PV-Fläche ${index + 1}`}: ${text(entry?.reason?.message, entry?.reason)}`);
    }

    let curve = buildOpenMeteoTiltedPvCurve(responses, settings, nowMs);

    // Compatibility fallback for providers/models that temporarily do not
    // return minutely_15 GTI. The older GHI/DNI/DHI conversion is retained as a
    // second attempt, not as the normal path.
    if (curve.length === 0) {
      const forecastDays = Math.min(5, Math.max(2, Math.ceil(settings.horizonHours / 24) + 1));
      const hourly = 'temperature_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,cloud_cover';
      const fallbackUrl = `${baseUrl}?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`
        + `&hourly=${hourly}&forecast_days=${forecastDays}&timezone=GMT&timeformat=unixtime${apiKey}`;
      const fallbackData = await requestJson(adapter, fallbackUrl);
      if (!fallbackData || fallbackData.error) throw new Error(text(fallbackData?.reason, 'Open-Meteo fallback API error'));
      curve = buildOpenMeteoPvCurve(fallbackData, settings, location, nowMs);
    }

    const positivePoints = curve.filter((segment) => segment.w > 0).length;
    if (curve.length === 0) throw new Error('Keine zukünftigen Einstrahlungswerte verfügbar');
    if (positivePoints === 0) throw new Error('Open-Meteo lieferte nur 0-Werte für den Planungshorizont');

    const value: OpenMeteoPvSnapshot = {
      ts: nowMs,
      valid: true,
      source: 'open-meteo-gti',
      ageMs: 0,
      points: curve.length,
      positivePoints,
      requestCount: responses.length,
      lastAttemptAt: nowMs,
      lastSuccessAt: nowMs,
      configuredKwp: settings.arrays.reduce((sum, item) => sum + item.kwp, 0),
      planningSafetyPct: settings.planningSafetyPct,
      kwhNext6h: integrateKwh(curve, nowMs, 6),
      kwhNext12h: integrateKwh(curve, nowMs, 12),
      kwhNext24h: integrateKwh(curve, nowMs, 24),
      peakWNext24h: curve
        .filter((segment) => segment.t < nowMs + 24 * 3600000)
        .reduce((max, segment) => Math.max(max, segment.w), 0),
      statusText: `Open-Meteo PV-Prognose aktiv (${curve.length} Punkte, ${positivePoints} mit Ertrag)`,
      error: requestErrors.length ? `Teilweise Forecast-Fehler: ${requestErrors.join(' | ')}` : '',
      latitude: location.latitude,
      longitude: location.longitude,
      locationText: location.name,
      locationSource: location.source,
      curve,
    };
    adapter._openMeteoPvForecast = value;
    await publish(adapter, value);
    return value;
  } catch (error) {
    const previous = adapter._openMeteoPvForecast;
    const message = text((error as Error)?.message, String(error));
    if (previous?.valid && previous.ts > 0) {
      const stale: OpenMeteoPvSnapshot = {
        ...previous,
        ageMs: Math.max(0, nowMs - previous.ts),
        requestCount: responses.length,
        lastAttemptAt: nowMs,
        lastSuccessAt: previous.lastSuccessAt || previous.ts,
        statusText: `Letzte Prognose wird weiterverwendet: ${message}`,
        error: message,
      };
      adapter._openMeteoPvForecast = stale;
      await publish(adapter, stale);
      return stale;
    }
    const value = {
      ...invalidSnapshot(nowMs, message, settings, location),
      requestCount: responses.length,
      lastAttemptAt: nowMs,
    };
    adapter._openMeteoPvForecast = value;
    await publish(adapter, value);
    return value;
  }
}

export function startOpenMeteoPvForecastRuntime(adapter: AdapterLike): { refresh: () => Promise<OpenMeteoPvSnapshot>; stop: () => void } {
  let stopped = false;
  let timer: unknown = null;
  let running: Promise<OpenMeteoPvSnapshot> | null = null;
  const clear = () => {
    if (!timer) return;
    try { adapter.clearTimeout ? adapter.clearTimeout(timer) : clearTimeout(timer as ReturnType<typeof setTimeout>); } catch { /* optional */ }
    timer = null;
  };
  const cycle = async (): Promise<OpenMeteoPvSnapshot> => {
    if (stopped || adapter._nwShuttingDown) return adapter._openMeteoPvForecast ?? invalidSnapshot(Date.now(), DEFAULT_ERROR);
    if (running) return running;
    clear();
    running = refresh(adapter).finally(async () => {
      running = null;
      if (!stopped && !adapter._nwShuttingDown) {
        const settings = await loadSettings(adapter).catch(() => ({ updateMinutes: 30 } as RuntimeSettings));
        const delay = clamp(settings.updateMinutes, 5, 180, 30) * 60000;
        const callback = () => { cycle().catch(() => {}); };
        timer = adapter.setTimeout ? adapter.setTimeout(callback, delay) : setTimeout(callback, delay);
      }
    });
    return running;
  };
  cycle().catch((error) => adapter.log?.debug?.(`[forecast] ${text((error as Error)?.message, error)}`));
  return { refresh: cycle, stop: () => { stopped = true; clear(); } };
}
