'use strict';

const { BaseModule } = require('./base');

/**
 * Liest die Tarif-Einstellungen aus der NexoWatt VIS (nexowatt-vis.0.settings.*)
 * und berechnet daraus einen Ladepark-Leistungsdeckel (W), damit Speicher/Ladepark
 * sich nicht gegenseitig aushebeln.
 *
 * Hinweis: Der Deckel wird als Datenpunkt-Schlüssel "cm.tariffBudgetW" bereitgestellt,
 * damit das Ladepark-Management ihn automatisch als Begrenzung nutzen kann.
 */
class TarifVisModule extends BaseModule {
    /**
     * @param {any} adapter
     * @param {*} dpRegistry
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {number} */
        this._lastLimitW = NaN;

        /** @type {boolean} */
        this._warnedManualPriceMissing = false;

        /**
         * SoC-basierte Tarif-Ladehysterese ("günstig"-Fenster):
         * - Start charging when SoC <= start threshold
         * - Stop charging when SoC >= stop threshold
         * - Between start/stop we keep the previous decision to avoid flapping.
         *
         * This avoids "SoC 100%" batteries being continuously requested to charge.
         * (The storage-control already blocks at SoC-max, but this makes the intent
         * explicit and keeps UI/status stable.)
         *
         * @type {boolean}
         */
        this._tariffChargeLatch = false;
    }

    async init() {
        // Eigene Zustände anlegen (nur Diagnose + berechneter Deckel)
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

        await mk('tarif.aktiv', 'Tarif aktiv (VIS)', 'boolean', 'indicator');
        await mk('tarif.modus', 'Tarif Modus (VIS)', 'number', 'value');
        await mk('tarif.preisEurProKwh', 'Tarif Preis (€/kWh, VIS)', 'number', 'value');
        await mk('tarif.prioritaet', 'Priorität Speicher↔Ladepark (VIS)', 'number', 'value');
        await mk('tarif.speicherLeistungW', 'Speicher Leistung (W, VIS)', 'number', 'value.power');
        await mk('tarif.ladeparkMaxW', 'Ladepark Max (W, VIS)', 'number', 'value.power');
        await mk('tarif.ladeparkLimitW', 'Ladepark Limit (W, berechnet)', 'number', 'value.power');
        await mk('tarif.preisGrenzeEurProKwh', 'Tarif Preisgrenze (€/kWh, VIS)', 'number', 'value');
        await mk('tarif.preisAktuellEurProKwh', 'Tarif Preis aktuell (€/kWh, Provider)', 'number', 'value');
        await mk('tarif.preisDurchschnittEurProKwh', 'Tarif Preis Durchschnitt (€/kWh, Provider)', 'number', 'value');
        await mk('tarif.preisRefEurProKwh', 'Tarif Referenzpreis (€/kWh, wirksam)', 'number', 'value');
        await mk('tarif.preisMinEurProKwh', 'Tarif Preis Minimum (€/kWh, Horizon)', 'number', 'value');
        await mk('tarif.preisSchwelleGuensigEurProKwh', 'Tarif Schwelle günstig (€/kWh, min+Band)', 'number', 'value');
        await mk('tarif.naechstesGuensigVon', 'Nächstes günstiges Fenster ab (ISO)', 'string', 'text');
        await mk('tarif.naechstesGuensigBis', 'Nächstes günstiges Fenster bis (ISO)', 'string', 'text');

        await mk('tarif.state', 'Tarif Zustand (günstig/neutral/teuer)', 'string', 'text');
        await mk('tarif.speicherSollW', 'Tarif Sollleistung Speicher (W, berechnet)', 'number', 'value.power');
        await mk('tarif.netzLadenErlaubt', 'Netzladung erlaubt (Tarif-Logik)', 'boolean', 'indicator');
        await mk('tarif.entladenErlaubt', 'Entladen erlaubt (Tarif-Logik)', 'boolean', 'indicator');
        await mk('tarif.statusText', 'Tarif Status (VIS)', 'string', 'text');
        // VIS-Settings als Datenpunkte registrieren (nur wenn dp-Registry vorhanden ist)
        if (this.dp && typeof this.dp.upsert === 'function') {
            const visInst = this._getVisInstance();

            // Eingänge aus der VIS (Tarif-UI)
            await this.dp.upsert({ key: 'vis.settings.dynamicTariff', objectId: `${visInst}.settings.dynamicTariff` });
            await this.dp.upsert({ key: 'vis.settings.tariffMode', objectId: `${visInst}.settings.tariffMode` });
            await this.dp.upsert({ key: 'vis.settings.price', objectId: `${visInst}.settings.price` });
            await this.dp.upsert({ key: 'vis.settings.priority', objectId: `${visInst}.settings.priority` });
            await this.dp.upsert({ key: 'vis.settings.storagePower', objectId: `${visInst}.settings.storagePower` });
            await this.dp.upsert({ key: 'vis.settings.evcsMaxPower', objectId: `${visInst}.settings.evcsMaxPower` });

            // Optional: aktueller Tarifpreis direkt als State-ID (ohne globale DP-Tabelle)
            const priceCurrentId = this._getVisPriceCurrentId();
            if (priceCurrentId) {
                await this.dp.upsert({ key: 'tarif.preisAktuellEurProKwh', objectId: priceCurrentId });
            }

            // Optional: Durchschnittspreis (für Automatik)
            const priceAverageId = this._getVisPriceAverageId();
            if (priceAverageId) {
                await this.dp.upsert({ key: 'tarif.preisDurchschnittEurProKwh', objectId: priceAverageId });
            }

            // Optional: Stundenpreise (für Automatik/Forecast)
            const priceTodayId = this._getVisPriceTodayJsonId();
            if (priceTodayId) {
                await this.dp.upsert({ key: 'tarif.pricesTodayJson', objectId: priceTodayId, dataType: 'string' });
            }

            const priceTomorrowId = this._getVisPriceTomorrowJsonId();
            if (priceTomorrowId) {
                await this.dp.upsert({ key: 'tarif.pricesTomorrowJson', objectId: priceTomorrowId, dataType: 'string' });
            }

            // Ausgabe für das Ladepark-Management (Tarif-Deckel)
            await this.dp.upsert({ key: 'cm.tariffBudgetW', objectId: `${this.adapter.namespace}.tarif.ladeparkLimitW` });

            // Ausgabe: Netzladung erlaubt (Preisfreigabe) für Engine/Consumer
            if (!this.dp.getEntry || !this.dp.getEntry('cm.gridChargeAllowed')) {
                await this.dp.upsert({ key: 'cm.gridChargeAllowed', objectId: `${this.adapter.namespace}.tarif.netzLadenErlaubt` });
            }

            if (!this.dp.getEntry || !this.dp.getEntry('cm.dischargeAllowed')) {
                await this.dp.upsert({ key: 'cm.dischargeAllowed', objectId: `${this.adapter.namespace}.tarif.entladenErlaubt` });
            }
        }
    }

    _getVisInstance() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.vis) ? this.adapter.config.vis : null;
        const inst = (cfg && typeof cfg.instance === 'string') ? cfg.instance.trim() : '';
        return inst || 'nexowatt-vis.0';
    }

    _getTariffHomePath() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const dp = cfg.datapoints || {};
        const base = (typeof dp.tariffHomePath === 'string') ? dp.tariffHomePath.trim() : '';
        return base || '';
    }

    _getVisPriceCurrentId() {
        // WICHTIG: Die Tarif-Datenpunkte werden im Admin unter "Datenpunkte" gepflegt.
        // Dort heißen sie: datapoints.priceCurrent / datapoints.priceAverage.
        // Einige ältere (interne) Builds nutzten vis.priceCurrentId / vis.priceAverageId.
        // Wir unterstützen beides, damit Upgrades ohne Neu-Konfiguration funktionieren.
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};

        const dp = cfg.datapoints || {};
        const idPrimary = (typeof dp.priceCurrent === 'string') ? dp.priceCurrent.trim() : '';
        if (idPrimary) return idPrimary;

        const vis = cfg.vis || {};
        const idLegacy = (typeof vis.priceCurrentId === 'string') ? vis.priceCurrentId.trim() : '';
        if (idLegacy) return idLegacy;

        // Optional: Provider-Basisordner (z. B. tibber.0.Homes.<uuid>)
        // Erwartete Struktur: <base>.CurrentPrice.total
        const base = this._getTariffHomePath();
        if (base) return `${base}.CurrentPrice.total`;

        return '';
    }

    _getVisPriceAverageId() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};

        const dp = cfg.datapoints || {};
        const idPrimary = (typeof dp.priceAverage === 'string') ? dp.priceAverage.trim() : '';
        if (idPrimary) return idPrimary;

        const vis = cfg.vis || {};
        const idLegacy = (typeof vis.priceAverageId === 'string') ? vis.priceAverageId.trim() : '';
        return idLegacy || '';
    }

    _getVisPriceTodayJsonId() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const dp = cfg.datapoints || {};

        const idPrimary = (typeof dp.priceTodayJson === 'string') ? dp.priceTodayJson.trim() : '';
        if (idPrimary) return idPrimary;

        const base = this._getTariffHomePath();
        if (base) return `${base}.PricesToday.json`;

        return '';
    }

    _getVisPriceTomorrowJsonId() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const dp = cfg.datapoints || {};

        const idPrimary = (typeof dp.priceTomorrowJson === 'string') ? dp.priceTomorrowJson.trim() : '';
        if (idPrimary) return idPrimary;

        const base = this._getTariffHomePath();
        if (base) return `${base}.PricesTomorrow.json`;

        return '';
    }

    _num(v, fallback = null) {
        // VIS-Felder (z.B. Strompreis) können je nach Browser/Locale als String
        // mit deutschem Dezimaltrennzeichen kommen: "0,40".
        // Number('0,40') => NaN, daher normalisieren wir robust.
        if (v === null || v === undefined) return fallback;

        if (typeof v === 'string') {
            let s = v.trim();
            if (s === '') return fallback;

            // Entferne Leerzeichen
            s = s.replace(/\s+/g, '');

            // Fälle wie "1.234,56" -> "1234.56" (Tausenderpunkt entfernen, Komma -> Punkt)
            if (s.includes(',') && s.includes('.')) {
                // Heuristik: letztes Vorkommen entscheidet über Dezimaltrennzeichen
                const lastComma = s.lastIndexOf(',');
                const lastDot = s.lastIndexOf('.');
                if (lastComma > lastDot) {
                    s = s.replace(/\./g, '').replace(',', '.');
                }
            } else if (s.includes(',') && !s.includes('.')) {
                // Standard-DE: "0,40" -> "0.40"
                s = s.replace(',', '.');
            }

            const nStr = Number(s);
            if (Number.isFinite(nStr)) return nStr;
        }

        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }

	_normalizePriceEurPerKwh(v, fallback = null) {
		// Normalizes either €/kWh or ct/kWh into €/kWh.
		// Heuristic: values with |v| > 2 are interpreted as ct/kWh (common sources: 31.5, 40, ...).
		let n = (typeof v === 'number') ? v : this._num(v, fallback);
		if (!Number.isFinite(n)) return fallback;

		// Auto-convert ct/kWh -> €/kWh
		const abs = Math.abs(n);
		if (abs > 2 && abs <= 500) {
			n = n / 100;
		}

		// Plausibility (allow small negative prices)
		if (!Number.isFinite(n) || n < -2 || n > 2) return fallback;
		return n;
	}


    _parsePriceCurve(raw) {
        // Accepts either a JSON string or already-parsed array/object.
        // Expected (tibber-like) schema: [{ total: 0.318, startsAt: "...", endsAt: "..." }, ...]
        if (raw === null || raw === undefined) return [];

        let data = raw;
        if (typeof raw === 'string') {
            const s = raw.trim();
            if (!s) return [];
            try {
                data = JSON.parse(s);
            } catch {
                return [];
            }
        }

        // Some adapters wrap the array
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            const arr = data.prices || data.data || data.items || data.values || null;
            if (Array.isArray(arr)) {
                data = arr;
            } else {
                return [];
            }
        }

        if (!Array.isArray(data)) return [];

        const out = [];
        for (const it of data) {
            if (!it || typeof it !== 'object') continue;

            // Price field heuristics
            let pRaw = null;
            if (it.total !== undefined) pRaw = it.total;
            else if (it.price !== undefined) pRaw = it.price;
            else if (it.value !== undefined) pRaw = it.value;
            else if (it.marketprice !== undefined) pRaw = it.marketprice;
            else if (it.marketPrice !== undefined) pRaw = it.marketPrice;
            else if (it.energyPrice !== undefined) pRaw = it.energyPrice;

            if (pRaw === null && it.price && typeof it.price === 'object') {
                // nested objects
                if (it.price.total !== undefined) pRaw = it.price.total;
                else if (it.price.value !== undefined) pRaw = it.price.value;
            }

            const price = this._normalizePriceEurPerKwh(pRaw, null);
            if (typeof price !== 'number' || !Number.isFinite(price)) continue;

            // Time field heuristics
            const startRaw = (it.startsAt !== undefined) ? it.startsAt
                : (it.start !== undefined) ? it.start
                : (it.startTime !== undefined) ? it.startTime
                : (it.from !== undefined) ? it.from
                : (it.begin !== undefined) ? it.begin
                : (it.timestamp !== undefined) ? it.timestamp
                : (it.time !== undefined) ? it.time
                : null;

            let startMs = null;
            if (typeof startRaw === 'number' && Number.isFinite(startRaw)) {
                startMs = (startRaw < 1e12) ? startRaw * 1000 : startRaw;
            } else if (typeof startRaw === 'string') {
                const t = Date.parse(startRaw);
                if (Number.isFinite(t)) startMs = t;
            }
            if (!startMs) continue;

            const endRaw = (it.endsAt !== undefined) ? it.endsAt
                : (it.end !== undefined) ? it.end
                : (it.endTime !== undefined) ? it.endTime
                : (it.to !== undefined) ? it.to
                : (it.until !== undefined) ? it.until
                : null;

            let endMs = null;
            if (typeof endRaw === 'number' && Number.isFinite(endRaw)) {
                endMs = (endRaw < 1e12) ? endRaw * 1000 : endRaw;
            } else if (typeof endRaw === 'string') {
                const t = Date.parse(endRaw);
                if (Number.isFinite(t)) endMs = t;
            }

            // Default: 1 hour
            if (!endMs) endMs = startMs + 60 * 60 * 1000;
            if (endMs <= startMs) endMs = startMs + 60 * 60 * 1000;

            out.push({ startMs, endMs, priceEurKwh: price });
        }

        out.sort((a, b) => a.startMs - b.startMs);
        return out;
    }


    _clamp(n, min, max) {
        if (!Number.isFinite(n)) return n;
        if (Number.isFinite(min)) n = Math.max(min, n);
        if (Number.isFinite(max)) n = Math.min(max, n);
        return n;
    }

    /**
     * Priorität normalisieren:
     *
     * Neue VIS-Logik (Slider, diskret):
     *   1 = Speicher
     *   2 = Auto (Speicher + Ladestation)
     *   3 = Ladestation
     *
     * Legacy-Unterstützung:
     *   0..100 (alt) wird auf 1..3 gemappt:
     *     >= 67  => Speicher
     *     <= 33  => Ladestation
     *     sonst  => Auto
     */
    _normPrioritaet(p) {
        const n = this._num(p, 2);
        if (!Number.isFinite(n)) return 2;
        if (n === 1 || n === 2 || n === 3) return n;

        // Legacy: 0..100
        if (n >= 0 && n <= 100) {
            if (n >= 67) return 1;
            if (n <= 33) return 3;
            return 2;
        }

        // Fallback: runden & clamp
        const r = Math.round(n);
        if (r < 1) return 2;
        if (r > 3) return 2;
        return r;
    }
    /**
     * Debug-Ausgabe mit Drosselung, um Log-Spam zu vermeiden.
     * @param {string} msg
     * @param {number} [intervalMs]
     */
    _debugThrottle(msg, intervalMs = 60000) {
        const now = Date.now();
        const intMs = (Number.isFinite(Number(intervalMs)) && Number(intervalMs) >= 0) ? Number(intervalMs) : 60000;
        if (this._lastDebugMs && intMs > 0 && (now - this._lastDebugMs) < intMs) return;
        this._lastDebugMs = now;
        try {
            this.adapter.log.debug(`[TarifVis] ${String(msg || '')}`);
        } catch {
            // ignore
        }
    }



    async tick() {
        // VIS-Einstellungen sind Konfigurationswerte und müssen dauerhaft gültig bleiben.
        // Wenn diese nach kurzer Zeit als "stale" gelten, fällt die Logik auf Fallbacks zurück
        // (z.B. Manual-Preis = null) und die Tarifsteuerung wirkt "inaktiv".
        const staleTimeoutMs = 365 * 24 * 60 * 60 * 1000; // 1 Jahr
        // Provider-Preise (dynamischer Tarif) sollten regelmäßig aktualisiert werden.
        // Tarif-Werte (aktueller Preis / Durchschnitt) ändern sich i. d. R. stündlich oder täglich.
        // Ein zu kurzes Freshness-Timeout würde die Werte fälschlich als "stale" werten und die Tarif-Logik deaktivieren.
        // Daher großzügig: erst nach 36h ohne Update als ungültig behandeln.
        const providerStaleTimeoutMs = 36 * 60 * 60 * 1000;

        try {
            // --- VIS Settings ---
            const aktiv = this.dp ? this.dp.getBoolean('vis.settings.dynamicTariff', false) : false;
            const aktivAge = this.dp ? this.dp.getAgeMs('vis.settings.dynamicTariff') : null;
            const aktivFresh = (aktivAge === null || aktivAge === undefined) ? true : (aktivAge <= staleTimeoutMs);
            const aktivEff = !!(aktivFresh && aktiv);

            const modusRaw = this.dp ? this.dp.getNumberFresh('vis.settings.tariffMode', staleTimeoutMs, null) : null;
            const modusInt = (typeof modusRaw === 'number' && Number.isFinite(modusRaw)) ? Math.round(modusRaw) : 1;

            const preisGrenzeVisRaw = this.dp ? this.dp.getNumberFresh('vis.settings.price', staleTimeoutMs, null) : null;
            const priorRaw = this.dp ? this.dp.getNumberFresh('vis.settings.priority', staleTimeoutMs, null) : null;
            const storageW = this.dp ? this.dp.getNumberFresh('vis.settings.storagePower', staleTimeoutMs, null) : null;
            const evcsMaxW = this.dp ? this.dp.getNumberFresh('vis.settings.evcsMaxPower', staleTimeoutMs, null) : null;

            const prioritaet = this._normPrioritaet(priorRaw);
            const storagePowerAbsW = Math.max(0, Math.abs(this._num(storageW, 0)));
            const baseW = Math.max(0, Math.abs(this._num(evcsMaxW, 0)));

			// --- Preise (Provider + VIS) ---
                const preisGrenzeVis = this._normalizePriceEurPerKwh(preisGrenzeVisRaw, null);

                // Debug/Transparenz: im Manuellen Modus muss der VIS-Strompreis vorhanden sein.
                // (Sonst fällt die Logik auf Durchschnitt/Fallbacks zurück.)
                if (aktivEff && modusInt === 1) {
                    const missing = (preisGrenzeVis === null || preisGrenzeVis === undefined || !Number.isFinite(preisGrenzeVis));
                    if (missing && !this._warnedManualPriceMissing) {
                        this._warnedManualPriceMissing = true;
                        this.adapter.log.warn(`[TarifVis] Modus=Manuell, aber VIS-Strompreis fehlt/ungültig (vis.settings.price). Bitte in der VIS unter Einstellungen setzen.`);
                    } else if (!missing && this._warnedManualPriceMissing) {
                        this._warnedManualPriceMissing = false;
                        this.adapter.log.info(`[TarifVis] VIS-Strompreis im Modus=Manuell ist wieder gültig: ${preisGrenzeVis} €/kWh`);
                    }
                }

			let preisAktuell = null;
			if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.preisAktuellEurProKwh')) {
				const raw = this.dp.getNumberFresh('tarif.preisAktuellEurProKwh', providerStaleTimeoutMs, null);
				preisAktuell = this._normalizePriceEurPerKwh(raw, null);
			}

			let preisDurchschnitt = null;
			if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.preisDurchschnittEurProKwh')) {
				const raw = this.dp.getNumberFresh('tarif.preisDurchschnittEurProKwh', providerStaleTimeoutMs, null);
				preisDurchschnitt = this._normalizePriceEurPerKwh(raw, null);
			}

			const preisVisOk = (typeof preisGrenzeVis === 'number' && Number.isFinite(preisGrenzeVis));
			const preisAktuellOk = (typeof preisAktuell === 'number' && Number.isFinite(preisAktuell));
			const preisDurchschnittOk = (typeof preisDurchschnitt === 'number' && Number.isFinite(preisDurchschnitt));

			// Debug-Hilfe: Wenn Tarif aktiv ist, aber Provider-Preise fehlen, ist fast immer
			// entweder der Datenpunkt nicht gemappt (Admin → Datenpunkte → Tarif) oder der
			// Provider-Adapter liefert (noch) keine Werte.
			const hasCurveDps = (this.dp && typeof this.dp.getEntry === 'function')
				? (!!this.dp.getEntry('tarif.pricesTodayJson') || !!this.dp.getEntry('tarif.pricesTomorrowJson'))
				: false;

			if (aktivEff && (!preisAktuellOk || (!preisDurchschnittOk && modusInt === 2 && !preisVisOk && !hasCurveDps))) {
				const eCur = (this.dp && typeof this.dp.getEntry === 'function') ? this.dp.getEntry('tarif.preisAktuellEurProKwh') : null;
				const eAvg = (this.dp && typeof this.dp.getEntry === 'function') ? this.dp.getEntry('tarif.preisDurchschnittEurProKwh') : null;
				const idCur = eCur && typeof eCur.objectId === 'string' ? eCur.objectId : '';
				const idAvg = eAvg && typeof eAvg.objectId === 'string' ? eAvg.objectId : '';
				const ageCurMs = (this.dp && typeof this.dp.getAgeMs === 'function') ? this.dp.getAgeMs('tarif.preisAktuellEurProKwh') : null;
				const ageAvgMs = (this.dp && typeof this.dp.getAgeMs === 'function') ? this.dp.getAgeMs('tarif.preisDurchschnittEurProKwh') : null;
				this._debugThrottle(`Tarif: Provider-Preise fehlen/ungültig → aktuell=${preisAktuellOk ? preisAktuell : 'null'} (DP='${idCur}', Alter=${ageCurMs}ms) | Ø=${preisDurchschnittOk ? preisDurchschnitt : 'null'} (DP='${idAvg}', Alter=${ageAvgMs}ms). Prüfe die Zuordnung unter "Datenpunkte → Tarif" und ob die States Werte liefern.`);
			}

            // --- Preis-Kurve (Today/Tomorrow) für Automatik/Forecast ---
            const cfgTariff = (this.adapter && this.adapter.config && this.adapter.config.tariff) ? this.adapter.config.tariff : {};
            const autoBandEur = this._clamp(this._num(cfgTariff.autoBandEur, 0.03), 0, 1);
            const horizonHours = this._clamp(this._num(cfgTariff.horizonHours, 36), 6, 72);
            // Hysterese-Bandbreite um den Referenzpreis für neutral/teuer/guenstig
            // NOTE:
            // - In "Manuell" erwarten Anwender meist eine deutlich feinere Schwelle.
            // - In "Automatisch" (Forecast) darf das Band gröber sein, um Flattern zu vermeiden.
            // Beide Werte sind optional per Adapter-Config überschreibbar.
            const deltaAutoEur = this._clamp(this._num(cfgTariff.deltaEur, 0.02), 0, 1);
            const deltaManualEur = this._clamp(this._num(cfgTariff.manualDeltaEur, 0.005), 0, 1);
            const nowMs = Date.now();
            const horizonEndMs = nowMs + horizonHours * 60 * 60 * 1000;

            let preisMin = null;
            let preisSchwelleGuensig = null;
            let preisDurchschnittCalc = null;
            let nextCheapFromIso = null;
            let nextCheapToIso = null;

            if (aktivEff && modusInt === 2) {
                const rawToday = (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.pricesTodayJson'))
                    ? this.dp.getRaw('tarif.pricesTodayJson')
                    : null;
                const rawTomorrow = (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.pricesTomorrowJson'))
                    ? this.dp.getRaw('tarif.pricesTomorrowJson')
                    : null;

                const todayArr = this._parsePriceCurve(rawToday);
                const tomorrowArr = this._parsePriceCurve(rawTomorrow);

                const all = [...todayArr, ...tomorrowArr]
                    .filter(x => x && Number.isFinite(x.startMs) && Number.isFinite(x.endMs) && Number.isFinite(x.priceEurKwh))
                    .filter(x => x.endMs > nowMs && x.startMs < horizonEndMs)
                    .sort((a, b) => a.startMs - b.startMs);

                if (all.length > 0) {
                    preisMin = Math.min(...all.map(x => x.priceEurKwh));
                    preisSchwelleGuensig = preisMin + autoBandEur;

                    // Durchschnitt über den Planungshorizont (Stundenbasis)
                    preisDurchschnittCalc = all.reduce((s, x) => s + x.priceEurKwh, 0) / all.length;

                    // Nächstes günstiges Fenster (für Forecast/Anzeige)
                    const cheap = all.filter(x => x.priceEurKwh <= preisSchwelleGuensig + 1e-9);
                    if (cheap.length > 0) {
                        const first = cheap[0];
                        let winStart = first.startMs;
                        let winEnd = first.endMs;

                        for (let i = 1; i < cheap.length; i++) {
                            const it = cheap[i];
                            // contiguous hour blocks; allow small tolerance
                            if (it.startMs <= (winEnd + 1000)) {
                                winEnd = Math.max(winEnd, it.endMs);
                            } else {
                                break;
                            }
                        }

                        nextCheapFromIso = new Date(winStart).toISOString();
                        nextCheapToIso = new Date(winEnd).toISOString();
                    }
                }
            }

            const preisDurchschnittEff = preisDurchschnittOk ? preisDurchschnitt
                : (Number.isFinite(preisDurchschnittCalc) ? preisDurchschnittCalc : null);
            const preisDurchschnittEffOk = (typeof preisDurchschnittEff === 'number' && Number.isFinite(preisDurchschnittEff));

            // Referenzpreis (Preisgrenze) – wirksam
            let preisRef = null;
            if (modusInt === 2) {
                // Automatisch: Durchschnittspreis (Fallback: VIS)
                preisRef = preisDurchschnittEffOk ? preisDurchschnittEff : (preisVisOk ? preisGrenzeVis : null);
            } else {
                // Manuell: VIS Preis (Fallback: Durchschnitt)
                preisRef = preisVisOk ? preisGrenzeVis : (preisDurchschnittEffOk ? preisDurchschnittEff : null);
            }

            // --- Tarifzustand (mit Hysterese) ---
            // In Manuell ist das Band kleiner (feinere Schwelle). In Auto darf es größer sein.
            const delta = (modusInt === 1) ? deltaManualEur : deltaAutoEur;

            // IMPORTANT: Hysterese "merkt" sich den letzten Zustand (teuer/neutral/guenstig).
            // Wenn der Benutzer den Modus oder den Referenzpreis ändert, soll die Einstufung
            // sofort neu bewertet werden – sonst bleibt z.B. "teuer" aktiv bis zur Gegenschwelle.
            const lastModus = this._tarifLastModusInt;
            const lastRef = this._tarifLastPreisRef;
            const lastAktiv = this._tarifLastAktivEff;
            const lastDelta = this._tarifLastDeltaEur;
            const refChanged = (typeof lastRef === 'number' && Number.isFinite(lastRef) && typeof preisRef === 'number' && Number.isFinite(preisRef))
                ? (Math.abs(preisRef - lastRef) > 0.0005)
                : (lastRef !== preisRef);
            const modeChanged = (typeof lastModus === 'number') ? (lastModus !== modusInt) : false;
            const aktivChanged = (typeof lastAktiv === 'boolean') ? (lastAktiv !== aktivEff) : false;
            const deltaChanged = (typeof lastDelta === 'number' && Number.isFinite(lastDelta)) ? (Math.abs(delta - lastDelta) > 0.0005) : false;
            if (modeChanged || aktivChanged || refChanged || deltaChanged) {
                this._tarifLastState = 'neutral';
            }
            this._tarifLastModusInt = modusInt;
            this._tarifLastPreisRef = (typeof preisRef === 'number' && Number.isFinite(preisRef)) ? preisRef : preisRef;
            this._tarifLastAktivEff = aktivEff;
            this._tarifLastDeltaEur = delta;

            const preisGrenze = (typeof preisRef === 'number' && Number.isFinite(preisRef)) ? (preisRef + delta) : null;
            let tarifState = 'aus'; // aus | unbekannt | neutral | guenstig | teuer

            if (!aktivEff) {
                tarifState = 'aus';
                this._tarifLastState = 'neutral';
            } else if (!preisAktuellOk) {
                tarifState = 'unbekannt';
                this._tarifLastState = 'neutral';
            } else if (modusInt === 2 && typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) {
                // Auto-Forecast: günstig = innerhalb Band um Minimum (min + autoBandEur)
                const prev = this._tarifLastState || 'neutral';
                const isCheap = (preisAktuell <= (preisSchwelleGuensig + 1e-9));

                let next = 'neutral';
                if (isCheap) {
                    next = 'guenstig';
                } else if (!(typeof preisRef === 'number' && Number.isFinite(preisRef))) {
                    next = 'neutral';
                } else if (prev === 'teuer') {
                    next = (preisAktuell <= (preisRef - delta)) ? 'neutral' : 'teuer';
                } else {
                    next = (preisAktuell >= (preisRef + delta)) ? 'teuer' : 'neutral';
                }

                this._tarifLastState = next;
                tarifState = next;
            } else if (preisRef === null || preisRef === undefined || !Number.isFinite(preisRef)) {
                tarifState = 'unbekannt';
                this._tarifLastState = 'neutral';
            } else {
                // Original: günstig/teuer relativ zum Referenzpreis (Ø oder VIS)
                const prev = this._tarifLastState || 'neutral';
                let next = 'neutral';
                if (prev === 'guenstig') {
                    next = (preisAktuell >= (preisRef + delta)) ? 'neutral' : 'guenstig';
                } else if (prev === 'teuer') {
                    next = (preisAktuell <= (preisRef - delta)) ? 'neutral' : 'teuer';
                } else {
                    if (preisAktuell <= (preisRef - delta)) next = 'guenstig';
                    else if (preisAktuell >= (preisRef + delta)) next = 'teuer';
                    else next = 'neutral';
                }
                this._tarifLastState = next;
                tarifState = next;
            }

            // --- Priorität ---
            // 1 = Speicher | 2 = Auto | 3 = Ladestation
            const allowStorageCheap = (prioritaet === 1 || prioritaet === 2);
            const allowEvcsCheap = (prioritaet === 2 || prioritaet === 3);

            // Speicher-SoC (optional, aus Storage-Mapping / Farm-SoC wenn gemappt)
            const socRaw = this.dp ? this.dp.getNumber('st.socPct', null) : null;
            const storageSocPct = (typeof socRaw === 'number' && Number.isFinite(socRaw))
                ? this._clamp(socRaw, 0, 100)
                : null;

            // Tarif-SoC-Schwellen (Default: Start <= 98%, Stop >= 100%)
            // Ziel: Wenn Speicher bei 100% ist und Tarif weiterhin günstig ist, soll er ruhen (0 W).
            // Gleichzeitig vermeiden wir "Flattern" durch eine Start/Stop-Hysterese.
            let socStartChargePct = this._clamp(this._num(cfgTariff.socStartChargePct, 98), 0, 100);
            let socStopChargePct = this._clamp(this._num(cfgTariff.socStopChargePct, 100), 0, 100);
            if (socStartChargePct > socStopChargePct) {
                const tmp = socStartChargePct;
                socStartChargePct = socStopChargePct;
                socStopChargePct = tmp;
            }

            // Sollleistung Speicher: negativ = Laden, positiv = Entladen
            // Zusätzlich: Im günstigen Tarif-Fenster bei vollem Speicher (SoC=100%) 0 W halten.
            let speicherSollW = 0;
            let storageFullHold = false;
            let storageChargeWanted = false;

            if (aktivEff && storagePowerAbsW > 0) {
                // gewünschtes Verhalten:
                // - günstig  : Speicher laden (nur wenn SoC <= Start), bis SoC >= Stop, dann ruhen (0 W)
                // - neutral/teuer/unbekannt: Speicher entladen (NVP-Regelung)
                if (tarifState === 'guenstig' && allowStorageCheap) {
                    // Default/Fallback: wenn SoC nicht verfügbar ist, verhalte dich wie bisher (laden)
                    storageChargeWanted = true;

                    if (typeof storageSocPct === 'number' && Number.isFinite(storageSocPct)) {
                        // Hysterese / Latch
                        if (this._tariffChargeLatch) {
                            if (storageSocPct >= (socStopChargePct - 1e-9)) {
                                this._tariffChargeLatch = false;
                            }
                        } else {
                            if (storageSocPct <= (socStartChargePct + 1e-9)) {
                                this._tariffChargeLatch = true;
                            }
                        }

                        storageChargeWanted = !!this._tariffChargeLatch;
                        storageFullHold = (!storageChargeWanted) && (storageSocPct >= (socStopChargePct - 1e-9));
                    }

                    speicherSollW = storageChargeWanted ? -storagePowerAbsW : 0;
                } else if (tarifState === 'neutral' || tarifState === 'teuer' || tarifState === 'unbekannt') {
                    // Reset der Lade-Hysterese außerhalb von "günstig"
                    this._tariffChargeLatch = false;
                    storageChargeWanted = false;
                    storageFullHold = false;
                    speicherSollW = storagePowerAbsW;
                } else {
                    // Tarif aus/sonstiges: keine Vorgabe
                    this._tariffChargeLatch = false;
                    storageChargeWanted = false;
                    storageFullHold = false;
                    speicherSollW = 0;
                }
            } else {
                // Wenn Speicher nicht aktiv/konfiguriert ist: Latch zurücksetzen
                this._tariffChargeLatch = false;
                storageChargeWanted = false;
                storageFullHold = false;
                speicherSollW = 0;
            }

            // Netzladen für Ladestationen (globales Gate für Charging-Management):
            // - true wenn Tarif aus (keine Sperre)
            // - false wenn teuer (Netzladen gesperrt; PV-Überschuss ist weiterhin möglich)
            // - true wenn neutral/unbekannt (keine Tarif-Sperre)
            // - bei günstig: nur true, wenn Priorität EVCS zulässt
            let gridChargeAllowed = true;
            if (aktivEff) {
                if (tarifState === 'teuer') {
                    gridChargeAllowed = false;
                } else if (tarifState === 'guenstig') {
                    gridChargeAllowed = allowEvcsCheap ? true : false;
                } else {
                    // neutral oder unbekannt: nicht blockieren (Fallback = weiterlaufen)
                    gridChargeAllowed = true;
                }
            }

            // Entladen-Freigabe (für Speicher-/Assist-Logik):
            // - im günstigen Fenster sperren (Batterie nicht leerfahren)
            // - sonst freigeben
            let dischargeAllowed = true;
            if (aktivEff) {
                dischargeAllowed = (tarifState !== 'guenstig');
            } else {
                dischargeAllowed = true;
            }


            // Ladepark-Limit: Standard = baseW; Reservierung wenn Speicher im Tarif-Fenster lädt
            let limitW = baseW;
            if (aktivEff && tarifState === 'guenstig' && speicherSollW < 0 && baseW > 0) {
                const reserveW = Math.max(0, -speicherSollW);
                const storageShare = (prioritaet === 1) ? 1.0 : (prioritaet === 3) ? 0.0 : 0.5;
                limitW = Math.max(0, Math.round(baseW - (reserveW * storageShare)));
            }

            // --- Diagnose/Transparenz ---
            await this._setIfChanged('tarif.aktiv', aktivEff);
            await this._setIfChanged('tarif.modus', modusInt);
            await this._setIfChanged('tarif.preisEurProKwh', preisVisOk ? preisGrenzeVis : null);
            await this._setIfChanged('tarif.prioritaet', prioritaet);
            await this._setIfChanged('tarif.speicherLeistungW', this._num(storageW, 0));
            await this._setIfChanged('tarif.ladeparkMaxW', this._num(evcsMaxW, 0));

            await this._setIfChanged('tarif.preisAktuellEurProKwh', preisAktuellOk ? preisAktuell : null);
            await this._setIfChanged('tarif.preisDurchschnittEurProKwh', preisDurchschnittEffOk ? preisDurchschnittEff : null);
            // preisRef = wirksame Referenz (Manuell oder Durchschnitt)
            // preisGrenze = obere Schwelle ("teuer" ab ...) = preisRef + delta
            await this._setIfChanged('tarif.preisGrenzeEurProKwh', (preisGrenze !== null && preisGrenze !== undefined && Number.isFinite(preisGrenze)) ? preisGrenze : null);
            await this._setIfChanged('tarif.preisRefEurProKwh', (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null);
            // Forecast/Auto-Min Diagnose (optional)
            await this._setIfChanged('tarif.preisMinEurProKwh', (typeof preisMin === 'number' && Number.isFinite(preisMin)) ? preisMin : null);
            await this._setIfChanged('tarif.preisSchwelleGuensigEurProKwh', (typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) ? preisSchwelleGuensig : null);
            await this._setIfChanged('tarif.naechstesGuensigVon', nextCheapFromIso || null);
            await this._setIfChanged('tarif.naechstesGuensigBis', nextCheapToIso || null);

            await this._setIfChanged('tarif.state', tarifState);
            await this._setIfChanged('tarif.speicherSollW', speicherSollW);
            await this._setIfChanged('tarif.netzLadenErlaubt', gridChargeAllowed);
            await this._setIfChanged('tarif.entladenErlaubt', dischargeAllowed);

            
// Kurz-Status für die VIS (Live-Ansicht)
// Ziel: Kunde sieht sofort, ob Tarif gerade Laden/Entladen triggert.
let statusText = '';
if (aktivEff) {
  const priceCurTxt = (preisAktuellOk && Number.isFinite(preisAktuell))
    ? `${preisAktuell.toFixed(3)} €/kWh`
    : '—';

  const storageCharging = Number.isFinite(speicherSollW) && speicherSollW < 0;
  const storageDischarging = Number.isFinite(speicherSollW) && speicherSollW > 0;

  // Human readable state text (avoid ReferenceError if state is not mapped)
  const tarifStateTxt = (tarifState === 'guenstig')
    ? 'günstig'
    : (tarifState === 'neutral')
      ? 'neutral'
      : (tarifState === 'teuer')
        ? 'teuer'
        : 'unbekannt';

  const base = `Tarif ${tarifStateTxt} (${priceCurTxt})`;

  if (tarifState === 'guenstig') {
    if (prioritaet === 1) {
      if (storageCharging) {
        statusText = `${base}: Speicher lädt`;
      } else if (storageFullHold) {
        statusText = `${base}: Speicher voll – ruht`;
      } else {
        statusText = `${base}: keine Speicher-Ladung`;
      }
    } else if (prioritaet === 3) {
      statusText = gridChargeAllowed ? `${base}: EVCS freigegeben` : `${base}: EVCS gesperrt`;
    } else {
      const parts = [];
      if (storageCharging) parts.push('Speicher lädt');
      else if (storageFullHold) parts.push('Speicher voll (ruht)');
      parts.push(gridChargeAllowed ? 'EVCS freigegeben' : 'EVCS gesperrt');
      statusText = `${base}: ${parts.join(' + ')}`;
    }
  } else if (tarifState === 'teuer') {
    if (prioritaet === 1) {
      statusText = storageDischarging ? `${base}: Speicher entlädt` : `${base}: keine Speicher-Entladung`;
    } else if (prioritaet === 3) {
      statusText = `${base}: EVCS Netzladen gesperrt (PV möglich)`;
    } else {
      const parts = [];
      if (storageDischarging) parts.push('Speicher entlädt');
      parts.push('EVCS Netzladen gesperrt (PV möglich)');
      statusText = `${base}: ${parts.join(' + ')}`;
    }
  } else {
    // neutral / unbekannt / sonstiges
    statusText = storageDischarging
      ? `${base}: Speicher entlädt`
      : `${base}: normal`;
  }
}

await this._setIfChanged('tarif.statusText', statusText);
            await this._setIfChanged('tarif.ladeparkLimitW', limitW);

            // Für andere Module (synchron) bereithalten
            this.adapter._tarifVis = {
                aktiv: aktivEff,
                modus: modusInt,
                prioritaet,
                state: tarifState,
                deltaEur: delta,
                preisAktuell: preisAktuellOk ? preisAktuell : null,
                preisDurchschnitt: preisDurchschnittEffOk ? preisDurchschnittEff : null,
                preisMin: (typeof preisMin === 'number' && Number.isFinite(preisMin)) ? preisMin : null,
                preisSchwelleGuensig: (typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) ? preisSchwelleGuensig : null,
                nextCheapFromIso: nextCheapFromIso || null,
                nextCheapToIso: nextCheapToIso || null,
                autoBandEur: (typeof autoBandEur === 'number' && Number.isFinite(autoBandEur)) ? autoBandEur : null,
                horizonHours: (typeof horizonHours === 'number' && Number.isFinite(horizonHours)) ? horizonHours : null,
                preisRef: (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null,
                speicherSollW,
                // SoC-aware charging (cheap window)
                storageSocPct,
                socStartChargePct,
                socStopChargePct,
                storageChargeWanted,
                storageFullHold,
                gridChargeAllowed,
                dischargeAllowed,
                ladeparkLimitW: limitW,
            };
        } catch (e) {
            const msg = (e && e.message) ? e.message : String(e);
            this.adapter.log.warn(`[TarifVis] Fehler in tick(): ${msg}`);
        }
    }

    async _setIfChanged(id, val) {
        const v = (val === undefined) ? null : val;
        try {
            const cur = await this.adapter.getStateAsync(id);
            const curVal = cur ? cur.val : null;
            if (cur && curVal === v) return;
            await this.adapter.setStateAsync(id, v, true);
        } catch {
            // ignore
        }
    }
}

module.exports = { TarifVisModule };
