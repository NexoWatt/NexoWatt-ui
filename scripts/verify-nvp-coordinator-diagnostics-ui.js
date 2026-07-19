#!/usr/bin/env node
'use strict';

/** Regression 0.8.128: Detaildiagnose gehört in Einstellungen/Status; LIVE-Energiefluss bleibt kompakt. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
const diagnosticsUi = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const tariff = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/tariff-status.ts'), 'utf8');
const liveApp = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/app.ts'), 'utf8');

assert(html.includes('id="nvpCoordinatorStatus"'), 'Statusansicht braucht NVP-Koordinator-Karten');
assert(html.includes('id="nvpCoordinatorLog"'), 'Statusansicht braucht Stabilitätslog');
assert(html.includes('id="refreshNvpCoordinator"'), 'Statusansicht braucht manuellen Refresh');
assert(html.includes('/static/ems-apps-nvp-diagnostics.js'), 'Typisierte NVP-Diagnose muss vor der AppCenter-Runtime geladen werden');
assert(diagnosticsUi.includes('function renderNvpCoordinator(payload'), 'Typisierte Installer-UI muss NVP-Diagnose rendern');
assert(diagnosticsUi.includes('(window as AnyRecord).NexoWattNvpDiagnostics = api'), 'Diagnoserenderer braucht eine kleine, explizite Host-API');
assert(ui.includes('window.NexoWattNvpDiagnostics?.render(data || {})'), 'NVP-Diagnose muss über /api/ems/status aktualisiert werden');
assert(main.includes('nvpCoordinator,'), 'EMS-Status-API muss Koordinator-Snapshot liefern');
assert(main.includes('tariffStatus,'), 'EMS-Status-API muss ausführlichen Tarifstatus liefern');
assert(tariff.includes("await mk('tarif.detailStatusText'"), 'Ausführlicher Tariftext braucht eigenen State');
assert(tariff.includes("await this._setIfChanged('tarif.statusText', statusText)"), 'Kompakte LIVE-Zeile muss bestehen bleiben');
assert(tariff.includes("await this._setIfChanged('tarif.detailStatusText', detailStatusText)"), 'Detailkette muss separat veröffentlicht werden');
assert(tariff.includes('const compactParts = [buildCompactStorageText(result), buildCompactEvcsText(tariff)]'), 'LIVE-Zeile muss kompakt aus Wahrheitsstatus und EVCS-Freigabe entstehen');

// Die neue Detaildiagnose darf nicht in die produktive LIVE-Energieflussdatei kopiert werden.
assert(!liveApp.includes('nvpCoordinatorStatus'), 'NVP-Detailkarten dürfen nicht in der LIVE-Energieflussansicht landen');
assert(!liveApp.includes('nvpCoordinatorLog'), 'Stabilitätslog darf nicht in der LIVE-Energieflussansicht landen');

console.log('[nvp-coordinator-diagnostics-ui] OK: kompakte Tarifzeile im LIVE-Bild, vollständige NVP-/Speicher-/PV-Kette und Ringlog nur unter Einstellungen/Status.');
