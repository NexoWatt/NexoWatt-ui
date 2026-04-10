(function(){
  function el(id){ return document.getElementById(id); }

  const nfCache = new Map();
  function getNf(decimals){
    const key = String(decimals);
    let nf = nfCache.get(key);
    if (!nf){
      nf = new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      nfCache.set(key, nf);
    }
    return nf;
  }

  function fmtNum(value, decimals, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? getNf(decimals).format(n) : fallback;
  }

  function fmtMoney(value, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? (getNf(2).format(n) + ' €') : fallback;
  }

  function fmtPrice(value, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? (getNf(2).format(n) + ' €/kWh') : fallback;
  }

  function fmtKwh(value, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? (getNf(2).format(n) + ' kWh') : fallback;
  }

  function fmtPower(value, fallback = '—'){
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Math.abs(n) >= 1000) return getNf(1).format(n / 1000) + ' kW';
    return getNf(0).format(n) + ' W';
  }

  function pad2(n){ return String(n).padStart(2, '0'); }

  function toInputValue(ms){
    const ts = Number(ms);
    const d = Number.isFinite(ts) ? new Date(ts) : new Date();
    const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 16);
  }

  function parseInputValue(raw, fallbackMs){
    if (raw == null || raw === '') return Number(fallbackMs) || Date.now();
    const s = String(raw).trim();
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return parsed;
    const n = Number(s);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    return Number(fallbackMs) || Date.now();
  }

  function fmtDateTime(ms, fallback = '—'){
    const ts = Number(ms);
    if (!Number.isFinite(ts) || ts <= 0) return fallback;
    try { return new Date(ts).toLocaleString('de-DE'); } catch (_e) { return fallback; }
  }

  function fmtDate(ms, fallback = '—'){
    const ts = Number(ms);
    if (!Number.isFinite(ts) || ts <= 0) return fallback;
    try { return new Date(ts).toLocaleDateString('de-DE'); } catch (_e) { return fallback; }
  }

  function fmtTime(ms, fallback = '—'){
    const ts = Number(ms);
    if (!Number.isFinite(ts) || ts <= 0) return fallback;
    try { return new Date(ts).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' }); } catch (_e) { return fallback; }
  }

  function setUrlParams(params){
    try {
      const url = new URL(window.location.href);
      Object.keys(params || {}).forEach((key) => {
        const value = params[key];
        if (value === undefined || value === null || value === '') url.searchParams.delete(key);
        else url.searchParams.set(key, String(value));
      });
      window.history.replaceState({}, '', url.toString());
    } catch (_e) {}
  }

  function getQuery(name){
    try { return new URL(window.location.href).searchParams.get(name); } catch (_e) { return null; }
  }

  function downloadText(filename, text, type = 'text/plain;charset=utf-8'){
    const blob = new Blob([text == null ? '' : String(text)], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setupTopbar(activeTab = 'history'){
    const menuBtn = el('menuBtn');
    const menuDropdown = el('menuDropdown');
    if (menuBtn && menuDropdown){
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', () => menuDropdown.classList.add('hidden'));
      menuDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    ['liveTabBtn', 'historyTabBtn'].forEach((id) => {
      const btn = el(id);
      if (!btn) return;
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });

    const liveDot = el('liveDot');
    try {
      const es = new EventSource('/events');
      es.onopen = () => { if (liveDot) liveDot.classList.add('live'); };
      es.onerror = () => { if (liveDot) liveDot.classList.remove('live'); };
    } catch (_e) {}

    (async () => {
      try {
        const res = await fetch('/config');
        const cfg = await res.json();
        const settingsConfig = cfg && cfg.settingsConfig;
        const smartHomeEnabled = !!(cfg && cfg.smartHomeEnabled);
        const storageFarmEnabled = !!(cfg && cfg.storageFarmEnabled);
        const showEvcs = !!(settingsConfig && settingsConfig.evcsCount && settingsConfig.evcsCount >= 2);

        const map = [
          ['tabEvcs', 'menuEvcsLink', showEvcs],
          ['tabSmartHome', 'menuSmartHomeLink', smartHomeEnabled],
          ['tabStorageFarm', 'menuStorageFarmLink', storageFarmEnabled],
        ];
        map.forEach(([tabId, menuId, visible]) => {
          const tab = el(tabId);
          const menu = el(menuId);
          if (tab) tab.classList.toggle('hidden', !visible);
          if (menu) menu.classList.toggle('hidden', !visible);
        });
      } catch (_e) {}
    })();
  }

  window.NWReportCommon = {
    el,
    fmtNum,
    fmtMoney,
    fmtPrice,
    fmtKwh,
    fmtPower,
    fmtDateTime,
    fmtDate,
    fmtTime,
    toInputValue,
    parseInputValue,
    setUrlParams,
    getQuery,
    downloadText,
    escapeHtml,
    setupTopbar,
  };
})();
