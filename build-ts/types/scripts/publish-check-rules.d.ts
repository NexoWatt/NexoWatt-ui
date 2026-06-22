/**
 * Datei: src-ts/scripts/publish-check-rules.ts
 *
 * Zweck:
 * Diese Datei ist der erste kleine JavaScript-zu-TypeScript-Migrationsschritt
 * für unsere Wartungs-/Release-Skripte. Sie beschreibt und kapselt Regeln, die
 * `scripts/verify-publish.js` beim Prüfen des Pakets verwendet.
 *
 * Zusammenhang im Projekt:
 * - `scripts/verify-publish.js` ist der lokale Publish-/Paket-Checker.
 * - Die JavaScript-Laufzeitdatei `scripts/publish-check-rules.js` enthält dieselbe
 *   Logik für Node.js, damit `publish:check` weiterhin ohne TypeScript-Build läuft.
 * - Diese TypeScript-Quelle dient als verständliche, typisierte Vorlage für die
 *   spätere komplette Migration der Wartungsskripte.
 *
 * Build-/Spiegelstrategie ab 0.7.66:
 * - Diese TypeScript-Datei ist die fachliche Quelle für die Publish-Regeln.
 * - `npm run build:script-mirrors` kompiliert diese Datei und aktualisiert
 *   `scripts/publish-check-rules.js`.
 * - `publish:check` läuft weiter ohne TypeScript-Compiler, weil es die
 *   generierte JavaScript-Spiegeldatei nutzt.
 *
 * Wichtig für spätere Änderungen:
 * - Diese Datei darf keine ioBroker-Runtime laden.
 * - Diese Datei darf keine produktive EMS-/VIS-Logik verändern.
 * - Neue Regeln sollten hier zuerst typisiert beschrieben und anschließend in der
 *   JS-Runtime-Spiegeldatei nachgezogen werden, bis die Scripts vollständig aus TS
 *   gebaut werden.
 */
/** Ergebnis einer einzelnen Publish-Prüfregel. */
export interface PublishRuleResult {
    /** `true`, wenn die Regel bestanden wurde. */
    ok: boolean;
    /** Deutsche Fehlermeldung für Menschen, wenn `ok=false` ist. */
    message?: string;
}
/** Minimaler Ausschnitt aus `package.json`, den die Regeln benötigen. */
export interface PackageJsonPublishShape {
    name?: string;
    version?: string;
    engines?: {
        node?: string;
    };
    installedFrom?: string;
}
/** Minimaler Ausschnitt aus `io-package.json/common`, den die Regeln benötigen. */
export interface IoPackageCommonPublishShape {
    name?: string;
    version?: string;
    type?: string;
    connectionType?: string;
    dataSource?: string;
    authors?: unknown;
    adminUI?: {
        config?: string;
    };
    compact?: boolean;
    tier?: number;
    dependencies?: unknown;
    globalDependencies?: unknown;
    licenseInformation?: unknown;
    news?: Record<string, unknown>;
}
/** Minimaler Ausschnitt aus `io-package.json`, den die Regeln benötigen. */
export interface IoPackagePublishShape {
    common?: IoPackageCommonPublishShape;
    news?: unknown;
    version?: string;
    native?: Record<string, unknown>;
}
/**
 * Code-Teil: requirePackageName
 *
 * Zweck:
 * Prüft, ob das npm-Paket nach ioBroker-Konvention benannt ist.
 *
 * Zusammenhang:
 * Diese Regel schützt `npm publish` und den späteren ioBroker-Repository-Prozess.
 * Das Paket muss mit `iobroker.` beginnen und vollständig kleingeschrieben sein.
 *
 * TypeScript-Hinweis:
 * Der Eingabetyp ist absichtlich klein gehalten, damit diese Regel unabhängig von
 * kompletten npm-Typdefinitionen getestet werden kann.
 */
export declare function requirePackageName(pkg: PackageJsonPublishShape): PublishRuleResult;
/**
 * Code-Teil: requireNodeEngine22
 *
 * Zweck:
 * Prüft die Node.js-Mindestversion für die zukünftige Adapterbasis.
 *
 * Zusammenhang:
 * Unsere TypeScript-/ioBroker-Stabilitätsstrategie basiert auf Node.js 22+.
 * Diese Regel verhindert, dass versehentlich wieder `>=16` oder `>=18` gesetzt wird.
 */
export declare function requireNodeEngine22(pkg: PackageJsonPublishShape): PublishRuleResult;
/**
 * Code-Teil: requireNoInstalledFrom
 *
 * Zweck:
 * Stellt sicher, dass keine lokale Entwicklungs-/GitHub-Installationsspur im
 * veröffentlichbaren Paket stehen bleibt.
 */
export declare function requireNoInstalledFrom(pkg: PackageJsonPublishShape): PublishRuleResult;
/**
 * Code-Teil: requireIoCommonBasics
 *
 * Zweck:
 * Prüft die Pflichtfelder in `io-package.json/common`, die für ioBroker Admin,
 * Adapter-Checker und Repository-Prozess wichtig sind.
 *
 * Zusammenhang:
 * Diese Regel gehört zur ioBroker-Stabilisierung. Fehlende Metadaten führen später
 * zu Checker-Fehlern oder unklaren Anzeigen im Admin.
 */
export declare function requireIoCommonBasics(common: IoPackageCommonPublishShape): PublishRuleResult[];
/**
 * Code-Teil: requireNewsLimit
 *
 * Zweck:
 * Verhindert zu viele `common.news`-Einträge. Die vollständige Historie gehört in
 * `CHANGELOG.md`, nicht in `io-package.json`.
 */
export declare function requireNewsLimit(common: IoPackageCommonPublishShape, maxEntries?: number): PublishRuleResult;
/**
 * Code-Teil: requireNoTopLevelIoNewsOrVersion
 *
 * Zweck:
 * ioBroker erwartet Version und News in `common`. Zusätzliche Top-Level-Felder
 * führen zu unklaren Metadaten und sollten nicht veröffentlicht werden.
 */
export declare function requireNoTopLevelIoNewsOrVersion(io: IoPackagePublishShape): PublishRuleResult[];
/**
 * Code-Teil: collectPublishRuleErrors
 *
 * Zweck:
 * Führt mehrere kleine Regeln zusammen. Dadurch kann das JavaScript-Skript später
 * Schritt für Schritt durch typisierte Regeln ersetzt werden.
 *
 * Zusammenhang:
 * `scripts/verify-publish.js` nutzt diese Logik über die JS-Spiegeldatei. Die TS-
 * Datei ist der wartbare Ursprung für die spätere vollständige Skriptmigration.
 */
export declare function collectPublishRuleErrors(pkg: PackageJsonPublishShape, io: IoPackagePublishShape): string[];
//# sourceMappingURL=publish-check-rules.d.ts.map