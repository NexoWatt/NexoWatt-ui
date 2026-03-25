'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');

function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}

function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (n < minV) return minV;
    if (n > maxV) return maxV;
    return n;
}

function safeIdPart(s) {
    const v = String(s || '').trim();
    if (!v) return '';
    // Keep in sync with Charging-Management's toSafeIdPart()
    return v.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

function normalizeConsumerType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'wärmepumpe' || s === 'waermepumpe' || s === 'heatpump' || s === 'hp' || s === 'wp') return 'heatPump';
    if (s === 'heizstab' || s === 'heaterrod' || s === 'rod') return 'heatingRod';
    if (s === 'klima' || s === 'klimageraet' || s === 'klimagerät' || s === 'aircondition' || s === 'ac') return 'airCondition';
    if (s === 'speicher' || s === 'storage' || s === 'battery') return 'storage';
    return 'custom';
}

function normalizeControlType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'onoff' || s === 'on/off' || s === 'switch' || s === 'enable' || s === 'aus' || s === 'sperren') return 'onOff';
    return 'limitW';
}

function getGzf(nSteuVE) {
    const n = Math.max(1, Math.round(Number(nSteuVE) || 1));
    if (n <= 1) return 1;
    if (n === 2) return 0.8;
    if (n === 3) return 0.75;
    if (n === 4) return 0.7;
    if (n === 5) return 0.65;
    if (n === 6) return 0.6;
    if (n === 7) return 0.55;
    if (n === 8) return 0.5;
    return 0.45; // >=9
}

/**
 * §14a EnWG helper module.
 *
 * Goals:
 * - Provide a central, adapter-wide §14a state (active/mode)
 * - Compute minimum power distribution (Pmin,14a) for EMS mode
 * - Expose per-wallbox caps via adapter._para14a for Charging-Management
 * - Optionally write setpoints to additional "steuerbare Verbrauchseinrichtungen" (e.g. WP/Heizstab/Klima)
 */
