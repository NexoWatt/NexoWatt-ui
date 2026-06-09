'use strict';

const { BaseModule } = require('./base');
const { ReasonCodes, reasonToGerman } = require('../reasons');

class SlidingWindow {
    constructor(maxSeconds) {
        this.maxSeconds = Math.max(1, Number(maxSeconds) || 30);
        /** @type {Array<{t:number, v:number}>} */
        this.samples = [];
    }

    setMaxSeconds(maxSeconds) {
        const s = Math.max(1, Number(maxSeconds) || 30);
        if (s !== this.maxSeconds) {
            this.maxSeconds = s;
            this.prune(Date.now());
        }
    }

    push(v, t = Date.now()) {
        if (!Number.isFinite(v)) return;
        this.samples.push({ t, v });
        this.prune(t);
    }

    prune(nowTs) {
        const cutoff = nowTs - this.maxSeconds * 1000;
        while (this.samples.length && this.samples[0].t < cutoff) {
            this.samples.shift();
        }
    }

    mean() {
        if (!this.samples.length) return null;
        let sum = 0;
        for (const s of this.samples) sum += s.v;
        return sum / this.samples.length;
    }

    max() {
        if (!this.samples.length) return null;
        let m = Number.NEGATIVE_INFINITY;
        for (const s of this.samples) {
            if (s.v > m) m = s.v;
        }
        return Number.isFinite(m) ? m : null;
    }

    count() {
        return this.samples.length;
    }
}

function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

const ATYPICAL_THRESHOLD_PERCENT_BY_VOLTAGE_LEVEL = Object.freeze({
    // §19 Abs. 2 S. 1 StromNEV / BNetzA-Leitfaden: Erheblichkeitsschwellen je Entnahmeebene.
    HOS: 5,
    HOSHS: 10,
    HS: 10,
    HSMS: 20,
    MS: 20,
    MSNS: 30,
    NS: 30,
});

function normalizeVoltageLevelKey(v) {
    return String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');
}

function atypicalThresholdPercent(voltageLevel, fallback = 20) {
    const key = normalizeVoltageLevelKey(voltageLevel);
    if (Object.prototype.hasOwnProperty.call(ATYPICAL_THRESHOLD_PERCENT_BY_VOLTAGE_LEVEL, key)) {
        return ATYPICAL_THRESHOLD_PERCENT_BY_VOLTAGE_LEVEL[key];
    }
    return fallback;
}

function isPeakShavingRuntimeEnabled(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    if (cfg.enablePeakShaving === true) return true;
    const ps = (cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};
    const atypical = (ps.atypical && typeof ps.atypical === 'object') ? ps.atypical : {};
    return atypical.enabled === true;
}

