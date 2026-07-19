/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/nvp-coordinator.ts
 * Quell-Hash: sha256:1f8628007e460c89cb7091080991c768bea469168b57660e41fd5da5f4cd585c
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/nvp-coordinator.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
const { BaseModule } = require('./base');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { getAcceptedPowerEffectSnapshot } = require('../services/accepted-power-effects');
const finiteOrNull = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' && value.trim() === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
const roundedOrNull = (value) => {
    const n = finiteOrNull(value);
    return n === null ? null : Math.round(n);
};
const boolValue = (value, fallback = false) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'ja', 'on'].includes(normalized))
            return true;
        if (['false', '0', 'no', 'nein', 'off', ''].includes(normalized))
            return false;
    }
    return fallback;
};
const cleanText = (value, maxLen = 240) => {
    const text = String(value === undefined || value === null ? '' : value)
        .replace(/\s+/g, ' ')
        .trim();
    return text.length <= maxLen ? text : `${text.slice(0, Math.max(0, maxLen - 1))}…`;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const containsAny = (value, terms) => {
    const text = String(value || '').toLowerCase();
    return terms.some((term) => text.includes(term));
};
/**
 * Reine, deterministische NVP-Prognose. Vorzeichen:
 * - NVP positiv = Netzbezug, negativ = Einspeisung
 * - Speicher positiv = Entladen, negativ = Laden
 *
 * Erwarteter NVP nach der noch ausstehenden Speicherreaktion:
 *   NVP_prognose = NVP_ist - (Speicher_soll - Speicher_ist)
 */
function buildNvpCoordinatorSnapshot(input = {}) {
    const now = Math.max(0, Math.round(finiteOrNull(input.now) ?? Date.now()));
    const rawNvpW = roundedOrNull(input.rawNvpW);
    const nvpUsable = boolValue(input.nvpUsable, false) && rawNvpW !== null;
    const nvpTargetW = Math.max(0, Math.round(finiteOrNull(input.nvpTargetW) ?? 50));
    const deadbandW = clamp(Math.round(finiteOrNull(input.deadbandW) ?? 30), 0, 5000);
    const topology = cleanText(input.topology || 'none', 40).toLowerCase() || 'none';
    const storageActualW = roundedOrNull(input.storageActualW);
    const storageTargetW = roundedOrNull(input.storageTargetW);
    const storageActualAgeMs = roundedOrNull(input.storageActualAgeMs);
    const storageActualTrusted = boolValue(input.storageActualTrusted, false);
    const actualMaxAgeMs = clamp(Math.round(finiteOrNull(input.actualMaxAgeMs) ?? 30000), 1000, 600000);
    const responseGraceMs = clamp(Math.round(finiteOrNull(input.responseGraceMs) ?? 5000), 0, 300000);
    const responseDeadbandW = clamp(Math.round(finiteOrNull(input.responseDeadbandW) ?? 150), 0, 10000);
    const responseAgeMs = Math.max(0, Math.round(finiteOrNull(input.responseAgeMs) ?? 0));
    const storageWriteStatus = cleanText(input.storageWriteStatus || '', 260);
    const writeStatusLower = storageWriteStatus.toLowerCase();
    const noWriter = topology === 'none'
        || containsAny(writeStatusLower, ['deaktiviert', 'kein-aktiver-speicher-ausgang', 'kein aktiver speicher-ausgang']);
    const blocked = !noWriter && containsAny(writeStatusLower, [
        'blockiert', 'blocked', 'authority', 'konflikt', 'gesperrt', 'nicht-moeglich', 'nicht möglich', 'nicht moeglich',
    ]);
    const hold = !noWriter && !blocked && containsAny(writeStatusLower, ['no-write', 'hold']);
    const retained = !noWriter && !blocked && writeStatusLower === 'unverändert';
    const partial = !noWriter && !blocked && (boolValue(input.storagePartiallyAccepted, false)
        || containsAny(writeStatusLower, ['farm-partial', 'partial']));
    const commandEffective = boolValue(input.storageCommandEffective, false);
    const writeOk = boolValue(input.storageWriteOk, false);
    const storageWriteAccepted = !noWriter && !blocked && !hold && (commandEffective
        || writeOk
        || retained);
    const storageWriteFullyAccepted = storageWriteAccepted && !partial && (writeOk
        || retained
        || boolValue(input.storageRequestSatisfied, false));
    const writeFailed = !noWriter && !blocked && !hold && !storageWriteAccepted;
    const storageActualFresh = storageActualW !== null
        && storageActualTrusted
        && (storageActualAgeMs === null || storageActualAgeMs <= actualMaxAgeMs);
    const storagePendingDeltaW = storageActualW !== null && storageTargetW !== null
        ? Math.round(storageTargetW - storageActualW)
        : null;
    const storageResponsePending = storagePendingDeltaW !== null
        && Math.abs(storagePendingDeltaW) > responseDeadbandW;
    const responseWithinGrace = !storageResponsePending || responseAgeMs <= responseGraceMs;
    const storageCommandCredited = nvpUsable
        && topology !== 'none'
        && storageActualFresh
        && storageTargetW !== null
        && storageWriteAccepted
        && responseWithinGrace;
    const acceptedFlexibleNetLoadDeltaW = Math.round(finiteOrNull(input.acceptedFlexibleNetLoadDeltaW) ?? 0);
    const acceptedFlexibleLoadDeltaW = Math.round(finiteOrNull(input.acceptedFlexibleLoadDeltaW) ?? 0);
    const acceptedFlexibleGenerationDeltaW = Math.round(finiteOrNull(input.acceptedFlexibleGenerationDeltaW) ?? 0);
    const acceptedFlexibleCreditedCount = Math.max(0, Math.round(finiteOrNull(input.acceptedFlexibleCreditedCount) ?? 0));
    const acceptedFlexibleUncertainCount = Math.max(0, Math.round(finiteOrNull(input.acceptedFlexibleUncertainCount) ?? 0));
    const acceptedFlexibleEffects = Array.isArray(input.acceptedFlexibleEffects) ? input.acceptedFlexibleEffects.slice(0, 100) : [];
    const projectedAfterStorageW = rawNvpW === null
        ? null
        : Math.round(rawNvpW - (storageCommandCredited ? (storagePendingDeltaW || 0) : 0));
    const projectedNvpW = projectedAfterStorageW === null
        ? null
        : Math.round(projectedAfterStorageW + acceptedFlexibleNetLoadDeltaW);
    const pvControlNvpW = projectedNvpW;
    const nvpErrorW = rawNvpW === null ? null : Math.round(rawNvpW - nvpTargetW);
    const projectedErrorW = projectedNvpW === null ? null : Math.round(projectedNvpW - nvpTargetW);
    const withinBand = rawNvpW !== null && Math.abs(rawNvpW - nvpTargetW) <= deadbandW;
    const projectedWithinBand = projectedNvpW !== null && Math.abs(projectedNvpW - nvpTargetW) <= deadbandW;
    let status = 'observing';
    let reason = 'NVP wird beobachtet';
    if (!nvpUsable) {
        status = 'stale';
        reason = 'NVP-Messwert fehlt, ist veraltet oder nicht verbunden';
    }
    else if (acceptedFlexibleUncertainCount > 0) {
        status = 'waiting-flexible-actuator';
        reason = 'Akzeptierter Aktorwechsel ohne sichere Leistungsprognose – PV wartet auf frischen NVP';
    }
    else if (noWriter) {
        status = withinBand ? 'stable' : 'observing';
        reason = withinBand ? 'NVP liegt ohne aktiven Speicherwriter im Zielband' : 'Kein aktiver Speicherwriter; PV-Regelung sieht den echten NVP';
    }
    else if (blocked) {
        status = 'storage-blocked';
        reason = storageWriteStatus || 'Speicherbefehl wurde durch ein Gate blockiert';
    }
    else if (writeFailed) {
        status = 'storage-write-failed';
        reason = storageWriteStatus || 'Speicherbefehl wurde nicht erfolgreich geschrieben';
    }
    else if (partial) {
        status = storageCommandCredited && storageResponsePending ? 'waiting-storage-response-partial' : 'storage-partial';
        reason = storageWriteStatus || 'Speicherfarm hat nur einen Teil der Anforderung akzeptiert';
    }
    else if (hold) {
        status = 'storage-hold';
        reason = storageWriteStatus || 'Speichervorgabe wird bewusst gehalten';
    }
    else if (storageCommandCredited && storageResponsePending) {
        status = 'waiting-storage-response';
        reason = `Speicherreaktion wird für maximal ${responseGraceMs} ms vorweggenommen`;
    }
    else if (storageWriteAccepted && storageResponsePending && !responseWithinGrace) {
        status = 'storage-response-timeout';
        reason = 'Speicher-Istleistung folgt dem Sollwert nicht innerhalb der Reaktionszeit';
    }
    else if (withinBand) {
        status = 'stable';
        reason = 'NVP liegt im Zielband';
    }
    else if (storageWriteAccepted) {
        status = 'correcting-storage';
        reason = 'Speicher/Farm regelt den NVP';
    }
    return {
        schema: 'nexowatt.nvp-coordinator.v1',
        ts: now,
        active: true,
        status,
        reason,
        nvpUsable,
        nvpSource: cleanText(input.nvpSource || '', 180),
        nvpMeasurementAgeMs: roundedOrNull(input.nvpMeasurementAgeMs),
        rawNvpW,
        nvpTargetW,
        deadbandW,
        nvpErrorW,
        projectedErrorW,
        topology,
        storageActualW,
        storageActualAgeMs,
        storageActualTrusted,
        storageActualFresh,
        storageTargetW,
        storageWriteOk: writeOk,
        storageCommandEffective: commandEffective,
        storageWriteAccepted,
        storageWriteFullyAccepted,
        storagePartial: partial,
        storagePartiallyAccepted: partial && storageWriteAccepted,
        storageRequestSatisfied: boolValue(input.storageRequestSatisfied, false),
        storageFailedW: roundedOrNull(input.storageFailedW),
        storageUnservedW: roundedOrNull(input.storageUnservedW),
        storageWriteStatus,
        storageNoWriter: noWriter,
        storageBlocked: blocked,
        storageHold: hold,
        storageWriteFailed: writeFailed,
        storagePendingDeltaW,
        storageResponsePending,
        storageResponseAgeMs: responseAgeMs,
        storageResponseGraceMs: responseGraceMs,
        storageResponseDeadbandW: responseDeadbandW,
        storageCommandCredited,
        acceptedFlexibleNetLoadDeltaW,
        acceptedFlexibleLoadDeltaW,
        acceptedFlexibleGenerationDeltaW,
        acceptedFlexibleCreditedCount,
        acceptedFlexibleUncertainCount,
        acceptedFlexibleEffects,
        projectedAfterStorageW,
        projectedNvpW,
        pvControlNvpW,
        withinBand,
        projectedWithinBand,
        stable: withinBand,
    };
}
class NvpCoordinatorModule extends BaseModule {
    constructor(adapter, dpRegistry, gridConstraintsModule, gridEnabledFn = null) {
        super(adapter, dpRegistry);
        this.adapter = adapter;
        this.dp = dpRegistry;
        this.gridConstraints = gridConstraintsModule || null;
        this.gridEnabledFn = typeof gridEnabledFn === 'function' ? gridEnabledFn : null;
        this._targetDirection = 0;
        this._responseSinceMs = 0;
        this._lastActualW = null;
        this._lastProgressMs = 0;
        this._lastLogMs = 0;
        this._lastLogSignature = '';
        this._log = [];
        this._cycle = 0;
    }
    async init() {
        await this.adapter.setObjectNotExistsAsync('ems', {
            type: 'channel', common: { name: 'EMS' }, native: {},
        });
        await this.adapter.setObjectNotExistsAsync('ems.nvpCoordinator', {
            type: 'channel', common: { name: 'NVP-Koordinator' }, native: {},
        });
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };
        await mk('ems.nvpCoordinator.active', 'NVP-Koordinator aktiv', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.status', 'NVP-Koordinator Status', 'string', 'text');
        await mk('ems.nvpCoordinator.reason', 'NVP-Koordinator Grund', 'string', 'text');
        await mk('ems.nvpCoordinator.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time');
        await mk('ems.nvpCoordinator.nvpSource', 'NVP-Quelle', 'string', 'text');
        await mk('ems.nvpCoordinator.nvpMeasurementAgeMs', 'NVP-Messwertalter (ms)', 'number', 'value.interval');
        await mk('ems.nvpCoordinator.nvpRawW', 'NVP RAW (+ Bezug / - Einspeisung)', 'number', 'value.power');
        await mk('ems.nvpCoordinator.nvpTargetW', 'NVP-Zielbezug', 'number', 'value.power');
        await mk('ems.nvpCoordinator.deadbandW', 'NVP-Toleranzband', 'number', 'value.power');
        await mk('ems.nvpCoordinator.nvpErrorW', 'NVP-Regelfehler', 'number', 'value.power');
        await mk('ems.nvpCoordinator.storageTopology', 'Ausgewählte Speichertopologie', 'string', 'text');
        await mk('ems.nvpCoordinator.storageActualW', 'Speicher/Farm Istleistung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.storageRequestedTargetW', 'Speicher/Farm angeforderte Sollleistung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.storageTargetW', 'Speicher/Farm von Writes akzeptierte Sollleistung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.storageWriteOk', 'Speicher-Write vollständig erfolgreich', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.storageWriteAccepted', 'Mindestens ein wirksamer Speicherbefehl akzeptiert', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.storageWriteFullyAccepted', 'Speicheranforderung vollständig akzeptiert', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.storagePartiallyAccepted', 'Speicherfarm teilweise akzeptiert', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.storageFailedW', 'Speicherleistung wegen Write-Fehlern ausgefallen', 'number', 'value.power');
        await mk('ems.nvpCoordinator.storageUnservedW', 'Speicherleistung wegen Grenzen nicht verteilbar', 'number', 'value.power');
        await mk('ems.nvpCoordinator.storageWriteStatus', 'Speicher-Write Status', 'string', 'text');
        await mk('ems.nvpCoordinator.storageTargetAgeMs', 'Alter der ausstehenden Speicherreaktion', 'number', 'value.interval');
        await mk('ems.nvpCoordinator.storageCommandCredited', 'Speicherreaktion im NVP vorweggenommen', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.storagePendingDeltaW', 'Noch ausstehende Speicherleistungsänderung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.flexibleNetLoadDeltaW', 'Im selben Zyklus akzeptierte Netto-Laständerung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.flexibleLoadDeltaW', 'Im selben Zyklus akzeptierte Laständerung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.flexibleGenerationDeltaW', 'Im selben Zyklus akzeptierte Erzeugungsänderung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.flexibleCreditedCount', 'Sicher prognostizierte Aktoränderungen', 'number', 'value');
        await mk('ems.nvpCoordinator.flexibleUncertainCount', 'Akzeptierte Aktorwechsel ohne sichere Leistungsprognose', 'number', 'value');
        await mk('ems.nvpCoordinator.flexibleEffectsJson', 'Akzeptierte Aktorwirkungen im aktuellen EMS-Zyklus', 'string', 'json');
        await mk('ems.nvpCoordinator.projectedAfterStorageW', 'Prognostizierter NVP nach Speicherreaktion', 'number', 'value.power');
        await mk('ems.nvpCoordinator.projectedNvpW', 'Prognostizierter NVP nach allen akzeptierten Aktoränderungen', 'number', 'value.power');
        await mk('ems.nvpCoordinator.pvControlNvpW', 'NVP für nachgelagerte PV-Regelung', 'number', 'value.power');
        await mk('ems.nvpCoordinator.pvAction', 'PV-/WR-Aktion', 'string', 'text');
        await mk('ems.nvpCoordinator.pvMode', 'PV-/WR-Regelmodus', 'string', 'text');
        await mk('ems.nvpCoordinator.pvApplied', 'PV-/WR-Sollwert geschrieben', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.pvSetpointW', 'PV-/WR-Sollwert W', 'number', 'value.power');
        await mk('ems.nvpCoordinator.pvSetpointPct', 'PV-/WR-Sollwert Prozent', 'number', 'value.percent');
        await mk('ems.nvpCoordinator.withinBand', 'NVP im Zielband', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.stable', 'NVP-Regelung stabil', 'boolean', 'indicator');
        await mk('ems.nvpCoordinator.statusJson', 'NVP-/Speicher-/PV-Regelkette (JSON)', 'string', 'json');
        await mk('ems.nvpCoordinator.logJson', 'NVP-Stabilitätslog (Ringpuffer JSON)', 'string', 'json');
    }
    _config() {
        const root = this.adapter && this.adapter.config ? this.adapter.config : {};
        const cfg = root.nvpCoordinator && typeof root.nvpCoordinator === 'object' ? root.nvpCoordinator : {};
        const storage = root.storageControl && typeof root.storageControl === 'object'
            ? root.storageControl
            : (root.storage && typeof root.storage === 'object' ? root.storage : {});
        const staleSec = finiteOrNull(storage.staleTimeoutSec) ?? 30;
        return {
            responseGraceMs: clamp(Math.round((finiteOrNull(cfg.storageResponseGraceSec) ?? 5) * 1000), 0, 300000),
            responseDeadbandW: clamp(Math.round(finiteOrNull(cfg.storageResponseDeadbandW) ?? 150), 0, 10000),
            responseProgressW: clamp(Math.round(finiteOrNull(cfg.storageResponseProgressW) ?? 50), 10, 5000),
            actualMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.storageActualMaxAgeSec) ?? staleSec) * 1000), 1000, 600000),
            nvpMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.nvpMaxAgeSec) ?? Math.max(staleSec, 10)) * 1000), 1000, 600000),
            targetW: Math.max(0, Math.round(finiteOrNull(storage.selfTargetGridImportW) ?? 50)),
            deadbandW: clamp(Math.round(finiteOrNull(storage.selfDeadbandW) ?? 30), 0, 5000),
            hardRawGuardW: Math.max(0, Math.round(finiteOrNull(cfg.hardRawExportW) ?? 0)),
            logIntervalMs: clamp(Math.round((finiteOrNull(cfg.logIntervalSec) ?? 5) * 1000), 1000, 60000),
            logMaxEntries: clamp(Math.round(finiteOrNull(cfg.logMaxEntries) ?? 180), 20, 1000),
        };
    }
    async _readStates(ids) {
        const out = {};
        await Promise.all(ids.map(async (id) => {
            try {
                const state = await this.adapter.getStateAsync(id);
                out[id] = state ? state.val : null;
            }
            catch {
                out[id] = null;
            }
        }));
        return out;
    }
    _responseAge(now, topology, targetW, actualW, writeAccepted, cfg) {
        const direction = targetW === null ? 0 : (targetW > 0 ? 1 : (targetW < 0 ? -1 : 0));
        const pendingDelta = targetW !== null && actualW !== null ? targetW - actualW : 0;
        const pending = targetW !== null && actualW !== null && Math.abs(pendingDelta) > cfg.responseDeadbandW;
        if (!writeAccepted || topology === 'none' || !pending) {
            this._responseSinceMs = 0;
            this._targetDirection = direction;
            this._lastActualW = actualW;
            this._lastProgressMs = now;
            return 0;
        }
        if (!this._responseSinceMs || direction !== this._targetDirection) {
            this._responseSinceMs = now;
            this._lastProgressMs = now;
            this._targetDirection = direction;
            this._lastActualW = actualW;
            return 0;
        }
        if (actualW !== null && this._lastActualW !== null) {
            const movedW = actualW - this._lastActualW;
            const movingTowardTarget = Math.abs(movedW) >= cfg.responseProgressW
                && Math.sign(movedW) === Math.sign(pendingDelta);
            if (movingTowardTarget) {
                this._responseSinceMs = now;
                this._lastProgressMs = now;
            }
        }
        this._lastActualW = actualW;
        return Math.max(0, now - this._responseSinceMs);
    }
    _finalizeStatus(snapshot, pv) {
        const next = { ...snapshot };
        const pvAction = cleanText(pv && pv.action || '', 120);
        const pvApplied = boolValue(pv && pv.applied, false);
        const pvActiveAction = !!pvAction && ![
            'off', 'disabled', 'within_deadband', 'diagnostic_only', 'awaiting_installer_approval',
            'pvLimitW_release', 'pvLimitPct_release', 'group_release',
        ].includes(pvAction);
        // Fehler-, Warte- und Teilzustände werden niemals durch eine zufällig
        // momentan im Band liegende NVP-Messung als "stable" überschrieben.
        if (snapshot.status === 'observing' && (pvActiveAction || pvApplied)) {
            next.status = 'correcting-pv';
            next.reason = 'PV-/WR-Regelung bearbeitet die verbleibende Einspeisung';
            next.stable = false;
        }
        else {
            next.stable = snapshot.status === 'stable';
        }
        return next;
    }
    async tick() {
        const now = Date.now();
        const cfg = this._config();
        const nvp = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, now, cfg.nvpMaxAgeMs);
        const ids = [
            'speicher.regelung.topologie',
            'speicher.regelung.sollW',
            'speicher.regelung.acceptedSollW',
            'speicher.regelung.commandEffective',
            'speicher.regelung.schreibOk',
            'speicher.regelung.schreibStatus',
            'speicher.regelung.requestSatisfied',
            'speicher.regelung.partiallyAccepted',
            'speicher.regelung.farmStatus',
            'speicher.regelung.farmFailedW',
            'speicher.regelung.farmUnservedW',
            'speicher.regelung.batteryPowerFeedbackMeasuredW',
            'speicher.regelung.batteryPowerFeedbackAgeMs',
            'speicher.regelung.batteryPowerBalanceTrusted',
            'speicher.regelung.batteryPowerTrusted',
            'speicher.regelung.selfTargetGridImportW',
            'speicher.regelung.selfDeadbandW',
            'storageFarm.totalPowerW',
        ];
        const states = await this._readStates(ids);
        const topology = cleanText(states['speicher.regelung.topologie'] || 'none', 40).toLowerCase();
        const requestedTargetW = roundedOrNull(states['speicher.regelung.sollW']);
        const acceptedTargetW = roundedOrNull(states['speicher.regelung.acceptedSollW']);
        let actualW = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackMeasuredW']);
        if (actualW === null && topology === 'farm')
            actualW = roundedOrNull(states['storageFarm.totalPowerW']);
        const writeStatus = cleanText(states['speicher.regelung.schreibStatus'] || '', 260);
        const writeOk = boolValue(states['speicher.regelung.schreibOk'], false);
        const commandEffective = boolValue(states['speicher.regelung.commandEffective'], false);
        const writeStatusLower = writeStatus.toLowerCase();
        const retained = writeStatusLower === 'unverändert';
        const blocked = containsAny(writeStatusLower, ['blockiert', 'blocked', 'authority', 'konflikt', 'gesperrt', 'nicht-moeglich', 'nicht möglich', 'nicht moeglich']);
        const hold = containsAny(writeStatusLower, ['no-write', 'hold']);
        const acceptedForResponse = topology !== 'none' && !blocked && !hold && (commandEffective || writeOk || retained);
        // Fuer die NVP-Vorwegnahme zaehlt ausschliesslich die von den Hardware-Writes
        // akzeptierte Leistung. Nur fuer einen alten, aber nachweislich akzeptierten
        // Runtime-Zustand ohne acceptedSollW darf der Request als Migrationsfallback dienen.
        const targetW = acceptedTargetW !== null
            ? acceptedTargetW
            : (acceptedForResponse ? requestedTargetW : 0);
        const responseAgeMs = this._responseAge(now, topology, targetW, actualW, acceptedForResponse, cfg);
        const nvpTargetFromState = finiteOrNull(states['speicher.regelung.selfTargetGridImportW']);
        const deadbandFromState = finiteOrNull(states['speicher.regelung.selfDeadbandW']);
        const acceptedEffects = getAcceptedPowerEffectSnapshot(this.adapter);
        let snapshot = buildNvpCoordinatorSnapshot({
            now,
            nvpUsable: nvp.usable === true,
            rawNvpW: nvp.netW,
            nvpSource: nvp.source,
            nvpMeasurementAgeMs: nvp.measurementAgeMs,
            nvpTargetW: nvpTargetFromState ?? cfg.targetW,
            deadbandW: deadbandFromState ?? cfg.deadbandW,
            topology,
            storageActualW: actualW,
            storageActualAgeMs: roundedOrNull(states['speicher.regelung.batteryPowerFeedbackAgeMs']),
            storageActualTrusted: boolValue(states['speicher.regelung.batteryPowerBalanceTrusted'], false)
                || boolValue(states['speicher.regelung.batteryPowerTrusted'], false),
            storageTargetW: targetW,
            storageWriteOk: writeOk,
            storageCommandEffective: commandEffective,
            storageWriteStatus: writeStatus,
            storagePartiallyAccepted: boolValue(states['speicher.regelung.partiallyAccepted'], false),
            storageRequestSatisfied: boolValue(states['speicher.regelung.requestSatisfied'], false),
            storageFailedW: roundedOrNull(states['speicher.regelung.farmFailedW']),
            storageUnservedW: roundedOrNull(states['speicher.regelung.farmUnservedW']),
            responseAgeMs,
            responseGraceMs: cfg.responseGraceMs,
            responseDeadbandW: cfg.responseDeadbandW,
            actualMaxAgeMs: cfg.actualMaxAgeMs,
            acceptedFlexibleNetLoadDeltaW: acceptedEffects.netLoadDeltaW,
            acceptedFlexibleLoadDeltaW: acceptedEffects.loadDeltaW,
            acceptedFlexibleGenerationDeltaW: acceptedEffects.generationDeltaW,
            acceptedFlexibleCreditedCount: acceptedEffects.creditedEffectCount,
            acceptedFlexibleUncertainCount: acceptedEffects.uncertainEffectCount,
            acceptedFlexibleEffects: acceptedEffects.entries,
        });
        snapshot.storageRequestedTargetW = requestedTargetW;
        snapshot.storageAcceptedTargetW = targetW;
        let pvResult = null;
        const gridConstraints = this.gridConstraints;
        let gridRuntimeEnabled = true;
        if (this.gridEnabledFn) {
            try {
                gridRuntimeEnabled = this.gridEnabledFn() === true;
            }
            catch {
                gridRuntimeEnabled = false;
            }
        }
        const hardRawGuardTriggered = snapshot.nvpUsable
            && cfg.hardRawGuardW > 0
            && snapshot.rawNvpW !== null
            && snapshot.rawNvpW <= -cfg.hardRawGuardW;
        if (snapshot.acceptedFlexibleUncertainCount > 0 && !hardRawGuardTriggered) {
            pvResult = {
                action: 'deferred-flexible-actuator',
                applied: false,
                mode: 'wait-next-nvp',
                reason: 'accepted-unknown-power-transition',
            };
        }
        else if (gridRuntimeEnabled && gridConstraints && typeof gridConstraints.tickPostStorage === 'function') {
            this._cycle += 1;
            try {
                pvResult = await withActuatorShadowContext(this.adapter, {
                    owner: 'gridConstraints',
                    module: 'nvpCoordinator',
                    priority: priorityForOwner('gridConstraints'),
                    reason: 'nvp-coordinated-pv-residual',
                    cycleId: `nvp-${this._cycle}`,
                    leaseMs: 15000,
                }, () => gridConstraints.tickPostStorage({
                    rawNvpW: snapshot.rawNvpW,
                    pvControlNvpW: hardRawGuardTriggered ? snapshot.rawNvpW : snapshot.pvControlNvpW,
                    nvpUsable: snapshot.nvpUsable,
                    hardRawGuardW: cfg.hardRawGuardW,
                }));
            }
            catch (error) {
                pvResult = {
                    action: 'error',
                    applied: false,
                    error: error instanceof Error ? error.message : String(error),
                };
                if (this.adapter && this.adapter.log && typeof this.adapter.log.warn === 'function') {
                    this.adapter.log.warn(`[NvpCoordinator] PV-Nachregelung fehlgeschlagen: ${pvResult.error}`);
                }
            }
        }
        snapshot = this._finalizeStatus(snapshot, pvResult);
        snapshot.pv = {
            action: cleanText(pvResult && pvResult.action || '', 120),
            mode: cleanText(pvResult && pvResult.mode || '', 80),
            applied: boolValue(pvResult && pvResult.applied, false),
            setpointW: roundedOrNull(pvResult && pvResult.setpointW),
            setpointPct: finiteOrNull(pvResult && pvResult.setpointPct),
            rawGridW: roundedOrNull(pvResult && pvResult.rawGridW),
            controlGridW: roundedOrNull(pvResult && pvResult.controlGridW),
            controlExportW: roundedOrNull(pvResult && pvResult.controlExportW),
            error: cleanText(pvResult && pvResult.error || '', 220),
        };
        const logSignature = [
            snapshot.status,
            snapshot.topology,
            snapshot.storageWriteStatus,
            snapshot.storageCommandCredited,
            snapshot.pv.action,
            snapshot.pv.applied,
        ].join('|');
        const shouldLog = !this._lastLogMs
            || now - this._lastLogMs >= cfg.logIntervalMs
            || logSignature !== this._lastLogSignature;
        if (shouldLog) {
            this._lastLogMs = now;
            this._lastLogSignature = logSignature;
            this._log.push({
                ts: now,
                status: snapshot.status,
                reason: snapshot.reason,
                nvpW: snapshot.rawNvpW,
                targetW: snapshot.nvpTargetW,
                errorW: snapshot.nvpErrorW,
                topology: snapshot.topology,
                storageActualW: snapshot.storageActualW,
                storageTargetW: snapshot.storageTargetW,
                storageWriteOk: snapshot.storageWriteOk,
                storageWriteAccepted: snapshot.storageWriteAccepted,
                storageWriteFullyAccepted: snapshot.storageWriteFullyAccepted,
                storagePartiallyAccepted: snapshot.storagePartiallyAccepted,
                storageFailedW: snapshot.storageFailedW,
                storageUnservedW: snapshot.storageUnservedW,
                storageWriteStatus: snapshot.storageWriteStatus,
                storageCredited: snapshot.storageCommandCredited,
                flexibleNetLoadDeltaW: snapshot.acceptedFlexibleNetLoadDeltaW,
                flexibleLoadDeltaW: snapshot.acceptedFlexibleLoadDeltaW,
                flexibleGenerationDeltaW: snapshot.acceptedFlexibleGenerationDeltaW,
                flexibleCreditedCount: snapshot.acceptedFlexibleCreditedCount,
                flexibleUncertainCount: snapshot.acceptedFlexibleUncertainCount,
                projectedAfterStorageW: snapshot.projectedAfterStorageW,
                projectedNvpW: snapshot.projectedNvpW,
                pvControlNvpW: snapshot.pvControlNvpW,
                pvAction: snapshot.pv.action,
                pvApplied: snapshot.pv.applied,
                pvSetpointW: snapshot.pv.setpointW,
                pvSetpointPct: snapshot.pv.setpointPct,
                stable: snapshot.stable,
            });
            if (this._log.length > cfg.logMaxEntries)
                this._log.splice(0, this._log.length - cfg.logMaxEntries);
        }
        snapshot.log = this._log.slice();
        this.adapter._nvpCoordinatorSnapshot = snapshot;
        await this._setIfChanged('ems.nvpCoordinator.active', true);
        await this._setIfChanged('ems.nvpCoordinator.status', snapshot.status);
        await this._setIfChanged('ems.nvpCoordinator.reason', snapshot.reason);
        await this._setIfChanged('ems.nvpCoordinator.lastUpdate', now);
        await this._setIfChanged('ems.nvpCoordinator.nvpSource', snapshot.nvpSource);
        await this._setIfChanged('ems.nvpCoordinator.nvpMeasurementAgeMs', snapshot.nvpMeasurementAgeMs);
        await this._setIfChanged('ems.nvpCoordinator.nvpRawW', snapshot.rawNvpW);
        await this._setIfChanged('ems.nvpCoordinator.nvpTargetW', snapshot.nvpTargetW);
        await this._setIfChanged('ems.nvpCoordinator.deadbandW', snapshot.deadbandW);
        await this._setIfChanged('ems.nvpCoordinator.nvpErrorW', snapshot.nvpErrorW);
        await this._setIfChanged('ems.nvpCoordinator.storageTopology', snapshot.topology);
        await this._setIfChanged('ems.nvpCoordinator.storageActualW', snapshot.storageActualW);
        await this._setIfChanged('ems.nvpCoordinator.storageRequestedTargetW', snapshot.storageRequestedTargetW);
        await this._setIfChanged('ems.nvpCoordinator.storageTargetW', snapshot.storageTargetW);
        await this._setIfChanged('ems.nvpCoordinator.storageWriteOk', snapshot.storageWriteOk);
        await this._setIfChanged('ems.nvpCoordinator.storageWriteAccepted', snapshot.storageWriteAccepted);
        await this._setIfChanged('ems.nvpCoordinator.storageWriteFullyAccepted', snapshot.storageWriteFullyAccepted);
        await this._setIfChanged('ems.nvpCoordinator.storagePartiallyAccepted', snapshot.storagePartiallyAccepted);
        await this._setIfChanged('ems.nvpCoordinator.storageFailedW', snapshot.storageFailedW);
        await this._setIfChanged('ems.nvpCoordinator.storageUnservedW', snapshot.storageUnservedW);
        await this._setIfChanged('ems.nvpCoordinator.storageWriteStatus', snapshot.storageWriteStatus);
        await this._setIfChanged('ems.nvpCoordinator.storageTargetAgeMs', snapshot.storageResponseAgeMs);
        await this._setIfChanged('ems.nvpCoordinator.storageCommandCredited', snapshot.storageCommandCredited);
        await this._setIfChanged('ems.nvpCoordinator.storagePendingDeltaW', snapshot.storagePendingDeltaW);
        await this._setIfChanged('ems.nvpCoordinator.flexibleNetLoadDeltaW', snapshot.acceptedFlexibleNetLoadDeltaW);
        await this._setIfChanged('ems.nvpCoordinator.flexibleLoadDeltaW', snapshot.acceptedFlexibleLoadDeltaW);
        await this._setIfChanged('ems.nvpCoordinator.flexibleGenerationDeltaW', snapshot.acceptedFlexibleGenerationDeltaW);
        await this._setIfChanged('ems.nvpCoordinator.flexibleCreditedCount', snapshot.acceptedFlexibleCreditedCount);
        await this._setIfChanged('ems.nvpCoordinator.flexibleUncertainCount', snapshot.acceptedFlexibleUncertainCount);
        await this._setIfChanged('ems.nvpCoordinator.flexibleEffectsJson', JSON.stringify(snapshot.acceptedFlexibleEffects || []));
        await this._setIfChanged('ems.nvpCoordinator.projectedAfterStorageW', snapshot.projectedAfterStorageW);
        await this._setIfChanged('ems.nvpCoordinator.projectedNvpW', snapshot.projectedNvpW);
        await this._setIfChanged('ems.nvpCoordinator.pvControlNvpW', snapshot.pvControlNvpW);
        await this._setIfChanged('ems.nvpCoordinator.pvAction', snapshot.pv.action);
        await this._setIfChanged('ems.nvpCoordinator.pvMode', snapshot.pv.mode);
        await this._setIfChanged('ems.nvpCoordinator.pvApplied', snapshot.pv.applied);
        await this._setIfChanged('ems.nvpCoordinator.pvSetpointW', snapshot.pv.setpointW);
        await this._setIfChanged('ems.nvpCoordinator.pvSetpointPct', snapshot.pv.setpointPct);
        await this._setIfChanged('ems.nvpCoordinator.withinBand', snapshot.withinBand);
        await this._setIfChanged('ems.nvpCoordinator.stable', snapshot.stable);
        await this._setIfChanged('ems.nvpCoordinator.statusJson', JSON.stringify({ ...snapshot, log: undefined }));
        await this._setIfChanged('ems.nvpCoordinator.logJson', JSON.stringify(this._log));
    }
    async _setIfChanged(id, value) {
        const nextValue = value === undefined ? null : value;
        try {
            const current = await this.adapter.getStateAsync(id);
            if (current && current.val === nextValue)
                return;
            await this.adapter.setStateAsync(id, nextValue, true);
        }
        catch {
            // Diagnose darf den zentralen EMS-Tick nicht blockieren.
        }
    }
}
module.exports = {
    NvpCoordinatorModule,
    buildNvpCoordinatorSnapshot,
};
