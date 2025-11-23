(function() {
  async function loadConfig() {
    const statusEl = document.getElementById('nw-sh-config-status');
    if (!statusEl) return;

    try {
      const res = await fetch('/api/smarthome/config');
      if (!res.ok) {
        statusEl.textContent = 'Fehler beim Laden der Konfiguration: ' + res.status;
        return;
      }
      const data = await res.json();
      statusEl.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      statusEl.textContent = 'Fehler: ' + (e && e.message ? e.message : e);
    }
  }

  document.addEventListener('DOMContentLoaded', loadConfig);
})();