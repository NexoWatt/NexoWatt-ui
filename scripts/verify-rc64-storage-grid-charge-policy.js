#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolveStorageGridChargePermission } = require('../ems/modules/tarif-vis');

const master = {
  appCenterAllowed: true,
  priorityAllowsStorage: true,
  storageWriterAvailable: true,
  storagePowerW: 4000,
};

function decision(overrides = {}) {
  return resolveStorageGridChargePermission({
    ...master,
    tariffActive: true,
    currentPriceFresh: true,
    tariffState: 'guenstig',
    manualNetFeeEnabled: false,
    manualNtWindowActive: false,
    ...overrides,
  });
}

const matrix = [
  {
    name: 'Netzentgelt an + NT aktiv + Dynamiktarif aus',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' },
    allowed: true,
    source: 'net-fee-nt',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif neutral und frisch',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' },
    allowed: true,
    source: 'net-fee-nt',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif teuer',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'teuer' },
    allowed: false,
    source: 'net-fee-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Preis veraltet',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: false, tariffState: 'neutral' },
    allowed: false,
    source: 'net-fee-tariff',
  },
  {
    name: 'Netzentgelt an + außerhalb NT + Tarif günstig',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'net-fee',
  },
  {
    name: 'Netzentgelt aus + Tarif günstig und frisch',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' },
    allowed: true,
    source: 'dynamic-tariff-cheap',
  },
  {
    name: 'Netzentgelt aus + Tarif neutral',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt aus + günstiger Tarif veraltet',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt aus + dynamischer Tarif aus',
    input: { manualNetFeeEnabled: false, tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' },
    allowed: false,
    source: 'dynamic-tariff',
  },
];

for (const row of matrix) {
  const result = decision(row.input);
  assert.strictEqual(result.allowed, row.allowed, `${row.name}: allowed`);
  assert.strictEqual(result.source, row.source, `${row.name}: source`);
  assert.strictEqual(typeof result.reason, 'string', `${row.name}: reason missing`);
}

for (const [name, input] of [
  ['AppCenter aus', { appCenterAllowed: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Priorität sperrt Speicher', { priorityAllowsStorage: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Kein Writer', { storageWriterAvailable: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Keine Ladeleistung', { storagePowerW: 0, manualNetFeeEnabled: true, manualNtWindowActive: true }],
]) {
  assert.strictEqual(decision(input).allowed, false, `${name} must remain a hard master block`);
}

const tariffSource = fs.readFileSync(path.join(__dirname, '../ems/modules/tarif-vis.js'), 'utf8');
assert.match(tariffSource, /if \(manualNetFeeEnabled\)/, 'variable net fee must select the configured NT path');
assert.match(tariffSource, /source: 'net-fee-nt'/);
assert.match(tariffSource, /source: 'dynamic-tariff-cheap'/);
assert.doesNotMatch(tariffSource, /storageGridChargePermission\.source !== 'net-fee-nt'/, 'stale dynamic price must also block an active NT window when the dynamic tariff is enabled');
assert.match(tariffSource, /normalizedTariffState === 'teuer'/, 'expensive dynamic tariff must block inside NT');
assert.doesNotMatch(tariffSource, /Tarif günstig \+ manuelles NT-Fenster aktiv \+ AppCenter-Freigabe/);
assert.doesNotMatch(tariffSource, /\? '22:00' : ntStartRaw/);
assert.doesNotMatch(tariffSource, /\? '06:00' : ntEndRaw/);

console.log('[rc64-storage-grid-charge-policy] OK: NT requires a non-expensive fresh tariff when the dynamic tariff is active; NT alone works when it is disabled; cheap tariff governs when net fee is disabled.');
