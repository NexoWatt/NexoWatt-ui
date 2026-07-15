// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-charging-grid-cap-safe.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-charging-grid-cap-safe.js
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
 * Original-Hash: 1613a427fc8ce7af36a280c88b0809acafaa2e6510b9f845f31cf8e7c14124d5
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
function read(p){ return fs.readFileSync(p,'utf8'); }
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[charging-grid-cap-safe] Missing in ${file}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[charging-grid-cap-safe] Forbidden in ${file}: ${needle}`); process.exit(1); } }
const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) { console.error('[version] invalid SemVer'); process.exit(1); }
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadRawW = gridW -');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'derived.core.building.loadRestW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadW = Number.isFinite(Number(derivedBaseLoadW))');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridLocalSupportW = Math.max(0, gridBaseLoadW - Math.max(0, gridBaseLoadRawW))');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'chargingManagement.control.gridLocalSupportW');
must('src-ts/runtime-executables/main.ts', 'gridLocalSupportW: await getOwn');
must('src-ts/runtime-executables/www/ems-apps.ts', 'EVCS Cap (Netz sicher)');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Lokale Deckung');
must('ems/modules/charging-management.js', 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)');
must('www/ems-apps.js', 'EVCS Cap (Netz sicher)');
// Make sure the old optimistic 1e12 grid cap expression is not the active formula.
mustNot('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, 1e12)');
console.log('OK: EVCS grid cap uses building load when available, is clamped to effective grid import limit and local support is diagnostic-only.');
