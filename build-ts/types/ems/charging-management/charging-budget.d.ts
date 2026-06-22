/**
 * Datei: src-ts/ems/charging-management/charging-budget.ts
 *
 * Zweck:
 * TypeScript-Helfer für den ersten kontrollierten EVCS-/Charging-Management-Schritt.
 * Diese Datei berechnet noch keine komplette Ladepunktverteilung, sondern nur die
 * sicherheitsrelevanten Budget-/Cap-Gates, die aktuell in `ems/modules/charging-management.js`
 * inline entstehen.
 *
 * Zusammenhang:
 * Die Ergebnisse hängen fachlich an Core-Limits, Peak-Shaving, §14a, Netzanschlussgrenzen,
 * Phasenstromgrenzen und EVCS-High-Level-Caps. Sie beeinflussen später Ladefreigabe,
 * Budgetverteilung und History/PDF-Sichtbarkeit.
 *
 * Wichtig:
 * 0 W ist ein gültiger, sicherer Cap-Wert. Unendliche Budgets bedeuten „nicht begrenzt“
 * und dürfen nicht versehentlich als 0 behandelt werden.
 */
export type ChargingBudgetMode = string;
export interface ChargingBudgetSafetyCapInput {
    budgetW: number | null;
    budgetMode: ChargingBudgetMode;
    gridCapEvcsW?: number | null;
    gridCapBinding?: boolean;
    phaseCapEvcsW?: number | null;
    phaseCapBinding?: boolean;
    para14aActive?: boolean;
    para14aTotalCapW?: number | null;
    para14aMode?: string;
    peakActive?: boolean;
    pauseWhenPeakShavingActive?: boolean;
    pauseBehavior?: string;
}
export interface ChargingBudgetSafetyCapResult {
    source: 'ts-charging-budget-safety-caps-v1';
    budgetBeforeW: number | null;
    budgetAfterW: number | null;
    effectiveBudgetMode: string;
    gridCapApplied: boolean;
    phaseCapApplied: boolean;
    para14aApplied: boolean;
    finalStatus: string;
    caps: {
        gridCapEvcsW: number | null;
        phaseCapEvcsW: number | null;
        para14aTotalCapW: number | null;
    };
}
/**
 * Code-Teil: computeChargingBudgetSafetyCaps
 *
 * Zweck:
 * Berechnet die sicherheitsrelevanten EVCS-Budget-Caps in TypeScript parallel zur
 * bestehenden JavaScript-Runtime.
 *
 * Zusammenhang:
 * 0.7.123 nutzt diesen Helfer produktiv für die sicherheitsrelevanten EVCS-Budget-Caps.
 * Die Ladepunktverteilung selbst bleibt weiterhin JavaScript. Falls TS und JS abweichen
 * oder der Spiegel fehlschlägt, bleibt die bestehende JavaScript-Logik Fallback.
 */
export declare function computeChargingBudgetSafetyCaps(input: ChargingBudgetSafetyCapInput): ChargingBudgetSafetyCapResult;
export interface ChargingBudgetShadowComparison {
    source: 'ts-charging-budget-shadow-v1';
    available: boolean;
    ok: boolean;
    mismatchCount: number;
    mismatches: Array<{
        field: string;
        js: unknown;
        ts: unknown;
    }>;
    ts: ChargingBudgetSafetyCapResult | null;
}
/**
 * Code-Teil: compareChargingBudgetSafetyCaps
 * Zweck: Vergleicht JS-Runtime-Werte mit der TS-Budget-Cap-Berechnung.
 */
export declare function compareChargingBudgetSafetyCaps(js: Record<string, unknown>, input: ChargingBudgetSafetyCapInput): ChargingBudgetShadowComparison;
export interface ChargingBudgetProductiveDecision {
    source: 'ts-charging-budget-productive-v1';
    available: boolean;
    ok: boolean;
    productive: boolean;
    fallback: boolean;
    fallbackReason: string;
    comparison: ChargingBudgetShadowComparison;
    apply: null | {
        budgetW: number | null;
        effectiveBudgetMode: string;
        gridCapBinding: boolean;
        phaseCapBinding: boolean;
        para14aBinding: boolean;
        gridCapEvcsW: number | null;
        phaseCapEvcsW: number | null;
        para14aTotalCapW: number | null;
    };
}
/**
 * Code-Teil: buildChargingBudgetSafetyCapsProductive
 *
 * Zweck:
 * Baut die produktive TS-Entscheidung für EVCS-/Charging-Budget-Caps.
 *
 * Zusammenhang:
 * 0.7.123 übernimmt nur den sicheren Cap-Kern produktiv aus TypeScript:
 * Grid-Cap, Phasen-Cap und §14a-High-Level-Cap. Die eigentliche Ladepunktverteilung
 * und das Setpoint-Schreiben bleiben weiter JavaScript.
 *
 * Sicherheitsregel:
 * TypeScript darf nur angewendet werden, wenn der Vergleich zur bisherigen JS-Runtime
 * sauber ist. Bei Mismatch/Fehler bleibt JS Fallback.
 */
export declare function buildChargingBudgetSafetyCapsProductive(js: Record<string, unknown>, input: ChargingBudgetSafetyCapInput): ChargingBudgetProductiveDecision;
export interface ChargingBudgetProductiveDecisionFlat extends ChargingBudgetProductiveDecision {
    budgetAfterW: number | null;
    effectiveBudgetMode: string;
    gridCapApplied: boolean;
    phaseCapApplied: boolean;
    para14aApplied: boolean;
    gridCapEvcsW: number | null;
    phaseCapEvcsW: number | null;
    para14aTotalCapW: number | null;
}
/**
 * Code-Teil: buildChargingBudgetProductiveDecision
 *
 * Zweck:
 * Flacher produktiver EVCS-Budget-Cap-Vertrag für die CommonJS-Runtime.
 * `charging-management.js` kann diese Struktur direkt anwenden, ohne tiefe TS-Objekte
 * kennen zu müssen.
 *
 * Zusammenhang:
 * 0.7.123 übernimmt nur Budget-Caps produktiv. Ladepunktverteilung, Failsafe, Boost
 * und Setpoint-Schreiben bleiben JavaScript.
 */
export declare function buildChargingBudgetProductiveDecision(js: Record<string, unknown>, input: ChargingBudgetSafetyCapInput): ChargingBudgetProductiveDecisionFlat;
//# sourceMappingURL=charging-budget.d.ts.map