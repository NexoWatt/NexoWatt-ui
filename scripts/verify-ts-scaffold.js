#!/usr/bin/env node
'use strict';

/**
 * Prüfskript: TypeScript-Migrationsbasis.
 *
 * Zweck:
 * Prüft nur Struktur, Skripte und Typvertragsdateien der TS-Migration.
 * Produktive Adapterlogik wird nicht geladen und nicht verändert.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.build.json',
  'tsconfig.contracts.json',
  'tsconfig.backend.json',
  'tsconfig.frontend.json',
  'src-ts/contracts/index.ts',
  'src-ts/contracts/energy-flow.ts',
  'src-ts/contracts/features.ts',
  'src-ts/contracts/ai-advisor.ts',
  'src-ts/contracts/license.ts',
  'src-ts/contracts/datapoints.ts',
  'src-ts/contracts/iobroker-states.ts',
  'src-ts/contracts/testing.ts',
  'src-ts/tests/contracts-smoke.ts',
];

function fail(message) {
  console.error(`[ts-scaffold-check] ERROR: ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing required file: ${file}`);
}

const pkg = readJson('package.json');
const scripts = pkg.scripts || {};
for (const scriptName of ['typecheck', 'test:types', 'build:types', 'test:contracts', 'test:ts-scaffold', 'test:all']) {
  if (!scripts[scriptName]) fail(`Missing package.json script: ${scriptName}`);
}
if (scripts['publish:check'] && scripts['publish:check'].includes('typecheck')) {
  fail('publish:check must stay independent from TypeScript. CI should run test:all.');
}

const tsconfig = readJson('tsconfig.json');
if (!Array.isArray(tsconfig.include) || !tsconfig.include.includes('src-ts/**/*.ts')) {
  fail('tsconfig.json must include src-ts/**/*.ts');
}

const buildConfig = readJson('tsconfig.build.json');
if (!buildConfig.compilerOptions || buildConfig.compilerOptions.emitDeclarationOnly !== true || buildConfig.compilerOptions.declaration !== true) {
  fail('tsconfig.build.json must emit declarations only.');
}

const srcTsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.ts')) srcTsFiles.push(full);
  }
}
walk(path.join(root, 'src-ts'));
if (srcTsFiles.length < 8) fail(`Expected several TypeScript files, found only ${srcTsFiles.length}.`);

for (const file of srcTsFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.\.\/\.\.\/(main|www|ems|admin)\//.test(text)) {
    fail(`src-ts file must not import runtime JS directly: ${path.relative(root, file)}`);
  }
}

if (!process.exitCode) {
  console.log(`[ts-scaffold-check] OK: ${srcTsFiles.length} TypeScript files checked.`);
}
