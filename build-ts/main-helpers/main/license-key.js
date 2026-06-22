"use strict";
/**
 * Datei: src-ts/main/license-key.ts
 *
 * Zweck:
 * Echte TypeScript-Helfer für die spätere sichere Behandlung von Lizenzschlüsseln in main.js.
 *
 * Zusammenhang:
 * Nach dem protectedNative/encryptedNative-Fehler darf ein maskierter Wert wie `********`
 * niemals als echter Lizenzkey gespeichert oder geprüft werden.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMainLicenseInput = normalizeMainLicenseInput;
exports.isMainMaskedLicenseValue = isMainMaskedLicenseValue;
exports.analyzeMainLicenseInput = analyzeMainLicenseInput;
/** Code-Teil: normalizeMainLicenseInput. Zweck: Entfernt Whitespace und vereinheitlicht Lizenzinput. */
function normalizeMainLicenseInput(value) {
    return String(value ?? '').trim();
}
/**
 * Code-Teil: isMainMaskedLicenseValue
 *
 * Zweck:
 * Erkennt Admin-/UI-Platzhalter, die niemals als echter Lizenzschlüssel gelten dürfen.
 */
function isMainMaskedLicenseValue(value) {
    const v = normalizeMainLicenseInput(value).toLowerCase();
    if (!v)
        return false;
    if (/^\*{3,}$/.test(v))
        return true;
    return ['protected', 'encrypted', 'hidden', 'redacted', '********'].includes(v);
}
/**
 * Code-Teil: analyzeMainLicenseInput
 *
 * Zweck:
 * Bewertet, ob ein Lizenzinput gespeichert werden darf.
 *
 * Wichtig:
 * Maskierte Werte werden abgelehnt, damit ein echter vorhandener Key nicht überschrieben wird.
 */
function analyzeMainLicenseInput(value) {
    const normalized = normalizeMainLicenseInput(value);
    const isMasked = isMainMaskedLicenseValue(normalized);
    return {
        raw: String(value ?? ''),
        normalized,
        isEmpty: normalized.length === 0,
        isMasked,
        shouldStore: normalized.length > 0 && !isMasked,
    };
}
