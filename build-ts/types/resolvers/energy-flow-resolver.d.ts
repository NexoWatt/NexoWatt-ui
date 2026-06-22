import type { BuildingLoadBalanceInput, EnergyFlowSnapshot, GridFlowResolverInput, GridFlowResult, StorageFlowResolverInput, StorageFlowResult } from '../contracts/energy-flow';
import type { TimestampMs, Watt } from '../contracts/units';
/**
 * Datei: src-ts/resolvers/energy-flow-resolver.ts
 *
 * Zweck:
 * Produktionsnahe TypeScript-Vorbereitung für die spätere Energiefluss-Auflösung.
 * Diese Datei wird in 0.7.61 noch nicht in der Adapter-Runtime verwendet. Sie bildet
 * aber exakt die fachlichen Regeln ab, die später aus `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js` herausgelöst
 * werden sollen.
 *
 * Zusammenhang:
 * Der Resolver nutzt die in 0.7.60 angelegten kleinen Energiefluss-Helfer und fasst sie
 * zu einer realistischeren Resolver-Schicht zusammen. Dadurch können wir Split-DPs,
 * signed DPs und berechnete Fallbacks schon jetzt typisiert testen, ohne die produktive
 * Logik zu riskieren.
 *
 * Wichtig für spätere Änderungen:
 * - Ein konfigurierter Speicher-DP mit 0 W bleibt gültig.
 * - Split- oder signed Speicher-DPs dürfen nicht durch Bilanzrechnung überschrieben werden.
 * - Rechenfallback ist nur erlaubt, wenn wirklich kein Speicher-DP konfiguriert ist.
 * - Diese Regeln schützen LIVE-Dashboard, History, Heizstab und KI vor verfälschten Werten.
 */
/** Erweiterte Speicher-Eingabe für die produktionsnahe Resolver-Vorbereitung. */
export interface ResolveStorageFlowInput extends StorageFlowResolverInput {
    /** Optionaler Bilanz-Fallback, der nur bei fehlenden echten Speicher-DPs genutzt wird. */
    balance?: BuildingLoadBalanceInput;
}
/** Eingabe für den zukünftigen zentralen Energiefluss-Snapshot. */
export interface BuildEnergyFlowSnapshotInput {
    ts: TimestampMs;
    pvW?: unknown;
    buildingLoadW?: unknown;
    grid: GridFlowResolverInput;
    storage: ResolveStorageFlowInput;
    evcsW?: unknown;
    heatingRodW?: unknown;
    thermalW?: unknown;
}
/**
 * Code-Teil: resolveStorageFlow
 *
 * Zweck:
 * Löst Speicher-Laden und Speicher-Entladen nach unserer fachlichen Priorität auf.
 *
 * Priorität:
 * 1. Getrennte Lade-/Entlade-DPs, wenn konfiguriert.
 * 2. Signed Batterie-Leistungs-DP, wenn konfiguriert.
 * 3. Rechenfallback, nur wenn kein Speicher-DP konfiguriert ist.
 *
 * Warum das kritisch ist:
 * In den letzten Versionen haben falsche Fallbacks historische Speicherwerte verfälscht.
 * Diese Funktion hält die Regel typisiert fest, damit spätere Runtime-Migrationen nicht
 * wieder Split-DPs, signed DPs oder gültige 0-W-Werte überschreiben.
 *
 * Merksatz:
 * Bilanz-Fallback bleibt gesperrt, sobald ein echter Speicher-DP konfiguriert ist.
 */
export declare function resolveStorageFlow(input: ResolveStorageFlowInput): StorageFlowResult;
/**
 * Code-Teil: resolveGridFlow
 *
 * Zweck:
 * Löst Netzbezug und Netzeinspeisung aus Split-DPs oder signed Netzanschlusspunkt auf.
 *
 * Zusammenhang:
 * Die Netzwerte sind Basis für Energiefluss, Speicher-Fallback, History und Peak-Shaving.
 * Deshalb wird hier dieselbe Prioritätsregel wie beim Speicher vorbereitet: echte DPs
 * schlagen berechnete oder fehlende Werte.
 */
export declare function resolveGridFlow(input: GridFlowResolverInput): GridFlowResult;
/**
 * Code-Teil: calculateBuildingLoadFromBalance
 *
 * Zweck:
 * Berechnet den Gebäudeverbrauch aus PV, Netz und Speicher, wenn kein direkter
 * Verbrauchs-DP vorhanden ist.
 *
 * Formel:
 * Gebäude = PV + Netzbezug + Speicherentladung - Netzeinspeisung - Speicherladung
 *
 * Wichtig:
 * Diese Berechnung darf später nur genutzt werden, wenn die Eingangsquellen fachlich
 * sauber aufgelöst wurden. Sonst erzeugt der Verbrauchswert falsche Folgewerte in History
 * und KPI-Kacheln.
 */
export declare function calculateBuildingLoadFromBalance(input: {
    pvW: unknown;
    grid: GridFlowResult;
    storage: StorageFlowResult;
    additionalKnownLoadW?: unknown;
}): Watt | null;
/**
 * Code-Teil: buildEnergyFlowSnapshot
 *
 * Zweck:
 * Baut eine vollständige, typisierte Energiefluss-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist die spätere Zielstruktur für die Migration von Backend- und
 * Frontend-Resolvern. Sie ist in 0.7.61 noch nicht produktiv aktiv, bildet aber schon
 * die Reihenfolge ab, die wir später in Runtime-Code übernehmen wollen.
 */
export declare function buildEnergyFlowSnapshot(input: BuildEnergyFlowSnapshotInput): EnergyFlowSnapshot;
/**
 * Code-Teil: createEnergyFlowSnapshot
 *
 * Zweck:
 * Rückwärtskompatibler Alias für die produktionsnahe Snapshot-Funktion.
 *
 * Zusammenhang:
 * Erste Regressionstests und spätere Migrationsschritte nutzen teilweise den Begriff
 * `createEnergyFlowSnapshot`, während die fachliche Implementierung aktuell
 * `buildEnergyFlowSnapshot` heißt. Der Alias vermeidet doppelte Logik und hält die
 * Testverträge stabil.
 */
export declare function createEnergyFlowSnapshot(input: BuildEnergyFlowSnapshotInput): EnergyFlowSnapshot;
/**
 * Code-Teil: buildEnergyFlowSnapshotFromInputs
 *
 * Zweck:
 * Rückwärtskompatibler Alias für frühe Regressionstests.
 *
 * Zusammenhang:
 * Einige Testdateien benennen die Zielstruktur ausdrücklich als „aus Eingaben bauen“.
 * Damit keine doppelte Logik entsteht, leitet dieser Alias direkt auf
 * `buildEnergyFlowSnapshot` weiter.
 */
export declare function buildEnergyFlowSnapshotFromInputs(input: BuildEnergyFlowSnapshotInput): EnergyFlowSnapshot;
//# sourceMappingURL=energy-flow-resolver.d.ts.map