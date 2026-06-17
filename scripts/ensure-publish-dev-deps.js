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
 *
 * Windows-Härtung ab 0.8.5:
 * - kein direkter `spawnSync('npm.cmd', ..., { shell: false })` mehr, weil das auf
 *   einzelnen Windows-/npm-Kombinationen mit EINVAL abbrechen kann.
 * - bevorzugt wird `node <npm-cli.js> install ...` über `process.env.npm_execpath`.
 * - als Fallback wird `cmd.exe /d /s /c npm install ...` genutzt.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

function hasLocalTypeScript() {
  return fs.existsSync(path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js'));
}

function spawnChecked(command, args, options) {
  const opts = Object.assign({ cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' }, options || {});
  const isWindowsCmd = process.platform === 'win32' && /\.cmd$/i.test(String(command || ''));
  if (isWindowsCmd && opts.shell === undefined) opts.shell = true;
  return childProcess.spawnSync(command, args, opts);
}

function hasPathTypeScript() {
  const command = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const result = spawnChecked(command, ['--version'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return result.status === 0;
}

function quoteForCmd(value) {
  const raw = String(value || '');
  if (!raw) return '""';
  if (!/[\s"&()<>^|]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '\\"')}"`;
}

function npmInstallCandidates(args) {
  const candidates = [];
  const npmExecPath = String(process.env.npm_execpath || '').trim();

  if (npmExecPath && fs.existsSync(npmExecPath) && /(?:npm-cli\.js|npm\.js)$/i.test(npmExecPath)) {
    candidates.push({
      label: `node ${npmExecPath}`,
      command: process.execPath,
      args: [npmExecPath, ...args],
      shell: false
    });
  }

  if (process.platform === 'win32') {
    const npmLine = ['npm', ...args].map(quoteForCmd).join(' ');
    candidates.push({
      label: 'cmd.exe /d /s /c npm install',
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', npmLine],
      shell: false
    });
    candidates.push({
      label: 'npm.cmd install über Shell',
      command: 'npm.cmd',
      args,
      shell: true
    });
  } else {
    candidates.push({
      label: 'npm install',
      command: 'npm',
      args,
      shell: false
    });
  }

  return candidates;
}

function runNpmInstall() {
  const args = ['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'];
  console.log('[publish-dev-deps] TypeScript-Compiler nicht gefunden. Installiere DevDependencies für Publish-Check ...');

  const attempts = [];
  for (const candidate of npmInstallCandidates(args)) {
    console.log(`[publish-dev-deps] Starte: ${candidate.label}`);
    const result = childProcess.spawnSync(candidate.command, candidate.args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: candidate.shell === true,
      env: process.env
    });
    attempts.push({ candidate, result });

    if (!result.error && result.status === 0) return;

    const reason = result.error ? (result.error.message || String(result.error)) : `Exit ${result.status}`;
    console.warn(`[publish-dev-deps] Versuch fehlgeschlagen (${candidate.label}): ${reason}`);
  }

  const detail = attempts.map(({ candidate, result }) => {
    const reason = result.error ? (result.error.message || String(result.error)) : `Exit ${result.status}`;
    return `${candidate.label}: ${reason}`;
  }).join(' | ');
  throw new Error(
    `[publish-dev-deps] npm install konnte nicht erfolgreich gestartet werden. ` +
    `Bitte einmal manuell ausführen: npm install --include=dev --ignore-scripts --no-audit --no-fund. Details: ${detail}`
  );
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
