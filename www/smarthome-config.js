/* SmartHomeConfig VIS-Konfig-Seite (A10, Editor)
 * Bearbeiten von Räumen, Funktionen und Geräten inkl. Datenpunkt-Picker.
 */

const nwShcState = {
  config: { rooms: [], functions: [], devices: [], pages: [], meta: {} },
  originalJson: null,
  dirty: false,
  validation: null,

  // Sidebar pages editor (raw JSON)
  pagesJsonText: '',
  pagesJsonValid: true,

  // Builder UI State für Pages
  pagesDraft: [],
  pagesUi: {
    tab: 'builder',
    selectedId: null,
    isNew: false,
    idManuallyEdited: false,
  },

  // UI shell (Home tiles / GPA editor / Classic editor)
  ui: null,
};

function nwEnsureShcfgUiState() {
  if (!nwShcState.ui) {
    let mode = 'home';
    try {
      const stored = localStorage.getItem('nw-shcfg-ui-mode');
      if (stored === 'home' || stored === 'gpa' || stored === 'classic') mode = stored;
    } catch (_) {}

    nwShcState.ui = {
      mode,
      gpa: {
        tab: 'building',
        view: 'rooms',
        currentRoomId: null,
        selected: null, // { kind: 'room'|'device', id }
      },
    };
  }
  if (!nwShcState.ui.gpa) {
    nwShcState.ui.gpa = { tab: 'building', view: 'rooms', currentRoomId: null, selected: null };
  }
}

function nwNormalizeSmartHomeConfig(cfg) {
  const c = (cfg && typeof cfg === 'object') ? cfg : {};
  c.rooms = Array.isArray(c.rooms) ? c.rooms : [];
  c.functions = Array.isArray(c.functions) ? c.functions : [];
  c.devices = Array.isArray(c.devices) ? c.devices : [];
  c.pages = Array.isArray(c.pages) ? c.pages : [];
  c.meta = (c.meta && typeof c.meta === 'object') ? c.meta : {};
  return c;
}

const NW_PAGE_ICON_OPTIONS = [
  { value: '', label: '(kein Icon)' },
  { value: '🏠', label: '🏠 Home' },
  { value: '🛋️', label: '🛋️ Wohnzimmer' },
  { value: '🛏️', label: '🛏️ Schlafzimmer' },
  { value: '🍽️', label: '🍽️ Küche' },
  { value: '🛁', label: '🛁 Bad' },
  { value: '🌳', label: '🌳 Garten' },
  { value: '🚗', label: '🚗 Garage/Carport' },
  { value: '⚡', label: '⚡ Energie' },
  { value: '🔋', label: '🔋 Speicher' },
  { value: '🚘', label: '🚘 Laden' },
  { value: '🌡️', label: '🌡️ Heizung' },
  { value: '🪟', label: '🪟 Fenster/Türen' },
  { value: '📷', label: '📷 Kameras' },
  { value: '☀️', label: '☀️ Wetter' },
  { value: '⏱️', label: '⏱️ Automationen' },
  { value: '⚙️', label: '⚙️ Einstellungen' },
];

// Drag&Drop ordering (devices)
let nwDragDeviceFromIndex = null;


/* --- Icon Picker (A11): kleine Vorschau + Standard-Icons --- */

const NW_SH_ICON_PREVIEW_SVGS = {
  bulb: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  plug: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 15v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  thermostat: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 18a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 12 18Z" fill="currentColor"/></svg>`,
  blinds: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  tv: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7h16v10H4V7Z" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9h4l5-4v18l-5-4H6V9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M18 10c1 .9 1 3.1 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 4h7v7H4V4Z" stroke="currentColor" stroke-width="2"/><path d="M13 4h7v7h-7V4Z" stroke="currentColor" stroke-width="2"/><path d="M4 13h7v7H4v-7Z" stroke="currentColor" stroke-width="2"/><path d="M13 13h7v7h-7v-7Z" stroke="currentColor" stroke-width="2"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-4 4-8 4-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 22a6 6 0 0 0 6-6c0-3-2-5-3-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  scene: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2l1.1 3.4L16.5 6.5l-3.4 1.1L12 11l-1.1-3.4L7.5 6.5l3.4-1.1L12 2Z" fill="currentColor"/><path d="M19 13l.7 2.1 2.1.7-2.1.7L19 18.6l-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" fill="currentColor"/><path d="M5 13l.7 2.1 2.1.7-2.1.7L5 18.6l-.7-2.1-2.1-.7 2.1-.7L5 13Z" fill="currentColor"/></svg>`,
  thermometer: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 18a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 12 18Z" fill="currentColor"/></svg>`,
  sensor: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3a7 7 0 0 0-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 0 0-7-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor"/></svg>`,
  generic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6h12v12H6V6Z" stroke="currentColor" stroke-width="2"/></svg>`,
};

function nwShcNormalizeIconName(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  return s.toLowerCase();
}

function nwShcRenderIconPreview(previewEl, iconValue) {
  if (!previewEl) return;
  const raw = String(iconValue || '').trim();
  const key = nwShcNormalizeIconName(raw);
  if (key && NW_SH_ICON_PREVIEW_SVGS[key]) {
    previewEl.innerHTML = NW_SH_ICON_PREVIEW_SVGS[key];
    previewEl.style.fontSize = '';
    return;
  }
  // Emoji / short text fallback
  previewEl.innerHTML = '';
  if (raw && raw.length <= 3) {
    previewEl.textContent = raw;
    previewEl.style.fontSize = '0.9rem';
  } else {
    previewEl.textContent = '';
  }
}

/* --- Validator (A10): Fehlerliste für stabile Einrichtung --- */

let nwValidateTimer = null;

function nwScheduleValidation() {
  if (nwValidateTimer) clearTimeout(nwValidateTimer);
  nwValidateTimer = setTimeout(() => {
    nwValidateTimer = null;
    nwRunValidationNow();
  }, 180);
}

function nwCssEscape(value) {
  const s = String(value || '');
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
  return s.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
}

function nwEntityKey(entity) {
  if (!entity || !entity.kind) return 'global';
  const idx = (typeof entity.index === 'number') ? entity.index : -1;
  const id = (typeof entity.id === 'string' && entity.id) ? entity.id : '';
  return entity.kind + ':' + idx + ':' + id;
}

function nwPushIssue(out, severity, title, message, entity) {
  const item = {
    severity,
    title: title || (severity === 'error' ? 'Fehler' : 'Warnung'),
    message: message || '',
    entity: entity || { kind: 'global' },
  };
  if (severity === 'error') out.errors.push(item);
  else out.warnings.push(item);

  const key = nwEntityKey(item.entity);
  const prev = out.byEntity[key] || { kind: item.entity.kind, index: item.entity.index, id: item.entity.id, errorCount: 0, warnCount: 0, maxSeverity: null };
  if (severity === 'error') prev.errorCount += 1;
  else prev.warnCount += 1;
  if (!prev.maxSeverity || prev.maxSeverity === 'warn') {
    prev.maxSeverity = severity;
  }
  out.byEntity[key] = prev;
}

function nwLooksLikeDpId(id) {
  const s = String(id || '').trim();
  if (!s) return false;
  if (/\s/.test(s)) return false;
  // ioBroker ids typically contain at least one dot
  return s.includes('.');
}

function nwValidateConfig(cfg) {
  const out = { errors: [], warnings: [], byEntity: {} };
  const safe = cfg || {};

  const rooms = Array.isArray(safe.rooms) ? safe.rooms : [];
  const fns = Array.isArray(safe.functions) ? safe.functions : [];
  const devices = Array.isArray(safe.devices) ? safe.devices : [];

  const seenRoomIds = new Map();
  rooms.forEach((r, idx) => {
    const id = (r && typeof r.id === 'string') ? r.id.trim() : '';
    if (!id) {
      nwPushIssue(out, 'error', 'Raum', 'Raum ohne ID (bitte eine eindeutige ID vergeben).', { kind: 'room', index: idx, id: '' });
    } else {
      if (seenRoomIds.has(id)) {
        nwPushIssue(out, 'error', 'Raum', 'Doppelte Raum-ID: „' + id + '“', { kind: 'room', index: idx, id });
      } else {
        seenRoomIds.set(id, idx);
      }
    }
    const name = (r && typeof r.name === 'string') ? r.name.trim() : '';
    if (!name) {
      nwPushIssue(out, 'warn', 'Raum', 'Raum ohne Namen (UI wird unübersichtlich).', { kind: 'room', index: idx, id });
    }
  });

  const seenFnIds = new Map();
  fns.forEach((f, idx) => {
    const id = (f && typeof f.id === 'string') ? f.id.trim() : '';
    if (!id) {
      nwPushIssue(out, 'error', 'Funktion', 'Funktion ohne ID (bitte eine eindeutige ID vergeben).', { kind: 'function', index: idx, id: '' });
    } else {
      if (seenFnIds.has(id)) {
        nwPushIssue(out, 'error', 'Funktion', 'Doppelte Funktions-ID: „' + id + '“', { kind: 'function', index: idx, id });
      } else {
        seenFnIds.set(id, idx);
      }
    }
    const name = (f && typeof f.name === 'string') ? f.name.trim() : '';
    if (!name) {
      nwPushIssue(out, 'warn', 'Funktion', 'Funktion ohne Namen (UI wird unübersichtlich).', { kind: 'function', index: idx, id });
    }
  });

  const seenDeviceIds = new Map();
  devices.forEach((d, idx) => {
    const id = (d && typeof d.id === 'string') ? d.id.trim() : '';
    const ent = { kind: 'device', index: idx, id };

    if (!id) {
      nwPushIssue(out, 'error', 'Gerät', 'Gerät ohne ID (muss eindeutig sein).', ent);
    } else {
      if (seenDeviceIds.has(id)) {
        nwPushIssue(out, 'error', 'Gerät', 'Doppelte Geräte-ID: „' + id + '“', ent);
      } else {
        seenDeviceIds.set(id, idx);
      }
    }

    const alias = (d && typeof d.alias === 'string') ? d.alias.trim() : '';
    if (!alias) {
      nwPushIssue(out, 'warn', 'Gerät', 'Gerät ohne Alias (Kachel-Titel wirkt leer).', ent);
    }

    const type = (d && typeof d.type === 'string') ? d.type.trim() : '';
    if (!type) {
      nwPushIssue(out, 'error', 'Gerät', 'Gerät ohne Typ.', ent);
    }

    // Room / Function mapping
    const roomId = (d && typeof d.roomId === 'string') ? d.roomId.trim() : '';
    if (!roomId) {
      nwPushIssue(out, 'warn', 'Gerät', 'Kein Raum zugewiesen (Filter/Struktur leidet).', ent);
    } else if (!seenRoomIds.has(roomId)) {
      nwPushIssue(out, 'error', 'Gerät', 'Zugewiesener Raum existiert nicht: „' + roomId + '“', ent);
    }
    const fnId = (d && typeof d.functionId === 'string') ? d.functionId.trim() : '';
    if (!fnId) {
      nwPushIssue(out, 'warn', 'Gerät', 'Keine Funktion zugewiesen (Filter/Struktur leidet).', ent);
    } else if (!seenFnIds.has(fnId)) {
      nwPushIssue(out, 'error', 'Gerät', 'Zugewiesene Funktion existiert nicht: „' + fnId + '“', ent);
    }

    const beh = (d && typeof d.behavior === 'object' && d.behavior) ? d.behavior : {};
    const readOnly = !!beh.readOnly;

    // IO validation by type (lightweight, no DB reads)
    const io = (d && typeof d.io === 'object' && d.io) ? d.io : {};

    const chkDp = (label, dp) => {
      const v = String(dp || '').trim();
      if (!v) return;
      if (!nwLooksLikeDpId(v)) {
        nwPushIssue(out, 'warn', 'Datenpunkt', label + ': sieht nicht wie eine ioBroker-ID aus („' + v + '“).', ent);
      }
    };

    if (type === 'switch' || type === 'scene') {
      const sw = (io && io.switch) ? io.switch : {};
      const readId = (sw && typeof sw.readId === 'string') ? sw.readId.trim() : '';
      const writeId = (sw && typeof sw.writeId === 'string') ? sw.writeId.trim() : '';
      chkDp('Schalter lesen (readId)', readId);
      chkDp('Schalter schreiben (writeId)', writeId);
      if (!readId && !writeId) {
        nwPushIssue(out, 'error', 'Gerät', 'Schalter/Szene ohne Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !readId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber Schalter readId fehlt.', ent);
      }
    } else if (type === 'color') {
      // Farblicht: Farb-DP ist Pflicht, Schalter ist optional.
      const sw = (io && io.switch) ? io.switch : {};
      const swReadId = (sw && typeof sw.readId === 'string') ? sw.readId.trim() : '';
      const swWriteId = (sw && typeof sw.writeId === 'string') ? sw.writeId.trim() : '';
      chkDp('Schalter lesen (readId)', swReadId);
      chkDp('Schalter schreiben (writeId)', swWriteId);

      const col = (io && io.color) ? io.color : {};
      const cReadId = (col && typeof col.readId === 'string') ? col.readId.trim() : '';
      const cWriteId = (col && typeof col.writeId === 'string') ? col.writeId.trim() : '';
      const fmt = (col && typeof col.format === 'string') ? col.format.trim().toLowerCase() : 'hex';

      chkDp('Farbe lesen (readId)', cReadId);
      chkDp('Farbe schreiben (writeId)', cWriteId);

      if (!cReadId && !cWriteId) {
        nwPushIssue(out, 'error', 'Gerät', 'Farb‑Licht ohne Farb‑Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !cReadId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber Farbe readId fehlt.', ent);
      }

      if (fmt && !['hex', 'rgb', 'int', 'integer', 'number'].includes(fmt)) {
        nwPushIssue(out, 'warn', 'Gerät', 'Unbekanntes Farbformat: „' + fmt + '“. (Empfohlen: hex / rgb / int)', ent);
      }
    } else if (type === 'dimmer') {
      const lvl = (io && io.level) ? io.level : {};
      const readId = (lvl && typeof lvl.readId === 'string') ? lvl.readId.trim() : '';
      const writeId = (lvl && typeof lvl.writeId === 'string') ? lvl.writeId.trim() : '';
      chkDp('Wert/Position lesen (readId)', readId);
      chkDp('Wert/Position schreiben (writeId)', writeId);
      if (!readId && !writeId) {
        nwPushIssue(out, 'error', 'Gerät', 'Dimmer ohne Wert/Position-Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !readId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber Wert/Position readId fehlt.', ent);
      }
    } else if (type === 'blind') {
      const lvl = (io && io.level) ? io.level : {};
      const cover = (io && io.cover) ? io.cover : {};
      const posRead = (lvl && typeof lvl.readId === 'string') ? lvl.readId.trim() : '';
      const posWrite = (lvl && typeof lvl.writeId === 'string') ? lvl.writeId.trim() : '';
      const upId = (cover && typeof cover.upId === 'string') ? cover.upId.trim() : '';
      const downId = (cover && typeof cover.downId === 'string') ? cover.downId.trim() : '';
      const stopId = (cover && typeof cover.stopId === 'string') ? cover.stopId.trim() : '';
      chkDp('Wert/Position lesen (readId)', posRead);
      chkDp('Wert/Position schreiben (writeId)', posWrite);
      chkDp('Taster Auf (upId)', upId);
      chkDp('Taster Ab (downId)', downId);
      chkDp('Taster Stop (stopId)', stopId);
      if (!posRead && !posWrite && !upId && !downId && !stopId) {
        nwPushIssue(out, 'error', 'Gerät', 'Jalousie/Rollladen ohne Datenpunkte (Position oder up/down/stop fehlt).', ent);
      }
      if (readOnly && !posRead && !upId && !downId && !stopId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber kein Read-DP (Position) und keine Tasten-DPs gesetzt.', ent);
      }
    } else if (type === 'rtr') {
      const cl = (io && io.climate) ? io.climate : {};
      const cur = (cl && typeof cl.currentTempId === 'string') ? cl.currentTempId.trim() : '';
      const sp = (cl && typeof cl.setpointId === 'string') ? cl.setpointId.trim() : '';
      const mode = (cl && typeof cl.modeId === 'string') ? cl.modeId.trim() : '';
      const hum = (cl && typeof cl.humidityId === 'string') ? cl.humidityId.trim() : '';
      chkDp('Klima Ist-Temperatur (currentTempId)', cur);
      chkDp('Klima Sollwert (setpointId)', sp);
      chkDp('Klima Modus (modeId)', mode);
      chkDp('Klima Luftfeuchte (humidityId)', hum);
      if (!cur && !sp) {
        nwPushIssue(out, 'error', 'Gerät', 'RTR ohne currentTempId und ohne setpointId (keine Anzeige/Regelung möglich).', ent);
      }
      if (!readOnly && !sp) {
        nwPushIssue(out, 'warn', 'Gerät', 'RTR ohne setpointId (nur Anzeige möglich).', ent);
      }
    } else if (type === 'player') {
      const pl = (io && io.player) ? io.player : {};
      const playingId = (pl && typeof pl.playingId === 'string') ? pl.playingId.trim() : '';
      const titleId = (pl && typeof pl.titleId === 'string') ? pl.titleId.trim() : '';
      const artistId = (pl && typeof pl.artistId === 'string') ? pl.artistId.trim() : '';
      const sourceId = (pl && typeof pl.sourceId === 'string') ? pl.sourceId.trim() : '';
      const coverId = (pl && typeof pl.coverId === 'string') ? pl.coverId.trim() : '';
      const volR = (pl && typeof pl.volumeReadId === 'string') ? pl.volumeReadId.trim() : '';
      const volW = (pl && typeof pl.volumeWriteId === 'string') ? pl.volumeWriteId.trim() : '';
      const playId = (pl && typeof pl.playId === 'string') ? pl.playId.trim() : '';
      const pauseId = (pl && typeof pl.pauseId === 'string') ? pl.pauseId.trim() : '';
      const stopId = (pl && typeof pl.stopId === 'string') ? pl.stopId.trim() : '';
      const nextId = (pl && typeof pl.nextId === 'string') ? pl.nextId.trim() : '';
      const prevId = (pl && typeof pl.prevId === 'string') ? pl.prevId.trim() : '';
      const toggleId = (pl && typeof pl.toggleId === 'string') ? pl.toggleId.trim() : '';
      const stationWriteId = (pl && typeof pl.stationId === 'string') ? pl.stationId.trim() : '';
      const playlistWriteId = (pl && typeof pl.playlistId === 'string') ? pl.playlistId.trim() : '';

      chkDp('Player Status (playingId)', playingId);
      chkDp('Titel (titleId)', titleId);
      chkDp('Interpret (artistId)', artistId);
      chkDp('Quelle (sourceId)', sourceId);
      chkDp('Cover URL (coverId)', coverId);
      chkDp('Lautstärke lesen (volumeReadId)', volR);
      chkDp('Lautstärke schreiben (volumeWriteId)', volW);
      chkDp('Play (playId)', playId);
      chkDp('Pause (pauseId)', pauseId);
      chkDp('Stop (stopId)', stopId);
      chkDp('Nächster Titel (nextId)', nextId);
      chkDp('Vorheriger Titel (prevId)', prevId);
      chkDp('Toggle (toggleId)', toggleId);
      chkDp('Radiosender setzen (stationId)', stationWriteId);
      chkDp('Playlist wählen (playlistId)', playlistWriteId);

      const hasAny = !!(playingId || titleId || volR || volW || playId || pauseId || stopId || nextId || prevId || toggleId || stationWriteId || playlistWriteId);
      if (!hasAny) {
        nwPushIssue(out, 'error', 'Gerät', 'Audio-Player ohne Datenpunkte (mind. 1 DP muss gesetzt sein).', ent);
      }
      if (readOnly && !(playingId || titleId || volR)) {
        nwPushIssue(out, 'warn', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber es ist kein Read-DP gesetzt (playingId/titleId/volumeReadId).', ent);
      }

      const stList = (d && Array.isArray(d.stations)) ? d.stations : [];
      stList.forEach((s, sIdx) => {
        const nm = (s && typeof s.name === 'string') ? s.name.trim() : '';
        const val = (s && (typeof s.value === 'string' || typeof s.value === 'number')) ? String(s.value).trim() : '';
        if (!nm) nwPushIssue(out, 'warn', 'Radiosender', 'Radiosender ohne Namen (Index ' + (sIdx + 1) + ').', ent);
        if (!val) nwPushIssue(out, 'warn', 'Radiosender', 'Radiosender ohne Wert/URL (Index ' + (sIdx + 1) + ').', ent);
      });

      const plList = (d && Array.isArray(d.playlists)) ? d.playlists : [];
      if (plList.length && !playlistWriteId) {
        nwPushIssue(out, 'warn', 'Playlists', 'Playlists sind konfiguriert, aber playlistId fehlt (Auswahl in der VIS kann nicht schreiben).', ent);
      }
      plList.forEach((s, sIdx) => {
        const nm = (s && typeof s.name === 'string') ? s.name.trim() : '';
        const val = (s && (typeof s.value === 'string' || typeof s.value === 'number')) ? String(s.value).trim() : '';
        if (!nm) nwPushIssue(out, 'warn', 'Playlists', 'Playlist ohne Namen (Index ' + (sIdx + 1) + ').', ent);
        if (!val) nwPushIssue(out, 'warn', 'Playlists', 'Playlist ohne Wert/URI/ID (Index ' + (sIdx + 1) + ').', ent);
      });
    } else if (type === 'sensor') {
      const se = (io && io.sensor) ? io.sensor : {};
      const readId = (se && typeof se.readId === 'string') ? se.readId.trim() : '';
      chkDp('Sensor lesen (readId)', readId);
      if (!readId) {
        nwPushIssue(out, 'error', 'Gerät', 'Sensor ohne readId.', ent);
      }
    } else if (type === 'logicStatus') {
      nwPushIssue(out, 'warn', 'Gerät', 'Typ „logicStatus“ ist (noch) nicht vollständig implementiert.', ent);
    } else if (type) {
      nwPushIssue(out, 'warn', 'Gerät', 'Unbekannter Typ: „' + type + '“', ent);
    }
  });

  return out;
}

function nwRenderValidationPanel(result) {
  const host = document.getElementById('nw-config-validation');
  if (!host) return;

  const v = result || { errors: [], warnings: [] };
  const errCount = v.errors ? v.errors.length : 0;
  const warnCount = v.warnings ? v.warnings.length : 0;

  host.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'nw-validation__head';

  const title = document.createElement('div');
  title.className = 'nw-validation__title';
  title.textContent = 'Validator (SmartHomeConfig)';

  const badges = document.createElement('div');
  badges.className = 'nw-validation__badges';

  const bErr = document.createElement('span');
  bErr.className = 'nw-config-badge ' + (errCount ? 'nw-config-badge--error' : 'nw-config-badge--ok');
  bErr.textContent = 'Fehler: ' + errCount;

  const bWarn = document.createElement('span');
  bWarn.className = 'nw-config-badge ' + (warnCount ? 'nw-config-badge--warn' : 'nw-config-badge--idle');
  bWarn.textContent = 'Warnungen: ' + warnCount;

  badges.appendChild(bErr);
  badges.appendChild(bWarn);

  head.appendChild(title);
  head.appendChild(badges);

  const hint = document.createElement('div');
  hint.className = 'nw-validation__hint';
  hint.textContent = errCount
    ? 'Bitte die Fehler beheben, damit die SmartHome-Seite stabil funktioniert. Warnungen sind Hinweise (z.B. fehlende Namen oder DPs).'
    : (warnCount ? 'Keine Fehler. Bitte Warnungen prüfen (Qualität/Übersichtlichkeit).' : '✅ Keine Fehler oder Warnungen.');

  host.appendChild(head);
  host.appendChild(hint);

  const items = [];
  (v.errors || []).forEach(it => items.push(it));
  (v.warnings || []).forEach(it => items.push(it));
  if (!items.length) return;

  const list = document.createElement('div');
  list.className = 'nw-validation__list';

  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'nw-validation-item';

    const sev = document.createElement('div');
    sev.className = 'nw-validation-item__sev ' + (it.severity === 'error' ? 'nw-validation-item__sev--error' : 'nw-validation-item__sev--warn');
    sev.textContent = it.severity === 'error' ? '⛔' : '⚠️';

    const text = document.createElement('div');
    text.className = 'nw-validation-item__text';

    const t = document.createElement('div');
    t.className = 'nw-validation-item__title';

    const kind = (it.entity && it.entity.kind) ? it.entity.kind : 'global';
    const idx = (it.entity && typeof it.entity.index === 'number') ? it.entity.index : null;
    const id = (it.entity && it.entity.id) ? it.entity.id : '';

    let where = '';
    if (kind === 'room') where = 'Raum' + (id ? ' „' + id + '“' : (idx !== null ? ' #' + (idx + 1) : ''));
    else if (kind === 'function') where = 'Funktion' + (id ? ' „' + id + '“' : (idx !== null ? ' #' + (idx + 1) : ''));
    else if (kind === 'device') where = 'Gerät' + (id ? ' „' + id + '“' : (idx !== null ? ' #' + (idx + 1) : ''));
    else where = 'Global';

    t.textContent = (it.title ? it.title + ' · ' : '') + where;

    const msg = document.createElement('div');
    msg.className = 'nw-validation-item__msg';
    msg.textContent = it.message || '';

    text.appendChild(t);
    text.appendChild(msg);

    row.appendChild(sev);
    row.appendChild(text);

    row.addEventListener('click', () => {
      nwFocusEntity(it.entity);
    });

    list.appendChild(row);
  });

  host.appendChild(list);
}

