// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-main-api-shadow.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-main-api-shadow.js
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
 * Original-Hash: 28fa98a6204f98238f2ee469e11a0c5fa5c5597f0d4d02c20a22069c97f5b564
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
 * Datei: scripts/verify-ts-main-api-shadow.js
 *
 * Zweck:
 * Prüft den Migrationsschritt 0.7.99: /api/state und /api/set laufen über
 * TypeScript-Helfer im Shadow-/Vergleichsmodus.
 *
 * Zusammenhang:
 * Ab 0.7.100 nutzt /api/state produktiv den TS-Builder mit JS-Fallback.
 * Der Shadow-Vergleich bleibt zusätzlich erhalten, damit die Migration weiter messbar ist.
 */

const fs = require('fs');
const path = require('path');
const root = process.cwd();

/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(msg) {
  console.error('[ts-main-api-shadow] ERROR:', msg);
  process.exit(1);
}
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
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Datei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(text, marker, label) {
  if (!text.includes(marker)) fail(`Marker fehlt: ${label}`);
}

const main = read('main.js');
read('lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js');

need(main, "require('./lib/ts-mirrors/backend/main-runtime/main-runtime-helpers')", 'main-runtime TS-Helfer werden geladen');
need(main, '_nwRunApiStateTsShadowComparison', '/api/state Shadow-Funktion vorhanden');
need(main, '_nwRunApiSetTsShadowPlan', '/api/set Shadow-Funktion vorhanden');
need(main, "this._nwRunApiStateTsShadowComparison('GET /api/state')", '/api/state ruft Shadow-Vergleich auf');
need(main, 'this._nwRunApiSetTsShadowPlan(scope, key, value)', '/api/set ruft Shadow-Schreibplan auf');
need(main, 'mainApiTsShadow', '/config zeigt API-Shadow-Diagnose');
need(main, 'res.json(tsStates || this.stateCache)', '/api/state nutzt TS mit JS-Fallback');

const helpers = require(path.join(root, 'lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js'));
if (!helpers || typeof helpers.compareApiStateShadow !== 'function') fail('compareApiStateShadow wird nicht exportiert');
if (typeof helpers.buildApiSetShadowPlan !== 'function') fail('buildApiSetShadowPlan wird nicht exportiert');
const stateResult = helpers.compareApiStateShadow({ zeroW: { value: 0, ts: 1 }, disabled: { value: false, ts: 2 } });
if (!stateResult || stateResult.ok !== true || !stateResult.snapshot || !stateResult.snapshot.zeroValueKeys.includes('zeroW') || !stateResult.snapshot.falseValueKeys.includes('disabled')) {
  fail('compareApiStateShadow behandelt 0/false nicht korrekt');
}
const setPlan = helpers.buildApiSetShadowPlan('settings', 'weatherEnabled', 'false');
if (!setPlan || setPlan.ok !== true || !setPlan.normalized || setPlan.normalized.value !== false) fail('buildApiSetShadowPlan normalisiert false nicht korrekt');
const blocked = helpers.buildApiSetShadowPlan('settings', 'peakShavingEnabled', true);
if (!blocked || blocked.blocked !== true) fail('buildApiSetShadowPlan blockiert peakShavingEnabled nicht');

console.log('[ts-main-api-shadow] OK: /api/state nutzt TS-Fallback-Pfad und Shadow-Diagnose bleibt vorhanden.');
