// NexoWatt SmartHome – A3: Switch-Kachel mit neuem Modell

let nwAllDevices = [];
let nwLastDevicesSignature = '';
let nwReloadInFlight = false;
let nwAutoRefreshTimer = null;
const nwFilterState = {
  room: null,
  func: null,
  favorite: null,
};

function nwGetFilteredDevices() {
  if (!Array.isArray(nwAllDevices) || !nwAllDevices.length) return [];
  return nwAllDevices.filter(dev => {
    if (!dev) return false;
    const roomMatch = !nwFilterState.room || (dev.room === nwFilterState.room);
    const funcMatch = !nwFilterState.func || (dev.function === nwFilterState.func);
    const favMatch = !nwFilterState.favorite || (dev.behavior && dev.behavior.favorite);
    return roomMatch && funcMatch && favMatch;
  });
}

function nwRenderRoomTabs(devices) {
  const tabsContainer = document.getElementById('nw-tabs-rooms');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = '';

  if (!devices || !devices.length) return;

  const rooms = Array.from(new Set(
    devices
      .map(d => d && d.room)
      .filter(Boolean)
  ));

  const hasFavorites = devices.some(d => d && d.behavior && d.behavior.favorite);

  const createTab = (label, active, onClick) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'nw-tab' + (active ? ' nw-tab--active' : '');
    tab.textContent = label;
    tab.addEventListener('click', onClick);
    return tab;
  };

  // Favoriten-Tab nur anzeigen, wenn es mindestens ein Favorit-Device gibt
  if (hasFavorites) {
    tabsContainer.appendChild(
      createTab('★ Favoriten', !!nwFilterState.favorite, () => {
        // Toggle: Favoriten an/aus, Raum-Filter zurücksetzen
        nwFilterState.favorite = nwFilterState.favorite ? null : true;
        if (nwFilterState.favorite) {
          nwFilterState.room = null;
        }
        nwApplyFiltersAndRender();
      })
    );
  }

  // "Alle Räume" Tab
  tabsContainer.appendChild(
    createTab('Alle Räume', !nwFilterState.room && !nwFilterState.favorite, () => {
      nwFilterState.room = null;
      nwFilterState.favorite = null;
      nwApplyFiltersAndRender();
    })
  );

  rooms.forEach(roomName => {
    tabsContainer.appendChild(
      createTab(roomName, nwFilterState.room === roomName && !nwFilterState.favorite, () => {
        nwFilterState.favorite = null;
        nwFilterState.room = (nwFilterState.room === roomName) ? null : roomName;
        nwApplyFiltersAndRender();
      })
    );
  });
}

function nwRenderFilterChips(devices) {
  const roomsContainer = document.getElementById('nw-filter-rooms');
  const funcsContainer = document.getElementById('nw-filter-functions');
  if (roomsContainer) {
    roomsContainer.innerHTML = '';
  }
  if (!funcsContainer) return;

  funcsContainer.innerHTML = '';

  if (!devices || !devices.length) return;

  const funcs = Array.from(new Set(
    devices
      .map(d => d && d.function)
      .filter(Boolean)
  ));

  const createChip = (label, active, onClick) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'nw-filter-chip' + (active ? ' nw-filter-chip--active' : '');
    chip.textContent = label;
    chip.addEventListener('click', onClick);
    return chip;
  };

  // Funktionen: "Alle" + einzelne Funktionen
  funcsContainer.appendChild(
    createChip('Alle', !nwFilterState.func, () => {
      nwFilterState.func = null;
      nwApplyFiltersAndRender();
    })
  );

  funcs.forEach(fnName => {
    funcsContainer.appendChild(
      createChip(fnName, nwFilterState.func === fnName, () => {
        nwFilterState.func = (nwFilterState.func === fnName) ? null : fnName;
        nwApplyFiltersAndRender();
      })
    );
  });
}

function nwApplyFiltersAndRender() {
  const devices = nwGetFilteredDevices();
  nwRenderRoomTabs(nwAllDevices);
  nwRenderFilterChips(nwAllDevices);
  nwRenderTiles(devices);
}




