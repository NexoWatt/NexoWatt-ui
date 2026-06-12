#!/usr/bin/env node
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: scripts/verify-publish.js
 * Rolle im Projekt: Build-/Wartungsskript.
 * Zweck: Hilfsskript für Versionierung, Publish-Prüfung, Hooks oder Sicherheit im Releaseprozess.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Wartungs-/Release-Skript für Versionierung, Prüfung oder Sicherheits-/Publish-Aufgaben.
 * Zusammenhänge:
 * - Wird über npm scripts oder Release-Prozess aufgerufen.
 * - Prüft bzw. verändert Metadaten, aber keine EMS-Laufzeitlogik.
 * Wartungshinweise:
 * - Skripte müssen auf Windows und Linux robust laufen.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const conflictRe = /^(<<<<<<<|=======|>>>>>>>)(\s|$)/;
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.cache']);
const skipExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.zip', '.tgz', '.gz', '.br', '.pdf', '.woff', '.woff2', '.ttf', '.eot']);
/**
 * Code-Teil: fail
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fail(msg) {
  console.error(`[publish-check] ERROR: ${msg}`);
  process.exitCode = 1;
}
/**
 * Code-Teil: warn
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function warn(msg) {
  console.warn(`[publish-check] WARN: ${msg}`);
}
/**
 * Code-Teil: readJson
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function readJson(rel) {
  const file = path.join(root, rel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`${rel} ist kein gültiges JSON: ${err.message}`);
    return null;
  }
}
/**
 * Code-Teil: walk
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
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
/**
 * Code-Teil: hasNativeProtection
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function hasNativeProtection(io, key) {
  return Array.isArray(io && io[key]) && io[key].includes('licenseKey');
}
/**
 * Code-Teil: ensureScriptSyntax
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function ensureScriptSyntax(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  try {
    execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
  } catch (err) {
    const stderr = err && err.stderr ? String(err.stderr) : String(err && err.message ? err.message : err);
    fail(`Syntaxfehler in ${rel}: ${stderr.trim().split('\n').slice(0, 4).join(' ')}`);
  }
}

const pkg = readJson('package.json');
const io = readJson('io-package.json');
const manifest = readJson('www/manifest.webmanifest');

if (pkg && io) {
  const common = io.common || {};
  const pkgVer = String(pkg.version || '');
  const ioVer = String(common.version || io.version || '');

  if (!pkgVer) fail('package.json enthält keine version.');
  if (!ioVer) fail('io-package.json enthält keine common.version.');
  if (pkgVer && ioVer && pkgVer !== ioVer) fail(`Versionskonflikt: package.json=${pkgVer}, io-package.json=${ioVer}`);
  if (manifest && String(manifest.version || '') !== pkgVer) fail(`Versionskonflikt: manifest.webmanifest=${manifest.version}, package.json=${pkgVer}`);

  const name = String(pkg.name || '');
  if (!name.startsWith('iobroker.')) fail('package.json name muss mit "iobroker." beginnen.');
  if (name !== name.toLowerCase()) fail('package.json name muss lowercase sein.');
  if (pkg.installedFrom) fail('package.json darf kein installedFrom enthalten.');

  const enginesNode = String((pkg.engines && pkg.engines.node) || '');
  if (!enginesNode) fail('package.json engines.node fehlt.');
  if (!/>=\s*22/.test(enginesNode)) fail(`package.json engines.node sollte für die neue Basis >=22 sein, ist aber '${enginesNode}'.`);

  for (const field of ['name', 'version', 'type', 'connectionType', 'dataSource']) {
    if (common[field] === undefined || common[field] === null || common[field] === '') fail(`io-package.json common.${field} fehlt.`);
  }
  if (!Array.isArray(common.authors) || common.authors.length === 0) fail('io-package.json common.authors fehlt oder ist leer.');
  if (!common.adminUI || common.adminUI.config !== 'json') fail('io-package.json common.adminUI.config sollte "json" sein.');
  if (common.compact !== true) warn('io-package.json common.compact ist nicht true.');
  if (![1, 2, 3].includes(Number(common.tier))) fail('io-package.json common.tier muss 1, 2 oder 3 sein.');
  if (!Array.isArray(common.dependencies) || common.dependencies.length === 0) fail('io-package.json common.dependencies fehlt.');
  if (!Array.isArray(common.globalDependencies) || common.globalDependencies.length === 0) fail('io-package.json common.globalDependencies fehlt.');
  if (!common.licenseInformation || typeof common.licenseInformation !== 'object') fail('io-package.json common.licenseInformation fehlt.');

  const news = common.news || {};
  const newsCount = news && typeof news === 'object' ? Object.keys(news).length : 0;
  if (newsCount > 7) fail(`io-package.json common.news enthält ${newsCount} Einträge; erlaubt/empfohlen sind maximal 7.`);
  if (io.news) fail('io-package.json enthält zusätzliches top-level news; bitte nur common.news verwenden.');
  if (io.version) fail('io-package.json enthält zusätzliches top-level version; bitte common.version verwenden.');

  // 0.7.51: licenseKey protection/encryption is intentionally not enforced here.
  // It caused an ioBroker/Admin regression where masked placeholders could be
  // returned to the custom license UI and overwrite valid existing keys.
  // Runtime save now rejects masked placeholders; native encryption can be
  // re-enabled later once the Admin flow has been fully verified end-to-end.
  if (hasNativeProtection(io, 'protectedNative')) warn('io-package.json protectedNative enthält licenseKey; bitte License-UI-Maskierung erneut komplett testen.');
  if (hasNativeProtection(io, 'encryptedNative')) warn('io-package.json encryptedNative enthält licenseKey; bitte Runtime-/Admin-Entschlüsselung erneut komplett testen.');
  if (!io.native || !Object.prototype.hasOwnProperty.call(io.native, 'ip')) fail('io-package.json native.ip fehlt.');

  const inst = Array.isArray(io.instanceObjects) ? io.instanceObjects : [];
  if (!inst.some(o => o && o._id === 'info.connection')) fail('io-package.json instanceObjects.info.connection fehlt.');

  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  if (/process\.exit\s*\(/.test(main)) fail('main.js darf process.exit() nicht verwenden; adapter.terminate()/Unload verwenden.');
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

// Syntax-check runtime JS that ships with the adapter.
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (!rel.endsWith('.js')) continue;
  if (rel.startsWith('admin/react/assets/')) continue; // bundled/minified build output
  if (rel.startsWith('src-admin-tab/')) continue;      // React source is built by Vite
  ensureScriptSyntax(rel);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('[publish-check] OK: JSON, ioBroker metadata, conflict markers and JS syntax look good.');
