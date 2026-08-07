// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-npm-version-free.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-npm-version-free.js
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
 * Original-Hash: b9acdc4586d0e0fe5a87f1368e58bc5c392fb837c099416ef6fba01a80d7d580
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
 * Fail-closed pre-publish guard for immutable npm package versions.
 *
 * A successful `npm publish --dry-run` validates package contents, but npm's
 * dry-run does not reliably prove that the selected name/version is unused in
 * the public registry. This guard queries the public registry explicitly.
 *
 * Windows note:
 * `.cmd` wrappers must not be started directly through spawnSync with
 * `shell: false`; some Node/npm combinations fail with EINVAL. While this
 * script is executed by npm, `process.env.npm_execpath` points to npm-cli.js.
 * We therefore invoke that JavaScript file through the current Node binary.
 * A cmd.exe fallback is retained for direct/manual script execution.
 *
 * Exit codes:
 *   0: version is not published (npm E404)
 *   1: version already exists or registry availability could not be verified
 *
 * Offline package checks may set NEXOWATT_SKIP_REGISTRY_VERSION_CHECK=1.
 * Never set that variable for a real `npm publish`.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageName = String(pkg.name || '').trim();
const version = String(pkg.version || '').trim();
const registry = String(process.env.NEXOWATT_NPM_REGISTRY || 'https://registry.npmjs.org').trim();
const skip = String(process.env.NEXOWATT_SKIP_REGISTRY_VERSION_CHECK || '').trim() === '1';

if (!packageName || !version) {
  console.error('[npm-version-free] ERROR: package name/version missing in package.json.');
  process.exit(1);
}

if (skip) {
  console.warn(`[npm-version-free] SKIP: registry collision check disabled for ${packageName}@${version}.`);
  console.warn('[npm-version-free] Do not use NEXOWATT_SKIP_REGISTRY_VERSION_CHECK=1 for a real publish.');
  process.exit(0);
}

const spec = `${packageName}@${version}`;
const npmArgs = ['view', spec, 'version', '--json', `--registry=${registry}`];

/**
 * Code-Teil: quoteForCmd
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function quoteForCmd(value) {
  const raw = String(value || '');
  if (!raw) return '""';
  if (!/[\s"&()<>^|]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '\\"')}"`;
}

/**
 * Code-Teil: npmCandidates
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function npmCandidates() {
  const candidates = [];
  const npmExecPath = String(process.env.npm_execpath || '').trim();

  // Authoritative path for `npm run ...` and `npm publish`: execute npm-cli.js
  // with Node instead of spawning npm.cmd directly on Windows.
  if (npmExecPath && fs.existsSync(npmExecPath) && /(?:npm-cli\.js|npm\.js)$/i.test(npmExecPath)) {
    candidates.push({
      label: `node ${npmExecPath}`,
      command: process.execPath,
      args: [npmExecPath, ...npmArgs],
      shell: false,
    });
  }

  if (process.platform === 'win32') {
    const commandLine = ['npm', ...npmArgs].map(quoteForCmd).join(' ');
    candidates.push({
      label: 'cmd.exe /d /s /c npm view',
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', commandLine],
      shell: false,
    });
    candidates.push({
      label: 'npm.cmd view via shell',
      command: 'npm.cmd',
      args: npmArgs,
      shell: true,
    });
  } else {
    candidates.push({
      label: 'npm view',
      command: 'npm',
      args: npmArgs,
      shell: false,
    });
  }

  return candidates;
}

/**
 * Code-Teil: runNpmView
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function runNpmView() {
  const spawnErrors = [];
  for (const candidate of npmCandidates()) {
    const result = spawnSync(candidate.command, candidate.args, {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
      shell: candidate.shell === true,
      env: process.env,
    });

    if (result.error) {
      spawnErrors.push(`${candidate.label}: ${result.error.message || result.error}`);
      continue;
    }

    return { ...result, candidate: candidate.label, spawnErrors };
  }

  return {
    status: null,
    stdout: '',
    stderr: '',
    error: new Error(spawnErrors.join(' | ') || 'No npm command candidate could be started.'),
    candidate: '',
    spawnErrors,
  };
}

const result = runNpmView();
const stdout = String(result.stdout || '').trim();
const stderr = String(result.stderr || '').trim();
const combined = `${stdout}\n${stderr}`.trim();

if (result.error) {
  console.error(`[npm-version-free] ERROR: public registry could not be queried for ${spec}.`);
  console.error(`[npm-version-free] ${result.error.message || result.error}`);
  process.exit(1);
}

if (result.status === 0) {
  console.error(`[npm-version-free] ERROR: ${spec} already exists in ${registry}.`);
  console.error('[npm-version-free] Increment the adapter version and synchronize all manifests before publishing.');
  process.exit(1);
}

const isNotFound = /(?:\bE404\b|404\s+Not\s+Found|No\s+match\s+found|is\s+not\s+in\s+this\s+registry)/i.test(combined);
if (isNotFound) {
  console.log(`[npm-version-free] OK: ${spec} is not published in ${registry}.`);
  process.exit(0);
}

console.error(`[npm-version-free] ERROR: availability of ${spec} could not be verified fail-safe.`);
if (result.candidate) console.error(`[npm-version-free] npm invocation: ${result.candidate}`);
if (combined) console.error(`[npm-version-free] npm response: ${combined}`);
process.exit(1);
