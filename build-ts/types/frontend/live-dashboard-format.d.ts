/**
 * Datei: src-ts/frontend/live-dashboard-format.ts
 *
 * Zweck:
 * Produktive TypeScript-Helfer für die Anzeigeformatierung im Kunden-LIVE-Dashboard.
 * Diese Datei bildet die alten JavaScript-Formatter aus `www/app.js` kompatibel nach,
 * damit wir diese kleinen Anzeigehelfer wirklich aus TypeScript nutzen können.
 *
 * Zusammenhang:
 * - Quelle: TypeScript
 * - Browser-Spiegel: `www/static/ts-mirrors/frontend/live-dashboard-format.mjs`
 * - Produktive Nutzung: `www/app.js` lädt den Spiegel per dynamischem Import.
 *
 * Wichtig:
 * Die Rückgabetexte bleiben bewusst kompatibel mit den bisherigen JS-Funktionen:
 * `--`, `W`, `kW`, `kWh`, `MWh`, `GWh`. Dadurch verändert sich keine fachliche
 * Anzeige, während die Logik bereits aus TypeScript kommt.
 */
/** Leistungseinheit aus den Kundeneinstellungen des LIVE-Dashboards. */
export type LiveDashboardPowerUnit = 'W' | 'kW' | string;
/**
 * Code-Teil: normalizeDashboardNumber
 *
 * Zweck:
 * Normalisiert unbekannte API-/Statewerte für die Dashboard-Anzeige.
 *
 * Wichtig:
 * `0` ist ein gültiger Wert und bleibt `0`. Nur `null`, `undefined`, leerer String
 * oder nicht-numerische Werte werden als fehlend behandelt.
 */
export declare function normalizeDashboardNumber(value: unknown): number | null;
/**
 * Code-Teil: formatDashboardPower
 *
 * Zweck:
 * Ersetzt produktiv die alte `formatPower`-Logik aus `www/app.js`.
 *
 * Zusammenhang:
 * Das LIVE-Dashboard zeigt PV, Netz, Speicher, Gebäude-Last und weitere Leistungswerte
 * über diese Funktion. Die alte `units.power`-Einstellung bleibt erhalten.
 */
export declare function formatDashboardPower(value: unknown, unit?: LiveDashboardPowerUnit): string;
/**
 * Code-Teil: formatDashboardPowerSigned
 *
 * Zweck:
 * Produktiver TS-Ersatz für die signierte Leistungsanzeige im Dashboard.
 *
 * Zusammenhang:
 * Diese Funktion wird u. a. bei optionalen Flussknoten/Verbrauchern verwendet, wo
 * positive und negative Werte bewusst mit Vorzeichen sichtbar sein sollen.
 */
export declare function formatDashboardPowerSigned(value: unknown, unit?: LiveDashboardPowerUnit): string;
/**
 * Code-Teil: formatDashboardEnergyKwh
 *
 * Zweck:
 * Produktiver TS-Ersatz für die alte `formatEnergyKwh`-Logik.
 *
 * Zusammenhang:
 * KPI-Kacheln und History-Links zeigen Tages-/Gesamtenergie. Die Stufen bleiben
 * kompatibel: kWh, MWh, GWh.
 */
export declare function formatDashboardEnergyKwh(value: unknown): string;
/**
 * Code-Teil: formatDashboardFlowPower
 *
 * Zweck:
 * Produktiver TS-Ersatz für die Energiefluss-Monitor-Anzeige. Eingabe bleibt Watt,
 * Anzeige erfolgt stabil in kW.
 */
export declare function formatDashboardFlowPower(value: unknown, decimals?: number): string;
/**
 * Code-Teil: runLiveDashboardFormatSmoke
 *
 * Zweck:
 * Kleiner Runtime-Smoke-Test für Browser-/Node-Checks.
 */
export declare function runLiveDashboardFormatSmoke(): boolean;
//# sourceMappingURL=live-dashboard-format.d.ts.map