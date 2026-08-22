// @runtime-transpile
'use strict';

/**
 * Read-only NexoWatt EMS overview contract for EOS Admin.
 *
 * This service collects already published diagnostics from Charging Management,
 * central budgets, storage, §14a, tariff and forecast modules. It never writes
 * an actuator state and never participates in arbitration. EOS Admin consumes
 * the compact JSON contract instead of polling hundreds of technical states.
 */
declare const module: { exports: unknown };

type AnyRecord = Record<string, any>;

type Severity = 'ok' | 'info' | 'warning' | 'error';

interface OverviewEvent {
  id: string;
  ts: number;
  severity: Severity;
  subsystem: string;
  title: string;
  message: string;
  reason?: string | undefined;
  actualW?: number | undefined;
  targetW?: number | undefined;
}

interface OverviewContract {
  schemaVersion: number;
  generatedAt: number;
  updatedAt: number;
  adapterVersion: string;
  available: boolean;
  status: Severity;
  headline: string;
  reason: string;
  binding: string;
  details: { port: number; path: string };
  ems: AnyRecord;
  budget: AnyRecord;
  charging: AnyRecord;
  storage: AnyRecord;
  para14a: AnyRecord;
  peakShaving: AnyRecord;
  tariff: AnyRecord;
  forecast: AnyRecord;
  modules: AnyRecord;
  currentDecisions: AnyRecord[];
}

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bool(value: unknown, fallback = false): boolean {
  if (value === true || value === false) return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'on', 'yes', 'ja', 'an', 'active', 'aktiv', 'enabled', 'online'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no', 'nein', 'aus', 'inactive', 'inaktiv', 'disabled', 'offline'].includes(normalized)) return false;
  return fallback;
}

function text(value: unknown, fallback = '', maxLength = 320): string {
  const normalized = String(value ?? fallback).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function parseJson(value: unknown, fallback: any): any {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value ?? '')); } catch (_error) { return fallback; }
}

function stateValue(adapter: AnyRecord, key: string, fallback: unknown = null): unknown {
  try {
    const entry = adapter && adapter.stateCache && adapter.stateCache[key];
    if (entry && Object.prototype.hasOwnProperty.call(entry, 'value')) return entry.value;
  } catch (_error) {}
  return fallback;
}