async function nwFetchDevices() {
  const res = await fetch('/api/smarthome/devices', { cache: 'no-store' });
  if (!res.ok) {
    console.error('SmartHome devices fetch failed:', res.status, res.statusText);
    return [];
  }
  const data = await res.json().catch(() => ({}));
  if (!data || !data.ok || !Array.isArray(data.devices)) return [];
  return data.devices;
}

async function nwToggleDevice(id) {
  try {
    const res = await fetch('/api/smarthome/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) {
      console.error('SmartHome toggle failed:', res.status, res.statusText);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok) {
      console.error('SmartHome toggle failed (payload)', data);
      return null;
    }
    return data.state || null;
  } catch (e) {
    console.error('SmartHome toggle error:', e);
    return null;
  }
}



async function nwSetLevel(id, level) {
  try {
    const res = await fetch('/api/smarthome/level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, level }),
    });
    if (!res.ok) {
      console.error('SmartHome level request failed:', res.status, res.statusText);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok) {
      console.error('SmartHome level failed (payload)', data);
      return null;
    }
    return data.state || null;
  } catch (e) {
    console.error('SmartHome level error:', e);
    return null;
  }
}

async function nwSetRtrSetpoint(id, setpoint) {
  try {
    const res = await fetch('/api/smarthome/rtrSetpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, setpoint }),
    });
    if (!res.ok) {
      console.error('SmartHome RTR setpoint request failed:', res.status, res.statusText);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok) {
      console.error('SmartHome RTR setpoint failed (payload)', data);
      return null;
    }
    return data.state || null;
  } catch (e) {
    console.error('SmartHome RTR setpoint error:', e);
    return null;
  }
}

async function nwAdjustRtrSetpoint(dev, delta) {
  if (!dev || dev.type !== 'rtr') return;
  const io = dev.io || {};
  const cl = io.climate || {};
  if (!cl.setpointId) {
    console.warn('RTR device has no setpointId:', dev.id);
    return;
  }

  const st = dev.state || {};
  let base;
  if (typeof st.setpoint === 'number') {
    base = st.setpoint;
  } else if (typeof st.currentTemp === 'number') {
    base = st.currentTemp;
  } else {
    const min0 = typeof cl.minSetpoint === 'number' ? cl.minSetpoint : 15;
    const max0 = typeof cl.maxSetpoint === 'number' ? cl.maxSetpoint : 30;
    base = (min0 + max0) / 2;
  }

  let target = base + delta;
  const min = typeof cl.minSetpoint === 'number' ? cl.minSetpoint : 15;
  const max = typeof cl.maxSetpoint === 'number' ? cl.maxSetpoint : 30;
  if (target < min) target = min;
  if (target > max) target = max;

  const state = await nwSetRtrSetpoint(dev.id, target);
  if (!state) return;
  dev.state = Object.assign({}, dev.state || {}, state);
  await nwReloadDevices();
}




async function nwCoverAction(id, action) {
  try {
    const res = await fetch('/api/smarthome/cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) {
      console.error('SmartHome cover request failed:', res.status, res.statusText);
      return false;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok) {
      console.error('SmartHome cover failed (payload)', data);
      return false;
    }
    return true;
  } catch (e) {
    console.error('SmartHome cover error:', e);
    return false;
  }
}

function nwShowEmptyState(show) {
  const empty = document.getElementById('nw-smarthome-empty');
  if (!empty) return;
  empty.style.display = show ? 'block' : 'none';
}

