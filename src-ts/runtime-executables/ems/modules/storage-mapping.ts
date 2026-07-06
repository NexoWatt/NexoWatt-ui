// @ts-nocheck
/**
 * Executable TypeScript source: ems/modules/storage-mapping.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/storage-mapping.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/storage-mapping.js
 * Rolle im Projekt: Speicher-Mapping.
 * Zweck: Normalisiert Speicher-Datenpunkte für Einzel- und Mehrspeicheranlagen.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Hilfsmodul für Speicher-Mapping und Speicherfarm-/Mehrspeicher-Zuordnung.
 * Zusammenhänge:
 * - Wird vom App-Center und Speicher-/EMS-Modulen verwendet.
 * - Muss normale Einzelanlagen und Speicherfarm sauber trennen.
 * Wartungshinweise:
 * - Farm-Werte dürfen normale Anlagen nicht beeinflussen, wenn keine Farm aktiv ist.
 */

'use strict';

const { BaseModule } = require('./base');

/**
 * Speicher-Datenpunkt-Zuordnung (Installateur)
 * - liest die Konfiguration (storage.*)
 * - legt Diagnose-Zustände im Adapter an
 * - registriert die gemappten Datenpunkte in der internen Datenpunkt-Registry (st.*)
 *
 * Hinweis: Diese Stufe macht noch keine aktive Speicher-Regelung.
 * Sie stellt nur sicher, dass die Zuordnung sauber vorhanden ist und später
 * herstellerunabhängig genutzt werden kann.
 */
