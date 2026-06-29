// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-core-limits-shadow-log-fix.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-core-limits-shadow-log-fix.js
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
 * Original-Hash: 5142e21972ea4319d74088d297af12fe0e5b2d9b5f2df7d041d46febffeeaf67
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
 * 0.8.60 Regression: Core-Limits TS-Shadow darf bei Anlagen ohne Netzlimit
 * keinen minütlichen Warn-Spam für grid.effectiveW erzeugen. Die Abweichung
 * bleibt als Info im tsShadowJson sichtbar, aber der produktive TS-Takeover
 * bleibt blockiert, weil JS null/unlimited und TS 0/missing-input nicht identisch sind.
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
function must(file, needle, label){ const s=read(file); if(!s.includes(needle)){ console.error(`[core-shadow-log-fix] Missing ${label}: ${needle}`); process.exit(1);} }
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
function mustNot(file, needle, label){ const s=read(file); if(s.includes(needle)){ console.error(`[core-shadow-log-fix] Forbidden ${label}: ${needle}`); process.exit(1);} }
for (const file of ['src-ts/runtime-executables/ems/modules/core-limits.ts','ems/modules/core-limits.js']) {
  must(file, 'isBenignGridNoLimitMismatch', 'benign no-limit classifier');
  must(file, 'js-grid-headroom-unlimited-vs-ts-missing-input-zero', 'benign mismatch reason');
  must(file, 'blockingMismatches', 'blocking mismatch list');
  must(file, 'benignMismatches', 'benign mismatch list');
  must(file, 'if (blockingMismatches.length > 0)', 'warn only for blocking mismatches');
  must(file, 'keine Warnspam', 'German documentation for no warning spam');
  mustNot(file, 'if (!result.ok) {\n                const now = Date.now();', 'old warn-on-any-mismatch block');
}
console.log('[core-shadow-log-fix] OK: grid.effectiveW Shadow-Warnspam ist entschärft, Diagnose bleibt erhalten.');
