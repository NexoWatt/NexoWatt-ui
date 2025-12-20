
let state = {};
let cfg = null;

function d(key){
  try {
    return (state && Object.prototype.hasOwnProperty.call(state, key)) ? state[key].value : undefined;
  } catch(e){ return undefined; }
}
function fmtW(w){
  if (w == null || isNaN(w)) return '--';
  const v = Number(w);
  if (Math.abs(v) >= 1000) return (v/1000).toFixed(2) + ' kW';
  return Math.round(v) + ' W';
}
function fmtKwh(v){
  if (v == null || isNaN(v)) return '--';
  return Number(v).toFixed(2) + ' kWh';
}
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}


function clampUiMode(v){
  const n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(1, Math.min(3, Math.round(n)));
}
function normalizeMode(raw){
  const s = String(raw ?? '').trim();
  if (s === '') return { ui: 1, scale: null };
  const sl = s.toLowerCase();
  if (sl.includes('boost')) return { ui: 1, scale: null };
  if (sl.includes('min') && sl.includes('pv')) return { ui: 2, scale: null };
  if (sl === 'pv' || (sl.includes('pv') && !sl.includes('min'))) return { ui: 3, scale: null };
  const num = Number(raw);
  if (isFinite(num)){
    const r = Math.round(num);
    if (r >= 0 && r <= 2) return { ui: clampUiMode(r + 1), scale: '0-2' };
    if (r >= 1 && r <= 3) return { ui: clampUiMode(r), scale: '1-3' };
    return { ui: clampUiMode(r), scale: null };
  }
  return { ui: 1, scale: null };
}
function uiToRawMode(ui, scale){
  const u = clampUiMode(ui);
  if (scale === '0-2') return u - 1;
  return u;
}

function render(){
  const list = document.getElementById('evcsList');
  if (!list) return;

  const count = Number(cfg && cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
  const meta = (cfg && cfg.settingsConfig && Array.isArray(cfg.settingsConfig.evcsList)) ? cfg.settingsConfig.evcsList : [];

  let html = '';
  for (let i=1; i<=count; i++){
    const m = meta[i-1] || {};
    const name = m.name || ('Wallbox ' + i);
    const note = m.note || '';

    const canActive = !!m.activeId;
    const canMode = !!m.modeId;

    const p = d(`evcs.${i}.powerW`);
    const day = d(`evcs.${i}.energyDayKwh`);
    const tot = d(`evcs.${i}.energyTotalKwh`);
    const st = d(`evcs.${i}.status`);
    const active = d(`evcs.${i}.active`);
    const mode = d(`evcs.${i}.mode`);
    const nmMode = normalizeMode(mode);
    const modeVal = nmMode.ui;
    const modeScale = nmMode.scale || '';

    html += `
      <div class="card" style="margin:0">
        <div class="card-header">
          <div class="legend-color"></div>
          <span>${esc(name)}</span>
        </div>
        <div style="display:grid; gap:8px; padding:12px;">
          ${note ? `<div class="muted" style="opacity:.8">${esc(note)}</div>` : ''}
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Leistung</span><strong>${fmtW(p)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Heute</span><strong>${fmtKwh(day)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Gesamt</span><strong>${fmtKwh(tot)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Status</span><strong>${esc(st ?? '--')}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span>Aktiv</span>
            ${canActive ? `<label class="switch"><input type="checkbox" data-evcs-active="${i}" ${active ? 'checked' : ''}><span></span></label>` : `<strong>${active == null ? '--' : (active ? 'Ja' : 'Nein')}</strong>`}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span>Modus</span>
            ${canMode ? `
              <div class="nw-evcs-mode">
                <input type="range" min="1" max="3" step="1" data-evcs-mode="${i}" data-scale="${modeScale}" value="${modeVal}" aria-label="Betriebsmodus">
                <div class="nw-evcs-mode-labels">
                  <span data-mode="1" class="${modeVal === 1 ? 'active' : ''}">Boost</span>
                  <span data-mode="2" class="${modeVal === 2 ? 'active' : ''}">Min+PV</span>
                  <span data-mode="3" class="${modeVal === 3 ? 'active' : ''}">PV</span>
                </div>
              </div>
            ` : `<strong>${mode == null ? '--' : esc(mode)}</strong>`}
          </div>
        </div>
      </div>
    `;
  }

  // Aggregate
  const totalP = d('evcs.totalPowerW');
  html = `
    <div class="card" style="margin:0">
      <div class="card-header"><div class="legend-color"></div><span>Gesamt</span></div>
      <div style="display:flex; justify-content:space-between; gap:12px; padding:12px;">
        <span>Gesamtleistung</span><strong>${fmtW(totalP)}</strong>
      </div>
    </div>
  ` + html;

  list.innerHTML = html;
}

function initMenu(){
  const btn=document.getElementById('menuBtn');
  const dd=document.getElementById('menuDropdown');
  if(btn && dd){
    btn.addEventListener('click', (e)=>{ e.preventDefault(); dd.classList.toggle('hidden'); });
    document.addEventListener('click', (e)=>{ if(!dd.contains(e.target) && e.target!==btn) dd.classList.add('hidden'); });
  }
}

function bindControls(){
  const list = document.getElementById('evcsList');
  if (!list) return;

  const clampMode = (v)=> Math.max(1, Math.min(3, Math.round(Number(v)||1)));

  // keep slider value clamped live
  list.addEventListener('input', (e)=>{
    const t = e.target;
    if (t && t.matches('input[type="range"][data-evcs-mode]')){
      const v = clampMode(t.value);
      t.value = String(v);
      const box = t.closest('.nw-evcs-mode');
      if (box){
        const spans = box.querySelectorAll('.nw-evcs-mode-labels span[data-mode]');
        spans.forEach(s => s.classList.toggle('active', Number(s.getAttribute('data-mode')) === v));
      }
    }
  });

  // send changes to adapter
  list.addEventListener('change', async (e)=>{
    const t = e.target;
    if (!t) return;

    if (t.matches('input[type="checkbox"][data-evcs-active]')){
      const idx = Number(t.getAttribute('data-evcs-active'));
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'evcs', key: `${idx}.active`, value: !!t.checked})});
      }catch(_e){}
      return;
    }

    if (t.matches('input[type="range"][data-evcs-mode]')){
      const idx = Number(t.getAttribute('data-evcs-mode'));
      const v = clampMode(t.value);
      t.value = String(v);
      const scale = String(t.getAttribute('data-scale') || '');
      const raw = uiToRawMode(v, scale);
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'evcs', key: `${idx}.mode`, value: Number(raw)})});
      }catch(_e){}
    }
  });
}


async function bootstrap(){
  initMenu();
  bindControls();
  try{
    cfg = await fetch('/config').then(r=>r.json());
    const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', c < 2);
      const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', c < 2);
    const n = document.getElementById('nav-evcs');
    if (n) n.classList.toggle('hidden', c < 2);
    const sh = !!(cfg.smartHome && cfg.smartHome.enabled);
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !sh);
    const st = document.getElementById('tabSmartHome');
    if (st) st.classList.toggle('hidden', !sh);
}catch(e){}

  try{
    state = await fetch('/api/state').then(r=>r.json());
  }catch(e){ state = {}; }

  render();

  // live updates
  try{
    const es = new EventSource('/events');
    es.onmessage = (ev)=>{
      try{
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' && msg.payload) state = msg.payload;
        if (msg.type === 'update' && msg.payload) state = Object.assign({}, state, msg.payload);
        render();
      }catch(e){}
    };
  }catch(e){}
}

document.addEventListener('DOMContentLoaded', bootstrap);