function firstValue(adapter: AnyRecord, keys: string[], fallback: unknown = null): unknown {
  for (const key of keys) {
    const value = stateValue(adapter, key, undefined);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function severityRank(value: Severity): number {
  return value === 'error' ? 3 : value === 'warning' ? 2 : value === 'info' ? 1 : 0;
}

function maxSeverity(...values: Severity[]): Severity {
  return values.reduce((current, value) => severityRank(value) > severityRank(current) ? value : current, 'ok' as Severity);
}

function normalizeLimiter(value: unknown): string {
  const raw = text(value, 'none', 80).toLowerCase();
  if (!raw || raw === 'none' || raw === 'normal' || raw === 'unlimited') return 'none';
  return raw;
}

function humanizeLimiter(value: unknown): string {
  const limiter = normalizeLimiter(value);
  const map: Record<string, string> = {
    'none': 'Keine Begrenzung',
    'eos-safety-stop': 'EOS Safety',
    'stale-meter-failsafe': 'Messwert-Failsafe',
    'peak-shaving': 'Peak-Shaving',
    'para14a': '§14a',
    'grid-and-phase': 'Netz- und Phasenlimit',
    'grid-import': 'Netzanschlusslimit',
    'phase': 'Phasenlimit',
    'station': 'Stationslimit',
    'device': 'Gerätelimit',
    'budget': 'EMS-Budget',
    'pv-surplus': 'PV-Überschuss',
    'no-charge-demand': 'Kein Fahrzeug-Ladebedarf',
    'no-vehicle': 'Kein Fahrzeug verbunden',
    'no-setpoint': 'Keine sichere Sollwertfreigabe',
    'write-error': 'Schreibfehler',
    'fault': 'Gerätestörung',
    'offline': 'Ladepunkt offline',
    'unavailable': 'Ladepunkt nicht verfügbar',
  };
  return map[limiter] || text(value, 'Unbekannte Begrenzung', 100);
}

function statusFromAudit(audit: AnyRecord, paraFallback: boolean, storageWriteOk: boolean | null, forecastFresh: boolean | null): Severity {
  const safetyStage = text(audit && audit.safetyStage, '').toUpperCase();
  const limiter = normalizeLimiter(audit && audit.activeLimiter);
  const wallboxes = Array.isArray(audit && audit.wallboxes) ? audit.wallboxes : [];
  if (safetyStage === 'EOS-SAFETY-STOP'
    || limiter === 'eos-safety-stop'
    || wallboxes.some((row: AnyRecord) => ['fault', 'write-error', 'stale-meter-failsafe'].includes(normalizeLimiter(row && row.limiter)))) return 'error';
  if (limiter !== 'none' || paraFallback || storageWriteOk === false || forecastFresh === false) return 'warning';
  return 'ok';
}

function compactWallbox(row: AnyRecord): AnyRecord {
  return {
    id: text(row && (row.safe || row.id), '', 80),
    name: text(row && (row.name || row.safe || row.id), 'Ladepunkt', 100),
    mode: text(row && (row.userMode || row.mode), '', 40),
    online: row && row.online === true,
    connected: row && row.connected === true,
    charging: row && row.charging === true,
    actualW: Math.max(0, Math.round(finite(row && row.actualPowerW, 0))),
    targetW: Math.max(0, Math.round(finite(row && row.targetPowerW, 0))),
    requestedW: Math.max(0, Math.round(finite(row && row.requestedPowerW, 0))),
    limiter: normalizeLimiter(row && row.limiter),
    limiterText: humanizeLimiter(row && row.limiter),
    reason: text(row && (row.safetyReason || row.reason || row.vehicleDemandReason), '', 180),
    applyStatus: text(row && row.applyStatus, '', 80),
  };
}

function buildOverviewContract(adapter: AnyRecord, now = Date.now()): OverviewContract {
  const audit = parseJson(stateValue(adapter, 'chargingManagement.audit.snapshotJson', '{}'), {});
  const auditWallboxes = Array.isArray(audit && audit.wallboxes) ? audit.wallboxes.map(compactWallbox) : [];
  const configuredWallboxCount = Math.max(0, Math.round(finite(firstValue(adapter, ['chargingManagement.wallboxCount'], auditWallboxes.length), auditWallboxes.length)));
  const chargingActualW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'chargingManagement.summary.totalPowerW',
    'chargingManagement.control.actualW',
  ], audit && audit.actualPowerW), finite(audit && audit.actualPowerW, 0))));
  const chargingTargetW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'chargingManagement.summary.totalTargetPowerW',
    'chargingManagement.control.targetSumW',
  ], audit && audit.targetPowerW), finite(audit && audit.targetPowerW, 0))));
  const chargingReservedW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'chargingManagement.summary.totalReservedPowerW',
    'chargingManagement.control.usedW',
  ], audit && audit.reservedPowerW), finite(audit && audit.reservedPowerW, 0))));
  const chargingActiveCount = auditWallboxes.filter((row: AnyRecord) => row.charging || row.actualW >= 100).length;
  const chargingFaultCount = auditWallboxes.filter((row: AnyRecord) => ['fault', 'write-error', 'stale-meter-failsafe', 'offline', 'unavailable'].includes(row.limiter)).length;
  const chargingWaitingCount = auditWallboxes.filter((row: AnyRecord) => row.connected && !row.charging && !['fault', 'write-error', 'offline', 'unavailable'].includes(row.limiter)).length;

  const budgetTotalW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'ems.budget.totalBudgetW',
    'chargingManagement.control.budgetW',
    'chargingManagement.control.infrastructureHardCapW',
    'chargingManagement.control.infrastructureCapacityW',
  ], audit && audit.budgetW), finite(audit && audit.budgetW, 0))));
  const budgetRemainingW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'ems.budget.remainingTotalW',
    'chargingManagement.control.remainingW',
  ], audit && audit.remainingPowerW), finite(audit && audit.remainingPowerW, 0))));
  const budgetUsedW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'ems.budget.flexUsedW',
    'chargingManagement.control.usedW',
  ], chargingReservedW), chargingReservedW)));
  const pvBudgetW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'ems.budget.pvBudgetW',
    'chargingManagement.control.pvCapEffectiveW',
  ], 0), 0)));
  const remainingPvW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'ems.budget.remainingPvW',
    'chargingManagement.control.pvCentralRemainingAfterEvcsW',
  ], 0), 0)));

  const centralBudgetBinding = normalizeLimiter(firstValue(adapter, [
    'ems.budget.binding',
    'chargingManagement.audit.activeLimiter',
  ], audit && audit.activeLimiter));
  const centralBudgetMode = text(stateValue(adapter, 'ems.budget.mode', ''), '', 80);
  const centralBudgetSource = text(stateValue(adapter, 'ems.budget.source', ''), '', 100);
  const centralBudgetActive = bool(stateValue(adapter, 'ems.budget.active', budgetTotalW > 0), budgetTotalW > 0);
  const centralBudgetUpdatedAt = Math.max(0, Math.round(finite(stateValue(adapter, 'ems.budget.lastUpdate', 0), 0)));
  const gridPowerW = nullableNumber(stateValue(adapter, 'ems.budget.gridW', null));
  const gridImportW = nullableNumber(stateValue(adapter, 'ems.budget.gridImportW', null));
  const gridExportW = nullableNumber(stateValue(adapter, 'ems.budget.gridExportW', null));
  const pvPowerW = nullableNumber(stateValue(adapter, 'ems.budget.pvPowerW', null));
  const safetyValid = bool(stateValue(adapter, 'ems.safety.valid', true), true);
  const safetyEmergencyStop = bool(stateValue(adapter, 'ems.safety.emergencyStop', false), false);
  const safetyReason = text(stateValue(adapter, 'ems.safety.reason', ''), '', 220);
  const safetyGridHeadroomW = nullableNumber(stateValue(adapter, 'ems.safety.gridHeadroomW', null));
  const safetyEvcsCapW = nullableNumber(stateValue(adapter, 'ems.safety.evcsCapW', null));

  const paraFallback = bool(stateValue(adapter, 'para14a.communicationFallbackActive', false), false);
  const paraFallbackCapW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'para14a.fallbackEvcsCapW',
    'para14a.evcsTotalCapW',
    'chargingManagement.control.para14aCapEvcsW',
  ], 0), 0)));
  const paraBinding = bool(firstValue(adapter, [
    'chargingManagement.control.para14aBinding',
    'para14a.binding',
  ], false), false);
  const paraActive = bool(firstValue(adapter, [
    'chargingManagement.control.para14aActive',
    'para14a.active',
  ], false), false);

  const storageTopology = text(stateValue(adapter, 'speicher.regelung.topologie', 'none'), 'none', 40).toLowerCase();
  const storageAvailable = storageTopology !== 'none'
    || bool(stateValue(adapter, 'speicher.regelung.aktivKonfig', false), false)
    || nullableNumber(stateValue(adapter, 'storageSoc', null)) !== null;
  const storageTargetW = Math.round(finite(firstValue(adapter, [
    'speicher.regelung.acceptedSollW',
    'speicher.regelung.sollW',
    'speicher.regelung.requestW',
  ], 0), 0));
  const storageActualW = Math.round(finite(firstValue(adapter, [
    'speicher.regelung.batteryPowerFeedbackMeasuredW',
    'speicher.regelung.batteryPowerFeedbackBasisW',
    'storagePower',
  ], 0), 0));
  const storageSocPct = nullableNumber(firstValue(adapter, [
    'speicher.regelung.socPct',
    'storageSoc',
  ], null));
  const storageWriteStatus = text(stateValue(adapter, 'speicher.regelung.schreibStatus', ''), '', 100);
  const storageWriteToken = storageWriteStatus.toLowerCase();
  const storageWriteOk = storageWriteToken
    ? (/(failed|error|fehler|rejected|unreachable)/.test(storageWriteToken)
      ? false
      : (/(ok|applied|written|success|unchanged|held)/.test(storageWriteToken) ? true : null))
    : null;
  const storageReason = text(firstValue(adapter, [
    'speicher.regelung.safetyReason',
    'speicher.regelung.grund',
    'speicher.regelung.requestGrund',
    'speicher.regelung.topologieGrund',
  ], ''), '', 220);

  const tariffActive = bool(stateValue(adapter, 'tarif.aktiv', false), false);
  const tariffState = text(stateValue(adapter, 'tarif.state', tariffActive ? 'unknown' : 'off'), tariffActive ? 'unknown' : 'off', 40);
  const tariffFresh = bool(stateValue(adapter, 'tarif.currentPriceFresh', !tariffActive), !tariffActive);
  const tariffPrice = nullableNumber(firstValue(adapter, [
    'tarif.preisAktuellEurProKwh',
    'tariffProvider.currentPriceEurPerKwh',
  ], null));

  const forecastSource = text(firstValue(adapter, [
    'forecast.effective.source',
    'forecast.pv.source',
  ], 'none'), 'none', 80);
  const forecastFreshRaw = firstValue(adapter, ['forecast.effective.fresh', 'forecast.pv.valid'], null);
  const forecastFresh = forecastFreshRaw === null ? null : bool(forecastFreshRaw, false);
  const forecastPowerNowW = Math.max(0, Math.round(finite(firstValue(adapter, [
    'forecast.effective.powerNowW',
    'forecast.pv.powerNowW',
  ], 0), 0)));

  const forecastUpdatedAt = Math.max(0, Math.round(finite(firstValue(adapter, [
    'forecast.effective.updatedAt',
    'forecast.pv.updatedAt',
  ], 0), 0)));
  const forecastError = text(stateValue(adapter, 'forecast.effective.error', ''), '', 180);

  const peakStatus = text(stateValue(adapter, 'peakShaving.control.status', 'off'), 'off', 80);
  const peakActive = !['', 'off', 'inactive', 'disabled', 'idle', 'none'].includes(peakStatus.toLowerCase());

  const controlStatus = text(firstValue(adapter, ['chargingManagement.control.status'], audit && audit.status), '', 160);
  const controlMode = text(firstValue(adapter, ['chargingManagement.control.mode'], audit && audit.mode), '', 60);
  const lastTickTs = Math.max(0, Math.round(finite(firstValue(adapter, [
    'ems.core.lastTickStart',
    'chargingManagement.summary.lastUpdate',
    'ems.budget.lastUpdate',
  ], audit && audit.ts), finite(audit && audit.ts, 0))));
  const lastTickDurationMs = Math.max(0, Math.round(finite(stateValue(adapter, 'ems.core.lastTickDurationMs', 0), 0)));
  const lastTickError = text(stateValue(adapter, 'ems.core.lastTickError', ''), '', 220);
  const lastTickAgeMs = lastTickTs > 0 ? Math.max(0, now - lastTickTs) : null;
  const tickKnown = lastTickAgeMs !== null;
  // Some installations do not enable every EMS module. Missing tick telemetry is
  // therefore an informational startup/idle state, not an adapter failure.
  const emsOnline = !tickKnown || (lastTickAgeMs !== null && lastTickAgeMs <= 20_000);

  const auditLimiter = normalizeLimiter(firstValue(adapter, [
    'chargingManagement.audit.activeLimiter',
  ], audit && audit.activeLimiter));
  const safetyStage = text(firstValue(adapter, [
    'chargingManagement.audit.safetyStage',
  ], audit && audit.safetyStage), 'NORMAL', 80);
  const safetyActive = safetyStage.toUpperCase() !== 'NORMAL'
    || bool(firstValue(adapter, ['chargingManagement.audit.safetyActive'], audit && audit.safetyActive), false);
  const safetyStop = safetyStage.toUpperCase() === 'EOS-SAFETY-STOP';
  const status = maxSeverity(
    statusFromAudit({ ...audit, activeLimiter: auditLimiter, safetyStage }, paraFallback, storageWriteOk, forecastFresh),
    (!safetyValid || safetyEmergencyStop || safetyStop || lastTickError || !emsOnline)
      ? 'error'
      : (safetyActive ? 'warning' : (!tickKnown ? 'info' : 'ok')),
    chargingFaultCount > 0 ? 'error' : 'ok',
  );

  let binding = centralBudgetBinding !== 'none' ? centralBudgetBinding : auditLimiter;
  if (binding === 'none' && paraFallback) binding = 'para14a';
  if (binding === 'none' && peakActive) binding = 'peak-shaving';
  if (binding === 'none' && storageWriteOk === false) binding = 'storage-write';

  let headline = 'EMS arbeitet normal';
  if (!tickKnown) headline = 'EMS-Diagnose bereit – noch kein aktiver Regeltick';
  else if (!emsOnline) headline = 'NexoWatt EMS ist nicht aktuell';
  else if (status === 'error') headline = (!safetyValid || safetyEmergencyStop || safetyStop) ? 'EOS Safety aktiv – Regelung sicher eingeschränkt' : 'EMS-Störung erkannt';
  else if (paraFallback) headline = '§14a-Kommunikationsfallback aktiv';
  else if (auditLimiter !== 'none') headline = `${humanizeLimiter(auditLimiter)} begrenzt aktuell die Regelung`;
  else if (chargingActiveCount > 0) headline = `${chargingActiveCount} Ladepunkt${chargingActiveCount === 1 ? '' : 'e'} aktiv`;
  else if (chargingWaitingCount > 0) headline = `${chargingWaitingCount} Fahrzeug${chargingWaitingCount === 1 ? '' : 'e'} wartet${chargingWaitingCount === 1 ? '' : 'en'} auf Freigabe`;
  else if (storageAvailable && Math.abs(storageTargetW) > 50) headline = storageTargetW < 0 ? 'Speicherladung aktiv' : 'Speicherentladung aktiv';

  const adapterVersion = text(adapter && adapter.version, text(adapter && adapter.packageVersion, '', 32), 32)
    || text(adapter && adapter.ioPack && adapter.ioPack.common && adapter.ioPack.common.version, '', 32);
  const port = Math.max(1, Math.round(finite(adapter && adapter.config && adapter.config.port, 8188)));

  return {
    schemaVersion: 1,
    generatedAt: now,
    updatedAt: now,
    adapterVersion,
    available: true,
    status,
    headline,
    reason: text(
      tickKnown && !emsOnline
        ? 'Der letzte EMS-Regelzyklus ist älter als 20 Sekunden oder die Adapterinstanz ist offline.'
        : (!tickKnown
          ? 'Noch kein Regeltick veröffentlicht; optionale EMS-Module dürfen deaktiviert sein.'
          : (status === 'error'
            ? (safetyReason || lastTickError || (audit && (audit.safetyReason || audit.status)))
            : (binding !== 'none' ? humanizeLimiter(binding) : (audit && (audit.status || audit.mode))))),
      status === 'ok' ? 'EMS arbeitet innerhalb aller aktiven Grenzen.' : humanizeLimiter(binding),
      260,
    ),
    binding,
    details: { port, path: '/ems-apps.html?tab=status' },
    ems: {
      active: emsOnline && bool(firstValue(adapter, ['chargingManagement.control.active', 'ems.budget.active'], true), true),
      online: emsOnline,
      mode: controlMode || centralBudgetMode,
      status: controlStatus,
      lastTickTs,
      lastTickAgeMs,
      cycleMs: lastTickDurationMs,
      lastError: lastTickError,
      safetyStage,
      safetyValid,
      safetyEmergencyStop,
      safetyActive,
      safetyReason,
      problemCount: Math.max(0, Math.round(finite(firstValue(adapter, ['chargingManagement.audit.problemCount'], audit && audit.problemCount), 0))),
      decision: headline,
    },
    budget: {
      available: centralBudgetActive || budgetTotalW > 0 || budgetRemainingW > 0,
      active: centralBudgetActive,
      mode: centralBudgetMode,
      source: centralBudgetSource,
      updatedAt: centralBudgetUpdatedAt,
      totalW: budgetTotalW,
      usedW: budgetUsedW,
      remainingW: budgetRemainingW,
      pvBudgetW,
      remainingPvW,
      gridW: gridPowerW,
      gridImportW,
      gridExportW,
      pvPowerW,
      gridHeadroomW: safetyGridHeadroomW,
      evcsSafetyCapW: safetyEvcsCapW,
      binding,
      bindingText: binding === 'storage-write' ? 'Speicher-Schreibstatus' : humanizeLimiter(binding),
      gridBinding: bool(firstValue(adapter, ['chargingManagement.control.gridCapBinding'], audit && audit.grid && audit.grid.binding), false),
      phaseBinding: bool(firstValue(adapter, ['chargingManagement.control.phaseCapBinding'], audit && audit.phase && audit.phase.binding), false),
      para14aBinding: paraBinding,
    },
    charging: {
      available: configuredWallboxCount > 0 || auditWallboxes.length > 0,
      configuredCount: Math.max(configuredWallboxCount, auditWallboxes.length),
      activeCount: chargingActiveCount,
      waitingCount: chargingWaitingCount,
      faultCount: chargingFaultCount,
      actualW: chargingActualW,
      targetW: chargingTargetW,
      reservedW: chargingReservedW,
      limiter: auditLimiter,
      limiterText: humanizeLimiter(auditLimiter),
      status: controlStatus,
      wallboxes: auditWallboxes.slice(0, 12),
    },
    storage: {
      available: storageAvailable,
      active: bool(stateValue(adapter, 'speicher.regelung.aktiv', false), false),
      topology: storageTopology,
      socPct: storageSocPct,
      actualW: storageActualW,
      targetW: storageTargetW,
      writeOk: storageWriteOk,
      writeStatus: storageWriteStatus,
      reason: storageReason,
    },
    para14a: {
      available: paraActive || paraFallback || paraBinding,
      active: paraActive,
      binding: paraBinding,
      communicationFallbackActive: paraFallback,
      fallbackCapW: paraFallbackCapW,
      fallbackReason: text(stateValue(adapter, 'para14a.communicationFallbackReason', ''), '', 180),
      signalFresh: bool(stateValue(adapter, 'para14a.signalFresh', false), false),
      signalStatus: text(stateValue(adapter, 'para14a.signalStatus', ''), '', 80),
    },
    peakShaving: {
      available: peakStatus !== 'off' && peakStatus !== '',
      active: peakActive,
      status: peakStatus,
    },
    tariff: {
      available: tariffActive,
      active: tariffActive,
      state: tariffState,
      fresh: tariffFresh,
      priceEurPerKwh: tariffPrice,
      netFeeMode: text(stateValue(adapter, 'tarif.netFeeMode', ''), '', 40),
      statusText: text(stateValue(adapter, 'tarif.statusText', ''), '', 180),
    },
    forecast: {
      available: forecastSource !== 'none' || forecastFresh === true,
      source: forecastSource,
      fresh: forecastFresh,
      updatedAt: forecastUpdatedAt,
      powerNowW: forecastPowerNowW,
      energy6hWh: Math.max(0, Math.round(finite(stateValue(adapter, 'forecast.effective.energy6hWh', 0), 0))),
      energy12hWh: Math.max(0, Math.round(finite(stateValue(adapter, 'forecast.effective.energy12hWh', 0), 0))),
      energy24hWh: Math.max(0, Math.round(finite(stateValue(adapter, 'forecast.effective.energy24hWh', 0), 0))),
      error: forecastError,
    },
    modules: {
      charging: configuredWallboxCount > 0 || auditWallboxes.length > 0,
      storage: storageAvailable,
      para14a: paraActive || paraFallback || paraBinding,
      peakShaving: peakStatus !== 'off' && peakStatus !== '',
      tariff: tariffActive,
      forecast: forecastSource !== 'none' || forecastFresh === true,
    },
    currentDecisions: [
      {
        subsystem: 'charging',
        severity: chargingFaultCount > 0 ? 'error' : (chargingWaitingCount > 0 ? 'info' : 'ok'),
        title: configuredWallboxCount || auditWallboxes.length
          ? `${chargingActiveCount} lädt · ${chargingWaitingCount} wartet · ${chargingFaultCount} gestört`
          : 'Keine aktiven Ladepunkte',
        reason: text((audit && (audit.safetyReason || audit.status)) || humanizeLimiter(auditLimiter), '', 180),
        details: `Ist ${chargingActualW} W · Soll ${chargingTargetW} W · reserviert ${chargingReservedW} W`,
      },
      ...(storageAvailable ? [{
        subsystem: 'storage',
        severity: storageWriteOk === false ? 'error' : 'ok',
        title: `Speicher ${storageTopology}${storageSocPct !== null ? ` · SoC ${Math.round(storageSocPct)} %` : ''}`,
        reason: storageReason,
        details: `Ist ${storageActualW} W · Soll ${storageTargetW} W${storageWriteStatus ? ` · ${storageWriteStatus}` : ''}`,
      }] : []),
      ...(centralBudgetActive || budgetTotalW > 0 ? [{
        subsystem: 'budget',
        severity: binding !== 'none' ? 'warning' : 'ok',
        title: `Restbudget ${budgetRemainingW} W`,
        reason: binding !== 'none' ? humanizeLimiter(binding) : (centralBudgetMode || 'Zentrale Budgetkoordination'),
        details: `Gesamt ${budgetTotalW} W · genutzt ${budgetUsedW} W · PV-Rest ${remainingPvW} W`,
      }] : []),
    ].slice(0, 6),
  };
}

