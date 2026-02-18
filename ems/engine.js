'use strict';

const { DatapointRegistry } = require('./datapoints');
const { ModuleManager } = require('./module-manager');

function clampNumber(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/**
 * Embedded EMS engine wrapper for nexowatt-ui.
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
   * @param {any} adapter
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.dp = null;
    this.mm = null;
    this._timer = null;
    this._intervalMs = 1000;

    // Tick mutex (Phase 4.0): prevent overlapping async ticks.
    this._tickRunning = false;
    this._tickSkipCount = 0;

    // derived/internal state ids
    this._gridPowerId = '';
    this._gridPowerRawId = '';

    /** @type {number|null} */
    this._gridPowerAvgW = null;
    /** @type {number} */
    this._gridPowerLastTs = 0;
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

    // Core channel for runtime/tick diagnostics (Phase 4.0)
    await a.setObjectNotExistsAsync('ems.core', {
      type: 'channel',
      common: { name: 'EMS Core' },
      native: {},
    });

    await a.setObjectNotExistsAsync('ems.core.tickRunning', {
      type: 'state',
      common: {
        name: 'Tick running',
        type: 'boolean',
        role: 'indicator',
        read: true,
        write: false,
        def: false,
      },
      native: {},
    });

    await a.setObjectNotExistsAsync('ems.core.tickSkipCount', {
      type: 'state',
      common: {
        name: 'Tick skipped (re-entrancy) count',
        type: 'number',
        role: 'value',
        read: true,
        write: false,
        def: 0,
      },
      native: {},
    });

    await a.setObjectNotExistsAsync('ems.core.lastTickStart', {
      type: 'state',
      common: {
        name: 'Last tick start (ts)',
        type: 'number',
        role: 'value.time',
        read: true,
        write: false,
        def: 0,
      },
      native: {},
    });

    await a.setObjectNotExistsAsync('ems.core.lastTickDurationMs', {
      type: 'state',
      common: {
        name: 'Last tick duration (ms)',
        type: 'number',
        role: 'value.interval',
        read: true,
        write: false,
        def: 0,
        unit: 'ms',
      },
      native: {},
    });

    await a.setObjectNotExistsAsync('ems.core.lastTickError', {
      type: 'state',
      common: {
        name: 'Last tick error',
        type: 'string',
        role: 'text',
        read: true,
        write: false,
        def: '',
      },
      native: {},
    });

    // Raw net grid power (Import + / Export -)
    await a.setObjectNotExistsAsync('ems.gridPowerRawW', {
      type: 'state',
      common: {
        name: 'Netzleistung (W) (intern, roh, Import + / Export -)',
        type: 'number',
        role: 'value.power',
        read: true,
        write: false,
        unit: 'W',
        def: 0,
      },
      native: {},
    });

    // Filtered/averaged net grid power (Import + / Export -)
    // This value is intentionally used by other EMS modules to avoid unstable control due to short spikes.
    await a.setObjectNotExistsAsync('ems.gridPowerW', {
      type: 'state',
      common: {
        name: 'Netzleistung (W) (intern, geglättet, Import + / Export -)',
        type: 'number',
        role: 'value.power',
        read: true,
        write: false,
        unit: 'W',
        def: 0,
      },
      native: {},
    });


    await a.setObjectNotExistsAsync('ems.gridPowerSource', {
      type: 'state',
      common: {
        name: 'Netzleistung Quelle (intern)',
        type: 'string',
        role: 'text',
        read: true,
        write: false,
        def: '',
      },
      native: {},
    });

    this._gridPowerId = `${a.namespace}.ems.gridPowerW`;
    this._gridPowerRawId = `${a.namespace}.ems.gridPowerRawW`;
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
    // Optional: direct net grid power (NVP) in W (Import + / Export -)
    const gridPointPowerId = (typeof dps.gridPointPower === 'string' ? dps.gridPointPower.trim() : '') || '';
    const pvSurplusPowerId = gridSellPowerId;

    // Default net grid power:
    // 1) If buy/sell or NVP are mapped, use internal normalized state ems.gridPowerW
    // 2) Else (optional) fall back to PeakShaving gridPointPowerId if set in config
    const peakGridPowerId = (cfg.peakShaving && typeof cfg.peakShaving.gridPointPowerId === 'string') ? cfg.peakShaving.gridPointPowerId.trim() : '';
    const defaultGridPowerId = (gridBuyPowerId || gridSellPowerId || gridPointPowerId) ? this._gridPowerId : (peakGridPowerId || '');

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

      // Aktivierung & Priorität (Installateur-Konfiguration)
      const enabled = (wb && typeof wb.enabled === 'boolean') ? !!wb.enabled : true;
      const prioRaw = Number(wb && wb.priority !== undefined ? wb.priority : NaN);
      const priority = (Number.isFinite(prioRaw) ? Math.max(1, Math.min(999, Math.round(prioRaw))) : 999);



      wallboxes.push({
        key,
        name: wb.name || key,
        enabled,
        priority,

        // Stable mapping to EVCS index (lp1 -> 1, ...) regardless of safe key renaming
        evcsIndex: idx,

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
    const anyControl = wallboxes.some(w => (w && w.enabled !== false) && (w.setCurrentAId || w.setPowerWId));

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
      // IMPORTANT: Real-world grid meters (esp. NVP / net power aliases) often update on a slower cadence
      // (e.g. 30s..300s) and may not write a new value if the power is stable. A too aggressive
      // timeout causes false "failsafe stale meter" and disables *all* charging.
      // Default to 5 minutes; installers can tighten this in the App-Center if their meter updates faster.
      staleTimeoutSec: 300,
      activityThresholdW: 200,
      stopGraceSec: 30,
      sessionKeepSec: 300,

      // Gate B: PV hysteresis / start-stop protection (for PV-only modes)
      pvStartThresholdW: 800,
      pvStopThresholdW: 200,
      pvStartDelaySec: 10,
      pvStopDelaySec: 30,
      pvAbortImportW: 200,

      // Global stepping defaults (per wallbox overrides possible)
      stepA: 0.1,
      stepW: 25,

      // Boost timeouts (minutes). Defaults: AC=300 (5h), DC=60 (1h). 0 = no auto-timeout.
      boostTimeoutMinAc: 300,
      boostTimeoutMinDc: 60,

      // Gate C: Speicher-Unterstützung für Ladepark (optional)
      // Wenn aktiv und der SoC hoch genug ist, kann das EMS per Batterie-Entladung zusätzliche Ladeleistung bereitstellen,
      // ohne den Netzanschluss (Import-Limit) zu überlasten.
      storageAssistEnabled: false,
      storageAssistApply: 'boostOnly', // 'boostOnly' | 'boostAndAuto'
      storageAssistStartSocPct: 60,
      storageAssistStopSocPct: 40,
      // 0 = automatisch (Storage.maxDischargeW), sonst fester Wert
      storageAssistMaxDischargeW: 0,

      // Station groups (optional)
      ...(stationGroups.length ? { stationGroups } : {}),

      // per wallbox list
      wallboxes,
    };


    // Apply selected overrides from Admin-UI (keep safe defaults if empty)
    try {
      const modeOverride = (typeof userCm.mode === 'string') ? userCm.mode.trim() : '';
      // IMPORTANT:
      // "off" is not a configuration variant but a runtime enable/disable.
      // The App-Center already provides the on/off switch (enableChargingManagement).
      // Allowing "off" here caused real-world confusion where Boost/Auto did not react
      // although the app was "Aktiv".
      if (['pvSurplus', 'mixed'].includes(modeOverride)) chargingCfg.mode = modeOverride;

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

      // Stale timeout override (seconds)
      // NOTE:
      // Older builds treated exactly "15" as a legacy default and silently ignored it.
      // For field reliability (and to match installer expectations), we now honor ANY
      // explicit user value including 15s.
      const stale_ = Number(userCm.staleTimeoutSec);
      if (Number.isFinite(stale_) && stale_ >= 1 && stale_ <= 3600) {
        chargingCfg.staleTimeoutSec = Math.round(stale_);
      }

      const thr_ = Number(userCm.activityThresholdW);
      if (Number.isFinite(thr_) && thr_ >= 0) chargingCfg.activityThresholdW = Math.round(thr_);

      const pvStart_ = Number(userCm.pvStartThresholdW);
      if (Number.isFinite(pvStart_) && pvStart_ >= 0) chargingCfg.pvStartThresholdW = Math.round(pvStart_);

      const pvStop_ = Number(userCm.pvStopThresholdW);
      if (Number.isFinite(pvStop_) && pvStop_ >= 0) chargingCfg.pvStopThresholdW = Math.round(pvStop_);

      const pvStartDelay_ = Number(userCm.pvStartDelaySec);
      if (Number.isFinite(pvStartDelay_) && pvStartDelay_ >= 0) chargingCfg.pvStartDelaySec = pvStartDelay_;

      const pvStopDelay_ = Number(userCm.pvStopDelaySec);
      if (Number.isFinite(pvStopDelay_) && pvStopDelay_ >= 0) chargingCfg.pvStopDelaySec = pvStopDelay_;

      const pvAbortImport_ = Number(userCm.pvAbortImportW);
      if (Number.isFinite(pvAbortImport_) && pvAbortImport_ >= 0) chargingCfg.pvAbortImportW = Math.round(pvAbortImport_);

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

      // Gate C: Speicher-Unterstützung
      if (typeof userCm.storageAssistEnabled === 'boolean') chargingCfg.storageAssistEnabled = userCm.storageAssistEnabled;
      const saApply_ = (typeof userCm.storageAssistApply === 'string') ? userCm.storageAssistApply.trim() : '';
      if (['boostOnly', 'boostAndAuto'].includes(saApply_)) chargingCfg.storageAssistApply = saApply_;

      const saStart_ = Number(userCm.storageAssistStartSocPct);
      if (Number.isFinite(saStart_) && saStart_ >= 0 && saStart_ <= 100) chargingCfg.storageAssistStartSocPct = saStart_;

      const saStop_ = Number(userCm.storageAssistStopSocPct);
      if (Number.isFinite(saStop_) && saStop_ >= 0 && saStop_ <= 100) chargingCfg.storageAssistStopSocPct = saStop_;

      const saMax_ = Number(userCm.storageAssistMaxDischargeW);
      if (Number.isFinite(saMax_) && saMax_ >= 0) chargingCfg.storageAssistMaxDischargeW = saMax_;
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
    // Wichtig: Charging-Management bleibt grundsätzlich aktiviert (wenn der Installateur es nicht explizit deaktiviert),
    // damit die EMS-States und die EVCS-UI (Modus-Buttons) immer verfügbar sind – auch wenn noch nicht alle Setpoints
    // gemappt sind. Ohne Setpoints werden keine Sollwerte geschrieben (failsafe).
    adapter.config.enableChargingManagement = !!userWantsCharging;
    adapter.config._chargingHasAnySetpoint = !!anyControl;
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

    const gridNetId = (typeof dps.gridPointPower === 'string') ? dps.gridPointPower.trim() : '';

    // Bridge: reuse VIS datapoints for EMS modules to avoid double mapping in Admin UI
    try {
      const socId = (typeof dps.storageSoc === 'string') ? dps.storageSoc.trim() : '';
      if (socId) {
        adapter.config.storage = adapter.config.storage || {};
        adapter.config.storage.datapoints = adapter.config.storage.datapoints || {};
        const cur = (typeof adapter.config.storage.datapoints.socObjectId === 'string') ? adapter.config.storage.datapoints.socObjectId.trim() : '';
        if (!cur) adapter.config.storage.datapoints.socObjectId = socId;
      }

      const batPowerId = (typeof dps.batteryPower === 'string') ? dps.batteryPower.trim() : '';
      if (batPowerId) {
        adapter.config.storage = adapter.config.storage || {};
        adapter.config.storage.datapoints = adapter.config.storage.datapoints || {};
        const curBP = (typeof adapter.config.storage.datapoints.batteryPowerObjectId === 'string') ? adapter.config.storage.datapoints.batteryPowerObjectId.trim() : '';
        if (!curBP) adapter.config.storage.datapoints.batteryPowerObjectId = batPowerId;
      }
    } catch (_e) {
      // ignore
    }

    // NOTE on freshness:
    // Real-world meters (and especially aliases) may not emit new state.ts values while the measurement is stable.
    // We therefore enable the "alive prefix" heartbeat for grid metering inputs.
    if (gridBuyId) await this.dp.upsert({ key: 'vis.gridBuyW', objectId: gridBuyId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
    if (gridSellId) await this.dp.upsert({ key: 'vis.gridSellW', objectId: gridSellId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });

    if (gridNetId) await this.dp.upsert({ key: 'vis.gridNetW', objectId: gridNetId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });

    // Optional: storage capacity (kWh) for time-/risk-based charge strategies
    const capKwhId = (typeof dps.storageCapacityKwh === 'string') ? dps.storageCapacityKwh.trim() : '';
    if (capKwhId) await this.dp.upsert({ key: 'st.capacityKwh', objectId: capKwhId, dataType: 'number', direction: 'in', unit: 'kWh' });

    // Map internal net grid power to generic keys used by modules as fallback
    // grid.powerW is intentionally the *filtered* value for stable regulation.
    // grid.powerRawW provides the raw signal for safety clamping and debugging.
    if (this._gridPowerId) {
      // IMPORTANT: enable alive-prefix heartbeat here as well.
      // Charging-management/peak-shaving use these generic keys, and real-world meters
      // (especially ioBroker aliases) may not emit new timestamps while values are stable.
      await this.dp.upsert({ key: 'grid.powerW', objectId: this._gridPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
      await this.dp.upsert({ key: 'ems.gridPowerW', objectId: this._gridPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
    }
    if (this._gridPowerRawId) {
      await this.dp.upsert({ key: 'grid.powerRawW', objectId: this._gridPowerRawId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
      await this.dp.upsert({ key: 'ems.gridPowerRawW', objectId: this._gridPowerRawId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
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
    try { adapter.subscribeStates('thermal.*'); } catch (_e) {}
    try { adapter.subscribeStates('threshold.*'); } catch (_e) {}
    try { adapter.subscribeStates('gridConstraints.*'); } catch (_e) {}

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

    // Prevent overlapping async ticks (deterministic scheduler).
    if (this._tickRunning) {
      this._tickSkipCount = (Number.isFinite(Number(this._tickSkipCount)) ? Number(this._tickSkipCount) : 0) + 1;
      try {
        await this.adapter.setStateAsync('ems.core.tickSkipCount', { val: Math.round(this._tickSkipCount), ack: true });
      } catch (_e) {
        // ignore
      }
      return;
    }

    this._tickRunning = true;
    const tickStart = Date.now();
    try {
      try {
        await this.adapter.setStateAsync('ems.core.tickRunning', { val: true, ack: true });
        await this.adapter.setStateAsync('ems.core.lastTickStart', { val: tickStart, ack: true });
        // reset error on successful tick start
        await this.adapter.setStateAsync('ems.core.lastTickError', { val: '', ack: true });
      } catch (_e0) {
        // ignore
      }

      // Derived / normalized net grid power (Import + / Export -)
      // Source priority:
      // 1) Direct NVP datapoint (datapoints.gridPointPower)
      // 2) Derived from buy/sell (datapoints.gridBuyPower / datapoints.gridSellPower)
      // Sign correction: settings.flowInvertGrid (VIS) is applied to EMS as well.
      try {
      const invGrid = !!(this.adapter && this.adapter.config && this.adapter.config.settings && this.adapter.config.settings.flowInvertGrid);

      // Stale timeout for metering input: reuse storage/peak defaults (fallback 15s).
      // Goal: avoid "springing" at the NVP when buy/sell datapoints update asynchronously.
      // IMPORTANT: Use the same staleness threshold as the charging management failsafe.
      // If we treat the NVP signal as "stale" too early here, we stop publishing ems.gridPowerW,
      // which then triggers a global "failsafe stale meter" and forces all setpoints to 0.
      const staleTimeoutSec = clampNumber(
        (this.adapter && this.adapter.config && this.adapter.config.chargingManagement && this.adapter.config.chargingManagement.staleTimeoutSec) ??
        (this.adapter && this.adapter.config && this.adapter.config.storage && this.adapter.config.storage.staleTimeoutSec) ??
        (this.adapter && this.adapter.config && this.adapter.config.peakShaving && this.adapter.config.peakShaving.staleTimeoutSec) ??
        300,
        1,
        3600,
        300
      );
      const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

      let source = 'none';
      let netW = null;

      // Prefer direct net measurement if present and fresh
      const netVal = this.dp.getNumber('vis.gridNetW', null);
      const netFresh = (typeof netVal === 'number' && Number.isFinite(netVal) && !this.dp.isStale('vis.gridNetW', staleMs));

      if (netFresh) {
        netW = netVal;
        if (invGrid) netW = -netW;
        source = 'net';
      } else {
	        const hasBuy = !!this.dp.getEntry('vis.gridBuyW');
	        const hasSell = !!this.dp.getEntry('vis.gridSellW');

	        const rawBuyVal = hasBuy ? this.dp.getNumber('vis.gridBuyW', null) : null;
	        const rawSellVal = hasSell ? this.dp.getNumber('vis.gridSellW', null) : null;

	        const rawBuyFresh = (typeof rawBuyVal === 'number' && Number.isFinite(rawBuyVal) && !this.dp.isStale('vis.gridBuyW', staleMs));
	        const rawSellFresh = (typeof rawSellVal === 'number' && Number.isFinite(rawSellVal) && !this.dp.isStale('vis.gridSellW', staleMs));

	        // Map to Import/Export semantics (Import + / Export -).
	        // If flowInvertGrid is enabled, buy/sell semantics are swapped.
	        const hasImport = invGrid ? hasSell : hasBuy;
	        const hasExport = invGrid ? hasBuy : hasSell;

	        const importVal = invGrid ? rawSellVal : rawBuyVal;
	        const exportVal = invGrid ? rawBuyVal : rawSellVal;

	        const importFresh = invGrid ? rawSellFresh : rawBuyFresh;
	        const exportFresh = invGrid ? rawBuyFresh : rawSellFresh;

	        const isFiniteNum = (v) => (typeof v === 'number' && Number.isFinite(v));
	        const impValid = isFiniteNum(importVal);
	        const expValid = isFiniteNum(exportVal);

	        // Handle asynchronous updates of buy/sell channels:
	        // - We accept the combination if at least one of the channels is fresh.
	        // - If only one channel is fresh and indicates a direction, we assume the opposite channel is 0
	        //   (common behaviour of import/export meters).
	        if (hasImport && hasExport) {
	          if (importFresh || exportFresh) {
	            let imp = impValid ? Number(importVal) : 0;
	            let exp = expValid ? Number(exportVal) : 0;

	            if (importFresh && !exportFresh && imp > 0) exp = 0;
	            if (exportFresh && !importFresh && exp > 0) imp = 0;

	            netW = imp - exp;
	            source = invGrid
	              ? ((importFresh && exportFresh) ? 'buy/sell(inv)' : 'buy/sell(partial inv)')
	              : ((importFresh && exportFresh) ? 'buy/sell' : 'buy/sell(partial)');
	          } else {
	            netW = null;
	            source = invGrid ? 'buy/sell(stale inv)' : 'buy/sell(stale)';
	          }
	        } else if (hasImport) {
	          if (importFresh) {
	            netW = (impValid ? Number(importVal) : 0);
	            source = invGrid ? 'import-only(inv)' : 'import-only';
	          } else {
	            netW = null;
	            source = invGrid ? 'import-only(stale inv)' : 'import-only(stale)';
	          }
	        } else if (hasExport) {
	          if (exportFresh) {
	            netW = -(expValid ? Number(exportVal) : 0);
	            source = invGrid ? 'export-only(inv)' : 'export-only';
	          } else {
	            netW = null;
	            source = invGrid ? 'export-only(stale inv)' : 'export-only(stale)';
	          }
	        } else {
	          netW = null;
	          source = 'none';
	        }
      }

      // Publish source for diagnostics (helps identifying NVP issues)
      try { await this.adapter.setStateAsync('ems.gridPowerSource', { val: source, ack: true }); } catch (_eSrc) {}

      if (typeof netW === 'number' && Number.isFinite(netW) && this._gridPowerId && this._gridPowerRawId) {
        const nowTs = Date.now();
        const netRawRounded = Math.round(Number(netW));

        // 1) Publish raw net power (diagnostics / safety clamp)
        try {
          await this.adapter.setStateAsync('ems.gridPowerRawW', { val: netRawRounded, ack: true });
        } catch (_e) {}

        // 2) Filtered/averaged net power for stable regulation
        const psCfg = (this.adapter && this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
        const useAvg = (psCfg.useAverage !== false); // default true
        const tauSec = useAvg ? clampNumber(psCfg.smoothingSeconds, 1, 600, 10) : 0;
        const dtSec = (this._gridPowerLastTs > 0) ? Math.max(0.05, Math.min(10, (nowTs - this._gridPowerLastTs) / 1000)) : (this._intervalMs / 1000);
        this._gridPowerLastTs = nowTs;

        if (!Number.isFinite(Number(this._gridPowerAvgW))) {
          this._gridPowerAvgW = netRawRounded;
        } else if (!useAvg || tauSec <= 0) {
          this._gridPowerAvgW = netRawRounded;
        } else {
          const alpha = dtSec / (tauSec + dtSec);
          this._gridPowerAvgW = Number(this._gridPowerAvgW) + alpha * (netRawRounded - Number(this._gridPowerAvgW));
        }

        const netAvgRounded = Math.round(Number(this._gridPowerAvgW));

        try {
          await this.adapter.setStateAsync('ems.gridPowerW', { val: netAvgRounded, ack: true });
        } catch (_e) {}

        // Update dp cache explicitly (own states might not be subscribed)
        try {
          if (typeof this.dp.handleStateChange === 'function') {
            this.dp.handleStateChange(this._gridPowerRawId, { val: netRawRounded, ack: true, ts: nowTs });
            this.dp.handleStateChange(this._gridPowerId, { val: netAvgRounded, ack: true, ts: nowTs });
          }
        } catch (_e2) {}
      }
      } catch (_e) {
        // ignore
      }

      await this.mm.tick();
    } catch (err) {
      try {
        await this.adapter.setStateAsync('ems.core.lastTickError', { val: String(err?.message || err), ack: true });
      } catch (_e1) {
        // ignore
      }
      throw err;
    } finally {
      this._tickRunning = false;
      const dur = Date.now() - tickStart;
      try {
        await this.adapter.setStateAsync('ems.core.tickRunning', { val: false, ack: true });
        await this.adapter.setStateAsync('ems.core.lastTickDurationMs', { val: Math.round(dur), ack: true });
      } catch (_e2) {
        // ignore
      }
    }
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

module.exports = { EmsEngine };
