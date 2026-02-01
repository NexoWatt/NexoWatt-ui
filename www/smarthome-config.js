/* SmartHomeConfig VIS-Konfig-Seite (A10, Editor)
 * Bearbeiten von Räumen, Funktionen und Geräten inkl. Datenpunkt-Picker.
 */

const nwShcState = {
  config: null,
  originalJson: null,
  dirty: false,
  validation: null,
};

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
      chkDp('Switch readId', readId);
      chkDp('Switch writeId', writeId);
      if (!readId && !writeId) {
        nwPushIssue(out, 'error', 'Gerät', 'Switch/Scene ohne Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !readId) {
        nwPushIssue(out, 'error', 'Gerät', 'readOnly aktiv, aber Switch readId fehlt.', ent);
      }
    } else if (type === 'dimmer') {
      const lvl = (io && io.level) ? io.level : {};
      const readId = (lvl && typeof lvl.readId === 'string') ? lvl.readId.trim() : '';
      const writeId = (lvl && typeof lvl.writeId === 'string') ? lvl.writeId.trim() : '';
      chkDp('Level readId', readId);
      chkDp('Level writeId', writeId);
      if (!readId && !writeId) {
        nwPushIssue(out, 'error', 'Gerät', 'Dimmer ohne Level-Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !readId) {
        nwPushIssue(out, 'error', 'Gerät', 'readOnly aktiv, aber Level readId fehlt.', ent);
      }
    } else if (type === 'blind') {
      const lvl = (io && io.level) ? io.level : {};
      const cover = (io && io.cover) ? io.cover : {};
      const posRead = (lvl && typeof lvl.readId === 'string') ? lvl.readId.trim() : '';
      const posWrite = (lvl && typeof lvl.writeId === 'string') ? lvl.writeId.trim() : '';
      const upId = (cover && typeof cover.upId === 'string') ? cover.upId.trim() : '';
      const downId = (cover && typeof cover.downId === 'string') ? cover.downId.trim() : '';
      const stopId = (cover && typeof cover.stopId === 'string') ? cover.stopId.trim() : '';
      chkDp('Level readId', posRead);
      chkDp('Level writeId', posWrite);
      chkDp('Cover upId', upId);
      chkDp('Cover downId', downId);
      chkDp('Cover stopId', stopId);
      if (!posRead && !posWrite && !upId && !downId && !stopId) {
        nwPushIssue(out, 'error', 'Gerät', 'Jalousie/Rollladen ohne Datenpunkte (Position oder up/down/stop fehlt).', ent);
      }
      if (readOnly && !posRead && !upId && !downId && !stopId) {
        nwPushIssue(out, 'error', 'Gerät', 'readOnly aktiv, aber kein Read-DP (Position) und keine Tasten-DPs gesetzt.', ent);
      }
    } else if (type === 'rtr') {
      const cl = (io && io.climate) ? io.climate : {};
      const cur = (cl && typeof cl.currentTempId === 'string') ? cl.currentTempId.trim() : '';
      const sp = (cl && typeof cl.setpointId === 'string') ? cl.setpointId.trim() : '';
      const mode = (cl && typeof cl.modeId === 'string') ? cl.modeId.trim() : '';
      const hum = (cl && typeof cl.humidityId === 'string') ? cl.humidityId.trim() : '';
      chkDp('Climate currentTempId', cur);
      chkDp('Climate setpointId', sp);
      chkDp('Climate modeId', mode);
      chkDp('Climate humidityId', hum);
      if (!cur && !sp) {
        nwPushIssue(out, 'error', 'Gerät', 'RTR ohne currentTempId und ohne setpointId (keine Anzeige/Regelung möglich).', ent);
      }
      if (!readOnly && !sp) {
        nwPushIssue(out, 'warn', 'Gerät', 'RTR ohne setpointId (nur Anzeige möglich).', ent);
      }
    } else if (type === 'sensor') {
      const se = (io && io.sensor) ? io.sensor : {};
      const readId = (se && typeof se.readId === 'string') ? se.readId.trim() : '';
      chkDp('Sensor readId', readId);
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
    dimmer: 'Dimmer',
    blind: 'Jalousie / Rollladen',
    rtr: 'Heizung (RTR)',
    sensor: 'Sensor',
    scene: 'Szene',
    logicStatus: 'Logic Status',
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
  cfg.version = (typeof cfg.version === 'number') ? cfg.version : 1;
  cfg.rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
  cfg.functions = Array.isArray(cfg.functions) ? cfg.functions : [];
  cfg.devices = Array.isArray(cfg.devices) ? cfg.devices : [];
  return cfg;
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
    nwNormalizeRoomFunctionOrder();
    nwNormalizeDeviceOrder();
    nwMarkDirty(true);
    nwRenderAll();

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
    nwMarkDirty(false);
    if (data.persisted) {
      nwSetStatus('Konfiguration gespeichert', 'ok');
    } else {
      nwSetStatus('Konfiguration im Adapter aktualisiert (Persistenz ggf. nicht verfügbar)', 'ok');
    }
    // Nach dem Speichern neu rendern, um evtl. Normalisierungen abzubilden
    nwRenderAll();
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
    version: typeof cfg.version === 'number' ? cfg.version : 1,
    rooms: Array.isArray(cfg.rooms) ? cfg.rooms.map(r => Object.assign({}, r)) : [],
    functions: Array.isArray(cfg.functions) ? cfg.functions.map(f => Object.assign({}, f)) : [],
    devices: Array.isArray(cfg.devices) ? cfg.devices.map(d => Object.assign({}, d)) : [],
  };
  nwNormalizeRoomFunctionOrder();
  nwNormalizeDeviceOrder();
  nwShcState.originalJson = JSON.stringify(nwShcState.config);
  nwMarkDirty(false);
  nwRenderAll();
  nwRunValidationNow();
  nwSetStatus('Konfiguration geladen', 'ok');
}

