#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.122: Eine aktive Speicherfarm startet die Basis-
 * Eigenverbrauchsoptimierung und verteilt den zentralen Sollwert anhand stabiler
 * Hardware-IDs. Ein leeres/veraltetes Status-JSON muss vor dem Dispatch neu
 * aufgebaut werden; nackte Array-Indizes dürfen die Speicher nicht vertauschen.
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');

const now = Date.now();
const internal = new Map();
const foreign = new Map();
const writes = [];

class AdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.stateCache = {};
    this.log = { debug() {}, info() {}, warn() {}, error() {}, silly() {} };
  }
  async setObjectNotExistsAsync() {}
  async getStateAsync(id) { return internal.get(String(id)) || null; }
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    const rec = { val, ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : !!ack, ts: Date.now(), lc: Date.now() };
    internal.set(String(id), rec);
    this.stateCache[String(id)] = { value: val, ts: rec.ts, lc: rec.lc, ack: rec.ack };
  }
  async getForeignStateAsync(id) { return foreign.get(String(id)) || null; }
  async getForeignObjectAsync(id) {
    const sid = String(id || '');
    const unit = sid.endsWith('.soc') ? '%' : 'W';
    return { type: 'state', common: { unit, write: sid.endsWith('.set') }, native: {} };
  }
  async setForeignStateAsync(id, value) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    writes.push({ id: String(id), val: Number(val) });
    foreign.set(String(id), { val, ack: false, ts: Date.now(), lc: Date.now() });
    return undefined;
  }
  setTimeout(fn, ms) { return setTimeout(fn, ms); }
  setInterval(fn, ms) { return setInterval(fn, ms); }
  clearTimeout(ref) { clearTimeout(ref); }
  clearInterval(ref) { clearInterval(ref); }
}

function expressStub() {
  return { use() {}, get() {}, post() {}, put() {}, delete() {}, listen() { return null; } };
}
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@iobroker/adapter-core') return { Adapter: AdapterStub };
  if (request === 'express') return expressStub;
  if (request === '@iobroker/type-detector') {
    const err = new Error('optional dependency intentionally absent in test');
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return originalLoad.call(this, request, parent, isMain);
};

(async () => {
  try {
    const factory = require(path.join(__dirname, '..', 'main.js'));
    const adapter = factory({});
    adapter.scheduleDerivedFlowUpdate = () => {};
    adapter.updateValue = function updateValue(key, value, ts) {
      this.stateCache[String(key)] = { value, ts: Number(ts) || Date.now(), lc: Number(ts) || Date.now(), ack: true };
    };

    const rows = [
      {
        enabled: true,
        name: 'Farm A',
        socId: 'farm.a.soc',
        signedPowerId: 'farm.a.actual',
        setSignedPowerId: 'farm.a.set',
        capacityKWh: 10,
        maxChargeW: 1000,
        maxDischargeW: 1000,
      },
      {
        enabled: true,
        name: 'Farm B',
        socId: 'farm.b.soc',
        signedPowerId: 'farm.b.actual',
        setSignedPowerId: 'farm.b.set',
        capacityKWh: 20,
        maxChargeW: 5000,
        maxDischargeW: 5000,
      },
    ];

    adapter.config = {
      emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
      storageFarm: { mode: 'pool', schedulerIntervalMs: 2000, storages: rows },
    };
    internal.set('storageFarm.configJson', { val: JSON.stringify(rows), ack: true, ts: now, lc: now });
    adapter.stateCache['storageFarm.configJson'] = { value: JSON.stringify(rows), ts: now, lc: now, ack: true };
    adapter.stateCache['settings.deviceStaleTimeoutSec'] = { value: 300, ts: now, lc: now, ack: true };

    for (const [id, val] of [
      ['farm.a.soc', 50], ['farm.a.actual', 0],
      ['farm.b.soc', 60], ['farm.b.actual', 0],
    ]) {
      foreign.set(id, { val, ack: true, ts: now, lc: now });
    }

    await adapter.ensureStorageFarmStates();
    await adapter.updateStorageFarmDerived('regression-initial');

    const statusInitial = JSON.parse(String((internal.get('storageFarm.storagesStatusJson') || {}).val || '[]'));
    assert.strictEqual(statusInitial.length, 2, 'Farm-Aggregation muss zwei Statuszeilen erzeugen');
    assert.ok(statusInitial.every((row) => String(row.dispatchKey || '').startsWith('set-signed:')), 'Statuszeilen brauchen stabile Setpoint-DispatchKeys');
    assert.ok(statusInitial.every((row) => row.chargeDispatchAvailable === true), 'beide Farm-Speicher muessen ladedispatchbar sein');

    // Status-Reihenfolge absichtlich vertauschen: Die Verteilung muss weiterhin
    // anhand dispatchKey und nicht anhand des Array-Index erfolgen.
    internal.set('storageFarm.storagesStatusJson', { val: JSON.stringify(statusInitial.slice().reverse()), ack: true, ts: Date.now(), lc: Date.now() });
    writes.length = 0;
    let result = await adapter.applyStorageFarmTargetW(-5000, { source: 'pv' });
    assert.strictEqual(result.applied, true, `Farm-Dispatch muss schreiben: ${result.reason}`);
    assert.strictEqual(result.reason, 'ok');
    const byId = new Map(writes.map((row) => [row.id, row.val]));
    assert.strictEqual(byId.get('farm.a.set'), -1000, 'Farm A muss durch ihr eigenes 1-kW-Limit begrenzt werden');
    assert.strictEqual(byId.get('farm.b.set'), -4000, 'Farm B muss den verbleibenden 4-kW-Anteil erhalten');
    assert.ok(result.results.every((row) => row.statusMatch === 'dispatch-key'), 'Status muss ueber stabile Keys zugeordnet sein');

    // Leerer/veralteter Status darf keinen dauerhaften No-Write erzeugen. Der
    // Dispatcher muss die Aggregation einmal aktualisieren und danach verteilen.
    internal.set('storageFarm.storagesStatusJson', { val: '[]', ack: true, ts: Date.now() - 60000, lc: Date.now() - 60000 });
    writes.length = 0;
    result = await adapter.applyStorageFarmTargetW(-3000, { source: 'pv' });
    assert.strictEqual(result.applied, true, `Preflight-Refresh muss Farm-Dispatch wiederherstellen: ${result.reason}`);
    assert.ok(result.results.every((row) => row.statusMatch !== 'missing'), 'nach Refresh darf kein Farmstatus fehlen');
    assert.strictEqual(Math.round(Math.abs(result.deliveredW)), 3000);

    // Der Speicherregler muss die aktive Farm als Basis-Eigenverbrauchspfad
    // automatisch starten, ohne den Einzel-Speicher-App-Haken zu benoetigen.
    const storageSource = require('fs').readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
    assert.ok(storageSource.includes('const enabled = cfgEnabled || autoTarifEnabled || multiUseAppPolicyActive || farmAppPolicyActive;'));
    assert.ok(storageSource.includes("aktivAutoSpeicherfarm', farmAppPolicyActive"));

    console.log('[storage-farm-dispatch-recovery] OK: Farm-Autostart, Status-Refresh und stabile Hardwarezuordnung schreiben wieder Sollwerte.');
  } finally {
    Module._load = originalLoad;
  }
})().catch((err) => {
  Module._load = originalLoad;
  console.error('[storage-farm-dispatch-recovery] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
