// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/ensure-publish-dev-deps.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/ensure-publish-dev-deps.js
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
 * Original-Hash: e16c135287e246ec3212f0f6f033926ec8bb6725d7e7a4f1f483983716ee0aa3
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
 * Code-Teil: Publish-DevDependency-Vorprüfung
 *
 * Zweck:
 * Sorgt vor `publish:check` dafür, dass die TypeScript-Publishchecks auf Windows
 * nicht an einem fehlenden `tsc.cmd` im PATH scheitern. Wenn kein lokaler oder
 * globaler TypeScript-Compiler gefunden wird, werden die DevDependencies aus der
 * package-lock nachinstalliert.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

/**
 * Code-Teil: hasLocalTypeScript
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function hasLocalTypeScript() {
  return fs.existsSync(path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js'));
}

/**
 * Code-Teil: hasPathTypeScript
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function hasPathTypeScript() {
  const command = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const result = childProcess.spawnSync(command, ['--version'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return result.status === 0;
}

/**
 * Code-Teil: runNpmInstall
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function runNpmInstall() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = ['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'];
  console.log('[publish-dev-deps] TypeScript-Compiler nicht gefunden. Installiere DevDependencies für Publish-Check ...');
  const result = childProcess.spawnSync(npmCmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  });
  if (result.error) {
    throw new Error(`[publish-dev-deps] npm install konnte nicht gestartet werden: ${result.error.message || result.error}`);
  }
  if (result.status !== 0) {
    throw new Error(`[publish-dev-deps] npm install ist fehlgeschlagen (Exit ${result.status}). Bitte npm install manuell ausführen und erneut starten.`);
  }
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function main() {
  if (hasLocalTypeScript()) {
    console.log('[publish-dev-deps] OK: lokaler TypeScript-Compiler vorhanden.');
    return;
  }

  if (hasPathTypeScript()) {
    console.log('[publish-dev-deps] OK: TypeScript-Compiler im PATH vorhanden.');
    return;
  }

  runNpmInstall();

  if (!hasLocalTypeScript()) {
    throw new Error('[publish-dev-deps] TypeScript wurde nach npm install nicht gefunden. Bitte node_modules prüfen.');
  }

  console.log('[publish-dev-deps] OK: DevDependencies installiert, lokaler TypeScript-Compiler vorhanden.');
}

try {
  main();
} catch (err) {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}