function eventSignature(contract: OverviewContract): string {
  return JSON.stringify({
    status: contract.status,
    headline: contract.headline,
    binding: contract.binding,
    budget: [contract.budget.totalW, contract.budget.remainingW, contract.budget.remainingPvW],
    charging: [contract.charging.activeCount, contract.charging.waitingCount, contract.charging.faultCount, contract.charging.actualW, contract.charging.targetW, contract.charging.limiter],
    storage: [contract.storage.available, contract.storage.topology, contract.storage.actualW, contract.storage.targetW, contract.storage.writeOk, contract.storage.reason],
    para14a: [contract.para14a.active, contract.para14a.binding, contract.para14a.communicationFallbackActive, contract.para14a.fallbackCapW],
    tariff: [contract.tariff.active, contract.tariff.state, contract.tariff.fresh],
    forecast: [contract.forecast.available, contract.forecast.source, contract.forecast.fresh],
  });
}

function overviewEvent(contract: OverviewContract, now: number): OverviewEvent {
  const messageParts: string[] = [];
  if (contract.charging.available) messageParts.push(`EVCS Ist ${contract.charging.actualW} W / Soll ${contract.charging.targetW} W`);
  if (contract.storage.available) messageParts.push(`Speicher Ist ${contract.storage.actualW} W / Soll ${contract.storage.targetW} W`);
  if (contract.budget.totalW > 0) messageParts.push(`Restbudget ${contract.budget.remainingW} W`);
  return {
    id: `overview-${now}`,
    ts: now,
    severity: contract.status,
    subsystem: contract.binding !== 'none' ? contract.binding : 'ems',
    title: contract.headline,
    message: messageParts.join(' · ') || contract.ems.status || 'EMS-Zustand aktualisiert',
    reason: contract.budget.bindingText,
    actualW: contract.charging.actualW,
    targetW: contract.charging.targetW,
  };
}

