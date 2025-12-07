/* SmartHomeConfig VIS-Konfig-Seite (A10, Editor)
 * Bearbeiten von Räumen, Funktionen und Geräten inkl. Datenpunkt-Picker.
 */

const nwShcState = {
  config: null,
  originalJson: null,
  dirty: false,
};

function nwGetRoomLabel(room) {
  if (!room) return '';
  return room.name || room.id || '';
}

function nwGetFunctionLabel(fn) {
  if (!fn) return '';
  return fn.name || fn.id || '';
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

async function nwSaveSmartHomeConfig() {
  if (!nwShcState.config) return;
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
  nwShcState.originalJson = JSON.stringify(nwShcState.config);
  nwMarkDirty(false);
  nwRenderAll();
  nwSetStatus('Konfiguration geladen', 'ok');
}

function nwRenderAll() {
  const cfg = nwShcState.config || { rooms: [], functions: [], devices: [] };
  nwRenderRoomsReadOnly(cfg.rooms || []);
  nwRenderFunctionsReadOnly(cfg.functions || []);
  nwRenderDevicesEditor(cfg.devices || [], cfg.rooms || [], cfg.functions || []);
}

/* --- Read-only Listen für Räume & Funktionen (wie zuvor) --- */

function nwRenderRoomsReadOnly(rooms) {
  const list = document.getElementById('nw-config-rooms');
  const empty = document.getElementById('nw-config-rooms-empty');
  if (!list || !empty) return;

  list.innerHTML = '';

  if (!rooms || !rooms.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  rooms
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(room => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const primary = document.createElement('div');
      primary.className = 'nw-config-row__primary';
      primary.textContent = room.name || room.id || 'Raum';

      const meta = document.createElement('div');
      meta.className = 'nw-config-row__meta';
      const parts = [];
      if (room.id) parts.push('ID: ' + room.id);
      if (typeof room.order === 'number') parts.push('Reihenfolge: ' + room.order);
      if (room.icon) parts.push('Icon: ' + room.icon);
      meta.textContent = parts.join(' · ');

      row.appendChild(primary);
      row.appendChild(meta);

      list.appendChild(row);
    });
}

function nwRenderFunctionsReadOnly(functions) {
  const list = document.getElementById('nw-config-functions');
  const empty = document.getElementById('nw-config-functions-empty');
  if (!list || !empty) return;

  list.innerHTML = '';

  if (!functions || !functions.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  functions
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(fn => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const primary = document.createElement('div');
      primary.className = 'nw-config-row__primary';
      primary.textContent = fn.name || fn.id || 'Funktion';

      const meta = document.createElement('div');
      meta.className = 'nw-config-row__meta';
      const parts = [];
      if (fn.id) parts.push('ID: ' + fn.id);
      if (typeof fn.order === 'number') parts.push('Reihenfolge: ' + fn.order);
      if (fn.icon) parts.push('Icon: ' + fn.icon);
      meta.textContent = parts.join(' · ');

      row.appendChild(primary);
      row.appendChild(meta);

      list.appendChild(row);
    });
}

/* --- Gerätekarten mit Editor-Feldern --- */

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

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nw-config-dp-button';
  btn.textContent = '…';
  btn.title = 'Datenpunkt auswählen';
  btn.addEventListener('click', () => {
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

  wrapper.appendChild(input);
  wrapper.appendChild(btn);

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

    const header = document.createElement('div');
    header.className = 'nw-config-card__header';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = dev.alias || dev.id || 'Gerät';

    const subtitle = document.createElement('div');
    subtitle.className = 'nw-config-card__subtitle';
    const room = roomMap[dev.roomId];
    const fn = fnMap[dev.functionId];
    const roomLabel = room ? nwGetRoomLabel(room) : (dev.roomId || 'Raum?');
    const fnLabel = fn ? nwGetFunctionLabel(fn) : (dev.functionId || 'Funktion?');
    const typeLabel = dev.type || 'Typ?';
    subtitle.textContent = roomLabel + ' · ' + fnLabel + ' · ' + typeLabel;

    header.appendChild(title);
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
    const typeOptions = ['', 'switch', 'dimmer', 'blind', 'rtr', 'sensor', 'scene', 'logicStatus'];
    typeOptions.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val || '(kein Typ)';
      if (dev.type === val) opt.selected = true;
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

  if (!term) {
    const hint = document.createElement('div');
    hint.className = 'nw-dp-result__meta';
    hint.textContent = 'Bitte einen Suchbegriff eingeben.';
    results.appendChild(hint);
    return;
  }

  const info = document.createElement('div');
  info.className = 'nw-dp-result__meta';
  info.textContent = 'Suche…';
  results.appendChild(info);

  try {
    const url = '/api/smarthome/dpsearch?q=' + encodeURIComponent(term) + '&limit=50';
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

  // Bei initialem Wert direkt suchen
  if (state.input.value.trim()) {
    nwRunDatapointSearch(state.input.value.trim(), state);
  } else {
    const hint = document.createElement('div');
    hint.className = 'nw-dp-result__meta';
    hint.textContent = 'Bitte einen Suchbegriff eingeben.';
    state.results.appendChild(hint);
  }

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
}

async function nwInitSmartHomeConfig() {
  nwAttachToolbarHandlers();
  await nwReloadSmartHomeConfig();
}

document.addEventListener('DOMContentLoaded', () => {
  nwInitSmartHomeConfig();
});
