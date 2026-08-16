// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-rc64-storage-grid-charge-policy.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-rc64-storage-grid-charge-policy.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 90a36e8f088d0bf2051045eb8beecd160bf333d8e72f633df1776d18b7d48d29
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

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

/**
 * Code-Teil: decision
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
