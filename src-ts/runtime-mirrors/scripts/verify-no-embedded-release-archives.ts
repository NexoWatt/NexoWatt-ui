// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-no-embedded-release-archives.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-no-embedded-release-archives.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: d6bf81767ebd50a0e48b522499f80f0eb69032207e0a70f1bf52b010f6adf1a6
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const allowedDirs = new Set(['.git', 'node_modules', 'build-ts']);
const forbidden = [];

/**
 * Code-Teil: walk
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
