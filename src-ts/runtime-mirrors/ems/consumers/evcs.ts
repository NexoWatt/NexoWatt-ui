// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/consumers/evcs.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/consumers/evcs.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 58044651bf494d900fb1559b128e54a11e4827ae9b10d50faddeda010014b520
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/consumers/evcs.ts
 * Quell-Hash: sha256:48ca0a91c8f4702eed6fe899a632895f984c3d01e7e7d7ad9496634b31e4b96a
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/consumers/evcs.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/consumers/evcs.js
 * Rolle im Projekt: EMS-Verbraucheradapter.
 * Zweck: Kapselt einen regelbaren Verbraucher und übersetzt EMS-Freigaben in konkrete Zustände/Setpoints.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Consumer-Adapter der EMS-Schicht: kapselt eine Verbraucher-/Setpoint-/Schaltlogik für EMS-Module.
 * Zusammenhänge:
 * - Wird von ems/modules/* genutzt, um reale oder simulierte Verbraucher anzusprechen.
 * Wartungshinweise:
 * - DP-Einheiten und Invertierungen müssen zur Installer-Konfiguration passen.
 */

'use strict';

/**
 * EVCS (wallbox) consumer actuation.
 *
 * Expects a consumer object:
 * {
 *   type: 'evcs',
 *   key: string,
 *   name: string,
 *   controlBasis: 'currentA'|'powerW'|'none'|'auto',
 *   setAKey?: string, // DatapointRegistry key
 *   setWKey?: string, // DatapointRegistry key
 *   enableKey?: string // DatapointRegistry key (boolean)
 * }
 */
/**
 * Code-Teil: _basis
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _basis(b) {
    const s = String(b || '').trim().toLowerCase();
    if (s === 'currenta' || s === 'current') return 'currentA';
    if (s === 'powerw' || s === 'power') return 'powerW';
    if (s === 'none') return 'none';
    if (s === 'auto') return 'auto';
    return 'auto';
}

/**
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {{targetW:number, targetA:number, basis?:string}} target
 * @returns {Promise<{applied:boolean, status:string, writes:{setA:boolean,setW:boolean,enable:boolean}}>}
 */
/**
 * Code-Teil: applyEvcsSetpoint
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function applyEvcsSetpoint(ctx, consumer, target) {
    const adapter = ctx && ctx.adapter;
    const dp = ctx && ctx.dp;

    const basis = String(target && target.basis || consumer && consumer.controlBasis || 'auto');
    const setAKey = consumer && consumer.setAKey;
    const setWKey = consumer && consumer.setWKey;
    const enableKey = consumer && consumer.enableKey;

    const targetA = Number(target && target.targetA);
    const targetW = Number(target && target.targetW);

    // Optional override: when provided, we explicitly write the enable datapoint.
    // If not provided, we treat enable as user/installer-controlled and do NOT toggle it
    // automatically based on the power/current setpoint. This is important for PV/PV+min modes
    // where setpoint=0 should mean "waiting" (not "disabled").
    const enableOverride = (target && typeof target.enable === 'boolean') ? target.enable : null;

    // Validate datapoints early to provide clear status
    const hasSetA = !!(setAKey && dp && dp.getEntry && dp.getEntry(setAKey));
    const hasSetW = !!(setWKey && dp && dp.getEntry && dp.getEntry(setWKey));
    const hasEnable = !!(enableKey && dp && dp.getEntry && dp.getEntry(enableKey));

    // Resolve basis with safe fallbacks
    let resolvedBasis = basis;
    if (resolvedBasis === 'auto') {
        if (hasSetW) resolvedBasis = 'powerW';
        else if (hasSetA) resolvedBasis = 'currentA';
        else resolvedBasis = 'none';
    }

    if (resolvedBasis === 'none') {
        return { applied: false, status: 'control_disabled', writes: { setA: null, setW: null, enable: null } };
    }

    if (!hasSetA && !hasSetW) {
        return { applied: false, status: 'no_setpoint_dp', writes: { setA: null, setW: null, enable: null } };
    }

    /** @type {true|false|null} */
    let wroteA = null;
    /** @type {true|false|null} */
    let wroteW = null;
    /** @type {true|false|null} */
    let wroteEnable = null;

    // Apply setpoint
    if (resolvedBasis === 'currentA') {
        if (hasSetA) wroteA = await dp.writeNumber(setAKey, (targetA > 0 ? targetA : 0), false);
        else if (hasSetW) wroteW = await dp.writeNumber(setWKey, Math.round(targetW > 0 ? targetW : 0), false);
    } else if (resolvedBasis === 'powerW') {
        if (hasSetW) wroteW = await dp.writeNumber(setWKey, Math.round(targetW > 0 ? targetW : 0), false);
        else if (hasSetA) wroteA = await dp.writeNumber(setAKey, (targetA > 0 ? targetA : 0), false);
    } else { // fallback
        if (hasSetW) wroteW = await dp.writeNumber(setWKey, Math.round(targetW > 0 ? targetW : 0), false);
        else if (hasSetA) wroteA = await dp.writeNumber(setAKey, (targetA > 0 ? targetA : 0), false);
    }

    // Enable handling:
    // - Only write enableKey when an explicit override is provided.
    // - Otherwise, keep enable untouched (user/installer decides), and use setpoint=0 as "pause".
    if (enableKey) {
        if (!hasEnable) {
            wroteEnable = false;
        } else if (enableOverride !== null) {
            wroteEnable = await dp.writeBoolean(enableKey, enableOverride, false);
        } else {
            // do not write
            wroteEnable = null;
        }
    }
    const results = [wroteA, wroteW, wroteEnable].filter(v => v !== null && v !== undefined);
    const anyFalse = results.some(v => v === false);
    const anyTrue = results.some(v => v === true);

    // applied=true means "desired state in effect" (written or idempotently unchanged)
    const applied = !anyFalse;

    let status = 'unchanged';
    if (anyFalse && anyTrue) status = 'applied_partial';
    else if (anyFalse) status = 'write_failed';
    else if (anyTrue) status = 'applied';

    if (adapter && adapter.log && typeof adapter.log.debug === 'function') {
        const k = String(consumer && consumer.key || '');
        adapter.log.debug(`[consumer:evcs] apply '${k}' basis=${resolvedBasis} targetW=${Math.round(targetW || 0)} targetA=${Number.isFinite(targetA) ? targetA.toFixed(2) : '0.00'} wroteW=${wroteW} wroteA=${wroteA} wroteEnable=${wroteEnable} status=${status}`);
    }

    return { applied, status, writes: { setA: wroteA, setW: wroteW, enable: wroteEnable } };
}

module.exports = { applyEvcsSetpoint };