function parseHmToMinutes(value) {
    const s = String(value || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
}

function localYmd(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    const y = String(d.getFullYear()).padStart(4, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function normalizeYmd(value) {
    if (value instanceof Date) return localYmd(value);
    const s = String(value || '').trim();
    if (!s) return '';
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
        return `${String(m[1]).padStart(4, '0')}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : localYmd(d);
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (value === null || value === undefined || value === '') return [];
    return [value];
}

function toNumberArray(value) {
    const out = [];
    const seen = new Set();
    for (const item of asArray(value)) {
        const n = Number(item);
        if (!Number.isFinite(n)) continue;
        const r = Math.round(n);
        if (seen.has(r)) continue;
        seen.add(r);
        out.push(r);
    }
    return out;
}

function toDateSet(value) {
    const set = new Set();
    for (const item of asArray(value)) {
        let raw = item;
        if (item && typeof item === 'object' && !(item instanceof Date)) {
            raw = item.date || item.day || item.ymd || item.value || '';
        }
        const ymd = normalizeYmd(raw);
        if (ymd) set.add(ymd);
    }
    return set;
}

function isoWeekday(date) {
    const js = date.getDay();
    return js === 0 ? 7 : js;
}

function isChristmasNewYearPeriod(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return (month === 12 && day >= 24) || (month === 1 && day <= 1);
}


class PeakShavingModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        this._winPower = new SlidingWindow(10);
        this._winL1 = new SlidingWindow(10);
        this._winL2 = new SlidingWindow(10);
        this._winL3 = new SlidingWindow(10);

        this._status = 'inactive'; // inactive | pending_on | active | pending_off
        this._pendingSince = 0;
        this._activeSince = 0;

        /** @type {Map<string, {mode:string, phases:number, baseline:number|null, baselineEnabled:boolean|null}>} */
        this._baselines = new Map();
        this._wasActive = false;

        // Atypische Nachkontrolle: laufende Jahres-/HLZF-Maxima werden über States persistiert.
        this._atypicalReviewLoaded = false;
        this._atypicalReviewState = {
            resetIdentity: '',
            pAbsMaxW: 0,
            pHlzfMaxW: 0,
            lastUpdate: 0,
        };
    }

    _isEnabled() {
        return isPeakShavingRuntimeEnabled(this.adapter && this.adapter.config);
    }

    async init() {
        if (!this._isEnabled()) return;

        // Channels
        await this.adapter.setObjectNotExistsAsync('peakShaving', {
            type: 'channel',
            common: { name: 'Peak Shaving' },
            native: {},
        });

        for (const ch of ['measure', 'calc', 'control', 'dynamic', 'actuators', 'atypical', 'atypical.review']) {
            await this.adapter.setObjectNotExistsAsync(`peakShaving.${ch}`, {
                type: 'channel',
                common: { name: ch },
                native: {},
            });
        }

        // States (created lazily too, but create the core set)
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('peakShaving.control.active', 'Active', 'boolean', 'indicator');
        await mk('peakShaving.control.status', 'Status', 'string', 'text');
        await mk('peakShaving.control.reason', 'Reason (Code)', 'string', 'text');
        await mk('peakShaving.control.reasonText', 'Grund', 'string', 'text');
        await mk('peakShaving.control.limitW', 'Effective limit (W)', 'number', 'value.power');
        await mk('peakShaving.control.effectivePowerW', 'Effective power (W)', 'number', 'value.power');
        await mk('peakShaving.control.overW', 'Over limit (W)', 'number', 'value.power');
        await mk('peakShaving.control.requiredReductionW', 'Required reduction (W)', 'number', 'value.power');
        await mk('peakShaving.control.requiredReductionA', 'Required reduction (A)', 'number', 'value.current');
        await mk('peakShaving.control.phaseViolation', 'Phase violation', 'boolean', 'indicator');
        await mk('peakShaving.control.worstPhase', 'Worst phase', 'string', 'text');
        await mk('peakShaving.control.worstPhaseOverA', 'Worst phase over (A)', 'number', 'value.current');
        await mk('peakShaving.control.lastUpdate', 'Last update', 'number', 'value.time');

        await mk('peakShaving.dynamic.allowedPowerW', 'Allowed power (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.reserveW', 'Reserve (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.effectiveLimitW', 'Dynamic effective limit (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.baseLoadW', 'Base load (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.pvW', 'PV power (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.batteryW', 'Battery power (W)', 'number', 'value.power');
        await mk('peakShaving.dynamic.availableForControlledW', 'Available for controlled loads (W)', 'number', 'value.power');

        await mk('peakShaving.calc.avgPowerW', 'Average power (W)', 'number', 'value.power');
        await mk('peakShaving.calc.samples', 'Samples', 'number', 'value');

        await mk('peakShaving.atypical.enabled', 'Atypische Spitzenkappung aktiviert', 'boolean', 'indicator');
        await mk('peakShaving.atypical.enforce', 'Atypische Spitzenkappung erzwingen', 'boolean', 'indicator');
        await mk('peakShaving.atypical.activeWindow', 'Aktives Hochlastzeitfenster', 'boolean', 'indicator');
        await mk('peakShaving.atypical.status', 'Atypische Spitzenkappung Status', 'string', 'text');
        await mk('peakShaving.atypical.windowLabel', 'Aktuelles Hochlastzeitfenster', 'string', 'text');
        await mk('peakShaving.atypical.voltageLevel', 'Entnahmeebene', 'string', 'text');
        await mk('peakShaving.atypical.thresholdPercent', 'Erheblichkeitsschwelle (%)', 'number', 'value');
        await mk('peakShaving.atypical.minShiftW', 'Mindestverlagerung (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.pAbsRefW', 'Referenz-Jahreshöchstlast P_abs_ref (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.targetLimitW', 'HLZF-Ziellast (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.effectiveLimitW', 'Wirksames HLZF-Limit nach Hybrid-Minimum (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.deltaW', 'Verlagerung gegenüber P_abs_ref (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.deltaPercent', 'Verlagerung gegenüber P_abs_ref (%)', 'number', 'value');
        await mk('peakShaving.atypical.eligiblePotential', '§19-Potenzial erfüllt Zielparameter', 'boolean', 'indicator');
        await mk('peakShaving.atypical.binding', 'Bindendes Limit / Quelle', 'string', 'text');
        await mk('peakShaving.atypical.gridOperator', 'Netzbetreiber Hochlastzeitfenster', 'string', 'text');
        await mk('peakShaving.atypical.year', 'Gültigkeitsjahr Hochlastzeitfenster', 'number', 'value');
        await mk('peakShaving.atypical.sourceDocument', 'HLZF Quelle / Dokument', 'string', 'text');
        await mk('peakShaving.atypical.sourcePublishedAt', 'HLZF Veröffentlichungsdatum', 'string', 'text');
        await mk('peakShaving.atypical.sourceUrl', 'HLZF Quell-URL / Ablage', 'string', 'text');
        await mk('peakShaving.atypical.sourceNote', 'HLZF Bemerkung', 'string', 'text');
        await mk('peakShaving.atypical.snapshotJson', 'Atypische Spitzenkappung Snapshot (JSON)', 'string', 'text');

        await mk('peakShaving.atypical.review.enabled', 'Nachkontrolle aktiv', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.status', 'Nachkontrolle Status', 'string', 'text');
        await mk('peakShaving.atypical.review.year', 'Nachkontrolle Jahr', 'number', 'value');
        await mk('peakShaving.atypical.review.resetIdentity', 'Nachkontrolle Reset-Identität', 'string', 'text');
        await mk('peakShaving.atypical.review.pAbsMaxW', 'Gemessene Jahreshöchstlast P_abs_max (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.pHlzfMaxW', 'Gemessene HLZF-Höchstlast P_HLZF_max (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.pAbsEvalW', 'Bewertete Jahreshöchstlast P_abs (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.pHlzfEvalW', 'Bewertete HLZF-Höchstlast P_HLZF (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.deltaW', 'Nachkontrolle Verlagerung (W)', 'number', 'value.power');
        await mk('peakShaving.atypical.review.deltaPercent', 'Nachkontrolle Verlagerung (%)', 'number', 'value');
        await mk('peakShaving.atypical.review.thresholdOk', 'Erheblichkeitsschwelle erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.minShiftOk', 'Mindestverlagerung erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.savingsEur', 'Geschätzte Ersparnis (€)', 'number', 'value');
        await mk('peakShaving.atypical.review.savingsOk', 'Bagatellgrenze erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.eligible', 'Nachkontrolle erfüllt', 'boolean', 'indicator');
        await mk('peakShaving.atypical.review.lastUpdate', 'Nachkontrolle letzte Aktualisierung', 'number', 'value.time');
        await mk('peakShaving.atypical.review.snapshotJson', 'Nachkontrolle Snapshot (JSON)', 'string', 'text');
    }


    _atypicalSeasonMonths(season) {
        const s = String(season || '').trim().toLowerCase();
        if (!s) return [];
        if (['winter', 'win', 'w'].includes(s)) return [1, 2, 12];
        if (['sommer', 'summer', 'sum', 's'].includes(s)) return [6, 7, 8];
        if (['uebergang', 'übergang', 'transition', 'spring-autumn', 'fruehjahr-herbst', 'frühjahr-herbst'].includes(s)) return [3, 4, 5, 9, 10, 11];
        return [];
    }

    _atypicalWindowLabel(win) {
        if (win && typeof win === 'object') {
            const explicit = String(win.label || win.name || win.id || '').trim();
            if (explicit) return explicit;
            const from = String(win.from || win.start || win.startTime || win.fromTime || '').trim();
            const to = String(win.to || win.end || win.endTime || win.toTime || '').trim();
            if (from || to) return `${from || '?'}-${to || '?'}`;
        }
        return '';
    }

    _atypicalWindowMatches(win, nowDate) {
        if (!win || typeof win !== 'object') return false;
        if (win.enabled === false || win.active === false) return false;

        const ymd = localYmd(nowDate);
        const validFrom = normalizeYmd(win.validFrom || win.validFromDate || win.fromDate || '');
        const validTo = normalizeYmd(win.validTo || win.validToDate || win.toDate || '');
        if (validFrom && ymd < validFrom) return false;
        if (validTo && ymd > validTo) return false;

        const month = nowDate.getMonth() + 1;
        const months = toNumberArray(win.months || win.month || []);
        if (months.length && !months.includes(month)) return false;
        if (!months.length) {
            const seasonMonths = this._atypicalSeasonMonths(win.season || win.jahreszeit || '');
            if (seasonMonths.length && !seasonMonths.includes(month)) return false;
        }

        const weekdays = toNumberArray(win.weekdays || win.days || win.weekday || []);
        if (weekdays.length) {
            const iso = isoWeekday(nowDate); // 1=Mon ... 7=Sun
            const js = nowDate.getDay(); // 0=Sun ... 6=Sat
            if (!weekdays.includes(iso) && !weekdays.includes(js)) return false;
        }

        const fromMin = parseHmToMinutes(win.from || win.start || win.startTime || win.fromTime);
        const toMin = parseHmToMinutes(win.to || win.end || win.endTime || win.toTime);
        if (fromMin === null || toMin === null || fromMin === toMin) return false;

        const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
        if (toMin > fromMin) return nowMin >= fromMin && nowMin < toMin;
        // Overnight windows are not typical for HLZF, but supporting them keeps the parser robust.
        return nowMin >= fromMin || nowMin < toMin;
    }

    _evaluateAtypicalSchedule(atypicalCfg, now) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const enabled = !!cfg.enabled;
        const date = new Date(now || Date.now());
        const ymd = localYmd(date);
        if (!enabled) return { enabled: false, active: false, reason: 'disabled', ymd, windowLabel: '' };

        const includeWeekends = cfg.includeWeekends === true;
        if (!includeWeekends && isoWeekday(date) >= 6) {
            return { enabled: true, active: false, reason: 'weekend', ymd, windowLabel: '' };
        }

        const excludeChristmasNewYear = cfg.excludeChristmasNewYear !== false;
        if (excludeChristmasNewYear && isChristmasNewYearPeriod(date)) {
            return { enabled: true, active: false, reason: 'christmas-new-year-period', ymd, windowLabel: '' };
        }

        const holidaySet = toDateSet(cfg.holidays || cfg.holidayDates || []);
        const bridgeDaySet = toDateSet(cfg.bridgeDays || cfg.bridgeDayDates || []);
        const exceptionSet = toDateSet(cfg.calendarExceptions || cfg.exceptions || []);
        if (holidaySet.has(ymd)) return { enabled: true, active: false, reason: 'holiday', ymd, windowLabel: '' };
        if (bridgeDaySet.has(ymd)) return { enabled: true, active: false, reason: 'bridge-day', ymd, windowLabel: '' };
        if (exceptionSet.has(ymd)) return { enabled: true, active: false, reason: 'calendar-exception', ymd, windowLabel: '' };

        const windows = Array.isArray(cfg.highLoadWindows)
            ? cfg.highLoadWindows
            : (Array.isArray(cfg.windows) ? cfg.windows : []);
        if (!windows.length) return { enabled: true, active: false, reason: 'no-high-load-windows', ymd, windowLabel: '' };

        for (const win of windows) {
            if (this._atypicalWindowMatches(win, date)) {
                return {
                    enabled: true,
                    active: true,
                    reason: 'active-high-load-window',
                    ymd,
                    windowLabel: this._atypicalWindowLabel(win),
                    window: win,
                };
            }
        }

        return { enabled: true, active: false, reason: 'outside-high-load-window', ymd, windowLabel: '' };
    }

    _calculateAtypicalTarget(atypicalCfg) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const voltageLevel = String(
            cfg.voltageLevel ||
            this.adapter?.config?.installerConfig?.voltageLevel ||
            this.adapter?.config?.settingsConfig?.voltageLevel ||
            'MS'
        );
        const fallbackThreshold = atypicalThresholdPercent(voltageLevel, 20);
        let thresholdPercent = clamp(num(cfg.thresholdPercent, fallbackThreshold), 0, 100);
        if (typeof thresholdPercent !== 'number') thresholdPercent = fallbackThreshold;

        let minShiftW = clamp(num(cfg.minShiftW, 100000), 0, 1e12);
        if (typeof minShiftW !== 'number') minShiftW = 100000;

        const pAbsRefW = Math.max(0, num(
            cfg.annualPeakReferenceW ?? cfg.pAbsRefW ?? cfg.pAbsMaxW ?? cfg.referencePeakW ?? cfg.referencePeakPowerW,
            0
        ) || 0);
        const explicitTargetW = num(cfg.targetLimitW ?? cfg.hlzfTargetW ?? cfg.highLoadLimitW ?? cfg.capW, null);
        const marginW = Math.max(0, num(cfg.safetyMarginW, 0) || 0);

        let rawTargetW = 0;
        let targetSource = '';
        if (typeof explicitTargetW === 'number' && explicitTargetW > 0) {
            rawTargetW = explicitTargetW;
            targetSource = 'explicit';
        } else if (pAbsRefW > 0) {
            const byPercentW = pAbsRefW * Math.max(0, 1 - (thresholdPercent / 100));
            const byShiftW = Math.max(0, pAbsRefW - minShiftW);
            rawTargetW = Math.min(byPercentW, byShiftW);
            targetSource = 'derived-from-annual-peak';
        }

        const targetLimitW = rawTargetW > 0 ? Math.max(0, rawTargetW - marginW) : 0;
        const deltaW = (pAbsRefW > 0 && rawTargetW > 0) ? Math.max(0, pAbsRefW - rawTargetW) : 0;
        const deltaPercent = pAbsRefW > 0 ? (deltaW / pAbsRefW * 100) : 0;
        const thresholdOk = pAbsRefW > 0 && deltaPercent + 1e-9 >= thresholdPercent;
        const minShiftOk = pAbsRefW > 0 && deltaW + 1e-9 >= minShiftW;
        const eligiblePotential = rawTargetW > 0 && thresholdOk && minShiftOk;

        let reason = 'ok';
        if (!(rawTargetW > 0)) reason = 'missing-target-or-reference-peak';
        else if (targetSource === 'explicit' && !(pAbsRefW > 0)) reason = 'explicit-target-without-reference-peak';
        else if (!eligiblePotential && pAbsRefW > 0) reason = 'threshold-or-min-shift-not-met';

        return {
            voltageLevel,
            thresholdPercent,
            minShiftW,
            pAbsRefW,
            rawTargetW,
            marginW,
            targetLimitW,
            targetSource,
            deltaW,
            deltaPercent,
            thresholdOk,
            minShiftOk,
            eligiblePotential,
            reason,
        };
    }

    _getAtypicalSourceInfo(atypicalCfg) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const yearRaw = Number(cfg.year ?? cfg.validityYear ?? cfg.calendarYear ?? 0);
        return {
            gridOperator: String(cfg.gridOperatorName || cfg.gridOperator || cfg.networkOperator || cfg.netzbetreiber || '').trim(),
            year: Number.isFinite(yearRaw) && yearRaw > 0 ? Math.round(yearRaw) : 0,
            sourceDocument: String(cfg.sourceDocument || cfg.sourceName || cfg.source || '').trim(),
            sourcePublishedAt: String(cfg.sourcePublishedAt || cfg.publishedAt || cfg.publicationDate || '').trim(),
            sourceUrl: String(cfg.sourceUrl || cfg.sourceLink || cfg.sourcePath || '').trim(),
            sourceNote: String(cfg.sourceNote || cfg.note || cfg.notes || '').trim(),
        };
    }

    async _readOwnNumber(id, fallback = 0) {
        try {
            const st = await this.adapter.getStateAsync(id);
            const n = st ? Number(st.val) : NaN;
            return Number.isFinite(n) ? n : fallback;
        } catch {
            return fallback;
        }
    }

    async _readOwnString(id, fallback = '') {
        try {
            const st = await this.adapter.getStateAsync(id);
            if (!st || st.val === null || st.val === undefined) return fallback;
            return String(st.val);
        } catch {
            return fallback;
        }
    }

    async _ensureAtypicalReviewLoaded(resetIdentity) {
        const identity = String(resetIdentity || '');
        const st = this._atypicalReviewState || { resetIdentity: '', pAbsMaxW: 0, pHlzfMaxW: 0, lastUpdate: 0 };
        if (this._atypicalReviewLoaded && st.resetIdentity === identity) return;

        const persistedIdentity = await this._readOwnString('peakShaving.atypical.review.resetIdentity', '');
        if (persistedIdentity && persistedIdentity === identity) {
            st.resetIdentity = persistedIdentity;
            st.pAbsMaxW = Math.max(0, await this._readOwnNumber('peakShaving.atypical.review.pAbsMaxW', 0));
            st.pHlzfMaxW = Math.max(0, await this._readOwnNumber('peakShaving.atypical.review.pHlzfMaxW', 0));
            st.lastUpdate = Math.max(0, await this._readOwnNumber('peakShaving.atypical.review.lastUpdate', 0));
        } else {
            st.resetIdentity = identity;
            st.pAbsMaxW = 0;
            st.pHlzfMaxW = 0;
            st.lastUpdate = 0;
        }
        this._atypicalReviewState = st;
        this._atypicalReviewLoaded = true;
    }

    async _buildAtypicalReviewContext({ atypicalCfg, schedule, target, gridPowerRaw, effPower, staleMeter, now }) {
        const cfg = (atypicalCfg && typeof atypicalCfg === 'object') ? atypicalCfg : {};
        const review = (cfg.review && typeof cfg.review === 'object') ? cfg.review : ((cfg.nachkontrolle && typeof cfg.nachkontrolle === 'object') ? cfg.nachkontrolle : {});
        const source = this._getAtypicalSourceInfo(cfg);
        const year = Math.round(num(review.year ?? source.year, (new Date(now || Date.now())).getFullYear()) || (new Date(now || Date.now())).getFullYear());
        const resetToken = String(review.resetToken || review.resetKey || '').trim();
        const resetIdentity = `${year}|${resetToken}`;
        const enabled = cfg.enabled === true && review.enabled !== false;

        await this._ensureAtypicalReviewLoaded(resetIdentity);
        const st = this._atypicalReviewState || { resetIdentity, pAbsMaxW: 0, pHlzfMaxW: 0, lastUpdate: 0 };
        st.resetIdentity = resetIdentity;

        const rawW = Number.isFinite(Number(gridPowerRaw)) ? Number(gridPowerRaw) : (Number.isFinite(Number(effPower)) ? Number(effPower) : null);
        const importW = (rawW !== null && Number.isFinite(rawW)) ? Math.max(0, rawW) : null;
        const measurementUsable = enabled && !staleMeter && importW !== null;

        if (measurementUsable) {
            if (importW > st.pAbsMaxW) st.pAbsMaxW = Math.round(importW);
            if (schedule && schedule.active && importW > st.pHlzfMaxW) st.pHlzfMaxW = Math.round(importW);
            st.lastUpdate = now || Date.now();
        }

        const manualPAbs = num(review.pAbsActualW ?? review.actualAnnualPeakW ?? review.pAbsIstW, null);
        const manualHlzf = num(review.pHlzfMaxW ?? review.hlzfPeakW ?? review.pHlzfIstW, null);
        const pAbsEvalW = (typeof manualPAbs === 'number' && manualPAbs > 0) ? manualPAbs : st.pAbsMaxW;
        const pHlzfEvalW = (typeof manualHlzf === 'number' && manualHlzf >= 0) ? manualHlzf : st.pHlzfMaxW;

        const thresholdPercent = Math.max(0, num(target && target.thresholdPercent, atypicalThresholdPercent(target && target.voltageLevel, 20)) || 0);
        const minShiftW = Math.max(0, num(target && target.minShiftW, 100000) || 0);
        const complete = pAbsEvalW > 0 && pHlzfEvalW >= 0;
        const deltaW = complete ? Math.max(0, pAbsEvalW - pHlzfEvalW) : 0;
        const deltaPercent = complete ? (deltaW / pAbsEvalW * 100) : 0;
        const thresholdOk = complete && deltaPercent + 1e-9 >= thresholdPercent;
        const minShiftOk = complete && deltaW + 1e-9 >= minShiftW;

        const powerPrice = num(review.powerPriceEurPerKwYear ?? review.powerPriceEurPerKwA ?? review.leistungspreisEurProKwJahr, null);
        const bagatelleEur = Math.max(0, num(review.savingsBagatelleEur ?? review.bagatelleEur ?? 500, 500) || 0);
        const generalGridFeeEur = num(review.generalGridFeeEur ?? review.generalGridFee ?? review.allgemeinesNetzentgeltEur, null);
        const maxReductionPercent = Math.min(100, Math.max(0, num(review.maxReductionPercent ?? 80, 80) || 0));
        const grossSavingsEur = (complete && typeof powerPrice === 'number' && powerPrice > 0) ? ((deltaW / 1000) * powerPrice) : null;
        const reductionCapEur = (grossSavingsEur !== null && typeof generalGridFeeEur === 'number' && generalGridFeeEur > 0) ? (generalGridFeeEur * maxReductionPercent / 100) : null;
        const savingsEur = grossSavingsEur === null ? null : (reductionCapEur === null ? grossSavingsEur : Math.min(grossSavingsEur, reductionCapEur));
        const savingsOk = savingsEur === null ? null : savingsEur + 1e-9 >= bagatelleEur;
        const technicalEligible = complete && thresholdOk && minShiftOk;
        const eligible = enabled && technicalEligible && (savingsOk === null ? true : savingsOk);

        let status = 'disabled';
        if (enabled) {
            if (!complete) status = 'collecting';
            else if (!thresholdOk) status = 'threshold-missing';
            else if (!minShiftOk) status = 'min-shift-missing';
            else if (savingsOk === false) status = 'bagatelle-missing';
            else if (savingsOk === null) status = 'technical-ok-savings-open';
            else status = 'eligible';
        }

        return {
            enabled,
            status,
            year,
            resetIdentity,
            measurementUsable,
            pAbsMaxW: st.pAbsMaxW,
            pHlzfMaxW: st.pHlzfMaxW,
            pAbsEvalW,
            pHlzfEvalW,
            manualPAbsW: (typeof manualPAbs === 'number' && manualPAbs > 0) ? manualPAbs : null,
            manualHlzfW: (typeof manualHlzf === 'number' && manualHlzf >= 0) ? manualHlzf : null,
            thresholdPercent,
            minShiftW,
            deltaW,
            deltaPercent,
            thresholdOk,
            minShiftOk,
            powerPriceEurPerKwYear: typeof powerPrice === 'number' ? powerPrice : null,
            bagatelleEur,
            grossSavingsEur,
            reductionCapEur,
            savingsEur,
            savingsOk,
            technicalEligible,
            eligible,
            lastUpdate: st.lastUpdate || 0,
        };
    }

    async _publishAtypicalDiagnostics(ctx) {
        const c = (ctx && typeof ctx === 'object') ? ctx : {};
        const schedule = (c.schedule && typeof c.schedule === 'object') ? c.schedule : {};
        const target = (c.target && typeof c.target === 'object') ? c.target : {};
        const source = (c.source && typeof c.source === 'object') ? c.source : {};
        const review = (c.review && typeof c.review === 'object') ? c.review : {};
        const set = async (id, val) => {
            try { await this.adapter.setStateAsync(id, val, true); } catch { /* diagnostics only */ }
        };

        await set('peakShaving.atypical.enabled', !!c.enabled);
        await set('peakShaving.atypical.enforce', !!c.enforce);
        await set('peakShaving.atypical.activeWindow', !!schedule.active);
        await set('peakShaving.atypical.status', String(schedule.reason || target.reason || ''));
        await set('peakShaving.atypical.windowLabel', String(schedule.windowLabel || ''));
        await set('peakShaving.atypical.voltageLevel', String(target.voltageLevel || ''));
        await set('peakShaving.atypical.thresholdPercent', Number.isFinite(Number(target.thresholdPercent)) ? Number(target.thresholdPercent) : 0);
        await set('peakShaving.atypical.minShiftW', Number.isFinite(Number(target.minShiftW)) ? Math.round(Number(target.minShiftW)) : 0);
        await set('peakShaving.atypical.pAbsRefW', Number.isFinite(Number(target.pAbsRefW)) ? Math.round(Number(target.pAbsRefW)) : 0);
        await set('peakShaving.atypical.targetLimitW', Number.isFinite(Number(target.targetLimitW)) ? Math.round(Number(target.targetLimitW)) : 0);
        await set('peakShaving.atypical.effectiveLimitW', Number.isFinite(Number(c.effectiveLimitW)) ? Math.round(Number(c.effectiveLimitW)) : 0);
        await set('peakShaving.atypical.deltaW', Number.isFinite(Number(target.deltaW)) ? Math.round(Number(target.deltaW)) : 0);
        await set('peakShaving.atypical.deltaPercent', Number.isFinite(Number(target.deltaPercent)) ? Math.round(Number(target.deltaPercent) * 100) / 100 : 0);
        await set('peakShaving.atypical.eligiblePotential', !!target.eligiblePotential);
        await set('peakShaving.atypical.binding', String(c.binding || ''));
        await set('peakShaving.atypical.gridOperator', String(source.gridOperator || ''));
        await set('peakShaving.atypical.year', Number.isFinite(Number(source.year)) ? Math.round(Number(source.year)) : 0);
        await set('peakShaving.atypical.sourceDocument', String(source.sourceDocument || ''));
        await set('peakShaving.atypical.sourcePublishedAt', String(source.sourcePublishedAt || ''));
        await set('peakShaving.atypical.sourceUrl', String(source.sourceUrl || ''));
        await set('peakShaving.atypical.sourceNote', String(source.sourceNote || ''));

        await set('peakShaving.atypical.review.enabled', !!review.enabled);
        await set('peakShaving.atypical.review.status', String(review.status || ''));
        await set('peakShaving.atypical.review.year', Number.isFinite(Number(review.year)) ? Math.round(Number(review.year)) : 0);
        await set('peakShaving.atypical.review.resetIdentity', String(review.resetIdentity || ''));
        await set('peakShaving.atypical.review.pAbsMaxW', Number.isFinite(Number(review.pAbsMaxW)) ? Math.round(Number(review.pAbsMaxW)) : 0);
        await set('peakShaving.atypical.review.pHlzfMaxW', Number.isFinite(Number(review.pHlzfMaxW)) ? Math.round(Number(review.pHlzfMaxW)) : 0);
        await set('peakShaving.atypical.review.pAbsEvalW', Number.isFinite(Number(review.pAbsEvalW)) ? Math.round(Number(review.pAbsEvalW)) : 0);
        await set('peakShaving.atypical.review.pHlzfEvalW', Number.isFinite(Number(review.pHlzfEvalW)) ? Math.round(Number(review.pHlzfEvalW)) : 0);
        await set('peakShaving.atypical.review.deltaW', Number.isFinite(Number(review.deltaW)) ? Math.round(Number(review.deltaW)) : 0);
        await set('peakShaving.atypical.review.deltaPercent', Number.isFinite(Number(review.deltaPercent)) ? Math.round(Number(review.deltaPercent) * 100) / 100 : 0);
        await set('peakShaving.atypical.review.thresholdOk', !!review.thresholdOk);
        await set('peakShaving.atypical.review.minShiftOk', !!review.minShiftOk);
        await set('peakShaving.atypical.review.savingsEur', Number.isFinite(Number(review.savingsEur)) ? Math.round(Number(review.savingsEur) * 100) / 100 : 0);
        await set('peakShaving.atypical.review.savingsOk', review.savingsOk === true);
        await set('peakShaving.atypical.review.eligible', !!review.eligible);
        await set('peakShaving.atypical.review.lastUpdate', Number.isFinite(Number(review.lastUpdate)) ? Math.round(Number(review.lastUpdate)) : 0);
        await set('peakShaving.atypical.review.snapshotJson', JSON.stringify(review || {}));

        await set('peakShaving.atypical.snapshotJson', JSON.stringify({
            ts: Date.now(),
            mode: String(c.mode || ''),
            enabled: !!c.enabled,
            enforce: !!c.enforce,
            schedule,
            target,
            source,
            review,
            limitCandidateW: Number.isFinite(Number(c.limitCandidateW)) ? Math.round(Number(c.limitCandidateW)) : 0,
            effectiveLimitW: Number.isFinite(Number(c.effectiveLimitW)) ? Math.round(Number(c.effectiveLimitW)) : 0,
            binding: String(c.binding || ''),
        }));
    }

    async tick() {
        if (!this._isEnabled()) return;

        const cfg = this.adapter.config.peakShaving || {};
        const now = Date.now();

        // Normalize config
        const mode = String(cfg.mode || 'static');
        const smoothingSeconds = clamp(num(cfg.smoothingSeconds, 10), 1, 600);
        const useAverage = cfg.useAverage !== false; // default true

        // Peak-Shaving limit source:
        // Prefer central plant parameter "Netzanschlussleistung" (installerConfig.gridConnectionPower).
        // Fallback to legacy peakShaving.maxPowerW for backwards compatibility.
        const instLimitW = clamp(num(this.adapter?.config?.installerConfig?.gridConnectionPower, 0), 0, 1e12);
        const legacyLimitW = num(cfg.maxPowerW, 0);
        const plantLimitW = (typeof instLimitW === 'number' && instLimitW > 0) ? instLimitW : legacyLimitW;
        const hysteresisW = clamp(num(cfg.hysteresisW, 500), 0, 1e9);
        const activateDelayS = clamp(num(cfg.activateDelaySeconds, 2), 0, 3600);
        const releaseDelayS = clamp(num(cfg.releaseDelaySeconds, 5), 0, 3600);

        const safetyMarginW = clamp(num(cfg.safetyMarginW, 0), 0, 1e9);
        const fastTripEnabled = cfg.fastTripEnabled !== false; // default true
        const fastTripMode = String(cfg.fastTripMode || 'max'); // max|raw

        const maxPhaseA = num(cfg.maxPhaseA, 0);
        const phaseMode = String(cfg.phaseMode || (maxPhaseA > 0 ? 'enforce' : 'off')); // off|info|enforce
        const hysteresisA = clamp(num(cfg.hysteresisA, 1), 0, 100);
        const voltageV = clamp(num(cfg.voltageV, 230), 50, 400);


        // Atypische Netznutzung / HLZF-Spitzenkappung (§19 Abs. 2 S. 1 StromNEV)
        // strategyMode steuert die UI-Auswahl:
        // - standard: nur klassische Lastspitzenkappung
        // - atypical: nur HLZF-Cap innerhalb aktiver Hochlastzeitfenster
        // - hybrid: klassisch + HLZF, es bindet immer das strengere Limit
        // - monitor: HLZF-Diagnose ohne Peak-Shaving-Setpoint aus diesem Modul
        const atypicalCfg = (cfg.atypical && typeof cfg.atypical === 'object') ? cfg.atypical : {};
        let strategyMode = String(cfg.strategyMode || cfg.strategy || '').trim().toLowerCase();
        if (!['standard', 'atypical', 'hybrid', 'monitor'].includes(strategyMode)) {
            const legacyMode = String(atypicalCfg.mode || '').trim().toLowerCase();
            strategyMode = atypicalCfg.enabled ? (legacyMode === 'monitor' ? 'monitor' : 'hybrid') : 'standard';
        }
        const standardLimitEnabled = strategyMode === 'standard' || strategyMode === 'hybrid';
        const atypicalRuntimeEnabled = !!atypicalCfg.enabled && (strategyMode === 'atypical' || strategyMode === 'hybrid' || strategyMode === 'monitor');
        const atypicalMode = strategyMode === 'monitor' ? 'monitor' : String(atypicalCfg.mode || (strategyMode === 'atypical' ? 'enforce' : 'hybrid')).trim().toLowerCase(); // monitor|enforce|hybrid
        const atypicalEnforce = atypicalRuntimeEnabled && atypicalMode !== 'monitor' && atypicalCfg.enforce !== false;
        const atypicalSchedule = this._evaluateAtypicalSchedule({ ...atypicalCfg, enabled: atypicalRuntimeEnabled }, now);
        const atypicalTarget = this._calculateAtypicalTarget(atypicalCfg);
        const atypicalLimitCandidateW = (atypicalSchedule.active && atypicalEnforce && atypicalTarget.targetLimitW > 0) ? atypicalTarget.targetLimitW : 0;
        const atypicalWantsPowerLimit = atypicalLimitCandidateW > 0;

        // Bind datapoints from config (manufacturer-independent)
        if (cfg.gridPointPowerId) {
            // IMPORTANT: enable alive-prefix heartbeat. Many meters/adapters are event-driven
            // and do not update state.ts while the measurement stays stable.
            await this.dp.upsert({ key: 'ps.gridPowerW', objectId: cfg.gridPointPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        }
        if (cfg.allowedPowerId) {
            await this.dp.upsert({ key: 'ps.allowedPowerW', objectId: cfg.allowedPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.baseLoadPowerId) {
            await this.dp.upsert({ key: 'ps.baseLoadW', objectId: cfg.baseLoadPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.pvPowerId) {
            await this.dp.upsert({ key: 'ps.pvW', objectId: cfg.pvPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.batteryPowerId) {
            await this.dp.upsert({ key: 'ps.batteryW', objectId: cfg.batteryPowerId, dataType: 'number', direction: 'in', unit: 'W' });
        }
        if (cfg.l1CurrentId) await this.dp.upsert({ key: 'ps.l1A', objectId: cfg.l1CurrentId, dataType: 'number', direction: 'in', unit: 'A' });
        if (cfg.l2CurrentId) await this.dp.upsert({ key: 'ps.l2A', objectId: cfg.l2CurrentId, dataType: 'number', direction: 'in', unit: 'A' });
        if (cfg.l3CurrentId) await this.dp.upsert({ key: 'ps.l3A', objectId: cfg.l3CurrentId, dataType: 'number', direction: 'in', unit: 'A' });

        // MU6.7: stale meter failsafe (protect against missing/old grid measurements)
        // IMPORTANT: Many real-world meters update slowly or only on change.
        // A too aggressive legacy default (15s) caused false activation and blocked controlled loads.
        // Default to 300s; if a persisted legacy default "15" exists, treat it as legacy and keep 300.
        // Staleness threshold (seconds). Default is conservative (300s) but can be lowered.
        // NOTE: With the device-prefix heartbeat enabled for NVP/grid metering, low thresholds
        // like 15s are now safe even for event-driven adapters.
        let staleTimeoutSec = num(cfg.staleTimeoutSec, 300);
        staleTimeoutSec = clamp(staleTimeoutSec, 1, 3600);
        const staleMaxAgeMs = staleTimeoutSec * 1000;
        const wantsPowerLimit = (standardLimitEnabled && typeof plantLimitW === 'number' && plantLimitW > 0) || atypicalWantsPowerLimit;
        const wantsPhaseLimit = (phaseMode === 'info' || phaseMode === 'enforce') && typeof maxPhaseA === 'number' && maxPhaseA > 0;
        let staleMeter = false;
        const staleKeys = [];
        if (wantsPowerLimit || wantsPhaseLimit) {
            // Grid power is the primary safety signal
            if (wantsPowerLimit) {
                if (!this.dp.getEntry('ps.gridPowerW')) staleKeys.push('ps.gridPowerW');
                else if (this.dp.isStale('ps.gridPowerW', staleMaxAgeMs)) staleKeys.push('ps.gridPowerW');
            }
            if (wantsPhaseLimit) {
                const phaseKeys = ['ps.l1A', 'ps.l2A', 'ps.l3A'];
                const anyPhaseConfigured = phaseKeys.some(k => !!this.dp.getEntry(k));
                if (!anyPhaseConfigured && !wantsPowerLimit && phaseMode === 'enforce') {
                    staleKeys.push('ps.l1A/ps.l2A/ps.l3A');
                } else {
                    for (const k of phaseKeys) {
                        if (this.dp.getEntry(k) && this.dp.isStale(k, staleMaxAgeMs)) staleKeys.push(k);
                    }
                }
            }
            staleMeter = staleKeys.length > 0;
        }

        // Measurements
        const gridPowerRaw = this.dp.getNumber('ps.gridPowerW', null);
        const l1Raw = this.dp.getNumber('ps.l1A', null);
        const l2Raw = this.dp.getNumber('ps.l2A', null);
        const l3Raw = this.dp.getNumber('ps.l3A', null);

        // Update windows
        this._winPower.setMaxSeconds(smoothingSeconds);
        this._winL1.setMaxSeconds(smoothingSeconds);
        this._winL2.setMaxSeconds(smoothingSeconds);
        this._winL3.setMaxSeconds(smoothingSeconds);

        if (typeof gridPowerRaw === 'number') this._winPower.push(gridPowerRaw, now);
        if (typeof l1Raw === 'number') this._winL1.push(l1Raw, now);
        if (typeof l2Raw === 'number') this._winL2.push(l2Raw, now);
        if (typeof l3Raw === 'number') this._winL3.push(l3Raw, now);

        const avgPower = this._winPower.mean();
        const maxPower = this._winPower.max();
        const effPower = useAverage && typeof avgPower === 'number' ? avgPower : gridPowerRaw;

        // MU6.9: FastTrip path (react to spikes without losing smoothing for steady-state)
        let tripPower = null;
        if (fastTripEnabled) {
            if (fastTripMode === 'max') {
                tripPower = (typeof maxPower === 'number') ? maxPower : gridPowerRaw;
            } else if (fastTripMode === 'raw') {
                tripPower = gridPowerRaw;
            } else {
                tripPower = gridPowerRaw;
            }
        }

        const samples = this._winPower.count();
        await this.adapter.setStateAsync('peakShaving.calc.avgPowerW', typeof avgPower === 'number' ? avgPower : 0, true);
        await this.adapter.setStateAsync('peakShaving.calc.samples', samples, true);

        // Determine power limit
        let limitW = 0;
        let allowedPowerW = null;
        let reserveW = num(cfg.reserveW, 0);
        let limitSource = '';

        if (standardLimitEnabled && mode === 'dynamic') {
            allowedPowerW = this.dp.getNumber('ps.allowedPowerW', null);
            // Central plant limit is a hard cap (if configured). If not configured, allow dynamic DP only.
            const baseMax = (typeof plantLimitW === 'number' && plantLimitW > 0) ? plantLimitW : Number.POSITIVE_INFINITY;
            const allowed = (typeof allowedPowerW === 'number' && allowedPowerW > 0) ? allowedPowerW : Number.POSITIVE_INFINITY;
            limitW = Math.min(baseMax, allowed) - Math.max(0, reserveW);
            if (!Number.isFinite(limitW)) limitW = 0;
            if (limitW > 0) limitSource = (Number.isFinite(baseMax) && Number.isFinite(allowed)) ? 'standard+dynamic' : (Number.isFinite(allowed) ? 'dynamic' : 'standard');
        } else if (standardLimitEnabled) {
            // static: fester Grenzwert, aber Reserve ebenfalls abziehen (Reserve ist keine dynamic-only Funktion)
            const base = (typeof plantLimitW === 'number' && plantLimitW > 0) ? plantLimitW : 0;
            limitW = Math.max(0, base - Math.max(0, reserveW));
            if (limitW > 0) limitSource = 'standard';
        } else {
            // Atypisch-only/Monitor: kein permanenter Standard-Cap außerhalb der HLZF.
            limitW = 0;
            limitSource = '';
        }

        if (atypicalWantsPowerLimit) {
            if (limitW > 0) {
                if (atypicalLimitCandidateW <= limitW + 0.001) {
                    limitSource = limitSource ? `atypical+${limitSource}` : 'atypical';
                }
                limitW = Math.min(limitW, atypicalLimitCandidateW);
            } else {
                limitW = atypicalLimitCandidateW;
                limitSource = 'atypical';
            }
        }

        // GridConstraints (RLM): zusätzliche dynamische Obergrenze für den Netzbezug
        // (wird nur berücksichtigt, wenn das GridConstraints-Modul aktiv ist und RLM eingeschaltet ist)
        if (this.adapter.config.enableGridConstraints && this.adapter.config.gridConstraints && this.adapter.config.gridConstraints.rlmEnabled) {
            try {
                const st = await this.adapter.getStateAsync('gridConstraints.rlm.capNowW');
                const cap = (st && typeof st.val === 'number') ? st.val : Number(st && st.val);
                if (Number.isFinite(cap) && cap > 0) {
                    const beforeLimitW = limitW;
                    limitW = (limitW > 0) ? Math.min(limitW, cap) : cap;
                    if (limitW > 0 && (!(beforeLimitW > 0) || cap <= beforeLimitW + 0.001)) {
                        limitSource = limitSource
                            ? `gridConstraints+${limitSource}`
                            : 'gridConstraints';
                    }
                }
            } catch {
                // ignore
            }
        }


        // MU6.9: Safety margin (keep headroom to avoid overload due to latency/noise)
        if (typeof limitW === 'number' && limitW > 0) {
            limitW = Math.max(0, limitW - Math.max(0, safetyMarginW));
        }

        const atypicalSource = this._getAtypicalSourceInfo(atypicalCfg);
        const atypicalReview = await this._buildAtypicalReviewContext({
            atypicalCfg: { ...atypicalCfg, enabled: atypicalRuntimeEnabled },
            schedule: atypicalSchedule,
            target: atypicalTarget,
            gridPowerRaw,
            effPower,
            staleMeter,
            now,
        });

        await this._publishAtypicalDiagnostics({
            enabled: !!atypicalRuntimeEnabled,
            mode: atypicalMode,
            enforce: atypicalEnforce,
            schedule: atypicalSchedule,
            target: atypicalTarget,
            source: atypicalSource,
            review: atypicalReview,
            limitCandidateW: atypicalLimitCandidateW,
            effectiveLimitW: atypicalWantsPowerLimit ? limitW : 0,
            binding: atypicalWantsPowerLimit ? (limitSource || 'atypical') : '',
        });

        // Phase analysis
        const l1 = useAverage ? this._winL1.mean() : l1Raw;
        const l2 = useAverage ? this._winL2.mean() : l2Raw;
        const l3 = useAverage ? this._winL3.mean() : l3Raw;

        const phases = [
            { k: 'L1', v: typeof l1 === 'number' ? l1 : null },
            { k: 'L2', v: typeof l2 === 'number' ? l2 : null },
            { k: 'L3', v: typeof l3 === 'number' ? l3 : null },
        ].filter(p => typeof p.v === 'number');

        let worstPhase = '';
        let worstPhaseOverA = 0;
        if (phases.length && typeof maxPhaseA === 'number' && maxPhaseA > 0) {
            let best = { k: '', over: 0 };
            for (const p of phases) {
                const over = (p.v - maxPhaseA);
                if (over > best.over) best = { k: p.k, over };
            }
            worstPhase = best.k;
            worstPhaseOverA = best.over > 0 ? best.over : 0;
        }

        const phaseViolation = worstPhaseOverA > 0;
        const requiredReductionA = phaseViolation ? worstPhaseOverA : 0;
        const requiredReductionWPhase1p = phaseViolation ? requiredReductionA * voltageV : 0;
        const requiredReductionWPhase3p = phaseViolation ? requiredReductionA * voltageV * 3 : 0;

        // Power violation
        const overWAvg = (typeof effPower === 'number' && limitW > 0) ? (effPower - limitW) : 0;
        const overWTrip = (fastTripEnabled && typeof tripPower === 'number' && limitW > 0) ? (tripPower - limitW) : 0;
        const overW = Math.max(0, overWAvg, overWTrip);
        const powerViolation = overW > 0;
        const fastTripViolation = overWTrip > 0;

        // Determine whether we consider phase for activation
        const considerPhase = phaseMode === 'info' || phaseMode === 'enforce';
        const canActivateFromPhaseOnly = phaseMode === 'enforce';

        const hasPowerLimit = limitW > 0;
        const violationNow =
            staleMeter ||
            (hasPowerLimit && powerViolation) ||
            (considerPhase && phaseViolation && (hasPowerLimit || canActivateFromPhaseOnly));

        // Determine requested reduction (W)
        const reqFromPower = powerViolation ? overW : 0;
        const reqFromPhase = (considerPhase && phaseViolation) ? requiredReductionWPhase3p : 0;
        const requiredReductionW = staleMeter ? 1000000000 : Math.max(0, reqFromPower, reqFromPhase);
        // State machine with delays/hysteresis
        const underPowerRelease = !hasPowerLimit ? true : (typeof effPower === 'number' ? effPower <= (limitW - hysteresisW) : true);
        const underPhaseRelease = !considerPhase ? true : (phaseViolation ? false : true); // if no violation, ok
        const releaseConditionNow = !staleMeter && !fastTripViolation && underPowerRelease && underPhaseRelease;

        let status = this._status;
        let active = status === 'active';

        if (status === 'inactive') {
            if (violationNow) {
                status = fastTripViolation ? 'active' : (activateDelayS > 0 ? 'pending_on' : 'active');
                this._pendingSince = now;
                if (status === 'active') this._activeSince = now;
            }
        } else if (status === 'pending_on') {
            if (!violationNow) {
                status = 'inactive';
                this._pendingSince = 0;
            } else if (fastTripViolation) {
                status = 'active';
                this._pendingSince = 0;
                this._activeSince = now;
            } else if ((now - this._pendingSince) >= activateDelayS * 1000) {
                status = 'active';
                this._activeSince = now;
            }
        } else if (status === 'active') {
            if (releaseConditionNow) {
                status = releaseDelayS > 0 ? 'pending_off' : 'inactive';
                this._pendingSince = now;
                if (status === 'inactive') this._pendingSince = 0;
            }
        } else if (status === 'pending_off') {
            if (!releaseConditionNow) {
                status = 'active';
                this._pendingSince = 0;
            } else if ((now - this._pendingSince) >= releaseDelayS * 1000) {
                status = 'inactive';
                this._pendingSince = 0;
            }
        }


        // MU6.9: fast trip => force immediate active (bypass activate delay)
        if (fastTripViolation) {
            status = 'active';
            this._pendingSince = 0;
            this._activeSince = now;
        }

        // MU6.7: stale meter => force immediate active (bypass delays)
        if (staleMeter) {
            status = 'active';
            this._pendingSince = 0;
            if (!this._activeSince) this._activeSince = now;
        }
        this._status = status;
        active = status === 'active';

        // Reason (MU6.12): standardized reason codes
        let reason = ReasonCodes.OK;
        if (staleMeter) {
            reason = ReasonCodes.STALE_METER;
        } else if (active || status.startsWith('pending')) {
            if (powerViolation && phaseViolation && considerPhase) reason = ReasonCodes.LIMIT_POWER_AND_PHASE;
            else if (powerViolation) reason = ReasonCodes.LIMIT_POWER;
            else if (phaseViolation && considerPhase) reason = ReasonCodes.LIMIT_PHASE;
            else reason = ReasonCodes.UNKNOWN;
        }

        let availableForControlledW = 0;

        // Dynamic diagnostics
        if (mode === 'dynamic') {
            const baseLoadW = this.dp.getNumber('ps.baseLoadW', 0) || 0;
            const pvW = this.dp.getNumber('ps.pvW', 0) || 0;
            const batteryW = this.dp.getNumber('ps.batteryW', 0) || 0;

            // A heuristic: baseLoad minus PV minus (discharging battery positive?) user-defined conventions differ.
            // We store values as-is and compute a conservative available budget.
            availableForControlledW = Math.max(0, limitW - Math.max(0, baseLoadW - pvW - batteryW));

            await this.adapter.setStateAsync('peakShaving.dynamic.allowedPowerW', typeof allowedPowerW === 'number' ? allowedPowerW : 0, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.reserveW', reserveW || 0, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.effectiveLimitW', limitW || 0, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.baseLoadW', baseLoadW, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.pvW', pvW, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.batteryW', batteryW, true);
            await this.adapter.setStateAsync('peakShaving.dynamic.availableForControlledW', availableForControlledW, true);

            // Mirror for easier consumption by other modules
            await this.adapter.setStateAsync('peakShaving.control.availableForControlledW', availableForControlledW, true).catch(() => {});
        } else {
            // ensure mirror exists
            await this.adapter.setObjectNotExistsAsync('peakShaving.control.availableForControlledW', {
                type: 'state',
                common: { name: 'Available for controlled loads (W)', type: 'number', role: 'value.power', read: true, write: false },
                native: {},
            }).catch(() => {});
            await this.adapter.setStateAsync('peakShaving.control.availableForControlledW', 0, true).catch(() => {});
        }

        // Publish control states
        await this.adapter.setStateAsync('peakShaving.control.active', active, true);
        await this.adapter.setStateAsync('peakShaving.control.status', status, true);
        await this.adapter.setStateAsync('peakShaving.control.reason', reason, true);
        await this.adapter.setStateAsync('peakShaving.control.reasonText', reasonToGerman(reason), true);
        await this.adapter.setStateAsync('peakShaving.control.limitW', limitW || 0, true);
        await this.adapter.setStateAsync('peakShaving.control.effectivePowerW', typeof effPower === 'number' ? effPower : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.overW', powerViolation ? overW : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.requiredReductionW', active ? requiredReductionW : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.requiredReductionA', active ? requiredReductionA : 0, true);
        await this.adapter.setStateAsync('peakShaving.control.phaseViolation', phaseViolation, true);
        await this.adapter.setStateAsync('peakShaving.control.worstPhase', worstPhase, true);
        await this.adapter.setStateAsync('peakShaving.control.worstPhaseOverA', worstPhaseOverA || 0, true);
        await this.adapter.setStateAsync('peakShaving.control.lastUpdate', now, true);

        // Actuation (Step 1.5)
        const actEnabled = !!cfg.actuationEnabled;
        const actuators = Array.isArray(cfg.actuators) ? cfg.actuators : [];

        // detect transitions to store/restore baselines
        if (active && !this._wasActive) {
            this._baselines.clear();
        }

        if (actEnabled && active && requiredReductionW > 0) {
            await this._applyActuators(actuators, requiredReductionW, voltageV);
        } else if (this._wasActive && !active) {
            await this._restoreActuators(actuators);
        }


        // MU6.1: diagnostics logging (compact)
        const diagCfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        if (diagCfg && diagCfg.enabled) {
            const lvl = (diagCfg.logLevel === 'info' || diagCfg.logLevel === 'debug') ? diagCfg.logLevel : 'debug';
            const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[lvl] === 'function') ? this.adapter.log[lvl] : this.adapter.log.debug;
            try {
                fn.call(this.adapter.log, `[Lastspitzenkappung] Modus=${mode} aktiv=${active} status=${status} Grund=${reason} (${reasonToGerman(reason)}) MesswertAlt=${staleMeter ? 1 : 0} FastTrip=${fastTripViolation ? 1 : 0} Safety=${Math.round(Number(safetyMarginW || 0))}W Limit=${Math.round(Number(limitW || 0))}W Quelle=${limitSource || 'none'} Atypisch=${atypicalSchedule.active ? 1 : 0} AtypischLimit=${Math.round(Number(atypicalLimitCandidateW || 0))}W Roh=${Math.round(Number(gridPowerRaw || 0))}W MW=${Math.round(Number(avgPower || 0))}W Trip=${Math.round(Number(tripPower || 0))}W Eff=${Math.round(Number(effPower || 0))}W Über=${Math.round(Number(overW || 0))}W VerfCtl=${Math.round(Number(availableForControlledW || 0))}W BedarfRed=${Math.round(Number(requiredReductionW || 0))}W`);
            } catch {
                // ignore
            }
        }

        this._wasActive = active;
    }

    async _ensureActuatorChannel(idPart) {
        const ch = `peakShaving.actuators.${idPart}`;
        await this.adapter.setObjectNotExistsAsync(ch, {
            type: 'channel',
            common: { name: idPart },
            native: {},
        });
        const mk = async (sid, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(`${ch}.${sid}`, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };
        await mk('target', 'Target (W/A)', 'number', 'value');
        await mk('appliedReductionW', 'Applied reduction (W)', 'number', 'value.power');
        await mk('status', 'Status', 'string', 'text');
        await mk('lastWrite', 'Last write', 'number', 'value.time');
        return ch;
    }

    async _applyActuators(actuators, requestedReductionW, voltageV) {
        let remainingW = requestedReductionW;

        // stable ordering: enabled, then priority ascending
        const list = actuators
            .filter(a => a && a.enabled !== false)
            .map(a => ({
                id: String(a.id || '').trim(),
                name: a.name || '',
                mode: String(a.mode || 'limitW'),
                phases: Number(a.phases || 3),
                priority: Number(a.priority || 999),
                measurePowerId: String(a.measurePowerId || '').trim(),
                setpointId: String(a.setpointId || '').trim(),
                enableId: String(a.enableId || '').trim(),
                min: num(a.min, null),
                max: num(a.max, null),
            }))
            .filter(a => a.id && (a.setpointId || a.enableId))
            .sort((x, y) => (x.priority - y.priority) || x.id.localeCompare(y.id));

        for (const a of list) {
            if (remainingW <= 0) break;
            const safeId = a.id.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64);
            const ch = await this._ensureActuatorChannel(safeId);

            // Upsert datapoints
            if (a.measurePowerId) await this.dp.upsert({ key: `ps.act.${safeId}.measureW`, objectId: a.measurePowerId, dataType: 'number', direction: 'in', unit: 'W' });
            if (a.setpointId) await this.dp.upsert({ key: `ps.act.${safeId}.setpoint`, objectId: a.setpointId, dataType: 'number', direction: 'out' });
            if (a.enableId) await this.dp.upsert({ key: `ps.act.${safeId}.enable`, objectId: a.enableId, dataType: 'boolean', direction: 'out' });

            const phases = (a.phases === 1 ? 1 : 3);
            const vFactor = voltageV * phases;

            // Baseline capture (once per activation)
            let baseline = null;
            let baselineEnabled = null;

            const mem = this._baselines.get(safeId);
            if (mem) {
                baseline = mem.baseline;
                baselineEnabled = mem.baselineEnabled;
            } else {
                // baseline from measured power, else from current setpoint, else from configured max
                if (a.mode === 'limitW') {
                    const meas = a.measurePowerId ? this.dp.getNumber(`ps.act.${safeId}.measureW`, null) : null;
                    const curSet = a.setpointId ? this.dp.getNumber(`ps.act.${safeId}.setpoint`, null) : null;
                    baseline = typeof meas === 'number' ? meas : (typeof curSet === 'number' ? curSet : (typeof a.max === 'number' ? a.max : null));
                } else if (a.mode === 'limitA') {
                    const curSet = a.setpointId ? this.dp.getNumber(`ps.act.${safeId}.setpoint`, null) : null;
                    baseline = typeof curSet === 'number' ? curSet : (typeof a.max === 'number' ? a.max : null);
                } else if (a.mode === 'onOff') {
                    baseline = null;
                }

                baselineEnabled = a.enableId ? this.dp.getBoolean(`ps.act.${safeId}.enable`, null) : null;
                this._baselines.set(safeId, { mode: a.mode, phases, baseline, baselineEnabled });
            }

            if (a.mode === 'onOff') {
                // if we can cover a chunk of remaining, disable the load
                const measW = a.measurePowerId ? this.dp.getNumber(`ps.act.${safeId}.measureW`, null) : null;
                const assumedW = typeof measW === 'number' && measW > 0 ? measW : (typeof a.max === 'number' ? a.max : 0);
                if (assumedW > 0 && remainingW >= assumedW * 0.5) {
                    if (a.enableId) await this.dp.writeBoolean(`ps.act.${safeId}.enable`, false, false);
                    await this.adapter.setStateAsync(`${ch}.target`, 0, true);
                    await this.adapter.setStateAsync(`${ch}.appliedReductionW`, assumedW, true);
                    await this.adapter.setStateAsync(`${ch}.status`, 'disabled', true);
                    await this.adapter.setStateAsync(`${ch}.lastWrite`, Date.now(), true);
                    remainingW -= assumedW;
                } else {
                    await this.adapter.setStateAsync(`${ch}.status`, 'skipped', true);
                }
                continue;
            }

            if (typeof baseline !== 'number' || !Number.isFinite(baseline)) {
                await this.adapter.setStateAsync(`${ch}.status`, 'no_baseline', true);
                continue;
            }

            if (a.mode === 'limitW') {
                const minW = typeof a.min === 'number' ? a.min : 0;
                const maxW = typeof a.max === 'number' ? a.max : baseline;
                const baseW = clamp(baseline, minW, maxW);
                const reducibleW = Math.max(0, baseW - minW);
                const useW = Math.min(remainingW, reducibleW);
                const targetW = baseW - useW;

                if (a.setpointId) await this.dp.writeNumber(`ps.act.${safeId}.setpoint`, targetW, false);
                if (a.enableId) await this.dp.writeBoolean(`ps.act.${safeId}.enable`, targetW > 0, false);

                await this.adapter.setStateAsync(`${ch}.target`, targetW, true);
                await this.adapter.setStateAsync(`${ch}.appliedReductionW`, useW, true);
                await this.adapter.setStateAsync(`${ch}.status`, 'limited', true);
                await this.adapter.setStateAsync(`${ch}.lastWrite`, Date.now(), true);

                remainingW -= useW;
                continue;
            }

            if (a.mode === 'limitA') {
                const minA = typeof a.min === 'number' ? a.min : 0;
                const maxA = typeof a.max === 'number' ? a.max : baseline;
                const baseA = clamp(baseline, minA, maxA);

                const reducibleA = Math.max(0, baseA - minA);
                const reducibleW = reducibleA * vFactor;
                const useW = Math.min(remainingW, reducibleW);
                const useA = useW / vFactor;
                const targetA = baseA - useA;

                if (a.setpointId) await this.dp.writeNumber(`ps.act.${safeId}.setpoint`, targetA, false);
                if (a.enableId) await this.dp.writeBoolean(`ps.act.${safeId}.enable`, targetA > 0, false);

                await this.adapter.setStateAsync(`${ch}.target`, targetA, true);
                await this.adapter.setStateAsync(`${ch}.appliedReductionW`, useW, true);
                await this.adapter.setStateAsync(`${ch}.status`, 'limited', true);
                await this.adapter.setStateAsync(`${ch}.lastWrite`, Date.now(), true);

                remainingW -= useW;
                continue;
            }

            await this.adapter.setStateAsync(`${ch}.status`, 'unsupported_mode', true);
        }
    }

    async _restoreActuators(actuators) {
        const list = (Array.isArray(actuators) ? actuators : [])
            .filter(a => a && a.enabled !== false)
            .map(a => ({
                id: String(a.id || '').trim(),
                mode: String(a.mode || 'limitW'),
                setpointId: String(a.setpointId || '').trim(),
                enableId: String(a.enableId || '').trim(),
            }))
            .filter(a => a.id && (a.setpointId || a.enableId));

        for (const a of list) {
            const safeId = a.id.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64);
            const mem = this._baselines.get(safeId);
            if (!mem) continue;

            if (a.setpointId) await this.dp.upsert({ key: `ps.act.${safeId}.setpoint`, objectId: a.setpointId, dataType: 'number', direction: 'out' });
            if (a.enableId) await this.dp.upsert({ key: `ps.act.${safeId}.enable`, objectId: a.enableId, dataType: 'boolean', direction: 'out' });

            if (typeof mem.baseline === 'number' && Number.isFinite(mem.baseline) && a.setpointId) {
                await this.dp.writeNumber(`ps.act.${safeId}.setpoint`, mem.baseline, false);
            }
            if (a.enableId && typeof mem.baselineEnabled === 'boolean') {
                await this.dp.writeBoolean(`ps.act.${safeId}.enable`, mem.baselineEnabled, false);
            }
        }
        this._baselines.clear();
    }
}

module.exports = { PeakShavingModule };