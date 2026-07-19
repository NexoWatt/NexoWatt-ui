/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/tariff-status.ts
 * Quell-Hash: sha256:4ba68fea96e804ac13859e64a85b6ab82b3d357bfb7e1fb1e0a6b1a203fb2c9f
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/tariff-status.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/modules/tariff-status.js
 *
 * Finalisiert die sichtbare Tarif-/Speicherstatuskette erst nach der zentralen
 * Speicherregelung. Dadurch beschreibt `tarif.statusText` nicht mehr nur den
 * Tarifwunsch, sondern den tatsächlich freigegebenen Sollwert, das Write-Ergebnis
 * und – sofern frisch vorhanden – die reale Speicherleistung.
 */
'use strict';
const { BaseModule } = require('./base');
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
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const cleanText = (value, maxLen = 240) => {
    const text = String(value === undefined || value === null ? '' : value)
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= maxLen)
        return text;
    return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
};
const directionOf = (valueW, deadbandW = 0) => {
    const n = finiteOrNull(valueW);
    if (n === null)
        return 'unknown';
    const deadband = Math.max(0, Number(deadbandW) || 0);
    if (n > deadband)
        return 'discharge';
    if (n < -deadband)
        return 'charge';
    return 'idle';
};
const formatPower = (valueW) => {
    const n = roundedOrNull(valueW);
    if (n === null)
        return '—';
    return `${Math.abs(n)} W`;
};
const safeParseJson = (value, fallback = {}) => {
    if (value && typeof value === 'object')
        return value;
    if (typeof value !== 'string' || !value.trim())
        return fallback;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    }
    catch {
        return fallback;
    }
};
const containsAny = (value, terms) => {
    const text = String(value || '').toLowerCase();
    return terms.some((term) => text.includes(term));
};
const buildTariffBaseText = (tariff = {}) => {
    const tariffActive = boolValue(tariff.tarifAktiv, false);
    const netFeeActive = boolValue(tariff.netFeeEnabled, false) && String(tariff.netFeeMode || 'off').toLowerCase() !== 'off';
    const mode = Number(tariff.modus) === 2 ? 'Automatik' : (Number(tariff.modus) === 1 ? 'Manuell' : '');
    const stateRaw = String(tariff.state || '').toLowerCase();
    const state = stateRaw === 'guenstig'
        ? 'günstig'
        : (stateRaw === 'teuer'
            ? 'teuer'
            : (stateRaw === 'neutral'
                ? 'neutral'
                : (stateRaw === 'aus' ? 'aus' : 'unbekannt')));
    const price = finiteOrNull(tariff.preisAktuell);
    const priceText = price === null ? '—' : `${price.toFixed(3)} €/kWh`;
    const tariffText = tariffActive
        ? `Tarif${mode ? ` ${mode}` : ''} ${state} (${priceText})`
        : 'Tarif aus';
    return netFeeActive ? `Netzentgelt ${String(tariff.netFeeMode || '').toUpperCase()} | ${tariffText}` : tariffText;
};
const buildIntentReason = (tariff = {}, intentW = 0) => {
    const intentDirection = directionOf(intentW, 0);
    const tariffActive = boolValue(tariff.tarifAktiv, false);
    const netFeeActive = boolValue(tariff.netFeeEnabled, false) && String(tariff.netFeeMode || 'off').toLowerCase() !== 'off';
    const state = String(tariff.state || '').toLowerCase();
    if (!tariffActive && !netFeeActive)
        return 'Tarif und zeitvariables Netzentgelt sind aus';
    if (boolValue(tariff.dynamicTariffStale, false) && tariffActive && !netFeeActive)
        return 'Tarifdaten sind zu alt – keine neue Tarifaktion';
    if (!boolValue(tariff.storageWriterAvailable, true))
        return cleanText(tariff.storageAuthorityReason || 'Kein beschreibbarer Speicher-Ausgang');
    if (boolValue(tariff.gridImportPreferred, false)) {
        if (boolValue(tariff.storageFullHold, false))
            return 'Negativpreis aktiv, SoC-Ladeziel erreicht';
        if (intentDirection === 'charge')
            return 'Negativpreis aktiv – Speicher-Netzladen gewünscht';
        return 'Negativpreis aktiv – Speicher wartet';
    }
    if (boolValue(tariff.storageChargeBlockedByTime, false)) {
        const label = cleanText(tariff.storageChargeWindowLabel || '');
        return label
            ? `Speicher-Netzladen außerhalb des Zeitfensters (${label})`
            : 'Speicher-Netzladen außerhalb des Zeitfensters';
    }
    if (boolValue(tariff.storageFullHold, false))
        return 'SoC-Ladeziel erreicht';
    if (String(tariff.netFeeMode || '').toUpperCase() === 'HT')
        return 'HT – Eigenverbrauch und Entladung bleiben freigegeben';
    if (String(tariff.netFeeMode || '').toUpperCase() === 'NT' && intentDirection === 'charge')
        return 'NT – Speicherladen gewünscht';
    if (state === 'guenstig' && intentDirection === 'charge')
        return 'Günstiger Tarif – Speicherladen gewünscht';
    if (state === 'teuer' && intentDirection === 'discharge')
        return 'Teurer Tarif – Speicherentladung gewünscht';
    if (intentDirection === 'charge')
        return 'Tarif-/Netzentgelt-Policy fordert Laden';
    if (intentDirection === 'discharge')
        return 'Tarif-/Netzentgelt-Policy fordert Entladen';
    return 'Tarif-/Netzentgelt-Policy fordert Warten';
};
const buildIntentPart = (intentW, intentReason) => {
    const direction = directionOf(intentW, 0);
    if (direction === 'charge')
        return `Tarifwunsch Laden ${formatPower(intentW)}`;
    if (direction === 'discharge')
        return `Tarifwunsch Entladen ${formatPower(intentW)}`;
    return `Tarifwunsch Warten${intentReason ? ` (${cleanText(intentReason, 140)})` : ''}`;
};
/**
 * Reine Klassifikation der Tarif-/Speicherstatuskette. Sie wird separat exportiert,
 * damit die Feldfälle ohne ioBroker-Runtime reproduzierbar getestet werden können.
 */
