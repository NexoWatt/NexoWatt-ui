/* NexoWatt EMS Apps (Installer) – Web UI */
(function () {
  'use strict';

  const els = {
    status: document.getElementById('nw-emsapps-status'),
    save: document.getElementById('nw-emsapps-save'),
    reload: document.getElementById('nw-emsapps-reload'),
    validate: document.getElementById('nw-emsapps-validate'),

    appsList: document.getElementById('appsList'),
    appsEmpty: document.getElementById('appsEmpty'),

    gridConnectionPower: document.getElementById('gridConnectionPower'),
    schedulerIntervalMs: document.getElementById('schedulerIntervalMs'),

    dpTable: document.getElementById('dpTable'),
    dpTariffs: document.getElementById('dpTariffs'),
    storageTable: document.getElementById('storageTable'),

    peakGridPointPowerId: document.getElementById('peakGridPointPowerId'),
    storageControlMode: document.getElementById('storageControlMode'),
    rawPatch: document.getElementById('rawPatch'),

    // Tabs
    tabs: document.getElementById('nw-ems-tabs'),

    // EVCS / Stations
    evcsCount: document.getElementById('evcsCount'),
    evcsMaxPowerKw: document.getElementById('evcsMaxPowerKw'),
    evcsList: document.getElementById('evcsList'),
    stationGroups: document.getElementById('stationGroups'),
    addStationGroup: document.getElementById('addStationGroup'),

    // Status
    emsStatus: document.getElementById('emsStatus'),
    chargingDiag: document.getElementById('chargingDiag'),
    refreshChargingDiag: document.getElementById('refreshChargingDiag'),

    // Modal
    dpModal: document.getElementById('dpModal'),
    dpClose: document.getElementById('dpClose'),
    dpSearch: document.getElementById('dpSearch'),
    dpSearchBtn: document.getElementById('dpSearchBtn'),
    dpRootBtn: document.getElementById('dpRootBtn'),
    dpUpBtn: document.getElementById('dpUpBtn'),
    dpBreadcrumb: document.getElementById('dpBreadcrumb'),
    dpTree: document.getElementById('dpTree'),
    dpResults: document.getElementById('dpResults')
  };

  // Phase 2: App-Center (install + enable per capability)
  const APP_CATALOG = [
    { id: 'charging', label: 'Lademanagement', desc: 'PV-Überschussladen, Budget-Verteilung, Ladepunkte/Connectors', mandatory: false },
    { id: 'peak', label: 'Peak-Shaving', desc: 'Lastspitzenkappung / Import-Limit', mandatory: false },
    { id: 'storage', label: 'Speicherregelung', desc: 'Eigenverbrauch / Speicher-Setpoints (herstellerunabhängig)', mandatory: false },
    { id: 'grid', label: 'Grid-Constraints', desc: 'Netzrestriktionen (RLM/0-Einspeisung/Import/Export-Limits)', mandatory: false },
    { id: 'tariff', label: 'Tarife', desc: 'Preis-Signal / Ladepark-Budget / Netzladung-Freigabe', mandatory: true },
    { id: 'para14a', label: '§14a Steuerung', desc: 'Abregelung/Leistungsdeckel für steuerbare Verbraucher (falls genutzt)', mandatory: false },
    { id: 'multiuse', label: 'MultiUse', desc: 'Weitere interne Logik-Bausteine', mandatory: false }
  ];

  // Datapoints grouped by logic (displayed as tiles/cards in the UI)
  const ENERGY_DP_FIELDS = [
    { key: 'gridBuyPower', label: 'Netz Bezug (W)', placeholder: '… (Import)' },
    { key: 'gridSellPower', label: 'Netz Einspeisung (W)', placeholder: '… (Export)' },
    { key: 'gridPointPower', label: 'Netz Gesamt (W) (Import+ / Export-)', placeholder: 'optional – direktes NVP' },
    { key: 'pvPower', label: 'PV Leistung (W)', placeholder: '' },
    { key: 'consumptionTotal', label: 'Verbrauch Gesamt (W)', placeholder: '' },
    { key: 'batteryPower', label: 'Batterie Leistung (W)', placeholder: '' },
    { key: 'storageSoc', label: 'Speicher SoC (%)', placeholder: '' }
  ];

  const TARIFF_DP_FIELDS = [
    { key: 'priceCurrent', label: 'Tarif Preis aktuell (€/kWh)', placeholder: 'Provider-State (optional)' },
    { key: 'priceAverage', label: 'Tarif Preis Durchschnitt (€/kWh)', placeholder: 'Provider-State (optional)' }
  ];

  const STORAGE_DP_FIELDS = [
    { key: 'socObjectId', label: 'SoC (%)', requiredModes: ['targetPower','limits','enableFlags'] },
    { key: 'batteryPowerObjectId', label: 'Ist-Leistung (W) (optional)', requiredModes: [] },
    { key: 'targetPowerObjectId', label: 'Sollleistung (W)', requiredModes: ['targetPower'] },
    { key: 'maxChargeObjectId', label: 'Max Ladeleistung (W)', requiredModes: ['limits'] },
    { key: 'maxDischargeObjectId', label: 'Max Entladeleistung (W)', requiredModes: ['limits'] },
    { key: 'chargeEnableObjectId', label: 'Laden erlaubt (bool)', requiredModes: ['enableFlags'] },
    { key: 'dischargeEnableObjectId', label: 'Entladen erlaubt (bool)', requiredModes: ['enableFlags'] },
    { key: 'reserveSocObjectId', label: 'Reserve-SoC (%) (optional)', requiredModes: [] }
  ];

  let currentConfig = null;
  let dpTargetInputId = null;
  let treePrefix = '';

  function setStatus(msg, kind) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.style.opacity = msg ? '1' : '0.65';
    els.status.style.color = (kind === 'error') ? '#ffb4b4' : (kind === 'ok' ? '#b8f7c3' : '');
  }

  async function fetchJson(url, opts) {
    const res = await fetch(url, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts || {}));
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok === false) {
      const err = (data && data.error) ? data.error : ('HTTP ' + res.status);
      throw new Error(err);
    }

  // --- Datapoint validation (Phase 3.3) ---
  let _validateTimer = null;

  function _fmtAge(ageMs) {
    const n = Number(ageMs);
    if (!Number.isFinite(n) || n < 0) return '';
    if (n < 1000) return `${Math.round(n)}ms`;
    const s = n / 1000;
    if (s < 60) return `${Math.round(s)}s`;
    const m = s / 60;
    if (m < 60) return `${Math.round(m)}min`;
    const h = m / 60;
    return `${Math.round(h)}h`;
  }

  function _setBadge(inputId, kind, text) {
    const el = document.getElementById('val_' + inputId);
    if (!el) return;
    el.classList.remove('nw-config-badge--ok', 'nw-config-badge--warn', 'nw-config-badge--error', 'nw-config-badge--idle');
    el.classList.add('nw-config-badge', 'nw-config-badge--' + (kind || 'idle'));
    el.textContent = text || '—';
  }

  function scheduleValidation(delayMs) {
    const d = (typeof delayMs === 'number' && Number.isFinite(delayMs)) ? delayMs : 600;
    if (_validateTimer) clearTimeout(_validateTimer);
    _validateTimer = setTimeout(() => { runValidation(false).catch(() => {}); }, d);
  }

  async function runValidation(showStatusMessage) {
    const inputs = Array.from(document.querySelectorAll('input[data-dp-input="1"]'));
    const ids = [];
    const seen = new Set();

    for (const inp of inputs) {
      const v = String(inp.value || '').trim();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      ids.push(v);
    }

    // Quick UI reset for empty inputs
    for (const inp of inputs) {
      const v = String(inp.value || '').trim();
      if (!v) _setBadge(inp.id, 'idle', 'nicht gesetzt');
    }

    if (!ids.length) {
      if (showStatusMessage) setStatus('Validierung: keine Datenpunkte gesetzt.', 'ok');
      return;
    }

    if (showStatusMessage) setStatus('Validierung läuft…', '');
    const maxAgeMs = 15000;

    const data = await fetchJson('/api/object/validate', {
      method: 'POST',
      body: JSON.stringify({ ids, maxAgeMs }),
    });

    if (!data || data.ok !== true || !data.results) {
      if (showStatusMessage) setStatus('Validierung: keine Antwort.', 'error');
      return;
    }

    // Apply per-input badge
    for (const inp of inputs) {
      const idVal = String(inp.value || '').trim();
      if (!idVal) continue;

      const info = data.results[idVal];
      if (!info || info.exists !== true) {
        _setBadge(inp.id, 'error', 'nicht gefunden');
        continue;
      }

      // Basic capability hints (heuristic by input-id)
      const expectWrite = /setCurrentAId|setPowerWId|enableWriteId|lockWriteId/i.test(inp.id);
      const expectRead = /powerId|energyTotalId|statusId|activeId|onlineId|rfidReadId|budgetPowerId|gridPowerId|pvSurplusPowerId|peakGridPointPowerId/i.test(inp.id);

      if (expectWrite && info.common && info.common.write === false) {
        _setBadge(inp.id, 'warn', 'read-only');
        continue;
      }
      if (expectRead && info.common && info.common.read === false) {
        _setBadge(inp.id, 'warn', 'write-only');
        continue;
      }

      if (info.statePresent !== true) {
        _setBadge(inp.id, 'warn', 'keine Daten');
        continue;
      }

      if (info.stale === true) {
        _setBadge(inp.id, 'warn', 'alt (' + _fmtAge(info.ageMs) + ')');
        continue;
      }

      _setBadge(inp.id, 'ok', 'OK');
    }

    if (showStatusMessage) setStatus('Validierung: abgeschlossen.', 'ok');
  }

    return data;
  }

  function deepMerge(target, patch) {
    const out = (target && typeof target === 'object') ? JSON.parse(JSON.stringify(target)) : {};
    if (!patch || typeof patch !== 'object') return out;
    for (const k of Object.keys(patch)) {
      const v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function valueOrEmpty(v) {
    return (v === null || v === undefined) ? '' : String(v);
  }

  function numOrEmpty(v) {
    return (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '';
  }

  function buildAppsUI() {
    if (!els.appsList) return;
    els.appsList.innerHTML = '';

    const getSt = (appId) => {
      const a = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps ? currentConfig.emsApps.apps[appId] : null;
      return a && typeof a === 'object' ? a : { installed: false, enabled: false };
    };

    for (const app of APP_CATALOG) {
      const st = getSt(app.id);

      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.setAttribute('data-app', app.id);

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = app.label;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const mkToggle = (id, label, checked, disabled) => {
        const wrap = document.createElement('label');
        wrap.className = 'nw-app-toggle';
        wrap.style.display = 'inline-flex';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '6px';
        wrap.style.fontSize = '0.75rem';
        wrap.style.opacity = disabled ? '0.55' : '1';

        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.id = id;
        inp.checked = !!checked;
        inp.disabled = !!disabled;

        const txt = document.createElement('span');
        txt.textContent = label;

        wrap.appendChild(inp);
        wrap.appendChild(txt);
        return { wrap, inp };
      };

      const idInstalled = `app_${app.id}_installed`;
      const idEnabled = `app_${app.id}_enabled`;

      const tInstalled = mkToggle(idInstalled, 'Installiert', st.installed, app.mandatory);
      const tEnabled = mkToggle(idEnabled, 'Aktiv', st.enabled, app.mandatory || !st.installed);

      // Behaviour: if app is uninstalled, force enabled=false
      tInstalled.inp.addEventListener('change', () => {
        const installed = !!tInstalled.inp.checked;
        if (!installed) {
          tEnabled.inp.checked = false;
          tEnabled.inp.disabled = true;
        } else {
          tEnabled.inp.disabled = false;
        }
      });

      actions.appendChild(tInstalled.wrap);
      actions.appendChild(tEnabled.wrap);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = app.mandatory ? (app.desc + ' (Basis)') : app.desc;
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Optional quick hints
      if (app.id === 'charging') {
        const row = document.createElement('div');
        row.className = 'nw-config-card__row';
        row.textContent = 'Konfiguration: Reiter „Ladepunkte“. Datenpunkte: pro Ladepunkt.';
        body.appendChild(row);
      }
      if (app.id === 'peak') {
        const row = document.createElement('div');
        row.className = 'nw-config-card__row';
        row.textContent = 'Grenzwert: „Allgemein“ + optionaler Netzleistungs-Datenpunkt.';
        body.appendChild(row);
      }

      card.appendChild(header);
      card.appendChild(body);

      els.appsList.appendChild(card);
    }

    els.appsEmpty.style.display = APP_CATALOG.length ? 'none' : 'block';
  }

  function setAppsFromConfig(cfg) {
    if (!cfg) return;
    const apps = (cfg.emsApps && cfg.emsApps.apps && typeof cfg.emsApps.apps === 'object') ? cfg.emsApps.apps : {};
    for (const app of APP_CATALOG) {
      const st = (apps && apps[app.id] && typeof apps[app.id] === 'object') ? apps[app.id] : null;
      const installed = !!(st && st.installed);
      const enabled = !!(st && st.enabled);

      const i1 = document.getElementById(`app_${app.id}_installed`);
      const i2 = document.getElementById(`app_${app.id}_enabled`);
      if (i1) {
        i1.checked = app.mandatory ? true : installed;
        i1.disabled = !!app.mandatory;
      }
      if (i2) {
        i2.checked = app.mandatory ? true : enabled;
        i2.disabled = !!app.mandatory || !installed;
      }
    }
  }

  function buildDpTable(container, fields, getter, setter, options) {
    container.innerHTML = '';

    const makeRow = (field) => {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = field.label;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = field.key;

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.placeholder = field.placeholder || '';
      input.value = valueOrEmpty(getter(field.key));
      input.id = (options && options.idPrefix ? options.idPrefix : 'dp_') + field.key;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      btn.addEventListener('click', () => openDpModal(input.id));

      input.dataset.dpInput = '1';
      input.addEventListener('change', () => { setter(field.key, input.value.trim()); scheduleValidation(200); });

      right.appendChild(input);
      right.appendChild(btn);

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + input.id;
      badge.textContent = '—';
      right.appendChild(badge);

      row.appendChild(left);
      row.appendChild(right);

      return row;
    };

    for (const f of fields) container.appendChild(makeRow(f));
  }

  function getStorageMode() {
    const v = (els.storageControlMode && els.storageControlMode.value) ? String(els.storageControlMode.value) : 'targetPower';
    return (['targetPower','limits','enableFlags'].includes(v)) ? v : 'targetPower';
  }

  function rebuildStorageTable() {
    const mode = getStorageMode();
    const fields = STORAGE_DP_FIELDS.filter(f => {
      if (!f.requiredModes || !f.requiredModes.length) return true;
      return f.requiredModes.includes(mode);
    });

    const storageDp = (currentConfig && currentConfig.storage && currentConfig.storage.datapoints) ? currentConfig.storage.datapoints : {};

    buildDpTable(
      els.storageTable,
      fields,
      (key) => storageDp[key],
      (key, val) => {
        currentConfig.storage = currentConfig.storage || {};
        currentConfig.storage.datapoints = currentConfig.storage.datapoints || {};
        currentConfig.storage.datapoints[key] = val;
      },
      { idPrefix: 'st_' }
    );
  }

  // --- EVCS / Stations (Phase 2) ---

  function _clampInt(v, min, max, def) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    const i = Math.round(n);
    return Math.min(max, Math.max(min, i));
  }

  function _ensureSettingsConfig() {
    currentConfig = currentConfig || {};
    currentConfig.settingsConfig = (currentConfig.settingsConfig && typeof currentConfig.settingsConfig === 'object') ? currentConfig.settingsConfig : {};
    return currentConfig.settingsConfig;
  }

  function _ensureEvcsList(count) {
    const sc = _ensureSettingsConfig();
    const list = Array.isArray(sc.evcsList) ? sc.evcsList : [];
    while (list.length < count) list.push({});
    if (list.length > count) list.length = count;
    sc.evcsList = list;
    return list;
  }

  function _updateEvcsField(idx, field, value) {
    const sc = _ensureSettingsConfig();
    const count = _clampInt(sc.evcsCount, 1, 20, 1);
    const list = _ensureEvcsList(count);
    const row = (list[idx - 1] && typeof list[idx - 1] === 'object') ? list[idx - 1] : {};
    row[field] = value;
    list[idx - 1] = row;
    sc.evcsList = list;
  }

  function buildEvcsUI() {
    if (!els.evcsList || !els.evcsCount) return;
    const sc = _ensureSettingsConfig();
    const count = _clampInt(sc.evcsCount, 1, 20, 1);
    sc.evcsCount = count;

    els.evcsCount.value = String(count);
    if (els.evcsMaxPowerKw) {
      const kw = (sc.evcsMaxPowerKw !== undefined && sc.evcsMaxPowerKw !== null) ? Number(sc.evcsMaxPowerKw) : 11;
      els.evcsMaxPowerKw.value = Number.isFinite(kw) ? String(kw) : '11';
    }

    const list = _ensureEvcsList(count);
    els.evcsList.innerHTML = '';

    const mkRow = (label, controlEl) => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      const lab = document.createElement('div');
      lab.className = 'nw-config-field-label';
      lab.textContent = label;
      const ctl = document.createElement('div');
      ctl.className = 'nw-config-field-control';
      ctl.appendChild(controlEl);
      row.appendChild(lab);
      row.appendChild(ctl);
      return row;
    };

    const mkIo = (id, value, onChange) => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.gap = '6px';
      wrap.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = id;
      input.value = valueOrEmpty(value);
      input.placeholder = 'State-ID…';
      input.dataset.dpInput = '1';
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      btn.addEventListener('click', () => openDpModal(id));

      wrap.appendChild(input);
      wrap.appendChild(btn);
      return wrap;
    };

    for (let i = 1; i <= count; i++) {
      const rowCfg = list[i - 1] || {};

      const card = document.createElement('div');
      card.className = 'nw-config-card';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = `Ladepunkt ${i}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'nw-config-mini-btn';
      btnUp.textContent = '↑';
      btnUp.title = 'Eine Position nach oben';
      btnUp.disabled = (i <= 1);
      btnUp.addEventListener('click', () => {
        const sc2 = _ensureSettingsConfig();
        const list2 = _ensureEvcsList(count);
        const a = i - 1;
        const b = i - 2;
        if (b < 0) return;
        const tmp = list2[a];
        list2[a] = list2[b];
        list2[b] = tmp;
        sc2.evcsList = list2;
        buildEvcsUI();
      });

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'nw-config-mini-btn';
      btnDown.textContent = '↓';
      btnDown.title = 'Eine Position nach unten';
      btnDown.disabled = (i >= count);
      btnDown.addEventListener('click', () => {
        const sc2 = _ensureSettingsConfig();
        const list2 = _ensureEvcsList(count);
        const a = i - 1;
        const b = i;
        if (b >= list2.length) return;
        const tmp = list2[a];
        list2[a] = list2[b];
        list2[b] = tmp;
        sc2.evcsList = list2;
        buildEvcsUI();
      });

      actions.appendChild(btnUp);
      actions.appendChild(btnDown);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = (rowCfg && rowCfg.name) ? String(rowCfg.name) : '';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Name
      const nameInput = document.createElement('input');
      nameInput.className = 'nw-config-input';
      nameInput.type = 'text';
      nameInput.value = valueOrEmpty(rowCfg.name);
      nameInput.placeholder = `Name (z.B. Ladepunkt ${i})`;
      nameInput.addEventListener('input', () => {
        const v = String(nameInput.value || '').trim();
        _updateEvcsField(i, 'name', v);
        subtitle.textContent = v;
      });
      body.appendChild(mkRow('Name', nameInput));

      // Aktivierung/Regelung (Installateur)
      const enabledInp = document.createElement('input');
      enabledInp.type = 'checkbox';
      enabledInp.checked = (rowCfg && rowCfg.enabled !== false);
      enabledInp.addEventListener('change', () => _updateEvcsField(i, 'enabled', !!enabledInp.checked));
      body.appendChild(mkRow('Aktiv (Regelung)', enabledInp));

      // Priorität (1 = höchste)
      const prioInput = document.createElement('input');
      prioInput.className = 'nw-config-input';
      prioInput.type = 'number';
      prioInput.min = '1';
      prioInput.max = '999';
      prioInput.step = '1';
      {
        const raw = (rowCfg && rowCfg.priority !== undefined && rowCfg.priority !== null && String(rowCfg.priority).trim() !== '' && Number.isFinite(Number(rowCfg.priority)))
          ? Math.round(Number(rowCfg.priority))
          : 999;
        const clamped = _clampInt(raw, 1, 999, 999);
        prioInput.value = String(clamped);
      }
      prioInput.addEventListener('change', () => _updateEvcsField(i, 'priority', _clampInt(prioInput.value, 1, 999, 999)));
      body.appendChild(mkRow('Priorität (1..999)', prioInput));

      // Standard-Modus (Default für EMS-UserMode; kann später in der VIS pro Ladepunkt umgestellt werden)
      const modeSel = document.createElement('select');
      modeSel.className = 'nw-config-input';
      modeSel.innerHTML = '<option value="auto">auto</option><option value="pv">pv</option><option value="minpv">minpv</option><option value="boost">boost</option>';
      {
        const um = String((rowCfg && rowCfg.userMode) ? rowCfg.userMode : 'auto').toLowerCase();
        modeSel.value = (um === 'pv' || um === 'minpv' || um === 'boost') ? um : 'auto';
      }
      modeSel.addEventListener('change', () => _updateEvcsField(i, 'userMode', String(modeSel.value)));
      body.appendChild(mkRow('Standard-Modus', modeSel));

      // Erweitert (optional, aber hilfreich für stabile Regelung)
      const details = document.createElement('details');
      details.style.marginTop = '8px';
      const summary = document.createElement('summary');
      summary.textContent = 'Erweitert';
      summary.style.cursor = 'pointer';
      summary.style.userSelect = 'none';
      details.appendChild(summary);

      const adv = document.createElement('div');
      adv.style.marginTop = '10px';
      adv.style.display = 'grid';
      adv.style.gap = '10px';

      // Steuerpräferenz: auto/currentA/powerW/none
      const ctrlSel = document.createElement('select');
      ctrlSel.className = 'nw-config-input';
      ctrlSel.innerHTML = '<option value="auto">auto</option><option value="currentA">currentA</option><option value="powerW">powerW</option><option value="none">none</option>';
      {
        const cp = String((rowCfg && rowCfg.controlPreference) ? rowCfg.controlPreference : 'auto').trim().toLowerCase();
        ctrlSel.value = (cp === 'currenta' || cp === 'current') ? 'currentA'
          : (cp === 'powerw' || cp === 'power') ? 'powerW'
          : (cp === 'none' || cp === 'off') ? 'none'
          : 'auto';
      }
      ctrlSel.addEventListener('change', () => _updateEvcsField(i, 'controlPreference', String(ctrlSel.value)));
      adv.appendChild(mkRow('Steuerung', ctrlSel));

      // Phasen
      const phasesSel = document.createElement('select');
      phasesSel.className = 'nw-config-input';
      phasesSel.innerHTML = '<option value="1">1</option><option value="3">3</option>';
      {
        const p = Number(rowCfg && rowCfg.phases);
        phasesSel.value = (p === 1) ? '1' : '3';
      }
      phasesSel.addEventListener('change', () => _updateEvcsField(i, 'phases', _clampInt(phasesSel.value, 1, 3, 3)));
      adv.appendChild(mkRow('Phasen', phasesSel));

      // Spannung
      const vInput = document.createElement('input');
      vInput.className = 'nw-config-input';
      vInput.type = 'number';
      vInput.min = '1';
      vInput.step = '1';
      vInput.value = String((rowCfg && Number(rowCfg.voltageV) > 0 && Number.isFinite(Number(rowCfg.voltageV))) ? Math.round(Number(rowCfg.voltageV)) : 230);
      vInput.addEventListener('change', () => {
        const v = Number(vInput.value);
        _updateEvcsField(i, 'voltageV', (Number.isFinite(v) && v > 0) ? Math.round(v) : 230);
      });
      adv.appendChild(mkRow('Spannung (V)', vInput));

      // Grenzen / Schritte
      const minAInput = document.createElement('input');
      minAInput.className = 'nw-config-input';
      minAInput.type = 'number';
      minAInput.min = '0';
      minAInput.step = '0.1';
      minAInput.placeholder = '0 = Standard';
      minAInput.value = (rowCfg && Number(rowCfg.minCurrentA) > 0 && Number.isFinite(Number(rowCfg.minCurrentA))) ? String(Number(rowCfg.minCurrentA)) : '';
      minAInput.addEventListener('change', () => {
        const v = Number(minAInput.value);
        _updateEvcsField(i, 'minCurrentA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Min Strom (A)', minAInput));

      const maxAInput = document.createElement('input');
      maxAInput.className = 'nw-config-input';
      maxAInput.type = 'number';
      maxAInput.min = '0';
      maxAInput.step = '0.1';
      maxAInput.placeholder = '0 = Standard';
      maxAInput.value = (rowCfg && Number(rowCfg.maxCurrentA) > 0 && Number.isFinite(Number(rowCfg.maxCurrentA))) ? String(Number(rowCfg.maxCurrentA)) : '';
      maxAInput.addEventListener('change', () => {
        const v = Number(maxAInput.value);
        _updateEvcsField(i, 'maxCurrentA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Max Strom (A)', maxAInput));

      const maxWInput = document.createElement('input');
      maxWInput.className = 'nw-config-input';
      maxWInput.type = 'number';
      maxWInput.min = '0';
      maxWInput.step = '1';
      maxWInput.placeholder = '0 = Standard';
      maxWInput.value = (rowCfg && Number(rowCfg.maxPowerW) > 0 && Number.isFinite(Number(rowCfg.maxPowerW))) ? String(Math.round(Number(rowCfg.maxPowerW))) : '';
      maxWInput.addEventListener('change', () => {
        const v = Number(maxWInput.value);
        _updateEvcsField(i, 'maxPowerW', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Max Leistung (W)', maxWInput));

      const stepAInput = document.createElement('input');
      stepAInput.className = 'nw-config-input';
      stepAInput.type = 'number';
      stepAInput.min = '0';
      stepAInput.step = '0.1';
      stepAInput.placeholder = '0 = Standard';
      stepAInput.value = (rowCfg && Number(rowCfg.stepA) > 0 && Number.isFinite(Number(rowCfg.stepA))) ? String(Number(rowCfg.stepA)) : '';
      stepAInput.addEventListener('change', () => {
        const v = Number(stepAInput.value);
        _updateEvcsField(i, 'stepA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Step Strom (A)', stepAInput));

      const stepWInput = document.createElement('input');
      stepWInput.className = 'nw-config-input';
      stepWInput.type = 'number';
      stepWInput.min = '0';
      stepWInput.step = '1';
      stepWInput.placeholder = '0 = Standard';
      stepWInput.value = (rowCfg && Number(rowCfg.stepW) > 0 && Number.isFinite(Number(rowCfg.stepW))) ? String(Math.round(Number(rowCfg.stepW))) : '';
      stepWInput.addEventListener('change', () => {
        const v = Number(stepWInput.value);
        _updateEvcsField(i, 'stepW', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Step Leistung (W)', stepWInput));

      // Boost
      const allowBoostInp = document.createElement('input');
      allowBoostInp.type = 'checkbox';
      allowBoostInp.checked = (rowCfg && rowCfg.allowBoost !== false);
      allowBoostInp.addEventListener('change', () => _updateEvcsField(i, 'allowBoost', !!allowBoostInp.checked));
      adv.appendChild(mkRow('Boost erlauben', allowBoostInp));

      const boostTInput = document.createElement('input');
      boostTInput.className = 'nw-config-input';
      boostTInput.type = 'number';
      boostTInput.min = '0';
      boostTInput.step = '1';
      boostTInput.placeholder = '0 = Standard';
      boostTInput.value = (rowCfg && Number(rowCfg.boostTimeoutMin) > 0 && Number.isFinite(Number(rowCfg.boostTimeoutMin))) ? String(Math.round(Number(rowCfg.boostTimeoutMin))) : '';
      boostTInput.addEventListener('change', () => {
        const v = Number(boostTInput.value);
        _updateEvcsField(i, 'boostTimeoutMin', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Boost Timeout (min)', boostTInput));

      details.appendChild(adv);
      body.appendChild(details);


      // Station / Connector
      const stationKeyInput = document.createElement('input');
      stationKeyInput.className = 'nw-config-input';
      stationKeyInput.type = 'text';
      stationKeyInput.value = valueOrEmpty(rowCfg.stationKey);
      stationKeyInput.placeholder = 'Stations-Key (optional)';
      stationKeyInput.addEventListener('input', () => _updateEvcsField(i, 'stationKey', String(stationKeyInput.value || '').trim()));
      body.appendChild(mkRow('Station', stationKeyInput));

      const connInput = document.createElement('input');
      connInput.className = 'nw-config-input';
      connInput.type = 'number';
      connInput.min = '0';
      connInput.step = '1';
      connInput.value = numOrEmpty(rowCfg.connectorNo);
      connInput.placeholder = '0';
      connInput.addEventListener('change', () => _updateEvcsField(i, 'connectorNo', _clampInt(connInput.value, 0, 99, 0)));
      body.appendChild(mkRow('Connector', connInput));

      // Charger meta (minimal)
      const typeSel = document.createElement('select');
      typeSel.className = 'nw-config-input';
      const tVal = String(rowCfg.chargerType || 'ac').toLowerCase();
      typeSel.innerHTML = '<option value="ac">ac</option><option value="dc">dc</option>';
      typeSel.value = (tVal === 'dc') ? 'dc' : 'ac';
      typeSel.addEventListener('change', () => _updateEvcsField(i, 'chargerType', String(typeSel.value)));
      body.appendChild(mkRow('Typ', typeSel));

      // Display inputs
      body.appendChild(mkRow('Leistung (W)', mkIo(`evcs_${i}_powerId`, rowCfg.powerId, v => _updateEvcsField(i, 'powerId', v))));
      body.appendChild(mkRow('Energie (kWh)', mkIo(`evcs_${i}_energyTotalId`, rowCfg.energyTotalId, v => _updateEvcsField(i, 'energyTotalId', v))));
      body.appendChild(mkRow('Status (optional)', mkIo(`evcs_${i}_statusId`, rowCfg.statusId, v => _updateEvcsField(i, 'statusId', v))));
      body.appendChild(mkRow('Freigabe (optional)', mkIo(`evcs_${i}_activeId`, rowCfg.activeId, v => _updateEvcsField(i, 'activeId', v))));

      // Control outputs (optional)
      body.appendChild(mkRow('Sollstrom (A)', mkIo(`evcs_${i}_setCurrentAId`, rowCfg.setCurrentAId, v => _updateEvcsField(i, 'setCurrentAId', v))));
      body.appendChild(mkRow('Sollleistung (W)', mkIo(`evcs_${i}_setPowerWId`, rowCfg.setPowerWId, v => _updateEvcsField(i, 'setPowerWId', v))));
      body.appendChild(mkRow('Enable (write)', mkIo(`evcs_${i}_enableWriteId`, rowCfg.enableWriteId, v => _updateEvcsField(i, 'enableWriteId', v))));
      body.appendChild(mkRow('Online (read)', mkIo(`evcs_${i}_onlineId`, rowCfg.onlineId, v => _updateEvcsField(i, 'onlineId', v))));

      // RFID + Lock
      body.appendChild(mkRow('Lock (write)', mkIo(`evcs_${i}_lockWriteId`, rowCfg.lockWriteId, v => _updateEvcsField(i, 'lockWriteId', v))));
      body.appendChild(mkRow('RFID Reader', mkIo(`evcs_${i}_rfidReadId`, rowCfg.rfidReadId, v => _updateEvcsField(i, 'rfidReadId', v))));

      card.appendChild(header);
      card.appendChild(body);
      els.evcsList.appendChild(card);
    }
  }

  function buildStationGroupsUI() {
    if (!els.stationGroups) return;
    const sc = _ensureSettingsConfig();
    const arr = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
    sc.stationGroups = arr;
    els.stationGroups.innerHTML = '';

    if (!arr.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Stationsgruppen angelegt.';
      els.stationGroups.appendChild(empty);
      return;
    }

    arr.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = g && g.stationKey ? String(g.stationKey) : `Gruppe ${idx + 1}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = 'stationKey / Name / maxPowerKw';

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '6px';
      right.style.alignItems = 'center';

      const stationKey = document.createElement('input');
      stationKey.className = 'nw-config-input';
      stationKey.type = 'text';
      stationKey.placeholder = 'stationKey';
      stationKey.value = valueOrEmpty(g && g.stationKey);
      stationKey.addEventListener('input', () => {
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].stationKey = String(stationKey.value || '').trim();
        title.textContent = sc.stationGroups[idx].stationKey || `Gruppe ${idx + 1}`;
      });

      const name = document.createElement('input');
      name.className = 'nw-config-input';
      name.type = 'text';
      name.placeholder = 'Name (optional)';
      name.value = valueOrEmpty(g && g.name);
      name.addEventListener('input', () => {
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].name = String(name.value || '').trim();
      });

      const maxPowerKw = document.createElement('input');
      maxPowerKw.className = 'nw-config-input';
      maxPowerKw.type = 'number';
      maxPowerKw.min = '0';
      maxPowerKw.step = '0.1';
      maxPowerKw.placeholder = 'maxPowerKw';
      maxPowerKw.value = numOrEmpty(g && g.maxPowerKw);
      maxPowerKw.addEventListener('change', () => {
        const n = Number(maxPowerKw.value);
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].maxPowerKw = Number.isFinite(n) ? n : 0;
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      del.addEventListener('click', () => {
        sc.stationGroups.splice(idx, 1);
        buildStationGroupsUI();
      });

      right.appendChild(stationKey);
      right.appendChild(name);
      right.appendChild(maxPowerKw);
      right.appendChild(del);

      row.appendChild(left);
      row.appendChild(right);

      els.stationGroups.appendChild(row);
    });
  }

  function collectSettingsConfigFromUI() {
    const out = deepMerge({}, (currentConfig && currentConfig.settingsConfig) ? currentConfig.settingsConfig : {});
    const count = _clampInt(els.evcsCount ? els.evcsCount.value : out.evcsCount, 1, 20, 1);
    out.evcsCount = count;

    if (els.evcsMaxPowerKw) {
      const kw = Number(els.evcsMaxPowerKw.value);
      out.evcsMaxPowerKw = Number.isFinite(kw) ? kw : (Number.isFinite(Number(out.evcsMaxPowerKw)) ? Number(out.evcsMaxPowerKw) : 11);
    }

    // evcsList is maintained live via _updateEvcsField. Still ensure correct length.
    out.evcsList = _ensureEvcsList(count);

    // stationGroups maintained live
    out.stationGroups = Array.isArray(_ensureSettingsConfig().stationGroups) ? _ensureSettingsConfig().stationGroups : [];
    return out;
  }

  function applyConfigToUI(cfg) {
    currentConfig = cfg || {};

    // Apps
    setAppsFromConfig(currentConfig);

    // Plant params
    els.gridConnectionPower.value = numOrEmpty(currentConfig.installerConfig && currentConfig.installerConfig.gridConnectionPower);
    els.schedulerIntervalMs.value = numOrEmpty(currentConfig.schedulerIntervalMs);

    // Datapoints (grouped per logic)
    const dps = currentConfig.datapoints || {};
    if (els.dpTable) {
      buildDpTable(
        els.dpTable,
        ENERGY_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'dp_' }
      );
    }

    if (els.dpTariffs) {
      buildDpTable(
        els.dpTariffs,
        TARIFF_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'dp_' }
      );
    }

    // Peak expert
    els.peakGridPointPowerId.value = valueOrEmpty(currentConfig.peakShaving && currentConfig.peakShaving.gridPointPowerId);

    // Storage
    const mode = (currentConfig.storage && typeof currentConfig.storage.controlMode === 'string') ? currentConfig.storage.controlMode : 'targetPower';
    els.storageControlMode.value = (['targetPower','limits','enableFlags'].includes(mode)) ? mode : 'targetPower';
    rebuildStorageTable();

    // EVCS / Station config
    try { buildEvcsUI(); } catch (_e) {}
    try { buildStationGroupsUI(); } catch (_e) {}
  }

  async function loadConfig() {
    setStatus('Lade Konfiguration…');
    const data = await fetchJson('/api/installer/config');
    applyConfigToUI(data.config || {});
    scheduleValidation(300);
    setStatus('Konfiguration geladen.', 'ok');
  }

  function collectPatchFromUI() {
    const patch = {};

    // Apps
    patch.emsApps = deepMerge({}, (currentConfig && currentConfig.emsApps) ? currentConfig.emsApps : {});
    patch.emsApps.apps = (patch.emsApps.apps && typeof patch.emsApps.apps === 'object') ? patch.emsApps.apps : {};
    for (const app of APP_CATALOG) {
      const i1 = document.getElementById(`app_${app.id}_installed`);
      const i2 = document.getElementById(`app_${app.id}_enabled`);
      const installed = app.mandatory ? true : !!(i1 && i1.checked);
      const enabled = app.mandatory ? true : !!(i2 && i2.checked);
      patch.emsApps.apps[app.id] = { installed, enabled };
    }

    // Scheduler
    const sched = Number(els.schedulerIntervalMs.value);
    if (Number.isFinite(sched) && sched >= 250) patch.schedulerIntervalMs = Math.round(sched);

    // Plant
    const gcp = Number(els.gridConnectionPower.value);
    patch.installerConfig = patch.installerConfig || {};
    if (Number.isFinite(gcp) && gcp >= 0) patch.installerConfig.gridConnectionPower = Math.round(gcp);

    // Datapoints
    patch.datapoints = Object.assign({}, currentConfig.datapoints || {});

    // EVCS / Stations (stored in settingsConfig)
    try {
      patch.settingsConfig = collectSettingsConfigFromUI();
    } catch (_e) {
      patch.settingsConfig = deepMerge({}, currentConfig.settingsConfig || {});
    }

    // PeakShaving expert
    patch.peakShaving = deepMerge({}, currentConfig.peakShaving || {});
    const gp = String(els.peakGridPointPowerId.value || '').trim();
    patch.peakShaving.gridPointPowerId = gp;

    // Storage
    patch.storage = deepMerge({}, currentConfig.storage || {});
    patch.storage.controlMode = getStorageMode();
    patch.storage.datapoints = deepMerge({}, (currentConfig.storage && currentConfig.storage.datapoints) ? currentConfig.storage.datapoints : {});

    // Optional raw patch
    const raw = String(els.rawPatch.value || '').trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return deepMerge(patch, parsed);
        }
      } catch (e) {
        // ignore invalid JSON
      }
    }

    return patch;
  }

  async function saveConfig() {
    setStatus('Speichere…');
    const patch = collectPatchFromUI();
    const payload = { patch, restartEms: true };
    const data = await fetchJson('/api/installer/config', { method: 'POST', body: JSON.stringify(payload) });
    applyConfigToUI(data.config || {});
    setStatus('Gespeichert. EMS wurde neu gestartet.', 'ok');
  }

  // --- Tabs + Status polling (Phase 2) ---

  let _activeTab = 'apps';
  let _statusTimer = null;

  function _showTab(tabId) {
    _activeTab = tabId || 'apps';
    const btns = els.tabs ? Array.from(els.tabs.querySelectorAll('.nw-tab')) : [];
    btns.forEach(b => {
      const isActive = (b.getAttribute('data-tab') === _activeTab);
      b.classList.toggle('nw-tab--active', isActive);
    });

    const panels = Array.from(document.querySelectorAll('[data-tabpanel]'));
    panels.forEach(p => {
      const id = p.getAttribute('data-tabpanel');
      p.style.display = (id === _activeTab) ? '' : 'none';
    });

    // immediate status refresh when entering the tab
    if (_activeTab === 'status') {
      refreshEmsStatus().catch(() => {});
      refreshChargingDiag().catch(() => {});
    }
  }

  function initTabs() {
    if (!els.tabs) return;
    const btns = Array.from(els.tabs.querySelectorAll('.nw-tab'));
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab') || 'apps';
        _showTab(tabId);
      });
    });
    _showTab('apps');
  }

  function _fmtTs(ts) {
    try {
      const d = new Date(ts);
      if (Number.isFinite(d.getTime())) return d.toLocaleString();
    } catch (_e) {}
    return '';
  }

  function renderEmsStatus(payload) {
    if (!els.emsStatus) return;
    els.emsStatus.innerHTML = '';

    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    const engine = payload && payload.engine ? payload.engine : {};
    const mm = payload && (payload.lastTickDiag || payload.modules || payload.diagnostics) ? (payload.lastTickDiag || payload.modules || payload.diagnostics) : null;

    els.emsStatus.appendChild(
      mkItem(
        'Engine',
        engine && engine.intervalMs ? `Tick: ${engine.intervalMs} ms` : 'Tick-Intervall unbekannt',
        (engine && engine.running) ? 'RUNNING' : 'STOPPED',
        (engine && engine.running) ? 'ok' : 'error'
      )
    );

    if (!mm || !Array.isArray(mm.results)) {
      els.emsStatus.appendChild(mkItem('Module', 'Keine Diagnosedaten verfügbar.', '', ''));
      return;
    }

    const head = `Letzter Tick: ${_fmtTs(mm.ts)} | Gesamt: ${mm.totalMs} ms`;
    els.emsStatus.appendChild(mkItem('Tick', head, (mm.errors && mm.errors.length) ? `${mm.errors.length} Fehler` : 'OK', (mm.errors && mm.errors.length) ? 'error' : 'ok'));

    for (const r of mm.results) {
      const ok = !!r.ok;
      const enabled = !!r.enabled;
      const ms = (typeof r.ms === 'number' && Number.isFinite(r.ms)) ? r.ms : 0;
      const right = `${enabled ? 'on' : 'off'} | ${ms} ms` + (r.error ? `<br/><span style="opacity:.85;">${String(r.error).replace(/</g,'&lt;')}</span>` : '');
      els.emsStatus.appendChild(mkItem(r.key || 'module', '', right, ok ? 'ok' : 'error'));
    }
  }


  function _asBool(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return (v.trim().toLowerCase() === 'true' || v.trim() === '1');
    return false;
  }

  function _asNum(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback !== undefined ? fallback : 0);
  }

  function renderChargingDiag(payload) {
    if (!els.chargingDiag) return;
    els.chargingDiag.innerHTML = '';

    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'warn') right.style.color = '#fde68a';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    if (!payload || payload.ok !== true) {
      els.chargingDiag.appendChild(mkItem('Ladepunkte', 'Keine Daten', '—', 'warn'));
      return;
    }

    const list = Array.isArray(payload.list) ? payload.list : [];
    if (!list.length) {
      els.chargingDiag.appendChild(mkItem('Ladepunkte', 'Keine Ladepunkte konfiguriert.', '—', 'warn'));
      return;
    }

    for (const it of list) {
      const rt = it.runtime || {};
      const enabled = _asBool(rt.enabled);
      const online = _asBool(rt.online);
      const mappingOk = _asBool(rt.mappingOk);
      const meterStale = _asBool(rt.meterStale);
      const statusStale = _asBool(rt.statusStale);

      const actualW = Math.round(_asNum(rt.actualPowerW, 0));
      const targetW = Math.round(_asNum(rt.targetPowerW, 0));
      const targetA = _asNum(rt.targetCurrentA, 0);
      const reason = (rt.reason !== null && rt.reason !== undefined) ? String(rt.reason) : '';
      const applyStatus = (rt.applyStatus !== null && rt.applyStatus !== undefined) ? String(rt.applyStatus) : '';
      const effMode = (rt.effectiveMode !== null && rt.effectiveMode !== undefined) ? String(rt.effectiveMode) : '';
      const userMode = (rt.userMode !== null && rt.userMode !== undefined) ? String(rt.userMode) : '';

      let kind = 'ok';
      if (!mappingOk) kind = 'error';
      else if (meterStale || statusStale) kind = 'warn';
      else if (!enabled || !online) kind = 'warn';

      const name = it && it.name ? String(it.name) : `Ladepunkt ${it.index}`;
      const title = `${name} (lp${it.index})`;

      const flags = [];
      flags.push(enabled ? 'EN' : 'DIS');
      flags.push(online ? 'ON' : 'OFF');
      if (meterStale) flags.push('METER:ALT');
      if (statusStale) flags.push('STATUS:ALT');
      if (effMode) flags.push(`MODE:${effMode}`);
      if (userMode && userMode !== 'auto') flags.push(`USER:${userMode}`);

      const subtitle = flags.join(' · ');

      const right = `
        <div style="font-weight:600;">Ist ${actualW} W → Ziel ${targetW} W</div>
        <div style="font-size:0.75rem;opacity:.85;">A=${Number.isFinite(targetA) ? targetA.toFixed(2) : '0.00'} · ${applyStatus || '—'} · ${reason || '—'}</div>
      `;

      els.chargingDiag.appendChild(mkItem(title, subtitle, right, kind));
    }
  }

  async function refreshChargingDiag() {
    if (_activeTab !== 'status') return;
    if (!els.chargingDiag) return;
    const data = await fetchJson('/api/ems/charging/diagnostics');
    renderChargingDiag(data || {});
  }



  async function refreshEmsStatus() {
    if (_activeTab !== 'status') return;
    const data = await fetchJson('/api/ems/status');
    renderEmsStatus(data || {});
  }

  function startStatusPolling() {
    if (_statusTimer) {
      try { clearInterval(_statusTimer); } catch (_e) {}
      _statusTimer = null;
    }
    _statusTimer = setInterval(() => {
      if (_activeTab !== 'status') return;
      refreshEmsStatus().catch(() => {});
      refreshChargingDiag().catch(() => {});
    }, 2000);
  }

  // --- DP Modal ---

  function openDpModal(targetInputId) {
    dpTargetInputId = targetInputId;
    treePrefix = '';
    if (els.dpSearch) els.dpSearch.value = '';
    if (els.dpResults) els.dpResults.innerHTML = '';
    if (els.dpTree) els.dpTree.innerHTML = '';
    if (els.dpBreadcrumb) els.dpBreadcrumb.innerHTML = '';
    if (els.dpModal) {
      els.dpModal.setAttribute('aria-hidden', 'false');
      els.dpModal.classList.remove('hidden');
    }
    refreshTree().catch(() => {});
  }

  function closeDpModal() {
    if (els.dpModal) {
      els.dpModal.setAttribute('aria-hidden', 'true');
      els.dpModal.classList.add('hidden');
    }
    dpTargetInputId = null;
  }

  function setDpTargetValue(id) {
    if (!dpTargetInputId) return;
    const inp = document.getElementById(dpTargetInputId);
    if (!inp) return;
    inp.value = id;
    inp.dispatchEvent(new Event('change'));
    closeDpModal();
  }

  function renderBreadcrumb() {
    if (!els.dpBreadcrumb) return;
    els.dpBreadcrumb.innerHTML = '';

    const parts = (treePrefix || '').split('.').filter(Boolean);

    const mkCrumb = (label, prefix, clickable) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-dp-crumb' + (clickable ? '' : ' nw-dp-crumb--active');
      b.textContent = label;
      if (!clickable) {
        b.disabled = true;
        return b;
      }
      b.addEventListener('click', () => {
        treePrefix = prefix;
        refreshTree().catch(() => {});
      });
      return b;
    };

    const sep = () => {
      const s = document.createElement('span');
      s.className = 'nw-dp-sep';
      s.textContent = '›';
      return s;
    };

    // Start
    els.dpBreadcrumb.appendChild(mkCrumb('Start', '', parts.length > 0));

    // Segments
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      acc = acc ? (acc + '.' + p) : p;
      els.dpBreadcrumb.appendChild(sep());
      els.dpBreadcrumb.appendChild(mkCrumb(p, acc, i < parts.length - 1));
    }
  }

  function mkDpResultRow(primary, meta, onClick) {
    const row = document.createElement('div');
    row.className = 'nw-dp-result';
    const id = document.createElement('div');
    id.className = 'nw-dp-result__id';
    id.textContent = primary;
    const m = document.createElement('div');
    m.className = 'nw-dp-result__meta';
    m.textContent = meta || '';
    row.appendChild(id);
    row.appendChild(m);
    if (typeof onClick === 'function') {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }
    return row;
  }

  async function refreshTree() {
    const data = await fetchJson('/api/object/tree?prefix=' + encodeURIComponent(treePrefix || ''));
    const children = Array.isArray(data.children) ? data.children : [];

    renderBreadcrumb();
    if (els.dpTree) els.dpTree.innerHTML = '';
    if (els.dpUpBtn) els.dpUpBtn.disabled = !treePrefix;
    if (els.dpRootBtn) els.dpRootBtn.disabled = !treePrefix;

    // Back entry (one level up)
    if (treePrefix && els.dpTree) {
      els.dpTree.appendChild(mkDpResultRow('..', 'Eine Ebene zurück', () => {
        upOne();
        refreshTree().catch(() => {});
      }));
    }

    if (!children.length) {
      if (els.dpTree) {
        const empty = document.createElement('div');
        empty.className = 'nw-config-empty';
        empty.textContent = 'Keine Einträge.';
        els.dpTree.appendChild(empty);
      }
      return;
    }

    for (const ch of children) {
      // Folder-like entry
      if (ch && ch.hasChildren) {
        const meta = ch.name ? ('Ordner • ' + ch.name) : 'Ordner';
        if (els.dpTree) {
          els.dpTree.appendChild(mkDpResultRow(String(ch.id || ch.label || ''), meta, () => {
            treePrefix = String(ch.id || '');
            refreshTree().catch(() => {});
          }));
        }
        continue;
      }

      // State-like entry
      if (ch && ch.isState) {
        const metaBits = [];
        if (ch.name) metaBits.push(String(ch.name));
        if (ch.role) metaBits.push(String(ch.role));
        if (ch.unit) metaBits.push(String(ch.unit));
        const meta = metaBits.join(' • ');
        if (els.dpTree) {
          els.dpTree.appendChild(mkDpResultRow(String(ch.id || ''), meta, () => setDpTargetValue(String(ch.id || ''))));
        }
        continue;
      }

      // Fallback
      if (els.dpTree) {
        els.dpTree.appendChild(mkDpResultRow(String(ch && (ch.id || ch.label) || ''), '', null));
      }
    }
  }

  async function doSearch() {
    const q = String(els.dpSearch.value || '').trim();
    if (!q) {
      els.dpResults.innerHTML = '';
      return;
    }

    els.dpResults.innerHTML = '';
    const data = await fetchJson('/api/smarthome/dpsearch?q=' + encodeURIComponent(q) + '&limit=500');
    const results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Treffer.';
      els.dpResults.appendChild(empty);
      return;
    }

    for (const r of results) {
      const metaBits = [];
      if (r.name) metaBits.push(String(r.name));
      if (r.role) metaBits.push(String(r.role));
      if (r.unit) metaBits.push(String(r.unit));
      const meta = metaBits.join(' • ');
      els.dpResults.appendChild(mkDpResultRow(String(r.id || ''), meta, () => setDpTargetValue(String(r.id || ''))));
    }
  }

  function upOne() {
    if (!treePrefix) {
      treePrefix = '';
      return;
    }
    const parts = treePrefix.split('.').filter(Boolean);
    parts.pop();
    treePrefix = parts.join('.');
  }

  // --- Wire up ---

  buildAppsUI();

  // Tabs + live status
  try { initTabs(); } catch (_e) {}
  try { startStatusPolling(); } catch (_e) {}

  if (els.storageControlMode) {
    els.storageControlMode.addEventListener('change', () => {
      // Only rebuild required fields; keep currentConfig.storage.controlMode updated
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.controlMode = getStorageMode();
      rebuildStorageTable();
    });
  }

  // Browse buttons (event delegation) – works for dynamically created fields too
  document.addEventListener('click', (e) => {
    const t = e && e.target ? e.target : null;
    const btn = t && t.closest ? t.closest('[data-browse]') : null;
    if (!btn) return;
    const id = btn.getAttribute('data-browse');
    if (id) openDpModal(id);
  });

  // Mark standalone datapoint inputs for validation
  if (els.peakGridPointPowerId) {
    els.peakGridPointPowerId.dataset.dpInput = '1';
    els.peakGridPointPowerId.addEventListener('change', () => scheduleValidation(200));
  }

  // EVCS top-level inputs
  if (els.evcsCount) {
    els.evcsCount.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      sc.evcsCount = _clampInt(els.evcsCount.value, 1, 20, 1);
      buildEvcsUI();
    });
  }
  if (els.evcsMaxPowerKw) {
    els.evcsMaxPowerKw.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      const kw = Number(els.evcsMaxPowerKw.value);
      sc.evcsMaxPowerKw = Number.isFinite(kw) ? kw : (Number.isFinite(Number(sc.evcsMaxPowerKw)) ? Number(sc.evcsMaxPowerKw) : 11);
    });
  }
  if (els.addStationGroup) {
    els.addStationGroup.addEventListener('click', () => {
      const sc = _ensureSettingsConfig();
      sc.stationGroups = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
      sc.stationGroups.push({ stationKey: '', name: '', maxPowerKw: 0 });
      buildStationGroupsUI();
    });
  }

  if (els.save) {
    els.save.addEventListener('click', () => {
      saveConfig().catch(e => setStatus('Speichern fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.reload) {
    els.reload.addEventListener('click', () => {
      loadConfig().catch(e => setStatus('Laden fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.validate) {
    els.validate.addEventListener('click', () => {
      runValidation(true).catch(e => setStatus('Validierung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.refreshChargingDiag) {
    els.refreshChargingDiag.addEventListener('click', () => {
      refreshChargingDiag().catch(() => {});
    });
  }


  // Modal
  if (els.dpClose) els.dpClose.addEventListener('click', closeDpModal);
  if (els.dpModal) {
    els.dpModal.addEventListener('click', (e) => {
      if (e.target === els.dpModal) closeDpModal();
    });
  }
  if (els.dpSearchBtn) els.dpSearchBtn.addEventListener('click', () => doSearch().catch(() => {}));
  if (els.dpSearch) {
    els.dpSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch().catch(() => {});
    });
  }
  if (els.dpRootBtn) els.dpRootBtn.addEventListener('click', () => { treePrefix = ''; refreshTree().catch(() => {}); });
  if (els.dpUpBtn) els.dpUpBtn.addEventListener('click', () => { upOne(); refreshTree().catch(() => {}); });

  // Initial load
  loadConfig().catch(e => setStatus('Laden fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
})();
