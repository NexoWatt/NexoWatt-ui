// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-heating-rod-hard-fallback-only.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-heating-rod-hard-fallback-only.js
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
 * Original-Hash: bc543da9fea63f2147714f596b08c97f69687d148f6b163c7e6217684e6c5275
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
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
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
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8');
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
const fail=(m)=>{console.error('[heating-rod-hard-fallback-only] ERROR: '+m);process.exit(1);};
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const must=(t,m,l)=>{if(!t.includes(m))fail(`${l} fehlt: ${m}`)};
const runtime=read('ems/modules/heating-rod-control.js'), mirror=read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts'), main=read('main.js'), ui=read('www/ems-apps.js');
for(const [m,l] of [['heatingRod.summary.tsFallbackPolicyJson','Fallback-Policy-State'],["mode: heatingRodTsNormalSource && heatingRodTsNormalSource.ready ? 'hard-blockers-only'",'Hard-Blockers-Only-Modus'],['legacyJsReferenceMode','JS-Referenz nur Diagnose'],['mismatches = normalPathReady ? [] : referenceMismatches','blockierende Mismatches getrennt'],['referenceMismatches','Referenzmismatches getrennt'],['jsReferenceDecisionUsed','JS-Entscheidung Policy']]) must(runtime,m,'runtime: '+l);
must(main,'heatingRodTsFallbackPolicyJson','main.js liest Fallback-Policy'); must(ui,'JS-Fallback-Modus','UI Fallbackmodus'); must(ui,'JS-Referenz','UI JS-Referenz'); must(mirror,'Heating-Rod Runtime-Migrationshinweis (DE)','Mirror Migrationskommentar'); must(mirror,'jsFallbackLimitedToHardBlockers','Mirror Notfallback-Marker');
console.log('[heating-rod-hard-fallback-only] OK: Heizstab-JS-Pfad ist auf Notfallback vorbereitet.');
