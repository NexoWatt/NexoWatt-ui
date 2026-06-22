/**
 * Datei: src-ts/ems/charging-management/charging-management-runtime.ts
 *
 * Zweck:
 * Erste echte TypeScript-Helfer für EVCS / Charging-Management.
 * Diese Datei übernimmt in 0.7.122 noch keine produktive Ladeentscheidung, sondern
 * baut einen geprüften TS-Vorbereitungs- und Vergleichsplan für Ladeleistung,
 * Budgetreservierung und Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Charging-Management hängt an Core-Limits, Restgates, Consumer-Reservierungen,
 * EVCS-Datenpunkten, History/PDF-Sichtbarkeit und KI-Berater. Deshalb wird dieser
 * Bereich zuerst in klaren, kleinen Helfern vorbereitet.
 *
 * Wichtig:
 * - 0 W ist gültig und darf nicht als fehlend gelten.
 * - 0 Ladepunkte bedeutet „keine EVCS-Anlage“ und darf keine Wallbox sichtbar machen.
 * - TypeScript schreibt in 0.7.122 noch keine Ladeleistung produktiv.
 */
export type ChargingRuntimeMode = 'auto' | 'pv' | 'minpv' | 'boost' | string;
export interface ChargingRuntimeInput {
    mode?: ChargingRuntimeMode;
    budgetMode?: string;
    status?: string;
    wallboxCount?: number;
    onlineCount?: number;
    totalTargetPowerW?: number;
    totalTargetCurrentA?: number;
    budgetW?: number | null;
    usedW?: number | null;
    remainingW?: number | null;
    pvEvcsUsedWForBudget?: number | null;
    gridCapBinding?: boolean;
    phaseCapBinding?: boolean;
    para14aActive?: boolean;
    para14aCapEvcsW?: number | null;
    evcsHighLevelCapW?: number | null;
    storageAssistActive?: boolean;
}
export interface ChargingReservationPlan {
    key: 'evcs';
    app: 'chargingManagement';
    label: 'Ladepunkte';
    priority: number;
    requestedW: number;
    reserveW: number;
    pvReserveW: number;
    pvOnly: false;
    mode: string;
}
export interface ChargingVisibilityPlan {
    hasEvcs: boolean;
    reason: string;
    wallboxCount: number;
    onlineCount: number;
}
export interface ChargingRuntimePrepResult {
    source: 'ts-charging-management-prep-v1';
    ok: boolean;
    productive: false;
    mode: string;
    budgetMode: string;
    status: string;
    reservation: ChargingReservationPlan;
    visibility: ChargingVisibilityPlan;
    values: {
        wallboxCount: number;
        onlineCount: number;
        totalTargetPowerW: number;
        totalTargetCurrentA: number;
        budgetW: number | null;
        usedW: number;
        remainingW: number;
        pvEvcsUsedWForBudget: number;
        evcsHighLevelCapW: number | null;
    };
    warnings: string[];
}
export interface ChargingRuntimeMismatch {
    field: string;
    js: unknown;
    ts: unknown;
    diff?: number | null;
}
export interface ChargingRuntimeShadowResult {
    source: 'ts-charging-management-shadow-v1';
    available: true;
    ok: boolean;
    productive: false;
    mismatchCount: number;
    mismatches: ChargingRuntimeMismatch[];
    ts: ChargingRuntimePrepResult;
}
/**
 * Code-Teil: toFiniteNumber
 * Zweck: Normalisiert unbekannte Eingabewerte auf eine endliche Zahl oder Fallback.
 * Zusammenhang: Viele EVCS-Werte kommen aus States/Config; 0 ist gültig.
 */
export declare function toFiniteNumber(value: unknown, fallback?: number | null): number | null;
/**
 * Code-Teil: toNonNegativeWatt
 * Zweck: Normalisiert Leistungswerte auf Watt >= 0.
 * Zusammenhang: Ziel-/Budget-/Reservierungswerte dürfen nie negativ in die Budgetkette laufen.
 */
export declare function toNonNegativeWatt(value: unknown, fallback?: number): number;
/**
 * Code-Teil: normalizeChargingMode
 * Zweck: Hält die bekannten EVCS-Modi stabil zwischen JS- und TS-Welt.
 */
export declare function normalizeChargingMode(mode: unknown): string;
/**
 * Code-Teil: buildChargingReservationPlan
 * Zweck: Baut den zentralen Core-Limits-Reservierungsplan für EVCS.
 * Zusammenhang: Entspricht fachlich dem JS-Block `rt.reserve({ key: 'evcs', ... })`.
 */
export declare function buildChargingReservationPlan(input: ChargingRuntimeInput): ChargingReservationPlan;
/**
 * Code-Teil: buildChargingVisibilityPlan
 * Zweck: Bewertet, ob EVCS/Wallbox-Funktionen sichtbar sein dürfen.
 * Zusammenhang: Später relevant für App, History, PDF und KI-Berater.
 */
export declare function buildChargingVisibilityPlan(input: ChargingRuntimeInput): ChargingVisibilityPlan;
/**
 * Code-Teil: buildChargingManagementRuntimePrep
 * Zweck: Baut die TS-Vorbereitung für EVCS-Lademanagement.
 * Wichtig: `productive` ist in 0.7.122 bewusst false; die JS-Runtime bleibt führend.
 */
export declare function buildChargingManagementRuntimePrep(input: ChargingRuntimeInput): ChargingRuntimePrepResult;
/**
 * Code-Teil: compareChargingManagementRuntimePrep
 * Zweck: Vergleicht JS-Laufzeitwerte mit der TS-Vorbereitung.
 * Zusammenhang: Wird in 0.7.122 als Shadow-/Vorbereitungsdiagnose genutzt.
 */
export declare function compareChargingManagementRuntimePrep(input: ChargingRuntimeInput, ts?: ChargingRuntimePrepResult): ChargingRuntimeShadowResult;
//# sourceMappingURL=charging-management-runtime.d.ts.map