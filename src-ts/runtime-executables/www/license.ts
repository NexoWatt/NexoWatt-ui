/**
 * Executable TypeScript source: www/license.js
 *
 * Zweck:
 * Strikt geschützte Lizenzverwaltung auf dem EOS-Runtime-Port. UUID und
 * Lizenzschlüssel werden erst nach bestätigter `license.manage`-Capability
 * geladen. Der vollständige Schlüssel wird nicht im Browser gespeichert.
 */

// @runtime-transpile
interface NwLicenseAuthApi {
  requireCapability(
    capability: string,
    options: { pageName: string; requiredRole: string },
  ): Promise<boolean>;
  showLogin(message: string, options: { mandatory: boolean }): void;
}

interface NwLicenseWindow extends Window {
  NW_AUTH?: NwLicenseAuthApi;
}

interface LicenseElements {
  uuid: HTMLInputElement | undefined;
  key: HTMLInputElement | undefined;
  copyUuid: HTMLButtonElement | undefined;
  toggle: HTMLButtonElement | undefined;
  save: HTMLButtonElement | undefined;
  reload: HTMLButtonElement | undefined;
  status: HTMLElement | undefined;
  back: HTMLButtonElement | undefined;
  instance: HTMLElement | undefined;
}

interface LicenseApiResponse {
  ok?: boolean;
  uuid?: unknown;
  licenseKey?: unknown;
  message?: unknown;
  valid?: boolean;
}

interface LicenseHttpError extends Error {
  status?: number;
  body?: unknown;
}

