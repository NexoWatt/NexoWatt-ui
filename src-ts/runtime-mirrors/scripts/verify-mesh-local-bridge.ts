// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-local-bridge.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-mesh-local-bridge.js
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
 * Original-Hash: 5d80ecb09d8995c3d8272af6d73afb9f70d494f2191b422103fe81e526aa0174
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
function read(p){return fs.readFileSync(p,'utf8');}
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
function must(file, text){const s=read(file); if(!s.includes(text)){console.error(`Missing in ${file}: ${text}`); process.exit(1);}}
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
function mustNot(file, text){const s=read(file); if(s.includes(text)){console.error(`Forbidden in ${file}: ${text}`); process.exit(1);}}
must('package.json', '"version": "0.8.44"');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '0.8.44 Lokale Bridge-Zuordnung');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'normalizeLocalBridgeCfg');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildLocalBridgePlan');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'lastWritesJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'directHardwareWrite: false');
must('src-ts/runtime-executables/www/ems-apps.ts', 'meshMicrogridLocalBridgeMappingsJson');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Bridge-Zuordnungen JSON');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'renderLocalBridge');
must('www/mesh-microgrid.html', 'Lokale Bridge-Zuordnung');
mustNot('www/ems-apps.html', 'Mesh/Microgrid aktiv</span><select');
console.log('OK: Mesh/Microgrid Local Bridge Mapping ist TypeScript-first, app-center-konform und herstellerneutral abgesichert.');
