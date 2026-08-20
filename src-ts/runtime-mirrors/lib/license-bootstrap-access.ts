// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/license-bootstrap-access.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * lib/license-bootstrap-access.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: ca4174958d77e6c3430c9811c8c6d208929508b3555ceb7ee7e7508667f77567
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/license-bootstrap-access.ts
 * Quell-Hash: sha256:8a24e6dad033422a7e30382063e243477c0aa0705291c062ef04e31ef030873d
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/license-bootstrap-access.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
"use strict";
/**
 * Minimaler Bootstrap-Vertrag für die EOS-Lizenzaktivierung.
 *
 * Die allgemeine EOS-Lizenzsperre darf ausschließlich die hier aufgeführten
 * Seiten, statischen Hilfsdateien und streng geschützten Auth-/Lizenz-Endpunkte
 * passieren lassen. Die Lizenzdaten bleiben weiterhin durch `license.manage`
 * geschützt; freigegeben wird nur der technische Weg zur Anmeldung und
 * Aktivierung eines neuen Systems.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LICENSE_BOOTSTRAP_CONTRACT = void 0;
exports.isUnlicensedLicenseBootstrapRequest = isUnlicensedLicenseBootstrapRequest;
const LICENSE_BOOTSTRAP_GET_PATHS = new Set([
    '/license',
    '/license.html',
    '/static/license.html',
    '/static/styles.css',
    '/static/auth.js',
    '/static/nw-i18n.js',
    '/static/license.js',
    '/static/nexowatt-logo.png',
    '/static/i18n/de.json',
    '/static/i18n/nl.json',
    '/static/i18n/en.json',
    '/favicon.ico',
    '/apple-touch-icon.png',
]);
const LICENSE_BOOTSTRAP_API_METHODS = new Map([
    ['/api/strict-auth/status', new Set(['GET', 'HEAD', 'OPTIONS'])],
    ['/api/strict-auth/login', new Set(['POST', 'OPTIONS'])],
    ['/api/strict-auth/logout', new Set(['POST', 'OPTIONS'])],
    ['/api/locale', new Set(['GET', 'HEAD', 'OPTIONS'])],
    ['/api/license/info', new Set(['GET', 'HEAD', 'OPTIONS'])],
    ['/api/license/save', new Set(['POST', 'OPTIONS'])],
]);
/**
 * Code-Teil: normalizeLicenseBootstrapPath
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeLicenseBootstrapPath(req) {
    const raw = String(req?.path || req?.originalUrl || req?.url || '').trim();
    const separatorIndex = raw.search(/[?#]/);
    let pathname = (separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw) || '/';
    if (!pathname.startsWith('/'))
        pathname = `/${pathname}`;
    pathname = pathname.replace(/\/{2,}/g, '/');
    if (pathname.length > 1)
        pathname = pathname.replace(/\/+$/, '');
    return pathname;
}
/**
 * Liefert nur für den eng begrenzten Lizenz-Bootstrap `true`.
 * Andere EOS-Seiten, APIs und Konfigurationsdaten bleiben ohne gültige Lizenz
 * unverändert gesperrt.
 */
function isUnlicensedLicenseBootstrapRequest(req) {
    const pathname = normalizeLicenseBootstrapPath(req);
    const method = String(req?.method || 'GET').trim().toUpperCase() || 'GET';
    if ((method === 'GET' || method === 'HEAD') && LICENSE_BOOTSTRAP_GET_PATHS.has(pathname))
        return true;
    const apiMethods = LICENSE_BOOTSTRAP_API_METHODS.get(pathname);
    return !!apiMethods && apiMethods.has(method);
}
exports.LICENSE_BOOTSTRAP_CONTRACT = Object.freeze({
    getPaths: Object.freeze(Array.from(LICENSE_BOOTSTRAP_GET_PATHS)),
    apiPaths: Object.freeze(Array.from(LICENSE_BOOTSTRAP_API_METHODS.keys())),
});