(function () {
  'use strict';

  const nwWindow = window as NwLicenseWindow;
  const el: LicenseElements = {
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

  function asError(error: unknown): LicenseHttpError {
    if (error instanceof Error) return error as LicenseHttpError;
    return new Error(String(error || 'Unbekannter Fehler')) as LicenseHttpError;
  }

  function setStatus(text: unknown, ok: boolean | null = null): void {
    if (!el.status) return;
    el.status.textContent = String(text || '');
    el.status.classList.toggle('nw-status--ok', ok === true);
    el.status.classList.toggle('nw-status--bad', ok === false);
  }

  function setBusy(next: boolean): void {
    busy = next === true;
    if (el.save) el.save.disabled = busy || !authorized;
    if (el.reload) el.reload.disabled = busy;
    if (el.copyUuid) el.copyUuid.disabled = busy || !authorized || !String(el.uuid?.value || '').trim();
    if (el.key) el.key.disabled = busy || !authorized;
    if (el.toggle) el.toggle.disabled = busy || !authorized;
  }

  function clearSensitiveFields(): void {
    if (el.uuid) el.uuid.value = '';
    if (el.key) {
      el.key.value = '';
      el.key.type = 'password';
    }
    if (el.toggle) {
      el.toggle.textContent = 'Anzeigen';
      el.toggle.setAttribute('aria-pressed', 'false');
    }
  }

  function clearLegacyBrowserCache(): void {
    // Frühere Builds legten den vollständigen Schlüssel im Browser ab. Jeder
    // Speicherzugriff liegt einzeln im try/catch, weil Browser ihn in lokalen,
    // eingebetteten oder besonders gehärteten Kontexten komplett verweigern können.
    const storageNames: Array<'localStorage' | 'sessionStorage'> = ['localStorage', 'sessionStorage'];
    for (const storageName of storageNames) {
      try {
        const storage = storageName === 'localStorage' ? window.localStorage : window.sessionStorage;
        const remove: string[] = [];
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key && key.startsWith('nexowatt-ui.licenseKey.')) remove.push(key);
        }
        remove.forEach((key) => storage.removeItem(key));
      } catch (_error) {}
    }
  }

  async function fetchJson(url: string, options: RequestInit = {}): Promise<LicenseApiResponse> {
    const response = await fetch(url, Object.assign({
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    } satisfies RequestInit, options));
    const body = await response.json().catch(() => ({})) as LicenseApiResponse;
    if (!response.ok || body.ok === false) {
      const error = new Error(String(body.message || `HTTP ${response.status}`)) as LicenseHttpError;
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  async function requireLicenseRole(): Promise<boolean> {
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
    if (!authorized) clearSensitiveFields();
    setBusy(false);
    return authorized;
  }

  async function loadLicense(): Promise<void> {
    if (busy) return;
    const ok = await requireLicenseRole();
    if (!ok) return;
    setBusy(true);
    setStatus('Lade Lizenzdaten …');
    try {
      const info = await fetchJson(`/api/license/info?t=${Date.now()}`);
      if (el.uuid) el.uuid.value = String(info.uuid || '');
      if (el.key) el.key.value = String(info.licenseKey || '');
      const text = info.message || (info.valid ? 'Lizenzstatus: gültig ✅' : 'Lizenzstatus: fehlt oder ungültig ❌');
      setStatus(text, info.valid === true);
    } catch (error) {
      const err = asError(error);
      authorized = false;
      clearSensitiveFields();
      setStatus(err.message || 'Lizenzdaten konnten nicht geladen werden.', false);
      if ((err.status === 401 || err.status === 403) && nwWindow.NW_AUTH) {
        nwWindow.NW_AUTH.showLogin('Für die Lizenzverwaltung ist eine Installer- oder Admin-Anmeldung erforderlich.', { mandatory: true });
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveLicense(): Promise<void> {
    if (!authorized || busy) return;
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
      if (el.uuid && info.uuid) el.uuid.value = String(info.uuid);
      if (el.key && info.licenseKey) el.key.value = String(info.licenseKey);
      setStatus(
        info.message || (info.valid
          ? 'Lizenz gespeichert und aktiviert ✅ Die übrigen EOS-Bereiche sind sofort freigeschaltet.'
          : 'Lizenz gespeichert, aber noch ungültig ❌'),
        info.valid === true,
      );
    } catch (error) {
      const err = asError(error);
      setStatus(err.message || 'Lizenz konnte nicht gespeichert werden.', false);
    } finally {
      setBusy(false);
    }
  }

  function resolveAdminBackUrl(): string {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const host = window.location.hostname || 'localhost';
      const port = String(params.get('adminPort') || '8081').replace(/[^0-9]/g, '') || '8081';
      const instance = String(params.get('instance') || '0').replace(/[^0-9]/g, '') || '0';
      return `${window.location.protocol}//${host}:${port}/#tab-nexowatt-ui-${instance}`;
    } catch (_error) {
      return '/';
    }
  }

  async function copyUuid(): Promise<void> {
    const value = String(el.uuid?.value || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus('System-UUID wurde kopiert.', true);
    } catch (_error) {
      try {
        if (!el.uuid) return;
        el.uuid.focus();
        el.uuid.select();
        document.execCommand('copy');
        setStatus('System-UUID wurde kopiert.', true);
      } catch (_copyError) {
        setStatus('System-UUID konnte nicht kopiert werden.', false);
      }
    }
  }

  function toggleKeyVisibility(): void {
    if (!el.key || !el.toggle) return;
    const visible = el.key.type === 'text';
    el.key.type = visible ? 'password' : 'text';
    el.toggle.textContent = visible ? 'Anzeigen' : 'Verbergen';
    el.toggle.setAttribute('aria-pressed', visible ? 'false' : 'true');
  }

  function bind(): void {
    el.uuid = document.getElementById('nw-license-uuid') as HTMLInputElement | null || undefined;
    el.key = document.getElementById('nw-license-key') as HTMLInputElement | null || undefined;
    el.copyUuid = document.getElementById('nw-license-copy-uuid') as HTMLButtonElement | null || undefined;
    el.toggle = document.getElementById('nw-license-toggle') as HTMLButtonElement | null || undefined;
    el.save = document.getElementById('nw-license-save') as HTMLButtonElement | null || undefined;
    el.reload = document.getElementById('nw-license-reload') as HTMLButtonElement | null || undefined;
    el.status = document.getElementById('nw-license-status') || undefined;
    el.back = document.getElementById('nw-license-back') as HTMLButtonElement | null || undefined;
    el.instance = document.getElementById('nw-license-instance') || undefined;

    try {
      const params = new URLSearchParams(window.location.search || '');
      const instance = String(params.get('instance') || '0').replace(/[^0-9]/g, '') || '0';
      if (el.instance) el.instance.textContent = `Instanz ${instance}`;
    } catch (_error) {}

    el.save?.addEventListener('click', () => { void saveLicense(); });
    el.reload?.addEventListener('click', () => { void loadLicense(); });
    el.copyUuid?.addEventListener('click', () => { void copyUuid(); });
    el.toggle?.addEventListener('click', toggleKeyVisibility);
    el.back?.addEventListener('click', () => { window.location.href = resolveAdminBackUrl(); });
    el.key?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void saveLicense();
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
