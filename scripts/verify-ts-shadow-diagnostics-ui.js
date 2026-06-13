#!/usr/bin/env node
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
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const errors = [];
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
