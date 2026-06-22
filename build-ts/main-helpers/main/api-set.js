"use strict";
/**
 * Datei: src-ts/main/api-set.ts
 *
 * Zweck:
 * Echte TypeScript-Helfer für die spätere Auslagerung einfacher `/api/set`-Schreibpläne.
 *
 * Zusammenhang:
 * main.js verarbeitet aktuell viele Frontend-Schreibwünsche direkt. Diese Datei legt fest,
 * wie Kundeneinstellungen sicher normalisiert und zu State-Schreibplänen vorbereitet werden.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAIN_SETTING_DEFINITIONS = void 0;
exports.normalizeMainApiSetValue = normalizeMainApiSetValue;
exports.buildMainSettingsWritePlan = buildMainSettingsWritePlan;
exports.buildMainApiSetShadowComparison = buildMainApiSetShadowComparison;
exports.DEFAULT_MAIN_SETTING_DEFINITIONS = [
    // KI-Berater / Kundencockpit. Diese Keys kommen aus `settings.html` und dürfen
    // produktiv über den TS-Schreibplan laufen, weil die Werte einfach und lokal sind.
    { key: 'aiAdvisorEnabled', stateId: 'settings.aiAdvisorEnabled', kind: 'boolean' },
    { key: 'aiAdvisorMode', stateId: 'settings.aiAdvisorMode', kind: 'string' },
    { key: 'aiAdvisorOptimizationMode', stateId: 'settings.aiAdvisorOptimizationMode', kind: 'string' },
    { key: 'aiAdvisorComfortStart', stateId: 'settings.aiAdvisorComfortStart', kind: 'string' },
    { key: 'aiAdvisorComfortEnd', stateId: 'settings.aiAdvisorComfortEnd', kind: 'string' },
    { key: 'aiAdvisorQuietHoursStart', stateId: 'settings.aiAdvisorQuietHoursStart', kind: 'string' },
    { key: 'aiAdvisorQuietHoursEnd', stateId: 'settings.aiAdvisorQuietHoursEnd', kind: 'string' },
    { key: 'aiAdvisorEvReadyBy', stateId: 'settings.aiAdvisorEvReadyBy', kind: 'string' },
    { key: 'aiAdvisorEvTargetSocPct', stateId: 'settings.aiAdvisorEvTargetSocPct', kind: 'number', min: 10, max: 100 },
    { key: 'aiAdvisorThermalReadyBy', stateId: 'settings.aiAdvisorThermalReadyBy', kind: 'string' },
    { key: 'aiAdvisorPriorityStorage', stateId: 'settings.aiAdvisorPriorityStorage', kind: 'number', min: 0, max: 100 },
    { key: 'aiAdvisorPriorityEvcs', stateId: 'settings.aiAdvisorPriorityEvcs', kind: 'number', min: 0, max: 100 },
    { key: 'aiAdvisorPriorityThermal', stateId: 'settings.aiAdvisorPriorityThermal', kind: 'number', min: 0, max: 100 },
    { key: 'aiAdvisorPriorityHeatingRod', stateId: 'settings.aiAdvisorPriorityHeatingRod', kind: 'number', min: 0, max: 100 },
    { key: 'aiAdvisorPriorityGeneric', stateId: 'settings.aiAdvisorPriorityGeneric', kind: 'number', min: 0, max: 100 },
    // Wetter-App. API-Key bleibt explizit string, damit numerische/sonderzeichenhaltige
    // Schlüssel nicht versehentlich als Zahl oder Boolean normalisiert werden.
    { key: 'weatherEnabled', stateId: 'settings.weatherEnabled', kind: 'boolean' },
    { key: 'weatherUsageMode', stateId: 'settings.weatherUsageMode', kind: 'string' },
    { key: 'weatherApiKey', stateId: 'settings.weatherApiKey', kind: 'string' },
    // Endkunden-UI / Anzeigeparameter. Diese lokalen States werden vom Frontend gelesen
    // und berühren keine Installer-DP-Zuordnung.
    { key: 'deviceStaleTimeoutSec', stateId: 'settings.deviceStaleTimeoutSec', kind: 'number', min: 30, max: 86400 },
    { key: 'dynamicTariff', stateId: 'settings.dynamicTariff', kind: 'boolean' },
    { key: 'storagePower', stateId: 'settings.storagePower', kind: 'number', min: 0, max: 1000000000 },
    { key: 'price', stateId: 'settings.price', kind: 'number', min: -100, max: 1000 },
    { key: 'priority', stateId: 'settings.priority', kind: 'number', min: 0, max: 100 },
    { key: 'tariffMode', stateId: 'settings.tariffMode', kind: 'number', min: 0, max: 10 },
    // Energie-Wertkonto: Preise sind Betreiber-/Kundeneinstellungen im Frontend.
    // Der Installer verknüpft Datenpunkte, aber der Nutzer darf seine Kostenannahmen
    // selbst pflegen. Die eigentliche Modul-Logik nutzt bei aktivem dynamischem Tarif
    // trotzdem den aktuellen Tarifpreis und diese Werte nur als Fallback/Bewertung.
    { key: 'energyWalletFixedImportEurPerKwh', stateId: 'settings.energyWalletFixedImportEurPerKwh', kind: 'number', min: -2, max: 5 },
    { key: 'energyWalletFeedInEurPerKwh', stateId: 'settings.energyWalletFeedInEurPerKwh', kind: 'number', min: -2, max: 5 },
    { key: 'energyWalletEvcsValueEurPerKwh', stateId: 'settings.energyWalletEvcsValueEurPerKwh', kind: 'number', min: -2, max: 5 },
    { key: 'tariffPvSeasonEnabled', stateId: 'settings.tariffPvSeasonEnabled', kind: 'boolean' },
    { key: 'tariffPvSeasonQ1Factor', stateId: 'settings.tariffPvSeasonQ1Factor', kind: 'number', min: 0, max: 10 },
    { key: 'tariffPvSeasonQ2Factor', stateId: 'settings.tariffPvSeasonQ2Factor', kind: 'number', min: 0, max: 10 },
    { key: 'tariffPvSeasonQ3Factor', stateId: 'settings.tariffPvSeasonQ3Factor', kind: 'number', min: 0, max: 10 },
    { key: 'tariffPvSeasonQ4Factor', stateId: 'settings.tariffPvSeasonQ4Factor', kind: 'number', min: 0, max: 10 },
    { key: 'netFeeEnabled', stateId: 'settings.netFeeEnabled', kind: 'boolean' },
    { key: 'netFeeModel', stateId: 'settings.netFeeModel', kind: 'number', min: 1, max: 2 },
    { key: 'netFeeNtStart', stateId: 'settings.netFeeNtStart', kind: 'string' },
    { key: 'netFeeNtEnd', stateId: 'settings.netFeeNtEnd', kind: 'string' },
    { key: 'netFeeHtStart', stateId: 'settings.netFeeHtStart', kind: 'string' },
    { key: 'netFeeHtEnd', stateId: 'settings.netFeeHtEnd', kind: 'string' },
    { key: 'netFeePriceNt', stateId: 'settings.netFeePriceNt', kind: 'number', min: -100, max: 1000 },
    { key: 'netFeePriceHt', stateId: 'settings.netFeePriceHt', kind: 'number', min: -100, max: 1000 },
    { key: 'netFeePriceSt', stateId: 'settings.netFeePriceSt', kind: 'number', min: -100, max: 1000 },
    { key: 'flowSubtractEvFromBuilding', stateId: 'settings.flowSubtractEvFromBuilding', kind: 'boolean' },
    { key: 'flowInvertGrid', stateId: 'settings.flowInvertGrid', kind: 'boolean' },
    { key: 'flowInvertBattery', stateId: 'settings.flowInvertBattery', kind: 'boolean' },
    { key: 'flowInvertPv', stateId: 'settings.flowInvertPv', kind: 'boolean' },
    { key: 'flowInvertEv', stateId: 'settings.flowInvertEv', kind: 'boolean' },
    { key: 'flowGridShowNet', stateId: 'settings.flowGridShowNet', kind: 'boolean' },
];
/** Code-Teil: normalizeMainBoolean. Zweck: Normalisiert Schalterwerte aus HTML/Formularen. */
function normalizeMainBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'on', 'yes', 'ja', 'an'].includes(s);
}
/** Code-Teil: normalizeMainNumber. Zweck: Normalisiert Zahlenwerte mit optionalen Grenzen. */
function normalizeMainNumber(value, min, max) {
    let n = Number(value);
    if (!Number.isFinite(n))
        n = 0;
    if (typeof min === 'number')
        n = Math.max(min, n);
    if (typeof max === 'number')
        n = Math.min(max, n);
    return Math.round(n * 1000) / 1000;
}
/**
 * Code-Teil: normalizeMainApiSetValue
 *
 * Zweck:
 * Wandelt einen Frontend-API-Wert in den gewünschten Zieltyp um.
 *
 * Wichtig:
 * false, 0 und leere Strings werden nicht per Wahrheit/Falschheit ersetzt.
 */
