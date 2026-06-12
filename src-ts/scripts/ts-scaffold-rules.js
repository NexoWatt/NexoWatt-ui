"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRequiredPackageScripts = exports.defaultRequiredTsScaffoldFiles = void 0;
exports.ok = ok;
exports.error = error;
exports.fileExists = fileExists;
exports.requireScaffoldFiles = requireScaffoldFiles;
exports.requirePackageScripts = requirePackageScripts;
exports.requirePublishCheckIndependentFromTypeScript = requirePublishCheckIndependentFromTypeScript;
exports.requireTsconfigIncludesSrcTs = requireTsconfigIncludesSrcTs;
exports.requireBuildConfigDeclarationsOnly = requireBuildConfigDeclarationsOnly;
exports.collectSrcTsFiles = collectSrcTsFiles;
exports.requireMinimumSrcTsFiles = requireMinimumSrcTsFiles;
exports.requireNoRuntimeImportsFromSrcTs = requireNoRuntimeImportsFromSrcTs;
exports.collectTsScaffoldRuleErrors = collectTsScaffoldRuleErrors;
var fs = require("node:fs");
var path = require("node:path");
/** Pflichtdateien der aktuellen TypeScript-Migrationsbasis. */
exports.defaultRequiredTsScaffoldFiles = [
    'tsconfig.json',
    'tsconfig.base.json',
    'tsconfig.build.json',
    'tsconfig.contracts.json',
    'tsconfig.backend.json',
    'tsconfig.frontend.json',
    'src-ts/contracts/index.ts',
    'src-ts/contracts/energy-flow.ts',
    'src-ts/contracts/features.ts',
    'src-ts/contracts/ai-advisor.ts',
    'src-ts/contracts/license.ts',
    'src-ts/contracts/datapoints.ts',
    'src-ts/contracts/iobroker-states.ts',
    'src-ts/contracts/testing.ts',
    'src-ts/scripts/publish-check-rules.ts',
    'src-ts/scripts/ts-scaffold-rules.ts',
    'src-ts/tests/contracts-smoke.ts',
    'src-ts/tests/publish-check-rules-smoke.ts',
    'src-ts/tests/ts-scaffold-rules-smoke.ts',
];
/** Pflichtskripte, die während der TS-Migration vorhanden bleiben müssen. */
exports.defaultRequiredPackageScripts = [
    'typecheck',
    'test:types',
    'build:types',
    'test:contracts',
    'test:ts-scaffold',
    'test:all',
];
/**
 * Code-Teil: ok
 *
 * Zweck:
 * Erzeugt ein erfolgreiches Regelergebnis. Dadurch bleiben alle Regel-Funktionen
 * gleich aufgebaut und später leicht testbar.
 */
function ok() {
    return { ok: true };
}
/**
 * Code-Teil: error
 *
 * Zweck:
 * Erzeugt ein fehlgeschlagenes Regelergebnis mit deutscher Fehlermeldung. Diese
 * Meldung wird im CLI-Skript eins zu eins für Entwickler ausgegeben.
 */
function error(message) {
    return { ok: false, message: message };
}
/**
 * Code-Teil: fileExists
 *
 * Zweck:
 * Prüft eine Datei relativ zum Projektwurzelordner. Die Funktion kapselt den
 * Pfadaufbau, damit die eigentlichen Regeln leichter verständlich bleiben.
 */
function fileExists(rootDir, relativeFile) {
    return fs.existsSync(path.join(rootDir, relativeFile));
}
/**
 * Code-Teil: requireScaffoldFiles
 *
 * Zweck:
 * Prüft, ob alle Pflichtdateien der TypeScript-Migrationsbasis vorhanden sind.
 *
 * Zusammenhang:
 * Wenn hier eine Datei fehlt, ist die TS-Grundstruktur unvollständig und spätere
 * Migrationsschritte können nicht sauber auf den Typverträgen aufbauen.
 */
