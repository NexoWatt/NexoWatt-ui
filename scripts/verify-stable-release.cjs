#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fail = (message) => {
  console.error(`[stable-release] ERROR: ${message}`);
  process.exit(1);
};
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const ioPackage = readJson('io-package.json');
const webManifest = readJson('www/manifest.webmanifest');
const releaseManifest = readJson('scripts/release-artifact-manifest.json');
const version = String(pkg.version || '');

if (!/^[1-9]\d*\.\d+\.\d+$/.test(version)) {
  fail(`Version ist keine stabile SemVer ab 1.0.0: ${version || '<leer>'}`);
}
const aligned = {
  package: version,
  lock: String(lock.version || ''),
  lockRoot: String(lock.packages?.['']?.version || ''),
  ioPackage: String(ioPackage.common?.version || ''),
  webManifest: String(webManifest.version || ''),
  webAppVersion: String(webManifest.appVersion || ''),
  releaseManifest: String(releaseManifest.version || ''),
};
for (const [source, value] of Object.entries(aligned)) {
  if (value !== version) fail(`Versionskonflikt ${source}=${value || '<leer>'}, erwartet ${version}`);
}
if (releaseManifest.package !== pkg.name) fail('Release-Manifest enthält einen abweichenden Paketnamen.');
const newsVersions = Object.keys(ioPackage.common?.news || {});
if (!ioPackage.common?.news?.[version]) fail(`io-package.json enthält keinen News-Eintrag für ${version}.`);
if (newsVersions[0] !== version) fail(`Aktuelle Stable-Version ${version} ist nicht der erste News-Eintrag.`);
if (newsVersions.length > 7) fail(`io-package.json enthält ${newsVersions.length} News-Einträge; maximal 7 sind zulässig.`);

const files = Array.isArray(pkg.files) ? pkg.files : [];
for (const required of ['docs/STABLE_1_0_0_RELEASE_DE.md', 'scripts/verify-stable-release.cjs']) {
  if (!files.includes(required)) fail(`Stable-Paketdatei fehlt in package.json files: ${required}`);
  if (!fs.existsSync(path.join(root, required))) fail(`Stable-Paketdatei fehlt im Repository: ${required}`);
  if (!releaseManifest.files.some((entry) => entry.path === required)) fail(`Stable-Paketdatei fehlt im Release-Manifest: ${required}`);
}
if (pkg.scripts?.['test:stable-release'] !== 'node scripts/verify-stable-release.cjs') {
  fail('test:stable-release ist nicht korrekt registriert.');
}
if (!String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-release')) {
  fail('test:stable-release ist nicht Bestandteil von test:all.');
}
const prepublishOnly = String(pkg.scripts?.prepublishOnly || '');
for (const requiredStep of ['npm run release:check-version-free', 'npm run publish:check', 'npm run test:stable-release', 'node scripts/verify-publish.js', 'npm run test:package-runtime-start-smoke']) {
  if (!prepublishOnly.includes(requiredStep)) fail(`Prepublish-Guard enthält den Pflichtschritt nicht: ${requiredStep}`);
}
const releaseCheck = String(pkg.scripts?.['release:check'] || '');
for (const requiredStep of ['npm run test:all', 'npm run build:ts', 'npm run publish:check', 'npm run test:package-runtime-start-smoke', 'npm run test:package']) {
  if (!releaseCheck.includes(requiredStep)) fail(`Release-Check enthält den Pflichtschritt nicht: ${requiredStep}`);
}

const changelog = read('CHANGELOG.md');
const firstHeading = changelog.match(/^##\s+([^\s]+)\s+-\s+(\d{4}-\d{2}-\d{2})/);
if (!firstHeading || firstHeading[1] !== version) fail('CHANGELOG beginnt nicht mit der aktuellen Stable-Version.');
const nextHeadingIndex = changelog.indexOf('\n## ', firstHeading[0].length);
const currentSection = nextHeadingIndex >= 0 ? changelog.slice(0, nextHeadingIndex) : changelog;
if (!/Official Stable/i.test(currentSection)) fail('Aktueller CHANGELOG-Abschnitt ist nicht als Official Stable gekennzeichnet.');
if (/Stable Candidate/i.test(currentSection)) fail('Aktueller CHANGELOG-Abschnitt enthält noch Stable-Candidate-Text.');

const publishNow = read('PUBLISH_NOW.txt');
if (!publishNow.includes(`NexoWatt UI ${version} – OFFICIAL STABLE RELEASE`)) fail('PUBLISH_NOW.txt trägt nicht die offizielle Stable-Kennung.');
if (/Stable Candidate/i.test(publishNow)) fail('PUBLISH_NOW.txt enthält noch Stable-Candidate-Text.');
const publishCmd = read('PUBLISH_NPM.cmd');
if (!publishCmd.includes(`NexoWatt EOS ${version} Stable`)) fail('PUBLISH_NPM.cmd enthält nicht die aktuelle Stable-Version.');
if (/0\.8\.203/.test(publishCmd)) fail('PUBLISH_NPM.cmd enthält noch die veraltete RC78-Version.');

const readme = read('README.md');
if (!readme.includes(`**Current stable release:** \`${version}\``)) fail('README enthält nicht die aktuelle Stable-Version.');
const stableDoc = read('docs/STABLE_1_0_0_RELEASE_DE.md');
if (!stableDoc.includes(`NexoWatt EOS ${version}`) || !/offizielle Stable-Version/i.test(stableDoc)) {
  fail('Stable-Release-Dokumentation ist unvollständig.');
}

for (const relativePath of ['src-ts/runtime-executables/www/ems-apps.ts', 'src-ts/runtime-mirrors/www/ems-apps.ts', 'www/ems-apps.js']) {
  const text = read(relativePath);
  if (text.includes('RC93‑Reihenfolge') || text.includes('RC93-Reihenfolge')) {
    fail(`Sichtbarer Candidate-Hinweis verbleibt in ${relativePath}.`);
  }
}
for (const relativePath of ['src-ts/runtime-executables/www/sw.ts', 'src-ts/runtime-mirrors/www/sw.ts', 'www/sw.js']) {
  const text = read(relativePath);
  if (!text.includes("const CACHE_NAME = 'nexowatt-cache-v500';")) fail(`PWA-Cache-Bump fehlt in ${relativePath}.`);
}

const rc66Verifier = read('scripts/verify-rc66-station-display-stable.js');
if (!rc66Verifier.includes("isVersionAtLeast(pkg.version, '0.8.191')")) {
  fail('RC66-Prüfer besitzt keinen SemVer-festen Mindestversionsvergleich.');
}
if (/versionParts\[0\]\s*!==\s*0/.test(rc66Verifier)) {
  fail('RC66-Prüfer enthält noch eine auf 0.8.x fest verdrahtete Major-Version.');
}

console.log(`[stable-release] OK: ${pkg.name}@${version} ist konsistent als Official Stable versiegelt.`);
console.log('[stable-release] OK: Funktionsbaseline bleibt RC93; Release-, PWA- und sichtbare Stable-Kennzeichnungen sind synchron.');
