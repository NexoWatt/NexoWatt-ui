'use strict';

/**
 * Datei: scripts/publish-check-rules.js
 *
 * Zweck:
 * JavaScript-Spiegel der TypeScript-Quelle
 * `src-ts/scripts/publish-check-rules.ts`.
 *
 * Zusammenhang:
 * `scripts/verify-publish.js` muss weiterhin ohne TypeScript-Build laufen,
 * damit lokales `npm run publish:check` auf Windows nicht an fehlendem `tsc`
 * scheitert. Darum bleibt diese kleine JS-Datei vorerst die Runtime-Variante.
 *
 * Wichtig für spätere TypeScript-Migration:
 * Änderungen an Prüfregeln zuerst in der TS-Quelle kommentieren und typisieren,
 * anschließend diese JS-Spiegeldatei synchron halten. Sobald die Script-Buildkette
 * stabil ist, kann diese Datei automatisch aus TypeScript erzeugt werden.
 */

/**
 * Code-Teil: requirePackageName
 * Zweck: Prüft die ioBroker-konforme npm-Paketbenennung.
 */
function requirePackageName(pkg) {
  const name = String(pkg && pkg.name || '');
  if (!name.startsWith('iobroker.')) return { ok: false, message: 'package.json name muss mit "iobroker." beginnen.' };
  if (name !== name.toLowerCase()) return { ok: false, message: 'package.json name muss lowercase sein.' };
  return { ok: true };
}

/**
 * Code-Teil: requireNodeEngine22
 * Zweck: Sichert die neue Node.js-Basis >=22 für künftige Adapter-Releases.
 */
function requireNodeEngine22(pkg) {
  const enginesNode = String(pkg && pkg.engines && pkg.engines.node || '');
  if (!enginesNode) return { ok: false, message: 'package.json engines.node fehlt.' };
  if (!/>=\s*22/.test(enginesNode)) return { ok: false, message: `package.json engines.node sollte für die neue Basis >=22 sein, ist aber '${enginesNode}'.` };
  return { ok: true };
}

/**
 * Code-Teil: requireNoInstalledFrom
 * Zweck: Verhindert, dass lokale Installationsspuren im npm-Paket landen.
 */
function requireNoInstalledFrom(pkg) {
  if (pkg && pkg.installedFrom) return { ok: false, message: 'package.json darf kein installedFrom enthalten.' };
  return { ok: true };
}

/**
 * Code-Teil: requireIoCommonBasics
 * Zweck: Prüft zentrale ioBroker-Metadaten im common-Block.
 */
function requireIoCommonBasics(common) {
  common = common || {};
  const results = [];
  for (const field of ['name', 'version', 'type', 'connectionType', 'dataSource']) {
    if (common[field] === undefined || common[field] === null || common[field] === '') results.push({ ok: false, message: `io-package.json common.${field} fehlt.` });
  }
  if (!Array.isArray(common.authors) || common.authors.length === 0) results.push({ ok: false, message: 'io-package.json common.authors fehlt oder ist leer.' });
  if (!common.adminUI || common.adminUI.config !== 'json') results.push({ ok: false, message: 'io-package.json common.adminUI.config sollte "json" sein.' });
  if (![1, 2, 3].includes(Number(common.tier))) results.push({ ok: false, message: 'io-package.json common.tier muss 1, 2 oder 3 sein.' });
  if (!Array.isArray(common.dependencies) || common.dependencies.length === 0) results.push({ ok: false, message: 'io-package.json common.dependencies fehlt.' });
  if (!Array.isArray(common.globalDependencies) || common.globalDependencies.length === 0) results.push({ ok: false, message: 'io-package.json common.globalDependencies fehlt.' });
  if (!common.licenseInformation || typeof common.licenseInformation !== 'object') results.push({ ok: false, message: 'io-package.json common.licenseInformation fehlt.' });
  return results.length ? results : [{ ok: true }];
}

/**
 * Code-Teil: requireNewsLimit
 * Zweck: Hält common.news klein; alte Historie gehört in CHANGELOG.md.
 */
function requireNewsLimit(common, maxEntries = 7) {
  common = common || {};
  const news = common.news || {};
  const count = news && typeof news === 'object' ? Object.keys(news).length : 0;
  if (count > maxEntries) return { ok: false, message: `io-package.json common.news enthält ${count} Einträge; erlaubt/empfohlen sind maximal ${maxEntries}.` };
  return { ok: true };
}

/**
 * Code-Teil: requireNoTopLevelIoNewsOrVersion
 * Zweck: Verhindert doppelte io-package-Metadaten außerhalb von common.
 */
function requireNoTopLevelIoNewsOrVersion(io) {
  io = io || {};
  const results = [];
  if (io.news) results.push({ ok: false, message: 'io-package.json enthält zusätzliches top-level news; bitte nur common.news verwenden.' });
  if (io.version) results.push({ ok: false, message: 'io-package.json enthält zusätzliches top-level version; bitte common.version verwenden.' });
  return results.length ? results : [{ ok: true }];
}

/**
 * Code-Teil: collectPublishRuleErrors
 * Zweck: Bündelt die kleinen Einzelregeln für `verify-publish.js`.
 */
function collectPublishRuleErrors(pkg, io) {
  const common = io && io.common || {};
  const results = [
    requirePackageName(pkg || {}),
    requireNodeEngine22(pkg || {}),
    requireNoInstalledFrom(pkg || {}),
    ...requireIoCommonBasics(common),
    requireNewsLimit(common),
    ...requireNoTopLevelIoNewsOrVersion(io || {}),
  ];
  return results.filter((item) => !item.ok && item.message).map((item) => String(item.message));
}

module.exports = {
  collectPublishRuleErrors,
  requirePackageName,
  requireNodeEngine22,
  requireNoInstalledFrom,
  requireIoCommonBasics,
  requireNewsLimit,
  requireNoTopLevelIoNewsOrVersion,
};
