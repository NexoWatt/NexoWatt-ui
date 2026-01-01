
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const path = require('path');
const bodyParser = express.json();
const crypto = require('crypto');

// Embedded EMS engine (Charging Management from nexowatt-multiuse)
const { EmsEngine } = require('./ems/engine');

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




class NexoWattVis extends utils.Adapter {
  constructor(options) {
    super({
      ...options,
      name: 'nexowatt-vis',
    });

    this.stateCache = {};
    this.sseClients = new Set();
    // Batch SSE updates to prevent UI freezes on frequent state updates
    this._ssePendingPayload = {};
    this._sseFlushTimer = null;
    this.smartHomeDevices = [];

    // EMS engine (Sprint 2)
    this.emsEngine = null;

    

    // EVCS session logger (RFID accounting)
    this._evcsSessionMaxEntries = 2000;
    this._evcsSessionsBuf = [];
    this._evcsActiveSessions = {}; // idx -> session
    this._evcsCharging = {}; // idx -> bool
    this._evcsChargeStartW = 100; // hysteresis start threshold
    this._evcsChargeStopW = 50;   // hysteresis stop threshold

    // Storagefarm: remember last commanded setpoints to reduce write spam
    this._sfLastSetpoints = new Map(); // objectId -> last numeric value

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

  // Speicherfarm (mehrere Speichersysteme als Pool/Gruppe)
  async ensureStorageFarmStates() {
    await this.setObjectNotExistsAsync('storageFarm', {
      type: 'channel',
      common: { name: 'Speicherfarm' },
      native: {},
    });

    const defs = {
      enabled: { type: 'boolean', role: 'switch', def: false, name: 'Speicherfarm aktiv (Admin)' },
      mode: { type: 'string', role: 'text', def: 'pool', name: 'Modus: pool | groups' },
      configJson: { type: 'string', role: 'json', def: '[]', name: 'Speicherfarm Konfiguration (JSON, Liste)' },
      groupsJson: { type: 'string', role: 'json', def: '[]', name: 'Gruppenkonfiguration (optional)' },
      totalSoc: { type: 'number', role: 'value', def: 0, name: 'Gesamt SoC (%) (abgeleitet)' },
      totalChargePowerW: { type: 'number', role: 'value.power', def: 0, name: 'Gesamt Ladeleistung (W) (abgeleitet)' },
      totalDischargePowerW: { type: 'number', role: 'value.power', def: 0, name: 'Gesamt Entladeleistung (W) (abgeleitet)' },
      storagesOnline: { type: 'number', role: 'value', def: 0, name: 'Online Speicher (abgeleitet)' },
      storagesTotal: { type: 'number', role: 'value', def: 0, name: 'Konfigurierte Speicher' },
      storagesStatusJson: { type: 'string', role: 'json', def: '[]', name: 'Speicher-Status (JSON, abgeleitet)' },
    };

    for (const [key, c] of Object.entries(defs)) {
      await this.setObjectNotExistsAsync(`storageFarm.${key}`, {
        type: 'state',
        common: {
          name: c.name,
          type: c.type,
          role: c.role,
          read: true,
          write: false,
          def: c.def,
          ...(key.endsWith('PowerW') ? { unit: 'W' } : {}),
        },
        native: {},
      });
    }
  }

  /**
   * Ensure that the storageFarm.* states exist with sane defaults.
   *
   * Important: setObjectNotExistsAsync() only creates objects, not state values.
   * The VIS frontend reads from /api/state (stateCache). If the states have never
   * been written, the UI will show empty values (especially after restart).
   */
  async syncStorageFarmDefaultsToStates() {
    const defaults = {
      enabled: false,
      mode: 'pool',
      configJson: '[]',
      groupsJson: '[]',
      totalSoc: 0,
      totalChargePowerW: 0,
      totalDischargePowerW: 0,
      storagesOnline: 0,
      storagesTotal: 0,
      storagesStatusJson: '[]',
    };

    for (const [k, defVal] of Object.entries(defaults)) {
      const id = `storageFarm.${k}`;
      try {
        const st = await this.getStateAsync(id);
        const missing = !st || typeof st.val === 'undefined' || st.val === null;
        const emptyJson = (k === 'configJson' || k === 'groupsJson') && (!st || st.val === '' || st.val === 'null');
        if (missing || emptyJson) {
          await this.setStateAsync(id, { val: defVal, ack: true });
        }
      } catch (_e) {
        try { await this.setStateAsync(id, { val: defVal, ack: true }); } catch (_e2) {}
      }
    }
  }


  /**
   * Synchronisiert die Speicherfarm-Konfiguration aus dem Admin (jsonConfig) in Runtime-States unter storageFarm.*.
   * Hintergrund: Das VIS-Frontend liest über /api/state aus dem stateCache. Ohne diese Spiegelung wären die
   * Werte nach Reload/Restart ggf. leer oder nicht konsistent.
   */
  async syncStorageFarmConfigFromAdmin() {
    try {
      const cfg = this.config || {};
      const enabled = !!cfg.enableStorageFarm;

      // Master-Enable aus Admin in State spiegeln (damit UI + Runtime konsistent bleiben)
      try {
        await this.setStateAsync('storageFarm.enabled', { val: enabled, ack: true });
        try { this.updateValue('storageFarm.enabled', enabled, Date.now()); } catch (_e0) {}
      } catch (_e1) {}

      if (!enabled) return;

      const adminSf = (cfg.storageFarm && typeof cfg.storageFarm === 'object') ? cfg.storageFarm : {};
      const modeRaw = String(adminSf.mode || 'pool').toLowerCase().trim();
      const mode = (modeRaw === 'groups') ? 'groups' : 'pool';

      // Tabellenzeilen aus Admin
      const rows = Array.isArray(adminSf.storages) ? adminSf.storages : [];
      const normalized = rows
        .filter(r => r && typeof r === 'object')
        .map(r => ({
          enabled: !(r.enabled === false),
          name: String(r.name || '').trim(),
          socId: String(r.socId || '').trim(),
          chargePowerId: String(r.chargePowerId || '').trim(),
          dischargePowerId: String(r.dischargePowerId || '').trim(),
          setChargePowerId: String(r.setChargePowerId || '').trim(),
          setDischargePowerId: String(r.setDischargePowerId || '').trim(),
          capacityKWh: (r.capacityKWh !== undefined && r.capacityKWh !== null && r.capacityKWh !== '') ? Number(r.capacityKWh) : null,
          group: String(r.group || '').trim(),
        }));

      // Nur überschreiben, wenn Admin etwas geliefert hat ODER wenn State noch leer ist (Migration/First Run)
      let shouldWriteList = normalized.length > 0;
      if (!shouldWriteList) {
        try {
          const st = await this.getStateAsync('storageFarm.configJson');
          const v = st && typeof st.val === 'string' ? st.val : '';
          shouldWriteList = !v || v === '[]' || v === 'null';
        } catch (_e2) {
          shouldWriteList = true;
        }
      }

      if (shouldWriteList) {
        const json = JSON.stringify(normalized);
        await this.setStateAsync('storageFarm.configJson', { val: json, ack: true });
        try { this.updateValue('storageFarm.configJson', json, Date.now()); } catch (_e3) {}
      }

      await this.setStateAsync('storageFarm.mode', { val: mode, ack: true });
      try { this.updateValue('storageFarm.mode', mode, Date.now()); } catch (_e4) {}

      const groups = Array.isArray(adminSf.groups) ? adminSf.groups : [];
      const groupsNorm = groups
        .filter(g => g && typeof g === 'object' && g.enabled !== false)
        .map(g => ({
          enabled: !(g.enabled === false),
          name: String(g.name || '').trim(),
          socMin: (g.socMin !== undefined && g.socMin !== null && g.socMin !== '') ? Number(g.socMin) : null,
          socMax: (g.socMax !== undefined && g.socMax !== null && g.socMax !== '') ? Number(g.socMax) : null,
          priority: (g.priority !== undefined && g.priority !== null && g.priority !== '') ? Number(g.priority) : null,
        }));

      const gjson = JSON.stringify(groupsNorm);
      await this.setStateAsync('storageFarm.groupsJson', { val: gjson, ack: true });
      try { this.updateValue('storageFarm.groupsJson', gjson, Date.now()); } catch (_e5) {}
    } catch (e) {
      this.log.debug('storageFarm admin sync failed: ' + (e && e.message ? e.message : e));
    }
  }

  async updateStorageFarmDerived(reason = 'timer') {
    try {
      // Only compute if feature is enabled in Admin (EMS) AND at least one storage is configured.
      const cfg = this.config || {};
      const enabledInAdmin = !!cfg.enableStorageFarm;
      if (!enabledInAdmin) return;

      const stCfg = await this.getStateAsync('storageFarm.configJson');
      const raw = (stCfg && typeof stCfg.val === 'string') ? stCfg.val : '[]';
      let list = [];
      try { list = raw ? JSON.parse(raw) : []; } catch (_e) { list = []; }
      if (!Array.isArray(list)) list = [];


      let totalCharge = 0;
      let totalDischarge = 0;
      let online = 0;
      let configured = 0;
      let socWeighted = 0;
      let socWeight = 0;
      const statusRows = [];

      for (const row of list) {
        if (!row || typeof row !== 'object') continue;
        if (row.enabled === false) continue;
        configured++;

        const status = {
          name: String(row.name || '').trim() || `Speicher ${configured}`,
          group: String(row.group || '').trim(),
          soc: null,
          chargePowerW: null,
          dischargePowerW: null,
          online: false,
        };

        const socId = String(row.socId || '').trim();
        const chgId = String(row.chargePowerId || '').trim();
        const dchgId = String(row.dischargePowerId || '').trim();
        const cap = Number(row.capacityKWh);
        const w = Number.isFinite(cap) && cap > 0 ? cap : 1;

        let anyOk = false;
        if (socId) {
          const st = await this.getForeignStateAsync(socId).catch(() => null);
          const soc = st && st.val !== undefined && st.val !== null ? Number(st.val) : NaN;
          if (Number.isFinite(soc)) {
            status.soc = soc;
            socWeighted += soc * w;
            socWeight += w;
            anyOk = true;
          }
        }
        if (chgId) {
          const st = await this.getForeignStateAsync(chgId).catch(() => null);
          const v = st && st.val !== undefined && st.val !== null ? Number(st.val) : NaN;
          if (Number.isFinite(v)) { totalCharge += v; status.chargePowerW = v; anyOk = true; }
        }
        if (dchgId) {
          const st = await this.getForeignStateAsync(dchgId).catch(() => null);
          const v = st && st.val !== undefined && st.val !== null ? Number(st.val) : NaN;
          if (Number.isFinite(v)) { totalDischarge += v; status.dischargePowerW = v; anyOk = true; }
        }
        status.online = !!anyOk;
        statusRows.push(status);
        if (anyOk) online++;
      }

      const totalSoc = socWeight > 0 ? (socWeighted / socWeight) : 0;
      await this.setStateAsync('storageFarm.totalSoc', { val: Math.round(totalSoc * 10) / 10, ack: true });
      await this.setStateAsync('storageFarm.totalChargePowerW', { val: Math.round(totalCharge), ack: true });
      await this.setStateAsync('storageFarm.totalDischargePowerW', { val: Math.round(totalDischarge), ack: true });
      await this.setStateAsync('storageFarm.storagesOnline', { val: online, ack: true });
      await this.setStateAsync('storageFarm.storagesTotal', { val: configured, ack: true });
      await this.setStateAsync('storageFarm.storagesStatusJson', { val: JSON.stringify(statusRows), ack: true });

      // keep stateCache fresh for the UI
      try {
        this.updateValue('storageFarm.totalSoc', Math.round(totalSoc * 10) / 10, Date.now());
        this.updateValue('storageFarm.totalChargePowerW', Math.round(totalCharge), Date.now());
        this.updateValue('storageFarm.totalDischargePowerW', Math.round(totalDischarge), Date.now());
        this.updateValue('storageFarm.storagesOnline', online, Date.now());
        this.updateValue('storageFarm.storagesTotal', configured, Date.now());
        this.updateValue('storageFarm.storagesStatusJson', JSON.stringify(statusRows), Date.now());
      } catch (_e2) {}
    } catch (e) {
      this.log.debug('storageFarm derive failed (' + reason + '): ' + (e && e.message ? e.message : e));
    }
  }


  // ---------------------------------------------------------------------------
  // StorageFarm: Sollwert-Verteilung (Pool/Gruppen)
  // ---------------------------------------------------------------------------

  _sfGetNormalizedFarmConfig() {
    const cfg = this.config || {};
    const enabled = !!cfg.enableStorageFarm;
    const sf = (cfg.storageFarm && typeof cfg.storageFarm === 'object') ? cfg.storageFarm : {};
    const modeRaw = String(sf.mode || 'pool').toLowerCase().trim();
    const mode = (modeRaw === 'groups') ? 'groups' : 'pool';
    const storagesIn = Array.isArray(sf.storages) ? sf.storages : [];
    const groupsIn = Array.isArray(sf.groups) ? sf.groups : [];

    const storages = storagesIn
      .filter(r => r && typeof r === 'object')
      .map(r => ({
        enabled: !(r.enabled === false),
        name: String(r.name || '').trim(),
        socId: String(r.socId || '').trim(),
        setChargePowerId: String(r.setChargePowerId || '').trim(),
        setDischargePowerId: String(r.setDischargePowerId || '').trim(),
        capacityKWh: (r.capacityKWh !== undefined && r.capacityKWh !== null && r.capacityKWh !== '') ? Number(r.capacityKWh) : null,
        group: String(r.group || '').trim(),
      }))
      .filter(r => r.enabled);

    const groups = groupsIn
      .filter(g => g && typeof g === 'object' && g.enabled !== false)
      .map(g => ({
        enabled: !(g.enabled === false),
        name: String(g.name || '').trim(),
        socMin: (g.socMin !== undefined && g.socMin !== null && g.socMin !== '') ? Number(g.socMin) : null,
        socMax: (g.socMax !== undefined && g.socMax !== null && g.socMax !== '') ? Number(g.socMax) : null,
        priority: (g.priority !== undefined && g.priority !== null && g.priority !== '') ? Number(g.priority) : 0,
      }))
      .filter(g => g.enabled && g.name);

    return { enabled, mode, storages, groups };
  }

  async _sfWriteIfChanged(objectId, value) {
    const id = String(objectId || '').trim();
    if (!id) return { ok: false, written: false, reason: 'missing_id' };
    const v = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    const prev = this._sfLastSetpoints ? this._sfLastSetpoints.get(id) : undefined;
    if (prev === v) return { ok: true, written: false };
    try {
      await this.setForeignStateAsync(id, v);
      if (this._sfLastSetpoints) this._sfLastSetpoints.set(id, v);
      return { ok: true, written: true };
    } catch (e) {
      return { ok: false, written: false, error: e && e.message ? e.message : String(e) };
    }
  }

  async applyStorageFarmTargetW(targetW, meta = {}) {
    const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
    const sf = this._sfGetNormalizedFarmConfig();
    if (!sf.enabled) return { applied: false, reason: 'disabled' };
    if (!sf.storages || sf.storages.length === 0) return { applied: false, reason: 'no_storages' };

    const direction = (w < 0) ? 'charge' : ((w > 0) ? 'discharge' : 'idle');
    const absW = Math.abs(w);

    // Determine SoC values from derived status (preferred)
    let status = [];
    try {
      const st = await this.getStateAsync('storageFarm.storagesStatusJson').catch(() => null);
      const raw = (st && typeof st.val === 'string') ? st.val : '[]';
      const parsed = raw ? JSON.parse(raw) : [];
      status = Array.isArray(parsed) ? parsed : [];
    } catch (_e) { status = []; }

    // Attach SoC to storage rows (index-based; derived list is built from enabled rows in same order)
    const storages = sf.storages.map((s, i) => {
      const soc = status[i] && Number.isFinite(Number(status[i].soc)) ? Number(status[i].soc) : null;
      return { ...s, soc };
    });

    // Helper: weighted allocation with rounding to ensure sum == total
    const allocateWeighted = (total, items, dir) => {
      const list = (items || []).slice();
      if (total <= 0 || list.length === 0) return new Map();

      const weights = list.map(it => {
        const cap = (Number.isFinite(it.capacityKWh) && it.capacityKWh > 0) ? it.capacityKWh : 1;
        const soc = Number.isFinite(it.soc) ? it.soc : null;
        let base = 1;
        if (typeof soc === 'number') {
          if (dir === 'charge') base = Math.max(0, 100 - soc);
          else if (dir === 'discharge') base = Math.max(0, soc);
          else base = 1;
          // Avoid hard zeros for mid-range SoC
          if (base <= 0.0001) base = 0;
        }
        return base * cap;
      });

      let sumW = weights.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
      if (!(sumW > 0)) {
        // fallback: equal weights
        for (let i = 0; i < weights.length; i++) weights[i] = 1;
        sumW = weights.length;
      }

      const alloc = new Array(list.length).fill(0);
      let used = 0;
      for (let i = 0; i < list.length; i++) {
        const a = Math.floor(total * (weights[i] / sumW));
        alloc[i] = Number.isFinite(a) ? a : 0;
        used += alloc[i];
      }
      let rem = Math.max(0, total - used);
      // distribute remainder to highest weights
      const order = [...alloc.keys()].sort((i, j) => (weights[j] || 0) - (weights[i] || 0));
      let oi = 0;
      while (rem > 0 && order.length > 0) {
        alloc[order[oi]] += 1;
        rem -= 1;
        oi = (oi + 1) % order.length;
      }

      const map = new Map();
      for (let i = 0; i < list.length; i++) map.set(list[i], alloc[i]);
      return map;
    };

    // Build eligible storages for direction (only those with mapped setpoint dp)
    const canUse = (s) => {
      if (direction === 'charge') return !!s.setChargePowerId;
      if (direction === 'discharge') return !!s.setDischargePowerId;
      return !!(s.setChargePowerId || s.setDischargePowerId);
    };

    const eligible = storages.filter(canUse);
    if (eligible.length === 0) return { applied: false, reason: 'no_setpoint_dps' };

    // Allocation map: storage -> watts for active direction
    let allocMap = new Map();

    if (direction === 'idle') {
      allocMap = new Map();
    } else if (sf.mode === 'groups' && sf.groups && sf.groups.length > 0) {
      // Group allocation: distribute to groups proportionally, then within group weighted
      const groups = [...sf.groups].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      const groupBuckets = new Map();
      for (const g of groups) groupBuckets.set(g.name, []);

      for (const s of eligible) {
        const gname = s.group && groupBuckets.has(s.group) ? s.group : null;
        if (!gname) continue;
        const g = groups.find(x => x.name === gname) || null;
        if (g && Number.isFinite(s.soc)) {
          if (typeof g.socMin === 'number' && s.soc < g.socMin) continue;
          if (typeof g.socMax === 'number' && s.soc > g.socMax) continue;
        }
        groupBuckets.get(gname).push(s);
      }

      // Remove empty groups
      const activeGroups = groups.filter(g => (groupBuckets.get(g.name) || []).length > 0);
      if (activeGroups.length === 0) {
        allocMap = allocateWeighted(absW, eligible, direction);
      } else {
        const gWeights = activeGroups.map(g => {
          const items = groupBuckets.get(g.name) || [];
          return items.reduce((sum, s) => sum + ((Number.isFinite(s.capacityKWh) && s.capacityKWh > 0) ? s.capacityKWh : 1), 0);
        });
        let gSum = gWeights.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
        if (!(gSum > 0)) { gSum = activeGroups.length; for (let i=0;i<gWeights.length;i++) gWeights[i]=1; }

        // First pass: floor allocations
        const gAlloc = new Array(activeGroups.length).fill(0);
        let used = 0;
        for (let i=0;i<activeGroups.length;i++) {
          const a = Math.floor(absW * (gWeights[i] / gSum));
          gAlloc[i] = Number.isFinite(a) ? a : 0;
          used += gAlloc[i];
        }
        let rem = Math.max(0, absW - used);
        const order = [...gAlloc.keys()].sort((i,j)=> (gWeights[j]||0)-(gWeights[i]||0));
        let oi=0;
        while (rem>0 && order.length>0){ gAlloc[order[oi]] += 1; rem -= 1; oi=(oi+1)%order.length; }

        // Within each group: weighted allocation
        for (let i=0;i<activeGroups.length;i++) {
          const g = activeGroups[i];
          const items = groupBuckets.get(g.name) || [];
          const m = allocateWeighted(gAlloc[i], items, direction);
          for (const [s, a] of m.entries()) allocMap.set(s, (allocMap.get(s) || 0) + a);
        }
      }
    } else {
      allocMap = allocateWeighted(absW, eligible, direction);
    }

    // Apply writes: always zero the opposite direction to avoid stale values
    let anyOkRelevant = false;
    const results = [];
    for (const s of storages) {
      const alloc = (direction === 'idle') ? 0 : (allocMap.get(s) || 0);
      const chargeW = (direction === 'charge') ? alloc : 0;
      const dischargeW = (direction === 'discharge') ? alloc : 0;

      const r = { name: s.name || '', chargeW, dischargeW, ok: true, writes: {} };

      // Write charge setpoint
      if (s.setChargePowerId) {
        const wr = await this._sfWriteIfChanged(s.setChargePowerId, chargeW);
        r.writes.charge = wr;
        if (!wr.ok) r.ok = false;
        if (direction === 'charge' && wr.ok) anyOkRelevant = true;
        if (direction === 'idle' && wr.ok) anyOkRelevant = true;
      }
      // Write discharge setpoint
      if (s.setDischargePowerId) {
        const wr = await this._sfWriteIfChanged(s.setDischargePowerId, dischargeW);
        r.writes.discharge = wr;
        if (!wr.ok) r.ok = false;
        if (direction === 'discharge' && wr.ok) anyOkRelevant = true;
        if (direction === 'idle' && wr.ok) anyOkRelevant = true;
      }

      results.push(r);
    }

    // Log only on debug to avoid noise
    try {
      if (this.log && typeof this.log.debug === 'function') {
        const src = meta && meta.source ? String(meta.source) : '';
        this.log.debug(`[storageFarm] apply targetW=${w} dir=${direction} storages=${storages.length} src=${src}`);
      }
    } catch (_eLog) {}

    return { applied: !!anyOkRelevant, direction, targetW: w, results };
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
    this.log.info(`[NexoWatt VIS] Ladepunkte konfiguriert: ${evcsCount}`);


    // derive evcs list (names) from config; keep it stable and always at least evcsCount entries
    const rawList = Array.isArray(cfg.evcsList) ? cfg.evcsList : [];
    const evcsList = [];
    for (let i = 0; i < evcsCount; i++) {
      const row = rawList[i] || {};
      const name = (row && typeof row.name === 'string' && row.name.trim()) ? row.name.trim() : `Ladepunkt ${i+1}`;
      const note = (row && typeof row.note === 'string' && row.note.trim()) ? row.note.trim() : '';
      const powerId = (row && typeof row.powerId === 'string' && row.powerId.trim()) ? row.powerId.trim() : '';
      const energyTotalId = (row && typeof row.energyTotalId === 'string' && row.energyTotalId.trim()) ? row.energyTotalId.trim() : '';
      const statusId = (row && typeof row.statusId === 'string' && row.statusId.trim()) ? row.statusId.trim() : '';
      const activeId = (row && typeof row.activeId === 'string' && row.activeId.trim()) ? row.activeId.trim() : '';
      const modeIdRaw = (row && typeof row.modeId === 'string' && row.modeId.trim()) ? row.modeId.trim() : '';
      // Interner Standard: pro Ladepunkt existiert immer ein eigener Modus-State.
      // Damit muss im Admin keine Modus-DP-Zuordnung gepflegt werden.
      const modeId = modeIdRaw || `${this.namespace}.evcs.${i + 1}.mode`;
      // EMS control datapoints (optional, per wallbox)
      const setCurrentAId = (row && typeof row.setCurrentAId === 'string' && row.setCurrentAId.trim()) ? row.setCurrentAId.trim() : '';
      const setPowerWId = (row && typeof row.setPowerWId === 'string' && row.setPowerWId.trim()) ? row.setPowerWId.trim() : '';
      const onlineId = (row && typeof row.onlineId === 'string' && row.onlineId.trim()) ? row.onlineId.trim() : '';
      const enableWriteId = (row && typeof row.enableWriteId === 'string' && row.enableWriteId.trim()) ? row.enableWriteId.trim() : '';
      // Meta / conversion (optional)
      const chargerType = (row && typeof row.chargerType === 'string' && row.chargerType.trim()) ? row.chargerType.trim() : 'ac';
      const phases = (row && row.phases !== undefined && row.phases !== null && String(row.phases).trim() !== '' && Number.isFinite(Number(row.phases))) ? Math.max(1, Math.min(3, Math.round(Number(row.phases)))) : 3;
      const voltageV = (row && row.voltageV !== undefined && row.voltageV !== null && String(row.voltageV).trim() !== '' && Number.isFinite(Number(row.voltageV))) ? Math.round(Number(row.voltageV)) : 230;
      const controlPreference = (row && typeof row.controlPreference === 'string' && row.controlPreference.trim()) ? row.controlPreference.trim() : 'auto';
      const minCurrentA = (row && row.minCurrentA !== undefined && row.minCurrentA !== null && String(row.minCurrentA).trim() !== '' && Number.isFinite(Number(row.minCurrentA))) ? Number(row.minCurrentA) : 0;
      const maxCurrentA = (row && row.maxCurrentA !== undefined && row.maxCurrentA !== null && String(row.maxCurrentA).trim() !== '' && Number.isFinite(Number(row.maxCurrentA))) ? Number(row.maxCurrentA) : 0;
      const maxPowerW = (row && row.maxPowerW !== undefined && row.maxPowerW !== null && String(row.maxPowerW).trim() !== '' && Number.isFinite(Number(row.maxPowerW))) ? Number(row.maxPowerW) : 0;
      const stepA = (row && row.stepA !== undefined && row.stepA !== null && String(row.stepA).trim() !== '' && Number.isFinite(Number(row.stepA))) ? Number(row.stepA) : 0;
      const stepW = (row && row.stepW !== undefined && row.stepW !== null && String(row.stepW).trim() !== '' && Number.isFinite(Number(row.stepW))) ? Number(row.stepW) : 0;
      let userMode = (row && typeof row.userMode === 'string' && row.userMode.trim()) ? row.userMode.trim() : 'auto';
      userMode = String(userMode).toLowerCase();
      if (userMode === 'min+pv') userMode = 'minpv';
      if (!['auto','pv','minpv','boost'].includes(userMode)) userMode = 'auto';
      // Stationsgruppen / Ladepunkt-Metadaten (Sprint 2.2)
      const stationKey = (row && typeof row.stationKey === 'string' && row.stationKey.trim()) ? row.stationKey.trim() : '';
      const connectorNo = (row && row.connectorNo !== undefined && row.connectorNo !== null && String(row.connectorNo).trim() !== '' && Number.isFinite(Number(row.connectorNo)))
        ? Math.max(0, Math.round(Number(row.connectorNo)))
        : 0;
      const allowBoost = (row && row.allowBoost !== undefined && row.allowBoost !== null) ? !!row.allowBoost : true;
      // Optional: per-chargepoint boost timeout override (minutes). 0/empty = use global defaults (AC/DC).
      const boostTimeoutMin = (row && row.boostTimeoutMin !== undefined && row.boostTimeoutMin !== null && String(row.boostTimeoutMin).trim() !== '' && Number.isFinite(Number(row.boostTimeoutMin))) ? Number(row.boostTimeoutMin) : 0;
      // Optional: Sperre/Lock DP (bool). Alternative zu activeId (Freigabe).
      const lockWriteId = (row && typeof row.lockWriteId === 'string' && row.lockWriteId.trim()) ? row.lockWriteId.trim() :
        ((row && typeof row.lockId === 'string' && row.lockId.trim()) ? row.lockId.trim() :
        ((row && typeof row.lock === 'string' && row.lock.trim()) ? row.lock.trim() : ''));
      // Optional: RFID reader datapoint (used for learning/whitelist access control)
      const rfidReadId = (row && typeof row.rfidReadId === 'string' && row.rfidReadId.trim()) ? row.rfidReadId.trim() :
        ((row && typeof row.rfidId === 'string' && row.rfidId.trim()) ? row.rfidId.trim() :
        ((row && typeof row.rfid === 'string' && row.rfid.trim()) ? row.rfid.trim() : ''));
      evcsList.push({ index: i+1, name, note, powerId, energyTotalId, statusId, activeId, modeId, lockWriteId, rfidReadId, setCurrentAId, setPowerWId, onlineId, enableWriteId, chargerType, phases, voltageV, controlPreference, minCurrentA, maxCurrentA, maxPowerW, stepA, stepW, userMode, stationKey, connectorNo, allowBoost, boostTimeoutMin });
    }
    this.evcsList = evcsList;
    // Stationsgruppen (für DC-Stationen mit mehreren Ladepunkten)
    const sgRaw = Array.isArray(cfg.stationGroups) ? cfg.stationGroups : [];
    const stationGroups = [];
    const stationGroupMap = {};
    for (const g of sgRaw) {
      if (!g) continue;
      const stationKey = (typeof g.stationKey === 'string' && g.stationKey.trim()) ? g.stationKey.trim() : '';
      if (!stationKey) continue;
      const name = (typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : '';
      const maxPowerKw = (g.maxPowerKw !== undefined && g.maxPowerKw !== null && String(g.maxPowerKw).trim() !== '' && Number.isFinite(Number(g.maxPowerKw))) ? Number(g.maxPowerKw) : 0;
      const maxPowerW = Math.max(0, Math.round(maxPowerKw * 1000));
      stationGroups.push({ stationKey, name, maxPowerKw, maxPowerW });
      stationGroupMap[stationKey] = { stationKey, name, maxPowerKw, maxPowerW };
    }
    this.stationGroups = stationGroups;
    this.stationGroupMap = stationGroupMap;



    // quick lookup for RFID reader datapoints (used by learning backend + access control)
    this.evcsRfidReadIds = new Set();
    this.evcsRfidReadIdToIndex = {};
    for (const wb of this.evcsList) {
      if (wb && wb.rfidReadId) {
        this.evcsRfidReadIds.add(wb.rfidReadId);
        this.evcsRfidReadIdToIndex[wb.rfidReadId] = wb.index;
      }
    }

    // build lookup for mapped EVCS datapoints -> internal cache keys
    this.evcsIdToKey = {};
    for (const wb of this.evcsList) {
      if (wb.powerId) this.evcsIdToKey[wb.powerId] = `evcs.${wb.index}.powerW`;
      if (wb.energyTotalId) this.evcsIdToKey[wb.energyTotalId] = `evcs.${wb.index}.energyTotalKwh`;
      if (wb.statusId) this.evcsIdToKey[wb.statusId] = `evcs.${wb.index}.status`;
      if (wb.activeId) this.evcsIdToKey[wb.activeId] = `evcs.${wb.index}.active`;
      if (wb.lockWriteId) this.evcsIdToKey[wb.lockWriteId] = `evcs.${wb.index}.lock`;
      if (wb.rfidReadId) this.evcsIdToKey[wb.rfidReadId] = `evcs.${wb.index}.rfidLast`;
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
        common: { name: `Ladepunkt ${i}` },
        native: {}
      });

      const defs = {
        name:          { type: 'string', role: 'text', def: `Ladepunkt ${i}`, read: true, write: false },
        note:          { type: 'string', role: 'text', def: '', read: true, write: false },
        powerW:        { type: 'number', role: 'value.power', def: 0, read: true, write: false, unit: 'W' },
        energyTotalKwh:{ type: 'number', role: 'value.energy', def: 0, read: true, write: false, unit: 'kWh' },
        energyDayKwh:  { type: 'number', role: 'value.energy', def: 0, read: true, write: false, unit: 'kWh' },
                _dayBaseKwh:  { type: 'number', role: 'value', def: 0, read: true, write: false, unit: 'kWh' },
        _dayBaseDate: { type: 'string', role: 'text', def: '', read: true, write: false },
        status:        { type: 'string', role: 'state', def: '', read: true, write: false },
        active:        { type: 'boolean', role: 'switch', def: false, read: true, write: false },
        // Modus ist bewusst writeable: die VIS kann je Ladepunkt den Betriebsmodus setzen (internes EMS).
        // 0=Auto, 1=Boost, 2=Min+PV, 3=PV
        mode:          { type: 'number', role: 'value', def: 0, read: true, write: true },
        // RFID / Ladepark (read-only visualization states; enforcement writes to configured foreign datapoints)
        lock:          { type: 'boolean', role: 'state', def: false, read: true, write: false },
        rfidLast:      { type: 'string', role: 'text', def: '', read: true, write: false },
        rfidLastTs:    { type: 'number', role: 'value', def: 0, read: true, write: false, unit: 'ms' },
        rfidAuthorized:{ type: 'boolean', role: 'indicator', def: false, read: true, write: false },
        rfidUser:      { type: 'string', role: 'text', def: '', read: true, write: false },
        rfidReason:    { type: 'string', role: 'text', def: '', read: true, write: false },
        rfidEnforced:  { type: 'boolean', role: 'indicator', def: false, read: true, write: false }
      };

      for (const [k, c] of Object.entries(defs)) {
        await this.setObjectNotExistsAsync(`evcs.${i}.${k}`, {
          type: 'state',
          common: { name: `evcs.${i}.${k}`, type: c.type, role: c.role, read: c.read, write: c.write, def: c.def, unit: c.unit },
          native: {}
        });
      }

      // ensure mode enum + writeable (also for existing installations via extendObject)
      try {
        await this.extendObjectAsync(`evcs.${i}.mode`, {
          common: {
            role: 'value',
            read: true,
            write: true,
            states: {
              0: 'Auto',
              1: 'Boost',
              2: 'Min+PV',
              3: 'PV'
            }
          }
        });
      } catch (e) {
        // ignore
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
  async ensureRfidStates() {
    // Base RFID states for EVCS access control (Whitelist + Learning)
    await this.setObjectNotExistsAsync('evcs.rfid', {
      type: 'channel',
      common: { name: 'EVCS RFID' },
      native: {}
    });

    await this.setObjectNotExistsAsync('evcs.rfid.learning', {
      type: 'channel',
      common: { name: 'EVCS RFID Learning' },
      native: {}
    });

    const defs = {
      'evcs.rfid.enabled': {
        name: 'evcs.rfid.enabled',
        type: 'boolean',
        role: 'switch',
        read: true,
        write: true,
        def: false
      },
      'evcs.rfid.whitelistJson': {
        name: 'evcs.rfid.whitelistJson',
        type: 'string',
        role: 'json',
        read: true,
        write: true,
        def: '[]'
      },
      'evcs.rfid.learning.active': {
        name: 'evcs.rfid.learning.active',
        type: 'boolean',
        role: 'switch',
        read: true,
        write: true,
        def: false
      },
      'evcs.rfid.learning.lastCaptured': {
        name: 'evcs.rfid.learning.lastCaptured',
        type: 'string',
        role: 'text',
        read: true,
        write: false,
        def: ''
      },
      'evcs.rfid.learning.lastCapturedTs': {
        name: 'evcs.rfid.learning.lastCapturedTs',
        type: 'number',
        role: 'value.time',
        read: true,
        write: false,
        def: 0,
        unit: 'ms'
      }
    };

    for (const [id, c] of Object.entries(defs)) {
      await this.setObjectNotExistsAsync(id, {
        type: 'state',
        common: {
          name: c.name,
          type: c.type,
          role: c.role,
          read: c.read,
          write: c.write,
          def: c.def,
          unit: c.unit
        },
        native: {}
      });
    }

    // Seed defaults only if states are missing (do not overwrite existing values)
    for (const [id, c] of Object.entries(defs)) {
      const st = await this.getStateAsync(id).catch(() => null);
      if (!st || st.val === undefined || st.val === null) {
        await this.setStateAsync(id, c.def, true);
      }
    }
    // Seed local cache snapshot for the VIS (so UI can read /api/state immediately)
    try {
      const keys = [
        'evcs.rfid.enabled',
        'evcs.rfid.whitelistJson',
        'evcs.rfid.learning.active',
        'evcs.rfid.learning.lastCaptured',
        'evcs.rfid.learning.lastCapturedTs'
      ];
      for (const k of keys) {
        const st0 = await this.getStateAsync(k).catch(() => null);
        if (st0 && st0.val !== undefined && st0.val !== null) {
          try { this.updateValue(k, st0.val, st0.ts || Date.now()); } catch(_e) {}
        }
      }
    } catch(_e) {}

  }

  async ensureEvcsSessionsStates() {
    // Session log for EVCS (RFID/person accounting)
    await this.setObjectNotExistsAsync('evcs.sessions', {
      type: 'channel',
      common: { name: 'EVCS Sessions' },
      native: {}
    });

    await this.setObjectNotExistsAsync('evcs.sessionsJson', {
      type: 'state',
      common: {
        name: 'evcs.sessionsJson',
        type: 'string',
        role: 'json',
        read: true,
        write: true,
        def: '[]'
      },
      native: {}
    });

    await this.setObjectNotExistsAsync('evcs.sessionsCount', {
      type: 'state',
      common: {
        name: 'evcs.sessionsCount',
        type: 'number',
        role: 'value',
        unit: 'entries',
        read: true,
        write: false,
        def: 0
      },
      native: {}
    });

    await this.setObjectNotExistsAsync('evcs.sessionsLastTs', {
      type: 'state',
      common: {
        name: 'evcs.sessionsLastTs',
        type: 'number',
        role: 'value.time',
        unit: 'ms',
        read: true,
        write: false,
        def: 0
      },
      native: {}
    });
  }

  async loadEvcsSessionsCache() {
    try {
      const st = await this.getStateAsync('evcs.sessionsJson');
      let arr = [];
      if (st && typeof st.val === 'string' && st.val.trim()) {
        try {
          const parsed = JSON.parse(st.val);
          if (Array.isArray(parsed)) arr = parsed;
        } catch (_e) {
          arr = [];
        }
      }
      if (!Array.isArray(arr)) arr = [];
      // keep only newest N entries
      const max = Number(this._evcsSessionMaxEntries || 2000) || 2000;
      if (arr.length > max) arr = arr.slice(arr.length - max);
      this._evcsSessionsBuf = arr;

      const now = Date.now();
      this.setLocalStateWithCache('evcs.sessionsCount', this._evcsSessionsBuf.length, now);
      this.setLocalStateWithCache('evcs.sessionsLastTs', now, now);
      // do not rewrite sessionsJson on load unless it is invalid
      if (!st || typeof st.val !== 'string') {
        this.setLocalStateWithCache('evcs.sessionsJson', JSON.stringify(this._evcsSessionsBuf), now);
      }
    } catch (e) {
      this.log.warn('loadEvcsSessionsCache: ' + e.message);
    }
  }

  persistEvcsSessions(nowTs) {
    const now = Number(nowTs) || Date.now();
    try {
      const json = JSON.stringify(this._evcsSessionsBuf || []);
      this.setLocalStateWithCache('evcs.sessionsJson', json, now);
      this.setLocalStateWithCache('evcs.sessionsCount', (this._evcsSessionsBuf || []).length, now);
      this.setLocalStateWithCache('evcs.sessionsLastTs', now, now);
    } catch (e) {
      this.log.warn('persistEvcsSessions: ' + e.message);
    }
  }

  appendEvcsSession(entry, nowTs) {
    const now = Number(nowTs) || Date.now();
    try {
      if (!entry) return;
      if (!this._evcsSessionsBuf) this._evcsSessionsBuf = [];
      this._evcsSessionsBuf.push(entry);
      const max = Number(this._evcsSessionMaxEntries || 2000) || 2000;
      if (this._evcsSessionsBuf.length > max) {
        this._evcsSessionsBuf.splice(0, this._evcsSessionsBuf.length - max);
      }
      this.persistEvcsSessions(now);
    } catch (e) {
      this.log.warn('appendEvcsSession: ' + e.message);
    }
  }

  maybeUpdateEvcsSessionTracker(key, tsMs) {
    try {
      const m = key && key.match(/^evcs\.(\d+)\.(powerW|energyTotalKwh)$/);
      if (!m) return;
      const idx = Number(m[1]) || 0;
      if (!idx) return;

      const t = Number(tsMs) || Date.now();
      const pRaw = this.stateCache[`evcs.${idx}.powerW`]?.value;
      const pW = Math.abs(Number(pRaw) || 0);

      const eRaw = this.stateCache[`evcs.${idx}.energyTotalKwh`]?.value;
      const eKwh = Number(eRaw);
      const eFinite = Number.isFinite(eKwh);

      const prevCharging = !!(this._evcsCharging && this._evcsCharging[idx]);
      const startW = Number(this._evcsChargeStartW || 100) || 100;
      const stopW = Number(this._evcsChargeStopW || 50) || 50;
      const chargingNow = prevCharging ? (pW >= stopW) : (pW >= startW);

      if (!prevCharging && chargingNow) {
        this._startEvcsSession(idx, t, pW, eFinite ? eKwh : null);
      }

      // Update while charging; also update one last time when stopping (to close integration window)
      if (chargingNow || (prevCharging && !chargingNow)) {
        this._updateEvcsSession(idx, t, pW, eFinite ? eKwh : null);
      }

      if (prevCharging && !chargingNow) {
        this._stopEvcsSession(idx, t, pW, eFinite ? eKwh : null);
      }

      if (!this._evcsCharging) this._evcsCharging = {};
      this._evcsCharging[idx] = chargingNow;
    } catch (_e) {}
  }

  _startEvcsSession(idx, tsMs, pW, energyTotalKwh) {
    try {
      if (!this._evcsActiveSessions) this._evcsActiveSessions = {};
      if (this._evcsActiveSessions[idx]) return; // already active

      const wb = (this.evcsList || []).find(w => Number(w.index) === Number(idx));
      const wbName = (wb && wb.name) ? String(wb.name) : (this.stateCache[`evcs.${idx}.name`]?.value ? String(this.stateCache[`evcs.${idx}.name`].value) : `Ladepunkt ${idx}`);

      const rfid = this.normalizeRfidCode(this.stateCache[`evcs.${idx}.rfidLast`]?.value);
      const user = this.stateCache[`evcs.${idx}.rfidUser`]?.value ? String(this.stateCache[`evcs.${idx}.rfidUser`].value) : '';
      const authorized = !!this.stateCache[`evcs.${idx}.rfidAuthorized`]?.value;

      const sess = {
        idx,
        wbName,
        startTs: Number(tsMs) || Date.now(),
        endTs: null,
        // meter values if available
        energyStartKwh: (Number.isFinite(Number(energyTotalKwh)) ? Number(energyTotalKwh) : null),
        energyEndKwh: (Number.isFinite(Number(energyTotalKwh)) ? Number(energyTotalKwh) : null),
        // integration fallback
        accWh: 0,
        lastPowerW: Number(pW) || 0,
        lastPowerTs: Number(tsMs) || Date.now(),
        maxW: Number(pW) || 0,
        // RFID meta
        rfid: rfid || '',
        user: user || '',
        authorized: authorized ? true : false,
      };

      this._evcsActiveSessions[idx] = sess;
    } catch (_e) {}
  }

  _updateEvcsSession(idx, tsMs, pW, energyTotalKwh) {
    try {
      if (!this._evcsActiveSessions || !this._evcsActiveSessions[idx]) return;
      const sess = this._evcsActiveSessions[idx];
      const t = Number(tsMs) || Date.now();

      // power integration (trapezoid)
      const lastTs = Number(sess.lastPowerTs) || t;
      const lastPW = Number(sess.lastPowerW) || 0;
      if (t > lastTs) {
        const dtH = (t - lastTs) / 3600000;
        const pAvg = (Math.abs(lastPW) + Math.abs(Number(pW) || 0)) / 2;
        const addWh = pAvg * dtH;
        if (Number.isFinite(addWh) && addWh > 0) sess.accWh = (Number(sess.accWh) || 0) + addWh;
      }

      sess.lastPowerTs = t;
      sess.lastPowerW = Number(pW) || 0;
      sess.maxW = Math.max(Number(sess.maxW) || 0, Math.abs(Number(pW) || 0));

      // meter energy if available
      const e = Number(energyTotalKwh);
      if (Number.isFinite(e)) {
        if (sess.energyStartKwh === null || sess.energyStartKwh === undefined) sess.energyStartKwh = e;
        sess.energyEndKwh = e;
      }

      // capture RFID meta if it arrives slightly later
      const rfidNow = this.normalizeRfidCode(this.stateCache[`evcs.${idx}.rfidLast`]?.value);
      const userNow = this.stateCache[`evcs.${idx}.rfidUser`]?.value ? String(this.stateCache[`evcs.${idx}.rfidUser`].value) : '';
      const authNow = !!this.stateCache[`evcs.${idx}.rfidAuthorized`]?.value;

      if ((!sess.rfid || sess.rfid === '') && rfidNow) sess.rfid = rfidNow;
      if ((!sess.user || sess.user === '') && userNow) sess.user = userNow;
      sess.authorized = authNow ? true : false;
    } catch (_e) {}
  }

  _stopEvcsSession(idx, tsMs, pW, energyTotalKwh) {
    try {
      if (!this._evcsActiveSessions || !this._evcsActiveSessions[idx]) return;
      const sess = this._evcsActiveSessions[idx];
      const endTs = Number(tsMs) || Date.now();
      sess.endTs = endTs;

      // Finalize energy
      let kwh = null;
      const eStart = Number(sess.energyStartKwh);
      const eEnd = Number.isFinite(Number(energyTotalKwh)) ? Number(energyTotalKwh) : Number(sess.energyEndKwh);
      if (Number.isFinite(eStart) && Number.isFinite(eEnd)) {
        const d = eEnd - eStart;
        if (Number.isFinite(d) && d >= 0) kwh = d;
      }
      if (!Number.isFinite(kwh)) {
        const wh = Number(sess.accWh) || 0;
        if (Number.isFinite(wh) && wh >= 0) kwh = wh / 1000;
      }
      if (!Number.isFinite(kwh)) kwh = 0;

      const durSec = Math.max(0, Math.round((endTs - (Number(sess.startTs) || endTs)) / 1000));
      const maxKw = (Number(sess.maxW) || 0) / 1000;

      // ignore tiny noise sessions
      if (durSec < 20 && kwh < 0.01) {
        delete this._evcsActiveSessions[idx];
        return;
      }

      const entry = {
        id: `wb${idx}-${Number(sess.startTs) || endTs}`,
        wallboxIndex: idx,
        wallboxName: sess.wbName || `Ladepunkt ${idx}`,
        startTs: Number(sess.startTs) || endTs,
        endTs,
        durationSec: durSec,
        rfid: sess.rfid || '',
        user: sess.user || '',
        authorized: sess.authorized ? true : false,
        energyKwh: Math.round((Number(kwh) || 0) * 1000) / 1000,
        maxKw: Math.round((Number(maxKw) || 0) * 100) / 100,
        method: (Number.isFinite(Number(sess.energyStartKwh)) && Number.isFinite(Number(sess.energyEndKwh))) ? 'meter' : 'integrated',
      };

      this.appendEvcsSession(entry, endTs);
      delete this._evcsActiveSessions[idx];
    } catch (e) {
      try { delete this._evcsActiveSessions[idx]; } catch(_e2) {}
      this.log.warn('_stopEvcsSession: ' + e.message);
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
      const ids = [wb.powerId, wb.energyTotalId, wb.statusId, wb.activeId, wb.modeId, wb.lockWriteId, wb.rfidReadId].filter(Boolean);
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
   * Subscribe + prime embedded EMS runtime states so the web UI can work without
   * requiring any additional "Modus-DP" mappings per Ladepunkt.
   *
   * Background:
   * - The EVCS page renders EMS mode buttons when `ems.chargingEnabled` is true
   *   OR when `chargingManagement.wallboxCount` is present in the /api/state cache.
   * - On upgrades, missing config flags and missing subscriptions could lead to
   *   legacy fallbacks (3-button mode) or "flattering" UI.
   */
  async subscribeEmsUiStates() {
    try {
      const cfg = this.config || {};
      const ns = this.namespace;
      const count = (Number(this.evcsCount) || (cfg && cfg.settingsConfig && Number(cfg.settingsConfig.evcsCount)) || 1);
      const evcsCount = (Number.isFinite(count) && count > 0) ? Math.round(count) : 1;

      // Subscribe to all local EMS states (wildcards are supported by ioBroker).
      // This keeps the state cache in sync and prevents UI mode buttons from jumping.
      try { await this.subscribeForeignStatesAsync(`${ns}.chargingManagement.*`); } catch (_e) {}
      try { await this.subscribeForeignStatesAsync(`${ns}.chargingManagement.wallboxes.*`); } catch (_e) {}
      try { await this.subscribeForeignStatesAsync(`${ns}.chargingManagement.stations.*`); } catch (_e) {}
      try { await this.subscribeForeignStatesAsync(`${ns}.ems.*`); } catch (_e) {}

      const prime = async (key) => {
        try {
          const st = await this.getStateAsync(key);
          if (!st || st.val === undefined) return;
          this.updateValue(key, st.val, st.ts || Date.now());
        } catch (_e) {
          // ignore
        }
      };

      // Prime global summary/control states used by the UI.
      await prime('chargingManagement.wallboxCount');
      await prime('chargingManagement.stationCount');
      await prime('chargingManagement.summary.totalPowerW');
      await prime('chargingManagement.summary.totalTargetPowerW');
      await prime('chargingManagement.summary.onlineWallboxes');
      await prime('chargingManagement.control.active');
      await prime('chargingManagement.control.mode');
      await prime('chargingManagement.control.status');
      await prime('chargingManagement.control.budgetW');
      await prime('chargingManagement.control.remainingW');
      await prime('chargingManagement.control.usedW');
      await prime('chargingManagement.control.pvAvailable');

      // Prime per-Ladepunkt runtime states (mode + boost info + station meta)
      for (let i = 1; i <= evcsCount; i++) {
        const base = `chargingManagement.wallboxes.lp${i}`;
        await prime(`${base}.userMode`);
        await prime(`${base}.effectiveMode`);
        await prime(`${base}.chargerType`);
        await prime(`${base}.online`);
        await prime(`${base}.charging`);
        await prime(`${base}.chargingSince`);
        await prime(`${base}.targetPowerW`);
        await prime(`${base}.targetCurrentA`);
        await prime(`${base}.stationKey`);
        await prime(`${base}.stationMaxPowerW`);
        await prime(`${base}.allowBoost`);
        await prime(`${base}.boostActive`);
        await prime(`${base}.boostUntil`);
        await prime(`${base}.boostRemainingMin`);
        await prime(`${base}.boostTimeoutMin`);
      }

      // Prime station states (max/remaining) if station keys are known in config.
      const toSafe = (s) => {
        try {
          return String(s || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_\-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
        } catch (_e) {
          return '';
        }
      };
      try {
        const sg = (cfg && cfg.settingsConfig && Array.isArray(cfg.settingsConfig.stationGroups)) ? cfg.settingsConfig.stationGroups : [];
        for (const g of sg) {
          if (!g) continue;
          const sk = (typeof g.stationKey === 'string') ? g.stationKey.trim() : '';
          if (!sk) continue;
          const safe = toSafe(sk);
          if (!safe) continue;
          await prime(`chargingManagement.stations.${safe}.maxPowerW`);
          await prime(`chargingManagement.stations.${safe}.remainingW`);
        }
      } catch (_e) {}
    } catch (_eOuter) {
      // never fail adapter startup due to UI convenience
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
    alias: 'Ladepunkt-Sperre',
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
      await this.ensureStorageFarmStates();
      await this.syncStorageFarmDefaultsToStates();
      await this.syncStorageFarmConfigFromAdmin();
      await this.syncInstallerConfigToStates();

      // write settings-config defaults
      await this.syncSettingsConfigToStates();
      // EVCS (multi wallbox) model states
      await this.ensureEvcsStates();
      await this.ensureRfidStates();
      await this.ensureEvcsSessionsStates();
      await this.loadEvcsSessionsCache();
      await this.seedEvcsDayBaseCache();
      await this.subscribeEvcsMappedStates();
      try { this.scheduleRfidPolicyApply('startup'); } catch(_e) {}


      // finally subscribe and read initial values
      await this.subscribeConfiguredStates();

      // Speicherfarm: abgeleitete Summenwerte (SoC/Leistung) regelmäßig aktualisieren
      try {
        const sfEnabled = !!(this.config && this.config.enableStorageFarm);
        const sfCfg = (this.config && this.config.storageFarm) || {};
        const intervalRaw = Number(sfCfg.schedulerIntervalMs);
        const interval = Number.isFinite(intervalRaw) ? Math.max(250, Math.min(60000, Math.round(intervalRaw))) : 2000;

        if (this._nwStorageFarmTimer) { try { clearInterval(this._nwStorageFarmTimer); } catch (_e) {} this._nwStorageFarmTimer = null; }

        if (sfEnabled) {
          await this.updateStorageFarmDerived('startup');
          this._nwStorageFarmTimer = setInterval(() => {
            this.updateStorageFarmDerived('timer').catch(() => {});
          }, interval);
        }
      } catch (_eSF) {}


      // EMS (Sprint 2): embedded Charging-Management engine
      try { await this.initEmsEngine(); } catch (e) { this.log.warn('EMS init failed: ' + (e && e.message ? e.message : e)); }

      // Prime + subscribe EMS runtime states for the UI (EVCS page mode buttons, boost status, etc.).
      // Without this, the UI might fall back to legacy or show default values after reload.
      try { await this.subscribeEmsUiStates(); } catch (e) { this.log.debug('EMS UI state subscribe failed: ' + (e && e.message ? e.message : e)); }

      // Energy totals: if no kWh counters are mapped, derive totals from history/influxdb
      try { await this.updateEnergyTotalsFromInflux('startup'); } catch (_e) {}
      try {
        if (this._nwEnergyTotalsTimer) clearInterval(this._nwEnergyTotalsTimer);
        this._nwEnergyTotalsTimer = setInterval(() => {
          this.updateEnergyTotalsFromInflux('timer').catch(() => {});
        }, 60 * 60 * 1000);
      } catch (_e2) {}


      this.buildSmartHomeDevicesFromConfig();
      this.log.info('NexoWatt VIS adapter ready.');
    } catch (e) {
      this.log.error(`onReady error: ${e.message}`);
    }
  }


  async initEmsEngine() {
    if (this.emsEngine) return;
    this.emsEngine = new EmsEngine(this);
    await this.emsEngine.init();
  }


  /**
   * Subscribe to internal EMS runtime states (chargingManagement.* and ems.*)
   * and prime the stateCache so the web UI can render stable values immediately.
   *
   * This fixes the multi-ladepunkt "mode buttons only appear if mode DP is mapped" issue,
   * because the EVCS UI can reliably use the embedded EMS userMode states.
   */
  async subscribeEmsUiStates() {
    const cfg = this.config || {};

    // Respect explicit disable (installer choice)
    const enabledFlag = cfg.enableChargingManagement;
    if (typeof enabledFlag === 'boolean' && enabledFlag === false) {
      return;
    }

    const count = (Number(this.evcsCount) || Number(cfg?.settingsConfig?.evcsCount) || 1);
    const evcsCount = (Number.isFinite(count) && count > 0) ? Math.round(count) : 1;

    // Subscribe to ALL internal EMS states (wildcards). This is efficient and ensures
    // state changes propagate to the SSE/stateCache.
    try { await this.subscribeForeignStatesAsync(`${this.namespace}.chargingManagement.*`); } catch (_e) {}
    try { await this.subscribeForeignStatesAsync(`${this.namespace}.ems.*`); } catch (_e2) {}

    // Prime a minimal subset that the UI uses on first render.
    const primeKey = async (key) => {
      if (!key) return;
      try {
        const st = await this.getStateAsync(key);
        if (st && st.val !== undefined) {
          this.updateValue(key, st.val, st.ts || Date.now());
        }
      } catch (_e) {
        // ignore
      }
    };

    // Global summary/control
    await primeKey('chargingManagement.wallboxCount');
    await primeKey('chargingManagement.stationCount');
    await primeKey('chargingManagement.summary.totalPowerW');
    await primeKey('chargingManagement.summary.onlineWallboxes');
    await primeKey('chargingManagement.summary.totalTargetPowerW');
    await primeKey('chargingManagement.control.active');
    await primeKey('chargingManagement.control.status');
    await primeKey('chargingManagement.control.mode');
    await primeKey('chargingManagement.control.budgetW');
    await primeKey('chargingManagement.control.remainingW');

    // Per Ladepunkt runtime states used on the EVCS page
    for (let i = 1; i <= evcsCount; i++) {
      const base = `chargingManagement.wallboxes.lp${i}`;
      await primeKey(`${base}.userMode`);
      await primeKey(`${base}.effectiveMode`);
      await primeKey(`${base}.chargerType`);
      await primeKey(`${base}.charging`);
      await primeKey(`${base}.chargingSince`);
      await primeKey(`${base}.targetPowerW`);
      await primeKey(`${base}.targetCurrentA`);
      await primeKey(`${base}.stationKey`);
      await primeKey(`${base}.stationMaxPowerW`);
      await primeKey(`${base}.allowBoost`);
      await primeKey(`${base}.boostActive`);
      await primeKey(`${base}.boostRemainingMin`);
      await primeKey(`${base}.boostUntil`);
      await primeKey(`${base}.boostTimeoutMin`);
      await primeKey(`${base}.connectorNo`);
    }

    // Stations: subscribe wildcard; values will stream in once computed.
    try { await this.subscribeForeignStatesAsync(`${this.namespace}.chargingManagement.stations.*`); } catch (_e3) {}
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


    // --- Auth ---
    // Hinweis (VIS Gate F / Versionstand 5):
    // Der separate Login-/Anmeldebereich (Admin/Installer) wurde bewusst entfernt.
    // Der VIS-Adapter läuft ausschließlich lokal im ioBroker-Netz und die Rechteverwaltung
    // erfolgt über ioBroker (Admin) bzw. über den Installer-Reiter im UI.
    // Daher werden schreibende Endpunkte nicht zusätzlich durch ein VIS-eigenes Login geschützt.
    const authCfg = (this.config && this.config.auth) || {};
    const authEnabled = false;
    const protectWrites = false;
    const sessionTtlMs = 2 * 60 * 60 * 1000;

    const installerUsers = new Set(['admin', 'installer']);
    const installerGroups = ['system.group.administrator'];

    const COOKIE_NAME = 'nw_session';
    const LEGACY_COOKIE_NAME = 'installer_session';
    this._authSessions = this._authSessions || new Map();

    const pruneSessions = () => {
      const now = Date.now();
      try {
        for (const [t, s] of this._authSessions.entries()) {
          if (!s || !s.exp || s.exp <= now) this._authSessions.delete(t);
        }
      } catch (_e) {
        // ignore
      }
    };

    const getSession = (req) => {
      if (!authEnabled) return { user: null, isInstaller: true, exp: Date.now() + sessionTtlMs, _bypass: true };
      pruneSessions();
      const cookies = parseCookies(req);
      const token = cookies[COOKIE_NAME] || cookies[LEGACY_COOKIE_NAME] || '';
      if (!token) return null;
      const s = this._authSessions.get(token);
      if (!s) return null;
      if (!s.exp || s.exp <= Date.now()) {
        this._authSessions.delete(token);
        return null;
      }
      return s;
    };

    const setSessionCookie = (res, token, ttlMs) => {
      const maxAge = Math.max(1, Math.floor(ttlMs / 1000));
      const base = `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
      // Backward compatibility: keep legacy cookie name in parallel for older frontends
      const legacy = `${LEGACY_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
      res.setHeader('Set-Cookie', [base, legacy]);
    };

    const clearSessionCookie = (res) => {
      res.setHeader('Set-Cookie', [
        `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        `${LEGACY_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      ]);
    };

    const requireAuth = (req, res, next) => {
      if (!authEnabled || !protectWrites) return next();
      const s = getSession(req);
      if (!s) return res.status(401).json({ ok: false, error: 'unauthorized' });
      req.nwSession = s;
      next();
    };

    const requireInstaller = (req, res, next) => {
      if (!authEnabled || !protectWrites) return next();
      const s = getSession(req);
      if (!s) return res.status(401).json({ ok: false, error: 'unauthorized' });
      if (!s.isInstaller) return res.status(403).json({ ok: false, error: 'forbidden' });
      req.nwSession = s;
      next();
    };

    const checkPasswordAsync = (user, pass) => new Promise((resolve) => {
      try {
        this.checkPassword(String(user || '').trim(), String(pass || ''), (ok) => resolve(!!ok));
      } catch (_e) {
        resolve(false);
      }
    });

    const isUserInGroup = async (user, groupId) => {
      try {
        const gid = String(groupId || '').trim();
        if (!gid) return false;
        const obj = await this.getForeignObjectAsync(gid);
        const members = obj && obj.common && Array.isArray(obj.common.members) ? obj.common.members : [];
        const u = 'system.user.' + String(user || '').trim();
        return members.includes(u);
      } catch (_e) {
        return false;
      }
    };

    const computeIsInstaller = async (user) => {
      const u = String(user || '').trim();
      if (!u) return false;
      if (installerUsers.has(u)) return true;
      // administrators are always allowed
      for (const gid of installerGroups) {
        // ignore empty
        if (!gid) continue;
        // a user can be member of multiple groups; first match wins
        if (await isUserInGroup(u, gid)) return true;
      }
      return false;
    };

    // Auth status (used by UI)
    app.get('/api/auth/status', (req, res) => {
      const s = getSession(req);
      res.json({
        ok: true,
        enabled: !!authEnabled,
        authed: !!s,
        user: (s && s.user) ? String(s.user) : null,
        isInstaller: !!(s && s.isInstaller),
        protectWrites: !!protectWrites,
      });
    });

    const doAuthLogin = async (req, res) => {
      try {
        if (!authEnabled) return res.json({ ok: true, enabled: false, authed: true, user: null, isInstaller: true });

        const user = String((req.body && (req.body.user || req.body.username)) || '').trim();
        const password = String((req.body && req.body.password) || '');
        if (!user || !password) return res.status(400).json({ ok: false, error: 'missing_credentials' });

        const ok = await checkPasswordAsync(user, password);
        if (!ok) return res.status(401).json({ ok: false, error: 'unauthorized' });

        const isInstaller = await computeIsInstaller(user);
        const token = createToken();
        this._authSessions.set(token, { user, isInstaller, exp: Date.now() + sessionTtlMs });
        setSessionCookie(res, token, sessionTtlMs);
        res.json({ ok: true, enabled: true, authed: true, user, isInstaller });
      } catch (e) {
        this.log.warn('auth login error: ' + (e && e.message ? e.message : e));
        res.status(500).json({ ok: false, error: 'internal_error' });
      }
    };

    // Login via ioBroker user/password
    app.post('/api/auth/login', doAuthLogin);

    // Logout
    app.post('/api/auth/logout', (req, res) => {
      try {
        const cookies = parseCookies(req);
        const token = cookies[COOKIE_NAME] || cookies[LEGACY_COOKIE_NAME] || '';
        if (token) this._authSessions.delete(token);
      } catch (_e) {
        // ignore
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    });

    // Backwards compatible endpoints (older UI)
    app.post('/api/installer/login', doAuthLogin);
    app.post('/api/installer/logout', (req, res) => {
      try {
        const cookies = parseCookies(req);
        const token = cookies[COOKIE_NAME] || cookies[LEGACY_COOKIE_NAME] || '';
        if (token) this._authSessions.delete(token);
      } catch (_e) {
        // ignore
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    });


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

    
app.post('/api/smarthome/toggle', requireAuth, async (req, res) => {
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
app.post('/api/smarthome/level', requireAuth, async (req, res) => {
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
app.post('/api/smarthome/cover', requireAuth, async (req, res) => {
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
app.post('/api/smarthome/rtrSetpoint', requireAuth, async (req, res) => {
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

    app.post('/api/smarthome/config', requireInstaller, async (req, res) => {
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
          const options = { start, end, step: stepS * 1000, aggregate: 'average', addId: false, ignoreNull: true };
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

    

// --- EVCS Report Builder (shared for JSON + CSV) ---
const nwBuildEvcsReport = async (query = {}) => {
  const hcfg = (this.config && this.config.history) || {};
  const inst = hcfg.instance || 'influxdb.0';

  const parseTs = (raw, { endOfDay = false } = {}) => {
    if (raw === null || raw === undefined || raw === '') return null;

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw < 1e12 ? raw * 1000 : raw; // seconds -> ms
    }

    const s = String(raw).trim();
    if (!s) return null;

    // numeric string
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      return n < 1e12 ? n * 1000 : n;
    }

    // Date-only (local)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(n => Number(n));
      const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
      if (endOfDay) dt.setHours(23, 59, 59, 999);
      return dt.getTime();
    }

    // ISO / other date strings
    const p = Date.parse(s);
    if (!Number.isNaN(p)) return p;

    return null;
  };

  const nowMs = Date.now();
  const defFrom = nowMs - 7 * 24 * 3600 * 1000;
  const defTo = nowMs;

  const fromQ = parseTs((query.from !== undefined ? query.from : defFrom)) ?? defFrom;
  const toQ = parseTs((query.to !== undefined ? query.to : defTo), { endOfDay: true }) ?? defTo;

  // normalize to full local days
  const d0 = new Date(fromQ); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(toQ); d1.setHours(23, 59, 59, 999);
  const start = +d0;
  const end = +d1;

  const dayKeyOf = (ts) => {
    const d = new Date(ts);
    return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const buckets = [];
  for (let d = new Date(d0); +d <= +d1; d.setDate(d.getDate() + 1)) {
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    buckets.push({ date: dayKeyOf(+s), start: +s, end: +e });
  }

  const evcs = Array.isArray(this.evcsList) ? this.evcsList : [];
  const wallboxes = evcs.map(wb => ({ index: wb.index, name: wb.name || `Ladepunkt ${wb.index}`, note: wb.note || '' }));

  // ---- history helpers ----
  const MAX_HISTORY_POINTS = 60000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const calcCount = (startMs, endMs, stepMs) => {
    const s = Number(startMs);
    const e = Number(endMs);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
    const step = Math.max(1, Number(stepMs || 120000));
    const span = e - s;
    const c = Math.ceil(span / step) + 10; // buffer
    return Math.min(MAX_HISTORY_POINTS, Math.max(50, c));
  };

  const chooseStepMs = (spanMs, baseStepMs) => {
    const base = Math.max(1000, Number(baseStepMs || 120000));
    const span = Math.max(0, Number(spanMs || 0));
    const max = Math.max(100, MAX_HISTORY_POINTS - 10);
    const needCount = Math.ceil(span / base) + 1;
    if (needCount <= max) return base;
    const neededStep = Math.ceil(span / max);
    const rounded = Math.ceil(neededStep / 60000) * 60000; // round to minutes
    return Math.max(base, rounded);
  };

  const normTsMs = (ts) => {
    const p = parseTs(ts);
    if (p != null) return p;
    const n = Number(ts);
    if (!Number.isFinite(n)) return null;
    return n < 1e12 ? n * 1000 : n;
  };

  const getHist = (id, startMs, endMs, aggregate = 'none', step = 0) => new Promise(resolve => {
    if (!id) return resolve([]);
    const agg = aggregate || 'none';
    const spanMs = Number(endMs) - Number(startMs);
    const wantsStep = step && Number(step) > 0 && agg !== 'none';
    const stepMs = wantsStep ? chooseStepMs(spanMs, Number(step)) : 0;

    const options = {
      start: startMs,
      end: endMs,
      aggregate: agg,
      addId: false,
      ignoreNull: true,
      count: calcCount(startMs, endMs, wantsStep ? stepMs : 120000),
      returnNewestEntries: true,
      removeBorderValues: true,
    };
    if (wantsStep) options.step = stepMs;

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
          .map(p => {
            const tRaw = Array.isArray(p) ? p[0] : (p.ts ?? p.time ?? p.t ?? p[0]);
            const vRaw = Array.isArray(p) ? p[1] : (p.val ?? p.value ?? p[1]);
            const t = normTsMs(tRaw);
            const v = Number(vRaw);
            if (t == null || Number.isNaN(v)) return null;
            return [Number(t), v];
          })
          .filter(Boolean)
          .sort((a, b) => a[0] - b[0]);

        resolve(norm);
      });
    } catch (e) {
      resolve([]);
    }
  });

  // ---- build day grid ----
  const days = buckets.map(b => ({ date: b.date, totalKwh: 0, wallboxes: {} }));
  const dayIndex = {}; buckets.forEach((b, i) => { dayIndex[b.date] = i; });

  for (const wb of evcs) {
    const idx = wb.index;

    const baseReportStepMs = 120000;
    const reportStepMs = chooseStepMs(end - start, baseReportStepMs);

    // Power series (W): use average for energy integration and max for daily peak
    const pAvg = await getHist(wb.powerId, start, end, 'average', reportStepMs);
    const pMax = await getHist(wb.powerId, start, end, 'max', reportStepMs);

    const pAgg = buckets.map(_b => ({ kwh: 0, maxW: 0 }));

    if (pAvg && pAvg.length) {
      const stepS = reportStepMs / 1000;
      for (const pt of pAvg) {
        const t = +pt[0];
        const v = +pt[1];
        const dk = dayKeyOf(t);
        if (!(dk in dayIndex)) continue;
        if (!isFinite(v)) continue;
        pAgg[dayIndex[dk]].kwh += Math.abs(v) * stepS / 3600 / 1000;
      }
    }

    if (pMax && pMax.length) {
      for (const pt of pMax) {
        const t = +pt[0];
        const v = +pt[1];
        const dk = dayKeyOf(t);
        if (!(dk in dayIndex)) continue;
        if (!isFinite(v)) continue;
        pAgg[dayIndex[dk]].maxW = Math.max(pAgg[dayIndex[dk]].maxW, Math.abs(v));
      }
    } else if (pAvg && pAvg.length) {
      for (const pt of pAvg) {
        const t = +pt[0];
        const v = +pt[1];
        const dk = dayKeyOf(t);
        if (!(dk in dayIndex)) continue;
        if (!isFinite(v)) continue;
        pAgg[dayIndex[dk]].maxW = Math.max(pAgg[dayIndex[dk]].maxW, Math.abs(v));
      }
    }

    // Energy per day (kWh): prefer internal energyDayKwh (max), fallback energyTotal (max-min)
    const eDayMap = {};
    try {
      const eDayId = `${this.namespace}.evcs.${idx}.energyDayKwh`;
      const eDaySeries = await getHist(eDayId, start, end, 'max', DAY_MS);
      if (eDaySeries && eDaySeries.length) {
        for (const pt of eDaySeries) {
          const t = +pt[0];
          const v = +pt[1];
          const dk = dayKeyOf(t);
          if (!(dk in dayIndex)) continue;
          if (!isFinite(v)) continue;
          eDayMap[dk] = (eDayMap[dk] === undefined) ? v : Math.max(eDayMap[dk], v);
        }
      }
    } catch (e) {}

    const eAgg = {}; // date -> {min,max}
    if (wb.energyTotalId) {
      const eMax = await getHist(wb.energyTotalId, start, end, 'max', DAY_MS);
      const eMin = await getHist(wb.energyTotalId, start, end, 'min', DAY_MS);

      const maxByDay = {};
      const minByDay = {};

      if (eMax && eMax.length) {
        for (const pt of eMax) {
          const t = +pt[0];
          const v = +pt[1];
          const dk = dayKeyOf(t);
          if (!(dk in dayIndex)) continue;
          if (!isFinite(v)) continue;
          maxByDay[dk] = (maxByDay[dk] === undefined) ? v : Math.max(maxByDay[dk], v);
        }
      }
      if (eMin && eMin.length) {
        for (const pt of eMin) {
          const t = +pt[0];
          const v = +pt[1];
          const dk = dayKeyOf(t);
          if (!(dk in dayIndex)) continue;
          if (!isFinite(v)) continue;
          minByDay[dk] = (minByDay[dk] === undefined) ? v : Math.min(minByDay[dk], v);
        }
      }

      for (const dk of Object.keys(maxByDay)) {
        if (minByDay[dk] === undefined) continue;
        eAgg[dk] = { min: minByDay[dk], max: maxByDay[dk] };
      }
    }

    for (let i = 0; i < buckets.length; i++) {
      const dk = buckets[i].date;
      const maxKw = pAgg[i].maxW ? (pAgg[i].maxW / 1000) : 0;
      let kwh = 0;

      if (eDayMap[dk] !== undefined && isFinite(eDayMap[dk])) {
        kwh = Math.max(0, eDayMap[dk]);
      } else if (eAgg[dk] && isFinite(eAgg[dk].min) && isFinite(eAgg[dk].max)) {
        kwh = Math.max(0, eAgg[dk].max - eAgg[dk].min);
      } else {
        kwh = Math.max(0, pAgg[i].kwh || 0);
      }

      days[i].wallboxes[idx] = { kwh: Math.round(kwh * 100) / 100, maxKw: Math.round(maxKw * 100) / 100 };
      days[i].totalKwh += kwh;
    }
  }

  days.forEach(d => { d.totalKwh = Math.round(d.totalKwh * 100) / 100; });

  return { start, end, wallboxes, days };
};

app.get('/api/evcs/report', async (req, res) => {
  try {
    const report = await nwBuildEvcsReport(req.query || {});
    res.json({ ok: true, ...report });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

// ---- EVCS CSV helpers ----
const nwWbLabel = (wb) => {
  if (!wb) return 'Ladepunkt';
  if (wb.name && String(wb.name).trim()) return String(wb.name).trim();
  return `Ladepunkt ${wb.index}`;
};

const nwCsvEscape = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // escape if contains delimiter, quotes or newlines
  if (/[;"\r\n]/.test(s) || /"/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const nwFormatDe = (num, digits = 2) => {
  const n = Number(num);
  if (!Number.isFinite(n)) {
    return (0).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  try {
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  } catch (e) {
    // fallback: fixed + decimal comma
    return n.toFixed(digits).replace('.', ',');
  }
};

const nwEvcsReportToCsv = (report) => {
  const wallboxes = Array.isArray(report.wallboxes) ? report.wallboxes : [];
  const days = Array.isArray(report.days) ? report.days : [];

  // header
  const header = ['Datum', 'Summe kWh'];
  for (const wb of wallboxes) {
    header.push(`${nwWbLabel(wb)} kWh`);
    header.push(`${nwWbLabel(wb)} max kW`);
  }

  const lines = [];
  lines.push(header.map(nwCsvEscape).join(';'));

  // totals accumulators
  let totalKwhAll = 0;
  const totalKwhByWb = {};
  const peakKwByWb = {};

  for (const d of days) {
    const row = [];
    row.push(d.date || '');
    const tk = Number(d.totalKwh);
    totalKwhAll += Number.isFinite(tk) ? tk : 0;
    row.push(nwFormatDe(Number.isFinite(tk) ? tk : 0));

    const wbData = d.wallboxes || {};
    for (const wb of wallboxes) {
      const idx = wb.index;
      const cell = wbData[idx] || wbData[String(idx)] || {};
      const kwh = Number(cell.kwh);
      const maxKw = Number(cell.maxKw);

      totalKwhByWb[idx] = (totalKwhByWb[idx] || 0) + (Number.isFinite(kwh) ? kwh : 0);
      peakKwByWb[idx] = Math.max(peakKwByWb[idx] || 0, (Number.isFinite(maxKw) ? maxKw : 0));

      row.push(nwFormatDe(Number.isFinite(kwh) ? kwh : 0));
      row.push(nwFormatDe(Number.isFinite(maxKw) ? maxKw : 0));
    }

    lines.push(row.map(nwCsvEscape).join(';'));
  }

  // totals row
  if (days.length) {
    const totalRow = [];
    totalRow.push('Summe Zeitraum');
    totalRow.push(nwFormatDe(totalKwhAll));

    for (const wb of wallboxes) {
      const idx = wb.index;
      totalRow.push(nwFormatDe(totalKwhByWb[idx] || 0));
      totalRow.push(nwFormatDe(peakKwByWb[idx] || 0));
    }

    lines.push(totalRow.map(nwCsvEscape).join(';'));
  }

  return lines.join('\r\n');
};

app.get('/api/evcs/report.csv', async (req, res) => {
  try {
    const report = await nwBuildEvcsReport(req.query || {});
    const fromStr = (report.days && report.days[0] && report.days[0].date) ? report.days[0].date : 'from';
    const toStr = (report.days && report.days.length && report.days[report.days.length - 1].date) ? report.days[report.days.length - 1].date : 'to';
    const filename = `EVCS_${fromStr}_${toStr}.csv`;

    const csv = '\ufeff' + nwEvcsReportToCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (e) {
    res.status(500).type('text/plain').send('EVCS CSV Fehler: ' + String(e));
  }
});

// ---- EVCS Sessions CSV helpers ----
const nwPad2 = (n) => String(Number(n) || 0).padStart(2, '0');
const nwDayKey = (tsMs) => {
  const d = new Date(Number(tsMs) || 0);
  return `${d.getFullYear()}-${nwPad2(d.getMonth() + 1)}-${nwPad2(d.getDate())}`;
};
const nwTimeHhMm = (tsMs) => {
  const d = new Date(Number(tsMs) || 0);
  return `${nwPad2(d.getHours())}:${nwPad2(d.getMinutes())}`;
};
const nwParseTsLoose = (raw, { endOfDay = false } = {}) => {
  if (raw === null || raw === undefined || raw === '') return null;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw; // seconds -> ms
  }

  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n < 1e12 ? n * 1000 : n;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(v => Number(v));
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    if (endOfDay) dt.setHours(23, 59, 59, 999);
    return dt.getTime();
  }

  const p = Date.parse(s);
  if (!Number.isNaN(p)) return p;

  return null;
};

const nwEvcsSessionsToCsv = (sessions) => {
  const header = [
    'Datum',
    'Start',
    'Ende',
    'Dauer_min',
    'Ladepunkt',
    'RFID',
    'Name',
    'Freigegeben',
    'Energie_kWh',
    'Max_kW',
    'Methode',
  ];

  const lines = [];
  lines.push(header.map(nwCsvEscape).join(';'));

  for (const s of sessions) {
    const startTs = Number(s && s.startTs) || 0;
    const endTs = Number(s && s.endTs) || 0;

    const durSec = Number(s && s.durationSec);
    const durMin = Number.isFinite(durSec) ? Math.round(durSec / 60)
      : (startTs && endTs ? Math.round((endTs - startTs) / 60000) : 0);

    const kwh = Number(s && s.energyKwh);
    const maxKw = Number(s && s.maxKw);

    const row = [
      startTs ? nwDayKey(startTs) : '',
      startTs ? nwTimeHhMm(startTs) : '',
      endTs ? nwTimeHhMm(endTs) : '',
      String(Number.isFinite(durMin) ? durMin : 0),
      (s && (s.wallboxName || s.wbName)) ? String(s.wallboxName || s.wbName) : (s && s.wallboxIndex ? `Ladepunkt ${s.wallboxIndex}` : ''),
      (s && s.rfid) ? String(s.rfid) : '',
      (s && s.user) ? String(s.user) : '',
      (s && s.authorized) ? 'JA' : 'NEIN',
      nwFormatDe(Number.isFinite(kwh) ? kwh : 0),
      nwFormatDe(Number.isFinite(maxKw) ? maxKw : 0),
      (s && s.method) ? String(s.method) : '',
    ];

    lines.push(row.map(nwCsvEscape).join(';'));
  }

  return lines.join('\r\n');
};

app.get('/api/evcs/sessions.csv', async (req, res) => {
  try {
    const fromMs = nwParseTsLoose(req.query && req.query.from) ?? null;
    const toMs = nwParseTsLoose(req.query && req.query.to, { endOfDay: true }) ?? null;

    const from = Number.isFinite(Number(fromMs)) ? Number(fromMs) : 0;
    const to = Number.isFinite(Number(toMs)) ? Number(toMs) : Date.now();

    // Prefer in-memory ring buffer
    let sessions = Array.isArray(this._evcsSessionsBuf) ? this._evcsSessionsBuf.slice() : [];

    // Fallback: read persisted state
    if (!sessions.length) {
      try {
        const st = await this.getStateAsync('evcs.sessionsJson');
        if (st && typeof st.val === 'string' && st.val.trim()) {
          const parsed = JSON.parse(st.val);
          if (Array.isArray(parsed)) sessions = parsed;
        }
      } catch (_e) {}
    }

    sessions = (Array.isArray(sessions) ? sessions : [])
      .filter(s => {
        const st = Number(s && s.startTs);
        if (!Number.isFinite(st)) return false;
        if (st < from) return false;
        if (st > to) return false;
        // ignore still running sessions (optional)
        const et = Number(s && s.endTs);
        if (!Number.isFinite(et) || et <= 0) return false;
        return true;
      })
      .sort((a, b) => (Number(a.startTs) || 0) - (Number(b.startTs) || 0));

    const fromStr = sessions.length ? nwDayKey(Number(sessions[0].startTs) || from) : nwDayKey(from);
    const toStr = sessions.length ? nwDayKey(Number(sessions[sessions.length - 1].startTs) || to) : nwDayKey(to);
    const filename = `EVCS_Sessions_${fromStr}_${toStr}.csv`;

    const csv = '\ufeff' + nwEvcsSessionsToCsv(sessions);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e) {
    res.status(500).send('csv_error');
  }
});



app.get('/config', (req, res) => {
      // UI flags: treat missing (undefined) EMS module flags as sensible defaults.
      // This avoids "legacy" fallbacks in the EVCS UI on upgrades where config flags
      // were not persisted yet.
      const cfg = this.config || {};

      const inferChargingEnabled = () => {
        const v = cfg.enableChargingManagement;
        if (typeof v === 'boolean') return v;

        // Upgrade/default behaviour: if the user did not explicitly disable charging,
        // we expose the EMS runtime controls. The embedded module itself will still
        // write setpoints only when controllable datapoints are mapped.
        try {
          const cnt = Number(cfg && cfg.settingsConfig && cfg.settingsConfig.evcsCount);
          if (Number.isFinite(cnt) && cnt > 0) return true;
          const list = Array.isArray(this.evcsList) ? this.evcsList : [];
          if (list && list.length) return true;
        } catch (_e) {
          // ignore
        }
        return false;
      };

      const boolOr = (val, def) => (typeof val === 'boolean' ? val : !!def);

      const sess = getSession(req);
      res.json({
        units: cfg.units || { power: 'W', energy: 'kWh' },
        settings: cfg.settings || {},
        settingsConfig: {
          evcsCount: (cfg && cfg.settingsConfig && Number(cfg.settingsConfig.evcsCount)) || (this.evcsCount || 1),
          evcsMaxPowerKw: (cfg && cfg.settingsConfig && Number(cfg.settingsConfig.evcsMaxPowerKw)) || 11,
          evcsList: Array.isArray(this.evcsList) ? this.evcsList : []
        },
        smartHome: cfg.smartHome || {},
        ems: {
          chargingEnabled: inferChargingEnabled(),
          peakShavingEnabled: boolOr(cfg.enablePeakShaving, false),
          gridConstraintsEnabled: boolOr(cfg.enableGridConstraints, false),
          storageEnabled: boolOr(cfg.enableStorageControl, false),
          storageFarmEnabled: boolOr(cfg.enableStorageFarm, false),
          schedulerIntervalMs: (cfg && Number(cfg.schedulerIntervalMs)) || 1000
        },
        installer: cfg.installer || {},
        adminUrl: cfg.adminUrl || null,
        auth: {
          enabled: !!authEnabled,
          authed: !!sess,
          user: (sess && sess.user) ? String(sess.user) : null,
          isInstaller: !!(sess && sess.isInstaller),
          protectWrites: !!protectWrites,
        },
        // UI compatibility flag: old frontends used "installerLocked".
        // New behaviour: installer-level features are locked until the user logs in
        // with an ioBroker account that has installer rights.
        installerLocked: (authEnabled && protectWrites) ? !(sess && sess.isInstaller) : false
      });
    });

    // snapshot
    app.get('/api/state', (_req, res) => {
      res.json(this.stateCache);
    });

    // generic setter for settings/installer datapoints
    app.post('/api/set', requireAuth, async (req, res) => {
      try {
        const scope = req.body && req.body.scope;
        const key = req.body && req.body.key;
        const value = req.body && req.body.value;
        if (!scope || !key) return res.status(400).json({ ok: false, error: 'bad request' });

        // Installer-only scopes (protect RFID whitelist + installer settings)
        if ((scope === 'installer' || scope === 'rfid') && authEnabled && protectWrites) {
          const s = req.nwSession;
          if (!s || !s.isInstaller) return res.status(403).json({ ok: false, error: 'forbidden' });
        }
        // EMS setter: per-wallbox mode override (auto|pv|minpv|boost)
        if (scope === 'ems') {
          const k = String(key || '');
          let safe = '';

          // Supported keys (examples):
          // - evcs.1.userMode
          // - 1.userMode
          // - lp1.userMode
          // - chargingManagement.wallboxes.lp1.userMode
          const mIdx = k.match(/^(?:evcs\.)?(\d+)\.(?:userMode|emsMode)$/);
          if (mIdx) {
            const idx = Math.max(1, Math.round(Number(mIdx[1] || 0)));
            safe = `lp${idx}`;
          } else {
            const mLp = k.match(/^lp(\d+)\.(?:userMode|emsMode)$/i);
            if (mLp) {
              const idx = Math.max(1, Math.round(Number(mLp[1] || 0)));
              safe = `lp${idx}`;
            } else {
              const m2 = k.match(/^chargingManagement\.(?:wallboxes\.)?([a-z0-9_]+)\.userMode$/i);
              if (m2) safe = String(m2[1] || '').trim();
            }
          }
          if (!safe) return res.status(400).json({ ok: false, error: 'bad request' });

          let v = String(value === null || value === undefined ? 'auto' : value).trim().toLowerCase();
          if (v === 'min+pv') v = 'minpv';
          if (!['auto', 'pv', 'minpv', 'boost'].includes(v)) v = 'auto';

          const id = `chargingManagement.wallboxes.${safe}.userMode`;
          try {
            await this.setStateAsync(id, v, false);

            // UX/Serienreife: allow manual boost cancel.
            // If the operator switches away from boost, clear the boost runtime indicators
            // immediately (do not wait for the next scheduler tick), so the UI can switch
            // modes reliably and the user doesn't feel "stuck".
            if (v !== 'boost') {
              try {
                await this.setStateAsync(`chargingManagement.wallboxes.${safe}.boostActive`, false, true);
                await this.setStateAsync(`chargingManagement.wallboxes.${safe}.boostSince`, 0, true);
                await this.setStateAsync(`chargingManagement.wallboxes.${safe}.boostUntil`, 0, true);
                await this.setStateAsync(`chargingManagement.wallboxes.${safe}.boostRemainingMin`, 0, true);
              } catch (_e2) {
                // ignore
              }
            }
            return res.json({ ok: true });
          } catch (e) {
            return res.status(409).json({ ok: false, error: 'not_ready' });
          }
        }

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

        // RFID settings: write to adapter states under evcs.rfid.*
        if (scope === 'rfid') {
          const rawKey = String(key || '');
          let suf = rawKey;
          if (suf.startsWith('evcs.rfid.')) suf = suf.slice(10);
          else if (suf.startsWith('rfid.')) suf = suf.slice(5);

          // allow only a small, safe subset
          const allowed = ['enabled', 'whitelistJson', 'learning.active'];
          if (!allowed.includes(suf)) return res.status(400).json({ ok: false, error: 'bad request' });

          let v = value;
          if (suf === 'enabled' || suf === 'learning.active') {
            v = !!value;
          } else if (suf === 'whitelistJson') {
            try {
              const raw = (typeof value === 'string') ? value : JSON.stringify(value);
              const parsed = raw ? JSON.parse(raw) : [];
              if (!Array.isArray(parsed)) return res.status(400).json({ ok: false, error: 'invalid json' });
              v = JSON.stringify(parsed);
            } catch (e) {
              return res.status(400).json({ ok: false, error: 'invalid json' });
            }
          }

          await this.setStateAsync('evcs.rfid.' + suf, { val: v, ack: false });
          try { this.updateValue('evcs.rfid.' + suf, v, Date.now()); } catch(_e) {}
          try { this.scheduleRfidPolicyApply('rfid-settings'); } catch(_e2) {}
          return res.json({ ok: true });
        }


        // Speicherfarm: Konfiguration ist Installateur-/Admin-Sache (ioBroker Admin / jsonConfig).
        // Im VIS-Frontend ist die Speicherfarm bewusst read-only, damit Endkunden keine DP-Zuordnung verändern können.
        if (scope === 'storageFarm') {
          return res.status(403).json({ ok: false, error: 'forbidden' });
        }


        let map = {};
        if (scope === 'installer') {
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
    const storageFarmLocalKeys = ['enabled','mode','configJson','groupsJson','totalSoc','totalChargePowerW','totalDischargePowerW','storagesOnline','storagesTotal','storagesStatusJson'];
    const keys = [
      ...Object.keys(dps),
      // always include built-in local settings keys so UI keeps values on reload
      ...settingsLocalKeys.map(k => 'settings.' + k),
      ...storageFarmLocalKeys.map(k => 'storageFarm.' + k),
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

      // For settings.* and storageFarm.* keys, fall back to local adapter states so UI preferences remain usable
      // even without external mappings. Without this, the Speicherfarm UI would not see persisted values after
      // a reload/restart because /api/state is built from the stateCache.
      if (!id && (key.startsWith('settings.') || key.startsWith('storageFarm.'))) id = namespace + key;

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
    // Feed EMS datapoint cache (for embedded charging engine)
    try {
      if (this.emsEngine && this.emsEngine.dp && typeof this.emsEngine.dp.handleStateChange === 'function') {
        this.emsEngine.dp.handleStateChange(id, state);
      }
    } catch (_e) {}
    try {
      const key = this.keyFromId(id);
      if (key) {
        this.updateValue(key, state.val, state.ts);
      }

      // Sync: EVCS numerischer Modus (evcs.<i>.mode) <-> EMS User-Mode (chargingManagement.wallboxes.lp<i>.userMode)
      try {
        if (key) {
          // 1) Wenn ein externer oder interner Modus-DP geschrieben wird (ack=false), übersetze in userMode.
          const m = key.match(/^evcs\.(\d+)\.mode$/);
          if (m && state && state.ack === false) {
            const idx = Number(m[1]);
            const mv = Number(state.val);
            const userMode = (mv === 1) ? 'boost' : (mv === 2) ? 'minpv' : (mv === 3) ? 'pv' : 'auto';
            this.setStateAsync(`chargingManagement.wallboxes.lp${idx}.userMode`, userMode, false).catch(()=>{});
          }

          // 2) Wenn userMode geändert wird, spiegle in evcs.<i>.mode (ack=true), damit UI/Kompatibilität stimmt.
          const um = key.match(/^chargingManagement\.wallboxes\.lp(\d+)\.userMode$/);
          if (um) {
            const idx = Number(um[1]);
            const v = String(state.val ?? '').toLowerCase();
            const numMode = (v === 'boost') ? 1 : (v === 'minpv') ? 2 : (v === 'pv') ? 3 : 0;
            this.setStateAsync(`evcs.${idx}.mode`, numMode, true).catch(()=>{});
          }
        }
      } catch (_e) {}

      if (key && key.startsWith('evcs.')) this.setStateAsync(key, state.val, true).catch(()=>{});
      try { this.maybeCaptureRfidLearning(id, state.val, state.ts); } catch(_e) {}

      // RFID access control: whenever a wallbox RFID datapoint changes, apply policy
      try {
        const idx = this.evcsRfidReadIdToIndex && id && this.evcsRfidReadIdToIndex[id];
        if (idx) {
          const tsMs = Number(state.ts) || Date.now();
          this.setStateAsync(`evcs.${idx}.rfidLastTs`, tsMs, true).catch(()=>{});
          try { this.updateValue(`evcs.${idx}.rfidLastTs`, tsMs, tsMs); } catch(_e2) {}
          this.scheduleRfidPolicyApply('rfid-scan', idx);
        }
      } catch(_e3) {}
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
    const prefCM = this.namespace + '.chargingManagement.';
    if (id && id.startsWith(prefS)) return 'settings.' + id.slice(prefS.length);
    if (id && id.startsWith(prefI)) return 'installer.' + id.slice(prefI.length);
    if (id && id.startsWith(prefE)) return 'evcs.' + id.slice(prefE.length);
    if (id && id.startsWith(prefCM)) return 'chargingManagement.' + id.slice(prefCM.length);
    return null;
  }

  normalizeRfidCandidate(val) {
    if (val === null || val === undefined) return '';
    let s = '';
    try { s = String(val).trim(); } catch (_e) { return ''; }
    if (!s) return '';

    // Try to extract the longest hex-like token (common RFID UID formats)
    const hexMatches = s.match(/[0-9a-fA-F]{4,}/g);
    if (hexMatches && hexMatches.length) {
      const token = hexMatches.sort((a, b) => b.length - a.length)[0];
      const out = String(token || '').toUpperCase();
      if (out === '0' || out === '0000') return '';
      return out;
    }

    // Fallback: compact and uppercase
    s = s.replace(/\s+/g, '').toUpperCase();
    if (!s || s === '0' || s === '0000' || s === 'UNKNOWN' || s === 'NONE') return '';
    return s;
  }

  maybeCaptureRfidLearning(sourceId, rawVal, ts) {
    // Capture ONLY while learning is active, and ONLY from configured RFID reader datapoints.
    if (!sourceId || !this.evcsRfidReadIds || !this.evcsRfidReadIds.size) return;
    if (!this.evcsRfidReadIds.has(sourceId)) return;

    const active = !!(this.stateCache['evcs.rfid.learning.active'] && this.stateCache['evcs.rfid.learning.active'].value);
    if (!active) return;

    const code = this.normalizeRfidCandidate(rawVal);
    if (!code) return;

    const now = Number(ts) || Date.now();

    // Persist and push live update
    this.setStateAsync('evcs.rfid.learning.lastCaptured', code, true).catch(()=>{});
    this.setStateAsync('evcs.rfid.learning.lastCapturedTs', now, true).catch(()=>{});

    // Auto-stop after first successful capture (next-card semantics)
    this.setStateAsync('evcs.rfid.learning.active', false, true).catch(()=>{});

    // Ensure VIS UI updates immediately even if local states are not subscribed elsewhere
    try { this.updateValue('evcs.rfid.learning.lastCaptured', code, now); } catch(_e) {}
    try { this.updateValue('evcs.rfid.learning.lastCapturedTs', now, now); } catch(_e) {}
    try { this.updateValue('evcs.rfid.learning.active', false, now); } catch(_e) {}

    this.log.info(`[EVCS RFID] Karte erkannt: ${code} (Quelle: ${sourceId})`);
  }


  parseRfidWhitelist(jsonStr) {
    // Returns map: { CODE: { name, comment } }
    const out = {};
    let arr = [];
    try {
      const raw = (typeof jsonStr === 'string') ? jsonStr : JSON.stringify(jsonStr || []);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) arr = parsed;
    } catch (_e) {
      arr = [];
    }
    for (const it of arr) {
      const code = this.normalizeRfidCandidate(it && (it.rfid || it.code || it.uid || it.id || it.card));
      if (!code) continue;
      const name = (it && (it.name || it.user || it.person)) ? String(it.name || it.user || it.person).trim() : '';
      const comment = (it && (it.comment || it.note)) ? String(it.comment || it.note).trim() : '';
      out[code] = { name, comment };
    }
    return out;
  }

  refreshRfidWhitelistFromCache() {
    const raw = this.stateCache['evcs.rfid.whitelistJson'] ? this.stateCache['evcs.rfid.whitelistJson'].value : '[]';
    const s = (typeof raw === 'string') ? raw : JSON.stringify(raw || []);
    if (this._rfidWhitelistJson === s && this._rfidWhitelistMap) return;
    this._rfidWhitelistJson = s;
    this._rfidWhitelistMap = this.parseRfidWhitelist(s);
  }

  isRfidEnabled() {
    return !!(this.stateCache['evcs.rfid.enabled'] && this.stateCache['evcs.rfid.enabled'].value);
  }

  setLocalStateWithCache(id, val, ts) {
    const t = Number(ts) || Date.now();
    this.setStateAsync(id, val, true).catch(()=>{});
    try { this.updateValue(id, val, t); } catch(_e) {}
  }

  scheduleRfidPolicyApply(reason, onlyIndex) {
    // Coalesce bursts of RFID scans / UI writes
    try {
      this._rfidApplyReason = reason || this._rfidApplyReason || 'rfid';
      if (onlyIndex) this._rfidApplyOnlyIndex = Number(onlyIndex) || this._rfidApplyOnlyIndex || null;
      if (this._rfidApplyTimer) return;
      this._rfidApplyTimer = setTimeout(() => {
        this._rfidApplyTimer = null;
        const idx = this._rfidApplyOnlyIndex;
        this._rfidApplyOnlyIndex = null;
        try {
          if (idx) this.applyRfidPolicyForIndex(idx, this._rfidApplyReason);
          else this.applyRfidPolicyAll(this._rfidApplyReason);
        } catch (e) {
          this.log.debug('RFID policy apply failed: ' + e.message);
        }
      }, 150);
    } catch(_e) {}
  }

  applyRfidPolicyAll(reason) {
    this.refreshRfidWhitelistFromCache();
    const enabled = this.isRfidEnabled();
    if (!Array.isArray(this.evcsList)) return;

    for (const wb of this.evcsList) {
      if (!wb || !wb.index) continue;
      this.applyRfidPolicyForIndex(wb.index, reason, enabled);
    }
  }

  applyRfidPolicyForIndex(index, reason, enabledOverride) {
    const idx = Number(index) || 0;
    if (!idx) return;

    this.refreshRfidWhitelistFromCache();
    const enabled = (enabledOverride !== undefined) ? !!enabledOverride : this.isRfidEnabled();
    const wb = (Array.isArray(this.evcsList) ? this.evcsList.find(w => w && w.index === idx) : null);
    if (!wb) return;

    const now = Date.now();
    if (!this._rfidEnforceCache) this._rfidEnforceCache = {};

    // Determine latest RFID code seen
    let code = '';
    if (wb.rfidReadId) {
      const raw = this.stateCache[`evcs.${idx}.rfidLast`] ? this.stateCache[`evcs.${idx}.rfidLast`].value : '';
      code = this.normalizeRfidCandidate(raw);
    }

    let authorized = true;
    let user = '';
    let reasonCode = 'rfid_disabled';

    if (!enabled) {
      authorized = true;
      reasonCode = 'rfid_disabled';
    } else if (!wb.rfidReadId) {
      authorized = true;
      reasonCode = 'no_rfid_dp';
    } else if (!code) {
      authorized = false;
      reasonCode = 'no_card';
    } else if (this._rfidWhitelistMap && this._rfidWhitelistMap[code]) {
      authorized = true;
      user = this._rfidWhitelistMap[code].name || '';
      reasonCode = 'whitelisted';
    } else {
      authorized = false;
      reasonCode = 'not_whitelisted';
    }

    // Update local visualization states
    this.setLocalStateWithCache(`evcs.${idx}.rfidAuthorized`, authorized, now);
    this.setLocalStateWithCache(`evcs.${idx}.rfidUser`, user, now);
    this.setLocalStateWithCache(`evcs.${idx}.rfidReason`, reasonCode, now);

    // Enforce lock/unlock only if RFID is enabled and we have a control datapoint
    let enforced = false;
    const prev = this._rfidEnforceCache[idx] || {};

    if (enabled && wb.rfidReadId) {
      if (wb.lockWriteId) {
        const want = !authorized; // Sperre: true=gesperrt (Default-Semantik)
        enforced = true;
        const cur = this.stateCache[`evcs.${idx}.lock`] ? !!this.stateCache[`evcs.${idx}.lock`].value : undefined;
        if (prev.lockWanted !== want || (cur !== undefined && cur !== want)) {
          this.setForeignStateAsync(wb.lockWriteId, want).catch(e => this.log.debug(`[EVCS RFID] lockWriteId failed: ${e.message}`));
          prev.lockWanted = want;
        }
      } else if (wb.activeId) {
        const want = !!authorized; // enable/disable charging (soft lock)
        enforced = true;
        const cur = this.stateCache[`evcs.${idx}.active`] ? !!this.stateCache[`evcs.${idx}.active`].value : undefined;
        if (prev.activeWanted !== want || (cur !== undefined && cur !== want)) {
          this.setForeignStateAsync(wb.activeId, want).catch(e => this.log.debug(`[EVCS RFID] activeId failed: ${e.message}`));
          prev.activeWanted = want;
        }
      }
    }

    this.setLocalStateWithCache(`evcs.${idx}.rfidEnforced`, enforced, now);
    prev.authorized = authorized;
    prev.user = user;
    prev.reason = reasonCode;
    prev.lastCode = code;
    prev.ts = now;
    this._rfidEnforceCache[idx] = prev;
  }


  // --- Energy totals fallback: derive kWh values from ioBroker history (InfluxDB) when no kWh counters are mapped ---
  _nwTrimId(v) {
    if (typeof v !== 'string') return '';
    const s = v.trim();
    return s ? s : '';
  }

  _nwGetHistoryInstance() {
    const hcfg = (this.config && this.config.history) || {};
    const inst = this._nwTrimId(hcfg.instance) || 'influxdb.0';
    return inst;
  }

  _nwGetHistoryDpId(name) {
    const hcfg = (this.config && this.config.history) || {};
    const dp = Object.assign({}, hcfg.datapoints || {}, hcfg.dp || {});
    const dps = (this.config && this.config.datapoints) || {};
    return this._nwTrimId(dp[name]) || this._nwTrimId(dps[name]) || '';
  }

  _nwHasMappedDatapoint(key) {
    const dps = (this.config && this.config.datapoints) || {};
    return !!this._nwTrimId(dps[key]);
  }

  _nwNormTsMs(tRaw) {
    if (tRaw == null) return null;
    if (tRaw instanceof Date) return tRaw.getTime();
    if (typeof tRaw === 'string') {
      const p = Date.parse(tRaw);
      if (!Number.isNaN(p)) return p;
    }
    const n = Number(tRaw);
    if (!Number.isFinite(n)) return null;
    return n < 1e12 ? n * 1000 : n;
  }

  _nwChooseStepMs(spanMs, targetPoints = 3000, minStepMs = 60 * 1000) {
    const s = Math.max(1, Number(spanMs) || 1);
    const t = Math.max(100, Number(targetPoints) || 3000);
    const raw = Math.ceil(s / t);
    const step = Math.max(Number(minStepMs) || 0, raw);
    // round to nice-ish boundaries to reduce adapter/DB load patterns
    const nice = [
      60e3, 120e3, 300e3, 600e3, 900e3, 1800e3,
      3600e3, 7200e3, 14400e3, 21600e3, 43200e3, 86400e3
    ];
    for (const n of nice) {
      if (step <= n) return n;
    }
    // fall back: round to hours
    const hour = 3600e3;
    return Math.ceil(step / hour) * hour;
  }

  _nwNormalizeHistoryResult(resu) {
    let arr = [];
    if (!resu) return arr;

    // influxdb adapter: { result: [ { data: [...] } ] } or { result: [...] }
    if (resu && Array.isArray(resu.result)) {
      if (resu.result.length && Array.isArray(resu.result[0]?.data)) arr = resu.result[0].data;
      else arr = resu.result;
    } else if (resu && Array.isArray(resu.series) && resu.series[0]?.values) {
      arr = resu.series[0].values.map(v => ({ ts: v[0], val: v[1] }));
    } else if (Array.isArray(resu)) {
      arr = resu;
    } else if (resu && Array.isArray(resu.data)) {
      arr = resu.data;
    }

    const norm = (arr || []).map(p => {
      const tRaw = Array.isArray(p) ? p[0] : (p.ts ?? p.time ?? p.t ?? p[0]);
      const vRaw = Array.isArray(p) ? p[1] : (p.val ?? p.value ?? p[1]);
      const ts = this._nwNormTsMs(tRaw);
      const val = Number(vRaw);
      if (ts == null || Number.isNaN(val)) return null;
      return { ts, val };
    }).filter(Boolean);

    norm.sort((a, b) => a.ts - b.ts);
    return norm;
  }

  _nwGetHistoryAvgSeries(id, startMs, endMs, stepMs) {
    return new Promise(resolve => {
      const inst = this._nwGetHistoryInstance();
      const sid = this._nwTrimId(id);
      if (!sid) return resolve([]);
      const options = { start: startMs, end: endMs, step: stepMs, aggregate: 'average', addId: false, ignoreNull: true };
      try {
        this.sendTo(inst, 'getHistory', { id: sid, options }, (resu) => {
          try { resolve(this._nwNormalizeHistoryResult(resu)); } catch (_e) { resolve([]); }
        });
      } catch (_e) {
        resolve([]);
      }
    });
  }

  _nwIntegrateKwh(series, endMs, defaultStepMs, positiveOnly = true) {
    if (!Array.isArray(series) || !series.length) return null;
    let kwh = 0;
    const end = Number(endMs) || Date.now();
    const step = Math.max(1, Number(defaultStepMs) || 60 * 1000);
    for (let i = 0; i < series.length; i++) {
      const cur = series[i];
      const nextTs = (i + 1 < series.length) ? series[i + 1].ts : end;
      let dt = Number(nextTs) - Number(cur.ts);
      if (!Number.isFinite(dt) || dt <= 0) dt = step;
      // guard against accidental huge dt gaps (restarts/holes)
      dt = Math.min(dt, step * 2);
      let v = Number(cur.val);
      if (!Number.isFinite(v)) continue;
      if (positiveOnly) v = Math.max(0, v);
      else v = Math.abs(v);
      kwh += (v * dt) / 3600000; // W * ms -> Wh -> kWh
    }
    return kwh;
  }

  async updateEnergyTotalsFromInflux(reason = 'periodic') {
    const now = Date.now();
    const LOOKBACK_DAYS = 3650; // "Gesamt" = so weit wie Influx es hergibt (typisch Retention-basiert)
    const startMs = now - LOOKBACK_DAYS * 24 * 3600 * 1000;
    const spanMs = now - startMs;

    // Only compute if the corresponding kWh datapoints are NOT mapped.
    const tasks = [];

    if (!this._nwHasMappedDatapoint('productionEnergyKwh')) {
      const id = this._nwGetHistoryDpId('pvPower');
      if (id) tasks.push((async () => {
        const stepMs = this._nwChooseStepMs(spanMs, 3500, 5 * 60 * 1000);
        const series = await this._nwGetHistoryAvgSeries(id, startMs, now, stepMs);
        const kwh = this._nwIntegrateKwh(series, now, stepMs, true);
        if (kwh != null) this.updateValue('productionEnergyKwh', kwh, now);
      })());
    }

    if (!this._nwHasMappedDatapoint('consumptionEnergyKwh')) {
      const id = this._nwGetHistoryDpId('consumptionTotal');
      if (id) tasks.push((async () => {
        const stepMs = this._nwChooseStepMs(spanMs, 3500, 5 * 60 * 1000);
        const series = await this._nwGetHistoryAvgSeries(id, startMs, now, stepMs);
        const kwh = this._nwIntegrateKwh(series, now, stepMs, true);
        if (kwh != null) this.updateValue('consumptionEnergyKwh', kwh, now);
      })());
    }

    if (!this._nwHasMappedDatapoint('gridEnergyKwh')) {
      const id = this._nwGetHistoryDpId('gridBuyPower');
      if (id) tasks.push((async () => {
        const stepMs = this._nwChooseStepMs(spanMs, 3500, 5 * 60 * 1000);
        const series = await this._nwGetHistoryAvgSeries(id, startMs, now, stepMs);
        const kwh = this._nwIntegrateKwh(series, now, stepMs, true);
        if (kwh != null) this.updateValue('gridEnergyKwh', kwh, now);
      })());
    }

    // "Letzte Ladung" (EVCS): fallback from history if not mapped
    if (!this._nwHasMappedDatapoint('evcsLastChargeKwh')) {
      const evcsId = this._nwGetHistoryDpId('evcsPower');
      if (evcsId) tasks.push((async () => {
        const days = 14;
        const start = now - days * 24 * 3600 * 1000;
        const stepMs = 60 * 1000;
        const series = await this._nwGetHistoryAvgSeries(evcsId, start, now, stepMs);

        const thrW = 200; // ignore noise
        let endIdx = -1;
        for (let i = series.length - 1; i >= 0; i--) {
          if ((Number(series[i].val) || 0) >= thrW) { endIdx = i; break; }
        }
        if (endIdx < 0) {
          // No charge found in window -> leave as '--' (null)
          return;
        }

        // walk backwards until we have a few consecutive points below threshold
        let startIdx = endIdx;
        let below = 0;
        for (let i = endIdx; i >= 0; i--) {
          const v = Number(series[i].val) || 0;
          if (v < thrW) below++;
          else below = 0;
          if (below >= 3) { startIdx = Math.min(endIdx, i + 3); break; }
          startIdx = i;
        }

        const seg = series.slice(startIdx, endIdx + 1);
        const kwh = this._nwIntegrateKwh(seg, now, stepMs, true);
        if (kwh != null) this.updateValue('evcsLastChargeKwh', kwh, now);
      })());
    }

    try { await Promise.allSettled(tasks); } catch (_e) {}
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

    // EVCS session logger (start/stop + energy/max + RFID)
    try { this.maybeUpdateEvcsSessionTracker(key, ts); } catch(_e2) {}

// push update to all SSE clients (batched to avoid UI freezes)
    try {
      if (!this._ssePendingPayload) this._ssePendingPayload = {};
      Object.assign(this._ssePendingPayload, payload);

      if (!this._sseFlushTimer) {
        const batchMs = (this.config && Number(this.config.sseBatchMs)) || 120;
        this._sseFlushTimer = setTimeout(() => {
          const p = this._ssePendingPayload || {};
          this._ssePendingPayload = {};
          this._sseFlushTimer = null;
          if (!p || !Object.keys(p).length) return;

          for (const client of Array.from(this.sseClients)) {
            try {
              client.res.write("data: " + JSON.stringify({ type: 'update', payload: p }) + "\n\n");
            } catch (_e) {
              this.sseClients.delete(client);
            }
          }
        }, Math.max(10, batchMs));
      }
    } catch (_e) {}
  }

  onUnload(callback) {
    try {
      try { if (this._nwEnergyTotalsTimer) clearInterval(this._nwEnergyTotalsTimer); } catch (_e) {}
      try { if (this._sseFlushTimer) clearTimeout(this._sseFlushTimer); } catch (_e) {}
      try { if (this.emsEngine && typeof this.emsEngine.stop === 'function') this.emsEngine.stop(); } catch (_e2) {}
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