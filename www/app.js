
// --- Precise donut placement (anchor angles like OpenEMS) ---
function arcLenFromDeg(r, deg){ return 2 * Math.PI * r * (deg/360); }
function setArcAtAngle(selector, r, angleDeg, arcDeg){
  const C = 2 * Math.PI * r;
  const Ldeg = Math.max(0, Math.min(359.9, arcDeg));
  const dash = arcLenFromDeg(r, Ldeg);
  const offset = arcLenFromDeg(r, angleDeg) - dash/2; // center arc
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + (C - dash).toFixed(1));
  el.setAttribute('stroke-dashoffset', offset.toFixed(1));
}
function placeIconAtAngle(sel, angleDeg){
  const wrap = document.querySelector('.card.energy-donut .donut-wrap');
  const el = document.querySelector(sel);
  const svg = document.querySelector('.card.energy-donut .donut');
  if (!wrap || !el || !svg) return;
  const size = wrap.getBoundingClientRect().width;
  const R = size/2; 
  const nudge = Math.max(8, size/28);
  const a = (angleDeg - 90) * Math.PI / 180;
  const cx = size/2 + (R + nudge) * Math.cos(a);
  const cy = size/2 + (R + nudge) * Math.sin(a);
  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  el.style.position='absolute';
  el.style.transform = 'translate(-50%, -50%)';
}

// Draw an arc inside a quadrant slot with small gaps between quadrants
function setArcInSlot(selector, r, slotIndex, slotFillPct){
  const C = 2 * Math.PI * r;
  const Q = C / 4;               // quarter length
  const gap = 4;                 // pixels gap in each slot
  const slotMax = Q - gap;       // usable track
  const fill = Math.max(0, Math.min(100, slotFillPct||0));
  const L = (fill/100) * slotMax;
  const start = slotIndex * Q + gap/2 + (slotMax - L)/2; // center arc in slot
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', L.toFixed(1) + ' ' + (C-L).toFixed(1));
  el.setAttribute('stroke-dashoffset', start.toFixed(1));
}

function setArc(selector, r, valuePct){
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valuePct||0));
  const dash = (v/100)*max, rest = max-dash;
  const el=document.querySelector(selector);
  if(!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1)+' '+rest.toFixed(1));
}

function setDonut(cls, pct, inner=false) {
  const r = inner ? 34 : 42;
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const q = '.donut .seg.' + cls;
  const el = document.querySelector(q);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + rest.toFixed(1));
}

// Format hours to "h:mm"
function formatHours(h) {
  if (!h || !isFinite(h) || h <= 0) return '--';
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh + 'h ' + (mm<10?'0':'') + mm + 'm';
}

let state = {};
let units = { power: 'W', energy: 'kWh' };

let _renderScheduled = false;
function scheduleRender(){
  if (_renderScheduled) return;
  _renderScheduled = true;
  const cb = ()=>{
    _renderScheduled = false;
    try{ render(); }catch(_e){}
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(cb);
  else setTimeout(cb, 16);
}


function formatPower(v) {
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}

function formatPowerSigned(v){
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  const sign = n>0?'+':(n<0?'-':'');
  const abs = Math.abs(n);
  if (units.power === 'kW') return sign + (abs/1000).toFixed(2) + ' kW';
  return sign + abs.toFixed(0) + ' W';
}

function formatNum(v, suffix='') {

  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}

function formatNum(v, suffix='') {

  if (v === undefined || v === null || isNaN(v)) return '--';
  return Number(v).toFixed(1) + (suffix || '');
}


function formatPricePerKwh(v){
  if (v===undefined || v===null || isNaN(v)) return '--';
  const n = Number(v);
  // assume €/kWh if v < 10, else probably ct/kWh
  if (n < 10) return n.toFixed(3) + ' €/kWh';
  return (n/100).toFixed(2) + ' €/kWh'; // if provided in ct
}
function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
}

function setRingSegment(cls, pct) {
  const max = 2 * Math.PI * 42; // circumference
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const el = document.querySelector?.('.ring .seg.' + cls);
  if (el) el.setAttribute('stroke-dasharray', `${dash} ${rest}`);
}

function computeDerived() {
  // derive some percentages if not provided
  const pv = pick('pvPower', 'productionTotal');
  const load = pick('consumptionTotal');
  const buy = pick('gridBuyPower');
  const sell = pick('gridSellPower');

  const autarky = get('autarky');
  const selfc = get('selfConsumption');

  const res = {};
  if (autarky == null && pv != null && load != null) {
    // simple heuristic: share of load supplied by PV + battery (ignore battery for simplicity)
    const suppliedByPv = Math.max(0, Math.min(100, (pv / Math.max(1, load)) * 100));
    res.autarky = Math.max(0, Math.min(100, suppliedByPv));
  }
  if (selfc == null && pv != null) {
    // share of production used locally (pv - sell)/pv
    const local = Math.max(0, pv - (sell || 0));
    const pct = pv > 0 ? (local / pv) * 100 : 0;
    res.selfConsumption = Math.max(0, Math.min(100, pct));
  }
  return res;

  function get(k){ return state[k]?.value; }
  function pick(...keys){
    for (const k of keys) { const v = get(k); if (v != null && !isNaN(v)) return Number(v); }
    return null;
  }
}


function coerceNumber(v){
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // allow "19", "19.5", "19,5", "19 %"
  const cleaned = s.replace(/%/g, '').replace(/\s+/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
function clamp01(v, lo, hi){
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, v));
}

