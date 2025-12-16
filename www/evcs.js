
let state = {};
let cfg = null;

function d(key){
  try { return state && state[key] ? state[key].value : undefined; } catch(e){ return undefined; }
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

    const p = d(`evcs.${i}.powerW`);
    const day = d(`evcs.${i}.energyDayKwh`);
    const tot = d(`evcs.${i}.energyTotalKwh`);
    const st = d(`evcs.${i}.status`);
    const active = d(`evcs.${i}.active`);
    const mode = d(`evcs.${i}.mode`);

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
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Aktiv</span><strong>${active == null ? '--' : (active ? 'Ja' : 'Nein')}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Modus</span><strong>${mode == null ? '--' : esc(mode)}</strong>
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

async function bootstrap(){
  initMenu();
  try{
    cfg = await fetch('/config').then(r=>r.json());
    const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', c < 2);
      const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', c < 2);
    const n = document.getElementById('nav-evcs');
    if (n) n.classList.toggle('hidden', c < 2);
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