function nwRenderAll() {
  const cfg = nwShcState.config || { rooms: [], functions: [], devices: [] };
  nwRenderRoomsEditor(cfg.rooms || []);
  nwRenderFunctionsEditor(cfg.functions || []);
  nwRenderDevicesEditor(cfg.devices || [], cfg.rooms || [], cfg.functions || []);

  // After re-rendering, re-apply validation highlights / list
  nwScheduleValidation();
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
function nwAddDeviceFromTemplate(templateType) {
  if (!nwShcState.config) return;

  const t = String(templateType || '').trim();
  if (!t) {
    nwSetStatus('Bitte zuerst ein Template auswählen.', 'error');
    return;
  }

  const devices = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  const roomId = rooms.length ? (rooms[0] && rooms[0].id) : null;
  const functionId = funcs.length ? (funcs[0] && funcs[0].id) : null;

  const baseIdMap = {
    switch: 'schalter',
    dimmer: 'dimmer',
    blind: 'jalousie',
    rtr: 'heizung',
    sensor: 'sensor',
    scene: 'szene',
  };
  const aliasMap = {
    switch: 'Neuer Schalter',
    dimmer: 'Neuer Dimmer',
    blind: 'Neue Jalousie',
    rtr: 'Neue Heizung',
    sensor: 'Neuer Sensor',
    scene: 'Neue Szene',
  };
  const iconMap = {
    switch: 'SW',
    dimmer: 'DM',
    blind: 'BL',
    rtr: 'RT',
    sensor: 'SE',
    scene: 'SC',
  };

  const id = nwEnsureUniqueDeviceId(devices, baseIdMap[t] || 'geraet');

  const dev = {
    id,
    alias: aliasMap[t] || 'Neues Gerät',
    type: t,
    roomId: roomId || null,
    functionId: functionId || null,
    icon: iconMap[t] || '',
    size: 'm',
    behavior: { favorite: false, readOnly: false },
    io: {},
  };

  // IO skeletons by type
  if (t === 'switch') {
    dev.io.switch = { readId: null, writeId: null };
  } else if (t === 'scene') {
    dev.io.switch = { readId: null, writeId: null };
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
  const sel = document.getElementById('nw-config-template-select');
  if (sel) sel.value = '';
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
  btnTest.textContent = 'Test';
  btnTest.title = 'DP lesen (Installer)';

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
    labelLower.includes('modeid')
  );

  let btnSet = null;
  if (allowWrite) {
    btnSet = document.createElement('button');
    btnSet.type = 'button';
    btnSet.className = 'nw-config-dp-button';
    btnSet.textContent = 'Set';
    btnSet.title = 'DP schreiben (Installer)';

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
      { value: 'dimmer', label: 'Dimmer' },
      { value: 'blind', label: 'Jalousie / Rollladen' },
      { value: 'rtr', label: 'Heizung (RTR)' },
      { value: 'sensor', label: 'Sensor' },
      { value: 'scene', label: 'Szene' },
      { value: 'logicStatus', label: 'Logic Status' },
    ];
    typeOptions.forEach(optDef => {
      const opt = document.createElement('option');
      opt.value = optDef.value;
      opt.textContent = optDef.label;
      if ((dev.type || '') === optDef.value) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', () => {
      nwShcState.config.devices[index].type = typeSelect.value || null;
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

    // Icon
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.className = 'nw-config-input';
    iconInput.value = dev.icon || '';
    iconInput.addEventListener('input', () => {
      nwShcState.config.devices[index].icon = iconInput.value || null;
      nwMarkDirty(true);
    });
    body.appendChild(nwCreateFieldRow('Icon', iconInput));

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
    roText.textContent = 'readOnly';

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
      const readRow = nwCreateDpInput('Switch readId', s.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.switch = nwShcState.config.devices[index].io.switch || {};
        nwShcState.config.devices[index].io.switch.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Switch writeId', s.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.switch = nwShcState.config.devices[index].io.switch || {};
        nwShcState.config.devices[index].io.switch.writeId = val || null;
      });
      body.appendChild(readRow);
      body.appendChild(writeRow);
    }

    if (io.level) {
      const l = io.level;
      const readRow = nwCreateDpInput('Level readId', l.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Level writeId', l.writeId || '', (val) => {
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

      const minMaxRow = nwCreateFieldRow('Level min/max', minMaxCtl);

      body.appendChild(readRow);
      body.appendChild(writeRow);
      body.appendChild(minMaxRow);
    }

    if (io.cover) {
      const c = io.cover;
      const upRow = nwCreateDpInput('Cover upId', c.upId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.upId = val || null;
      });
      const downRow = nwCreateDpInput('Cover downId', c.downId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.downId = val || null;
      });
      const stopRow = nwCreateDpInput('Cover stopId', c.stopId || '', (val) => {
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
      const curRow = nwCreateDpInput('Climate currentTempId', cl.currentTempId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.currentTempId = val || null;
      });
      const spRow = nwCreateDpInput('Climate setpointId', cl.setpointId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.setpointId = val || null;
      });
      const modeRow = nwCreateDpInput('Climate modeId', cl.modeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.modeId = val || null;
      });
      const humRow = nwCreateDpInput('Climate humidityId', cl.humidityId || '', (val) => {
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
      minSpInput.placeholder = 'Min °C';
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
      maxSpInput.placeholder = 'Max °C';
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

      const minMaxRow = nwCreateFieldRow('Setpoint min/max', minMaxCtl);

      body.appendChild(curRow);
      body.appendChild(spRow);
      body.appendChild(modeRow);
      body.appendChild(humRow);
      body.appendChild(minMaxRow);
    }

    if (io.sensor) {
      const se = io.sensor;
      const readRow = nwCreateDpInput('Sensor readId', se.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.sensor = nwShcState.config.devices[index].io.sensor || {};
        nwShcState.config.devices[index].io.sensor.readId = val || null;
      });
      body.appendChild(readRow);
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
}

async function nwInitSmartHomeConfig() {
  nwAttachToolbarHandlers();
  // Hint: SmartHome must be enabled in the adapter settings, otherwise the VIS page stays empty.
  try {
    const hint = document.getElementById('nw-config-enabled-hint');
    if (hint) {
      const cfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());
      const enabled = !!(cfg && cfg.smartHome && cfg.smartHome.enabled);
      if (!enabled) {
        hint.style.display = 'block';
        hint.innerHTML = '⚠️ SmartHome ist deaktiviert – die VIS-Seite bleibt leer. Bitte im ioBroker Admin unter <strong>nexowatt-vis → SmartHome → „SmartHome aktivieren“</strong> einschalten.';
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
