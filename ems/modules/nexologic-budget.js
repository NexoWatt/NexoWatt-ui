/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/nexologic-budget.ts
 * Quell-Hash: sha256:c62e8d7e70098cbb3000df9711215ab2756a63be38e24d00e415a200dc26302b
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/nexologic-budget.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NexoLogicBudgetModule = void 0;
const { BaseModule } = require('./base');
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
}
function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
class NexoLogicBudgetModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this.adapter = adapter;
        this.dp = dpRegistry;
    }
    async init() {
        const states = {
            active: ['boolean', 'indicator.working', 'NexoLogic Budgetmodul aktiv'],
            status: ['string', 'text', 'NexoLogic Budgetstatus'],
            intentCount: ['number', 'value', 'NexoLogic Budget-Intents'],
            requestedW: ['number', 'value.power', 'NexoLogic angeforderte Leistung', 'W'],
            grantedW: ['number', 'value.power', 'NexoLogic zentral freigegebene Leistung', 'W'],
            reservedW: ['number', 'value.power', 'NexoLogic zentral reservierte Leistung', 'W'],
            blockedCount: ['number', 'value', 'NexoLogic budget-/arbiterblockierte Ausgaenge'],
            intentsJson: ['string', 'json', 'NexoLogic Budget-Intents JSON'],
        };
        for (const [name, spec] of Object.entries(states)) {
            await this.adapter.setObjectNotExistsAsync(`nexoLogic.control.${name}`, {
                type: 'state',
                common: { name: spec[2], type: spec[0], role: spec[1], read: true, write: false, unit: spec[3] },
                native: {},
            });
        }
        await this.adapter.setStateAsync('nexoLogic.control.active', { val: true, ack: true });
    }
    async set(name, value) {
        if (!this.adapter || this.adapter._nwShuttingDown)
            return;
        try {
            const id = `nexoLogic.control.${name}`;
            const current = await this.adapter.getStateAsync(id).catch(() => null);
            if (current && current.val === value)
                return;
            await this.adapter.setStateAsync(id, { val: value, ack: true });
        }
        catch (_error) { }
    }
    async tick() {
        const engine = this.adapter?.logicEngine;
        const central = this.adapter?._emsBudget;
        const intents = engine && typeof engine.getBudgetIntents === 'function' ? engine.getBudgetIntents() : [];
        const rows = Array.isArray(intents) ? intents.slice().sort((a, b) => num(a?.budgetPriority, 900) - num(b?.budgetPriority, 900) || text(a?.key).localeCompare(text(b?.key))) : [];
        let requestedW = 0;
        let grantedW = 0;
        let reservedW = 0;
        let blockedCount = 0;
        const diagnostics = [];
        const centralReady = !!(central && typeof central.getPvGrant === 'function' && typeof central.getTotalGrant === 'function' && typeof central.reserve === 'function');
        for (const intent of rows) {
            const intentActive = intent?.active !== false;
            const releasePending = intent?.releasePending === true;
            const reqW = intentActive ? Math.max(0, num(intent?.requestedW, 0)) : 0;
            requestedW += reqW;
            let grantW = 0;
            let grantSource = 'central-budget-missing';
            if (centralReady && reqW > 0 && !releasePending) {
                const req = {
                    key: `nexoLogic:${text(intent.key)}`,
                    app: 'nexoLogic',
                    label: `NexoLogic ${text(intent.graphId)}/${text(intent.nodeId)}`,
                    priority: Math.max(0, Math.round(num(intent.budgetPriority, 900))),
                    requestedW: reqW,
                    applyEvcsAllocationCap: false,
                };
                const grant = intent.budgetMode === 'pv' ? central.getPvGrant(req) : central.getTotalGrant(req);
                grantW = Math.max(0, Math.min(reqW, num(grant?.grantW, 0)));
                grantSource = text(grant?.source || grant?.reason || 'central-grant');
            }
            grantedW += grantW;
            const result = engine && typeof engine.applyBudgetGrant === 'function' ? await engine.applyBudgetGrant(intent.key, releasePending ? 0 : grantW) : null;
            const usedW = Math.max(0, num(result?.budgetReservedW, 0));
            reservedW += usedW;
            if (result && (result.status === 'authority-blocked' || result.faultLocked || (grantW <= 0 && reqW > 0)))
                blockedCount += 1;
            if (centralReady && usedW > 0) {
                central.reserve({
                    key: `nexoLogic:${text(intent.key)}`,
                    app: 'nexoLogic',
                    label: `NexoLogic ${text(intent.graphId)}/${text(intent.nodeId)}`,
                    priority: Math.max(0, Math.round(num(intent.budgetPriority, 900))),
                    requestedW: reqW,
                    reserveW: usedW,
                    pvReserveW: intent.budgetMode === 'pv' ? usedW : 0,
                    actualW: usedW,
                    pvOnly: intent.budgetMode === 'pv',
                    mode: intent.budgetMode,
                });
            }
            diagnostics.push({
                key: intent.key,
                owner: intent.owner,
                targetId: intent.targetId,
                budgetMode: intent.budgetMode,
                requestedW: Math.round(reqW),
                grantW: Math.round(grantW),
                reservedW: Math.round(usedW),
                releasePending,
                status: text(result?.status || grantSource),
            });
        }
        await Promise.all([
            this.set('status', !centralReady && rows.length ? 'central-budget-missing' : (blockedCount ? 'limited' : (rows.length ? 'active' : 'idle'))),
            this.set('intentCount', rows.length),
            this.set('requestedW', Math.round(requestedW)),
            this.set('grantedW', Math.round(grantedW)),
            this.set('reservedW', Math.round(reservedW)),
            this.set('blockedCount', blockedCount),
            this.set('intentsJson', JSON.stringify(diagnostics.slice(0, 100))),
        ]);
    }
}
exports.NexoLogicBudgetModule = NexoLogicBudgetModule;
module.exports = { NexoLogicBudgetModule };
