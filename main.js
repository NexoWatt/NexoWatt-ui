
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const path = require('path');
const bodyParser = express.json();
const crypto = require('crypto');

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(p => {
    const idx = p.indexOf('=');
    if (idx > -1) {
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx+1);
      if (k) out[k] = decodeURIComponent(v || '');
    }
  });
  return out;
}

function createToken() {
  return crypto.randomBytes(24).toString('base64url');
}
function getInstallerPassword(ctx) {
  try {
    const cfg = ctx && ctx.config;
    const pw = (cfg && cfg.installerPassword) || 'install2025!'; // default
    return pw;
  } catch (_) { return 'install2025!'; }
}



class NexoWattVis extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: 'nexowatt-vis',
    });

    this.stateCache = {};
    this.sseClients = new Set();
    this.smartHomeDevices = [];

    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
  }

  
  async ensureInstallerStates() {
    const defs = {
      adminUrl:     { type: 'string', role: 'state', def: '' },
      gridConnectionPower: { type: 'number', role: 'value.power', def: 0 },
      para14a:      { type: 'boolean', role: 'state', def: false },
      chargepoints: { type: 'number', role: 'state', def: 0 },
      storageCount: { type: 'number', role: 'state', def: 0 },
      storagePower: { type: 'number', role: 'value.power', def: 0 },
      emsMode:      { type: 'number', role: 'state', def: 1 },
      socMin:       { type: 'number', role: 'value', def: 10 },
      socPeakRange: { type: 'number', role: 'value', def: 20 },
      chargePowerMax: { type: 'number', role: 'value.power', def: 0 },
      dischargePowerMax: { type: 'number', role: 'value.power', def: 0 },
      chargeLimitMax: { type: 'number', role: 'value.power', def: 0 },
      dischargeLimitMax: { type: 'number', role: 'value.power', def: 0 },};
    for (const [key, c] of Object.entries(defs)) {
      const id = `installer.${key}`;
      await this.setObjectNotExistsAsync(id, { type:'state', common:{ name:id, type:c.type, role:c.role, read:true, write:true, def:c.def }, native:{} });
    }
  }
  
  async ensureSettingsStates() {
    const defs = {
      notifyEnabled: { type:'boolean', role:'state', def:false },
      email:         { type:'string',  role:'state', def:'' },
      dynamicTariff: { type:'boolean', role:'state', def:false },
      storagePower:  { type:'number',  role:'value.power', def:0 },
      price:         { type:'number',  role:'value', def:0 },
      priority:      { type:'number',  role:'value', def:1 },
      tariffMode:    { type:'number',  role:'value', def:1 }
      ,evcsMaxPower:  { type:'number',  role:'value.power', def:11000 }
      ,evcsCount:     { type:'number',  role:'state', def:1 }
};
    for (const [key, c] of Object.entries(defs)) {
      const id = `settings.${key}`;
      await this.setObjectNotExistsAsync(id, {
        type: 'state',
        common: { name:id, type:c.type, role:c.role, read:true, write:true, def:c.def },
        native: {}
      });
    }
  }
async syncInstallerConfigToStates() {
    const cfg = (this.config && this.config.installerConfig) || {};
    const toSet = {
      adminUrl: cfg.adminUrl || '',
      gridConnectionPower: Number(cfg.gridConnectionPower || 0),
      para14a: !!cfg.para14a,
      chargepoints: Number(cfg.chargepoints || 0),
      storageCount: Number(cfg.storageCount || 0),
      storagePower: Number(cfg.storagePower || 0),
      emsMode: Number(cfg.emsMode || 1),
      socMin: Number(cfg.socMin || 0),
      socPeakRange: Number(cfg.socPeakRange || 0),
      chargePowerMax: Number(cfg.chargePowerMax || 0),
      dischargePowerMax: Number(cfg.dischargePowerMax || 0),
      chargeLimitMax: Number(cfg.chargeLimitMax || 0),
      dischargeLimitMax: Number(cfg.dischargeLimitMax || 0),};
    for (const [k, v] of Object.entries(toSet)) {
      await this.setStateAsync(`installer.${k}`, { val: v, ack: true });
    }
  }
  async syncSettingsConfigToStates() {
    const cfg = (this.config && this.config.settingsConfig) || {};
    const ratedKw = Number(cfg.evcsMaxPowerKw || 11); // default 11 kW
    const ratedW  = Math.round(ratedKw * 1000);
    const evcsCount = Math.max(1, Math.min(20, Math.round(Number(cfg.evcsCount || 1))));
    this.evcsCount = evcsCount;
    this.log.info(`[NexoWatt VIS] Wallboxen konfiguriert: ${evcsCount}`);


    // derive evcs list (names) from config; keep it stable and always at least evcsCount entries
    const rawList = Array.isArray(cfg.evcsList) ? cfg.evcsList : [];
    const evcsList = [];
    for (let i = 0; i < evcsCount; i++) {
      const row = rawList[i] || {};
      const name = (row && typeof row.name === 'string' && row.name.trim()) ? row.name.trim() : `Wallbox ${i+1}`;
      const note = (row && typeof row.note === 'string' && row.note.trim()) ? row.note.trim() : '';
      const powerId = (row && typeof row.powerId === 'string' && row.powerId.trim()) ? row.powerId.trim() : '';
      const energyTotalId = (row && typeof row.energyTotalId === 'string' && row.energyTotalId.trim()) ? row.energyTotalId.trim() : '';
      const statusId = (row && typeof row.statusId === 'string' && row.statusId.trim()) ? row.statusId.trim() : '';
      const activeId = (row && typeof row.activeId === 'string' && row.activeId.trim()) ? row.activeId.trim() : '';
      const modeId = (row && typeof row.modeId === 'string' && row.modeId.trim()) ? row.modeId.trim() : '';
      evcsList.push({ index: i+1, name, note, powerId, energyTotalId, statusId, activeId, modeId });
    }
    this.evcsList = evcsList;

    // build lookup for mapped EVCS datapoints -> internal cache keys
    this.evcsIdToKey = {};
    for (const wb of this.evcsList) {
      if (wb.powerId) this.evcsIdToKey[wb.powerId] = `evcs.${wb.index}.powerW`;
      if (wb.energyTotalId) this.evcsIdToKey[wb.energyTotalId] = `evcs.${wb.index}.energyTotalKwh`;
      if (wb.statusId) this.evcsIdToKey[wb.statusId] = `evcs.${wb.index}.status`;
      if (wb.activeId) this.evcsIdToKey[wb.activeId] = `evcs.${wb.index}.active`;
      if (wb.modeId) this.evcsIdToKey[wb.modeId] = `evcs.${wb.index}.mode`;
    }

    // keep count available for the VIS immediately (without requiring foreign datapoints)
    try { this.updateValue('settings.evcsCount', evcsCount, Date.now()); } catch(e) {}
    try {
      await this.setStateAsync('settings.evcsMaxPower', { val: ratedW, ack: true });
      await this.setStateAsync('settings.evcsCount', { val: evcsCount, ack: true });
    } catch(e) {
      this.log.warn('syncSettingsConfigToStates: ' + e.message);
    }
  }

  async ensureEvcsStates() {
    const count = Number(this.evcsCount || 1) || 1;

    await this.setObjectNotExistsAsync('evcs', {
      type: 'channel',
      common: { name: 'EVCS' },
      native: {}
    });

    // aggregate
    await this.setObjectNotExistsAsync('evcs.totalPowerW', {
      type: 'state',
      common: { name: 'EVCS Gesamtleistung', type: 'number', role: 'value.power', read: true, write: false, def: 0, unit: 'W' },
      native: {}
    });

    for (let i = 1; i <= count; i++) {
      await this.setObjectNotExistsAsync(`evcs.${i}`, {
        type: 'channel',
        common: { name: `Wallbox ${i}` },
        native: {}
      });

      const defs = {
        name:          { type: 'string', role: 'text', def: `Wallbox ${i}`, read: true, write: false },
        note:          { type: 'string', role: 'text', def: '', read: true, write: false },
        powerW:        { type: 'number', role: 'value.power', def: 0, read: true, write: false, unit: 'W' },
        energyTotalKwh:{ type: 'number', role: 'value.energy', def: 0, read: true, write: false, unit: 'kWh' },
        energyDayKwh:  { type: 'number', role: 'value.energy', def: 0, read: true, write: false, unit: 'kWh' },
                _dayBaseKwh:  { type: 'number', role: 'value', def: 0, read: true, write: false, unit: 'kWh' },
        _dayBaseDate: { type: 'string', role: 'text', def: '', read: true, write: false },
        status:        { type: 'string', role: 'state', def: '', read: true, write: false },
        active:        { type: 'boolean', role: 'switch', def: false, read: true, write: false },
        mode:          { type: 'number', role: 'value', def: 0, read: true, write: false }
      };

      for (const [k, c] of Object.entries(defs)) {
        await this.setObjectNotExistsAsync(`evcs.${i}.${k}`, {
          type: 'state',
          common: { name: `evcs.${i}.${k}`, type: c.type, role: c.role, read: c.read, write: c.write, def: c.def, unit: c.unit },
          native: {}
        });
      }
    }

    // write static names/notes from config into local states
    try {
      if (Array.isArray(this.evcsList)) {
        for (const wb of this.evcsList) {
          await this.setStateAsync(`evcs.${wb.index}.name`, wb.name, true);
          await this.setStateAsync(`evcs.${wb.index}.note`, wb.note || '', true);
        }
      }
    } catch (e) {
      this.log.debug('ensureEvcsStates write meta failed: ' + e.message);
    }
  }


  async seedEvcsDayBaseCache() {
    try {
      const count = Number(this.evcsCount || 1) || 1;
      for (let i = 1; i <= count; i++) {
        const kBase = `evcs.${i}._dayBaseKwh`;
        const kDate = `evcs.${i}._dayBaseDate`;
        const stB = await this.getStateAsync(kBase).catch(()=>null);
        const stD = await this.getStateAsync(kDate).catch(()=>null);
        if (stB && stB.val !== undefined && stB.val !== null) this.stateCache[kBase] = { value: Number(stB.val) || 0, ts: stB.ts || Date.now() };
        if (stD && stD.val !== undefined && stD.val !== null) this.stateCache[kDate] = { value: String(stD.val || ''), ts: stD.ts || Date.now() };
      }
    } catch (e) {
      this.log.debug('seedEvcsDayBaseCache failed: ' + e.message);
    }
  }

  async subscribeEvcsMappedStates() {
    if (!Array.isArray(this.evcsList)) return;

    for (const wb of this.evcsList) {
      const ids = [wb.powerId, wb.energyTotalId, wb.statusId, wb.activeId, wb.modeId].filter(Boolean);
      for (const id of ids) {
        try {
          await this.subscribeForeignStatesAsync(id);
          const st = await this.getForeignStateAsync(id);
          if (st && st.val !== undefined && st.val !== null) {
            const key = this.evcsIdToKey && this.evcsIdToKey[id];
            if (key) this.updateValue(key, st.val, st.ts || Date.now());
          }
        } catch (e) {
          this.log.debug(`EVCS subscribe/read failed (${id}): ${e.message}`);
        }
      }
    }
  }


  /**
 * Returns the SmartHomeConfig structure from adapter config.
 * This is the future generic model for rooms, functions and devices.
 *
 * smartHomeConfig: {
 *   version: 1,
 *   rooms: [
 *     { id: 'living', name: 'Wohnen', icon: 'room-living', floor: 'EG', order: 10, enabled: true }
 *   ],
 *   functions: [
 *     { id: 'light', name: 'Licht', icon: 'func-light', order: 10, enabled: true }
 *   ],
 *   devices: [
 *     {
 *       id: 'living_light_ceiling',
 *       type: 'switch', // switch|dimmer|blind|rtr|sensor|scene
 *       roomId: 'living',
 *       functionId: 'light',
 *       alias: 'Deckenlicht',
 *       icon: 'light-ceiling',
 *       size: 'm', // s|m|l
 *       tags: ['wohnen', 'licht'],
 *       behavior: { readOnly: false, invert: false },
 *       io: {
 *         switch: { readId: 'knx.0.living.light.ceiling', writeId: 'knx.0.living.light.ceiling' }
 *       }
 *     }
 *   ]
 * }
 */
