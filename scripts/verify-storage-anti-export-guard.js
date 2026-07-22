#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.136 / Baustein 9:
 * - bestaetigte Einspeisung stoppt jede positive Speicherentladung,
 * - Entladung wird praeventiv auf den NVP-Headroom begrenzt,
 * - fehlender NVP darf keinen alten Entladebefehl halten,
 * - bereits bestaetigte Sollwerte bleiben bei frischem NVP im Zielband stabil,
 * - Split-History zeigt niemals gleichzeitig Bezug/Einspeisung oder Laden/Entladen.
 */

const assert = require('assert');
const fs = require('fs');
const { resolveStorageAntiExportTarget } = require('../ems/services/storage-anti-export-guard');
const { normalizeOpposingPowerFlows } = require('../ems/services/power-flow-coherence');
const { resolveNvpDisplay, resolveNvpMeasurement } = require('../ems/services/measurement-freshness');

function fresh(value, ts = Date.now()) {
  return {
    mapped: true,
    value,
    sampleTs: ts,
    freshness: {
      fresh: true,
      measurementFresh: true,
      heartbeatFresh: false,
      connected: true,
      reason: 'measurement-fresh',
      measurementAgeMs: 0,
      heartbeatAgeMs: null,
    },
  };
}

// Reale Einspeisung bei laufender Entladung: sofortiger expliziter Stopp.
const exportStop = resolveStorageAntiExportTarget({
  requestedTargetW: 3000,
  nvpW: -1000,
  nvpUsable: true,
  nvpTargetW: 50,
  nvpDeadbandW: 50,
  storageActualW: 3000,
  storageActualTrusted: true,
  lastAcceptedTargetW: 3000,
});
assert.strictEqual(exportStop.targetW, 0);
assert.strictEqual(exportStop.explicitStop, true);
assert.strictEqual(exportStop.action, 'stop-confirmed-export');

// Netzbezug darf nur bis zum kleinen Restbezug ausgeregelt werden.
const capFromZero = resolveStorageAntiExportTarget({
  requestedTargetW: 3000,
  nvpW: 2000,
  nvpUsable: true,
  nvpTargetW: 50,
  nvpDeadbandW: 50,
  storageActualW: 0,
  storageActualTrusted: true,
});
assert.strictEqual(Math.round(capFromZero.targetW), 1950);
assert.strictEqual(Math.round(capFromZero.predictedNvpW), 50);
assert.strictEqual(capFromZero.action, 'cap-to-nvp-headroom');

// Laufende Entladung wird relativ zur physischen Istleistung begrenzt.
const capFromActual = resolveStorageAntiExportTarget({
  requestedTargetW: 4000,
  nvpW: 2000,
  nvpUsable: true,
  nvpTargetW: 50,
  nvpDeadbandW: 50,
  storageActualW: 1000,
  storageActualTrusted: true,
});
assert.strictEqual(Math.round(capFromActual.targetW), 2950);
assert.strictEqual(Math.round(capFromActual.predictedNvpW), 50);

// Ohne frischen NVP darf eine positive Entladung nicht weiterlaufen.
const noNvp = resolveStorageAntiExportTarget({
  requestedTargetW: 2500,
  nvpW: null,
  nvpUsable: false,
  lastAcceptedTargetW: 2500,
});
assert.strictEqual(noNvp.targetW, 0);
assert.strictEqual(noNvp.explicitStop, true);
assert.strictEqual(noNvp.action, 'stop-missing-nvp');

// Ladebefehle sind nicht Aufgabe des Anti-Export-Gates und bleiben unveraendert.
const chargePass = resolveStorageAntiExportTarget({
  requestedTargetW: -1200,
  nvpW: -1500,
  nvpUsable: true,
});
assert.strictEqual(chargePass.active, false);
assert.strictEqual(chargePass.targetW, -1200);

