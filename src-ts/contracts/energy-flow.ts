import type { Percent, StateId, TimestampMs, Watt } from './units';

/**
 * Datei: src-ts/contracts/energy-flow.ts
 *
 * Zweck:
 * TypeScript-Verträge für den Energiefluss. Diese Typen beschreiben die wichtigste
 * Fachregel im Projekt: PV, Netz, Speicher, Gebäude und optionale Verbraucher müssen
 * in Frontend, Backend, History, Heizstab und KI gleich interpretiert werden.
 *
 * Kritische Regel:
 * Speicher können als signed DP, als getrennte Lade-/Entlade-DPs oder gar nicht
 * gemappt sein. Wenn echte DPs vorhanden sind, sind sie Quelle der Wahrheit.
 */

/** Quelle, aus der ein Energieflusswert stammt. */
export type FlowValueSource =
  | 'mapped-dp'
  | 'signed-dp'
  | 'split-dp'
  | 'calculated'
  | 'default-zero'
  | 'missing';

/** Richtung einer signed Batterie-Leistung. */
export type StorageSignedConvention =
  | 'positive-discharge'
  | 'positive-charge'
  | 'unknown';

/**
 * Ergebnis der Speicherauflösung.
 *
 * Zusammenhang:
 * Dieser Vertrag ist Vorlage für Resolver in `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js`.
 */
export interface StorageFlowResult {
  /** Speicher lädt in Watt. Immer positiv oder 0. */
  chargeW: Watt;

  /** Speicher entlädt in Watt. Immer positiv oder 0. */
  dischargeW: Watt;

  /** Signed Batterie-Leistung, falls vorhanden. Konvention wird über `signedConvention` erklärt. */
  signedW: Watt | null;

  /** Speicher-SoC in Prozent, falls vorhanden. */
  socPct: Percent | null;

  /** Quelle der verwendeten Speicherwerte. */
  source: FlowValueSource;

  /** Vorzeichen-Konvention, wenn `signedW` verwendet wurde. */
  signedConvention: StorageSignedConvention;

  /** Gibt an, ob ein echter Speicher-DP gemappt war. Dann darf kein Fallback darübergelegt werden. */
  hasConfiguredStorageDp: boolean;

  /** Diagnosehinweis für UI/Logs, warum ein Fallback genutzt oder nicht genutzt wurde. */
  diagnosticText?: string;
}

/** Netzfluss nach Aufteilung in Bezug und Einspeisung. */
export interface GridFlowResult {
  /** Netzbezug in Watt. Immer positiv oder 0. */
  importW: Watt;

  /** Netzeinspeisung in Watt. Immer positiv oder 0. */
  exportW: Watt;

  /** Signed Netzanschlusspunkt, falls vorhanden. */
  signedW: Watt | null;

  /** Quelle der Netzwerte. */
  source: FlowValueSource;
}

/**
 * Zentrale Momentaufnahme des Energieflusses.
 *
 * Wichtig für spätere TypeScript-Migration:
 * Diese Struktur sollte langfristig die gemeinsame Datenbasis für LIVE, History,
 * Heizstab, KI-Berater und EMS-Budgetlogik werden.
 */
export interface EnergyFlowSnapshot {
  ts: TimestampMs;
  pvW: Watt;
  buildingLoadW: Watt | null;
  grid: GridFlowResult;
  storage: StorageFlowResult;
  evcsW: Watt;
  heatingRodW: Watt;
  thermalW: Watt;
  residualLoadW: Watt | null;
}

/** Mapping-Beschreibung für einen einzelnen Energiefluss-DP. */
export interface EnergyFlowDatapointMapping {
  key: string;
  id: StateId;
  unit?: string;
  invert?: boolean;
  sourceHint?: 'pv' | 'grid' | 'storage' | 'load' | 'evcs' | 'thermal' | 'other';
}
