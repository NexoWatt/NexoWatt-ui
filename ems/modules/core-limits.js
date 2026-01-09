'use strict';

const { BaseModule } = require('./base');

function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(v, minV, maxV, fallback = null) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    let x = n;
    if (Number.isFinite(minV)) x = Math.max(minV, x);
    if (Number.isFinite(maxV)) x = Math.min(maxV, x);
    return x;
}

async function readStateNumber(adapter, id, fallback = null) {
    try {
        const st = await adapter.getStateAsync(id);
        const n = st ? Number(st.val) : NaN;
        return Number.isFinite(n) ? n : fallback;
    } catch {
        return fallback;
    }
}

async function readStateBool(adapter, id, fallback = null) {
    try {
        const st = await adapter.getStateAsync(id);
        if (!st) return fallback;
        if (st.val === null || st.val === undefined) return fallback;
        if (typeof st.val === 'boolean') return st.val;
        if (typeof st.val === 'number') return st.val !== 0;
        if (typeof st.val === 'string') {
            const s = st.val.trim().toLowerCase();
            if (s === 'true' || s === '1' || s === 'on' || s === 'yes' || s === 'active') return true;
            if (s === 'false' || s === '0' || s === 'off' || s === 'no' || s === 'inactive') return false;
        }
        return !!st.val;
    } catch {
        return fallback;
    }
}

async function readStateString(adapter, id, fallback = '') {
    try {
        const st = await adapter.getStateAsync(id);
        if (!st) return fallback;
        const s = String(st.val ?? '').trim();
        return s;
    } catch {
        return fallback;
    }
}

/**
 * Phase 4.0: zentrale Cap-/Budget-Snapshot-Schicht.
 *
 * Ziele:
 * - EIN zentraler, pro Tick deterministischer Snapshot für Limits/Budgets.
 * - Keine doppelten/inkonsistenten Ableitungen in einzelnen Modulen.
 * - Transparenz über berechnete Limits in State-Form.
 *
 * Wichtiger Grundsatz:
 * - Dieser Core berechnet KEINE Setpoints für Geräte.
 * - Er stellt nur konsistente Caps/Budgets bereit, die andere Module nutzen.
 */
class CoreLimitsModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._inited = false;
    }

    async init() {
        // States werden immer angelegt (auch wenn EMS-Module später einzeln deaktiviert werden)
        // damit Installateur/Diagnose stabil bleibt.
        await this.adapter.setObjectNotExistsAsync('ems.core', {
            type: 'channel',
            common: { name: 'EMS Core' },
            native: {},
        });

        const mk = async (id, name, type, role, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: false,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('ems.core.lastUpdate', 'Last update (ts)', 'number', 'value.time');

        // Grid/Plant Caps
        await mk('ems.core.gridConnectionLimitW_cfg', 'Grid connection limit (W) configured', 'number', 'value.power', 'W');
        await mk('ems.core.gridSafetyMarginW', 'Grid safety margin (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridConstraintsCapW', 'Grid constraints cap (W) (RLM/EVU)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_effective', 'Grid import limit effective (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_physical', 'Grid import limit physical (W) (cfg/EVU minus margin)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_peakShaving', 'Grid import limit from Peak-Shaving (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridImportLimitW_source', 'Grid import limit binding source', 'string', 'text');
        await mk('ems.core.gridMaxPhaseA_cfg', 'Grid max phase current (A) configured', 'number', 'value.current', 'A');

        // Peak
        await mk('ems.core.peakActive', 'Peak active', 'boolean', 'indicator');
        await mk('ems.core.peakBudgetW', 'Peak budget for controlled loads (W)', 'number', 'value.power', 'W');

        // Tariff
        await mk('ems.core.tariffBudgetW', 'Tariff cap for controlled loads (W)', 'number', 'value.power', 'W');
        await mk('ems.core.gridChargeAllowed', 'Grid charge allowed', 'boolean', 'indicator');
        await mk('ems.core.dischargeAllowed', 'Discharge allowed', 'boolean', 'indicator');

        // §14a
        await mk('ems.core.para14aActive', '§14a active', 'boolean', 'indicator');
        await mk('ems.core.para14aMode', '§14a mode', 'string', 'text');
        await mk('ems.core.para14aEvcsCapW', '§14a EVCS cap (W)', 'number', 'value.power', 'W');

        // Result (high-level)
        await mk('ems.core.evcsHighLevelCapW', 'EVCS high level cap (W) (min of peak/tariff/14a)', 'number', 'value.power', 'W');
        await mk('ems.core.evcsHighLevelBinding', 'EVCS high level binding sources', 'string', 'text');
        await mk('ems.core.snapshot', 'Snapshot (JSON)', 'string', 'text');

        this._inited = true;
    }

    async tick() {
        if (!this._inited) {
            try { await this.init(); } catch { /* ignore */ }
        }

        const now = Date.now();
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const psCfg = (cfg && cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};

        // ------------------------------------------------------------
        // Grid connection / physical caps
        // ------------------------------------------------------------
        const gridConnectionLimitW_cfg = clamp(num(cfg?.installerConfig?.gridConnectionPower, 0), 0, 1e12, 0) || 0;
        const gridSafetyMarginW = clamp(num(psCfg?.safetyMarginW, 0), 0, 1e12, 0) || 0;
        const gridMaxPhaseA_cfg = clamp(num(psCfg?.maxPhaseA, 0), 0, 20000, 0) || 0;

        // Grid constraints dynamic cap (optional, may be lower than plant limit)
        const gridConstraintsCapW = await readStateNumber(this.adapter, 'gridConstraints.control.maxImportW_final', null);

        // Physical import cap: min(gridConnection, gridConstraints) - safety margin
        let gridImportLimitW_physical = 0;
        {
            let base = (gridConnectionLimitW_cfg > 0) ? gridConnectionLimitW_cfg : 0;
            if (typeof gridConstraintsCapW === 'number' && Number.isFinite(gridConstraintsCapW) && gridConstraintsCapW > 0) {
                base = (base > 0) ? Math.min(base, gridConstraintsCapW) : gridConstraintsCapW;
            }
            if (base > 0) {
                gridImportLimitW_physical = Math.max(0, base - gridSafetyMarginW);
            }
        }

        // Peak-Shaving cap (already includes reserve/safety in the module itself)
        const peakEnabledCfg = !!cfg.enablePeakShaving;
        const peakShavingLimitW_raw = await readStateNumber(this.adapter, 'peakShaving.control.limitW', null);
        const gridImportLimitW_peakShaving = (peakEnabledCfg && typeof peakShavingLimitW_raw === 'number' && Number.isFinite(peakShavingLimitW_raw) && peakShavingLimitW_raw > 0)
            ? peakShavingLimitW_raw
            : 0;

        // Effective import limit: min(peakShavingLimit, physicalLimit)
        let gridImportLimitW_effective = 0;
        let gridImportLimitW_source = '';
        {
            /** @type {Array<{k:string,w:number}>} */
            const cands = [];
            if (typeof gridImportLimitW_peakShaving === 'number' && gridImportLimitW_peakShaving > 0) cands.push({ k: 'peak', w: gridImportLimitW_peakShaving });
            if (typeof gridImportLimitW_physical === 'number' && gridImportLimitW_physical > 0) cands.push({ k: 'physical', w: gridImportLimitW_physical });

            if (cands.length) {
                let minW = Number.POSITIVE_INFINITY;
                for (const c of cands) {
                    const w = Number(c.w);
                    if (Number.isFinite(w)) minW = Math.min(minW, w);
                }
                gridImportLimitW_effective = Number.isFinite(minW) ? Math.max(0, minW) : 0;

                const eps = 0.001;
                const bind = cands
                    .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - Number(gridImportLimitW_effective)) <= eps)
                    .map(c => c.k);
                gridImportLimitW_source = bind.join('+');
            }
        }

        // ------------------------------------------------------------
        // Peak / Tariff / §14a caps
        // ------------------------------------------------------------
        const peakActive = await readStateBool(this.adapter, 'peakShaving.control.active', false);
        const peakBudgetW_raw = await readStateNumber(this.adapter, 'peakShaving.dynamic.availableForControlledW', null);
        const peakBudgetW = (peakActive && typeof peakBudgetW_raw === 'number' && Number.isFinite(peakBudgetW_raw) && peakBudgetW_raw > 0)
            ? peakBudgetW_raw
            : null;

        const tariffBudgetW_raw = await readStateNumber(this.adapter, 'tarif.ladeparkLimitW', null);
        const tariffBudgetW = (typeof tariffBudgetW_raw === 'number' && Number.isFinite(tariffBudgetW_raw) && tariffBudgetW_raw > 0)
            ? tariffBudgetW_raw
            : null;

        const gridChargeAllowed = await readStateBool(this.adapter, 'tarif.netzLadenErlaubt', true);
        const dischargeAllowed = await readStateBool(this.adapter, 'tarif.entladenErlaubt', true);

        // §14a snapshot: prefer in-process runtime snapshot from Para14aModule (deterministic within a tick)
        // Fallback: read from states (e.g. after restart before first §14a tick)
        const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;

        let para14aActive = false;
        let para14aMode = '';
        let para14aEvcsCapW = null;

        if (p14a && typeof p14a === 'object') {
            para14aActive = !!p14a.active;
            para14aMode = para14aActive ? String(p14a.mode || '') : '';
            const cap = (para14aActive && typeof p14a.evcsTotalCapW === 'number' && Number.isFinite(p14a.evcsTotalCapW) && p14a.evcsTotalCapW > 0)
                ? p14a.evcsTotalCapW
                : null;
            para14aEvcsCapW = (typeof cap === 'number') ? cap : null;
        } else {
            const a = await readStateBool(this.adapter, 'para14a.active', false);
            para14aActive = !!a;
            para14aMode = para14aActive ? await readStateString(this.adapter, 'para14a.mode', '') : '';
            const raw = await readStateNumber(this.adapter, 'para14a.evcsTotalCapW', null);
            para14aEvcsCapW = (para14aActive && typeof raw === 'number' && Number.isFinite(raw) && raw > 0) ? raw : null;
        }

        // ------------------------------------------------------------
        // High-level cap for EVCS (does NOT include base-load math).
        // This is a deterministic "global upper bound" used by consumers.
        // ------------------------------------------------------------
        /** @type {Array<{k:string,w:number}>} */
        const components = [];
        if (typeof peakBudgetW === 'number') components.push({ k: 'peak', w: peakBudgetW });
        if (typeof tariffBudgetW === 'number') components.push({ k: 'tariff', w: tariffBudgetW });
        if (typeof para14aEvcsCapW === 'number') components.push({ k: '14a', w: para14aEvcsCapW });

        let evcsHighLevelCapW = null;
        let binding = '';
        if (components.length) {
            let minW = Number.POSITIVE_INFINITY;
            for (const c of components) {
                const w = Number(c.w);
                if (Number.isFinite(w)) minW = Math.min(minW, w);
            }
            evcsHighLevelCapW = Number.isFinite(minW) ? Math.max(0, minW) : null;

            const eps = 0.001;
            const bind = components
                .filter(c => Number.isFinite(Number(c.w)) && Math.abs(Number(c.w) - Number(evcsHighLevelCapW)) <= eps)
                .map(c => c.k);
            binding = bind.join('+');
        }

        // ------------------------------------------------------------
        // Publish snapshot to adapter runtime (shared context)
        // ------------------------------------------------------------
        const snapshot = {
            ts: now,
            grid: {
                gridConnectionLimitW_cfg,
                gridSafetyMarginW,
                gridConstraintsCapW: (typeof gridConstraintsCapW === 'number') ? gridConstraintsCapW : null,
                gridImportLimitW_physical,
                gridImportLimitW_peakShaving,
                gridImportLimitW_effective,
                gridImportLimitW_source,
                gridMaxPhaseA_cfg,
            },
            peak: {
                active: !!peakActive,
                budgetW: (typeof peakBudgetW === 'number') ? peakBudgetW : null,
            },
            tariff: {
                budgetW: (typeof tariffBudgetW === 'number') ? tariffBudgetW : null,
                gridChargeAllowed: !!gridChargeAllowed,
                dischargeAllowed: !!dischargeAllowed,
            },
            para14a: {
                active: !!para14aActive,
                mode: para14aMode,
                evcsCapW: (typeof para14aEvcsCapW === 'number') ? para14aEvcsCapW : null,
            },
            evcsHighLevel: {
                capW: (typeof evcsHighLevelCapW === 'number') ? evcsHighLevelCapW : null,
                binding,
            },
        };

        try {
            // Shared runtime object used by consumers for consistent reads.
            this.adapter._emsCaps = snapshot;
        } catch {
            // ignore
        }

        // ------------------------------------------------------------
        // Publish states (low overhead, high value for support)
        // ------------------------------------------------------------
        try {
            await this.adapter.setStateAsync('ems.core.lastUpdate', now, true);
            await this.adapter.setStateAsync('ems.core.gridConnectionLimitW_cfg', Math.round(gridConnectionLimitW_cfg || 0), true);
            await this.adapter.setStateAsync('ems.core.gridSafetyMarginW', Math.round(gridSafetyMarginW || 0), true);
            await this.adapter.setStateAsync('ems.core.gridConstraintsCapW', Math.round((typeof gridConstraintsCapW === 'number') ? gridConstraintsCapW : 0), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_physical', Math.round(gridImportLimitW_physical || 0), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_peakShaving', Math.round(gridImportLimitW_peakShaving || 0), true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_source', gridImportLimitW_source || '', true);
            await this.adapter.setStateAsync('ems.core.gridImportLimitW_effective', Math.round(gridImportLimitW_effective || 0), true);
            await this.adapter.setStateAsync('ems.core.gridMaxPhaseA_cfg', Math.round(gridMaxPhaseA_cfg || 0), true);

            await this.adapter.setStateAsync('ems.core.peakActive', !!peakActive, true);
            await this.adapter.setStateAsync('ems.core.peakBudgetW', Math.round((typeof peakBudgetW === 'number') ? peakBudgetW : 0), true);

            await this.adapter.setStateAsync('ems.core.tariffBudgetW', Math.round((typeof tariffBudgetW === 'number') ? tariffBudgetW : 0), true);
            await this.adapter.setStateAsync('ems.core.gridChargeAllowed', !!gridChargeAllowed, true);
            await this.adapter.setStateAsync('ems.core.dischargeAllowed', !!dischargeAllowed, true);

            await this.adapter.setStateAsync('ems.core.para14aActive', !!para14aActive, true);
            await this.adapter.setStateAsync('ems.core.para14aMode', para14aMode || '', true);
            await this.adapter.setStateAsync('ems.core.para14aEvcsCapW', Math.round((typeof para14aEvcsCapW === 'number') ? para14aEvcsCapW : 0), true);

            await this.adapter.setStateAsync('ems.core.evcsHighLevelCapW', Math.round((typeof evcsHighLevelCapW === 'number') ? evcsHighLevelCapW : 0), true);
            await this.adapter.setStateAsync('ems.core.evcsHighLevelBinding', binding || '', true);

            // Keep JSON short enough; this is meant for diagnostics.
            await this.adapter.setStateAsync('ems.core.snapshot', JSON.stringify(snapshot), true);
        } catch {
            // ignore
        }
    }
}

module.exports = { CoreLimitsModule };
