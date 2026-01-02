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


        /** @type {number|null} */
        this._lskRefillHeadroomFilteredW = null;
        /** @type {number} */
        this._lskRefillLastTs = 0;

        /** @type {number|null} */
        this._lskRefillHoldW = null;

        /** @type {RollingWindow} */
        this._lskRefillImportWin = new RollingWindow(120);

    }

    async init() {
        await this._ensureStates();

        // Optional: zentrale Mess-/Hilfsdatenpunkte registrieren, damit die Regelung auch ohne Peak-Shaving-Modul laufen kann.
        await this._upsertInputsFromConfig();
    }

    async tick() {
        const enabled = !!this.adapter.config.enableStorageControl;
        const cfg = this._getCfg();

        // Diagnose: aktiv
        await this._setIfChanged('speicher.regelung.aktiv', enabled);

        // Wenn deaktiviert: Sollleistung auf 0 (falls möglich) und raus.
        if (!enabled) {
            await this._applyTargetW(0, 'Deaktiviert', 'aus');
            return;
        }

        // Mindestvoraussetzungen
        const controlMode = String(cfg.controlMode || 'targetPower');
        if (controlMode !== 'targetPower') {
            await this._applyTargetW(0, 'Steuerungsart nicht unterstützt (nur Sollleistung)', 'aus');
            return;
        }

        const hasTarget = this.dp ? !!this.dp.getEntry('st.targetPowerW') : false;

        // Speicherfarm: wenn aktiv und Setpoint-DPs pro Speicher vorhanden sind,
        // erlauben wir die Regelung auch ohne klassische Sollleistungs-Zuordnung (st.targetPowerW).
        const farmCfg = (this.adapter && this.adapter.config && this.adapter.config.storageFarm) ? this.adapter.config.storageFarm : {};
        const farmEnabled = !!(this.adapter && this.adapter.config && this.adapter.config.enableStorageFarm);
        const farmRows = Array.isArray(farmCfg.storages) ? farmCfg.storages : [];
        const hasFarmSetpoints = farmEnabled && farmRows.some(r => r && r.enabled !== false && (String(r.setChargePowerId||'').trim() || String(r.setDischargePowerId||'').trim()));

        if (!hasTarget && !hasFarmSetpoints) {
            await this._applyTargetW(0, 'Sollleistung-Datenpunkt fehlt (Zuordnung)', 'aus');
            return;
        }

        // Messwerte lesen
        const now = Date.now();
        const staleMs = Math.max(1, Math.round(num(cfg.staleTimeoutSec, 15) * 1000));

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

        // SoC für Reserve
        const soc = this.dp ? this.dp.getNumberFresh('st.socPct', staleMs, null) : null;
        const socAge = this.dp ? this.dp.getAgeMs('st.socPct') : null;

        // Wenn Netzleistung fehlt: sicher auf 0
        if (typeof gridW !== 'number') {
            await this._applyTargetW(0, 'Netzleistung fehlt oder zu alt', 'aus');
            await this._setIfChanged('speicher.regelung.netzLeistungW', null);
            await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);
            await this._setIfChanged('speicher.regelung.netzLadenErlaubt', null);
            return;
        }
        // Show RAW if available (closer to meter), otherwise show filtered.
        await this._setIfChanged('speicher.regelung.netzLeistungW', Math.round((typeof gridRawW === 'number') ? gridRawW : gridW));
        await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);


        // Tarif-Freigabe für Netzladung (aus Tarif-Modul; konservativ bei Stale)
        let gridChargeAllowed = true;
        if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('cm.gridChargeAllowed')) {
            const age = this.dp.getAgeMs('cm.gridChargeAllowed');
            const fresh = (age === null || age === undefined) ? true : (age <= staleMs);
            gridChargeAllowed = fresh ? this.dp.getBoolean('cm.gridChargeAllowed', true) : false;
        }
        await this._setIfChanged('speicher.regelung.netzLadenErlaubt', !!gridChargeAllowed);

        const exportW = Math.max(0, -gridW); // negative Netzleistung = Einspeisung (geglättet)
        const importW = Math.max(0, gridW);  // positive Netzleistung = Bezug (geglättet)
        const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW; // Import + / Export -
        const importRawW = Math.max(0, nvpRawW);
        const exportRawW = Math.max(0, -nvpRawW);

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
        const reserveChargeWanted = reserveEnabled && (typeof soc === 'number') && (soc < reserveTarget);

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
        const selfTargetGridW = Math.max(0, num(cfg.selfTargetGridImportW, 0));
        const selfImportThresholdW = Math.max(0, num(cfg.selfImportThresholdW, 200));

        await this._setIfChanged('speicher.regelung.lskMinSocPct', lskMinSoc);
        await this._setIfChanged('speicher.regelung.lskMaxSocPct', lskMaxSoc);
        await this._setIfChanged('speicher.regelung.selfMinSocPct', selfMinSoc);
        await this._setIfChanged('speicher.regelung.selfMaxSocPct', selfMaxSoc);
        await this._setIfChanged('speicher.regelung.selfEntladenAktiviert', !!selfDischargeEnabled);

        // Grenzen / Glättung
        const maxChargeW = Math.max(0, num(cfg.maxChargeW, 5000));     // Laden: negativ
        const maxDischargeW = Math.max(0, num(cfg.maxDischargeW, 5000)); // Entladen: positiv
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
                // SoC-Fenster für LSK
                const socOk = (typeof soc !== 'number') ? true : (soc > lskMinSoc);

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
                }
            }
        }

        // 2) Gate C: Ladepark-Unterstützung (EVCS Boost/Auto) via Speicher-Entladung,
        // sofern keine Lastspitzenkappung aktiv ist.
        if (targetW === 0) {
            const assistW = await this._readOwnNumber('chargingManagement.control.storageAssistW');
            if (typeof assistW === 'number' && assistW > 0) {
                // EVCS-Unterstützung ist "komfort" – wenn Reserve wieder aufgefüllt werden soll, blockieren wir das.
                const socOk = (typeof soc !== 'number') ? true : (soc > Math.max(reserveMin, selfMinSoc));
                if (reserveActive) {
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
                    hardDischargeMinSoc = Math.max(hardDischargeMinSoc, Math.max(reserveMin, selfMinSoc));
                }
            }
        }

        // 2) Tarif/VIS (manuell), wenn keine Lastspitze aktiv
        if (targetW === 0) {
            const t = this._readTarifVis(staleMs);
            if (t.aktiv) {
                if (t.modus === 1 && typeof t.storageW === 'number') {
                    // VIS liefert Sollleistung in W: negativ = Laden, positiv = Entladen
                    let w = t.storageW;

                    // Wenn Netzladen gesperrt ist (Tarif-Logik), dann nur PV-Überschuss (Einspeisung) zum Laden nutzen
                    if (w < 0 && !gridChargeAllowed) {
                        const zeCfg = (this.adapter.config && this.adapter.config.enableGridConstraints) ? (this.adapter.config.gridConstraints || {}) : {};
                        const zeEnabled = !!((this.adapter.config && this.adapter.config.enableGridConstraints) && zeCfg.zeroExportEnabled);
                        const zeDeadband = Math.max(0, num(zeCfg.zeroExportDeadbandW, 50));
                        const thrBase = Math.max(0, num(cfg.pvExportThresholdW, 200));
                        const thr = zeEnabled ? Math.min(thrBase, zeDeadband) : thrBase;
                        const pvCapW = (exportW >= thr) ? exportW : 0;
                        const cappedW = -Math.min(Math.abs(w), pvCapW);

                        if (cappedW === 0) {
                            reason = 'Tarif: Netzladen gesperrt';
                        } else {
                            reason = 'Tarif: Netzladen gesperrt, nur PV-Überschuss';
                        }
                        source = 'tarif';
                        w = cappedW;
                    }
                    // Reserve blockiert Entladen
                    if (reserveActive && w > 0) {
                        w = 0;
                        reason = 'Tarif: Entladen blockiert (Reserve aktiv)';
                        source = 'tarif';
                    } else {
                        reason = 'Tarif: Sollleistung aus VIS';
                        source = 'tarif';
                    }

                    // SoC-Max: Laden blockieren (z.B. wenn der Installateur einen Max-SoC setzt)
                    // Für Tarif verwenden wir den "größten" Max-SoC (Self/LSK), damit es nicht unerwartet stoppt.
                    const lskMaxSocForCharge = (cfg.lskChargeEnabled !== false) ? lskMaxSoc : selfMaxSoc;
        const maxSocForCharge = clamp(Math.max(selfMaxSoc, lskMaxSocForCharge, reserveTarget), 0, 100);
                    if (w < 0 && (typeof soc === 'number') && soc >= maxSocForCharge) {
                        w = 0;
                        reason = 'Tarif: Laden blockiert (SoC-Max erreicht)';
                        source = 'tarif';
                    }

                    targetW = w;
                } else if (t.modus === 2) {
                    // Automatik wird später ergänzt
                    reason = 'Tarif: Automatik noch nicht umgesetzt';
                    source = 'tarif';
                    targetW = 0;
                }
            }
        }
