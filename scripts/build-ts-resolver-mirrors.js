#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-resolver-mirrors.js
 *
 * Zweck:
 * Baut die ersten TypeScript-Resolver als CommonJS-Spiegeldateien für spätere
 * Runtime-Integration.
 *
 * Zusammenhang:
 * - Quelle: `src-ts/resolvers/**` plus benötigte reine Helfer aus `src-ts/utils/**`
 * - Build-Ausgabe: `build-ts/resolver-mirrors/**`
 * - eingecheckter Spiegel: `lib/ts-mirrors/**`
 *
 * Wichtig:
 * Diese Spiegel werden in 0.7.69 noch nicht von `main.js`, `www/app.js` oder den
 * EMS-Modulen produktiv verwendet. Sie sind nur die sichere Vorstufe für einen späteren
 * Vergleichsmodus: alte JS-Logik und neue TS-Resolver können dann nebeneinander geprüft
 * werden, bevor ein produktiver Umschaltpunkt entsteht.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.resolver-mirrors.json');
const outDir = path.join(root, 'build-ts', 'resolver-mirrors');
const mirrorDir = path.join(root, 'lib', 'ts-mirrors');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

/**
 * Code-Teil: fail
 * Zweck: Bricht Build/Check mit klarer Meldung ab. Dadurch wird in GitHub/CI sofort
 * sichtbar, wenn TS-Quelle und JS-Spiegel auseinanderlaufen.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-resolver-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: resolveTscCommand
 * Zweck: Findet den TypeScript-Compiler. Lokal nutzen wir die Projektversion aus
 * `node_modules`; als Fallback kann ein globales `tsc` genutzt werden.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/**
 * Code-Teil: normalizeNewlines
 * Zweck: Vereinheitlicht Zeilenenden, damit Checks unter Windows und Linux identisch
 * arbeiten. Das schützt uns vor unnötigen Git-Diffs.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest eine Pflichtdatei und bricht mit fachlicher Meldung ab, wenn sie fehlt.
 */
function readRequired(file) {
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${path.relative(root, file)}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/**
 * Code-Teil: sourcePathForBuiltFile
 * Zweck: Leitet aus einer gebauten JS-Datei die ursprüngliche TypeScript-Quelle ab.
 * So kann jeder Mirror einen Quell-Hash bekommen.
 */
function sourcePathForBuiltFile(builtFile) {
  const rel = path.relative(outDir, builtFile).replace(/\\/g, '/').replace(/\.js$/i, '.ts');
  return path.join(root, 'src-ts', rel);
}

/**
 * Code-Teil: sourceHash
 * Zweck: Erzeugt einen Hash der TypeScript-Quelle. Der Hash wird im JS-Spiegel abgelegt
 * und später ohne TypeScript-Compiler geprüft.
 */
function sourceHash(sourceFile) {
  return crypto.createHash('sha256').update(readRequired(sourceFile)).digest('hex');
}

/**
 * Code-Teil: collectBuiltJsFiles
 * Zweck: Sammelt alle vom TS-Compiler erzeugten JS-Dateien. Dazu gehören neben den
 * Resolvern auch benötigte reine Helfer wie `src-ts/utils/number.ts`.
 */
function collectBuiltJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectBuiltJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out.sort();
}

/**
 * Code-Teil: runTypescriptCompiler
 * Zweck: Kompiliert nur die freigegebenen Resolver-Spiegel. Es wird bewusst nicht das
 * gesamte Projekt gebaut und keine produktive Runtime-Datei überschrieben.
 */
