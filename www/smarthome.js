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

  // Page-spezifische Layout-Optionen (werden beim Wechsel der Sidebar-Seite gesetzt)
  cardSizeOverride: 'auto', // auto|s|m|l|xl
  sortBy: 'order',          // order|name|type
  groupByType: false,
};

// SmartHome VIS: Filter-/Chip-Leiste optional.
// Wenn im HTML nicht vorhanden, wird die Endkunden-UI ohne Filter gerendert (cleaner).
let nwShFiltersUiEnabled = true;

// Textgröße (Endkunde, persistiert pro Browser)
// - compact | normal | large
// Wird als CSS‑Klasse auf #nw-smarthome-root gesetzt.
const NW_SH_TEXT_SIZE_LS_KEY = 'nw_sh_text_size';
const nwTextSizeState = {
  size: 'normal',
};

// Aktive Sidebar-Seite (SmartHome VIS Navigation)
// Wird pro Browser gespeichert.
const NW_SH_ACTIVE_PAGE_LS_KEY = 'nw_sh_active_page';
const NW_SH_NAV_EXPANDED_LS_KEY = 'nw_sh_nav_expanded';

// SmartHome Konfiguration (Räume/Funktionen/Pages) – wird separat geladen
let nwShConfig = null;
const nwShMeta = {
  floorsById: {},
  floorIdByName: {},
  roomsById: {},
  funcsById: {},
  roomIdByName: {},
  funcIdByName: {},
};

const nwPageState = {
  pages: [],
  activeId: null,

  // Sidebar UI-State
  expandedIds: new Set(),

  // Live Counts pro Seite (id -> number)
  countsById: {},
};

