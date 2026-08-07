// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-npm-version-free-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-npm-version-free-runtime.js
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
 * Original-Hash: 1b940a47f5d8244c5924da4fed7eb92e797300f7df47430851abe22be58f74e3
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
 * Regression test for the cross-platform npm version collision guard.
 *
 * It injects a tiny fake npm-cli.js through npm_execpath. This verifies the
 * exact invocation path used by npm on Windows without requiring network
 * access and prevents a regression to direct `spawnSync('npm.cmd', ...)`.
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const guard = path.join(root, 'scripts', 'verify-npm-version-free.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-npm-version-free-'));
const fakeNpmCli = path.join(tmp, 'npm-cli.js');

fs.writeFileSync(fakeNpmCli, `
'use strict';
const mode = String(process.env.NEXOWATT_FAKE_NPM_MODE || 'free');
if (mode === 'exists') {
  process.stdout.write(JSON.stringify('0.8.156') + '\\n');
  process.exit(0);
}
if (mode === 'free') {
  process.stderr.write('npm error code E404\\nnpm error 404 Not Found\\n');
  process.exit(1);
}
process.stderr.write('npm error code ECONNRESET\\nnpm error network unavailable\\n');
process.exit(1);
`, 'utf8');

/**
 * Code-Teil: run
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function run(mode) {
  return spawnSync(process.execPath, [guard], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_execpath: fakeNpmCli,
      NEXOWATT_FAKE_NPM_MODE: mode,
      NEXOWATT_SKIP_REGISTRY_VERSION_CHECK: '0',
      NEXOWATT_NPM_REGISTRY: 'https://registry.example.invalid',
    },
  });
}

try {
  const free = run('free');
  assert.equal(free.status, 0, `free version must pass: ${free.stdout}\n${free.stderr}`);
  assert.match(`${free.stdout}\n${free.stderr}`, /not published/i);

  const exists = run('exists');
  assert.equal(exists.status, 1, 'existing version must fail');
  assert.match(`${exists.stdout}\n${exists.stderr}`, /already exists/i);

  const outage = run('outage');
  assert.equal(outage.status, 1, 'unknown registry state must fail closed');
  assert.match(`${outage.stdout}\n${outage.stderr}`, /could not be verified/i);

  const source = fs.readFileSync(guard, 'utf8');
  assert.doesNotMatch(source, /spawnSync\(\s*['"]npm\.cmd['"]/i, 'guard must not directly spawn npm.cmd with shell=false');
  assert.match(source, /process\.env\.npm_execpath/);
  assert.match(source, /process\.execPath/);

  console.log('[npm-version-free-runtime] OK: npm-cli.js invocation, E404, collision and fail-closed paths verified.');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
