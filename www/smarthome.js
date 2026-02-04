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

// Endkunden-Favoriten: pro Browser (LocalStorage) – überschreibt optionale Installer-Defaults.
// Map: { [deviceId]: boolean }
let nwFavoriteOverrides = {};

// --- Player (Audio) UX state in Browser-LocalStorage ---
// Multiroom: welche Zonen werden gemeinsam gesteuert?
const NW_LS_SH_AUDIO_ZONES = 'nw_sh_audio_zones_sel';
// Favoriten / Zuletzt pro Player
const NW_LS_SH_PLAYER_FAVS_PREFIX = 'nw_sh_player_favs_'; // + kind + '_' + devId
const NW_LS_SH_PLAYER_RECENT_PREFIX = 'nw_sh_player_recent_'; // + devId

function nwLsReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function nwLsWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

function nwGetAllPlayerZones() {
  return Array.isArray(nwAllDevices)
    ? nwAllDevices.filter((d) => d && d.type === 'player')
    : [];
}

function nwLoadAudioZoneSelection() {
  const ids = nwLsReadJson(NW_LS_SH_AUDIO_ZONES, []);
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

function nwSaveAudioZoneSelection(ids) {
  const arr = Array.isArray(ids) ? ids.filter(Boolean) : [];
  nwLsWriteJson(NW_LS_SH_AUDIO_ZONES, arr);
}

function nwGetSelectedAudioZones(primaryId) {
  const all = nwGetAllPlayerZones().map((d) => d.id);
  let sel = nwLoadAudioZoneSelection().filter((id) => all.includes(id));
  if (!sel.length) sel = primaryId ? [primaryId] : [];
  if (primaryId && !sel.includes(primaryId)) sel.unshift(primaryId);
  return sel;
}

function nwSetSelectedAudioZones(ids, primaryId) {
  let arr = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!arr.length && primaryId) arr = [primaryId];
  if (primaryId && !arr.includes(primaryId)) arr.unshift(primaryId);
  nwSaveAudioZoneSelection(arr);
  return arr;
}

function nwPlayerFavKey(devId, kind) {
  return NW_LS_SH_PLAYER_FAVS_PREFIX + String(kind || 'station') + '_' + String(devId || '');
}

function nwLoadPlayerFavs(devId, kind) {
  const arr = nwLsReadJson(nwPlayerFavKey(devId, kind), []);
  return Array.isArray(arr) ? arr.map((v) => String(v)) : [];
}

function nwSavePlayerFavs(devId, kind, favs) {
  const arr = Array.isArray(favs) ? favs.map((v) => String(v)) : [];
  nwLsWriteJson(nwPlayerFavKey(devId, kind), arr);
}

function nwTogglePlayerFav(devId, kind, value) {
  const v = String(value);
  const favs = nwLoadPlayerFavs(devId, kind);
  const idx = favs.indexOf(v);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(v);
  }
  nwSavePlayerFavs(devId, kind, favs);
  return favs;
}

function nwMovePlayerFav(devId, kind, value, dir) {
  const v = String(value);
  const favs = nwLoadPlayerFavs(devId, kind);
  const i = favs.indexOf(v);
  if (i < 0) return favs;
  const j = i + (dir === 'up' ? -1 : 1);
  if (j < 0 || j >= favs.length) return favs;
  const tmp = favs[i];
  favs[i] = favs[j];
  favs[j] = tmp;
  nwSavePlayerFavs(devId, kind, favs);
  return favs;
}

function nwPlayerRecentKey(devId) {
  return NW_LS_SH_PLAYER_RECENT_PREFIX + String(devId || '');
}

function nwLoadPlayerRecent(devId) {
  const arr = nwLsReadJson(nwPlayerRecentKey(devId), []);
  return Array.isArray(arr) ? arr : [];
}

function nwAddPlayerRecent(devId, item) {
  const list = nwLoadPlayerRecent(devId);
  const entry = {
    kind: item && item.kind ? String(item.kind) : 'station',
    name: item && item.name ? String(item.name) : '',
    value: item && (typeof item.value === 'string' || typeof item.value === 'number') ? String(item.value) : '',
    ts: Date.now(),
  };
  // de-duplicate by kind+value
  const key = entry.kind + '::' + entry.value;
  const filtered = list.filter((e) => (e && (String(e.kind) + '::' + String(e.value))) !== key);
  filtered.unshift(entry);
  const max = 10;
  const out = filtered.slice(0, max);
  nwLsWriteJson(nwPlayerRecentKey(devId), out);
  return out;
}

let nwSmartHomeEnabled = null;
let nwEvcsCount = 1;

// Ansicht (persistiert pro Browser)
// - rooms: Standard (wie bisher)
// - functions: gruppiert nach "Funktionen" statt nach Räumen
const NW_SH_VIEW_MODE_LS_KEY = 'nw_sh_view_mode';
const nwViewState = {
  mode: 'rooms',
};