class Para14aModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._loads = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        this._activeDpKey = '';
        this._emsSetpointDpKey = '';
        this._audit = {
            historyInstance: '',
            historyReady: false,
            retentionTargetDays: 730,
            eventSeq: 0,
            traceSeq: 0,
            sessionId: '',
            sessionStartedAt: 0,
            lastTraceAt: 0,
            lastControlSnapshot: null,
            lastControlSignature: '',
        };
    }

    _isEnabled() {
        return !!this.adapter?.config?.installerConfig?.para14a;
    }

    _getCfg() {
        const cfg = this.adapter?.config?.installerConfig || {};
        return cfg && typeof cfg === 'object' ? cfg : {};
    }

    async _setState(id, val, options = {}) {
        const force = !!options.force;
        const ts = Number(options.ts) || Date.now();
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (!force && prev === v) return false;
        this._stateCache.set(id, v);
        await this.adapter.setStateAsync(id, { val: v, ack: true, ts });
        try {
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue(id, v, ts);
            }
        } catch {
            // ignore
        }
        return true;
    }

    async _setStateIfChanged(id, val) {
        return this._setState(id, val, { force: false });
    }

    async _setStateForced(id, val, ts) {
        return this._setState(id, val, { force: true, ts });
    }

    _roundW(v, dflt = 0) {
        const n = Number(v);
        return Number.isFinite(n) ? Math.round(n) : dflt;
    }

    _limitJsonText(v, maxLen = 6000) {
        let s = '';
        try {
            s = (typeof v === 'string') ? v : JSON.stringify(v);
        } catch {
            s = '';
        }
        if (!maxLen || !Number.isFinite(maxLen) || maxLen < 256) maxLen = 6000;
        return s.length > maxLen ? `${s.slice(0, maxLen)}...` : s;
    }

    _getAdapterNumberFromCache(key, dflt = 0) {
        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const n = this.adapter._nwGetNumberFromCache(key);
                if (typeof n === 'number' && Number.isFinite(n)) return n;
            }
        } catch {
            // ignore
        }

        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[key] : null;
            const n = Number(rec && rec.value);
            if (Number.isFinite(n)) return n;
        } catch {
            // ignore
        }

        return dflt;
    }

    _newAuditSessionId(ts = Date.now()) {
        return `p14a-${Math.round(ts).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    _getAuditControlSignature(snapshot) {
        const s = snapshot && typeof snapshot === 'object' ? snapshot : {};
        return JSON.stringify({
            active: !!s.active,
            source: String(s.source || ''),
            mode: String(s.mode || ''),
            requestedTotalBudgetW: this._roundW(s.requestedTotalBudgetW, 0),
            effectiveEvcsCapW: this._roundW(s.effectiveEvcsCapW, 0),
            minPerDeviceW: this._roundW(s.minPerDeviceW, 0),
            pMinW: this._roundW(s.pMinW, 0),
            nSteuVE: Math.max(0, Math.round(num(s.nSteuVE, 0))),
            evcsCount: Math.max(0, Math.round(num(s.evcsCount, 0))),
        });
    }

    _buildAuditSnapshot(data) {
        const s = data && typeof data === 'object' ? data : {};
        const active = !!s.active;
        const failedConsumers = Array.isArray(s.failedConsumers)
            ? s.failedConsumers.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10)
            : [];

        return {
            active,
            source: String(s.source || ''),
            mode: String(s.mode || ''),
            requestedTotalBudgetW: active ? this._roundW(s.requestedTotalBudgetW, 0) : 0,
            effectiveEvcsCapW: active ? this._roundW(s.effectiveEvcsCapW, 0) : 0,
            minPerDeviceW: active ? this._roundW(s.minPerDeviceW, 0) : 0,
            pMinW: active ? this._roundW(s.pMinW, 0) : 0,
            nSteuVE: active ? Math.max(0, Math.round(num(s.nSteuVE, 0))) : 0,
            evcsCount: active ? Math.max(0, Math.round(num(s.evcsCount, 0))) : 0,
            evPowerW: this._roundW(s.evPowerW, 0),
            gridPowerW: this._roundW(s.gridPowerW, 0),
            consumerAppliedCount: Math.max(0, Math.round(num(s.consumerAppliedCount, 0))),
            consumerFailedCount: Math.max(0, Math.round(num(s.consumerFailedCount, 0))),
            consumerSkippedCount: Math.max(0, Math.round(num(s.consumerSkippedCount, 0))),
            consumerWriteFailedCount: Math.max(0, Math.round(num(s.consumerWriteFailedCount, 0))),
            failedConsumers,
        };
    }

    _getAuditChangeReason(prev, next, fallback = 'update') {
        const p = prev && typeof prev === 'object' ? prev : null;
        const n = next && typeof next === 'object' ? next : {};

        if (!p) return fallback;
        if (!p.active && n.active) return 'activate';
        if (p.active && !n.active) return 'release';

        const reasons = [];
        if (p.source !== n.source) reasons.push('source');
        if (p.mode !== n.mode) reasons.push('mode');
        if (p.requestedTotalBudgetW !== n.requestedTotalBudgetW) reasons.push('budget');
        if (p.effectiveEvcsCapW !== n.effectiveEvcsCapW) reasons.push('evcs_cap');
        if (p.minPerDeviceW !== n.minPerDeviceW) reasons.push('min_per_device');
        if (p.pMinW !== n.pMinW) reasons.push('pmin');
        if (p.nSteuVE !== n.nSteuVE) reasons.push('nsteuve');
        if (p.evcsCount !== n.evcsCount) reasons.push('evcs_count');
        return reasons.length ? reasons.slice(0, 3).join('+') : fallback;
    }

    async _initAuditLoggingStates(mk) {
        await this.adapter.setObjectNotExistsAsync('para14a.audit', {
            type: 'channel',
            common: { name: '§14a Nachweislog' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('para14a.trace', {
            type: 'channel',
            common: { name: '§14a Verlauf' },
            native: {},
        });

        await mk('para14a.audit.historyEnabled', 'Historie/Influx erkannt', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyInstance', 'Historien-Instanz', 'string', 'text', false);
        await mk('para14a.audit.historyDedicated', 'Eigene §14a Influx-Instanz', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyAutoProvisioned', 'Separate Influx-Bereitstellung', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyProvisionState', 'Historien-Bindungsstatus', 'string', 'text', false);
        await mk('para14a.audit.historyProvisionError', 'Historien-Hinweis/Fehler', 'string', 'text', false);
        await mk('para14a.audit.retentionTargetDays', 'Retention-Ziel (Tage)', 'number', 'value.interval', false, 'd');
        await mk('para14a.audit.sessionActive', '§14a Sitzung aktiv', 'boolean', 'indicator', false);
        await mk('para14a.audit.currentSessionId', 'Aktuelle/letzte Sitzungs-ID', 'string', 'text', false);
        await mk('para14a.audit.eventSeq', 'Ereignis-Sequenz', 'number', 'value', false);
        await mk('para14a.audit.lastEventTs', 'Letztes Ereignis (ts)', 'number', 'value.time', false);
        await mk('para14a.audit.lastEventType', 'Letzter Ereignistyp', 'string', 'text', false);
        await mk('para14a.audit.lastReason', 'Letzter Grund', 'string', 'text', false);
        await mk('para14a.audit.lastSource', 'Letzte Quelle', 'string', 'text', false);
        await mk('para14a.audit.lastMode', 'Letzter Modus', 'string', 'text', false);
        await mk('para14a.audit.lastRequestedTotalBudgetW', 'Letztes Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastEffectiveEvcsCapW', 'Letztes EVCS-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastMinPerDeviceW', 'Letzte Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastPMinW', 'Letztes Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastNSteuVE', 'Letzte nSteuVE', 'number', 'value', false);
        await mk('para14a.audit.lastEvcsCount', 'Letzte EVCS-Anzahl', 'number', 'value', false);
        await mk('para14a.audit.lastEvPowerW', 'Letzte EV-Leistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastGridPowerW', 'Letzte Netzleistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastConsumerAppliedCount', 'Letzte erfolgreich angewendete Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerFailedCount', 'Letzte fehlgeschlagene Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerSkippedCount', 'Letzte übersprungene Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerWriteFailedCount', 'Letzte Schreibfehler Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastResult', 'Letztes Ergebnis', 'string', 'text', false);
        await mk('para14a.audit.lastJson', 'Letztes Ereignis (JSON)', 'string', 'json', false);

        await mk('para14a.trace.seq', 'Trace-Sequenz', 'number', 'value', false);
        await mk('para14a.trace.sampleTs', 'Trace-Zeitstempel', 'number', 'value.time', false);
        await mk('para14a.trace.active', '§14a aktiv', 'boolean', 'indicator', false);
        await mk('para14a.trace.sessionId', 'Sitzungs-ID', 'string', 'text', false);
        await mk('para14a.trace.source', 'Quelle', 'string', 'text', false);
        await mk('para14a.trace.mode', 'Modus', 'string', 'text', false);
        await mk('para14a.trace.requestedTotalBudgetW', 'Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.effectiveEvcsCapW', 'Effektives EVCS-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.pMinW', 'Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.nSteuVE', 'nSteuVE', 'number', 'value', false);
        await mk('para14a.trace.evcsCount', 'EVCS-Anzahl', 'number', 'value', false);
        await mk('para14a.trace.evPowerW', 'EV-Leistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.gridPowerW', 'Netzleistung (W)', 'number', 'value.power', false, 'W');
    }

    async _setupAuditHistory() {
        let historyInstance = '';
        let dedicatedHistory = false;
        let autoProvisioned = false;
        let provisionState = '';
        let provisionError = '';

        try {
            if (this.adapter && typeof this.adapter._nwEnsurePara14aInfluxInstance === 'function') {
                const historyInfo = await this.adapter._nwEnsurePara14aInfluxInstance();
                if (historyInfo && typeof historyInfo === 'object') {
                    historyInstance = String(historyInfo.instance || '').trim();
                    dedicatedHistory = historyInfo.dedicated === true;
                    autoProvisioned = historyInfo.autoProvisioned === true;
                    provisionState = String(historyInfo.provisionState || '').trim();
                    provisionError = String(historyInfo.provisionError || '').trim();
                }
            }
        } catch (e) {
            provisionState = provisionState || 'provision_error';
            provisionError = String(e?.message || e || '').trim();
        }

        if (!historyInstance) {
            try {
                if (this.adapter && typeof this.adapter._nwDetectInfluxInstance === 'function') {
                    historyInstance = String((await this.adapter._nwDetectInfluxInstance()) || '').trim();
                    if (historyInstance && !provisionState) provisionState = 'fallback_existing';
                }
            } catch {
                historyInstance = '';
            }
        }

        const historyReady = !!historyInstance && !!(this.adapter && typeof this.adapter._nwEnsureInfluxCustom === 'function');
        this._audit.historyInstance = historyInstance;
        this._audit.historyReady = historyReady;

        await this._setStateIfChanged('para14a.audit.historyEnabled', historyReady);
        await this._setStateIfChanged('para14a.audit.historyInstance', historyInstance);
        await this._setStateIfChanged('para14a.audit.historyDedicated', dedicatedHistory);
        await this._setStateIfChanged('para14a.audit.historyAutoProvisioned', autoProvisioned);
        await this._setStateIfChanged('para14a.audit.historyProvisionState', provisionState);
        await this._setStateIfChanged('para14a.audit.historyProvisionError', provisionError);
        await this._setStateIfChanged('para14a.audit.retentionTargetDays', this._audit.retentionTargetDays);

        if (!historyReady) return;

        const metaIds = [
            'para14a.audit.historyEnabled',
            'para14a.audit.historyInstance',
            'para14a.audit.historyDedicated',
            'para14a.audit.historyAutoProvisioned',
            'para14a.audit.historyProvisionState',
            'para14a.audit.historyProvisionError',
            'para14a.audit.retentionTargetDays',
        ];

        const eventIds = [
            'para14a.audit.sessionActive',
            'para14a.audit.currentSessionId',
            'para14a.audit.eventSeq',
            'para14a.audit.lastEventTs',
            'para14a.audit.lastEventType',
            'para14a.audit.lastReason',
            'para14a.audit.lastSource',
            'para14a.audit.lastMode',
            'para14a.audit.lastRequestedTotalBudgetW',
            'para14a.audit.lastEffectiveEvcsCapW',
            'para14a.audit.lastMinPerDeviceW',
            'para14a.audit.lastPMinW',
            'para14a.audit.lastNSteuVE',
            'para14a.audit.lastEvcsCount',
            'para14a.audit.lastEvPowerW',
            'para14a.audit.lastGridPowerW',
            'para14a.audit.lastConsumerAppliedCount',
            'para14a.audit.lastConsumerFailedCount',
            'para14a.audit.lastConsumerSkippedCount',
            'para14a.audit.lastConsumerWriteFailedCount',
            'para14a.audit.lastResult',
        ];

        const traceIds = [
            'para14a.trace.seq',
            'para14a.trace.sampleTs',
            'para14a.trace.active',
            'para14a.trace.sessionId',
            'para14a.trace.source',
            'para14a.trace.mode',
            'para14a.trace.requestedTotalBudgetW',
            'para14a.trace.effectiveEvcsCapW',
            'para14a.trace.minPerDeviceW',
            'para14a.trace.pMinW',
            'para14a.trace.nSteuVE',
            'para14a.trace.evcsCount',
            'para14a.trace.evPowerW',
            'para14a.trace.gridPowerW',
        ];

        for (const id of metaIds) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: true });
        }
        for (const id of [...eventIds, ...traceIds]) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: false });
        }
    }

    async _emitAuditEvent(snapshot, eventType, reason, result) {
        const ts = Date.now();
        const eventSeq = Math.max(1, Math.round(num(this._audit.eventSeq, 0)) + 1);
        this._audit.eventSeq = eventSeq;

        const payload = {
            seq: eventSeq,
            ts,
            eventType,
            reason,
            result,
            sessionId: this._audit.sessionId || '',
            active: !!snapshot.active,
            source: String(snapshot.source || ''),
            mode: String(snapshot.mode || ''),
            requestedTotalBudgetW: this._roundW(snapshot.requestedTotalBudgetW, 0),
            effectiveEvcsCapW: this._roundW(snapshot.effectiveEvcsCapW, 0),
            minPerDeviceW: this._roundW(snapshot.minPerDeviceW, 0),
            pMinW: this._roundW(snapshot.pMinW, 0),
            nSteuVE: Math.max(0, Math.round(num(snapshot.nSteuVE, 0))),
            evcsCount: Math.max(0, Math.round(num(snapshot.evcsCount, 0))),
            evPowerW: this._roundW(snapshot.evPowerW, 0),
            gridPowerW: this._roundW(snapshot.gridPowerW, 0),
            consumerAppliedCount: Math.max(0, Math.round(num(snapshot.consumerAppliedCount, 0))),
            consumerFailedCount: Math.max(0, Math.round(num(snapshot.consumerFailedCount, 0))),
            consumerSkippedCount: Math.max(0, Math.round(num(snapshot.consumerSkippedCount, 0))),
            consumerWriteFailedCount: Math.max(0, Math.round(num(snapshot.consumerWriteFailedCount, 0))),
            failedConsumers: Array.isArray(snapshot.failedConsumers) ? snapshot.failedConsumers.slice(0, 10) : [],
        };

        await this._setStateForced('para14a.audit.sessionActive', !!payload.active, ts);
        await this._setStateForced('para14a.audit.currentSessionId', payload.sessionId, ts);
        await this._setStateForced('para14a.audit.eventSeq', payload.seq, ts);
        await this._setStateForced('para14a.audit.lastEventTs', payload.ts, ts);
        await this._setStateForced('para14a.audit.lastEventType', payload.eventType, ts);
        await this._setStateForced('para14a.audit.lastReason', payload.reason, ts);
        await this._setStateForced('para14a.audit.lastSource', payload.source, ts);
        await this._setStateForced('para14a.audit.lastMode', payload.mode, ts);
        await this._setStateForced('para14a.audit.lastRequestedTotalBudgetW', payload.requestedTotalBudgetW, ts);
        await this._setStateForced('para14a.audit.lastEffectiveEvcsCapW', payload.effectiveEvcsCapW, ts);
        await this._setStateForced('para14a.audit.lastMinPerDeviceW', payload.minPerDeviceW, ts);
        await this._setStateForced('para14a.audit.lastPMinW', payload.pMinW, ts);
        await this._setStateForced('para14a.audit.lastNSteuVE', payload.nSteuVE, ts);
        await this._setStateForced('para14a.audit.lastEvcsCount', payload.evcsCount, ts);
        await this._setStateForced('para14a.audit.lastEvPowerW', payload.evPowerW, ts);
        await this._setStateForced('para14a.audit.lastGridPowerW', payload.gridPowerW, ts);
        await this._setStateForced('para14a.audit.lastConsumerAppliedCount', payload.consumerAppliedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerFailedCount', payload.consumerFailedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerSkippedCount', payload.consumerSkippedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerWriteFailedCount', payload.consumerWriteFailedCount, ts);
        await this._setStateForced('para14a.audit.lastResult', payload.result, ts);
        await this._setStateForced('para14a.audit.lastJson', this._limitJsonText(payload, 7000), ts);

        try {
            if (this.adapter && this.adapter.log && typeof this.adapter.log.info === 'function') {
                this.adapter.log.info(`[§14a/audit] ${eventType} (${reason}) session=${payload.sessionId || '-'} cap=${payload.effectiveEvcsCapW}W budget=${payload.requestedTotalBudgetW}W result=${payload.result}`);
            }
        } catch {
            // ignore
        }
    }

    async _writeAuditTrace(snapshot, force = false) {
        const now = Date.now();
        const shouldWrite = !!force || (!!snapshot.active && (now - Number(this._audit.lastTraceAt || 0) >= 60000));
        if (!shouldWrite) return;

        this._audit.lastTraceAt = now;
        const seq = Math.max(1, Math.round(num(this._audit.traceSeq, 0)) + 1);
        this._audit.traceSeq = seq;

        const ts = now;
        await this._setStateForced('para14a.trace.seq', seq, ts);
        await this._setStateForced('para14a.trace.sampleTs', ts, ts);
        await this._setStateForced('para14a.trace.active', !!snapshot.active, ts);
        await this._setStateForced('para14a.trace.sessionId', this._audit.sessionId || '', ts);
        await this._setStateForced('para14a.trace.source', String(snapshot.source || ''), ts);
        await this._setStateForced('para14a.trace.mode', String(snapshot.mode || ''), ts);
        await this._setStateForced('para14a.trace.requestedTotalBudgetW', this._roundW(snapshot.requestedTotalBudgetW, 0), ts);
        await this._setStateForced('para14a.trace.effectiveEvcsCapW', this._roundW(snapshot.effectiveEvcsCapW, 0), ts);
        await this._setStateForced('para14a.trace.minPerDeviceW', this._roundW(snapshot.minPerDeviceW, 0), ts);
        await this._setStateForced('para14a.trace.pMinW', this._roundW(snapshot.pMinW, 0), ts);
        await this._setStateForced('para14a.trace.nSteuVE', Math.max(0, Math.round(num(snapshot.nSteuVE, 0))), ts);
        await this._setStateForced('para14a.trace.evcsCount', Math.max(0, Math.round(num(snapshot.evcsCount, 0))), ts);
        await this._setStateForced('para14a.trace.evPowerW', this._roundW(snapshot.evPowerW, 0), ts);
        await this._setStateForced('para14a.trace.gridPowerW', this._roundW(snapshot.gridPowerW, 0), ts);
    }

    async _handleAuditLogging(snapshot) {
        const prev = this._audit.lastControlSnapshot;
        const sig = this._getAuditControlSignature(snapshot);
        const prevSig = this._audit.lastControlSignature || '';

        let eventType = '';
        let reason = '';

        if (snapshot.active && !(prev && prev.active)) {
            this._audit.sessionId = this._newAuditSessionId();
            this._audit.sessionStartedAt = Date.now();
            eventType = 'activate';
            reason = this._getAuditChangeReason(prev, snapshot, 'activate');
        } else if (!snapshot.active && prev && prev.active) {
            eventType = 'release';
            reason = this._getAuditChangeReason(prev, snapshot, 'release');
        } else if (snapshot.active && sig !== prevSig) {
            if (!this._audit.sessionId) {
                this._audit.sessionId = this._newAuditSessionId();
                this._audit.sessionStartedAt = Date.now();
            }
            eventType = 'update';
            reason = this._getAuditChangeReason(prev, snapshot, 'update');
        }

        if (eventType) {
            const result = (eventType === 'release')
                ? 'released'
                : (snapshot.consumerFailedCount > 0 || snapshot.consumerWriteFailedCount > 0)
                    ? 'write_failed'
                    : (snapshot.consumerAppliedCount > 0 || snapshot.effectiveEvcsCapW > 0)
                        ? 'applied'
                        : 'ok';
            await this._emitAuditEvent(snapshot, eventType, reason, result);
            await this._writeAuditTrace(snapshot, true);
            if (eventType === 'release') {
                this._audit.sessionId = '';
                this._audit.sessionStartedAt = 0;
            }
        } else {
            await this._writeAuditTrace(snapshot, false);
        }

        this._audit.lastControlSnapshot = Object.assign({}, snapshot);
        this._audit.lastControlSignature = sig;
    }

    _buildLoadsFromConfig() {
        const cfg = this._getCfg();
        const rows = Array.isArray(cfg.para14aConsumers) ? cfg.para14aConsumers : [];

        /** @type {Array<any>} */
        const loads = [];
        const usedIds = new Set();

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i] || {};
            if (r.enabled === false) continue;

            const name = String(r.name || '').trim();
            const type = normalizeConsumerType(r.type);
            const ctrl = normalizeControlType(r.controlType);

            const setWId = String(r.setPowerWId || r.setWId || '').trim();
            const enableId = String(r.enableId || r.enableWriteId || '').trim();

            if (!setWId && !enableId) continue;

            const baseId = safeIdPart(r.key || name || `${type}_${i + 1}`) || `c${i + 1}`;
            let id = baseId;
            let n = 2;
            while (usedIds.has(id)) id = `${baseId}_${n++}`;
            usedIds.add(id);

            const installedPowerW = clamp(num(r.installedPowerW || r.powerW || r.ratedW || 0, 0), 0, 1e12);
            const priority = clamp(num(r.priority || 100, 100), 1, 999);

            loads.push({
                id,
                key: String(r.key || id),
                name: name || id,
                type,
                controlType: ctrl,
                installedPowerW,
                priority,
                setWId,
                enableId,
                // internal dp keys (filled in init)
                setWKey: '',
                enableKey: '',
            });
        }

        // deterministic: priority asc, then name
        loads.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._loads = loads;
    }

    async init() {
        // Create states always (even if the module is disabled) to make troubleshooting easier.
        await this.adapter.setObjectNotExistsAsync('para14a', {
            type: 'channel',
            common: { name: '§14a EnWG' },
            native: {},
        });

        const mk = async (id, name, type, role, writable = false, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!writable,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('para14a.active', '§14a aktiv (wirksam)', 'boolean', 'indicator', false);
        await mk('para14a.mode', '§14a Modus', 'string', 'text', false);
        await mk('para14a.controlSource', '§14a Quelle', 'string', 'text', false);
        await mk('para14a.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.nSteuVE', 'Anzahl steuerbare Verbrauchseinrichtungen (nSteuVE)', 'number', 'value', false);
        await mk('para14a.gzf', 'Gleichzeitigkeitsfaktor (GZF)', 'number', 'value', false);
        await mk('para14a.pMinW', 'Mindestleistung gesamt Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.emsSetpointW', 'Sollwert EMS (W) (optional)', 'number', 'value.power', false, 'W');
        await mk('para14a.evcsTotalCapW', 'EVCS Gesamtlimit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.debug', 'Debug (JSON)', 'string', 'text', false);
        await this._initAuditLoggingStates(mk);

        // Load config and upsert dp mappings
        this._buildLoadsFromConfig();

        const cfg = this._getCfg();

        // Optional activation datapoint
        const activeId = String(cfg.para14aActiveId || '').trim();
        if (activeId && this.dp) {
            this._activeDpKey = 'p14a.active';
            await this.dp.upsert({ key: this._activeDpKey, objectId: activeId, dataType: 'mixed', direction: 'in' });
        } else {
            this._activeDpKey = '';
        }

        // Optional EMS setpoint datapoint (total allowed max net power for all steuVE)
        const spId = String(cfg.para14aEmsSetpointWId || '').trim();
        if (spId && this.dp) {
            this._emsSetpointDpKey = 'p14a.emsSetpointW';
            await this.dp.upsert({ key: this._emsSetpointDpKey, objectId: spId, dataType: 'number', direction: 'in', unit: 'W' });
        } else {
            this._emsSetpointDpKey = '';
        }

        // Upsert datapoints for load actuation
        for (const l of this._loads) {
            const baseKey = `p14a.${l.id}`;
            try {
                if (l.setWId) {
                    const k = `${baseKey}.setW`;
                    await this.dp?.upsert({ key: k, objectId: l.setWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25 });
                    l.setWKey = k;
                }
                if (l.enableId) {
                    const k = `${baseKey}.enable`;
                    await this.dp?.upsert({ key: k, objectId: l.enableId, dataType: 'boolean', direction: 'out' });
                    l.enableKey = k;
                }

                // Visible states for last applied target
                await this.adapter.setObjectNotExistsAsync(`para14a.consumers.${l.id}`, {
                    type: 'channel',
                    common: { name: l.name },
                    native: {},
                });
                await mk(`para14a.consumers.${l.id}.type`, 'Typ', 'string', 'text', false);
                await mk(`para14a.consumers.${l.id}.targetW`, 'Sollwert (W)', 'number', 'value.power', false, 'W');
                await mk(`para14a.consumers.${l.id}.applied`, 'Angewendet', 'boolean', 'indicator', false);
                await mk(`para14a.consumers.${l.id}.status`, 'Status', 'string', 'text', false);
            } catch (e) {
                this.adapter.log.warn(`[§14a] datapoint init failed for '${l.name}': ${e?.message || e}`);
            }
        }

        await this._setupAuditHistory();
    }

    _readActiveSignal() {
        const cfg = this._getCfg();

        // Feature must be enabled.
        if (!cfg.para14a) return { active: false, source: 'disabled' };

        // If a dedicated activation datapoint is mapped, it takes precedence.
        if (this._activeDpKey && this.dp) {
            const raw = this.dp.getRaw(this._activeDpKey);
            if (raw === null || raw === undefined) return { active: false, source: 'dp_missing' };
            if (typeof raw === 'boolean') return { active: raw, source: 'dp' };
            if (typeof raw === 'number') return { active: raw !== 0, source: 'dp' };
            if (typeof raw === 'string') {
                const s = raw.trim().toLowerCase();
                if (s === '' || s === '0' || s === 'false' || s === 'off' || s === 'inactive') return { active: false, source: 'dp' };
                if (s === '1' || s === 'true' || s === 'on' || s === 'active') return { active: true, source: 'dp' };
            }
            // fallback: truthy
            return { active: !!raw, source: 'dp' };
        }

        // No activation DP configured.
        // Default: assume inactive (no limitation) because we cannot know if the Netzbetreiber
        // is currently limiting. Optional fallback can force always-on behaviour.
        const assumeActive = !!cfg.para14aAssumeActiveWithoutSignal;
        return { active: assumeActive, source: assumeActive ? 'config' : 'no_signal' };
    }

    _computeDistribution({ mode, minPerDeviceW, evcsCount, hasWP, hasKlima, pSumWP, pSumKlima, externalTotalSetpointW }) {
        const baseW = Math.max(0, minPerDeviceW);
        const nSteuVE = Math.max(0, Math.round(evcsCount)) + (hasWP ? 1 : 0) + (hasKlima ? 1 : 0);
        const n = Math.max(1, nSteuVE);
        const gzf = getGzf(n);

        const big = (pSumWP > 11000) || (pSumKlima > 11000);
        const primaryW = (mode === 'ems' && big)
            ? Math.max(0, Math.max(0.4 * pSumWP, 0.4 * pSumKlima))
            : baseW;

        const secondaryW = (n > 1) ? (gzf * baseW) : 0;

        const pMinW = primaryW + (n - 1) * secondaryW;

        // In EMS mode, a Netzbetreiber/Steuerbox may provide an explicit total setpoint.
        // If present, we use it as the effective total budget. Otherwise we use the computed minimum.
        const totalBudgetW = (mode === 'ems' && typeof externalTotalSetpointW === 'number' && Number.isFinite(externalTotalSetpointW) && externalTotalSetpointW > 0)
            ? Math.max(0, externalTotalSetpointW)
            : pMinW;

        return { nSteuVE: n, gzf, pMinW, primaryW, secondaryW, totalBudgetW };
    }

    async tick() {
        // Always keep adapter._para14a up to date, so other modules can safely read it.
        if (!this.adapter) return;

        const cfg = this._getCfg();
        const { active, source } = this._readActiveSignal();

        const modeRaw = String(cfg.para14aMode || cfg.para14aControlMode || 'direct').trim().toLowerCase();
        const mode = (modeRaw === 'ems' || modeRaw === 'formula') ? 'ems' : 'direct';

        const minPerDeviceW = clamp(num(cfg.para14aMinPerDeviceW, 4200), 0, 1e12);

        // EVCS are always part of §14a (Fallgruppe 2.4.1.a)
        const evcsList = Array.isArray(this.adapter.evcsList) ? this.adapter.evcsList : [];
        const controllableEvcs = evcsList.filter(wb => wb && (String(wb.setCurrentAId || '').trim() || String(wb.setPowerWId || '').trim()));
        const evcsCount = controllableEvcs.length;

        // Additional consumers from table
        const hpRows = this._loads.filter(l => l.type === 'heatPump' || l.type === 'heatingRod');
        const klimaRows = this._loads.filter(l => l.type === 'airCondition');
        const hasWP = hpRows.length > 0;
        const hasKlima = klimaRows.length > 0;
        const pSumWP = hpRows.reduce((s, r) => s + num(r.installedPowerW, 0), 0);
        const pSumKlima = klimaRows.reduce((s, r) => s + num(r.installedPowerW, 0), 0);

        // Optional external EMS setpoint (W)
        const externalTotalSetpointW = (active && mode === 'ems' && this._emsSetpointDpKey && this.dp)
            ? this.dp.getNumber(this._emsSetpointDpKey, null)
            : null;

        const dist = this._computeDistribution({
            mode,
            minPerDeviceW,
            evcsCount,
            hasWP,
            hasKlima,
            pSumWP,
            pSumKlima,
            externalTotalSetpointW,
        });

        // Determine which group is primary (for EMS distribution)
        let primaryGroup = null;
        if (mode === 'ems') {
            const big = (pSumWP > 11000) || (pSumKlima > 11000);
            if (big) {
                primaryGroup = (0.4 * pSumWP >= 0.4 * pSumKlima) ? (hasWP ? 'wp' : (hasKlima ? 'klima' : 'evcs')) : (hasKlima ? 'klima' : (hasWP ? 'wp' : 'evcs'));
            } else {
                // Prefer heat pump for comfort, then climate, then EVCS
                primaryGroup = hasWP ? 'wp' : (hasKlima ? 'klima' : 'evcs');
            }
        }

        // Build EVCS caps
        /** @type {Record<string, number>} */
        const evcsCapsBySafe = {};
        let evcsTotalCapW = 0;

        if (active) {
            if (mode === 'direct') {
                // Direktansteuerung: 4,2kW je Verbraucher
                for (const wb of controllableEvcs) {
                    const safe = safeIdPart(wb.key || wb.name || wb.index || '');
                    const capW = minPerDeviceW > 0 ? minPerDeviceW : 0;
                    evcsCapsBySafe[safe] = capW;
                    evcsTotalCapW += capW;
                }
            } else {
                // EMS: allocate primaryW once, secondaryW for the remaining steuVE
                // EVCS are counted individually.
                const caps = [];
                for (let i = 0; i < controllableEvcs.length; i++) {
                    caps.push(dist.secondaryW);
                }
                // If EVCS is the primary group, promote the first EVCS to primaryW.
                if (primaryGroup === 'evcs' && caps.length) caps[0] = dist.primaryW;
                for (let i = 0; i < controllableEvcs.length; i++) {
                    const wb = controllableEvcs[i];
                    const safe = safeIdPart(wb.key || wb.name || wb.index || '');
                    const capW = clamp(num(caps[i], 0), 0, 1e12);
                    evcsCapsBySafe[safe] = capW;
                    evcsTotalCapW += capW;
                }
            }
        }

        // Persist adapter-wide snapshot for other modules (Charging-Management)
        this.adapter._para14a = {
            enabled: !!cfg.para14a,
            active: !!active,
            source,
            mode,
            minPerDeviceW,
            nSteuVE: dist.nSteuVE,
            gzf: dist.gzf,
            pMinW: dist.pMinW,
            totalBudgetW: dist.totalBudgetW,
            emsSetpointW: (typeof externalTotalSetpointW === 'number' && Number.isFinite(externalTotalSetpointW)) ? externalTotalSetpointW : 0,
            evcsCapsBySafe,
            evcsTotalCapW,
        };

        // Publish states
        await this._setStateIfChanged('para14a.active', !!active);
        await this._setStateIfChanged('para14a.mode', mode);
        await this._setStateIfChanged('para14a.controlSource', String(source || ''));
        await this._setStateIfChanged('para14a.minPerDeviceW', Math.round(minPerDeviceW));
        await this._setStateIfChanged('para14a.nSteuVE', dist.nSteuVE);
        await this._setStateIfChanged('para14a.gzf', dist.gzf);
        await this._setStateIfChanged('para14a.pMinW', Math.round(dist.pMinW));
        await this._setStateIfChanged('para14a.emsSetpointW', Math.round(num(externalTotalSetpointW, 0)));
        await this._setStateIfChanged('para14a.evcsTotalCapW', Math.round(evcsTotalCapW));

        // For non-EVCS consumers: write targets only when §14a is active; when inactive, restore to installed power (if provided).
        const debug = {
            active,
            source,
            mode,
            primaryGroup,
            evcsCount,
            hasWP,
            hasKlima,
            pSumWP,
            pSumKlima,
            dist,
        };

        const consumerAudit = {
            appliedCount: 0,
            failedCount: 0,
            skippedCount: 0,
            writeFailedCount: 0,
            failedConsumers: [],
        };

        // Group budgets for EMS mode
        let wpGroupBudgetW = 0;
        let klimaGroupBudgetW = 0;

        if (active && mode === 'ems') {
            // First determine how many non-EVCS groups we have and their default budgets
            const nonEvcsBudgets = [];
            if (hasWP) nonEvcsBudgets.push({ group: 'wp', budgetW: dist.secondaryW });
            if (hasKlima) nonEvcsBudgets.push({ group: 'klima', budgetW: dist.secondaryW });

            // Promote primary group if it is not EVCS
            if (primaryGroup === 'wp') {
                const e = nonEvcsBudgets.find(x => x.group === 'wp');
                if (e) e.budgetW = dist.primaryW;
            } else if (primaryGroup === 'klima') {
                const e = nonEvcsBudgets.find(x => x.group === 'klima');
                if (e) e.budgetW = dist.primaryW;
            }

            // Assign budgets
            wpGroupBudgetW = (nonEvcsBudgets.find(x => x.group === 'wp')?.budgetW) || 0;
            klimaGroupBudgetW = (nonEvcsBudgets.find(x => x.group === 'klima')?.budgetW) || 0;
        }

        // Direct-mode group budgets (Wärmepumpe/Klima > 11kW): use scaling factor * sum of connected power.
        // This follows the BNetzA minimum power rule for Fallgruppe 2.4.1.b / 2.4.1.c.
        const scalingFactor = 0.4;
        const wpGroupDirectW = (active && mode === 'direct' && pSumWP > 11000) ? Math.round(Math.max(minPerDeviceW, pSumWP * scalingFactor)) : Math.round(minPerDeviceW);
        const klimaGroupDirectW = (active && mode === 'direct' && pSumKlima > 11000) ? Math.round(Math.max(minPerDeviceW, pSumKlima * scalingFactor)) : Math.round(minPerDeviceW);

        for (const l of this._loads) {
            const base = `para14a.consumers.${l.id}`;
            await this._setStateIfChanged(`${base}.type`, l.type);

            // Determine target
            let targetW = 0;

            if (!active) {
                // restore
                if (l.controlType === 'limitW' && l.installedPowerW > 0) {
                    targetW = l.installedPowerW;
                } else {
                    // If we cannot restore deterministically, we do not write.
                    targetW = NaN;
                }
            } else if (mode === 'direct') {
                if (l.type === 'heatPump' || l.type === 'heatingRod') targetW = wpGroupDirectW;
                else if (l.type === 'airCondition') targetW = klimaGroupDirectW;
                else targetW = minPerDeviceW;
            } else {
                // EMS distribution
                if (l.type === 'heatPump' || l.type === 'heatingRod') targetW = wpGroupBudgetW;
                else if (l.type === 'airCondition') targetW = klimaGroupBudgetW;
                else targetW = dist.secondaryW;
            }

            // Clamp to installed
            if (active && l.installedPowerW > 0 && Number.isFinite(targetW)) {
                targetW = Math.min(targetW, l.installedPowerW);
            }

            // If this is a grouped category, distribute budget proportionally across group members.
            let perDeviceTargetW = targetW;
            if (active && (mode === 'ems' || mode === 'direct')) {
                if (l.type === 'heatPump' || l.type === 'heatingRod') {
                    const sum = hpRows.reduce((s, r) => s + (r.installedPowerW > 0 ? r.installedPowerW : 0), 0);
                    if (hpRows.length > 1 && sum > 0 && l.installedPowerW > 0) {
                        perDeviceTargetW = targetW * (l.installedPowerW / sum);
                    } else if (hpRows.length > 1) {
                        perDeviceTargetW = targetW / hpRows.length;
                    }
                } else if (l.type === 'airCondition') {
                    const sum = klimaRows.reduce((s, r) => s + (r.installedPowerW > 0 ? r.installedPowerW : 0), 0);
                    if (klimaRows.length > 1 && sum > 0 && l.installedPowerW > 0) {
                        perDeviceTargetW = targetW * (l.installedPowerW / sum);
                    } else if (klimaRows.length > 1) {
                        perDeviceTargetW = targetW / klimaRows.length;
                    }
                }
            }

            if (!Number.isFinite(perDeviceTargetW)) {
                // Skip writing (unknown restore)
                consumerAudit.skippedCount += 1;
                await this._setStateIfChanged(`${base}.targetW`, 0);
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'skipped');
                continue;
            }

            // Write
            const ctx = { dp: this.dp, adapter: this.adapter };
            const consumer = {
                type: 'load',
                key: l.id,
                name: l.name,
                setWKey: l.setWKey,
                enableKey: l.enableKey,
            };

            // onOff mode: interpret targetW > 0 => enabled, 0 => disabled
            const effectiveTargetW = (l.controlType === 'onOff') ? (active ? 0 : 1) : perDeviceTargetW;

            const res = await applySetpoint(ctx, consumer, { targetW: Math.round(effectiveTargetW) });
            const resStatus = String(res.status || '');
            if (res.applied && resStatus !== 'skipped') {
                consumerAudit.appliedCount += 1;
            } else if (!res.applied) {
                consumerAudit.failedCount += 1;
                if (resStatus === 'write_failed' || resStatus === 'applied_partial') consumerAudit.writeFailedCount += 1;
                if (consumerAudit.failedConsumers.length < 10) consumerAudit.failedConsumers.push(l.name || l.id);
            }
            await this._setStateIfChanged(`${base}.targetW`, Math.round(perDeviceTargetW > 0 ? perDeviceTargetW : 0));
            await this._setStateIfChanged(`${base}.applied`, !!res.applied);
            await this._setStateIfChanged(`${base}.status`, resStatus);
        }

        debug.consumerAudit = Object.assign({}, consumerAudit);

        try {
            await this._setStateIfChanged('para14a.debug', JSON.stringify(debug));
        } catch {
            // ignore
        }

        const auditSnapshot = this._buildAuditSnapshot({
            active,
            source,
            mode,
            requestedTotalBudgetW: dist.totalBudgetW,
            effectiveEvcsCapW: evcsTotalCapW,
            minPerDeviceW,
            pMinW: dist.pMinW,
            nSteuVE: dist.nSteuVE,
            evcsCount,
            evPowerW: this._getAdapterNumberFromCache('evcs.totalPowerW', 0),
            gridPowerW: this._getAdapterNumberFromCache('ems.gridPowerW', 0),
            consumerAppliedCount: consumerAudit.appliedCount,
            consumerFailedCount: consumerAudit.failedCount,
            consumerSkippedCount: consumerAudit.skippedCount,
            consumerWriteFailedCount: consumerAudit.writeFailedCount,
            failedConsumers: consumerAudit.failedConsumers,
        });
        await this._handleAuditLogging(auditSnapshot);
    }
}

module.exports = { Para14aModule };
