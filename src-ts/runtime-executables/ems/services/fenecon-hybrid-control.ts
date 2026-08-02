// @runtime-transpile
'use strict';

/**
 * Gemeinsamer FENECON-Hybrid-Vertrag für Einzelspeicher und Speicherfarm.
 *
 * Wichtige Architekturregel:
 * - Der native FEMS-NVP-Regler ist nur für FENECON/OpenEMS-Hybridsysteme
 *   (vendorProfile=fenecon-openems + coupling=dc) zulässig.
 * - Pro Netzverknüpfungspunkt darf höchstens ein nativer FEMS-NVP-Master
 *   aktiv sein. Sobald weitere beschreibbare Farm-Speicher vorhanden sind,
 *   muss der FENECON-Speicher als direkter ESS-Teilnehmer arbeiten.
 * - Alle anderen Hersteller und FENECON-AC-Systeme bleiben unverändert auf
 *   der direkten Leistungssteuerung.
 */

declare const module: { exports: unknown };

type AnyRecord = Record<string, any>;

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, minValue: number | null, maxValue: number | null): number {
  let out = value;
  if (minValue !== null) out = Math.max(minValue, out);
  if (maxValue !== null) out = Math.min(maxValue, out);
  return out;
}

function normalizeVendorProfile(value: unknown): string {
  const raw = text(value).toLowerCase();
  if (['fenecon', 'openems', 'fems', 'fenecon-openems'].includes(raw)) return 'fenecon-openems';
  if (['sungrow', 'sungrow-ess', 'sungrow-hybrid'].includes(raw)) return 'sungrow-hybrid';
  if (['e3dc', 'e3/dc', 'e3dc-rscp', 'e3dc-rscp-iobroker'].includes(raw)) return 'e3dc-rscp';
  return raw || 'generic';
}

function normalizeControlMode(value: unknown): string {
  const raw = text(value).toLowerCase();
  if (['fems-grid', 'fems', 'fems-nvp', 'native', 'native-grid', 'grid-target'].includes(raw)) return 'fems-grid';
  if (['direct-ess', 'direct', 'ess', 'set-active-power', 'direct-power'].includes(raw)) return 'direct-ess';
  return 'auto';
}

function isFeneconHybrid(config: AnyRecord = {}): boolean {
  const profile = normalizeVendorProfile(config.vendorProfile);
  const coupling = text(config.coupling).toLowerCase();
  return profile === 'fenecon-openems' && coupling === 'dc';
}

function hasWritableNativeTarget(config: AnyRecord = {}): boolean {
  return !!text(
    config.feneconGridSetpointObjectId
    || config.feneconGridSetpointId
    || config.femsGridSetpointObjectId
    || config.femsGridSetpointId,
  );
}

function resolveControlMode(config: AnyRecord = {}, context: AnyRecord = {}): AnyRecord {
  const requestedMode = normalizeControlMode(config.feneconControlMode || config.controlModeMode || config.feneconHybridControlMode);
  const hybrid = isFeneconHybrid(config);
  const nativeTargetAvailable = hasWritableNativeTarget(config);
  const writableStorageCountRaw = finite(context.writableStorageCount);
  const writableStorageCount = writableStorageCountRaw === null ? 1 : Math.max(0, Math.round(writableStorageCountRaw));
  const otherWritableStorageCountRaw = finite(context.otherWritableStorageCount);
  const otherWritableStorageCount = otherWritableStorageCountRaw === null
    ? Math.max(0, writableStorageCount - 1)
    : Math.max(0, Math.round(otherWritableStorageCountRaw));

  if (!hybrid) {
    return {
      eligible: false,
      hybrid: false,
      requestedMode,
      mode: requestedMode === 'fems-grid' ? 'invalid' : 'direct-ess',
      reason: requestedMode === 'fems-grid' ? 'fems-grid-requires-fenecon-dc-hybrid' : 'not-fenecon-hybrid',
      nativeTargetAvailable,
      writableStorageCount,
      otherWritableStorageCount,
    };
  }

  if (requestedMode === 'direct-ess') {
    return {
      eligible: true,
      hybrid: true,
      requestedMode,
      mode: 'direct-ess',
      reason: 'explicit-direct-ess',
      nativeTargetAvailable,
      writableStorageCount,
      otherWritableStorageCount,
    };
  }

  if (requestedMode === 'fems-grid') {
    if (!nativeTargetAvailable) {
      return {
        eligible: true,
        hybrid: true,
        requestedMode,
        mode: 'invalid',
        reason: 'fems-grid-target-missing',
        nativeTargetAvailable,
        writableStorageCount,
        otherWritableStorageCount,
      };
    }
    if (otherWritableStorageCount > 0) {
      return {
        eligible: true,
        hybrid: true,
        requestedMode,
        mode: 'invalid',
        reason: 'fems-grid-master-requires-exclusive-storage',
        nativeTargetAvailable,
        writableStorageCount,
        otherWritableStorageCount,
      };
    }
    return {
      eligible: true,
      hybrid: true,
      requestedMode,
      mode: 'fems-grid',
      reason: 'explicit-fems-grid',
      nativeTargetAvailable,
      writableStorageCount,
      otherWritableStorageCount,
    };
  }

  // Automatik wird ausschließlich beim Start bzw. beim Speichern ausgewertet.
  // Während eines laufenden Ticks wird die aufgelöste Kommandofamilie nicht
  // spontan gewechselt.
  if (nativeTargetAvailable && otherWritableStorageCount === 0) {
    return {
      eligible: true,
      hybrid: true,
      requestedMode: 'auto',
      mode: 'fems-grid',
      reason: 'auto-exclusive-fenecon-hybrid',
      nativeTargetAvailable,
      writableStorageCount,
      otherWritableStorageCount,
    };
  }

  return {
    eligible: true,
    hybrid: true,
    requestedMode: 'auto',
    mode: 'direct-ess',
    reason: nativeTargetAvailable ? 'auto-mixed-farm-direct-ess' : 'auto-native-target-missing-direct-ess',
    nativeTargetAvailable,
    writableStorageCount,
    otherWritableStorageCount,
  };
}

