// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/operating-strategies-appcenter.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * www/operating-strategies-appcenter.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 5ec892a2f9ca36cd9a1428253f53b00532f5ecbd4842965a0095395188f6ef20
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/operating-strategies-appcenter.ts
 * Quell-Hash: sha256:67b2d9c31b9b563e7eea7a7ceeedc75d08c8cf1c3285c2e675c066a63ce13240
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/operating-strategies-appcenter.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt EOS Betriebsstrategien – AppCenter-Grundlage.
 *
 * Diese Browserkomponente verwaltet ausschließlich die Konfiguration für das
 * spätere Ressourcen-/Strategiemodell. RC53 arbeitet strikt im Beobachtungsmodus:
 * Es werden keine Hardware-Sollwerte geschrieben und keine bestehenden Lade-,
 * Speicher- oder Verbraucherregler übernommen.
 */
(function () {
    'use strict';
    const FOUNDATION_VERSION = '0.8.177';
    const APP_ID = 'operatingStrategies';
    const ROOT_ID = 'nwOperatingStrategiesRoot';
/**
 * Code-Teil: setStatus
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    let setStatus = () => { };
/**
 * Code-Teil: getEdition
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    let getEdition = () => 'none';
    let mountNode = null;
    let fullConfig = {};
    let workingConfig = {};
    let appEnabled = false;
/**
 * Code-Teil: byId
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const byId = (id) => document.getElementById(id);
/**
 * Code-Teil: esc
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const esc = (value) => String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
/**
 * Code-Teil: clone
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const clone = (value) => {
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch (_error) {
            return value;
        }
    };
/**
 * Code-Teil: record
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const record = (value) => (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
/**
 * Code-Teil: list
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const list = (value) => Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const text = (value, fallback = '') => {
        const normalized = String(value == null ? '' : value).trim();
        return normalized || fallback;
    };
/**
 * Code-Teil: bool
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const bool = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;
/**
 * Code-Teil: number
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const number = (value, fallback, min, max) => {
        const parsed = Number(value);
        const safe = Number.isFinite(parsed) ? parsed : fallback;
        return Math.max(min, Math.min(max, safe));
    };
/**
 * Code-Teil: integer
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const integer = (value, fallback, min, max) => Math.round(number(value, fallback, min, max));
/**
 * Code-Teil: safeId
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const safeId = (value, fallback) => {
        const raw = text(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
        return raw || fallback;
    };
/**
 * Code-Teil: withUniqueIds
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function withUniqueIds(items, prefix) {
        const used = new Set();
        return items.map((entry, index) => {
            const base = safeId(entry && entry.id, `${prefix}-${index + 1}`);
            let id = base;
            let suffix = 2;
            while (used.has(id)) {
                id = `${base}-${suffix}`;
                suffix += 1;
            }
            used.add(id);
            return { ...entry, id };
        });
    }
/**
 * Code-Teil: edition
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const edition = () => {
        const raw = String(getEdition() || '').trim().toLowerCase();
        if (raw === 'eos' || raw === 'pro')
            return 'eos';
        if (raw === 'hems' || raw === 'home')
            return 'hems';
        return 'none';
    };
/**
 * Code-Teil: defaultNightReserve
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function defaultNightReserve(targetSocPct) {
        return {
            enabled: true,
            targetSocPct,
            absoluteMinSocPct: 10,
            startMode: 'sunset',
            startTime: '18:00',
            endMode: 'sunrise',
            endTime: '07:00',
        };
    }
/**
 * Code-Teil: defaultProfiles
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function defaultProfiles() {
        return [
            {
                id: 'winter',
                name: 'Winterbetrieb',
                enabled: true,
                season: 'winter',
                nightReserve: defaultNightReserve(40),
            },
            {
                id: 'summer',
                name: 'Sommerbetrieb',
                enabled: true,
                season: 'summer',
                nightReserve: defaultNightReserve(60),
            },
        ];
    }
/**
 * Code-Teil: defaultControlContract
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function defaultControlContract() {
        return {
            chargingScope: 'auto-only',
            explicitAutoSourceOptInRequired: true,
            existingChargingModesUntouched: true,
            singleWriterRequired: true,
            fallbackAutoSource: 'standard-auto',
        };
    }
/**
 * Code-Teil: defaultConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function defaultConfig() {
        return {
            schemaVersion: 1,
            enabled: false,
            mode: 'observe',
            controlTakeoverEnabled: false,
            writeExecutionEnabled: false,
            autoImportExisting: true,
            activeProfileId: 'winter',
            controlContract: defaultControlContract(),
            resourceLinks: [],
            customResources: [],
            profiles: defaultProfiles(),
            rules: [],
            metadata: {
                foundationVersion: FOUNDATION_VERSION,
                lastEditedAt: '',
            },
        };
    }
/**
 * Code-Teil: normalizeMappings
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function normalizeMappings(input) {
        const source = record(input);
        const keys = [
            'powerReadId',
            'energyReadId',
            'stateReadId',
            'socReadId',
            'temperatureReadId',
            'alarmReadId',
            'onlineReadId',
            'switchWriteId',
            'switchReadId',
            'setpointWriteId',
            'setpointReadId',
        ];
        const out = {};
        keys.forEach((key) => { out[key] = text(source[key]); });
        return out;
    }
/**
 * Code-Teil: normalizeCustomResource
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function normalizeCustomResource(input, index) {
        const source = record(input);
        const resourceTypes = ['consumer', 'thermal', 'chargingPoint', 'storage', 'producer', 'virtualGroup'];
        const controlTypes = ['monitor', 'switch', 'setpoint', 'stepped', 'thermal', 'energyTarget'];
        const failSafePolicies = ['observe-only', 'release', 'safe-on', 'safe-off', 'block-optimization'];
        const powerUnits = ['W', 'kW'];
        const resourceType = resourceTypes.includes(text(source.resourceType)) ? text(source.resourceType) : 'consumer';
        const controlType = controlTypes.includes(text(source.controlType)) ? text(source.controlType) : 'monitor';
        const failSafePolicy = failSafePolicies.includes(text(source.failSafePolicy)) ? text(source.failSafePolicy) : 'observe-only';
        const powerUnit = powerUnits.includes(text(source.powerUnit)) ? text(source.powerUnit) : 'W';
        return {
            id: safeId(source.id, `custom-${index + 1}`),
            name: text(source.name, `Benutzerdefinierte Ressource ${index + 1}`),
            enabled: source.enabled !== false,
            resourceType,
            controlType,
            powerUnit,
            staleTimeoutSec: integer(source.staleTimeoutSec, 60, 1, 86400),
            failSafePolicy,
            autoOnly: resourceType === 'chargingPoint' ? true : bool(source.autoOnly, false),
            observeOnly: true,
            writeEnabled: false,
            mappings: normalizeMappings(source.mappings),
        };
    }
/**
 * Code-Teil: normalizeProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function normalizeProfile(input, index) {
        const source = record(input);
        const reserve = record(source.nightReserve);
        const seasons = ['winter', 'summer', 'custom'];
        const modes = ['sunset', 'sunrise', 'fixed'];
        const targetSocPct = number(reserve.targetSocPct, index === 0 ? 40 : 60, 0, 100);
        const absoluteMinSocPct = Math.min(targetSocPct, number(reserve.absoluteMinSocPct, 10, 0, 100));
        const startMode = modes.includes(text(reserve.startMode)) ? text(reserve.startMode) : 'sunset';
        const endMode = modes.includes(text(reserve.endMode)) ? text(reserve.endMode) : 'sunrise';
        return {
            id: safeId(source.id, `profile-${index + 1}`),
            name: text(source.name, `Betriebsprofil ${index + 1}`),
            enabled: source.enabled !== false,
            season: seasons.includes(text(source.season)) ? text(source.season) : 'custom',
            nightReserve: {
                enabled: reserve.enabled !== false,
                targetSocPct,
                absoluteMinSocPct,
                startMode,
                startTime: /^\d{2}:\d{2}$/.test(text(reserve.startTime)) ? text(reserve.startTime) : '18:00',
                endMode,
                endTime: /^\d{2}:\d{2}$/.test(text(reserve.endTime)) ? text(reserve.endTime) : '07:00',
            },
        };
    }
/**
 * Code-Teil: normalizeLink
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function normalizeLink(input) {
        const source = record(input);
        const sourceId = text(source.sourceId);
        if (!sourceId)
            return null;
        return {
            sourceId,
            enabled: source.enabled === true,
            priority: integer(source.priority, 50, 1, 100),
            autoOnly: sourceId.startsWith('evcs:') ? true : bool(source.autoOnly, false),
            observeOnly: true,
            writeEnabled: false,
        };
    }
/**
 * Code-Teil: normalizeConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function normalizeConfig(input) {
        const base = defaultConfig();
        const source = record(input);
        const profiles = withUniqueIds(list(source.profiles).map(normalizeProfile), 'profile');
        const normalizedProfiles = profiles.length ? profiles : defaultProfiles();
        const profileIds = new Set(normalizedProfiles.map((profile) => profile.id));
        const requestedActive = text(source.activeProfileId, 'winter');
        const resourceLinks = list(source.resourceLinks).map(normalizeLink).filter(Boolean);
        const dedupedLinks = [];
        const linkIds = new Set();
        resourceLinks.forEach((entry) => {
            if (linkIds.has(entry.sourceId))
                return;
            linkIds.add(entry.sourceId);
            dedupedLinks.push(entry);
        });
        return {
            ...base,
            ...clone(source),
            schemaVersion: 1,
            enabled: source.enabled === true,
            mode: 'observe',
            controlTakeoverEnabled: false,
            writeExecutionEnabled: false,
            autoImportExisting: source.autoImportExisting !== false,
            activeProfileId: profileIds.has(requestedActive) ? requestedActive : (normalizedProfiles[0]?.id || 'winter'),
            controlContract: defaultControlContract(),
            resourceLinks: dedupedLinks,
            customResources: withUniqueIds(list(source.customResources).map(normalizeCustomResource), 'custom'),
            profiles: normalizedProfiles,
            // Regelbausteine werden erst in einer späteren Ausbaustufe freigegeben.
            // RC53 speichert deshalb auch bei manipulierten Payloads keine ausführbare Regeldefinition.
            rules: [],
            metadata: {
                ...record(source.metadata),
                foundationVersion: FOUNDATION_VERSION,
                lastEditedAt: text(record(source.metadata).lastEditedAt),
            },
        };
    }
/**
 * Code-Teil: objectDpCount
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function objectDpCount(value) {
        if (!value || typeof value !== 'object')
            return 0;
        let count = 0;
        Object.entries(value).forEach(([key, entry]) => {
            if (/id$/i.test(key) && text(entry))
                count += 1;
            else if (entry && typeof entry === 'object')
                count += objectDpCount(entry);
        });
        return count;
    }
/**
 * Code-Teil: truthyDp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function truthyDp(value) {
        return !!text(value);
    }
/**
 * Code-Teil: deriveStorageFarmResources
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function deriveStorageFarmResources(config) {
        const app = record(record(record(config.emsApps).apps).storagefarm);
        const farm = record(config.storageFarm);
        const storages = list(farm.storages);
        if (app.installed !== true && storages.length === 0)
            return [];
        return storages.map((storage, index) => {
            const readCandidates = [
                storage.socId, storage.signedPowerId, storage.chargePowerId,
                storage.dischargePowerId, storage.gridPowerId, storage.pvPowerId,
            ];
            const writeCandidates = [
                storage.feneconGridSetpointId, storage.setSignedPowerId, storage.setChargePowerId,
                storage.setDischargePowerId, storage.maxChargePowerId, storage.maxDischargePowerId,
                storage.chargeEnableId, storage.dischargeEnableId, storage.runWriteId,
            ];
            const reads = readCandidates.filter(truthyDp).length;
            const writes = writeCandidates.filter(truthyDp).length;
            return {
                sourceId: `storagefarm:${index + 1}`,
                name: text(storage.name, `Speicher ${index + 1}`),
                resourceType: 'storage',
                sourceLabel: `EOS Speicherfarm · Speicher ${index + 1}`,
                sourceTab: 'storagefarm',
                reads,
                writes,
                capabilities: [
                    reads ? `${reads} Lesebindung${reads === 1 ? '' : 'en'}` : 'Messwerte unvollständig',
                    writes ? 'Stellpfad vorhanden – bestehende Speicherfarm bleibt zuständig' : 'Kein Stellpfad erkannt',
                    'Nachtenergie-Reserve vorgesehen',
                ],
            };
        });
    }
/**
 * Code-Teil: deriveStorageResource
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function deriveStorageResource(config) {
        const storageApp = record(record(record(config.emsApps).apps).storage);
        const storage = record(config.storage);
        const storageDps = record(storage.datapoints);
        const dps = record(config.datapoints);
        const installed = storageApp.installed === true;
        const readCandidates = [
            storageDps.socObjectId, storageDps.powerObjectId, storageDps.chargePowerObjectId,
            storageDps.dischargePowerObjectId, dps.storageSoc, dps.storagePower,
            dps.storageChargePower, dps.storageDischargePower,
        ];
        const writeCandidates = [
            storageDps.targetPowerObjectId, storageDps.maxChargeObjectId,
            storageDps.maxDischargeObjectId, storageDps.chargeEnableObjectId,
            storageDps.dischargeEnableObjectId, storageDps.runObjectId,
        ];
        if (!installed && !readCandidates.some(truthyDp) && !writeCandidates.some(truthyDp))
            return [];
        const reads = readCandidates.filter(truthyDp).length;
        const writes = writeCandidates.filter(truthyDp).length;
        return [{
                sourceId: 'storage:primary',
                name: text(storage.name, 'Speicher'),
                resourceType: 'storage',
                sourceLabel: 'EOS Speicherregelung',
                sourceTab: 'storageconfig',
                reads,
                writes,
                capabilities: [
                    reads ? 'Messwerte vorhanden' : 'Messwerte unvollständig',
                    writes ? 'Stellpfad vorhanden – hier gesperrt' : 'Kein Stellpfad erkannt',
                    'Nachtenergie-Reserve vorgesehen',
                ],
            }];
    }
/**
 * Code-Teil: deriveEvcsResources
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function deriveEvcsResources(config) {
        const settingsConfig = record(config.settingsConfig);
        return list(settingsConfig.evcsList).map((row, index) => {
            const readKeys = ['powerId', 'energyTotalId', 'statusId', 'vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'vehicleSocId', 'onlineId', 'activeId'];
            const writeKeys = ['setCurrentAId', 'setPowerWId', 'enableWriteId', 'phaseSwitchWriteId'];
            const reads = readKeys.filter((key) => truthyDp(row[key])).length;
            const writes = writeKeys.filter((key) => truthyDp(row[key])).length;
            const stationKey = text(row.stationKey);
            const connectorNo = integer(row.connectorNo, index + 1, 0, 999);
            const summary = [stationKey ? `Station ${stationKey}` : '', connectorNo ? `Connector ${connectorNo}` : '', text(row.chargerType)].filter(Boolean).join(' · ');
            return {
                sourceId: `evcs:lp${index + 1}`,
                name: text(row.name, `Ladepunkt ${index + 1}`),
                resourceType: 'chargingPoint',
                sourceLabel: summary || 'EOS Ladepunkt',
                sourceTab: 'evcs',
                currentMode: text(row.userMode || row.mode, 'Auto/Benutzerauswahl'),
                reads,
                writes,
                enabledAtSource: row.enabled !== false,
                capabilities: [
                    reads ? `${reads} Lesebindung${reads === 1 ? '' : 'en'}` : 'Messwerte unvollständig',
                    truthyDp(row.vehicleSocId) ? 'Fahrzeug-SoC verfügbar' : 'Fahrzeug-SoC fehlt',
                    writes ? 'Stellpfad vorhanden – hier gesperrt' : 'Kein Stellpfad erkannt',
                    'Spätere Strategie ausschließlich in Auto',
                ],
            };
        }).filter((entry) => entry.enabledAtSource || entry.reads || entry.writes || entry.name);
    }
/**
 * Code-Teil: deriveFlowConsumerResources
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function deriveFlowConsumerResources(config) {
        const flowSlots = record(record(config.vis).flowSlots);
        const dps = record(config.datapoints);
        return list(flowSlots.consumers).map((slot, index) => {
            const ctrl = record(slot.ctrl);
            const powerDp = text(dps[`consumer${index + 1}Power`]);
            const readCandidates = [powerDp, ctrl.switchReadId, ctrl.setpointReadId, ctrl.sgReadyAReadId, ctrl.sgReadyBReadId];
            const writeCandidates = [ctrl.switchWriteId, ctrl.setpointWriteId, ctrl.sgReadyAWriteId, ctrl.sgReadyBWriteId];
            for (let stage = 1; stage <= 12; stage += 1) {
                readCandidates.push(ctrl[`stage${stage}ReadId`]);
                writeCandidates.push(ctrl[`stage${stage}WriteId`]);
            }
            const reads = readCandidates.filter(truthyDp).length;
            const writes = writeCandidates.filter(truthyDp).length;
            const name = text(slot.name);
            if (!name && !reads && !writes)
                return null;
            const consumerType = text(slot.consumerType, 'generic');
            const resourceType = consumerType === 'heatPump' ? 'thermal' : (consumerType === 'heatingRod' ? 'thermal' : 'consumer');
            return {
                sourceId: `flow-consumer:${index + 1}`,
                name: name || `Energiefluss-Verbraucher ${index + 1}`,
                resourceType,
                sourceLabel: `Energiefluss · Slot ${index + 1}`,
                sourceTab: 'flow',
                reads,
                writes,
                capabilities: [
                    powerDp ? 'Leistungsmessung vorhanden' : 'Leistungsmessung fehlt',
                    writes ? 'Steuerzuordnung vorhanden – hier gesperrt' : 'Nur messbar / Steuerung ergänzen',
                ],
            };
        }).filter(Boolean);
    }
/**
 * Code-Teil: deriveModuleDevices
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function deriveModuleDevices(config, key, label, tab, resourceType) {
        const moduleConfig = record(config[key]);
        return list(moduleConfig.devices).map((device, index) => {
            const dpCount = objectDpCount(device);
            const name = text(device.name, `${label} ${index + 1}`);
            if (!name && !dpCount)
                return null;
            return {
                sourceId: `${key}:${index + 1}`,
                name,
                resourceType,
                sourceLabel: `${label} · Geräteprofil ${index + 1}`,
                sourceTab: tab,
                reads: dpCount,
                writes: 0,
                capabilities: [
                    dpCount ? `${dpCount} Datenpunkt-Zuordnung${dpCount === 1 ? '' : 'en'} erkannt` : 'Zuordnung unvollständig',
                    'Bestehende Modulregelung bleibt zuständig',
                ],
            };
        }).filter(Boolean);
    }
/**
 * Code-Teil: deriveExistingResources
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function deriveExistingResources(config) {
        const storageFarmResources = deriveStorageFarmResources(config);
        const combined = [
            ...(storageFarmResources.length ? storageFarmResources : deriveStorageResource(config)),
            ...deriveEvcsResources(config),
            ...deriveFlowConsumerResources(config),
            ...deriveModuleDevices(config, 'thermal', 'Thermisches Gerät', 'thermal', 'thermal'),
            ...deriveModuleDevices(config, 'heatingRod', 'Heizstab', 'heatingrod', 'thermal'),
        ];
        const seen = new Set();
        return combined.filter((entry) => {
            const id = text(entry.sourceId);
            if (!id || seen.has(id))
                return false;
            seen.add(id);
            return true;
        });
    }
/**
 * Code-Teil: linkBySourceId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function linkBySourceId(sourceId) {
        const existing = list(workingConfig.resourceLinks).find((entry) => text(entry.sourceId) === sourceId);
        return existing || {
            sourceId,
            enabled: false,
            priority: 50,
            autoOnly: sourceId.startsWith('evcs:'),
            observeOnly: true,
            writeEnabled: false,
        };
    }
/**
 * Code-Teil: resourceTypeLabel
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function resourceTypeLabel(type) {
        const labels = {
            consumer: 'Verbraucher',
            thermal: 'Thermisch flexibel',
            chargingPoint: 'Ladepunkt',
            storage: 'Speicher',
            producer: 'Erzeuger',
            virtualGroup: 'Virtuelle Gruppe',
        };
        return labels[type] || 'Ressource';
    }
/**
 * Code-Teil: controlTypeLabel
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function controlTypeLabel(type) {
        const labels = {
            monitor: 'Nur messen',
            switch: 'Ein/Aus',
            setpoint: 'Stufenloser Sollwert',
            stepped: 'Stufig',
            thermal: 'Temperaturgeführt',
            energyTarget: 'Energie-/SoC-Ziel',
        };
        return labels[type] || type;
    }
/**
 * Code-Teil: badge
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function badge(label, tone = '') {
        return `<span class="nw-os-badge${tone ? ` nw-os-badge--${tone}` : ''}">${esc(label)}</span>`;
    }
/**
 * Code-Teil: gotoTabButton
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function gotoTabButton(tab) {
        return tab ? `<button type="button" class="nw-btn nw-btn--small" data-os-goto-tab="${esc(tab)}">Zuordnung öffnen</button>` : '';
    }
/**
 * Code-Teil: existingResourcesHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function existingResourcesHtml(resources) {
        if (!resources.length) {
            return '<div class="nw-os-empty">Noch keine vorhandenen EOS-Geräte erkannt. Benutzerdefinierte Ressourcen können darunter angelegt werden.</div>';
        }
        return resources.map((resource) => {
            const link = linkBySourceId(resource.sourceId);
            const modeBadge = resource.resourceType === 'chargingPoint'
                ? badge('Nur Auto → Betriebsstrategie', 'lock')
                : badge('Beobachtung', 'safe');
            const mappingTone = resource.reads > 0 ? 'safe' : 'warn';
            const mappingLabel = resource.reads > 0 ? `${resource.reads} Lesepfad${resource.reads === 1 ? '' : 'e'}` : 'Keine Lesebindung';
            return `
        <div class="nw-os-resource" data-os-existing-resource="${esc(resource.sourceId)}">
          <div class="nw-os-resource__select">
            <label class="nw-field nw-field--switch"><span>Für Strategie vormerken</span><input type="checkbox" data-os-link-enabled="${esc(resource.sourceId)}" ${link.enabled ? 'checked' : ''}></label>
            <label class="nw-field"><span>Priorität</span><input type="number" min="1" max="100" value="${esc(link.priority)}" data-os-link-priority="${esc(resource.sourceId)}"></label>
          </div>
          <div class="nw-os-resource__body">
            <div class="nw-os-resource__title">${esc(resource.name)}</div>
            <div class="nw-os-resource__subtitle">${esc(resource.sourceLabel)} · ${esc(resourceTypeLabel(resource.resourceType))}</div>
            <div class="nw-os-badges">${modeBadge}${badge(mappingLabel, mappingTone)}${resource.writes ? badge(`${resource.writes} Stellpfad${resource.writes === 1 ? '' : 'e'} erkannt – gesperrt`, 'lock') : badge('Kein Stellpfad erkannt', 'muted')}</div>
            <ul class="nw-os-capabilities">${(Array.isArray(resource.capabilities) ? resource.capabilities : []).map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul>
          </div>
          <div class="nw-os-resource__action">${gotoTabButton(resource.sourceTab)}</div>
        </div>`;
        }).join('');
    }
/**
 * Code-Teil: dpInput
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function dpInput(resource, index, key, label, write = false) {
        const id = `osCustom_${index}_${key}`;
        const current = text(record(resource.mappings)[key]);
        return `
      <label class="nw-field nw-os-dp-field${write ? ' nw-os-dp-field--write' : ''}">
        <span>${esc(label)}${write ? ' · Schreibpfad gesperrt' : ''}</span>
        <div class="nw-os-dp-row">
          <input id="${esc(id)}" type="text" value="${esc(current)}" placeholder="Datenpunkt-ID …" data-os-custom-map-index="${index}" data-os-custom-map-key="${esc(key)}">
          <button type="button" class="nw-btn nw-btn--small" data-browse="${esc(id)}">Auswählen</button>
        </div>
      </label>`;
    }
/**
 * Code-Teil: customResourcesHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function customResourcesHtml(resources) {
        if (!resources.length) {
            return '<div class="nw-os-empty">Noch keine benutzerdefinierte Ressource. Lege hier Geräte an, die noch nicht in Speicher, Ladepunkten oder Energiefluss zugeordnet sind.</div>';
        }
        return resources.map((resource, index) => `
      <div class="nw-os-custom" data-os-custom-index="${index}">
        <div class="nw-os-custom__header">
          <div>
            <div class="nw-os-custom__title">${esc(resource.name)}</div>
            <div class="nw-os-custom__subtitle">${esc(resourceTypeLabel(resource.resourceType))} · ${esc(controlTypeLabel(resource.controlType))}</div>
          </div>
          <button type="button" class="nw-btn nw-btn--small" data-os-delete-custom="${index}">Löschen</button>
        </div>
        <div class="nw-config-grid">
          <label class="nw-field nw-field--switch"><span>Ressource verwenden</span><input type="checkbox" data-os-custom-index="${index}" data-os-custom-field="enabled" ${resource.enabled !== false ? 'checked' : ''}></label>
          <label class="nw-field"><span>Name</span><input type="text" value="${esc(resource.name)}" data-os-custom-index="${index}" data-os-custom-field="name"></label>
          <label class="nw-field"><span>Ressourcentyp</span><select data-os-custom-index="${index}" data-os-custom-field="resourceType">
            <option value="consumer"${resource.resourceType === 'consumer' ? ' selected' : ''}>Allgemeiner Verbraucher</option>
            <option value="thermal"${resource.resourceType === 'thermal' ? ' selected' : ''}>Thermisch flexibler Verbraucher</option>
            <option value="chargingPoint"${resource.resourceType === 'chargingPoint' ? ' selected' : ''}>Ladepunkt</option>
            <option value="storage"${resource.resourceType === 'storage' ? ' selected' : ''}>Speicher</option>
            <option value="producer"${resource.resourceType === 'producer' ? ' selected' : ''}>Erzeuger</option>
            <option value="virtualGroup"${resource.resourceType === 'virtualGroup' ? ' selected' : ''}>Virtuelle Gruppe</option>
          </select></label>
          <label class="nw-field"><span>Fähigkeitsprofil</span><select data-os-custom-index="${index}" data-os-custom-field="controlType">
            <option value="monitor"${resource.controlType === 'monitor' ? ' selected' : ''}>Nur messen</option>
            <option value="switch"${resource.controlType === 'switch' ? ' selected' : ''}>Ein/Aus</option>
            <option value="setpoint"${resource.controlType === 'setpoint' ? ' selected' : ''}>Stufenloser Sollwert</option>
            <option value="stepped"${resource.controlType === 'stepped' ? ' selected' : ''}>Stufig</option>
            <option value="thermal"${resource.controlType === 'thermal' ? ' selected' : ''}>Temperaturgeführt</option>
            <option value="energyTarget"${resource.controlType === 'energyTarget' ? ' selected' : ''}>Energie-/SoC-Ziel</option>
          </select></label>
          <label class="nw-field"><span>Leistungseinheit</span><select data-os-custom-index="${index}" data-os-custom-field="powerUnit"><option value="W"${resource.powerUnit === 'W' ? ' selected' : ''}>W</option><option value="kW"${resource.powerUnit === 'kW' ? ' selected' : ''}>kW</option></select></label>
          <label class="nw-field"><span>Maximales Messwertalter</span><input type="number" min="1" max="86400" value="${esc(resource.staleTimeoutSec)}" data-os-custom-index="${index}" data-os-custom-field="staleTimeoutSec"><small>s</small></label>
          <label class="nw-field"><span>Fail-Safe-Vorbereitung</span><select data-os-custom-index="${index}" data-os-custom-field="failSafePolicy">
            <option value="observe-only"${resource.failSafePolicy === 'observe-only' ? ' selected' : ''}>Nur beobachten</option>
            <option value="release"${resource.failSafePolicy === 'release' ? ' selected' : ''}>Später Regelung freigeben</option>
            <option value="safe-on"${resource.failSafePolicy === 'safe-on' ? ' selected' : ''}>Später sicher einschalten</option>
            <option value="safe-off"${resource.failSafePolicy === 'safe-off' ? ' selected' : ''}>Später sicher ausschalten</option>
            <option value="block-optimization"${resource.failSafePolicy === 'block-optimization' ? ' selected' : ''}>Später Optimierung sperren</option>
          </select></label>
        </div>
        <div class="nw-os-section-label">Lesedatenpunkte</div>
        <div class="nw-config-grid">
          ${dpInput(resource, index, 'powerReadId', 'Aktuelle Leistung')}
          ${dpInput(resource, index, 'energyReadId', 'Energiezähler')}
          ${dpInput(resource, index, 'stateReadId', 'Betriebszustand')}
          ${dpInput(resource, index, 'socReadId', 'SoC')}
          ${dpInput(resource, index, 'temperatureReadId', 'Temperatur')}
          ${dpInput(resource, index, 'alarmReadId', 'Alarm / Störung')}
          ${dpInput(resource, index, 'onlineReadId', 'Online / Kommunikation')}
        </div>
        <div class="nw-os-section-label">Vorbereitete Stell- und Rückmeldepunkte</div>
        <div class="nw-os-lock-note">Diese Zuordnungen werden gespeichert, aber RC53 führt daraus ausdrücklich keine Schreibbefehle aus.</div>
        <div class="nw-config-grid">
          ${dpInput(resource, index, 'switchWriteId', 'Ein/Aus oder Freigabe', true)}
          ${dpInput(resource, index, 'switchReadId', 'Rückmeldung Ein/Aus')}
          ${dpInput(resource, index, 'setpointWriteId', 'Leistungs-/Sollwertvorgabe', true)}
          ${dpInput(resource, index, 'setpointReadId', 'Rückmeldung Sollwert')}
        </div>
      </div>`).join('');
    }
/**
 * Code-Teil: profilesHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function profilesHtml(profiles) {
        return profiles.map((profile, index) => {
            const reserve = record(profile.nightReserve);
            return `
        <div class="nw-os-profile" data-os-profile-index="${index}">
          <div class="nw-os-custom__header">
            <div>
              <div class="nw-os-custom__title">${esc(profile.name)}</div>
              <div class="nw-os-custom__subtitle">Nachtenergie wird bis zum Nachtbeginn zurückgehalten und darf während der Nacht den Grundverbrauch decken.</div>
            </div>
            ${profiles.length > 1 ? `<button type="button" class="nw-btn nw-btn--small" data-os-delete-profile="${index}">Löschen</button>` : ''}
          </div>
          <div class="nw-config-grid">
            <label class="nw-field nw-field--switch"><span>Profil aktiv</span><input type="checkbox" data-os-profile-index="${index}" data-os-profile-field="enabled" ${profile.enabled !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>Name</span><input type="text" value="${esc(profile.name)}" data-os-profile-index="${index}" data-os-profile-field="name"></label>
            <label class="nw-field"><span>Profilart</span><select data-os-profile-index="${index}" data-os-profile-field="season"><option value="winter"${profile.season === 'winter' ? ' selected' : ''}>Winter</option><option value="summer"${profile.season === 'summer' ? ' selected' : ''}>Sommer</option><option value="custom"${profile.season === 'custom' ? ' selected' : ''}>Benutzerdefiniert</option></select></label>
            <label class="nw-field nw-field--switch"><span>Nachtenergie-Reserve verwenden</span><input type="checkbox" data-os-profile-index="${index}" data-os-profile-reserve-field="enabled" ${reserve.enabled !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>SoC-Ziel zum Nachtbeginn</span><input type="number" min="0" max="100" step="1" value="${esc(reserve.targetSocPct)}" data-os-profile-index="${index}" data-os-profile-reserve-field="targetSocPct"><small>%</small></label>
            <label class="nw-field"><span>Absolute Speicheruntergrenze</span><input type="number" min="0" max="100" step="1" value="${esc(reserve.absoluteMinSocPct)}" data-os-profile-index="${index}" data-os-profile-reserve-field="absoluteMinSocPct"><small>%</small></label>
            <label class="nw-field"><span>Nachtbeginn</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="startMode"><option value="sunset"${reserve.startMode === 'sunset' ? ' selected' : ''}>Sonnenuntergang</option><option value="fixed"${reserve.startMode === 'fixed' ? ' selected' : ''}>Feste Uhrzeit</option><option value="sunrise"${reserve.startMode === 'sunrise' ? ' selected' : ''}>Sonnenaufgang</option></select></label>
            <label class="nw-field"><span>Feste Zeit / Rückfall</span><input type="time" value="${esc(reserve.startTime)}" data-os-profile-index="${index}" data-os-profile-reserve-field="startTime"></label>
            <label class="nw-field"><span>Nachtende</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="endMode"><option value="sunrise"${reserve.endMode === 'sunrise' ? ' selected' : ''}>Sonnenaufgang</option><option value="fixed"${reserve.endMode === 'fixed' ? ' selected' : ''}>Feste Uhrzeit</option><option value="sunset"${reserve.endMode === 'sunset' ? ' selected' : ''}>Sonnenuntergang</option></select></label>
            <label class="nw-field"><span>Feste Zeit / Rückfall</span><input type="time" value="${esc(reserve.endTime)}" data-os-profile-index="${index}" data-os-profile-reserve-field="endTime"></label>
          </div>
        </div>`;
        }).join('');
    }
/**
 * Code-Teil: styleHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function styleHtml() {
        return `<style>
      #${ROOT_ID}{display:grid;gap:16px}
      #${ROOT_ID} .nw-os-hero{border:1px solid rgba(119,185,0,.45);background:rgba(119,185,0,.08);border-radius:14px;padding:16px}
      #${ROOT_ID} .nw-os-hero__title{font-size:1.15rem;font-weight:700;margin-bottom:6px}
      #${ROOT_ID} .nw-os-hero__text{opacity:.86;line-height:1.5}
      #${ROOT_ID} .nw-os-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      #${ROOT_ID} .nw-os-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:.78rem;border:1px solid rgba(255,255,255,.16)}
      #${ROOT_ID} .nw-os-badge--safe{border-color:rgba(119,185,0,.55);background:rgba(119,185,0,.12)}
      #${ROOT_ID} .nw-os-badge--warn{border-color:rgba(255,183,77,.55);background:rgba(255,183,77,.12)}
      #${ROOT_ID} .nw-os-badge--lock{border-color:rgba(100,181,246,.45);background:rgba(100,181,246,.10)}
      #${ROOT_ID} .nw-os-badge--muted{opacity:.68}
      #${ROOT_ID} .nw-os-section{border:1px solid rgba(255,255,255,.11);border-radius:14px;padding:16px;background:rgba(255,255,255,.025)}
      #${ROOT_ID} .nw-os-section__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      #${ROOT_ID} .nw-os-section__title{font-size:1.05rem;font-weight:700}
      #${ROOT_ID} .nw-os-section__subtitle{opacity:.72;margin-top:4px;line-height:1.45}
      #${ROOT_ID} .nw-os-resource{display:grid;grid-template-columns:minmax(180px,240px) minmax(260px,1fr) auto;gap:14px;padding:14px 0;border-top:1px solid rgba(255,255,255,.09)}
      #${ROOT_ID} .nw-os-resource:first-child{border-top:0;padding-top:0}
      #${ROOT_ID} .nw-os-resource__select{display:grid;gap:8px;align-content:start}
      #${ROOT_ID} .nw-os-resource__title,#${ROOT_ID} .nw-os-custom__title{font-weight:700;font-size:1rem}
      #${ROOT_ID} .nw-os-resource__subtitle,#${ROOT_ID} .nw-os-custom__subtitle{opacity:.7;margin-top:3px;line-height:1.4}
      #${ROOT_ID} .nw-os-resource__action{display:flex;align-items:flex-start}
      #${ROOT_ID} .nw-os-capabilities{margin:9px 0 0 18px;padding:0;opacity:.8;line-height:1.45}
      #${ROOT_ID} .nw-os-custom,#${ROOT_ID} .nw-os-profile{border:1px solid rgba(255,255,255,.11);border-radius:12px;padding:14px;margin-top:12px}
      #${ROOT_ID} .nw-os-custom__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      #${ROOT_ID} .nw-os-section-label{font-weight:700;margin:16px 0 10px}
      #${ROOT_ID} .nw-os-dp-row{display:flex;gap:7px;align-items:center}
      #${ROOT_ID} .nw-os-dp-row input{min-width:0;flex:1}
      #${ROOT_ID} .nw-os-dp-field--write{border-left:3px solid rgba(100,181,246,.42);padding-left:9px}
      #${ROOT_ID} .nw-os-lock-note{padding:10px 12px;border-radius:9px;background:rgba(100,181,246,.09);border:1px solid rgba(100,181,246,.28);margin-bottom:12px;line-height:1.45}
      #${ROOT_ID} .nw-os-empty{padding:14px;border:1px dashed rgba(255,255,255,.18);border-radius:10px;opacity:.72;line-height:1.5}
      #${ROOT_ID} .nw-os-contract{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
      #${ROOT_ID} .nw-os-contract__item{padding:11px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}
      #${ROOT_ID} .nw-os-contract__item strong{display:block;margin-bottom:4px}
      @media(max-width:900px){#${ROOT_ID} .nw-os-resource{grid-template-columns:1fr}#${ROOT_ID} .nw-os-resource__action{justify-content:flex-start}}
    </style>`;
    }
/**
 * Code-Teil: renderHtml
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function renderHtml() {
        const resources = deriveExistingResources(fullConfig);
        const cfg = workingConfig;
        const eos = edition() === 'eos';
        const activeProfileOptions = list(cfg.profiles).map((profile) => `<option value="${esc(profile.id)}"${profile.id === cfg.activeProfileId ? ' selected' : ''}>${esc(profile.name)}</option>`).join('');
        const linkedCount = list(cfg.resourceLinks).filter((entry) => entry.enabled === true).length;
        return `${styleHtml()}
      <div id="${ROOT_ID}">
        <div class="nw-os-hero">
          <div class="nw-os-hero__title">Betriebsstrategien · sichere Grundlagenversion</div>
          <div class="nw-os-hero__text">Diese Ausbaustufe legt Ressourcen, Datenpunkt-Zuordnungen und Saisonprofile an. Sie beobachtet und speichert ausschließlich Konfiguration. Bestehende Lade-, Speicher-, Heizstab- und Thermikregler bleiben unverändert zuständig.</div>
          <div class="nw-os-badges">
            ${badge('Beobachtungsmodus', 'safe')}
            ${badge('0 Hardware-Schreibbefehle', 'lock')}
            ${badge('Ladepunkte später nur in Auto', 'lock')}
            ${badge('Single-Writer-Vertrag vorbereitet', 'safe')}
          </div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">App- und Sicherheitsstatus</div><div class="nw-os-section__subtitle">Installiert/Aktiv wird im AppCenter festgelegt. Die Steuerübernahme ist in RC53 technisch fest auf „aus“ verriegelt.</div></div>
          </div>
          <div class="nw-config-grid">
            <label class="nw-field"><span>Edition</span><input type="text" value="${eos ? 'EOS Pro' : 'Nicht freigeschaltet'}" disabled></label>
            <label class="nw-field"><span>App-Status</span><input type="text" value="${appEnabled ? 'Aktiviert · nur Konfiguration/Beobachtung' : 'Nicht aktiv'}" disabled></label>
            <label class="nw-field"><span>Betriebsmodus</span><input type="text" value="Beobachtung" disabled></label>
            <label class="nw-field"><span>Steuerübernahme</span><input type="text" value="Gesperrt" disabled></label>
            <label class="nw-field nw-field--switch"><span>Vorhandene EOS-Geräte automatisch anzeigen</span><input id="osAutoImportExisting" type="checkbox" ${cfg.autoImportExisting !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>Aktives Profil vorbereiten</span><select id="osActiveProfileId">${activeProfileOptions}</select></label>
          </div>
          ${eos ? '' : '<div class="nw-notice nw-notice--warn" style="margin-top:12px">Die Betriebsstrategien-App ist ausschließlich in EOS Pro verfügbar.</div>'}
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Verbindlicher Steuervertrag</div><div class="nw-os-section__subtitle">Diese Regeln verhindern, dass die neue App bestehende Betriebsmodi oder Regler überschreibt.</div></div>
          </div>
          <div class="nw-os-contract">
            <div class="nw-os-contract__item"><strong>Ladepunkte</strong>Spätere Teilnahme nur bei „Auto → Betriebsstrategie“ und ausdrücklicher Freigabe je Ladepunkt.</div>
            <div class="nw-os-contract__item"><strong>Andere Lademodi</strong>Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben vollständig eigenständig.</div>
            <div class="nw-os-contract__item"><strong>Ausführung</strong>Die Strategie liefert später nur Ziele; das bestehende Lademanagement bleibt Echtzeitregler.</div>
            <div class="nw-os-contract__item"><strong>Rückfall</strong>Bei Ausfall ist für Ladepunkte die bestehende Standard-Automatik vorgesehen.</div>
          </div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Vorhandene EOS-Ressourcen</div><div class="nw-os-section__subtitle">Speicher, Ladepunkte und Energiefluss-Verbraucher werden aus ihrer bestehenden Zuordnung gelesen; es entstehen keine doppelten Geräte. Vorgemerkt: ${linkedCount}.</div></div>
          </div>
          <div id="osExistingResources">${cfg.autoImportExisting !== false ? existingResourcesHtml(resources) : '<div class="nw-os-empty">Automatische Anzeige ist deaktiviert. Bereits gespeicherte Verknüpfungen bleiben erhalten.</div>'}</div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Benutzerdefinierte Ressourcen</div><div class="nw-os-section__subtitle">Für Geräte, die noch nicht in NexoWatt EOS angelegt sind. Lese- und spätere Stellpfade können bereits vollständig zugeordnet werden.</div></div>
            <button id="osAddCustomResource" type="button" class="nw-btn nw-btn--primary">Ressource hinzufügen</button>
          </div>
          <div id="osCustomResources">${customResourcesHtml(list(cfg.customResources))}</div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Saison- und Nachtreserveprofile</div><div class="nw-os-section__subtitle">Der Ziel-SoC wird bis zum Nachtbeginn geschützt. Während der Nacht darf diese Energie den allgemeinen Nachtverbrauch decken; nur die absolute Untergrenze bleibt gesperrt.</div></div>
            <button id="osAddProfile" type="button" class="nw-btn nw-btn--primary">Profil hinzufügen</button>
          </div>
          <div id="osProfiles">${profilesHtml(list(cfg.profiles))}</div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__title">Nächste Ausbaustufe</div>
          <div class="nw-os-section__subtitle">Auf dieser sicheren Grundlage folgen Regelbausteine, Muss-/Soll-/Kann-Ziele, Temperatur-/Abschaltdauerbedingungen, Simulation und erst danach die kontrollierte Übergabe an den zentralen Stellwertverteiler.</div>
        </div>
      </div>`;
    }
/**
 * Code-Teil: syncLinksFromDom
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function syncLinksFromDom() {
        const out = [];
        document.querySelectorAll('[data-os-link-enabled]').forEach((checkbox) => {
            const sourceId = text(checkbox.getAttribute('data-os-link-enabled'));
            if (!sourceId)
                return;
            const priorityInput = Array.from(document.querySelectorAll('[data-os-link-priority]'))
                .find((entry) => text(entry.getAttribute('data-os-link-priority')) === sourceId);
            out.push({
                sourceId,
                enabled: checkbox.checked,
                priority: integer(priorityInput?.value, 50, 1, 100),
                autoOnly: sourceId.startsWith('evcs:'),
                observeOnly: true,
                writeEnabled: false,
            });
        });
        const renderedIds = new Set(out.map((entry) => entry.sourceId));
        list(workingConfig.resourceLinks).forEach((entry) => {
            if (renderedIds.has(text(entry.sourceId)))
                return;
            const normalized = normalizeLink(entry);
            if (normalized)
                out.push(normalized);
        });
        workingConfig.resourceLinks = out.filter(Boolean);
    }
/**
 * Code-Teil: syncCustomFromDom
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function syncCustomFromDom() {
        const resources = list(workingConfig.customResources).map((entry) => clone(entry));
        document.querySelectorAll('[data-os-custom-field]').forEach((node) => {
            const index = integer(node.getAttribute('data-os-custom-index'), -1, -1, 10000);
            const field = text(node.getAttribute('data-os-custom-field'));
            if (index < 0 || !resources[index] || !field)
                return;
            if (node instanceof HTMLInputElement && node.type === 'checkbox')
                resources[index][field] = node.checked;
            else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement)
                resources[index][field] = node.value;
        });
        document.querySelectorAll('[data-os-custom-map-key]').forEach((node) => {
            const index = integer(node.getAttribute('data-os-custom-map-index'), -1, -1, 10000);
            const key = text(node.getAttribute('data-os-custom-map-key'));
            if (index < 0 || !resources[index] || !key)
                return;
            resources[index].mappings = record(resources[index].mappings);
            resources[index].mappings[key] = text(node.value);
        });
        workingConfig.customResources = resources.map(normalizeCustomResource);
    }
/**
 * Code-Teil: syncProfilesFromDom
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function syncProfilesFromDom() {
        const profiles = list(workingConfig.profiles).map((entry) => clone(entry));
        document.querySelectorAll('[data-os-profile-field]').forEach((node) => {
            const index = integer(node.getAttribute('data-os-profile-index'), -1, -1, 10000);
            const field = text(node.getAttribute('data-os-profile-field'));
            if (index < 0 || !profiles[index] || !field)
                return;
            if (node instanceof HTMLInputElement && node.type === 'checkbox')
                profiles[index][field] = node.checked;
            else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement)
                profiles[index][field] = node.value;
        });
        document.querySelectorAll('[data-os-profile-reserve-field]').forEach((node) => {
            const index = integer(node.getAttribute('data-os-profile-index'), -1, -1, 10000);
            const field = text(node.getAttribute('data-os-profile-reserve-field'));
            if (index < 0 || !profiles[index] || !field)
                return;
            profiles[index].nightReserve = record(profiles[index].nightReserve);
            if (node instanceof HTMLInputElement && node.type === 'checkbox')
                profiles[index].nightReserve[field] = node.checked;
            else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement)
                profiles[index].nightReserve[field] = node.value;
        });
        workingConfig.profiles = profiles.map(normalizeProfile);
        const active = byId('osActiveProfileId')?.value;
        if (text(active))
            workingConfig.activeProfileId = text(active);
    }
/**
 * Code-Teil: syncFromDom
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function syncFromDom() {
        if (!byId(ROOT_ID))
            return;
        const autoImport = byId('osAutoImportExisting');
        if (autoImport)
            workingConfig.autoImportExisting = autoImport.checked;
        syncLinksFromDom();
        syncCustomFromDom();
        syncProfilesFromDom();
        workingConfig = normalizeConfig(workingConfig);
    }
/**
 * Code-Teil: rerender
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function rerender() {
        if (!mountNode)
            return;
        mountNode.innerHTML = renderHtml();
        bindEvents();
    }
/**
 * Code-Teil: bindEvents
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function bindEvents() {
        const autoImport = byId('osAutoImportExisting');
        if (autoImport)
            autoImport.addEventListener('change', () => {
                syncFromDom();
                rerender();
            });
        const activeProfile = byId('osActiveProfileId');
        if (activeProfile)
            activeProfile.addEventListener('change', () => {
                workingConfig.activeProfileId = text(activeProfile.value);
            });
        const addResource = byId('osAddCustomResource');
        if (addResource)
            addResource.addEventListener('click', () => {
                syncFromDom();
                const index = list(workingConfig.customResources).length;
                workingConfig.customResources.push(normalizeCustomResource({
                    id: `custom-${Date.now()}`,
                    name: `Neue Ressource ${index + 1}`,
                    resourceType: 'consumer',
                    controlType: 'monitor',
                    mappings: {},
                }, index));
                rerender();
                setStatus('Benutzerdefinierte Ressource angelegt. Datenpunkte können jetzt zugeordnet werden.', 'ok');
            });
        const addProfile = byId('osAddProfile');
        if (addProfile)
            addProfile.addEventListener('click', () => {
                syncFromDom();
                const index = list(workingConfig.profiles).length;
                const profile = normalizeProfile({
                    id: `profile-${Date.now()}`,
                    name: `Betriebsprofil ${index + 1}`,
                    enabled: true,
                    season: 'custom',
                    nightReserve: defaultNightReserve(50),
                }, index);
                workingConfig.profiles.push(profile);
                workingConfig.activeProfileId = profile.id;
                rerender();
                setStatus('Neues Betriebsprofil angelegt.', 'ok');
            });
        document.querySelectorAll('[data-os-delete-custom]').forEach((button) => button.addEventListener('click', () => {
            syncFromDom();
            const index = integer(button.getAttribute('data-os-delete-custom'), -1, -1, 10000);
            if (index < 0 || index >= workingConfig.customResources.length)
                return;
            workingConfig.customResources.splice(index, 1);
            rerender();
            setStatus('Benutzerdefinierte Ressource aus der Betriebsstrategien-Konfiguration entfernt.', 'ok');
        }));
        document.querySelectorAll('[data-os-delete-profile]').forEach((button) => button.addEventListener('click', () => {
            syncFromDom();
            const index = integer(button.getAttribute('data-os-delete-profile'), -1, -1, 10000);
            if (index < 0 || index >= workingConfig.profiles.length || workingConfig.profiles.length <= 1)
                return;
            const removed = workingConfig.profiles.splice(index, 1)[0];
            if (removed && removed.id === workingConfig.activeProfileId)
                workingConfig.activeProfileId = workingConfig.profiles[0].id;
            rerender();
            setStatus('Betriebsprofil entfernt.', 'ok');
        }));
        document.querySelectorAll('[data-os-goto-tab]').forEach((button) => button.addEventListener('click', () => {
            const tab = text(button.getAttribute('data-os-goto-tab'));
            const target = tab ? document.querySelector(`.nw-tab[data-tab="${tab}"]`) : null;
            if (target)
                target.click();
        }));
        document.querySelectorAll('[data-os-link-enabled],[data-os-link-priority],[data-os-custom-field],[data-os-custom-map-key],[data-os-profile-field],[data-os-profile-reserve-field]')
            .forEach((node) => node.addEventListener('change', () => {
            syncFromDom();
        }));
    }
/**
 * Code-Teil: render
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function render(mount, config = {}, enabled = false) {
        if (!mount)
            return;
        mountNode = mount;
        fullConfig = record(config);
        appEnabled = enabled === true;
        workingConfig = normalizeConfig(fullConfig.operatingStrategies);
        rerender();
    }
/**
 * Code-Teil: apply
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function apply(config = {}, selectedEdition) {
        if (selectedEdition)
            getEdition = () => selectedEdition;
        const app = record(record(record(config.emsApps).apps)[APP_ID]);
        render(document.getElementById('operatingStrategiesConfigSlot'), config, app.installed === true && app.enabled === true).catch(() => undefined);
    }
/**
 * Code-Teil: collect
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function collect(existing = {}, enabled = false, selectedEdition) {
        if (selectedEdition)
            getEdition = () => selectedEdition;
        if (byId(ROOT_ID))
            syncFromDom();
        else
            workingConfig = normalizeConfig(existing);
        const eos = edition() === 'eos';
        const out = normalizeConfig(workingConfig);
        out.enabled = eos && enabled === true;
        out.mode = 'observe';
        out.controlTakeoverEnabled = false;
        out.writeExecutionEnabled = false;
        out.controlContract = defaultControlContract();
        out.resourceLinks = list(out.resourceLinks).map((entry) => ({
            ...normalizeLink(entry),
            observeOnly: true,
            writeEnabled: false,
            autoOnly: text(entry.sourceId).startsWith('evcs:') ? true : bool(entry.autoOnly, false),
        }));
        out.customResources = list(out.customResources).map((entry, index) => ({
            ...normalizeCustomResource(entry, index),
            observeOnly: true,
            writeEnabled: false,
            autoOnly: text(entry.resourceType) === 'chargingPoint' ? true : bool(entry.autoOnly, false),
        }));
        out.metadata = {
            ...record(out.metadata),
            foundationVersion: FOUNDATION_VERSION,
            lastEditedAt: new Date().toISOString(),
        };
        workingConfig = out;
        return clone(out);
    }
/**
 * Code-Teil: setup
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function setup(options = {}) {
        if (typeof options.setStatus === 'function')
            setStatus = options.setStatus;
        if (typeof options.getEdition === 'function')
            getEdition = options.getEdition;
    }
    window.NexoWattOperatingStrategiesAppCenter = {
        setup,
        render,
        apply,
        collect,
        deriveExistingResources,
        normalizeConfig,
    };
})();
