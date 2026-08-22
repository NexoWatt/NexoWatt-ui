#!/usr/bin/env node
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const manifestPath = path.join(root, 'scripts', 'release-artifact-manifest.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
  throw new Error('package.json files ist leer.');
}
const normalize = (value) => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const paths = pkg.files.map(normalize);
if (new Set(paths).size !== paths.length) throw new Error('package.json files enthält doppelte Pfade.');
const forbiddenPath = /(^|\/)(?:node_modules|\.git|\.github|src-ts|src-admin-tab|build(?:-ts|-types)?)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|zip|tgz|map))$/i;
const files = paths.map((relativePath) => {
  if (forbiddenPath.test(relativePath)) throw new Error(`Nicht veröffentlichbarer Pfad: ${relativePath}`);
  const absolutePath = path.join(root, relativePath);
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) throw new Error(`Paketpfad ist keine Datei: ${relativePath}`);
  const data = fs.readFileSync(absolutePath);
  return { path: relativePath, size: data.length, sha256: sha256(data) };
});
const manifest = { package: pkg.name, version: pkg.version, generatedAt: new Date().toISOString(), files };
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[release-manifest] OK: ${pkg.name}@${pkg.version}, ${files.length} Paketdateien.`);