function nwRenderTiles(devices) {
  const grid = document.getElementById('nw-tiles-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!devices.length) {
    nwShowEmptyState(true);
    return;
  }
  nwShowEmptyState(false);

  devices.forEach((dev) => {
    const tile = document.createElement('div');
    tile.classList.add('nw-tile');

    const size = (dev.ui && dev.ui.size) || 'm';
    tile.classList.add('nw-tile--size-' + size);
    tile.classList.add('nw-tile--type-' + (dev.type || 'generic'));

    if (dev.behavior && dev.behavior.favorite) {
      tile.classList.add('nw-tile--favorite');
    }

    const stateClass = nwGetStateClass(dev);
    if (stateClass) tile.classList.add(stateClass);

    const top = document.createElement('div');
    top.className = 'nw-tile__top';

    const iconCircle = document.createElement('div');
    iconCircle.className = 'nw-tile__icon-circle';
    const iconSpan = document.createElement('span');
    iconSpan.textContent = dev.icon || '□';
    iconCircle.appendChild(iconSpan);
    top.appendChild(iconCircle);

    const badge = nwCreateBadge(dev);
    top.appendChild(badge || document.createElement('div'));

    const middle = document.createElement('div');
    middle.className = 'nw-tile__middle';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'nw-tile__value';
    const unitSpan = document.createElement('span');
    unitSpan.className = 'nw-tile__unit';

    const vinfo = nwGetValueAndProgress(dev);
    valueSpan.textContent = vinfo.valueText;
    unitSpan.textContent = vinfo.unitText;

    if (vinfo.valueText) middle.appendChild(valueSpan);
    if (vinfo.unitText) middle.appendChild(unitSpan);

    let progress;
    let slider;
    if (typeof vinfo.progressValue === 'number') {
      progress = document.createElement('div');
      progress.className = 'nw-tile__progress';
      const bar = document.createElement('div');
      bar.className = 'nw-tile__progress-bar';
      bar.style.width = Math.max(0, Math.min(100, vinfo.progressValue)) + '%';
      progress.appendChild(bar);

      // Dimmer-Slider nur für Dimmer-Geräte anzeigen
      if (dev.type === 'dimmer') {
        slider = document.createElement('input');
        slider.type = 'range';
        const lvlCfg = (dev.io && dev.io.level) || {};
        const min = typeof lvlCfg.min === 'number' ? lvlCfg.min : 0;
        const max = typeof lvlCfg.max === 'number' ? lvlCfg.max : 100;
        slider.min = String(min);
        slider.max = String(max);
        slider.value = String(typeof dev.state === 'object' && dev.state && typeof dev.state.level === 'number'
          ? dev.state.level
          : vinfo.progressValue);
        slider.className = 'nw-dimmer-slider';

        // Tile-Klick beim Schieben des Sliders verhindern
        const stop = (ev) => {
          ev.stopPropagation();
        };
        slider.addEventListener('mousedown', stop);
        slider.addEventListener('touchstart', stop);
        slider.addEventListener('click', stop);

        slider.addEventListener('change', async (ev) => {
          const beh = dev.behavior || {};
          if (beh.readOnly) return;
          const raw = Number(ev.target.value);
          if (!Number.isFinite(raw)) return;
          const newState = await nwSetLevel(dev.id, raw);
          if (!newState) return;
          dev.state = Object.assign({}, dev.state || {}, newState);
          await nwReloadDevices();
        });
      }
    }

    const bottom = document.createElement('div');
    bottom.className = 'nw-tile__bottom';

    const aliasSpan = document.createElement('span');
    aliasSpan.className = 'nw-tile__alias';
    aliasSpan.textContent = dev.alias || dev.id;

    const roomSpan = document.createElement('span');
    roomSpan.className = 'nw-tile__room';
    const showRoom = !dev.ui || typeof dev.ui.showRoom === 'undefined' ? true : !!dev.ui.showRoom;
    roomSpan.textContent = showRoom ? (dev.room || '') : '';

    bottom.appendChild(aliasSpan);
    bottom.appendChild(roomSpan);

    tile.appendChild(top);
    tile.appendChild(middle);
    if (progress) tile.appendChild(progress);
    if (slider) tile.appendChild(slider);
    
if (dev.type === 'blind') {
      const controls = document.createElement('div');
      controls.className = 'nw-tile__controls';

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'nw-tile__control-btn nw-tile__control-btn--up';
      btnUp.textContent = '▲';

      const btnStop = document.createElement('button');
      btnStop.type = 'button';
      btnStop.className = 'nw-tile__control-btn nw-tile__control-btn--stop';
      btnStop.textContent = '■';

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'nw-tile__control-btn nw-tile__control-btn--down';
      btnDown.textContent = '▼';

      const stopPropagation = (ev) => ev.stopPropagation();
      btnUp.addEventListener('click', stopPropagation);
      btnStop.addEventListener('click', stopPropagation);
      btnDown.addEventListener('click', stopPropagation);

      btnUp.addEventListener('click', async () => {
        const ok = await nwCoverAction(dev.id, 'up');
        if (!ok) return;
      });
      btnStop.addEventListener('click', async () => {
        const ok = await nwCoverAction(dev.id, 'stop');
        if (!ok) return;
      });
      btnDown.addEventListener('click', async () => {
        const ok = await nwCoverAction(dev.id, 'down');
        if (!ok) return;
      });

      controls.appendChild(btnUp);
      controls.appendChild(btnStop);
      controls.appendChild(btnDown);
      tile.appendChild(controls);
    } else if (dev.type === 'rtr' && dev.io && dev.io.climate && dev.io.climate.setpointId) {
      const cl = dev.io.climate;
      const controls = document.createElement('div');
      controls.className = 'nw-tile__controls nw-tile__controls--rtr';

      const btnMinus = document.createElement('button');
      btnMinus.type = 'button';
      btnMinus.className = 'nw-tile__control-btn nw-tile__control-btn--rtr-minus';
      btnMinus.textContent = '−';

      const center = document.createElement('div');
      center.className = 'nw-tile__rtr-center';

      const spSpan = document.createElement('span');
      spSpan.className = 'nw-tile__rtr-setpoint';

      const st = dev.state || {};
      const ui = dev.ui || {};
      const min = typeof cl.minSetpoint === 'number' ? cl.minSetpoint : 15;
      const max = typeof cl.maxSetpoint === 'number' ? cl.maxSetpoint : 30;

      if (typeof st.setpoint === 'number') {
        const prec = typeof ui.precision === 'number' ? ui.precision : 1;
        spSpan.textContent = 'Soll ' + st.setpoint.toFixed(prec).replace('.', ',') + '°C';
      } else {
        spSpan.textContent = 'Soll ' + min + '–' + max + '°C';
      }

      center.appendChild(spSpan);

      const btnPlus = document.createElement('button');
      btnPlus.type = 'button';
      btnPlus.className = 'nw-tile__control-btn nw-tile__control-btn--rtr-plus';
      btnPlus.textContent = '+';

      const stopPropagation2 = (ev) => ev.stopPropagation();
      btnMinus.addEventListener('click', stopPropagation2);
      btnPlus.addEventListener('click', stopPropagation2);

      btnMinus.addEventListener('click', async () => {
        const beh = dev.behavior || {};
        if (beh.readOnly) return;
        await nwAdjustRtrSetpoint(dev, -0.5);
      });

      btnPlus.addEventListener('click', async () => {
        const beh = dev.behavior || {};
        if (beh.readOnly) return;
        await nwAdjustRtrSetpoint(dev, 0.5);
      });

      controls.appendChild(btnMinus);
      controls.appendChild(center);
      controls.appendChild(btnPlus);
      tile.appendChild(controls);
    }
    tile.appendChild(bottom);

    tile.addEventListener('click', async () => {
      const beh = dev.behavior || {};
      if (beh.readOnly) return;
      // Switch, Dimmer und Szenen per Tile-Tap toggeln
      if (dev.type !== 'switch' && dev.type !== 'dimmer' && dev.type !== 'scene') return;
      const newState = await nwToggleDevice(dev.id);
      if (!newState) return;
      dev.state = Object.assign({}, dev.state || {}, newState);
      // Nach dem Toggle alle Geräte neu laden, damit UI konsistent bleibt
      await nwReloadDevices();
    });

    grid.appendChild(tile);
  });
}

