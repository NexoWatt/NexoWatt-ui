
let state = {};
let cfg = null;
let _renderScheduled = false;

// UI reliability: keep optimistic user actions stable while SSE updates stream in.
// Without this, the UI can momentarily snap back to the previous mode if the
// backend state update arrives slightly later than a render cycle.
const _pendingWrites = Object.create(null); // key -> { value: string, expires: number }

function _setPendingWrite(key, value, ttlMs = 1500) {
  try {
    _pendingWrites[String(key)] = { value: String(value), expires: Date.now() + ttlMs };
  } catch (_e) {}
}

function _mergeUpdatePayload(payload) {
  // Merge payload into state, but do not overwrite pending optimistic values
  // until either the backend confirms the same value or the pending entry expires.
  const now = Date.now();
  const merged = Object.assign({}, state);
  for (const [k, v] of Object.entries(payload || {})) {
    const pend = _pendingWrites[k];
    if (pend && pend.expires > now) {
      const incomingVal = (v && typeof v === 'object' && 'value' in v) ? String(v.value) : String(v);
      if (incomingVal !== pend.value) {
        // Ignore transient snap-back.
        continue;
      }
      // Backend confirmed our optimistic value.
      delete _pendingWrites[k];
    } else if (pend && pend.expires <= now) {
      delete _pendingWrites[k];
    }
    merged[k] = v;
  }
  state = merged;
}
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


function rfidLabel(i){
  const enabled = d('evcs.rfid.enabled');
  const reason = d(`evcs.${i}.rfidReason`);
  const user = d(`evcs.${i}.rfidUser`);
  const last = d(`evcs.${i}.rfidLast`);
  const enforced = d(`evcs.${i}.rfidEnforced`);
  const authorized = d(`evcs.${i}.rfidAuthorized`);

  const titleParts = [];
  if (last) titleParts.push('RFID: ' + last);
  if (enforced === false) titleParts.push('Hinweis: Keine Sperr-/Freigabe-DPs konfiguriert');

  if (enabled === false) {
    return { text: 'Aus', cls: 'off', title: titleParts.join(' • ') };
  }

  if (reason === 'no_rfid_dp') return { text: 'Kein RFID-DP', cls: 'warn', title: titleParts.join(' • ') };
  if (reason === 'no_card') return { text: 'Warte auf Karte', cls: 'wait', title: titleParts.join(' • ') };
  if (reason === 'whitelisted') return { text: 'Freigegeben' + (user ? (': ' + user) : ''), cls: 'ok', title: titleParts.join(' • ') };
  if (reason === 'not_whitelisted') return { text: 'Gesperrt' + (user ? (': ' + user) : ''), cls: 'lock', title: titleParts.join(' • ') };
  if (reason === 'rfid_disabled') return { text: 'Aus', cls: 'off', title: titleParts.join(' • ') };

  if (authorized === true) return { text: 'Freigegeben' + (user ? (': ' + user) : ''), cls: 'ok', title: titleParts.join(' • ') };
  if (authorized === false) return { text: 'Gesperrt', cls: 'lock', title: titleParts.join(' • ') };

  if (enabled == null) return null;
  return { text: '--', cls: 'muted', title: titleParts.join(' • ') };
}
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Keep adapter-safe id formatting in sync with EMS module (toSafeIdPart)
function safeIdPart(input){
  const s = String(input ?? '').trim();
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

function fmtMin(v){
  const n = Number(v);
  if (!isFinite(n)) return '--';
  if (n <= 0) return '0 min';
  return Math.round(n) + ' min';
}

function fmtClock(ts){
  const n = Number(ts);
  if (!isFinite(n) || n <= 0) return '';
  try{
    const d = new Date(n);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }catch(_e){ return ''; }
}

function reasonHint(reason, applyStatus){
  const r = String(reason ?? '').trim().toUpperCase();
  const a = String(applyStatus ?? '').trim().toLowerCase();

  // Do not spam the UI for normal states
  if (!r && !a) return null;
  if (r === 'OK' || r === 'ALLOCATED' || r === 'UNLIMITED') return null;

  // Apply-layer errors (DP write)
  if (a === 'no_dp_registry') return { level: 'err', text: 'Steuerung nicht möglich: Datenpunkt-Registry nicht bereit.' };
  if (a === 'write_failed') return { level: 'err', text: 'Steuerung fehlgeschlagen: Schreiben auf Setpoint nicht möglich.' };
  if (a === 'control_disabled' && !r) return { level: 'warn', text: 'Steuerung deaktiviert.' };

  // Canonical EMS reasons (German)
  if (r === 'NO_SETPOINT') return { level: 'err', text: 'Steuerung nicht möglich: Setpoint (A oder W) fehlt.' };
  if (r === 'OFFLINE') return { level: 'warn', text: 'Ladepunkt offline.' };
  if (r === 'DISABLED') return { level: 'warn', text: 'Ladepunkt deaktiviert.' };
  if (r === 'STALE_METER') return { level: 'warn', text: 'Messwerte zu alt (Failsafe).' };
  if (r === 'PAUSED_BY_PEAK_SHAVING') return { level: 'warn', text: 'Lastspitzenkappung aktiv.' };

  if (r === 'LIMITED_BY_GRID_IMPORT') return { level: 'info', text: 'Begrenzt durch Netzanschluss (Import-Limit).' };
  if (r === 'LIMITED_BY_PHASE_CAP') return { level: 'info', text: 'Begrenzt durch Phasen-/Strom-Limit.' };
  if (r === 'LIMITED_BY_BUDGET') return { level: 'info', text: 'Begrenzt durch Leistungsbudget.' };
  if (r === 'NO_PV_SURPLUS') return { level: 'info', text: 'Kein PV-Überschuss verfügbar.' };
  if (r === 'BELOW_MIN') return { level: 'info', text: 'Unter Mindestleistung – Ladepunkt pausiert.' };

  if (r === 'BOOST_TIMEOUT') return { level: 'info', text: 'Boost beendet (Timeout).' };
  if (r === 'BOOST_NOT_ALLOWED') return { level: 'warn', text: 'Boost für diesen Ladepunkt nicht erlaubt.' };

  // Fallback
  if (r) return { level: 'info', text: 'Status: ' + r };
  return null;
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
    // Prefer raw scale 1..3 (Boost/Min+PV/PV). Only fall back to legacy 0..2 if needed.
    if (r >= 1 && r <= 3) return { ui: clampUiMode(r), scale: '1-3' };
    if (r >= 0 && r <= 2) return { ui: clampUiMode(r + 1), scale: '0-2' };
    return { ui: clampUiMode(r), scale: null };
  }
  return { ui: 1, scale: null };
}
function uiToRawMode(ui, scale){
  // EVCS expects raw mode 1..3 (Boost/Min+PV/PV)
  const u = clampUiMode(ui);
  return u;
}

