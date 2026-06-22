'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const allowedDirs = new Set(['.git', 'node_modules', 'build-ts']);
const forbidden = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.' || entry.name === '..') continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (allowedDirs.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (/\.(zip|tgz)$/i.test(entry.name)) {
      forbidden.push(rel);
    }
  }
}

walk(root);
if (forbidden.length) {
  throw new Error('Release archive(s) are embedded in the repository/package tree and must be removed:\n' + forbidden.join('\n'));
}
console.log('No embedded .zip/.tgz release archives found in repository tree.');