function render() {
  const s = state;

  const d = (k) => s[k]?.value;

  // Top ring values: map PV, Grid, Load, Bat flows to percent of max for visualization
  const pv = d('pvPower') ?? d('productionTotal');
  const load = d('consumptionTotal');
  const buy = d('gridBuyPower');
  const sell = d('gridSellPower');
  const charge = d('storageChargePower');
  const discharge = d('storageDischargePower');
  const soc = d('storageSoc');

  const maxVal = Math.max(1, ...[pv, load, buy, sell, charge, discharge].filter(x => typeof x === 'number').map(Math.abs));
  const pct = (v) => typeof v === 'number' ? (Math.abs(v) / maxVal) * 100 : 0;

  setRingSegment('pv', pct(pv));
  setRingSegment('grid', pct((buy||0)+(sell||0)));
  setRingSegment('load', pct(load));
  setRingSegment('bat', pct((charge||0)+(discharge||0)));

  setText('pvPower', formatPower(pv ?? 0));
  setText('gridBuyPower', formatPower(buy ?? 0));
  setText('gridSellPower', formatPower(sell ?? 0));
  const batPower = (charge||0) - (discharge||0);
  setText('storagePower', formatPower(batPower));
  setText('consumptionTotal', formatPower(load ?? 0));

  // Cards
  const derived = computeDerived();
  const autarky = d('autarky') ?? derived.autarky;
  const selfc = d('selfConsumption') ?? derived.selfConsumption;

  const autarkyN = clamp01(coerceNumber(autarky), 0, 100);
  const selfcN = clamp01(coerceNumber(selfc), 0, 100);
  const socN = clamp01(coerceNumber(soc), 0, 100);

  setWidth('autarkyBar', autarkyN ?? 0);
  setText('autarkyValue', (autarkyN != null ? autarkyN.toFixed(0) : '--') + ' %');

  setWidth('selfConsumptionBar', selfcN ?? 0);
  setWidth('selfVerbrauchBar', selfcN ?? 0);
  setText('selfConsumptionValue', (selfcN != null ? selfcN.toFixed(0) : '--') + ' %');
  setText('selfVerbrauchValue', (selfcN != null ? selfcN.toFixed(0) : '--') + ' %');

  setWidth('storageSocBar', socN ?? 0);
  setText('storageSocValue', (socN != null ? socN.toFixed(0) : '--') + ' %');

  setText('storageChargePower', formatPower(charge ?? 0));
  setText('storageLadenPower', formatPower(charge ?? 0));
  setText('storageDischargePower', formatPower(discharge ?? 0));
  setText('storageEntladenPower', formatPower(discharge ?? 0));

  setText('gridBuyPowerCard', formatPower(buy ?? 0));
  setText('gridSellPowerCard', formatPower(sell ?? 0));
  setText('gridEnergyKwh', (d('gridEnergyKwh')!=null? Number(d('gridEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('productionEnergyKwh', (d('productionEnergyKwh')!=null? Number(d('productionEnergyKwh')).toFixed(2)+' kWh':'--'));
  const pvEnergyKwh = coerceNumber(d('productionEnergyKwh'));
  const co2FromPvT = pvEnergyKwh != null ? (pvEnergyKwh * 0.0004) : null; // 0.4 kg CO₂ / kWh -> t CO₂
  const co2Dp = d('co2Savings');
  setText('co2Savings', (co2Dp != null ? (isNaN(Number(co2Dp)) ? String(co2Dp) : Number(co2Dp).toFixed(1) + ' t') : (co2FromPvT != null ? co2FromPvT.toFixed(1) + ' t' : '--')));


  setText('productionTotal', formatPower(d('productionTotal') ?? pv ?? 0));
  setText('gridFrequency', d('gridFrequency') != null ? d('gridFrequency').toFixed(2) + ' Hz' : '--');

  setText('consumptionEvcs', formatPower(d('consumptionEvcs') ?? 0));
  setText('consumptionEnergyKwh', (d('consumptionEnergyKwh')!=null? Number(d('consumptionEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('consumptionBuilding', formatPower(d('consumptionTotal') ?? 0));

  setText('evcsStatus', (d('evcsStatus') ?? '--'));
  setText('evcsLastChargeKwh', d('evcsLastChargeKwh') != null ? d('evcsLastChargeKwh').toFixed(2) + ' kWh' : '--');
  if (window.__evcsApply) window.__evcsApply(d, state);

  // Settings: RFID learning UI state (if present)
  try {
    if (typeof window.__nwApplyRfidLearningUi === 'function') window.__nwApplyRfidLearningUi();
  } catch (_e) {}
}

async function bootstrap() {
  let cfg = {};
  try {
    const cfgRes = await fetch('/config');
    cfg = await cfgRes.json();
    units = cfg.units || units;
    try{
      const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
      window.__nwEvcsCount = c;
      const l = document.getElementById('menuEvcsLink');
      if (l) l.classList.toggle('hidden', c < 2);
      const t = document.getElementById('tabEvcs');
      if (t) t.classList.toggle('hidden', c < 2);
      const sh = !!(cfg.smartHome && cfg.smartHome.enabled);
      window.__nwSmartHomeEnabled = sh;
      const sl = document.getElementById('menuSmartHomeLink');
      if (sl) sl.classList.toggle('hidden', !sh);
      const st = document.getElementById('tabSmartHome');
      if (st) st.classList.toggle('hidden', !sh);

      // Speicherfarm Tab/Link
      const sf = !!(cfg.ems && cfg.ems.storageFarmEnabled);
      const sft = document.getElementById('tabStorageFarm');
      if (sft) sft.classList.toggle('hidden', !sf);
      const sfl = document.getElementById('menuStorageFarmLink');
      if (sfl) sfl.classList.toggle('hidden', !sf);
    }catch(_e){}
  } catch(e) {}

  const snap = await fetch('/api/state').then(r => r.json());
  state = snap || {};
  // merge cfg.settings into state if missing (for initial checkbox values)
  try{
    if (cfg && cfg.settings){
      Object.keys(cfg.settings).forEach(k=>{
        const sk = 'settings.'+k;
        if (!state[sk]) state[sk] = { value: cfg.settings[k] };
      });
    }
  } catch(e){}

  window.latestState = state;
  scheduleRender();

  try { if (typeof setupSettings === 'function') setupSettings(); } catch (e) {}
  function startEvents(){
  try{
    const es = new EventSource('/events');
    const dot = document.getElementById('liveDot');
    if (dot) dot.classList.remove('live');
    es.onopen = () => { if (dot) dot.classList.add('live'); };
    es.onerror = () => { if (dot) dot.classList.remove('live'); try{ es.close(); }catch(_){ } setTimeout(startEvents, 3000); };
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' && msg.payload) { state = msg.payload; window.latestState = state; }
        else if (msg.type === 'update' && msg.payload) { Object.assign(state, msg.payload); window.latestState = state; }
        scheduleRender();
      } catch (e) { console.warn(e); }
    };
  } catch(e){ console.warn('events', e); setTimeout(startEvents, 3000); }
}
startEvents();

}


// --- Menu & Settings ---
function initMenu(){
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('menuDropdown');
  if (!btn || !menu) return;
  const open = ()=> menu.classList.toggle('hidden');
  const close = ()=> menu.classList.add('hidden');
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); open(); });
  menu.addEventListener('click', (e)=> e.stopPropagation());
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
  document.addEventListener('click', ()=> close());
  const settingsBtn = document.getElementById('menuOpenSettings');
  const installerBtn = document.getElementById('menuOpenInstaller');
  if (settingsBtn) settingsBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    close();
    // show settings section
    hideAllPanels();
    document.querySelector('.content').style.display = 'none';
    const sec = document.querySelector('[data-tab-content="settings"]');
    if (sec) sec.classList.remove('hidden');
      try{ if (typeof initSettingsPanel==='function') initSettingsPanel(); }catch(_e){}
      try{ if (typeof setupSettings==='function') setupSettings(); }catch(_e){}
    // deactivate tab buttons
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
    // initialize settings UI
    initSettingsPanel();
    setupSettings();
  });
  }


function initSettingsPanel(){
  // Button inside settings to open ioBroker Admin (auto host:8081)
  const openInstallerAdmin = document.getElementById('openInstallerAdmin');
  if (openInstallerAdmin && !openInstallerAdmin.dataset.bound) {
    openInstallerAdmin.dataset.bound='1';
    openInstallerAdmin.addEventListener('click', (e)=>{
      e.preventDefault();
      const proto = (location.protocol === 'https:') ? 'https:' : 'http:';
      const host  = location.hostname || 'localhost';
      const url   = proto + '//' + host + ':8081/';
      window.open(url, '_blank');
    });
  }
  // Force sliders to emit only 1 or 2
  const p = document.getElementById('s_priority');
  const t = document.getElementById('s_tariffMode');
  [p,t].forEach(el => {
    if (!el) return;
    el.min = 1; el.max = 2; el.step = 1;
    el.addEventListener('input', ()=>{ if (el.value < 1.5) el.value = 1; else el.value = 2; });
    el.addEventListener('change', ()=>{ if (el.value < 1.5) el.value = 1; else el.value = 2; });
  });

  const LS_KEY = 'nexowatt.settings';
  let opts;
  try { opts = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(_) { opts = {}; }

  const elSoc = document.getElementById('optShowSocBadge');
  if (elSoc) {
    if (typeof opts.showSocBadge === 'undefined') opts.showSocBadge = true;
    elSoc.checked = !!opts.showSocBadge;
    const applySoc = ()=> {
      const t = document.getElementById('batterySocIn');
      if (t) t.style.display = elSoc.checked ? '' : 'none';
    };
    elSoc.addEventListener('change', ()=>{
      opts.showSocBadge = elSoc.checked;
      localStorage.setItem(LS_KEY, JSON.stringify(opts));
      applySoc();
    });
    applySoc();
  }

  const elRef = document.getElementById('optRefreshSec');
  if (elRef) {
    if (typeof opts.refreshSec === 'undefined') opts.refreshSec = 1;
    elRef.value = opts.refreshSec;
    elRef.addEventListener('change', ()=>{
      const v = Math.max(1, parseInt(elRef.value||'1', 10));
      opts.refreshSec = v;
      localStorage.setItem(LS_KEY, JSON.stringify(opts));
    });
  }
}

window.addEventListener('DOMContentLoaded', ()=> {
  bootstrap();
  initMenu();
  initSettingsPanel();
  try { initStorageFarmPanel(); } catch(_e) {}
  initTabs();
  hideAllPanels();

  // If opened directly as standalone Settings page, show settings panel by default
  try {
    const p = (location && location.pathname) ? String(location.pathname) : '';
    const isSettings = p.endsWith('/settings.html') || p.endsWith('settings.html');
    if (isSettings) {
      const live = document.querySelector('.content');
      if (live) live.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      try { setupSettings(); } catch(_e) {}
    }
  } catch(_e) {}
});


 // --- Settings & Installer logic ---

function hideAllPanels(){ document.querySelectorAll('[data-tab-content]').forEach(el=> el.classList.add('hidden')); document.querySelector('.content').style.display='block'; }
let SERVER_CFG = { adminUrl: null, installerLocked: false };

async function loadConfig() {
  try {
    const r = await fetch('/config');
    const j = await r.json();
    SERVER_CFG = j || {};
  } catch(e) { console.warn('cfg', e); }
}

function bindInputValue(el, stateKey) {
  // Always refresh the input from the latest snapshot first
  const st = window.latestState || {};
  const info = st[stateKey] || st['settings.' + el.dataset.key] || st['installer.' + el.dataset.key];
  if (info && info.value !== undefined) {
    const v = info.value;
    if (el.type === 'checkbox') {
      // Be robust against boolean/number/string representations
      if (v === true) el.checked = true;
      else if (v === false) el.checked = false;
      else if (typeof v === 'number') el.checked = v !== 0;
      else if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        el.checked = (s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'ja');
      } else {
        el.checked = !!v;
      }
    } else {
      el.value = v;
    }
  }

  // Derive API scope+key from stateKey ('settings.<key>' / 'installer.<key>' / 'evcs.<idx>.<prop>')
  const sk = String(stateKey || '');
  let scope = 'settings';
  let key = sk;
  if (sk.startsWith('settings.')) { scope = 'settings'; key = sk.slice(9); }
  else if (sk.startsWith('installer.')) { scope = 'installer'; key = sk.slice(10); }
  else if (sk.startsWith('evcs.rfid.')) { scope = 'rfid'; key = sk.slice(10); }
  else if (sk.startsWith('rfid.')) { scope = 'rfid'; key = sk.slice(5); }
  else if (sk.startsWith('storageFarm.')) { scope = 'storageFarm'; key = sk.slice(12); }
  else if (sk.startsWith('evcs.')) { scope = 'evcs'; key = sk; }

  // Prevent duplicate listeners when setupSettings() is called multiple times
  if (el.dataset.nwBound === '1') return;
  el.dataset.nwBound = '1';

  el.addEventListener('change', async () => {
    let val;
    if (el.type === 'checkbox') val = !!el.checked;
    else if (el.type === 'number' || el.type === 'range') {
      val = Number(el.value);
      if (!Number.isFinite(val)) val = 0;
    } else val = el.value;

    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, key, value: val })
      });
    } catch (e) { /* ignore */ }
  });
}
function setupSettings(){
  document.querySelectorAll('[data-scope="settings"]').forEach(el=> bindInputValue(el, 'settings.'+el.dataset.key));
  document.querySelectorAll('[data-scope="rfid"]').forEach(el=> bindInputValue(el, 'evcs.rfid.'+el.dataset.key));
  try { setupRfidWhitelistUi(); } catch (e) {}
  try { setupRfidLearningUi(); } catch (e) {}
}

