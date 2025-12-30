'use strict';

const { DatapointRegistry } = require('./datapoints');
const { ChargingManagementModule } = require('./modules/charging-management');

/**
 * Embedded EMS engine wrapper for nexowatt-vis.
 *
 * Goal for Sprint 2:
 * - Run ChargingManagementModule (from nexowatt-multiuse) INSIDE the VIS adapter
 * - Use the VIS "Wallboxen" table for wallbox mapping (Istleistung + Setpoints A/W + meta)
 * - Keep it manufacturer-independent and allow mixed A/W control
 */
class EmsEngine {
  /**
   * @param {import('@iobroker/adapter-core').AdapterInstance} adapter
   */
  constructor(adapter) {
    this.adapter = adapter;
    this.dp = null;
    this.charging = null;
    this._timer = null;
    this._intervalMs = 1000;
  }

  /**
   * Build a multiuse-compatible charging config from VIS config/table.
   */
  _buildChargingConfig() {
    const adapter = this.adapter;
    const cfg = adapter.config || {};

    // --- Budget defaults (fast MVP): use configured EVCS max power ---
    const settingsCfg = cfg.settingsConfig || {};
    const ratedKw = Number(settingsCfg.evcsMaxPowerKw || 11);
    const ratedW = Math.round((Number.isFinite(ratedKw) ? ratedKw : 11) * 1000);

    // --- PV surplus source (fast MVP): prefer export power mapping ---
    const dps = cfg.datapoints || {};
    const pvSurplusPowerId = (typeof dps.gridSellPower === 'string' ? dps.gridSellPower.trim() : '') || '';

    // --- Wallboxes from already normalized evcsList (created in syncSettingsConfigToStates) ---
    const list = Array.isArray(adapter.evcsList) ? adapter.evcsList : [];

    const wallboxes = [];
    for (const wb of list) {
      if (!wb) continue;
      const idx = Number(wb.index);
      if (!Number.isFinite(idx) || idx <= 0) continue;

      const key = `wb${idx}`; // stable key independent from name

      const actualPowerWId = (wb.powerId || '').trim();
      const setCurrentAId = (wb.setCurrentAId || '').trim();
      const setPowerWId = (wb.setPowerWId || '').trim();

      // If no setpoints are mapped, the wallbox can still be monitored but cannot be controlled.
      // We'll still include it, but the module will mark it as NO_SETPOINT.

      // Online detection: prefer explicit online dp (bool), otherwise statusId
      const statusId = ((wb.onlineId || '').trim()) || ((wb.statusId || '').trim()) || '';

      // Enable DP (optional)
      const enableId = (wb.enableWriteId || '').trim();

      // charger type / meta
      const chargerTypeRaw = String(wb.chargerType || 'ac').trim().toLowerCase();
      const chargerType = (chargerTypeRaw === 'dc') ? 'DC' : 'AC';

      const phases = (Number(wb.phases) === 1) ? 1 : 3;
      const voltageV = (Number.isFinite(Number(wb.voltageV)) && Number(wb.voltageV) > 0) ? Math.round(Number(wb.voltageV)) : 230;

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

      wallboxes.push({
        key,
        name: wb.name || key,
        enabled: true,
        priority: 999,

        chargerType,
        controlBasis,
        phases,

        // per-wallbox meta
        // Note: voltageV is global in multiuse cfg; we set it globally below.

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

      // PV-only is handled per-wallbox via runtime mode (pv/minpv). Keep global default off for MVP.
      pvSurplusOnly: false,

      // Budget: use engine (currently only static used; later we can add tariff/peak/datapoint)
      totalBudgetMode: 'engine',
      staticMaxChargingPowerW: ratedW,

      // PV surplus input (optional)
      ...(pvSurplusPowerId ? { pvSurplusPowerId } : {}),

      // Global electrical defaults
      voltageV,
      defaultPhases: 3,

      // Stability defaults (anti-flutter, safe)
      staleTimeoutSec: 15,
      activityThresholdW: 200,
      stopGraceSec: 30,
      sessionKeepSec: 300,

      // Global stepping defaults (per wallbox overrides possible)
      stepA: 0.1,
      stepW: 25,

      // per wallbox list
      wallboxes,
    };

    return { anyControl, chargingCfg };
  }

  async init() {
    const adapter = this.adapter;

    // Configure scheduler interval (future: make configurable via Admin)
    this._intervalMs = 1000;

    const { anyControl, chargingCfg } = this._buildChargingConfig();

    // Inject config for the embedded multiuse module
    adapter.config.enableChargingManagement = !!anyControl;
    adapter.config.chargingManagement = chargingCfg;

    // Datapoint registry (multiuse)
    this.dp = new DatapointRegistry(adapter, []);
    await this.dp.init();

    // Charging module
    this.charging = new ChargingManagementModule(adapter, this.dp);
    await this.charging.init();

    // Subscribe to our own chargingManagement.* states so VIS /api/state sees them
    try { adapter.subscribeStates('chargingManagement.*'); } catch (_e) {}

    // Start scheduler
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      this.tick().catch(err => {
        try { adapter.log.warn(`[EMS] tick failed: ${err?.message || err}`); } catch (_e) {}
      });
    }, this._intervalMs);

    adapter.log.info(`[EMS] Charging management embedded: ${anyControl ? 'ENABLED' : 'DISABLED'} (interval ${this._intervalMs}ms)`);
  }

  async tick() {
    if (!this.adapter) return;
    if (!this.dp || !this.charging) return;

    // In Sprint 2, config changes require adapter restart. We keep tick minimal.
    await this.charging.tick();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

module.exports = { EmsEngine };
