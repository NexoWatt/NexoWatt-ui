/* SmartHomeConfig VIS-Konfig-Seite (B3, read-only)
 * Zeigt Räume, Funktionen und Geräte aus dem SmartHomeConfig-Modell an.
 */

async function nwFetchSmartHomeConfig() {
  try {
    const res = await fetch('/api/smarthome/config');
    if (!res.ok) {
      console.error('SmartHomeConfig request failed:', res.status, res.statusText);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok || !data.config) {
      console.warn('SmartHomeConfig payload invalid', data);
      return null;
    }
    return data.config;
  } catch (e) {
    console.error('SmartHomeConfig error:', e);
    return null;
  }
}

function nwRenderRooms(rooms) {
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

      const name = document.createElement('div');
      name.className = 'nw-config-row__primary';
      name.textContent = room.name || room.id || 'Raum';

      const meta = document.createElement('div');
      meta.className = 'nw-config-row__meta';
      const parts = [];
      if (room.id) parts.push('ID: ' + room.id);
      if (room.floor) parts.push('Etage: ' + room.floor);
      if (room.icon) parts.push('Icon: ' + room.icon);
      meta.textContent = parts.join(' · ');

      const status = document.createElement('div');
      status.className = 'nw-config-row__status';
      status.textContent = room.enabled === false ? 'deaktiviert' : 'aktiv';

      row.appendChild(name);
      row.appendChild(meta);
      row.appendChild(status);
      list.appendChild(row);
    });
}

function nwRenderFunctions(funcs) {
  const list = document.getElementById('nw-config-functions');
  const empty = document.getElementById('nw-config-functions-empty');
  if (!list || !empty) return;

  list.innerHTML = '';

  if (!funcs || !funcs.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  funcs
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(fn => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const name = document.createElement('div');
      name.className = 'nw-config-row__primary';
      name.textContent = fn.name || fn.id || 'Funktion';

      const meta = document.createElement('div');
      meta.className = 'nw-config-row__meta';
      const parts = [];
      if (fn.id) parts.push('ID: ' + fn.id);
      if (fn.icon) parts.push('Icon: ' + fn.icon);
      meta.textContent = parts.join(' · ');

      const status = document.createElement('div');
      status.className = 'nw-config-row__status';
      status.textContent = fn.enabled === false ? 'deaktiviert' : 'aktiv';

      row.appendChild(name);
      row.appendChild(meta);
      row.appendChild(status);
      list.appendChild(row);
    });
}

function nwRenderDevices(devices) {
  const grid = document.getElementById('nw-config-devices');
  const empty = document.getElementById('nw-config-devices-empty');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!devices || !devices.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  devices.forEach(dev => {
    const card = document.createElement('div');
    card.className = 'nw-config-card';

    const header = document.createElement('div');
    header.className = 'nw-config-card__header';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = dev.alias || dev.id || 'Gerät';

    const subtitle = document.createElement('div');
    subtitle.className = 'nw-config-card__subtitle';
    const roomLabel = dev.roomId || 'Raum?';
    const fnLabel = dev.functionId || 'Funktion?';
    const typeLabel = dev.type || 'Typ?';
    subtitle.textContent = roomLabel + ' · ' + fnLabel + ' · ' + typeLabel;

    header.appendChild(title);
    header.appendChild(subtitle);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'nw-config-card__body';

    const idRow = document.createElement('div');
    idRow.className = 'nw-config-card__row';
    idRow.textContent = 'ID: ' + (dev.id || '-');
    body.appendChild(idRow);

    if (dev.icon) {
      const iconRow = document.createElement('div');
      iconRow.className = 'nw-config-card__row';
      iconRow.textContent = 'Icon: ' + dev.icon;
      body.appendChild(iconRow);
    }

    if (dev.size) {
      const sizeRow = document.createElement('div');
      sizeRow.className = 'nw-config-card__row';
      sizeRow.textContent = 'Größe: ' + dev.size.toUpperCase();
      body.appendChild(sizeRow);
    }

    const beh = dev.behavior || {};
    const behaviorRow = document.createElement('div');
    behaviorRow.className = 'nw-config-card__row';
    behaviorRow.textContent = 'Verhalten: ' + (beh.readOnly ? 'Nur Anzeige' : 'Bedienbar');
    body.appendChild(behaviorRow);

    // IO summary
    const io = dev.io || {};
    const ioLines = [];

    if (io.switch && (io.switch.readId || io.switch.writeId)) {
      ioLines.push('switch: ' + (io.switch.readId || io.switch.writeId));
    }
    if (io.level && (io.level.readId || io.level.writeId)) {
      const parts = [];
      if (io.level.readId) parts.push('read=' + io.level.readId);
      if (io.level.writeId) parts.push('write=' + io.level.writeId);
      ioLines.push('level: ' + parts.join(', '));
    }
    if (io.cover && (io.cover.upId || io.cover.downId || io.cover.stopId)) {
      const parts = [];
      if (io.cover.upId) parts.push('up=' + io.cover.upId);
      if (io.cover.downId) parts.push('down=' + io.cover.downId);
      if (io.cover.stopId) parts.push('stop=' + io.cover.stopId);
      ioLines.push('cover: ' + parts.join(', '));
    }
    if (io.climate && (io.climate.currentTempId || io.climate.setpointId || io.climate.modeId || io.climate.humidityId)) {
      const parts = [];
      if (io.climate.currentTempId) parts.push('Takt=' + io.climate.currentTempId);
      if (io.climate.setpointId) parts.push('Soll=' + io.climate.setpointId);
      if (io.climate.modeId) parts.push('Modus=' + io.climate.modeId);
      if (io.climate.humidityId) parts.push('Feuchte=' + io.climate.humidityId);
      ioLines.push('climate: ' + parts.join(', '));
    }
    if (io.sensor && io.sensor.readId) {
      ioLines.push('sensor: ' + io.sensor.readId);
    }

    if (ioLines.length) {
      const ioRow = document.createElement('div');
      ioRow.className = 'nw-config-card__row nw-config-card__row--io';
      ioRow.textContent = 'IO: ' + ioLines.join(' | ');
      body.appendChild(ioRow);
    }

    card.appendChild(body);

    grid.appendChild(card);
  });
}

async function nwInitSmartHomeConfig() {
  const cfg = await nwFetchSmartHomeConfig();
  if (!cfg) {
    console.warn('No SmartHomeConfig available');
    return;
  }
  nwRenderRooms(cfg.rooms || []);
  nwRenderFunctions(cfg.functions || []);
  nwRenderDevices(cfg.devices || []);
}

document.addEventListener('DOMContentLoaded', () => {
  nwInitSmartHomeConfig();
});
