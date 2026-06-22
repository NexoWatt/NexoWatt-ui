/**
 * Datei: src-ts/scripts/ts-scaffold-rules.ts
 *
 * Zweck:
 * Diese Datei ist der zweite kleine JavaScript-zu-TypeScript-Migrationsschritt
 * im Wartungsbereich. Sie kapselt die Regeln, mit denen wir prüfen, ob die
 * TypeScript-Migrationsbasis vollständig und ungefährlich bleibt.
 *
 * Zusammenhang im Projekt:
 * - `scripts/verify-ts-scaffold.js` ist das Node.js-Laufzeitskript.
 * - `scripts/ts-scaffold-rules.js` ist die JS-Spiegeldatei für lokale Checks
 *   ohne vorherigen TypeScript-Build.
 * - Diese TypeScript-Datei ist die typisierte, kommentierte Quelle für die
 *   spätere vollständige Migration der Wartungsskripte.
 *
 * Wichtig für spätere Änderungen:
 * - Diese Regeln dürfen keine produktive Adapterlogik laden.
 * - `src-ts/**` darf noch nicht direkt aus `main.js`, `www/**`, `ems/**` oder
 *   `admin/**` importieren, damit die Typverträge runtime-frei bleiben.
 * - Neue Regeln hier zuerst verständlich kommentieren und dann in der
 *   JS-Spiegeldatei synchron nachziehen.
 */
/** Ergebnis einer einzelnen Scaffold-Regel. */
export interface TsScaffoldRuleResult {
    /** `true`, wenn die Regel bestanden wurde. */
    ok: boolean;
    /** Deutsche Fehlermeldung, wenn die Regel nicht bestanden wurde. */
    message?: string;
}
/** Minimaler `package.json`-Ausschnitt für Skriptprüfungen. */
export interface PackageJsonScriptsShape {
    scripts?: Record<string, string | undefined>;
}
/** Minimaler `tsconfig.json`-Ausschnitt für Include-Prüfungen. */
export interface TsConfigShape {
    include?: unknown;
    compilerOptions?: Record<string, unknown>;
}
/** Zusätzliche Prüfstatistik für Konsolenausgaben. */
export interface TsScaffoldCheckStats {
    /** Anzahl gefundener TypeScript-Dateien unter `src-ts`. */
    srcTsFileCount: number;
    /** Anzahl geprüfter Pflichtdateien. */
    requiredFileCount: number;
}
/** Gesamtergebnis des Scaffold-Regelblocks. */
export interface TsScaffoldCheckResult {
    /** Alle gesammelten Fehlermeldungen. Leeres Array bedeutet OK. */
    errors: string[];
    /** Kennzahlen für menschlich lesbare Ausgaben im CLI-Skript. */
    stats: TsScaffoldCheckStats;
}
/** Pflichtdateien der aktuellen TypeScript-Migrationsbasis. */
export declare const defaultRequiredTsScaffoldFiles: readonly string[];
/** Pflichtskripte, die während der TS-Migration vorhanden bleiben müssen. */
export declare const defaultRequiredPackageScripts: readonly string[];
/**
 * Code-Teil: ok
 *
 * Zweck:
 * Erzeugt ein erfolgreiches Regelergebnis. Dadurch bleiben alle Regel-Funktionen
 * gleich aufgebaut und später leicht testbar.
 */
export declare function ok(): TsScaffoldRuleResult;
/**
 * Code-Teil: error
 *
 * Zweck:
 * Erzeugt ein fehlgeschlagenes Regelergebnis mit deutscher Fehlermeldung. Diese
 * Meldung wird im CLI-Skript eins zu eins für Entwickler ausgegeben.
 */
export declare function error(message: string): TsScaffoldRuleResult;
/**
 * Code-Teil: fileExists
 *
 * Zweck:
 * Prüft eine Datei relativ zum Projektwurzelordner. Die Funktion kapselt den
 * Pfadaufbau, damit die eigentlichen Regeln leichter verständlich bleiben.
 */
export declare function fileExists(rootDir: string, relativeFile: string): boolean;
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
export declare function requireScaffoldFiles(rootDir: string, files?: readonly string[]): TsScaffoldRuleResult[];
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
export declare function requirePackageScripts(pkg: PackageJsonScriptsShape, scriptNames?: readonly string[]): TsScaffoldRuleResult[];
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
export declare function requirePublishCheckIndependentFromTypeScript(pkg: PackageJsonScriptsShape): TsScaffoldRuleResult;
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
export declare function requireTsconfigIncludesSrcTs(tsconfig: TsConfigShape): TsScaffoldRuleResult;
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
export declare function requireBuildConfigDeclarationsOnly(buildConfig: TsConfigShape): TsScaffoldRuleResult[];
/**
 * Code-Teil: collectSrcTsFiles
 *
 * Zweck:
 * Sammelt alle TypeScript-Dateien unter `src-ts`. Das ist die Grundlage für
 * Strukturprüfungen, z. B. die verbotenen Runtime-Imports.
 */
export declare function collectSrcTsFiles(rootDir: string): string[];
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
export declare function requireMinimumSrcTsFiles(srcTsFiles: readonly string[], minimum?: number): TsScaffoldRuleResult;
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
export declare function requireNoRuntimeImportsFromSrcTs(rootDir: string, srcTsFiles: readonly string[]): TsScaffoldRuleResult[];
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
export declare function collectTsScaffoldRuleErrors(rootDir: string, pkg: PackageJsonScriptsShape, tsconfig: TsConfigShape, buildConfig: TsConfigShape): TsScaffoldCheckResult;
//# sourceMappingURL=ts-scaffold-rules.d.ts.map