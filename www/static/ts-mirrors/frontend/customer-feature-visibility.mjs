/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/frontend/customer-feature-visibility.ts
 * Quell-Hash: sha256:c6978ae4e7263f8e2a826066fe61df2e9c67f4868cc00cce93784d5a3a7fddf1
 * Erzeugung: npm run sync:ts-frontend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein browsernaher JavaScript-Modulspiegel der TypeScript-Quelle.
 * Sie wird in 0.7.67 noch nicht produktiv importiert, legt aber die spätere
 * sichere TS->JS-Migrationsstruktur für Frontend-Helfer fest.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/frontend/*.ts vornehmen.
 * 2. npm run sync:ts-frontend-mirrors ausführen.
 * 3. npm run test:ts-frontend-mirrors prüfen.
 */
/** Prüft, ob ein optionaler Datenpunkttext wirklich belegt ist. */
function hasText(value) {
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
export function hasRealEvcsProof(proof) {
    if (!proof)
        return false;
    if (proof.hasAnyRealDatapoint)
        return true;
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
export function hasRealStorageFarmProof(proof) {
    if (!proof)
        return false;
    if (proof.hasAnyRealDatapoint)
        return true;
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
export function buildCustomerFeatureVisibility(input) {
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
