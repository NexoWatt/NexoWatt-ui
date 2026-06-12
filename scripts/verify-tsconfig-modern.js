#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-tsconfig-modern.js
 *
 * Zweck:
 * Prüft die TypeScript-Konfigurationen auf veraltete Compiler-Optionen, die mit
 * TypeScript 6 bereits Warnungen erzeugen und in TypeScript 7 nicht mehr funktionieren.
 *
 * Zusammenhang:
 * VS Code meldete `moduleResolution=node10` als veraltet. Ursache ist die alte Option
 * `moduleResolution: "Node"`, die intern als node10 behandelt wird. Dieser Check verhindert,
 * dass wir diesen alten Resolver später versehentlich wieder einführen.
 *
 * Wichtig:
 * Wir unterdrücken die Warnung bewusst NICHT mit `ignoreDeprecations`. Ziel ist eine echte
 * Vorbereitung auf TypeScript 7, nicht das Verstecken der Meldung.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Code-Teil: findTsconfigFiles
 *
 * Zweck:
 * Sammelt alle `tsconfig*.json` Dateien im Projektwurzelverzeichnis.
 *
 * Zusammenhang:
 * Die TS-Migration nutzt mehrere spezialisierte Konfigurationsdateien. Alle müssen die
 * gleiche Zukunftsregel einhalten: kein `node`/`node10` Resolver, kein Warn-Verstecken.
 */
function findTsconfigFiles() {
  return fs.readdirSync(ROOT)
    .filter((name) => /^tsconfig.*\.json$/.test(name))
    .map((name) => path.join(ROOT, name));
}

/**
 * Code-Teil: loadJson
 *
 * Zweck:
 * Lädt eine JSON-Datei mit verständlicher Fehlermeldung.
 *
 * Zusammenhang:
 * Kaputte tsconfig-Dateien führen sonst erst später in VS Code oder im Build zu schwer
 * nachvollziehbaren Fehlern. Dieser Check soll früh und klar abbrechen.
 */
function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${path.relative(ROOT, file)} ist kein gültiges JSON: ${err.message}`);
  }
}

/**
 * Code-Teil: validateConfig
 *
 * Zweck:
 * Prüft eine einzelne TypeScript-Konfiguration auf TS-7-kritische Optionen.
 *
 * Wichtig:
 * - `moduleResolution: "Node"` ist der alte node10-Modus und wird ab TS7 entfernt.
 * - `ignoreDeprecations` darf hier nicht genutzt werden, weil es den Fehler nur versteckt.
 */
function validateConfig(file) {
  const rel = path.relative(ROOT, file);
  const json = loadJson(file);
  const compilerOptions = json.compilerOptions || {};
  const moduleResolution = String(compilerOptions.moduleResolution || '').toLowerCase();
  const errors = [];

  if (moduleResolution === 'node' || moduleResolution === 'node10') {
    errors.push(`${rel}: moduleResolution=${compilerOptions.moduleResolution} ist veraltet. Nutze node16/nodenext/bundler.`);
  }
  if (Object.prototype.hasOwnProperty.call(compilerOptions, 'ignoreDeprecations')) {
    errors.push(`${rel}: ignoreDeprecations darf nicht gesetzt werden. Wir beheben Deprecations statt sie zu verstecken.`);
  }
  return errors;
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Führt die moderne tsconfig-Prüfung aus und beendet den Prozess mit Exit-Code 1,
 * wenn eine veraltete Option gefunden wurde.
 */
function main() {
  const errors = [];
  for (const file of findTsconfigFiles()) errors.push(...validateConfig(file));
  if (errors.length) {
    console.error('[tsconfig-modern] Fehler:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }
  console.log('[tsconfig-modern] OK: keine veralteten TypeScript-Resolver/Deprecation-Unterdrückungen gefunden.');
}

main();