function normalizeAuditEvent(event: AnyRecord): OverviewEvent | null {
  if (!event || typeof event !== 'object') return null;
  const ts = Math.max(0, Math.round(finite(event.ts, 0)));
  if (!ts) return null;
  const severityRaw = text(event.severity, 'info', 20).toLowerCase();
  const severity: Severity = ['error', 'warning', 'warn', 'info', 'ok'].includes(severityRaw)
    ? (severityRaw === 'warn' ? 'warning' : severityRaw as Severity)
    : 'info';
  return {
    id: `audit-${ts}-${text(event.safe || event.type, 'global', 40)}-${text(event.limiter, 'none', 40)}`,
    ts,
    severity,
    subsystem: text(event.type, 'charging', 40),
    title: text(event.name, 'Lademanagement', 100),
    message: text(event.message || event.reason, '', 280),
    reason: text(event.reason || event.limiter, '', 160),
    actualW: nullableNumber(event.actualPowerW) ?? undefined,
    targetW: nullableNumber(event.targetPowerW) ?? undefined,
  };
}

class AdminOverviewPublisher {
  private readonly adapter: AnyRecord;
  private timer: any = null;
  private running = false;
  private stopped = false;
  private lastSignature = '';
  private lastValues = new Map<string, string>();
  private events: OverviewEvent[] = [];
  private readonly maxEvents = 60;

