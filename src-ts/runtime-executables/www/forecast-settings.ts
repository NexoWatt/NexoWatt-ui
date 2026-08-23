// @runtime-transpile
'use strict';

/**
 * Kundenfreundliche Wetter-/PV-Prognoseeinstellungen.
 *
 * - zeigt den aktuellen Forecast-Status aus forecast.pv.* bzw. dem unmittelbaren
 *   Open-Meteo-Fallback forecast.openMeteoPv.*,
 * - ersetzt das frühere JSON-Eingabefeld durch einen sicheren Tabelleneditor,
 * - hält den bestehenden settings.pvForecastArrays-Vertrag für Backend und
 *   Bestandsanlagen vollständig kompatibel.
 */
(function initForecastSettings(){
  type StateEntry = { value?: unknown; ts?: number };
  type PvArrayRow = {
    name: string;
    kwp: number;
    tiltDeg: number;
    azimuthDeg: number;
    lossPercent: number;
    inverterLimitW: number;
  };

  const startedAt = Date.now();
  const byId = <T extends HTMLElement = HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;
  const stateEntry = (key: string): StateEntry | null => {
    const state = (window as any).latestState || {};
    const entry = state[key];
    return entry && typeof entry === 'object' ? entry as StateEntry : null;
  };
  const hasState = (key: string): boolean => {
    const entry = stateEntry(key);
    return !!entry && Object.prototype.hasOwnProperty.call(entry, 'value');
  };
  const stateValue = (key: string, fallback: unknown = null): unknown => {
    const entry = stateEntry(key);
    return entry && Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : fallback;
  };
  const firstStateValue = (keys: string[], fallback: unknown = null): unknown => {
    for (const key of keys) if (hasState(key)) return stateValue(key, fallback);
    return fallback;
  };
  const asBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized)) return false;
    return fallback;
  };
  const finite = (value: unknown, fallback = 0): number => {
    const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : fallback;
  };
  const clamp = (value: unknown, min: number, max: number, fallback: number): number => Math.min(max, Math.max(min, finite(value, fallback)));
  const round = (value: number, digits: number): number => Number(value.toFixed(digits));

  const ORIENTATIONS = [
    { value: -180, label: 'Nord' },
    { value: -135, label: 'Nordost' },
    { value: -90, label: 'Ost' },
    { value: -45, label: 'Südost' },
    { value: 0, label: 'Süd' },
    { value: 45, label: 'Südwest' },
    { value: 90, label: 'West' },
    { value: 135, label: 'Nordwest' },
  ] as const;

  const nearestOrientation = (value: unknown): number => {
    const number = clamp(value, -180, 180, 0);
    const distance = (candidate: number): number => Math.abs((((candidate - number) + 540) % 360) - 180);
    return ORIENTATIONS.reduce<number>((best, item) => distance(item.value) < distance(best) ? item.value : best, ORIENTATIONS[0].value);
  };

  const normalizeRow = (value: Record<string, unknown> | null, index: number): PvArrayRow => ({
    name: String(value?.name ?? `PV-Fläche ${index + 1}`).trim() || `PV-Fläche ${index + 1}`,
    kwp: round(clamp(value?.kwp, 0, 100000, 0), 3),
    tiltDeg: round(clamp(value?.tiltDeg ?? value?.tilt, 0, 90, 30), 1),
    azimuthDeg: nearestOrientation(value?.azimuthDeg ?? value?.azimuth ?? 0),
    lossPercent: round(clamp(value?.lossPercent ?? value?.lossesPercent, 0, 60, 14), 1),
    inverterLimitW: Math.round(clamp(value?.inverterLimitW, 0, 100000000, 0)),
  });

  const parseRows = (raw: unknown): PvArrayRow[] => {
    let parsed: unknown = raw;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed || '[]'); } catch { return []; }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => normalizeRow(item, index))
      .filter((item) => item.kwp > 0 || item.name.trim() !== '');
  };

  const inputOrState = (id: string, key: string, fallback: unknown): unknown => {
    const input = byId<HTMLInputElement | HTMLTextAreaElement>(id);
    if (input && String(input.value ?? '').trim() !== '') return input.value;
    return stateValue(`settings.${key}`, fallback);
  };

  const legacyRow = (): PvArrayRow => normalizeRow({
    name: 'PV-Fläche 1',
    kwp: inputOrState('s_pvForecastInstalledKwp', 'pvForecastInstalledKwp', 0),
    tiltDeg: inputOrState('s_pvForecastTiltDeg', 'pvForecastTiltDeg', 30),
    azimuthDeg: inputOrState('s_pvForecastAzimuthDeg', 'pvForecastAzimuthDeg', 0),
    lossPercent: inputOrState('s_pvForecastLossPercent', 'pvForecastLossPercent', 14),
    inverterLimitW: inputOrState('s_pvForecastInverterLimitW', 'pvForecastInverterLimitW', 0),
  }, 0);

  const createNumberInput = (field: string, value: number, min: number, max: number, step: string, label: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'number';
    input.dataset.field = field;
    input.min = String(min);
    input.max = String(max);
    input.step = step;
    input.value = String(value);
    input.setAttribute('aria-label', label);
    return input;
  };

  const createCell = (label: string, control: HTMLElement): HTMLTableCellElement => {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    cell.appendChild(control);
    return cell;
  };

  let persistTimer: number | null = null;
  let lastHydrationFingerprint = '';
  let editorInitialized = false;

  const collectRows = (): PvArrayRow[] => {
    const body = byId<HTMLTableSectionElement>('nwPvArrayRows');
    if (!body) return [];
    return Array.from(body.querySelectorAll<HTMLTableRowElement>('tr')).map((row, index) => {
      const field = (name: string): HTMLInputElement | HTMLSelectElement | null => row.querySelector(`[data-field="${name}"]`);
      return normalizeRow({
        name: field('name')?.value,
        kwp: field('kwp')?.value,
        tiltDeg: field('tiltDeg')?.value,
        azimuthDeg: field('azimuthDeg')?.value,
        lossPercent: field('lossPercent')?.value,
        inverterLimitW: finite(field('inverterLimitKw')?.value, 0) * 1000,
      }, index);
    });
  };

  const updateRemoveButtons = (): void => {
    const body = byId<HTMLTableSectionElement>('nwPvArrayRows');
    if (!body) return;
    const buttons = Array.from(body.querySelectorAll<HTMLButtonElement>('.nw-pv-array-remove'));
    buttons.forEach((button) => { button.disabled = buttons.length <= 1; });
  };

  const setLegacyField = (id: string, value: unknown): void => {
    const input = byId<HTMLInputElement>(id);
    if (input) input.value = String(value ?? '');
  };

  const persistRows = (): void => {
    persistTimer = null;
    const rows = collectRows();
    const hidden = byId<HTMLTextAreaElement>('s_pvForecastArrays');
    if (!hidden) return;
    const serialized = JSON.stringify(rows);
    hidden.value = serialized;
    const first = rows[0] || normalizeRow(null, 0);
    setLegacyField('s_pvForecastInstalledKwp', first.kwp);
    setLegacyField('s_pvForecastTiltDeg', first.tiltDeg);
    setLegacyField('s_pvForecastAzimuthDeg', first.azimuthDeg);
    setLegacyField('s_pvForecastLossPercent', first.lossPercent);
    setLegacyField('s_pvForecastInverterLimitW', first.inverterLimitW);
    const validation = byId('nwPvArrayValidation');
    const configured = rows.filter((item) => item.kwp > 0).length;
    if (validation) {
      validation.textContent = configured > 0 ? '' : 'Bitte mindestens bei einer PV-Fläche eine installierte Leistung größer 0 kWp eintragen.';
      validation.classList.toggle('hidden', configured > 0);
    }
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
    lastHydrationFingerprint = `arrays:${serialized}`;
  };

  const markRefreshPending = (): void => {
    const status = byId('nwForecastStatus');
    const updated = byId('nwForecastUpdated');
    if (status) {
      status.textContent = 'Einstellungen werden übernommen …';
      status.dataset.state = 'off';
    }
    if (updated) updated.textContent = 'Neue Prognose wird abgefragt …';
  };

  const queuePersist = (): void => {
    markRefreshPending();
    if (persistTimer !== null) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(persistRows, 350);
  };

  const renderRows = (rows: PvArrayRow[]): void => {
    const body = byId<HTMLTableSectionElement>('nwPvArrayRows');
    if (!body) return;
    const values = rows.length ? rows : [normalizeRow(null, 0)];
    body.replaceChildren();
    values.forEach((value, index) => {
      const row = document.createElement('tr');
      row.dataset.index = String(index);

      const name = document.createElement('input');
      name.type = 'text';
      name.dataset.field = 'name';
      name.maxLength = 80;
      name.value = value.name;
      name.setAttribute('aria-label', `Bezeichnung PV-Fläche ${index + 1}`);
      row.appendChild(createCell('Bezeichnung', name));

      row.appendChild(createCell('Leistung (kWp)', createNumberInput('kwp', value.kwp, 0, 100000, '0.01', `Leistung PV-Fläche ${index + 1} in kWp`)));
      row.appendChild(createCell('Neigung (°)', createNumberInput('tiltDeg', value.tiltDeg, 0, 90, '1', `Dachneigung PV-Fläche ${index + 1}`)));

      const orientation = document.createElement('select');
      orientation.dataset.field = 'azimuthDeg';
      orientation.setAttribute('aria-label', `Ausrichtung PV-Fläche ${index + 1}`);
      ORIENTATIONS.forEach((item) => {
        const option = document.createElement('option');
        option.value = String(item.value);
        option.textContent = item.label;
        orientation.appendChild(option);
      });
      orientation.value = String(nearestOrientation(value.azimuthDeg));
      row.appendChild(createCell('Ausrichtung', orientation));

      row.appendChild(createCell('Verluste (%)', createNumberInput('lossPercent', value.lossPercent, 0, 60, '0.1', `Anlagenverluste PV-Fläche ${index + 1}`)));
      row.appendChild(createCell('WR-Grenze (kW)', createNumberInput('inverterLimitKw', round(value.inverterLimitW / 1000, 3), 0, 100000, '0.1', `Wechselrichtergrenze PV-Fläche ${index + 1} in kW`)));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'nw-pv-array-remove';
      remove.textContent = '×';
      remove.title = 'PV-Fläche entfernen';
      remove.setAttribute('aria-label', `PV-Fläche ${index + 1} entfernen`);
      remove.addEventListener('click', () => {
        const current = collectRows();
        if (current.length <= 1) return;
        current.splice(index, 1);
        renderRows(current.map((item, rowIndex) => ({ ...item, name: item.name || `PV-Fläche ${rowIndex + 1}` })));
        persistRows();
      });
      row.appendChild(createCell('Aktion', remove));

      row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select').forEach((control) => {
        control.addEventListener(control instanceof HTMLSelectElement ? 'change' : 'input', queuePersist);
        if (!(control instanceof HTMLSelectElement)) control.addEventListener('change', queuePersist);
      });
      body.appendChild(row);
    });
    updateRemoveButtons();
    editorInitialized = true;
  };

  const sourceRows = (): { rows: PvArrayRow[]; fingerprint: string } => {
    const hidden = byId<HTMLTextAreaElement>('s_pvForecastArrays');
    const hiddenRaw = String(hidden?.value || '').trim();
    const stateRaw = String(stateValue('settings.pvForecastArrays', '') || '').trim();
    const raw = hiddenRaw && hiddenRaw !== '[]' ? hiddenRaw : stateRaw;
    const rows = parseRows(raw);
    if (rows.length) return { rows, fingerprint: `arrays:${JSON.stringify(rows)}` };
    const legacy = legacyRow();
    return { rows: [legacy], fingerprint: `legacy:${JSON.stringify(legacy)}` };
  };

  const hydrateEditor = (force = false): void => {
    const editor = byId('nwPvArrayRows');
    if (!editor) return;
    if (!force && editor.contains(document.activeElement)) return;
    const next = sourceRows();
    if (!force && editorInitialized && next.fingerprint === lastHydrationFingerprint) return;
    renderRows(next.rows);
    lastHydrationFingerprint = next.fingerprint;
  };

  const setupArrayEditor = (): void => {
    const add = byId<HTMLButtonElement>('nwPvArrayAdd');
    if (add && add.dataset.bound !== '1') {
      add.dataset.bound = '1';
      add.addEventListener('click', () => {
        const rows = collectRows();
        rows.push(normalizeRow({ name: `PV-Fläche ${rows.length + 1}`, kwp: 0, tiltDeg: 30, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 0 }, rows.length));
        renderRows(rows);
        persistRows();
        const body = byId<HTMLTableSectionElement>('nwPvArrayRows');
        body?.querySelector<HTMLInputElement>('tr:last-child [data-field="name"]')?.focus();
      });
    }
    hydrateEditor(true);
  };

  const formatEnergyKwh = (value: unknown): string => {
    const kwh = Number(value);
    if (!Number.isFinite(kwh)) return '—';
    const decimals = Math.abs(kwh) >= 100 ? 0 : Math.abs(kwh) >= 10 ? 1 : 2;
    return `${kwh.toFixed(decimals)} kWh`;
  };

  const formatAge = (ageValue: unknown, updatedAtValue: unknown): string => {
    let ageMs = Number(ageValue);
    const updatedAt = Number(updatedAtValue);
    if (!Number.isFinite(ageMs) && Number.isFinite(updatedAt) && updatedAt > 0) ageMs = Math.max(0, Date.now() - updatedAt);
    if (!Number.isFinite(ageMs)) return '—';
    const minutes = Math.max(0, Math.round(ageMs / 60000));
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes} min`;
    const hours = Math.round(minutes / 6) / 10;
    return `vor ${String(hours).replace('.', ',')} h`;
  };

  const sourceLabel = (value: unknown): string => {
    const source = String(value || '').trim().toLowerCase();
    if (source.includes('open-meteo')) return 'Open-Meteo';
    if (source.includes('appcenter') || source.includes('datapoint') || source.includes('mapping')) return 'AppCenter-Datenpunkte';
    if (source === 'disabled') return 'Deaktiviert';
    if (!source || source === 'none') return 'Nicht verfügbar';
    return String(value);
  };

  const friendlyMessage = (value: unknown): string => {
    const raw = String(value || '').trim();
    const message = raw.toLowerCase();
    if (!raw) return '';
    if (message.includes('anlagenstandort nicht konfiguriert') || message.includes('location-not-configured')) {
      return 'Kein Anlagenstandort gefunden. Bitte im EOS-Admin einen Ort, eine Postleitzahl oder Koordinaten für den Systemstandort hinterlegen.';
    }
    if (message.includes('keine pv-fläche') || message.includes('pv-arrays-not-configured')) {
      return 'Es ist noch keine PV-Fläche mit einer installierten Leistung größer 0 kWp eingetragen.';
    }
    if (message.includes('api-key') || message.includes('apikey')) {
      return 'Für die gewerbliche Open-Meteo-Nutzung fehlt der API-Schlüssel.';
    }
    if (message.includes('http 401') || message.includes('http 403')) return 'Open-Meteo hat den Zugriff abgelehnt. Bitte API-Schlüssel und Nutzungsart prüfen.';
    if (message.includes('http 429')) return 'Open-Meteo hat zu viele Anfragen gemeldet. NexoWatt versucht es beim nächsten Aktualisierungszyklus erneut.';
    if (message.includes('timeout')) return 'Open-Meteo antwortet derzeit nicht rechtzeitig. NexoWatt versucht es automatisch erneut.';
    if (message.includes('keine zukünftigen einstrahlungswerte')) return 'Open-Meteo hat keine nutzbaren zukünftigen Einstrahlungswerte geliefert.';
    if (message.includes('nicht verfügbar und kein appcenter') || message.includes('kein pv forecast gemappt')) return 'Open-Meteo liefert aktuell keine Prognose und im AppCenter ist keine Ersatzquelle zugeordnet.';
    if (message.includes('deaktiviert')) return 'Die PV-Prognose ist deaktiviert.';
    return raw;
  };

  const normalizeSourceMode = (value: unknown): string => {
    const source = String(value || 'auto').trim().toLowerCase();
    if (['open-meteo', 'openmeteo', 'weather'].includes(source)) return 'open-meteo';
    if (['datapoint', 'mapping', 'appcenter', 'app-center'].includes(source)) return 'datapoint';
    if (['disabled', 'off', 'aus'].includes(source)) return 'disabled';
    return 'auto';
  };

  const updateVisibility = (): void => {
    const sourceInput = byId<HTMLSelectElement>('s_forecastSourceMode');
    const source = normalizeSourceMode(stateValue('settings.forecastSourceMode', sourceInput?.value || 'auto'));
    const fields = byId('nwOpenMeteoPvFields');

    // PV-Anlagendaten müssen auch vor dem Einschalten sichtbar und editierbar
    // sein. Die zentrale Settings-Runtime hydriert Checkboxen erst nach dem
    // DOMContentLoaded-Handler und sendet dabei kein change-Event. Deshalb wird
    // die Sichtbarkeit bei jedem Statuszyklus neu synchronisiert und hängt nur
    // von der ausgewählten Quelle ab.
    if (fields) {
      fields.classList.remove('hidden');
      fields.setAttribute('aria-hidden', 'false');
      fields.classList.toggle('is-not-used', !['auto', 'open-meteo'].includes(source));
    }
    const fallback = byId('s_forecastFallbackToDatapoints')?.closest('.row');
    if (fallback) fallback.classList.toggle('hidden', source !== 'auto');
  };

  const updateStatus = (): void => {
    updateVisibility();
    const effectiveValidFlag = asBoolean(stateValue('forecast.pv.valid', false), false);
    const openValidFlag = asBoolean(stateValue('forecast.openMeteoPv.valid', false), false);
    const effectivePointsRaw = stateValue('forecast.pv.points', undefined);
    const openPointsRaw = stateValue('forecast.openMeteoPv.points', undefined);
    const effectivePointsKnown = effectivePointsRaw !== undefined && Number.isFinite(Number(effectivePointsRaw));
    const openPointsKnown = openPointsRaw !== undefined && Number.isFinite(Number(openPointsRaw));
    const effectiveValid = effectiveValidFlag && (!effectivePointsKnown || Number(effectivePointsRaw) > 0);
    const openValid = openValidFlag && (!openPointsKnown || Number(openPointsRaw) > 0);
    const effectiveSourceRaw = String(stateValue('forecast.pv.source', '') || '').trim().toLowerCase();
    const effectiveUsesOpenMeteo = effectiveSourceRaw.includes('open-meteo');
    // Ist Open-Meteo die kanonische Quelle, werden Status, Standort und Energie
    // direkt aus dem Provider-Snapshot gelesen. Dieser ist sofort aktuell,
    // während forecast.pv.* erst im nächsten EMS-Zyklus nachziehen kann.
    const useOpenSnapshot = openValid && (!effectiveValid || effectiveUsesOpenMeteo);
    const valid = useOpenSnapshot ? openValid : (effectiveValid || openValid);
    const hasForecastStates = hasState('forecast.pv.valid') || hasState('forecast.openMeteoPv.valid');
    const source = useOpenSnapshot
      ? stateValue('forecast.openMeteoPv.source', 'open-meteo-gti')
      : firstStateValue(['forecast.pv.source', 'forecast.openMeteoPv.source'], 'none');
    const ageMs = useOpenSnapshot
      ? stateValue('forecast.openMeteoPv.ageMs', Number.NaN)
      : firstStateValue(['forecast.pv.ageMs', 'forecast.openMeteoPv.ageMs'], Number.NaN);
    const updatedAt = useOpenSnapshot
      ? stateValue('forecast.openMeteoPv.updatedAt', Number.NaN)
      : firstStateValue(['forecast.pv.updatedAt', 'forecast.openMeteoPv.updatedAt'], Number.NaN);
    const openStatusText = firstStateValue(['forecast.openMeteoPv.error', 'forecast.openMeteoPv.statusText'], '');
    const statusText = useOpenSnapshot
      ? firstStateValue(['forecast.openMeteoPv.statusText', 'forecast.openMeteoPv.error'], '')
      : (!valid && String(openStatusText || '').trim()
          ? openStatusText
          : firstStateValue(['forecast.pv.statusText', 'forecast.openMeteoPv.statusText', 'forecast.openMeteoPv.error'], ''));
    const mode = String(stateValue('settings.forecastSourceMode', byId<HTMLSelectElement>('s_forecastSourceMode')?.value || 'auto') || 'auto').toLowerCase();

    const status = byId('nwForecastStatus');
    const sourceNode = byId('nwForecastSource');
    const updated = byId('nwForecastUpdated');
    const error = byId('nwForecastError');
    if (status) {
      let label = 'Keine aktuelle Prognose';
      let state = 'warning';
      if (valid) { label = 'Prognose aktiv'; state = 'ok'; }
      else if ((effectiveValidFlag || openValidFlag)
        && ((effectivePointsKnown && Number(effectivePointsRaw) <= 0)
          || (openPointsKnown && Number(openPointsRaw) <= 0))) {
        label = 'Prognose noch ohne Werte';
        state = 'warning';
      }
      else if (mode === 'disabled') { label = 'Deaktiviert'; state = 'off'; }
      else if (!hasForecastStates && Date.now() - startedAt < 12000) { label = 'Adapterdaten werden verbunden …'; state = 'off'; }
      else if (!hasForecastStates) { label = 'Keine Prognosedaten empfangen'; state = 'warning'; }
      status.textContent = label;
      status.dataset.state = state;
    }
    if (sourceNode) sourceNode.textContent = sourceLabel(source);
    if (updated) updated.textContent = formatAge(ageMs, updatedAt);

    const prefix = useOpenSnapshot ? 'forecast.openMeteoPv.' : 'forecast.pv.';
    const energyValue = (suffix: string): unknown => {
      const preferred = stateValue(`${prefix}${suffix}`, undefined);
      if (preferred !== undefined) return preferred;
      return firstStateValue([`forecast.pv.${suffix}`, `forecast.openMeteoPv.${suffix}`], Number.NaN);
    };
    const e6 = byId('nwForecast6h'); if (e6) e6.textContent = valid ? formatEnergyKwh(energyValue('kwhNext6h')) : '—';
    const e12 = byId('nwForecast12h'); if (e12) e12.textContent = valid ? formatEnergyKwh(energyValue('kwhNext12h')) : '—';
    const e24 = byId('nwForecast24h'); if (e24) e24.textContent = valid ? formatEnergyKwh(energyValue('kwhNext24h')) : '—';
    const points = byId('nwForecastPoints');
    if (points) {
      const value = Number(energyValue('points'));
      points.textContent = Number.isFinite(value) && value > 0 ? String(Math.round(value)) : '—';
    }
    const location = byId('nwForecastLocation');
    if (location) {
      const label = String(firstStateValue(['forecast.openMeteoPv.locationText', 'forecast.pv.locationText'], '') || '').trim();
      const locationSource = String(firstStateValue(['forecast.openMeteoPv.locationSource', 'forecast.pv.locationSource'], '') || '').trim().toLowerCase();
      const lat = Number(firstStateValue(['forecast.openMeteoPv.latitude', 'forecast.pv.latitude'], Number.NaN));
      const lon = Number(firstStateValue(['forecast.openMeteoPv.longitude', 'forecast.pv.longitude'], Number.NaN));
      const coordinates = Number.isFinite(lat) && Number.isFinite(lon) && (Math.abs(lat) > 1e-9 || Math.abs(lon) > 1e-9)
        ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '';
      const adminFallback = locationSource.startsWith('system') ? 'EOS Admin / Systemstandort' : '';
      location.textContent = label || coordinates || adminFallback || 'EOS Admin / Systemstandort';
    }

    const message = friendlyMessage(statusText);
    if (error) {
      error.textContent = valid || mode === 'disabled' ? '' : message;
      error.classList.toggle('hidden', valid || mode === 'disabled' || !message);
    }

    hydrateEditor(false);
  };

  const setup = (): void => {
    const source = byId<HTMLSelectElement>('s_forecastSourceMode');
    const enabled = byId<HTMLInputElement>('s_openMeteoPvEnabled');
    if (source && source.dataset.nwForecastBound !== '1') {
      source.dataset.nwForecastBound = '1';
      source.addEventListener('change', () => { updateVisibility(); updateStatus(); });
    }
    if (enabled && enabled.dataset.nwForecastBound !== '1') {
      enabled.dataset.nwForecastBound = '1';
      enabled.addEventListener('change', () => { updateVisibility(); updateStatus(); });
    }
    setupArrayEditor();
    updateVisibility();
    updateStatus();
    window.setInterval(() => {
      // Settings werden asynchron aus /api/state hydriert. Sichtbarkeit,
      // Tabelleninhalt und Status deshalb gemeinsam nachziehen.
      updateVisibility();
      updateStatus();
    }, 3000);
  };

  try {
    (window as any).nwForecastSettings = { setup, updateVisibility, updateStatus, hydrateEditor };
  } catch { /* optional */ }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