function nwGetStateClass(dev) {
  const st = dev.state || {};
  if (dev.type === 'switch') {
    return st.on ? 'nw-tile--state-on' : 'nw-tile--state-off';
  }
  if (dev.type === 'scene') {
    const active = (typeof st.active !== 'undefined') ? st.active : !!st.on;
    return active ? 'nw-tile--state-on' : 'nw-tile--state-off';
  }
  if (dev.type === 'dimmer') {
    const lvl = st.level != null ? st.level : 0;
    return lvl > 0 ? 'nw-tile--state-on' : 'nw-tile--state-off';
  }
  if (dev.type === 'rtr') {
    return 'nw-tile--state-on';
  }
  if (dev.type === 'sensor') {
    return 'nw-tile--state-off';
  }
  return 'nw-tile--state-off';
}

function nwCreateBadge(dev) {
  const st = dev.state || {};
  const span = document.createElement('span');
  span.className = 'nw-tile__badge';

  if (dev.type === 'rtr' && st.mode) {
    span.textContent = st.mode;
    span.classList.add('nw-tile__badge--accent');
    return span;
  }
  if (dev.type === 'scene' && st.active) {
    span.textContent = 'AKTIV';
    span.classList.add('nw-tile__badge--accent');
    return span;
  }

  return null;
}


  
  function nwGetValueAndProgress(dev) {
    const st = dev.state || {};
    const ui = dev.ui || {};
    let valueText = '';
    let unitText = ui.unit || '';
    let progressValue = null;

    if (dev.type === 'switch') {
      valueText = st.on ? 'Ein' : 'Aus';
      unitText = '';
    } else if (dev.type === 'scene') {
      const active = (typeof st.active !== 'undefined') ? !!st.active : !!st.on;
      valueText = active ? 'Aktiv' : 'Bereit';
      unitText = '';
    } else if (dev.type === 'dimmer') {
      const lvl = st.level != null ? st.level : 0;
      valueText = String(Math.round(lvl));
      unitText = ui.unit || '%';
      progressValue = lvl;
    } else if (dev.type === 'blind') {
      const pos = st.position != null ? st.position : 0;
      valueText = String(Math.round(pos));
      unitText = ui.unit || '%';
      progressValue = pos;
    } else if (dev.type === 'rtr') {
      if (typeof st.currentTemp === 'number') {
        const prec = typeof ui.precision === 'number' ? ui.precision : 1;
        valueText = st.currentTemp.toFixed(prec);
        unitText = ui.unit || '°C';
      }
    } else if (dev.type === 'sensor') {
      if (typeof st.value === 'number') {
        const prec = typeof ui.precision === 'number' ? ui.precision : 1;
        valueText = st.value.toFixed(prec);
      } else if (typeof st.value !== 'undefined') {
        valueText = String(st.value);
      } else {
        valueText = '—';
      }
      unitText = ui.unit || '';
    }

    return { valueText, unitText, progressValue };
  }


