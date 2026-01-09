'use strict';

const { BaseModule } = require('./base');

function _num(v, defVal = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : defVal;
}
function _bool(v, defVal = false) {
    return (typeof v === 'boolean') ? v : !!defVal;
}
function _clamp(n, a, b) {
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
}

/**
 * BHKW Steuerung (Start/Stop, SoC-geführt).
 *
 * Ziel: robuste Grundlogik + Schnellsteuerung für VIS.
 * - Modus: auto | manual | off
 * - Auto: Start wenn SoC <= Start-Schwelle, Stop wenn SoC >= Stop-Schwelle
 * - Hysterese via getrennte Start/Stop-Schwellen + Mindestlaufzeit/Mindeststillstand
 * - Start/Stop per Write-Datenpunkt (puls oder level)
 *
 * Hinweis:
 * - Die eigentliche Geräteanbindung (z.B. Protokolle) ist nicht Teil dieses Moduls.
 *   Es werden nur gemappte Datenpunkte (Read/Write) genutzt.
 */
class BhkwControlModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this.devices = [];

        // runtime hysteresis + anti-spam
        /** @type {Map<string, {wasRunning: boolean|null, lastOnMs: number, lastOffMs: number, lastCmdMs: number, lastCmd: string}>} */
        this._rt = new Map();

        this._inited = false;
        this._MAX_DEV = 10;
    }

    async init() {
        await this._ensureObjects();
        await this._loadConfig();
        this._inited = true;
    }

    async _ensureObjects() {
        const mk = async (id, name, type, role, common = {}) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: Object.assign({ name, type, role, read: true, write: false }, common),
                native: {}
            });
        };
        const mkWritable = async (id, name, type, role, common = {}) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: Object.assign({ name, type, role, read: true, write: true }, common),
                native: {}
            });
        };

        const mkChan = async (id, name) => {
            await this.adapter.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
        };

        await mkChan('bhkw', 'BHKW');
        await mkChan('bhkw.devices', 'BHKW Geräte');
        await mkChan('bhkw.user', 'BHKW Benutzer');

        for (let i = 1; i <= this._MAX_DEV; i++) {
            const dBase = `bhkw.devices.b${i}`;
            const uBase = `bhkw.user.b${i}`;
            await mkChan(dBase, `BHKW ${i}`);
            await mkChan(uBase, `BHKW ${i} Bedienung`);

            await mk(`${dBase}.running`, 'Läuft', 'boolean', 'indicator.running');
            await mk(`${dBase}.powerW`, 'Leistung (W)', 'number', 'value.power');
            await mk(`${dBase}.socPct`, 'SoC (%)', 'number', 'value.battery');
            await mk(`${dBase}.status`, 'Status', 'string', 'text');
            await mk(`${dBase}.reason`, 'Grund', 'string', 'text');
            await mk(`${dBase}.lastCommand`, 'Letzter Befehl', 'string', 'text');
            await mk(`${dBase}.lastCommandTs`, 'Letzter Befehl Zeitstempel', 'number', 'value.time');

            await mkWritable(`${uBase}.mode`, 'Modus (auto/manual/off)', 'string', 'text', { def: 'auto' });
            await mkWritable(`${uBase}.command`, 'Befehl (start/stop)', 'string', 'text', { def: '' });
        }
    }

    async _loadConfig() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.bhkw && typeof this.adapter.config.bhkw === 'object')
            ? this.adapter.config.bhkw
            : {};

        const list = Array.isArray(cfg.devices) ? cfg.devices : [];
        const used = new Set();
        const out = [];

        for (let i = 0; i < list.length; i++) {
            const it = list[i] || {};
            const idx = Math.max(1, Math.min(this._MAX_DEV, Math.round(_num(it.idx ?? it.index ?? (i + 1), i + 1))));
            if (used.has(idx)) continue;
            used.add(idx);

            const enabled = (typeof it.enabled === 'boolean') ? !!it.enabled : false;
            const name = String(it.name || '').trim() || `BHKW ${idx}`;

            const startWriteId = String(it.startWriteId || it.startObjectId || it.startId || '').trim();
            const stopWriteId = String(it.stopWriteId || it.stopObjectId || it.stopId || '').trim();
            const runningReadId = String(it.runningReadId || it.runningObjectId || it.runningId || '').trim();
            const powerReadId = String(it.powerReadId || it.powerObjectId || it.powerId || '').trim();

            const socStartPct = _clamp(_num(it.socStartPct, 25), 0, 100);
            const socStopPct = _clamp(_num(it.socStopPct, 60), 0, 100);
            const minRunMin = _clamp(_num(it.minRunMin, 10), 0, 1440);
            const minOffMin = _clamp(_num(it.minOffMin, 5), 0, 1440);
            const maxAgeSec = _clamp(_num(it.maxAgeSec, 30), 0, 3600);

            const cmdTypeRaw = String(it.commandType || it.cmdType || '').trim().toLowerCase();
            const commandType = (cmdTypeRaw === 'level') ? 'level' : 'pulse';
            const pulseMs = _clamp(Math.round(_num(it.pulseMs ?? it.pulseDurationMs, 800)), 50, 10000);

            const showInLive = (typeof it.showInLive === 'boolean') ? !!it.showInLive : true;
            const userCanControl = (typeof it.userCanControl === 'boolean') ? !!it.userCanControl : true;

            out.push({
                idx,
                id: `b${idx}`,
                enabled,
                name,
                showInLive,
                userCanControl,
                startWriteId,
                stopWriteId,
                runningReadId,
                powerReadId,
                socStartPct,
                socStopPct,
                minRunMin,
                minOffMin,
                maxAgeMs: Math.round(maxAgeSec * 1000),
                commandType,
                pulseMs,
            });
        }

        out.sort((a, b) => a.idx - b.idx);
        this.devices = out;

        // Register datapoints for reads (optional) so we can use dp-registry cache.
        if (this.dp) {
            for (const d of this.devices) {
                if (d.runningReadId) {
                    await this.dp.upsert({
                        key: `bhkw.${d.id}.running`,
                        name: `BHKW ${d.idx} Laufstatus`,
                        objectId: d.runningReadId,
                        dataType: 'boolean',
                        direction: 'in',
                        unit: '',
                        scale: 1,
                        offset: 0,
                        invert: false,
                        deadband: 0,
                        note: 'Optional'
                    });
                }
                if (d.powerReadId) {
                    await this.dp.upsert({
                        key: `bhkw.${d.id}.powerW`,
                        name: `BHKW ${d.idx} Leistung`,
                        objectId: d.powerReadId,
                        dataType: 'number',
                        direction: 'in',
                        unit: 'W',
                        scale: 1,
                        offset: 0,
                        invert: false,
                        deadband: 0,
                        note: 'Optional'
                    });
                }
            }
        }

        // Ensure mode defaults exist (do not overwrite user choice)
        for (const d of this.devices) {
            const uModeId = `bhkw.user.b${d.idx}.mode`;
            try {
                const st = await this.adapter.getStateAsync(uModeId);
                if (!st || st.val === null || st.val === undefined || st.val === '') {
                    await this.adapter.setStateAsync(uModeId, 'auto', true);
                    try { this.adapter.updateValue(uModeId, 'auto', Date.now()); } catch (_e) {}
                }
            } catch (_e) {}
        }
    }

    async _setIfChanged(id, val, ack = true) {
        try {
            const old = await this.adapter.getStateAsync(id);
            const oldVal = old ? old.val : undefined;
            const same = (oldVal === val) || (Number.isNaN(oldVal) && Number.isNaN(val));
            if (same) return;
        } catch (_e) {
            // ignore
        }
        try {
            await this.adapter.setStateAsync(id, val, ack);
            try { this.adapter.updateValue(id, val, Date.now()); } catch (_e2) {}
        } catch (_e) {
            // ignore
        }
    }

    _getRt(id) {
        const cur = this._rt.get(id);
        if (cur) return cur;
        const init = { wasRunning: null, lastOnMs: 0, lastOffMs: 0, lastCmdMs: 0, lastCmd: '' };
        this._rt.set(id, init);
        return init;
    }

    async _getSocPct() {
        // Prefer aggregated storage farm SoC (if enabled and present)
        try {
            if (this.adapter && this.adapter.config && this.adapter.config.enableStorageFarm) {
                const st = await this.adapter.getStateAsync('storageFarm.totalSoc');
                const v = st && st.val !== null && st.val !== undefined ? Number(st.val) : NaN;
                if (Number.isFinite(v)) return v;
            }
        } catch (_e) {}

        // Fallback to mapped storage SoC (st.socPct)
        if (this.dp) {
            try {
                const staleMs = 30_000;
                const v = this.dp.getNumberFresh('st.socPct', staleMs, null);
                if (typeof v === 'number') return v;
            } catch (_e) {}
        }
        return null;
    }

    _normalizeMode(v) {
        const s = String(v || '').trim().toLowerCase();
        if (s === 'manuell') return 'manual';
        if (s === 'aus') return 'off';
        if (['auto', 'manual', 'off'].includes(s)) return s;
        return 'auto';
    }

    async _pulseWrite(objectId, pulseMs) {
        if (!objectId) return false;
        try {
            await this.adapter.setForeignStateAsync(objectId, true, false);
            setTimeout(() => {
                this.adapter.setForeignStateAsync(objectId, false, false).catch(() => {});
            }, pulseMs);
            return true;
        } catch (e) {
            this.adapter.log.warn(`BHKW write failed for '${objectId}': ${e?.message || e}`);
            return false;
        }
    }

    async _levelWrite(objectId, value) {
        if (!objectId) return false;
        try {
            await this.adapter.setForeignStateAsync(objectId, value, false);
            return true;
        } catch (e) {
            this.adapter.log.warn(`BHKW write failed for '${objectId}': ${e?.message || e}`);
            return false;
        }
    }

    async _sendCommand(dev, cmd, reason) {
        const now = Date.now();
        const rt = this._getRt(dev.id);

        // anti-spam: at most one command per 5s
        if (rt.lastCmdMs && (now - rt.lastCmdMs) < 5000 && rt.lastCmd === cmd) return false;

        let ok = false;
        if (cmd === 'start') {
            if (dev.commandType === 'level') ok = await this._levelWrite(dev.startWriteId, true);
            else ok = await this._pulseWrite(dev.startWriteId, dev.pulseMs);
        } else if (cmd === 'stop') {
            if (dev.commandType === 'level') ok = await this._levelWrite(dev.stopWriteId, true);
            else ok = await this._pulseWrite(dev.stopWriteId, dev.pulseMs);
        }

        if (ok) {
            rt.lastCmdMs = now;
            rt.lastCmd = cmd;
            await this._setIfChanged(`bhkw.devices.b${dev.idx}.lastCommand`, cmd, true);
            await this._setIfChanged(`bhkw.devices.b${dev.idx}.lastCommandTs`, now, true);
            await this._setIfChanged(`bhkw.devices.b${dev.idx}.reason`, String(reason || ''), true);
        }
        return ok;
    }

    async tick() {
        if (!this._inited) return;
        if (!Array.isArray(this.devices) || !this.devices.length) return;

        const now = Date.now();
        const soc = await this._getSocPct();

        for (const dev of this.devices) {
            if (!dev || !dev.enabled) continue;

            const dBase = `bhkw.devices.b${dev.idx}`;
            const uBase = `bhkw.user.b${dev.idx}`;

            // Read running/power (optional)
            let running = null;
            let powerW = null;

            if (this.dp && dev.runningReadId) {
                const key = `bhkw.${dev.id}.running`;
                const stale = this.dp.isStale(key, dev.maxAgeMs);
                running = stale ? null : this.dp.getBoolean(key, null);
            }
            if (this.dp && dev.powerReadId) {
                const key = `bhkw.${dev.id}.powerW`;
                const stale = this.dp.isStale(key, dev.maxAgeMs);
                powerW = stale ? null : this.dp.getNumber(key, null);
            }

            // update runtime tracking (min on/off)
            const rt = this._getRt(dev.id);
            if (typeof running === 'boolean') {
                if (rt.wasRunning === null) {
                    rt.wasRunning = running;
                    if (running) rt.lastOnMs = now; else rt.lastOffMs = now;
                } else if (rt.wasRunning !== running) {
                    rt.wasRunning = running;
                    if (running) rt.lastOnMs = now; else rt.lastOffMs = now;
                }
            }

            // Publish readouts
            await this._setIfChanged(`${dBase}.running`, (typeof running === 'boolean') ? running : false, true);
            await this._setIfChanged(`${dBase}.powerW`, (typeof powerW === 'number' ? Math.round(powerW) : null), true);
            await this._setIfChanged(`${dBase}.socPct`, (typeof soc === 'number' ? Math.round(soc * 10) / 10 : null), true);

            // Mode
            let mode = 'auto';
            try {
                const st = await this.adapter.getStateAsync(`${uBase}.mode`);
                mode = this._normalizeMode(st && st.val !== undefined ? st.val : 'auto');
            } catch (_e) {
                mode = 'auto';
            }

            // Manual command request (from UI)
            let cmdReq = '';
            try {
                const st = await this.adapter.getStateAsync(`${uBase}.command`);
                cmdReq = String(st && st.val ? st.val : '').trim().toLowerCase();
            } catch (_e) {
                cmdReq = '';
            }

            // Execute manual commands only in manual mode
            if (cmdReq === 'start' || cmdReq === 'stop') {
                if (mode === 'manual') {
                    await this._sendCommand(dev, cmdReq, `manual:${cmdReq}`);
                    await this._setIfChanged(`${uBase}.command`, '', true);
                } else {
                    // clear stale request (ignored)
                    await this._setIfChanged(`${uBase}.command`, '', true);
                    await this._setIfChanged(`${dBase}.reason`, 'manual:ignored_not_manual', true);
                }
            }

            // Auto logic
            let status = '';
            let reason = '';

            const haveSoc = (typeof soc === 'number');
            const haveRunning = (typeof running === 'boolean');
            const canActuate = !!(dev.startWriteId && dev.stopWriteId);

            if (!canActuate) {
                status = 'Konfiguration unvollständig (Start/Stop Write fehlt)';
            } else if (mode === 'off') {
                status = 'Aus';
                if (haveRunning && running) {
                    // immediate stop request (best effort)
                    await this._sendCommand(dev, 'stop', 'off:stop');
                    reason = 'off:stop';
                }
            } else if (mode === 'manual') {
                status = 'Manuell';
                reason = 'manual';
            } else { // auto
                if (!haveSoc) {
                    status = 'Auto (SoC fehlt)';
                    reason = 'auto:no_soc';
                } else if (!haveRunning) {
                    status = 'Auto (Status fehlt)';
                    reason = 'auto:no_running';
                } else {
                    // Hysteresis via separate start/stop thresholds + min on/off
                    const startAt = Math.min(dev.socStartPct, dev.socStopPct);
                    const stopAt = Math.max(dev.socStartPct, dev.socStopPct);

                    const minRunMs = Math.round(dev.minRunMin * 60 * 1000);
                    const minOffMs = Math.round(dev.minOffMin * 60 * 1000);

                    const canStartByTime = (!rt.lastOffMs) ? true : ((now - rt.lastOffMs) >= minOffMs);
                    const canStopByTime = (!rt.lastOnMs) ? true : ((now - rt.lastOnMs) >= minRunMs);

                    if (!running && soc <= startAt) {
                        status = `Auto (Start bei ≤ ${startAt}%)`;
                        reason = 'auto:start_soc_low';
                        if (canStartByTime) {
                            await this._sendCommand(dev, 'start', reason);
                        } else {
                            reason = 'auto:start_blocked_min_off';
                        }
                    } else if (running && soc >= stopAt) {
                        status = `Auto (Stop bei ≥ ${stopAt}%)`;
                        reason = 'auto:stop_soc_high';
                        if (canStopByTime) {
                            await this._sendCommand(dev, 'stop', reason);
                        } else {
                            reason = 'auto:stop_blocked_min_run';
                        }
                    } else {
                        status = running ? 'Auto (läuft)' : 'Auto (bereit)';
                        reason = 'auto:idle';
                    }
                }
            }

            if (reason) await this._setIfChanged(`${dBase}.reason`, reason, true);
            await this._setIfChanged(`${dBase}.status`, status, true);
        }
    }
}

module.exports = { BhkwControlModule };
