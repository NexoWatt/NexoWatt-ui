#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const conflictRe = /^(<<<<<<<|=======|>>>>>>>)(\s|$)/;
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.cache']);
const skipExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.zip', '.tgz', '.gz', '.br', '.pdf', '.woff', '.woff2', '.ttf', '.eot']);

function fail(msg) {
  console.error(`[publish-check] ERROR: ${msg}`);
  process.exitCode = 1;
}

function readJson(rel) {
  const file = path.join(root, rel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`${rel} ist kein gültiges JSON: ${err.message}`);
    return null;
  }
}

function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const ent of entries) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

const pkg = readJson('package.json');
const io = readJson('io-package.json');
if (pkg && io) {
  const pkgVer = String(pkg.version || '');
  const ioVer = String((io.common && io.common.version) || io.version || '');
  if (!pkgVer) fail('package.json enthält keine version.');
  if (!ioVer) fail('io-package.json enthält keine common.version/version.');
  if (pkgVer && ioVer && pkgVer !== ioVer) fail(`Versionskonflikt: package.json=${pkgVer}, io-package.json=${ioVer}`);
}

for (const file of walk(root)) {
  const ext = path.extname(file).toLowerCase();
  if (skipExt.has(ext)) continue;
  let txt = '';
  try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
  const rel = path.relative(root, file);
  const lines = txt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (conflictRe.test(lines[i])) {
      fail(`ungelöster Git-Konfliktmarker in ${rel}:${i + 1}: ${lines[i].slice(0, 80)}`);
      break;
    }
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('[publish-check] OK: JSON gültig, keine ungelösten Git-Konfliktmarker gefunden.');
