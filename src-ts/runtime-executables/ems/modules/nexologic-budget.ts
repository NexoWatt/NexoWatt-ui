// @runtime-transpile
'use strict';

/**
 * Datei: ems/modules/nexologic-budget.ts
 *
 * C3.4: Reserviert explizit budgetierte NexoLogic-Ausgaenge im zentralen
 * EMS-Budget. Nicht budgetierte Alt-Ausgaenge bleiben unveraendert ereignisgetrieben.
 */

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { BaseModule } = require('./base');

type AnyRecord = Record<string, any>;

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class NexoLogicBudgetModule extends BaseModule {
  public adapter: AnyRecord;
  public dp: AnyRecord | null;

  constructor(adapter: AnyRecord, dpRegistry: AnyRecord | null) {
    super(adapter, dpRegistry);
    this.adapter = adapter;
    this.dp = dpRegistry;
  }

  async init(): Promise<void> {
    const states: Record<string, readonly [string, string, string, string?]> = {
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

  private async set(name: string, value: unknown): Promise<void> {
    if (!this.adapter || this.adapter._nwShuttingDown) return;
    try {
      const id = `nexoLogic.control.${name}`;
      const current = await this.adapter.getStateAsync(id).catch(() => null);
      if (current && current.val === value) return;
      await this.adapter.setStateAsync(id, { val: value, ack: true });
    } catch (_error) {}
  }

  async tick(): Promise<void> {
    const engine = this.adapter?.logicEngine;
    const central = this.adapter?._emsBudget;
    const intents = engine && typeof engine.getBudgetIntents === 'function' ? engine.getBudgetIntents() : [];
    const rows = Array.isArray(intents) ? intents.slice().sort((a: AnyRecord, b: AnyRecord) => num(a?.budgetPriority, 900) - num(b?.budgetPriority, 900) || text(a?.key).localeCompare(text(b?.key))) : [];
    let requestedW = 0;
    let grantedW = 0;
    let reservedW = 0;
    let blockedCount = 0;
    const diagnostics: AnyRecord[] = [];
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
      if (result && (result.status === 'authority-blocked' || result.faultLocked || (grantW <= 0 && reqW > 0))) blockedCount += 1;
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

module.exports = { NexoLogicBudgetModule };
