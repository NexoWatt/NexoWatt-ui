// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/storage-async-feedback-anchor.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/storage-async-feedback-anchor.js
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
 * Original-Hash: bbcd2c0a14bbfa43d292fe9343a50942ccbcab272347746c952ce583f36d8645
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
 * Quelle: src-ts/runtime-executables/ems/services/storage-async-feedback-anchor.ts
 * Quell-Hash: sha256:4ee081884822542732bcff5046b7455cf9c40267d2b49858af5e46369d8babc0
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-async-feedback-anchor.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
/**
 * Code-Teil: finiteOrNull
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const finiteOrNull = (value) => {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
/**
 * Code-Teil: estimateAsyncStorageFeedback
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function estimateAsyncStorageFeedback(input = {}) {
    const anchor = input.anchor && typeof input.anchor === 'object' ? input.anchor : null;
    const feedbackKey = String(input.feedbackKey || '').trim();
    const controlKey = String(input.controlKey || '').trim();
    const sampleTs = finiteOrNull(input.sampleTs);
    const sampleW = finiteOrNull(input.sampleW);
    const nvpW = finiteOrNull(input.nvpW);
    const nvpTargetW = finiteOrNull(input.nvpTargetW) ?? 0;
    const lastTargetW = finiteOrNull(input.lastTargetW);
    const targetToleranceW = Math.max(0.5, finiteOrNull(input.targetToleranceW) ?? 2);
    const sampleToleranceW = Math.max(0.5, finiteOrNull(input.sampleToleranceW) ?? 2);
/**
 * Code-Teil: inactive
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const inactive = (reason) => ({
        active: false,
        reason,
        estimatedActualW: sampleW,
        feedbackKey,
        controlKey,
        sampleTs,
        sampleW,
        nvpW,
        nvpTargetW,
        commandTargetW: null,
        commandBaseActualW: null,
        commandNvpW: null,
        commandAcceptedMs: null,
        expectedStorageDeltaW: 0,
        observedNvpDeltaW: 0,
        attributedStorageNvpDeltaW: 0,
        attributedStoragePowerDeltaW: 0,
        residualNvpDeltaW: 0,
    });
    if (!anchor)
        return inactive('no-command-anchor');
    if (input.lastTargetAllowed !== true)
        return inactive('last-target-not-authorized');
    if (!feedbackKey || String(anchor.feedbackKey || '') !== feedbackKey)
        return inactive('feedback-key-changed');
    if (!controlKey || String(anchor.controlKey || '') !== controlKey)
        return inactive('control-key-changed');
    const anchorSampleTs = finiteOrNull(anchor.sampleTs);
    const anchorSampleW = finiteOrNull(anchor.sampleW);
    const anchorTargetW = finiteOrNull(anchor.targetW);
    const anchorBaseActualW = finiteOrNull(anchor.baseActualW);
    const anchorNvpW = finiteOrNull(anchor.nvpW);
    const anchorAcceptedMs = finiteOrNull(anchor.acceptedMs);
    if (sampleTs === null || anchorSampleTs === null || Math.abs(sampleTs - anchorSampleTs) > 2) {
        return inactive('new-feedback-sample');
    }
    if (sampleW === null || anchorSampleW === null || Math.abs(sampleW - anchorSampleW) > sampleToleranceW) {
        return inactive('feedback-value-changed');
    }
    if (anchorTargetW === null || anchorBaseActualW === null || anchorNvpW === null || nvpW === null) {
        return inactive('anchor-incomplete');
    }
    if (anchorAcceptedMs === null || anchorAcceptedMs <= anchorSampleTs) {
        return inactive('anchor-not-after-sample');
    }
    if (lastTargetW === null || Math.abs(lastTargetW - anchorTargetW) > targetToleranceW) {
        return inactive('accepted-target-changed');
    }
    if (Math.abs(anchorTargetW) <= targetToleranceW)
        return inactive('zero-command-anchor');
    const expectedStorageDeltaW = anchorTargetW - anchorBaseActualW;
    const observedNvpDeltaW = nvpW - anchorNvpW;
    let attributedStorageNvpDeltaW = 0;
    if (expectedStorageDeltaW > targetToleranceW) {
        // Mehr Entladung senkt den NVP. Nur eine Bewegung zwischen 0 und der maximal
        // erwartbaren Absenkung wird als Speicherreaktion gutgeschrieben.
        attributedStorageNvpDeltaW = clamp(observedNvpDeltaW, -expectedStorageDeltaW, 0);
    }
    else if (expectedStorageDeltaW < -targetToleranceW) {
        // Mehr Ladung erhöht den NVP. Nur eine Bewegung zwischen 0 und der maximal
        // erwartbaren Erhöhung wird als Speicherreaktion gutgeschrieben.
        attributedStorageNvpDeltaW = clamp(observedNvpDeltaW, 0, -expectedStorageDeltaW);
    }
    const attributedStoragePowerDeltaW = -attributedStorageNvpDeltaW;
    const estimatedActualW = anchorBaseActualW + attributedStoragePowerDeltaW;
    const residualNvpDeltaW = observedNvpDeltaW - attributedStorageNvpDeltaW;
    return {
        active: true,
        reason: 'command-anchor',
        estimatedActualW,
        feedbackKey,
        controlKey,
        sampleTs,
        sampleW,
        nvpW,
        nvpTargetW,
        commandTargetW: anchorTargetW,
        commandBaseActualW: anchorBaseActualW,
        commandNvpW: anchorNvpW,
        commandAcceptedMs: anchorAcceptedMs,
        expectedStorageDeltaW,
        observedNvpDeltaW,
        attributedStorageNvpDeltaW,
        attributedStoragePowerDeltaW,
        residualNvpDeltaW,
    };
}
module.exports = {
    estimateAsyncStorageFeedback,
};