// --- Speicherfarm UI ---
function parseJsonSafe(raw, fallback){
  try{
    if (raw === null || raw === undefined) return fallback;
    const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return s ? JSON.parse(s) : fallback;
  } catch(_e){ return fallback; }
}

function storageFarmGetConfig(){
  const st = window.latestState || {};
  const raw = st['storageFarm.configJson'] && st['storageFarm.configJson'].value;
  const list = parseJsonSafe(raw, []);
  return Array.isArray(list) ? list : [];
}

function storageFarmRenderRows(list){
  const wrap = document.getElementById('sf_rows');
  if (!wrap) return;
  wrap.innerHTML = '';

  const addRow = (row, idx)=>{
    const r = document.createElement('div');
    r.className = 'rfid-whitelist-row';
    r.style.gridTemplateColumns = '1.2fr 1.6fr 1.6fr 1.6fr 1.6fr 1fr 0.6fr';

    const mk = (val, placeholder)=>{
      const i = document.createElement('input');
      i.type = 'text';
      i.placeholder = placeholder || '';
      i.value = (val === undefined || val === null) ? '' : String(val);
      return i;
    };

    const name = mk(row && row.name, 'z.B. Speicher 1');
    const socId = mk(row && row.socId, 'DP-ID (SoC %)');
    const chgId = mk(row && row.chargePowerId, 'DP-ID (W)');
    const dchgId = mk(row && row.dischargePowerId, 'DP-ID (W)');
    const setChg = mk(row && row.setChargeLimitId, 'DP-ID (W)');
    const cap = document.createElement('input');
    cap.type = 'number';
    cap.step = '0.1';
    cap.placeholder = 'kWh';
    cap.value = (row && row.capacityKWh !== undefined && row.capacityKWh !== null && row.capacityKWh !== '') ? String(row.capacityKWh) : '';

    const delWrap = document.createElement('div');
    delWrap.style.display='flex';
    delWrap.style.justifyContent='flex-end';
    const del = document.createElement('button');
    del.type='button';
    del.className='btn secondary';
    del.textContent='✕';
    del.title='Entfernen';
    del.addEventListener('click', ()=>{
      const cur = storageFarmCollectRows();
      cur.splice(idx, 1);
      storageFarmRenderRows(cur);
    });
    delWrap.appendChild(del);

    // mark inputs for collection
    name.dataset.sf = 'name';
    socId.dataset.sf = 'socId';
    chgId.dataset.sf = 'chargePowerId';
    dchgId.dataset.sf = 'dischargePowerId';
    setChg.dataset.sf = 'setChargeLimitId';
    cap.dataset.sf = 'capacityKWh';

    r.appendChild(name);
    r.appendChild(socId);
    r.appendChild(chgId);
    r.appendChild(dchgId);
    r.appendChild(setChg);
    r.appendChild(cap);
    r.appendChild(delWrap);
    wrap.appendChild(r);
  };

  list.forEach((row, idx)=> addRow(row || {}, idx));
}

