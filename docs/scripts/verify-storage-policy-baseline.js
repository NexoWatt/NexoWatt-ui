#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.82: Baseline-Fachlogik fuer Speicher.
 * Die reine Speicherregelung darf nur Eigenverbrauch optimieren; MultiUse ist
 * die koordinierende Policy-Schicht fuer Zonen/Peak/EVCS; Speicherfarm verteilt.
 */
const fs = require('fs');

function text(file) { return fs.readFileSync(file, 'utf8'); }
function must(file, needle, label) {
  if (!text(file).includes(needle)) {
    console.error(`[storage-policy-baseline] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle, label) {
  if (text(file).includes(needle)) {
    console.error(`[storage-policy-baseline] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

const storageFiles = [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
];
const mainFiles = ['src-ts/runtime-executables/main.ts', 'src-ts/runtime-mirrors/main.ts', 'main.js'];

for (const file of storageFiles) {
  must(file, 'reine Eigenverbrauchsoptimierung: PV-Überschuss laden und Netzbezug', 'Kommentar reine Eigenverbrauchsoptimierung');
  must(file, 'const multiUseOwnsZones = !!multiUsePolicyActive;', 'Zonenbesitzer ist MultiUse');
  must(file, 'const reserveEnabled = multiUseOwnsZones && !!cfg.reserveEnabled;', 'Reserve nur MultiUse');
  must(file, 'const lskEnabledCfg = multiUseOwnsZones && (cfg.lskEnabled !== false);', 'LSK nur MultiUse');
  must(file, 'const evcsStorageAssistPolicyAllowed = !!multiUsePolicyActive;', 'EVCS-Assist nur MultiUse');
  must(file, 'const maxByDemandW = measuredDemandCapW;', 'Entlade-Demand-Cap ohne alten Sollwert');
  must(file, 'const activeNvpDischargeSource = (source === \'eigenverbrauch\' || source === \'tarif\' || source === \'fenecon\' || source === \'fenecon-assist\' || source === \'sungrow-assist\' || source === \'lastspitze\');', 'Demand-Cap greift nach Rampe fuer alle NVP-Entladequellen');
  mustNot(file, 'const lskEnabledCfg = ignoreStaleMultiUsePolicy ? true', 'inaktiver MultiUse darf LSK nicht einschalten');
  mustNot(file, 'lskResponseHoldW', 'LSK darf alten Sollwert nicht als Demand-Hold nutzen');
}

for (const file of mainFiles) {
  must(file, 'Speicherfarm verteilt nur den fertigen Zielwert', 'Farm ist Verteilpfad');
  must(file, 'const reserveEnabled = multiUsePolicyActive && !!storageCfg.reserveEnabled;', 'Farm-Reserve nur MultiUse');
  must(file, 'const lskEnabled = !!(multiUsePolicyActive && storageCfg.lskDischargeEnabled !== false && storageCfg.lskEnabled !== false);', 'Farm-LSK nur MultiUse');
  must(file, 'Eine bewusst eingetragene 0-W-Vorgabe sperrt diese Richtung', '0-W bleibt Stop in Farmlimits');
}

console.log('[storage-policy-baseline] OK: Speicher-Baseline, MultiUse-Routing und Farm-Verteilung sind statisch abgesichert.');
