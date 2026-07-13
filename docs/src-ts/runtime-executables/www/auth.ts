// @ts-nocheck
/**
 * Executable TypeScript source: www/auth.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/auth.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/auth.js
 * Rolle im Projekt: Frontend-Skript.
 * Zweck: Browserseitiger Code für eine Kunden-/Installerseite; liest APIs und aktualisiert DOM/UI.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Frontend-Skript einer VIS-/Kundenseite oder eines Reports.
 * Zusammenhänge:
 * - Spricht mit APIs aus main.js und rendert Daten aus /api/state, /config oder Reports.
 * - Styles liegen in www/styles.css bzw. Report-CSS-Dateien.
 * Wartungshinweise:
 * - Feature-Sichtbarkeit und Rollen beachten; Kundenfrontend darf keine Installerfunktionen öffnen.
 */

/* NexoWatt Auth Helper
 * - Login gegen Benutzerkonto (Adapter checkPassword)
 * - Session Cookie: nw_session (HttpOnly, SameSite=Lax)
 * - UI: zeigt Login-Dialog, wenn schreibende Requests 401/403 liefern
 */

(function () {
  'use strict';

  const ORIG_FETCH = window.fetch ? window.fetch.bind(window) : null;
  if (!ORIG_FETCH) return;

  const AUTH_STATUS_URL = '/api/auth/status';
  const AUTH_LOGIN_URL  = '/api/auth/login';
  const AUTH_LOGOUT_URL = '/api/auth/logout';

  let state = {
    enabled: false,
    protectWrites: false,
    authed: false,
    user: null,
    role: 'none',
    capabilities: [],
    isAdmin: false,
    isInstaller: false,
    isCustomer: false,
    _loaded: false,
  };

  let overlayEl = null;
  let msgEl = null;
  let userEl = null;
  let passEl = null;
  let btnEl = null;
  let cancelEl = null;
  let mandatoryLock = false;
  let mandatoryReason = '';

  /**
   * Prüft eine NexoWatt-Capability im Frontend.
   * Wichtig: Das ist nur Komfort-/Sichtbarkeitsschutz. Die eigentliche Sperre
   * muss weiterhin serverseitig in main.ts greifen, damit Werte nicht über API
   * oder direkte URLs sichtbar bzw. schreibbar werden.
   */
  function hasCapability(capabilities, cap) {
    const caps = Array.isArray(capabilities) ? capabilities : [];
    return caps.includes('*') || caps.includes(String(cap || ''));
  }

  /** Rücksprung in den EOS/ioBroker Admin-Tab des NexoWatt-Adapters. */
  function adminUrl() {
    try {
      const proto = window.location.protocol || 'http:';
      const host = window.location.hostname || String(window.location.host || '').split(':')[0] || 'localhost';
      return proto + '//' + host + ':8081/#tab-nexowatt-ui-0';
    } catch (_e) {
      return '/';
    }
  }
  /**
   * Code-Teil: ensureStyles
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ensureStyles() {
    if (document.getElementById('nw-auth-styles')) return;
    const st = document.createElement('style');
    st.id = 'nw-auth-styles';
    st.textContent = `
      .nw-auth-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:10000;background:rgba(0,0,0,.55)}
      .nw-auth-overlay.show{display:flex}
      .nw-auth-dialog{width:min(420px,92vw);background:#10151b;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.55)}
      .nw-auth-dialog h2{margin:0 0 10px 0;font-size:16px;letter-spacing:.2px}
      .nw-auth-dialog .row{display:flex;flex-direction:column;gap:6px;margin:10px 0}
      .nw-auth-dialog label{font-size:12px;opacity:.85}
      .nw-auth-dialog input{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0c0f12;color:#e8eef4}
      .nw-auth-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
      .nw-auth-msg{min-height:18px;margin-top:8px;font-size:12px;opacity:.85}
      .nw-auth-header{display:flex;align-items:center;gap:8px;margin-left:auto}
      .nw-auth-header .nw-auth-user{font-size:12px;opacity:.85;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .nw-auth-btn{white-space:nowrap}
    `;
    document.head.appendChild(st);
  }
  /**
   * Code-Teil: ensureOverlay
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    ensureStyles();

    overlayEl = document.createElement('div');
    overlayEl.className = 'nw-auth-overlay';
    overlayEl.id = 'nwAuthOverlay';

    const dlg = document.createElement('div');
    dlg.className = 'nw-auth-dialog';

    const title = document.createElement('h2');
    title.textContent = 'Anmeldung erforderlich';

    const rowUser = document.createElement('div');
    rowUser.className = 'row';
    const labUser = document.createElement('label');
    labUser.textContent = 'Benutzer';
    userEl = document.createElement('input');
    userEl.type = 'text';
    userEl.autocomplete = 'username';
    userEl.placeholder = 'z.B. admin oder installer';

    const rowPass = document.createElement('div');
    rowPass.className = 'row';
    const labPass = document.createElement('label');
    labPass.textContent = 'Passwort';
    passEl = document.createElement('input');
    passEl.type = 'password';
    passEl.autocomplete = 'current-password';
    passEl.placeholder = '';

    const actions = document.createElement('div');
    actions.className = 'nw-auth-actions';

    btnEl = document.createElement('button');
    btnEl.className = 'btn nw-auth-btn';
    btnEl.type = 'button';
    btnEl.textContent = 'Anmelden';

    cancelEl = document.createElement('button');
    cancelEl.className = 'btn secondary nw-auth-btn';
    cancelEl.type = 'button';
    cancelEl.textContent = 'Abbrechen';

    msgEl = document.createElement('div');
    msgEl.className = 'nw-auth-msg';

    rowUser.appendChild(labUser);
    rowUser.appendChild(userEl);
    rowPass.appendChild(labPass);
    rowPass.appendChild(passEl);

    actions.appendChild(cancelEl);
    actions.appendChild(btnEl);

    dlg.appendChild(title);
    dlg.appendChild(rowUser);
    dlg.appendChild(rowPass);
    dlg.appendChild(actions);
    dlg.appendChild(msgEl);

    overlayEl.appendChild(dlg);
    document.body.appendChild(overlayEl);

    // Prefill last user
    try {
      const last = localStorage.getItem('nwAuthUser') || '';
      if (last && userEl) userEl.value = last;
    } catch (_e) {}

    // Handlers
    /**
     * Code-Teil: Arrow-Funktion `doLogin`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: doLogin
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const doLogin = async () => {
      const u = String(userEl ? userEl.value : '').trim();
      const p = String(passEl ? passEl.value : '');
      if (!u || !p) {
        setMsg('Bitte Benutzer und Passwort eingeben.');
        return;
      }
      setMsg('…');
      const ok = await login(u, p);
      if (ok) {
        hideOverlay();
      }
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnEl.addEventListener('click', doLogin);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an passEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    passEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
      if (e.key === 'Escape') hideOverlay();
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an userEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    userEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideOverlay();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an cancelEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    cancelEl.addEventListener('click', () => {
      if (mandatoryLock) {
        setMsg(mandatoryReason || 'Anmeldung erforderlich. Ohne passende Rolle bleibt diese Seite gesperrt.');
        return;
      }
      hideOverlay();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an overlayEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    overlayEl.addEventListener('click', (e) => {
      // click outside dialog closes
      if (e.target === overlayEl && !mandatoryLock) hideOverlay();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mandatoryLock) hideOverlay();
    });

    return overlayEl;
  }
  /**
   * Code-Teil: setMsg
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMsg(text) {
    if (msgEl) msgEl.textContent = String(text || '');
  }
  /**
   * Code-Teil: showOverlay
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function showOverlay(message, options) {
    ensureOverlay();
    mandatoryLock = !!(options && options.mandatory);
    mandatoryReason = String((options && options.reason) || message || '');
    if (message) setMsg(message);
    if (cancelEl) cancelEl.style.display = mandatoryLock ? 'none' : '';
    overlayEl.classList.add('show');
    try {
      // focus on password if user prefilled
      if (userEl && userEl.value && passEl) passEl.focus();
      else if (userEl) userEl.focus();
    } catch (_e) {}
  }
  /**
   * Code-Teil: hideOverlay
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function hideOverlay() {
    if (!overlayEl) return;
    if (mandatoryLock) {
      setMsg(mandatoryReason || 'Anmeldung erforderlich.');
      return;
    }
    overlayEl.classList.remove('show');
    setMsg('');
    try { if (passEl) passEl.value = ''; } catch (_e) {}
  }

  /**
   * Ersetzt den Seiteninhalt durch einen Sperrbildschirm. Dadurch bleiben
   * App-Center-, Simulation- oder Lizenzwerte unsichtbar, solange keine passende
   * EOS-Rolle angemeldet ist. Abbrechen im Login-Dialog kann die Seite nicht
   * wieder freilegen.
   */
  function renderPageLock(message) {
    try {
      const main = document.querySelector('main') || document.body;
      main.innerHTML = '' +
        '<section class="nw-config-card" style="max-width:760px;margin:48px auto;padding:22px">' +
        '<div class="nw-config-card__title">Zugriff geschützt</div>' +
        '<p class="nw-config-card__subtitle">' + String(message || 'Bitte mit passender EOS-Rolle anmelden.') + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">' +
        '<button class="btn" id="nwAccessLoginBtn" type="button">Anmelden</button>' +
        '<button class="btn secondary" id="nwAccessAdminBtn" type="button">Zurück zum EOS Admin</button>' +
        '</div></section>';
      const loginBtn = document.getElementById('nwAccessLoginBtn');
      if (loginBtn) loginBtn.addEventListener('click', () => showOverlay('Bitte mit passender EOS-Rolle anmelden.', { mandatory: true, reason: message }));
      const adminBtn = document.getElementById('nwAccessAdminBtn');
      if (adminBtn) adminBtn.addEventListener('click', () => { window.location.href = adminUrl(); });
    } catch (_e) {
      // ignore
    }
  }
  /**
   * Code-Teil: refreshStatus
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshStatus() {
    try {
      const r = await ORIG_FETCH(AUTH_STATUS_URL, { cache: 'no-store', credentials: 'same-origin' });
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json();
      state.enabled = !!(j && j.enabled);
      state.protectWrites = !!(j && j.protectWrites);
      state.authed = !!(j && j.authed);
      state.user = (j && j.user) ? String(j.user) : null;
      state.role = (j && j.role) ? String(j.role) : 'none';
      state.capabilities = (j && Array.isArray(j.capabilities)) ? j.capabilities.slice() : [];
      state.isAdmin = !!(j && j.isAdmin);
      state.isInstaller = !!(j && j.isInstaller);
      state.isCustomer = !!(j && j.isCustomer);
      state._loaded = true;
      updateHeader();
      return state;
    } catch (_e) {
      // If endpoint missing, disable auth UI.
      state.enabled = false;
      state.protectWrites = false;
      state.authed = false;
      state.user = null;
      state.role = 'none';
      state.capabilities = [];
      state.isAdmin = false;
      state.isInstaller = false;
      state.isCustomer = false;
      state._loaded = true;
      updateHeader();
      return state;
    }
  }
  /**
   * Code-Teil: login
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function login(user, password) {
    try {
      const u = String(user || '').trim();
      const p = String(password || '');
      const r = await ORIG_FETCH(AUTH_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ user: u, password: p })
      });
      if (!r.ok) {
        if (r.status === 401) {
          setMsg('Benutzer oder Passwort falsch.');
        } else if (r.status === 403) {
          setMsg('Keine Berechtigung.');
        } else {
          setMsg('Login fehlgeschlagen (' + r.status + ').');
        }
        return false;
      }
      try { localStorage.setItem('nwAuthUser', u); } catch (_e) {}
      await refreshStatus();
      try { window.dispatchEvent(new CustomEvent('nw-auth-login', { detail: Object.assign({}, state) })); } catch (_e) {}
      setMsg('');
      return true;
    } catch (_e) {
      setMsg('Login fehlgeschlagen.');
      return false;
    }
  }
  /**
   * Code-Teil: logout
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function logout() {
    try {
      await ORIG_FETCH(AUTH_LOGOUT_URL, { method: 'POST', credentials: 'same-origin' });
    } catch (_e) {}
    await refreshStatus();
  }
  /**
   * Code-Teil: updateHeader
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateHeader() {
    try {
      const header = document.querySelector('header.topbar');
      if (!header) return;

      let box = document.getElementById('nwAuthHeader');
      if (!state.enabled || !state.protectWrites) {
        if (box) box.remove();
        return;
      }

      if (!box) {
        box = document.createElement('div');
        box.className = 'nw-auth-header';
        box.id = 'nwAuthHeader';
        header.appendChild(box);
      }

      box.innerHTML = '';

      const user = document.createElement('div');
      user.className = 'nw-auth-user';
      user.textContent = state.authed ? (state.user || 'angemeldet') : 'nicht angemeldet';

      const btn = document.createElement('button');
      btn.className = 'btn small nw-auth-btn';
      btn.type = 'button';
      btn.textContent = state.authed ? 'Abmelden' : 'Anmelden';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        if (state.authed) logout();
        else showOverlay('Bitte anmelden.');
      });

      box.appendChild(user);
      box.appendChild(btn);
    } catch (_e) {
      // ignore
    }
  }

  // Patch global fetch: ensure cookies and show login dialog on 401/403
  window.fetch = async function (input, init) {
    const cfg = init ? Object.assign({}, init) : {};
    if (!cfg.credentials) cfg.credentials = 'same-origin';

    const r = await ORIG_FETCH(input, cfg);

    // Only act on auth-protected setups
    if (!state._loaded) {
      // Best effort: do not block first requests; lazy load status
      refreshStatus();
    }

    try {
      const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
      const isAuthEndpoint = url.indexOf('/api/auth/') === 0;
      if (!isAuthEndpoint && (r.status === 401 || r.status === 403)) {
        // Refresh state and then prompt
        await refreshStatus();
        if (state.enabled && state.protectWrites) {
          if (r.status === 401) {
            showOverlay('Bitte anmelden, um Änderungen auszuführen.');
          } else {
            showOverlay('Keine Berechtigung. Bitte als Installateur/Administrator anmelden.');
          }
        }
      }
    } catch (_e) {
      // ignore
    }

    return r;
  };

  // Expose minimal API (optional)
  /**
   * Harte Frontend-Sperre für geschützte Seiten. Ohne passende Rolle wird der
   * Seiteninhalt durch einen Sperrbildschirm ersetzt und der Login-Dialog im
   * Pflichtmodus geöffnet. Dadurch kann „Abbrechen“ keine Hintergrundwerte mehr
   * sichtbar machen.
   */
  async function requireCapability(capability, options) {
    const cap = String(capability || '');
    const pageName = String((options && options.pageName) || 'diese Seite');
    const requiredRole = String((options && options.requiredRole) || 'passende EOS-Rolle');
    const info = await refreshStatus();
    const ok = !!(info && info.authed && hasCapability(info.capabilities, cap));
    if (ok) return true;

    const msg = info && info.authed
      ? 'Keine Berechtigung für ' + pageName + '. Erforderlich: ' + requiredRole + '.'
      : 'Bitte anmelden. Erforderlich für ' + pageName + ': ' + requiredRole + '.';
    renderPageLock(msg);
    showOverlay(msg, { mandatory: true, reason: msg });
    return false;
  }

  window.NW_AUTH = {
    getState: () => Object.assign({}, state),
    refreshStatus,
    requireCapability,
    hasCapability: (cap) => hasCapability(state.capabilities, cap),
    showLogin: (msg, options) => showOverlay(msg || 'Bitte anmelden.', options || {}),
    logout,
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('DOMContentLoaded', () => {
    refreshStatus().then(() => {
      try {
        const cap = document.body && document.body.getAttribute('data-nw-required-capability');
        if (cap) {
          const pageName = document.body.getAttribute('data-nw-page-name') || 'geschützte Seite';
          const requiredRole = document.body.getAttribute('data-nw-required-role') || 'passende Rolle';
          requireCapability(cap, { pageName, requiredRole }).catch(() => {});
        }
      } catch (_e) {}
    });
  });
})();
