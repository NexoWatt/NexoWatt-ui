#!/usr/bin/env node
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
