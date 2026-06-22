import type { HeatingRodDecision, HeatingRodDecisionInput, HeatingRodStageConfig } from '../../contracts/heating-rod';
import type { Watt } from '../../contracts/units';
/**
 * Code-Teil: chooseLargestStageWithinBudget
 *
 * Zweck:
 * Wählt die größte Heizstabstufe, die in das verfügbare Budget passt.
 *
 * Zusammenhang:
 * Dieser Helfer bereitet die spätere Stufenlogik von `heating-rod-control.js` vor. Ein
 * Heizstab darf nur eine Stufe bekommen, die PV-/Gesamtbudget und Speicherreserve erlaubt.
 */
export declare function chooseLargestStageWithinBudget(stages: HeatingRodStageConfig[], budgetW: Watt): HeatingRodStageConfig | null;
/**
 * Code-Teil: isHeatingRodStorageReserveActive
 *
 * Zweck:
 * Prüft, ob ein Heizstab aus Sicht der Speicherreserve blockiert werden muss.
 *
 * Zusammenhang:
 * Wenn Speicherentladung nicht erlaubt ist oder der SoC unter der Reserve liegt, darf der
 * Heizstab nicht durch Speicherleistung gestützt werden. Diese Regel schützt genau den
 * App-Center-Wert „Speicher-Reserve“.
 */
export declare function isHeatingRodStorageReserveActive(input: HeatingRodDecisionInput): boolean;
/**
 * Code-Teil: evaluateHeatingRodDecision
 *
 * Zweck:
 * Ermittelt eine typisierte Heizstabentscheidung aus verfügbarem Budget und Gerätekonfig.
 *
 * Priorität:
 * 1. Ausgeschaltete oder deaktivierte Geräte bleiben aus.
 * 2. Speicherreserve blockiert, wenn SoC/Regel das verlangt.
 * 3. Ohne Netzfreigabe zählt nur PV-Budget.
 * 4. Mit Netzfreigabe darf das Gesamtbudget genutzt werden.
 * 5. Gewählt wird die größte Stufe, die ins Budget passt.
 *
 * Wichtig:
 * Diese Funktion wird in 0.7.62 nur getestet, aber noch nicht in die Runtime eingebaut.
 */
export declare function evaluateHeatingRodDecision(input: HeatingRodDecisionInput): HeatingRodDecision;
/**
 * Datenvertrag: HeatingRodLegacyRemovalPlanInput
 *
 * Zweck:
 * Beschreibt die minimalen Diagnosewerte, die nötig sind, um den alten
 * JavaScript-Heizstab-Referenzpfad als Cleanup-Kandidat zu bewerten.
 *
 * Zusammenhang:
 * Diese Bewertung wird von `ems/modules/heating-rod-control.js` genutzt, um zu
 * entscheiden, ob die alte JS-Referenz nur noch Diagnose/Notfallback ist oder ob sie
 * vorübergehend weiterhin als Sicherheitsreferenz benötigt wird.
 */
export interface HeatingRodLegacyRemovalPlanInput {
    readonly normalPathReady?: boolean;
    readonly legacyCleanupReady?: boolean;
    readonly hardSafetyBlockCount?: number;
    readonly hardFallbackCount?: number;
    readonly referenceMismatchCount?: number;
    readonly blockingReferenceMismatchCount?: number;
    readonly fallbackCount?: number;
    readonly activeCount?: number;
    readonly jsFallbackMode?: string;
    readonly legacyJsPathRole?: string;
}
/** Ergebnis: alter JS-Heizstabpfad als Entfernungskandidat oder weiter als Notreferenz. */
export interface HeatingRodLegacyRemovalPlan {
    readonly source: 'heating-rod-legacy-js-removal-plan-v1';
    readonly ready: boolean;
    readonly status: 'ready-for-legacy-js-reference-removal' | 'cleanup-waiting-for-normal-path' | 'cleanup-blocked-by-hard-fallbacks' | 'cleanup-blocked-by-reference-mismatch';
    readonly normalPathReady: boolean;
    readonly legacyCleanupReady: boolean;
    readonly decisionImpact: 'none' | 'diagnostic-only' | 'blocks-until-normal-ready';
    readonly jsFallbackMode: 'hard-blockers-only' | 'normal-safety-fallback';
    readonly legacyJsPathRole: 'emergency-fallback-and-diagnostics' | 'diagnostic-and-emergency-fallback' | 'safety-reference';
    readonly canRemoveReferenceGate: boolean;
    readonly canRemoveLegacyDecisionBranch: boolean;
    readonly keepJsFor: readonly string[];
    readonly removeCandidates: readonly string[];
    readonly blockers: readonly string[];
    readonly warnings: readonly string[];
    readonly referenceMismatchCount: number;
    readonly blockingReferenceMismatchCount: number;
    readonly hardSafetyBlockCount: number;
    readonly hardFallbackCount: number;
    readonly nextAction: string;
}
/**
 * Code-Teil: buildHeatingRodLegacyRemovalPlan
 *
 * Zweck:
 * Bewertet typisiert, ob der alte JS-Heizstab-Referenzpfad aus dem normalen
 * Entscheidungsweg herausgenommen werden darf.
 *
 * Zusammenhang:
 * 0.7.115 nutzt diese Funktion produktiv als Diagnose-/Cleanup-Helfer. Sie schaltet
 * keine Heizstabstufe selbst, sondern liefert nur die klare Entscheidungsvorlage:
 * „TS ist Normalpfad, JS bleibt nur Notfallback/Diagnose“ oder „JS muss noch warten“.
 *
 * Sicherheitsregel:
 * Der alte JS-Pfad wird nicht entfernt, solange harte Fallbacks, harte Schutzblocker
 * oder blockierende Referenzmismatches vorhanden sind.
 */
export declare function buildHeatingRodLegacyRemovalPlan(input: HeatingRodLegacyRemovalPlanInput): HeatingRodLegacyRemovalPlan;
//# sourceMappingURL=heating-rod-decision.d.ts.map