function storageFarmCollectRows(){
  const wrap = document.getElementById('sf_rows');
  if (!wrap) return [];
  const rows = [];
  wrap.querySelectorAll('.rfid-whitelist-row').forEach(r=>{
    const obj = {};
    r.querySelectorAll('input').forEach(inp=>{
      const k = inp.dataset.sf;
      if (!k) return;
      if (k === 'capacityKWh') {
        const v = Number(inp.value);
        if (inp.value === '' || !Number.isFinite(v)) return;
        obj[k] = v;
      } else {
        const v = String(inp.value || '').trim();
        if (v) obj[k] = v;
      }
    });
    if (Object.keys(obj).length) rows.push(obj);
  });
  return rows;
}

function storageFarmUpdateSummary(){
  const sum = document.getElementById('sf_summary');
  if (!sum) return;
  const st = window.latestState || {};
  const soc = st['storageFarm.totalSoc'] && st['storageFarm.totalSoc'].value;
  const chg = st['storageFarm.totalChargePowerW'] && st['storageFarm.totalChargePowerW'].value;
  const dchg = st['storageFarm.totalDischargePowerW'] && st['storageFarm.totalDischargePowerW'].value;
  const on = st['storageFarm.storagesOnline'] && st['storageFarm.storagesOnline'].value;
  const tot = st['storageFarm.storagesTotal'] && st['storageFarm.storagesTotal'].value;
  sum.textContent = `SoC Ø: ${soc!==undefined?soc:'--'} % | Laden: ${chg!==undefined?formatPower(chg):'--'} | Entladen: ${dchg!==undefined?formatPower(dchg):'--'} | Online: ${on!==undefined?on:'--'}/${tot!==undefined?tot:'--'}`;
}

function initStorageFarmPanel(){
  const enabled = document.getElementById('sf_enabled');
  const mode = document.getElementById('sf_mode');
  const btnReload = document.getElementById('sf_reload');
  const btnSave = document.getElementById('sf_save');
  const btnAdd = document.getElementById('sf_add');
  const btnExport = document.getElementById('sf_export');
  const msg = document.getElementById('sf_msg');

  if (enabled) bindInputValue(enabled, 'storageFarm.enabled');
  if (mode) bindInputValue(mode, 'storageFarm.mode');

  const reload = ()=>{
    const list = storageFarmGetConfig();
    storageFarmRenderRows(list);
    storageFarmUpdateSummary();
    if (msg) msg.textContent = '';
  };

  if (btnReload && !btnReload.dataset.bound){
    btnReload.dataset.bound='1';
    btnReload.addEventListener('click', (e)=>{ e.preventDefault(); reload(); });
  }
  if (btnAdd && !btnAdd.dataset.bound){
    btnAdd.dataset.bound='1';
    btnAdd.addEventListener('click', (e)=>{
      e.preventDefault();
      const cur = storageFarmCollectRows();
      cur.push({ name: `Speicher ${cur.length+1}` });
      storageFarmRenderRows(cur);
    });
  }
  if (btnExport && !btnExport.dataset.bound){
    btnExport.dataset.bound='1';
    btnExport.addEventListener('click', (e)=>{
      e.preventDefault();
      const cur = storageFarmCollectRows();
      const txt = JSON.stringify(cur, null, 2);
      try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch(_e) {}
      if (msg) msg.textContent = 'JSON in die Zwischenablage kopiert (falls erlaubt).';
      try { alert(txt); } catch(_e2) {}
    });
  }
  if (btnSave && !btnSave.dataset.bound){
    btnSave.dataset.bound='1';
    btnSave.addEventListener('click', async (e)=>{
      e.preventDefault();
      const cur = storageFarmCollectRows();
      const payload = JSON.stringify(cur);
      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'storageFarm', key: 'configJson', value: payload })
        });
        if (msg) msg.textContent = 'Gespeichert.';
      } catch(_e){
        if (msg) msg.textContent = 'Speichern fehlgeschlagen.';
      }
    });
  }

  // Initial render
  reload();
}

