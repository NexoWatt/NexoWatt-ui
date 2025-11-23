(function() {
  const state = {
    smartHome: {
      enabled: false,
      datapoints: []
    },
    loading: false,
    saving: false,
    lastSaveOk: null,
    lastError: null
  };

  function getRoot() {
    return document.getElementById('nw-sh-config-root');
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function render() {
    const root = getRoot();
    if (!root) return;

    const dp = Array.isArray(state.smartHome.datapoints) ? state.smartHome.datapoints : [];
    const enabled = !!state.smartHome.enabled;
    const statusText = state.loading
      ? 'Lade Konfiguration...'
      : state.saving
        ? 'Speichere...'
        : state.lastError
          ? 'Fehler: ' + state.lastError
          : state.lastSaveOk
            ? 'Zuletzt gespeichert.'
            : 'Bereit.';

    const cardsHtml = dp.map((item, index) => {
      const id = escapeHtml(item.id || '');
      const label = escapeHtml(item.label || '');
      const room = escapeHtml(item.room || '');
      const func = escapeHtml(item.function || '');
      const widget = escapeHtml(item.widget || '');
      const category = escapeHtml(item.category || '');
      const enabledFlag = item.enabled !== false;

      return `
        <article class="nw-sh-card" data-index="${index}">
          <header class="nw-sh-card-header">
            <span class="nw-sh-chip ${enabledFlag ? 'on' : ''}">${enabledFlag ? 'Aktiv' : 'Inaktiv'}</span>
            <span class="nw-sh-id" title="${id}">${id || 'kein Datenpunkt ausgewählt'}</span>
          </header>
          <div class="nw-sh-fields">
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Alias / Anzeigename</label>
              <input class="nw-sh-input" data-index="${index}" data-field="label" value="${label}" placeholder="z.B. Deckenlicht Wohnen">
            </div>
            <div>
              <label class="nw-sh-label">Raum</label>
              <input class="nw-sh-input" data-index="${index}" data-field="room" value="${room}" placeholder="z.B. Wohnen">
            </div>
            <div>
              <label class="nw-sh-label">Funktion</label>
              <select class="nw-sh-select" data-index="${index}" data-field="function">
                <option value=""></option>
                <option value="licht" ${func === 'licht' ? 'selected' : ''}>Licht</option>
                <option value="steckdose" ${func === 'steckdose' ? 'selected' : ''}>Steckdose</option>
                <option value="jalousie" ${func === 'jalousie' ? 'selected' : ''}>Beschattung / Jalousie</option>
                <option value="heizung" ${func === 'heizung' ? 'selected' : ''}>Heizung</option>
                <option value="sensor" ${func === 'sensor' ? 'selected' : ''}>Sensor</option>
                <option value="szene" ${func === 'szene' ? 'selected' : ''}>Szene</option>
                <option value="sonstiges" ${func === 'sonstiges' ? 'selected' : ''}>Sonstiges</option>
              </select>
            </div>
            <div>
              <label class="nw-sh-label">Widget-Typ</label>
              <select class="nw-sh-select" data-index="${index}" data-field="widget">
                <option value=""></option>
                <option value="switch" ${widget === 'switch' ? 'selected' : ''}>Schalter</option>
                <option value="dimmer" ${widget === 'dimmer' ? 'selected' : ''}>Dimmer</option>
                <option value="value" ${widget === 'value' ? 'selected' : ''}>Wert / Anzeige</option>
                <option value="button" ${widget === 'button' ? 'selected' : ''}>Taster / Szene</option>
              </select>
            </div>
            <div>
              <label class="nw-sh-label">Kategorie (Admin)</label>
              <input class="nw-sh-input" data-index="${index}" data-field="category" value="${category}" placeholder="z.B. licht">
            </div>
            <div>
              <label class="nw-sh-label">Status</label>
              <label class="nw-sh-toggle">
                <input type="checkbox" data-index="${index}" data-field="enabled" ${enabledFlag ? 'checked' : ''}>
                aktiv
              </label>
            </div>
          </div>
        </article>
      `;
    }).join('');

    root.innerHTML = `
      <div class="nw-sh-toolbar">
        <div>
          <h2>SmartHome-Konfiguration</h2>
          <div class="nw-sh-toolbar-status">${escapeHtml(statusText)}</div>
        </div>
        <div class="nw-sh-toolbar-buttons">
          <button class="nw-btn secondary" id="nw-sh-reload" ${state.loading || state.saving ? 'disabled' : ''}>Neu laden</button>
          <button class="nw-btn" id="nw-sh-save" ${state.loading || state.saving ? 'disabled' : ''}>Speichern</button>
        </div>
      </div>

      ${dp.length ? `<section class="nw-sh-grid">${cardsHtml}</section>` : `<p class="nw-sh-empty">Noch keine SmartHome-Datenpunkte konfiguriert. Bitte zuerst im ioBroker-Admin unter &quot;SmartHome Datenpunkte&quot; Datenpunkte hinzufügen und speichern.</p>`}

      <footer class="nw-sh-footer">
        <div>SmartHome ist aktuell <strong>${enabled ? 'aktiv' : 'inaktiv'}</strong> (umschaltbar in der Instanzkonfiguration im ioBroker-Admin).</div>
      </footer>
    `;

    attachEvents();
  }

  function attachEvents() {
    const root = getRoot();
    if (!root) return;

    const saveBtn = root.querySelector('#nw-sh-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveConfig().catch(console.error);
      });
    }

    const reloadBtn = root.querySelector('#nw-sh-reload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        loadConfig().catch(console.error);
      });
    }

    root.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
      el.addEventListener('change', onFieldChange);
    });
  }

  function onFieldChange(ev) {
    const el = ev.target;
    const index = parseInt(el.getAttribute('data-index'), 10);
    const field = el.getAttribute('data-field');
    if (isNaN(index) || !field) return;

    const dp = state.smartHome.datapoints[index];
    if (!dp) return;

    if (el.type === 'checkbox') {
      dp[field] = !!el.checked;
    } else {
      dp[field] = el.value;
    }
  }

  async function loadConfig() {
    state.loading = true;
    state.lastError = null;
    render();

    try {
      const res = await fetch('/api/smarthome/config');
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      const body = await res.json();
      const cfg = (body && body.smartHome) || {};

      if (!cfg.datapoints || !Array.isArray(cfg.datapoints)) {
        cfg.datapoints = [];
      }

      state.smartHome = cfg;
      state.loading = false;
      state.lastSaveOk = null;
      render();
    } catch (e) {
      state.loading = false;
      state.lastError = e && e.message ? e.message : String(e);
      render();
    }
  }

  async function saveConfig() {
    state.saving = true;
    state.lastError = null;
    render();

    try {
      const payload = {
        smartHome: state.smartHome
      };

      const res = await fetch('/api/smarthome/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      const body = await res.json();
      if (!body.ok) {
        throw new Error(body.error || 'Unbekannter Fehler');
      }

      state.saving = false;
      state.lastSaveOk = true;
      render();
    } catch (e) {
      state.saving = false;
      state.lastError = e && e.message ? e.message : String(e);
      render();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadConfig().catch(console.error);
  });
})();