"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideMainLicenseInput = decideMainLicenseInput;
exports.buildMainMaskedLicenseResult = buildMainMaskedLicenseResult;
const license_key_safety_1 = require("../license/license-key-safety");
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
function decideMainLicenseInput(input) {
    const normalized = (0, license_key_safety_1.normalizeLicenseInput)(input);
    const masked = (0, license_key_safety_1.isMaskedLicenseValue)(normalized);
    const canStore = (0, license_key_safety_1.shouldStoreLicenseInput)(normalized);
    return {
        normalized,
        masked,
        canStore,
        reason: !normalized ? 'empty' : (masked ? 'masked-placeholder' : 'store-allowed'),
    };
}
/**
 * Code-Teil: buildMainMaskedLicenseResult
 *
 * Zweck:
 * Liefert das bekannte Validierungsergebnis für maskierte Lizenzwerte an main.js-kompatible Stellen.
 */
function buildMainMaskedLicenseResult() {
    return (0, license_key_safety_1.buildMaskedLicenseValidationResult)();
}