const nwFilterState = {
  func: null,        // string | null
  favoritesOnly: false,
  favoritesFirst: false, // Favoriten in Räumen nach oben sortieren

  // Basis-Filter aus der aktiven Sidebar-Seite (IDs / Types)
  page: {
    roomIds: [],   // string[]
    funcIds: [],   // string[]
    types: [],     // string[]
    favoritesOnly: false,
  },
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

  // Extra icons (used by floors/rooms & custom device icons)
  home: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 10v10h14V10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 20v-6h4v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 10v10h14V10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 20v-6h4v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  building: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3h12v18H6V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3h12v18H6V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  folder: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 6h7l2 2h9v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 6h7l2 2h9v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  door: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 3h10v18H7V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M14.5 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 3h10v18H7V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M14.5 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  window: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4v16" stroke="currentColor" stroke-width="2"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4v16" stroke="currentColor" stroke-width="2"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  lock: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 11h12v10H6V11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 11h12v10H6V11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  shield: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 3 20 7v6c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 3 20 7v6c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  wifi: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 8c5-4 15-4 20 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12c3.5-3 10.5-3 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8.5 15.5c2-1.7 5-1.7 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 19h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 8c5-4 15-4 20 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12c3.5-3 10.5-3 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8.5 15.5c2-1.7 5-1.7 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 19h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  bolt: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  battery: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 8h16v8H3V8Z" stroke="currentColor" stroke-width="2"/>
        <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 8h16v8H3V8Z" stroke="currentColor" stroke-width="2"/>
        <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  solar: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.2 6.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.4 16.4l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.8 6.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7.6 16.4 6.2 17.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.2 6.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.4 16.4l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.8 6.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7.6 16.4 6.2 17.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  car: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 16l1-5c.2-1 1-2 2.2-2h7.6c1.2 0 2 .9 2.2 2l1 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 16h16v4H4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 20h.01M17 20h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 16l1-5c.2-1 1-2 2.2-2h7.6c1.2 0 2 .9 2.2 2l1 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 16h16v4H4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 20h.01M17 20h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  charger: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 14l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 14l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor"/>
      </svg>`,
  },
  water: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  fan: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
        <path d="M12 12c6-4 9-2 9 1 0 3-3 5-6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c-6-4-9-2-9 1 0 3 3 5 6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c0 7-3 9-5 7-2-2-2-6 1-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
        <path d="M12 12c6-4 9-2 9 1 0 3-3 5-6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c-6-4-9-2-9 1 0 3 3 5 6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c0 7-3 9-5 7-2-2-2-6 1-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  bell: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 16H6l1-2v-4a5 5 0 0 1 10 0v4l1 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 16H6l1-2v-4a5 5 0 0 1 10 0v4l1 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  info: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 10v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 10v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  star: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },

  // Missing basic icons (used by templates / config icon picker)
  camera: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="13" r="1.6" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },
  grid: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.18"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  thermometer: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 11h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 14h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 11h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 14h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M12 18a1.3 1.3 0 1 0 0-2.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="18" r="2" fill="currentColor" fill-opacity="0.14"/>
      </svg>`,
  },

  // Room / area icons (optional)
  sofa: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 11a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 13h16v5H4v-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 18v2M17 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 11a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 13h16v5H4v-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 18v2M17 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 13h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`,
  },
  bed: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 15h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  kitchen: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 7h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 3v10c0 2 1 3 3 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 7h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 3v10c0 2 1 3 3 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M13 8h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  bath: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 7V5a2 2 0 0 1 2-2h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 7V5a2 2 0 0 1 2-2h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 9h.01M12 9h.01M15 9h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  wrench: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 7a4 4 0 0 0 5 5l-4.5 4.5a2 2 0 0 1-2.8 0L7 21l-4-4 4.5-4.7a2 2 0 0 1 0-2.8L12 5a4 4 0 0 0 2 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 7a4 4 0 0 0 5 5l-4.5 4.5a2 2 0 0 1-2.8 0L7 21l-4-4 4.5-4.7a2 2 0 0 1 0-2.8L12 5a4 4 0 0 0 2 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 18l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`,
  },
  stairs: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 20h6v-4h4v-4h4V6h2v14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 20h6v-4h4v-4h4V6h2v14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },

  // 3D-style icons (subtle gradient + shine) – selectable via icon key (e.g. "3d-bulb")
  '3d-bulb': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_bulb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" fill="url(#nw3d_bulb_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.2 6.2c.6-1.2 1.8-2 3.2-2" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_bulb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" fill="url(#nw3d_bulb_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4.5 4.5l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19.5 4.5l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.2 6.2c.6-1.2 1.8-2 3.2-2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-plug': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_plug_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" fill="url(#nw3d_plug_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 10h6" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_plug_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.60"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" fill="url(#nw3d_plug_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 10l-1 2h2l-1 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },
  '3d-thermostat': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_thermo_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" fill="url(#nw3d_thermo_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 6h2" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_thermo_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.60"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" fill="url(#nw3d_thermo_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 10c0 1.2-1 2.2-2.2 2.2S13.6 11.2 13.6 10c0-1.5 1.2-2.2 2.2-3.6 1 1.4 2.2 2.1 2.2 3.6Z" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-blinds': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_blinds_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_blinds_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_blinds_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_blinds_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        <path d="M12 20v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-camera': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_cam_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" fill="url(#nw3d_cam_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
        <path d="M9 9h3" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_cam_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.60"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" fill="url(#nw3d_cam_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="13" r="1.6" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-speaker': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_spk_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M11 5 7 9H4v6h3l4 4V5Z" fill="url(#nw3d_spk_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 12h.01" stroke="#ffffff" stroke-opacity="0.16" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_spk_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.62"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M11 5 7 9H4v6h3l4 4V5Z" fill="url(#nw3d_spk_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M15 9a3 3 0 0 1 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.5 7a6 6 0 0 1 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      </svg>`,
  },
  '3d-scene': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_scene_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" fill="url(#nw3d_scene_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 5.5h4" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_scene_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" fill="url(#nw3d_scene_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M19 13l.6 2.1L22 16l-2.4.9L19 19l-.6-2.1L16 16l2.4-.9L19 13Z" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-sensor': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_sensor_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill="url(#nw3d_sensor_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_sensor_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill="url(#nw3d_sensor_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-grid': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_grid_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_grid_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
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
  return s.length > 0 && s.length <= 10;
}

function nwEscapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nwStaticIconHtml(iconValue) {
  const raw = String(iconValue || '').trim();
  if (!raw) return '';
  const key = nwNormalizeIconName(raw);
  if (key && NW_ICON_SVGS[key]) return NW_ICON_SVGS[key].off;
  return nwEscapeHtml(raw);
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
    kamera: 'camera',
    camera: 'camera',
    cam: 'camera',
    thermometer: 'thermometer',
    temperatur: 'thermometer',
    temp: 'thermometer',
    grid: 'grid',
    widget: 'grid',
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
  if (type === 'camera') return 'camera';
  if (type === 'widget') return 'grid';
  if (type === 'scene') return 'scene';
  if (type === 'player') return 'speaker';
  if (type === 'color') return 'bulb';
  if (type === 'sensor') {
    if (unit.includes('°c') || alias.includes('temp') || fn.includes('klima')) return 'thermometer';
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
  if (hay.match(/kamera|camera|cam\b/)) return 'camera';
  if (hay.match(/kamin|ofen|fire/)) return 'fire';
  if (hay.match(/szene|scene/)) return 'scene';
  if (hay.match(/widget|dashboard|grid/)) return 'grid';
  if (hay.match(/temp|temperatur|°c/)) return 'thermometer';

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

  // 3D icon variants share the same palette as their base icon
  let iconKey = String(iconName || '').toLowerCase();
  if (iconKey.startsWith('3d-')) iconKey = iconKey.slice(3);

  // keep palette small and "calm" (works in dark UI)
  if (iconKey === 'bulb') return '#fbbf24';     // amber
  if (iconKey === 'fire') return '#fb7185';     // rose
  if (iconKey === 'plug') return '#60a5fa';     // blue
  if (iconKey === 'thermostat' || iconKey === 'thermometer') return '#fb923c'; // orange
  if (iconKey === 'blinds') return '#a78bfa';   // violet
  if (iconKey === 'tv' || iconKey === 'speaker') return '#38bdf8'; // sky
  if (iconKey === 'camera') return '#22d3ee';   // cyan
  if (iconKey === 'grid') return '#34d399';     // emerald
  if (iconKey === 'scene') return '#f472b6';    // pink
  if (type === 'sensor' || iconKey === 'sensor') return '#22c55e'; // green

  if (fn.includes('pv') || fn.includes('energie')) return '#22c55e';
  return '#00e676';
}

function nwIsOn(dev) {
  const st = dev && dev.state ? dev.state : {};
  const type = String(dev.type || '').toLowerCase();

  if (type === 'switch') return !!st.on;
  if (type === 'color') {
    if (typeof st.on !== 'undefined') return !!st.on;
    // some lights expose only a color value
    return !!(st && st.color);
  }
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
  if (type === 'color') {
    if (typeof st.on !== 'undefined') return st.on ? 'Ein' : 'Aus';
    if (st && st.color) return String(st.color).toUpperCase();
    return '—';
  }
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
  if (type === 'color') return 'Klicken: Ein/Aus · Symbol/⋯: Farbe einstellen';
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
  // Page-Override: Karte-Größe über Sidebar-Seite
  const ovr = String((nwViewState && nwViewState.cardSizeOverride) ? nwViewState.cardSizeOverride : '').trim().toLowerCase();
  if (ovr && ovr !== 'auto') {
    const v = (ovr === 'small') ? 's' : (ovr === 'medium') ? 'm' : (ovr === 'large') ? 'l' : ovr;
    if (v === 's' || v === 'm' || v === 'l' || v === 'xl') return v;
  }

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

  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  const st = dev && dev.state ? dev.state : {};
  const colorHex = (type === 'color' && st && st.color) ? String(st.color).trim() : '';

  if (iconSpec.kind === 'text') {
    const t = document.createElement('span');
    t.className = 'nw-sh-icon__text';
    t.textContent = iconSpec.text;
    wrap.appendChild(t);
  } else {
    const svgWrap = document.createElement('div');
    svgWrap.className = 'nw-sh-icon__svg';
    const name = iconSpec.name;
    if (typeof name === 'string' && name.startsWith('3d-')) {
      wrap.classList.add('nw-sh-icon--3d');
    }
    const variant = isOn ? 'on' : 'off';
    const svg = (NW_ICON_SVGS[name] && NW_ICON_SVGS[name][variant])
      ? NW_ICON_SVGS[name][variant]
      : (NW_ICON_SVGS.generic && NW_ICON_SVGS.generic[variant]);
    svgWrap.innerHTML = svg;
    wrap.appendChild(svgWrap);
  }

  // set accent as CSS var so SVG uses currentColor
  wrap.style.color = isOn ? accent : 'rgba(203, 213, 225, 0.85)';

  // Color dot overlay (for color-lights)
  if (type === 'color') {
    const dot = document.createElement('span');
    dot.className = 'nw-sh-icon__dot';
    dot.style.background = colorHex || (isOn ? 'rgba(226,232,240,0.75)' : 'rgba(148,163,184,0.45)');
    wrap.appendChild(dot);
  }

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

async function nwSetColor(id, color) {
  const res = await fetch('/api/smarthome/color', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, color }),
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


const NW_SH_TYPE_LABELS = {
  light: 'Licht',
  lamp: 'Licht',
  dimmer: 'Licht',
  shutter: 'Rollos',
  blind: 'Rollos',
  rtr: 'Heizung',
  thermostat: 'Heizung',
  heating: 'Heizung',
  plug: 'Steckdose',
  socket: 'Steckdose',
  switch: 'Schalter',
  relay: 'Schalter',
  sensor: 'Sensor',
  camera: 'Kamera',
  door: 'Tür',
  window: 'Fenster',
  presence: 'Präsenz',
  motion: 'Bewegung',
  energy: 'Energie',
  meter: 'Zähler',
};

function nwTypeLabel(type) {
  const t = String(type || '').trim().toLowerCase();
  if (!t) return 'Unbekannt';
  return NW_SH_TYPE_LABELS[t] || (t.charAt(0).toUpperCase() + t.slice(1));
}

function nwCompareDevices(a, b) {
  // optional: favorites first
  if (nwFilterState && nwFilterState.favoritesFirst) {
    const fa = nwIsFavorite(a);
    const fb = nwIsFavorite(b);
    if (fa !== fb) return fa ? -1 : 1;
  }

  const sortBy = (nwViewState && nwViewState.sortBy) ? nwViewState.sortBy : 'order';

  if (sortBy === 'name') {
    return nwSortBy(a.alias || a.id, b.alias || b.id);
  }

  if (sortBy === 'type') {
    const t = nwSortBy(nwTypeLabel(a.type), nwTypeLabel(b.type));
    if (t) return t;
    return nwSortBy(a.alias || a.id, b.alias || b.id);
  }

  // default: order
  const oa = nwGetDeviceOrder(a);
  const ob = nwGetDeviceOrder(b);
  if (oa !== ob) return oa - ob;
  return nwSortBy(a.alias || a.id, b.alias || b.id);
}

function nwGroupDevicesByType(devices) {
  const map = new Map();
  (devices || []).forEach((d) => {
    const key = String(d && d.type ? d.type : '').trim().toLowerCase() || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(d);
  });

  const groups = Array.from(map.entries()).map(([type, list]) => ({
    type,
    title: nwTypeLabel(type),
    icon: (NW_SH_TYPE_ICON && NW_SH_TYPE_ICON[type]) ? NW_SH_TYPE_ICON[type] : null,
    devices: list,
  }));

  groups.sort((a, b) => String(a.title).localeCompare(String(b.title), 'de'));
  return groups;
}

function nwFormatNumberDE(value, precision) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  const p = (typeof precision === 'number' && precision >= 0 && precision <= 6) ? precision : 1;
  return v.toFixed(p).replace('.', ',');
}

function nwComputeRoomSummary(roomId, allDevices) {
  const rid = nwNormalizeId(roomId);
  if (!rid) return '';

  const devs = Array.isArray(allDevices)
    ? allDevices.filter(d => nwNormalizeId(d && d.roomId) === rid)
    : [];
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

function nwRenderTextSizeChips() {
  const wrap = document.getElementById('nw-filter-textsize');
  if (!wrap) return;
  nwClear(wrap);

  const mkChip = (label, active, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      onClick();
      // Kein kompletter Re-Render nötig (nur CSS), aber Chips sollen sofort aktualisiert werden.
      nwRenderTextSizeChips();
    });
    wrap.appendChild(btn);
  };

  const cur = nwNormTextSize(nwTextSizeState.size);

  mkChip('Kompakt', cur === 'compact', () => {
    nwTextSizeState.size = 'compact';
    nwSaveTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
  });

  mkChip('Normal', cur === 'normal', () => {
    nwTextSizeState.size = 'normal';
    nwSaveTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
  });

  mkChip('Groß', cur === 'large', () => {
    nwTextSizeState.size = 'large';
    nwSaveTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
  });
}

function nwRenderFunctionChips(devices) {
  const wrap = document.getElementById('nw-filter-functions');
  if (!wrap) return;
  nwClear(wrap);

  const allFns = nwGetAllFunctions(devices);
  const hasFav = (devices || []).some(d => nwIsFavorite(d));
  const baseFavOnly = !!(nwFilterState.page && nwFilterState.page.favoritesOnly);
  const effectiveFavOnly = baseFavOnly || !!nwFilterState.favoritesOnly;

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

  mkChip('Alle', !nwFilterState.func && !effectiveFavOnly, () => {
    nwFilterState.func = null;
    nwFilterState.favoritesOnly = false;
  });

  // Favoriten (Schnellzugriff)
  mkChip('★ Favoriten', !!effectiveFavOnly, () => {
    if (!hasFav) return;
    if (baseFavOnly) return; // Seite erzwingt Favoriten
    nwFilterState.favoritesOnly = !nwFilterState.favoritesOnly;
    if (nwFilterState.favoritesOnly) nwFilterState.func = null;
  }, null, !hasFav || baseFavOnly, baseFavOnly
    ? 'Diese Seite zeigt nur Favoriten.'
    : (hasFav
      ? 'Nur Favoriten anzeigen'
      : 'Keine Favoriten gesetzt. Tipp: Stern ★ in einer Kachel anklicken.'));

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
  (devices || []).forEach((d) => {
    const rid = nwGetDeviceRoomId(d);
    // Devices can also live directly on a floor (no roomId) – group them under the
    // corresponding floor so the visual structure matches the editor.
    let key = rid;
    if (!key) {
      const fid = nwGetDeviceFloorId(d);
      key = fid ? `__floor__${fid}` : '__no_room__';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(d);
  });

  const keys = Array.from(map.keys());
  keys.sort((a, b) => {
    // put "no room" at the end
    if (a === '__no_room__' && b !== '__no_room__') return 1;
    if (b === '__no_room__' && a !== '__no_room__') return -1;

    const ra = nwShMeta.roomsById[a];
    const rb = nwShMeta.roomsById[b];
    const oa = (ra && Number.isFinite(+ra.order)) ? +ra.order : 999999;
    const ob = (rb && Number.isFinite(+rb.order)) ? +rb.order : 999999;
    if (oa !== ob) return oa - ob;

    const na = (ra && ra.name) ? ra.name : (map.get(a)?.[0]?.room || a);
    const nb = (rb && rb.name) ? rb.name : (map.get(b)?.[0]?.room || b);
    return String(na || '').toLowerCase().localeCompare(String(nb || '').toLowerCase());
  });

  return keys.map((key) => {
    // Floor device groups
    if (key.startsWith('__floor__')) {
      const fid = key.slice('__floor__'.length);
      return {
        roomId: key, // virtual group id
        room: 'Allgemein',
        floorId: fid,
        icon: 'folder',
        order: -1,
        isFloorDevicesGroup: true,
        devices: map.get(key) || [],
      };
    }

    const meta = nwShMeta.roomsById[key];
    const name = (meta && meta.name)
      ? meta.name
      : (key === '__no_room__'
        ? 'Ohne Raum'
        : String(map.get(key)?.[0]?.room || key).trim() || key);

    return {
      roomId: key === '__no_room__' ? '' : key,
      room: name,
      floorId: meta && meta.floorId ? String(meta.floorId).trim() : '',
      icon: meta && meta.icon ? String(meta.icon) : '',
      order: (meta && Number.isFinite(+meta.order)) ? +meta.order : undefined,
      isFloorDevicesGroup: false,
      devices: map.get(key) || [],
    };
  });
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

// ---- Long‑Press Info‑Toast (Mobile UX) ----
let nwShToastEl = null;
let nwShToastHideTimer = null;

function nwEnsureShToast() {
  if (nwShToastEl) return nwShToastEl;
  const el = document.createElement('div');
  el.className = 'nw-sh-toast';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  nwShToastEl = el;
  return el;
}

function nwHideShToast() {
  if (!nwShToastEl) return;
  nwShToastEl.classList.remove('nw-sh-toast--show');
  if (nwShToastHideTimer) {
    clearTimeout(nwShToastHideTimer);
    nwShToastHideTimer = null;
  }
}

function nwShowShToastForTile(dev) {
  const toast = nwEnsureShToast();
  if (nwShToastHideTimer) {
    clearTimeout(nwShToastHideTimer);
    nwShToastHideTimer = null;
  }

  // Build content with text nodes to avoid injection.
  nwClear(toast);
  const name = document.createElement('div');
  name.className = 'nw-sh-toast__name';
  name.textContent = String(dev.alias || dev.id || '');

  const meta = document.createElement('div');
  meta.className = 'nw-sh-toast__meta';
  const parts = [];
  if (dev.room) parts.push(String(dev.room));
  if (dev.function) parts.push(String(dev.function));
  const st = nwGetStateText(dev);
  if (st) parts.push(st);
  meta.textContent = parts.join(' · ');

  toast.appendChild(name);
  toast.appendChild(meta);

  // show
  toast.classList.add('nw-sh-toast--show');
  nwShToastHideTimer = setTimeout(() => {
    toast.classList.remove('nw-sh-toast--show');
    nwShToastHideTimer = null;
  }, 2300);
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
  const hasDetails = (type === 'dimmer' || type === 'blind' || type === 'rtr' || type === 'player' || type === 'color');
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

  // Big content (RTR / large sensors / media widgets)
  if (type === 'rtr' || size === 'xl' || type === 'camera' || type === 'widget') {
    const big = document.createElement('div');
    big.className = 'nw-sh-tile__big';

    if (type === 'camera') {
      tile.classList.add('nw-sh-tile--media');
      const cam = (dev.io && dev.io.camera) ? dev.io.camera : {};
      const snapshotUrl = (typeof cam.snapshotUrl === 'string') ? cam.snapshotUrl : '';
      const liveUrl = (typeof cam.liveUrl === 'string') ? cam.liveUrl : '';

      const media = document.createElement('div');
      media.className = 'nw-sh-media';

      const img = document.createElement('img');
      img.className = 'nw-sh-media__img';
      img.alt = dev.title || 'Kamera';

      if (snapshotUrl) {
        const bust = (snapshotUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        img.src = snapshotUrl + bust;
      }

      media.appendChild(img);
      big.appendChild(media);

      if (liveUrl || snapshotUrl) {
        const btnRow = document.createElement('div');
        btnRow.className = 'nw-sh-media__actions';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nw-sh-btn';
        btn.textContent = 'Live öffnen';
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const url = liveUrl || snapshotUrl;
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });

        btnRow.appendChild(btn);
        big.appendChild(btnRow);

        // Click on preview also opens
        media.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const url = liveUrl || snapshotUrl;
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });
      }
    } else if (type === 'widget') {
      tile.classList.add('nw-sh-tile--media');
      const w = (dev.io && dev.io.widget) ? dev.io.widget : {};
      const kind = (typeof w.kind === 'string' && w.kind.trim()) ? w.kind.trim() : 'iframe';
      const url = (typeof w.url === 'string') ? w.url : '';
      const openUrl = (typeof w.openUrl === 'string') ? w.openUrl : '';
      const embed = !!w.embed;
      const height = (typeof w.height === 'number' && w.height > 0) ? w.height : 260;

      if (kind === 'iframe' && url && embed) {
        const frame = document.createElement('iframe');
        frame.className = 'nw-sh-media__iframe';
        frame.src = url;
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer';
        frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
        frame.style.height = height + 'px';
        big.appendChild(frame);
      } else {
        const info = document.createElement('div');
        info.className = 'nw-sh-media__placeholder';
        info.textContent = (typeof w.label === 'string' && w.label.trim()) ? w.label.trim() : (url || 'Widget');
        big.appendChild(info);
      }

      if (openUrl || url) {
        const btnRow = document.createElement('div');
        btnRow.className = 'nw-sh-media__actions';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nw-sh-btn';
        btn.textContent = 'Öffnen';
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const u = openUrl || url;
          if (u) window.open(u, '_blank', 'noopener,noreferrer');
        });

        btnRow.appendChild(btn);
        big.appendChild(btnRow);
      }
    } else {
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
    }

    tile.appendChild(big);
  }

  // Dimmer/Blind: optional slider (if level mapping exists)
  // We only show the slider on extra-large tiles to keep the default grid close to the standard tile UX.
  if (size === 'xl' && (type === 'dimmer' || type === 'blind') && dev.io && dev.io.level && dev.io.level.readId) {
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
    slider.disabled = !canWrite;

    // Visual progress fill (accent track)
    try { nwUpdateRangeFill(slider); } catch (_e) {}
    slider.addEventListener('input', () => {
      try { nwUpdateRangeFill(slider); } catch (_e) {}
    }, { passive: true });

    const stop = (ev) => ev.stopPropagation();
    slider.addEventListener('mousedown', stop);
    slider.addEventListener('touchstart', stop);
    slider.addEventListener('click', stop);

    slider.addEventListener('change', async (ev) => {
      if (!canWrite) return;
      const raw = Number(ev.target.value);
      if (!Number.isFinite(raw)) return;
      await nwSetLevel(dev.id, raw);
      await nwReloadDevices({ force: true });
    });

    tile.appendChild(slider);
  }

  // In-tile quick controls (explicit toggles / +/- inside the tile)
  // Note: tile click still acts as a fast action; these controls are for clarity & UX.
  const footer = document.createElement('div');
  footer.className = 'nw-sh-tile__footer';

  const addMiniToggle = () => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'nw-sh-mini-toggle' + (isOn ? ' nw-sh-mini-toggle--on' : '');
    t.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    t.title = isOn ? 'Ausschalten' : 'Einschalten';
    t.disabled = !canWrite;
    t.addEventListener('click', (ev) => ev.stopPropagation());
    t.addEventListener('click', async () => {
      if (!canWrite) return;
      const st = await nwToggleDevice(dev.id);
      if (!st) return;
      await nwReloadDevices({ force: true });
    });
    footer.appendChild(t);
  };

  const addMiniBtn = (label, title, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-mini-btn';
    b.textContent = label;
    if (title) b.title = title;
    b.disabled = !canWrite;
    b.addEventListener('click', (ev) => ev.stopPropagation());
    b.addEventListener('click', async () => {
      if (!canWrite) return;
      await onClick();
    });
    footer.appendChild(b);
  };

  if (type === 'switch' || type === 'color' || type === 'dimmer') {
    addMiniToggle();
  }

  if (type === 'dimmer' && dev.io && dev.io.level && (dev.io.level.writeId || dev.io.level.readId)) {
    const lvlCfg = dev.io.level;
    const min = typeof lvlCfg.min === 'number' ? lvlCfg.min : 0;
    const max = typeof lvlCfg.max === 'number' ? lvlCfg.max : 100;
    const step = typeof lvlCfg.step === 'number' ? lvlCfg.step : 5;
    const st = dev.state || {};
    const current = (typeof st.level === 'number') ? st.level : 0;

    addMiniBtn('−', 'Dimmen −', async () => {
      const next = Math.max(min, Math.min(max, current - step));
      await nwSetLevel(dev.id, next);
      await nwReloadDevices({ force: true });
    });
    addMiniBtn('+', 'Dimmen +', async () => {
      const next = Math.max(min, Math.min(max, current + step));
      await nwSetLevel(dev.id, next);
      await nwReloadDevices({ force: true });
    });
  }

  if (type === 'scene') {
    addMiniBtn('▶', 'Szene ausführen', async () => {
      const st = await nwToggleDevice(dev.id);
      if (!st) return;
      await nwReloadDevices({ force: true });
    });
  }

  if (footer.childNodes && footer.childNodes.length) {
    tile.appendChild(footer);
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

  // Long‑Press (Touch)
  // - Kacheln mit Bedienpanel: Long‑Press öffnet das Tooltip/Panel
  // - Sonst: zeigt vollen Namen + Raum/Funktion (hilft auf Smartphones bei gekürzten Titeln)
  let lpTimer = null;
  let lpStartX = 0;
  let lpStartY = 0;

  const lpCancel = () => {
    if (lpTimer) {
      clearTimeout(lpTimer);
      lpTimer = null;
    }
  };

  tile.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch') return;
    // In Controls/Buttons/Inputs keinen Long‑Press starten
    if (ev.target && (ev.target.closest('button') || ev.target.closest('input'))) return;

    lpCancel();
    lpStartX = ev.clientX;
    lpStartY = ev.clientY;
    lpTimer = setTimeout(() => {
      lpTimer = null;
      tile.__nwIgnoreNextClick = true;
      if (hasDetails) {
        nwOpenDevicePopover(dev, tile);
      } else {
        nwShowShToastForTile(dev);
      }
    }, 520);
  }, { passive: true });

  tile.addEventListener('pointermove', (ev) => {
    if (!lpTimer || ev.pointerType !== 'touch') return;
    const dx = ev.clientX - lpStartX;
    const dy = ev.clientY - lpStartY;
    if (Math.abs(dx) + Math.abs(dy) > 14) {
      // Finger bewegt -> Long‑Press abbrechen
      lpCancel();
    }
  }, { passive: true });

  tile.addEventListener('pointerup', lpCancel, { passive: true });
  tile.addEventListener('pointercancel', lpCancel, { passive: true });

  // Tap actions
  // - Jalousie & Raumtemperatur: Tap öffnet das Bedienpanel (Tooltip)
  // - Schalter/Dimmer/Szene/Player: Tap = Schnellaktion, Long‑Press = Tooltip
  tile.addEventListener('click', async () => {
    if (tile.__nwIgnoreNextClick) {
      tile.__nwIgnoreNextClick = false;
      return;
    }
    if (type === 'blind' || type === 'rtr') {
      nwOpenDevicePopover(dev, tile);
      return;
    }

    if (type === 'camera') {
      const cam = (dev.io && dev.io.camera) ? dev.io.camera : {};
      const snapshotUrl = (typeof cam.snapshotUrl === 'string') ? cam.snapshotUrl : '';
      const liveUrl = (typeof cam.liveUrl === 'string') ? cam.liveUrl : '';
      const url = liveUrl || snapshotUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (type === 'widget') {
      const w = (dev.io && dev.io.widget) ? dev.io.widget : {};
      const url = (typeof w.openUrl === 'string' && w.openUrl) ? w.openUrl : ((typeof w.url === 'string') ? w.url : '');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!canWrite) {
      // Read‑Only: bei Modulen mit Panel trotzdem öffnen
      if (hasDetails) nwOpenDevicePopover(dev, tile);
      return;
    }
    if (type === 'color') {
      const hasSwitch = !!(dev.io && dev.io.switch && (dev.io.switch.writeId || dev.io.switch.readId));
      if (!hasSwitch) {
        // Ohne Schalt-DP: Klick öffnet direkt das Farb-Panel
        nwOpenDevicePopover(dev, tile);
        return;
      }
      const st = await nwToggleDevice(dev.id);
      if (!st) return;
      await nwReloadDevices({ force: true });
      return;
    }

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

function nwNormTextSize(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return 'normal';
  if (s === 'compact' || s === 'kompakt' || s === 'small' || s === 'klein') return 'compact';
  if (s === 'large' || s === 'gross' || s === 'groß' || s === 'big') return 'large';
  return 'normal';
}

function nwLoadTextSize(defSize) {
  try {
    const v = localStorage.getItem(NW_SH_TEXT_SIZE_LS_KEY);
    if (v) return nwNormTextSize(v);
  } catch (_e) {}
  return nwNormTextSize(defSize);
}

function nwSaveTextSize(size) {
  try {
    localStorage.setItem(NW_SH_TEXT_SIZE_LS_KEY, nwNormTextSize(size));
  } catch (_e) {}
}

function nwApplyTextSizeClass(size) {
  const root = document.getElementById('nw-smarthome-root');
  if (!root) return;
  const normalized = nwNormTextSize(size);
  root.classList.remove('nw-sh-text-compact', 'nw-sh-text-normal', 'nw-sh-text-large');
  if (normalized === 'compact') root.classList.add('nw-sh-text-compact');
  else if (normalized === 'large') root.classList.add('nw-sh-text-large');
  else root.classList.add('nw-sh-text-normal');
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
  } else if (type === 'color') {
    body.appendChild(nwCreateColorPopover(dev, canWrite));
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

function nwCreateColorPopover(dev, canWrite) {
  const wrap = document.createElement('div');

  const cCfg = (dev.io && dev.io.color) ? dev.io.color : {};
  const hasWrite = canWrite && !!(cCfg && (cCfg.writeId || cCfg.readId));

  const st = dev.state || {};

  const normHex = (val) => {
    if (val === null || typeof val === 'undefined') return null;
    let s = String(val).trim();
    if (!s) return null;
    if (s.startsWith('#')) s = s.slice(1);
    if (s.startsWith('0x') || s.startsWith('0X')) s = s.slice(2);
    if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
    return null;
  };

  let current = normHex(st.color) || '#ffffff';

  /* --------------------------- HSV helpers (UI) --------------------------- */
  const clamp01 = (n) => Math.max(0, Math.min(1, Number(n)));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n)));

  function hexToRgb(hex) {
    const h = normHex(hex);
    if (!h) return { r: 255, g: 255, b: 255 };
    const s = h.slice(1);
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    return { r, g, b };
  }

  function rgbToHex(r, g, b) {
    const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
    const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
    const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
    return ('#' + rr + gg + bb).toLowerCase();
  }

  function rgbToHsv(r, g, b) {
    const rr = clamp01(r / 255);
    const gg = clamp01(g / 255);
    const bb = clamp01(b / 255);
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rr) h = ((gg - bb) / d) % 6;
      else if (max === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h = h * 60;
      if (h < 0) h += 360;
    }
    const s = (max === 0) ? 0 : (d / max);
    const v = max;
    return { h, s, v };
  }

  function hsvToRgb(h, s, v) {
    const hh = ((Number(h) % 360) + 360) % 360;
    const ss = clamp01(s);
    const vv = clamp01(v);
    const c = vv * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = vv - c;
    let rr = 0, gg = 0, bb = 0;
    if (hh < 60) { rr = c; gg = x; bb = 0; }
    else if (hh < 120) { rr = x; gg = c; bb = 0; }
    else if (hh < 180) { rr = 0; gg = c; bb = x; }
    else if (hh < 240) { rr = 0; gg = x; bb = c; }
    else if (hh < 300) { rr = x; gg = 0; bb = c; }
    else { rr = c; gg = 0; bb = x; }
    return {
      r: Math.round((rr + m) * 255),
      g: Math.round((gg + m) * 255),
      b: Math.round((bb + m) * 255)
    };
  }

  let hsv = { h: 0, s: 0, v: 1 };
  function setHsvFromHex(hex) {
    const rgb = hexToRgb(hex);
    const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
    // Keep hue when saturation is 0 (gray), so the wheel stays stable.
    if (next.s === 0 && hsv && typeof hsv.h === 'number') next.h = hsv.h;
    hsv = next;
  }

  // Initialize HSV from current color
  setHsvFromHex(current);

  // Live-preview toggle (throttled writes while dragging/selecting)
  let livePreview = nwLoadBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, NW_SH_LIVE_PREVIEW_DEFAULT);
  const liveSender = (hasWrite)
    ? nwCreateLivePreviewSender(async (val) => { await nwSetColor(dev.id, val); }, NW_SH_LIVE_PREVIEW_THROTTLE_MS)
    : null;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = 'Farbe';

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = current.toUpperCase();

  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';

  const preview = document.createElement('div');
  preview.className = 'nw-sh-colorpreview nw-sh-colorpreview--mini';
  preview.style.background = current;
  right.appendChild(preview);

  right.appendChild(v);

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
    liveBtn.title = 'Live-Vorschau beim Auswählen (gedrosselt)';
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

  const picker = document.createElement('div');
  picker.className = 'nw-sh-colorwheelbox';

  const wheelWrap = document.createElement('div');
  wheelWrap.className = 'nw-sh-colorwheel-wrap' + (!hasWrite ? ' nw-disabled' : '');

  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.className = 'nw-sh-colorwheel-canvas';
  wheelWrap.appendChild(wheelCanvas);

  const wheelMarker = document.createElement('div');
  wheelMarker.className = 'nw-sh-colorwheel-marker';
  wheelWrap.appendChild(wheelMarker);

  const valueSlider = document.createElement('input');
  valueSlider.type = 'range';
  valueSlider.min = '0';
  valueSlider.max = '100';
  valueSlider.step = '1';
  valueSlider.value = String(Math.round(clamp01(hsv.v) * 100));
  valueSlider.className = 'nw-sh-slider nw-sh-slider--big nw-sh-slider--colorvalue';
  valueSlider.disabled = !hasWrite;

  function hsvToHex(h, s, vVal) {
    const rgb = hsvToRgb(h, s, vVal);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function updateValueSliderGradient() {
    // Gradient: black -> full brightness of current hue/sat
    const full = hsvToHex(hsv.h, hsv.s, 1);
    valueSlider.style.setProperty('--nw-colorvalue', `linear-gradient(90deg, #000000, ${full})`);
  }

  function updateWheelMarker() {
    const size = wheelWrap.clientWidth || 240;
    const radius = size / 2;
    const r = radius - 10; // keep marker within circle
    const rad = (hsv.h * Math.PI) / 180;
    const dist = clamp01(hsv.s) * r;
    const x = radius + Math.cos(rad) * dist;
    const y = radius + Math.sin(rad) * dist;
    wheelMarker.style.left = `${x}px`;
    wheelMarker.style.top = `${y}px`;
    wheelMarker.style.background = current;
  }

  function setUi(hex) {
    const h = normHex(hex) || '#ffffff';
    current = h;
    preview.style.background = h;
    v.textContent = h.toUpperCase();
    setHsvFromHex(h);
    valueSlider.value = String(Math.round(clamp01(hsv.v) * 100));
    updateValueSliderGradient();
    updateWheelMarker();
  }

  function drawWheel() {
    // IMPORTANT (Mobile/Retina): We must render the wheel in *canvas pixels*,
    // not CSS pixels. Otherwise the wheel only fills the top-left corner on
    // high-DPR devices (e.g. iPhone).
    const sizeCss = wheelWrap.clientWidth || 240;
    const size = Math.max(160, Math.min(300, Math.round(sizeCss)));
    const dpr = (window.devicePixelRatio || 1);
    const px = Math.max(1, Math.round(size * dpr));

    wheelCanvas.width = px;
    wheelCanvas.height = px;
    wheelCanvas.style.width = `${size}px`;
    wheelCanvas.style.height = `${size}px`;

    const ctx = wheelCanvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);

    const cx = px / 2;
    const cy = px / 2;
    const R = (px / 2) - 1;

    const img = ctx.createImageData(px, px);
    const data = img.data;

    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * px + x) * 4;

        if (dist > R) {
          data[idx + 3] = 0;
          continue;
        }

        const sat = dist / R;
        let ang = Math.atan2(dy, dx) * 180 / Math.PI;
        if (ang < 0) ang += 360;
        const rgb = hsvToRgb(ang, sat, 1);
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  async function commitColor(hex, opts) {
    const options = opts || {};
    const showStatus = (options.showStatus !== false);
    const reload = (options.reload !== false);
    const h = normHex(hex) || '#ffffff';
    setUi(h);
    if (!hasWrite) return h;
    if (showStatus) setBusy();
    const res = await nwSetColor(dev.id, h);
    if (showStatus) {
      if (res === null) setErr();
      else setOk();
    }
    if (reload) await nwReloadDevices({ force: true });
    return h;
  }

  // Render wheel once the element has a size
  requestAnimationFrame(() => {
    drawWheel();
    updateValueSliderGradient();
    updateWheelMarker();
  });

  // Wheel interaction (hue/sat)
  let wheelDragging = false;
  function updateFromWheelEvent(ev, opts) {
    const options = opts || {};
    const commit = options.commit === true;
    const rect = wheelWrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = (ev.clientX != null) ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
    const y = (ev.clientY != null) ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0);
    const dx = x - cx;
    const dy = y - cy;
    const R = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sat = clamp01(dist / R);
    let ang = Math.atan2(dy, dx) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    hsv.h = ang;
    hsv.s = sat;
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setUi(hex);
    if (hasWrite && livePreview && liveSender && !commit) {
      liveSender.trigger(String(hex), false);
    }
  }

  wheelWrap.addEventListener('pointerdown', (ev) => {
    if (!hasWrite) return;
    ev.preventDefault();
    ev.stopPropagation();
    wheelDragging = true;
    try { wheelWrap.setPointerCapture(ev.pointerId); } catch (_e) {}
    updateFromWheelEvent(ev, { commit: false });
  });
  wheelWrap.addEventListener('pointermove', (ev) => {
    if (!wheelDragging) return;
    if (!hasWrite) return;
    ev.preventDefault();
    updateFromWheelEvent(ev, { commit: false });
  });
  async function endWheel(ev) {
    if (!wheelDragging) return;
    wheelDragging = false;
    if (!hasWrite) return;
    ev.preventDefault();
    updateFromWheelEvent(ev, { commit: true });
    await commitColor(current);
  }
  wheelWrap.addEventListener('pointerup', endWheel);
  wheelWrap.addEventListener('pointercancel', () => { wheelDragging = false; });

  // Brightness (V) slider
  valueSlider.addEventListener('input', (ev) => {
    const val = ev && ev.target ? Number(ev.target.value) : 0;
    hsv.v = clamp01(val / 100);
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setUi(hex);
    if (hasWrite && livePreview && liveSender) {
      liveSender.trigger(String(hex), false);
    }
  });
  valueSlider.addEventListener('change', async () => {
    if (!hasWrite) return;
    await commitColor(current);
  });

  picker.appendChild(wheelWrap);
  picker.appendChild(valueSlider);

  const presets = document.createElement('div');
  presets.className = 'nw-sh-popover__presets';
  const presetList = [
    { label: 'Warmweiß', value: '#ffd79a' },
    { label: 'Kaltweiß', value: '#dbeafe' },
    { label: 'Rot', value: '#ef4444' },
    { label: 'Grün', value: '#22c55e' },
    { label: 'Blau', value: '#3b82f6' },
  ];
  presetList.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip nw-sh-chip--mini';
    b.textContent = p.label;
    b.disabled = !hasWrite;
    b.addEventListener('click', (ev) => ev.stopPropagation());
    b.addEventListener('click', async () => {
      if (!hasWrite) return;
      await commitColor(p.value);
    });
    presets.appendChild(b);
  });

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';

  function updateHint() {
    if (!hasWrite) {
      hint.textContent = 'Nur Anzeige (keine Schreib‑DP / writeId konfiguriert).';
      return;
    }
    hint.textContent = livePreview
      ? 'Live-Vorschau: AN (gedrosselt). Beim Loslassen wird die Farbe final übernommen.'
      : 'Tipp: Farbe wählen – wird beim Loslassen übernommen.';
  }
  updateHint();

  wrap.appendChild(row);
  wrap.appendChild(picker);
  wrap.appendChild(presets);
  wrap.appendChild(hint);

  // Optional: Ein/Aus Button (falls Schalt-DP vorhanden)
  const sw = (dev.io && dev.io.switch) ? dev.io.switch : null;
  const hasSwitch = canWrite && !!(sw && (sw.writeId || sw.readId));
  if (hasSwitch) {
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
    });

    btnRow.appendChild(document.createElement('div'));
    btnRow.appendChild(toggle);
    wrap.appendChild(btnRow);
  }

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

  const roomGroups = nwGroupByRoom(devices);

  // Group rooms by floorId (so the runtime matches the editor structure)
  const floorMap = new Map();
  roomGroups.forEach((rg) => {
    const fid = String(rg && rg.floorId ? rg.floorId : '').trim();
    const key = fid || '__no_floor__';
    if (!floorMap.has(key)) floorMap.set(key, []);
    floorMap.get(key).push(rg);
  });

  const floorsById = nwShMeta.floorsById || {};
  const floorKeys = Array.from(floorMap.keys());
  floorKeys.sort((a, b) => {
    // "no floor" at the end
    if (a === '__no_floor__' && b !== '__no_floor__') return 1;
    if (b === '__no_floor__' && a !== '__no_floor__') return -1;

    const fa = floorsById[a];
    const fb = floorsById[b];
    const oa = (fa && Number.isFinite(+fa.order)) ? +fa.order : 999998;
    const ob = (fb && Number.isFinite(+fb.order)) ? +fb.order : 999998;
    if (oa !== ob) return oa - ob;

    const na = (fa && fa.name) ? fa.name : a;
    const nb = (fb && fb.name) ? fb.name : b;
    return String(na || '').toLowerCase().localeCompare(String(nb || '').toLowerCase());
  });

  const renderRoomSection = (g) => {
    const section = document.createElement('section');
    section.className = 'nw-sh-room';

    const header = document.createElement('div');
    header.className = 'nw-sh-room__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-room__title';

    const roomIcon = String(g && g.icon ? g.icon : '').trim();
    const roomIconHtml = nwStaticIconHtml(roomIcon);
    if (roomIconHtml) {
      title.innerHTML = `<span class="nw-sh-room__icon">${roomIconHtml}</span><span class="nw-sh-room__label"></span>`;
      const lbl = title.querySelector('.nw-sh-room__label');
      if (lbl) lbl.textContent = g.room;
    } else {
      title.textContent = g.room;
    }

    header.appendChild(title);

    // Small room summary (e.g. temperature / humidity) based on all devices in that room.
    const summaryText = (g && g.isFloorDevicesGroup) ? '' : nwComputeRoomSummary(g.roomId, nwAllDevices);
    if (summaryText) {
      const summary = document.createElement('div');
      summary.className = 'nw-sh-room__summary';
      summary.textContent = summaryText;
      header.appendChild(summary);
    }
    section.appendChild(header);

    // stable ordering inside room
    const arr = (g.devices || []).slice();
    arr.sort(nwCompareDevices);

    if (nwViewState && nwViewState.groupByType) {
      const typeGroups = nwGroupDevicesByType(arr);
      typeGroups.forEach((tg) => {
        const tgWrap = document.createElement('div');
        tgWrap.className = 'nw-sh-type-group';

        const tgHead = document.createElement('div');
        tgHead.className = 'nw-sh-type-group__head';
        tgHead.innerHTML = `${tg.icon ? `<span class=\"nw-sh-type-group__icon\">${tg.icon}</span>` : ''}<span class=\"nw-sh-type-group__title\">${tg.title}</span><span class=\"nw-sh-type-group__count\">${tg.devices.length}</span>`;

        const tgGrid = document.createElement('div');
        tgGrid.className = 'nw-sh-grid';
        tg.devices.forEach((dev) => tgGrid.appendChild(nwCreateTile(dev)));

        tgWrap.appendChild(tgHead);
        tgWrap.appendChild(tgGrid);
        section.appendChild(tgWrap);
      });
    } else {
      const grid = document.createElement('div');
      grid.className = 'nw-sh-grid';
      arr.forEach((dev) => grid.appendChild(nwCreateTile(dev)));
      section.appendChild(grid);
    }
    return section;
  };

  floorKeys.forEach((floorId) => {
    const isUnassigned = floorId === '__no_floor__';
    const f = isUnassigned ? null : floorsById[floorId];
    const floorName = isUnassigned ? 'Ohne Geschoss' : (f && (f.name || f.title) ? (f.name || f.title) : floorId);
    const floorIcon = isUnassigned ? '🧩' : String((f && f.icon) ? f.icon : '🏢');
    const floorIconHtml = nwStaticIconHtml(floorIcon);

    const floorSection = document.createElement('section');
    floorSection.className = 'nw-sh-floor' + (isUnassigned ? ' nw-sh-floor--unassigned' : '');

    const header = document.createElement('div');
    header.className = 'nw-sh-floor__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-floor__title';
    title.innerHTML = `${floorIconHtml ? `<span class=\"nw-sh-floor__icon\">${floorIconHtml}</span>` : ''}<span class=\"nw-sh-floor__label\"></span>`;
    const lbl = title.querySelector('.nw-sh-floor__label');
    if (lbl) lbl.textContent = floorName;
    header.appendChild(title);

    // Optional quick summary (rooms + device count)
    const roomsInFloor = floorMap.get(floorId) || [];
    const devCount = roomsInFloor.reduce((acc, rg) => acc + ((rg && Array.isArray(rg.devices)) ? rg.devices.length : 0), 0);
    const roomCount = roomsInFloor.filter(rg => rg && rg.roomId && !String(rg.roomId).startsWith('__floor__')).length;
    const sum = document.createElement('div');
    sum.className = 'nw-sh-floor__summary';
    sum.textContent = `${roomCount} Räume · ${devCount} Geräte`;
    header.appendChild(sum);

    floorSection.appendChild(header);

    const roomsWrap = document.createElement('div');
    roomsWrap.className = 'nw-sh-floor__rooms';

    roomsInFloor.sort((a, b) => {
      const oa = (a && Number.isFinite(+a.order)) ? +a.order : 999999;
      const ob = (b && Number.isFinite(+b.order)) ? +b.order : 999999;
      if (oa !== ob) return oa - ob;
      return String(a && a.room ? a.room : '').toLowerCase().localeCompare(String(b && b.room ? b.room : '').toLowerCase());
    });

    roomsInFloor.forEach((rg) => roomsWrap.appendChild(renderRoomSection(rg)));
    floorSection.appendChild(roomsWrap);
    wrap.appendChild(floorSection);
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

    // stable ordering inside function
    const arr = (g.devices || []).slice();
    arr.sort(nwCompareDevices);

    if (nwViewState && nwViewState.groupByType) {
      const typeGroups = nwGroupDevicesByType(arr);
      typeGroups.forEach((tg) => {
        const tgWrap = document.createElement('div');
        tgWrap.className = 'nw-sh-type-group';

        const tgHead = document.createElement('div');
        tgHead.className = 'nw-sh-type-group__head';
        tgHead.innerHTML = `${tg.icon ? `<span class=\"nw-sh-type-group__icon\">${tg.icon}</span>` : ''}<span class=\"nw-sh-type-group__title\">${tg.title}</span><span class=\"nw-sh-type-group__count\">${tg.devices.length}</span>`;

        const tgGrid = document.createElement('div');
        tgGrid.className = 'nw-sh-grid';
        tg.devices.forEach((dev) => tgGrid.appendChild(nwCreateTile(dev, { showRoom: true })));

        tgWrap.appendChild(tgHead);
        tgWrap.appendChild(tgGrid);
        section.appendChild(tgWrap);
      });
    } else {
      const grid = document.createElement('div');
      grid.className = 'nw-sh-grid';
      arr.forEach((dev) => grid.appendChild(nwCreateTile(dev, { showRoom: true })));
      section.appendChild(grid);
    }
    wrap.appendChild(section);
  });
}

