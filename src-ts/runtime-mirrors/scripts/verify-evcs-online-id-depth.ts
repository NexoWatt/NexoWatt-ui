// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-online-id-depth.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-evcs-online-id-depth.js
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
 * Original-Hash: a4b770fc21a4c9faf048bc0d065cc486bacd764ea4685994a61a72bbe18a78df
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
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[evcs-online-id-depth] missing ${label}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[evcs-online-id-depth] forbidden ${label}: ${needle}`); process.exit(1); } }
const main = 'main.js';
const mainTs = 'src-ts/runtime-mirrors/main.ts';
const engine = 'ems/engine.js';
const engineTs = 'src-ts/runtime-executables/ems/engine.ts';
const cm = 'ems/modules/charging-management.js';
const cmTs = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const evcsTs = 'src-ts/runtime-executables/www/evcs.ts';
must('package.json', '"version": "0.8.66"', 'version 0.8.66');
for (const f of [main, mainTs]) {
  must(f, 'if (wb.onlineId) this.evcsIdToKey[wb.onlineId] = `evcs.${wb.index}.online`;', `${f} maps onlineId to evcs online mirror`);
  must(f, "online:        { type: 'boolean', role: 'indicator.reachable'", `${f} creates evcs.<n>.online state`);
  must(f, '[wb.powerId, wb.energyTotalId, wb.statusId, wb.onlineId, wb.activeId', `${f} subscribes onlineId`);
  must(f, "add(wb.onlineId, this.evcsIdToKey && wb.onlineId ? this.evcsIdToKey[wb.onlineId] : '');", `${f} refresh-plan includes onlineId`);
}
for (const f of [engine, engineTs]) {
  must(f, 'const onlineId = (wb.onlineId || \'\').trim();', `${f} keeps explicit onlineId`);
  must(f, 'const statusId = (wb.statusId || \'\').trim();', `${f} keeps display statusId separately`);
  must(f, '...(onlineId ? { onlineId } : {}),', `${f} passes onlineId to charging management`);
  must(f, '...(statusId ? { statusId } : {}),', `${f} passes statusId fallback/display`);
  mustNot(f, "const statusId = ((wb.onlineId || '').trim()) || ((wb.statusId || '').trim()) || '';", `${f} no longer overloads statusId with onlineId`);
}
for (const f of [cm, cmTs]) {
  must(f, 'function normalizeEvcsOnlineFlag(value, fallback = null)', `${f} has online normalizer`);
  must(f, 'const onlineId = String(wb.onlineId || \'\').trim();', `${f} reads onlineId`);
  must(f, 'key: `cm.wb.${safe}.onlineRaw`', `${f} registers onlineRaw datapoint`);
  must(f, 'const onlineRaw = (onlineId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.onlineRaw`) : null;', `${f} reads onlineRaw`);
  must(f, 'if (onlineId) {\n                online = normalizeEvcsOnlineFlag(onlineRaw, false);', `${f} onlineId is authoritative`);
  must(f, '} else if (statusId) {\n                online = normalizeEvcsOnlineFlag(statusRaw, false);', `${f} statusId remains fallback`);
}
must(evcsTs, 'const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;', 'VIS prefers explicit local online mirror');
console.log('[evcs-online-id-depth] OK');
