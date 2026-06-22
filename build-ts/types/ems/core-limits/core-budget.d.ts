import type { CoreBudgetGate, CoreBudgetInput, CoreBudgetSnapshot } from '../../contracts/ems-budget';
import type { Percent, TimestampMs, Watt } from '../../contracts/units';
/**
 * Code-Teil: isStorageReserveActive
 *
 * Zweck:
 * Entscheidet, ob die Speicherreserve fachlich geschützt werden muss.
 *
 * Zusammenhang:
 * Heizstab und andere flexible Verbraucher dürfen die Reserve nicht aufbrauchen, wenn
 * der Speicher-SoC unter der konfigurierten Reserve liegt oder Speicherentladung verboten ist.
 */
export declare function isStorageReserveActive(storageSocPct: Percent | null, reserveSocPct: unknown, allowStorageDischarge?: boolean): boolean;
/**
 * Code-Teil: calculatePvBudgetGate
 *
 * Zweck:
 * Berechnet das nutzbare PV-Budget nach Speicherreserve und bereits reservierter Leistung.
 *
 * Zusammenhang:
 * Dieses Budget ist später besonders wichtig für Heizstab/EVCS: Es beschreibt, wie viel
 * PV-Überschuss ohne zusätzlichen Netzbezug genutzt werden kann.
 */
export declare function calculatePvBudgetGate(input: CoreBudgetInput): CoreBudgetGate;
/**
 * Code-Teil: calculateGridBudgetGate
 *
 * Zweck:
 * Berechnet, wie viel zusätzliche Leistung unter Netz-/Peak-Limit noch möglich ist.
 *
 * Zusammenhang:
 * Peak-Shaving, §14a und Netzanschlussgrenzen müssen Verbraucherfreigaben begrenzen.
 * Das verhindert, dass Heizstab oder EVCS Lastspitzen erzeugen.
 */
export declare function calculateGridBudgetGate(input: CoreBudgetInput): CoreBudgetGate;
/**
 * Code-Teil: buildCoreBudgetSnapshot
 *
 * Zweck:
 * Erstellt eine typisierte EMS-Budget-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist der spätere Kandidat für die Migration von Teilen aus
 * `ems/modules/core-limits.js`. In 0.7.62 wird sie nur über TypeScript-Regressionen
 * geprüft und noch nicht produktiv genutzt.
 */
export declare function buildCoreBudgetSnapshot(input: CoreBudgetInput): CoreBudgetSnapshot;
/**
 * Datenvertrag: CoreRestGatesShadowInput
 *
 * Zweck:
 * Übergibt die bereits vorhandenen JavaScript-Gate-Objekte aus `core-limits.js` an
 * TypeScript. Damit können Forecast-, Tarif-, Peak-/Netz- und §14a-Gates zunächst
 * sicher im Shadow-Modus verglichen werden.
 *
 * Zusammenhang:
 * Diese Rest-Gates beeinflussen später EVCS, Heizstab, Speicherreserve, Peak-Shaving
 * und KI-Hinweise. Deshalb werden sie in 0.7.120 bewusst nur vorbereitet und nicht
 * produktiv übernommen.
 */
export interface CoreRestGatesShadowInput {
    forecast?: Record<string, unknown> | null;
    tariff?: Record<string, unknown> | null;
    peak?: Record<string, unknown> | null;
    para14a?: Record<string, unknown> | null;
    evcsHighLevel?: Record<string, unknown> | null;
    grid?: Record<string, unknown> | null;
    ts?: unknown;
}
/** Ergebnis der TypeScript-Vorbereitung für Core-Limits-Restgates. */
export interface CoreRestGatesShadowResult {
    ok: boolean;
    source: 'ts-core-rest-gates-shadow';
    ts: TimestampMs;
    gates: {
        forecast: Record<string, unknown>;
        tariff: Record<string, unknown>;
        peak: Record<string, unknown>;
        para14a: Record<string, unknown>;
        evcsHighLevel: Record<string, unknown>;
        grid: Record<string, unknown>;
    };
}
/** Ergebnis der produktiven TypeScript-Restgate-Übernahme. */
export interface CoreRestGatesProductiveResult extends Omit<CoreRestGatesShadowResult, 'source'> {
    source: 'ts-core-rest-gates-productive';
    productive: true;
    preparedOnly: false;
}
/**
 * Code-Teil: buildCoreForecastGate
 *
 * Zweck:
 * Baut das PV-Forecast-Gate in TypeScript nach. In 0.7.120 wird dieser Wert nur als
 * Shadow-Vergleich genutzt und nicht produktiv übernommen.
 */
