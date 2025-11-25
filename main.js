
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

    this.smartHomeEnumKeyById = {};
    this.smartHomeEnumIds = new Set();

    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.on('message', this.onMessage.bind(this));
  }

  

  /**
   * Handle messages from admin (jsonConfig sendTo).
   * Used e.g. to open SmartHome config page with correct host/IP.
   * @param {object} obj
   */
  onMessage(obj) {
    if (!obj) {
      return;
    }
    const command = obj.command;
    const message = obj.message || {};

    switch (command) {
      case 'openSmartHomeConfig': {
        try {
          const origin = message.origin || message._origin || '';
          const originIp = message.originIp || message._originIp;

          // Determine protocol (http/https)
          let protocol = 'http';
          if (origin.startsWith('https://')) {
            protocol = 'https';
          } else if (origin.startsWith('http://')) {
            protocol = 'http';
          } else if (this.config && this.config.secure) {
            protocol = 'https';
          }

          // Determine host (IP or hostname)
          let host = originIp;
          if (!host && origin) {
            const m = origin.match(/^https?:\/\/([^:/]+)(?::\d+)?/);
            if (m) {
              host = m[1];
            }
          }
          if (!host) {
            host = '127.0.0.1';
          }

          // Use adapter port (same as dashboard / SmartHome page)
          const port = (this.config && this.config.port) || 8188;

          const url = `${protocol}://${host}:${port}/smarthome-config`;
          this.log.debug(`openSmartHomeConfig -> ${url}`);

          if (obj.callback) {
            obj.callback({ openUrl: url, window: '_blank' });
          }
        } catch (e) {
          this.log.error(`Error in openSmartHomeConfig: ${e.message}`);
          if (obj.callback) {
            obj.callback({ error: e.message });
          }
        }
        break;
      }

      default: {
        // Unknown command; just answer if callback is requested
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, {}, obj.callback);
        }
        break;
      }
    }
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

  async ensureSmartHomeStates() {
    // State to expose SmartHome structure built from enum.rooms / enum.functions
    await this.setObjectNotExistsAsync('smartHome.structure', {
      type: 'state',
      common: {
        name: 'SmartHome structure',
        type: 'string',
        role: 'json',
        read: true,
        write: false,
        def: '{}'
      },
      native: {}
    });
  }

  async buildSmartHomeStructureFromEnums() {
    try {
      // Read all room enums and function enums
      const roomEnums = await this.getForeignObjectsAsync('enum.rooms.*', 'enum');
      const functionEnums = await this.getForeignObjectsAsync('enum.functions.*', 'enum');

      const rooms = {};
      const roomByStateId = {};

      const channelStateCache = {};

      // Expand enum member (state/channel/device) to a list of concrete state IDs
      const expandToStateIds = async (id) => {
        try {
          const obj = await this.getForeignObjectAsync(id);
          if (!obj) return [];
          if (obj.type === 'state') return [id];
          if (obj.type === 'channel' || obj.type === 'device') {
            if (channelStateCache[id]) return channelStateCache[id];
            const states = await this.getForeignObjectsAsync(id + '.*', 'state');
            const ids = Object.keys(states || {});
            channelStateCache[id] = ids;
            return ids;
          }
        } catch (e) {
          this.log.debug && this.log.debug('SmartHome expandToStateIds error for ' + id + ': ' + e);
        }
        return [];
      };

      // Build base room objects and a mapping from stateId -> roomKey[]
      for (const [enumId, obj] of Object.entries(roomEnums || {})) {
        if (!obj || !obj.common) continue;

        const roomKeyParts = enumId.split('.');
        const roomKey = roomKeyParts[roomKeyParts.length - 1] || enumId;
        const roomName = obj.common.name || roomKey;

        if (!rooms[roomKey]) {
          rooms[roomKey] = {
            id: enumId,
            name: roomName,
            functions: {}
          };
        }

        const members = Array.isArray(obj.common.members) ? obj.common.members : [];
        for (const memberId of members) {
          const stateIds = await expandToStateIds(memberId);
          const effectiveIds = (stateIds && stateIds.length) ? stateIds : [memberId];

          for (const stateId of effectiveIds) {
            if (!roomByStateId[stateId]) {
              roomByStateId[stateId] = [];
            }
            roomByStateId[stateId].push(roomKey);
          }
        }
      }

      // Assign function enums to rooms based on their members
      for (const [enumId, obj] of Object.entries(functionEnums || {})) {
        if (!obj || !obj.common) continue;

        const funcKeyParts = enumId.split('.');
        const funcKey = funcKeyParts[funcKeyParts.length - 1] || enumId;

        // human readable function name (handles multi-lang objects and fallback mapping)
        let funcName = obj.common.name || funcKey;
        if (funcName && typeof funcName === 'object') {
          funcName = funcName.de || funcName.en || Object.values(funcName)[0] || funcKey;
        }
        const funcFallbacks = {
          lighting: 'Beleuchtung',
          shading: 'Beschattung',
          climate: 'Klima',
          heating: 'Heizung',
          security: 'Sicherheit'
        };
        if (!funcName || funcName === funcKey) {
          if (funcFallbacks[funcKey]) funcName = funcFallbacks[funcKey];
        }

        const members = Array.isArray(obj.common.members) ? obj.common.members : [];
        for (const memberId of members) {
          const stateIds = await expandToStateIds(memberId);
          const effectiveIds = (stateIds && stateIds.length) ? stateIds : [memberId];

          for (const stateId of effectiveIds) {
            const assignedRooms = roomByStateId[stateId] || roomByStateId[memberId] || ['_noRoom_'];

            for (const roomKey of assignedRooms) {
              if (!rooms[roomKey]) {
                // If a state is in a function enum, but not in any room enum
                rooms[roomKey] = {
                  id: roomKey === '_noRoom_' ? null : 'enum.rooms.' + roomKey,
                  name: roomKey === '_noRoom_' ? 'Ohne Raum' : roomKey,
                  functions: {}
                };
              }

              if (!rooms[roomKey].functions[funcKey]) {
                rooms[roomKey].functions[funcKey] = [];
              }

              if (!rooms[roomKey].functionNames) {
                rooms[roomKey].functionNames = {};
              }
              rooms[roomKey].functionNames[funcKey] = funcName;

              rooms[roomKey].functions[funcKey].push({
                id: stateId
              });
            }
          }
        }
      }

      // Collect all state IDs we need metadata for
      const neededStateIds = new Set();
      for (const room of Object.values(rooms)) {
        for (const funcKey of Object.keys(room.functions)) {
          for (const entry of room.functions[funcKey]) {
            if (entry && entry.id) {
              neededStateIds.add(entry.id);
            }
          }
        }
      }

      // Load foreign state objects to get human readable name / role
      const stateObjects = {};
      for (const id of neededStateIds) {
        try {
          const obj = await this.getForeignObjectAsync(id);
          if (obj) {
            stateObjects[id] = obj;
          }
        } catch (e) {
          // ignore missing objects
          this.log.debug && this.log.debug('Could not read foreign object for SmartHome enum state ' + id + ': ' + e);
        }
      }

      // Enrich entries with name / role and assign dynamic keys for VIS
      const enumKeyById = {};
      let enumIdx = 0;
      for (const room of Object.values(rooms)) {
        for (const funcKey of Object.keys(room.functions)) {
          room.functions[funcKey] = room.functions[funcKey].map(entry => {
            const obj = stateObjects[entry.id];
            if (!enumKeyById[entry.id]) {
              enumKeyById[entry.id] = 'smartEnum_' + (enumIdx++);
            }
            const common = obj && obj.common || {};
            return {
              id: entry.id,
              key: enumKeyById[entry.id],
              name: common && common.name ? common.name : entry.id,
              role: common && common.role ? common.role : '',
              type: common && common.type ? common.type : '',
              write: !!(common && common.write),
              min: common && (typeof common.min === 'number') ? common.min : null,
              max: common && (typeof common.max === 'number') ? common.max : null,
              unit: common && common.unit ? common.unit : ''
            };
          });
        }
      }

      // store mapping for later state-change handling
      this.smartHomeEnumKeyById = enumKeyById;
      this.smartHomeEnumIds = new Set(Object.keys(enumKeyById));

      // subscribe to all SmartHome enum states and push initial values
      for (const [id, key] of Object.entries(enumKeyById)) {
        try {
          this.subscribeForeignStates(id);
          const st = await this.getForeignStateAsync(id);
          if (st && st.val !== undefined) {
            this.updateValue(key, st.val, st.ts || Date.now());
          }
        } catch (e) {
          this.log.debug && this.log.debug('Could not subscribe/read SmartHome enum state ' + id + ': ' + e);
        }
      }

      // Finally, write JSON structure to state
      const jsonRooms = JSON.stringify(rooms);
      await this.setStateAsync('smartHome.structure', {
        val: jsonRooms,
        ack: true
      });

      // Also push structure into live state cache for VIS clients
      try {
        this.updateValue('smartHome.structure', jsonRooms, Date.now());
      } catch (e) {
        this.log.debug && this.log.debug('Could not push SmartHome structure to state cache: ' + e);
      }

      this.log.info('SmartHome structure from enums built with ' + Object.keys(rooms).length + ' rooms.');
    } catch (err) {
      this.log.error('Error while building SmartHome structure from enums: ' + err);
    }
  }

  async buildSmartHomeStructureFromConfig() {
    try {
      const cfg = (this.config && this.config.smartHome) || {};
      const roomsCfg = Array.isArray(cfg.rooms) ? cfg.rooms : [];
      const devicesCfg = Array.isArray(cfg.devices) ? cfg.devices : [];

      // Wenn nichts konfiguriert ist, auf alte Enum-Logik zurückfallen
      if (!roomsCfg.length && !devicesCfg.length) {
        this.log.info('SmartHome: keine Räume/Geräte in der Instanzkonfiguration gefunden, verwende Enums.');
        return this.buildSmartHomeStructureFromEnums();
      }

      const rooms = {};
      let autoRoomIdx = 0;

      // Räume aus der Konfiguration übernehmen
      for (const r of roomsCfg) {
        if (!r) continue;
        let key = '';
        if (r.id && typeof r.id === 'string') {
          key = r.id.trim();
        }
        if (!key && r.name) {
          if (typeof r.name === 'string') {
            key = r.name.trim();
          } else if (typeof r.name === 'object') {
            key = r.name.de || r.name.en || '';
          }
        }
        if (!key) {
          key = 'room_' + (autoRoomIdx++);
        }
        const name = r.name && r.name !== '' ? r.name : key;
        const icon = r.icon || '';

        if (!rooms[key]) {
          rooms[key] = {
            id: key,
            name,
            icon,
            functions: {},
            functionNames: {}
          };
        } else {
          if (!rooms[key].name) rooms[key].name = name;
          if (!rooms[key].icon && icon) rooms[key].icon = icon;
        }
      }

      const funcNameFallbacks = {
        switch: 'Schalten',
        light: 'Beleuchtung',
        dimmer: 'Beleuchtung',
        sensor: 'Sensoren',
        climate: 'Klima',
        cover: 'Beschattung',
        thermostat: 'Heizung',
        window: 'Fenster',
        status: 'Status',
        generic: 'Funktion'
      };

      const ensureRoom = (roomIdRaw) => {
        let key = (roomIdRaw && String(roomIdRaw).trim()) || '_noRoom_';
        if (!rooms[key]) {
          const name = key === '_noRoom_' ? 'Ohne Raum' : roomIdRaw;
          rooms[key] = {
            id: key === '_noRoom_' ? null : key,
            name,
            functions: {},
            functionNames: {}
          };
        }
        return rooms[key];
      };

      let usedDevices = 0;

      // Geräte/Funktionen aus der Konfiguration übernehmen
      for (const dev of devicesCfg) {
        if (!dev) continue;

        const id = dev.controlId || dev.statusId || dev.levelId || dev.setpointId || dev.actualId;
        if (!id) {
          this.log.debug && this.log.debug('SmartHome-Konfiguration: Gerät ohne gültigen Datenpunkt übersprungen: ' + JSON.stringify(dev));
          continue;
        }

        const room = ensureRoom(dev.roomId || '_noRoom_');
        const funcKey = (dev.type || 'generic').toLowerCase();
        const funcName = funcNameFallbacks[funcKey] || funcKey || 'Funktion';

        if (!room.functions[funcKey]) {
          room.functions[funcKey] = [];
        }
        if (!room.functionNames) {
          room.functionNames = {};
        }
        if (!room.functionNames[funcKey]) {
          room.functionNames[funcKey] = funcName;
        }

        room.functions[funcKey].push({ id });
        usedDevices++;
      }

      if (!Object.keys(rooms).length || !usedDevices) {
        this.log.info('SmartHome-Konfiguration enthält keine nutzbaren Räume/Geräte. Leere Struktur geschrieben.');
        const emptyJson = '{}';
        await this.setStateAsync('smartHome.structure', { val: emptyJson, ack: true });
        try {
          this.updateValue('smartHome.structure', emptyJson, Date.now());
        } catch (e) {
          this.log.debug && this.log.debug('Could not push empty SmartHome structure to state cache: ' + e);
        }
        return;
      }

// Collect all state IDs we need metadata for
      const neededStateIds = new Set();
      for (const room of Object.values(rooms)) {
        for (const funcKey of Object.keys(room.functions)) {
          for (const entry of room.functions[funcKey]) {
            if (entry && entry.id) {
              neededStateIds.add(entry.id);
            }
          }
        }
      }

      // Load foreign state objects to get human readable name / role
      const stateObjects = {};
      for (const id of neededStateIds) {
        try {
          const obj = await this.getForeignObjectAsync(id);
          if (obj) {
            stateObjects[id] = obj;
          }
        } catch (e) {
          // ignore missing objects
          this.log.debug && this.log.debug('Could not read foreign object for SmartHome enum state ' + id + ': ' + e);
        }
      }

      // Enrich entries with name / role and assign dynamic keys for VIS
      const enumKeyById = {};
      let enumIdx = 0;
      for (const room of Object.values(rooms)) {
        for (const funcKey of Object.keys(room.functions)) {
          room.functions[funcKey] = room.functions[funcKey].map(entry => {
            const obj = stateObjects[entry.id];
            if (!enumKeyById[entry.id]) {
              enumKeyById[entry.id] = 'smartEnum_' + (enumIdx++);
            }
            const common = obj && obj.common || {};
            return {
              id: entry.id,
              key: enumKeyById[entry.id],
              name: common && common.name ? common.name : entry.id,
              role: common && common.role ? common.role : '',
              type: common && common.type ? common.type : '',
              write: !!(common && common.write),
              min: common && (typeof common.min === 'number') ? common.min : null,
              max: common && (typeof common.max === 'number') ? common.max : null,
              unit: common && common.unit ? common.unit : ''
            };
          });
        }
      }

      // store mapping for later state-change handling
      this.smartHomeEnumKeyById = enumKeyById;
      this.smartHomeEnumIds = new Set(Object.keys(enumKeyById));

      // subscribe to all SmartHome enum states and push initial values
      for (const [id, key] of Object.entries(enumKeyById)) {
        try {
          this.subscribeForeignStates(id);
          const st = await this.getForeignStateAsync(id);
          if (st && st.val !== undefined) {
            this.updateValue(key, st.val, st.ts || Date.now());
          }
        } catch (e) {
          this.log.debug && this.log.debug('Could not subscribe/read SmartHome enum state ' + id + ': ' + e);
        }
      }

      // Finally, write JSON structure to state
      const jsonRooms = JSON.stringify(rooms);
      await this.setStateAsync('smartHome.structure', {
        val: jsonRooms,
        ack: true
      });

      // Also push structure into live state cache for VIS clients
      try {
        this.updateValue('smartHome.structure', jsonRooms, Date.now());
      } catch (e) {
        this.log.debug && this.log.debug('Could not push SmartHome structure to state cache: ' + e);
      }

      
      this.log.info('SmartHome structure from config built with ' + Object.keys(rooms).length + ' rooms.');
    } catch (err) {
      this.log.error('Error while building SmartHome structure from config: ' + err);
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
    try {
      await this.setStateAsync('settings.evcsMaxPower', { val: ratedW, ack: true });
    } catch(e) {
      this.log.warn('syncSettingsConfigToStates: ' + e.message);
    }
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
      await this.ensureSmartHomeStates();
      await this.syncInstallerConfigToStates();

      // write settings-config defaults
      await this.syncSettingsConfigToStates();

      // build SmartHome structure on every start
      // (VIS entscheidet separat, ob der SmartHome-Tab sichtbar ist)
      try {
        await this.buildSmartHomeStructureFromConfig();
      } catch (e) {
        this.log.error('Failed to build SmartHome structure from config: ' + e);
      }

      // finally subscribe and read initial values
      await this.subscribeConfiguredStates();

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

    // SmartHome Config Page
    app.get('/smarthome-config', (_req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'smarthome-config.html'));
    });

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


    
    // Simple ioBroker object search API for SmartHome config page
    app.get('/api/iobroker/objects', async (req, res) => {
      try {
        const q = (req.query && req.query.q ? String(req.query.q) : '').trim();
        const limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) || 50 : 50;

        if (!q || q.length < 2) {
          return res.json({ ok: true, objects: [] });
        }

        const pattern = '*' + q + '*';
        const objs = await this.getForeignObjectsAsync(pattern, 'state');
        const list = [];

        if (objs && typeof objs === 'object') {
          for (const id of Object.keys(objs)) {
            const obj = objs[id] || {};
            const common = obj.common || {};
            let name = common.name;
            if (name && typeof name === 'object') {
              name = name.de || name.en || name['en-US'] || Object.values(name)[0];
            }
            if (typeof name !== 'string') {
              name = '';
            }
            list.push({
              id,
              name,
              role: common.role || '',
              type: obj.type || ''
            });
            if (list.length >= limit) break;
          }
        }

        res.json({ ok: true, objects: list });
      } catch (e) {
        this.log.error('Error in GET /api/iobroker/objects: ' + e);
        res.status(500).json({ ok: false, error: 'Internal error' });
      }
    });

    // SmartHome configuration API
    app.get('/api/smarthome/config', (_req, res) => {
      try {
        const cfg = (this.config && this.config.smartHome) || {};
        res.json({ ok: true, smartHome: cfg });
      } catch (e) {
        this.log.error('Error in GET /api/smarthome/config: ' + e);
        res.status(500).json({ ok: false, error: 'Internal error' });
      }
    });

    app.post('/api/smarthome/config', bodyParser, async (req, res) => {
      try {
        const body = req.body || {};
        const newCfg = body.smartHome;
        if (!newCfg || typeof newCfg !== 'object') {
          return res.status(400).json({ ok: false, error: 'smartHome config missing or invalid' });
        }

        // Auto-map simple datapoints[] into devices[] if rooms/devices are still empty.
        // This allows you to maintain a simple table in the SmartHome config page,
        // while the backend builds the full rooms/devices structure for the VIS.
        try {
          if (Array.isArray(newCfg.datapoints)) {
            const devices = [];
            for (const dp of newCfg.datapoints) {
              if (!dp || !dp.id) continue;
              if (dp.enabled === false) continue;

              const roomLabel = (dp.room && dp.room.toString().trim()) || '';
              const roomId = roomLabel || '_noRoom_';

              let devType = 'generic';
              if (dp.widget && typeof dp.widget === 'string' && dp.widget.trim()) {
                devType = dp.widget.trim();
              } else if (dp.function && typeof dp.function === 'string' && dp.function.trim()) {
                devType = dp.function.trim();
              }

              const isDimmer = devType === 'dimmer';

              const controlId = isDimmer
                ? (dp.switchId || dp.id || '')
                : (dp.id || '');

              const levelId = isDimmer
                ? (dp.levelId || dp.id || '')
                : (dp.levelId || '');

              devices.push({
                roomId,
                type: devType,
                controlId,
                statusId: dp.statusId || '',
                levelId,
                setpointId: dp.setpointId || '',
                actualId: dp.actualId || ''
              });
            }

            if (devices.length && (!Array.isArray(newCfg.devices) || !newCfg.devices.length)) {
              newCfg.devices = devices;
            }
          }
        } catch (e) {
          this.log.error('Error while normalizing SmartHome config: ' + e);
        }

        const objId = 'system.adapter.' + this.namespace;
        const obj = await this.getForeignObjectAsync(objId);
        if (!obj || typeof obj !== 'object') {
          return res.status(500).json({ ok: false, error: 'Adapter object not found' });
        }
        if (!obj.native) obj.native = {};
        obj.native.smartHome = newCfg;

        await this.setForeignObjectAsync(objId, obj);

        if (!this.config) this.config = {};
        this.config.smartHome = newCfg;
        if (typeof this.buildSmartHomeStructureFromConfig === 'function') {
          await this.buildSmartHomeStructureFromConfig();
        }

        res.json({ ok: true });
      } catch (e) {
        this.log.error('Error in POST /api/smarthome/config: ' + e);
        res.status(500).json({ ok: false, error: 'Internal error' });
      }
    });


    // JSON body parser
    app.use(bodyParser);

    // --- History page & API ---
    app.get(['/history.html','/history'], (req, res) => {
      res.sendFile(path.join(__dirname, 'www', 'history.html'));
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
          chg: dp.storageChargePower, dchg: dp.storageDischargePower, soc: dp.storageSoc
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
        res.json({ ok:true, start, end, step: stepS, series: out });
      } catch (e) {
        res.json({ ok:false, error: String(e) });
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
        installer: this.config.installer || {},
        adminUrl: this.config.adminUrl || null,
        installerLocked: !!(this.config.installerPassword),
        smartHome: this.config.smartHome || {}
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
        let map = {};
        if (scope === 'installer') {
          if (!isInstallerAuthed(req)) return res.status(403).json({ ok: false, error: 'forbidden' });
          map = (this.config && this.config.installer) || {};
        } else if (scope === 'smartHome') {
          const sh = (this.config && this.config.smartHome && this.config.smartHome.datapoints) || {};
          map = sh;
        } else {
          map = (this.config && this.config.settings) || {};
        }
        const id = map[key];
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

    // generic SmartHome enum control endpoint (auto-generated entities)
    app.post('/api/smartHome/command', async (req, res) => {
      try {
        const id = req.body && req.body.id;
        const value = req.body && req.body.value;
        if (!id) return res.status(400).json({ ok: false, error: 'missing id' });
        await this.setForeignStateAsync(id, value);
        res.json({ ok: true });
      } catch (e) {
        this.log.warn('smartHome command error: ' + e.message);
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
    const smartHome = (this.config && this.config.smartHome && this.config.smartHome.datapoints) || {};
        const namespace = this.namespace + '.';
    const settingsLocalKeys = ['notifyEnabled','email','dynamicTariff','storagePower','price','priority','tariffMode','evcsMaxPower'];
    const keys = [
      ...Object.keys(dps),
      // always include built-in local settings keys so UI keeps values on reload
      ...settingsLocalKeys.map(k => 'settings.' + k),
      // include any mapped external settings and installer keys
      ...Object.keys(settings).map(k => 'settings.' + k),
      ...Object.keys(installer).map(k => 'installer.' + k),
      ...Object.keys(smartHome).map(k => 'smartHome_' + k),
    ];

    for (const key of keys) {
      let id;
      if (key.startsWith('settings.')) id = settings[key.slice(9)];
      else if (key.startsWith('installer.')) id = installer[key.slice(10)];
      else if (key.startsWith('smartHome_')) id = smartHome[key.slice(10)];
      else id = dps[key];
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
    } catch (e) {
      this.log.error(`onStateChange error: ${e.message}`);
    }
  }

  keyFromId(id) {
    const dps = (this.config && this.config.datapoints) || {};
    for (const [key, dpId] of Object.entries(dps)) { if (dpId === id) return key; }
    const settings = (this.config && this.config.settings) || {};
    for (const [k, dpId] of Object.entries(settings)) { if (dpId === id) return 'settings.' + k; }
    const installer = (this.config && this.config.installer) || {};
    for (const [k, dpId] of Object.entries(installer)) { if (dpId === id) return 'installer.' + k; }
    const smartHome = (this.config && this.config.smartHome && this.config.smartHome.datapoints) || {};
    for (const [k, dpId] of Object.entries(smartHome)) { if (dpId === id) return 'smartHome_' + k; }

    // dynamic SmartHome enum datapoints (auto-generated structure)
    const dyn = this.smartHomeEnumKeyById || {};
    if (dyn[id]) return dyn[id];

    // direct mapping for local states
    const prefS = this.namespace + '.settings.';
    const prefI = this.namespace + '.installer.';
    if (id && id.startsWith(prefS)) return 'settings.' + id.slice(prefS.length);
    if (id && id.startsWith(prefI)) return 'installer.' + id.slice(prefI.length);
    return null;
  }

  updateValue(key, value, ts) {
    this.stateCache[key] = { value, ts };

    const payload = { [key]: this.stateCache[key] };
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