function nwFindFloorPageId(floorId) {
  const fid = nwNormalizeId(floorId);
  const directId = fid ? `floor_${fid}` : 'floor_unassigned';
  const pages = Array.isArray(nwPageState.pages) ? nwPageState.pages : [];
  if (pages.some(p => p && p.id === directId)) return directId;

  // Fallback: try to locate a floor page by its derived floor id
  const match = pages.find(p => p && nwIsFloorPage(p) && nwGetFloorIdFromPage(p) === fid);
  return match ? match.id : directId;
}

function nwFindRoomPageId(roomId) {
  const rid = nwNormalizeId(roomId);
  const directId = rid ? `room_${rid}` : '';
  const pages = Array.isArray(nwPageState.pages) ? nwPageState.pages : [];
  if (directId && pages.some(p => p && p.id === directId)) return directId;

  const match = pages.find(p => p && Array.isArray(p.roomIds) && p.roomIds.length === 1 && nwNormalizeId(p.roomIds[0]) === rid);
  return match ? match.id : directId;
}

function nwRenderHome(devices) {
  const wrap = document.getElementById('nw-smarthome-rooms');
  if (!wrap) return;
  nwClear(wrap);

  const root = document.createElement('div');
  root.className = 'nw-sh-home';

  const all = Array.isArray(devices) ? devices.slice() : [];
  const favs = all.filter(d => nwIsFavorite(d));
  const onCount = all.filter(d => nwIsOn(d)).length;

  // --- Info / Summary ---
  const info = document.createElement('section');
  info.className = 'nw-sh-home__info';
  info.innerHTML = `
    <div class="nw-sh-home__info-title">Übersicht</div>
    <div class="nw-sh-home__info-grid">
      <div class="nw-sh-home__stat"><div class="nw-sh-home__stat-val">${all.length}</div><div class="nw-sh-home__stat-lbl">Geräte</div></div>
      <div class="nw-sh-home__stat"><div class="nw-sh-home__stat-val">${favs.length}</div><div class="nw-sh-home__stat-lbl">Favoriten</div></div>
      <div class="nw-sh-home__stat"><div class="nw-sh-home__stat-val">${onCount}</div><div class="nw-sh-home__stat-lbl">Aktiv</div></div>
    </div>
  `;
  root.appendChild(info);

  // --- Favorites ---
  const favSec = document.createElement('section');
  favSec.className = 'nw-sh-home__section';
  const favHead = document.createElement('div');
  favHead.className = 'nw-sh-home__section-head';
  favHead.textContent = 'Favoriten';
  favSec.appendChild(favHead);

  if (favs.length) {
    const grid = document.createElement('div');
    grid.className = 'nw-sh-grid nw-sh-grid--home';
    const arr = favs.slice().sort(nwCompareDevices);
    arr.forEach((dev) => grid.appendChild(nwCreateTile(dev, { showRoom: true })));
    favSec.appendChild(grid);
  } else {
    const empty = document.createElement('div');
    empty.className = 'nw-sh-home__muted';
    empty.textContent = 'Noch keine Favoriten gesetzt.';
    favSec.appendChild(empty);
  }
  root.appendChild(favSec);

  // --- Floors overview (tiles) ---
  const floorSec = document.createElement('section');
  floorSec.className = 'nw-sh-home__section';
  const floorHead = document.createElement('div');
  floorHead.className = 'nw-sh-home__section-head';
  floorHead.textContent = 'Geschosse';
  floorSec.appendChild(floorHead);

  const floorsWrap = document.createElement('div');
  floorsWrap.className = 'nw-sh-home__floors';

  const cfg = nwShConfig || {};
  const floors = Array.isArray(cfg.floors) ? cfg.floors.slice() : [];
  const rooms = Array.isArray(cfg.rooms) ? cfg.rooms.slice() : [];

  const sortByOrderName = (a, b) => {
    const oa = Number.isFinite(+a.order) ? +a.order : 0;
    const ob = Number.isFinite(+b.order) ? +b.order : 0;
    if (oa !== ob) return oa - ob;
    return String(a.name || a.title || a.id || '').toLowerCase().localeCompare(String(b.name || b.title || b.id || '').toLowerCase(), 'de');
  };

  const sortedFloors = floors
    .map((f, idx) => ({ ...f, order: (typeof f.order === 'number') ? f.order : (idx + 1) }))
    .slice()
    .sort(sortByOrderName);

  const unassignedRooms = rooms.filter(r => !nwNormalizeId(r && r.floorId));
  const hasUnassignedDevices = all.some(d => nwGetDeviceFloorId(d) === '');

  const floorTiles = [];
  sortedFloors.forEach((f) => {
    const fid = nwNormalizeId(f && f.id);
    if (!fid) return;
    floorTiles.push({
      id: fid,
      name: String(f.name || f.title || f.id || fid),
      icon: String(f.icon || '🏢'),
      order: (typeof f.order === 'number') ? f.order : 0,
    });
  });

  if (unassignedRooms.length || hasUnassignedDevices) {
    floorTiles.push({
      id: '',
      name: 'Ohne Geschoss',
      icon: '🧩',
      order: 99999,
      _virtual: true,
    });
  }

  floorTiles.forEach((fl) => {
    const fid = nwNormalizeId(fl.id);
    const roomsInFloor = rooms
      .filter(r => (fid ? (nwNormalizeId(r && r.floorId) === fid) : !nwNormalizeId(r && r.floorId)))
      .slice()
      .sort(sortByOrderName);

    const devCount = all.filter(d => nwGetDeviceFloorId(d) === fid).length;
    const roomCount = roomsInFloor.length;

    const tile = document.createElement('div');
    tile.className = 'nw-sh-floor-tile';
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');

    const head = document.createElement('div');
    head.className = 'nw-sh-floor-tile__head';

    const icon = document.createElement('div');
    icon.className = 'nw-sh-floor-tile__icon';
    icon.innerHTML = nwStaticIconHtml(fl.icon);

    const name = document.createElement('div');
    name.className = 'nw-sh-floor-tile__name';
    name.textContent = fl.name;

    head.appendChild(icon);
    head.appendChild(name);
    tile.appendChild(head);

    const meta = document.createElement('div');
    meta.className = 'nw-sh-floor-tile__meta';
    meta.textContent = `${roomCount} Räume · ${devCount} Geräte`;
    tile.appendChild(meta);

    const roomsRow = document.createElement('div');
    roomsRow.className = 'nw-sh-floor-tile__rooms';

    const maxChips = 6;
    roomsInFloor.slice(0, maxChips).forEach((r) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'nw-sh-room-chip';
      chip.innerHTML = `${r.icon ? `<span class="nw-sh-room-chip__icon">${nwStaticIconHtml(r.icon)}</span>` : ''}<span class="nw-sh-room-chip__label"></span>`;
      const lbl = chip.querySelector('.nw-sh-room-chip__label');
      if (lbl) lbl.textContent = String(r.name || r.id);
      chip.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const pid = nwFindRoomPageId(r.id);
        if (pid) nwActivatePage(pid);
      });
      roomsRow.appendChild(chip);
    });

    if (roomsInFloor.length > maxChips) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'nw-sh-room-chip nw-sh-room-chip--more';
      more.textContent = `+${roomsInFloor.length - maxChips}`;
      more.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const pid = nwFindFloorPageId(fid);
        if (pid) nwActivatePage(pid);
      });
      roomsRow.appendChild(more);
    }

    tile.appendChild(roomsRow);

    const go = () => {
      const pid = nwFindFloorPageId(fid);
      if (pid) nwActivatePage(pid);
    };
    tile.addEventListener('click', go);
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });

    floorsWrap.appendChild(tile);
  });

  if (!floorTiles.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-sh-home__muted';
    empty.textContent = 'Noch keine Geschosse angelegt. (Bitte im SmartHome-Editor konfigurieren.)';
    floorsWrap.appendChild(empty);
  }

  floorSec.appendChild(floorsWrap);
  root.appendChild(floorSec);

  wrap.appendChild(root);
}

