'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/resolvers/feature-visibility-resolver.ts
 * Quell-Hash: sha256:b87c5099711ac35a8d577f222477da4496e887eb39a3cf8f3baf87586a61c27b
 * Erzeugung: npm run sync:ts-resolver-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer TypeScript-Resolver-Quelle.
 * Sie wird in 0.7.69 noch nicht produktiv geladen. Sie bereitet den späteren
 * Energiefluss-/Feature-Sichtbarkeits-Vergleichsmodus vor.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/resolvers/ oder den benötigten src-ts/utils/ vornehmen.
 * 2. npm run sync:ts-resolver-mirrors ausführen.
 * 3. npm run test:resolver-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRealEvcsPresenceProof = hasRealEvcsPresenceProof;
exports.hasRealStorageFarmPresenceProof = hasRealStorageFarmPresenceProof;
exports.deriveCustomerFeatureVisibility = deriveCustomerFeatureVisibility;
/** Prüft, ob ein optionales DP-Feld wirklich Text enthält. */
function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
/**
 * Code-Teil: hasRealEvcsPresenceProof
 *
 * Zweck:
 * Prüft, ob ein Ladepunkt wirklich vorhanden ist.
 *
 * Zusammenhang:
 * Diese Regel schützt Dashboard, History, Menü und EVCS-Seite davor, eine Wallbox zu
 * zeigen, wenn nur alte Default-States oder Flags existieren.
 *
 * Wichtig:
 * Ein reines Feature-Flag reicht nicht. Sichtbar wird EVCS nur bei einem echten
 * Mess- oder Steuer-Datenpunkt oder einem expliziten Nachweis `hasAnyRealDatapoint`.
 */
function hasRealEvcsPresenceProof(proof) {
    if (!proof)
        return false;
    if (proof.hasAnyRealDatapoint === true)
        return true;
    return hasText(proof.measuredPowerDp) || hasText(proof.controlDp);
}
/**
 * Code-Teil: hasRealStorageFarmPresenceProof
 *
 * Zweck:
 * Prüft, ob ein Speicherfarm-Speicher wirklich konfiguriert ist.
 *
 * Zusammenhang:
 * Die Speicherfarm darf nur sichtbar werden, wenn der Installer sie aktiviert hat und
 * mindestens ein Farmspeicher echte SoC-/Leistungs-Datenpunkte besitzt.
 */
function hasRealStorageFarmPresenceProof(proof) {
    if (!proof)
        return false;
    if (proof.hasAnyRealDatapoint === true)
        return true;
    return hasText(proof.socDp) || hasText(proof.chargeDp) || hasText(proof.dischargeDp) || hasText(proof.signedPowerDp);
}
/**
 * Code-Teil: deriveCustomerFeatureVisibility
 *
 * Zweck:
 * Leitet die finale Sichtbarkeit der Kundenfunktionen aus Flags und Nachweisen ab.
 *
 * Regeln:
 * - EVCS benötigt Aktivierung plus echten Ladepunktnachweis.
 * - Speicherfarm benötigt Aktivierung plus echten Farmspeicher-Nachweis.
 * - Wetter benötigt Aktivierung und vorhandene Wetterdaten.
 * - KI-Berater benötigt aktive App und darf vom Kunden nicht ausgeschaltet sein.
 *
 * TypeScript-Ziel:
 * Diese Funktion ist später die gemeinsame Quelle für die verstreuten UI-Checks.
 */
function deriveCustomerFeatureVisibility(input) {
    const hasEvcs = input.evcsEnabled === true && (input.evcsProofs ?? []).some(hasRealEvcsPresenceProof);
    const hasStorageFarm = input.storageFarmEnabled === true && (input.storageFarmProofs ?? []).some(hasRealStorageFarmPresenceProof);
    const aiInstalled = input.aiAdvisorAppEnabled === true || input.aiAdvisorInstalled === true;
    return {
        hasEvcs,
        hasStorageFarm,
        hasSmartHome: input.smartHomeEnabled === true,
        hasWeather: input.weatherEnabled === true && input.weatherHasData === true,
        hasAiAdvisor: aiInstalled && input.aiAdvisorCustomerEnabled !== false,
    };
}