const nwFilterState = {
  func: null,        // string | null
  favoritesOnly: false,
  favoritesFirst: false, // Favoriten in Räumen nach oben sortieren
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

// Helper: return the raw SVG string for a given icon name.
// Used for filter chips and section headers (no external icon libs).
function nwGetIconSvg(name, isOn) {
  const n = String(name || '').trim().toLowerCase();
  const variant = isOn ? 'on' : 'off';

  if (n && NW_ICON_SVGS[n] && NW_ICON_SVGS[n][variant]) return NW_ICON_SVGS[n][variant];
  if (NW_ICON_SVGS.generic && NW_ICON_SVGS.generic[variant]) return NW_ICON_SVGS.generic[variant];
  return '';
}

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
  if (type === 'player') return 'speaker';
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
  if (type === 'player') {
    if (typeof st.playing !== 'undefined') return !!st.playing;
    return !!st.on;
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
  if (type === 'player') {
    const title = String(st.title || '').trim();
    const artist = String(st.artist || '').trim();
    const source = String(st.source || '').trim();
    let line = '';
    if (title && artist) line = title + ' – ' + artist;
    else if (title) line = title;
    else if (artist) line = artist;
    else line = st.on ? 'Spielt' : 'Pausiert';
    if (source) {
      line = line ? (line + ' · ' + source) : source;
    }
    return line;
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

async function nwPlayerAction(id, action, value) {
  const body = { id, action };
  if (typeof value !== 'undefined') body.value = value;

  const res = await fetch('/api/smarthome/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}

// Multiroom (UI-seitig): dieselbe Aktion auf mehrere Player-Zonen anwenden
async function nwPlayerActionMulti(primaryId, action, value) {
  const zones = nwGetSelectedAudioZones(primaryId);
  const unique = Array.from(new Set(zones));
  let lastState = null;
  for (const zid of unique) {
    try {
      lastState = await nwPlayerAction(zid, action, value);
    } catch (e) {
      // ignore individual zone errors
    }
  }
  return lastState;
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
    out = out.filter(d => nwIsFavorite(d));
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

function nwGuessIconForFunctionLabel(label) {
  const s = String(label || '').toLowerCase();
  if (!s) return null;

  if (s.includes('licht') || s.includes('beleuchtung') || s.includes('lampe') || s.includes('leuchte')) return 'bulb';
  if (s.includes('jalous') || s.includes('roll') || s.includes('blind') || s.includes('raff')) return 'blinds';
  if (s.includes('temp') || s.includes('heiz') || s.includes('klima') || s.includes('thermost')) return 'thermostat';
  if (s.includes('steck') || s.includes('schalt') || s.includes('dose') || s.includes('strom') || s.includes('power')) return 'plug';
  if (s.includes('tv') || s.includes('fernseh')) return 'tv';
  if (s.includes('audio') || s.includes('musik') || s.includes('laut')) return 'speaker';
  return null;
}

function nwRenderViewChips() {
  const wrap = document.getElementById('nw-filter-view');
  if (!wrap) return;
  nwClear(wrap);

  const mkChip = (label, active, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      onClick();
      nwApplyFiltersAndRender();
    });
    wrap.appendChild(btn);
  };

  mkChip('Räume', nwViewState.mode === 'rooms', () => {
    nwViewState.mode = 'rooms';
    nwSaveViewMode(nwViewState.mode);
  });

  mkChip('Funktionen', nwViewState.mode === 'functions', () => {
    nwViewState.mode = 'functions';
    nwSaveViewMode(nwViewState.mode);
  });
}

function nwRenderFunctionChips(devices) {
  const wrap = document.getElementById('nw-filter-functions');
  if (!wrap) return;
  nwClear(wrap);

  const allFns = nwGetAllFunctions(devices);
  const hasFav = (devices || []).some(d => nwIsFavorite(d));

  const mkChip = (label, active, onClick, extraClass, disabled, title, iconName) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '') + (extraClass ? ' ' + extraClass : '');
    if (iconName) {
      btn.innerHTML = `<span class="nw-sh-chip__icon">${nwGetIconSvg(iconName, false)}</span><span class="nw-sh-chip__label"></span>`;
      const lbl = btn.querySelector('.nw-sh-chip__label');
      if (lbl) lbl.textContent = label;
    } else {
      btn.textContent = label;
    }
    if (title) btn.title = title;
    if (disabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      onClick();
      nwApplyFiltersAndRender();
    });
    wrap.appendChild(btn);
  };

  mkChip('Alle', !nwFilterState.func && !nwFilterState.favoritesOnly, () => {
    nwFilterState.func = null;
    nwFilterState.favoritesOnly = false;
  });

  // Favoriten (Schnellzugriff)
  mkChip('★ Favoriten', !!nwFilterState.favoritesOnly, () => {
    if (!hasFav) return;
    nwFilterState.favoritesOnly = !nwFilterState.favoritesOnly;
    if (nwFilterState.favoritesOnly) nwFilterState.func = null;
  }, null, !hasFav, hasFav
    ? 'Nur Favoriten anzeigen'
    : 'Keine Favoriten gesetzt. Tipp: Stern ★ in einer Kachel anklicken.');

  mkChip('★ zuerst', !!nwFilterState.favoritesFirst, () => {
    if (!hasFav) return;
    nwFilterState.favoritesFirst = !nwFilterState.favoritesFirst;
    nwSaveBoolLS(NW_SH_FAVORITES_FIRST_LS_KEY, nwFilterState.favoritesFirst);
  }, 'nw-sh-chip--mini', !hasFav, hasFav
    ? 'Favoriten in Räumen nach oben sortieren'
    : 'Keine Favoriten gesetzt.');


  allFns.forEach(fn => {
    const ic = nwGuessIconForFunctionLabel(fn);
    mkChip(fn, nwFilterState.func === fn, () => {
      if (nwFilterState.func === fn) nwFilterState.func = null;
      else nwFilterState.func = fn;
      nwFilterState.favoritesOnly = false;
    }, null, false, null, ic);
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

function nwGroupByFunction(devices) {
  const map = new Map();
  (devices || []).forEach(d => {
    const fn = String(d.function || '').trim() || 'Ohne Funktion';
    if (!map.has(fn)) map.set(fn, []);
    map.get(fn).push(d);
  });

  const fns = Array.from(map.keys()).sort(nwSortBy);
  return fns.map(fn => ({ func: fn, devices: map.get(fn) || [] }));
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

function nwCreateTile(dev, opts) {
  const type = String(dev.type || '').toLowerCase();
  const size = nwGetTileSize(dev);
  const isOn = nwIsOn(dev);
  const canWrite = nwHasWriteAccess(dev);
  const isFav = nwIsFavorite(dev);

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
    isFav ? 'nw-sh-tile--favorite' : '',
    (dev.state && dev.state.error) ? 'nw-sh-tile--error' : '',
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
  const baseStateText = nwGetStateText(dev);
  const roomLabel = (opts && opts.showRoom) ? String(dev.room || '').trim() : '';
  state.textContent = roomLabel ? `${roomLabel} · ${baseStateText}` : baseStateText;

  titleWrap.appendChild(name);
  titleWrap.appendChild(state);

  header.appendChild(icon);
  header.appendChild(titleWrap);

  // Actions (top-right): Favorite (Endkunde) + optional details
  const actions = document.createElement('div');
  actions.className = 'nw-sh-tile__actions';

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'nw-sh-favbtn' + (isFav ? ' nw-sh-favbtn--active' : '');
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.title = isFav ? 'Favorit entfernen' : 'Als Favorit markieren';
  favBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    nwToggleFavorite(dev);
    nwApplyFiltersAndRender();
  });
  actions.appendChild(favBtn);

  // Detail/Tooltip-Popover (für Dimmer/Jalousie/RTR)
  const hasDetails = (type === 'dimmer' || type === 'blind' || type === 'rtr' || type === 'player');
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
    actions.appendChild(more);
  }

  header.appendChild(actions);

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

  // Tap actions (switch / dimmer / scene / player)
  tile.addEventListener('click', async () => {
    if (!canWrite) return;
    if (type !== 'switch' && type !== 'dimmer' && type !== 'scene' && type !== 'player') return;
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

// Visual fill for <input type="range"> sliders (Premium UX).
// We write a CSS variable (--nw-range-fill) with the percentage.
// CSS then renders an accent-colored progress track.
function nwUpdateRangeFill(rangeEl) {
  if (!rangeEl) return;
  const min = Number(rangeEl.min);
  const max = Number(rangeEl.max);
  const val = Number(rangeEl.value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(val) || max <= min) return;
  const pct = ((val - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  rangeEl.style.setProperty('--nw-range-fill', clamped.toFixed(2) + '%');
}

// Live-preview toggle (Dimmer/Jalousie): write while dragging (throttled).
// This is optional and can be enabled/disabled by the user in the popover.
const NW_SH_LIVE_PREVIEW_LS_KEY = 'nw_sh_live_preview';
const NW_SH_LIVE_PREVIEW_DEFAULT = true;
const NW_SH_LIVE_PREVIEW_THROTTLE_MS = 200; // max ~5 writes/s while dragging

// SmartHome Tooltip/Popover: step controls for sliders (Dimmer/Jalousie)
const NW_SH_STEP_DIMMER_LS_KEY = 'nw_sh_step_dimmer';
const NW_SH_STEP_BLIND_LS_KEY = 'nw_sh_step_blind';
const NW_SH_STEP_DEFAULT = 5;

// SmartHome: Favoriten (Schnellzugriff)
const NW_SH_FAVORITES_FIRST_LS_KEY = 'nw_sh_favorites_first';
const NW_SH_FAVORITES_FIRST_DEFAULT = false;

// SmartHome: Favoriten pro Endkunde (LocalStorage Overrides)
// - Key enthält nur Overrides (Abweichungen) gegenüber dem Installer-Default.
// - Kunde kann in der Kachel per Stern ★ umschalten.
const NW_SH_FAVORITES_OVERRIDES_LS_KEY = 'nw_sh_favorites_overrides_v1';

function nwLoadJsonLS(key, defVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defVal;
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj;
    return defVal;
  } catch (_e) {
    return defVal;
  }
}

function nwSaveJsonLS(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj || {}));
  } catch (_e) {}
}

function nwLoadFavoriteOverrides() {
  const obj = nwLoadJsonLS(NW_SH_FAVORITES_OVERRIDES_LS_KEY, {});
  // sanitize to {string:boolean}
  const out = {};
  try {
    Object.keys(obj || {}).forEach((k) => {
      const v = obj[k];
      if (typeof v === 'boolean') out[String(k)] = v;
    });
  } catch (_e) {}
  return out;
}

function nwSaveFavoriteOverrides(map) {
  nwSaveJsonLS(NW_SH_FAVORITES_OVERRIDES_LS_KEY, map || {});
}

function nwGetInstallerFavorite(dev) {
  return !!(dev && dev.behavior && dev.behavior.favorite);
}

function nwIsFavorite(dev) {
  const id = String(dev && dev.id || '');
  if (!id) return false;
  const ov = nwFavoriteOverrides && Object.prototype.hasOwnProperty.call(nwFavoriteOverrides, id)
    ? nwFavoriteOverrides[id]
    : undefined;
  if (typeof ov === 'boolean') return ov;
  return nwGetInstallerFavorite(dev);
}

function nwToggleFavorite(dev) {
  if (!dev || !dev.id) return;
  const id = String(dev.id);
  const base = nwGetInstallerFavorite(dev);
  const next = !nwIsFavorite(dev);

  // Store only the delta to keep the overrides small.
  if (next === base) {
    if (nwFavoriteOverrides && Object.prototype.hasOwnProperty.call(nwFavoriteOverrides, id)) {
      delete nwFavoriteOverrides[id];
    }
  } else {
    nwFavoriteOverrides[id] = next;
  }
  nwSaveFavoriteOverrides(nwFavoriteOverrides);
}

function nwLoadNumberLS(key, defVal) {
  try {
    const v = localStorage.getItem(key);
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return Number(defVal);
  } catch (_e) {
    return Number(defVal);
  }
}

function nwSaveNumberLS(key, val) {
  try {
    localStorage.setItem(key, String(val));
  } catch (_e) {}
}

function nwCreateStatusBadge() {
  const el = document.createElement('div');
  el.className = 'nw-sh-popover__status hidden';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  return el;
}

function nwSetStatusBadge(el, kind, text) {
  if (!el) return;
  el.classList.remove('hidden', 'nw-sh-popover__status--busy', 'nw-sh-popover__status--ok', 'nw-sh-popover__status--err');
  if (!kind) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = text || '';
  if (kind === 'busy') el.classList.add('nw-sh-popover__status--busy');
  if (kind === 'ok') el.classList.add('nw-sh-popover__status--ok');
  if (kind === 'err') el.classList.add('nw-sh-popover__status--err');
}

function nwLoadBoolLS(key, defVal) {
  try {
    const v = localStorage.getItem(key);
    if (v === null || v === undefined) return !!defVal;
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
    return !!defVal;
  } catch (_e) {
    return !!defVal;
  }
}

function nwSaveBoolLS(key, val) {
  try {
    localStorage.setItem(key, val ? '1' : '0');
  } catch (_e) {}
}

function nwLoadViewMode(defMode) {
  try {
    const v = String(localStorage.getItem(NW_SH_VIEW_MODE_LS_KEY) || '').trim().toLowerCase();
    if (v === 'functions' || v === 'funktion' || v === 'funktionen') return 'functions';
    if (v === 'rooms' || v === 'room' || v === 'raeume' || v === 'räume') return 'rooms';
  } catch (_e) {}
  return (defMode === 'functions') ? 'functions' : 'rooms';
}

function nwSaveViewMode(mode) {
  try {
    localStorage.setItem(NW_SH_VIEW_MODE_LS_KEY, (mode === 'functions') ? 'functions' : 'rooms');
  } catch (_e) {}
}

// Create a throttled sender for live-preview updates.
// - max one send every `intervalMs` (leading+trailing)
// - avoids overlapping requests: keeps only the last pending value
function nwCreateLivePreviewSender(sendFn, intervalMs) {
  let lastSentAt = 0;
  let lastSentVal = null;
  let pendingVal = null;
  let timer = null;
  let inFlight = false;
  let forceNext = false;

  function schedule() {
    if (inFlight) return;
    if (pendingVal === null || pendingVal === undefined) return;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    const now = Date.now();
    const wait = forceNext ? 0 : Math.max(0, intervalMs - (now - lastSentAt));

    timer = setTimeout(async () => {
      timer = null;
      if (inFlight) return;
      if (pendingVal === null || pendingVal === undefined) return;

      const val = pendingVal;
      pendingVal = null;
      const doForce = forceNext;
      forceNext = false;

      // Skip duplicate writes.
      if (val === lastSentVal) {
        schedule();
        return;
      }

      lastSentAt = Date.now();
      lastSentVal = val;
      inFlight = true;
      try {
        await sendFn(val);
      } catch (_e) {}
      inFlight = false;

      // If new pending value arrived during the request, send it next.
      if (pendingVal !== null && pendingVal !== undefined && pendingVal !== lastSentVal) {
        schedule();
      }
    }, wait);
  }

  function trigger(val, force) {
    pendingVal = val;
    if (force) forceNext = true;
    schedule();
  }

  return { trigger };
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
  } else if (type === 'player') {
    body.appendChild(nwCreatePlayerPopover(dev, canWrite));
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

  // Live-preview toggle (throttled writes while dragging)
  let livePreview = nwLoadBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, NW_SH_LIVE_PREVIEW_DEFAULT);
  const liveSender = (hasWrite)
    ? nwCreateLivePreviewSender(async (val) => { await nwSetLevel(dev.id, val); }, NW_SH_LIVE_PREVIEW_THROTTLE_MS)
    : null;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = Math.round(current) + ' %';

  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';
  right.appendChild(v);

  // Write feedback (Senden/OK/Fehler) – small and non-intrusive.
  const status = nwCreateStatusBadge();
  right.appendChild(status);

  let statusTimer = null;
  function clearStatusTimer() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  }
  function flashStatus(kind, text, ms) {
    clearStatusTimer();
    nwSetStatusBadge(status, kind, text);
    if (ms && ms > 0) {
      statusTimer = setTimeout(() => {
        nwSetStatusBadge(status, null, '');
        statusTimer = null;
      }, ms);
    }
  }
  function setBusy() { flashStatus('busy', 'Senden…'); }
  function setOk() { flashStatus('ok', 'OK', 1100); }
  function setErr() { flashStatus('err', 'Fehler', 1600); }

  let liveBtn = null;
  if (hasWrite) {
    liveBtn = document.createElement('button');
    liveBtn.type = 'button';
    liveBtn.className = 'nw-sh-chip nw-sh-chip--mini' + (livePreview ? ' nw-sh-chip--active' : '');
    liveBtn.textContent = 'Live';
    liveBtn.title = 'Live-Vorschau beim Ziehen (gedrosselt)';
    liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
    liveBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      livePreview = !livePreview;
      nwSaveBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, livePreview);
      liveBtn.classList.toggle('nw-sh-chip--active', livePreview);
      liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
      updateHint();
    });
    right.appendChild(liveBtn);
  }

  row.appendChild(l);
  row.appendChild(right);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(nwClampNumber(current, min, max));
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !hasWrite;

  // Premium: colored progress track.
  nwUpdateRangeFill(slider);

  // Helper: commit a new value (writes once + reload) with feedback.
  async function commitLevel(nextVal, opts) {
    const options = opts || {};
    const showStatus = (options.showStatus !== false);
    const reload = (options.reload !== false);

    const clamped = nwClampNumber(nextVal, min, max);
    slider.value = String(clamped);
    v.textContent = Math.round(clamped) + ' %';
    nwUpdateRangeFill(slider);

    if (!hasWrite) return clamped;

    if (showStatus) setBusy();
    const res = await nwSetLevel(dev.id, clamped);
    if (showStatus) {
      if (res === null) setErr();
      else setOk();
    }
    if (reload) await nwReloadDevices({ force: true });
    return clamped;
  }

  slider.addEventListener('click', (ev) => ev.stopPropagation());

  slider.addEventListener('input', (ev) => {
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    v.textContent = Math.round(raw) + ' %';
    nwUpdateRangeFill(slider);

    // Optional: live-preview (throttled) while dragging.
    if (hasWrite && livePreview && liveSender) {
      liveSender.trigger(raw, false);
    }
  });

  slider.addEventListener('change', async (ev) => {
    if (!hasWrite) return;
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    await commitLevel(raw);
  });

  // Presets (quick set): 0/25/50/75/100
  const presets = document.createElement('div');
  presets.className = 'nw-sh-popover__presets';
  const presetVals = [0, 25, 50, 75, 100];
  presetVals.forEach((pv) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip nw-sh-chip--mini';
    b.textContent = pv + '%';
    b.disabled = !hasWrite;
    b.addEventListener('click', (ev) => ev.stopPropagation());
    b.addEventListener('click', async () => {
      if (!hasWrite) return;
      await commitLevel(pv);
    });
    presets.appendChild(b);
  });

  // Step controls: step size (1/5/10) + +/-
  let step = nwLoadNumberLS(NW_SH_STEP_DIMMER_LS_KEY, NW_SH_STEP_DEFAULT);
  if (![1, 5, 10].includes(step)) step = NW_SH_STEP_DEFAULT;

  const stepRow = document.createElement('div');
  stepRow.className = 'nw-sh-popover__steprow';

  const stepLabel = document.createElement('div');
  stepLabel.className = 'nw-sh-popover__label';
  stepLabel.textContent = 'Schritt';

  const stepTools = document.createElement('div');
  stepTools.className = 'nw-sh-popover__steptools';

  const stepChoices = [1, 5, 10];
  const stepBtns = new Map();
  function syncStepBtns() {
    stepChoices.forEach((s) => {
      const btn = stepBtns.get(s);
      if (!btn) return;
      btn.classList.toggle('nw-sh-chip--active', s === step);
      btn.setAttribute('aria-pressed', s === step ? 'true' : 'false');
    });
  }

  const stepChoiceWrap = document.createElement('div');
  stepChoiceWrap.className = 'nw-sh-popover__stepchoices';
  stepChoices.forEach((s) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'nw-sh-chip nw-sh-chip--mini';
    c.textContent = String(s);
    c.title = 'Schrittweite ' + s;
    c.disabled = !hasWrite;
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', (ev) => ev.stopPropagation());
    c.addEventListener('click', () => {
      if (!hasWrite) return;
      step = s;
      nwSaveNumberLS(NW_SH_STEP_DIMMER_LS_KEY, step);
      syncStepBtns();
    });
    stepBtns.set(s, c);
    stepChoiceWrap.appendChild(c);
  });
  syncStepBtns();

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'nw-sh-btn nw-sh-btn--mini';
  minus.textContent = '−';
  minus.title = 'Wert verringern';
  minus.disabled = !hasWrite;
  minus.addEventListener('click', (ev) => ev.stopPropagation());
  minus.addEventListener('click', async () => {
    if (!hasWrite) return;
    const cur = Number(slider.value);
    await commitLevel(cur - step);
  });

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'nw-sh-btn nw-sh-btn--mini';
  plus.textContent = '+';
  plus.title = 'Wert erhöhen';
  plus.disabled = !hasWrite;
  plus.addEventListener('click', (ev) => ev.stopPropagation());
  plus.addEventListener('click', async () => {
    if (!hasWrite) return;
    const cur = Number(slider.value);
    await commitLevel(cur + step);
  });

  stepTools.appendChild(stepChoiceWrap);
  stepTools.appendChild(minus);
  stepTools.appendChild(plus);

  stepRow.appendChild(stepLabel);
  stepRow.appendChild(stepTools);

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';

  function updateHint() {
    if (!hasWrite) {
      hint.textContent = 'Nur Anzeige (keine Schreib‑DP / writeId konfiguriert).';
      return;
    }
    hint.textContent = livePreview
      ? 'Live-Vorschau: AN (gedrosselt). Beim Loslassen wird der Wert final übernommen.'
      : 'Tipp: Regler ziehen – Wert wird beim Loslassen übernommen.';
  }

  updateHint();

  wrap.appendChild(row);
  wrap.appendChild(slider);
  wrap.appendChild(presets);
  wrap.appendChild(stepRow);
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
    setBusy();
    const res = await nwToggleDevice(dev.id);
    if (res === null) setErr();
    else setOk();
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

  // Live-preview toggle (throttled writes while dragging)
  let livePreview = nwLoadBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, NW_SH_LIVE_PREVIEW_DEFAULT);
  const liveSender = (hasWrite)
    ? nwCreateLivePreviewSender(async (val) => { await nwSetLevel(dev.id, val); }, NW_SH_LIVE_PREVIEW_THROTTLE_MS)
    : null;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = 'Position';

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = Math.round(current) + ' %';

  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';
  right.appendChild(v);

  // Write feedback (Senden/OK/Fehler)
  const status = nwCreateStatusBadge();
  right.appendChild(status);
  let statusTimer = null;
  function clearStatusTimer() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  }
  function flashStatus(kind, text, ms) {
    clearStatusTimer();
    nwSetStatusBadge(status, kind, text);
    if (ms && ms > 0) {
      statusTimer = setTimeout(() => {
        nwSetStatusBadge(status, null, '');
        statusTimer = null;
      }, ms);
    }
  }
  function setBusy() { flashStatus('busy', 'Senden…'); }
  function setOk() { flashStatus('ok', 'OK', 1100); }
  function setErr() { flashStatus('err', 'Fehler', 1600); }

  if (hasWrite) {
    const liveBtn = document.createElement('button');
    liveBtn.type = 'button';
    liveBtn.className = 'nw-sh-chip nw-sh-chip--mini' + (livePreview ? ' nw-sh-chip--active' : '');
    liveBtn.textContent = 'Live';
    liveBtn.title = 'Live-Vorschau beim Ziehen (gedrosselt)';
    liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
    liveBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      livePreview = !livePreview;
      nwSaveBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, livePreview);
      liveBtn.classList.toggle('nw-sh-chip--active', livePreview);
      liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
      updateHint();
    });
    right.appendChild(liveBtn);
  }

  row.appendChild(l);
  row.appendChild(right);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(nwClampNumber(current, min, max));
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !hasWrite;

  // Premium: colored progress track.
  nwUpdateRangeFill(slider);

  // Helper: commit a new value (writes once + reload) with feedback.
  async function commitPos(nextVal, opts) {
    const options = opts || {};
    const showStatus = (options.showStatus !== false);
    const reload = (options.reload !== false);

    const clamped = nwClampNumber(nextVal, min, max);
    slider.value = String(clamped);
    v.textContent = Math.round(clamped) + ' %';
    nwUpdateRangeFill(slider);

    if (!hasWrite) return clamped;

    if (showStatus) setBusy();
    const res = await nwSetLevel(dev.id, clamped);
    if (showStatus) {
      if (res === null) setErr();
      else setOk();
    }
    if (reload) await nwReloadDevices({ force: true });
    return clamped;
  }

  slider.addEventListener('click', (ev) => ev.stopPropagation());

  slider.addEventListener('input', (ev) => {
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    v.textContent = Math.round(raw) + ' %';
    nwUpdateRangeFill(slider);

    // Optional: live-preview (throttled) while dragging.
    if (hasWrite && livePreview && liveSender) {
      liveSender.trigger(raw, false);
    }
  });

  slider.addEventListener('change', async (ev) => {
    if (!hasWrite) return;
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    await commitPos(raw);
  });

  // Presets (quick set): 0/50/100
  const presets = document.createElement('div');
  presets.className = 'nw-sh-popover__presets';
  const presetVals = [0, 50, 100];
  presetVals.forEach((pv) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip nw-sh-chip--mini';
    b.textContent = pv + '%';
    b.disabled = !hasWrite;
    b.addEventListener('click', (ev) => ev.stopPropagation());
    b.addEventListener('click', async () => {
      if (!hasWrite) return;
      await commitPos(pv);
    });
    presets.appendChild(b);
  });

  // Step controls: step size (1/5/10) + +/-
  let step = nwLoadNumberLS(NW_SH_STEP_BLIND_LS_KEY, NW_SH_STEP_DEFAULT);
  if (![1, 5, 10].includes(step)) step = NW_SH_STEP_DEFAULT;

  const stepRow = document.createElement('div');
  stepRow.className = 'nw-sh-popover__steprow';

  const stepLabel = document.createElement('div');
  stepLabel.className = 'nw-sh-popover__label';
  stepLabel.textContent = 'Schritt';

  const stepTools = document.createElement('div');
  stepTools.className = 'nw-sh-popover__steptools';

  const stepChoices = [1, 5, 10];
  const stepBtns = new Map();
  function syncStepBtns() {
    stepChoices.forEach((s) => {
      const btn = stepBtns.get(s);
      if (!btn) return;
      btn.classList.toggle('nw-sh-chip--active', s === step);
      btn.setAttribute('aria-pressed', s === step ? 'true' : 'false');
    });
  }

  const stepChoiceWrap = document.createElement('div');
  stepChoiceWrap.className = 'nw-sh-popover__stepchoices';
  stepChoices.forEach((s) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'nw-sh-chip nw-sh-chip--mini';
    c.textContent = String(s);
    c.title = 'Schrittweite ' + s;
    c.disabled = !hasWrite;
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', (ev) => ev.stopPropagation());
    c.addEventListener('click', () => {
      if (!hasWrite) return;
      step = s;
      nwSaveNumberLS(NW_SH_STEP_BLIND_LS_KEY, step);
      syncStepBtns();
    });
    stepBtns.set(s, c);
    stepChoiceWrap.appendChild(c);
  });
  syncStepBtns();

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'nw-sh-btn nw-sh-btn--mini';
  minus.textContent = '−';
  minus.title = 'Position verringern';
  minus.disabled = !hasWrite;
  minus.addEventListener('click', (ev) => ev.stopPropagation());
  minus.addEventListener('click', async () => {
    if (!hasWrite) return;
    const cur = Number(slider.value);
    await commitPos(cur - step);
  });

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'nw-sh-btn nw-sh-btn--mini';
  plus.textContent = '+';
  plus.title = 'Position erhöhen';
  plus.disabled = !hasWrite;
  plus.addEventListener('click', (ev) => ev.stopPropagation());
  plus.addEventListener('click', async () => {
    if (!hasWrite) return;
    const cur = Number(slider.value);
    await commitPos(cur + step);
  });

  stepTools.appendChild(stepChoiceWrap);
  stepTools.appendChild(minus);
  stepTools.appendChild(plus);

  stepRow.appendChild(stepLabel);
  stepRow.appendChild(stepTools);

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';

  function updateHint() {
    if (!canWrite) {
      hint.textContent = 'Nur Anzeige (keine Schreib‑DP konfiguriert).';
      return;
    }
    if (!hasWrite) {
      hint.textContent = 'Tipp: Tasten nutzen (kein Positions‑Schreibwert konfiguriert).';
      return;
    }
    hint.textContent = livePreview
      ? 'Live-Vorschau: AN (gedrosselt). Beim Loslassen wird der Wert final übernommen.'
      : 'Tipp: Regler ziehen oder Tasten nutzen.';
  }

  updateHint();

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
      setBusy();
      const ok = await nwCoverAction(dev.id, action);
      if (!ok) setErr();
      else setOk();
      await nwReloadDevices({ force: true });
    });
    return b;
  };

  controls.appendChild(mk('▲', 'up'));
  controls.appendChild(mk('■', 'stop'));
  controls.appendChild(mk('▼', 'down'));

  wrap.appendChild(row);
  wrap.appendChild(slider);
  wrap.appendChild(presets);
  wrap.appendChild(stepRow);
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

  // Buttons are placed BELOW the value for a cleaner, more readable layout
  // (especially on touch devices).
  const btnRow = document.createElement('div');
  btnRow.className = 'nw-sh-gauge__btnrow';
  btnRow.appendChild(btnMinus);
  btnRow.appendChild(btnPlus);

  overlay.appendChild(center);
  overlay.appendChild(btnRow);

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