// EMS per-chargepoint mode mapping (runtime): auto | boost | minpv | pv
function emsModeToUi(mode){
  const s = String(mode ?? '').trim().toLowerCase();
  if (s === 'boost') return 2;
  if (s === 'minpv' || s === 'min+pv') return 3;
  if (s === 'pv') return 4;
  return 1; // auto
}

function uiToEmsMode(ui){
  const n = Math.max(1, Math.min(4, Math.round(Number(ui)||1)));
  if (n === 2) return 'boost';
  if (n === 3) return 'minpv';
  if (n === 4) return 'pv';
  return 'auto';
}

function clampEmsUi(v){
  const n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
}

function render(){
  const list = document.getElementById('evcsList');
  if (!list) return;

  const count = Number(cfg && cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
  const meta = (cfg && cfg.settingsConfig && Array.isArray(cfg.settingsConfig.evcsList)) ? cfg.settingsConfig.evcsList : [];

  // Boost queue (global): show who currently has priority when multiple chargepoints are in boost.
  const boostQueueRank = {};
  try{
    const count0 = Number(cfg && cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    const boostArr = [];
    for (let i=1; i<=count0; i++){
      const base = `chargingManagement.wallboxes.lp${i}`;
      const eff = String(d(`${base}.effectiveMode`) ?? '').trim().toLowerCase();
      const um  = String(d(`${base}.userMode`) ?? '').trim().toLowerCase();
      const isBoost = (eff === 'boost') || (um === 'boost');
      if (!isBoost) continue;
      const charging = !!d(`${base}.charging`);
      const since = Number(d(`${base}.chargingSince`) || 0);
      boostArr.push({ i, charging, since: (isFinite(since) && since > 0) ? since : 0 });
    }
    boostArr.sort((a,b)=>{
      if (!!a.charging !== !!b.charging) return (a.charging ? -1 : 1);
      const as = (a.since && a.since > 0) ? a.since : Number.POSITIVE_INFINITY;
      const bs = (b.since && b.since > 0) ? b.since : Number.POSITIVE_INFINITY;
      if (as !== bs) return as - bs;
      return a.i - b.i;
    });
    for (let k=0; k<boostArr.length; k++) boostQueueRank[boostArr[k].i] = k + 1;
  }catch(_e){}

  let html = '';
  for (let i=1; i<=count; i++){
    const m = meta[i-1] || {};
    const name = m.name || ('Ladepunkt ' + i);
    const note = m.note || '';

    const canActive = !!m.activeId;
    const canMode = !!m.modeId;

    // EMS states (runtime control) — prefer these on the EVCS page.
    const cm = `chargingManagement.wallboxes.lp${i}`;
    const hasEms = (cfg && cfg.ems && cfg.ems.chargingEnabled) || d('chargingManagement.wallboxCount') != null;
    const emsUserMode = d(`${cm}.userMode`);
    const emsEffectiveMode = d(`${cm}.effectiveMode`);
    const emsChargerType = d(`${cm}.chargerType`);
    const emsCharging = d(`${cm}.charging`);
    const emsTargetW = d(`${cm}.targetPowerW`);
    const emsStationKey = d(`${cm}.stationKey`);
    const emsStationMaxW = d(`${cm}.stationMaxPowerW`);
    const emsBoostActive = d(`${cm}.boostActive`);
    const emsBoostRemainingMin = d(`${cm}.boostRemainingMin`);
    const emsBoostUntil = d(`${cm}.boostUntil`);
    const emsBoostTimeoutMin = d(`${cm}.boostTimeoutMin`);
    const emsReason = d(`${cm}.reason`);
    const emsApplyStatus = d(`${cm}.applyStatus`);
    const emsAllowBoost = d(`${cm}.allowBoost`);

    const stationSafe = emsStationKey ? safeIdPart(emsStationKey) : '';
    const stationRemainingW = stationSafe ? d(`chargingManagement.stations.${stationSafe}.remainingW`) : undefined;
    const stationCapW = stationSafe ? d(`chargingManagement.stations.${stationSafe}.maxPowerW`) : undefined;

    const p = d(`evcs.${i}.powerW`);
    const day = d(`evcs.${i}.energyDayKwh`);
    const tot = d(`evcs.${i}.energyTotalKwh`);
    const st = d(`evcs.${i}.status`);
    const active = d(`evcs.${i}.active`);
    const mode = d(`evcs.${i}.mode`);
    const modeVal = clampUiMode(mode);

    // EMS slider value (1..4): Auto | Boost | Min+PV | PV
    const emsUiVal = clampEmsUi(emsModeToUi(emsUserMode ?? 'auto'));
    const effTxt = String(emsEffectiveMode ?? '').trim();
    const effLower = effTxt.toLowerCase();
    const userLower = String(emsUserMode ?? 'auto').trim().toLowerCase();
    const hint = reasonHint(emsReason, emsApplyStatus);
    const allowBoost = (emsAllowBoost !== false);
    const boostDisabled = (!allowBoost && userLower !== 'boost');
    const showEff = !!effTxt && ((userLower === 'auto' && effLower !== 'normal') || (userLower !== 'auto' && userLower !== effLower && !(userLower==='minpv' && effLower==='minpv')));

    const ct = String(emsChargerType ?? m.chargerType ?? '').toUpperCase();
    const ctBadge = (ct === 'DC' || ct === 'AC') ? ct : '';
    const bq = boostQueueRank[i] || 0;
    const rfid = rfidLabel(i);
html += `
      <div class="card" style="margin:0">
        <div class="card-header">
          <div class="legend-color"></div>
          <span>${esc(name)}${ctBadge ? ` <span class="muted" style="font-size:12px; margin-left:8px; opacity:.85">${esc(ctBadge)}</span>` : ''}</span>
        </div>
        <div style="display:grid; gap:8px; padding:12px;">
          ${note ? `<div class="muted" style="opacity:.8">${esc(note)}</div>` : ''}
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Leistung</span><strong>${fmtW(p)}</strong>
          </div>
          ${hasEms && emsTargetW != null ? `<div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Soll (EMS)</span><strong>${fmtW(emsTargetW)}</strong>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Heute</span><strong>${fmtKwh(day)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Gesamt</span><strong>${fmtKwh(tot)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>Status</span><strong>${esc(st ?? '--')}</strong>
          </div>
          ${rfid ? `<div style="display:flex; justify-content:space-between; gap:12px;">
            <span>RFID</span><strong class="nw-evcs-rfid ${esc(rfid.cls)}" ${rfid.title ? `title="${esc(rfid.title)}"` : ''}>${esc(rfid.text)}</strong>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span>Aktiv</span>
            ${canActive ? `<label class="switch"><input type="checkbox" data-evcs-active="${i}" ${active ? 'checked' : ''}><span></span></label>` : `<strong>${active == null ? '--' : (active ? 'Ja' : 'Nein')}</strong>`}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <span>${hasEms ? 'Lade‑Modus' : 'Modus'}</span>
            ${hasEms ? `
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
                <div class="nw-evcs-mode">
                  <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-4" role="group" aria-label="Lade-Modus">
                    <button type="button" class="${emsUiVal === 1 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="auto">Auto</button>
                    <button type="button" class="${emsUiVal === 2 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="boost" ${boostDisabled ? 'disabled title="Boost für diesen Ladepunkt nicht erlaubt"' : ''}>Boost</button>
                    <button type="button" class="${emsUiVal === 3 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="minpv">Min+PV</button>
                    <button type="button" class="${emsUiVal === 4 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="pv">PV</button>
                  </div>
                </div>
                ${showEff ? `<div class="muted" style="font-size:12px; opacity:.85">Effektiv: ${esc(effTxt)}</div>` : ''}
                ${hint ? `<div class="nw-hint nw-hint-${hint.level}">${esc(hint.text)}</div>` : ''}
              </div>
            ` : (canMode ? `
              <div class="nw-evcs-mode">
                <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-3" role="group" aria-label="Betriebsmodus">
                  <button type="button" class="${modeVal === 1 ? 'active' : ''}" data-evcs-mode-btn="${i}" data-mode="1">Boost</button>
                  <button type="button" class="${modeVal === 2 ? 'active' : ''}" data-evcs-mode-btn="${i}" data-mode="2">Min+PV</button>
                  <button type="button" class="${modeVal === 3 ? 'active' : ''}" data-evcs-mode-btn="${i}" data-mode="3">PV</button>
                </div>
              </div>
            ` : `<strong>${mode == null ? '--' : esc(mode)}</strong>`)}
          </div>

          ${hasEms && (String(emsUserMode||'').toLowerCase()==='boost' || emsBoostActive===true) ? `
            <div style="display:flex; justify-content:space-between; gap:12px;">
              <span>Boost</span>
              <strong title="Boost endet ${fmtClock(emsBoostUntil) ? ('um ' + fmtClock(emsBoostUntil)) : ''} • Timeout ${fmtMin(emsBoostTimeoutMin)}">
                ${emsBoostActive ? `Aktiv (${fmtMin(emsBoostRemainingMin)})` : `Aktivierung wartet`}
                ${bq ? ` <span class="muted" style="font-weight:600; opacity:.85">#${bq}</span>` : ''}
              </strong>
            </div>
          ` : ''}

          ${hasEms && emsStationKey ? `
            <div style="display:flex; justify-content:space-between; gap:12px;">
              <span>Station</span>
              <strong title="Station-Limit: ${fmtW(emsStationMaxW || stationCapW)} • Verfügbar: ${fmtW(stationRemainingW)}">${esc(emsStationKey)}${stationCapW ? ` (${fmtW(stationCapW)})` : (emsStationMaxW ? ` (${fmtW(emsStationMaxW)})` : '')}</strong>
            </div>
          ` : ''}
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

  // EVCS active toggle (legacy)
  list.addEventListener('change', async (e)=>{
    const t = e.target;
    if (!t) return;

    if (t.matches('input[type="checkbox"][data-evcs-active]')){
      const idx = Number(t.getAttribute('data-evcs-active'));
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'evcs', key: `${idx}.active`, value: !!t.checked})});
      }catch(_e){}
    }
  });

  // Mode buttons (EMS + legacy)
  // Problem we solve here (Serienreife): Frequent SSE renders can replace the DOM
  // between pointerdown and click, causing lost clicks. We therefore trigger the action
  // on pointerdown (immediately) and suppress the follow-up click.
  let _ignoreClickUntil = 0;

  async function handleModeButton(btn){
    if (!btn) return;
    // EMS: per Ladepunkt runtime userMode (auto|boost|minpv|pv)
    if (btn.matches('button[data-ems-mode-btn]')){
      const idx = Number(btn.getAttribute('data-ems-mode-btn'));
      let mode = String(btn.getAttribute('data-mode') || 'auto').trim().toLowerCase();
      if (mode === 'min+pv') mode = 'minpv';
      if (!['auto','boost','minpv','pv'].includes(mode)) mode = 'auto';

      // UX: allow manual boost cancel by clicking the active Boost button again.
      try{
        let cur = String(d(`chargingManagement.wallboxes.lp${idx}.userMode`) ?? 'auto').trim().toLowerCase();
        if (cur === 'min+pv') cur = 'minpv';
        if (!['auto','boost','minpv','pv'].includes(cur)) cur = 'auto';
        if (mode === 'boost' && cur === 'boost') mode = 'auto';
      }catch(_e){}

      // Optimistic UI update + pending-write protection.
      const k = `chargingManagement.wallboxes.lp${idx}.userMode`;
      try{
        _setPendingWrite(k, mode);
        state[k] = { value: mode, ts: Date.now() };
        scheduleRender();
      }catch(_e){}

      try{
        await fetch('/api/set', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({scope:'ems', key: `evcs.${idx}.userMode`, value: mode})
        });
      }catch(_e){}
      return;
    }

    // Legacy: EVCS mode datapoint (1..3)
    if (btn.matches('button[data-evcs-mode-btn]')){
      const idx = Number(btn.getAttribute('data-evcs-mode-btn'));
      const v = clampMode(btn.getAttribute('data-mode'));
      const k = `evcs.${idx}.mode`;
      try{
        _setPendingWrite(k, v);
        state[k] = { value: v, ts: Date.now() };
        scheduleRender();
      }catch(_e){}
      try{
        await fetch('/api/set', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({scope:'evcs', key: `${idx}.mode`, value: Number(v)})
        });
      }catch(_e){}
    }
  }

  // Fast + reliable: pointerdown
  list.addEventListener('pointerdown', (e)=>{
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn],button[data-evcs-mode-btn]');
    if (!btn) return;
    _ignoreClickUntil = Date.now() + 450;
    try{ e.preventDefault(); }catch(_e){}
    handleModeButton(btn);
  }, { passive: false });

  // Keyboard support: Enter/Space
  list.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn],button[data-evcs-mode-btn]');
    if (!btn) return;
    try{ e.preventDefault(); }catch(_e){}
    handleModeButton(btn);
  });

  // Fallback click handler (e.g. older browsers). Suppressed shortly after pointerdown.
  list.addEventListener('click', (e)=>{
    if (Date.now() < _ignoreClickUntil) return;
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn],button[data-evcs-mode-btn]');
    if (!btn) return;
    handleModeButton(btn);
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

  scheduleRender();
  // live updates
  try{
    const es = new EventSource('/events');
    es.onmessage = (ev)=>{
      try{
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' && msg.payload) state = msg.payload;
        if (msg.type === 'update' && msg.payload) _mergeUpdatePayload(msg.payload);
        scheduleRender();
      }catch(e){}
    };
  }catch(e){}
}

document.addEventListener('DOMContentLoaded', bootstrap);
