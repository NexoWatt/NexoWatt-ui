import type { BuildingLoadBalanceInput, GridFlowResolverInput, GridFlowResult, GridSignedConvention as EnergyGridSignedConvention, StorageFlowResolverInput, StorageFlowResult, StorageSignedConvention } from '../contracts/energy-flow';
import type { Percent, Watt } from '../contracts/units';
/**
 * Datei: src-ts/utils/energy-flow.ts
 *
 * Zweck:
 * Reine, typisierte Energiefluss-Helfer für die spätere Migration von Speicher-, Netz-
 * und Bilanzlogik. Diese Datei ist in 0.7.60 noch nicht produktiv verdrahtet.
 *
 * Zusammenhang:
 * Die produktiven JavaScript-Resolver sitzen aktuell noch in `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js`. Diese Datei
 * beschreibt dieselben fachlichen Regeln in kleinen, testbaren TypeScript-Funktionen.
 *
 * Kritische Regeln:
 * - 0 W ist ein gültiger Wert.
 * - Split-DPs und signed DPs sind beide gültig.
 * - Rechenfallback darf nur verwendet werden, wenn kein echter DP vorhanden ist.
 */
/** Eingabe für die Aufteilung eines signed Speicher-DPs. */
export interface SplitSignedStorageInput {
    signedW: unknown;
    socPct?: Percent | null;
    convention?: StorageSignedConvention;
}
/** Eingabe für getrennte Lade-/Entlade-DPs. */
export interface SplitStorageDpInput {
    chargeW?: unknown;
    dischargeW?: unknown;
    socPct?: Percent | null;
    hasChargeDp: boolean;
    hasDischargeDp: boolean;
}
/** Eingabe für rechnerischen Speicherfallback aus einer Energieflussbilanz. */
export interface CalculatedStorageInput {
    pvW?: unknown;
    buildingLoadW?: unknown;
    gridImportW?: unknown;
    gridExportW?: unknown;
    socPct?: Percent | null;
}
/**
 * Code-Teil: splitSignedStoragePower
 *
 * Zweck:
 * Teilt einen signed Speicherleistungswert in positive Lade- und Entladeleistung auf.
 *
 * Zusammenhang:
 * Einige Speicher liefern einen einzigen Leistungs-DP mit Vorzeichen. Andere liefern
 * getrennte DPs. Dieser Helfer bildet die signed Variante so ab, dass spätere Resolver
 * immer mit `chargeW` und `dischargeW` weiterarbeiten können.
 *
 * Wichtig:
 * Die Vorzeichen-Konvention muss bekannt sein. Standard ist `positive-discharge`, also
 * positive Werte = Entladen und negative Werte = Laden.
 */
export declare function splitSignedStoragePower(input: SplitSignedStorageInput): StorageFlowResult;
/**
 * Code-Teil: resolveSplitStorageDps
 *
 * Zweck:
 * Bildet getrennte Speicher-Lade- und Speicher-Entlade-DPs auf ein gemeinsames Ergebnis
 * ab.
 *
 * Zusammenhang:
 * Viele Speichersysteme liefern getrennte DPs. Wenn diese DPs konfiguriert sind, sind
 * sie Quelle der Wahrheit. Ein Wert von 0 W ist dabei ausdrücklich gültig.
 */
export declare function resolveSplitStorageDps(input: SplitStorageDpInput): StorageFlowResult;
/**
 * Code-Teil: calculateStorageFromBalance
 *
 * Zweck:
 * Ermittelt Speicherleistung rechnerisch aus einer Energieflussbilanz.
 *
 * Zusammenhang:
 * Diese Rechnung ist nur ein Fallback für Anlagen ohne echten Speicherleistungs-DP.
 * Produktive Resolver müssen vorher prüfen, ob signed oder split DPs konfiguriert sind.
 *
 * Formel:
 * `storageSignedW = buildingLoadW - pvW - gridImportW + gridExportW`
 * Bei `positive-discharge` bedeutet ein positiver Wert Entladen und ein negativer Wert
 * Laden.
 */
export declare function calculateStorageFromBalance(input: CalculatedStorageInput): StorageFlowResult;
/**
 * Code-Teil: chooseStorageFlowResult
 *
 * Zweck:
 * Wählt aus möglichen Speicherquellen die fachlich korrekte Quelle aus.
 *
 * Zusammenhang:
 * Diese Priorität ist die wichtigste Vertragsregel für die spätere Produktivmigration:
 * split DP oder signed DP schlagen jede Rechenbilanz. Rechenfallback darf nur greifen,
 * wenn kein echter Speicher-DP konfiguriert ist.
 */
