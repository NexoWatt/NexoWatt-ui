/**
 * Datei: src-ts/frontend/feature-visibility-diagnostics.ts
 *
 * Zweck:
 * Bereitet die spätere Diagnose der kundenseitigen Feature-Sichtbarkeit im Frontend vor.
 *
 * Zusammenhang:
 * Nach mehreren UI-Fixes müssen wir nachvollziehen können, warum EVCS, Speicherfarm,
 * SmartHome, Wetter oder KI-Berater sichtbar oder unsichtbar sind. Diese Datei ist ein
 * reiner TypeScript-Helfer ohne DOM-Zugriff und wird als MJS-Spiegel gebaut, aber in
 * 0.7.68 noch nicht produktiv vom Browser geladen.
 *
 * Wichtig:
 * Diese Diagnose darf keine Feature-Flags setzen. Sie erklärt nur die Entscheidung,
 * damit spätere TypeScript-Migrationen nicht wieder Funktionen anzeigen, die in der
 * Kundenanlage gar nicht vorhanden sind.
 */
/** Fachlicher Name eines Features im Kundenfrontend. */
export type CustomerFeatureName = 'evcs' | 'storageFarm' | 'smartHome' | 'weather' | 'aiAdvisor';
/** Vereinfachter Sichtbarkeitszustand, der aus Frontend-/Backend-Helfern kommen kann. */
export interface CustomerFeatureVisibilitySnapshot {
    readonly hasEvcs: boolean;
    readonly hasStorageFarm: boolean;
    readonly hasSmartHome: boolean;
    readonly hasWeather: boolean;
    readonly hasAiAdvisor: boolean;
}
/** Zusatzdaten, mit denen die Diagnose begründen kann, warum ein Feature sichtbar/unsichtbar ist. */
export interface CustomerFeatureDiagnosticsInput {
    readonly visibility: CustomerFeatureVisibilitySnapshot;
    readonly evcsEnabled?: boolean;
    readonly evcsProofCount?: number;
    readonly storageFarmEnabled?: boolean;
    readonly storageFarmProofCount?: number;
    readonly smartHomeEnabled?: boolean;
    readonly weatherEnabled?: boolean;
    readonly weatherHasData?: boolean;
    readonly aiAdvisorInstalled?: boolean;
    readonly aiAdvisorCustomerEnabled?: boolean;
}
/** Einzelne Diagnosezeile für Debug-Ausgaben oder spätere UI-Hinweise. */
export interface CustomerFeatureDiagnostic {
    readonly feature: CustomerFeatureName;
    readonly visible: boolean;
    readonly reasonDe: string;
    readonly safeToShow: boolean;
}
/**
 * Code-Teil: buildCustomerFeatureDiagnostics
 *
 * Zweck:
 * Erzeugt verständliche deutsche Diagnosezeilen zur Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Diese Funktion ist der nächste sichere Schritt nach den Frontend-MJS-Spiegeln: Sie
 * kann später im App-Center oder Debugbereich anzeigen, warum z. B. EVCS oder Farm
 * nicht erscheint, ohne die eigentliche Dashboard-Logik zu verändern.
 *
 * Wichtig:
 * `visible` kommt aus dem bereits berechneten Sichtbarkeitszustand. Diese Funktion
 * entscheidet nicht neu, sondern erklärt nur. Dadurch bleibt sie risikoarm.
 */
export declare function buildCustomerFeatureDiagnostics(input: CustomerFeatureDiagnosticsInput): CustomerFeatureDiagnostic[];
/**
 * Code-Teil: featureVisibilitySummaryText
 *
 * Zweck:
 * Baut eine kompakte Textzusammenfassung für spätere Debug-/Statusanzeigen.
 *
 * Zusammenhang:
 * Dieser Text kann später im App-Center oder in Diagnose-States verwendet werden, ohne
 * dass dort erneut Feature-Sichtbarkeitslogik geschrieben werden muss.
 */
export declare function featureVisibilitySummaryText(diagnostics: ReadonlyArray<CustomerFeatureDiagnostic>): string;
//# sourceMappingURL=feature-visibility-diagnostics.d.ts.map