  constructor(adapter: AnyRecord) {
    this.adapter = adapter;
  }

  async initialize(): Promise<void> {
    await this.ensureStates();
    await this.restoreEvents();
    for (const pattern of [
      'chargingManagement.audit.*',
      'chargingManagement.control.*',
      'chargingManagement.summary.*',
      'ems.budget.*',
      'speicher.regelung.*',
      'para14a.*',
      'peakShaving.control.*',
      'tarif.*',
      'forecast.*',
    ]) {
      try { await this.adapter.subscribeForeignStatesAsync(`${this.adapter.namespace}.${pattern}`); } catch (_error) {}
    }
    await this.primeStates();
    await this.tick('startup');
    const callback = () => { this.tick('timer').catch(() => {}); };
    this.timer = typeof this.adapter._nwSetInterval === 'function'
      ? this.adapter._nwSetInterval(callback, 5000)
      : (typeof this.adapter.setInterval === 'function' ? this.adapter.setInterval(callback, 5000) : setInterval(callback, 5000));
  }

  stop(): void {
    this.stopped = true;
    if (!this.timer) return;
    try {
      if (typeof this.adapter._nwClearInterval === 'function') this.adapter._nwClearInterval(this.timer);
      else if (typeof this.adapter.clearInterval === 'function') this.adapter.clearInterval(this.timer);
      else clearInterval(this.timer);
    } catch (_error) {}
    this.timer = null;
  }

