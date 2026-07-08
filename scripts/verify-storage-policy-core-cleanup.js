#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.81: Kern-Policy der Speicherlogik.
 * Zielbild:
 * - Speicherregelung ohne MultiUse = Eigenverbrauchsoptimierung.
 * - MultiUse aktiv = führende Policy für Reserve, LSK und SoC-Zonen.
 * - Speicherfarm = Verteilung/Schreiben des fertigen Sollwertes.
 */
const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storage-policy-core-cleanup] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[storage-policy-core-cleanup] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'const multiUseOwnsZones = !!multiUsePolicyActive;', 'MultiUse führt SoC-Zonen nur aktiv');
  must(file, 'const reserveEnabled = multiUseOwnsZones && !!cfg.reserveEnabled;', 'Reserve nur aktive MultiUse-Zone');
  must(file, 'const lskEnabledCfg = multiUseOwnsZones && (cfg.lskEnabled !== false);', 'LSK nur aktive MultiUse-Zone');
  must(file, 'const lskDischargeEnabledCfg = !!(lskEnabledCfg && cfg.lskDischargeEnabled !== false);', 'LSK-Entladefreigabe getrennt');
  must(file, 'const lskChargeEnabledCfg = !!(lskEnabledCfg && cfg.lskChargeEnabled !== false);', 'LSK-Ladefreigabe getrennt');
  must(file, 'if (peakEnabled && lskDischargeEnabledCfg) {', 'Peak-Shaving-Entladung nur bei MultiUse-LSK');
  must(file, 'lskChargeEnabledCfg &&', 'LSK-Refill nur bei MultiUse-LSK-Ladefreigabe');
  must(file, 'const selfTargetGridW = Math.max(0, num(cfg.selfTargetGridImportW, 50));', 'Eigenverbrauchs-Zielwert bleibt Basis-Policy');
  must(file, "await this._setIfChanged('speicher.regelung.lskPolicyAktiv', !!lskEnabledCfg);", 'LSK-Diagnose');
  must(file, "await this._setIfChanged('speicher.regelung.policyMode', multiUsePolicyActive ? 'multiuse' : 'eigenverbrauch');", 'Policy-Modus eigenverbrauch/multiuse');
}

for (const file of [
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-mirrors/main.ts',
  'main.js',
]) {
  must(file, 'Speicherfarm verteilt nur den fertigen Zielwert', 'Farm-Floor-Kommentar');
  must(file, 'const reserveEnabled = multiUsePolicyActive && !!storageCfg.reserveEnabled;', 'Farm-Reserve-Floor nur MultiUse');
  must(file, 'const lskEnabled = !!(multiUsePolicyActive && storageCfg.lskDischargeEnabled !== false && storageCfg.lskEnabled !== false);', 'Farm-LSK-Floor nur MultiUse');
  mustNot(file, 'const ignoreInactiveMultiUseZones =', 'alte Farm-Floor-Umschaltung entfernt');
}

console.log('[storage-policy-core-cleanup] OK: Speicher-Basislogik, MultiUse-Policy und Speicherfarm-Verteilung sind sauber geschichtet.');
