// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-charging-grid-cap-clamp.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-charging-grid-cap-clamp.js
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
 * Original-Hash: 3c139dca7db7449aae90dce35192b1742010ff007bbc07156908d3125fb69a44
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
const src = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
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
function must(text, needle, label) { if (!text.includes(needle)) { console.error(`[charging-grid-cap-clamp] Missing ${label}: ${needle}`); process.exit(1); } }
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
/**
 * Code-Teil: calc
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function calc(gridW,totalPowerW,gridLimit,derived=null){const raw=gridW-totalPowerW; const base=Number.isFinite(derived)?Math.max(0,derived):Math.max(0,raw); const local=Math.max(0,base-Math.max(0,raw)); const cap=clamp(gridLimit-base,0,gridLimit); return {raw,base,local,cap};}
const r=calc(34,10970,40000,9000);
if(r.raw!==-10936||r.base!==9000||r.cap!==31000){console.error('[charging-grid-cap-clamp] derived base example failed',r);process.exit(1);}
const r2=calc(12000,3000,40000,null);
if(r2.base!==9000||r2.cap!==31000){console.error('[charging-grid-cap-clamp] fallback base example failed',r2);process.exit(1);}
must(src,'gridBaseLoadRawW = gridW -','raw base load');
must(src,'derived.core.building.loadRestW','energy-flow loadRestW preference');
must(src,'gridBaseLoadW = Number.isFinite(Number(derivedBaseLoadW))','derived base load preference');
must(src,'gridLocalSupportW = Math.max(0, gridBaseLoadW - Math.max(0, gridBaseLoadRawW))','local support diagnostic');
must(src,'clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)','hard clamp cap to grid limit');
must(src,'chargingManagement.control.gridBaseLoadRawW','raw base state');
must(src,'chargingManagement.control.gridLocalSupportW','local support state');
must(main,'gridBaseLoadRawW','api raw base');
must(main,'gridLocalSupportW','api local support');
must(ui,'Grundlast (wirksam)','ui effective base');
must(ui,'Lokale Deckung','ui local support');
console.log('[charging-grid-cap-clamp] OK');
