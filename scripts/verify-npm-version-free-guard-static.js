#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const guard = fs.readFileSync(path.join(root, 'scripts', 'verify-npm-version-free.js'), 'utf8');
const scripts = pkg.scripts || {};
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

assert.match(String(scripts['release:check-version-free'] || ''), /verify-npm-version-free\.js/,
  'release:check-version-free must call the version-free guard');
assert.strictEqual(
  String(scripts.prepublishOnly || '').trim(),
  'npm run release:check-version-free && npm run sync:ts-runtime-executables && npm run sync:ts-runtime-mirrors && npm run publish:check',
  'prepublishOnly must run version guard first, rebuild runtime files with the installed compiler, synchronize their TS mirrors, then execute the complete publish check'
);
assert.strictEqual(String(pkg.devDependencies?.typescript || ''), '6.0.3',
  'TypeScript must be pinned exactly so npm ci and runtime generation use the same compiler release');
assert.strictEqual(String(lock.packages?.['']?.devDependencies?.typescript || ''), '6.0.3',
  'package-lock root TypeScript declaration must match the exact package.json pin');
assert.strictEqual(String(lock.packages?.['node_modules/typescript']?.version || ''), '6.0.3',
  'package-lock must resolve the exact TypeScript compiler used by the publish runtime sync');
assert.match(guard, /https:\/\/registry\.npmjs\.org/,
  'public npm registry must be the explicit default');
assert.match(guard, /statusCode === 404/,
  'only HTTP 404 may release a version for publishing');
assert.match(guard, /statusCode >= 200 && response\.statusCode < 300/,
  'existing package versions must block publishing');
assert.match(guard, /setTimeout\(timeoutMs/,
  'registry requests must be bounded by a timeout');
assert.match(guard, /fail-closed|sicherheitshalber blockiert/i,
  'ambiguous registry failures must block publishing');

console.log('[npm-version-free-guard] OK: version guard runs first; runtime files and their mirrors are rebuilt with pinned TypeScript 6.0.3 before the full fail-closed publish check.');
