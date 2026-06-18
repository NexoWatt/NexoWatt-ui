// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-storage-policy.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-charging-storage-policy.js
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
 * Original-Hash: 6f6d3fa4ddc93bd59d37d83aa5adc7b2f64acd35cda5438536e964f18a39af2a
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
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const fail = (msg) => {
  console.error(`[ts-charging-storage-policy] ${msg}`);
  process.exit(1);
};
/**
 * Code-Teil: assertIncludes
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const assertIncludes = (rel, text, label) => {
  const content = read(rel);
  if (!content.includes(text)) fail(`${label || text} fehlt in ${rel}.`);
};

assertIncludes('src-ts/runtime-executables/www/ems-apps.ts', 'storageAssistCustomerAllowed', 'Installer-Freigabe storageAssistCustomerAllowed');
assertIncludes('src-ts/runtime-executables/www/ems-apps.ts', 'Kunde darf Speicher-Mitnutzung bedienen', 'Installer-Haken für Speicher-Mitnutzung');
assertIncludes('src-ts/runtime-executables/www/app.ts', 'evcsStorageAssistRow', 'LIVE-Speicherbedienung');
assertIncludes('src-ts/runtime-executables/www/app.ts', 'evcsStorageAssistCustomerAllowed', 'LIVE-Sichtbarkeit über Installer-Freigabe');
assertIncludes('src-ts/runtime-executables/www/evcs.ts', 'data-ems-storage-assist-btn', 'EVCS-Speicherbedienung');
assertIncludes('www/index.html', 'evcsStorageAssistRow', 'LIVE-HTML Speicherreihe');
assertIncludes('src-ts/runtime-executables/main.ts', 'storage_assist_locked', 'Backend-Gate für gesperrte Speicher-Mitnutzung');
assertIncludes('src-ts/runtime-executables/main.ts', 'userStorageAssistEnabled', 'Backend-User-State userStorageAssistEnabled');
assertIncludes('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storagePolicyJson', 'EVCS-Speicherpolicy-Diagnose');
assertIncludes('src-ts/runtime-executables/ems/modules/charging-management.ts', 'storageAssistCustomerAllowed', 'EVCS-Installer-Gate in Ladelogik');
assertIncludes('src-ts/ems/charging-management/charging-allocation.ts', 'batteryContributionW', 'TS-Allocation Speicherbeitrag');
assertIncludes('src-ts/runtime-executables/ems/modules/storage-control.ts', 'evcsStorageProtectedW', 'Storage-Control Schutzleistung');
assertIncludes('lib/ts-mirrors/ems/charging-management/charging-allocation.js', 'batteryContributionW', 'generierter TS-Allocation-Mirror Speicherbeitrag');
assertIncludes('www/app.js', 'evcsStorageAssistRow', 'generierte LIVE-Runtime Speicherbedienung');
assertIncludes('www/evcs.js', 'data-ems-storage-assist-btn', 'generierte EVCS-Runtime Speicherbedienung');

const appTs = read('src-ts/runtime-executables/www/app.ts');
if (!appTs.includes("storageAssistRow.style.display = (!!hasEms && installerAllowed) ? '' : 'none';")) {
  fail('LIVE-Speicherbedienung muss ohne Installer-Freigabe unsichtbar bleiben.');
}
const mainTs = read('src-ts/runtime-executables/main.ts');
if (!/if \(b && !installerAllowed\)[\s\S]*storage_assist_locked/.test(mainTs)) {
  fail('Backend muss Speicher-Mitnutzung bei fehlender Installer-Freigabe blockieren.');
}

console.log('[ts-charging-storage-policy] OK: EVCS Speicher-Mitnutzung ist Installer-gegated, kundenseitig bedienbar und in TS/Runtime verdrahtet.');