export declare function buildCoreForecastGate(input: Record<string, unknown> | null | undefined): Record<string, unknown>;
/**
 * Code-Teil: buildCoreTariffGate
 *
 * Zweck:
 * Baut das Tarif-/Negativpreis-Gate in TypeScript nach. In 0.7.120 bleibt dieses Gate
 * Shadow-/Diagnosewert und ersetzt noch keine produktive JS-Logik.
 */
export declare function buildCoreTariffGate(input: Record<string, unknown> | null | undefined): Record<string, unknown>;
/**
 * Code-Teil: buildCorePeakTariffGridGates
 *
 * Zweck:
 * Bereitet Peak-/Netz-/§14a- und EVCS-High-Level-Gates in TypeScript auf.
 */
export declare function buildCorePeakTariffGridGates(input: CoreRestGatesShadowInput): Record<string, Record<string, unknown>>;
/**
 * Code-Teil: buildCoreRestGatesShadow
 *
 * Zweck:
 * Erstellt den kompletten TS-Shadow für Forecast-, Tarif-, Peak-/Netz- und §14a-Gates.
 *
 * Sicherheitsregel:
 * Diese Funktion schreibt keine States und verändert keine produktiven Budgets. Sie dient
 * nur dazu, die Restlogik kontrolliert gegen die bestehende JS-Runtime zu vergleichen.
 */
export declare function buildCoreRestGatesShadow(input: CoreRestGatesShadowInput): CoreRestGatesShadowResult;
/**
 * Code-Teil: buildCoreRestGatesProductive
 *
 * Zweck:
 * Baut denselben Forecast-/Tarif-/Peak-/§14a-Snapshot wie der Shadow-Helfer,
 * markiert ihn aber ausdrücklich als produktiv übernehmbaren TypeScript-Restgate-
 * Snapshot.
 *
 * Zusammenhang:
 * Ab 0.7.121 darf `core-limits.js` diese Werte übernehmen, wenn der zuvor berechnete
 * JS/TS-Vergleich ohne Mismatches war. JS bleibt Fallback bei Fehlern oder Abweichungen.
 */
export declare function buildCoreRestGatesProductive(input: CoreRestGatesShadowInput): CoreRestGatesProductiveResult;
/**
 * Datenvertrag: CoreBudgetReservationRequest
 *
 * Zweck:
 * Beschreibt eine Verbraucher-Reservierung gegen das zentrale Core-Limits-Budget.
 *
 * Zusammenhang:
 * `ems/modules/core-limits.js` nutzt `makeBudgetRuntime.reserve(...)`, damit Heizstab,
 * EVCS, Thermik und weitere Verbraucher Leistung anmelden können. Dieser Vertrag ist die
 * TypeScript-Vorbereitung dieser Logik.
 *
 * Wichtig:
 * `0 W` ist gültig. Ein Request mit 0 W darf nicht durch Defaultwerte ersetzt werden.
 */
export interface CoreBudgetReservationRequest {
    key?: unknown;
    consumer?: unknown;
    app?: unknown;
    label?: unknown;
    priority?: unknown;
    requestedW?: unknown;
    reserveW?: unknown;
    pvReserveW?: unknown;
    actualW?: unknown;
    pvOnly?: unknown;
    mode?: unknown;
}
/**
 * Datenvertrag: CoreBudgetReservationEntry
 *
 * Zweck:
 * Einheitliche veröffentlichbare Verbraucher-Reservierung.
 *
 * Zusammenhang:
 * Diese Struktur wird später in `ems.budget.consumersJson` und in den einzelnen
 * `ems.budget.consumers.<key>.*` States sichtbar. Deshalb müssen Namen wie `usedW`,
 * `pvUsedW`, `reserveW` und `pvReserveW` stabil bleiben.
 */
