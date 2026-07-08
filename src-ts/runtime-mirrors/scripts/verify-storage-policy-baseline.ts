// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-policy-baseline.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-policy-baseline.js
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
 * Original-Hash: 582e9865d0581afb7fe22c6b1027c3dac3c58b3eed2a430f9fa5a05474a8d8b1
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
/**
 * Regressionstest 0.8.82: Baseline-Fachlogik fuer Speicher.
 * Die reine Speicherregelung darf nur Eigenverbrauch optimieren; MultiUse ist
 * die koordinierende Policy-Schicht fuer Zonen/Peak/EVCS; Speicherfarm verteilt.
 */
const fs = require('fs');

/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(file) { return fs.readFileSync(file, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle, label) {
  if (!text(file).includes(needle)) {
    console.error(`[storage-policy-baseline] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
  must(file, 'const activeNvpDischargeSource = (source === \'eigenverbrauch\' || source === \'tarif\' || source === \'fenecon\' || source === \'fenecon-assist\' || source === \'lastspitze\');', 'Demand-Cap greift nach Rampe fuer alle NVP-Entladequellen');
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
