// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-device-auto-mapping.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-device-auto-mapping.js
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
 * Original-Hash: e2670d5c9669f3bad9327f3ef4b7cbba1feff53931f6cb4a2e5b49617a331d83
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
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const ui = read('src-ts/runtime-executables/www/ems-apps.ts');
const html = read('www/ems-apps.html');
const contract = JSON.parse(read('scripts/fixtures/nexowatt-device-alias-contract-v1.snapshot.json'));

assert.equal(contract.contractId, 'nexowatt-device-alias-contract');
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.namespace, 'v1');
assert.equal(contract.standardPath, 'aliases.v1');
assert.equal(contract.categoryToDeviceClass.CHARGER, 'solarCharger');
assert.equal(contract.categoryToDeviceClass.DC_CHARGER, 'solarCharger');
assert.equal(contract.categoryToDeviceClass.EVCS, 'evCharger');
for (const aliases of Object.values(contract.requiredCanonicalAliases)) {
  for (const alias of aliases) assert.match(alias, /^(r|ctrl|comm|alarm)\./);
}

assert.ok(main.includes("'/api/nwdevices/discover'"), 'discovery route missing');
assert.ok(main.includes('aliases.meta.manifest'), 'manifest state missing');
assert.ok(main.includes('aliases.v1.'), 'canonical aliases.v1 missing');
assert.ok(main.includes("contractId: 'nexowatt-device-alias-contract'"));
assert.ok(main.includes("schemaVersion: 1"));
assert.ok(main.includes("if (c === 'CHARGER' || c === 'DC_CHARGER' || c === 'SOLAR_CHARGER') return 'solarCharger'"));
assert.ok(main.includes('meta && meta.write === true'), 'write metadata gate missing');
assert.ok(main.includes('scanOnly: true'));
assert.ok(main.includes('hardwareWrites: 0'));
assert.ok(main.includes("typeof this.getForeignStatesAsync === 'function'"), 'foreign-state discovery guard missing');

assert.ok(html.includes('id="nwDevicesQuickSetup"'));
assert.ok(html.includes('Schnell‑Inbetriebnahme (Geräte + DPs)'));
assert.ok(ui.includes("return dc ? dc === 'evCharger'"));
assert.ok(ui.includes("_nwDeviceClass(d) === 'solarCharger'"));
assert.ok(ui.includes('Es werden nur leere Felder ergänzt. Apps/Geräte werden nicht aktiviert und es werden keine Hardwarebefehle geschrieben.'));
assert.ok(ui.includes('Zuordnungsvorschlag übernehmen?'));
assert.ok(ui.includes("if (onlyEmpty)"));
assert.ok(ui.includes("meta && meta.write === true"));
assert.ok(ui.includes("['targetPowerObjectId','targetChargePowerObjectId','targetDischargePowerObjectId','e3dcSetPowerModeObjectId','e3dcSetPowerValueObjectId']"));
assert.ok(ui.includes('if (charge && discharge)'));
assert.ok(ui.includes('else if (signed)'));
assert.ok(ui.includes('Mehrere Speicher: keine automatische Einzel-Speicherwahl'));
assert.ok(ui.includes('Mehrere Zähler: NVP-Zähler wird nur bei eindeutiger Bewertung gesetzt.'));

const evcsStart = ui.indexOf('function _applyNwDeviceToEvcsRow');
const evcsEnd = ui.indexOf('function _nwScoreGridMeter', evcsStart);
const evcsFn = ui.slice(evcsStart, evcsEnd > evcsStart ? evcsEnd : evcsStart + 12000);
assert.ok(evcsFn.includes("setIf('setCurrentAId'"));
assert.ok(evcsFn.includes("setIf('enableWriteId'"));
assert.equal(/\bout\.enabled\s*=\s*true\b/.test(evcsFn), false, 'auto mapping must not activate EVCS');
assert.equal(/setForeignState|setStateAsync|\/api\/state\/set/.test(evcsFn), false, 'auto mapping must not issue hardware/state writes');

console.log('[device-auto-mapping] OK: aliases.v1 inventory, class safety, writeability gate, preview, manual precedence and exclusive storage command family verified.');