export interface CoreBudgetReservationEntry {
    key: string;
    app: string;
    label: string;
    priority: number;
    requestedW: Watt;
    grantW: Watt;
    usedW: Watt;
    pvUsedW: Watt;
    reserveW: Watt;
    pvReserveW: Watt;
    actualW: Watt;
    pvOnly: boolean;
    mode: string;
    ts: TimestampMs;
    remainingTotalW: Watt | null;
    remainingPvW: Watt;
}
/**
 * Datenvertrag: CoreBudgetReservationRuntimeState
 *
 * Zweck:
 * Minimaler Laufzeitstand des Budgetkoordinators vor einer Reservierung.
 *
 * Zusammenhang:
 * Dieser Zustand entspricht dem alten JS-Objekt aus `makeBudgetRuntime`: verbleibendes
 * Gesamtbudget, verbleibendes PV-Budget, bereits bekannte Verbraucher und deren Reihenfolge.
 */
export interface CoreBudgetReservationRuntimeState {
    remainingTotalW?: unknown;
    remainingPvW?: unknown;
    consumers?: Record<string, CoreBudgetReservationEntry | Record<string, unknown> | null | undefined>;
    order?: readonly string[];
}
/** Ergebnis einer TS-Reservierungsberechnung. */
export interface CoreBudgetReservationResult {
    ok: boolean;
    source: 'ts-core-reservation';
    entry: CoreBudgetReservationEntry;
    nextRemainingTotalW: Watt | null;
    nextRemainingPvW: Watt;
    order: readonly string[];
    consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown>>;
    flexUsedW: Watt;
}
/**
 * Code-Teil: calculateCoreBudgetFlexUsedW
 *
 * Zweck:
 * Berechnet die Summe der veröffentlichten flexiblen Verbraucherleistung.
 *
 * Zusammenhang:
 * Entspricht fachlich der alten JS-Summe aus `makeBudgetRuntime.reserve`. Diese Summe
 * wird als `ems.budget.flexUsedW` veröffentlicht.
 */
export declare function calculateCoreBudgetFlexUsedW(consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown> | null | undefined>, order?: readonly string[]): Watt;
/**
 * Code-Teil: buildCoreBudgetConsumersList
 *
 * Zweck:
 * Baut die geordnete Liste für `ems.budget.consumersJson`.
 *
 * Zusammenhang:
 * Das App-Center und Diagnosen erwarten ein Array. Die Runtime hält intern ein Objekt
 * plus Reihenfolge. Diese Funktion macht die Umwandlung typisiert und stabil.
 */
export declare function buildCoreBudgetConsumersList(consumers: Record<string, CoreBudgetReservationEntry | Record<string, unknown> | null | undefined>, order?: readonly string[]): Array<Record<string, unknown>>;
/**
 * Code-Teil: computeCoreBudgetReservation
 *
 * Zweck:
 * Berechnet eine Verbraucher-Reservierung gegen das zentrale Budget in TypeScript.
 *
 * Zusammenhang:
 * Dies ist die Vorbereitung für die Migration von `makeBudgetRuntime.reserve` aus
 * `ems/modules/core-limits.js`. Ab 0.7.107 wird das Ergebnis produktiv für Consumer-Reservierungen genutzt,
 * während die alte JS-Rechnung als Fallback-/Vergleichspfad erhalten bleibt.
 *
 * Sicherheitsregel:
 * Die Funktion schreibt keine States und kennt keinen Adapter. Sie berechnet nur Entry,
 * Restbudgets und Verbraucherlisten. Dadurch kann sie gefahrlos gegen die JS-Runtime
 * verglichen werden.
 */
export declare function computeCoreBudgetReservation(runtime: CoreBudgetReservationRuntimeState, request: CoreBudgetReservationRequest, tsInput?: unknown): CoreBudgetReservationResult;
/**
 * Datenvertrag: CoreBudgetForecastGateSnapshot
 *
 * Zweck:
 * Beschreibt Gate D – PV-Forecast als typisierte Teilstruktur.
 *
 * Zusammenhang:
 * Das Forecast-Gate beeinflusst später Heizstab-Startfreigaben, EVCS-Planung und
 * KI-Berater. In 0.7.120 bleibt die JavaScript-Runtime produktiv; TypeScript baut
 * nur denselben Snapshot für den Shadow-/Vorbereitungsvergleich.
 */
