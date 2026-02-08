/* NexoWatt EMS Apps (Installer) – Web UI */
(function () {
  'use strict';

  const els = {
    status: document.getElementById('nw-emsapps-status'),
    save: document.getElementById('nw-emsapps-save'),
    reload: document.getElementById('nw-emsapps-reload'),
    validate: document.getElementById('nw-emsapps-validate'),

    appsList: document.getElementById('appsList'),
    appsEmpty: document.getElementById('appsEmpty'),
    nwDevicesQuickSetup: document.getElementById('nwDevicesQuickSetup'),


    gridConnectionPower: document.getElementById('gridConnectionPower'),
    gridPointPowerId: document.getElementById('gridPointPowerId'),
    gridPointPowerIdDisplay: document.getElementById('gridPointPowerIdDisplay'),
    gridInvertGrid: document.getElementById('gridInvertGrid'),

    // Energiefluss-Monitor (Tab)
    flowSubtractEvFromBuilding: document.getElementById('flowSubtractEvFromBuilding'),
    flowInvertGrid: document.getElementById('flowInvertGrid'),
    flowInvertBattery: document.getElementById('flowInvertBattery'),
    flowInvertPv: document.getElementById('flowInvertPv'),
    flowInvertEv: document.getElementById('flowInvertEv'),
    flowGridShowNet: document.getElementById('flowGridShowNet'),
      schedulerIntervalMs: document.getElementById('schedulerIntervalMs'),

    dpFlow: document.getElementById('dpFlow'),
    flowConsumers: document.getElementById('flowConsumers'),
    flowProducers: document.getElementById('flowProducers'),
    dpTariffs: document.getElementById('dpTariffs'),
    dpLive: document.getElementById('dpLive'),
    dpWeather: document.getElementById('dpWeather'),
    storageTable: document.getElementById('storageTable'),

    storageControlMode: document.getElementById('storageControlMode'),
    storageCapacityKWh: document.getElementById('storageCapacityKWh'),

    // Speicherfarm
    storageFarmMode: document.getElementById('storageFarmMode'),
    storageFarmSchedulerIntervalMs: document.getElementById('storageFarmSchedulerIntervalMs'),
    storageFarmStorages: document.getElementById('storageFarmStorages'),
    storageFarmAddStorage: document.getElementById('storageFarmAddStorage'),
    storageFarmGroupsCard: document.getElementById('storageFarmGroupsCard'),
    storageFarmGroups: document.getElementById('storageFarmGroups'),
    storageFarmAddGroup: document.getElementById('storageFarmAddGroup'),
    rawPatch: document.getElementById('rawPatch'),

    // MultiUse (Speicher SoC‑Zonen)
    muStorageEnabled: document.getElementById('muStorageEnabled'),
    muReserveEnabled: document.getElementById('muReserveEnabled'),
    muReserveMinSoc: document.getElementById('muReserveMinSoc'),
    muReserveTargetSoc: document.getElementById('muReserveTargetSoc'),
    muPeakEnabled: document.getElementById('muPeakEnabled'),
    muLskMinSoc: document.getElementById('muLskMinSoc'),
    muLskMaxSoc: document.getElementById('muLskMaxSoc'),
    muSelfEnabled: document.getElementById('muSelfEnabled'),
    muSelfMinSoc: document.getElementById('muSelfMinSoc'),
    muSelfMaxSoc: document.getElementById('muSelfMaxSoc'),
    muSelfTargetGridW: document.getElementById('muSelfTargetGridW'),
    muSelfDeadbandW: document.getElementById('muSelfDeadbandW'),
    muStorageSummary: document.getElementById('muStorageSummary'),

    // §14a
    para14aMode: document.getElementById('para14aMode'),
    para14aMinPerDeviceW: document.getElementById('para14aMinPerDeviceW'),
    para14aActiveId: document.getElementById('para14aActiveId'),
    para14aEmsSetpointWId: document.getElementById('para14aEmsSetpointWId'),
    para14aConsumers: document.getElementById('para14aConsumers'),
    addPara14aConsumer: document.getElementById('addPara14aConsumer'),

    // Tabs
    tabs: document.getElementById('nw-ems-tabs'),

    // EVCS / Stations
    evcsCount: document.getElementById('evcsCount'),
    evcsMaxPowerKw: document.getElementById('evcsMaxPowerKw'),
    cmGoalStrategy: document.getElementById('cmGoalStrategy'),
    evcsList: document.getElementById('evcsList'),
    stationGroups: document.getElementById('stationGroups'),
    addStationGroup: document.getElementById('addStationGroup'),
    ocppAutoDetect: document.getElementById('ocppAutoDetect'),
    ocppMapExisting: document.getElementById('ocppMapExisting'),

    // Status
    emsStatus: document.getElementById('emsStatus'),
    chargingDiag: document.getElementById('chargingDiag'),
    refreshChargingDiag: document.getElementById('refreshChargingDiag'),
    stationsDiag: document.getElementById('stationsDiag'),
    refreshStationsDiag: document.getElementById('refreshStationsDiag'),

    // Backup (Export/Import)
    backupExport: document.getElementById('nw-backup-export'),
    backupImport: document.getElementById('nw-backup-import'),
    backupRestore: document.getElementById('nw-backup-restore'),
    backupFile: document.getElementById('nw-backup-file'),
    backupInfo: document.getElementById('nw-backup-info'),
    backupStatus: document.getElementById('nw-backup-status'),

    // Budget/Gates (Charging)
    chargingBudget: document.getElementById('chargingBudget'),
    refreshChargingBudget: document.getElementById('refreshChargingBudget'),

    // Modal
    dpModal: document.getElementById('dpModal'),
    dpClose: document.getElementById('dpClose'),
    dpSearch: document.getElementById('dpSearch'),
    dpSearchBtn: document.getElementById('dpSearchBtn'),
    dpRootBtn: document.getElementById('dpRootBtn'),
    dpUpBtn: document.getElementById('dpUpBtn'),
    dpBreadcrumb: document.getElementById('dpBreadcrumb'),
    dpTree: document.getElementById('dpTree'),
    dpResults: document.getElementById('dpResults')
    ,
    // Thermal control
    thermalHoldMinutes: document.getElementById('thermalHoldMinutes'),
    thermalDevices: document.getElementById('thermalDevices'),
    bhkwDevices: document.getElementById('bhkwDevices'),
    generatorDevices: document.getElementById('generatorDevices'),

    // Threshold control
    thresholdRules: document.getElementById('thresholdRules'),
    thresholdAddRule: document.getElementById('thresholdAddRule'),
    thresholdResetRules: document.getElementById('thresholdResetRules'),

    // Relay control
    relayControls: document.getElementById('relayControls'),
    relayAdd: document.getElementById('relayAdd'),
    relayReset: document.getElementById('relayReset'),

    // Grid-Constraints / Netzlimits
    gridConstraintsMeter: document.getElementById('gridConstraintsMeter'),
    gridConstraintsRlm: document.getElementById('gridConstraintsRlm'),
    gridConstraintsZero: document.getElementById('gridConstraintsZero'),
    gridConstraintsPvCurtail: document.getElementById('gridConstraintsPvCurtail'),

    gotoEvuPvTab: document.getElementById('gotoEvuPvTab')
  };

  // Keep grid sign checkboxes in sync (Allgemein vs Energiefluss)
  if (els.gridInvertGrid && els.flowInvertGrid) {
    const syncGridInvert = (val) => {
      els.gridInvertGrid.checked = !!val;
      els.flowInvertGrid.checked = !!val;
    };

    els.gridInvertGrid.addEventListener('change', () => syncGridInvert(els.gridInvertGrid.checked));
    els.flowInvertGrid.addEventListener('change', () => syncGridInvert(els.flowInvertGrid.checked));
  }

  // Phase 2: App-Center (install + enable per capability)
  const APP_CATALOG = [
    { id: 'charging', label: 'Lademanagement', desc: 'PV-Überschussladen, Budget-Verteilung, Ladepunkte/Ports (AC/DC) + Stationsgruppen', mandatory: false },
    { id: 'peak', label: 'Peak-Shaving', desc: 'Lastspitzenkappung / Import-Limit', mandatory: false },
    { id: 'storage', label: 'Speicherregelung', desc: 'Eigenverbrauch / Speicher-Setpoints (herstellerunabhängig)', mandatory: false },
    { id: 'storagefarm', label: 'Speicherfarm', desc: 'Mehrere Speichersysteme als Pool/Gruppen', mandatory: false },
    { id: 'thermal', label: 'Thermik & Power-to-Heat', desc: 'PV-Überschuss-Steuerung für Wärmepumpe/Klima/Heizstab (Setpoint, On/Off oder SG-Ready) inkl. Schnellsteuerung', mandatory: false },
    { id: 'bhkw', label: 'BHKW', desc: 'BHKW-Steuerung (Start/Stop, SoC-geführt) mit Schnellsteuerung', mandatory: false },
    { id: 'generator', label: 'Generator', desc: 'Generator-Steuerung (Notstrom/Netzparallelbetrieb, SoC-geführt) mit Schnellsteuerung', mandatory: false },
    { id: 'threshold', label: 'Schwellwertsteuerung', desc: 'Regeln (Wenn X > Y dann Schalten/Setzen) – optional mit Endkunden-Anpassung', mandatory: false },
    { id: 'relay', label: 'Relaissteuerung', desc: 'Manuelle Relais / generische Ausgänge (optional endkundentauglich)', mandatory: false },
    { id: 'grid', label: 'Netzlimits', desc: 'Netzrestriktionen (RLM/0‑Einspeisung/Import‑Limits)', mandatory: false },
    { id: 'tariff', label: 'Tarife', desc: 'Preis-Signal / Ladepark-Budget / Netzladung-Freigabe', mandatory: true },
    { id: 'para14a', label: '§14a Steuerung', desc: 'Abregelung/Leistungsdeckel für steuerbare Verbraucher (falls genutzt)', mandatory: false },
    { id: 'multiuse', label: 'MultiUse', desc: 'Speicher Multi‑Use (SoC‑Zonen: Notstrom/LSK/Eigenverbrauch)', mandatory: false }
  ];

  // Energiefluss-Monitor: Basis-Datapoints (VIS & Algorithmen)
  const FLOW_BASE_DP_FIELDS = [
    { key: 'gridBuyPower', label: 'Netz Bezug (W/kW)', placeholder: '… (Import)', required: true, power: true,
      hint: 'Pflicht: Import-Leistung am Netzverknüpfungspunkt (NVP).' },
    { key: 'gridSellPower', label: 'Netz Einspeisung (W/kW)', placeholder: '… (Export)', required: true, power: true,
      hint: 'Pflicht: Export-Leistung am Netzverknüpfungspunkt (NVP).' },

    // PV: Optional – wenn leer wird automatisch summiert (Devices + optional DC-PV aus Speicherfarm)
    { key: 'pvPower', label: 'PV Leistung (W/kW)', placeholder: 'leer lassen für Auto‑Summe', auto: true, power: true,
      hintAuto: 'Auto: PV‑Summe aus allen PV‑Wechselrichtern (nexowatt-devices) + DC‑PV aus Speicherfarm (wenn aktiv). Zusätzliche Erzeuger separat im Tab „Erzeuger“.',
      hintOverride: 'Override aktiv: PV wird aus diesem Datenpunkt genommen (Auto‑Summe inkl. DC‑PV wird deaktiviert).' },

    // Gebäude: Optional – wenn leer wird Verbrauch bilanziert (PV + Netz + Batterie + Erzeuger)
    { key: 'consumptionTotal', label: 'Verbrauch Gesamt (W/kW)', placeholder: 'leer lassen für Auto‑Bilanz', auto: true, power: true,
      hintAuto: 'Auto: Gebäudeverbrauch wird bilanziert (PV + Netz + Batterie + Erzeuger‑Slots).',
      hintOverride: 'Override aktiv: Gebäudeverbrauch wird direkt aus diesem Datenpunkt verwendet (Bilanz deaktiviert).' },

    // EV: Optional – wenn leer wird EVCS‑Summe genutzt (wenn EVCS aktiv)
    { key: 'consumptionEvcs', label: 'E‑Mobilität (W/kW) (optional)', placeholder: 'optional – leer = EVCS‑Summe', auto: true, power: true,
      hintAuto: 'Auto: E‑Mobilität wird aus EVCS‑Summenleistung genutzt (wenn EVCS aktiv).',
      hintOverride: 'Override aktiv: EV‑Leistung wird aus diesem Datenpunkt genutzt.' },

    // Batterie: Optional – wenn leer werden Werte aus Speicher/Speicherfarm genutzt
    { key: 'storageChargePower', label: 'Batterie Laden (W/kW)', placeholder: 'optional – leer = Auto', auto: true, power: true,
      hintAuto: 'Auto: Ladeleistung kommt aus Speicher / Speicherfarm. Override optional.',
      hintOverride: 'Override aktiv: Ladeleistung wird aus diesem Datenpunkt genutzt.' },
    { key: 'storageDischargePower', label: 'Batterie Entladen (W/kW)', placeholder: 'optional – leer = Auto', auto: true, power: true,
      hintAuto: 'Auto: Entladeleistung kommt aus Speicher / Speicherfarm. Override optional.',
      hintOverride: 'Override aktiv: Entladeleistung wird aus diesem Datenpunkt genutzt.' },

    // Fallback, falls ein System nur einen Signed‑Leistungs‑DP liefert
    { key: 'batteryPower', label: 'Batterie Leistung (W/kW) (Fallback, Vorzeichen)', placeholder: 'optional – Signed (-Laden/+Entladen)', power: true,
      hint: 'Optional: Nur verwenden, wenn kein Laden/Entladen getrennt verfügbar ist (Signed: - Laden / + Entladen).' },

    { key: 'storageSoc', label: 'Speicher SoC (%)', placeholder: 'leer lassen für Auto', auto: true,
      hintAuto: 'Auto: SoC kommt aus Speicher / Speicherfarm (Median/Ø). Override möglich.',
      hintOverride: 'Override aktiv: SoC wird aus diesem Datenpunkt genutzt.' }
  ];

  // Energiefluss‑Monitor: optionale Verbraucher/Erzeuger
  // - erscheinen in der VIS nur, wenn ein Datenpunkt gesetzt ist
  // - pro Slot kann ein Name vergeben werden
  // Wunsch: Verbraucher max. 10, Erzeuger max. 5
  const FLOW_CONSUMER_SLOT_COUNT = 10;
  const FLOW_PRODUCER_SLOT_COUNT = 5;

  // Icon-Auswahl für optionale Verbraucher/Erzeuger (Emoji – leichtgewichtig, schnell erweiterbar)
  // Speichert den Icon-String direkt in der Config.
    const FLOW_ICON_CHOICES = [
    // Der Default ist bewusst als „Icon…“ betitelt, damit klar ist, dass dies ein Icon‑Selector ist.
    { value:'', label:'Icon… (Auto)' },
    { value:'🔌', label:'Steckdose' },
    { value:'⚙️', label:'Motor' },
    { value:'🏭', label:'Industrie' },
    { value:'🖥️', label:'Server/IT' },
    { value:'🧰', label:'Werkstatt' },
    { value:'🔧', label:'Service' },
    { value:'🏗️', label:'Baustelle' },
    { value:'🌡️', label:'Temperatur' },
    { value:'♨️', label:'Wärme' },
    { value:'🔥', label:'Heizung' },
    { value:'💨', label:'Klima/Ventilation' },
    { value:'💧', label:'Pumpe/Wasser' },
    { value:'🧊', label:'Kälte' },
    { value:'💡', label:'Licht' },
    { value:'🧺', label:'Waschen' },
    { value:'🍳', label:'Küche' },
    { value:'🧯', label:'Sicherheit' },
    { value:'🔋', label:'Speicher' },
    { value:'🪫', label:'Batterie leer' },
    { value:'🚗', label:'Auto' },
    { value:'🚚', label:'LKW/Depot' },
    { value:'🚜', label:'Land/Traktor' },
    { value:'⚡', label:'Elektrisch' },
    { value:'☀️', label:'PV' },
    { value:'🌬️', label:'Wind' },
    { value:'🌀', label:'Inverter' },
    { value:'🏢', label:'Gebäude' },
    { value:'🏠', label:'Haus' },
  ];

  const TARIFF_DP_FIELDS = [
    { key: 'priceCurrent', label: 'Tarif Preis aktuell (€/kWh)', placeholder: 'Provider-State (optional)' },
    { key: 'priceAverage', label: 'Tarif Preis Durchschnitt (€/kWh)', placeholder: 'Provider-State (optional)' },
    { key: 'priceTodayJson', label: 'Stundenpreise heute (JSON)', placeholder: 'Provider-State (optional)' },
    { key: 'priceTomorrowJson', label: 'Stundenpreise morgen (JSON)', placeholder: 'Provider-State (optional)' },

    // PV Forecast (für PV-aware Netzladen / Speicher-Optimierung)
    // Erwartet: JSON (String) vom Forecast-Provider (z.B. forecast.solar / Solcast / eigener Adapter)
    { key: 'pvForecastTodayJson', label: 'PV Forecast heute (JSON)', placeholder: 'Provider-State (optional)' },
    { key: 'pvForecastTomorrowJson', label: 'PV Forecast morgen (JSON)', placeholder: 'Provider-State (optional)' }
  ];

  // Live / Kennzahlen (für die unteren Kacheln in der VIS)
  // Hinweis: Wenn diese DPs leer bleiben, kann der Adapter (falls History/Influx verfügbar) kWh-Werte automatisch aus Leistung integrieren.
  const LIVE_DP_FIELDS = [
    { key: 'productionEnergyKwh', label: 'PV Energie gesamt (kWh)', placeholder: 'kWh Counter (optional)' },
    { key: 'consumptionEnergyKwh', label: 'Verbrauch Energie gesamt (kWh)', placeholder: 'kWh Counter (optional)' },
    { key: 'gridEnergyKwh', label: 'Netz Energie gesamt (kWh)', placeholder: 'kWh Counter (optional)' },
    { key: 'evcsLastChargeKwh', label: 'EVCS letzte Ladung (kWh)', placeholder: 'optional (sonst Historie)' },
    { key: 'co2Savings', label: 'CO₂ Ersparnis (t/kg) (optional)', placeholder: 'optional' },
    { key: 'evcsStatus', label: 'Ladestation Status (optional)', placeholder: 'z.B. Available/Charging' },
    { key: 'gridFrequency', label: 'Netzfrequenz (Hz) (optional)', placeholder: 'optional' },
    { key: 'gridVoltage', label: 'Netzspannung (V) (optional)', placeholder: 'optional' }
  ];

  // Wetter (optional)
  // Plug&Play: Standardmäßig befüllt der nexowatt-vis Adapter die Wetter-States selbst (Open-Meteo,
  // basierend auf system.config.latitude/longitude). Kein zusätzlicher Wetter-Adapter erforderlich.
  // Optional: Mapping hier überschreibt die integrierten Werte (z.B. eigener Wetterdienst).
  // Mindestanforderung fuer sinnvolle Anzeige: Temperatur ODER Wettertext/Wettercode.
  const WEATHER_DP_FIELDS = [
    { key: 'weatherTempC', label: 'Temperatur (°C)', placeholder: 'z.B. weather.0.current.temperature (optional)' },
    { key: 'weatherText', label: 'Wettertext (optional)', placeholder: 'z.B. "stark bewölkt" / "cloudy"' },
    { key: 'weatherCode', label: 'Wetter-Code (optional)', placeholder: 'z.B. WMO/Open-Meteo Code' },
    { key: 'weatherWindKmh', label: 'Wind (km/h) (optional)', placeholder: 'optional' },
    { key: 'weatherCloudPct', label: 'Wolken (%) (optional)', placeholder: 'optional' },
    { key: 'weatherLocation', label: 'Ort/Standort (optional)', placeholder: 'z.B. Bocholt / Anlage 1' }
  ];

  const STORAGE_DP_FIELDS = [
    { key: 'socObjectId', label: 'SoC (%)', requiredModes: ['targetPower','limits','enableFlags'] },
    { key: 'batteryPowerObjectId', label: 'Ist-Leistung (W) (optional)', requiredModes: [] },
    { key: 'targetPowerObjectId', label: 'Sollleistung (W)', requiredModes: ['targetPower'] },
    { key: 'maxChargeObjectId', label: 'Max Ladeleistung (W)', requiredModes: ['limits'] },
    { key: 'maxDischargeObjectId', label: 'Max Entladeleistung (W)', requiredModes: ['limits'] },
    { key: 'chargeEnableObjectId', label: 'Laden erlaubt (bool)', requiredModes: ['enableFlags'] },
    { key: 'dischargeEnableObjectId', label: 'Entladen erlaubt (bool)', requiredModes: ['enableFlags'] },
    { key: 'reserveSocObjectId', label: 'Reserve-SoC (%) (optional)', requiredModes: [] }
  ];

  let currentConfig = null;
  let dpTargetInputId = null;
  let treePrefix = '';

// ─────────────────────────────────────────────────────────────
// Energiefluss: Einheit pro Datenpunkt (W/kW)
// Intern arbeitet der Energiefluss mit Watt; die Live-UI zeigt kW.
// Hersteller liefern jedoch teils bereits kW. Daher pro DP umschaltbar.
function _ensureSettingsObj() {
  if (!currentConfig || typeof currentConfig !== 'object') currentConfig = {};
  if (!currentConfig.settings || typeof currentConfig.settings !== 'object') currentConfig.settings = {};
  return currentConfig.settings;
}

function _ensureFlowPowerDpIsW() {
  const st = _ensureSettingsObj();
  if (!st.flowPowerDpIsW || typeof st.flowPowerDpIsW !== 'object') st.flowPowerDpIsW = {};
  return st.flowPowerDpIsW;
}

function _getFlowPowerDpIsW(key) {
  const st = _ensureSettingsObj();
  const map = (st.flowPowerDpIsW && typeof st.flowPowerDpIsW === 'object') ? st.flowPowerDpIsW : null;
  if (map && Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
  // Legacy-Fallback (ältere Versionen): globaler Schalter
  if (typeof st.flowPowerInputIsW === 'boolean') return !!st.flowPowerInputIsW;
  // Default: DP liefert Watt
  return true;
}

function _setFlowPowerDpIsW(key, isW) {
  const map = _ensureFlowPowerDpIsW();
  map[key] = !!isW;
}

function _collectFlowPowerDpIsWFromUI() {
  const map = {};
  document.querySelectorAll('input[data-flow-power-unit-key]').forEach((el) => {
    const k = el.getAttribute('data-flow-power-unit-key');
    if (k) map[k] = !!el.checked;
  });
  return map;
}
// ─────────────────────────────────────────────────────────────


  function setStatus(msg, kind) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.style.opacity = msg ? '1' : '0.65';
    els.status.style.color = (kind === 'error') ? '#ffb4b4' : (kind === 'ok' ? '#b8f7c3' : '');
  }


  function setBackupStatus(msg, kind) {
    if (!els.backupStatus) return;
    els.backupStatus.textContent = msg || '';
    els.backupStatus.style.opacity = msg ? '1' : '0.65';
    els.backupStatus.style.color = (kind === 'error') ? '#ffb4b4' : (kind === 'ok' ? '#b8f7c3' : '');
  }

  function downloadJsonFile(filename, obj) {
    try {
      const json = JSON.stringify(obj, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'nexowatt-vis-backup.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (_e) {}
        try { URL.revokeObjectURL(url); } catch (_e2) {}
      }, 50);
    } catch (_e) {}
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ''));
        fr.onerror = () => reject(fr.error || new Error('file read error'));
        fr.readAsText(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function fetchJson(url, opts) {
    const res = await fetch(url, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts || {}));
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok === false) {
      const err = (data && data.error) ? data.error : ('HTTP ' + res.status);
      throw new Error(err);
    }

    return data;
  }

  // --- Datapoint validation (Phase 3.3) ---
  let _validateTimer = null;

  function _fmtAge(ageMs) {
    const n = Number(ageMs);
    if (!Number.isFinite(n) || n < 0) return '';
    if (n < 1000) return `${Math.round(n)}ms`;
    const s = n / 1000;
    if (s < 60) return `${Math.round(s)}s`;
    const m = s / 60;
    if (m < 60) return `${Math.round(m)}min`;
    const h = m / 60;
    return `${Math.round(h)}h`;
  }

  function _setBadge(inputId, kind, text) {
    const el = document.getElementById('val_' + inputId);
    if (!el) return;
    el.classList.remove('nw-config-badge--ok', 'nw-config-badge--warn', 'nw-config-badge--error', 'nw-config-badge--idle');
    el.classList.add('nw-config-badge', 'nw-config-badge--' + (kind || 'idle'));
    el.textContent = text || '—';
  }

  function scheduleValidation(delayMs) {
    const d = (typeof delayMs === 'number' && Number.isFinite(delayMs)) ? delayMs : 600;
    if (_validateTimer) clearTimeout(_validateTimer);
    _validateTimer = setTimeout(() => { runValidation(false).catch(() => {}); }, d);
  }

  async function runValidation(showStatusMessage) {
    const inputs = Array.from(document.querySelectorAll('input[data-dp-input="1"]'));
    const ids = [];
    const seen = new Set();

    for (const inp of inputs) {
      const v = String(inp.value || '').trim();
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      ids.push(v);
    }

    // Quick UI reset for empty inputs
    for (const inp of inputs) {
      const v = String(inp.value || '').trim();
      if (!v) _setBadge(inp.id, 'idle', 'nicht gesetzt');
    }

    if (!ids.length) {
      if (showStatusMessage) setStatus('Validierung: keine Datenpunkte gesetzt.', 'ok');
      return;
    }

    if (showStatusMessage) setStatus('Validierung läuft…', '');
    const maxAgeMs = 15000;

    const data = await fetchJson('/api/object/validate', {
      method: 'POST',
      body: JSON.stringify({ ids, maxAgeMs }),
    });

    if (!data || data.ok !== true || !data.results) {
      if (showStatusMessage) setStatus('Validierung: keine Antwort.', 'error');
      return;
    }

    // Apply per-input badge
    for (const inp of inputs) {
      const idVal = String(inp.value || '').trim();
      if (!idVal) continue;

      const info = data.results[idVal];
      if (!info || info.exists !== true) {
        _setBadge(inp.id, 'error', 'nicht gefunden');
        continue;
      }

      // Basic capability hints (heuristic by input-id)
      const expectWrite = /setCurrentAId|setPowerWId|enableWriteId|lockWriteId|WriteId/i.test(inp.id);
      const expectRead = /powerId|energyTotalId|statusId|activeId|onlineId|rfidReadId|budgetPowerId|gridPowerId|pvSurplusPowerId|ReadId/i.test(inp.id);

      if (expectWrite && info.common && info.common.write === false) {
        _setBadge(inp.id, 'warn', 'read-only');
        continue;
      }
      if (expectRead && info.common && info.common.read === false) {
        _setBadge(inp.id, 'warn', 'write-only');
        continue;
      }

      if (info.statePresent !== true) {
        _setBadge(inp.id, 'warn', 'keine Daten');
        continue;
      }

      if (info.stale === true) {
        _setBadge(inp.id, 'warn', 'alt (' + _fmtAge(info.ageMs) + ')');
        continue;
      }

      _setBadge(inp.id, 'ok', 'OK');
    }

    if (showStatusMessage) setStatus('Validierung: abgeschlossen.', 'ok');
  }

  function deepMerge(target, ...patches) {
    const out = (target && typeof target === 'object') ? JSON.parse(JSON.stringify(target)) : {};
    for (const patch of patches) {
      if (!patch || typeof patch !== 'object') continue;
      for (const k of Object.keys(patch)) {
        const v = patch[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          out[k] = deepMerge(out[k], v);
        } else {
          out[k] = v;
        }
      }
    }
    return out;
  }

  function valueOrEmpty(v) {
    return (v === null || v === undefined) ? '' : String(v);
  }

  function numOrEmpty(v) {
    return (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '';
  }

  function buildAppsUI() {
    if (!els.appsList) return;
    els.appsList.innerHTML = '';

    const getSt = (appId) => {
      const a = currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps ? currentConfig.emsApps.apps[appId] : null;
      return a && typeof a === 'object' ? a : { installed: false, enabled: false };
    };

    for (const app of APP_CATALOG) {
      const st = getSt(app.id);

      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.setAttribute('data-app', app.id);

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = app.label;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      // UI: use button-style toggles (no visible checkboxes)
      const mkToggle = (id, label, checked, disabled, onLabel = 'An', offLabel = 'Aus') => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-app-toggle-row';
        wrap.style.display = 'inline-flex';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '8px';
        wrap.style.fontSize = '0.75rem';
        wrap.style.opacity = disabled ? '0.55' : '1';

        const txt = document.createElement('span');
        txt.textContent = label;
        txt.style.opacity = '0.85';

        const grp = document.createElement('div');
        grp.className = 'nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle';
        grp.setAttribute('data-toggle-for', id);

        const bOff = document.createElement('button');
        bOff.type = 'button';
        bOff.setAttribute('data-value', 'false');
        bOff.textContent = offLabel;
        if (!checked) bOff.classList.add('active');
        if (disabled) bOff.disabled = true;

        const bOn = document.createElement('button');
        bOn.type = 'button';
        bOn.setAttribute('data-value', 'true');
        bOn.textContent = onLabel;
        if (checked) bOn.classList.add('active');
        if (disabled) bOn.disabled = true;

        grp.appendChild(bOff);
        grp.appendChild(bOn);

        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.id = id;
        inp.className = 'nw-toggle-hidden';
        inp.checked = !!checked;
        inp.disabled = !!disabled;

        wrap.appendChild(txt);
        wrap.appendChild(grp);
        wrap.appendChild(inp);

        return { wrap, inp, grp };
      };

      const idInstalled = `app_${app.id}_installed`;
      const idEnabled = `app_${app.id}_enabled`;

      const tInstalled = mkToggle(idInstalled, 'Installiert', st.installed, app.mandatory, 'Ja', 'Nein');
      const tEnabled = mkToggle(idEnabled, 'Aktiv', st.enabled, app.mandatory || !st.installed, 'An', 'Aus');

      // Behaviour: if app is uninstalled, force enabled=false
      tInstalled.inp.addEventListener('change', () => {
        const installed = !!tInstalled.inp.checked;
        if (!installed) {
          tEnabled.inp.checked = false;
          tEnabled.inp.disabled = true;
        } else {
          tEnabled.inp.disabled = false;
        }

        try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(tEnabled.inp.id); } catch (_e) {}

        // Live UI: Mapping-Kacheln reagieren sofort auf Install/Uninstall
        try { applyAppDependentVisibility(); } catch (_e) {}
      });

      actions.appendChild(tInstalled.wrap);
      actions.appendChild(tEnabled.wrap);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = app.mandatory ? (app.desc + ' (Basis)') : app.desc;
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Optional quick hints
      if (app.id === 'charging') {
        const row = document.createElement('div');
        row.className = 'nw-config-card__row';
        row.textContent = 'Konfiguration: Reiter „Ladepunkte“. Datenpunkte: pro Ladepunkt.';
        body.appendChild(row);
      }
      if (app.id === 'peak') {
        const row = document.createElement('div');
        row.className = 'nw-config-card__row';
        row.textContent = 'Grenzwert: „Allgemein“ + optionaler Netzleistungs-Datenpunkt.';
        body.appendChild(row);
      }

      card.appendChild(header);
      card.appendChild(body);

      els.appsList.appendChild(card);
    }

    els.appsEmpty.style.display = APP_CATALOG.length ? 'none' : 'block';
  }

  function setAppsFromConfig(cfg) {
    if (!cfg) return;
    const apps = (cfg.emsApps && cfg.emsApps.apps && typeof cfg.emsApps.apps === 'object') ? cfg.emsApps.apps : {};
    for (const app of APP_CATALOG) {
      const st = (apps && apps[app.id] && typeof apps[app.id] === 'object') ? apps[app.id] : null;
      const installed = !!(st && st.installed);
      const enabled = !!(st && st.enabled);

      const i1 = document.getElementById(`app_${app.id}_installed`);
      const i2 = document.getElementById(`app_${app.id}_enabled`);
      if (i1) {
        i1.checked = app.mandatory ? true : installed;
        i1.disabled = !!app.mandatory;
        try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(i1.id); } catch (_e) {}
      }
      if (i2) {
        i2.checked = app.mandatory ? true : enabled;
        i2.disabled = !!app.mandatory || !installed;
        try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(i2.id); } catch (_e) {}
      }
    }

    // Phase 3.5: Zuordnungskacheln abhängig von installierten Apps ein-/ausblenden
    try { applyAppDependentVisibility(); } catch (_e) {}
  }

  function applyAppDependentVisibility() {
    const isInstalled = (appId) => {
      const cb = document.getElementById(`app_${appId}_installed`);
      return cb ? !!cb.checked : false;
    };

    const toggleCard = (cardKey, show) => {
      const el = document.querySelector(`.nw-config-card[data-card="${cardKey}"]`);
      if (!el) return;
      el.style.display = show ? '' : 'none';
    };

    // General + energy + live always visible (Basis / VIS-Dashboard)
    toggleCard('general', true);
    toggleCard('live', true);
    toggleCard('expert', true);

    // App-spezifisch (Zuordnung)
    toggleCard('tariff', isInstalled('tariff'));
    toggleCard('storage', isInstalled('storage'));
    toggleCard('peak', isInstalled('peak'));

    // Tabs: optional ein-/ausblenden (App-Center)
    const tabMap = [
      { tab: 'thermal', app: 'thermal' },
      { tab: 'bhkw', app: 'bhkw' },
      { tab: 'generator', app: 'generator' },
      { tab: 'threshold', app: 'threshold' },
      { tab: 'relay', app: 'relay' },
      { tab: 'grid', app: 'grid' },
      { tab: 'evupv', app: 'grid' },
      { tab: 'para14a', app: 'para14a' },
      { tab: 'evcs', app: 'charging' },
      { tab: 'storagefarm', app: 'storagefarm' },
      { tab: 'multiuse', app: 'multiuse' },
    ];

    for (const t of tabMap) {
      const el = document.querySelector(`.nw-tab[data-tab="${t.tab}"]`);
      if (!el) continue;
      el.style.display = isInstalled(t.app) ? '' : 'none';
    }

    // Wenn der aktuelle Tab ausgeblendet wird: auf „Apps“ zurückspringen
    const activeTab = document.querySelector('.nw-tab.nw-tab--active');
    if (activeTab && activeTab.style.display === 'none') {
      const appsTab = document.querySelector('.nw-tab[data-tab="apps"]');
      if (appsTab) appsTab.click();
    }
  }

  function buildDpTable(container, fields, getter, setter, options) {
    container.innerHTML = '';

    const makeRow = (field) => {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = field.label;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = field.key;

      left.appendChild(title);
      left.appendChild(sub);

      const inputId = (options && options.idPrefix ? options.idPrefix : 'dp_') + field.key;

      // Optional: erklärender Hinweistext (Auto/Override/Info)
      let hintEl = null;
      if (field.hintAuto || field.hintOverride || field.hint) {
        hintEl = document.createElement('div');
        hintEl.className = 'nw-config-item__hint';
        hintEl.id = 'hint_' + inputId;
        left.appendChild(hintEl);
      }

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.placeholder = field.placeholder || '';
      input.value = valueOrEmpty(getter(field.key));
      input.id = inputId;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      btn.addEventListener('click', () => openDpModal(input.id));

      right.appendChild(input);

      // Einheit pro Datenpunkt (Energiefluss): W vs kW
      if (field.power) {
        const unitLabel = document.createElement('label');
        unitLabel.className = 'nw-unit-toggle';
        unitLabel.title = 'Wenn aktiv: Datenpunkt liefert Watt (W). Wenn aus: Datenpunkt liefert bereits kW (1 = 1 kW).';

        const unitCb = document.createElement('input');
        unitCb.type = 'checkbox';
        unitCb.className = 'nw-unit-toggle__cb';
        unitCb.id = 'unit_' + input.id;
        unitCb.checked = _getFlowPowerDpIsW(field.key);
        unitCb.setAttribute('data-flow-power-unit-key', field.key);
        unitCb.addEventListener('change', () => {
          _setFlowPowerDpIsW(field.key, unitCb.checked);
        });

        const unitText = document.createElement('span');
        unitText.textContent = 'W';

        unitLabel.appendChild(unitCb);
        unitLabel.appendChild(unitText);
        right.appendChild(unitLabel);
      }

      right.appendChild(btn);

      // Mode badge (Pflicht / Auto / Override) – nur wenn relevant
      let modeBadge = null;
      if (field.required || field.auto) {
        modeBadge = document.createElement('span');
        modeBadge.className = 'nw-config-badge nw-config-badge--idle';
        modeBadge.id = 'mode_' + input.id;
        modeBadge.textContent = '—';
        right.appendChild(modeBadge);
      }

      // Validation badge (existiert / warn / error)
      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + input.id;
      badge.textContent = '—';
      right.appendChild(badge);

      row.appendChild(left);
      row.appendChild(right);

      const updateMeta = () => {
        const v = String(input.value || '').trim();
        const isSet = !!v;

        if (modeBadge) {
          if (field.required) {
            modeBadge.textContent = 'PFLICHT';
            modeBadge.className = 'nw-config-badge ' + (isSet ? 'nw-config-badge--ok' : 'nw-config-badge--error');
          } else if (field.auto) {
            if (isSet) {
              modeBadge.textContent = 'OVERRIDE';
              modeBadge.className = 'nw-config-badge nw-config-badge--override';
            } else {
              modeBadge.textContent = 'AUTO';
              modeBadge.className = 'nw-config-badge nw-config-badge--auto';
            }
          }
        }

        if (hintEl) {
          let t = '';
          if (field.hintAuto || field.hintOverride) {
            t = isSet ? (field.hintOverride || '') : (field.hintAuto || '');
          } else {
            t = field.hint || '';
          }

          hintEl.textContent = t;
          hintEl.style.display = t ? 'block' : 'none';
        }
      };

      input.dataset.dpInput = '1';
      input.addEventListener('input', () => { updateMeta(); });
      input.addEventListener('change', () => { setter(field.key, input.value.trim()); updateMeta(); scheduleValidation(200); });

      updateMeta();
      return row;
    };

    for (const f of fields) {
      const row = makeRow(f);
      container.appendChild(row);
      // Optional hook for callers to inject additional UI rows close to a specific field
      if (options && typeof options.afterRow === 'function') {
        try {
          options.afterRow(f, row, container);
        } catch (e) {
          console.warn('buildDpTable.afterRow failed', e);
        }
      }
    }
  }

  // ------------------------------
  // Energiefluss: optionale Slots (Verbraucher/Erzeuger)
  // ------------------------------

  function _ensureVis() {
    currentConfig = currentConfig || {};
    currentConfig.vis = (currentConfig.vis && typeof currentConfig.vis === 'object') ? currentConfig.vis : {};
    return currentConfig.vis;
  }

  function _ensureFlowSlots() {
    const vis = _ensureVis();
    vis.flowSlots = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
    const fs = vis.flowSlots;

    fs.consumers = Array.isArray(fs.consumers) ? fs.consumers : [];
    fs.producers = Array.isArray(fs.producers) ? fs.producers : [];

    const norm = (arr, count) => {
      const out = [];
      for (let i = 0; i < count; i++) {
        const it = arr[i] && typeof arr[i] === 'object' ? arr[i] : {};
        const ctrl = (it.ctrl && typeof it.ctrl === 'object') ? it.ctrl : {};
        out.push({
          name: (it.name !== undefined && it.name !== null) ? String(it.name) : '',
          icon: (it.icon !== undefined && it.icon !== null) ? String(it.icon) : '',
          ctrl: {
            // Schnellsteuerung (optional) – keine Pflichtfelder
            switchWriteId: (ctrl.switchWriteId !== undefined && ctrl.switchWriteId !== null) ? String(ctrl.switchWriteId) : '',
            switchReadId: (ctrl.switchReadId !== undefined && ctrl.switchReadId !== null) ? String(ctrl.switchReadId) : '',
            setpointWriteId: (ctrl.setpointWriteId !== undefined && ctrl.setpointWriteId !== null) ? String(ctrl.setpointWriteId) : '',
            setpointReadId: (ctrl.setpointReadId !== undefined && ctrl.setpointReadId !== null) ? String(ctrl.setpointReadId) : '',
            setpointLabel: (ctrl.setpointLabel !== undefined && ctrl.setpointLabel !== null) ? String(ctrl.setpointLabel) : '',
            setpointUnit: (ctrl.setpointUnit !== undefined && ctrl.setpointUnit !== null) ? String(ctrl.setpointUnit) : 'W',
            setpointMin: (ctrl.setpointMin !== undefined && ctrl.setpointMin !== null) ? ctrl.setpointMin : '',
            setpointMax: (ctrl.setpointMax !== undefined && ctrl.setpointMax !== null) ? ctrl.setpointMax : '',
            setpointStep: (ctrl.setpointStep !== undefined && ctrl.setpointStep !== null) ? ctrl.setpointStep : ''
          }
        });
      }
      return out;
    };

    fs.consumers = norm(fs.consumers, FLOW_CONSUMER_SLOT_COUNT);
    fs.producers = norm(fs.producers, FLOW_PRODUCER_SLOT_COUNT);

    // Optional core labels (fixed nodes) for the Energiefluss visualization.
    fs.core = (fs.core && typeof fs.core === 'object') ? fs.core : {};
    fs.core.pvName = (fs.core.pvName !== undefined && fs.core.pvName !== null) ? String(fs.core.pvName) : '';
    return fs;
  }

  function _defaultSlotName(kind, idx1based) {
    if (kind === 'consumers' && idx1based === 1) return 'Heizung/Wärmepumpe';
    return (kind === 'consumers' ? `Verbraucher ${idx1based}` : `Erzeuger ${idx1based}`);
  }

  function buildFlowSlotsUI(kind, slotCount = 10) {
    const container = (kind === 'consumers') ? els.flowConsumers : els.flowProducers;
    if (!container) return;

    const fs = _ensureFlowSlots();
    const slots = (kind === 'consumers') ? fs.consumers : fs.producers;

    // Backward compatibility: map old heating DP into first consumer slot on display, but do not delete.
    const dps = (currentConfig && currentConfig.datapoints) ? currentConfig.datapoints : {};
    if (kind === 'consumers') {
      const c1 = String(dps.consumer1Power || '').trim();
      const legacyHeat = String(dps.consumptionHeating || '').trim();
      if (!c1 && legacyHeat) {
        currentConfig.datapoints = currentConfig.datapoints || {};
        currentConfig.datapoints.consumer1Power = legacyHeat;
      }
    }

    container.innerHTML = '';

    // Überschriften für bessere Übersicht (Name / Icon / Datenpunkt / Auswahl / Steuerung)
    const legend = document.createElement('div');
    legend.className = 'nw-flow-slot-legend';
    legend.innerHTML = `
      <div class="nw-flow-slot-legend__meta">Slot</div>
      <div class="nw-flow-slot-legend__fields">
        <span class="c-name">Name</span>
        <span class="c-icon">Icon</span>
        <span class="c-dp">Datenpunkt (W/kW)</span>
        <span class="c-meta">Auswahl / Status</span>
        <span class="c-ctrl">Steuerung</span>
      </div>
    `;
    container.appendChild(legend);

    for (let i = 0; i < slotCount; i++) {
      const idx = i + 1;
      const dpKey = (kind === 'consumers') ? `consumer${idx}Power` : `producer${idx}Power`;

      const row = document.createElement('div');
      row.className = 'nw-flow-slot';

      const meta = document.createElement('div');
      meta.className = 'nw-flow-slot__meta';
      const title = document.createElement('div');
      title.className = 'nw-flow-slot__title';
      title.textContent = _defaultSlotName(kind, idx);
      const key = document.createElement('div');
      key.className = 'nw-flow-slot__key';
      key.textContent = dpKey;
      meta.appendChild(title);
      meta.appendChild(key);

      const fields = document.createElement('div');
      fields.className = 'nw-flow-slot__fields';

      const nameInput = document.createElement('input');
      nameInput.className = 'nw-config-input nw-flow-slot__name';
      nameInput.type = 'text';
      nameInput.id = `flow_${kind}_name_${idx}`;
      nameInput.placeholder = 'Name (z.B. Wärmepumpe)';
      nameInput.value = (slots[i] && slots[i].name) ? String(slots[i].name) : '';
      nameInput.addEventListener('change', () => {
        const fs2 = _ensureFlowSlots();
        const target = (kind === 'consumers') ? fs2.consumers : fs2.producers;
        target[i] = target[i] || { name: '', icon: '' };
        target[i].name = String(nameInput.value || '').trim();
      });

      const iconSelect = document.createElement('select');
      iconSelect.className = 'nw-config-input nw-flow-slot__icon';
      iconSelect.id = `flow_${kind}_icon_${idx}`;
      iconSelect.title = 'Icon (optional)';

      // Options
      FLOW_ICON_CHOICES.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        iconSelect.appendChild(o);
      });
      iconSelect.value = (slots[i] && slots[i].icon !== undefined && slots[i].icon !== null) ? String(slots[i].icon) : '';
      iconSelect.addEventListener('change', () => {
        const fs2 = _ensureFlowSlots();
        const target = (kind === 'consumers') ? fs2.consumers : fs2.producers;
        target[i] = target[i] || { name: '', icon: '' };
        target[i].icon = String(iconSelect.value || '').trim();
      });

      const dpInput = document.createElement('input');
      dpInput.className = 'nw-config-input nw-flow-slot__dp';
      dpInput.type = 'text';
      dpInput.id = `flow_${kind}_dp_${idx}`;
      dpInput.placeholder = 'Datenpunkt (W/kW) (optional)';
      dpInput.value = valueOrEmpty(dps[dpKey]);
      dpInput.dataset.dpInput = '1';
      dpInput.addEventListener('change', () => {
        currentConfig.datapoints = currentConfig.datapoints || {};
        currentConfig.datapoints[dpKey] = String(dpInput.value || '').trim();
        scheduleValidation(200);
      });

      // Einheit pro Slot-Datenpunkt (W vs kW)
      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-flow-slot__dpwrap';
      dpWrap.appendChild(dpInput);

      const unitLbl = document.createElement('label');
      unitLbl.className = 'nw-unit-toggle nw-unit-toggle--mini';
      unitLbl.title = 'Wenn aktiv: Datenpunkt liefert Watt (W). Wenn aus: Datenpunkt liefert bereits kW (1 = 1 kW).';

      const unitCb = document.createElement('input');
      unitCb.type = 'checkbox';
      unitCb.id = `flow_${kind}_unit_${idx}`;
      unitCb.checked = _getFlowPowerDpIsW(dpKey);
      unitCb.setAttribute('data-flow-power-unit-key', dpKey);
      unitCb.addEventListener('change', () => {
        _setFlowPowerDpIsW(dpKey, !!unitCb.checked);
      });

      const unitTxt = document.createElement('span');
      unitTxt.textContent = 'W';
      unitLbl.appendChild(unitCb);
      unitLbl.appendChild(unitTxt);
      dpWrap.appendChild(unitLbl);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      btn.setAttribute('data-browse', dpInput.id);

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + dpInput.id;
      badge.textContent = '—';

      fields.appendChild(nameInput);
      fields.appendChild(iconSelect);
      fields.appendChild(dpWrap);
      fields.appendChild(btn);
      fields.appendChild(badge);

      // Schnellsteuerung (optional) – in der VIS als klickbarer Kreis nutzbar
      const advBtn = document.createElement('button');
      advBtn.type = 'button';
      advBtn.className = 'nw-config-btn nw-config-btn--ghost nw-flow-slot__advbtn';
      advBtn.textContent = 'Steuerung';

      const advanced = document.createElement('div');
      advanced.className = 'nw-flow-slot__advanced';

      const ctrlGrid = document.createElement('div');
      ctrlGrid.className = 'nw-flow-ctrl-grid';

      const ensureCtrl = () => {
        const fs2 = _ensureFlowSlots();
        const target = (kind === 'consumers') ? fs2.consumers : fs2.producers;
        target[i] = target[i] || { name: '', ctrl: {} };
        target[i].ctrl = (target[i].ctrl && typeof target[i].ctrl === 'object') ? target[i].ctrl : {};
        return target[i].ctrl;
      };

      const ctrl = ensureCtrl();

      const mkDpField = (labelText, id, value, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-flow-ctrl-field';

        const lbl = document.createElement('div');
        lbl.style.fontSize = '0.78rem';
        lbl.style.fontWeight = '600';
        lbl.style.color = '#e5e7eb';
        lbl.textContent = labelText;

        const dpWrap = document.createElement('div');
        dpWrap.className = 'nw-config-dp-input-wrapper';

        const input = document.createElement('input');
        input.className = 'nw-config-input nw-config-dp-input';
        input.type = 'text';
        input.id = id;
        input.value = value ? String(value) : '';
        input.dataset.dpInput = '1';
        input.placeholder = 'optional';
        input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

        const b = document.createElement('button');
        b.className = 'nw-config-dp-button';
        b.type = 'button';
        b.setAttribute('data-browse', id);
        b.textContent = 'Auswählen…';

        const badge = document.createElement('span');
        badge.className = 'nw-config-badge nw-config-badge--idle';
        badge.id = 'val_' + id;
        badge.textContent = '—';

        dpWrap.appendChild(input);
        dpWrap.appendChild(b);
        dpWrap.appendChild(badge);

        wrap.appendChild(lbl);
        wrap.appendChild(dpWrap);
        return wrap;
      };

      const mkSimpleField = (labelText, id, type, value, placeholder, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-flow-ctrl-field';

        const lbl = document.createElement('div');
        lbl.style.fontSize = '0.78rem';
        lbl.style.fontWeight = '600';
        lbl.style.color = '#e5e7eb';
        lbl.textContent = labelText;

        const input = document.createElement('input');
        input.className = 'nw-config-input';
        input.type = type;
        input.id = id;
        if (placeholder) input.placeholder = placeholder;
        input.value = (value !== undefined && value !== null) ? String(value) : '';
        input.addEventListener('change', () => { onChange(input.value); });

        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
      };

      const mkCheckField = (labelText, id, checked, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-flow-ctrl-field';

        const lbl = document.createElement('div');
        lbl.style.fontSize = '0.78rem';
        lbl.style.fontWeight = '600';
        lbl.style.color = '#e5e7eb';
        lbl.textContent = labelText;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = !!checked;
        input.addEventListener('change', () => { onChange(!!input.checked); });

        const txt = document.createElement('div');
        txt.style.fontSize = '0.82rem';
        txt.style.opacity = '0.8';
        txt.textContent = 'aktiv';

        row.appendChild(input);
        row.appendChild(txt);

        wrap.appendChild(lbl);
        wrap.appendChild(row);
        return wrap;
      };

      // IDs müssen pro Slot eindeutig sein (für DP-Browser + Validierung)
      const baseId = `flow_${kind}_${idx}`;
      ctrlGrid.appendChild(mkDpField('Schalten (Write, bool)', `${baseId}_sw_w`, ctrl.switchWriteId, (v) => { const c = ensureCtrl(); c.switchWriteId = v; }));
      ctrlGrid.appendChild(mkDpField('Schalten (Read, bool)', `${baseId}_sw_r`, ctrl.switchReadId, (v) => { const c = ensureCtrl(); c.switchReadId = v; }));
      ctrlGrid.appendChild(mkDpField('Sollwert (Write, Zahl)', `${baseId}_sp_w`, ctrl.setpointWriteId, (v) => { const c = ensureCtrl(); c.setpointWriteId = v; }));
      ctrlGrid.appendChild(mkDpField('Sollwert (Read, Zahl)', `${baseId}_sp_r`, ctrl.setpointReadId, (v) => { const c = ensureCtrl(); c.setpointReadId = v; }));

      ctrlGrid.appendChild(mkDpField('SG‑Ready Relais A (Write, bool)', `${baseId}_sg1_w`, ctrl.sgReadyAWriteId, (v) => { const c = ensureCtrl(); c.sgReadyAWriteId = v; }));
      ctrlGrid.appendChild(mkDpField('SG‑Ready Relais A (Read, bool)', `${baseId}_sg1_r`, ctrl.sgReadyAReadId, (v) => { const c = ensureCtrl(); c.sgReadyAReadId = v; }));
      ctrlGrid.appendChild(mkDpField('SG‑Ready Relais B (Write, bool)', `${baseId}_sg2_w`, ctrl.sgReadyBWriteId, (v) => { const c = ensureCtrl(); c.sgReadyBWriteId = v; }));
      ctrlGrid.appendChild(mkDpField('SG‑Ready Relais B (Read, bool)', `${baseId}_sg2_r`, ctrl.sgReadyBReadId, (v) => { const c = ensureCtrl(); c.sgReadyBReadId = v; }));
      ctrlGrid.appendChild(mkCheckField('SG‑Ready Invert Relais A', `${baseId}_sg1_inv`, !!ctrl.sgReadyAInvert, (b) => { const c = ensureCtrl(); c.sgReadyAInvert = !!b; }));
      ctrlGrid.appendChild(mkCheckField('SG‑Ready Invert Relais B', `${baseId}_sg2_inv`, !!ctrl.sgReadyBInvert, (b) => { const c = ensureCtrl(); c.sgReadyBInvert = !!b; }));

      ctrlGrid.appendChild(mkSimpleField('Sollwert‑Bezeichnung', `${baseId}_sp_lbl`, 'text', ctrl.setpointLabel, 'z.B. Sollleistung / Solltemperatur', (v) => { const c = ensureCtrl(); c.setpointLabel = String(v || '').trim(); }));
      ctrlGrid.appendChild(mkSimpleField('Sollwert‑Einheit', `${baseId}_sp_unit`, 'text', ctrl.setpointUnit || 'W', 'z.B. W / °C', (v) => { const c = ensureCtrl(); const t = String(v || '').trim(); c.setpointUnit = t || 'W'; }));
      ctrlGrid.appendChild(mkSimpleField('Sollwert Min', `${baseId}_sp_min`, 'number', ctrl.setpointMin, 'optional', (v) => { const c = ensureCtrl(); const n = Number(v); c.setpointMin = Number.isFinite(n) ? n : ''; }));
      ctrlGrid.appendChild(mkSimpleField('Sollwert Max', `${baseId}_sp_max`, 'number', ctrl.setpointMax, 'optional', (v) => { const c = ensureCtrl(); const n = Number(v); c.setpointMax = Number.isFinite(n) ? n : ''; }));
      ctrlGrid.appendChild(mkSimpleField('Sollwert Step', `${baseId}_sp_step`, 'number', ctrl.setpointStep, 'optional', (v) => { const c = ensureCtrl(); const n = Number(v); c.setpointStep = Number.isFinite(n) ? n : ''; }));

      const hint = document.createElement('div');
      hint.className = 'nw-config-field-hint';
      hint.style.marginTop = '6px';
      hint.textContent = 'Wenn Write‑Datenpunkte gesetzt sind, wird der Kreis im Energiefluss klickbar (Schnellsteuerung). Read‑Datenpunkte sind optional für Status/Feedback. SG‑Ready benötigt zwei Relais (A/B).';
      advanced.appendChild(ctrlGrid);
      advanced.appendChild(hint);

      advBtn.addEventListener('click', () => {
        advanced.classList.toggle('is-open');
      });

      fields.appendChild(advBtn);

      row.appendChild(meta);
      row.appendChild(fields);
      row.appendChild(advanced);
      container.appendChild(row);
    }
  }

  function buildFlowPvNameRow() {
    const fs = _ensureFlowSlots();

    const row = document.createElement('div');
    row.className = 'nw-config-item';

    const left = document.createElement('div');
    left.className = 'nw-config-item__left';
    const title = document.createElement('div');
    title.className = 'nw-config-item__title';
    title.textContent = 'PV Name (optional)';
    const subtitle = document.createElement('div');
    subtitle.className = 'nw-config-item__subtitle';
    subtitle.textContent = 'pvName';
    const hint = document.createElement('div');
    hint.className = 'nw-config-item__hint';
    hint.textContent = 'Wird im Energiefluss-Kreis (PV) als Name angezeigt. Leer lassen = "PV".';
    left.appendChild(title);
    left.appendChild(subtitle);
    left.appendChild(hint);

    const right = document.createElement('div');
    right.className = 'nw-config-item__right';
    const input = document.createElement('input');
    input.className = 'nw-config-input';
    input.type = 'text';
    input.id = 'flow_pvName';
    input.maxLength = 24;
    input.placeholder = 'z.B. PV 1 / Anlage 1';
    input.value = (fs.core && fs.core.pvName) ? String(fs.core.pvName) : '';
    input.addEventListener('change', () => {
      const fs2 = _ensureFlowSlots();
      fs2.core = fs2.core && typeof fs2.core === 'object' ? fs2.core : {};
      fs2.core.pvName = String(input.value || '').trim().slice(0, 24);
      input.value = fs2.core.pvName;
    });
    right.appendChild(input);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  // ------------------------------
  // Thermik: PV‑Überschuss‑Regelung für optionale Verbraucher‑Slots
  // ------------------------------

  function _ensureThermalCfg() {
    currentConfig = currentConfig || {};
    currentConfig.thermal = (currentConfig.thermal && typeof currentConfig.thermal === 'object') ? currentConfig.thermal : {};
    const t = currentConfig.thermal;
    // Minutes to hold manual quick-controls before PV-auto overwrites again
    const hold = Number(t.manualHoldMin);
    t.manualHoldMin = (Number.isFinite(hold) && hold >= 0) ? Math.round(hold) : 20;
    t.devices = Array.isArray(t.devices) ? t.devices : [];

    const bySlot = new Map();
    for (const d of t.devices) {
      if (!d || typeof d !== 'object') continue;
      const s = Number(d.slot ?? d.consumerSlot);
      if (!Number.isFinite(s)) continue;
      const slot = Math.max(1, Math.min(FLOW_CONSUMER_SLOT_COUNT, Math.round(s)));
      bySlot.set(slot, d);
    }

    const out = [];
    for (let slot = 1; slot <= FLOW_CONSUMER_SLOT_COUNT; slot++) {
      const prev = bySlot.get(slot) || {};
      const mode = (typeof prev.mode === 'string') ? String(prev.mode) : 'pvAuto';
      const typeRaw = (typeof prev.type === 'string') ? String(prev.type) : (typeof prev.deviceType === 'string' ? String(prev.deviceType) : '');
      const typeNorm = String(typeRaw || '').trim().toLowerCase();
      const type = (typeNorm === 'sgready' || typeNorm === 'sg-ready' || typeNorm === 'sg_ready' || typeNorm === 'sg')
        ? 'sgready'
        : ((typeNorm === 'setpoint' || typeNorm === 'temp' || typeNorm === 'temperature')
          ? 'setpoint'
          : (typeNorm === 'power' ? 'power' : (slot === 1 ? 'setpoint' : 'power')));
      const profileRaw = (typeof prev.profile === 'string') ? String(prev.profile) : 'heating';
      const profile = (['heating','cooling','neutral'].includes(profileRaw)) ? profileRaw : 'heating';
      const defSp = (profile === 'cooling') ? { on: 20, off: 24, boost: 18 } : (profile === 'neutral' ? { on: 22, off: 22, boost: 22 } : { on: 55, off: 45, boost: 60 });
      out.push({
        slot,
        // enabled => PV‑Auto aktiv
        enabled: (typeof prev.enabled === 'boolean') ? !!prev.enabled : false,
        mode: (['pvAuto','manual','off'].includes(mode)) ? mode : 'pvAuto',
        type,
        profile,
        maxPowerW: (prev.maxPowerW !== undefined) ? prev.maxPowerW : 2500,
        estimatedPowerW: (prev.estimatedPowerW !== undefined) ? prev.estimatedPowerW : 1500,
        startSurplusW: (prev.startSurplusW !== undefined) ? prev.startSurplusW : 800,
        stopSurplusW: (prev.stopSurplusW !== undefined) ? prev.stopSurplusW : 300,
        minOnSec: (prev.minOnSec !== undefined) ? prev.minOnSec : 300,
        minOffSec: (prev.minOffSec !== undefined) ? prev.minOffSec : 300,
        autoOnSetpoint: (prev.autoOnSetpoint !== undefined) ? prev.autoOnSetpoint : defSp.on,
        autoOffSetpoint: (prev.autoOffSetpoint !== undefined) ? prev.autoOffSetpoint : defSp.off,
        boostSetpoint: (prev.boostSetpoint !== undefined) ? prev.boostSetpoint : defSp.boost,
        boostEnabled: (typeof prev.boostEnabled === 'boolean') ? !!prev.boostEnabled : true,
        boostDurationMin: (prev.boostDurationMin !== undefined) ? prev.boostDurationMin : 30,
        boostPowerW: (prev.boostPowerW !== undefined) ? prev.boostPowerW : ((prev.maxPowerW !== undefined) ? prev.maxPowerW : 2500),
        priority: (prev.priority !== undefined) ? prev.priority : (100 + slot)
      });
    }

    t.devices = out;
    return t;
  }

  function buildThermalUI() {
  // Thermik (Wärmepumpe/Heizung/Klima): PV-Überschuss intelligent nutzen.
  // NOTE: This UI lives in App-Center and works on the *currentConfig* object.
  // A previous refactor accidentally referenced a non-existent global "config" which
  // broke the complete Thermik tab (rendering stopped with a ReferenceError).
  const cfg = (currentConfig.thermal || (currentConfig.thermal = { devices: [], manualHoldMinutes: 20 }));

  // App toggle lives under currentConfig.emsApps.apps.* (like all other apps)
  currentConfig.emsApps = currentConfig.emsApps || { apps: {} };
  currentConfig.emsApps.apps = currentConfig.emsApps.apps || {};
  const apps = currentConfig.emsApps.apps;
  const app = apps.thermal || (apps.thermal = { installed: false, enabled: false });

  // Keep app.enabled in sync with App-Center toggle
  cfg.enabled = !!app.enabled;

  // Ensure 8 device slots
  cfg.devices = Array.isArray(cfg.devices) ? cfg.devices : [];
  while (cfg.devices.length < 8) {
    cfg.devices.push({
      enabled: false,
      name: '',
      // variant: 'power' (Leistung), 'setpoint' (Sollwert), 'sgready' (SG-Ready)
      type: 'power',
      // profile: 'heat'/'cool' (used for labels in UI)
      profile: 'heat',
      // PV-auto thresholds
      startSurplusW: 800,
      stopSurplusW: 300,
      // anti-flutter
      minOnSec: 300,
      minOffSec: 300,
      // boost
      boostEnabled: false,
      boostPowerW: 2500,
      boostDurationMin: 30,
      // setpoint-specific
      autoOnSetpoint: 55,
      autoOffSetpoint: 45,
      // power/setpoint estimation
      estimatedPowerW: 1500,
      // power-specific
      maxPowerW: 2500,
      // sgready-specific
      maxSgStage: 4,
    });
  }

  // Manual-hold (Schnellsteuerung)
  els.thermalHoldMinutes.value = (cfg.manualHoldMinutes ?? 20);
  els.thermalHoldMinutes.onchange = () => {
    cfg.manualHoldMinutes = parseInt(els.thermalHoldMinutes.value, 10) || 0;
    setDirty();
  };

  // Render devices
  els.thermalDevices.innerHTML = '';

  // Helpers
  const mkGroup = (title, children) => {
    const g = document.createElement('div');
    g.style.display = 'flex';
    g.style.flexDirection = 'column';
    g.style.gap = '6px';
    g.style.padding = '10px 12px';
    g.style.border = '1px solid rgba(255,255,255,0.08)';
    g.style.borderRadius = '12px';
    g.style.background = 'rgba(255,255,255,0.02)';

    const h = document.createElement('div');
    h.textContent = title;
    h.style.fontSize = '0.78rem';
    h.style.opacity = '0.85';
    h.style.fontWeight = '600';

    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexWrap = 'wrap';
    body.style.gap = '10px';
    body.style.alignItems = 'flex-end';

    children.forEach((c) => body.appendChild(c));
    g.appendChild(h);
    g.appendChild(body);
    return g;
  };

  const mkField = (label, inputEl, help) => {
    const w = document.createElement('div');
    w.style.display = 'flex';
    w.style.flexDirection = 'column';
    w.style.gap = '4px';
    w.style.minWidth = '140px';

    const l = document.createElement('div');
    l.textContent = label;
    l.style.fontSize = '0.72rem';
    l.style.opacity = '0.75';

    if (help) {
      w.title = help;
      inputEl.title = help;
    } else {
      inputEl.title = label;
    }

    w.appendChild(l);
    w.appendChild(inputEl);
    return w;
  };

  const mkNum = (value, onChange, opts = {}) => {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.value = (value ?? '');
	  // Make inputs visually consistent with the rest of the App-Center.
	  inp.className = 'nw-config-input';
    if (opts.min != null) inp.min = String(opts.min);
    if (opts.max != null) inp.max = String(opts.max);
    if (opts.step != null) inp.step = String(opts.step);
    if (opts.placeholder) inp.placeholder = opts.placeholder;
    inp.style.width = (opts.width || '140px');
    inp.onchange = () => onChange(parseFloat(inp.value));
    return inp;
  };

  const mkSelect = (value, options, onChange, opts = {}) => {
    const sel = document.createElement('select');
	  // Make selects visually consistent with the rest of the App-Center.
	  sel.className = 'nw-config-select';
    sel.style.width = (opts.width || '180px');
    options.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    sel.value = value;
    sel.onchange = () => onChange(sel.value);
    return sel;
  };

  const mkToggle = (checked, onChange, opts = {}) => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!checked;
    cb.onchange = () => onChange(cb.checked);
    if (opts.disabled) cb.disabled = true;
    return cb;
  };

  const typeOptions = [
    { value: 'power', label: 'Leistung (W) – modulierend' },
    { value: 'setpoint', label: 'Sollwert (z.B. °C) – Setpoint' },
    { value: 'sgready', label: 'SG-Ready – Stufe/Relais' },
  ];

  const profileOptions = [
    { value: 'heat', label: 'Heizen' },
    { value: 'cool', label: 'Kühlen' },
  ];

  cfg.devices.forEach((dev, i) => {
    const idx = i + 1;

    // Row layout
    const row = document.createElement('div');
    row.className = 'row thermalRow';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '240px 1fr';
    row.style.gap = '14px';
    row.style.alignItems = 'start';

    // Left: basic
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '8px';

    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.gap = '10px';

    const en = mkToggle(dev.enabled, (v) => { dev.enabled = !!v; setDirty(); });
    title.appendChild(en);

    const t = document.createElement('div');
    t.textContent = `Slot ${idx} – Verbraucher ${idx}`;
    t.style.fontWeight = '600';
    title.appendChild(t);

    left.appendChild(title);

    const nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.value = dev.name || '';
	  nameInp.className = 'nw-config-input';
    nameInp.placeholder = 'Name (z.B. Wärmepumpe, Heizstab, Klima ...)';
    nameInp.style.width = '220px';
    nameInp.onchange = () => { dev.name = nameInp.value; setDirty(); };
    left.appendChild(mkField('Name', nameInp, 'Freier Anzeigename für VIS & AppCenter.'));

    // Right: parameters
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.flexWrap = 'wrap';
    right.style.gap = '12px';

    // Variant / profile
    const selType = mkSelect(dev.type || 'power', typeOptions, (v) => { dev.type = v; setDirty(); syncVisibility(); }, { width: '260px' });
    const selProfile = mkSelect(dev.profile || 'heat', profileOptions, (v) => { dev.profile = v; setDirty(); }, { width: '160px' });

    // PV-auto thresholds
    const inpStart = mkNum(dev.startSurplusW, (v) => { dev.startSurplusW = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 10, placeholder: 'z.B. 800', width: '130px' });
    const inpStop = mkNum(dev.stopSurplusW, (v) => { dev.stopSurplusW = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 10, placeholder: 'z.B. 300', width: '130px' });

    // Timing (anti-flutter)
    const inpMinOn = mkNum(dev.minOnSec, (v) => { dev.minOnSec = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 1, placeholder: 'Sek.', width: '110px' });
    const inpMinOff = mkNum(dev.minOffSec, (v) => { dev.minOffSec = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 1, placeholder: 'Sek.', width: '110px' });

    // Boost
    const inpBoostEn = mkToggle(dev.boostEnabled, (v) => { dev.boostEnabled = !!v; setDirty(); syncVisibility(); });
    const inpBoostW = mkNum(dev.boostPowerW, (v) => { dev.boostPowerW = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 10, placeholder: 'W', width: '120px' });
    const inpBoostMin = mkNum(dev.boostDurationMin, (v) => { dev.boostDurationMin = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 1, placeholder: 'Min.', width: '120px' });

    // Setpoint
    const inpAutoOn = mkNum(dev.autoOnSetpoint, (v) => { dev.autoOnSetpoint = isFinite(v) ? v : 0; setDirty(); }, { step: 1, placeholder: 'z.B. 55', width: '120px' });
    const inpAutoOff = mkNum(dev.autoOffSetpoint, (v) => { dev.autoOffSetpoint = isFinite(v) ? v : 0; setDirty(); }, { step: 1, placeholder: 'z.B. 45', width: '120px' });

    // Power estimation / limits
    const inpEstW = mkNum(dev.estimatedPowerW, (v) => { dev.estimatedPowerW = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 10, placeholder: 'W', width: '120px' });
    const inpMaxW = mkNum(dev.maxPowerW, (v) => { dev.maxPowerW = isFinite(v) ? v : 0; setDirty(); }, { min: 0, step: 10, placeholder: 'W', width: '120px' });

    // SG-Ready
    const inpMaxStage = mkNum(dev.maxSgStage, (v) => { dev.maxSgStage = isFinite(v) ? v : 0; setDirty(); }, { min: 1, step: 1, placeholder: '1-4', width: '110px' });

    // Assemble groups
    right.appendChild(mkGroup('Variante & Modus', [
      mkField('Regelvariante', selType, 'Wählen, wie der Verbraucher geregelt wird (Leistung, Sollwert oder SG‑Ready).'),
      mkField('Profil', selProfile, 'Nur Anzeige/Label (z.B. Heizen/Kühlen).'),
    ]));

    right.appendChild(mkGroup('PV‑Auto Schwellwerte', [
      mkField('Start Überschuss (W)', inpStart, 'Ab diesem PV‑Überschuss wird der Verbraucher eingeschaltet/angehoben.'),
      mkField('Stop Überschuss (W)', inpStop, 'Unterhalb dieses Überschusses wird der Verbraucher wieder reduziert/ausgeschaltet.'),
    ]));

    right.appendChild(mkGroup('Timing (Anti‑Flattern)', [
      mkField('Min. Ein‑Zeit (s)', inpMinOn, 'Verhindert häufiges Ein/Aus (Mindestlaufzeit).'),
      mkField('Min. Aus‑Zeit (s)', inpMinOff, 'Verhindert häufiges Ein/Aus (Mindestruhezeit).'),
    ]));

    // Variant-specific
    const grpSetpoint = mkGroup('Sollwert (Setpoint)', [
      mkField('Auto‑On Sollwert', inpAutoOn, 'Sollwert der bei PV‑Auto gesetzt wird (z.B. °C).'),
      mkField('Auto‑Off Sollwert', inpAutoOff, 'Sollwert der bei PV‑Auto gesetzt wird (z.B. °C).'),
      mkField('Leistungs‑Schätzung (W)', inpEstW, 'Für Regelung/Anzeige – typische Leistungsaufnahme bei aktivem Setpoint.'),
    ]);

    const grpPower = mkGroup('Leistung (W)', [
      mkField('Leistungs‑Schätzung (W)', inpEstW, 'Für Regelung/Anzeige – typische Leistungsaufnahme bei aktivem Verbraucher.'),
      mkField('Max. Leistung (W)', inpMaxW, 'Obergrenze für modulierende Leistungs‑Ansteuerung.'),
    ]);

    const grpSg = mkGroup('SG‑Ready', [
      mkField('Leistungs‑Schätzung (W)', inpEstW, 'Für Regelung/Anzeige – typische Leistungsaufnahme bei SG‑Ready Stufe.'),
      mkField('Max. SG‑Stufe', inpMaxStage, 'Maximale Stufe (z.B. 4).'),
    ]);

    right.appendChild(grpSetpoint);
    right.appendChild(grpPower);
    right.appendChild(grpSg);

    // Boost group
    const boostWrap = document.createElement('div');
    boostWrap.style.display = 'flex';
    boostWrap.style.alignItems = 'center';
    boostWrap.style.gap = '8px';
    boostWrap.appendChild(inpBoostEn);
    const boostEnLabel = document.createElement('div');
    boostEnLabel.textContent = 'Boost aktiv';
    boostEnLabel.style.fontSize = '0.9rem';
    boostWrap.appendChild(boostEnLabel);

    const grpBoost = mkGroup('Boost (Schnellsteuerung)', [
      mkField('Boost Ein/Aus', boostWrap, 'Erlaubt dem Endkunden einen zeitlich begrenzten Boost über die VIS.'),
      mkField('Boost Wert (W)', inpBoostW, 'Bei Boost: Ziel‑Leistung oder Schaltwert.'),
      mkField('Boost Dauer (min)', inpBoostMin, 'Wie lange Boost aktiv bleibt.'),
    ]);
    right.appendChild(grpBoost);

    // Visibility logic
    function syncVisibility() {
      const t = String(dev.type || 'power');
      grpSetpoint.style.display = (t === 'setpoint') ? '' : 'none';
      grpPower.style.display = (t === 'power') ? '' : 'none';
      grpSg.style.display = (t === 'sgready') ? '' : 'none';

      inpBoostW.disabled = !dev.boostEnabled;
      inpBoostMin.disabled = !dev.boostEnabled;
    }
    syncVisibility();

    row.appendChild(left);
    row.appendChild(right);
    els.thermalDevices.appendChild(row);
  });

  updateAppActive();
}



  // ------------------------------
  // BHKW Steuerung
  // ------------------------------

  function _ensureBhkwCfg() {
    currentConfig = currentConfig || {};
    currentConfig.bhkw = (currentConfig.bhkw && typeof currentConfig.bhkw === 'object') ? currentConfig.bhkw : {};
    const b = currentConfig.bhkw;
    b.devices = Array.isArray(b.devices) ? b.devices : [];

    const used = new Set();
    const normalized = [];

    const mkDefault = (idx) => ({
      idx,
      enabled: false,
      name: `BHKW ${idx}`,
      showInLive: true,
      userCanControl: true,

      startWriteId: '',
      stopWriteId: '',
      runningReadId: '',
      powerReadId: '',

      socStartPct: 25,
      socStopPct: 60,
      minRunMin: 10,
      minOffMin: 5,
      maxAgeSec: 30,

      commandType: 'pulse',
      pulseMs: 800,
    });

    for (let i = 0; i < b.devices.length; i++) {
      const it = b.devices[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const d = mkDefault(idx);

      d.enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : d.enabled;
      d.name = String(it.name || '').trim() || d.name;
      d.showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : d.showInLive;
      d.userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : d.userCanControl;

      d.startWriteId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
      d.stopWriteId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
      d.runningReadId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
      d.powerReadId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

      d.socStartPct = Number.isFinite(Number(it.socStartPct)) ? Number(it.socStartPct) : d.socStartPct;
      d.socStopPct = Number.isFinite(Number(it.socStopPct)) ? Number(it.socStopPct) : d.socStopPct;
      d.minRunMin = Number.isFinite(Number(it.minRunMin)) ? Number(it.minRunMin) : d.minRunMin;
      d.minOffMin = Number.isFinite(Number(it.minOffMin)) ? Number(it.minOffMin) : d.minOffMin;
      d.maxAgeSec = Number.isFinite(Number(it.maxAgeSec)) ? Number(it.maxAgeSec) : d.maxAgeSec;

      d.commandType = (String(it.commandType || '').trim().toLowerCase() === 'level') ? 'level' : 'pulse';
      d.pulseMs = Number.isFinite(Number(it.pulseMs)) ? Number(it.pulseMs) : d.pulseMs;

      // A "placeholder" slot is an additional device entry (idx>1) with no IO‑Broker IDs configured.
      // Earlier hotfixes pre-created multiple empty slots which confused customers.
      // We aggressively hide unused additional slots unless the user configures at least one ID
      // or explicitly enables the device.
      const isPlaceholder = (
        !d.enabled &&
        !d.startWriteId &&
        !d.stopWriteId &&
        !d.runningReadId &&
        !d.powerReadId &&
        (d.name === `BHKW ${idx}` || !String(d.name || '').trim())
      );

      // Clean up legacy placeholders (older hotfixes pre-created 5 empty slots).
      if (idx > 1 && isPlaceholder) continue;

      normalized.push(d);
    }

    // Default: only 1 device (idx=1). Additional devices can be added later.
    if (!normalized.length) {
      normalized.push(mkDefault(1));
    }

    normalized.sort((a, b) => a.idx - b.idx);
    b.devices = normalized;
    return b;
  }

  function buildBhkwUI() {
    if (!els.bhkwDevices) return;
    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.bhkw) ? apps.bhkw : { installed: false, enabled: false };

    els.bhkwDevices.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „BHKW“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.bhkwDevices.appendChild(msg);
      return;
    }

    const b = _ensureBhkwCfg();    const mkFieldRow = (labelTxt, controlEl, hintTxt = '') => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      row.style.flexWrap = 'wrap';

      const label = document.createElement('div');
      label.className = 'nw-config-field-label';
      label.textContent = labelTxt;
      // Give the control more room (DP picker is wide)
      label.style.flex = '0 0 34%';
      label.style.maxWidth = '34%';

      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-field-control';
      ctrl.style.flex = '1 1 66%';
      ctrl.appendChild(controlEl);

      row.appendChild(label);
      row.appendChild(ctrl);

      if (hintTxt) {
        const h = document.createElement('div');
        h.className = 'nw-config-field-hint';
        h.textContent = hintTxt;
        h.style.flex = '0 0 100%';
        h.style.maxWidth = '100%';
        h.style.marginTop = '2px';
        row.appendChild(h);
      }

      return row;
    };

    const mkTextInput = (value, onChange, placeholder = '') => {
      const i = document.createElement('input');
      i.type = 'text';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      if (placeholder) i.placeholder = placeholder;
      i.addEventListener('input', () => { try { onChange(i.value); } catch(_e) {} scheduleValidation(); });
      return i;
    };

    const mkNumInput = (value, onChange) => {
      const i = document.createElement('input');
      i.type = 'number';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      i.addEventListener('input', () => {
        const n = Number(i.value);
        try { onChange(Number.isFinite(n) ? n : 0); } catch(_e) {}
        scheduleValidation();
      });
      return i;
    };

    // Checkbox helper (label + checkbox). Note: .nw-config-checkbox is the checkbox INPUT styling.
    // Using it on the label would clamp the label size (14x14) and cause overlaps.
    const mkCheckbox = (checked, text, onChange) => {
      const label = document.createElement('label');
      label.className = 'nw-config-checklabel';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = !!checked;
      cb.addEventListener('change', () => { try { onChange(!!cb.checked); } catch(_e) {} scheduleValidation(); });

      const span = document.createElement('span');
      span.textContent = text;

      label.appendChild(cb);
      label.appendChild(span);
      return label;
    };

    const mkSelect = (value, opts, onChange) => {
      const s = document.createElement('select');
      s.className = 'nw-config-input';
      for (const o of opts) {
        const op = document.createElement('option');
        op.value = o.value;
        op.textContent = o.label;
        s.appendChild(op);
      }
      s.value = String(value || opts[0]?.value || '');
      s.addEventListener('change', () => { try { onChange(s.value); } catch(_e) {} scheduleValidation(); });
      return s;
    };

    for (const dev of b.devices) {
      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.style.marginBottom = '10px';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const headerTop = document.createElement('div');
      headerTop.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = `BHKW ${dev.idx}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const advBtn = document.createElement('button');
      advBtn.type = 'button';
      advBtn.className = 'nw-config-btn nw-config-btn--ghost';
      advBtn.textContent = 'Erweitert';
      actions.appendChild(advBtn);

      headerTop.appendChild(title);
      headerTop.appendChild(actions);
      header.appendChild(headerTop);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = 'Leistung (W) ist für Energiefluss/Monitoring wichtig; Start/Stop + Laufstatus für saubere Auto‑Logik.';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      body.appendChild(mkFieldRow('Name', mkTextInput(dev.name, (v) => { dev.name = String(v || '').trim(); }, `BHKW ${dev.idx}`)));

      // Optionen kompakt in einer Zeile
      const opts = document.createElement('div');
      opts.style.display = 'flex';
      opts.style.flexWrap = 'wrap';
      opts.style.alignItems = 'center';
      opts.style.gap = '12px';
      opts.appendChild(mkCheckbox(dev.enabled, 'Regelung aktiv', (v) => { dev.enabled = v; }));
      opts.appendChild(mkCheckbox(dev.showInLive, 'In VIS anzeigen', (v) => { dev.showInLive = v; }));
      opts.appendChild(mkCheckbox(dev.userCanControl, 'Endkunde darf bedienen', (v) => { dev.userCanControl = v; }));
      body.appendChild(mkFieldRow('Optionen', opts));

      // Datapoints (mit Picker)
      body.appendChild(mkFieldRow('Start (Write)', _mkDpWrap(`bhkw_b${dev.idx}_startWriteId`, dev.startWriteId, 'Write‑Datenpunkt', (v) => { dev.startWriteId = v; })));
      body.appendChild(mkFieldRow('Stop (Write)', _mkDpWrap(`bhkw_b${dev.idx}_stopWriteId`, dev.stopWriteId, 'Write‑Datenpunkt', (v) => { dev.stopWriteId = v; })));
      body.appendChild(mkFieldRow('Laufstatus (Read, optional)', _mkDpWrap(`bhkw_b${dev.idx}_runningReadId`, dev.runningReadId, 'Read‑Datenpunkt', (v) => { dev.runningReadId = v; }),
        'Empfohlen für saubere Auto‑Logik und Statusanzeige.'));
      body.appendChild(mkFieldRow('Leistung (W) (Read)', _mkDpWrap(`bhkw_b${dev.idx}_powerReadId`, dev.powerReadId, 'Read‑Datenpunkt (W/kW)', (v) => { dev.powerReadId = v; }),
        'Erforderlich für die Anzeige im Energiefluss (BHKW als Erzeuger).'));

      // Advanced (ausklappbar)
      const adv = document.createElement('div');
      adv.style.display = 'none';
      adv.style.marginTop = '6px';
      adv.appendChild(mkFieldRow('SoC Start‑Schwelle (%)', mkNumInput(dev.socStartPct, (v) => { dev.socStartPct = v; }), 'Auto‑Start wenn SoC <= Start‑Schwelle.'));
      adv.appendChild(mkFieldRow('SoC Stop‑Schwelle (%)', mkNumInput(dev.socStopPct, (v) => { dev.socStopPct = v; }), 'Auto‑Stop wenn SoC >= Stop‑Schwelle.'));
      adv.appendChild(mkFieldRow('Mindestlaufzeit (min)', mkNumInput(dev.minRunMin, (v) => { dev.minRunMin = v; })));
      adv.appendChild(mkFieldRow('Mindeststillstand (min)', mkNumInput(dev.minOffMin, (v) => { dev.minOffMin = v; })));
      adv.appendChild(mkFieldRow('Max. Datenalter (s)', mkNumInput(dev.maxAgeSec, (v) => { dev.maxAgeSec = v; }),
        'Wenn Laufstatus/Leistung älter ist → keine Auto‑Aktion.'));
      adv.appendChild(mkFieldRow('Befehlstyp', mkSelect(dev.commandType, [
        { value: 'pulse', label: 'Pulse (TRUE → FALSE)' },
        { value: 'level', label: 'Level (TRUE)' },
      ], (v) => { dev.commandType = (v === 'level') ? 'level' : 'pulse'; })));
      adv.appendChild(mkFieldRow('Pulse‑Dauer (ms)', mkNumInput(dev.pulseMs, (v) => { dev.pulseMs = v; })));
      body.appendChild(adv);

      advBtn.addEventListener('click', () => {
        const open = adv.style.display !== 'none';
        adv.style.display = open ? 'none' : '';
        advBtn.textContent = open ? 'Erweitert' : 'Weniger';
      });

      const footer = document.createElement('div');
      footer.className = 'nw-config-card__row';
      footer.style.opacity = '0.82';
      footer.style.marginTop = '6px';
      footer.textContent = 'Hinweis: In der VIS ist Start/Stop nur im Modus „Manuell“ aktiv.';
      body.appendChild(footer);

      card.appendChild(header);
      card.appendChild(body);
      els.bhkwDevices.appendChild(card);
    }
  }


  // ------------------------------
  // Generator Steuerung (Notstrom/Netzparallelbetrieb)
  // ------------------------------

  function _ensureGeneratorCfg() {
    currentConfig = currentConfig || {};
    currentConfig.generator = (currentConfig.generator && typeof currentConfig.generator === 'object') ? currentConfig.generator : {};
    const g = currentConfig.generator;
    g.devices = Array.isArray(g.devices) ? g.devices : [];

    const used = new Set();
    const normalized = [];

    const mkDefault = (idx) => ({
      idx,
      enabled: false,
      name: `Generator ${idx}`,
      showInLive: true,
      userCanControl: true,

      startWriteId: '',
      stopWriteId: '',
      runningReadId: '',
      powerReadId: '',

      socStartPct: 25,
      socStopPct: 60,
      minRunMin: 10,
      minOffMin: 5,
      maxAgeSec: 30,

      commandType: 'pulse',
      pulseMs: 800,
    });

    for (let i = 0; i < g.devices.length; i++) {
      const it = g.devices[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const d = mkDefault(idx);

      d.enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : d.enabled;
      d.name = String(it.name || '').trim() || d.name;
      d.showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : d.showInLive;
      d.userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : d.userCanControl;

      d.startWriteId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
      d.stopWriteId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
      d.runningReadId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
      d.powerReadId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

      d.socStartPct = Number.isFinite(Number(it.socStartPct)) ? Number(it.socStartPct) : d.socStartPct;
      d.socStopPct = Number.isFinite(Number(it.socStopPct)) ? Number(it.socStopPct) : d.socStopPct;
      d.minRunMin = Number.isFinite(Number(it.minRunMin)) ? Number(it.minRunMin) : d.minRunMin;
      d.minOffMin = Number.isFinite(Number(it.minOffMin)) ? Number(it.minOffMin) : d.minOffMin;
      d.maxAgeSec = Number.isFinite(Number(it.maxAgeSec)) ? Number(it.maxAgeSec) : d.maxAgeSec;

      d.commandType = (String(it.commandType || '').trim().toLowerCase() === 'level') ? 'level' : 'pulse';
      d.pulseMs = Number.isFinite(Number(it.pulseMs)) ? Number(it.pulseMs) : d.pulseMs;

      // Consider "unused" extra slots as placeholders. Keep only idx=1 by default
      // to avoid confusing customers.
      const hasAnyId = !!(d.startWriteId || d.stopWriteId || d.runningReadId || d.powerReadId);
      const isPlaceholder = (!d.enabled && !hasAnyId && (d.name === `Generator ${idx}` || !d.name));

      // Clean up legacy placeholders (older hotfixes pre-created 5 empty slots).
      if (idx > 1 && isPlaceholder) continue;

      normalized.push(d);
    }

    // Default: only 1 device (idx=1). Additional devices can be added later.
    if (!normalized.length) {
      normalized.push(mkDefault(1));
    }

    normalized.sort((a, b) => a.idx - b.idx);
    g.devices = normalized;
    return g;
  }

  function buildGeneratorUI() {
    if (!els.generatorDevices) return;

    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.generator) ? apps.generator : { installed: false, enabled: false };

    els.generatorDevices.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Generator“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.generatorDevices.appendChild(msg);
      return;
    }

    const gCfg = _ensureGeneratorCfg();    const mkFieldRow = (labelTxt, controlEl, hintTxt = '') => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      row.style.flexWrap = 'wrap';

      const label = document.createElement('div');
      label.className = 'nw-config-field-label';
      label.textContent = labelTxt;
      // Give the control more room (DP picker is wide)
      label.style.flex = '0 0 34%';
      label.style.maxWidth = '34%';

      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-field-control';
      ctrl.style.flex = '1 1 66%';
      ctrl.appendChild(controlEl);

      row.appendChild(label);
      row.appendChild(ctrl);

      if (hintTxt) {
        const h = document.createElement('div');
        h.className = 'nw-config-field-hint';
        h.textContent = hintTxt;
        h.style.flex = '0 0 100%';
        h.style.maxWidth = '100%';
        h.style.marginTop = '2px';
        row.appendChild(h);
      }

      return row;
    };

    const mkTextInput = (value, onChange, placeholder = '') => {
      const i = document.createElement('input');
      i.type = 'text';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      if (placeholder) i.placeholder = placeholder;
      i.addEventListener('input', () => { try { onChange(i.value); } catch(_e) {} scheduleValidation(); });
      return i;
    };

    const mkNumInput = (value, onChange) => {
      const i = document.createElement('input');
      i.type = 'number';
      i.className = 'nw-config-input';
      i.value = (value === null || value === undefined) ? '' : String(value);
      i.addEventListener('input', () => {
        const n = Number(i.value);
        try { onChange(Number.isFinite(n) ? n : 0); } catch(_e) {}
        scheduleValidation();
      });
      return i;
    };

    const mkCheckbox = (checked, text, onChange) => {
      // Important: `.nw-config-checkbox` is the *input* style (14x14).
      // The label itself must be flexible, otherwise text overlaps.
      const label = document.createElement('label');
      label.className = 'nw-config-checklabel';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = !!checked;
      cb.addEventListener('change', () => { try { onChange(!!cb.checked); } catch(_e) {} scheduleValidation(); });

      const span = document.createElement('span');
      span.textContent = text;

      label.appendChild(cb);
      label.appendChild(span);
      return label;
    };

    const mkSelect = (value, opts, onChange) => {
      const s = document.createElement('select');
      s.className = 'nw-config-input';
      for (const o of opts) {
        const op = document.createElement('option');
        op.value = o.value;
        op.textContent = o.label;
        s.appendChild(op);
      }
      s.value = String(value || opts[0]?.value || '');
      s.addEventListener('change', () => { try { onChange(s.value); } catch(_e) {} scheduleValidation(); });
      return s;
    };

    for (const dev of gCfg.devices) {
      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.style.marginBottom = '10px';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const headerTop = document.createElement('div');
      headerTop.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = `Generator ${dev.idx}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const advBtn = document.createElement('button');
      advBtn.type = 'button';
      advBtn.className = 'nw-config-btn nw-config-btn--ghost';
      advBtn.textContent = 'Erweitert';
      actions.appendChild(advBtn);

      headerTop.appendChild(title);
      headerTop.appendChild(actions);
      header.appendChild(headerTop);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = 'Leistung (W) ist für Energiefluss/Monitoring wichtig; Start/Stop + Laufstatus für saubere Auto‑Logik.';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      body.appendChild(mkFieldRow('Name', mkTextInput(dev.name, (v) => { dev.name = String(v || '').trim(); }, `Generator ${dev.idx}`)));

      const opts = document.createElement('div');
      opts.style.display = 'flex';
      opts.style.flexWrap = 'wrap';
      opts.style.alignItems = 'center';
      opts.style.gap = '12px';
      opts.appendChild(mkCheckbox(dev.enabled, 'Regelung aktiv', (v) => { dev.enabled = v; }));
      opts.appendChild(mkCheckbox(dev.showInLive, 'In VIS anzeigen', (v) => { dev.showInLive = v; }));
      opts.appendChild(mkCheckbox(dev.userCanControl, 'Endkunde darf bedienen', (v) => { dev.userCanControl = v; }));
      body.appendChild(mkFieldRow('Optionen', opts));

      body.appendChild(mkFieldRow('Start (Write)', _mkDpWrap(`gen_g${dev.idx}_startWriteId`, dev.startWriteId, 'Write‑Datenpunkt', (v) => { dev.startWriteId = v; })));
      body.appendChild(mkFieldRow('Stop (Write)', _mkDpWrap(`gen_g${dev.idx}_stopWriteId`, dev.stopWriteId, 'Write‑Datenpunkt', (v) => { dev.stopWriteId = v; })));
      body.appendChild(mkFieldRow('Laufstatus (Read, optional)', _mkDpWrap(`gen_g${dev.idx}_runningReadId`, dev.runningReadId, 'Read‑Datenpunkt', (v) => { dev.runningReadId = v; }),
        'Empfohlen für saubere Auto‑Logik und Statusanzeige.'));
      body.appendChild(mkFieldRow('Leistung (W) (Read)', _mkDpWrap(`gen_g${dev.idx}_powerReadId`, dev.powerReadId, 'Read‑Datenpunkt (W/kW)', (v) => { dev.powerReadId = v; }),
        'Erforderlich für die Anzeige im Energiefluss (Generator als Erzeuger).'));

      const adv = document.createElement('div');
      adv.style.display = 'none';
      adv.style.marginTop = '6px';
      adv.appendChild(mkFieldRow('SoC Start‑Schwelle (%)', mkNumInput(dev.socStartPct, (v) => { dev.socStartPct = v; }), 'Auto‑Start wenn SoC <= Start‑Schwelle.'));
      adv.appendChild(mkFieldRow('SoC Stop‑Schwelle (%)', mkNumInput(dev.socStopPct, (v) => { dev.socStopPct = v; }), 'Auto‑Stop wenn SoC >= Stop‑Schwelle.'));
      adv.appendChild(mkFieldRow('Mindestlaufzeit (min)', mkNumInput(dev.minRunMin, (v) => { dev.minRunMin = v; })));
      adv.appendChild(mkFieldRow('Mindeststillstand (min)', mkNumInput(dev.minOffMin, (v) => { dev.minOffMin = v; })));
      adv.appendChild(mkFieldRow('Max. Datenalter (s)', mkNumInput(dev.maxAgeSec, (v) => { dev.maxAgeSec = v; }),
        'Wenn Laufstatus/Leistung älter ist → keine Auto‑Aktion.'));
      adv.appendChild(mkFieldRow('Befehlstyp', mkSelect(dev.commandType, [
        { value: 'pulse', label: 'Pulse (TRUE → FALSE)' },
        { value: 'level', label: 'Level (TRUE)' },
      ], (v) => { dev.commandType = (v === 'level') ? 'level' : 'pulse'; })));
      adv.appendChild(mkFieldRow('Pulse‑Dauer (ms)', mkNumInput(dev.pulseMs, (v) => { dev.pulseMs = v; })));
      body.appendChild(adv);

      advBtn.addEventListener('click', () => {
        const open = adv.style.display !== 'none';
        adv.style.display = open ? 'none' : '';
        advBtn.textContent = open ? 'Erweitert' : 'Weniger';
      });

      const footer = document.createElement('div');
      footer.className = 'nw-config-card__row';
      footer.style.opacity = '0.82';
      footer.style.marginTop = '6px';
      footer.textContent = 'Hinweis: In der VIS ist Start/Stop nur im Modus „Manuell“ aktiv.';
      body.appendChild(footer);

      card.appendChild(header);
      card.appendChild(body);
      els.generatorDevices.appendChild(card);
    }
  }


  // ------------------------------
  // Schwellwertsteuerung (Regeln)
  // ------------------------------

  function _ensureThresholdCfg() {
    currentConfig = currentConfig || {};
    currentConfig.threshold = (currentConfig.threshold && typeof currentConfig.threshold === 'object') ? currentConfig.threshold : {};
    const t = currentConfig.threshold;
    t.rules = Array.isArray(t.rules) ? t.rules : [];

    const out = [];
    const used = new Set();

    const normOutType = (v) => {
      const s = String(v || '').trim().toLowerCase();
      return (s === 'boolean' || s === 'bool' || s === 'switch') ? 'boolean' : 'number';
    };

    const normCompare = (v) => {
      const s = String(v || '').trim().toLowerCase();
      return (s === 'below' || s === '<' || s === 'lt' || s === 'kleiner') ? 'below' : 'above';
    };

    for (let i = 0; i < t.rules.length; i++) {
      const r0 = t.rules[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(r0.idx ?? r0.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const outType = normOutType(r0.outputType);
      const onDef = (outType === 'boolean') ? true : 1;
      const offDef = (outType === 'boolean') ? false : 0;

      out.push({
        idx,
        enabled: (typeof r0.enabled === 'boolean') ? !!r0.enabled : true,
        name: String(r0.name || '').trim() || `Regel ${idx}`,
        inputId: String(r0.inputId || r0.inputObjectId || '').trim(),
        compare: normCompare(r0.compare),
        threshold: (Number.isFinite(Number(r0.threshold))) ? Number(r0.threshold) : 0,
        hysteresis: (Number.isFinite(Number(r0.hysteresis))) ? Math.max(0, Number(r0.hysteresis)) : 0,
        minOnSec: (Number.isFinite(Number(r0.minOnSec))) ? Math.max(0, Number(r0.minOnSec)) : 0,
        minOffSec: (Number.isFinite(Number(r0.minOffSec))) ? Math.max(0, Number(r0.minOffSec)) : 0,
        outputType: outType,
        outputId: String(r0.outputId || r0.outputObjectId || '').trim(),
        onValue: (r0.onValue !== undefined) ? r0.onValue : onDef,
        offValue: (r0.offValue !== undefined) ? r0.offValue : offDef,
        maxAgeMs: (Number.isFinite(Number(r0.maxAgeMs))) ? Math.max(500, Math.round(Number(r0.maxAgeMs))) : 5000,
        userCanToggle: (typeof r0.userCanToggle === 'boolean') ? !!r0.userCanToggle : true,
        userCanSetThreshold: (typeof r0.userCanSetThreshold === 'boolean') ? !!r0.userCanSetThreshold : true,
        userCanSetMinOnSec: (typeof r0.userCanSetMinOnSec === 'boolean') ? !!r0.userCanSetMinOnSec : ((typeof r0.userCanSetThreshold === 'boolean') ? !!r0.userCanSetThreshold : true),
        userCanSetMinOffSec: (typeof r0.userCanSetMinOffSec === 'boolean') ? !!r0.userCanSetMinOffSec : ((typeof r0.userCanSetThreshold === 'boolean') ? !!r0.userCanSetThreshold : true),
      });
    }

    out.sort((a, b) => a.idx - b.idx);
    t.rules = out;
    return t;
  }

  function _nextFreeThresholdIdx() {
    const t = _ensureThresholdCfg();
    const used = new Set((t.rules || []).map(r => Number(r && r.idx)).filter(n => Number.isFinite(n)));
    for (let i = 1; i <= 10; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }

  function buildThresholdUI() {
    if (!els.thresholdRules) return;

    const t = _ensureThresholdCfg();

    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.threshold) ? apps.threshold : { installed: false, enabled: false };

    els.thresholdRules.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Schwellwertsteuerung“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.thresholdRules.appendChild(msg);
      return;
    }

    const mkHdr = (title, subtitle) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-help';
      const t1 = document.createElement('div');
      t1.style.fontWeight = '700';
      t1.textContent = title;
      const t2 = document.createElement('div');
      t2.style.opacity = '0.85';
      t2.style.marginTop = '4px';
      t2.textContent = subtitle;
      wrap.appendChild(t1);
      wrap.appendChild(t2);
      return wrap;
    };

    if (!t.rules.length) {
      els.thresholdRules.appendChild(mkHdr('Noch keine Regeln.', 'Klicke auf „Regel hinzufügen“, um die erste Automation zu erstellen.'));
    }

    const listWrap = document.createElement('div');
    listWrap.className = 'nw-config-list';

    const mkLabel = (text) => {
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = text;
      return lbl;
    };

    const mkDpField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';

      wrap.appendChild(mkLabel(labelText));

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'Datenpunkt';
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    const mkNumField = (labelText, inputId, value, onChange, placeholder, unit) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null) ? String(value) : '';
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : 0);
      });

      row.appendChild(input);
      if (unit) {
        const u = document.createElement('span');
        u.className = 'nw-config-muted';
        u.textContent = unit;
        row.appendChild(u);
      }

      wrap.appendChild(row);
      return wrap;
    };

    const mkTextField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null) ? String(value) : '';
      input.addEventListener('change', () => onChange(String(input.value || '').trim()));

      wrap.appendChild(input);
      return wrap;
    };

    const mkSelectField = (labelText, inputId, value, options, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const sel = document.createElement('select');
      sel.className = 'nw-config-input';
      sel.id = inputId;
      for (const o of options) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      }
      sel.value = String(value || options[0].v);
      sel.addEventListener('change', () => onChange(String(sel.value)));

      wrap.appendChild(sel);
      return wrap;
    };

    const mkBoolSelect = (labelText, inputId, value, onChange) => {
      return mkSelectField(labelText, inputId, (value ? '1' : '0'), [
        { v: '1', t: 'Ein / True' },
        { v: '0', t: 'Aus / False' },
      ], (v) => onChange(v === '1'));
    };

    const mkChk = (labelText, inputId, checked, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const lbl = document.createElement('label');
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.marginTop = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = inputId;
      cb.checked = !!checked;
      cb.addEventListener('change', () => onChange(!!cb.checked));

      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('aktiv'));

      wrap.appendChild(lbl);
      return wrap;
    };

    const updateRule = (idx, patch) => {
      const t2 = _ensureThresholdCfg();
      const r = t2.rules.find(x => Number(x.idx) === Number(idx));
      if (!r) return;
      Object.assign(r, patch || {});
      // normalize types
      r.outputType = (String(r.outputType || '').toLowerCase() === 'boolean') ? 'boolean' : 'number';
      r.compare = (String(r.compare || '').toLowerCase() === 'below') ? 'below' : 'above';
    };

    for (const r of t.rules) {
      const idx = Number(r.idx);

      const item = document.createElement('div');
      item.className = 'nw-config-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      item.style.gap = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '10px';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = `Regel ${idx}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = 'Wenn Input ' + (r.compare === 'below' ? '<' : '>') + ' Schwellwert → schreibe Output';
      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.style.display = 'inline-flex';
      right.style.gap = '10px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      const enWrap = document.createElement('label');
      enWrap.style.display = 'inline-flex';
      enWrap.style.alignItems = 'center';
      enWrap.style.gap = '6px';
      enWrap.style.fontSize = '0.85rem';
      enWrap.style.color = '#e5e7eb';
      const en = document.createElement('input');
      en.type = 'checkbox';
      en.checked = !!r.enabled;
      en.id = `thr_rule_${idx}_enabled`;
      en.addEventListener('change', () => updateRule(idx, { enabled: !!en.checked }));
      enWrap.appendChild(en);
      enWrap.appendChild(document.createTextNode('Regel an'));
      right.appendChild(enWrap);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      del.addEventListener('click', () => {
        const t2 = _ensureThresholdCfg();
        t2.rules = (t2.rules || []).filter(x => Number(x.idx) !== Number(idx));
        buildThresholdUI();
        scheduleValidation(200);
      });
      right.appendChild(del);

      head.appendChild(left);
      head.appendChild(right);

      const grid = document.createElement('div');
      grid.className = 'nw-flow-ctrl-grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';

      grid.appendChild(mkTextField('Name', `thr_rule_${idx}_name`, r.name, (v) => updateRule(idx, { name: v }), 'z.B. Heizstab PV'));
      grid.appendChild(mkSelectField('Vergleich', `thr_rule_${idx}_compare`, r.compare, [
        { v: 'above', t: 'Input > Schwellwert' },
        { v: 'below', t: 'Input < Schwellwert' },
      ], (v) => { updateRule(idx, { compare: v }); buildThresholdUI(); }));

      grid.appendChild(mkDpField('Input‑Datenpunkt', `thr_rule_${idx}_inputId`, r.inputId, (v) => updateRule(idx, { inputId: v }), 'z.B. ...power'));
      grid.appendChild(mkNumField('Schwellwert', `thr_rule_${idx}_threshold`, r.threshold, (n) => updateRule(idx, { threshold: n }), '', ''));
      grid.appendChild(mkNumField('Hysterese', `thr_rule_${idx}_hysteresis`, r.hysteresis, (n) => updateRule(idx, { hysteresis: Math.max(0, n) }), '', ''));
      grid.appendChild(mkNumField('MinOn', `thr_rule_${idx}_minOnSec`, r.minOnSec, (n) => updateRule(idx, { minOnSec: Math.max(0, n) }), '', 's'));
      grid.appendChild(mkNumField('MinOff', `thr_rule_${idx}_minOffSec`, r.minOffSec, (n) => updateRule(idx, { minOffSec: Math.max(0, n) }), '', 's'));

      grid.appendChild(mkSelectField('Output‑Typ', `thr_rule_${idx}_outputType`, r.outputType, [
        { v: 'boolean', t: 'Switch (bool)' },
        { v: 'number', t: 'Wert (number)' },
      ], (v) => { updateRule(idx, { outputType: v }); buildThresholdUI(); }));

      grid.appendChild(mkDpField('Output‑Datenpunkt', `thr_rule_${idx}_outputId`, r.outputId, (v) => updateRule(idx, { outputId: v }), 'z.B. ...setpoint'));

      if (String(r.outputType) === 'boolean') {
        grid.appendChild(mkBoolSelect('On‑Wert', `thr_rule_${idx}_onValue`, !!r.onValue, (b) => updateRule(idx, { onValue: !!b })));
        grid.appendChild(mkBoolSelect('Off‑Wert', `thr_rule_${idx}_offValue`, !!r.offValue, (b) => updateRule(idx, { offValue: !!b })));
      } else {
        grid.appendChild(mkNumField('On‑Wert', `thr_rule_${idx}_onValue`, Number(r.onValue), (n) => updateRule(idx, { onValue: n }), '', ''));
        grid.appendChild(mkNumField('Off‑Wert', `thr_rule_${idx}_offValue`, Number(r.offValue), (n) => updateRule(idx, { offValue: n }), '', ''));
      }

      grid.appendChild(mkNumField('Max. Alter Input', `thr_rule_${idx}_maxAgeMs`, r.maxAgeMs, (n) => updateRule(idx, { maxAgeMs: Math.max(500, Math.round(n)) }), '', 'ms'));

      grid.appendChild(mkChk('Endkunde darf Regel ein/aus', `thr_rule_${idx}_userCanToggle`, r.userCanToggle !== false, (b) => updateRule(idx, { userCanToggle: !!b })));
      grid.appendChild(mkChk('Endkunde darf Schwellwert ändern', `thr_rule_${idx}_userCanSetThreshold`, r.userCanSetThreshold !== false, (b) => updateRule(idx, { userCanSetThreshold: !!b })));
      grid.appendChild(mkChk('Endkunde darf MinOn ändern', `thr_rule_${idx}_userCanSetMinOnSec`, r.userCanSetMinOnSec !== false, (b) => updateRule(idx, { userCanSetMinOnSec: !!b })));
      grid.appendChild(mkChk('Endkunde darf MinOff ändern', `thr_rule_${idx}_userCanSetMinOffSec`, r.userCanSetMinOffSec !== false, (b) => updateRule(idx, { userCanSetMinOffSec: !!b })));

      item.appendChild(head);
      item.appendChild(grid);

      listWrap.appendChild(item);
    }

    els.thresholdRules.appendChild(listWrap);

    // Buttons
    if (els.thresholdAddRule) {
      els.thresholdAddRule.onclick = () => {
        const next = _nextFreeThresholdIdx();
        if (!next) {
          setStatus('Maximal 10 Regeln möglich.', 'error');
          return;
        }
        const t2 = _ensureThresholdCfg();
        t2.rules.push({ idx: next, enabled: true, name: `Regel ${next}`, compare: 'above', threshold: 0, hysteresis: 0, minOnSec: 0, minOffSec: 0, outputType: 'boolean', onValue: true, offValue: false, maxAgeMs: 5000, userCanToggle: true, userCanSetThreshold: true, userCanSetMinOnSec: true, userCanSetMinOffSec: true, inputId: '', outputId: '' });
        buildThresholdUI();
        scheduleValidation(200);
      };
    }

    if (els.thresholdResetRules) {
      els.thresholdResetRules.onclick = () => {
        const ok = window.confirm('Alle Schwellwert-Regeln wirklich leeren?');
        if (!ok) return;
        const t2 = _ensureThresholdCfg();
        t2.rules = [];
        buildThresholdUI();
        scheduleValidation(200);
      };
    }
  }



  

  // ------------------------------
  // Relaissteuerung (manuell)
  // ------------------------------

  function _ensureRelayCfg() {
    currentConfig = currentConfig || {};
    currentConfig.relay = (currentConfig.relay && typeof currentConfig.relay === 'object') ? currentConfig.relay : {};
    const r = currentConfig.relay;
    r.relays = Array.isArray(r.relays) ? r.relays : [];

    const out = [];
    const used = new Set();

    const normType = (v) => {
      const s = String(v || '').trim().toLowerCase();
      return (s === 'boolean' || s === 'bool' || s === 'switch') ? 'boolean' : 'number';
    };

    const numOrNull = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    for (let i = 0; i < r.relays.length; i++) {
      const it0 = r.relays[i] || {};
      const idx = Math.max(1, Math.min(10, Math.round(Number(it0.idx ?? it0.index ?? (i + 1)) || (i + 1))));
      if (used.has(idx)) continue;
      used.add(idx);

      const type = normType(it0.type);

      out.push({
        idx,
        enabled: (typeof it0.enabled === 'boolean') ? !!it0.enabled : true,
        showInLive: (typeof it0.showInLive === 'boolean') ? !!it0.showInLive : true,
        name: String(it0.name || '').trim() || `Ausgang ${idx}`,
        type,
        writeId: String(it0.writeId || it0.writeObjectId || '').trim(),
        readId: String(it0.readId || it0.readObjectId || '').trim(),
        invert: (typeof it0.invert === 'boolean') ? !!it0.invert : false,
        userCanToggle: (typeof it0.userCanToggle === 'boolean') ? !!it0.userCanToggle : true,
        userCanSetValue: (typeof it0.userCanSetValue === 'boolean') ? !!it0.userCanSetValue : true,
        min: numOrNull(it0.min),
        max: numOrNull(it0.max),
        step: numOrNull(it0.step),
        unit: String(it0.unit || '').trim(),
      });
    }

    out.sort((a, b) => a.idx - b.idx);
    r.relays = out;
    return r;
  }

  function _nextFreeRelayIdx() {
    const r = _ensureRelayCfg();
    const used = new Set((r.relays || []).map(x => Number(x && x.idx)).filter(n => Number.isFinite(n)));
    for (let i = 1; i <= 10; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }

  function buildRelayUI() {
    if (!els.relayControls) return;

    const r = _ensureRelayCfg();

    // App installed?
    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.relay) ? apps.relay : { installed: false, enabled: false };

    els.relayControls.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Relaissteuerung“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.relayControls.appendChild(msg);
      return;
    }

    const mkHdr = (title, subtitle) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-help';
      const t1 = document.createElement('div');
      t1.style.fontWeight = '700';
      t1.textContent = title;
      const t2 = document.createElement('div');
      t2.style.opacity = '0.85';
      t2.style.marginTop = '4px';
      t2.textContent = subtitle;
      wrap.appendChild(t1);
      wrap.appendChild(t2);
      return wrap;
    };

    if (!r.relays.length) {
      els.relayControls.appendChild(mkHdr('Noch keine Ausgänge.', 'Klicke auf „Ausgang hinzufügen“, um den ersten Ausgang anzulegen.'));
    }

    const listWrap = document.createElement('div');
    listWrap.className = 'nw-config-list';

    const mkLabel = (text) => {
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = text;
      return lbl;
    };

    const mkDpField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';

      wrap.appendChild(mkLabel(labelText));

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'Datenpunkt';
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    const mkTextField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null) ? String(value) : '';
      input.addEventListener('change', () => onChange(String(input.value || '').trim()));

      wrap.appendChild(input);
      return wrap;
    };

    const mkNumField = (labelText, inputId, value, onChange, unit) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = inputId;
      input.value = (value !== undefined && value !== null && value !== '') ? String(value) : '';
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : null);
      });

      row.appendChild(input);
      if (unit) {
        const u = document.createElement('span');
        u.className = 'nw-config-muted';
        u.textContent = unit;
        row.appendChild(u);
      }

      wrap.appendChild(row);
      return wrap;
    };

    const mkSelectField = (labelText, inputId, value, options, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const sel = document.createElement('select');
      sel.className = 'nw-config-input';
      sel.id = inputId;
      for (const o of options) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      }
      sel.value = String(value || options[0].v);
      sel.addEventListener('change', () => onChange(String(sel.value)));

      wrap.appendChild(sel);
      return wrap;
    };

    const mkChk = (labelText, inputId, checked, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));

      const lbl = document.createElement('label');
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.marginTop = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = inputId;
      cb.checked = !!checked;
      cb.addEventListener('change', () => onChange(!!cb.checked));

      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('aktiv'));

      wrap.appendChild(lbl);
      return wrap;
    };

    const updateRelay = (idx, patch) => {
      const r2 = _ensureRelayCfg();
      const it = r2.relays.find(x => Number(x.idx) === Number(idx));
      if (!it) return;
      Object.assign(it, patch || {});
      it.type = (String(it.type || '').toLowerCase() === 'boolean') ? 'boolean' : 'number';
    };

    for (const it of r.relays) {
      const idx = Number(it.idx);

      const item = document.createElement('div');
      item.className = 'nw-config-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      item.style.gap = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.alignItems = 'center';
      head.style.justifyContent = 'space-between';
      head.style.gap = '10px';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = `Ausgang ${idx}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = it.type === 'boolean' ? 'Switch (bool) – Ein/Aus' : 'Wert (number) – z.B. Sollwert';
      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.style.display = 'inline-flex';
      right.style.gap = '10px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      const enWrap = document.createElement('label');
      enWrap.style.display = 'inline-flex';
      enWrap.style.alignItems = 'center';
      enWrap.style.gap = '6px';
      enWrap.style.fontSize = '0.85rem';
      enWrap.style.color = '#e5e7eb';
      const en = document.createElement('input');
      en.type = 'checkbox';
      en.checked = !!it.enabled;
      en.id = `relay_${idx}_enabled`;
      en.addEventListener('change', () => updateRelay(idx, { enabled: !!en.checked }));
      enWrap.appendChild(en);
      enWrap.appendChild(document.createTextNode('aktiv'));
      right.appendChild(enWrap);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      del.addEventListener('click', () => {
        const r2 = _ensureRelayCfg();
        r2.relays = (r2.relays || []).filter(x => Number(x.idx) !== Number(idx));
        buildRelayUI();
        scheduleValidation(200);
      });
      right.appendChild(del);

      head.appendChild(left);
      head.appendChild(right);

      const grid = document.createElement('div');
      grid.className = 'nw-flow-ctrl-grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';

      grid.appendChild(mkTextField('Name', `relay_${idx}_name`, it.name, (v) => updateRelay(idx, { name: v }), 'z.B. Heizstab'));
      grid.appendChild(mkSelectField('Typ', `relay_${idx}_type`, it.type, [
        { v: 'boolean', t: 'Switch (bool)' },
        { v: 'number', t: 'Wert (number)' },
      ], (v) => { updateRelay(idx, { type: v }); buildRelayUI(); }));

      grid.appendChild(mkDpField('Write‑Datenpunkt', `relay_${idx}_writeId`, it.writeId, (v) => updateRelay(idx, { writeId: v }), '…write'));
      grid.appendChild(mkDpField('Read‑Datenpunkt (optional)', `relay_${idx}_readId`, it.readId, (v) => updateRelay(idx, { readId: v }), '…read'));

      grid.appendChild(mkChk('Invert (bool: umdrehen)', `relay_${idx}_invert`, !!it.invert, (b) => updateRelay(idx, { invert: !!b })));
      grid.appendChild(mkChk('In VIS anzeigen', `relay_${idx}_showInLive`, it.showInLive !== false, (b) => updateRelay(idx, { showInLive: !!b })));

      if (String(it.type) === 'boolean') {
        grid.appendChild(mkChk('Endkunde darf schalten', `relay_${idx}_userCanToggle`, it.userCanToggle !== false, (b) => updateRelay(idx, { userCanToggle: !!b })));
      } else {
        grid.appendChild(mkChk('Endkunde darf Wert setzen', `relay_${idx}_userCanSetValue`, it.userCanSetValue !== false, (b) => updateRelay(idx, { userCanSetValue: !!b })));
        grid.appendChild(mkNumField('Min (optional)', `relay_${idx}_min`, it.min, (n) => updateRelay(idx, { min: n }), ''));
        grid.appendChild(mkNumField('Max (optional)', `relay_${idx}_max`, it.max, (n) => updateRelay(idx, { max: n }), ''));
        grid.appendChild(mkNumField('Step (optional)', `relay_${idx}_step`, it.step, (n) => updateRelay(idx, { step: n }), ''));
        grid.appendChild(mkTextField('Unit (optional)', `relay_${idx}_unit`, it.unit, (v) => updateRelay(idx, { unit: v }), 'z.B. W'));
      }

      item.appendChild(head);
      item.appendChild(grid);

      listWrap.appendChild(item);
    }

    els.relayControls.appendChild(listWrap);

    // Buttons
    if (els.relayAdd) {
      els.relayAdd.onclick = () => {
        const next = _nextFreeRelayIdx();
        if (!next) {
          setStatus('Maximal 10 Ausgänge möglich.', 'error');
          return;
        }
        const r2 = _ensureRelayCfg();
        r2.relays.push({ idx: next, enabled: true, showInLive: true, name: `Ausgang ${next}`, type: 'boolean', writeId: '', readId: '', invert: false, userCanToggle: true, userCanSetValue: true, min: null, max: null, step: null, unit: '' });
        buildRelayUI();
        scheduleValidation(200);
      };
    }

    if (els.relayReset) {
      els.relayReset.onclick = () => {
        const ok = window.confirm('Alle Ausgänge wirklich leeren?');
        if (!ok) return;
        const r2 = _ensureRelayCfg();
        r2.relays = [];
        buildRelayUI();
        scheduleValidation(200);
      };
    }
  }

// ------------------------------
  // §14a: Netzsteuerung / Leistungsdeckel für steuerbare Verbraucher
  // ------------------------------


  // --- Grid-Constraints / Netzlimits (Installer) ---

  function _ensureGridConstraintsCfg() {
    currentConfig = currentConfig || {};
    currentConfig.gridConstraints = (currentConfig.gridConstraints && typeof currentConfig.gridConstraints === 'object') ? currentConfig.gridConstraints : {};
    const gc = currentConfig.gridConstraints;

    if (typeof gc.rlmEnabled !== 'boolean') gc.rlmEnabled = false;
    if (typeof gc.rlmAligned !== 'boolean') gc.rlmAligned = true;

    if (typeof gc.zeroExportEnabled !== 'boolean') gc.zeroExportEnabled = false;

    // PV Abregelung (EVU Relais) – optional zusätzlich zur 0‑Einspeisung
    if (typeof gc.pvEvuEnabled !== 'boolean') gc.pvEvuEnabled = false;
    if (typeof gc.pvEvuRelay60Id !== 'string') gc.pvEvuRelay60Id = '';
    if (typeof gc.pvEvuRelay30Id !== 'string') gc.pvEvuRelay30Id = '';
    if (typeof gc.pvEvuRelay0Id !== 'string') gc.pvEvuRelay0Id = '';

    // Wechselrichter‑Gruppen (pro WR) – bevorzugt gegenüber Legacy‑Einzel‑DP
    if (!Array.isArray(gc.pvCurtailInvertersEvu)) gc.pvCurtailInvertersEvu = [];
    if (!Array.isArray(gc.pvCurtailInvertersZero)) gc.pvCurtailInvertersZero = [];

    if (typeof gc.pvCurtailMode !== 'string') gc.pvCurtailMode = 'auto';

    // Normalise strings in inverter tables
    const normInv = (it) => {
      if (!it || typeof it !== 'object') return null;
      const name = String(it.name || '').trim();
      const kwp = Number(it.kwp);
      return {
        name,
        kwp: (Number.isFinite(kwp) && kwp >= 0) ? kwp : 0,
        feedInLimitWId: String(it.feedInLimitWId || it.pvFeedInLimitWId || '').trim(),
        pvLimitWId: String(it.pvLimitWId || '').trim(),
        pvLimitPctId: String(it.pvLimitPctId || '').trim(),
      };
    };
    gc.pvCurtailInvertersEvu = (gc.pvCurtailInvertersEvu || []).map(normInv).filter(Boolean);
    gc.pvCurtailInvertersZero = (gc.pvCurtailInvertersZero || []).map(normInv).filter(Boolean);

    return gc;
  }

  function buildGridConstraintsUI() {
    const meterEl = els.gridConstraintsMeter;
    const rlmEl = els.gridConstraintsRlm;
    const zeroEl = els.gridConstraintsZero;
    const pvEl = els.gridConstraintsPvCurtail;

    if (!meterEl && !rlmEl && !zeroEl && !pvEl) return;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && apps.grid) ? apps.grid : { installed: false, enabled: false };

    const mkMsg = (text) => {
      const d = document.createElement('div');
      d.className = 'nw-help';
      d.textContent = text;
      return d;
    };

    const clearAll = () => {
      if (meterEl) meterEl.innerHTML = '';
      if (rlmEl) rlmEl.innerHTML = '';
      if (zeroEl) zeroEl.innerHTML = '';
      if (pvEl) pvEl.innerHTML = '';
    };

    clearAll();

    if (!a.installed) {
      const msg = mkMsg('Die App „Netzlimits“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.');
      if (meterEl) meterEl.appendChild(msg.cloneNode(true));
      if (rlmEl) rlmEl.appendChild(msg.cloneNode(true));
      if (zeroEl) zeroEl.appendChild(msg.cloneNode(true));
      if (pvEl) pvEl.appendChild(msg.cloneNode(true));
      return;
    }

    const gc = _ensureGridConstraintsCfg();

    const mkLabel = (text) => {
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = text;
      return lbl;
    };

    const mkFieldWrap = (labelText) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      wrap.appendChild(mkLabel(labelText));
      return wrap;
    };

    const mkChk = (labelText, inputId, checked, onChange) => {
      const wrap = mkFieldWrap(labelText);

      const lbl = document.createElement('label');
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '8px';
      lbl.style.marginTop = '6px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = inputId;
      cb.checked = !!checked;
      cb.addEventListener('change', () => onChange(!!cb.checked));

      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('aktiv'));

      wrap.appendChild(lbl);
      return wrap;
    };

    const mkNum = (labelText, inputId, value, onChange, unit, placeholder) => {
      const wrap = mkFieldWrap(labelText);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = inputId;
      input.placeholder = placeholder || '';
      input.value = (value !== undefined && value !== null && value !== '') ? String(value) : '';
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : 0);
      });

      row.appendChild(input);
      if (unit) {
        const u = document.createElement('span');
        u.className = 'nw-config-muted';
        u.textContent = unit;
        row.appendChild(u);
      }

      wrap.appendChild(row);
      return wrap;
    };

    const mkSelect = (labelText, inputId, value, options, onChange) => {
      const wrap = mkFieldWrap(labelText);

      const sel = document.createElement('select');
      sel.className = 'nw-config-input';
      sel.id = inputId;
      for (const o of options) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        sel.appendChild(op);
      }
      sel.value = String(value || options[0].v);
      sel.addEventListener('change', () => onChange(String(sel.value)));

      wrap.appendChild(sel);
      return wrap;
    };

    const mkDpField = (labelText, inputId, value, onChange, placeholder) => {
      const wrap = mkFieldWrap(labelText);

      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = inputId;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'Datenpunkt';
      input.addEventListener('change', () => {
        onChange(String(input.value || '').trim());
        scheduleValidation(200);
      });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', inputId);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + inputId;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    const mkHint = (text) => {
      const h = document.createElement('div');
      h.className = 'nw-config-muted';
      h.style.fontSize = '0.78rem';
      h.style.marginTop = '8px';
      h.textContent = text;
      return h;
    };

    // Meter / Timeout
    if (meterEl) {
      const gridPowerId = String(gc.gridPowerId || '').trim();
      meterEl.appendChild(mkDpField('Netzleistung (Fallback) (optional)', 'gc_gridPowerId', gridPowerId, (v) => { gc.gridPowerId = v; }, 'Datenpunkt-ID (W)'));
      meterEl.appendChild(mkNum('Stale‑Timeout', 'gc_staleTimeoutSec', (gc.staleTimeoutSec !== undefined && gc.staleTimeoutSec !== null) ? Number(gc.staleTimeoutSec) : 15, (n) => { gc.staleTimeoutSec = (n > 0) ? Math.max(5, Math.round(n)) : 15; }, 's', 'z.B. 15'));
      meterEl.appendChild(mkHint('Wenn Messwerte älter als der Timeout sind, wird die Regelung vorsichtshalber begrenzt.'));
    }

    // RLM
    if (rlmEl) {
      rlmEl.appendChild(mkChk('RLM Deckel aktiv', 'gc_rlmEnabled', !!gc.rlmEnabled, (b) => { gc.rlmEnabled = b; }));
      rlmEl.appendChild(mkNum('RLM Limit', 'gc_rlmLimitW', Number(gc.rlmLimitW || 0) || 0, (n) => { gc.rlmLimitW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 25000'));
      rlmEl.appendChild(mkNum('Sicherheitsmarge', 'gc_rlmSafetyMarginW', Number(gc.rlmSafetyMarginW || 0) || 0, (n) => { gc.rlmSafetyMarginW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 500'));
      rlmEl.appendChild(mkChk('Alignment auf 15‑Minuten‑Raster', 'gc_rlmAligned', (gc.rlmAligned !== false), (b) => { gc.rlmAligned = b; }));
      rlmEl.appendChild(mkHint('Der RLM‑Deckel reduziert den maximal zulässigen Import dynamisch basierend auf dem 15‑Minuten‑Durchschnitt.'));
    }

    // PV Abregelung (EVU / 0‑Einspeisung)
    const deriveCurtailMode = () => {
      if (gc.pvEvuEnabled && gc.zeroExportEnabled) return 'combined';
      if (gc.pvEvuEnabled) return 'evu';
      if (gc.zeroExportEnabled) return 'zero';
      return 'off';
    };

    const applyCurtailMode = (mode) => {
      const m = String(mode || 'off');
      gc.pvEvuEnabled = (m === 'evu' || m === 'combined');
      gc.zeroExportEnabled = (m === 'zero' || m === 'combined');
    };

    const curMode = deriveCurtailMode();

    // Card 1: Mode + Relays + Reglerparameter
    if (zeroEl) {
      zeroEl.appendChild(mkSelect('Modus', 'gc_pvCurtailAppMode', curMode, [
        { v: 'off', t: 'Aus' },
        { v: 'evu', t: 'EVU‑Abregelung (Relais 60% / 30% / 0%)' },
        { v: 'zero', t: '0‑Einspeisung (Regler am NVP)' },
        { v: 'combined', t: 'Kombiniert (EVU + 0‑Einspeisung)' },
      ], (v) => {
        applyCurtailMode(v);
        buildGridConstraintsUI();
        scheduleValidation(200);
      }));

      if (gc.pvEvuEnabled) {
        zeroEl.appendChild(mkDpField('Relais 60% (Read)', 'gc_pvEvuRelay60Id', gc.pvEvuRelay60Id, (v) => { gc.pvEvuRelay60Id = v; }, 'BOOL / 0|1'));
        zeroEl.appendChild(mkDpField('Relais 30% (Read)', 'gc_pvEvuRelay30Id', gc.pvEvuRelay30Id, (v) => { gc.pvEvuRelay30Id = v; }, 'BOOL / 0|1'));
        zeroEl.appendChild(mkDpField('Relais 0% (Read)', 'gc_pvEvuRelay0Id', gc.pvEvuRelay0Id, (v) => { gc.pvEvuRelay0Id = v; }, 'BOOL / 0|1'));
        zeroEl.appendChild(mkHint('Wenn mehrere Relais gleichzeitig aktiv sind, gilt automatisch die strengste Stufe: 0% > 30% > 60% > 100%.'));
      }

      if (gc.zeroExportEnabled) {
        zeroEl.appendChild(mkNum('Bias', 'gc_zeroExportBiasW', Number(gc.zeroExportBiasW || 0) || 0, (n) => { gc.zeroExportBiasW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 50'));
        zeroEl.appendChild(mkNum('Deadband', 'gc_zeroExportDeadbandW', Number(gc.zeroExportDeadbandW || 0) || 0, (n) => { gc.zeroExportDeadbandW = Math.max(0, Math.round(n)); }, 'W', 'z.B. 15'));
        zeroEl.appendChild(mkHint('Bias/Deadband stabilisieren die Regelung (verhindern „Zittern“ um 0W).'));
      } else {
        zeroEl.appendChild(mkHint('0‑Einspeisung ist im aktuellen Modus deaktiviert.'));
      }

      zeroEl.appendChild(mkHint('Die Regelung arbeitet am NVP‑Datenpunkt (Zuordnung → Allgemein → Netzpunkt) und nutzt das Vorzeichen (Import + / Export −).'));
    }

    // Card 2: Wechselrichter‑Gruppen (pro WR)
    if (pvEl) {
      const showEvuGroup = (curMode === 'evu' || curMode === 'combined' || curMode === 'off');
      const showZeroGroup = (curMode === 'zero' || curMode === 'combined' || curMode === 'off');

      const mkTitle = (text) => {
        const h = document.createElement('div');
        h.className = 'nw-config-card__divider';
        h.textContent = text;
        return h;
      };

      const mkBadge = (label, ok) => {
        const b = document.createElement('span');
        b.className = 'nw-config-badge ' + (ok ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        b.textContent = label;
        return b;
      };

      const mkInvItem = (list, idx, groupPrefix, groupLabel) => {
        const inv = list[idx];

        const row = document.createElement('div');
        row.className = 'nw-flow-slot nw-inv-item';

        const meta = document.createElement('div');
        meta.className = 'nw-flow-slot__meta';

        const t = document.createElement('div');
        t.className = 'nw-flow-slot__title';
        t.textContent = inv.name ? inv.name : `Wechselrichter ${idx + 1}`;

        const k = document.createElement('div');
        k.className = 'nw-flow-slot__key';
        const kwpTxt = (Number.isFinite(inv.kwp) && inv.kwp > 0) ? `${inv.kwp} kWp` : 'kWp?';
        k.textContent = `${groupLabel} · ${kwpTxt}`;

        meta.appendChild(t);
        meta.appendChild(k);

        const summary = document.createElement('div');
        summary.className = 'nw-inv-summary';

        // Name + kWp bleiben in der Übersicht – die langen DP-Felder liegen in „Details“.
        const nameInput = document.createElement('input');
        nameInput.id = `gc_${groupPrefix}_inv_${idx}_name`;
        nameInput.className = 'nw-config-input nw-inv-name';
        nameInput.type = 'text';
        nameInput.placeholder = 'Name';
        nameInput.value = inv.name || '';
        nameInput.addEventListener('change', () => {
          inv.name = String(nameInput.value || '').trim();
          t.textContent = inv.name ? inv.name : `Wechselrichter ${idx + 1}`;
          scheduleValidation(200);
        });

        const kwpInput = document.createElement('input');
        kwpInput.id = `gc_${groupPrefix}_inv_${idx}_kwp`;
        kwpInput.className = 'nw-config-input nw-inv-kwp';
        kwpInput.type = 'number';
        kwpInput.min = '0';
        kwpInput.step = '0.01';
        kwpInput.placeholder = 'kWp';
        kwpInput.value = (inv.kwp === undefined || inv.kwp === null) ? '' : String(inv.kwp);
        kwpInput.addEventListener('change', () => {
          const n = Number(String(kwpInput.value || '').replace(',', '.'));
          inv.kwp = (Number.isFinite(n) && n >= 0) ? n : 0;
          const kwpTxt2 = (Number.isFinite(inv.kwp) && inv.kwp > 0) ? `${inv.kwp} kWp` : 'kWp?';
          k.textContent = `${groupLabel} · ${kwpTxt2}`;
          scheduleValidation(200);
        });

        const chips = document.createElement('div');
        chips.className = 'nw-inv-chips';
        const chipFeed = mkBadge('Einsp. W', !!inv.feedInLimitWId);
        const chipPvW = mkBadge('PV W', !!inv.pvLimitWId);
        const chipPvPct = mkBadge('PV %', !!inv.pvLimitPctId);
        const chipPvRead = mkBadge('PV Ist', !!inv.pvPowerReadId);
        chips.appendChild(chipFeed);
        chips.appendChild(chipPvW);
        chips.appendChild(chipPvPct);
        chips.appendChild(chipPvRead);

        const editBtn = document.createElement('button');
        editBtn.className = 'nw-config-mini-btn';
        editBtn.type = 'button';
        editBtn.textContent = 'Details';

        const delBtn = document.createElement('button');
        delBtn.className = 'nw-config-mini-btn';
        delBtn.type = 'button';
        delBtn.textContent = 'Entfernen';
        delBtn.addEventListener('click', () => {
          list.splice(idx, 1);
          buildGridConstraintsUI();
          scheduleValidation(200);
        });

        const advanced = document.createElement('div');
        advanced.className = 'nw-flow-slot__advanced';

        editBtn.addEventListener('click', () => {
          const open = advanced.classList.toggle('is-open');
          editBtn.textContent = open ? 'Weniger' : 'Details';
        });

        const advGrid = document.createElement('div');
        advGrid.className = 'nw-flow-ctrl-grid';
        advGrid.appendChild(mkDpField('PV‑Leistung (W) (Read)', `gc_${groupPrefix}_inv_${idx}_pvRead`, inv.pvPowerReadId || '', (v) => {
          inv.pvPowerReadId = v;
          chipPvRead.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }, 'Optional: Für PV‑Gesamtleistung (Energiefluss), wenn kein globaler PV‑Datenpunkt gemappt ist.'));
        advGrid.appendChild(mkDpField('Einspeise‑Limit (W) (Write)', `gc_${groupPrefix}_inv_${idx}_feedIn`, inv.feedInLimitWId || '', (v) => {
          inv.feedInLimitWId = v;
          chipFeed.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }));
        advGrid.appendChild(mkDpField('PV‑Limit (W) (Write)', `gc_${groupPrefix}_inv_${idx}_limitW`, inv.pvLimitWId || '', (v) => {
          inv.pvLimitWId = v;
          chipPvW.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }));
        advGrid.appendChild(mkDpField('PV‑Limit (%) (Write)', `gc_${groupPrefix}_inv_${idx}_limitPct`, inv.pvLimitPctId || '', (v) => {
          inv.pvLimitPctId = v;
          chipPvPct.className = 'nw-config-badge ' + (v ? 'nw-config-badge--ok' : 'nw-config-badge--idle');
        }));

        const hint = document.createElement('div');
        hint.className = 'nw-config-field-hint';
        hint.style.marginTop = '6px';
        hint.textContent = 'Hinweis: Setze mindestens einen passenden Write‑Datenpunkt (je WR), damit die Regelung Limits schreiben kann. PV‑Leistung (Read) ist optional und wird für die PV‑Summierung genutzt.';

        advanced.appendChild(advGrid);
        advanced.appendChild(hint);

        summary.appendChild(nameInput);
        summary.appendChild(kwpInput);
        summary.appendChild(chips);
        summary.appendChild(editBtn);
        summary.appendChild(delBtn);

        row.appendChild(meta);
        row.appendChild(summary);
        row.appendChild(advanced);

        return row;
      };

      const mkInvGroup = (titleText, list, groupPrefix, groupLabel, inactiveHint) => {
        pvEl.appendChild(mkTitle(titleText));
        if (inactiveHint) pvEl.appendChild(mkHint(inactiveHint));

        const listWrap = document.createElement('div');
        listWrap.className = 'nw-inv-list';

        if (!list.length) {
          const empty = document.createElement('div');
          empty.className = 'nw-config-empty';
          empty.textContent = 'Keine Wechselrichter konfiguriert.';
          listWrap.appendChild(empty);
        } else {
          for (let i = 0; i < list.length; i++) {
            listWrap.appendChild(mkInvItem(list, i, groupPrefix, groupLabel));
          }
        }

        pvEl.appendChild(listWrap);

        const add = document.createElement('button');
        add.className = 'nw-config-mini-btn';
        add.type = 'button';
        add.textContent = 'Wechselrichter hinzufügen';
        add.addEventListener('click', () => {
          list.push({ name: '', kwp: 0, pvPowerReadId: '', feedInLimitWId: '', pvLimitWId: '', pvLimitPctId: '' });
          buildGridConstraintsUI();
          scheduleValidation(200);
        });
        pvEl.appendChild(add);
      };

      if (showEvuGroup) {
        mkInvGroup(
          'Gruppe 1: EVU‑Abregelung (Relais‑Stufen)',
          gc.pvCurtailInvertersEvu,
          'evu',
          'EVU',
          (curMode === 'off') ? 'Modus ist aktuell AUS – du kannst die Gruppe vorkonfigurieren.' : null
        );
      }

      if (showZeroGroup) {
        mkInvGroup(
          'Gruppe 2: 0‑Einspeisung (NVP‑Regler)',
          gc.pvCurtailInvertersZero,
          'zero',
          '0‑EINS',
          (curMode === 'off') ? 'Modus ist aktuell AUS – du kannst die Gruppe vorkonfigurieren.' : null
        );
      }

      // Fallback (Legacy)
      pvEl.appendChild(mkTitle('Fallback (Legacy): Einzel‑WR / Sammel‑DP'));
      pvEl.appendChild(mkHint('Wenn keine Wechselrichter‑Gruppen konfiguriert sind, nutzt die Regelung folgende Datenpunkte. Für neue Setups bitte bevorzugt die Gruppen oben verwenden.'));

      const legacy = gc.pvCurtailLegacy || { mode: 'auto', feedInLimitWId: '', pvLimitWId: '', pvLimitPctId: '' };
      const legacyWrap = document.createElement('div');
      legacyWrap.className = 'nw-flow-ctrl-grid';

      legacyWrap.appendChild(mkSelect('Begrenzungs‑Modus', 'gc_legacy_mode', legacy.mode || 'auto', [
        { v: 'auto', t: 'Auto (beste verfügbare Methode)' },
        { v: 'feedInW', t: 'Einspeise‑Limit (W)' },
        { v: 'pvW', t: 'PV‑Limit (W)' },
        { v: 'pvPct', t: 'PV‑Limit (%)' }
      ], (v) => { legacy.mode = v; scheduleValidation(200); }));

      legacyWrap.appendChild(mkDpField('Einspeise‑Limit (W) (Write) (optional)', 'gc_legacy_feedIn', legacy.feedInLimitWId || '', (v) => { legacy.feedInLimitWId = v; scheduleValidation(200); }));
      legacyWrap.appendChild(mkDpField('PV‑Limit (W) (Write) (optional)', 'gc_legacy_pvW', legacy.pvLimitWId || '', (v) => { legacy.pvLimitWId = v; scheduleValidation(200); }));
      legacyWrap.appendChild(mkDpField('PV‑Limit (%) (Write) (optional)', 'gc_legacy_pvPct', legacy.pvLimitPctId || '', (v) => { legacy.pvLimitPctId = v; scheduleValidation(200); }));

      pvEl.appendChild(legacyWrap);
      pvEl.appendChild(mkHint('Auto wählt die beste Methode. Für 0‑Einspeisung muss mindestens ein passender Write‑Datenpunkt gesetzt sein.'));
    }
  }


  const PARA14A_TYPES = [
    { v: 'heatPump', t: 'Wärmepumpe' },
    { v: 'heatingRod', t: 'Heizstab' },
    { v: 'airCondition', t: 'Klima' },
    { v: 'custom', t: 'Sonstiger Verbraucher' }
  ];

  const PARA14A_CTL = [
    { v: 'limitW', t: 'Leistung (W) begrenzen' },
    { v: 'onOff', t: 'Ein/Aus (Enable)' }
  ];

  function _ensurePara14aCfg() {
    currentConfig = currentConfig || {};
    currentConfig.installerConfig = (currentConfig.installerConfig && typeof currentConfig.installerConfig === 'object')
      ? currentConfig.installerConfig
      : {};
    const ic = currentConfig.installerConfig;

    const modeRaw = String(ic.para14aMode || '').trim().toLowerCase();
    ic.para14aMode = (modeRaw === 'direct') ? 'direct' : 'ems';

    const min = Number(ic.para14aMinPerDeviceW);
    ic.para14aMinPerDeviceW = (Number.isFinite(min) && min >= 0) ? Math.round(min) : 1000;

    ic.para14aActiveId = (typeof ic.para14aActiveId === 'string') ? ic.para14aActiveId.trim() : '';
    ic.para14aEmsSetpointWId = (typeof ic.para14aEmsSetpointWId === 'string') ? ic.para14aEmsSetpointWId.trim() : '';

    const list = Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : [];
    const out = [];
    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      const typeRaw = String(it.type || 'custom').trim();
      const type = PARA14A_TYPES.some(x => x.v === typeRaw) ? typeRaw : 'custom';

      const ctlRaw = String(it.controlType || it.control || '').trim().toLowerCase();
      const controlType = (ctlRaw === 'onoff' || ctlRaw === 'switch' || ctlRaw === 'enable') ? 'onOff' : 'limitW';

      const maxW = Number(it.maxPowerW);
      const prio = Number(it.priority);

      out.push({
        enabled: (typeof it.enabled === 'boolean') ? !!it.enabled : true,
        name: String(it.name || '').trim(),
        type,
        controlType,
        maxPowerW: Number.isFinite(maxW) && maxW >= 0 ? Math.round(maxW) : 0,
        priority: Number.isFinite(prio) && prio >= 0 ? Math.round(prio) : 0,
        setPowerWId: String(it.setPowerWId || it.setpointWId || '').trim(),
        enableId: String(it.enableId || '').trim(),
      });
    }

    ic.para14aConsumers = out;
    return ic;
  }

  function _mkDpWrap(id, value, placeholder, onChange) {
    const dpWrap = document.createElement('div');
    dpWrap.className = 'nw-config-dp-input-wrapper';

    const input = document.createElement('input');
    input.className = 'nw-config-input nw-config-dp-input';
    input.type = 'text';
    input.id = id;
    input.value = value ? String(value) : '';
    input.dataset.dpInput = '1';
    input.placeholder = placeholder || 'optional';
    input.addEventListener('change', () => {
      onChange(String(input.value || '').trim());
      scheduleValidation(200);
    });

    const b = document.createElement('button');
    b.className = 'nw-config-dp-button';
    b.type = 'button';
    b.setAttribute('data-browse', id);
    b.textContent = 'Auswählen…';

    const badge = document.createElement('span');
    badge.className = 'nw-config-badge nw-config-badge--idle';
    badge.id = 'val_' + id;
    badge.textContent = '—';

    dpWrap.appendChild(input);
    dpWrap.appendChild(b);
    dpWrap.appendChild(badge);
    return dpWrap;
  }

  function rebuildPara14aConsumersUI() {
    if (!els.para14aConsumers) return;
    const ic = _ensurePara14aCfg();
    const list = Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : [];
    els.para14aConsumers.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Verbraucher konfiguriert.';
      els.para14aConsumers.appendChild(empty);
      return;
    }

    list.forEach((c, i) => {
      const idx = i + 1;

      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = c.name ? c.name : `Verbraucher ${idx}`;

      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      const typeLabel = (PARA14A_TYPES.find(x => x.v === c.type) || PARA14A_TYPES[3]).t;
      const ctlLabel = (PARA14A_CTL.find(x => x.v === c.controlType) || PARA14A_CTL[0]).t;
      sub.textContent = `${typeLabel} · ${ctlLabel}`;

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.alignItems = 'center';
      right.style.flexWrap = 'wrap';

      // Enabled
      const en = document.createElement('input');
      en.type = 'checkbox';
      en.id = `p14a_cons_${idx}_en`;
      en.checked = !!c.enabled;
      en.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].enabled = !!en.checked;
      });
      const enLbl = document.createElement('label');
      enLbl.htmlFor = en.id;
      enLbl.style.fontSize = '0.82rem';
      enLbl.style.color = '#e5e7eb';
      enLbl.style.display = 'inline-flex';
      enLbl.style.alignItems = 'center';
      enLbl.style.gap = '6px';
      enLbl.appendChild(en);
      enLbl.appendChild(document.createTextNode('Aktiv'));
      right.appendChild(enLbl);

      // Name
      const name = document.createElement('input');
      name.className = 'nw-config-input';
      name.type = 'text';
      name.style.width = '180px';
      name.placeholder = 'Name';
      name.value = String(c.name || '');
      name.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].name = String(name.value || '').trim();
        // refresh labels
        rebuildPara14aConsumersUI();
      });
      right.appendChild(name);

      // Type
      const typeSel = document.createElement('select');
      typeSel.className = 'nw-config-input';
      typeSel.style.width = '165px';
      for (const o of PARA14A_TYPES) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        typeSel.appendChild(op);
      }
      typeSel.value = String(c.type || 'custom');
      typeSel.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].type = String(typeSel.value || 'custom');
      });
      right.appendChild(typeSel);

      // Control type
      const ctlSel = document.createElement('select');
      ctlSel.className = 'nw-config-input';
      ctlSel.style.width = '200px';
      for (const o of PARA14A_CTL) {
        const op = document.createElement('option');
        op.value = o.v;
        op.textContent = o.t;
        ctlSel.appendChild(op);
      }
      ctlSel.value = String(c.controlType || 'limitW');
      ctlSel.addEventListener('change', () => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].controlType = String(ctlSel.value || 'limitW');
      });
      right.appendChild(ctlSel);

      // max power
      const maxW = document.createElement('input');
      maxW.className = 'nw-config-input';
      maxW.type = 'number';
      maxW.style.width = '120px';
      maxW.placeholder = 'Max W';
      maxW.value = (c.maxPowerW !== undefined && c.maxPowerW !== null) ? String(c.maxPowerW) : '';
      maxW.addEventListener('change', () => {
        const n = Number(maxW.value);
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].maxPowerW = (Number.isFinite(n) && n >= 0) ? Math.round(n) : 0;
      });
      right.appendChild(maxW);

      // priority
      const pr = document.createElement('input');
      pr.className = 'nw-config-input';
      pr.type = 'number';
      pr.style.width = '110px';
      pr.placeholder = 'Prio';
      pr.value = (c.priority !== undefined && c.priority !== null) ? String(c.priority) : '';
      pr.addEventListener('change', () => {
        const n = Number(pr.value);
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].priority = (Number.isFinite(n) && n >= 0) ? Math.round(n) : 0;
      });
      right.appendChild(pr);

      // DP fields
      const sp = _mkDpWrap(`p14a_cons_${idx}_sp`, c.setPowerWId, 'Setpoint W (Write)', (v) => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].setPowerWId = v;
      });
      sp.style.minWidth = '360px';
      right.appendChild(sp);

      const enDp = _mkDpWrap(`p14a_cons_${idx}_enDp`, c.enableId, 'Enable (Write)', (v) => {
        const ic2 = _ensurePara14aCfg();
        if (ic2.para14aConsumers[i]) ic2.para14aConsumers[i].enableId = v;
      });
      enDp.style.minWidth = '360px';
      right.appendChild(enDp);

      // remove
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'nw-config-btn nw-config-btn--ghost';
      rm.textContent = 'Entfernen';
      rm.addEventListener('click', () => {
        const ic2 = _ensurePara14aCfg();
        ic2.para14aConsumers.splice(i, 1);
        rebuildPara14aConsumersUI();
      });
      right.appendChild(rm);

      row.appendChild(left);
      row.appendChild(right);
      els.para14aConsumers.appendChild(row);
    });
  }

  function buildPara14aUI() {
    // Panel can be absent in older builds
    if (!els.para14aMode && !els.para14aConsumers) return;

    const ic = _ensurePara14aCfg();

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = apps && apps.para14a ? apps.para14a : { installed: false, enabled: false };
    const installed = !!a.installed;

    // disable/enable inputs based on installed
    const disable = !installed;
    const lock = (el) => { if (el) el.disabled = disable; };

    lock(els.para14aMode);
    lock(els.para14aMinPerDeviceW);
    lock(els.para14aActiveId);
    lock(els.para14aEmsSetpointWId);
    lock(els.addPara14aConsumer);

    if (els.para14aMode) els.para14aMode.value = String(ic.para14aMode || 'ems');
    if (els.para14aMinPerDeviceW) els.para14aMinPerDeviceW.value = String(Number.isFinite(Number(ic.para14aMinPerDeviceW)) ? Math.round(Number(ic.para14aMinPerDeviceW)) : 1000);
    if (els.para14aActiveId) els.para14aActiveId.value = String(ic.para14aActiveId || '');
    if (els.para14aEmsSetpointWId) els.para14aEmsSetpointWId.value = String(ic.para14aEmsSetpointWId || '');

    if (!installed) {
      if (els.para14aConsumers) {
        els.para14aConsumers.innerHTML = '';
        const msg = document.createElement('div');
        msg.className = 'nw-help';
        msg.textContent = 'Die App „§14a Steuerung“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
        els.para14aConsumers.appendChild(msg);
      }
      return;
    }

    rebuildPara14aConsumersUI();
  }


  function getStorageMode() {
    const v = (els.storageControlMode && els.storageControlMode.value) ? String(els.storageControlMode.value) : 'targetPower';
    return (['targetPower','limits','enableFlags'].includes(v)) ? v : 'targetPower';
  }

  function rebuildStorageTable() {
    const mode = getStorageMode();
    const fields = STORAGE_DP_FIELDS.filter(f => {
      if (!f.requiredModes || !f.requiredModes.length) return true;
      return f.requiredModes.includes(mode);
    });

    const storageDp = (currentConfig && currentConfig.storage && currentConfig.storage.datapoints) ? currentConfig.storage.datapoints : {};

    buildDpTable(
      els.storageTable,
      fields,
      (key) => storageDp[key],
      (key, val) => {
        currentConfig.storage = currentConfig.storage || {};
        currentConfig.storage.datapoints = currentConfig.storage.datapoints || {};
        currentConfig.storage.datapoints[key] = val;
      },
      { idPrefix: 'st_' }
    );
  }
  // ------------------------------
  // Speicherfarm (mehrere Speicher)
  // ------------------------------

  function _ensureStorageFarmCfg() {
    currentConfig = currentConfig || {};
    currentConfig.storageFarm = (currentConfig.storageFarm && typeof currentConfig.storageFarm === 'object') ? currentConfig.storageFarm : {};
    const sf = currentConfig.storageFarm;

    const modeRaw = String(sf.mode || 'pool').trim().toLowerCase();
    sf.mode = (modeRaw === 'groups') ? 'groups' : 'pool';

    const sched = Number(sf.schedulerIntervalMs);
    sf.schedulerIntervalMs = (Number.isFinite(sched) && sched >= 500) ? Math.round(sched) : 2000;

    sf.storages = Array.isArray(sf.storages) ? sf.storages : [];
    sf.groups = Array.isArray(sf.groups) ? sf.groups : [];

    const maxStor = 10;
    const storOut = [];
    for (let i = 0; i < Math.min(maxStor, sf.storages.length); i++) {
      const r = sf.storages[i] || {};
      const couplingRaw = String(r.coupling || '').trim().toLowerCase();
      const coupling = (couplingRaw === 'dc') ? 'dc' : ((couplingRaw === 'ac') ? 'ac' : '');
      storOut.push({
        enabled: (r.enabled === false) ? false : true,
        name: String(r.name || '').trim() || `Speicher ${i + 1}`,
        coupling,
        socId: String(r.socId || '').trim(),
        // Istwerte (Messwerte): entweder Signed oder Laden/Entladen getrennt
        signedPowerId: String(r.signedPowerId || '').trim(),
        chargePowerId: String(r.chargePowerId || '').trim(),
        dischargePowerId: String(r.dischargePowerId || '').trim(),
        pvPowerId: String(r.pvPowerId || '').trim(),
        invertSignedPowerSign: !!r.invertSignedPowerSign,
        invertChargeSign: !!r.invertChargeSign,
        invertDischargeSign: !!r.invertDischargeSign,
        // Sollwerte (Setpoint): entweder Signed oder Laden/Entladen getrennt
        setChargePowerId: String(r.setChargePowerId || '').trim(),
        setDischargePowerId: String(r.setDischargePowerId || '').trim(),
        setSignedPowerId: String(r.setSignedPowerId || '').trim(),
        capacityKWh: (r.capacityKWh !== undefined && r.capacityKWh !== null && r.capacityKWh !== '') ? Number(r.capacityKWh) : '',
        group: String(r.group || '').trim(),
      });
    }
    // If array is empty, keep it empty (no implicit storages)
    sf.storages = storOut;

    const maxGroups = 5;
    const grpOut = [];
    for (let i = 0; i < Math.min(maxGroups, sf.groups.length); i++) {
      const g = sf.groups[i] || {};
      const name = String(g.name || '').trim() || `Gruppe ${String.fromCharCode(65 + i)}`;
      grpOut.push({
        enabled: (g.enabled === false) ? false : true,
        name,
        socMin: (g.socMin !== undefined && g.socMin !== null && g.socMin !== '') ? Number(g.socMin) : '',
        socMax: (g.socMax !== undefined && g.socMax !== null && g.socMax !== '') ? Number(g.socMax) : '',
        priority: (g.priority !== undefined && g.priority !== null && g.priority !== '') ? Number(g.priority) : (100 + i),
      });
    }
    sf.groups = grpOut;

    return sf;
  }

  function buildStorageFarmUI() {
    if (!els.storageFarmStorages) return;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && typeof apps.storagefarm === 'object') ? apps.storagefarm : { installed: false, enabled: false };

    const sf = _ensureStorageFarmCfg();

    // Clear containers
    els.storageFarmStorages.innerHTML = '';
    if (els.storageFarmGroups) els.storageFarmGroups.innerHTML = '';

    if (!a.installed) {
      const msg = document.createElement('div');
      msg.className = 'nw-help';
      msg.textContent = 'Die App „Speicherfarm“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.storageFarmStorages.appendChild(msg);
      if (els.storageFarmGroupsCard) els.storageFarmGroupsCard.style.display = 'none';
      return;
    }

    // General controls
    if (els.storageFarmMode) {
      els.storageFarmMode.innerHTML = '';
      const opt1 = document.createElement('option');
      opt1.value = 'pool';
      opt1.textContent = 'Pool (gemeinsamer Speicher)';
      const opt2 = document.createElement('option');
      opt2.value = 'groups';
      opt2.textContent = 'Gruppen (SoC‑Zonen je Gruppe)';
      els.storageFarmMode.appendChild(opt1);
      els.storageFarmMode.appendChild(opt2);
      els.storageFarmMode.value = String(sf.mode || 'pool');
      els.storageFarmMode.onchange = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.mode = String(els.storageFarmMode.value || 'pool') === 'groups' ? 'groups' : 'pool';
        buildStorageFarmUI();
      };
    }

    if (els.storageFarmSchedulerIntervalMs) {
      els.storageFarmSchedulerIntervalMs.value = numOrEmpty(sf.schedulerIntervalMs);
      els.storageFarmSchedulerIntervalMs.onchange = () => {
        const n = Number(els.storageFarmSchedulerIntervalMs.value);
        const sf2 = _ensureStorageFarmCfg();
        sf2.schedulerIntervalMs = (Number.isFinite(n) && n >= 500) ? Math.round(n) : 2000;
      };
    }

    if (els.storageFarmGroupsCard) {
      els.storageFarmGroupsCard.style.display = (sf.mode === 'groups') ? '' : 'none';
    }

    const mkField = (labelText) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-flow-ctrl-field';
      const lbl = document.createElement('div');
      lbl.style.fontSize = '0.78rem';
      lbl.style.fontWeight = '600';
      lbl.style.color = '#e5e7eb';
      lbl.textContent = labelText;
      wrap.appendChild(lbl);
      return { wrap, lbl };
    };

    const mkDpField = (labelText, id, value, onChange, placeholder) => {
      const { wrap } = mkField(labelText);
      const dpWrap = document.createElement('div');
      dpWrap.className = 'nw-config-dp-input-wrapper';

      const input = document.createElement('input');
      input.className = 'nw-config-input nw-config-dp-input';
      input.type = 'text';
      input.id = id;
      input.value = value ? String(value) : '';
      input.dataset.dpInput = '1';
      input.placeholder = placeholder || 'optional';
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

      const b = document.createElement('button');
      b.className = 'nw-config-dp-button';
      b.type = 'button';
      b.setAttribute('data-browse', id);
      b.textContent = 'Auswählen…';

      const badge = document.createElement('span');
      badge.className = 'nw-config-badge nw-config-badge--idle';
      badge.id = 'val_' + id;
      badge.textContent = '—';

      dpWrap.appendChild(input);
      dpWrap.appendChild(b);
      dpWrap.appendChild(badge);

      wrap.appendChild(dpWrap);
      return wrap;
    };

    const mkTextField = (labelText, id, value, onChange, placeholder) => {
      const { wrap } = mkField(labelText);
      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = id;
      if (placeholder) input.placeholder = placeholder;
      input.value = value ? String(value) : '';
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); });
      wrap.appendChild(input);
      return wrap;
    };

    const mkNumField = (labelText, id, value, onChange, placeholder) => {
      const { wrap } = mkField(labelText);
      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      input.id = id;
      if (placeholder) input.placeholder = placeholder;
      input.value = (value !== undefined && value !== null && value !== '') ? String(value) : '';
      input.addEventListener('change', () => {
        const n = Number(input.value);
        onChange(Number.isFinite(n) ? n : '');
      });
      wrap.appendChild(input);
      return wrap;
    };

    const mkSelectField = (labelText, id, value, options, onChange) => {
      const { wrap } = mkField(labelText);
      const sel = document.createElement('select');
      sel.className = 'nw-config-select';
      sel.id = id;
      (options || []).forEach((opt) => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = String(opt.label);
        sel.appendChild(o);
      });
      sel.value = (value !== undefined && value !== null) ? String(value) : '';
      sel.addEventListener('change', () => { onChange(String(sel.value || '')); });
      wrap.appendChild(sel);
      return wrap;
    };

    const mkCheckField = (labelText, id, checked, onChange) => {
      const { wrap } = mkField(labelText);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.id = id;
      box.checked = !!checked;
      box.addEventListener('change', () => { onChange(!!box.checked); });
      const lbl = document.createElement('label');
      lbl.htmlFor = id;
      lbl.style.display = 'inline-flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '6px';
      lbl.style.fontSize = '0.82rem';
      lbl.style.color = '#e5e7eb';
      lbl.appendChild(box);
      lbl.appendChild(document.createTextNode(labelText));
      wrap.appendChild(lbl);
      return wrap;
    };

    const mkGridDivider = (text) => {
      const d = document.createElement('div');
      d.style.gridColumn = '1 / -1';
      d.style.marginTop = '4px';
      d.style.paddingTop = '6px';
      d.style.borderTop = '1px solid rgba(255,255,255,0.08)';
      d.style.fontSize = '0.72rem';
      d.style.fontWeight = '600';
      d.style.letterSpacing = '0.04em';
      d.style.textTransform = 'uppercase';
      d.style.opacity = '0.75';
      d.textContent = text;
      return d;
    };

    // Storages list
    if (!sf.storages || sf.storages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Noch keine Speicher hinzugefügt.';
      els.storageFarmStorages.appendChild(empty);
    } else {
      for (let i = 0; i < sf.storages.length; i++) {
        const s = sf.storages[i] || {};
        const idx = i + 1;

        const card = document.createElement('div');
        card.className = 'nw-config-item';
        card.style.marginBottom = '10px';

        const left = document.createElement('div');
        left.className = 'nw-config-item__left';

        const title = document.createElement('div');
        title.className = 'nw-config-item__title';
        title.textContent = `Speicher ${idx}`;

        const sub = document.createElement('div');
        sub.className = 'nw-config-item__subtitle';
        const grp = String(s.group || '').trim();
        const mp = (String(s.signedPowerId || '').trim() || String(s.chargePowerId || '').trim() || String(s.dischargePowerId || '').trim()) ? 'Istwert: gesetzt' : 'Istwert: fehlt';
        const sp = (String(s.setSignedPowerId || '').trim() || String(s.setChargePowerId || '').trim() || String(s.setDischargePowerId || '').trim()) ? 'Sollwert: gesetzt' : 'Sollwert: fehlt';
        const cpl = String(s.coupling || '').trim().toLowerCase();
        const cplTxt = (cpl === 'dc') ? 'DC' : ((cpl === 'ac') ? 'AC' : 'Auto');
        sub.textContent = (sf.mode === 'groups' ? (`Gruppe: ${grp || '—'} • `) : '') + `Kopplung: ${cplTxt} • ${mp} • ${sp}`;

        left.appendChild(title);
        left.appendChild(sub);

        const right = document.createElement('div');
        right.className = 'nw-config-item__right';
        right.style.width = '100%';

        const grid = document.createElement('div');
        grid.className = 'nw-flow-ctrl-grid';
        // Grunddaten
        grid.appendChild(mkCheckField('Aktiv', `sf_${idx}_enabled`, s.enabled !== false, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].enabled = !!v; }));
        grid.appendChild(mkTextField('Name', `sf_${idx}_name`, s.name, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].name = v; }, 'z.B. Batterie 1'));
        grid.appendChild(mkNumField('Kapazität (kWh)', `sf_${idx}_cap`, s.capacityKWh, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].capacityKWh = v; }, 'optional'));

        if (sf.mode === 'groups') {
          grid.appendChild(mkTextField('Gruppe', `sf_${idx}_group`, s.group, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].group = v; }, 'z.B. Gruppe A'));
        }

        grid.appendChild(mkSelectField('Kopplung', `sf_${idx}_coupling`, s.coupling || '', [
          { value: '', label: 'Auto/Unbekannt' },
          { value: 'ac', label: 'AC' },
          { value: 'dc', label: 'DC' },
        ], (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].coupling = String(v || '').trim().toLowerCase(); }));

        grid.appendChild(mkDpField('PV Leistung (W) (DC)', `sf_${idx}_pvPowerId`, s.pvPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].pvPowerId = v; }, 'nur DC (optional)'));

        // Istwerte (Messwerte)
        grid.appendChild(mkGridDivider('Istwerte (Messwerte)'));

        grid.appendChild(mkCheckField('Vorzeichen Istleistung Signed invertieren', `sf_${idx}_invSigned`, !!s.invertSignedPowerSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertSignedPowerSign = !!v; }));
        grid.appendChild(mkCheckField('Vorzeichen Ladeleistung invertieren', `sf_${idx}_invChg`, !!s.invertChargeSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertChargeSign = !!v; }));
        grid.appendChild(mkCheckField('Vorzeichen Entladeleistung invertieren', `sf_${idx}_invDchg`, !!s.invertDischargeSign, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].invertDischargeSign = !!v; }));

        grid.appendChild(mkDpField('SoC (%)', `sf_${idx}_socId`, s.socId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].socId = v; }, 'SoC‑Datenpunkt'));
        grid.appendChild(mkDpField('Istleistung Signed (W)', `sf_${idx}_signedPowerId`, s.signedPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].signedPowerId = v; }, '(-) laden / (+) entladen'));
        grid.appendChild(mkDpField('Ist Ladeleistung (W)', `sf_${idx}_chargePowerId`, s.chargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].chargePowerId = v; }, 'Messwert (optional)'));
        grid.appendChild(mkDpField('Ist Entladeleistung (W)', `sf_${idx}_dischargePowerId`, s.dischargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].dischargePowerId = v; }, 'Messwert (optional)'));

        // Sollwerte (Setpoint)
        grid.appendChild(mkGridDivider('Sollwerte (Setpoint)'));

        grid.appendChild(mkDpField('Sollwert Signed (W)', `sf_${idx}_setSignedPowerId`, s.setSignedPowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].setSignedPowerId = v; }, '(-) laden / (+) entladen'));
        grid.appendChild(mkDpField('Sollwert Laden (W)', `sf_${idx}_setChargePowerId`, s.setChargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].setChargePowerId = v; }, 'nur Laden (optional)'));
        grid.appendChild(mkDpField('Sollwert Entladen (W)', `sf_${idx}_setDischargePowerId`, s.setDischargePowerId, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.storages[i].setDischargePowerId = v; }, 'nur Entladen (optional)'));

        right.appendChild(grid);

        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'nw-config-btn nw-config-btn--ghost';
        rm.textContent = 'Entfernen';
        rm.style.marginTop = '8px';
        rm.addEventListener('click', () => {
          const sf2 = _ensureStorageFarmCfg();
          sf2.storages.splice(i, 1);
          buildStorageFarmUI();
          scheduleValidation(200);
        });

        right.appendChild(rm);

        card.appendChild(left);
        card.appendChild(right);
        els.storageFarmStorages.appendChild(card);
      }
    }

    if (els.storageFarmAddStorage) {
      els.storageFarmAddStorage.onclick = () => {
        const sf2 = _ensureStorageFarmCfg();
        sf2.storages = Array.isArray(sf2.storages) ? sf2.storages : [];
        if (sf2.storages.length >= 10) return;
        sf2.storages.push({
          enabled: true,
          name: `Speicher ${sf2.storages.length + 1}`,
          coupling: '',
          socId: '',
          signedPowerId: '',
          chargePowerId: '',
          dischargePowerId: '',
          pvPowerId: '',
          invertSignedPowerSign: false,
          invertChargeSign: false,
          invertDischargeSign: false,
          setChargePowerId: '',
          setDischargePowerId: '',
          setSignedPowerId: '',
          capacityKWh: '',
          group: '',
        });
        buildStorageFarmUI();
      };
    }

    // Groups list (only in groups mode)
    if (sf.mode === 'groups' && els.storageFarmGroups) {
      if (!sf.groups || sf.groups.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'nw-config-empty';
        empty.textContent = 'Noch keine Gruppen definiert.';
        els.storageFarmGroups.appendChild(empty);
      } else {
        for (let i = 0; i < sf.groups.length; i++) {
          const g = sf.groups[i] || {};
          const card = document.createElement('div');
          card.className = 'nw-config-item';
          card.style.marginBottom = '10px';

          const left = document.createElement('div');
          left.className = 'nw-config-item__left';

          const title = document.createElement('div');
          title.className = 'nw-config-item__title';
          title.textContent = `Gruppe ${i + 1}`;

          const sub = document.createElement('div');
          sub.className = 'nw-config-item__subtitle';
          sub.textContent = `Name: ${String(g.name || '').trim() || '—'}`;
          left.appendChild(title);
          left.appendChild(sub);

          const right = document.createElement('div');
          right.className = 'nw-config-item__right';
          right.style.width = '100%';

          const grid = document.createElement('div');
          grid.className = 'nw-flow-ctrl-grid';

          grid.appendChild(mkCheckField('Aktiv', `sfgrp_${i+1}_enabled`, g.enabled !== false, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].enabled = !!v; }));
          grid.appendChild(mkTextField('Name (Schlüssel)', `sfgrp_${i+1}_name`, g.name, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].name = v; }, 'z.B. Gruppe A'));
          grid.appendChild(mkNumField('Min‑SoC (%)', `sfgrp_${i+1}_socMin`, g.socMin, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].socMin = v; }, 'optional'));
          grid.appendChild(mkNumField('Max‑SoC (%)', `sfgrp_${i+1}_socMax`, g.socMax, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].socMax = v; }, 'optional'));
          grid.appendChild(mkNumField('Priorität', `sfgrp_${i+1}_prio`, g.priority, (v) => { const sf2 = _ensureStorageFarmCfg(); sf2.groups[i].priority = v; }, 'kleiner = zuerst'));

          right.appendChild(grid);

          const rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'nw-config-btn nw-config-btn--ghost';
          rm.textContent = 'Entfernen';
          rm.style.marginTop = '8px';
          rm.addEventListener('click', () => {
            const sf2 = _ensureStorageFarmCfg();
            sf2.groups.splice(i, 1);
            buildStorageFarmUI();
          });

          right.appendChild(rm);

          card.appendChild(left);
          card.appendChild(right);
          els.storageFarmGroups.appendChild(card);
        }
      }

      if (els.storageFarmAddGroup) {
        els.storageFarmAddGroup.onclick = () => {
          const sf2 = _ensureStorageFarmCfg();
          sf2.groups = Array.isArray(sf2.groups) ? sf2.groups : [];
          if (sf2.groups.length >= 5) return;
          sf2.groups.push({
            enabled: true,
            name: `Gruppe ${String.fromCharCode(65 + sf2.groups.length)}`,
            socMin: '',
            socMax: '',
            priority: 100 + sf2.groups.length,
          });
          buildStorageFarmUI();
        };
      }
    }
  }



  // ------------------------------
  // MultiUse (Speicher) – SoC‑Zonen
  // ------------------------------

    function _ensureStorageMultiUseCfg() {
    currentConfig = currentConfig || {};
    currentConfig.installerConfig = (currentConfig.installerConfig && typeof currentConfig.installerConfig === 'object') ? currentConfig.installerConfig : {};
    const ic = currentConfig.installerConfig;

    ic.storageMultiUse = (ic.storageMultiUse && typeof ic.storageMultiUse === 'object') ? ic.storageMultiUse : {};
    const mu = ic.storageMultiUse;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && typeof apps.multiuse === 'object') ? apps.multiuse : { installed: false, enabled: false };
    const appActive = !!(a.installed && a.enabled);

    // default: follow app state on first install
    if (typeof mu.enabled !== 'boolean') mu.enabled = appActive;

    if (typeof mu.reserveEnabled !== 'boolean') mu.reserveEnabled = true;
    if (typeof mu.peakEnabled !== 'boolean') mu.peakEnabled = true;
    if (typeof mu.selfEnabled !== 'boolean') mu.selfEnabled = true;

    // Backwards compatibility:
    // Older configs used only "To"-Schwellen (reserveTo/peakTo/selfTo). Diese werden in min/max-Felder überführt.
    const reserveTo = _clampInt(mu.reserveToSocPct, 0, 99, 10);
    const peakTo = _clampInt(mu.peakToSocPct, reserveTo, 100, 50);
    const selfTo = _clampInt(mu.selfToSocPct, peakTo, 100, 100);

    // Reserve (Notstrom): min (= Entlade-Untergrenze) + Ziel (Refill-Ziel)
    // Hinweis: Wenn Reserve deaktiviert ist, soll sie keine unteren Grenzen für andere Bereiche erzwingen.
    mu.reserveMinSocPct = _clampInt(mu.reserveMinSocPct, 0, 100, reserveTo);
    mu.reserveTargetSocPct = _clampInt(mu.reserveTargetSocPct, mu.reserveMinSocPct, 100, mu.reserveMinSocPct);

    const reserveBaseMin = (mu.reserveEnabled !== false) ? mu.reserveMinSocPct : 0;

    // LSK: min/max (mind. Reserve-Min – aber nur, wenn Reserve aktiv ist)
    mu.lskMinSocPct = _clampInt(mu.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
    mu.lskMaxSocPct = _clampInt(mu.lskMaxSocPct, mu.lskMinSocPct, 100, peakTo);

    // Eigenverbrauch: min/max
    // - Wenn LSK aktiv ist: mind. LSK-Max (Zonen bleiben disjunkt).
    // - Wenn LSK deaktiviert ist: mind. Reserve-Min (oder 0, wenn Reserve deaktiviert ist).
    const selfBaseMin = (mu.peakEnabled !== false) ? mu.lskMaxSocPct : reserveBaseMin;
    mu.selfMinSocPct = _clampInt(mu.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
    mu.selfMaxSocPct = _clampInt(mu.selfMaxSocPct, mu.selfMinSocPct, 100, selfTo);

    // Eigenverbrauch: NVP‑Regelung (Ziel‑Import + Deadband)
    // Default ab Phase 6.4: Ziel 50 W Import, Deadband ±50 W.
    mu.selfTargetGridImportW = _clampInt(mu.selfTargetGridImportW, 0, 1000000, 50);
    mu.selfImportThresholdW = _clampInt(mu.selfImportThresholdW, 0, 1000000, 50);

    // Legacy-Felder beibehalten (Anzeige/Kompatibilität), aber normalisieren
    mu.reserveToSocPct = reserveTo;
    mu.peakToSocPct = peakTo;
    mu.selfToSocPct = selfTo;

    return mu;
  }

    function _renderStorageMultiUseSummary(mu) {
    if (!els.muStorageSummary) return;

    const enabled = !!mu.enabled;
    const reserveOn = enabled && (mu.reserveEnabled !== false);
    const peakOn = enabled && (mu.peakEnabled !== false);
    const selfOn = enabled && (mu.selfEnabled !== false);

    const reserveMin = _clampInt(mu.reserveMinSocPct, 0, 100, 10);
    const reserveTarget = _clampInt(mu.reserveTargetSocPct, reserveMin, 100, reserveMin);
    const reserveBaseMin = reserveOn ? reserveMin : 0;

    const lskMin = _clampInt(mu.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
    const lskMax = _clampInt(mu.lskMaxSocPct, lskMin, 100, 50);

    const selfBaseMin = peakOn ? lskMax : reserveBaseMin;
    const selfMin = _clampInt(mu.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
    const selfMax = _clampInt(mu.selfMaxSocPct, selfMin, 100, 100);

    const selfTargetW = _clampInt(mu.selfTargetGridImportW, 0, 1000000, 50);
    const selfDeadbandW = _clampInt(mu.selfImportThresholdW, 0, 1000000, 50);

    const lines = [
      `Zonen: Reserve 0–${reserveMin} %, LSK ${lskMin}–${lskMax} %, Eigenverbrauch ${selfMin}–${selfMax} %`,
      `reserveEnabled = ${reserveOn ? 'true' : 'false'}  | reserveMinSocPct = ${reserveMin}  | reserveTargetSocPct = ${reserveTarget}`,
      `lskEnabled = ${peakOn ? 'true' : 'false'}  | lskMinSocPct = ${lskMin}  | lskMaxSocPct = ${lskMax}`,
      `selfDischargeEnabled = ${selfOn ? 'true' : 'false'}  | selfMinSocPct = ${selfMin}  | selfMaxSocPct = ${selfMax}`,
      `selfTargetGridImportW = ${selfTargetW} W  | selfDeadbandW = ±${selfDeadbandW} W`,
    ];

    els.muStorageSummary.innerHTML = '';
    for (const t of lines) {
      const div = document.createElement('div');
      div.className = 'nw-config-list__row';
      div.textContent = t;
      els.muStorageSummary.appendChild(div);
    }
  }

    function buildStorageMultiUseUI() {
    if (!els.muStorageEnabled) return;

    const apps = (currentConfig && currentConfig.emsApps && currentConfig.emsApps.apps) ? currentConfig.emsApps.apps : {};
    const a = (apps && typeof apps.multiuse === 'object') ? apps.multiuse : { installed: false, enabled: false };

    _ensureStorageMultiUseCfg();

    const setDisabled = (d) => {
      if (els.muStorageEnabled) els.muStorageEnabled.disabled = d;
      if (els.muReserveEnabled) els.muReserveEnabled.disabled = d;
      if (els.muReserveMinSoc) els.muReserveMinSoc.disabled = d;
      if (els.muReserveTargetSoc) els.muReserveTargetSoc.disabled = d;
      if (els.muPeakEnabled) els.muPeakEnabled.disabled = d;
      if (els.muLskMinSoc) els.muLskMinSoc.disabled = d;
      if (els.muLskMaxSoc) els.muLskMaxSoc.disabled = d;
      if (els.muSelfEnabled) els.muSelfEnabled.disabled = d;
      if (els.muSelfMinSoc) els.muSelfMinSoc.disabled = d;
      if (els.muSelfMaxSoc) els.muSelfMaxSoc.disabled = d;
      if (els.muSelfTargetGridW) els.muSelfTargetGridW.disabled = d;
      if (els.muSelfDeadbandW) els.muSelfDeadbandW.disabled = d;
    };

    setDisabled(!a.installed);

    const syncFromCfgToUi = () => {
      const mu2 = _ensureStorageMultiUseCfg();

      if (els.muStorageEnabled) els.muStorageEnabled.checked = !!mu2.enabled;
      if (els.muReserveEnabled) els.muReserveEnabled.checked = (mu2.reserveEnabled !== false);
      if (els.muReserveMinSoc) els.muReserveMinSoc.value = numOrEmpty(mu2.reserveMinSocPct);
      if (els.muReserveTargetSoc) els.muReserveTargetSoc.value = numOrEmpty(mu2.reserveTargetSocPct);

      if (els.muPeakEnabled) els.muPeakEnabled.checked = (mu2.peakEnabled !== false);
      if (els.muLskMinSoc) els.muLskMinSoc.value = numOrEmpty(mu2.lskMinSocPct);
      if (els.muLskMaxSoc) els.muLskMaxSoc.value = numOrEmpty(mu2.lskMaxSocPct);

      if (els.muSelfEnabled) els.muSelfEnabled.checked = (mu2.selfEnabled !== false);
      if (els.muSelfMinSoc) els.muSelfMinSoc.value = numOrEmpty(mu2.selfMinSocPct);
      if (els.muSelfMaxSoc) els.muSelfMaxSoc.value = numOrEmpty(mu2.selfMaxSocPct);
      if (els.muSelfTargetGridW) els.muSelfTargetGridW.value = numOrEmpty(mu2.selfTargetGridImportW);
      if (els.muSelfDeadbandW) els.muSelfDeadbandW.value = numOrEmpty(mu2.selfImportThresholdW);

      _renderStorageMultiUseSummary(mu2);
    };

    const syncFromUiToCfg = () => {
      const mu2 = _ensureStorageMultiUseCfg();

      mu2.enabled = !!(els.muStorageEnabled && els.muStorageEnabled.checked);
      mu2.reserveEnabled = !!(els.muReserveEnabled && els.muReserveEnabled.checked);
      mu2.peakEnabled = !!(els.muPeakEnabled && els.muPeakEnabled.checked);
      mu2.selfEnabled = !!(els.muSelfEnabled && els.muSelfEnabled.checked);

      const reserveMin = _clampInt(els.muReserveMinSoc ? els.muReserveMinSoc.value : mu2.reserveMinSocPct, 0, 100, 10);
      const reserveTarget = _clampInt(els.muReserveTargetSoc ? els.muReserveTargetSoc.value : mu2.reserveTargetSocPct, reserveMin, 100, reserveMin);

      const reserveBaseMin = mu2.reserveEnabled ? reserveMin : 0;

      // LSK darf (wenn Reserve deaktiviert ist) auch unter die bisherige Reserve-Min.
      const lskMin = _clampInt(els.muLskMinSoc ? els.muLskMinSoc.value : mu2.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
      const lskMax = _clampInt(els.muLskMaxSoc ? els.muLskMaxSoc.value : mu2.lskMaxSocPct, lskMin, 100, Math.max(lskMin, 50));

      // Eigenverbrauch-Min hängt nur dann an LSK-Max, wenn Peak/LSK aktiv ist.
      const selfBaseMin = mu2.peakEnabled ? lskMax : reserveBaseMin;
      const selfMin = _clampInt(els.muSelfMinSoc ? els.muSelfMinSoc.value : mu2.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
      const selfMax = _clampInt(els.muSelfMaxSoc ? els.muSelfMaxSoc.value : mu2.selfMaxSocPct, selfMin, 100, 100);

      // NVP‑Regelung (Eigenverbrauch)
      const selfTargetW = _clampInt(els.muSelfTargetGridW ? els.muSelfTargetGridW.value : mu2.selfTargetGridImportW, 0, 1000000, 50);
      const selfDeadbandW = _clampInt(els.muSelfDeadbandW ? els.muSelfDeadbandW.value : mu2.selfImportThresholdW, 0, 1000000, 50);

      mu2.reserveMinSocPct = reserveMin;
      mu2.reserveTargetSocPct = reserveTarget;
      mu2.lskMinSocPct = lskMin;
      mu2.lskMaxSocPct = lskMax;
      mu2.selfMinSocPct = selfMin;
      mu2.selfMaxSocPct = selfMax;
      mu2.selfTargetGridImportW = selfTargetW;
      mu2.selfImportThresholdW = selfDeadbandW;

      // Legacy fields keep a meaningful approximation
      mu2.reserveToSocPct = reserveMin;
      mu2.peakToSocPct = lskMax;
      mu2.selfToSocPct = selfMax;

      // Push normalized values back into UI (prevents invalid ranges)
      if (els.muReserveMinSoc) els.muReserveMinSoc.value = numOrEmpty(reserveMin);
      if (els.muReserveTargetSoc) els.muReserveTargetSoc.value = numOrEmpty(reserveTarget);
      if (els.muLskMinSoc) els.muLskMinSoc.value = numOrEmpty(lskMin);
      if (els.muLskMaxSoc) els.muLskMaxSoc.value = numOrEmpty(lskMax);
      if (els.muSelfMinSoc) els.muSelfMinSoc.value = numOrEmpty(selfMin);
      if (els.muSelfMaxSoc) els.muSelfMaxSoc.value = numOrEmpty(selfMax);
      if (els.muSelfTargetGridW) els.muSelfTargetGridW.value = numOrEmpty(selfTargetW);
      if (els.muSelfDeadbandW) els.muSelfDeadbandW.value = numOrEmpty(selfDeadbandW);

      _renderStorageMultiUseSummary(mu2);
      scheduleValidation(200);
    };

    // Bind events (overwrite handlers to avoid duplicates on rebuild)
    if (els.muStorageEnabled) els.muStorageEnabled.onchange = syncFromUiToCfg;
    if (els.muReserveEnabled) els.muReserveEnabled.onchange = syncFromUiToCfg;
    if (els.muReserveMinSoc) els.muReserveMinSoc.onchange = syncFromUiToCfg;
    if (els.muReserveTargetSoc) els.muReserveTargetSoc.onchange = syncFromUiToCfg;
    if (els.muPeakEnabled) els.muPeakEnabled.onchange = syncFromUiToCfg;
    if (els.muLskMinSoc) els.muLskMinSoc.onchange = syncFromUiToCfg;
    if (els.muLskMaxSoc) els.muLskMaxSoc.onchange = syncFromUiToCfg;
    if (els.muSelfEnabled) els.muSelfEnabled.onchange = syncFromUiToCfg;
    if (els.muSelfMinSoc) els.muSelfMinSoc.onchange = syncFromUiToCfg;
    if (els.muSelfMaxSoc) els.muSelfMaxSoc.onchange = syncFromUiToCfg;
    if (els.muSelfTargetGridW) els.muSelfTargetGridW.onchange = syncFromUiToCfg;
    if (els.muSelfDeadbandW) els.muSelfDeadbandW.onchange = syncFromUiToCfg;

    syncFromCfgToUi();

    if (!a.installed && els.muStorageSummary) {
      const hint = document.createElement('div');
      hint.className = 'nw-help';
      hint.style.marginTop = '10px';
      hint.textContent = 'Die App „MultiUse“ ist nicht installiert. Bitte unter „Apps“ installieren, dann hier konfigurieren.';
      els.muStorageSummary.appendChild(hint);
    }
  }




  // --- EVCS / Stations (Phase 2) ---

  function _clampInt(v, min, max, def) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    const i = Math.round(n);
    return Math.min(max, Math.max(min, i));
  }

  function _ensureSettingsConfig() {
    currentConfig = currentConfig || {};
    currentConfig.settingsConfig = (currentConfig.settingsConfig && typeof currentConfig.settingsConfig === 'object') ? currentConfig.settingsConfig : {};
    return currentConfig.settingsConfig;
  }

  function _ensureChargingManagementConfig() {
    currentConfig = currentConfig || {};
    currentConfig.chargingManagement = (currentConfig.chargingManagement && typeof currentConfig.chargingManagement === 'object') ? currentConfig.chargingManagement : {};
    return currentConfig.chargingManagement;
  }

  function _ensureEvcsList(count) {
    const sc = _ensureSettingsConfig();
    const list = Array.isArray(sc.evcsList) ? sc.evcsList : [];
    while (list.length < count) list.push({});
    if (list.length > count) list.length = count;
    sc.evcsList = list;
    return list;
  }

  function _updateEvcsField(idx, field, value) {
    const sc = _ensureSettingsConfig();
    const count = _clampInt(sc.evcsCount, 1, 50, 1);
    const list = _ensureEvcsList(count);
    const row = (list[idx - 1] && typeof list[idx - 1] === 'object') ? list[idx - 1] : {};
    row[field] = value;
    list[idx - 1] = row;
    sc.evcsList = list;
  }

  function buildEvcsUI() {
    if (!els.evcsList || !els.evcsCount) return;
    const sc = _ensureSettingsConfig();
    const count = _clampInt(sc.evcsCount, 1, 50, 1);
    sc.evcsCount = count;

    els.evcsCount.value = String(count);
    if (els.evcsMaxPowerKw) {
      const kw = (sc.evcsMaxPowerKw !== undefined && sc.evcsMaxPowerKw !== null) ? Number(sc.evcsMaxPowerKw) : 11;
      els.evcsMaxPowerKw.value = Number.isFinite(kw) ? String(kw) : '11';
    }

    const list = _ensureEvcsList(count);
    sc.stationGroups = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];

    els.evcsList.innerHTML = '';

    const mkRow = (label, controlEl) => {
      const row = document.createElement('div');
      row.className = 'nw-config-field-row';
      const lab = document.createElement('div');
      lab.className = 'nw-config-field-label';
      lab.textContent = label;
      const ctl = document.createElement('div');
      ctl.className = 'nw-config-field-control';
      ctl.appendChild(controlEl);
      row.appendChild(lab);
      row.appendChild(ctl);
      return row;
    };

    const mkIo = (id, value, onChange) => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.gap = '6px';
      wrap.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'text';
      input.id = id;
      input.value = valueOrEmpty(value);
      input.placeholder = 'State-ID…';
      input.dataset.dpInput = '1';
      input.dataset.dpInput = '1';
      input.addEventListener('change', () => { onChange(String(input.value || '').trim()); scheduleValidation(200); });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-config-btn nw-config-btn--ghost';
      btn.textContent = 'Auswählen…';
      btn.addEventListener('click', () => openDpModal(id));

      wrap.appendChild(input);
      wrap.appendChild(btn);
      return wrap;
    };

    const normKey = (k) => String(k || '').trim();

    // Determine station keys for grouping (UI only; does NOT reorder the underlying list)
    const stationKeys = [];
    const seen = new Set();

    // 1) StationGroups first (preferred order)
    for (const g of sc.stationGroups) {
      const sk = normKey(g && g.stationKey);
      if (!sk) continue;
      if (seen.has(sk)) continue;
      seen.add(sk);
      stationKeys.push(sk);
    }

    // 2) Additional station keys from Ladepunkten (order of first appearance)
    for (const row of list) {
      const sk = normKey(row && row.stationKey);
      if (!sk) continue;
      if (seen.has(sk)) continue;
      seen.add(sk);
      stationKeys.push(sk);
    }

    const hasUnassigned = list.some(r => !normKey(r && r.stationKey));
    if (hasUnassigned) stationKeys.push(''); // UI group for "unassigned"

    const groupIndexByKey = new Map();
    sc.stationGroups.forEach((g, idx) => {
      const sk = normKey(g && g.stationKey);
      if (sk) groupIndexByKey.set(sk, idx);
    });

    const ensureGroupForKey = (stationKey) => {
      const sk = normKey(stationKey);
      if (!sk) return -1;
      if (groupIndexByKey.has(sk)) return groupIndexByKey.get(sk);
      sc.stationGroups.push({ stationKey: sk, name: '', maxPowerKw: 0 });
      const idx = sc.stationGroups.length - 1;
      groupIndexByKey.set(sk, idx);
      return idx;
    };

    const moveStationGroup = (stationKey, dir) => {
      const sk = normKey(stationKey);
      const idx = groupIndexByKey.get(sk);
      if (idx === undefined || idx === null) return;
      const arr = sc.stationGroups;
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return;
      const tmp = arr[idx];
      arr[idx] = arr[target];
      arr[target] = tmp;
      // rebuild map
      groupIndexByKey.clear();
      arr.forEach((g, i) => {
        const k = normKey(g && g.stationKey);
        if (k) groupIndexByKey.set(k, i);
      });
      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
    };

    const renameStationKey = (oldKey, newKey) => {
      const ok = normKey(oldKey);
      const nk = normKey(newKey);
      if (!ok) return;
      if (!nk || nk === ok) return;

      // Update stationGroup entry (if present)
      const gi = groupIndexByKey.get(ok);
      if (gi !== undefined && gi !== null) {
        sc.stationGroups[gi] = sc.stationGroups[gi] || {};
        sc.stationGroups[gi].stationKey = nk;
      }
      // Update ports
      for (let i = 0; i < list.length; i++) {
        const k = normKey(list[i] && list[i].stationKey);
        if (k === ok) {
          list[i] = list[i] || {};
          list[i].stationKey = nk;
        }
      }
      sc.evcsList = list;

      // Rebuild maps + UI
      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
    };

    const addPortToStation = (stationKey) => {
      const sk = normKey(stationKey);
      const sc2 = _ensureSettingsConfig();
      const cur = _clampInt(sc2.evcsCount, 1, 50, 1);
      if (cur >= 20) return;

      const next = cur + 1;
      sc2.evcsCount = next;
      if (els.evcsCount) els.evcsCount.value = String(next);

      const list2 = _ensureEvcsList(next);
      list2[next - 1] = Object.assign({}, list2[next - 1] || {}, { stationKey: sk, name: '', enabled: true });
      sc2.evcsList = list2;

      buildEvcsUI();
    };

    const movePortWithinStation = (portIdx, stationKey, dir) => {
      const sk = normKey(stationKey);
      const a = portIdx - 1;
      if (a < 0 || a >= list.length) return;

      let b = -1;
      if (dir < 0) {
        for (let j = a - 1; j >= 0; j--) {
          if (normKey(list[j] && list[j].stationKey) === sk) { b = j; break; }
          if (!sk && !normKey(list[j] && list[j].stationKey)) { b = j; break; }
        }
      } else {
        for (let j = a + 1; j < list.length; j++) {
          if (normKey(list[j] && list[j].stationKey) === sk) { b = j; break; }
          if (!sk && !normKey(list[j] && list[j].stationKey)) { b = j; break; }
        }
      }
      if (b < 0) return;

      const tmp = list[a];
      list[a] = list[b];
      list[b] = tmp;
      sc.evcsList = list;

      buildEvcsUI();
    };

    const createPortCard = (i, stationKey) => {
      const rowCfg = list[i - 1] || {};
      const sk = normKey(stationKey);

      const card = document.createElement('div');
      card.className = 'nw-config-card';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';

      const connNo = (rowCfg && rowCfg.connectorNo !== undefined && rowCfg.connectorNo !== null && Number.isFinite(Number(rowCfg.connectorNo)) && Number(rowCfg.connectorNo) > 0)
        ? Math.round(Number(rowCfg.connectorNo))
        : 0;

      title.textContent = connNo > 0 ? `Port ${connNo} · LP ${i}` : `Ladepunkt ${i}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'nw-config-mini-btn';
      btnUp.textContent = '↑';
      btnUp.title = 'Innerhalb der Station nach oben';
      btnUp.addEventListener('click', () => movePortWithinStation(i, sk, -1));

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'nw-config-mini-btn';
      btnDown.textContent = '↓';
      btnDown.title = 'Innerhalb der Station nach unten';
      btnDown.addEventListener('click', () => movePortWithinStation(i, sk, +1));

      actions.appendChild(btnUp);
      actions.appendChild(btnDown);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = (rowCfg && rowCfg.name) ? String(rowCfg.name) : '';
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Name
      const nameInput = document.createElement('input');
      nameInput.className = 'nw-config-input';
      nameInput.type = 'text';
      nameInput.value = valueOrEmpty(rowCfg.name);
      nameInput.placeholder = `Name (z.B. Port ${connNo || i})`;
      nameInput.addEventListener('input', () => {
        const v = String(nameInput.value || '').trim();
        _updateEvcsField(i, 'name', v);
        subtitle.textContent = v;
      });
      body.appendChild(mkRow('Name', nameInput));

      // Aktivierung/Regelung (Installateur)
      const enabledInp = document.createElement('input');
      enabledInp.type = 'checkbox';
      enabledInp.checked = (rowCfg && rowCfg.enabled !== false);
      enabledInp.addEventListener('change', () => _updateEvcsField(i, 'enabled', !!enabledInp.checked));
      body.appendChild(mkRow('Aktiv (Regelung)', enabledInp));

      // Typ
      const typeSel = document.createElement('select');
      typeSel.className = 'nw-config-input';
      const tVal = String(rowCfg.chargerType || 'ac').toLowerCase();
      typeSel.innerHTML = '<option value="ac">ac</option><option value="dc">dc</option>';
      typeSel.value = (tVal === 'dc') ? 'dc' : 'ac';
      typeSel.addEventListener('change', () => _updateEvcsField(i, 'chargerType', String(typeSel.value)));
      body.appendChild(mkRow('Typ', typeSel));

      // Station key (visible for moving between stations)
      const stationKeyInput = document.createElement('input');
      stationKeyInput.className = 'nw-config-input';
      stationKeyInput.type = 'text';
      stationKeyInput.value = valueOrEmpty(rowCfg.stationKey);
      stationKeyInput.placeholder = 'Stations-Key (optional)';
      stationKeyInput.addEventListener('input', () => {
        const v = String(stationKeyInput.value || '').trim();
        _updateEvcsField(i, 'stationKey', v);
        // If a new key is introduced, ensure it appears as Station in UI
        if (v) ensureGroupForKey(v);
        // Just rebuild UI for regrouping; does not touch config order
        buildEvcsUI();
        try { buildStationGroupsUI(); } catch (_e) {}
      });
      body.appendChild(mkRow('Ladestation (Key)', stationKeyInput));

      // Port / Ladepunkt Nr.
      const connInput = document.createElement('input');
      connInput.className = 'nw-config-input';
      connInput.type = 'number';
      connInput.min = '0';
      connInput.step = '1';
      connInput.value = numOrEmpty(rowCfg.connectorNo);
      connInput.placeholder = '0';
      connInput.addEventListener('change', () => {
        _updateEvcsField(i, 'connectorNo', _clampInt(connInput.value, 0, 99, 0));
        buildEvcsUI();
      });
      body.appendChild(mkRow('Port / Ladepunkt (Nr.)', connInput));

      // Priorität (1 = höchste)
      const prioInput = document.createElement('input');
      prioInput.className = 'nw-config-input';
      prioInput.type = 'number';
      prioInput.min = '1';
      prioInput.max = '999';
      prioInput.step = '1';
      {
        const raw = (rowCfg && rowCfg.priority !== undefined && rowCfg.priority !== null && String(rowCfg.priority).trim() !== '' && Number.isFinite(Number(rowCfg.priority)))
          ? Math.round(Number(rowCfg.priority))
          : 999;
        const clamped = _clampInt(raw, 1, 999, 999);
        prioInput.value = String(clamped);
      }
      prioInput.addEventListener('change', () => _updateEvcsField(i, 'priority', _clampInt(prioInput.value, 1, 999, 999)));
      body.appendChild(mkRow('Priorität (1..999)', prioInput));

      // Standard-Modus
      const modeSel = document.createElement('select');
      modeSel.className = 'nw-config-input';
      modeSel.innerHTML = '<option value="auto">auto</option><option value="pv">pv</option><option value="minpv">minpv</option><option value="boost">boost</option>';
      {
        const um = String((rowCfg && rowCfg.userMode) ? rowCfg.userMode : 'auto').toLowerCase();
        modeSel.value = (um === 'pv' || um === 'minpv' || um === 'boost') ? um : 'auto';
      }
      modeSel.addEventListener('change', () => _updateEvcsField(i, 'userMode', String(modeSel.value)));
      body.appendChild(mkRow('Standard-Modus', modeSel));

      // Datenpunkte
      const dpDetails = document.createElement('details');
      dpDetails.style.marginTop = '8px';
      dpDetails.open = true;
      const dpSum = document.createElement('summary');
      dpSum.textContent = 'Datenpunkte & Stellgrößen';
      dpSum.style.cursor = 'pointer';
      dpSum.style.userSelect = 'none';
      dpDetails.appendChild(dpSum);

      const dpWrap = document.createElement('div');
      dpWrap.style.marginTop = '10px';
      dpWrap.style.display = 'grid';
      dpWrap.style.gap = '10px';

      dpWrap.appendChild(mkRow('Leistung (W)', mkIo(`evcs_${i}_powerId`, rowCfg.powerId, v => _updateEvcsField(i, 'powerId', v))));
      dpWrap.appendChild(mkRow('Energie (kWh)', mkIo(`evcs_${i}_energyTotalId`, rowCfg.energyTotalId, v => _updateEvcsField(i, 'energyTotalId', v))));
      dpWrap.appendChild(mkRow('Status (optional)', mkIo(`evcs_${i}_statusId`, rowCfg.statusId, v => _updateEvcsField(i, 'statusId', v))));
      dpWrap.appendChild(mkRow('Fahrzeug‑SoC (%) (optional)', mkIo(`evcs_${i}_vehicleSocId`, rowCfg.vehicleSocId, v => _updateEvcsField(i, 'vehicleSocId', v))));
      dpWrap.appendChild(mkRow('Freigabe (optional)', mkIo(`evcs_${i}_activeId`, rowCfg.activeId, v => _updateEvcsField(i, 'activeId', v))));

      dpWrap.appendChild(mkRow('Sollstrom (A)', mkIo(`evcs_${i}_setCurrentAId`, rowCfg.setCurrentAId, v => _updateEvcsField(i, 'setCurrentAId', v))));
      dpWrap.appendChild(mkRow('Sollleistung (W)', mkIo(`evcs_${i}_setPowerWId`, rowCfg.setPowerWId, v => _updateEvcsField(i, 'setPowerWId', v))));
      dpWrap.appendChild(mkRow('Enable (write)', mkIo(`evcs_${i}_enableWriteId`, rowCfg.enableWriteId, v => _updateEvcsField(i, 'enableWriteId', v))));
      dpWrap.appendChild(mkRow('Online (read)', mkIo(`evcs_${i}_onlineId`, rowCfg.onlineId, v => _updateEvcsField(i, 'onlineId', v))));

      dpWrap.appendChild(mkRow('Lock (write)', mkIo(`evcs_${i}_lockWriteId`, rowCfg.lockWriteId, v => _updateEvcsField(i, 'lockWriteId', v))));
      dpWrap.appendChild(mkRow('RFID Reader', mkIo(`evcs_${i}_rfidReadId`, rowCfg.rfidReadId, v => _updateEvcsField(i, 'rfidReadId', v))));

      dpDetails.appendChild(dpWrap);
      body.appendChild(dpDetails);

      // Erweitert (optional, aber hilfreich für stabile Regelung)
      const details = document.createElement('details');
      details.style.marginTop = '8px';
      const summary = document.createElement('summary');
      summary.textContent = 'Erweitert';
      summary.style.cursor = 'pointer';
      summary.style.userSelect = 'none';
      details.appendChild(summary);

      const adv = document.createElement('div');
      adv.style.marginTop = '10px';
      adv.style.display = 'grid';
      adv.style.gap = '10px';

      // Steuerpräferenz
      const ctrlSel = document.createElement('select');
      ctrlSel.className = 'nw-config-input';
      ctrlSel.innerHTML = '<option value="auto">auto</option><option value="currentA">currentA</option><option value="powerW">powerW</option><option value="none">none</option>';
      {
        const cp = String((rowCfg && rowCfg.controlPreference) ? rowCfg.controlPreference : 'auto').trim().toLowerCase();
        ctrlSel.value = (cp === 'currenta' || cp === 'current') ? 'currentA'
          : (cp === 'powerw' || cp === 'power') ? 'powerW'
          : (cp === 'none' || cp === 'off') ? 'none'
          : 'auto';
      }
      ctrlSel.addEventListener('change', () => _updateEvcsField(i, 'controlPreference', String(ctrlSel.value)));
      adv.appendChild(mkRow('Steuerung', ctrlSel));

      // Phasen
      const phasesSel = document.createElement('select');
      phasesSel.className = 'nw-config-input';
      phasesSel.innerHTML = '<option value="1">1</option><option value="3">3</option>';
      {
        const p = Number(rowCfg.phases);
        phasesSel.value = (p === 1) ? '1' : '3';
      }
      phasesSel.addEventListener('change', () => _updateEvcsField(i, 'phases', _clampInt(phasesSel.value, 1, 3, 3)));
      adv.appendChild(mkRow('Phasen', phasesSel));

      // Spannung
      const vInput = document.createElement('input');
      vInput.className = 'nw-config-input';
      vInput.type = 'number';
      vInput.min = '1';
      vInput.step = '1';
      vInput.placeholder = '230';
      vInput.value = String((rowCfg && Number.isFinite(Number(rowCfg.voltageV)) && Number(rowCfg.voltageV) > 0) ? Math.round(Number(rowCfg.voltageV)) : 230);
      vInput.addEventListener('change', () => {
        const v = Number(vInput.value);
        _updateEvcsField(i, 'voltageV', (Number.isFinite(v) && v > 0) ? Math.round(v) : 230);
      });
      adv.appendChild(mkRow('Spannung (V)', vInput));

      // Grenzen / Schritte
      const minAInput = document.createElement('input');
      minAInput.className = 'nw-config-input';
      minAInput.type = 'number';
      minAInput.min = '0';
      minAInput.step = '0.1';
      minAInput.placeholder = '0 = Standard';
      minAInput.value = (rowCfg && Number(rowCfg.minCurrentA) > 0 && Number.isFinite(Number(rowCfg.minCurrentA))) ? String(Number(rowCfg.minCurrentA)) : '';
      minAInput.addEventListener('change', () => {
        const v = Number(minAInput.value);
        _updateEvcsField(i, 'minCurrentA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Min Strom (A)', minAInput));

      const maxAInput = document.createElement('input');
      maxAInput.className = 'nw-config-input';
      maxAInput.type = 'number';
      maxAInput.min = '0';
      maxAInput.step = '0.1';
      maxAInput.placeholder = '0 = Standard';
      maxAInput.value = (rowCfg && Number(rowCfg.maxCurrentA) > 0 && Number.isFinite(Number(rowCfg.maxCurrentA))) ? String(Number(rowCfg.maxCurrentA)) : '';
      maxAInput.addEventListener('change', () => {
        const v = Number(maxAInput.value);
        _updateEvcsField(i, 'maxCurrentA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Max Strom (A)', maxAInput));

      const maxWInput = document.createElement('input');
      maxWInput.className = 'nw-config-input';
      maxWInput.type = 'number';
      maxWInput.min = '0';
      maxWInput.step = '1';
      maxWInput.placeholder = '0 = Standard';
      maxWInput.value = (rowCfg && Number(rowCfg.maxPowerW) > 0 && Number.isFinite(Number(rowCfg.maxPowerW))) ? String(Math.round(Number(rowCfg.maxPowerW))) : '';
      maxWInput.addEventListener('change', () => {
        const v = Number(maxWInput.value);
        _updateEvcsField(i, 'maxPowerW', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Max Leistung (W)', maxWInput));

      const stepAInput = document.createElement('input');
      stepAInput.className = 'nw-config-input';
      stepAInput.type = 'number';
      stepAInput.min = '0';
      stepAInput.step = '0.1';
      stepAInput.placeholder = '0 = Standard';
      stepAInput.value = (rowCfg && Number(rowCfg.stepA) > 0 && Number.isFinite(Number(rowCfg.stepA))) ? String(Number(rowCfg.stepA)) : '';
      stepAInput.addEventListener('change', () => {
        const v = Number(stepAInput.value);
        _updateEvcsField(i, 'stepA', (Number.isFinite(v) && v > 0) ? v : 0);
      });
      adv.appendChild(mkRow('Step Strom (A)', stepAInput));

      const stepWInput = document.createElement('input');
      stepWInput.className = 'nw-config-input';
      stepWInput.type = 'number';
      stepWInput.min = '0';
      stepWInput.step = '1';
      stepWInput.placeholder = '0 = Standard';
      stepWInput.value = (rowCfg && Number(rowCfg.stepW) > 0 && Number.isFinite(Number(rowCfg.stepW))) ? String(Math.round(Number(rowCfg.stepW))) : '';
      stepWInput.addEventListener('change', () => {
        const v = Number(stepWInput.value);
        _updateEvcsField(i, 'stepW', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Step Leistung (W)', stepWInput));

      // Boost
      const allowBoostInp = document.createElement('input');
      allowBoostInp.type = 'checkbox';
      allowBoostInp.checked = (rowCfg && rowCfg.allowBoost !== false);
      allowBoostInp.addEventListener('change', () => _updateEvcsField(i, 'allowBoost', !!allowBoostInp.checked));
      adv.appendChild(mkRow('Boost erlauben', allowBoostInp));

      const boostTInput = document.createElement('input');
      boostTInput.className = 'nw-config-input';
      boostTInput.type = 'number';
      boostTInput.min = '0';
      boostTInput.step = '1';
      boostTInput.placeholder = '0 = Standard';
      boostTInput.value = (rowCfg && Number(rowCfg.boostTimeoutMin) > 0 && Number.isFinite(Number(rowCfg.boostTimeoutMin))) ? String(Math.round(Number(rowCfg.boostTimeoutMin))) : '';
      boostTInput.addEventListener('change', () => {
        const v = Number(boostTInput.value);
        _updateEvcsField(i, 'boostTimeoutMin', (Number.isFinite(v) && v > 0) ? Math.round(v) : 0);
      });
      adv.appendChild(mkRow('Boost Timeout (min)', boostTInput));

      details.appendChild(adv);
      body.appendChild(details);

      card.appendChild(header);
      card.appendChild(body);

      return card;
    };

    // Render Station cards
    for (const stationKey of stationKeys) {
      const sk = normKey(stationKey);
      const isUnassigned = !sk;

      // find ports for this station key
      const ports = [];
      for (let i = 1; i <= count; i++) {
        const rowCfg = list[i - 1] || {};
        const k = normKey(rowCfg.stationKey);
        if (isUnassigned) {
          if (!k) ports.push(i);
        } else {
          if (k === sk) ports.push(i);
        }
      }

      // show station if either ports exist OR it's explicitly configured as stationGroup
      const hasGroup = !isUnassigned && groupIndexByKey.has(sk);
      if (!ports.length && !hasGroup) continue;
      if (isUnassigned && !ports.length) continue;

      const card = document.createElement('div');
      card.className = 'nw-config-card';
      card.style.gridColumn = '1 / -1';

      const header = document.createElement('div');
      header.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';

      const stationName = (!isUnassigned && hasGroup && sc.stationGroups[groupIndexByKey.get(sk)] && sc.stationGroups[groupIndexByKey.get(sk)].name)
        ? String(sc.stationGroups[groupIndexByKey.get(sk)].name || '').trim()
        : '';

      if (isUnassigned) title.textContent = 'Unzugeordnet';
      else title.textContent = stationName ? `Station ${sk} – ${stationName}` : `Station ${sk}`;

      const actions = document.createElement('div');
      actions.className = 'nw-config-card__header-actions';

      // Station reorder (only for configured stationGroups)
      if (!isUnassigned && hasGroup) {
        const btnSU = document.createElement('button');
        btnSU.type = 'button';
        btnSU.className = 'nw-config-mini-btn';
        btnSU.textContent = '↑';
        btnSU.title = 'Station in der Reihenfolge nach oben';
        btnSU.addEventListener('click', () => moveStationGroup(sk, -1));

        const btnSD = document.createElement('button');
        btnSD.type = 'button';
        btnSD.className = 'nw-config-mini-btn';
        btnSD.textContent = '↓';
        btnSD.title = 'Station in der Reihenfolge nach unten';
        btnSD.addEventListener('click', () => moveStationGroup(sk, +1));

        actions.appendChild(btnSU);
        actions.appendChild(btnSD);
      }

      const btnAddPort = document.createElement('button');
      btnAddPort.type = 'button';
      btnAddPort.className = 'nw-config-btn nw-config-btn--ghost';
      btnAddPort.textContent = '+ Port';
      btnAddPort.title = 'Neuen Ladepunkt/Port hinzufügen';
      btnAddPort.addEventListener('click', () => addPortToStation(sk));
      actions.appendChild(btnAddPort);

      top.appendChild(title);
      top.appendChild(actions);
      header.appendChild(top);

      const subtitle = document.createElement('div');
      subtitle.className = 'nw-config-card__subtitle';
      subtitle.textContent = isUnassigned
        ? `Ports ohne stationKey (${ports.length})`
        : `Ports in Station: ${ports.length}`;
      header.appendChild(subtitle);

      const body = document.createElement('div');
      body.className = 'nw-config-card__body';

      // Station settings (only if stationKey set)
      if (!isUnassigned) {
        const gi = ensureGroupForKey(sk);

        const stationKeyInput = document.createElement('input');
        stationKeyInput.className = 'nw-config-input';
        stationKeyInput.type = 'text';
        stationKeyInput.value = sk;
        stationKeyInput.placeholder = 'stationKey';
        stationKeyInput.addEventListener('change', () => {
          const nk = normKey(stationKeyInput.value);
          renameStationKey(sk, nk);
        });
        body.appendChild(mkRow('Station Key', stationKeyInput));

        const nameInput = document.createElement('input');
        nameInput.className = 'nw-config-input';
        nameInput.type = 'text';
        nameInput.placeholder = 'Name (optional)';
        nameInput.value = valueOrEmpty(sc.stationGroups[gi] && sc.stationGroups[gi].name);
        nameInput.addEventListener('input', () => {
          sc.stationGroups[gi] = sc.stationGroups[gi] || {};
          sc.stationGroups[gi].name = String(nameInput.value || '').trim();
          try { buildStationGroupsUI(); } catch (_e) {}
        });
        body.appendChild(mkRow('Name', nameInput));

        const maxPowerKw = document.createElement('input');
        maxPowerKw.className = 'nw-config-input';
        maxPowerKw.type = 'number';
        maxPowerKw.min = '0';
        maxPowerKw.step = '0.1';
        maxPowerKw.placeholder = '0 = kein Cap';
        maxPowerKw.value = numOrEmpty(sc.stationGroups[gi] && sc.stationGroups[gi].maxPowerKw);
        maxPowerKw.addEventListener('change', () => {
          const n = Number(maxPowerKw.value);
          sc.stationGroups[gi] = sc.stationGroups[gi] || {};
          sc.stationGroups[gi].maxPowerKw = Number.isFinite(n) ? n : 0;
          try { buildStationGroupsUI(); } catch (_e) {}
        });
        body.appendChild(mkRow('Stationslimit (kW)', maxPowerKw));
      } else {
        const info = document.createElement('div');
        info.className = 'nw-config-empty';
        info.textContent = 'Tipp: Setze bei Ports einen stationKey, um sie einer Station zuzuordnen (z.B. DC-Station mit mehreren Ports).';
        body.appendChild(info);
      }

      // Ports grid
      const portsWrap = document.createElement('div');
      portsWrap.className = 'nw-config-grid';
      portsWrap.style.marginTop = '8px';
      portsWrap.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';

      for (const idx of ports) {
        portsWrap.appendChild(createPortCard(idx, sk));
      }

      body.appendChild(portsWrap);

      card.appendChild(header);
      card.appendChild(body);
      els.evcsList.appendChild(card);
    }
  }

  function buildStationGroupsUI() {
    if (!els.stationGroups) return;
    const sc = _ensureSettingsConfig();
    const arr = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
    sc.stationGroups = arr;
    els.stationGroups.innerHTML = '';

    if (!arr.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Stationsgruppen angelegt.';
      els.stationGroups.appendChild(empty);
      return;
    }

    arr.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'nw-config-item';

      const left = document.createElement('div');
      left.className = 'nw-config-item__left';

      const title = document.createElement('div');
      title.className = 'nw-config-item__title';
      title.textContent = g && g.stationKey ? String(g.stationKey) : `Gruppe ${idx + 1}`;
      const sub = document.createElement('div');
      sub.className = 'nw-config-item__subtitle';
      sub.textContent = 'stationKey / Name / maxPowerKw';

      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-item__right';
      right.style.display = 'flex';
      right.style.gap = '6px';
      right.style.alignItems = 'center';

      const stationKey = document.createElement('input');
      stationKey.className = 'nw-config-input';
      stationKey.type = 'text';
      stationKey.placeholder = 'stationKey';
      stationKey.value = valueOrEmpty(g && g.stationKey);
      stationKey.addEventListener('input', () => {
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].stationKey = String(stationKey.value || '').trim();
        title.textContent = sc.stationGroups[idx].stationKey || `Gruppe ${idx + 1}`;
      });

      const name = document.createElement('input');
      name.className = 'nw-config-input';
      name.type = 'text';
      name.placeholder = 'Name (optional)';
      name.value = valueOrEmpty(g && g.name);
      name.addEventListener('input', () => {
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].name = String(name.value || '').trim();
      });

      const maxPowerKw = document.createElement('input');
      maxPowerKw.className = 'nw-config-input';
      maxPowerKw.type = 'number';
      maxPowerKw.min = '0';
      maxPowerKw.step = '0.1';
      maxPowerKw.placeholder = 'maxPowerKw';
      maxPowerKw.value = numOrEmpty(g && g.maxPowerKw);
      maxPowerKw.addEventListener('change', () => {
        const n = Number(maxPowerKw.value);
        sc.stationGroups[idx] = sc.stationGroups[idx] || {};
        sc.stationGroups[idx].maxPowerKw = Number.isFinite(n) ? n : 0;
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Entfernen';
      del.addEventListener('click', () => {
        sc.stationGroups.splice(idx, 1);
        buildStationGroupsUI();
      });

      right.appendChild(stationKey);
      right.appendChild(name);
      right.appendChild(maxPowerKw);
      right.appendChild(del);

      row.appendChild(left);
      row.appendChild(right);

      els.stationGroups.appendChild(row);
    });
  }

  function collectSettingsConfigFromUI() {
    const out = deepMerge({}, (currentConfig && currentConfig.settingsConfig) ? currentConfig.settingsConfig : {});
    const count = _clampInt(els.evcsCount ? els.evcsCount.value : out.evcsCount, 1, 50, 1);
    out.evcsCount = count;

    if (els.evcsMaxPowerKw) {
      const kw = Number(els.evcsMaxPowerKw.value);
      out.evcsMaxPowerKw = Number.isFinite(kw) ? kw : (Number.isFinite(Number(out.evcsMaxPowerKw)) ? Number(out.evcsMaxPowerKw) : 11);
    }

    // evcsList is maintained live via _updateEvcsField. Still ensure correct length.
    out.evcsList = _ensureEvcsList(count);

    // stationGroups maintained live
    out.stationGroups = Array.isArray(_ensureSettingsConfig().stationGroups) ? _ensureSettingsConfig().stationGroups : [];
    return out;
  }

  
  function applyConfigToUI(cfg) {
    currentConfig = cfg || {};

    // Apps
    setAppsFromConfig(currentConfig);

    // Plant params
    els.gridConnectionPower.value = numOrEmpty(currentConfig.installerConfig && currentConfig.installerConfig.gridConnectionPower);
    els.schedulerIntervalMs.value = numOrEmpty(currentConfig.schedulerIntervalMs);

    const dps = currentConfig.datapoints || {};
    if (els.gridPointPowerId) els.gridPointPowerId.value = valueOrEmpty(dps.gridPointPower);

    // Show current NVP mapping clearly (hint line)
    if (els.gridPointPowerIdDisplay) {
      const v = String((dps.gridPointPower || '')).trim();
      els.gridPointPowerIdDisplay.textContent = v ? ('Aktuell: ' + v) : 'Aktuell: nicht gesetzt';
    }

    // Energiefluss-Monitor (Tab: Basis + optionale Verbraucher/Erzeuger)
    if (els.dpFlow) {
      buildDpTable(
        els.dpFlow,
        FLOW_BASE_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        {
          idPrefix: 'flow_',
          afterRow: (field, _row, container) => {
            if (field && field.key === 'pvPower') {
              // Optional: rename PV main node (PV 1) for clarity
              container.appendChild(buildFlowPvNameRow());
            }
          }
        }
      );


      // Hinweis: Minimal erforderlich sind nur Netz Bezug + Netz Einspeisung.
      // PV/Verbrauch/Batterie können automatisch abgeleitet werden (Override möglich).
      try {
        const info = document.createElement('div');
        info.className = 'nw-config-empty';
        info.style.margin = '0 0 6px 0';
        info.textContent = 'Minimal erforderlich: Netz Bezug + Netz Einspeisung. PV/Verbrauch/Batterie werden automatisch abgeleitet, wenn leer (Override möglich).';
        els.dpFlow.prepend(info);
      } catch (_e) {}
    }

    // Optionale Verbraucher/Erzeuger (max. 10/10) + Namen
    buildFlowSlotsUI('consumers', FLOW_CONSUMER_SLOT_COUNT);
    buildFlowSlotsUI('producers', FLOW_PRODUCER_SLOT_COUNT);

    // Thermik (Wärmepumpe/Heizung/Klima) – nutzt Verbraucher‑Slots
    try { buildThermalUI(); } catch (_e) {}

    // BHKW (Start/Stop, SoC-geführt)
    try { buildBhkwUI(); } catch (_e) {}

    // Generator (Notstrom/Netzparallelbetrieb, SoC-geführt)
    try { buildGeneratorUI(); } catch (_e) {}

    // §14a (Netzsteuerung)
    try { buildPara14aUI(); } catch (_e) {}

    // Tarife
    if (els.dpTariffs) {
      buildDpTable(
        els.dpTariffs,
        TARIFF_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'tar_' }
      );
    }

    // Live-Kacheln
    if (els.dpLive) {
      buildDpTable(
        els.dpLive,
        LIVE_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'live_' }
      );
    }

    // Wetter (optional)
    if (els.dpWeather) {
      buildDpTable(
        els.dpWeather,
        WEATHER_DP_FIELDS,
        (key) => dps[key],
        (key, val) => {
          currentConfig.datapoints = currentConfig.datapoints || {};
          currentConfig.datapoints[key] = val;
        },
        { idPrefix: 'wth_' }
      );
    }

    // Energiefluss-Optionen (wie bisherige Instanzeinstellungen)
    const st = (currentConfig && currentConfig.settings && typeof currentConfig.settings === 'object') ? currentConfig.settings : {};
    if (els.flowSubtractEvFromBuilding) els.flowSubtractEvFromBuilding.checked = (st.flowSubtractEvFromBuilding !== undefined) ? !!st.flowSubtractEvFromBuilding : true;
    if (els.flowInvertGrid) els.flowInvertGrid.checked = !!st.flowInvertGrid;
    if (els.gridInvertGrid) els.gridInvertGrid.checked = !!st.flowInvertGrid;
    if (els.flowInvertBattery) els.flowInvertBattery.checked = !!st.flowInvertBattery;
    if (els.flowInvertPv) els.flowInvertPv.checked = !!st.flowInvertPv;
    if (els.flowInvertEv) els.flowInvertEv.checked = !!st.flowInvertEv;
    if (els.flowGridShowNet) els.flowGridShowNet.checked = (st.flowGridShowNet !== undefined) ? !!st.flowGridShowNet : true;

    // Einheit pro Leistungs-Datenpunkt (W/kW) – alle vorhandenen Toggles syncen
    try {
      document.querySelectorAll('input[data-flow-power-unit-key]').forEach((cb) => {
        const k = cb.getAttribute('data-flow-power-unit-key');
        if (!k) return;
        cb.checked = _getFlowPowerDpIsW(k);
      });
    } catch (_e) {}

    // Storage
    const mode = (currentConfig.storage && typeof currentConfig.storage.controlMode === 'string') ? currentConfig.storage.controlMode : 'targetPower';
    els.storageControlMode.value = (['targetPower','limits','enableFlags'].includes(mode)) ? mode : 'targetPower';

    // Optional: Kapazität (kWh) – relevant für PV‑Forecast / Tarif‑Netzladeentscheidungen
    if (els.storageCapacityKWh) {
      const cap = Number(currentConfig.storage && currentConfig.storage.capacityKWh);
      els.storageCapacityKWh.value = (Number.isFinite(cap) && cap > 0) ? String(cap) : '';
    }
    rebuildStorageTable();
    try { buildStorageFarmUI(); } catch (_e) {}
    try { buildStorageMultiUseUI(); } catch (_e) {}

    // EVCS / Station config
    try { buildEvcsUI(); } catch (_e) {}
    try { buildStationGroupsUI(); } catch (_e) {}

    // Ziel‑Strategie (Zeit‑Ziel Laden)
    if (els.cmGoalStrategy) {
      const cm = (currentConfig && currentConfig.chargingManagement && typeof currentConfig.chargingManagement === 'object')
        ? currentConfig.chargingManagement
        : {};
      const gs = String(cm.goalStrategy || 'standard').trim().toLowerCase();
      els.cmGoalStrategy.value = (gs === 'smart') ? 'smart' : 'standard';
    }

    // Schwellwertsteuerung / Relais
    try { buildThresholdUI(); } catch (_e) {}
    try { buildRelayUI(); } catch (_e) {}
    try { buildGridConstraintsUI(); } catch (_e) {}
  }


  // -------------------------------------------------------------------------
  // OCPP Auto-Discovery (Installer → Ladepunkte)
  // - on demand scan of ioBroker OCPP adapter states
  // - proposes mapping for EVCS list (power/status/setpoints/online)
  // -------------------------------------------------------------------------

  async function fetchOcppDiscovery() {
    const data = await fetchJson('/api/ocpp/discover');
    const connectors = Array.isArray(data.connectors) ? data.connectors : [];
    return { meta: data, connectors };
  }

  function _applyOcppConnectorToRow(row, c, opts) {
    const r = (row && typeof row === 'object') ? row : {};
    const ids = (c && c.ids && typeof c.ids === 'object') ? c.ids : {};
    const out = Object.assign({}, r);

    const overwrite = !!(opts && opts.overwrite);
    const onlyEmpty = !!(opts && opts.onlyEmpty);

    const setField = (k, v) => {
      const val = (v === null || v === undefined) ? '' : String(v);
      const cur = (out[k] === null || out[k] === undefined) ? '' : String(out[k]);
      if (overwrite) {
        out[k] = val;
      } else if (onlyEmpty) {
        if (!cur.trim()) out[k] = val;
      }
    };

    // Meta
    if (c && typeof c.stationKey === 'string') {
      if (overwrite || onlyEmpty) setField('stationKey', c.stationKey);
    }
    if (c && c.connectorNo !== undefined && c.connectorNo !== null) {
      const n = Number(c.connectorNo);
      if (Number.isFinite(n)) {
        const cur = Number(out.connectorNo);
        if (overwrite) out.connectorNo = Math.max(0, Math.round(n));
        else if (onlyEmpty && (!Number.isFinite(cur) || cur === 0)) out.connectorNo = Math.max(0, Math.round(n));
      }
    }
    if (c && typeof c.name === 'string') {
      const curName = String(out.name || '').trim();
      const isDefault = /^ladepunkt\s+\d+$/i.test(curName);
      if (overwrite || (onlyEmpty && (!curName || isDefault))) out.name = c.name;
    }

    // Mappings (fill)
    for (const k of ['powerId','energyTotalId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId']) {
      if (ids[k]) setField(k, ids[k]);
    }

    // Defaults
    if (overwrite || onlyEmpty) {
      if (out.enabled === undefined) out.enabled = true;
      if (!out.chargerType) out.chargerType = 'ac';
    }

    return out;
  }

  async function ocppAutoDetect() {
    try {
      setStatus('OCPP: Suche nach Ladepunkten…');
      const { connectors } = await fetchOcppDiscovery();

      if (!connectors.length) {
        setStatus('OCPP: Keine Ladepunkte gefunden (prüfe ob OCPP-Adapter läuft und Chargepoints angemeldet sind).', 'error');
        return;
      }

      const sc = _ensureSettingsConfig();
      const existingList = Array.isArray(sc.evcsList) ? sc.evcsList : [];
      const hasExisting = existingList.some(r => r && (
        String(r.powerId || '').trim() ||
        String(r.setCurrentAId || '').trim() ||
        String(r.setPowerWId || '').trim() ||
        String(r.statusId || '').trim()
      ));

      if (hasExisting) {
        const ok = window.confirm('Es sind bereits Ladepunkte konfiguriert.\n\nSoll die OCPP-Erkennung die aktuelle Konfiguration überschreiben?');
        if (!ok) {
          setStatus('OCPP: Abgebrochen.', 'ok');
          return;
        }
      }

      const count = Math.max(1, Math.min(50, connectors.length));
      sc.evcsCount = count;
      sc.evcsList = [];

      for (let i = 0; i < count; i++) {
        const c = connectors[i];
        sc.evcsList[i] = _applyOcppConnectorToRow({}, c, { overwrite: true });
      }

      // Rebuild UI
      if (els.evcsCount) els.evcsCount.value = String(count);
      buildEvcsUI();
      try { buildStationGroupsUI(); } catch (_e) {}
      scheduleValidation(300);

      setStatus(`OCPP: ${count} Ladepunkte erkannt und vorbelegt. Bitte „Speichern & EMS neu starten“ klicken.`, 'ok');
    } catch (e) {
      setStatus('OCPP: Erkennung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  async function ocppMapExisting() {
    try {
      setStatus('OCPP: Suche Datenpunkte…');
      const { connectors } = await fetchOcppDiscovery();

      if (!connectors.length) {
        setStatus('OCPP: Keine Ladepunkte gefunden.', 'error');
        return;
      }

      const sc = _ensureSettingsConfig();
      const currentCount = _clampInt(sc.evcsCount, 1, 50, 1);

      if (connectors.length > currentCount) {
        const ok = window.confirm(`OCPP hat ${connectors.length} Ladepunkte erkannt, konfiguriert sind aktuell ${currentCount}.\n\nSoll die Anzahl automatisch auf ${Math.min(50, connectors.length)} erhöht werden?`);
        if (ok) {
          sc.evcsCount = Math.min(50, connectors.length);
          if (els.evcsCount) els.evcsCount.value = String(sc.evcsCount);
        }
      }

      const count = _clampInt(sc.evcsCount, 1, 50, 1);
      const list = _ensureEvcsList(count);

      for (let i = 0; i < count && i < connectors.length; i++) {
        list[i] = _applyOcppConnectorToRow(list[i], connectors[i], { onlyEmpty: true });
      }
      sc.evcsList = list;

      buildEvcsUI();
      scheduleValidation(300);
      setStatus('OCPP: Datenpunkte wurden (nur leere Felder) automatisch zugeordnet. Bitte speichern.', 'ok');
    } catch (e) {
      setStatus('OCPP: Zuordnung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  // ------------------------------
  // Schnell‑Inbetriebnahme: Geräteadapter (nexowatt-devices)
  // ------------------------------

  function _nwNormCat(v) {
    return String(v || '').trim().toUpperCase();
  }
  function _isNwEvcsCategory(cat) {
    const c = _nwNormCat(cat);
    return (c === 'EVCS' || c === 'CHARGER' || c === 'DC_CHARGER' || c === 'EVSE');
  }
  function _isNwPvInverterCategory(cat) {
    return _nwNormCat(cat) === 'PV_INVERTER';
  }
  function _isNwHeatCategory(cat) {
    return _nwNormCat(cat) === 'HEAT';
  }

  function _nwGetAlias(dev, key) {
    const a = dev && dev.aliases && typeof dev.aliases === 'object' ? dev.aliases : null;
    const dp = dev && dev.dp && typeof dev.dp === 'object' ? dev.dp : null;
    const v = (dp && dp[key]) ? String(dp[key]).trim() : '';
    if (v) return v;
    const v2 = (a && a[key]) ? String(a[key]).trim() : '';
    return v2;
  }

  function _nwGetDpFallback(dev, suffix) {
    const base = String((dev && dev.baseId) || '').trim();
    if (!base || !suffix) return '';
    return base + '.' + suffix;
  }

  function _applyNwDeviceToEvcsRow(row, dev, opts) {
    const onlyEmpty = !!(opts && opts.onlyEmpty);
    const out = (row && typeof row === 'object') ? { ...row } : {};

    const setIf = (k, v) => {
      const val = String(v || '').trim();
      if (!val) return;
      if (onlyEmpty) {
        if (String(out[k] || '').trim()) return;
      }
      out[k] = val;
    };

    // Metadata
    setIf('name', dev && dev.name ? dev.name : '');
    if (onlyEmpty && out.enabled === undefined) out.enabled = true;

    const cat = _nwNormCat(dev && dev.category);
    if (cat === 'DC_CHARGER') setIf('chargerType', 'dc');
    else setIf('chargerType', 'ac');

    // Datapoints (prefer aliases)
    setIf('powerId', _nwGetAlias(dev, 'r.power'));
    setIf('energyTotalId', _nwGetAlias(dev, 'r.energyTotal'));
    setIf('statusId', _nwGetAlias(dev, 'r.statusCode'));
    setIf('onlineId', _nwGetAlias(dev, 'comm.connected'));

    // Control (optional)
    setIf('setCurrentAId', _nwGetAlias(dev, 'ctrl.currentLimitA'));
    setIf('setPowerWId', _nwGetAlias(dev, 'ctrl.powerLimitW'));
    setIf('enableWriteId', _nwGetAlias(dev, 'ctrl.run'));

    // Some devices expose "active" as status; we keep it optional
    // setIf('activeId', _nwGetAlias(dev, 'r.active'));

    return out;
  }

  function _classifyHeatDevice(dev) {
    const name = String((dev && dev.name) || '').toLowerCase();
    const tpl = String((dev && dev.templateId) || '').toLowerCase();

    const isWp = /\bwp\b|\bhp\b|wärmepumpe|waermepumpe|heatpump/.test(name) || /waermepumpe|heatpump/.test(tpl);
    const isRod = /heizstab|heaterrod|\brod\b|acthor|askoma/.test(name) || /heizstab|heaterrod|rod|acthor|askoma/.test(tpl);

    if (isWp && !isRod) return { type: 'heatPump', icon: '♨️', thermalType: 'setpoint' };
    if (isRod && !isWp) return { type: 'heatingRod', icon: '🔥', thermalType: 'power' };

    // default: generic heat consumer
    return { type: 'custom', icon: '♨️', thermalType: 'power' };
  }

  function _findFreeConsumerSlot(range) {
    const dps = (currentConfig && currentConfig.datapoints && typeof currentConfig.datapoints === 'object') ? currentConfig.datapoints : {};
    const from = (range && range.from) ? range.from : 1;
    const to = (range && range.to) ? range.to : FLOW_CONSUMER_SLOT_COUNT;
    for (let i = from; i <= to; i++) {
      const key = `consumer${i}Power`;
      if (!String(dps[key] || '').trim()) return i;
    }
    return 0;
  }

  async function nwDevicesQuickSetup() {
    try {
      setStatus('Schnell‑Inbetriebnahme: Suche Geräte…');

      const data = await fetchJson('/api/nwdevices/discover');
      if (!data || data.ok !== true) throw new Error((data && data.error) ? data.error : 'discover failed');

      const devices = Array.isArray(data.devices) ? data.devices : [];
      if (!devices.length) {
        setStatus('Schnell‑Inbetriebnahme: Keine Geräte unter nexowatt-devices.* gefunden.', 'error');
        return;
      }

      const evcsDevs = devices.filter(d => _isNwEvcsCategory(d && d.category));
      const pvDevs = devices.filter(d => _isNwPvInverterCategory(d && d.category));
      const heatDevs = devices.filter(d => _isNwHeatCategory(d && d.category));

      let changed = false;

      // --- 1) Ladepunkte (EVCS) ---
      let evcsMapped = 0;
      if (evcsDevs.length) {
        const sc = _ensureSettingsConfig();
        const curCount = _clampInt(sc.evcsCount, 1, 50, 1);
        const wantCount = _clampInt(Math.max(curCount, evcsDevs.length), 1, 50, curCount);
        if (wantCount !== curCount) {
          sc.evcsCount = wantCount;
          changed = true;
        }
        const list = _ensureEvcsList(sc);

        for (let i = 0; i < evcsDevs.length && i < list.length; i++) {
          const before = JSON.stringify(list[i] || {});
          list[i] = _applyNwDeviceToEvcsRow(list[i], evcsDevs[i], { onlyEmpty: true });
          if (JSON.stringify(list[i] || {}) !== before) {
            evcsMapped++;
            changed = true;
          }
        }
      }

      // --- 2) PV‑Regelung: Wechselrichter (0‑Einspeisung Gruppe) ---
      let pvAdded = 0;
      let pvUpdated = 0;
      if (pvDevs.length) {
        const gc = _ensureGridConstraintsCfg();
        gc.pvCurtailInvertersZero = Array.isArray(gc.pvCurtailInvertersZero) ? gc.pvCurtailInvertersZero : [];
        const list = gc.pvCurtailInvertersZero;

        const addOrUpdate = (dev) => {
          const name = String((dev && dev.name) || '').trim() || String((dev && dev.devId) || '').trim() || 'WR';
          const feedInLimitWId = _nwGetAlias(dev, 'ctrl.feedInLimitW') || '';
          const pvLimitWId = _nwGetAlias(dev, 'ctrl.powerLimitW') || '';
          const pvLimitPctId = _nwGetAlias(dev, 'ctrl.powerLimitPct') || _nwGetAlias(dev, 'ctrlPvLimitPct') || '';
          const pvPowerReadId = _nwGetAlias(dev, 'r.pvPower') || _nwGetAlias(dev, 'r.power') || _nwGetAlias(dev, 'r.activePower') || (dev && dev.dp && dev.dp.powerW ? String(dev.dp.powerW).trim() : '') || '';

          if (!feedInLimitWId && !pvLimitWId && !pvLimitPctId) return;

          const match = list.find(it => {
            if (!it || typeof it !== 'object') return false;
            if (pvLimitPctId && String(it.pvLimitPctId || '').trim() === pvLimitPctId) return true;
            if (pvLimitWId && String(it.pvLimitWId || '').trim() === pvLimitWId) return true;
            if (feedInLimitWId && String(it.feedInLimitWId || '').trim() === feedInLimitWId) return true;
            // fallback: same baseId (rare) or same name
            if (String(it.name || '').trim() && String(it.name || '').trim() === name) return true;
            return false;
          });

          if (match) {
            const before = JSON.stringify(match);
            if (!String(match.name || '').trim()) match.name = name;
            if (match.kwp === undefined || match.kwp === null) match.kwp = '';
            if (!String(match.feedInLimitWId || '').trim() && feedInLimitWId) match.feedInLimitWId = feedInLimitWId;
            if (!String(match.pvLimitWId || '').trim() && pvLimitWId) match.pvLimitWId = pvLimitWId;
            if (!String(match.pvLimitPctId || '').trim() && pvLimitPctId) match.pvLimitPctId = pvLimitPctId;
            if (!String(match.pvPowerReadId || '').trim() && pvPowerReadId) match.pvPowerReadId = pvPowerReadId;

            if (JSON.stringify(match) !== before) {
              pvUpdated++;
              changed = true;
            }
          } else {
            list.push({
              name,
              kwp: '',
              feedInLimitWId,
              pvLimitWId,
              pvLimitPctId,
              pvPowerReadId
            });
            pvAdded++;
            changed = true;
          }
        };

        pvDevs.forEach(addOrUpdate);
      }

      // --- 3) Thermik + Energiefluss‑Verbraucher‑Slots (Wärmepumpen / Heizstäbe) ---
      let heatSlotsMapped = 0;
      let heatPara14aAdded = 0;
      let heatPara14aUpdated = 0;

      if (heatDevs.length) {
        currentConfig.datapoints = (currentConfig.datapoints && typeof currentConfig.datapoints === 'object') ? currentConfig.datapoints : {};
        const dps = currentConfig.datapoints;
        const fs = _ensureFlowSlots();

        const tcfg = _ensureThermalCfg();
        const icfg = _ensurePara14aCfg();
        icfg.para14aConsumers = Array.isArray(icfg.para14aConsumers) ? icfg.para14aConsumers : [];

        // helper for para14a
        const findPara14aMatch = (dev, setId, enableId) => {
          const name = String((dev && dev.name) || '').trim();
          const key = String((dev && dev.devId) || '').trim();
          return (icfg.para14aConsumers || []).find(r => {
            if (!r || typeof r !== 'object') return false;
            if (setId && String(r.setPowerWId || r.setWId || '').trim() === setId) return true;
            if (enableId && String(r.enableId || r.enableWriteId || '').trim() === enableId) return true;
            if (key && String(r.key || '').trim() === key) return true;
            if (name && String(r.name || '').trim() === name) return true;
            return false;
          });
        };

        for (const dev of heatDevs) {
          const powerId = _nwGetAlias(dev, 'r.power') || (dev && dev.dp && dev.dp.powerW) || _nwGetDpFallback(dev, 'aCTIVE_POWER');
          if (!String(powerId || '').trim()) continue;

          // Find free slot (prefer first 8, so Thermik slots stay aligned)
          let slot = _findFreeConsumerSlot({ from: 1, to: 8 });
          if (!slot) slot = _findFreeConsumerSlot({ from: 9, to: FLOW_CONSUMER_SLOT_COUNT });
          if (!slot) break;

          const dpKey = `consumer${slot}Power`;
          dps[dpKey] = powerId;

          // Slot meta
          const c = _classifyHeatDevice(dev);
          fs.consumers[slot - 1] = fs.consumers[slot - 1] || { name: '', icon: '', ctrl: {} };
          fs.consumers[slot - 1].name = String((dev && dev.name) || '').trim() || fs.consumers[slot - 1].name;
          fs.consumers[slot - 1].icon = c.icon;

          // Optional control aliases (will be filled automatically once your adapter provides them)
          const ctrlRun = _nwGetAlias(dev, 'ctrl.run') || (dev && dev.dp && dev.dp.ctrlRun) || '';
          const ctrlLimitW = _nwGetAlias(dev, 'ctrl.powerLimitW') || (dev && dev.dp && dev.dp.ctrlPowerLimitW) || '';
          if (ctrlRun) {
            fs.consumers[slot - 1].ctrl = fs.consumers[slot - 1].ctrl || {};
            if (!String(fs.consumers[slot - 1].ctrl.switchWriteId || '').trim()) fs.consumers[slot - 1].ctrl.switchWriteId = ctrlRun;
            if (!String(fs.consumers[slot - 1].ctrl.switchReadId || '').trim()) fs.consumers[slot - 1].ctrl.switchReadId = ctrlRun;
          }
          if (ctrlLimitW) {
            fs.consumers[slot - 1].ctrl = fs.consumers[slot - 1].ctrl || {};
            if (!String(fs.consumers[slot - 1].ctrl.setpointWriteId || '').trim()) fs.consumers[slot - 1].ctrl.setpointWriteId = ctrlLimitW;
            if (!String(fs.consumers[slot - 1].ctrl.setpointReadId || '').trim()) fs.consumers[slot - 1].ctrl.setpointReadId = ctrlLimitW;
            if (!String(fs.consumers[slot - 1].ctrl.setpointUnit || '').trim()) fs.consumers[slot - 1].ctrl.setpointUnit = 'W';
            if (!String(fs.consumers[slot - 1].ctrl.setpointLabel || '').trim()) fs.consumers[slot - 1].ctrl.setpointLabel = 'Sollwert (W)';
          }

          // Thermik slot (aligned for slots 1..8)
          if (slot >= 1 && slot <= 8) {
            const td = tcfg.devices[slot - 1] || {};
            if (!String(td.name || '').trim()) td.name = String((dev && dev.name) || '').trim();
            if (!String(td.type || '').trim()) td.type = c.thermalType;
            if (td.enabled === undefined) td.enabled = true;
            tcfg.devices[slot - 1] = td;
          }

          // §14a Verbraucher (nur anlegen/ergänzen; ohne Schreib-IDs bleibt es automatisch inaktiv)
          const setWId = ctrlLimitW;
          const enableId = ctrlRun;

          const existing = findPara14aMatch(dev, setWId, enableId);
          if (existing) {
            const before = JSON.stringify(existing);
            if (!String(existing.name || '').trim()) existing.name = String((dev && dev.name) || '').trim();
            if (!String(existing.type || '').trim()) existing.type = c.type;
            if (!String(existing.controlType || '').trim()) existing.controlType = setWId ? 'limitW' : 'onOff';
            if (!String(existing.setPowerWId || existing.setWId || '').trim() && setWId) existing.setPowerWId = setWId;
            if (!String(existing.enableId || existing.enableWriteId || '').trim() && enableId) existing.enableId = enableId;
            if (!String(existing.key || '').trim() && String((dev && dev.devId) || '').trim()) existing.key = String(dev.devId).trim();
            if (existing.enabled === undefined) existing.enabled = !!(setWId || enableId);

            if (JSON.stringify(existing) !== before) {
              heatPara14aUpdated++;
              changed = true;
            }
          } else {
            icfg.para14aConsumers.push({
              enabled: !!(setWId || enableId),
              key: String((dev && dev.devId) || '').trim(),
              name: String((dev && dev.name) || '').trim(),
              type: c.type,
              controlType: setWId ? 'limitW' : 'onOff',
              maxPowerW: 0,
              installedPowerW: 0,
              priority: 100,
              setPowerWId: setWId,
              enableId
            });
            heatPara14aAdded++;
            changed = true;
          }

          heatSlotsMapped++;
          changed = true;
        }
      }

      // UI refresh (targeted)
      try { buildEvcsUI(); } catch (_e) {}
      try { buildGridConstraintsUI(); } catch (_e) {}
      try { buildFlowSlotsUI('consumers', FLOW_CONSUMER_SLOT_COUNT); } catch (_e) {}
      try { buildThermalUI(); } catch (_e) {}
      try { buildPara14aUI(); } catch (_e) {}
      scheduleValidation(250);

      const msgParts = [];
      msgParts.push(`Geräte gefunden: ${devices.length}`);
      if (evcsDevs.length) msgParts.push(`Ladepunkte: ${evcsDevs.length} (zugeordnet: ${evcsMapped})`);
      if (pvDevs.length) msgParts.push(`Wechselrichter: ${pvDevs.length} (+${pvAdded}/${pvUpdated})`);
      if (heatDevs.length) msgParts.push(`Thermik: ${heatDevs.length} (Slots: ${heatSlotsMapped}, §14a: +${heatPara14aAdded}/${heatPara14aUpdated})`);

      if (!changed) {
        setStatus('Schnell‑Inbetriebnahme: keine Änderungen (alles bereits belegt).', 'ok');
      } else {
        setStatus('Schnell‑Inbetriebnahme abgeschlossen. Bitte prüfen und speichern. • ' + msgParts.join(' • '), 'ok');
      }
    } catch (e) {
      setStatus('Schnell‑Inbetriebnahme fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }




  async function loadConfig() {
    setStatus('Lade Konfiguration…');
    const data = await fetchJson('/api/installer/config');
    applyConfigToUI(data.config || {});
    scheduleValidation(300);
    setStatus('Konfiguration geladen.', 'ok');
  }

  
  function collectPatchFromUI() {
    const patch = {};

    // Apps
    patch.emsApps = deepMerge({}, (currentConfig && currentConfig.emsApps) ? currentConfig.emsApps : {});
    patch.emsApps.apps = (patch.emsApps.apps && typeof patch.emsApps.apps === 'object') ? patch.emsApps.apps : {};
    for (const app of APP_CATALOG) {
      const i1 = document.getElementById(`app_${app.id}_installed`);
      const i2 = document.getElementById(`app_${app.id}_enabled`);
      const installed = app.mandatory ? true : !!(i1 && i1.checked);
      const enabled = app.mandatory ? true : !!(i2 && i2.checked);
      patch.emsApps.apps[app.id] = { installed, enabled };
    }

    // Scheduler
    const sched = Number(els.schedulerIntervalMs.value);
    if (Number.isFinite(sched) && sched >= 250) patch.schedulerIntervalMs = Math.round(sched);

    // Plant
    const gcp = Number(els.gridConnectionPower.value);
    patch.installerConfig = patch.installerConfig || {};
    if (Number.isFinite(gcp) && gcp >= 0) patch.installerConfig.gridConnectionPower = Math.round(gcp);


    // §14a (Netzsteuerung)
    try {
      const ic = _ensurePara14aCfg();
      patch.installerConfig.para14aMode = String(ic.para14aMode || 'ems');
      patch.installerConfig.para14aMinPerDeviceW = Math.round(Number(ic.para14aMinPerDeviceW) || 0);
      patch.installerConfig.para14aActiveId = String(ic.para14aActiveId || '').trim();
      patch.installerConfig.para14aEmsSetpointWId = String(ic.para14aEmsSetpointWId || '').trim();
      patch.installerConfig.para14aConsumers = deepMerge([], Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : []);
    } catch (_e) {
      // ignore
    }

    // Datapoints (inkl. Energiefluss-Monitor)
    patch.datapoints = Object.assign({}, currentConfig.datapoints || {});

    // Migrations-/Kompatibilitäts-Glättung:
    // älteres Setup nutzte 'consumptionHeating' für Heizung. Wenn consumer1Power gesetzt ist,
    // bevorzugen wir den Slot und leeren das Legacy-Feld, damit keine doppelte Logik entsteht.
    const c1 = String(patch.datapoints.consumer1Power || '').trim();
    if (c1) patch.datapoints.consumptionHeating = '';

    // Netzpunkt (NVP): globaler Netto-Netzleistungs-DP (Import+ / Export-)
    if (els.gridPointPowerId) patch.datapoints.gridPointPower = String(els.gridPointPowerId.value || '').trim();

    // EVCS / Stations (stored in settingsConfig)
    try {
      patch.settingsConfig = collectSettingsConfigFromUI();
    } catch (_e) {
      patch.settingsConfig = deepMerge({}, currentConfig.settingsConfig || {});
    }

    // Lademanagement (Algorithmen / Ziel‑Strategie)
    patch.chargingManagement = deepMerge({}, currentConfig.chargingManagement || {});

    // Energiefluss-Optionen (wie bisherige Instanzeinstellungen)
    patch.settings = deepMerge({}, (currentConfig && currentConfig.settings) ? currentConfig.settings : {});
    if (els.flowSubtractEvFromBuilding) patch.settings.flowSubtractEvFromBuilding = !!els.flowSubtractEvFromBuilding.checked;
    if (els.flowInvertGrid) patch.settings.flowInvertGrid = !!els.flowInvertGrid.checked;
    if (els.flowInvertBattery) patch.settings.flowInvertBattery = !!els.flowInvertBattery.checked;
    if (els.flowInvertPv) patch.settings.flowInvertPv = !!els.flowInvertPv.checked;
    if (els.flowInvertEv) patch.settings.flowInvertEv = !!els.flowInvertEv.checked;
    if (els.flowGridShowNet) patch.settings.flowGridShowNet = !!els.flowGridShowNet.checked;

    // Energiefluss: Leistungseinheiten pro DP (W vs kW)
    // Checkbox aktiv = DP liefert Watt (W).
    // Checkbox aus  = DP liefert kW (1 = 1 kW).
    const flowPowerDpIsW = {};
    document.querySelectorAll('input[data-flow-power-unit-key]').forEach((cb) => {
      const k = cb.getAttribute('data-flow-power-unit-key');
      if (!k) return;
      flowPowerDpIsW[k] = !!cb.checked;
    });
    patch.settings.flowPowerDpIsW = flowPowerDpIsW;
    // Legacy global Schalter deaktivieren (wird nicht mehr genutzt)
    patch.settings.flowPowerInputIsW = null;

    // VIS-Konfiguration (z.B. Namen/Slots für den Energiefluss-Monitor)
    patch.vis = deepMerge({}, (currentConfig && currentConfig.vis) ? currentConfig.vis : {});
    try {
      const fs = _ensureFlowSlots();
      patch.vis.flowSlots = deepMerge({}, fs);
    } catch (_e) {
      // ignore
    }

    // Thermik (PV‑Auto für Verbraucher‑Slots)
    patch.thermal = deepMerge({}, currentConfig.thermal || {});
    patch.bhkw = deepMerge({}, currentConfig.bhkw || {});
    patch.generator = deepMerge({}, currentConfig.generator || {});

    // Schwellwertsteuerung
    patch.threshold = deepMerge({}, currentConfig.threshold || {});

    // Relaissteuerung
    patch.relay = deepMerge({}, currentConfig.relay || {});

    // Grid-Constraints
    patch.gridConstraints = deepMerge({}, currentConfig.gridConstraints || {});

    // PeakShaving: bleibt in der Konfiguration erhalten (kein separater Netz-DP mehr nötig im UI)
    patch.peakShaving = deepMerge({}, currentConfig.peakShaving || {});

    // Speicherfarm
    patch.storageFarm = deepMerge({}, currentConfig.storageFarm || {});

    // Storage
    patch.storage = deepMerge({}, currentConfig.storage || {});
    patch.storage.controlMode = getStorageMode();
    patch.storage.datapoints = deepMerge({}, (currentConfig.storage && currentConfig.storage.datapoints) ? currentConfig.storage.datapoints : {});

    // Optional raw patch
    const raw = String(els.rawPatch.value || '').trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return deepMerge(patch, parsed);
        }
      } catch (e) {
        // ignore invalid JSON
      }
    }

    // Keep installerConfig as single source of truth for installer-only features
    patch.installerConfig = deepMerge({}, (currentConfig && currentConfig.installerConfig) ? currentConfig.installerConfig : {}, patch.installerConfig || {});

    return patch;
  }

  async function saveConfig() {
    setStatus('Speichere…');
    const patch = collectPatchFromUI();
    const payload = { patch, restartEms: true };
    const data = await fetchJson('/api/installer/config', { method: 'POST', body: JSON.stringify(payload) });
    applyConfigToUI(data.config || {});
    setStatus('Gespeichert. EMS wurde neu gestartet.', 'ok');
  }

  // --- Tabs + Status polling (Phase 2) ---

  let _activeTab = 'apps';
  let _statusTimer = null;

  function _showTab(tabId) {
    _activeTab = tabId || 'apps';
    const btns = els.tabs ? Array.from(els.tabs.querySelectorAll('.nw-tab')) : [];
    btns.forEach(b => {
      const isActive = (b.getAttribute('data-tab') === _activeTab);
      b.classList.toggle('nw-tab--active', isActive);
    });

    const panels = Array.from(document.querySelectorAll('[data-tabpanel]'));
    panels.forEach(p => {
      const id = p.getAttribute('data-tabpanel');
      p.style.display = (id === _activeTab) ? '' : 'none';
    });

    // immediate status refresh when entering the tab
    if (_activeTab === 'status') {
      refreshEmsStatus().catch(() => {});
      refreshChargingDiag().catch(() => {});
    }
  }

  function initTabs() {
    if (!els.tabs) return;
    const btns = Array.from(els.tabs.querySelectorAll('.nw-tab'));
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab') || 'apps';
        _showTab(tabId);
      });
    });
    _showTab('apps');
  }

  // Unter-Reiter im Energiefluss-Tab (Basis/Verbraucher/Erzeuger/Optionen)
  function initFlowSubtabs() {
    const wrap = document.getElementById('nw-flow-subtabs');
    if (!wrap) return;

    const btns = Array.from(wrap.querySelectorAll('.nw-tab'));
    const panels = Array.from(document.querySelectorAll('#nw-tabpanel-flow [data-flowpanel]'));

    const show = (id) => {
      const tid = String(id || 'base');
      btns.forEach(b => {
        b.classList.toggle('nw-tab--active', (b.getAttribute('data-flowtab') === tid));
      });
      panels.forEach(p => {
        const pid = p.getAttribute('data-flowpanel');
        p.style.display = (pid === tid) ? '' : 'none';
      });
    };

    btns.forEach(b => {
      b.addEventListener('click', () => {
        show(b.getAttribute('data-flowtab') || 'base');
      });
    });

    show('base');
  }

  function _fmtTs(ts) {
    try {
      const d = new Date(ts);
      if (Number.isFinite(d.getTime())) return d.toLocaleString();
    } catch (_e) {}
    return '';
  }

  function renderEmsStatus(payload) {
    if (!els.emsStatus) return;
    els.emsStatus.innerHTML = '';

    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    const engine = payload && payload.engine ? payload.engine : {};
    const mm = payload && (payload.lastTickDiag || payload.modules || payload.diagnostics) ? (payload.lastTickDiag || payload.modules || payload.diagnostics) : null;

    els.emsStatus.appendChild(
      mkItem(
        'Engine',
        engine && engine.intervalMs ? `Tick: ${engine.intervalMs} ms` : 'Tick-Intervall unbekannt',
        (engine && engine.running) ? 'RUNNING' : 'STOPPED',
        (engine && engine.running) ? 'ok' : 'error'
      )
    );

    const initError = (engine && engine.initError) ? String(engine.initError) : '';
    if (initError) {
      els.emsStatus.appendChild(mkItem('Engine-Fehler', initError, '', 'error'));
    }

    if (!mm || !Array.isArray(mm.results)) {
      els.emsStatus.appendChild(mkItem('Module', 'Keine Diagnosedaten verfügbar.', '', ''));
      return;
    }

    const head = `Letzter Tick: ${_fmtTs(mm.ts)} | Gesamt: ${mm.totalMs} ms`;
    els.emsStatus.appendChild(mkItem('Tick', head, (mm.errors && mm.errors.length) ? `${mm.errors.length} Fehler` : 'OK', (mm.errors && mm.errors.length) ? 'error' : 'ok'));

    for (const r of mm.results) {
      const ok = !!r.ok;
      const enabled = !!r.enabled;
      const ms = (typeof r.ms === 'number' && Number.isFinite(r.ms)) ? r.ms : 0;
      const right = `${enabled ? 'on' : 'off'} | ${ms} ms` + (r.error ? `<br/><span style="opacity:.85;">${String(r.error).replace(/</g,'&lt;')}</span>` : '');
      els.emsStatus.appendChild(mkItem(r.key || 'module', '', right, ok ? 'ok' : 'error'));
    }
  }


  function _asBool(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return (v.trim().toLowerCase() === 'true' || v.trim() === '1');
    return false;
  }

  function _asNum(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback !== undefined ? fallback : 0);
  }

  function renderChargingDiag(payload) {
    if (!els.chargingDiag) return;
    els.chargingDiag.innerHTML = '';

    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'warn') right.style.color = '#fde68a';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    if (!payload || payload.ok !== true) {
      els.chargingDiag.appendChild(mkItem('Ladepunkte', 'Keine Daten', '—', 'warn'));
      return;
    }

    const list = Array.isArray(payload.list) ? payload.list : [];
    if (!list.length) {
      els.chargingDiag.appendChild(mkItem('Ladepunkte', 'Keine Ladepunkte konfiguriert.', '—', 'warn'));
      return;
    }

    for (const it of list) {
      const rt = it.runtime || {};
      const enabled = _asBool(rt.enabled);
      const online = _asBool(rt.online);
      const mappingOk = _asBool(rt.mappingOk);
      const meterStale = _asBool(rt.meterStale);
      const statusStale = _asBool(rt.statusStale);

      const actualW = Math.round(_asNum(rt.actualPowerW, 0));
      const targetW = Math.round(_asNum(rt.targetPowerW, 0));
      const targetA = _asNum(rt.targetCurrentA, 0);
      const reason = (rt.reason !== null && rt.reason !== undefined) ? String(rt.reason) : '';
      const applyStatus = (rt.applyStatus !== null && rt.applyStatus !== undefined) ? String(rt.applyStatus) : '';
      const effMode = (rt.effectiveMode !== null && rt.effectiveMode !== undefined) ? String(rt.effectiveMode) : '';
      const userMode = (rt.userMode !== null && rt.userMode !== undefined) ? String(rt.userMode) : '';

      let kind = 'ok';
      if (!mappingOk) kind = 'error';
      else if (meterStale || statusStale) kind = 'warn';
      else if (!enabled || !online) kind = 'warn';

      const name = it && it.name ? String(it.name) : `Ladepunkt ${it.index}`;
      const title = `${name} (lp${it.index})`;

      const flags = [];
      flags.push(enabled ? 'EN' : 'DIS');
      flags.push(online ? 'ON' : 'OFF');
      if (meterStale) flags.push('METER:ALT');
      if (statusStale) flags.push('STATUS:ALT');
      if (effMode) flags.push(`MODE:${effMode}`);
      if (userMode && userMode !== 'auto') flags.push(`USER:${userMode}`);

      const subtitle = flags.join(' · ');

      const right = `
        <div style="font-weight:600;">Ist ${actualW} W → Ziel ${targetW} W</div>
        <div style="font-size:0.75rem;opacity:.85;">A=${Number.isFinite(targetA) ? targetA.toFixed(2) : '0.00'} · ${applyStatus || '—'} · ${reason || '—'}</div>
      `;

      els.chargingDiag.appendChild(mkItem(title, subtitle, right, kind));
    }
  }


  function _fmtW(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + ' kW';
    return Math.round(n) + ' W';
  }

  function renderStationsDiag(payload) {
    if (!els.stationsDiag) return;
    els.stationsDiag.innerHTML = '';

    const mkItem = (titleText, subtitleText, rightHtml, statusKind) => {
      const row = document.createElement('div');
      row.className = 'nw-config-row';

      const left = document.createElement('div');
      left.className = 'nw-config-row__primary';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = titleText;

      const sub = document.createElement('div');
      sub.style.fontSize = '0.75rem';
      sub.style.opacity = '0.85';
      sub.textContent = subtitleText || '';

      left.appendChild(title);
      if (subtitleText) left.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'nw-config-row__status';
      right.style.textAlign = 'right';
      if (statusKind === 'ok') right.style.color = '#6ee7b7';
      if (statusKind === 'warn') right.style.color = '#fde68a';
      if (statusKind === 'error') right.style.color = '#fca5a5';
      right.innerHTML = rightHtml || '';

      row.appendChild(left);
      row.appendChild(right);
      return row;
    };

    if (!payload || payload.ok !== true) {
      els.stationsDiag.appendChild(mkItem('Stationsgruppen', 'Keine Daten', '—', 'warn'));
      return;
    }

    const stations = Array.isArray(payload.stations) ? payload.stations : [];
    if (!stations.length) {
      els.stationsDiag.appendChild(mkItem('Stationsgruppen', 'Keine Stationsgruppen vorhanden.', '—', 'warn'));
      return;
    }

    for (const st of stations) {
      const key = (st && st.stationKey) ? String(st.stationKey) : '';
      const name = (st && st.name) ? String(st.name) : '';
      const title = name ? `${key} – ${name}` : (key || 'Station');

      const capW = st && st.maxPowerW !== null && st.maxPowerW !== undefined ? Number(st.maxPowerW) : NaN;
      const usedW = st && st.usedW !== null && st.usedW !== undefined ? Number(st.usedW) : NaN;
      const remW = st && st.remainingW !== null && st.remainingW !== undefined ? Number(st.remainingW) : NaN;
      const binding = !!(st && st.binding);
      const cnt = st && st.connectorCount !== null && st.connectorCount !== undefined ? Number(st.connectorCount) : NaN;
      const connectors = (st && st.connectors) ? String(st.connectors) : '';

      const subtitle = `Cap ${_fmtW(capW)} · Used ${_fmtW(usedW)} · Remaining ${_fmtW(remW)}` + (Number.isFinite(cnt) ? ` · Ladepunkte ${Math.round(cnt)}` : '') + (connectors ? ` · [${connectors}]` : '');
      const right = `<div style="font-weight:600;">${binding ? 'BINDING' : 'OK'}</div>`;
      const kind = (binding || !Number.isFinite(capW) || capW <= 0) ? 'warn' : 'ok';
      els.stationsDiag.appendChild(mkItem(title, subtitle, right, kind));
    }
  }


  function _fmtBool(v, tTrue = 'JA', tFalse = 'NEIN') {
    return v ? tTrue : tFalse;
  }

  function renderChargingBudget(payload) {
    if (!els.chargingBudget) return;
    els.chargingBudget.innerHTML = '';

    if (!payload || payload.ok !== true) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Budget-Daten verfügbar.';
      els.chargingBudget.appendChild(empty);
      return;
    }

    const ctrl = (payload && payload.control && typeof payload.control === 'object') ? payload.control : null;
    const sum = (payload && payload.summary && typeof payload.summary === 'object') ? payload.summary : null;

    if (!ctrl) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Budget/Gate-State nicht verfügbar (Lademanagement deaktiviert oder noch kein Tick).';
      els.chargingBudget.appendChild(empty);
      return;
    }

    const mkCard = (titleText, lines, statusKind = '') => {
      const card = document.createElement('div');
      card.className = 'nw-config-card';

      const h = document.createElement('div');
      h.className = 'nw-config-card__header';

      const top = document.createElement('div');
      top.className = 'nw-config-card__header-top';

      const t = document.createElement('div');
      t.className = 'nw-config-card__title';
      t.textContent = titleText;

      const badge = document.createElement('div');
      badge.style.fontSize = '0.75rem';
      badge.style.fontWeight = '600';
      badge.style.opacity = '0.95';
      if (statusKind === 'ok') badge.style.color = '#6ee7b7';
      if (statusKind === 'warn') badge.style.color = '#fbbf24';
      if (statusKind === 'error') badge.style.color = '#fca5a5';
      badge.textContent = statusKind ? statusKind.toUpperCase() : '';

      top.appendChild(t);
      top.appendChild(badge);
      h.appendChild(top);

      const b = document.createElement('div');
      b.className = 'nw-config-card__body';

      const ul = document.createElement('div');
      ul.style.display = 'grid';
      ul.style.gap = '6px';

      (lines || []).forEach(line => {
        const row = document.createElement('div');
        row.className = 'nw-config-row';
        row.style.gridTemplateColumns = 'minmax(0, 1fr) auto';

        const l = document.createElement('div');
        l.className = 'nw-config-row__primary';
        l.style.fontSize = '0.82rem';
        l.textContent = line.label;

        const r = document.createElement('div');
        r.className = 'nw-config-row__status';
        r.style.fontSize = '0.82rem';
        r.textContent = line.value;

        row.appendChild(l);
        row.appendChild(r);
        ul.appendChild(row);
      });

      b.appendChild(ul);
      card.appendChild(h);
      card.appendChild(b);
      return card;
    };

    const n = (x) => (x === null || x === undefined) ? null : Number(x);
    const b = (x) => !!x;

    const budgetW = n(ctrl.budgetW);
    const usedW = n(ctrl.usedW);
    const remW = n(ctrl.remainingW);

    const budgetKind = (Number.isFinite(budgetW) && Number.isFinite(usedW) && usedW > budgetW + 1) ? 'warn' : 'ok';

    els.chargingBudget.appendChild(mkCard('Gesamtbudget', [
      { label: 'Mode', value: String(ctrl.budgetMode || '') },
      { label: 'Budget', value: _fmtW(budgetW) },
      { label: 'Used', value: _fmtW(usedW) },
      { label: 'Remaining', value: _fmtW(remW) },
      { label: 'Status', value: String(ctrl.status || '') },
    ], budgetKind));

    // PV Gate (B)
    const pvKind = b(ctrl.pvAvailable) ? 'ok' : 'warn';

    const pvLines = [
      { label: 'PV verfügbar', value: _fmtBool(b(ctrl.pvAvailable), 'JA', 'NEIN') },
      { label: 'PV Cap raw', value: _fmtW(n(ctrl.pvCapRawW)) },
      { label: 'PV Cap effektiv', value: _fmtW(n(ctrl.pvCapEffectiveW)) },
    ];

    // Debug only (Installer): show PV surplus without EVCS consumption
    // Helps to verify sign conventions & smoothing for PV-only charging.
    try {
      const as = (window.NW_AUTH && window.NW_AUTH.getState) ? window.NW_AUTH.getState() : null;
      const isInstaller = as ? !!as.isInstaller : true;
      if (isInstaller) {
        pvLines.push({ label: 'PV Überschuss (ohne EV) – Instant', value: _fmtW(n(ctrl.pvSurplusNoEvRawW)) });
        pvLines.push({ label: 'PV Überschuss (ohne EV) – Ø 5 min', value: _fmtW(n(ctrl.pvSurplusNoEvAvg5mW)) });
      }
    } catch (_e) {}

    els.chargingBudget.appendChild(mkCard('Gate B – PV', pvLines, pvKind));

    // Grid safety caps (A)
    const gridBind = b(ctrl.gridCapBinding);
    els.chargingBudget.appendChild(mkCard('Gate A – Netz', [
      { label: 'Netzlimit (cfg)', value: _fmtW(n(ctrl.gridImportLimitW)) },
      { label: 'Netzlimit (eff)', value: _fmtW(n(ctrl.gridImportLimitEffW)) },
      { label: 'Netz (W)', value: _fmtW(n(ctrl.gridImportW)) },
      { label: 'Grundlast (est.)', value: _fmtW(n(ctrl.gridBaseLoadW)) },
      { label: 'EVCS Cap (Netz)', value: _fmtW(n(ctrl.gridCapEvcsW)) },
      { label: 'Binding', value: _fmtBool(gridBind, 'JA', 'NEIN') },
    ], gridBind ? 'warn' : 'ok'));

    // Phase cap
    const phaseBind = b(ctrl.phaseCapBinding);
    els.chargingBudget.appendChild(mkCard('Gate A – Phasen', [
      { label: 'Max Phase (cfg)', value: (n(ctrl.gridMaxPhaseA) != null) ? (Number(n(ctrl.gridMaxPhaseA)).toFixed(1) + ' A') : '--' },
      { label: 'Worst Phase', value: (n(ctrl.gridWorstPhaseA) != null) ? (Number(n(ctrl.gridWorstPhaseA)).toFixed(1) + ' A') : '--' },
      { label: 'EVCS Cap (Phasen)', value: _fmtW(n(ctrl.gridPhaseCapEvcsW)) },
      { label: 'Binding', value: _fmtBool(phaseBind, 'JA', 'NEIN') },
    ], phaseBind ? 'warn' : 'ok'));

    // §14a (A2)
    const p14aActive = b(ctrl.para14aActive);
    const p14aBind = b(ctrl.para14aBinding);
    els.chargingBudget.appendChild(mkCard('Gate A2 – §14a', [
      { label: 'Aktiv', value: _fmtBool(p14aActive, 'JA', 'NEIN') },
      { label: 'Mode', value: String(ctrl.para14aMode || '') },
      { label: 'Cap', value: _fmtW(n(ctrl.para14aCapEvcsW)) },
      { label: 'Binding', value: _fmtBool(p14aBind, 'JA', 'NEIN') },
    ], p14aActive ? (p14aBind ? 'warn' : 'ok') : ''));

    // Speicher-Unterstützung (C)
    const sa = b(ctrl.storageAssistActive);
    els.chargingBudget.appendChild(mkCard('Gate C – Speicher', [
      { label: 'Assist aktiv', value: _fmtBool(sa, 'JA', 'NEIN') },
      { label: 'Assist (W)', value: _fmtW(n(ctrl.storageAssistW)) },
      { label: 'SoC (%)', value: (n(ctrl.storageAssistSoCPct) != null) ? (Number(n(ctrl.storageAssistSoCPct)).toFixed(1) + ' %') : '--' },
    ], sa ? 'ok' : ''));

    // Summary (optional)
    if (sum) {
      els.chargingBudget.appendChild(mkCard('Summary', [
        { label: 'EVCS Ist', value: _fmtW(n(sum.totalPowerW)) },
        { label: 'EVCS Soll', value: _fmtW(n(sum.totalTargetPowerW)) },
        { label: 'Online Ports', value: (sum.onlineWallboxes != null) ? String(sum.onlineWallboxes) : '--' },
      ], ''));
    }
  }

  async function refreshChargingDiag() {
    if (_activeTab !== 'status') return;
    const data = await fetchJson('/api/ems/charging/diagnostics');
    renderChargingBudget(data || {});
    renderChargingDiag(data || {});
    renderStationsDiag(data || {});
  }



  async function refreshEmsStatus() {
    if (_activeTab !== 'status') return;
    const data = await fetchJson('/api/ems/status');
    renderEmsStatus(data || {});
  }

  function startStatusPolling() {
    if (_statusTimer) {
      try { clearInterval(_statusTimer); } catch (_e) {}
      _statusTimer = null;
    }
    _statusTimer = setInterval(() => {
      if (_activeTab !== 'status') return;
      refreshEmsStatus().catch(() => {});
      refreshChargingDiag().catch(() => {});
    }, 2000);
  }

  // --- DP Modal ---

  function openDpModal(targetInputId) {
    dpTargetInputId = targetInputId;
    treePrefix = '';
    if (els.dpSearch) els.dpSearch.value = '';
    if (els.dpResults) els.dpResults.innerHTML = '';
    if (els.dpTree) els.dpTree.innerHTML = '';
    if (els.dpBreadcrumb) els.dpBreadcrumb.innerHTML = '';
    if (els.dpModal) {
      els.dpModal.setAttribute('aria-hidden', 'false');
      els.dpModal.classList.remove('hidden');
    }
    refreshTree().catch(() => {});
  }

  function closeDpModal() {
    if (els.dpModal) {
      els.dpModal.setAttribute('aria-hidden', 'true');
      els.dpModal.classList.add('hidden');
    }
    dpTargetInputId = null;
  }

  function setDpTargetValue(id) {
    if (!dpTargetInputId) return;
    const inp = document.getElementById(dpTargetInputId);
    if (!inp) return;
    inp.value = id;
    inp.dispatchEvent(new Event('change'));
    closeDpModal();
  }

  function renderBreadcrumb() {
    if (!els.dpBreadcrumb) return;
    els.dpBreadcrumb.innerHTML = '';

    const parts = (treePrefix || '').split('.').filter(Boolean);

    const mkCrumb = (label, prefix, clickable) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-dp-crumb' + (clickable ? '' : ' nw-dp-crumb--active');
      b.textContent = label;
      if (!clickable) {
        b.disabled = true;
        return b;
      }
      b.addEventListener('click', () => {
        treePrefix = prefix;
        refreshTree().catch(() => {});
      });
      return b;
    };

    const sep = () => {
      const s = document.createElement('span');
      s.className = 'nw-dp-sep';
      s.textContent = '›';
      return s;
    };

    // Start
    els.dpBreadcrumb.appendChild(mkCrumb('Start', '', parts.length > 0));

    // Segments
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      acc = acc ? (acc + '.' + p) : p;
      els.dpBreadcrumb.appendChild(sep());
      els.dpBreadcrumb.appendChild(mkCrumb(p, acc, i < parts.length - 1));
    }
  }

  function mkDpResultRow(primary, meta, onClick) {
    const row = document.createElement('div');
    row.className = 'nw-dp-result';
    const id = document.createElement('div');
    id.className = 'nw-dp-result__id';
    id.textContent = primary;
    const m = document.createElement('div');
    m.className = 'nw-dp-result__meta';
    m.textContent = meta || '';
    row.appendChild(id);
    row.appendChild(m);
    if (typeof onClick === 'function') {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }
    return row;
  }

  async function refreshTree() {
    const data = await fetchJson('/api/object/tree?prefix=' + encodeURIComponent(treePrefix || ''));
    const children = Array.isArray(data.children) ? data.children : [];

    renderBreadcrumb();
    if (els.dpTree) els.dpTree.innerHTML = '';
    if (els.dpUpBtn) els.dpUpBtn.disabled = !treePrefix;
    if (els.dpRootBtn) els.dpRootBtn.disabled = !treePrefix;

    // Back entry (one level up)
    if (treePrefix && els.dpTree) {
      els.dpTree.appendChild(mkDpResultRow('..', 'Eine Ebene zurück', () => {
        upOne();
        refreshTree().catch(() => {});
      }));
    }

    if (!children.length) {
      if (els.dpTree) {
        const empty = document.createElement('div');
        empty.className = 'nw-config-empty';
        empty.textContent = 'Keine Einträge.';
        els.dpTree.appendChild(empty);
      }
      return;
    }

    for (const ch of children) {
      // Folder-like entry
      if (ch && ch.hasChildren) {
        const meta = ch.name ? ('Ordner • ' + ch.name) : 'Ordner';
        if (els.dpTree) {
          els.dpTree.appendChild(mkDpResultRow(String(ch.id || ch.label || ''), meta, () => {
            treePrefix = String(ch.id || '');
            refreshTree().catch(() => {});
          }));
        }
        continue;
      }

      // State-like entry
      if (ch && ch.isState) {
        const metaBits = [];
        if (ch.name) metaBits.push(String(ch.name));
        if (ch.role) metaBits.push(String(ch.role));
        if (ch.unit) metaBits.push(String(ch.unit));
        const meta = metaBits.join(' • ');
        if (els.dpTree) {
          els.dpTree.appendChild(mkDpResultRow(String(ch.id || ''), meta, () => setDpTargetValue(String(ch.id || ''))));
        }
        continue;
      }

      // Fallback
      if (els.dpTree) {
        els.dpTree.appendChild(mkDpResultRow(String(ch && (ch.id || ch.label) || ''), '', null));
      }
    }
  }

  async function doSearch() {
    const q = String(els.dpSearch.value || '').trim();
    if (!q) {
      els.dpResults.innerHTML = '';
      return;
    }

    els.dpResults.innerHTML = '';
    const data = await fetchJson('/api/smarthome/dpsearch?q=' + encodeURIComponent(q) + '&limit=500');
    const results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-empty';
      empty.textContent = 'Keine Treffer.';
      els.dpResults.appendChild(empty);
      return;
    }

    for (const r of results) {
      const metaBits = [];
      if (r.name) metaBits.push(String(r.name));
      if (r.role) metaBits.push(String(r.role));
      if (r.unit) metaBits.push(String(r.unit));
      const meta = metaBits.join(' • ');
      els.dpResults.appendChild(mkDpResultRow(String(r.id || ''), meta, () => setDpTargetValue(String(r.id || ''))));
    }
  }

  function upOne() {
    if (!treePrefix) {
      treePrefix = '';
      return;
    }
    const parts = treePrefix.split('.').filter(Boolean);
    parts.pop();
    treePrefix = parts.join('.');
  }

  // --- Wire up ---

  buildAppsUI();

  // Tabs + live status
  try { initTabs(); } catch (_e) {}
  try { initFlowSubtabs(); } catch (_e) {}
  try { startStatusPolling(); } catch (_e) {}

  if (els.gotoEvuPvTab) {
    els.gotoEvuPvTab.addEventListener('click', () => {
      try { _showTab('evupv'); } catch (_e) {}
    });
  }

  if (els.storageControlMode) {
    els.storageControlMode.addEventListener('change', () => {
      // Only rebuild required fields; keep currentConfig.storage.controlMode updated
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      currentConfig.storage.controlMode = getStorageMode();
      rebuildStorageTable();
    });
  }

  if (els.storageCapacityKWh) {
    const _update = () => {
      currentConfig = currentConfig || {};
      currentConfig.storage = currentConfig.storage || {};
      const n = Number(els.storageCapacityKWh.value);
      if (Number.isFinite(n) && n > 0) {
        currentConfig.storage.capacityKWh = n;
      } else {
        delete currentConfig.storage.capacityKWh;
      }
    };
    els.storageCapacityKWh.addEventListener('change', _update);
    els.storageCapacityKWh.addEventListener('input', _update);
  }

  // Browse buttons (event delegation) – works for dynamically created fields too
  document.addEventListener('click', (e) => {
    const t = e && e.target ? e.target : null;
    const btn = t && t.closest ? t.closest('[data-browse]') : null;
    if (!btn) return;
    const id = btn.getAttribute('data-browse');
    if (id) openDpModal(id);
  });

  // Mark standalone datapoint inputs for validation

  if (els.gridPointPowerId) {
    els.gridPointPowerId.dataset.dpInput = '1';
    // Keep currentConfig.datapoints.gridPointPower in sync (so save works even without reload)
    els.gridPointPowerId.addEventListener('change', () => {
      currentConfig = currentConfig || {};
      currentConfig.datapoints = currentConfig.datapoints || {};
      const v = String(els.gridPointPowerId.value || '').trim();
      currentConfig.datapoints.gridPointPower = v;

      if (els.gridPointPowerIdDisplay) {
        els.gridPointPowerIdDisplay.textContent = v ? ('Aktuell: ' + v) : 'Aktuell: nicht gesetzt';
      }

      scheduleValidation(200);
    });
  }

  // §14a: standalone inputs
  if (els.para14aMode) {
    els.para14aMode.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      const v = String(els.para14aMode.value || 'ems').trim().toLowerCase();
      ic.para14aMode = (v === 'direct') ? 'direct' : 'ems';
    });
  }

  if (els.para14aMinPerDeviceW) {
    els.para14aMinPerDeviceW.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      const n = Number(els.para14aMinPerDeviceW.value);
      ic.para14aMinPerDeviceW = (Number.isFinite(n) && n >= 0) ? Math.round(n) : 1000;
    });
  }

  if (els.para14aActiveId) {
    els.para14aActiveId.dataset.dpInput = '1';
    els.para14aActiveId.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aActiveId = String(els.para14aActiveId.value || '').trim();
      scheduleValidation(200);
    });
  }

  if (els.para14aEmsSetpointWId) {
    els.para14aEmsSetpointWId.dataset.dpInput = '1';
    els.para14aEmsSetpointWId.addEventListener('change', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aEmsSetpointWId = String(els.para14aEmsSetpointWId.value || '').trim();
      scheduleValidation(200);
    });
  }

  if (els.addPara14aConsumer) {
    els.addPara14aConsumer.addEventListener('click', () => {
      const ic = _ensurePara14aCfg();
      ic.para14aConsumers = Array.isArray(ic.para14aConsumers) ? ic.para14aConsumers : [];
      ic.para14aConsumers.push({
        enabled: true,
        name: '',
        type: 'custom',
        controlType: 'limitW',
        maxPowerW: 0,
        priority: 0,
        setPowerWId: '',
        enableId: ''
      });
      rebuildPara14aConsumersUI();
      scheduleValidation(200);
    });
  }


  // EVCS top-level inputs
  if (els.evcsCount) {
    els.evcsCount.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      sc.evcsCount = _clampInt(els.evcsCount.value, 1, 50, 1);
      buildEvcsUI();
    });
  }
  if (els.evcsMaxPowerKw) {
    els.evcsMaxPowerKw.addEventListener('change', () => {
      const sc = _ensureSettingsConfig();
      const kw = Number(els.evcsMaxPowerKw.value);
      sc.evcsMaxPowerKw = Number.isFinite(kw) ? kw : (Number.isFinite(Number(sc.evcsMaxPowerKw)) ? Number(sc.evcsMaxPowerKw) : 11);
    });
  }

  if (els.cmGoalStrategy) {
    els.cmGoalStrategy.addEventListener('change', () => {
      const cm = _ensureChargingManagementConfig();
      const v = String(els.cmGoalStrategy.value || 'standard').trim().toLowerCase();
      cm.goalStrategy = (v === 'smart') ? 'smart' : 'standard';
    });
  }
  if (els.addStationGroup) {
    els.addStationGroup.addEventListener('click', () => {
      const sc = _ensureSettingsConfig();
      sc.stationGroups = Array.isArray(sc.stationGroups) ? sc.stationGroups : [];
      sc.stationGroups.push({ stationKey: '', name: '', maxPowerKw: 0 });
      buildStationGroupsUI();
    });
  }

  
  if (els.nwDevicesQuickSetup) {
    els.nwDevicesQuickSetup.addEventListener('click', () => {
      nwDevicesQuickSetup().catch(e => setStatus('Schnell‑Inbetriebnahme fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

if (els.ocppAutoDetect) {
    els.ocppAutoDetect.addEventListener('click', () => {
      ocppAutoDetect().catch(e => setStatus('OCPP: Erkennung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.ocppMapExisting) {
    els.ocppMapExisting.addEventListener('click', () => {
      ocppMapExisting().catch(e => setStatus('OCPP: Zuordnung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.save) {
    els.save.addEventListener('click', () => {
      saveConfig().catch(e => setStatus('Speichern fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }

  if (els.reload) {
    els.reload.addEventListener('click', () => {
      loadConfig().catch(e => setStatus('Laden fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
  backupRefreshInfo().catch(() => {});

    });
  }

  if (els.validate) {
    els.validate.addEventListener('click', () => {
      runValidation(true).catch(e => setStatus('Validierung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
    });
  }


  // --- Backup / Export / Import (Installer config) ---
  async function backupRefreshInfo() {
    if (!els.backupInfo) return;
    try {
      const data = await fetchJson('/api/installer/backup/userdata');
      if (!data.exists) {
        els.backupInfo.innerHTML = '<div class="nw-config-empty">Kein Backup in 0_userdata.0 gefunden (wird beim nächsten „Speichern“ automatisch erstellt).</div>';
        return;
      }

      const meta = data.meta || {};
      const createdAt = meta.createdAt ? String(meta.createdAt) : '';
      const ver = meta.adapterVersion ? String(meta.adapterVersion) : '';
      const bytes = meta.bytes ? String(meta.bytes) : '';

      els.backupInfo.innerHTML = `
        <div class="nw-config-card__row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
          <span class="nw-config-badge nw-config-badge--ok">Backup vorhanden</span>
          <span style="opacity:.85;">Erstellt: <b>${createdAt || '—'}</b></span>
          <span style="opacity:.85;">Adapter: <b>${ver || '—'}</b></span>
          <span style="opacity:.85;">Größe: <b>${bytes || '—'} bytes</b></span>
        </div>
      `;
    } catch (e) {
      els.backupInfo.innerHTML = '<div class="nw-config-empty">Backup-Status konnte nicht geladen werden.</div>';
    }
  }

  async function backupExport() {
    try {
      setBackupStatus('Export wird erstellt…', '');
      const data = await fetchJson('/api/installer/backup/export');
      const backup = data && data.backup ? data.backup : null;
      if (!backup) throw new Error('no backup payload');

      const ts = new Date();
      const stamp = ts.toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
      const fn = `nexowatt-vis-backup-${stamp}.json`;

      downloadJsonFile(fn, backup);
      setBackupStatus('Export erstellt: ' + fn, 'ok');
      await backupRefreshInfo();
    } catch (e) {
      setBackupStatus('Export fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }

  async function backupDoImportFromObj(obj) {
    const payload = { backup: obj, restartEms: true, mode: 'replace' };
    await fetchJson('/api/installer/backup/import', { method: 'POST', body: JSON.stringify(payload) });
    setBackupStatus('Import erfolgreich. Konfiguration wurde übernommen (EMS neu gestartet).', 'ok');
    await loadConfig();
    await backupRefreshInfo();
  }

  async function backupImportFromFile(file) {
    try {
      if (!file) return;
      setBackupStatus('Import wird geprüft…', '');
      const raw = await readFileAsText(file);
      const obj = JSON.parse(raw);
      await backupDoImportFromObj(obj);
    } catch (e) {
      setBackupStatus('Import fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    } finally {
      try { if (els.backupFile) els.backupFile.value = ''; } catch (_e) {}
    }
  }

  async function backupRestoreFromUserdata() {
    try {
      setBackupStatus('Lese Backup aus 0_userdata…', '');
      const data = await fetchJson('/api/installer/backup/userdata');
      if (!data.exists || !data.backup) {
        setBackupStatus('Kein Backup in 0_userdata gefunden.', 'error');
        return;
      }

      const ok = window.confirm('Backup aus 0_userdata wiederherstellen?\n\nAchtung: aktuelle Konfiguration wird überschrieben.');
      if (!ok) {
        setBackupStatus('Abgebrochen.', '');
        return;
      }

      await backupDoImportFromObj(data.backup);
    } catch (e) {
      setBackupStatus('Wiederherstellung fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error');
    }
  }


  // Backup actions
  if (els.backupExport) {
    els.backupExport.addEventListener('click', () => {
      backupExport().catch(() => {});
    });
  }

  if (els.backupImport) {
    els.backupImport.addEventListener('click', () => {
      try { if (els.backupFile) els.backupFile.click(); } catch (_e) {}
    });
  }

  if (els.backupFile) {
    els.backupFile.addEventListener('change', () => {
      const f = els.backupFile.files && els.backupFile.files[0];
      backupImportFromFile(f).catch(() => {});
    });
  }

  if (els.backupRestore) {
    els.backupRestore.addEventListener('click', () => {
      backupRestoreFromUserdata().catch(() => {});
    });
  }

  if (els.refreshChargingDiag) {
    els.refreshChargingDiag.addEventListener('click', () => {
      refreshChargingDiag().catch(() => {});
    });
  }

  if (els.refreshChargingBudget) {
    els.refreshChargingBudget.addEventListener('click', () => {
      // Uses the same diagnostics endpoint
      refreshChargingDiag().catch(() => {});
    });
  }

  if (els.refreshStationsDiag) {
    els.refreshStationsDiag.addEventListener('click', () => {
      // Uses the same diagnostics endpoint; keeps both sections in sync.
      refreshChargingDiag().catch(() => {});
    });
  }

  // -------------------------------------------------------------------------
  // Toggle-Buttons (Aus/An, Nein/Ja) steuern versteckte Checkbox-Inputs
  // -------------------------------------------------------------------------
  window.nwSyncToggleButtons = function (inputId) {
    try {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      const grp = document.querySelector(`.nw-toggle[data-toggle-for="${CSS.escape(inputId)}"]`);
      if (!grp) return;
      const desired = !!inp.checked;
      const bs = Array.from(grp.querySelectorAll('button[data-value]'));
      bs.forEach(b => {
        const v = String(b.getAttribute('data-value') || '').trim().toLowerCase();
        const isTrue = (v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja');
        b.classList.toggle('active', desired ? isTrue : !isTrue);
        b.disabled = !!inp.disabled;
      });
    } catch (_e) {}
  };

  document.addEventListener('click', (e) => {
    const btn = e && e.target && e.target.closest ? e.target.closest('.nw-toggle button[data-value]') : null;
    if (!btn) return;
    const grp = btn.closest('.nw-toggle');
    const targetId = grp ? grp.getAttribute('data-toggle-for') : null;
    if (!targetId) return;

    const inp = document.getElementById(targetId);
    if (!inp || inp.disabled) return;

    const raw = String(btn.getAttribute('data-value') || '').trim().toLowerCase();
    const desired = (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'ja');

    if (!!inp.checked !== desired) {
      inp.checked = desired;
      try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
    }

    try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons(targetId); } catch (_e) {}
  }, true);


  // Modal
  if (els.dpClose) els.dpClose.addEventListener('click', closeDpModal);
  if (els.dpModal) {
    els.dpModal.addEventListener('click', (e) => {
      if (e.target === els.dpModal) closeDpModal();
    });
  }
  if (els.dpSearchBtn) els.dpSearchBtn.addEventListener('click', () => doSearch().catch(() => {}));
  if (els.dpSearch) {
    els.dpSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch().catch(() => {});
    });
  }
  if (els.dpRootBtn) els.dpRootBtn.addEventListener('click', () => { treePrefix = ''; refreshTree().catch(() => {}); });
  if (els.dpUpBtn) els.dpUpBtn.addEventListener('click', () => { upOne(); refreshTree().catch(() => {}); });

  // Initial load
  loadConfig().catch(e => setStatus('Laden fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'));
  backupRefreshInfo().catch(() => {});

})();
