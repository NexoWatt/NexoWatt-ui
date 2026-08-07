#!/usr/bin/env node
'use strict';

/**
 * Fail-closed pre-publish guard for immutable npm package versions.
 *
 * A successful `npm publish --dry-run` validates package contents, but npm's
 * dry-run does not reliably prove that the selected name/version is unused in
 * the public registry. This guard queries the public registry explicitly.
 *
 * Exit codes:
 *   0: version is not published (HTTP/E404 from npm view)
 *   1: version already exists or registry availability could not be verified
 *
 * Offline CI/package checks may set NEXOWATT_SKIP_REGISTRY_VERSION_CHECK=1.
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

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const spec = `${packageName}@${version}`;
const result = spawnSync(
  npmCommand,
  ['view', spec, 'version', '--json', `--registry=${registry}`],
  {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  },
);

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
if (combined) console.error(`[npm-version-free] npm response: ${combined}`);
process.exit(1);
