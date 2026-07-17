// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-actuator-c3-threshold-relay.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-actuator-c3-threshold-relay.js
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
 * Original-Hash: 7dd79a0feee0328ac1b341c2df01d253c4dea8eb397fdaf709344492678647db
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

/** Regression 0.8.112: C3.1 Threshold-/Relais-Steuerhoheit. */
const assert = require('assert');
const fs = require('fs');
const {
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  isActuatorAuthorityBlockedResult,
} = require('../ems/services/actuator-shadow-arbiter');
const { ThresholdControlModule } = require('../ems/modules/threshold-control');

/**
 * Code-Teil: makeArbiterAdapter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function makeArbiterAdapter() {
  const calls = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { diagnostics: { actuatorArbiterMode: 'enforce-safety' } },
    _stageAActuatorOwnerById: {
      'device.0.shared.relay': { owners: ['threshold.r1', 'relay.r1', 'nexoLogic'], activeOwners: ['threshold.r1', 'relay.r1', 'nexoLogic'] },
    },
    log: { warn(){}, info(){}, debug(){}, error(){} },
    async setForeignStateAsync(...args) { calls.push(args); },
    calls,
  };
  installActuatorShadowArbiter(adapter);
  return adapter;
}

(async () => {
  const adapter = makeArbiterAdapter();
  const thresholdWrite = await withActuatorShadowContext(adapter, {
    owner: 'threshold.r1', priority: 500, enforceAuthority: true, leaseMs: 20000, cycleId: 1,
  }, () => adapter.setForeignStateAsync('device.0.shared.relay', true, false));
  assert(!isActuatorAuthorityBlockedResult(thresholdWrite), 'Expliziter C3-Owner unter Safety-Floor konnte keine Steuerhoheit erwerben');

  const logicBlocked = await withActuatorShadowContext(adapter, {
    owner: 'nexoLogic', priority: 400, cycleId: 1,
  }, () => adapter.setForeignStateAsync('device.0.shared.relay', false, false));
  assert(isActuatorAuthorityBlockedResult(logicBlocked), 'Niedrigerer Komfortpfad durfte Threshold im selben Zyklus ueberschreiben');

  const manual = await withActuatorShadowContext(adapter, {
    owner: 'manual.relay.r1', priority: 750, enforceAuthority: true, leaseMs: 300000,
  }, () => adapter.setForeignStateAsync('device.0.shared.relay', false, false));
  assert(!isActuatorAuthorityBlockedResult(manual), 'Manuelle Relaisbedienung konnte Threshold nicht kontrolliert preempten');

  const states = new Map();
  let allowWrite = false;
  const thresholdAdapter = {
    namespace: 'nexowatt-ui.0',
    config: { enableThresholdControl: true, threshold: { rules: [{ idx: 1, enabled: true, inputId: 'meter.0.power', outputId: 'device.0.shared.relay', outputType: 'boolean', threshold: 100, compare: 'above', onValue: true, offValue: false }] } },
    log: { warn(){}, info(){}, debug(){}, error(){} },
    async setObjectNotExistsAsync(){},
    async getStateAsync(id){ return states.get(id) || null; },
    async setStateAsync(id, val){ states.set(id, typeof val === 'object' && val && 'val' in val ? val : { val }); },
  };
  const dp = {
    out: false,
    async upsert(){},
    getBoolean(key, fallback){ if (key === 'thr.user.r1.enabled') return true; if (key === 'thr.r1.out') return this.out; return fallback; },
    getNumber(key, fallback){ if (key === 'thr.user.r1.mode') return 1; return fallback; },
    getNumberFresh(key, _age, fallback){ if (key === 'thr.r1.in') return 200; return fallback; },
    async writeBoolean(_key, value){ if (!allowWrite) return false; this.out = !!value; return true; },
    async writeNumber(){ return false; },
  };
  const mod = new ThresholdControlModule(thresholdAdapter, dp);
  thresholdAdapter._stageAActuatorOwnerById = {
    'device.0.shared.relay': { activeOwners: ['threshold.r1'] },
  };
  assert.strictEqual(mod._ruleHasExclusiveAuthority({ outputId: 'device.0.shared.relay' }, 'threshold.r1'), true,
    'Exklusiv gemappte Threshold-Regel muss C3-Steuerhoheit erhalten');
  thresholdAdapter._stageAActuatorOwnerById['device.0.shared.relay'] = { activeOwners: ['threshold.r1', 'relay.r1'] };
  assert.strictEqual(mod._ruleHasExclusiveAuthority({ outputId: 'device.0.shared.relay' }, 'threshold.r1'), false,
    'Geteilter Aktor muss bis zur spaeteren Modulmigration im Shadow-Modus bleiben');
  assert.strictEqual(mod._ruleHasExclusiveAuthority({ outputId: 'device.0.shared.relay' }, 'manual.threshold.r1'), true,
    'Explizite manuelle Threshold-Lease muss verbindlich sein');
  await mod.init();
  await mod.tick();
  assert.strictEqual(states.get('threshold.rules.r1.active').val, false, 'Fehlgeschlagener Write wurde intern als aktiver Ausgang verbucht');
  assert.strictEqual(states.get('threshold.rules.r1.status').val, 'write_blocked_or_failed');

  allowWrite = true;
  await mod.tick();
  assert.strictEqual(states.get('threshold.rules.r1.active').val, true, 'Erfolgreicher Threshold-Write wurde nicht uebernommen');
  assert.strictEqual(states.get('threshold.rules.r1.lastWriteOk').val, true);

  const main = fs.readFileSync(require('path').join(__dirname, '../src-ts/runtime-executables/main.ts'), 'utf8');
  const stageA = fs.readFileSync(require('path').join(__dirname, '../src-ts/runtime-executables/ems/modules/stage-a-diagnostics.ts'), 'utf8');
  assert(stageA.includes("if (lower.startsWith('relay.')) return config.enableRelayControl === true;"),
    'Inaktive manuelle Relaiszeilen duerfen Threshold nicht kuenstlich die exklusive Steuerhoheit entziehen');
  assert(main.includes('blocked_by_actuator_authority'), 'Manuelle Relais-API erkennt blockierte Arbiter-Writes nicht');
  assert(main.includes('manual.relay.r${idx}'), 'Manuelle Relais-API besitzt keinen eindeutigen C3-Owner');
  assert(main.includes("kind: 'manual-relay'"), 'Manuelle Relais-API setzt keine befristete Arbiter-Lease');
  assert(main.includes("writeRelayValue(b, 'switch')") && main.includes("writeRelayValue(v, 'value')"),
    'Boolean- und Zahlen-Relaispfad laufen nicht beide durch den Arbiter');
  console.log('[actuator-c3-threshold-relay] OK: Threshold-Owner, manuelle Preemption und Write-Fehlerpfad geprueft.');
})().catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(1); });
