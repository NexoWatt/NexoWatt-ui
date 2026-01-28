(function () {
  const $ = (id) => document.getElementById(id);

  const elStatus = $('nw-sim-status');
  const elStatusLine = $('nw-sim-statusline');
  const elInstance = $('nw-sim-instance');
  const btnRefresh = $('nw-sim-refresh');
  const btnEnable = $('nw-sim-enable');
  const btnDisable = $('nw-sim-disable');

  let _instances = [];

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
    btnRefresh.disabled = !!busy;
    btnEnable.disabled = !!busy;
    btnDisable.disabled = !!busy;
    if (elInstance) elInstance.disabled = !!busy;
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
    elStatus.innerHTML = parts.join(' ');

    const msgLines = [];
    if (st.lastAction) msgLines.push(`<div>Letzte Aktion: <b>${esc(st.lastAction)}</b></div>`);
    if (st.lastTs) {
      try {
        const d = new Date(st.lastTs);
        msgLines.push(`<div>Zeit: ${esc(d.toLocaleString())}</div>`);
      } catch (_e) {}
    }
    if (st.lastError) msgLines.push(`<div style="margin-top:6px;">${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(st.lastError)}</div>`);
    elStatusLine.innerHTML = msgLines.join('');
  }

  async function refreshDiscover() {
    const data = await api('/api/sim/discover');
    _instances = Array.isArray(data.instances) ? data.instances : [];
    renderInstances(data.defaultInstanceId || '');
  }

  async function refreshStatus() {
    const st = await api('/api/sim/status');
    renderStatus(st);
  }

  async function refreshAll() {
    setBusy(true);
    try {
      await refreshDiscover();
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    try {
      const instanceId = elInstance && elInstance.value ? elInstance.value : '';
      await api('/api/sim/enable', { method: 'POST', body: { instanceId } });
      await sleep(300);
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await api('/api/sim/disable', { method: 'POST', body: {} });
      await sleep(300);
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  if (btnRefresh) btnRefresh.addEventListener('click', () => refreshAll().catch((e) => {
    elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnEnable) btnEnable.addEventListener('click', () => enable().catch((e) => {
    elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnDisable) btnDisable.addEventListener('click', () => disable().catch((e) => {
    elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));

  // Initial load
  refreshAll().catch((e) => {
    elStatus.innerHTML = badge('nw-config-badge--error', 'Fehler');
    elStatusLine.innerHTML = esc(e && e.message ? e.message : e);
  });

  // Keep status fresh
  setInterval(() => {
    refreshStatus().catch(() => {});
  }, 5000);
})();