function nwFocusEntity(entity) {
  if (!entity || !entity.kind) return;
  const kind = entity.kind;
  const idx = (typeof entity.index === 'number') ? entity.index : null;
  const id = (typeof entity.id === 'string') ? entity.id : '';

  let selector = '';
  if (idx !== null) {
    selector = '[data-nw-entity="' + nwCssEscape(kind) + '"][data-nw-index="' + idx + '"]';
  } else if (id) {
    selector = '[data-nw-entity="' + nwCssEscape(kind) + '"][data-nw-id="' + nwCssEscape(id) + '"]';
  }
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('nw-issue-attention');
  // force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('nw-issue-attention');
  setTimeout(() => {
    el.classList.remove('nw-issue-attention');
  }, 1300);
}

function nwApplyValidationToDom(result) {
  // clear previous marks
  document.querySelectorAll('.nw-issue--error, .nw-issue--warn').forEach((el) => {
    el.classList.remove('nw-issue--error', 'nw-issue--warn');
  });

  const v = result || {};
  const byEntity = v.byEntity || {};
  Object.keys(byEntity).forEach((k) => {
    const info = byEntity[k];
    if (!info || !info.kind || typeof info.index !== 'number') return;
    const el = document.querySelector('[data-nw-entity="' + nwCssEscape(info.kind) + '"][data-nw-index="' + info.index + '"]');
    if (!el) return;
    if (info.maxSeverity === 'error') el.classList.add('nw-issue--error');
    else if (info.maxSeverity === 'warn') el.classList.add('nw-issue--warn');
  });
}

function nwRunValidationNow() {
  const cfg = nwShcState.config || { rooms: [], functions: [], devices: [] };
  const v = nwValidateConfig(cfg);
  nwShcState.validation = v;
  nwRenderValidationPanel(v);
  nwApplyValidationToDom(v);
}

function nwGetRoomLabel(room) {
  if (!room) return '';
  return room.name || room.id || '';
}

function nwGetFunctionLabel(fn) {
  if (!fn) return '';
  return fn.name || fn.id || '';
}


function nwGetTypeLabel(type) {
  const t = (type || '').trim();
  const map = {
    switch: 'Schalter',
    color: 'Farb‑Licht (RGB)',
    dimmer: 'Dimmer',
    blind: 'Jalousie / Rollladen',
    rtr: 'Heizung (RTR)',
    player: 'Audio-Player',
    sensor: 'Sensor',
    scene: 'Szene',
    logicStatus: 'Logik-Status',
  };
  return map[t] || (t || 'Typ?');
}


function nwSetStatus(text, variant) {
  const el = document.getElementById('nw-config-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  if (variant) el.classList.add('nw-config-status--' + variant);
}

function nwMarkDirty(dirty) {
  nwShcState.dirty = !!dirty;
  const saveBtn = document.getElementById('nw-config-save-btn');
  if (saveBtn) {
    saveBtn.disabled = !dirty;
  }
  if (dirty) {
    nwSetStatus('Nicht gespeicherte Änderungen', 'dirty');
  } else {
    nwSetStatus('', null);
  }

  // Run validator (debounced) so installer sees issues immediately.
  nwScheduleValidation();
}

async function nwFetchSmartHomeConfig() {
  try {
    const res = await fetch('/api/smarthome/config');
    if (!res.ok) {
      console.error('SmartHomeConfig request failed:', res.status, res.statusText);
      nwSetStatus('Fehler beim Laden der Konfiguration', 'error');
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok || !data.config) {
      console.warn('SmartHomeConfig payload invalid', data);
      nwSetStatus('Ungültige Konfigurationsdaten', 'error');
      return null;
    }
    return data.config;
  } catch (e) {
    console.error('SmartHomeConfig fetch error:', e);
    nwSetStatus('Ausnahme beim Laden der Konfiguration', 'error');
    return null;
  }
}


/* --- Import / Export (Rollout & Support) --- */

function nwDownloadTextFile(filename, text, mimeType) {
  try {
    const blob = new Blob([text], { type: mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_e) {}
      try { a.remove(); } catch (_e) {}
    }, 0);
  } catch (e) {
    console.error('Download failed:', e);
  }
}

function nwNormalizeImportedSmartHomeConfig(rawCfg) {
  const cfgIn = (rawCfg && typeof rawCfg === 'object') ? rawCfg : {};
  // preserve any future top-level fields, but guarantee the core structure
  const cfg = Object.assign({}, cfgIn);
  cfg.version = (typeof cfg.version === 'number') ? cfg.version : 2;
  cfg.rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
  cfg.functions = Array.isArray(cfg.functions) ? cfg.functions : [];
  cfg.devices = Array.isArray(cfg.devices) ? cfg.devices : [];
  cfg.pages = Array.isArray(cfg.pages) ? cfg.pages : [];
  return cfg;
}


/* --- Pages (Sidebar Navigation) --- */

function nwSetPagesStatus(msg, type) {
  const el = document.getElementById('nw-pages-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  const cls = (type === 'ok') ? 'nw-config-status--ok' : (type === 'error') ? 'nw-config-status--error' : 'nw-config-status--dirty';
  el.classList.add(cls);
}

function nwNormalizePageObject(p, idx) {
  const id = String((p && p.id) ? p.id : `page_${idx + 1}`).trim();
  const title = String((p && (p.title || p.name || p.id)) ? (p.title || p.name || p.id) : `Seite ${idx + 1}`).trim();
  const icon = String((p && p.icon) ? p.icon : '').trim();
  const viewModeRaw = String((p && p.viewMode) ? p.viewMode : '').trim();
  const viewMode = (viewModeRaw === 'rooms' || viewModeRaw === 'functions') ? viewModeRaw : '';
  const roomIds = Array.isArray(p && p.roomIds) ? p.roomIds.map(x => String(x).trim()).filter(Boolean) : [];
  const funcIds = Array.isArray(p && p.funcIds) ? p.funcIds.map(x => String(x).trim()).filter(Boolean) : [];
  const types = Array.isArray(p && p.types) ? p.types.map(x => String(x).trim()).filter(Boolean) : [];
  const favoritesOnly = !!(p && p.favoritesOnly);
  const href = String((p && p.href) ? p.href : '').trim();
  const order = Number.isFinite(+((p && p.order) ?? idx)) ? +((p && p.order) ?? idx) : idx;

  // Multi-Level + Layout-Regeln
  const parentId = String((p && p.parentId) ? p.parentId : '').trim();
  const cardSizeRaw = String((p && (p.cardSize ?? (p.layout && p.layout.cardSize))) ? (p.cardSize ?? (p.layout && p.layout.cardSize)) : '').trim();
  const cardSize = ['auto','s','m','l','xl'].includes(cardSizeRaw) ? cardSizeRaw : 'auto';
  const sortByRaw = String((p && (p.sortBy ?? (p.layout && p.layout.sortBy))) ? (p.sortBy ?? (p.layout && p.layout.sortBy)) : '').trim();
  const sortBy = ['order','name','type'].includes(sortByRaw) ? sortByRaw : 'order';
  const groupByType = !!(p && (p.groupByType ?? (p.layout && p.layout.groupByType)));

  return { id, title, icon, viewMode, roomIds, funcIds, types, favoritesOnly, href, order, parentId, cardSize, sortBy, groupByType };
}

function nwParsePagesJson(text) {
  try {
    const raw = (text || '').trim();
    if (!raw) return { ok: true, pages: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'JSON muss ein Array sein: [ {..}, {..} ]' };
    }
    const pages = parsed.map((p, idx) => nwNormalizePageObject(p, idx)).filter(p => p.id && p.title);
    const seen = new Set();
    for (const p of pages) {
      if (seen.has(p.id)) {
        return { ok: false, error: `Doppelte id: ${p.id}` };
      }
      seen.add(p.id);
    }
    // sort by order for deterministic navigation
    pages.sort((a, b) => (a.order || 0) - (b.order || 0));
    return { ok: true, pages };
  } catch (e) {
    return { ok: false, error: 'Parse-Fehler: ' + (e && e.message ? e.message : String(e)) };
  }
}

