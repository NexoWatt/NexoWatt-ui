/**
 * Datei: src-ts/contracts/license.ts
 *
 * Zweck:
 * Vertrag für Lizenzstatus und Lizenzspeicherung.
 *
 * Kritische Regel:
 * Maskierte Werte wie "********", "protected" oder "encrypted" dürfen niemals als
 * echter Lizenzschlüssel gespeichert werden. Diese Regel verhindert, dass ioBroker/Admin
 * einen echten Schlüssel durch einen Platzhalter überschreibt.
 */

export type LicenseTier = 'none' | 'home' | 'pro' | 'farm' | 'business';

export type LicenseStatus = 'missing' | 'valid' | 'expired' | 'invalid' | 'masked-placeholder';

export interface LicenseState {
  status: LicenseStatus;
  tier: LicenseTier;
  expiresAt?: string;
  owner?: string;
  features: string[];
  message?: string;
}

/** Ergebnis einer Lizenzprüfung. */
export interface LicenseValidationResult {
  /** True, wenn die Lizenz technisch gültig ist. */
  ok: boolean;

  /** Alias für ältere Test-/Beispielwerte; langfristig soll ok verwendet werden. */
  valid?: boolean;

  status: LicenseStatus;
  tier: LicenseTier;
  reason?: string;
  message?: string;

  /** True, wenn der eingegebene Wert nur ein Admin-Platzhalter wie ******** ist. */
  isMaskedInput?: boolean;

  /** Wenn true, darf der gelesene Lizenzwert nicht gespeichert werden (z. B. maskierter Admin-Platzhalter). */
  mustNotStore?: boolean;
}
