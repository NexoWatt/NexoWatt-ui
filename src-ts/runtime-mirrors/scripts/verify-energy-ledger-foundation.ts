// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-ledger-foundation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-energy-ledger-foundation.js
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
 * Original-Hash: 4cdddf83f0af8252f4b346510311aa5be92f642dbc2f2fccb1b657c79f11efc3
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
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(rel, needle, msg) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error(`[energy-ledger] FEHLER: ${msg || needle} fehlt in ${rel}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: match
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function match(rel, regex, msg) {
  const text = read(rel);
  if (!regex.test(text)) {
    console.error(`[energy-ledger] FEHLER: ${msg || regex} fehlt in ${rel}`);
    process.exit(1);
  }
}

need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'nexowatt.local-kwh-ledger.v2', 'Ledger-Schema v2');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'chargeKiosk.stations.*.lastSessionsByLpJson', 'Charge-Kiosk-Sessionquelle dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'OCPP, Modbus, MQTT', 'Hersteller-/Protokolloffenheit dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'processedSessionKeysJson', 'Deduplikation der Sessions');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'entriesRecentJson', 'kompakte Ledger-Eintragsliste');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'todayCsvJson', 'CSV-Exportbasis');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'keine eichrechtsverbindliche Abrechnung', 'rechtlicher Hinweis');
need('src-ts/runtime-executables/ems/module-manager.ts', 'EnergyLedgerModule', 'ModuleManager registriert EnergyLedgerModule');
need('src-ts/runtime-executables/ems/module-manager.ts', "this._licenseAllowsApp('energyLedger')", 'EOS-Lizenzgate für Ledger');
need('src-ts/runtime-executables/www/ems-apps.ts', "id: 'energyLedger'", 'App-Center führt Local kWh Ledger');
need('src-ts/runtime-executables/www/ems-apps.ts', 'schaltet keine Hardware', 'Installer-Hinweis: read-only');
need('src-ts/runtime-executables/main.ts', "ensurePlainObj('energyLedger'", 'Default-Config energyLedger');
match('package.json', /"version"\s*:\s*"0\.8\.(2[7-9]|[3-9][0-9])"/, 'Paketversion >=0.8.27');
console.log('[energy-ledger] OK: Local kWh Ledger Grundlage/Export-Erweiterung ist statisch abgesichert.');
