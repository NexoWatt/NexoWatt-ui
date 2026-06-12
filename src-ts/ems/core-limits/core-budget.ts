import type { CoreBudgetGate, CoreBudgetInput, CoreBudgetSnapshot } from '../../contracts/ems-budget';
import type { Percent, TimestampMs, Watt } from '../../contracts/units';
import { clampNumber, positiveWatt, toNumberOrNull } from '../../utils/number';

/**
 * Datei: src-ts/ems/core-limits/core-budget.ts
 *
 * Zweck:
 * Produktionsnahe TypeScript-Vorbereitung für die zentrale EMS-Budgetberechnung.
 * Diese Datei ist in 0.7.62 noch nicht produktiv verdrahtet. Sie beschreibt und testet
 * aber die Logik, die später aus `ems/modules/core-limits.js` herausgelöst werden soll.
 *
 * Zusammenhang:
 * Core-Limits liefern die Grundlage für Heizstab, EVCS, KI-Berater, Energiefluss und
 * History. Wenn diese Budgets falsch sind, laufen Verbraucherfreigabe und Historie falsch.
 *
 * Wichtig:
 * - 0 W ist ein gültiger Budgetwert.
 * - Speicherreserve muss vom Verbraucherbudget abgezogen werden, wenn sie aktiv ist.
 * - Netzlimit/Peak-Shaving darf nie durch PV-Logik übersteuert werden.
 */

/**
 * Code-Teil: numberPercentOrNull
 *
 * Zweck:
 * Normalisiert einen unbekannten SoC-/Prozentwert auf 0–100 oder `null`.
 *
 * Zusammenhang:
 * Speicherreserve-Entscheidungen hängen vom SoC ab. Ein fehlender SoC darf nicht heimlich
 * als 0 % interpretiert werden, weil dadurch die Reserve dauerhaft aktiv wäre.
 */
function numberPercentOrNull(value: unknown): Percent | null {
  const n = toNumberOrNull(value);
  return n === null ? null : clampNumber(n, 0, 100);
}

/**
 * Code-Teil: gate
 *
 * Zweck:
 * Erstellt ein einheitliches Budget-Gate mit Rohwert, Effektivwert und Diagnosegrund.
 *
 * Zusammenhang:
 * `core-limits.js` veröffentlicht später mehrere Budgets. Durch eine gemeinsame Struktur
 * können Heizstab, EVCS und KI-Berater dieselben Felder interpretieren.
 */
function gate(rawW: Watt, effectiveW: Watt, reason: CoreBudgetGate['reason'], diagnosticText?: string): CoreBudgetGate {
  const result: CoreBudgetGate = {
    rawW: Math.max(0, Math.round(rawW)),
    effectiveW: Math.max(0, Math.round(effectiveW)),
    reason,
  };
  if (typeof diagnosticText === 'string' && diagnosticText.length > 0) {
    result.diagnosticText = diagnosticText;
  }
  return result;
}

/**
 * Code-Teil: isStorageReserveActive
 *
 * Zweck:
 * Entscheidet, ob die Speicherreserve fachlich geschützt werden muss.
 *
 * Zusammenhang:
 * Heizstab und andere flexible Verbraucher dürfen die Reserve nicht aufbrauchen, wenn
 * der Speicher-SoC unter der konfigurierten Reserve liegt oder Speicherentladung verboten ist.
 */
export function isStorageReserveActive(storageSocPct: Percent | null, reserveSocPct: unknown, allowStorageDischarge = true): boolean {
  const reserve = numberPercentOrNull(reserveSocPct);
  if (!allowStorageDischarge) return true;
  if (storageSocPct === null || reserve === null) return false;
  return storageSocPct <= reserve;
}

/**
 * Code-Teil: calculatePvBudgetGate
 *
 * Zweck:
 * Berechnet das nutzbare PV-Budget nach Speicherreserve und bereits reservierter Leistung.
 *
 * Zusammenhang:
 * Dieses Budget ist später besonders wichtig für Heizstab/EVCS: Es beschreibt, wie viel
 * PV-Überschuss ohne zusätzlichen Netzbezug genutzt werden kann.
 */