// ---------- Sidebar Pages (Navigation Presets) ----------

function nwNormalizeId(s) {
  return String(s || '').trim();
}

function nwBuildMetaFromConfig(cfg) {
  nwShMeta.floorsById = {};
  nwShMeta.floorIdByName = {};
  nwShMeta.roomsById = {};
  nwShMeta.funcsById = {};
  nwShMeta.roomIdByName = {};
  nwShMeta.funcIdByName = {};

  const floors = Array.isArray(cfg && cfg.floors) ? cfg.floors : [];
  const rooms = Array.isArray(cfg && cfg.rooms) ? cfg.rooms : [];
  const funcs = Array.isArray(cfg && cfg.functions) ? cfg.functions : [];

  floors.forEach(fl => {
    const id = nwNormalizeId(fl && fl.id);
    const name = nwNormalizeId(fl && (fl.name || fl.title || fl.id));
    if (!id) return;
    nwShMeta.floorsById[id] = { ...fl, id, name: name || id };
    if (name) nwShMeta.floorIdByName[name] = id;
  });

  rooms.forEach(r => {
    const id = nwNormalizeId(r.id);
    const name = nwNormalizeId(r.name);
    if (!id || !name) return;
    nwShMeta.roomsById[id] = { ...r, id, name };
    nwShMeta.roomIdByName[name] = id;
  });

  funcs.forEach(f => {
    const id = nwNormalizeId(f.id);
    const name = nwNormalizeId(f.name);
    if (!id || !name) return;
    nwShMeta.funcsById[id] = { ...f, id, name };
    nwShMeta.funcIdByName[name] = id;
  });
}

