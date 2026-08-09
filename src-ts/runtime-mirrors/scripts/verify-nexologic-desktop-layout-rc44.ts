// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nexologic-desktop-layout-rc44.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-nexologic-desktop-layout-rc44.js
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
 * Original-Hash: 5c086f01ce91ffe01c284df000ad4a3806233233ab35ebeb6c2f12dd56b6a05c
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

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/logic.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');

assert.match(html, /<body class="[^"]*nw-page-logic/);
assert.match(html, /<main class="[^"]*nw-logic-page/);
assert.doesNotMatch(html, /nw-page-hero/);
assert.match(css, /body\.nw-page-logic\{[\s\S]*height:100vh;[\s\S]*overflow:hidden;/);
assert.match(css, /body\.nw-page-logic \.nw-logic-page\{[\s\S]*max-width:none !important;[\s\S]*display:flex;/);
assert.match(css, /body\.nw-page-logic \.nw-le\{[\s\S]*flex:1 1 auto;[\s\S]*overflow:hidden;/);
assert.match(css, /@media \(max-width:1199px\)[\s\S]*min-width:1180px/);

console.log('[nexologic-desktop-layout-rc44] OK: NexoLogic uses the full desktop viewport with independently scrollable palette and inspector.');
