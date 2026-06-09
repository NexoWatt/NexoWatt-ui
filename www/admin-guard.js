(function () {
  'use strict';
  var KEY = 'nexowatt.adminFrontendAccess';
  function adminUrl() {
    var proto = window.location.protocol || 'http:';
    var host = window.location.hostname;
    if (!host) {
      var parts = String(window.location.host || '').split(':');
      host = parts[0] || 'localhost';
    }
    return proto + '//' + host + ':8081/';
  }
  function allowed() {
    try {
      var qs = new URLSearchParams(window.location.search || '');
      if (qs.get('nwAdmin') === '1' || qs.get('admin') === '1') {
        try { window.sessionStorage.setItem(KEY, '1'); } catch (_e) {}
        return true;
      }
      try {
        if (window.sessionStorage.getItem(KEY) === '1') return true;
      } catch (_e2) {}
    } catch (_e3) {}
    return false;
  }
  if (allowed()) return;
  try { window.__nexowattInstallerPageBlocked = true; } catch (_e4) {}
  try { window.location.replace(adminUrl()); }
  catch (_e5) { window.location.href = '/'; }
})();
