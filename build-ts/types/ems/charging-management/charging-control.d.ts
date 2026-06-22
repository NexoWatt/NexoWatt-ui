/**
 * Datei: src-ts/ems/charging-management/charging-control.ts
 *
 * Zweck:
 * TypeScript-Helfer für den ersten EVCS-/Charging-Management-Produktivumbau.
 * In 0.7.124 wird die produktive JS-Ladelogik noch nicht ersetzt. Dieser Helfer
 * bereitet stattdessen die wichtigsten Control-/Budget-/Sicherheitswerte als
 * typisierten Shadow-Plan und als kontrollierten Produktiv-Kandidaten vor.
 *
 * Zusammenhang:
 * Charging-Management hängt an Core-Limits, Restgates, Consumer-Reservierungen,
 * Feature-Sichtbarkeit, History/PDF und SmartHome-/App-Center-Anzeige. Deshalb wird
 * diese Datei zuerst als sichere Vergleichsschicht eingeführt.
 *
 * Wichtig:
 * 0 W, false und leere Listen sind gültig. Eine Anlage ohne EVCS darf nicht plötzlich
 * eine Wallbox sichtbar machen.
 */
export type ChargingControlStatus = 'ok' | 'off' | 'failsafe_stale_meter' | 'paused_by_peak_shaving_ramp_down' | 'limited_grid_import' | 'limited_phase_cap' | 'limited_grid_import_and_phase' | string;
export interface ChargingControlShadowInput {
    mode?: string;
    budgetMode?: string;
    status?: ChargingControlStatus;
    active?: boolean;
    budgetW?: unknown;
    usedW?: unknown;
    remainingW?: unknown;
    totalPowerW?: unknown;
    totalTargetPowerW?: unknown;
    totalTargetCurrentA?: unknown;
    wallboxCount?: unknown;
    onlineWallboxes?: unknown;
    connectedCount?: unknown;
    pausedByPeakShaving?: unknown;
    staleMeter?: unknown;
    staleBudget?: unknown;
    pvAvailable?: unknown;
    gridImportLimitW?: unknown;
    gridImportLimitEffW?: unknown;
    gridImportW?: unknown;
    gridCapEvcsW?: unknown;
    gridCapBinding?: unknown;
    phaseCapEvcsW?: unknown;
    phaseCapBinding?: unknown;
    para14aActive?: unknown;
    para14aCapEvcsW?: unknown;
    para14aBinding?: unknown;
    storageAssistActive?: unknown;
    storageAssistW?: unknown;
}
export interface ChargingControlShadowPlan {
    source: 'ts-charging-control-shadow-v1';
    available: true;
    ok: boolean;
    productive: false;
    control: {
        active: boolean;
        mode: string;
        status: ChargingControlStatus;
        budgetMode: string;
        budgetW: number;
        usedW: number;
        remainingW: number;
        totalPowerW: number;
        totalTargetPowerW: number;
        totalTargetCurrentA: number;
    };
    visibility: {
        hasEvcs: boolean;
        onlineWallboxes: number;
        wallboxCount: number;
        connectedCount: number;
    };
    gates: {
        pausedByPeakShaving: boolean;
        staleMeter: boolean;
        staleBudget: boolean;
        pvAvailable: boolean;
        gridCapBinding: boolean;
        phaseCapBinding: boolean;
        para14aActive: boolean;
        para14aBinding: boolean;
        storageAssistActive: boolean;
    };
    caps: {
        gridImportLimitW: number;
        gridImportLimitEffW: number;
        gridImportW: number;
        gridCapEvcsW: number;
        phaseCapEvcsW: number;
        para14aCapEvcsW: number;
        storageAssistW: number;
    };
    warnings: string[];
    blockers: string[];
}
/**
 * Code-Teil: buildChargingControlShadowPlan
 *
 * Zweck:
 * Baut aus den aktuellen JavaScript-Controlwerten einen typisierten TS-Shadow-Plan.
 * Der Plan ist in 0.7.122 ausdrücklich noch nicht produktiv, sondern die sichere
 * Vorstufe für die spätere EVCS-/Charging-Management-TS-Übernahme.
 */
export declare function buildChargingControlShadowPlan(input: ChargingControlShadowInput): ChargingControlShadowPlan;
export interface ChargingControlShadowComparison {
    source: 'ts-charging-control-shadow-comparison-v1';
    ok: boolean;
    mismatchCount: number;
    mismatches: Array<{
        field: string;
        js: unknown;
        ts: unknown;
    }>;
}
/**
 * Code-Teil: compareChargingControlShadowPlan
 * Zweck: Vergleicht die JS-Controlwerte mit dem TS-Shadow-Plan für Diagnose und spätere Umschaltung.
 */