  async tick(_reason = 'manual'): Promise<void> {
    if (this.stopped || this.running || this.adapter._nwShuttingDown) return;
    this.running = true;
    try {
      await this.primeVolatileStates();
      const now = Date.now();
      const contract = buildOverviewContract(this.adapter, now);
      this.ingestAuditEvents();
      const signature = eventSignature(contract);
      if (signature !== this.lastSignature) {
        this.events.push(overviewEvent(contract, now));
        this.lastSignature = signature;
      }
      this.dedupeAndTrimEvents();
      await this.publish(contract);
    } finally {
      this.running = false;
    }
  }

  private async ensureStates(): Promise<void> {
    await this.adapter.setObjectNotExistsAsync('info.adminOverview', {
      type: 'channel', common: { name: 'NexoWatt EMS Live-Diagnose für EOS Admin' }, native: {},
    });
    const ensure = async (id: string, name: string, type: string, role: string, def?: unknown): Promise<void> => {
      await this.adapter.setObjectNotExistsAsync(`info.adminOverview.${id}`, {
        type: 'state',
        common: { name, type, role, read: true, write: false, def },
        native: {},
      });
    };
    await ensure('schemaVersion', 'EMS-Übersichtsvertrag Version', 'number', 'value', 1);
    await ensure('available', 'EMS-Übersicht verfügbar', 'boolean', 'indicator', false);
    await ensure('status', 'EMS-Gesamtstatus', 'string', 'text', 'info');
    await ensure('headline', 'EMS-Statusüberschrift', 'string', 'text', 'EMS wird initialisiert');
    await ensure('reason', 'EMS-Entscheidungsgrund', 'string', 'text', '');
    await ensure('binding', 'Aktiv bindende Begrenzung', 'string', 'text', 'none');
    await ensure('updatedAt', 'EMS-Übersicht aktualisiert', 'number', 'value.time', 0);
    await ensure('summaryJson', 'EMS-Übersicht kompakt (JSON)', 'string', 'json', '{}');
    await ensure('eventsJson', 'Letzte EMS-Entscheidungen (JSON)', 'string', 'json', '[]');
    await ensure('eventCount', 'Anzahl EMS-Entscheidungen im Ringpuffer', 'number', 'value', 0);
  }