// Ohne vertrauenswuerdigen Speicher-Istwert darf selbst ein alter akzeptierter
// Entladebefehl nicht blind weiterlaufen: Import kann durch laufende Ladung entstehen.
const missingFeedbackStop = resolveStorageAntiExportTarget({
  requestedTargetW: 3000,
  nvpW: 80,
  nvpUsable: true,
  nvpTargetW: 50,
  nvpDeadbandW: 50,
  storageActualW: null,
  storageActualTrusted: false,
});
assert.strictEqual(missingFeedbackStop.targetW, 0);
assert.strictEqual(missingFeedbackStop.explicitStop, true);
assert.strictEqual(missingFeedbackStop.action, 'stop-missing-storage-feedback');

// Physikalisch unmoegliche Split-Werte werden auf einen exklusiven Nettofluss reduziert.
const gridPair = normalizeOpposingPowerFlows(3000, 1000, 0);
assert.strictEqual(gridPair.signedW, 2000);
assert.strictEqual(gridPair.positiveW, 2000);
assert.strictEqual(gridPair.negativeW, 0);
assert.strictEqual(gridPair.conflict, true);

const storagePair = normalizeOpposingPowerFlows(3000, 2000, 0); // Entladen, Laden
assert.strictEqual(storagePair.signedW, 1000);
assert.strictEqual(storagePair.positiveW, 1000);
assert.strictEqual(storagePair.negativeW, 0);

const now = Date.now();
const splitNvp = resolveNvpMeasurement({
  import: fresh(3000, now),
  export: fresh(1000, now),
  maxSkewMs: 5000,
});
assert.strictEqual(splitNvp.netW, 2000);
assert.strictEqual(splitNvp.importW, 2000);
assert.strictEqual(splitNvp.exportW, 0);
assert.ok(String(splitNvp.source).includes('netted'));

const display = resolveNvpDisplay({
  maxAgeMs: 15000,
  canonicalKnown: false,
  canonicalFresh: null,
  canonicalNetW: null,
  gridNetRaw: null,
  gridBuyRaw: 3000,
  gridSellRaw: 1000,
  gridBuyTs: now,
  gridSellTs: now,
  maxSkewMs: 5000,
  gridBuyMapped: true,
  gridSellMapped: true,
  gridNetMapped: false,
});
assert.strictEqual(display.gridNetRaw, 2000);
assert.strictEqual(display.gridBuyW, 2000);
assert.strictEqual(display.gridSellW, 0);
assert.ok(String(display.src).includes('netted'));

// Integrationsvertrag: Gate muss nach Hersteller/Budget und vor 0-W-Firewall liegen.
const storageSource = fs.readFileSync('src-ts/runtime-executables/ems/modules/storage-control.ts', 'utf8');
const gatePos = storageSource.indexOf('Finales herstellerunabhaengiges Anti-Export-Gate');
const firewallPos = storageSource.indexOf('Herstellerunabhaengige 0-W-Firewall nach allen Policies/Caps');
const vendorPos = storageSource.indexOf('Finale asymmetrische EVCS-Speicherschutzschranke');
assert.ok(gatePos > vendorPos, 'Anti-Export-Gate muss nach den Hersteller-/Policy-Entscheidungen liegen');
assert.ok(firewallPos > gatePos, 'Anti-Export-Gate muss vor der 0-W-Firewall liegen');
assert.ok(storageSource.includes("sungrowWriteMode = 'write-stop-anti-export'"));
assert.ok(storageSource.includes('antiExportExplicitStop'));
assert.ok(storageSource.includes('graceActive && lastTargetW <= 0'));

const mainSource = fs.readFileSync('src-ts/runtime-executables/main.ts', 'utf8');
assert.ok(mainSource.includes('normalizeOpposingPowerFlows(d, c, deadbandW)'));
assert.ok(mainSource.includes('opposingFlowConflict'));

console.log('[storage-anti-export-guard] OK: finales Anti-Export-Gate, NVP-Headroom, NVP-Ausfallstopp und physikalisch kohaerente History sind abgesichert.');
