// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-diagnostics-ui.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-shadow-diagnostics-ui.js
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
 * Original-Hash: 26e7b7a52751f9b90e93beade02d12cf8707b086e26c8931d87973fa0ad26a78
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
 * Datei: scripts/verify-ts-shadow-diagnostics-ui.js
 *
 * Zweck:
 * Prüft, ob die App-Center-Oberfläche die TypeScript-Shadow-Diagnose sichtbar
 * anbietet und die Diagnose-API die benötigten JSON-States an das Frontend
 * weiterreicht.
 *
 * Zusammenhang:
 * Dieser Check schützt den Migrationsschritt 0.7.78. Er verhindert, dass die
 * Shadow-Karten oder die zugrunde liegenden API-Felder versehentlich entfernt
 * werden, bevor wir Energiefluss/Core-Limits/Heizstab produktiv auf TS umstellen.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
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
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const errors = [];
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const need = (ok, msg) => { if (!ok) errors.push(msg); };

const html = read('www/ems-apps.html');
const js = read('www/ems-apps.js');
const main = read('main.js');
const css = read('www/styles.css');

need(html.includes('id="shadowDiagnostics"'), 'www/ems-apps.html: shadowDiagnostics Container fehlt.');
need(html.includes('id="refreshShadowDiagnostics"'), 'www/ems-apps.html: Refresh-Button für Shadow-Diagnose fehlt.');
need(js.includes('function renderShadowDiagnostics'), 'www/ems-apps.js: renderShadowDiagnostics fehlt.');
need(js.includes('renderShadowDiagnostics(data || {})'), 'www/ems-apps.js: refreshChargingDiag rendert Shadow-Diagnose nicht.');
need(js.includes('emsBudgetTsShadowJson'), 'www/ems-apps.js: Core-Limits Shadow-JSON wird nicht gelesen.');
need(js.includes('heatingRodTsShadowJson'), 'www/ems-apps.js: Heizstab Shadow-JSON wird nicht gelesen.');
need(js.includes('energyFlowInputsJson'), 'www/ems-apps.js: Energiefluss Shadow-Input wird nicht gelesen.');
need(main.includes("emsBudgetTsShadowJson: await getOwn('ems.budget.tsShadowJson')"), 'main.js: Core-Limits Shadow-JSON fehlt in Diagnose-API.');
need(main.includes("heatingRodTsShadowJson: await getOwn('heatingRod.summary.tsShadowJson')"), 'main.js: Heizstab Shadow-JSON fehlt in Diagnose-API.');
need(main.includes("energyFlowInputsJson: await getOwn('derived.core.building.inputsJson')"), 'main.js: Energiefluss Shadow-JSON fehlt in Diagnose-API.');
need(css.includes('.nw-shadow-badge--ok'), 'www/styles.css: Shadow-Ampel-Styles fehlen.');

if (errors.length) {
  console.error('[ts-shadow-diagnostics-ui] Fehler:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('[ts-shadow-diagnostics-ui] OK: App-Center Shadow-Diagnose ist sichtbar vorbereitet.');