getSmartHomeConfig() {
  const cfg = this.config || {};
  const shc = cfg.smartHomeConfig || {};
  const out = {
    version: typeof shc.version === 'number' ? shc.version : 1,
    rooms: Array.isArray(shc.rooms) ? shc.rooms : [],
    functions: Array.isArray(shc.functions) ? shc.functions : [],
    devices: Array.isArray(shc.devices) ? shc.devices : [],
  };
  return out;
}

buildSmartHomeDevicesFromConfig() {
  const smCfg = (this.config && this.config.smartHome) || {};
  const enabled = !!smCfg.enabled;
  const dps = smCfg.datapoints || {};
  const devices = [];

  if (!enabled) {
    this.smartHomeDevices = [];
    return this.smartHomeDevices;
  }

  // --- SmartHomeConfig v1: rooms/functions/devices (primary source) ---
  const shc = this.getSmartHomeConfig ? this.getSmartHomeConfig() : null;
  const rooms = (shc && Array.isArray(shc.rooms)) ? shc.rooms : [];
  const funcs = (shc && Array.isArray(shc.functions)) ? shc.functions : [];
  const cfgDevices = (shc && Array.isArray(shc.devices)) ? shc.devices : [];
  const hasConfigDevices = cfgDevices.length > 0;

  const resolveRoomName = (roomId) => {
    if (!roomId) return '';
    const r = rooms.find(rm => rm && rm.id === roomId);
    return (r && r.name) || roomId;
  };

  const resolveFunctionName = (fnId) => {
    if (!fnId) return '';
    const f = funcs.find(fn => fn && fn.id === fnId);
    return (f && f.name) || fnId;
  };

  if (hasConfigDevices) {
    cfgDevices.forEach(cfgDev => {
      if (!cfgDev || !cfgDev.id) return;
      const type = cfgDev.type || 'switch';
      const roomName = resolveRoomName(cfgDev.roomId);
      const fnName = resolveFunctionName(cfgDev.functionId);
      const behavior = cfgDev.behavior || {};
      const ioCfg = cfgDev.io || {};
      const size = cfgDev.size || 'm';

      const dev = {
        id: cfgDev.id,
        type,
        room: roomName,
        function: fnName,
        alias: cfgDev.alias || cfgDev.id,
        icon: cfgDev.icon || '',
        ui: {
          size,
          showRoom: true,
          showValue: true,
          unit: (cfgDev.ui && cfgDev.ui.unit) || cfgDev.unit || '',
          precision: (cfgDev.ui && typeof cfgDev.ui.precision === 'number')
            ? cfgDev.ui.precision
            : (typeof cfgDev.precision === 'number' ? cfgDev.precision : undefined),
        },
        behavior: {
          readOnly: !!behavior.readOnly,
          favorite: !!behavior.favorite,
        },
        io: {},
      };

      if (type === 'switch' || type === 'scene') {
        const sw = ioCfg.switch || {};
        const readId = sw.readId || sw.writeId || '';
        const writeId = sw.writeId || sw.readId || '';
        if (!readId && !writeId) {
          // keine IO-Zuordnung -> trotzdem anzeigen, aber ohne Switch-IO
        } else {
          dev.io.switch = { readId, writeId };
        }
        // Szenen farblich etwas absetzen (UI-seitig evtl. später)
        if (type === 'scene') {
          dev.ui.unit = dev.ui.unit || '';
        }
      } else if (type === 'dimmer' || type === 'blind') {
        const lvl = ioCfg.level || {};
        const readId = lvl.readId || '';
        const writeId = lvl.writeId || lvl.readId || '';
        if (readId || writeId) {
          dev.io.level = {
            readId,
            writeId,
            min: typeof lvl.min === 'number' ? lvl.min : 0,
            max: typeof lvl.max === 'number' ? lvl.max : 100,
          };
        }
        if (type === 'blind') {
          const cover = ioCfg.cover || {};
          dev.io.cover = {
            positionId: lvl.readId || '',
            upId: cover.upId || '',
            downId: cover.downId || '',
            stopId: cover.stopId || '',
          };
        }
      } else if (type === 'rtr') {
        const climate = ioCfg.climate || {};
        dev.io.climate = {
          currentTempId: climate.currentTempId || '',
          setpointId: climate.setpointId || '',
          modeId: climate.modeId || '',
          humidityId: climate.humidityId || '',
          minSetpoint: typeof climate.minSetpoint === 'number' ? climate.minSetpoint : 15,
          maxSetpoint: typeof climate.maxSetpoint === 'number' ? climate.maxSetpoint : 30,
        };
        if (!dev.ui.unit) {
          dev.ui.unit = '°C';
        }
        if (typeof dev.ui.precision !== 'number') {
          dev.ui.precision = 1;
        }
      } else if (type === 'sensor') {
        const sensor = ioCfg.sensor || {};
        if (sensor.readId) {
          dev.io.sensor = { readId: sensor.readId };
        }
      }

      devices.push(dev);
    });

    this.smartHomeDevices = devices;
    return this.smartHomeDevices;
  }

  // --- Fallback: altes SmartHome-Modell über smartHome.datapoints.* (A-Reihe) ---
  const pushSwitch = (id, opts) => {
    if (!id) return;
    const dev = {
      id: opts.id,
      type: 'switch',
      room: opts.room,
      function: opts.func,
      alias: opts.alias,
      icon: opts.icon,
      ui: {
        size: 'm',
        showRoom: true,
        showValue: true,
        unit: '',
        precision: 0,
        highlightOnState: true,
        colorProfile: 'primary',
      },
      behavior: {
        readOnly: false,
        favorite: false,
      },
      io: {
        switch: {
          readId: id,
          writeId: id,
        },
      },
    };
    devices.push(dev);
  };

  const pushDimmer = (id, opts) => {
    if (!id) return;
    const dev = {
      id: opts.id,
      type: 'dimmer',
      room: opts.room,
      function: opts.func,
      alias: opts.alias,
      icon: opts.icon,
      ui: {
        size: 'm',
        showRoom: true,
        showValue: true,
        unit: typeof opts.unit === 'string' ? opts.unit : '%',
        precision: 0,
        highlightOnState: true,
        colorProfile: 'primary',
      },
      behavior: {
        readOnly: false,
        favorite: false,
      },
      io: {
        level: {
          readId: id,
          writeId: id,
          min: typeof opts.min === 'number' ? opts.min : 0,
          max: typeof opts.max === 'number' ? opts.max : 100,
        },
      },
    };
    devices.push(dev);
  };

  const pushBlind = (positionId, upId, downId, stopId, opts) => {
    if (!positionId && !upId && !downId && !stopId) return;
    const dev = {
      id: opts.id,
      type: 'blind',
      room: opts.room,
      function: opts.func,
      alias: opts.alias,
      icon: opts.icon,
      ui: {
        size: 'm',
        showRoom: true,
        showValue: true,
        unit: typeof opts.unit === 'string' ? opts.unit : '%',
        precision: 0,
        highlightOnState: false,
        colorProfile: 'primary',
      },
      behavior: {
        readOnly: false,
        favorite: false,
      },
      io: {},
    };

    if (positionId) {
      dev.io.level = {
        readId: positionId,
        writeId: positionId,
        min: typeof opts.min === 'number' ? opts.min : 0,
        max: typeof opts.max === 'number' ? opts.max : 100,
      };
    }

    dev.io.cover = {
      positionId: positionId || '',
      upId: upId || '',
      downId: downId || '',
      stopId: stopId || '',
    };

    devices.push(dev);
  };

  const pushRtr = (currentId, setpointId, modeId, humidityId, opts) => {
    if (!currentId && !setpointId && !modeId && !humidityId) return;
    const dev = {
      id: opts.id,
      type: 'rtr',
      room: opts.room,
      function: opts.func,
      alias: opts.alias,
      icon: opts.icon,
      ui: {
        size: 'm',
        showRoom: true,
        showValue: true,
        unit: typeof opts.unit === 'string' ? opts.unit : '°C',
        precision: 1,
        highlightOnState: true,
        colorProfile: 'primary',
      },
      behavior: {
        readOnly: false,
        favorite: false,
      },
      io: {
        climate: {
          currentTempId: currentId || '',
          setpointId: setpointId || '',
          modeId: modeId || '',
          humidityId: humidityId || '',
          minSetpoint: typeof opts.minSetpoint === 'number' ? opts.minSetpoint : 15,
          maxSetpoint: typeof opts.maxSetpoint === 'number' ? opts.maxSetpoint : 30,
        },
      },
    };
    devices.push(dev);
  };

  const pushSensor = (id, opts) => {
    if (!id) return;
    const dev = {
      id: opts.id,
      type: 'sensor',
      room: opts.room,
      function: opts.func,
      alias: opts.alias,
      icon: opts.icon,
      ui: {
        size: 'm',
        showRoom: true,
        showValue: true,
        unit: typeof opts.unit === 'string' ? opts.unit : '',
        precision: typeof opts.precision === 'number' ? opts.precision : 1,
        highlightOnState: false,
        colorProfile: 'secondary',
      },
      behavior: {
        readOnly: true,
        favorite: false,
      },
      io: {
        sensor: {
          readId: id,
        },
      },
    };
    devices.push(dev);
  };

  const pushScene = (id, opts) => {
    if (!id) return;
    const dev = {
      id: opts.id,
      type: 'scene',
      room: opts.room,
      function: opts.func,
      alias: opts.alias,
      icon: opts.icon,
      ui: {
        size: 'm',
        showRoom: true,
        showValue: true,
        unit: '',
        precision: 0,
        highlightOnState: true,
        colorProfile: 'accent',
      },
      behavior: {
        readOnly: false,
        favorite: false,
      },
      io: {
        switch: {
          readId: id,
          writeId: id,
        },
      },
    };
    devices.push(dev);
  };

  // Schalter
  pushSwitch(dps.heatPumpOn, {
    id: 'heatPumpOn',
    alias: 'Wärmepumpe',
    room: 'Technik',
    func: 'Heizung',
    icon: 'HP',
  });

  pushSwitch(dps.wallboxLock, {
    id: 'wallboxLock',
    alias: 'Wallbox-Sperre',
    room: 'Ladestation',
    func: 'EV',
    icon: 'EV',
  });

  // Dimmer-artige Werte (0–100 %)
  pushDimmer(dps.gridLimit, {
    id: 'gridLimit',
    alias: 'Netzlimit',
    room: 'Energie',
    func: 'Netz',
    icon: 'GL',
    unit: '%',
    min: 0,
    max: 100,
  });

  pushDimmer(dps.pvCurtailment, {
    id: 'pvCurtailment',
    alias: 'PV-Abregelung',
    room: 'Energie',
    func: 'PV',
    icon: 'PV',
    unit: '%',
    min: 0,
    max: 100,
  });

  // Jalousie / Rollladen
  pushBlind(
    dps.blindPosition,
    dps.blindUp,
    dps.blindDown,
    dps.blindStop,
    {
      id: 'blindMain',
      alias: 'Jalousie',
      room: 'Wohnen',
      func: 'Beschattung',
      icon: 'BL',
      unit: '%',
      min: 0,
      max: 100,
    }
  );

  // Raumtemperatur / RTR
  pushRtr(
    dps.roomTemp,
    dps.rtrSetpoint,
    dps.rtrMode,
    dps.rtrHumidity,
    {
      id: 'rtrMain',
      alias: 'Heizung Wohnen',
      room: 'Wohnen',
      func: 'Heizung',
      icon: 'RT',
      unit: '°C',
      minSetpoint: 15,
      maxSetpoint: 30,
    }
  );

  // Sensor-/Info-Kacheln (Raumtemperatur & Luftfeuchte als reine Anzeige)
  pushSensor(dps.roomTemp, {
    id: 'sensorRoomTemp',
    alias: 'Raumtemperatur Info',
    room: 'Wohnen',
    func: 'Klima',
    icon: 'TS',
    unit: '°C',
    precision: 1,
  });

  pushSensor(dps.rtrHumidity, {
    id: 'sensorRoomHumidity',
    alias: 'Raumfeuchte',
    room: 'Wohnen',
    func: 'Klima',
    icon: 'RH',
    unit: '%',
    precision: 0,
  });

  // Szenen (einfacher Gira-ähnlicher Szenen-Baustein)
  pushScene(dps.scene1, {
    id: 'scene1',
    alias: 'Szene Wohlfühlen',
    room: 'Wohnen',
    func: 'Szene',
    icon: 'S1',
  });

  pushScene(dps.scene2, {
    id: 'scene2',
    alias: 'Szene Alles aus',
    room: 'Wohnen',
    func: 'Szene',
    icon: 'S2',
  });

  pushScene(dps.scene3, {
    id: 'scene3',
    alias: 'Szene 3',
    room: 'Wohnen',
    func: 'Szene',
    icon: 'S3',
  });

  pushScene(dps.scene4, {
    id: 'scene4',
    alias: 'Szene 4',
    room: 'Wohnen',
    func: 'Szene',
    icon: 'S4',
  });

  this.smartHomeDevices = devices;
  return this.smartHomeDevices;
}