function nwBuildDefaultPagesFromConfig(cfg) {
  const pages = [];

  // Home = Overview (alle Geschosse + Räume)
  pages.push({
    id: 'home',
    title: 'Home',
    icon: '🏠',
    viewMode: 'rooms',
    roomIds: [],
    funcIds: [],
    types: [],
    favoritesOnly: false,
    order: 0,
  });

  const floors = Array.isArray(cfg && cfg.floors) ? cfg.floors : [];
  const rooms = Array.isArray(cfg && cfg.rooms) ? cfg.rooms : [];

  // If no floors exist, keep the legacy flat room navigation.
  if (!floors.length) {
    rooms
      .slice()
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 0;
        const ob = (typeof b.order === 'number') ? b.order : 0;
        if (oa !== ob) return oa - ob;
        return nwSortBy(String(a.name || ''), String(b.name || ''));
      })
      .forEach((r, idx) => {
        const id = nwNormalizeId(r.id);
        const name = nwNormalizeId(r.name);
        if (!id || !name) return;
        pages.push({
          id: `room_${id}`,
          title: name,
          icon: r.icon || '🏷️',
          viewMode: 'rooms',
          roomIds: [id],
          funcIds: [],
          types: [],
          favoritesOnly: false,
          order: 10 + idx,
        });
      });
    return pages;
  }

  // Rooms by floor
  const roomsByFloor = new Map();
  const unassignedRooms = [];

  for (const r of rooms) {
    const rid = nwNormalizeId(r && r.id);
    const rname = nwNormalizeId(r && r.name);
    if (!rid || !rname) continue;

    const fid = nwNormalizeId(r && r.floorId);
    if (fid) {
      if (!roomsByFloor.has(fid)) roomsByFloor.set(fid, []);
      roomsByFloor.get(fid).push(r);
    } else {
      unassignedRooms.push(r);
    }
  }

  // Sort floors by configured order/name
  const sortedFloors = floors
    .slice()
    .map((f, idx) => ({
      id: nwNormalizeId(f && f.id),
      name: nwNormalizeId(f && (f.name || f.title || f.id)) || nwNormalizeId(f && f.id),
      icon: nwNormalizeId(f && f.icon) || '🏢',
      order: (typeof (f && f.order) === 'number') ? f.order : idx + 1,
    }))
    .filter((f) => f && f.id)
    .sort((a, b) => {
      const oa = (typeof a.order === 'number') ? a.order : 0;
      const ob = (typeof b.order === 'number') ? b.order : 0;
      if (oa !== ob) return oa - ob;
      return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase(), 'de');
    });

  const NO_MATCH = '__nw_no_match__';

  // Floors as nav parents + rooms as children (hierarchical: Räume nach Etage)
  sortedFloors.forEach((f, fIdx) => {
    const floorPageId = `floor_${f.id}`;
    const roomsInFloor = (roomsByFloor.get(f.id) || [])
      .slice()
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 0;
        const ob = (typeof b.order === 'number') ? b.order : 0;
        if (oa !== ob) return oa - ob;
        return nwSortBy(String(a.name || ''), String(b.name || ''));
      });

    const roomIds = roomsInFloor
      .map((r) => nwNormalizeId(r && r.id))
      .filter(Boolean);

    pages.push({
      id: floorPageId,
      title: f.name || f.id,
      icon: f.icon || '🏢',
      viewMode: 'rooms',
      // If there are currently no rooms in that floor, avoid showing "all devices".
      roomIds: roomIds.length ? roomIds : [NO_MATCH],
      funcIds: [],
      types: [],
      favoritesOnly: false,
      order: 10 + fIdx,
    });

    roomsInFloor.forEach((r, rIdx) => {
      const rid = nwNormalizeId(r && r.id);
      const rname = nwNormalizeId(r && r.name);
      if (!rid || !rname) return;
      pages.push({
        id: `room_${rid}`,
        title: rname,
        icon: r.icon || '🏷️',
        viewMode: 'rooms',
        roomIds: [rid],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        parentId: floorPageId,
        order: (typeof r.order === 'number') ? r.order : rIdx,
      });
    });
  });

  // Unassigned rooms (no floorId) → own group at the end
  if (unassignedRooms.length) {
    const floorPageId = 'floor_unassigned';
    const roomsSorted = unassignedRooms
      .slice()
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 0;
        const ob = (typeof b.order === 'number') ? b.order : 0;
        if (oa !== ob) return oa - ob;
        return nwSortBy(String(a.name || ''), String(b.name || ''));
      });

    const roomIds = roomsSorted.map((r) => nwNormalizeId(r && r.id)).filter(Boolean);

    pages.push({
      id: floorPageId,
      title: 'Ohne Geschoss',
      icon: '🧩',
      viewMode: 'rooms',
      roomIds: roomIds.length ? roomIds : [NO_MATCH],
      funcIds: [],
      types: [],
      favoritesOnly: false,
      order: 9999,
    });

    roomsSorted.forEach((r, rIdx) => {
      const rid = nwNormalizeId(r && r.id);
      const rname = nwNormalizeId(r && r.name);
      if (!rid || !rname) return;
      pages.push({
        id: `room_${rid}`,
        title: rname,
        icon: r.icon || '🏷️',
        viewMode: 'rooms',
        roomIds: [rid],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        parentId: floorPageId,
        order: (typeof r.order === 'number') ? r.order : rIdx,
      });
    });
  }

  return pages;
}

