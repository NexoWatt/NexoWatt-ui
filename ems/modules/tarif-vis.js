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
     * @param {import('@iobroker/adapter-core').AdapterInstance} adapter
     * @param {*} dpRegistry
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {number} */
        this._lastLimitW = NaN;
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
        await mk('tarif.state', 'Tarif Zustand (günstig/neutral/teuer)', 'string', 'text');
        await mk('tarif.speicherSollW', 'Tarif Sollleistung Speicher (W, berechnet)', 'number', 'value.power');
        await mk('tarif.netzLadenErlaubt', 'Netzladung erlaubt (Tarif-Logik)', 'boolean', 'indicator');
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

            // Ausgabe für das Ladepark-Management (Tarif-Deckel)
            await this.dp.upsert({ key: 'cm.tariffBudgetW', objectId: `${this.adapter.namespace}.tarif.ladeparkLimitW` });

            // Ausgabe: Netzladung erlaubt (Preisfreigabe) für Engine/Consumer
            if (!this.dp.getEntry || !this.dp.getEntry('cm.gridChargeAllowed')) {
                await this.dp.upsert({ key: 'cm.gridChargeAllowed', objectId: `${this.adapter.namespace}.tarif.netzLadenErlaubt` });
            }
        }
    }

    _getVisInstance() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.vis) ? this.adapter.config.vis : null;
        const inst = (cfg && typeof cfg.instance === 'string') ? cfg.instance.trim() : '';
        return inst || 'nexowatt-vis.0';
    }

    _getVisPriceCurrentId() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.vis) ? this.adapter.config.vis : null;
        const id = (cfg && typeof cfg.priceCurrentId === 'string') ? cfg.priceCurrentId.trim() : '';
        return id || '';
    }

    _getVisPriceAverageId() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.vis) ? this.adapter.config.vis : null;
        const id = (cfg && typeof cfg.priceAverageId === 'string') ? cfg.priceAverageId.trim() : '';
        return id || '';
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

    async tick() {
        // VIS-Einstellungen sind nicht hochfrequent
        const staleTimeoutMs = 3600 * 1000;
        // Provider-Preise (dynamischer Tarif) sollten regelmäßig aktualisiert werden
        const providerStaleTimeoutMs = 15 * 60 * 1000;

        try {
            // --- VIS Settings ---
            const aktiv = this.dp ? this.dp.getBoolean('vis.settings.dynamicTariff', false) : false;
            const aktivAge = this.dp ? this.dp.getAgeMs('vis.settings.dynamicTariff') : null;
            const aktivFresh = (aktivAge === null || aktivAge === undefined) ? true : (aktivAge <= staleTimeoutMs);
            const aktivEff = !!(aktivFresh && aktiv);

            const modusRaw = this.dp ? this.dp.getNumberFresh('vis.settings.tariffMode', staleTimeoutMs, null) : null;
            const modusInt = (typeof modusRaw === 'number' && Number.isFinite(modusRaw)) ? Math.round(modusRaw) : 1;

            const preisGrenzeVis = this.dp ? this.dp.getNumberFresh('vis.settings.price', staleTimeoutMs, null) : null;
            const priorRaw = this.dp ? this.dp.getNumberFresh('vis.settings.priority', staleTimeoutMs, null) : null;
            const storageW = this.dp ? this.dp.getNumberFresh('vis.settings.storagePower', staleTimeoutMs, null) : null;
            const evcsMaxW = this.dp ? this.dp.getNumberFresh('vis.settings.evcsMaxPower', staleTimeoutMs, null) : null;

            const prioritaet = this._normPrioritaet(priorRaw);
            const storagePowerAbsW = Math.max(0, Math.abs(this._num(storageW, 0)));
            const baseW = Math.max(0, Math.abs(this._num(evcsMaxW, 0)));

            // --- Provider Preise ---
            let preisAktuell = null;
            if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.preisAktuellEurProKwh')) {
                preisAktuell = this.dp.getNumberFresh('tarif.preisAktuellEurProKwh', providerStaleTimeoutMs, null);
            }
            let preisDurchschnitt = null;
            if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.preisDurchschnittEurProKwh')) {
                preisDurchschnitt = this.dp.getNumberFresh('tarif.preisDurchschnittEurProKwh', providerStaleTimeoutMs, null);
            }

            // Plausibilität: Preis in €/kWh
            const preisVisOk = (typeof preisGrenzeVis === 'number' && Number.isFinite(preisGrenzeVis)) ? (preisGrenzeVis >= 0 && preisGrenzeVis <= 2.0) : false;
            const preisAktuellOk = (typeof preisAktuell === 'number' && Number.isFinite(preisAktuell)) ? (preisAktuell >= 0 && preisAktuell <= 2.0) : false;
            const preisDurchschnittOk = (typeof preisDurchschnitt === 'number' && Number.isFinite(preisDurchschnitt)) ? (preisDurchschnitt >= 0 && preisDurchschnitt <= 2.0) : false;

            // Referenzpreis (Preisgrenze) – wirksam
            let preisRef = null;
            if (modusInt === 2) {
                // Automatisch: Durchschnittspreis (Fallback: VIS)
                preisRef = preisDurchschnittOk ? preisDurchschnitt : (preisVisOk ? preisGrenzeVis : null);
            } else {
                // Manuell: VIS Preis (Fallback: Durchschnitt)
                preisRef = preisVisOk ? preisGrenzeVis : (preisDurchschnittOk ? preisDurchschnitt : null);
            }

            // --- Tarifzustand (mit Hysterese) ---
            const delta = 0.03;
            let tarifState = 'aus'; // aus | unbekannt | neutral | guenstig | teuer

            if (!aktivEff) {
                tarifState = 'aus';
                this._tarifLastState = 'neutral';
            } else if (!preisAktuellOk || (preisRef === null || preisRef === undefined || !Number.isFinite(preisRef))) {
                tarifState = 'unbekannt';
                this._tarifLastState = 'neutral';
            } else {
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

            // Sollleistung Speicher: negativ = Laden, positiv = Entladen
            let speicherSollW = 0;
            if (aktivEff && storagePowerAbsW > 0) {
                if (tarifState === 'guenstig' && allowStorageCheap) speicherSollW = -storagePowerAbsW;
                else if (tarifState === 'teuer') speicherSollW = storagePowerAbsW;
            }

            // Netzladen für Ladestationen:
            // - null wenn Tarif aus (Charging-Management nutzt Default)
            // - true nur wenn günstig + Priorität erlaubt
            // - sonst false
            let gridChargeAllowed = null;
            if (aktivEff) {
                gridChargeAllowed = (tarifState === 'guenstig' && allowEvcsCheap) ? true : false;
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
            await this._setIfChanged('tarif.preisDurchschnittEurProKwh', preisDurchschnittOk ? preisDurchschnitt : null);
            await this._setIfChanged('tarif.preisGrenzeEurProKwh', (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null);
            await this._setIfChanged('tarif.preisRefEurProKwh', (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null);
            await this._setIfChanged('tarif.state', tarifState);
            await this._setIfChanged('tarif.speicherSollW', speicherSollW);
            await this._setIfChanged('tarif.netzLadenErlaubt', gridChargeAllowed);
            await this._setIfChanged('tarif.ladeparkLimitW', limitW);

            // Für andere Module (synchron) bereithalten
            this.adapter._tarifVis = {
                aktiv: aktivEff,
                modus: modusInt,
                prioritaet,
                state: tarifState,
                deltaEur: delta,
                preisAktuell: preisAktuellOk ? preisAktuell : null,
                preisDurchschnitt: preisDurchschnittOk ? preisDurchschnitt : null,
                preisRef: (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null,
                speicherSollW,
                gridChargeAllowed,
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
