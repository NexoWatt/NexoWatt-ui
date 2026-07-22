// @runtime-transpile
'use strict';

/**
 * Letzte, herstellerunabhaengige Sicherheitsentscheidung vor dem Speicher-Writer.
 *
 * NexoWatt-Konvention:
 * - NVP +W = Netzbezug, -W = Netzeinspeisung
 * - Speicher +W = Entladen, -W = Laden
 *
 * Eine positive Speicheranforderung darf den NVP niemals unter das erlaubte
 * Zielband in die Einspeisung druecken. Ein frischer signierter NVP ist deshalb
 * autoritativ gegenueber Feed-forward, gehaltenen Kommandos und Herstellerprofilen.
 */

declare const module: { exports: unknown };

export type StorageAntiExportAction =
  | 'inactive'
  | 'allow-discharge'
  | 'cap-to-nvp-headroom'
  | 'stop-confirmed-export'
  | 'stop-no-safe-headroom'
  | 'stop-missing-storage-feedback'
  | 'stop-missing-nvp';

export type StorageAntiExportInput = {
  requestedTargetW?: unknown;
  nvpW?: unknown;
  nvpUsable?: boolean;
  nvpTargetW?: unknown;
  nvpDeadbandW?: unknown;
  storageActualW?: unknown;
  storageActualTrusted?: boolean;
  commandEpsilonW?: unknown;
};

export type StorageAntiExportDecision = {
  active: boolean;
  action: StorageAntiExportAction;
  requestedW: number;
  targetW: number;
  explicitStop: boolean;
  nvpUsable: boolean;
  nvpW: number | null;
  nvpTargetW: number;
  nvpDeadbandW: number;
  hardExportFloorW: number;
  storageActualW: number | null;
  storageActualTrusted: boolean;
  safeDischargeCapW: number;
  predictedNvpW: number | null;
  capped: boolean;
  reason: string;
};

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Reine, nebenwirkungsfreie Anti-Export-Entscheidung.
 *
 * Die physikalische Last hinter dem NVP ist:
 *   Last = NVP + aktuelle Speicherentladung
 * Daraus folgt fuer das sichere Entlade-Maximum:
 *   Entlade-Max = Speicher-Ist + NVP - NVP-Ziel
 *
 * Fehlt ein frischer Speicher-Istwert, wird ein positiver Entladebefehl
 * gestoppt. Eine angenommene 0-W-Istleistung waere bei einer noch laufenden
 * Speicherladung nicht sicher: Der NVP-Bezug koennte vollstaendig aus dieser
 * Ladung stammen und ein Richtungswechsel sonst unmittelbar Export erzeugen.
 */
export function resolveStorageAntiExportTarget(input: StorageAntiExportInput = {}): StorageAntiExportDecision {
  const requestedW = finite(input.requestedTargetW) ?? 0;
  const nvpTargetW = Math.max(0, finite(input.nvpTargetW) ?? 50);
  const nvpDeadbandW = Math.max(0, finite(input.nvpDeadbandW) ?? 50);
  const commandEpsilonW = Math.max(0.5, finite(input.commandEpsilonW) ?? 1);
  const nvpParsed = finite(input.nvpW);
  const nvpUsable = input.nvpUsable === true && nvpParsed !== null;
  const actualParsed = finite(input.storageActualW);
  const storageActualTrusted = input.storageActualTrusted === true && actualParsed !== null;
  const storageActualW = storageActualTrusted ? actualParsed : null;
  const hardExportFloorW = Math.max(0, nvpTargetW - nvpDeadbandW);

  if (requestedW <= commandEpsilonW) {
    return {
      active: false,
      action: 'inactive',
      requestedW,
      targetW: requestedW,
      explicitStop: false,
      nvpUsable,
      nvpW: nvpParsed,
      nvpTargetW,
      nvpDeadbandW,
      hardExportFloorW,
      storageActualW,
      storageActualTrusted,
      safeDischargeCapW: 0,
      predictedNvpW: nvpParsed,
      capped: false,
      reason: '',
    };
  }

  if (!nvpUsable) {
    return {
      active: true,
      action: 'stop-missing-nvp',
      requestedW,
      targetW: 0,
      explicitStop: true,
      nvpUsable: false,
      nvpW: nvpParsed,
      nvpTargetW,
      nvpDeadbandW,
      hardExportFloorW,
      storageActualW,
      storageActualTrusted,
      safeDischargeCapW: 0,
      predictedNvpW: null,
      capped: true,
      reason: 'Anti-Export: positiver Entladebefehl ohne frischen signierten NVP gestoppt',
    };
  }

  const nvpW = nvpParsed as number;
  if (nvpW < hardExportFloorW) {
    return {
      active: true,
      action: 'stop-confirmed-export',
      requestedW,
      targetW: 0,
      explicitStop: true,
      nvpUsable: true,
      nvpW,
      nvpTargetW,
      nvpDeadbandW,
      hardExportFloorW,
      storageActualW,
      storageActualTrusted,
      safeDischargeCapW: 0,
      predictedNvpW: storageActualW === null ? nvpW : nvpW + storageActualW,
      capped: true,
      reason: `Anti-Export: NVP ${Math.round(nvpW)} W bestaetigt Einspeisung – Speicherentladung sofort stoppen`,
    };
  }

  if (!storageActualTrusted || storageActualW === null) {
    return {
      active: true,
      action: 'stop-missing-storage-feedback',
      requestedW,
      targetW: 0,
      explicitStop: true,
      nvpUsable: true,
      nvpW,
      nvpTargetW,
      nvpDeadbandW,
      hardExportFloorW,
      storageActualW: null,
      storageActualTrusted: false,
      safeDischargeCapW: 0,
      predictedNvpW: nvpW,
      capped: true,
      reason: 'Anti-Export: positiver Entladebefehl ohne frische vertrauenswuerdige Speicher-Istleistung gestoppt',
    };
  }

  const safeDischargeCapW = Math.max(0, storageActualW + nvpW - nvpTargetW);
  if (safeDischargeCapW <= commandEpsilonW) {
    return {
      active: true,
      action: 'stop-no-safe-headroom',
      requestedW,
      targetW: 0,
      explicitStop: true,
      nvpUsable: true,
      nvpW,
      nvpTargetW,
      nvpDeadbandW,
      hardExportFloorW,
      storageActualW,
      storageActualTrusted,
      safeDischargeCapW,
      predictedNvpW: nvpW + storageActualW,
      capped: true,
      reason: `Anti-Export: kein sicherer Entlade-Headroom oberhalb ${Math.round(nvpTargetW)} W NVP-Ziel`,
    };
  }

  const targetW = Math.max(0, Math.min(requestedW, safeDischargeCapW));
  const capped = targetW + commandEpsilonW < requestedW;
  const predictedNvpW = nvpW + storageActualW - targetW;
  return {
    active: true,
    action: capped ? 'cap-to-nvp-headroom' : 'allow-discharge',
    requestedW,
    targetW,
    explicitStop: false,
    nvpUsable: true,
    nvpW,
    nvpTargetW,
    nvpDeadbandW,
    hardExportFloorW,
    storageActualW,
    storageActualTrusted,
    safeDischargeCapW,
    predictedNvpW,
    capped,
    reason: capped
      ? `Anti-Export: Entladung auf sicheren NVP-Headroom ${Math.round(targetW)} W begrenzt`
      : 'Anti-Export: Entladung innerhalb des sicheren NVP-Headrooms',
  };
}

module.exports = { resolveStorageAntiExportTarget };
