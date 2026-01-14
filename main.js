
'use strict';

const utils = require('@iobroker/adapter-core');
const express = require('express');
const path = require('path');
// NOTE: Installer/App-Center configurations can become large (e.g. many EVCS/Ladepunkte).
// The default Express JSON limit (100kb) is too small and causes "Payload Too Large" and failed saves.
const bodyParser = express.json({ limit: '5mb' });
const crypto = require('crypto');
const pkg = require('./package.json');

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
      // Persisted App‑Center configuration (JSON patch).
      // IMPORTANT: We intentionally persist this in states instead of system.adapter.<instance>.native
      // to avoid triggering ioBroker instance restarts (which broke the App‑Center “save”).
      configJson:   { type: 'string', role: 'json', def: '{}' },
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
    // NOTE: These are user-facing runtime settings that the VIS UI reads via /api/state.
    // Keep this list in sync with syncSettingsToStates() and the frontend (www/app.js, www/ems-apps.js).
    const defs = {
      dynamicTariff: { type: 'boolean', role: 'state', def: false },
      storagePower: { type: 'number', role: 'value.power', def: 1000 },
      price: { type: 'number', role: 'value', def: 0.25 },
      priority: { type: 'number', role: 'value', def: 2 },
      tariffMode: { type: 'number', role: 'value', def: 1 },

      // EVCS defaults mirrored into runtime settings (written by syncSettingsConfigToStates())
      evcsCount: { type: 'number', role: 'value', def: 1 },
      evcsMaxPower: { type: 'number', role: 'value.power', def: 11000 },

      // Energy-flow presentation toggles
      flowSubtractEvFromBuilding: { type: 'boolean', role: 'state', def: true },
      flowInvertGrid: { type: 'boolean', role: 'state', def: false },
      flowInvertBattery: { type: 'boolean', role: 'state', def: false },
      flowInvertPv: { type: 'boolean', role: 'state', def: false },
      flowInvertEv: { type: 'boolean', role: 'state', def: false },
      flowGridShowNet: { type: 'boolean', role: 'state', def: true },

      // Backwards compatible / unused in UI (kept so upgrades do not break existing objects)
      flowInvertStorage: { type: 'boolean', role: 'state', def: false },
      flowInvertEvcs: { type: 'boolean', role: 'state', def: false },
      flowInvertConsumers: { type: 'boolean', role: 'state', def: false },
    };

    for (const [key, c] of Object.entries(defs)) {
      const id = `settings.${key}`;
      await this.setObjectNotExistsAsync(id, {
        type: 'state',
        common: { name:id, type:c.type, role:c.role, read:true, write:true, def:c.def },
        native: {}
      });

      // Seed default state value only if the state does not exist yet (fresh install / upgrade).
      // This keeps existing user preferences intact across updates.
      try {
        const st = await this.getStateAsync(id);
        if (!st) {
          await this.setStateAsync(id, { val: c.def, ack: true });
        }
      } catch (_e) {}
    }
  }


  /**
   * Deep merge helper used for App‑Center config patches.
   *
   * Notes:
   * - Arrays are replaced (not concatenated).
   * - Objects are merged recursively.
   * - Primitive values overwrite.
   */
  nwDeepMerge(target, patch) {
    if (patch === undefined) return target;
    if (patch === null) return null;

    // Replace arrays wholesale (but clone for safety)
    if (Array.isArray(patch)) {
      return patch.map((v) => {
        if (v && typeof v === 'object') {
          return this.nwDeepMerge(Array.isArray(v) ? [] : {}, v);
        }
        return v;
      });
    }

    // Primitives overwrite
    if (typeof patch !== 'object') {
      return patch;
    }

    // Ensure target is an object
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      target = {};
    }

    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        target[k] = this.nwDeepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }

    return target;
  }


  /**
   * Normalize EMS App installation/enabled state into a canonical structure.
   *
   * IMPORTANT:
   * - Must match the App‑Center (www/ems-apps.js) app IDs (charging/peak/storage/storagefarm/…).
   * - The App‑Center stores its configuration patch in adapter states and we merge that patch during startup.
   *
   * We also support legacy key names from older versions (e.g. peakShaving/storageFarm).
   */
  nwNormalizeEmsApps(nativeObj) {
    const n = (nativeObj && typeof nativeObj === 'object') ? nativeObj : {};
    const base = (n.emsApps && typeof n.emsApps === 'object') ? n.emsApps : {};
    const appsStored = (base.apps && typeof base.apps === 'object') ? base.apps : {};

    const CATALOG = [
      { id: 'charging',    enableFlag: 'enableChargingManagement', defaultInstalled: true },
      { id: 'peak',        enableFlag: 'enablePeakShaving' },
      { id: 'storage',     enableFlag: 'enableStorageControl' },
      { id: 'storagefarm', enableFlag: 'enableStorageFarm' },
      { id: 'thermal',     enableFlag: 'enableThermalControl' },
      { id: 'bhkw',        enableFlag: 'enableBhkwControl' },
      { id: 'generator',   enableFlag: 'enableGeneratorControl' },
      { id: 'threshold',   enableFlag: 'enableThresholdControl' },
      { id: 'relay',       enableFlag: 'enableRelayControl' },
      { id: 'grid',        enableFlag: 'enableGridConstraints' },

      // Shared helper module (always present for UI/runtime convenience)
      { id: 'tariff',      enableFlag: null, mandatory: true, defaultInstalled: true },

      // Installer-only toggle stored in installerConfig.para14a (no legacy enableFlag)
      { id: 'para14a',     enableFlag: null, mandatory: false },

      { id: 'multiuse',    enableFlag: 'enableMultiUse' },
    ];

    // Legacy key aliases -> canonical App‑Center IDs
    const KEY_ALIASES = {
      peak:        ['peak', 'peakShaving', 'peakshaving'],
      storagefarm: ['storagefarm', 'storageFarm', 'storage_farm'],
    };

    const out = {
      schemaVersion: 1,
      apps: {},
    };

    for (const a of CATALOG) {
      const keys = KEY_ALIASES[a.id] || [a.id];
      let stored = null;
      for (const k of keys) {
        if (appsStored && appsStored[k] && typeof appsStored[k] === 'object') {
          stored = appsStored[k];
          break;
        }
      }

      let installed = (stored && typeof stored.installed === 'boolean') ? stored.installed : undefined;
      let enabled   = (stored && typeof stored.enabled === 'boolean') ? stored.enabled : undefined;

      // Installed defaults:
      // - mandatory apps: always installed
      // - defaultInstalled apps: installed by default (e.g. charging, tariff)
      // - otherwise derive from legacy enable flags if present
      if (installed === undefined) {
        if (a.mandatory) installed = true;
        else if (a.defaultInstalled) installed = true;
        else if (a.enableFlag && typeof n[a.enableFlag] === 'boolean') installed = !!n[a.enableFlag];
        else installed = false;
      }

      // Enabled defaults:
      // - mandatory apps: enabled
      // - derive from legacy enable flags if present
      // - otherwise enabled == installed
      if (enabled === undefined) {
        if (a.mandatory) enabled = true;
        else if (a.enableFlag && typeof n[a.enableFlag] === 'boolean') enabled = !!n[a.enableFlag];
        else enabled = installed;
      }

      // Mandatory apps cannot be uninstalled/disabled
      if (a.mandatory) {
        installed = true;
        enabled = true;
      }

      // Safety: a non-installed app must never be enabled
      if (!installed) enabled = false;

      out.apps[a.id] = {
        installed: !!installed,
        enabled: !!enabled,
      };
    }

    // Preserve optional meta fields if present
    if (base.groups && typeof base.groups === 'object') out.groups = base.groups;
    if (base.meta && typeof base.meta === 'object') out.meta = base.meta;

    return out;
  }


  /**
   * Apply emsApps installation state to legacy boolean flags.
   *
   * We keep the legacy flags because other parts of the adapter still check
   * enableXyz booleans.
   */
  nwApplyEmsAppsToLegacyFlags(nativeObj) {
    if (!nativeObj || typeof nativeObj !== 'object') return nativeObj;
    const n = nativeObj;

    const apps = this.nwNormalizeEmsApps(n);
    n.emsApps = apps;

    const CATALOG = [
      { id: 'charging',    enableFlag: 'enableChargingManagement' },
      { id: 'peak',        enableFlag: 'enablePeakShaving' },
      { id: 'storage',     enableFlag: 'enableStorageControl' },
      { id: 'storagefarm', enableFlag: 'enableStorageFarm' },
      { id: 'thermal',     enableFlag: 'enableThermalControl' },
      { id: 'bhkw',        enableFlag: 'enableBhkwControl' },
      { id: 'generator',   enableFlag: 'enableGeneratorControl' },
      { id: 'threshold',   enableFlag: 'enableThresholdControl' },
      { id: 'relay',       enableFlag: 'enableRelayControl' },
      { id: 'grid',        enableFlag: 'enableGridConstraints' },
      { id: 'multiuse',    enableFlag: 'enableMultiUse' },
    ];

    for (const a of CATALOG) {
      const st = (apps.apps && apps.apps[a.id]) ? apps.apps[a.id] : null;
      n[a.enableFlag] = !!(st && st.installed && st.enabled);
    }

    // §14a is controlled via installerConfig.para14a
    try {
      const p = (apps.apps && apps.apps.para14a) ? apps.apps.para14a : null;
      n.installerConfig = (n.installerConfig && typeof n.installerConfig === 'object') ? n.installerConfig : {};
      n.installerConfig.para14a = !!(p && p.installed && p.enabled);
    } catch (_e) {
      // ignore
    }

    // Apply installer-only MultiUse (storage SoC zones) policy (if enabled)
    try {
      this.nwApplyStorageMultiUsePolicy(n);
    } catch (_e) {
      // ignore
    }

    return n;
  }




  /**
   * Load persisted App‑Center configuration patch from `installer.configJson`.
   *
   * Why states?
   * Saving into system.adapter.<instance>.native triggers an ioBroker instance
   * restart, which broke the frontend "Speichern" flow (Failed to fetch, SSE drop).
   */

  /**
   * Installer-only MultiUse policy for storage: derive SoC zone parameters for
   * Notstrom-Reserve, Lastspitzenkappung (LSK) and Eigenverbrauch (Entladung).
   *
   * This intentionally only writes the *zone thresholds + enable flags* into
   * nativeObj.storage to keep the rest of the storage-control tuning untouched.
   *
   * Expected installerConfig format:
   *   installerConfig.storageMultiUse = {
   *     enabled: true|false,
   *     reserveEnabled: true|false,
   *     reserveToSocPct: 10,
   *     peakEnabled: true|false,
   *     peakToSocPct: 50,
   *     selfEnabled: true|false,
   *     selfToSocPct: 100
   *   }
   */
  nwApplyStorageMultiUsePolicy(nativeObj) {
    try {
      if (!nativeObj || typeof nativeObj !== 'object') return nativeObj;

      const ic = (nativeObj.installerConfig && typeof nativeObj.installerConfig === 'object') ? nativeObj.installerConfig : null;
      const mu = (ic && typeof ic.storageMultiUse === 'object') ? ic.storageMultiUse : null;
      if (!mu) return nativeObj;

      // Only apply when the MultiUse app itself is enabled.
      // If MultiUse is enabled, storage-control must be active, otherwise the SoC zones have no effect.
      // We therefore implicitly enable storage-control at runtime when MultiUse is active.
      if (!nativeObj.enableMultiUse) return nativeObj;

      if (mu.enabled !== true) return nativeObj;

      if (!nativeObj.enableStorageControl) {
        nativeObj.enableStorageControl = true;
      }

      const clampInt = (v, min, max, def) => {
        const n = Number.parseInt(v, 10);
        if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
        return def;
      };

      const reserveEnabled = (mu.reserveEnabled !== false);
      const peakEnabled = (mu.peakEnabled !== false);
      const selfEnabled = (mu.selfEnabled !== false);

      // Neue MultiUse-Parameter: min/max pro Bereich (Reserve/LSK/Eigenverbrauch).
      // Für ältere Configs werden weiterhin reserveTo/peakTo/selfTo unterstützt.
      const legacyReserveTo = clampInt(mu.reserveToSocPct, 0, 99, 10);
      const legacyPeakTo = clampInt(mu.peakToSocPct, legacyReserveTo, 100, 50);
      const legacySelfTo = clampInt(mu.selfToSocPct, legacyPeakTo, 100, 100);

      const reserveMin = clampInt(mu.reserveMinSocPct, 0, 100, legacyReserveTo);
      const reserveTarget = clampInt(mu.reserveTargetSocPct, reserveMin, 100, reserveMin);

      // Baseline-Minimum for down-stream zones:
      // - If Reserve is disabled, it must not constrain other zones.
      const reserveBaseMin = reserveEnabled ? reserveMin : 0;

      const lskMin = clampInt(mu.lskMinSocPct, reserveBaseMin, 100, reserveBaseMin);
      const lskMax = clampInt(mu.lskMaxSocPct, lskMin, 100, legacyPeakTo);

      // Eigenverbrauch-Minimum:
      // - If LSK is enabled, Eigenverbrauch starts above LSK-Max (disjoint zones).
      // - If LSK is disabled, Eigenverbrauch may start already at Reserve-Min (or 0 if Reserve disabled).
      const selfBaseMin = peakEnabled ? lskMax : reserveBaseMin;
      const selfMin = clampInt(mu.selfMinSocPct, selfBaseMin, 100, selfBaseMin);
      const selfMax = clampInt(mu.selfMaxSocPct, selfMin, 100, legacySelfTo);

      nativeObj.storage = (nativeObj.storage && typeof nativeObj.storage === 'object') ? nativeObj.storage : {};
      const st = nativeObj.storage;

      // Notstrom / Reserve: blocks discharge below reserveMin. Optionaler Refill bis reserveTarget.
      st.reserveEnabled = reserveEnabled;
      st.reserveMinSocPct = reserveMin;
      st.reserveTargetSocPct = reserveTarget;

      // Peak shaving / LSK: SoC Band lskMin..lskMax
      st.lskEnabled = peakEnabled;
      st.lskDischargeEnabled = peakEnabled;
      st.lskChargeEnabled = peakEnabled;
      st.lskMinSocPct = lskMin;
      st.lskMaxSocPct = lskMax;

      // Eigenverbrauch: Entladung nur oberhalb selfMin (bis selfMax)
      st.selfDischargeEnabled = selfEnabled;
      st.selfMinSocPct = selfMin;
      st.selfMaxSocPct = selfMax;

      // Eigenverbrauch: NVP‑Regelung (Ziel‑Import + Deadband)
      //
      // Wichtig: Diese Parameter werden bewusst über das App‑Center (installer.configJson)
      // konfiguriert und NICHT über die ioBroker‑Instanz‑Einstellungen.
      // Damit bleiben EMS‑Setups portabel und können später ohne native‑Config übernommen werden.
      const selfTargetGridW = clampInt(mu.selfTargetGridImportW, 0, 1000000, 50);
      const selfDeadbandW = clampInt(mu.selfImportThresholdW, 0, 1000000, 50);
      st.selfTargetGridImportW = selfTargetGridW;
      st.selfImportThresholdW = selfDeadbandW;

      return nativeObj;
    } catch (e) {
      try {
        this.log && this.log.warn && this.log.warn(`[multiuse] Failed to apply storage MultiUse policy: ${e?.message || e}`);
      } catch (_e) {
        // ignore
      }
      return nativeObj;
    }
  }


  async loadInstallerConfigFromState() {
    try {
      let patch = {};
      const st = await this.getStateAsync('installer.configJson');
      const raw = st && st.val;
      if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') patch = parsed;
        } catch (e) {
          this.log.warn('installer.configJson: invalid JSON, ignoring. ' + (e && e.message ? e.message : e));
        }
      }

      this._nwInstallerConfigPatch = patch;

      // Merge patch into runtime config
      this.config = this.config || {};
      this.config = this.nwDeepMerge(this.config, patch);

      // Ensure emsApps + legacy enable flags are consistent at runtime
      this.nwApplyEmsAppsToLegacyFlags(this.config);
    } catch (e) {
      this.log.warn('loadInstallerConfigFromState failed: ' + (e && e.message ? e.message : e));
    }
  }


  async persistInstallerConfigToState(patchObj) {
    try {
      const obj = (patchObj && typeof patchObj === 'object') ? patchObj : {};
      const json = JSON.stringify(obj);
      await this.setStateAsync('installer.configJson', { val: json, ack: true });
    } catch (e) {
      this.log.warn('persistInstallerConfigToState failed: ' + (e && e.message ? e.message : e));
    }
  }



  // --- App‑Center Backup (Export/Import) ---
  // Stores a persistent copy of the installer configuration in 0_userdata.0 so that
  // it can survive adapter uninstall/reinstall.
  async nwEnsureUserdataBackupObjects() {
    const base = '0_userdata.0.nexowattVis';

    try {
      const ch = await this.getForeignObjectAsync(base);
      if (!ch) {
        await this.setForeignObjectAsync(base, {
          type: 'channel',
          common: { name: 'NexoWatt VIS – Backup' },
          native: {},
        });
      }
    } catch (_e) {
      // 0_userdata might not exist or permissions might be missing
      return false;
    }

    const ensureState = async (id, common) => {
      try {
        const obj = await this.getForeignObjectAsync(id);
        if (!obj) {
          await this.setForeignObjectAsync(id, { type: 'state', common, native: {} });
        }
      } catch (_e) {}
    };

    await ensureState(`${base}.backupJson`, {
      name: 'NexoWatt VIS – Installer Konfiguration (Backup JSON)',
      type: 'string',
      role: 'json',
      read: true,
      write: true,
      def: '{}',
    });

    await ensureState(`${base}.backupTs`, {
      name: 'NexoWatt VIS – Backup Timestamp (ms)',
      type: 'number',
      role: 'value.time',
      read: true,
      write: true,
      def: 0,
    });

    return true;
  }

  async nwWriteUserdataBackup(patchObj, reason) {
    try {
      const ok = await this.nwEnsureUserdataBackupObjects();
      if (!ok) return false;

      const patch = (patchObj && typeof patchObj === 'object') ? patchObj : {};
      const backup = {
        backupVersion: 1,
        createdAt: new Date().toISOString(),
        adapter: 'nexowatt-vis',
        adapterVersion: (pkg && pkg.version) ? String(pkg.version) : '',
        instance: this.instance,
        reason: reason ? String(reason) : '',
        configPatch: patch,
      };

      const base = '0_userdata.0.nexowattVis';
      await this.setForeignStateAsync(`${base}.backupJson`, { val: JSON.stringify(backup), ack: true });
      await this.setForeignStateAsync(`${base}.backupTs`, { val: Date.now(), ack: true });

      return true;
    } catch (_e) {
      return false;
    }
  }

  async nwReadUserdataBackup() {
    const base = '0_userdata.0.nexowattVis';
    try {
      const st = await this.getForeignStateAsync(`${base}.backupJson`);
      const raw = st && st.val;
      if (typeof raw === 'string' && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_e) {}
    return null;
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
          invertChargeSign: !!r.invertChargeSign,
          dischargePowerId: String(r.dischargePowerId || '').trim(),
          invertDischargeSign: !!r.invertDischargeSign,
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
        const invChg = !!row.invertChargeSign;
        const invDchg = !!row.invertDischargeSign;
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
          if (Number.isFinite(v)) {
            let vv = invChg ? -v : v;
            // In der Farm interpretieren wir Ladeleistung als positive Größe.
            // Negative Werte (z.B. signed power DP) werden hier als 0 behandelt.
            if (vv < 0) vv = 0;
            totalCharge += vv;
            status.chargePowerW = vv;
            anyOk = true;
          }
        }
        if (dchgId) {
          const st = await this.getForeignStateAsync(dchgId).catch(() => null);
          const v = st && st.val !== undefined && st.val !== null ? Number(st.val) : NaN;
          if (Number.isFinite(v)) {
            let vv = invDchg ? -v : v;
            // In der Farm interpretieren wir Entladeleistung als positive Größe.
            if (vv < 0) vv = 0;
            totalDischarge += vv;
            status.dischargePowerW = vv;
            anyOk = true;
          }
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
        // Aggregierte Werte als Fallback für den Energiefluss‑Monitor,
        // falls die generischen Batterie‑Datenpunkte nicht gemappt sind.
        try {
          const now = Date.now();
          if (typeof this._nwHasMappedDatapoint === 'function') {
            if (!this._nwHasMappedDatapoint('storageSoc')) this.updateValue('storageSoc', Math.round(totalSoc * 10) / 10, now);
            if (!this._nwHasMappedDatapoint('storageChargePower')) this.updateValue('storageChargePower', Math.round(totalCharge), now);
            if (!this._nwHasMappedDatapoint('storageDischargePower')) this.updateValue('storageDischargePower', Math.round(totalDischarge), now);
            if (!this._nwHasMappedDatapoint('batteryPower')) this.updateValue('batteryPower', Math.round(totalDischarge - totalCharge), now);
          }
        } catch (_e3) {}

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
        setSignedPowerId: String(r.setSignedPowerId || '').trim(),
        invertChargeSign: !!r.invertChargeSign,
        invertDischargeSign: !!r.invertDischargeSign,
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
      // A storage can be controlled either via separate setpoints (Soll Laden / Soll Entladen)
      // or via a single signed setpoint (setSignedPowerId).
      if (direction === 'charge') return !!(s.setSignedPowerId || s.setChargePowerId);
      if (direction === 'discharge') return !!(s.setSignedPowerId || s.setDischargePowerId);
      return !!(s.setSignedPowerId || s.setChargePowerId || s.setDischargePowerId);
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

      // Hersteller-/Adapterabhängige Vorzeichen-Konventionen:
      // - Standard (separate Soll-Laden/Soll-Entladen): positive Werte.
      // - Pro Speicher kann das Vorzeichen für Laden/Entladen invertiert werden.
      // - Optional: Ein einzelner Signed-Sollwert (setSignedPowerId) kann beide Richtungen steuern.
      const outChargeW = s.invertChargeSign ? -chargeW : chargeW;
      const outDischargeW = s.invertDischargeSign ? -dischargeW : dischargeW;

      // Signed mapping (falls genutzt): Default = Entladen positiv, Laden negativ.
      // Über invertChargeSign / invertDischargeSign kann pro Richtung gedreht werden.
      let outSignedW = 0;
      if (s.setSignedPowerId) {
        if (direction === 'charge') outSignedW = -Math.abs(chargeW);
        else if (direction === 'discharge') outSignedW = +Math.abs(dischargeW);
        else outSignedW = 0;
        if (direction === 'charge' && s.invertChargeSign) outSignedW = -outSignedW;
        if (direction === 'discharge' && s.invertDischargeSign) outSignedW = -outSignedW;
      }

      const r = { name: s.name || '', chargeW, dischargeW, ok: true, writes: {} };

      if (s.setSignedPowerId) {
        const wr = await this._sfWriteIfChanged(s.setSignedPowerId, outSignedW);
        r.writes.signed = wr;
        if (!wr.ok) r.ok = false;
        if (wr.ok) anyOkRelevant = true;
      } else {
        // Write charge setpoint
        if (s.setChargePowerId) {
          const wr = await this._sfWriteIfChanged(s.setChargePowerId, outChargeW);
          r.writes.charge = wr;
          if (!wr.ok) r.ok = false;
          if (direction === 'charge' && wr.ok) anyOkRelevant = true;
          if (direction === 'idle' && wr.ok) anyOkRelevant = true;
        }
        // Write discharge setpoint
        if (s.setDischargePowerId) {
          const wr = await this._sfWriteIfChanged(s.setDischargePowerId, outDischargeW);
          r.writes.discharge = wr;
          if (!wr.ok) r.ok = false;
          if (direction === 'discharge' && wr.ok) anyOkRelevant = true;
          if (direction === 'idle' && wr.ok) anyOkRelevant = true;
        }
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

  async syncSettingsToStates() {
    // Mirror selected native.settings values into adapter states (used by VIS)
    const s = (this.config && this.config.settings && typeof this.config.settings === 'object') ? this.config.settings : {};

    const getBool = (key, def) => {
      const raw = s[key];
      if (raw === undefined || raw === null) return !!def;
      return !!raw;
    };

    const toSet = {
      flowSubtractEvFromBuilding: getBool('flowSubtractEvFromBuilding', true),
      flowInvertGrid: getBool('flowInvertGrid', false),
      flowInvertBattery: getBool('flowInvertBattery', false),
      flowInvertPv: getBool('flowInvertPv', false),
      flowInvertEv: getBool('flowInvertEv', false),
      flowGridShowNet: getBool('flowGridShowNet', true),
    };

    for (const [k, v] of Object.entries(toSet)) {
      try {
        await this.setStateAsync(`settings.${k}`, { val: v, ack: true });
      } catch (_e) {}
    }
  }

  async syncSettingsConfigToStates() {
    const cfg = (this.config && this.config.settingsConfig) || {};
    const ratedKw = Number(cfg.evcsMaxPowerKw || 11); // default 11 kW
    const ratedW  = Math.round(ratedKw * 1000);
    const evcsCount = Math.max(1, Math.min(50, Math.round(Number(cfg.evcsCount || 1))));
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
      // Aktivierung & Priorität (für EMS-Lademanagement)
      const enabled = (row && typeof row.enabled === 'boolean') ? !!row.enabled : true;
      const priorityRaw = (row && row.priority !== undefined && row.priority !== null && String(row.priority).trim() !== '' && Number.isFinite(Number(row.priority))) ? Math.round(Number(row.priority)) : 999;
      const priority = Math.max(1, Math.min(999, priorityRaw));

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
            // Optional: Fahrzeug-SoC (in %) – falls die Wallbox/Backend es liefert
      const vehicleSocId = (row && typeof row.vehicleSocId === 'string' && row.vehicleSocId.trim()) ? row.vehicleSocId.trim() : '';
evcsList.push({ index: i+1, enabled, priority, name, note, powerId, energyTotalId, statusId, activeId, modeId, lockWriteId, rfidReadId, setCurrentAId, setPowerWId, onlineId, enableWriteId, chargerType, phases, voltageV, controlPreference, minCurrentA, maxCurrentA, maxPowerW, stepA, stepW, userMode, stationKey, connectorNo, allowBoost, boostTimeoutMin, vehicleSocId });
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
      if (wb.vehicleSocId) this.evcsIdToKey[wb.vehicleSocId] = `evcs.${wb.index}.vehicleSoc`;
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
        vehicleSoc:     { type: 'number', role: 'value.battery', def: 0, read: true, write: false, unit: '%' },
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
      const ids = [wb.powerId, wb.energyTotalId, wb.statusId, wb.activeId, wb.modeId, wb.lockWriteId, wb.rfidReadId, wb.vehicleSocId].filter(Boolean);
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

      // Subscribe to all local EMS states (wildcards are supported by the runtime).
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

async migrateNativeConfig() {
    // IMPORTANT:
    // We ONLY normalize values in-memory for the current runtime.
    // Writing back into system.adapter.<instance>.native triggers an ioBroker restart
    // and breaks the VIS/App‑Center UX ("Failed to fetch" + SSE disconnect).
    try {
      this.config = this.config || {};
      const nat = this.config;

      let changed = false;

      const ensureObject = (key) => {
        const v = nat[key];
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
          nat[key] = {};
          changed = true;
        }
      };

      const setNumber = (path, def) => {
        const parts = String(path).split('.');
        if (!parts.length) return;
        let cur = nat;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
            cur[p] = {};
            changed = true;
          }
          cur = cur[p];
        }
        const last = parts[parts.length - 1];
        const raw = cur[last];

        // Normalize to number (JSONConfig number fields behave poorly with "" / strings in some Admin versions)
        let n;
        if (raw === '' || raw === null || raw === undefined) {
          n = Number(def);
        } else if (typeof raw === 'number') {
          n = raw;
        } else {
          n = Number(raw);
          if (!Number.isFinite(n)) n = Number(def);
        }

        if (!Number.isFinite(n)) n = Number(def);

        // Only write if different type/value to avoid unnecessary object writes
        if (cur[last] !== n) {
          cur[last] = n;
          changed = true;
        }
      };

      const setBoolean = (path, def) => {
        const parts = String(path).split('.');
        let cur = nat;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
            cur[p] = {};
            changed = true;
          }
          cur = cur[p];
        }
        const last = parts[parts.length - 1];
        const raw = cur[last];
        const b = (raw === undefined || raw === null) ? !!def : !!raw;
        if (cur[last] !== b) {
          cur[last] = b;
          changed = true;
        }
      };

      // Ensure sub-objects exist (avoid "null" breaking JSONConfig bindings)
      ensureObject('peakShaving');
      ensureObject('storageFarm');
      ensureObject('storage');

      // Peak Shaving (EMS – Peak Shaving)
      setNumber('peakShaving.maxPowerW', 0);
      setNumber('peakShaving.reserveW', 0);
      setNumber('peakShaving.safetyMarginW', 0);
      setNumber('peakShaving.smoothingSeconds', 10);
      setNumber('peakShaving.hysteresisW', 500);
      setNumber('peakShaving.activateDelaySeconds', 2);
      setNumber('peakShaving.releaseDelaySeconds', 5);

      // Farm update interval
      setNumber('storageFarm.schedulerIntervalMs', 2000);

      // Global scheduler tick
      setNumber('schedulerIntervalMs', 1000);

      // Storage reserve defaults (avoid NaN/blank blocking Admin save)
      setBoolean('storage.reserveEnabled', false);
      setNumber('storage.reserveMinSocPct', 20);
      setNumber('storage.reserveTargetSocPct', 25);
      setNumber('storage.reserveGridChargeW', 0);

      if (changed) {
        this.log.info('Config normalized for runtime (numeric/boolean native values).');
      }
    } catch (e) {
      this.log.warn('Config migration failed: ' + (e && e.message ? e.message : e));
    }
}


  /**
   * Remove stale/orphaned objects that were created dynamically in older configurations
   * (e.g. Verbraucher/Erzeuger history channels that are no longer mapped).
   *
   * Important safety rules:
   * - We ONLY delete objects inside this adapter namespace.
   * - We only delete well-known dynamic branches where the desired existence is
   *   unambiguously derived from the current config.
   */
  async cleanupOrphanedObjects() {
    try {
      // Keep in sync with ems/modules/charging-management.js (toSafeIdPart)
      const toSafeIdPart = (input) => {
        const s = String(input || '').trim();
        if (!s) return '';
        return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
      };

      const dps = (this.config && this.config.datapoints) || {};

      const delRec = async (id) => {
        try {
          // recursive removes child states/channels
          await this.delObjectAsync(id, { recursive: true });
        } catch (_e) {
          // ignore
        }
      };

      // 1) Historie optional series (Energiefluss: Verbraucher/Erzeuger)
      const MAX_CONSUMERS = 10;
      const MAX_PRODUCERS = 5;

      for (let i = 1; i <= MAX_CONSUMERS; i++) {
        const dpKey = `consumer${i}Power`;
        const mapped = String(dps[dpKey] || '').trim();
        if (!mapped) {
          await delRec(`historie.consumers.c${i}`);
        }
      }

      for (let i = 1; i <= MAX_PRODUCERS; i++) {
        const dpKey = `producer${i}Power`;
        const mapped = String(dps[dpKey] || '').trim();
        if (!mapped) {
          await delRec(`historie.producers.p${i}`);
        }
      }

      // 2) EVCS + Charging-Management dynamic channels beyond configured count
      // (Typical source of "leftover" objects after reducing the number of Ladepunkte)
      const evcsCount = Number(this.evcsCount || 0);
      if (Number.isFinite(evcsCount) && evcsCount >= 0) {
        // Be conservative: only clean a reasonable upper range.
        const MAX_EVCSSLOTS = 10;
        for (let i = evcsCount + 1; i <= MAX_EVCSSLOTS; i++) {
          await delRec(`evcs.${i}`);
          await delRec(`chargingManagement.wallboxes.lp${i}`);
          await delRec(`historie.evcs.lp${i}`);
        }
      }

      // 3) Charging-Management station groups: remove channels that are not part of the current config
      try {
        const cm = (this.config && this.config.chargingManagement) || {};
        const wallboxes = Array.isArray(cm.wallboxes) ? cm.wallboxes : [];
        const keep = new Set();
        for (const wb of wallboxes) {
          if (!wb) continue;
          const k = String(wb.stationKey || '').trim();
          const safe = toSafeIdPart(k);
          if (safe) keep.add(safe);
        }
        // Always cleanup child station channels. If no station keys are configured anymore,
        // this removes ALL previously created station group channels.
        const view = await this.getObjectViewAsync('system', 'channel', {
          startkey: `${this.namespace}.chargingManagement.stations.`,
          endkey: `${this.namespace}.chargingManagement.stations.\u9999`
        }).catch(() => null);

        const rows = (view && view.rows) ? view.rows : [];
        for (const r of rows) {
          const fullId = r && r.id ? String(r.id) : '';
          if (!fullId.startsWith(`${this.namespace}.chargingManagement.stations.`)) continue;
          const short = fullId.slice(this.namespace.length + 1); // remove '<namespace>.'
          const parts = short.split('.');
          const stationKey = parts.length >= 3 ? parts[2] : '';
          if (!stationKey) continue;
          if (keep.size === 0 || !keep.has(stationKey)) {
            await delRec(short);
          }
        }
      } catch (_eStations) {}

    } catch (e) {
      this.log.debug('cleanupOrphanedObjects failed: ' + (e && e.message ? e.message : e));
    }
  }