async getSmartHomeDevicesWithState() {
  const devices = (this.smartHomeDevices && this.smartHomeDevices.length)
    ? this.smartHomeDevices
    : this.buildSmartHomeDevicesFromConfig();

  const result = [];
  for (const dev of devices) {
    const copy = JSON.parse(JSON.stringify(dev));
    copy.state = copy.state || {};

    // Schalter-Zustand lesen
    if (copy.io && copy.io.switch && copy.io.switch.readId) {
      try {
        const st = await this.getForeignStateAsync(copy.io.switch.readId);
        copy.state.on = !!(st && st.val);
      } catch (e) {
        this.log.warn(`SmartHome state read error (switch) for ${copy.id}: ${e.message}`);
        copy.state.on = false;
        copy.state.error = true;
      }
    }

    // Szenen: on -> active
if (copy.type === 'scene' && typeof copy.state.on !== 'undefined') {
  copy.state.active = !!copy.state.on;
}

// Level-Wert lesen (Dimmer / Jalousie / Prozentwerte)
    if (copy.io && copy.io.level && copy.io.level.readId) {
      try {
        const st = await this.getForeignStateAsync(copy.io.level.readId);
        let val = st && st.val;
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(',', '.'));
          if (!Number.isNaN(num)) {
            val = num;
          }
        }
        if (typeof val !== 'number' || Number.isNaN(val)) {
          val = 0;
        }
        copy.state.level = val;

        if (copy.type === 'dimmer') {
          const min = typeof copy.io.level.min === 'number' ? copy.io.level.min : 0;
          if (typeof copy.state.on === 'undefined') {
            copy.state.on = val > min;
          }
        }

        if (copy.type === 'blind') {
          copy.state.position = val;
        }
      } catch (e) {
        this.log.warn(`SmartHome state read error (level) for ${copy.id}: ${e.message}`);
        if (copy.type === 'dimmer') {
          copy.state.level = 0;
        }
        copy.state.error = true;
      }
    }

    // Klima-Werte lesen (RTR)
    if (copy.io && copy.io.climate) {
      const cl = copy.io.climate;

      // aktuelle Raumtemperatur
      if (cl.currentTempId) {
        try {
          const st = await this.getForeignStateAsync(cl.currentTempId);
          let val = st && st.val;
          if (typeof val === 'string') {
            const num = parseFloat(val.replace(',', '.'));
            if (!Number.isNaN(num)) val = num;
          }
          if (typeof val === 'number' && !Number.isNaN(val)) {
            copy.state.currentTemp = val;
          }
        } catch (e) {
          this.log.warn(`SmartHome climate currentTemp error for ${copy.id}: ${e.message}`);
        }
      }

      // Solltemperatur
      if (cl.setpointId) {
        try {
          const st = await this.getForeignStateAsync(cl.setpointId);
          let val = st && st.val;
          if (typeof val === 'string') {
            const num = parseFloat(val.replace(',', '.'));
            if (!Number.isNaN(num)) val = num;
          }
          if (typeof val === 'number' && !Number.isNaN(val)) {
            copy.state.setpoint = val;
          }
        } catch (e) {
          this.log.warn(`SmartHome climate setpoint error for ${copy.id}: ${e.message}`);
        }
      }

      // Modus
      if (cl.modeId) {
        try {
          const st = await this.getForeignStateAsync(cl.modeId);
          if (st && typeof st.val !== 'undefined') {
            copy.state.mode = st.val;
          }
        } catch (e) {
          this.log.warn(`SmartHome climate mode error for ${copy.id}: ${e.message}`);
        }
      }

      // Luftfeuchte
      if (cl.humidityId) {
        try {
          const st = await this.getForeignStateAsync(cl.humidityId);
          let val = st && st.val;
          if (typeof val === 'string') {
            const num = parseFloat(val.replace(',', '.'));
            if (!Number.isNaN(num)) val = num;
          }
          if (typeof val === 'number' && !Number.isNaN(val)) {
            copy.state.humidity = val;
          }
        } catch (e) {
          this.log.warn(`SmartHome climate humidity error for ${copy.id}: ${e.message}`);
        }
      }
    }

    // Sensor-Werte lesen (read-only)
    if (copy.io && copy.io.sensor && copy.io.sensor.readId) {
      try {
        const st = await this.getForeignStateAsync(copy.io.sensor.readId);
        let val = st && st.val;
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(',', '.'));
          if (!Number.isNaN(num)) val = num;
        }
        if (typeof val === 'number' && !Number.isNaN(val)) {
          copy.state.value = val;
        } else if (typeof val !== 'undefined') {
          copy.state.value = val;
        }
      } catch (e) {
        this.log.warn(`SmartHome sensor state error for ${copy.id}: ${e.message}`);
      }
    }

    result.push(copy);
  }
  return result;
}

