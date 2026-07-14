/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/cockpit-shell.ts
 * Quell-Hash: sha256:885777f3ec4f1a0e4d6ad92ccc3c40685303eda72a1a6593c706c3f944020f95
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/cockpit-shell.js.
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
 * Datei: www/cockpit-shell.js
 * Rolle im Projekt: Frontend-Skript.
 * Zweck: Browserseitiger Code für eine Kunden-/Installerseite; liest APIs und aktualisiert DOM/UI.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Gemeinsame Shell-Hilfe für Unterseiten: Topbar, aktive Navigation, mobile Menüs und sichtbare Kundenfeatures.
 * Zusammenhänge:
 * - Ergänzt Einzelseiten, die nicht komplett über www/app.js laufen.
 * - Feature-Sichtbarkeit muss zu /config passen.
 * Wartungshinweise:
 * - Keine fachliche EMS-Logik hier einbauen; nur UI-Shell und Navigation.
 */

(function(){
  'use strict';
  /**
   * Code-Teil: nwNormalizeBrandHeader
   * Zweck: Entfernt den alten sichtbaren EMS-Zusatz aus der Topbar-Marke.
   * Zusammenhang: Gemeinsame Cockpit-Shell normalisiert Bestandsseiten zusätzlich
   * zur statischen HTML-Anpassung; fachliche EMS-Begriffe bleiben erhalten.
   */
  function nwNormalizeBrandHeader(){
    try {
      var titles = Array.prototype.slice.call(document.querySelectorAll('.topbar h1, header.topbar h1'));
      titles.forEach(function(el){
        var text = String(el && el.textContent || '').replace(/\s+/g, ' ').trim();
        if(text === 'NexoWatt EMS') el.textContent = 'NexoWatt';
      });
      var pwaTitles = Array.prototype.slice.call(document.querySelectorAll('meta[name="apple-mobile-web-app-title"]'));
      pwaTitles.forEach(function(el){
        if(el && el.getAttribute('content') === 'NexoWatt EMS') el.setAttribute('content','NexoWatt');
      });
      if(typeof document.title === 'string' && /^NexoWatt EMS\b/.test(document.title)){
        document.title = document.title.replace(/^NexoWatt EMS\b/, 'NexoWatt');
      }
    } catch(_e) {}
  }
  try{
    nwNormalizeBrandHeader();
    document.documentElement.classList.add('nw-cockpit-html');
    document.body && document.body.classList.add('nw-cockpit-skin');
    var topbar = document.querySelector('.topbar');
    if(topbar){
      topbar.classList.add('nw-topbar');
      if(!topbar.querySelector('.topbar-gear')){
        var gear = document.createElement('a');
        gear.className = 'topbar-gear';
        gear.href = '/settings.html';
        gear.setAttribute('aria-label','Einstellungen');
        gear.setAttribute('title','Einstellungen');
        gear.textContent = '⚙️';
        var menu = topbar.querySelector('.menu');
        if(menu) topbar.insertBefore(gear, menu); else topbar.appendChild(gear);
      }
      var p = (location.pathname || '').toLowerCase();
      var q = (location.search || '').toLowerCase();
      var tabs = Array.prototype.slice.call(topbar.querySelectorAll('.tabs .tab'));
      tabs.forEach(function(t){
        var text = (t.textContent || '').trim().toLowerCase();
        var is = false;
        if((p === '/' || p.endsWith('/index.html') || p.endsWith('/')) && !q.includes('storagefarm')) is = text === 'live';
        if(p.includes('history') || p.includes('report')) is = text === 'history';
        if(p.includes('smarthome')) is = text === 'smarthome';
        if(p.includes('evcs')) is = text === 'evcs';
        if(q.includes('storagefarm') || p.includes('storagefarm')) is = text === 'speicherfarm';
        if(p.includes('logic')) is = text.includes('logic');
        if(is){ t.classList.add('active'); t.classList.add('tab-active'); }
        else if(p.includes('settings') || p.includes('ems-apps') || p.includes('simulation') || p.includes('smarthome-config')){ t.classList.remove('active'); }
      });
      // Menu fallback only on pages without an existing app-specific binding.
      var btn = topbar.querySelector('#menuBtn');
      var dropdown = topbar.querySelector('#menuDropdown');
      if(btn && dropdown && btn.dataset.nwMenuFallback === '1' && !btn.dataset.nwMenuBound && !btn.dataset.nwFallbackMenu && !btn.dataset.nwShellBound){
        // 0.8.21: gemeinsamer Burger-Menü-Guard. Fallback nur binden, wenn keine
        // App-Seite den Button schon übernommen hat. Dadurch bleibt das Menü auf
        // App-Center-/Einstellungsseiten stabil und toggelt nicht doppelt.
        btn.dataset.nwFallbackMenu = '1';
        btn.dataset.nwMenuBound = 'cockpit-fallback';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btn.addEventListener('click', function(e){
          if(btn.dataset.nwAppMenu === '1') return;
          e.preventDefault();
          e.stopPropagation();
          dropdown.classList.toggle('hidden');
        }, { once:false });
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        document.addEventListener('click', function(e){
          if(dropdown.classList.contains('hidden')) return;
          var target = e && e.target;
          if(btn.contains(target) || dropdown.contains(target)) return;
          dropdown.classList.add('hidden');
        });
      }
      // Global customer-feature visibility (EVCS/Speicherfarm) for subpages that do not load app.js.
      try {
        fetch('/config', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(cfg){
          cfg = cfg || {};
          var sc = (cfg.settingsConfig && typeof cfg.settingsConfig === 'object') ? cfg.settingsConfig : {};
          var evAvail = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
          var evCount = Math.max(0, Math.round(Number(sc.evcsCount || 0) || 0));
          var showEvcs = evAvail && evCount >= 2;
          var fv = (cfg.featureVisibility && typeof cfg.featureVisibility === 'object') ? cfg.featureVisibility : {};
          // Optionale Kunden-Unterseiten werden ausschließlich über /config.featureVisibility geöffnet.
          // Konkret: featureVisibility.hasSmartHome und featureVisibility.hasStorageFarm.
          // Dadurch können alte Legacy-Flags oder Runtime-States keine SmartHome-/Farm-Menüpunkte mehr sichtbar machen.
          var sh = fv.hasSmartHome === true;
          var sf = fv.hasStorageFarm === true;
          [['tabEvcs', showEvcs], ['menuEvcsLink', showEvcs], ['tabSmartHome', sh], ['menuSmartHomeLink', sh], ['tabStorageFarm', sf], ['menuStorageFarmLink', sf]].forEach(function(pair){
            var el = document.getElementById(pair[0]);
            if (el) el.classList.toggle('hidden', !pair[1]);
          });
        }).catch(function(){});
      } catch(_e2) {}
    }
  }catch(_e){}
})();