function nwIsHomePage(page) {
  if (!page) return false;
  const id = String(page.id || '').trim().toLowerCase();
  if (id === 'home') return true;
  const title = String(page.title || '').trim().toLowerCase();
  if (title === 'home' || title === 'übersicht' || title === 'uebersicht') return true;
  return false;
}

function nwIsLegacyFlatRoomPages(pages, cfg) {
  // Legacy auto-default: Home + one page per room, all at root level.
  const arr = Array.isArray(pages) ? pages : [];
  const rooms = Array.isArray(cfg && cfg.rooms) ? cfg.rooms : [];
  if (!arr.length || !rooms.length) return false;

  const hasHome = arr.some((p) => nwIsHomePage(p));
  if (!hasHome) return false;

  // No nesting, no floors, no other filter presets.
  if (arr.some((p) => p && p.parentId)) return false;
  if (arr.some((p) => p && String(p.id || '').startsWith('floor_'))) return false;

  const others = arr.filter((p) => p && !nwIsHomePage(p));
  if (!others.length) return false;

  // All others look like simple "one room per page" entries.
  // (Older versions used ids like room_<id>, but some configs used custom ids.
  // We therefore validate via roomIds and known room IDs.)
  const roomIdSet = new Set(rooms.map((r) => nwNormalizeId(r && r.id || '')).filter(Boolean));
  const usedRoomIds = new Set();
  for (const p of others) {
    if (!p) return false;
    if (!Array.isArray(p.roomIds) || p.roomIds.length !== 1) return false;
    const rid = nwNormalizeId(p.roomIds[0]);
    if (!rid || !roomIdSet.has(rid)) return false;
    if (usedRoomIds.has(rid)) return false;
    usedRoomIds.add(rid);
    if (Array.isArray(p.funcIds) && p.funcIds.length) return false;
    if (Array.isArray(p.types) && p.types.length) return false;
    if (p.favoritesOnly) return false;
  }

  // Heuristic: if we have floors or rooms reference floorId, we can upgrade safely.
  const floors = Array.isArray(cfg && cfg.floors) ? cfg.floors : [];
  const roomsHaveFloors = rooms.some((r) => r && String(r.floorId || '').trim());

  return (floors && floors.length) || roomsHaveFloors;
}