  private async restoreEvents(): Promise<void> {
    try {
      const state = await this.adapter.getStateAsync('info.adminOverview.eventsJson');
      const parsed = parseJson(state && state.val, []);
      if (Array.isArray(parsed)) {
        this.events = parsed.filter((event: AnyRecord) => event && typeof event === 'object')
          .map((event: AnyRecord) => ({
            id: text(event.id, `restored-${event.ts}`, 120),
            ts: Math.max(0, Math.round(finite(event.ts, 0))),
            severity: ['ok', 'info', 'warning', 'error'].includes(String(event.severity)) ? event.severity as Severity : 'info',
            subsystem: text(event.subsystem, 'ems', 60),
            title: text(event.title, 'EMS', 120),
            message: text(event.message, '', 280),
            reason: text(event.reason, '', 160),
            actualW: nullableNumber(event.actualW) ?? undefined,
            targetW: nullableNumber(event.targetW) ?? undefined,
          }))
          .filter((event: OverviewEvent) => event.ts > 0)
          .slice(-this.maxEvents);
      }
    } catch (_error) {}
  }

  private async primeStates(): Promise<void> {
    const keys = [
      'chargingManagement.audit.snapshotJson', 'chargingManagement.audit.recentEventsJson',
      'chargingManagement.audit.activeLimiter', 'chargingManagement.audit.safetyStage', 'chargingManagement.audit.safetyActive', 'chargingManagement.audit.problemCount',
      'chargingManagement.wallboxCount', 'chargingManagement.summary.totalPowerW', 'chargingManagement.summary.totalTargetPowerW', 'chargingManagement.summary.totalReservedPowerW', 'chargingManagement.summary.lastUpdate',
      'chargingManagement.control.active', 'chargingManagement.control.status', 'chargingManagement.control.mode', 'chargingManagement.control.budgetW', 'chargingManagement.control.usedW', 'chargingManagement.control.remainingW',
      'chargingManagement.control.gridCapBinding', 'chargingManagement.control.phaseCapBinding', 'chargingManagement.control.para14aActive', 'chargingManagement.control.para14aBinding',
      'ems.core.lastTickStart', 'ems.core.lastTickDurationMs', 'ems.core.lastTickError',
      'ems.safety.valid', 'ems.safety.emergencyStop', 'ems.safety.reason', 'ems.safety.gridHeadroomW', 'ems.safety.evcsCapW',
      'ems.budget.active', 'ems.budget.mode', 'ems.budget.source', 'ems.budget.lastUpdate', 'ems.budget.totalBudgetW', 'ems.budget.remainingTotalW', 'ems.budget.flexUsedW',
      'ems.budget.binding', 'ems.budget.gridW', 'ems.budget.gridImportW', 'ems.budget.gridExportW', 'ems.budget.pvPowerW',
      'ems.budget.pvBudgetW', 'ems.budget.remainingPvW',
      'speicher.regelung.aktiv', 'speicher.regelung.aktivKonfig', 'speicher.regelung.topologie', 'speicher.regelung.topologieGrund', 'speicher.regelung.socPct',
      'speicher.regelung.sollW', 'speicher.regelung.acceptedSollW', 'speicher.regelung.batteryPowerFeedbackMeasuredW', 'speicher.regelung.batteryPowerFeedbackBasisW',
      'speicher.regelung.schreibOk', 'speicher.regelung.schreibStatus', 'speicher.regelung.safetyReason', 'speicher.regelung.grund', 'speicher.regelung.requestGrund',
      'para14a.active', 'para14a.communicationFallbackActive', 'para14a.communicationFallbackReason', 'para14a.fallbackEvcsCapW', 'para14a.evcsTotalCapW', 'para14a.signalFresh', 'para14a.signalStatus',
      'peakShaving.control.status', 'tarif.aktiv', 'tarif.state', 'tarif.currentPriceFresh', 'tarif.preisAktuellEurProKwh', 'tarif.netFeeMode', 'tarif.statusText',
      'forecast.effective.source', 'forecast.effective.fresh', 'forecast.effective.powerNowW', 'forecast.effective.energy6hWh', 'forecast.effective.energy12hWh', 'forecast.effective.energy24hWh', 'forecast.effective.error',
      'forecast.pv.source', 'forecast.pv.valid', 'storageSoc', 'storagePower',
    ];
    for (const key of keys) await this.prime(key);
  }