function nwBuildDefaultPages(cfg) {
  const rooms = (cfg && Array.isArray(cfg.rooms)) ? cfg.rooms : [];
  const pages = [{
    id: 'home',
    title: 'Home',
    icon: '🏠',
    viewMode: 'rooms',
    roomIds: [],
    funcIds: [],
    types: [],
    favoritesOnly: false,
    order: 0,
  }];

  rooms
    .slice()
    .sort((a, b) => {
      const oa = Number.isFinite(+a.order) ? +a.order : 0;
      const ob = Number.isFinite(+b.order) ? +b.order : 0;
      if (oa !== ob) return oa - ob;
      return String(a.name || '').localeCompare(String(b.name || ''), 'de');
    })
    .forEach((r, idx) => {
      const id = String(r.id || '').trim();
      const title = String(r.name || '').trim();
      if (!id || !title) return;
      pages.push({
        id: `room_${id}`,
        title,
        icon: String(r.icon || '🏷️'),
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

function nwRenderPagesEditor(force = false) {
  const ta = document.getElementById('nw-pages-json');
  if (!ta) return;

  // Sync textarea from state only when explicitly requested (e.g. after Builder save)
  if (force) {
    ta.value = nwShcState.pagesJsonText || '';
  }

  // Parse the current text to keep Builder in sync (without rewriting user formatting)
  const parsed = nwParsePagesJson(ta.value);
  nwShcState.pagesJsonText = ta.value;
  nwShcState.pagesJsonValid = parsed.ok;

  if (parsed.ok) {
    // IMPORTANT: keep config.pages in sync with the Builder/JSON editor.
    // Otherwise pages exist only in the editor draft and will not be saved
    // to the adapter – the SmartHome VIS would stay empty.
    nwShcState.pagesDraft = parsed.pages;
    if (nwShcState.config) nwShcState.config.pages = parsed.pages;

    // Keep selection if possible
    if (!nwShcState.pagesUi.selectedId && nwShcState.pagesDraft.length) {
      nwShcState.pagesUi.selectedId = nwShcState.pagesDraft[0].id;
      nwShcState.pagesUi.isNew = false;
    }

    if (nwShcState.pagesUi.selectedId && !nwShcState.pagesDraft.some((p) => p.id === nwShcState.pagesUi.selectedId)) {
      nwShcState.pagesUi.selectedId = nwShcState.pagesDraft.length ? nwShcState.pagesDraft[0].id : null;
      nwShcState.pagesUi.isNew = false;
    }
  }

  nwPagesRenderStatus(parsed);
  nwPagesRenderTabs();
  nwPagesRenderList();
  nwPagesRenderEditor();
}



function nwPagesRenderStatus(parsed) {
  const st = document.getElementById('nw-pages-status');
  if (!st) return;

  // Always show parser errors
  if (!parsed || !parsed.ok) {
    st.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
    st.classList.add('nw-config-status--error');
    st.textContent = parsed && parsed.error ? parsed.error : 'Ungültiges JSON';
    return;
  }

  // If user explicitly set a message (dirty/ok), keep it.
  if (st.classList.contains('nw-config-status--dirty') || st.classList.contains('nw-config-status--ok')) {
    return;
  }

  // Otherwise show a compact OK hint
  st.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  st.classList.add('nw-config-status--ok');
  st.textContent = `OK ✅ (${(parsed.pages || []).length} Seiten)`;
}

function nwPagesRenderTabs() {
  const tabs = document.getElementById('nw-pages-tabs');
  const wrapBuilder = document.getElementById('nw-pages-builder');
  const wrapJson = document.getElementById('nw-pages-json-wrap');

  if (tabs) {
    tabs.querySelectorAll('button[data-tab]').forEach((btn) => {
      const tab = btn.getAttribute('data-tab');
      if (tab === nwShcState.pagesUi.tab) btn.classList.add('nw-tab--active');
      else btn.classList.remove('nw-tab--active');
    });
  }

  if (wrapBuilder) wrapBuilder.style.display = (nwShcState.pagesUi.tab === 'builder') ? '' : 'none';
  if (wrapJson) wrapJson.style.display = (nwShcState.pagesUi.tab === 'json') ? '' : 'none';
}

function nwPagesBuildTree(pages) {
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

function nwPagesFormatFilterSummary(p) {
  if (!p) return '';
  const parts = [];
  if (Array.isArray(p.roomIds) && p.roomIds.length) parts.push(`Rooms:${p.roomIds.length}`);
  if (Array.isArray(p.funcIds) && p.funcIds.length) parts.push(`Functions:${p.funcIds.length}`);
  if (Array.isArray(p.types) && p.types.length) parts.push(`Types:${p.types.length}`);
  if (p.favoritesOnly) parts.push('⭐');
  parts.push(`Mode:${p.viewMode || 'rooms'}`);
  if (p.parentId) parts.push(`Parent:${p.parentId}`);
  return parts.join(' • ');
}

function nwPagesRenderList() {
  const listEl = document.getElementById('nw-pages-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft : [];
  if (!pages.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-config-hint';
    empty.textContent = 'Keine Seiten definiert. Klicke auf „+ Neu“ oder nutze „Standard-Seiten“. '; 
    listEl.appendChild(empty);
    return;
  }

  const { children, roots } = nwPagesBuildTree(pages);

  const render = (arr, depth) => {
    for (const p of arr) {
      const row = document.createElement('div');
      row.className = 'nw-page-row' + (nwShcState.pagesUi.selectedId === p.id && !nwShcState.pagesUi.isNew ? ' nw-page-row--active' : '');
      row.style.paddingLeft = `${10 + Math.max(0, depth) * 14}px`;

      const icon = document.createElement('div');
      icon.className = 'nw-page-row__icon';
      icon.textContent = p.icon || '•';

      const meta = document.createElement('div');
      meta.className = 'nw-page-row__meta';
      meta.innerHTML = `<div class="nw-page-row__title">${p.title || p.id}</div><div class="nw-page-row__sub">${p.id} • ${nwPagesFormatFilterSummary(p)}</div>`;

      const badge = document.createElement('div');
      badge.className = 'nw-page-row__badge';
      badge.textContent = String(p.order ?? 0);
      badge.title = 'Order';

      row.appendChild(icon);
      row.appendChild(meta);
      row.appendChild(badge);

      row.addEventListener('click', () => {
        nwShcState.pagesUi.selectedId = p.id;
        nwShcState.pagesUi.isNew = false;
        nwShcState.pagesUi.idManuallyEdited = false;
        nwPagesRenderList();
        nwPagesRenderEditor();
      });

      listEl.appendChild(row);

      if (children.has(p.id)) {
        render(children.get(p.id), depth + 1);
      }
    }
  };

  render(roots, 0);
}

function nwSetSelectOptions(selectEl, options, selectedValues, includeEmpty = false, emptyLabel = '(keiner)') {
  if (!selectEl) return;
  const sel = new Set((selectedValues || []).map(String));

  selectEl.innerHTML = '';

  if (includeEmpty) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = emptyLabel;
    selectEl.appendChild(opt);
  }

  (options || []).forEach((o) => {
    const opt = document.createElement('option');
    opt.value = String(o.value);
    opt.textContent = String(o.label);
    if (sel.has(opt.value)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function nwGetMultiSelectValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.options).filter((o) => o.selected).map((o) => o.value);
}

function nwPagesGetSelectedPage() {
  if (nwShcState.pagesUi.isNew) return null;
  return (nwShcState.pagesDraft || []).find((p) => p.id === nwShcState.pagesUi.selectedId) || null;
}

function nwPagesGetNewSeed() {
  // If user clicked “+ Neu” while a page is selected, use that as a starting point
  const base = nwShcState.pagesUi.newSeed;
  if (base && typeof base === 'object') return base;
  return null;
}

function nwPagesBuildEditorModel() {
  if (nwShcState.pagesUi.isNew) {
    const seed = nwPagesGetNewSeed();
    return nwNormalizePageObject(seed || { id: '', title: '', icon: '', viewMode: 'rooms', order: 0 }, 0, '');
  }

  const p = nwPagesGetSelectedPage();
  return p ? nwNormalizePageObject(p, 0, p.id) : nwNormalizePageObject({ id: '', title: '', icon: '', viewMode: 'rooms', order: 0 }, 0, '');
}

function nwPagesRenderEditor() {
  const titleEl = document.getElementById('nw-page-title');
  const iconEl = document.getElementById('nw-page-icon');
  const idEl = document.getElementById('nw-page-id');
  const parentEl = document.getElementById('nw-page-parent');
  const viewModeEl = document.getElementById('nw-page-viewmode');
  const orderEl = document.getElementById('nw-page-order');
  const roomsEl = document.getElementById('nw-page-rooms');
  const funcsEl = document.getElementById('nw-page-functions');
  const typesEl = document.getElementById('nw-page-types');
  const sortByEl = document.getElementById('nw-page-sortby');
  const cardSizeEl = document.getElementById('nw-page-cardsize');
  const groupByTypeEl = document.getElementById('nw-page-groupbytype');
  const favOnlyEl = document.getElementById('nw-page-favonly');
  const hrefEl = document.getElementById('nw-page-href');
  const delBtn = document.getElementById('nw-page-delete');
  const editorTitle = document.getElementById('nw-page-editor-title');

  if (!titleEl || !idEl) return;

  const model = nwPagesBuildEditorModel();

  if (editorTitle) {
    editorTitle.textContent = nwShcState.pagesUi.isNew ? 'Neue Seite' : `Seite: ${model.title || model.id}`;
  }

  // Parent options
  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft : [];
  const flat = [];
  const { children, roots } = nwPagesBuildTree(pages);
  const walk = (arr, depth) => {
    for (const p of arr) {
      if (!nwShcState.pagesUi.isNew && p.id === nwShcState.pagesUi.selectedId) {
        // exclude self
      } else {
        flat.push({ value: p.id, label: `${'—'.repeat(depth)} ${p.title || p.id} (${p.id})` });
      }
      if (children.has(p.id)) walk(children.get(p.id), depth + 1);
    }
  };
  walk(roots, 0);
  nwSetSelectOptions(parentEl, flat, [model.parentId || ''], true, '(keiner)');

  // Rooms / Functions options
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms.slice() : [];
  rooms.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));
  nwSetSelectOptions(roomsEl, rooms.map((r) => ({ value: r.id, label: `${r.title || r.id} (${r.id})` })), model.roomIds || []);

  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions.slice() : [];
  funcs.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));
  nwSetSelectOptions(funcsEl, funcs.map((f) => ({ value: f.id, label: `${f.title || f.id} (${f.id})` })), model.funcIds || []);

  // Types options
  const typeSet = new Set();
  const common = ['light', 'shutter', 'rtr', 'plug', 'switch', 'sensor', 'camera', 'meter'];
  common.forEach((t) => typeSet.add(t));

  (nwShcState.config.devices || []).forEach((d) => {
    if (d && d.type) typeSet.add(String(d.type));
  });

  (pages || []).forEach((p) => {
    (p.types || []).forEach((t) => typeSet.add(String(t)));
  });

  const typeList = Array.from(typeSet).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'de'));
  nwSetSelectOptions(typesEl, typeList.map((t) => ({ value: t, label: t })), model.types || []);

  // Set primitive fields
  titleEl.value = model.title || '';

  // Icon select options
  if (iconEl && iconEl.tagName === 'SELECT') {
    nwSetSelectOptions(iconEl, NW_PAGE_ICON_OPTIONS, [model.icon || ''], false);
  }
  // If config contains a custom icon, keep it selectable
  if (iconEl && iconEl.tagName === 'SELECT' && model.icon && !Array.from(iconEl.options).some(o => o.value === model.icon)) {
    const opt = document.createElement('option');
    opt.value = model.icon;
    opt.textContent = `${model.icon} (Custom)`;
    iconEl.appendChild(opt);
  }
  iconEl.value = model.icon || '';
  idEl.value = model.id || '';
  if (viewModeEl) viewModeEl.value = model.viewMode || 'rooms';
  if (orderEl) orderEl.value = String(model.order ?? 0);

  if (sortByEl) sortByEl.value = model.sortBy || 'order';
  if (cardSizeEl) cardSizeEl.value = model.cardSize || 'auto';
  if (groupByTypeEl) groupByTypeEl.checked = !!model.groupByType;
  if (favOnlyEl) favOnlyEl.checked = !!model.favoritesOnly;
  if (hrefEl) hrefEl.value = model.href || '';

  if (delBtn) delBtn.disabled = nwShcState.pagesUi.isNew || !nwShcState.pagesUi.selectedId;
}

function nwPagesSlugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

function nwPagesSetEditorStatus(msg, kind = 'dirty') {
  const el = document.getElementById('nw-page-editor-status');
  if (!el) return;
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  if (kind === 'ok') el.classList.add('nw-config-status--ok');
  else if (kind === 'error') el.classList.add('nw-config-status--error');
  else el.classList.add('nw-config-status--dirty');
  el.textContent = msg || '';
}

function nwPagesSaveFromEditor() {
  const titleEl = document.getElementById('nw-page-title');
  const iconEl = document.getElementById('nw-page-icon');
  const idEl = document.getElementById('nw-page-id');
  const parentEl = document.getElementById('nw-page-parent');
  const viewModeEl = document.getElementById('nw-page-viewmode');
  const orderEl = document.getElementById('nw-page-order');
  const roomsEl = document.getElementById('nw-page-rooms');
  const funcsEl = document.getElementById('nw-page-functions');
  const typesEl = document.getElementById('nw-page-types');
  const sortByEl = document.getElementById('nw-page-sortby');
  const cardSizeEl = document.getElementById('nw-page-cardsize');
  const groupByTypeEl = document.getElementById('nw-page-groupbytype');
  const favOnlyEl = document.getElementById('nw-page-favonly');
  const hrefEl = document.getElementById('nw-page-href');

  const raw = {
    id: String(idEl ? idEl.value : '').trim(),
    title: String(titleEl ? titleEl.value : '').trim(),
    icon: String(iconEl ? iconEl.value : '').trim(),
    parentId: String(parentEl ? parentEl.value : '').trim(),
    viewMode: String(viewModeEl ? viewModeEl.value : 'rooms').trim(),
    order: Number.isFinite(+String(orderEl ? orderEl.value : '0')) ? +String(orderEl ? orderEl.value : '0') : 0,
    roomIds: nwGetMultiSelectValues(roomsEl),
    funcIds: nwGetMultiSelectValues(funcsEl),
    types: nwGetMultiSelectValues(typesEl),
    favoritesOnly: !!(favOnlyEl && favOnlyEl.checked),
    href: String(hrefEl ? hrefEl.value : '').trim(),
    sortBy: String(sortByEl ? sortByEl.value : 'order').trim(),
    cardSize: String(cardSizeEl ? cardSizeEl.value : 'auto').trim(),
    groupByType: !!(groupByTypeEl && groupByTypeEl.checked),
  };

  if (!raw.id) {
    nwPagesSetEditorStatus('ID fehlt 🙈', 'error');
    return;
  }

  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft.slice() : [];
  const prevId = nwShcState.pagesUi.isNew ? null : nwShcState.pagesUi.selectedId;

  // Unique ID
  const idExists = pages.some((p) => p.id === raw.id && p.id !== prevId);
  if (idExists) {
    nwPagesSetEditorStatus('ID ist bereits vergeben.', 'error');
    return;
  }

  // Parent validation
  if (raw.parentId && raw.parentId === raw.id) {
    nwPagesSetEditorStatus('Parent darf nicht die eigene ID sein.', 'error');
    return;
  }

  if (raw.parentId && !pages.some((p) => p.id === raw.parentId)) {
    nwPagesSetEditorStatus('Parent-ID existiert nicht.', 'error');
    return;
  }

  // Cycle check
  if (raw.parentId) {
    const byId = new Map(pages.map((p) => [p.id, p]));
    let cur = byId.get(raw.parentId);
    let safety = 50;
    while (cur && safety-- > 0) {
      if (cur.parentId === raw.id) {
        nwPagesSetEditorStatus('Cycle erkannt (Parent-Kette führt zurück).', 'error');
        return;
      }
      cur = cur.parentId ? byId.get(cur.parentId) : null;
    }
  }

  const normalized = nwNormalizePageObject(raw, 0, raw.id);

  // Upsert
  let next = pages.filter((p) => p.id !== prevId);

  // If ID changed: update children parentId references
  if (prevId && prevId !== raw.id) {
    next = next.map((p) => (p.parentId === prevId ? { ...p, parentId: raw.id } : p));
  }

  next.push(normalized);

  // Sort for stable JSON
  next.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));

  nwShcState.pagesDraft = next;
  nwShcState.pagesUi.selectedId = normalized.id;
  nwShcState.pagesUi.isNew = false;
  nwShcState.pagesUi.newSeed = null;

  // Update JSON text
  nwShcState.pagesJsonText = JSON.stringify(nwShcState.pagesDraft, null, 2);
  const ta = document.getElementById('nw-pages-json');
  if (ta) ta.value = nwShcState.pagesJsonText;

  nwMarkDirty(true);
  nwPagesSetEditorStatus('Gespeichert ✅ (noch nicht in Adapter übernommen)', 'ok');
  nwRenderPagesEditor(true);
}

function nwPagesDeleteSelected() {
  const id = nwShcState.pagesUi.selectedId;
  if (!id) return;

  if (!confirm(`Seite „${id}“ wirklich löschen?

Kinder werden automatisch auf Root gehoben.`)) return;

  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft.slice() : [];
  const next = pages
    .filter((p) => p.id !== id)
    .map((p) => (p.parentId === id ? { ...p, parentId: '' } : p));

  nwShcState.pagesDraft = next;
  nwShcState.pagesUi.selectedId = next.length ? next[0].id : null;
  nwShcState.pagesUi.isNew = false;

  nwShcState.pagesJsonText = JSON.stringify(nwShcState.pagesDraft, null, 2);
  const ta = document.getElementById('nw-pages-json');
  if (ta) ta.value = nwShcState.pagesJsonText;

  nwMarkDirty(true);
  nwPagesSetEditorStatus('Gelöscht ✅ (noch nicht in Adapter übernommen)', 'ok');
  nwRenderPagesEditor(true);
}

/* --- Datensicherung (wie App-Center) --- */