function nwGetPagesFromConfig(cfg) {
  const pages = Array.isArray(cfg && cfg.pages) ? cfg.pages : [];

  // Auto-upgrade: older configs often saved the legacy flat room navigation.
  // If floors exist (hierarchical mode), regenerate the default pages to reflect
  // Geschoss → Raum in the sidebar, matching the editor structure.
  if (pages && pages.length && nwIsLegacyFlatRoomPages(pages, cfg)) {
    return nwBuildDefaultPagesFromConfig(cfg);
  }

  if (pages && pages.length) {
    return pages
      .map((p, idx) => ({
        id: nwNormalizeId(p.id || `page_${idx + 1}`),
        title: nwNormalizeId(p.title || p.name || p.id || `Seite ${idx + 1}`),
        icon: nwNormalizeId(p.icon || ''),
        viewMode: nwNormalizeId(p.viewMode || ''),
        roomIds: Array.isArray(p.roomIds) ? p.roomIds.map(nwNormalizeId).filter(Boolean) : [],
        funcIds: Array.isArray(p.funcIds) ? p.funcIds.map(nwNormalizeId).filter(Boolean) : [],
        types: Array.isArray(p.types) ? p.types.map(nwNormalizeId).filter(Boolean) : [],
        favoritesOnly: !!p.favoritesOnly,
        order: (typeof p.order === 'number') ? p.order : idx,
        href: nwNormalizeId(p.href || ''),
        parentId: nwNormalizeId(p.parentId || ''),
        cardSize: (() => { const v = String((p.cardSize ?? (p.layout && p.layout.cardSize)) || '').trim(); return ['auto','s','m','l','xl'].includes(v) ? v : 'auto'; })(),
        sortBy: (() => { const v = String((p.sortBy ?? (p.layout && p.layout.sortBy)) || '').trim(); return ['order','name','type'].includes(v) ? v : 'order'; })(),
        groupByType: !!(p.groupByType ?? (p.layout && p.layout.groupByType)),
      }))
      .filter(p => p.id && p.title)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return nwBuildDefaultPagesFromConfig(cfg);
}

function nwSetSidebarOpen(open) {
  const sidebar = document.getElementById('nwShSidebar');
  const overlay = document.getElementById('nwShOverlay');
  if (!sidebar || !overlay) return;

  const isOpen = !!open;
  sidebar.classList.toggle('nw-sh-sidebar--open', isOpen);
  overlay.style.display = isOpen ? 'block' : 'none';
}

function nwInitSidebarUi() {
  const btn = document.getElementById('nwShNavToggle');
  const overlay = document.getElementById('nwShOverlay');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sidebar = document.getElementById('nwShSidebar');
      const isOpen = sidebar ? sidebar.classList.contains('nw-sh-sidebar--open') : false;
      nwSetSidebarOpen(!isOpen);
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => nwSetSidebarOpen(false));
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') nwSetSidebarOpen(false);
  });

  window.addEventListener('resize', () => {
    // If we leave mobile breakpoint, ensure overlay/drawer state is reset
    if (window.innerWidth > 900) nwSetSidebarOpen(false);
  });
}

// ---------------------------------------------------------------------------
// UI helpers (defensive)
//
// The SmartHome VIS must never crash due to missing helpers. Earlier builds
// referenced these functions but did not ship them, which prevented the whole
// page from rendering.

function nwUpdatePageTitle() {
  const el = document.getElementById('nwShPageTitle');
  const subEl = document.getElementById('nwShPageSubTitle');
  const pages = Array.isArray(nwPageState.pages) ? nwPageState.pages : [];
  const activeId = nwPageState.activeId;

  const page = pages.find((p) => p && p.id === activeId) || pages[0] || null;
  const title = (page && page.title) ? String(page.title) : 'SmartHome';

  // Breadcrumb subtitle (hierarchy-aware): show parent page label (e.g. floor name when a room is active)
  let subtitle = '';
  try {
    if (page && page.id) {
      const byId = new Map(pages.map((p) => [p.id, p]));
      const chain = [];
      let cur = page;
      let safety = 50;
      while (cur && safety-- > 0) {
        chain.unshift(cur);
        if (!cur.parentId) break;
        const next = byId.get(cur.parentId);
        if (!next || next.id === cur.id) break;
        cur = next;
      }
      if (chain.length >= 2) {
        subtitle = String(chain[chain.length - 2].title || '').trim();
      }
    }
  } catch (_e) {
    subtitle = '';
  }

  if (el) el.textContent = title;

  if (subEl) {
    subEl.textContent = subtitle;
    subEl.style.display = subtitle ? 'block' : 'none';
  }

  // Best-effort browser-tab title update.
  try {
    document.title = subtitle
      ? `${title} – ${subtitle} – SmartHome`
      : `${title} – SmartHome`;
  } catch (_) {
    // ignore
  }
}

function nwCloseSidebar() {
  nwSetSidebarOpen(false);
}

function nwLoadExpandedIdsFromLs() {
  if (nwPageState.__expandedLoaded) return;
  nwPageState.__expandedLoaded = true;

  let loaded = false;
  try {
    const raw = localStorage.getItem(NW_SH_NAV_EXPANDED_LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        nwPageState.expandedIds = new Set(arr.filter((x) => typeof x === 'string' && x.trim()));
        loaded = true;
      }
    }
  } catch (e) {
    // ignore
  }

  // Default (hierarchy mode): show rooms nested under floors without forcing the user
  // to click "expand" for every floor. We only apply this when no valid state
  // was loaded OR when the stored state is clearly from an older nav layout.
  try {
    const { children, roots } = nwBuildPageTree(nwPageState.pages || []);
    const rootWithChildren = roots.filter((p) => children.has(p.id) && (children.get(p.id) || []).length);

    // Determine if the stored expandedIds look stale (e.g. upgrade from older version)
    const hasAnyCurrentRootExpanded = rootWithChildren.some((p) => nwPageState.expandedIds.has(p.id));

    if (!loaded || (!hasAnyCurrentRootExpanded && rootWithChildren.length)) {
      nwPageState.expandedIds = new Set(rootWithChildren.map((p) => p.id));
      nwSaveExpandedIdsToLs();
    }
  } catch (_e) {
    // ignore
  }
}


function nwSaveExpandedIdsToLs() {
  try {
    localStorage.setItem(NW_SH_NAV_EXPANDED_LS_KEY, JSON.stringify(Array.from(nwPageState.expandedIds || [])));
  } catch (e) {
    // ignore
  }
}

function nwEnsureAncestorsExpanded(pageId) {
  const byId = new Map((nwPageState.pages || []).map((p) => [p.id, p]));
  let cur = byId.get(pageId);
  const safety = 50;
  let i = 0;
  while (cur && cur.parentId && i < safety) {
    const pid = cur.parentId;
    if (!pid || pid === cur.id) break;
    nwPageState.expandedIds.add(pid);
    cur = byId.get(pid);
    i++;
  }
  nwSaveExpandedIdsToLs();
}

function nwToggleNavExpanded(pageId) {
  nwLoadExpandedIdsFromLs();
  if (!pageId) return;
  if (nwPageState.expandedIds.has(pageId)) nwPageState.expandedIds.delete(pageId);
  else nwPageState.expandedIds.add(pageId);
  nwSaveExpandedIdsToLs();
  nwRenderSidebarNav();
}

function nwResolvePageFilters(page) {
  if (!page) return { roomIds: [], funcIds: [], types: [], favoritesOnly: false };

  const byId = new Map((nwPageState.pages || []).map((p) => [p.id, p]));
  const chain = [];
  let cur = page;
  let safety = 50;

  while (cur && safety-- > 0) {
    chain.unshift(cur); // root -> child
    if (!cur.parentId) break;
    const next = byId.get(cur.parentId);
    if (!next || next.id === cur.id) break;
    cur = next;
  }

  const res = { roomIds: [], funcIds: [], types: [], favoritesOnly: false };
  for (const p of chain) {
    if (Array.isArray(p.roomIds) && p.roomIds.length) res.roomIds = p.roomIds.slice();
    if (Array.isArray(p.funcIds) && p.funcIds.length) res.funcIds = p.funcIds.slice();
    if (Array.isArray(p.types) && p.types.length) res.types = p.types.slice();
    if (p.favoritesOnly) res.favoritesOnly = true;
  }

  return res;
}

function nwIsFloorPage(page) {
  const id = page && typeof page.id === 'string' ? page.id : '';
  return id.startsWith('floor_');
}

function nwGetFloorIdFromPage(page) {
  const id = page && typeof page.id === 'string' ? page.id : '';
  if (!id.startsWith('floor_')) return '';
  if (id === 'floor_unassigned') return '';
  return id.slice('floor_'.length);
}

function nwFilterDevicesForPage(allDevices, page) {
  const list = Array.isArray(allDevices) ? allDevices.slice() : [];
  if (!page) return list;

  const eff = nwResolvePageFilters(page);
  const funcIds = Array.isArray(eff.funcIds) ? eff.funcIds.map(nwNormalizeId).filter(Boolean) : [];
  const types = Array.isArray(eff.types) ? eff.types.map(nwNormalizeId).filter(Boolean) : [];

  let out = list;

  if (eff.favoritesOnly) {
    out = out.filter(d => nwIsFavorite(d));
  }

  // Special case: floor pages should show everything inside the floor,
  // including devices that live directly on the floor (no roomId).
  if (nwIsFloorPage(page)) {
    const fid = nwGetFloorIdFromPage(page);
    out = out.filter(d => nwGetDeviceFloorId(d) === fid);
  } else {
    const roomIds = Array.isArray(eff.roomIds) ? eff.roomIds.map(nwNormalizeId).filter(Boolean) : [];
    if (roomIds.length) {
      const set = new Set(roomIds);
      out = out.filter(d => set.has(nwGetDeviceRoomId(d)));
    }
  }

  if (funcIds.length) {
    const set = new Set(funcIds);
    out = out.filter(d => set.has(nwGetDeviceFuncId(d)));
  }

  if (types.length) {
    const set = new Set(types);
    out = out.filter(d => set.has(nwNormalizeId(d && d.type)));
  }

  return out;
}

function nwGetDevicesForPage(page) {
  return nwFilterDevicesForPage(nwAllDevices, page);
}

function nwUpdatePageCounts() {
  const counts = {};
  for (const p of nwPageState.pages || []) {
    // External href pages may still show counts if they have filters – harmless.
    counts[p.id] = nwGetDevicesForPage(p).length;
  }
  nwPageState.countsById = counts;
}

function nwBuildPageTree(pages) {
  const byId = new Map((pages || []).map((p) => [p.id, p]));
  const children = new Map();
  const roots = [];

  for (const p of pages || []) {
    const pid = p.parentId && byId.has(p.parentId) && p.parentId !== p.id ? p.parentId : '';
    if (pid) {
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid).push(p);
    } else {
      roots.push(p);
    }
  }

  const sortFn = (a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de');
  roots.sort(sortFn);
  for (const [k, arr] of children.entries()) arr.sort(sortFn);

  return { byId, children, roots };
}

