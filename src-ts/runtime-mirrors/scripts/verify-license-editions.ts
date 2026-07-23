// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-license-editions.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-license-editions.js
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
 * Original-Hash: 535d307c53a493c14cb7ed5a103fdb382dca4ee13921423da793c0aa863335a2
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

/**
 * Prüft das Lizenzmodell ab 0.8.137:
 * - Pro = sichtbares Vollprodukt (interner Legacy-Key `eos`)
 * - Home = kleiner freigegebener Funktionsumfang
 * - alte NW1/NW1T-Schlüssel bleiben Pro/EOS-kompatibel
 * - TypeScript-Migrationsdiagnosen sind aus der sichtbaren App-Center-UI entfernt
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const errors = [];
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const need = (ok, msg) => { if (!ok) errors.push(msg); };

const main = read('main.js');
const moduleManager = read('ems/module-manager.js');
const app = read('www/ems-apps.js');
const html = read('www/ems-apps.html');
const ioPackage = JSON.parse(read('io-package.json'));
const pkg = JSON.parse(read('package.json'));

need(ioPackage.common && ioPackage.common.version === pkg.version, `io-package.json: Version muss ${pkg.version} sein.`);
need(main.includes('_nwExpectedEditionLicenseKey'), 'main.js: Edition-Vollschlüssel-Prüfung fehlt.');
need(main.includes("'NW1H'") && main.includes("'NW1E'"), 'main.js: NW1H/NW1E Präfixe fehlen.');
need(main.includes('_nwExpectedEditionTrialKey') && main.includes('NW1TH') && main.includes('NW1TE'), 'main.js: Edition-Testlizenzformate fehlen.');
need(main.includes('Legacy full key: keep all existing customers on the large EOS edition.'), 'main.js: Legacy-Vollschlüssel müssen als EOS behandelt werden.');
need(main.includes('legacy NW1 = EOS') || main.includes('Legacy NW1 = EOS'), 'main.js: Legacy-Hinweis für NW1=EOS fehlt.');
need(main.includes('_nwLicenseFeaturesForEdition'), 'main.js: zentraler Feature-Katalog fehlt.');
need(main.includes('peakShaving') && main.includes('storageFarm') && main.includes('multiUse'), 'main.js: EOS-only Features fehlen.');
need(main.includes('chargingManagement') && main.includes('heatingRodControl') && main.includes('thresholdControl'), 'main.js: HEMS Feature-Whitelist unvollständig.');
need(main.includes('energyWallet') && main.includes('energyWalletPro'), 'main.js: Energie-Wertkonto muss Home/EOS-Feature sein.');
need(main.includes('_nwLicenseMaxWallboxes') && main.includes('if (edition === \'hems\') return 3'), 'main.js: HEMS-Wallboxlimit 3 fehlt.');
need(main.includes('license.edition') && main.includes('license.featuresJson') && main.includes('license.maxWallboxes'), 'main.js: Lizenz-States für Edition/Features/Wallboxlimit fehlen.');
need(main.includes('license.storagePowerProfile') && main.includes('license.maxStoragePowerW'), 'main.js: Home/Pro-Speicherleistungs-States fehlen.');
need(main.includes('_nwApplyLicenseLimitsToInstallerPatch'), 'main.js: Backend-Gate für Installer-Patches fehlt.');
need(main.includes('cfgOut.license = this._nwBuildLicenseFeatureInfo()'), 'main.js: Installer-API liefert Lizenzinfo nicht aus.');
need(main.includes('sendNoStore(res)') && main.includes('Refresh the runtime license cache here'), 'main.js: Installer-API muss Lizenzcache refreshen und no-store liefern.');
need(main.includes('_nwRefreshLicenseFromConfiguredKey'), 'main.js: Lizenzstatus-Refresh aus gespeicherter Adapter-Konfiguration fehlt.');
need(main.includes("await this._nwRefreshLicenseFromConfiguredKey(false)") && main.includes("app.use(async (req, res, next)"), 'main.js: Lizenz-API/App-Center/VIS-Gate müssen die Freischaltung ohne manuellen Neustart synchronisieren.');
need(moduleManager.includes('_licenseAllowsApp'), 'ems/module-manager.js: Modulmanager-Lizenzgate fehlt.');
need(moduleManager.includes("const hemsApps = new Set(['charging', 'storage', 'thermal', 'heatingrod', 'threshold', 'relay', 'aiAdvisor', 'tariff', 'para14a', 'energyWallet'])"), 'ems/module-manager.js: HEMS-App-Liste fehlt oder falsch.');
need(moduleManager.includes("key: 'peakShaving'") && moduleManager.includes("this._licenseAllowsApp('peak')"), 'ems/module-manager.js: Peak-Shaving muss EOS-gated sein.');
need(moduleManager.includes("key: 'chargingManagement'") && moduleManager.includes("this._licenseAllowsApp('charging')"), 'ems/module-manager.js: Lademanagement-Gate fehlt.');
need(app.includes('HEMS_APP_IDS'), 'www/ems-apps.js: HEMS-App-Whitelist fehlt.');
need(app.includes('Lizenz: ${_licenseLabel()}'), 'www/ems-apps.js: Lizenzkarte im App-Center fehlt.');
need(app.includes("if (ed === 'eos') return 'Pro'"), 'www/ems-apps.js: Vollprodukt muss sichtbar als Pro bezeichnet werden.');
need(app.includes("Home · max. 50 kW") && app.includes("Pro · frei skalierbar"), 'www/ems-apps.js: Home/Pro-Speicherleistungsprofil fehlt.');
need(html.includes('storageRatedPowerKW') && html.includes('storageLicensePowerProfile'), 'www/ems-apps.html: Speicher-Nennleistung und Lizenzprofil fehlen.');
need(app.includes('fetchLicenseInfoFallback') && app.includes('/api/license/info?t='), 'www/ems-apps.js: No-Cache-Lizenzfallback aus /api/license/info fehlt.');
need(main.includes('const featureInfo = this._nwBuildLicenseFeatureInfo()') && main.includes('eosFullAccess: !!featureInfo.eosFullAccess'), 'main.js: /api/license/info muss konsistente Feature-/EOS-Daten aus einem FeatureInfo-Snapshot liefern.');
need(app.includes('_inferLicenseFromSuccessfulInstallerGate') && app.includes('Lizenz über Backend-Gate erkannt'), 'www/ems-apps.js: App-Center-Gate-Fallback für gültige Runtime-Lizenz fehlt.');
need(main.includes('res.json({ ok: true, license: cfgOut.license, config: cfgOut'), 'main.js: Installer-API muss Lizenzdaten top-level ausgeben.');
need(app.includes('licenseBlocked') && app.includes('requiredLicense'), 'www/ems-apps.js: UI-Patch muss nicht lizenzierte Apps blockieren.');
need(app.includes('function _maxEvcsCount') && app.includes('els.evcsCount.max = String(_maxEvcsCount())'), 'www/ems-apps.js: HEMS-Wallboxlimit in UI fehlt.');
need(app.includes('fetchLicenseInfoFallback') && app.includes('/api/license/info?t=') && app.includes('normalizeLicenseInfo(currentConfig.license)'), 'www/ems-apps.js: App-Center muss Live-Lizenzinfo als Fallback nachladen.');
const applyConfigIdx = app.indexOf('function applyConfigToUI(cfg)');
const applyConfigBlock = applyConfigIdx >= 0 ? app.slice(applyConfigIdx, applyConfigIdx + 1200) : '';
const licenseAssignIdx = applyConfigBlock.indexOf('currentLicenseInfo = normalizeLicenseInfo(currentConfig.license)');
const rebuildIdx = applyConfigBlock.indexOf('try { buildAppsUI(); } catch (_eBuildApps) {}');
const setAppsIdx = applyConfigBlock.indexOf('setAppsFromConfig(currentConfig);');
need(applyConfigIdx >= 0 && licenseAssignIdx >= 0 && rebuildIdx > licenseAssignIdx && setAppsIdx > rebuildIdx, 'www/ems-apps.js: App-Liste muss nach Lizenzladung neu gebaut werden, sonst bleibt EOS bei "Keine Apps verfügbar" hängen.');
need(!html.includes('TypeScript Shadow'), 'www/ems-apps.html: sichtbare TypeScript-Shadow-Diagnose muss entfernt bleiben.');
need(!html.includes('energyFlowTsMode'), 'www/ems-apps.html: sichtbarer TS-Schaltmodus muss entfernt bleiben.');
need(!html.includes('shadowDiagnostics'), 'www/ems-apps.html: sichtbarer Shadow-Container muss entfernt bleiben.');

if (errors.length) {
  console.error('[license-editions] Fehler:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('[license-editions] OK: Home/Pro-Lizenzmodell (intern HEMS/EOS) und Speicherleistungsprofile sind verdrahtet.');
