// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-two-instance-fieldtest.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-mesh-two-instance-fieldtest.js
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
 * Original-Hash: 8e4a3fca5dbd7cad58d6f89888c246d89a3a1ecf63afa2f33f7dd731d7dea971
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
 * Verifikation 0.8.42: Mesh/Microgrid Zwei-Instanzen-Feldtest.
 *
 * Dieser Test ist absichtlich statisch und schnell. Er schützt die wichtigsten
 * Produktregeln:
 * - Feldtest läuft über separate Mesh/Microgrid-API und nicht über den Apps-Reiter.
 * - Die Betreiberansicht zeigt Peer-Matrix, ACK-Verlauf und manuellen Probe-Test.
 * - Commands bleiben neutral; direkte Hardwarewrites sind weiterhin verboten.
 */
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
function must(text, needle, label) {
  if (!text.includes(needle)) {
    console.error(`[mesh-two-instance-fieldtest] fehlt: ${label || needle}`);
    process.exit(1);
  }
}
const meshTs = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const mainTs = read('src-ts/runtime-executables/main.ts');
const uiTs = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const html = read('www/mesh-microgrid.html');
const pkg = JSON.parse(read('package.json'));

must(meshTs, 'buildTwoInstanceFieldTestDiagnostics', 'Feldtest-Diagnose im EMS-Modul');
must(meshTs, 'meshMicrogrid.fieldTest.peerMatrixJson', 'Peer-Matrix-State');
must(meshTs, 'meshMicrogrid.fieldTest.commandHistoryJson', 'Command-History-State');
must(meshTs, 'directHardwareWrite: false', 'keine direkten Hardwarewrites');
must(mainTs, "app.post('/api/mesh/peer/fieldtest'", 'manueller Feldtest-POST');
must(mainTs, "app.get('/api/mesh/peer/fieldtest'", 'Feldtest-Status-GET');
must(mainTs, 'meshMicrogrid.fieldTest.lastManualTestJson', 'manueller Feldtest-State');
must(uiTs, 'function renderFieldTest', 'Feldtest-Renderer');
must(uiTs, "fetch('/api/mesh/peer/fieldtest'", 'Feldtest-Button nutzt API');
must(html, 'runMeshFieldTest', 'Feldtest-Button im HTML');
must(html, 'meshFieldTestPeerRows', 'Peer-Matrix-Tabelle im HTML');
must(html, 'meshFieldTestHistoryRows', 'Command-History-Tabelle im HTML');
if (!/^0\.8\.(4[2-9]|[5-9][0-9])$/.test(String(pkg.version || ''))) {
  console.error(`[mesh-two-instance-fieldtest] package.json Version ist ${pkg.version}, erwartet 0.8.42+`);
  process.exit(1);
}
console.log('[mesh-two-instance-fieldtest] OK');
