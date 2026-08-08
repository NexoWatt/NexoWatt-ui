/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/evcs-control-mapping.ts
 * Quell-Hash: sha256:25bd882ba8b622b50198b83e9ebe4fd90db954f5c2ef0a9da8e59bf3ccb993a7
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/evcs-control-mapping.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Datei: ems/evcs-control-mapping.js
 * Rolle: Feldkompatible Auflösung von EVCS-Steuer-Datenpunkten.
 *
 * Zweck:
 * - Ältere und neuere Versionen von `nexowatt-devices` verwenden für dieselbe
 *   Sollwertfunktion unterschiedliche Aliasnamen (`currentLimitA`/`powerLimitW`
 *   bzw. `targetCurrentA`/`targetPowerW`).
 * - Bestehende Kundenkonfigurationen dürfen deshalb nach einem Update nicht als
 *   "nicht steuerbar" gelten, nur weil die Sollwertfelder noch nicht erneut im
 *   AppCenter gespeichert wurden.
 * - Explizit konfigurierte Installer-Datenpunkte werden niemals überschrieben.
 *
 * Sicherheitsregel:
 * Der Aufrufer entscheidet über `exists(id)`, ob ein Kandidat tatsächlich als
 * schreibbarer State vorhanden ist. Diese Datei konstruiert nur Kandidaten und
 * führt selbst keine ioBroker-Schreiboperation aus.
 */

'use strict';

/**
 * Normalisiert optionale Konfigurationswerte auf einen getrimmten Text.
 * Die arguments-Schreibweise hält diese ausführbare TS-Quelle zugleich als
 * valides JavaScript nutzbar; der Runtime-Sync führt keinen Transpiler aus.
 */
function text() {
    const value = arguments[0];
    return String(value === undefined || value === null ? '' : value).trim();
}

/**
 * Extrahiert aus einem bekannten Geräte-DP den stabilen Gerätebasis-Pfad.
 * Beispiel:
 * `nexowatt-devices.0.devices.lp2.aliases.r.power`
 * -> `nexowatt-devices.0.devices.lp2`
 */
function deriveNexowattDeviceBaseId() {
    const id = Function.prototype.apply.call(text, null, [arguments[0]]);
    if (!id) return '';
    const match = id.match(/^(.*?\.devices\.[^.]+)(?:\.|$)/i);
    return match && match[1] ? Function.prototype.apply.call(text, null, [match[1]]) : '';
}

/** Entfernt leere und doppelte Kandidaten ohne deren Prioritätsreihenfolge zu ändern. */
function unique() {
    const values = arguments[0];
    return Array.from(new Set((Array.isArray(values) ? values : [])
        .map((value) => Function.prototype.apply.call(text, null, [value]))
        .filter(Boolean)));
}

/**
 * Erstellt alle bekannten kompatiblen Sollwertkandidaten für einen Gerätepfad.
 * Die eindeutigen Target-Aliase werden bevorzugt; Legacy-Limit-/Set-Aliase
 * bleiben vollständig kompatibel.
 */
function buildEvcsControlCandidates() {
    const base = Function.prototype.apply.call(text, null, [arguments[0]]);
    if (!base) return { current: [], power: [], enable: [] };
    return {
        current: [
            `${base}.aliases.ctrl.targetCurrentA`,
            `${base}.aliases.ctrl.currentLimitA`,
            `${base}.aliases.ctrl.setCurrentA`,
            `${base}.ctrl.targetCurrentA`,
            `${base}.ctrl.currentLimitA`,
            `${base}.ctrl.setCurrentA`,
        ],
        power: [
            `${base}.aliases.ctrl.targetPowerW`,
            `${base}.aliases.ctrl.powerLimitW`,
            `${base}.aliases.ctrl.setPowerW`,
            `${base}.ctrl.targetPowerW`,
            `${base}.ctrl.powerLimitW`,
            `${base}.ctrl.setPowerW`,
        ],
        enable: [
            `${base}.aliases.ctrl.run`,
            `${base}.aliases.ctrl.enable`,
            `${base}.aliases.ctrl.enabled`,
            `${base}.ctrl.run`,
            `${base}.ctrl.enable`,
            `${base}.ctrl.enabled`,
        ],
    };
}

/** Liefert den ersten vom Aufrufer bestätigten, real vorhandenen Steuer-State. */
async function firstExisting() {
    const candidates = arguments[0];
    const exists = arguments[1];
    if (typeof exists !== 'function') return '';
    for (const id of Function.prototype.apply.call(unique, null, [candidates])) {
        try {
            if (await exists(id)) return id;
        } catch (_e) {
            // Ein einzelner nicht lesbarer Kandidat darf die restliche Suche
            // nicht abbrechen. Der Aufrufer protokolliert bei Bedarf Details.
        }
    }
    return '';
}