function nwRenderSidebarNav() {
  // Backwards compatibility: HTML uses id="nwShNav" while some early page-nav
  // prototypes referenced id="nw-sh-nav". Render into whichever exists.
  const el = document.getElementById('nwShNav') || document.getElementById('nw-sh-nav');
  if (!el) return;

  nwLoadExpandedIdsFromLs();
  nwUpdatePageCounts();

  el.innerHTML = '';

  const { children, roots } = nwBuildPageTree(nwPageState.pages || []);

  const renderList = (list, depth) => {
    for (const p of list) {
      const hasChildren = children.has(p.id) && (children.get(p.id) || []).length > 0;
      const isExpanded = hasChildren && nwPageState.expandedIds.has(p.id);
      const isActive = nwPageState.activeId === p.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      const roleClass = (nwIsHomePage(p))
        ? ' nw-sh-nav-item--home'
        : (depth === 0 && hasChildren)
          ? ' nw-sh-nav-item--floor'
          : (depth > 0)
            ? ' nw-sh-nav-item--room'
            : ' nw-sh-nav-item--page';
      btn.className = 'nw-sh-nav-item' + roleClass + (isActive ? ' nw-sh-nav-item--active' : '');
      btn.style.paddingLeft = `${12 + Math.max(0, depth) * 14}px`;
      btn.dataset.depth = String(depth || 0);

      const caret = document.createElement('span');
      caret.className = hasChildren
        ? 'nw-sh-nav-item__caret' + (isExpanded ? ' nw-sh-nav-item__caret--open' : '')
        : 'nw-sh-nav-item__caret--spacer';
      caret.textContent = '›';
      if (hasChildren) {
        caret.title = isExpanded ? 'Zuklappen' : 'Aufklappen';
        caret.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          nwToggleNavExpanded(p.id);
        });
      }

      const icon = document.createElement('span');
      icon.className = 'nw-sh-nav-item__icon';
    icon.innerHTML = nwStaticIconHtml(p.icon || '•');

      const label = document.createElement('span');
      label.className = 'nw-sh-nav-item__label nw-sh-nav-label';
      label.textContent = p.title || p.id;

      const count = typeof nwPageState.countsById[p.id] === 'number' ? nwPageState.countsById[p.id] : 0;
      const badge = document.createElement('span');
      badge.className = 'nw-sh-nav-item__badge';
      badge.textContent = String(count);
      badge.title = `${count} Geräte`;

      btn.appendChild(caret);
      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(badge);

      btn.addEventListener('click', () => {
        if (p.href) {
          window.location.href = p.href;
          return;
        }
        // Auto-expand parents so the active item stays visible in nested navigation
        nwEnsureAncestorsExpanded(p.id);
        nwActivatePage(p.id);
        // In mobile mode, close drawer on selection
        if (document.body.classList.contains('nw-sh-sidebar-open')) {
          nwCloseSidebar();
        }
      });

      el.appendChild(btn);

      if (hasChildren && isExpanded) {
        renderList(children.get(p.id) || [], depth + 1);
      }
    }
  };

  renderList(roots, 0);
}

function nwActivatePage(pageId) {
  const id = nwNormalizeId(pageId);
  const page = nwPageState.pages.find(p => p.id === id);
  if (!page) return;

  nwPageState.activeId = page.id;
  try { localStorage.setItem(NW_SH_ACTIVE_PAGE_LS_KEY, page.id); } catch (_e) {}

  // Apply page base filters (inkl. Parent-Inheritance, z.B. Wohnzimmer → Licht)
  const eff = nwResolvePageFilters(page);
  nwFilterState.page.roomIds = Array.isArray(eff.roomIds) ? eff.roomIds.slice() : [];
  nwFilterState.page.funcIds = Array.isArray(eff.funcIds) ? eff.funcIds.slice() : [];
  nwFilterState.page.types = Array.isArray(eff.types) ? eff.types.slice() : [];
  nwFilterState.page.favoritesOnly = !!eff.favoritesOnly;

  // Reset user filters on page change (prevents confusing empty screens)
  nwFilterState.func = null;
  nwFilterState.favoritesOnly = false;

  // Optional default grouping
  if (page.viewMode === 'rooms' || page.viewMode === 'functions') {
    nwViewState.mode = page.viewMode;
  } else {
    // Default (fallback)
    nwViewState.mode = 'rooms';
  }

  // Page-spezifische Layout-Regeln
  nwViewState.cardSizeOverride = page.cardSize || 'auto';
  nwViewState.sortBy = page.sortBy || 'order';
  nwViewState.groupByType = !!page.groupByType;

  // In verschachtelter Navigation: Eltern automatisch aufklappen
  nwEnsureAncestorsExpanded(page.id);

  nwUpdatePageTitle();
  nwRenderSidebarNav();
  nwApplyFiltersAndRender();
}

async function nwLoadSmartHomeConfig() {
  try {
    const data = await fetch('/api/smarthome/config', { cache: 'no-store' }).then(r => r.json());
    // API returns { ok:true, config:{...} }
    const cfg = (data && typeof data === 'object' && data.ok && data.config) ? data.config : data;
    nwShConfig = cfg && typeof cfg === 'object' ? cfg : null;
  } catch (_e) {
    nwShConfig = null;
  }

  nwBuildMetaFromConfig(nwShConfig);
  nwPageState.pages = nwGetPagesFromConfig(nwShConfig);

  // Restore active page
  let wanted = null;
  try { wanted = localStorage.getItem(NW_SH_ACTIVE_PAGE_LS_KEY); } catch (_e) {}
  if (wanted && nwPageState.pages.some(p => p.id === wanted)) {
    nwPageState.activeId = wanted;
  } else {
    nwPageState.activeId = nwPageState.pages[0] ? nwPageState.pages[0].id : null;
  }

  nwInitSidebarUi();
  nwUpdatePageTitle();
  nwRenderSidebarNav();

  // Apply initial page filters (without forcing a device reload)
  if (nwPageState.activeId) {
    const p = nwPageState.pages.find(x => x.id === nwPageState.activeId);
    if (p) {
      const eff0 = nwResolvePageFilters(p);
      nwFilterState.page.roomIds = Array.isArray(eff0.roomIds) ? eff0.roomIds.slice() : [];
      nwFilterState.page.funcIds = Array.isArray(eff0.funcIds) ? eff0.funcIds.slice() : [];
      nwFilterState.page.types = Array.isArray(eff0.types) ? eff0.types.slice() : [];
      nwFilterState.page.favoritesOnly = !!eff0.favoritesOnly;
      if (p.viewMode === 'rooms' || p.viewMode === 'functions') {
        nwViewState.mode = p.viewMode;
      } else {
        nwViewState.mode = 'rooms';
      }

      // Page-spezifische Layout-Regeln
      nwViewState.cardSizeOverride = p.cardSize || 'auto';
      nwViewState.sortBy = p.sortBy || 'order';
      nwViewState.groupByType = !!p.groupByType;

      // In verschachtelter Navigation: Eltern automatisch aufklappen
      nwEnsureAncestorsExpanded(p.id);
    }
  }
}

function nwGetDeviceRoomId(dev) {
  const id = nwNormalizeId(dev && dev.roomId);
  if (id) return id;
  const name = nwNormalizeId(dev && dev.room);
  return nwShMeta.roomIdByName[name] || '';
}

function nwGetDeviceFloorId(dev) {
  const direct = nwNormalizeId(dev && dev.floorId);
  if (direct) return direct;

  const rid = nwGetDeviceRoomId(dev);
  if (!rid) return '';
  const rm = nwShMeta && nwShMeta.roomsById ? nwShMeta.roomsById[rid] : null;
  return rm && rm.floorId ? nwNormalizeId(rm.floorId) : '';
}

function nwGetDeviceFuncId(dev) {
  const id = nwNormalizeId(dev && dev.functionId);
  if (id) return id;
  const name = nwNormalizeId(dev && dev.function);
  return nwShMeta.funcIdByName[name] || '';
}

function nwApplyPageFilters(devices) {
  let out = devices.slice();
  const p = nwFilterState.page || {};

  if (p.favoritesOnly) {
    out = out.filter(d => nwIsFavorite(d));
  }

  // Floor pages show everything inside a floor, including floor-level devices.
  const activePage = (nwPageState.pages || []).find(x => x && x.id === nwPageState.activeId) || null;
  if (activePage && nwIsFloorPage(activePage)) {
    const fid = nwGetFloorIdFromPage(activePage);
    out = out.filter(d => nwGetDeviceFloorId(d) === fid);
  } else if (Array.isArray(p.roomIds) && p.roomIds.length) {
    const set = new Set(p.roomIds.map(nwNormalizeId));
    out = out.filter(d => set.has(nwGetDeviceRoomId(d)));
  }

  if (Array.isArray(p.funcIds) && p.funcIds.length) {
    const set = new Set(p.funcIds.map(nwNormalizeId));
    out = out.filter(d => set.has(nwGetDeviceFuncId(d)));
  }

  if (Array.isArray(p.types) && p.types.length) {
    const set = new Set(p.types.map(nwNormalizeId));
    out = out.filter(d => set.has(nwNormalizeId(d && d.type)));
  }

  return out;
}

function nwApplyFiltersAndRender() {
  const activePage = (nwPageState.pages || []).find(p => p && p.id === nwPageState.activeId) || null;

  // 1) Apply base filters from the active page
  const base = nwApplyPageFilters(nwAllDevices);
  // 2) Apply user filters (favorites + function chip)
  const filtered = nwApplyFilters(base);

  // Home uses its own overview layout (floors + favorites). No chip UI here.
  if (nwIsHomePage(activePage)) {
    if (!nwAllDevices.length) {
      nwShowEmptyState(true, { enabled: nwSmartHomeEnabled, reason: 'empty' });
      return;
    }
    nwShowEmptyState(false);
    nwRenderHome(nwAllDevices);
    return;
  }

  // chips based on the base list (page preset), so chips stay relevant in the current section
  if (nwShFiltersUiEnabled) {
    nwRenderViewChips();
    nwRenderFunctionChips(base);
    nwRenderTextSizeChips();
  }

  if (!filtered.length) {
    if (!nwAllDevices.length) {
      nwShowEmptyState(true, { enabled: nwSmartHomeEnabled, reason: 'empty' });
    } else {
      nwShowEmptyState(true, { reason: 'filtered' });
    }
    return;
  }

  nwShowEmptyState(false);
  if (nwShFiltersUiEnabled && nwViewState.mode === 'functions') nwRenderFunctions(filtered);
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

    // Sidebar Badges/Counts aktualisieren
    nwRenderSidebarNav();
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

  // Detect if the filter UI exists in the DOM. If not, we intentionally run in "clean" mode.
  // (No chips, always rooms view, no hidden/remembered user filters.)
  nwShFiltersUiEnabled = !!(
    document.getElementById('nw-filter-view') ||
    document.getElementById('nw-filter-functions') ||
    document.getElementById('nw-filter-textsize')
  );

  // UI‑Prefs (persistiert pro Browser)
  if (nwShFiltersUiEnabled) {
    nwViewState.mode = nwLoadViewMode(nwViewState.mode);
    nwTextSizeState.size = nwLoadTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
    nwFilterState.favoritesFirst = nwLoadBoolLS(NW_SH_FAVORITES_FIRST_LS_KEY, NW_SH_FAVORITES_FIRST_DEFAULT);
  } else {
    // Clean mode: do not apply remembered chip settings (otherwise user can get "stuck" in filters)
    nwViewState.mode = 'rooms';
    nwTextSizeState.size = 'normal';
    nwApplyTextSizeClass(nwTextSizeState.size);
    nwFilterState.favoritesFirst = false;
    try {
      localStorage.removeItem(NW_SH_VIEW_MODE_LS_KEY);
      localStorage.removeItem(NW_SH_TEXT_SIZE_LS_KEY);
      localStorage.removeItem(NW_SH_FAVORITES_FIRST_LS_KEY);
    } catch (_e) {}
  }
  nwFavoriteOverrides = nwLoadFavoriteOverrides();

  // SmartHome Konfiguration (Räume/Funktionen/Seiten) + Sidebar Navigation
  await nwLoadSmartHomeConfig();
  await nwLoadUiConfigFlags();

  // The views container starts hidden in HTML (avoid a blank SmartHome screen)
  try {
    const viewsEl = document.getElementById('nwSmarthomeViews');
    if (viewsEl) viewsEl.classList.remove('nw-hidden');
  } catch (_e) {
    // ignore
  }

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