function nwCreatePlayerPopover(dev, canWrite) {
  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-player';

  const st = dev.state || {};
  const io = (dev.io && dev.io.player) ? dev.io.player : {};

  // Ensure current zone is always part of the multiroom selection
  nwSetSelectedAudioZones(nwGetSelectedAudioZones(dev.id), dev.id);

  // Now playing
  const now = document.createElement('div');
  now.className = 'nw-sh-player__now';

  const coverUrl = String(st.coverUrl || '').trim();
  if (coverUrl) {
    const img = document.createElement('img');
    img.className = 'nw-sh-player__cover';
    img.alt = '';
    img.src = coverUrl;
    img.loading = 'lazy';
    now.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'nw-sh-player__meta';

  const line1 = document.createElement('div');
  line1.className = 'nw-sh-player__title';
  const title = String(st.title || '').trim();
  line1.textContent = title || (st.on ? 'Wiedergabe läuft' : 'Wiedergabe pausiert');

  const line2 = document.createElement('div');
  line2.className = 'nw-sh-player__sub';
  const artist = String(st.artist || '').trim();
  const source = String(st.source || '').trim();
  const subParts = [];
  if (artist) subParts.push(artist);
  if (source) subParts.push(source);
  line2.textContent = subParts.join(' · ');

  meta.appendChild(line1);
  if (line2.textContent) meta.appendChild(line2);
  now.appendChild(meta);
  wrap.appendChild(now);

  // Multiroom / Zonen (UI-seitig)
  const zones = nwGetAllPlayerZones();
  if (zones.length > 1) {
    const zWrap = document.createElement('div');
    zWrap.className = 'nw-sh-player__zones';

    const head = document.createElement('div');
    head.className = 'nw-sh-player__zoneshead';
    const zTitle = document.createElement('div');
    zTitle.className = 'nw-sh-player__zonestitle';
    zTitle.textContent = 'Multiroom';

    const zActions = document.createElement('div');
    zActions.className = 'nw-sh-player__zonesactions';

    const partyBtn = document.createElement('button');
    partyBtn.type = 'button';
    partyBtn.className = 'nw-sh-chip nw-sh-chip--mini';
    partyBtn.textContent = 'Party';
    partyBtn.title = 'Alle Zonen gemeinsam steuern';

    const soloBtn = document.createElement('button');
    soloBtn.type = 'button';
    soloBtn.className = 'nw-sh-chip nw-sh-chip--mini';
    soloBtn.textContent = 'Nur diese';
    soloBtn.title = 'Nur diese Zone steuern';

    zActions.appendChild(partyBtn);
    zActions.appendChild(soloBtn);

    head.appendChild(zTitle);
    head.appendChild(zActions);
    zWrap.appendChild(head);

    const chips = document.createElement('div');
    chips.className = 'nw-sh-player__chips';
    zWrap.appendChild(chips);

    const hint = document.createElement('div');
    hint.className = 'nw-sh-player__zoneshint';
    zWrap.appendChild(hint);

    const renderZones = () => {
      const sel = nwGetSelectedAudioZones(dev.id);
      const selSet = new Set(sel);
      nwClear(chips);

      zones.forEach((z) => {
        const name = String(z.alias || z.name || z.room || z.id || '').trim() || 'Zone';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nw-sh-chip nw-sh-chip--mini' + (selSet.has(z.id) ? ' nw-sh-chip--active' : '');
        b.textContent = name;
        b.title = 'Zone hinzufügen/entfernen';
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const cur = nwGetSelectedAudioZones(dev.id);
          const idx = cur.indexOf(z.id);
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(z.id);
          nwSetSelectedAudioZones(cur, dev.id);
          renderZones();
        });
        chips.appendChild(b);
      });

      // buttons state
      const allIds = zones.map((z) => z.id);
      const isParty = sel.length && allIds.every((id) => selSet.has(id));
      partyBtn.classList.toggle('nw-sh-chip--active', isParty);
      soloBtn.classList.toggle('nw-sh-chip--active', sel.length === 1 && sel[0] === dev.id);

      hint.textContent = sel.length > 1
        ? `Steuert ${sel.length} Zonen gleichzeitig.`
        : 'Nur diese Zone.';
    };

    partyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const allIds = zones.map((z) => z.id);
      nwSetSelectedAudioZones(allIds, dev.id);
      renderZones();
    });

    soloBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      nwSetSelectedAudioZones([dev.id], dev.id);
      renderZones();
    });

    renderZones();
    wrap.appendChild(zWrap);
  }

  // Controls
  const controls = document.createElement('div');
  controls.className = 'nw-sh-player__controls';

  const mkBtn = (label, text, onClick, extraClass) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-btn nw-sh-btn--mini nw-sh-player__btn' + (extraClass ? (' ' + extraClass) : '');
    b.textContent = text;
    b.title = label;
    b.setAttribute('aria-label', label);
    if (!canWrite) b.disabled = true;
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canWrite) return;
      await onClick();
    });
    return b;
  };

  const btnPrev = mkBtn('Zurück', '⏮', async () => {
    await nwPlayerActionMulti(dev.id, 'prev');
    nwRefreshDevicesSoon(100);
  });

  const btnPlay = mkBtn(st.on ? 'Pause' : 'Play', st.on ? '⏸' : '▶', async () => {
    await nwPlayerActionMulti(dev.id, 'toggle');
    nwRefreshDevicesSoon(100);
  }, 'nw-sh-player__btn--primary');

  const btnNext = mkBtn('Weiter', '⏭', async () => {
    await nwPlayerActionMulti(dev.id, 'next');
    nwRefreshDevicesSoon(100);
  });

  const btnStop = mkBtn('Stopp', '⏹', async () => {
    await nwPlayerActionMulti(dev.id, 'stop');
    nwRefreshDevicesSoon(120);
  });

  controls.appendChild(btnPrev);
  controls.appendChild(btnPlay);
  controls.appendChild(btnNext);
  controls.appendChild(btnStop);
  wrap.appendChild(controls);

  // Volume
  const volMin = Number.isFinite(Number(io.volumeMin)) ? Number(io.volumeMin) : 0;
  const volMax = Number.isFinite(Number(io.volumeMax)) ? Number(io.volumeMax) : 100;
  let vol = Number(st.volume);
  if (!Number.isFinite(vol)) vol = volMin;
  vol = nwClampNumber(vol, volMin, volMax);

  const volWrap = document.createElement('div');
  volWrap.className = 'nw-sh-player__vol';

  const volHeader = document.createElement('div');
  volHeader.className = 'nw-sh-player__volhdr';
  const volLabel = document.createElement('div');
  volLabel.className = 'nw-sh-player__vollabel';
  volLabel.textContent = 'Lautstärke';
  const volVal = document.createElement('div');
  volVal.className = 'nw-sh-player__volval';
  volVal.textContent = String(Math.round(((vol - volMin) / Math.max(1, (volMax - volMin))) * 100)) + ' %';
  volHeader.appendChild(volLabel);
  volHeader.appendChild(volVal);
  volWrap.appendChild(volHeader);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(volMin);
  slider.max = String(volMax);
  slider.step = '1';
  slider.value = String(vol);
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !canWrite || !io.volumeWriteId;
  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    const pct = Math.round(((v - volMin) / Math.max(1, (volMax - volMin))) * 100);
    volVal.textContent = String(pct) + ' %';
  });
  slider.addEventListener('change', async () => {
    if (!canWrite || !io.volumeWriteId) return;
    const v = Number(slider.value);
    await nwPlayerActionMulti(dev.id, 'volume', v);
    nwRefreshDevicesSoon(160);
  });
  volWrap.appendChild(slider);
  wrap.appendChild(volWrap);

  // Library: Radiosender / Playlists (mit Favoriten + Zuletzt)
  const stations = Array.isArray(dev.stations) ? dev.stations : [];
  const playlists = Array.isArray(dev.playlists) ? dev.playlists : [];
  const hasStations = stations.length && io.stationId;
  const hasPlaylists = playlists.length && io.playlistId;

  if (hasStations || hasPlaylists) {
    let tab = hasStations ? 'station' : 'playlist';
    let favOnly = false;
    let query = '';

    const lib = document.createElement('div');
    lib.className = 'nw-sh-player__library';

    const head = document.createElement('div');
    head.className = 'nw-sh-player__libhead';

    const tabs = document.createElement('div');
    tabs.className = 'nw-sh-player__libtabs';

    const mkTab = (kind, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-sh-chip nw-sh-chip--mini';
      b.textContent = label;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tab = kind;
        favOnly = false;
        query = '';
        search.value = '';
        render();
      });
      return b;
    };

    const tabStations = hasStations ? mkTab('station', 'Sender') : null;
    const tabPlaylists = hasPlaylists ? mkTab('playlist', 'Playlists') : null;
    if (tabStations) tabs.appendChild(tabStations);
    if (tabPlaylists) tabs.appendChild(tabPlaylists);

    const filters = document.createElement('div');
    filters.className = 'nw-sh-player__libfilters';

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'nw-sh-chip nw-sh-chip--mini';
    favBtn.textContent = '★ Favoriten';
    favBtn.title = 'Nur Favoriten anzeigen / Reihenfolge anpassen';
    favBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      favOnly = !favOnly;
      render();
    });

    filters.appendChild(favBtn);

    head.appendChild(tabs);
    head.appendChild(filters);
    lib.appendChild(head);

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'nw-input nw-sh-player__search';
    search.placeholder = 'Suchen…';
    search.autocomplete = 'off';
    search.addEventListener('input', () => {
      query = String(search.value || '').trim();
      renderList();
    });
    lib.appendChild(search);

    const list = document.createElement('div');
    list.className = 'nw-sh-player__list';
    lib.appendChild(list);

    const recentWrap = document.createElement('div');
    recentWrap.className = 'nw-sh-player__recent';
    lib.appendChild(recentWrap);

    const getItems = () => {
      const arr = (tab === 'playlist') ? playlists : stations;
      return arr
        .map((x) => {
          const name = String((x && x.name) || '').trim();
          const val = (x && Object.prototype.hasOwnProperty.call(x, 'value')) ? x.value : null;
          if (!name) return null;
          return { name, value: val, valueStr: String(val) };
        })
        .filter(Boolean);
    };

    const renderRecent = () => {
      nwClear(recentWrap);
      const recent = nwLoadPlayerRecent(dev.id);
      if (!recent.length) return;

      const titleEl = document.createElement('div');
      titleEl.className = 'nw-sh-player__recenttitle';
      titleEl.textContent = 'Zuletzt gehört';
      recentWrap.appendChild(titleEl);

      const chips = document.createElement('div');
      chips.className = 'nw-sh-player__chips';
      recent.slice(0, 6).forEach((r) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nw-sh-chip nw-sh-chip--mini';
        b.textContent = String(r.name || '').trim() || '—';
        b.title = 'Erneut starten';
        b.disabled = !canWrite;
        b.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canWrite) return;
          const kind = String(r.kind || '').trim();
          if (kind === 'playlist') {
            await nwPlayerActionMulti(dev.id, 'playlist', r.value);
          } else {
            await nwPlayerActionMulti(dev.id, 'station', r.value);
          }
          nwRefreshDevicesSoon(200);
        });
        chips.appendChild(b);
      });
      recentWrap.appendChild(chips);
    };

    const renderList = () => {
      const items = getItems();
      const q = String(query || '').trim().toLowerCase();

      const favs = nwLoadPlayerFavs(dev.id, tab);
      const favSet = new Set(favs);

      const map = new Map();
      items.forEach((it) => map.set(it.valueStr, it));

      const matchesQuery = (it) => !q || String(it.name || '').toLowerCase().includes(q);

      let shown;
      if (favOnly) {
        shown = favs
          .map((v) => map.get(String(v)))
          .filter(Boolean)
          .filter(matchesQuery);
      } else {
        const favItems = favs
          .map((v) => map.get(String(v)))
          .filter(Boolean)
          .filter(matchesQuery);
        const otherItems = items
          .filter((it) => !favSet.has(it.valueStr))
          .filter(matchesQuery);
        shown = [...favItems, ...otherItems];
      }

      nwClear(list);

      if (!shown.length) {
        const empty = document.createElement('div');
        empty.className = 'nw-sh-empty';
        empty.textContent = favOnly ? 'Keine Favoriten gefunden.' : 'Keine Treffer.';
        list.appendChild(empty);
        return;
      }

      shown.forEach((it) => {
        const row = document.createElement('div');
        row.className = 'nw-sh-player__row';

        const fav = document.createElement('button');
        fav.type = 'button';
        fav.className = 'nw-sh-player__iconbtn';
        fav.textContent = favSet.has(it.valueStr) ? '★' : '☆';
        fav.title = 'Favorit umschalten';
        fav.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          nwTogglePlayerFav(dev.id, tab, it.valueStr);
          render();
        });

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nw-sh-player__rowbtn';
        btn.textContent = it.name;
        btn.disabled = !canWrite;
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canWrite) return;
          if (tab === 'playlist') {
            await nwPlayerActionMulti(dev.id, 'playlist', it.value);
          } else {
            await nwPlayerActionMulti(dev.id, 'station', it.value);
          }
          nwAddPlayerRecent(dev.id, { kind: tab, name: it.name, value: it.value });
          nwRefreshDevicesSoon(200);
          renderRecent();
        });

        row.appendChild(fav);
        row.appendChild(btn);

        if (favOnly && favSet.has(it.valueStr)) {
          const up = document.createElement('button');
          up.type = 'button';
          up.className = 'nw-sh-player__iconbtn';
          up.textContent = '↑';
          up.title = 'Nach oben';
          up.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nwMovePlayerFav(dev.id, tab, it.valueStr, -1);
            render();
          });

          const down = document.createElement('button');
          down.type = 'button';
          down.className = 'nw-sh-player__iconbtn';
          down.textContent = '↓';
          down.title = 'Nach unten';
          down.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nwMovePlayerFav(dev.id, tab, it.valueStr, +1);
            render();
          });

          row.appendChild(up);
          row.appendChild(down);
        }

        list.appendChild(row);
      });
    };

    const render = () => {
      if (tabStations) tabStations.classList.toggle('nw-sh-chip--active', tab === 'station');
      if (tabPlaylists) tabPlaylists.classList.toggle('nw-sh-chip--active', tab === 'playlist');
      favBtn.classList.toggle('nw-sh-chip--active', favOnly);

      search.placeholder = tab === 'playlist' ? 'Playlist suchen…' : 'Sender suchen…';
      renderList();
      renderRecent();
    };

    render();
    wrap.appendChild(lib);
  }

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
      if (nwFilterState.favoritesFirst) {
        const fa = nwIsFavorite(a);
        const fb = nwIsFavorite(b);
        if (fa !== fb) return fa ? -1 : 1;
      }

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

