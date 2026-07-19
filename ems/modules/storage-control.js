/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/storage-control.ts
 * Quell-Hash: sha256:23a121d8a1b8d6873cdb5b01faff319fd78db136d88a56bfb012d48eea18725e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/storage-control.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/storage-control.js
 * Rolle im Projekt: Speicherregelung.
 * Zweck: Verwaltet Speicherstrategie, Reserve, Laden/Entladen und Multi-Use-Regeln.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Speichersteuerung/-strategie: verarbeitet Speicher-SoC, Reserve, Lade-/Entladefreigaben und Schutzlogik.
 * Zusammenhänge:
 * - Hängt an Speicher-DPs und zentralen EMS-Budgets.
 * - Muss Split-DP, Signed-DP und Fallback-Werte konsistent verstehen.
 * Wartungshinweise:
 * - Speicherwerte sind historisch kritisch; 0 W ist ein gültiger Zustand und darf nicht als fehlend gelten.
 */

'use strict';

const { BaseModule } = require('./base');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { resolveSplitBatteryFeedback } = require('../services/storage-override-bridge');
const { decideStorageZeroWrite } = require('../services/storage-zero-write-policy');


/**
 * Code-Teil: Klasse `RollingWindow`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: RollingWindow. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: RollingWindow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class RollingWindow {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(maxSeconds) {
        this.maxSeconds = Math.max(1, Number(maxSeconds) || 120);
        /** @type {Array<{t:number, v:number}>} */
        this.samples = [];
        this.sum = 0;
    }

    /**
     * Code-Teil: Methode `setMaxSeconds`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setMaxSeconds
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    setMaxSeconds(maxSeconds) {
        const s = Math.max(1, Number(maxSeconds) || 120);
        if (s !== this.maxSeconds) {
            this.maxSeconds = s;
            // force purge to new horizon
            this._purge(Date.now());
        }
    }

    /**
     * Code-Teil: Methode `_purge`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _purge
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _purge(nowMs) {
        const cutoff = nowMs - this.maxSeconds * 1000;
        while (this.samples.length && this.samples[0].t < cutoff) {
            const s = this.samples.shift();
            this.sum -= s.v;
        }
        if (this.samples.length === 0) this.sum = 0;
    }

    /**
     * Code-Teil: Methode `push`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: push
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    push(v, nowMs) {
        const n = Number(v);
        if (!Number.isFinite(n)) return;
        const t = Number(nowMs) || Date.now();
        this.samples.push({ t, v: n });
        this.sum += n;
        this._purge(t);
    }

    /**
     * Code-Teil: Methode `mean`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mean
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    mean() {
        if (!this.samples.length) return null;
        return this.sum / this.samples.length;
    }
    /**
     * Code-Teil: count
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
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
/**
 * Code-Teil: hystAbove
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
/**
 * Code-Teil: hystBelow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
 * - Alle drei AppCenter-Steuerungsarten schreiben produktiv: Sollleistung, Leistungsgrenzen und Freigabe-Flags.
 * - Manuell zugeordnete Objekt-IDs bleiben herstellerunabhaengig und laufen durch dieselben zentralen Gates.
 */
/**
 * Code-Teil: Klasse `SpeicherRegelungModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: SpeicherRegelungModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: SpeicherRegelungModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class SpeicherRegelungModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {number|null} */
        this._lastTargetW = null;
        /** @type {number} */
        this._lastTargetWriteMs = 0;
        /** @type {string} */
        this._lastReason = '';
        /** @type {string} */
        this._lastSource = '';
        /** @type {number|null} Final wirksame SoC-Untergrenze fuer optionale Reserve-DPs. */
        this._effectiveReserveSocPct = null;

        // Herstellerunabhaengiger Batterie-Istwert-Puffer fuer das geschlossene
        // NVP-Balancing. Viele Speicher/Adapter aktualisieren NVP und Batterie-
        // Istleistung nicht im selben EMS-Tick. Der letzte valide Messwert bleibt
        // deshalb fuer eine begrenzte Zeit als Regelbasis erhalten. Ein danach
        // geschriebener Sollwert darf die Basis nur innerhalb eines eng begrenzten
        // Prognosefensters fortschreiben; dadurch bleibt die Regelung ruhig, ohne
        // den frueheren Sollwert-Hochintegrationsfehler wieder einzufuehren.
        this._batteryBalanceFeedback = {
            key: '',
            objectId: '',
            source: '',
            measuredW: null,
            sampleTs: 0,
        };

        // --- Anti-Flattern um 0 W ---
        // Richtungswechsel werden bewusst direkt an den jeweils zugeordneten
        // Speicher-/Farm-Ausgang weitergegeben. Die Speichersysteme führen ihren
        // internen Stopp beim Wechsel selbst aus; NexoWatt erzeugt dafür weder eine
        // 0-W-Zwischenrunde noch eine zeitbasierte Vorzeichensperre.

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

        // Hybrid-/Gateway-Profil. SetGridActivePower wird nicht verwendet, weil
        // dieser DP auf manchen Gateway-/EMS-Systemen nicht beschreibbar ist. Die
        // zentrale Zielbildung (NVP, SoC, Budget, Tarif, Reserve und EVCS) bleibt
        // führend und wird über den manuell im AppCenter zugeordneten Batterie-
        // Ausgang in jedem Tick erneuert. Zusätzliche PV kann den Lade-Sollwert
        // begrenzen, darf den Gate-/Executor-Pfad aber nie auf No-Write setzen.
        this._feneconGridLastWriteMs = 0;
        this._feneconGridLastSetpointW = null;
        this._feneconGridWasActive = false;
        this._feneconGridReleasedDirectTarget = false;
        this._feneconHybridWasExternal = false;
        this._feneconHybridLastMode = '';

        // FENECON/OpenEMS-Assist-Zustand: Die Timer bestimmen, ob ein begrenzter
        // NVP-Assist-Sollwert erforderlich ist. Unabhängig vom Assist-Modus bleibt
        // der manuell zugeordnete Ausgang watchdog-sicher im zyklischen Schreibpfad.
        this._feneconAssistImportSinceMs = 0;
        this._feneconAssistReleaseSinceMs = 0;
        this._feneconAssistActive = false;

        // Sungrow Hybrid ESS Sondermodus:
        // Der SH/RS/RT/MG-Hybrid wird im externen NexoWatt-Betrieb als geschlossener
        // NVP-Regelkreis gefuehrt. 0 W ist dabei ausschliesslich ein bewusster Stop-
        // oder Wartebefehl. Richtungswechsel werden direkt geschrieben. Kurze
        // NVP-Aussetzer duerfen keinen laufenden
        // Lade-/Entladesollwert durch ein zyklisches 0-W-Schreiben unterbrechen.
        this._sungrowHybridLastMode = '';
        this._sungrowNvpMissingSinceMs = 0;
        // Kurze Inkonsistenzen zwischen zentralem PV-Budget, EVCS-Reservierung
        // und Sungrow-Telemetrie duerfen keinen einzelnen 0-W-Stopp erzeugen.
        // Der Zeitstempel begrenzt den No-Write-Hold auf eine kurze Grace-Zeit.
        this._sungrowPvBudgetZeroSinceMs = 0;
        // Herstellerunabhaengige Grace-Zeit fuer einen einzelnen zentralen
        // PV-/Gesamtbudget-Zyklus mit 0 W. Innerhalb dieser Zeit bleibt ein
        // aktiver Speicherbefehl per No-Write erhalten; 0 W bleibt ein echter Stop.
        this._storageBudgetZeroSinceMs = 0;
        // Herstellerunabhaengige Grace-Zeit fuer eine kurze NVP-/Telemetrieluecke.
        // Innerhalb dieses Fensters bleibt ein aktiver Speicherbefehl erhalten;
        // erst ein anhaltend unbrauchbarer Messwert fuehrt zum Sicherheitsstopp.
        this._storageMeasurementGapSinceMs = 0;

        // E3/DC RSCP Sondermodus:
        // Der ioBroker.e3dc-rscp Adapter steuert den Speicher ueber zwei gekoppelte
        // EMS-Datenpunkte: SET_POWER_MODE und SET_POWER_VALUE. Dieser Marker dient
        // nur der Diagnose, damit nach Profilwechseln keine alten Statusmeldungen
        // stehen bleiben.
        this._e3dcRscpLastMode = '';

        // NVP-Glättung für die Speicher-Eigenverbrauchsoptimierung:
        // Die Messung am Netzverknüpfungspunkt kann durch Zähler-Latenzen, Speicher-Rampen
        // und Hybrid-Gateways kurz zwischen Bezug und Einspeisung springen. Dieser Filter
        // liefert einen ruhigen Führungswert für die Regelung; harte RAW-Caps bleiben
        // zusätzlich aktiv, damit Anschluss- und 0-Einspeise-Sicherheit erhalten bleiben.
        this._selfNvpFilteredW = null;
        this._selfNvpLastTs = 0;

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

        // Optional: zentrale Mess-/Hilfsdatenpunkte registrieren, damit die Regelung auch ohne Peak-Shaving-Modul laufen kann.
        await this._upsertInputsFromConfig();
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        const cfg = this._getCfg();
        const psCfg = this.adapter.config.peakShaving || {};
        const feedbackSource = String(cfg.datapoints && cfg.datapoints.batteryFeedbackSource || '').trim();
        const explicitAppCenterPowerOverride = feedbackSource.startsWith('appcenter-');
        const explicitAppCenterSocOverride = String(cfg.datapoints && cfg.datapoints.socFeedbackSource || '').trim() === 'appcenter-flow-override';

        // Stale-Timeout einmal zentral berechnen (wird für VIS/Tarif und Messwerte genutzt)
        const staleMs = Math.max(1, Math.round(num(cfg.staleTimeoutSec, 15) * 1000));

        // Zentrale Speicher-Steuerhoheit:
        // Tarif, MultiUse, Peak-Shaving und Eigenverbrauch sind ausschliesslich
        // Policies. Sie duerfen niemals selbst einen Hardware-Schreibpfad erzeugen.
        // Genau eine im AppCenter aktive Topologie (`single` oder `farm`) fuehrt.
        const storageAuthorityEarly = this._getStorageControlAuthority();
        const cfgEnabled = !!storageAuthorityEarly.singleAppActive;
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

        // Policy-Router: MultiUse erweitert die SoC-/Reserve-Policy, aktiviert aber
        // weder die Einzelregelung noch die Farm. Die Topologie kommt ausschliesslich
        // aus der zentralen AppCenter-Steuerhoheit.
        const installerCfgForMultiUseEarly = (this.adapter && this.adapter.config && this.adapter.config.installerConfig && typeof this.adapter.config.installerConfig === 'object')
            ? this.adapter.config.installerConfig
            : {};
        const storageMultiUseCfgEarly = (installerCfgForMultiUseEarly.storageMultiUse && typeof installerCfgForMultiUseEarly.storageMultiUse === 'object')
            ? installerCfgForMultiUseEarly.storageMultiUse
            : null;
        const multiUsePolicyConfiguredEarly = !!storageMultiUseCfgEarly;
        const multiUseAppPolicyActive = !!storageAuthorityEarly.multiUsePolicyActive;

        const farmRuntimeInfoEarly = (storageAuthorityEarly.farm && typeof storageAuthorityEarly.farm === 'object')
            ? storageAuthorityEarly.farm
            : ((this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
                ? this.adapter._nwGetStorageFarmRuntimeInfo()
                : { active: this._isStorageFarmEnabled(), dispatchActive: false, rows: [] });
        const farmAggregationEnabledEarly = !!storageAuthorityEarly.farmAggregationActive;
        const farmEnabledEarly = storageAuthorityEarly.selectedTopology === 'farm';
        const farmCfgEarly = (this.adapter && this.adapter.config && this.adapter.config.storageFarm && typeof this.adapter.config.storageFarm === 'object')
            ? this.adapter.config.storageFarm
            : {};
        const farmRowsEarly = Array.isArray(farmRuntimeInfoEarly && farmRuntimeInfoEarly.rows) && farmRuntimeInfoEarly.rows.length
            ? farmRuntimeInfoEarly.rows
            : (Array.isArray(farmCfgEarly.storages) ? farmCfgEarly.storages : []);
        const farmAppPolicyActive = !!storageAuthorityEarly.farmDispatchActive;
        const enabled = !!storageAuthorityEarly.writerActive;

        // SoC-Hysterese optional aus Konfig lesen (falls später im Admin ergänzt).
        // Default bleibt 0.5 %-Punkte.
        this._socHystPct = Math.max(0, num(cfg.socHystPct, this._socHystPct));

        // Diagnose: aktiv
        await this._setIfChanged('speicher.regelung.aktiv', enabled);
        await this._setIfChanged('speicher.regelung.aktivKonfig', cfgEnabled);
        await this._setIfChanged('speicher.regelung.aktivAutoTarif', autoTarifEnabled);
        await this._setIfChanged('speicher.regelung.aktivAutoMultiUse', multiUseAppPolicyActive);
        await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', farmAppPolicyActive);
        await this._setIfChanged('speicher.regelung.topologie', String(storageAuthorityEarly.selectedTopology || 'none'));
        await this._setIfChanged('speicher.regelung.topologieGrund', String(storageAuthorityEarly.reason || ''));
        await this._setIfChanged('speicher.regelung.topologieJson', JSON.stringify({
            selectedTopology: storageAuthorityEarly.selectedTopology || 'none',
            writerActive: !!storageAuthorityEarly.writerActive,
            singleAppActive: !!storageAuthorityEarly.singleAppActive,
            singleSuppressedByFarm: !!storageAuthorityEarly.singleSuppressedByFarm,
            farmAggregationActive: !!farmAggregationEnabledEarly,
            farmDispatchActive: !!storageAuthorityEarly.farmDispatchActive,
            multiUsePolicyActive: !!multiUseAppPolicyActive,
            tariffPolicyActive: !!autoTarifEnabled,
            reason: String(storageAuthorityEarly.reason || ''),
        }));

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
            await this._setStorageNvpBalanceDiag(null);
            await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', 'inactive');
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMeasuredW', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackAgeMs', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', '');
            await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetReservedW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapped', false);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteHold', false);
            await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteReason', '');
            await this._setIfChanged('speicher.regelung.pvBudgetRuntimeRemainingW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetAllocationDerivedW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetEvcsReservedW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetResolution', 'disabled');
            await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', false);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallAction', 'inactive');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallReason', '');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallHeldW', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallExplicitStop', false);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', 0);

            // Interne Sollwertprognose beim Deaktivieren verwerfen. Es wird dabei
            // bewusst nichts an den Speicher geschrieben; nur die lokale Regel-
            // erinnerung wird geloescht, damit ein spaeteres Reaktivieren nicht mit
            // einem alten Kommando als vermeintlicher Istleistung startet.
            this._lastTargetW = 0;
            this._lastTargetWriteMs = 0;
            this._lastSource = 'aus';
            this._sungrowPvBudgetZeroSinceMs = 0;
            this._storageBudgetZeroSinceMs = 0;

            // Hybrid-/Gateway-Priorität: Bei deaktivierter Speicherregelung nicht zyklisch auf den
            // Batterie-Sollleistungs-DP schreiben. Dadurch kann das Gateway nach seinem Watchdog
            // wieder vollständig in den Normalmodus gehen.
            try {
                if (this._isFeneconHybridControlConfigured(cfg) || this._feneconHybridWasExternal || this._feneconGridWasActive) {
                    await this._setFeneconHybridDiag({
                        active: false,
                        mode: 'disabled',
                        reason: 'Speicherregelung deaktiviert – keine externe Gateway-Vorgabe',
                        writeMode: 'no-write',
                    });
                    this._feneconHybridWasExternal = false;
                    this._feneconHybridLastMode = 'disabled';
                    this._feneconGridWasActive = false;
                    this._feneconGridReleasedDirectTarget = false;
                    this._feneconAssistActive = false;
                    this._feneconAssistImportSinceMs = 0;
                    this._feneconAssistReleaseSinceMs = 0;
                }
                if (this._isSungrowHybridControlConfigured(cfg) || this._sungrowHybridLastMode) {
                    await this._setSungrowHybridDiag({
                        active: false,
                        mode: 'disabled',
                        reason: 'Speicherregelung deaktiviert – Sungrow-Herstellerprofil in Ruhe',
                        writeMode: 'disabled',
                    });
                    this._sungrowHybridLastMode = 'disabled';
                }
                if (this._isE3dcRscpControlConfigured(cfg) || this._e3dcRscpLastMode) {
                    await this._setE3dcRscpDiag({
                        active: false,
                        mode: 'disabled',
                        reason: 'Speicherregelung deaktiviert – E3/DC-RSCP-Schreibpfad in Ruhe',
                        writeMode: 'disabled',
                    });
                    this._e3dcRscpLastMode = 'disabled';
                }
            } catch {
                // ignore
            }

            return;
        }

        // Mindestvoraussetzungen / Sonderpfade
        const controlMode = String(cfg.controlMode || 'targetPower');

        // Nur die von der zentralen Steuerhoheit ausgewaehlte Farm ist ein
        // beschreibbarer Ausgang. Eine aktive reine Mess-Farm bleibt fuer Anzeige und
        // Aggregation erhalten, beeinflusst aber weder Messbasis noch Writer.
        const farmCfg = farmCfgEarly;
        const farmEnabled = farmEnabledEarly;
        const farmRows = farmRowsEarly;
        const hasFarmSetpoints = storageAuthorityEarly.selectedTopology === 'farm';
        await this._setIfChanged('speicher.regelung.aktivSpeicherfarm', !!hasFarmSetpoints);

        const hasSignedTarget = this.dp ? !!this.dp.getEntry('st.targetPowerW') : false;
        const hasChargeTarget = this.dp ? !!this.dp.getEntry('st.targetChargePowerW') : false;
        const hasDischargeTarget = this.dp ? !!this.dp.getEntry('st.targetDischargePowerW') : false;
        const hasMaxChargeTarget = this.dp ? !!this.dp.getEntry('st.maxChargeW') : false;
        const hasMaxDischargeTarget = this.dp ? !!this.dp.getEntry('st.maxDischargeW') : false;
        const hasChargeEnableTarget = this.dp ? !!this.dp.getEntry('st.chargeEnable') : false;
        const hasDischargeEnableTarget = this.dp ? !!this.dp.getEntry('st.dischargeEnable') : false;
        // Herstellerprofile koennen entweder einen bidirektionalen signed-Sollwert,
        // getrennte Lade-/Entlade-DPs, Leistungsgrenzen oder Richtungsfreigaben anbieten.
        // Jeder im AppCenter gewaehlte Modus bleibt herstellerunabhaengig; einzelne
        // Richtungen duerfen fehlen und werden dann nur fuer diese Richtung gesperrt.
        const hasSplitTarget = hasChargeTarget || hasDischargeTarget;
        const hasLimitTarget = hasMaxChargeTarget || hasMaxDischargeTarget;
        const hasEnableTarget = hasChargeEnableTarget || hasDischargeEnableTarget;
        const storageVendorProfile = this._getStorageVendorProfile(cfg);
        const e3dcRscpProfileConfigured = this._isE3dcRscpControlConfigured(cfg);
        const e3dcRscpConfigured = !!(e3dcRscpProfileConfigured && !hasFarmSetpoints);
        const hasE3dcSetPowerTarget = e3dcRscpConfigured && this.dp
            ? !!(this.dp.getEntry('st.e3dcSetPowerMode') && this.dp.getEntry('st.e3dcSetPowerValueW'))
            : false;
        const supportedControlMode = controlMode === 'targetPower' || controlMode === 'limits' || controlMode === 'enableFlags';
        const hasTarget = controlMode === 'limits'
            ? hasLimitTarget
            : (controlMode === 'enableFlags' ? hasEnableTarget : (hasSignedTarget || hasSplitTarget || hasE3dcSetPowerTarget));
        const feneconHybridConfigured = this._isFeneconHybridControlConfigured(cfg);
        const sungrowHybridConfigured = this._isSungrowHybridControlConfigured(cfg);
        // Herstellerprofile gelten ausschliesslich fuer den ausgewaehlten Einzelpfad.
        // In einer Farm bleiben die pro Speicher manuell zugeordneten DPs fuehrend;
        // ein globales Herstellerprofil darf den gemeinsamen Farm-Sollwert nicht
        // umdeuten oder einen parallelen Einzel-Writer aktivieren.
        const feneconHybridBlockedByFarm = !!hasFarmSetpoints;
        const feneconHybridActive = !!(feneconHybridConfigured && !hasFarmSetpoints);
        const sungrowHybridActive = !!(sungrowHybridConfigured && !hasFarmSetpoints);
        await this._setIfChanged('speicher.regelung.herstellerprofil', hasFarmSetpoints ? 'storage-farm' : storageVendorProfile);

        if (!supportedControlMode) {
            const unsupportedReason = `Steuerungsart nicht unterstützt: ${controlMode}`;
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', unsupportedReason);
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: unsupportedReason, src: 'aus' }));
            await this._applyTargetW(0, unsupportedReason, 'aus');
            return;
        }

        if (!hasTarget && !hasFarmSetpoints) {
            const missingTargetReason = controlMode === 'limits'
                ? 'Leistungsgrenzen-Datenpunkt fehlt: Max Laden und/oder Max Entladen'
                : (controlMode === 'enableFlags'
                    ? 'Freigabe-Datenpunkt fehlt: Laden erlaubt und/oder Entladen erlaubt'
                    : 'Sollleistung-Datenpunkt fehlt: signed Ziel, getrennte Lade-/Entlade-Sollwerte oder E3/DC SET_POWER_MODE + SET_POWER_VALUE');
            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', missingTargetReason);
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: Date.now(), reqW: 0, reason: missingTargetReason, src: 'aus' }));
            await this._applyTargetW(0, missingTargetReason, 'aus');
            return;
        }

        // Messwerte lesen
        const now = Date.now();

        // PV‑Forecast / PV‑aware Tarif‑Netzlade-Entscheidung (Debug/Policy)
        // Wird weiter unten im Tarif-Block (want < 0) befüllt.
        let pvAwareTariff = null;

        const centralNvp = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, now, Math.max(staleMs, 10000));
        const centralNvpCurrent = centralNvp.current;
        let gridW = centralNvpCurrent ? (centralNvp.usable ? centralNvp.netW : null) : (this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null);
        let gridRawW = centralNvpCurrent ? (centralNvp.usable ? centralNvp.netW : null) : (this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null);

        if (!centralNvpCurrent) {
            if (typeof gridRawW !== 'number' && this.dp) gridRawW = this.dp.getNumberFresh('ps.gridPowerW', staleMs, null);
            if (typeof gridW !== 'number') {
                const eff = await this._readOwnNumber('peakShaving.control.effectivePowerW');
                if (typeof eff === 'number') gridW = eff;
            }
            if (typeof gridW !== 'number' && typeof gridRawW === 'number') gridW = gridRawW;
        }

        // Fuer die geschlossene NVP-Regelung brauchen wir nicht nur "irgendein"
        // Alter der Netzleistung, sondern getrennt das Alter des gefilterten und
        // des RAW-Werts. Nur so koennen Batterie-Istleistung und NVP-Messung auf
        // zeitliche Plausibilitaet geprueft werden. Asynchrone Werte sind eine
        // Hauptursache fuer wechselnde Lade-/Entlade-Sollwerte.
        const gridFilteredAge = centralNvpCurrent
            ? (Number.isFinite(Number(centralNvp.measurementAgeMs)) ? Number(centralNvp.measurementAgeMs) : Number.POSITIVE_INFINITY)
            : (this.dp && this.dp.getEntry('grid.powerW') ? this.dp.getAgeMs('grid.powerW') : null);
        const gridRawAge = centralNvpCurrent
            ? gridFilteredAge
            : (this.dp
                ? (this.dp.getEntry('grid.powerRawW')
                    ? this.dp.getAgeMs('grid.powerRawW')
                    : (this.dp.getEntry('ps.gridPowerW') ? this.dp.getAgeMs('ps.gridPowerW') : null))
                : null);
        const gridAge = (typeof gridFilteredAge === 'number') ? gridFilteredAge : gridRawAge;

        // SoC fuer Reserve: Die ausgewaehlte Topologie ist exklusiv. Bei Farm-
        // Steuerung gibt es keinen stillen Rueckfall auf einen alten Einzel-SoC.
        let soc = farmEnabled ? null : (this.dp ? this.dp.getNumberFresh('st.socPct', staleMs, null) : null);
        let socAge = farmEnabled ? null : (this.dp ? this.dp.getAgeMs('st.socPct') : null);

        if (farmEnabled) {
            try {
                const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                const stDispatch = await this.adapter.getStateAsync('storageFarm.storagesDispatchAvailable');
                const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                const dispatchN = stDispatch && stDispatch.val !== undefined && stDispatch.val !== null ? Number(stDispatch.val) : NaN;
                const hasOnline = Number.isFinite(onlineN) && onlineN > 0;
                const hasDispatchable = Number.isFinite(dispatchN) && dispatchN > 0;

                if (hasOnline || hasDispatchable) {
                    // Für die aktive Farm-Regelung bevorzugen wir frische Online-SoCs.
                    // Wenn Systeme aber nur degraded/stale sind und trotzdem dispatchbar bleiben
                    // (z.B. selten aktualisierte Signed-DPs), nutzen wir den stabilen Farm-SoC.
                    let stSoc = hasOnline ? await this.adapter.getStateAsync('storageFarm.totalSocOnline') : null;
                    let v = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                    let age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;

                    if (!Number.isFinite(v)) {
                        stSoc = await this.adapter.getStateAsync('storageFarm.totalSoc');
                        v = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                        age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;
                    }

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
        // Schutz-/Cap-Pfade verwenden weiterhin nur den innerhalb `staleMs`
        // frischen Istwert (`battPowerW`). Fuer das geschlossene NVP-Balancing
        // lesen wir parallel den letzten rohen Messwert (`battPowerObservedW`).
        // Dieser darf spaeter ueber einen begrenzten, herstellerunabhaengigen
        // Feedback-Puffer gehalten werden, ohne stale Werte pauschal fuer alle
        // Sicherheitsentscheidungen freizugeben.
        let battPowerObservedW = farmEnabled ? null : (this.dp ? this.dp.getNumber('st.batteryPowerW', null) : null);
        let battPowerAge = farmEnabled ? null : (this.dp ? (this.dp.getEntry('st.batteryPowerW') ? this.dp.getAgeMs('st.batteryPowerW') : null) : null);
        let battPowerInvalidReason = '';
        let battPowerObjectId = '';
        let battPowerFeedbackSource = farmEnabled ? 'storage-farm' : 'single-storage';
        let battPowerMappingTrusted = !farmEnabled && !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.batteryPowerW'));
        const battPowerAgeKnown = typeof battPowerAge === 'number' && Number.isFinite(battPowerAge);
        let battPowerW = battPowerMappingTrusted
            && typeof battPowerObservedW === 'number'
            && Number.isFinite(battPowerObservedW)
            && (!battPowerAgeKnown || battPowerAge <= staleMs)
            ? Number(battPowerObservedW)
            : null;
        let battPowerTrusted = (typeof battPowerW === 'number' && Number.isFinite(battPowerW));

        if (!farmEnabled) try {
            const eBatt = this.dp ? this.dp.getEntry('st.batteryPowerW') : null;
            const eTarget = this.dp ? this.dp.getEntry('st.targetPowerW') : null;
            const eChargeTarget = this.dp ? this.dp.getEntry('st.targetChargePowerW') : null;
            const eDischargeTarget = this.dp ? this.dp.getEntry('st.targetDischargePowerW') : null;
            const battObj = eBatt && eBatt.objectId ? String(eBatt.objectId) : '';
            battPowerObjectId = battObj;
            const targetObjs = [eTarget, eChargeTarget, eDischargeTarget]
                .map(e => e && e.objectId ? String(e.objectId) : '')
                .filter(Boolean);

            // Wichtig für herstellerneutrale Speicher: Die Ist-Leistung darf niemals
            // exakt dasselbe Objekt wie ein zugeordneter Schreib-/Sollwert-DP sein.
            // Objektpfade und Namen sind dagegen vollständig frei: `.ctrl.`, `setpoint`,
            // `chargePowerW` oder `dischargePowerW` können bei Fremdadaptern legitime
            // Messwerte bezeichnen und dürfen eine manuelle AppCenter-Zuordnung nicht
            // pauschal entwerten.
            const sameAsWriteTarget = !!(battObj && targetObjs.some(t => t === battObj));

            if (sameAsWriteTarget) {
                battPowerObservedW = null;
                battPowerW = null;
                battPowerAge = null;
                battPowerMappingTrusted = false;
                battPowerTrusted = false;
                battPowerInvalidReason = 'Ist-Leistung verweist auf denselben Datenpunkt wie ein Sollwert (Mapping-Fehler)';
            }
        } catch {
            // ignore
        }

        // AppCenter kann Lade- und Entlade-Istleistung getrennt zuordnen. Wenn
        // kein vertrauenswürdiger signed Istwert vorliegt, bilden wir daraus
        // dieselbe interne Konvention (+W Entladen, -W Laden). Nur exakt identisch
        // als Sollwert gemappte Objekte werden vom Helfer als Messfeedback abgewiesen.
        if (!farmEnabled && !battPowerTrusted) {
            try {
                const splitFeedback = resolveSplitBatteryFeedback(this.dp, cfg, staleMs);
                if (splitFeedback) {
                    battPowerObservedW = splitFeedback.observedW;
                    battPowerAge = splitFeedback.ageMs;
                    battPowerObjectId = splitFeedback.objectIds.join(' | ');
                    battPowerFeedbackSource = splitFeedback.source;
                    battPowerMappingTrusted = true;
                    battPowerW = splitFeedback.trusted ? splitFeedback.observedW : null;
                    battPowerTrusted = splitFeedback.trusted;
                    battPowerInvalidReason = splitFeedback.reason;
                }
            } catch (_eSplitFeedback) {
                // Ein optionaler Split-Istwert darf die Speicherregelung nicht stoppen.
            }
        }

        // Einzel-DC-/Hybrid-Speicher: optionaler separater PV-Erzeugungswert.
        // Dieser Messwert wird nur als Kontext/Diagnose genutzt; die Batterie-Sollwerte
        // bleiben weiterhin hart am NVP und an den Speichergrenzen begrenzt.
        const storageCoupling = String(cfg.coupling || 'ac').trim().toLowerCase() === 'dc' ? 'dc' : 'ac';
        const dcPvMapped = storageCoupling === 'dc' && !!String(cfg.dcPvPowerObjectId || '').trim();
        const dcPvPowerW = (dcPvMapped && this.dp) ? this.dp.getNumberFresh('st.dcPvPowerW', staleMs, null) : null;
        const dcPvPowerAge = (dcPvMapped && this.dp && this.dp.getEntry('st.dcPvPowerW')) ? this.dp.getAgeMs('st.dcPvPowerW') : null;
        await this._setIfChanged('speicher.regelung.speicherKopplung', storageCoupling);
        await this._setIfChanged('speicher.regelung.dcPvPowerW', (typeof dcPvPowerW === 'number' && Number.isFinite(dcPvPowerW)) ? Math.round(dcPvPowerW) : 0);
        await this._setIfChanged('speicher.regelung.dcPvPowerAlterMs', (typeof dcPvPowerAge === 'number' && Number.isFinite(dcPvPowerAge)) ? Math.round(dcPvPowerAge) : null);

        // Speicherfarm: aggregierte Ist-Leistung nutzen (Netto: Entladen - Laden).
        //
        // Hintergrund:
        // In Farm-Setups ist st.batteryPowerW häufig nur auf einen Einzel-Speicher gemappt
        // oder (Fehler) sogar auf einen Setpoint. Das führt bei NVP-Balancing zu einem
        // stabilen Fehlpunkt (z. B. ~50% Netzbezug).
        //
        // Daher: wenn Farm aktiv ist und die abgeleiteten Summen vorhanden sind,
        // ueberschreiben wir den beobachteten Einzel-Istwert mit der Farm-
        // Nettoleistung. Der strenge `battPowerW` bleibt weiterhin nur innerhalb
        // staleMs gueltig; der spaetere Feedback-Puffer entscheidet separat ueber
        // eine begrenzte Haltezeit fuer das geschlossene NVP-Balancing.
        if (farmEnabled) {
            try {
                const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                const stDispatch = await this.adapter.getStateAsync('storageFarm.storagesDispatchAvailable');
                const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                const dispatchN = stDispatch && stDispatch.val !== undefined && stDispatch.val !== null ? Number(stDispatch.val) : NaN;
                const hasOnline = Number.isFinite(onlineN) && onlineN > 0;
                const hasDispatchable = Number.isFinite(dispatchN) && dispatchN > 0;

                if (hasOnline || hasDispatchable) {
                    // Ab 0.8.101 liefert die Farm einen kanonischen signierten Netto-DP.
                    // Dieser Wert verhindert, dass gleichzeitiges Laden und Entladen
                    // verschiedener Speicher als zwei getrennte Feedbackpfade wirken.
                    const stNet = await this.adapter.getStateAsync('storageFarm.totalPowerW');
                    const net = stNet && stNet.val !== undefined && stNet.val !== null ? Number(stNet.val) : NaN;
                    const ageNet = stNet && typeof stNet.ts === 'number' ? (now - Number(stNet.ts)) : null;

                    if (Number.isFinite(net)) {
                        battPowerObservedW = net;
                        battPowerAge = ageNet;
                        battPowerObjectId = 'storageFarm.totalPowerW';
                        battPowerFeedbackSource = 'storage-farm-net';
                        battPowerMappingTrusted = true;
                        battPowerW = (ageNet === null || ageNet <= staleMs) ? battPowerObservedW : null;
                        battPowerTrusted = typeof battPowerW === 'number' && Number.isFinite(battPowerW);
                        battPowerInvalidReason = hasOnline
                            ? 'Farm: aggregierte Netto-Istleistung'
                            : 'Farm: aggregierte Netto-Istleistung, degraded/dispatchbar';
                    } else {
                        // Kompatibilitätsfallback für alte Runtime-Stände.
                        const stChg = await this.adapter.getStateAsync('storageFarm.totalChargePowerW');
                        const stDchg = await this.adapter.getStateAsync('storageFarm.totalDischargePowerW');
                        const chg = stChg && stChg.val !== undefined && stChg.val !== null ? Number(stChg.val) : NaN;
                        const dchg = stDchg && stDchg.val !== undefined && stDchg.val !== null ? Number(stDchg.val) : NaN;
                        const ageChg = stChg && typeof stChg.ts === 'number' ? (now - Number(stChg.ts)) : null;
                        const ageDchg = stDchg && typeof stDchg.ts === 'number' ? (now - Number(stDchg.ts)) : null;
                        const age = (ageChg === null && ageDchg === null) ? null : Math.max(ageChg || 0, ageDchg || 0);

                        if (Number.isFinite(chg) && Number.isFinite(dchg)) {
                            battPowerObservedW = dchg - chg;
                            battPowerAge = age;
                            battPowerObjectId = 'storageFarm.totalDischargePowerW-storageFarm.totalChargePowerW';
                            battPowerFeedbackSource = 'storage-farm-gross-fallback';
                            battPowerMappingTrusted = true;
                            battPowerW = (age === null || age <= staleMs) ? battPowerObservedW : null;
                            battPowerTrusted = typeof battPowerW === 'number' && Number.isFinite(battPowerW);
                            battPowerInvalidReason = 'Farm: Brutto-Fallback (Entladen-Laden)';
                        }
                    }
                }
            } catch (_eFarm) {
                // ignore
            }
        }

        await this._setIfChanged('speicher.regelung.batteryPowerTrusted', !!battPowerTrusted);
        await this._setIfChanged('speicher.regelung.batteryPowerIgnoredReason', String(battPowerInvalidReason || ''));

        // Fehlt die NVP-Messung, darf ein kurzer Telemetrie-Aussetzer bei Sungrow
        // keinen laufenden externen Sollwert durch ein 0-W-Schreiben stoppen. Das
        // Profil haelt deshalb waehrend einer begrenzten Grace-Zeit den letzten
        // erfolgreichen Nicht-Null-Befehl ohne neuen Schreibzugriff. Erst ein
        // anhaltender Messausfall wird als ausdruecklicher Sicherheitsstopp mit
        // 0 W behandelt. FENECON bleibt im normalen zyklischen Ausgangspfad.
        if (typeof gridW !== 'number') {
            const lastTargetW = Number.isFinite(Number(this._lastTargetW)) ? Number(this._lastTargetW) : 0;
            const lastSource = String(this._lastSource || '');
            const sungrowNvpLossGraceMs = Math.max(5000, Math.round(Math.max(0, num(cfg.sungrowNvpLossGraceSec, 30)) * 1000));

            if (sungrowHybridActive) {
                if (!this._sungrowNvpMissingSinceMs) this._sungrowNvpMissingSinceMs = now;
                const missingForMs = Math.max(0, now - this._sungrowNvpMissingSinceMs);
                const graceActive = missingForMs < sungrowNvpLossGraceMs;

                if (graceActive) {
                    const heldW = lastTargetW !== 0 ? lastTargetW : 0;
                    const heldSource = lastSource || 'sungrow-hybrid';
                    const heldReason = lastTargetW !== 0
                        ? `Sungrow Hybrid ESS: NVP kurzzeitig nicht verfuegbar – letzten Sollwert ${Math.round(lastTargetW)} W ohne 0-W-Stopp halten (${Math.round(missingForMs / 1000)} s)`
                        : `Sungrow Hybrid ESS: NVP kurzzeitig nicht verfuegbar – keine neue externe Vorgabe (${Math.round(missingForMs / 1000)} s)`;

                    await this._setSungrowHybridDiag({
                        active: true,
                        mode: 'nvp-missing-grace',
                        reason: heldReason,
                        writeMode: lastTargetW !== 0 ? 'no-write-hold-last-nvp-gap' : 'no-write-idle-nvp-gap',
                        targetW: heldW,
                    });
                    await this._setIfChanged('speicher.regelung.requestW', Math.round(heldW));
                    await this._setIfChanged('speicher.regelung.requestQuelle', heldSource);
                    await this._setIfChanged('speicher.regelung.requestGrund', heldReason);
                    await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({
                        ts: now,
                        reqW: Math.round(heldW),
                        reason: heldReason,
                        src: heldSource,
                        noWrite: true,
                        nvpMissingForMs: Math.round(missingForMs),
                    }));
                    await this._setHoldNoWriteTargetDiag(heldW, heldReason, heldSource, 'sungrow-hybrid:no-write-nvp-grace');
                    await this._setIfChanged('speicher.regelung.netzLeistungW', null);
                    await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);
                    await this._setIfChanged('speicher.regelung.netzLadenErlaubt', null);
                    await this._setIfChanged('speicher.regelung.entladenErlaubt', null);
                    await this._setIfChanged('speicher.regelung.tarifState', '');
                    await this._setStorageNvpBalanceDiag(null);
                    await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', false);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', 'missing-nvp-grace');
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', null);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', lastTargetW !== 0);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', false);
                    await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', '');
                    await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetReservedW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapW', 0);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapped', false);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteHold', false);
                    await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteReason', '');
                    await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', 0);
                    await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', 0);
                    await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', false);
                    await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify({
                        ts: now,
                        disabled: false,
                        noWrite: true,
                        reason: heldReason,
                        sungrowHybrid: true,
                        nvpMissingForMs: Math.round(missingForMs),
                    }));
                    return;
                }

                await this._setSungrowHybridDiag({
                    active: true,
                    mode: 'nvp-missing-safety-stop',
                    reason: `Sungrow Hybrid ESS: NVP seit ${Math.round(missingForMs / 1000)} s nicht verfuegbar – Sicherheitsstopp`,
                    writeMode: 'write-stop-no-grid-after-grace',
                    targetW: 0,
                });
            }

            await this._setIfChanged('speicher.regelung.requestW', 0);
            await this._setIfChanged('speicher.regelung.requestQuelle', 'aus');
            await this._setIfChanged('speicher.regelung.requestGrund', 'Netzleistung fehlt oder zu alt');
            await this._setIfChanged('speicher.regelung.dispatcherJson', JSON.stringify({ ts: now, reqW: 0, reason: 'Netzleistung fehlt oder zu alt', src: 'aus' }));

            // Ein fehlender/veralteter NVP ist ein echter Sicherheitsfall. Auch beim
            // FENECON-/OpenEMS-Profil muss deshalb ein sicherer 0-W-Sollwert ueber den
            // manuell zugeordneten AppCenter-DP geschrieben und zyklisch erneuert werden.
            // Ein Herstellerprofil darf den allgemeinen Sicherheitsgate-/Executor-Pfad
            // niemals umgehen.
            await this._applyTargetW(0, 'Netzleistung fehlt oder zu alt', 'aus');
            if (feneconHybridActive) {
                await this._setFeneconHybridDiag({
                    active: true,
                    mode: 'external-control-safety-zero',
                    reason: 'Netzleistung fehlt oder zu alt – sicherer 0-W-Sollwert wird ueber den AppCenter-DP erneuert',
                    writeMode: 'write-safety-zero',
                    targetW: 0,
                });
                this._feneconHybridWasExternal = true;
            }
            await this._setIfChanged('speicher.regelung.netzLeistungW', null);
            await this._setIfChanged('speicher.regelung.netzAlterMs', typeof gridAge === 'number' ? Math.round(gridAge) : null);
            await this._setIfChanged('speicher.regelung.netzLadenErlaubt', null);
            await this._setIfChanged('speicher.regelung.entladenErlaubt', null);
            await this._setIfChanged('speicher.regelung.tarifState', '');
            await this._setStorageNvpBalanceDiag(null);
            await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', 'missing-nvp');
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', null);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', false);
            await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', '');
            await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.pvBudgetReservedW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', 0);
            await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', false);
            await this._setIfChanged('speicher.regelung.policyJson', JSON.stringify({ ts: now, disabled: true, reason: 'Netzleistung fehlt oder zu alt', feneconHybrid: !!feneconHybridActive, sungrowHybrid: !!sungrowHybridActive }));
            return;
        }
        this._sungrowNvpMissingSinceMs = 0;
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

        // Harte Entlade-Demand-Cap für NVP-basierte Eigenverbrauchs-/Tarifregelung.
        // Hintergrund: Die Rampe darf einen zuvor korrekt begrenzten Sollwert nicht wieder
        // auf einen alten, zu hohen Wert zurückziehen. Sonst entstehen genau die Feldfehler
        // aus der Praxis: z. B. 2 kW Netzbezug, aber 10 kW Entlade-Sollwert.
        // Der Cap wird nur für positive Entladung gesetzt und nach der Rampenbegrenzung
        // erneut hart angewendet.
        let dischargeDemandHardCapW = null;
        let dischargeDemandHardCapReason = '';

        // Harte Lade-Demand-Cap für PV-/Tarif-/Reserve-Laden.
        // Hintergrund: Auch beim Laden darf die Rampe keinen alten negativen Sollwert weiter
        // halten, wenn PV-Export, Netz-Headroom oder die aktuelle Ladeanforderung bereits
        // kleiner/0 W geworden sind. 0 W heißt dabei bewusst: diese Richtung jetzt stoppen.
        let chargeDemandHardCapW = null;
        let chargeDemandHardCapReason = '';

        // Gemeinsame Diagnose und Rampensteuerung fuer alle NVP-basierten
        // Speicherpfade. Sobald frische Batterie-Istleistung verwendet wird,
        // begrenzt der Balancing-Helfer die Korrektur bereits relativ zur echten
        // Speicherleistung. Eine zweite Rampe relativ zum alten Sollwert wuerde
        // die Werte erneut auseinanderziehen und sichtbares Springen erzeugen.
        let storageNvpBalanceDiag = null;
        let storageNvpBalanceRampManaged = false;
        // Wird ein vorher aktiver Entladebefehl durch einen expliziten
        // EVCS-Speicherschutz vollstaendig unnoetig, ist 0 W ein echter
        // Policy-Stop. Der Marker verhindert, dass die allgemeine NVP-Hold-
        // Logik den alten Entladewert im neuen, verschobenen Zielband behaelt.
        let evcsProtectedDischargeStop = false;

        // Zentrales PV-Budget fuer die gemeinsame Verteilung zwischen EVCS,
        // Speicher und nachgelagerten Verbrauchern. Das Lademanagement laeuft
        // vor der Speicherregelung und reserviert seinen tatsaechlich benoetigten
        // PV-Anteil. Der Speicher darf danach nur das noch freie PV-Budget nutzen.
        let pvBudgetAllocationMode = '';
        let pvBudgetRemainingBeforeStorageW = 0;
        let pvBudgetStorageAvailableW = 0;
        let pvBudgetReservedW = 0;
        let pvBudgetPostVendorCapW = 0;
        let pvBudgetPostVendorCapped = false;
        let pvBudgetPostVendorNoWriteHold = false;
        let pvBudgetPostVendorNoWriteReason = '';
        let pvBudgetRuntimeRemainingW = 0;
        let pvBudgetAllocationDerivedW = 0;
        let pvBudgetEvcsReservedW = 0;
        let pvBudgetResolution = 'runtime-remaining';
        let totalBudgetStorageAvailableW = 0;
        let totalBudgetStorageReservedW = 0;
        let totalBudgetStorageCapped = false;
        let centralPvBudgetRuntime = null;
        let centralPvAllocationGate = null;

        // PV-Ladequellen werden herstellerunabhaengig markiert. Entscheidend ist
        // die Richtung: Nur negative Sollwerte (Beladung) duerfen das zentrale
        // PV-Restbudget verbrauchen. Tarif-/Reserve-Netzladen bleibt getrennt.
        const isCentralPvChargeSource = (src, signedTargetW) => {
            if (!(Number(signedTargetW) < 0)) return false;
            const normalized = String(src || '').trim().toLowerCase();
            return normalized === 'pv'
                || normalized === 'fenecon-extra-pv'
                || normalized === 'sungrow-assist';
        };

        /**
         * Code-Teil: isCentralGridChargeSource
         * Zweck: Kennzeichnet Speicher-Ladeanforderungen, die bewusst aus dem
         * Netz-/Gesamtbudget kommen. Diese Pfade muessen nach der EVCS-
         * Reservierung denselben zentralen Gesamt-Grant verwenden und ihre
         * Leistung fuer Thermik/Heizstab reservieren.
         *
         * PV-/NVP-Laden bleibt davon getrennt und verbraucht ausschliesslich das
         * zentrale PV-Restbudget.
         */
        const isCentralGridChargeSource = (src, signedTargetW) => {
            if (!(Number(signedTargetW) < 0)) return false;
            const normalized = String(src || '').trim().toLowerCase();
            return normalized === 'tarif'
                || normalized === 'tarif_grid_charge'
                || normalized === 'tarif-netzladen'
                || normalized === 'reserve'
                || normalized === 'reserve_grid'
                || normalized === 'reserve-netzladen'
                || normalized === 'lastspitze_refill'
                || normalized === 'lsk_refill'
                || normalized === 'grid_charge';
        };

        /**
         * Code-Teil: isDeferredSungrowChargeCapReason
         * Zweck: Kennzeichnet vorlaeufige PV-/NVP-Caps, die vor der eigentlichen
         * Sungrow-Herstellerberechnung entstehen. Diese Caps duerfen den spaeteren
         * geschlossenen NVP-Regelkreis nicht auf 0 W klemmen; der autoritative
         * EVCS-/Speicher-PV-Cap wird nach der Herstellerlogik erneut angewendet.
         * Echte Schutzstopps wie SoC, Reserve, Tarif oder EV-Prioritaet werden
         * hier bewusst nicht als aufschiebbar markiert. Richtungswechsel sind
         * dagegen direkte Sollwertwechsel und kein 0-W-Schutzstopp.
         */
        const isDeferredSungrowChargeCapReason = (capReason) => {
            const text = String(capReason || '').trim().toLowerCase();
            if (!text) return false;
            return text.includes('eigenverbrauch-nvp-lade-cap')
                || text.includes('pv-nvp-lade-cap')
                || text.includes('nulleinspeisung-nvp-lade-cap')
                || text.includes('zentrales pv-restbudget')
                || text.includes('finales zentrales pv-restbudget')
                || text.includes('keine aktuelle ladeanforderung')
                || text.includes('aktuelle ladeanforderung-cap')
                || text.includes('sungrow nvp-balancing-lade-cap')
                || text.includes('sungrow direkter pv-/last-feed-forward-cap');
        };

        /**
         * Code-Teil: resolveStoragePvBudgetW
         * Zweck: Ermittelt das fuer den Speicher verfuegbare PV-Budget nach der
         * EVCS-Reservierung. Die zentrale Runtime ist die einzige autoritative
         * Quelle; Prozentwerte aus dem Allocation-Gate werden hier nicht nochmals
         * zu einem zweiten Speicherbudget rekonstruiert.
         * Zusammenhang: EVCS wird im EMS vor dem Speicher reserviert. Dadurch ist
         * der Grant bereits exakt der Rest, den der Speicher in diesem Tick nutzen
         * darf. Alte Laufzeiten ohne Grant-API verwenden nur remainingPvW als
         * Kompatibilitaetsfallback.
         */
        const resolveStoragePvBudgetW = (runtime, _allocationGate, fallbackW = 0) => {
            const runtimeTs = runtime ? Number(runtime.ts) : NaN;
            const runtimeAgeMs = Number.isFinite(runtimeTs) && runtimeTs > 0
                ? Math.max(0, now - runtimeTs)
                : null;
            const runtimeMaxAgeMs = Math.max(30000, staleMs * 2);
            const runtimeFresh = !!runtime
                && runtimeAgeMs !== null
                && runtimeAgeMs <= runtimeMaxAgeMs;
            const runtimeRemainingW = runtimeFresh && Number.isFinite(Number(runtime.remainingPvW))
                ? Math.max(0, Number(runtime.remainingPvW))
                : (!runtime ? Math.max(0, Number(fallbackW) || 0) : 0);
            pvBudgetRuntimeRemainingW = runtimeRemainingW;
            pvBudgetAllocationDerivedW = runtimeRemainingW;
            pvBudgetEvcsReservedW = 0;
            pvBudgetResolution = runtime
                ? (runtimeFresh ? 'runtime-remaining-fallback' : 'central-stale-blocked')
                : 'local-fallback-no-central-budget';

            // Eine vorhandene zentrale Runtime bleibt immer autoritativ. Bei
            // einem veralteten Snapshot wird PV-Laden sicher gesperrt, statt aus
            // NVP/Allocation lokal ein zweites Speicherbudget zu rekonstruieren.
            if (runtime && !runtimeFresh) return 0;

            // EVCS laeuft in der zentralen Modulreihenfolge vor dem Speicher und
            // reserviert dort sowohl reale PV-Leistung als auch einen technisch
            // begruendeten Start-Intent. Der Speicher darf deshalb ausschliesslich
            // den danach verbliebenen zentralen Grant verwenden. Eine erneute
            // Rekonstruktion aus Allocation-Prozenten waere ein Parallelbudget und
            // koennte die echte EVCS-Reservierung wieder ueberschreiben.
            if (runtime) {
                const grantFn = typeof runtime.getPvGrant === 'function'
                    ? runtime.getPvGrant.bind(runtime)
                    : (typeof runtime.grant === 'function' ? runtime.grant.bind(runtime) : null);
                if (grantFn) {
                    const grant = grantFn({
                        key: 'storage',
                        requestedW: Number.MAX_SAFE_INTEGER,
                        pvOnly: true,
                    });
                    if (grant && Number.isFinite(Number(grant.grantW))) {
                        const consumers = runtime.consumers && typeof runtime.consumers === 'object'
                            ? runtime.consumers
                            : {};
                        const evcs = consumers.evcs && typeof consumers.evcs === 'object'
                            ? consumers.evcs
                            : null;
                        pvBudgetEvcsReservedW = evcs
                            ? Math.max(0, Number(evcs.pvReserveW ?? evcs.pvUsedW) || 0)
                            : 0;
                        pvBudgetAllocationDerivedW = Math.max(0, Number(grant.grantW) || 0);
                        pvBudgetResolution = 'central-grant-after-evcs';
                        return pvBudgetAllocationDerivedW;
                    }
                }
            }

            return runtimeRemainingW;
        };

        const exportW = Math.max(0, -gridW); // negative Netzleistung = Einspeisung (geglättet)
        const importW = Math.max(0, gridW);  // positive Netzleistung = Bezug (geglättet)
        const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW; // Import + / Export -
        const importRawW = Math.max(0, nvpRawW);
        const exportRawW = Math.max(0, -nvpRawW);

        // EVCS-Speicher-Schutz:
        // Die Wallbox-Steuerung veroeffentlicht die aktuelle Ladeleistung der Ladepunkte,
        // bei denen "Speicher schuetzen" aktiv ist. Diese Leistung darf von der
        // Speicher-Eigenverbrauchsoptimierung nicht am NVP weggeregelt werden. Wir
        // verschieben deshalb das NVP-Ziel herstellerneutral um diese EVCS-Leistung.
        // Dadurch greift der Schutz auch bei Sungrow/FENECON/E3DC-Herstellerprofilen
        // und bei getrennten Lade-/Entlade-Sollwerten, weil die Korrektur vor dem
        // jeweiligen Hersteller-Schreibpfad erfolgt.
        const protectedEvcsMaxAgeMs = Math.max(staleMs * 3, 60000);
        const sharedCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const runtimeEvcsStoragePolicy = (sharedCaps && sharedCaps.evcsStoragePolicy && typeof sharedCaps.evcsStoragePolicy === 'object') ? sharedCaps.evcsStoragePolicy : null;
        const runtimePolicyTs = Number(runtimeEvcsStoragePolicy && runtimeEvcsStoragePolicy.ts);
        const runtimePolicyFresh = !!(runtimeEvcsStoragePolicy && runtimePolicyTs > 0 && (now - runtimePolicyTs) <= protectedEvcsMaxAgeMs);
        // Same-cycle Snapshot verhindert, dass ein alter asynchroner Schutz-State noch einen Tick blockiert.
        const policyValue = async (key, stateId) => runtimePolicyFresh
            ? runtimeEvcsStoragePolicy[key]
            : this._readOwnNumberFresh(stateId, protectedEvcsMaxAgeMs);
        const protectedRaw = await policyValue('protectedLoadW', 'chargingManagement.control.storageProtectedLoadW');
        const protectedBoxesRaw = await policyValue('protectedWallboxes', 'chargingManagement.control.storageProtectedWallboxes');
        const assistRaw = await policyValue('assistRequestedLoadW', 'chargingManagement.control.storageAssistRequestedLoadW');
        const evcsStorageProtectedLoadW = Math.max(0, Number(protectedRaw) || 0);
        const evcsStorageProtectedWallboxes = Math.max(0, Math.round(Number(protectedBoxesRaw) || 0));
        const evcsStorageAssistRequestedLoadW = Math.max(0, Number(assistRaw) || 0);
        const evcsStoragePolicySource = runtimePolicyFresh ? String(runtimeEvcsStoragePolicy.source || 'ems-runtime') : 'state-fallback';
        const evcsStorageProtectedNvpTargetShiftW = evcsStorageProtectedLoadW;
        const importRawWithoutProtectedEvcsW = Math.max(0, importRawW - evcsStorageProtectedLoadW);

        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzLastW', Math.round(evcsStorageProtectedLoadW));
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzWallboxen', evcsStorageProtectedWallboxes);
        await this._setIfChanged('speicher.regelung.evcsSpeicherMitnutzungLastW', Math.round(evcsStorageAssistRequestedLoadW));
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzNvpZielOffsetW', Math.round(evcsStorageProtectedNvpTargetShiftW));
        await this._setIfChanged('speicher.regelung.evcsSpeicherSchutzQuelle', evcsStoragePolicySource);

        const stripProtectedEvcsLoadW = (w) => Math.max(0, Math.max(0, Number(w) || 0) - evcsStorageProtectedLoadW);

        // NVP-Balancing-Hilfswerte fuer Eigenverbrauch/PV-Laden.
        // Wichtig: Bei Speicherregelung muss der naechste Sollwert immer aus
        // "aktueller Batterieleistung + aktueller NVP-Abweichung" entstehen.
        // Sonst bleibt bei laufender Ladung z. B. 2,9 kW Export stehen, weil nur
        // der neue NVP-Export geschrieben wird statt "alte Ladung + neuer Export".
        const isStorageBalanceSource = (src) => {
            const x = String(src || '').toLowerCase();
            return x === 'eigenverbrauch' || x === 'pv' || x === 'tarif' || x === 'sungrow-hybrid' || x === 'sungrow-assist' || x === 'fenecon' || x === 'fenecon-assist';
        };
        const getLastStorageBalanceTargetW = () => {
            const last = Number(this._lastTargetW);
            if (!Number.isFinite(last)) return 0;
            return isStorageBalanceSource(this._lastSource) ? last : 0;
        };

        // Gateway AC: Lastreferenz für den AC-Teil des Speichers.
        // Wichtig: Die eigentliche Sollleistung wird weiter unten am NVP bilanziert,
        // damit PV-Überschuss-/EVCS-Situationen nicht zu Batterieentladung in die Einspeisung führen.
        // Priorität der Lastquelle:
        // 1) derived.core.building.loadTotalW (enthält Haus + EV + Zusatzverbraucher)
        // 2) consumptionTotal (direkter Haus-/Gesamtverbrauch)
        // 3) derived.loadRestW + EV + Verbraucher-Slots
        // 4) Fallback aus aktuellem Netzimport + laufender Speicher-Entladung
        /**
         * Code-Teil: Arrow-Funktion `readCacheNumber`
         * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const readCacheNumber = (key, fallback = null) => {
            const sid = String(key || '').trim();
            if (!sid) return fallback;
            try {
                if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                    const n = this.adapter._nwGetNumberFromCache(sid);
                    if (typeof n === 'number' && Number.isFinite(n)) return n;
                }
            } catch {
                // ignore
            }
            try {
                const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[sid] : null;
                const n = Number(rec && rec.value);
                if (Number.isFinite(n)) return n;
            } catch {
                // ignore
            }
            return fallback;
        };

        // Unabhaengiger PV-/Last-Feed-forward fuer den gemeinsamen NVP-Regelkreis.
        // Er wird pro Policy mit deren NVP-Ziel aufgebaut und nur dann verwendet,
        // wenn direkte, frische und zeitlich plausible PV-/Lastmessungen vorliegen.
        // Der normale Regler addiert PV ausdruecklich nicht zur NVP-Differenz; damit
        // bleibt der Feed-forward eine Ersatz-/Plausibilitaetsgroesse ohne Doppelzaehlung.
        const buildStorageFeedForward = (targetNvpW) => this._buildIndependentPvLoadFeedForward({
            nowMs: now,
            staleMs: Math.max(staleMs, num(cfg.balanceFeedForwardMaxAgeMs, staleMs)),
            maxSkewMs: Math.max(0, num(cfg.balanceFeedForwardMaxSkewMs, 15000)),
            rawNvpW: nvpRawW,
            nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
            targetNvpW,
            protectedEvcsLoadW: evcsStorageProtectedLoadW,
            coupling: storageCoupling,
            dcPvPowerW,
            dcPvPowerAgeMs: dcPvPowerAge,
        });
        const balanceFeedForwardPlausibilityW = Math.max(
            200,
            num(cfg.balanceFeedForwardPlausibilityW, Math.max(1000, Math.max(0, num(cfg.maxDeltaWPerTick, 500)) * 2)),
        );

        let feneconAcLoadMemo = null;
        /**
         * Code-Teil: Arrow-Funktion `getFeneconAcLoadTargetW`
         * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: getFeneconAcLoadTargetW
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const getFeneconAcLoadTargetW = () => {
            if (feneconAcLoadMemo) return feneconAcLoadMemo;

            const loadTotalDerivedW = readCacheNumber('derived.core.building.loadTotalW', null);
            if (typeof loadTotalDerivedW === 'number' && Number.isFinite(loadTotalDerivedW) && loadTotalDerivedW >= 0) {
                feneconAcLoadMemo = { w: stripProtectedEvcsLoadW(loadTotalDerivedW), source: evcsStorageProtectedLoadW > 0 ? 'derived.loadTotalW-evcsProtected' : 'derived.loadTotalW' };
                return feneconAcLoadMemo;
            }

            const loadTotalMappedW = readCacheNumber('consumptionTotal', null);
            if (typeof loadTotalMappedW === 'number' && Number.isFinite(loadTotalMappedW) && loadTotalMappedW >= 0) {
                feneconAcLoadMemo = { w: stripProtectedEvcsLoadW(loadTotalMappedW), source: evcsStorageProtectedLoadW > 0 ? 'consumptionTotal-evcsProtected' : 'consumptionTotal' };
                return feneconAcLoadMemo;
            }

            const loadRestDerivedW = readCacheNumber('derived.core.building.loadRestW', null);
            if (typeof loadRestDerivedW === 'number' && Number.isFinite(loadRestDerivedW) && loadRestDerivedW >= 0) {
                const evTotalW = Math.max(0, Math.abs(num(readCacheNumber('evcs.totalPowerW', 0), 0)));
                let consumersTotalW = 0;
                for (let i = 1; i <= 10; i++) {
                    const c = readCacheNumber(`consumer${i}Power`, null);
                    if (typeof c === 'number' && Number.isFinite(c)) consumersTotalW += Math.abs(c);
                }
                feneconAcLoadMemo = {
                    w: stripProtectedEvcsLoadW(loadRestDerivedW + evTotalW + consumersTotalW),
                    source: evcsStorageProtectedLoadW > 0 ? 'derived.loadRestW+slots-evcsProtected' : 'derived.loadRestW+slots',
                };
                return feneconAcLoadMemo;
            }

            const dischargeNowW = (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Math.max(0, battPowerW) : 0;
            feneconAcLoadMemo = {
                w: Math.max(0, importRawWithoutProtectedEvcsW + dischargeNowW),
                source: evcsStorageProtectedLoadW > 0 ? 'approx.import+battery-evcsProtected' : 'approx.import+battery',
            };
            return feneconAcLoadMemo;
        };

        const feneconHybridCtx = feneconHybridActive
            ? await this._buildFeneconHybridContext({ cfg, staleMs, readCacheNumber, gridW, gridRawW, protectedEvcsLoadW: evcsStorageProtectedLoadW })
            : { active: false, configured: !!feneconHybridConfigured, farmBlocked: !!feneconHybridBlockedByFarm, mode: feneconHybridBlockedByFarm ? 'blocked-by-farm' : 'standard' };

        const sungrowHybridCtx = sungrowHybridActive
            ? await this._buildSungrowHybridContext({
                cfg,
                staleMs,
                gridW,
                gridRawW,
                gridAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
                protectedEvcsLoadW: evcsStorageProtectedLoadW,
                coupling: storageCoupling,
                dcPvPowerW,
                dcPvPowerAgeMs: dcPvPowerAge,
            })
            : { active: false, configured: !!sungrowHybridConfigured, mode: 'standard' };

        if (feneconHybridActive) {
            await this._setFeneconHybridDiag({
                active: true,
                mode: feneconHybridCtx.mode,
                reason: feneconHybridCtx.reason,
                writeMode: feneconHybridCtx.writeMode,
                pvW: feneconHybridCtx.pvW,
                additionalPvW: feneconHybridCtx.additionalPvW,
                thresholdW: feneconHybridCtx.thresholdW,
                additionalThresholdW: feneconHybridCtx.additionalThresholdW,
                nvpW: feneconHybridCtx.nvpW,
                forecastW: feneconHybridCtx.forecastW,
                forecastSource: feneconHybridCtx.forecastSource,
                dayOrPvActive: feneconHybridCtx.dayOrPvActive,
                assistActive: feneconHybridCtx.assistActive,
                assistImportThresholdW: feneconHybridCtx.assistImportThresholdW,
            });
        }

        if (sungrowHybridActive) {
            await this._setSungrowHybridDiag({
                active: true,
                mode: sungrowHybridCtx.mode,
                reason: sungrowHybridCtx.reason,
                writeMode: sungrowHybridCtx.writeMode,
                pvW: sungrowHybridCtx.pvW,
                loadW: sungrowHybridCtx.loadW,
                nvpW: sungrowHybridCtx.nvpW,
                importW: sungrowHybridCtx.importW,
                exportW: sungrowHybridCtx.exportW,
                pvCoversLoad: sungrowHybridCtx.pvCoversLoad,
                thresholdW: sungrowHybridCtx.thresholdW,
                loadCoverReserveW: sungrowHybridCtx.loadCoverReserveW,
                dischargeThresholdW: sungrowHybridCtx.dischargeThresholdW,
            });
        }


        // ------------------------------------------------------------
        // Phase 4: Gemeinsame Netzbezug-Caps (Grid-Constraints / Peak-Shaving / Installer)
        // ------------------------------------------------------------
        const coreCaps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
        const evPriorityCaps = (coreCaps && coreCaps.evPriority && typeof coreCaps.evPriority === 'object') ? coreCaps.evPriority : null;
        const evPriorityBlockStorageChargeRaw = !!(evPriorityCaps && evPriorityCaps.blockStorageCharge === true);
        const evPriorityStarvedWRaw = (evPriorityCaps && Number.isFinite(Number(evPriorityCaps.starvedW))) ? Math.max(0, Number(evPriorityCaps.starvedW)) : 0;
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
        const peakEnabled = !!this.adapter.config.enablePeakShaving || !!(this.adapter.config.peakShaving && this.adapter.config.peakShaving.atypical && this.adapter.config.peakShaving.atypical.enabled);
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
        // MultiUse schreibt seine SoC-Zonen in storage.* und darf nur führen,
        // wenn die MultiUse-App wirklich aktiv ist. Ist MultiUse deaktiviert, läuft
        // die Speicherregelungs-App wieder mit der normalen Eigenverbrauchslogik.
        // Alte MultiUse-Werte wie selfDischargeEnabled=false dürfen dann keine
        // dauerhafte 0-W-Sperre mehr verursachen; echte 0-W-Sollwerte auf den
        // Ziel-DPs bleiben davon unberührt und stoppen den Speicher weiterhin.
        const installerCfgForMultiUse = installerCfgForMultiUseEarly;
        const storageMultiUseCfg = storageMultiUseCfgEarly;
        const multiUsePolicyConfigured = !!multiUsePolicyConfiguredEarly;
        const multiUsePolicyActive = !!multiUseAppPolicyActive;
        const ignoreStaleMultiUsePolicy = !!(multiUsePolicyConfigured && !multiUsePolicyActive);
        const storageOnlyPolicyActive = !multiUsePolicyActive;

        // Rollenmodell Speicherregelung:
        // Ohne aktive MultiUse-App ist die Speicherregelungs-App bewusst eine
        // reine Eigenverbrauchsoptimierung: PV-Überschuss laden und Netzbezug
        // am NVP reduzieren. SoC-Zonen für Notstrom/Reserve und LSK gehören
        // erst zur aktiven MultiUse-Policy, damit alte MultiUse-Werte die
        // normale Speicherregelung nicht versteckt sperren oder verschieben.
        const multiUseOwnsZones = !!multiUsePolicyActive;

        // Notstrom-Reserve: harte Untergrenze nur als aktive MultiUse-Zone.
        // Die reine Eigenverbrauchsoptimierung nutzt unten selfMinSoc als
        // Sicherheits-Minimum, aber keine separate Reserve-/Refill-Policy.
        const reserveEnabled = multiUseOwnsZones && !!cfg.reserveEnabled;
        const reserveMin = clamp(num(multiUseOwnsZones ? cfg.reserveMinSocPct : undefined, 20), 0, 100);
        const reserveTarget = clamp(num(multiUseOwnsZones ? cfg.reserveTargetSocPct : undefined, reserveMin), 0, 100);

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

        // LSK/Peak-Shaving über den Speicher ist eine MultiUse-Funktion.
        // Ohne MultiUse bleibt die Speicher-App bei reiner Eigenverbrauchslogik;
        // Peak-Shaving kann dann nicht heimlich über alte SoC-Zonen eingreifen.
        const lskEnabledCfg = multiUseOwnsZones && (cfg.lskEnabled !== false);
        // Richtungs-Freigaben getrennt halten: Entladen kappt Peaks, Laden füllt die
        // LSK-Zone wieder auf. Beide dürfen nur wirken, wenn MultiUse die Policy führt.
        const lskDischargeEnabledCfg = !!(lskEnabledCfg && cfg.lskDischargeEnabled !== false);
        const lskChargeEnabledCfg = !!(lskEnabledCfg && cfg.lskChargeEnabled !== false);
        const lskMinSoc = clamp(num(multiUseOwnsZones ? cfg.lskMinSocPct : undefined, reserveMin), 0, 100);
        const lskMaxSoc = clamp(num(multiUseOwnsZones ? cfg.lskMaxSocPct : undefined, 100), 0, 100);

        // Eigenverbrauch (Entladen optional)
        // Hybrid-/Gateway-Priorität ab 0.6.255:
        // Der Haken aktiviert keine permanente externe AC-Lastfolger-Logik mehr.
        // Bei interner interner PV >= Schwellwert lassen wir Gateway selbst regeln.
        // Bei wenig/keiner PV darf NexoWatt wieder über den normalen Sollleistungs-DP
        // arbeiten, damit dynamische Tariflogik, Reserve und LSK nutzbar bleiben.
        const feneconAcModeConfigured = !!feneconHybridConfigured;
        // Nur aktive MultiUse-Policies dürfen selfDischargeEnabled=false als harte Sperre setzen.
        // Ist MultiUse deaktiviert, wird ein alter gespeicherter false-Wert ignoriert, damit die
        // normale Eigenverbrauchsregelung bei SoC + Netzbezug weiter arbeiten kann.
        const hasStoredSelfFlag = (cfg.selfDischargeEnabled === true || cfg.selfDischargeEnabled === false);
        const hasExplicitSelfFlag = hasStoredSelfFlag && (!multiUsePolicyConfigured || multiUseOwnsZones);
        const feneconAcMode = false;
        // Farm-Verhalten bewusst unverändert lassen: ältere Farm-Setups, die den alten
        // Haken nur als implizite Eigenverbrauchs-Freigabe genutzt haben, behalten diesen
        // Fallback. Die neue Hybrid-/Gateway-Priorität-Policy selbst wirkt in der Farm nicht.
        const farmSelfDischargeFallback = !!(farmEnabled && cfg.feneconAcMode === true && !hasExplicitSelfFlag);
        const feneconLowPvSelfDischargeFallback = !!(feneconHybridActive && !hasExplicitSelfFlag);
        // Alte Gateway-EV-Prioritäts-/PV-Block-Caps werden durch den neuen Modus nicht
        // mehr aktiviert. Flexible Verbraucher bleiben in der bestehenden Standardlogik.
        const evPriorityBlockStorageCharge = false;
        const evPriorityStarvedW = 0;
        const genericSelfDischargeDefault = true;
        const selfDischargeEnabled = hasExplicitSelfFlag
            ? (cfg.selfDischargeEnabled === true)
            : (farmSelfDischargeFallback || feneconLowPvSelfDischargeFallback || genericSelfDischargeDefault);
        const selfMinSoc = clamp(num((multiUseOwnsZones || !multiUsePolicyConfigured) ? cfg.selfMinSocPct : undefined, reserveMin), 0, 100);
        const selfMaxSoc = clamp(num((multiUseOwnsZones || !multiUsePolicyConfigured) ? cfg.selfMaxSocPct : undefined, 100), 0, 100);
        // Eigenverbrauchs-Optimierung: Ziel-Netzbezug am NVP.
        // Praxis: ein kleiner Bezug (z. B. 50–150 W) ist oft stabiler als exakt 0 W
        // (Messrauschen, Totzeiten, Geräte-Rampen).
        // Standard-Eigenverbrauch bleibt herstellerunabhängig bei kleinem Ziel-Import.
        // Hybrid-/Gateway-Priorität entscheidet später pro Tick über Zusatz-PV-Cap, Assist
        // und Schreibdiagnose; der AppCenter-Ausgang bleibt dabei immer gekoppelt.
        // Zielwert/Deadband sind Tuningwerte der Eigenverbrauchsregelung und
        // dürfen auch ohne MultiUse genutzt werden. Sie bilden keine SoC-Zonen.
        const selfTargetGridW = Math.max(0, num(cfg.selfTargetGridImportW, 50));
        const selfImportThresholdW = Math.max(0, num(cfg.selfImportThresholdW, 50));

        // NVP-Stabilisator: Fuehrungsgroesse fuer die Eigenverbrauchsregelung.
        // Die RAW-Messung bleibt fuer harte Caps/Schutzlogik erhalten, aber der
        // eigentliche Sollwert folgt im Normalbereich dem gefilterten NVP. Dadurch
        // wird das sichtbare Springen zwischen Netzbezug und Einspeisung reduziert.
        const selfNvpBaseW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW))
            ? gridRawW
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null);
        const selfNvpStabilizer = this._buildSelfNvpControlSignal(
            selfNvpBaseW,
            now,
            cfg,
            selfTargetGridW + evcsStorageProtectedNvpTargetShiftW,
            selfImportThresholdW,
        );
        await this._setIfChanged('speicher.regelung.selfNvpRawW', Number.isFinite(Number(selfNvpStabilizer.rawW)) ? Math.round(Number(selfNvpStabilizer.rawW)) : null);
        await this._setIfChanged('speicher.regelung.selfNvpFilteredW', Number.isFinite(Number(selfNvpStabilizer.filteredW)) ? Math.round(Number(selfNvpStabilizer.filteredW)) : null);
        await this._setIfChanged('speicher.regelung.selfNvpControlW', Number.isFinite(Number(selfNvpStabilizer.controlW)) ? Math.round(Number(selfNvpStabilizer.controlW)) : null);
        await this._setIfChanged('speicher.regelung.selfNvpControlMode', String(selfNvpStabilizer.mode || ''));

        await this._setIfChanged('speicher.regelung.lskMinSocPct', lskMinSoc);
        await this._setIfChanged('speicher.regelung.lskMaxSocPct', lskMaxSoc);
        await this._setIfChanged('speicher.regelung.selfMinSocPct', selfMinSoc);
        await this._setIfChanged('speicher.regelung.selfMaxSocPct', selfMaxSoc);
        await this._setIfChanged('speicher.regelung.selfTargetGridImportW', selfTargetGridW);
        await this._setIfChanged('speicher.regelung.selfImportThresholdW', selfImportThresholdW);
        await this._setIfChanged('speicher.regelung.selfEntladenAktiviert', !!selfDischargeEnabled);
        await this._setIfChanged('speicher.regelung.lskPolicyAktiv', !!lskEnabledCfg);
        await this._setIfChanged('speicher.regelung.lskEntladenAktiviert', !!lskDischargeEnabledCfg);
        await this._setIfChanged('speicher.regelung.lskLadenAktiviert', !!lskChargeEnabledCfg);
        await this._setIfChanged('speicher.regelung.multiUsePolicyActive', !!multiUsePolicyActive);
        await this._setIfChanged('speicher.regelung.multiUsePolicyIgnored', !!ignoreStaleMultiUsePolicy);
        await this._setIfChanged('speicher.regelung.policyMode', multiUsePolicyActive ? 'multiuse' : 'eigenverbrauch');
        await this._setIfChanged('speicher.regelung.policyLayerStorageOnly', !!storageOnlyPolicyActive);

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

        // Herstellerunabhaengiger Istwert-Puffer fuer das geschlossene NVP-
        // Balancing. Der normale staleTimeout bleibt fuer Schutzpfade unveraendert;
        // nur die Regelbasis darf den letzten validen Batterie-Istwert laenger
        // halten, weil viele Speicher NVP und Batterieleistung asynchron melden.
        const legacyFeedbackFreshMs = Math.max(1000, num(cfg.balanceFeedbackMaxAgeMs, 8000));
        const balanceFeedbackFreshMs = Math.min(staleMs, legacyFeedbackFreshMs);
        const balanceFeedbackHoldSec = clamp(num(cfg.balanceFeedbackHoldSec, 45), 1, 300);
        const balanceFeedbackHoldMs = Math.max(balanceFeedbackFreshMs, balanceFeedbackHoldSec * 1000);
        const balanceFeedbackPredictionSteps = clamp(num(cfg.balanceFeedbackPredictionSteps, 4), 0, 20);
        const derivedPredictionLimitW = Math.max(
            500,
            Math.min(10000, (maxDelta > 0 ? maxDelta : 500) * balanceFeedbackPredictionSteps),
        );
        const balanceFeedbackPredictionMaxW = Math.max(
            0,
            num(cfg.balanceFeedbackPredictionMaxW, derivedPredictionLimitW),
        );
        const storageBalanceFeedback = this._resolveBatteryBalanceFeedback({
            nowMs: now,
            measuredW: battPowerObservedW,
            measuredAgeMs: battPowerAge,
            mappingTrusted: battPowerMappingTrusted,
            objectId: battPowerObjectId,
            source: battPowerFeedbackSource,
            freshAgeMs: balanceFeedbackFreshMs,
            holdAgeMs: balanceFeedbackHoldMs,
            lastTargetW: getLastStorageBalanceTargetW(),
            lastTargetWriteMs: this._lastTargetWriteMs,
            lastTargetAllowed: isStorageBalanceSource(this._lastSource),
            maxPredictionDeltaW: balanceFeedbackPredictionMaxW,
            zeroToleranceW: Math.max(100, stepW * 2, selfImportThresholdW),
        });
        const balanceBatteryPowerW = storageBalanceFeedback.usable ? Number(storageBalanceFeedback.feedbackW) : null;
        const balanceBatteryMeasuredW = storageBalanceFeedback.usable ? Number(storageBalanceFeedback.measuredW) : null;
        const balanceBatteryAgeMs = storageBalanceFeedback.usable ? Number(storageBalanceFeedback.sampleAgeMs) : null;
        const balanceBatteryTrusted = storageBalanceFeedback.usable === true;

        await this._setIfChanged('speicher.regelung.batteryPowerBalanceTrusted', balanceBatteryTrusted);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMode', String(storageBalanceFeedback.source || ''));
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackMeasuredW', Number.isFinite(balanceBatteryMeasuredW) ? Math.round(balanceBatteryMeasuredW) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackBasisW', Number.isFinite(balanceBatteryPowerW) ? Math.round(balanceBatteryPowerW) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackAgeMs', Number.isFinite(balanceBatteryAgeMs) ? Math.round(balanceBatteryAgeMs) : null);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHeld', !!storageBalanceFeedback.held);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredicted', !!storageBalanceFeedback.predicted);
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', Math.round(Number(storageBalanceFeedback.predictionDeltaW) || 0));
        await this._setIfChanged('speicher.regelung.batteryPowerFeedbackHoldMs', Math.round(balanceFeedbackHoldMs));

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
        if (peakEnabled && lskDischargeEnabledCfg) {
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

                    // Feldschutz 0.8.81: Lastspitzenkappung darf nicht über den sichtbaren
                    // Peak-Bedarf hinaus hochintegrieren. Der sichere Bedarf ist hier:
                    // echte Überschreitung am NVP + echte Batterie-Istentladung + Puffer.
                    // Der letzte Sollwert zählt bewusst NICHT als Demand-Basis. Wenn die
                    // Batterie-Istleistung fehlt, bleibt der Regler NVP-basiert konservativ;
                    // dadurch kann ein falscher Modbus-/Setpoint-DP keinen Industrieanschluss
                    // mit einem zu hohen Entladesollwert gefährden.
                    const lskOverLimitW = Math.max(0, importNowW - limitW);
                    const lskMeasuredDischargeW = (battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW))
                        ? Math.max(0, battPowerW)
                        : 0;
                    const lskSafetyMarginW = 200;
                    const lskDemandCapW = Math.max(0, lskOverLimitW + lskMeasuredDischargeW + lskSafetyMarginW);
                    dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
                        ? Math.min(dischargeDemandHardCapW, lskDemandCapW)
                        : lskDemandCapW;
                    dischargeDemandHardCapReason = (battPowerTrusted && typeof battPowerW === 'number')
                        ? 'LSK-NVP-Demand-Cap (Peak-Überlast+Batterie)'
                        : 'LSK-NVP-Demand-Cap (Peak-Überlast ohne Batterie-Istleistung)';
                    nextSetW = Math.min(nextSetW, lskDemandCapW);

                    targetW = nextSetW;
                    reason = `Lastspitzenkappung: entladen (Import ${Math.round(importNowW)} W > Limit ${Math.round(limitW)} W)`;
                    source = 'lastspitze';
                    hardDischargeMinSoc = Math.max(hardDischargeMinSoc, lskMinSoc);

                    // Merken: Peak war aktiv (fuer den verzögerten LSK-Refill).
                    this._lastPeakActiveMs = now;
                }
            }
        }

        // 2) Gate C: Ladepark-Unterstützung (EVCS Boost/Auto) via Speicher-Entladung.
        // Rollenmodell 0.8.81: Diese Kopplung gehört zu MultiUse. Die reine
        // Speicherregelungs-App bleibt Eigenverbrauchsoptimierung und darf keine
        // Ladepark-/Komfortentladung aus alten States starten.
        const evcsStorageAssistPolicyAllowed = !!multiUsePolicyActive;
        if (targetW === 0 && !feneconAcMode) {
            const assistW = await this._readOwnNumber('chargingManagement.control.storageAssistW');
            evcsAssistReqW = (typeof assistW === 'number' && Number.isFinite(assistW)) ? assistW : 0;
            if (typeof assistW === 'number' && assistW > 0) {
                if (!evcsStorageAssistPolicyAllowed) {
                    targetW = 0;
                    reason = 'EVCS-Unterstützung blockiert (MultiUse nicht aktiv; Speicherregelung = Eigenverbrauch pur)';
                    source = 'evcs';
                } else {
                    // EVCS-Unterstützung ist MultiUse-Komfort – wenn Reserve wieder aufgefüllt
                    // werden soll, blockieren wir das bewusst.
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
        }

		// 2) Tarif (dynamischer Zeittarif)
		// - Steuerung kommt aus dem TarifVis-Modul (adapter._tarifVis)
		// - Entladen bei "teuer" nur bis NVP = 0 W (kein Export durch Tarif)
		let tarifState = null;
		if (targetW === 0) {
			const tv = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
			const tvAktiv = !!(tv && tv.aktiv);
			const tariffNegativeImportPreferred = !!(tv && (tv.negativeActive || tv.gridImportPreferred || tv.netzbezugBevorzugt));
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
						const battSignedW = balanceBatteryTrusted
							? Number(balanceBatteryPowerW)
							: ((typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Number(battPowerW) : 0);
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
						if (nvpNowW < 0 && !tariffNegativeImportPreferred) {
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
						  const pvReserveEnabled = (cfg.tariffPvReserveEnabled !== false) && !tariffNegativeImportPreferred; // default: ON, bei Negativpreis bewusst aus
						  if (pvReserveEnabled && pf && pf.valid && Array.isArray(pf.curve) && pf.curve.length) {
						    // Bei sehr alten Forecasts lieber keine PV‑Reserve erzwingen.
						    const maxAgeMs = 24 * 3600000;
						    const ageOk = (pf.ageMs === null || pf.ageMs === undefined) ? true : (pf.ageMs <= maxAgeMs);
						    if (ageOk && typeof soc === 'number' && Number.isFinite(soc)) {
						      // Kapazität (kWh):
						      // - Speicherfarm: Summe aus Farm‑Konfig
						      // - Single: installerConfig.storage.capacityKWh (optional)
						      // - Fallback: gemappter DP (st.capacityKwh)
						      //
						      // Hinweis:
						      // Damit PV‑Reserve im Nacht‑Tarif wirklich verhindert, dass der Speicher
						      // „blind“ auf 100% aus dem Netz geladen wird, brauchen wir eine Kapazität.
						      // Wenn sie nicht gemappt/konfiguriert ist, schätzen wir sie konservativ aus
						      // der im Tarif angeforderten Ladeleistung (SoC‑Cap bleibt dadurch trotzdem aktiv).
						      let capKWh = null;
						      let capKWhSource = '';
						      let capKWhEstimated = false;
						      try {
						        const farmCfg2 = (this.adapter && this.adapter.config && this.adapter.config.storageFarm) ? this.adapter.config.storageFarm : null;
						        const farmEnabledForCapacity = this._getStorageControlAuthority().selectedTopology === 'farm';
						        if (farmEnabledForCapacity && farmCfg2 && Array.isArray(farmCfg2.storages)) {
						          let sum = 0;
						          for (const s of farmCfg2.storages) {
						            if (!s || s.enabled === false) continue;
						            const c = Number(s.capacityKWh);
						            if (Number.isFinite(c) && c > 0) sum += c;
						          }
						          if (sum > 0) {
						            capKWh = sum;
						            capKWhSource = 'farm';
						          }
						        }
						      } catch {
						        // ignore
						      }
						
						      if (!(typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0)) {
						        const capCfg = Number(this.adapter?.config?.storage?.capacityKWh);
						        if (Number.isFinite(capCfg) && capCfg > 0) {
						          capKWh = capCfg;
						          capKWhSource = 'config';
						        }
						      }
						
						      if (!(typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0) && this.dp) {
						        const capDp = this.dp.getNumber('st.capacityKwh', null);
						        if (typeof capDp === 'number' && Number.isFinite(capDp) && capDp > 0) {
						          capKWh = capDp;
						          capKWhSource = 'dp';
						        }
						      }
						
						      const socTarget = (typeof hardChargeMaxSoc === 'number' && Number.isFinite(hardChargeMaxSoc)) ? hardChargeMaxSoc : 100;
						
						      // Horizon (h) + Heuristik‑Faktoren
						      const horizonH = clamp(num(cfg.tariffPvReserveHorizonHours, 24), 1, 48);
						      const captureFactor = clamp(num(cfg.tariffPvReserveCaptureFactor, 0.6), 0, 1);
						      const confidence = clamp(num(cfg.tariffPvReserveConfidence, 0.85), 0, 1);
						
							      // PV-Reserve: Niemals auf extrem niedrige SoC-Werte deckeln.
							      // Sonst blockiert sie das Tarif-/NT-Laden schon bei sehr niedrigem SoC (z.B. 10%).
							      // Default: mindestens 20% (konfigurierbar via tariffPvReserveMinSocPct).
							      const reserveMinEff = (typeof reserveMin === 'number' && Number.isFinite(reserveMin)) ? reserveMin : 20;
							      const minSocForWaitCfg = num(cfg.tariffPvReserveMinSocPct, NaN);
							      const minSocForWait = (Number.isFinite(minSocForWaitCfg))
							        ? clamp(minSocForWaitCfg, 0, socTarget)
							        : Math.max(reserveMinEff + 2, 20);
						
						      // PV Charge‑Potential (kWh) über den Horizon, limitiert durch maxChargeW (falls gesetzt).
						      let pvChargePotentialKWh = 0;
						      const t0 = now;
						      const t1 = t0 + horizonH * 3600000;
						      const limitW = (typeof maxChargeW === 'number' && Number.isFinite(maxChargeW) && maxChargeW > 0 && maxChargeW !== Number.POSITIVE_INFINITY)
						        ? maxChargeW
						        : null;
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
						      // Saisonfaktor (Quartale) – optional über VIS-Settings
						      let pvSeasonEnabled = false;
						      let pvSeasonQuarter = null;
						      let pvSeasonFactor = 1;

						      // KI-Automatik: passt den Faktor anhand PV-Forecast (Stärke) an,
						      // damit Kunden keine Quartalswerte manuell pflegen müssen.
						      let pvSeasonAiEnabled = false;
						      let pvSeasonAiUsed = false;
						      let pvSeasonBaseFactor = 1;
						      let pvSeasonAiReason = '';
						      try {
						        if (this.dp) {
						          const kEn = 'vis.settings.tariffPvSeasonEnabled';
						          const en = this.dp.getBoolean(kEn, false);
						          const ageEn = this.dp.getAgeMs(kEn);
						          if (en && (ageEn === null || ageEn <= staleMs)) {
						            pvSeasonEnabled = true;
						            const month = new Date(now).getMonth(); // 0..11
						            const q = Math.floor(month / 3) + 1; // 1..4
						            pvSeasonQuarter = q;

						            // Basisfaktor (manuell) je Quartal
						            const kF = `vis.settings.tariffPvSeasonQ${q}Factor`;
						            const ageF = this.dp.getAgeMs(kF);
						            const fRaw = this.dp.getNumber(kF, 1);
						            if ((ageF === null || ageF <= staleMs) && Number.isFinite(fRaw) && fRaw >= 0) {
						              pvSeasonBaseFactor = clamp(fRaw, 0, 2);
						            } else {
						              pvSeasonBaseFactor = 1;
						            }

						            // KI-Automatik ist immer aktiv (Standard).
						            // Manuelle Quartalsfaktoren bleiben optional als Basiswert (Feintuning).
						            pvSeasonAiEnabled = true;

						            // PV-Stärke aus Forecast ableiten:
						            // - Wenn Kapazität bekannt: Verhältnis PV-kWh / Cap-kWh
						            // - Sonst: heuristische Normierung (12 kWh ≈ "voll" in vielen Haushalten)
						            const pvKwh = Math.max(0, Number(pvChargePotentialKWh) || 0);
						            const capRef = (typeof capKWh === 'number' && Number.isFinite(capKWh) && capKWh > 0) ? capKWh : 12;
						            const pvScore = clamp(pvKwh / capRef, 0, 1); // 0..1
						            const adj = clamp(0.85 + 0.30 * pvScore, 0.75, 1.20); // 0.75..1.20
						            const fAuto = clamp(pvSeasonBaseFactor * adj, 0, 2);

						            pvSeasonFactor = fAuto;
						            pvSeasonAiUsed = true;
						            pvSeasonAiReason = `KI: Q${q} Basis ${pvSeasonBaseFactor.toFixed(2)} * Adj ${adj.toFixed(2)} (PV ${pvKwh.toFixed(1)} kWh, Ref ${capRef.toFixed(1)} kWh)`;
						          }
						        }
						      } catch (_e) {
						        pvSeasonEnabled = false;
						        pvSeasonQuarter = null;
						        pvSeasonFactor = 1;
						        pvSeasonAiEnabled = false;
						        pvSeasonAiUsed = false;
						        pvSeasonBaseFactor = 1;
						        pvSeasonAiReason = '';
						      }

						      const pvStorableKWh = pvChargePotentialKWh * captureFactor * confidence * pvSeasonFactor;
						      // Kapazität: wenn unbekannt, grob aus Tarif‑Ladeleistung schätzen (Fallback)
						      let capKWhEff = capKWh;
							      if (!(typeof capKWhEff === 'number' && Number.isFinite(capKWhEff) && capKWhEff > 0)) {
							        // Schätzung (Fallback): bewusst eher "zu groß" wählen, damit PV-Reserve nicht zu aggressiv
							        // wird, wenn die reale Kapazität nicht konfiguriert/ermittelbar ist.
							        // Praxis: viele Systeme liegen eher bei 4–8h @ Nennleistung.
							        const estHours = 6;
						        const reqW = (Number.isFinite(Math.abs(want)) && Math.abs(want) > 0) ? Math.abs(want) : null;
						        let estKWh = (reqW && Number.isFinite(reqW)) ? (reqW / 1000) * estHours : NaN;
						        if (Number.isFinite(estKWh) && estKWh > 0) {
						          // Sane bounds to avoid extreme behaviour on bad configs
							          estKWh = clamp(estKWh, 10, 500);
						          capKWhEff = estKWh;
						          capKWhSource = 'estimated';
						          capKWhEstimated = true;
						        }
						      }
						
						      if (typeof capKWhEff === 'number' && Number.isFinite(capKWhEff) && capKWhEff > 0) {
						        // Headroom in % (clamp auf sinnvolle Range)
						        const headroomSocPctRaw = (pvStorableKWh > 0) ? (pvStorableKWh / capKWhEff) * 100 : 0;
						        const headroomSocPct = clamp(headroomSocPctRaw, 0, socTarget);
						
						        // Netzlade‑SoC‑Cap: Ziel minus Headroom (mindestens minSocForWait)
						        const capSocPct = clamp(socTarget - headroomSocPct, minSocForWait, socTarget);
						
						        const active = (headroomSocPct >= 0.5) && (capSocPct < (socTarget - 0.5));
						        if (active && soc >= (capSocPct - 1e-9)) {
						          pvBlockGridCharge = true;
						          const capNote = capKWhEstimated ? ' (Cap geschätzt)' : '';
						          pvBlockReason = `PV‑Reserve: Netzladen bis max ${capSocPct.toFixed(1)}%${capNote} (Headroom ${headroomSocPct.toFixed(1)}% ≈ ${pvStorableKWh.toFixed(1)} kWh) · Saison ${pvSeasonFactor.toFixed(2)}${pvSeasonAiUsed ? ' (KI)' : ''}`;
						        }
						
						        pvDebug = {
						          mode: 'pvReserveCap',
						          ageMs: (pf.ageMs === null || pf.ageMs === undefined) ? null : Math.round(Number(pf.ageMs)),
						          capKWh: Number(capKWhEff),
						          capKWhSource,
						          capKWhEstimated,
						          socNow: soc,
						          socTarget,
						          horizonH,
						          pvChargePotentialKWh: Number(pvChargePotentialKWh),
						          captureFactor,
						          confidence,
						          pvSeasonEnabled,
						          pvSeasonQuarter,
						          pvSeasonFactor: Number(pvSeasonFactor),
						          pvSeasonAiEnabled,
						          pvSeasonAiUsed,
						          pvSeasonBaseFactor: Number(pvSeasonBaseFactor),
						          pvSeasonAiReason,
						          pvStorableKWh: Number(pvStorableKWh),
						          headroomSocPct: Number(headroomSocPct),
						          capSocPct: Number(capSocPct),
						          minSocForWait,
						          blocked: pvBlockGridCharge,
						          reason: pvBlockGridCharge ? pvBlockReason : '',
						        };
						      } else {
						        // Kapazität nicht ermittelbar -> PV‑Reserve kann nicht sauber rechnen, aber Debug liefern.
						        pvDebug = {
						          mode: 'pvReserveUnavailable',
						          ageMs: (pf.ageMs === null || pf.ageMs === undefined) ? null : Math.round(Number(pf.ageMs)),
						          capKWh: null,
						          capKWhSource: capKWhSource || '',
						          capKWhEstimated: false,
						          socNow: soc,
						          socTarget,
						          horizonH,
						          pvChargePotentialKWh: Number(pvChargePotentialKWh),
						          captureFactor,
						          confidence,
						          pvSeasonEnabled,
						          pvSeasonQuarter,
						          pvSeasonFactor: Number(pvSeasonFactor),
						          pvSeasonAiEnabled,
						          pvSeasonAiUsed,
						          pvSeasonBaseFactor: Number(pvSeasonBaseFactor),
						          pvSeasonAiReason,
						          pvStorableKWh: Number(pvStorableKWh),
						          headroomSocPct: null,
						          capSocPct: null,
						          minSocForWait,
						          blocked: false,
						          reason: 'PV‑Reserve: Kapazität unbekannt',
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
						chargeW = Math.max(0, chargeW);
						// Lade-Cap 0.8.80: Der nach Headroom, Importlimit und PV-Reserve erlaubte
						// Netzlade-Wert wird nach der Rampe erneut hart angewendet. Dadurch kann
						// ein alter hoher Lade-Sollwert nicht weiterlaufen, wenn der Tarif-/Headroom
						// Regler im aktuellen Tick nur noch wenig oder 0 W Laden erlaubt.
						chargeDemandHardCapW = chargeW;
						chargeDemandHardCapReason = pvBlockGridCharge ? 'Tarif-PV-Reserve-Lade-Cap' : 'Tarif-Netzlade-Headroom-Cap';
						targetW = -chargeW;
						if (pvBlockGridCharge) {
							reason = pvBlockReason || 'Tarif: günstig – PV Forecast -> Netzladen gesperrt';
						} else if (tariffNegativeImportPreferred) {
							reason = (targetW === 0) ? 'Tarif: Negativpreis – Netzladen nicht möglich' : 'Tarif: Negativpreis – Netzladen bevorzugt';
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
						const targetImportW = Math.max(0, num(cfg.tariffTargetGridImportW, selfTargetGridW) + evcsStorageProtectedNvpTargetShiftW);
						const deadbandW = Math.max(0, num(cfg.tariffImportThresholdW, selfImportThresholdW));

						// Tarif-Entladung regelt am NVP.
						// Primär nutzen wir den ROH-Wert (NVP), weil eine starke Glättung zu Verzögerungen
						// und damit zu Sollwert-Spikes/Überschwingern führen kann.
						// Stabilisierung erfolgt über Deadband + Dispatcher (Schritt/Rampe).
						const nvpRawW = (typeof gridRawW === 'number') ? gridRawW : gridW;
						const nvpCtrlW = (typeof nvpRawW === 'number') ? nvpRawW : gridW;

						// Auch im teuren Tarif-Fenster gilt dieselbe physikalische Regelung wie
						// bei der reinen Eigenverbrauchsoptimierung: echte Batterie-Istleistung
						// plus NVP-Differenz. So springt die Vorgabe nicht zwischen altem Sollwert
						// und aktuellem Netzbezug, sondern folgt der bereits wirksamen Leistung.
						const lastTariffTargetW = (this._lastSource === 'tarif' && Number.isFinite(Number(this._lastTargetW)))
							? Number(this._lastTargetW)
							: 0;
						const tariffFeedForward = buildStorageFeedForward(targetImportW);
						const balance = this._buildActualAwareNvpBalance({
							rawNvpW: nvpRawW,
							fallbackNvpW: nvpCtrlW,
							nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
							targetNvpW: targetImportW,
							deadbandW,
							batteryPowerW: balanceBatteryPowerW,
							batteryMeasuredW: balanceBatteryMeasuredW,
							batteryAgeMs: balanceBatteryAgeMs,
							batteryPowerTrusted: balanceBatteryTrusted,
							batteryFeedbackSource: storageBalanceFeedback.source,
							batteryFeedbackHeld: storageBalanceFeedback.held,
							batteryFeedbackPredicted: storageBalanceFeedback.predicted,
							batteryFeedbackPredictionDeltaW: storageBalanceFeedback.predictionDeltaW,
							batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
							lastTargetW: lastTariffTargetW,
							lastTargetAllowed: this._lastSource === 'tarif',
							maxDischargeCorrectionW: maxDelta,
							maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
							feedbackMaxAgeMs: balanceFeedbackHoldMs,
							nvpFeedbackMaxAgeMs: staleMs,
							feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
							feedbackRequireAligned: false,
							feedForwardUsable: tariffFeedForward.usable === true,
							feedForwardTargetW: tariffFeedForward.targetW,
							feedForwardExpectedActualW: tariffFeedForward.expectedActualW,
							feedForwardPvW: tariffFeedForward.pvW,
							feedForwardLoadW: tariffFeedForward.loadW,
							feedForwardPvSource: tariffFeedForward.pvSource,
							feedForwardLoadSource: tariffFeedForward.loadSource,
							feedForwardReason: tariffFeedForward.reason,
							feedForwardMeasurementSkewMs: tariffFeedForward.measurementSkewMs,
							feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
							stepW,
						});
						storageNvpBalanceDiag = { ...balance, policy: 'tarif' };
						storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || balance.rampManaged;
						const battW = balance.feedbackUsed ? Math.max(0, Number(balance.baseW) || 0) : null;
						let nextSetW = Math.max(0, Number(balance.targetW) || 0);

						// Safety-Clamp gegen unnötige Export-Spikes:
						// Begrenze die Entladung auf den aktuell am NVP belegbaren Bedarf:
						// echter Import + echte gemessene Batterie-Entladung + kleiner Puffer.
						// WICHTIGER Feldfix 0.8.81: Abgeleitete Gebäudelasten (z. B. derived.loadTotalW)
						// dürfen diesen Cap NICHT vergrößern. Bei gleichzeitiger PV-Erzeugung kann die
						// Gebäudelast deutlich größer als der Netzbezug sein; würde man sie als Cap nutzen,
						// könnte der Speicher trotz nur 2-3 kW Import wieder auf zweistellige kW-Werte laufen.
						const importRawNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
						const measuredDischargeNowW = (typeof battW === 'number') ? Math.max(0, battW) : 0;
						const safetyMarginW = 200;
						const protectedTariffImportW = Math.max(0, importRawNowW - evcsStorageProtectedLoadW);
							const protectedTariffMarginW = protectedTariffImportW > 0 ? safetyMarginW : 0;
							const measuredDemandCapW = Math.max(0, protectedTariffImportW + measuredDischargeNowW + protectedTariffMarginW);
						// Ohne vertrauenswürdige Batterie-Istleistung darf der letzte Sollwert auch in
						// der Deadband nicht als harte Obergrenze weiterleben. Sonst kann ein alter
						// hoher Entladebefehl nach der Rampe erneut durchrutschen.
						const maxByDemandW = measuredDemandCapW;
						if (Number.isFinite(maxByDemandW) && maxByDemandW >= 0) {
							dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
								? Math.min(dischargeDemandHardCapW, maxByDemandW)
								: maxByDemandW;
							dischargeDemandHardCapReason = (typeof battW === 'number')
								? 'Tarif-NVP-Demand-Cap (NVP+gemessene Batterie)'
								: 'Tarif-NVP-Demand-Cap (konservativ ohne Batterie-Istleistung)';
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
    // Wenn der dynamische Tarif im "günstig"-Fenster ist, kann es gewünscht sein,
    // die Eigenverbrauchs-Entladung zu sperren (z.B. während aktivem Netzladen).
    //
    // BUGFIX (Phase 8+):
    // In Konstellationen, in denen das Tarif-Netzladen zwar "geplant" ist, aber durch
    // PV‑Reserve / PV‑Forecast bewusst blockiert wird (=> targetW bleibt 0), darf die
    // Eigenverbrauchs-Entladung nicht pauschal gesperrt werden. Sonst bleibt der Speicher
    // "eingefroren" und der Kunde zieht unnötig Netzbezug.
    const tariffBlocksDischarge = (typeof dischargeAllowed === 'boolean' && dischargeAllowed === false);
    const reasonTxt = (reason === null || reason === undefined) ? '' : String(reason);
    const pvReserveBlocked = (source === 'tarif') && (
        (reasonTxt.includes('PV') && reasonTxt.toLowerCase().includes('reserve')) ||
        reasonTxt.toLowerCase().includes('pv forecast')
    );

    if (feneconAcMode) {
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
        const acLoad = getFeneconAcLoadTargetW();
        const acLoadW = (acLoad && typeof acLoad.w === 'number' && Number.isFinite(acLoad.w)) ? Math.max(0, acLoad.w) : 0;

        // Gateway AC darf nicht blind der kompletten AC-Last folgen.
        // Beispiel: PV 10,6 kW, Haus+EVCS 10,3 kW, Speicher entlädt 3,5 kW =>
        // am NVP entstehen ~3,8 kW Export. In diesem Fall muss die AC-Entladung
        // zurückgenommen werden. Deshalb wird der Lastfolger am NVP bilanziert:
        // neue Entladung = aktuelle Entladung + (NVP-Ist - NVP-Ziel).
        const feneconNvpW = (typeof nvpRawW === 'number' && Number.isFinite(nvpRawW))
            ? nvpRawW
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null);
        const lastWasFenecon = this._lastSource === 'fenecon';
        const currentDischargeW = balanceBatteryTrusted
            ? Math.max(0, Number(balanceBatteryPowerW) || 0)
            : ((battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW))
                ? Math.max(0, battPowerW)
                : 0);
        const feneconTargetNvpW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW;
        const feneconErrW = (typeof feneconNvpW === 'number') ? (feneconNvpW - feneconTargetNvpW) : 0;
        const feneconLoadLimitW = acLoadW > 0
            ? acLoadW
            : Math.max(0, importRawW + currentDischargeW);

        let nextSetW = currentDischargeW + feneconErrW;

        // Nicht aus dem Stand auf Messrauschen reagieren. Wenn die Gateway-Regelung
        // bereits aktiv war, darf sie aber weiter fein nachregeln bzw. bei Export
        // schnell zurückfahren.
        if (!lastWasFenecon && feneconErrW < selfImportThresholdW) {
            nextSetW = 0;
        }

        const feneconNonEvcsImportW = Math.max(0, (typeof feneconNvpW === 'number' ? Math.max(0, feneconNvpW) : 0) - evcsStorageProtectedLoadW);
        const feneconDemandCapW = Math.max(0, feneconNonEvcsImportW + currentDischargeW + (feneconNonEvcsImportW > 0 ? 200 : 0));
        dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
            ? Math.min(dischargeDemandHardCapW, feneconDemandCapW)
            : feneconDemandCapW;
        dischargeDemandHardCapReason = 'Gateway-NVP-Demand-Cap';
        nextSetW = clamp(nextSetW, 0, Math.min(feneconLoadLimitW, selfMaxDischargeEff, feneconDemandCapW));

        if (allow && nextSetW > 0) {
            targetW = nextSetW;
            reason = `Gateway AC: NVP-Balancing (${Math.round(targetW)} W, NVP ${Math.round(feneconNvpW || 0)} W, Ziel ${Math.round(selfTargetGridW)} W, Last ${Math.round(acLoadW)} W, Quelle ${String(acLoad && acLoad.source ? acLoad.source : 'unbekannt')})`;
            source = 'fenecon';
            hardDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
        } else if (acLoadW > 0 && (source === 'idle' || reason === 'Keine Aktion')) {
            if (reserveActive) {
                reason = 'Gateway AC: NVP-Balancing blockiert (Reserve aktiv)';
                source = 'reserve';
            } else if (reserveChargeWanted) {
                reason = 'Gateway AC: NVP-Balancing blockiert (Reserve soll aufgefüllt werden)';
                source = 'reserve';
            } else if (!socOk) {
                reason = `Gateway AC: NVP-Balancing blockiert (SoC <= ${selfMinSoc}%)`;
                source = 'reserve';
            } else if (typeof feneconNvpW === 'number' && feneconNvpW <= selfTargetGridW) {
                reason = `Gateway AC: keine Entladung nötig (NVP ${Math.round(feneconNvpW)} W <= Ziel ${Math.round(feneconTargetNvpW)} W inkl. EVCS-Schutz)`;
                source = 'idle';
            }
        }
    } else if (tariffBlocksDischarge && !pvReserveBlocked) {
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
    const desiredNvpW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW; // kleiner Haus-Import plus geschuetzte EVCS-Last
    const deadbandW = Math.max(0, selfImportThresholdW); // Start-/Stop-Schwelle gegen Flattern
    const nvpCtrlW = (selfNvpStabilizer && typeof selfNvpStabilizer.controlW === 'number' && Number.isFinite(selfNvpStabilizer.controlW))
        ? selfNvpStabilizer.controlW
        : ((typeof nvpRawW === 'number') ? nvpRawW : gridW);       // gefiltert + RAW-Guard für Regelung

    // Eigenverbrauch darf nur seinen eigenen letzten Sollwert als konservativen
    // Fallback verwenden. Der Normalfall nutzt die echte Speicher-Istleistung;
    // damit wird nicht mehr gegen einen alten Sollwert integriert.
    const lastWasSelf = (this._lastSource === 'eigenverbrauch');
    const lastBalanceW = getLastStorageBalanceTargetW();
    const lastWasPvBalance = (String(this._lastSource || '') === 'pv');
    const lastWasAnyBalance = lastWasSelf || lastWasPvBalance;
    const selfFeedForward = buildStorageFeedForward(desiredNvpW);
    const balance = this._buildActualAwareNvpBalance({
        rawNvpW: nvpRawW,
        fallbackNvpW: nvpCtrlW,
        nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
        targetNvpW: desiredNvpW,
        deadbandW,
        batteryPowerW: balanceBatteryPowerW,
        batteryMeasuredW: balanceBatteryMeasuredW,
        batteryAgeMs: balanceBatteryAgeMs,
        batteryPowerTrusted: balanceBatteryTrusted,
        batteryFeedbackSource: storageBalanceFeedback.source,
        batteryFeedbackHeld: storageBalanceFeedback.held,
        batteryFeedbackPredicted: storageBalanceFeedback.predicted,
        batteryFeedbackPredictionDeltaW: storageBalanceFeedback.predictionDeltaW,
        batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
        lastTargetW: lastBalanceW,
        lastTargetAllowed: lastWasAnyBalance,
            // Eigenverbrauchsoptimierung: 0 W ist ein expliziter STOP-Befehl. Wenn der
            // NVP im Zielband liegt, hat der zuletzt akzeptierte Lade-/Entladesollwert
            // genau den gewuenschten Zustand hergestellt und muss deshalb weiter aktiv
            // bleiben, statt durch eine neue 0-W-Vorgabe den Speicher abzuschalten.
            holdLastNonZeroInDeadband: true,
        maxDischargeCorrectionW: maxDelta,
        maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
        feedbackMaxAgeMs: balanceFeedbackHoldMs,
        nvpFeedbackMaxAgeMs: staleMs,
        feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
        feedbackRequireAligned: false,
        feedForwardUsable: selfFeedForward.usable === true,
        feedForwardTargetW: selfFeedForward.targetW,
        feedForwardExpectedActualW: selfFeedForward.expectedActualW,
        feedForwardPvW: selfFeedForward.pvW,
        feedForwardLoadW: selfFeedForward.loadW,
        feedForwardPvSource: selfFeedForward.pvSource,
        feedForwardLoadSource: selfFeedForward.loadSource,
        feedForwardReason: selfFeedForward.reason,
        feedForwardMeasurementSkewMs: selfFeedForward.measurementSkewMs,
        feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
        stepW,
    });
    const nonProtectedImportForStopW = Math.max(0, Number(nvpRawW) - evcsStorageProtectedLoadW);
    const previousOrActualDischargeW = Math.max(
        0,
        Number(lastBalanceW) || 0,
        Number(balance.baseW) || 0,
    );
    evcsProtectedDischargeStop = evcsStorageProtectedLoadW > 0
        && previousOrActualDischargeW > 0
        && nonProtectedImportForStopW <= (selfTargetGridW + deadbandW);
    if (evcsProtectedDischargeStop) {
        balance.targetW = 0;
        balance.rawTargetW = 0;
        balance.holdingLastCommand = false;
        balance.heldTargetW = 0;
        balance.mode = 'evcs-protection-explicit-stop';
    }
    storageNvpBalanceDiag = { ...balance, policy: 'eigenverbrauch' };
    storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || balance.rampManaged;

    // Ist-Batterieleistung nur dann fuer harte Caps verwenden, wenn sie auch fuer
    // das NVP-Balancing frisch und zeitlich plausibel war. Ein zwar "nicht stale",
    // aber mehrere Sekunden versetzter Wert darf die Anschluss-Caps nicht aufweiten.
    const battSignedRawW = balance.feedbackUsed ? Number(balance.baseW) : null;
    const battW = (typeof battSignedRawW === 'number') ? Math.max(0, battSignedRawW) : null;
    const battChargeW = (typeof battSignedRawW === 'number') ? Math.max(0, -battSignedRawW) : null;
    const nextSignedW = Number(balance.targetW) || 0;
    let nextSetW = Math.max(0, nextSignedW);

    // Safety-Clamp gegen Überschwingen:
    // WICHTIGER Feldfix 0.8.81: Der letzte eigene Sollwert und derived.loadTotalW
    // duerfen den Entlade-Cap nicht vergroessern; nur NVP plus echte Batterie-Istleistung
    // sind fuer die harte Anschluss-Sicherheit zulaessig.
    // Die Eigenverbrauchsoptimierung darf nur den aktuell am Netzpunkt sichtbaren
    // Restbedarf ausregeln. Der sichere Entlade-Cap ist deshalb: echter NVP-Import +
    // echte gemessene Batterie-Entladung + Puffer. Fuer die Laderichtung gilt analog:
    // laufende reale/zuletzt geschriebene Ladung + aktueller NVP-Export. Genau dieser
    // zweite Teil hat vorher gefehlt und fuehrte zu stabilen Rest-Exporten/-Importen
    // (z. B. 2,9 kW Ladung + 2,9 kW Export => neuer Sollwert muss ca. 5,8 kW Ladung sein).
    const importRawNowW = Math.max(0, (typeof nvpRawW === 'number') ? nvpRawW : 0);
    const measuredDischargeNowW = (typeof battW === 'number') ? Math.max(0, battW) : 0;
    const measuredChargeNowW = (typeof battChargeW === 'number') ? Math.max(0, battChargeW) : 0;
    const lastChargeNowW = (!balance.feedbackUsed && lastBalanceW < 0) ? Math.max(0, -lastBalanceW) : 0;
    const currentChargeForBalancingW = (typeof battChargeW === 'number') ? measuredChargeNowW : lastChargeNowW;
    const safetyMarginW = 200; // bewusst konservativ; Feintuning über selfTargetGridW/Deadband/Rampe
    const protectedSelfImportW = Math.max(0, importRawNowW - evcsStorageProtectedLoadW);
    const protectedSelfMarginW = protectedSelfImportW > 0 ? safetyMarginW : 0;
    const heldDischargeCommandW = balance.holdingLastCommand && nextSignedW > 0
        ? Math.max(0, nextSignedW)
        : 0;
    const feedForwardDischargeW = balance.feedForwardUsed && nextSignedW > 0
        ? Math.max(0, nextSignedW)
        : 0;
    const maxByDemandW = Math.max(
        0,
        protectedSelfImportW + measuredDischargeNowW + protectedSelfMarginW,
        heldDischargeCommandW,
        feedForwardDischargeW,
    );
    if (Number.isFinite(maxByDemandW) && maxByDemandW >= 0) {
        dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
            ? Math.min(dischargeDemandHardCapW, maxByDemandW)
            : maxByDemandW;
        dischargeDemandHardCapReason = (typeof battW === 'number')
            ? 'Eigenverbrauch-NVP-Demand-Cap (NVP+gemessene Batterie)'
            : 'Eigenverbrauch-NVP-Demand-Cap (konservativ ohne Batterie-Istleistung)';
        nextSetW = Math.min(nextSetW, maxByDemandW);
    }

    const heldChargeCommandW = balance.holdingLastCommand && nextSignedW < 0
        ? Math.max(0, -nextSignedW)
        : 0;
    const feedForwardChargeW = balance.feedForwardUsed && nextSignedW < 0
        ? Math.max(0, -nextSignedW)
        : 0;
    const chargeBalanceCapWBase = exportRawW > 0
        ? Math.max(0, currentChargeForBalancingW + exportRawW + desiredNvpW)
        : ((typeof battChargeW === 'number' && importRawNowW > desiredNvpW)
            ? Math.max(0, currentChargeForBalancingW)
            : 0);
    const chargeBalanceCapW = Math.max(chargeBalanceCapWBase, heldChargeCommandW, feedForwardChargeW);
    if (nextSignedW < 0) {
        chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number')
            ? Math.min(chargeDemandHardCapW, chargeBalanceCapW)
            : chargeBalanceCapW;
        chargeDemandHardCapReason = (typeof battChargeW === 'number')
            ? 'Eigenverbrauch-NVP-Lade-Cap (aktuelle Ladung+NVP-Export/Import-Reduktion)'
            : 'Eigenverbrauch-NVP-Lade-Cap (letzter Ladesollwert nur bei aktuellem Export)';
    }

    // Positive Werte in diesem Pfad sind Entladung; negative Werte reduzieren/erhoehen
    // laufende PV-Beladung. Beides bleibt NVP-gefuehrt und wird weiter unten gerampt.
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
    const importNowW = Math.max(0, Number.isFinite(Number(balance.nvpW)) ? Number(balance.nvpW) : 0);
    const startCond = (importNowW >= deadbandW) || lastWasSelf;

    if (allow && nextSignedW < 0) {
        const maxChargeBySocW = (typeof soc === 'number' && soc >= selfMaxSoc) ? 0 : selfMaxChargeEff;
        const chargeW = clamp(Math.abs(nextSignedW), 0, Math.min(maxChargeBySocW, chargeBalanceCapW));
        hardChargeMaxSoc = Math.max(hardChargeMaxSoc, selfMaxSoc);
        if (chargeW > 0) {
            targetW = -chargeW;
            reason = `Eigenverbrauch: NVP-Balancing laden (${Math.round(chargeW)} W, Ist ${Math.round(Number(balance.baseW) || 0)} W, Differenz ${Math.round(Number(balance.nvpErrorW) || 0)} W)`;
            source = 'pv';
        } else if ((source === 'idle' || reason === 'Keine Aktion') && Math.abs(nextSignedW) > 0) {
            reason = (typeof soc === 'number' && soc >= selfMaxSoc)
                ? `Eigenverbrauch: Laden blockiert (SoC >= ${selfMaxSoc}%)`
                : 'Eigenverbrauch: keine NVP-Ladefreigabe';
            source = 'pv';
        }
    } else if (allow && startCond && nextSetW > 0) {
        targetW = nextSetW;
            reason = `Eigenverbrauch: NVP-Balancing entladen (${Math.round(targetW)} W, Ist ${Math.round(Number(balance.baseW) || 0)} W, Differenz ${Math.round(Number(balance.nvpErrorW) || 0)} W)`;
        source = 'eigenverbrauch';
        hardDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
    }
    }
}

// 4) Eigenverbrauch: PV-Überschuss laden (wenn keine Lastspitze/Tarif/EV-Entladung aktiv)
        if (targetW === 0 && cfg.pvEnabled !== false && !feneconAcMode) {
            // Zero-Export (Nulleinspeisung): bei Export möglichst früh (Schwellwert) in den Speicher laden.
            // Hinweis: Extra-Bias nur, wenn Netzladen erlaubt ist (sonst würde der Bias u.U. Netzenergie in den Speicher ziehen).
            const zeCfg = (this.adapter.config && this.adapter.config.enableGridConstraints) ? (this.adapter.config.gridConstraints || {}) : {};
            const zeEnabled = !!((this.adapter.config && this.adapter.config.enableGridConstraints) && zeCfg.zeroExportEnabled);
            const zeDeadband = Math.max(0, num(zeCfg.zeroExportDeadbandW, 50));
            const zeBias = Math.max(0, num(zeCfg.zeroExportBiasW, 80));

            const thrBase = Math.max(0, num(cfg.pvExportThresholdW, 200));
            const thr = zeEnabled ? Math.min(thrBase, zeDeadband) : thrBase;

            // Max-SoC für Laden: größter Bereich (Self/LSK/Reserve-Ziel)
            const lskMaxSocForCharge = lskChargeEnabledCfg ? lskMaxSoc : selfMaxSoc;
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

            const pvChargeWouldBeActive = exportRawW >= thr && canChargeBySoc && chargeLimitW > 0;
            if (pvChargeWouldBeActive && evPriorityBlockStorageCharge) {
                targetW = 0;
                // Lade-Cap 0.8.80: Wenn EV-Priorität den Speicher blockiert, darf ein
                // alter PV-Ladesollwert nicht durch die Rampe weiterlaufen.
                chargeDemandHardCapW = 0;
                chargeDemandHardCapReason = 'EV-Priorität-Lade-Cap';
                reason = evPriorityStarvedW > 0
                    ? `EV-Priorität: PV zuerst an Ladepunkte (${Math.round(evPriorityStarvedW)} W offen)`
                    : 'EV-Priorität: PV zuerst an Ladepunkte';
                source = 'pv';
            } else if (pvChargeWouldBeActive) {
                // Für die eigentliche Sollwert-Berechnung nutzen wir den geglätteten Export,
                // damit die Ladeleistung bei wolkigem Himmel nicht "zittert".
                const exportCtrlW = (typeof exportW === 'number') ? exportW : exportRawW;
                const extraBias = (zeEnabled && gridChargeAllowed) ? zeBias : 0;
                // Der harte Sicherheits-Cap nutzt bewusst den RAW-Export am NVP.
                // Wenn der Export in diesem Tick wegbricht, wird nach der Rampe sofort
                // auf diesen Rohwert begrenzt und nicht erst langsam heruntergefahren.
                // Feldschutz 0.8.81: Der geglättete Export darf nur als ruhiger
                // Regelwunsch dienen. Die aktuelle RAW-Messung bleibt die harte
                // Obergrenze, damit ein alter PV-Ladesollwert bei Netzbezug nicht
                // weiterläuft. Der Zero-Export-Bias wird nur addiert, solange RAW
                // tatsächlich Export zeigt; bei RAW=0/Import darf er keinen Netzbezug
                // in die Batterie ziehen.
                const lastBalanceWForCharge = getLastStorageBalanceTargetW();
                const pvTargetNvpW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW + extraBias;
                const pvFeedForward = buildStorageFeedForward(pvTargetNvpW);
                const pvBalance = this._buildActualAwareNvpBalance({
                    rawNvpW: nvpRawW,
                    fallbackNvpW: (typeof selfNvpStabilizer.controlW === 'number') ? selfNvpStabilizer.controlW : nvpRawW,
                    nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
                    // Der Zero-Export-Bias wird als etwas hoeherer Zielbezug abgebildet.
                    // Dadurch entsteht mathematisch derselbe Ladeaufschlag, aber in
                    // derselben Istleistung-plus-NVP-Differenz-Regelung wie beim Entladen.
                    targetNvpW: pvTargetNvpW,
                    deadbandW: selfImportThresholdW,
                    batteryPowerW: balanceBatteryPowerW,
                    batteryMeasuredW: balanceBatteryMeasuredW,
                    batteryAgeMs: balanceBatteryAgeMs,
                    batteryPowerTrusted: balanceBatteryTrusted,
                    batteryFeedbackSource: storageBalanceFeedback.source,
                    batteryFeedbackHeld: storageBalanceFeedback.held,
                    batteryFeedbackPredicted: storageBalanceFeedback.predicted,
                    batteryFeedbackPredictionDeltaW: storageBalanceFeedback.predictionDeltaW,
                    batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
                    lastTargetW: lastBalanceWForCharge,
                    lastTargetAllowed: isStorageBalanceSource(this._lastSource),
                    // Auch im separaten PV-Ladepfad darf das Erreichen des NVP-Ziels
                    // nicht als Stop interpretiert werden. Der letzte nicht-null Sollwert
                    // bleibt aktiv, bis eine echte NVP-Abweichung oder Schutzgrenze eine
                    // Korrektur bzw. einen ausdruecklichen Stop verlangt.
                    holdLastNonZeroInDeadband: true,
                    maxDischargeCorrectionW: maxDelta,
                    maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
                    feedbackMaxAgeMs: balanceFeedbackHoldMs,
                    nvpFeedbackMaxAgeMs: staleMs,
                    feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
                    feedbackRequireAligned: false,
                    feedForwardUsable: pvFeedForward.usable === true,
                    feedForwardTargetW: pvFeedForward.targetW,
                    feedForwardExpectedActualW: pvFeedForward.expectedActualW,
                    feedForwardPvW: pvFeedForward.pvW,
                    feedForwardLoadW: pvFeedForward.loadW,
                    feedForwardPvSource: pvFeedForward.pvSource,
                    feedForwardLoadSource: pvFeedForward.loadSource,
                    feedForwardReason: pvFeedForward.reason,
                    feedForwardMeasurementSkewMs: pvFeedForward.measurementSkewMs,
                    feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
                    stepW,
                });
                storageNvpBalanceDiag = { ...pvBalance, policy: 'pv' };
                storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || pvBalance.rampManaged;

                const measuredChargeNowW = pvBalance.feedbackUsed
                    ? Math.max(0, -Number(pvBalance.baseW || 0))
                    : 0;
                const lastChargeNowW = (!pvBalance.feedbackUsed && lastBalanceWForCharge < 0)
                    ? Math.max(0, -lastBalanceWForCharge)
                    : 0;
                const currentChargeForBalancingW = pvBalance.feedbackUsed ? measuredChargeNowW : lastChargeNowW;

                // Der Balancing-Helfer liefert bereits "Istleistung + Differenz".
                // Der RAW-Cap bleibt als harte Anschlussgrenze bestehen, damit ein
                // alter Ladesollwert bei wegfallendem Export nicht nachlaufen kann.
                const requestedChargeW = Math.max(0, -Number(pvBalance.targetW || 0));
                const pvTargetImportW = selfTargetGridW + evcsStorageProtectedNvpTargetShiftW + extraBias;
                const exportCtrlCapW = Math.max(0, currentChargeForBalancingW + exportCtrlW + pvTargetImportW);
                const exportRawCapW = exportRawW > 0
                    ? Math.max(0, currentChargeForBalancingW + exportRawW + pvTargetImportW)
                    : currentChargeForBalancingW;
                const pvRawChargeCapW = clamp(Math.min(requestedChargeW, exportCtrlCapW, exportRawCapW), 0, chargeLimitW);
                chargeDemandHardCapW = pvRawChargeCapW;
                chargeDemandHardCapReason = zeEnabled ? 'Nulleinspeisung-NVP-Lade-Cap (aktuelle Ladung+Export)' : 'PV-NVP-Lade-Cap (aktuelle Ladung+Export)';
                targetW = -pvRawChargeCapW;
                reason = zeEnabled
                    ? `Nulleinspeisung: Ist ${Math.round(Number(pvBalance.baseW) || 0)} W plus NVP-Differenz ${Math.round(Number(pvBalance.nvpErrorW) || 0)} W`
                    : `Eigenverbrauch PV-Laden: Ist ${Math.round(Number(pvBalance.baseW) || 0)} W plus NVP-Differenz ${Math.round(Number(pvBalance.nvpErrorW) || 0)} W`;
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

                // Lade-Cap 0.8.80: Die Reserve-Nachladung darf nach der Rampe nie
                // stärker bleiben als der aktuelle Headroom-/Reserve-Wunsch.
                chargeDemandHardCapW = Math.max(0, wantW);
                chargeDemandHardCapReason = 'Notstrom-Reserve-Lade-Cap';

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
            lskChargeEnabledCfg &&
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

                // Lade-Cap 0.8.80: Auch LSK-Refill darf nach der Rampe nicht über dem
                // aktuellen Peak-/Import-Headroom weiterlaufen.
                chargeDemandHardCapW = Math.max(0, wantW);
                chargeDemandHardCapReason = 'LSK-Refill-Lade-Cap';

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
            lskChargeEnabledCfg &&
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
        // Zentrale PV-Ueberschuss-Verteilung
        // ------------------------------------------------------------
        // Das Lademanagement laeuft vor diesem Modul und reserviert nur den PV-Anteil,
        // den PV-/Min+PV-Wallboxen nach der Kundeneinstellung wirklich nutzen duerfen.
        // Der Speicher bekommt anschliessend das noch freie PV-Budget. Dadurch koennen
        // Speicher und E-Mobilitaet denselben physikalischen PV-Ueberschuss nicht doppelt
        // verplanen. Tarif-/Reserve-Netzladen bleibt davon bewusst unberuehrt.
        try {
            centralPvBudgetRuntime = this.adapter && this.adapter._emsBudget;
            centralPvAllocationGate = centralPvBudgetRuntime
                && centralPvBudgetRuntime.gates
                && centralPvBudgetRuntime.gates.pvAllocation
                ? centralPvBudgetRuntime.gates.pvAllocation
                : null;
            pvBudgetAllocationMode = centralPvAllocationGate ? String(centralPvAllocationGate.mode || '') : '';
            pvBudgetRemainingBeforeStorageW = resolveStoragePvBudgetW(
                centralPvBudgetRuntime,
                centralPvAllocationGate,
                0,
            );
            pvBudgetStorageAvailableW = pvBudgetRemainingBeforeStorageW;

            if (centralPvBudgetRuntime && isCentralPvChargeSource(source, targetW) && !sungrowHybridActive) {
                // Generic/FENECON-Pfade koennen hier bereits begrenzt werden. Sungrow
                // berechnet seinen geschlossenen NVP-Sollwert erst weiter unten neu;
                // ein Vorab-Cap (insbesondere 0 W) wuerde sonst als scheinbarer
                // Schutzstopp in den Herstellerpfad getragen. Fuer Sungrow ist daher
                // ausschliesslich der finale Cap nach der Herstellerberechnung autoritativ.
                const pvCapW = pvBudgetStorageAvailableW;
                if (Math.abs(targetW) > pvCapW) {
                    targetW = -pvCapW;
                    reason = `${reason} (zentrales PV-Restbudget ${Math.round(pvCapW)} W)`;
                }
                chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                    ? Math.min(chargeDemandHardCapW, pvCapW)
                    : pvCapW;
                chargeDemandHardCapReason = 'Zentrales PV-Restbudget nach E-Mobilitaet';
            }
        } catch {
            // Fehlt die zentrale Budget-Runtime, bleibt die bisherige lokale
            // Speicherregelung als Rueckfall erhalten.
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

        // Anti-Flattern um 0 W
        // Ziel: Kleine Messwertschwingungen unterhalb der wirksamen Aufloesung
        // unterdruecken. Ein echter Richtungswechsel wird dagegen ohne 0-W-
        // Zwischenrunde direkt an Einzel-Speicher oder Speicherfarm weitergegeben.
        {
            // WICHTIG: Die Peak-Shaving-Hysterese darf nicht pauschal als Zero-Band
            // fuer alle Speicher-Policies wirken. Sonst wuerden kleine, aber reale
            // Eigenverbrauchs-Sollwerte ungewollt als Wartezustand auf 0 W gesetzt.
            const psRelevant = (source === 'lastspitze' || source === 'lastspitze_refill');
            const psHystW = psRelevant ? Math.max(0, num(psCfg.hysteresisW, 0)) : 0;
            const isNvpBalancing = !!(
                targetW !== 0
                && (
                    (storageNvpBalanceDiag && storageNvpBalanceDiag.active === true)
                    || source === 'eigenverbrauch'
                    || source === 'pv'
                    || source === 'tarif'
                    || source === 'fenecon'
                    || source === 'fenecon-assist'
                    || source === 'sungrow-hybrid'
                    || source === 'sungrow-assist'
                )
            );
            const zeroBandW = isNvpBalancing
                ? Math.max(psHystW, 20)
                : Math.max(psHystW, stepW, 100);

            // Lastspitzenkappung ist eine Sicherheitsfunktion und darf nicht von
            // einem allgemeinen Kleinsignal-Deadband blockiert werden.
            const emergencyDischarge = (source === 'lastspitze') && (targetW > 0);

            if (!emergencyDischarge) {
                // Ein im NVP-Zielband bewusst gehaltener Lade-/Entladesollwert darf
                // nicht durch das allgemeine Anti-Flatter-Deadband auf 0 W fallen.
                const heldTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.heldTargetW))
                    ? Number(storageNvpBalanceDiag.heldTargetW)
                    : 0;
                const preserveHeldNvpCommand = !!(
                    storageNvpBalanceDiag
                    && (
                        storageNvpBalanceDiag.holdingLastCommand === true
                        || storageNvpBalanceDiag.feedForwardUsed === true
                    )
                    && targetW !== 0
                    && (
                        (heldTargetW !== 0 && Math.sign(targetW) === Math.sign(heldTargetW))
                        || storageNvpBalanceDiag.feedForwardUsed === true
                    )
                );

                // Nur ein wirklich kleiner neuer Sollwert wird als bewusster
                // Wartezustand auf 0 W gesetzt. Vorzeichenwechsel oberhalb dieses
                // Bands bleiben unveraendert und werden im selben Tick geschrieben.
                if (!preserveHeldNvpCommand && Math.abs(targetW) < zeroBandW) {
                    targetW = 0;
                    if (source && source !== 'idle') {
                        reason = `${reason || 'Regelung'} (Warten: Deadband < ${Math.round(zeroBandW)} W)`;
                        source = 'idle';
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
    const directDirectionChange = _prevRampW !== 0
        && targetW !== 0
        && Math.sign(_prevRampW) !== Math.sign(targetW);

    // Verbindliche EMS-Regel: Bei einem Lade-/Entlade-Richtungswechsel wird der
    // neue Sollwert im selben Tick direkt ausgegeben. Die Speichersysteme fuehren
    // ihren internen Stopp selbst aus. Weder die allgemeine Rampe noch eine
    // herstellerspezifische Rampe darf eine 0-W-Zwischenrunde oder ein Weiterfahren
    // in der alten Richtung erzeugen. Nachgelagerte SoC-, Budget- und Safety-Caps
    // bleiben voll wirksam.
    if (directDirectionChange) {
        // Bewusst keine Rampenbegrenzung.
    // Istleistungsbasiertes NVP-Balancing hat seine Korrektur bereits relativ zur
    // realen Batterie-Leistung begrenzt. Eine zweite Rampe gegen den alten Sollwert
    // wuerde die physikalische Basis wieder verfälschen und ist genau die Ursache
    // fuer wechselnde Sollwerte bei zeitversetzten Speicherreaktionen.
    } else if (storageNvpBalanceRampManaged) {
        // Keine zweite Rampe. Sicherheits-Caps und SoC-Grenzen folgen weiterhin.
    // Lade-Sicherheitsrücknahme: Wenn ein Speicher im letzten Tick geladen hat
    // (negativer Sollwert) und die aktuelle Policy weniger laden oder auf 0 gehen will,
    // darf die Standardrampe den alten Lade-Sollwert nicht künstlich halten.
    // Das ist sicherheitsrelevant für PV-Wolken, wegfallenden Netz-Headroom und EV-Priorität.
    } else if (_prevRampW < 0 && targetW >= _prevRampW) {
        // Weniger laden / Richtung 0 -> bewusst ohne Rampe.
    } else if (source === 'pv' && targetW < 0) {
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
    } else if (source === 'fenecon' || source === 'fenecon-assist' || source === 'sungrow-assist' || this._lastSource === 'fenecon' || this._lastSource === 'fenecon-assist' || this._lastSource === 'sungrow-assist') {
        // Gateway AC-Lastfolger: Lastsprünge müssen in beide Richtungen schnell übernommen werden,
        // sonst bleibt kurz Netzbezug stehen oder es entsteht beim Lastabwurf unnötige Einspeisung.
        // Deshalb hier bewusst keine zusätzliche Rampe.
    } else {
        // Standard: symmetrische Rampe
        if (maxDelta > 0 && Math.abs(d) > maxDelta) {
            targetW = _prevRampW + Math.sign(d) * maxDelta;
            reason = `${reason} (Rampenbegrenzung)`;
        }
    }
}

        const _rampW = targetW;

        // Harte Lade-Cap NACH der Rampenbegrenzung.
        // Der Entlade-Feldfix aus 0.8.79 braucht die gleiche Absicherung für negative
        // Ladesollwerte: Wenn die aktuelle Policy 0 W oder weniger Ladeleistung fordert,
        // darf ein alter Lade-Sollwert nicht langsam über die Standardrampe auslaufen.
        if (targetW < 0 || (_prevRampW < 0 && _reqW >= 0)) {
            let capW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                ? Math.max(0, chargeDemandHardCapW)
                : null;
            const preVendorSource = String(_reqQuelle || source || '').trim().toLowerCase();
            const nvpBalancerMayRecalculateCharge = !!(
                storageNvpBalanceDiag
                || isStorageBalanceSource(preVendorSource)
                || isStorageBalanceSource(this._lastSource)
                || sungrowHybridActive
            );
            const deferEmptyChargeRequestToNvpBalancer = _reqW >= 0
                && nvpBalancerMayRecalculateCharge
                && capW === null;

            if (_reqW >= 0 && !deferEmptyChargeRequestToNvpBalancer) {
                // Keine aktuelle Ladeanforderung: 0 W stoppt die Laderichtung sofort.
                // Ausnahme aller geschlossenen NVP-Regelpfade: Deren finaler Sollwert
                // kann nach diesem Dispatcher-Schritt aus Istleistung + NVP-Differenz
                // entstehen. Ein vorlaeufiger 0-W-Request darf deshalb nicht als
                // harter Lade-Cap in den Hersteller-/Farm-/Generic-Pfad getragen werden.
                capW = 0;
                if (!chargeDemandHardCapReason) chargeDemandHardCapReason = 'Keine aktuelle Ladeanforderung';
            } else if (capW === null && _reqW < 0) {
                // Fallback: Aktueller Policy-Wunsch ist die Obergrenze. Dadurch kann die
                // Rampe einen alten höheren Ladesollwert nicht über den neuen Wunsch ziehen.
                capW = Math.max(0, -_reqW);
                chargeDemandHardCapReason = 'Aktuelle Ladeanforderung-Cap';
            }
            if (typeof capW === 'number' && targetW < -capW) {
                targetW = -capW;
                reason = `${reason} (Lade-Cap ${Math.round(capW)} W nach Rampe)`;
            }
        }
        await this._setIfChanged('speicher.regelung.chargeDemandCapW',
            (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW)) ? Math.round(chargeDemandHardCapW) : 0);
        await this._setIfChanged('speicher.regelung.chargeDemandCapReason', String(chargeDemandHardCapReason || ''));

        // Harte Demand-Cap NACH der Rampenbegrenzung.
        // Der vorherige Code konnte einen korrekt auf ca. Netzbezug begrenzten Sollwert
        // durch die Rampe wieder in Richtung altem, zu hohem Sollwert ziehen. Beispiel aus
        // dem Feld: 2,2 kW Netzbezug, alter Sollwert >10 kW => Rampe schrieb weiterhin
        // >10 kW. Dieser Cap ist bewusst nach der Rampe platziert und gilt nur für
        // NVP-basierte Entladequellen.
        if (targetW > 0 && typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW)) {
            const capW = Math.max(0, dischargeDemandHardCapW);
            const activeNvpDischargeSource = (source === 'eigenverbrauch' || source === 'tarif' || source === 'fenecon' || source === 'fenecon-assist' || source === 'sungrow-assist' || source === 'lastspitze');
            if (activeNvpDischargeSource && targetW > capW) {
                targetW = capW;
                reason = `${reason} (Demand-Cap ${Math.round(capW)} W nach Rampe)`;
            }
        }
        await this._setIfChanged('speicher.regelung.dischargeDemandCapW',
            (typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW)) ? Math.round(dischargeDemandHardCapW) : 0);
        await this._setIfChanged('speicher.regelung.dischargeDemandCapReason', String(dischargeDemandHardCapReason || ''));

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
        // Hybrid-/Gateway-Priorität-Policy (Single-Speicher, keine Farm)
        // ------------------------------------------------------------
        // Vor der Hersteller-Neuberechnung wird festgehalten, ob der allgemeine
        // Speicherpfad bereits einen echten Stop angeordnet hat. Sungrow darf einen
        // solchen Schutzstopp nicht mit einem neuen NVP-Sollwert ueberschreiben und
        // die nachgelagerte 0-W-Firewall darf ihn nicht als vermeintlichen Leerlauf
        // in No-Write umwandeln. Reine Zwischen-/Leerlauf-0-Werte bleiben hiervon
        // bewusst ausgenommen.
        const lastCommandBeforeVendorW = Number.isFinite(Number(this._lastTargetW))
            ? Number(this._lastTargetW)
            : 0;
        const stopReasonText = String(reason || '').toLowerCase();
        const chargeCapReasonText = String(chargeDemandHardCapReason || '').toLowerCase();
        const transientChargeCap = isDeferredSungrowChargeCapReason(chargeDemandHardCapReason)
            || chargeCapReasonText.includes('keine aktuelle ladeanforderung')
            || chargeCapReasonText.includes('zentrales pv-restbudget')
            || chargeCapReasonText.includes('finales zentrales pv-restbudget');
        const chargeDirectionStopped = lastCommandBeforeVendorW < 0
            && typeof chargeDemandHardCapW === 'number'
            && Number.isFinite(chargeDemandHardCapW)
            && chargeDemandHardCapW <= 0
            && !transientChargeCap;
        const dischargeDirectionStopped = lastCommandBeforeVendorW > 0
            && typeof dischargeDemandHardCapW === 'number'
            && Number.isFinite(dischargeDemandHardCapW)
            && dischargeDemandHardCapW <= 0;
        const sungrowUpstreamExplicitStop = targetW === 0 && !!(
            reserveActive
            || chargeDirectionStopped
            || dischargeDirectionStopped
            || stopReasonText.includes('soc <=')
            || stopReasonText.includes('soc >=')
            || stopReasonText.includes('blockiert')
            || stopReasonText.includes('gesperrt')
            || stopReasonText.includes('sicherer 0-w')
        );

        const feneconNoWrite = false; // Legacy-Diagnosefeld; produktiver FENECON-Pfad schreibt immer.
        let feneconWriteMode = '';
        let sungrowWriteMode = '';
        let sungrowNoWrite = false;
        let storageZeroNoWrite = false;
        let storageZeroWriteStatus = '';
        let storageZeroWriteReason = '';
        let sungrowDiagPayload = null;
        // Herstellerprofile duerfen die technische Schreibweise aendern, aber
        // nicht die Herkunft des Budgets verschleiern. Fuer den finalen zentralen
        // PV-/Gesamt-Cap bleibt deshalb die Policy-Quelle vor dem Herstellerpfad
        // erhalten.
        const policySourceBeforeVendor = String(source || '');
        if (feneconHybridActive) {
            const ctx = feneconHybridCtx || {};
            const mode = String(ctx.mode || '');

            if (mode === 'fems-pass-through' || mode === 'fems-assist') {
                // FENECON/OpenEMS/FEMS darf die fachliche Zielbildung beeinflussen, aber
                // den manuell im AppCenter zugeordneten Batterie-Sollwert nicht mehr auf
                // No-Write setzen. Der finale, bereits durch NVP-, SoC-, Budget- und
                // Sicherheits-Gates begrenzte Sollwert wird in jedem EMS-Tick erneuert.
                const srcNorm = String(source || '').toLowerCase();
                const isCriticalExternalRequest = targetW !== 0 && (
                    srcNorm === 'lastspitze' ||
                    srcNorm === 'lastspitze_refill' ||
                    srcNorm === 'reserve' ||
                    srcNorm === 'tarif' ||
                    srcNorm === 'evcs'
                );
                const isAssistRequest = !!(mode === 'fems-assist' && targetW > 0 && (srcNorm === 'eigenverbrauch' || srcNorm === 'tarif'));

                if (isCriticalExternalRequest) {
                    feneconWriteMode = 'write-critical-policy';
                    reason = String(reason || 'externe Speicheranforderung') + ' · FENECON/OpenEMS: zentral gegatete Vorgabe wird zyklisch geschrieben';
                } else if (isAssistRequest) {
                    // Assist immer am aktuellen NVP-Bedarf begrenzen. Wir geben nicht die
                    // Gebaeudelast an FENECON weiter, weil am Hybrid-AC-Ausgang PV und Batterie
                    // zusammenliegen koennen. Fuehrungsgroesse bleibt nur der verbleibende
                    // Netzbezug plus kleiner Puffer.
                    const nvpNowW = (typeof ctx.nvpW === 'number' && Number.isFinite(ctx.nvpW)) ? Number(ctx.nvpW) : ((typeof gridRawW === 'number') ? Number(gridRawW) : Number(gridW || 0));
                    const targetImportW = Math.max(0, num(cfg.feneconAssistTargetGridImportW, selfTargetGridW));
                    const assistBufferW = Math.max(0, num(cfg.feneconAssistBufferW, 150));
                    const assistCapW = Math.max(0, Math.max(0, nvpNowW) - targetImportW + assistBufferW);
                    targetW = Math.min(Math.max(0, targetW), assistCapW);
                    source = 'fenecon-assist';
                    if (targetW > 0) {
                        reason = `FENECON/OpenEMS Assist: Entladung ${Math.round(targetW)} W gegen dauerhaften Netzbezug (NVP ${Math.round(nvpNowW)} W)`;
                        feneconWriteMode = 'write-assist-on-demand';
                    } else {
                        reason = 'FENECON/OpenEMS Assist: NVP-Cap 0 W – externer 0-W-Stop wird zyklisch bestätigt';
                        feneconWriteMode = 'write-assist-zero';
                    }
                } else {
                    feneconWriteMode = 'write-appcenter-gated';
                    reason = String(reason || ctx.reason || 'FENECON/OpenEMS: zentraler Speicher-Sollwert') + ' · AppCenter-Ziel aktiv, sekündlicher Watchdog-Refresh';
                }
            } else if (mode === 'external-pv-charge-only') {
                // Zusatz-PV bleibt als fachlicher Lade-Cap erhalten. Andere zentrale
                // Policies werden nicht mehr durch einen Hersteller-No-Write verschluckt,
                // sondern ebenfalls über den manuell zugeordneten Ziel-DP ausgegeben.
                if (targetW < 0 && source === 'pv') {
                    const extraCapW = Math.max(0, Number(ctx.additionalPvW) || 0);
                    const absTarget = Math.abs(targetW);
                    if (extraCapW > 0) targetW = -Math.min(absTarget, extraCapW);
                    reason = String(reason || 'PV-Überschuss laden') + ' · Gateway Zusatz-PV (' + Math.round(extraCapW) + ' W)';
                    source = 'fenecon-extra-pv';
                    feneconWriteMode = 'write-extra-pv-charge';
                } else {
                    feneconWriteMode = 'write-appcenter-gated';
                    reason = String(reason || ctx.reason || 'FENECON/OpenEMS: zentraler Speicher-Sollwert') + ' · AppCenter-Ziel aktiv, sekündlicher Watchdog-Refresh';
                }
            } else if (mode === 'external-control-low-pv') {
                feneconWriteMode = 'write-low-pv';
            } else {
                feneconWriteMode = 'write-appcenter-gated';
            }

            await this._setFeneconHybridDiag({
                active: true,
                mode: mode || 'external-control-low-pv',
                reason,
                writeMode: feneconWriteMode || 'write-appcenter-gated',
                targetW,
                pvW: ctx.pvW,
                additionalPvW: ctx.additionalPvW,
                thresholdW: ctx.thresholdW,
                additionalThresholdW: ctx.additionalThresholdW,
                nvpW: (typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? gridRawW : gridW,
                forecastW: ctx.forecastW,
                forecastSource: ctx.forecastSource,
                dayOrPvActive: ctx.dayOrPvActive,
                assistActive: ctx.assistActive,
                assistImportThresholdW: ctx.assistImportThresholdW,
            });
        }

        // ------------------------------------------------------------
        // Sungrow Hybrid ESS Herstellerprofil
        // ------------------------------------------------------------
        if (sungrowHybridActive) {
            const ctx = sungrowHybridCtx || {};
            const srcNorm = String(source || '').toLowerCase();
            const targetImportW = Math.max(0, num(cfg.sungrowTargetGridImportW, selfTargetGridW) + evcsStorageProtectedNvpTargetShiftW);
            const assistBufferW = Math.max(0, num(cfg.sungrowAssistBufferW, 150));
            const nvpDeadbandW = Math.max(0, Number(ctx.dischargeThresholdW) || selfImportThresholdW || 100);
            const nvpNowW = (typeof ctx.nvpW === 'number' && Number.isFinite(ctx.nvpW))
                ? Number(ctx.nvpW)
                : ((typeof gridRawW === 'number' && Number.isFinite(gridRawW)) ? Number(gridRawW) : Number(gridW || 0));
            const importNowW = Math.max(0, nvpNowW);
            const exportNowW = Math.max(0, -nvpNowW);
            const isStorageSelfOrPv = srcNorm === 'eigenverbrauch'
                || srcNorm === 'pv'
                || srcNorm === 'idle'
                || srcNorm === 'sungrow-hybrid'
                || srcNorm === 'sungrow-assist';
            const isCriticalPolicy = targetW !== 0 && (
                srcNorm === 'lastspitze'
                || srcNorm === 'lastspitze_refill'
                || srcNorm === 'reserve'
                || srcNorm === 'tarif'
                || srcNorm === 'evcs'
            );

            // Sungrow nutzt denselben geschlossenen Regelkreis wie alle anderen
            // Speicherprofile. Alte Sonderzweige, die bei PV-Deckung, kleinem Import
            // oder erreichtem NVP-Ziel zyklisch 0 W geschrieben haben, sind bewusst
            // entfernt. 0 W bleibt ausschliesslich ein echter Stop-/Wartebefehl,
            // z. B. bei SoC-Grenze oder fehlender NVP-Messung. Richtungswechsel
            // werden ohne Zwischenstopp direkt an den Speicher geschrieben.
            const nvpControlForBalanceW = (selfNvpStabilizer && typeof selfNvpStabilizer.controlW === 'number' && Number.isFinite(selfNvpStabilizer.controlW))
                ? Number(selfNvpStabilizer.controlW)
                : nvpNowW;
            const lastSungrowBalanceW = getLastStorageBalanceTargetW();
            const sungrowFeedForward = buildStorageFeedForward(targetImportW);
            const sungrowBalance = this._buildActualAwareNvpBalance({
                rawNvpW: nvpNowW,
                fallbackNvpW: nvpControlForBalanceW,
                nvpAgeMs: (typeof gridRawAge === 'number') ? gridRawAge : gridAge,
                targetNvpW: targetImportW,
                deadbandW: nvpDeadbandW,
                batteryPowerW: balanceBatteryPowerW,
                batteryMeasuredW: balanceBatteryMeasuredW,
                batteryAgeMs: balanceBatteryAgeMs,
                batteryPowerTrusted: balanceBatteryTrusted,
                batteryFeedbackSource: storageBalanceFeedback.source,
                batteryFeedbackHeld: storageBalanceFeedback.held,
                batteryFeedbackPredicted: storageBalanceFeedback.predicted,
                batteryFeedbackPredictionDeltaW: storageBalanceFeedback.predictionDeltaW,
                batteryFeedbackHoldAgeMs: balanceFeedbackHoldMs,
                lastTargetW: lastSungrowBalanceW,
                lastTargetAllowed: isStorageBalanceSource(this._lastSource),
                holdLastNonZeroInDeadband: true,
                maxDischargeCorrectionW: maxDelta,
                maxChargeCorrectionW: pvMaxDeltaCfg > 0 ? pvMaxDeltaCfg : maxDelta,
                feedbackMaxAgeMs: balanceFeedbackHoldMs,
                nvpFeedbackMaxAgeMs: staleMs,
                feedbackMaxSkewMs: Math.max(0, num(cfg.balanceFeedbackMaxSkewMs, 5000)),
                feedbackRequireAligned: false,
                feedForwardUsable: sungrowFeedForward.usable === true,
                feedForwardTargetW: sungrowFeedForward.targetW,
                feedForwardExpectedActualW: sungrowFeedForward.expectedActualW,
                feedForwardPvW: sungrowFeedForward.pvW,
                feedForwardLoadW: sungrowFeedForward.loadW,
                feedForwardPvSource: sungrowFeedForward.pvSource,
                feedForwardLoadSource: sungrowFeedForward.loadSource,
                feedForwardReason: sungrowFeedForward.reason,
                feedForwardMeasurementSkewMs: sungrowFeedForward.measurementSkewMs,
                feedForwardPlausibilityW: balanceFeedForwardPlausibilityW,
                stepW,
            });

            sungrowWriteMode = 'standard-policy';
            if (sungrowUpstreamExplicitStop) {
                // SoC-, Reserve- und Demand-Cap-Stopps kommen aus der gemeinsamen
                // Grundlogik und bleiben fuer Sungrow verbindlich.
                // Dieser Modus beginnt absichtlich mit `write-stop-`, damit die
                // finale 0-W-Firewall ihn als legitimen Stop erkennt.
                sungrowWriteMode = 'write-stop-upstream-safety';
                reason = String(reason || 'Sungrow Hybrid ESS: gemeinsamer Speicher-Schutzstopp');
            } else if (isStorageSelfOrPv && !isCriticalPolicy) {
                storageNvpBalanceDiag = { ...sungrowBalance, policy: 'sungrow-hybrid' };
                storageNvpBalanceRampManaged = storageNvpBalanceRampManaged || sungrowBalance.rampManaged;

                const balancedTargetW = Number(sungrowBalance.targetW) || 0;
                const currentDischargeW = sungrowBalance.feedbackUsed
                    ? Math.max(0, Number(sungrowBalance.baseW) || 0)
                    : 0;
                const currentChargeW = sungrowBalance.feedbackUsed
                    ? Math.max(0, -Number(sungrowBalance.baseW || 0))
                    : 0;
                const heldDischargeW = sungrowBalance.holdingLastCommand && balancedTargetW > 0
                    ? Math.max(0, balancedTargetW)
                    : 0;
                const heldChargeW = sungrowBalance.holdingLastCommand && balancedTargetW < 0
                    ? Math.max(0, -balancedTargetW)
                    : 0;
                const feedForwardDischargeW = sungrowBalance.feedForwardUsed && balancedTargetW > 0
                    ? Math.max(0, balancedTargetW)
                    : 0;
                const feedForwardChargeW = sungrowBalance.feedForwardUsed && balancedTargetW < 0
                    ? Math.max(0, -balancedTargetW)
                    : 0;
                const nonEvcsImportW = Math.max(0, importNowW - evcsStorageProtectedLoadW);
                const dischargeCapW = Math.max(
                    0,
                    nonEvcsImportW + currentDischargeW + (nonEvcsImportW > 0 ? assistBufferW : 0),
                    heldDischargeW,
                    feedForwardDischargeW,
                );
                const chargeCapW = Math.max(
                    0,
                    exportNowW + currentChargeW + targetImportW + assistBufferW,
                    heldChargeW,
                    feedForwardChargeW,
                );

                if (balancedTargetW > 0) {
                    // Bestehende globale Demand-/Budget-Caps bleiben auch im
                    // Hersteller-Schreibpfad verbindlich. Das Sungrow-Profil darf
                    // weder EVCS-Speicherschutz noch Peak-/SoC-/Anschlussgrenzen
                    // durch eine nachgelagerte Neuberechnung wieder aufweiten.
                    const upstreamDischargeCapW = (typeof dischargeDemandHardCapW === 'number' && Number.isFinite(dischargeDemandHardCapW))
                        ? Math.max(0, dischargeDemandHardCapW)
                        : maxDischargeW;
                    // Hersteller-Neuberechnung darf die gemeinsamen SoC-/Reserve-
                    // Grenzen nicht umgehen. Das allgemeine Eigenverbrauchsmodul kann
                    // bei gesperrter Entladung bewusst keinen positiven Request erzeugen;
                    // Sungrow berechnet danach aber trotzdem einen NVP-Sollwert. Deshalb
                    // wird die Freigabe hier nochmals als finale Hersteller-Cap angewendet.
                    // Die reine Eigenverbrauchsregelung kann bei bereits unterschrittenem
                    // selfMinSoc keinen positiven Request erzeugen. In diesem Fall bleibt
                    // hardDischargeMinSoc noch auf seinem neutralen Startwert, obwohl Sungrow
                    // anschliessend aus dem NVP erneut eine Entladung berechnen koennte.
                    // Deshalb gilt im Herstellerpfad immer die strengere Grenze aus der
                    // allgemeinen Policy und der Eigenverbrauchs-Min-SoC-Grenze.
                    const sungrowDischargeMinSoc = Math.max(hardDischargeMinSoc, selfMinSoc);
                    const dischargeAllowedBySocW = reserveActive
                        || (typeof soc === 'number' && soc <= sungrowDischargeMinSoc)
                        ? 0
                        : maxDischargeW;
                    const effectiveDischargeCapW = Math.min(maxDischargeW, dischargeCapW, upstreamDischargeCapW, dischargeAllowedBySocW);
                    targetW = clamp(balancedTargetW, 0, effectiveDischargeCapW);
                    source = 'sungrow-assist';
                    if (targetW > 0) {
                        reason = sungrowBalance.holdingLastCommand
                            ? `Sungrow Hybrid ESS: NVP im Zielband – Entladung ${Math.round(targetW)} W halten`
                            : `Sungrow Hybrid ESS: geschlossener NVP-Regelkreis Entladen ${Math.round(targetW)} W (${String(sungrowBalance.baseSource || '')})`;
                        sungrowWriteMode = sungrowBalance.holdingLastCommand
                            ? 'write-nvp-hold-discharge'
                            : (sungrowBalance.feedForwardUsed ? 'write-pv-load-feed-forward-discharge' : 'write-nvp-balance-discharge');
                    } else {
                        reason = 'Sungrow Hybrid ESS: Entladen durch SoC-/Leistungs-/Demand-Grenze gestoppt';
                        sungrowWriteMode = 'write-stop-discharge-limit';
                    }
                    dischargeDemandHardCapW = (typeof dischargeDemandHardCapW === 'number')
                        ? Math.min(dischargeDemandHardCapW, dischargeCapW)
                        : dischargeCapW;
                    dischargeDemandHardCapReason = sungrowBalance.feedForwardUsed
                        ? 'Sungrow direkter PV-/Last-Feed-forward-Cap'
                        : 'Sungrow NVP-Balancing-Entlade-Cap';
                } else if (balancedTargetW < 0) {
                    const maxChargeBySocW = (typeof soc === 'number' && soc >= hardChargeMaxSoc) ? 0 : maxChargeW;
                    const deferredChargeCap = isDeferredSungrowChargeCapReason(chargeDemandHardCapReason);
                    const upstreamChargeCapW = (!deferredChargeCap
                        && typeof chargeDemandHardCapW === 'number'
                        && Number.isFinite(chargeDemandHardCapW))
                        ? Math.max(0, chargeDemandHardCapW)
                        : maxChargeW;
                    // Der geschlossene Sungrow-Regelkreis erzeugt seinen Sollwert erst
                    // an dieser Stelle. Vorlaeufige Generic-PV-/NVP-Caps werden daher
                    // nicht ein zweites Mal verwendet; SoC, Herstellerleistung und der
                    // finale zentrale PV-Cap bleiben weiterhin harte Grenzen.
                    const effectiveChargeCapW = Math.min(maxChargeBySocW, chargeCapW, upstreamChargeCapW);
                    const chargeW = clamp(Math.abs(balancedTargetW), 0, effectiveChargeCapW);
                    targetW = chargeW > 0 ? -chargeW : 0;
                    source = 'sungrow-assist';
                    reason = chargeW > 0
                        ? (sungrowBalance.holdingLastCommand
                            ? `Sungrow Hybrid ESS: NVP im Zielband – Beladung ${Math.round(chargeW)} W halten`
                            : `Sungrow Hybrid ESS: geschlossener NVP-Regelkreis Laden ${Math.round(chargeW)} W (${String(sungrowBalance.baseSource || '')})`)
                        : `Sungrow Hybrid ESS: Laden durch SoC-/Leistungsgrenze gestoppt`;
                    sungrowWriteMode = chargeW > 0
                        ? (sungrowBalance.holdingLastCommand
                            ? 'write-nvp-hold-charge'
                            : (sungrowBalance.feedForwardUsed ? 'write-pv-load-feed-forward-charge' : 'write-nvp-balance-charge'))
                        : 'write-stop-charge-limit';
                    chargeDemandHardCapW = (!deferredChargeCap
                        && typeof chargeDemandHardCapW === 'number'
                        && Number.isFinite(chargeDemandHardCapW))
                        ? Math.min(chargeDemandHardCapW, chargeCapW)
                        : chargeCapW;
                    chargeDemandHardCapReason = sungrowBalance.feedForwardUsed
                        ? 'Sungrow direkter PV-/Last-Feed-forward-Cap'
                        : 'Sungrow NVP-Balancing-Lade-Cap';
                } else {
                    const lastActiveTargetW = Number.isFinite(Number(this._lastTargetW))
                        ? Number(this._lastTargetW)
                        : 0;
                    const lastWasNvpControl = isStorageBalanceSource(this._lastSource);

                    if (lastActiveTargetW !== 0 && lastWasNvpControl) {
                        // Defensive Rueckfallebene: Falls der Herstellerpfad trotz
                        // laufendem geschlossenen Regelkreis kurzzeitig kein neues
                        // Ziel erzeugt, bleibt der letzte wirksame Nicht-Null-Befehl
                        // aktiv. So entsteht kein Laden -> 0 -> Laden-Pendeln.
                        targetW = lastActiveTargetW;
                        source = 'sungrow-assist';
                        reason = `Sungrow Hybrid ESS: letzten aktiven NVP-Sollwert ${Math.round(lastActiveTargetW)} W halten`;
                        sungrowWriteMode = 'write-hold-last-active-command';
                        storageNvpBalanceDiag = {
                            ...(storageNvpBalanceDiag || sungrowBalance),
                            targetW: lastActiveTargetW,
                            rawTargetW: lastActiveTargetW,
                            holdingLastCommand: true,
                            heldTargetW: lastActiveTargetW,
                            mode: 'sungrow-defensive-hold-last-command',
                            policy: 'sungrow-hybrid',
                        };
                    } else {
                        // Ohne aktiven externen NexoWatt-Befehl ist 0 W kein notwendiger
                        // Schreibwert. No-Write laesst Sungrow intern weiterarbeiten und
                        // verhindert, dass ein zyklischer Leerlauf den Controller stoppt.
                        targetW = 0;
                        source = 'sungrow-hybrid';
                        reason = 'Sungrow Hybrid ESS: kein aktiver externer Sollwert – keine 0-W-Vorgabe senden';
                        sungrowWriteMode = 'no-write-idle';
                        sungrowNoWrite = true;
                    }
                }
            } else {
                sungrowWriteMode = `policy-${srcNorm || 'standard'}`;
            }

            this._sungrowHybridLastMode = sungrowWriteMode;
            // Die Diagnose wird erst nach dem finalen zentralen PV-Budget-Cap
            // geschrieben. Dadurch zeigt sie den tatsaechlich an den Speicher
            // gehenden Sollwert und nicht einen zuvor berechneten Herstellerwert.
            sungrowDiagPayload = {
                active: true,
                mode: String(sungrowBalance.mode || ctx.mode || 'nvp-closed-loop'),
                reason,
                writeMode: sungrowWriteMode,
                targetW,
                pvW: sungrowFeedForward.pvW !== null && sungrowFeedForward.pvW !== undefined ? sungrowFeedForward.pvW : ctx.pvW,
                loadW: sungrowFeedForward.loadW !== null && sungrowFeedForward.loadW !== undefined ? sungrowFeedForward.loadW : ctx.loadW,
                nvpW: nvpNowW,
                importW: importNowW,
                exportW: exportNowW,
                pvCoversLoad: !!ctx.pvCoversLoad,
                thresholdW: ctx.thresholdW,
                loadCoverReserveW: ctx.loadCoverReserveW,
                dischargeThresholdW: ctx.dischargeThresholdW,
                nvpTargetW: targetImportW,
                nvpDeadbandW,
                nvpErrorW: sungrowBalance.nvpErrorW,
                nvpBalanceBaseW: sungrowBalance.baseW,
                nvpBalanceTargetW: sungrowBalance.targetW,
                nvpBalanceNeeded: Math.abs(Number(sungrowBalance.nvpErrorW) || 0) > nvpDeadbandW,
            };
        }

        // ------------------------------------------------------------
        // Finaler zentraler PV-Budget-Cap NACH allen Herstellerprofilen
        // ------------------------------------------------------------
        // Sungrow berechnet seinen geschlossenen NVP-Sollwert erst nach dem
        // allgemeinen Dispatcher. Ein nur davor angewendeter PV-Cap konnte daher
        // nachtraeglich wieder ueberschrieben werden; der Speicher nahm dann trotz
        // 80-%-E-Mobilitaetsanteil den vollen PV-Ueberschuss. Der finale Cap ist
        // deshalb die letzte fachliche Schranke vor Budgetreservierung/Schreiben.
        try {
            const budgetRuntime = centralPvBudgetRuntime || (this.adapter && this.adapter._emsBudget);
            const allocationGate = centralPvAllocationGate || (budgetRuntime && budgetRuntime.gates && budgetRuntime.gates.pvAllocation
                ? budgetRuntime.gates.pvAllocation
                : null);
            if (allocationGate) {
                pvBudgetAllocationMode = String(allocationGate.mode || pvBudgetAllocationMode || '');
            }
            pvBudgetRemainingBeforeStorageW = resolveStoragePvBudgetW(
                budgetRuntime,
                allocationGate,
                pvBudgetStorageAvailableW,
            );
            pvBudgetStorageAvailableW = pvBudgetRemainingBeforeStorageW;
            pvBudgetPostVendorCapW = pvBudgetStorageAvailableW;

            if (!feneconNoWrite && !sungrowNoWrite && budgetRuntime && isCentralPvChargeSource(source, targetW)) {
                const pvCapW = Math.max(0, pvBudgetStorageAvailableW);
                const requestedChargeW = Math.max(0, -Number(targetW));
                const rawVendorTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.rawTargetW))
                    ? Number(storageNvpBalanceDiag.rawTargetW)
                    : Number(targetW);
                const rawVendorChargeW = Math.max(0, -rawVendorTargetW);
                const vendorAlreadyLimitedByPvBudget = rawVendorChargeW > (pvCapW + Math.max(1, stepW));

                if (requestedChargeW > pvCapW) {
                    targetW = pvCapW > 0 ? -pvCapW : 0;
                }

                if (requestedChargeW > pvCapW || vendorAlreadyLimitedByPvBudget) {
                    pvBudgetPostVendorCapped = true;
                    reason = `${reason} (finales PV-Restbudget nach E-Mobilitaet ${Math.round(pvCapW)} W)`;
                    if (sungrowHybridActive) {
                        sungrowWriteMode = pvCapW > 0
                            ? `${String(sungrowWriteMode || 'write-nvp-balance-charge').replace(/-pv-budget-capped$/, '')}-pv-budget-capped`
                            : 'pending-zero-central-pv-budget';
                        this._sungrowHybridLastMode = sungrowWriteMode;
                    }
                }
                chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number'
                    && Number.isFinite(chargeDemandHardCapW)
                    && !isDeferredSungrowChargeCapReason(chargeDemandHardCapReason))
                    ? Math.min(Math.max(0, chargeDemandHardCapW), pvCapW)
                    : pvCapW;
                chargeDemandHardCapReason = 'Finales zentrales PV-Restbudget nach E-Mobilitaet';
                if (storageNvpBalanceDiag && typeof storageNvpBalanceDiag === 'object') {
                    storageNvpBalanceDiag = {
                        ...storageNvpBalanceDiag,
                        targetW,
                        finalPvBudgetCapW: pvCapW,
                        finalPvBudgetCapped: pvBudgetPostVendorCapped,
                        finalPvBudgetNoWriteHold: false,
                    };
                }
            }
        } catch {
            // Die Budgetdiagnose darf den sicheren Speicher-Schreibpfad nicht abbrechen.
        }

        // ------------------------------------------------------------
        // Finaler zentraler Gesamtbudget-Cap fuer Speicher-Netzladen
        // ------------------------------------------------------------
        // Tarif-, Reserve- und LSK-Nachladung sind keine PV-Senken. Sie duerfen
        // deshalb nur den nach der EVCS-Reservierung verbleibenden Gesamt-Grant
        // nutzen. Der Cap liegt bewusst nach allen Herstellerberechnungen, damit
        // Sungrow/E3DC/Generic denselben finalen Wert erhalten.
        try {
            const budgetRuntime = this.adapter && this.adapter._emsBudget;
            const sourceForBudget = policySourceBeforeVendor || String(source || '');
            const gridChargeSource = isCentralGridChargeSource(sourceForBudget, targetW);
            if (!feneconNoWrite && !sungrowNoWrite && budgetRuntime && targetW < 0 && gridChargeSource) {
                const requestedChargeW = Math.max(0, -Number(targetW));
                const totalGrant = typeof budgetRuntime.getTotalGrant === 'function'
                    ? budgetRuntime.getTotalGrant({ key: 'storage', requestedW: requestedChargeW })
                    : (typeof budgetRuntime.grant === 'function'
                        ? budgetRuntime.grant({ key: 'storage', requestedW: requestedChargeW, pvOnly: false })
                        : null);
                totalBudgetStorageAvailableW = totalGrant && Number.isFinite(Number(totalGrant.grantW))
                    ? Math.max(0, Number(totalGrant.grantW))
                    : requestedChargeW;
                const allowedChargeW = Math.min(requestedChargeW, totalBudgetStorageAvailableW);
                totalBudgetStorageCapped = allowedChargeW + 0.5 < requestedChargeW;
                if (totalBudgetStorageCapped) {
                    targetW = allowedChargeW > 0 ? -allowedChargeW : 0;
                    chargeDemandHardCapW = (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW))
                        ? Math.min(Math.max(0, chargeDemandHardCapW), allowedChargeW)
                        : allowedChargeW;
                    chargeDemandHardCapReason = 'Finales zentrales Gesamtbudget nach E-Mobilitaet';
                    reason = `${reason} (zentrales Gesamtbudget nach E-Mobilitaet ${Math.round(allowedChargeW)} W)`;
                    if (sungrowHybridActive && targetW === 0) {
                        sungrowWriteMode = 'write-stop-central-total-budget-exhausted';
                        this._sungrowHybridLastMode = sungrowWriteMode;
                    }
                    if (storageNvpBalanceDiag && typeof storageNvpBalanceDiag === 'object') {
                        storageNvpBalanceDiag = {
                            ...storageNvpBalanceDiag,
                            targetW,
                            finalTotalBudgetCapW: allowedChargeW,
                            finalTotalBudgetCapped: true,
                        };
                    }
                }
            }
        } catch {
            // Budgetdiagnose darf die sichere Speicheransteuerung nicht abbrechen.
        }

        // ------------------------------------------------------------
        // Herstellerunabhaengige 0-W-Firewall nach allen Policies/Caps
        // ------------------------------------------------------------
        // 0 W ist bei allen unterstuetzten Speicherprofilen ein echter Stop.
        // Zielband, ein einzelner Budget-0-Tick oder eine kurze Messluecke duerfen
        // deshalb keinen Laden -> 0 -> Laden-/Entladen-Puls erzeugen. Erst ein
        // expliziter Schutzgrund oder eine physikalisch falsche Richtung darf 0 W
        // an signed-, Split-, E3/DC- oder Farm-Sollwerte schreiben.
        if (!feneconNoWrite && targetW === 0) {
            const lastActiveTargetW = Number.isFinite(Number(this._lastTargetW))
                ? Number(this._lastTargetW)
                : 0;
            const nvpMeasurementUsable = typeof nvpRawW === 'number'
                && Number.isFinite(nvpRawW)
                && (!centralNvpCurrent || centralNvp.usable === true);
            const measurementGap = !nvpMeasurementUsable;
            if (measurementGap && lastActiveTargetW !== 0) {
                if (!this._storageMeasurementGapSinceMs) this._storageMeasurementGapSinceMs = now;
            } else {
                this._storageMeasurementGapSinceMs = 0;
            }
            const measurementGapAgeMs = this._storageMeasurementGapSinceMs
                ? Math.max(0, now - this._storageMeasurementGapSinceMs)
                : 0;
            const measurementGraceMs = Math.max(
                5000,
                Math.round(Math.max(0, num(cfg.zeroWriteMeasurementGraceSec, 30)) * 1000),
            );

            const previousSource = String(this._lastSource || '');
            const previousWasPvCharge = lastActiveTargetW < 0 && (
                isCentralPvChargeSource(previousSource, lastActiveTargetW)
                || isStorageBalanceSource(previousSource)
            );
            const pvBudgetZero = previousWasPvCharge
                && Math.max(0, Number(pvBudgetStorageAvailableW) || 0) <= 0;
            if (pvBudgetZero) {
                if (!this._storageBudgetZeroSinceMs) this._storageBudgetZeroSinceMs = now;
            } else {
                this._storageBudgetZeroSinceMs = 0;
            }
            const budgetZeroAgeMs = this._storageBudgetZeroSinceMs
                ? Math.max(0, now - this._storageBudgetZeroSinceMs)
                : 0;
            const budgetGraceMs = Math.max(
                5000,
                Math.round(Math.max(0, num(cfg.zeroWriteBudgetGraceSec, 20)) * 1000),
            );

            const nvpTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.nvpTargetW))
                ? Number(storageNvpBalanceDiag.nvpTargetW)
                : (previousSource === 'tarif'
                    ? Math.max(0, num(cfg.tariffTargetGridImportW, selfTargetGridW))
                    : Math.max(0, selfTargetGridW + evcsStorageProtectedNvpTargetShiftW));
            const nvpDeadbandW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.deadbandW))
                ? Math.max(20, Number(storageNvpBalanceDiag.deadbandW))
                : Math.max(50, selfImportThresholdW, stepW);
            const feedForwardTargetW = storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.feedForwardTargetW))
                ? Number(storageNvpBalanceDiag.feedForwardTargetW)
                : null;
            const visibleExportSupportsCharge = nvpMeasurementUsable
                && Number(nvpRawW) < (nvpTargetW - nvpDeadbandW);
            const feedForwardSupportsCharge = feedForwardTargetW !== null && feedForwardTargetW < 0;
            const allocationModeNorm = String(pvBudgetAllocationMode || '').trim().toLowerCase();
            const budgetZeroConfirmed = pvBudgetZero
                && !visibleExportSupportsCharge
                && !feedForwardSupportsCharge
                && (
                    allocationModeNorm === 'emobility'
                    || (pvBudgetEvcsReservedW > 0 && budgetZeroAgeMs >= budgetGraceMs)
                );

            // Ein vorher aktiver Sollwert muss an den konfigurierten SoC-Grenzen
            // ausdruecklich mit 0 W beendet werden. Im NVP-Zielband ist die normale
            // Request-Quelle bereits idle; ohne diese direkte Grenzpruefung wuerde
            // die 0-W-Firewall den alten Sollwert faelschlich weiterhalten.
            const dischargeSocStop = lastActiveTargetW > 0
                && typeof soc === 'number'
                && soc <= Math.max(hardDischargeMinSoc, selfMinSoc);
            const chargeSocStop = lastActiveTargetW < 0
                && typeof soc === 'number'
                && soc >= hardChargeMaxSoc;
            const explicitStopReason = evcsProtectedDischargeStop
                ? 'Entladen stoppen: ausdruecklicher EVCS-Speicherschutz deckt den geschuetzten Ladeanteil aus'
                : (dischargeSocStop
                    ? `Entladen stoppen: SoC <= ${Math.max(hardDischargeMinSoc, selfMinSoc)}%`
                    : (chargeSocStop
                        ? `Laden stoppen: SoC >= ${hardChargeMaxSoc}%`
                        : String(reason || '')));
            const explicitStop = sungrowUpstreamExplicitStop
                || String(sungrowWriteMode || '').startsWith('write-stop-')
                || source === 'aus'
                || source === 'reserve'
                || reserveActive
                || chargeDirectionStopped
                || dischargeDirectionStopped
                || evcsProtectedDischargeStop
                || dischargeSocStop
                || chargeSocStop;

            const zeroDecision = decideStorageZeroWrite({
                targetW,
                lastTargetW: lastActiveTargetW,
                source,
                reason: explicitStopReason,
                explicitStop,
                measurementUsable: nvpMeasurementUsable,
                measurementGap,
                measurementGapAgeMs,
                measurementGraceMs,
                budgetZero: pvBudgetZero,
                budgetZeroConfirmed,
                budgetZeroAgeMs,
                budgetGraceMs,
                nvpW: nvpMeasurementUsable ? nvpRawW : null,
                nvpTargetW,
                nvpDeadbandW,
                feedForwardTargetW,
                // Sungrow soll seinen letzten externen Wert ohne Refresh halten.
                // Generic/Split/E3DC/Farm brauchen fuer ihren Watchdog dagegen den
                // erneut geschriebenen gleichen Sollwert.
                holdByNoWrite: sungrowHybridActive,
            });

            storageZeroWriteStatus = String(zeroDecision.status || '');
            storageZeroWriteReason = String(zeroDecision.reason || reason || '');

            if (zeroDecision.action === 'hold-write') {
                targetW = Number(zeroDecision.outputW) || 0;
                source = previousSource || source || 'eigenverbrauch';
                reason = storageZeroWriteReason;
                storageZeroNoWrite = false;
            } else if (zeroDecision.action === 'hold-no-write' || zeroDecision.action === 'idle-no-write') {
                targetW = Number(zeroDecision.outputW) || 0;
                source = previousSource || source || (sungrowHybridActive ? 'sungrow-hybrid' : 'idle');
                reason = storageZeroWriteReason;

                // FENECON/OpenEMS wertet die externe Batterie-Vorgabe nur solange
                // aus, wie der zugeordnete Schreib-DP zyklisch erneuert wird. Ein
                // fachlich korrekter Leerlauf von 0 W darf deshalb nicht von der
                // herstellerunabhaengigen 0-W-Firewall in No-Write verwandelt werden.
                // Der 0-W-Wert bleibt ein echter, bereits gegateter Stop/Keepalive.
                if (feneconHybridActive && zeroDecision.action === 'idle-no-write') {
                    storageZeroNoWrite = false;
                    storageZeroWriteStatus = 'write-fenecon-idle-keepalive';
                    storageZeroWriteReason = String(reason || 'FENECON/OpenEMS: 0-W-Keepalive ueber AppCenter-DP');
                    reason = storageZeroWriteReason;
                    feneconWriteMode = feneconWriteMode || 'write-appcenter-gated';
                } else {
                    storageZeroNoWrite = true;
                }
                if (sungrowHybridActive) {
                    sungrowNoWrite = true;
                    sungrowWriteMode = zeroDecision.action === 'idle-no-write'
                        ? 'no-write-zero-firewall-idle'
                        : 'no-write-hold-last-command';
                    this._sungrowHybridLastMode = sungrowWriteMode;
                }
            } else if (zeroDecision.action === 'write-stop') {
                targetW = 0;
                reason = storageZeroWriteReason;
                storageZeroNoWrite = false;
                this._storageMeasurementGapSinceMs = 0;
                this._storageBudgetZeroSinceMs = 0;
            }

            if ((zeroDecision.action === 'hold-write' || zeroDecision.action === 'hold-no-write') && targetW !== 0) {
                storageNvpBalanceDiag = {
                    ...(storageNvpBalanceDiag || {}),
                    targetW,
                    rawTargetW: targetW,
                    holdingLastCommand: true,
                    heldTargetW: targetW,
                    mode: `zero-firewall-${storageZeroWriteStatus || 'hold'}`,
                    policy: storageNvpBalanceDiag && storageNvpBalanceDiag.policy
                        ? storageNvpBalanceDiag.policy
                        : 'storage-zero-firewall',
                };
            }

            pvBudgetPostVendorNoWriteHold = storageZeroNoWrite && targetW < 0;
            pvBudgetPostVendorNoWriteReason = storageZeroNoWrite ? reason : '';
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallAction', storageZeroWriteStatus);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallReason', storageZeroWriteReason);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallHeldW', Math.round(Number(zeroDecision.holdW) || 0));
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallExplicitStop', !!zeroDecision.explicitStop);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', Math.round(budgetZeroAgeMs));
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', Math.round(measurementGapAgeMs));
        } else if (targetW !== 0) {
            this._storageMeasurementGapSinceMs = 0;
            this._storageBudgetZeroSinceMs = 0;
            storageZeroWriteStatus = 'write-non-zero';
            storageZeroWriteReason = String(reason || '');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallAction', 'write-non-zero');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallReason', '');
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallHeldW', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallExplicitStop', false);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', 0);
            await this._setIfChanged('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', 0);
        }

        if (sungrowDiagPayload) {
            sungrowDiagPayload = {
                ...sungrowDiagPayload,
                reason,
                writeMode: sungrowWriteMode || sungrowDiagPayload.writeMode,
                targetW,
                nvpBalanceTargetW: storageNvpBalanceDiag && Number.isFinite(Number(storageNvpBalanceDiag.targetW))
                    ? Number(storageNvpBalanceDiag.targetW)
                    : sungrowDiagPayload.nvpBalanceTargetW,
            };
            await this._setSungrowHybridDiag(sungrowDiagPayload);
        }

        // Herstellerunabhaengige NVP-Balancing-Diagnose erst nach den
        // Herstellerprofilen und dem finalen PV-Budget-Cap schreiben, damit der
        // tatsaechlich an den Speicher gehende Sollwert sichtbar ist.
        await this._setStorageNvpBalanceDiag(storageNvpBalanceDiag);
        await this._setIfChanged('speicher.regelung.chargeDemandCapW',
            (typeof chargeDemandHardCapW === 'number' && Number.isFinite(chargeDemandHardCapW)) ? Math.round(chargeDemandHardCapW) : 0);
        await this._setIfChanged('speicher.regelung.chargeDemandCapReason', String(chargeDemandHardCapReason || ''));

        // Den finalen Speicher-Ladesollwert fuer nachgelagerte Verbraucher im
        // zentralen Budget reservieren:
        // - PV-/NVP-Laden reduziert remainingTotalW UND remainingPvW, weil die
        //   physisch belegte Ladeleistung nachfolgenden Verbrauchern weder als
        //   Gesamt- noch als PV-Budget erneut zur Verfuegung stehen darf.
        // - Tarif-/Reserve-/LSK-Netzladen reduziert nur remainingTotalW.
        // Ein durch die allgemeine 0-W-Firewall gehaltener externer Sollwert bleibt
        // physikalisch aktiv und muss deshalb im zentralen Budget weiter reserviert
        // werden. FENECON verwendet ebenfalls stets den externen, gegateten Pfad.
        try {
            const budgetRuntime = this.adapter && this.adapter._emsBudget;
            const sourceForBudget = policySourceBeforeVendor || String(source || '');
            const pvSource = isCentralPvChargeSource(source, targetW)
                || isCentralPvChargeSource(sourceForBudget, targetW);
            const gridChargeSource = isCentralGridChargeSource(sourceForBudget, targetW);
            if (!feneconNoWrite && budgetRuntime && typeof budgetRuntime.reserve === 'function' && targetW < 0 && (pvSource || gridChargeSource)) {
                const chargeW = Math.max(0, -Number(targetW));
                const actualChargeW = balanceBatteryTrusted
                    ? Math.max(0, -Number(balanceBatteryPowerW || 0))
                    : ((battPowerTrusted && typeof battPowerW === 'number' && Number.isFinite(battPowerW))
                        ? Math.max(0, -battPowerW)
                        : chargeW);
                if (pvSource) {
                    // Fuer PV-Laden exakt denselben zentralen Grant verwenden wie
                    // fuer den Schreibpfad. Prozent-Gates werden hier nicht erneut
                    // rekonstruiert.
                    const resolvedStoragePvW = Math.max(0, Number(pvBudgetStorageAvailableW) || 0);
                    pvBudgetReservedW = Math.min(chargeW, resolvedStoragePvW);
                } else {
                    totalBudgetStorageReservedW = Math.min(
                        chargeW,
                        totalBudgetStorageAvailableW > 0 ? totalBudgetStorageAvailableW : chargeW,
                    );
                }
                budgetRuntime.reserve({
                    key: 'storage',
                    app: 'storageControl',
                    label: 'Speicher',
                    priority: 150,
                    actualW: actualChargeW,
                    requestedW: chargeW,
                    reserveW: pvSource ? pvBudgetReservedW : (gridChargeSource ? totalBudgetStorageReservedW : 0),
                    pvReserveW: pvSource ? pvBudgetReservedW : 0,
                    pvOnly: pvSource,
                    mode: pvSource ? (pvBudgetAllocationMode || 'pv') : String(sourceForBudget || 'grid-charge'),
                });
            }
        } catch {
            // Budgetdiagnose darf die sichere Speicheransteuerung nicht abbrechen.
        }

        await this._setIfChanged('speicher.regelung.pvBudgetAllocationMode', pvBudgetAllocationMode);
        await this._setIfChanged('speicher.regelung.pvBudgetRemainingBeforeStorageW', Math.round(pvBudgetRemainingBeforeStorageW));
        await this._setIfChanged('speicher.regelung.pvBudgetStorageAvailableW', Math.round(pvBudgetStorageAvailableW));
        await this._setIfChanged('speicher.regelung.pvBudgetReservedW', Math.round(pvBudgetReservedW));
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapW', Math.round(pvBudgetPostVendorCapW));
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorCapped', !!pvBudgetPostVendorCapped);
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteHold', !!pvBudgetPostVendorNoWriteHold);
        await this._setIfChanged('speicher.regelung.pvBudgetPostVendorNoWriteReason', String(pvBudgetPostVendorNoWriteReason || ''));
        await this._setIfChanged('speicher.regelung.pvBudgetRuntimeRemainingW', Math.round(pvBudgetRuntimeRemainingW));
        await this._setIfChanged('speicher.regelung.pvBudgetAllocationDerivedW', Math.round(pvBudgetAllocationDerivedW));
        await this._setIfChanged('speicher.regelung.pvBudgetEvcsReservedW', Math.round(pvBudgetEvcsReservedW));
        await this._setIfChanged('speicher.regelung.pvBudgetResolution', String(pvBudgetResolution || ''));
        await this._setIfChanged('speicher.regelung.totalBudgetStorageAvailableW', Math.round(totalBudgetStorageAvailableW));
        await this._setIfChanged('speicher.regelung.totalBudgetStorageReservedW', Math.round(totalBudgetStorageReservedW));
        await this._setIfChanged('speicher.regelung.totalBudgetStorageCapped', !!totalBudgetStorageCapped);

        // Die optionale Reserve-SoC-Ausgabe erhaelt dieselbe final wirksame
        // Entlade-Untergrenze, die auch die zentrale Sicherheitslogik verwendet.
        this._effectiveReserveSocPct = clamp(
            Number.isFinite(Number(hardDischargeMinSoc)) ? Number(hardDischargeMinSoc) : reserveMin,
            0,
            100,
        );

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
					coupling: storageCoupling,
					powerW: (typeof battPowerW === 'number' && Number.isFinite(battPowerW)) ? Math.round(battPowerW) : null,
					ageMs: (typeof battPowerAge === 'number' && Number.isFinite(battPowerAge)) ? Math.round(battPowerAge) : null,
					dcPvPowerW: (typeof dcPvPowerW === 'number' && Number.isFinite(dcPvPowerW)) ? Math.round(dcPvPowerW) : null,
					dcPvAgeMs: (typeof dcPvPowerAge === 'number' && Number.isFinite(dcPvPowerAge)) ? Math.round(dcPvPowerAge) : null,
					invalidReason: (battPowerInvalidReason && String(battPowerInvalidReason).trim()) ? String(battPowerInvalidReason).trim() : null,
				},
				balance: storageNvpBalanceDiag ? {
					policy: String(storageNvpBalanceDiag.policy || ''),
					mode: String(storageNvpBalanceDiag.mode || ''),
					feedbackUsed: !!storageNvpBalanceDiag.feedbackUsed,
					actualBatteryW: (storageNvpBalanceDiag.actualBatteryW !== null && storageNvpBalanceDiag.actualBatteryW !== undefined && Number.isFinite(Number(storageNvpBalanceDiag.actualBatteryW)))
						? Math.round(Number(storageNvpBalanceDiag.actualBatteryW))
						: null,
					baseW: Number.isFinite(Number(storageNvpBalanceDiag.baseW)) ? Math.round(Number(storageNvpBalanceDiag.baseW)) : null,
					baseSource: String(storageNvpBalanceDiag.baseSource || ''),
					nvpW: Number.isFinite(Number(storageNvpBalanceDiag.nvpW)) ? Math.round(Number(storageNvpBalanceDiag.nvpW)) : null,
					nvpTargetW: Number.isFinite(Number(storageNvpBalanceDiag.nvpTargetW)) ? Math.round(Number(storageNvpBalanceDiag.nvpTargetW)) : null,
					nvpErrorW: Number.isFinite(Number(storageNvpBalanceDiag.nvpErrorW)) ? Math.round(Number(storageNvpBalanceDiag.nvpErrorW)) : null,
					rawTargetW: Number.isFinite(Number(storageNvpBalanceDiag.rawTargetW)) ? Math.round(Number(storageNvpBalanceDiag.rawTargetW)) : null,
					appliedCorrectionW: Number.isFinite(Number(storageNvpBalanceDiag.appliedCorrectionW)) ? Math.round(Number(storageNvpBalanceDiag.appliedCorrectionW)) : null,
					targetW: Number.isFinite(Number(storageNvpBalanceDiag.targetW)) ? Math.round(Number(storageNvpBalanceDiag.targetW)) : null,
					measurementSkewMs: Number.isFinite(Number(storageNvpBalanceDiag.measurementSkewMs)) ? Math.round(Number(storageNvpBalanceDiag.measurementSkewMs)) : null,
					holdingLastCommand: !!storageNvpBalanceDiag.holdingLastCommand,
					heldTargetW: Number.isFinite(Number(storageNvpBalanceDiag.heldTargetW)) ? Math.round(Number(storageNvpBalanceDiag.heldTargetW)) : 0,
					feedForwardAvailable: !!storageNvpBalanceDiag.feedForwardAvailable,
					feedForwardUsed: !!storageNvpBalanceDiag.feedForwardUsed,
					feedForwardTargetW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardTargetW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardTargetW)) : null,
					feedForwardExpectedActualW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardExpectedActualW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardExpectedActualW)) : null,
					feedForwardPvW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardPvW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardPvW)) : null,
					feedForwardLoadW: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardLoadW)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardLoadW)) : null,
					feedForwardPvSource: String(storageNvpBalanceDiag.feedForwardPvSource || ''),
					feedForwardLoadSource: String(storageNvpBalanceDiag.feedForwardLoadSource || ''),
					feedForwardReason: String(storageNvpBalanceDiag.feedForwardReason || ''),
					feedForwardMeasurementSkewMs: Number.isFinite(Number(storageNvpBalanceDiag.feedForwardMeasurementSkewMs)) ? Math.round(Number(storageNvpBalanceDiag.feedForwardMeasurementSkewMs)) : null,
					feedbackPlausibilityErrorW: Number.isFinite(Number(storageNvpBalanceDiag.feedbackPlausibilityErrorW)) ? Math.round(Number(storageNvpBalanceDiag.feedbackPlausibilityErrorW)) : null,
					feedbackRejectedByFeedForward: !!storageNvpBalanceDiag.feedbackRejectedByFeedForward,
				} : null,
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
                    storageProtectedLoadW: Math.round(evcsStorageProtectedLoadW || 0),
                    storageProtectedWallboxes: Math.round(evcsStorageProtectedWallboxes || 0),
                    storageAssistRequestedLoadW: Math.round(evcsStorageAssistRequestedLoadW || 0),
                    nvpTargetOffsetW: Math.round(evcsStorageProtectedNvpTargetShiftW || 0),
                },
                evPriority: evPriorityCaps ? {
                    active: !!(feneconAcMode && evPriorityCaps.active),
                    blockStorageCharge: !!evPriorityBlockStorageCharge,
                    starvedW: Math.round(evPriorityStarvedW || 0),
                    pendingW: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.pendingW))) ? Math.round(Number(evPriorityCaps.pendingW)) : 0,
                    storageYieldW: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.storageYieldW))) ? Math.round(Number(evPriorityCaps.storageYieldW)) : 0,
                    requestedCount: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.requestedCount))) ? Math.round(Number(evPriorityCaps.requestedCount)) : 0,
                    limitedWallboxes: (feneconAcMode && Number.isFinite(Number(evPriorityCaps.limitedWallboxes))) ? Math.round(Number(evPriorityCaps.limitedWallboxes)) : 0,
                } : null,
                pvAllocation: {
                    mode: pvBudgetAllocationMode,
                    remainingBeforeStorageW: Math.round(pvBudgetRemainingBeforeStorageW || 0),
                    storageAvailableW: Math.round(pvBudgetStorageAvailableW || 0),
                    storageReservedW: Math.round(pvBudgetReservedW || 0),
                },
                fenecon: feneconHybridConfigured ? {
                    hybridMode: !!feneconHybridActive,
                    configured: !!feneconHybridConfigured,
                    farmBlocked: !!feneconHybridBlockedByFarm,
                    mode: feneconHybridCtx && feneconHybridCtx.mode ? String(feneconHybridCtx.mode) : (feneconHybridBlockedByFarm ? 'blocked-by-farm' : 'standard'),
                    writeMode: feneconWriteMode || '',
                    noWrite: !!feneconNoWrite,
                    pvW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.pvW))) ? Math.round(Number(feneconHybridCtx.pvW)) : null,
                    additionalPvW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.additionalPvW))) ? Math.round(Number(feneconHybridCtx.additionalPvW)) : 0,
                    thresholdW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.thresholdW))) ? Math.round(Number(feneconHybridCtx.thresholdW)) : null,
                    forecastW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.forecastW))) ? Math.round(Number(feneconHybridCtx.forecastW)) : 0,
                    dayNoWrite: !!(feneconHybridCtx && feneconHybridCtx.dayNoWriteEnabled),
                    dayOrPvActive: !!(feneconHybridCtx && feneconHybridCtx.dayOrPvActive),
                    clockDayActive: !!(feneconHybridCtx && feneconHybridCtx.clockDayActive),
                    assistEnabled: !!(feneconHybridCtx && feneconHybridCtx.assistEnabled),
                    assistActive: !!(feneconHybridCtx && feneconHybridCtx.assistActive),
                    assistImportThresholdW: (feneconHybridCtx && Number.isFinite(Number(feneconHybridCtx.assistImportThresholdW))) ? Math.round(Number(feneconHybridCtx.assistImportThresholdW)) : null,
                    reason: feneconHybridCtx && feneconHybridCtx.reason ? String(feneconHybridCtx.reason) : '',
                    watchdogSec: 1,
                    setGridActivePowerUsed: false,
                } : {
                    hybridMode: false,
                    configured: false,
                    farmBlocked: false,
                    mode: 'standard',
                    setGridActivePowerUsed: false,
                },
                limits: {
                    importLimitW: (typeof importLimitW === 'number' && Number.isFinite(importLimitW)) ? Math.round(importLimitW) : null,
                    importHeadroomW: (typeof importHeadroomEffW === 'number' && Number.isFinite(importHeadroomEffW)) ? Math.round(importHeadroomEffW) : null,
                },
                appPolicy: {
                    mode: multiUsePolicyActive ? 'multiuse' : 'eigenverbrauch',
                    storageControlActive: !!cfgEnabled,
                    autoTariffActive: !!autoTarifEnabled,
                    multiUseActive: !!multiUsePolicyActive,
                    inactiveMultiUseZonesIgnored: !!ignoreStaleMultiUsePolicy,
                    pureSelfConsumptionWithoutMultiUse: !multiUsePolicyActive,
                    storageFarmDistribution: !!hasFarmSetpoints,
                    storageFarmAutoStart: false,
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

        if (sungrowNoWrite || storageZeroNoWrite) {
            await this._setHoldNoWriteTargetDiag(targetW, reason, source, storageZeroWriteStatus || (sungrowNoWrite ? 'sungrow-hybrid:no-write' : 'storage:no-write'));
        } else {
            await this._applyTargetW(targetW, reason, source, { evcsAssistReqW });
            if (feneconHybridActive) this._feneconHybridWasExternal = true;
        }

        // Diagnose: Grenzen
        // (0 = unbegrenzt)
        await this._setIfChanged('speicher.regelung.maxChargeW', (maxChargeLimitW_cfg > 0) ? Math.round(maxChargeLimitW_cfg) : 0);
        await this._setIfChanged('speicher.regelung.maxDischargeW', (maxDischargeLimitW_cfg > 0) ? Math.round(maxDischargeLimitW_cfg) : 0);
        await this._setIfChanged('speicher.regelung.stepW', Math.round(stepW));
        await this._setIfChanged('speicher.regelung.maxDeltaWPerTick', Math.round(maxDelta));
        await this._setIfChanged('speicher.regelung.pvSchwelleW', Math.round(Math.max(0, num(cfg.pvExportThresholdW, 200))));
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
    /**
     * Code-Teil: _buildSelfNvpControlSignal
     * Zweck: Erzeugt fuer die Speicher-Eigenverbrauchsoptimierung einen ruhigen
     * NVP-Fuehrungswert, ohne die harten RAW-Schutzgrenzen zu verlieren.
     * Zusammenhang: Der Energieflussmonitor zeigte bei manchen Speichern ein
     * Pendeln zwischen kleinem Netzbezug und Einspeisung. Ursache sind schnelle
     * Messwertspruenge am NVP plus Speicher-/Gateway-Latenzen. Die Regelung nutzt
     * deshalb einen gleitend gefilterten NVP-Wert, reagiert aber bei deutlichem
     * Import/Export weiterhin sofort auf den RAW-Wert.
     */
    _buildSelfNvpControlSignal(rawOrFilteredW, nowMs, cfg = {}, targetW = 50, deadbandW = 50) {
        const raw = Number(rawOrFilteredW);
        const now = Number(nowMs) || Date.now();
        const smoothingEnabled = cfg.selfNvpSmoothingEnabled !== false;
        const filterSec = clamp(num(cfg.selfNvpSmoothingSec, 8), 0, 120);
        const rawGuardW = Math.max(50, num(cfg.selfNvpRawGuardW, Math.max(100, Number(deadbandW) || 50)));
        let filtered = Number(this._selfNvpFilteredW);
        let mode = 'raw';

        if (!Number.isFinite(raw)) {
            this._selfNvpFilteredW = null;
            this._selfNvpLastTs = 0;
            return { rawW: null, filteredW: null, controlW: null, mode: 'missing', smoothingEnabled: false, filterSec, rawGuardW };
        }

        if (!smoothingEnabled || filterSec <= 0 || !Number.isFinite(filtered) || !this._selfNvpLastTs) {
            filtered = raw;
            mode = smoothingEnabled && filterSec > 0 ? 'init' : 'raw';
        } else {
            const dtSec = clamp((now - Number(this._selfNvpLastTs || now)) / 1000, 0.1, 60);
            const alpha = clamp(dtSec / (filterSec + dtSec), 0.02, 1);
            filtered = filtered + (raw - filtered) * alpha;
            mode = 'filtered';
        }

        this._selfNvpFilteredW = filtered;
        this._selfNvpLastTs = now;

        // RAW-Guard: Der geglaettete Fuehrungswert darf kleine Messspruenge beruhigen,
        // aber keinen echten Anschlussfehler verstecken. Wenn RAW deutlich ausserhalb
        // des Zielbandes liegt, wird der schlechtere RAW-Wert als Regelfuehrung genutzt.
        const upperGuard = Number(targetW) + rawGuardW;
        const lowerGuard = Number(targetW) - rawGuardW;
        let control = filtered;
        if (raw > upperGuard) {
            control = Math.max(filtered, raw);
            mode = 'raw-import-guard';
        } else if (raw < lowerGuard) {
            control = Math.min(filtered, raw);
            mode = 'raw-export-guard';
        }

        return { rawW: raw, filteredW: filtered, controlW: control, mode, smoothingEnabled, filterSec, rawGuardW };
    }

    /**
     * Code-Teil: _resolveBatteryBalanceFeedback
     * Zweck: Liefert fuer alle Speicher-Hersteller eine stabile Batterie-
     * Istleistungsbasis, auch wenn Batterie- und NVP-Telemetrie asynchron kommen.
     *
     * Hintergrund:
     * Viele Wechselrichter/Adapter aktualisieren die Batterie-Istleistung nur alle
     * 10 bis 30 Sekunden, waehrend der NVP jede Sekunde kommt. Die alte Logik hat
     * den Batterie-Istwert bei zu grossem Zeitversatz komplett verworfen. Danach
     * wurde nur noch die kleine aktuelle NVP-Differenz geschrieben, wodurch Soll-
     * werte z. B. von 9 kW auf 300 W und im naechsten Messzyklus wieder auf mehrere
     * kW sprangen.
     *
     * Sicherheitsmodell:
     * - Ein echter, nicht auf einen Steuer-DP gemappter Istwert wird begrenzt
     *   gehalten (`holdAgeMs`).
     * - Ein nach diesem Messwert erfolgreich geschriebener Sollwert darf als
     *   kurzfristige Prognosebasis dienen, aber nur im selben Vorzeichen und nur
     *   innerhalb `maxPredictionDeltaW` um den letzten echten Messwert.
     * - Ohne jemals gesehenen gueltigen Istwert wird kein alter Sollwert als
     *   Batterie-Istleistung verwendet. Dann bleibt der sichere NVP-Fallback aktiv.
     * - Ein Mapping-/Quellenwechsel verwirft den Puffer sofort.
     */
    _resolveBatteryBalanceFeedback(ctx = {}) {
        const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
        const now = finite(ctx.nowMs) ? Number(ctx.nowMs) : Date.now();
        const objectId = String(ctx.objectId || '').trim();
        const source = String(ctx.source || 'single-storage').trim() || 'single-storage';
        const key = `${source}|${objectId}`;
        const mappingTrusted = ctx.mappingTrusted === true;
        const measuredW = finite(ctx.measuredW) ? Number(ctx.measuredW) : null;
        const measuredAgeMs = finite(ctx.measuredAgeMs) ? Math.max(0, Number(ctx.measuredAgeMs)) : null;
        const freshAgeMs = Math.max(250, finite(ctx.freshAgeMs) ? Number(ctx.freshAgeMs) : 8000);
        const holdAgeMs = Math.max(freshAgeMs, finite(ctx.holdAgeMs) ? Number(ctx.holdAgeMs) : 45000);
        const maxPredictionDeltaW = Math.max(0, finite(ctx.maxPredictionDeltaW) ? Number(ctx.maxPredictionDeltaW) : 2000);
        const zeroToleranceW = Math.max(0, finite(ctx.zeroToleranceW) ? Number(ctx.zeroToleranceW) : 100);
        const lastTargetW = finite(ctx.lastTargetW) ? Number(ctx.lastTargetW) : 0;
        const lastTargetWriteMs = finite(ctx.lastTargetWriteMs) ? Number(ctx.lastTargetWriteMs) : 0;
        const lastTargetAllowed = ctx.lastTargetAllowed === true;

        const resetCache = () => {
            this._batteryBalanceFeedback = {
                key,
                objectId,
                source,
                measuredW: null,
                sampleTs: 0,
            };
        };

        const cache = (this._batteryBalanceFeedback && typeof this._batteryBalanceFeedback === 'object')
            ? this._batteryBalanceFeedback
            : null;

        // Ein anderer Mess-DP oder ein Wechsel Einzel-Speicher <-> Farm darf nie
        // den alten Istwert als Basis weiterverwenden.
        if (!cache || String(cache.key || '') !== key) {
            resetCache();
        }

        // Ein erkannter Mapping-Fehler (Ist-DP zeigt auf Setpoint/ctrl) loescht den
        // Puffer sofort. Nur ein voruebergehend alter/fehlender Messwert darf gehalten
        // werden, niemals ein fachlich ungueltiger Datenpunkt.
        if (!mappingTrusted) {
            resetCache();
            return {
                usable: false,
                feedbackW: null,
                measuredW,
                measuredAgeMs,
                sampleAgeMs: null,
                sampleTs: 0,
                source: 'invalid-mapping',
                held: false,
                predicted: false,
                predictionDeltaW: 0,
                holdAgeMs,
                freshAgeMs,
                maxPredictionDeltaW,
                objectId,
            };
        }

        if (measuredW !== null && (measuredAgeMs === null || measuredAgeMs <= holdAgeMs)) {
            const sampleTs = measuredAgeMs === null ? now : Math.max(0, now - measuredAgeMs);
            const current = this._batteryBalanceFeedback;
            const currentTs = finite(current && current.sampleTs) ? Number(current.sampleTs) : 0;
            const currentW = finite(current && current.measuredW) ? Number(current.measuredW) : null;

            // Gleicher Zeitstempel mit geaendertem Wert kommt bei einigen Alias-/
            // Adapterpfaden vor. Auch dann aktualisieren wir den Messwert.
            if (!currentTs || sampleTs > currentTs || (sampleTs === currentTs && currentW !== measuredW)) {
                this._batteryBalanceFeedback = {
                    key,
                    objectId,
                    source,
                    measuredW,
                    sampleTs,
                };
            }
        }

        const resolved = this._batteryBalanceFeedback;
        const sampleW = finite(resolved && resolved.measuredW) ? Number(resolved.measuredW) : null;
        const sampleTs = finite(resolved && resolved.sampleTs) ? Number(resolved.sampleTs) : 0;
        const sampleAgeMs = sampleTs > 0 ? Math.max(0, now - sampleTs) : null;
        const sampleUsable = sampleW !== null && sampleAgeMs !== null && sampleAgeMs <= holdAgeMs;

        if (!sampleUsable) {
            return {
                usable: false,
                feedbackW: null,
                measuredW,
                measuredAgeMs,
                sampleAgeMs,
                sampleTs,
                source: sampleW === null ? 'missing' : 'expired',
                held: false,
                predicted: false,
                predictionDeltaW: 0,
                holdAgeMs,
                freshAgeMs,
                maxPredictionDeltaW,
                objectId,
            };
        }

        const held = sampleAgeMs > freshAgeMs;
        let feedbackW = sampleW;
        let predicted = false;
        let predictionDeltaW = 0;
        let feedbackSource = held ? 'battery-held' : 'battery-live';

        // Liegt der letzte erfolgreich geschriebene NVP-Sollwert zeitlich nach dem
        // letzten echten Istwert, kann er die noch nicht aktualisierte Telemetrie
        // kurzfristig fortschreiben. Das Prognosefenster ist absolut begrenzt und
        // erlaubt keinen direkten Vorzeichenwechsel. Dadurch bleibt z. B. 8,4 kW
        // Ist + 0,5 kW Korrektur als ca. 8,9-kW-Basis erhalten, ohne aus einem
        // alten Sollwert unkontrolliert 71 kW hochzuintegrieren.
        const targetWriteAgeMs = lastTargetWriteMs > 0 ? Math.max(0, now - lastTargetWriteMs) : null;
        const targetAfterSample = lastTargetWriteMs > (sampleTs + 25);
        const sameDirection = Math.abs(sampleW) <= zeroToleranceW
            || Math.sign(lastTargetW) === Math.sign(sampleW);
        const targetRecentEnough = targetWriteAgeMs !== null && targetWriteAgeMs <= holdAgeMs;

        if (
            lastTargetAllowed
            && lastTargetW !== 0
            && targetAfterSample
            && targetRecentEnough
            && sameDirection
            && maxPredictionDeltaW > 0
        ) {
            predictionDeltaW = clamp(lastTargetW - sampleW, -maxPredictionDeltaW, maxPredictionDeltaW);
            feedbackW = sampleW + predictionDeltaW;
            predicted = Math.abs(predictionDeltaW) > 0;
            if (predicted) feedbackSource = held ? 'battery-held-command-predicted' : 'battery-live-command-predicted';
        }

        return {
            usable: true,
            feedbackW,
            measuredW: sampleW,
            measuredAgeMs,
            sampleAgeMs,
            sampleTs,
            source: feedbackSource,
            held,
            predicted,
            predictionDeltaW,
            holdAgeMs,
            freshAgeMs,
            maxPredictionDeltaW,
            objectId,
        };
    }

    /**
     * Code-Teil: _buildIndependentPvLoadFeedForward
     * Zweck: Ermittelt einen absoluten Speicher-Sollwert aus direkt gemessener
     * PV-Erzeugung und direkt gemessenem Gebaeudeverbrauch. Dieser Wert ist nur
     * eine unabhaengige Ersatz-/Plausibilitaetsgroesse fuer den NVP-Regelkreis.
     *
     * Wichtig gegen Regel-Loops:
     * - Die normale Regelgleichung bleibt Batterie-Ist + NVP-Differenz.
     * - PV wird dort NICHT zusaetzlich addiert, weil sie im NVP bereits enthalten ist.
     * - Fuer Feed-forward ist nur ein direkt gemappter Verbrauchswert erlaubt.
     *   Ein aus PV + NVP + Speicher abgeleiteter Gebaeudeverbrauch wuerde den
     *   Ausgang des Regelkreises wieder in seinen Eingang fuehren.
     * - Bei aktivem EVCS-Speicherschutz wird Feed-forward nicht verwendet, weil
     *   je nach Zaehlerkonzept nicht sicher erkennbar ist, ob der direkte Last-DP
     *   die Wallbox bereits enthaelt. Der NVP-Regelkreis bleibt dann fuehrend.
     */
    _buildIndependentPvLoadFeedForward(ctx = {}) {
        const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
        const now = finite(ctx.nowMs) ? Number(ctx.nowMs) : Date.now();
        const staleMs = Math.max(1000, finite(ctx.staleMs) ? Number(ctx.staleMs) : 15000);
        const maxSkewMs = Math.max(0, finite(ctx.maxSkewMs) ? Number(ctx.maxSkewMs) : 15000);
        const targetNvpW = finite(ctx.targetNvpW) ? Number(ctx.targetNvpW) : 0;
        const rawNvpW = finite(ctx.rawNvpW) ? Number(ctx.rawNvpW) : null;
        const nvpAgeMs = finite(ctx.nvpAgeMs) ? Math.max(0, Number(ctx.nvpAgeMs)) : null;
        const protectedEvcsLoadW = Math.max(0, finite(ctx.protectedEvcsLoadW) ? Number(ctx.protectedEvcsLoadW) : 0);
        const adapter = this.adapter || {};

        const getCacheRecord = (key) => {
            try {
                return adapter && adapter.stateCache ? adapter.stateCache[String(key || '').trim()] || null : null;
            } catch {
                return null;
            }
        };
        const getCacheAgeMs = (key) => {
            try {
                if (adapter && typeof adapter._nwGetCacheAgeMs === 'function') {
                    const age = adapter._nwGetCacheAgeMs(key, now);
                    return finite(age) ? Math.max(0, Number(age)) : null;
                }
            } catch {
                // Fallback auf den lokalen State-Cache.
            }
            const rec = getCacheRecord(key);
            const ts = Number(rec && rec.ts);
            return Number.isFinite(ts) && ts > 0 ? Math.max(0, now - ts) : null;
        };
        const getCacheValue = (key, fallback = null) => {
            try {
                if (adapter && typeof adapter._nwGetNumberFromCacheFresh === 'function') {
                    const value = adapter._nwGetNumberFromCacheFresh(key, staleMs, fallback, now);
                    return finite(value) ? Number(value) : fallback;
                }
            } catch {
                // Fallback auf den lokalen State-Cache.
            }
            const rec = getCacheRecord(key);
            const value = Number(rec && rec.value);
            const age = getCacheAgeMs(key);
            if (!Number.isFinite(value)) return fallback;
            if (age !== null && age > staleMs) return fallback;
            return value;
        };
        const getCacheString = (key) => {
            const rec = getCacheRecord(key);
            if (!rec || rec.value === null || rec.value === undefined) return '';
            return String(rec.value);
        };
        const isMapped = (key) => {
            try {
                if (adapter && typeof adapter._nwHasMappedDatapoint === 'function') {
                    return adapter._nwHasMappedDatapoint(key) === true;
                }
            } catch {
                // Fallback auf config.datapoints.
            }
            try {
                const dps = adapter && adapter.config && adapter.config.datapoints
                    ? adapter.config.datapoints
                    : {};
                return !!String(dps && dps[key] ? dps[key] : '').trim();
            } catch {
                return false;
            }
        };

        if (protectedEvcsLoadW > 0) {
            return {
                active: false,
                usable: false,
                reason: 'evcs-protected-load-active',
                targetW: null,
                expectedActualW: null,
                loadW: null,
                loadSource: '',
                loadAgeMs: null,
                pvW: null,
                pvSource: '',
                pvAgeMs: null,
                measurementSkewMs: null,
                aligned: false,
                nvpW: rawNvpW,
                nvpAgeMs,
                targetNvpW,
            };
        }

        let loadW = null;
        let loadSource = '';
        let loadAgeMs = null;
        const directLoadKeys = ['consumptionTotal', 'housePower'];
        for (const key of directLoadKeys) {
            if (!isMapped(key)) continue;
            const value = getCacheValue(key, null);
            if (!finite(value) || Number(value) < 0) continue;
            loadW = Math.max(0, Number(value));
            loadSource = `mapped:${key}`;
            loadAgeMs = getCacheAgeMs(key);
            break;
        }

        // Das Derived-Mirror ist nur erlaubt, wenn seine eigene Quellen-Diagnose
        // bestaetigt, dass es direkt aus einem gemappten Verbrauchs-DP stammt.
        if (loadW === null) {
            const derivedSource = getCacheString('derived.core.building.loadSource');
            if (/^mapped:(consumptionTotal|housePower)$/i.test(derivedSource)) {
                const value = getCacheValue('derived.core.building.loadTotalW', null);
                if (finite(value) && Number(value) >= 0) {
                    loadW = Math.max(0, Number(value));
                    loadSource = `derived:${derivedSource}`;
                    loadAgeMs = getCacheAgeMs('derived.core.building.loadTotalW');
                }
            }
        }

        const pvCandidates = [];
        const pushPv = (value, source, ageMs, priority = 0) => {
            if (!finite(value) || Number(value) < 0) return;
            const age = finite(ageMs) ? Math.max(0, Number(ageMs)) : null;
            if (age !== null && age > staleMs) return;
            pvCandidates.push({ w: Math.max(0, Number(value)), source, ageMs: age, priority });
        };

        const coupling = String(ctx.coupling || 'ac').trim().toLowerCase();
        if (coupling === 'dc' && finite(ctx.dcPvPowerW)) {
            pushPv(ctx.dcPvPowerW, 'st.dcPvPowerW', ctx.dcPvPowerAgeMs, 100);
        }
        for (const key of ['pvPower', 'productionTotal']) {
            if (!isMapped(key)) continue;
            pushPv(getCacheValue(key, null), `mapped:${key}`, getCacheAgeMs(key), key === 'pvPower' ? 80 : 60);
        }
        try {
            const psEntry = this.dp && typeof this.dp.getEntry === 'function' ? this.dp.getEntry('ps.pvW') : null;
            if (psEntry && this.dp && typeof this.dp.getNumberFresh === 'function') {
                pushPv(
                    this.dp.getNumberFresh('ps.pvW', staleMs, null),
                    'ps.pvW',
                    typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs('ps.pvW') : null,
                    70,
                );
            }
        } catch {
            // Ein fehlender optionaler PV-DP deaktiviert nur Feed-forward.
        }

        pvCandidates.sort((a, b) => (b.priority - a.priority) || (b.w - a.w));
        const selectedPv = pvCandidates.length ? pvCandidates[0] : null;
        const pvW = selectedPv ? selectedPv.w : null;
        const pvSource = selectedPv ? selectedPv.source : '';
        const pvAgeMs = selectedPv ? selectedPv.ageMs : null;

        const ages = [loadAgeMs, pvAgeMs, nvpAgeMs].filter((v) => finite(v)).map(Number);
        const measurementSkewMs = ages.length >= 2 ? Math.max(...ages) - Math.min(...ages) : 0;
        const nvpFresh = rawNvpW !== null && (nvpAgeMs === null || nvpAgeMs <= staleMs);
        const loadFresh = loadW !== null && (loadAgeMs === null || loadAgeMs <= staleMs);
        const pvFresh = pvW !== null && (pvAgeMs === null || pvAgeMs <= staleMs);
        const aligned = measurementSkewMs <= maxSkewMs;
        const usable = !!(nvpFresh && loadFresh && pvFresh && aligned);

        if (!usable) {
            let reason = 'missing-direct-pv-or-load';
            if (!nvpFresh) reason = 'nvp-missing-or-stale';
            else if (!loadFresh) reason = 'direct-load-missing-or-stale';
            else if (!pvFresh) reason = 'direct-pv-missing-or-stale';
            else if (!aligned) reason = 'pv-load-nvp-not-aligned';
            return {
                active: false,
                usable: false,
                reason,
                targetW: null,
                expectedActualW: null,
                loadW,
                loadSource,
                loadAgeMs,
                pvW,
                pvSource,
                pvAgeMs,
                measurementSkewMs,
                aligned,
                nvpW: rawNvpW,
                nvpAgeMs,
                targetNvpW,
            };
        }

        // NexoWatt-Vorzeichen: +W Entladen, -W Laden.
        const targetW = loadW - pvW - targetNvpW;
        const expectedActualW = loadW - pvW - rawNvpW;
        return {
            active: true,
            usable: true,
            reason: 'direct-pv-load-feed-forward',
            targetW,
            expectedActualW,
            loadW,
            loadSource,
            loadAgeMs,
            pvW,
            pvSource,
            pvAgeMs,
            measurementSkewMs,
            aligned,
            nvpW: rawNvpW,
            nvpAgeMs,
            targetNvpW,
        };
    }

    /**
     * Code-Teil: _buildActualAwareNvpBalance
     * Zweck: Berechnet den naechsten bidirektionalen Speicher-Sollwert aus der
     * echten Batterie-Istleistung und der aktuellen Abweichung am NVP.
     *
     * Physikalische Regelgleichung (NexoWatt-Vorzeichen):
     *   Batterie +W = Entladen, -W = Laden
     *   NVP      +W = Netzbezug, -W = Einspeisung
     *   Sollwert     = Batterie-Ist + (NVP-Ist - NVP-Ziel)
     *
     * Damit wird die aktuell bereits wirksame Lade-/Entladeleistung nicht bei
     * jedem Tick "vergessen". Beispiel: Speicher laedt 2,9 kW und am NVP sind
     * weitere 2,9 kW Export sichtbar. Das Rohziel ist dann rund -5,8 kW statt
     * erneut nur -2,9 kW. Umgekehrt wird bei Netzbezug die Differenz zur echten
     * Entladeleistung addiert.
     *
     * Sicherheits-/Stabilitaetsregeln:
     * - Batterie-Ist und RAW-NVP werden nur gemeinsam genutzt, wenn beide frisch
     *   und zeitlich ausreichend nah beieinander sind.
     * - Mehr Leistung wird mit der konfigurierten Delta-Grenze aufgebaut.
     * - Leistung in Richtung 0 darf schneller zurueckgenommen werden, damit bei
     *   Wolken/Lastabwurf kein unnoetiger Netzbezug oder Export stehen bleibt.
     * - Ein Richtungswechsel wird ohne 0-W-Zwischenrunde direkt ausgegeben.
     *   Der Speicher fuehrt den internen Stopp beim Wechsel selbst aus.
     * - Ohne vertrauenswuerdige Istleistung wird ein alter positiver Entlade-
     *   Sollwert niemals hochintegriert (Schutz gegen den frueheren 71-kW-Fehler).
     */
    _buildActualAwareNvpBalance(ctx = {}) {
        const finite = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
        const rawNvpW = finite(ctx.rawNvpW) ? Number(ctx.rawNvpW) : null;
        const fallbackNvpW = finite(ctx.fallbackNvpW)
            ? Number(ctx.fallbackNvpW)
            : rawNvpW;
        const targetNvpW = finite(ctx.targetNvpW) ? Number(ctx.targetNvpW) : 0;
        const deadbandW = Math.max(0, finite(ctx.deadbandW) ? Number(ctx.deadbandW) : 50);
        const batteryPowerW = finite(ctx.batteryPowerW) ? Number(ctx.batteryPowerW) : null;
        const batteryMeasuredW = finite(ctx.batteryMeasuredW) ? Number(ctx.batteryMeasuredW) : batteryPowerW;
        const batteryAgeMs = finite(ctx.batteryAgeMs) ? Math.max(0, Number(ctx.batteryAgeMs)) : null;
        const nvpAgeMs = finite(ctx.nvpAgeMs) ? Math.max(0, Number(ctx.nvpAgeMs)) : null;
        const feedbackMaxAgeMs = Math.max(500, finite(ctx.feedbackMaxAgeMs) ? Number(ctx.feedbackMaxAgeMs) : 8000);
        const nvpFeedbackMaxAgeMs = Math.max(250, finite(ctx.nvpFeedbackMaxAgeMs) ? Number(ctx.nvpFeedbackMaxAgeMs) : feedbackMaxAgeMs);
        const feedbackMaxSkewMs = Math.max(0, finite(ctx.feedbackMaxSkewMs) ? Number(ctx.feedbackMaxSkewMs) : 5000);
        const feedbackRequireAligned = ctx.feedbackRequireAligned === true;
        const batteryFeedbackSource = String(ctx.batteryFeedbackSource || 'battery-actual');
        const batteryFeedbackHeld = ctx.batteryFeedbackHeld === true;
        const batteryFeedbackPredicted = ctx.batteryFeedbackPredicted === true;
        const batteryFeedbackPredictionDeltaW = finite(ctx.batteryFeedbackPredictionDeltaW)
            ? Number(ctx.batteryFeedbackPredictionDeltaW)
            : 0;
        const batteryFeedbackHoldAgeMs = finite(ctx.batteryFeedbackHoldAgeMs)
            ? Math.max(0, Number(ctx.batteryFeedbackHoldAgeMs))
            : feedbackMaxAgeMs;
        const maxDischargeCorrectionW = Math.max(0, finite(ctx.maxDischargeCorrectionW) ? Number(ctx.maxDischargeCorrectionW) : 500);
        const maxChargeCorrectionW = Math.max(0, finite(ctx.maxChargeCorrectionW) ? Number(ctx.maxChargeCorrectionW) : maxDischargeCorrectionW);
        const lastTargetW = finite(ctx.lastTargetW) ? Number(ctx.lastTargetW) : 0;
        const lastTargetAllowed = ctx.lastTargetAllowed === true;
        const holdLastNonZeroInDeadband = ctx.holdLastNonZeroInDeadband === true;
        const stepW = Math.max(0, finite(ctx.stepW) ? Number(ctx.stepW) : 0);
        const feedForwardUsable = ctx.feedForwardUsable === true && finite(ctx.feedForwardTargetW);
        const feedForwardTargetW = feedForwardUsable ? Number(ctx.feedForwardTargetW) : null;
        const feedForwardExpectedActualW = feedForwardUsable && finite(ctx.feedForwardExpectedActualW)
            ? Number(ctx.feedForwardExpectedActualW)
            : null;
        const feedForwardPvW = feedForwardUsable && finite(ctx.feedForwardPvW) ? Number(ctx.feedForwardPvW) : null;
        const feedForwardLoadW = feedForwardUsable && finite(ctx.feedForwardLoadW) ? Number(ctx.feedForwardLoadW) : null;
        const feedForwardPvSource = String(ctx.feedForwardPvSource || '');
        const feedForwardLoadSource = String(ctx.feedForwardLoadSource || '');
        const feedForwardReason = String(ctx.feedForwardReason || '');
        const feedForwardMeasurementSkewMs = feedForwardUsable && finite(ctx.feedForwardMeasurementSkewMs)
            ? Math.max(0, Number(ctx.feedForwardMeasurementSkewMs))
            : null;
        const feedForwardPlausibilityW = Math.max(
            200,
            finite(ctx.feedForwardPlausibilityW) ? Number(ctx.feedForwardPlausibilityW) : 1000,
        );
        const measurementSkewMs = (batteryAgeMs !== null && nvpAgeMs !== null)
            ? Math.abs(batteryAgeMs - nvpAgeMs)
            : null;

        const batteryFresh = !!(
            ctx.batteryPowerTrusted === true
            && batteryPowerW !== null
            && batteryAgeMs !== null
            && batteryAgeMs <= feedbackMaxAgeMs
        );
        const nvpFreshForFeedback = !!(
            rawNvpW !== null
            && (nvpAgeMs === null || nvpAgeMs <= nvpFeedbackMaxAgeMs)
        );
        const measurementsAligned = !feedbackRequireAligned || measurementSkewMs === null || measurementSkewMs <= feedbackMaxSkewMs;
        const feedbackCandidateUsed = !!(batteryFresh && nvpFreshForFeedback && measurementsAligned);
        const feedbackPlausibilityErrorW = feedbackCandidateUsed && feedForwardExpectedActualW !== null
            ? batteryPowerW - feedForwardExpectedActualW
            : null;
        const feedbackRejectedByFeedForward = !!(
            feedbackCandidateUsed
            && feedForwardUsable
            && feedbackPlausibilityErrorW !== null
            && Math.abs(feedbackPlausibilityErrorW) > feedForwardPlausibilityW
        );
        const feedbackUsed = feedbackCandidateUsed && !feedbackRejectedByFeedForward;
        const nvpW = (feedbackCandidateUsed || feedForwardUsable) ? rawNvpW : fallbackNvpW;

        if (nvpW === null) {
            return {
                active: false,
                targetW: 0,
                rawTargetW: 0,
                baseW: 0,
                baseSource: 'missing-nvp',
                measuredBatteryW: batteryMeasuredW,
                actualBatteryW: null,
                nvpW: null,
                nvpTargetW: targetNvpW,
                nvpErrorW: 0,
                correctionW: 0,
                appliedCorrectionW: 0,
                feedbackUsed: false,
                batteryFresh,
                batteryAgeMs,
                nvpAgeMs,
                measurementSkewMs,
                measurementsAligned,
                feedbackRequireAligned,
                batteryFeedbackSource,
                batteryFeedbackHeld,
                batteryFeedbackPredicted,
                batteryFeedbackPredictionDeltaW,
                batteryFeedbackHoldAgeMs,
                feedbackMaxAgeMs,
                nvpFeedbackMaxAgeMs,
                mode: 'missing-nvp',
                outsideDeadband: false,
                holdingLastCommand: false,
                heldTargetW: 0,
                feedForwardAvailable: feedForwardUsable,
                feedForwardUsed: false,
                feedForwardTargetW,
                feedForwardExpectedActualW,
                feedForwardPvW,
                feedForwardLoadW,
                feedForwardPvSource,
                feedForwardLoadSource,
                feedForwardReason,
                feedForwardMeasurementSkewMs,
                feedbackPlausibilityErrorW,
                feedbackRejectedByFeedForward,
                feedForwardPlausibilityW,
                rampManaged: false,
            };
        }

        const nvpErrorW = nvpW - targetNvpW;
        const outsideDeadband = Math.abs(nvpErrorW) > deadbandW;
        let baseW = 0;
        let baseSource = 'zero-safe-fallback';

        if (feedbackUsed) {
            baseW = batteryPowerW;
            baseSource = batteryFeedbackSource || 'battery-actual';
        } else if (lastTargetAllowed) {
            // Ohne vertrauenswuerdige Istleistung ist der letzte Sollwert KEIN
            // Ersatz fuer die reale Batterie-Leistung. Er darf deshalb nur zum
            // sicheren Zurueckregeln in Richtung 0 verwendet werden. Ein weiteres
            // Aufaddieren auf einen alten Lade- oder Entladesollwert wuerde bei
            // ausbleibender Speicherreaktion erneut eine Sollwert-Rueckkopplung
            // erzeugen. Fuer den Leistungsaufbau gilt im Fallback ausschliesslich
            // die aktuell sichtbare NVP-Abweichung.
            const mayUseLastTargetForRelease = (lastTargetW > 0 && nvpErrorW < 0)
                || (lastTargetW < 0 && nvpErrorW > 0);
            if (mayUseLastTargetForRelease) {
                baseW = lastTargetW;
                baseSource = 'last-target-release-only';
            }
        }

        const holdToleranceW = Math.max(100, deadbandW, stepW > 0 ? stepW * 2 : 0);
        let rawTargetW = baseW;
        let correctionW = 0;
        let appliedCorrectionW = 0;
        let targetW = baseW;
        let mode = feedbackUsed ? 'feedback' : 'fallback';
        let holdingLastCommand = false;
        let heldTargetW = 0;
        let feedForwardUsed = false;

        /**
         * Absoluten Feed-forward-Sollwert kontrolliert anfahren.
         * Anders als die NVP-Korrektur ist `desiredW` bereits der vollstaendige
         * Zielwert. Deshalb wird er niemals noch einmal auf Batterie-Ist oder den
         * letzten Sollwert addiert. Der letzte Sollwert dient nur als Rampenanker.
         */
        const applyFeedForwardTarget = (desiredW, modePrefix) => {
            const desired = Number(desiredW) || 0;
            const anchor = lastTargetAllowed && Number.isFinite(lastTargetW) ? lastTargetW : 0;
            const crossesDirection = anchor !== 0
                && desired !== 0
                && Math.sign(anchor) !== Math.sign(desired);
            if (crossesDirection) {
                // Der Speichercontroller uebernimmt seinen internen Stopp beim
                // Richtungswechsel. NexoWatt schreibt den neuen Sollwert deshalb
                // direkt und erzeugt keine 0-W-Zwischenrunde.
                return {
                    targetW: desired,
                    appliedCorrectionW: desired - anchor,
                    mode: `${modePrefix}-direct-reverse`,
                };
            }

            const reducesMagnitude = anchor !== 0
                && Math.sign(anchor) === Math.sign(desired)
                && Math.abs(desired) < Math.abs(anchor);
            if (reducesMagnitude || desired === 0) {
                return {
                    targetW: desired,
                    appliedCorrectionW: desired - anchor,
                    mode: `${modePrefix}-fast-release`,
                };
            }

            const delta = desired - anchor;
            const positiveCap = maxDischargeCorrectionW > 0 ? maxDischargeCorrectionW : Math.abs(delta);
            const negativeCap = maxChargeCorrectionW > 0 ? maxChargeCorrectionW : Math.abs(delta);
            const applied = clamp(delta, -negativeCap, positiveCap);
            return {
                targetW: anchor + applied,
                appliedCorrectionW: applied,
                mode: `${modePrefix}-slew-limited`,
            };
        };

        if (!outsideDeadband) {
            // Eigenverbrauchs-/PV-Regelung: 0 W ist bei den konfigurierten Speichern
            // ein echter STOP-Befehl. Hat der letzte nicht-null Sollwert den NVP bereits
            // ins Zielband gebracht, wird genau dieser Sollwert weiter geschrieben.
            // Eine 0-W-Vorgabe erfolgt erst durch eine ausdrueckliche Schutz-/Stop-
            // Bedingung (SoC, Deaktivierung, fehlende Messung usw.).
            // Das Halten erhoeht den Sollwert niemals und kann daher den frueheren
            // Hochintegrationsfehler nicht wieder einfuehren.
            if (holdLastNonZeroInDeadband && lastTargetAllowed && Math.abs(lastTargetW) > 0) {
                targetW = lastTargetW;
                rawTargetW = lastTargetW;
                holdingLastCommand = true;
                heldTargetW = lastTargetW;
                mode = feedbackUsed ? 'feedback-hold-last-command' : 'fallback-hold-last-command';
            } else if (feedForwardUsable && feedForwardTargetW !== null && Math.abs(feedForwardTargetW) > 0) {
                const ff = applyFeedForwardTarget(feedForwardTargetW, 'feed-forward-deadband');
                targetW = ff.targetW;
                rawTargetW = feedForwardTargetW;
                baseW = 0;
                baseSource = 'pv-load-feed-forward';
                correctionW = feedForwardTargetW;
                appliedCorrectionW = ff.appliedCorrectionW;
                mode = ff.mode;
                feedForwardUsed = true;
            // Standardpfade (z. B. Tarif) halten nur einen zur echten Istleistung
            // passenden Sollwert. Dadurch bleibt deren bisheriges Verhalten erhalten.
            } else if (feedbackUsed && lastTargetAllowed && Math.sign(lastTargetW) === Math.sign(baseW) && Math.abs(lastTargetW - baseW) <= holdToleranceW) {
                targetW = lastTargetW;
                rawTargetW = baseW;
                mode = 'feedback-hold-command';
            } else if (feedbackUsed) {
                targetW = baseW;
                rawTargetW = baseW;
                mode = 'feedback-track-actual';
            } else {
                targetW = 0;
                rawTargetW = 0;
                baseW = 0;
                baseSource = 'deadband-no-feedback';
                mode = 'fallback-deadband-zero';
            }
        } else if (feedForwardUsable && (!feedbackUsed || feedbackRejectedByFeedForward)) {
            const ff = applyFeedForwardTarget(feedForwardTargetW, feedbackRejectedByFeedForward
                ? 'feed-forward-reject-feedback'
                : 'feed-forward-no-feedback');
            targetW = ff.targetW;
            rawTargetW = feedForwardTargetW;
            baseW = 0;
            baseSource = 'pv-load-feed-forward';
            correctionW = feedForwardTargetW;
            appliedCorrectionW = ff.appliedCorrectionW;
            mode = ff.mode;
            feedForwardUsed = true;
        } else {
            correctionW = nvpErrorW;
            rawTargetW = baseW + correctionW;

            const crossesDirection = baseW !== 0
                && rawTargetW !== 0
                && Math.sign(baseW) !== Math.sign(rawTargetW);
            const reducesMagnitude = baseW !== 0
                && !crossesDirection
                && Math.abs(rawTargetW) < Math.abs(baseW);

            if (crossesDirection) {
                // Direkter Lade-/Entladewechsel: Die Speichersysteme stoppen intern
                // beim Wechsel. Sicherheits-Caps, SoC-Grenzen und Hardware-Gates
                // bleiben nachgelagert voll wirksam.
                targetW = rawTargetW;
                appliedCorrectionW = correctionW;
                mode = `${mode}-direct-reverse`;
            } else if (reducesMagnitude) {
                // Leistung zuruecknehmen darf schneller erfolgen als Leistung aufbauen.
                // Dadurch wird bei Lastabwurf/Wolken nicht weiter gegen den NVP gefahren.
                targetW = rawTargetW;
                appliedCorrectionW = correctionW;
                mode = `${mode}-fast-release`;
            } else if (!feedbackUsed && baseW === 0) {
                // Ohne Batterie-Istleistung ist nur die aktuelle NVP-Abweichung
                // belastbar. Sie wird direkt als konservativer Lade-/Entladewunsch
                // verwendet. Dadurch entsteht weder die alte 50-%-Fixpunktlogik
                // noch eine Hochintegration aus einem vergangenen Sollwert. Die
                // nachgelagerten Lade-/Entlade-Caps bleiben als harte Grenzen aktiv.
                targetW = rawTargetW;
                appliedCorrectionW = correctionW;
                mode = correctionW >= 0 ? 'fallback-direct-import' : 'fallback-direct-export';
            } else {
                // Mehr Entladung bzw. mehr Beladung wird kontrolliert aufgebaut. Die
                // Korrektur bezieht sich auf die echte Istleistung, nicht auf einen
                // moeglicherweise veralteten letzten Sollwert.
                const positiveCap = maxDischargeCorrectionW > 0 ? maxDischargeCorrectionW : Math.abs(correctionW);
                const negativeCap = maxChargeCorrectionW > 0 ? maxChargeCorrectionW : Math.abs(correctionW);
                appliedCorrectionW = clamp(correctionW, -negativeCap, positiveCap);
                targetW = baseW + appliedCorrectionW;
                mode = `${mode}-slew-limited`;
            }
        }

        return {
            active: true,
            targetW,
            rawTargetW,
            baseW,
            baseSource,
            measuredBatteryW: batteryMeasuredW,
            actualBatteryW: feedbackUsed ? batteryPowerW : null,
            nvpW,
            nvpTargetW: targetNvpW,
            nvpErrorW,
            correctionW,
            appliedCorrectionW,
            feedbackUsed,
            batteryFresh,
            batteryAgeMs,
            nvpAgeMs,
            measurementSkewMs,
            measurementsAligned,
            feedbackRequireAligned,
            batteryFeedbackSource,
            batteryFeedbackHeld,
            batteryFeedbackPredicted,
            batteryFeedbackPredictionDeltaW,
            batteryFeedbackHoldAgeMs,
            feedbackMaxAgeMs,
            nvpFeedbackMaxAgeMs,
            mode,
            outsideDeadband,
            holdingLastCommand,
            heldTargetW,
            feedForwardAvailable: feedForwardUsable,
            feedForwardUsed,
            feedForwardTargetW,
            feedForwardExpectedActualW,
            feedForwardPvW,
            feedForwardLoadW,
            feedForwardPvSource,
            feedForwardLoadSource,
            feedForwardReason,
            feedForwardMeasurementSkewMs,
            feedbackPlausibilityErrorW,
            feedbackRejectedByFeedForward,
            feedForwardPlausibilityW,
            // Auch der konservative Fallback begrenzt seinen Aufbau bereits selbst.
            // Deshalb darf die nachgelagerte Rampe niemals einen alten Sollwert wieder
            // in den aktuellen sicheren Balancing-Wert hineinziehen.
            rampManaged: true,
        };
    }

    _getCfg() {
        const storage = (this.adapter.config && this.adapter.config.storage) ? this.adapter.config.storage : {};
        return {
            controlMode: storage.controlMode,
            datapoints: storage.datapoints && typeof storage.datapoints === 'object' ? storage.datapoints : {},
            // Einzel-Speicher-Typ aus dem App-Center. AC bleibt der Standard.
            // DC/Hybrid nutzt zusaetzlich den optionalen PV-Erzeugungs-DP st.dcPvPowerW,
            // damit FENECON-/0-Einspeise-Erkennung nicht den Batterie-Sollwert mit PV verwechselt.
            coupling: (String(storage.coupling || 'ac').trim().toLowerCase() === 'dc') ? 'dc' : 'ac',
            dcPvPowerObjectId: storage.datapoints && storage.datapoints.dcPvPowerObjectId,
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
            // Herstellerprofile: generisch bleibt die normale Eigenverbrauchslogik,
            // FENECON/OpenEMS nutzt gegateten Watchdog-Refresh/Assist. Sungrow nutzt ab 0.8.96 denselben
            // geschlossenen NVP-Regelkreis wie Generic/E3DC/Farm; alte PV-Deckungs-
            // Nullkommandos werden nicht mehr ausgewertet.
            vendorProfile: storage.vendorProfile,
            sungrowHybridEnabled: storage.sungrowHybridEnabled,
            sungrowPvThresholdW: storage.sungrowPvThresholdW,
            sungrowLoadCoverReserveW: storage.sungrowLoadCoverReserveW,
            sungrowTargetGridImportW: storage.sungrowTargetGridImportW,
            sungrowImportThresholdW: storage.sungrowImportThresholdW,
            sungrowAssistBufferW: storage.sungrowAssistBufferW,
            // E3/DC RSCP Herstellerprofil: NexoWatt schreibt keine signed Batterie-
            // Sollleistung, sondern das vom ioBroker.e3dc-rscp Adapter erwartete
            // Tupel EMS.SET_POWER_MODE + EMS.SET_POWER_VALUE. PowerLimits sind
            // optional und werden nur geschrieben, wenn der Installer sie bewusst aktiviert.
            e3dcRscpEnabled: storage.e3dcRscpEnabled,
            e3dcZeroMode: storage.e3dcZeroMode,
            e3dcAllowGridCharge: storage.e3dcAllowGridCharge,
            e3dcUsePowerLimits: storage.e3dcUsePowerLimits,
            // Legacy: feneconAcMode bleibt als Migrations-Alias erhalten.
            // feneconGridControlEnabled ist aus UI-/Migrationsgründen der gespeicherte
            // Haken, bedeutet ab 0.6.255 aber: Hybrid-/Gateway-Priorität-Gateway-Priorität.
            feneconAcMode: storage.feneconAcMode,
            feneconGridControlEnabled: storage.feneconGridControlEnabled,
            // FENECON/OpenEMS/FEMS Legacy-Feld: wird ab 0.8.124 nur noch fuer
            // Migration/Diagnose gelesen. Der technische No-Write-Pfad ist fest
            // deaktiviert; die externe Vorgabe bleibt an den AppCenter-DP gekoppelt.
            feneconDayNoWriteEnabled: storage.feneconDayNoWriteEnabled,
            feneconAssistEnabled: storage.feneconAssistEnabled,
            feneconDayClockFallbackEnabled: storage.feneconDayClockFallbackEnabled,
            feneconDayStartHour: storage.feneconDayStartHour,
            feneconDayEndHour: storage.feneconDayEndHour,
            feneconForecastThresholdW: storage.feneconForecastThresholdW,
            feneconAssistImportThresholdW: storage.feneconAssistImportThresholdW,
            feneconAssistDelaySec: storage.feneconAssistDelaySec,
            feneconAssistReleaseImportW: storage.feneconAssistReleaseImportW,
            feneconAssistReleaseDelaySec: storage.feneconAssistReleaseDelaySec,
            feneconAssistTargetGridImportW: storage.feneconAssistTargetGridImportW,
            feneconAssistBufferW: storage.feneconAssistBufferW,
            feneconPvPassthroughThresholdW: storage.feneconPvPassthroughThresholdW,
            feneconAdditionalPvThresholdW: storage.feneconAdditionalPvThresholdW,
            feneconGridTargetW: storage.feneconGridTargetW,
            feneconGridExportBufferW: storage.feneconGridExportBufferW,
            feneconGridMinSetpointW: storage.feneconGridMinSetpointW,
            feneconGridMaxSetpointW: storage.feneconGridMaxSetpointW,
            feneconGridWriteIntervalSec: storage.feneconGridWriteIntervalSec,
            feneconGridResetOnDisable: storage.feneconGridResetOnDisable,
            selfMinSocPct: storage.selfMinSocPct,
            selfMaxSocPct: storage.selfMaxSocPct,
            selfTargetGridImportW: storage.selfTargetGridImportW,
            selfImportThresholdW: storage.selfImportThresholdW,
            selfNvpSmoothingEnabled: storage.selfNvpSmoothingEnabled,
            selfNvpSmoothingSec: storage.selfNvpSmoothingSec,
            selfNvpRawGuardW: storage.selfNvpRawGuardW,
            // Herstellerunabhaengige Istwert-Halte-/Prognoseparameter fuer das
            // geschlossene NVP-Balancing. `balanceFeedbackHoldSec` ist im
            // AppCenter sichtbar; die weiteren Werte bleiben Expertenparameter.
            balanceFeedbackHoldSec: storage.balanceFeedbackHoldSec,
            balanceFeedbackPredictionSteps: storage.balanceFeedbackPredictionSteps,
            balanceFeedbackPredictionMaxW: storage.balanceFeedbackPredictionMaxW,
            // Legacy-/Expertenparameter bleiben lesbar, damit bestehende
            // Installationen ihre bisherigen Tuningwerte nicht verlieren.
            balanceFeedbackMaxAgeMs: storage.balanceFeedbackMaxAgeMs,
            balanceFeedbackMaxSkewMs: storage.balanceFeedbackMaxSkewMs,
            // Direkter PV-/Last-Feed-forward als herstellerunabhaengiger Fallback.
            // Diese Expertenwerte sind absichtlich nicht im Kunden-UI sichtbar.
            balanceFeedForwardMaxAgeMs: storage.balanceFeedForwardMaxAgeMs,
            balanceFeedForwardMaxSkewMs: storage.balanceFeedForwardMaxSkewMs,
            balanceFeedForwardPlausibilityW: storage.balanceFeedForwardPlausibilityW,
            zeroWriteBudgetGraceSec: storage.zeroWriteBudgetGraceSec,
            zeroWriteMeasurementGraceSec: storage.zeroWriteMeasurementGraceSec,
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

    /**
     * Code-Teil: Methode `_isFeneconHybridControlConfigured`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Prüft die Speicherfarm mit derselben AppCenter-Regel wie Adapterkern und UI.
     * Die Farm ist nur aktiv, wenn die App installiert und eingeschaltet ist und
     * mindestens zwei reale Speicherzeilen konfiguriert sind. Das Legacy-Flag wird
     * ausschließlich verwendet, wenn noch kein AppCenter-Datensatz existiert.
     * Dadurch greifen Regelung, Kapazitätsberechnung und Schreibverteilung nicht
     * versehentlich auf eine alte oder nur teilweise konfigurierte Farm zurück.
     */
    /**
     * Lokaler Zugriff auf die zentrale Speicher-Steuerhoheit. Der Adapterkern ist
     * autoritativ; der Fallback dient nur isolierten Modultests und Alt-Runtimes.
     */
    _getStorageControlAuthority() {
        try {
            if (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function') {
                const authority = this.adapter._nwGetStorageControlAuthority();
                if (authority && typeof authority === 'object') return authority;
            }

            const rootCfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
            const appsRoot = (rootCfg.emsApps && typeof rootCfg.emsApps === 'object') ? rootCfg.emsApps : {};
            const apps = (appsRoot.apps && typeof appsRoot.apps === 'object') ? appsRoot.apps : {};
            const singleApp = (apps.storage && typeof apps.storage === 'object') ? apps.storage : null;
            const singleAppActive = singleApp
                ? (singleApp.installed === true && singleApp.enabled === true)
                : (rootCfg.enableStorageControl === true);

            const farm = (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
                ? this.adapter._nwGetStorageFarmRuntimeInfo()
                : null;
            const farmAggregationActive = farm
                ? !!farm.active
                : this._isStorageFarmEnabled();
            let farmDispatchActive = farm && typeof farm.dispatchActive === 'boolean'
                ? !!farm.dispatchActive
                : false;
            if (!farm && farmAggregationActive) {
                const sf = (rootCfg.storageFarm && typeof rootCfg.storageFarm === 'object') ? rootCfg.storageFarm : {};
                const rows = Array.isArray(sf.storages) ? sf.storages : [];
                farmDispatchActive = rows.some((row) => row && row.enabled !== false && (
                    String(row.setSignedPowerId || row.targetPowerObjectId || row.targetPowerId || '').trim()
                    || String(row.setChargePowerId || row.targetChargePowerObjectId || row.targetChargePowerId || '').trim()
                    || String(row.setDischargePowerId || row.targetDischargePowerObjectId || row.targetDischargePowerId || '').trim()
                ));
            }

            const selectedTopology = farmDispatchActive ? 'farm' : (singleAppActive ? 'single' : 'none');
            const installerCfg = (rootCfg.installerConfig && typeof rootCfg.installerConfig === 'object')
                ? rootCfg.installerConfig
                : {};
            const multiUseCfg = (installerCfg.storageMultiUse && typeof installerCfg.storageMultiUse === 'object')
                ? installerCfg.storageMultiUse
                : null;
            return {
                selectedTopology,
                writerActive: selectedTopology !== 'none',
                reason: farmDispatchActive
                    ? (singleAppActive ? 'writable-farm-precedes-single' : 'writable-farm-active')
                    : (singleAppActive
                        ? (farmAggregationActive ? 'single-active-farm-read-only' : 'single-active')
                        : (farmAggregationActive ? 'farm-read-only-no-writer' : 'no-active-storage-output')),
                singleAppActive: !!singleAppActive,
                singleSuppressedByFarm: selectedTopology === 'farm' && !!singleAppActive,
                farmAggregationActive: !!farmAggregationActive,
                farmDispatchActive: !!farmDispatchActive,
                farm: farm || { active: !!farmAggregationActive, dispatchActive: !!farmDispatchActive, rows: [] },
                multiUsePolicyActive: !!(rootCfg.enableMultiUse === true && multiUseCfg && multiUseCfg.enabled === true),
            };
        } catch {
            return {
                selectedTopology: 'none',
                writerActive: false,
                reason: 'authority-error',
                singleAppActive: false,
                singleSuppressedByFarm: false,
                farmAggregationActive: false,
                farmDispatchActive: false,
                farm: { active: false, dispatchActive: false, rows: [] },
                multiUsePolicyActive: false,
            };
        }
    }

    _isStorageFarmEnabled() {
        try {
            // Der Adapterkern besitzt die autoritative AppCenter-/Zeilenbewertung.
            // Hersteller- und Speicherregelung verwenden exakt denselben Aktivzustand
            // wie Aggregation, Navigation und Energiefluss.
            if (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function') {
                const info = this.adapter._nwGetStorageFarmRuntimeInfo();
                return !!(info && info.active);
            }

            const rootCfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
            const sf = (rootCfg.storageFarm && typeof rootCfg.storageFarm === 'object') ? rootCfg.storageFarm : {};
            const rows = Array.isArray(sf.storages) ? sf.storages : [];
            const realKeys = [
                'socId', 'chargePowerId', 'dischargePowerId', 'signedPowerId',
                'setChargePowerId', 'setDischargePowerId', 'setSignedPowerId',
                'availableId', 'faultId', 'chargeAllowedId', 'dischargeAllowedId',
            ];
            const configuredCount = rows.filter((row) => {
                if (!row || typeof row !== 'object' || row.enabled === false) return false;
                return realKeys.some((key) => String(row[key] || '').trim());
            }).length;

            const appsRoot = (rootCfg.emsApps && typeof rootCfg.emsApps === 'object') ? rootCfg.emsApps : {};
            const apps = (appsRoot.apps && typeof appsRoot.apps === 'object') ? appsRoot.apps : {};
            const app = (apps.storagefarm && typeof apps.storagefarm === 'object')
                ? apps.storagefarm
                : ((apps.storageFarm && typeof apps.storageFarm === 'object') ? apps.storageFarm : null);
            const enabledByConfig = app
                ? (app.installed === true && app.enabled === true)
                : (rootCfg.enableStorageFarm === true);

            return !!(enabledByConfig && configuredCount >= 2);
        } catch {
            return false;
        }
    }

    /**
     * Nur eine tatsächlich beschreibbare Farm darf den Einzel-Speicher-Schreibpfad
     * übernehmen. Reine Mess-/SoC-/Statuszeilen bleiben für Aggregation aktiv,
     * blockieren aber niemals die manuell zugeordneten st.*-Ziel-DPs.
     */
    _isStorageFarmDispatchEnabled() {
        return this._getStorageControlAuthority().selectedTopology === 'farm';
    }

    _getStorageVendorProfile(cfg = {}) {
        const raw = String((cfg && cfg.vendorProfile) || '').trim().toLowerCase();
        if (raw === 'fenecon' || raw === 'openems' || raw === 'fems' || raw === 'fenecon-openems') return 'fenecon-openems';
        if (raw === 'sungrow' || raw === 'sungrow-ess' || raw === 'sungrow-hybrid') return 'sungrow-hybrid';
        if (raw === 'e3dc' || raw === 'e3/dc' || raw === 'e3dc-rscp' || raw === 'e3dc-rscp-iobroker') return 'e3dc-rscp';
        // Migration: alte FENECON-Haken bleiben als Profil erkennbar, solange kein
        // explizites anderes Herstellerprofil gespeichert wurde.
        if (!raw && cfg && (cfg.feneconGridControlEnabled === true || cfg.feneconAcMode === true)) return 'fenecon-openems';
        if (!raw && cfg && cfg.sungrowHybridEnabled === true) return 'sungrow-hybrid';
        if (!raw && cfg && cfg.e3dcRscpEnabled === true) return 'e3dc-rscp';
        return 'generic';
    }

    _isFeneconHybridControlConfigured(cfg = {}) {
        const profile = this._getStorageVendorProfile(cfg);
        if (profile === 'fenecon-openems') return true;
        if (profile !== 'generic') return false;
        if (cfg && typeof cfg.feneconGridControlEnabled === 'boolean') return cfg.feneconGridControlEnabled === true;
        // Migration: ältere Installationen hatten nur storage.feneconAcMode.
        // Ab 0.6.255 bedeutet dieser alte Haken: Hybrid-/Gateway-Priorität-Sondermodus
        // (Gateway-Priorität am Tag, NexoWatt nur bei Zusatz-PV oder wenig/keiner PV).
        return !!(cfg && cfg.feneconAcMode === true);
    }

    _isSungrowHybridControlConfigured(cfg = {}) {
        return this._getStorageVendorProfile(cfg) === 'sungrow-hybrid';
    }

    _isE3dcRscpControlConfigured(cfg = {}) {
        return this._getStorageVendorProfile(cfg) === 'e3dc-rscp';
    }

    // Legacy-Alias für ältere interne Aufrufe.
    /**
     * Code-Teil: Methode `_isFeneconGridControlConfigured`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    _isFeneconGridControlConfigured(cfg = {}) {
        return this._isFeneconHybridControlConfigured(cfg);
    }
    async _buildSungrowHybridContext({
        cfg = {},
        staleMs = 15000,
        gridW = null,
        gridRawW = null,
        gridAgeMs = null,
        protectedEvcsLoadW = 0,
        coupling = 'ac',
        dcPvPowerW = null,
        dcPvPowerAgeMs = null,
    } = {}) {
        const thresholdW = Math.max(0, num(cfg.sungrowPvThresholdW, 300));
        const loadCoverReserveW = Math.max(0, num(cfg.sungrowLoadCoverReserveW, 300));
        const dischargeThresholdW = Math.max(0, num(cfg.sungrowImportThresholdW, num(cfg.selfImportThresholdW, 100)));
        const targetGridImportW = Math.max(0, num(cfg.sungrowTargetGridImportW, num(cfg.selfTargetGridImportW, 100)));
        const nvpW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW))
            ? Number(gridRawW)
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? Number(gridW) : null);
        const importW = (typeof nvpW === 'number') ? Math.max(0, nvpW) : 0;
        const exportW = (typeof nvpW === 'number') ? Math.max(0, -nvpW) : 0;

        // Das Herstellerprofil nutzt dieselbe direkte PV-/Lastquelle wie der
        // gemeinsame Feed-forward-Regler. Dadurch wird fuer Diagnose und Regelung
        // niemals ein aus PV + NVP + Speicher rueckgerechneter Lastwert verwendet.
        const feedForward = this._buildIndependentPvLoadFeedForward({
            nowMs: Date.now(),
            staleMs,
            maxSkewMs: Math.max(0, num(cfg.balanceFeedForwardMaxSkewMs, 15000)),
            rawNvpW: nvpW,
            nvpAgeMs: gridAgeMs,
            targetNvpW: targetGridImportW,
            protectedEvcsLoadW,
            coupling,
            dcPvPowerW,
            dcPvPowerAgeMs,
        });
        const pvW = feedForward.pvW !== null && feedForward.pvW !== undefined
            ? Math.max(0, Number(feedForward.pvW) || 0)
            : 0;
        const loadW = feedForward.loadW !== null && feedForward.loadW !== undefined
            ? Math.max(0, Number(feedForward.loadW) || 0)
            : 0;
        const pvActive = pvW >= thresholdW;
        const loadKnown = feedForward.usable === true && loadW >= 0;
        const pvCoversLoad = !!(loadKnown && pvActive && pvW >= (loadW + loadCoverReserveW));

        return {
            active: true,
            configured: true,
            mode: feedForward.usable ? 'nvp-closed-loop-with-direct-feed-forward' : 'nvp-closed-loop',
            writeMode: 'closed-loop-no-legacy-zero',
            reason: feedForward.usable
                ? 'Sungrow Hybrid ESS: NVP-Regelkreis mit direktem PV-/Last-Feed-forward'
                : `Sungrow Hybrid ESS: NVP-Regelkreis, Feed-forward nicht nutzbar (${String(feedForward.reason || 'keine direkten Messwerte')})`,
            pvW,
            pvSource: String(feedForward.pvSource || ''),
            thresholdW,
            loadW,
            loadWIncludingEvcs: loadW,
            protectedEvcsLoadW: Math.max(0, Number(protectedEvcsLoadW) || 0),
            loadSource: String(feedForward.loadSource || ''),
            loadCoverReserveW,
            loadKnown,
            pvActive,
            pvCoversLoad,
            targetGridImportW,
            dischargeThresholdW,
            nvpW,
            importW,
            exportW,
            feedForward,
        };
    }

    /**
     * Code-Teil: _setStorageNvpBalanceDiag
     * Zweck: Schreibt die herstellerunabhaengige Diagnose der geschlossenen
     * Speicher-NVP-Regelung. Damit ist im Feld sichtbar, ob die Vorgabe aus
     * Batterie-Istleistung plus NVP-Differenz entstanden ist oder ob wegen
     * alter/asynchroner Messwerte ein konservativer Fallback aktiv war.
     */
    async _setStorageNvpBalanceDiag(ctx = null) {
        const active = !!(ctx && ctx.active);
        const n = (v, fallback = null) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)))
            ? Math.round(Number(v))
            : fallback;
        await this._setIfChanged('speicher.regelung.balanceAktiv', active);
        await this._setIfChanged('speicher.regelung.balancePolicy', active ? String(ctx.policy || '') : '');
        await this._setIfChanged('speicher.regelung.balanceMesswertW', active ? n(ctx.measuredBatteryW) : null);
        await this._setIfChanged('speicher.regelung.balanceIstLeistungW', active ? n(ctx.actualBatteryW) : null);
        await this._setIfChanged('speicher.regelung.balanceIstLeistungAlterMs', active ? n(ctx.batteryAgeMs) : null);
        await this._setIfChanged('speicher.regelung.balanceBasisW', active ? n(ctx.baseW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpW', active ? n(ctx.nvpW) : null);
        await this._setIfChanged('speicher.regelung.balanceNvpAlterMs', active ? n(ctx.nvpAgeMs) : null);
        await this._setIfChanged('speicher.regelung.balanceNvpZielW', active ? n(ctx.nvpTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceNvpFehlerW', active ? n(ctx.nvpErrorW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceBasisQuelle', active ? String(ctx.baseSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceRohSollW', active ? n(ctx.rawTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceKorrekturW', active ? n(ctx.correctionW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceAngewandteKorrekturW', active ? n(ctx.appliedCorrectionW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceSollW', active ? n(ctx.targetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceFeedbackVerwendet', !!(active && ctx.feedbackUsed));
        await this._setIfChanged('speicher.regelung.balanceFeedbackQuelle', active ? String(ctx.batteryFeedbackSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedbackGehalten', !!(active && ctx.batteryFeedbackHeld));
        await this._setIfChanged('speicher.regelung.balanceFeedbackPrognoseAktiv', !!(active && ctx.batteryFeedbackPredicted));
        await this._setIfChanged('speicher.regelung.balanceFeedbackPrognoseDeltaW', active ? n(ctx.batteryFeedbackPredictionDeltaW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceFeedbackHaltezeitMs', active ? n(ctx.batteryFeedbackHoldAgeMs, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceMessversatzMs', active ? n(ctx.measurementSkewMs) : null);
        await this._setIfChanged('speicher.regelung.balanceMessungSynchronErforderlich', !!(active && ctx.feedbackRequireAligned));
        await this._setIfChanged('speicher.regelung.balanceMessungSynchron', !!(active && ctx.measurementsAligned));
        await this._setIfChanged('speicher.regelung.balanceModus', active ? String(ctx.mode || '') : 'inactive');
        await this._setIfChanged('speicher.regelung.balanceLetztenSollwertGehalten', !!(active && ctx.holdingLastCommand));
        await this._setIfChanged('speicher.regelung.balanceGehaltenSollW', active ? n(ctx.heldTargetW, 0) : 0);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardVerfuegbar', !!(active && ctx.feedForwardAvailable));
        await this._setIfChanged('speicher.regelung.balanceFeedForwardVerwendet', !!(active && ctx.feedForwardUsed));
        await this._setIfChanged('speicher.regelung.balanceFeedForwardSollW', active ? n(ctx.feedForwardTargetW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardErwarteteIstW', active ? n(ctx.feedForwardExpectedActualW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardPvW', active ? n(ctx.feedForwardPvW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardLastW', active ? n(ctx.feedForwardLoadW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedForwardPvQuelle', active ? String(ctx.feedForwardPvSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedForwardLastQuelle', active ? String(ctx.feedForwardLoadSource || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedForwardGrund', active ? String(ctx.feedForwardReason || '') : '');
        await this._setIfChanged('speicher.regelung.balanceFeedForwardMessversatzMs', active ? n(ctx.feedForwardMeasurementSkewMs) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedbackPlausibilitaetsfehlerW', active ? n(ctx.feedbackPlausibilityErrorW) : null);
        await this._setIfChanged('speicher.regelung.balanceFeedbackDurchFeedForwardVerworfen', !!(active && ctx.feedbackRejectedByFeedForward));
    }

    /**
     * Code-Teil: Methode `_setSungrowHybridDiag`
     * Zweck: schreibt Diagnosewerte fuer das Sungrow-Herstellerprofil.
     * Zusammenhang: Macht im Feld sichtbar, ob NexoWatt externe Vorgaben auf 0
     * setzt, weil PV die Last deckt, oder ob ein NVP-begrenzter Assist aktiv ist.
     */
    async _setSungrowHybridDiag(ctx = {}) {
        const active = !!ctx.active;
        const n = (v, fallback = null) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback;
        await this._setIfChanged('speicher.regelung.sungrowHybridAktiv', active);
        await this._setIfChanged('speicher.regelung.sungrowHybridModus', String(ctx.mode || ''));
        await this._setIfChanged('speicher.regelung.sungrowHybridGrund', String(ctx.reason || ''));
        await this._setIfChanged('speicher.regelung.sungrowHybridSchreibmodus', String(ctx.writeMode || ''));
        await this._setIfChanged('speicher.regelung.sungrowHybridSollW', n(ctx.targetW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridPvW', n(ctx.pvW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridLastW', n(ctx.loadW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpW', n(ctx.nvpW));
        await this._setIfChanged('speicher.regelung.sungrowHybridImportW', n(ctx.importW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridExportW', n(ctx.exportW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridPvDecktLast', !!ctx.pvCoversLoad);
        await this._setIfChanged('speicher.regelung.sungrowHybridSchwelleW', n(ctx.thresholdW, 300));
        await this._setIfChanged('speicher.regelung.sungrowHybridLastReserveW', n(ctx.loadCoverReserveW, 300));
        await this._setIfChanged('speicher.regelung.sungrowHybridImportSchwelleW', n(ctx.dischargeThresholdW, 100));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpZielW', n(ctx.nvpTargetW, 100));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpDeadbandW', n(ctx.nvpDeadbandW, 100));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpFehlerW', n(ctx.nvpErrorW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpBalanceBasisW', n(ctx.nvpBalanceBaseW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpBalanceZielW', n(ctx.nvpBalanceTargetW, 0));
        await this._setIfChanged('speicher.regelung.sungrowHybridNvpBalanceAktiv', !!ctx.nvpBalanceNeeded);
    }

    /**
     * Code-Teil: _isE3dcGridChargeSource
     * Zweck: Erkennt, ob ein negativer Speicher-Sollwert wirklich Netzladen bedeutet.
     * Zusammenhang: E3/DC unterscheidet bei SET_POWER_MODE zwischen CHARGE und
     * GRID_CHARGE. Standard-PV-Laden bleibt CHARGE; GRID_CHARGE wird nur fuer
     * Tarif-/Reserve-/LSK-Nachladung verwendet und muss im Herstellerprofil erlaubt sein.
     */
    _isE3dcGridChargeSource(source) {
        const s = String(source || '').trim().toLowerCase();
        return s === 'tarif'
            || s === 'tarif_grid_charge'
            || s === 'tarif-netzladen'
            || s === 'reserve'
            || s === 'reserve_grid'
            || s === 'reserve-netzladen'
            || s === 'lastspitze_refill'
            || s === 'lsk_refill'
            || s === 'grid_charge';
    }

    /**
     * Code-Teil: _writeE3dcRscpTargetW
     * Zweck: Uebersetzt die NexoWatt-Konvention (+W Entladen, -W Laden) in die
     * ioBroker.e3dc-rscp-Datenpunkte EMS.SET_POWER_MODE und EMS.SET_POWER_VALUE.
     * Zusammenhang: Der e3dc-rscp Adapter reagiert auf Aenderungen beider States;
     * deshalb schreibt NexoWatt den Modus zuerst und danach den Leistungswert. So
     * wird bei Richtungswechseln nicht kurz die alte Richtung mit neuem Wert gesendet.
     */
    async _writeE3dcRscpTargetW(targetW, reason, source, cfg = {}) {
        const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        const absW = Math.max(0, Math.abs(w));
        const allowGridCharge = cfg.e3dcAllowGridCharge === true;
        const gridCharge = !!(w < 0 && allowGridCharge && this._isE3dcGridChargeSource(source));
        const zeroModeRaw = String(cfg.e3dcZeroMode || 'normal').trim().toLowerCase();
        const zeroModeCode = zeroModeRaw === 'idle' ? 1 : 0;

        // ioBroker.e3dc-rscp / RSCP SET_POWER_MODE:
        // 0=NORMAL, 1=IDLE, 2=DISCHARGE, 3=CHARGE, 4=GRID_CHARGE.
        // Bei 0 W wird standardmaessig NORMAL geschrieben, damit E3/DC wieder seine
        // eigene Eigenverbrauchslogik fuehren kann. IDLE bleibt als Expertenoption
        // verfuegbar, wenn bewusst eine Batteriepause gewuenscht ist.
        const modeCode = w > 0 ? 2 : (w < 0 ? (gridCharge ? 4 : 3) : zeroModeCode);
        const modeName = ({ 0: 'NORMAL', 1: 'IDLE', 2: 'DISCHARGE', 3: 'CHARGE', 4: 'GRID_CHARGE' })[modeCode] || 'NORMAL';
        const writes = [];
        let ok = true;

        const writeNumber = async (key, value) => {
            try {
                const res = await this.dp.writeNumber(key, value, false);
                writes.push({ key, value, result: res });
                if (res === false) ok = false;
                return res;
            } catch (_e) {
                writes.push({ key, value, result: false });
                ok = false;
                return false;
            }
        };
        const writeBoolean = async (key, value) => {
            try {
                const res = await this.dp.writeBoolean(key, value, false);
                writes.push({ key, value: !!value, result: res });
                if (res === false) ok = false;
                return res;
            } catch (_e) {
                writes.push({ key, value: !!value, result: false });
                ok = false;
                return false;
            }
        };

        // Optional: E3/DC PowerLimits aktivieren und die Maximalwerte mitfuehren.
        // Diese DPs sind nicht fuer den normalen Zielwert erforderlich, schuetzen aber
        // Anlagen, bei denen E3/DC die gesetzten Limits nur mit POWER_LIMITS_USED=true
        // beachtet. Der Haken bleibt bewusst aus, bis der Installer ihn aktiviert.
        const useLimits = cfg.e3dcUsePowerLimits === true;
        const hasLimitFlag = !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.e3dcPowerLimitsUsed'));
        const hasMaxCharge = !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.e3dcMaxChargePowerW'));
        const hasMaxDischarge = !!(this.dp && this.dp.getEntry && this.dp.getEntry('st.e3dcMaxDischargePowerW'));
        if (useLimits && hasLimitFlag) await writeBoolean('st.e3dcPowerLimitsUsed', true);
        const cfgMaxChargeW = Number(cfg.maxChargeW);
        const cfgMaxDischargeW = Number(cfg.maxDischargeW);
        if (useLimits && hasMaxCharge && Number.isFinite(cfgMaxChargeW) && cfgMaxChargeW > 0) await writeNumber('st.e3dcMaxChargePowerW', Math.round(cfgMaxChargeW));
        if (useLimits && hasMaxDischarge && Number.isFinite(cfgMaxDischargeW) && cfgMaxDischargeW > 0) await writeNumber('st.e3dcMaxDischargePowerW', Math.round(cfgMaxDischargeW));

        await writeNumber('st.e3dcSetPowerMode', modeCode);
        await writeNumber('st.e3dcSetPowerValueW', absW);

        this._e3dcRscpLastMode = modeName;
        await this._setE3dcRscpDiag({
            active: true,
            mode: modeName,
            modeCode,
            valueW: absW,
            targetW: w,
            writeMode: 'set-power',
            reason: String(reason || ''),
            source: String(source || ''),
            gridCharge,
            zeroMode: zeroModeCode === 1 ? 'idle' : 'normal',
            powerLimitsUsed: useLimits,
            ok,
        });

        return { ok, modeCode, modeName, valueW: absW, targetW: w, gridCharge, powerLimitsUsed: useLimits, writes };
    }

    /**
     * Code-Teil: _setE3dcRscpDiag
     * Zweck: Spiegeln des E3/DC-Schreibpfads in eigene Diagnose-States, damit keine
     * ioBroker-Warnungen durch fehlende Objekte entstehen und der Installateur sieht,
     * welches SET_POWER-Tupel zuletzt geschrieben wurde.
     */
    async _setE3dcRscpDiag(ctx = {}) {
        const n = (v, def = 0) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : def;
        await this._setIfChanged('speicher.regelung.e3dcRscpAktiv', !!ctx.active);
        await this._setIfChanged('speicher.regelung.e3dcRscpModus', String(ctx.mode || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpModeCode', n(ctx.modeCode, 0));
        await this._setIfChanged('speicher.regelung.e3dcRscpValueW', n(ctx.valueW, 0));
        await this._setIfChanged('speicher.regelung.e3dcRscpSollW', n(ctx.targetW, 0));
        await this._setIfChanged('speicher.regelung.e3dcRscpSchreibmodus', String(ctx.writeMode || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpQuelle', String(ctx.source || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpGrund', String(ctx.reason || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpGridCharge', !!ctx.gridCharge);
        await this._setIfChanged('speicher.regelung.e3dcRscpZeroMode', String(ctx.zeroMode || ''));
        await this._setIfChanged('speicher.regelung.e3dcRscpPowerLimitsUsed', !!ctx.powerLimitsUsed);
        await this._setIfChanged('speicher.regelung.e3dcRscpSchreibOk', ctx.ok === true);
    }

    async _buildFeneconHybridContext({ cfg = {}, staleMs = 15000, readCacheNumber = null, gridW = null, gridRawW = null } = {}) {
        const thresholdW = Math.max(0, num(cfg.feneconPvPassthroughThresholdW, 300));
        const additionalThresholdW = Math.max(0, num(cfg.feneconAdditionalPvThresholdW, 100));
        const forecastThresholdW = Math.max(0, num(cfg.feneconForecastThresholdW, 500));
        const now = Date.now();

        /**
         * Code-Teil: readCache
         * Zweck: Liest frische Fremd-/Mappingwerte fuer die FENECON-Erkennung.
         * Wichtig: Dieser Pfad darf keine Sollwerte schreiben; er entscheidet nur,
         * ob FEMS/OpenEMS intern regeln darf oder ob NexoWatt einen Assist braucht.
         */
        const readCache = (key) => {
            const sid = String(key || '').trim();
            if (!sid) return null;
            try {
                const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[sid] : null;
                if (rec) {
                    const age = Number.isFinite(Number(rec.ts)) ? (now - Number(rec.ts)) : 0;
                    if (age >= 0 && age <= staleMs) {
                        const n = Number(rec.value);
                        if (Number.isFinite(n)) return n;
                    }
                    return null;
                }
            } catch {
                // ignore
            }
            try {
                if (typeof readCacheNumber === 'function') {
                    const n = readCacheNumber(sid, null);
                    if (typeof n === 'number' && Number.isFinite(n)) return n;
                }
            } catch {
                // ignore
            }
            return null;
        };

        const candidates = [];
        /**
         * Code-Teil: pushCandidate
         * Zweck: Sammle moegliche PV-/Hybrid-AC-Leistungen. Bei FENECON sieht
         * NexoWatt haeufig nur den AC-Ausgang aus PV+Batterie; deshalb ist die
         * Erkennung bewusst breit, die eigentliche Leistungsregelung bleibt aber
         * spaeter hart am NVP begrenzt.
         */
        const pushCandidate = (value, source) => {
            const n = Number(value);
            if (Number.isFinite(n)) candidates.push({ w: Math.max(0, Math.abs(n)), source });
        };
        /**
         * Code-Teil: readOwnFreshNumber
         * Zweck: Liest eigene Diagnose-/Forecaststates frisch aus dem Adapter.
         * Damit bleibt die FENECON-Tages-/PV-Erkennung auch dann verfügbar,
         * wenn der Kunden-Gateway-AC-Ausgang nicht als klassische PV gemappt ist.
         */
        const readOwnFreshNumber = async (id) => {
            try {
                const st = await this.adapter.getStateAsync(id);
                if (!st) return null;
                const age = Number.isFinite(Number(st.ts)) ? (now - Number(st.ts)) : 0;
                if (age < 0 || age > staleMs) return null;
                const n = Number(st.val);
                return Number.isFinite(n) ? n : null;
            } catch {
                return null;
            }
        };

        pushCandidate(await readOwnFreshNumber('derived.core.pv.totalW'), 'derived.core.pv.totalW');
        pushCandidate(await readOwnFreshNumber('derived.core.pv.acW'), 'derived.core.pv.acW');
        // Einzel-DC-/Hybrid-Speicher: wenn ein separater PV-Erzeugungs-DP gemappt ist,
        // ist er fuer FENECON/OpenEMS die sauberste Tages-/PV-Erkennung. Gerade bei
        // Hybrid-AC-Ausgaengen kann die normale PV-Summe 0 W sein, obwohl der Speicher
        // intern PV sieht.
        if (this.dp && String(cfg.coupling || 'ac').trim().toLowerCase() === 'dc' && String(cfg.dcPvPowerObjectId || '').trim()) {
            pushCandidate(this.dp.getNumberFresh('st.dcPvPowerW', staleMs, null), 'st.dcPvPowerW');
        }
        pushCandidate(readCache('pvPower'), 'pvPower');
        pushCandidate(readCache('productionTotal'), 'productionTotal');
        if (this.dp) {
            pushCandidate(this.dp.getNumberFresh('ps.pvW', staleMs, null), 'ps.pvW');
        }

        let pvW = 0;
        let pvSource = 'missing';
        for (const c of candidates) {
            if (c.w >= pvW) {
                pvW = c.w;
                pvSource = c.source;
            }
        }

        let additionalPvW = 0;
        let additionalCount = 0;
        for (let i = 1; i <= 5; i++) {
            const n = readCache('producer' + i + 'Power');
            if (typeof n === 'number' && Number.isFinite(n)) {
                const w = Math.max(0, Math.abs(n));
                additionalPvW += w;
                if (w > 0) additionalCount++;
            }
        }

        const nvpW = (typeof gridRawW === 'number' && Number.isFinite(gridRawW))
            ? Number(gridRawW)
            : ((typeof gridW === 'number' && Number.isFinite(gridW)) ? Number(gridW) : null);
        const exportW = (typeof nvpW === 'number') ? Math.max(0, -nvpW) : 0;
        const importW = (typeof nvpW === 'number') ? Math.max(0, nvpW) : 0;

        // Forecast-Erkennung: Der Forecast ist keine direkte Vorgabe, sondern nur
        // ein Kontextsignal für Tages-/PV-Erkennung und den begrenzten Assist-Modus.
        // Der manuell zugeordnete Ausgang wird davon nicht getrennt.
        let forecastMaxW = 0;
        let forecastSource = 'missing';
        try {
            const pf = (this.adapter && this.adapter._pvForecast && typeof this.adapter._pvForecast === 'object') ? this.adapter._pvForecast : null;
            const curve = pf && Array.isArray(pf.curve) ? pf.curve : [];
            const horizonMs = 30 * 60000;
            if (pf && pf.valid && (pf.ageMs === null || pf.ageMs === undefined || Number(pf.ageMs) <= 24 * 3600000)) {
                for (const seg of curve) {
                    if (!seg || !Number.isFinite(Number(seg.t)) || !Number.isFinite(Number(seg.dtMs)) || !Number.isFinite(Number(seg.w))) continue;
                    const t0 = Number(seg.t);
                    const t1 = t0 + Number(seg.dtMs);
                    if (t1 < now || t0 > now + horizonMs) continue;
                    forecastMaxW = Math.max(forecastMaxW, Math.max(0, Number(seg.w)));
                }
                if (forecastMaxW > 0) forecastSource = 'pvForecast.curve.next30min';
                if (forecastMaxW <= 0 && Number.isFinite(Number(pf.peakWNext24h))) {
                    forecastMaxW = Math.max(0, Number(pf.peakWNext24h));
                    forecastSource = 'pvForecast.peak24h';
                }
            }
        } catch {
            // Forecast ist optional; bei Fehlern bleibt die FENECON-Logik bei Messwert/Uhr-Fallback.
        }

        const internalPvActive = pvW >= thresholdW;
        const forecastActive = forecastMaxW >= forecastThresholdW;
        const additionalPvActive = additionalPvW >= additionalThresholdW;

        // Uhr-Fallback: In FENECON-Anlagen kann die PV in NexoWatt 0 W erscheinen,
        // weil der AC-Hybrid-Ausgang PV und Batterie zusammenführt. Das Tagesfenster
        // dient nur der Modus-/Assist-Erkennung; der externe AppCenter-Ausgang bleibt
        // weiterhin zyklisch aktiv. Der Fallback kann in Expertenconfig deaktiviert werden.
        const clockFallbackEnabled = cfg.feneconDayClockFallbackEnabled !== false;
        const dayStartHour = clamp(num(cfg.feneconDayStartHour, 7), 0, 23);
        const dayEndHour = clamp(num(cfg.feneconDayEndHour, 20), 1, 24);
        const hour = new Date(now).getHours();
        const clockDayActive = clockFallbackEnabled && (dayStartHour < dayEndHour
            ? (hour >= dayStartHour && hour < dayEndHour)
            : (hour >= dayStartHour || hour < dayEndHour));

        // Legacy-Migration: Aeltere Konfigurationen konnten den FENECON-Ziel-DP im
        // Tagesbetrieb absichtlich auf No-Write setzen. Das ist fuer externe
        // FEMS/OpenEMS-Vorgaben nicht watchdog-sicher und trennt den manuell
        // zugeordneten AppCenter-DP vom Gate-/Executor-Pfad. Der Wert wird nur noch
        // diagnostisch mitgefuehrt; technisch ist No-Write fest deaktiviert.
        const legacyDayNoWriteRequested = cfg.feneconDayNoWriteEnabled === true;
        const dayNoWriteEnabled = false;
        const dayOrPvActive = !!(internalPvActive || forecastActive || clockDayActive);

        // Assist-Regler: Nur wenn im Tagesbetrieb dauerhaft Netzbezug stehen bleibt,
        // wird der ohnehin aktive externe Zielpfad auf einen kleinen, NVP-begrenzten
        // Entlade-Sollwert umgestellt. Die Verzögerung verhindert unnötige Eingriffe.
        const assistEnabled = cfg.feneconAssistEnabled !== false;
        const assistThresholdW = Math.max(0, num(cfg.feneconAssistImportThresholdW, 800));
        const assistDelayMs = Math.max(0, num(cfg.feneconAssistDelaySec, 60)) * 1000;
        const releaseImportW = Math.max(0, num(cfg.feneconAssistReleaseImportW, 200));
        const releaseDelayMs = Math.max(0, num(cfg.feneconAssistReleaseDelaySec, 90)) * 1000;

        if (!assistEnabled || !dayOrPvActive) {
            this._feneconAssistImportSinceMs = 0;
            this._feneconAssistReleaseSinceMs = 0;
            this._feneconAssistActive = false;
        } else {
            const importAbove = importW >= assistThresholdW;
            if (importAbove) {
                if (!this._feneconAssistImportSinceMs) this._feneconAssistImportSinceMs = now;
            } else {
                this._feneconAssistImportSinceMs = 0;
            }

            if (this._feneconAssistActive) {
                if (importW <= releaseImportW) {
                    if (!this._feneconAssistReleaseSinceMs) this._feneconAssistReleaseSinceMs = now;
                    if ((now - this._feneconAssistReleaseSinceMs) >= releaseDelayMs) {
                        this._feneconAssistActive = false;
                        this._feneconAssistImportSinceMs = 0;
                    }
                } else {
                    this._feneconAssistReleaseSinceMs = 0;
                }
            } else if (importAbove && this._feneconAssistImportSinceMs && (now - this._feneconAssistImportSinceMs) >= assistDelayMs) {
                this._feneconAssistActive = true;
                this._feneconAssistReleaseSinceMs = 0;
            }
        }

        let mode = 'external-control-low-pv';
        let writeMode = 'write-low-pv';
        let reason = 'FENECON/OpenEMS: kein PV-/Tagbetrieb erkannt – NexoWatt-Regelung aktiv';

        if (dayOrPvActive) {
            if (this._feneconAssistActive) {
                mode = 'fems-assist';
                writeMode = 'write-assist-on-demand';
                reason = 'FENECON/OpenEMS: Tagesbetrieb erkannt, NVP-begrenzter Assist aktiv; AppCenter-Sollwert wird zyklisch geschrieben';
            } else {
                mode = 'external-control-keepalive';
                writeMode = 'write-appcenter-gated';
                reason = 'FENECON/OpenEMS: Tages-/PV-Betrieb – gegateter Sollwert wird ueber den AppCenter-DP zyklisch erneuert';
            }
        } else if (internalPvActive && additionalPvActive) {
            mode = 'external-pv-charge-only';
            writeMode = 'write-extra-pv-charge';
            reason = 'Hybrid-/Gateway-Priorität: interne PV aktiv, Zusatz-PV erkannt (' + Math.round(additionalPvW) + ' W) – nur Zusatz-PV-Laden extern';
        } else if (internalPvActive) {
            mode = 'external-control-keepalive';
            writeMode = 'write-appcenter-gated';
            reason = 'Hybrid-/Gateway-Priorität: PV >= ' + Math.round(thresholdW) + ' W – gegateter Sollwert wird zyklisch erneuert';
        }

        return {
            active: true,
            configured: true,
            farmBlocked: false,
            mode,
            writeMode,
            reason,
            pvW,
            pvSource,
            thresholdW,
            additionalPvW,
            additionalCount,
            additionalThresholdW,
            additionalPvActive,
            internalPvActive,
            forecastW: forecastMaxW,
            forecastSource,
            forecastThresholdW,
            forecastActive,
            clockDayActive,
            dayNoWriteEnabled,
            legacyDayNoWriteRequested,
            dayOrPvActive,
            assistEnabled,
            assistActive: !!this._feneconAssistActive,
            assistImportThresholdW: assistThresholdW,
            assistImportSinceMs: this._feneconAssistImportSinceMs || 0,
            assistDelayMs,
            assistReleaseImportW: releaseImportW,
            assistReleaseDelayMs: releaseDelayMs,
            nvpW,
            importW,
            exportW,
        };
    }

    /**
     * Code-Teil: Methode `_setFeneconHybridDiag`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _setFeneconHybridDiag(ctx = {}) {
        const active = !!ctx.active;
        const mode = String(ctx.mode || '');
        const reason = String(ctx.reason || '');
        const writeMode = String(ctx.writeMode || '');
        /**
         * Code-Teil: n
         * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
         * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
         * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
         */
        const n = (v, fallback = null) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback;
        await this._setIfChanged('speicher.regelung.feneconHybridAktiv', active);
        await this._setIfChanged('speicher.regelung.feneconHybridModus', mode);
        await this._setIfChanged('speicher.regelung.feneconHybridGrund', reason);
        await this._setIfChanged('speicher.regelung.feneconHybridSchreibmodus', writeMode);
        await this._setIfChanged('speicher.regelung.feneconHybridPvW', n(ctx.pvW));
        await this._setIfChanged('speicher.regelung.feneconHybridZusatzPvW', n(ctx.additionalPvW, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridSchwelleW', n(ctx.thresholdW));
        await this._setIfChanged('speicher.regelung.feneconHybridZusatzSchwelleW', n(ctx.additionalThresholdW));
        await this._setIfChanged('speicher.regelung.feneconHybridSollW', n(ctx.targetW, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridNvpW', n(ctx.nvpW));
        await this._setIfChanged('speicher.regelung.feneconHybridForecastW', n(ctx.forecastW, 0));
        await this._setIfChanged('speicher.regelung.feneconHybridForecastQuelle', String(ctx.forecastSource || ''));
        await this._setIfChanged('speicher.regelung.feneconHybridTagAktiv', !!ctx.dayOrPvActive);
        await this._setIfChanged('speicher.regelung.feneconHybridAssistAktiv', !!ctx.assistActive);
        await this._setIfChanged('speicher.regelung.feneconHybridAssistSchwelleW', n(ctx.assistImportThresholdW, 800));

        // Legacy-Diagnosen aus 0.6.254 neutral halten, damit alte VIS/Debug-Ansichten nicht
        // fälschlich eine SetGridActivePower-Nutzung anzeigen.
        await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
        await this._setIfChanged('speicher.regelung.feneconGridQuelle', 'deprecated');
        await this._setIfChanged('speicher.regelung.feneconGridGrund', active ? 'ab 0.6.255 nicht genutzt – externe Vorgabe laeuft ueber den manuell zugeordneten Sollleistungs-DP mit Gate-/Watchdog-Refresh' : reason);
        await this._setIfChanged('speicher.regelung.feneconGridSchreibOk', false);
        await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', 'deprecated');
    }

    /**
     * Code-Teil: Methode `_setHoldNoWriteTargetDiag`
     * Zweck: Dokumentiert einen bewussten No-Write-Zyklus, ohne den letzten
     * erfolgreichen Speicher-Sollwert intern zu verlieren.
     * Zusammenhang: Wird bei kurzen Sungrow-NVP-Aussetzern und echtem Hersteller-
     * Leerlauf genutzt. Anders als FENECON-No-Write darf dieser Pfad die laufende
     * externe Vorgabe nicht auf 0 zuruecksetzen.
     * TypeScript-Hinweis: Zielwert und Status bleiben Diagnosewerte; es erfolgt
     * ausdruecklich kein Schreibzugriff auf signed-, Split-, Run- oder Farm-DPs.
     */
    async _setHoldNoWriteTargetDiag(targetW, reason, source, status) {
        const requestedW = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        const lastSuccessfulW = Number.isFinite(Number(this._lastTargetW)) ? Math.round(Number(this._lastTargetW)) : 0;
        const visibleW = requestedW !== 0 ? requestedW : lastSuccessfulW;
        try {
            const e = (this.dp && this.dp.getEntry) ? this.dp.getEntry('st.targetPowerW') : null;
            await this._setIfChanged('speicher.regelung.targetObjId', e && e.objectId ? String(e.objectId) : '');
        } catch {
            await this._setIfChanged('speicher.regelung.targetObjId', '');
        }
        await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
        await this._setIfChanged('speicher.regelung.lastWriteSplitJson', null);
        await this._setIfChanged('speicher.regelung.sollW', visibleW);
        await this._setIfChanged('speicher.regelung.acceptedSollW', lastSuccessfulW);
        await this._setIfChanged('speicher.regelung.commandEffective', false);
        await this._setIfChanged('speicher.regelung.requestSatisfied', false);
        await this._setIfChanged('speicher.regelung.partiallyAccepted', false);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedW', 0);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTs', Date.now());
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTopology', '');
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedSource', '');
        await this._setIfChanged('speicher.regelung.quelle', String(source || this._lastSource || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || 'No-Write: letzten Sollwert halten'));
        await this._setIfChanged('speicher.regelung.schreibOk', false);
        await this._setIfChanged('speicher.regelung.schreibStatus', String(status || 'no-write-hold'));

        // Absichtlich keine Aenderung an _lastTargetW/_lastTargetWriteMs. Diese
        // Werte repraesentieren den letzten real geschriebenen Befehl und werden
        // im naechsten NVP-Zyklus wieder als Halte-/Einschwingbasis benoetigt.
    }

    /**
     * Code-Teil: Methode `_setNoWriteTargetDiag`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setNoWriteTargetDiag
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setNoWriteTargetDiag(targetW, reason, source, status) {
        const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        try {
            const e = (this.dp && this.dp.getEntry) ? this.dp.getEntry('st.targetPowerW') : null;
            await this._setIfChanged('speicher.regelung.targetObjId', e && e.objectId ? String(e.objectId) : '');
        } catch {
            await this._setIfChanged('speicher.regelung.targetObjId', '');
        }
        await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
        await this._setIfChanged('speicher.regelung.lastWriteSplitJson', null);
        await this._setIfChanged('speicher.regelung.sollW', w);
        await this._setIfChanged('speicher.regelung.acceptedSollW', 0);
        await this._setIfChanged('speicher.regelung.commandEffective', false);
        await this._setIfChanged('speicher.regelung.requestSatisfied', false);
        await this._setIfChanged('speicher.regelung.partiallyAccepted', false);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedW', 0);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTs', Date.now());
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTopology', '');
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedSource', '');
        await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || ''));
        await this._setIfChanged('speicher.regelung.schreibOk', false);
        await this._setIfChanged('speicher.regelung.schreibStatus', String(status || 'no-write'));
        this._lastTargetW = 0;
        this._lastTargetWriteMs = 0;
        this._lastReason = String(reason || '');
        this._lastSource = String(source || '');
    }

    /**
     * Code-Teil: Methode `_getFeneconGridSetpointW`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    _getFeneconGridSetpointW(_cfg = {}) {
        // Legacy ab 0.6.255: SetGridActivePower wird nicht mehr verwendet, weil dieser DP
        // bei real getesteten Hybrid-/Gateway-Priorität-Anlagen nicht beschreibbar sein kann.
        return 0;
    }
    /**
     * Code-Teil: _releaseDirectStorageTargetForFenecon
     * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _releaseDirectStorageTargetForFenecon(reason = '') {
        // Legacy ab 0.6.255: keine aktive Freigabe per 0-W-Schreiben.
        // Gateway fällt nach seinem Watchdog selbst in den Normalmodus zurück, solange NexoWatt nicht schreibt.
        await this._setIfChanged('speicher.regelung.feneconGridReleaseStatus', reason ? ('no-write: ' + String(reason)) : 'no-write');
        return null;
    }

    /**
     * Code-Teil: Methode `_applyFeneconGridSetpointW`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _applyFeneconGridSetpointW(_targetW, reason, source, _opts = {}) {
        // Legacy ab 0.6.255: niemals auf SetGridActivePower schreiben.
        await this._setIfChanged('speicher.regelung.feneconGridAktiv', false);
        await this._setIfChanged('speicher.regelung.feneconGridSollW', 0);
        await this._setIfChanged('speicher.regelung.feneconGridQuelle', String(source || 'deprecated'));
        await this._setIfChanged('speicher.regelung.feneconGridGrund', reason ? ('deprecated/no-write: ' + String(reason)) : 'deprecated/no-write');
        await this._setIfChanged('speicher.regelung.feneconGridSchreibOk', false);
        await this._setIfChanged('speicher.regelung.feneconGridSchreibStatus', 'deprecated-no-write');
        await this._setIfChanged('speicher.regelung.feneconGridTargetObjId', '');
        await this._setIfChanged('speicher.regelung.feneconGridLastWriteRaw', null);
        return { ok: false, wrote: false, status: 'deprecated-no-write', objectId: '', valueW: 0 };
    }

    /**
     * Code-Teil: Methode `_readTarifVis`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readTarifVis
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
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

    /**
     * Code-Teil: Methode `_applyTargetW`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _applyTargetW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _applyTargetW(targetW, reason, source, options = {}) {
        const evcsAssistReqW = Number.isFinite(Number(options && options.evcsAssistReqW))
            ? Math.max(0, Math.round(Number(options.evcsAssistReqW)))
            : 0;
        const w = Number.isFinite(Number(targetW)) ? Math.round(Number(targetW)) : 0;
        const cfg = this._getCfg();
        const storageAuthority = this._getStorageControlAuthority();
        const selectedTopology = String(storageAuthority.selectedTopology || 'none');
        const controlModeRaw = String(cfg.controlMode || 'targetPower');
        const controlMode = ['targetPower', 'limits', 'enableFlags'].includes(controlModeRaw) ? controlModeRaw : 'targetPower';

        const getEntry = (key) => (this.dp && this.dp.getEntry) ? this.dp.getEntry(key) : null;
        const signedEntry = getEntry('st.targetPowerW');
        const chargeEntry = getEntry('st.targetChargePowerW');
        const dischargeEntry = getEntry('st.targetDischargePowerW');
        const runEntry = getEntry('st.run');
        const maxChargeEntry = getEntry('st.maxChargeW');
        const maxDischargeEntry = getEntry('st.maxDischargeW');
        const chargeEnableEntry = getEntry('st.chargeEnable');
        const dischargeEnableEntry = getEntry('st.dischargeEnable');
        const reserveSocEntry = getEntry('st.reserveSocPct');

        // E3/DC RSCP-Profil: Der ioBroker.e3dc-rscp Adapter schreibt aktive
        // Speicherleistung ueber das gekoppelte Tupel SET_POWER_MODE + SET_POWER_VALUE.
        const storageVendorProfile = this._getStorageVendorProfile(cfg);
        const e3dcModeEntry = getEntry('st.e3dcSetPowerMode');
        const e3dcValueEntry = getEntry('st.e3dcSetPowerValueW');
        const e3dcTargetConfigured = selectedTopology === 'single'
            && controlMode === 'targetPower'
            && storageVendorProfile === 'e3dc-rscp'
            && !!(e3dcModeEntry && e3dcValueEntry);

        const objectIdOf = (entry) => entry && entry.objectId ? String(entry.objectId).trim() : '';
        const sameObject = (a, b) => {
            const aa = objectIdOf(a);
            const bb = objectIdOf(b);
            return !!(aa && bb && aa === bb);
        };

        // Signed und Split duerfen in alten Migrationen auf demselben Objekt liegen.
        // Dann wird der Split-Alias nicht doppelt mit abweichender Vorzeichenlogik beschrieben.
        const chargeSameAsSigned = sameObject(chargeEntry, signedEntry);
        const dischargeSameAsSigned = sameObject(dischargeEntry, signedEntry);
        const canWriteChargeSplit = !!(chargeEntry && !chargeSameAsSigned);
        const canWriteDischargeSplit = !!(dischargeEntry && !dischargeSameAsSigned);
        const hasAnySplitTarget = !!(chargeEntry || dischargeEntry);
        const hasAnyWritableSplit = !!(canWriteChargeSplit || canWriteDischargeSplit);
        const hasSignedTarget = !!signedEntry;

        let directionSupported = false;
        let targetMode = 'none';
        if (controlMode === 'limits') {
            directionSupported = w === 0 || (w < 0 ? !!maxChargeEntry : !!maxDischargeEntry);
            targetMode = maxChargeEntry && maxDischargeEntry
                ? 'limits-charge-discharge'
                : (maxChargeEntry ? 'limits-charge-only' : (maxDischargeEntry ? 'limits-discharge-only' : 'limits-none'));
        } else if (controlMode === 'enableFlags') {
            directionSupported = w === 0 || (w < 0 ? !!chargeEnableEntry : !!dischargeEnableEntry);
            targetMode = chargeEnableEntry && dischargeEnableEntry
                ? 'enable-flags-charge-discharge'
                : (chargeEnableEntry ? 'enable-flags-charge-only' : (dischargeEnableEntry ? 'enable-flags-discharge-only' : 'enable-flags-none'));
        } else {
            const genericDirectionSupported = w === 0 || hasSignedTarget || (w < 0 ? canWriteChargeSplit : canWriteDischargeSplit);
            directionSupported = e3dcTargetConfigured ? true : genericDirectionSupported;
            const genericTargetMode = hasSignedTarget && hasAnySplitTarget
                ? 'signed+split-targetPower'
                : (hasAnySplitTarget
                    ? (canWriteChargeSplit && canWriteDischargeSplit
                        ? 'split-charge-discharge'
                        : (canWriteChargeSplit ? 'split-charge-only' : (canWriteDischargeSplit ? 'split-discharge-only' : 'split-unwritable')))
                    : (hasSignedTarget ? 'signed-targetPower' : 'none'));
            targetMode = e3dcTargetConfigured ? 'e3dc-rscp-set-power' : genericTargetMode;
        }

        if (selectedTopology === 'farm') {
            directionSupported = true;
            targetMode = 'storage-farm';
        } else if (selectedTopology === 'none') {
            directionSupported = false;
            targetMode = 'none';
        }

        await this._setIfChanged('speicher.regelung.targetMode', targetMode);
        await this._setIfChanged('speicher.regelung.targetObjId', signedEntry && signedEntry.objectId ? String(signedEntry.objectId) : '');
        await this._setIfChanged('speicher.regelung.splitTargetObjIds', JSON.stringify({
            charge: chargeEntry && chargeEntry.objectId ? String(chargeEntry.objectId) : '',
            discharge: dischargeEntry && dischargeEntry.objectId ? String(dischargeEntry.objectId) : '',
            maxCharge: maxChargeEntry && maxChargeEntry.objectId ? String(maxChargeEntry.objectId) : '',
            maxDischarge: maxDischargeEntry && maxDischargeEntry.objectId ? String(maxDischargeEntry.objectId) : '',
            chargeEnable: chargeEnableEntry && chargeEnableEntry.objectId ? String(chargeEnableEntry.objectId) : '',
            dischargeEnable: dischargeEnableEntry && dischargeEnableEntry.objectId ? String(dischargeEnableEntry.objectId) : '',
            reserveSoc: reserveSocEntry && reserveSocEntry.objectId ? String(reserveSocEntry.objectId) : '',
            chargeSkippedBecauseSignedSameObject: !!chargeSameAsSigned,
            dischargeSkippedBecauseSignedSameObject: !!dischargeSameAsSigned,
        }));
        await this._setIfChanged('speicher.regelung.runObjId', runEntry && runEntry.objectId ? String(runEntry.objectId) : '');

        // Doppelte manuelle Zuordnungen fuer unterschiedliche Ausgangsfunktionen
        // koennen gegensaetzliche Rohwerte erzeugen. Solche echten Objektkonflikte
        // werden als Sicherheitsfehler blockiert; freie Hersteller-/Adapterpfade
        // werden dagegen niemals gefiltert.
        const activeOutputEntries = [];
        if (selectedTopology === 'single' && controlMode === 'targetPower') {
            if (e3dcTargetConfigured) {
                activeOutputEntries.push(['e3dcMode', e3dcModeEntry], ['e3dcValue', e3dcValueEntry]);
            } else {
                if (signedEntry) activeOutputEntries.push(['signed', signedEntry]);
                if (canWriteChargeSplit) activeOutputEntries.push(['charge', chargeEntry]);
                if (canWriteDischargeSplit) activeOutputEntries.push(['discharge', dischargeEntry]);
            }
        } else if (selectedTopology === 'single' && controlMode === 'limits') {
            if (maxChargeEntry) activeOutputEntries.push(['maxCharge', maxChargeEntry]);
            if (maxDischargeEntry) activeOutputEntries.push(['maxDischarge', maxDischargeEntry]);
        } else if (selectedTopology === 'single' && controlMode === 'enableFlags') {
            if (chargeEnableEntry) activeOutputEntries.push(['chargeEnable', chargeEnableEntry]);
            if (dischargeEnableEntry) activeOutputEntries.push(['dischargeEnable', dischargeEnableEntry]);
        }
        if (selectedTopology === 'single' && runEntry) activeOutputEntries.push(['run', runEntry]);
        if (selectedTopology === 'single' && reserveSocEntry) activeOutputEntries.push(['reserveSoc', reserveSocEntry]);

        const outputsByObjectId = new Map();
        const outputConflicts = [];
        for (const [key, entry] of activeOutputEntries) {
            const id = objectIdOf(entry);
            if (!id) continue;
            if (!outputsByObjectId.has(id)) {
                outputsByObjectId.set(id, key);
                continue;
            }
            outputConflicts.push({ objectId: id, first: outputsByObjectId.get(id), second: key });
        }
        await this._setIfChanged('speicher.regelung.outputMappingConflictJson', outputConflicts.length ? JSON.stringify(outputConflicts) : '');

        // Exklusive Hardware-Topologie: Farm und Einzelpfad duerfen niemals im
        // selben Regelzyklus konkurrieren. Ein Farmfehler bleibt ein Farmfehler und
        // aktiviert keinen versteckten Einzel-Fallback.
        let writeResult = null;
        let farmApplied = false;
        let farmCommandEffective = false;
        let farmWriteOk = false;
        let farmRequestSatisfied = false;
        let farmPartiallyAccepted = false;
        let farmReason = '';
        let farmStatus = '';
        let farmRequestedW = w;
        let farmPlannedW = 0;
        let farmAcceptedW = 0;
        let farmFailedW = 0;
        let farmUnservedW = 0;
        let farmDispatchResult = null;
        const farmEnabledForWrite = selectedTopology === 'farm';
        const mayUseSingleTarget = selectedTopology === 'single';

        try {
            if (farmEnabledForWrite && this.adapter && typeof this.adapter.applyStorageFarmTargetW === 'function') {
                const res = await this.adapter.applyStorageFarmTargetW(w, { source, reason, topology: 'farm' });
                farmDispatchResult = res && typeof res === 'object' ? res : null;
                farmApplied = !!(res && res.applied);
                farmCommandEffective = !!(res && (res.commandEffective === true || res.applied === true));
                farmWriteOk = !!(res && res.writeOk === true);
                farmRequestSatisfied = !!(res && res.requestSatisfied === true);
                farmPartiallyAccepted = !!(res && res.partiallyAccepted === true);
                farmReason = res && res.reason ? String(res.reason) : '';
                farmStatus = res && res.status ? String(res.status) : farmReason;
                farmRequestedW = Number.isFinite(Number(res && res.requestedW)) ? Math.round(Number(res.requestedW)) : w;
                farmPlannedW = Number.isFinite(Number(res && res.plannedDeliveredW)) ? Math.round(Number(res.plannedDeliveredW)) : 0;
                farmAcceptedW = Number.isFinite(Number(res && res.acceptedDeliveredW))
                    ? Math.round(Number(res.acceptedDeliveredW))
                    : (Number.isFinite(Number(res && res.deliveredW)) ? Math.round(Number(res.deliveredW)) : 0);
                farmFailedW = Number.isFinite(Number(res && res.failedW)) ? Math.round(Number(res.failedW)) : 0;
                farmUnservedW = Number.isFinite(Number(res && res.unservedW)) ? Math.round(Number(res.unservedW)) : 0;
                writeResult = farmWriteOk;
            } else if (farmEnabledForWrite) {
                farmReason = 'farm-dispatcher-missing';
                farmStatus = 'farm-dispatcher-missing';
                farmCommandEffective = false;
                farmWriteOk = false;
                farmRequestSatisfied = false;
                farmPartiallyAccepted = false;
                writeResult = false;
            }
        } catch (eFarm) {
            farmApplied = false;
            farmCommandEffective = false;
            farmWriteOk = false;
            farmRequestSatisfied = false;
            farmPartiallyAccepted = false;
            farmReason = eFarm && eFarm.message ? String(eFarm.message) : 'exception';
            farmStatus = 'farm-exception';
            writeResult = false;
        }

        const writeResults = [];
        let primarySucceeded = false;
        let primaryWroteAny = false;
        let primaryDetail = null;

        if (!farmApplied) {
            if (!mayUseSingleTarget) {
                writeResult = false;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                await this._setIfChanged('speicher.regelung.lastWriteSplitJson', JSON.stringify({
                    topology: selectedTopology,
                    reason: farmEnabledForWrite ? (farmReason || 'farm-dispatch-failed') : 'no-active-storage-output',
                }));
            } else if (outputConflicts.length) {
                writeResult = false;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                await this._setIfChanged('speicher.regelung.lastWriteSplitJson', JSON.stringify({ mode: targetMode, conflicts: outputConflicts }));

                // Ein Mapping-Konflikt darf keine alte externe Freigabe aktiv lassen.
                // Ist der Run-DP selbst nicht Teil des Konflikts, wird er sicher auf
                // false gesetzt; ein kollidierender Run-DP wird bewusst nicht beschrieben.
                const conflictingIds = new Set(outputConflicts.map((item) => String(item && item.objectId || '').trim()).filter(Boolean));
                if (runEntry && !conflictingIds.has(objectIdOf(runEntry)) && this.dp && typeof this.dp.writeBoolean === 'function') {
                    try {
                        const runResult = await this.dp.writeBoolean('st.run', false, false);
                        writeResults.push(runResult);
                    } catch (_e) {
                        writeResults.push(false);
                    }
                }
            } else if (controlMode === 'targetPower' && e3dcTargetConfigured) {
                const e3dcResult = await this._writeE3dcRscpTargetW(w, reason, source, cfg);
                primarySucceeded = !!(e3dcResult && e3dcResult.ok === true);
                primaryWroteAny = true;
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', e3dcResult ? Math.round(Number(e3dcResult.valueW) || 0) : null);
                primaryDetail = e3dcResult ? {
                    profile: 'e3dc-rscp',
                    modeCode: e3dcResult.modeCode,
                    modeName: e3dcResult.modeName,
                    valueW: e3dcResult.valueW,
                    gridCharge: !!e3dcResult.gridCharge,
                    powerLimitsUsed: !!e3dcResult.powerLimitsUsed,
                    writes: e3dcResult.writes || [],
                } : null;
            } else if (controlMode === 'limits') {
                const chargeW = directionSupported && w < 0 ? Math.abs(w) : 0;
                const dischargeW = directionSupported && w > 0 ? w : 0;
                if (maxChargeEntry) {
                    try { writeResults.push(await this.dp.writeNumber('st.maxChargeW', chargeW, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                }
                if (maxDischargeEntry) {
                    try { writeResults.push(await this.dp.writeNumber('st.maxDischargeW', dischargeW, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                }
                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some(r => r === false));
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = { mode: targetMode, chargeW: maxChargeEntry ? chargeW : null, dischargeW: maxDischargeEntry ? dischargeW : null, directionSupported };
            } else if (controlMode === 'enableFlags') {
                const chargeEnabled = !!(directionSupported && w < 0);
                const dischargeEnabled = !!(directionSupported && w > 0);
                if (chargeEnableEntry) {
                    try { writeResults.push(await this.dp.writeBoolean('st.chargeEnable', chargeEnabled, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                }
                if (dischargeEnableEntry) {
                    try { writeResults.push(await this.dp.writeBoolean('st.dischargeEnable', dischargeEnabled, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                }
                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some(r => r === false));
                writeResult = primarySucceeded;
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = { mode: targetMode, chargeEnabled: chargeEnableEntry ? chargeEnabled : null, dischargeEnabled: dischargeEnableEntry ? dischargeEnabled : null, directionSupported };
            } else if (hasSignedTarget || hasAnySplitTarget) {
                const chargeW = directionSupported && w < 0 ? Math.abs(w) : 0;
                const dischargeW = directionSupported && w > 0 ? w : 0;

                if (canWriteChargeSplit) {
                    try { writeResults.push(await this.dp.writeNumber('st.targetChargePowerW', chargeW, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                }
                if (canWriteDischargeSplit) {
                    try { writeResults.push(await this.dp.writeNumber('st.targetDischargePowerW', dischargeW, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                }

                if (hasSignedTarget) {
                    try {
                        const e = signedEntry;
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
                    try { writeResults.push(await this.dp.writeNumber('st.targetPowerW', w, false)); primaryWroteAny = true; } catch (_e) { writeResults.push(false); }
                } else {
                    await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                }

                primarySucceeded = !!(directionSupported && primaryWroteAny && !writeResults.some(r => r === false));
                writeResult = primarySucceeded;
                primaryDetail = {
                    chargeW: canWriteChargeSplit ? chargeW : null,
                    dischargeW: canWriteDischargeSplit ? dischargeW : null,
                    mode: targetMode,
                    signedAlsoWritten: !!hasSignedTarget,
                    directionSupported,
                    chargeSkippedBecauseSignedSameObject: !!chargeSameAsSigned,
                    dischargeSkippedBecauseSignedSameObject: !!dischargeSameAsSigned,
                };
            } else {
                await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
                primaryDetail = { mode: targetMode, directionSupported: false, reason: 'kein beschreibbarer Ziel-DP' };
                writeResult = false;
            }

            // Run/Enable folgt dem tatsaechlich erfolgreichen Hauptpfad. Bei einem
            // Fehler wird sicher false geschrieben, damit kein Controller mit einer
            // Freigabe ohne gueltigen Sollwert weiterlaeuft.
            if (runEntry && this.dp && typeof this.dp.writeBoolean === 'function') {
                const runActive = primarySucceeded && w !== 0;
                try {
                    const runResult = await this.dp.writeBoolean('st.run', runActive, false);
                    writeResults.push(runResult);
                    if (runResult === false) writeResult = false;
                } catch (_e) {
                    writeResults.push(false);
                    writeResult = false;
                }
                primaryDetail = { ...(primaryDetail || {}), run: runActive };
            }

            // Der Reserve-DP wird aus exakt derselben wirksamen SoC-Untergrenze
            // gespeist wie das interne Entlade-Gate. Damit bleibt die externe
            // Controller-Sicherheit mit der NexoWatt-Policy synchron.
            if (reserveSocEntry && this.dp && typeof this.dp.writeNumber === 'function') {
                const reserveSocPct = clamp(
                    Number.isFinite(Number(this._effectiveReserveSocPct))
                        ? Number(this._effectiveReserveSocPct)
                        : num(cfg.reserveMinSocPct, 20),
                    0,
                    100,
                );
                try {
                    const reserveResult = await this.dp.writeNumber('st.reserveSocPct', reserveSocPct, false);
                    writeResults.push(reserveResult);
                    if (reserveResult === false) writeResult = false;
                } catch (_e) {
                    writeResults.push(false);
                    writeResult = false;
                }
                primaryDetail = { ...(primaryDetail || {}), reserveSocPct };
            }

            await this._setIfChanged('speicher.regelung.lastWriteSplitJson', primaryDetail ? JSON.stringify(primaryDetail) : null);
        } else {
            // Bei Speicherfarm werden die im AppCenter je Speicher zugeordneten
            // Setpoints geschrieben; globale Einzelziele bleiben bewusst exklusiv.
            await this._setIfChanged('speicher.regelung.lastWriteRaw', null);
            await this._setIfChanged('speicher.regelung.lastWriteSplitJson', null);
        }

        const acceptedTargetW = farmEnabledForWrite
            ? farmAcceptedW
            : (writeResult === true ? w : 0);
        const commandEffective = farmEnabledForWrite ? farmCommandEffective : writeResult === true;
        const requestSatisfied = farmEnabledForWrite ? farmRequestSatisfied : writeResult === true;
        const partiallyAccepted = farmEnabledForWrite ? farmPartiallyAccepted : false;
        const evcsAssistAcceptedW = source === 'evcs' && commandEffective && acceptedTargetW > 0
            ? Math.round(Math.min(Math.max(0, Number(evcsAssistReqW) || 0), acceptedTargetW))
            : 0;
        const commandTs = Date.now();
        await this._setIfChanged('speicher.regelung.sollW', w);
        await this._setIfChanged('speicher.regelung.acceptedSollW', acceptedTargetW);
        await this._setIfChanged('speicher.regelung.commandEffective', commandEffective);
        await this._setIfChanged('speicher.regelung.requestSatisfied', requestSatisfied);
        await this._setIfChanged('speicher.regelung.partiallyAccepted', partiallyAccepted);
        await this._setIfChanged('speicher.regelung.evcsAssistRequestW', Math.max(0, Math.round(Number(evcsAssistReqW) || 0)));
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedW', evcsAssistAcceptedW);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTs', commandTs);
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedTopology', evcsAssistAcceptedW > 0 ? selectedTopology : '');
        await this._setIfChanged('speicher.regelung.evcsAssistAcceptedSource', evcsAssistAcceptedW > 0 ? 'evcs' : '');
        await this._setIfChanged('speicher.regelung.farmRequestedW', farmEnabledForWrite ? farmRequestedW : null);
        await this._setIfChanged('speicher.regelung.farmPlannedW', farmEnabledForWrite ? farmPlannedW : null);
        await this._setIfChanged('speicher.regelung.farmAcceptedW', farmEnabledForWrite ? farmAcceptedW : null);
        await this._setIfChanged('speicher.regelung.farmFailedW', farmEnabledForWrite ? farmFailedW : null);
        await this._setIfChanged('speicher.regelung.farmUnservedW', farmEnabledForWrite ? farmUnservedW : null);
        await this._setIfChanged('speicher.regelung.farmStatus', farmEnabledForWrite ? String(farmStatus || farmReason || '') : '');
        await this._setIfChanged('speicher.regelung.farmDispatchJson', farmEnabledForWrite && farmDispatchResult ? JSON.stringify(farmDispatchResult) : '');
        await this._setIfChanged('speicher.regelung.quelle', String(source || ''));
        await this._setIfChanged('speicher.regelung.grund', String(reason || ''));
        await this._setIfChanged('speicher.regelung.schreibOk', writeResult === true);

        let singleStatus = 'nicht möglich';
        if (outputConflicts.length) singleStatus = 'dp-zuordnung-konflikt';
        else if (!directionSupported) singleStatus = 'zielrichtung-nicht-gemappt';
        else if (writeResult === true) {
            if (e3dcTargetConfigured) singleStatus = 'e3dc-rscp-geschrieben';
            else if (controlMode === 'limits') singleStatus = 'leistungsgrenzen-geschrieben';
            else if (controlMode === 'enableFlags') singleStatus = 'freigabe-flags-geschrieben';
            else if (hasSignedTarget && hasAnyWritableSplit) singleStatus = 'signed+split-geschrieben';
            else if (hasAnyWritableSplit) singleStatus = 'split-geschrieben';
            else singleStatus = 'geschrieben';
        }
        const writeStatus = farmEnabledForWrite
            ? (farmStatus || (farmApplied ? 'farm' : ('farm-nicht-moeglich' + (farmReason ? ':' + farmReason : ''))))
            : (selectedTopology === 'none'
                ? 'kein-aktiver-speicher-ausgang'
                : ((writeResult === null) ? 'unverändert' : singleStatus));
        await this._setIfChanged('speicher.regelung.schreibStatus', writeStatus);

        const writeSucceeded = writeResult === true;
        const effectiveWrittenTargetW = acceptedTargetW;
        const previousTargetW = Number.isFinite(Number(this._lastTargetW)) ? Number(this._lastTargetW) : null;
        const targetChanged = commandEffective && (previousTargetW === null || Math.abs(previousTargetW - effectiveWrittenTargetW) >= 0.5);
        if (commandEffective) this._lastTargetW = effectiveWrittenTargetW;
        if (commandEffective && targetChanged) this._lastTargetWriteMs = commandTs;
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

        if (gridId) await this.dp.upsert({ key: 'ps.gridPowerW', objectId: gridId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        if (pvId) await this.dp.upsert({ key: 'ps.pvW', objectId: pvId });
        if (baseId) await this.dp.upsert({ key: 'ps.baseLoadW', objectId: baseId });
        if (battId) await this.dp.upsert({ key: 'ps.batteryW', objectId: battId });
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

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
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
        await mk('speicher.regelung.aktivAutoTarif', 'Tarif-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivAutoMultiUse', 'MultiUse-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivSpeicherfarm', 'Speicherfarm als Schreibtopologie ausgewählt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.aktivAutoSpeicherfarm', 'Beschreibbare Speicherfarm aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.topologie', 'Aktive Speicher-Schreibtopologie', 'string', 'text', 'none');
        await mk('speicher.regelung.topologieGrund', 'Grund der Speicher-Schreibtopologie', 'string', 'text', '');
        await mk('speicher.regelung.topologieJson', 'Speicher-Steuerhoheit (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.herstellerprofil', 'Speicher-Herstellerprofil', 'string', 'text', 'generic');
        await mk('speicher.regelung.speicherKopplung', 'Speicher-Kopplung AC/DC', 'string', 'text', 'ac');
        await mk('speicher.regelung.dcPvPowerW', 'DC-/Hybrid-PV Erzeugungsleistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.dcPvPowerAlterMs', 'DC-/Hybrid-PV Erzeugungswert Alter', 'number', 'value.interval', null);

        // Phase 2: Dispatcher-Diagnose
        await mk('speicher.regelung.dispatcherVersion', 'Dispatcher-Version', 'string', 'text', '2.0');
        await mk('speicher.regelung.requestW', 'Requestleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.requestQuelle', 'Request Quelle', 'string', 'text', '');
        await mk('speicher.regelung.requestGrund', 'Request Grund', 'string', 'text', '');
        await mk('speicher.regelung.dispatcherJson', 'Dispatcher Details (JSON)', 'string', 'text', '');

        await mk('speicher.regelung.sollW', 'Angeforderte Sollleistung Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.acceptedSollW', 'Von Hardware akzeptierte Speicher-Sollleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.commandEffective', 'Mindestens ein wirksamer Speicherbefehl akzeptiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.requestSatisfied', 'Speicheranforderung vollständig akzeptiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.partiallyAccepted', 'Speicheranforderung nur teilweise akzeptiert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.evcsAssistRequestW', 'EVCS angeforderte stationäre Speicherunterstützung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsAssistAcceptedW', 'Für EVCS tatsächlich akzeptierte Speicherentladung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsAssistAcceptedTs', 'Zeitpunkt der akzeptierten EVCS-Speicherunterstützung', 'number', 'value.time', 0);
        await mk('speicher.regelung.evcsAssistAcceptedTopology', 'Topologie der akzeptierten EVCS-Speicherunterstützung', 'string', 'text', '');
        await mk('speicher.regelung.evcsAssistAcceptedSource', 'Quelle der akzeptierten EVCS-Speicherunterstützung', 'string', 'text', '');
        await mk('speicher.regelung.farmRequestedW', 'Farm angefordert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmPlannedW', 'Farm geplant verteilt (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmAcceptedW', 'Farm von Writes akzeptiert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmFailedW', 'Farm wegen Write-Fehlern ausgefallen (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmUnservedW', 'Farm nicht verteilbarer Rest (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.farmStatus', 'Farm Dispatch-Status', 'string', 'text', '');
        await mk('speicher.regelung.farmDispatchJson', 'Farm Dispatch-Ergebnis (JSON)', 'string', 'json', '');
        await mk('speicher.regelung.quelle', 'Quelle', 'string', 'text', '');
        await mk('speicher.regelung.grund', 'Grund', 'string', 'text', '');
        await mk('speicher.regelung.schreibStatus', 'Schreibstatus', 'string', 'text', '');
        await mk('speicher.regelung.schreibOk', 'Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.targetObjId', 'Sollleistung signed Ziel-Datenpunkt (Objekt-ID)', 'string', 'text', '');
        await mk('speicher.regelung.targetMode', 'Speicher Zielpfad', 'string', 'text', '');
        await mk('speicher.regelung.splitTargetObjIds', 'Alle Speicher-Ausgangsdatenpunkte (JSON)', 'string', 'text', '');
        await mk('speicher.regelung.outputMappingConflictJson', 'Konflikte in manuellen Speicher-Ausgangszuordnungen (JSON)', 'string', 'text', '');
        await mk('speicher.regelung.runObjId', 'Run/Externe-Regelung Datenpunkt (Objekt-ID)', 'string', 'text', '');
        await mk('speicher.regelung.lastWriteRaw', 'Letzter Rohwert (signed Setpoint)', 'number', 'value');
        await mk('speicher.regelung.lastWriteSplitJson', 'Letzter Split-Sollwert (JSON)', 'string', 'text', '');
        await mk('speicher.regelung.batteryPowerTrusted', 'Direkter Batterie-Istwert innerhalb staleTimeout', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerIgnoredReason', 'Ignorierte Ist-Leistung Grund', 'string', 'text', '');
        await mk('speicher.regelung.batteryPowerBalanceTrusted', 'Ist-Leistung/Puffer für NVP-Balancing verwendbar', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackMode', 'Batterie-Istwert Feedback-Modus', 'string', 'text', '');
        await mk('speicher.regelung.batteryPowerFeedbackMeasuredW', 'Letzter echter Batterie-Istwert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.batteryPowerFeedbackBasisW', 'Wirksame Batterie-Regelbasis (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.batteryPowerFeedbackAgeMs', 'Alter des gehaltenen Batterie-Istwerts (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.batteryPowerFeedbackHeld', 'Batterie-Istwert zeitlich gehalten', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackPredicted', 'Batterie-Regelbasis aus begrenzter Sollwertprognose', 'boolean', 'indicator', false);
        await mk('speicher.regelung.batteryPowerFeedbackPredictionDeltaW', 'Begrenzte Sollwertprognose zur Istleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.batteryPowerFeedbackHoldMs', 'Konfigurierte Istwert-Haltezeit (ms)', 'number', 'value.interval', 45000);
        await mk('speicher.regelung.dischargeDemandCapW', 'Entlade-Demand-Cap nach Netzbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.dischargeDemandCapReason', 'Entlade-Demand-Cap Grund', 'string', 'text', '');
        await mk('speicher.regelung.chargeDemandCapW', 'Lade-Demand-Cap nach Headroom/PV (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.chargeDemandCapReason', 'Lade-Demand-Cap Grund', 'string', 'text', '');

        await mk('speicher.regelung.feneconGridAktiv', 'Legacy Netzpunktführung aktiv (nicht genutzt)', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconGridSollW', 'Legacy Netzpunkt-Sollwert (nicht genutzt)', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconGridQuelle', 'Legacy Netzpunktführung Quelle', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridGrund', 'Legacy Netzpunktführung Grund', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridSchreibOk', 'Legacy Netzpunkt-Sollwert Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconGridSchreibStatus', 'Legacy Netzpunkt-Sollwert Schreibstatus', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridTargetObjId', 'Legacy Netzpunkt-Sollwert Datenpunkt (nicht genutzt)', 'string', 'text', '');
        await mk('speicher.regelung.feneconGridLastWriteRaw', 'Legacy letzter Rohwert (nicht genutzt)', 'number', 'value');
        await mk('speicher.regelung.feneconGridReleaseStatus', 'Legacy Freigabestatus', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridAktiv', 'Hybrid-/Gateway-Priorität aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridModus', 'Hybrid-/Gateway-Priorität Modus', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridGrund', 'Hybrid-/Gateway-Priorität Grund', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridSchreibmodus', 'Hybrid-/Gateway-Priorität Schreibmodus', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridPvW', 'Hybrid-/Gateway-Priorität erkannte PV-Leistung', 'number', 'value.power', null);
        await mk('speicher.regelung.feneconHybridZusatzPvW', 'Hybrid-/Gateway-Priorität erkannte Zusatz-PV-Leistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconHybridSchwelleW', 'Hybrid-/Gateway-Priorität PV-Schwellwert', 'number', 'value.power', 1000);
        await mk('speicher.regelung.feneconHybridZusatzSchwelleW', 'Hybrid-/Gateway-Priorität Zusatz-PV-Schwellwert', 'number', 'value.power', 100);
        await mk('speicher.regelung.feneconHybridSollW', 'Hybrid-/Gateway-Priorität angewendeter Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconHybridNvpW', 'Hybrid-/Gateway-Priorität Netzpunktleistung', 'number', 'value.power', null);
        await mk('speicher.regelung.feneconHybridForecastW', 'FENECON/OpenEMS Forecast-/Tagesleistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.feneconHybridForecastQuelle', 'FENECON/OpenEMS Forecast-/Tagesquelle', 'string', 'text', '');
        await mk('speicher.regelung.feneconHybridTagAktiv', 'FENECON/OpenEMS Tag-/PV-Erkennung aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridAssistAktiv', 'FENECON/OpenEMS Assist aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.feneconHybridAssistSchwelleW', 'FENECON/OpenEMS Assist Netzbezugsschwelle', 'number', 'value.power', 800);


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
        await mk('speicher.regelung.lskPolicyAktiv', 'LSK-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.lskEntladenAktiviert', 'LSK-Entladen aktiviert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.lskLadenAktiviert', 'LSK-Laden aktiviert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.selfMinSocPct', 'Eigenverbrauch Min-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.selfMaxSocPct', 'Eigenverbrauch Max-SoC (%)', 'number', 'value', 0);
        await mk('speicher.regelung.selfTargetGridImportW', 'Eigenverbrauch Ziel-Netzbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.selfImportThresholdW', 'Eigenverbrauch Deadband (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.selfNvpRawW', 'Eigenverbrauch NVP RAW (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.selfNvpFilteredW', 'Eigenverbrauch NVP gefiltert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.selfNvpControlW', 'Eigenverbrauch NVP Fuehrungswert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.selfNvpControlMode', 'Eigenverbrauch NVP Glättungsmodus', 'string', 'text', '');
        await mk('speicher.regelung.balanceAktiv', 'Speicher NVP-Balancing aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balancePolicy', 'Speicher NVP-Balancing Policy', 'string', 'text', '');
        await mk('speicher.regelung.balanceMesswertW', 'Speicher NVP-Balancing letzter echter Batterie-Messwert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceIstLeistungW', 'Speicher NVP-Balancing verwendete Batterie-Istleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceIstLeistungAlterMs', 'Speicher-Istleistung Alter im NVP-Balancing (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceBasisW', 'Speicher NVP-Balancing Rechenbasis (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpW', 'Speicher NVP-Balancing Netzleistung (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceNvpAlterMs', 'NVP Alter im Speicher-Balancing (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceNvpZielW', 'Speicher NVP-Balancing Ziel (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceNvpFehlerW', 'Speicher NVP-Balancing Differenz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceBasisQuelle', 'Speicher NVP-Balancing Basisquelle', 'string', 'text', '');
        await mk('speicher.regelung.balanceRohSollW', 'Speicher NVP-Balancing Roh-Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceKorrekturW', 'Speicher NVP-Balancing Roh-Korrektur (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceAngewandteKorrekturW', 'Speicher NVP-Balancing angewendete Korrektur (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceSollW', 'Speicher NVP-Balancing Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceFeedbackVerwendet', 'Speicher-Istleistung im NVP-Balancing verwendet', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedbackQuelle', 'Speicher NVP-Balancing Feedbackquelle', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedbackGehalten', 'Speicher-Istwert im NVP-Balancing gehalten', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedbackPrognoseAktiv', 'Begrenzte Sollwertprognose im NVP-Balancing aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedbackPrognoseDeltaW', 'Begrenzte Sollwertprognose im NVP-Balancing (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceFeedbackHaltezeitMs', 'Istwert-Haltezeit im NVP-Balancing (ms)', 'number', 'value.interval', 0);
        await mk('speicher.regelung.balanceMessversatzMs', 'Messversatz Batterie zu NVP (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceMessungSynchronErforderlich', 'Zeitgleiche Batterie-/NVP-Messung erforderlich', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceMessungSynchron', 'Batterie-/NVP-Messung zeitlich synchron', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceModus', 'Speicher NVP-Balancing Modus', 'string', 'text', 'inactive');
        await mk('speicher.regelung.balanceLetztenSollwertGehalten', 'Letzten nicht-null NVP-Sollwert im Zielband gehalten', 'boolean', 'indicator', false);
        await mk('speicher.regelung.zeroWriteFirewallAction', '0-W-Firewall Aktion', 'string', 'text', 'inactive');
        await mk('speicher.regelung.zeroWriteFirewallReason', '0-W-Firewall Grund', 'string', 'text', '');
        await mk('speicher.regelung.zeroWriteFirewallHeldW', '0-W-Firewall gehaltener Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.zeroWriteFirewallExplicitStop', '0-W-Firewall expliziter Stop', 'boolean', 'indicator', false);
        await mk('speicher.regelung.zeroWriteFirewallBudgetZeroAgeMs', '0-W-Firewall Budget-0 Alter (ms)', 'number', 'value.interval', 0);
        await mk('speicher.regelung.zeroWriteFirewallMeasurementGapAgeMs', '0-W-Firewall Messluecken-Alter (ms)', 'number', 'value.interval', 0);
        await mk('speicher.regelung.balanceGehaltenSollW', 'Im NVP-Zielband gehaltener Speicher-Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.balanceFeedForwardVerfuegbar', 'Direkter PV-/Last-Feed-forward verfügbar', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedForwardVerwendet', 'Direkter PV-/Last-Feed-forward verwendet', 'boolean', 'indicator', false);
        await mk('speicher.regelung.balanceFeedForwardSollW', 'PV-/Last-Feed-forward Speicher-Sollwert (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardErwarteteIstW', 'Aus PV/Last/NVP erwartete Speicher-Istleistung (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardPvW', 'Direkte PV-Leistung im Feed-forward (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardLastW', 'Direkter Gebäudeverbrauch im Feed-forward (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedForwardPvQuelle', 'PV-Quelle des Feed-forward', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedForwardLastQuelle', 'Lastquelle des Feed-forward', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedForwardGrund', 'Grund/Status des PV-/Last-Feed-forward', 'string', 'text', '');
        await mk('speicher.regelung.balanceFeedForwardMessversatzMs', 'Messversatz PV/Last/NVP Feed-forward (ms)', 'number', 'value.interval', null);
        await mk('speicher.regelung.balanceFeedbackPlausibilitaetsfehlerW', 'Plausibilitätsfehler Batterie-Ist zu PV-/Last-Bilanz (W)', 'number', 'value.power', null);
        await mk('speicher.regelung.balanceFeedbackDurchFeedForwardVerworfen', 'Batterie-Istwert wegen PV-/Last-Plausibilität verworfen', 'boolean', 'indicator', false);
        await mk('speicher.regelung.pvBudgetAllocationMode', 'PV-Ueberschuss Prioritaetsmodus', 'string', 'text', '');
        await mk('speicher.regelung.pvBudgetRemainingBeforeStorageW', 'PV-Restbudget vor Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetStorageAvailableW', 'PV-Budget fuer Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetReservedW', 'Vom Speicher reserviertes PV-Budget (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetPostVendorCapW', 'Finaler PV-Budget-Cap nach Herstellerlogik (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetPostVendorCapped', 'Hersteller-Sollwert durch finales PV-Budget begrenzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.pvBudgetPostVendorNoWriteHold', 'Speicher hält bei kurzzeitigem PV-Budget 0 ohne Schreibzugriff', 'boolean', 'indicator', false);
        await mk('speicher.regelung.pvBudgetPostVendorNoWriteReason', 'Grund für Speicher PV-Budget No-Write/Hold', 'string', 'text', '');
        await mk('speicher.regelung.pvBudgetRuntimeRemainingW', 'PV-Restbudget laut Runtime vor Speicher (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetAllocationDerivedW', 'Aus EVCS-Allocation abgeleitetes Speicher-PV-Budget (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetEvcsReservedW', 'Im zentralen Budget reservierter EVCS-PV-Anteil (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvBudgetResolution', 'Quelle/Abgleich des Speicher-PV-Budgets', 'string', 'text', 'runtime-remaining');
        await mk('speicher.regelung.totalBudgetStorageAvailableW', 'Zentrales Gesamtbudget fuer Speicher-Netzladen (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.totalBudgetStorageReservedW', 'Vom Speicher reserviertes Gesamtbudget fuer Netzladen (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.totalBudgetStorageCapped', 'Speicher-Netzladen durch zentrales Gesamtbudget begrenzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.selfEntladenAktiviert', 'Eigenverbrauch-Entladen aktiviert', 'boolean', 'indicator', false);
        await mk('speicher.regelung.evcsSpeicherSchutzLastW', 'EVCS-Leistung mit Speicher-Schutz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzWallboxen', 'Wallboxen mit Speicher-Schutz', 'number', 'value', 0);
        await mk('speicher.regelung.evcsSpeicherMitnutzungLastW', 'EVCS-Leistung mit Speicher-Mitnutzung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzNvpZielOffsetW', 'NVP-Zieloffset durch EVCS-Speicher-Schutz (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.evcsSpeicherSchutzQuelle', 'Quelle der EVCS-Speicher-Policy', 'string', 'text', '');

        // Sungrow-Hybrid-Diagnoseobjekte vor dem ersten zyklischen Schreiben anlegen.
        // Zusätzlich sichert _setIfChanged fehlende Runtime-States ab, falls ein Update
        // ohne sauberen Objekt-Neuaufbau gestartet wurde.
        await mk('speicher.regelung.sungrowHybridAktiv', 'Sungrow Hybrid Herstellerprofil aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.sungrowHybridModus', 'Sungrow Hybrid Modus', 'string', 'text', '');
        await mk('speicher.regelung.sungrowHybridGrund', 'Sungrow Hybrid Grund', 'string', 'text', '');
        await mk('speicher.regelung.sungrowHybridSchreibmodus', 'Sungrow Hybrid Schreibmodus', 'string', 'text', '');
        await mk('speicher.regelung.sungrowHybridSollW', 'Sungrow Hybrid angewendeter Sollwert', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridPvW', 'Sungrow Hybrid erkannte PV-Leistung', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridLastW', 'Sungrow Hybrid erkannte Gebäudelast', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpW', 'Sungrow Hybrid Netzpunktleistung', 'number', 'value.power', null);
        await mk('speicher.regelung.sungrowHybridImportW', 'Sungrow Hybrid Netzbezug', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridExportW', 'Sungrow Hybrid Netzeinspeisung', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridPvDecktLast', 'Sungrow Hybrid PV deckt Gebäudelast', 'boolean', 'indicator', false);
        await mk('speicher.regelung.sungrowHybridSchwelleW', 'Sungrow Hybrid PV-Schwellwert', 'number', 'value.power', 300);
        await mk('speicher.regelung.sungrowHybridLastReserveW', 'Sungrow Hybrid Lastdeckungsreserve', 'number', 'value.power', 300);
        await mk('speicher.regelung.sungrowHybridImportSchwelleW', 'Sungrow Hybrid Import-Schwelle', 'number', 'value.power', 100);

        await mk('speicher.regelung.sungrowHybridNvpZielW', 'Sungrow NVP Zielbezug (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpDeadbandW', 'Sungrow NVP Deadband (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpFehlerW', 'Sungrow NVP Regelfehler (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpBalanceBasisW', 'Sungrow NVP Balancing Basis/Ist (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpBalanceZielW', 'Sungrow NVP Balancing Ziel (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.sungrowHybridNvpBalanceAktiv', 'Sungrow NVP Balancing aktiv', 'boolean', 'indicator', false);

        // E3/DC-RSCP-Diagnoseobjekte vor dem ersten Schreibzugriff anlegen.
        // Der ioBroker.e3dc-rscp Adapter nutzt SET_POWER_MODE + SET_POWER_VALUE;
        // diese States zeigen transparent, welches RSCP-Tupel NexoWatt zuletzt gesetzt hat.
        await mk('speicher.regelung.e3dcRscpAktiv', 'E3/DC RSCP Herstellerprofil aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.e3dcRscpModus', 'E3/DC RSCP Modus', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpModeCode', 'E3/DC RSCP SET_POWER_MODE Code', 'number', 'value', 0);
        await mk('speicher.regelung.e3dcRscpValueW', 'E3/DC RSCP SET_POWER_VALUE (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.e3dcRscpSollW', 'E3/DC RSCP NexoWatt Sollwert (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.e3dcRscpSchreibmodus', 'E3/DC RSCP Schreibmodus', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpQuelle', 'E3/DC RSCP Quelle', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpGrund', 'E3/DC RSCP Grund', 'string', 'text', '');
        await mk('speicher.regelung.e3dcRscpGridCharge', 'E3/DC RSCP GRID_CHARGE aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.e3dcRscpZeroMode', 'E3/DC RSCP 0-W-Modus', 'string', 'text', 'normal');
        await mk('speicher.regelung.e3dcRscpPowerLimitsUsed', 'E3/DC RSCP PowerLimits gesetzt', 'boolean', 'indicator', false);
        await mk('speicher.regelung.e3dcRscpSchreibOk', 'E3/DC RSCP Schreiben OK', 'boolean', 'indicator', false);
        await mk('speicher.regelung.policyMode', 'Speicher-Policy-Modus', 'string', 'text', 'eigenverbrauch');
        await mk('speicher.regelung.policyLayerStorageOnly', 'Policy-Schicht reine Eigenverbrauchsoptimierung', 'boolean', 'indicator', true);
        await mk('speicher.regelung.multiUsePolicyActive', 'MultiUse-Policy aktiv', 'boolean', 'indicator', false);
        await mk('speicher.regelung.multiUsePolicyIgnored', 'Inaktive MultiUse-Policy ignoriert', 'boolean', 'indicator', false);

        await mk('speicher.regelung.maxChargeW', 'Max Ladeleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.maxDischargeW', 'Max Entladeleistung (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.stepW', 'Schrittweite (W)', 'number', 'value', 0);
        await mk('speicher.regelung.maxDeltaWPerTick', 'Max Änderung je Takt (W)', 'number', 'value.power', 0);
        await mk('speicher.regelung.pvSchwelleW', 'PV-Überschuss-Schwelle (W)', 'number', 'value.power', 0);
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
    async _ensureRuntimeStateObject(id, val) {
        // Sicherheitsnetz fuer Feld-Updates: Wenn ein neuer Diagnose-State vor dem
        // Objekt-Rebuild geschrieben wird, legt ioBroker sonst bei jedem Tick eine
        // Warnung ins Log. Wir legen nur eigene Runtime-States im Speicher-Regelungs-
        // Namespace nachtraeglich an und vermeiden damit Log-Spam durch neue States.
        try {
            if (!this.adapter || typeof this.adapter.setObjectNotExistsAsync !== 'function') return;
            const sid = String(id || '');
            if (!sid.startsWith('speicher.regelung.')) return;
            const numericById = /W$|Pct$|Ms$|Limit|Headroom|Schwelle|Reserve|Soc|SoC|Ziel|Fehler|Basis/.test(sid);
            const booleanById = /Aktiv$|Ok$|Erlaubt$|DecktLast$|Ignored$|Active$/.test(sid);
            const type = (typeof val === 'boolean' || booleanById)
                ? 'boolean'
                : ((typeof val === 'number' || numericById) ? 'number' : 'string');
            let role = type === 'boolean' ? 'indicator' : (type === 'number' ? 'value' : 'text');
            if (type === 'number') {
                if (/W$/.test(sid) || /Power/.test(sid) || /Leistung/.test(sid)) role = 'value.power';
                else if (/Ms$/.test(sid) || /Alter/.test(sid)) role = 'value.interval';
            }
            await this.adapter.setObjectNotExistsAsync(sid, {
                type: 'state',
                common: { name: sid, type, role, read: true, write: false, def: val === undefined ? null : val },
                native: {},
            });
        } catch {
            // Diagnose-Objekterstellung darf den Regeltakt nie abbrechen.
        }
    }

    async _setIfChanged(id, val) {
        const v = (val === undefined) ? null : val;
        try {
            const cur = await this.adapter.getStateAsync(id);
            const curVal = cur ? cur.val : null;
            if (cur && curVal === v) return;
            if (!cur) await this._ensureRuntimeStateObject(id, v);
            await this.adapter.setStateAsync(id, v, true);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_readOwnNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readOwnNumber(id) {
        try {
            const s = await this.adapter.getStateAsync(id);
            const n = Number(s ? s.val : NaN);
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /**
     * Code-Teil: _readOwnNumberFresh
     * Zweck: Liest interne Diagnose-/Koordinationswerte nur, wenn sie frisch sind.
     * Zusammenhang: EVCS-Speicher-Schutz darf einen Speicher nicht mit alten Wallbox-
     * Leistungswerten sperren; deshalb wird der ioBroker-State-Zeitstempel hier hart
     * gegen einen Maximalwert geprüft.
     */
    async _readOwnNumberFresh(id, maxAgeMs = 60000) {
        try {
            const s = await this.adapter.getStateAsync(id);
            if (!s) return null;
            const ts = Number(s.ts);
            if (Number.isFinite(ts) && maxAgeMs > 0 && (Date.now() - ts) > maxAgeMs) return null;
            const n = Number(s.val);
            return Number.isFinite(n) ? n : null;
        } catch {
            return null;
        }
    }

    /**
     * Code-Teil: Methode `_readOwnString`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnString
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
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
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(n, min, max) {
    if (!Number.isFinite(n)) return n;
    if (Number.isFinite(min)) n = Math.max(min, n);
    if (Number.isFinite(max)) n = Math.min(max, n);
    return n;
}

module.exports = { SpeicherRegelungModule };
