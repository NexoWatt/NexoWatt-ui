// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/nw-shell.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * www/nw-shell.js
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
 * Original-Hash: efdd1250e3f0b55b8438bdf58581b41f9cd16ef314cca16123491f9860bff724
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
 * Quelle: src-ts/runtime-executables/www/nw-shell.ts
 * Quell-Hash: sha256:1140931b130125f48d1693a6bc014f0c423bf9f9a809d51c24c1e7433349aaf7
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/nw-shell.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/nw-shell.js
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

(function () {
  'use strict';
  /**
   * Code-Teil: ready
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /**
   * Code-Teil: nwNormalizeBrandHeader
   * Zweck: Entfernt den alten sichtbaren EMS-Zusatz aus der Topbar-Marke.
   * Zusammenhang: Shell-Seiten bleiben konsistent zur neuen NexoWatt-Brand ohne
   * die fachlichen EMS-Status-/Modulbezeichnungen umzubenennen.
   */
  function nwApplySystemLanguageFromConfig() {
    try {
      fetch('/config', { cache: 'no-store', credentials: 'same-origin' })
        .then(function (res) { return res && res.ok ? res.json() : null; })
        .then(function (cfg) {
          try {
            var loc = cfg && cfg.locale && typeof cfg.locale === 'object' ? cfg.locale : {};
            var lang = String(loc.htmlLang || loc.language || '').trim().toLowerCase();
            if (lang) document.documentElement.setAttribute('lang', lang);
            window.__nwLocale = loc || {};
          } catch (_e2) {}
        })
        .catch(function () {});
    } catch (_e) {}
  }

/**
 * Code-Teil: nwNormalizeBrandHeader
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  function nwNormalizeBrandHeader() {
    try {
      var titles = Array.prototype.slice.call(document.querySelectorAll('.topbar h1, header.topbar h1'));
      titles.forEach(function (el) {
        var text = String(el && el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text === 'NexoWatt EMS') el.textContent = 'NexoWatt';
      });
      var pwaTitles = Array.prototype.slice.call(document.querySelectorAll('meta[name="apple-mobile-web-app-title"]'));
      pwaTitles.forEach(function (el) {
        if (el && el.getAttribute('content') === 'NexoWatt EMS') el.setAttribute('content', 'NexoWatt');
      });
      if (typeof document.title === 'string' && /^NexoWatt EMS\b/.test(document.title)) {
        document.title = document.title.replace(/^NexoWatt EMS\b/, 'NexoWatt');
      }
    } catch (_e) {}
  }
  /**
   * Code-Teil: ready
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  ready(function () {
    nwNormalizeBrandHeader();
    nwApplySystemLanguageFromConfig();
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('menuDropdown');
    if (btn && menu && !btn.dataset.nwMenuFallback && !btn.dataset.nwShellBound) {
      btn.dataset.nwShellBound = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      document.addEventListener('click', function () { menu.classList.add('hidden'); });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menu. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    // Allow links like ems-apps.html#storagefarm to open the corresponding App-Center tab.
    if (location.hash) {
      var wanted = location.hash.slice(1);
      window.setTimeout(function () {
        var tabs = Array.prototype.slice.call(document.querySelectorAll('.nw-tab[data-tab]'));
        var tab = tabs.find(function (el) { return el.getAttribute('data-tab') === wanted; });
        if (tab) tab.click();
      }, 180);
    }
  });
})();
