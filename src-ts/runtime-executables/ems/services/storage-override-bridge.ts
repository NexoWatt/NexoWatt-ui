// @runtime-transpile
'use strict';

/**
 * Datei: ems/services/storage-override-bridge.js
 * Zweck: Vereinheitlicht globale AppCenter-Speicher-Overrides mit der internen
 * Speicherregelung. Die Helfer verändern ausschließlich Messwert-Mappings und
 * lesen Istwerte; sie schreiben keine Hardware-Sollwerte.
 */

declare const module: { exports: unknown };

type AnyRecord = Record<string, any>;
type AdapterLike = {
  config?: AnyRecord;
  getForeignObjectAsync?: (id: string) => Promise<AnyRecord | null>;
};
type RegistryEntry = { objectId?: string } | null | undefined;
type RegistryLike = {
  getEntry: (key: string) => RegistryEntry;
  getNumber: (key: string, fallback: number | null) => number | null;
  getAgeMs: (key: string) => number | null;
};

type StorageOverrideBridgeResult = {
  source: string;
  socId: string;
  signedPowerId: string;
  chargePowerId: string;
  dischargePowerId: string;
};

type SplitBatteryFeedback = {
  trusted: boolean;
  observedW: number;
  ageMs: number | null;
  objectIds: string[];
  source: string;
  reason: string;
};

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function finite(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Ermittelt den Faktor, mit dem ein AppCenter-Leistungswert nach Watt skaliert wird. */
async function resolvePowerScale(adapter: AdapterLike, key: string, objectId: string): Promise<number> {
  const settings = adapter.config?.settings && typeof adapter.config.settings === 'object'
    ? adapter.config.settings
    : {};
  const perDp = settings.flowPowerDpIsW && typeof settings.flowPowerDpIsW === 'object'
    ? settings.flowPowerDpIsW as AnyRecord
    : null;
  if (perDp && Object.prototype.hasOwnProperty.call(perDp, key)) return perDp[key] ? 1 : 1000;
  if (typeof settings.flowPowerInputIsW === 'boolean') return settings.flowPowerInputIsW ? 1 : 1000;
  if (settings.flowAutoScalePower === false || !objectId || typeof adapter.getForeignObjectAsync !== 'function') return 1;
  try {
    const object = await adapter.getForeignObjectAsync(objectId);
    const unit = text(object?.common?.unit).toLowerCase();
    if (unit === 'kw' || unit === 'kilowatt') return 1000;
    if (unit === 'mw' || unit === 'megawatt') return 1000000;
  } catch (_error) {
    // Fehlende optionale Metadaten dürfen den EMS-Start nicht blockieren.
  }
  return 1;
}

/**
 * Übernimmt globale AppCenter-Overrides als autoritative Speicher-Messquelle.
 * Hersteller-Sollwert-, Enable- und Run-DPs bleiben unverändert.
 */
async function applyStorageMeasurementOverrides(adapter: AdapterLike, datapoints: AnyRecord): Promise<StorageOverrideBridgeResult> {
  const config = adapter.config || (adapter.config = {});
  const storage = config.storage && typeof config.storage === 'object' ? config.storage : (config.storage = {});
  const target = storage.datapoints && typeof storage.datapoints === 'object'
    ? storage.datapoints as AnyRecord
    : (storage.datapoints = {});
  const settings = config.settings && typeof config.settings === 'object' ? config.settings : {};
  const invert = settings.flowInvertBattery === true;

  const socId = text(datapoints.storageSoc);
  const signedId = text(datapoints.batteryPower);
  const chargeId = text(datapoints.storageChargePower);
  const dischargeId = text(datapoints.storageDischargePower);
  const sameSplitId = !!(chargeId && dischargeId && chargeId === dischargeId);

  if (socId) {
    target.socObjectId = socId;
    target.socFeedbackSource = 'appcenter-flow-override';
  }
  if (signedId) {
    target.batteryPowerObjectId = signedId;
    target.batteryPowerScale = await resolvePowerScale(adapter, 'batteryPower', signedId);
    target.batteryPowerInvert = invert;
    target.batteryChargePowerObjectId = '';
    target.batteryDischargePowerObjectId = '';
    target.batteryFeedbackSource = 'appcenter-signed-override';
  } else if (sameSplitId) {
    target.batteryPowerObjectId = chargeId;
    target.batteryPowerScale = await resolvePowerScale(adapter, 'storageChargePower', chargeId);
    target.batteryPowerInvert = invert;
    target.batteryChargePowerObjectId = '';
    target.batteryDischargePowerObjectId = '';
    target.batteryFeedbackSource = 'appcenter-same-split-signed';
  } else if (chargeId || dischargeId) {
    target.batteryPowerObjectId = '';
    target.batteryChargePowerObjectId = chargeId;
    target.batteryDischargePowerObjectId = dischargeId;
    target.batteryChargePowerScale = chargeId ? await resolvePowerScale(adapter, 'storageChargePower', chargeId) : 1;
    target.batteryDischargePowerScale = dischargeId ? await resolvePowerScale(adapter, 'storageDischargePower', dischargeId) : 1;
    target.batterySplitInvert = invert;
    target.batteryFeedbackSource = 'appcenter-split-override';
  }

  return {
    source: text(target.batteryFeedbackSource) || 'storage-tab',
    socId: text(target.socObjectId),
    signedPowerId: text(target.batteryPowerObjectId),
    chargePowerId: text(target.batteryChargePowerObjectId),
    dischargePowerId: text(target.batteryDischargePowerObjectId),
  };
}

function objectIdOf(entry: RegistryEntry): string {
  return text(entry?.objectId);
}

function looksLikeControlObjectId(objectId: string): boolean {
  const lower = objectId.toLowerCase();
  return lower.includes('.aliases.ctrl.')
    || lower.includes('.ctrl.')
    || lower.includes('setpoint')
    || lower.includes('targetpower')
    || lower.includes('targetcurrent');
}

/**
 * Bildet aus positiven Split-Istwerten die interne signed Speicherleistung:
 * +W = Entladen, -W = Laden. Ein Sollwert-/CTRL-DP wird nicht als Feedback akzeptiert.
 */
function resolveSplitBatteryFeedback(registry: RegistryLike | null | undefined, storageConfig: AnyRecord, staleMs: number): SplitBatteryFeedback | null {
  if (!registry) return null;
  const targetIds = [
    registry.getEntry('st.targetPowerW'),
    registry.getEntry('st.targetChargePowerW'),
    registry.getEntry('st.targetDischargePowerW'),
  ].map(objectIdOf).filter(Boolean);
  const rows = [
    { role: 'charge', entry: registry.getEntry('st.batteryChargePowerW'), value: registry.getNumber('st.batteryChargePowerW', null), ageMs: registry.getAgeMs('st.batteryChargePowerW') },
    { role: 'discharge', entry: registry.getEntry('st.batteryDischargePowerW'), value: registry.getNumber('st.batteryDischargePowerW', null), ageMs: registry.getAgeMs('st.batteryDischargePowerW') },
  ];

  let chargeW = 0;
  let dischargeW = 0;
  let oldestAgeMs: number | null = null;
  const objectIds: string[] = [];
  for (const row of rows) {
    const objectId = objectIdOf(row.entry);
    if (!objectId || row.value === null || !Number.isFinite(Number(row.value))) continue;
    if (targetIds.includes(objectId) || looksLikeControlObjectId(objectId)) continue;
    objectIds.push(objectId);
    const magnitude = Math.max(0, Math.abs(finite(row.value, 0)));
    if (row.role === 'charge') chargeW = magnitude;
    else dischargeW = magnitude;
    if (typeof row.ageMs === 'number' && Number.isFinite(row.ageMs)) {
      oldestAgeMs = oldestAgeMs === null ? row.ageMs : Math.max(oldestAgeMs, row.ageMs);
    }
  }
  if (!objectIds.length) return null;

  const datapointConfig = storageConfig.datapoints && typeof storageConfig.datapoints === 'object'
    ? storageConfig.datapoints as AnyRecord
    : {};
  if (datapointConfig.batterySplitInvert === true) {
    const swap = chargeW;
    chargeW = dischargeW;
    dischargeW = swap;
  }
  const trusted = oldestAgeMs === null || oldestAgeMs <= Math.max(1000, finite(staleMs, 60000));
  return {
    trusted,
    observedW: dischargeW - chargeW,
    ageMs: oldestAgeMs,
    objectIds,
    source: text(datapointConfig.batteryFeedbackSource) || 'single-storage-split',
    reason: trusted ? 'Split-Istleistung aus AppCenter/Einzel-Speicher' : 'Split-Istleistung vorhanden, aber veraltet',
  };
}

module.exports = { applyStorageMeasurementOverrides, resolvePowerScale, resolveSplitBatteryFeedback };
