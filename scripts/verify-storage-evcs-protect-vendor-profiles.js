#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const storagePath = path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts');
const chargingPath = path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts');
const storage = fs.readFileSync(storagePath, 'utf8');
const charging = fs.readFileSync(chargingPath, 'utf8');

function assertContains(text, needle, label) {
  if (!text.includes(needle)) {
    console.error(`[storage-evcs-protect-vendor-profiles] missing: ${label}\nneedle: ${needle}`);
    process.exit(1);
  }
}

function assertRegex(text, regex, label) {
  if (!regex.test(text)) {
    console.error(`[storage-evcs-protect-vendor-profiles] missing pattern: ${label}\nregex: ${regex}`);
    process.exit(1);
  }
}

// Wallbox/EVCS publishes the measured load that must not be supplied by the battery
// only while "Speicher schuetzen" is explicitly enabled. Without installer/customer
// activation, normal self-consumption remains active and the wallbox load is not removed
// from the NVP demand. If storage assist is requested, that load is tracked separately.
assertContains(charging, "chargingManagement.control.storageProtectedLoadW", 'EVCS protected-load state');
assertContains(charging, "chargingManagement.control.storageAssistRequestedLoadW", 'EVCS storage-assist load state');
assertContains(charging, "function resolveEvcsStoragePolicy(customerAllowed, userAssistEnabled)", 'central EVCS storage-policy resolver');
assertContains(charging, "const protect = allowed && !assist", 'storage protection requires explicit installer/customer activation');
assertContains(charging, "const allowed = customerAllowed === true", 'installer permission is explicit');
assertContains(charging, "mode: assist ? 'assist' : (protect ? 'protect' : 'normal')", 'hidden/disabled storage policy defaults to normal self-consumption');
assertContains(charging, "else if (storageProtectionRequested)", 'fresh EVCS load is protected only in explicit protect mode');
assertContains(charging, "storageProtectedLoadW += pWFreshActualForGridW", 'explicitly protected EVCS load contributes to storage protection');
assertContains(charging, "storageAssistRequestedLoadW += pWFreshActualForGridW", 'storage-assist EVCS load is not protected from battery');

// Storage control must apply the EVCS protection before the vendor write layer so it
// works for signed DPs, split charge/discharge targets, Sungrow, FENECON and E3/DC.
assertContains(charging, 'publishEvStoragePolicyCaps', 'charging publishes same-cycle EVCS storage policy');
assertContains(charging, 'evcsStoragePolicy: { ...prev', 'shared EMS runtime contains EVCS storage policy');
assertContains(storage, 'sharedCaps.evcsStoragePolicy', 'storage reads same-cycle EVCS storage policy');
assertContains(storage, "policyValue('protectedLoadW', 'chargingManagement.control.storageProtectedLoadW')", 'storage keeps state fallback for protected EVCS load');
assertContains(storage, "speicher.regelung.evcsSpeicherSchutzQuelle", 'storage exposes EVCS policy source diagnostic');
assertContains(storage, "const evcsStorageProtectedNvpTargetShiftW = evcsStorageProtectedLoadW", 'NVP target shift equals protected EVCS load');
assertContains(storage, "const desiredNvpW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW", 'generic self-consumption NVP target shifted');
assertContains(storage, "const protectedSelfImportW = Math.max(0, importRawNowW - evcsStorageProtectedLoadW)", 'generic discharge demand excludes protected EVCS load');
assertRegex(storage, /const\s+targetImportW\s*=\s*Math\.max\(0,\s*num\(cfg\.sungrowTargetGridImportW,[\s\S]*?\+\s*evcsStorageProtectedNvpTargetShiftW\)/, 'Sungrow target import is shifted');
assertRegex(storage, /const\s+targetImportW\s*=\s*Math\.max\(0,\s*num\(cfg\.tariffTargetGridImportW,[\s\S]*?\+\s*evcsStorageProtectedNvpTargetShiftW\)/, 'tariff discharge target import is shifted');
assertContains(storage, "const feneconTargetNvpW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW", 'FENECON AC target shifted');
assertContains(storage, "targetMode = e3dcTargetConfigured ? 'e3dc-rscp-set-power'", 'E3/DC vendor write path stays active');
assertContains(storage, "const e3dcResult = await this._writeE3dcRscpTargetW(w, reason, source, cfg)", 'E3/DC receives corrected targetW through common apply path');

// Diagnostics must exist so field systems can verify why the battery is allowed to
// cover only the house load but not the protected wallbox load.
assertContains(storage, "speicher.regelung.evcsSpeicherSchutzLastW", 'storage EVCS protection diagnostic');
assertContains(storage, "speicher.regelung.evcsSpeicherSchutzNvpZielOffsetW", 'storage EVCS NVP offset diagnostic');

console.log('[storage-evcs-protect-vendor-profiles] OK');
