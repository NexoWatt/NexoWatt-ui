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
 * Original-Hash: 4e715c8db4f0b52ce73e8f1302425efae01bc61caced16cacaed8ef4c4741d0a
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
const pkgVersion = JSON.parse(read('package.json')).version;
if (!/^\d+\.\d+\.\d+$/.test(String(pkgVersion || ''))) { console.error(`[evcs-online-id-depth] invalid package version: ${pkgVersion}`); process.exit(1); }
for (const f of [main, mainTs]) {
  must(f, '{ configuredId: wb.onlineId, key: `evcs.${index}.online` }', `${f} registers onlineId in unified EVCS input registry`);
  must(f, "online:        { type: 'boolean', role: 'indicator.reachable'", `${f} creates evcs.<n>.online state`);
  must(f, 'const sourceIds = Array.from(this._nwEvcsInputBindingsBySourceId.keys());', `${f} subscribes onlineId and alias sources through registry`);
  must(f, 'for (const binding of (Array.isArray(bindings) ? bindings : [])) addEvcsBinding(binding);', `${f} refresh-plan includes all online bindings`);
  must(f, 'const list = map.get(sid) || [];', `${f} supports one station-online ID for multiple connectors`);
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
  must(f, "const explicitOnlineFlag = onlineId ? normalizeEvcsOnlineFlag(onlineRaw, null) : null;", `${f} normalizes explicit onlineId independently`);
  must(f, "if (onlineId) {\n                const explicitOnline = explicitOnlineFlag;", `${f} onlineId is authoritative`);
  must(f, "} else if (statusFresh) {\n                online = normalizeEvcsStatusReachability(statusRaw, true);", `${f} fresh status remains reachability fallback`);
}
must(evcsTs, 'const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;', 'VIS prefers explicit local online mirror');
console.log('[evcs-online-id-depth] OK');
