// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/storage-anti-export-guard.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/storage-anti-export-guard.js
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
 * Original-Hash: ec26d7f7c3a6b88bea448a209dddf70925fa93a0cf4dd68e11234e61f9f6ef7d
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
 * Quelle: src-ts/runtime-executables/ems/services/storage-anti-export-guard.ts
 * Quell-Hash: sha256:93a26febdc87e069dc9b9d7fcc0e2f7a417ea046ed0bd780d69d486c1d98da65
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-anti-export-guard.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStorageAntiExportTarget = resolveStorageAntiExportTarget;
/**
 * Code-Teil: finite
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finite(value) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean')
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
/**
 * Reine, nebenwirkungsfreie Anti-Export-Entscheidung.
 *
 * Die physikalische Last hinter dem NVP ist:
 *   Last = NVP + aktuelle Speicherentladung
 * Daraus folgt fuer das sichere Entlade-Maximum:
 *   Entlade-Max = Speicher-Ist + NVP - NVP-Ziel
 *
 * Fehlt ein frischer Speicher-Istwert, wird ein positiver Entladebefehl
 * gestoppt. Eine angenommene 0-W-Istleistung waere bei einer noch laufenden
 * Speicherladung nicht sicher: Der NVP-Bezug koennte vollstaendig aus dieser
 * Ladung stammen und ein Richtungswechsel sonst unmittelbar Export erzeugen.
 */
function resolveStorageAntiExportTarget(input = {}) {
    const requestedW = finite(input.requestedTargetW) ?? 0;
    const nvpTargetW = Math.max(0, finite(input.nvpTargetW) ?? 50);
    const nvpDeadbandW = Math.max(0, finite(input.nvpDeadbandW) ?? 50);
    const commandEpsilonW = Math.max(0.5, finite(input.commandEpsilonW) ?? 1);
    const nvpParsed = finite(input.nvpW);
    const nvpUsable = input.nvpUsable === true && nvpParsed !== null;
    const actualParsed = finite(input.storageActualW);
    const storageActualTrusted = input.storageActualTrusted === true && actualParsed !== null;
    const storageActualW = storageActualTrusted ? actualParsed : null;
    const hardExportFloorW = Math.max(0, nvpTargetW - nvpDeadbandW);
    if (requestedW <= commandEpsilonW) {
        return {
            active: false,
            action: 'inactive',
            requestedW,
            targetW: requestedW,
            explicitStop: false,
            nvpUsable,
            nvpW: nvpParsed,
            nvpTargetW,
            nvpDeadbandW,
            hardExportFloorW,
            storageActualW,
            storageActualTrusted,
            safeDischargeCapW: 0,
            predictedNvpW: nvpParsed,
            capped: false,
            reason: '',
        };
    }
    if (!nvpUsable) {
        return {
            active: true,
            action: 'stop-missing-nvp',
            requestedW,
            targetW: 0,
            explicitStop: true,
            nvpUsable: false,
            nvpW: nvpParsed,
            nvpTargetW,
            nvpDeadbandW,
            hardExportFloorW,
            storageActualW,
            storageActualTrusted,
            safeDischargeCapW: 0,
            predictedNvpW: null,
            capped: true,
            reason: 'Anti-Export: positiver Entladebefehl ohne frischen signierten NVP gestoppt',
        };
    }
    const nvpW = nvpParsed;
    if (nvpW < hardExportFloorW) {
        return {
            active: true,
            action: 'stop-confirmed-export',
            requestedW,
            targetW: 0,
            explicitStop: true,
            nvpUsable: true,
            nvpW,
            nvpTargetW,
            nvpDeadbandW,
            hardExportFloorW,
            storageActualW,
            storageActualTrusted,
            safeDischargeCapW: 0,
            predictedNvpW: storageActualW === null ? nvpW : nvpW + storageActualW,
            capped: true,
            reason: `Anti-Export: NVP ${Math.round(nvpW)} W bestaetigt Einspeisung – Speicherentladung sofort stoppen`,
        };
    }
    if (!storageActualTrusted || storageActualW === null) {
        return {
            active: true,
            action: 'stop-missing-storage-feedback',
            requestedW,
            targetW: 0,
            explicitStop: true,
            nvpUsable: true,
            nvpW,
            nvpTargetW,
            nvpDeadbandW,
            hardExportFloorW,
            storageActualW: null,
            storageActualTrusted: false,
            safeDischargeCapW: 0,
            predictedNvpW: nvpW,
            capped: true,
            reason: 'Anti-Export: positiver Entladebefehl ohne frische vertrauenswuerdige Speicher-Istleistung gestoppt',
        };
    }
    const safeDischargeCapW = Math.max(0, storageActualW + nvpW - nvpTargetW);
    if (safeDischargeCapW <= commandEpsilonW) {
        return {
            active: true,
            action: 'stop-no-safe-headroom',
            requestedW,
            targetW: 0,
            explicitStop: true,
            nvpUsable: true,
            nvpW,
            nvpTargetW,
            nvpDeadbandW,
            hardExportFloorW,
            storageActualW,
            storageActualTrusted,
            safeDischargeCapW,
            predictedNvpW: nvpW + storageActualW,
            capped: true,
            reason: `Anti-Export: kein sicherer Entlade-Headroom oberhalb ${Math.round(nvpTargetW)} W NVP-Ziel`,
        };
    }
    const targetW = Math.max(0, Math.min(requestedW, safeDischargeCapW));
    const capped = targetW + commandEpsilonW < requestedW;
    const predictedNvpW = nvpW + storageActualW - targetW;
    return {
        active: true,
        action: capped ? 'cap-to-nvp-headroom' : 'allow-discharge',
        requestedW,
        targetW,
        explicitStop: false,
        nvpUsable: true,
        nvpW,
        nvpTargetW,
        nvpDeadbandW,
        hardExportFloorW,
        storageActualW,
        storageActualTrusted,
        safeDischargeCapW,
        predictedNvpW,
        capped,
        reason: capped
            ? `Anti-Export: Entladung auf sicheren NVP-Headroom ${Math.round(targetW)} W begrenzt`
            : 'Anti-Export: Entladung innerhalb des sicheren NVP-Headrooms',
    };
}
module.exports = { resolveStorageAntiExportTarget };
