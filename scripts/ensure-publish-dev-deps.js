#!/usr/bin/env node
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

function hasLocalTypeScript() {
  return fs.existsSync(path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js'));
}

function hasPathTypeScript() {
  const command = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const result = childProcess.spawnSync(command, ['--version'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return result.status === 0;
}

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