function nwSetBackupStatus(msg, type) {
  const el = document.getElementById('nw-backup-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  const cls = (type === 'ok') ? 'nw-config-status--ok' : (type === 'error') ? 'nw-config-status--error' : 'nw-config-status--dirty';
  el.classList.add(cls);
}

async function nwBackupExport() {
  nwSetBackupStatus('Exportiere Backup …', null);
  const res = await fetch('/api/installer/backup/export', { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : 'Backup export fehlgeschlagen');
  const payload = data.payload || {};
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  nwDownloadTextFile(`nexowatt_backup_${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
  nwSetBackupStatus('Backup exportiert ✅', 'ok');
}

async function nwBackupImport(file, mode) {
  if (!file) return;
  nwSetBackupStatus('Importiere Backup …', null);
  const txt = await file.text();
  const payload = JSON.parse(txt);

  const res = await fetch('/api/installer/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: mode || 'merge', payload }),
  });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : 'Backup import fehlgeschlagen');
  nwSetBackupStatus('Backup importiert ✅ (bitte Seite neu laden)', 'ok');
}

async function nwBackupRestoreFromUserdata() {
  if (!confirm('Wirklich Restore aus 0_userdata durchführen? (überschreibt die aktuelle Konfiguration)')) return;
  nwSetBackupStatus('Lade Backup aus 0_userdata …', null);
  const res = await fetch('/api/installer/backup/userdata', { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : '0_userdata Restore fehlgeschlagen');

  const payload = data.payload || {};
  const res2 = await fetch('/api/installer/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'replace', payload }),
  });
  const data2 = await res2.json();
  if (!data2 || !data2.ok) throw new Error((data2 && data2.error) ? data2.error : 'Restore import fehlgeschlagen');
  nwSetBackupStatus('Restore durchgeführt ✅ (bitte Seite neu laden)', 'ok');
}

function nwExportSmartHomeConfig() {
  const cfg = nwShcState.config;
  if (!cfg) {
    nwSetStatus('Keine Konfiguration zum Exportieren geladen.', 'error');
    return;
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const v = (typeof cfg.version === 'number') ? ('_cfg' + cfg.version) : '';
  const filename = 'nexowatt-smarthome-config' + v + '_' + stamp + '.json';

  const out = nwNormalizeImportedSmartHomeConfig(cfg);
  const text = JSON.stringify(out, null, 2);
  nwDownloadTextFile(filename, text, 'application/json');
  nwSetStatus('Export erstellt: ' + filename, 'ok');
}

async function nwImportSmartHomeConfigFromFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    if (!text || !text.trim()) {
      nwSetStatus('Import fehlgeschlagen: Datei ist leer.', 'error');
      return;
    }
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      nwSetStatus('Import fehlgeschlagen: ungültiges JSON.', 'error');
      return;
    }

    // Accept either raw config or wrapper {config: {...}}
    const cfgRaw = (obj && obj.config && typeof obj.config === 'object') ? obj.config : obj;
    const normalized = nwNormalizeImportedSmartHomeConfig(cfgRaw);

    const summary =
      'Räume: ' + normalized.rooms.length + '\n' +
      'Funktionen: ' + normalized.functions.length + '\n' +
      'Geräte: ' + normalized.devices.length + '\n\n' +
      'Import anwenden? (bestehende Konfig wird im Editor ersetzt – erst nach „Speichern“ wird es aktiv)';
    const ok = confirm(summary);
    if (!ok) {
      nwSetStatus('Import abgebrochen.', 'error');
      return;
    }

    nwShcState.config = normalized;
    // sync pages editor
    try {
      nwShcState.pagesJsonText = JSON.stringify(nwShcState.config.pages || [], null, 2);
      nwShcState.pagesJsonValid = true;
    } catch (_e) {
      nwShcState.pagesJsonText = '[]';
      nwShcState.pagesJsonValid = false;
    }
    nwNormalizeRoomFunctionOrder();
    nwNormalizeDeviceOrder();
    nwMarkDirty(true);
    nwRenderAll();
    nwRenderPagesEditor();

    nwSetStatus('Import geladen. Bitte speichern, um ihn zu übernehmen.', 'ok');

    // Optional: offer immediate save for fast rollout
    const saveNow = confirm('Jetzt direkt speichern und anwenden?');
    if (saveNow) {
      await nwSaveSmartHomeConfig();
    }
  } catch (e) {
    console.error('Import error:', e);
    nwSetStatus('Import fehlgeschlagen: Ausnahme.', 'error');
  }
}

async function nwSaveSmartHomeConfig() {
  if (!nwShcState.config) return;

  // Pages JSON must be valid (otherwise SmartHome navigation can break)
  const pagesRes = nwParsePagesJson(nwShcState.pagesJsonText);
  if (!pagesRes.ok) {
    nwShcState.pagesJsonValid = false;
    nwRenderPagesEditor();
    nwSetStatus('Speichern abgebrochen: Pages JSON ungültig – ' + pagesRes.error, 'error');
    return;
  }
  nwShcState.pagesJsonValid = true;
  nwShcState.config.pages = pagesRes.pages;

  // Validate immediately before saving (installer feedback)
  nwRunValidationNow();
  const v = nwShcState.validation || { errors: [], warnings: [] };
  const errCount = Array.isArray(v.errors) ? v.errors.length : 0;
  if (errCount > 0) {
    const ok = confirm(
      'Es gibt ' + errCount + ' Fehler in der SmartHomeConfig.\n' +
      'Das kann dazu führen, dass Kacheln nicht funktionieren oder fehlen.\n\n' +
      'Trotzdem speichern?'
    );
    if (!ok) {
      nwSetStatus('Speichern abgebrochen (bitte Fehler beheben)', 'error');
      return;
    }
  }
  try {
    const payload = { config: nwShcState.config };
    const res = await fetch('/api/smarthome/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('SmartHomeConfig save failed:', res.status, res.statusText);
      nwSetStatus('Speichern fehlgeschlagen (' + res.status + ')', 'error');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok || !data.config) {
      console.error('SmartHomeConfig save payload invalid', data);
      nwSetStatus('Speichern fehlgeschlagen (Antwort ungültig)', 'error');
      return;
    }
    nwShcState.config = data.config;
    nwShcState.originalJson = JSON.stringify(data.config);
    // sync pages editor with stored config
    try {
      nwShcState.pagesJsonText = JSON.stringify(nwShcState.config.pages || [], null, 2);
      nwShcState.pagesJsonValid = true;
    } catch (_e) {}
    nwMarkDirty(false);
    if (data.persisted) {
      nwSetStatus('Konfiguration gespeichert', 'ok');
    } else {
      nwSetStatus('Konfiguration im Adapter aktualisiert (Persistenz ggf. nicht verfügbar)', 'ok');
    }
    // Nach dem Speichern neu rendern, um evtl. Normalisierungen abzubilden
    nwRenderAll();
    nwRenderPagesEditor();
  } catch (e) {
    console.error('SmartHomeConfig save error:', e);
    nwSetStatus('Ausnahme beim Speichern', 'error');
  }
}

async function nwReloadSmartHomeConfig() {
  nwSetStatus('Lade Konfiguration …', null);
  const cfg = await nwFetchSmartHomeConfig();
  if (!cfg) return;
  nwShcState.config = {
    // version 2 adds optional "pages" for SmartHome VIS sidebar
    version: typeof cfg.version === 'number' ? cfg.version : 2,
    rooms: Array.isArray(cfg.rooms) ? cfg.rooms.map(r => Object.assign({}, r)) : [],
    functions: Array.isArray(cfg.functions) ? cfg.functions.map(f => Object.assign({}, f)) : [],
    devices: Array.isArray(cfg.devices) ? cfg.devices.map(d => Object.assign({}, d)) : [],
    pages: Array.isArray(cfg.pages) ? cfg.pages.map(p => Object.assign({}, p)) : [],
  };

  // Initialize pages JSON editor
  try {
    nwShcState.pagesJsonText = JSON.stringify(nwShcState.config.pages || [], null, 2);
    nwShcState.pagesJsonValid = true;
  } catch (_e) {
    nwShcState.pagesJsonText = '[]';
    nwShcState.pagesJsonValid = false;
  }

  nwNormalizeRoomFunctionOrder();
  nwNormalizeDeviceOrder();
  nwShcState.originalJson = JSON.stringify(nwShcState.config);
  nwMarkDirty(false);
  nwRenderAll();
  nwRenderPagesEditor();
  nwRunValidationNow();
  nwSetStatus('Konfiguration geladen', 'ok');
}

function nwRenderAll() {
  const cfg = nwShcState.config || { rooms: [], functions: [], devices: [] };
  nwRenderRoomsEditor(cfg.rooms || []);
  nwRenderFunctionsEditor(cfg.functions || []);
  nwRenderDevicesEditor(cfg.devices || [], cfg.rooms || [], cfg.functions || []);

  // Home tiles / GPA editor rendering (non-destructive)
  nwRenderShcfgShell();

  // After re-rendering, re-apply validation highlights / list
  nwScheduleValidation();
}


/* ============================================================ */
/* SmartHome Config – UI Shell (Home tiles / GPA editor / Classic)*/
/* ============================================================ */

function nwShcfgSetMode(mode, opts = {}) {
  nwEnsureShcfgUiState();
  const allowed = ['home', 'gpa', 'classic'];
  if (!allowed.includes(mode)) return;

  nwShcState.ui.mode = mode;
  try { localStorage.setItem('nw-shcfg-ui-mode', mode); } catch (_) {}

  // Optional scroll target for Classic
  if (mode === 'classic' && opts.scrollToId) {
    // delay to ensure it's visible
    setTimeout(() => {
      const el = document.getElementById(opts.scrollToId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  nwRenderShcfgShell();
}

function nwShcfgEnterGpa(opts = {}) {
  nwEnsureShcfgUiState();
  const gpa = nwShcState.ui.gpa;
  gpa.view = opts.view || 'rooms';
  gpa.currentRoomId = opts.currentRoomId || null;
  gpa.tab = opts.tab || (gpa.view === 'roomDevices' ? 'devices' : 'building');

  // default selection
  const cfg = nwShcState.config || { rooms: [], devices: [] };
  const rooms = cfg.rooms || [];
  const devices = cfg.devices || [];
  if (gpa.view === 'rooms') {
    if (!gpa.selected || gpa.selected.kind !== 'room') {
      if (rooms.length) gpa.selected = { kind: 'room', id: rooms[0].id };
    }
  } else if (gpa.view === 'roomDevices') {
    const roomId = gpa.currentRoomId || (rooms[0] && rooms[0].id) || null;
    gpa.currentRoomId = roomId;
    const roomDevs = devices.filter(d => d.roomId === roomId);
    if (!gpa.selected || gpa.selected.kind !== 'device') {
      if (roomDevs.length) gpa.selected = { kind: 'device', id: roomDevs[0].id };
      else gpa.selected = roomId ? { kind: 'room', id: roomId } : null;
    }
  }

  nwShcfgSetMode('gpa');
}

function nwInitShcfgShellUi() {
  nwEnsureShcfgUiState();

  const btnBuilding = document.getElementById('nw-shcfg-tile-building');
  const btnLogic = document.getElementById('nw-shcfg-tile-logic');
  const btnTimers = document.getElementById('nw-shcfg-tile-timers');
  const btnScenes = document.getElementById('nw-shcfg-tile-scenes');
  const btnBackup = document.getElementById('nw-shcfg-tile-backup');
  const btnClassic = document.getElementById('nw-shcfg-tile-classic');

  if (btnBuilding) btnBuilding.addEventListener('click', () => nwShcfgEnterGpa({ view: 'rooms', tab: 'building' }));
  if (btnLogic) btnLogic.addEventListener('click', () => window.location.href = '/logic.html');
  if (btnTimers) btnTimers.addEventListener('click', () => nwSetStatus('Zeitschaltuhren: Modul folgt als nächstes ⏱️', 'warn'));
  if (btnScenes) btnScenes.addEventListener('click', () => nwSetStatus('Szenen: Modul folgt als nächstes 🎬', 'warn'));
  if (btnBackup) btnBackup.addEventListener('click', () => nwShcfgSetMode('classic', { scrollToId: 'nw-backup-section' }));
  if (btnClassic) btnClassic.addEventListener('click', () => nwShcfgSetMode('classic'));

  const gpaBack = document.getElementById('nw-shcfg-gpa-back');
  const gpaSave = document.getElementById('nw-shcfg-gpa-save');
  const gpaOpenClassic = document.getElementById('nw-shcfg-gpa-open-classic');
  if (gpaBack) gpaBack.addEventListener('click', () => nwShcfgSetMode('home'));
  if (gpaOpenClassic) gpaOpenClassic.addEventListener('click', () => nwShcfgSetMode('classic'));
  if (gpaSave) gpaSave.addEventListener('click', () => nwSaveSmartHomeConfig());

  // Tabs in GPA sidebar
  const tabBtns = document.querySelectorAll('#nw-shcfg-gpa .nw-shcfg-gpa__tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      nwEnsureShcfgUiState();
      nwShcState.ui.gpa.tab = btn.dataset.nwTab || btn.getAttribute('data-nw-tab') || 'building';
      nwRenderShcfgShell();
    });
  });

  // Initial visibility
  nwRenderShcfgShell();
}

function nwRenderShcfgShell() {
  nwEnsureShcfgUiState();

  const home = document.getElementById('nw-shcfg-home');
  const gpa = document.getElementById('nw-shcfg-gpa');
  const classic = document.getElementById('nw-shcfg-classic');

  if (!home || !gpa || !classic) return;

  const mode = nwShcState.ui.mode;
  home.style.display = (mode === 'home') ? '' : 'none';
  gpa.style.display = (mode === 'gpa') ? '' : 'none';
  classic.style.display = (mode === 'classic') ? '' : 'none';

  if (mode === 'gpa') {
    nwRenderShcfgGpa();
  }
}

const NW_SHCFG_GPA_DEVICE_TEMPLATES = [
  { type: 'switch', name: 'Schalter', icon: '💡', meta: 'Ein/Aus' },
  { type: 'dimmer', name: 'Dimmer', icon: '🔆', meta: 'Helligkeit' },
  { type: 'color', name: 'RGB Licht', icon: '🌈', meta: 'Farbe + Dimmen' },
  { type: 'blind', name: 'Rollladen / Jalousie', icon: '🪟', meta: 'Up/Down/Stop' },
  { type: 'rtr', name: 'Heizen & Kühlen', icon: '🌡️', meta: 'Thermostat' },
  { type: 'scene', name: 'Szene', icon: '🎬', meta: 'Trigger' },
  { type: 'sensor', name: 'Sensor', icon: '📟', meta: 'Wert anzeigen' },
  { type: 'camera', name: 'Kamera', icon: '📷', meta: 'Stream/Snapshot' },
  { type: 'player', name: 'Audio Player', icon: '🎵', meta: 'Medien' },
  { type: 'widget', name: 'Widget', icon: '🧩', meta: 'Universal' },
];

function nwShcfgDragSet(e, payload) {
  try {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  } catch (_) {}
  try {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
  } catch (_) {}
  e.dataTransfer.effectAllowed = 'copy';
}

function nwShcfgDragGet(e) {
  const dt = e.dataTransfer;
  if (!dt) return null;
  const raw = dt.getData('application/json') || dt.getData('text/plain');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function nwRenderShcfgGpa() {
  nwEnsureShcfgUiState();
  const cfg = nwShcState.config;

  const lib = document.getElementById('nw-shcfg-gpa-lib');
  const work = document.getElementById('nw-shcfg-gpa-work');
  const props = document.getElementById('nw-shcfg-gpa-props');
  if (!lib || !work || !props) return;

  // Tabs active state
  const gpa = nwShcState.ui.gpa;
  const tabBtns = document.querySelectorAll('#nw-shcfg-gpa .nw-shcfg-gpa__tab');
  tabBtns.forEach(btn => {
    const key = btn.dataset.nwTab || btn.getAttribute('data-nw-tab');
    btn.classList.toggle('is-active', key === gpa.tab);
  });

  if (!cfg) {
    lib.textContent = 'Lade Konfiguration…';
    work.textContent = 'Lade Konfiguration…';
    props.textContent = 'Lade Konfiguration…';
    return;
  }

  nwRenderShcfgGpaLib(lib);
  nwRenderShcfgGpaWorkspace(work);
  nwRenderShcfgGpaProps(props);
}

function nwShcfgLibGroup(titleText, items) {
  const group = document.createElement('div');
  group.className = 'nw-shcfg-libgroup';
  const title = document.createElement('div');
  title.className = 'nw-shcfg-libgroup__title';
  title.textContent = titleText;
  group.appendChild(title);
  items.forEach(it => group.appendChild(it));
  return group;
}

function nwShcfgLibItem({ icon, name, meta, payload }) {
  const item = document.createElement('div');
  item.className = 'nw-shcfg-libitem';
  item.draggable = true;

  const left = document.createElement('div');
  left.className = 'nw-shcfg-libitem__left';

  const ico = document.createElement('div');
  ico.className = 'nw-shcfg-libitem__icon';
  ico.textContent = icon || '➕';

  const textWrap = document.createElement('div');
  const n = document.createElement('div');
  n.className = 'nw-shcfg-libitem__name';
  n.textContent = name;
  const m = document.createElement('div');
  m.className = 'nw-shcfg-libitem__meta';
  m.textContent = meta || '';

  textWrap.appendChild(n);
  textWrap.appendChild(m);
  left.appendChild(ico);
  left.appendChild(textWrap);

  const hint = document.createElement('div');
  hint.className = 'nw-shcfg-libitem__meta';
  hint.textContent = '↗ ziehen';

  item.appendChild(left);
  item.appendChild(hint);

  item.addEventListener('dragstart', (e) => nwShcfgDragSet(e, payload));
  return item;
}

function nwRenderShcfgGpaLib(container) {
  container.innerHTML = '';
  const gpa = nwShcState.ui.gpa;

  if (gpa.tab === 'building') {
    const items = [
      nwShcfgLibItem({
        icon: '🏠',
        name: 'Raum',
        meta: 'In den Arbeitsbereich ziehen',
        payload: { kind: 'create-room' },
      }),
    ];
    container.appendChild(nwShcfgLibGroup('Standardelemente', items));
    return;
  }

  if (gpa.tab === 'devices') {
    const items = NW_SHCFG_GPA_DEVICE_TEMPLATES.map(tpl =>
      nwShcfgLibItem({
        icon: tpl.icon,
        name: tpl.name,
        meta: tpl.meta,
        payload: { kind: 'device-template', templateType: tpl.type },
      })
    );
    container.appendChild(nwShcfgLibGroup('Geräte', items));
    return;
  }

  // Visual tab (placeholder)
  const p = document.createElement('div');
  p.className = 'nw-config-hint';
  p.textContent = 'Visual‑Elemente folgen als nächstes (Widgets/Seiten‑Layout).';
  container.appendChild(p);
}

function nwShcfgAddRoom(name = 'Neuer Raum') {
  const cfg = nwShcState.config;
  if (!cfg) return null;
  const rooms = cfg.rooms || (cfg.rooms = []);
  const id = nwEnsureUniqueId(rooms, 'raum', null);
  const room = { id, name, order: rooms.length + 1 };
  rooms.push(room);
  nwNormalizeRoomOrder();
  nwMarkDirty(true);
  return room;
}

function nwRenderShcfgGpaWorkspace(container) {
  container.innerHTML = '';
  const cfg = nwShcState.config;
  const gpa = nwShcState.ui.gpa;

  const rooms = cfg.rooms || [];
  const devices = cfg.devices || [];

  const crumbs = document.createElement('div');
  crumbs.className = 'nw-shcfg-work__crumbs';

  const left = document.createElement('div');
  const right = document.createElement('div');

  if (gpa.view === 'roomDevices') {
    const room = rooms.find(r => r.id === gpa.currentRoomId) || rooms[0] || null;
    if (!room) {
      gpa.view = 'rooms';
      gpa.currentRoomId = null;
      return nwRenderShcfgGpaWorkspace(container);
    }

    const backBtn = document.createElement('button');
    backBtn.className = 'nw-config-btn nw-config-btn--ghost';
    backBtn.type = 'button';
    backBtn.textContent = '← Gebäude';
    backBtn.addEventListener('click', () => {
      gpa.view = 'rooms';
      gpa.currentRoomId = null;
      gpa.tab = 'building';
      gpa.selected = { kind: 'room', id: room.id };
      nwRenderShcfgShell();
    });

    left.appendChild(backBtn);
    const title = document.createElement('strong');
    title.textContent = room.name;
    left.appendChild(title);

    const hint = document.createElement('div');
    hint.className = 'nw-config-hint';
    hint.textContent = 'Ziehe Geräte aus der Bibliothek hier rein.';
    right.appendChild(hint);

    crumbs.appendChild(left);
    crumbs.appendChild(right);
    container.appendChild(crumbs);

    const drop = document.createElement('div');
    drop.className = 'nw-shcfg-dropzone';
    drop.textContent = 'Gerät hier ablegen';
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      const payload = nwShcfgDragGet(e);
      if (!payload) return;
      if (payload.kind === 'device-template' && payload.templateType) {
        const dev = nwAddDeviceFromTemplate(payload.templateType, { roomId: room.id, silent: true });
        if (dev) {
          gpa.selected = { kind: 'device', id: dev.id };
          gpa.tab = 'devices';
          // refresh only GPA shell (device was already added + rendered)
          nwRenderShcfgShell();
        }
      }
    });
    container.appendChild(drop);

    const grid = document.createElement('div');
    grid.className = 'nw-shcfg-grid';

    const roomDevices = devices.filter(d => d.roomId === room.id);
    if (!roomDevices.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-hint';
      empty.textContent = 'Noch keine Geräte in diesem Raum.';
      container.appendChild(empty);
    }

    roomDevices.forEach(dev => {
      const card = document.createElement('div');
      card.className = 'nw-shcfg-card';
      if (gpa.selected && gpa.selected.kind === 'device' && gpa.selected.id === dev.id) card.classList.add('is-selected');

      const titleRow = document.createElement('div');
      titleRow.className = 'nw-shcfg-card__title';
      const ico = document.createElement('span');
      ico.textContent = (NW_SHCFG_GPA_DEVICE_TEMPLATES.find(t => t.type === dev.type)?.icon) || '🧩';
      const t = document.createElement('span');
      t.textContent = dev.alias || dev.id;
      titleRow.appendChild(ico);
      titleRow.appendChild(t);

      const sub = document.createElement('div');
      sub.className = 'nw-shcfg-card__subtitle';
      const fn = (cfg.functions || []).find(f => f.id === dev.functionId);
      sub.textContent = `${dev.type}${fn ? ' • ' + fn.name : ''}`;

      card.appendChild(titleRow);
      card.appendChild(sub);

      card.addEventListener('click', () => {
        gpa.selected = { kind: 'device', id: dev.id };
        nwRenderShcfgShell();
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
    return;
  }

  // rooms view
  left.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = 'Gebäude';
  left.appendChild(title);

  const addBtn = document.createElement('button');
  addBtn.className = 'nw-config-btn';
  addBtn.type = 'button';
  addBtn.textContent = '+ Raum';
  addBtn.addEventListener('click', () => {
    const room = nwShcfgAddRoom();
    if (room) {
      gpa.selected = { kind: 'room', id: room.id };
      nwRenderAll();
    }
  });
  right.appendChild(addBtn);

  crumbs.appendChild(left);
  crumbs.appendChild(right);
  container.appendChild(crumbs);

  const drop = document.createElement('div');
  drop.className = 'nw-shcfg-dropzone';
  drop.textContent = 'Raum aus der Bibliothek hier ablegen';
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    const payload = nwShcfgDragGet(e);
    if (!payload) return;
    if (payload.kind === 'create-room') {
      const room = nwShcfgAddRoom();
      if (room) {
        gpa.selected = { kind: 'room', id: room.id };
        nwRenderAll();
      }
    }
  });
  container.appendChild(drop);

  const grid = document.createElement('div');
  grid.className = 'nw-shcfg-grid';

  if (!rooms.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-config-hint';
    empty.textContent = 'Noch keine Räume. Ziehe „Raum“ aus der Bibliothek oder nutze „+ Raum“. '; 
    container.appendChild(empty);
  }

  rooms.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(room => {
    const card = document.createElement('div');
    card.className = 'nw-shcfg-card';
    if (gpa.selected && gpa.selected.kind === 'room' && gpa.selected.id === room.id) card.classList.add('is-selected');

    const titleRow = document.createElement('div');
    titleRow.className = 'nw-shcfg-card__title';
    const ico = document.createElement('span');
    ico.textContent = '🏠';
    const t = document.createElement('span');
    t.textContent = room.name;
    titleRow.appendChild(ico);
    titleRow.appendChild(t);

    const sub = document.createElement('div');
    sub.className = 'nw-shcfg-card__subtitle';
    const count = devices.filter(d => d.roomId === room.id).length;
    sub.textContent = `${count} Gerät(e)`;

    card.appendChild(titleRow);
    card.appendChild(sub);

    // Drop a device template onto a room
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('is-selected'); });
    card.addEventListener('dragleave', () => {
      if (!(gpa.selected && gpa.selected.kind === 'room' && gpa.selected.id === room.id)) card.classList.remove('is-selected');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const payload = nwShcfgDragGet(e);
      if (!payload) return;
      if (payload.kind === 'device-template' && payload.templateType) {
        const dev = nwAddDeviceFromTemplate(payload.templateType, { roomId: room.id, silent: true });
        if (dev) {
          // jump directly into room view
          gpa.view = 'roomDevices';
          gpa.currentRoomId = room.id;
          gpa.tab = 'devices';
          gpa.selected = { kind: 'device', id: dev.id };
          nwRenderShcfgShell();
        }
      }
    });

    card.addEventListener('click', () => {
      gpa.selected = { kind: 'room', id: room.id };
      nwRenderShcfgShell();
    });

    card.addEventListener('dblclick', () => {
      gpa.view = 'roomDevices';
      gpa.currentRoomId = room.id;
      gpa.tab = 'devices';
      const roomDevs = devices.filter(d => d.roomId === room.id);
      gpa.selected = roomDevs.length ? { kind: 'device', id: roomDevs[0].id } : { kind: 'room', id: room.id };
      nwRenderShcfgShell();
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function nwShcfgCreateSelect(options, value, onChange) {
  const sel = document.createElement('select');
  sel.className = 'nw-config-select';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    sel.appendChild(o);
  });
  sel.value = value ?? '';
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

function nwShcfgCreateTextInput(value, onChange, { placeholder = '' } = {}) {
  const input = document.createElement('input');
  input.className = 'nw-config-input';
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value ?? '';
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

function nwShcfgNullIfEmpty(v) {
  const s = (v ?? '').trim();
  return s ? s : null;
}

function nwRenderShcfgGpaProps(container) {
  container.innerHTML = '';
  const cfg = nwShcState.config;
  const gpa = nwShcState.ui.gpa;
  const sel = gpa.selected;

  const rooms = cfg.rooms || [];
  const funcs = cfg.functions || [];
  const devices = cfg.devices || [];

  if (!sel) {
    const h = document.createElement('div');
    h.className = 'nw-config-hint';
    h.textContent = 'Wähle links im Arbeitsbereich einen Raum oder ein Gerät aus.';
    container.appendChild(h);
    return;
  }

  if (sel.kind === 'room') {
    const room = rooms.find(r => r.id === sel.id);
    if (!room) {
      container.textContent = 'Auswahl nicht gefunden.';
      return;
    }

    const head = document.createElement('div');
    head.className = 'nw-config-card__head';
    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = `Raum: ${room.name}`;
    head.appendChild(title);

    const del = document.createElement('button');
    del.className = 'nw-config-btn nw-config-btn--danger';
    del.type = 'button';
    del.textContent = 'Löschen';
    del.addEventListener('click', () => {
      if (!confirm(`Raum „${room.name}“ wirklich löschen?`)) return;
      const idx = rooms.findIndex(r => r.id === room.id);
      if (idx >= 0) {
        rooms.splice(idx, 1);
        nwNormalizeRoomOrder();
        nwMarkDirty(true);
        // Keep selection sane
        gpa.selected = rooms.length ? { kind: 'room', id: rooms[0].id } : null;
        gpa.view = 'rooms';
        gpa.currentRoomId = null;
        nwRenderAll();
      }
    });

    head.appendChild(del);
    container.appendChild(head);

    // Name
    container.appendChild(
      nwCreateFieldRow('Name', nwShcfgCreateTextInput(room.name, (v) => {
        room.name = v;
        nwMarkDirty(true);
        nwRenderShcfgShell();
      }))
    );

    // ID
    const idInput = nwShcfgCreateTextInput(room.id, () => {}, {});
    idInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('ID', idInput));

    // Shortcut: open room
    const openBtn = document.createElement('button');
    openBtn.className = 'nw-config-btn';
    openBtn.type = 'button';
    openBtn.textContent = 'Raum öffnen';
    openBtn.addEventListener('click', () => {
      gpa.view = 'roomDevices';
      gpa.currentRoomId = room.id;
      gpa.tab = 'devices';
      const roomDevs = devices.filter(d => d.roomId === room.id);
      gpa.selected = roomDevs.length ? { kind: 'device', id: roomDevs[0].id } : { kind: 'room', id: room.id };
      nwRenderShcfgShell();
    });
    container.appendChild(openBtn);
    return;
  }

  if (sel.kind === 'device') {
    const dev = devices.find(d => d.id === sel.id);
    if (!dev) {
      container.textContent = 'Gerät nicht gefunden.';
      return;
    }

    const head = document.createElement('div');
    head.className = 'nw-config-card__head';
    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = `Gerät: ${dev.alias || dev.id}`;
    head.appendChild(title);

    const del = document.createElement('button');
    del.className = 'nw-config-btn nw-config-btn--danger';
    del.type = 'button';
    del.textContent = 'Löschen';
    del.addEventListener('click', () => {
      if (!confirm(`Gerät „${dev.alias || dev.id}“ wirklich löschen?`)) return;
      const idx = devices.findIndex(d => d.id === dev.id);
      if (idx >= 0) {
        devices.splice(idx, 1);
        nwNormalizeDeviceOrder();
        nwMarkDirty(true);
        // selection fallback
        const roomId = dev.roomId;
        const roomDevs = devices.filter(d => d.roomId === roomId);
        if (roomDevs.length) gpa.selected = { kind: 'device', id: roomDevs[0].id };
        else if (roomId) gpa.selected = { kind: 'room', id: roomId };
        else gpa.selected = rooms.length ? { kind: 'room', id: rooms[0].id } : null;
        nwRenderAll();
      }
    });

    head.appendChild(del);
    container.appendChild(head);

    // Alias
    container.appendChild(
      nwCreateFieldRow('Name', nwShcfgCreateTextInput(dev.alias || '', (v) => {
        dev.alias = v;
        nwMarkDirty(true);
        nwRenderShcfgShell();
      }, { placeholder: 'z.B. Deckenlicht' }))
    );

    // ID
    const idInput = nwShcfgCreateTextInput(dev.id, () => {}, {});
    idInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('ID', idInput));

    // Type (read-only for safety)
    const typeInput = nwShcfgCreateTextInput(dev.type, () => {}, {});
    typeInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('Typ', typeInput));

    // Room
    const roomOptions = [{ value: '', label: '—' }, ...rooms.map(r => ({ value: r.id, label: r.name }))];
    container.appendChild(
      nwCreateFieldRow('Raum', nwShcfgCreateSelect(roomOptions, dev.roomId || '', (v) => {
        dev.roomId = v || null;
        nwMarkDirty(true);
        nwRenderAll();
      }))
    );

    // Function
    const fnOptions = [{ value: '', label: '—' }, ...funcs.map(f => ({ value: f.id, label: f.name }))];
    container.appendChild(
      nwCreateFieldRow('Funktion', nwShcfgCreateSelect(fnOptions, dev.functionId || '', (v) => {
        dev.functionId = v || null;
        nwMarkDirty(true);
        nwRenderShcfgShell();
      }))
    );

    // IO mappings depending on type
    const ioTitle = document.createElement('div');
    ioTitle.className = 'nw-config-card__subtitle';
    ioTitle.style.marginTop = '10px';
    ioTitle.textContent = 'Datenpunkte (ioBroker)';
    container.appendChild(ioTitle);

    dev.io = dev.io || {};
    dev.behavior = dev.behavior || {};

    if (dev.type === 'switch') {
      dev.io.switch = dev.io.switch || { readId: null, writeId: null };
      container.appendChild(nwCreateDpInput('Read DP', dev.io.switch.readId || '', (v) => {
        dev.io.switch.readId = nwShcfgNullIfEmpty(v);
        nwMarkDirty(true);
      }));
      container.appendChild(nwCreateDpInput('Write DP', dev.io.switch.writeId || '', (v) => {
        dev.io.switch.writeId = nwShcfgNullIfEmpty(v);
        nwMarkDirty(true);
      }));
    } else if (dev.type === 'dimmer') {
      dev.io.switch = dev.io.switch || { readId: null, writeId: null };
      dev.io.dimmer = dev.io.dimmer || { levelId: null, min: 0, max: 100, step: 1 };
      container.appendChild(nwCreateDpInput('Schalten (Read)', dev.io.switch.readId || '', (v) => { dev.io.switch.readId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Schalten (Write)', dev.io.switch.writeId || '', (v) => { dev.io.switch.writeId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Dimmer Level DP', dev.io.dimmer.levelId || '', (v) => { dev.io.dimmer.levelId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
    } else if (dev.type === 'color') {
      dev.io.switch = dev.io.switch || { readId: null, writeId: null };
      dev.io.dimmer = dev.io.dimmer || { levelId: null, min: 0, max: 100, step: 1 };
      dev.io.color = dev.io.color || { rgbId: null, mode: 'hex', supportsWarmWhite: false, supportsColdWhite: false, wwId: null, cwId: null };
      container.appendChild(nwCreateDpInput('Schalten (Read)', dev.io.switch.readId || '', (v) => { dev.io.switch.readId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Schalten (Write)', dev.io.switch.writeId || '', (v) => { dev.io.switch.writeId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Dimmer Level DP', dev.io.dimmer.levelId || '', (v) => { dev.io.dimmer.levelId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('RGB DP', dev.io.color.rgbId || '', (v) => { dev.io.color.rgbId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
    } else if (dev.type === 'blind') {
      dev.io.blind = dev.io.blind || { upId: null, downId: null, stopId: null, posId: null, tiltId: null };
      container.appendChild(nwCreateDpInput('Auf (DP)', dev.io.blind.upId || '', (v) => { dev.io.blind.upId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Ab (DP)', dev.io.blind.downId || '', (v) => { dev.io.blind.downId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Stop (DP)', dev.io.blind.stopId || '', (v) => { dev.io.blind.stopId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Position (DP)', dev.io.blind.posId || '', (v) => { dev.io.blind.posId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Lamelle (DP)', dev.io.blind.tiltId || '', (v) => { dev.io.blind.tiltId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
    } else if (dev.type === 'rtr') {
      dev.io.rtr = dev.io.rtr || { tempId: null, setId: null, modeId: null, humidityId: null };
      container.appendChild(nwCreateDpInput('Temperatur (DP)', dev.io.rtr.tempId || '', (v) => { dev.io.rtr.tempId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Sollwert (DP)', dev.io.rtr.setId || '', (v) => { dev.io.rtr.setId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Modus (DP)', dev.io.rtr.modeId || '', (v) => { dev.io.rtr.modeId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Luftfeuchte (DP)', dev.io.rtr.humidityId || '', (v) => { dev.io.rtr.humidityId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
    } else if (dev.type === 'scene') {
      dev.io.scene = dev.io.scene || { triggerId: null, name: '' };
      container.appendChild(nwCreateDpInput('Trigger (DP)', dev.io.scene.triggerId || '', (v) => { dev.io.scene.triggerId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateFieldRow('Szenenname', nwShcfgCreateTextInput(dev.io.scene.name || '', (v) => { dev.io.scene.name = v; nwMarkDirty(true); }))); 
    } else if (dev.type === 'sensor') {
      dev.io.sensor = dev.io.sensor || { readId: null };
      container.appendChild(nwCreateDpInput('Wert (Read DP)', dev.io.sensor.readId || '', (v) => { dev.io.sensor.readId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
    } else if (dev.type === 'player') {
      dev.io.player = dev.io.player || { titleId:null, artistId:null, albumId:null, playingId:null, volumeId:null, muteId:null, nextId:null, prevId:null, playId:null, pauseId:null };
      container.appendChild(nwCreateDpInput('Titel (DP)', dev.io.player.titleId || '', (v) => { dev.io.player.titleId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Artist (DP)', dev.io.player.artistId || '', (v) => { dev.io.player.artistId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Playing (DP)', dev.io.player.playingId || '', (v) => { dev.io.player.playingId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Volume (DP)', dev.io.player.volumeId || '', (v) => { dev.io.player.volumeId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Mute (DP)', dev.io.player.muteId || '', (v) => { dev.io.player.muteId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Next (DP)', dev.io.player.nextId || '', (v) => { dev.io.player.nextId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Prev (DP)', dev.io.player.prevId || '', (v) => { dev.io.player.prevId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Play (DP)', dev.io.player.playId || '', (v) => { dev.io.player.playId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
      container.appendChild(nwCreateDpInput('Pause (DP)', dev.io.player.pauseId || '', (v) => { dev.io.player.pauseId = nwShcfgNullIfEmpty(v); nwMarkDirty(true); }));
    } else if (dev.type === 'camera') {
      dev.io.camera = dev.io.camera || { url: '', refreshMs: 1000 };
      container.appendChild(nwCreateFieldRow('URL', nwShcfgCreateTextInput(dev.io.camera.url || '', (v) => { dev.io.camera.url = v; nwMarkDirty(true); }))); 
      const refresh = document.createElement('input');
      refresh.className = 'nw-config-input';
      refresh.type = 'number';
      refresh.min = '250';
      refresh.step = '250';
      refresh.value = dev.io.camera.refreshMs || 1000;
      refresh.addEventListener('change', () => { dev.io.camera.refreshMs = Number(refresh.value) || 1000; nwMarkDirty(true); });
      container.appendChild(nwCreateFieldRow('Refresh (ms)', refresh));
    } else if (dev.type === 'widget') {
      dev.io.widget = dev.io.widget || { iframeUrl: '', openUrl: '', embed: false, height: 260, label: '' };
      container.appendChild(nwCreateFieldRow('Label', nwShcfgCreateTextInput(dev.io.widget.label || '', (v) => { dev.io.widget.label = v; nwMarkDirty(true); }))); 
      container.appendChild(nwCreateFieldRow('Iframe URL', nwShcfgCreateTextInput(dev.io.widget.iframeUrl || '', (v) => { dev.io.widget.iframeUrl = v; nwMarkDirty(true); }))); 
      container.appendChild(nwCreateFieldRow('Open URL', nwShcfgCreateTextInput(dev.io.widget.openUrl || '', (v) => { dev.io.widget.openUrl = v; nwMarkDirty(true); }))); 
    }

    // Apply changes without full rerender on every dp change; user can press save.
    const note = document.createElement('div');
    note.className = 'nw-config-hint';
    note.style.marginTop = '8px';
    note.textContent = 'Hinweis: Änderungen werden lokal gespeichert. Nutze „Speichern“ oben, um sie dauerhaft zu übernehmen.';
    container.appendChild(note);
    return;
  }
}

/* --- Räume & Funktionen Editor (B7) --- */

function nwSanitizeId(raw) {
  if (raw === null || typeof raw === 'undefined') return '';
  let s = String(raw).trim().toLowerCase();
  const map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
  s = s.replace(/[äöüß]/g, ch => map[ch] || ch);
  s = s.replace(/\s+/g, '-');
  s = s.replace(/[^a-z0-9_-]/g, '');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^[-_]+|[-_]+$/g, '');
  return s;
}

function nwEnsureUniqueId(items, desiredId, skipItem) {
  const list = Array.isArray(items) ? items : [];
  const exists = (candidate) => list.some(it => it && it.id === candidate && it !== skipItem);

  let base = nwSanitizeId(desiredId);
  if (!base) base = 'id';
  let out = base;

  let n = 2;
  while (!out || exists(out)) {
    out = base + '-' + n;
    n += 1;
  }
  return out;
}

function nwNormalizeRoomFunctionOrder() {
  if (!nwShcState.config) return;

  const normalize = (arr, labelFn) => {
    const source = Array.isArray(arr) ? arr.slice() : [];
    const withIdx = source.map((it, idx) => ({ it, idx }));
    withIdx.sort((a, b) => {
      const ao = (a.it && typeof a.it.order === 'number') ? a.it.order : 999999;
      const bo = (b.it && typeof b.it.order === 'number') ? b.it.order : 999999;
      if (ao !== bo) return ao - bo;
      const al = labelFn(a.it) || '';
      const bl = labelFn(b.it) || '';
      if (al !== bl) return al.localeCompare(bl);
      return a.idx - b.idx;
    });

    const out = withIdx.map(x => x.it);
    out.forEach((it, i) => {
      if (it) it.order = i + 1;
    });
    return out;
  };

  nwShcState.config.rooms = normalize(nwShcState.config.rooms, nwGetRoomLabel);
  nwShcState.config.functions = normalize(nwShcState.config.functions, nwGetFunctionLabel);
}

function nwMoveItem(arr, index, dir) {
  if (!Array.isArray(arr)) return;
  const to = index + dir;
  if (to < 0 || to >= arr.length) return;
  const item = arr.splice(index, 1)[0];
  arr.splice(to, 0, item);
  arr.forEach((it, i) => {
    if (it) it.order = i + 1;
  });
}

function nwMoveItemTo(arr, fromIndex, toIndex) {
  if (!Array.isArray(arr)) return;
  const len = arr.length;
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
  let from = Math.trunc(fromIndex);
  let to = Math.trunc(toIndex);
  if (from < 0 || from >= len) return;
  if (to < 0) to = 0;
  if (to >= len) to = len - 1;
  if (from === to) return;

  const item = arr.splice(from, 1)[0];
  // If moved downwards, the target index shifts after removal.
  if (from < to) to -= 1;
  arr.splice(to, 0, item);
  arr.forEach((it, i) => {
    if (it) it.order = i + 1;
  });
}

function nwReplaceRoomIdInDevices(oldId, newId) {
  if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
  nwShcState.config.devices.forEach(d => {
    if (d && d.roomId === oldId) d.roomId = newId;
  });
}

function nwReplaceFunctionIdInDevices(oldId, newId) {
  if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
  nwShcState.config.devices.forEach(d => {
    if (d && d.functionId === oldId) d.functionId = newId;
  });
}

function nwAddRoom() {
  if (!nwShcState.config) return;
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const desiredId = nwEnsureUniqueId(rooms, 'raum', null);
  const room = { id: desiredId, name: 'Neuer Raum', order: rooms.length + 1 };
  rooms.push(room);
  nwShcState.config.rooms = rooms;
  nwMarkDirty(true);
  nwRenderAll();
}

function nwAddFunction() {
  if (!nwShcState.config) return;
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];
  const desiredId = nwEnsureUniqueId(funcs, 'funktion', null);
  const fn = { id: desiredId, name: 'Neue Funktion', order: funcs.length + 1 };
  funcs.push(fn);
  nwShcState.config.functions = funcs;
  nwMarkDirty(true);
  nwRenderAll();
}

function nwRenderRoomsEditor(rooms) {
  const list = document.getElementById('nw-config-rooms');
  const empty = document.getElementById('nw-config-rooms-empty');
  if (!list || !empty) return;

  if (!nwShcState.config) return;

  const arr = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];

  list.innerHTML = '';

  if (!arr.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  arr.forEach((room, idx) => {
    if (!room) return;

    const row = document.createElement('div');
    row.className = 'nw-config-row';
    // used by validator focus/highlight
    row.dataset.nwEntity = 'room';
    row.dataset.nwIndex = String(idx);
    row.dataset.nwId = (room.id || '');

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'nw-config-input';
    idInput.value = room.id || '';
    idInput.placeholder = 'id (z.B. wohnzimmer)';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'nw-config-input';
    nameInput.value = room.name || '';
    nameInput.placeholder = 'Name (z.B. Wohnzimmer)';

    const actions = document.createElement('div');
    actions.className = 'nw-config-row__actions';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'nw-config-mini-btn';
    btnUp.textContent = '↑';
    btnUp.disabled = idx === 0;

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'nw-config-mini-btn';
    btnDown.textContent = '↓';
    btnDown.disabled = idx === arr.length - 1;

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'nw-config-mini-btn';
    btnDel.textContent = '✕';

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDel);

    idInput.addEventListener('blur', () => {
      const oldId = room.id || '';
      const desired = nwSanitizeId(idInput.value);
      if (!desired) {
        idInput.value = oldId;
        return;
      }
      const unique = nwEnsureUniqueId(arr, desired, room);
      if (unique !== desired) {
        nwSetStatus('Raum-ID existiert bereits. Bitte eine eindeutige ID vergeben.', 'error');
        idInput.value = oldId;
        return;
      }
      if (oldId !== desired) {
        room.id = desired;
        nwReplaceRoomIdInDevices(oldId, desired);
        nwMarkDirty(true);
        nwRenderAll();
      }
    });

    nameInput.addEventListener('input', () => {
      room.name = nameInput.value;
      nwMarkDirty(true);
    });

    btnUp.addEventListener('click', () => {
      nwMoveItem(arr, idx, -1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDown.addEventListener('click', () => {
      nwMoveItem(arr, idx, +1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDel.addEventListener('click', () => {
      const label = (room.name || room.id || 'Raum');
      if (!confirm('Raum „' + label + '“ löschen? Zugewiesene Geräte verlieren die Raumzuordnung.')) return;
      const oldId = room.id;
      arr.splice(idx, 1);
      arr.forEach((it, i) => { if (it) it.order = i + 1; });
      if (oldId) {
        nwReplaceRoomIdInDevices(oldId, null);
      }
      nwMarkDirty(true);
      nwRenderAll();
    });

    row.appendChild(idInput);
    row.appendChild(nameInput);
    row.appendChild(actions);

    list.appendChild(row);
  });
}

function nwRenderFunctionsEditor(functions) {
  const list = document.getElementById('nw-config-functions');
  const empty = document.getElementById('nw-config-functions-empty');
  if (!list || !empty) return;

  if (!nwShcState.config) return;

  const arr = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  list.innerHTML = '';

  if (!arr.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  arr.forEach((fn, idx) => {
    if (!fn) return;

    const row = document.createElement('div');
    row.className = 'nw-config-row';
    // used by validator focus/highlight
    row.dataset.nwEntity = 'function';
    row.dataset.nwIndex = String(idx);
    row.dataset.nwId = (fn.id || '');

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'nw-config-input';
    idInput.value = fn.id || '';
    idInput.placeholder = 'id (z.B. licht)';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'nw-config-input';
    nameInput.value = fn.name || '';
    nameInput.placeholder = 'Name (z.B. Licht)';

    const actions = document.createElement('div');
    actions.className = 'nw-config-row__actions';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'nw-config-mini-btn';
    btnUp.textContent = '↑';
    btnUp.disabled = idx === 0;

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'nw-config-mini-btn';
    btnDown.textContent = '↓';
    btnDown.disabled = idx === arr.length - 1;

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'nw-config-mini-btn';
    btnDel.textContent = '✕';

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDel);

    idInput.addEventListener('blur', () => {
      const oldId = fn.id || '';
      const desired = nwSanitizeId(idInput.value);
      if (!desired) {
        idInput.value = oldId;
        return;
      }
      const unique = nwEnsureUniqueId(arr, desired, fn);
      if (unique !== desired) {
        nwSetStatus('Funktions-ID existiert bereits. Bitte eine eindeutige ID vergeben.', 'error');
        idInput.value = oldId;
        return;
      }
      if (oldId !== desired) {
        fn.id = desired;
        nwReplaceFunctionIdInDevices(oldId, desired);
        nwMarkDirty(true);
        nwRenderAll();
      }
    });

    nameInput.addEventListener('input', () => {
      fn.name = nameInput.value;
      nwMarkDirty(true);
    });

    btnUp.addEventListener('click', () => {
      nwMoveItem(arr, idx, -1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDown.addEventListener('click', () => {
      nwMoveItem(arr, idx, +1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDel.addEventListener('click', () => {
      const label = (fn.name || fn.id || 'Funktion');
      if (!confirm('Funktion „' + label + '“ löschen? Zugewiesene Geräte verlieren die Funktionszuordnung.')) return;
      const oldId = fn.id;
      arr.splice(idx, 1);
      arr.forEach((it, i) => { if (it) it.order = i + 1; });
      if (oldId) {
        nwReplaceFunctionIdInDevices(oldId, null);
      }
      nwMarkDirty(true);
      nwRenderAll();
    });

    row.appendChild(idInput);
    row.appendChild(nameInput);
    row.appendChild(actions);

    list.appendChild(row);
  });
}




/* --- Geräte/Kacheln Verwaltung (B8) --- */

function nwNormalizeDeviceOrder() {
  if (!nwShcState.config) return;
  const arr = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  arr.forEach((d, i) => {
    if (d) d.order = i + 1;
  });
}

function nwEnsureUniqueDeviceId(devices, desiredId) {
  const list = Array.isArray(devices) ? devices : [];
  let base = (desiredId === null || typeof desiredId === 'undefined') ? '' : String(desiredId);
  base = base.trim();
  if (!base) base = 'geraet';
  let out = base;
  let n = 2;
  while (list.some(d => d && d.id === out)) {
    out = base + '-' + n;
    n += 1;
  }
  return out;
}

function nwAddDevice() {
  if (!nwShcState.config) return;
  const devices = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  const id = nwEnsureUniqueDeviceId(devices, 'geraet');
  const roomId = rooms.length ? (rooms[0] && rooms[0].id) : null;
  const functionId = funcs.length ? (funcs[0] && funcs[0].id) : null;

  const dev = {
    id,
    alias: 'Neues Gerät',
    type: 'switch',
    roomId: roomId || null,
    functionId: functionId || null,
    icon: '',
    size: 'm',
    behavior: { favorite: false, readOnly: false },
    io: { switch: { readId: null, writeId: null } },
  };

  devices.push(dev);
  nwShcState.config.devices = devices;
  nwNormalizeDeviceOrder();
  nwMarkDirty(true);
  nwRenderAll();
}


// Quick templates (installer speed): create a pre-filled device skeleton so the
// installer only needs to pick the datapoints.
function nwAddDeviceFromTemplate(templateType, opts = {}) {
  if (!nwShcState.config) return;

  const t = String(templateType || '').trim();
  if (!t) {
    nwSetStatus('Bitte zuerst eine Vorlage auswählen.', 'error');
    return;
  }

  const devices = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  const roomId = (opts && typeof opts.roomId === 'string') ? opts.roomId : (rooms.length ? (rooms[0] && rooms[0].id) : null);
  const functionId = (opts && typeof opts.functionId === 'string') ? opts.functionId : (funcs.length ? (funcs[0] && funcs[0].id) : null);

  const baseIdMap = {
    switch: 'schalter',
    color: 'farblicht',
    dimmer: 'dimmer',
    blind: 'jalousie',
    rtr: 'heizung',
    player: 'player',
    sensor: 'sensor',
    scene: 'szene',
    camera: 'kamera',
    widget: 'widget',
  };
  const aliasMap = {
    switch: 'Neuer Schalter',
    color: 'Neues Farb‑Licht',
    dimmer: 'Neuer Dimmer',
    blind: 'Neue Jalousie',
    rtr: 'Neue Heizung',
    player: 'Audio-Player',
    sensor: 'Neuer Sensor',
    scene: 'Neue Szene',
    camera: 'Neue Kamera',
    widget: 'Neues Widget',
  };
  const iconMap = {
    switch: 'bulb',
    color: 'bulb',
    dimmer: 'bulb',
    blind: 'blinds',
    rtr: 'thermostat',
    player: 'speaker',
    sensor: 'thermometer',
    scene: 'scene',
    camera: 'camera',
    widget: 'grid',
  };

  const id = nwEnsureUniqueDeviceId(devices, baseIdMap[t] || 'geraet');

  const dev = {
    id,
    alias: aliasMap[t] || 'Neues Gerät',
    type: t,
    roomId: roomId || null,
    functionId: functionId || null,
    icon: iconMap[t] || '',
    size: (t === 'rtr' || t === 'camera' || t === 'widget') ? 'xl' : ((t === 'player') ? 'l' : 'm'),
    behavior: { favorite: false, readOnly: false },
    io: {},
  };

  // IO skeletons by type
  if (t === 'switch') {
    dev.io.switch = { readId: null, writeId: null };
  } else if (t === 'scene') {
    dev.io.switch = { readId: null, writeId: null };
  } else if (t === 'color') {
    // Farb‑Licht: optionaler Schalter + Farb‑DP
    dev.io.switch = { readId: null, writeId: null };
    dev.io.color = { readId: null, writeId: null, format: 'hex' };
  } else if (t === 'dimmer') {
    dev.io.level = { readId: null, writeId: null, min: 0, max: 100 };
  } else if (t === 'blind') {
    dev.io.level = { readId: null, writeId: null, min: 0, max: 100 };
    dev.io.cover = { upId: null, downId: null, stopId: null };
  } else if (t === 'rtr') {
    dev.io.climate = {
      currentTempId: null,
      setpointId: null,
      modeId: null,
      humidityId: null,
      minSetpoint: 15,
      maxSetpoint: 30,
    };
  } else if (t === 'player') {
    dev.io.player = {
      playingId: null,
      titleId: null,
      artistId: null,
      sourceId: null,
      coverId: null,
      volumeReadId: null,
      volumeWriteId: null,
      volumeMin: 0,
      volumeMax: 100,
      toggleId: null,
      playId: null,
      pauseId: null,
      stopId: null,
      nextId: null,
      prevId: null,
      stationId: null,
      playlistId: null,
    };
    dev.stations = [];
    dev.playlists = [];
  } else if (t === 'camera') {
    dev.io.camera = {
      snapshotUrl: '',
      liveUrl: '',
      refreshSec: 5,
    };
    dev.behavior.readOnly = true;
  } else if (t === 'widget') {
    dev.io.widget = {
      kind: 'iframe',
      url: '',
      openUrl: '',
      embed: false,
      height: 260,
      label: '',
    };
    dev.behavior.readOnly = true;
  } else if (t === 'sensor') {
    dev.io.sensor = { readId: null };
    // Sensoren sind in der Regel reine Anzeige (optional anpassbar)
    dev.behavior.readOnly = true;
  } else {
    // Fallback: switch
    dev.type = 'switch';
    dev.io.switch = { readId: null, writeId: null };
  }

  devices.push(dev);
  nwShcState.config.devices = devices;
  nwNormalizeDeviceOrder();
  nwMarkDirty(true);
  nwRenderAll();

  // Reset template selector (UX)
  if (!opts || !opts.silent) {
    const sel = document.getElementById('nw-config-template-select');
    if (sel) sel.value = '';
  }

  return dev;
}

function nwCreateFieldRow(labelText, controlElem) {
  const row = document.createElement('div');
  row.className = 'nw-config-card__row nw-config-field-row';

  const label = document.createElement('div');
  label.className = 'nw-config-field-label';
  label.textContent = labelText;

  const ctlWrap = document.createElement('div');
  ctlWrap.className = 'nw-config-field-control';
  ctlWrap.appendChild(controlElem);

  row.appendChild(label);
  row.appendChild(ctlWrap);
  return row;
}


/* --- DP-Test (Installer) --- */

function nwDpFormatValueShort(val) {
  try {
    if (typeof val === 'undefined') return '—';
    if (val === null) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) return String(val);
      // keep it compact: 0.00–99.99 => 2 decimals, otherwise round
      if (Math.abs(val) < 100) return (Math.round(val * 100) / 100).toString();
      return Math.round(val).toString();
    }
    if (typeof val === 'object') {
      const s = JSON.stringify(val);
      return s.length > 22 ? (s.slice(0, 21) + '…') : s;
    }
    const s = String(val);
    return s.length > 22 ? (s.slice(0, 21) + '…') : s;
  } catch (_e) {
    return String(val);
  }
}

async function nwDpGetState(dpId) {
  const id = String(dpId || '').trim();
  if (!id) return { ok: false, error: 'missing id' };
  try {
    const res = await fetch('/api/smarthome/dpget?id=' + encodeURIComponent(id), { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: 'http_' + res.status };
    return await res.json().catch(() => ({ ok: false, error: 'invalid json' }));
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

async function nwDpSetState(dpId, val) {
  const id = String(dpId || '').trim();
  if (!id) return { ok: false, error: 'missing id' };
  try {
    const res = await fetch('/api/smarthome/dpset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, val }),
    });
    if (!res.ok) return { ok: false, error: 'http_' + res.status };
    return await res.json().catch(() => ({ ok: false, error: 'invalid json' }));
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function nwCreateDpInput(labelText, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nw-config-dp-input-wrapper';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nw-config-input nw-config-dp-input';
  input.value = value || '';
  input.addEventListener('change', () => {
    onChange(input.value.trim());
  });
  input.addEventListener('input', () => {
    nwMarkDirty(true);
  });

  const btnPick = document.createElement('button');
  btnPick.type = 'button';
  btnPick.className = 'nw-config-dp-button';
  btnPick.textContent = '…';
  btnPick.title = 'Datenpunkt auswählen';
  btnPick.addEventListener('click', () => {
    nwOpenDatapointDialog({
      title: labelText,
      initial: input.value,
      onSelect: (id) => {
        input.value = id || '';
        onChange(input.value.trim());
        nwMarkDirty(true);
      },
    });
  });

  const badge = document.createElement('span');
  badge.className = 'nw-config-badge nw-config-badge--idle';
  badge.textContent = '—';

  const setBadge = (kind, text) => {
    badge.classList.remove('nw-config-badge--ok', 'nw-config-badge--warn', 'nw-config-badge--error', 'nw-config-badge--idle');
    badge.classList.add('nw-config-badge--' + (kind || 'idle'));
    badge.textContent = text || '';
  };

  const btnTest = document.createElement('button');
  btnTest.type = 'button';
  btnTest.className = 'nw-config-dp-button';
  btnTest.textContent = 'Lesen';
  btnTest.title = 'Datenpunkt lesen (Installer)';

  btnTest.addEventListener('click', async () => {
    const id = input.value.trim();
    if (!id) {
      setBadge('warn', 'kein DP');
      return;
    }
    setBadge('idle', 'Lese…');
    const data = await nwDpGetState(id);
    if (!data || !data.ok) {
      setBadge('error', 'Fehler');
      return;
    }
    const st = data.state;
    if (!st) {
      setBadge('warn', 'kein State');
      return;
    }
    const txt = nwDpFormatValueShort(st.val) + (st.ack ? ' ack' : '');
    setBadge('ok', txt);
  });

  const labelLower = String(labelText || '').toLowerCase();
  const allowWrite = (
    labelLower.includes('writeid') ||
    labelLower.includes('setpointid') ||
    labelLower.includes('upid') ||
    labelLower.includes('downid') ||
    labelLower.includes('stopid') ||
    labelLower.includes('modeid') ||
    labelLower.includes('playid') ||
    labelLower.includes('pauseid') ||
    labelLower.includes('toggleid') ||
    labelLower.includes('nextid') ||
    labelLower.includes('previd') ||
    labelLower.includes('stationid')
  );

  let btnSet = null;
  if (allowWrite) {
    btnSet = document.createElement('button');
    btnSet.type = 'button';
    btnSet.className = 'nw-config-dp-button';
    btnSet.textContent = 'Schreiben';
    btnSet.title = 'Datenpunkt schreiben (Installer)';

    btnSet.addEventListener('click', async () => {
      const id = input.value.trim();
      if (!id) {
        setBadge('warn', 'kein DP');
        return;
      }

      let val;
      // Cover commands are usually trigger-like booleans
      if (labelLower.includes('upid') || labelLower.includes('downid') || labelLower.includes('stopid')) {
        const ok = confirm('Befehl an ' + id + ' senden?\n\nWert: true');
        if (!ok) return;
        val = true;
      } else {
        const raw = prompt('Wert für ' + id + ' setzen:', '');
        if (raw === null) return;
        const t = String(raw).trim();
        if (t.toLowerCase() === 'true') val = true;
        else if (t.toLowerCase() === 'false') val = false;
        else {
          const num = parseFloat(t.replace(',', '.'));
          if (Number.isFinite(num) && t !== '') val = num;
          else val = t;
        }

        const ok = confirm('DP setzen?\n\n' + id + ' = ' + String(val));
        if (!ok) return;
      }

      setBadge('idle', 'Schreibe…');
      const wr = await nwDpSetState(id, val);
      if (!wr || !wr.ok) {
        setBadge('error', 'Fehler');
        return;
      }
      // re-read to show result (best-effort)
      const data = await nwDpGetState(id);
      if (data && data.ok && data.state) {
        const st = data.state;
        const txt = nwDpFormatValueShort(st.val) + (st.ack ? ' ack' : '');
        setBadge('ok', txt);
      } else {
        setBadge('ok', 'gesetzt');
      }
    });
  }

  wrapper.appendChild(input);
  wrapper.appendChild(btnPick);
  wrapper.appendChild(btnTest);
  if (btnSet) wrapper.appendChild(btnSet);
  wrapper.appendChild(badge);

  return nwCreateFieldRow(labelText, wrapper);
}
function nwRenderDevicesEditor(devices, rooms, functions) {
  const grid = document.getElementById('nw-config-devices');
  const empty = document.getElementById('nw-config-devices-empty');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!devices || !devices.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const roomMap = {};
  rooms.forEach(r => {
    if (r && r.id) roomMap[r.id] = r;
  });
  const fnMap = {};
  functions.forEach(f => {
    if (f && f.id) fnMap[f.id] = f;
  });

  devices.forEach((dev, index) => {
    const card = document.createElement('div');
    card.className = 'nw-config-card';
    card.dataset.nwEntity = 'device';
    card.dataset.nwIndex = String(index);
    card.dataset.nwId = (dev && dev.id) ? String(dev.id) : '';

    const header = document.createElement('div');
    header.className = 'nw-config-card__header';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = dev.alias || dev.id || 'Gerät';

    const headerTop = document.createElement('div');
    headerTop.className = 'nw-config-card__header-top';

    const actions = document.createElement('div');
    actions.className = 'nw-config-card__header-actions';

    // Drag handle (Drag&Drop ordering)
    const btnDrag = document.createElement('button');
    btnDrag.type = 'button';
    btnDrag.className = 'nw-config-mini-btn nw-config-drag-handle';
    btnDrag.textContent = '⠿';
    btnDrag.title = 'Reihenfolge ändern (Drag&Drop)';
    btnDrag.setAttribute('draggable', 'true');

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'nw-config-mini-btn';
    btnUp.textContent = '↑';
    btnUp.disabled = index === 0;

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'nw-config-mini-btn';
    btnDown.textContent = '↓';
    btnDown.disabled = index === devices.length - 1;

    const btnDup = document.createElement('button');
    btnDup.type = 'button';
    btnDup.className = 'nw-config-mini-btn';
    btnDup.textContent = '⧉';
    btnDup.title = 'Duplizieren';

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'nw-config-mini-btn';
    btnDel.textContent = '✕';
    btnDel.title = 'Löschen';

    btnUp.addEventListener('click', () => {
      nwMoveItem(nwShcState.config.devices, index, -1);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDown.addEventListener('click', () => {
      nwMoveItem(nwShcState.config.devices, index, +1);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDup.addEventListener('click', () => {
      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      const src = nwShcState.config.devices[index];
      const clone = JSON.parse(JSON.stringify(src || {}));
      const baseId = (clone && clone.id) ? (String(clone.id) + '-copy') : 'geraet-copy';
      clone.id = nwEnsureUniqueDeviceId(nwShcState.config.devices, baseId);
      if (clone.alias) clone.alias = String(clone.alias) + ' (Kopie)';
      nwShcState.config.devices.splice(index + 1, 0, clone);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    btnDel.addEventListener('click', () => {
      const label = dev.alias || dev.id || 'Gerät';
      if (!confirm('Gerät „' + label + '“ löschen?')) return;
      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      nwShcState.config.devices.splice(index, 1);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Drag&Drop: start drag from handle, drop on cards
    btnDrag.addEventListener('dragstart', (ev) => {
      nwDragDeviceFromIndex = index;
      try {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(index));
      } catch (_e) {}
      card.classList.add('nw-drag-src');
    });

    btnDrag.addEventListener('dragend', () => {
      nwDragDeviceFromIndex = null;
      card.classList.remove('nw-drag-src');
      // cleanup potential hover states
      document.querySelectorAll('.nw-drag-over').forEach(el => el.classList.remove('nw-drag-over'));
    });

    card.addEventListener('dragover', (ev) => {
      // allow drop
      ev.preventDefault();
      card.classList.add('nw-drag-over');
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('nw-drag-over');
    });
    card.addEventListener('drop', (ev) => {
      ev.preventDefault();
      card.classList.remove('nw-drag-over');

      // Determine source index
      let from = (typeof nwDragDeviceFromIndex === 'number') ? nwDragDeviceFromIndex : null;
      if (from === null) {
        try {
          const raw = ev.dataTransfer.getData('text/plain');
          const n = parseInt(String(raw || ''), 10);
          if (Number.isFinite(n)) from = n;
        } catch (_e) {}
      }
      const to = index;
      if (from === null || !Number.isFinite(from)) return;
      if (from === to) return;

      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      nwMoveItemTo(nwShcState.config.devices, from, to);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    actions.appendChild(btnDrag);
    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDup);
    actions.appendChild(btnDel);

    headerTop.appendChild(title);
    headerTop.appendChild(actions);

    const subtitle = document.createElement('div');
    subtitle.className = 'nw-config-card__subtitle';
    const room = roomMap[dev.roomId];
    const fn = fnMap[dev.functionId];
    const roomLabel = room ? nwGetRoomLabel(room) : (dev.roomId || 'Raum?');
    const fnLabel = fn ? nwGetFunctionLabel(fn) : (dev.functionId || 'Funktion?');
    const typeLabel = nwGetTypeLabel(dev.type);
    subtitle.textContent = roomLabel + ' · ' + fnLabel + ' · ' + typeLabel;

    header.appendChild(headerTop);
    header.appendChild(subtitle);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'nw-config-card__body';

    // ID (read-only)
    const idRow = document.createElement('div');
    idRow.className = 'nw-config-card__row';
    idRow.textContent = 'ID: ' + (dev.id || '(ohne ID)');
    body.appendChild(idRow);

    // Reihenfolge (Sortier-Index) – moves the card to the desired position
    const orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.className = 'nw-config-input';
    orderInput.min = '1';
    orderInput.max = String(devices.length);
    orderInput.step = '1';
    orderInput.value = String((typeof dev.order === 'number') ? dev.order : (index + 1));
    orderInput.addEventListener('change', () => {
      const raw = parseInt(String(orderInput.value || ''), 10);
      if (!Number.isFinite(raw)) {
        orderInput.value = String(index + 1);
        return;
      }
      const targetPos = Math.max(1, Math.min(devices.length, raw));
      const toIdx = targetPos - 1;
      if (toIdx === index) return;
      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      nwMoveItemTo(nwShcState.config.devices, index, toIdx);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });
    body.appendChild(nwCreateFieldRow('Reihenfolge', orderInput));

    // Alias
    const aliasInput = document.createElement('input');
    aliasInput.type = 'text';
    aliasInput.className = 'nw-config-input';
    aliasInput.value = dev.alias || '';
    aliasInput.addEventListener('input', () => {
      nwShcState.config.devices[index].alias = aliasInput.value;
      title.textContent = aliasInput.value || dev.id || 'Gerät';
      nwMarkDirty(true);
    });
    body.appendChild(nwCreateFieldRow('Alias', aliasInput));

    // Typ
    const typeSelect = document.createElement('select');
    typeSelect.className = 'nw-config-select';
    const typeOptions = [
      { value: '', label: '(kein Typ)' },
      { value: 'switch', label: 'Schalter' },
      { value: 'color', label: 'Farb‑Licht (RGB)' },
      { value: 'dimmer', label: 'Dimmer' },
      { value: 'blind', label: 'Jalousie / Rollladen' },
      { value: 'rtr', label: 'Heizung (RTR)' },
      { value: 'player', label: 'Audio-Player' },
      { value: 'camera', label: 'Kamera' },
      { value: 'widget', label: 'Widget (Universal)' },
      { value: 'sensor', label: 'Sensor' },
      { value: 'scene', label: 'Szene' },
      { value: 'logicStatus', label: 'Logik-Status' },
    ];
    typeOptions.forEach(optDef => {
      const opt = document.createElement('option');
      opt.value = optDef.value;
      opt.textContent = optDef.label;
      if ((dev.type || '') === optDef.value) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', () => {
      const t = typeSelect.value || null;
      const d = nwShcState.config.devices[index];
      d.type = t;
      d.io = d.io || {};
      // Beim Typwechsel passende IO-Struktur anlegen (damit Felder sofort erscheinen)
      if (t === 'switch' || t === 'scene' || t === 'logicStatus') {
        d.io.switch = d.io.switch || { readId: null, writeId: null };
      } else if (t === 'color') {
        d.io.switch = d.io.switch || { readId: null, writeId: null };
        d.io.color = d.io.color || { readId: null, writeId: null, format: 'hex' };
      } else if (t === 'dimmer') {
        d.io.level = d.io.level || { readId: null, writeId: null, min: 0, max: 100 };
      } else if (t === 'blind') {
        d.io.cover = d.io.cover || { readId: null, upId: null, downId: null, stopId: null, min: 0, max: 100 };
      } else if (t === 'rtr') {
        d.io.climate = d.io.climate || { currentTempId: null, setpointId: null, modeId: null, humidityId: null, minSetpoint: 15, maxSetpoint: 30 };
      } else if (t === 'camera') {
        d.io.camera = d.io.camera || { snapshotUrl: '', liveUrl: '', refreshSec: 5 };
        d.behavior = d.behavior || {};
        d.behavior.readOnly = true;
      } else if (t === 'widget') {
        d.io.widget = d.io.widget || { kind: 'iframe', url: '', openUrl: '', embed: false, height: 260, label: '' };
        d.behavior = d.behavior || {};
        d.behavior.readOnly = true;
      } else if (t === 'sensor') {
        d.io.sensor = d.io.sensor || { readId: null };
      } else if (t === 'player') {
        d.io.player = d.io.player || {
          playingId: null,
          titleId: null,
          artistId: null,
          sourceId: null,
          coverId: null,
          volumeReadId: null,
          volumeWriteId: null,
          volumeMin: 0,
          volumeMax: 100,
          toggleId: null,
          playId: null,
          pauseId: null,
          stopId: null,
          nextId: null,
          prevId: null,
          stationId: null,
          playlistId: null,
        };
        d.stations = Array.isArray(d.stations) ? d.stations : [];
        d.playlists = Array.isArray(d.playlists) ? d.playlists : [];
      }
      nwMarkDirty(true);
      nwRenderAll(); // Neu rendern, damit IO-Zeilen ggf. angepasst werden
    });
    body.appendChild(nwCreateFieldRow('Typ', typeSelect));

    // Raum
    const roomSelect = document.createElement('select');
    roomSelect.className = 'nw-config-select';
    const roomOptNone = document.createElement('option');
    roomOptNone.value = '';
    roomOptNone.textContent = '(kein Raum)';
    roomSelect.appendChild(roomOptNone);
    rooms
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id || '';
        opt.textContent = nwGetRoomLabel(r) || r.id || '(ohne ID)';
        if (dev.roomId && dev.roomId === opt.value) opt.selected = true;
        roomSelect.appendChild(opt);
      });
    roomSelect.addEventListener('change', () => {
      const val = roomSelect.value || null;
      nwShcState.config.devices[index].roomId = val;
      nwMarkDirty(true);
      nwRenderAll();
    });
    body.appendChild(nwCreateFieldRow('Raum', roomSelect));

    // Funktion
    const fnSelect = document.createElement('select');
    fnSelect.className = 'nw-config-select';
    const fnOptNone = document.createElement('option');
    fnOptNone.value = '';
    fnOptNone.textContent = '(keine Funktion)';
    fnSelect.appendChild(fnOptNone);
    functions
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id || '';
        opt.textContent = nwGetFunctionLabel(f) || f.id || '(ohne ID)';
        if (dev.functionId && dev.functionId === opt.value) opt.selected = true;
        fnSelect.appendChild(opt);
      });
    fnSelect.addEventListener('change', () => {
      const val = fnSelect.value || null;
      nwShcState.config.devices[index].functionId = val;
      nwMarkDirty(true);
      nwRenderAll();
    });
    body.appendChild(nwCreateFieldRow('Funktion', fnSelect));

    // Kachelgröße (Layout)
    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'nw-config-select';
    const sizeOptions = [
      { value: 's', label: 'S (klein)' },
      { value: 'm', label: 'M (normal)' },
      { value: 'l', label: 'L (breit)' },
      { value: 'xl', label: 'XL (groß)' },
    ];
    sizeOptions.forEach(def => {
      const opt = document.createElement('option');
      opt.value = def.value;
      opt.textContent = def.label;
      if ((dev.size || 'm') === def.value) opt.selected = true;
      sizeSelect.appendChild(opt);
    });
    sizeSelect.addEventListener('change', () => {
      nwShcState.config.devices[index].size = sizeSelect.value || 'm';
      nwMarkDirty(true);
    });
    body.appendChild(nwCreateFieldRow('Kachelgröße', sizeSelect));

    // Icon (Dropdown + Vorschau, optional benutzerdefiniert)
    const iconSelect = document.createElement('select');
    iconSelect.className = 'nw-config-select';

    const iconOptions = [
      { value: '', label: '(leer / automatisch)' },
      { value: 'bulb', label: '💡 Licht (bulb)' },
      { value: 'plug', label: '🔌 Steckdose (plug)' },
      { value: 'fire', label: '🔥 Kamin (fire)' },
      { value: 'thermostat', label: '🌡️ Heizung (thermostat)' },
      { value: 'thermometer', label: '🌡️ Temperatur (thermometer)' },
      { value: 'blinds', label: '🪟 Jalousie (blinds)' },
      { value: 'tv', label: '📺 Fernseher (tv)' },
      { value: 'speaker', label: '🔊 Audio (speaker)' },
      { value: 'camera', label: '📷 Kamera (camera)' },
      { value: 'grid', label: '🧩 Widget (grid)' },
      { value: 'scene', label: '✨ Szene (scene)' },
      { value: 'sensor', label: '📍 Sensor (sensor)' },
      { value: 'generic', label: '⬜ Allgemein (generic)' },
      { value: '__custom__', label: 'Benutzerdefiniert…' },
    ];

    iconOptions.forEach(def => {
      const opt = document.createElement('option');
      opt.value = def.value;
      opt.textContent = def.label;
      iconSelect.appendChild(opt);
    });

    const iconCustomInput = document.createElement('input');
    iconCustomInput.type = 'text';
    iconCustomInput.className = 'nw-config-input';
    iconCustomInput.placeholder = 'Benutzerdefiniert: Icon-Name (z. B. bulb) oder Emoji';
    iconCustomInput.autocomplete = 'off';
    iconCustomInput.style.display = 'none';

    const iconPreview = document.createElement('div');
    iconPreview.className = 'nw-config-icon-preview';

    const setCustomVisible = (on) => {
      iconCustomInput.style.display = on ? 'block' : 'none';
    };

    const syncIconUi = () => {
      const raw = String((nwShcState.config.devices[index] && nwShcState.config.devices[index].icon) || '').trim();
      const key = nwShcNormalizeIconName(raw);
      const known = !!(key && iconOptions.some(o => o.value === key && o.value !== '__custom__'));

      if (!raw) {
        iconSelect.value = '';
        iconCustomInput.value = '';
        setCustomVisible(false);
      } else if (known) {
        iconSelect.value = key;
        iconCustomInput.value = raw;
        setCustomVisible(false);
      } else {
        iconSelect.value = '__custom__';
        iconCustomInput.value = raw;
        setCustomVisible(true);
      }

      nwShcRenderIconPreview(iconPreview, raw);
    };

    iconSelect.addEventListener('change', () => {
      const val = String(iconSelect.value || '');
      if (val === '__custom__') {
        setCustomVisible(true);
        const raw = String((nwShcState.config.devices[index] && nwShcState.config.devices[index].icon) || '').trim();
        iconCustomInput.value = raw;
        nwShcState.config.devices[index].icon = raw || null;
      } else {
        setCustomVisible(false);
        iconCustomInput.value = val;
        nwShcState.config.devices[index].icon = val || null;
      }
      nwMarkDirty(true);
      syncIconUi();
    });

    iconCustomInput.addEventListener('input', () => {
      const v = String(iconCustomInput.value || '').trim();
      nwShcState.config.devices[index].icon = v || null;
      nwMarkDirty(true);
      syncIconUi();
    });

    // Initial
    syncIconUi();

    const iconWrap = document.createElement('div');
    iconWrap.className = 'nw-config-icon-row';

    const iconTop = document.createElement('div');
    iconTop.className = 'nw-config-icon-row__top';
    iconTop.appendChild(iconSelect);
    iconTop.appendChild(iconPreview);

    iconWrap.appendChild(iconTop);
    iconWrap.appendChild(iconCustomInput);

    body.appendChild(nwCreateFieldRow('Icon', iconWrap));

    // Verhalten: readOnly / favorite
    const behRow = document.createElement('div');
    behRow.className = 'nw-config-card__row nw-config-field-row';

    const behLabel = document.createElement('div');
    behLabel.className = 'nw-config-field-label';
    behLabel.textContent = 'Verhalten';
    behRow.appendChild(behLabel);

    const behCtl = document.createElement('div');
    behCtl.className = 'nw-config-field-control';

    const readOnlyLabel = document.createElement('label');
    readOnlyLabel.style.display = 'flex';
    readOnlyLabel.style.alignItems = 'center';
    readOnlyLabel.style.gap = '4px';
    const roCb = document.createElement('input');
    roCb.type = 'checkbox';
    roCb.className = 'nw-config-checkbox';
    roCb.checked = !!(dev.behavior && dev.behavior.readOnly);
    roCb.addEventListener('change', () => {
      const beh = nwShcState.config.devices[index].behavior || {};
      beh.readOnly = !!roCb.checked;
      nwShcState.config.devices[index].behavior = beh;
      nwMarkDirty(true);
    });
    const roText = document.createElement('span');
    roText.textContent = 'Nur Anzeige';

    readOnlyLabel.appendChild(roCb);
    readOnlyLabel.appendChild(roText);

    const favLabel = document.createElement('label');
    favLabel.style.display = 'flex';
    favLabel.style.alignItems = 'center';
    favLabel.style.gap = '4px';
    const favCb = document.createElement('input');
    favCb.type = 'checkbox';
    favCb.className = 'nw-config-checkbox';
    favCb.checked = !!(dev.behavior && dev.behavior.favorite);
    favCb.addEventListener('change', () => {
      const beh = nwShcState.config.devices[index].behavior || {};
      beh.favorite = !!favCb.checked;
      nwShcState.config.devices[index].behavior = beh;
      nwMarkDirty(true);
    });
    const favText = document.createElement('span');
    favText.textContent = 'Favorit';

    favLabel.appendChild(favCb);
    favLabel.appendChild(favText);

    behCtl.appendChild(readOnlyLabel);
    behCtl.appendChild(favLabel);
    behRow.appendChild(behCtl);
    body.appendChild(behRow);

    // IO-Konfigurationen
    const io = dev.io || {};

    if (io.switch) {
      const s = io.switch;
      const readRow = nwCreateDpInput('Schalter lesen (readId)', s.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.switch = nwShcState.config.devices[index].io.switch || {};
        nwShcState.config.devices[index].io.switch.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Schalter schreiben (writeId)', s.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.switch = nwShcState.config.devices[index].io.switch || {};
        nwShcState.config.devices[index].io.switch.writeId = val || null;
      });
      body.appendChild(readRow);
      body.appendChild(writeRow);
    }

    if (io.level) {
      const l = io.level;
      const readRow = nwCreateDpInput('Wert/Position lesen (readId)', l.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Wert/Position schreiben (writeId)', l.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.writeId = val || null;
      });

      const minMaxCtl = document.createElement('div');
      minMaxCtl.style.display = 'flex';
      minMaxCtl.style.gap = '4px';
      minMaxCtl.style.width = '100%';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.className = 'nw-config-input';
      minInput.placeholder = 'Min';
      if (typeof l.min === 'number') minInput.value = String(l.min);
      minInput.addEventListener('change', () => {
        const v = minInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.min = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.className = 'nw-config-input';
      maxInput.placeholder = 'Max';
      if (typeof l.max === 'number') maxInput.value = String(l.max);
      maxInput.addEventListener('change', () => {
        const v = maxInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.max = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      minMaxCtl.appendChild(minInput);
      minMaxCtl.appendChild(maxInput);

      const minMaxRow = nwCreateFieldRow('Bereich min/max', minMaxCtl);

      body.appendChild(readRow);
      body.appendChild(writeRow);
      body.appendChild(minMaxRow);
    }

    if (io.cover) {
      const c = io.cover;
      const upRow = nwCreateDpInput('Taster Auf (upId)', c.upId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.upId = val || null;
      });
      const downRow = nwCreateDpInput('Taster Ab (downId)', c.downId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.downId = val || null;
      });
      const stopRow = nwCreateDpInput('Taster Stop (stopId)', c.stopId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.stopId = val || null;
      });
      body.appendChild(upRow);
      body.appendChild(downRow);
      body.appendChild(stopRow);
    }

    if (io.climate) {
      const cl = io.climate;
      const curRow = nwCreateDpInput('Klima Ist-Temperatur (currentTempId)', cl.currentTempId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.currentTempId = val || null;
      });
      const spRow = nwCreateDpInput('Klima Sollwert (setpointId)', cl.setpointId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.setpointId = val || null;
      });
      const modeRow = nwCreateDpInput('Klima Modus (modeId)', cl.modeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.modeId = val || null;
      });
      const humRow = nwCreateDpInput('Klima Luftfeuchte (humidityId)', cl.humidityId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.humidityId = val || null;
      });

      const minMaxCtl = document.createElement('div');
      minMaxCtl.style.display = 'flex';
      minMaxCtl.style.gap = '4px';
      minMaxCtl.style.width = '100%';

      const minSpInput = document.createElement('input');
      minSpInput.type = 'number';
      minSpInput.className = 'nw-config-input';
      minSpInput.placeholder = 'Min. °C';
      if (typeof cl.minSetpoint === 'number') minSpInput.value = String(cl.minSetpoint);
      minSpInput.addEventListener('change', () => {
        const v = minSpInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.minSetpoint = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      const maxSpInput = document.createElement('input');
      maxSpInput.type = 'number';
      maxSpInput.className = 'nw-config-input';
      maxSpInput.placeholder = 'Max. °C';
      if (typeof cl.maxSetpoint === 'number') maxSpInput.value = String(cl.maxSetpoint);
      maxSpInput.addEventListener('change', () => {
        const v = maxSpInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.maxSetpoint = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      minMaxCtl.appendChild(minSpInput);
      minMaxCtl.appendChild(maxSpInput);

      const minMaxRow = nwCreateFieldRow('Sollwert min/max', minMaxCtl);

      body.appendChild(curRow);
      body.appendChild(spRow);
      body.appendChild(modeRow);
      body.appendChild(humRow);
      body.appendChild(minMaxRow);
    }

    if (io.camera) {
      const c = io.camera;

      const snapInput = document.createElement('input');
      snapInput.type = 'text';
      snapInput.className = 'nw-config-input';
      snapInput.placeholder = 'http://... (Snapshot/MJPEG)';
      snapInput.value = (typeof c.snapshotUrl === 'string') ? c.snapshotUrl : '';
      snapInput.addEventListener('input', () => {
        const v = snapInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.camera = nwShcState.config.devices[index].io.camera || {};
        nwShcState.config.devices[index].io.camera.snapshotUrl = v || '';
        nwMarkDirty(true);
      });
      const snapRow = nwCreateFieldRow('Kamera Snapshot URL', snapInput);

      const liveInput = document.createElement('input');
      liveInput.type = 'text';
      liveInput.className = 'nw-config-input';
      liveInput.placeholder = 'http://... (Live öffnen)';
      liveInput.value = (typeof c.liveUrl === 'string') ? c.liveUrl : '';
      liveInput.addEventListener('input', () => {
        const v = liveInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.camera = nwShcState.config.devices[index].io.camera || {};
        nwShcState.config.devices[index].io.camera.liveUrl = v || '';
        nwMarkDirty(true);
      });
      const liveRow = nwCreateFieldRow('Kamera Live URL', liveInput);

      const refreshInput = document.createElement('input');
      refreshInput.type = 'number';
      refreshInput.className = 'nw-config-input';
      refreshInput.placeholder = 'Sek.';
      if (typeof c.refreshSec === 'number') refreshInput.value = String(c.refreshSec);
      refreshInput.addEventListener('change', () => {
        const v = refreshInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.camera = nwShcState.config.devices[index].io.camera || {};
        nwShcState.config.devices[index].io.camera.refreshSec = (Number.isFinite(num) && num > 0) ? num : 5;
        nwMarkDirty(true);
      });
      const refreshRow = nwCreateFieldRow('Snapshot Refresh (Sek.)', refreshInput);

      body.appendChild(snapRow);
      body.appendChild(liveRow);
      body.appendChild(refreshRow);
    }

    if (io.widget) {
      const w = io.widget;

      const kindSelect = document.createElement('select');
      kindSelect.className = 'nw-config-select';
      const kindOptions = [
        { value: 'iframe', label: 'Iframe' },
        { value: 'link', label: 'Link' },
      ];
      nwSetSelectOptions(kindSelect, kindOptions, [w.kind || 'iframe']);
      kindSelect.addEventListener('change', () => {
        const v = kindSelect.value || 'iframe';
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.kind = v;
        nwMarkDirty(true);
      });
      const kindRow = nwCreateFieldRow('Widget Typ', kindSelect);

      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.className = 'nw-config-input';
      urlInput.placeholder = 'https://...';
      urlInput.value = (typeof w.url === 'string') ? w.url : '';
      urlInput.addEventListener('input', () => {
        const v = urlInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.url = v || '';
        nwMarkDirty(true);
      });
      const urlRow = nwCreateFieldRow('Widget URL', urlInput);

      const openInput = document.createElement('input');
      openInput.type = 'text';
      openInput.className = 'nw-config-input';
      openInput.placeholder = 'optional (abweichende Öffnen-URL)';
      openInput.value = (typeof w.openUrl === 'string') ? w.openUrl : '';
      openInput.addEventListener('input', () => {
        const v = openInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.openUrl = v || '';
        nwMarkDirty(true);
      });
      const openRow = nwCreateFieldRow('Öffnen URL', openInput);

      const embedWrap = document.createElement('div');
      embedWrap.style.display = 'flex';
      embedWrap.style.alignItems = 'center';
      embedWrap.style.gap = '8px';

      const embedChk = document.createElement('input');
      embedChk.type = 'checkbox';
      embedChk.checked = !!w.embed;
      embedChk.addEventListener('change', () => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.embed = !!embedChk.checked;
        nwMarkDirty(true);
      });

      const embedLbl = document.createElement('span');
      embedLbl.textContent = 'Einbetten (Iframe)';

      embedWrap.appendChild(embedChk);
      embedWrap.appendChild(embedLbl);
      const embedRow = nwCreateFieldRow('Einbettung', embedWrap);

      const heightInput = document.createElement('input');
      heightInput.type = 'number';
      heightInput.className = 'nw-config-input';
      heightInput.placeholder = 'px';
      if (typeof w.height === 'number') heightInput.value = String(w.height);
      heightInput.addEventListener('change', () => {
        const v = heightInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.height = (Number.isFinite(num) && num > 0) ? num : 260;
        nwMarkDirty(true);
      });
      const heightRow = nwCreateFieldRow('Iframe Höhe', heightInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'nw-config-input';
      labelInput.placeholder = 'optional (Text im Tile)';
      labelInput.value = (typeof w.label === 'string') ? w.label : '';
      labelInput.addEventListener('input', () => {
        const v = labelInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.label = v || '';
        nwMarkDirty(true);
      });
      const labelRow = nwCreateFieldRow('Widget Label', labelInput);

      body.appendChild(kindRow);
      body.appendChild(urlRow);
      body.appendChild(openRow);
      body.appendChild(embedRow);
      body.appendChild(heightRow);
      body.appendChild(labelRow);
    }

    if (io.player) {
      const p = io.player;

      const playingRow = nwCreateDpInput('Status (playingId)', p.playingId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.playingId = val || null;
      });

      const titleRow = nwCreateDpInput('Titel (titleId)', p.titleId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.titleId = val || null;
      });

      const artistRow = nwCreateDpInput('Interpret (artistId)', p.artistId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.artistId = val || null;
      });

      const sourceRow = nwCreateDpInput('Quelle (sourceId)', p.sourceId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.sourceId = val || null;
      });

      const coverRow = nwCreateDpInput('Cover-URL (coverId)', p.coverId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.coverId = val || null;
      });

      const volReadRow = nwCreateDpInput('Lautstärke lesen (volumeReadId)', p.volumeReadId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeReadId = val || null;
      });

      const volWriteRow = nwCreateDpInput('Lautstärke schreiben (volumeWriteId)', p.volumeWriteId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeWriteId = val || null;
      });

      const minMaxCtl = document.createElement('div');
      minMaxCtl.style.display = 'flex';
      minMaxCtl.style.gap = '4px';
      minMaxCtl.style.width = '100%';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.className = 'nw-config-input';
      minInput.placeholder = 'Min.';
      if (typeof p.volumeMin === 'number') minInput.value = String(p.volumeMin);
      minInput.addEventListener('change', () => {
        const v = minInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeMin = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.className = 'nw-config-input';
      maxInput.placeholder = 'Max.';
      if (typeof p.volumeMax === 'number') maxInput.value = String(p.volumeMax);
      maxInput.addEventListener('change', () => {
        const v = maxInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeMax = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      minMaxCtl.appendChild(minInput);
      minMaxCtl.appendChild(maxInput);

      const minMaxRow = nwCreateFieldRow('Lautstärke min/max', minMaxCtl);

      const toggleRow = nwCreateDpInput('Toggle Play/Pause (toggleId)', p.toggleId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.toggleId = val || null;
      });

      const playRow = nwCreateDpInput('Play (playId)', p.playId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.playId = val || null;
      });

      const pauseRow = nwCreateDpInput('Pause (pauseId)', p.pauseId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.pauseId = val || null;
      });

      const stopRow = nwCreateDpInput('Stop (stopId)', p.stopId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.stopId = val || null;
      });

      const nextRow = nwCreateDpInput('Nächster Titel (nextId)', p.nextId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.nextId = val || null;
      });

      const prevRow = nwCreateDpInput('Vorheriger Titel (prevId)', p.prevId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.prevId = val || null;
      });

      const stationRow = nwCreateDpInput('Sender wählen (stationId)', p.stationId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.stationId = val || null;
      });

      const playlistRow = nwCreateDpInput('Playlist wählen (playlistId)', p.playlistId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.playlistId = val || null;
      });

      // Radiosender-Liste (optional)
      const stationsWrap = document.createElement('div');
      stationsWrap.className = 'nw-player-stations';

      const stationsHeader = document.createElement('div');
      stationsHeader.className = 'nw-player-stations__head';

      const stationsTitle = document.createElement('div');
      stationsTitle.className = 'nw-player-stations__title';
      stationsTitle.textContent = 'Radiosender (optional)';

      const addBtn = document.createElement('button');
      addBtn.className = 'nw-btn nw-btn--mini';
      addBtn.textContent = '+ Sender';
      addBtn.addEventListener('click', () => {
        nwShcState.config.devices[index].stations = Array.isArray(nwShcState.config.devices[index].stations) ? nwShcState.config.devices[index].stations : [];
        nwShcState.config.devices[index].stations.push({ name: 'Neuer Sender', value: '' });
        nwMarkDirty(true);
        nwRunValidatorSoon();
        renderStations();
      });

      stationsHeader.appendChild(stationsTitle);
      stationsHeader.appendChild(addBtn);
      stationsWrap.appendChild(stationsHeader);

      const stationsList = document.createElement('div');
      stationsList.className = 'nw-player-stations__list';
      stationsWrap.appendChild(stationsList);

      const renderStations = () => {
        stationsList.innerHTML = '';
        const stations = Array.isArray(nwShcState.config.devices[index].stations) ? nwShcState.config.devices[index].stations : [];
        stations.forEach((st, si) => {
          const row = document.createElement('div');
          row.className = 'nw-player-stations__row';

          const nameIn = document.createElement('input');
          nameIn.className = 'nw-config-input';
          nameIn.placeholder = 'Name';
          nameIn.value = (st && typeof st.name === 'string') ? st.name : '';
          nameIn.addEventListener('input', () => {
            stations[si].name = nameIn.value;
            nwMarkDirty(true);
            nwRunValidatorSoon();
          });

          const valIn = document.createElement('input');
          valIn.className = 'nw-config-input';
          valIn.placeholder = 'Wert / URL / Preset';
          valIn.value = (st && typeof st.value === 'string') ? st.value : '';
          valIn.addEventListener('input', () => {
            stations[si].value = valIn.value;
            nwMarkDirty(true);
            nwRunValidatorSoon();
          });

          const del = document.createElement('button');
          del.className = 'nw-btn nw-btn--mini';
          del.textContent = '✕';
          del.title = 'Entfernen';
          del.addEventListener('click', () => {
            stations.splice(si, 1);
            nwShcState.config.devices[index].stations = stations;
            nwMarkDirty(true);
            nwRunValidatorSoon();
            renderStations();
          });

          row.appendChild(nameIn);
          row.appendChild(valIn);
          row.appendChild(del);
          stationsList.appendChild(row);
        });
      };

      renderStations();

      const stationsRow = nwCreateFieldRow('Radiosender', stationsWrap);

      // Playlists-Liste (optional)
      const playlistsWrap = document.createElement('div');
      playlistsWrap.className = 'nw-player-stations';

      const playlistsHeader = document.createElement('div');
      playlistsHeader.className = 'nw-player-stations__head';

      const playlistsTitle = document.createElement('div');
      playlistsTitle.className = 'nw-player-stations__title';
      playlistsTitle.textContent = 'Playlists (optional)';

      const addPlBtn = document.createElement('button');
      addPlBtn.className = 'nw-btn nw-btn--mini';
      addPlBtn.textContent = '+ Playlist';
      addPlBtn.addEventListener('click', () => {
        nwShcState.config.devices[index].playlists = Array.isArray(nwShcState.config.devices[index].playlists) ? nwShcState.config.devices[index].playlists : [];
        nwShcState.config.devices[index].playlists.push({ name: 'Neue Playlist', value: '' });
        nwMarkDirty(true);
        nwRunValidatorSoon();
        renderPlaylists();
      });

      playlistsHeader.appendChild(playlistsTitle);
      playlistsHeader.appendChild(addPlBtn);
      playlistsWrap.appendChild(playlistsHeader);

      const playlistsList = document.createElement('div');
      playlistsList.className = 'nw-player-stations__list';
      playlistsWrap.appendChild(playlistsList);

      const renderPlaylists = () => {
        playlistsList.innerHTML = '';
        const playlists = Array.isArray(nwShcState.config.devices[index].playlists) ? nwShcState.config.devices[index].playlists : [];
        playlists.forEach((plItem, pi) => {
          const row = document.createElement('div');
          row.className = 'nw-player-stations__row';

          const nameIn = document.createElement('input');
          nameIn.className = 'nw-config-input';
          nameIn.placeholder = 'Name';
          nameIn.value = (plItem && typeof plItem.name === 'string') ? plItem.name : '';
          nameIn.addEventListener('input', () => {
            playlists[pi].name = nameIn.value;
            nwMarkDirty(true);
            nwRunValidatorSoon();
          });

          const valIn = document.createElement('input');
          valIn.className = 'nw-config-input';
          valIn.placeholder = 'Wert / URI / ID';
          valIn.value = (plItem && typeof plItem.value === 'string') ? plItem.value : '';
          valIn.addEventListener('input', () => {
            playlists[pi].value = valIn.value;
            nwMarkDirty(true);
            nwRunValidatorSoon();
          });

          const del = document.createElement('button');
          del.className = 'nw-btn nw-btn--mini';
          del.textContent = '✕';
          del.title = 'Entfernen';
          del.addEventListener('click', () => {
            playlists.splice(pi, 1);
            nwShcState.config.devices[index].playlists = playlists;
            nwMarkDirty(true);
            nwRunValidatorSoon();
            renderPlaylists();
          });

          row.appendChild(nameIn);
          row.appendChild(valIn);
          row.appendChild(del);
          playlistsList.appendChild(row);
        });
      };

      renderPlaylists();

      const playlistsRow = nwCreateFieldRow('Playlists', playlistsWrap);

      body.appendChild(playingRow);
      body.appendChild(titleRow);
      body.appendChild(artistRow);
      body.appendChild(sourceRow);
      body.appendChild(coverRow);
      body.appendChild(volReadRow);
      body.appendChild(volWriteRow);
      body.appendChild(minMaxRow);
      body.appendChild(toggleRow);
      body.appendChild(playRow);
      body.appendChild(pauseRow);
      body.appendChild(stopRow);
      body.appendChild(nextRow);
      body.appendChild(prevRow);
      body.appendChild(stationRow);
      body.appendChild(stationsRow);
      body.appendChild(playlistRow);
      body.appendChild(playlistsRow);
    }

    if (io.sensor) {
      const se = io.sensor;
      const readRow = nwCreateDpInput('Sensor lesen (readId)', se.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.sensor = nwShcState.config.devices[index].io.sensor || {};
        nwShcState.config.devices[index].io.sensor.readId = val || null;
      });
      body.appendChild(readRow);
    }

    if (io.color) {
      const c = io.color;
      const readRow = nwCreateDpInput('Farbe lesen (readId)', c.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.color = nwShcState.config.devices[index].io.color || {};
        nwShcState.config.devices[index].io.color.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Farbe schreiben (writeId)', c.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.color = nwShcState.config.devices[index].io.color || {};
        nwShcState.config.devices[index].io.color.writeId = val || null;
      });

      const fmtSel = document.createElement('select');
      fmtSel.className = 'nw-config-select';
      const fmtOpts = [
        { value: 'hex', label: 'HEX (#RRGGBB)' },
        { value: 'rgb', label: 'RGB (r,g,b)' },
        { value: 'int', label: 'Integer (0..16777215)' },
      ];
      fmtOpts.forEach(def => {
        const opt = document.createElement('option');
        opt.value = def.value;
        opt.textContent = def.label;
        fmtSel.appendChild(opt);
      });
      fmtSel.value = (typeof c.format === 'string' && c.format) ? c.format : 'hex';
      fmtSel.addEventListener('change', () => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.color = nwShcState.config.devices[index].io.color || {};
        nwShcState.config.devices[index].io.color.format = fmtSel.value || 'hex';
        nwMarkDirty(true);
      });

      const fmtRow = nwCreateFieldRow('Farbformat', fmtSel);

      body.appendChild(readRow);
      body.appendChild(writeRow);
      body.appendChild(fmtRow);
    }

    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* --- Datapoint-Picker-Dialog --- */

let nwDpDialogEl = null;
let nwDpDialogCurrent = null;

function nwEnsureDpDialog() {
  if (nwDpDialogEl) return nwDpDialogEl;

  const backdrop = document.createElement('div');
  backdrop.className = 'nw-dp-dialog-backdrop';
  backdrop.style.display = 'none';

  const dlg = document.createElement('div');
  dlg.className = 'nw-dp-dialog';

  const header = document.createElement('div');
  header.className = 'nw-dp-dialog__header';

  const title = document.createElement('div');
  title.className = 'nw-dp-dialog__title';

  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.className = 'nw-dp-dialog__close';
  btnClose.textContent = 'Schließen';
  btnClose.addEventListener('click', () => {
    nwCloseDatapointDialog();
  });

  header.appendChild(title);
  header.appendChild(btnClose);

  const body = document.createElement('div');
  body.className = 'nw-dp-dialog__body';

  const searchRow = document.createElement('div');
  searchRow.className = 'nw-dp-dialog__search';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nw-config-input';
  input.placeholder = 'Nach ID oder Name suchen…';

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'nw-config-btn nw-config-btn--ghost';
  searchBtn.textContent = 'Suchen';

  const results = document.createElement('div');
  results.className = 'nw-dp-dialog__results';

  searchRow.appendChild(input);
  searchRow.appendChild(searchBtn);

  body.appendChild(searchRow);
  body.appendChild(results);

  dlg.appendChild(header);
  dlg.appendChild(body);
  backdrop.appendChild(dlg);

  document.body.appendChild(backdrop);

  const state = {
    backdrop,
    dialog: dlg,
    title,
    input,
    searchBtn,
    results,
  };
  nwDpDialogEl = state;

  function triggerSearch() {
    const term = input.value.trim();
    nwRunDatapointSearch(term, state);
  }

  searchBtn.addEventListener('click', () => {
    triggerSearch();
  });

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      triggerSearch();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      nwCloseDatapointDialog();
    }
  });

  // Live-Suche (wie im Admin): tippen = Ergebnisse aktualisieren
  let dpTypingTimer = null;
  input.addEventListener('input', () => {
    if (dpTypingTimer) clearTimeout(dpTypingTimer);
    dpTypingTimer = setTimeout(() => {
      triggerSearch();
    }, 200);
  });

  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) {
      nwCloseDatapointDialog();
    }
  });

  return state;
}

async function nwRunDatapointSearch(term, state) {
  const { results } = state;
  results.innerHTML = '';

  // Leerer Suchbegriff = Browse-Modus (zeigt eine initiale Liste)
  term = (term || '').trim();


  const info = document.createElement('div');
  info.className = 'nw-dp-result__meta';
  info.textContent = 'Suche…';
  results.appendChild(info);

  try {
    const url = '/api/smarthome/dpsearch?q=' + encodeURIComponent(term) + '&limit=100';
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    results.innerHTML = '';
    if (!data || !data.ok || !Array.isArray(data.results)) {
      const err = document.createElement('div');
      err.className = 'nw-dp-result__meta';
      err.textContent = 'Fehler bei der Suche.';
      results.appendChild(err);
      return;
    }
    if (!data.results.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-dp-result__meta';
      empty.textContent = 'Keine passenden Datenpunkte gefunden.';
      results.appendChild(empty);
      return;
    }

    data.results.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'nw-dp-result';

      const idEl = document.createElement('div');
      idEl.className = 'nw-dp-result__id';
      idEl.textContent = r.id;

      const metaEl = document.createElement('div');
      metaEl.className = 'nw-dp-result__meta';
      const parts = [];
      if (r.name) parts.push(r.name);
      if (r.role) parts.push('role=' + r.role);
      if (r.type) parts.push('type=' + r.type);
      if (r.unit) parts.push('[' + r.unit + ']');
      metaEl.textContent = parts.join(' · ');

      row.appendChild(idEl);
      row.appendChild(metaEl);

      row.addEventListener('click', () => {
        if (nwDpDialogCurrent && typeof nwDpDialogCurrent.onSelect === 'function') {
          nwDpDialogCurrent.onSelect(r.id);
        }
        nwCloseDatapointDialog();
      });

      results.appendChild(row);
    });
  } catch (e) {
    console.error('Datapoint search error:', e);
    results.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'nw-dp-result__meta';
    err.textContent = 'Fehler bei der Suche.';
    results.appendChild(err);
  }
}

function nwOpenDatapointDialog(options) {
  const state = nwEnsureDpDialog();
  nwDpDialogCurrent = {
    onSelect: options && options.onSelect,
  };

  state.title.textContent = options && options.title ? options.title : 'Datenpunkt auswählen';
  state.input.value = (options && options.initial) || '';
  state.results.innerHTML = '';

  state.backdrop.style.display = 'flex';

  // Initiale Suche (leerer Suchbegriff = Browse-Modus)
  nwRunDatapointSearch(state.input.value.trim(), state);

  state.input.focus();
  state.input.select();
}

function nwCloseDatapointDialog() {
  if (!nwDpDialogEl) return;
  nwDpDialogEl.backdrop.style.display = 'none';
  nwDpDialogCurrent = null;
}

/* --- Toolbar-Buttons --- */

function nwAttachToolbarHandlers() {
  const saveBtn = document.getElementById('nw-config-save-btn');
  const reloadBtn = document.getElementById('nw-config-reload-btn');

  const exportBtn = document.getElementById('nw-config-export-btn');
  const importBtn = document.getElementById('nw-config-import-btn');
  const importFile = document.getElementById('nw-config-import-file');

  const addRoomBtn = document.getElementById('nw-config-add-room-btn');
  const addFnBtn = document.getElementById('nw-config-add-function-btn');
  const addDeviceBtn = document.getElementById('nw-config-add-device-btn');

  const tplSelect = document.getElementById('nw-config-template-select');
  const addTplBtn = document.getElementById('nw-config-add-template-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      nwSaveSmartHomeConfig();
    });
  }
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      nwReloadSmartHomeConfig();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      nwExportSmartHomeConfig();
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      if (importFile) {
        // reset so same file can be re-imported
        importFile.value = '';
        importFile.click();
      }
    });
  }

  if (importFile) {
    importFile.addEventListener('change', (ev) => {
      const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
      if (file) {
        nwImportSmartHomeConfigFromFile(file);
      }
    });
  }

  if (addRoomBtn) {
    addRoomBtn.addEventListener('click', () => {
      nwAddRoom();
    });
  }
  if (addFnBtn) {
    addFnBtn.addEventListener('click', () => {
      nwAddFunction();
    });
  }

  if (addDeviceBtn) {
    addDeviceBtn.addEventListener('click', () => {
      nwAddDevice();
    });
  }

  if (addTplBtn) {
    addTplBtn.addEventListener('click', () => {
      const t = tplSelect ? tplSelect.value : '';
      nwAddDeviceFromTemplate(t);
    });
  }

  // --- Pages (Sidebar Navigation) ---
  const pagesTa = document.getElementById('nw-pages-json');
  if (pagesTa) {
    pagesTa.addEventListener('input', () => {
      nwShcState.pagesJsonText = pagesTa.value;
      nwSetPagesStatus('Änderungen nicht geprüft', 'dirty');
      nwMarkDirty(true);
      nwRenderPagesEditor();
    });
    // initial sync
    nwRenderPagesEditor(true);
  }

  const btnPagesDefault = document.getElementById('nw-pages-default-btn');
  if (btnPagesDefault) {
    btnPagesDefault.addEventListener('click', () => {
      if (!nwShcState.config) return;
      const pages = nwBuildDefaultPages(nwShcState.config);
      nwShcState.config.pages = pages;
      nwShcState.pagesJsonText = JSON.stringify(pages, null, 2);
      nwShcState.pagesJsonValid = true;
      nwMarkDirty(true);
      nwRenderPagesEditor(true);
      nwSetPagesStatus('Standard-Seiten erzeugt ✅', 'ok');
    });
  }

  const btnPagesClear = document.getElementById('nw-pages-clear-btn');
  if (btnPagesClear) {
    btnPagesClear.addEventListener('click', () => {
      if (!nwShcState.config) return;
      nwShcState.config.pages = [];
      nwShcState.pagesJsonText = '[]';
      nwShcState.pagesJsonValid = true;
      nwMarkDirty(true);
      nwRenderPagesEditor(true);
      nwSetPagesStatus('Seiten geleert', 'ok');
    });
  }

  const btnPagesValidate = document.getElementById('nw-pages-validate-btn');
  if (btnPagesValidate) {
    btnPagesValidate.addEventListener('click', () => {
      const res = nwParsePagesJson(nwShcState.pagesJsonText);
      if (!res.ok) {
        nwShcState.pagesJsonValid = false;
        nwRenderPagesEditor();
        nwSetPagesStatus('Fehler: ' + res.error, 'error');
        return;
      }
      nwShcState.pagesJsonValid = true;
      if (nwShcState.config) nwShcState.config.pages = res.pages;
      nwShcState.pagesJsonText = JSON.stringify(res.pages, null, 2);
      nwMarkDirty(true);
      nwRenderPagesEditor(true);
      nwSetPagesStatus('Pages JSON ist gültig ✅', 'ok');
    });
  }



  // --- Pages Builder UI ---
  const pagesTabs = document.getElementById('nw-pages-tabs');
  if (pagesTabs) {
    pagesTabs.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-tab]') : null;
      if (!btn) return;
      const tab = btn.getAttribute('data-tab');
      if (!tab) return;
      nwShcState.pagesUi.tab = tab;
      nwRenderPagesEditor();
    });
  }

  const pageAddBtn = document.getElementById('nw-page-add');
  if (pageAddBtn) {
    pageAddBtn.addEventListener('click', () => {
      const prev = nwShcState.pagesUi.selectedId;
      const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft : [];
      const maxOrder = pages.reduce((m, p) => Math.max(m, Number.isFinite(+p.order) ? +p.order : 0), 0);
      const base = (pages || []).find((p) => p.id === prev) || null;

      nwShcState.pagesUi.prevSelectedId = prev;
      nwShcState.pagesUi.isNew = true;
      nwShcState.pagesUi.selectedId = null;
      nwShcState.pagesUi.idManuallyEdited = false;
      nwShcState.pagesUi.newSeed = {
        id: '',
        title: '',
        icon: base ? base.icon : '',
        parentId: base ? base.id : '',
        viewMode: base ? base.viewMode : 'rooms',
        order: maxOrder + 1,
        roomIds: [],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        href: '',
        cardSize: base ? base.cardSize : 'auto',
        sortBy: base ? base.sortBy : 'order',
        groupByType: base ? base.groupByType : false,
      };

      nwPagesSetEditorStatus('Neue Seite …', 'dirty');
      nwPagesRenderList();
      nwPagesRenderEditor();
    });
  }

  const pageSaveBtn = document.getElementById('nw-page-save');
  if (pageSaveBtn) pageSaveBtn.addEventListener('click', () => nwPagesSaveFromEditor());

  const pageCancelBtn = document.getElementById('nw-page-cancel');
  if (pageCancelBtn) {
    pageCancelBtn.addEventListener('click', () => {
      if (nwShcState.pagesUi.isNew) {
        nwShcState.pagesUi.isNew = false;
        nwShcState.pagesUi.newSeed = null;
        nwShcState.pagesUi.selectedId = nwShcState.pagesUi.prevSelectedId || (nwShcState.pagesDraft[0] ? nwShcState.pagesDraft[0].id : null);
      }
      nwShcState.pagesUi.idManuallyEdited = false;
      nwPagesSetEditorStatus('', 'dirty');
      nwPagesRenderList();
      nwPagesRenderEditor();
    });
  }

  const pageDelBtn = document.getElementById('nw-page-delete');
  if (pageDelBtn) pageDelBtn.addEventListener('click', () => nwPagesDeleteSelected());

  const pageTitleInput = document.getElementById('nw-page-title');
  const pageIdInput = document.getElementById('nw-page-id');
  if (pageIdInput) {
    pageIdInput.addEventListener('input', () => {
      nwShcState.pagesUi.idManuallyEdited = true;
    });
  }
  if (pageTitleInput && pageIdInput) {
    pageTitleInput.addEventListener('input', () => {
      if (!nwShcState.pagesUi.isNew) return;
      if (nwShcState.pagesUi.idManuallyEdited) return;
      const slug = nwPagesSlugify(pageTitleInput.value);
      if (slug) pageIdInput.value = slug;
    });
  }

  const typeAddBtn = document.getElementById('nw-page-type-add-btn');
  if (typeAddBtn) {
    typeAddBtn.addEventListener('click', () => {
      const inp = document.getElementById('nw-page-type-add');
      const sel = document.getElementById('nw-page-types');
      if (!inp || !sel) return;
      const v = String(inp.value || '').trim();
      if (!v) return;

      // add option if missing
      const exists = Array.from(sel.options).some((o) => o.value === v);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        opt.selected = true;
        sel.appendChild(opt);
      } else {
        Array.from(sel.options).forEach((o) => { if (o.value === v) o.selected = true; });
      }

      inp.value = '';
    });
  }

  const syncFromJsonBtn = document.getElementById('nw-pages-sync-from-json');
  if (syncFromJsonBtn) {
    syncFromJsonBtn.addEventListener('click', () => {
      const ta2 = document.getElementById('nw-pages-json');
      if (!ta2) return;
      const parsed = nwParsePagesJson(ta2.value);
      if (!parsed.ok) {
        nwPagesSetEditorStatus(parsed.error || 'Ungültiges JSON', 'error');
        return;
      }
      nwShcState.pagesDraft = parsed.pages;
      nwShcState.pagesJsonText = JSON.stringify(parsed.pages, null, 2);
      ta2.value = nwShcState.pagesJsonText;
      nwShcState.pagesUi.tab = 'builder';
      nwRenderPagesEditor(true);
      nwPagesSetEditorStatus('JSON übernommen ✅', 'ok');
    });
  }

  const syncToJsonBtn = document.getElementById('nw-pages-sync-to-json');
  if (syncToJsonBtn) {
    syncToJsonBtn.addEventListener('click', () => {
      const ta2 = document.getElementById('nw-pages-json');
      if (!ta2) return;
      nwShcState.pagesJsonText = JSON.stringify(nwShcState.pagesDraft || [], null, 2);
      ta2.value = nwShcState.pagesJsonText;
      nwRenderPagesEditor(true);
      nwPagesSetEditorStatus('JSON aktualisiert ✅', 'ok');
    });
  }
  // --- Datensicherung (wie App‑Center) ---
  const btnBackupExport = document.getElementById('nw-backup-export-btn');
  if (btnBackupExport) {
    btnBackupExport.addEventListener('click', async () => {
      try {
        await nwBackupExport();
      } catch (e) {
        nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
      }
    });
  }

  const backupImportFile = document.getElementById('nw-backup-import-file');
  if (backupImportFile) {
    backupImportFile.addEventListener('change', async (ev) => {
      const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
      ev.target.value = '';
      if (!file) return;
      const modeEl = document.getElementById('nw-backup-import-mode');
      const mode = modeEl ? modeEl.value : 'merge';
      try {
        await nwBackupImport(file, mode);
      } catch (e) {
        nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
      }
    });
  }

  const btnRestoreUserdata = document.getElementById('nw-backup-restore-userdata-btn');
  if (btnRestoreUserdata) {
    btnRestoreUserdata.addEventListener('click', async () => {
      try {
        await nwBackupRestoreFromUserdata();
      } catch (e) {
        nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
      }
    });
  }
}

async function nwInitSmartHomeConfig() {
  nwAttachToolbarHandlers();
  nwInitShcfgShellUi();
  // Hint: SmartHome must be enabled in the adapter settings, otherwise the VIS page stays empty.
  try {
    const hint = document.getElementById('nw-config-enabled-hint');
    if (hint) {
      const cfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());
      const enabled = !!(cfg && cfg.smartHome && cfg.smartHome.enabled);
      if (!enabled) {
        hint.style.display = 'block';
        hint.innerHTML = '⚠️ SmartHome ist deaktiviert – die VIS-Seite bleibt leer. Bitte im ioBroker Admin unter <strong>nexowatt-ui → SmartHome → „SmartHome aktivieren“</strong> einschalten.';
      } else {
        hint.style.display = 'none';
        hint.innerHTML = '';
      }
    }
  } catch (_e) {
    // ignore
  }
  await nwReloadSmartHomeConfig();
}

document.addEventListener('DOMContentLoaded', () => {
  nwInitSmartHomeConfig();
});