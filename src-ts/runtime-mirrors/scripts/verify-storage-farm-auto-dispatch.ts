// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-farm-auto-dispatch.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-farm-auto-dispatch.js
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
 * Original-Hash: be53700bd773182ff0e7325a702a2c17223edd2a197378c8b4a0ead2ad2453a9
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
 * Regression 0.8.123: Eine echte Speicherfarm (App aktiv, >=2 Speicher,
 * beschreibbare Setpoints) startet die Basis-Eigenverbrauchsoptimierung selbst.
 * Der Farm-Dispatcher matched Statuszeilen ueber stabile Hardware-IDs und
 * aktualisiert einen fehlenden/veralteten Status vor dem ersten Write.
 */
const assert = require('assert');
const fs = require('fs');

/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(file) { return fs.readFileSync(file, 'utf8'); }
/**
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function has(file, needle, label = needle) {
  assert(read(file).includes(needle), `${label} fehlt in ${file}`);
}

const storageFiles = [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
];
for (const file of storageFiles) {
  has(file, 'const enabled = cfgEnabled || autoTarifEnabled || multiUseAppPolicyActive || farmAppPolicyActive;', 'Farm-Autostart');
  has(file, "await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', farmAppPolicyActive);", 'Farm-Autostart Diagnose');
  has(file, "typeof farmRuntimeInfoEarly.dispatchActive === 'boolean'", 'autoritativer Farm-Dispatchstatus');
  has(file, 'farmRowsEarly.some((row)', 'Legacy-Fallback der Farm-Setpoint-Pruefung');
  has(file, 'row.setSignedPowerId || row.targetPowerObjectId || row.targetPowerId', 'kompatibler Signed-Farm-Sollwert');
  has(file, '_isStorageFarmDispatchEnabled()', 'beschreibbare Farm als Schreib-Gate');
}

const mainFiles = [
  'src-ts/runtime-executables/main.ts',
  'main.js',
];
for (const file of mainFiles) {
  has(file, 'dispatchKey: this._sfGetStorageDispatchKey(row, configured - 1)', 'Statuszeile mit stabilem Dispatch-Key');
  has(file, "return `set-signed:${setSigned}`", 'Signed-Setpoint als stabile Farm-ID');
  has(file, "return `set-split:${setCharge}|${setDischarge}`", 'Split-Setpoints als stabile Farm-ID');
  has(file, "await this.updateStorageFarmDerived('dispatch-preflight')", 'Status-Refresh vor Dispatch');
  has(file, 'const statusByKey = new Map();', 'Status-Matching per Hardware-Key');
  has(file, "statusMatch = 'legacy-hardware-match'", 'eindeutiger Legacy-Hardware-Fallback');
  assert(!read(file).includes("const st = (status && status[i] && typeof status[i] === 'object') ? status[i] : {};"), `${file}: nacktes Array-Index-Matching darf nicht mehr regulaer verwendet werden`);
  has(file, "resultReason = 'farm-status-missing'", 'eindeutiger Fehlergrund bei fehlendem Farmstatus');
}

console.log('[storage-farm-auto-dispatch] OK: Farm startet die Basisregelung, aktualisiert Status und matched Speicher stabil nach Hardware-ID.');
