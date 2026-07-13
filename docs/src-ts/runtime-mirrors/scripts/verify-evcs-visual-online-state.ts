// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-visual-online-state.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-evcs-visual-online-state.js
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
 * Original-Hash: 83e9baf20bab6c28f09a2d76fada4ce9accdb1354c81e8a6874a410428316874
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
function read(p){ return fs.readFileSync(p, 'utf8'); }
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
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[evcs-visual-online-state] missing ${label}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[evcs-visual-online-state] forbidden ${label}: ${needle}`); process.exit(1); } }
const evcs = 'src-ts/runtime-executables/www/evcs.ts';
must('package.json', '"version": "0.8.66"', 'version 0.8.66');
must(evcs, 'function _evcsBoolOrNull(value)', 'online bool normalizer');
must(evcs, 'function _tileStateClass({ powerW, reason, active, regEnabled, online, status })', 'tile state signature includes online/status');
must(evcs, "onlineState === false || r === 'OFFLINE' || offlineByStatus", 'offline class derived from online/reason/status');
must(evcs, "active=false", 'comment documents active=false idle semantics');
must(evcs, 'const localOnline = d(`evcs.${i}.online`);', 'render reads local online mirror');
must(evcs, 'const emsOnline = hasEms ? d(`${cm}.online`) : null;', 'render reads EMS online state');
must(evcs, 'const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;', 'local onlineId mirror wins over EMS fallback');
must(evcs, '_shortStatusText(status, emsReason, online)', 'status text gets online state');
must(evcs, '_tileStateClass({ powerW, reason: emsReason, active, regEnabled, online, status })', 'tile state gets online/status');
mustNot(evcs, 'active === false || regEnabled === false', 'online idle must not be disabled by active=false');
console.log('[evcs-visual-online-state] OK');
