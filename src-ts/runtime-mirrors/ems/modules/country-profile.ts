// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/country-profile.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/modules/country-profile.js
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
 * Original-Hash: e1831a0e6b0d49618e6b36f3c22dbe21554408214e5ceffd4edddc54e6d4a4df
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
 * Quelle: src-ts/runtime-executables/ems/modules/country-profile.ts
 * Quell-Hash: sha256:b3b6944036492cea0c1063970586a72acdc08535c597590d52fce05dc3a45e86
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/country-profile.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/modules/country-profile.js
 *
 * Zweck:
 * Veröffentlicht Länderprofil und ioBroker-Systemsprache als interne States.
 * Dadurch kann Home unverändert bleiben, während EOS/NL-Funktionen später sauber
 * auf einem gemeinsamen Markt-/Sprachvertrag aufbauen.
 */
'use strict';

const { BaseModule } = require('./base');
const profileSvc = require('../services/country-profile-service');

/**
 * Code-Teil: CountryProfileModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class CountryProfileModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._lastWriteTs = 0;
    this._lastHash = '';
  }

  async init() {
    await this._ensureStates();
    await this._publish('init', true);
  }

  async tick() {
    const now = Date.now();
    if ((now - this._lastWriteTs) < 30000) return;
    await this._publish('tick', false);
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;

    await a.setObjectNotExistsAsync('system', { type: 'channel', common: { name: 'NexoWatt Systemprofil' }, native: {} });
    await a.setObjectNotExistsAsync('countryProfile', { type: 'channel', common: { name: 'Länderprofil / Markt' }, native: {} });

    const stateDefs = [
      ['system.language', 'ioBroker Systemsprache', 'string', 'text', ''],
      ['system.languageSource', 'Quelle der Systemsprache', 'string', 'text', ''],
      ['countryProfile.country', 'Aktives Länderprofil', 'string', 'text', 'DE'],
      ['countryProfile.label', 'Länderprofil Bezeichnung', 'string', 'text', 'Deutschland'],
      ['countryProfile.currency', 'Währung', 'string', 'text', 'EUR'],
      ['countryProfile.gridImportLabel', 'Begriff Netzbezug', 'string', 'text', 'Netzbezug'],
      ['countryProfile.gridExportLabel', 'Begriff Einspeisung/Rücklieferung', 'string', 'text', 'Einspeisung'],
      ['countryProfile.selfConsumptionLabel', 'Begriff Eigenverbrauch', 'string', 'text', 'Eigenverbrauch'],
      ['countryProfile.supportsP1Dsmr', 'P1/DSMR unterstützt', 'boolean', 'indicator', false],
      ['countryProfile.supportsSalderingExit', 'Saldering-Exit unterstützt', 'boolean', 'indicator', false],
      ['countryProfile.supportsEnergyHub', 'Energy-Hub unterstützt', 'boolean', 'indicator', false],
      ['countryProfile.supportsParagraph14a', '§14a unterstützt', 'boolean', 'indicator', true],
      ['countryProfile.profileJson', 'Länderprofil JSON', 'string', 'json', '{}'],
    ];

    for (const [id, name, type, role, def] of stateDefs) {
      await a.setObjectNotExistsAsync(id, { type: 'state', common: { name, type, role, read: true, write: false, def }, native: {} });
    }
  }

  async _publish(reason, force) {
    const a = this.adapter;
    if (!a) return;
    const systemLanguage = await profileSvc.readIoBrokerSystemLanguage(a);
    const profile = profileSvc.getConfiguredCountryProfile(a.config || {});
    const locale = profileSvc.buildLocaleInfo(a.config || {}, systemLanguage, systemLanguage ? 'system.config.common.language' : 'country-profile-default');
    const payload = Object.assign({}, profile, { effectiveLanguage: locale.language, languageSource: locale.source, reason: String(reason || '') });
    const hash = JSON.stringify(payload);
    if (!force && hash === this._lastHash) {
      this._lastWriteTs = Date.now();
      return;
    }
    this._lastHash = hash;
    this._lastWriteTs = Date.now();

/**
 * Code-Teil: set
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const set = async (id, val) => {
      try { await a.setStateAsync(id, { val, ack: true }); } catch (_e) {}
    };
    await set('system.language', locale.language);
    await set('system.languageSource', locale.source);
    await set('countryProfile.country', profile.country);
    await set('countryProfile.label', profile.label);
    await set('countryProfile.currency', profile.currency);
    await set('countryProfile.gridImportLabel', profile.gridImportLabel);
    await set('countryProfile.gridExportLabel', profile.gridExportLabel);
    await set('countryProfile.selfConsumptionLabel', profile.selfConsumptionLabel);
    await set('countryProfile.supportsP1Dsmr', !!profile.supportsP1Dsmr);
    await set('countryProfile.supportsSalderingExit', !!profile.supportsSalderingExit);
    await set('countryProfile.supportsEnergyHub', !!profile.supportsEnergyHub);
    await set('countryProfile.supportsParagraph14a', !!profile.supportsParagraph14a);
    await set('countryProfile.profileJson', JSON.stringify(payload));

    try { a._nwSystemLanguage = locale.language; } catch (_e) {}
    try { a._nwSystemLanguageSource = locale.source; } catch (_e) {}
    try { a._nwCountryProfileRuntime = payload; } catch (_e) {}
  }
}

module.exports = { CountryProfileModule };