function setupRfidWhitelistUi(){
  const rowsEl = document.getElementById('rfidWhitelistRows');
  if (!rowsEl) return;
  const msgEl = document.getElementById('rfidWhitelistMsg');
  const btnAdd = document.getElementById('rfidAddRow');
  const btnSave = document.getElementById('rfidSaveWhitelist');
  const btnReload = document.getElementById('rfidReloadWhitelist');

  function normRfid(v){ return String(v||'').trim().replace(/\s+/g,'').toUpperCase(); }
  function safeText(v){ return String(v||'').trim(); }

  function readWhitelistFromState(){
    try {
      const st = window.latestState || {};
      const info = st['evcs.rfid.whitelistJson'];
      const raw = (info && info.value !== undefined) ? String(info.value || '') : '';
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      return arr.map(x => {
        if (typeof x === 'string') return { rfid: normRfid(x), name: '', comment: '' };
        const r = normRfid(x.rfid ?? x.id ?? x.uid ?? x.card ?? '');
        const n = safeText(x.name ?? x.user ?? x.label ?? '');
        const c = safeText(x.comment ?? x.note ?? '');
        return { rfid: r, name: n, comment: c };
      });
    } catch (e) {
      return [];
    }
  }

  let list = readWhitelistFromState();

  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }

  function render(){
    rowsEl.innerHTML = '';
    (list || []).forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'rfid-whitelist-row';

      const inRfid = document.createElement('input');
      inRfid.type = 'text';
      inRfid.placeholder = 'z.B. 04A1B2C3';
      inRfid.value = it.rfid || '';
      inRfid.addEventListener('input', () => { it.rfid = normRfid(inRfid.value); });

      const inName = document.createElement('input');
      inName.type = 'text';
      inName.placeholder = 'Name / Person';
      inName.value = it.name || '';
      inName.addEventListener('input', () => { it.name = safeText(inName.value); });

      const inComment = document.createElement('input');
      inComment.type = 'text';
      inComment.placeholder = 'Kommentar (optional)';
      inComment.value = it.comment || '';
      inComment.addEventListener('input', () => { it.comment = safeText(inComment.value); });

      const del = document.createElement('button');
      del.className = 'rfid-del';
      del.type = 'button';
      del.textContent = '✕';
      del.title = 'Entfernen';
      del.addEventListener('click', () => { list.splice(idx, 1); render(); });

      row.appendChild(inRfid);
      row.appendChild(inName);
      row.appendChild(inComment);
      row.appendChild(del);
      rowsEl.appendChild(row);
    });

    setMsg((list && list.length ? (list.length + ' Einträge in der Whitelist') : 'Whitelist ist leer') );
  }

  async function save(){
    const cleaned = [];
    const seen = new Set();
    for (const it of (list || [])) {
      const r = normRfid(it.rfid);
      if (!r) continue;
      if (seen.has(r)) continue;
      seen.add(r);
      cleaned.push({ rfid: r, name: safeText(it.name), comment: safeText(it.comment) });
    }
    const json = JSON.stringify(cleaned);
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'rfid', key: 'whitelistJson', value: json })
      });
      // update local snapshot so other UI reads consistent data
      window.latestState = window.latestState || {};
      window.latestState['evcs.rfid.whitelistJson'] = { value: json };
      list = cleaned;
      render();
      setMsg('Whitelist gespeichert (' + cleaned.length + ' Einträge).');
    } catch (e) {
      setMsg('Fehler beim Speichern der Whitelist.');
    }
  }

  async function reload(){
    try {
      const snap = await fetch('/api/state', { cache: 'no-store' }).then(r => r.json());
      window.latestState = snap || {};
      list = readWhitelistFromState();
      render();
      setMsg('Whitelist neu geladen.');
    } catch (e) {
      setMsg('Fehler beim Neuladen der Whitelist.');
    }
  }

  if (btnAdd && btnAdd.dataset.nwBound !== '1') {
    btnAdd.dataset.nwBound = '1';
    btnAdd.addEventListener('click', () => {
      list.push({ rfid: '', name: '', comment: '' });
      render();
      try {
        const last = rowsEl.querySelector('.rfid-whitelist-row:last-child input');
        if (last) last.focus();
      } catch (e) {}
    });
  }
  if (btnSave && btnSave.dataset.nwBound !== '1') {
    btnSave.dataset.nwBound = '1';
    btnSave.addEventListener('click', save);
  }
  if (btnReload && btnReload.dataset.nwBound !== '1') {
    btnReload.dataset.nwBound = '1';
    btnReload.addEventListener('click', reload);
  }

  // Expose minimal API for other UI parts (e.g., RFID learning) to reuse the same list + save.
  window.__nwRfidWhitelist = window.__nwRfidWhitelist || {};
  window.__nwRfidWhitelist.get = () => (list || []).slice();
  window.__nwRfidWhitelist.addOrUpdate = (rfid, name, comment, { autoSave = true } = {}) => {
    const r = normRfid(rfid);
    if (!r) return false;
    const n = safeText(name);
    const c = safeText(comment);
    let found = false;
    for (const it of (list || [])) {
      if (normRfid(it.rfid) === r) {
        found = true;
        if (n) it.name = n;
        if (c) it.comment = c;
        break;
      }
    }
    if (!found) {
      list.push({ rfid: r, name: n, comment: c });
    }
    render();
    if (autoSave) {
      save();
    } else {
      setMsg('Eintrag übernommen. Bitte Whitelist speichern.');
    }
    return true;
  };
  window.__nwRfidWhitelist.reload = () => reload();
  window.__nwRfidWhitelist.save = () => save();

  render();
}

function setupRfidLearningUi(){
  const btnLearn = document.getElementById('rfidLearnBtn');
  if (!btnLearn) return;
  const lastText = document.getElementById('rfidLastCapturedText');
  const inName = document.getElementById('rfidLearnName');
  const inComment = document.getElementById('rfidLearnComment');
  const btnAdd = document.getElementById('rfidLearnAdd');
  const msgEl = document.getElementById('rfidLearnMsg');

  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }

  async function setLearningActive(active){
    try{
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'rfid', key: 'learning.active', value: !!active })
      });
      window.latestState = window.latestState || {};
      window.latestState['evcs.rfid.learning.active'] = { value: !!active };
    }catch(_e){}
  }

  function readStateVal(key){
    const st = window.latestState || {};
    return st[key] ? st[key].value : undefined;
  }

  function applyUi(){
    const active = !!readStateVal('evcs.rfid.learning.active');
    const last = readStateVal('evcs.rfid.learning.lastCaptured');
    const ts = readStateVal('evcs.rfid.learning.lastCapturedTs');

    if (btnLearn) btnLearn.textContent = active ? 'Warte auf Karte… (Stop)' : 'Karte anlernen';
    if (lastText) {
      const t = (last != null && String(last).trim()) ? String(last).trim() : '--';
      lastText.textContent = t;
      if (t !== '--' && ts) {
        try{ lastText.title = new Date(Number(ts)).toLocaleString('de-DE'); }catch(_e){}
      }
    }
    if (active) {
      setMsg('Anlernen aktiv – halte eine RFID-Karte vor die Wallbox.');
    } else {
      // do not overwrite explicit messages unless empty
      if (msgEl && !msgEl.textContent) setMsg('');
    }
  }

  // Prevent duplicate listeners
  if (btnLearn && btnLearn.dataset.nwBound !== '1') {
    btnLearn.dataset.nwBound = '1';
    btnLearn.addEventListener('click', async () => {
      const active = !!readStateVal('evcs.rfid.learning.active');
      setMsg('');
      await setLearningActive(!active);
      // UI will update via SSE/render, but also apply immediately
      applyUi();
    });
  }

  if (btnAdd && btnAdd.dataset.nwBound !== '1') {
    btnAdd.dataset.nwBound = '1';
    btnAdd.addEventListener('click', () => {
      const last = readStateVal('evcs.rfid.learning.lastCaptured');
      const rfid = String(last || '').trim();
      if (!rfid) {
        setMsg('Keine Karte erkannt. Bitte zuerst „Karte anlernen“ starten.');
        return;
      }
      const api = window.__nwRfidWhitelist;
      if (!api || typeof api.addOrUpdate !== 'function') {
        setMsg('Whitelist-Editor nicht verfügbar. Seite neu laden.');
        return;
      }
      const name = inName ? inName.value : '';
      const comment = inComment ? inComment.value : '';
      api.addOrUpdate(rfid, name, comment, { autoSave: true });
      if (inName) inName.value = '';
      if (inComment) inComment.value = '';
      setMsg('Karte übernommen und gespeichert.');
    });
  }

  // Make applyUi accessible for render() updates
  window.__nwApplyRfidLearningUi = applyUi;

  applyUi();
}


