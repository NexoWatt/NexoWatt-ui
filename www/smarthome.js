/*
  NexoWatt SmartHome VIS
  - Raum-Sektionen (Apple Home ähnlich)
  - Glassmorphism-Kacheln
  - Dynamische Icons (An/Aus)

  NOTE: bewusst ohne externe Icon-Libraries.
*/

let nwAllDevices = [];
let nwLastDevicesSignature = '';
let nwReloadInFlight = false;
let nwAutoRefreshTimer = null;

let nwSmartHomeEnabled = null;
let nwEvcsCount = 1;

const nwFilterState = {
  func: null,        // string | null
  favoritesOnly: false,
};

// ---------- Icons (inline SVG) ----------

const NW_ICON_SVGS = {
  bulb: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4.2 4.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19.8 4.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M3 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },

  plug: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 10l-1 2h2l-1 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },

  thermostat: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 10c0 1.2-1 2.2-2.2 2.2S13.6 11.2 13.6 10c0-1.5 1.2-2.2 2.2-3.6 1 1.4 2.2 2.1 2.2 3.6Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  blinds: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 20v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },

  tv: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 10l4 2-4 2v-4Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  speaker: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M11 5 7 9H4v6h3l4 4V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M11 5 7 9H4v6h3l4 4V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M15 9a3 3 0 0 1 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.5 7a6 6 0 0 1 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      </svg>`,
  },

  fire: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2c2 3 4 4.5 4 7.5S13.8 14 12 14 8 12.5 8 9.5C8 6.8 10 5 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 13.5C6 18 9 22 12 22s6-4 6-8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2c2 3 4 4.5 4 7.5S13.8 14 12 14 8 12.5 8 9.5C8 6.8 10 5 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 13.5C6 18 9 22 12 22s6-4 6-8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 16c1.2 1 2 1.8 2 3.2A2.2 2.2 0 0 1 12 21a2.2 2.2 0 0 1-2-1.8c0-1.4.8-2.2 2-3.2Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  scene: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M19 13l.6 2.1L22 16l-2.4.9L19 19l-.6-2.1L16 16l2.4-.9L19 13Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  sensor: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  generic: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12l2.2 2.2L16 8.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },
};

function nwIsEmojiLike(str) {
  if (!str) return false;
  const s = String(str).trim();
  // emoji are typically > 1 byte, but we accept any short string
  return s.length > 0 && s.length <= 3;
}

function nwNormalizeIconName(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  // normalize common german terms
  const map = {
    licht: 'bulb',
    lampe: 'bulb',
    beleuchtung: 'bulb',
    bulb: 'bulb',
    light: 'bulb',
    steckdose: 'plug',
    stecker: 'plug',
    plug: 'plug',
    tv: 'tv',
    fernseher: 'tv',
    speaker: 'speaker',
    lautsprecher: 'speaker',
    heizung: 'thermostat',
    klima: 'thermostat',
    thermostat: 'thermostat',
    rtr: 'thermostat',
    jalousie: 'blinds',
    rollladen: 'blinds',
    blinds: 'blinds',
    szene: 'scene',
    scene: 'scene',
    sensor: 'sensor',
    uhr: 'sensor',
    kamin: 'fire',
    fire: 'fire',
  };
  return map[s] || s;
}

function nwGuessIconName(dev) {
  const type = String(dev.type || '').toLowerCase();
  const fn = String(dev.function || '').toLowerCase();
  const alias = String(dev.alias || dev.id || '').toLowerCase();
  const unit = String(dev.ui && dev.ui.unit ? dev.ui.unit : '').toLowerCase();

  // type-based defaults
  if (type === 'blind') return 'blinds';
  if (type === 'rtr') return 'thermostat';
  if (type === 'scene') return 'scene';
  if (type === 'sensor') {
    if (unit.includes('°c') || alias.includes('temp') || fn.includes('klima')) return 'thermostat';
    return 'sensor';
  }

  // keyword based
  const hay = fn + ' ' + alias;
  if (hay.match(/licht|lampe|leuchte|beleucht|decke|wand|spiegel/)) return 'bulb';
  if (hay.match(/steck|dose|plug|socket/)) return 'plug';
  if (hay.match(/jalous|rolllad|blind|beschatt/)) return 'blinds';
  if (hay.match(/heiz|rtr|therm|klima/)) return 'thermostat';
  if (hay.match(/tv|fernseh|apple tv/)) return 'tv';
  if (hay.match(/sonos|speaker|lautsprech/)) return 'speaker';
  if (hay.match(/kamin|ofen|fire/)) return 'fire';
  if (hay.match(/szene|scene/)) return 'scene';

  return 'generic';
}

function nwGetIconSpec(dev) {
  const raw = (dev && typeof dev.icon !== 'undefined') ? dev.icon : '';
  const iconStr = String(raw || '').trim();

  // If config contains a known icon keyword -> use it
  const normalized = nwNormalizeIconName(iconStr);
  if (NW_ICON_SVGS[normalized]) {
    return { kind: 'svg', name: normalized };
  }

  // If user entered an emoji/short string -> use as text icon
  if (iconStr && nwIsEmojiLike(iconStr)) {
    return { kind: 'text', text: iconStr };
  }

  // auto
  return { kind: 'svg', name: nwGuessIconName(dev) };
}

function nwGetAccentColor(dev, iconName) {
  const type = String(dev.type || '').toLowerCase();
  const fn = String(dev.function || '').toLowerCase();

  // keep palette small and "calm" (works in dark UI)
  if (iconName === 'bulb') return '#fbbf24';     // amber
  if (iconName === 'fire') return '#fb7185';     // rose
  if (iconName === 'plug') return '#60a5fa';     // blue
  if (iconName === 'thermostat') return '#fb923c'; // orange
  if (iconName === 'blinds') return '#a78bfa';   // violet
  if (iconName === 'tv' || iconName === 'speaker') return '#38bdf8'; // sky
  if (iconName === 'scene') return '#f472b6';    // pink
  if (type === 'sensor' || iconName === 'sensor') return '#22c55e'; // green

  if (fn.includes('pv') || fn.includes('energie')) return '#22c55e';
  return '#00e676';
}

function nwIsOn(dev) {
  const st = dev && dev.state ? dev.state : {};
  const type = String(dev.type || '').toLowerCase();

  if (type === 'switch') return !!st.on;
  if (type === 'scene') {
    const active = (typeof st.active !== 'undefined') ? !!st.active : !!st.on;
    return active;
  }
  if (type === 'dimmer') {
    const lvl = (typeof st.level === 'number') ? st.level : 0;
    const min = (dev.io && dev.io.level && typeof dev.io.level.min === 'number') ? dev.io.level.min : 0;
    return lvl > min;
  }
  if (type === 'blind') {
    // blinds have no true "on"; we keep them neutral
    return false;
  }
  if (type === 'rtr') {
    return true;
  }
  return false;
}

function nwGetStateText(dev) {
  const st = dev && dev.state ? dev.state : {};
  const type = String(dev.type || '').toLowerCase();

  if (st && st.error) return 'Fehler';

  if (type === 'switch') return st.on ? 'Ein' : 'Aus';
  if (type === 'scene') {
    const active = (typeof st.active !== 'undefined') ? !!st.active : !!st.on;
    return active ? 'Aktiv' : 'Bereit';
  }
  if (type === 'dimmer') {
    const lvl = (typeof st.level === 'number') ? st.level : 0;
    const pct = Math.round(lvl);
    return pct > 0 ? (pct + ' %') : 'Aus';
  }
  if (type === 'blind') {
    const pos = (typeof st.position === 'number') ? st.position : (typeof st.level === 'number' ? st.level : null);
    if (typeof pos === 'number') return Math.round(pos) + ' %';
    return '—';
  }
  if (type === 'rtr') {
    if (typeof st.mode !== 'undefined' && st.mode !== null && String(st.mode).trim() !== '') {
      return String(st.mode);
    }
    if (typeof st.setpoint === 'number') {
      return 'Soll ' + st.setpoint.toFixed(1).replace('.', ',') + '°C';
    }
    return 'Heizung';
  }
  if (type === 'sensor') {
    // sensor uses value field primarily
    if (typeof st.value !== 'undefined' && st.value !== null) {
      const ui = dev.ui || {};
      if (typeof st.value === 'number') {
        const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
        const unit = ui.unit || '';
        return st.value.toFixed(prec).replace('.', ',') + (unit ? ' ' + unit : '');
      }
      return String(st.value);
    }
    return '—';
  }

  return '';
}

function nwGetTileHint(dev) {
  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  const canWrite = nwHasWriteAccess(dev);

  // Wenn ReadOnly: kurze Info (keine Bedienhinweise)
  if (!canWrite) return 'Nur Anzeige';

  if (type === 'switch') return 'Klicken: Ein/Aus';
  if (type === 'scene') return 'Klicken: Szene auslösen';
  if (type === 'dimmer') return 'Klicken: Ein/Aus · Regler: Helligkeit · Symbol/⋯: Bedienung';
  if (type === 'blind') return 'Regler: Position · Tasten: Auf/Stop/Ab · Symbol/⋯: Bedienung';
  if (type === 'rtr') return 'Symbol/⋯: Solltemperatur einstellen';
  return '';
}


function nwFormatBigValue(dev) {
  const st = dev && dev.state ? dev.state : {};
  const ui = dev.ui || {};
  const type = String(dev.type || '').toLowerCase();

  if (type === 'rtr') {
    if (typeof st.currentTemp === 'number') {
      const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
      return {
        value: st.currentTemp.toFixed(prec).replace('.', ','),
        unit: ui.unit || '°C',
      };
    }
    if (typeof st.setpoint === 'number') {
      const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
      return {
        value: st.setpoint.toFixed(prec).replace('.', ','),
        unit: ui.unit || '°C',
      };
    }
  }

  if (type === 'sensor') {
    if (typeof st.value === 'number') {
      const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
      return {
        value: st.value.toFixed(prec).replace('.', ','),
        unit: ui.unit || '',
      };
    }
  }

  return { value: '', unit: '' };
}

function nwGetTileSize(dev) {
  // Runtime device carries ui.size from config -> allow s/m/l/xl
  let sz = String((dev && dev.ui && dev.ui.size) ? dev.ui.size : '').trim().toLowerCase();
  if (!sz) {
    const type = String(dev.type || '').toLowerCase();
    if (type === 'rtr') sz = 'xl';
    else sz = 'm';
  }
  if (sz !== 's' && sz !== 'm' && sz !== 'l' && sz !== 'xl') sz = 'm';
  return sz;
}

function nwHasWriteAccess(dev) {
  const beh = dev && dev.behavior ? dev.behavior : {};
  if (beh.readOnly) return false;
  return true;
}

function nwCreateIconElement(dev, isOn, iconSpec, accent) {
  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-icon';

  if (iconSpec.kind === 'text') {
    const t = document.createElement('span');
    t.className = 'nw-sh-icon__text';
    t.textContent = iconSpec.text;
    wrap.appendChild(t);
    return wrap;
  }

  const svgWrap = document.createElement('div');
  svgWrap.className = 'nw-sh-icon__svg';
  const name = iconSpec.name;
  const variant = isOn ? 'on' : 'off';
  const svg = (NW_ICON_SVGS[name] && NW_ICON_SVGS[name][variant])
    ? NW_ICON_SVGS[name][variant]
    : (NW_ICON_SVGS.generic && NW_ICON_SVGS.generic[variant]);

  svgWrap.innerHTML = svg;
  wrap.appendChild(svgWrap);

  // set accent as CSS var so SVG uses currentColor
  wrap.style.color = isOn ? accent : 'rgba(203, 213, 225, 0.85)';

  return wrap;
}

// ---------- Networking ----------

async function nwFetchDevices() {
  const res = await fetch('/api/smarthome/devices', { cache: 'no-store' });
  if (!res.ok) throw new Error('devices fetch failed');
  const data = await res.json();
  if (!data || !data.ok) throw new Error('devices fetch not ok');
  return Array.isArray(data.devices) ? data.devices : [];
}

async function nwToggleDevice(id) {
  const res = await fetch('/api/smarthome/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}

async function nwSetLevel(id, level) {
  const res = await fetch('/api/smarthome/level', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, level }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}

async function nwCoverAction(id, action) {
  const res = await fetch('/api/smarthome/cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!(data && data.ok);
}

async function nwSetRtrSetpoint(id, setpoint) {
  const res = await fetch('/api/smarthome/rtrSetpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, setpoint }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}

async function nwAdjustRtrSetpoint(dev, delta) {
  const st = dev.state || {};
  const cl = dev.io && dev.io.climate ? dev.io.climate : {};

  const min = typeof cl.minSetpoint === 'number' ? cl.minSetpoint : 15;
  const max = typeof cl.maxSetpoint === 'number' ? cl.maxSetpoint : 30;

  const current = (typeof st.setpoint === 'number') ? st.setpoint : min;
  let target = current + delta;
  if (target < min) target = min;
  if (target > max) target = max;

  await nwSetRtrSetpoint(dev.id, target);
  await nwReloadDevices({ force: true });
}

// ---------- Rendering ----------

function nwClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function nwSortBy(a, b) {
  const sa = String(a || '').toLowerCase();
  const sb = String(b || '').toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function nwGetDeviceOrder(dev) {
  const o = (dev && typeof dev.order === 'number')
    ? dev.order
    : (dev && dev.ui && typeof dev.ui.order === 'number' ? dev.ui.order : 0);
  return Number.isFinite(o) ? o : 0;
}

function nwFormatNumberDE(value, precision) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  const p = (typeof precision === 'number' && precision >= 0 && precision <= 6) ? precision : 1;
  return v.toFixed(p).replace('.', ',');
}

function nwComputeRoomSummary(roomName, allDevices) {
  const room = String(roomName || '').trim();
  if (!room) return '';

  const devs = Array.isArray(allDevices) ? allDevices.filter(d => String(d.room || '').trim() === room) : [];
  if (!devs.length) return '';

  const tempCandidates = [];
  const humCandidates = [];

  devs.forEach(d => {
    if (!d) return;
    const type = String(d.type || '').toLowerCase();
    const st = d.state || {};
    const ui = d.ui || {};
    const order = nwGetDeviceOrder(d);
    const alias = String(d.alias || d.id || '').toLowerCase();
    const unit = String(ui.unit || '').toLowerCase();

    if (type === 'rtr') {
      if (typeof st.currentTemp === 'number') {
        tempCandidates.push({ prio: 0, order, value: st.currentTemp, precision: (typeof ui.precision === 'number' ? ui.precision : 1), unit: ui.unit || '°C' });
      }
      if (typeof st.humidity === 'number') {
        humCandidates.push({ prio: 0, order, value: st.humidity, precision: 0, unit: '%' });
      }
    }

    if (type === 'sensor') {
      if (typeof st.value === 'number') {
        const looksTemp = unit.includes('°c') || unit.includes('c') || alias.includes('temp') || alias.includes('temperatur');
        const looksHum = unit.includes('%') || alias.includes('feuchte') || alias.includes('humidity') || alias.includes('luft');

        if (looksTemp) {
          tempCandidates.push({ prio: 1, order, value: st.value, precision: (typeof ui.precision === 'number' ? ui.precision : 1), unit: ui.unit || '°C' });
        }
        if (looksHum) {
          humCandidates.push({ prio: 1, order, value: st.value, precision: 0, unit: '%' });
        }
      }
    }
  });

  const pick = (arr) => {
    if (!arr.length) return null;
    arr.sort((a, b) => (a.prio - b.prio) || (a.order - b.order));
    return arr[0];
  };

  const t = pick(tempCandidates);
  const h = pick(humCandidates);

  const parts = [];
  if (t) {
    const val = nwFormatNumberDE(t.value, t.precision);
    if (val) parts.push(val + (t.unit ? String(t.unit).replace(/\s+/g, '') : ''));
  }
  if (h) {
    const v = Number(h.value);
    if (Number.isFinite(v)) parts.push(Math.round(v) + '%');
  }

  return parts.join(' · ');
}

function nwApplyFilters(devices) {
  const arr = Array.isArray(devices) ? devices.slice() : [];

  let out = arr;

  // favorites
  if (nwFilterState.favoritesOnly) {
    out = out.filter(d => !!(d.behavior && d.behavior.favorite));
  }

  // function filter
  if (nwFilterState.func) {
    out = out.filter(d => String(d.function || '') === String(nwFilterState.func));
  }

  return out;
}

function nwGetAllFunctions(devices) {
  const set = new Set();
  (devices || []).forEach(d => {
    const fn = String(d.function || '').trim();
    if (fn) set.add(fn);
  });
  return Array.from(set).sort(nwSortBy);
}

function nwRenderFunctionChips(devices) {
  const wrap = document.getElementById('nw-filter-functions');
  if (!wrap) return;
  nwClear(wrap);

  const allFns = nwGetAllFunctions(devices);
  const hasFav = (devices || []).some(d => !!(d.behavior && d.behavior.favorite));

  const mkChip = (label, active, onClick, extraClass) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '') + (extraClass ? ' ' + extraClass : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      onClick();
      nwApplyFiltersAndRender();
    });
    wrap.appendChild(btn);
  };

  mkChip('Alle', !nwFilterState.func && !nwFilterState.favoritesOnly, () => {
    nwFilterState.func = null;
    nwFilterState.favoritesOnly = false;
  });

  if (hasFav) {
    mkChip('★ Favoriten', !!nwFilterState.favoritesOnly, () => {
      nwFilterState.favoritesOnly = !nwFilterState.favoritesOnly;
      if (nwFilterState.favoritesOnly) nwFilterState.func = null;
    });
  }

  allFns.forEach(fn => {
    mkChip(fn, nwFilterState.func === fn, () => {
      if (nwFilterState.func === fn) nwFilterState.func = null;
      else nwFilterState.func = fn;
      nwFilterState.favoritesOnly = false;
    });
  });
}

function nwGroupByRoom(devices) {
  const map = new Map();
  (devices || []).forEach(d => {
    const room = String(d.room || '').trim() || 'Ohne Raum';
    if (!map.has(room)) map.set(room, []);
    map.get(room).push(d);
  });

  const rooms = Array.from(map.keys()).sort(nwSortBy);
  return rooms.map(r => ({ room: r, devices: map.get(r) || [] }));
}

function nwShowEmptyState(show, ctx) {
  const empty = document.getElementById('nw-smarthome-empty');
  const rooms = document.getElementById('nw-smarthome-rooms');
  if (rooms) rooms.style.display = show ? 'none' : '';
  if (!empty) return;

  if (!show) {
    empty.style.display = 'none';
    empty.textContent = '';
    return;
  }

  const enabled = (typeof ctx?.enabled === 'boolean')
    ? ctx.enabled
    : (typeof nwSmartHomeEnabled === 'boolean' ? nwSmartHomeEnabled : null);

  empty.style.display = '';

  if (enabled === false) {
    empty.innerHTML = [
      '⚠️ <b>SmartHome ist deaktiviert</b> – deshalb bleibt diese Seite leer.<br/>',
      'Aktiviere SmartHome im <b>Admin → SmartHome</b> und lade die Seite neu.<br/>',
      '<span style="opacity:0.85">Tipp: Wenn du gerade konfiguriert hast, bitte einmal Hard‑Reload (Strg+F5).</span>'
    ].join('');
    return;
  }

  if (ctx && ctx.reason === 'filtered') {
    empty.innerHTML = 'Keine Treffer für die aktuellen Filter. <span style="opacity:0.85">(„Alle“ wählen oder Filter zurücksetzen)</span>';
    return;
  }

  empty.innerHTML = [
    'Noch keine SmartHome‑Kacheln konfiguriert.<br/>',
    '<span style="opacity:0.85">Bitte im Admin unter <b>SmartHome‑Konfiguration</b> Geräte/DPs anlegen.</span>'
  ].join('');
}

function nwCreateTile(dev) {
  const type = String(dev.type || '').toLowerCase();
  const size = nwGetTileSize(dev);
  const isOn = nwIsOn(dev);
  const canWrite = nwHasWriteAccess(dev);

  const iconSpec = nwGetIconSpec(dev);
  const iconName = iconSpec.kind === 'svg' ? iconSpec.name : 'generic';
  const accent = nwGetAccentColor(dev, iconName);

  const tile = document.createElement('div');
  tile.className = [
    'nw-sh-tile',
    'nw-sh-tile--type-' + (type || 'unknown'),
    'nw-sh-tile--size-' + size,
    isOn ? 'nw-sh-tile--on' : 'nw-sh-tile--off',
    canWrite ? '' : 'nw-sh-tile--readonly',
    (dev.behavior && dev.behavior.favorite) ? 'nw-sh-tile--favorite' : '',
  ].filter(Boolean).join(' ');

  tile.style.setProperty('--sh-accent', accent);

  // Tooltip (kurz) – hilft bei der Bedienung
  tile.title = nwGetTileHint(dev);

  // Header: Icon + Name + State
  const header = document.createElement('div');
  header.className = 'nw-sh-tile__header';

  const icon = nwCreateIconElement(dev, isOn, iconSpec, accent);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'nw-sh-tile__title';

  const name = document.createElement('div');
  name.className = 'nw-sh-tile__name';
  name.textContent = dev.alias || dev.id;

  const state = document.createElement('div');
  state.className = 'nw-sh-tile__state';
  state.textContent = nwGetStateText(dev);

  titleWrap.appendChild(name);
  titleWrap.appendChild(state);

  header.appendChild(icon);
  header.appendChild(titleWrap);

  // Favorite star (top-right)
  if (dev.behavior && dev.behavior.favorite) {
    const star = document.createElement('div');
    star.className = 'nw-sh-tile__star';
    star.textContent = '★';
    header.appendChild(star);
  }

  // Detail/Tooltip-Popover (für Dimmer/Jalousie/RTR)
  const hasDetails = (type === 'dimmer' || type === 'blind' || type === 'rtr');
  if (hasDetails) {
    // Klick auf Icon öffnet das Bedienpanel (Tooltip)
    icon.title = 'Bedienung';
    icon.style.cursor = 'pointer';
    icon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      nwOpenDevicePopover(dev, tile);
    });

    // Optionaler "Mehr"-Button (⋯)
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'nw-sh-detailbtn';
    more.textContent = '⋯';
    more.title = 'Bedienung';
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      nwOpenDevicePopover(dev, tile);
    });
    header.appendChild(more);
  }

  tile.appendChild(header);

  // Big content (RTR / large sensors)
  if (type === 'rtr' || size === 'xl') {
    const big = document.createElement('div');
    big.className = 'nw-sh-tile__big';

    const { value, unit } = nwFormatBigValue(dev);
    if (value) {
      const val = document.createElement('div');
      val.className = 'nw-sh-tile__value';
      val.textContent = value;

      const u = document.createElement('span');
      u.className = 'nw-sh-tile__unit';
      u.textContent = unit || '';

      val.appendChild(u);
      big.appendChild(val);
    }

    // Secondary line for RTR: setpoint/humidity
    if (type === 'rtr') {
      const st = dev.state || {};
      const meta = document.createElement('div');
      meta.className = 'nw-sh-tile__meta';

      const parts = [];
      if (typeof st.setpoint === 'number') {
        parts.push('Soll ' + st.setpoint.toFixed(1).replace('.', ',') + '°C');
      }
      if (typeof st.humidity === 'number') {
        parts.push('RH ' + Math.round(st.humidity) + '%');
      }
      meta.textContent = parts.join(' · ') || '';
      big.appendChild(meta);

      if (canWrite && dev.io && dev.io.climate && dev.io.climate.setpointId) {
        const controls = document.createElement('div');
        controls.className = 'nw-sh-controls nw-sh-controls--rtr';

        const btnMinus = document.createElement('button');
        btnMinus.type = 'button';
        btnMinus.className = 'nw-sh-btn';
        btnMinus.textContent = '−';

        const btnPlus = document.createElement('button');
        btnPlus.type = 'button';
        btnPlus.className = 'nw-sh-btn';
        btnPlus.textContent = '+';

        const stop = (ev) => ev.stopPropagation();
        btnMinus.addEventListener('click', stop);
        btnPlus.addEventListener('click', stop);

        btnMinus.addEventListener('click', async () => {
          await nwAdjustRtrSetpoint(dev, -0.5);
        });

        btnPlus.addEventListener('click', async () => {
          await nwAdjustRtrSetpoint(dev, 0.5);
        });

        controls.appendChild(btnMinus);
        controls.appendChild(btnPlus);
        big.appendChild(controls);
      }
    }

    tile.appendChild(big);
  }

  // Dimmer/Blind: optional slider (if level mapping exists)
  if ((type === 'dimmer' || type === 'blind') && dev.io && dev.io.level && dev.io.level.readId) {
    const lvlCfg = dev.io.level;
    const min = typeof lvlCfg.min === 'number' ? lvlCfg.min : 0;
    const max = typeof lvlCfg.max === 'number' ? lvlCfg.max : 100;
    const st = dev.state || {};
    const current = (typeof st.level === 'number') ? st.level : (typeof st.position === 'number' ? st.position : 0);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(Math.max(min, Math.min(max, current)));
    slider.className = 'nw-sh-slider nw-sh-slider--tilebig';

    const stop = (ev) => ev.stopPropagation();
    slider.addEventListener('mousedown', stop);
    slider.addEventListener('touchstart', stop);
    slider.addEventListener('click', stop);

    slider.addEventListener('change', async (ev) => {
      if (!hasWrite) return;
      const raw = Number(ev.target.value);
      if (!Number.isFinite(raw)) return;
      await nwSetLevel(dev.id, raw);
      await nwReloadDevices({ force: true });
    });

    tile.appendChild(slider);
  }

  // Blind buttons (up/stop/down)
  if (type === 'blind') {
    const controls = document.createElement('div');
    controls.className = 'nw-sh-controls';

    const mk = (label, action) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-sh-btn';
      b.textContent = label;
      b.addEventListener('click', (ev) => ev.stopPropagation());
      b.addEventListener('click', async () => {
        if (!canWrite) return;
        await nwCoverAction(dev.id, action);
      });
      return b;
    };

    controls.appendChild(mk('▲', 'up'));
    controls.appendChild(mk('■', 'stop'));
    controls.appendChild(mk('▼', 'down'));

    tile.appendChild(controls);
  }

  // Tap actions (switch / dimmer / scene)
  tile.addEventListener('click', async () => {
    if (!canWrite) return;
    if (type !== 'switch' && type !== 'dimmer' && type !== 'scene') return;
    const st = await nwToggleDevice(dev.id);
    if (!st) return;
    await nwReloadDevices({ force: true });
  });

  return tile;
}


/* -------------------------------------------------------------------------- */
/* Tooltip/Bedienpanel (Popover)                                              */
/* -------------------------------------------------------------------------- */

let nwPopoverBackdropEl = null;
let nwPopoverEl = null;
let nwPopoverOpenId = null;
let nwPopoverAnchorEl = null;
let nwPopoverDragging = false;

// Prevent background scrolling while a SmartHome popover is open.
// (Especially important on mobile/touch devices.)
let nwBodyScrollLocked = false;
let nwBodyScrollY = 0;

function nwLockBodyScroll() {
  if (nwBodyScrollLocked) return;
  nwBodyScrollLocked = true;

  nwBodyScrollY = window.scrollY || window.pageYOffset || 0;

  // Prevent layout jump when the scrollbar disappears (desktop).
  const sbW = Math.max(0, (window.innerWidth || 0) - (document.documentElement?.clientWidth || 0));
  if (sbW > 0) document.body.style.paddingRight = sbW + 'px';

  // Lock both <html> and <body> (some browsers only honor one of them).
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // iOS/Safari: overflow hidden is not always enough.
  document.body.style.position = 'fixed';
  document.body.style.top = (-nwBodyScrollY) + 'px';
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('nw-scroll-locked');
}

function nwUnlockBodyScroll() {
  if (!nwBodyScrollLocked) return;
  nwBodyScrollLocked = false;

  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  document.body.classList.remove('nw-scroll-locked');

  // Restore scroll position after removing fixed positioning.
  const y = nwBodyScrollY || 0;
  nwBodyScrollY = 0;
  try { window.scrollTo(0, y); } catch (_e) {}
}

function nwEnsurePopover() {
  if (nwPopoverBackdropEl && nwPopoverEl) return;

  nwPopoverBackdropEl = document.createElement('div');
  nwPopoverBackdropEl.id = 'nw-sh-popover-backdrop';
  nwPopoverBackdropEl.className = 'nw-sh-popover-backdrop hidden';

  nwPopoverEl = document.createElement('div');
  nwPopoverEl.id = 'nw-sh-popover';
  nwPopoverEl.className = 'nw-sh-popover hidden';

  document.body.appendChild(nwPopoverBackdropEl);
  document.body.appendChild(nwPopoverEl);

  // clicks inside should not close
  nwPopoverEl.addEventListener('click', (ev) => ev.stopPropagation());

  const close = () => nwClosePopover();
  nwPopoverBackdropEl.addEventListener('click', close);

  // Block scroll gestures on the backdrop itself (extra safety).
  // (Body is locked as well, but this prevents "rubber band" scrolling.)
  nwPopoverBackdropEl.addEventListener('wheel', (ev) => ev.preventDefault(), { passive: false });
  nwPopoverBackdropEl.addEventListener('touchmove', (ev) => ev.preventDefault(), { passive: false });

  window.addEventListener('resize', () => {
    if (nwPopoverOpenId) nwPositionPopover(nwPopoverAnchorEl);
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (nwPopoverOpenId) nwPositionPopover(nwPopoverAnchorEl);
  }, { passive: true, capture: true });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') close();
  }, { passive: true });
}

function nwClosePopover() {
  if (!nwPopoverEl || !nwPopoverBackdropEl) return;
  nwPopoverEl.classList.add('hidden');
  nwPopoverBackdropEl.classList.add('hidden');
  nwPopoverEl.innerHTML = '';
  nwPopoverOpenId = null;
  nwPopoverAnchorEl = null;
  nwPopoverDragging = false;
  nwUnlockBodyScroll();
}

function nwOpenDevicePopover(dev, anchorEl) {
  if (!dev || !dev.id) return;
  nwEnsurePopover();

  // if same device is open -> close (toggle)
  if (nwPopoverOpenId && nwPopoverOpenId === dev.id && !nwPopoverEl.classList.contains('hidden')) {
    nwClosePopover();
    return;
  }

  nwPopoverOpenId = dev.id;
  nwPopoverAnchorEl = anchorEl || null;
  nwPopoverDragging = false;

  nwPopoverBackdropEl.classList.remove('hidden');
  nwPopoverEl.classList.remove('hidden');
  nwPopoverEl.innerHTML = '';

  // Lock background scrolling while the popover is visible.
  nwLockBodyScroll();

  nwBuildPopoverContent(dev);

  // Position after layout
  requestAnimationFrame(() => nwPositionPopover(nwPopoverAnchorEl));
}

function nwPositionPopover(anchorEl) {
  if (!nwPopoverEl || nwPopoverEl.classList.contains('hidden')) return;

  const vpW = window.innerWidth || 0;
  const vpH = window.innerHeight || 0;
  const pad = 12;

  const w = nwPopoverEl.offsetWidth || 360;
  const h = nwPopoverEl.offsetHeight || 260;

  // default: centered
  let left = (vpW - w) / 2;
  let top = (vpH - h) / 2;

  if (anchorEl && anchorEl.getBoundingClientRect) {
    const r = anchorEl.getBoundingClientRect();

    left = r.left + (r.width / 2) - (w / 2);
    left = Math.max(pad, Math.min(vpW - w - pad, left));

    const below = r.bottom + 10;
    const above = r.top - h - 10;

    if (below + h + pad <= vpH) top = below;
    else if (above >= pad) top = above;
    else top = Math.max(pad, Math.min(vpH - h - pad, top));
  } else {
    left = Math.max(pad, Math.min(vpW - w - pad, left));
    top = Math.max(pad, Math.min(vpH - h - pad, top));
  }

  nwPopoverEl.style.left = Math.round(left) + 'px';
  nwPopoverEl.style.top = Math.round(top) + 'px';
}

function nwClampNumber(v, min, max) {
  const x = Number(v);
  if (!Number.isFinite(x)) return Number.isFinite(min) ? min : 0;
  return Math.max(min, Math.min(max, x));
}

function nwRoundToStep(v, step) {
  const x = Number(v);
  const s = Number(step);
  if (!Number.isFinite(x) || !Number.isFinite(s) || s <= 0) return x;
  return Math.round(x / s) * s;
}

function nwBuildPopoverContent(dev) {
  if (!nwPopoverEl) return;

  const type = String(dev.type || '').toLowerCase();
  const isOn = nwIsOn(dev);
  const canWrite = nwHasWriteAccess(dev);

  const iconSpec = nwGetIconSpec(dev);
  const iconName = iconSpec.kind === 'svg' ? iconSpec.name : 'generic';
  const accent = nwGetAccentColor(dev, iconName);

  nwPopoverEl.style.setProperty('--sh-accent', accent);

  const hdr = document.createElement('div');
  hdr.className = 'nw-sh-popover__hdr';

  const left = document.createElement('div');
  left.className = 'nw-sh-popover__hdr-left';

  const icon = nwCreateIconElement(dev, isOn, iconSpec, accent);

  const txt = document.createElement('div');
  txt.style.minWidth = '0';

  const title = document.createElement('div');
  title.className = 'nw-sh-popover__title';
  title.textContent = dev.alias || dev.id;

  const st = document.createElement('div');
  st.className = 'nw-sh-popover__state';
  st.textContent = nwGetStateText(dev);

  txt.appendChild(title);
  txt.appendChild(st);

  left.appendChild(icon);
  left.appendChild(txt);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nw-sh-popover__close';
  close.textContent = '✕';
  close.title = 'Schließen';
  close.addEventListener('click', (ev) => {
    ev.stopPropagation();
    nwClosePopover();
  });

  hdr.appendChild(left);
  hdr.appendChild(close);

  const body = document.createElement('div');
  body.className = 'nw-sh-popover__body';

  if (type === 'dimmer') {
    body.appendChild(nwCreateLevelPopover(dev, canWrite, { label: 'Helligkeit' }));
  } else if (type === 'blind') {
    body.appendChild(nwCreateBlindPopover(dev, canWrite));
  } else if (type === 'rtr') {
    body.appendChild(nwCreateRtrPopover(dev, canWrite));
  } else {
    const hint = document.createElement('div');
    hint.className = 'nw-sh-popover__hint';
    hint.textContent = 'Keine erweiterten Bedienelemente für diesen Gerätetyp.';
    body.appendChild(hint);
  }

  nwPopoverEl.appendChild(hdr);
  nwPopoverEl.appendChild(body);
}

function nwCreateLevelPopover(dev, canWrite, opts) {
  const wrap = document.createElement('div');

  const label = (opts && opts.label) ? String(opts.label) : 'Wert';

  const lvlCfg = (dev.io && dev.io.level) ? dev.io.level : {};
  const hasWrite = canWrite && (typeof lvlCfg.writeId === 'string') && (String(lvlCfg.writeId).trim() !== '');
  const min = (typeof lvlCfg.min === 'number') ? lvlCfg.min : 0;
  const max = (typeof lvlCfg.max === 'number') ? lvlCfg.max : 100;

  const st = dev.state || {};
  const current = (typeof st.level === 'number') ? st.level : 0;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = Math.round(current) + ' %';

  row.appendChild(l);
  row.appendChild(v);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(nwClampNumber(current, min, max));
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !hasWrite;

  slider.addEventListener('click', (ev) => ev.stopPropagation());

  slider.addEventListener('input', (ev) => {
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    v.textContent = Math.round(raw) + ' %';
  });

  slider.addEventListener('change', async (ev) => {
    if (!hasWrite) return;
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    await nwSetLevel(dev.id, raw);
    await nwReloadDevices({ force: true });
  });

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';
  hint.textContent = hasWrite ? 'Tipp: Regler ziehen – Wert wird beim Loslassen übernommen.' : 'Nur Anzeige (keine Schreib‑DP / writeId konfiguriert).';

  wrap.appendChild(row);
  wrap.appendChild(slider);
  wrap.appendChild(hint);

  // Optional: Ein/Aus Button
  const btnRow = document.createElement('div');
  btnRow.className = 'nw-sh-popover__row';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nw-sh-btn';
  toggle.textContent = nwIsOn(dev) ? 'Ausschalten' : 'Einschalten';
  toggle.disabled = !canWrite;
  toggle.addEventListener('click', (ev) => ev.stopPropagation());
  toggle.addEventListener('click', async () => {
    if (!canWrite) return;
    await nwToggleDevice(dev.id);
    await nwReloadDevices({ force: true });
    // close label text not auto-updated; ok
  });

  btnRow.appendChild(document.createElement('div'));
  btnRow.appendChild(toggle);
  wrap.appendChild(btnRow);

  return wrap;
}

function nwCreateBlindPopover(dev, canWrite) {
  const wrap = document.createElement('div');

  const lvlCfg = (dev.io && dev.io.level) ? dev.io.level : {};
  const hasWrite = canWrite && (typeof lvlCfg.writeId === 'string') && (String(lvlCfg.writeId).trim() !== '');
  const min = (typeof lvlCfg.min === 'number') ? lvlCfg.min : 0;
  const max = (typeof lvlCfg.max === 'number') ? lvlCfg.max : 100;

  const st = dev.state || {};
  const current = (typeof st.position === 'number') ? st.position : (typeof st.level === 'number' ? st.level : 0);

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = 'Position';

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = Math.round(current) + ' %';

  row.appendChild(l);
  row.appendChild(v);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(nwClampNumber(current, min, max));
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !hasWrite;

  slider.addEventListener('click', (ev) => ev.stopPropagation());

  slider.addEventListener('input', (ev) => {
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    v.textContent = Math.round(raw) + ' %';
  });

  slider.addEventListener('change', async (ev) => {
    if (!canWrite) return;
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    await nwSetLevel(dev.id, raw);
    await nwReloadDevices({ force: true });
  });

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';
  hint.textContent = (hasWrite || canWrite) ? 'Tipp: Regler ziehen oder Tasten nutzen.' : 'Nur Anzeige (keine Schreib‑DP konfiguriert).';

  const controls = document.createElement('div');
  controls.className = 'nw-sh-controls';

  const mk = (label, action) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-btn';
    b.textContent = label;
    b.disabled = !canWrite;
    b.addEventListener('click', (ev) => ev.stopPropagation());
    b.addEventListener('click', async () => {
      if (!canWrite) return;
      await nwCoverAction(dev.id, action);
      await nwReloadDevices({ force: true });
    });
    return b;
  };

  controls.appendChild(mk('▲', 'up'));
  controls.appendChild(mk('■', 'stop'));
  controls.appendChild(mk('▼', 'down'));

  wrap.appendChild(row);
  wrap.appendChild(slider);
  wrap.appendChild(controls);
  wrap.appendChild(hint);

  return wrap;
}

function nwGetRtrRange(dev) {
  const c = (dev.io && dev.io.climate) ? dev.io.climate : {};
  const min = (typeof c.minSetpoint === 'number') ? c.minSetpoint : 15;
  const max = (typeof c.maxSetpoint === 'number') ? c.maxSetpoint : 30;
  return { min, max };
}

function nwCreateRtrPopover(dev, canWrite) {
  const wrap = document.createElement('div');

  const st = dev.state || {};
  const range = nwGetRtrRange(dev);

  let setpoint = (typeof st.setpoint === 'number') ? st.setpoint : null;
  if (!Number.isFinite(setpoint)) {
    setpoint = (typeof st.currentTemp === 'number') ? st.currentTemp : range.min;
  }
  setpoint = nwClampNumber(setpoint, range.min, range.max);
  setpoint = nwRoundToStep(setpoint, 0.5);

  const dial = nwCreateThermostatGauge({
    value: setpoint,
    min: range.min,
    max: range.max,
    step: 0.5,
    canWrite: !!(canWrite && dev.io && dev.io.climate && dev.io.climate.setpointId),
    subtitle: 'Solltemperatur',
    sub2: (typeof st.currentTemp === 'number')
      ? ('Ist ' + nwFormatNumberDE(st.currentTemp, 1) + '°C' + (typeof st.humidity === 'number' ? (' · RH ' + Math.round(st.humidity) + '%') : ''))
      : (typeof st.humidity === 'number' ? ('RH ' + Math.round(st.humidity) + '%') : ''),
    onCommit: async (val) => {
      if (!canWrite) return;
      await nwSetRtrSetpoint(dev.id, val);
      await nwReloadDevices({ force: true });
    },
  });

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';
  hint.textContent = (canWrite && dev.io && dev.io.climate && dev.io.climate.setpointId)
    ? 'Tipp: Regler ziehen oder +/− – Sollwert wird übernommen.'
    : 'Nur Anzeige (keine Sollwert‑Schreib‑DP konfiguriert).';

  wrap.appendChild(dial);
  wrap.appendChild(hint);

  return wrap;
}



function nwCreateThermostatGauge(opts) {
  const min = Number(opts && opts.min);
  const max = Number(opts && opts.max);
  const step = Number(opts && opts.step) || 0.5;
  const canWrite = !!(opts && opts.canWrite);
  const subtitle = (opts && typeof opts.subtitle === 'string') ? opts.subtitle : '';
  const sub2 = (opts && typeof opts.sub2 === 'string') ? opts.sub2 : '';
  const onCommit = (opts && typeof opts.onCommit === 'function') ? opts.onCommit : null;

  let value = Number(opts && opts.value);
  if (!Number.isFinite(value)) value = min;
  value = nwClampNumber(value, min, max);
  value = nwRoundToStep(value, step);

  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-gauge';

  const canvas = document.createElement('div');
  canvas.className = 'nw-sh-gauge__canvas';
  wrap.appendChild(canvas);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('nw-sh-gauge__svg');
  svg.setAttribute('viewBox', '0 0 200 140');
  svg.setAttribute('role', 'img');

  const cx = 100;
  const cy = 110;
  const r = 80;

  const gradId = 'nwShGaugeGrad' + Math.random().toString(36).slice(2, 9);

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  // IMPORTANT: Use absolute coordinates in the SVG viewBox.
  // Without this, the gradient uses objectBoundingBox units and collapses
  // visually (dial looks like a single flat color).
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', String(cx - r));
  grad.setAttribute('y1', String(cy));
  grad.setAttribute('x2', String(cx + r));
  grad.setAttribute('y2', String(cy));

  const mkStop = (off, col) => {
    const s = document.createElementNS(NS, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', col);
    return s;
  };
  // More "Apple-like" gradient: cyan -> green -> yellow -> orange/red.
  grad.appendChild(mkStop('0%', '#1dddf2'));
  grad.appendChild(mkStop('40%', '#00e676'));
  grad.appendChild(mkStop('70%', '#ffd54f'));
  grad.appendChild(mkStop('100%', '#ff7043'));
  defs.appendChild(grad);
  svg.appendChild(defs);

  const base = document.createElementNS(NS, 'path');
  // Upper arc (matches tick marks). sweep=1 draws the arc "over" the value.
  base.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
  base.setAttribute('fill', 'none');
  base.classList.add('nw-sh-gauge__track');

  const active = document.createElementNS(NS, 'path');
  active.setAttribute('fill', 'none');
  active.classList.add('nw-sh-gauge__active');
  active.style.stroke = `url(#${gradId})`;

  // Tick marks around the arc (1°C steps, clamped)
  const ticks = document.createElementNS(NS, 'g');
  ticks.classList.add('nw-sh-gauge__ticks');
  const tickCount = Math.max(6, Math.min(24, Math.round((max - min) / 1)));
  for (let i = 0; i <= tickCount; i++) {
    const f = i / tickCount;
    const ang = Math.PI - f * Math.PI;
    const outer = r + 4;
    const inner = r - (i % 2 === 0 ? 10 : 6);

    const x1 = cx + outer * Math.cos(ang);
    const y1 = cy - outer * Math.sin(ang);
    const x2 = cx + inner * Math.cos(ang);
    const y2 = cy - inner * Math.sin(ang);

    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.classList.add('nw-sh-gauge__tick');
    if (i % 2 === 0) line.classList.add('nw-sh-gauge__tick--major');
    ticks.appendChild(line);
  }

  const knob = document.createElementNS(NS, 'circle');
  knob.classList.add('nw-sh-gauge__knob');
  knob.setAttribute('r', '7');

  // Invisible hit area for dragging/clicking on the arc
  const hit = document.createElementNS(NS, 'path');
  hit.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
  hit.setAttribute('fill', 'none');
  hit.classList.add('nw-sh-gauge__hit');

  svg.appendChild(base);
  svg.appendChild(active);
  svg.appendChild(ticks);
  svg.appendChild(knob);
  svg.appendChild(hit);

  canvas.appendChild(svg);

  // Overlay: value + +/- buttons (Apple‑ähnlich)
  const overlay = document.createElement('div');
  overlay.className = 'nw-sh-gauge__overlay';

  const btnMinus = document.createElement('button');
  btnMinus.type = 'button';
  btnMinus.className = 'nw-sh-gauge__btn';
  btnMinus.textContent = '−';

  const btnPlus = document.createElement('button');
  btnPlus.type = 'button';
  btnPlus.className = 'nw-sh-gauge__btn';
  btnPlus.textContent = '+';

  const center = document.createElement('div');
  center.className = 'nw-sh-gauge__center';

  const valEl = document.createElement('div');
  valEl.className = 'nw-sh-gauge__value';

  const labEl = document.createElement('div');
  labEl.className = 'nw-sh-gauge__label';
  labEl.textContent = subtitle || '';

  const sub2El = document.createElement('div');
  sub2El.className = 'nw-sh-gauge__sub';
  sub2El.textContent = sub2 || '';

  center.appendChild(valEl);
  if (subtitle) center.appendChild(labEl);
  if (sub2) center.appendChild(sub2El);

  overlay.appendChild(btnMinus);
  overlay.appendChild(center);
  overlay.appendChild(btnPlus);

  canvas.appendChild(overlay);

  const minmax = document.createElement('div');
  minmax.className = 'nw-sh-gauge__minmax';
  const minEl = document.createElement('span');
  const maxEl = document.createElement('span');
  minEl.textContent = nwFormatNumberDE(min, 0);
  maxEl.textContent = nwFormatNumberDE(max, 0);
  minmax.appendChild(minEl);
  minmax.appendChild(maxEl);
  wrap.appendChild(minmax);

  const setValue = (v) => {
    value = nwClampNumber(v, min, max);
    value = nwRoundToStep(value, step);

    valEl.textContent = nwFormatNumberDE(value, 1) + '°C';

    const f = (max > min) ? ((value - min) / (max - min)) : 0;
    const ang = Math.PI - f * Math.PI;
    const x = cx + r * Math.cos(ang);
    const y = cy - r * Math.sin(ang);

    if (f <= 0.001) {
      active.setAttribute('d', '');
    } else {
      active.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
    }

    knob.setAttribute('cx', x.toFixed(2));
    knob.setAttribute('cy', y.toFixed(2));
  };

  const commit = async () => {
    if (!canWrite || !onCommit) return;
    await onCommit(value);
  };

  setValue(value);

  const stop = (ev) => ev.stopPropagation();

  // Buttons
  btnMinus.addEventListener('click', stop);
  btnPlus.addEventListener('click', stop);

  btnMinus.addEventListener('click', async () => {
    if (!canWrite) return;
    setValue(value - step);
    await commit();
  });

  btnPlus.addEventListener('click', async () => {
    if (!canWrite) return;
    setValue(value + step);
    await commit();
  });

  if (!canWrite) {
    btnMinus.disabled = true;
    btnPlus.disabled = true;
    btnMinus.style.opacity = '0.5';
    btnPlus.style.opacity = '0.5';
    btnMinus.style.cursor = 'default';
    btnPlus.style.cursor = 'default';
  }

  const pickFromClient = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const px = (clientX - rect.left) / rect.width * 200;
    const py = (clientY - rect.top) / rect.height * 140;

    const dx = px - cx;
    const dy = cy - py; // invert y
    let ang = Math.atan2(dy, dx); // 0 right, pi left (upper half)
    if (ang < 0) ang = 0;
    if (ang > Math.PI) ang = Math.PI;

    const f = (Math.PI - ang) / Math.PI;
    const v = min + f * (max - min);
    setValue(v);
  };

  const onMouseDown = (ev) => {
    if (!canWrite) return;
    ev.preventDefault();
    ev.stopPropagation();
    nwPopoverDragging = true;

    pickFromClient(ev.clientX, ev.clientY);

    const move = (e) => pickFromClient(e.clientX, e.clientY);
    const up = async () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      nwPopoverDragging = false;
      await commit();
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const onTouchStart = (ev) => {
    if (!canWrite) return;
    if (!ev.touches || !ev.touches.length) return;

    ev.preventDefault();
    ev.stopPropagation();
    nwPopoverDragging = true;

    pickFromClient(ev.touches[0].clientX, ev.touches[0].clientY);

    const move = (e) => {
      if (!e.touches || !e.touches.length) return;
      pickFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };

    const end = async () => {
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      nwPopoverDragging = false;
      await commit();
    };

    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
  };

  hit.addEventListener('mousedown', onMouseDown);
  hit.addEventListener('touchstart', onTouchStart, { passive: false });

  return wrap;
}