export function calculatePvBudgetGate(input: CoreBudgetInput): CoreBudgetGate {
  const rawPvW = positiveWatt(input.pvSurplusW);
  const reserveW = positiveWatt(input.storageReserveW);
  const alreadyReservedW = positiveWatt(input.alreadyReservedW);
  const soc = numberPercentOrNull(input.storageSocPct);
  const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
  const appliedReserveW = reserveActive ? reserveW : 0;
  const effectiveW = Math.max(0, rawPvW - appliedReserveW - alreadyReservedW);
  const reason = reserveActive ? 'storage-reserve' : (alreadyReservedW > 0 ? 'manual-limit' : 'pv-surplus');
  const diagnosticText = reserveActive
    ? `PV-Budget um Speicherreserve ${Math.round(appliedReserveW)} W reduziert.`
    : `PV-Budget aus Überschuss ${Math.round(rawPvW)} W berechnet.`;
  return gate(rawPvW, effectiveW, reason, diagnosticText);
}

/**
 * Code-Teil: calculateGridBudgetGate
 *
 * Zweck:
 * Berechnet, wie viel zusätzliche Leistung unter Netz-/Peak-Limit noch möglich ist.
 *
 * Zusammenhang:
 * Peak-Shaving, §14a und Netzanschlussgrenzen müssen Verbraucherfreigaben begrenzen.
 * Das verhindert, dass Heizstab oder EVCS Lastspitzen erzeugen.
 */
export function calculateGridBudgetGate(input: CoreBudgetInput): CoreBudgetGate {
  const importW = positiveWatt(input.gridImportW);
  const limit = toNumberOrNull(input.gridImportLimitW);
  if (input.allowGridImport === false) {
    return gate(0, 0, 'manual-limit', 'Netzbezug ist für flexible Verbraucher deaktiviert.');
  }
  if (input.peakShavingActive) {
    const eff = limit === null ? 0 : Math.max(0, limit - importW);
    return gate(limit === null ? 0 : Math.max(0, limit), eff, 'peak-shaving', 'Peak-Shaving begrenzt zusätzliches Netzbudget.');
  }
  if (input.externalLimitActive) {
    const eff = limit === null ? 0 : Math.max(0, limit - importW);
    return gate(limit === null ? 0 : Math.max(0, limit), eff, 'para14a', 'Externes Limit begrenzt zusätzliches Netzbudget.');
  }
  if (limit === null || limit <= 0) {
    return gate(0, 0, 'missing-input', 'Kein Netzlimit vorhanden; Netzbudget wird konservativ nicht erweitert.');
  }
  return gate(limit, Math.max(0, limit - importW), 'grid-limit', 'Netzbudget aus Anschluss-/Peak-Limit berechnet.');
}

/**
 * Code-Teil: buildCoreBudgetSnapshot
 *
 * Zweck:
 * Erstellt eine typisierte EMS-Budget-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist der spätere Kandidat für die Migration von Teilen aus
 * `ems/modules/core-limits.js`. In 0.7.62 wird sie nur über TypeScript-Regressionen
 * geprüft und noch nicht produktiv genutzt.
 */
export function buildCoreBudgetSnapshot(input: CoreBudgetInput): CoreBudgetSnapshot {
  const ts = (toNumberOrNull(input.ts) ?? Date.now()) as TimestampMs;
  const soc = numberPercentOrNull(input.storageSocPct);
  const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
  const storageReserveW = reserveActive ? positiveWatt(input.storageReserveW) : 0;
  const alreadyReservedW = positiveWatt(input.alreadyReservedW);
  const pv = calculatePvBudgetGate(input);
  const grid = calculateGridBudgetGate(input);
  const totalRaw = pv.rawW + grid.rawW;
  const totalEffectiveW = Math.max(0, pv.effectiveW + grid.effectiveW);
  const limitReason = pv.reason !== 'pv-surplus' ? pv.reason : grid.reason;
  const diagnosticText = [pv.diagnosticText, grid.diagnosticText]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ');

  return {
    ts,
    pv,
    grid,
    total: gate(totalRaw, totalEffectiveW, limitReason || 'none', diagnosticText),
    storageReserveActive: reserveActive,
    storageSocPct: soc,
    appliedStorageReserveW: storageReserveW,
    alreadyReservedW,
    diagnosticText,
  };
}
