
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

  setWidth('autarkyBar', autarky || 0);
  setText('autarkyValue', (autarky != null ? autarky.toFixed(0) : '--') + ' %');

  setWidth('selfConsumptionBar', selfc || 0);
  setWidth('selfVerbrauchBar', selfc || 0);
  setText('selfConsumptionValue', (selfc != null ? selfc.toFixed(0) : '--') + ' %');
  setText('selfVerbrauchValue', (selfc != null ? selfc.toFixed(0) : '--') + ' %');

  setWidth('storageSocBar', soc || 0);
  setText('storageSocValue', (soc != null ? soc.toFixed(0) : '--') + ' %');

  setText('storageChargePower', formatPower(charge ?? 0));
  setText('storageLadenPower', formatPower(charge ?? 0));
  setText('storageDischargePower', formatPower(discharge ?? 0));
  setText('storageEntladenPower', formatPower(discharge ?? 0));

  setText('gridBuyPowerCard', formatPower(buy ?? 0));
  setText('gridSellPowerCard', formatPower(sell ?? 0));
  setText('gridEnergyKwh', (d('gridEnergyKwh')!=null? Number(d('gridEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('productionEnergyKwh', (d('productionEnergyKwh')!=null? Number(d('productionEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('co2Savings', (d('co2Savings')!=null? (isNaN(Number(d('co2Savings'))) ? String(d('co2Savings')) : Number(d('co2Savings')).toFixed(1)+' t'):'--'));


  setText('productionTotal', formatPower(pv ?? d('productionTotal') ?? 0));
  setText('gridFrequency', d('gridFrequency') != null ? d('gridFrequency').toFixed(2) + ' Hz' : '--');

  setText('consumptionEvcs', formatPower(d('consumptionEvcs') ?? 0));
  setText('consumptionEnergyKwh', (d('consumptionEnergyKwh')!=null? Number(d('consumptionEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('consumptionBuilding', formatPower(d('consumptionTotal') ?? 0));

  setText('evcsStatus', (d('evcsStatus') ?? '--'));
  setText('evcsLastChargeKwh', d('evcsLastChargeKwh') != null ? d('evcsLastChargeKwh').toFixed(2) + ' kWh' : '--');
  if (window.__evcsApply) window.__evcsApply(d, state);
}

async function bootstrap() {
  try {
    const cfgRes = await fetch('/config');
    const cfg = await cfgRes.json();
    units = cfg.units || units;
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
  render();

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
        render();
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

window.addEventListener('DOMContentLoaded', ()=>{
  bootstrap();
  loadConfig();
  initMenu();
  initSettingsPanel();
  initTabs();
  hideAllPanels();
});


// --- Settings & Installer logic ---
function hideAllPanels(){ document.querySelectorAll('[data-tab-content]').forEach(el=> el.classList.add('hidden')); document.querySelector('.content').style.display='block'; }
let SERVER_CFG = { adminUrl: null, installerLocked: false };

async function loadConfig() {
  try {
    const r = await fetch('/config');
    const j = await r.json();
    SERVER_CFG = j || {};
    try {
      const btn = document.getElementById('smarthomeTabBtn');
      if (btn) {
        const enabled = !!(SERVER_CFG.smartHome && SERVER_CFG.smartHome.enabled);
        btn.style.display = enabled ? '' : 'none';

        // Direkt in den SmartHome-Tab springen, wenn ?tab=smarthome gesetzt ist
        if (enabled) {
          try {
            const qs = new URLSearchParams(window.location.search || '');
            const targetTab = qs.get('tab');
            if (targetTab === 'smarthome') {
              btn.click();
            }
          } catch(_ignore) {}
        }
      }
    } catch(_e) {}
  } catch(e) { console.warn('cfg', e); }
}

function bindInputValue(el, stateKey) {
  // set initial value from state cache
  const st = (window.latestState || {});
  const info = st[stateKey] || st['settings.'+el.dataset.key] || st['installer.'+el.dataset.key];
  if (info && info.value !== undefined) {
    if (el.type === 'checkbox') el.checked = !!info.value;
    else el.value = info.value;
  }
  el.addEventListener('change', async ()=>{
    const scope = el.dataset.scope;
    const key = el.dataset.key;
    const payload = { scope, key, value: (el.type === 'checkbox') ? el.checked : (el.type === 'number' ? Number(el.value) : el.value) };
    try {
      await fetch('/api/set', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    } catch(e) { console.warn('set', e); }
  });
}

function setupSettings(){
  document.querySelectorAll('[data-scope="settings"]').forEach(el=> bindInputValue(el, 'settings.'+el.dataset.key));
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
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');

    // Show/hide groups
    // LIVE-Bereich nur im LIVE-Tab sichtbar
    const showLive = (tab === 'live');
    const liveEl = document.querySelector('.content');
    if (liveEl) liveEl.style.display = showLive ? 'grid' : 'none';

    for (const k of ['history','settings','smarthome']) {
      const el = sections[k];
      if (el) el.classList.toggle('hidden', tab !== k);
    }
  }));
}
function renderSmartHome(){
  const onTxt = (v)=> v ? 'AN' : 'AUS';
  const d = (k)=> state[k]?.value;
  const get = (path) => {
    // Werte aus dem State-Mapping lesen (z.B. smartHome_*)
    return d(path);
  };
  const hp = get('smartHome_heatPumpOn');
  const rt = get('smartHome_roomTemp');
  const wl = get('smartHome_wallboxLock');
  const gl = get('smartHome_gridLimit');
  const pc = get('smartHome_pvCurtailment');

  const hpEl = document.getElementById('smhHeatPump');
  const rtEl = document.getElementById('smhRoomTemp');
  const wlEl = document.getElementById('smhWallboxLock');
  const glEl = document.getElementById('smhGridLimit');
  const pcEl = document.getElementById('smhPvCurtailment');

  if (hpEl) hpEl.textContent = (hp === undefined ? '--' : onTxt(!!hp));
  if (rtEl) rtEl.textContent = (rt === undefined || rt === null || isNaN(rt) ? '--' : Number(rt).toFixed(1) + ' °C');
  if (wlEl) wlEl.textContent = (wl === undefined ? '--' : (wl ? 'Gesperrt' : 'Freigabe'));
  if (glEl) {
    const val = (gl === undefined || gl === null || isNaN(gl)) ? null : Number(gl);
    glEl.textContent = (val === null ? '--' : val.toFixed(0) + ' W');
  }
  if (pcEl) {
    const val = (pc === undefined || pc === null || isNaN(pc)) ? null : Number(pc);
    pcEl.textContent = (val === null ? '--' : val.toFixed(0) + ' %');
  }
}


function getSmartHomeStructure(){
  const entry = state && state['smartHome.structure'];
  if (!entry || entry.value === undefined || entry.value === null) return null;
  try {
    const raw = (typeof entry.value === 'string') ? entry.value : String(entry.value);
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch (e) {
    console.warn('SmartHome structure JSON parse error', e);
    return null;
  }
}


function detectSmartHomeEntityType(ent) {
  const role = (ent && ent.role) ? String(ent.role) : '';
  const r = role.toLowerCase();
  const type = (ent && ent.type) ? String(ent.type).toLowerCase() : '';
  const writable = !!(ent && ent.write);
  const unit = ent && ent.unit ? String(ent.unit).toLowerCase() : '';

  if (!r && !type) return 'sensor';

  // Basislogik nach KNX / ioBroker-Rollen
  const baseRole = r.split('.')[0];
  if (baseRole === 'switch') {
    // Schalten
    return 'switch';
  }
  if (baseRole === 'level') {
    // Level = Slider (Dimmer / Prozentwert)
    return 'dimmer';
  }
  if (baseRole === 'indicator' || baseRole === 'value') {
    // reine Anzeige / Rückmeldung
    return 'sensor';
  }

  // klassische Schalter
  if (r.includes('switch') || r.includes('light') || r.includes('socket')) return 'switch';

  // Dimmer (z.B. Helligkeit)
  if (r.startsWith('level.dimmer') || r.startsWith('level.brightness')) return 'dimmer';

  // Rollläden / Jalousien
  if (r.includes('blind') || r.includes('shutter') || r.startsWith('level.blind')) return 'blind';

  // Temperatur (Ist vs. Soll)
  if (r.startsWith('value.temperature') || r.startsWith('level.temperature')) {
    if (writable) return 'tempSetpoint';
    return 'temperature';
  }

  // Speziell für prozentuale Level (z.B. Helligkeit, Jalousie)
  if (r.includes('level.wave')) return 'dimmer';
  if (writable && type === 'number' && unit === '%') return 'dimmer';

  // Fallbacks
  if (writable && type === 'boolean') return 'switch';

  return 'sensor';
}
function formatSmartHomeValue(ent, rawVal) {
  const kind = detectSmartHomeEntityType(ent);
  const type = (ent && ent.type) ? String(ent.type).toLowerCase() : '';

  if (rawVal === undefined || rawVal === null || (typeof rawVal === 'number' && isNaN(rawVal))) {
    return '--';
  }

  // Temperatur
  if (kind === 'temperature' || kind === 'tempSetpoint') {
    const n = Number(rawVal);
    if (isNaN(n)) return '--';
    return n.toFixed(1) + ' °C';
  }

  // Dimmer / Level -> Prozent
  if (kind === 'dimmer') {
    const n = Number(rawVal);
    if (isNaN(n)) return '--';
    return n.toFixed(0) + ' %';
  }

  // Schalt- oder Rückmelde-Boolean -> AN/AUS
  if (kind === 'switch' || type === 'boolean') {
    return rawVal ? 'AN' : 'AUS';
  }

  // Numerische Werte mit Einheit
  if (typeof rawVal === 'number') {
    let unitRaw = (ent && ent.unit != null) ? String(ent.unit) : '';
    const unit = (unitRaw && unitRaw.toLowerCase() !== 'null' && unitRaw.toLowerCase() !== 'undefined') ? unitRaw : '';
    return unit ? (String(rawVal) + ' ' + unit) : String(rawVal);
  }

  // Fallback: String
  return String(rawVal);
}
async function sendSmartHomeCommand(ent, newVal) {
  if (!ent || !ent.id) return;
  try {
    await fetch('/api/smartHome/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ent.id, value: newVal })
    });
  } catch (e) {
    console.warn('smartHome command failed', e);
  }
}

function resolveDisplayName(name, fallback) {
  if (!name) return fallback;
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return name.de || name.en || Object.values(name)[0] || fallback;
  }
  return fallback;
}


function renderSmartHomeStructure(){
  const tabsEl = document.getElementById('smhRoomTabs');
  const contentEl = document.getElementById('smhRoomContent');
  if (!tabsEl || !contentEl) return;

  const structure = getSmartHomeStructure();

  // Clear previous content
  tabsEl.innerHTML = '';
  contentEl.innerHTML = '';

  if (!structure || !Object.keys(structure).length) {
    const wrap = document.createElement('div');
    wrap.className = 'smh-empty-state';

    const p = document.createElement('p');
    p.className = 'smh-placeholder-text';
    p.textContent = 'Sobald du im SmartHome-Konfigurator Geräte hinterlegt hast, werden sie hier nach Räumen und Funktionen angezeigt.';
    wrap.appendChild(p);

    const btn = document.createElement('a');
    btn.href = '/smarthome-config';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.className = 'btn sm smh-open-config';
    btn.textContent = 'SmartHome konfigurieren';
    wrap.appendChild(btn);

    contentEl.appendChild(wrap);
    return;
  }

  const roomKeys = Object.keys(structure).sort((a, b) => {
    const an = resolveDisplayName(structure[a]?.name, a).toString().toLowerCase();
    const bn = resolveDisplayName(structure[b]?.name, b).toString().toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });

  if (!window.currentSmartHomeRoom || !roomKeys.includes(window.currentSmartHomeRoom)) {
    window.currentSmartHomeRoom = roomKeys[0];
  }
  const activeKey = window.currentSmartHomeRoom;

  function detectGroupType(entities, funcKey) {
    const fk = (funcKey || '').toLowerCase();

    // Funktionsnamen auswerten
    if (fk.includes('light') || fk.includes('beleuchtung') || fk.includes('dimm')) return 'light';
    if (fk.includes('shade') || fk.includes('jalous') || fk.includes('shutter') || fk.includes('beschattung')) return 'blind';
    if (fk.includes('climate') || fk.includes('heating') || fk.includes('heizung') || fk.includes('temperatur')) return 'temp';

    // Rollen der enthaltenen Datenpunkte auswerten
    for (const ent of entities) {
      if (!ent) continue;
      const role = (ent.role || '').toLowerCase();
      const base = role.split('.')[0];

      if (base === 'switch' || base === 'level' || role.includes('light')) return 'light';
      if (role.includes('blind') || role.includes('shutter') || role.includes('jalous')) return 'blind';
      if (role.includes('temperature') || role.includes('climate') || role.includes('heating')) return 'temp';
    }

    return 'generic';
  }

  function getGroupIconUrl(groupType) {
    switch (groupType) {
      case 'light':
        return '/static/icons/KNXUF_light_light.png';
      case 'temp':
        return '/static/icons/KNXUF_sani_heating_temp.png';
      case 'blind':
        return '/static/icons/KNXUF_fts_sunblind.png';
      default:
        return '/static/icons/KNXUF_message_socket.png';
    }
  }

  // Build room tabs (ohne Icons, nur Text)
  for (const key of roomKeys) {
    const room = structure[key] || {};
    const roomName = resolveDisplayName(room.name, key);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'smh-room-tab' + (key === activeKey ? ' active' : '');
    btn.textContent = roomName;
    btn.addEventListener('click', () => {
      window.currentSmartHomeRoom = key;
      renderSmartHomeStructure();
    });
    tabsEl.appendChild(btn);
  }

  // Detail view for active room
  const room = structure[activeKey] || {};
  const funcs = room.functions || {};
  const funcNames = room.functionNames || {};

  const funcKeys = Object.keys(funcs);
  if (!funcKeys.length) {
    const wrap = document.createElement('div');
    wrap.className = 'smh-empty-state';

    const p = document.createElement('p');
    p.className = 'smh-placeholder-text';
    p.textContent = 'Für diesen Raum sind noch keine Funktionen verknüpft.';
    wrap.appendChild(p);

    const btn = document.createElement('a');
    btn.href = '/smarthome-config';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.className = 'btn sm smh-open-config';
    btn.textContent = 'SmartHome konfigurieren';
    wrap.appendChild(btn);

    contentEl.appendChild(wrap);
    return;
  }

  const sortedFuncKeys = funcKeys.sort();

  function getGroupKey(ent) {
    if (!ent || !ent.id) return ent && ent.id ? ent.id : '';
    const parts = String(ent.id).split('.');
    if (parts.length <= 2) return ent.id;
    return parts.slice(0, parts.length - 1).join('.');
  }

  function deriveGroupName(entities, fallback) {
    if (!entities || !entities.length) return fallback;
    const names = entities.map(e => e && e.name).filter(Boolean);
    if (!names.length) return fallback;
    let base = names[0];
    for (const n of names.slice(1)) {
      let i = 0;
      const max = Math.min(base.length, n.length);
      while (i < max && base[i] === n[i]) i++;
      base = base.slice(0, i).trim();
      if (!base) break;
    }
    if (base && base.length >= 3) {
      return base.replace(/[-:,_]+$/, '').trim();
    }
    return names[0] || fallback;
  }

  for (const fKey of sortedFuncKeys) {
    const entries = Array.isArray(funcs[fKey]) ? funcs[fKey] : [];
    if (!entries.length) continue;

    const funcCard = document.createElement('div');
    funcCard.className = 'smh-func-card';

    const funcHeader = document.createElement('div');
    funcHeader.className = 'smh-func-header';
    funcHeader.textContent = resolveDisplayName(funcNames[fKey], fKey);
    funcCard.appendChild(funcHeader);

    // Gruppen pro Kanal / Funktion bilden (z.B. Licht Schalten + Dimmen, Ist+Soll Temperatur)
    const groupsMap = {};
    for (const ent of entries) {
      if (!ent || !ent.id) continue;
      const gKey = getGroupKey(ent) || (ent.name || ent.id);
      if (!groupsMap[gKey]) groupsMap[gKey] = [];
      groupsMap[gKey].push(ent);
    }

    const groupKeys = Object.keys(groupsMap);
    for (const gKey of groupKeys) {
      const groupEntities = groupsMap[gKey];
      if (!groupEntities.length) continue;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'smh-entity-group';

      const groupName = deriveGroupName(groupEntities, gKey);
      const groupHeader = document.createElement('div');
      groupHeader.className = 'smh-entity-group-header';

      const groupType = detectGroupType(groupEntities, fKey);
      const icon = document.createElement('img');
      icon.className = 'smh-entity-group-icon-img smh-entity-group-icon-' + groupType;
      icon.src = getGroupIconUrl(groupType);
      icon.alt = '';
      groupHeader.appendChild(icon);

      const groupTitle = document.createElement('span');
      groupTitle.textContent = groupName;
      groupHeader.appendChild(groupTitle);

      groupDiv.appendChild(groupHeader);

      for (const ent of groupEntities) {
        if (!ent || !ent.id) continue;

        const row = document.createElement('div');
        const kind = detectSmartHomeEntityType(ent);
        row.className = 'smh-entity-row' + (kind === 'switch' ? ' interactive' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'smh-entity-name';
        nameSpan.textContent = ent.name || ent.id;
        row.appendChild(nameSpan);

        const keyVal = ent.key || null;
        let rawVal;
        if (keyVal && state && state[keyVal]) {
          rawVal = state[keyVal].value;
        }

        if (kind === 'dimmer' || kind === 'blind' || kind === 'tempSetpoint') {
          const wrap = document.createElement('div');
          wrap.className = 'smh-entity-slider';

          const slider = document.createElement('input');
          slider.type = 'range';

          let min = (typeof ent.min === 'number') ? ent.min : null;
          let max = (typeof ent.max === 'number') ? ent.max : null;

          // sinnvolle Defaults für Temperatur-Sollwerte
          if (kind === 'tempSetpoint') {
            if (min === null) min = 16;
            if (max === null) max = 26;
          } else {
            if (min === null) min = 0;
            if (max === null) max = 100;
          }

          slider.min = String(min);
          slider.max = String(max);

          const initial = (typeof rawVal === 'number' && !isNaN(rawVal)) ? rawVal : min;
          slider.value = String(initial);

          const label = document.createElement('span');
          label.className = 'smh-entity-value';
          label.textContent = formatSmartHomeValue(ent, initial);

          slider.addEventListener('change', () => {
            const val = Number(slider.value);
            label.textContent = formatSmartHomeValue(ent, val);
            sendSmartHomeCommand(ent, val);
          });

          wrap.appendChild(slider);
          wrap.appendChild(label);
          row.appendChild(wrap);
        } else {
          const valueSpan = document.createElement('span');
          valueSpan.className = (kind === 'switch') ? 'smh-entity-toggle' : 'smh-entity-value';
          valueSpan.textContent = formatSmartHomeValue(ent, rawVal);

          // AN-Farbe initial setzen
          if (kind === 'switch' && rawVal) {
            valueSpan.classList.add('is-on');
          }

          row.appendChild(valueSpan);

          if (kind === 'switch') {
            row.addEventListener('click', () => {
              // read latest value from state to avoid stale closure
              let current = false;
              if (keyVal && state && state[keyVal]) {
                const cur = state[keyVal].value;
                current = !!cur;
              }
              const next = !current;

              valueSpan.textContent = formatSmartHomeValue(ent, next);
              if (next) {
                valueSpan.classList.add('is-on');
              } else {
                valueSpan.classList.remove('is-on');
              }

              sendSmartHomeCommand(ent, next);
            });
          }
        }

        groupDiv.appendChild(row);
      }

      funcCard.appendChild(groupDiv);
    }

    contentEl.appendChild(funcCard);
  }
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
  renderSmartHomeStructure();
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
  let c2 = +(d('consumptionEvcs') ?? 0); // Wallbox
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


// open settings automatically if '?settings=1' is present
(function(){
  function openSettings(){
    try{
      // directly show settings view, independent of menu button handlers
      hideAllPanels();
      const content = document.querySelector('.content');
      if (content) content.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      // deactivate tab buttons
      document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
      // initialize settings UI
      if (typeof initSettingsPanel === 'function') initSettingsPanel();
      if (typeof setupSettings === 'function') setupSettings();
    } catch(e){}
  }
  try{
    const params = new URLSearchParams(window.location.search);
    if (params.get('settings') === '1') {
      // erst nach DOMContentLoaded ausführen, damit bootstrap()/initTabs()/hideAllPanels() fertig sind
      document.addEventListener('DOMContentLoaded', openSettings);
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
  const slider = qs('evcsModeSlider');

  if (card && modal){
    card.addEventListener('click', ()=> modal.classList.remove('hidden'));
  }
  if (close){
    close.addEventListener('click', ()=> modal.classList.add('hidden'));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') modal.classList.add('hidden'); });
  }
  if (toggle){
    toggle.addEventListener('change', async ()=>{
      try{ await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'settings', key:'evcsActive', value: toggle.checked})}); }catch(e){}
    });
  }
  if (slider){
    const clamp = (v)=> Math.max(1, Math.min(3, Math.round(Number(v)||1)));
    slider.addEventListener('input', ()=> slider.value = clamp(slider.value));
    slider.addEventListener('change', async ()=>{
      slider.value = clamp(slider.value);
      try{ await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'settings', key:'evcsMode', value: Number(slider.value)})}); }catch(e){}
    });
  }

  // Update values from state inside global render()
  window.__evcsApply = function(d, s){
    const p = d('consumptionEvcs') ?? 0;
    const st = d('evcsStatus') ?? '--';
    const active = s['settings.evcsActive']?.value ?? false;
    const mode = s['settings.evcsMode']?.value ?? 1;
    const fmtP = (val)=> {
      const u = (window.units && window.units.power) || 'W';
      const n = Number(val)||0;
      if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + ' kW';
      return n.toFixed(0) + ' ' + u;
    
    const rated = s['settings.evcsMaxPower']?.value ?? 11000; // W
    const pct = Math.max(0, Math.min(1, rated>0 ? (Math.abs(p)/rated) : 0));
    const g = document.querySelector('.evcs-gauge');
    if (g) {
      const deg = (pct*100).toFixed(1) + '%';
      g.style.background = 'radial-gradient(#0c0f12 60%, transparent 61%),' +
                           'conic-gradient(#6c5ce7 0% ' + deg + ', #2a2f35 ' + deg + ' 100%)';
    }};
    const pb = qs('evcsPowerBig'); if (pb) pb.textContent = fmtP(p);
    const sm = qs('evcsStatusModal'); if (sm) sm.textContent = st;
    if (toggle != null) toggle.checked = !!active;
    if (slider != null) slider.value = String(Math.max(1, Math.min(3, Math.round(Number(mode)||1))));
  };
})();


// open EVCS on node click as well
(function(){
  const n = document.getElementById('nodeEvcs');
  const modal = document.getElementById('evcsModal');
  if (n && modal){
    // mark clickable
    n.classList.add('clickable');
    n.addEventListener('click', ()=> modal.classList.remove('hidden'));
  }
})();