async onReady() {
    try {
      // start web server
      await this.startServer();

      // create states first, then write config defaults
      await this.ensureInstallerStates();
      // cleanup: remove deprecated 'installer.password' object if present
      try { await this.delObjectAsync('installer.password'); } catch(_e) { /* ignore */ }

      await this.ensureSettingsStates();
      await this.syncInstallerConfigToStates();

      // write settings-config defaults
      await this.syncSettingsConfigToStates();
      // EVCS (multi wallbox) model states
      await this.ensureEvcsStates();
      await this.seedEvcsDayBaseCache();
      await this.subscribeEvcsMappedStates();


      // finally subscribe and read initial values
      await this.subscribeConfiguredStates();

      this.buildSmartHomeDevicesFromConfig();
      this.log.info('NexoWatt VIS adapter ready.');
    } catch (e) {
      this.log.error(`onReady error: ${e.message}`);
    }
  }

  async startServer() {
    const app = express();

    app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'index.html'));
    });

    app.use('/static', express.static(path.join(__dirname, 'www')));

// --- Static PWA assets ---
app.get('/manifest.webmanifest', (_req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'www', 'manifest.webmanifest'));
});
app.get('/sw.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'www', 'sw.js'));
});
app.get('/apple-touch-icon.png', (_req, res) => {
  res.type('image/png');
  res.sendFile(path.join(__dirname, 'www', 'apple-touch-icon.png'));
});
app.get('/favicon.ico', (_req, res) => {
  res.type('image/x-icon');
  res.sendFile(path.join(__dirname, 'www', 'assets', 'icons', 'nexowatt-32.png'));
});
app.use('/assets', express.static(path.join(__dirname, 'www', 'assets')));


    // JSON body parser
    app.use(bodyParser);


    // --- SmartHome page & API (erste Switch-Kachel) ---
    app.get(['/smarthome.html', '/smarthome'], (_req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'smarthome.html'));
    });

    app.get('/api/smarthome/devices', async (_req, res) => {
      try {
        const devices = await this.getSmartHomeDevicesWithState();
        res.json({ ok: true, devices });
      } catch (e) {
        this.log.warn('SmartHome devices API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    
app.post('/api/smarthome/toggle', async (req, res) => {
  try {
    const id = req.body && req.body.id;
    if (!id) {
      return res.status(400).json({ ok: false, error: 'missing id' });
    }
    const devices = (this.smartHomeDevices && this.smartHomeDevices.length)
      ? this.smartHomeDevices
      : this.buildSmartHomeDevicesFromConfig();
    const dev = devices.find(d => d.id === id);
    if (!dev || !dev.io) {
      return res.status(404).json({ ok: false, error: 'device not found or not toggleable' });
    }

    // Dimmer: Level 0 <-> max toggeln
    if (dev.type === 'dimmer' && dev.io.level && dev.io.level.readId) {
      const levelCfg = dev.io.level;
      const dpId = levelCfg.writeId || levelCfg.readId;
      const st = await this.getForeignStateAsync(dpId);
      let current = st && st.val;
      if (typeof current === 'string') {
        const num = parseFloat(current.replace(',', '.'));
        if (!Number.isNaN(num)) {
          current = num;
        }
      }
      if (typeof current !== 'number' || Number.isNaN(current)) {
        current = 0;
      }
      const min = typeof levelCfg.min === 'number' ? levelCfg.min : 0;
      const max = typeof levelCfg.max === 'number' ? levelCfg.max : 100;
      const next = current > min ? min : max;
      await this.setForeignStateAsync(dpId, next);
      return res.json({ ok: true, state: { level: next, on: next > min } });
    }

    // Default: Switch toggeln
    if (dev.io.switch && dev.io.switch.readId) {
      const dpId = dev.io.switch.writeId || dev.io.switch.readId;
      const st = await this.getForeignStateAsync(dpId);
      const current = !!(st && st.val);
      const next = !current;
      await this.setForeignStateAsync(dpId, next);
      return res.json({ ok: true, state: { on: next } });
    }

    return res.status(404).json({ ok: false, error: 'device not toggleable' });
  } catch (e) {
    this.log.warn('SmartHome toggle API error: ' + e.message);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// Level-API für Dimmer (Slider)
app.post('/api/smarthome/level', async (req, res) => {
  try {
    const id = req.body && req.body.id;
    let level = req.body && req.body.level;
    if (!id || (typeof level === 'undefined' || level === null)) {
      return res.status(400).json({ ok: false, error: 'missing id or level' });
    }

    const devices = (this.smartHomeDevices && this.smartHomeDevices.length)
      ? this.smartHomeDevices
      : this.buildSmartHomeDevicesFromConfig();
    const dev = devices.find(d => d.id === id);
    if (!dev || dev.type !== 'dimmer' || !dev.io || !dev.io.level || !dev.io.level.readId) {
      return res.status(404).json({ ok: false, error: 'device not found or not a dimmer' });
    }

    // level in Zahl umwandeln
    if (typeof level === 'string') {
      const num = parseFloat(level.replace(',', '.'));
      if (!Number.isNaN(num)) {
        level = num;
      }
    }
    if (typeof level !== 'number' || Number.isNaN(level)) {
      return res.status(400).json({ ok: false, error: 'invalid level' });
    }

    const levelCfg = dev.io.level;
    const min = typeof levelCfg.min === 'number' ? levelCfg.min : 0;
    const max = typeof levelCfg.max === 'number' ? levelCfg.max : 100;
    let target = Math.max(min, Math.min(max, level));

    const dpId = levelCfg.writeId || levelCfg.readId;
    await this.setForeignStateAsync(dpId, target);
    return res.json({ ok: true, state: { level: target, on: target > min } });
  } catch (e) {
    this.log.warn('SmartHome level API error: ' + e.message);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});


// Cover-API für Jalousie/Rollladen (Auf/Ab/Stop)
app.post('/api/smarthome/cover', async (req, res) => {
  try {
    const id = req.body && req.body.id;
    const action = req.body && req.body.action;
    if (!id || !action) {
      return res.status(400).json({ ok: false, error: 'missing id or action' });
    }

    const devices = (this.smartHomeDevices && this.smartHomeDevices.length)
      ? this.smartHomeDevices
      : this.buildSmartHomeDevicesFromConfig();
    const dev = devices.find(d => d.id === id);
    if (!dev || dev.type !== 'blind' || !dev.io || !dev.io.cover) {
      return res.status(404).json({ ok: false, error: 'device not found or not a blind/cover' });
    }

    const cover = dev.io.cover || {};
    let dpId;
    if (action === 'up') {
      dpId = cover.upId;
    } else if (action === 'down') {
      dpId = cover.downId;
    } else if (action === 'stop') {
      dpId = cover.stopId;
    } else {
      return res.status(400).json({ ok: false, error: 'invalid action' });
    }

    if (!dpId) {
      return res.status(404).json({ ok: false, error: 'no datapoint for action' });
    }

    await this.setForeignStateAsync(dpId, true);
    return res.json({ ok: true });
  } catch (e) {
    this.log.warn('SmartHome cover API error: ' + e.message);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});// RTR-Setpoint-API (Solltemperatur einstellen)
app.post('/api/smarthome/rtrSetpoint', async (req, res) => {
  try {
    const id = req.body && req.body.id;
    let setpoint = req.body && req.body.setpoint;
    if (!id || (typeof setpoint === 'undefined' || setpoint === null)) {
      return res.status(400).json({ ok: false, error: 'missing id or setpoint' });
    }

    const devices = (this.smartHomeDevices && this.smartHomeDevices.length)
      ? this.smartHomeDevices
      : this.buildSmartHomeDevicesFromConfig();
    const dev = devices.find(d => d.id === id);
    if (!dev || dev.type !== 'rtr' || !dev.io || !dev.io.climate || !dev.io.climate.setpointId) {
      return res.status(404).json({ ok: false, error: 'device not found or no setpoint' });
    }

    if (typeof setpoint === 'string') {
      const num = parseFloat(setpoint.replace(',', '.'));
      if (!Number.isNaN(num)) setpoint = num;
    }
    if (typeof setpoint !== 'number' || Number.isNaN(setpoint)) {
      return res.status(400).json({ ok: false, error: 'invalid setpoint' });
    }

    const cl = dev.io.climate;
    const min = typeof cl.minSetpoint === 'number' ? cl.minSetpoint : 15;
    const max = typeof cl.maxSetpoint === 'number' ? cl.maxSetpoint : 30;
    const target = Math.max(min, Math.min(max, setpoint));

    await this.setForeignStateAsync(cl.setpointId, target);
    return res.json({ ok: true, state: { setpoint: target } });
  } catch (e) {
    this.log.warn('SmartHome RTR setpoint API error: ' + e.message);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});



// --- SmartHomeConfig API (VIS-Konfig & Editor) ---
    app.get('/api/smarthome/config', (req, res) => {
      try {
        const cfg = this.getSmartHomeConfig ? this.getSmartHomeConfig() : (this.config && this.config.smartHomeConfig) || {};
        res.json({ ok: true, config: cfg });
      } catch (e) {
        this.log.warn('SmartHomeConfig API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    app.post('/api/smarthome/config', async (req, res) => {
      try {
        const body = req.body || {};
        const cfg = body.config;
        if (!cfg || typeof cfg !== 'object') {
          return res.status(400).json({ ok: false, error: 'invalid config payload' });
        }

        const out = {
          version: typeof cfg.version === 'number' ? cfg.version : 1,
          rooms: Array.isArray(cfg.rooms) ? cfg.rooms : [],
          functions: Array.isArray(cfg.functions) ? cfg.functions : [],
          devices: Array.isArray(cfg.devices) ? cfg.devices : [],
        };

        this.config = this.config || {};
        this.config.smartHomeConfig = out;

        let persisted = false;
        try {
          if (typeof this.getForeignObjectAsync === 'function' && typeof this.setForeignObjectAsync === 'function') {
            const instId = 'system.adapter.' + this.namespace;
              const instObj = await this.getForeignObjectAsync(instId);
            if (instObj) {
              instObj.native = instObj.native || {};
              instObj.native.smartHomeConfig = out;
              await this.setForeignObjectAsync(instId, instObj);
              persisted = true;
            } else {
              this.log.warn('SmartHomeConfig save: instance object not found: ' + instId);
            }
          } else {
            this.log.warn('SmartHomeConfig save: getForeignObjectAsync/setForeignObjectAsync not available');
          }
        } catch (e) {
          this.log.warn('SmartHomeConfig save (persist) error: ' + e.message);
        }

        if (typeof this.buildSmartHomeDevicesFromConfig === 'function') {
          try {
            this.buildSmartHomeDevicesFromConfig();
          } catch (e) {
            this.log.warn('SmartHomeConfig save: rebuild devices failed: ' + e.message);
          }
        }

        res.json({ ok: true, config: out, persisted });
      } catch (e) {
        this.log.warn('SmartHomeConfig save API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    
    app.get('/api/smarthome/dpsearch', async (req, res) => {
      try {
        const qRaw = (req.query && req.query.q) || '';
        const q = (typeof qRaw === 'string' ? qRaw : String(qRaw || '')).trim();
        const qLower = (q || '').toLowerCase();

        const limitRaw = (req.query && req.query.limit) || '';
        let limit = parseInt(limitRaw, 10);
        if (!Number.isFinite(limit) || limit <= 0 || limit > 200) limit = 100;

        if (typeof this.getForeignObjectsAsync !== 'function') {
          this.log.warn('SmartHomeConfig dpsearch: getForeignObjectsAsync not available');
          return res.json({ ok: false, error: 'datapoint search not supported' });
        }

        // Cache all state objects for a short period to avoid heavy DB reads while typing
        const now = Date.now();
        const ttlMs = 15000;
        if (!this._nwDpCache || !this._nwDpCache.ts || (now - this._nwDpCache.ts) > ttlMs) {
          const all = await this.getForeignObjectsAsync('*', 'state');
          const items = [];

          for (const id of Object.keys(all || {})) {
            const obj = all[id];
            if (!obj || !obj.common) continue;

            const nameRaw = obj.common.name || '';
            const name = typeof nameRaw === 'string' ? nameRaw : JSON.stringify(nameRaw);

            items.push({
              id,
              name,
              role: obj.common.role || '',
              type: obj.common.type || '',
              unit: obj.common.unit || '',
              idLower: String(id).toLowerCase(),
              nameLower: String(name).toLowerCase(),
            });
          }

          // Stable, user-friendly order
          items.sort((a, b) => a.idLower.localeCompare(b.idLower));
          this._nwDpCache = { ts: now, items };
        }

        const items = (this._nwDpCache && this._nwDpCache.items) ? this._nwDpCache.items : [];
        const results = [];
        const seen = new Set();

        function pushItem(it) {
          if (!it || !it.id || seen.has(it.id)) return;
          seen.add(it.id);
          results.push({
            id: it.id,
            name: it.name,
            role: it.role,
            type: it.type,
            unit: it.unit,
          });
        }

        if (!qLower) {
          // Browse-Mode: zeige zuerst typische Admin-Bereiche
          const preferredPrefixes = ['0_userdata.0.', 'alias.0.', 'javascript.0.'];
          for (const pref of preferredPrefixes) {
            for (const it of items) {
              if (!it.idLower.startsWith(pref)) continue;
              pushItem(it);
              if (results.length >= limit) break;
            }
            if (results.length >= limit) break;
          }

          if (results.length < limit) {
            for (const it of items) {
              pushItem(it);
              if (results.length >= limit) break;
            }
          }

          return res.json({ ok: true, results });
        }

        for (const it of items) {
          if (it.idLower.indexOf(qLower) !== -1 || it.nameLower.indexOf(qLower) !== -1) {
            pushItem(it);
            if (results.length >= limit) break;
          }
        }

        res.json({ ok: true, results });
      } catch (e) {
        this.log.warn('SmartHomeConfig dpsearch error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

// --- SmartHomeConfig Page (VIS-Konfig-Ansicht) ---
    app.get(['/smarthome-config.html', '/smarthome-config'], (req, res) => {
      try {
        const file = require('path').join(__dirname, 'www', 'smarthome-config.html');
        res.sendFile(file);
      } catch (e) {
        this.log.warn('SmartHomeConfig page error: ' + e.message);
        res.status(500).send('SmartHomeConfig page error');
      }
    });

// --- Logic (NexoLogic) API ---
app.get('/api/logic/blocks', async (_req, res) => {
  try {
    const blocks = [];

    // SmartHomeConfig-Szenen bevorzugt
    if (typeof this.getSmartHomeConfig === 'function') {
      const shc = this.getSmartHomeConfig();
      const rooms = Array.isArray(shc && shc.rooms) ? shc.rooms : [];
      const funcs = Array.isArray(shc && shc.functions) ? shc.functions : [];
      const devices = Array.isArray(shc && shc.devices) ? shc.devices : [];

      const resolveRoomName = (roomId) => {
        if (!roomId) return '';
        const r = rooms.find(rm => rm && rm.id === roomId);
        return (r && r.name) || roomId;
      };

      const resolveFunctionName = (fnId) => {
        if (!fnId) return '';
        const f = funcs.find(fn => fn && fn.id === fnId);
        return (f && f.name) || fnId;
      };

      devices
        .filter(dev => dev && dev.type === 'scene')
        .forEach(cfgDev => {
          const roomName = resolveRoomName(cfgDev.roomId);
          const fnName = resolveFunctionName(cfgDev.functionId);
          const behavior = cfgDev.behavior || {};
          const ioCfg = cfgDev.io || {};
          const sw = ioCfg.switch || {};
          const dpId = sw.writeId || sw.readId || '';

          blocks.push({
            id: cfgDev.id,
            name: cfgDev.alias || cfgDev.id,
            type: 'scene',
            category: 'Szene',
            room: roomName || 'Szene',
            function: fnName || 'Szene',
            enabled: behavior.enabled !== false,
            icon: cfgDev.icon || 'SC',
            description: cfgDev.description || '',
            source: {
              kind: 'smarthome.scene',
              smarthomeId: cfgDev.id,
              datapointId: dpId || null,
            },
          });
        });
    }

    // Fallback: Legacy-Szenen aus smartHome.datapoints.*, falls keine SmartHomeConfig-Szenen vorhanden
    if (!blocks.length) {
      const cfg = this.config || {};
      const smCfg = cfg.smartHome || {};
      const dps = smCfg.datapoints || {};

      const addSceneBlock = (dpId, id, alias) => {
        if (!dpId) return;
        blocks.push({
          id,
          name: alias,
          type: 'scene',
          category: 'Szene',
          room: 'Wohnen',
          function: 'Szene',
          enabled: true,
          icon: 'SC',
          source: {
            kind: 'smarthome.scene',
            smarthomeId: id,
            datapointId: dpId,
          },
        });
      };

      addSceneBlock(dps.scene1, 'scene1', 'Szene Wohlfühlen');
      addSceneBlock(dps.scene2, 'scene2', 'Szene Alles aus');
      addSceneBlock(dps.scene3, 'scene3', 'Szene 3');
      addSceneBlock(dps.scene4, 'scene4', 'Szene 4');
    }

    res.json({ ok: true, blocks });
  } catch (e) {
    this.log.warn('Logic blocks API error: ' + e.message);
    res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// --- Logic (NexoLogic) Page ---
app.get(['/logic.html','/logic'], (req, res) => {
  try {
    const file = require('path').join(__dirname, 'www', 'logic.html');
    res.sendFile(file);
  } catch (e) {
    this.log.warn('Logic page error: ' + e.message);
    res.status(500).send('Logic page error');
  }
});


// --- History page & API ---
    app.get(['/history.html','/history'], (req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'history.html'));
    });


    // --- Settings page ---
    app.get(['/settings.html','/settings'], (_req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'settings.html'));
    });

    
    // --- EVCS page ---
    app.get(['/evcs', '/evcs.html', '/history/evcs', '/history/evcs.html'], (_req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'evcs.html'));
    });

    // --- EVCS report page ---
    app.get(['/evcs-report.html','/evcs-report'], (req, res) => {
      const qs = (req && req.url && req.url.includes('?')) ? req.url.slice(req.url.indexOf('?')) : '';
      res.redirect('/static/evcs-report.html' + qs);
    });

app.get('/api/history', async (req, res) => {
      try {
        const hcfg = (this.config && this.config.history) || {};
        const inst = hcfg.instance || 'influxdb.0';
        const start = Number(req.query.from || (Date.now() - 24*3600*1000));
        const end   = Number(req.query.to   || Date.now());
        const stepS = Number(req.query.step || 60);
        const dp = Object.assign({}, hcfg.datapoints || {}, hcfg.dp || {});
        const ids = {
          pv: dp.pvPower, load: dp.consumptionTotal, buy: dp.gridBuyPower, sell: dp.gridSellPower,
          chg: dp.storageChargePower, dchg: dp.storageDischargePower, soc: dp.storageSoc,
          evcs: dp.evcsPower
        };
        const ask = (id) => new Promise(resolve => {
          if (!id) return resolve({id, values:[]});
          const options = { start, end, aggregate: 'none', addId: false, ignoreNull: true };
          try {
            this.sendTo(inst, 'getHistory', { id, options }, (resu) => {
              let outArr = [];
              if (Array.isArray(resu)) outArr = resu;
              else if (resu && Array.isArray(resu.result)) {
                if (resu.result.length && Array.isArray(resu.result[0]?.data)) {
                  outArr = resu.result[0].data;
                } else {
                  outArr = resu.result;
                }
              } else if (resu && Array.isArray(resu.series) && resu.series[0]?.values) {
                outArr = resu.series[0].values.map(v => ({ ts: v[0], val: v[1] }));
              } else if (resu && Array.isArray(resu.data)) {
                outArr = resu.data;
              }
              const norm = (outArr || []).map(p => Array.isArray(p) ? [p[0], Number(p[1])] : [p.ts || p.time || p.t || p[0], Number(p.val ?? p.value ?? p[1])]).filter(r => r[0]!=null && !Number.isNaN(r[1]));
              resolve({ id, values: norm });
            });
          } catch (e) {
            resolve({ id, values: [] });
          }
        });
        const out = {};
        out.pv   = await ask(ids.pv);
        out.load = await ask(ids.load);
        out.buy  = await ask(ids.buy);
        out.sell = await ask(ids.sell);
        out.chg  = await ask(ids.chg);
        out.dchg = await ask(ids.dchg);
        out.soc  = await ask(ids.soc);
        out.evcs = await ask(ids.evcs);
        res.json({ ok:true, start, end, step: stepS, series: out });
      } catch (e) {
        res.json({ ok:false, error: String(e) });
      }
    });

    

app.get('/api/evcs/report', async (req, res) => {
  try {
    const hcfg = (this.config && this.config.history) || {};
    const inst = hcfg.instance || 'influxdb.0';
    const fromQ = Number(req.query.from || (Date.now() - 7*24*3600*1000));
    const toQ   = Number(req.query.to   || Date.now());

    const d0 = new Date(fromQ); d0.setHours(0,0,0,0);
    const d1 = new Date(toQ);   d1.setHours(23,59,59,999);
    const start = +d0;
    const end   = +d1;

    const dayKeyOf = (ts) => {
      const d = new Date(ts);
      return String(d.getFullYear()) + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    };

    const buckets = [];
    for (let d = new Date(d0); +d <= +d1; d.setDate(d.getDate()+1)) {
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      buckets.push({ date: dayKeyOf(+s), start: +s, end: +e });
    }

    const evcs = Array.isArray(this.evcsList) ? this.evcsList : [];
    const wallboxes = evcs.map(wb => ({ index: wb.index, name: wb.name || `Wallbox ${wb.index}`, note: wb.note || '' }));

    const getHist = (id, startMs, endMs, aggregate = 'none', step = 0) => new Promise(resolve => {
      if (!id) return resolve([]);
      const options = { start: startMs, end: endMs, aggregate, addId: false, ignoreNull: true };
      if (step && Number(step) > 0) options.step = Number(step);
      try {
        this.sendTo(inst, 'getHistory', { id, options }, (resu) => {
          let outArr = [];
          if (Array.isArray(resu)) outArr = resu;
          else if (resu && Array.isArray(resu.result)) {
            if (resu.result.length && Array.isArray(resu.result[0]?.data)) outArr = resu.result[0].data;
            else outArr = resu.result;
          } else if (resu && Array.isArray(resu.series) && resu.series[0]?.values) {
            outArr = resu.series[0].values.map(v => ({ ts: v[0], val: v[1] }));
          } else if (resu && Array.isArray(resu.data)) {
            outArr = resu.data;
          }
          const norm = (outArr || [])
            .map(p => Array.isArray(p) ? [p[0], Number(p[1])] : [p.ts || p.time || p.t || p[0], Number(p.val ?? p.value ?? p[1])])
            .filter(r => r[0] != null && !Number.isNaN(r[1]))
            .map(r => [Number(r[0]), Number(r[1])])
            .sort((a,b)=>a[0]-b[0]);
          resolve(norm);
        });
      } catch (e) {
        resolve([]);
      }
    });

    const days = buckets.map(b => ({ date: b.date, totalKwh: 0, wallboxes: {} }));
    const dayIndex = {}; buckets.forEach((b, i) => { dayIndex[b.date] = i; });

    for (const wb of evcs) {
      const idx = wb.index;

      // Power series (W): max power + fallback integration
      const p = await getHist(wb.powerId, start, end, 'none');
      const pAgg = buckets.map(_b => ({ kwh: 0, maxW: 0 }));
      if (p && p.length >= 2) {
        let bi = 0;
        for (let j = 0; j < p.length - 1; j++) {
          const t0 = +p[j][0], v0 = +p[j][1];
          const t1 = +p[j+1][0], v1 = +p[j+1][1];
          if (!(t1 > t0)) continue;
          let segStart = t0;
          while (segStart < t1) {
            while (bi < buckets.length && !(segStart < buckets[bi].end)) bi++;
            if (bi >= buckets.length) break;
            const segEnd = Math.min(t1, buckets[bi].end);
            const a = Math.max(segStart, buckets[bi].start);
            const b = Math.min(segEnd, buckets[bi].end);
            if (b > a) {
              const vA = v0 + (v1 - v0) * ((a - t0) / (t1 - t0));
              const vB = v0 + (v1 - v0) * ((b - t0) / (t1 - t0));
              const dt = (b - a) / 1000;
              const avgW = (Math.abs(vA) + Math.abs(vB)) / 2;
              pAgg[bi].kwh += avgW * dt / 3600 / 1000;
              pAgg[bi].maxW = Math.max(pAgg[bi].maxW, Math.abs(vA), Math.abs(vB));
            }
            segStart = segEnd;
          }
        }
      }

      // Energy total series (kWh): preferred for daily energy (max-min)
      const e = await getHist(wb.energyTotalId, start, end, 'none');
      const eAgg = {}; // date -> {min,max}
      if (e && e.length) {
        for (const pt of e) {
          const t = +pt[0];
          const v = +pt[1];
          const dk = dayKeyOf(t);
          if (!(dk in dayIndex)) continue;
          if (!eAgg[dk]) eAgg[dk] = { min: v, max: v };
          eAgg[dk].min = Math.min(eAgg[dk].min, v);
          eAgg[dk].max = Math.max(eAgg[dk].max, v);
        }
      }

      for (let i = 0; i < buckets.length; i++) {
        const dk = buckets[i].date;
        const maxKw = pAgg[i].maxW ? (pAgg[i].maxW / 1000) : 0;
        let kwh = 0;

        if (eAgg[dk] && isFinite(eAgg[dk].min) && isFinite(eAgg[dk].max)) {
          kwh = Math.max(0, eAgg[dk].max - eAgg[dk].min);
        } else {
          kwh = Math.max(0, pAgg[i].kwh || 0);
        }

        days[i].wallboxes[idx] = { kwh: Math.round(kwh * 100) / 100, maxKw: Math.round(maxKw * 100) / 100 };
        days[i].totalKwh += kwh;
      }
    }

    days.forEach(d => { d.totalKwh = Math.round(d.totalKwh * 100) / 100; });

    res.json({ ok: true, start, end, wallboxes, days });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

// config for client
    
    // installer session data
    this._installerToken = this._installerToken || null;
    this._installerTokenExp = this._installerTokenExp || 0;

    const isInstallerAuthed = (req) => {
      const pw = getInstallerPassword(this);
      if (!pw) return true;
      const c = parseCookies(req);
      const ok = !!(c.installer_session &&
                    this._installerToken &&
                    c.installer_session === this._installerToken &&
                    Date.now() < this._installerTokenExp);
      return ok;
    };
app.get('/config', (req, res) => {
      res.json({
        units: this.config.units || { power: 'W', energy: 'kWh' },
        settings: this.config.settings || {},
        settingsConfig: {
          evcsCount: (this.config && this.config.settingsConfig && Number(this.config.settingsConfig.evcsCount)) || (this.evcsCount || 1),
          evcsMaxPowerKw: (this.config && this.config.settingsConfig && Number(this.config.settingsConfig.evcsMaxPowerKw)) || 11,
          evcsList: Array.isArray(this.evcsList) ? this.evcsList : []
        },
        smartHome: this.config.smartHome || {},
        installer: this.config.installer || {},
        adminUrl: this.config.adminUrl || null,
        installerLocked: !!(this.config.installerPassword)
      });
    });

    // snapshot
    app.get('/api/state', (_req, res) => {
      res.json(this.stateCache);
    });

    // login for installer
    
    app.post('/api/installer/login', (req, res) => {
      const pw = getInstallerPassword(this);
      const provided = (req.body && req.body.password) || '';
      if (!pw || provided === pw) {
        this._installerToken = createToken();
        this._installerTokenExp = Date.now() + 2*60*60*1000; // 2h
        res.setHeader('Set-Cookie', `installer_session=${encodeURIComponent(this._installerToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=7200`);
        return res.json({ ok: true });
      } else {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    });
// logout for installer
    app.post('/api/installer/logout', (_req, res) => {
      this._installerToken = null;
      this._installerTokenExp = 0;
      res.setHeader('Set-Cookie', 'installer_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
      res.json({ ok: true });
    });


    // generic setter for settings/installer datapoints
    app.post('/api/set', async (req, res) => {
      try {
        const scope = req.body && req.body.scope;
        const key = req.body && req.body.key;
        const value = req.body && req.body.value;
        if (!scope || !key) return res.status(400).json({ ok: false, error: 'bad request' });
        // EVCS setter: write directly to mapped foreign datapoints (per wallbox)
        if (scope === 'evcs') {
          const k = String(key || '');
          const m = k.match(/^(?:evcs\.)?(\d+)\.(active|mode)$/);
          if (!m) return res.status(400).json({ ok: false, error: 'bad request' });
          const idx = Math.max(1, Math.round(Number(m[1] || 0)));
          const prop = m[2];
          const list = Array.isArray(this.evcsList) ? this.evcsList : [];
          const wb = list.find(w => Number(w.index) === idx);
          const id = prop === 'active' ? (wb && wb.activeId) : (wb && wb.modeId);
          if (!id) return res.status(400).json({ ok: false, error: 'unmapped' });
          const v = prop === 'active' ? !!value : Number(value);
          await this.setForeignStateAsync(id, v);
          return res.json({ ok: true });
        }

        let map = {};
        if (scope === 'installer') {
          if (!isInstallerAuthed(req)) return res.status(403).json({ ok: false, error: 'forbidden' });
          map = (this.config && this.config.installer) || {};
        
        } else {
          map = (this.config && this.config.settings) || {};
        }
        const mapped = map[key];
        const id = (typeof mapped === 'string' && mapped.trim()) ? mapped.trim() : '';
        if (id) {
          await this.setForeignStateAsync(id, value);
        } else {
          const localId = (scope === 'installer' ? 'installer.'+key : 'settings.'+key);
          await this.setStateAsync(localId, { val: value, ack: false });
        }
        res.json({ ok: true });
      } catch (e) {
        this.log.warn('set error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    // server-sent events for live updates
    app.get('/events', (req, res) => {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.flushHeaders();

      const client = { res };
      this.sseClients.add(client);

      // send initial payload
      res.write("data: " + JSON.stringify({ type: 'init', payload: this.stateCache }) + "\n\n");

      req.on('close', () => {
        this.sseClients.delete(client);
      });
    });

    const bind = (this.config && this.config.bind) || '0.0.0.0';
    const port = (this.config && this.config.port) || 8188;

    await new Promise((resolve) => {
      this.server = app.listen(port, bind, () => {
        this.log.info(`Dashboard available at http://${bind}:${port}`);
        resolve();
      });
    });
  }

  async subscribeConfiguredStates() {
    const dps = (this.config && this.config.datapoints) || {};
    const settings = (this.config && this.config.settings) || {};
    const installer = (this.config && this.config.installer) || {};
        const namespace = this.namespace + '.';
    const settingsLocalKeys = ['notifyEnabled','email','dynamicTariff','storagePower','price','priority','tariffMode','evcsMaxPower','evcsCount'];
    const keys = [
      ...Object.keys(dps),
      // always include built-in local settings keys so UI keeps values on reload
      ...settingsLocalKeys.map(k => 'settings.' + k),
      // include any mapped external settings and installer keys
      ...Object.keys(settings).map(k => 'settings.' + k),
      ...Object.keys(installer).map(k => 'installer.' + k),
    ];

    for (const key of keys) {
      let id;
      if (key.startsWith('settings.')) id = settings[key.slice(9)];
      else if (key.startsWith('installer.')) id = installer[key.slice(10)];
      else id = dps[key];

      // Only treat mapped entries as datapoint IDs if they are non-empty strings.
      if (typeof id === 'string') id = id.trim();
      else id = null;

      // For settings.* keys, fall back to local adapter states so UI preferences remain usable even without external mappings.
      if (!id && key.startsWith('settings.')) id = namespace + key;

      if (!id) continue;

      // subscribe
      this.subscribeForeignStates(id);

      // get initial value
      try {
        const state = await this.getForeignStateAsync(id);
        if (state && state.val !== undefined) {
          this.updateValue(key, state.val, state.ts);
        }
      } catch (e) {
        this.log.warn(`Cannot read initial state for ${key} (${id}): ${e.message}`);
      }
    }
  }

  onStateChange(id, state) {
    if (!state) return;
    try {
      const key = this.keyFromId(id);
      if (key) {
        this.updateValue(key, state.val, state.ts);
      }
        if (key && key.startsWith('evcs.')) this.setStateAsync(key, state.val, true).catch(()=>{});
    } catch (e) {
      this.log.error(`onStateChange error: ${e.message}`);
    }
  }

  keyFromId(id) {
    if (this.evcsIdToKey && id && this.evcsIdToKey[id]) return this.evcsIdToKey[id];
    const dps = (this.config && this.config.datapoints) || {};
    for (const [key, dpId] of Object.entries(dps)) { if (dpId === id) return key; }
    const settings = (this.config && this.config.settings) || {};
    for (const [k, dpId] of Object.entries(settings)) { if (typeof dpId === 'string' && dpId === id) return 'settings.' + k; }
    const installer = (this.config && this.config.installer) || {};
    for (const [k, dpId] of Object.entries(installer)) { if (typeof dpId === 'string' && dpId === id) return 'installer.' + k; }
    
    // direct mapping for local states
    const prefS = this.namespace + '.settings.';
    const prefI = this.namespace + '.installer.';
    const prefE = this.namespace + '.evcs.';
    if (id && id.startsWith(prefS)) return 'settings.' + id.slice(prefS.length);
    if (id && id.startsWith(prefI)) return 'installer.' + id.slice(prefI.length);
    if (id && id.startsWith(prefE)) return 'evcs.' + id.slice(prefE.length);
    return null;
  }

  updateValue(key, value, ts) {
    this.stateCache[key] = { value, ts };

    const payload = { [key]: this.stateCache[key] };

    // derived EVCS aggregates
    try {
      if (/^evcs\.\d+\.powerW$/.test(key)) {
        const count = Number(this.evcsCount || 1) || 1;
        let sum = 0;
        for (let i = 1; i <= count; i++) {
          const v = this.stateCache[`evcs.${i}.powerW`]?.value;
          sum += Number(v || 0) || 0;
        }
        this.stateCache['evcs.totalPowerW'] = { value: sum, ts };
        payload['evcs.totalPowerW'] = this.stateCache['evcs.totalPowerW'];
        // persist as adapter state for other consumers
        this.setStateAsync('evcs.totalPowerW', sum, true).catch(()=>{});
      }
    

      const mEnergy = key.match(/^evcs\.(\d+)\.energyTotalKwh$/);
      if (mEnergy) {
        const idx = Number(mEnergy[1]);
        const total = Number(value) || 0;
        const d = new Date(ts || Date.now());
        const dayKey = String(d.getFullYear()) + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const baseK = `evcs.${idx}._dayBaseKwh`;
        const baseD = `evcs.${idx}._dayBaseDate`;
        let baseDate = this.stateCache[baseD]?.value;
        let base = Number(this.stateCache[baseK]?.value);
        if (!baseDate || baseDate !== dayKey || !Number.isFinite(base) || total < base) {
          baseDate = dayKey;
          base = total;
          this.stateCache[baseD] = { value: baseDate, ts };
          this.stateCache[baseK] = { value: base, ts };
          payload[baseD] = this.stateCache[baseD];
          payload[baseK] = this.stateCache[baseK];
          this.setStateAsync(baseD, baseDate, true).catch(()=>{});
          this.setStateAsync(baseK, base, true).catch(()=>{});
        }
        const dayKwh = Math.max(0, total - base);
        this.stateCache[`evcs.${idx}.energyDayKwh`] = { value: dayKwh, ts };
        payload[`evcs.${idx}.energyDayKwh`] = this.stateCache[`evcs.${idx}.energyDayKwh`];
        this.setStateAsync(`evcs.${idx}.energyDayKwh`, dayKwh, true).catch(()=>{});
      }
} catch(_e) {}

    // push update to all SSE clients
    for (const client of Array.from(this.sseClients)) {
      try {
        client.res.write("data: " + JSON.stringify({ type: 'update', payload }) + "\n\n");
      } catch (e) {
        // remove broken clients
        this.sseClients.delete(client);
      }
    }
  }

  onUnload(callback) {
    try {
      if (this.server) this.server.close();
      callback();
    } catch (e) {
      callback();
    }
  }
}

if (module.parent) {
  module.exports = (options) => new NexoWattVis(options);
} else {
  // For local dev run
  new NexoWattVis();
}