function nwComputeFunctionSummary(funcName, funcDevices) {
  const name = String(funcName || '').trim();
  const devs = Array.isArray(funcDevices) ? funcDevices : [];
  if (!name || !devs.length) return '';

  const total = devs.length;
  // "aktiv" = typische An/Aus‑Geräte mit state.on === true
  let onCount = 0;
  devs.forEach(d => {
    const st = d && d.state;
    if (st && st.on === true) onCount++;
  });

  if (onCount > 0) return `${total} Geräte · ${onCount} an`;
  return `${total} Geräte`;
}

function nwRenderFunctions(devices) {
  const wrap = document.getElementById('nw-smarthome-rooms');
  if (!wrap) return;
  nwClear(wrap);

  const groups = nwGroupByFunction(devices);

  groups.forEach(g => {
    const section = document.createElement('section');
    section.className = 'nw-sh-room nw-sh-room--function';

    const header = document.createElement('div');
    header.className = 'nw-sh-room__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-room__title';
    const fnIcon = nwGuessIconForFunctionLabel(g.func);
    if (fnIcon) {
      title.innerHTML = `<span class="nw-sh-fn__icon">${nwGetIconSvg(fnIcon, false)}</span><span class="nw-sh-fn__label"></span>`;
      const lbl = title.querySelector('.nw-sh-fn__label');
      if (lbl) lbl.textContent = g.func;
    } else {
      title.textContent = g.func;
    }
    header.appendChild(title);

    const summaryText = nwComputeFunctionSummary(g.func, g.devices);
    if (summaryText) {
      const summary = document.createElement('div');
      summary.className = 'nw-sh-room__summary';
      summary.textContent = summaryText;
      header.appendChild(summary);
    }

    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'nw-sh-grid';

    // stable ordering inside function
    const arr = (g.devices || []).slice();
    arr.sort((a, b) => {
      if (nwFilterState.favoritesFirst) {
        const fa = nwIsFavorite(a);
        const fb = nwIsFavorite(b);
        if (fa !== fb) return fa ? -1 : 1;
      }

      const oa = (typeof a.order === 'number') ? a.order : (typeof a.ui?.order === 'number' ? a.ui.order : 0);
      const ob = (typeof b.order === 'number') ? b.order : (typeof b.ui?.order === 'number' ? b.ui.order : 0);
      if (oa !== ob) return oa - ob;
      return nwSortBy(a.alias || a.id, b.alias || b.id);
    });

    arr.forEach(dev => {
      grid.appendChild(nwCreateTile(dev, { showRoom: true }));
    });

    section.appendChild(grid);
    wrap.appendChild(section);
  });
}

function nwApplyFiltersAndRender() {
  const filtered = nwApplyFilters(nwAllDevices);

  // chips always based on all devices (so user can clear filters)
  nwRenderViewChips();
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
  if (nwViewState.mode === 'functions') nwRenderFunctions(filtered);
  else nwRenderRooms(filtered);
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

  // UI‑Prefs (persistiert pro Browser)
  nwViewState.mode = nwLoadViewMode(nwViewState.mode);
  nwFilterState.favoritesFirst = nwLoadBoolLS(NW_SH_FAVORITES_FIRST_LS_KEY, NW_SH_FAVORITES_FIRST_DEFAULT);
  nwFavoriteOverrides = nwLoadFavoriteOverrides();
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