/**
 * Code-Teil: Klasse `SpeicherMappingModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: SpeicherMappingModule. Aufgabe: verarbeitet Konfiguration oder Datenpunkt-Mapping. Änderungen müssen mit App-Center, /config und den Modul-Resolvern konsistent bleiben. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: SpeicherMappingModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class SpeicherMappingModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {string} */
        this._lastMissing = '';
        /** @type {boolean} */
        this._lastOk = false;
    }

    /**
     * Code-Teil: Methode `init`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        await this._ensureStates();
        await this._upsertFromConfig();
    }
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        // Nur Diagnose: aktuellen SoC-Wert spiegeln (wenn vorhanden)
        const enabled = !!this.adapter.config.enableStorageControl;

        await this._setIfChanged('speicher.mapping.aktiv', enabled);

        if (!this.dp) return;

        const soc = this.dp.getNumber('st.socPct', null);
        const socAge = this.dp.getAgeMs('st.socPct');

        if (typeof soc === 'number') {
            await this._setIfChanged('speicher.socPct', soc);
        }
        if (typeof socAge === 'number') {
            await this._setIfChanged('speicher.socAlterMs', Math.round(socAge));
        }
    }

    /**
     * Code-Teil: Methode `_ensureStates`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _ensureStates
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureStates() {
        const base = 'speicher';
        const defs = [
            { id: `${base}.mapping.aktiv`, name: 'Speicher-Zuordnung aktiv', type: 'boolean', role: 'indicator', def: false },
            { id: `${base}.mapping.modus`, name: 'Speicher Steuerungsart', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.ok`, name: 'Speicher-Zuordnung vollständig', type: 'boolean', role: 'indicator', def: false },
            { id: `${base}.mapping.fehlt`, name: 'Fehlende Datenpunkte (Liste)', type: 'string', role: 'text', def: '' },

            { id: `${base}.mapping.socId`, name: 'SoC Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.istLeistungId`, name: 'Ist-Leistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.sollLeistungId`, name: 'Sollleistung signed Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.sollLadeId`, name: 'Sollwert Laden Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.sollEntladeId`, name: 'Sollwert Entladen Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.runId`, name: 'Run/Externe Regelung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.maxLadeId`, name: 'Max Ladeleistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.maxEntladeId`, name: 'Max Entladeleistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.ladenErlaubtId`, name: 'Laden erlaubt Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.entladenErlaubtId`, name: 'Entladen erlaubt Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.reserveSocId`, name: 'Reserve-SoC Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconGridSetpointId`, name: 'FENECON SetGridActivePower Datenpunkt-ID (Legacy, nicht genutzt)', type: 'string', role: 'text', def: '' },

            { id: `${base}.socPct`, name: 'Speicher Ladezustand (SoC)', type: 'number', role: 'value.battery', def: 0 },
            { id: `${base}.socAlterMs`, name: 'SoC Alter (ms)', type: 'number', role: 'value.interval', def: 0 },
        ];

        for (const d of defs) {
            await this.adapter.extendObjectAsync(d.id, {
                type: 'state',
                common: {
                    name: d.name,
                    type: d.type,
                    role: d.role,
                    read: true,
                    write: false,
                    def: d.def,
                },
                native: {},
            });

            // Default nur setzen, wenn noch kein State vorhanden ist
            try {
                const cur = await this.adapter.getStateAsync(d.id);
                if (!cur) {
                    await this.adapter.setStateAsync(d.id, d.def, true);
                }
            } catch {
                // ignore
            }
        }
    }

    /**
     * Code-Teil: Methode `_getCfg`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getCfg() {
        const storage = (this.adapter.config && this.adapter.config.storage) ? this.adapter.config.storage : {};
        const controlMode = (storage && typeof storage.controlMode === 'string') ? storage.controlMode : 'targetPower';
        const dp = (storage && storage.datapoints && typeof storage.datapoints === 'object') ? storage.datapoints : {};
        const feneconGridControlEnabled = storage.feneconGridControlEnabled;
        const feneconAcMode = storage.feneconAcMode;
        const farmEnabled = !!(this.adapter && this.adapter.config && this.adapter.config.enableStorageFarm);
        return { controlMode, dp, feneconGridControlEnabled, feneconAcMode, farmEnabled };
    }

    /**
     * Code-Teil: Methode `_upsertFromConfig`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _upsertFromConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _upsertFromConfig() {
        if (!this.dp) return;

        const { controlMode, dp, feneconGridControlEnabled, feneconAcMode, farmEnabled } = this._getCfg();

        const socId = String(dp.socObjectId || '').trim();
        const socScale = Number.isFinite(Number(dp.socScale)) ? Number(dp.socScale) : 1;

        const istId = String(dp.batteryPowerObjectId || '').trim();
        const istScale = Number.isFinite(Number(dp.batteryPowerScale)) ? Number(dp.batteryPowerScale) : 1;
        const istInv = !!dp.batteryPowerInvert;

        const sollId = String(dp.targetPowerObjectId || '').trim();
        const sollScale = Number.isFinite(Number(dp.targetPowerScale)) ? Number(dp.targetPowerScale) : 1;
        const sollInv = !!dp.targetPowerInvert;

        // Hersteller-offene Einzel-Speicherregelung:
        // Einige Systeme (z. B. Sungrow über nexowatt-devices) nutzen keine signed
        // Sollleistung, sondern getrennte positive Vorgaben für Laden und Entladen.
        // Diese DPs werden als alternative Zielpfade zum allgemeinen signed targetPower
        // registriert. Wenn beide Split-DPs vorhanden sind, bevorzugt storage-control
        // später diesen Pfad und setzt den jeweils nicht genutzten Gegenpfad auf 0 W.
        const sollChargeId = String(dp.targetChargePowerObjectId || '').trim();
        const sollChargeScale = Number.isFinite(Number(dp.targetChargePowerScale)) ? Number(dp.targetChargePowerScale) : 1;
        const sollChargeInv = !!dp.targetChargePowerInvert;
        const sollDischargeId = String(dp.targetDischargePowerObjectId || '').trim();
        const sollDischargeScale = Number.isFinite(Number(dp.targetDischargePowerScale)) ? Number(dp.targetDischargePowerScale) : 1;
        const sollDischargeInv = !!dp.targetDischargePowerInvert;
        const runId = String(dp.runObjectId || '').trim();
        const runInv = !!dp.runInvert;

        const maxChargeId = String(dp.maxChargeObjectId || '').trim();
        const maxDischargeId = String(dp.maxDischargeObjectId || '').trim();
        const chargeEnId = String(dp.chargeEnableObjectId || '').trim();
        const dischargeEnId = String(dp.dischargeEnableObjectId || '').trim();
        const reserveSocId = String(dp.reserveSocObjectId || '').trim();
        // FENECON-Hybrid ab 0.6.255 nutzt keinen SetGridActivePower-DP mehr.
        // Der alte Konfigurationswert bleibt nur als Legacy-Diagnose erhalten.
        const feneconGridSetpointId = '';

        // Diagnose schreiben
        await this._setIfChanged('speicher.mapping.modus', String(controlMode || ''));
        await this._setIfChanged('speicher.mapping.socId', socId);
        await this._setIfChanged('speicher.mapping.istLeistungId', istId);
        await this._setIfChanged('speicher.mapping.sollLeistungId', sollId);
        await this._setIfChanged('speicher.mapping.sollLadeId', sollChargeId);
        await this._setIfChanged('speicher.mapping.sollEntladeId', sollDischargeId);
        await this._setIfChanged('speicher.mapping.runId', runId);
        await this._setIfChanged('speicher.mapping.maxLadeId', maxChargeId);
        await this._setIfChanged('speicher.mapping.maxEntladeId', maxDischargeId);
        await this._setIfChanged('speicher.mapping.ladenErlaubtId', chargeEnId);
        await this._setIfChanged('speicher.mapping.entladenErlaubtId', dischargeEnId);
        await this._setIfChanged('speicher.mapping.reserveSocId', reserveSocId);
        await this._setIfChanged('speicher.mapping.feneconGridSetpointId', feneconGridSetpointId);

        // Datenpunkte registrieren (st.*)
        if (socId) {
            await this.dp.upsert({
                key: 'st.socPct',
                name: 'Speicher SoC',
                objectId: socId,
                dataType: 'number',
                direction: 'in',
                unit: '%',
                scale: socScale,
                offset: 0,
                invert: false,
                deadband: 0,
                min: 0,
                max: 100,
                note: 'Speicher Ladezustand'
            });
        }

        if (istId) {
            await this.dp.upsert({
                key: 'st.batteryPowerW',
                name: 'Speicher Ist-Leistung',
                objectId: istId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                scale: istScale,
                offset: 0,
                invert: istInv,
                deadband: 0,
                note: 'Optional'
            });
        }

        if (sollId) {
            await this.dp.upsert({
                key: 'st.targetPowerW',
                name: 'Speicher Sollleistung signed',
                objectId: sollId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                scale: sollScale,
                offset: 0,
                invert: sollInv,
                deadband: 0,
                note: 'Schreiben; NexoWatt-Konvention +W=Entladen, -W=Laden'
            });
        }

        if (sollChargeId) {
            await this.dp.upsert({
                key: 'st.targetChargePowerW',
                name: 'Speicher Sollwert Laden',
                objectId: sollChargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                scale: sollChargeScale,
                offset: 0,
                invert: sollChargeInv,
                deadband: 0,
                min: 0,
                note: 'Schreiben; getrennte positive Ladeleistung'
            });
        }

        if (sollDischargeId) {
            await this.dp.upsert({
                key: 'st.targetDischargePowerW',
                name: 'Speicher Sollwert Entladen',
                objectId: sollDischargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                scale: sollDischargeScale,
                offset: 0,
                invert: sollDischargeInv,
                deadband: 0,
                min: 0,
                note: 'Schreiben; getrennte positive Entladeleistung'
            });
        }

        if (runId) {
            await this.dp.upsert({
                key: 'st.run',
                name: 'Speicher Run / externe Regelung',
                objectId: runId,
                dataType: 'boolean',
                direction: 'out',
                invert: runInv,
                note: 'Optional; true bei aktiver NexoWatt-Sollwertvorgabe, false bei 0 W'
            });
        }

        if (maxChargeId) {
            await this.dp.upsert({
                key: 'st.maxChargeW',
                name: 'Max Ladeleistung',
                objectId: maxChargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                note: 'Schreiben'
            });
        }

        if (maxDischargeId) {
            await this.dp.upsert({
                key: 'st.maxDischargeW',
                name: 'Max Entladeleistung',
                objectId: maxDischargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                note: 'Schreiben'
            });
        }

        if (chargeEnId) {
            await this.dp.upsert({
                key: 'st.chargeEnable',
                name: 'Laden erlaubt',
                objectId: chargeEnId,
                dataType: 'boolean',
                direction: 'out',
                note: 'Schreiben'
            });
        }

        if (dischargeEnId) {
            await this.dp.upsert({
                key: 'st.dischargeEnable',
                name: 'Entladen erlaubt',
                objectId: dischargeEnId,
                dataType: 'boolean',
                direction: 'out',
                note: 'Schreiben'
            });
        }

        if (reserveSocId) {
            await this.dp.upsert({
                key: 'st.reserveSocPct',
                name: 'Reserve-SoC',
                objectId: reserveSocId,
                dataType: 'number',
                direction: 'out',
                unit: '%',
                min: 0,
                max: 100,
                note: 'Optional'
            });
        }

        // Prüfen, ob Zuordnung je Modus vollständig ist
        const missing = [];
        if (!socId) missing.push('SoC');

        const feneconHybridConfiguredRaw = (typeof feneconGridControlEnabled === 'boolean') ? (feneconGridControlEnabled === true) : (feneconAcMode === true);
        const feneconHybridConfigured = !!(feneconHybridConfiguredRaw && !farmEnabled);
        if (feneconHybridConfigured || String(controlMode) === 'targetPower') {
            // Für targetPower reicht entweder ein allgemeiner signed Sollleistungs-DP
            // ODER ein getrenntes Paar aus Lade- und Entlade-Sollwert. Dadurch bleiben
            // FENECON-/Victron-/OpenEMS-ähnliche signed Setpoints und Sungrow-/Bridge-
            // Profile mit getrennten positiven Vorgaben gleichwertig nutzbar.
            const hasSignedTarget = !!sollId;
            const hasSplitTarget = !!(sollChargeId && sollDischargeId);
            if (!hasSignedTarget && !hasSplitTarget) missing.push('Sollleistung signed oder Sollwert Laden+Entladen');
        } else if (String(controlMode) === 'limits') {
            if (!maxChargeId) missing.push('Max Ladeleistung (W)');
            if (!maxDischargeId) missing.push('Max Entladeleistung (W)');
        } else if (String(controlMode) === 'enableFlags') {
            if (!chargeEnId) missing.push('Laden erlaubt');
            if (!dischargeEnId) missing.push('Entladen erlaubt');
        }

        const ok = missing.length === 0;
        const missingStr = missing.join(', ');

        if (missingStr !== this._lastMissing) {
            this._lastMissing = missingStr;
            await this._setIfChanged('speicher.mapping.fehlt', missingStr);
        }
        if (ok !== this._lastOk) {
            this._lastOk = ok;
            await this._setIfChanged('speicher.mapping.ok', ok);
        }
    }

    /**
     * Code-Teil: Methode `_setIfChanged`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setIfChanged
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setIfChanged(id, val) {
        const v = (val === undefined) ? null : val;
        try {
            const cur = await this.adapter.getStateAsync(id);
            const curVal = cur ? cur.val : null;
            if (cur && curVal === v) return;
            await this.adapter.setStateAsync(id, v, true);
        } catch (e) {
            try {
                this.adapter.log.debug(`speicher: setState ${id} Fehler: ${e?.message || e}`);
            } catch {
                // ignore
            }
        }
    }
}

module.exports = { SpeicherMappingModule };
