#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-core-limits-reservations.js
 *
 * Zweck:
 * Prüft den 0.7.106-Schritt: Consumer-Reservierungen im Core-Limits-Budget sind als
 * TypeScript-Helfer vorbereitet und seit 0.7.107 in `makeBudgetRuntime.reserve`
 * produktiv mit JS-Fallback verdrahtet.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[ts-core-limits-reservations] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }

const ts = read('src-ts/ems/core-limits/core-budget.ts');
must(ts, 'interface CoreBudgetReservationRequest', 'Reservation-Request-Vertrag');
must(ts, 'interface CoreBudgetReservationEntry', 'Reservation-Entry-Vertrag');
must(ts, 'computeCoreBudgetReservation', 'TS-Reservierungsfunktion');
must(ts, 'buildCoreBudgetConsumersList', 'ConsumersJson-Helfer');
must(ts, 'calculateCoreBudgetFlexUsedW', 'flexUsedW-Helfer');

const core = read('ems/modules/core-limits.js');
must(core, 'computeCoreBudgetReservation', 'JS-Reserve nutzt TS-Reservierungshelfer');
must(core, 'ts-core-reservation-productive', 'TS-Reservation-Produktivquelle');
must(core, 'ems.budget.tsReservationJson', 'TS-Reservation-Diagnose-State');
must(core, 'this.tsReservationLast', 'BudgetRuntime speichert letzten TS-Reservation-Status');
must(core, 'compareShadowWatt(\'entry.grantW\'', 'Grant-Vergleich vorhanden');
must(core, 'compareShadowWatt(\'entry.remainingPvW\'', 'PV-Restbudget-Vergleich vorhanden');

const main = read('main.js');
must(main, 'emsBudgetTsReservationJson', 'App-Center-Diagnose liest TS-Reservation-JSON');

const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-budget.js'));
if (!mirror || typeof mirror.computeCoreBudgetReservation !== 'function') fail('Core-Budget-Spiegel exportiert computeCoreBudgetReservation nicht.');
const result = mirror.computeCoreBudgetReservation({ remainingTotalW: 3000, remainingPvW: 1500, consumers: {}, order: [] }, { key: 'evcs', requestedW: 2200, reserveW: 2200, pvReserveW: 1000, pvOnly: true, actualW: 2100, mode: 'pvAuto' }, 123);
if (!result || !result.ok || !result.entry) fail('computeCoreBudgetReservation liefert kein gültiges Ergebnis.');
if (result.entry.grantW !== 1500) fail(`pvOnly muss Grant auf PV-Restbudget begrenzen, ist ${result.entry.grantW}.`);
if (result.nextRemainingTotalW !== 800) fail(`Rest-Gesamtbudget falsch: ${result.nextRemainingTotalW}.`);
if (result.nextRemainingPvW !== 500) fail(`Rest-PV-Budget falsch: ${result.nextRemainingPvW}.`);
if (result.flexUsedW !== 2200) fail(`flexUsedW falsch: ${result.flexUsedW}.`);
console.log('[ts-core-limits-reservations] OK: Core-Limits Consumer-Reservierungen sind als TS-Helfer produktiv vorbereitet.');
