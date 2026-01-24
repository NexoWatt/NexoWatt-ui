'use strict';

const { BaseModule } = require('./base');


class RollingWindow {
    constructor(maxSeconds) {
        this.maxSeconds = Math.max(1, Number(maxSeconds) || 120);
        /** @type {Array<{t:number, v:number}>} */
        this.samples = [];
        this.sum = 0;
    }

    setMaxSeconds(maxSeconds) {
        const s = Math.max(1, Number(maxSeconds) || 120);
        if (s !== this.maxSeconds) {
            this.maxSeconds = s;
            // force purge to new horizon
            this._purge(Date.now());
        }
    }

    _purge(nowMs) {
        const cutoff = nowMs - this.maxSeconds * 1000;
        while (this.samples.length && this.samples[0].t < cutoff) {
            const s = this.samples.shift();
            this.sum -= s.v;
        }
        if (this.samples.length === 0) this.sum = 0;
    }

    push(v, nowMs) {
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        const t = Number(nowMs) || Date.now();
        this.samples.push({ t, v: n });
        this.sum += n;
        this._purge(t);
    }

    mean() {
        if (!this.samples.length) return null;
        return this.sum / this.samples.length;
    }

    count() {
        return this.samples.length;
    }
}


/**
 * Hysterese-Schalter: "eins" erst oberhalb onAbove, "aus" erst unterhalb offBelow.
 * Dazwischen bleibt der vorherige Zustand (prev) erhalten.
 *
 * @param {boolean|null|undefined} prev
 * @param {number} x
 * @param {number} offBelow
 * @param {number} onAbove
 * @returns {boolean}
 */
function hystAbove(prev, x, offBelow, onAbove) {
    const p = (prev === true);
    if (!Number.isFinite(x)) return p;
    if (x <= offBelow) return false;
    if (x >= onAbove) return true;
    return p;
}

/**
 * Hysterese-Schalter: "eins" erst unterhalb onBelow, "aus" erst oberhalb offAbove.
 * Dazwischen bleibt der vorherige Zustand (prev) erhalten.
 *
 * @param {boolean|null|undefined} prev
 * @param {number} x
 * @param {number} onBelow
 * @param {number} offAbove
 * @returns {boolean}
 */
function hystBelow(prev, x, onBelow, offAbove) {
    const p = (prev === true);
    if (!Number.isFinite(x)) return p;
    if (x <= onBelow) return true;
    if (x >= offAbove) return false;
    return p;
}


/**
 * Speicher-Regelung (Schritt 2)
 *
 * Ziele:
 * - Lastspitzenkappung über den Speicher (Entladen bei Überlast)
 * - Eigenverbrauchsoptimierung (PV-Überschuss laden; optional Entladen zur Reduktion des Netzbezugs)
 * - Notstrom-Reserve (Entladen unter Mindest-SoC verhindern; optional Reserve über PV/Netz wieder auffüllen)
 * - Zusammenarbeit mit Tarif/VIS (manuelle Speicherleistung aus VIS berücksichtigen)
 *
 * Gate E (Serienreife): Multiuse-Speicherstrategie
 * - getrennte SoC-Bereiche/Schwellen für:
 *   - Notstrom (Reserve)
 *   - Eigenverbrauch (Entladen optional)
 *   - LSK (Lastspitzenkappung / Peak-Shaving)
 * - LSK: separate Limits für Be-/Entladung (maxChargeW/maxDischargeW) möglich
 *
 * Hinweis:
 * - In dieser Stufe wird aktiv nur im Modus "Sollleistung (W)" geschrieben (st.targetPowerW).
 * - Andere Steuerungsarten bleiben zunächst Diagnose/Zuordnung (werden später erweitert).
 */
class SpeicherRegelungModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {number|null} */
        this._lastTargetW = null;
        /** @type {string} */
        this._lastReason = '';
        /** @type {string} */
        this._lastSource = '';

        // --- Anti-Oszillation / Anti-PingPong (Charge <-> Discharge) ---
        // Hintergrund: Wenn mehrere Logiken (LSK/Peak, Eigenverbrauch, PV-Überschuss, Reserve)
        // sehr schnell auf wechselnde NVP-Werte reagieren, kann der Sollwert (Charge/Discharge)
        // in kurzen Abständen das Vorzeichen wechseln. Das sieht als „Springen“ aus und erzeugt
        // unnötige Zyklen/Stress.
        // Strategie: Vorzeichenwechsel nur über „0“ und optional mit kurzer Sperrzeit.
        this._signLockUntilMs = 0;

        // Zeitpunkt, wann zuletzt Peak/LSK aktiv entladen hat (für „Refill“/Nachladen-Delay)
        this._lastPeakActiveMs = 0;


        /** @type {number|null} */
        this._lskRefillHeadroomFilteredW = null;
        /** @type {number} */
        this._lskRefillLastTs = 0;

        /** @type {number|null} */
        this._lskRefillHoldW = null;

        /** @type {RollingWindow} */
        this._lskRefillImportWin = new RollingWindow(120);

        // --- SoC-Hysterese gegen Flattern an Grenzwerten ---
        // Default: 0.5 %-Punkte. Ziel: Sobald ein Grenzwert erreicht ist,
        // soll die Regelung sauber bei 0 W „stehen bleiben“ (Ruhephase) und
        // nicht wegen Messrauschen/Quantisierung oder kleiner Gegenregelungen
        // sofort wieder in Laden/Entladen kippen.
        /** @type {number} */
        this._socHystPct = 0.5;

        // Letzte „Enable“-Zustände (Hysterese-Memory)
        /** @type {boolean|null} */
        this._socSelfDischargeEnabled = null;
        /** @type {boolean|null} */
        this._socLskDischargeEnabled = null;
        /** @type {boolean|null} */
        this._socLskRefillEnabled = null;
        /** @type {boolean|null} */
        this._socReserveRefillEnabled = null;

        // --- Tarif-Freigaben (Phase 5): Debounce gegen Flattern ---
        this._tariffGridChargeAllowed = true;
        this._tariffGridChargeAllowedTrueSinceMs = 0;
        this._tariffDischargeAllowed = true;
        this._tariffDischargeAllowedTrueSinceMs = 0;

    }

    async init() {
        await this._ensureStates();

        // Optional: zentrale Mess-/Hilfsdatenpunkte registrieren, damit die Regelung auch ohne Peak-Shaving-Modul laufen kann.
        await this._upsertInputsFromConfig();
    }

    async tick() {
        const cfg = this._getCfg();
        const psCfg = this.adapter.config.peakShaving || {};

        // Stale-Timeout einmal zentral berechnen (wird für VIS/Tarif und Messwerte genutzt)
        const staleMs = Math.max(1, Math.round(num(cfg.staleTimeoutSec, 15) * 1000));

        // Effektiv-Enable:
        // - Installateur kann die Speicherregelung explizit aktivieren.
        // - Zusätzlich wird die Regelung automatisch aktiv, sobald der Endkunde
        //   den dynamischen Tarif in der VIS aktiviert und eine Speicherleistung
        //   hinterlegt hat (damit "Manuell" sofort wirkt).
        const cfgEnabled = !!this.adapter.config.enableStorageControl;
        let autoTarifEnabled = false;
        try {
            // Prefer the already freshness-validated snapshot from the Tarif-Modul.
            const tv = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			if (tv && tv.aktiv) {
				// Bugfix (Phase 7/8): Tarif-Modul liefert die VIS-Leistungsgrenze als
				// speicherLeistungW / speicherLeistungAbsW. In manchen Builds fehlte
				// dieses Feld, wodurch Auto-Enable fälschlich deaktiviert wurde.
				let sp = null;
				if (typeof tv.speicherLeistungAbsW === 'number' && Number.isFinite(tv.speicherLeistungAbsW)) {
					sp = Math.abs(tv.speicherLeistungAbsW);
				} else if (typeof tv.speicherLeistungW === 'number' && Number.isFinite(tv.speicherLeistungW)) {
					sp = Math.abs(tv.speicherLeistungW);
				}
				if (typeof sp === 'number') {
					autoTarifEnabled = sp > 0;
				} else if (this.dp) {
					// Fallback: directly read VIS toggle (best-effort).
					const aktiv = this.dp.getBoolean('vis.settings.dynamicTariff', false);
					const age = this.dp.getAgeMs('vis.settings.dynamicTariff');
					if (aktiv && (age === null || age <= staleMs)) {
						const spAbs = Math.abs(this.dp.getNumber('vis.settings.storagePower', 0));
						autoTarifEnabled = spAbs > 0;
					}
				}
			} else if (this.dp) {
                // Fallback: directly read VIS toggle (best-effort).
                const aktiv = this.dp.getBoolean('vis.settings.dynamicTariff', false);
                const age = this.dp.getAgeMs('vis.settings.dynamicTariff');
                if (aktiv && (age === null || age <= staleMs)) {
                    const spAbs = Math.abs(this.dp.getNumber('vis.settings.storagePower', 0));
                    autoTarifEnabled = spAbs > 0;
                }
            }
        } catch {
            autoTarifEnabled = false;
        }

        const enabled = cfgEnabled || autoTarifEnabled;

        // SoC-Hysterese optional aus Konfig lesen (falls später im Admin ergänzt).
        // Default bleibt 0.5 %-Punkte.
        this._socHystPct = Math.max(0, num(cfg.socHystPct, this._socHystPct));

        // Diagnose: aktiv
        await this._setIfChanged('speicher.regelung.aktiv', enabled);
        await this._setIfChanged('speicher.regelung.aktivKonfig', cfgEnabled);
        await this._setIfChanged('speicher.regelung.aktivAutoTarif', autoTarifEnabled);

        // Wenn effektiv deaktiviert: nur Diagnose aktualisieren – KEINE Setpoints schreiben.
        // (Wichtig, damit keine "0" als externe Vorgabe an ein Speichersystem gesendet wird.)
        if (!enabled) {
            await this._setIfChanged('speicher.regelung.quelle', 'aus');
            await this._setIfChanged('speicher.regelung.grund', 'Deaktiviert');
            await this._setIfChanged('speicher.regelung.schreibStatus', 'deaktiviert');
            await this._setIfChanged('speicher.regelung.schreibOk', false);
            await this._setIfChanged('speicher.regelung.lastWriteRaw', null);

            // Phase 2 Diagnose: wenn deaktiviert, Request/Dispatcher auf 0 setzen
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Deaktiviert');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), disabled: true, reason: 'Deaktiviert' }));

            return;
        }

        // Mindestvoraussetzungen
        const controlMode = String(cfg.controlMode || 'targetPower');
        if (controlMode !== 'targetPower') {
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Steuerungsart nicht unterstützt (nur Sollleistung)');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: 'Steuerungsart nicht unterstützt (nur Sollleistung)', src: 'aus' }));

            await this._applyTargetW(0, 'Steuerungsart nicht unterstützt (nur Sollleistung)', 'aus');
            return;
        }

        const hasTarget = this.dp ? !!this.dp.getEntry('st.targetPowerW') : false;

        // Speicherfarm: wenn aktiv und Setpoint-DPs pro Speicher vorhanden sind,
        // erlauben wir die Regelung auch ohne klassische Sollleistungs-Zuordnung (st.targetPowerW).
        const farmCfg = (this.adapter && this.adapter.config && this.adapter.config.storageFarm) ? this.adapter.config.storageFarm : {};
        const farmEnabled = !!(this.adapter && this.adapter.config && this.adapter.config.enableStorageFarm);
        const farmRows = Array.isArray(farmCfg.storages) ? farmCfg.storages : [];
        const hasFarmSetpoints = farmEnabled && farmRows.some(r => r && r.enabled !== false && (String(r.setSignedPowerId||'').trim() || String(r.setChargePowerId||'').trim() || String(r.setDischargePowerId||'').trim()));

        if (!hasTarget && !hasFarmSetpoints) {
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Sollleistung-Datenpunkt fehlt (Zuordnung)');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: 'Sollleistung-Datenpunkt fehlt (Zuordnung)', src: 'aus' }));

            await this._applyTargetW(0, 'Sollleistung-Datenpunkt fehlt (Zuordnung)', 'aus');
            return;
        }

        // Messwerte lesen
        const now = Date.now();

        // PV‑Forecast / PV‑aware Tarif‑Netzlade-Entscheidung (Debug/Policy)
        // Wird weiter unten im Tarif-Block (want < 0) befüllt.
        let pvAwareTariff = null;

        // grid.powerW is expected to be the *filtered* NVP (Import + / Export -)
        // grid.powerRawW is the raw signal (if available). If not, fall back to ps.gridPowerW.
        let gridW = this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null;
        let gridRawW = this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null;

        if (typeof gridRawW !== 'number' && this.dp) {
            // raw fallback (manufacturer datapoint from Peak-Shaving config)
            gridRawW = this.dp.getNumberFresh('ps.gridPowerW', staleMs, null);
        }

        if (typeof gridW !== 'number') {
            // If we don't have the internal filtered NVP, try Peak-Shaving effective power (avg) as fallback.
            const eff = await this._readOwnNumber('peakShaving.control.effectivePowerW');
            if (typeof eff === 'number') gridW = eff;
        }

        if (typeof gridW !== 'number' && typeof gridRawW === 'number') {
            // last-resort: use raw if no filtered signal exists
            gridW = gridRawW;
        }

        const gridAge = this.dp ? (this.dp.getEntry('grid.powerW') ? this.dp.getAgeMs('grid.powerW') : (this.dp.getEntry('ps.gridPowerW') ? this.dp.getAgeMs('ps.gridPowerW') : null)) : null;

        // SoC für Reserve (bei Speicherfarm: aggregierten SoC nutzen)
        let soc = this.dp ? this.dp.getNumberFresh('st.socPct', staleMs, null) : null;
        let socAge = this.dp ? this.dp.getAgeMs('st.socPct') : null;

        if (farmEnabled) {
            try {
                const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                const hasOnline = Number.isFinite(onlineN) && onlineN > 0;

                if (hasOnline) {
                    const stSoc = await this.adapter.getStateAsync('storageFarm.totalSoc');
                    const v = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                    const age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;
                    if (Number.isFinite(v) && (age === null || age <= staleMs)) {
                        soc = v;
                        socAge = age;
                    }
                }
            } catch (_e) {
                // ignore
            }
        }

        // Istleistung Batterie (positiv = Entladung, negativ = Beladung)
        // Wird für eine OpenEMS-ähnliche NVP-Balancing-Regelung genutzt (grid + ess - target).
        //
        // Wichtig (Fehlerquelle): Wenn der Installateur versehentlich den gleichen Datenpunkt
        // für Ist- UND Sollleistung mapped (z. B. beide auf Register 706), würde die Regelung
        // "ihre eigene Vorgabe" als Messwert lesen und dadurch massiv überschwingen.
        // -> Deshalb ignorieren wir st.batteryPowerW, wenn er auf das gleiche Objekt wie st.targetPowerW zeigt.
        let battPowerW = this.dp ? this.dp.getNumberFresh('st.batteryPowerW', staleMs, null) : null;
        let battPowerAge = this.dp ? (this.dp.getEntry('st.batteryPowerW') ? this.dp.getAgeMs('st.batteryPowerW') : null) : null;
        let battPowerInvalidReason = '';

        try {
            const eBatt = this.dp ? this.dp.getEntry('st.batteryPowerW') : null;
            const eTarget = this.dp ? this.dp.getEntry('st.targetPowerW') : null;
            const battObj = eBatt && eBatt.objectId ? String(eBatt.objectId) : '';
            const targetObj = eTarget && eTarget.objectId ? String(eTarget.objectId) : '';
            if (battObj && targetObj && battObj === targetObj) {
                battPowerW = null;
                battPowerAge = null;
                battPowerInvalidReason = 'Ist-Leistung verweist auf Sollleistung (Mapping-Fehler)';
            }
        } catch {
            // ignore
        }

        // Speicherfarm: aggregierte Ist-Leistung nutzen (Netto: Entladen - Laden).
        //
        // Hintergrund:
        // In Farm-Setups ist st.batteryPowerW häufig nur auf einen Einzel-Speicher gemappt
        // oder (Fehler) sogar auf einen Setpoint. Das führt bei NVP-Balancing zu einem
        // stabilen Fehlpunkt (z. B. ~50% Netzbezug).
        //
        // Daher: wenn Farm aktiv ist und die abgeleiteten Summen frisch sind,
        // überschreiben wir battPowerW mit der Farm-Nettoleistung.
        if (farmEnabled) {
            try {
                const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                const hasOnline = Number.isFinite(onlineN) && onlineN > 0;

                if (hasOnline) {
                    const stChg = await this.adapter.getStateAsync('storageFarm.totalChargePowerW');
                    const stDchg = await this.adapter.getStateAsync('storageFarm.totalDischargePowerW');

                    const chg = stChg && stChg.val !== undefined && stChg.val !== null ? Number(stChg.val) : NaN;
                    const dchg = stDchg && stDchg.val !== undefined && stDchg.val !== null ? Number(stDchg.val) : NaN;

                    const ageChg = stChg && typeof stChg.ts === 'number' ? (now - Number(stChg.ts)) : null;
                    const ageDchg = stDchg && typeof stDchg.ts === 'number' ? (now - Number(stDchg.ts)) : null;
                    const age = (ageChg === null && ageDchg === null) ? null : Math.max(ageChg || 0, ageDchg || 0);

                    if (Number.isFinite(chg) && Number.isFinite(dchg) && (age === null || age <= staleMs)) {
                        battPowerW = dchg - chg;
                        battPowerAge = age;
                        battPowerInvalidReason = 'Farm: aggregierte Ist-Leistung (Entladen-Laden)';
                    }
                }
            } catch (_eFarm) {
                // ignore
            }
        }

        // Wenn Netzleistung fehlt: sicher auf 0
        if (typeof gridW !== 'number') {
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Netzleistung fehlt oder zu alt');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: 'Netzleistung fehlt oder zu alt', src: 'aus' }));

            await this._applyTargetW(0, 'Netzleistung fehlt oder zu alt', 'aus');
            await this._setIfChanged('speicher.regelung.netzLeistungW', null);
            await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);
            await this._setIfChanged('speicher.regelung.netzLadenErlaubt', null);
            await this._setIfChanged('speicher.regelung.entladenErlaubt', null);
            await this._setIfChanged('speicher.regelung.tarifState', '');
            await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify({ ts: Date.now(), disabled: true, reason: 'Netzleistung fehlt oder zu alt' }));
            return;
        }
        // Show RAW if available (closer to meter), otherwise show filtered.
        await this._setIfChanged('speicher.regelung.netzLeistungW', Math.round((typeof gridRawW === 'number') ? gridRawW : gridW));
        await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);


        // Tarif-Freigaben (aus Tarif-Modul)
        // - gridChargeAllowed: Netzladen erlaubt (z. B. Tarif sperrt Netzladen)
        // - dischargeAllowed: Entladen erlaubt (Tarif günstig => Entladen sperren, um Batterie nicht leerzufahren)
        //
        // WICHTIG (Bugfix):
        // Diese Flags ändern sich u. U. nur selten. Wenn man sie mit einem kurzen Freshness-Timeout bewertet
        // (z. B. 15s), werden sie nach kurzer Zeit als "stale" behandelt und fälschlich gesperrt.
        // Für die Regelung ist deshalb der "last known value" relevant (fail-open):
        // - fehlt der DP oder ist er ungültig => true (keine Tarif-Sperre)
        // - sonst: nutze den gespeicherten Wert (auch wenn er lange unverändert ist)
        let gridChargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.gridChargeAllowed')) {
            gridChargeAllowedRaw = this.dp.getBoolean('cm.gridChargeAllowed', true);
        }

        let dischargeAllowedRaw = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.dischargeAllowed')) {
            dischargeAllowedRaw = this.dp.getBoolean('cm.dischargeAllowed', true);
        }

        // Debounce gegen Flattern (Phase 5):
        // - Sperren (false) wirken sofort (Safety-first)
        // - Freigaben (true) erst nach stabiler True-Phase (hold)
        const permHoldMs = Math.round(clamp(num(cfg.tariffPermissionHoldSec, 10), 0, 3600) * 1000);

        let gridChargeAllowed = gridChargeAllowedRaw;
        let dischargeAllowed = dischargeAllowedRaw;

        if (permHoldMs > 0) {
            if (!gridChargeAllowedRaw) {
                this._tariffGridChargeAllowed = false;
                this._tariffGridChargeAllowedTrueSinceMs = 0;
            } else {
                if (!this._tariffGridChargeAllowed) {
                    if (!this._tariffGridChargeAllowedTrueSinceMs) this._tariffGridChargeAllowedTrueSinceMs = now;
                    if ((now - this._tariffGridChargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffGridChargeAllowed = true;
                    }
                }
            }
            gridChargeAllowed = !!this._tariffGridChargeAllowed;

            if (!dischargeAllowedRaw) {
                this._tariffDischargeAllowed = false;
                this._tariffDischargeAllowedTrueSinceMs = 0;
            } else {
                if (!this._tariffDischargeAllowed) {
                    if (!this._tariffDischargeAllowedTrueSinceMs) this._tariffDischargeAllowedTrueSinceMs = now;
                    if ((now - this._tariffDischargeAllowedTrueSinceMs) >= permHoldMs) {
                        this._tariffDischargeAllowed = true;
                    }
                }
            }
            dischargeAllowed = !!this._tariffDischargeAllowed;
        }

        await this._setIfChanged('speicher.regelung.netzLadenErlaubt', !!gridChargeAllowed);
        await this._setIfChanged('speicher.regelung.entladenErlaubt', !!dischargeAllowed);

        // Default-Zielwert (W): Ohne Initialisierung kann es – je nach aktivierten Teil-Logiken –
        // zu ReferenceErrors kommen, wenn am Ende targetW/reason/source verwendet werden.
        // 0 W bedeutet: keine Be-/Entladeleistung vorgeben.
        let targetW = 0;
        let evcsAssistReqW = 0;
        // Harte SoC-Grenzen (werden durch verschiedene Strategien gesetzt/verschärft)
        let hardDischargeMinSoc = 0;
        let hardChargeMaxSoc = 100;
        let reason = 'Keine Aktion';
        let source = 'idle';

        const exportW = Math.max(0, -gridW); // negative Netzleistung = Einspeisung (geglättet)
        const importW = Math.max(0, gridW);  // positive Netzleistung = Bezug (geglättet)
        const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW; // Import + / Export -
        const importRawW = Math.max(0, nvpRawW);
        const exportRawW = Math.max(0, -nvpRawW);

        // ------------------------------------------------------------
        // Phase 4: Gemeinsame Netzbezug-Caps (Grid-Constraints / Peak-Shaving / Installer)
        // ------------------------------------------------------------
        const coreCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        let importLimitW = null;
        let importLimitQuelle = '';

        try {
            if (coreCaps && coreCaps.grid && typeof coreCaps.grid.gridImportLimitW_effective === 'number' && Number.isFinite(coreCaps.grid.gridImportLimitW_effective) && coreCaps.grid.gridImportLimitW_effective > 0) {
                importLimitW = coreCaps.grid.gridImportLimitW_effective;
                importLimitQuelle = String(coreCaps.grid.gridImportLimitW_source || '');
            }
        } catch {
            // ignore
        }

        if (!(typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0)) {
            // Fallback: states (best-effort)
            const lim = await this._readOwnNumber('ems.core.gridImportLimitW_effective');
            if (typeof lim === 'number' && Number.isFinite(lim) && lim > 0) importLimitW = lim;
            const src = await this._readOwnString('ems.core.gridImportLimitW_source');
            if (src) importLimitQuelle = src;
        }

        let importHeadroomW = null;
        let importHeadroomRawW = null;
        let importHeadroomEffW = null;

        if (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0) {
            importHeadroomW = Math.max(0, importLimitW - importW);
            importHeadroomRawW = Math.max(0, importLimitW - importRawW);
            importHeadroomEffW = (typeof importHeadroomRawW === 'number' && typeof importHeadroomW === 'number')
                ? Math.min(importHeadroomW, importHeadroomRawW)
                : (typeof importHeadroomRawW === 'number' ? importHeadroomRawW : importHeadroomW);
        }

        await this._setIfChanged('speicher.regelung.importLimitW', (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0) ? Math.round(importLimitW) : null);
        await this._setIfChanged('speicher.regelung.importLimitQuelle', importLimitQuelle || '');
        await this._setIfChanged('speicher.regelung.importHeadroomW', (typeof importHeadroomW === 'number') ? Math.round(importHeadroomW) : null);
        await this._setIfChanged('speicher.regelung.importHeadroomRawW', (typeof importHeadroomRawW === 'number') ? Math.round(importHeadroomRawW) : null);

        // Peak-Shaving Kontexte (Limit/Headroom) – wird für LSK-Entladung und für "Reserve wieder auffüllen" genutzt.
        const peakEnabled = !!this.adapter.config.enablePeakShaving;
        let psLimitW = null;
        let psOverW = null;
        let psReqRedW = null;
        let psHeadroomW = null; // freie Leistung bis zum Peak-Shaving-Limit (nur Import)
        if (peakEnabled) {
            psLimitW = await this._readOwnNumber('peakShaving.control.limitW');
            psOverW = await this._readOwnNumber('peakShaving.control.overW');
            psReqRedW = await this._readOwnNumber('peakShaving.control.requiredReductionW');
            // Phase 4: Wenn Peak-Shaving kein nutzbares Limit liefert, nutze globales Import-Cap (CoreLimits).
            if (!(typeof psLimitW === 'number' && psLimitW > 0) && (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0)) {
                psLimitW = importLimitW;
            }
            if (typeof psLimitW === 'number' && psLimitW > 0) {
                // NOTE: psHeadroomW is based on the filtered import signal for stable control.
                psHeadroomW = Math.max(0, psLimitW - importW);
            }
        }

// LSK-Refill Headroom-Filter (langes Mittelwertfenster + Update-Schwelle):
// - Schwankungen im Netzbezug führen sonst zu stark springenden Sollwerten.
// - Ansatz: gleitender Mittelwert am NVP (Import) über ein längeres Zeitfenster (Default 120 s)
//   und erst bei Änderungen >= lskRefillDeadbandW (Default 500 W) den Wert "nachziehen".
// - Für Sicherheit clampen wir später zusätzlich mit dem RAW-Headroom (Import-Spikes => sofort weniger laden).
let psHeadroomFilteredW = null;
let psHeadroomRawW = null;
if (typeof psHeadroomW === 'number') {
    if (typeof psLimitW === 'number' && psLimitW > 0) {
        // RAW headroom based on RAW import (Import + / Export -) -> Import only
        psHeadroomRawW = Math.max(0, psLimitW - Math.max(0, importRawW));
    }

    const avgSec = clamp(num(cfg.lskRefillAvgSeconds, 120), 5, 1800);
    const updateDeltaW = clamp(num(cfg.lskRefillDeadbandW, 500), 0, 1000000);

    // Rolling mean of import (NVP) for stable headroom calculation.
    // We intentionally use RAW import here (Import only) to avoid double-filter artefacts.
    if (this._lskRefillImportWin) {
        this._lskRefillImportWin.setMaxSeconds(avgSec);
        const importSampleW = Math.max(0, (typeof importRawW === 'number') ? importRawW : ((typeof importW === 'number') ? importW : 0));
        this._lskRefillImportWin.push(importSampleW, now);
        const importAvgW = this._lskRefillImportWin.mean();
        const headroomAvgW = (typeof psLimitW === 'number' && psLimitW > 0 && typeof importAvgW === 'number')
            ? Math.max(0, psLimitW - importAvgW)
            : psHeadroomW;

        if (typeof this._lskRefillHeadroomFilteredW !== 'number') {
            this._lskRefillHeadroomFilteredW = headroomAvgW;
        } else {
            const prev = this._lskRefillHeadroomFilteredW;
            if (headroomAvgW < prev) {
                // decrease immediately (safety)
                this._lskRefillHeadroomFilteredW = headroomAvgW;
            } else if (updateDeltaW > 0 && (headroomAvgW - prev) < updateDeltaW) {
                // hold (no update for small upward changes)
                this._lskRefillHeadroomFilteredW = prev;
            } else {
                this._lskRefillHeadroomFilteredW = headroomAvgW;
            }
        }

        psHeadroomFilteredW = this._lskRefillHeadroomFilteredW;
    } else {
        // fallback (should not happen)
        psHeadroomFilteredW = psHeadroomW;
        this._lskRefillHeadroomFilteredW = psHeadroomFilteredW;
    }

    this._lskRefillLastTs = now;

    await this._setIfChanged('speicher.regelung.lskHeadroomW', Math.round(psHeadroomW));
    await this._setIfChanged('speicher.regelung.lskHeadroomFilteredW', Math.round(psHeadroomFilteredW));
} else {
    this._lskRefillHeadroomFilteredW = null;
    this._lskRefillLastTs = now;
    if (this._lskRefillImportWin) {
        this._lskRefillImportWin.samples = [];
        this._lskRefillImportWin.sum = 0;
    }
    psHeadroomRawW = null;
    await this._setIfChanged('speicher.regelung.lskHeadroomW', null);
    await this._setIfChanged('speicher.regelung.lskHeadroomFilteredW', null);
}

if (typeof soc === 'number') {
            await this._setIfChanged('speicher.regelung.socPct', Math.round(soc * 10) / 10);
            await this._setIfChanged('speicher.regelung.socAlterMs', typeof socAge === 'number' ? Math.round(socAge) : null);
        } else {
            await this._setIfChanged('speicher.regelung.socPct', null);
            await this._setIfChanged('speicher.regelung.socAlterMs', typeof socAge === 'number' ? Math.round(socAge) : null);
        }

        // ------------------------------------------------------------
        // Gate E: Multiuse-Speicherstrategie (SoC-Zonen)
        // ------------------------------------------------------------
        // Notstrom-Reserve: harte Untergrenze für Entladen
        const reserveEnabled = !!cfg.reserveEnabled;
        const reserveMin = clamp(num(cfg.reserveMinSocPct, 20), 0, 100);
        const reserveTarget = clamp(num(cfg.reserveTargetSocPct, reserveMin), 0, 100);

        const reserveActive = reserveEnabled && (typeof soc === 'number') && (soc <= reserveMin);

        // Reserve-Aufladung mit SoC-Hysterese, damit bei Erreichen des Ziel-SoC
        // nicht permanent nachgeregelt wird.
        if (reserveEnabled && (typeof soc === 'number')) {
            const onBelow = Math.max(0, reserveTarget - this._socHystPct);
            this._socReserveRefillEnabled = hystBelow(this._socReserveRefillEnabled, soc, onBelow, reserveTarget);
        } else {
            this._socReserveRefillEnabled = false;
        }
        const reserveChargeWanted = reserveEnabled && (typeof soc === 'number') && !!this._socReserveRefillEnabled;

        await this._setIfChanged('speicher.regelung.reserveAktiv', !!reserveActive);
        await this._setIfChanged('speicher.regelung.reserveMinSocPct', reserveMin);
        await this._setIfChanged('speicher.regelung.reserveZielSocPct', reserveTarget);

        // LSK (Peak-Shaving über Speicher)
        const lskEnabledCfg = cfg.lskEnabled !== false; // Default: an (damit bestehende Installationen unverändert bleiben)
        const lskMinSoc = clamp(num(cfg.lskMinSocPct, reserveMin), 0, 100);
        const lskMaxSoc = clamp(num(cfg.lskMaxSocPct, 100), 0, 100);

        // Eigenverbrauch (Entladen optional)
        const selfDischargeEnabled = cfg.selfDischargeEnabled === true;
        const selfMinSoc = clamp(num(cfg.selfMinSocPct, reserveMin), 0, 100);
        const selfMaxSoc = clamp(num(cfg.selfMaxSocPct, 100), 0, 100);
        // Eigenverbrauchs-Optimierung: Ziel-Netzbezug am NVP.
        // Praxis: ein kleiner Bezug (z. B. 50–150 W) ist oft stabiler als exakt 0 W
        // (Messrauschen, Totzeiten, Geräte-Rampen).
        // Default ab Phase 6.4: Ziel 50 W Import, Deadband ±50 W.
        const selfTargetGridW = Math.max(0, num(cfg.selfTargetGridImportW, 50));
        const selfImportThresholdW = Math.max(0, num(cfg.selfImportThresholdW, 50));

        await this._setIfChanged('speicher.regelung.lskMinSocPct', lskMinSoc);
        await this._setIfChanged('speicher.regelung.lskMaxSocPct', lskMaxSoc);
        await this._setIfChanged('speicher.regelung.selfMinSocPct', selfMinSoc);
        await this._setIfChanged('speicher.regelung.selfMaxSocPct', selfMaxSoc);
        await this._setIfChanged('speicher.regelung.selfTargetGridImportW', selfTargetGridW);
        await this._setIfChanged('speicher.regelung.selfImportThresholdW', selfImportThresholdW);
        await this._setIfChanged('speicher.regelung.selfEntladenAktiviert', !!selfDischargeEnabled);

        // Grenzen / Glättung
        // maxChargeW/maxDischargeW sind *optionale* Software-Clamps.
        // 0 => unbegrenzt (kein Clamp). Viele Speicher regeln/limitieren intern ohnehin.
        const maxChargeLimitW_cfg = Math.max(0, num(cfg.maxChargeW, 0));        // Laden: negativ (Betrag)
        const maxDischargeLimitW_cfg = Math.max(0, num(cfg.maxDischargeW, 0));  // Entladen: positiv
        const maxChargeW = (maxChargeLimitW_cfg > 0) ? maxChargeLimitW_cfg : Number.POSITIVE_INFINITY;
        const maxDischargeW = (maxDischargeLimitW_cfg > 0) ? maxDischargeLimitW_cfg : Number.POSITIVE_INFINITY;
        const stepW = Math.max(0, num(cfg.stepW, 50));
        const maxDelta = Math.max(0, num(cfg.maxDeltaWPerTick, 500));
        const pvMaxDeltaCfg = Math.max(0, num(cfg.pvMaxDeltaWPerTick, 1500)); // 0 => nutzt globale Rampe

        // Policy-spezifische Limits (0 => global)
        const lskMaxChargeW_cfg = Math.max(0, num(cfg.lskMaxChargeW, 0));
        const lskMaxDischargeW_cfg = Math.max(0, num(cfg.lskMaxDischargeW, 0));
        const selfMaxChargeW_cfg = Math.max(0, num(cfg.selfMaxChargeW, 0));
        const selfMaxDischargeW_cfg = Math.max(0, num(cfg.selfMaxDischargeW, 0));
        const reserveGridChargeW = Math.max(0, num(cfg.reserveGridChargeW, 0));

        const lskMaxDischargeEff = Math.min(maxDischargeW, (lskMaxDischargeW_cfg > 0 ? lskMaxDischargeW_cfg : maxDischargeW));
        const lskMaxChargeEff = Math.min(maxChargeW, (lskMaxChargeW_cfg > 0 ? lskMaxChargeW_cfg : maxChargeW));
        const selfMaxDischargeEff = Math.min(maxDischargeW, (selfMaxDischargeW_cfg > 0 ? selfMaxDischargeW_cfg : maxDischargeW));
        const selfMaxChargeEff = Math.min(maxChargeW, (selfMaxChargeW_cfg > 0 ? selfMaxChargeW_cfg : maxChargeW));

        // 1) Lastspitzenkappung: wenn Peak-Shaving aktiv und Grenzwert überschritten → Entladen
        //    Wichtig: Diese Logik darf den Netzanschluss NICHT überlasten. Daher wird hier nicht "absolut" auf
        //    (Import - Limit) gesetzt (das führt zu einem Fixpunkt), sondern als Delta/Integrator auf die bestehende
        //    Sollleistung aufaddiert. Dadurch erreicht der Speicher das Ziel (Import <= Limit) zuverlässig.
        if (peakEnabled && lskEnabledCfg && (cfg.lskDischargeEnabled !== false)) {
            const limitW = (typeof psLimitW === 'number' && psLimitW > 0) ? psLimitW : null;

            // Für die Schutzfunktion immer den Rohwert am Netzanschlusspunkt verwenden (keine Mittelwert-Schönung).
            const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;
            const importNowW = Math.max(0, typeof nvpRawW === 'number' ? nvpRawW : 0);

            const lastWasLsk = (this._lastSource === 'lastspitze');
            const hasLimit = (typeof limitW === 'number');

            if (hasLimit && (importNowW > limitW || lastWasLsk)) {
                // SoC-Fenster für LSK (mit Hysterese gegen Flattern)
                let socOk = true;
                if (typeof soc === 'number') {
                    this._socLskDischargeEnabled = hystAbove(
                        this._socLskDischargeEnabled,
                        soc,
                        lskMinSoc,
                        lskMinSoc + this._socHystPct,
                    );
                    socOk = this._socLskDischargeEnabled;
                }

                if (reserveActive) {
                    targetW = 0;
                    reason = 'Lastspitzenkappung: nötig, aber Notstrom-Reserve aktiv';
                    source = 'lastspitze';
                } else if (!socOk) {
                    targetW = 0;
                    reason = `Lastspitzenkappung: nötig, aber SoC <= LSK-Min (${lskMinSoc}%)`;
                    source = 'lastspitze';
                } else {
                    // Regelfehler bezogen auf Netzimport: Ziel ist importNowW <= limitW
                    const errW = importNowW - limitW;

                    // Delta-Regelung: Korrektur auf bestehende Sollleistung aufaddieren.
                    // Damit vermeiden wir das "Halbierungs"-Problem (Fixpunkt bei (L+T)/2).
                    const curSetW = (lastWasLsk && typeof this._lastTargetW === 'number') ? Math.max(0, this._lastTargetW) : 0;

                    // Release-Hysterese (unter dem Limit) aus Peak-Shaving nutzen, um Flattern zu vermeiden.
                    const relHystW = Math.max(0, num(psCfg.hysteresisW, 200));
                    let nextSetW = curSetW;

                    if (errW > 0) {
                        // Sofort hochregeln (Safety): jedes Watt über Limit muss weg.
                        nextSetW = curSetW + errW;
                    } else if (errW < -relHystW) {
                        // Unter Limit: langsam/gedämpft zurücknehmen.
                        nextSetW = curSetW + errW; // errW negativ => reduziert Entladen
                    } // sonst halten (Anti-Flattern)

                    nextSetW = clamp(nextSetW, 0, lskMaxDischargeEff);

                    // Fast-Trip/Peak-Shaving kann zusätzliche Überlast melden (gefiltert/Trip).
                    // Damit die LSK-Reaktion nicht "zu klein" bleibt, erzwingen wir mindestens diesen Bedarf.
                    const needW = (typeof psReqRedW === 'number' && psReqRedW > 0) ? psReqRedW
                        : ((typeof psOverW === 'number' && psOverW > 0) ? psOverW : 0);
                    if (needW > 0 && nextSetW < needW) nextSetW = clamp(needW, 0, lskMaxDischargeEff);

                    targetW = nextSetW;
                    reason = `Lastspitzenkappung: entladen (Import ${Math.round(importNowW)} W > Limit ${Math.round(limitW)} W)`;
                    source = 'lastspitze';
                    hardDischargeMinSoc = Math.max(hardDischargeMinSoc, lskMinSoc);

                    // Merken: Peak war aktiv (für Refill/Anti-PingPong)
                    this._lastPeakActiveMs = now;
                }
            }
        }

        // 2) Gate C: Ladepark-Unterstützung (EVCS Boost/Auto) via Speicher-Entladung,
        // sofern keine Lastspitzenkappung aktiv ist.
        if (targetW === 0) {
            const assistW = await this._readOwnNumber('chargingManagement.control.storageAssistW');
            evcsAssistReqW = (typeof assistW === 'number' && Number.isFinite(assistW)) ? assistW : 0;
            if (typeof assistW === 'number' && assistW > 0) {
                // EVCS-Unterstützung ist "komfort" – wenn Reserve wieder aufgefüllt werden soll, blockieren wir das.
                const reserveMinEff = reserveEnabled ? reserveMin : 0;
                const socOk = (typeof soc !== 'number') ? true : (soc > Math.max(reserveMinEff, selfMinSoc));
                if (typeof dischargeAllowed === 'boolean' && dischargeAllowed === false) {
                    targetW = 0;
                    reason = 'EVCS-Unterstützung blockiert (Tarif: Entladen gesperrt)';
                    source = 'evcs';
                } else if (reserveActive) {
                    targetW = 0;
                    reason = 'EVCS-Unterstützung nötig, aber Notstrom-Reserve aktiv';
                    source = 'evcs';
                } else if (reserveChargeWanted) {
                    targetW = 0;
                    reason = 'EVCS-Unterstützung blockiert (Reserve soll aufgefüllt werden)';
                    source = 'evcs';
                } else if (!socOk) {
                    targetW = 0;
                    reason = 'EVCS-Unterstützung blockiert (SoC unter Minimum)';
                    source = 'evcs';
                } else {
                    targetW = clamp(assistW, 0, maxDischargeW);
                    reason = `EVCS-Unterstützung: entladen (${Math.round(assistW)} W angefordert)`;
                    source = 'evcs';
                    hardDischargeMinSoc = Math.max(hardDischargeMinSoc, Math.max(reserveMinEff, selfMinSoc));
                }
            }
        }

		// 2) Tarif (dynamischer Zeittarif)
		// - Steuerung kommt aus dem TarifVis-Modul (adapter._tarifVis)
		// - Entladen bei "teuer" nur bis NVP = 0 W (kein Export durch Tarif)
		let tarifState = null;
		if (targetW === 0) {
			const tv = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			const tvAktiv = !!(tv && tv.aktiv);
			tarifState = (tvAktiv && typeof tv.state === 'string') ? tv.state : null;

			if (tvAktiv) {
				const want = num(tv.speicherSollW, 0); // negativ = Laden, positiv = Entladen

				// Reserve blockiert Entladen
				if (reserveActive && want > 0) {
					targetW = 0;
					reason = 'Tarif: Entladen blockiert (Reserve aktiv)';
					source = 'tarif';
				} else if (want < 0) {
					// Laden (Tarif günstig)
					// PV-Überschuss wird später separat geregelt; hier geht es um Netzladen.
					if (typeof soc === 'number' && soc >= hardChargeMaxSoc) {
						targetW = 0;
						reason = 'Tarif: Laden blockiert (SoC-Max erreicht)';
						source = 'tarif';
					} else {
						let chargeW = Math.min(Math.abs(want), maxChargeW);
						// Gemeinsame Import-Cap: nie über effektives Netzbezugslimit laden
						// OpenEMS-Ansatz: Begrenzung auf Basis der *realen* Netzleistung ohne aktuelle Batterie-Leistung,
						// um ein „Hin-und-her Springen“ (Sollwert folgt eigenem Einfluss auf den NVP) zu vermeiden.
						//
						// realNvpW = NVP + battPowerW  (battPowerW: +Entladen, -Laden)
						// -> ergibt näherungsweise die Last ohne Batterieeinfluss.
						const battSignedW = (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Number(battPowerW) : 0;
						const nvpNowW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Number(gridRawW) : num(gridW, 0);
						const realNvpW = nvpNowW + battSignedW;
						const realImportW = Math.max(0, realNvpW);

						let headroomByImportCapW = null;
						if (typeof importLimitW === 'number' && Number.isFinite(importLimitW) && importLimitW > 0) {
							headroomByImportCapW = Math.max(0, importLimitW - realImportW);
						} else if (typeof importHeadroomEffW === 'number') {
							// Fallback: (ältere Builds) – headroom basiert auf NVP inkl. Batterie; kann flappen,
							// aber ist besser als nichts.
							headroomByImportCapW = Math.max(0, importHeadroomEffW);
						}

						if (typeof headroomByImportCapW === 'number') {
							chargeW = Math.min(chargeW, headroomByImportCapW);
						} else if (peakEnabled && isFinite(psLimitW) && psLimitW > 0) {
							const headroomW = Math.max(0, psLimitW - realImportW);
							chargeW = Math.min(chargeW, headroomW);
						}


						// Nicht gegen Einspeisung "anladen" – PV-Überschuss wird unten behandelt.
						// Hinweis: Dadurch wird bei Einspeisung kein zusätzliches Netzladen erzwungen.
						// (Bewusstes Design: PV-Überschuss-Laden übernimmt dann die Regelung.)
						if (nvpNowW < 0) {
							chargeW = 0;
						}

						// ------------------------------------------------------------
						// PV‑Reserve / PV‑aware Netzladen (Tarif)
						//
						// Ziel: Wenn PV‑Erzeugung zu erwarten ist, soll der Speicher im
						// günstigen Tarif‑Fenster nicht „voll“ aus dem Netz geladen werden.
						// Stattdessen halten wir einen dynamischen Headroom frei, damit PV
						// tagsüber in den Speicher laden kann (weniger unnötige Zyklen).
						//
						// Vorgehen:
						// - Forecast -> PV Charge‑Potential (kWh) im nächsten Horizon (Default 24h)
						// - captureFactor + confidence => erwartbar speicherbare PV‑kWh
						// - Headroom(%) = kWh / Kapazität
						// - Netzlade‑SoC‑Cap = socTarget - Headroom, mindestens minSocForWait
						// - Wenn SoC >= Cap => Netzladen im Tarif blockieren.
						// ------------------------------------------------------------
						let pvBlockGridCharge = false;
						let pvBlockReason = '';
						let pvDebug = null;
						try {
						  const pf = (this.adapter && this.adapter._pvForecast) ? this.adapter._pvForecast : null;
						  const pvReserveEnabled = (cfg.tariffPvReserveEnabled !== false); // default: ON
						  if (pvReserveEnabled && pf && pf.valid && Array.isArray(pf.curve) && pf.curve.length) {
						    // Bei sehr alten Forecasts lieber keine PV‑Reserve erzwingen.
						    const maxAgeMs = 24 * 3600000;
						    const ageOk = (pf.ageMs === null || pf.ageMs === undefined) ? true : (pf.ageMs <= maxAgeMs);
						    if (ageOk && typeof soc === 'number' && Number.isFinite(soc)) {
						      // Kapazität (kWh):
						      // - Speicherfarm: Summe aus Farm‑Konfig
						      // - Single: installerConfig.storage.capacityKWh (optional)
						      // - Fallback: gemappter DP (st.capacityKwh)
						      let capKWh = null;
						      try {
						        const farmCfg2 = (this.adapter && this.adapter.config && this.adapter.config.storageFarm) ? this.adapter.config.storageFarm : null;
						        if (farmCfg2 && farmCfg2.enabled && Array.isArray(farmCfg2.storages)) {
						          let sum = 0;
						          for (const s of farmCfg2.storages) {
						            if (!s || s.enabled === false) continue;
						            const c = Number(s.capacityKWh);
						            if (Number.isFinite(c) && c > 0) sum += c;
						          }
						          if (sum > 0) capKWh = sum;
						        }
						      } catch {
						        // ignore
						      }

						      if (!(typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0)) {
						        const capCfg = Number(this.adapter?.config?.storage?.capacityKWh);
						        if (Number.isFinite(capCfg) && capCfg > 0) capKWh = capCfg;
						      }

						      if (!(typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0) && this.dp) {
						        const capDp = this.dp.getNumber('st.capacityKwh', null);
						        if (typeof capDp === 'number' && Number.isFinite(capDp) && capDp > 0) capKWh = capDp;
						      }

						      if (typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0) {
						        const socTarget = (typeof hardChargeMaxSoc === 'number' && Number.isFinite(hardChargeMaxSoc)) ? hardChargeMaxSoc : 100;

						        // Horizon (h) + Heuristik‑Faktoren
						        const horizonH = clamp(num(cfg.tariffPvReserveHorizonHours, 24), 1, 48);
						        const captureFactor = clamp(num(cfg.tariffPvReserveCaptureFactor, 0.6), 0, 1);
						        const confidence = clamp(num(cfg.tariffPvReserveConfidence, 0.85), 0, 1);

						        // Wenn SoC sehr niedrig: nicht warten, sondern laden.
						        const reserveMinEff = reserveEnabled ? reserveMin : 0;
						        const minSocForWaitCfg = num(cfg.tariffPvReserveMinSocPct, NaN);
						        const minSocForWait = (Number.isFinite(minSocForWaitCfg))
						          ? clamp(minSocForWaitCfg, 0, socTarget)
						          : Math.max(reserveMinEff + 2, 10);

						        // PV Charge‑Potential (kWh) über den Horizon, limitiert durch maxChargeW (falls gesetzt).
						        let pvChargePotentialKWh = 0;
						        const t0 = now;
						        const t1 = t0 + horizonH * 3600000;
						        const limitW = (typeof maxChargeW === 'number' && Number.isFinite(maxChargeW) && maxChargeW > 0) ? maxChargeW : null;
						        for (const seg of pf.curve) {
						          if (!seg || typeof seg.t !== 'number' || typeof seg.dtMs !== 'number' || typeof seg.w !== 'number') continue;
						          const s0 = seg.t;
						          const s1 = seg.t + seg.dtMs;
						          if (s1 <= t0) continue;
						          if (s0 >= t1) break;
						          const ov0 = Math.max(s0, t0);
						          const ov1 = Math.min(s1, t1);
						          const ovMs = ov1 - ov0;
						          if (ovMs <= 0) continue;
						          const w = Math.max(0, seg.w);
						          const wEff = (limitW ? Math.min(w, limitW) : w);
						          pvChargePotentialKWh += (wEff * (ovMs / 3600000)) / 1000;
						        }

						        // Erwartbar speicherbare PV‑kWh (konservativ)
						        const pvStorableKWh = pvChargePotentialKWh * captureFactor * confidence;

						        // Headroom in % (clamp auf sinnvolle Range)
						        const headroomSocPctRaw = (pvStorableKWh > 0) ? (pvStorableKWh / capKWh) * 100 : 0;
						        const headroomSocPct = clamp(headroomSocPctRaw, 0, socTarget);

						        // Netzlade‑SoC‑Cap: Ziel minus Headroom (mindestens minSocForWait)
						        const capSocPct = clamp(socTarget - headroomSocPct, minSocForWait, socTarget);

						        const active = (headroomSocPct >= 1.0) && (capSocPct < (socTarget - 0.5));
						        if (active && soc >= (capSocPct - 1e-9)) {
						          pvBlockGridCharge = true;
						          pvBlockReason = `PV‑Reserve: Netzladen bis max ${capSocPct.toFixed(1)}% (Headroom ${headroomSocPct.toFixed(1)}% ≈ ${pvStorableKWh.toFixed(1)} kWh)`;
						        }

						        pvDebug = {
						          mode: 'pvReserveCap',
						          ageMs: (pf.ageMs === null || pf.ageMs === undefined) ? null : Math.round(Number(pf.ageMs)),
						          capKWh: Number(capKWh),
						          socNow: soc,
						          socTarget,
						          horizonH,
						          pvChargePotentialKWh: Number(pvChargePotentialKWh),
						          captureFactor,
						          confidence,
						          pvStorableKWh: Number(pvStorableKWh),
						          headroomSocPct: Number(headroomSocPct),
						          capSocPct: Number(capSocPct),
						          minSocForWait,
						          blocked: pvBlockGridCharge,
						          reason: pvBlockGridCharge ? pvBlockReason : '',
						        };
						      }
						    }
						  }
						} catch {
						  // ignore
						}

						if (pvDebug) {
						  pvAwareTariff = pvDebug;
						}

						if (pvBlockGridCharge) {
						  chargeW = 0;
						}
						targetW = -Math.max(0, chargeW);
						if (pvBlockGridCharge) {
							reason = pvBlockReason || 'Tarif: günstig – PV Forecast -> Netzladen gesperrt';
						} else {
							reason = (targetW === 0) ? 'Tarif: günstig – Netzladen nicht möglich' : 'Tarif: günstig – Netzladen';
						}
						source = 'tarif';
					}
				} else if (want > 0) {
					// Entladen (Tarif teuer/neutral/unbekannt): NVP-Regelung auf kleinen Netzbezug.
					//
					// WICHTIG (Bug-Fix):
					// Eine reine "Sollleistung = aktueller Import" Regelung konvergiert mathematisch auf ~50% der Last
					// (Fixpunkt: Speicher ≈ Netzbezug ≈ Last/2). Das erklärt hohe Bezüge trotz Entladen.
					//
					// Lösung: inkrementelle Regelung (Sollwert = letzter Sollwert + Fehler), mit Deadband.
					// Ziel: Netzbezug nahe Zielwert halten (Default 100 W), ohne Export durch Messrauschen.
					if (typeof soc === 'number' && soc < selfMinSoc) {
						targetW = 0;
						reason = 'Tarif: Entladen blockiert (SoC-Min erreicht)';
						source = 'tarif';
					} else {
						const targetImportW = Math.max(0, num(cfg.tariffTargetGridImportW, selfTargetGridW));
						const deadbandW = Math.max(0, num(cfg.tariffImportThresholdW, selfImportThresholdW));

						// Tarif-Entladung regelt am NVP.
						// Primär nutzen wir den ROH-Wert (NVP), weil eine starke Glättung zu Verzögerungen
						// und damit zu Sollwert-Spikes/Überschwingern führen kann.
						// Stabilisierung erfolgt über Deadband + Dispatcher (Schritt/Rampe).
						const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;
						const nvpCtrlW = (typeof nvpRawW === 'number') ? nvpRawW : gridW;

						// Basis ist entweder:
						// - die Ist-Batterieleistung (OpenEMS-Balancing: batt + (grid-target)) oder
						// - der letzte Sollwert (Fallback: inkrementelle Regelung), falls keine Istleistung verfügbar ist.
						const curSetW = (typeof this._lastTargetW === 'number' && this._lastTargetW > 0) ? this._lastTargetW : 0;
						const battWRaw = (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Number(battPowerW) : null;
						const battW = (typeof battWRaw === 'number') ? Math.max(0, battWRaw) : null;

						let errW = (typeof nvpCtrlW === 'number') ? (nvpCtrlW - targetImportW) : 0;
						// Wenn RAW bereits Export zeigt, sofort reduzieren.
						if (typeof nvpRawW === 'number' && nvpRawW < (targetImportW - deadbandW)) {
							errW = nvpRawW - targetImportW;
						}

						// Deadband gegen Flattern: erst außerhalb der Bandbreite nachregeln
						let errAdjW = 0;
						if (errW > deadbandW || errW < -deadbandW) {
							errAdjW = errW; // volle Abweichung verwenden (keine systematische Offset-Regelung)
						}

						// OpenEMS-Balancing (Vorbild): neuer Sollwert = battIst + (gridIst - gridZiel)
						// Fallback ohne Ist-Batterieleistung: inkrementelle Regelung (Soll = letzter Sollwert + Fehler)
						// Rampe/Schrittweite/Anti-PingPong folgen im Dispatcher weiter unten.
						let nextSetW = (typeof battW === 'number') ? (battW + errAdjW) : (curSetW + errAdjW);

						// Safety-Clamp gegen unnötige Export-Spikes:
						// Begrenze grob auf aktuelle Hauslast am NVP: Import (roh) + aktuelle Entladung (falls messbar) + Puffer.
						const importRawNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
						const dischargeNowW = (typeof battW === 'number') ? Math.max(0, battW) : 0;
						const safetyMarginW = 200;
						const maxByDemandW = importRawNowW + dischargeNowW + safetyMarginW;
						if (Number.isFinite(maxByDemandW) && maxByDemandW > 0) {
							nextSetW = Math.min(nextSetW, maxByDemandW);
						}

						// WICHTIG (Tarif-Logik / Bugfix):
						// Die vom Endkunden in der VIS eingetragene "Speicher-Leistung" (tv.speicherSollW)
						// soll im Tarif-Fenster ausschliesslich die Beladeleistung (Netzladen im guenstigen Fenster)
						// begrenzen. Fuer die Entladung wird am Netzverknuepfungspunkt (NVP) geregelt,
						// damit der Netzbezug gegen ~0 (bzw. targetImportW) faehrt.
						//
						// Technische Limits bleiben natuerlich aktiv (maxDischargeW + Demand-Clamp oben).
						const maxEffW = maxDischargeW;
						nextSetW = clamp(nextSetW, 0, maxEffW);

						targetW = nextSetW;
						reason = (targetW === 0)
							? 'Tarif: teuer – kein Bedarf'
							: `Tarif: teuer – NVP-Regelung (Ziel Import≈${Math.round(targetImportW)}W${(typeof battW === 'number') ? ', Balancing' : ''})`;
						source = 'tarif';
					}
				}
			}
		}
// 3) Eigenverbrauch: Entladen zur Netzbezug-Reduktion (optional)
if (targetW === 0 && selfDischargeEnabled) {
    // Wenn der dynamische Tarif im "günstig"-Fenster ist, soll der Speicher nicht
    // durch Eigenverbrauchs-Entladung geleert werden (Reserve halten / günstigen Netzstrom nutzen).
    if (typeof dischargeAllowed === 'boolean' && dischargeAllowed === false) {
        if (source === 'idle' || reason === 'Keine Aktion') {
            reason = 'Tarif: günstig – Eigenverbrauchs-Entladung gesperrt';
            source = 'tarif';
        }
    } else {
    // Wichtig: Bei Eigenverbrauchs-Entladung regeln wir auf den NVP.
    // Dafür verwenden wir bewusst den ROH-Wert (NVP) ohne Glättung, um Verzögerungen zu vermeiden.
    //
    // Kritischer Punkt (Bug-Fix): Eine reine "Sollleistung = aktueller Import"-Logik konvergiert
    // mathematisch auf ~50% der Last (Fixpunkt), statt den Import wirklich gegen 0 zu drücken.
    // Lösung: Integrations-/Inkrement-Regelung (PI-light): Sollwert wird um den aktuellen Fehler angepasst.

    // Eigenverbrauch regelt am Netzverknüpfungspunkt (NVP).
    // Für die Regelung nutzen wir primär den ROH-Wert (NVP), weil eine starke Glättung
    // (z. B. Peak‑Shaving‑Smoothing) zu Verzögerungen führt und dann genau die beobachteten
    // Sollwert-Spikes/Überschwinger erzeugt.
    // Stabilität kommt hier aus Deadband + Schrittweite/Rampe im Dispatcher.
    const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;      // roh (Fallback)
    const nvpCtrlW = (typeof nvpRawW === 'number') ? nvpRawW : gridW;       // aktuell für Regelung
    const desiredNvpW = selfTargetGridW; // typischerweise kleiner Import (Default 100 W)
    const deadbandW = Math.max(0, selfImportThresholdW); // Start-/Stop-Schwelle gegen Flattern

    // Eigenverbrauch hat einen eigenen "Integrator": nur fortsetzen, wenn wir in der letzten Runde
    // auch aus Eigenverbrauch geregelt haben. Sonst bei 0 starten, damit LSK/Tarif nicht "nachhängt".
    const lastWasSelf = (this._lastSource === 'eigenverbrauch');
    const curSetW = (lastWasSelf && typeof this._lastTargetW === 'number' && this._lastTargetW > 0)
        ? this._lastTargetW
        : 0;

	    // Ist-Batterieleistung (positiv = Entladung). Falls verfügbar nutzen wir eine
	    // OpenEMS-ähnliche Balancing-Regelung: Soll = battIst + (gridIst - gridZiel).
	    // Ohne Istleistung bleibt der bisherige Fallback (inkrementell über letzten Sollwert).
	    const battWRaw = (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Number(battPowerW) : null;
	    const battW = (typeof battWRaw === 'number') ? Math.max(0, battWRaw) : null;

    // Fehler: positiver Fehler => zu viel Import => mehr entladen.
    // negativer Fehler => Export/zu wenig Import => Entladung reduzieren.
    // NOTE: Wenn ROH bereits Export zeigt, ist nvpCtrlW ohnehin negativ – dadurch wird sofort reduziert.
    const errW = (typeof nvpCtrlW === 'number') ? (nvpCtrlW - desiredNvpW) : 0;

    // PI-light: Inkrement-Regelung.
    // Hinweis: Stabilisierung erfolgt über Deadband + Dispatcher (Schrittweite/Rampe/Anti-PingPong).
    let errAdjW = 0;
    if (errW > deadbandW || errW < -deadbandW) {
        errAdjW = errW;
    }

	    // OpenEMS-Balancing (Vorbild): battIst + (gridIst - gridZiel)
	    // Fallback: letzter Sollwert + Fehler
	    let nextSetW = (typeof battW === 'number') ? (battW + errAdjW) : (curSetW + errAdjW);

    // Safety-Clamp gegen Überschwingen:
    // Wenn battW nicht gemappt ist (oder NVP kurzfristig "alt" ist), kann die inkrementelle Regelung
    // zu großen Sollwerten aufintegrieren. Wir begrenzen deshalb die Entladeleistung grob auf
    // "aktuelle Last" am NVP: Import (roh) + aktuelle Entladung (falls messbar) + kleiner Puffer.
    // Dadurch bleibt die Regelung im Bereich der realen Hauslast und erzeugt keine Export-Spikes.
    const importRawNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
    const dischargeNowW = (typeof battW === 'number') ? Math.max(0, battW) : 0;
    const safetyMarginW = 200; // bewusst konservativ; Feintuning über selfTargetGridW/Deadband/Rampe
    const maxByDemandW = importRawNowW + dischargeNowW + safetyMarginW;
    if (Number.isFinite(maxByDemandW) && maxByDemandW > 0) {
        nextSetW = Math.min(nextSetW, maxByDemandW);
    }

    // Nur Entladen in diesem Block (kein Laden). Negative Werte sind hier nicht sinnvoll.
    nextSetW = clamp(nextSetW, 0, selfMaxDischargeEff);

    // SoC-Hysterese: verhindert Flattern um die Untergrenze und sorgt für eine
    // echte Ruhephase (0 W), sobald die SoC-Grenze erreicht ist.
    let socOk = true;
    if (typeof soc === 'number') {
        this._socSelfDischargeEnabled = hystAbove(
            this._socSelfDischargeEnabled,
            soc,
            selfMinSoc,
            selfMinSoc + this._socHystPct,
        );
        socOk = this._socSelfDischargeEnabled;
    }

    const allow = (!reserveActive && !reserveChargeWanted && socOk);

    // Aktivierung: Nur wenn Import oberhalb der Schwelle liegt ODER wir bereits aktiv waren
    // (Integrator hält den Sollwert dann stabil und passt ihn nach oben/unten an).
    const importNowW = Math.max(0, (typeof nvpCtrlW === 'number') ? nvpCtrlW : 0);
    const startCond = (importNowW >= deadbandW) || lastWasSelf;

    if (allow && startCond && nextSetW > 0) {
        targetW = nextSetW;
	        reason = `Eigenverbrauch: entladen (${Math.round(targetW)} W${(typeof battW === 'number') ? ', Balancing' : ''})`;
        source = 'eigenverbrauch';
        hardDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
    }
    }
}

// 4) Eigenverbrauch: PV-Überschuss laden (wenn keine Lastspitze/Tarif/EV-Entladung aktiv)
        if (targetW === 0 && cfg.pvEnabled !== false) {
            // Zero-Export (Nulleinspeisung): bei Export möglichst früh (Schwellwert) in den Speicher laden.
            // Hinweis: Extra-Bias nur, wenn Netzladen erlaubt ist (sonst würde der Bias u.U. Netzenergie in den Speicher ziehen).
            const zeCfg = (this.adapter.config && this.adapter.config.enableGridConstraints) ? (this.adapter.config.gridConstraints || {}) : {};
            const zeEnabled = !!((this.adapter.config && this.adapter.config.enableGridConstraints) && zeCfg.zeroExportEnabled);
            const zeDeadband = Math.max(0, num(zeCfg.zeroExportDeadbandW, 50));
            const zeBias = Math.max(0, num(zeCfg.zeroExportBiasW, 80));

            const thrBase = Math.max(0, num(cfg.pvExportThresholdW, 200));
            const thr = zeEnabled ? Math.min(thrBase, zeDeadband) : thrBase;

            // Max-SoC für Laden: größter Bereich (Self/LSK/Reserve-Ziel)
            const lskMaxSocForCharge = (cfg.lskChargeEnabled !== false) ? lskMaxSoc : selfMaxSoc;
        const maxSocForCharge = clamp(Math.max(selfMaxSoc, lskMaxSocForCharge, reserveTarget), 0, 100);
            hardChargeMaxSoc = maxSocForCharge;

            const canChargeBySoc = (typeof soc !== 'number') ? true : (soc < maxSocForCharge);

            // Bereichsabhängiges Lade-Limit (Self vs LSK)
            let chargeLimitW = maxChargeW;
            if (typeof soc === 'number') {
                if (soc < selfMaxSoc) {
                    chargeLimitW = selfMaxChargeEff;
                } else if (soc < lskMaxSoc) {
                    chargeLimitW = lskMaxChargeEff;
                } else {
                    chargeLimitW = 0;
                }
            }

            if (exportRawW >= thr && canChargeBySoc && chargeLimitW > 0) {
                // Für die eigentliche Sollwert-Berechnung nutzen wir den geglätteten Export,
                // damit die Ladeleistung bei wolkigem Himmel nicht "zittert".
                const exportCtrlW = (typeof exportW === 'number') ? exportW : exportRawW;
                const extraBias = (zeEnabled && gridChargeAllowed) ? zeBias : 0;
                targetW = -clamp(exportCtrlW + extraBias, 0, chargeLimitW);
                reason = zeEnabled ? 'Nulleinspeisung: Export in Speicher umleiten' : 'Eigenverbrauch: PV-Überschuss laden';
                source = 'pv';
            }
        }

        // 5) Notstrom: Reserve ggf. über Netz wieder auffüllen (optional)
        // Hinweis: Standardmäßig AUS (reserveGridChargeW = 0). Aktivieren nur, wenn gewünscht.
        // Wichtig: Bei aktivem Peak-Shaving wird die Netzladung (sofern möglich) innerhalb des Peak-Limits gehalten.
        if (targetW === 0 && reserveChargeWanted && reserveGridChargeW > 0 && gridChargeAllowed) {
            // Nur laden, wenn SoC unter Reserve-Ziel
            // Reserve-Aufladung: SoC-Grenze bereits im Vorfeld mit Hysterese bewertet.
            const canChargeBySoc = (typeof soc === 'number') ? (this._socReserveRefillEnabled === true) : false;
            if (canChargeBySoc) {
                let wantW = clamp(reserveGridChargeW, 0, maxChargeW);
                if (typeof importHeadroomEffW === 'number') {
                    wantW = Math.min(wantW, importHeadroomEffW);
                } else if (typeof psHeadroomFilteredW === 'number') {
                    wantW = Math.min(wantW, psHeadroomFilteredW);
                } else if (typeof psHeadroomW === 'number') {
                    wantW = Math.min(wantW, psHeadroomW);
                }

                if (wantW > 0) {
                    targetW = -wantW;
                    reason = 'Notstrom: Reserve über Netz laden';
                    source = 'reserve';
                    hardChargeMaxSoc = Math.max(hardChargeMaxSoc, reserveTarget);
                }
            }
        }

        // Effective headroom for refill:
        // - Use filtered (average) headroom for stable setpoints
        // - Clamp with RAW headroom for safety (Import spikes)
        let psHeadroomEffW = (typeof psHeadroomFilteredW === 'number') ? psHeadroomFilteredW : psHeadroomW;
        if (typeof psHeadroomEffW === 'number' && typeof psHeadroomRawW === 'number') {
            psHeadroomEffW = Math.min(psHeadroomEffW, psHeadroomRawW);
        }
        // Phase 4: auch globales Import-Headroom beachten (Grid-Constraints / Installateur-Cap)
        if (typeof importHeadroomEffW === 'number') {
            psHeadroomEffW = (typeof psHeadroomEffW === 'number') ? Math.min(psHeadroomEffW, importHeadroomEffW) : importHeadroomEffW;
        }

        // 6) Peak-Shaving: Reserve für nächste Lastspitze aus dem Netz nachladen (Headroom)
        // Ziel: Falls der Speicher für LSK entladen hat (oder generell unter LSK-Max liegt),
        // darf er die "übrige" Leistung bis zum Peak-Limit zum Nachladen nutzen.
        // Dadurch bleibt der Speicher für kommende Peaks verfügbar, ohne die Peak-Grenze zu reißen.
        if (
            targetW === 0 &&
            peakEnabled &&
            lskEnabledCfg &&
            (cfg.lskChargeEnabled !== false) &&
            (typeof psHeadroomEffW === 'number' && psHeadroomEffW > 0) &&
            (gridW >= 0)
        ) {
            // SoC-Hysterese: Refill erst wieder starten, wenn der SoC merklich
            // unterhalb der Grenze liegt (sonst pendelt es um den Grenzwert).
            let canChargeBySoc = false;
            if (typeof soc === 'number') {
                const onBelow = Math.max(0, lskMaxSoc - this._socHystPct);
                this._socLskRefillEnabled = hystBelow(this._socLskRefillEnabled, soc, onBelow, lskMaxSoc);
                canChargeBySoc = !!this._socLskRefillEnabled;
            }
            if (canChargeBySoc) {
                let wantW = Math.min(psHeadroomEffW, lskMaxChargeEff);

                // Optional: reduce "flutter" by holding small upward adjustments.
                // We intentionally allow fast decreases (safety), but require a minimal delta to increase.
                const psCfg = (this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
                const psReleaseDelaySec = Math.max(0, num(psCfg.releaseDelaySec, 0));
                const psReleaseDelayMs = psReleaseDelaySec * 1000;
                const hysteresisW = Math.max(0, num(psCfg.hysteresisW, 0));
                // Refill nie bis exakt ans Limit fahren (sonst PingPong/Flattern): wir lassen eine Margin frei.
                // Margin: mindestens Hysterese oder Ramp-Step.
                const refillMarginW = Math.max(hysteresisW, stepW, 100);
                const refillDelayActive = (psReleaseDelayMs > 0) && (this._lastPeakActiveMs > 0) && ((now - this._lastPeakActiveMs) < psReleaseDelayMs);

                // Effektives Headroom für Refill (mit Margin). Mit Margin wird verhindert, dass das
                // Nachladen die Netzanschlussgrenze "ausreizt" und dadurch direkt wieder eine LSK-
                // Entladung getriggert wird (Ping-Pong).
                const headroomForRefillW = Math.max(0, psHeadroomEffW - refillMarginW);
                wantW = Math.min(headroomForRefillW, lskMaxChargeEff);

                if (refillDelayActive) {
                    // Direkt nach einem Peak nicht sofort wieder nachladen, sonst pendelt die Regelung.
                    wantW = 0;
                    this._lskRefillHoldW = null;
                }
                const deadbandW = clamp(num(cfg.lskRefillDeadbandW, num(psCfg.hysteresisW, 500)), 0, 5000);
                if (stepW > 0) wantW = Math.round(wantW / stepW) * stepW;

                if (typeof this._lskRefillHoldW === 'number') {
                    const last = this._lskRefillHoldW;
                    if (wantW < last) {
                        // decrease immediately
                        this._lskRefillHoldW = wantW;
                    } else if (deadbandW > 0 && (wantW - last) < deadbandW) {
                        // hold
                        wantW = last;
                    } else {
                        this._lskRefillHoldW = wantW;
                    }
                } else {
                    this._lskRefillHoldW = wantW;
                }

                wantW = (typeof this._lskRefillHoldW === 'number') ? this._lskRefillHoldW : wantW;

                if (wantW > 0) {
                    targetW = -wantW;
                    reason = `LSK: Reserve über Netz nachladen (${Math.round(psHeadroomEffW)} W frei)`;
                    source = 'lastspitze_refill';
                    hardChargeMaxSoc = Math.max(hardChargeMaxSoc, lskMaxSoc);
                }
            }
        }

        
        // 6b) Diagnose: LSK-Refill gewünscht, aber kein Grenzwert/Headroom vorhanden
        // Damit ist im Betrieb sofort sichtbar, warum kein Netzladen erfolgt.
        if (
            targetW === 0 &&
            peakEnabled &&
            lskEnabledCfg &&
            (cfg.lskChargeEnabled !== false) &&
            (gridW >= 0) &&
            (typeof soc === 'number') && (this._socLskRefillEnabled === true)
        ) {
            if (!(typeof psLimitW === 'number' && psLimitW > 0)) {
                reason = 'LSK: kein Grenzwert konfiguriert (Netzanschlussleistung im EMS setzen)';
                source = 'lastspitze_refill';
            } else if (!(typeof psHeadroomEffW === 'number' && psHeadroomEffW > 0)) {
                reason = `LSK: kein Headroom frei (${Math.round(importW)} / ${Math.round(psLimitW)} W)`;
                source = 'lastspitze_refill';
            }
        }

        // ------------------------------------------------------------
        // Phase 2: Dispatcher-Diagnose (Policy-Request vs. finaler Setpoint)
        // ------------------------------------------------------------
        const _reqW = targetW;
        const _reqQuelle = source;
        const _reqGrund = reason;

        // Grenzen anwenden
        targetW = clamp(targetW, -maxChargeW, maxDischargeW);
        const _clampW = targetW;

        // Schrittweite
        if (stepW > 0) {
            targetW = Math.round(targetW / stepW) * stepW;
        }
        const _stepW = targetW;

        // Anti-PingPong (Laden <-> Entladen) / Anti-Flattern um 0
        // Ziel: Kleine Schwingungen und harte Richtungswechsel vermeiden, ohne die
        // Lastspitzenkappung (Sicherheitsfunktion) zu blockieren.
        {
            // WICHTIG (Bug-Fix): Die Peak-Shaving Hysterese darf nicht pauschal als
            // "Zero-Band" für alle Speicher-Policies wirken.
            //
            // Sonst passiert genau das beobachtete Verhalten:
            // - peakShaving.hysteresisW ist häufig 500 W (Default)
            // - Eigenverbrauch will z. B. 350–450 W entladen
            // - Anti-Flattern setzt alles < 500 W auf 0 W => Speicher bleibt aus
            //
            // Daher: Peak-Hysterese nur für peak-bezogene Quellen (LSK/Refill).
            const psRelevant = (source === 'lastspitze' || source === 'lastspitze_refill');
            const psHystW = psRelevant ? Math.max(0, num(psCfg.hysteresisW, 0)) : 0;
            // NVP-Balancing (Eigenverbrauch-/Tarif-Entladung): hier wollen wir auch kleine Leistungen zulassen,
            // sonst bleibt ein Rest-Netzbezug (z. B. 30–90 W) dauerhaft stehen.
            // Erkennung: Quelle eigenverbrauch oder tarif UND wir entladen (targetW > 0).
            const isNvpBalancing = (targetW > 0) && (source === 'eigenverbrauch' || source === 'tarif');
            const zeroBandW = Math.max(psHystW, stepW, isNvpBalancing ? 20 : 100);

            // Optional: Expert-Parameter. Wenn nicht gesetzt, Default 5s.
            const cfgHoldSec = Math.max(0, num(cfg.modeHoldSec, 0));
            const baseHoldMs = cfgHoldSec > 0 ? (cfgHoldSec * 1000) : 5000;
            const relHoldMs = Math.max(0, num(psCfg.releaseDelaySec, 0)) * 1000;
            const holdMs = Math.max(2000, Math.min(15000, Math.max(baseHoldMs, relHoldMs)));

            const emergencyDischarge = (source === 'lastspitze') && (targetW > 0);

            if (emergencyDischarge) {
                // Sicherheitsfall: Lock aufheben, damit wir garantiert entladen können.
                this._signLockUntilMs = 0;
                this._signLockReason = '';
            } else {
                // Kleine Zielwerte um 0 => 0 (Anti-Flattern)
                if (Math.abs(targetW) < zeroBandW) {
                    targetW = 0;
                    // Diagnose: Der Sollwert wurde bewusst auf 0 gesetzt.
                    // (ohne Änderung wäre für den Betreiber nicht ersichtlich, warum keine Entladung/Ladung stattfindet)
                    if (source && source !== 'idle') {
                        reason = `${reason || 'Regelung'} (Deadband < ${Math.round(zeroBandW)} W)`;
                        source = 'idle';
                    }
                }

                // Wenn gerade eine Sperrzeit aktiv ist: Zielwert auf 0 zwingen
                if (this._signLockUntilMs && (now < this._signLockUntilMs)) {
                    if (targetW !== 0) {
                        targetW = 0;
                        if (!reason) {
                            reason = this._signLockReason || 'Anti-PingPong aktiv (Sperrzeit)';
                        }
                        if (!source) {
                            source = 'idle';
                        }
                    }
                } else {
                    // Neue Richtungsumkehr erkennen
                    const prevW = (typeof this._lastTargetW === 'number') ? this._lastTargetW : 0;
                    const signFlip = (prevW !== 0) && (targetW !== 0)
                        && (Math.sign(prevW) !== Math.sign(targetW))
                        && (Math.abs(prevW) >= zeroBandW) && (Math.abs(targetW) >= zeroBandW);

                    if (signFlip) {
                        this._signLockUntilMs = now + holdMs;
                        this._signLockReason = 'Anti-PingPong: Richtungswechsel -> erst auf 0 gehen';
                        targetW = 0;
                        reason = this._signLockReason;
                        source = 'idle';
                    } else {
                        this._signLockReason = '';
                    }
                }
            }
        }

        const _antiW = targetW;

// Rampenbegrenzung
// Soft-Start: Wenn nach Neustart noch kein letzter Sollwert bekannt ist, starten wir von 0 W.
// Das verhindert große Sollwert-Sprünge beim Aktivieren (z. B. Eigenverbrauch / Tarif-NVP-Regelung).
const _prevRampW = (typeof this._lastTargetW === 'number' && Number.isFinite(this._lastTargetW)) ? this._lastTargetW : 0;
{
    const d = targetW - _prevRampW;

    // PV-Überschuss-Laden: schneller hochfahren (mehr Laden), aber schnell zurücknehmen (sicher gegen Netzbezug)
    if (source === 'pv' && targetW < 0) {
        const pvMaxDelta = (pvMaxDeltaCfg > 0) ? pvMaxDeltaCfg : maxDelta;

        if (pvMaxDelta > 0 && d < 0 && Math.abs(d) > pvMaxDelta) {
            // d < 0 => stärker laden (mehr negativ) -> begrenzen
            targetW = _prevRampW - pvMaxDelta;
            reason = `${reason} (PV‑Rampe)`;
        }
        // d >= 0 => weniger laden / Richtung 0 -> bewusst ohne Rampe (schnell reagieren)
    } else if (source === 'lastspitze' && targetW > 0) {
	        // Lastspitzenkappung: Sollwertsprünge begrenzen, damit der Speicher nicht "nervös" regelt.
	        // Hinweis: Für schnellere Reaktion -> "Max ΔW/Tick" erhöhen bzw. im Peak‑Shaving eine Reserve (W) setzen,
	        // damit Lastspitzen innerhalb der Reserve abgefangen werden können.
	        if (maxDelta > 0 && Math.abs(d) > maxDelta) {
	            targetW = _prevRampW + Math.sign(d) * maxDelta;
	            reason = `${reason} (LSK‑Rampe)`;
	        }
    } else {
        // Standard: symmetrische Rampe
        if (maxDelta > 0 && Math.abs(d) > maxDelta) {
            targetW = _prevRampW + Math.sign(d) * maxDelta;
            reason = `${reason} (Rampenbegrenzung)`;
        }
    }
}

        const _rampW = targetW;

        // Harte SoC-Grenzen auch nach Rundung/Rampe erzwingen (wichtig gegen "Rampen-Nachlauf")
        if (targetW > 0) {
            // Entladen: Notstrom-Reserve immer hart
            if (reserveActive) {
                targetW = 0;
                reason = 'Entladen blockiert (Notstrom-Reserve aktiv)';
                source = 'reserve';
            } else if ((typeof soc === 'number') && (soc <= hardDischargeMinSoc)) {
                targetW = 0;
                reason = `Entladen blockiert (SoC <= ${hardDischargeMinSoc}%)`;
                source = 'reserve';
            }
        } else if (targetW < 0) {
            // Laden: Max-SoC respektieren
            if ((typeof soc === 'number') && (soc >= hardChargeMaxSoc)) {
                targetW = 0;
                reason = `Laden blockiert (SoC >= ${hardChargeMaxSoc}%)`;
                source = 'pv';
            }
        }

        // ------------------------------------------------------------
        // Phase 2: Dispatcher-Diagnose-Zustände schreiben
        // ------------------------------------------------------------
        const _finalW = targetW;

        await this._setIfChanged('speicher.regelung.requestW', Number.isFinite(Number(_reqW)) ? Math.round(Number(_reqW)) : 0);
        await this._setIfChanged('speicher.regelung.requestQuelle', String(_reqQuelle || ''));
        await this._setIfChanged('speicher.regelung.requestGrund', String(_reqGrund || ''));

        // ------------------------------------------------------------
        // Phase 5: Policy/Audit – „wer will gerade was vom Speicher?“
        // ------------------------------------------------------------
        try {
            const tvPol = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			const pol = {
				ts: now,
				nvp: {
					// "ctrlW" ist der geglättete Wert (wie in der UI/Vis oft angezeigt).
					// "rawW" ist der ungeglättete NVP.
					// "usedW" ist der Wert, den wir in der Regelung bevorzugen (raw falls vorhanden).
					ctrlW: (typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.round(gridW) : null,
					rawW: (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Math.round(gridRawW) : null,
					usedW: (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Math.round(gridRawW)
						: ((typeof gridW === 'number' && Number.isFinite(gridW)) ? Math.round(gridW) : null),
					ageMs: (typeof gridAge === 'number' && Number.isFinite(gridAge)) ? Math.round(gridAge) : null,
				},
				battery: {
					powerW: (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Math.round(battPowerW) : null,
					ageMs: (typeof battPowerAge === 'number' && Number.isFinite(battPowerAge)) ? Math.round(battPowerAge) : null,
					invalidReason: (battPowerInvalidReason && String(battPowerInvalidReason).trim()) ? String(battPowerInvalidReason).trim() : null,
				},
                soc: (typeof soc === 'number' && Number.isFinite(soc)) ? soc : null,
                permissions: {
                    gridChargeAllowed: (typeof gridChargeAllowed === 'boolean') ? gridChargeAllowed : null,
                    dischargeAllowed: (typeof dischargeAllowed === 'boolean') ? dischargeAllowed : null,
                },
                tarif: {
                    active: !!(tvPol && tvPol.aktiv),
                    state: (tvPol && typeof tvPol.state === 'string') ? tvPol.state : null,
                    storageWantW: (tvPol && typeof tvPol.speicherSollW === 'number') ? tvPol.speicherSollW : null,
                },
                pvForecast: (() => {
                    const pf = (this.adapter && this.adapter._pvForecast) ? this.adapter._pvForecast : null;
                    if (!pf) return null;
                    return {
                        valid: !!pf.valid,
                        ageMs: (pf.ageMs === null || pf.ageMs === undefined || !Number.isFinite(Number(pf.ageMs))) ? null : Math.round(Number(pf.ageMs)),
                        kwhNext24h: (typeof pf.kwhNext24h === 'number' && Number.isFinite(pf.kwhNext24h)) ? Number(pf.kwhNext24h) : null,
                        peakWNext24h: (typeof pf.peakWNext24h === 'number' && Number.isFinite(pf.peakWNext24h)) ? Math.round(pf.peakWNext24h) : null,
                        points: (typeof pf.points === 'number' && Number.isFinite(pf.points)) ? pf.points : null,
                    };
                })(),
                pvAwareTarifNetzladen: pvAwareTariff ? pvAwareTariff : null,
                evcs: {
                    storageAssistReqW: (typeof evcsAssistReqW === 'number' && Number.isFinite(evcsAssistReqW)) ? Math.round(evcsAssistReqW) : 0,
                },
                limits: {
                    importLimitW: (typeof importLimitW === 'number' && Number.isFinite(importLimitW)) ? Math.round(importLimitW) : null,
                    importHeadroomW: (typeof importHeadroomEffW === 'number' && Number.isFinite(importHeadroomEffW)) ? Math.round(importHeadroomEffW) : null,
                },
                reserve: {
                    active: !!reserveActive,
                    chargeWanted: !!reserveChargeWanted,
                    minSocPct: reserveMin,
                    targetSocPct: reserveTarget,
                },
                decision: {
                    targetW: (typeof targetW === 'number' && Number.isFinite(targetW)) ? Math.round(targetW) : 0,
                    source: String(source || ''),
                    reason: String(reason || ''),
                },
            };
            await this._setIfChanged('speicher.regelung.tarifState', (pol.tarif && typeof pol.tarif.state === 'string') ? pol.tarif.state : '');
            await this._setIfChanged('speicher.regelung.tarifPvBlock', !!(pvAwareTariff && pvAwareTariff.blocked));
            await this._setIfChanged('speicher.regelung.tarifPvBlockGrund', (pvAwareTariff && typeof pvAwareTariff.reason === 'string') ? pvAwareTariff.reason : '');
            await this._setIfChanged('speicher.regelung.tarifPvCapSocPct', (pvAwareTariff && typeof pvAwareTariff.capSocPct === 'number' && Number.isFinite(pvAwareTariff.capSocPct)) ? Number(pvAwareTariff.capSocPct) : null);
            await this._setIfChanged('speicher.regelung.tarifPvHeadroomSocPct', (pvAwareTariff && typeof pvAwareTariff.headroomSocPct === 'number' && Number.isFinite(pvAwareTariff.headroomSocPct)) ? Number(pvAwareTariff.headroomSocPct) : null);
            await this._setIfChanged('speicher.regelung.tarifPvHeadroomKWh', (pvAwareTariff && typeof pvAwareTariff.pvStorableKWh === 'number' && Number.isFinite(pvAwareTariff.pvStorableKWh)) ? Number(pvAwareTariff.pvStorableKWh) : null);
            await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify(pol));
        } catch {
            // ignore
        }

        const _diag = {
            ts: now,
            reqW: Number.isFinite(Number(_reqW)) ? Math.round(Number(_reqW)) : 0,
            clampW: Number.isFinite(Number(_clampW)) ? Math.round(Number(_clampW)) : 0,
            stepW: Number.isFinite(Number(_stepW)) ? Math.round(Number(_stepW)) : 0,
            antiW: Number.isFinite(Number(_antiW)) ? Math.round(Number(_antiW)) : 0,
            rampW: Number.isFinite(Number(_rampW)) ? Math.round(Number(_rampW)) : 0,
            finalW: Number.isFinite(Number(_finalW)) ? Math.round(Number(_finalW)) : 0,
            reqSrc: String(_reqQuelle || ''),
            reqReason: String(_reqGrund || ''),
            src: String(source || ''),
            reason: String(reason || ''),
        };
        await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify(_diag));

        await this._applyTargetW(targetW, reason, source);

        // Diagnose: Grenzen
        // (0 = unbegrenzt)
        await this._setIfChanged('speicher.regelung.maxChargeW', (maxChargeLimitW_cfg > 0) ? Math.round(maxChargeLimitW_cfg) : 0);
        await this._setIfChanged('speicher.regelung.maxDischargeW', (maxDischargeLimitW_cfg > 0) ? Math.round(maxDischargeLimitW_cfg) : 0);
        await this._setIfChanged('speicher.regelung.stepW', Math.round(stepW));
        await this._setIfChanged('speicher.regelung.maxDeltaWPerTick', Math.round(maxDelta));
        await this._setIfChanged('speicher.regelung.pvSchwelleW', Math.round(Math.max(0, num(cfg.pvExportThresholdW, 200))));
    }

    _getCfg() {
        const storage = (this.adapter.config && this.adapter.config.storage) ? this.adapter.config.storage : {};
        return {
            controlMode: storage.controlMode,
            staleTimeoutSec: storage.staleTimeoutSec,
            socHystPct: storage.socHystPct,
            modeHoldSec: storage.modeHoldSec,
            tariffPermissionHoldSec: storage.tariffPermissionHoldSec,
            maxChargeW: storage.maxChargeW,
            maxDischargeW: storage.maxDischargeW,
            stepW: storage.stepW,
            maxDeltaWPerTick: storage.maxDeltaWPerTick,
            pvMaxDeltaWPerTick: storage.pvMaxDeltaWPerTick,
            reserveEnabled: storage.reserveEnabled,
            reserveMinSocPct: storage.reserveMinSocPct,
            reserveTargetSocPct: storage.reserveTargetSocPct,
            reserveGridChargeW: storage.reserveGridChargeW,
            pvEnabled: storage.pvEnabled,
            pvExportThresholdW: storage.pvExportThresholdW,

            // Gate E
            lskEnabled: storage.lskEnabled,
            lskDischargeEnabled: storage.lskDischargeEnabled,
            lskChargeEnabled: storage.lskChargeEnabled,
            lskMinSocPct: storage.lskMinSocPct,
            lskMaxSocPct: storage.lskMaxSocPct,
            lskMaxChargeW: storage.lskMaxChargeW,
            lskMaxDischargeW: storage.lskMaxDischargeW,
            lskRefillAvgSeconds: storage.lskRefillAvgSeconds,
            lskRefillDeadbandW: storage.lskRefillDeadbandW,



            selfDischargeEnabled: storage.selfDischargeEnabled,
            selfMinSocPct: storage.selfMinSocPct,
            selfMaxSocPct: storage.selfMaxSocPct,
            selfTargetGridImportW: storage.selfTargetGridImportW,
            selfImportThresholdW: storage.selfImportThresholdW,
            selfMaxChargeW: storage.selfMaxChargeW,
            selfMaxDischargeW: storage.selfMaxDischargeW,
            capacityKWh: storage.capacityKWh,

            // PV‑Reserve (Tarif‑Netzladen)
            tariffPvReserveEnabled: storage.tariffPvReserveEnabled,
            tariffPvReserveHorizonHours: storage.tariffPvReserveHorizonHours,
            tariffPvReserveCaptureFactor: storage.tariffPvReserveCaptureFactor,
            tariffPvReserveConfidence: storage.tariffPvReserveConfidence,
            tariffPvReserveMinSocPct: storage.tariffPvReserveMinSocPct,


            // Tarif-Entladung (NVP-Regelung)
            tariffTargetGridImportW: storage.tariffTargetGridImportW,
            tariffImportThresholdW: storage.tariffImportThresholdW,
        };
    }

    _readTarifVis(staleMs) {
        const aktiv = this.dp ? this.dp.getBoolean('vis.settings.dynamicTariff', false) : false;
        const aktivVal = !!aktiv;
        const aktivAge = this.dp ? this.dp.getAgeMs('vis.settings.dynamicTariff') : null;
        const aktivFresh = (aktivAge === null || aktivAge === undefined) ? true : (aktivAge <= staleMs);

        const modus = this.dp ? this.dp.getNumberFresh('vis.settings.tariffMode', staleMs, null) : null;
        const storageW = this.dp ? this.dp.getNumberFresh('vis.settings.storagePower', staleMs, null) : null;

        return {
            aktiv: aktivFresh && aktivVal,
            modus: (typeof modus === 'number') ? Math.round(modus) : null,
            storageW: (typeof storageW === 'number') ? storageW : null,
        };
    }

    async _applyTargetW(targetW, reason, source) {
        const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;

        // Diagnose: Ziel-Datenpunkt (Sollleistung)
        try {
            const e = (this.dp && this.dp.getEntry) ? this.dp.getEntry('st.targetPowerW') : null;
            await this._setIfChanged('speicher.regelung.targetObjId', e && e.objectId ? String(e.objectId) : '');
        } catch {
            await this._setIfChanged('speicher.regelung.targetObjId', '');
        }

        // schreiben (Sollleistung)
        // Wenn Speicherfarm aktiv ist und Setpoint-DPs konfiguriert sind, verteilen wir den Sollwert
        // auf mehrere Speicher (Pool/Gruppen) und schreiben NICHT mehr auf den Single-Storage-DP.
        let writeResult = null;
        let farmApplied = false;

        try {
            if (this.adapter && typeof this.adapter.applyStorageFarmTargetW === 'function') {
                const res = await this.adapter.applyStorageFarmTargetW(w, { source, reason });
                farmApplied = !!(res && res.applied);
                if (farmApplied) writeResult = true;
            }
        } catch (_eFarm) {
            farmApplied = false;
        }

        if (!farmApplied) {
            if (this.dp && this.dp.getEntry('st.targetPowerW')) {
                // Rohwert berechnen (Skalierung/Offset/Invert), damit der Installateur den Weg bis zum Endgerät nachvollziehen kann.
                try {
                    const e = this.dp.getEntry('st.targetPowerW');
                    const scale = (e && Number.isFinite(Number(e.scale)) && Number(e.scale) !== 0) ? Number(e.scale) : 1;
                    const offset = (e && Number.isFinite(Number(e.offset))) ? Number(e.offset) : 0;
                    let raw = (w - offset) / scale;
                    if (e && e.invert) raw = -raw;
                    if (e && Number.isFinite(Number(e.min))) raw = Math.max(Number(e.min), raw);
                    if (e && Number.isFinite(Number(e.max))) raw = Math.min(Number(e.max), raw);
                    await this._setIfChanged('speicher.regelung.lastWriteRaw', Math.round(raw));
                } catch {
                    await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                }

                try {
                    writeResult = await this.dp.writeNumber('st.targetPowerW', w, false);
                } catch (e) {
                    writeResult = false;
                }
            } else {
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
            }
        } else {
            // Bei Speicherfarm werden Setpoints pro Speicher geschrieben.
            await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
        }

        // Diagnose-Zustände schreiben
        await this._setIfChanged('speicher.regelung.sollW', w);
        await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || ''));
        await this._setIfChanged('speicher.regelung.schreibOk', writeResult === true);
        await this._setIfChanged('speicher.regelung.schreibStatus', farmApplied ? 'farm' : ((writeResult === null) ? 'unverändert' : (writeResult === true ? 'geschrieben' : 'nicht möglich')));

        this._lastTargetW = w;
        this._lastReason = String(reason || '');
        this._lastSource = String(source || '');
    }

    async _upsertInputsFromConfig() {
        if (!this.dp || typeof this.dp.upsert !== 'function') return;

        // Peak-Shaving-Konfig (Messungen) als Fallback registrieren
        const cfg = (this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
        const gridId = String(cfg.gridPointPowerId || '').trim();
        const pvId = String(cfg.pvPowerId || '').trim();
        const baseId = String(cfg.baseLoadPowerId || '').trim();
        const battId = String(cfg.batteryPowerId || '').trim();

        if (gridId) await this.dp.upsert({ key: 'ps.gridPowerW', objectId: gridId });
        if (pvId) await this.dp.upsert({ key: 'ps.pvW', objectId: pvId });
        if (baseId) await this.dp.upsert({ key: 'ps.baseLoadW', objectId: baseId });
        if (battId) await this.dp.upsert({ key: 'ps.batteryW', objectId: battId });
    }

    async _ensureStates() {
        await this.adapter.setObjectNotExistsAsync('speicher', {
            type: 'channel',
            common: { name: 'Speicher' },
            native: {},
        });
        await this.adapter.setObjectNotExistsAsync('speicher.regelung', {
            type: 'channel',
            common: { name: 'Speicher-Regelung' },
            native: {},
        });

        const mk = async (id, name, type, role, def = null) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false, def },
                native: {},
            });
            if (def !== null && def !== undefined) {
                try { await this.adapter.setStateAsync(id, def, true); } catch { /* ignore */ }
            }
        };

        await mk('speicher.regelung.aktiv', 'Speicher-Regelung aktiv (effektiv)', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivKonfig', 'Speicher-Regelung aktiv (Konfiguration)', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivAutoTarif', 'Auto-Aktivierung durch Tarif', 'boolean', 'indicator', false);

        // Phase 2: Dispatcher-Diagnose
        await mk('speicher.regelung.dispatcherVersion', 'Dispatcher-Version', 'string', 'text', '2.0');
        await mk('speicher.regelung.requestW', 'Requestleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.requestQuelle', 'Request Quelle', 'string', 'text', '');
        await mk('speicher.regelung.requestGrund', 'Request Grund', 'string', 'text', '');
        await mk('speicher.regelung.dispatcherJson', 'Dispatcher Details (JSON)', 'string', 'text', '');

        await mk('speicher.regelung.sollW', 'Sollleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.quelle', 'Quelle', 'string', 'text', '');
        await mk('speicher.regelung.grund', 'Grund', 'string', 'text', '');
        await mk('speicher.regelung.schreibStatus', 'Schreibstatus', 'string', 'text', '');
        await mk('speicher.regelung.schreibOk', 'Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.targetObjId', 'Sollleistung Ziel-Datenpunkt (Objekt-ID)', 'string', 'text', '');
        await mk('speicher.regelung.lastWriteRaw', 'Letzter Rohwert (Setpoint)', 'number', 'value');

        await mk('speicher.regelung.netzLeistungW', 'Netzleistung (W)', 'number', 'value.power');
        await mk('speicher.regelung.netzAlterMs', 'Netzleistung Alter (ms)', 'number', 'value.interval');
        await mk('speicher.regelung.netzLadenErlaubt', 'Netzladen erlaubt', 'boolean', 'indicator', true);
        await mk('speicher.regelung.entladenErlaubt', 'Entladen erlaubt', 'boolean', 'indicator', true);
        await mk('speicher.regelung.tarifState', 'Tarif Zustand', 'string', 'text', '');
        await mk('speicher.regelung.tarifPvBlock', 'Tarif-Netzladen durch PV-Forecast gesperrt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.tarifPvBlockGrund', 'PV-Forecast Sperrgrund', 'string', 'text', '');
        await mk('speicher.regelung.tarifPvCapSocPct', 'Tarif PV‑Reserve: Netzlade-SoC-Cap (%)', 'number', 'value', null);
        await mk('speicher.regelung.tarifPvHeadroomSocPct', 'Tarif PV‑Reserve: Headroom (%)', 'number', 'value', null);
        await mk('speicher.regelung.tarifPvHeadroomKWh', 'Tarif PV‑Reserve: erwartbare PV-Ladung (kWh)', 'number', 'value.energy', null);

        await mk('speicher.regelung.policyJson', 'Policy/Audit (JSON)', 'string', 'text', '');

        await mk('speicher.regelung.importLimitW', 'Netzbezug-Limit effektiv (W)', 'number', 'value.power');
        await mk('speicher.regelung.importLimitQuelle', 'Netzbezug-Limit Quelle', 'string', 'text');
        await mk('speicher.regelung.importHeadroomW', 'Netzbezug Headroom (W)', 'number', 'value.power');
        await mk('speicher.regelung.importHeadroomRawW', 'Netzbezug Headroom RAW (W)', 'number', 'value.power');

        await mk('speicher.regelung.lskHeadroomW', 'LSK Headroom (W)', 'number', 'value.power');
        await mk('speicher.regelung.lskHeadroomFilteredW', 'LSK Headroom gefiltert (W)', 'number', 'value.power');
        await mk('speicher.regelung.socPct', 'SoC (%)', 'number', 'value.battery');
        await mk('speicher.regelung.socAlterMs', 'SoC Alter (ms)', 'number', 'value.interval');

        await mk('speicher.regelung.reserveAktiv', 'Reserve aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.reserveMinSocPct', 'Mindest-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.reserveZielSocPct', 'Reserve Ziel-SoC (%)', 'number', 'value', 0);

        await mk('speicher.regelung.lskMinSocPct', 'LSK Min-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.lskMaxSocPct', 'LSK Max-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.selfMinSocPct', 'Eigenverbrauch Min-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.selfMaxSocPct', 'Eigenverbrauch Max-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.selfTargetGridImportW', 'Eigenverbrauch Ziel-Netzbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.selfImportThresholdW', 'Eigenverbrauch Deadband (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.selfEntladenAktiviert', 'Eigenverbrauch-Entladen aktiviert', 'boolean', 'indicator', false);

        await mk('speicher.regelung.maxChargeW', 'Max Ladeleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.maxDischargeW', 'Max Entladeleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.stepW', 'Schrittweite (W)', 'number', 'value', 0);
        await mk('speicher.regelung.maxDeltaWPerTick', 'Max Änderung je Takt (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvSchwelleW', 'PV-Überschuss-Schwelle (W)', 'number', 'value.power', 0);
    }

    async _setIfChanged(id, val) {
        const v = (val === undefined) ? null : val;
        try {
            const cur = await this.adapter.getStateAsync(id);
            const curVal = cur ? cur.val : null;
            if (cur && curVal === v) return;
            await this.adapter.setStateAsync(id, v, true);
        } catch (e) {
            // ignore
        }
    }

    async _readOwnNumber(id) {
        try {
            const s = await this.adapter.getStateAsync(id);
            const n = Number(s ? s.val : NaN);
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    async _readOwnString(id) {
        try {
            const s = await this.adapter.getStateAsync(id);
            if (!s) return '';
            const v = s.val;
            if (v === null || v === undefined) return '';
            return String(v);
        } catch {
            return '';
        }
    }
}

function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}

function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

module.exports = { SpeicherRegelungModule };