function runTypescriptCompiler() {
  if (!fs.existsSync(tsConfig)) fail(`tsconfig fehlt: ${path.relative(root, tsConfig)}`);
  const tsc = resolveTscCommand();
  const result = spawnSync(tsc.command, [...tsc.argsPrefix, '-p', tsConfig], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    fail('TypeScript-Build für Resolver-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 * Zweck: Erzeugt den Generator-Kopf. Der Kommentar verhindert, dass später versehentlich
 * die generierte JS-Datei statt der TypeScript-Quelle bearbeitet wird.
 */
function generatedHeader(sourceRel) {
  const sourceFile = path.join(root, sourceRel);
  return [
    "'use strict';",
    '',
    '/**',
    ' * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ` * Quelle: ${sourceRel}`,
    ` * Quell-Hash: sha256:${sourceHash(sourceFile)}`,
    ' * Erzeugung: npm run sync:ts-resolver-mirrors',
    ' *',
    ' * Zweck:',
    ' * Diese Datei ist ein CommonJS-Spiegel einer TypeScript-Resolver-Quelle.',
    ' * Sie wird in 0.7.69 noch nicht produktiv geladen. Sie bereitet den späteren',
    ' * Energiefluss-/Feature-Sichtbarkeits-Vergleichsmodus vor.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in src-ts/resolvers/ oder den benötigten src-ts/utils/ vornehmen.',
    ' * 2. npm run sync:ts-resolver-mirrors ausführen.',
    ' * 3. npm run test:resolver-mirrors prüfen.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: normalizeBuiltOutput
 * Zweck: Entfernt den Compiler-Strict-Header und setzt unseren erklärenden Generator-
 * Kopf davor. Fachliche Kommentare aus TypeScript bleiben erhalten.
 */
function normalizeBuiltOutput(builtFile) {
  const relBuilt = path.relative(outDir, builtFile).replace(/\\/g, '/');
  const sourceRel = `src-ts/${relBuilt.replace(/\.js$/i, '.ts')}`;
  let text = readRequired(builtFile);
  text = text.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  return generatedHeader(sourceRel) + text.replace(/\s+$/g, '') + '\n';
}

/**
 * Code-Teil: buildMirrorTexts
 * Zweck: Führt den TS-Build aus und baut die erwarteten JS-Spiegeltexte inklusive
 * benötigter Hilfsdateien.
 */
function buildMirrorTexts() {
  runTypescriptCompiler();
  return collectBuiltJsFiles(outDir).map((builtFile) => {
    const rel = path.relative(outDir, builtFile).replace(/\\/g, '/');
    return {
      builtFile,
      mirrorFile: path.join(mirrorDir, rel),
      mirrorRel: path.join('lib', 'ts-mirrors', rel).replace(/\\/g, '/'),
      text: normalizeBuiltOutput(builtFile),
    };
  });
}

/**
 * Code-Teil: checkMirrorIsCurrent
 * Zweck: Vergleicht eingecheckten JS-Spiegel und aktuellen Build. So kann kein Commit
 * entstehen, bei dem TypeScript-Quelle und Runtime-Spiegel auseinanderlaufen.
 */
function checkMirrorIsCurrent(item) {
  const current = fs.existsSync(item.mirrorFile) ? normalizeNewlines(fs.readFileSync(item.mirrorFile, 'utf8')) : '';
  if (current !== item.text) {
    fail(`${item.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-resolver-mirrors ausführen und committen.`);
  }
}

/**
 * Code-Teil: writeRuntimeMirror
 * Zweck: Schreibt den CJS-Spiegel in den eingecheckten Mirror-Ordner. Diese Datei ist
 * später importierbar, aber in 0.7.69 noch nicht produktiv verdrahtet.
 */
function writeRuntimeMirror(item) {
  fs.mkdirSync(path.dirname(item.mirrorFile), { recursive: true });
  fs.writeFileSync(item.mirrorFile, item.text, 'utf8');
  console.log(`[build-ts-resolver-mirrors] wrote ${item.mirrorRel}`);
}

const mirrors = buildMirrorTexts();
if (!mirrors.length) fail('Keine Resolver-Spiegel erzeugt.');

if (checkOnly) {
  for (const item of mirrors) checkMirrorIsCurrent(item);
  console.log('[build-ts-resolver-mirrors] OK: Resolver-CJS-Spiegel sind synchron.');
} else {
  for (const item of mirrors) writeRuntimeMirror(item);
}
