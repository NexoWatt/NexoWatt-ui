import type { EvcsPresenceProof, FeatureVisibilityState, StorageFarmPresenceProof } from '../../contracts/features';

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
  readonly evcsEnabled?: boolean;
  readonly smartHomeEnabled?: boolean;
  readonly weatherEnabled?: boolean;
  readonly aiAdvisorAppEnabled?: boolean;
  readonly aiAdvisorCustomerEnabled?: boolean;
  readonly storageFarmEnabled?: boolean;
  readonly evcsProofs?: readonly EvcsPresenceProof[];
  readonly storageFarmProofs?: readonly StorageFarmPresenceProof[];
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
  const hasEvcs = input.evcsEnabled === true && hasRealEvcsProof(input.evcsProofs);
  const hasStorageFarm = input.storageFarmEnabled === true && hasRealStorageFarmProof(input.storageFarmProofs);

  return {
    hasEvcs,
    hasStorageFarm,
    hasSmartHome: input.smartHomeEnabled === true,
    hasWeather: input.weatherEnabled === true,
    hasAiAdvisor: input.aiAdvisorAppEnabled === true && input.aiAdvisorCustomerEnabled !== false,
  };
}
