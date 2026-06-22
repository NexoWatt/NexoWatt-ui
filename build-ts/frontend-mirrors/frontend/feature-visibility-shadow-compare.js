/** Reihenfolge ist bewusst stabil, damit Logs und Tests reproduzierbar bleiben. */
const FEATURE_KEYS = [
    'hasEvcs',
    'hasStorageFarm',
    'hasSmartHome',
    'hasWeather',
    'hasAiAdvisor',
];
/**
 * Code-Teil: boolOrFalse
 *
 * Zweck:
 * Normalisiert optionale Feature-Werte zu echten Booleans.
 *
 * Zusammenhang:
 * Bestehende JS-Runtime kann Werte aus `window.__nw*`, Config oder State-Snapshots
 * liefern. Für den Vergleich muss daraus ein eindeutiger boolean werden.
 *
 * Wichtig:
 * Fehlende Werte werden hier als `false` gewertet. Das ist für Feature-Sichtbarkeit
 * sicherer als `true`, weil im Kundenfrontend nur vorhandene Anlagenfunktionen
 * sichtbar sein dürfen.
 */
function boolOrFalse(value) {
    return value === true;
}
/**
 * Code-Teil: mismatchMessage
 *
 * Zweck:
 * Baut eine fachliche Diagnose für eine Abweichung.
 *
 * Zusammenhang:
 * Diese Texte helfen später im Shadow-Modus, direkt zu erkennen, ob z. B. EVCS oder
 * Speicherfarm durch alte Flags anders bewertet werden als durch die neue TS-Logik.
 */
function mismatchMessage(key, legacyValue, nextValue) {
    const featureName = {
        hasEvcs: 'EVCS/Ladestation',
        hasStorageFarm: 'Speicherfarm',
        hasSmartHome: 'SmartHome',
        hasWeather: 'Wetter',
        hasAiAdvisor: 'KI-Berater',
    };
    return `${featureName[key]} weicht ab: alte JS-Logik=${legacyValue ? 'sichtbar' : 'unsichtbar'}, neue TS-Logik=${nextValue ? 'sichtbar' : 'unsichtbar'}.`;
}
/**
 * Code-Teil: compareFeatureVisibility
 *
 * Zweck:
 * Vergleicht zwei vollständige Sichtbarkeitszustände.
 *
 * Zusammenhang:
 * Späterer Kandidat für einen Shadow-Compare in `www/app.js`. Die bestehende Runtime
 * berechnet weiter die echte Anzeige; die TS-Logik läuft parallel und liefert nur
 * Diagnose, falls sich Entscheidungen unterscheiden.
 *
 * Wichtig:
 * Diese Funktion verändert keine DOM-Elemente und keine globalen Flags. Sie ist
 * dadurch risikoarm und kann vor einer produktiven Umstellung getestet werden.
 */
export function compareFeatureVisibility(legacy, next) {
    const mismatches = [];
    for (const key of FEATURE_KEYS) {
        const legacyValue = boolOrFalse(legacy[key]);
        const nextValue = boolOrFalse(next[key]);
        if (legacyValue !== nextValue) {
            mismatches.push({
                key,
                legacyValue,
                nextValue,
                messageDe: mismatchMessage(key, legacyValue, nextValue),
            });
        }
    }
    const matches = mismatches.length === 0;
    return {
        matches,
        mismatches,
        summaryDe: matches
            ? 'Feature-Sichtbarkeit: alte JS-Logik und neue TS-Logik stimmen überein.'
            : `Feature-Sichtbarkeit: ${mismatches.length} Abweichung(en) zwischen JS- und TS-Logik.`,
    };
}
/**
 * Code-Teil: hasBlockingVisibilityMismatch
 *
 * Zweck:
 * Erkennt Abweichungen, die für Kundenanlagen besonders kritisch wären.
 *
 * Zusammenhang:
 * EVCS und Speicherfarm dürfen niemals sichtbar werden, wenn sie nicht vorhanden sind.
 * Darum werden Abweichungen bei diesen Features später als besonders wichtig geloggt.
 */
export function hasBlockingVisibilityMismatch(result) {
    return result.mismatches.some((item) => item.key === 'hasEvcs' || item.key === 'hasStorageFarm');
}
/**
 * Code-Teil: formatFeatureVisibilityShadowLog
 *
 * Zweck:
 * Baut einen kompakten deutschen Logtext aus dem Vergleichsergebnis.
 *
 * Zusammenhang:
 * Für den späteren Runtime-Shadow-Modus wollen wir keine großen Objekte ungefiltert
 * in die Browserkonsole schreiben, sondern verständliche kurze Diagnosezeilen.
 */
export function formatFeatureVisibilityShadowLog(result) {
    if (result.matches)
        return result.summaryDe;
    return `${result.summaryDe} ${result.mismatches.map((item) => item.messageDe).join(' ')}`;
}
