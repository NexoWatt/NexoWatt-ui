import type { BuildingLoadBalanceInput, BuildingLoadBalanceResult } from '../contracts/energy-flow';
/**
 * Datei: src-ts/utils/energy-flow-resolver.ts
 *
 * Zweck:
 * Kompatibilitäts-Export für frühe 0.7.61-Testdateien, die den Resolver noch aus dem
 * Utils-Namensraum importieren. Die eigentliche neue Quelle liegt unter
 * `src-ts/resolvers/energy-flow-resolver.ts`.
 *
 * Zusammenhang:
 * Dieser dünne Wrapper verhindert doppelte Fachlogik. Später, wenn der Buildprozess
 * finalisiert ist, werden alte Imports auf `src-ts/resolvers` umgestellt.
 */
export * from '../resolvers/energy-flow-resolver';
/**
 * Code-Teil: calculateBuildingLoadFromBalance
 *
 * Zweck:
 * Kompatibilitätsfunktion für ältere Testdateien, die ein strukturiertes Ergebnis
 * erwarten. Intern nutzt sie den neuen Resolver-Helfer, der nur die Wattzahl liefert.
 */
export declare function calculateBuildingLoadFromBalance(input: BuildingLoadBalanceInput): BuildingLoadBalanceResult;
//# sourceMappingURL=energy-flow-resolver.d.ts.map