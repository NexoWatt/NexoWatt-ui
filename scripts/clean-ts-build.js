#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/clean-ts-build.js
 *
 * Zweck:
 * Entfernt temporäre TypeScript-Ausgabeordner, bevor der Declaration-Build läuft.
 * Dadurch bleiben keine alten Build-Artefakte im Paket liegen.
 *
 * Zusammenhang:
 * - `npm run build:ts` ruft zuerst dieses Skript auf.
 * - Danach erzeugt `tsc -p tsconfig.build.json` ausschließlich `.d.ts`-Dateien
 *   unter `build-ts/types`.
 * - Produktive Adapterdateien wie `main.js`, `www/*.js` und `ems/modules/*.js`
 *   werden nicht verändert.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'build-ts'),
  path.join(root, 'build-types'),
  path.join(root, 'build', 'types'),
];

for (const target of targets) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[clean-ts-build] removed ${path.relative(root, target)}`);
  } catch (err) {
    console.error(`[clean-ts-build] failed to remove ${target}: ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  }
}
