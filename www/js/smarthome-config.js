(function() {
  const state = {
    smartHome: {
      enabled: false,
      datapoints: []
    },
    loading: false,
    saving: false,
    lastSaveOk: null,
    lastError: null,
    picker: {
      open: false,
      targetIndex: null,
      targetField: null,
      query: '',
      loading: false,
      error: null,
      results: []
    }
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

  function ensureDatapointsArray() {
    if (!state.smartHome || typeof state.smartHome !== 'object') {
      state.smartHome = { enabled: false, datapoints: [] };
    }
    if (!Array.isArray(state.smartHome.datapoints)) {
      state.smartHome.datapoints = [];
    }
  }

  function render() {
    const root = getRoot();
    if (!root) return;

    ensureDatapointsArray();

    const dp = state.smartHome.datapoints;
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
      item = item || {};
      const id = escapeHtml(item.id || '');
      const label = escapeHtml(item.label || '');
      const room = escapeHtml(item.room || '');
      const func = escapeHtml(item.function || '');
      const widget = escapeHtml(item.widget || '');
      const category = escapeHtml(item.category || '');
      const switchId = escapeHtml(item.switchId || '');
      const statusId = escapeHtml(item.statusId || '');
      const levelId = escapeHtml(item.levelId || '');
      const setpointId = escapeHtml(item.setpointId || '');
      const actualId = escapeHtml(item.actualId || '');
      const enabledFlag = item.enabled !== false;
      const isDimmer = widget === 'dimmer';
      const isCover = widget === 'cover';
      const isThermostat = widget === 'thermostat';

      return `
        <article class="nw-sh-card" data-index="${index}">
          <header class="nw-sh-card-header">
            <span class="nw-sh-chip ${enabledFlag ? 'on' : ''}">${enabledFlag ? 'Aktiv' : 'Inaktiv'}</span>
            <span class="nw-sh-id" title="${id}">${id || 'kein Datenpunkt ausgewählt'}</span>
            <button class="nw-btn tiny danger" type="button" data-index="${index}" data-action="delete" title="Widget löschen">✕</button>
          </header>
          <div class="nw-sh-fields">
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Alias / Anzeigename</label>
              <input class="nw-sh-input" data-index="${index}" data-field="label" value="${label}" placeholder="z.B. Deckenlicht Wohnen">
            </div>
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Haupt-Datenpunkt (ID)</label>
              <div class="nw-sh-input-row">
                <input class="nw-sh-input" data-index="${index}" data-field="id" value="${id}" placeholder="z.B. 0_userdata.0.licht.wohnen.level">
                <button class="nw-btn tiny" type="button" data-index="${index}" data-target-field="id" data-dp-picker="1">DP wählen</button>
              </div>
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
                <option value="cover" ${widget === 'cover' ? 'selected' : ''}>Jalousie / Rollladen</option>
                <option value="thermostat" ${widget === 'thermostat' ? 'selected' : ''}>Heizung (RTR)</option>
                <option value="value" ${widget === 'value' ? 'selected' : ''}>Wert / Anzeige</option>
                <option value="button" ${widget === 'button' ? 'selected' : ''}>Taster / Szene</option>
              </select>
            </div>
            <div>
              <label class="nw-sh-label">Kategorie (Admin)</label>
              <input class="nw-sh-input" data-index="${index}" data-field="category" value="${category}" placeholder="z.B. licht">
            </div>
            ${isDimmer ? `
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Schalt-Datenpunkt (Ein/Aus, nur Dimmer)</label>
              <div class="nw-sh-input-row">
                <input class="nw-sh-input" data-index="${index}" data-field="switchId" value="${switchId}" placeholder="optional, z. B. KNX.Licht.Wohnen.Schalten">
                <button class="nw-btn tiny" type="button" data-index="${index}" data-target-field="switchId" data-dp-picker="1">DP wählen</button>
              </div>
            </div>
            ` : ''}
            ${isCover ? `
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Positions-Datenpunkt (0–100 %, optional)</label>
              <div class="nw-sh-input-row">
                <input class="nw-sh-input" data-index="${index}" data-field="levelId" value="${levelId}" placeholder="z.B. 0_userdata.0.Rolladen.Wohnen.Position">
                <button class="nw-btn tiny" type="button" data-index="${index}" data-target-field="levelId" data-dp-picker="1">DP wählen</button>
              </div>
            </div>
            ` : ''}
            ${isThermostat ? `
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Solltemperatur (Setpoint)</label>
              <div class="nw-sh-input-row">
                <input class="nw-sh-input" data-index="${index}" data-field="setpointId" value="${setpointId}" placeholder="z.B. 0_userdata.0.Heizung.Wohnen.Soll">
                <button class="nw-btn tiny" type="button" data-index="${index}" data-target-field="setpointId" data-dp-picker="1">DP wählen</button>
              </div>
            </div>
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Isttemperatur (Istwert, optional)</label>
              <div class="nw-sh-input-row">
                <input class="nw-sh-input" data-index="${index}" data-field="actualId" value="${actualId}" placeholder="z.B. 0_userdata.0.Heizung.Wohnen.Ist">
                <button class="nw-btn tiny" type="button" data-index="${index}" data-target-field="actualId" data-dp-picker="1">DP wählen</button>
              </div>
            </div>
            <div class="nw-sh-field-full">
              <label class="nw-sh-label">Modus-Datenpunkt (Heizen/Kühlen, optional)</label>
              <div class="nw-sh-input-row">
                <input class="nw-sh-input" data-index="${index}" data-field="statusId" value="${statusId}" placeholder="z.B. 0_userdata.0.Heizung.Wohnen.Mode">
                <button class="nw-btn tiny" type="button" data-index="${index}" data-target-field="statusId" data-dp-picker="1">DP wählen</button>
              </div>
            </div>
            ` : ''}
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

    let pickerHtml = '';
    if (state.picker && state.picker.open) {
      const picker = state.picker;
      const rows = (picker.results || []).map(obj => {
        const id = escapeHtml(obj.id || '');
        const name = escapeHtml(obj.name || '');
        const role = escapeHtml(obj.role || '');
        const type = escapeHtml(obj.type || '');
        return `
          <tr class="nw-sh-picker-row" data-picker-id="${id}">
            <td>${id}</td>
            <td>${name}</td>
            <td>${role}</td>
            <td>${type}</td>
          </tr>
        `;
      }).join('');

      let inner;
      if (picker.loading) {
        inner = '<div class="nw-sh-empty">Suche läuft...</div>';
      } else if (rows) {
        inner = `<table class="nw-sh-picker-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Rolle</th>
              <th>Typ</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>`;
      } else {
        inner = '<div class="nw-sh-empty">Keine Ergebnisse.</div>';
      }

      const statusLine = picker.error
        ? `<span class="nw-sh-error">${escapeHtml(picker.error)}</span>`
        : `<span class="nw-sh-hint">Leeres Suchfeld zeigt bis zu 1000 Datenpunkte. Mit mindestens 2 Zeichen nach ID oder Name filtern.</span>`;

      pickerHtml = `
        <div class="nw-sh-picker-overlay" id="nw-sh-picker">
          <div class="nw-sh-picker-dialog">
            <div class="nw-sh-picker-header">
              <h3>ioBroker-Datenpunkt auswählen</h3>
              <button type="button" class="nw-sh-picker-close" data-picker-close>&times;</button>
            </div>
            <div class="nw-sh-picker-body">
              <div class="nw-sh-picker-search-row">
                <input class="nw-sh-input" id="nw-sh-picker-query" placeholder="Suche nach ID oder Name..." value="${escapeHtml(picker.query || '')}">
                <button class="nw-btn secondary" type="button" data-picker-search>${picker.loading ? 'Suche...' : 'Suchen'}</button>
              </div>
              <div class="nw-sh-picker-status">${statusLine}</div>
              <div class="nw-sh-picker-results">
                ${inner}
              </div>
            </div>
            <div class="nw-sh-picker-footer">
              <button class="nw-btn secondary" type="button" data-picker-close>Abbrechen</button>
            </div>
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="nw-sh-toolbar">
        <div>
          <h2>SmartHome-Konfiguration</h2>
          <div class="nw-sh-toolbar-status">${escapeHtml(statusText)}</div>
        </div>
        <div class="nw-sh-toolbar-buttons">
          <button class="nw-btn secondary" id="nw-sh-add" ${state.loading || state.saving ? 'disabled' : ''}>+ Widget</button>
          <button class="nw-btn secondary" id="nw-sh-reload" ${state.loading || state.saving ? 'disabled' : ''}>Neu laden</button>
          <button class="nw-btn" id="nw-sh-save" ${state.loading || state.saving ? 'disabled' : ''}>Speichern</button>
        </div>
      </div>

      ${dp.length ? `<section class="nw-sh-grid">${cardsHtml}</section>` : `<p class="nw-sh-empty">Noch keine SmartHome-Datenpunkte konfiguriert. Du kannst hier neue Widgets mit &quot;+ Widget&quot; hinzufügen oder im ioBroker-Admin unter &quot;SmartHome Datenpunkte&quot; Datenpunkte anlegen.</p>`}

      <footer class="nw-sh-footer">
        <div>SmartHome ist aktuell <strong>${enabled ? 'aktiv' : 'inaktiv'}</strong> (umschaltbar in der Instanzkonfiguration im ioBroker-Admin).</div>
      </footer>

      ${pickerHtml}
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

    const addBtn = root.querySelector('#nw-sh-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addDatapoint();
      });
    }

    root.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
      el.addEventListener('change', onFieldChange);
    });

    root.querySelectorAll('[data-dp-picker="1"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        const field = btn.getAttribute('data-target-field') || 'id';
        if (!isNaN(index)) {
          openPicker(index, field);
        }
      });
    });

    root.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        if (!isNaN(index)) {
          removeDatapoint(index);
        }
      });
    });

    const picker = document.getElementById('nw-sh-picker');
    if (picker) {
      picker.querySelectorAll('[data-picker-close]').forEach(btn => {
        btn.addEventListener('click', () => {
          closePicker();
        });
      });

      const searchBtn = picker.querySelector('[data-picker-search]');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          pickerSearch().catch(console.error);
        });
      }

      const queryInput = picker.querySelector('#nw-sh-picker-query');
      if (queryInput) {
        queryInput.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            pickerSearch().catch(console.error);
          } else if (ev.key === 'Escape') {
            ev.preventDefault();
            closePicker();
          }
        });
      }

      picker.querySelectorAll('.nw-sh-picker-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-picker-id');
          if (id) {
            applyPickedId(id);
          }
        });
      });
    }
  }

  function onFieldChange(ev) {
    const el = ev.target;
    const index = parseInt(el.getAttribute('data-index'), 10);
    const field = el.getAttribute('data-field');
    if (isNaN(index) || !field) return;

    ensureDatapointsArray();
    const dp = state.smartHome.datapoints[index];
    if (!dp) return;

    if (el.type === 'checkbox') {
      dp[field] = !!el.checked;
    } else {
      dp[field] = el.value;
    }
  }

  function addDatapoint() {
    ensureDatapointsArray();
    state.smartHome.datapoints.push({
      id: '',
      label: '',
      room: '',
      function: '',
      widget: '',
      category: '',
      switchId: '',
      statusId: '',
      levelId: '',
      setpointId: '',
      actualId: '',
      enabled: true
    });
    render();
  }


  function removeDatapoint(index) {
    ensureDatapointsArray();
    if (typeof index !== 'number' || isNaN(index)) return;
    if (index < 0 || index >= state.smartHome.datapoints.length) return;
    state.smartHome.datapoints.splice(index, 1);
    render();
  }
  function openPicker(index, field) {
    ensureDatapointsArray();
    const dp = state.smartHome.datapoints[index];
    if (!dp) return;

    state.picker.open = true;
    state.picker.targetIndex = index;
    state.picker.targetField = field || 'id';
    state.picker.query = dp[field] || dp.id || '';
    state.picker.loading = false;
    state.picker.error = null;
    state.picker.results = [];
    render();
  }

  function closePicker() {
    state.picker.open = false;
    state.picker.targetIndex = null;
    state.picker.targetField = null;
    state.picker.query = '';
    state.picker.loading = false;
    state.picker.error = null;
    state.picker.results = [];
    render();
  }

  async function pickerSearch() {
    const pickerRoot = document.getElementById('nw-sh-picker');
    if (!pickerRoot) return;

    const input = pickerRoot.querySelector('#nw-sh-picker-query');
    const q = input ? input.value.trim() : '';
    state.picker.query = q;

    // Leere Eingabe: alle States laden (serverseitig begrenzt).
    // Mit Text-Eingabe wird gefiltert.
    if (q && q.length < 2) {
      state.picker.error = 'Bitte mindestens 2 Zeichen für die Suche eingeben oder das Feld leer lassen, um alle Datenpunkte zu sehen.';
      state.picker.results = [];
      state.picker.loading = false;
      render();
      return;
    }

    const url = q ? ('/api/iobroker/objects?q=' + encodeURIComponent(q)) : '/api/iobroker/objects';

    state.picker.loading = true;
    state.picker.error = null;
    state.picker.results = [];
    render();

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      const body = await res.json();
      if (!body.ok && body.ok !== undefined) {
        throw new Error(body.error || 'Unbekannter Fehler');
      }
      const list = Array.isArray(body.objects) ? body.objects : [];
      state.picker.results = list;
      state.picker.loading = false;
      render();
    } catch (e) {
      state.picker.loading = false;
      state.picker.error = e && e.message ? e.message : String(e);
      render();
    }
  }

  function applyPickedId(id) {
    const index = state.picker.targetIndex;
    const field = state.picker.targetField || 'id';
    ensureDatapointsArray();
    const dp = state.smartHome.datapoints[index];
    if (!dp) {
      closePicker();
      return;
    }

    dp[field] = id;
    if (field === 'id' && !dp.label) {
      const parts = id.split('.');
      dp.label = parts[parts.length - 1];
    }

    closePicker();
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

      state.smartHome = cfg;
      state.loading = false;
      state.lastSaveOk = null;
      state.lastError = null;
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
      ensureDatapointsArray();
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