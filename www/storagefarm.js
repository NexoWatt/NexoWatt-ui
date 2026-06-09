(function () {
  'use strict';

  var latestState = {};

  function el(id) { return document.getElementById(id); }
  function rawValue(key) {
    var st = latestState || {};
    var item = st[key];
    return item && Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : undefined;
  }
  function asNum(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function formatPower(v) {
    var n = asNum(v);
    if (n === null) return '--';
    var sign = n < 0 ? '-' : '';
    var a = Math.abs(n);
    if (a >= 1000000) return sign + (a / 1000000).toFixed(2) + ' MW';
    if (a >= 1000) return sign + (a / 1000).toFixed(1) + ' kW';
    return sign + Math.round(a) + ' W';
  }
  function parseJsonSafe(raw, fallback) {
    try {
      if (raw === null || raw === undefined || raw === '') return fallback;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'object') return raw;
      return JSON.parse(String(raw));
    } catch (_e) {
      return fallback;
    }
  }
  function setLive(ok) {
    var dot = el('liveDot');
    if (!dot) return;
    dot.classList.toggle('live', !!ok);
    dot.classList.toggle('online', !!ok);
  }
  function applyTopbarConfig(cfg) {
    cfg = cfg || {};
    var emsCfg = cfg.ems || {};
    var evcsCountRaw = cfg.settingsConfig && cfg.settingsConfig.evcsCount;
    var evcsCount = Math.max(0, Math.round(Number.isFinite(Number(evcsCountRaw)) ? Number(evcsCountRaw) : 0));
    var showEvcs = evcsCount >= 2;
    var showSmartHome = !!(cfg.smartHome && cfg.smartHome.enabled);
    var showStorageFarm = !!emsCfg.storageFarmEnabled;

    var tabEvcs = el('tabEvcs');
    var menuEvcs = el('menuEvcsLink');
    var tabSmart = el('tabSmartHome');
    var menuSmart = el('menuSmartHomeLink');
    var tabStorage = el('tabStorageFarm');
    var menuStorage = el('menuStorageFarmLink');

    if (tabEvcs) tabEvcs.classList.toggle('hidden', !showEvcs);
    if (menuEvcs) menuEvcs.classList.toggle('hidden', !showEvcs);
    if (tabSmart) tabSmart.classList.toggle('hidden', !showSmartHome);
    if (menuSmart) menuSmart.classList.toggle('hidden', !showSmartHome);
    if (tabStorage) tabStorage.classList.toggle('hidden', !showStorageFarm);
    if (menuStorage) menuStorage.classList.toggle('hidden', !showStorageFarm);
  }
  function statusList() {
    var list = parseJsonSafe(rawValue('storageFarm.storagesStatusJson'), []);
    return Array.isArray(list) ? list : [];
  }
  function updateModeLabel() {
    var out = el('sf_mode_label');
    if (!out) return;
    var mode = String(rawValue('storageFarm.mode') || 'pool').toLowerCase();
    out.textContent = 'Modus: ' + (mode === 'groups' ? 'Gruppen' : 'Pool');
  }
  function updateSummary() {
    var out = el('sf_summary');
    if (!out) return;
    var soc = rawValue('storageFarm.totalSoc');
    var chg = rawValue('storageFarm.totalChargePowerW');
    var dchg = rawValue('storageFarm.totalDischargePowerW');
    var on = rawValue('storageFarm.storagesOnline');
    var disp = rawValue('storageFarm.storagesDispatchAvailable');
    var deg = rawValue('storageFarm.storagesDegraded');
    var tot = rawValue('storageFarm.storagesTotal');
    var text = 'SoC Ø: ' + (soc !== undefined ? soc : '--') + ' %'
      + ' | Laden: ' + (chg !== undefined ? formatPower(chg) : '--')
      + ' | Entladen: ' + (dchg !== undefined ? formatPower(dchg) : '--')
      + ' | Online: ' + (on !== undefined ? on : '--') + '/' + (tot !== undefined ? tot : '--')
      + ' | Regelbar: ' + (disp !== undefined ? disp : '--') + '/' + (tot !== undefined ? tot : '--');
    if (deg !== undefined && Number(deg) > 0) text += ' | Degraded: ' + deg;
    out.textContent = text;
  }
  function mkCell(text, label) {
    var d = document.createElement('div');
    d.className = 'sf-cell';
    if (label) d.setAttribute('data-label', String(label));
    d.textContent = (text === undefined || text === null || text === '') ? '--' : String(text);
    return d;
  }
  function statusText(row) {
    var rowIsOnline = !!(row && (row.online === true || row.displayOnline === true || row.dispatchAvailable === true));
    var rowIsDegraded = !!(row && (row.degraded === true || row.state === 'degraded'));
    var reasons = []
      .concat(row && Array.isArray(row.dispatchBlockedReasons) ? row.dispatchBlockedReasons : [])
      .concat(row && Array.isArray(row.chargeBlockedReasons) ? row.chargeBlockedReasons : [])
      .concat(row && Array.isArray(row.dischargeBlockedReasons) ? row.dischargeBlockedReasons : []);
    var hardLock = reasons.some(function (x) {
      return ['available_false', 'fault_active', 'device_offline', 'charge_not_allowed', 'discharge_not_allowed'].indexOf(String(x || '')) >= 0;
    });
    var isIdle = (asNum(row && row.chargePowerW) ? Math.abs(Number(row.chargePowerW)) : 0)
      + (asNum(row && row.dischargePowerW) ? Math.abs(Number(row.dischargePowerW)) : 0) < 20;

    if (rowIsOnline && row && row.dispatchAvailable === true) return rowIsDegraded ? 'Degraded / Bereit' : (isIdle ? 'Online / Standby' : 'Online / Bereit');
    if (rowIsOnline && hardLock) return 'Gesperrt';
    if (rowIsOnline) return rowIsDegraded ? 'Degraded / prüfen' : 'Online / prüfen';
    if (row && row.dispatchAvailable) return 'Regelbar';
    return 'Offline';
  }
  function renderRows(list) {
    var wrap = el('sf_status_rows');
    var msg = el('sf_msg');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      if (msg) msg.textContent = 'Keine Speicher konfiguriert oder noch keine Statusdaten vorhanden.';
      return;
    }
    if (msg) msg.textContent = '';

    list.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'rfid-whitelist-row';
      r.style.gridTemplateColumns = '1.6fr 1fr 1fr 1fr 0.8fr';

      var socNum = asNum(row && row.soc);
      r.appendChild(mkCell(row && row.name ? row.name : 'Speicher', 'Speicher'));
      r.appendChild(mkCell(socNum === null ? '--' : socNum.toFixed(1), 'SoC (%)'));
      r.appendChild(mkCell(formatPower(row && row.chargePowerW), 'Laden'));
      r.appendChild(mkCell(formatPower(row && row.dischargePowerW), 'Entladen'));
      r.appendChild(mkCell(statusText(row), 'Status'));
      wrap.appendChild(r);
    });
  }
  function apply() {
    updateModeLabel();
    updateSummary();
    renderRows(statusList());
  }
  async function loadConfig() {
    try {
      var r = await fetch('/config', { cache: 'no-store' });
      var cfg = await r.json();
      applyTopbarConfig(cfg || {});
    } catch (_e) {}
  }
  async function loadState() {
    try {
      var r = await fetch('/api/state', { cache: 'no-store' });
      latestState = await r.json();
      setLive(true);
      apply();
    } catch (_e) {
      setLive(false);
      var msg = el('sf_msg');
      if (msg) msg.textContent = 'Status konnte nicht geladen werden.';
    }
  }
  function bind() {
    var btn = el('sf_reload');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) { e.preventDefault(); loadState(); });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    loadConfig();
    loadState();
    setInterval(loadState, 5000);
  });
})();