export interface CoreBudgetForecastGateSnapshot {
    valid: boolean;
    usable: boolean;
    ageMs: number | null;
    points: number;
    confidencePct: number;
    nowW: Watt;
    avgNext1hW: Watt;
    avgNext3hW: Watt;
    peakNext6hW: Watt;
    peakNext24hW: Watt;
    kwhNext1h: number;
    kwhNext3h: number;
    kwhNext6h: number;
    kwhNext12h: number;
    kwhNext24h: number;
    status: string;
    source: string;
}
/**
 * Datenvertrag: CoreBudgetTariffGateSnapshot
 *
 * Zweck:
 * Beschreibt Gate E – Tarif/Negativpreis/Netzentgelt als typisierte Teilstruktur.
 *
 * Zusammenhang:
 * Tarifwerte beeinflussen Speicher-Netzladen, EVCS-Planung und KI-Hinweise. Diese
 * Struktur darf `false` nicht als fehlend behandeln, weil `dischargeAllowed=false`
 * eine echte Sperre ist.
 */
export interface CoreBudgetTariffGateSnapshot {
    active: boolean;
    state: string;
    currentPriceEurKwh: number | null;
    negativeActive: boolean;
    gridImportPreferred: boolean;
    storageGridChargeAllowed: boolean;
    evcsGridChargeAllowed: boolean;
    dischargeAllowed: boolean;
    pvCurtailRecommended: boolean;
    negativeMinPriceEurKwh: number | null;
    nextNegativeFrom: string;
    nextNegativeTo: string;
    status: string;
}
/**
 * Datenvertrag: CoreBudgetPeakGridGateSnapshot
 *
 * Zweck:
 * Fasst Peak-Shaving, Netzgrenzen, §14a und EVCS-High-Level-Cap zusammen.
 *
 * Zusammenhang:
 * Diese Werte begrenzen Verbraucherbudgets. Eine spätere produktive TS-Übernahme darf
 * Netzanschluss, Peak-Shaving oder §14a niemals durch PV-/Tariflogik überstimmen.
 */
export interface CoreBudgetPeakGridGateSnapshot {
    peakActive: boolean;
    peakBudgetW: Watt | null;
    gridImportLimitW_effective: Watt;
    gridImportLimitW_source: string;
    para14aActive: boolean;
    para14aMode: string;
    para14aEvcsCapW: Watt | null;
    evcsHighLevelCapW: Watt | null;
    evcsHighLevelBinding: string;
}
/** Eingabe für den Restgate-Shadow-Vergleich. */
export interface CoreBudgetRestGatesSnapshotInput {
    ts?: unknown;
    forecast?: Record<string, unknown> | null;
    tariff?: Record<string, unknown> | null;
    peak?: Record<string, unknown> | null;
    grid?: Record<string, unknown> | null;
    para14a?: Record<string, unknown> | null;
    evcsHighLevel?: Record<string, unknown> | null;
}
/** Gesamter TS-Shadow-Snapshot für Forecast-/Tarif-/Peak-Restgates. */
export interface CoreBudgetRestGatesSnapshot {
    source: 'ts-core-rest-gates';
    ts: TimestampMs;
    forecast: CoreBudgetForecastGateSnapshot;
    tariff: CoreBudgetTariffGateSnapshot;
    peakGrid: CoreBudgetPeakGridGateSnapshot;
    productive: false;
    preparedOnly: true;
}
/** Einzelne Abweichung im Restgate-Vergleich. */
export interface CoreBudgetRestGateMismatch {
    field: string;
    js: unknown;
    ts: unknown;
    diff?: number | null;
    tolerance?: number;
}
/**
 * Code-Teil: buildCoreBudgetRestGatesSnapshot
 *
 * Zweck:
 * Baut aus den bestehenden JS-Gate-Strukturen einen typisierten TS-Restgate-Snapshot.
 *
 * Zusammenhang:
 * 0.7.120 bereitet Forecast-, Tarif- und Peak-/Grid-Constraints-Gates vor. Produktiv
 * bleibt vorerst die JS-Runtime; dieser Snapshot wird nur gegen JS verglichen und in
 * `ems.budget.tsRestGatesJson` sichtbar gemacht.
 */
export declare function buildCoreBudgetRestGatesSnapshot(input?: CoreBudgetRestGatesSnapshotInput): CoreBudgetRestGatesSnapshot;
/**
 * Code-Teil: compareCoreBudgetRestGates
 *
 * Zweck:
 * Vergleicht JS-Restgates mit dem TS-Restgate-Snapshot. In 0.7.120 ist das reine
 * Diagnose und keine produktive Umschaltung.
 */
export declare function compareCoreBudgetRestGates(js: CoreBudgetRestGatesSnapshotInput, ts: CoreBudgetRestGatesSnapshot): CoreBudgetRestGateMismatch[];
//# sourceMappingURL=core-budget.d.ts.map