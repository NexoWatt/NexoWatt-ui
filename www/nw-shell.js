(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () {
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('menuDropdown');
    if (btn && menu && !btn.dataset.nwMenuFallback && !btn.dataset.nwShellBound) {
      btn.dataset.nwShellBound = '1';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
      document.addEventListener('click', function () { menu.classList.add('hidden'); });
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