/**
 * Übersetzt den final durch alle EOS-Policies begrenzten Batterie-Sollwert in
 * den Netzpunkt-Sollwert des nativen FEMS-Balancing-Controllers.
 *
 * Vorzeichen:
 *   NVP +W = Netzbezug, -W = Einspeisung
 *   ESS +W = Entladen, -W = Laden
 */
function calculateFemsGridTargetW(input: AnyRecord = {}): AnyRecord {
  const nvpW = finite(input.nvpW);
  const essActualW = finite(input.essActualW);
  const batteryTargetW = finite(input.batteryTargetW);
  if (nvpW === null || essActualW === null || batteryTargetW === null) {
    return {
      ok: false,
      reason: nvpW === null ? 'nvp-missing' : (essActualW === null ? 'ess-actual-missing' : 'battery-target-missing'),
      nvpW,
      essActualW,
      batteryTargetW,
      gridTargetW: null,
    };
  }

  const rawGridTargetW = nvpW + essActualW - batteryTargetW;
  const minW = finite(input.minGridTargetW);
  const maxW = finite(input.maxGridTargetW);
  const gridTargetW = Math.round(clamp(rawGridTargetW, minW, maxW));
  return {
    ok: true,
    reason: gridTargetW === Math.round(rawGridTargetW) ? 'calculated' : 'clamped',
    nvpW: Math.round(nvpW),
    essActualW: Math.round(essActualW),
    batteryTargetW: Math.round(batteryTargetW),
    rawGridTargetW: Math.round(rawGridTargetW),
    gridTargetW,
    minGridTargetW: minW,
    maxGridTargetW: maxW,
  };
}

function validateFarmRows(rowsIn: unknown): AnyRecord {
  const rows = Array.isArray(rowsIn)
    ? rowsIn.filter((row) => row && typeof row === 'object' && row.enabled !== false) as AnyRecord[]
    : [];
  const configuredRows = rows.filter((row) => !!(
    text(row.setSignedPowerId)
    || text(row.setChargePowerId)
    || text(row.setDischargePowerId)
    || text(row.feneconGridSetpointId)
    || text(row.feneconGridSetpointObjectId)
  ));
  const writableStorageCount = configuredRows.length;
  const resolved = configuredRows.map((row) => {
    const directTargetAvailable = !!(
      text(row.setSignedPowerId)
      || text(row.setChargePowerId)
      || text(row.setDischargePowerId)
    );
    const result = resolveControlMode({
      vendorProfile: row.vendorProfile,
      coupling: row.coupling,
      feneconControlMode: row.feneconControlMode,
      feneconGridSetpointId: row.feneconGridSetpointId || row.feneconGridSetpointObjectId,
    }, {
      writableStorageCount,
      otherWritableStorageCount: Math.max(0, writableStorageCount - 1),
    });
    let validationReason = '';
    if (result.mode === 'direct-ess' && isFeneconHybrid(row) && !directTargetAvailable) {
      validationReason = writableStorageCount > 1
        ? 'fenecon-direct-target-missing-in-mixed-farm'
        : 'fenecon-direct-target-missing';
    }
    return { row, result, directTargetAvailable, validationReason };
  });
  const nativeRows = resolved.filter((item) => item.result.mode === 'fems-grid');
  const invalidRows = resolved.filter((item) => item.result.mode === 'invalid' || item.validationReason);
  let ok = invalidRows.length === 0 && nativeRows.length <= 1;
  let reason = 'ok';
  if (nativeRows.length > 1) {
    ok = false;
    reason = 'multiple-fems-grid-masters';
  } else if (invalidRows.length) {
    reason = invalidRows[0].validationReason || invalidRows[0].result.reason;
  } else if (nativeRows.length === 1 && writableStorageCount > 1) {
    ok = false;
    reason = 'fems-grid-master-with-other-writable-storage';
  }
  return {
    ok,
    reason,
    writableStorageCount,
    nativeMasterCount: nativeRows.length,
    nativeMasterName: nativeRows.length ? text(nativeRows[0].row.name) : '',
    resolved: resolved.map((item) => ({
      name: text(item.row.name),
      mode: item.result.mode,
      requestedMode: item.result.requestedMode,
      reason: item.validationReason || item.result.reason,
      directTargetAvailable: item.directTargetAvailable,
    })),
  };
}

module.exports = {
  normalizeVendorProfile,
  normalizeControlMode,
  isFeneconHybrid,
  hasWritableNativeTarget,
  resolveControlMode,
  calculateFemsGridTargetW,
  validateFarmRows,
};
