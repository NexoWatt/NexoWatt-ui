// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storagefarm-appcenter-restore.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storagefarm-appcenter-restore.js
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
 * Original-Hash: fd08ae00acffed93f825c04c0691f80feb37802f003d2bce905f064bba42c1f3
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
 * Regressionstest 0.8.57: Speicherfarm App-Center Restore.
 * Schützt vor dem Feldfehler: Speicherfarm läuft aus storageFarm.configJson,
 * aber der App-Center-Reiter zeigt keine Speicher und könnte sie leer speichern.
 */
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
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[storagefarm-restore] Missing in ${file}: ${needle}`); process.exit(1); } }
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
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[storagefarm-restore] Forbidden in ${file}: ${needle}`); process.exit(1); } }
must('package.json', '"version": "0.8.59"');
must('src-ts/runtime-executables/main.ts', '_nwHydrateStorageFarmConfigFromRuntimeStates');
must('src-ts/runtime-executables/main.ts', 'storageFarm.configJson');
must('src-ts/runtime-executables/main.ts', 'storageFarm.groupsJson');
must('src-ts/runtime-executables/main.ts', '__runtimeStateFallback');
must('src-ts/runtime-executables/main.ts', '_nwProtectStorageFarmPatchFromEmptySubmit');
must('src-ts/runtime-executables/main.ts', '__protectedFromEmptySubmit');
must('src-ts/runtime-executables/main.ts', 'await _nwProtectStorageFarmPatchFromEmptySubmit(safePatch);');
must('src-ts/runtime-executables/www/ems-apps.ts', 'function _ensureStorageFarmCfg()');
must('src-ts/runtime-executables/www/ems-apps.ts', 'const htmlEscape = _nwHtmlEscape');
must('src-ts/runtime-executables/www/ems-apps.ts', '_recoverStorageFarmRowsFromStatusRows');
must('src-ts/runtime-executables/www/ems-apps.ts', "_readApiStateValue(statePayload, 'storageFarm.storagesStatusJson'");
must('src-ts/runtime-executables/main.ts', 'storageFarm.storagesStatusJson');
must('src-ts/runtime-executables/main.ts', 'fromStatusRows');
must('www/ems-apps.html', 'Speicher hinzufügen');
mustNot('src-ts/runtime-executables/main.ts', "const stGroups = await this.getStateAsync('storageFarm.groupsJson').catch(() => null);\n        const stGroups = await this.getStateAsync('storageFarm.groupsJson').catch(() => null);");
console.log('[storagefarm-restore] OK: App-Center Speicherfarm wird aus Runtime-State wiederhergestellt und leere Saves werden geschützt.');
