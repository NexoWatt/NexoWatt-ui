/**
 * NexoWatt VIS – EVCS Seite
 * Ziel: skalierbar bis 50 Ladepunkte, Übersicht als Kacheln, Details/Bedienung im Tooltip-Dialog.
 */

let state = {};
let cfg = null;
let _renderScheduled = false;
let _renderTimer = null;
let _lastRenderTs = 0;
// EVCS can have up to 50 Ladepunkte; avoid re-rendering the whole grid on every tiny update.
const _RENDER_MIN_INTERVAL_MS = 120;

// UI reliability: keep optimistic user actions stable while SSE updates stream in.
const _pendingWrites = Object.create(null); // key -> { value: string, expires: number }

function _setPendingWrite(key, value, ttlMs = 1500) {
  try {
    _pendingWrites[String(key)] = { value: String(value), expires: Date.now() + ttlMs };
  } catch (_e) {}
}

function _clearPendingWrite(key, expectedValue) {
  try {
    const k = String(key);
    const p = _pendingWrites[k];
    if (!p) return;
    if (expectedValue === undefined || expectedValue === null) {
      delete _pendingWrites[k];
      return;
    }
    if (String(p.value) === String(expectedValue)) delete _pendingWrites[k];
  } catch (_e) {}
}

function _mergeUpdatePayload(payload) {
  const now = Date.now();
  const merged = Object.assign({}, state);

  for (const [k, v] of Object.entries(payload || {})) {
    const pend = _pendingWrites[k];

    if (pend && pend.expires > now) {
      const incomingVal = (v && typeof v === 'object' && 'value' in v) ? String(v.value) : String(v);
      if (incomingVal !== pend.value) {
        // Ignore transient snap-back while we wait for confirmation.
        continue;
      }
      delete _pendingWrites[k];
    } else if (pend && pend.expires <= now) {
      delete _pendingWrites[k];
    }

    merged[k] = v;
  }

  state = merged;
}

function _isEvcsRelevantPayload(payload) {
  try {
    for (const k of Object.keys(payload || {})) {
      if (k.startsWith('evcs.') || k.startsWith('chargingManagement.')) return true;
    }
  } catch (_e) {}
  return false;
}

function scheduleRender() {
  if (_renderScheduled) return;
  _renderScheduled = true;

  const now = Date.now();
  const wait = Math.max(0, _RENDER_MIN_INTERVAL_MS - (now - _lastRenderTs));

  if (_renderTimer) {
    try { clearTimeout(_renderTimer); } catch (_e) {}
    _renderTimer = null;
  }

  _renderTimer = setTimeout(() => {
    _renderScheduled = false;
    _lastRenderTs = Date.now();
    try { render(); } catch (_e) {}
  }, wait);
}

function d(key) {
  try {
    return (state && Object.prototype.hasOwnProperty.call(state, key)) ? state[key].value : undefined;
  } catch (_e) {
    return undefined;
  }
}

function fmtW(w) {
  if (w == null || isNaN(w)) return '--';
  const v = Number(w);
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + ' kW';
  return Math.round(v) + ' W';
}

function fmtPct(v) {
  const n = Number(v);
  if (!isFinite(n)) return '--';
  return Math.round(n) + ' %';
}

function fmtKwh(v) {
  if (v == null || isNaN(v)) return '--';
  return Number(v).toFixed(2) + ' kWh';
}

function fmtMin(v) {
  const n = Number(v);
  if (!isFinite(n)) return '--';
  if (n <= 0) return '0 min';
  return Math.round(n) + ' min';
}

