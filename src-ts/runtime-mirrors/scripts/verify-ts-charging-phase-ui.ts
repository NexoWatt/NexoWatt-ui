// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-charging-phase-ui.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-charging-phase-ui.js
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
 * Original-Hash: 36ccc0abf6fe7f2fcc5fbcd4ead01c2f2e8a8739d4814098b5dacf33eafb51d6
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
 * Verify EVCS AC 1p/3p phase UI is wired in the customer modal and EVCS page.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
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
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
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
function need(cond, msg) {
  if (!cond) {
    console.error('[charging-phase-ui] ERROR: ' + msg);
    process.exit(1);
  }
}

const appTs = read('src-ts/runtime-executables/www/app.ts');
const evcsTs = read('src-ts/runtime-executables/www/evcs.ts');
const indexHtml = read('www/index.html');
const mainTs = read('src-ts/runtime-executables/main.ts');
const cmTs = read('src-ts/runtime-executables/ems/modules/charging-management.ts');

need(indexHtml.includes('id="evcsPhaseRow"'), 'LIVE-Modal enthält keinen AC-Phasenmodus-Block.');
need(indexHtml.includes('data-phase-mode="fixed-1p"') && indexHtml.includes('data-phase-mode="fixed-3p"') && indexHtml.includes('data-phase-mode="auto-pv"'), 'LIVE-Modal bietet nicht 1p/3p/Auto-PV an.');
need(appTs.includes('evcsPhaseButtons') && appTs.includes("apiSet('ems', 'evcs.1.phaseMode'"), 'LIVE-TS schreibt den Phasenmodus nicht über /api/set.');
need(appTs.includes('phaseSwitchSupported') && appTs.includes('phaseCooldownRemainingMs'), 'LIVE-TS zeigt Phasenumschalt-Diagnose/Cooldown nicht an.');
need(appTs.includes('phaseRow.style.display = (!!hasEms && isAc && hasPhaseSwitchDp)') && appTs.includes('const hasPhaseSwitchDp = supported === true'), 'LIVE-Phasenbedienung muss ohne zugeordneten Haupt-DP unsichtbar bleiben.');
need(evcsTs.includes('data-ems-phase-mode-btn') && evcsTs.includes('evcs.${idx}.phaseMode'), 'EVCS-Seite hat keine pro-Ladepunkt-Phasenmodus-Bedienung.');
need(evcsTs.includes('const phaseSupported = emsPhaseSupported === true') && evcsTs.includes('const showPhaseUi = hasEms && phaseSupported'), 'EVCS-Seite muss Phasenbedienung ohne zugeordneten Haupt-DP vollständig ausblenden.');
need(!appTs.includes('Kein Phasenumschalt-DP zugeordnet') && !evcsTs.includes('Kein Phasenumschalt-DP zugeordnet'), 'Phasenbedienung darf bei fehlendem Haupt-DP nicht gesperrt sichtbar sein.');
need(mainTs.includes('phaseMode|userPhaseMode') && mainTs.includes('chargingManagement.wallboxes.${safe}.userPhaseMode'), 'Backend /api/set erlaubt den Phasenmodus-User-Override nicht.');
need(cmTs.includes("'userPhaseMode'") && cmTs.includes('phaseSwitchSupported') && cmTs.includes('userPhaseMode = normalizePhaseModeRuntime'), 'Charging-Management wertet userPhaseMode nicht als Runtime-Override aus.');
const appJs = read('www/app.js');
const evcsJs = read('www/evcs.js');
need(appJs.includes('evcsPhaseRow') && evcsJs.includes('data-ems-phase-mode-btn'), 'Runtime-JS ist nicht aus den TS-Phasen-UI-Quellen synchronisiert.');
need(appJs.includes('phaseRow.style.display = (!!hasEms && isAc && hasPhaseSwitchDp)') && evcsJs.includes('const phaseSupported = emsPhaseSupported === true'), 'Runtime-JS blendet Phasenbedienung ohne Haupt-DP nicht aus.');
need(!appJs.includes('Kein Phasenumschalt-DP zugeordnet') && !evcsJs.includes('Kein Phasenumschalt-DP zugeordnet'), 'Runtime-JS enthält noch sichtbare Gesperrt-Hinweise für fehlende Haupt-DPs.');

console.log('[charging-phase-ui] OK: EVCS AC-Phasenmodus ist nur bei zugeordnetem Phasen-Haupt-DP sichtbar und sonst unsichtbar.');
