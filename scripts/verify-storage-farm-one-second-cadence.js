#!/usr/bin/env node
'use strict';

/** Regression 0.8.124: Speicherfarm und zentraler EMS-Tick bleiben <= 1 s. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');

const root = path.resolve(__dirname, '..');
const mainTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const engineTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
const uiTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
const uiHtml = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');

assert(mainTs.includes('const keepaliveMs = 900;'), 'Farm-Setpoint-Keepalive ist nicht watchdog-sicher auf 900 ms begrenzt');
assert(mainTs.includes('Math.min(1000, Number((this.config && this.config.storageFarm'), 'Farm-Dispatcher akzeptiert weiterhin Intervalle über 1 s');
assert(engineTs.includes('clampNumber(cfgInterval, 250, 1000, 1000)'), 'Zentraler EMS-Tick ist nicht auf maximal 1 s begrenzt');
assert(uiTs.includes('Math.max(250, Math.min(1000, Math.round(sched)))'), 'AppCenter speichert weiterhin Schedulerwerte über 1 s');
assert(/id="schedulerIntervalMs"[^>]*max="1000"/.test(uiHtml), 'AppCenter-UI begrenzt den zentralen Scheduler nicht sichtbar auf 1 s');

const writes = [];
class AdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.log = { debug() {}, info() {}, warn() {}, error() {}, silly() {} };
  }
  async setForeignStateAsync(id, val) { writes.push({ id: String(id), val, ts: Date.now() }); return true; }
  async setObjectNotExistsAsync() {}
  async extendObjectAsync() {}
  async getStateAsync() { return null; }
  async setStateAsync() {}
  setTimeout(fn, ms) { return setTimeout(fn, ms); }
  setInterval(fn, ms) { return setInterval(fn, ms); }
  clearTimeout(ref) { clearTimeout(ref); }
  clearInterval(ref) { clearInterval(ref); }
}
function expressStub() { return { use() {}, get() {}, post() {}, put() {}, delete() {}, listen() { return null; } }; }
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

const originalLoad = Module._load;
const originalDateNow = Date.now;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@iobroker/adapter-core') return { Adapter: AdapterStub };
  if (request === 'express') return expressStub;
  if (request === '@iobroker/type-detector') {
    const error = new Error('optional dependency intentionally absent in test');
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }
  return originalLoad.call(this, request, parent, isMain);
};

(async () => {
  const factory = require(path.join(root, 'main.js'));
  const adapter = factory({});
  let fakeNow = 1_000_000;
  Date.now = () => fakeNow;
  try {
    const first = await adapter._sfWriteIfChanged('free.vendor.farm.target', -803);
    assert.strictEqual(first.ok, true);
    assert.strictEqual(first.skipped, false);
    assert.strictEqual(writes.length, 1);

    fakeNow += 500;
    const early = await adapter._sfWriteIfChanged('free.vendor.farm.target', -803);
    assert.strictEqual(early.skipped, true, 'unveränderter Sollwert wurde vor dem Keepalive unnötig geschrieben');
    assert.strictEqual(writes.length, 1);

    fakeNow += 400; // insgesamt 900 ms
    const keepalive = await adapter._sfWriteIfChanged('free.vendor.farm.target', -803);
    assert.strictEqual(keepalive.ok, true);
    assert.strictEqual(keepalive.skipped, false, 'Farm-Sollwert wird nach 900 ms nicht erneuert');
    assert.strictEqual(keepalive.keepalive, true);
    assert.strictEqual(writes.length, 2);
    assert.deepStrictEqual(writes.map((row) => row.id), ['free.vendor.farm.target', 'free.vendor.farm.target']);
    assert.deepStrictEqual(writes.map((row) => row.val), [-803, -803]);
  } finally {
    Date.now = originalDateNow;
    Module._load = originalLoad;
  }

  console.log('[storage-farm-one-second-cadence] OK: Farm-Sollwerte werden spätestens nach 900 ms erneuert; EMS/AppCenter sind auf maximal 1 s begrenzt.');
})().catch((err) => {
  Date.now = originalDateNow;
  Module._load = originalLoad;
  console.error('[storage-farm-one-second-cadence] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