export declare function chooseStorageFlowResult(options: {
    split?: StorageFlowResult;
    signed?: StorageFlowResult;
    calculated?: StorageFlowResult;
}): StorageFlowResult;
/**
 * Code-Teil: splitSignedGridPower
 *
 * Zweck:
 * Teilt einen signed Netzanschlusspunkt in Netzbezug und Netzeinspeisung auf.
 *
 * Zusammenhang:
 * Genau wie beim Speicher gibt es auch beim Netz unterschiedliche DPs. Manche Anlagen
 * liefern getrennte Import-/Exportwerte, andere einen signed Netzanschlusspunkt.
 */
export declare function splitSignedGridPower(signedValue: unknown, convention?: EnergyGridSignedConvention): GridFlowResult;
/**
 * Code-Teil: resolveSplitGridDps
 *
 * Zweck:
 * Bildet getrennte Netzbezug-/Netzeinspeisung-DPs auf einen gemeinsamen Netzvertrag ab.
 *
 * Zusammenhang:
 * 0 W Netzbezug oder 0 W Einspeisung ist gültig. Fehlende DPs dürfen später nicht dazu
 * führen, dass echte 0-Werte verworfen werden.
 */
export declare function resolveSplitGridDps(importW: unknown, exportW: unknown, hasImportDp: boolean, hasExportDp: boolean): GridFlowResult;
/**
 * Code-Teil: hasUsableMeasuredStorageSource
 *
 * Zweck:
 * Zeigt an, ob ein Speicherergebnis aus einem echten konfigurierten DP stammt.
 *
 * Zusammenhang:
 * Diese Prüfung schützt History und EMS-Logik davor, einen echten 0-W-Speicherwert
 * durch eine ungewollte Bilanzrechnung zu überschreiben.
 */
export declare function hasUsableMeasuredStorageSource(result: StorageFlowResult | null | undefined): boolean;
/**
 * Code-Teil: resolveStorageFlow
 *
 * Zweck:
 * Führt die später produktive Speicher-DP-Priorität in einer kleinen, typisierten
 * Funktion zusammen: Split-DPs zuerst, danach signed DP, danach berechneter Fallback.
 *
 * Zusammenhang:
 * Diese Funktion ist noch nicht in der Adapter-Runtime verdrahtet. Sie bildet aber
 * exakt die fachliche Reihenfolge ab, die später in `main.js`, `www/app.js`,
 * `core-limits.js`, `heating-rod-control.js` und der History gleich gelten muss.
 *
 * Wichtig:
 * Ein konfigurierter Split- oder signed Speicher-DP ist Quelle der Wahrheit. Auch 0 W
 * ist gültig. Der Rechenfallback darf nur benutzt werden, wenn wirklich kein Speicher-
 * DP konfiguriert ist.
 */
export declare function resolveStorageFlow(input: StorageFlowResolverInput): StorageFlowResult;
/**
 * Code-Teil: resolveGridFlow
 *
 * Zweck:
 * Führt die spätere Netz-DP-Priorität zusammen: getrennte Import-/Export-DPs zuerst,
 * danach signed Netzanschlusspunkt.
 *
 * Zusammenhang:
 * Der Netzfluss ist Grundlage für Energiefluss, Speicherfallback, Peak-Shaving,
 * Heizstab-Budget und History. Deshalb muss auch hier 0 W als gültiger Wert gelten.
 */
export declare function resolveGridFlow(input: GridFlowResolverInput): GridFlowResult;
/**
 * Code-Teil: calculateBuildingLoadFromBalance
 *
 * Zweck:
 * Bereitet die spätere Gebäudelast-Bilanzrechnung vor.
 *
 * Zusammenhang:
 * Wenn kein echter Gebäudeverbrauchs-DP vorhanden ist, kann Verbrauch aus PV, Netz und
 * Speicher hergeleitet werden. Diese Rechnung darf aber niemals echte Speicher-DPs
 * überschreiben, weil sonst History und Heizstab-Budget verfälscht werden können.
 *
 * Formel:
 * `buildingLoadW = pvW + gridImportW + storageDischargeW - gridExportW - storageChargeW + additionalKnownLoadW`
 */
export declare function calculateBuildingLoadFromBalance(input: BuildingLoadBalanceInput): Watt | null;
//# sourceMappingURL=energy-flow.d.ts.map