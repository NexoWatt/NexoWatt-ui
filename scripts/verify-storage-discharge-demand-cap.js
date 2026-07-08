#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.79: Die Speicher-NVP-Regelung darf den letzten Sollwert
 * nicht mehr als echte Entladeleistung zurückkoppeln. Dieser Fehler hat im Feld
 * aus ca. 2,6 kW Netzbezug eine viel zu hohe Entladevorgabe erzeugt.
 */
const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storage-discharge-demand-cap] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}

function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[storage-discharge-demand-cap] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'WICHTIGER Feldfix 0.8.79: Der letzte Sollwert darf hier NICHT', 'Kommentar gegen Sollwert-Rückkopplung');
  must(file, 'const loadEstimate = getFeneconAcLoadTargetW();', 'Lastschätzung im Demand-Cap');
  must(file, 'const demandBaseW = Math.max(importRawNowW + measuredDischargeNowW, loadEstimateW);', 'Demand-Basis ohne letzten Sollwert');
  must(file, 'dischargeDemandHardCapReason = `Tarif-NVP-Demand-Cap', 'Tarif-NVP-Cap nach Rampe verfügbar');
  must(file, 'dischargeDemandHardCapReason = `Eigenverbrauch-NVP-Demand-Cap', 'Eigenverbrauch-NVP-Cap nach Rampe verfügbar');
  mustNot(file, 'commandedDischargeNowW', 'alter Sollwert darf nicht mehr Demand-Basis sein');
}

for (const file of [
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-mirrors/main.ts',
  'main.js',
]) {
  must(file, 'Feldschutz 0.8.79: Ist-Leistungs-DPs der Speicherfarm dürfen niemals', 'Farm-Istwertschutz');
  must(file, 'const looksLikeSetpointPowerId = (id) => {', 'Setpoint-Erkennung bleibt JS-kompatibel');
  must(file, 'status.powerFeedbackIgnoredReason = ignoredPowerFeedback.join', 'Diagnose ignorierter Istwerte');
  mustNot(file, 'id: unknown', 'Runtime-TS darf keine TypeScript-Annotation in JS spiegeln');
}

console.log('[storage-discharge-demand-cap] OK: NVP-Entladevorgabe ist gegen Sollwert-Rückkopplung abgesichert.');
