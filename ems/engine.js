'use strict';

const { DatapointRegistry } = require('./datapoints');
const { ModuleManager } = require('./module-manager');

function clampNumber(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/**
 * Embedded EMS engine wrapper for nexowatt-vis.
 *
 * Sprint 2.x:
 * - ChargingManagementModule (from nexowatt-multiuse) runs INSIDE the VIS adapter
 * - Per Ladepunkt runtime mode: auto|pv|minpv|boost via chargingManagement.wallboxes.*.userMode
 *
 * Sprint 2.2:
 * - Stationsgruppen (gemeinsame Leistungsgrenze) + Ladepunkt-/Connector-Begriff
 *
 * Sprint 3:
 * - Weitere Multiuse-Module (z.B. Peak Shaving) via ModuleManager
 * - Konfiguration in Admin-UI (jsonConfig) über enablePeakShaving / peakShaving.*
 */
class EmsEngine {
  /**
   * @param {import('@iobroker/adapter-core').AdapterInstance} adapter
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.dp = null;
    this.mm = null;
    this._timer = null;
    this._intervalMs = 1000;

    // derived/internal state ids
    this._gridPowerId = '';
  }

  /**
   * Ensure small internal helper states (derived values) exist.
   */
  async _ensureInternalStates() {
    const a = this.adapter;
    await a.setObjectNotExistsAsync('ems', {
      type: 'channel',
      common: { name: 'EMS (intern)' },
      native: {},
    });

    await a.setObjectNotExistsAsync('ems.gridPowerW', {
      type: 'state',
      common: {
        name: 'Netzleistung (W) (intern, Import + / Export -)',
        type: 'number',
        role: 'value.power',
        read: true,
        write: false,
        unit: 'W',
        def: 0,
      },
      native: {},
    });

    this._gridPowerId = `${a.namespace}.ems.gridPowerW`;
  }

  /**
   * Build a multiuse-compatible charging config from VIS config/table.
   */
  _buildChargingConfig() {
    const adapter = this.adapter;
    const cfg = adapter.config || {};

    // Installer overrides for embedded Charging-Management (Admin-UI: chargingManagement.*)
    const userCm = (cfg.chargingManagement && typeof cfg.chargingManagement === 'object') ? cfg.chargingManagement : {};

    // --- Budget defaults: use configured EVCS max power ---
    const settingsCfg = cfg.settingsConfig || {};
    const ratedKw = Number(settingsCfg.evcsMaxPowerKw || 11);
    const ratedW = Math.round((Number.isFinite(ratedKw) ? ratedKw : 11) * 1000);

    // --- PV surplus source: prefer export power mapping ---
    const dps = cfg.datapoints || {};
    const gridBuyPowerId = (typeof dps.gridBuyPower === 'string' ? dps.gridBuyPower.trim() : '') || '';
    const gridSellPowerId = (typeof dps.gridSellPower === 'string' ? dps.gridSellPower.trim() : '') || '';
    const pvSurplusPowerId = gridSellPowerId;

    // Default net grid power:
    // 1) If buy/sell are mapped, use internal derived state ems.gridPowerW
    // 2) Else (optional) fall back to PeakShaving gridPointPowerId if set in config
    const peakGridPowerId = (cfg.peakShaving && typeof cfg.peakShaving.gridPointPowerId === 'string') ? cfg.peakShaving.gridPointPowerId.trim() : '';
    const defaultGridPowerId = (gridBuyPowerId || gridSellPowerId) ? this._gridPowerId : (peakGridPowerId || '');

    // --- Wallboxes from already normalized evcsList (created in syncSettingsConfigToStates) ---
    const list = Array.isArray(adapter.evcsList) ? adapter.evcsList : [];

    // --- Stationsgruppen (settingsConfig.stationGroups table) ---
    const sgRaw = Array.isArray(settingsCfg.stationGroups) ? settingsCfg.stationGroups : [];
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

    const wallboxes = [];

    // Global electrical default for W<->A conversion inside the embedded module.
    let globalVoltageV = 230;

    for (const wb of list) {
      if (!wb) continue;
      const idx = Number(wb.index);
      if (!Number.isFinite(idx) || idx <= 0) continue;

      // Stable key independent from name (treat each entry as a charge point / connector)
      const key = `lp${idx}`;

      const actualPowerWId = (wb.powerId || '').trim();
      const setCurrentAId = (wb.setCurrentAId || '').trim();
      const setPowerWId = (wb.setPowerWId || '').trim();

      // Online detection: prefer explicit online dp (bool), otherwise statusId
      const statusId = ((wb.onlineId || '').trim()) || ((wb.statusId || '').trim()) || '';

      // Enable DP (optional)
      const enableId = (wb.enableWriteId || '').trim();

      // charger type / meta
      const chargerTypeRaw = String(wb.chargerType || 'ac').trim().toLowerCase();
      const chargerType = (chargerTypeRaw === 'dc') ? 'DC' : 'AC';

      const phases = (Number(wb.phases) === 1) ? 1 : 3;
      const voltageV = (Number.isFinite(Number(wb.voltageV)) && Number(wb.voltageV) > 0) ? Math.round(Number(wb.voltageV)) : 230;
      if (!Number.isFinite(Number(globalVoltageV)) || Number(globalVoltageV) <= 0) globalVoltageV = 230;
      if (globalVoltageV === 230 && voltageV !== 230) globalVoltageV = voltageV;

      const controlPreference = String(wb.controlPreference || 'auto').trim().toLowerCase();
      // multiuse expects controlBasis: auto|currentA|powerW|none
      let controlBasis = 'auto';
      if (controlPreference === 'currenta' || controlPreference === 'a' || controlPreference === 'current') controlBasis = 'currentA';
      else if (controlPreference === 'powerw' || controlPreference === 'w' || controlPreference === 'power') controlBasis = 'powerW';
      else if (controlPreference === 'none' || controlPreference === 'off') controlBasis = 'none';

      const minA = (Number.isFinite(Number(wb.minCurrentA)) ? Number(wb.minCurrentA) : 0);
      const maxA = (Number.isFinite(Number(wb.maxCurrentA)) ? Number(wb.maxCurrentA) : 0);
      const maxPowerW = (Number.isFinite(Number(wb.maxPowerW)) ? Number(wb.maxPowerW) : 0);

      const stepA = (Number.isFinite(Number(wb.stepA)) ? Number(wb.stepA) : 0);
      const stepW = (Number.isFinite(Number(wb.stepW)) ? Number(wb.stepW) : 0);

      // Default mode from Admin table (runtime state can override)
      let userModeDefault = String(wb.userMode || 'auto').trim().toLowerCase();
      if (userModeDefault === 'min+pv') userModeDefault = 'minpv';
      if (!['auto', 'pv', 'minpv', 'boost'].includes(userModeDefault)) userModeDefault = 'auto';

      // Stationsgruppe/Connector Meta (optional)
      const stationKey = (typeof wb.stationKey === 'string' && wb.stationKey.trim()) ? wb.stationKey.trim() : '';
      const connectorNo = (Number.isFinite(Number(wb.connectorNo)) && Number(wb.connectorNo) > 0) ? Math.round(Number(wb.connectorNo)) : 0;
      const allowBoost = (wb.allowBoost !== false);
      const boostTimeoutMin = (Number.isFinite(Number(wb.boostTimeoutMin)) && Number(wb.boostTimeoutMin) > 0) ? Number(wb.boostTimeoutMin) : 0;


      wallboxes.push({
        key,
        name: wb.name || key,
        enabled: true,
        priority: 999,

        chargerType,
        controlBasis,
        phases,

        // Stationsmeta
        ...(stationKey ? { stationKey } : {}),
        ...(connectorNo > 0 ? { connectorNo } : {}),
        ...(allowBoost === false ? { allowBoost: false } : { allowBoost: true }),
        ...(boostTimeoutMin > 0 ? { boostTimeoutMin } : {}),


        // limits
        ...(minA > 0 ? { minA } : {}),
        ...(maxA > 0 ? { maxA } : {}),
        ...(maxPowerW > 0 ? { maxPowerW } : {}),
        ...(stepA > 0 ? { stepA } : {}),
        ...(stepW > 0 ? { stepW } : {}),

        // datapoints
        ...(actualPowerWId ? { actualPowerWId } : {}),
        ...(setCurrentAId ? { setCurrentAId } : {}),
        ...(setPowerWId ? { setPowerWId } : {}),
        ...(enableId ? { enableId } : {}),
        ...(statusId ? { statusId } : {}),

        // admin default for runtime user mode
        userModeDefault,
      });
    }

    // enableChargingManagement only if at least one controllable wallbox exists
    const anyControl = wallboxes.some(w => (w.setCurrentAId || w.setPowerWId));

    const chargingCfg = {
      // Keep consistent with multiuse module
      mode: anyControl ? 'mixed' : 'off',

      // PV-only is handled per-wallbox via runtime mode (pv/minpv). Keep global default off.
      pvSurplusOnly: false,

      // Budget: engine (static+tariff+peak+external; implemented in module)
      totalBudgetMode: 'engine',
      staticMaxChargingPowerW: ratedW,

      // PV surplus input (optional)
      ...(pvSurplusPowerId ? { pvSurplusPowerId } : {}),

      // Provide a default NET grid power id (derived from buy/sell) so minpv/pv logic can work out-of-the-box
      ...(defaultGridPowerId ? { gridPowerId: defaultGridPowerId } : {}),

      // Global electrical defaults
      voltageV: globalVoltageV,
      defaultPhases: 3,

      // Stability defaults (anti-flutter, safe)
      staleTimeoutSec: 15,
      activityThresholdW: 200,
      stopGraceSec: 30,
      sessionKeepSec: 300,

      // Global stepping defaults (per wallbox overrides possible)
      stepA: 0.1,
      stepW: 25,

      // Boost timeouts (minutes). Defaults: AC=300 (5h), DC=60 (1h). 0 = no auto-timeout.
      boostTimeoutMinAc: 300,
      boostTimeoutMinDc: 60,

      // Station groups (optional)
      ...(stationGroups.length ? { stationGroups } : {}),

      // per wallbox list
      wallboxes,
    };


    // Apply selected overrides from Admin-UI (keep safe defaults if empty)
    try {
      const modeOverride = (typeof userCm.mode === 'string') ? userCm.mode.trim() : '';
      if (['off', 'pvSurplus', 'mixed'].includes(modeOverride)) chargingCfg.mode = modeOverride;

      if (typeof userCm.pvSurplusOnly === 'boolean') chargingCfg.pvSurplusOnly = userCm.pvSurplusOnly;

      const bm = (typeof userCm.totalBudgetMode === 'string') ? userCm.totalBudgetMode.trim() : '';
      if (bm) chargingCfg.totalBudgetMode = bm;

      const staticW = Number(userCm.staticMaxChargingPowerW);
      if (Number.isFinite(staticW) && staticW > 0) chargingCfg.staticMaxChargingPowerW = Math.round(staticW);

      const budgetId = (typeof userCm.budgetPowerId === 'string') ? userCm.budgetPowerId.trim() : '';
      if (budgetId) chargingCfg.budgetPowerId = budgetId;

      const gridId = (typeof userCm.gridPowerId === 'string') ? userCm.gridPowerId.trim() : '';
      if (gridId) chargingCfg.gridPowerId = gridId;

      const pvId = (typeof userCm.pvSurplusPowerId === 'string') ? userCm.pvSurplusPowerId.trim() : '';
      if (pvId) chargingCfg.pvSurplusPowerId = pvId;

      const voltageV_ = Number(userCm.voltageV);
      if (Number.isFinite(voltageV_) && voltageV_ >= 50 && voltageV_ <= 1000) chargingCfg.voltageV = Math.round(voltageV_);

      const phases_ = Number(userCm.defaultPhases);
      if (Number.isFinite(phases_) && (phases_ === 1 || phases_ === 3)) chargingCfg.defaultPhases = phases_;

      const stale_ = Number(userCm.staleTimeoutSec);
      if (Number.isFinite(stale_) && stale_ >= 1 && stale_ <= 3600) chargingCfg.staleTimeoutSec = stale_;

      const thr_ = Number(userCm.activityThresholdW);
      if (Number.isFinite(thr_) && thr_ >= 0) chargingCfg.activityThresholdW = Math.round(thr_);

      const sg_ = Number(userCm.stopGraceSec);
      if (Number.isFinite(sg_) && sg_ >= 0 && sg_ <= 3600) chargingCfg.stopGraceSec = sg_;

      const keep_ = Number(userCm.sessionKeepSec);
      if (Number.isFinite(keep_) && keep_ >= 0 && keep_ <= 86400) chargingCfg.sessionKeepSec = keep_;

      const stepA_ = Number(userCm.stepA);
      if (Number.isFinite(stepA_) && stepA_ >= 0) chargingCfg.stepA = stepA_;

      const stepW_ = Number(userCm.stepW);
      if (Number.isFinite(stepW_) && stepW_ >= 0) chargingCfg.stepW = stepW_;

      const dW_ = Number(userCm.maxDeltaWPerTick);
      if (Number.isFinite(dW_) && dW_ >= 0) chargingCfg.maxDeltaWPerTick = dW_;

      const dA_ = Number(userCm.maxDeltaAPerTick);
      if (Number.isFinite(dA_) && dA_ >= 0) chargingCfg.maxDeltaAPerTick = dA_;

      const acMin_ = Number(userCm.acMinPower3pW);
      if (Number.isFinite(acMin_) && acMin_ >= 0) chargingCfg.acMinPower3pW = acMin_;

      if (typeof userCm.pauseWhenPeakShavingActive === 'boolean') chargingCfg.pauseWhenPeakShavingActive = userCm.pauseWhenPeakShavingActive;
      const pb_ = (typeof userCm.pauseBehavior === 'string') ? userCm.pauseBehavior.trim() : '';
      if (pb_) chargingCfg.pauseBehavior = pb_;

      const stationMode_ = (typeof userCm.stationAllocationMode === 'string') ? userCm.stationAllocationMode.trim() : '';
      if (stationMode_) chargingCfg.stationAllocationMode = stationMode_;

      const btAc_ = Number(userCm.boostTimeoutMinAc);
      if (Number.isFinite(btAc_) && btAc_ >= 0) chargingCfg.boostTimeoutMinAc = btAc_;

      const btDc_ = Number(userCm.boostTimeoutMinDc);
      if (Number.isFinite(btDc_) && btDc_ >= 0) chargingCfg.boostTimeoutMinDc = btDc_;
    } catch (_e) {}

    return { anyControl, chargingCfg, stationGroups, stationGroupMap };
  }

  async init() {
    const adapter = this.adapter;

    await this._ensureInternalStates();

    // Scheduler interval from config (Admin UI / jsonConfig)
    const cfgInterval = adapter.config && adapter.config.schedulerIntervalMs;
    this._intervalMs = clampNumber(cfgInterval, 250, 10000, 1000);

    const { anyControl, chargingCfg } = this._buildChargingConfig();

    // Respect Admin toggle (default true if undefined)
    const userWantsCharging = (adapter.config.enableChargingManagement !== false);

    // Inject config for embedded modules
    adapter.config.enableChargingManagement = !!anyControl && !!userWantsCharging;
    adapter.config.chargingManagement = chargingCfg;

    // If PeakShaving is enabled but no gridPointPowerId is set, default to internal derived net grid power
    if (adapter.config.enablePeakShaving) {
      adapter.config.peakShaving = adapter.config.peakShaving || {};
      const gp = typeof adapter.config.peakShaving.gridPointPowerId === 'string' ? adapter.config.peakShaving.gridPointPowerId.trim() : '';
      if (!gp && this._gridPowerId) {
        adapter.config.peakShaving.gridPointPowerId = this._gridPowerId;
      }
    }

    // Datapoint registry (multiuse)
    this.dp = new DatapointRegistry(adapter, []);
    await this.dp.init();

    // Register VIS datapoints needed for derived net grid power
    const dps = (adapter.config && adapter.config.datapoints) ? adapter.config.datapoints : {};
    const gridBuyId = (typeof dps.gridBuyPower === 'string') ? dps.gridBuyPower.trim() : '';
    const gridSellId = (typeof dps.gridSellPower === 'string') ? dps.gridSellPower.trim() : '';

    if (gridBuyId) await this.dp.upsert({ key: 'vis.gridBuyW', objectId: gridBuyId, dataType: 'number', direction: 'in', unit: 'W' });
    if (gridSellId) await this.dp.upsert({ key: 'vis.gridSellW', objectId: gridSellId, dataType: 'number', direction: 'in', unit: 'W' });

    // Map internal net grid power to generic key used by modules as fallback
    if (this._gridPowerId) {
      await this.dp.upsert({ key: 'grid.powerW', objectId: this._gridPowerId, dataType: 'number', direction: 'in', unit: 'W' });
      await this.dp.upsert({ key: 'ems.gridPowerW', objectId: this._gridPowerId, dataType: 'number', direction: 'in', unit: 'W' });
    }

    // Module manager (PeakShaving / Charging / Tarif / optional Storage etc.)
    this.mm = new ModuleManager(adapter, this.dp);
    await this.mm.init();

    // Subscribe to our own states for convenience (Admin/VIS)
    try { adapter.subscribeStates('ems.*'); } catch (_e) {}
    try { adapter.subscribeStates('chargingManagement.*'); } catch (_e) {}
    try { adapter.subscribeStates('peakShaving.*'); } catch (_e) {}
    try { adapter.subscribeStates('tarif.*'); } catch (_e) {}
    try { adapter.subscribeStates('speicher.*'); } catch (_e) {}

    // Start scheduler
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      this.tick().catch(err => {
        try { adapter.log.warn(`[EMS] tick failed: ${err?.message || err}`); } catch (_e) {}
      });
    }, this._intervalMs);

    adapter.log.info(`[EMS] Embedded engine started (interval ${this._intervalMs}ms) — CM=${adapter.config.enableChargingManagement ? 'ON' : 'OFF'} PS=${adapter.config.enablePeakShaving ? 'ON' : 'OFF'}`);
  }

  async tick() {
    if (!this.adapter || !this.dp || !this.mm) return;

    // Derived net grid power (Import + / Export -) from separate buy/sell channels
    try {
      const buyW = this.dp.getNumber('vis.gridBuyW', 0) || 0;
      const sellW = this.dp.getNumber('vis.gridSellW', 0) || 0;
      const netW = Math.round(Number(buyW) - Number(sellW));
      if (this._gridPowerId) {
        try {
          await this.adapter.setStateAsync('ems.gridPowerW', { val: netW, ack: true });
        } catch (_e) {}
        // Update dp cache explicitly (own states might not be subscribed)
        try {
          if (typeof this.dp.handleStateChange === 'function') {
            this.dp.handleStateChange(this._gridPowerId, { val: netW, ack: true, ts: Date.now() });
          }
        } catch (_e2) {}
      }
    } catch (_e) {
      // ignore
    }

    await this.mm.tick();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

module.exports = { EmsEngine };