/**
 * Ergänzt fehlende EVCS-Sollwertpfade anhand der zugeordneten Geräte-DPs.
 *
 * Wichtige Feldregel:
 * Ein Ladepunkt darf niemals Steuerpfade mehrerer Gerätebasen mischen. Es wird
 * vollständig die erste Gerätebasis verwendet, auf der reale Steuer-States
 * gefunden werden. Explizite Installer-Zuordnungen bleiben unangetastet.
 */
async function resolveEvcsControlMapping() {
    const row = arguments[0];
    const exists = arguments[1];
    const source = row && typeof row === 'object' ? row : {};
    const out = { ...source };

    const baseIds = Function.prototype.apply.call(unique, null, [[
        source.baseId,
        source.deviceBaseId,
        source.deviceId,
        source.devId,
        source.objectId,
        source.powerId,
        source.actualPowerWId,
        source.statusId,
        source.onlineId,
        source.activeId,
        source.vehicleConnectedId,
        source.chargeDemandId,
        source.heartbeatId,
        source.energyTotalId,
        source.lockWriteId,
        source.rfidReadId,
        source.vehicleSocId,
        source.phaseSwitchId,
        source.phaseFeedbackId,
        source.setCurrentAId,
        source.setPowerWId,
        source.enableWriteId,
    ].map((value) => Function.prototype.apply.call(deriveNexowattDeviceBaseId, null, [value]))]);

    let inferredCurrent = false;
    let inferredPower = false;
    let inferredEnable = false;
    let usedBaseId = '';

    for (const baseId of baseIds) {
        const candidates = Function.prototype.apply.call(buildEvcsControlCandidates, null, [baseId]);
        const currentId = !Function.prototype.apply.call(text, null, [out.setCurrentAId])
            ? await Function.prototype.apply.call(firstExisting, null, [candidates.current, exists])
            : '';
        const powerId = !Function.prototype.apply.call(text, null, [out.setPowerWId])
            ? await Function.prototype.apply.call(firstExisting, null, [candidates.power, exists])
            : '';
        const enableId = !Function.prototype.apply.call(text, null, [out.enableWriteId])
            ? await Function.prototype.apply.call(firstExisting, null, [candidates.enable, exists])
            : '';
        if (!currentId && !powerId && !enableId) continue;

        usedBaseId = baseId;
        if (currentId) {
            out.setCurrentAId = currentId;
            inferredCurrent = true;
        }
        if (powerId) {
            out.setPowerWId = powerId;
            inferredPower = true;
        }
        if (enableId) {
            out.enableWriteId = enableId;
            inferredEnable = true;
        }
        break;
    }

    // Ist nur eine numerische Sollwertart vorhanden, wird die Auswahl explizit.
    // Bei zwei Sollwerten bleibt `auto`; AC bevorzugt dann weiterhin Strom.
    const preference = Function.prototype.apply.call(text, null, [out.controlPreference]).toLowerCase();
    const hasCurrentTarget = !!Function.prototype.apply.call(text, null, [out.setCurrentAId]);
    const hasPowerTarget = !!Function.prototype.apply.call(text, null, [out.setPowerWId]);
    let preferenceMigrated = false;
    if (preference === 'none' || preference === 'off') {
        // Alte Versionen boten `none` als zweiten, versteckten Abschalter an.
        // Sobald ein echter Sollwert-DP vorhanden ist, wird dieser Altwert auf
        // `auto` migriert. Die bewusste Deaktivierung erfolgt ausschließlich
        // über `enabled` / „Aktiv (Regelung)“.
        if (hasCurrentTarget || hasPowerTarget) {
            out.controlPreference = 'auto';
            preferenceMigrated = true;
        }
    } else if (!preference || preference === 'auto') {
        if (hasPowerTarget && !hasCurrentTarget) out.controlPreference = 'powerW';
        else if (hasCurrentTarget && !hasPowerTarget) out.controlPreference = 'currentA';
    }

    return {
        row: out,
        changed: inferredCurrent || inferredPower || inferredEnable || preferenceMigrated,
        inferredCurrent,
        inferredPower,
        inferredEnable,
        preferenceMigrated,
        baseId: usedBaseId || baseIds[0] || '',
    };
}

// `eval('module')` hält die Datei unter strict TypeScript ohne Node-Typ-Paket
// prüfbar und erzeugt zugleich unverändertes CommonJS für die ioBroker-Runtime.
eval('module').exports = {
    deriveNexowattDeviceBaseId,
    buildEvcsControlCandidates,
    resolveEvcsControlMapping,
};
