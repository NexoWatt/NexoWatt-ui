// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/license.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * www/license.js
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
 * Original-Hash: 45d1f8654751fa239725e03383789753a5d3e74521e7409aa6f6a22a68be4f51
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
 * Quelle: src-ts/runtime-executables/www/license.ts
 * Quell-Hash: sha256:172dece835947a55fc0626c1556756e41ecbeb15e999e65f8d5ec24d992eb801
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/license.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
(function () {
    'use strict';
    const nwWindow = window;
    const el = {
        uuid: undefined,
        key: undefined,
        copyUuid: undefined,
        toggle: undefined,
        save: undefined,
        reload: undefined,
        status: undefined,
        back: undefined,
        instance: undefined,
    };
    let authorized = false;
    let busy = false;
/**
 * Code-Teil: asError
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function asError(error) {
        if (error instanceof Error)
            return error;
        return new Error(String(error || 'Unbekannter Fehler'));
    }
/**
 * Code-Teil: setStatus
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function setStatus(text, ok = null) {
        if (!el.status)
            return;
        el.status.textContent = String(text || '');
        el.status.classList.toggle('nw-status--ok', ok === true);
        el.status.classList.toggle('nw-status--bad', ok === false);
    }
/**
 * Code-Teil: setBusy
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function setBusy(next) {
        busy = next === true;
        if (el.save)
            el.save.disabled = busy || !authorized;
        if (el.reload)
            el.reload.disabled = busy;
        if (el.copyUuid)
            el.copyUuid.disabled = busy || !authorized || !String(el.uuid?.value || '').trim();
        if (el.key)
            el.key.disabled = busy || !authorized;
        if (el.toggle)
            el.toggle.disabled = busy || !authorized;
    }
/**
 * Code-Teil: clearSensitiveFields
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function clearSensitiveFields() {
        if (el.uuid)
            el.uuid.value = '';
        if (el.key) {
            el.key.value = '';
            el.key.type = 'password';
        }
        if (el.toggle) {
            el.toggle.textContent = 'Anzeigen';
            el.toggle.setAttribute('aria-pressed', 'false');
        }
    }
/**
 * Code-Teil: clearLegacyBrowserCache
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function clearLegacyBrowserCache() {
        // Frühere Builds legten den vollständigen Schlüssel im Browser ab. Jeder
        // Speicherzugriff liegt einzeln im try/catch, weil Browser ihn in lokalen,
        // eingebetteten oder besonders gehärteten Kontexten komplett verweigern können.
        const storageNames = ['localStorage', 'sessionStorage'];
        for (const storageName of storageNames) {
            try {
                const storage = storageName === 'localStorage' ? window.localStorage : window.sessionStorage;
                const remove = [];
                for (let index = 0; index < storage.length; index += 1) {
                    const key = storage.key(index);
                    if (key && key.startsWith('nexowatt-ui.licenseKey.'))
                        remove.push(key);
                }
                remove.forEach((key) => storage.removeItem(key));
            }
            catch (_error) { }
        }
    }
/**
 * Code-Teil: fetchJson
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function fetchJson(url, options = {}) {
        const response = await fetch(url, Object.assign({
            cache: 'no-store',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
        }, options));
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.ok === false) {
            const error = new Error(String(body.message || `HTTP ${response.status}`));
            error.status = response.status;
            error.body = body;
            throw error;
        }
        return body;
    }
/**
 * Code-Teil: requireLicenseRole
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function requireLicenseRole() {
        const auth = nwWindow.NW_AUTH;
        if (!auth || typeof auth.requireCapability !== 'function') {
            authorized = false;
            clearSensitiveFields();
            setBusy(false);
            setStatus('Berechtigungsprüfung nicht verfügbar. Die Lizenzseite bleibt gesperrt.', false);
            return false;
        }
        const ok = await auth.requireCapability('license.manage', {
            pageName: 'Lizenzverwaltung',
            requiredRole: 'Admin oder Installer',
        });
        authorized = ok === true;
        if (!authorized)
            clearSensitiveFields();
        setBusy(false);
        return authorized;
    }
/**
 * Code-Teil: loadLicense
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function loadLicense() {
        if (busy)
            return;
        const ok = await requireLicenseRole();
        if (!ok)
            return;
        setBusy(true);
        setStatus('Lade Lizenzdaten …');
        try {
            const info = await fetchJson(`/api/license/info?t=${Date.now()}`);
            if (el.uuid)
                el.uuid.value = String(info.uuid || '');
            if (el.key)
                el.key.value = String(info.licenseKey || '');
            const text = info.message || (info.valid ? 'Lizenzstatus: gültig ✅' : 'Lizenzstatus: fehlt oder ungültig ❌');
            setStatus(text, info.valid === true);
        }
        catch (error) {
            const err = asError(error);
            authorized = false;
            clearSensitiveFields();
            setStatus(err.message || 'Lizenzdaten konnten nicht geladen werden.', false);
            if ((err.status === 401 || err.status === 403) && nwWindow.NW_AUTH) {
                nwWindow.NW_AUTH.showLogin('Für die Lizenzverwaltung ist eine Installer- oder Admin-Anmeldung erforderlich.', { mandatory: true });
            }
        }
        finally {
            setBusy(false);
        }
    }
/**
 * Code-Teil: saveLicense
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function saveLicense() {
        if (!authorized || busy)
            return;
        const key = String(el.key?.value || '').trim();
        if (!key) {
            setStatus('Bitte einen Lizenzschlüssel eingeben.', false);
            return;
        }
        setBusy(true);
        setStatus('Speichere Lizenz …');
        try {
            const info = await fetchJson('/api/license/save', {
                method: 'POST',
                body: JSON.stringify({ licenseKey: key }),
            });
            if (el.uuid && info.uuid)
                el.uuid.value = String(info.uuid);
            if (el.key && info.licenseKey)
                el.key.value = String(info.licenseKey);
            setStatus(info.message || (info.valid ? 'Lizenz gespeichert und aktiviert ✅' : 'Lizenz gespeichert, aber noch ungültig ❌'), info.valid === true);
        }
        catch (error) {
            const err = asError(error);
            setStatus(err.message || 'Lizenz konnte nicht gespeichert werden.', false);
        }
        finally {
            setBusy(false);
        }
    }
/**
 * Code-Teil: resolveAdminBackUrl
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function resolveAdminBackUrl() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const host = window.location.hostname || 'localhost';
            const port = String(params.get('adminPort') || '8081').replace(/[^0-9]/g, '') || '8081';
            const instance = String(params.get('instance') || '0').replace(/[^0-9]/g, '') || '0';
            return `${window.location.protocol}//${host}:${port}/#tab-nexowatt-ui-${instance}`;
        }
        catch (_error) {
            return '/';
        }
    }
/**
 * Code-Teil: copyUuid
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function copyUuid() {
        const value = String(el.uuid?.value || '').trim();
        if (!value)
            return;
        try {
            await navigator.clipboard.writeText(value);
            setStatus('System-UUID wurde kopiert.', true);
        }
        catch (_error) {
            try {
                if (!el.uuid)
                    return;
                el.uuid.focus();
                el.uuid.select();
                document.execCommand('copy');
                setStatus('System-UUID wurde kopiert.', true);
            }
            catch (_copyError) {
                setStatus('System-UUID konnte nicht kopiert werden.', false);
            }
        }
    }
/**
 * Code-Teil: toggleKeyVisibility
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function toggleKeyVisibility() {
        if (!el.key || !el.toggle)
            return;
        const visible = el.key.type === 'text';
        el.key.type = visible ? 'password' : 'text';
        el.toggle.textContent = visible ? 'Anzeigen' : 'Verbergen';
        el.toggle.setAttribute('aria-pressed', visible ? 'false' : 'true');
    }
/**
 * Code-Teil: bind
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function bind() {
        el.uuid = document.getElementById('nw-license-uuid') || undefined;
        el.key = document.getElementById('nw-license-key') || undefined;
        el.copyUuid = document.getElementById('nw-license-copy-uuid') || undefined;
        el.toggle = document.getElementById('nw-license-toggle') || undefined;
        el.save = document.getElementById('nw-license-save') || undefined;
        el.reload = document.getElementById('nw-license-reload') || undefined;
        el.status = document.getElementById('nw-license-status') || undefined;
        el.back = document.getElementById('nw-license-back') || undefined;
        el.instance = document.getElementById('nw-license-instance') || undefined;
        try {
            const params = new URLSearchParams(window.location.search || '');
            const instance = String(params.get('instance') || '0').replace(/[^0-9]/g, '') || '0';
            if (el.instance)
                el.instance.textContent = `Instanz ${instance}`;
        }
        catch (_error) { }
        el.save?.addEventListener('click', () => { void saveLicense(); });
        el.reload?.addEventListener('click', () => { void loadLicense(); });
        el.copyUuid?.addEventListener('click', () => { void copyUuid(); });
        el.toggle?.addEventListener('click', toggleKeyVisibility);
        el.back?.addEventListener('click', () => { window.location.href = resolveAdminBackUrl(); });
        el.key?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey))
                void saveLicense();
        });
        window.addEventListener('nw-auth-login', () => { void loadLicense(); });
        window.addEventListener('nw-auth-logout', () => {
            authorized = false;
            clearSensitiveFields();
            setStatus('Abgemeldet. Lizenzdaten wurden aus der Ansicht entfernt.', false);
            setBusy(false);
        });
        window.addEventListener('pagehide', clearSensitiveFields);
    }
    document.addEventListener('DOMContentLoaded', () => {
        clearLegacyBrowserCache();
        bind();
        clearSensitiveFields();
        setBusy(false);
        void loadLicense();
    });
})();
