/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/consumers/index.ts
 * Quell-Hash: sha256:9aaf779c432cd5d7c691b09f155bb5e4ac1adfcc8d0b7ed76a1cc3d8d25cb2e5
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/consumers/index.js.
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
 * Datei: ems/consumers/index.js
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

const { applyEvcsSetpoint } = require('./evcs');
const { applyLoadSetpoint } = require('./generic-load');
const { applySetpointNumeric } = require('./generic-setpoint');
const { applySgReady } = require('./sg-ready');

/**
 * Unified consumer actuation entry point.
 *
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {any} target
 */
/**
 * Code-Teil: applySetpoint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function applySetpoint(ctx, consumer, target) {
    const type = String(consumer?.type || '').trim().toLowerCase();

    if (type === 'evcs' || type === 'wallbox') {
        return applyEvcsSetpoint(ctx, consumer, target);
    }
    if (type === 'load') {
        return applyLoadSetpoint(ctx, consumer, target);
    }
    if (type === 'setpoint') {
        return applySetpointNumeric(ctx, consumer, target);
    }
    if (type === 'sgready' || type === 'sg-ready' || type === 'sg_ready') {
        return applySgReady(ctx, consumer, target);
    }
    return { applied: false, status: 'unsupported_type', writes: {} };
}

module.exports = { applySetpoint };
