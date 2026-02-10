#!/usr/bin/env node
/*
  NexoWatt UI – version bump helper

  Updates both:
    - package.json (npm)
    - io-package.json (ioBroker)

  Usage:
    node scripts/bump-version.js [patch|minor|major] [--dry-run] [--quiet]

  Notes:
    - Default bump type is "patch".
    - Keeps formatting stable (2-space JSON + trailing newline).
*/

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return { raw, json: JSON.parse(raw) };
}

function writeJson(filePath, obj) {
  const out = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(filePath, out, 'utf8');
}

function parseSemver(v) {
  const s = String(v || '').trim();
  // Very small semver parser: major.minor.patch (no prerelease/build)
  const m = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(s);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3])
  };
}

function bumpSemver(v, type) {
  const p = parseSemver(v);
  if (!p) {
    throw new Error(`Invalid version format: "${v}" (expected x.y.z)`);
  }
  const t = String(type || 'patch').toLowerCase();
  if (t === 'patch') return `${p.major}.${p.minor}.${p.patch + 1}`;
  if (t === 'minor') return `${p.major}.${p.minor + 1}.0`;
  if (t === 'major') return `${p.major + 1}.0.0`;
  throw new Error(`Unknown bump type: "${type}" (use patch|minor|major)`);
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = (args.find((a) => !a.startsWith('--')) || 'patch').toLowerCase();
  const dryRun = args.includes('--dry-run');
  const quiet = args.includes('--quiet');

  const root = path.join(__dirname, '..');
  const pkgPath = path.join(root, 'package.json');
  const ioPath = path.join(root, 'io-package.json');

  const pkg = readJson(pkgPath);
  const io = readJson(ioPath);

  const pkgVer = pkg.json && pkg.json.version ? String(pkg.json.version) : '';
  const ioVer = io.json && io.json.common && io.json.common.version ? String(io.json.common.version) : '';

  // Prefer package.json as the single source of truth, but enforce consistency.
  const current = pkgVer || ioVer;
  if (!current) throw new Error('Unable to detect current version (package.json.version / io-package.json.common.version).');

  if (pkgVer && ioVer && pkgVer !== ioVer) {
    throw new Error(
      `Version mismatch: package.json=${pkgVer} vs io-package.json=${ioVer}. ` +
        'Please align them first (or fix manually) before bumping.'
    );
  }

  const next = bumpSemver(current, bumpType);

  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log(`[version] ${current} -> ${next}${dryRun ? ' (dry-run)' : ''}`);
  }

  if (dryRun) return;

  // Update versions
  pkg.json.version = next;
  io.json.common = io.json.common && typeof io.json.common === 'object' ? io.json.common : {};
  io.json.common.version = next;

  writeJson(pkgPath, pkg.json);
  writeJson(ioPath, io.json);
}

try {
  main();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(e && e.message ? e.message : e);
  process.exit(1);
}
