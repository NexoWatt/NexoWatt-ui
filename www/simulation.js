(function () {
  const $ = (id) => document.getElementById(id);

  const elStatus = $('nw-sim-status');
  const elStatusLine = $('nw-sim-statusline');
  const elInstance = $('nw-sim-instance');
  const btnRefresh = $('nw-sim-refresh');
  const btnEnable = $('nw-sim-enable');
  const btnDisable = $('nw-sim-disable');

  // Scenario UI (optional; only present in newer versions)
  const elScenStatus = $('nw-sim-scen-status');
  const elScenSelect = $('nw-sim-scen-select');
  const elScenDesc = $('nw-sim-scen-desc');
  const btnScenRefresh = $('nw-sim-scen-refresh');
  const btnScenStart = $('nw-sim-scen-start');
  const btnScenStop = $('nw-sim-scen-stop');
  const btnScenReset = $('nw-sim-scen-reset');

  let _instances = [];
  let _status = null;
  let _scenarios = [];
  let _scenariosById = {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setBusy(busy) {
    const b = !!busy;
    if (btnRefresh) btnRefresh.disabled = b;
    if (btnEnable) btnEnable.disabled = b;
    if (btnDisable) btnDisable.disabled = b;
    if (elInstance) elInstance.disabled = b;

    if (btnScenRefresh) btnScenRefresh.disabled = b;
    if (btnScenStart) btnScenStart.disabled = b;
    if (btnScenStop) btnScenStop.disabled = b;
    if (btnScenReset) btnScenReset.disabled = b;
    if (elScenSelect) elScenSelect.disabled = b;
  }

  function badge(cls, text) {
    return `<span class="nw-config-badge ${cls}">${esc(text)}</span>`;
  }

  async function api(path, opts) {
    const o = opts || {};
    const res = await fetch(path, {
      method: o.method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...(o.headers || {}),
      },
      body: o.body ? JSON.stringify(o.body) : undefined,
      credentials: 'include',
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = { ok: false, error: text || 'invalid json' }; }
    if (!res.ok || (data && data.ok === false)) {
      const msg = (data && data.error) ? data.error : (`HTTP ${res.status}`);
      throw new Error(msg);
    }
    return data;
  }

  function renderInstances(defaultId) {
    if (!elInstance) return;
    const prev = elInstance.value;
    elInstance.innerHTML = '';
    for (const it of _instances) {
      const opt = document.createElement('option');
      opt.value = it.instanceId;
      const suffix = it.enabled ? '' : ' (deaktiviert)';
      opt.textContent = `${it.instanceId}${suffix}`;
      elInstance.appendChild(opt);
    }

    const candidates = [prev, defaultId, (_instances[0] && _instances[0].instanceId) || ''].filter(Boolean);
    for (const c of candidates) {
      if (_instances.some((x) => x.instanceId === c)) {
        elInstance.value = c;
        break;
      }
    }
  }

  function renderStatus(st) {
    const active = !!st.active;
    const backupExists = !!st.backupExists;
    const inst = st.instanceId || '';

    const parts = [];
    parts.push(active ? badge('nw-config-badge--ok', 'Aktiv') : badge('nw-config-badge--idle', 'Inaktiv'));
    parts.push(backupExists ? badge('nw-config-badge--ok', 'Backup vorhanden') : badge('nw-config-badge--warn', 'Kein Backup'));
    if (inst) parts.push(badge('nw-config-badge--auto', `Instanz: ${inst}`));
    if (elStatus) elStatus.innerHTML = parts.join(' ');

    const msgLines = [];
    if (st.lastAction) msgLines.push(`<div>Letzte Aktion: <b>${esc(st.lastAction)}</b></div>`);
    if (st.lastTs) {
      try {
        const d = new Date(st.lastTs);
        msgLines.push(`<div>Zeit: ${esc(d.toLocaleString())}</div>`);
      } catch (_e) {}
    }
    if (st.lastError) msgLines.push(`<div style="margin-top:6px;">${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(st.lastError)}</div>`);
    if (elStatusLine) elStatusLine.innerHTML = msgLines.join('');
  }

  function currentInstanceId() {
    // Prefer active instance from status; fallback to dropdown selection.
    if (_status && _status.instanceId) return String(_status.instanceId);
    if (elInstance && elInstance.value) return String(elInstance.value);
    return '';
  }

  function renderScenarioCatalog(catalog, preferredSelectedId) {
    if (!elScenSelect) return;

    _scenarios = Array.isArray(catalog) ? catalog : [];
    _scenariosById = {};
    for (const s of _scenarios) {
      if (s && s.id) _scenariosById[String(s.id)] = s;
    }

    const prev = elScenSelect.value;
    elScenSelect.innerHTML = '';

    for (const s of _scenarios) {
      const opt = document.createElement('option');
      opt.value = s.id;
      const kind = s.kind ? ` – ${s.kind}` : '';
      opt.textContent = `${s.title || s.id}${kind}`;
      elScenSelect.appendChild(opt);
    }

    const candidates = [preferredSelectedId, prev, (_scenarios[0] && _scenarios[0].id) || ''].filter(Boolean);
    for (const c of candidates) {
      if (_scenarios.some((x) => x && x.id === c)) {
        elScenSelect.value = c;
        break;
      }
    }

    renderScenarioDesc();
  }

  function renderScenarioDesc() {
    if (!elScenDesc || !elScenSelect) return;
    const id = elScenSelect.value ? String(elScenSelect.value) : '';
    const s = id && _scenariosById[id] ? _scenariosById[id] : null;

    const lines = [];
    if (id) lines.push(`<div><b>${esc(id)}</b></div>`);
    if (s && s.description) lines.push(`<div style="margin-top:6px;">${esc(s.description)}</div>`);
    elScenDesc.innerHTML = lines.join('');
  }

  function renderScenarioStatus(st) {
    if (!elScenStatus) return;

    const parts = [];
    parts.push(st && st.active ? badge('nw-config-badge--ok', 'Aktiv') : badge('nw-config-badge--idle', 'Idle'));
    parts.push(st && st.running ? badge('nw-config-badge--ok', 'Running') : badge('nw-config-badge--idle', 'Stopped'));

    if (st && st.phase) parts.push(badge('nw-config-badge--auto', `Phase: ${st.phase}`));
    if (st && st.selected) parts.push(badge('nw-config-badge--auto', `Selected: ${st.selected}`));

    const extra = [];
    if (st && st.elapsed_s && Number(st.elapsed_s) > 0) extra.push(`Elapsed: ${Math.round(Number(st.elapsed_s))}s`);
    if (st && st.remaining_s && Number(st.remaining_s) > 0) extra.push(`Remaining: ${Math.round(Number(st.remaining_s))}s`);

    const html = [
      parts.join(' '),
      (st && st.statusText) ? `<div class="nw-muted" style="margin-top:8px; line-height:1.35;">${esc(st.statusText)}</div>` : '',
      (extra.length ? `<div class="nw-muted" style="margin-top:6px;">${esc(extra.join(' • '))}</div>` : ''),
    ].join('');

    elScenStatus.innerHTML = html;
  }

  async function refreshDiscover() {
    const data = await api('/api/sim/discover');
    _instances = Array.isArray(data.instances) ? data.instances : [];
    renderInstances(data.defaultInstanceId || '');
  }

  async function refreshStatus() {
    const st = await api('/api/sim/status');
    _status = st;
    renderStatus(st);
  }

  async function refreshScenarios(forceCatalog = false) {
    if (!elScenStatus && !elScenSelect) return;

    const inst = currentInstanceId();
    if (!inst) {
      renderScenarioStatus({ active: false, running: false, phase: '', selected: '', statusText: 'Keine Sim-Instanz ausgewählt.' });
      return;
    }

    const data = await api(`/api/sim/scenarios?instanceId=${encodeURIComponent(inst)}`);
    const catalog = Array.isArray(data.catalog) ? data.catalog : [];
    const st = data.status || {};
    renderScenarioStatus(st);

    // Refresh catalog (select options) if forced or if empty
    if (forceCatalog || !_scenarios.length) {
      renderScenarioCatalog(catalog, st && st.selected ? String(st.selected) : '');
    } else {
      // Still update description based on selected id
      if (st && st.selected && elScenSelect) {
        const sel = String(st.selected);
        if (_scenariosById[sel]) elScenSelect.value = sel;
      }
      renderScenarioDesc();
    }
  }

  async function refreshAll() {
    setBusy(true);
    try {
      await refreshDiscover();
      await refreshStatus();
      await refreshScenarios(true);
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    try {
      const instanceId = elInstance && elInstance.value ? elInstance.value : '';
      await api('/api/sim/enable', { method: 'POST', body: { instanceId } });
      await sleep(400);
      await refreshStatus();
      await refreshScenarios(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await api('/api/sim/disable', { method: 'POST', body: {} });
      await sleep(400);
      await refreshStatus();
      await refreshScenarios(true);
    } finally {
      setBusy(false);
    }
  }

  async function startScenario() {
    if (!elScenSelect) return;
    const inst = currentInstanceId();
    const id = elScenSelect.value ? String(elScenSelect.value) : '';
    if (!inst || !id) return;

    await api('/api/sim/scenario/start', { method: 'POST', body: { instanceId: inst, id } });
    await sleep(250);
    await refreshScenarios(false);
  }

  async function stopScenario() {
    const inst = currentInstanceId();
    if (!inst) return;

    await api('/api/sim/scenario/stop', { method: 'POST', body: { instanceId: inst } });
    await sleep(250);
    await refreshScenarios(false);
  }

  async function resetScenario() {
    const inst = currentInstanceId();
    if (!inst) return;

    await api('/api/sim/scenario/reset', { method: 'POST', body: { instanceId: inst } });
    await sleep(250);
    await refreshScenarios(false);
  }

  if (btnRefresh) btnRefresh.addEventListener('click', () => refreshAll().catch((e) => {
    if (elStatusLine) elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnEnable) btnEnable.addEventListener('click', () => enable().catch((e) => {
    if (elStatusLine) elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnDisable) btnDisable.addEventListener('click', () => disable().catch((e) => {
    if (elStatusLine) elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));

  if (btnScenRefresh) btnScenRefresh.addEventListener('click', () => refreshScenarios(true).catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (elScenSelect) elScenSelect.addEventListener('change', () => renderScenarioDesc());
  if (btnScenStart) btnScenStart.addEventListener('click', () => startScenario().catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnScenStop) btnScenStop.addEventListener('click', () => stopScenario().catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnScenReset) btnScenReset.addEventListener('click', () => resetScenario().catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));

  // Initial load
  refreshAll().catch((e) => {
    if (elStatus) elStatus.innerHTML = badge('nw-config-badge--error', 'Fehler');
    if (elStatusLine) elStatusLine.innerHTML = esc(e && e.message ? e.message : e);
  });

  // Keep status fresh
  setInterval(() => {
    refreshStatus().catch(() => {});
    refreshScenarios(false).catch(() => {});
  }, 5000);
})();
