/**
 * Datei: src-ts/ems/charging-management/charging-management.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für EVCS / Charging-Management. Diese Datei ersetzt in
 * 0.7.122 noch keine produktive Ladelogik, sondern liefert sichere Verträge und
 * Diagnose-Helfer für Ladepunkte, Sichtbarkeit, Setpoint-Mapping und Budgetvorbereitung.
 *
 * Zusammenhang:
 * Charging-Management hängt an Core-Limits, EVCS-Feature-Sichtbarkeit, History/PDF,
 * App-Center-Konfiguration und Verbraucherreservierungen. Fehler hier können echte
 * Wallboxen falsch anzeigen oder Ladeleistungen falsch begrenzen.
 *
 * Wichtig:
 * - 0 W ist gültig und darf nicht als fehlend gelten.
 * - Anlagen ohne EVCS dürfen keine Wallbox-Sichtbarkeit vortäuschen.
 * - TypeScript bleibt in 0.7.122 Vorbereitungs-/Shadow-Helfer; die produktive JS-
 *   Ladelogik bleibt weiterhin führend.
 */
export type ChargingWatt = number;
export type ChargingAmpere = number;
export type ChargingWallboxKey = string;
export type ChargingControlBasis = 'power' | 'current' | string;
/** Datenvertrag: Minimale Wallbox-Konfiguration aus dem App-Center. */
export interface ChargingWallboxInput {
    key?: unknown;
    id?: unknown;
    name?: unknown;
    enabled?: unknown;
    evcsIndex?: unknown;
    controlBasis?: unknown;
    setPowerId?: unknown;
    setCurrentId?: unknown;
    setAId?: unknown;
    enableId?: unknown;
    maxPowerW?: unknown;
    maxA?: unknown;
    minPowerW?: unknown;
    minA?: unknown;
    phases?: unknown;
    voltageV?: unknown;
    chargerType?: unknown;
    allowBoost?: unknown;
}
/** Datenvertrag: Normalisierte Diagnose-/Migrationssicht auf einen Ladepunkt. */
export interface ChargingWallboxRuntimeView {
    key: ChargingWallboxKey;
    name: string;
    enabled: boolean;
    evcsIndex: number;
    controlBasis: ChargingControlBasis;
    hasSetPower: boolean;
    hasSetCurrent: boolean;
    hasAnySetpoint: boolean;
    hasEnable: boolean;
    minPowerW: ChargingWatt;
    maxPowerW: ChargingWatt;
    minA: ChargingAmpere;
    maxA: ChargingAmpere;
    phases: number;
    voltageV: number;
    chargerType: string;
    mappingIssues: string[];
}
/** Datenvertrag: Eingangswerte für die EVCS-TS-Vorbereitung. */
export interface ChargingManagementPrepInput {
    mode?: unknown;
    enabled?: unknown;
    wallboxes?: readonly ChargingWallboxInput[] | null;
    runtimeWallboxes?: readonly Record<string, unknown>[] | null;
    totalPowerW?: unknown;
    totalTargetPowerW?: unknown;
    onlineWallboxes?: unknown;
    budgetW?: unknown;
    usedW?: unknown;
    remainingW?: unknown;
    pvUsedW?: unknown;
    ts?: unknown;
}
/** Datenvertrag: Spätere EVCS-Verbraucherreservierung, in 0.7.122 nur vorbereitet. */
export interface ChargingBudgetReservationPrep {
    source: 'ts-charging-budget-reservation-prep-v1';
    requestedW: number;
    reserveW: number;
    pvReserveW: number;
    budgetW: number | null;
    usedW: number;
    remainingW: number;
    mode: string;
    ok: boolean;
    warnings: string[];
}
/** Datenvertrag: Ergebnis der EVCS-/Charging-Management-Vorbereitung. */
export interface ChargingManagementPrepResult {
    source: 'ts-charging-management-prep-v1';
    available: true;
    productive: false;
    ok: boolean;
    ts: number;
    mode: string;
    enabled: boolean;
    wallboxCount: number;
    enabledWallboxCount: number;
    visibleEvcs: boolean;
    hasAnySetpoint: boolean;
    totalConfiguredMaxPowerW: number;
    totalRuntimeTargetPowerW: number;
    totalActualPowerW: number;
    onlineWallboxes: number;
    warnings: string[];
    blockers: string[];
    wallboxes: ChargingWallboxRuntimeView[];
    budgetPrep: ChargingBudgetReservationPrep;
}
/**
 * Code-Teil: toSafeWallboxKey
 * Zweck: Ladepunkt-Keys wie die JS-Runtime in sichere ID-Bestandteile wandeln.
 */
export declare function toSafeWallboxKey(input: unknown, fallbackIndex?: number): ChargingWallboxKey;
/**
 * Code-Teil: normalizeChargingWallbox
 * Zweck: Wallbox-Konfiguration für TS-Diagnose und spätere produktive Migration normalisieren.
 */
export declare function normalizeChargingWallbox(raw: ChargingWallboxInput, index?: number): ChargingWallboxRuntimeView;
/**
 * Code-Teil: buildChargingBudgetReservationPrep
 * Zweck: EVCS-Reservierung für spätere TS-Übernahme vorbereiten; produktiv bleibt JS.
 */
export declare function buildChargingBudgetReservationPrep(input: ChargingManagementPrepInput, wallboxes: readonly ChargingWallboxRuntimeView[]): ChargingBudgetReservationPrep;
/**
 * Code-Teil: buildChargingManagementPrep
 * Zweck: EVCS-/Charging-Management-TS-Vorbereitung für Diagnose und spätere Produktion bauen.
 */
export declare function buildChargingManagementPrep(input: ChargingManagementPrepInput): ChargingManagementPrepResult;
/**
 * Code-Teil: compareChargingPrepWithRuntime
 * Zweck: TS-Vorbereitung mit JS-Runtimewerten vergleichen. Nur Diagnose, kein Blocker in 0.7.122.
 */
export declare function compareChargingPrepWithRuntime(runtime: Record<string, unknown>, prep: ChargingManagementPrepResult): {
    source: string;
    ok: boolean;
    mismatchCount: number;
    mismatches: {
        field: string;
        js: number | null;
        ts: number | null;
        diff: number | null;
    }[];
};
//# sourceMappingURL=charging-management.d.ts.map