function classifyTariffStorageStatus(input = {}) {
    const active = boolValue(input.active, false);
    const intentW = roundedOrNull(input.intentW) ?? 0;
    const requestW = roundedOrNull(input.requestW) ?? 0;
    const finalW = roundedOrNull(input.finalW) ?? 0;
    const topology = cleanText(input.topology || 'none', 40).toLowerCase() || 'none';
    const topologyReason = cleanText(input.topologyReason || '', 180);
    const writeStatus = cleanText(input.writeStatus || '', 220);
    const writeStatusLower = writeStatus.toLowerCase();
    const writeOk = boolValue(input.writeOk, false);
    const actualW = roundedOrNull(input.actualW);
    const actualAgeMs = roundedOrNull(input.actualAgeMs);
    const actualTrusted = boolValue(input.actualTrusted, false);
    const readbackDeadbandW = clamp(Math.round(Number(input.readbackDeadbandW) || 100), 0, 5000);
    const readbackGraceMs = clamp(Math.round(Number(input.readbackGraceMs) || 20000), 0, 300000);
    const readbackMaxAgeMs = clamp(Math.round(Number(input.readbackMaxAgeMs) || 30000), 1000, 600000);
    const targetAgeMs = Math.max(0, Math.round(Number(input.targetAgeMs) || 0));
    const finalDirection = directionOf(finalW, 0);
    const actualDirection = directionOf(actualW, readbackDeadbandW);
    const intentDirection = directionOf(intentW, 0);
    const noWriter = topology === 'none'
        || containsAny(writeStatusLower, ['deaktiviert', 'kein-aktiver-speicher-ausgang']);
    const blocked = !noWriter && (containsAny(writeStatusLower, [
        'blockiert',
        'blocked',
        'authority',
        'dp-zuordnung-konflikt',
        'zielrichtung-nicht-gemappt',
        'farm-nicht-moeglich',
        'nicht möglich',
        'nicht moeglich',
        'gesperrt',
    ])
        || boolValue(input.farmAuthorityBlocked, false));
    const hold = !noWriter && !blocked && containsAny(writeStatusLower, ['no-write', 'hold']);
    const retained = !noWriter && !blocked && writeStatusLower === 'unverändert';
    const writeAccepted = !noWriter && !blocked && !hold && (writeOk || retained);
    const writeFailed = !noWriter && !blocked && !hold && !writeAccepted;
    const feedbackFresh = actualW !== null
        && actualTrusted
        && (actualAgeMs === null || actualAgeMs <= readbackMaxAgeMs);
    let readbackStatus = 'not-evaluated';
    if (!feedbackFresh) {
        readbackStatus = 'no-fresh-feedback';
    }
    else if (finalDirection === 'charge') {
        if (actualDirection === 'charge')
            readbackStatus = 'confirmed-charging';
        else if (targetAgeMs < readbackGraceMs)
            readbackStatus = 'pending-charging';
        else if (actualDirection === 'idle')
            readbackStatus = 'no-charge-response';
        else
            readbackStatus = 'opposite-direction';
    }
    else if (finalDirection === 'discharge') {
        if (actualDirection === 'discharge')
            readbackStatus = 'confirmed-discharging';
        else if (targetAgeMs < readbackGraceMs)
            readbackStatus = 'pending-discharging';
        else if (actualDirection === 'idle')
            readbackStatus = 'no-discharge-response';
        else
            readbackStatus = 'opposite-direction';
    }
    else if (actualDirection === 'idle') {
        readbackStatus = 'confirmed-stop';
    }
    else if (targetAgeMs < readbackGraceMs) {
        readbackStatus = 'stop-pending';
    }
    else {
        readbackStatus = 'stop-not-reached';
    }
    let gateStatus = 'accepted';
    if (noWriter)
        gateStatus = 'no-writer';
    else if (blocked)
        gateStatus = 'blocked';
    else if (hold)
        gateStatus = 'hold';
    else if (writeFailed)
        gateStatus = 'write-failed';
    let status = 'inactive';
    if (active) {
        if (noWriter)
            status = 'no-writer';
        else if (blocked)
            status = 'blocked';
        else if (hold)
            status = 'hold';
        else if (writeFailed)
            status = 'write-failed';
        else if (finalDirection === 'charge') {
            if (readbackStatus === 'confirmed-charging')
                status = 'charging';
            else if (['no-charge-response', 'opposite-direction'].includes(readbackStatus))
                status = 'mismatch';
            else
                status = 'charge-requested';
        }
        else if (finalDirection === 'discharge') {
            if (readbackStatus === 'confirmed-discharging')
                status = 'discharging';
            else if (['no-discharge-response', 'opposite-direction'].includes(readbackStatus))
                status = 'mismatch';
            else
                status = 'discharge-requested';
        }
        else if (readbackStatus === 'confirmed-stop')
            status = 'waiting';
        else if (readbackStatus === 'stop-not-reached')
            status = 'stop-not-reached';
        else
            status = 'stop-requested';
    }
    const farmTargetW = roundedOrNull(input.farmTargetW);
    const farmDeliveredW = roundedOrNull(input.farmDeliveredW);
    const farmUnservedW = roundedOrNull(input.farmUnservedW);
    const farmPartial = topology === 'farm'
        && farmTargetW !== null
        && farmDeliveredW !== null
        && Math.abs(farmTargetW - farmDeliveredW) > Math.max(1, readbackDeadbandW);
    return {
        active,
        intentW,
        intentDirection,
        requestW,
        finalW,
        finalDirection,
        topology,
        topologyReason,
        writeOk,
        writeStatus,
        writeAccepted,
        writeFailed,
        gateStatus,
        actualW,
        actualDirection,
        actualAgeMs,
        actualTrusted,
        feedbackFresh,
        readbackStatus,
        readbackDeadbandW,
        readbackGraceMs,
        readbackMaxAgeMs,
        targetAgeMs,
        status,
        farmTargetW,
        farmDeliveredW,
        farmUnservedW,
        farmPartial,
    };
}
const buildEffectiveStorageText = (result, context = {}) => {
    const reason = cleanText(context.finalReason || context.requestReason || context.topologyReason || result.writeStatus, 180);
    const source = cleanText(context.finalSource || context.requestSource || '', 80);
    const detailParts = [];
    if (source)
        detailParts.push(`Quelle ${source}`);
    if (reason)
        detailParts.push(reason);
    const detail = detailParts.length ? `; ${detailParts.join(' – ')}` : '';
    if (result.status === 'no-writer') {
        return `kein aktiver beschreibbarer Speicher-Ausgang${result.topologyReason ? ` (${result.topologyReason})` : ''}`;
    }
    if (result.status === 'blocked') {
        return `Speicherbefehl blockiert${reason ? `: ${reason}` : (result.writeStatus ? `: ${result.writeStatus}` : '')}`;
    }
    if (result.status === 'hold') {
        return `Speichervorgabe wird bewusst gehalten${reason ? `: ${reason}` : ''}`;
    }
    if (result.status === 'write-failed') {
        return `Speicherbefehl nicht geschrieben${result.writeStatus ? ` (${result.writeStatus})` : ''}${reason ? `: ${reason}` : ''}`;
    }
    const farmSuffix = result.topology === 'farm' && result.farmTargetW !== null && result.farmDeliveredW !== null
        ? `; Farm-Dispatch ${formatPower(result.farmDeliveredW)} von ${formatPower(result.farmTargetW)}${result.farmUnservedW ? `, offen ${formatPower(result.farmUnservedW)}` : ''}`
        : '';
    if (result.finalDirection === 'charge') {
        if (result.readbackStatus === 'confirmed-charging') {
            return `Speicher lädt ${formatPower(result.actualW)} (Soll ${formatPower(result.finalW)}; Richtung bestätigt${detail})${farmSuffix}`;
        }
        if (result.readbackStatus === 'no-fresh-feedback') {
            return `Laden ${formatPower(result.finalW)} angefordert – keine frische Istwert-Rückmeldung${detail}${farmSuffix}`;
        }
        if (result.readbackStatus === 'pending-charging') {
            return `Laden ${formatPower(result.finalW)} angefordert – Rückmeldung ausstehend${detail}${farmSuffix}`;
        }
        return `Laden ${formatPower(result.finalW)} angefordert – Istwert ${result.actualW === null ? '—' : `${result.actualW} W`} bestätigt die Richtung nicht${detail}${farmSuffix}`;
    }
    if (result.finalDirection === 'discharge') {
        if (result.readbackStatus === 'confirmed-discharging') {
            return `Speicher entlädt ${formatPower(result.actualW)} (Soll ${formatPower(result.finalW)}; Richtung bestätigt${detail})${farmSuffix}`;
        }
        if (result.readbackStatus === 'no-fresh-feedback') {
            return `Entladen ${formatPower(result.finalW)} angefordert – keine frische Istwert-Rückmeldung${detail}${farmSuffix}`;
        }
        if (result.readbackStatus === 'pending-discharging') {
            return `Entladen ${formatPower(result.finalW)} angefordert – Rückmeldung ausstehend${detail}${farmSuffix}`;
        }
        return `Entladen ${formatPower(result.finalW)} angefordert – Istwert ${result.actualW === null ? '—' : `${result.actualW} W`} bestätigt die Richtung nicht${detail}${farmSuffix}`;
    }
    if (result.readbackStatus === 'confirmed-stop') {
        return `Speicher wartet/ruht (0 W bestätigt${detail})${farmSuffix}`;
    }
    if (result.readbackStatus === 'no-fresh-feedback') {
        return `Stopp/Warten (0 W) angefordert – keine frische Istwert-Rückmeldung${detail}${farmSuffix}`;
    }
    if (result.readbackStatus === 'stop-pending') {
        return `Stopp/Warten (0 W) angefordert – Istwert läuft noch aus${detail}${farmSuffix}`;
    }
    return `Stopp/Warten (0 W) angefordert – Istwert ${result.actualW === null ? '—' : `${result.actualW} W`} noch nicht gestoppt${detail}${farmSuffix}`;
};
class TariffStatusModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this.adapter = adapter;
        this.dp = dpRegistry;
        this._lastTargetSignature = '';
        this._targetSinceMs = 0;
    }
    async init() {
        await this.adapter.setObjectNotExistsAsync('tarif', {
            type: 'channel',
            common: { name: 'Tarif' },
            native: {},
        });
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };
        await mk('tarif.statusText', 'Tarif Status – tatsächliche Steuerkette', 'string', 'text');
        await mk('tarif.intentStatusText', 'Tarif Absicht – vor Resolver/Gates', 'string', 'text');
        await mk('tarif.intentSnapshotAgeMs', 'Alter des Tarif-Policy-Snapshots (ms)', 'number', 'value.interval');
        await mk('tarif.intentSnapshotFresh', 'Tarif-Policy-Snapshot frisch', 'boolean', 'indicator');
        await mk('tarif.speicherIntentW', 'Tarif Speicher-Absicht (W)', 'number', 'value.power');
        await mk('tarif.speicherIntentStatus', 'Tarif Speicher-Absicht Status', 'string', 'text');
        await mk('tarif.speicherIntentGrund', 'Tarif Speicher-Absicht Grund', 'string', 'text');
        await mk('tarif.speicherRequestW', 'Speicher Request vor finaler Begrenzung (W)', 'number', 'value.power');
        await mk('tarif.speicherRequestQuelle', 'Speicher Request Quelle', 'string', 'text');
        await mk('tarif.speicherRequestGrund', 'Speicher Request Grund', 'string', 'text');
        await mk('tarif.speicherFinalW', 'Wirksamer Speicher-Sollwert (W)', 'number', 'value.power');
        await mk('tarif.speicherFinalQuelle', 'Wirksamer Speicher-Sollwert Quelle', 'string', 'text');
        await mk('tarif.speicherFinalGrund', 'Wirksamer Speicher-Sollwert Grund', 'string', 'text');
        await mk('tarif.speicherTopologie', 'Wirksame Speicher-Topologie', 'string', 'text');
        await mk('tarif.speicherGateStatus', 'Speicher Gate-/Write-Klassifikation', 'string', 'text');
        await mk('tarif.speicherWriteOk', 'Speicher Write erfolgreich', 'boolean', 'indicator');
        await mk('tarif.speicherCommandEffective', 'Speicherbefehl wirksam/weiter gültig', 'boolean', 'indicator');
        await mk('tarif.speicherWriteStatus', 'Speicher Write Rohstatus', 'string', 'text');
        await mk('tarif.speicherReadbackW', 'Speicher Istleistung für Status (W)', 'number', 'value.power');
        await mk('tarif.speicherReadbackAgeMs', 'Alter Speicher-Istleistung (ms)', 'number', 'value.interval');
        await mk('tarif.speicherReadbackFresh', 'Speicher Istleistung frisch und vertrauenswürdig', 'boolean', 'indicator');
        await mk('tarif.speicherReadbackStatus', 'Speicher Readback Status', 'string', 'text');
        await mk('tarif.speicherStatus', 'Tatsächlicher Tarif-Speicherstatus', 'string', 'text');
        await mk('tarif.speicherFarmDeliveredW', 'Farm tatsächlich verteilter Sollwert (W)', 'number', 'value.power');
        await mk('tarif.speicherFarmUnservedW', 'Farm nicht verteilbarer Rest (W)', 'number', 'value.power');
        await mk('tarif.statusJson', 'Tarif-/Speicher-Steuerkette (JSON)', 'string', 'json');
    }
    _getStatusConfig() {
        const root = this.adapter && this.adapter.config ? this.adapter.config : {};
        const cfg = root && root.tariffStatus && typeof root.tariffStatus === 'object' ? root.tariffStatus : {};
        const storageCfg = root && root.storageControl && typeof root.storageControl === 'object'
            ? root.storageControl
            : (root && root.storage && typeof root.storage === 'object' ? root.storage : {});
        const fallbackStaleSec = finiteOrNull(storageCfg.staleTimeoutSec) ?? 30;
        return {
            intentMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.intentMaxAgeSec) ?? 5) * 1000), 1000, 60000),
            readbackDeadbandW: clamp(Math.round(finiteOrNull(cfg.readbackDeadbandW) ?? 100), 0, 5000),
            readbackGraceMs: clamp(Math.round((finiteOrNull(cfg.readbackGraceSec) ?? 20) * 1000), 0, 300000),
            readbackMaxAgeMs: clamp(Math.round((finiteOrNull(cfg.readbackMaxAgeSec) ?? fallbackStaleSec) * 1000), 1000, 600000),
        };
    }
    async _readValues(ids) {
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
    async tick() {
        try {
            const tariff = this.adapter && this.adapter._tarifVis && typeof this.adapter._tarifVis === 'object'
                ? { ...this.adapter._tarifVis }
                : {};
            const ids = [
                'tarif.aktiv',
                'speicher.regelung.topologie',
                'speicher.regelung.topologieGrund',
                'speicher.regelung.requestW',
                'speicher.regelung.requestQuelle',
                'speicher.regelung.requestGrund',
                'speicher.regelung.sollW',
                'speicher.regelung.quelle',
                'speicher.regelung.grund',
                'speicher.regelung.schreibOk',
                'speicher.regelung.schreibStatus',
                'speicher.regelung.batteryPowerFeedbackMeasuredW',
                'speicher.regelung.batteryPowerFeedbackAgeMs',
                'speicher.regelung.batteryPowerBalanceTrusted',
                'speicher.regelung.batteryPowerTrusted',
                'speicher.regelung.zeroWriteFirewallAction',
                'speicher.regelung.zeroWriteFirewallReason',
                'speicher.regelung.zeroWriteFirewallExplicitStop',
                'storageFarm.totalPowerW',
                'storageFarm.lastDispatchJson',
            ];
            const states = await this._readValues(ids);
            const now = Date.now();
            const statusCfg = this._getStatusConfig();
            const tariffSnapshotTs = roundedOrNull(tariff.ts);
            const tariffSnapshotAgeMs = tariffSnapshotTs === null ? null : Math.max(0, now - tariffSnapshotTs);
            const tariffSnapshotFresh = tariffSnapshotAgeMs !== null && tariffSnapshotAgeMs <= statusCfg.intentMaxAgeMs;
            const active = boolValue(tariff.aktiv, boolValue(states['tarif.aktiv'], false));
            const intentW = tariffSnapshotFresh ? (roundedOrNull(tariff.speicherSollW) ?? 0) : 0;
            const intentStatus = tariffSnapshotFresh
                ? cleanText(tariff.storageIntentStatus || directionOf(intentW, 0), 40)
                : (active ? 'stale' : 'inactive');
            const intentReason = tariffSnapshotFresh
                ? cleanText(tariff.storageIntentReason || buildIntentReason(tariff, intentW), 220)
                : (active ? 'Tarif-Policy-Snapshot ist veraltet – keine aktuelle Tarifabsicht' : 'Tarif und zeitvariables Netzentgelt sind aus');
            const intentStatusText = tariffSnapshotFresh ? cleanText(tariff.intentStatusText || '', 700) : '';
            const topology = cleanText(states['speicher.regelung.topologie'] || tariff.storageTopology || 'none', 40).toLowerCase();
            const topologyReason = cleanText(states['speicher.regelung.topologieGrund'] || tariff.storageAuthorityReason || '', 220);
            const requestW = roundedOrNull(states['speicher.regelung.requestW']) ?? 0;
            const requestSource = cleanText(states['speicher.regelung.requestQuelle'] || '', 100);
            const requestReason = cleanText(states['speicher.regelung.requestGrund'] || '', 260);
            const finalW = roundedOrNull(states['speicher.regelung.sollW']) ?? 0;
            const finalSource = cleanText(states['speicher.regelung.quelle'] || '', 100);
            const finalReason = cleanText(states['speicher.regelung.grund'] || '', 260);
            const writeOk = boolValue(states['speicher.regelung.schreibOk'], false);
            const writeStatus = cleanText(states['speicher.regelung.schreibStatus'] || '', 240);
            const zeroAction = cleanText(states['speicher.regelung.zeroWriteFirewallAction'] || '', 100);
            const zeroReason = cleanText(states['speicher.regelung.zeroWriteFirewallReason'] || '', 220);
            const zeroExplicitStop = boolValue(states['speicher.regelung.zeroWriteFirewallExplicitStop'], false);
            let actualW = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackMeasuredW']);
            if (actualW === null && topology === 'farm')
                actualW = roundedOrNull(states['storageFarm.totalPowerW']);
            const actualAgeMs = roundedOrNull(states['speicher.regelung.batteryPowerFeedbackAgeMs']);
            const actualTrusted = boolValue(states['speicher.regelung.batteryPowerBalanceTrusted'], false)
                || boolValue(states['speicher.regelung.batteryPowerTrusted'], false);
            const farmDispatch = safeParseJson(states['storageFarm.lastDispatchJson'], {});
            const farmDispatchTs = roundedOrNull(farmDispatch && farmDispatch.ts);
            const farmDispatchAgeMs = farmDispatchTs === null ? null : Math.max(0, now - farmDispatchTs);
            const farmDispatchFresh = topology === 'farm'
                && farmDispatchAgeMs !== null
                && farmDispatchAgeMs <= Math.max(5000, Math.min(30000, statusCfg.readbackMaxAgeMs));
            const rawFarmTargetW = roundedOrNull(farmDispatch && farmDispatch.targetW);
            const farmDispatchMatchesTarget = farmDispatchFresh
                && rawFarmTargetW !== null
                && Math.abs(rawFarmTargetW - finalW) <= 1;
            const farmTargetW = farmDispatchMatchesTarget ? rawFarmTargetW : null;
            const farmDeliveredW = farmDispatchMatchesTarget ? roundedOrNull(farmDispatch && farmDispatch.deliveredW) : null;
            const farmUnservedW = farmDispatchMatchesTarget ? roundedOrNull(farmDispatch && farmDispatch.unservedW) : null;
            const farmAuthorityBlocked = !!(farmDispatchMatchesTarget
                && Array.isArray(farmDispatch.results)
                && farmDispatch.results.some((row) => row && row.authorityBlocked === true));
            const writeStatusLower = writeStatus.toLowerCase();
            const commandPhase = writeOk || writeStatusLower === 'unverändert'
                ? 'effective'
                : (containsAny(writeStatusLower, ['no-write', 'hold'])
                    ? 'hold'
                    : (containsAny(writeStatusLower, ['blockiert', 'blocked', 'authority', 'konflikt', 'nicht-moeglich', 'nicht möglich', 'nicht moeglich', 'gesperrt'])
                        ? 'blocked'
                        : 'not-effective'));
            const targetSignature = `${topology}|${directionOf(finalW, 0)}|${commandPhase}`;
            if (targetSignature !== this._lastTargetSignature || !this._targetSinceMs) {
                this._lastTargetSignature = targetSignature;
                this._targetSinceMs = now;
            }
            const targetAgeMs = Math.max(0, now - this._targetSinceMs);
            const result = classifyTariffStorageStatus({
                active,
                intentW,
                requestW,
                finalW,
                topology,
                topologyReason,
                writeOk,
                writeStatus,
                actualW,
                actualAgeMs,
                actualTrusted,
                targetAgeMs,
                farmTargetW,
                farmDeliveredW,
                farmUnservedW,
                farmAuthorityBlocked,
                ...statusCfg,
            });
            const baseText = tariffSnapshotFresh ? buildTariffBaseText(tariff) : (active ? 'Tarifstatus veraltet' : 'Tarif aus');
            const intentPart = buildIntentPart(intentW, intentReason);
            const effectivePart = buildEffectiveStorageText(result, {
                finalSource,
                finalReason,
                requestSource,
                requestReason,
                topologyReason,
            });
            const statusText = active ? `${baseText}: ${intentPart} → ${effectivePart}` : '';
            await this._setIfChanged('tarif.intentStatusText', intentStatusText || (active ? `${baseText}: ${intentPart}` : ''));
            await this._setIfChanged('tarif.intentSnapshotAgeMs', tariffSnapshotAgeMs);
            await this._setIfChanged('tarif.intentSnapshotFresh', tariffSnapshotFresh);
            await this._setIfChanged('tarif.speicherIntentW', intentW);
            await this._setIfChanged('tarif.speicherIntentStatus', intentStatus);
            await this._setIfChanged('tarif.speicherIntentGrund', intentReason);
            await this._setIfChanged('tarif.speicherRequestW', requestW);
            await this._setIfChanged('tarif.speicherRequestQuelle', requestSource);
            await this._setIfChanged('tarif.speicherRequestGrund', requestReason);
            await this._setIfChanged('tarif.speicherFinalW', finalW);
            await this._setIfChanged('tarif.speicherFinalQuelle', finalSource);
            await this._setIfChanged('tarif.speicherFinalGrund', finalReason);
            await this._setIfChanged('tarif.speicherTopologie', topology);
            await this._setIfChanged('tarif.speicherGateStatus', result.gateStatus);
            await this._setIfChanged('tarif.speicherWriteOk', writeOk);
            await this._setIfChanged('tarif.speicherCommandEffective', result.writeAccepted);
            await this._setIfChanged('tarif.speicherWriteStatus', writeStatus);
            await this._setIfChanged('tarif.speicherReadbackW', actualW);
            await this._setIfChanged('tarif.speicherReadbackAgeMs', actualAgeMs);
            await this._setIfChanged('tarif.speicherReadbackFresh', result.feedbackFresh);
            await this._setIfChanged('tarif.speicherReadbackStatus', result.readbackStatus);
            await this._setIfChanged('tarif.speicherStatus', result.status);
            await this._setIfChanged('tarif.speicherFarmDeliveredW', farmDeliveredW);
            await this._setIfChanged('tarif.speicherFarmUnservedW', farmUnservedW);
            await this._setIfChanged('tarif.statusText', statusText);
            const statusJson = {
                ts: now,
                active,
                baseText,
                intent: {
                    snapshotTs: tariffSnapshotTs,
                    snapshotAgeMs: tariffSnapshotAgeMs,
                    snapshotFresh: tariffSnapshotFresh,
                    snapshotMaxAgeMs: statusCfg.intentMaxAgeMs,
                    targetW: intentW,
                    status: intentStatus,
                    reason: intentReason,
                    text: intentStatusText || (active ? `${baseText}: ${intentPart}` : ''),
                },
                resolver: {
                    requestW,
                    requestSource,
                    requestReason,
                    finalW,
                    finalSource,
                    finalReason,
                    topology,
                    topologyReason,
                },
                gate: {
                    status: result.gateStatus,
                    zeroWriteFirewallAction: zeroAction,
                    zeroWriteFirewallReason: zeroReason,
                    zeroWriteFirewallExplicitStop: zeroExplicitStop,
                },
                write: {
                    ok: writeOk,
                    commandEffective: result.writeAccepted,
                    status: writeStatus,
                },
                farm: topology === 'farm' ? {
                    dispatchTs: farmDispatchTs,
                    dispatchAgeMs: farmDispatchAgeMs,
                    dispatchFresh: farmDispatchFresh,
                    matchesFinalTarget: farmDispatchMatchesTarget,
                    targetW: farmTargetW,
                    deliveredW: farmDeliveredW,
                    unservedW: farmUnservedW,
                    partial: result.farmPartial,
                    authorityBlocked: farmAuthorityBlocked,
                } : null,
                readback: {
                    powerW: actualW,
                    ageMs: actualAgeMs,
                    trusted: actualTrusted,
                    fresh: result.feedbackFresh,
                    status: result.readbackStatus,
                    deadbandW: result.readbackDeadbandW,
                    graceMs: result.readbackGraceMs,
                    maxAgeMs: result.readbackMaxAgeMs,
                    targetAgeMs,
                },
                effective: {
                    status: result.status,
                    statusText,
                },
            };
            await this._setIfChanged('tarif.statusJson', JSON.stringify(statusJson));
            this.adapter._tariffStatus = statusJson;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (this.adapter && this.adapter.log && typeof this.adapter.log.warn === 'function') {
                this.adapter.log.warn(`[TariffStatus] Fehler in tick(): ${message}`);
            }
        }
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
            // Diagnose darf den EMS-Regelzyklus nicht blockieren.
        }
    }
}
module.exports = {
    TariffStatusModule,
    classifyTariffStorageStatus,
    buildTariffBaseText,
    buildIntentReason,
};
