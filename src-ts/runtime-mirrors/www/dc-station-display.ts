// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/dc-station-display.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * www/dc-station-display.js
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
 * Original-Hash: 16386dcfd843d086e6b6dfb5a112f53b3295d6385986b6d0cb6fc294cc516213
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
 * Quelle: src-ts/runtime-executables/www/dc-station-display.ts
 * Quell-Hash: sha256:800f7dc01949e3804e630fb2a8d5a27a615427a3cc4eefe4876333861e17a5bc
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/dc-station-display.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: www/dc-station-display.js
 *
 * Zweck:
 * Isolierte Touch-/Vollbild-Bedienoberfläche pro DC-Ladestation.
 * Die Seite lädt ausschließlich tokengefilterte Daten über /api/display/station/:token
 * und besitzt keine Navigation, keine Installerfunktionen und keine Rohdatenpunkt-Anzeige.
 *
 * 0.8.19:
 * - Session-/Betreiberbasis für DC-Stationsdisplays.
 * - Herstellerneutrale Steuerbrücke sichtbar: Display sendet EMS-Intent statt OCPP-direkt.
 * - Kosten-, PV-Anteil- und letzte Session-Informationen für Betreiber vorbereitet.
 */
(function () {
  'use strict';

  const app = document.getElementById('stationDisplayApp');
  let token = '';
  let lastPayload = null;
  let busyKey = '';
  let toastTimer = null;
  let refreshTimer = null;
  let heartbeatTimer = null;
  let lastOkTs = 0;
  let connectionLost = false;
  let manualLanguage = '';

  const I18N = {
    de: {
      loading: 'Verbindung zur Ladestation wird aufgebaut …',
      unavailable: 'Ladestation nicht verfügbar',
      eosRequired: 'Diese Display-Funktion ist nur mit EOS-Lizenz verfügbar.',
      available: 'Frei',
      plugged: 'Verbunden',
      charging: 'Lädt',
      error: 'Störung',
      offline: 'Offline',
      maintenance: 'Wartung',
      readonly: 'Nur Anzeige',
      solar: 'Solar laden',
      fast: 'Schnell laden',
      stop: 'Stoppen',
      power: 'Leistung',
      target: 'Ziel',
      session: 'Session',
      cost: 'Kosten',
      price: 'Preis',
      solarShare: 'Solaranteil',
      sessionSolar: 'Solar in Session',
      sessionGrid: 'Netz in Session',
      pvAvailable: 'Solar verfügbar',
      connectors: 'LPs',
      commandAccepted: 'Befehl angenommen',
      connectionLost: 'Verbindung zum EOS-Server unterbrochen. Letzte Werte bleiben sichtbar.',
      reconnecting: 'Verbindung wird wiederhergestellt …',
      lastUpdate: 'Stand',
      stationPower: 'Stationsleistung',
      noConnectors: 'Keine LPs zugeordnet.',
      blockedMaintenance: 'Diese Ladestation ist im Wartungsmodus.',
      blockedReadonly: 'Start/Stop ist für dieses Display gesperrt.',
      watchdog: 'Display-Watchdog',
      operatorToday: 'Heute Betreiber',
      bridge: 'Steuerung',
      directHardwareWrite: 'keine direkte Hardware-Schreibung',
      manufacturerOpen: 'Hersteller offen',
    },
    nl: {
      loading: 'Verbinding met laadstation wordt opgebouwd …',
      unavailable: 'Laadstation niet beschikbaar',
      eosRequired: 'Deze displayfunctie is alleen beschikbaar met EOS-licentie.',
      available: 'Vrij',
      plugged: 'Verbonden',
      charging: 'Laden',
      error: 'Storing',
      offline: 'Offline',
      maintenance: 'Onderhoud',
      readonly: 'Alleen weergave',
      solar: 'Solar laden',
      fast: 'Snel laden',
      stop: 'Stoppen',
      power: 'Vermogen',
      target: 'Doel',
      session: 'Sessie',
      cost: 'Kosten',
      price: 'Prijs',
      solarShare: 'Zonne-aandeel',
      sessionSolar: 'Solar in sessie',
      sessionGrid: 'Net in sessie',
      pvAvailable: 'Solar beschikbaar',
      connectors: 'Laadpunten',
      commandAccepted: 'Commando geaccepteerd',
      connectionLost: 'Verbinding met EOS-server verbroken. Laatste waarden blijven zichtbaar.',
      reconnecting: 'Verbinding wordt hersteld …',
      lastUpdate: 'Bijgewerkt',
      stationPower: 'Stationvermogen',
      noConnectors: 'Geen laadpunten toegewezen.',
      blockedMaintenance: 'Dit laadstation staat in onderhoudsmodus.',
      blockedReadonly: 'Start/stop is voor dit display geblokkeerd.',
      watchdog: 'Display-watchdog',
      operatorToday: 'Vandaag exploitant',
      bridge: 'Besturing',
      directHardwareWrite: 'geen directe hardware-aansturing',
      manufacturerOpen: 'Fabrikant-open',
    },
    en: {
      loading: 'Connecting to charging station …',
      unavailable: 'Charging station unavailable',
      eosRequired: 'This display feature requires an EOS license.',
      available: 'Available',
      plugged: 'Plugged',
      charging: 'Charging',
      error: 'Fault',
      offline: 'Offline',
      maintenance: 'Maintenance',
      readonly: 'View only',
      solar: 'Solar charge',
      fast: 'Fast charge',
      stop: 'Stop',
      power: 'Power',
      target: 'Target',
      session: 'Session',
      cost: 'Cost',
      price: 'Price',
      solarShare: 'Solar share',
      sessionSolar: 'Solar in session',
      sessionGrid: 'Grid in session',
      pvAvailable: 'Solar available',
      connectors: 'Connectors',
      commandAccepted: 'Command accepted',
      connectionLost: 'Connection to EOS server lost. Last values remain visible.',
      reconnecting: 'Reconnecting …',
      lastUpdate: 'Updated',
      stationPower: 'Station power',
      noConnectors: 'No connectors assigned.',
      blockedMaintenance: 'This charging station is in maintenance mode.',
      blockedReadonly: 'Start/stop is locked for this display.',
      watchdog: 'Display watchdog',
      operatorToday: 'Operator today',
      bridge: 'Control',
      directHardwareWrite: 'no direct hardware write',
      manufacturerOpen: 'Manufacturer-open',
    },
  };

/**
 * Code-Teil: lang
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function lang() {
    if (manualLanguage) return manualLanguage;
    const payloadLang = lastPayload && lastPayload.locale && (lastPayload.locale.htmlLang || lastPayload.locale.language);
    const raw = String(payloadLang || document.documentElement.lang || navigator.language || 'de').toLowerCase();
    if (raw.startsWith('nl')) return 'nl';
    if (raw.startsWith('en')) return 'en';
    return 'de';
  }

/**
 * Code-Teil: t
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function t(key) {
    const l = lang();
    return (I18N[l] && I18N[l][key]) || I18N.de[key] || key;
  }

/**
 * Code-Teil: escapeHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function escapeHtml(input) {
    return String(input == null ? '' : input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

/**
 * Code-Teil: fmtKw
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function fmtKw(w) {
    const n = Number(w);
    if (!Number.isFinite(n) || Math.abs(n) < 1) return '0 kW';
    return (n / 1000).toFixed(Math.abs(n) >= 100000 ? 0 : 1).replace('.', ',') + ' kW';
  }

/**
 * Code-Teil: fmtKwh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function fmtKwh(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0,00 kWh';
    return n.toFixed(2).replace('.', ',') + ' kWh';
  }

/**
 * Code-Teil: fmtEur
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function fmtEur(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0,00 €';
    return n.toFixed(2).replace('.', ',') + ' €';
  }

/**
 * Code-Teil: fmtPrice
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function fmtPrice(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(2).replace('.', ',') + ' €/kWh';
  }

/**
 * Code-Teil: fmtTime
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function fmtTime(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '—';
    try { return new Date(n).toLocaleTimeString(lang() === 'en' ? 'en-GB' : (lang() === 'nl' ? 'nl-NL' : 'de-DE'), { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (_e) { return '—'; }
  }

/**
 * Code-Teil: fmtDuration
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function fmtDuration(sec) {
    const n = Math.max(0, Math.round(Number(sec) || 0));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m`;
  }

/**
 * Code-Teil: getToken
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function getToken() {
    const m = location.pathname.match(/\/display\/station\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
  }

/**
 * Code-Teil: statusLabel
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function statusLabel(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'available') return t('available');
    if (s === 'charging') return t('charging');
    if (s === 'plugged') return t('plugged');
    if (s === 'error') return t('error');
    if (s === 'maintenance') return t('maintenance');
    return t('offline');
  }

/**
 * Code-Teil: showStatus
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function showStatus(title, message, cls) {
    if (!app) return;
    app.innerHTML = `
      <section class="nw-display-status ${cls || ''}">
        <div class="nw-display-brand">NexoWatt Charge</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message || '')}</p>
      </section>`;
  }

/**
 * Code-Teil: toast
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function toast(message) {
    let el = document.querySelector('.nw-display-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'nw-display-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
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
  async function fetchJson(url, opts) {
    const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
    let data = null;
    try { data = await res.json(); } catch (_e) { data = null; }
    if (!res.ok || !data || data.ok === false) {
      const err = new Error((data && (data.message || data.error)) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

/**
 * Code-Teil: refreshDelay
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function refreshDelay(payload) {
    const ms = Number(payload && payload.display && payload.display.refreshIntervalMs);
    if (Number.isFinite(ms) && ms >= 1000 && ms <= 30000) return Math.round(ms);
    return 2500;
  }

/**
 * Code-Teil: scheduleRefresh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function scheduleRefresh(delay) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, Math.max(1000, Math.min(30000, Number(delay) || 2500)));
  }

/**
 * Code-Teil: scheduleHeartbeat
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function scheduleHeartbeat(delay) {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(async () => {
      await heartbeat();
      scheduleHeartbeat(delay || 10000);
    }, Math.max(3000, Math.min(30000, Number(delay) || 10000)));
  }

/**
 * Code-Teil: refresh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  async function refresh() {
    try {
      if (!token) token = getToken();
      if (!token) {
        showStatus(t('unavailable'), 'Kein Display-Token in der URL.', 'nw-display-status--error');
        return;
      }
      const data = await fetchJson('/api/display/station/' + encodeURIComponent(token));
      lastPayload = data;
      lastOkTs = Date.now();
      connectionLost = false;
      const htmlLang = data && data.locale && (data.locale.htmlLang || data.locale.language);
      if (htmlLang) document.documentElement.lang = String(htmlLang).slice(0, 8);
      render(data);
      scheduleRefresh(refreshDelay(data));
    } catch (e) {
      const data = e && e.data;
      if (data && data.error === 'eos_required') {
        showStatus(t('eosRequired'), data.message || t('eosRequired'), 'nw-display-status--error');
        return;
      }
      connectionLost = true;
      if (lastPayload) {
        render(lastPayload, { error: (e && e.message) || t('connectionLost') });
      } else {
        showStatus(t('unavailable'), (e && e.message) || t('loading'), 'nw-display-status--error');
      }
      scheduleRefresh(2500);
    }
  }

/**
 * Code-Teil: heartbeat
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  async function heartbeat() {
    try {
      if (!token) token = getToken();
      if (!token) return;
      await fetchJson('/api/display/station/' + encodeURIComponent(token) + '/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          ts: Date.now(),
          width: window.innerWidth || 0,
          height: window.innerHeight || 0,
          visibility: document.visibilityState || 'visible',
          language: lang(),
          appVersion: '0.8.19',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (_e) {}
  }

/**
 * Code-Teil: sendCommand
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  async function sendCommand(lp, action, mode) {
    if (!token || busyKey || !lastPayload) return;
    const station = lastPayload.station || {};
    if (station.maintenanceMode) { toast(t('blockedMaintenance')); return; }
    if (station.allowStartStop === false) { toast(t('blockedReadonly')); return; }
    busyKey = `${lp}:${action}:${mode || ''}`;
    render(lastPayload);
    try {
      const data = await fetchJson('/api/display/station/' + encodeURIComponent(token) + '/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lp, action, mode }),
      });
      toast(t('commandAccepted'));
      if (data && data.payload) {
        lastPayload = data.payload;
        lastOkTs = Date.now();
        connectionLost = false;
        render(data.payload);
      }
    } catch (e) {
      toast((e && e.message) || 'Fehler');
    } finally {
      busyKey = '';
      setTimeout(refresh, 500);
    }
  }

/**
 * Code-Teil: languageSwitchHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function languageSwitchHtml(station) {
    if (!(station && station.showLanguageSwitch)) return '';
    return `<div class="nw-display-language" role="group" aria-label="Language">
      ${['de', 'nl', 'en'].map((l) => `<button type="button" data-lang="${l}" class="${lang() === l ? 'active' : ''}">${l.toUpperCase()}</button>`).join('')}
    </div>`;
  }

/**
 * Code-Teil: bannerHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function bannerHtml(payload, opts) {
    const station = payload.station || {};
    const banners = [];
    if (connectionLost) banners.push(`<div class="nw-display-banner nw-display-banner--error">${escapeHtml(t('connectionLost'))} ${lastOkTs ? `· ${escapeHtml(t('lastUpdate'))}: ${escapeHtml(fmtTime(lastOkTs))}` : ''}</div>`);
    if (station.maintenanceMode) banners.push(`<div class="nw-display-banner nw-display-banner--warn">${escapeHtml(t('blockedMaintenance'))}</div>`);
    if (station.displayWarning && !station.maintenanceMode) banners.push(`<div class="nw-display-banner nw-display-banner--warn">${escapeHtml(station.displayWarning)}</div>`);
    if (opts && opts.error && !connectionLost) banners.push(`<div class="nw-display-banner nw-display-banner--error">${escapeHtml(opts.error)}</div>`);
    return banners.join('');
  }

/**
 * Code-Teil: render
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function render(payload, opts) {
    if (!app || !payload) return;
    const station = payload.station || {};
    const site = payload.site || {};
    const display = payload.display || {};
    const connectors = Array.isArray(payload.connectors) ? payload.connectors : [];
    const countClass = 'nw-connectors--count-' + Math.max(1, Math.min(4, connectors.length || 1));
    const layoutClass = 'nw-connectors--layout-' + escapeHtml(site.layoutMode || station.layoutMode || 'auto');
    app.innerHTML = `
      <header class="nw-display-header">
        <div class="nw-display-title">
          <div class="nw-display-brand">NexoWatt Charge</div>
          <h1>${escapeHtml(station.name || 'DC Station')}</h1>
          <p class="nw-display-sub">${escapeHtml((station.type || 'dc').toUpperCase())} · ${connectors.length} ${escapeHtml(t('connectors'))}</p>
        </div>
        <div class="nw-display-toparea">
          ${languageSwitchHtml(station)}
          <div class="nw-display-topstats">
            <div class="nw-display-pill">☀️ ${escapeHtml(t('pvAvailable'))}: <strong>${site.pvAvailable ? 'Ja' : 'Nein'}</strong></div>
            <div class="nw-display-pill">⚡ ${escapeHtml(t('stationPower'))}: <strong>${escapeHtml(fmtKw(site.totalAssignedPowerW || 0))}</strong></div>
            <div class="nw-display-pill">💶 ${escapeHtml(t('operatorToday'))}: <strong>${escapeHtml(fmtKwh((payload.operator && payload.operator.energyTodayKwh) || 0))} · ${escapeHtml(fmtEur((payload.operator && (payload.operator.currentRevenueEur || payload.operator.revenueEur)) || 0))}</strong></div>
            <div class="nw-display-pill">🔌 ${escapeHtml(t('bridge'))}: <strong>${escapeHtml(station.controlBridge || (payload.control && payload.control.bridge) || 'EMS')}</strong></div>
            <div class="nw-display-pill ${connectionLost ? 'nw-pill--error' : ''}">🛜 ${escapeHtml(t('watchdog'))}: <strong>${escapeHtml(connectionLost ? t('offline') : (station.displayOnline ? 'Online' : statusLabel(station.displayStatus)))}</strong></div>
            <div class="nw-display-pill">🔓 ${escapeHtml(t('manufacturerOpen'))}: <strong>${escapeHtml(station.controlBridge || 'ems-intent')}</strong></div>
          </div>
        </div>
      </header>
      ${bannerHtml(payload, opts)}
      <section class="nw-connector-grid ${countClass} ${layoutClass}">
        ${connectors.map((c) => renderConnector(c, station)).join('') || `<section class="nw-display-status"><h1>${escapeHtml(t('unavailable'))}</h1><p>${escapeHtml(t('noConnectors'))}</p></section>`}
      </section>
      <footer class="nw-display-footer">
        <span>${escapeHtml(t('lastUpdate'))}: ${escapeHtml(fmtTime(payload.generatedAt || lastOkTs))}</span>
        <span>${escapeHtml(t('reconnecting'))}</span>
        <span>${escapeHtml(display.apiVersion || '0.8.19')}</span>
        <span>${escapeHtml(t('directHardwareWrite'))}</span>
      </footer>`;

    app.querySelectorAll('[data-command]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sendCommand(btn.getAttribute('data-lp'), btn.getAttribute('data-action'), btn.getAttribute('data-mode'));
      });
    });
    app.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        manualLanguage = String(btn.getAttribute('data-lang') || '').toLowerCase();
        document.documentElement.lang = manualLanguage || 'de';
        render(lastPayload || payload, opts);
      });
    });
  }

/**
 * Code-Teil: renderConnector
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function renderConnector(c, station) {
    const status = String(c.status || 'unavailable');
    const lp = String(c.id || 'lp');
    const busy = busyKey && busyKey.startsWith(lp + ':');
    const stationBlocked = !!(station && station.maintenanceMode) || (station && station.allowStartStop === false) || connectionLost;
    const canStart = !stationBlocked && c.allowStartStop !== false && status !== 'error' && status !== 'unavailable';
    const canStop = !stationBlocked && c.allowStartStop !== false && (status === 'charging' || c.charging || c.plugged);
    const modes = Array.isArray(c.allowedModes) ? c.allowedModes : ['solar', 'fast'];
    const solarAllowed = modes.includes('solar');
    const fastAllowed = modes.includes('fast');
    const reason = stationBlocked
      ? ((station && station.maintenanceMode) ? t('maintenance') : ((station && station.allowStartStop === false) ? t('readonly') : t('offline')))
      : String(c.reason || '');
    const last = c.lastSession && typeof c.lastSession === 'object' ? c.lastSession : null;
    const lastText = last && Number(last.energyKwh) > 0
      ? `${fmtKwh(last.energyKwh)} · ${last.durationSec ? fmtDuration(last.durationSec) : '—'}`
      : '—';
    const bridgeText = c.controlBridge || (station && station.controlBridge) || 'ems-intent';
    return `
      <article class="nw-connector-card" data-status="${escapeHtml(status)}">
        <div class="nw-connector-head">
          <div>
            <div class="nw-connector-name">${escapeHtml(c.name || lp.toUpperCase())}</div>
            <div class="nw-connector-note">${escapeHtml(c.chargerType || 'DC')} · Connector ${escapeHtml(c.connectorNo || c.index || '')}</div>
          </div>
          <div class="nw-status-badge" data-status="${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</div>
        </div>
        <div class="nw-connector-power">
          <div class="nw-power-main"><strong>${escapeHtml(fmtKw(c.powerW || 0))}</strong><span>${escapeHtml(t('power'))}</span></div>
          <div class="nw-metric"><strong>${escapeHtml(c.solarSharePercent == null ? '—' : Math.round(Number(c.solarSharePercent) || 0) + ' %')}</strong><span>${escapeHtml(t('solarShare'))}</span></div>
        </div>
        <div class="nw-metric-row">
          <div class="nw-metric"><strong>${escapeHtml(fmtKwh(c.sessionEnergyKwh || 0))}</strong><span>${escapeHtml(t('session'))}</span></div>
          <div class="nw-metric"><strong>${escapeHtml(fmtEur(c.sessionCostEur || 0))}</strong><span>${escapeHtml(t('cost'))}</span></div>
          <div class="nw-metric"><strong>${escapeHtml(fmtPrice(c.priceEurPerKwh))}</strong><span>${escapeHtml(t('price'))}</span></div>
        </div>
        <div class="nw-metric-row nw-metric-row--secondary">
          <div class="nw-metric"><strong>${escapeHtml(fmtKw(c.targetW || 0))}</strong><span>${escapeHtml(t('target'))}</span></div>
          <div class="nw-metric"><strong>${escapeHtml(fmtKwh(c.sessionSolarKwh || 0))}</strong><span>${escapeHtml(t('sessionSolar'))}</span></div>
          <div class="nw-metric"><strong>${escapeHtml(fmtKwh(c.sessionGridKwh || 0))}</strong><span>${escapeHtml(t('sessionGrid'))}</span></div>
          <div class="nw-metric"><strong>${escapeHtml(c.sessionDurationSec ? fmtDuration(c.sessionDurationSec) : '—')}</strong><span>${escapeHtml(t('session'))}</span></div>
        </div>
        <div class="nw-connector-reason">${escapeHtml((c.sessionState || 'idle') + (c.sessionId ? ' · ' + c.sessionId : ''))}</div>
        ${reason ? `<div class="nw-connector-reason">${escapeHtml(reason)}</div>` : ''}
        <div class="nw-connector-actions">
          ${solarAllowed ? `<button class="nw-btn" data-command="1" data-lp="${escapeHtml(lp)}" data-action="start" data-mode="solar" ${(!canStart || busy) ? 'disabled' : ''}>${escapeHtml(t('solar'))}</button>` : ''}
          ${fastAllowed ? `<button class="nw-btn nw-btn--secondary" data-command="1" data-lp="${escapeHtml(lp)}" data-action="start" data-mode="fast" ${(!canStart || busy) ? 'disabled' : ''}>${escapeHtml(t('fast'))}</button>` : ''}
          <button class="nw-btn nw-btn--danger" data-command="1" data-lp="${escapeHtml(lp)}" data-action="stop" data-mode="auto" ${(!canStop || busy) ? 'disabled' : ''}>${escapeHtml(t('stop'))}</button>
        </div>
      </article>`;
  }

  token = getToken();
  showStatus('NexoWatt Charge', t('loading'), 'nw-display-status--loading');
  refresh();
  heartbeat();
  scheduleHeartbeat(10000);
})();