async function nwReloadDevices(opts) {
  // avoid overlapping network requests (prevents UI jitter)
  if (nwReloadInFlight) return;
  nwReloadInFlight = true;
  try {
    const devices = await nwFetchDevices();
    const arr = Array.isArray(devices) ? devices : [];
    const sig = JSON.stringify(arr);
    const force = !!(opts && opts.force);
    if (!force && sig === nwLastDevicesSignature) {
      return;
    }
    nwLastDevicesSignature = sig;
    nwAllDevices = arr;
    nwApplyFiltersAndRender();
  } catch (e) {
    console.error('SmartHome reload error:', e);
  } finally {
    nwReloadInFlight = false;
  }
}

function nwStartAutoRefresh(intervalMs) {
  const ms = (typeof intervalMs === 'number' && intervalMs > 1000) ? intervalMs : 5000;
  if (nwAutoRefreshTimer) return;
  nwAutoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    nwReloadDevices();
  }, ms);
}

function nwStopAutoRefresh() {
  if (!nwAutoRefreshTimer) return;
  try { clearInterval(nwAutoRefreshTimer); } catch (_e) {}
  nwAutoRefreshTimer = null;
}

document.addEventListener('DOMContentLoaded', () => {
  nwReloadDevices({ force: true });
  nwStartAutoRefresh(5000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      nwStopAutoRefresh();
    } else {
      nwReloadDevices({ force: true });
      nwStartAutoRefresh(5000);
    }
  });
});


// Topbar menu + EVCS menu visibility
(function(){
  const btn=document.getElementById('menuBtn');
  const dd=document.getElementById('menuDropdown');
  if(btn && dd){
    btn.addEventListener('click', (e)=>{ e.preventDefault(); dd.classList.toggle('hidden'); });
    document.addEventListener('click', (e)=>{ if(!dd.contains(e.target) && e.target!==btn) dd.classList.add('hidden'); });
  }
  fetch('/config').then(r=>r.json()).then(cfg=>{
    const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    const l=document.getElementById('menuEvcsLink');
    if(l) l.classList.toggle('hidden', c < 2);
      const t=document.getElementById('tabEvcs');
    if(t) t.classList.toggle('hidden', c < 2);
    const n=document.getElementById('nav-evcs');
    if(n) n.classList.toggle('hidden', c < 2);
}).catch(()=>{});
})();
