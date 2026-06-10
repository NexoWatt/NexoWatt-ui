(function(){
  'use strict';
  try{
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
      if(btn && dropdown && btn.dataset.nwMenuFallback === '1' && !btn.dataset.nwFallbackMenu && !btn.dataset.nwShellBound){
        btn.dataset.nwFallbackMenu = '1';
        btn.addEventListener('click', function(e){
          if(btn.dataset.nwAppMenu === '1') return;
          e.preventDefault();
          e.stopPropagation();
          dropdown.classList.toggle('hidden');
        }, { once:false });
        document.addEventListener('click', function(e){
          if(dropdown.classList.contains('hidden')) return;
          if(!topbar.contains(e.target)) dropdown.classList.add('hidden');
        });
      }
      // Global customer-feature visibility (EVCS/Speicherfarm) for subpages that do not load app.js.
      try {
        fetch('/config', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(cfg){
          cfg = cfg || {};
          var sc = (cfg.settingsConfig && typeof cfg.settingsConfig === 'object') ? cfg.settingsConfig : {};
          var evAvail = !!(sc.evcsAvailable || (cfg.ems && cfg.ems.evcsAvailable));
          var evCount = Math.max(0, Math.round(Number(sc.evcsCount || 0) || 0));
          var showEvcs = evAvail && evCount >= 2;
          var sh = !!((cfg.smartHome && cfg.smartHome.enabled) || cfg.smartHomeEnabled);
          var sf = (typeof cfg.storageFarmEnabled === 'boolean') ? !!cfg.storageFarmEnabled : !!(cfg.ems && cfg.ems.storageFarmEnabled);
          [['tabEvcs', showEvcs], ['menuEvcsLink', showEvcs], ['tabSmartHome', sh], ['menuSmartHomeLink', sh], ['tabStorageFarm', sf], ['menuStorageFarmLink', sf]].forEach(function(pair){
            var el = document.getElementById(pair[0]);
            if (el) el.classList.toggle('hidden', !pair[1]);
          });
        }).catch(function(){});
      } catch(_e2) {}
    }
  }catch(_e){}
})();