async onReady() {
    try {
      await this.migrateNativeConfig();
      // start web server
      await this.startServer();

      // create states first, then write config defaults
      await this.ensureInstallerStates();
      // cleanup: remove deprecated 'installer.password' object if present
      try { await this.delObjectAsync('installer.password'); } catch(_e) { /* ignore */ }

      await this.ensureSettingsStates();

      // Load persisted App‑Center configuration (stored in adapter states).
      // This must happen before we sync defaults and start the EMS engine.
      await this.loadInstallerConfigFromState();

      // Auto-backup installer config to 0_userdata.0 (survives uninstall/reinstall)
      try {
        const p = (this._nwInstallerConfigPatch && typeof this._nwInstallerConfigPatch === 'object') ? this._nwInstallerConfigPatch : {};
        if (p && Object.keys(p).length) {
          await this.nwWriteUserdataBackup(p, 'startup');
        }
      } catch (_e) {}


      await this.ensureStorageFarmStates();
      await this.syncStorageFarmDefaultsToStates();
      await this.syncStorageFarmConfigFromAdmin();
      await this.syncInstallerConfigToStates();
      await this.syncSettingsToStates();

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

      // Historie (Influx): canonical export states under 'nexowatt-vis.0.historie.*'
      // This avoids double-mapping of device datapoints for dashboards/history.
      try {
        await this.ensureHistorieExportStates();
        await this.updateHistorieExportStates('startup');
        this.startHistorieExportTimer();
      } catch (e) {
        this.log.debug('Historie export init failed: ' + (e && e.message ? e.message : e));
      }


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

      // Cleanup: remove stale/orphaned dynamic objects no longer configured.
      // This keeps the Objects tree tidy when mappings/counts are reduced.
      try { await this.cleanupOrphanedObjects(); } catch (_e) {}

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
    // UI-States auch dann bereitstellen, wenn das Modul vorübergehend deaktiviert ist.

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
      await primeKey(`${base}.goalEnabled`);
      await primeKey(`${base}.goalTargetSocPct`);
      await primeKey(`${base}.goalFinishTs`);
      await primeKey(`${base}.goalBatteryKwh`);
      await primeKey(`${base}.goalActive`);
      await primeKey(`${base}.goalRemainingMin`);
      await primeKey(`${base}.goalRequiredPowerW`);
      await primeKey(`${base}.goalDesiredPowerW`);
      await primeKey(`${base}.goalShortfallW`);
      await primeKey(`${base}.goalStatus`);
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

    // Ensure JSON error responses for oversized payloads (important for the App-Center save call)
    // so the frontend can show a meaningful message instead of failing JSON parsing.
    app.use((err, req, res, next) => {
      try {
        if (err && (err.type === 'entity.too.large' || err.status === 413)) {
          return res.status(413).json({ ok: false, error: 'payload too large' });
        }
      } catch (_e) {}
      return next(err);
    });


    // --- Auth ---
    // Hinweis (VIS Gate F / Versionstand 5):
    // Der separate Login-/Anmeldebereich (Admin/Installer) wurde bewusst entfernt.
    // Der VIS-Adapter läuft ausschließlich lokal; die Rechteverwaltung erfolgt über Admin
    // bzw. über den Installer-Reiter im UI.
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

    // Login via user/password
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

        // Persist inside adapter states (same mechanism as App‑Center installer config)
        // to avoid triggering an ioBroker instance restart.
        let persisted = false;
        try {
          const basePatch = (this._nwInstallerConfigPatch && typeof this._nwInstallerConfigPatch === 'object')
            ? this._nwInstallerConfigPatch
            : {};
          let mergedPatch = this.nwDeepMerge({}, basePatch);
          mergedPatch = this.nwDeepMerge(mergedPatch, { smartHomeConfig: out });

          await this.persistInstallerConfigToState(mergedPatch);
          this._nwInstallerConfigPatch = mergedPatch;
          persisted = true;
        } catch (e) {
          this.log.warn('SmartHomeConfig save (state persist) error: ' + e.message);
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

    
    app.get('/api/smarthome/dpsearch', requireInstaller, async (req, res) => {
      try {
        const qRaw = (req.query && req.query.q) || '';
        const q = (typeof qRaw === 'string' ? qRaw : String(qRaw || '')).trim();
        const qLower = (q || '').toLowerCase();

        const limitRaw = (req.query && req.query.limit) || '';
        let limit = parseInt(limitRaw, 10);
        if (!Number.isFinite(limit) || limit <= 0) limit = 200;
        if (limit > 5000) limit = 5000;

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



          // Build byId map (plain object) for fast lookup


          const byId = {};


          for (const it of items) {


            if (!it || !it.id) continue;


            byId[it.id] = it;


          }



          // Build a lightweight trie for folder-like browsing (dot-separated IDs)


          const makeNode = () => ({ children: Object.create(null), item: null });


          const root = makeNode();


          for (const it of items) {


            const sid = String(it.id || '');


            if (!sid) continue;


            const parts = sid.split('.').filter(Boolean);


            let node = root;


            for (const seg of parts) {


              if (!node.children[seg]) node.children[seg] = makeNode();


              node = node.children[seg];


            }


            node.item = it;


          }



          this._nwDpCache = { ts: now, items, byId, trie: root };


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



    // --- Installer / EMS Apps API ---
    // Diese API dient dazu, die Konfiguration (native) auch direkt über die Installer-Webseite
    // zu pflegen. Änderungen werden in system.adapter.<namespace>.native persistiert.

    const _nwDeepMerge = (target, patch) => {
      if (!patch || typeof patch !== 'object') return target;
      if (!target || typeof target !== 'object') target = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          target[k] = _nwDeepMerge(target[k], v);
        } else {
          target[k] = v;
        }
      }
      return target;
    };

    // --- EMS App-Center (Phase 2) ---
    // We treat each EMS capability as an installable "App" for this site/instance.
    // The runtime remains backward compatible by mapping App states to existing enable* flags.
    const _nwAppCatalog = [
      { id: 'charging', label: 'Lademanagement', desc: 'PV-Überschussladen, Budget, Ladepunkte/Connectors', enableFlag: 'enableChargingManagement', mandatory: false },
      { id: 'peak', label: 'Peak-Shaving', desc: 'Lastspitzenkappung / Import-Limit', enableFlag: 'enablePeakShaving', mandatory: false },
      { id: 'storage', label: 'Speicherregelung', desc: 'Eigenverbrauch / Speicher-Setpoints (herstellerunabhängig)', enableFlag: 'enableStorageControl', mandatory: false },
      { id: 'storagefarm', label: 'Speicherfarm', desc: 'Mehrere Speichersysteme als Pool/Gruppen', enableFlag: 'enableStorageFarm', mandatory: false },
      { id: 'thermal', label: 'Wärmepumpe & Klima', desc: 'PV-Überschuss-Steuerung (Setpoint, On/Off oder SG-Ready) mit Schnellsteuerung', enableFlag: 'enableThermalControl', mandatory: false },
      { id: 'bhkw', label: 'BHKW', desc: 'BHKW-Steuerung (Start/Stop, SoC-geführt) mit Schnellsteuerung', enableFlag: 'enableBhkwControl', mandatory: false },
      { id: 'generator', label: 'Generator', desc: 'Generator-Steuerung (Notstrom/Netzparallelbetrieb, SoC-geführt) mit Schnellsteuerung', enableFlag: 'enableGeneratorControl', mandatory: false },
      { id: 'threshold', label: 'Schwellwertsteuerung', desc: 'Regeln (Wenn X > Y dann Schalten/Setzen) – optional mit Endkunden-Anpassung', enableFlag: 'enableThresholdControl', mandatory: false },
      { id: 'relay', label: 'Relaissteuerung', desc: 'Manuelle Relais / generische Ausgänge (optional endkundentauglich)', enableFlag: 'enableRelayControl', mandatory: false },
      { id: 'grid', label: 'Netzlimits', desc: 'Netzrestriktionen (z.B. RLM/0‑Einspeisung/Import‑Limits)', enableFlag: 'enableGridConstraints', mandatory: false },
      // tariff is a shared helper module (provider + budget). Keep it always present.
      { id: 'tariff', label: 'Tarife', desc: 'Preis-Signal / Ladepark-Budget / Netzladung-Freigabe', enableFlag: null, mandatory: true },
      { id: 'para14a', label: '§14a Steuerung', desc: 'Abregelung/Leistungsdeckel für steuerbare Verbraucher (falls aktiviert)', enableFlag: null, mandatory: false },
      { id: 'multiuse', label: 'MultiUse', desc: 'Weitere interne Logik-Bausteine', enableFlag: 'enableMultiUse', mandatory: false },
    ];

    const _nwNormalizeEmsApps = (nativeObj) => {
      const n = nativeObj && typeof nativeObj === 'object' ? nativeObj : {};
      const stored = (n.emsApps && typeof n.emsApps === 'object') ? n.emsApps : {};
      const appsStored = (stored.apps && typeof stored.apps === 'object') ? stored.apps : {};

      const out = {
        schemaVersion: 1,
        apps: {},
      };

      for (const a of _nwAppCatalog) {
        const s = (appsStored && appsStored[a.id] && typeof appsStored[a.id] === 'object') ? appsStored[a.id] : {};

        // Defaults: if no stored state exists, derive from legacy enable flags.
        let installed = (typeof s.installed === 'boolean') ? s.installed : undefined;
        let enabled = (typeof s.enabled === 'boolean') ? s.enabled : undefined;

        // Installed defaults:
        // - mandatory apps: always installed
        // - charging: installed by default because it provides runtime states used by the VIS (EVCS UI)
        // - others: derive from legacy enable flags
        if (installed === undefined) {
          if (a.mandatory) installed = true;
          else if (a.id === 'charging') installed = true;
          else if (a.enableFlag && typeof n[a.enableFlag] === 'boolean') installed = !!n[a.enableFlag];
          else installed = false;
        }

        // Enabled defaults:
        // - mandatory apps: enabled
        // - derive from legacy enable flags if present
        // - otherwise: disabled by default
        if (enabled === undefined) {
          if (a.mandatory) enabled = true;
          else if (a.enableFlag && typeof n[a.enableFlag] === 'boolean') enabled = !!n[a.enableFlag];
          else enabled = false;
        }

        // Mandatory apps cannot be uninstalled/disabled
        if (a.mandatory) {
          installed = true;
          enabled = true;
        }

        // Safety rule: an app that is not installed must never be enabled.
        // This avoids "ghost" runtime activation if a stale config contained enabled=true while installed=false.
        if (!installed) {
          enabled = false;
        }

        out.apps[a.id] = {
          installed: !!installed,
          enabled: !!enabled,
          // app-specific config is currently stored in existing native keys
        };
      }

      // Preserve optional meta fields
      if (stored.groups && typeof stored.groups === 'object') out.groups = stored.groups;
      if (stored.meta && typeof stored.meta === 'object') out.meta = stored.meta;

      return out;
    };

    const _nwApplyEmsAppsToLegacyFlags = (nativeObj) => {
      const n = nativeObj && typeof nativeObj === 'object' ? nativeObj : {};
      const emsApps = _nwNormalizeEmsApps(n);

      // Map app enabled-state to legacy enable flags so the existing EMS runtime works unchanged.
      for (const a of _nwAppCatalog) {
        if (!a.enableFlag) continue;
        const st = emsApps.apps && emsApps.apps[a.id] ? emsApps.apps[a.id] : null;
        const enabled = !!(st && st.installed && st.enabled);
        n[a.enableFlag] = enabled;
      }

      // §14a is controlled via installerConfig.para14a
      try {
        const p = emsApps.apps && emsApps.apps.para14a ? emsApps.apps.para14a : null;
        const active = !!(p && p.installed && p.enabled);
        n.installerConfig = (n.installerConfig && typeof n.installerConfig === 'object') ? n.installerConfig : {};
        n.installerConfig.para14a = active;
      } catch (_e) {
        // ignore
      }

      // Persist normalized emsApps object back into native so UI stays consistent.
      n.emsApps = _nwNormalizeEmsApps(n);
      return n;
    };

    const _nwPickInstallerConfig = (nativeObj) => {
      const n = nativeObj && typeof nativeObj === 'object' ? nativeObj : {};
      return {
        version: (typeof n.version === 'string' ? n.version : undefined),
        port: (typeof n.port === 'number' ? n.port : undefined),

        // Apps (Module)
        enableChargingManagement: (typeof n.enableChargingManagement === 'boolean') ? n.enableChargingManagement : undefined,
        enablePeakShaving: (typeof n.enablePeakShaving === 'boolean') ? n.enablePeakShaving : undefined,
        enableStorageControl: (typeof n.enableStorageControl === 'boolean') ? n.enableStorageControl : undefined,
        enableStorageFarm: (typeof n.enableStorageFarm === 'boolean') ? n.enableStorageFarm : undefined,
        enableThermalControl: (typeof n.enableThermalControl === 'boolean') ? n.enableThermalControl : undefined,
        enableBhkwControl: (typeof n.enableBhkwControl === 'boolean') ? n.enableBhkwControl : undefined,
        enableGeneratorControl: (typeof n.enableGeneratorControl === 'boolean') ? n.enableGeneratorControl : undefined,
        enableThresholdControl: (typeof n.enableThresholdControl === 'boolean') ? n.enableThresholdControl : undefined,
        enableRelayControl: (typeof n.enableRelayControl === 'boolean') ? n.enableRelayControl : undefined,
        enableGridConstraints: (typeof n.enableGridConstraints === 'boolean') ? n.enableGridConstraints : undefined,
        enableMultiUse: (typeof n.enableMultiUse === 'boolean') ? n.enableMultiUse : undefined,

        // Phase 2: App-Center state (install/enable)
        emsApps: _nwNormalizeEmsApps(n),

        // Scheduler
        schedulerIntervalMs: (typeof n.schedulerIntervalMs === 'number') ? n.schedulerIntervalMs : undefined,

        // Plant-level
        installerConfig: (n.installerConfig && typeof n.installerConfig === 'object') ? n.installerConfig : {},

        // Mapping
        datapoints: (n.datapoints && typeof n.datapoints === 'object') ? n.datapoints : {},
        vis: (n.vis && typeof n.vis === 'object') ? n.vis : {},

        // VIS/EVCS configuration (for installer page)
        settingsConfig: (n.settingsConfig && typeof n.settingsConfig === 'object') ? n.settingsConfig : {},

        // Energiefluss/VIS-Optionen (native.settings)
        settings: (n.settings && typeof n.settings === 'object') ? n.settings : {},

        // Module configs
        peakShaving: (n.peakShaving && typeof n.peakShaving === 'object') ? n.peakShaving : {},
        gridConstraints: (n.gridConstraints && typeof n.gridConstraints === 'object') ? n.gridConstraints : {},
        storageFarm: (n.storageFarm && typeof n.storageFarm === 'object') ? n.storageFarm : {},
        storage: (n.storage && typeof n.storage === 'object') ? n.storage : {},
        thermal: (n.thermal && typeof n.thermal === 'object') ? n.thermal : {},
        bhkw: (n.bhkw && typeof n.bhkw === 'object') ? n.bhkw : {},
        generator: (n.generator && typeof n.generator === 'object') ? n.generator : {},
        threshold: (n.threshold && typeof n.threshold === 'object') ? n.threshold : {},
        relay: (n.relay && typeof n.relay === 'object') ? n.relay : {},
        chargingManagement: (n.chargingManagement && typeof n.chargingManagement === 'object') ? n.chargingManagement : {},
      };
    };

    const _nwRestartEms = async () => {
      try {
        if (this.emsEngine && typeof this.emsEngine.stop === 'function') {
          this.emsEngine.stop();
        }
      } catch (_e) {}

      try {
        if (this.emsEngine && typeof this.emsEngine.init === 'function') {
          await this.emsEngine.init();
        }
      } catch (e) {
        try { this.log.warn('EMS restart failed: ' + (e && e.message ? e.message : e)); } catch (_e2) {}
      }
    };

    app.get('/api/installer/config', requireInstaller, async (_req, res) => {
      try {
        // IMPORTANT: App‑Center config is persisted in adapter states (installer.configJson), not in
        // system.adapter.<instance>.native. Persisting to native triggers an ioBroker instance restart
        // and breaks the UI with "Failed to fetch" + SSE disconnects.
        const nativeObj = (this.config && typeof this.config === 'object') ? this.config : {};
        res.json({ ok: true, config: _nwPickInstallerConfig(nativeObj) });
      } catch (e) {
        this.log.warn('Installer config API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    app.post('/api/installer/config', requireInstaller, async (req, res) => {
      try {
        const body = req.body || {};
        const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};
        const restartEms = body.restartEms !== false; // default true

        const allowedRoot = new Set([
          // Legacy enable flags (kept for backwards compatibility)
          'enableChargingManagement','enablePeakShaving','enableStorageControl','enableStorageFarm','enableThermalControl','enableBhkwControl','enableGeneratorControl','enableThresholdControl','enableRelayControl','enableGridConstraints','enableMultiUse',

          // Phase 2: App Center state
          'emsApps',

          // Scheduler + base mapping
          'schedulerIntervalMs','installerConfig','datapoints','vis','settings',

          // App/module configs
          'peakShaving','gridConstraints','storageFarm','storage','thermal','bhkw','generator','threshold','relay','chargingManagement',

          // VIS configuration that is required to configure chargepoints/stations in the installer page
          'settingsConfig',

          // Optional diagnostics settings
          'diagnostics',
        ]);

        // Build sanitized patch
        const safePatch = {};
        for (const [k, v] of Object.entries(patch)) {
          if (!allowedRoot.has(k)) continue;
          safePatch[k] = v;
        }

        // Persist (state‑based) + apply to runtime config.
        // We merge into the already persisted patch (loaded on startup) to keep full configuration.
        const basePatch = (this._nwInstallerConfigPatch && typeof this._nwInstallerConfigPatch === 'object') ? this._nwInstallerConfigPatch : {};
        let mergedPatch = this.nwDeepMerge(this.nwDeepMerge({}, basePatch), safePatch);
        // Normalize App‑Center config and map App toggles to legacy enable* flags
        mergedPatch = this.nwApplyEmsAppsToLegacyFlags(mergedPatch);

        // Persist patch to states (no ioBroker restart)
        await this.persistInstallerConfigToState(mergedPatch);
        this._nwInstallerConfigPatch = mergedPatch;
        // Persist an additional uninstall-proof backup into 0_userdata.0
        try { await this.nwWriteUserdataBackup(mergedPatch, 'config-save'); } catch (_e) {}


        // Apply to runtime config (best‑effort)
        this.config = (this.config && typeof this.config === 'object') ? this.config : {};
        this.config = this.nwDeepMerge(this.config, safePatch);
        try { this.nwApplyEmsAppsToLegacyFlags(this.config); } catch (_e) {}

        // Apply updated VIS/EVCS configuration to runtime (best-effort)
        try { await this.syncInstallerConfigToStates(); } catch (_e) {}
        try { await this.syncSettingsToStates(); } catch (_e) {}
        try { await this.syncSettingsConfigToStates(); } catch (_e) {}
        try { await this.ensureEvcsStates(); } catch (_e) {}
        try { await this.ensureRfidStates(); } catch (_e) {}
        try { await this.subscribeEvcsMappedStates(); } catch (_e) {}

        // Re-subscribe to mapped states so the VIS immediately sees fresh values
        try {
          if (typeof this.subscribeConfiguredStates === 'function') {
            await this.subscribeConfiguredStates();
          }
        } catch (_e) {}

        // StorageFarm: derived status + scheduler in sync after installer save
        try { await this.ensureStorageFarmStates(); } catch (_e) {}
        try { await this.syncStorageFarmDefaultsToStates(); } catch (_e) {}
        try { await this.syncStorageFarmConfigFromAdmin(); } catch (_e) {}
        try {
          if (this._nwStorageFarmTimer) {
            clearInterval(this._nwStorageFarmTimer);
            this._nwStorageFarmTimer = null;
          }

          const enabledSf = !!(this.config && this.config.enableStorageFarm);
          const sfCfg = (this.config && this.config.storageFarm && typeof this.config.storageFarm === 'object') ? this.config.storageFarm : {};
          const interval = (sfCfg.schedulerIntervalMs !== undefined && sfCfg.schedulerIntervalMs !== null && Number.isFinite(Number(sfCfg.schedulerIntervalMs)))
            ? Math.max(500, Math.round(Number(sfCfg.schedulerIntervalMs)))
            : 2000;

          if (enabledSf) {
            await this.updateStorageFarmDerived('config-save');
            this._nwStorageFarmTimer = setInterval(() => { this.updateStorageFarmDerived('timer').catch(() => {}); }, interval);
          }
        } catch (_e) {}

        if (restartEms) {
          await _nwRestartEms();
        }

        res.json({ ok: true, config: _nwPickInstallerConfig(this.config || {}), restarted: !!restartEms });
      } catch (e) {
        this.log.warn('Installer config save API error: ' + e.message);
        // Send a concise message to the frontend to avoid "Speichern fehlgeschlagen" without context.
        const msg = (e && e.message) ? String(e.message) : 'internal error';
        res.status(500).json({ ok: false, error: msg });
      }
    });


    // --- App‑Center Backup / Export / Import ---
    // Export creates a portable JSON file containing the full installer config patch.
    // Import restores the patch (optionally replacing or merging) and re-syncs runtime states.
    // Additionally, every save/import writes a backup into 0_userdata.0 (survives uninstall/reinstall).
    app.get('/api/installer/backup/export', requireInstaller, async (_req, res) => {
      try {
        const patch = (this._nwInstallerConfigPatch && typeof this._nwInstallerConfigPatch === 'object') ? this._nwInstallerConfigPatch : {};
        const backup = {
          backupVersion: 1,
          createdAt: new Date().toISOString(),
          adapter: 'nexowatt-vis',
          adapterVersion: (pkg && pkg.version) ? String(pkg.version) : '',
          instance: this.instance,
          configPatch: patch,
        };
        res.json({ ok: true, backup });
      } catch (e) {
        const msg = (e && e.message) ? String(e.message) : 'internal error';
        res.status(500).json({ ok: false, error: msg });
      }
    });

    app.get('/api/installer/backup/userdata', requireInstaller, async (_req, res) => {
      try {
        const backup = await this.nwReadUserdataBackup();
        if (!backup) {
          res.json({ ok: true, exists: false });
          return;
        }

        let bytes = 0;
        try { bytes = JSON.stringify(backup).length; } catch (_e) {}

        res.json({
          ok: true,
          exists: true,
          meta: {
            backupVersion: backup.backupVersion || 0,
            createdAt: backup.createdAt || '',
            adapterVersion: backup.adapterVersion || '',
            instance: backup.instance,
            reason: backup.reason || '',
            bytes,
          },
          backup,
        });
      } catch (e) {
        const msg = (e && e.message) ? String(e.message) : 'internal error';
        res.status(500).json({ ok: false, error: msg });
      }
    });

    app.post('/api/installer/backup/import', requireInstaller, async (req, res) => {
      try {
        const body = req.body || {};
        const restartEms = body.restartEms !== false; // default true
        const mode = String(body.mode || 'replace').toLowerCase(); // replace | merge

        // Accept both a wrapped backup object or a raw patch.
        let patch = null;

        if (body.backup && typeof body.backup === 'object') {
          const b = body.backup;
          patch = (b.configPatch && typeof b.configPatch === 'object') ? b.configPatch
            : (b.patch && typeof b.patch === 'object') ? b.patch
            : (b.config && typeof b.config === 'object') ? b.config
            : (b && typeof b === 'object') ? b
            : null;
        } else if (body.patch && typeof body.patch === 'object') {
          patch = body.patch;
        }

        if (!patch || typeof patch !== 'object') {
          res.status(400).json({ ok: false, error: 'invalid backup/patch' });
          return;
        }

        const allowedRoot = new Set([
          // Legacy enable flags (kept for backwards compatibility)
          'enableChargingManagement','enablePeakShaving','enableStorageControl','enableStorageFarm','enableThermalControl','enableBhkwControl','enableGeneratorControl','enableThresholdControl','enableRelayControl','enableGridConstraints','enableMultiUse',

          // Phase 2: App Center state
          'emsApps',

          // Scheduler + base mapping
          'schedulerIntervalMs','installerConfig','datapoints','vis','settings',

          // App/module configs
          'peakShaving','gridConstraints','storageFarm','storage','thermal','bhkw','generator','threshold','relay','chargingManagement',

          // VIS configuration that is required to configure chargepoints/stations in the installer page
          'settingsConfig',

          // Optional diagnostics settings
          'diagnostics',
        ]);

        // Build sanitized patch
        const safePatch = {};
        for (const [k, v] of Object.entries(patch)) {
          if (!allowedRoot.has(k)) continue;
          safePatch[k] = v;
        }

        // Replace vs merge
        let finalPatch = this.nwDeepMerge({}, safePatch);
        finalPatch = this.nwApplyEmsAppsToLegacyFlags(finalPatch);

        if (mode === 'merge') {
          const basePatch = (this._nwInstallerConfigPatch && typeof this._nwInstallerConfigPatch === 'object') ? this._nwInstallerConfigPatch : {};
          finalPatch = this.nwDeepMerge(this.nwDeepMerge({}, basePatch), finalPatch);
          finalPatch = this.nwApplyEmsAppsToLegacyFlags(finalPatch);
        }

        // Persist patch to states (no ioBroker restart)
        await this.persistInstallerConfigToState(finalPatch);
        this._nwInstallerConfigPatch = finalPatch;

        // Apply to runtime config based on instance native (drop old patch leftovers)
        let baseNative = {};
        try {
          const instObj = await this.getForeignObjectAsync(`system.adapter.${this.name}.${this.instance}`);
          baseNative = (instObj && instObj.native && typeof instObj.native === 'object') ? instObj.native : {};
        } catch (_e) {}

        this.config = this.nwDeepMerge(this.nwDeepMerge({}, baseNative), finalPatch);
        try { this.nwApplyEmsAppsToLegacyFlags(this.config); } catch (_e) {}

        // Apply updated config to runtime (best-effort)
        try { await this.syncInstallerConfigToStates(); } catch (_e) {}
        try { await this.syncSettingsToStates(); } catch (_e) {}
        try { await this.syncSettingsConfigToStates(); } catch (_e) {}
        try { await this.ensureEvcsStates(); } catch (_e) {}
        try { await this.ensureRfidStates(); } catch (_e) {}
        try { await this.subscribeEvcsMappedStates(); } catch (_e) {}

        // Re-subscribe to mapped states so the VIS immediately sees fresh values
        try {
          if (typeof this.subscribeConfiguredStates === 'function') {
            await this.subscribeConfiguredStates();
          }
        } catch (_e) {}

        // StorageFarm: derived status + scheduler in sync after import
        try { await this.ensureStorageFarmStates(); } catch (_e) {}
        try { await this.syncStorageFarmDefaultsToStates(); } catch (_e) {}
        try { await this.syncStorageFarmConfigFromAdmin(); } catch (_e) {}

        // Persist uninstall-proof backup
        try { await this.nwWriteUserdataBackup(finalPatch, 'import'); } catch (_e) {}

        if (restartEms) {
          await _nwRestartEms();
        }

        res.json({ ok: true, imported: true, restarted: !!restartEms, config: _nwPickInstallerConfig(this.config || {}) });
      } catch (e) {
        const msg = (e && e.message) ? String(e.message) : 'internal error';
        res.status(500).json({ ok: false, error: msg });
      }
    });

    // --- OCPP discovery (Installer → Ladepunkte Auto-Erkennung) ---
    // Scans foreign objects under `ocpp.*` (fallback: any state id/name containing "ocpp")
    // and groups them by chargepoint + connector/port/EVSE number.
    //
    // NOTE: This endpoint does NOT change configuration. The frontend applies the proposed
    // mapping to settingsConfig.evcsList and the installer then persists it via /api/installer/config.
    app.get('/api/ocpp/discover', requireInstaller, async (req, res) => {
      try {
        const now = Date.now();
        const q = (req && req.query && typeof req.query === 'object') ? req.query : {};
        const maxConnectors = (q.max !== undefined && q.max !== null && Number.isFinite(Number(q.max)))
          ? Math.max(1, Math.min(50, Math.round(Number(q.max))))
          : 50;

        let objects = {};
        let usedFallback = false;

        try {
          objects = await this.getForeignObjectsAsync('ocpp.*', 'state');
        } catch (_e) {
          objects = {};
        }

        if (!objects || Object.keys(objects).length === 0) {
          // Fallback: scan all states and filter by id/name containing "ocpp"
          usedFallback = true;
          try {
            const all = await this.getForeignObjectsAsync('*', 'state');
            objects = {};
            for (const [id, obj] of Object.entries(all || {})) {
              const sid = String(id || '');
              if (!sid) continue;
              const idLower = sid.toLowerCase();
              let hit = false;

              if (idLower.startsWith('ocpp.') || idLower.includes('.ocpp.')) hit = true;

              if (!hit && obj && obj.common && obj.common.name) {
                const n = obj.common.name;
                const name = (typeof n === 'string') ? n : JSON.stringify(n);
                if (String(name || '').toLowerCase().includes('ocpp')) hit = true;
              }

              if (hit) objects[sid] = obj;
            }
          } catch (_e2) {
            objects = {};
          }
        }

        const ignoreSeg = new Set([
          'chargepoints','chargepoint','charge_points','cps','cp',
          'clients','client','server',
          'stations','station',
          'evses','evse',
          'connectors','connector',
          'ports','port'
        ]);

        const deriveStationKey = (parts) => {
          const clean = [];
          for (const p of parts || []) {
            const s = String(p || '').trim();
            if (!s) continue;
            const l = s.toLowerCase();
            if (ignoreSeg.has(l)) continue;
            if (/^\d+$/.test(l)) continue;
            clean.push(s);
          }
          if (clean.length) return clean[clean.length - 1];

          // Fallback: last non-empty part
          for (let i = (parts || []).length - 1; i >= 0; i--) {
            const s = String(parts[i] || '').trim();
            if (s) return s;
          }
          return '';
        };

        const parseConnector = (id) => {
          const sid = String(id || '').trim();
          if (!sid) return null;
          const parts = sid.split('.').filter(Boolean);
          if (parts.length < 3) return null;

          // ioBroker OCPP adapter (common layout):
          //   ocpp.<instance>.<chargePointId>.<connectorNo>....
          // Example:
          //   ocpp.0.0311107102121190684.1.meterValues.Power_Active_Import
          // Here the connector number is a pure number segment right after the charge point id.
          // Additionally, some states may exist directly under the chargePointId (no connector segment)
          // → treat them as connector 0 (Main).
          try {
            const p0 = String(parts[0] || '').toLowerCase();
            const p1 = String(parts[1] || '');
            const p2 = String(parts[2] || '');
            const p3 = (parts.length >= 4) ? String(parts[3] || '') : '';
            if (p0 === 'ocpp' && /^\d+$/.test(p1) && p2) {
              if (p3 && /^\d+$/.test(p3)) {
                const connectorNo = Number(p3);
                const base = parts.slice(0, 4).join('.');
                const stationKey = p2;
                return { base, stationKey, connectorNo };
              }

              // Station-level state (no numeric connector segment)
              const base = parts.slice(0, 3).join('.') + '.0';
              const stationKey = p2;
              return { base, stationKey, connectorNo: 0 };
            }
          } catch (_e) {}

          for (let i = 0; i < parts.length; i++) {
            const seg = String(parts[i] || '');
            const low = seg.toLowerCase();

            // connector1 / connector_1 / port2 / evse3
            let m = low.match(/^(connector|port|evse)[_-]?(\d+)$/);
            if (m) {
              const connectorNo = Number(m[2]);
              const base = parts.slice(0, i + 1).join('.');
              const stationKey = deriveStationKey(parts.slice(2, i));
              return { base, stationKey, connectorNo };
            }

            // connector.1 / connectors.1 / ports.2 / evses.1
            if (['connector','connectors','port','ports','evse','evses'].includes(low) && i + 1 < parts.length) {
              const next = String(parts[i + 1] || '');
              if (/^\d+$/.test(next)) {
                const connectorNo = Number(next);
                const base = parts.slice(0, i + 2).join('.');
                const stationKey = deriveStationKey(parts.slice(2, i));
                return { base, stationKey, connectorNo };
              }
            }
          }

          return null;
        };

        /** @type {Record<string, any>} */
        const groups = {};
        for (const [id, obj] of Object.entries(objects || {})) {
          const info = parseConnector(id);
          if (!info || !info.base) continue;

          const key = info.base;
          if (!groups[key]) {
            groups[key] = {
              base: info.base,
              stationKey: String(info.stationKey || '').trim(),
              connectorNo: Number(info.connectorNo) || 0,
              states: [],
            };
          }

          groups[key].states.push({
            id: String(id),
            common: (obj && obj.common) ? obj.common : {},
          });
        }

        const scoreState = (it, kind) => {
          try {
            const id = String((it && it.id) || '');
            const idLower = id.toLowerCase();
            const c = (it && it.common) ? it.common : {};
            const type = String(c.type || '').toLowerCase();
            const role = String(c.role || '').toLowerCase();
            const unit = String(c.unit || '').toLowerCase();
            const read = c.read !== false;
            const write = !!c.write;

            let s = 0;

            if (kind === 'power') {
              // Prefer standard ioBroker-OCPP instantaneous import power
              // Example: ocpp.0.<cpId>.<connector>.meterValues.Power_Active_Import
              if (idLower.includes('metervalues.power_active_import')) s += 100;
              if (idLower.endsWith('power_active_import')) s += 60;
              // Avoid last-transaction consumption (is NOT instantaneous power)
              if (idLower.includes('lasttransactionconsumption') || idLower.includes('last_transaction_consumption')) s -= 120;
              if (type === 'number') s += 2;
              if (role.includes('value.power')) s += 10;
              if (unit === 'w') s += 10;
              if (idLower.includes('power')) s += 5;
              // Prefer import for consumption-like metrics
              if (idLower.includes('import')) s += 2;
              if (idLower.includes('export')) s -= 2;
              if (read && !write) s += 2;
              if (unit === 'kw') s -= 3; // prefer W
            } else if (kind === 'energy') {
              // Prefer standard ioBroker-OCPP cumulative import energy register
              // Example: ocpp.0.<cpId>.<connector>.meterValues.Energy_Active_Import_Register
              if (idLower.includes('metervalues.energy_active_import_register')) s += 100;
              if (idLower.endsWith('energy_active_import_register')) s += 60;
              // Interval is acceptable if register is not available, but less preferred
              if (idLower.includes('metervalues.energy_active_import_interval')) s += 20;
              if (idLower.endsWith('energy_active_import_interval')) s += 10;
              // Avoid last-transaction consumption (is NOT total energy)
              if (idLower.includes('lasttransactionconsumption') || idLower.includes('last_transaction_consumption')) s -= 120;
              if (type === 'number') s += 2;
              if (role.includes('value.energy')) s += 10;
              if (unit === 'kwh') s += 10;
              if (idLower.includes('energy') || idLower.includes('meter')) s += 4;
              if (idLower.includes('import')) s += 2;
              if (idLower.includes('export')) s -= 2;
              if (read && !write) s += 2;
            } else if (kind === 'status') {
              if (type === 'string') s += 6;
              if (role.includes('text') || role.includes('state')) s += 2;
              if (idLower.includes('status') || idLower.includes('state')) s += 4;
              if (read) s += 1;
            } else if (kind === 'online') {
              if (type === 'boolean') s += 6;
              if (role.includes('indicator.reachable') || role.includes('indicator.connected') || role.includes('indicator.online')) s += 6;
              if (idLower.includes('online') || idLower.includes('reachable') || idLower.includes('connected')) s += 4;
              if (read) s += 1;
            } else if (kind === 'setCurrentA') {
              if (type === 'number') s += 2;
              if (write) s += 10;
              if (unit === 'a') s += 10;
              if (idLower.includes('current')) s += 5;
              if (role.includes('level')) s += 2;
            } else if (kind === 'setPowerW') {
              if (type === 'number') s += 2;
              if (write) s += 10;
              if (unit === 'w') s += 10;
              if (idLower.includes('power')) s += 5;
              if (role.includes('level')) s += 2;
            } else if (kind === 'enableWrite') {
              if (type === 'boolean') s += 5;
              if (write) s += 10;
              if (idLower.includes('enable') || idLower.includes('enabled') || idLower.includes('active') || idLower.includes('authorize')) s += 4;
              if (role.includes('switch') || role.includes('button')) s += 2;
            } else if (kind === 'active') {
              if (type === 'boolean') s += 5;
              if (idLower.includes('active') || idLower.includes('enabled')) s += 4;
              if (read) s += 1;
            }

            return s;
          } catch (_e) {
            return 0;
          }
        };

        const pickBestId = (states, kind) => {
          let best = '';
          let bestScore = 0;
          for (const it of states || []) {
            const sc = scoreState(it, kind);
            if (sc > bestScore) {
              bestScore = sc;
              best = it && it.id ? String(it.id) : '';
            }
          }

          // Require a minimum confidence to avoid wrong auto-mapping
          return (bestScore >= 8) ? best : '';
        };

        let connectors = [];
        for (const g of Object.values(groups)) {
          const st = g.states || [];

          const ids = {
            powerId: pickBestId(st, 'power'),
            energyTotalId: pickBestId(st, 'energy'),
            statusId: pickBestId(st, 'status'),
            onlineId: pickBestId(st, 'online'),
            setCurrentAId: pickBestId(st, 'setCurrentA'),
            setPowerWId: pickBestId(st, 'setPowerW'),
            enableWriteId: pickBestId(st, 'enableWrite'),
            activeId: pickBestId(st, 'active'),
          };

          const hasAny = Object.values(ids).some(v => v && String(v).trim());
          if (!hasAny) continue;

          const stationKey = String(g.stationKey || '').trim();
          const connectorNo = Number(g.connectorNo) || 0;

          const name = stationKey
            ? (`${stationKey}${connectorNo ? (' Port ' + connectorNo) : ''}`)
            : (`OCPP${connectorNo ? (' Port ' + connectorNo) : ''}`);

          connectors.push({
            stationKey,
            connectorNo,
            base: String(g.base || ''),
            name,
            ids,
          });
        }

        // Heuristics for ioBroker OCPP adapter:
        // - If a station has connectors 1..N, connector 0 is typically "Main" and should NOT create
        //   an extra Ladepunkt. However, connector 0 often contains useful station-level states
        //   (online/availability). We therefore propagate missing IDs from connector 0 to the
        //   numbered connectors and then drop connector 0 if numbered connectors exist.
        try {
          const byStation = {};
          for (const c of connectors) {
            const key = String(c.stationKey || '').trim() || String(c.base || '');
            if (!byStation[key]) byStation[key] = [];
            byStation[key].push(c);
          }

          // Propagate station-level IDs
          for (const arr of Object.values(byStation)) {
            const c0 = (arr || []).find(x => Number(x && x.connectorNo) === 0);
            if (!c0 || !c0.ids) continue;
            for (const cx of (arr || [])) {
              if (!cx || Number(cx.connectorNo) <= 0) continue;
              cx.ids = (cx.ids && typeof cx.ids === 'object') ? cx.ids : {};
              if (!cx.ids.onlineId && c0.ids.onlineId) cx.ids.onlineId = c0.ids.onlineId;
              if (!cx.ids.enableWriteId && c0.ids.enableWriteId) cx.ids.enableWriteId = c0.ids.enableWriteId;
              if (!cx.ids.statusId && c0.ids.statusId) cx.ids.statusId = c0.ids.statusId;
              if (!cx.ids.activeId && c0.ids.activeId) cx.ids.activeId = c0.ids.activeId;
            }
          }

          // Filter: drop connector 0 if there is any numbered connector
          const filtered = [];
          for (const arr of Object.values(byStation)) {
            const hasNumbered = (arr || []).some(x => x && Number(x.connectorNo) > 0);
            if (hasNumbered) {
              for (const cx of (arr || [])) {
                if (cx && Number(cx.connectorNo) > 0) filtered.push(cx);
              }
            } else {
              filtered.push(...(arr || []));
            }
          }
          connectors = filtered;
        } catch (_e) {}

        connectors.sort((a, b) => {
          const ak = String(a.stationKey || '');
          const bk = String(b.stationKey || '');
          if (ak !== bk) return ak.localeCompare(bk);
          return (Number(a.connectorNo) || 0) - (Number(b.connectorNo) || 0);
        });

        const limited = connectors.slice(0, maxConnectors);

        res.json({
          ok: true,
          ts: now,
          usedFallback,
          totalStates: Object.keys(objects || {}).length,
          connectorCount: connectors.length,
          connectors: limited,
        });
      } catch (e) {
        try { this.log.warn('OCPP discover API error: ' + (e && e.message ? e.message : e)); } catch (_e2) {}
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    
    // --- NexoWatt-Devices discovery (Installer → Schnell‑Inbetriebnahme) ---
    // Scans foreign objects under `nexowatt-devices.*.devices.*` and returns a compact
    // device list with known alias datapoints (aliases.*). The frontend can use this to
    // auto-fill App-Center mappings (EVCS / PV‑Regelung / Thermik / §14a).
    //
    // IMPORTANT: This endpoint only discovers; it never writes config.
    app.get('/api/nwdevices/discover', requireInstaller, async (_req, res) => {
      try {
        const now = Date.now();

        let devChannels = {};
        try {
          devChannels = await this.getForeignObjectsAsync('nexowatt-devices.*.devices.*', 'channel');
        } catch (_e) {
          devChannels = {};
        }

        let states = {};
        try {
          states = await this.getForeignObjectsAsync('nexowatt-devices.*.devices.*', 'state');
        } catch (_e) {
          states = {};
        }

        // Group states by base device id (nexowatt-devices.X.devices.<devId>)
        const statesByDev = new Map();
        for (const [id, obj] of Object.entries(states || {})) {
          const sid = String(id || '');
          if (!sid.startsWith('nexowatt-devices.')) continue;
          const parts = sid.split('.');
          if (parts.length < 5) continue;
          if (parts[2] !== 'devices') continue;
          const base = parts.slice(0, 4).join('.');
          if (!statesByDev.has(base)) statesByDev.set(base, {});
          statesByDev.get(base)[sid] = obj;
        }

        const normName = (v) => {
          try {
            if (typeof v === 'string') return v.trim();
            if (v && typeof v === 'object') {
              // common.name can be translated object
              const any = v.en || v.de || v.text || v.value;
              if (typeof any === 'string') return any.trim();
              const first = Object.values(v).find(x => typeof x === 'string');
              if (typeof first === 'string') return first.trim();
            }
          } catch (_e) {}
          return '';
        };

        const devices = [];
        const counts = { total: 0, evcs: 0, pvInverter: 0, heat: 0 };
        const instances = new Set();

        const isEvcsCat = (c) => {
          const s = String(c || '').trim().toUpperCase();
          return (s === 'EVCS' || s === 'CHARGER' || s === 'DC_CHARGER' || s === 'EVSE');
        };
        const isPvInvCat = (c) => String(c || '').trim().toUpperCase() === 'PV_INVERTER';
        const isHeatCat = (c) => String(c || '').trim().toUpperCase() === 'HEAT';

        for (const [base, chObj] of Object.entries(devChannels || {})) {
          const id = String(base || '');
          if (!id.startsWith('nexowatt-devices.')) continue;
          const parts = id.split('.');
          if (parts.length !== 4) continue;
          if (parts[2] !== 'devices') continue;

          const devId = parts[3];
          const instance = parts.slice(0, 2).join('.');
          instances.add(instance);

          const common = (chObj && chObj.common && typeof chObj.common === 'object') ? chObj.common : {};
          const native = (chObj && chObj.native && typeof chObj.native === 'object') ? chObj.native : {};

          const name = normName(common.name) || devId;
          const category = String(native.category || '').trim();
          const manufacturer = String(native.manufacturer || '').trim();
          const templateId = String(native.templateId || native.template || '').trim();

          const devStates = statesByDev.get(id) || {};

          // Collect alias datapoints: "<base>.aliases.<aliasKey>" => { aliasKey: fullId }
          const aliases = {};
          for (const sid of Object.keys(devStates || {})) {
            const k = String(sid || '');
            const idx = k.indexOf('.aliases.');
            if (idx < 0) continue;
            const a = k.substring(idx + 9);
            if (!a) continue;
            aliases[a] = k;
          }

          const basePrefix = id + '.';
          const hasState = (suffix) => {
            const sid = basePrefix + suffix;
            return (devStates && devStates[sid]) ? sid : '';
          };

          // Recommended IDs (prefer alias, fall back to canonical template datapoints if present)
          const dp = {
            powerW: aliases['r.power'] || hasState('aCTIVE_POWER') || '',
            energyTotalKWh: aliases['r.energyTotal'] || hasState('energyTotal') || '',
            statusCode: aliases['r.statusCode'] || hasState('statusCode') || '',
            connected: aliases['comm.connected'] || '',
            ctrlRun: aliases['ctrl.run'] || '',
            ctrlCurrentLimitA: aliases['ctrl.currentLimitA'] || '',
            ctrlPowerLimitW: aliases['ctrl.powerLimitW'] || '',
            ctrlPvLimitPct: aliases['ctrl.powerLimitPct'] || '',
            ctrlPvLimitEnable: aliases['ctrl.powerLimitEnable'] || '',
          };

          devices.push({
            baseId: id,
            devId,
            instance,
            name,
            category,
            manufacturer,
            templateId,
            aliases,
            dp,
          });

          counts.total++;
          if (isEvcsCat(category)) counts.evcs++;
          else if (isPvInvCat(category)) counts.pvInverter++;
          else if (isHeatCat(category)) counts.heat++;
        }

        // Stable sort: category, then name, then id
        devices.sort((a, b) => {
          const ca = String(a.category || '');
          const cb = String(b.category || '');
          if (ca !== cb) return ca.localeCompare(cb);
          const na = String(a.name || '');
          const nb = String(b.name || '');
          if (na !== nb) return na.localeCompare(nb);
          return String(a.baseId || '').localeCompare(String(b.baseId || ''));
        });

        res.json({
          ok: true,
          ts: now,
          instances: Array.from(instances.values()).sort(),
          counts,
          deviceCount: devices.length,
          devices,
        });
      } catch (e) {
        try { this.log.warn('NWDevices discover API error: ' + (e && e.message ? e.message : e)); } catch (_e2) {}
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

// --- EMS Status (Phase 2) ---
    app.get('/api/ems/status', requireInstaller, async (req, res) => {
      try {
        const engine = this.emsEngine;
        const running = !!(engine && engine._timer);
        const intervalMs = engine && typeof engine._intervalMs === 'number' ? engine._intervalMs : null;

        const mm = engine && engine.mm ? engine.mm : null;
        const lastTickDiag = mm && mm.lastTickDiag ? mm.lastTickDiag : null;

        res.json({
          ok: true,
          engine: {
            running,
            intervalMs,
          },
          lastTickDiag,
        });
      } catch (e) {
        this.log.warn('EMS status API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });


    // --- Object validation (Phase 3.3) ---
    // Used by the Installer UI to quickly verify datapoint existence + freshness.
    app.post('/api/object/validate', requireInstaller, async (req, res) => {
      try {
        const now = Date.now();
        const body = (req && req.body && typeof req.body === 'object') ? req.body : {};
        const rawIds = Array.isArray(body.ids) ? body.ids : [];
        const maxAgeMs = (body.maxAgeMs !== undefined && body.maxAgeMs !== null && Number.isFinite(Number(body.maxAgeMs)))
          ? Math.max(0, Math.round(Number(body.maxAgeMs)))
          : 15000;

        /** @type {string[]} */
        const ids = [];
        const seen = new Set();
        for (const raw of rawIds) {
          const id = (raw === null || raw === undefined) ? '' : String(raw).trim();
          if (!id) continue;
          if (seen.has(id)) continue;
          seen.add(id);
          ids.push(id);
          if (ids.length >= 2000) break; // hard cap (safety)
        }

        /** @type {Record<string, any>} */
        const results = {};

        for (const id of ids) {
          /** @type {any} */
          const info = {
            id,
            exists: false,
            common: null,
            statePresent: false,
            state: null,
            ageMs: null,
            stale: false,
          };

          try {
            const obj = await this.getForeignObjectAsync(id);
            if (obj && obj.common) {
              info.exists = true;
              const nameRaw = obj.common.name;
              const name = (typeof nameRaw === 'string') ? nameRaw : (nameRaw ? JSON.stringify(nameRaw) : '');
              info.common = {
                type: obj.common.type || '',
                role: obj.common.role || '',
                read: !!obj.common.read,
                write: !!obj.common.write,
                unit: obj.common.unit || '',
                name,
              };
            }
          } catch (_e) {
            // ignore
          }

          try {
            const st = await this.getForeignStateAsync(id);
            if (st && st.ts) {
              info.statePresent = true;
              info.state = { val: st.val, ts: st.ts, lc: st.lc, ack: st.ack };
              const age = now - Number(st.ts || 0);
              info.ageMs = Number.isFinite(age) ? Math.max(0, Math.round(age)) : null;
              info.stale = (maxAgeMs > 0 && info.ageMs !== null) ? (info.ageMs > maxAgeMs) : false;
            }
          } catch (_e) {
            // ignore
          }

          results[id] = info;
        }

        res.json({ ok: true, ts: now, maxAgeMs, results });
      } catch (e) {
        this.log.warn('Object validate API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    // --- Charging diagnostics (Phase 3.3) ---
    // Provides a compact per-ladepunkt overview (mapping + freshness + runtime decisions).
    app.get('/api/ems/charging/diagnostics', requireInstaller, async (req, res) => {
      try {
        const now = Date.now();
        const q = (req && req.query && typeof req.query === 'object') ? req.query : {};
        const maxAgeMs = (q.maxAgeMs !== undefined && q.maxAgeMs !== null && Number.isFinite(Number(q.maxAgeMs)))
          ? Math.max(0, Math.round(Number(q.maxAgeMs)))
          : null;

        const cmCfg = (this.config && this.config.chargingManagement && typeof this.config.chargingManagement === 'object')
          ? this.config.chargingManagement
          : {};
        const staleTimeoutSec = (cmCfg.staleTimeoutSec !== undefined && cmCfg.staleTimeoutSec !== null && Number.isFinite(Number(cmCfg.staleTimeoutSec)))
          ? Math.max(1, Math.round(Number(cmCfg.staleTimeoutSec)))
          : 15;
        const staleMs = staleTimeoutSec * 1000;
        const effMaxAgeMs = (maxAgeMs !== null) ? maxAgeMs : staleMs;

        const evcsList = Array.isArray(this.evcsList) ? this.evcsList : [];

        /** @type {Record<string, any>} */
        const mappingChecks = {};
        const addId = (id) => {
          const s = (id === null || id === undefined) ? '' : String(id).trim();
          if (!s) return;
          mappingChecks[s] = null;
        };

        for (const wb of evcsList) {
          if (!wb) continue;
          addId(wb.powerId);
          addId(wb.energyTotalId);
          addId(wb.statusId);
          addId(wb.activeId);
          addId(wb.setCurrentAId);
          addId(wb.setPowerWId);
          addId(wb.enableWriteId);
          addId(wb.onlineId);
        }

        // Resolve existence + freshness
        for (const id of Object.keys(mappingChecks)) {
          /** @type {any} */
          const info = { id, exists: false, common: null, statePresent: false, state: null, ageMs: null, stale: false };
          try {
            const obj = await this.getForeignObjectAsync(id);
            if (obj && obj.common) {
              info.exists = true;
              const nameRaw = obj.common.name;
              const name = (typeof nameRaw === 'string') ? nameRaw : (nameRaw ? JSON.stringify(nameRaw) : '');
              info.common = {
                type: obj.common.type || '',
                role: obj.common.role || '',
                read: !!obj.common.read,
                write: !!obj.common.write,
                unit: obj.common.unit || '',
                name,
              };
            }
          } catch (_e) {}
          try {
            const st = await this.getForeignStateAsync(id);
            if (st && st.ts) {
              info.statePresent = true;
              info.state = { val: st.val, ts: st.ts, lc: st.lc, ack: st.ack };
              const age = now - Number(st.ts || 0);
              info.ageMs = Number.isFinite(age) ? Math.max(0, Math.round(age)) : null;
              info.stale = (effMaxAgeMs > 0 && info.ageMs !== null) ? (info.ageMs > effMaxAgeMs) : false;
            }
          } catch (_e) {}
          mappingChecks[id] = info;
        }

        const getOwn = async (id) => {
          try {
            const s = await this.getStateAsync(id);
            return s ? s.val : null;
          } catch {
            return null;
          }
        };

        /** @type {any[]} */
        const list = [];
        for (const wb of evcsList) {
          if (!wb) continue;
          const idx = Number(wb.index);
          if (!Number.isFinite(idx) || idx <= 0) continue;

          const safe = `lp${idx}`;
          const base = `chargingManagement.wallboxes.${safe}`;

          const item = {
            index: idx,
            safe,
            name: (typeof wb.name === 'string' && wb.name.trim()) ? wb.name.trim() : `Ladepunkt ${idx}`,
            enabledCfg: wb.enabled !== false,
            priorityCfg: (wb.priority !== undefined && wb.priority !== null) ? Number(wb.priority) : 999,
            chargerType: (typeof wb.chargerType === 'string') ? wb.chargerType : '',
            stationKey: (typeof wb.stationKey === 'string') ? wb.stationKey : '',
            connectorNo: (wb.connectorNo !== undefined && wb.connectorNo !== null) ? Number(wb.connectorNo) : 0,
            mapping: {
              powerId: wb.powerId || '',
              energyTotalId: wb.energyTotalId || '',
              statusId: wb.statusId || '',
              activeId: wb.activeId || '',
              setCurrentAId: wb.setCurrentAId || '',
              setPowerWId: wb.setPowerWId || '',
              enableWriteId: wb.enableWriteId || '',
              onlineId: wb.onlineId || '',
              checks: {},
            },
            runtime: {
              enabled: await getOwn(`${base}.enabled`),
              online: await getOwn(`${base}.online`),
              mappingOk: await getOwn(`${base}.mappingOk`),
              hasSetpoint: await getOwn(`${base}.hasSetpoint`),
              mappingIssues: await getOwn(`${base}.mappingIssues`),
              meterStale: await getOwn(`${base}.meterStale`),
              meterAgeMs: await getOwn(`${base}.meterAgeMs`),
              statusStale: await getOwn(`${base}.statusStale`),
              statusAgeMs: await getOwn(`${base}.statusAgeMs`),
              actualPowerW: await getOwn(`${base}.actualPowerW`),
              targetPowerW: await getOwn(`${base}.targetPowerW`),
              targetCurrentA: await getOwn(`${base}.targetCurrentA`),
              reason: await getOwn(`${base}.reason`),
              applied: await getOwn(`${base}.applied`),
              applyStatus: await getOwn(`${base}.applyStatus`),
              effectiveMode: await getOwn(`${base}.effectiveMode`),
              userMode: await getOwn(`${base}.userMode`),
              boostActive: await getOwn(`${base}.boostActive`),
              boostRemainingMin: await getOwn(`${base}.boostRemainingMin`),
            },
          };

          // attach per-id checks (existence + freshness)
          const mkCheck = (id) => (id && mappingChecks[id]) ? mappingChecks[id] : null;
          item.mapping.checks = {
            powerId: mkCheck(item.mapping.powerId),
            energyTotalId: mkCheck(item.mapping.energyTotalId),
            statusId: mkCheck(item.mapping.statusId),
            activeId: mkCheck(item.mapping.activeId),
            setCurrentAId: mkCheck(item.mapping.setCurrentAId),
            setPowerWId: mkCheck(item.mapping.setPowerWId),
            enableWriteId: mkCheck(item.mapping.enableWriteId),
            onlineId: mkCheck(item.mapping.onlineId),
          };

          list.push(item);
        }

        list.sort((a, b) => (a.index || 0) - (b.index || 0));

        // --- Station diagnostics (multi-connector DC stations) ---
        const toSafeIdPart = (x) => {
          const s = String(x || '').trim().toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/__+/g, '_');
          return s || 'x';
        };

        const stationKeys = new Set();
        try {
          const sg = (this.config && this.config.settingsConfig && Array.isArray(this.config.settingsConfig.stationGroups))
            ? this.config.settingsConfig.stationGroups
            : [];
          for (const g of sg) {
            const sk = (g && typeof g.stationKey === 'string') ? g.stationKey.trim() : '';
            if (sk) stationKeys.add(sk);
          }
        } catch (_e) {}

        try {
          const evcs = Array.isArray(this.evcsList) ? this.evcsList : [];
          for (const e of evcs) {
            const sk = (e && typeof e.stationKey === 'string') ? e.stationKey.trim() : '';
            if (sk) stationKeys.add(sk);
          }
        } catch (_e) {}

        const stations = [];
        for (const sk of Array.from(stationKeys)) {
          const safe = toSafeIdPart(sk);
          const base = `chargingManagement.stations.${safe}`;

          const readNum = async (id) => {
            try {
              const st = await this.getStateAsync(id);
              const v = st ? Number(st.val) : NaN;
              return Number.isFinite(v) ? v : null;
            } catch {
              return null;
            }
          };

          const readBool = async (id) => {
            try {
              const st = await this.getStateAsync(id);
              return !!(st && st.val);
            } catch {
              return false;
            }
          };

          const readStr = async (id) => {
            try {
              const st = await this.getStateAsync(id);
              return (st && st.val !== null && st.val !== undefined) ? String(st.val) : '';
            } catch {
              return '';
            }
          };

          // Name from installer config (preferred)
          let name = '';
          try {
            if (this.stationGroups && this.stationGroups[sk] && this.stationGroups[sk].name) name = String(this.stationGroups[sk].name);
          } catch (_e) {}

          const maxPowerW = await readNum(`${base}.maxPowerW`);
          const remainingW = await readNum(`${base}.remainingW`);
          const usedW = await readNum(`${base}.usedW`);
          const binding = await readBool(`${base}.binding`);
          const headroomW = await readNum(`${base}.headroomW`);
          const targetSumW = await readNum(`${base}.targetSumW`);
          const connectorCount = await readNum(`${base}.connectorCount`);
          const boostConnectors = await readNum(`${base}.boostConnectors`);
          const pvLimitedConnectors = await readNum(`${base}.pvLimitedConnectors`);
          const connectors = await readStr(`${base}.connectors`);
          const lastUpdate = await readNum(`${base}.lastUpdate`);

          stations.push({
            stationKey: sk,
            name,
            maxPowerW,
            remainingW,
            usedW,
            headroomW,
            binding,
            targetSumW,
            connectorCount,
            boostConnectors,
            pvLimitedConnectors,
            connectors,
            lastUpdate,
          });
        }
        stations.sort((a, b) => String(a.stationKey || '').localeCompare(String(b.stationKey || '')));

        // --- Budget / Gates snapshot (Phase 3.6) ---
        // These states are written by the charging-management module and give transparency about active caps.
        let gridImportW = await getOwn('chargingManagement.control.gridImportW');
        if (!Number.isFinite(gridImportW)) {
          const fallbackGridW = await getOwn('ems.gridPowerW');
          if (Number.isFinite(fallbackGridW)) gridImportW = fallbackGridW;
        }
        const control = {
          active: await getOwn('chargingManagement.control.active'),
          mode: await getOwn('chargingManagement.control.mode'),
          status: await getOwn('chargingManagement.control.status'),

          budgetMode: await getOwn('chargingManagement.control.budgetMode'),
          budgetW: await getOwn('chargingManagement.control.budgetW'),
          usedW: await getOwn('chargingManagement.control.usedW'),
          remainingW: await getOwn('chargingManagement.control.remainingW'),

          pvCapRawW: await getOwn('chargingManagement.control.pvCapRawW'),
          pvCapEffectiveW: await getOwn('chargingManagement.control.pvCapEffectiveW'),
          pvAvailable: await getOwn('chargingManagement.control.pvAvailable'),

          gridImportLimitW: await getOwn('chargingManagement.control.gridImportLimitW'),
          gridImportLimitEffW: await getOwn('chargingManagement.control.gridImportLimitW_effective'),
          gridImportW,
          gridBaseLoadW: await getOwn('chargingManagement.control.gridBaseLoadW'),
          gridCapEvcsW: await getOwn('chargingManagement.control.gridCapEvcsW'),
          gridCapBinding: await getOwn('chargingManagement.control.gridCapBinding'),

          gridMaxPhaseA: await getOwn('chargingManagement.control.gridMaxPhaseA'),
          gridWorstPhaseA: await getOwn('chargingManagement.control.gridWorstPhaseA'),
          gridPhaseCapEvcsW: await getOwn('chargingManagement.control.gridPhaseCapEvcsW'),
          phaseCapBinding: await getOwn('chargingManagement.control.phaseCapBinding'),

          para14aActive: await getOwn('chargingManagement.control.para14aActive'),
          para14aMode: await getOwn('chargingManagement.control.para14aMode'),
          para14aCapEvcsW: await getOwn('chargingManagement.control.para14aCapEvcsW'),
          para14aBinding: await getOwn('chargingManagement.control.para14aBinding'),

          storageAssistActive: await getOwn('chargingManagement.control.storageAssistActive'),
          storageAssistW: await getOwn('chargingManagement.control.storageAssistW'),
          storageAssistSoCPct: await getOwn('chargingManagement.control.storageAssistSoCPct'),
        };

        const summary = {
          totalPowerW: await getOwn('chargingManagement.summary.totalPowerW'),
          totalTargetPowerW: await getOwn('chargingManagement.summary.totalTargetPowerW'),
          onlineWallboxes: await getOwn('chargingManagement.summary.onlineWallboxes'),
        };

        res.json({
          ok: true,
          ts: now,
          maxAgeMs: effMaxAgeMs,
          staleTimeoutSec,
          list,
          stations,
          control,
          summary,
        });
      } catch (e) {
        this.log.warn('Charging diagnostics API error: ' + e.message);
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    // --- Datenpunkt-Objekt-Browser (Tree) ---
    app.get('/api/object/tree', requireInstaller, async (req, res) => {
      try {
        const prefixRaw = (req.query && req.query.prefix) || '';
        const prefix = (typeof prefixRaw === 'string' ? prefixRaw : String(prefixRaw || '')).trim();

        if (typeof this.getForeignObjectsAsync !== 'function') {
          return res.status(500).json({ ok: false, error: 'getForeignObjectsAsync not available' });
        }

        // Build/refresh cache if needed
        const now = Date.now();
        const ttlMs = 30000;
        if (!this._nwDpCache || !this._nwDpCache.ts || (now - this._nwDpCache.ts) > ttlMs || !this._nwDpCache.trie) {
          const all = await this.getForeignObjectsAsync('*', 'state');
          const items = [];
          for (const id of Object.keys(all || {})) {
            const obj = all[id];
            if (!obj || !obj.common) continue;
            const nameRaw = obj.common.name || '';
            const name = (typeof nameRaw === 'string') ? nameRaw : JSON.stringify(nameRaw);
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
          items.sort((a, b) => a.idLower.localeCompare(b.idLower));
          const byId = {};
          for (const it of items) {
            if (it && it.id) byId[it.id] = it;
          }
          const makeNode = () => ({ children: Object.create(null), item: null });
          const root = makeNode();
          for (const it of items) {
            const sid = String(it.id || '');
            if (!sid) continue;
            const parts = sid.split('.').filter(Boolean);
            let node = root;
            for (const seg of parts) {
              if (!node.children[seg]) node.children[seg] = makeNode();
              node = node.children[seg];
            }
            node.item = it;
          }
          this._nwDpCache = { ts: now, items, byId, trie: root };
        }

        const cache = this._nwDpCache;
        const trie = cache && cache.trie ? cache.trie : null;
        if (!trie) return res.json({ ok: true, prefix, children: [] });

        const parts = prefix ? prefix.split('.').filter(Boolean) : [];
        let node = trie;
        for (const seg of parts) {
          if (!node.children || !node.children[seg]) { node = null; break; }
          node = node.children[seg];
        }
        if (!node) return res.json({ ok: true, prefix, children: [] });

        const out = [];
        const keys = Object.keys(node.children || {});
        keys.sort((a, b) => a.localeCompare(b));
        for (const seg of keys) {
          const child = node.children[seg];
          const id = prefix ? (prefix + '.' + seg) : seg;
          const it = child && child.item ? child.item : (cache && cache.byId ? cache.byId[id] : null);
          out.push({
            id,
            label: seg,
            hasChildren: !!(child && child.children && Object.keys(child.children).length),
            isState: !!it,
            name: it ? it.name : '',
            role: it ? it.role : '',
            type: it ? it.type : '',
            unit: it ? it.unit : '',
          });
        }

        res.json({ ok: true, prefix, children: out });
      } catch (e) {
        try { this.log.warn('object tree API error: ' + (e && e.message ? e.message : e)); } catch (_e2) {}
        res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

// --- EMS Apps / Installer Page ---
    app.get(['/ems-apps.html', '/ems-apps'], (req, res) => {
      try {
        const file = require('path').join(__dirname, 'www', 'ems-apps.html');
        res.sendFile(file);
      } catch (e) {
        this.log.warn('EMS Apps page error: ' + e.message);
        res.status(500).send('EMS Apps page error');
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
        const inst = this._nwGetHistoryInstance();
        const start = Number(req.query.from || (Date.now() - 24*3600*1000));
        const end   = Number(req.query.to   || Date.now());
        const stepS = Number(req.query.step || 60);

        // For many states we log data sparsely (e.g. only "on change").
        // In that case the aggregated history query only returns values for time-buckets
        // that contain at least one raw datapoint. Buckets without any datapoint are missing.
        // If we draw a line chart on such sparse buckets, the renderer connects far away points
        // with long diagonal lines (looks like ramps) which is misleading and was not intended.
        //
        // Solution: densify the returned data to an equidistant time-grid ("step") and
        // forward-fill (hold last) values. This yields clean plots and also improves the
        // kWh integration in the frontend.
        const stepMs = (Number.isFinite(stepS) && stepS > 0) ? (stepS * 1000) : 60_000;
        const densifyHoldLast = (values) => {
          if (!Array.isArray(values) || values.length === 0 || !Number.isFinite(stepMs) || stepMs <= 0) {
            return Array.isArray(values) ? values : [];
          }

          const n = Math.max(0, Math.floor((end - start) / stepMs));
          const byIdx = new Map();

          for (const row of values) {
            const ts = normTsMs(row?.[0]);
            const val = Number(row?.[1]);
            if (!Number.isFinite(ts)) continue;

            const idx = Math.round((ts - start) / stepMs);
            if (idx < 0 || idx > n) continue;
            if (!Number.isFinite(val)) continue;

            byIdx.set(idx, val);
          }

          const out = [];
          let havePrev = false;
          let prev = null;
          for (let i = 0; i <= n; i++) {
            if (byIdx.has(i)) {
              prev = byIdx.get(i);
              havePrev = true;
            }
            out.push([start + i * stepMs, havePrev ? prev : null]);
          }
          return out;
        };

        // Prefer explicit mapping from config.history.datapoints;
        // if absent, fall back to the adapter's canonical 'historie.*' states.
        const ids = {
          pv: this._nwGetHistoryDpId('pvPower'),
          load: this._nwGetHistoryDpId('consumptionTotal'),
          buy: this._nwGetHistoryDpId('gridBuyPower'),
          sell: this._nwGetHistoryDpId('gridSellPower'),
          chg: this._nwGetHistoryDpId('storageChargePower'),
          dchg: this._nwGetHistoryDpId('storageDischargePower'),
          soc: this._nwGetHistoryDpId('storageSoc'),
          evcs: this._nwGetHistoryDpId('evcsPower')
        };

        // Optional series (Energiefluss: Verbraucher/Erzeuger)
        // NOTE: We only include configured slots so the frontend can hide them when not set up.
        const dps = (this.config && this.config.datapoints) || {};
        const vis = (this.config && this.config.vis) || {};
        const fs = (vis && vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};

        const extraConsumerReq = [];
        const extraProducerReq = [];

        const MAX_CONSUMERS = 10;
        const MAX_PRODUCERS = 5;

        for (let i = 1; i <= MAX_CONSUMERS; i++) {
          const dpKey = `consumer${i}Power`;
          const mapped = String(dps[dpKey] || '').trim();
          if (!mapped) continue;
          const slotCfg = (Array.isArray(fs.consumers) && fs.consumers[i - 1]) ? fs.consumers[i - 1] : null;
          const name = (slotCfg && slotCfg.name) ? String(slotCfg.name) : `Verbraucher ${i}`;
          const id = `${this.namespace}.historie.consumers.c${i}.powerW`;
          extraConsumerReq.push({ idx: i, name, id });
        }

        for (let i = 1; i <= MAX_PRODUCERS; i++) {
          const dpKey = `producer${i}Power`;
          const mapped = String(dps[dpKey] || '').trim();
          if (!mapped) continue;
          const slotCfg = (Array.isArray(fs.producers) && fs.producers[i - 1]) ? fs.producers[i - 1] : null;
          const name = (slotCfg && slotCfg.name) ? String(slotCfg.name) : `Erzeuger ${i}`;
          const id = `${this.namespace}.historie.producers.p${i}.powerW`;
          extraProducerReq.push({ idx: i, name, id });
        }

        const normTsMs = (ts) => {
          if (ts === null || ts === undefined) return null;
          if (typeof ts === 'number') {
            if (!Number.isFinite(ts)) return null;
            // Heuristic: influxdb can return seconds; we need ms
            if (ts > 0 && ts < 1e12) return Math.round(ts * 1000);
            return Math.round(ts);
          }
          if (ts instanceof Date) return ts.getTime();
          if (typeof ts === 'string') {
            const s = ts.trim();
            if (!s) return null;
            const asNum = Number(s);
            if (Number.isFinite(asNum)) {
              if (asNum > 0 && asNum < 1e12) return Math.round(asNum * 1000);
              return Math.round(asNum);
            }
            const parsed = Date.parse(s);
            if (!Number.isNaN(parsed)) return parsed;
            return null;
          }
          const n = Number(ts);
          if (Number.isFinite(n)) {
            if (n > 0 && n < 1e12) return Math.round(n * 1000);
            return Math.round(n);
          }
          return null;
        };

        const ask = (id) => new Promise(resolve => {
          if (!id) return resolve({ id, values: [] });
          const options = { start, end, step: stepS * 1000, aggregate: 'average', addId: false, ignoreNull: true };
          let done = false;
          const timer = setTimeout(() => {
            if (done) return;
            done = true;
            resolve({ id, values: [] });
          }, 8000);
          try {
            this.sendTo(inst, 'getHistory', { id, options }, (resu) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
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
                            const norm = (outArr || [])
                              .map(p => {
                                const tRaw = Array.isArray(p) ? p[0] : (p.ts ?? p.time ?? p.t ?? p[0]);
                                const vRaw = Array.isArray(p) ? p[1] : (p.val ?? p.value ?? p[1]);
                                const t = normTsMs(tRaw);
                                const v = Number(vRaw);
                                if (t == null || Number.isNaN(v)) return null;
                                return [t, v];
                              })
                              .filter(Boolean)
                              .sort((a, b) => a[0] - b[0]);
                            resolve({ id, values: densifyHoldLast(norm) });
            });
          } catch (e) {
            if (!done) {
              done = true;
              clearTimeout(timer);
              resolve({ id, values: [] });
            }
          }
        });

        const [pv, load, buy, sell, chg, dchg, soc, evcs] = await Promise.all([
          ask(ids.pv),
          ask(ids.load),
          ask(ids.buy),
          ask(ids.sell),
          ask(ids.chg),
          ask(ids.dchg),
          ask(ids.soc),
          ask(ids.evcs)
        ]);

        // --- Robustness for E‑Mobilität (EVCS) ---
        // In der Praxis kann es vorkommen, dass die Historie-Abfrage für den
        // aggregierten EV-Kanal ("historie.core.ev.totalW") leer zurückkommt,
        // obwohl Daten existieren (z.B. falsches Mapping/alte Konfiguration).
        //
        // Ziel: Die VIS-Historie soll immer aus unseren automatisch angelegten
        // Historie-Datenpunkten lesen, ohne dass der Kunde manuell nacharbeiten muss.
        //
        // Fallback-Strategie:
        //  1) Wenn die Abfrage für ids.evcs leer ist, versuche den kanonischen DP
        //     `${namespace}.historie.core.ev.totalW`.
        //  2) Wenn weiterhin leer: aggregiere aus den pro Ladepunkt angelegten
        //     Historie-DPs `${namespace}.historie.evcs.lpX.powerW`.
        //
        // Damit bekommen wir in jedem Fall eine belastbare Zeitreihe für "E‑Mobilität".
        const evcsHasData = (s) => Array.isArray(s?.values) && s.values.length >= 2;
        if (!evcsHasData(evcs)) {
          const canonicalEvcsId = `${this.namespace}.historie.core.ev.totalW`;
          if (ids.evcs && ids.evcs !== canonicalEvcsId) {
            const alt = await ask(canonicalEvcsId);
            if (evcsHasData(alt)) {
              evcs.id = canonicalEvcsId;
              evcs.values = alt.values;
              evcs._source = 'canonical';
            }
          }
        }
        if (!evcsHasData(evcs)) {
          const count = Number(this.evcsCount || 0);
          if (count > 0) {
            const lpIds = [];
            for (let i = 1; i <= count; i++) {
              lpIds.push(`${this.namespace}.historie.evcs.lp${i}.powerW`);
            }
            const lpSeries = await Promise.all(lpIds.map((id) => ask(id)));
            const sumByTs = new Map();
            for (const s of lpSeries) {
              if (!Array.isArray(s?.values)) continue;
              for (const p of s.values) {
                if (!Array.isArray(p) || p.length < 2) continue;
                const ts = Number(p[0]);
                const v = Number(p[1]);
                if (!Number.isFinite(ts) || !Number.isFinite(v)) continue;
                sumByTs.set(ts, (sumByTs.get(ts) || 0) + v);
              }
            }
            const vals = Array.from(sumByTs.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([ts, v]) => [ts, v]);
            if (vals.length >= 2) {
              evcs.id = `${this.namespace}.historie.evcs.sum.powerW`;
              evcs.values = vals;
              evcs._source = 'lp-sum';
            }
          }
        }

        const [extraConsumers, extraProducers] = await Promise.all([
          Promise.all(extraConsumerReq.map(async (c) => {
            const r = await ask(c.id);
            return { idx: c.idx, name: c.name, id: r.id, values: r.values };
          })),
          Promise.all(extraProducerReq.map(async (p) => {
            const r = await ask(p.id);
            return { idx: p.idx, name: p.name, id: r.id, values: r.values };
          }))
        ]);

        const out = { pv, load, buy, sell, chg, dchg, soc, evcs };
        res.json({ ok:true, start, end, step: stepS, series: out, extras: { consumers: extraConsumers, producers: extraProducers } });
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
    const histPowerId = `${this.namespace}.historie.evcs.lp${idx}.powerW`;
    let pAvg = await getHist(histPowerId, start, end, 'average', reportStepMs);
    let pMax = await getHist(histPowerId, start, end, 'max', reportStepMs);
    // Fallback for legacy setups where only the raw wallbox datapoint is historized
    if ((!pAvg || pAvg.length === 0) && wb.powerId) {
      pAvg = await getHist(wb.powerId, start, end, 'average', reportStepMs);
      pMax = await getHist(wb.powerId, start, end, 'max', reportStepMs);
    }

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
        // Energiefluss-Monitor: optionale Verbraucher/Erzeuger (VIS)
        // Wir geben bewusst nur Metadaten (Name + Slot + gemappt?) zurück – keine Fremd-State-IDs.
	        flowSlots: (() => {
	          // Energy-flow: optional slots
	          // Consumers: max 9
	          // Producers: reduced to max 5
	          const SLOT_COUNT_BY_KIND = {
	            consumers: 9,
	            producers: 5,
	          };
          const dps = (cfg && cfg.datapoints && typeof cfg.datapoints === 'object') ? cfg.datapoints : {};
          const vis = (cfg && cfg.vis && typeof cfg.vis === 'object') ? cfg.vis : {};
          const stored = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};

          const getArr = (k) => (Array.isArray(stored[k]) ? stored[k] : []);

          const defName = (kind, idx) => {
            if (kind === 'consumers' && idx === 1) return 'Heizung/Wärmepumpe';
            return (kind === 'consumers') ? `Verbraucher ${idx}` : `Erzeuger ${idx}`;
          };

          const pickName = (arr, idx, kind) => {
            const it = arr[idx - 1];
            const n = it && typeof it === 'object' && it.name !== undefined && it.name !== null ? String(it.name).trim() : '';
            return n || defName(kind, idx);
          };

          const pickIcon = (arr, idx) => {
            const it = arr[idx - 1];
            const ico = (it && typeof it === 'object' && it.icon !== undefined && it.icon !== null) ? String(it.icon).trim() : '';
            return ico || '';
          };

          const pickQuick = (arr, idx, kind) => {
            const it = arr[idx - 1];
            const ctrl = (it && typeof it === 'object' && it.ctrl && typeof it.ctrl === 'object') ? it.ctrl : {};

            const swW = String(ctrl.switchWriteId || '').trim();
            const spW = String(ctrl.setpointWriteId || '').trim();
            // Optional SG-Ready actuation (2 relays)
            const sgAW = String(ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim();
            const sgBW = String(ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim();

            const enabled = !!(swW || spW || sgAW || sgBW);

            const numOrNull = (v) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : null;
            };

            const meta = {
              enabled,
              hasSwitch: !!(swW || sgAW || sgBW),
              hasSetpoint: !!spW,
              hasSgReady: !!(sgAW || sgBW),
              label: String(ctrl.setpointLabel || '').trim(),
              unit: String(ctrl.setpointUnit || '').trim() || 'W',
              min: numOrNull(ctrl.setpointMin),
              max: numOrNull(ctrl.setpointMax),
              step: numOrNull(ctrl.setpointStep)
            };

            // Default label only if a setpoint exists
            if (!meta.label && meta.hasSetpoint) meta.label = 'Sollwert';
            if (!meta.hasSetpoint) {
              meta.label = '';
              meta.unit = 'W';
              meta.min = null;
              meta.max = null;
              meta.step = null;
            }

            // Optional: Boost for thermische Verbraucher (nur, wenn thermische Steuerung aktiviert ist)
            meta.hasBoost = false;
            meta.boostMinutes = null;
            meta.manualHoldMin = null;
            try {
              if (kind === 'consumers' && cfg && cfg.enableThermalControl) {
                const t = (cfg.thermal && typeof cfg.thermal === 'object') ? cfg.thermal : {};
                const tlist = Array.isArray(t.devices) ? t.devices : [];
                let dev = null;
                if (tlist[idx - 1] && typeof tlist[idx - 1] === 'object') {
                  const s = Number(tlist[idx - 1].slot ?? tlist[idx - 1].consumerSlot ?? idx);
                  if (Math.round(s) === idx) dev = tlist[idx - 1];
                }
                if (!dev) dev = tlist.find(r => r && Math.round(Number(r.slot ?? r.consumerSlot ?? 0)) === idx) || null;
                const holdMin = Math.max(0, Math.round(Number(t.manualHoldMin ?? 20)));
                meta.manualHoldMin = holdMin;
                if (dev && dev.boostEnabled !== false && enabled) {
                  meta.hasBoost = true;
                  const mins = Math.max(0, Math.round(Number(dev.boostDurationMin ?? 30)));
                  meta.boostMinutes = mins || 30;
                }
              }
            } catch (_e) {
              // ignore
            }

            return meta;
          };

          const buildSlots = (kind) => {
            const arr = getArr(kind);
	            const out = [];
	            const SLOT_COUNT = SLOT_COUNT_BY_KIND[kind] || 10;
	            for (let i = 1; i <= SLOT_COUNT; i++) {
              const key = (kind === 'consumers') ? `consumer${i}Power` : `producer${i}Power`;
              let stateKey = key;
              let mapped = !!String(dps[key] || '').trim();

              // Legacy: älteres Setup hatte Heizung separat (consumptionHeating). Wenn consumer1Power leer ist,
              // nutzen wir es als Slot 1 (Anzeige) ohne die Konfiguration zu verändern.
              if (kind === 'consumers' && i === 1 && !mapped) {
                const legacy = String(dps.consumptionHeating || '').trim();
                if (legacy) {
                  mapped = true;
                  stateKey = 'consumptionHeating';
                }
              }

              out.push({
                idx: i,
                key,
                stateKey,
                name: pickName(arr, i, kind),
                icon: pickIcon(arr, i),
                mapped,
                qc: pickQuick(arr, i, kind)
              });
            }
            return out;
          };

          const evcsList = Array.isArray(this.evcsList) ? this.evcsList : [];
          const evcsHasPower = evcsList.some(e => e && String(e.powerId || '').trim());
          const evcsAltMapped = !!String(dps.consumptionEvcs || '').trim();

          return {
            consumers: buildSlots('consumers'),
            producers: buildSlots('producers'),
            meta: {
              evcsAvailable: !!(evcsHasPower || evcsAltMapped)
            }
          };
        })(),

settingsConfig: {
          evcsCount: (cfg && cfg.settingsConfig && Number(cfg.settingsConfig.evcsCount)) || (this.evcsCount || 1),
          evcsMaxPowerKw: (cfg && cfg.settingsConfig && Number(cfg.settingsConfig.evcsMaxPowerKw)) || 11,
          evcsList: Array.isArray(this.evcsList) ? this.evcsList : []
        },
        smartHome: cfg.smartHome || {},
        ems: {
          chargingEnabled: inferChargingEnabled(),
          peakShavingEnabled: boolOr(cfg.enablePeakShaving, false),
          para14aEnabled: boolOr(cfg && cfg.installerConfig && cfg.installerConfig.para14a, false),
          gridConstraintsEnabled: boolOr(cfg.enableGridConstraints, false),
          storageEnabled: boolOr(cfg.enableStorageControl, false),
          storageFarmEnabled: boolOr(cfg.enableStorageFarm, false),
          thresholdEnabled: boolOr(cfg.enableThresholdControl, false),
          relayEnabled: boolOr(cfg.enableRelayControl, false),
          bhkwEnabled: boolOr(cfg.enableBhkwControl, false),
          generatorEnabled: boolOr(cfg.enableGeneratorControl, false),
          schedulerIntervalMs: (cfg && Number(cfg.schedulerIntervalMs)) || 1000
        },
        thresholdRules: (() => {
          try {
            const t = (cfg && cfg.threshold && typeof cfg.threshold === 'object') ? cfg.threshold : {};
            const list = Array.isArray(t.rules) ? t.rules : [];
            const out = [];
            const used = new Set();
            for (let i = 0; i < list.length; i++) {
              const r = list[i] || {};
              const idx = Math.max(1, Math.min(10, Math.round(Number(r.idx ?? r.index ?? (i + 1)) || 0) || (i + 1)));
              if (used.has(idx)) continue;
              used.add(idx);
              const name = String(r.name || '').trim() || `Regel ${idx}`;
              const enabled = (typeof r.enabled === 'boolean') ? !!r.enabled : false;
              const userCanToggle = (typeof r.userCanToggle === 'boolean') ? !!r.userCanToggle : true;
              const userCanSetThreshold = (typeof r.userCanSetThreshold === 'boolean') ? !!r.userCanSetThreshold : true;
              const userCanSetMinOnSec = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : userCanSetThreshold;
              const userCanSetMinOffSec = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : userCanSetThreshold;
              const configured = !!(String(r.inputId || r.inputObjectId || '').trim() && String(r.outputId || r.outputObjectId || '').trim());
              out.push({ idx, name, enabled, configured, userCanToggle, userCanSetThreshold, userCanSetMinOnSec, userCanSetMinOffSec });
            }
            out.sort((a, b) => a.idx - b.idx);
            return out;
          } catch (_e) {
            return [];
          }
        })(),



        relayControls: (() => {
          try {
            const r = (cfg && cfg.relay && typeof cfg.relay === 'object') ? cfg.relay : {};
            const list = Array.isArray(r.relays) ? r.relays : [];
            const out = [];
            const used = new Set();
            for (let i = 0; i < list.length; i++) {
              const it = list[i] || {};
              const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || 0) || (i + 1)));
              if (used.has(idx)) continue;
              used.add(idx);
              const name = String(it.name || '').trim() || `Ausgang ${idx}`;
              const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : true;
              const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
              const type = (String(it.type || '').toLowerCase() === 'boolean' || String(it.type || '').toLowerCase() === 'bool' || String(it.type || '').toLowerCase() === 'switch') ? 'boolean' : 'number';
              const configured = !!String(it.writeId || it.writeObjectId || '').trim();
              const userCanToggle = (typeof it.userCanToggle === 'boolean') ? !!it.userCanToggle : true;
              const userCanSetValue = (typeof it.userCanSetValue === 'boolean') ? !!it.userCanSetValue : true;
              const min = Number.isFinite(Number(it.min)) ? Number(it.min) : null;
              const max = Number.isFinite(Number(it.max)) ? Number(it.max) : null;
              const step = Number.isFinite(Number(it.step)) ? Number(it.step) : null;
              const unit = String(it.unit || '').trim();
              out.push({ idx, name, enabled, showInLive, type, configured, userCanToggle, userCanSetValue, min, max, step, unit });
            }
            out.sort((a, b) => a.idx - b.idx);
            return out;
          } catch (_e) {
            return [];
          }
        })(),

        bhkwDevices: (() => {
          try {
            const b = (cfg && cfg.bhkw && typeof cfg.bhkw === 'object') ? cfg.bhkw : {};
            const list = Array.isArray(b.devices) ? b.devices : [];
            const out = [];
            const used = new Set();
            for (let i = 0; i < list.length; i++) {
              const it = list[i] || {};
              const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || 0) || (i + 1)));
              if (used.has(idx)) continue;
              used.add(idx);

              const name = String(it.name || '').trim() || `BHKW ${idx}`;
              const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : true;
              const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
              const userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : true;

              const startId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
              const stopId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
              const runId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
              const pwrId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

              const configured = !!(startId && stopId);

              out.push({
                idx,
                name,
                enabled,
                showInLive,
                userCanControl,
                configured,
                hasRunning: !!runId,
                hasPower: !!pwrId
              });
            }
            out.sort((a, b) => a.idx - b.idx);
            return out;
          } catch (_e) {
            return [];
          }
        })(),

        generatorDevices: (() => {
          try {
            const g = (cfg && cfg.generator && typeof cfg.generator === 'object') ? cfg.generator : {};
            const list = Array.isArray(g.devices) ? g.devices : [];
            const out = [];
            const used = new Set();
            for (let i = 0; i < list.length; i++) {
              const it = list[i] || {};
              const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || 0) || (i + 1)));
              if (used.has(idx)) continue;
              used.add(idx);

              const name = String(it.name || '').trim() || `Generator ${idx}`;
              const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : true;
              const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
              const userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : true;

              const startId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
              const stopId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
              const runId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
              const pwrId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

              const configured = !!(startId && stopId);

              out.push({ idx, name, enabled, showInLive, userCanControl, configured, hasRunning: !!runId, hasPower: !!pwrId });
            }
            out.sort((a, b) => a.idx - b.idx);
            return out;
          } catch (_e) {
            return [];
          }
        })(),


        installer: cfg.installer || {},
        adminUrl: cfg.adminUrl || null,
        // Installations-/Aktiv-Status der EMS-Apps (für dynamische VIS-UI)
        // Hinweis: keine Datenpunkt-IDs/Secrets – nur Flags.
        emsApps: (() => {
          try {
            const ea = (typeof _nwNormalizeEmsApps === 'function') ? _nwNormalizeEmsApps(cfg) : null;
            if (ea && typeof ea === 'object' && ea.apps && typeof ea.apps === 'object') {
              const out = { apps: {} };
              for (const [id, v] of Object.entries(ea.apps)) {
                out.apps[id] = {
                  installed: !!(v && v.installed),
                  enabled: !!(v && v.enabled)
                };
              }
              return out;
            }
          } catch (_e) {}

          try {
            const src = (cfg && cfg.emsApps && typeof cfg.emsApps === 'object') ? cfg.emsApps : {};
            const apps = (src.apps && typeof src.apps === 'object') ? src.apps : {};
            const out = { apps: {} };
            for (const [id, v] of Object.entries(apps)) {
              out.apps[id] = {
                installed: !!(v && v.installed),
                enabled: !!(v && v.enabled)
              };
            }
            return out;
          } catch (_e) {}

          return { apps: {} };
        })(),
        auth: {
          enabled: !!authEnabled,
          authed: !!sess,
          user: (sess && sess.user) ? String(sess.user) : null,
          isInstaller: !!(sess && sess.isInstaller),
          protectWrites: !!protectWrites,
        },
        // UI compatibility flag: old frontends used "installerLocked".
        // New behaviour: installer-level features are locked until the user logs in
        // with an account that has installer rights.
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

        // Netzschutz: Peak‑Shaving darf nicht durch Endkunden (VIS) deaktiviert werden.
        // Konfiguration erfolgt ausschließlich über das Installer‑/App‑Center.
        if (scope === 'settings' && String(key) === 'peakShavingEnabled') {
          return res.status(403).json({ ok: false, error: 'forbidden' });
        }


        // Installer-only scopes (protect RFID whitelist + installer settings)
        if ((scope === 'installer' || scope === 'rfid') && authEnabled && protectWrites) {
          const s = req.nwSession;
          if (!s || !s.isInstaller) return res.status(403).json({ ok: false, error: 'forbidden' });
        }
        // EMS setter: end-customer control for charging management (per wallbox)
        // - userMode: auto|pv|minpv|boost
        // - regEnabled: Regelung an/aus (Automatik)
        if (scope === 'ems') {
          const k = String(key || '');
          let safe = '';
          let prop = '';

          // Supported keys (examples):
          // - evcs.1.userMode
          // - evcs.1.regEnabled
          // - lp1.userMode
          // - lp1.regEnabled
          // - chargingManagement.wallboxes.lp1.userMode
          // - chargingManagement.wallboxes.lp1.userEnabled
          const mIdx = k.match(/^(?:evcs\.)?(\d+)\.(userMode|emsMode|regEnabled|goalEnabled|goalTargetSocPct|goalFinishTs|goalBatteryKwh)$/i);
          if (mIdx) {
            const idx = Math.max(1, Math.round(Number(mIdx[1] || 0)));
            safe = `lp${idx}`;
            prop = String(mIdx[2] || '').toLowerCase();
          } else {
            const mLp = k.match(/^lp(\d+)\.(userMode|emsMode|regEnabled|goalEnabled|goalTargetSocPct|goalFinishTs|goalBatteryKwh)$/i);
            if (mLp) {
              const idx = Math.max(1, Math.round(Number(mLp[1] || 0)));
              safe = `lp${idx}`;
              prop = String(mLp[2] || '').toLowerCase();
            } else {
              const m2 = k.match(/^chargingManagement\.(?:wallboxes\.)?([a-z0-9_]+)\.(userMode|userEnabled|regEnabled|goalEnabled|goalTargetSocPct|goalFinishTs|goalBatteryKwh)$/i);
              if (m2) {
                safe = String(m2[1] || '').trim();
                prop = String(m2[2] || '').toLowerCase();
              }
            }
          }
          if (!safe || !prop) return res.status(400).json({ ok: false, error: 'bad request' });

          // Regelung (Automatik) an/aus
          if (prop === 'regenabled' || prop === 'userenabled') {
            const b = !!value;
            const id = `chargingManagement.wallboxes.${safe}.userEnabled`;
            try {
              await this.setStateAsync(id, b, false);

              // UX: beim Deaktivieren Boost-Indikatoren sofort zurücksetzen (keine "hängenden" Zustände)
              if (!b) {
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


          // Zeit-Ziel Laden (Depot-/Deadline-Laden)
          // - goalEnabled: Aktiv/aus
          // - goalTargetSocPct: Ziel-SoC 0..100
          // - goalFinishTs: Deadline als UNIX Timestamp (ms)
          // - goalBatteryKwh: optionale Kapazität zur genaueren Planung
          if (prop === 'goalenabled') {
            const b = !!value;
            const id = `chargingManagement.wallboxes.${safe}.goalEnabled`;
            try {
              await this.setStateAsync(id, b, false);
              try { this.updateValue(id, b, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          if (prop === 'goaltargetsocpct' || prop === 'goaltargetsoc') {
            const n = Number(value);
            if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
            const v = Math.max(0, Math.min(100, Math.round(n)));
            const id = `chargingManagement.wallboxes.${safe}.goalTargetSocPct`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          if (prop === 'goalfinishts') {
            const n = Number(value);
            if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
            // Allow 0 to clear; otherwise clamp to a reasonable range (now..+1y) to avoid bad writes
            const now = Date.now();
            let v = Math.round(n);
            if (v < 0) v = 0;
            if (v > 0) {
              const max = now + 366 * 24 * 3600 * 1000;
              if (v > max) v = max;
            }
            const id = `chargingManagement.wallboxes.${safe}.goalFinishTs`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          if (prop === 'goalbatterykwh') {
            const n = Number(value);
            if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
            // Allow 0 to clear; clamp to reasonable max (0..2000kWh)
            const v = Math.max(0, Math.min(5000, Math.round(n * 10) / 10));
            const id = `chargingManagement.wallboxes.${safe}.goalBatteryKwh`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          // Modus: auto|pv|minpv|boost
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


        // BHKW Steuerung – Schnellsteuerung (Modus + Start/Stop)
        // Keys:
        // - b1.mode (auto|manual|off)
        // - b1.command (start|stop)
        if (scope === 'bhkw') {
          const cfg = this.config || {};
          if (!cfg.enableBhkwControl) return res.status(409).json({ ok: false, error: 'not_ready' });

          const k = String(key || '').trim();
          const m = k.match(/^b(\d+)\.(mode|command)$/i);
          if (!m) return res.status(400).json({ ok: false, error: 'bad request' });

          const idx = Math.max(1, Math.min(10, Math.round(Number(m[1] || 0)) || 0));
          const prop = String(m[2] || '').toLowerCase();

          // Permission: Endkunden-Steuerung optional (pro Gerät). Falls gesperrt → nur Installateur.
          let userCan = true;
          try {
            const b = (cfg.bhkw && typeof cfg.bhkw === 'object') ? cfg.bhkw : {};
            const list = Array.isArray(b.devices) ? b.devices : [];
            const dev = list.find(d => d && Math.round(Number(d.idx ?? d.index ?? d.id)) === idx) || null;
            if (dev && typeof dev.userCanControl === 'boolean') userCan = !!dev.userCanControl;
          } catch (_e) {}

          if (authEnabled && protectWrites && !userCan) {
            const s = req.nwSession;
            if (!s || !s.isInstaller) return res.status(403).json({ ok: false, error: 'forbidden' });
          }

          if (prop === 'mode') {
            let v = String(value === null || value === undefined ? 'auto' : value).trim().toLowerCase();
            if (v === 'manuell') v = 'manual';
            if (v === 'aus') v = 'off';
            if (!['auto', 'manual', 'off'].includes(v)) v = 'auto';

            const id = `bhkw.user.b${idx}.mode`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          if (prop === 'command') {
            let v = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
            if (v === 'on') v = 'start';
            if (v === 'off') v = 'stop';
            if (!['start', 'stop', ''].includes(v)) v = '';

            const id = `bhkw.user.b${idx}.command`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          return res.status(400).json({ ok: false, error: 'bad request' });
        }





        // Generator Steuerung – Schnellsteuerung (Modus + Start/Stop)
        // Keys:
        // - g1.mode (auto|manual|off)
        // - g1.command (start|stop)
        if (scope === 'generator') {
          const cfg = this.config || {};
          if (!cfg.enableGeneratorControl) return res.status(409).json({ ok: false, error: 'not_ready' });

          const k = String(key || '').trim();
          const m = k.match(/^g(\d+)\.(mode|command)$/i);
          if (!m) return res.status(400).json({ ok: false, error: 'bad request' });

          const idx = Math.max(1, Math.min(10, Math.round(Number(m[1] || 0)) || 0));
          const prop = String(m[2] || '').toLowerCase();

          // Permission: Endkunden-Steuerung optional (pro Gerät). Falls gesperrt → nur Installateur.
          let userCan = true;
          try {
            const g = (cfg.generator && typeof cfg.generator === 'object') ? cfg.generator : {};
            const list = Array.isArray(g.devices) ? g.devices : [];
            const dev = list.find(d => d && Math.round(Number(d.idx ?? d.index ?? d.id)) === idx) || null;
            if (dev && typeof dev.userCanControl === 'boolean') userCan = !!dev.userCanControl;
          } catch (_e) {}

          if (authEnabled && protectWrites && !userCan) {
            const s = req.nwSession;
            if (!s || !s.isInstaller) return res.status(403).json({ ok: false, error: 'forbidden' });
          }

          if (prop === 'mode') {
            let v = String(value === null || value === undefined ? 'auto' : value).trim().toLowerCase();
            if (v === 'manuell') v = 'manual';
            if (v === 'aus') v = 'off';
            if (!['auto', 'manual', 'off'].includes(v)) v = 'auto';

            const id = `generator.user.g${idx}.mode`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          if (prop === 'command') {
            let v = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
            if (v === 'on') v = 'start';
            if (v === 'off') v = 'stop';
            if (!['start', 'stop', ''].includes(v)) v = '';

            const id = `generator.user.g${idx}.command`;
            try {
              await this.setStateAsync(id, v, false);
              try { this.updateValue(id, v, Date.now()); } catch (_e) {}
              return res.json({ ok: true });
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }
          }

          return res.status(400).json({ ok: false, error: 'bad request' });
        }


        // Schwellwertsteuerung – optionale Endkunden-Overrides (Enable/Modus/Schwellwert)
        // Keys:
        // - r1.enabled
        // - r1.mode
        // - r1.threshold
        if (scope === 'threshold') {
          const cfg = this.config || {};
          const thrApp = (cfg.emsApps && cfg.emsApps.apps) ? cfg.emsApps.apps.threshold : null;
          const thrInstalled = !!(thrApp ? thrApp.installed : cfg.enableThresholdControl);
          if (!thrInstalled) return res.status(409).json({ ok: false, error: 'not_ready' });

          const k = String(key || '').trim();
          const m = k.match(/^r(\d+)\.(enabled|threshold|mode|minOnSec|minOffSec)$/i);
          if (!m) return res.status(400).json({ ok: false, error: 'bad request' });

          const idx = Math.max(1, Math.min(10, Math.round(Number(m[1] || 0)) || 0));
          const prop = String(m[2] || '').toLowerCase();

          // Resolve rule permissions from installer config
          const t = (cfg.threshold && typeof cfg.threshold === 'object') ? cfg.threshold : {};
          const list = Array.isArray(t.rules) ? t.rules : [];
          let rule = null;
          for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const ridx = Math.max(1, Math.min(10, Math.round(Number(r.idx ?? r.index ?? (i + 1)) || (i + 1))));
            if (ridx === idx) { rule = r; break; }
          }

          const userCanToggle = (rule && typeof rule.userCanToggle === 'boolean') ? !!rule.userCanToggle : true;
          const userCanSetThreshold = (rule && typeof rule.userCanSetThreshold === 'boolean') ? !!rule.userCanSetThreshold : true;
          const userCanSetMinOnSec = (rule && typeof rule.userCanSetMinOnSec === 'boolean') ? !!rule.userCanSetMinOnSec : userCanSetThreshold;
          const userCanSetMinOffSec = (rule && typeof rule.userCanSetMinOffSec === 'boolean') ? !!rule.userCanSetMinOffSec : userCanSetThreshold;

          if ((prop === 'enabled' || prop === 'mode') && !userCanToggle) return res.status(403).json({ ok: false, error: 'forbidden' });
          if (prop === 'threshold' && !userCanSetThreshold) return res.status(403).json({ ok: false, error: 'forbidden' });
          if (prop === 'minonsec' && !userCanSetMinOnSec) return res.status(403).json({ ok: false, error: 'forbidden' });
          if (prop === 'minoffsec' && !userCanSetMinOffSec) return res.status(403).json({ ok: false, error: 'forbidden' });

          // Best effort: ensure objects exist (robust against partial upgrades)
          try {
            await this.setObjectNotExistsAsync('threshold.user', { type: 'channel', common: { name: 'User' }, native: {} });
            await this.setObjectNotExistsAsync(`threshold.user.r${idx}`, { type: 'channel', common: { name: `Regel ${idx}` }, native: {} });
            await this.setObjectNotExistsAsync(`threshold.user.r${idx}.enabled`, { type: 'state', common: { name: 'Regel aktiv (User)', type: 'boolean', role: 'switch.enable', read: true, write: true, def: true }, native: {} });
            await this.setObjectNotExistsAsync(`threshold.user.r${idx}.threshold`, { type: 'state', common: { name: 'Schwellwert (User)', type: 'number', role: 'level', read: true, write: true, def: 0 }, native: {} });
            await this.setObjectNotExistsAsync(`threshold.user.r${idx}.minOnSec`, { type: 'state', common: { name: 'MinOn (User)', type: 'number', role: 'value', unit: 's', read: true, write: true, def: 0 }, native: {} });
            await this.setObjectNotExistsAsync(`threshold.user.r${idx}.minOffSec`, { type: 'state', common: { name: 'MinOff (User)', type: 'number', role: 'value', unit: 's', read: true, write: true, def: 0 }, native: {} });
            await this.setObjectNotExistsAsync(`threshold.user.r${idx}.mode`, { type: 'state', common: { name: 'Modus (User)', type: 'number', role: 'value', read: true, write: true, def: 1, min: 0, max: 2, states: { 0: 'Aus', 1: 'Auto', 2: 'An' } }, native: {} });
          } catch (_e) {}


          if (prop === 'mode') {
            const mv = Number(value);
            if (!Number.isFinite(mv)) return res.status(400).json({ ok: false, error: 'bad request' });
            const mode = Math.max(0, Math.min(2, Math.round(mv)));

            await this.setStateAsync(`threshold.user.r${idx}.mode`, { val: mode, ack: false });
            try { this.updateValue(`threshold.user.r${idx}.mode`, mode, Date.now()); } catch(_e) {}

            const en = (mode !== 0);
            await this.setStateAsync(`threshold.user.r${idx}.enabled`, { val: en, ack: false });
            try { this.updateValue(`threshold.user.r${idx}.enabled`, en, Date.now()); } catch(_e) {}

            return res.json({ ok: true });
          }

          if (prop === 'enabled') {
            const b = !!value;
            await this.setStateAsync(`threshold.user.r${idx}.enabled`, { val: b, ack: false });
            try { this.updateValue(`threshold.user.r${idx}.enabled`, b, Date.now()); } catch(_e) {}

            // Sync mode (Kompatibilität): enabled=false -> Aus (0), enabled=true -> Auto (1) (manual_on bleibt erhalten)
            try {
              const stMode = await this.getStateAsync(`threshold.user.r${idx}.mode`);
              const curMode = (stMode && stMode.val !== null && stMode.val !== undefined) ? Number(stMode.val) : NaN;
              const newMode = b ? ((Number.isFinite(curMode) && Math.round(curMode) === 2) ? 2 : 1) : 0;
              await this.setStateAsync(`threshold.user.r${idx}.mode`, { val: newMode, ack: false });
              try { this.updateValue(`threshold.user.r${idx}.mode`, newMode, Date.now()); } catch(_e) {}
            } catch(_e) {}

            return res.json({ ok: true });
          }

          if (prop === 'minonsec') {
            const n = Number(value);
            if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
            const v = Math.max(0, Math.min(86400, Math.round(n)));
            await this.setStateAsync(`threshold.user.r${idx}.minOnSec`, { val: v, ack: false });
            try { this.updateValue(`threshold.user.r${idx}.minOnSec`, v, Date.now()); } catch(_e) {}
            return res.json({ ok: true });
          }

          if (prop === 'minoffsec') {
            const n = Number(value);
            if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
            const v = Math.max(0, Math.min(86400, Math.round(n)));
            await this.setStateAsync(`threshold.user.r${idx}.minOffSec`, { val: v, ack: false });
            try { this.updateValue(`threshold.user.r${idx}.minOffSec`, v, Date.now()); } catch(_e) {}
            return res.json({ ok: true });
          }

          // threshold
          const n = Number(value);
          if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
          await this.setStateAsync(`threshold.user.r${idx}.threshold`, { val: n, ack: false });
          try { this.updateValue(`threshold.user.r${idx}.threshold`, n, Date.now()); } catch(_e) {}
          return res.json({ ok: true });
        }


        // Relaissteuerung – manuelle Ausgänge (Endkundenbedienung optional pro Ausgang)
        // Keys:
        // - r1.switch  (boolean)
        // - r1.value   (number)
        if (scope === 'relay') {
          const cfg = this.config || {};
          if (!cfg.enableRelayControl) return res.status(409).json({ ok: false, error: 'not_ready' });

          const k = String(key || '').trim();
          const m = k.match(/^r(\d+)\.(switch|value)$/i);
          if (!m) return res.status(400).json({ ok: false, error: 'bad request' });

          const idx = Math.max(1, Math.min(10, Math.round(Number(m[1] || 0)) || 0));
          const prop = String(m[2] || '').toLowerCase();

          const r = (cfg.relay && typeof cfg.relay === 'object') ? cfg.relay : {};
          const list = Array.isArray(r.relays) ? r.relays : [];
          let it = null;
          for (let i = 0; i < list.length; i++) {
            const x = list[i] || {};
            const ridx = Math.max(1, Math.min(10, Math.round(Number(x.idx ?? x.index ?? (i + 1)) || (i + 1))));
            if (ridx === idx) { it = x; break; }
          }
          if (!it) return res.status(404).json({ ok: false, error: 'not_found' });

          const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : true;
          if (!enabled) return res.status(409).json({ ok: false, error: 'disabled' });

          const type = (String(it.type || '').toLowerCase() === 'boolean' || String(it.type || '').toLowerCase() === 'bool' || String(it.type || '').toLowerCase() === 'switch') ? 'boolean' : 'number';
          const writeId = String(it.writeId || it.writeObjectId || '').trim();
          if (!writeId) return res.status(409).json({ ok: false, error: 'not_ready' });

          const invert = (typeof it.invert === 'boolean') ? !!it.invert : false;

          const userCanToggle = (typeof it.userCanToggle === 'boolean') ? !!it.userCanToggle : true;
          const userCanSetValue = (typeof it.userCanSetValue === 'boolean') ? !!it.userCanSetValue : true;

          if (prop === 'switch') {
            if (type !== 'boolean') return res.status(400).json({ ok: false, error: 'bad request' });
            if (!userCanToggle) return res.status(403).json({ ok: false, error: 'forbidden' });

            let b = !!value;
            if (invert) b = !b;

            try {
              await this.setForeignStateAsync(writeId, b);
              try {
                const base = `relay.controls.r${idx}`;
                await this.setObjectNotExistsAsync('relay', { type: 'channel', common: { name: 'Relaissteuerung' }, native: {} });
                await this.setObjectNotExistsAsync('relay.controls', { type: 'channel', common: { name: 'Controls' }, native: {} });
                await this.setObjectNotExistsAsync(base, { type: 'channel', common: { name: `Ausgang ${idx}` }, native: {} });
                await this.setObjectNotExistsAsync(`${base}.lastWriteOk`, { type: 'state', common: { name: 'Letzter Schreibbefehl OK', type: 'boolean', role: 'indicator', read: true, write: false, def: false }, native: {} });
                await this.setObjectNotExistsAsync(`${base}.lastWriteTs`, { type: 'state', common: { name: 'Letzter Schreibbefehl Zeitpunkt', type: 'number', role: 'value.time', read: true, write: false, def: 0 }, native: {} });
                await this.setObjectNotExistsAsync(`${base}.lastWriteValue`, { type: 'state', common: { name: 'Letzter Schreibwert', type: 'boolean', role: 'state', read: true, write: false, def: false }, native: {} });
                await this.setObjectNotExistsAsync(`${base}.lastWriteError`, { type: 'state', common: { name: 'Letzter Schreibfehler', type: 'string', role: 'text', read: true, write: false, def: '' }, native: {} });
                await this.setStateAsync(`${base}.lastWriteOk`, { val: true, ack: true });
                await this.setStateAsync(`${base}.lastWriteTs`, { val: Date.now(), ack: true });
                await this.setStateAsync(`${base}.lastWriteValue`, { val: invert ? !b : b, ack: true });
                await this.setStateAsync(`${base}.lastWriteError`, { val: '', ack: true });
              } catch (_e2) {
                // ignore diagnostics errors
              }
              return res.json({ ok: true });
            } catch (e) {
              try {
                const base = `relay.controls.r${idx}`;
                await this.setStateAsync(`${base}.lastWriteOk`, { val: false, ack: true });
                await this.setStateAsync(`${base}.lastWriteTs`, { val: Date.now(), ack: true });
                await this.setStateAsync(`${base}.lastWriteError`, { val: String(e && e.message ? e.message : e), ack: true });
              } catch (_e3) {}
              return res.status(409).json({ ok: false, error: 'write_failed' });
            }
          }

          // value
          if (type !== 'number') return res.status(400).json({ ok: false, error: 'bad request' });
          if (!userCanSetValue) return res.status(403).json({ ok: false, error: 'forbidden' });

          const n = Number(value);
          if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });

          const min = Number.isFinite(Number(it.min)) ? Number(it.min) : null;
          const max = Number.isFinite(Number(it.max)) ? Number(it.max) : null;
          const step = Number.isFinite(Number(it.step)) ? Number(it.step) : null;

          let v = n;
          if (min !== null) v = Math.max(min, v);
          if (max !== null) v = Math.min(max, v);
          if (step !== null && step > 0) v = Math.round(v / step) * step;
          if (invert) v = -v;

          try {
            await this.setForeignStateAsync(writeId, v);
            try {
              const base = `relay.controls.r${idx}`;
              await this.setObjectNotExistsAsync('relay', { type: 'channel', common: { name: 'Relaissteuerung' }, native: {} });
              await this.setObjectNotExistsAsync('relay.controls', { type: 'channel', common: { name: 'Controls' }, native: {} });
              await this.setObjectNotExistsAsync(base, { type: 'channel', common: { name: `Ausgang ${idx}` }, native: {} });
              await this.setObjectNotExistsAsync(`${base}.lastWriteOk`, { type: 'state', common: { name: 'Letzter Schreibbefehl OK', type: 'boolean', role: 'indicator', read: true, write: false, def: false }, native: {} });
              await this.setObjectNotExistsAsync(`${base}.lastWriteTs`, { type: 'state', common: { name: 'Letzter Schreibbefehl Zeitpunkt', type: 'number', role: 'value.time', read: true, write: false, def: 0 }, native: {} });
              await this.setObjectNotExistsAsync(`${base}.lastWriteValueNum`, { type: 'state', common: { name: 'Letzter Schreibwert', type: 'number', role: 'value', read: true, write: false, def: 0 }, native: {} });
              await this.setObjectNotExistsAsync(`${base}.lastWriteError`, { type: 'state', common: { name: 'Letzter Schreibfehler', type: 'string', role: 'text', read: true, write: false, def: '' }, native: {} });
              await this.setStateAsync(`${base}.lastWriteOk`, { val: true, ack: true });
              await this.setStateAsync(`${base}.lastWriteTs`, { val: Date.now(), ack: true });
              await this.setStateAsync(`${base}.lastWriteValueNum`, { val: invert ? -v : v, ack: true });
              await this.setStateAsync(`${base}.lastWriteError`, { val: '', ack: true });
            } catch (_e2) {}
            return res.json({ ok: true });
          } catch (e) {
            try {
              const base = `relay.controls.r${idx}`;
              await this.setStateAsync(`${base}.lastWriteOk`, { val: false, ack: true });
              await this.setStateAsync(`${base}.lastWriteTs`, { val: Date.now(), ack: true });
              await this.setStateAsync(`${base}.lastWriteError`, { val: String(e && e.message ? e.message : e), ack: true });
            } catch (_e3) {}
            return res.status(409).json({ ok: false, error: 'write_failed' });
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

        // Energiefluss (VIS) – Schnellsteuerung für optionale Verbraucher/Erzeuger
        // Der Frontend-Call referenziert nur Slot+Eigenschaft (keine Fremd-IDs). Mapping erfolgt serverseitig.
        // Phase 4.4: optionaler Boost/Manual-Hold für thermische Verbraucher (Wärmepumpe/Heizung/Klima).
        if (scope === 'flow') {
          const k = String(key || '').trim();
          const m = k.match(/^(consumer|consumers|producer|producers)\.(\d+)\.(switch|setpoint|boost|mode|regEnabled)$/i);
          if (!m) return res.status(400).json({ ok: false, error: 'bad request' });

          const kind = String(m[1] || '').toLowerCase().startsWith('prod') ? 'producers' : 'consumers';
          const idx = Math.max(1, Math.round(Number(m[2] || 0)));
          if (idx < 1 || idx > 10) return res.status(400).json({ ok: false, error: 'bad request' });

          const prop = String(m[3] || '').toLowerCase();

          // Boost override (thermische Verbraucher) – rein lokal, keine Fremd-DPs.
          if (prop === 'boost') {
            if (kind !== 'consumers') return res.status(400).json({ ok: false, error: 'bad request' });

            const cfg = this.config || {};
            const t = (cfg.thermal && typeof cfg.thermal === 'object') ? cfg.thermal : {};
            const tlist = Array.isArray(t.devices) ? t.devices : [];

            // resolve device config for this slot
            let dev = null;
            if (tlist[idx - 1] && typeof tlist[idx - 1] === 'object') {
              const s = Number(tlist[idx - 1].slot ?? tlist[idx - 1].consumerSlot ?? idx);
              if (Math.round(s) === idx) dev = tlist[idx - 1];
            }
            if (!dev) dev = tlist.find(r => r && Math.round(Number(r.slot ?? r.consumerSlot ?? 0)) === idx) || null;

            // If thermische Steuerung isn't enabled or no device exists, do not accept boost.
            if (!cfg.enableThermalControl || !dev) return res.status(409).json({ ok: false, error: 'not_ready' });
            if (dev.boostEnabled === false) return res.status(403).json({ ok: false, error: 'forbidden' });

            const mins = Math.max(0, Math.round(Number(dev.boostDurationMin ?? 30)));
            const now = Date.now();
            const idLocal = `c${idx}`;

            if (!this._thermalOverrides || typeof this._thermalOverrides !== 'object') this._thermalOverrides = {};
            const ov = (this._thermalOverrides[idLocal] && typeof this._thermalOverrides[idLocal] === 'object') ? this._thermalOverrides[idLocal] : {};

            const enableBoost = !!value;
            if (enableBoost && mins > 0) {
              ov.boostUntilMs = now + mins * 60 * 1000;
              // manual hold is no longer relevant once boost is explicitly activated
              ov.manualUntilMs = 0;
            } else {
              ov.boostUntilMs = 0;
            }
            this._thermalOverrides[idLocal] = ov;

            // Best effort: publish immediate UX states (thermal module will keep them updated).
            try {
              await this.setStateAsync(`thermal.devices.${idLocal}.boostUntil`, ov.boostUntilMs || 0, true);
              await this.setStateAsync(`thermal.devices.${idLocal}.boostActive`, (ov.boostUntilMs || 0) > now, true);
              await this.setStateAsync(`thermal.devices.${idLocal}.override`, (ov.boostUntilMs || 0) > now ? 'boost' : '', true);
            } catch (_e) {
              // ignore
            }

            return res.json({ ok: true, boostUntil: ov.boostUntilMs || 0 });
          }


          // Thermik: Endkunden-Bedienung (Mode + Regelung an/aus) als lokale States.
          // Diese Writes beeinflussen nur die Automatik (nicht die manuelle Schnellsteuerung via switch/setpoint).
          if (prop === 'mode' || prop === 'regenabled') {
            if (kind !== 'consumers') return res.status(400).json({ ok: false, error: 'bad request' });

            const cfg = this.config || {};
            if (!cfg.enableThermalControl) return res.status(409).json({ ok: false, error: 'not_ready' });

            const slot = idx;

            // Best effort: ensure objects exist (robust against partial upgrades)
            try {
              await this.setObjectNotExistsAsync('thermal.user', { type: 'channel', common: { name: 'User' }, native: {} });
              await this.setObjectNotExistsAsync(`thermal.user.c${slot}`, { type: 'channel', common: { name: `Consumer ${slot}` }, native: {} });
              await this.setObjectNotExistsAsync(`thermal.user.c${slot}.regEnabled`, { type: 'state', common: { name: 'Regelung aktiv', type: 'boolean', role: 'switch.enable', read: true, write: true, def: true }, native: {} });
              await this.setObjectNotExistsAsync(`thermal.user.c${slot}.mode`, { type: 'state', common: { name: 'Betriebsmodus', type: 'string', role: 'text', read: true, write: true, def: 'inherit' }, native: {} });
            } catch (_e) {}

            const idLocal = `c${slot}`;

            const clearOverrides = async () => {
              try {
                if (!this._thermalOverrides || typeof this._thermalOverrides !== 'object') this._thermalOverrides = {};
                const ov = (this._thermalOverrides[idLocal] && typeof this._thermalOverrides[idLocal] === 'object') ? this._thermalOverrides[idLocal] : {};
                ov.boostUntilMs = 0;
                ov.manualUntilMs = 0;
                this._thermalOverrides[idLocal] = ov;
              } catch (_e) {}

              // publish immediate UX states (optional)
              try {
                await this.setStateAsync(`thermal.devices.${idLocal}.boostUntil`, 0, true);
                await this.setStateAsync(`thermal.devices.${idLocal}.boostActive`, false, true);
                await this.setStateAsync(`thermal.devices.${idLocal}.manualUntil`, 0, true);
                await this.setStateAsync(`thermal.devices.${idLocal}.override`, '', true);
              } catch (_e) {}
            };

            if (prop === 'regenabled') {
              const b = !!value;
              try {
                await this.setStateAsync(`thermal.user.c${slot}.regEnabled`, b, false);
              } catch (_e) {
                return res.status(409).json({ ok: false, error: 'not_ready' });
              }
              if (!b) await clearOverrides();
              return res.json({ ok: true });
            }

            // mode
            let m = String(value === null || value === undefined ? 'inherit' : value).trim();
            const ml = m.toLowerCase();
            if (!m || ml === 'system') m = 'inherit';
            if (ml === 'auto' || ml === 'pvauto' || ml === 'pv') m = 'pvAuto';
            if (ml === 'manuell') m = 'manual';
            if (ml === 'aus') m = 'off';
            if (!['inherit', 'pvAuto', 'manual', 'off'].includes(m)) m = 'inherit';

            try {
              await this.setStateAsync(`thermal.user.c${slot}.mode`, m, false);
            } catch (_e) {
              return res.status(409).json({ ok: false, error: 'not_ready' });
            }

            // Mode change cancels boost/manual holds to avoid "stuck" UX.
            await clearOverrides();

            return res.json({ ok: true });
          }

          const vis = (this.config && this.config.vis && typeof this.config.vis === 'object') ? this.config.vis : {};
          const fs = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
          const arr = Array.isArray(fs[kind]) ? fs[kind] : [];
          const slot = (arr[idx - 1] && typeof arr[idx - 1] === 'object') ? arr[idx - 1] : {};
          const ctrl = (slot.ctrl && typeof slot.ctrl === 'object') ? slot.ctrl : {};

          // Write mapping
          const swW = String(ctrl.switchWriteId || '').trim();
          const spW = String(ctrl.setpointWriteId || '').trim();
          const sgAW = String(ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim();
          const sgBW = String(ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim();
          const sgAInv = !!ctrl.sgReadyAInvert;
          const sgBInv = !!ctrl.sgReadyBInvert;

          let v = value;
          if (prop === 'switch') {
            v = !!value;
          } else {
            const n = Number(value);
            if (!Number.isFinite(n)) return res.status(400).json({ ok: false, error: 'bad request' });
            v = n;
          }

          // Manual-hold for thermische Verbraucher: prevent immediate override by PV-auto after a manual quick action.
          try {
            const cfg = this.config || {};
            if (cfg.enableThermalControl && kind === 'consumers') {
              const t = (cfg.thermal && typeof cfg.thermal === 'object') ? cfg.thermal : {};
              const tlist = Array.isArray(t.devices) ? t.devices : [];
              let dev = null;
              if (tlist[idx - 1] && typeof tlist[idx - 1] === 'object') {
                const s = Number(tlist[idx - 1].slot ?? tlist[idx - 1].consumerSlot ?? idx);
                if (Math.round(s) === idx) dev = tlist[idx - 1];
              }
              if (!dev) dev = tlist.find(r => r && Math.round(Number(r.slot ?? r.consumerSlot ?? 0)) === idx) || null;
              const holdMin = Math.max(0, Math.round(Number(t.manualHoldMin ?? 20)));
              if (dev && holdMin > 0) {
                const now = Date.now();
                const idLocal = `c${idx}`;
                if (!this._thermalOverrides || typeof this._thermalOverrides !== 'object') this._thermalOverrides = {};
                const ov = (this._thermalOverrides[idLocal] && typeof this._thermalOverrides[idLocal] === 'object') ? this._thermalOverrides[idLocal] : {};
                ov.manualUntilMs = now + holdMin * 60 * 1000;
                // A manual action implicitly cancels boost.
                ov.boostUntilMs = 0;
                this._thermalOverrides[idLocal] = ov;
                try {
                  await this.setStateAsync(`thermal.devices.${idLocal}.manualUntil`, ov.manualUntilMs || 0, true);
                  await this.setStateAsync(`thermal.devices.${idLocal}.override`, 'manual_hold', true);
                  await this.setStateAsync(`thermal.devices.${idLocal}.boostUntil`, 0, true);
                  await this.setStateAsync(`thermal.devices.${idLocal}.boostActive`, false, true);
                } catch (_e2) {
                  // ignore
                }
              }
            }
          } catch (_e) {
            // ignore
          }

          // SG-Ready special case: switch writes map to Relay A/B.
          if (prop === 'switch' && (sgAW || sgBW) && kind === 'consumers') {
            const wantOn = !!v;
            const aVal = sgAInv ? !wantOn : wantOn;
            // default mapping: relay B stays false for on/off; boost is handled separately by the thermal module override
            const bVal = sgBInv ? !false : false;
            if (!sgAW && !sgBW) return res.status(400).json({ ok: false, error: 'unmapped' });
            if (sgAW) await this.setForeignStateAsync(sgAW, aVal);
            if (sgBW) await this.setForeignStateAsync(sgBW, bVal);
            // Optional additional enable output
            if (swW) {
              await this.setForeignStateAsync(swW, wantOn);
            }
            return res.json({ ok: true });
          }

          const id = prop === 'switch' ? swW : spW;
          if (!id) return res.status(400).json({ ok: false, error: 'unmapped' });

          await this.setForeignStateAsync(id, v);
          return res.json({ ok: true });
        }


        // Speicherfarm: Konfiguration ist Installateur-/Admin-Sache (Admin / jsonConfig).
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

    // Energiefluss-Schnellsteuerung: optionaler Readback (Status/Setpoint)
    // Der Client ruft diese Route z.B. beim Öffnen des Modals auf, um aktuelle Werte zu sehen.
    // Es werden ausschließlich die in vis.flowSlots.*.ctrl konfigurierten Read-IDs gelesen.
    app.get('/api/flow/qc/read', requireAuth, async (req, res) => {
      try {
        const kindRaw = String((req.query && req.query.kind) || '').trim().toLowerCase();
        const idx = Math.max(1, Math.round(Number((req.query && req.query.idx) || 0)));
        const kind = kindRaw.startsWith('prod') ? 'producers' : 'consumers';
        if (idx < 1 || idx > 10) return res.status(400).json({ ok: false, error: 'bad request' });

        const vis = (this.config && this.config.vis && typeof this.config.vis === 'object') ? this.config.vis : {};
        const fs = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
        const arr = Array.isArray(fs[kind]) ? fs[kind] : [];
        const slot = (arr[idx - 1] && typeof arr[idx - 1] === 'object') ? arr[idx - 1] : {};
        const ctrl = (slot.ctrl && typeof slot.ctrl === 'object') ? slot.ctrl : {};

        const swId = String(ctrl.switchReadId || '').trim();
        const spId = String(ctrl.setpointReadId || '').trim();

        // Optional SG-Ready status (2 relays)
        const sgAR = String(ctrl.sgReadyAReadId || ctrl.sgReady1ReadId || '').trim();
        const sgBR = String(ctrl.sgReadyBReadId || ctrl.sgReady2ReadId || '').trim();

        const out = { ok: true, switch: null, setpoint: null, ts: Date.now() };

        // Read SG-Ready relays first (if available) so we can derive a sensible switch value even when
        // no dedicated switchReadId is configured.
        if (sgAR) {
          try {
            const s = await this.getForeignStateAsync(sgAR);
            out.sgReady = out.sgReady || {};
            out.sgReady.a = s && s.val !== undefined ? s.val : null;
          } catch (_e) {
            out.sgReady = out.sgReady || {};
            out.sgReady.a = null;
          }
        }
        if (sgBR) {
          try {
            const s = await this.getForeignStateAsync(sgBR);
            out.sgReady = out.sgReady || {};
            out.sgReady.b = s && s.val !== undefined ? s.val : null;
          } catch (_e) {
            out.sgReady = out.sgReady || {};
            out.sgReady.b = null;
          }
        }

        if (swId) {
          try {
            const s = await this.getForeignStateAsync(swId);
            out.switch = s && s.val !== undefined ? s.val : null;
          } catch (_e) {
            out.switch = null;
          }
        } else if (out.sgReady && out.sgReady.a !== undefined) {
          // Derive on/off from relay A (common SG-Ready mapping)
          out.switch = out.sgReady.a;
        }
        if (spId) {
          try {
            const s = await this.getForeignStateAsync(spId);
            out.setpoint = s && s.val !== undefined ? s.val : null;
          } catch (_e) {
            out.setpoint = null;
          }
        }

        // Optional: thermal override info for consumers (boost/manual-hold).
        try {
          const cfg = this.config || {};
          if (cfg.enableThermalControl && kind === 'consumers') {
            const idLocal = `c${idx}`;
            const ovAll = (this._thermalOverrides && typeof this._thermalOverrides === 'object') ? this._thermalOverrides : {};
            const ov = (ovAll[idLocal] && typeof ovAll[idLocal] === 'object') ? ovAll[idLocal] : {};
            const now = Date.now();
            const boostUntil = Number(ov.boostUntilMs || 0);
            const manualUntil = Number(ov.manualUntilMs || 0);
            out.boostUntil = (Number.isFinite(boostUntil) && boostUntil > 0) ? boostUntil : 0;
            out.boostActive = out.boostUntil > now;
            out.boostRemainingMin = out.boostActive ? Math.max(0, Math.ceil((out.boostUntil - now) / 60000)) : 0;
            out.manualUntil = (Number.isFinite(manualUntil) && manualUntil > 0) ? manualUntil : 0;
            out.manualActive = out.manualUntil > now;
          }
        } catch (_e) {
          // ignore
        }

        
        // Optional: Thermik – User-Mode + Regelung (lokale States).
        try {
          const cfg = this.config || {};
          if (cfg.enableThermalControl && kind === 'consumers') {
            const t = (cfg.thermal && typeof cfg.thermal === 'object') ? cfg.thermal : {};
            const tlist = Array.isArray(t.devices) ? t.devices : [];
            let dev = null;
            // try index position first, otherwise search by slot
            try {
              if (tlist[idx - 1] && typeof tlist[idx - 1] === 'object') {
                const s = Math.round(Number(tlist[idx - 1].slot ?? tlist[idx - 1].consumerSlot ?? idx));
                if (s === idx) dev = tlist[idx - 1];
              }
            } catch (_e) {}
            if (!dev) dev = tlist.find(r => r && Math.round(Number(r.slot ?? r.consumerSlot ?? 0)) === idx) || null;

            if (dev) {
              const cfgEnabled = (typeof dev.enabled === 'boolean') ? dev.enabled : false;
              const modeRaw = String(dev.mode || 'pvAuto').trim().toLowerCase();
              const cfgMode = (modeRaw === 'manual' || modeRaw === 'off') ? modeRaw : 'pvAuto';

              // read user states (persisted)
              let userEnabled = true;
              let userMode = 'inherit';
              try {
                const s = await this.getStateAsync(`thermal.user.c${idx}.regEnabled`);
                if (s && s.val !== undefined && s.val !== null) userEnabled = !!s.val;
              } catch (_e) {}
              try {
                const s = await this.getStateAsync(`thermal.user.c${idx}.mode`);
                if (s && s.val !== undefined && s.val !== null) userMode = String(s.val || '').trim() || 'inherit';
              } catch (_e) {}

              const normMode = (m) => {
                const s = String(m || '').trim().toLowerCase();
                if (!s || s === 'inherit' || s === 'system') return 'inherit';
                if (s === 'auto' || s === 'pvauto' || s === 'pv') return 'pvAuto';
                if (s === 'manual' || s === 'manuell') return 'manual';
                if (s === 'off' || s === 'aus' || s === '0') return 'off';
                return 'inherit';
              };
              userMode = normMode(userMode);

              const effectiveEnabled = !!cfgEnabled && !!userEnabled;
              const effectiveMode = (userMode !== 'inherit') ? userMode : cfgMode;

              out.thermal = {
                available: true,
                cfgEnabled: !!cfgEnabled,
                cfgMode,
                userEnabled: !!userEnabled,
                userMode,
                effectiveEnabled,
                effectiveMode,
                modes: [
                  { value: 'inherit', label: 'System' },
                  { value: 'pvAuto', label: 'Auto (PV)' },
                  { value: 'manual', label: 'Manuell' },
                  { value: 'off', label: 'Aus' },
                ],
              };
            }
          }
        } catch (_e) {
          // ignore
        }

return res.json(out);
      } catch (e) {
        try { this.log.warn('flow qc read error: ' + e.message); } catch (_e) {}
        return res.status(500).json({ ok: false, error: 'internal error' });
      }
    });

    // Relaissteuerung (manuell): Status/Readback (für VIS)
    app.get('/api/relay/summary', requireAuth, async (req, res) => {
      try {
        const cfg = this.config || {};
        if (!cfg.enableRelayControl) return res.json({ ok: true, configured: 0, on: 0, relays: [] });

        const r = (cfg.relay && typeof cfg.relay === 'object') ? cfg.relay : {};
        const list = Array.isArray(r.relays) ? r.relays : [];
        const out = [];
        let configured = 0;
        let on = 0;

        for (let i = 0; i < list.length; i++) {
          const it = list[i] || {};
          const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
          const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : true;
          const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
          if (!enabled || !showInLive) continue;

          const writeId = String(it.writeId || it.writeObjectId || '').trim();
          if (!writeId) continue;

          configured++;

          const type = (String(it.type || '').toLowerCase() === 'boolean' || String(it.type || '').toLowerCase() === 'bool' || String(it.type || '').toLowerCase() === 'switch') ? 'boolean' : 'number';
          const readId = String(it.readId || it.readObjectId || '').trim();
          const id = readId || writeId;

          let val = null;
          try {
            const st = await this.getForeignStateAsync(id);
            val = st && st.val !== undefined ? st.val : null;
          } catch (_e) { val = null; }

          const invert = (typeof it.invert === 'boolean') ? !!it.invert : false;
          let active = false;
          if (type === 'boolean') {
            let b = !!val;
            if (invert) b = !b;
            active = b;
          } else {
            let n = Number(val);
            if (!Number.isFinite(n)) n = 0;
            if (invert) n = -n;
            active = Math.abs(n) > 1e-9;
          }
          if (active) on++;

          out.push({ idx, active });
        }

        out.sort((a, b) => a.idx - b.idx);
        return res.json({ ok: true, configured, on, relays: out });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    });

    app.get('/api/relay/snapshot', requireAuth, async (req, res) => {
      try {
        const cfg = this.config || {};
        if (!cfg.enableRelayControl) return res.json({ ok: true, relays: [] });

        const r = (cfg.relay && typeof cfg.relay === 'object') ? cfg.relay : {};
        const list = Array.isArray(r.relays) ? r.relays : [];
        const out = [];
        const used = new Set();

        for (let i = 0; i < list.length; i++) {
          const it = list[i] || {};
          const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
          if (used.has(idx)) continue;
          used.add(idx);

          const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : true;
          const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
          const name = String(it.name || '').trim() || `Ausgang ${idx}`;
          const type = (String(it.type || '').toLowerCase() === 'boolean' || String(it.type || '').toLowerCase() === 'bool' || String(it.type || '').toLowerCase() === 'switch') ? 'boolean' : 'number';

          const writeId = String(it.writeId || it.writeObjectId || '').trim();
          const readId = String(it.readId || it.readObjectId || '').trim();
          const configured = !!writeId;

          const userCanToggle = (typeof it.userCanToggle === 'boolean') ? !!it.userCanToggle : true;
          const userCanSetValue = (typeof it.userCanSetValue === 'boolean') ? !!it.userCanSetValue : true;

          let val = null;
          let ts = 0;
          let ack = null;

          if (enabled && showInLive && configured) {
            const id = readId || writeId;
            try {
              const st = await this.getForeignStateAsync(id);
              if (st) {
                val = st.val;
                ts = (st.ts || 0);
                ack = (st.ack !== undefined ? !!st.ack : null);
              }
            } catch (_e) {
              // ignore
            }
          }

          // Apply invert for display
          const invert = (typeof it.invert === 'boolean') ? !!it.invert : false;
          if (type === 'boolean' && val !== null) {
            let b = !!val;
            if (invert) b = !b;
            val = b;
          } else if (type === 'number' && val !== null) {
            let n = Number(val);
            if (!Number.isFinite(n)) n = 0;
            if (invert) n = -n;
            val = n;
          }

          const min = Number.isFinite(Number(it.min)) ? Number(it.min) : null;
          const max = Number.isFinite(Number(it.max)) ? Number(it.max) : null;
          const step = Number.isFinite(Number(it.step)) ? Number(it.step) : null;
          const unit = String(it.unit || '').trim();

          out.push({ idx, name, type, enabled, showInLive, configured, userCanToggle, userCanSetValue, val, ts, ack, min, max, step, unit });
        }

        out.sort((a, b) => a.idx - b.idx);
        return res.json({ ok: true, relays: out });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    });

    // BHKW Snapshot für VIS (Schnellsteuerung)
    app.get('/api/bhkw/snapshot', requireAuth, async (req, res) => {
      try {
        const cfg = this.config || {};
        if (!cfg.enableBhkwControl) return res.json({ ok: true, devices: [] });

        const b = (cfg.bhkw && typeof cfg.bhkw === 'object') ? cfg.bhkw : {};
        const list = Array.isArray(b.devices) ? b.devices : [];

        const out = [];
        const used = new Set();

        for (let i = 0; i < list.length; i++) {
          const it = list[i] || {};
          const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
          if (used.has(idx)) continue;
          used.add(idx);

          const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : false;
          const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
          const userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : true;

          const name = String(it.name || '').trim() || `BHKW ${idx}`;

          const startId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
          const stopId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
          const runId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
          const pwrId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

          const configured = !!(startId && stopId);

          let running = null;
          let powerW = null;
          let socPct = null;
          let status = null;
          let reason = null;
          let mode = null;

          if (enabled && configured) {
            try { const st = await this.getStateAsync(`bhkw.devices.b${idx}.running`); if (st) running = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`bhkw.devices.b${idx}.powerW`); if (st) powerW = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`bhkw.devices.b${idx}.socPct`); if (st) socPct = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`bhkw.devices.b${idx}.status`); if (st) status = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`bhkw.devices.b${idx}.reason`); if (st) reason = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`bhkw.user.b${idx}.mode`); if (st) mode = st.val; } catch (_e) {}
          }

          out.push({
            idx, name,
            enabled, showInLive, userCanControl,
            configured,
            hasRunning: !!runId, hasPower: !!pwrId,
            running: (running === null || running === undefined) ? null : !!running,
            powerW: (powerW === null || powerW === undefined) ? null : Number(powerW),
            socPct: (socPct === null || socPct === undefined) ? null : Number(socPct),
            status: (status === null || status === undefined) ? null : String(status),
            reason: (reason === null || reason === undefined) ? null : String(reason),
            mode: (mode === null || mode === undefined) ? null : String(mode),
          });
        }

        out.sort((a, b) => a.idx - b.idx);
        return res.json({ ok: true, devices: out });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    });

    // Generator Snapshot für VIS (Schnellsteuerung)
    app.get('/api/generator/snapshot', requireAuth, async (req, res) => {
      try {
        const cfg = this.config || {};
        if (!cfg.enableGeneratorControl) return res.json({ ok: true, devices: [] });

        const g = (cfg.generator && typeof cfg.generator === 'object') ? cfg.generator : {};
        const list = Array.isArray(g.devices) ? g.devices : [];

        const out = [];
        const used = new Set();

        for (let i = 0; i < list.length; i++) {
          const it = list[i] || {};
          const idx = Math.max(1, Math.min(10, Math.round(Number(it.idx ?? it.index ?? (i + 1)) || (i + 1))));
          if (used.has(idx)) continue;
          used.add(idx);

          const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : false;
          const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
          const userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : true;

          const name = String(it.name || '').trim() || `Generator ${idx}`;

          const startId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
          const stopId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
          const runId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
          const pwrId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

          const configured = !!(startId && stopId);

          let running = null;
          let powerW = null;
          let socPct = null;
          let status = null;
          let reason = null;
          let mode = null;

          if (enabled && configured) {
            try { const st = await this.getStateAsync(`generator.devices.g${idx}.running`); if (st) running = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`generator.devices.g${idx}.powerW`); if (st) powerW = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`generator.devices.g${idx}.socPct`); if (st) socPct = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`generator.devices.g${idx}.status`); if (st) status = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`generator.devices.g${idx}.reason`); if (st) reason = st.val; } catch (_e) {}
            try { const st = await this.getStateAsync(`generator.user.g${idx}.mode`); if (st) mode = st.val; } catch (_e) {}
          }

          out.push({
            idx, name,
            enabled, showInLive, userCanControl,
            configured,
            hasRunning: !!runId, hasPower: !!pwrId,
            running: (running === null || running === undefined) ? null : !!running,
            powerW: (powerW === null || powerW === undefined) ? null : Number(powerW),
            socPct: (socPct === null || socPct === undefined) ? null : Number(socPct),
            status: (status === null || status === undefined) ? null : String(status),
            reason: (reason === null || reason === undefined) ? null : String(reason),
            mode: (mode === null || mode === undefined) ? null : String(mode),
          });
        }

        out.sort((a, b) => a.idx - b.idx);
        return res.json({ ok: true, devices: out });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
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



  prepareFlowSlots(flowSlotsCfg) {
    try {
      const dps = (this.config && this.config.datapoints) || {};
      const out = [];

      const counts = { consumers: 10, producers: 5 };
      for (const kind of Object.keys(counts)) {
        const count = counts[kind] || 0;
        for (let i = 1; i <= count; i++) {
          const dpKey = kind === 'consumers' ? `consumer${i}Power` : `producer${i}Power`;
          const objectId = String(dps[dpKey] || '').trim();
          if (!objectId) continue;
          if (objectId.startsWith(this.namespace + '.')) continue;
          out.push({ objectId, stateKey: dpKey });
        }
      }

      // Backward compatibility: if objectIds were stored directly inside flowSlots
      if (flowSlotsCfg && typeof flowSlotsCfg === 'object') {
        for (const kind of ['consumers', 'producers']) {
          const list = Array.isArray(flowSlotsCfg[kind]) ? flowSlotsCfg[kind] : [];
          for (const slot of list) {
            const objectId = String(slot && slot.objectId ? slot.objectId : '').trim();
            const stateKey = String(slot && slot.stateKey ? slot.stateKey : (slot && slot.dpKey ? slot.dpKey : '')).trim();
            if (!objectId || !stateKey) continue;
            if (objectId.startsWith(this.namespace + '.')) continue;
            if (!out.some(x => x.objectId === objectId && x.stateKey === stateKey)) {
              out.push({ objectId, stateKey });
            }
          }
        }
      }

      return out;
    } catch (_e) {
      return [];
    }
  }
  async subscribeConfiguredStates() {
    const dps = (this.config && this.config.datapoints) || {};
    const settings = (this.config && this.config.settings) || {};
    const installer = (this.config && this.config.installer) || {};
        const namespace = this.namespace + '.';
    const settingsLocalKeys = ['notifyEnabled','email','dynamicTariff','storagePower','price','priority','tariffMode','evcsMaxPower','evcsCount'];
    const storageFarmLocalKeys = ['enabled','mode','configJson','groupsJson','totalSoc','totalChargePowerW','totalDischargePowerW','storagesOnline','storagesTotal','storagesStatusJson'];
    // Weitere lokale States, die in der VIS angezeigt werden sollen (ohne Admin-Mapping)
    // Wichtig: Diese Keys müssen auch dann funktionieren, wenn sie NICHT im Admin unter
    // "Datenpunkte" gemappt wurden. Daher wird im Subscribe-Loop unten auf die lokalen
    // Adapter-States (namespace + key) zurückgefallen.
    const localUiKeys = ['tarif.statusText','tarif.state'];
    const keys = [
      ...Object.keys(dps),
      // always include built-in local settings keys so UI keeps values on reload
      ...settingsLocalKeys.map(k => 'settings.' + k),
      ...storageFarmLocalKeys.map(k => 'storageFarm.' + k),
      ...localUiKeys,
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

      // Additional local UI keys (e.g. TarifVis output) should also work without Admin mapping.
      if (!id && localUiKeys.includes(key)) id = namespace + key;

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

    // --- Energiefluss‑Monitor: optionale Verbraucher/Erzeuger ---
    // Diese Slots sind frei konfigurierbar (Object IDs) und sollen in der VIS als
    // eigene Werte (flow.consumerXPower / flow.producerXPower) erscheinen.
    // Dafür abonnieren wir die gemappten IDs und spiegeln sie in die internen stateKeys.
    try {
      const flowSlots = this.prepareFlowSlots((this.config && this.config.flowSlots) || {});
      const map = {};
      const allSlots = []
        .concat(flowSlots && flowSlots.consumers ? flowSlots.consumers : [])
        .concat(flowSlots && flowSlots.producers ? flowSlots.producers : [])
        .filter(s => s && typeof s.objectId === 'string' && s.objectId.trim().length > 0);

      for (const slot of allSlots) {
        const id = slot.objectId.trim();
        map[id] = slot.stateKey;

        // subscribe to foreign state
        this.subscribeForeignStates(id);

        // prime initial value
        try {
          const st = await this.getForeignStateAsync(id);
          if (st && st.val !== undefined) {
            this.updateValue(slot.stateKey, st.val, st.ts);
          }
        } catch (e) {
          this.log.warn(`Cannot read initial flow slot state for ${slot.stateKey} (${id}): ${e.message}`);
        }
      }

      this.flowIdToKey = map;
    } catch (e) {
      this.flowIdToKey = this.flowIdToKey || {};
      this.log.warn(`subscribeConfiguredStates: flowSlots subscribe failed: ${e.message}`);
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
    if (this.flowIdToKey && id && this.flowIdToKey[id]) return this.flowIdToKey[id];
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
    const prefT = this.namespace + '.tarif.';
    const prefPS = this.namespace + '.peakShaving.';
    const prefSP = this.namespace + '.speicher.';
    const prefTH = this.namespace + '.thermal.';
    const prefTR = this.namespace + '.threshold.';
    const prefGC = this.namespace + '.gridConstraints.';
    if (id && id.startsWith(prefS)) return 'settings.' + id.slice(prefS.length);
    if (id && id.startsWith(prefI)) return 'installer.' + id.slice(prefI.length);
    if (id && id.startsWith(prefE)) return 'evcs.' + id.slice(prefE.length);
    if (id && id.startsWith(prefCM)) return 'chargingManagement.' + id.slice(prefCM.length);
    if (id && id.startsWith(prefT)) return 'tarif.' + id.slice(prefT.length);
    if (id && id.startsWith(prefPS)) return 'peakShaving.' + id.slice(prefPS.length);
    if (id && id.startsWith(prefSP)) return 'speicher.' + id.slice(prefSP.length);
    if (id && id.startsWith(prefTH)) return 'thermal.' + id.slice(prefTH.length);
    if (id && id.startsWith(prefTR)) return 'threshold.' + id.slice(prefTR.length);
    if (id && id.startsWith(prefGC)) return 'gridConstraints.' + id.slice(prefGC.length);
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

  // --- Historie / Influx: canonical export states (no extra mapping required) ---
  startHistorieExportTimer() {
    try {
      const hcfg = (this.config && this.config.history) || {};

      // Reduce Influx storage pressure: sample at 10‑minute cadence (minimum).
      const DEFAULT_MS = 10 * 60 * 1000;
      const intervalMsRaw = Number(hcfg.exportIntervalMs || hcfg.intervalMs);
      let intervalMs = Number.isFinite(intervalMsRaw) ? Math.round(intervalMsRaw) : DEFAULT_MS;
      // Clamp to [10 min .. 60 min] to avoid runaway write volumes.
      intervalMs = Math.max(DEFAULT_MS, Math.min(60 * 60 * 1000, intervalMs));

      // Clear previous timers
      if (this._nwHistorieTimer) {
        try { clearInterval(this._nwHistorieTimer); } catch (_e) {}
        this._nwHistorieTimer = null;
      }
      if (this._nwHistorieTimerOnce) {
        try { clearTimeout(this._nwHistorieTimerOnce); } catch (_e) {}
        this._nwHistorieTimerOnce = null;
      }

      const tick = () => {
        this.updateHistorieExportStates('timer').catch(() => {});
      };

      // Align to interval boundaries for cleaner/consistent series timestamps
      const now = Date.now();
      const next = Math.ceil(now / intervalMs) * intervalMs;
      let delay = Math.max(0, next - now);
      // Avoid immediate double-write (startup already writes once)
      if (delay < 1000) delay += intervalMs;

      this._nwHistorieTimerOnce = setTimeout(() => {
        this._nwHistorieTimerOnce = null;
        tick();
        this._nwHistorieTimer = setInterval(tick, intervalMs);
      }, delay);
    } catch (_e) {}
  }

  async ensureHistorieExportStates() {
    try { await this._nwDetectInfluxInstance(); } catch (_e) {}
    const inst = this._nwGetHistoryInstance();
    const enableInfluxCustom = true; // user default: always use InfluxDB

    const ensureChannel = async (id, name) => {
      await this.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
      try { await this.extendObjectAsync(id, { common: { name } }); } catch (_e) {}
    };

    const ensureState = async (id, name, role, unit, type = 'number') => {
      await this.setObjectNotExistsAsync(id, {
        type: 'state',
        common: {
          name,
          type,
          role: role || 'value',
          read: true,
          write: false,
          unit: unit || undefined
        },
        native: {}
      });
      try { await this.extendObjectAsync(id, { common: { name, role: role || 'value', unit: unit || undefined } }); } catch (_e) {}
      if (enableInfluxCustom) await this._nwEnsureInfluxCustom(id, inst);
    };

    await ensureChannel('historie', 'Historie (Influx)');
    await ensureChannel('historie.core', 'Kernwerte');

    await ensureChannel('historie.core.grid', 'Netz');
    await ensureState('historie.core.grid.buyW', 'Netzbezug', 'value.power', 'W');
    await ensureState('historie.core.grid.sellW', 'Netzeinspeisung', 'value.power', 'W');
    await ensureState('historie.core.grid.netW', 'Netz (Saldo)', 'value.power', 'W');

    await ensureChannel('historie.core.building', 'Gebäude');
    await ensureState('historie.core.building.loadTotalW', 'Verbrauch Gebäude (gesamt)', 'value.power', 'W');
    await ensureState('historie.core.building.loadRestW', 'Verbrauch Gebäude (Rest, ohne EV/Extras)', 'value.power', 'W');

    await ensureChannel('historie.core.pv', 'PV');
    await ensureState('historie.core.pv.totalW', 'PV-Erzeugung (gesamt)', 'value.power', 'W');

    await ensureChannel('historie.core.storage', 'Speicher');
    await ensureState('historie.core.storage.chargeW', 'Speicherladung', 'value.power', 'W');
    await ensureState('historie.core.storage.dischargeW', 'Speicherentladung', 'value.power', 'W');
    await ensureState('historie.core.storage.socPct', 'SoC', 'value.battery', '%');

    await ensureChannel('historie.core.ev', 'E-Mobilität');
    await ensureState('historie.core.ev.totalW', 'E-Mobilität (gesamt)', 'value.power', 'W');

    // EVCS per Ladepunkt (für Abrechnung/Detailanalyse)
    // Diese States werden aus den internen EVCS-Leistungswerten befüllt und
    // (optional) automatisch für InfluxDB aktiviert.
    const evcsCount = Number(this.evcsCount || 0);
    if (Number.isFinite(evcsCount) && evcsCount > 0) {
      await ensureChannel('historie.evcs', 'EVCS (Ladepunkte)');
      for (let i = 1; i <= evcsCount; i++) {
        await ensureChannel(`historie.evcs.lp${i}`, `Ladepunkt ${i}`);
        await ensureState(`historie.evcs.lp${i}.powerW`, `Ladepunkt ${i} Leistung`, 'value.power', 'W');
      }
    }

    // Dynamic: optional consumers/producers from Energiefluss-Monitor
    const vis = (this.config && this.config.vis) || {};
    const fs = (vis && vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
    const dps = (this.config && this.config.datapoints) || {};

    await ensureChannel('historie.consumers', 'Verbraucher (Energiefluss)');
    await ensureChannel('historie.producers', 'Erzeuger (Energiefluss)');

    const MAX_CONSUMERS = 10;
    const MAX_PRODUCERS = 5;

    for (let i = 1; i <= MAX_CONSUMERS; i++) {
      const dpKey = `consumer${i}Power`;
      const mapped = String(dps[dpKey] || '').trim();
      if (!mapped) continue;
      const slotCfg = (Array.isArray(fs.consumers) && fs.consumers[i - 1]) ? fs.consumers[i - 1] : null;
      const label = (slotCfg && slotCfg.name) ? String(slotCfg.name) : `Verbraucher ${i}`;
      await ensureChannel(`historie.consumers.c${i}`, label);
      await ensureState(`historie.consumers.c${i}.powerW`, `${label} Leistung`, 'value.power', 'W');
    }

    for (let i = 1; i <= MAX_PRODUCERS; i++) {
      const dpKey = `producer${i}Power`;
      const mapped = String(dps[dpKey] || '').trim();
      if (!mapped) continue;
      const slotCfg = (Array.isArray(fs.producers) && fs.producers[i - 1]) ? fs.producers[i - 1] : null;
      const label = (slotCfg && slotCfg.name) ? String(slotCfg.name) : `Erzeuger ${i}`;
      await ensureChannel(`historie.producers.p${i}`, label);
      await ensureState(`historie.producers.p${i}.powerW`, `${label} Leistung`, 'value.power', 'W');
    }
  }

  async _nwEnsureInfluxCustom(localId, inst) {
    try {
      const instance = String(inst || '').trim();
      if (!instance) return;
      const obj = await this.getObjectAsync(localId);
      if (!obj || !obj.common) return;
      const custom = (obj.common.custom && typeof obj.common.custom === 'object') ? obj.common.custom : {};
      const cur = (custom[instance] && typeof custom[instance] === 'object') ? custom[instance] : {};

      // For Historie export states we want a predictable time series (10‑min cadence),
      // so we log *per write* (changesOnly=false).
      const desired = {
        enabled: true,
        changesOnly: false
      };

      const alreadyOk = (cur.enabled === true && cur.changesOnly === desired.changesOnly);
      if (alreadyOk) return;

      custom[instance] = Object.assign({}, cur, desired);

      await this.extendObjectAsync(localId, { common: { custom } });
    } catch (_e) {}
  }

  _nwGetNumberFromCache(key) {
    try {
      const rec = this.stateCache && this.stateCache[key];
      if (!rec) return null;
      const n = Number(rec.value);
      return Number.isFinite(n) ? n : null;
    } catch (_e) {
      return null;
    }
  }

  _nwSetHistorieValue(localId, val, ts, tolAbs = 1) {
    try {
      const n = Number(val);
      if (!Number.isFinite(n)) return;
      if (!this._nwHistorieLast) this._nwHistorieLast = {};
      const last = this._nwHistorieLast[localId];
      const tol = Number.isFinite(Number(tolAbs)) ? Math.max(0, Number(tolAbs)) : 0;
      if (Number.isFinite(last) && Math.abs(last - n) < tol) return;
      this._nwHistorieLast[localId] = n;
      this.setLocalStateWithCache(localId, n, ts);
    } catch (_e) {}
  }

  async updateHistorieExportStates(reason = 'timer') {
    const now = Date.now();

    const gridBuyW = this._nwGetNumberFromCache('gridBuyPower');
    const gridSellW = this._nwGetNumberFromCache('gridSellPower');
    const pvW = this._nwGetNumberFromCache('pvPower');
    const loadW = this._nwGetNumberFromCache('consumptionTotal');
    const chgW = this._nwGetNumberFromCache('storageChargePower');
    const dchgW = this._nwGetNumberFromCache('storageDischargePower');
    const soc = this._nwGetNumberFromCache('storageSoc');
    const evW = this._nwGetNumberFromCache('evcs.totalPowerW');

    const gridBuy = Number.isFinite(gridBuyW) ? Math.max(0, gridBuyW) : 0;
    const gridSell = Number.isFinite(gridSellW) ? Math.max(0, gridSellW) : 0;
    const gridNet = gridBuy - gridSell;

    let pvTotal = Number.isFinite(pvW) ? Math.max(0, pvW) : null;
    let loadTotal = Number.isFinite(loadW) ? Math.max(0, loadW) : null;
    const chg = Number.isFinite(chgW) ? Math.max(0, chgW) : 0;
    const dchg = Number.isFinite(dchgW) ? Math.max(0, dchgW) : 0;
    const evAbs = Number.isFinite(evW) ? Math.abs(evW) : 0;

    if (pvTotal === null) {
      let sum = 0;
      for (let i = 1; i <= 5; i++) {
        const v = this._nwGetNumberFromCache(`producer${i}Power`);
        if (Number.isFinite(v)) sum += Math.max(0, Math.abs(v));
      }
      pvTotal = sum;
    }

    if (loadTotal === null) {
      const pvUse = pvTotal || 0;
      loadTotal = Math.max(0, pvUse + gridBuy + dchg - gridSell - chg);
    }

    // Energiefluss-Display (Rest) = Gesamtverbrauch - EV - optionale Verbraucher
    let extrasConsumersSum = 0;
    for (let i = 1; i <= 10; i++) {
      const v = this._nwGetNumberFromCache(`consumer${i}Power`);
      if (!Number.isFinite(v)) continue;
      extrasConsumersSum += Math.max(0, Math.abs(v));
    }
    const loadRest = Math.max(0, (loadTotal || 0) - evAbs - extrasConsumersSum);

    // Core series
    this._nwSetHistorieValue('historie.core.grid.buyW', gridBuy, now, 0);
    this._nwSetHistorieValue('historie.core.grid.sellW', gridSell, now, 0);
    this._nwSetHistorieValue('historie.core.grid.netW', gridNet, now, 0);

    this._nwSetHistorieValue('historie.core.pv.totalW', pvTotal || 0, now, 0);
    this._nwSetHistorieValue('historie.core.building.loadTotalW', loadTotal || 0, now, 0);
    this._nwSetHistorieValue('historie.core.building.loadRestW', loadRest || 0, now, 0);

    this._nwSetHistorieValue('historie.core.storage.chargeW', chg, now, 0);
    this._nwSetHistorieValue('historie.core.storage.dischargeW', dchg, now, 0);
    if (Number.isFinite(soc)) this._nwSetHistorieValue('historie.core.storage.socPct', soc, now, 0);

    this._nwSetHistorieValue('historie.core.ev.totalW', evAbs, now, 0);

    // EVCS per Ladepunkt (Leistung) – für detaillierte Abrechnung
    const evcsCount = Number(this.evcsCount || 0);
    if (Number.isFinite(evcsCount) && evcsCount > 0) {
      for (let i = 1; i <= evcsCount; i++) {
        const v = this._nwGetNumberFromCache(`evcs.${i}.powerW`);
        if (Number.isFinite(v)) this._nwSetHistorieValue(`historie.evcs.lp${i}.powerW`, Math.max(0, Math.abs(v)), now, 0);
      }
    }

    // Dynamic slots (only if the corresponding cache entries exist)
    for (let i = 1; i <= 10; i++) {
      const v = this._nwGetNumberFromCache(`consumer${i}Power`);
      if (Number.isFinite(v)) this._nwSetHistorieValue(`historie.consumers.c${i}.powerW`, Math.abs(v), now, 0);
    }
    for (let i = 1; i <= 5; i++) {
      const v = this._nwGetNumberFromCache(`producer${i}Power`);
      if (Number.isFinite(v)) this._nwSetHistorieValue(`historie.producers.p${i}.powerW`, Math.abs(v), now, 0);
    }
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


  // --- Energy totals fallback: derive kWh values from history (InfluxDB) when no kWh counters are mapped ---
  _nwTrimId(v) {
    if (typeof v !== 'string') return '';
    const s = v.trim();
    return s ? s : '';
  }

  async _nwDetectInfluxInstance() {
    try {
      // If user did not specify a history instance, try to detect an installed influxdb.X instance.
      if (this._nwTrimId((this.config && this.config.history && this.config.history.instance) || '')) return this._nwTrimId(this.config.history.instance);
      if (this._nwTrimId(this._nwDetectedInfluxInstance)) return this._nwTrimId(this._nwDetectedInfluxInstance);
      for (let i = 0; i <= 9; i++) {
        const id = `system.adapter.influxdb.${i}`;
        const obj = await this.getForeignObjectAsync(id);
        if (obj && obj.common) {
          this._nwDetectedInfluxInstance = `influxdb.${i}`;
          return this._nwDetectedInfluxInstance;
        }
      }
    } catch (_e) {}
    return null;
  }

  _nwGetHistoryInstance() {
    const hcfg = (this.config && this.config.history) || {};
    const inst = this._nwTrimId(hcfg.instance) || this._nwTrimId(this._nwDetectedInfluxInstance) || 'influxdb.0';
    return inst;
  }

  _nwGetCanonicalHistorieId(legacyKey) {
    const k = String(legacyKey || '').trim();
    if (!k) return '';
    const ns = this.namespace;
    switch (k) {
      case 'pvPower': return ns + '.historie.core.pv.totalW';
      case 'consumptionTotal': return ns + '.historie.core.building.loadTotalW';
      case 'gridBuyPower': return ns + '.historie.core.grid.buyW';
      case 'gridSellPower': return ns + '.historie.core.grid.sellW';
      case 'storageChargePower': return ns + '.historie.core.storage.chargeW';
      case 'storageDischargePower': return ns + '.historie.core.storage.dischargeW';
      case 'storageSoc': return ns + '.historie.core.storage.socPct';
      case 'evcsPower': return ns + '.historie.core.ev.totalW';
      default: return '';
    }
  }

  _nwGetHistoryDpId(name) {
    const hcfg = (this.config && this.config.history) || {};
    const dp = Object.assign({}, hcfg.datapoints || {}, hcfg.dp || {});
    // History should NOT depend on the live/EMS datapoint mapping.
    // Otherwise users would need to enable Influx logging for *device* datapoints
    // in addition to the canonical nexowatt-vis.0.historie.* states (double mapping).
    //
    // NOTE: Earlier versions allowed overriding the Historie input states via
    // config.history.datapoints. In practice this led to many installations still
    // referencing legacy helper states (e.g. 0_userdata.* / "Leistung_Visu_Historie"),
    // even though the adapter already auto-creates and historizes canonical states
    // under `${this.namespace}.historie.*`.
    //
    // For a predictable, low-maintenance setup we therefore *default* to the canonical
    // adapter states. Explicit mappings are only honored if they also point into the
    // adapter's own historized namespace. (Advanced users can still force any ID by
    // prefixing it with '!'.)
    const canon = this._nwTrimId(this._nwGetCanonicalHistorieId(name));
    const raw = (dp && typeof dp[name] === 'string') ? dp[name].trim() : '';
    const explicitForced = raw.startsWith('!') ? this._nwTrimId(raw.slice(1)) : '';
    if (explicitForced) return explicitForced;

    const explicit = this._nwTrimId(raw);
    const allowExplicit = !!(explicit && explicit.startsWith(`${this.namespace}.historie.`));
    return (allowExplicit ? explicit : canon) || explicit || '';
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
      // dt is in milliseconds:
      //   W * (ms / 3_600_000) = Wh
      //   Wh / 1_000          = kWh
      // => W * ms / 3_600_000_000 = kWh
      kwh += (v * dt) / 3600000000;
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

    // E‑Mobilität Gesamt-kWh (für CO₂‑Berechnung): fallback via Integration der EVCS-Leistung
    // (Nur notwendig, wenn kein externer CO₂‑DP gemappt ist.)
    const needCo2Calc = !this._nwHasMappedDatapoint('co2Savings');
    if (needCo2Calc) {
      const id = this._nwGetHistoryDpId('evcsPower');
      if (id) tasks.push((async () => {
        const stepMs = this._nwChooseStepMs(spanMs, 3500, 5 * 60 * 1000);
        const series = await this._nwGetHistoryAvgSeries(id, startMs, now, stepMs);
        const kwh = this._nwIntegrateKwh(series, now, stepMs, true);
        if (kwh != null) this.updateValue('evEnergyKwh', kwh, now);
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

    // CO₂‑Einsparung (t) – wird automatisch berechnet, wenn kein externer DP gemappt ist.
    // Formel (sauber, ohne Doppelzählung):
    //   PV spart Netzstrom ein: PV_kWh * Netz‑Faktor
    //   E‑Mobilität spart gegenüber Verbrenner: EV_kWh * (Verbrenner‑Faktor − Netz‑Faktor)
    // Ergebnis in Tonnen.
    if (!this._nwHasMappedDatapoint('co2Savings')) {
      const pvKwh = Number(this.stateCache.productionEnergyKwh?.value);
      const evKwh = Number(this.stateCache.evEnergyKwh?.value);

      const cfg = (this.config && this.config.settings) ? this.config.settings : {};
      const gridKgPerKwhRaw = Number(cfg.co2GridKgPerKwh);
      const iceKgPerKwhRaw = Number(cfg.co2IceKgPerKwh);
      const gridKgPerKwh = Number.isFinite(gridKgPerKwhRaw) ? gridKgPerKwhRaw : 0.4;
      const iceKgPerKwh = Number.isFinite(iceKgPerKwhRaw) ? iceKgPerKwhRaw : 0.85;

      const pv = Number.isFinite(pvKwh) ? pvKwh : 0;
      const ev = Number.isFinite(evKwh) ? evKwh : 0;
      const evNetKgPerKwh = Math.max(0, iceKgPerKwh - gridKgPerKwh);
      const totalKg = (pv * gridKgPerKwh) + (ev * evNetKgPerKwh);
      const totalT = totalKg / 1000;

      // nur setzen, wenn plausibel
      if (Number.isFinite(totalT)) {
        this.updateValue('co2Savings', totalT, now);
      }
    }
  }




  updateValue(key, value, ts) {
    // Some devices provide charging/discharging power as signed values
    // (e.g. charging power can be negative). In NexoWatt we treat
    // charge/discharge as positive magnitudes for UI/Historie.
    if (
      typeof value === 'number' &&
      !isNaN(value) &&
      (key === 'storageChargePower' || key === 'storageDischargePower')
    ) {
      value = Math.abs(value);
    }

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
      try { if (this._nwHistorieTimer) clearInterval(this._nwHistorieTimer); } catch (_e) {}
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