function setupInstaller(){
  const loginBox = document.getElementById('installerLoginBox');
  const formBox  = document.getElementById('installerForm');
  const form     = document.getElementById('installerLoginForm');
  const btn      = document.getElementById('inst_login');
  const cancel   = document.getElementById('inst_cancel');
  const pw       = document.getElementById('inst_pw');

  async function refreshLock(){
    try {
      const r = await fetch('/config', { cache:'no-store', credentials:'same-origin' });
      const j = await r.json();
      const locked = !!j.installerLocked;
      if (loginBox) loginBox.classList.toggle('hidden', !locked);
      if (formBox)  formBox.classList.toggle('hidden',  locked);
      if (formBox) {
        formBox.querySelectorAll('input,select,button,textarea').forEach(el => {
          if (el.id !== 'inst_cancel') el.disabled = locked;
        });
      }
    } catch(_) {}
  }

  async function doLogin(){
    try{
      const pass = String((pw && pw.value) || '');
      if (!pass){ alert('Bitte Passwort eingeben'); return; }
      const r = await fetch('/api/installer/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body: JSON.stringify({ password: pass })
      });
      if (r.ok){
        if (pw) pw.value='';
        await refreshLock();
      } else {
        alert('Passwort falsch');
      }
    }catch(_){ alert('Login fehlgeschlagen'); }
  }

  if (btn && !btn.dataset.bound){ btn.dataset.bound='1'; btn.addEventListener('click', (e)=>{ e.preventDefault(); doLogin(); }); }
  if (form && !form.dataset.bound){ form.dataset.bound='1'; form.addEventListener('submit', (e)=>{ e.preventDefault(); doLogin(); }); }
  if (cancel && !cancel.dataset.bound){
    cancel.dataset.bound = '1';
    cancel.addEventListener('click', (e)=>{
      e.preventDefault();
      const installerSec = document.querySelector('[data-tab-content="installer"]');
      if (installerSec) installerSec.classList.add('hidden');
      const live = document.querySelector('.content');
      if (live) live.style.display = 'grid';
      document.querySelectorAll('.tabs .tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === 'live');
      });
    });
  }

  refreshLock();
}

function initInstallerPanel(){
  if (SERVER_CFG && SERVER_CFG.installerLocked && !null) return;
  document.querySelectorAll('#installerForm [data-scope="installer"]').forEach(el=>{
    const key = el.dataset.key; bindInputValue(el, 'installer.' + key);
  });
  const a = document.getElementById('openAdminBtn');
  if (a){ const url = (SERVER_CFG && SERVER_CFG.adminUrl) || '/'; a.href = url || '/'; }
}

// Simple tab switching
function initTabs(){
  const buttons = document.querySelectorAll('.tabs .tab');
  const sections = {
    live: document.querySelector('.content'),
    history: document.querySelector('[data-tab-content="history"]'),
    settings: document.querySelector('[data-tab-content="settings"]'),
    smarthome: document.querySelector('[data-tab-content="smarthome"]'),
    storagefarm: document.querySelector('[data-tab-content="storagefarm"]'),
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');

    // Show/hide groups
    // main ".content" holds live top sections; other sections are siblings
    document.querySelector('.content').style.display = (tab==='live') ? 'grid' : 'none';
    for (const k of ['history','settings','smarthome','storagefarm']) {
      const el = sections[k];
      if (el) el.classList.toggle('hidden', tab !== k);
    }
  }));
}

function renderSmartHome(){
  const onTxt = (v)=> v ? 'AN' : 'AUS';
  const d = (k)=> state[k]?.value;
  const get = (path) => {
    // allow mapping from smartHome.datapoints.* in the future
    return d(path);
  };
  const hp = get('smartHome_heatPumpOn');
  const rt = get('smartHome_roomTemp');
  const wl = get('smartHome_wallboxLock');
  const hpEl = document.getElementById('smhHeatPump');
  const rtEl = document.getElementById('smhRoomTemp');
  const wlEl = document.getElementById('smhWallboxLock');
  if (hpEl) hpEl.textContent = (hp===undefined?'--':onTxt(!!hp));
  if (rtEl) rtEl.textContent = (rt===undefined?'--':Number(rt).toFixed(1)+' °C');
  if (wlEl) wlEl.textContent = (wl===undefined?'--':(wl?'Gesperrt':'Freigabe'));
}

const _renderOrig = render;
render = function(){

  // ---- Energy donut update ----
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const chg = +(d('storageChargePower') ?? 0);
    const dchg = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setText('batterySocIn', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const charge = +(d('storageChargePower') ?? 0);
    const discharge = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) { setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %'); setText('batterySocIn', Number(soc).toFixed(0)+' %'); }

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      // using outer 'charge'/'discharge'
      // using outer 'charge'/'discharge'
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (charge + discharge));
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderOrig();
  renderSmartHome();
}


// Zusätzliche Anzeige-Updates für Energiefluss
const _renderEF = render;
render = function(){

  // ---- Energy donut update ----
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const chg = +(d('storageChargePower') ?? 0);
    const dchg = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setText('batterySocIn', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const charge = +(d('storageChargePower') ?? 0);
    const discharge = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) { setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %'); setText('batterySocIn', Number(soc).toFixed(0)+' %'); }

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      // using outer 'charge'/'discharge'
      // using outer 'charge'/'discharge'
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (charge + discharge));
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderEF();
  try {
    const s = state;
    const d = (k) => s[k]?.value;
    const pv = d('pvPower') ?? d('productionTotal');
    const load = d('consumptionTotal');
    function setText(id, txt){ const el = document.getElementById(id); if (el) el.textContent = txt; }
    setText('pvPowerBig', (pv===undefined?'--':formatPower(pv)));
    setText('consumptionTotalBig', (load===undefined?'--':formatPower(load)));
  } catch(e) { console.warn(e); }

  try { storageFarmUpdateSummary(); } catch(_e) {}
}

// SIDE-VALUES
function setSideValue(id, val){ const el=document.getElementById(id); if(el) el.textContent = val; }