function requireScaffoldFiles(rootDir, files) {
    if (files === void 0) { files = exports.defaultRequiredTsScaffoldFiles; }
    var results = [];
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        if (!fileExists(rootDir, file))
            results.push(error("Missing required file: ".concat(file)));
    }
    return results.length ? results : [ok()];
}
/**
 * Code-Teil: requirePackageScripts
 *
 * Zweck:
 * Prüft die npm-Skripte, die für Typecheck, Contract-Test und Scaffold-Test
 * benötigt werden.
 *
 * Zusammenhang:
 * Diese Skripte sind unser Sicherheitsnetz. Ohne sie könnten GitHub/CI und
 * lokale Entwickler nicht zuverlässig erkennen, ob die TS-Basis noch intakt ist.
 */
function requirePackageScripts(pkg, scriptNames) {
    if (scriptNames === void 0) { scriptNames = exports.defaultRequiredPackageScripts; }
    var scripts = pkg.scripts || {};
    var results = [];
    for (var _i = 0, scriptNames_1 = scriptNames; _i < scriptNames_1.length; _i++) {
        var scriptName = scriptNames_1[_i];
        if (!scripts[scriptName])
            results.push(error("Missing package.json script: ".concat(scriptName)));
    }
    return results.length ? results : [ok()];
}
/**
 * Code-Teil: requirePublishCheckIndependentFromTypeScript
 *
 * Zweck:
 * Stellt sicher, dass `npm run publish:check` weiterhin ohne `tsc` läuft.
 *
 * Zusammenhang:
 * Der Nutzer hatte unter Windows den Fehler, dass `tsc` nicht gefunden wurde.
 * Deshalb bleibt `publish:check` bewusst unabhängig von TypeScript; GitHub/CI
 * prüft TypeScript zusätzlich über `test:all`.
 */
function requirePublishCheckIndependentFromTypeScript(pkg) {
    var publishCheck = String((pkg.scripts && pkg.scripts['publish:check']) || '');
    if (publishCheck.includes('typecheck') || publishCheck.includes('tsc')) {
        return error('publish:check must stay independent from TypeScript. CI should run test:all.');
    }
    return ok();
}
/**
 * Code-Teil: requireTsconfigIncludesSrcTs
 *
 * Zweck:
 * Prüft, ob `tsconfig.json` den neuen TypeScript-Quellordner `src-ts` mit allen TS-Dateien
 * erfasst.
 *
 * Zusammenhang:
 * Ohne dieses Include würden neue Typverträge nicht vom Typecheck geprüft.
 */
function requireTsconfigIncludesSrcTs(tsconfig) {
    var include = Array.isArray(tsconfig.include) ? tsconfig.include.map(String) : [];
    return include.includes('src-ts/**/*.ts') ? ok() : error('tsconfig.json must include src-ts/**/*.ts');
}
/**
 * Code-Teil: requireBuildConfigDeclarationsOnly
 *
 * Zweck:
 * Prüft, dass der TypeScript-Build aktuell nur Deklarationen erzeugt.
 *
 * Zusammenhang:
 * Wir wollen in dieser Migrationsphase noch keine produktive Laufzeitlogik aus
 * TypeScript bauen. Darum muss `tsconfig.build.json` `emitDeclarationOnly` und
 * `declaration` aktiv haben.
 */
function requireBuildConfigDeclarationsOnly(buildConfig) {
    var options = buildConfig.compilerOptions || {};
    var results = [];
    if (options.emitDeclarationOnly !== true)
        results.push(error('tsconfig.build.json must set compilerOptions.emitDeclarationOnly=true.'));
    if (options.declaration !== true)
        results.push(error('tsconfig.build.json must set compilerOptions.declaration=true.'));
    return results.length ? results : [ok()];
}
/**
 * Code-Teil: collectSrcTsFiles
 *
 * Zweck:
 * Sammelt alle TypeScript-Dateien unter `src-ts`. Das ist die Grundlage für
 * Strukturprüfungen, z. B. die verbotenen Runtime-Imports.
 */
