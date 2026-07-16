// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-control-alias-mapping.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-evcs-control-alias-mapping.js
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
 * Original-Hash: 678733744284057c1f6e34a1ccda6e32c26a29b39f63cbba194c649815f83e97
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
 * Regression 0.8.106:
 * - nexowatt-devices EVCS-Profile mit `targetCurrentA`/`targetPowerW` werden
 *   auch ohne erneutes manuelles AppCenter-Mapping als steuerbar erkannt.
 * - Explizite Installer-Zuordnungen bleiben unverändert.
 * - Fehlende oder nicht existierende Kandidaten werden nicht blind übernommen.
 * - Nach der Auflösung zählt die Ladeinfrastruktur alle Ports und der finale
 *   Write-Plan enthält einen echten Sollwert-Schreibauftrag.
 */
const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {
  deriveNexowattDeviceBaseId,
  buildEvcsControlCandidates,
  resolveEvcsControlMapping,
} = require(path.join(root, 'ems/evcs-control-mapping'));
const {
  computeChargingInfrastructureCapacity,
} = require(path.join(root, 'ems/charging-budget-helpers'));
const { EmsEngine } = require(path.join(root, 'ems/engine'));
const {
  buildChargingSetpointWritePlan,
} = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan'));
const {
  applyEvcsSetpoint,
} = require(path.join(root, 'ems/consumers/evcs'));

