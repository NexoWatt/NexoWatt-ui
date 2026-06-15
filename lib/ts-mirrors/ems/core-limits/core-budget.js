'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/core-limits/core-budget.ts
 * Quell-Hash: sha256:b371f795664385ab8f0dc0240b58cbc434efa6810029ca250a81e75c38d5b58e
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
exports.calculateCoreBudgetFlexUsedW = calculateCoreBudgetFlexUsedW;
exports.buildCoreBudgetConsumersList = buildCoreBudgetConsumersList;
exports.computeCoreBudgetReservation = computeCoreBudgetReservation;
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
    const uncappedTotalEffectiveW = Math.max(0, pv.effectiveW + grid.effectiveW);
    const totalCap = (0, number_1.toNumberOrNull)(input.totalBudgetCapW);
    const totalEffectiveW = totalCap !== null && totalCap >= 0
        ? Math.min(uncappedTotalEffectiveW, Math.max(0, totalCap))
        : uncappedTotalEffectiveW;
    const limitReason = totalCap !== null && totalCap >= 0 && totalEffectiveW < uncappedTotalEffectiveW
        ? 'manual-limit'
        : (pv.reason !== 'pv-surplus' ? pv.reason : grid.reason);
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
/**
 * Code-Teil: reservationString
 *
 * Zweck:
 * Normalisiert dynamische Request-Felder wie key/app/label/mode auf Strings.
 *
 * Zusammenhang:
 * Die alte JS-Logik erlaubt unterschiedliche Aliase (`key`, `consumer`, `app`). Diese
 * Kompatibilität muss bei der TS-Migration erhalten bleiben.
 */
function reservationString(value, fallback) {
    const s = String(value ?? '').trim();
    return s || fallback;
}
/**
 * Code-Teil: reservationPositiveWatt
 *
 * Zweck:
 * Normalisiert Verbraucherleistungen auf positive Wattwerte und erhält 0 W als gültig.
 */
function reservationPositiveWatt(value, fallback = 0) {
    const n = (0, number_1.toNumberOrNull)(value);
    return (0, number_1.positiveWatt)(n === null ? fallback : n);
}
/**
 * Code-Teil: reservationPriority
 *
 * Zweck:
 * Normalisiert Verbraucherprioritäten. Fehlende Priorität bleibt wie in JS bei 999.
 */
function reservationPriority(value) {
    const n = (0, number_1.toNumberOrNull)(value);
    return n === null ? 999 : n;
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
function calculateCoreBudgetFlexUsedW(consumers, order) {
    const keys = Array.isArray(order) && order.length ? order : Object.keys(consumers || {});
    const sum = keys.reduce((acc, key) => {
        const entry = consumers && consumers[key] ? consumers[key] : null;
        if (!entry)
            return acc;
        const used = (0, number_1.toNumberOrNull)(entry.usedW ?? entry.reserveW);
        return acc + (0, number_1.positiveWatt)(used);
    }, 0);
    return Math.round(sum);
}
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
function buildCoreBudgetConsumersList(consumers, order) {
    const keys = Array.isArray(order) && order.length > 0 ? Array.from(order) : Object.keys(consumers || {});
    const result = [];
    for (const key of keys) {
        const entry = consumers && consumers[key] ? consumers[key] : null;
        if (entry)
            result.push({ key, ...entry });
    }
    return result;
}
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
function computeCoreBudgetReservation(runtime, request, tsInput) {
    const r = request && typeof request === 'object' ? request : {};
    const ts = ((0, number_1.toNumberOrNull)(tsInput) ?? Date.now());
    const key = reservationString(r.key ?? r.consumer ?? r.app, 'unknown');
    const app = reservationString(r.app, key);
    const priority = reservationPriority(r.priority);
    const requestedW = reservationPositiveWatt(r.requestedW, 0);
    const reserveW = reservationPositiveWatt(r.reserveW, requestedW);
    const pvOnly = r.pvOnly === true;
    const pvReserveW = reservationPositiveWatt(r.pvReserveW, pvOnly ? reserveW : 0);
    const actualW = reservationPositiveWatt(r.actualW, reserveW);
    const remainingTotalNumber = (0, number_1.toNumberOrNull)(runtime && runtime.remainingTotalW);
    const remainingTotalW = remainingTotalNumber === null ? null : Math.max(0, remainingTotalNumber);
    const remainingPvW = (0, number_1.positiveWatt)(runtime && runtime.remainingPvW);
    const totalCap = remainingTotalW === null ? Number.POSITIVE_INFINITY : remainingTotalW;
    const pvCap = remainingPvW;
    const cap = pvOnly ? Math.min(totalCap, pvCap) : totalCap;
    const grantW = Math.max(0, Math.min(requestedW, cap));
    const nextRemainingTotalW = remainingTotalW === null ? null : Math.max(0, Math.round(remainingTotalW - reserveW));
    const nextRemainingPvW = Math.max(0, Math.round(remainingPvW - pvReserveW));
    const entry = {
        key,
        app,
        label: reservationString(r.label, key),
        priority,
        requestedW: Math.round(requestedW),
        grantW: Math.round(grantW),
        usedW: Math.round(reserveW),
        pvUsedW: Math.round(pvReserveW),
        reserveW: Math.round(reserveW),
        pvReserveW: Math.round(pvReserveW),
        actualW: Math.round(actualW),
        pvOnly,
        mode: reservationString(r.mode, ''),
        ts,
        remainingTotalW: nextRemainingTotalW,
        remainingPvW: nextRemainingPvW,
    };
    const consumers = {};
    const sourceConsumers = runtime && runtime.consumers ? runtime.consumers : {};
    for (const existingKey of Object.keys(sourceConsumers)) {
        const existing = sourceConsumers[existingKey];
        if (existing)
            consumers[existingKey] = existing;
    }
    consumers[key] = entry;
    const runtimeOrder = runtime && Array.isArray(runtime.order) ? runtime.order : [];
    const order = Array.from(runtimeOrder);
    if (!order.includes(key))
        order.push(key);
    const flexUsedW = calculateCoreBudgetFlexUsedW(consumers, order);
    return {
        ok: true,
        source: 'ts-core-reservation',
        entry,
        nextRemainingTotalW,
        nextRemainingPvW,
        order,
        consumers,
        flexUsedW,
    };
}
