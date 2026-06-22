import type { FeatureVisibilityState, EvcsPresenceProof, StorageFarmPresenceProof } from '../../contracts';
/**
 * Code-Teil: hasEvcsPresence
 *
 * Zweck:
 * Entscheidet, ob mindestens ein echter Ladepunkt mit Mess- oder Steuer-Datenpunkt vorhanden ist.
 *
 * Wichtig:
 * Ein altes Flag wie `evcsAvailable` reicht nicht. Ohne echten DP darf EVCS im Kundenfrontend nicht sichtbar sein.
 */
export declare function hasEvcsPresence(proofs: ReadonlyArray<EvcsPresenceProof | undefined>): boolean;
/**
 * Code-Teil: hasStorageFarmPresence
 *
 * Zweck:
 * Entscheidet, ob wirklich ein Speicherfarm-Speicher konfiguriert ist.
 *
 * Wichtig:
 * Die Farm wird nur sichtbar, wenn mindestens ein Farmspeicher echte Datenpunkte besitzt.
 */
export declare function hasStorageFarmPresence(proofs: ReadonlyArray<StorageFarmPresenceProof | undefined>): boolean;
/** Eingaben für die zentrale Sichtbarkeitsentscheidung. */
export interface BuildFeatureVisibilityInput {
    readonly evcsProofs?: ReadonlyArray<EvcsPresenceProof | undefined>;
    readonly storageFarmEnabled?: boolean;
    readonly storageFarmProofs?: ReadonlyArray<StorageFarmPresenceProof | undefined>;
    readonly smartHomeEnabled?: boolean;
    readonly weatherEnabled?: boolean;
    readonly weatherHasData?: boolean;
    readonly aiAdvisorInstalled?: boolean;
    readonly aiAdvisorCustomerEnabled?: boolean;
}
/**
 * Code-Teil: buildFeatureVisibilityState
 *
 * Zweck:
 * Baut eine zentrale Feature-Sichtbarkeit für das Kundenfrontend.
 *
 * Zusammenhang:
 * Dieser Helfer ist der spätere Kandidat für die Zusammenführung verstreuter UI-Checks in
 * `main.js`, `www/app.js`, `www/cockpit-shell.js` und den Unterseiten.
 */
export declare function buildFeatureVisibilityState(input: BuildFeatureVisibilityInput): FeatureVisibilityState;
//# sourceMappingURL=feature-visibility.d.ts.map