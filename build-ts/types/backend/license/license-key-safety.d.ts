import type { LicenseValidationResult } from '../../contracts';
/**
 * Code-Teil: normalizeLicenseInput
 *
 * Zweck:
 * Entfernt Whitespace und wandelt unbekannte Werte in einen sicheren String um.
 */
export declare function normalizeLicenseInput(input: unknown): string;
/**
 * Code-Teil: isMaskedLicenseValue
 *
 * Zweck:
 * Erkennt maskierte Admin-/UI-Platzhalter.
 *
 * Wichtig:
 * `********` und ähnliche Werte müssen blockiert werden, damit sie keinen echten Schlüssel überschreiben.
 */
export declare function isMaskedLicenseValue(input: unknown): boolean;
/** Entscheidet, ob ein eingegebener Lizenzwert gespeichert werden darf. */
export declare function shouldStoreLicenseInput(input: unknown): boolean;
/**
 * Code-Teil: buildMaskedLicenseValidationResult
 *
 * Zweck:
 * Erstellt ein typisiertes Ergebnis für erkannte Lizenz-Platzhalter.
 */
export declare function buildMaskedLicenseValidationResult(): LicenseValidationResult;
//# sourceMappingURL=license-key-safety.d.ts.map