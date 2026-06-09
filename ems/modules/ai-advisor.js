'use strict';

const { BaseModule } = require('./base');

function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return n;
    return Math.max(min, Math.min(max, n));
}

function bool(v, fallback = false) {
    if (v === true || v === 1 || v === '1') return true;
    if (v === false || v === 0 || v === '0') return false;
    const s = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
    if (['true', 'on', 'yes', 'ja', 'active', 'an'].includes(s)) return true;
    if (['false', 'off', 'no', 'nein', 'inactive', 'aus'].includes(s)) return false;
    return !!fallback;
}

function finiteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

function round(v, digits = 0) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const p = Math.pow(10, Math.max(0, Math.min(6, Math.round(Number(digits) || 0))));
    return Math.round(n * p) / p;
}

function makeHash(obj) {
    try { return JSON.stringify(obj); } catch { return String(Date.now()); }
}

function formatKw(w) {
    const n = Number(w);
    if (!Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(2) + ' MW';
    if (abs >= 1000) return (n / 1000).toFixed(1) + ' kW';
    return Math.round(n) + ' W';
}

function formatKwh(kwh) {
    const n = Number(kwh);
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + ' MWh';
    return n.toFixed(1) + ' kWh';
}

function formatPrice(eurKwh) {
    const n = Number(eurKwh);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(3) + ' €/kWh';
}

function shortIsoWindow(from, to) {
    const f = String(from || '').trim();
    const t = String(to || '').trim();
    const fmt = (s) => {
        if (!s) return '';
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        const pad2 = (n) => String(n).padStart(2, '0');
        const today = new Date();
        const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const isTomorrow = d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
        const prefix = sameDay ? 'heute ' : (isTomorrow ? 'morgen ' : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}. `);
        return prefix + `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };
    if (f && t) return `${fmt(f)}–${fmt(t).replace(/^heute\s+|^morgen\s+/, '')}`;
    return fmt(f) || fmt(t) || '';
}

/**
 * KI-Energieberater / AI Advisor.
 *
 * This is intentionally advisory-only in the ioBroker UI adapter. It never writes
 * actuator setpoints and only publishes ranked optimization recommendations for
 * the VIS and later reporting/analytics layers.
 */
class AiAdvisorModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._inited = false;
        this._lastRunMs = 0;
        this._lastHash = '';
        this._lastDisabledWriteMs = 0;
    }

    _cfg() {
        const c = (this.adapter && this.adapter.config && this.adapter.config.aiAdvisor && typeof this.adapter.config.aiAdvisor === 'object')
            ? this.adapter.config.aiAdvisor
            : {};
        const cats = (c.categories && typeof c.categories === 'object') ? c.categories : {};
        const minPriority = String(c.minPriority || 'info').trim().toLowerCase();
        let customerEnabled = true;
        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache['settings.aiAdvisorEnabled'] : null;
            customerEnabled = bool(rec && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : true, true);
        } catch (_e) {
            customerEnabled = true;
        }
        const configuredEnabled = c.enabled !== false;
        const showOnLiveCfg = (c.showInLive !== undefined) ? c.showInLive : c.showOnLive;
        return {
            enabled: configuredEnabled && customerEnabled,
            customerEnabled,
            configuredEnabled,
            advisoryOnly: true,
            showInLive: showOnLiveCfg !== false,
            // App-Center writes intervalSec/exportHighW/importHighW/pvForecastHighW.
            // Keep legacy/canonical aliases as well so older configs remain valid.
            minIntervalSec: clamp(num(c.minIntervalSec ?? c.intervalSec, 60), 10, 3600),
            maxSuggestions: clamp(num(c.maxSuggestions, 4), 1, 8),
            minPriority: ['info', 'warning', 'action', 'critical'].includes(minPriority) ? minPriority : 'info',
            pvSurplusThresholdW: clamp(num(c.pvSurplusThresholdW ?? c.exportHighW, 1500), 0, 1000000),
            highImportThresholdW: clamp(num(c.highImportThresholdW ?? c.importHighW, 3000), 0, 10000000),
            lowSocPct: clamp(num(c.lowSocPct, 25), 0, 100),
            highSocPct: clamp(num(c.highSocPct, 85), 0, 100),
            minSocForDischargePct: clamp(num(c.minSocForDischargePct, 35), 0, 100),
            pvForecastMinKwh: clamp(num(c.pvForecastMinKwh, 5), 0, 100000),
            pvPeakMinW: clamp(num(c.pvPeakMinW ?? c.pvForecastHighW, 3000), 0, 10000000),
            cheapPriceMarginEurKwh: clamp(num(c.cheapPriceMarginEurKwh, 0.03), 0, 10),
            expensivePriceMarginEurKwh: clamp(num(c.expensivePriceMarginEurKwh, 0.05), 0, 10),
            staleTimeoutSec: clamp(num(c.staleTimeoutSec, 300), 30, 86400),
            includeInstallerHints: c.includeInstallerHints !== false,
            categories: {
                tariff: cats.tariff !== false,
                pv: cats.pv !== false,
                storage: cats.storage !== false,
                evcs: cats.evcs !== false,
                peak: cats.peak !== false,
                heating: cats.heating !== false,
                system: cats.system !== false,
            },
        };
    }

    async init() {
        if (this._inited) return;
        await this._ensureStates();
        this._inited = true;
    }

    async _ensureStates() {
        const a = this.adapter;
        await a.setObjectNotExistsAsync('aiAdvisor', {
            type: 'channel',
            common: { name: 'KI-Energieberater' },
            native: {},
        });

        await a.setObjectNotExistsAsync('aiAdvisor.suggestions', {
            type: 'channel',
            common: { name: 'KI-Energieberater Vorschläge' },
            native: {},
        });

        const mk = async (id, name, type, role, unit = undefined) => {
            await a.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: false,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('aiAdvisor.enabled', 'KI-Energieberater aktiv', 'boolean', 'indicator');
        await mk('aiAdvisor.advisoryOnly', 'Nur Beratung, keine Schaltentscheidungen', 'boolean', 'indicator');
        await mk('aiAdvisor.showInLive', 'In LIVE anzeigen', 'boolean', 'indicator');
        // Compatibility alias: App-Center and older VIS builds used "showOnLive".
        await mk('aiAdvisor.showOnLive', 'In LIVE anzeigen', 'boolean', 'indicator');
        await mk('aiAdvisor.status', 'Status', 'string', 'text');
        await mk('aiAdvisor.severity', 'Höchste Priorität / Severity', 'string', 'text');
        await mk('aiAdvisor.headline', 'Kurz-Hinweis', 'string', 'text');
        await mk('aiAdvisor.summary', 'Zusammenfassung', 'string', 'text');
        await mk('aiAdvisor.count', 'Anzahl Vorschläge', 'number', 'value');
        await mk('aiAdvisor.score', 'Optimierungs-Score', 'number', 'value', '%');
        await mk('aiAdvisor.topTitle', 'Top-Vorschlag Titel', 'string', 'text');
        await mk('aiAdvisor.topText', 'Top-Vorschlag Text', 'string', 'text');
        await mk('aiAdvisor.topAction', 'Top-Vorschlag Handlung', 'string', 'text');
        await mk('aiAdvisor.topWindow', 'Top-Vorschlag Zeitfenster', 'string', 'text');
        await mk('aiAdvisor.suggestionsJson', 'Vorschläge JSON', 'string', 'json');
        await mk('aiAdvisor.snapshotJson', 'KI-Energieberater Snapshot JSON', 'string', 'json');
        await mk('aiAdvisor.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time');
        await mk('aiAdvisor.nextUpdate', 'Nächste Aktualisierung', 'number', 'value.time');

        for (let i = 1; i <= 5; i++) {
            await a.setObjectNotExistsAsync(`aiAdvisor.suggestions.${i}`, {
                type: 'channel',
                common: { name: `Vorschlag ${i}` },
                native: {},
            });
            await mk(`aiAdvisor.suggestions.${i}.title`, `Vorschlag ${i} Titel`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.text`, `Vorschlag ${i} Text`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.action`, `Vorschlag ${i} Handlung`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.severity`, `Vorschlag ${i} Severity`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.category`, `Vorschlag ${i} Kategorie`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.window`, `Vorschlag ${i} Zeitfenster`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.impact`, `Vorschlag ${i} Wirkung`, 'string', 'text');
        }
    }

    async _readState(localId, fallback = null) {
        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[localId] : null;
            if (rec && rec.value !== undefined && rec.value !== null) return rec.value;
        } catch (_e) {}
        try {
            const st = await this.adapter.getStateAsync(localId);
            if (st && st.val !== undefined && st.val !== null) return st.val;
        } catch (_e2) {}
        return fallback;
    }

    async _readNumber(keys, fallback = null) {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
            const v = await this._readState(k, null);
            if (v === null || v === undefined) continue;
            if (typeof v === 'string' && v.trim() === '') continue;
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        return fallback;
    }

    async _readString(keys, fallback = '') {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
            const v = await this._readState(k, null);
            if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
        }
        return fallback;
    }

    async _readBool(keys, fallback = false) {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
            const v = await this._readState(k, null);
            if (v !== null && v !== undefined) return bool(v, fallback);
        }
        return fallback;
    }

    async _snapshot() {
        const gridRawW = await this._readNumber(['ems.gridPowerRawW', 'grid.powerRawW', 'gridPointPower'], null);
        const gridW = await this._readNumber(['ems.budget.gridW', 'ems.gridPowerW', 'grid.powerW'], gridRawW || 0);
        const gridImportW = await this._readNumber(['ems.budget.gridImportW', 'gridBuyPower'], Math.max(0, num(gridRawW, gridW || 0)));
        const gridExportW = await this._readNumber(['ems.budget.gridExportW', 'gridSellPower'], Math.max(0, -(num(gridRawW, gridW || 0))));
        const pvPowerW = await this._readNumber(['ems.budget.pvPowerW', 'derived.core.pv.totalW', 'pvPower', 'productionTotal'], 0);
        const pvBudgetW = await this._readNumber(['ems.budget.pvBudgetW', 'ems.budget.remainingPvW'], 0);

        const storageSocPct = await this._readNumber(['storageFarm.totalSoc', 'speicher.regelung.socPct', 'storageSoc'], null);
        const storageChargeW = await this._readNumber(['ems.budget.storageChargeW', 'storageFarm.totalChargePowerW', 'storageChargePower'], 0);
        const storageDischargeW = await this._readNumber(['ems.budget.storageDischargeW', 'storageFarm.totalDischargePowerW', 'storageDischargePower'], 0);

        const evcsUsedW = await this._readNumber(['chargingManagement.control.usedW', 'evcs.totalPowerW', 'consumptionEvcs'], 0);
        const thermalUsedW = await this._readNumber(['thermal.summary.budgetUsedW'], 0);
        const heatingRodUsedW = await this._readNumber(['heatingRod.summary.budgetUsedW'], 0);

        const tariffActive = await this._readBool(['tarif.aktiv', 'ems.budget.tariff.active'], false);
        const tariffState = await this._readString(['tarif.state', 'ems.budget.tariff.state'], '');
        const priceNow = await this._readNumber(['tarif.preisAktuellEurProKwh', 'ems.budget.tariff.currentPriceEurKwh'], null);
        const priceAvg = await this._readNumber(['tarif.preisDurchschnittEurProKwh'], null);
        const priceCheapThreshold = await this._readNumber(['tarif.preisSchwelleGuensigEurProKwh'], null);
        const nextCheapFrom = await this._readString(['tarif.naechstesGuensigVon'], '');
        const nextCheapTo = await this._readString(['tarif.naechstesGuensigBis'], '');
        const negativeActive = await this._readBool(['tarif.negativpreisAktiv', 'ems.budget.tariff.negativeActive'], false);
        const gridImportPreferred = await this._readBool(['tarif.netzbezugBevorzugt', 'ems.budget.tariff.gridImportPreferred'], negativeActive);

        const pvForecastUsable = await this._readBool(['ems.budget.forecast.usable', 'forecast.pv.valid'], false);
        const pvKwh6 = await this._readNumber(['ems.budget.forecast.kwhNext6h', 'forecast.pv.kwhNext6h'], 0);
        const pvKwh12 = await this._readNumber(['ems.budget.forecast.kwhNext12h', 'forecast.pv.kwhNext12h'], 0);
        const pvKwh24 = await this._readNumber(['ems.budget.forecast.kwhNext24h', 'forecast.pv.kwhNext24h'], 0);
        const pvPeak24W = await this._readNumber(['ems.budget.forecast.peakNext24h', 'forecast.pv.peakWNext24h'], 0);

        const peakActive = await this._readBool(['peakShaving.control.active'], false);
        const peakLimitW = await this._readNumber(['peakShaving.control.limitW', 'ems.core.gridImportLimitW_effective'], null);
        const peakOverW = await this._readNumber(['peakShaving.control.overW'], 0);
        const hlzfActive = await this._readBool(['peakShaving.atypical.activeWindow'], false);
        const para14aActive = await this._readBool(['para14a.active', 'ems.core.para14aActive'], false);

        return {
            ts: Date.now(),
            gridRawW,
            gridW,
            gridImportW: Math.max(0, num(gridImportW, 0)),
            gridExportW: Math.max(0, num(gridExportW, 0)),
            pvPowerW: Math.max(0, num(pvPowerW, 0)),
            pvBudgetW: Math.max(0, num(pvBudgetW, 0)),
            storageSocPct: finiteNumber(storageSocPct) ? storageSocPct : null,
            storageChargeW: Math.max(0, num(storageChargeW, 0)),
            storageDischargeW: Math.max(0, num(storageDischargeW, 0)),
            evcsUsedW: Math.max(0, num(evcsUsedW, 0)),
            thermalUsedW: Math.max(0, num(thermalUsedW, 0)),
            heatingRodUsedW: Math.max(0, num(heatingRodUsedW, 0)),
            tariffActive,
            tariffState,
            priceNow,
            priceAvg,
            priceCheapThreshold,
            nextCheapFrom,
            nextCheapTo,
            negativeActive,
            gridImportPreferred,
            pvForecastUsable,
            pvKwh6: Math.max(0, num(pvKwh6, 0)),
            pvKwh12: Math.max(0, num(pvKwh12, 0)),
            pvKwh24: Math.max(0, num(pvKwh24, 0)),
            pvPeak24W: Math.max(0, num(pvPeak24W, 0)),
            peakActive,
            peakLimitW,
            peakOverW: Math.max(0, num(peakOverW, 0)),
            hlzfActive,
            para14aActive,
        };
    }

    _pushSuggestion(list, item) {
        if (!item || !item.id) return;
        const severityWeight = { critical: 5, warning: 4, success: 3, info: 2, neutral: 1 };
        list.push({
            id: String(item.id),
            category: String(item.category || 'general'),
            severity: String(item.severity || 'info'),
            priority: Math.max(0, Math.round(Number(item.priority) || 0)),
            title: String(item.title || ''),
            text: String(item.text || ''),
            action: String(item.action || ''),
            reason: String(item.reason || ''),
            window: String(item.window || ''),
            impact: String(item.impact || ''),
            confidence: clamp(num(item.confidence, 70), 0, 100),
            icon: String(item.icon || '💡'),
            rankWeight: (Number(item.priority) || 0) + (severityWeight[String(item.severity || 'info')] || 1),
        });
    }

    _buildSuggestions(s, cfg) {
        const out = [];
        const tariffState = String(s.tariffState || '').toLowerCase();
        const currentCheap = !!(
            s.negativeActive ||
            s.gridImportPreferred ||
            tariffState.includes('günstig') || tariffState.includes('guenstig') || tariffState.includes('cheap') ||
            (finiteNumber(s.priceNow) && finiteNumber(s.priceCheapThreshold) && s.priceNow <= s.priceCheapThreshold) ||
            (finiteNumber(s.priceNow) && finiteNumber(s.priceAvg) && s.priceNow <= (s.priceAvg - cfg.cheapPriceMarginEurKwh))
        );
        const currentExpensive = !!(
            tariffState.includes('teuer') || tariffState.includes('expensive') ||
            (finiteNumber(s.priceNow) && finiteNumber(s.priceAvg) && s.priceNow >= (s.priceAvg + cfg.expensivePriceMarginEurKwh))
        );
        const hasStorage = s.storageSocPct !== null;
        const storageEnough = !hasStorage || s.storageSocPct >= cfg.minSocForDischargePct;
        const hasFlexibleLoad = (s.evcsUsedW > 100 || s.thermalUsedW > 100 || s.heatingRodUsedW > 100)
            || !!(this.adapter && this.adapter.config && (this.adapter.config.enableChargingManagement || this.adapter.config.enableThermalControl || this.adapter.config.enableHeatingRodControl));

        if (s.negativeActive || s.gridImportPreferred) {
            this._pushSuggestion(out, {
                id: 'negative-price-window',
                category: 'tariff',
                severity: 'success',
                priority: 98,
                icon: '🟢',
                title: 'Negativpreis-Fenster nutzen',
                text: `Der Tarif bevorzugt aktuell Netzbezug${finiteNumber(s.priceNow) ? ` (${formatPrice(s.priceNow)})` : ''}. Flexible Verbraucher können jetzt wirtschaftlich laufen, solange Netz- und Peak-Limits eingehalten werden.`,
                action: 'Wallbox, Speicher-Netzladung oder Wärmelast jetzt freigeben, falls der Nutzer das möchte.',
                window: 'jetzt',
                impact: 'Kostenoptimierung',
                confidence: 90,
            });
        } else if (currentCheap) {
            this._pushSuggestion(out, {
                id: 'cheap-tariff-now',
                category: 'tariff',
                severity: 'success',
                priority: 88,
                icon: '💶',
                title: 'Günstiges Tariffenster aktiv',
                text: `Der Strompreis ist günstig${finiteNumber(s.priceNow) ? ` (${formatPrice(s.priceNow)})` : ''}. Verschiebbare Lasten sind jetzt wirtschaftlicher als in teuren Zeiten.`,
                action: 'EV-Laden, Warmwasser/Heizstab oder Speicherladung bevorzugt in dieses Fenster legen.',
                window: 'jetzt',
                impact: 'Energiekosten senken',
                confidence: 82,
            });
        } else if (s.tariffActive && s.nextCheapFrom) {
            this._pushSuggestion(out, {
                id: 'next-cheap-window',
                category: 'tariff',
                severity: 'info',
                priority: 62,
                icon: '⏱️',
                title: 'Nächstes günstiges Zeitfenster vormerken',
                text: `Das nächste günstige Tariffenster liegt bei ${shortIsoWindow(s.nextCheapFrom, s.nextCheapTo) || 'demnächst'}.`,
                action: 'Planbare Verbraucher möglichst in dieses Fenster verschieben.',
                window: shortIsoWindow(s.nextCheapFrom, s.nextCheapTo),
                impact: 'Lastverschiebung',
                confidence: 75,
            });
        }

        if (currentExpensive) {
            this._pushSuggestion(out, {
                id: 'expensive-tariff-reduce-load',
                category: 'tariff',
                severity: 'warning',
                priority: storageEnough ? 90 : 82,
                icon: '🟠',
                title: 'Teures Tariffenster — Verbrauch reduzieren',
                text: `Der Tarif ist aktuell teuer${finiteNumber(s.priceNow) ? ` (${formatPrice(s.priceNow)})` : ''}. Große flexible Verbraucher sollten möglichst warten.`,
                action: storageEnough ? 'Speicherentladung nutzen und EV/Heizstab nach hinten schieben.' : 'EV/Heizstab nach hinten schieben; Speicherreserve ist niedrig.',
                window: 'jetzt vermeiden',
                impact: 'Kosten vermeiden',
                confidence: 82,
            });
        }

        const surplusW = Math.max(s.gridExportW, s.pvBudgetW);
        if (surplusW >= cfg.pvSurplusThresholdW) {
            this._pushSuggestion(out, {
                id: 'pv-surplus-use-now',
                category: 'pv',
                severity: 'success',
                priority: 86,
                icon: '☀️',
                title: 'PV-Überschuss jetzt nutzen',
                text: `Es stehen etwa ${formatKw(surplusW)} PV-/Einspeiseüberschuss zur Verfügung.`,
                action: hasFlexibleLoad ? 'Wallbox, Heizstab oder Wärmelast bevorzugt jetzt starten.' : 'Flexible Verbraucher einplanen oder zusätzliche Verbraucher im App-Center anbinden.',
                window: 'jetzt',
                impact: 'Eigenverbrauch erhöhen',
                confidence: 88,
            });
        }

        if (s.pvForecastUsable && (s.pvKwh24 >= cfg.pvForecastMinKwh || s.pvPeak24W >= cfg.pvPeakMinW)) {
            let prio = 58;
            let title = 'PV-Ertrag vorausplanen';
            let action = `Morgen/innerhalb 24h werden etwa ${formatKwh(s.pvKwh24)} erwartet — flexible Lasten in die PV-Zeit legen.`;
            let severity = 'info';
            if (hasStorage && s.storageSocPct >= cfg.highSocPct) {
                title = 'PV-Speicher-Headroom freihalten';
                action = `Der Speicher ist bei ${round(s.storageSocPct, 0)} %. Bei erwartetem PV-Ertrag von ${formatKwh(s.pvKwh24)} sollte Netzladung vermieden und Platz für PV gelassen werden.`;
                prio = 74;
            } else if (hasStorage && s.storageSocPct <= cfg.lowSocPct) {
                title = 'Speicherreserve und PV-Fenster abstimmen';
                action = `Der Speicher ist niedrig (${round(s.storageSocPct, 0)} %). PV-Ertrag ist angekündigt; Reserve prüfen und größere Verbraucher bis zur PV-Zeit verschieben.`;
                prio = 72;
                severity = 'warning';
            }
            this._pushSuggestion(out, {
                id: 'pv-forecast-plan',
                category: 'forecast',
                severity,
                priority: prio,
                icon: '🔮',
                title,
                text: `PV-Prognose: ${formatKwh(s.pvKwh6)} in 6h, ${formatKwh(s.pvKwh24)} in 24h${s.pvPeak24W > 0 ? `, Peak ${formatKw(s.pvPeak24W)}` : ''}.`,
                action,
                window: 'nächste 24h',
                impact: 'PV-Nutzung planen',
                confidence: 76,
            });
        }

        if (s.peakActive || s.hlzfActive || s.peakOverW > 0) {
            this._pushSuggestion(out, {
                id: 'peak-window-protect',
                category: 'peak',
                severity: s.peakOverW > 0 ? 'critical' : 'warning',
                priority: 96,
                icon: '⚡',
                title: s.hlzfActive ? 'Hochlastzeitfenster aktiv' : 'Peak-Shaving aktiv',
                text: s.peakOverW > 0
                    ? `Aktuell liegt der Netzbezug etwa ${formatKw(s.peakOverW)} über dem Limit.`
                    : `Der Netzbezug wird aktuell durch ${s.hlzfActive ? 'HLZF/§19' : 'Peak-Shaving'} begrenzt${finiteNumber(s.peakLimitW) ? ` (Limit ${formatKw(s.peakLimitW)})` : ''}.`,
                action: 'EV-Laden, Heizstab und andere flexible Lasten pausieren oder reduzieren, bis das Fenster vorbei ist.',
                window: 'jetzt',
                impact: 'Leistungspreis / Netzlimit schützen',
                confidence: 90,
            });
        }

        if (s.para14aActive) {
            this._pushSuggestion(out, {
                id: 'para14a-active',
                category: 'grid',
                severity: 'warning',
                priority: 84,
                icon: '🚦',
                title: '§14a-Leistungsbegrenzung aktiv',
                text: 'Der Netzbetreiber-/EMS-Deckel für steuerbare Verbraucher ist aktiv.',
                action: 'Komfortverbraucher priorisieren und nicht notwendige Verbraucher verschieben.',
                window: 'jetzt',
                impact: 'Netzvorgabe einhalten',
                confidence: 85,
            });
        }

        if (hasStorage && s.storageSocPct <= cfg.lowSocPct) {
            this._pushSuggestion(out, {
                id: 'storage-low-reserve',
                category: 'storage',
                severity: 'warning',
                priority: 78,
                icon: '🔋',
                title: 'Speicherreserve niedrig',
                text: `Der Speicher liegt bei ${round(s.storageSocPct, 0)} %.`,
                action: 'Reservegrenze prüfen; flexible Lasten eher in PV- oder günstige Tariffenster verschieben.',
                window: 'bis Reserve erholt ist',
                impact: 'Reserve schützen',
                confidence: 80,
            });
        }

        if (s.gridImportW >= cfg.highImportThresholdW && !currentCheap && !s.negativeActive) {
            this._pushSuggestion(out, {
                id: 'high-grid-import',
                category: 'grid',
                severity: 'warning',
                priority: 70,
                icon: '📉',
                title: 'Hoher Netzbezug erkannt',
                text: `Aktuell werden etwa ${formatKw(s.gridImportW)} aus dem Netz bezogen.`,
                action: 'Nicht dringende Verbraucher verschieben; bei Speicher prüfen, ob Entladen freigegeben ist.',
                window: 'jetzt',
                impact: 'Netzbezug senken',
                confidence: 72,
            });
        }

        if (cfg.includeInstallerHints && !s.tariffActive && !finiteNumber(s.priceNow)) {
            this._pushSuggestion(out, {
                id: 'setup-tariff',
                category: 'setup',
                severity: 'info',
                priority: 30,
                icon: '🧭',
                title: 'Dynamischen Tarif anbinden',
                text: 'Für bessere Zeitvorschläge fehlt aktuell ein frisches Preis-/Tarifsignal.',
                action: 'Im App-Center Tarife/Preisprognose zuordnen.',
                window: 'Setup',
                impact: 'KI-Beratung verbessern',
                confidence: 70,
            });
        }

        if (cfg.includeInstallerHints && !s.pvForecastUsable) {
            this._pushSuggestion(out, {
                id: 'setup-pv-forecast',
                category: 'setup',
                severity: 'info',
                priority: 28,
                icon: '☀️',
                title: 'PV-Forecast aktivieren',
                text: 'Für vorausschauende Empfehlungen fehlt eine nutzbare PV-Prognose.',
                action: 'PV-Forecast im App-Center einrichten, damit Verbraucher zeitlich besser geplant werden können.',
                window: 'Setup',
                impact: 'Prognosequalität erhöhen',
                confidence: 70,
            });
        }

        const seen = new Set();
        const deduped = [];
        for (const s0 of out.sort((a, b) => (b.rankWeight - a.rankWeight) || (b.priority - a.priority))) {
            if (seen.has(s0.id)) continue;
            seen.add(s0.id);
            const clean = Object.assign({}, s0);
            delete clean.rankWeight;
            deduped.push(clean);
        }

        const minPriorityMap = { info: 0, warning: 60, action: 75, critical: 90 };
        const minPrio = minPriorityMap[cfg.minPriority] || 0;
        const categoryAllowed = (item) => {
            const cat = String(item && item.category || 'system').toLowerCase();
            const cats = cfg.categories || {};
            if (cat === 'tariff') return cats.tariff !== false;
            if (cat === 'pv' || cat === 'forecast') return cats.pv !== false;
            if (cat === 'storage') return cats.storage !== false;
            if (cat === 'evcs') return cats.evcs !== false;
            if (cat === 'peak') return cats.peak !== false;
            if (cat === 'heating' || cat === 'thermal') return cats.heating !== false;
            if (cat === 'grid' || cat === 'setup' || cat === 'system' || cat === 'general') return cats.system !== false;
            return true;
        };
        let filtered = deduped.filter((item) => categoryAllowed(item) && (Number(item.priority) || 0) >= minPrio);

        if (!filtered.length) {
            this._pushSuggestion(filtered, {
                id: 'system-balanced',
                category: 'system',
                severity: 'success',
                priority: 20,
                icon: '✅',
                title: 'System läuft wirtschaftlich unauffällig',
                text: 'Aktuell erkennt der KI-Energieberater keine dringende Optimierung.',
                action: 'Weiter beobachten; größere Verbraucher möglichst in PV- oder günstige Tariffenster legen.',
                window: 'laufend',
                impact: 'Monitoring',
                confidence: 65,
            });
            filtered = filtered.filter((item) => categoryAllowed(item));
        }

        return filtered.map((item) => { const clean = Object.assign({}, item); delete clean.rankWeight; return clean; }).slice(0, cfg.maxSuggestions);
    }

    _score(snapshot, suggestions) {
        let score = 78;
        const maxSeverity = (suggestions || [])[0] ? String(suggestions[0].severity || '') : '';
        if (maxSeverity === 'critical') score -= 28;
        else if (maxSeverity === 'warning') score -= 15;
        else if (maxSeverity === 'success') score += 8;
        if (snapshot.gridExportW > 2500) score -= 5;
        if (snapshot.gridImportW > 5000) score -= 8;
        if (snapshot.pvForecastUsable) score += 4;
        if (snapshot.tariffActive || finiteNumber(snapshot.priceNow)) score += 4;
        if (snapshot.storageSocPct !== null && snapshot.storageSocPct < 15) score -= 8;
        return clamp(Math.round(score), 0, 100);
    }

    async _set(localId, value) {
        try { await this.adapter.setStateAsync(localId, { val: value, ack: true }); } catch (_e) {}
        try { if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue(localId, value, Date.now()); } catch (_e2) {}
    }

    async _publishDisabled(cfg, now) {
        if ((now - (this._lastDisabledWriteMs || 0)) < 60000) return;
        this._lastDisabledWriteMs = now;
        await this._set('aiAdvisor.enabled', false);
        await this._set('aiAdvisor.advisoryOnly', true);
        await this._set('aiAdvisor.showInLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.showOnLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.status', 'disabled');
        await this._set('aiAdvisor.severity', 'neutral');
        await this._set('aiAdvisor.headline', 'KI-Energieberater deaktiviert');
        await this._set('aiAdvisor.summary', cfg.customerEnabled === false ? 'Die beratende KI ist in den Kundeneinstellungen deaktiviert.' : 'Die beratende KI ist im App-Center deaktiviert.');
        await this._set('aiAdvisor.count', 0);
        await this._set('aiAdvisor.score', 0);
        await this._set('aiAdvisor.topTitle', '');
        await this._set('aiAdvisor.topText', '');
        await this._set('aiAdvisor.topAction', '');
        await this._set('aiAdvisor.topWindow', '');
        await this._set('aiAdvisor.suggestionsJson', '[]');
        await this._set('aiAdvisor.snapshotJson', JSON.stringify({ ts: now, enabled: false }));
        await this._set('aiAdvisor.lastUpdate', now);
        await this._set('aiAdvisor.nextUpdate', now + 60000);
    }

    async _publish(snapshot, suggestions, cfg) {
        const now = Date.now();
        const top = suggestions && suggestions.length ? suggestions[0] : null;
        const score = this._score(snapshot, suggestions);
        const severity = top ? String(top.severity || 'info') : 'neutral';
        const headline = top ? `${top.icon || '💡'} ${top.title}` : 'KI-Energieberater bereit';
        const summary = top ? String(top.text || '') : 'Keine aktuellen Hinweise.';
        const jsonSuggestions = JSON.stringify(suggestions || []);
        const snap = {
            ts: now,
            enabled: true,
            advisoryOnly: true,
            showInLive: cfg.showInLive !== false,
            status: 'ok',
            score,
            severity,
            top,
            suggestions,
            raw: snapshot,
        };
        const hash = makeHash({ suggestions, score, severity, show: cfg.showInLive });

        // Even if content is unchanged, refresh timestamps periodically for stale diagnostics.
        const contentChanged = hash !== this._lastHash;
        this._lastHash = hash;

        await this._set('aiAdvisor.enabled', true);
        await this._set('aiAdvisor.advisoryOnly', true);
        await this._set('aiAdvisor.showInLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.showOnLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.status', 'ok');
        await this._set('aiAdvisor.severity', severity);
        await this._set('aiAdvisor.headline', headline);
        await this._set('aiAdvisor.summary', summary);
        await this._set('aiAdvisor.count', Array.isArray(suggestions) ? suggestions.length : 0);
        await this._set('aiAdvisor.score', score);
        await this._set('aiAdvisor.topTitle', top ? top.title : '');
        await this._set('aiAdvisor.topText', top ? top.text : '');
        await this._set('aiAdvisor.topAction', top ? top.action : '');
        await this._set('aiAdvisor.topWindow', top ? top.window : '');
        if (contentChanged) {
            await this._set('aiAdvisor.suggestionsJson', jsonSuggestions);
            await this._set('aiAdvisor.snapshotJson', JSON.stringify(snap));
        } else {
            // keep JSON in stateCache fresh after restarts even if identical writes are skipped by ioBroker internals
            try { if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue('aiAdvisor.suggestionsJson', jsonSuggestions, now); } catch (_e) {}
            try { if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue('aiAdvisor.snapshotJson', JSON.stringify(snap), now); } catch (_e) {}
        }
        await this._set('aiAdvisor.lastUpdate', now);
        await this._set('aiAdvisor.nextUpdate', now + Math.round(cfg.minIntervalSec * 1000));

        for (let i = 1; i <= 5; i++) {
            const s = (Array.isArray(suggestions) && suggestions[i - 1]) ? suggestions[i - 1] : null;
            await this._set(`aiAdvisor.suggestions.${i}.title`, s ? s.title : '');
            await this._set(`aiAdvisor.suggestions.${i}.text`, s ? s.text : '');
            await this._set(`aiAdvisor.suggestions.${i}.action`, s ? s.action : '');
            await this._set(`aiAdvisor.suggestions.${i}.severity`, s ? s.severity : '');
            await this._set(`aiAdvisor.suggestions.${i}.category`, s ? s.category : '');
            await this._set(`aiAdvisor.suggestions.${i}.window`, s ? s.window : '');
            await this._set(`aiAdvisor.suggestions.${i}.impact`, s ? s.impact : '');
        }
    }

    async tick() {
        if (!this._inited) await this.init();
        const cfg = this._cfg();
        const now = Date.now();

        if (!cfg.enabled) {
            await this._publishDisabled(cfg, now);
            return;
        }

        const minMs = Math.max(10000, Math.round(cfg.minIntervalSec * 1000));
        if (this._lastRunMs && (now - this._lastRunMs) < minMs) return;
        this._lastRunMs = now;

        const snapshot = await this._snapshot();
        const suggestions = this._buildSuggestions(snapshot, cfg);
        await this._publish(snapshot, suggestions, cfg);
    }
}

module.exports = { AiAdvisorModule };
