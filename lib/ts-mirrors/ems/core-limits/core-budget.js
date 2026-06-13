'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/core-limits/core-budget.ts
 * Quell-Hash: sha256:c12773b7e047fb7ed1495f4a273801cebda60c347e898d84b2278b912fddbfa6
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * Core-Limits-/EMS-Budget-Spiegel für spätere Shadow-Vergleiche.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStorageReserveActive = isStorageReserveActive;
exports.calculatePvBudgetGate = calculatePvBudgetGate;
exports.calculateGridBudgetGate = calculateGridBudgetGate;
exports.buildCoreBudgetSnapshot = buildCoreBudgetSnapshot;
const number_1 = require("../../utils/number");
/**
 * Datei: src-ts/ems/core-limits/core-budget.ts
 *
 * Zweck:
 * Produktionsnahe TypeScript-Vorbereitung für die zentrale EMS-Budgetberechnung.
 * Diese Datei ist in 0.7.62 noch nicht produktiv verdrahtet. Sie beschreibt und testet
 * aber die Logik, die später aus `ems/modules/core-limits.js` herausgelöst werden soll.
 *
 * Zusammenhang:
 * Core-Limits liefern die Grundlage für Heizstab, EVCS, KI-Berater, Energiefluss und
 * History. Wenn diese Budgets falsch sind, laufen Verbraucherfreigabe und Historie falsch.
 *
 * Wichtig:
 * - 0 W ist ein gültiger Budgetwert.
 * - Speicherreserve muss vom Verbraucherbudget abgezogen werden, wenn sie aktiv ist.
 * - Netzlimit/Peak-Shaving darf nie durch PV-Logik übersteuert werden.
 */
/**
 * Code-Teil: numberPercentOrNull
 *
 * Zweck:
 * Normalisiert einen unbekannten SoC-/Prozentwert auf 0–100 oder `null`.
 *
 * Zusammenhang:
 * Speicherreserve-Entscheidungen hängen vom SoC ab. Ein fehlender SoC darf nicht heimlich
 * als 0 % interpretiert werden, weil dadurch die Reserve dauerhaft aktiv wäre.
 */
function numberPercentOrNull(value) {
    const n = (0, number_1.toNumberOrNull)(value);
    return n === null ? null : (0, number_1.clampNumber)(n, 0, 100);
}
/**
 * Code-Teil: gate
 *
 * Zweck:
 * Erstellt ein einheitliches Budget-Gate mit Rohwert, Effektivwert und Diagnosegrund.
 *
 * Zusammenhang:
 * `core-limits.js` veröffentlicht später mehrere Budgets. Durch eine gemeinsame Struktur
 * können Heizstab, EVCS und KI-Berater dieselben Felder interpretieren.
 */
function gate(rawW, effectiveW, reason, diagnosticText) {
    const result = {
        rawW: Math.max(0, Math.round(rawW)),
        effectiveW: Math.max(0, Math.round(effectiveW)),
        reason,
    };
    if (typeof diagnosticText === 'string' && diagnosticText.length > 0) {
        result.diagnosticText = diagnosticText;
    }
    return result;
}
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
function isStorageReserveActive(storageSocPct, reserveSocPct, allowStorageDischarge = true) {
    const reserve = numberPercentOrNull(reserveSocPct);
    if (!allowStorageDischarge)
        return true;
    if (storageSocPct === null || reserve === null)
        return false;
    return storageSocPct <= reserve;
}
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
function calculatePvBudgetGate(input) {
    const rawPvW = (0, number_1.positiveWatt)(input.pvSurplusW);
    const reserveW = (0, number_1.positiveWatt)(input.storageReserveW);
    const alreadyReservedW = (0, number_1.positiveWatt)(input.alreadyReservedW);
    const soc = numberPercentOrNull(input.storageSocPct);
    const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
    const appliedReserveW = reserveActive ? reserveW : 0;
    const effectiveW = Math.max(0, rawPvW - appliedReserveW - alreadyReservedW);
    const reason = reserveActive ? 'storage-reserve' : (alreadyReservedW > 0 ? 'manual-limit' : 'pv-surplus');
    const diagnosticText = reserveActive
        ? `PV-Budget um Speicherreserve ${Math.round(appliedReserveW)} W reduziert.`
        : `PV-Budget aus Überschuss ${Math.round(rawPvW)} W berechnet.`;
    return gate(rawPvW, effectiveW, reason, diagnosticText);
}
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
function calculateGridBudgetGate(input) {
    const importW = (0, number_1.positiveWatt)(input.gridImportW);
    const limit = (0, number_1.toNumberOrNull)(input.gridImportLimitW);
    if (input.allowGridImport === false) {
        return gate(0, 0, 'manual-limit', 'Netzbezug ist für flexible Verbraucher deaktiviert.');
    }
    if (input.peakShavingActive) {
        const eff = limit === null ? 0 : Math.max(0, limit - importW);
        return gate(limit === null ? 0 : Math.max(0, limit), eff, 'peak-shaving', 'Peak-Shaving begrenzt zusätzliches Netzbudget.');
    }
    if (input.externalLimitActive) {
        const eff = limit === null ? 0 : Math.max(0, limit - importW);
        return gate(limit === null ? 0 : Math.max(0, limit), eff, 'para14a', 'Externes Limit begrenzt zusätzliches Netzbudget.');
    }
    if (limit === null || limit <= 0) {
        return gate(0, 0, 'missing-input', 'Kein Netzlimit vorhanden; Netzbudget wird konservativ nicht erweitert.');
    }
    return gate(limit, Math.max(0, limit - importW), 'grid-limit', 'Netzbudget aus Anschluss-/Peak-Limit berechnet.');
}
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
function buildCoreBudgetSnapshot(input) {
    const ts = ((0, number_1.toNumberOrNull)(input.ts) ?? Date.now());
    const soc = numberPercentOrNull(input.storageSocPct);
    const reserveActive = isStorageReserveActive(soc, input.storageReserveSocPct, input.allowStorageDischarge !== false);
    const storageReserveW = reserveActive ? (0, number_1.positiveWatt)(input.storageReserveW) : 0;
    const alreadyReservedW = (0, number_1.positiveWatt)(input.alreadyReservedW);
    const pv = calculatePvBudgetGate(input);
    const grid = calculateGridBudgetGate(input);
    const totalRaw = pv.rawW + grid.rawW;
    const totalEffectiveW = Math.max(0, pv.effectiveW + grid.effectiveW);
    const limitReason = pv.reason !== 'pv-surplus' ? pv.reason : grid.reason;
    const diagnosticText = [pv.diagnosticText, grid.diagnosticText]
        .filter((x) => typeof x === 'string' && x.length > 0)
        .join(' ');
    return {
        ts,
        pv,
        grid,
        total: gate(totalRaw, totalEffectiveW, limitReason || 'none', diagnosticText),
        storageReserveActive: reserveActive,
        storageSocPct: soc,
        appliedStorageReserveW: storageReserveW,
        alreadyReservedW,
        diagnosticText,
    };
}
