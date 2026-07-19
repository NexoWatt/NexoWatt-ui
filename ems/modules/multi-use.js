/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/multi-use.ts
 * Quell-Hash: sha256:c5e332af1ba16116fc779687079b960e6ee169225250e0d43a515cfa1cfcec2d
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/multi-use.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';

/**
 * MultiUse ist fachlich die Speicher-Policy fuer SoC-Zonen (Reserve,
 * Lastspitzenkappung und Eigenverbrauch). Der einzige Batteriesollwert-Schreiber
 * bleibt storage-control.
 *
 * Ein alter, nicht mehr im AppCenter angebotener Verbraucherbereich bleibt nur
 * als explizit aktivierbarer Legacy-Kompatibilitaetsmodus erhalten. Ohne den
 * Schalter `multiUse.legacyFlexibleConsumersEnabled=true` schreibt dieses Modul
 * keinerlei Verbraucher- oder Speicher-Hardwarewerte und reserviert kein Budget.
 */
const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');
const { ReasonCodes, normalizeReason } = require('../reasons');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { ActuatorCommandContract } = require('../services/actuator-command-contract');

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}
function safeIdPart(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}
function normalizeType(value) {
  const type = String(value || '').trim().toLowerCase();
  return type === 'wallbox' ? 'evcs' : (type || 'load');
}
function normalizeBasis(value) {
  const basis = String(value || '').trim().toLowerCase();
  if (basis === 'a' || basis === 'current' || basis === 'currenta') return 'currentA';
  if (basis === 'w' || basis === 'power' || basis === 'powerw') return 'powerW';
  if (basis === 'none') return 'none';
  return basis || 'auto';
}
function floorToStep(value, step) {
  const n = Math.max(0, num(value, 0));
  const s = num(step, 0);
  if (s <= 0) return n;
  const output = Math.floor(n / s) * s;
  return output > 0 ? output : 0;
}
function wattsFromA(amps, voltageV, phases) {
  return Math.max(0, num(amps, 0)) * Math.max(1, num(voltageV, 230)) * Math.max(1, num(phases, 3));
}
function ampsFromW(watts, voltageV, phases) {
  const denominator = Math.max(1, num(voltageV, 230) * Math.max(1, num(phases, 3)));
  return Math.max(0, num(watts, 0)) / denominator;
}
function stateAgeMs(state, now = Date.now()) {
  const ts = Number(state && (state.lc || state.ts));
  return Number.isFinite(ts) && ts > 0 ? Math.max(0, now - ts) : Number.POSITIVE_INFINITY;
}
function normalizeBudgetMode(modeRaw, sourceRaw) {
  const mode = String(modeRaw || '').trim().toLowerCase();
  if (['pv', 'solar', 'surplus', 'pvsurplus'].includes(mode)) return 'pv';
  if (['total', 'grid', 'tariff', 'comfort', 'net'].includes(mode)) return 'total';
  return String(sourceRaw || '').toUpperCase() === 'PV' ? 'pv' : 'total';
}

class MultiUseModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._consumers = [];
    this._last = new Map();
    this._stateCache = new Map();
    this._actuatorContract = new ActuatorCommandContract();
    this._warnedLegacyConsumers = false;
  }

  _isEnabled() {
    return !!this.adapter?.config?.enableMultiUse;
  }
  _getCfg() {
    const cfg = this.adapter?.config?.multiUse || {};
    return cfg && typeof cfg === 'object' ? cfg : {};
  }
  _legacyConsumersEnabled() {
    return this._getCfg().legacyFlexibleConsumersEnabled === true;
  }
  _storagePolicyCfg() {
    const installer = this.adapter?.config?.installerConfig;
    const policy = installer && typeof installer.storageMultiUse === 'object' ? installer.storageMultiUse : null;
    return policy && typeof policy === 'object' ? policy : null;
  }
  _policySnapshot() {
    const policy = this._storagePolicyCfg();
    const active = !!(this._isEnabled() && policy && policy.enabled === true);
    const storage = this.adapter?.config?.storage || {};
    return {
      active,
      mode: active ? 'storage-policy' : 'inactive',
      hardwareWriter: 'storage-control',
      reserveEnabled: !!(active && storage.reserveEnabled),
      reserveMinSocPct: active ? num(storage.reserveMinSocPct, 0) : 0,
      reserveTargetSocPct: active ? num(storage.reserveTargetSocPct, 0) : 0,
      peakEnabled: !!(active && storage.lskEnabled !== false && storage.lskDischargeEnabled !== false),
      lskMinSocPct: active ? num(storage.lskMinSocPct, 0) : 0,
      lskMaxSocPct: active ? num(storage.lskMaxSocPct, 0) : 0,
      selfEnabled: !!(active && storage.selfDischargeEnabled !== false),
      selfMinSocPct: active ? num(storage.selfMinSocPct, 0) : 0,
      selfMaxSocPct: active ? num(storage.selfMaxSocPct, 100) : 100,
      legacyConsumersConfigured: this._consumers.length,
      legacyConsumersEnabled: this._legacyConsumersEnabled(),
    };
  }
  async _publishPolicyStates(now = Date.now()) {
    const snapshot = this._policySnapshot();
    await this._setStateIfChanged('multiUse.policy.active', snapshot.active);
    await this._setStateIfChanged('multiUse.policy.mode', snapshot.mode);
    await this._setStateIfChanged('multiUse.policy.hardwareWriter', snapshot.hardwareWriter);
    await this._setStateIfChanged('multiUse.policy.reserveEnabled', snapshot.reserveEnabled);
    await this._setStateIfChanged('multiUse.policy.reserveMinSocPct', snapshot.reserveMinSocPct);
    await this._setStateIfChanged('multiUse.policy.reserveTargetSocPct', snapshot.reserveTargetSocPct);
    await this._setStateIfChanged('multiUse.policy.peakEnabled', snapshot.peakEnabled);
    await this._setStateIfChanged('multiUse.policy.lskMinSocPct', snapshot.lskMinSocPct);
    await this._setStateIfChanged('multiUse.policy.lskMaxSocPct', snapshot.lskMaxSocPct);
    await this._setStateIfChanged('multiUse.policy.selfEnabled', snapshot.selfEnabled);
    await this._setStateIfChanged('multiUse.policy.selfMinSocPct', snapshot.selfMinSocPct);
    await this._setStateIfChanged('multiUse.policy.selfMaxSocPct', snapshot.selfMaxSocPct);
    await this._setStateIfChanged('multiUse.policy.legacyConsumersConfigured', snapshot.legacyConsumersConfigured);
    await this._setStateIfChanged('multiUse.policy.legacyConsumersEnabled', snapshot.legacyConsumersEnabled);
    await this._setStateIfChanged('multiUse.policy.legacyConsumersIgnored', snapshot.legacyConsumersConfigured > 0 && !snapshot.legacyConsumersEnabled);
    await this._setStateIfChanged('multiUse.policy.lastUpdate', now);
    return snapshot;
  }
  _loadConsumersFromConfig() {
    const rows = Array.isArray(this._getCfg().consumers) ? this._getCfg().consumers : [];
    const usedIds = new Set();
    this._consumers = rows.map((row, index) => {
      const r = row || {};
      const key = String(r.key || '').trim();
      if (!key) return null;
      const base = safeIdPart(key) || `consumer_${index + 1}`;
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) id = `${base}_${suffix++}`;
      usedIds.add(id);
      return {
        id,
        key,
        name: String(r.name || key),
        type: normalizeType(r.type),
        priority: num(r.priority, 100),
        controlBasis: normalizeBasis(r.controlBasis),
        setAId: String(r.setAId || r.setCurrentAId || '').trim(),
        setWId: String(r.setWId || r.setPowerWId || '').trim(),
        enableId: String(r.enableId || '').trim(),
        setAKey: String(r.setAKey || '').trim(),
        setWKey: String(r.setWKey || '').trim(),
        enableKey: String(r.enableKey || '').trim(),
        actualWId: String(r.actualWId || r.powerReadId || '').trim(),
        actualWKey: String(r.actualWKey || '').trim(),
        budgetMode: String(r.budgetMode || r.energySource || '').trim().toLowerCase(),
        requireReadback: r.requireReadback === true,
        readbackTimeoutSec: num(r.readbackTimeoutSec, 5),
        retryDelaySec: num(r.retryDelaySec, 3),
        maxRetries: num(r.maxRetries, 3),
        faultLockSec: num(r.faultLockSec, 60),
        defaultTargetW: num(r.defaultTargetW, 0),
        defaultTargetA: num(r.defaultTargetA, 0),
      };
    }).filter(Boolean).sort((a, b) => num(a.priority, 100) - num(b.priority, 100) || String(a.key).localeCompare(String(b.key)));
  }

  async _setStateIfChanged(id, value) {
    const normalized = typeof value === 'number' && !Number.isFinite(value) ? null : value;
    if (this._stateCache.get(id) === normalized) return;
    this._stateCache.set(id, normalized);
    await this.adapter.setStateAsync(id, normalized, true);
  }

  async _seedLastFromStates() {
    const legacyConsumersEnabled = this._legacyConsumersEnabled();
    for (const consumer of (legacyConsumersEnabled ? this._consumers : [])) {
      const base = `multiUse.consumers.${consumer.id}`;
      const read = (suffix) => this.adapter.getStateAsync(`${base}.${suffix}`).catch(() => null);
      const [targetW, targetA, requestW, allocatedW, allocatedA, basis, applied, status, reason] = await Promise.all([
        read('targetW'), read('targetA'), read('requestW'), read('allocatedW'), read('allocatedA'),
        read('basis'), read('applied'), read('status'), read('reason'),
      ]);
      this._last.set(consumer.id, {
        reqTargetW: num(targetW?.val, 0),
        reqTargetA: num(targetA?.val, 0),
        requestedW: num(requestW?.val, 0),
        allocatedW: num(allocatedW?.val, 0),
        allocatedA: num(allocatedA?.val, 0),
        basis: String(basis?.val || consumer.controlBasis || 'auto'),
        applied: !!applied?.val,
        status: String(status?.val || ''),
        reason: normalizeReason(reason?.val || ReasonCodes.OK),
      });
    }
  }

  async init() {
    if (!this._isEnabled()) return;
    this._loadConsumersFromConfig();
    const legacyConsumersEnabled = this._legacyConsumersEnabled();
    for (const consumer of (legacyConsumersEnabled ? this._consumers : [])) {
      const baseKey = `mu.${consumer.id}`;
      try {
        if (consumer.setWId && !consumer.setWKey) {
          await this.dp.upsert({ key: `${baseKey}.setW`, objectId: consumer.setWId, dataType: 'number', direction: 'out', unit: 'W' });
          consumer.setWKey = `${baseKey}.setW`;
        }
        if (consumer.setAId && !consumer.setAKey) {
          await this.dp.upsert({ key: `${baseKey}.setA`, objectId: consumer.setAId, dataType: 'number', direction: 'out', unit: 'A' });
          consumer.setAKey = `${baseKey}.setA`;
        }
        if (consumer.enableId && !consumer.enableKey) {
          await this.dp.upsert({ key: `${baseKey}.enable`, objectId: consumer.enableId, dataType: 'boolean', direction: 'out', unit: '' });
          consumer.enableKey = `${baseKey}.enable`;
        }
        if (consumer.actualWId && !consumer.actualWKey) {
          await this.dp.upsert({ key: `${baseKey}.actualW`, objectId: consumer.actualWId, dataType: 'number', direction: 'in', unit: 'W' });
          consumer.actualWKey = `${baseKey}.actualW`;
        }
      } catch (error) {
        this.adapter.log.warn(`[multiUse] datapoint upsert failed for '${consumer.key}': ${error?.message || error}`);
      }
    }
    const cfg = this._getCfg();
    if (legacyConsumersEnabled) {
      try {
        if (cfg.externalLimitWId && !cfg.externalLimitWKey) await this.dp.upsert({ key: 'mu.externalLimitW', objectId: cfg.externalLimitWId, dataType: 'number', direction: 'in', unit: 'W' });
        if (cfg.tariffBudgetWId && !cfg.tariffBudgetWKey) await this.dp.upsert({ key: 'mu.tariffBudgetW', objectId: cfg.tariffBudgetWId, dataType: 'number', direction: 'in', unit: 'W' });
        if (cfg.pvBudgetWId && !cfg.pvBudgetWKey) await this.dp.upsert({ key: 'mu.pvBudgetW', objectId: cfg.pvBudgetWId, dataType: 'number', direction: 'in', unit: 'W' });
      } catch (error) {
        this.adapter.log.warn(`[multiUse] legacy budget datapoint upsert failed: ${error?.message || error}`);
      }
    }

    const mkChannel = (id, name, native = {}) => this.adapter.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native });
    const mkState = (id, name, type, role, def, unit = '') => this.adapter.setObjectNotExistsAsync(id, {
      type: 'state', common: { name, type, role, read: true, write: false, def, ...(unit ? { unit } : {}) }, native: {},
    });
    await mkChannel('multiUse', 'Multi-Use');
    await mkChannel('multiUse.control', 'Control');
    await mkChannel('multiUse.policy', 'Storage Policy');
    await mkChannel('multiUse.summary', 'Summary');
    await mkChannel('multiUse.consumers', 'Legacy Flexible Consumers');
    for (const [suffix, name, type, role, def, unit] of [
      ['active', 'Storage policy active', 'boolean', 'indicator.working', false],
      ['mode', 'Policy mode', 'string', 'text', 'inactive'],
      ['hardwareWriter', 'Battery hardware writer', 'string', 'text', 'storage-control'],
      ['reserveEnabled', 'Reserve zone enabled', 'boolean', 'indicator', false],
      ['reserveMinSocPct', 'Reserve minimum SoC', 'number', 'value.battery', 0, '%'],
      ['reserveTargetSocPct', 'Reserve target SoC', 'number', 'value.battery', 0, '%'],
      ['peakEnabled', 'Peak-shaving zone enabled', 'boolean', 'indicator', false],
      ['lskMinSocPct', 'Peak zone minimum SoC', 'number', 'value.battery', 0, '%'],
      ['lskMaxSocPct', 'Peak zone maximum SoC', 'number', 'value.battery', 0, '%'],
      ['selfEnabled', 'Self-consumption zone enabled', 'boolean', 'indicator', false],
      ['selfMinSocPct', 'Self-consumption minimum SoC', 'number', 'value.battery', 0, '%'],
      ['selfMaxSocPct', 'Self-consumption maximum SoC', 'number', 'value.battery', 100, '%'],
      ['legacyConsumersConfigured', 'Legacy consumers configured', 'number', 'value', 0],
      ['legacyConsumersEnabled', 'Legacy consumers explicitly enabled', 'boolean', 'indicator', false],
      ['legacyConsumersIgnored', 'Legacy consumers ignored', 'boolean', 'indicator', false],
      ['lastUpdate', 'Policy update', 'number', 'value.time', 0],
    ]) await mkState(`multiUse.policy.${suffix}`, name, type, role, def, unit);
    for (const [suffix, name, type, role, def, unit] of [
      ['active', 'Active', 'boolean', 'indicator.working', false],
      ['status', 'Status', 'string', 'text', 'init'],
      ['lastTickTs', 'Last tick', 'number', 'value.time', 0],
      ['reason', 'Reason', 'string', 'text', ReasonCodes.OK],
      ['requestW', 'Requested budget', 'number', 'value.power', 0, 'W'],
      ['capW', 'Budget cap', 'number', 'value.power', 0, 'W'],
      ['budgetW', 'Effective budget', 'number', 'value.power', 0, 'W'],
      ['budgetSource', 'Budget source', 'string', 'text', 'NONE'],
      ['capSources', 'Cap sources', 'string', 'text', ''],
      ['reserveW', 'Reserve deducted', 'number', 'value.power', 0, 'W'],
      ['centralBudgetActive', 'Central budget active', 'boolean', 'indicator', false],
      ['centralGrantW', 'Central grant', 'number', 'value.power', 0, 'W'],
      ['centralReservedW', 'Central reserved', 'number', 'value.power', 0, 'W'],
      ['centralPvReservedW', 'Central PV reserved', 'number', 'value.power', 0, 'W'],
      ['centralBudgetStatus', 'Central budget status', 'string', 'text', 'init'],
    ]) await mkState(`multiUse.control.${suffix}`, name, type, role, def, unit);
    await mkState('multiUse.summary.remainingBudgetW', 'Remaining budget', 'number', 'value.power', 0, 'W');
    await mkState('multiUse.summary.consumerCount', 'Consumers configured', 'number', 'value', 0);
    await mkState('multiUse.summary.appliedCount', 'Consumers applied', 'number', 'value', 0);

    for (const consumer of this._consumers) {
      const base = `multiUse.consumers.${consumer.id}`;
      await mkChannel(base, consumer.name || consumer.key, { key: consumer.key, type: consumer.type });
      for (const [suffix, name, type, role, def, unit, write] of [
        ['key', 'Key', 'string', 'text', consumer.key],
        ['type', 'Type', 'string', 'text', consumer.type],
        ['priority', 'Priority', 'number', 'value', num(consumer.priority, 100)],
        ['targetW', 'Target power', 'number', 'level.power', num(consumer.defaultTargetW, 0), 'W', true],
        ['targetA', 'Target current', 'number', 'level.current', num(consumer.defaultTargetA, 0), 'A', true],
        ['basis', 'Applied control basis', 'string', 'text', consumer.controlBasis],
        ['requestW', 'Requested power', 'number', 'value.power', 0, 'W'],
        ['allocatedW', 'Allocated power', 'number', 'value.power', 0, 'W'],
        ['allocatedA', 'Allocated current', 'number', 'value.current', 0, 'A'],
        ['applied', 'Applied', 'boolean', 'indicator', false],
        ['status', 'Status', 'string', 'text', 'init'],
        ['reason', 'Reason', 'string', 'text', ReasonCodes.OK],
        ['lastAppliedTs', 'Last applied', 'number', 'value.time', 0],
        ['owner', 'Actuator owner', 'string', 'text', ''],
        ['budgetMode', 'Central budget', 'string', 'text', ''],
        ['writeAccepted', 'Write accepted', 'boolean', 'indicator', false],
        ['readbackOk', 'Readback OK', 'boolean', 'indicator', false],
        ['writePending', 'Write pending', 'boolean', 'indicator', false],
        ['retryCount', 'Retries', 'number', 'value', 0],
        ['faultLocked', 'Fault locked', 'boolean', 'indicator', false],
        ['writeContractStatus', 'Write contract status', 'string', 'text', ''],
        ['reservedW', 'Central reserved power', 'number', 'value.power', 0, 'W'],
      ]) {
        await this.adapter.setObjectNotExistsAsync(`${base}.${suffix}`, {
          type: 'state', common: { name, type, role, read: true, write: write === true, def, ...(unit ? { unit } : {}) }, native: {},
        });
      }
    }
    await this._setStateIfChanged('multiUse.summary.consumerCount', legacyConsumersEnabled ? this._consumers.length : 0);
    await this._publishPolicyStates(Date.now());
    if (legacyConsumersEnabled) await this._seedLastFromStates().catch(() => undefined);
    else if (this._consumers.length > 0 && !this._warnedLegacyConsumers) {
      this._warnedLegacyConsumers = true;
      this.adapter.log.warn(`[multiUse] ${this._consumers.length} legacy flexible consumer(s) configured but ignored. MultiUse is storage-policy-only; set multiUse.legacyFlexibleConsumersEnabled=true only for temporary migration.`);
    }
  }

  _consumerOwner(consumer) {
    return `multiUse.${consumer.id}`;
  }
  _consumerActuatorIds(consumer) {
    const ids = [];
    for (const key of [consumer.setWKey, consumer.setAKey, consumer.enableKey]) {
      try {
        const id = String(key && this.dp?.getEntry?.(key)?.objectId || '').trim();
        if (id && !ids.includes(id)) ids.push(id);
      } catch (_error) {}
    }
    return ids;
  }
  _consumerHasExclusiveAuthority(consumer, owner) {
    const matrix = this.adapter?._stageAActuatorOwnerById;
    const ids = this._consumerActuatorIds(consumer);
    if (!ids.length || !matrix || typeof matrix !== 'object') return false;
    return ids.every((id) => {
      const owners = Array.isArray(matrix[id]?.activeOwners) ? matrix[id].activeOwners.map((value) => String(value || '').trim()).filter(Boolean) : [];
      return owners.length === 1 && owners[0] === owner;
    });
  }
  _contractCfg(consumer) {
    return {
      requireReadback: consumer.requireReadback === true && !!consumer.actualWKey,
      ackTimeoutMs: Math.max(250, Math.round(num(consumer.readbackTimeoutSec, 5) * 1000)),
      retryDelayMs: Math.max(250, Math.round(num(consumer.retryDelaySec, 3) * 1000)),
      maxRetries: Math.max(0, Math.round(num(consumer.maxRetries, 3))),
      faultLockMs: Math.max(1000, Math.round(num(consumer.faultLockSec, 60) * 1000)),
    };
  }
  _readActualW(consumer, staleMs) {
    try {
      if (!consumer.actualWKey || typeof this.dp?.getNumberFresh !== 'function') return null;
      const value = this.dp.getNumberFresh(consumer.actualWKey, staleMs, null);
      return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;
    } catch (_error) {
      return null;
    }
  }
  _basis(consumer) {
    const configured = String(consumer.controlBasis || 'auto');
    if (configured !== 'auto') return configured;
    if (consumer.type === 'load' || consumer.setWKey) return 'powerW';
    if (consumer.setAKey) return 'currentA';
    return 'none';
  }
  async _publishContract(base, owner, budgetMode, reservedW, result) {
    await this._setStateIfChanged(`${base}.owner`, owner);
    await this._setStateIfChanged(`${base}.budgetMode`, budgetMode);
    await this._setStateIfChanged(`${base}.reservedW`, Math.round(Math.max(0, num(reservedW, 0))));
    await this._setStateIfChanged(`${base}.writeAccepted`, !!result.accepted);
    await this._setStateIfChanged(`${base}.readbackOk`, result.readbackOk === true);
    await this._setStateIfChanged(`${base}.writePending`, !!result.pending);
    await this._setStateIfChanged(`${base}.retryCount`, Math.max(0, Math.round(num(result.retryCount, 0))));
    await this._setStateIfChanged(`${base}.faultLocked`, !!result.faultLocked);
    await this._setStateIfChanged(`${base}.writeContractStatus`, String(result.status || ''));
  }
  async _applyConsumerCommand(consumer, target, reason, staleMs) {
    const owner = this._consumerOwner(consumer);
    const key = `multiUse:${consumer.id}`;
    const contractCfg = this._contractCfg(consumer);
    const now = Date.now();
    const requestedW = Math.max(0, num(target?.targetW, 0));
    const actualBefore = this._readActualW(consumer, staleMs);
    const toleranceW = Math.max(50, requestedW * 0.03);
    const readbackBefore = actualBefore === null ? null : Math.abs(actualBefore - requestedW) <= toleranceW;
    const confirmed = this._actuatorContract.confirmFromReadback(key, target, actualBefore, readbackBefore === true, now);
    if (confirmed) return { applied: true, accepted: true, confirmed: true, readbackOk: true, status: confirmed.status, contract: confirmed, owner };
    const decision = this._actuatorContract.prepare(key, target, now, contractCfg);
    if (!decision.allowed) {
      const current = this._actuatorContract.result(key, now, decision.targetChanged);
      return { applied: false, accepted: false, confirmed: false, readbackOk: current.readbackOk, status: current.status, contract: current, owner };
    }
    const writeResult = await withActuatorShadowContext(this.adapter, {
      owner,
      module: 'multiUse',
      priority: priorityForOwner(owner),
      reason,
      leaseMs: 20000,
      kind: 'multiuse-consumer',
      enforceAuthority: this._consumerHasExclusiveAuthority(consumer, owner),
      releaseAuthority: requestedW <= 0,
    }, () => applySetpoint({ adapter: this.adapter, dp: this.dp }, consumer, target));
    const accepted = writeResult?.applied === true;
    const actualAfter = this._readActualW(consumer, staleMs);
    const readbackOk = actualAfter === null ? null : Math.abs(actualAfter - requestedW) <= toleranceW;
    const contract = this._actuatorContract.complete(key, target, accepted, readbackOk, actualAfter, Date.now(), contractCfg);
    return { ...writeResult, applied: contract.confirmed, accepted, confirmed: contract.confirmed, readbackOk, status: contract.status, contract, owner };
  }

  _budgetDemand(cfg, staleMs) {
    let source = 'CENTRAL';
    let capW = Number.POSITIVE_INFINITY;
    let tariffKey = String(cfg.tariffBudgetWKey || '').trim();
    let pvKey = String(cfg.pvBudgetWKey || '').trim();
    if (!tariffKey) {
      const mode = String(cfg.tariffBudgetMode || 'vis').trim().toLowerCase();
      tariffKey = ['vis', 'tarif', 'tariff'].includes(mode) ? 'cm.tariffBudgetW' : (['dp', 'datapoint'].includes(mode) ? 'mu.tariffBudgetW' : '');
    }
    if (!pvKey) {
      const mode = String(cfg.pvBudgetMode || 'surplus').trim().toLowerCase();
      pvKey = ['surplus', 'pv', 'pvsurplus'].includes(mode) ? 'cm.pvSurplusW' : (['dp', 'datapoint'].includes(mode) ? 'mu.pvBudgetW' : '');
    }
    const fresh = (key) => {
      if (!key || typeof this.dp?.getNumberFresh !== 'function') return null;
      const value = this.dp.getNumberFresh(key, staleMs, null);
      return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;
    };
    const tariffW = fresh(tariffKey);
    const pvW = fresh(pvKey);
    if (tariffW !== null && tariffW > 0) {
      source = 'TARIFF';
      capW = tariffW;
    } else if (pvW !== null && pvW > 0) {
      source = 'PV';
      capW = pvW;
    } else if (Math.max(0, num(cfg.comfortBudgetW, 0)) > 0) {
      source = 'COMFORT';
      capW = Math.max(0, num(cfg.comfortBudgetW, 0));
    }
    return { source, capW };
  }

  _targetForConsumer(consumer, basis, targetW, targetA) {
    const type = normalizeType(consumer.type);
    if (type === 'setpoint') return { targetW, targetA, basis, setpoint: targetW, enable: targetW > 0 };
    if (type === 'sgready' || type === 'sg-ready' || type === 'sg_ready') return { targetW, targetA, basis, state: targetW > 0 ? 'on' : 'off' };
    return { targetW, targetA, basis };
  }

  async _hardCap(cfg, staleMs) {
    let capW = Number.POSITIVE_INFINITY;
    const sources = [];
    let reason = ReasonCodes.OK;
    const peakReason = String((await this.adapter.getStateAsync('peakShaving.control.reason').catch(() => null))?.val || '').trim();
    if (peakReason === ReasonCodes.STALE_METER) {
      capW = 0;
      sources.push('NET_STALE');
      reason = ReasonCodes.STALE_METER;
    }
    let externalKey = String(cfg.externalLimitWKey || '').trim();
    if (!externalKey && cfg.externalLimitWId) externalKey = 'mu.externalLimitW';
    if (externalKey && typeof this.dp?.isStale === 'function' && typeof this.dp?.getNumberFresh === 'function') {
      if (this.dp.isStale(externalKey, staleMs)) {
        capW = 0;
        sources.push('EXTERNAL_STALE');
        reason = ReasonCodes.STALE_METER;
      } else {
        const value = this.dp.getNumberFresh(externalKey, staleMs, null);
        if (!Number.isFinite(value)) {
          capW = 0;
          sources.push('EXTERNAL_INVALID');
          reason = ReasonCodes.STALE_METER;
        } else {
          capW = Math.min(capW, Math.max(0, value));
          sources.push('EXTERNAL');
        }
      }
    }
    const peakActive = !!(await this.adapter.getStateAsync('peakShaving.control.active').catch(() => null))?.val;
    if (peakActive) {
      const availableState = await this.adapter.getStateAsync('peakShaving.dynamic.availableForControlledW').catch(() => null);
      const available = Number(availableState?.val);
      if (!Number.isFinite(available) || stateAgeMs(availableState) > staleMs) {
        capW = 0;
        sources.push('PEAK_STALE');
        reason = ReasonCodes.STALE_METER;
      } else {
        capW = Math.min(capW, Math.max(0, available));
        sources.push('PEAK');
      }
    }
    return { capW, sources, reason };
  }

  async tick() {
    if (!this._isEnabled()) return;
    const now = Date.now();
    const policy = await this._publishPolicyStates(now);
    if (!this._legacyConsumersEnabled()) {
      await this._setStateIfChanged('multiUse.control.active', policy.active);
      await this._setStateIfChanged('multiUse.control.status', policy.active ? 'storage-policy-only' : 'inactive');
      await this._setStateIfChanged('multiUse.control.reason', policy.active ? ReasonCodes.OK : ReasonCodes.SKIPPED);
      await this._setStateIfChanged('multiUse.control.lastTickTs', now);
      await this._setStateIfChanged('multiUse.control.requestW', 0);
      await this._setStateIfChanged('multiUse.control.capW', 0);
      await this._setStateIfChanged('multiUse.control.budgetW', 0);
      await this._setStateIfChanged('multiUse.control.budgetSource', 'STORAGE_POLICY');
      await this._setStateIfChanged('multiUse.control.capSources', 'STORAGE_CONTROL');
      await this._setStateIfChanged('multiUse.control.reserveW', 0);
      await this._setStateIfChanged('multiUse.control.centralBudgetActive', false);
      await this._setStateIfChanged('multiUse.control.centralGrantW', 0);
      await this._setStateIfChanged('multiUse.control.centralReservedW', 0);
      await this._setStateIfChanged('multiUse.control.centralPvReservedW', 0);
      await this._setStateIfChanged('multiUse.control.centralBudgetStatus', 'not-required-storage-policy');
      await this._setStateIfChanged('multiUse.summary.consumerCount', 0);
      await this._setStateIfChanged('multiUse.summary.appliedCount', 0);
      await this._setStateIfChanged('multiUse.summary.remainingBudgetW', 0);
      return;
    }
    const cfg = this._getCfg();
    const staleMs = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600) * 1000;
    const voltageV = clamp(num(cfg.voltageV, 230), 100, 260);
    const phases = clamp(num(cfg.defaultPhases, 3), 1, 3);
    const stepW = clamp(num(cfg.stepW, 0), 0, 5000);
    const stepA = clamp(num(cfg.stepA, 0), 0, 100);
    const reserveW = cfg.reserveEnabled ? clamp(num(cfg.reserveMinW, 0), 0, 100000) : 0;
    const stopReleaseHoldMs = clamp(num(cfg.stopReleaseHoldSec, 5), 0, 60) * 1000;
    const demand = this._budgetDemand(cfg, staleMs);
    const hardCap = await this._hardCap(cfg, staleMs);
    let localCapW = Math.min(demand.capW, hardCap.capW);
    if (Number.isFinite(localCapW)) localCapW = Math.max(0, localCapW - reserveW);

    const central = this.adapter?._emsBudget;
    const centralReady = !!(central && typeof central.getPvGrant === 'function' && typeof central.getTotalGrant === 'function' && typeof central.reserve === 'function');
    const plans = [];
    let totalRequestedW = 0;
    for (const consumer of this._consumers) {
      const base = `multiUse.consumers.${consumer.id}`;
      const [stateW, stateA] = await Promise.all([
        this.adapter.getStateAsync(`${base}.targetW`).catch(() => null),
        this.adapter.getStateAsync(`${base}.targetA`).catch(() => null),
      ]);
      const reqTargetW = Math.max(0, num(stateW?.val, 0));
      const reqTargetA = Math.max(0, num(stateA?.val, 0));
      const basis = this._basis(consumer);
      const requestedW = Math.max(0, reqTargetW > 0 ? reqTargetW : wattsFromA(reqTargetA, voltageV, phases));
      const budgetMode = normalizeBudgetMode(consumer.budgetMode, demand.source);
      totalRequestedW += requestedW;
      plans.push({ consumer, base, reqTargetW, reqTargetA, basis, requestedW, budgetMode });
    }

    let localRemainingW = localCapW;
    let centralGrantTotalW = 0;
    let centralReservedW = 0;
    let centralPvReservedW = 0;
    let appliedCount = 0;
    let controlReason = hardCap.reason;
    const safetyStop = hardCap.reason === ReasonCodes.STALE_METER || !centralReady;
    if (!centralReady && controlReason === ReasonCodes.OK) controlReason = ReasonCodes.NO_BUDGET;

    for (const plan of plans) {
      const { consumer, base, reqTargetW, reqTargetA, basis, requestedW, budgetMode } = plan;
      const previous = this._last.get(consumer.id) || {};
      const actualBefore = this._readActualW(consumer, staleMs);
      let allocatedW = 0;
      let allocatedA = 0;
      let reason = ReasonCodes.OK;
      let status = 'idle';
      let result = { applied: false, accepted: false, confirmed: false, readbackOk: null, status: 'idle', contract: this._actuatorContract.result(`multiUse:${consumer.id}`, now), owner: this._consumerOwner(consumer) };

      if (!safetyStop && requestedW > 0 && basis !== 'none') {
        const requestedWithinLocalW = Number.isFinite(localRemainingW) ? Math.min(requestedW, Math.max(0, localRemainingW)) : requestedW;
        const grant = budgetMode === 'pv'
          ? central.getPvGrant({ key: `multiUse:${consumer.id}`, app: 'multiUse', priority: consumer.priority, requestedW: requestedWithinLocalW, applyEvcsAllocationCap: false })
          : central.getTotalGrant({ key: `multiUse:${consumer.id}`, app: 'multiUse', priority: consumer.priority, requestedW: requestedWithinLocalW });
        const grantW = Math.max(0, Math.min(requestedWithinLocalW, num(grant?.grantW, 0)));
        centralGrantTotalW += grantW;
        if (basis === 'currentA') {
          allocatedA = floorToStep(ampsFromW(grantW, voltageV, phases), stepA);
          allocatedW = wattsFromA(allocatedA, voltageV, phases);
        } else {
          allocatedW = floorToStep(grantW, stepW);
        }
        if (allocatedW > 0) {
          status = allocatedW + 0.5 < requestedW ? 'central-budget-limited' : 'central-budget-allocated';
          reason = allocatedW + 0.5 < requestedW ? ReasonCodes.LIMITED_BY_BUDGET : ReasonCodes.ALLOCATED;
        } else {
          status = 'central-budget-zero';
          reason = ReasonCodes.NO_BUDGET;
        }
      } else if (safetyStop && requestedW > 0) {
        status = centralReady ? 'failsafe-stale' : 'central-budget-missing';
        reason = centralReady ? ReasonCodes.STALE_METER : ReasonCodes.NO_BUDGET;
      } else if (basis === 'none') {
        status = 'control-disabled';
        reason = ReasonCodes.CONTROL_DISABLED;
      } else {
        status = 'target-zero';
        reason = ReasonCodes.SKIPPED;
      }

      const previousReservedW = Math.max(0, num(previous.reservedW, num(previous.allocatedW, 0)));
      const previouslyActive = Math.max(previousReservedW, num(actualBefore, 0)) > 1;
      const previousStopAcceptedTs = Math.max(0, num(previous.stopAcceptedTs, 0));
      const stopAlreadyAccepted = allocatedW <= 0 && previousStopAcceptedTs > 0;
      if (allocatedW > 0 || (basis !== 'none' && previouslyActive && !stopAlreadyAccepted)) {
        const target = this._targetForConsumer(consumer, basis, allocatedW, allocatedA);
        result = await this._applyConsumerCommand(consumer, target, status, staleMs);
      } else if (stopAlreadyAccepted) {
        const contract = this._actuatorContract.result(`multiUse:${consumer.id}`, now);
        result = { applied: true, accepted: true, confirmed: true, readbackOk: contract.readbackOk, status: 'stop-accepted-hold', contract, owner: this._consumerOwner(consumer) };
      } else if (allocatedW <= 0) {
        this._actuatorContract.release(`multiUse:${consumer.id}`);
      }

      const actualAfter = this._readActualW(consumer, staleMs);
      const actualW = actualAfter !== null ? actualAfter : actualBefore;
      const accepted = result.accepted === true || result.confirmed === true;
      let stopAcceptedTs = allocatedW <= 0
        ? (previousStopAcceptedTs || (accepted && previouslyActive ? now : 0))
        : 0;
      let reservedW = 0;
      if (allocatedW > 0) {
        reservedW = accepted
          ? Math.max(allocatedW, actualW === null ? 0 : actualW)
          : Math.max(previousReservedW, actualW === null ? 0 : actualW);
      } else if (previouslyActive) {
        if (actualW !== null) reservedW = Math.max(0, actualW);
        else if (!accepted) reservedW = previousReservedW;
        else if (stopAcceptedTs > 0 && now - stopAcceptedTs < stopReleaseHoldMs) reservedW = previousReservedW;
        else stopAcceptedTs = 0;
      }
      if (Number.isFinite(localRemainingW)) localRemainingW = Math.max(0, localRemainingW - reservedW);
      if (centralReady && reservedW > 0) {
        central.reserve({
          key: `multiUse:${consumer.id}`,
          app: 'multiUse',
          label: consumer.name,
          priority: 250 + Math.max(0, num(consumer.priority, 100)),
          requestedW,
          // Jede physische Last belegt das Gesamtbudget. PV-Verbrauch reduziert
          // zusaetzlich das zentrale PV-Restbudget.
          reserveW: reservedW,
          pvReserveW: budgetMode === 'pv' ? reservedW : 0,
          actualW: actualW === null ? reservedW : actualW,
          pvOnly: budgetMode === 'pv',
          mode: budgetMode,
        });
        centralReservedW += reservedW;
        if (budgetMode === 'pv') centralPvReservedW += reservedW;
      }

      if (accepted) appliedCount++;
      const contract = result.contract || this._actuatorContract.result(`multiUse:${consumer.id}`, now);
      await this._publishContract(base, result.owner || this._consumerOwner(consumer), budgetMode, reservedW, contract);
      const mappedReason = String(result.status || '').includes('failed') || String(result.status || '').includes('fault')
        ? ReasonCodes.UNKNOWN
        : reason;
      const next = {
        reqTargetW,
        reqTargetA,
        requestedW: Math.round(requestedW),
        allocatedW: Math.round(allocatedW),
        allocatedA,
        basis,
        applied: !!result.confirmed || (result.accepted === true && consumer.requireReadback !== true),
        writeAccepted: result.accepted === true,
        reservedW: Math.round(reservedW),
        stopAcceptedTs,
        status: String(result.status || status),
        reason: mappedReason,
      };
      this._last.set(consumer.id, next);
      await this._setStateIfChanged(`${base}.basis`, basis);
      await this._setStateIfChanged(`${base}.requestW`, next.requestedW);
      await this._setStateIfChanged(`${base}.allocatedW`, next.allocatedW);
      await this._setStateIfChanged(`${base}.allocatedA`, Number.isFinite(allocatedA) ? Number(allocatedA.toFixed(3)) : 0);
      await this._setStateIfChanged(`${base}.applied`, next.applied);
      await this._setStateIfChanged(`${base}.status`, next.status);
      await this._setStateIfChanged(`${base}.reason`, next.reason);
      await this._setStateIfChanged(`${base}.lastAppliedTs`, now);
    }

    const finalPeek = centralReady && typeof central.peek === 'function' ? central.peek() : null;
    const centralRemainingW = demand.source === 'PV'
      ? Math.max(0, num(finalPeek?.remainingPvW, 0))
      : (finalPeek?.remainingTotalW === null ? Number.POSITIVE_INFINITY : Math.max(0, num(finalPeek?.remainingTotalW, 0)));
    let remainingBudgetW = Math.min(localRemainingW, centralRemainingW);
    if (!Number.isFinite(remainingBudgetW)) remainingBudgetW = 0;
    const status = !this._consumers.length ? 'no_consumers'
      : (safetyStop ? (centralReady ? 'failsafe-stale-meter' : 'central-budget-missing') : (totalRequestedW > 0 ? 'ok' : 'idle'));
    const capSources = ['CENTRAL_EMS', ...hardCap.sources];
    const initialCentralW = demand.source === 'PV'
      ? Math.max(0, num(this.adapter?._emsBudget?.remainingPvW, 0) + centralPvReservedW)
      : (Number.isFinite(num(this.adapter?._emsBudget?.remainingTotalW, Number.POSITIVE_INFINITY))
          ? Math.max(0, num(this.adapter?._emsBudget?.remainingTotalW, 0) + centralReservedW)
          : totalRequestedW);
    let effectiveBudgetW = Math.min(localCapW, initialCentralW, totalRequestedW);
    if (!Number.isFinite(effectiveBudgetW)) effectiveBudgetW = totalRequestedW;
    await this._setStateIfChanged('multiUse.control.active', totalRequestedW > 0 || safetyStop);
    await this._setStateIfChanged('multiUse.control.status', status);
    await this._setStateIfChanged('multiUse.control.reason', controlReason);
    await this._setStateIfChanged('multiUse.control.lastTickTs', now);
    await this._setStateIfChanged('multiUse.control.requestW', Math.round(totalRequestedW));
    await this._setStateIfChanged('multiUse.control.capW', Number.isFinite(localCapW) ? Math.round(localCapW) : 0);
    await this._setStateIfChanged('multiUse.control.budgetW', Math.round(Math.max(0, effectiveBudgetW)));
    await this._setStateIfChanged('multiUse.control.budgetSource', demand.source);
    await this._setStateIfChanged('multiUse.control.capSources', capSources.join(','));
    await this._setStateIfChanged('multiUse.control.reserveW', Math.round(reserveW));
    await this._setStateIfChanged('multiUse.control.centralBudgetActive', centralReady);
    await this._setStateIfChanged('multiUse.control.centralGrantW', Math.round(centralGrantTotalW));
    await this._setStateIfChanged('multiUse.control.centralReservedW', Math.round(centralReservedW));
    await this._setStateIfChanged('multiUse.control.centralPvReservedW', Math.round(centralPvReservedW));
    await this._setStateIfChanged('multiUse.control.centralBudgetStatus', centralReady ? 'central-grant-reserve' : 'missing');
    await this._setStateIfChanged('multiUse.summary.appliedCount', appliedCount);
    await this._setStateIfChanged('multiUse.summary.remainingBudgetW', Math.round(Math.max(0, remainingBudgetW)));
    if (this.adapter?.log?.debug) this.adapter.log.debug(`[multiUse] consumers=${this._consumers.length} requested=${Math.round(totalRequestedW)} applied=${appliedCount} central=${centralReady} reserved=${Math.round(centralReservedW)}W remaining=${Math.round(remainingBudgetW)}W`);
  }
}

module.exports = { MultiUseModule };
