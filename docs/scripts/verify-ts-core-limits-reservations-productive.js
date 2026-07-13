#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-core-limits-reservations-productive.js
 *
 * Zweck:
 * Prüft den 0.7.107-Schritt: `makeBudgetRuntime.reserve` nutzt den TypeScript-Helfer
 * produktiv für Consumer-Reservierungen und behält JavaScript als Fallback bei
 * Fehlern/Abweichungen.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[ts-core-limits-reservations-productive] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }

const core = read('ems/modules/core-limits.js');
must(core, 'productiveTsReservationCommit', 'produktiver TS-Commit-Kommentar');
must(core, "source: 'ts-core-reservation-productive'", 'produktive TS-Reservation-Quelle');
must(core, 'fallbackReason', 'Fallback-Grund wird gespeichert');
must(core, 'this.remainingTotalW = tsReservationResult.nextRemainingTotalW', 'TS-Restbudget wird produktiv übernommen');
must(core, 'this.consumers = (tsReservationResult.consumers', 'TS-Consumer-Liste wird produktiv übernommen');
must(core, 'flexUsedW = Math.max(0, Number(tsReservationResult.flexUsedW)', 'TS-flexUsedW wird produktiv genutzt');
must(core, 'ts-js-mismatch', 'JS-Fallback bei Abweichung vorhanden');
must(core, 'ems.budget.tsReservationJson', 'Diagnose-State bleibt vorhanden');
must(core, 'Diagnose-/State-Schreibfehler dürfen Budgetreservierungen nicht abbrechen', 'Schreibfehler blockieren Reserve nicht');

const ts = read('src-ts/ems/core-limits/core-budget.ts');
must(ts, 'Ab 0.7.107 wird das Ergebnis produktiv', 'TS-Quelle dokumentiert produktive Nutzung');
const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-budget.js'));
if (!mirror || typeof mirror.computeCoreBudgetReservation !== 'function') fail('TS-Mirror exportiert computeCoreBudgetReservation nicht.');
const result = mirror.computeCoreBudgetReservation({ remainingTotalW: 5000, remainingPvW: 2000, consumers: {}, order: [] }, { key: 'heatingRod', requestedW: 3000, reserveW: 3000, pvReserveW: 1500, pvOnly: false, actualW: 2800 }, 456);
if (!result || !result.ok || !result.entry) fail('TS-Reservierung liefert kein gültiges Ergebnis.');
if (result.entry.grantW !== 3000) fail(`grantW falsch: ${result.entry.grantW}`);
if (result.nextRemainingTotalW !== 2000) fail(`nextRemainingTotalW falsch: ${result.nextRemainingTotalW}`);
if (result.nextRemainingPvW !== 500) fail(`nextRemainingPvW falsch: ${result.nextRemainingPvW}`);
if (result.consumers.heatingRod.entry) fail('Consumer-Struktur ist unerwartet verschachtelt.');
if (!result.consumers.heatingRod || result.consumers.heatingRod.usedW !== 3000) fail('Consumer-Eintrag fehlt oder usedW ist falsch.');
console.log('[ts-core-limits-reservations-productive] OK: Core-Limits Consumer-Reservierungen laufen produktiv über TS mit JS-Fallback.');
