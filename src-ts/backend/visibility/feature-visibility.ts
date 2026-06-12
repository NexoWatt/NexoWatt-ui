import type { EvcsPresenceProof, FeatureVisibilityState, StorageFarmPresenceProof } from '../../contracts/features';
import { deriveCustomerFeatureVisibility, hasRealEvcsPresenceProof, hasRealStorageFarmPresenceProof } from '../../resolvers/feature-visibility-resolver';

/**
 * Datei: src-ts/backend/visibility/feature-visibility.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für die spätere Feature-Sichtbarkeit aus `main.js` und
 * `www/app.js`.
 *
 * Zusammenhang:
 * In den letzten UI-Versionen wurden zeitweise EVCS oder Speicherfarm angezeigt, obwohl
 * die Kundenanlage keine Wallbox oder Farm hatte. Diese Datei hält die fachlichen Regeln
 * typisiert fest, bevor wir die produktive Sichtbarkeitslogik migrieren.
 *
 * Wichtig:
 * Alte Default-States dürfen kein Feature sichtbar machen. Sichtbar wird ein Feature erst,
 * wenn es aktiv ist und ein echter Konfigurationsnachweis vorhanden ist.
 */

/** Eingabe für die Sichtbarkeitsableitung aus Config, Kundenschalter und Nachweisen. */
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
 * Prüft, ob mindestens ein echter Ladepunkt-Datenpunkt vorhanden ist.
 *
 * Zusammenhang:
 * Das Kundenfrontend darf EVCS nur zeigen, wenn nicht nur ein altes Flag existiert,
 * sondern tatsächlich ein Ladepunkt mit Mess- oder Steuer-DP konfiguriert ist.
 */
export function hasRealEvcsProof(proofs: readonly EvcsPresenceProof[] | undefined): boolean {
  return !!(proofs && proofs.some((proof) => proof.hasAnyRealDatapoint && !!(proof.measuredPowerDp || proof.controlDp)));
}

/**
 * Code-Teil: hasRealStorageFarmProof
 *
 * Zweck:
 * Prüft, ob mindestens ein echter Speicherfarm-Speicher vorhanden ist.
 *
 * Zusammenhang:
 * Die Speicherfarm darf nicht nur wegen alter Runtime-States oder leerer Default-Config
 * im Kundenfrontend erscheinen. Es muss eine echte Speicher-Konfiguration vorliegen.
 */
export function hasRealStorageFarmProof(proofs: readonly StorageFarmPresenceProof[] | undefined): boolean {
  return !!(proofs && proofs.some((proof) => proof.hasAnyRealDatapoint && !!(proof.socDp || proof.chargeDp || proof.dischargeDp || proof.signedPowerDp)));
}

/**
 * Code-Teil: deriveFeatureVisibility
 *
 * Zweck:
 * Leitet die finale Feature-Sichtbarkeit für das Kundenfrontend ab.
 *
 * Regeln:
 * - EVCS benötigt Aktivierung plus echten Ladepunktnachweis.
 * - Speicherfarm benötigt Aktivierung plus echten Farm-Speichernachweis.
 * - KI-Berater benötigt App-Aktivierung plus Kundenschalter.
 * - SmartHome und Wetter folgen ihren jeweiligen Aktivierungsflags.
 *
 * Wichtig für spätere Runtime-Migration:
 * Diese Funktion ist bewusst konservativ. Unsichtbar ist sicherer als ein Feature zu
 * zeigen, das in der Kundenanlage gar nicht vorhanden ist.
 */
export function deriveFeatureVisibility(input: FeatureVisibilityInput): FeatureVisibilityState {
  return deriveCustomerFeatureVisibility({
    evcsEnabled: input.evcsEnabled,
    evcsProofs: input.evcsProofs,
    storageFarmEnabled: input.storageFarmEnabled,
    storageFarmProofs: input.storageFarmProofs,
    smartHomeEnabled: input.smartHomeEnabled,
    weatherEnabled: input.weatherEnabled,
    weatherHasData: input.weatherEnabled === true,
    aiAdvisorAppEnabled: input.aiAdvisorAppEnabled,
    aiAdvisorCustomerEnabled: input.aiAdvisorCustomerEnabled,
  });
}