function nwCreateHalfDial(opts) {
  const min = Number(opts && opts.min);
  const max = Number(opts && opts.max);
  const step = Number(opts && opts.step) || 0.5;
  const canWrite = !!(opts && opts.canWrite);
  const subtitle = (opts && typeof opts.subtitle === 'string') ? opts.subtitle : '';
  const sub2 = (opts && typeof opts.sub2 === 'string') ? opts.sub2 : '';
  const onCommit = (opts && typeof opts.onCommit === 'function') ? opts.onCommit : null;

  let value = Number(opts && opts.value);
  if (!Number.isFinite(value)) value = min;
  value = nwClampNumber(value, min, max);
  value = nwRoundToStep(value, step);

  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-dial';

  const valEl = document.createElement('div');
  valEl.className = 'nw-sh-dial__value';

  const subEl = document.createElement('div');
  subEl.className = 'nw-sh-dial__sub';
  subEl.textContent = subtitle || '';

  const sub2El = document.createElement('div');
  sub2El.className = 'nw-sh-dial__sub';
  sub2El.style.opacity = '0.85';
  sub2El.textContent = sub2 || '';

  // SVG dial
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.setAttribute('role', 'img');

  const base = document.createElementNS(NS, 'path');
  base.setAttribute('d', 'M 20 100 A 80 80 0 0 0 180 100');
  base.setAttribute('fill', 'none');
  base.setAttribute('stroke', 'rgba(148,163,184,0.28)');
  base.setAttribute('stroke-width', '12');
  base.setAttribute('stroke-linecap', 'round');

  const active = document.createElementNS(NS, 'path');
  active.setAttribute('fill', 'none');
  active.setAttribute('stroke', 'var(--sh-accent)');
  active.setAttribute('stroke-width', '12');
  active.setAttribute('stroke-linecap', 'round');

  const knob = document.createElementNS(NS, 'circle');
  knob.setAttribute('r', '10');
  knob.setAttribute('fill', 'var(--sh-accent)');
  knob.setAttribute('stroke', 'rgba(2,6,23,0.65)');
  knob.setAttribute('stroke-width', '3');

  svg.appendChild(base);
  svg.appendChild(active);
  svg.appendChild(knob);

  const minMax = document.createElement('div');
  minMax.className = 'nw-sh-dial__minmax';
  minMax.innerHTML = `<span>${nwFormatNumberDE(min, 1)}°C</span><span>${nwFormatNumberDE(max, 1)}°C</span>`;

  const cx = 100;
  const cy = 100;
  const r = 80;

  const setValue = (v) => {
    value = nwClampNumber(nwRoundToStep(v, step), min, max);
    valEl.textContent = nwFormatNumberDE(value, 1) + '°C';

    const f = (max - min) > 0 ? ((value - min) / (max - min)) : 0;
    const angle = Math.PI * (1 - f); // pi (links) -> 0 (rechts)

    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);

    active.setAttribute('d', `M 20 100 A 80 80 0 0 0 ${x.toFixed(2)} ${y.toFixed(2)}`);
    knob.setAttribute('cx', x.toFixed(2));
    knob.setAttribute('cy', y.toFixed(2));
  };

  setValue(value);

  // Pointer events
  const posToValue = (ev) => {
    const rect = svg.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return value;

    const px = (ev.clientX - rect.left) / rect.width * 200;
    const py = (ev.clientY - rect.top) / rect.height * 120;

    const dx = px - cx;
    const dy = cy - py; // nach oben positiv

    let ang = Math.atan2(dy, dx); // 0..pi für oberen Halbkreis
    if (!Number.isFinite(ang)) ang = 0;

    // clamp to [0, pi]
    ang = Math.max(0, Math.min(Math.PI, ang));

    const f = 1 - (ang / Math.PI);
    const v = min + f * (max - min);
    return v;
  };

  const onDown = (ev) => {
    if (!canWrite) return;
    nwPopoverDragging = true;
    svg.setPointerCapture(ev.pointerId);
    setValue(posToValue(ev));
    ev.preventDefault();
    ev.stopPropagation();
  };

  const onMove = (ev) => {
    if (!canWrite) return;
    if (!nwPopoverDragging) return;
    setValue(posToValue(ev));
    ev.preventDefault();
    ev.stopPropagation();
  };

  const onUp = async (ev) => {
    if (!canWrite) return;
    if (!nwPopoverDragging) return;
    nwPopoverDragging = false;
    try { svg.releasePointerCapture(ev.pointerId); } catch (_e) {}
    setValue(posToValue(ev));

    if (onCommit) {
      const v = value;
      await onCommit(v);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', () => { nwPopoverDragging = false; });

  // Accessibility hint
  if (!canWrite) svg.style.opacity = '0.6';

  wrap.appendChild(valEl);
  if (subtitle) wrap.appendChild(subEl);
  if (sub2) wrap.appendChild(sub2El);
  wrap.appendChild(svg);
  wrap.appendChild(minMax);

  return wrap;
}

function nwRenderRooms(devices) {
  const wrap = document.getElementById('nw-smarthome-rooms');
  if (!wrap) return;
  nwClear(wrap);

  const groups = nwGroupByRoom(devices);

  groups.forEach(g => {
    const section = document.createElement('section');
    section.className = 'nw-sh-room';

    const header = document.createElement('div');
    header.className = 'nw-sh-room__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-room__title';
    title.textContent = g.room;

    header.appendChild(title);

    // Small room summary (e.g. temperature / humidity) based on all devices in that room.
    const summaryText = nwComputeRoomSummary(g.room, nwAllDevices);
    if (summaryText) {
      const summary = document.createElement('div');
      summary.className = 'nw-sh-room__summary';
      summary.textContent = summaryText;
      header.appendChild(summary);
    }
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'nw-sh-grid';

    // stable ordering inside room
    const arr = (g.devices || []).slice();
    arr.sort((a, b) => {
      const oa = (typeof a.order === 'number') ? a.order : (typeof a.ui?.order === 'number' ? a.ui.order : 0);
      const ob = (typeof b.order === 'number') ? b.order : (typeof b.ui?.order === 'number' ? b.ui.order : 0);
      if (oa !== ob) return oa - ob;
      return nwSortBy(a.alias || a.id, b.alias || b.id);
    });

    arr.forEach(dev => {
      grid.appendChild(nwCreateTile(dev));
    });

    section.appendChild(grid);
    wrap.appendChild(section);
  });
}

function nwApplyFiltersAndRender() {
  const filtered = nwApplyFilters(nwAllDevices);

  // chips always based on all devices (so user can clear filters)
  nwRenderFunctionChips(nwAllDevices);

  if (!filtered.length) {
    if (!nwAllDevices.length) {
      nwShowEmptyState(true, { enabled: nwSmartHomeEnabled, reason: 'empty' });
    } else {
      nwShowEmptyState(true, { reason: 'filtered' });
    }
    return;
  }

  nwShowEmptyState(false);
  nwRenderRooms(filtered);
}

// ---------- Auto refresh + bootstrap ----------

async function nwReloadDevices(opts) {
  if (nwReloadInFlight) return;
  nwReloadInFlight = true;
  try {
    const devices = await nwFetchDevices();
    const arr = Array.isArray(devices) ? devices : [];
    const sig = JSON.stringify(arr) + '|' + String(nwSmartHomeEnabled);
    const force = !!(opts && opts.force);

    if (!force && sig === nwLastDevicesSignature) return;

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

function nwInitMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menuDropdown');
  if (menuBtn && menu) {
    const close = () => menu.classList.add('hidden');
    const toggle = () => menu.classList.toggle('hidden');
    menuBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    menu.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', () => close());
  }
}

async function nwLoadUiConfigFlags() {
  try {
    const cfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());

    nwEvcsCount = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    nwSmartHomeEnabled = !!(cfg.smartHome && cfg.smartHome.enabled);

    // EVCS visibility
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', nwEvcsCount < 2);
    const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', nwEvcsCount < 2);

    // SmartHome menu item
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !nwSmartHomeEnabled);
  } catch (_e) {
    // ignore
  }
}

async function nwBootstrap() {
  nwInitMenu();
  await nwLoadUiConfigFlags();

  await nwReloadDevices({ force: true });
  nwStartAutoRefresh(5000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      nwStopAutoRefresh();
      return;
    }
    nwLoadUiConfigFlags().then(() => {
      nwReloadDevices({ force: true });
      nwStartAutoRefresh(5000);
    });
  });
}

document.addEventListener('DOMContentLoaded', nwBootstrap);