(async () => {
  const base = 'nexowatt-devices.0.devices.marius_lp2';
  assert.strictEqual(
    deriveNexowattDeviceBaseId(`${base}.aliases.r.power`),
    base,
    'Gerätebasis wird aus dem Mess-DP nicht korrekt abgeleitet.',
  );

  const candidates = buildEvcsControlCandidates(base);
  assert(candidates.current.includes(`${base}.aliases.ctrl.targetCurrentA`));
  assert(candidates.power.includes(`${base}.aliases.ctrl.targetPowerW`));

  const existing = new Set([
    // Beide Aliasgenerationen sind absichtlich vorhanden. Die aktuelle,
    // semantisch eindeutige Target-Variante muss bevorzugt werden.
    `${base}.aliases.ctrl.targetCurrentA`,
    `${base}.aliases.ctrl.currentLimitA`,
    `${base}.aliases.ctrl.targetPowerW`,
    `${base}.aliases.ctrl.powerLimitW`,
    `${base}.aliases.ctrl.run`,
  ]);
  const resolved = await resolveEvcsControlMapping({
    name: 'Marius LP2',
    enabled: true,
    powerId: `${base}.aliases.r.power`,
    statusId: `${base}.aliases.r.statusCode`,
    onlineId: `${base}.aliases.comm.connected`,
    phases: 3,
    voltageV: 230,
    maxCurrentA: 16,
  }, async (id) => existing.has(id));

  assert.strictEqual(resolved.changed, true);
  assert.strictEqual(resolved.row.setCurrentAId, `${base}.aliases.ctrl.targetCurrentA`);
  assert.strictEqual(resolved.row.setPowerWId, `${base}.aliases.ctrl.targetPowerW`);
  assert.strictEqual(resolved.row.enableWriteId, `${base}.aliases.ctrl.run`);

  const baseOnly = await resolveEvcsControlMapping({
    baseId: base,
    name: 'Marius LP2',
    enabled: true,
  }, async (id) => existing.has(id));
  assert.strictEqual(baseOnly.row.setCurrentAId, `${base}.aliases.ctrl.targetCurrentA`);
  assert.strictEqual(baseOnly.row.setPowerWId, `${base}.aliases.ctrl.targetPowerW`);
  assert.strictEqual(baseOnly.baseId, base);


  const otherBase = 'nexowatt-devices.0.devices.other_lp';
  const noCrossDeviceMix = await resolveEvcsControlMapping({
    powerId: `${base}.aliases.r.power`,
    statusId: `${otherBase}.aliases.r.statusCode`,
  }, async (id) => id === `${base}.aliases.ctrl.targetCurrentA`
    || id === `${otherBase}.aliases.ctrl.targetPowerW`);
  assert.strictEqual(noCrossDeviceMix.row.setCurrentAId, `${base}.aliases.ctrl.targetCurrentA`);
  assert.strictEqual(String(noCrossDeviceMix.row.setPowerWId || ''), '', 'Steuerpfade verschiedener Ladepunkte dürfen nicht vermischt werden.');
  assert.strictEqual(noCrossDeviceMix.baseId, base);

  const explicit = await resolveEvcsControlMapping({
    powerId: `${base}.aliases.r.power`,
    setCurrentAId: 'installer.manual.current',
    setPowerWId: 'installer.manual.power',
  }, async () => true);
  assert.strictEqual(explicit.row.setCurrentAId, 'installer.manual.current');
  assert.strictEqual(explicit.row.setPowerWId, 'installer.manual.power');

  const missing = await resolveEvcsControlMapping({
    powerId: 'other-adapter.0.power',
  }, async () => false);
  assert.strictEqual(missing.changed, false);
  assert.strictEqual(String(missing.row.setCurrentAId || ''), '');
  assert.strictEqual(String(missing.row.setPowerWId || ''), '');

  const wallboxes = [1, 2, 3, 4].map((index) => ({
    enabled: true,
    controlBasis: 'currentA',
    setCurrentAId: `${base.replace('marius_lp2', `lp${index}`)}.aliases.ctrl.targetCurrentA`,
    phases: 3,
    voltageV: 230,
    maxA: 16,
  }));
  const infrastructure = computeChargingInfrastructureCapacity({
    wallboxes,
    fallbackPerConnectorW: 11000,
  });
  assert.strictEqual(infrastructure.wallboxCount, 4);
  assert.strictEqual(infrastructure.rawCapacityW, 44160);
  assert.strictEqual(infrastructure.effectiveCapacityW, 44160);


  const engineRows = [];
  for (let index = 1; index <= 4; index++) {
    const deviceBase = `nexowatt-devices.0.devices.lp${index}`;
    const rowResolved = await resolveEvcsControlMapping({
      index,
      name: `LP${index}`,
      enabled: true,
      powerId: `${deviceBase}.aliases.r.power`,
      statusId: `${deviceBase}.aliases.r.statusCode`,
      onlineId: `${deviceBase}.aliases.comm.connected`,
      phases: 3,
      voltageV: 230,
      minCurrentA: 6,
      maxCurrentA: 16,
      maxPowerW: 11040,
      controlPreference: 'auto',
    }, async (id) => [
      `${deviceBase}.aliases.ctrl.targetCurrentA`,
      `${deviceBase}.aliases.ctrl.targetPowerW`,
      `${deviceBase}.aliases.ctrl.run`,
    ].includes(id));
    engineRows.push(rowResolved.row);
  }
  const engine = new EmsEngine({
    namespace: 'nexowatt-ui.0',
    evcsList: engineRows,
    config: {
      settingsConfig: { evcsMaxPowerKw: 11, stationGroups: [] },
      datapoints: {},
      chargingManagement: {},
    },
  });
  const built = engine._buildChargingConfig();
  assert.strictEqual(built.anyControl, true, 'EMS-Engine erkennt die automatisch aufgelösten Ladepunkte nicht als steuerbar.');
  assert.strictEqual(built.chargingCfg.infrastructureWallboxCount, 4);
  assert.strictEqual(built.chargingCfg.infrastructureCapacityW, 44160);
  assert.strictEqual(built.chargingCfg.wallboxes[1].controlBasis, 'auto');
  assert.strictEqual(built.chargingCfg.wallboxes[1].setCurrentAId, 'nexowatt-devices.0.devices.lp2.aliases.ctrl.targetCurrentA');

  const setAKey = 'cm.wb.lp2.setA';
  const writePlan = buildChargingSetpointWritePlan({
    wallboxes: [{
      safe: 'lp2',
      name: 'Marius LP2',
      enabled: true,
      online: true,
      controlBasis: 'currentA',
      setAKey,
      setWKey: '',
    }],
    allocationPlan: {
      wallboxes: [{
        safe: 'lp2',
        targetPowerW: 11040,
        targetCurrentA: 16,
        reason: 'LIMITED_BY_USER_LIMIT',
      }],
    },
  });
  const writeEntry = writePlan.entries.find((entry) => entry.safe === 'lp2' && entry.type === 'setpoint');
  assert(writeEntry, 'Write-Plan enthält LP2 nicht.');
  assert.strictEqual(writeEntry.writeRequired, true);
  assert.strictEqual(writeEntry.setpointKey, setAKey);
  assert.strictEqual(writeEntry.targetCurrentA, 16);

  const writes = [];
  const dp = {
    getEntry(key) {
      return key === setAKey ? { objectId: `${base}.aliases.ctrl.targetCurrentA` } : null;
    },
    async writeNumber(key, value) {
      writes.push({ key, value });
      return true;
    },
  };
  const apply = await applyEvcsSetpoint(
    { adapter: { log: { debug() {} } }, dp },
    { type: 'evcs', key: 'lp2', controlBasis: 'currentA', setAKey },
    { targetW: 11040, targetA: 16, basis: 'currentA' },
  );
  assert.strictEqual(apply.applied, true);
  assert.deepStrictEqual(writes, [{ key: setAKey, value: 16 }]);

  const mainRuntime = require('fs').readFileSync(path.join(root, 'main.js'), 'utf8');
  const appCenterRuntime = require('fs').readFileSync(path.join(root, 'www/ems-apps.js'), 'utf8');
  assert(mainRuntime.includes("require('./ems/evcs-control-mapping')"), 'Adapterstart bindet die feldkompatible Mapping-Auflösung nicht ein.');
  assert(mainRuntime.includes("aliases['ctrl.targetCurrentA']"), 'Backend-Geräteerkennung kennt targetCurrentA nicht.');
  assert(appCenterRuntime.includes("_nwGetAlias(dev, 'ctrl.targetCurrentA')"), 'AppCenter-Schnellerkennung kennt targetCurrentA nicht.');
  assert(appCenterRuntime.includes("_nwGetAlias(dev, 'ctrl.targetPowerW')"), 'AppCenter-Schnellerkennung kennt targetPowerW nicht.');

  console.log('[evcs-control-alias-mapping] OK: Target-Aliase werden sicher aufgelöst und als echte EVCS-Schreibpfade verwendet.');
})().catch((error) => {
  console.error('[evcs-control-alias-mapping] FAILED:', error && error.stack ? error.stack : error);
  process.exit(1);
});