export declare function compareChargingControlShadowPlan(input: ChargingControlShadowInput, plan: ChargingControlShadowPlan): ChargingControlShadowComparison;
export interface ChargingControlProductiveApply {
    active: boolean;
    mode: string;
    status: ChargingControlStatus;
    budgetMode: string;
    budgetW: number;
    usedW: number;
    remainingW: number;
    totalPowerW: number;
    totalTargetPowerW: number;
    totalTargetCurrentA: number;
    wallboxCount: number;
    onlineWallboxes: number;
    connectedCount: number;
    pausedByPeakShaving: boolean;
    staleMeter: boolean;
    staleBudget: boolean;
    pvAvailable: boolean;
    gridCapBinding: boolean;
    phaseCapBinding: boolean;
    para14aActive: boolean;
    para14aBinding: boolean;
    storageAssistActive: boolean;
    gridImportLimitW: number;
    gridImportLimitEffW: number;
    gridImportW: number;
    gridCapEvcsW: number;
    phaseCapEvcsW: number;
    para14aCapEvcsW: number;
    storageAssistW: number;
}
export interface ChargingControlProductivePrepDecision {
    source: 'ts-charging-control-productive-prep-v1';
    available: true;
    ok: boolean;
    productive: false;
    prepared: boolean;
    preparedForProductiveTakeover: boolean;
    fallback: boolean;
    fallbackReason: string;
    blockers: string[];
    warnings: string[];
    comparison: ChargingControlShadowComparison;
    plan: ChargingControlShadowPlan;
    apply: ChargingControlProductiveApply | null;
    safety: {
        appliesOnlyToControlSummary: true;
        keepsAllocationInJavascript: true;
        keepsSetpointWritingInJavascript: true;
        keepsFailsafeInJavascript: true;
    };
    nextAction: string;
}
/**
 * Code-Teil: buildChargingControlProductivePrep
 *
 * Zweck:
 * Bereitet den EVCS-/Charging-Control-Shadow als produktiven TS-Kandidaten vor,
 * ohne ihn in 0.7.124 schon auf echte Control-States anzuwenden.
 *
 * Zusammenhang:
 * Die bisherige JS-Runtime bleibt führend für Ladepunktverteilung, Failsafe,
 * Boost, PV-/Min+PV-Logik und Setpoint-Schreiben. TypeScript liefert nur einen
 * geprüften Apply-Vertrag für Control-/Summary-Werte, damit der nächste Schritt
 * gezielt und rückfallfähig produktiv geschaltet werden kann.
 *
 * Sicherheitsregel:
 * Ein Apply-Vertrag wird nur vorbereitet, wenn der JS/TS-Control-Vergleich sauber
 * ist und keine harten Control-Blocker wie stale meter/budget aktiv sind.
 */
export declare function buildChargingControlProductivePrep(input: ChargingControlShadowInput, plan?: ChargingControlShadowPlan, comparison?: ChargingControlShadowComparison): ChargingControlProductivePrepDecision;
export interface ChargingControlProductiveDecision {
    source: 'ts-charging-control-productive-v1';
    available: true;
    ok: boolean;
    productive: boolean;
    prepared: boolean;
    preparedForProductiveTakeover: boolean;
    fallback: boolean;
    fallbackReason: string;
    blockers: string[];
    warnings: string[];
    comparison: ChargingControlShadowComparison;
    plan: ChargingControlShadowPlan;
    apply: ChargingControlProductiveApply | null;
    safety: {
        appliesOnlyToControlSummary: true;
        keepsAllocationInJavascript: true;
        keepsSetpointWritingInJavascript: true;
        keepsFailsafeInJavascript: true;
    };
    nextAction: string;
}
/**
 * Code-Teil: buildChargingControlProductive
 *
 * Zweck:
 * Übernimmt den sicheren Control-/Summary-Ausschnitt produktiv aus TypeScript,
 * sobald Shadow-Plan und JS/TS-Vergleich sauber sind.
 *
 * Scope-Grenze:
 * Diese Funktion entscheidet bewusst keine Wallbox-Verteilung und erzeugt keine
 * Setpoint-Schreibbefehle. Ladepunkt-Allocation, Boost-/PV-/Min+PV-Logik,
 * Failsafe-Stopps und ioBroker-I/O bleiben weiterhin in der bestehenden Runtime.
 */
export declare function buildChargingControlProductive(input: ChargingControlShadowInput, plan?: ChargingControlShadowPlan, comparison?: ChargingControlShadowComparison): ChargingControlProductiveDecision;
//# sourceMappingURL=charging-control.d.ts.map