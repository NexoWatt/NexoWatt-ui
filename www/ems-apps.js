/* NexoWatt EMS Apps (Installer) – Web UI */
(function () {
  'use strict';

  const els = {
    status: document.getElementById('nw-emsapps-status'),
    save: document.getElementById('nw-emsapps-save'),
    reload: document.getElementById('nw-emsapps-reload'),

    appsList: document.getElementById('appsList'),
    appsEmpty: document.getElementById('appsEmpty'),

    gridConnectionPower: document.getElementById('gridConnectionPower'),
    schedulerIntervalMs: document.getElementById('schedulerIntervalMs'),

    dpTable: document.getElementById('dpTable'),
    storageTable: document.getElementById('storageTable'),

    peakGridPointPowerId: document.getElementById('peakGridPointPowerId'),
    storageControlMode: document.getElementById('storageControlMode'),
    rawPatch: document.getElementById('rawPatch'),

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

  const APP_DEFS = [
    { key: 'enableChargingManagement', label: 'Lademanagement', desc: 'PV-Überschuss, Budget-Verteilung, Stationen/Connectors (wenn Setpoints gemappt)', default: true },
    { key: 'enablePeakShaving', label: 'Peak-Shaving', desc: 'Lastspitzenkappung / Import-Limit', default: false },
    { key: 'enableStorageControl', label: 'Speicherregelung', desc: 'Eigenverbrauchsoptimierung / Speicher Sollwerte (je nach Mapping)', default: false },
    { key: 'enableGridConstraints', label: 'Grid-Constraints', desc: 'Zusätzliche Netz-Begrenzungen (z.B. RLM/0-Einspeisung)', default: false },
    { key: 'enableMultiUse', label: 'MultiUse-Bausteine', desc: 'Weitere interne Logiken / Erweiterungen', default: true }
  ];

  // Base datapoints that are most commonly needed for VIS + EMS
  const BASE_DP_FIELDS = [
    { key: 'gridBuyPower', label: 'Netz Bezug (W)', placeholder: '... (Import)' },
    { key: 'gridSellPower', label: 'Netz Einspeisung (W)', placeholder: '... (Export)' },
    { key: 'gridPointPower', label: 'Netz Gesamt (W) (Import+ / Export-)', placeholder: 'optional – direktes NVP' },
    { key: 'pvPower', label: 'PV Leistung (W)', placeholder: '' },
    { key: 'consumptionTotal', label: 'Verbrauch Gesamt (W)', placeholder: '' },
    { key: 'batteryPower', label: 'Batterie Leistung (W)', placeholder: '' },
    { key: 'storageSoc', label: 'Speicher SoC (%)', placeholder: '' },
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
    els.appsList.innerHTML = '';

    for (const app of APP_DEFS) {
      const id = 'app_' + app.key;
      const wrapper = document.createElement('div');
      wrapper.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = app.label;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = app.desc;

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = id;
      chk.dataset.appKey = app.key;

      right.appendChild(chk);

      wrapper.appendChild(left);
      wrapper.appendChild(right);

      els.appsList.appendChild(wrapper);
    }

    els.appsEmpty.style.display = APP_DEFS.length ? 'none' : 'block';
  }

  function setAppsFromConfig(cfg) {
    for (const app of APP_DEFS) {
      const chk = document.getElementById('app_' + app.key);
      if (!chk) continue;
      const raw = cfg ? cfg[app.key] : undefined;
      if (typeof raw === 'boolean') chk.checked = raw;
      else chk.checked = !!app.default;
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

      input.addEventListener('change', () => setter(field.key, input.value.trim()));

      right.appendChild(input);
      right.appendChild(btn);

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

  function applyConfigToUI(cfg) {
    currentConfig = cfg || {};

    // Apps
    setAppsFromConfig(currentConfig);

    // Plant params
    els.gridConnectionPower.value = numOrEmpty(currentConfig.installerConfig && currentConfig.installerConfig.gridConnectionPower);
    els.schedulerIntervalMs.value = numOrEmpty(currentConfig.schedulerIntervalMs);

    // Datapoints
    const dps = currentConfig.datapoints || {};
    buildDpTable(
      els.dpTable,
      BASE_DP_FIELDS,
      (key) => dps[key],
      (key, val) => {
        currentConfig.datapoints = currentConfig.datapoints || {};
        currentConfig.datapoints[key] = val;
      },
      { idPrefix: 'dp_' }
    );

    // Peak expert
    els.peakGridPointPowerId.value = valueOrEmpty(currentConfig.peakShaving && currentConfig.peakShaving.gridPointPowerId);

    // Storage
    const mode = (currentConfig.storage && typeof currentConfig.storage.controlMode === 'string') ? currentConfig.storage.controlMode : 'targetPower';
    els.storageControlMode.value = (['targetPower','limits','enableFlags'].includes(mode)) ? mode : 'targetPower';
    rebuildStorageTable();
  }

  async function loadConfig() {
    setStatus('Lade Konfiguration…');
    const data = await fetchJson('/api/installer/config');
    applyConfigToUI(data.config || {});
    setStatus('Konfiguration geladen.', 'ok');
  }

  function collectPatchFromUI() {
    const patch = {};

    // Apps
    for (const app of APP_DEFS) {
      const chk = document.getElementById('app_' + app.key);
      if (!chk) continue;
      patch[app.key] = !!chk.checked;
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

  // --- DP Modal ---

  function openDpModal(targetInputId) {
    dpTargetInputId = targetInputId;
    treePrefix = '';
    els.dpSearch.value = '';
    els.dpResults.innerHTML = '';
    els.dpTree.innerHTML = '';
    els.dpBreadcrumb.textContent = '';
    els.dpModal.classList.remove('hidden');
    refreshTree().catch(() => {});
  }

  function closeDpModal() {
    els.dpModal.classList.add('hidden');
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

  async function refreshTree() {
    const data = await fetchJson('/api/iobroker/tree?prefix=' + encodeURIComponent(treePrefix || ''));
    const children = Array.isArray(data.children) ? data.children : [];

    els.dpBreadcrumb.textContent = treePrefix ? ('Prefix: ' + treePrefix) : 'Prefix: (root)';
    els.dpTree.innerHTML = '';

    if (!children.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Einträge.';
      els.dpTree.appendChild(empty);
      return;
    }

    for (const ch of children) {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = (ch.hasChildren ? '📁 ' : '📄 ') + (ch.label || ch.id);

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = ch.id + (ch.name ? (' — ' + ch.name) : '');

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';

      if (ch.hasChildren) {
        const btnOpen = document.createElement('button');
        btnOpen.type = 'button';
        btnOpen.className = 'nw-config-btn nw-config-btn--ghost';
        btnOpen.textContent = 'Öffnen';
        btnOpen.onclick = () => { treePrefix = ch.id; refreshTree().catch(() => {}); };
        right.appendChild(btnOpen);
      }

      if (ch.isState) {
        const btnSel = document.createElement('button');
        btnSel.type = 'button';
        btnSel.className = 'nw-config-btn nw-config-btn--primary';
        btnSel.textContent = 'Wählen';
        btnSel.onclick = () => setDpTargetValue(ch.id);
        right.appendChild(btnSel);
      }

      row.appendChild(left);
      row.appendChild(right);

      els.dpTree.appendChild(row);
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
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = r.id;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = (r.name || '') + (r.role ? (' — ' + r.role) : '');

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--primary';
      btn.textContent = 'Wählen';
      btn.onclick = () => setDpTargetValue(r.id);

      right.appendChild(btn);

      row.appendChild(left);
      row.appendChild(right);

      els.dpResults.appendChild(row);
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

  if (els.storageControlMode) {
    els.storageControlMode.addEventListener('change', () => {
      // Only rebuild required fields; keep currentConfig.storage.controlMode updated
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.controlMode = getStorageMode();
      rebuildStorageTable();
    });
  }

  // manual browse buttons
  document.querySelectorAll('[data-browse]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-browse');
      if (id) openDpModal(id);
    });
  });

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