  private async primeVolatileStates(): Promise<void> {
    for (const key of [
      'chargingManagement.audit.snapshotJson', 'chargingManagement.audit.recentEventsJson',
      'ems.core.lastTickStart', 'ems.core.lastTickDurationMs', 'ems.core.lastTickError',
      'ems.safety.valid', 'ems.safety.emergencyStop', 'ems.safety.reason',
      'ems.budget.totalBudgetW', 'ems.budget.remainingTotalW', 'ems.budget.flexUsedW', 'ems.budget.binding', 'ems.budget.remainingPvW',
      'speicher.regelung.sollW', 'speicher.regelung.acceptedSollW', 'speicher.regelung.batteryPowerFeedbackMeasuredW',
      'forecast.effective.source', 'forecast.effective.fresh', 'forecast.effective.powerNowW',
    ]) await this.prime(key, 7000);
  }

  private async prime(key: string, maxAgeMs = Number.POSITIVE_INFINITY): Promise<void> {
    try {
      const cached = this.adapter.stateCache && this.adapter.stateCache[key];
      const ageMs = cached && Number.isFinite(Number(cached.ts)) ? Date.now() - Number(cached.ts) : Number.POSITIVE_INFINITY;
      if (cached && ageMs <= maxAgeMs) return;
      const state = await this.adapter.getStateAsync(key);
      if (state && state.val !== undefined) {
        if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue(key, state.val, state.ts || Date.now());
        else {
          if (!this.adapter.stateCache) this.adapter.stateCache = {};
          this.adapter.stateCache[key] = { value: state.val, ts: state.ts || Date.now() };
        }
      }
    } catch (_error) {}
  }

  private ingestAuditEvents(): void {
    const parsed = parseJson(stateValue(this.adapter, 'chargingManagement.audit.recentEventsJson', '[]'), []);
    if (!Array.isArray(parsed)) return;
    for (const raw of parsed.slice(-20)) {
      const event = normalizeAuditEvent(raw);
      if (event) this.events.push(event);
    }
  }

  private dedupeAndTrimEvents(): void {
    const seen = new Set<string>();
    this.events = this.events
      .filter((event) => event && event.ts > 0)
      .sort((a, b) => a.ts - b.ts)
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .slice(-this.maxEvents);
  }

  private async publish(contract: OverviewContract): Promise<void> {
    try { this.adapter._nwAdminOverview = contract; } catch (_error) {}
    const values: Record<string, unknown> = {
      schemaVersion: contract.schemaVersion,
      available: contract.available,
      status: contract.status,
      headline: contract.headline,
      reason: contract.reason,
      binding: contract.binding,
      updatedAt: contract.generatedAt,
      summaryJson: JSON.stringify(contract),
      eventsJson: JSON.stringify(this.events.slice(-8).reverse()),
      eventCount: this.events.length,
    };
    for (const [key, value] of Object.entries(values)) await this.setIfChanged(`info.adminOverview.${key}`, value);
  }

  private async setIfChanged(id: string, value: unknown): Promise<void> {
    if (this.stopped || this.adapter._nwShuttingDown) return;
    const signature = typeof value === 'string' ? value : JSON.stringify(value);
    if (id !== 'info.adminOverview.updatedAt' && this.lastValues.get(id) === signature) return;
    this.lastValues.set(id, signature);
    try { await this.adapter.setStateAsync(id, { val: value, ack: true }); } catch (_error) {}
  }
}

module.exports = {
  AdminOverviewPublisher,
  buildOverviewContract,
  normalizeAuditEvent,
  humanizeLimiter,
};