// 3) Eigenverbrauch: Entladen zur Netzbezug-Reduktion (optional)
if (targetW === 0 && selfDischargeEnabled) {
    // Wichtig: Bei Eigenverbrauchs-Entladung regeln wir auf den NVP.
    // Dafür verwenden wir bewusst den ROH-Wert (NVP) ohne Glättung, um Verzögerungen zu vermeiden.
    //
    // Kritischer Punkt (Bug-Fix): Eine reine "Sollleistung = aktueller Import"-Logik konvergiert
    // mathematisch auf ~50% der Last (Fixpunkt), statt den Import wirklich gegen 0 zu drücken.
    // Lösung: Integrations-/Inkrement-Regelung (PI-light): Sollwert wird um den aktuellen Fehler angepasst.

    const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW; // Import + / Export -
    const desiredNvpW = selfTargetGridW; // typischerweise 0 W Import
    const deadbandW = Math.max(0, selfImportThresholdW); // Start-/Stop-Schwelle gegen Flattern

    // Eigenverbrauch hat einen eigenen "Integrator": nur fortsetzen, wenn wir in der letzten Runde
    // auch aus Eigenverbrauch geregelt haben. Sonst bei 0 starten, damit LSK/Tarif nicht "nachhängt".
    const lastWasSelf = (this._lastSource === 'eigenverbrauch');
    const curSetW = (lastWasSelf && typeof this._lastTargetW === 'number' && this._lastTargetW > 0)
        ? this._lastTargetW
        : 0;

    // Fehler: positiver Fehler => zu viel Import => mehr entladen.
    // negativer Fehler => Export/zu wenig Import => Entladung reduzieren.
    const errW = (typeof nvpRawW === 'number') ? (nvpRawW - desiredNvpW) : 0;

    let nextSetW = curSetW;
    if (errW > deadbandW) {
        nextSetW = curSetW + errW;
    } else if (errW < -deadbandW) {
        nextSetW = curSetW + errW; // reduziert (errW ist negativ)
    } else {
        // innerhalb Deadband -> halten
        nextSetW = curSetW;
    }

    // Nur Entladen in diesem Block (kein Laden). Negative Werte sind hier nicht sinnvoll.
    nextSetW = clamp(nextSetW, 0, selfMaxDischargeEff);

    const socOk = (typeof soc !== 'number') ? true : (soc > selfMinSoc);
    const allow = (!reserveActive && !reserveChargeWanted && socOk);

    // Aktivierung: Nur wenn Import oberhalb der Schwelle liegt ODER wir bereits aktiv waren
    // (Integrator hält den Sollwert dann stabil und passt ihn nach oben/unten an).
    const importNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
    const startCond = (importNowW >= deadbandW) || lastWasSelf;

    if (allow && startCond && nextSetW > 0) {
        targetW = nextSetW;
        reason = `Eigenverbrauch: entladen (${Math.round(targetW)} W)`;
        source = 'eigenverbrauch';
        hardDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
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
                const extraBias = (zeEnabled && gridChargeAllowed) ? zeBias : 0;
                targetW = -clamp(exportRawW + extraBias, 0, chargeLimitW);
                reason = zeEnabled ? 'Nulleinspeisung: Export in Speicher umleiten' : 'Eigenverbrauch: PV-Überschuss laden';
                source = 'pv';
            }
        }

        // 5) Notstrom: Reserve ggf. über Netz wieder auffüllen (optional)
        // Hinweis: Standardmäßig AUS (reserveGridChargeW = 0). Aktivieren nur, wenn gewünscht.
        // Wichtig: Bei aktivem Peak-Shaving wird die Netzladung (sofern möglich) innerhalb des Peak-Limits gehalten.
        if (targetW === 0 && reserveChargeWanted && reserveGridChargeW > 0 && gridChargeAllowed) {
            // Nur laden, wenn SoC unter Reserve-Ziel
            const canChargeBySoc = (typeof soc !== 'number') ? true : (soc < reserveTarget);
            if (canChargeBySoc) {
                let wantW = clamp(reserveGridChargeW, 0, maxChargeW);
                if (typeof psHeadroomFilteredW === 'number') {
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
            const canChargeBySoc = (typeof soc !== 'number') ? false : (soc < lskMaxSoc);
            if (canChargeBySoc) {
                let wantW = Math.min(psHeadroomEffW, lskMaxChargeEff);

                // Optional: reduce "flutter" by holding small upward adjustments.
                // We intentionally allow fast decreases (safety), but require a minimal delta to increase.
                const psCfg = (this.adapter.config && this.adapter.config.peakShaving) ? this.adapter.config.peakShaving : {};
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
            (typeof soc === 'number') && (soc < lskMaxSoc)
        ) {
            if (!(typeof psLimitW === 'number' && psLimitW > 0)) {
                reason = 'LSK: kein Peak-Grenzwert konfiguriert (Max Import > 0 setzen)';
                source = 'lastspitze_refill';
            } else if (!(typeof psHeadroomEffW === 'number' && psHeadroomEffW > 0)) {
                reason = `LSK: kein Headroom frei (${Math.round(importW)} / ${Math.round(psLimitW)} W)`;
                source = 'lastspitze_refill';
            }
        }

        // Grenzen anwenden
        targetW = clamp(targetW, -maxChargeW, maxDischargeW);

        // Schrittweite
        if (stepW > 0) {
            targetW = Math.round(targetW / stepW) * stepW;
        }

// Rampenbegrenzung
if (typeof this._lastTargetW === 'number') {
    const d = targetW - this._lastTargetW;

    // PV-Überschuss-Laden: schneller hochfahren (mehr Laden), aber schnell zurücknehmen (sicher gegen Netzbezug)
    if (source === 'pv' && targetW < 0) {
        const pvMaxDelta = (pvMaxDeltaCfg > 0) ? pvMaxDeltaCfg : maxDelta;

        if (pvMaxDelta > 0 && d < 0 && Math.abs(d) > pvMaxDelta) {
            // d < 0 => stärker laden (mehr negativ) -> begrenzen
            targetW = this._lastTargetW - pvMaxDelta;
            reason = `${reason} (PV‑Rampe)`;
        }
        // d >= 0 => weniger laden / Richtung 0 -> bewusst ohne Rampe (schnell reagieren)
    } else if (source === 'lastspitze' && targetW > 0) {
        // Lastspitzenkappung: "Attack" schnell, "Release" gedämpft.
        // Erhöhung der Entladeleistung (d > 0) darf ohne Rampe passieren, damit der Netzanschluss nicht überlastet wird.
        // Reduktion (d < 0) wird hingegen durch maxDelta begrenzt (Anti-Flattern).
        if (maxDelta > 0 && d < 0 && Math.abs(d) > maxDelta) {
            targetW = this._lastTargetW - maxDelta;
            reason = `${reason} (Rampe)`;
        }
    } else {
        // Standard: symmetrische Rampe
        if (maxDelta > 0 && Math.abs(d) > maxDelta) {
            targetW = this._lastTargetW + Math.sign(d) * maxDelta;
            reason = `${reason} (Rampenbegrenzung)`;
        }
    }
}

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

        await this._applyTargetW(targetW, reason, source);

        // Diagnose: Grenzen
        await this._setIfChanged('speicher.regelung.maxChargeW', Math.round(maxChargeW));
        await this._setIfChanged('speicher.regelung.maxDischargeW', Math.round(maxDischargeW));
        await this._setIfChanged('speicher.regelung.stepW', Math.round(stepW));
        await this._setIfChanged('speicher.regelung.maxDeltaWPerTick', Math.round(maxDelta));
        await this._setIfChanged('speicher.regelung.pvSchwelleW', Math.round(Math.max(0, num(cfg.pvExportThresholdW, 200))));
    }

    _getCfg() {
        const storage = (this.adapter.config && this.adapter.config.storage) ? this.adapter.config.storage : {};
        return {
            controlMode: storage.controlMode,
            staleTimeoutSec: storage.staleTimeoutSec,
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
                try {
                    writeResult = await this.dp.writeNumber('st.targetPowerW', w, false);
                } catch (e) {
                    writeResult = false;
                }
            }
        }

        // Diagnose-Zustände schreiben
        await this._setIfChanged('speicher.regelung.sollW', w);
        await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || ''));
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

        await mk('speicher.regelung.aktiv', 'Speicher-Regelung aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.sollW', 'Sollleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.quelle', 'Quelle', 'string', 'text', '');
        await mk('speicher.regelung.grund', 'Grund', 'string', 'text', '');
        await mk('speicher.regelung.schreibStatus', 'Schreibstatus', 'string', 'text', '');

        await mk('speicher.regelung.netzLeistungW', 'Netzleistung (W)', 'number', 'value.power');
        await mk('speicher.regelung.netzAlterMs', 'Netzleistung Alter (ms)', 'number', 'value.interval');
        await mk('speicher.regelung.netzLadenErlaubt', 'Netzladen erlaubt', 'boolean', 'indicator', true);

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