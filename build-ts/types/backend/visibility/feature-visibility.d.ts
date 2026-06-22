import type { EvcsPresenceProof, FeatureVisibilityState, StorageFarmPresenceProof } from '../../contracts/features';
/**
 * Datei: src-ts/backend/visibility/feature-visibility.ts
 *
 * Zweck:
 * Kompatibilitätsadapter für ältere TypeScript-Tests und frühe Migrationsschritte.
 * Die fachliche Quelle der Feature-Sichtbarkeit liegt jetzt zentral in:
 * `src-ts/backend/feature-visibility/feature-visibility.ts`.
 *
 * Warum diese Datei noch existiert:
 * Einige 0.7.63-Testdateien importieren noch aus `backend/visibility`. Damit diese
 * Tests nicht bei jedem Struktur-Refactoring angepasst werden müssen, leitet diese
 * Datei nur noch auf die kanonische Implementierung weiter.
 *
 * Wichtig für spätere Aufräumarbeiten:
 * Hier darf keine zweite Fachlogik entstehen. Wenn EVCS-/Speicherfarm-/KI-Sichtbarkeit
 * geändert wird, muss die Änderung in der kanonischen Datei passieren.
 */
/** Eingabe für die alte Import-Schnittstelle. */
export interface FeatureVisibilityInput {
    readonly evcsEnabled?: boolean | undefined;
    readonly smartHomeEnabled?: boolean | undefined;
    readonly weatherEnabled?: boolean | undefined;
    readonly aiAdvisorAppEnabled?: boolean | undefined;
    readonly aiAdvisorCustomerEnabled?: boolean | undefined;
    readonly storageFarmEnabled?: boolean | undefined;
    readonly evcsProofs?: readonly EvcsPresenceProof[] | undefined;
    readonly storageFarmProofs?: readonly StorageFarmPresenceProof[] | undefined;
}
/**
 * Code-Teil: hasRealEvcsProof
 *
 * Zweck:
 * Kompatibilitätsfunktion für ältere Tests. Die eigentliche Regel ist identisch zur
 * kanonischen Feature-Sichtbarkeit: EVCS zählt nur mit echtem Ladepunktnachweis.
 */
export declare function hasRealEvcsProof(proofs: readonly EvcsPresenceProof[] | undefined): boolean;
/**
 * Code-Teil: hasRealStorageFarmProof
 *
 * Zweck:
 * Kompatibilitätsfunktion für ältere Tests. Die Farm wird nur sichtbar, wenn sie aktiv
 * ist und echte Farm-Speicher-Datenpunkte vorhanden sind.
 */
export declare function hasRealStorageFarmProof(proofs: readonly StorageFarmPresenceProof[] | undefined): boolean;
/**
 * Code-Teil: deriveFeatureVisibility
 *
 * Zweck:
 * Alte API beibehalten, aber intern die kanonische TS-Implementierung nutzen.
 *
 * Zusammenhang:
 * Dieser Adapter verhindert doppelte Sichtbarkeitslogik. Später können alle Imports
 * direkt auf `backend/feature-visibility` umgestellt und diese Datei entfernt werden.
 */
export declare function deriveFeatureVisibility(input: FeatureVisibilityInput): FeatureVisibilityState;
//# sourceMappingURL=feature-visibility.d.ts.map