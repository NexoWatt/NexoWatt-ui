import type { FeatureVisibilityState, EvcsPresenceProof, StorageFarmPresenceProof } from '../contracts/features';

/**
 * Datei: src-ts/frontend/customer-feature-visibility.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der kundenseitigen Feature-Sichtbarkeit vor.
 *
 * Zusammenhang:
 * Das LIVE-Dashboard, History, SmartHome und das Hamburger-Menü dürfen nur Funktionen
 * anzeigen, die in der konkreten Kundenanlage wirklich vorhanden sind. Diese Datei ist
 * noch nicht produktiv verdrahtet, dokumentiert aber die spätere gemeinsame Regel.
 */

/** Eingabe für die kundenseitige Sichtbarkeitsentscheidung. */
export interface CustomerFeatureVisibilityInput {
  readonly evcsProofs?: ReadonlyArray<EvcsPresenceProof | undefined>;
  readonly storageFarmEnabled?: boolean;
  readonly storageFarmProofs?: ReadonlyArray<StorageFarmPresenceProof | undefined>;
  readonly smartHomeEnabled?: boolean;
  readonly weatherEnabled?: boolean;
  readonly weatherHasData?: boolean;
  readonly aiAdvisorInstalled?: boolean;
  readonly aiAdvisorCustomerEnabled?: boolean;
}

/** Prüft, ob ein optionaler Datenpunkttext wirklich belegt ist. */
function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Code-Teil: hasRealEvcsProof
 *
 * Zweck:
 * Erkennt, ob ein Ladepunkt wirklich existiert.
 *
 * Wichtig:
 * Ein alter 0-W-State oder ein altes Flag reicht nicht. EVCS darf im Kundenfrontend
 * nur sichtbar werden, wenn ein echter Mess- oder Steuer-Datenpunkt vorhanden ist.
 */
export function hasRealEvcsProof(proof: EvcsPresenceProof | undefined): boolean {
  if (!proof) return false;
  if (proof.hasAnyRealDatapoint) return true;
  return hasText(proof.measuredPowerDp) || hasText(proof.controlDp);
}

/**
 * Code-Teil: hasRealStorageFarmProof
 *
 * Zweck:
 * Erkennt, ob ein Speicherfarm-Speicher wirklich konfiguriert ist.
 *
 * Wichtig:
 * Eine Speicherfarm darf nicht allein durch alte Runtime-States sichtbar werden.
 */
export function hasRealStorageFarmProof(proof: StorageFarmPresenceProof | undefined): boolean {
  if (!proof) return false;
  if (proof.hasAnyRealDatapoint) return true;
  return hasText(proof.socDp) || hasText(proof.chargeDp) || hasText(proof.dischargeDp) || hasText(proof.signedPowerDp);
}

/**
 * Code-Teil: buildCustomerFeatureVisibility
 *
 * Zweck:
 * Baut die kundenseitige Feature-Sichtbarkeit aus Nachweisen und Kundenschaltern.
 *
 * Zusammenhang:
 * Späterer Kandidat für die Migration verstreuter Checks aus `www/app.js`,
 * `www/cockpit-shell.js`, `www/history.js` und Unterseiten.
 */
export function buildCustomerFeatureVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityState {
  const hasEvcs = (input.evcsProofs ?? []).some(hasRealEvcsProof);
  const hasStorageFarm = input.storageFarmEnabled === true && (input.storageFarmProofs ?? []).some(hasRealStorageFarmProof);
  return {
    hasEvcs,
    hasStorageFarm,
    hasSmartHome: input.smartHomeEnabled === true,
    hasWeather: input.weatherEnabled === true && input.weatherHasData === true,
    hasAiAdvisor: input.aiAdvisorInstalled === true && input.aiAdvisorCustomerEnabled !== false,
  };
}
