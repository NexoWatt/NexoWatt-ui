// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-ai-advisor-runtime-typing.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-ts-ai-advisor-runtime-typing.js
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
 * Original-Hash: 48b33da51231a7a8ef24bc7c9429e3916e41513438966ec4c3cfb7434ead157d
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

/**
 * Code-Teil: AI-Advisor Runtime-Typisierungscheck
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für
 * `src-ts/runtime-mirrors/ems/modules/ai-advisor.ts`.
 *
 * Zusammenhang:
 * Die produktive KI-Beratung läuft weiterhin über `ems/modules/ai-advisor.js`.
 * Diese Prüfung nimmt den TS-Spiegel, entfernt temporär `@ts-nocheck` und kompiliert
 * ihn in einem gelockerten Migrationsmodus. Dadurch sehen wir, ob Adapterzugriff,
 * Datenpunkt-Registry, Vorschläge, Snapshot, Lernzustand und Tagesplan als erste
 * Verträge tragfähig sind, ohne die Runtime umzuschalten.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'ems', 'modules', 'ai-advisor.ts');

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Sichert ab, dass die neue Typisierungsarbeit in der AI-Advisor-Spiegeldatei
 * vorhanden bleibt und nicht versehentlich durch einen Roh-Spiegel ersetzt wurde.
 */
function requireContains(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[ts-ai-advisor-runtime-typing] Missing ${label}: ${marker}`);
  }
}

/**
 * Code-Teil: resolveTypeScriptBinary
 *
 * Zweck:
 * Nutzt bevorzugt den lokalen TypeScript-Compiler aus `node_modules`. Falls lokal
 * kein `npm install` gelaufen ist, kann ein vorhandener PATH-Compiler als Fallback
 * genutzt werden. Das betrifft nur diesen Migrationscheck, nicht die Adapter-Runtime.
 */
function resolveTypeScriptBinary() {
  const localBin = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  if (fs.existsSync(localBin)) return localBin;
  return process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
}

/**
 * Code-Teil: buildTemporaryCheckFiles
 *
 * Zweck:
 * Erstellt eine temporäre Kopie des AI-Advisor-Spiegels ohne `@ts-nocheck` und eine
 * dazu passende gelockerte tsconfig. So prüfen wir echte TypeScript-Kompilierbarkeit,
 * ohne den gesamten historischen JS-Code schon streng typisieren zu müssen.
 */
function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-ai-advisor-ts-'));
  const tempSource = path.join(tempDir, 'ai-advisor-typed-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const stripped = source.replace(/^\/\/ @ts-nocheck\r?\n/, '');
  fs.writeFileSync(tempSource, stripped, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: true,
      strict: false,
      noImplicitAny: false,
      noImplicitReturns: false,
      noImplicitOverride: false,
      noUncheckedIndexedAccess: false,
      exactOptionalPropertyTypes: false,
      module: 'NodeNext',
      moduleResolution: 'nodenext',
      allowUnreachableCode: true,
      allowUnusedLabels: true,
      types: []
    },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'Ai-Advisor Runtime-Migrationshinweis (DE)', 'deutscher AI-Migrationskommentar');
  requireContains(source, 'type AiAdvisorAdapterLike', 'Adapter-Vertrag');
  requireContains(source, 'type AiAdvisorDpRegistryLike', 'Datenpunkt-Registry-Vertrag');
  requireContains(source, 'type AiAdvisorRuntimeConfig', 'Konfigurations-Vertrag');
  requireContains(source, 'type AiAdvisorSuggestion', 'Vorschlags-Vertrag');
  requireContains(source, 'type AiAdvisorSnapshotLike', 'Snapshot-Vertrag');
  requireContains(source, 'type AiAdvisorLearningState', 'Lernzustand-Vertrag');
  requireContains(source, 'type AiAdvisorPlanState', 'Tagesplan-Vertrag');
  requireContains(source, 'adapter: AiAdvisorAdapterLike;', 'typisiertes Adapter-Feld');
  requireContains(source, '_lastLearning: AiAdvisorLearningState;', 'typisierter Lernzustand');
  requireContains(source, '_lastPlan: AiAdvisorPlanState;', 'typisierter Tagesplan');
  requireContains(source, 'constructor(adapter: AiAdvisorAdapterLike, dpRegistry: AiAdvisorDpRegistryLike)', 'typisierter Konstruktor');

  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const tsc = resolveTypeScriptBinary();
  const result = childProcess.spawnSync(tsc, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error('[ts-ai-advisor-runtime-typing] AI-Advisor-TS-Spiegel ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-ai-advisor-runtime-typing] OK: AI-Advisor-Spiegel ist gezielt typisiert und in gelockertem Migrationsmodus kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