function normalizeMainApiSetValue(value, kind, definition) {
    if (kind === 'boolean')
        return normalizeMainBoolean(value);
    if (kind === 'number')
        return normalizeMainNumber(value, definition?.min, definition?.max);
    if (kind === 'json') {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (_err) {
                return null;
            }
        }
        return value ?? null;
    }
    return String(value ?? '');
}
/**
 * Code-Teil: buildMainSettingsWritePlan
 *
 * Zweck:
 * Erstellt einen späteren State-Schreibplan für `settings.*` aus einer `/api/set`-Anfrage.
 *
 * Zusammenhang:
 * Dieser Helfer wird ab 0.7.100 produktiv für einfache `settings.*`-Werte genutzt.
 * Unbekannte oder komplexe Scopes fallen weiterhin auf die bestehende JS-Route zurück.
 */
function buildMainSettingsWritePlan(request, definitions = exports.DEFAULT_MAIN_SETTING_DEFINITIONS) {
    if (request.scope !== 'settings')
        return { ok: false, message: `Scope ${request.scope} ist kein settings-Schreibvorgang.` };
    const definition = definitions.find((item) => item.key === request.key);
    if (!definition)
        return { ok: false, message: `Unbekannte Einstellung: ${request.key}` };
    const value = normalizeMainApiSetValue(request.value, definition.kind, definition);
    return {
        ok: true,
        plan: {
            stateId: definition.stateId,
            value,
            ack: false,
            reason: `settings.${request.key} aus /api/set vorbereitet`,
        },
    };
}
/**
 * Code-Teil: buildMainApiSetShadowComparison
 *
 * Zweck:
 * Erstellt für `/api/set` einen TypeScript-Schreibplan im Shadow-Modus.
 *
 * Zusammenhang:
 * `main.js` führt die bestehenden Schreibpfade weiterhin selbst aus. Der Shadow-Plan
 * dient nur dazu zu sehen, ob die künftige TS-Normalisierung denselben Bereich sicher
 * beschreiben kann. Unbekannte Keys blockieren die Runtime nicht.
 */
function buildMainApiSetShadowComparison(request, definitions = exports.DEFAULT_MAIN_SETTING_DEFINITIONS) {
    const result = buildMainSettingsWritePlan(request, definitions);
    if (!result.ok || !result.plan) {
        return {
            available: true,
            ok: true,
            supported: false,
            scope: request.scope,
            key: request.key,
            warnings: [result.message || 'Der TS-Helfer kennt diesen Schreibvorgang noch nicht.'],
            blockers: [],
        };
    }
    return {
        available: true,
        ok: true,
        supported: true,
        scope: request.scope,
        key: request.key,
        plan: result.plan,
        warnings: [],
        blockers: [],
    };
}
