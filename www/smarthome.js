// NexoWatt SmartHome – A3: Switch-Kachel mit neuem Modell

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
    if (typeof vinfo.progressValue === 'number') {
      progress = document.createElement('div');
      progress.className = 'nw-tile__progress';
      const bar = document.createElement('div');
      bar.className = 'nw-tile__progress-bar';
      bar.style.width = Math.max(0, Math.min(100, vinfo.progressValue)) + '%';
      progress.appendChild(bar);
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
    tile.appendChild(bottom);

    tile.addEventListener('click', async () => {
      const beh = dev.behavior || {};
      if (beh.readOnly) return;
      if (dev.type !== 'switch') return;
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
    return st.active ? 'nw-tile--state-on' : 'nw-tile--state-off';
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
    }
    unitText = ui.unit || '';
  }

  return { valueText, unitText, progressValue };
}

async function nwReloadDevices() {
  try {
    const devices = await nwFetchDevices();
    nwRenderTiles(devices);
  } catch (e) {
    console.error('SmartHome reload error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  nwReloadDevices();
});
