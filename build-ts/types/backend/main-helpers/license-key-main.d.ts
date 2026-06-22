/**
 * Datei: src-ts/backend/main-helpers/license-key-main.ts
 *
 * Zweck:
 * TypeScript-Helfer für die spätere Auslagerung der Lizenz-Key-Sicherheitslogik aus `main.js`.
 *
 * Zusammenhang:
 * Die Lizenz-API darf maskierte Admin-Platzhalter wie `********` nie als echten Lizenzschlüssel
 * speichern. Dieser Helfer bündelt die fachliche Regel für spätere Runtime-Übernahme.
 */
export interface MainLicenseInputDecision {
    readonly normalized: string;
    readonly masked: boolean;
    readonly canStore: boolean;
    readonly reason: 'empty' | 'masked-placeholder' | 'store-allowed';
}
/**
 * Code-Teil: decideMainLicenseInput
 *
 * Zweck:
 * Bewertet einen Lizenzwert, bevor `main.js` ihn speichert.
 *
 * Wichtig:
 * `********`, `protected`, `encrypted` usw. dürfen nicht gespeichert werden, weil sonst ein
 * gültiger Lizenzschlüssel überschrieben werden könnte.
 */
export declare function decideMainLicenseInput(input: unknown): MainLicenseInputDecision;
/**
 * Code-Teil: buildMainMaskedLicenseResult
 *
 * Zweck:
 * Liefert das bekannte Validierungsergebnis für maskierte Lizenzwerte an main.js-kompatible Stellen.
 */
export declare function buildMainMaskedLicenseResult(): import("../..").LicenseValidationResult;
//# sourceMappingURL=license-key-main.d.ts.map