function collectSrcTsFiles(rootDir) {
    var base = path.join(rootDir, 'src-ts');
    var files = [];
    if (!fs.existsSync(base))
        return files;
    var walk = function (dir) {
        for (var _i = 0, _a = fs.readdirSync(dir, { withFileTypes: true }); _i < _a.length; _i++) {
            var entry = _a[_i];
            var full = path.join(dir, entry.name);
            if (entry.isDirectory())
                walk(full);
            else if (entry.isFile() && full.endsWith('.ts'))
                files.push(full);
        }
    };
    walk(base);
    return files.sort();
}
/**
 * Code-Teil: requireMinimumSrcTsFiles
 *
 * Zweck:
 * Verhindert, dass die TS-Basis versehentlich fast leer ausgeliefert wird.
 *
 * Zusammenhang:
 * Dieser Check ist absichtlich grob. Er ersetzt keinen Typecheck, merkt aber
 * sofort, wenn `src-ts` beim Packen oder Umbauen fehlt.
 */
function requireMinimumSrcTsFiles(srcTsFiles, minimum) {
    if (minimum === void 0) { minimum = 8; }
    return srcTsFiles.length >= minimum ? ok() : error("Expected several TypeScript files, found only ".concat(srcTsFiles.length, "."));
}
/**
 * Code-Teil: requireNoRuntimeImportsFromSrcTs
 *
 * Zweck:
 * Prüft, dass `src-ts` noch keine produktiven Runtime-Dateien direkt importiert.
 *
 * Zusammenhang:
 * In dieser Phase sind die TypeScript-Dateien Verträge, Tests und Wartungslogik.
 * Direkte Imports aus `main.js`, `www/**`, `ems/**` oder `admin/**` würden den
 * Scaffold mit der Laufzeit vermischen und könnten später unbemerkt Logik ändern.
 */
function requireNoRuntimeImportsFromSrcTs(rootDir, srcTsFiles) {
    var runtimeImportPattern = /\.\.\/\.\.\/(main|www|ems|admin)\//;
    var results = [];
    for (var _i = 0, srcTsFiles_1 = srcTsFiles; _i < srcTsFiles_1.length; _i++) {
        var file = srcTsFiles_1[_i];
        var text = fs.readFileSync(file, 'utf8');
        if (runtimeImportPattern.test(text)) {
            results.push(error("src-ts file must not import runtime JS directly: ".concat(path.relative(rootDir, file))));
        }
    }
    return results.length ? results : [ok()];
}
/**
 * Code-Teil: collectTsScaffoldRuleErrors
 *
 * Zweck:
 * Führt alle Scaffold-Regeln in einer typisierten Funktion zusammen.
 *
 * Zusammenhang:
 * `scripts/verify-ts-scaffold.js` nutzt diese Logik über die JS-Spiegeldatei.
 * Dadurch ist das CLI-Skript selbst klein, während die eigentlichen Regeln in
 * TypeScript verständlich kommentiert und getestet werden.
 */
function collectTsScaffoldRuleErrors(rootDir, pkg, tsconfig, buildConfig) {
    var srcTsFiles = collectSrcTsFiles(rootDir);
    var results = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], requireScaffoldFiles(rootDir), true), requirePackageScripts(pkg), true), [
        requirePublishCheckIndependentFromTypeScript(pkg),
        requireTsconfigIncludesSrcTs(tsconfig)
    ], false), requireBuildConfigDeclarationsOnly(buildConfig), true), [
        requireMinimumSrcTsFiles(srcTsFiles)
    ], false), requireNoRuntimeImportsFromSrcTs(rootDir, srcTsFiles), true);
    return {
        errors: results.filter(function (item) { return !item.ok && item.message; }).map(function (item) { return String(item.message); }),
        stats: {
            srcTsFileCount: srcTsFiles.length,
            requiredFileCount: exports.defaultRequiredTsScaffoldFiles.length,
        },
    };
}