function fmtClock(ts) {
  const n = Number(ts);
  if (!isFinite(n) || n <= 0) return '';
  try {
    const dt = new Date(n);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch (_e) {
    return '';
  }
}

function nextTsFromTimeInput(hhmm) {
  const s = String(hhmm ?? '').trim();
  if (!s || !/^\d{2}:\d{2}$/.test(s)) return 0;
  const parts = s.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!isFinite(hh) || !isFinite(mm)) return 0;

  const now = new Date();
  const dt = new Date(now);
  dt.setHours(hh, mm, 0, 0);

  // If the selected time is in the past (or within 1 minute), schedule for the next day.
  if (dt.getTime() <= now.getTime() + 60000) dt.setDate(dt.getDate() + 1);
  return dt.getTime();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Keep adapter-safe id formatting in sync with EMS module (toSafeIdPart)
function safeIdPart(input) {
  const s = String(input ?? '').trim();
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

function rfidLabel(i) {
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

function reasonHint(reason, applyStatus) {
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
  if (r === 'CONTROL_DISABLED') return { level: 'warn', text: 'Regelung deaktiviert.' };
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

// --- EMS mode mapping (runtime): auto | boost | minpv | pv -------------------
function emsModeToUi(mode) {
  const s = String(mode ?? '').trim().toLowerCase();
  if (s === 'boost') return 2;
  if (s === 'minpv' || s === 'min+pv') return 3;
  if (s === 'pv') return 4;
  return 1; // auto
}

function clampEmsUi(v) {
  const n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
}

// Legacy (direct DP) mode mapping
function clampUiMode(v) {
  const n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(1, Math.min(3, Math.round(n)));
}

// --- Runtime vars ------------------------------------------------------------
let _boostQueueRank = {};
let _evcsCount = 1;
let _evcsMeta = [];

// Modal state
let _modalOpenIdx = 0;
let _modalLocked = false;
let _modalInteractionUntil = 0;
let _modalRerenderTimer = null;

function _touchModalInteraction(ttlMs = 900) {
  const t = Date.now() + ttlMs;
  if (t > _modalInteractionUntil) _modalInteractionUntil = t;
}

function _scheduleModalRerenderRetry(delayMs) {
  // When the modal is "interaction-locked" we skip body re-rendering (to keep
  // native pickers stable). This helper makes sure the UI updates again once
  // the lock expires, without requiring the user to close & reopen the modal.
  try {
    if (_modalRerenderTimer) return;
    const ms = Math.max(120, Math.min(20000, Math.round(Number(delayMs) || 0)));
    _modalRerenderTimer = setTimeout(() => {
      _modalRerenderTimer = null;
      scheduleRender(true);
    }, ms);
  } catch (_e) {
    // ignore
  }
}

function _isModalLocked(modalEl) {
  const now = Date.now();

  // Explicit lock flags (timeout + focus tracking)
  //
  // IMPORTANT: `_modalLocked` must never stay TRUE forever.
  // In earlier hotfixes the flag was set on `focusin` and only cleared when focus left the modal.
  // That prevented the modal body from ever re-rendering while it was open (e.g. when enabling
  // Ziel‑Laden, the fields appeared only after closing/reopening).
  //
  // We therefore treat `_modalLocked` as *time‑based*: once the interaction window is over,
  // we automatically release the lock.
  if (_modalLocked && (now >= _modalInteractionUntil)) {
    _modalLocked = false;
  }

  if (_modalLocked || (now < _modalInteractionUntil)) return true;

  // Robust fallback: If the active element is inside the modal, we avoid re-rendering
  // the modal body. This prevents native pickers (type=time/date) from closing
  // due to DOM replacement.
  try {
    const ae = document.activeElement;
    if (modalEl && ae && modalEl.contains(ae)) {
      const tag = (ae.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
      // Also lock for any custom control that sets aria roles.
      const role = ae.getAttribute && ae.getAttribute('role');
      if (role === 'listbox' || role === 'combobox') return true;
    }
  } catch (_e) { /* ignore */ }

  return false;
}

// --- EVCS helpers ------------------------------------------------------------
function _hasEms() {
  return !!((cfg && cfg.ems && cfg.ems.chargingEnabled) || d('chargingManagement.wallboxCount') != null);
}

function _computeBoostQueueRank(count) {
  const boostQueueRank = {};
  try {
    const boostArr = [];
    for (let i = 1; i <= count; i++) {
      const base = `chargingManagement.wallboxes.lp${i}`;
      const eff = String(d(`${base}.effectiveMode`) ?? '').trim().toLowerCase();
      const um = String(d(`${base}.userMode`) ?? '').trim().toLowerCase();
      const isBoost = (eff === 'boost') || (um === 'boost');
      if (!isBoost) continue;

      const charging = !!d(`${base}.charging`);
      const since = Number(d(`${base}.chargingSince`) || 0);
      boostArr.push({ i, charging, since: (isFinite(since) && since > 0) ? since : 0 });
    }

    boostArr.sort((a, b) => {
      if (!!a.charging !== !!b.charging) return (a.charging ? -1 : 1);
      const as = (a.since && a.since > 0) ? a.since : Number.POSITIVE_INFINITY;
      const bs = (b.since && b.since > 0) ? b.since : Number.POSITIVE_INFINITY;
      if (as !== bs) return as - bs;
      return a.i - b.i;
    });

    for (let k = 0; k < boostArr.length; k++) boostQueueRank[boostArr[k].i] = k + 1;
  } catch (_e) {}
  return boostQueueRank;
}

function _modeBadge(emsUserMode) {
  const m = String(emsUserMode ?? '').trim().toLowerCase();
  if (m === 'boost') return 'BOOST';
  if (m === 'minpv' || m === 'min+pv') return 'MIN+PV';
  if (m === 'pv') return 'PV';
  if (m === 'auto') return 'AUTO';
  return '';
}

function _tileStateClass({ powerW, reason, active, regEnabled }) {
  const p = Number(powerW);
  const r = String(reason ?? '').trim().toUpperCase();

  if (r === 'OFFLINE' || r === 'NO_SETPOINT' || r === 'STALE_METER') return 'nw-tile--state-warning';
  if (active === false || regEnabled === false) return 'nw-tile--state-disabled';
  if (isFinite(p) && Math.abs(p) >= 80) return 'nw-tile--state-on';
  return 'nw-tile--state-off';
}

function _shortStatusText(status, reason) {
  const st = String(status ?? '').trim();
  if (st) return st;
  const r = String(reason ?? '').trim().toUpperCase();
  if (r === 'OFFLINE') return 'Offline';
  if (r === 'DISABLED') return 'Deaktiviert';
  if (r === 'CONTROL_DISABLED') return 'Regelung aus';
  if (r) return r;
  return '--';
}

// --- Modal -------------------------------------------------------------------
function openEvcsModal(idx) {
  const i = Number(idx);
  if (!Number.isFinite(i) || i <= 0) return;

  const modal = document.getElementById('evcsModal');
  const body = document.getElementById('evcsModalBody');
  const title = document.getElementById('evcsModalTitle');
  const sub = document.getElementById('evcsModalSubTitle');
  if (!modal || !body || !title) return;

  _modalOpenIdx = i;
  _modalLocked = false;
  _touchModalInteraction(600);

  const m = _evcsMeta[i - 1] || {};
  const name = m.name || ('Ladepunkt ' + i);

  const p = d(`evcs.${i}.powerW`);
  const soc = d(`evcs.${i}.vehicleSoc`);
  const st = d(`evcs.${i}.status`);

  title.textContent = name;
  if (sub) {
    const parts = [];
    parts.push('Leistung: ' + fmtW(p));
    if (soc != null) parts.push('SoC: ' + fmtPct(soc));
    if (st != null) parts.push(String(st));
    sub.textContent = parts.join(' • ');
  }

  body.innerHTML = buildEvcsModalBodyHtml(i);

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // Focus close button for keyboard navigation
  try { document.getElementById('evcsModalClose')?.focus(); } catch (_e) {}
}

function closeEvcsModal() {
  const modal = document.getElementById('evcsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  _modalOpenIdx = 0;
  _modalLocked = false;
  _modalInteractionUntil = 0;
  try {
    if (_modalRerenderTimer) {
      clearTimeout(_modalRerenderTimer);
      _modalRerenderTimer = null;
    }
  } catch (_e) {}
}

function buildEvcsModalBodyHtml(i) {
  const count = _evcsCount || 1;
  const meta = Array.isArray(_evcsMeta) ? _evcsMeta : [];
  const m = meta[i - 1] || {};

  const name = m.name || ('Ladepunkt ' + i);
  const note = m.note || '';

  const canActive = !!m.activeId;

  const hasEms = _hasEms();
  const cm = `chargingManagement.wallboxes.lp${i}`;

  const emsUserMode = d(`${cm}.userMode`);
  const emsEffectiveMode = d(`${cm}.effectiveMode`);
  const emsChargerType = d(`${cm}.chargerType`);
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
  const emsRegEnabled = d(`${cm}.userEnabled`);

  const regAvail = hasEms && (emsRegEnabled !== null && emsRegEnabled !== undefined);
  const regOn = regAvail ? !!emsRegEnabled : true;
  const regOff = regAvail && !regOn;

  // Zeit-Ziel Laden (Depot-/Deadline-Laden)
  const emsGoalEnabled = hasEms ? !!d(`${cm}.goalEnabled`) : false;
  const emsGoalTargetSoc = Number.isFinite(Number(d(`${cm}.goalTargetSocPct`))) ? Math.round(Number(d(`${cm}.goalTargetSocPct`))) : 100;
  const emsGoalFinishTs = Number.isFinite(Number(d(`${cm}.goalFinishTs`))) ? Math.round(Number(d(`${cm}.goalFinishTs`))) : 0;
  const emsGoalBatteryKwh = Number.isFinite(Number(d(`${cm}.goalBatteryKwh`))) ? Number(d(`${cm}.goalBatteryKwh`)) : 0;
  const emsGoalStatus = String(d(`${cm}.goalStatus`) || '');
  const emsGoalActive = hasEms ? !!d(`${cm}.goalActive`) : false;
  const emsGoalRemainingMin = Number.isFinite(Number(d(`${cm}.goalRemainingMin`))) ? Math.round(Number(d(`${cm}.goalRemainingMin`))) : 0;
  const emsGoalDesiredW = Number.isFinite(Number(d(`${cm}.goalDesiredPowerW`))) ? Math.round(Number(d(`${cm}.goalDesiredPowerW`))) : 0;
  const emsGoalShortfallW = Number.isFinite(Number(d(`${cm}.goalShortfallW`))) ? Math.round(Number(d(`${cm}.goalShortfallW`))) : 0;

  const emsGoalTimeValue = (() => {
    if (!emsGoalFinishTs || emsGoalFinishTs <= 0) return '';
    try {
      const dt = new Date(emsGoalFinishTs);
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch (_e) { return ''; }
  })();

  let emsGoalHint = '';
  if (!emsGoalEnabled) {
    emsGoalHint = 'Aus';
  } else if (emsGoalStatus === 'no_soc') {
    emsGoalHint = 'SoC-Datenpunkt fehlt (Zuordnung im Appcenter prüfen).';
  } else if (emsGoalStatus === 'no_deadline') {
    emsGoalHint = 'Uhrzeit fehlt – bitte setzen.';
  } else if (emsGoalStatus === 'reached') {
    emsGoalHint = `Ziel erreicht (${emsGoalTargetSoc}%).`;
  } else if (emsGoalStatus === 'shortfall') {
    emsGoalHint = `Unterversorgung: ${fmtW(emsGoalShortfallW)} fehlen • Rest ${fmtMin(emsGoalRemainingMin)}.`;
  } else if (emsGoalStatus === 'overdue') {
    emsGoalHint = `Überfällig • Unterversorgung: ${fmtW(emsGoalShortfallW)}.`;
  } else if (emsGoalStatus === 'active' || emsGoalActive) {
    emsGoalHint = `Rest ${fmtMin(emsGoalRemainingMin)} • Ziel ${emsGoalTargetSoc}% • Ø ${fmtW(emsGoalDesiredW)}.`;
  } else {
    emsGoalHint = 'Konfiguriert';
  }

  const stationSafe = emsStationKey ? safeIdPart(emsStationKey) : '';
  const stationRemainingW = stationSafe ? d(`chargingManagement.stations.${stationSafe}.remainingW`) : undefined;
  const stationCapW = stationSafe ? d(`chargingManagement.stations.${stationSafe}.maxPowerW`) : undefined;

  const p = d(`evcs.${i}.powerW`);
  const day = d(`evcs.${i}.energyDayKwh`);
  const tot = d(`evcs.${i}.energyTotalKwh`);
  const st = d(`evcs.${i}.status`);
  const active = d(`evcs.${i}.active`);
  const soc = d(`evcs.${i}.vehicleSoc`);

  const ct = String(emsChargerType ?? m.chargerType ?? '').toUpperCase();
  const ctBadge = (ct === 'DC' || ct === 'AC') ? ct : '';

  const emsUiVal = clampEmsUi(emsModeToUi(emsUserMode ?? 'auto'));
  const effTxt = String(emsEffectiveMode ?? '').trim();
  const effLower = effTxt.toLowerCase();
  const userLower = String(emsUserMode ?? 'auto').trim().toLowerCase();

  const hint = reasonHint(emsReason, emsApplyStatus);
  const allowBoost = (emsAllowBoost !== false);
  const boostDisabled = (!allowBoost && userLower !== 'boost');

  const regBtnAttr = regOff ? 'disabled title="Regelung deaktiviert"' : '';
  const showEff = !!effTxt && ((userLower === 'auto' && effLower !== 'normal') || (userLower !== 'auto' && userLower !== effLower && !(userLower === 'minpv' && effLower === 'minpv')));

  const bq = _boostQueueRank[i] || 0;
  const rfid = rfidLabel(i);

  return `
    <div class="card" style="margin:0">
      <div style="display:grid; gap:10px; padding:12px;">
        ${note ? `<div class="muted" style="opacity:.8">${esc(note)}</div>` : ''}

        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Leistung</span><strong>${fmtW(p)}</strong>
        </div>
        ${hasEms && emsTargetW != null ? `<div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Soll (EMS)</span><strong>${fmtW(emsTargetW)}</strong>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Status</span><strong>${esc(st ?? '--')}</strong>
        </div>
        ${soc != null ? `<div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Fahrzeug SoC</span><strong>${fmtPct(soc)}</strong>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Heute</span><strong>${fmtKwh(day)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Gesamt</span><strong>${fmtKwh(tot)}</strong>
        </div>

        ${rfid ? `<div style="display:flex; justify-content:space-between; gap:12px;">
          <span>RFID</span><strong class="nw-evcs-rfid ${esc(rfid.cls)}" ${rfid.title ? `title="${esc(rfid.title)}"` : ''}>${esc(rfid.text)}</strong>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding-top:6px; border-top:1px solid rgba(255,255,255,.06);">
          <span>Aktiv</span>
          ${canActive ? `
            <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle" data-toggle-for="evcsActive_${i}" title="Ladepunkt aktivieren/deaktivieren">
              <button type="button" data-value="false" class="${active ? '' : 'active'}">Aus</button>
              <button type="button" data-value="true" class="${active ? 'active' : ''}">An</button>
            </div>
            <input type="checkbox" class="nw-toggle-hidden" id="evcsActive_${i}" data-evcs-active="${i}" ${active ? 'checked' : ''}>
          ` : `<strong>${active == null ? '--' : (active ? 'Ja' : 'Nein')}</strong>`}
        </div>

        ${regAvail ? `<div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <span>Regelung</span>
          <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle" data-toggle-for="evcsReg_${i}" title="Regelung aktivieren/deaktivieren">
            <button type="button" data-value="false" class="${regOn ? '' : 'active'}">Aus</button>
            <button type="button" data-value="true" class="${regOn ? 'active' : ''}">An</button>
          </div>
          <input type="checkbox" class="nw-toggle-hidden" id="evcsReg_${i}" data-ems-reg="${i}" ${regOn ? 'checked' : ''}>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <span>Lade‑Modus</span>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
            <div class="nw-evcs-mode">
              <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-4" role="group" aria-label="Lade-Modus">
                <button type="button" class="${emsUiVal === 1 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="auto" ${regBtnAttr}>Auto</button>
                <button type="button" class="${emsUiVal === 2 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="boost" ${regBtnAttr} ${boostDisabled ? 'disabled title="Boost für diesen Ladepunkt nicht erlaubt"' : ''}>Boost</button>
                <button type="button" class="${emsUiVal === 3 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="minpv" ${regBtnAttr}>Min+PV</button>
                <button type="button" class="${emsUiVal === 4 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="pv" ${regBtnAttr}>PV</button>
              </div>
            </div>

            ${showEff ? `<div class="muted" style="font-size:12px; opacity:.85">Effektiv: ${esc(effTxt)}</div>` : ''}
            ${regOff ? `<div class="nw-hint nw-hint-warn">Regelung aus – Automatik inaktiv.</div>` : ''}
            ${hint ? `<div class="nw-hint nw-hint-${hint.level}">${esc(hint.text)}</div>` : ''}
          </div>
        </div>

        <!-- Ziel-Laden (Depot-/Zeit-Ziel) -->
        <div style="margin-top:4px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06);">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span>Ziel‑Laden</span>
            <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle" data-toggle-for="emsGoalEn_${i}">
              <button type="button" data-value="false" class="${!emsGoalEnabled ? 'active' : ''}">Aus</button>
              <button type="button" data-value="true" class="${emsGoalEnabled ? 'active' : ''}">An</button>
            </div>
            <input type="checkbox" class="nw-toggle-hidden" id="emsGoalEn_${i}" data-ems-goal-enabled="${i}" ${emsGoalEnabled ? 'checked' : ''}>
          </div>

          ${emsGoalEnabled ? `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
              <div>
                <div class="muted" style="font-size:12px; opacity:.85; margin-bottom:4px;">Ziel SoC (%)</div>
                <input class="nw-input" type="number" min="0" max="100" step="1" data-ems-goal-soc="${i}" value="${emsGoalTargetSoc}">
              </div>
              <div>
                <div class="muted" style="font-size:12px; opacity:.85; margin-bottom:4px;">Fertig um</div>
                <input class="nw-input" type="time" data-ems-goal-time="${i}" value="${emsGoalTimeValue}">
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:8px;">
              <span class="muted" style="font-size:12px; opacity:.85;">Akkukapazität (kWh)</span>
              <input class="nw-input" style="max-width:140px; text-align:right;" type="number" min="0" max="2000" step="0.1" data-ems-goal-kwh="${i}" value="${emsGoalBatteryKwh > 0 ? emsGoalBatteryKwh : ''}" placeholder="auto">
            </div>

            <div class="muted" style="font-size:12px; opacity:.85; margin-top:6px;">${esc(emsGoalHint)}</div>
          ` : `
            <div class="muted" style="font-size:12px; opacity:.85; margin-top:6px;">
              Optional: Ziel-SoC + Uhrzeit setzen (Depot-/Zeit‑Ziel‑Laden).
            </div>
          `}
        </div>

        ${hasEms && (String(emsUserMode || '').toLowerCase() === 'boost' || emsBoostActive === true) ? `
          <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;">
            <span>Boost</span>
            <strong title="Boost endet ${fmtClock(emsBoostUntil) ? ('um ' + fmtClock(emsBoostUntil)) : ''} • Timeout ${fmtMin(emsBoostTimeoutMin)}">
              ${emsBoostActive ? `Aktiv (${fmtMin(emsBoostRemainingMin)})` : `Aktivierung wartet`}
              ${bq ? ` <span class="muted" style="font-weight:600; opacity:.85">#${bq}</span>` : ''}
            </strong>
          </div>
        ` : ''}

        ${hasEms && emsStationKey ? `
          <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;">
            <span>Station</span>
            <strong title="Station-Limit: ${fmtW(emsStationMaxW || stationCapW)} • Verfügbar: ${fmtW(stationRemainingW)}">
              ${esc(emsStationKey)}${stationCapW ? ` (${fmtW(stationCapW)})` : (emsStationMaxW ? ` (${fmtW(emsStationMaxW)})` : '')}
            </strong>
          </div>
        ` : ''}

        ${ctBadge ? `<div class="muted" style="font-size:12px; opacity:.85; margin-top:8px;">Connector: ${esc(ctBadge)}</div>` : ''}
      </div>
    </div>
  `;
}

// --- Render ------------------------------------------------------------------
function render() {
  const list = document.getElementById('evcsList');
  if (!list) return;

  const sc = (cfg && cfg.settingsConfig) || {};
  const count = Number(sc.evcsCount) || 1;
  const meta = Array.isArray(sc.evcsList) ? sc.evcsList : [];

  _evcsCount = count;
  _evcsMeta = meta;

  _boostQueueRank = _computeBoostQueueRank(count);

  const hasEms = _hasEms();

  // Aggregate tile (always show)
  const totalP = d('evcs.totalPowerW');
  let chargingCount = 0;
  for (let i = 1; i <= count; i++) {
    const p = Number(d(`evcs.${i}.powerW`) || 0);
    if (isFinite(p) && Math.abs(p) >= 80) chargingCount++;
  }

  let html = `
    <div class="nw-tile nw-tile--size-m nw-tile--type-sensor" style="cursor:default">
      <div class="nw-tile__top">
        <div class="nw-tile__icon-circle">Σ</div>
        <div style="flex:1; margin-left:8px; min-width:0;">
          <div class="nw-tile__alias">Gesamt</div>
          <div class="nw-tile__room">${count} Ladepunkte • ${chargingCount} aktiv</div>
        </div>
        <div class="nw-tile__badge">EVCS</div>
      </div>
      <div class="nw-tile__middle">
        <div class="nw-tile__value">${fmtW(totalP)}</div>
        <div class="nw-tile__unit">Leistung</div>
      </div>
      <div class="nw-tile__bottom">
        <span class="muted">Übersicht</span>
        <span class="muted">${hasEms ? 'EMS aktiv' : 'Monitoring'}</span>
      </div>
    </div>
  `;

  for (let i = 1; i <= count; i++) {
    const m = meta[i - 1] || {};
    const name = m.name || ('Ladepunkt ' + i);

    const cm = `chargingManagement.wallboxes.lp${i}`;
    const powerW = d(`evcs.${i}.powerW`);
    const soc = d(`evcs.${i}.vehicleSoc`);
    const status = d(`evcs.${i}.status`);
    const active = d(`evcs.${i}.active`);

    const regEnabled = hasEms ? d(`${cm}.userEnabled`) : null;
    const emsReason = hasEms ? d(`${cm}.reason`) : null;

    const emsUserMode = hasEms ? d(`${cm}.userMode`) : null;
    const emsChargerType = hasEms ? d(`${cm}.chargerType`) : null;
    const ct = String(emsChargerType ?? m.chargerType ?? '').toUpperCase();
    const ctBadge = (ct === 'DC' || ct === 'AC') ? ct : '';

    const badge = ctBadge || _modeBadge(emsUserMode) || 'EV';
    const statusTxt = _shortStatusText(status, emsReason);

    const tileCls = _tileStateClass({ powerW, reason: emsReason, active, regEnabled });

    const socTxt = (soc != null) ? ('SoC ' + fmtPct(soc)) : 'SoC --';
    const modeTxt = hasEms ? (_modeBadge(emsUserMode) || 'AUTO') : '—';

    html += `
      <div class="nw-tile nw-tile--size-m ${tileCls}" style="cursor:pointer" data-evcs-tile="${i}" tabindex="0" role="button" aria-label="${esc(name)}">
        <div class="nw-tile__top">
          <div class="nw-tile__icon-circle">⚡</div>
          <div style="flex:1; margin-left:8px; min-width:0;">
            <div class="nw-tile__alias" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(name)}</div>
            <div class="nw-tile__room" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(statusTxt)}</div>
          </div>
          <div class="nw-tile__badge">${esc(badge)}</div>
        </div>

        <div class="nw-tile__middle">
          <div class="nw-tile__value">${fmtW(powerW)}</div>
          <div class="nw-tile__unit">${soc != null ? 'Leistung' : 'Leistung'}</div>
        </div>

        <div class="nw-tile__bottom">
          <span>${esc(socTxt)}</span>
          <span>${esc(modeTxt)}</span>
        </div>
      </div>
    `;
  }

  list.innerHTML = html;

  // Keep modal content updated, but never rebuild while the user interacts (esp. time picker).
  if (_modalOpenIdx > 0) {
    const modal = document.getElementById('evcsModal');
    const body = document.getElementById('evcsModalBody');
    const sub = document.getElementById('evcsModalSubTitle');

    if (modal && !modal.classList.contains('hidden')) {
      // subtitle update is safe (does not replace inputs)
      try {
        const i = _modalOpenIdx;
        const p = d(`evcs.${i}.powerW`);
        const soc = d(`evcs.${i}.vehicleSoc`);
        const st = d(`evcs.${i}.status`);
        if (sub) {
          const parts = [];
          parts.push('Leistung: ' + fmtW(p));
          if (soc != null) parts.push('SoC: ' + fmtPct(soc));
          if (st != null) parts.push(String(st));
          sub.textContent = parts.join(' • ');
        }
      } catch (_e) {}

      if (body) {
        if (!_isModalLocked(modal)) {
          // re-render modal body for live updates (safe when not interacting)
          body.innerHTML = buildEvcsModalBodyHtml(_modalOpenIdx);

          // If a retry was scheduled while the user was interacting, drop it.
          try {
            if (_modalRerenderTimer) {
              clearTimeout(_modalRerenderTimer);
              _modalRerenderTimer = null;
            }
          } catch (_e) {}
        } else {
          // While locked we skip DOM replacement. Ensure we refresh right after the
          // lock window expires (otherwise users would need to close/reopen).
          const now = Date.now();
          const delay = (_modalInteractionUntil > now) ? (_modalInteractionUntil - now + 80) : 320;
          _scheduleModalRerenderRetry(delay);
        }
      }
    }
  }
}

// --- Menu --------------------------------------------------------------------
function initMenu() {
  const btn = document.getElementById('menuBtn');
  const dd = document.getElementById('menuDropdown');
  if (btn && dd) {
    btn.addEventListener('click', (e) => { e.preventDefault(); dd.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target) && e.target !== btn) dd.classList.add('hidden'); });
  }
}

// --- Controls (tiles + modal) ------------------------------------------------
function bindControls() {
  const list = document.getElementById('evcsList');
  const modal = document.getElementById('evcsModal');
  const closeBtn = document.getElementById('evcsModalClose');

  if (list) {
    list.addEventListener('click', (e) => {
      const tile = e.target && e.target.closest ? e.target.closest('.nw-tile[data-evcs-tile]') : null;
      if (!tile) return;
      const idx = Number(tile.getAttribute('data-evcs-tile'));
      openEvcsModal(idx);
    });

    list.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tile = e.target && e.target.closest ? e.target.closest('.nw-tile[data-evcs-tile]') : null;
      if (!tile) return;
      try { e.preventDefault(); } catch (_e) {}
      const idx = Number(tile.getAttribute('data-evcs-tile'));
      openEvcsModal(idx);
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => closeEvcsModal());
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeEvcsModal();
    });
    // Lock modal during interactions to keep native pickers stable (especially <input type="time">).
    // Note: On some mobile browsers (iOS Safari) pointer events for native pickers are unreliable.
    // Therefore we also listen to touchstart/mousedown in capture phase.
    const bumpLock = (ev) => {
      try {
        const t = ev && ev.target;
        if (!t) return;
        // Only apply if the event is inside the modal.
        const m = document.getElementById('evcsModal');
        if (!m || !m.contains(t)) return;

        const tag = String(t.tagName || '').toUpperCase();
        const type = (tag === 'INPUT') ? String(t.type || '').toLowerCase() : '';

        const isTime = (tag === 'INPUT') && (type === 'time' || type === 'datetime-local');
        const isToggleBtn = (tag === 'BUTTON') && !!(t.closest && t.closest('.nw-toggle'));
        const isModeBtn = (tag === 'BUTTON') && !!(t.closest && t.closest('.nw-evcs-mode-buttons'));

        const isTextLikeInput = (tag === 'INPUT') && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
        const isEdit = isTextLikeInput || tag === 'SELECT' || tag === 'TEXTAREA';

        // Keep native pickers stable, but keep toggles snappy.
        if (isTime) _touchModalInteraction(20000);
        else if (isToggleBtn || isModeBtn) _touchModalInteraction(450);
        else if (isEdit) _touchModalInteraction(8000);
        else if (tag === 'BUTTON') _touchModalInteraction(1200);
        else _touchModalInteraction(2500);
      } catch (_e) {
        _touchModalInteraction(2500);
      }
    };
    modal.addEventListener('pointerdown', bumpLock, { passive: true, capture: true });
    modal.addEventListener('mousedown', bumpLock, { capture: true });
    modal.addEventListener('touchstart', bumpLock, { passive: true, capture: true });
    modal.addEventListener('focusin', (ev) => {
      _modalLocked = true;
      try {
        const t = ev && ev.target;
        const tag = String(t && t.tagName || '').toUpperCase();
        const type = (tag === 'INPUT') ? String(t.type || '').toLowerCase() : '';
        const isTime = (tag === 'INPUT') && (type === 'time' || type === 'datetime-local');
        const isTextLikeInput = (tag === 'INPUT') && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
        const isEdit = isTextLikeInput || tag === 'SELECT' || tag === 'TEXTAREA';
        // Long for native time picker, medium for free-text inputs, short otherwise.
        _touchModalInteraction(isTime ? 20000 : (isEdit ? 8000 : 1500));
      } catch (_e) {
        _touchModalInteraction(1500);
      }
    });
    modal.addEventListener('focusout', () => {
      _touchModalInteraction(2000);
      setTimeout(() => {
        try {
          const m = document.getElementById('evcsModal');
          if (m && m.contains(document.activeElement)) return;
        } catch (_e) {}
        _modalLocked = false;
      }, 80);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = document.getElementById('evcsModal');
    if (m && !m.classList.contains('hidden')) closeEvcsModal();
  });

  // Toggle-Buttons (An/Aus) steuern versteckte Checkbox-Inputs
  document.addEventListener('click', (e) => {
    const btn = e && e.target && e.target.closest ? e.target.closest('.nw-toggle button[data-value]') : null;
    if (!btn) return;

    const grp = btn.closest('.nw-toggle');
    const targetId = grp ? grp.getAttribute('data-toggle-for') : null;
    if (!targetId) return;

    const inp = document.getElementById(targetId);
    if (!inp || inp.disabled) return;

    const raw = String(btn.getAttribute('data-value') || '').trim().toLowerCase();
    const desired = (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'ja');

    if (!!inp.checked !== desired) {
      inp.checked = desired;
      try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
    }

    // Visual sync
    try {
      const bs = Array.from(grp.querySelectorAll('button[data-value]'));
      bs.forEach(b => {
        const v = String(b.getAttribute('data-value') || '').trim().toLowerCase();
        const isTrue = (v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja');
        b.classList.toggle('active', desired ? isTrue : !isTrue);
      });
    } catch (_e) {}
  }, true);

  // Input changes (Active/Regelung/Ziel-Laden Werte)
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (!t) return;

    // Legacy: direct wallbox datapoint
    if (t.matches('input[type="checkbox"][data-evcs-active]')) {
      const idx = Number(t.getAttribute('data-evcs-active'));

      // Optimistisch im UI aktualisieren
      try { state[`evcs.${idx}.active`] = { value: !!t.checked, ts: Date.now() }; } catch (_e) {}
      scheduleRender();

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'evcs', key: `${idx}.active`, value: !!t.checked })
        });
      } catch (_e) {}
      return;
    }

    // EMS: enable/disable regulation per chargepoint
    if (t.matches('input[type="checkbox"][data-ems-reg]')) {
      const idx = Number(t.getAttribute('data-ems-reg'));
      const b = !!t.checked;
      const k = `chargingManagement.wallboxes.lp${idx}.userEnabled`;

      try {
        _setPendingWrite(k, b, 1800);
        state[k] = { value: b, ts: Date.now() };
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.regEnabled`, value: b })
        });
      } catch (_e) {}
      return;
    }

    // EMS: Ziel-Laden enable
    if (t.matches('input[type="checkbox"][data-ems-goal-enabled]')) {
      const idx = Number(t.getAttribute('data-ems-goal-enabled'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const b = !!t.checked;
      const k = `chargingManagement.wallboxes.lp${idx}.goalEnabled`;

      _setPendingWrite(k, b, 2000);
      state[k] = { value: b, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalEnabled`, value: b })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, b), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }

    // Ziel-SoC
    if (t.matches('input[data-ems-goal-soc]')) {
      const idx = Number(t.getAttribute('data-ems-goal-soc'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const n = Number(t.value);
      if (!Number.isFinite(n)) return;

      const v = Math.max(0, Math.min(100, Math.round(n)));
      const k = `chargingManagement.wallboxes.lp${idx}.goalTargetSocPct`;

      _setPendingWrite(k, v, 2500);
      state[k] = { value: v, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalTargetSocPct`, value: v })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, v), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }

    // Ziel-Uhrzeit
    if (t.matches('input[type="time"][data-ems-goal-time]')) {
      const idx = Number(t.getAttribute('data-ems-goal-time'));
      if (!Number.isFinite(idx) || idx <= 0) return;

      const ts = nextTsFromTimeInput(t.value);
      const k = `chargingManagement.wallboxes.lp${idx}.goalFinishTs`;

      _setPendingWrite(k, ts, 2500);
      state[k] = { value: ts, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalFinishTs`, value: ts })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, ts), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }

    // Batterie kWh
    if (t.matches('input[data-ems-goal-kwh]')) {
      const idx = Number(t.getAttribute('data-ems-goal-kwh'));
      if (!Number.isFinite(idx) || idx <= 0) return;

      const n = Number(t.value);
      const v = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n * 10) / 10)) : 0;
      const k = `chargingManagement.wallboxes.lp${idx}.goalBatteryKwh`;

      _setPendingWrite(k, v, 2500);
      state[k] = { value: v, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalBatteryKwh`, value: v })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, v), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }
  });

  // Mode buttons (EMS)
  // Trigger on pointerdown to avoid lost clicks during SSE renders.
  let _ignoreClickUntil = 0;

  function _syncModeButtonsUi(idx, mode) {
    try {
      const m = String(mode || 'auto').trim().toLowerCase();
      const bs = Array.from(document.querySelectorAll(`button[data-ems-mode-btn="${idx}"]`));
      bs.forEach(b => {
        let bm = String(b.getAttribute('data-mode') || 'auto').trim().toLowerCase();
        if (bm === 'min+pv') bm = 'minpv';
        b.classList.toggle('active', bm === m);
      });
    } catch (_e) {}
  }

  async function handleModeButton(btn) {
    if (!btn) return;

    if (btn.matches('button[data-ems-mode-btn]')) {
      const idx = Number(btn.getAttribute('data-ems-mode-btn'));
      let mode = String(btn.getAttribute('data-mode') || 'auto').trim().toLowerCase();
      if (mode === 'min+pv') mode = 'minpv';
      if (!['auto', 'boost', 'minpv', 'pv'].includes(mode)) mode = 'auto';

      // UX: allow manual boost cancel by clicking the active Boost button again.
      try {
        let cur = String(d(`chargingManagement.wallboxes.lp${idx}.userMode`) ?? 'auto').trim().toLowerCase();
        if (cur === 'min+pv') cur = 'minpv';
        if (!['auto', 'boost', 'minpv', 'pv'].includes(cur)) cur = 'auto';
        if (mode === 'boost' && cur === 'boost') mode = 'auto';
      } catch (_e) {}

      const k = `chargingManagement.wallboxes.lp${idx}.userMode`;
      try {
        _setPendingWrite(k, mode, 1800);
        state[k] = { value: mode, ts: Date.now() };
        _syncModeButtonsUi(idx, mode);
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.userMode`, value: mode })
        });
      } catch (_e) {}

      return;
    }
  }

  document.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn]');
    if (!btn) return;
    _ignoreClickUntil = Date.now() + 450;
    try { e.preventDefault(); } catch (_e) {}
    _touchModalInteraction(600);
    handleModeButton(btn);
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn]');
    if (!btn) return;
    try { e.preventDefault(); } catch (_e) {}
    _touchModalInteraction(600);
    handleModeButton(btn);
  });

  document.addEventListener('click', (e) => {
    if (Date.now() < _ignoreClickUntil) return;
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn]');
    if (!btn) return;
    _touchModalInteraction(600);
    handleModeButton(btn);
  });
}

// --- Boot --------------------------------------------------------------------
async function bootstrap() {
  initMenu();
  bindControls();

  try {
    cfg = await fetch('/config').then(r => r.json());
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
  } catch (_e) {}

  try {
    state = await fetch('/api/state').then(r => r.json());
  } catch (_e) {
    state = {};
  }

  scheduleRender();

  // live updates
  try {
    const es = new EventSource('/events');
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' && msg.payload) {
          state = msg.payload;
          scheduleRender();
          return;
        }
        if (msg.type === 'update' && msg.payload) {
          _mergeUpdatePayload(msg.payload);
          if (_isEvcsRelevantPayload(msg.payload) || _modalOpenIdx > 0) {
            scheduleRender();
          }
        }
      } catch (_e) {}
    };
  } catch (_e) {}
}

document.addEventListener('DOMContentLoaded', bootstrap);