// ---- Energy Web update ----
function updateEnergyWeb() {
  const d = (k) => state[k]?.value;
  const s = window.latestState || {};

  // Raw datapoints (1:1)
  let pv = +(d('pvPower') ?? 0);
  let buy = +(d('gridBuyPower') ?? 0);
  let sell = +(d('gridSellPower') ?? 0);
  let load = +(d('consumptionTotal') ?? 0);
  let c2 = +(d('evcs.totalPowerW') ?? d('consumptionEvcs') ?? 0); // Wallbox (sum)
  let batCharge = +(d('storageChargePower') ?? 0);
  let batDischarge = +(d('storageDischargePower') ?? 0);
  const batSingle = d('batteryPower'); // optional fallback
  const soc = d('storageSoc');

  // Invert toggles (remain verfügbar)
  const invPv   = !!(s['settings.flowInvertPv']?.value);
  const invBat  = !!(s['settings.flowInvertBattery']?.value);
  const invGrid = !!(s['settings.flowInvertGrid']?.value);
  const invEv   = !!(s['settings.flowInvertEv']?.value);
  const subEvFromLoad = (s['settings.flowSubtractEvFromBuilding']?.value ?? true) ? true : false;

  if (invPv) pv = -pv;
  if (invEv) c2 = -c2;
  if (invGrid) { const t=buy; buy = sell; sell = t; } // swap semantics if inverted grid

  if (invBat) { const t=batCharge; batCharge = batDischarge; batDischarge = t; }

  // Normalize battery flow signs: some systems report negative for charge/discharge
  if (batCharge < 0 && batDischarge <= 0) { batCharge = Math.abs(batCharge); }
  if (batDischarge < 0 && batCharge <= 0) { batDischarge = Math.abs(batDischarge); }

  // Fallback: if both battery flows are zero AND a single DP exists, infer direction from its sign
  if ((batCharge===0 && batDischarge===0) && batSingle !== undefined && batSingle !== null && !isNaN(Number(batSingle))) {
    const bp = Number(batSingle);
    if (bp < 0) { batCharge = Math.abs(bp); batDischarge = 0; }
    else { batDischarge = Math.abs(bp); batCharge = 0; }
  }

  // Gebäudeanzeige: nur EV abziehen (wenn aktiviert)
  const evAbs = Math.max(0, Math.abs(c2));
  const loadDisplay = Math.max(0, subEvFromLoad ? (load - evAbs) : load);

  // -------- Anzeige-Werte & Richtungen (ohne Netto-Berechnung) --------
  // PV: immer Richtung Gebäude; Wert = |pv|
  const pvValNum = Math.abs(pv);
  const pvRev = pv < 0;

  // GRID: bevorzugt Bezug (buy). Nur wenn buy==0 und sell>0, zeige Einspeisung.
  let gridShowVal = 0;
  let gridRev = false; // rev = vom Gebäude weg
  let gridSellMode = false;
  if (buy > 0) { gridShowVal = buy; gridRev = false; gridSellMode = false; }
  else if (sell !== 0 && !isNaN(sell)) { gridShowVal = Math.abs(sell); gridRev = true; gridSellMode = true; }
  else { gridShowVal = 0; gridRev = false; gridSellMode = false; }
// removed stray block
// removed stray block
// removed stray block
// removed stray block

  // BATTERIE: wähle vorhandenen Strom (kein Netto)
  // - Entladen (batDischarge>0) -> zur Mitte; Anzeige +batDischarge
  // - Laden (batCharge>0) -> von Mitte zur Batterie; Anzeige -batCharge
  let batShowVal = 0;
  let batRev = false;
  if (batDischarge > 0 && batCharge <= 0) { batShowVal = batDischarge; batRev = false; }
  else if (batCharge > 0 && batDischarge <= 0) { batShowVal = batCharge; batRev = true; }
  else if (batCharge > 0 || batDischarge > 0) {
    if (batCharge >= batDischarge) { batShowVal = batCharge; batRev = true; }
    else { batShowVal = batDischarge; batRev = false; }
  }

  // ---------- Ausgabe ----------
  const T = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
  const signed = (num, negIsMinus=false)=>{
    if (num===0) return '0 W';
    const u = (window.units && window.units.power) || 'W';
    const n = Number(num)||0;
    const s = negIsMinus ? '-' : '+';
    if (Math.abs(n) >= 1000) return (negIsMinus?'-':'+') + (Math.abs(n)/1000).toFixed(1) + ' kW';
    return (negIsMinus?'-':'+') + Math.abs(n).toFixed(0) + ' ' + u;
  };

  T('pvVal', formatPower(pvValNum));
  // grid text: +Bezug, -Einspeisung
  T('gridVal', gridShowVal ? (gridSellMode ? ('-'+formatPower(gridShowVal)) : formatPower(gridShowVal)) : '0 W');
  // EV & Batterie Texte
  T('c2Val', formatPower(Math.max(0, Math.abs(c2))));
  T('restVal', batShowVal ? (batRev ? ('-'+formatPower(batShowVal)) : formatPower(batShowVal)) : '0 W');
  T('centerPower', formatPower(Math.max(0, loadDisplay)));
  if (soc===undefined || isNaN(Number(soc))) { T('batterySocIn','-- %'); } else { T('batterySoc', Number(soc).toFixed(0)+' %'); }

  // Sichtbarkeit
  const show = (id, on)=>{ const el=document.getElementById(id); if(el) el.style.opacity = on ? 1 : 0.15; };
  show('linePV', pvValNum>1);
  show('lineGrid', gridShowVal>1);
  show('lineC2', Math.abs(c2)>1);
  show('lineRest', batShowVal>1);

  // Richtung
  const toggleRev = (id, on)=>{ const el=document.getElementById(id); if (el) el.classList.toggle('rev', !!on); };
  toggleRev('linePV', pvRev);
  toggleRev('lineGrid', gridRev);
  toggleRev('lineC2', Math.abs(c2)>1 ? (invEv ? true : false) : false);toggleRev('lineRest', !batRev);

  // Grid Farbe (Einspeisung grün)
  const lg = document.getElementById('lineGrid');
  if (lg) {
    if (gridSellMode) lg.classList.add('sell'); else lg.classList.remove('sell');
  }
  // Tariff values
  const priceNow = d('priceCurrent');
  const priceAvg = d('priceAverage');

  const tariffOn = !!(s['settings.dynamicTariff']?.value);
  const tc = document.getElementById('tariffCard');
  if (tc) tc.classList.toggle('hidden', !tariffOn);

  const setT = (id,val)=>{ const el=document.getElementById(id); if (el) el.textContent = val; };
  if (tariffOn) {
    setT('priceCurrent', formatPricePerKwh(priceNow));
    setT('priceAverage', formatPricePerKwh(priceAvg));
  }

}


// Patch render to also update energy web
const _renderOld = render;
render = function(){ _renderOld(); try{ updateEnergyWeb(); }catch(e){ console.warn('energy web', e); } }

  // open history page via header tab
  const hbtn = document.getElementById('historyTabBtn');
  if (hbtn) hbtn.addEventListener('click', ()=>{ window.location.href = '/history.html'; });

  // open live page via header tab when on a standalone page (e.g. settings)
  const lbtn = document.querySelector('.tabs .tab[data-tab="live"]');
  if (lbtn) lbtn.addEventListener('click', ()=>{
    const p = (window.location && window.location.pathname) || '';
    if (p.endsWith('/settings.html') || p.endsWith('settings.html')) window.location.href = '/';
  });

  // open SmartHome page via header tab
  const shbtn = document.getElementById('tabSmartHome');
  if (shbtn) shbtn.addEventListener('click', ()=>{ window.location.href = '/smarthome.html'; });


// open settings automatically if '?settings=1' is present
(function(){
  function openSettings(){
    try{
      const sbtn = document.getElementById('menuOpenSettings');
      if (sbtn) {
        sbtn.click();
        return;
      }
      // fallback: show settings section explicitly
      const content = document.querySelector('.content');
      if (content) content.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      try{ if (typeof initSettingsPanel==='function') initSettingsPanel(); }catch(_e){}
      try{ if (typeof setupSettings==='function') setupSettings(); }catch(_e){}
    } catch(e){}
  }
  try{
    const params = new URLSearchParams(window.location.search);
    const isSettingsPage = /settings\.html$/i.test(window.location.pathname || '');
    if (isSettingsPage || params.get('settings') === '1') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', openSettings);
      } else {
        openSettings();
      }
    }
  }catch(e){}
})();

