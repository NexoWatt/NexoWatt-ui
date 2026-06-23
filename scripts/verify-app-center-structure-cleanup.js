#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-app-center-structure-cleanup.js
 * Zweck: Regressionstest für das App-Center-Schema ab 0.8.33.
 * Hintergrund: Der Apps-Reiter darf nur Funktionsmodule anzeigen. Reine Zuordnung
 * wie Marktprofil/NL-P1 gehört in den Reiter Zuordnung; DC-Stationsseiten gehören
 * in den Reiter Ladepunkte. Dieser Test verhindert, dass spätere Features wieder
 * ungeordnet vorne unter „Apps“ abgelegt werden.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www', 'ems-apps.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const ts = fs.readFileSync(path.join(root, 'src-ts', 'runtime-executables', 'www', 'ems-apps.ts'), 'utf8');

function fail(message) {
  console.error(`[app-center-structure] ERROR: ${message}`);
  process.exit(1);
}
function mustContain(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} fehlt: ${needle}`);
}
function mustNotContain(text, needle, label) {
  if (text.includes(needle)) fail(`${label} darf nicht enthalten: ${needle}`);
}

mustContain(html, 'id="systemProfileMappingSlot"', 'Zuordnung-Slot Marktprofil');
mustContain(html, 'id="nlP1MappingSlot"', 'Zuordnung-Slot NL P1/DSMR');
mustContain(html, 'id="chargeKioskEvcsSlot"', 'Ladepunkte-Slot DC Station Display');
mustContain(html, 'id="nw-emsapps-back-installer"', 'Zurück-zum-Installer-Button');

// 0.8.34: Der Zurück-Button muss auf den Admin-Tab zeigen, nicht auf tab.html
// des Adapter-Webservers. Der Test schützt vor dem konkreten Fehlerbild
// „Die Datei /tab.html konnte nicht abgerufen werden“.
mustContain(html, 'href="/#tab-nexowatt-ui-0"', 'Zurück-Link Admin-Hash-Fallback');
mustContain(ts, 'tab-nexowatt-ui-', 'Zurück-Button Admin-Hash im TS');
mustContain(ts, 'detectAdminOrigin', 'Zurück-Button Admin-Origin-Erkennung');
mustNotContain(ts, "return 'tab.html'", 'alter relativer tab.html-Fallback');
mustNotContain(js, "return 'tab.html'", 'alter relativer tab.html-Fallback Runtime');
mustContain(html, 'href="/#tab-nexowatt-ui-0"', 'statischer Fallback für Admin-Tab-Rücksprung');
mustContain(ts, 'function getInstallerAdminUrl()', 'TS Admin-Rücksprung-URL-Resolver');
mustContain(ts, '#tab-nexowatt-ui-0', 'TS Admin-Tab-Ziel');
mustContain(ts, 'adminPort', 'TS Admin-Port-Fallback');
mustContain(js, 'function getInstallerAdminUrl()', 'Runtime Admin-Rücksprung-URL-Resolver');
mustContain(js, '#tab-nexowatt-ui-0', 'Runtime Admin-Tab-Ziel');

mustContain(ts, 'function buildAppCenterStructurePanels()', 'TS-Struktur-Renderer');
mustContain(js, 'function buildAppCenterStructurePanels()', 'Runtime-Struktur-Renderer');

mustNotContain(ts, "{ id: 'nlP1'", 'APP_CATALOG');
mustNotContain(ts, "{ id: 'chargeKiosk'", 'APP_CATALOG');
mustNotContain(js, "{ id: 'nlP1'", 'APP_CATALOG Runtime');
mustNotContain(js, "{ id: 'chargeKiosk'", 'APP_CATALOG Runtime');

mustContain(ts, 'nw-storagefarm-master-detail', 'Speicherfarm Master-Detail TS');
mustContain(js, 'nw-storagefarm-master-detail', 'Speicherfarm Master-Detail Runtime');

console.log('[app-center-structure] OK: App-Center-Schema, Admin-Rücksprung und Speicherfarm-Master-Detail sind abgesichert.');