// --- EVCS modal ---
(function(){
  function qs(id){ return document.getElementById(id); }
  const card = qs('evcsCard');
  const modal = qs('evcsModal');
  const close = qs('evcsClose');
  const toggle = qs('evcsActiveToggle');
  const buttons = qs('evcsModeButtons');

  // Prefer per-wallbox datapoints (evcs.1.*) for single-EVCS modal, fallback to legacy settings.*
  let hasPerBoxMode = false;
  let hasPerBoxActive = false;

  // EMS present? (chargingManagement states exist)
  let modalHasEms = false;

  // Prevent UI "jumping" while an update is still in-flight
  let pendingMode = null;
  let pendingModeUntil = 0;
  let pendingActive = null;
  let pendingActiveUntil = 0;

  function clampUiMode(v){
    const n = Number(v);
    if (!isFinite(n)) return 1;
    return Math.max(1, Math.min(3, Math.round(n)));
  }

  function normalizeEmsMode(raw){
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'min+pv') return 'minpv';
    if (s === 'auto' || s === 'boost' || s === 'minpv' || s === 'pv') return s;
    return 'auto';
  }

  function legacyNumToMode(n){
    const v = clampUiMode(n);
    if (v === 2) return 'minpv';
    if (v === 3) return 'pv';
    return 'boost';
  }

  function modeToLegacyNum(mode){
    const s = normalizeEmsMode(mode);
    if (s === 'minpv') return 2;
    if (s === 'pv') return 3;
    return 1; // boost (auto -> boost fallback for legacy)
  }

  function ensureAutoVisibility(){
    if (!buttons) return;
    const autoBtn = buttons.querySelector('button[data-mode="auto"]');
    if (autoBtn) autoBtn.classList.toggle('hidden', !modalHasEms);
  }

  function applyModeUi(mode){
    if (!buttons) return;
    const m = normalizeEmsMode(mode);
    const btns = buttons.querySelectorAll('button[data-mode]');
    btns.forEach(b => b.classList.toggle('active', String(b.getAttribute('data-mode')||'').toLowerCase() === m));
  }

  if (card){
    card.addEventListener('click', ()=>{
      const c = Number(window.__nwEvcsCount || 1) || 1;
      if (c >= 2) { window.location.href = '/evcs.html'; return; }
      if (modal) modal.classList.remove('hidden');
    });
  }
  if (close){
    close.addEventListener('click', ()=> modal && modal.classList.add('hidden'));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal) modal.classList.add('hidden'); });
  }

  if (toggle){
    toggle.addEventListener('change', async ()=>{
      const desired = !!toggle.checked;
      pendingActive = desired;
      pendingActiveUntil = Date.now() + 2500;

      const scope = hasPerBoxActive ? 'evcs' : 'settings';
      const key = hasPerBoxActive ? '1.active' : 'evcsActive';
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope, key, value: desired})});
      }catch(e){}
    });
  }

  if (buttons){
    buttons.addEventListener('click', async (e)=>{
      const b = e.target && e.target.closest ? e.target.closest('button[data-mode]') : null;
      if (!b) return;

      let desired = normalizeEmsMode(b.getAttribute('data-mode') || 'auto');
      // Legacy UI: no "Auto" → map to Boost
      if (!modalHasEms && desired === 'auto') desired = 'boost';

      // UX: allow manual boost cancel by clicking the active Boost button again
      // (instead of waiting for the timeout).
      if (modalHasEms) {
        try {
          const curBtn = buttons.querySelector('button[data-mode].active');
          const cur = curBtn ? normalizeEmsMode(curBtn.getAttribute('data-mode') || 'auto') : 'auto';
          if (desired === 'boost' && cur === 'boost') desired = 'auto';
        } catch(_e) {}
      }

      pendingMode = desired;
      pendingModeUntil = Date.now() + 2500;
      applyModeUi(desired);

      try{
        if (modalHasEms){
          await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'ems', key:'evcs.1.userMode', value: desired})});
        } else {
          const u = modeToLegacyNum(desired);
          const scope = hasPerBoxMode ? 'evcs' : 'settings';
          const key = hasPerBoxMode ? '1.mode' : 'evcsMode';
          await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope, key, value: Number(u)})});
        }
      }catch(_e){}
    });
  }

  // Update values from state inside global render()
  window.__evcsApply = function(d, s){
    const p = d('evcs.totalPowerW') ?? d('consumptionEvcs') ?? 0;
    const st = d('evcs.1.status') ?? d('evcsStatus') ?? '--';

    // EMS available?
    modalHasEms = d('chargingManagement.wallboxCount') != null;
    ensureAutoVisibility();

    const evcsActive = d('evcs.1.active');
    const settingsActive = s && s['settings.evcsActive'] ? s['settings.evcsActive'].value : null;
    hasPerBoxActive = evcsActive != null;
    const activeVal = (evcsActive != null) ? evcsActive : ((settingsActive != null) ? settingsActive : false);

    // Mode source: EMS userMode (preferred) or legacy EVCS mode
    let modeStrFromState = 'boost';
    if (modalHasEms){
      modeStrFromState = normalizeEmsMode(d('chargingManagement.wallboxes.lp1.userMode') ?? 'auto');
    } else {
      const evcsMode = d('evcs.1.mode');
      const settingsMode = s && s['settings.evcsMode'] ? s['settings.evcsMode'].value : null;
      hasPerBoxMode = evcsMode != null;
      const modeRaw = (evcsMode != null) ? evcsMode : ((settingsMode != null) ? settingsMode : 1);
      const uiFromState = clampUiMode(modeRaw);
      modeStrFromState = legacyNumToMode(uiFromState);
    }

    const fmtP = (val)=> {
      const u = (window.units && window.units.power) || 'W';
      const n = Number(val) || 0;
      if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + ' kW';
      return n.toFixed(0) + ' ' + u;
    };

    // Ring fill based on current power vs configured max power
    let ratedSingle = Number(s && s['settings.evcsMaxPower'] ? s['settings.evcsMaxPower'].value : 11000); // W
    if (!isFinite(ratedSingle) || ratedSingle <= 0) ratedSingle = 11000;

    const rated = ratedSingle * (Number(window.__nwEvcsCount || 1) || 1);
    const pct = Math.max(0, Math.min(1, rated > 0 ? (Math.abs(Number(p) || 0) / rated) : 0));

    const g = document.querySelector('.evcs-gauge');
    if (g) {
      const deg = (pct * 100).toFixed(1) + '%';
      g.style.background = 'radial-gradient(#0c0f12 60%, transparent 61%),' +
                           'conic-gradient(#6c5ce7 0% ' + deg + ', #2a2f35 ' + deg + ' 100%)';
    }

    const pb = qs('evcsPowerBig'); if (pb) pb.textContent = fmtP(p);
    const sm = qs('evcsStatusModal'); if (sm) sm.textContent = st;

    const now = Date.now();

    if (toggle != null){
      if (pendingActive !== null && now < pendingActiveUntil){
        toggle.checked = !!pendingActive;
        if (!!activeVal === !!pendingActive) pendingActive = null;
      } else {
        pendingActive = null;
        toggle.checked = !!activeVal;
      }
    }

    if (buttons != null){
      if (pendingMode !== null){
        if (modeStrFromState === pendingMode){
          pendingMode = null;
        } else if (now < pendingModeUntil){
          applyModeUi(pendingMode);
          return;
        } else {
          pendingMode = null;
        }
      }
      applyModeUi(modeStrFromState);
    }
  };

})();


// open EVCS on node click as well
(function(){
  const n = document.getElementById('nodeEvcs');
  const modal = document.getElementById('evcsModal');
  if (n && modal){
    // mark clickable
    n.classList.add('clickable');
    n.addEventListener('click', ()=>{
      const c = Number(window.__nwEvcsCount || 1) || 1;
      if (c >= 2) { window.location.href = '/evcs.html'; return; }
      modal.classList.remove('hidden');
    });
  }
})();