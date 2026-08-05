// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-fenecon-day-no-write.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-fenecon-day-no-write.js
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
 * Original-Hash: 96d5323a9ca6cddcf2176547eade59b1355e63cd366b053b6d1e17abba5872a0
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
 * RC30 regression: PV, forecast and time of day may no longer switch a
 * FENECON hybrid into an implicit no-write/pass-through mode. The command
 * family is resolved continuously at save/start: genuine FEMS grid target or
 * direct ESS target. PV remains measurement/diagnostic data only.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolveControlMode,
  resolveHybridAuthority,
  validateSingleConfig,
} = require('../ems/services/fenecon-hybrid-control');

const root = path.join(__dirname, '..');
const storageTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
const mainTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const serviceTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts'), 'utf8');

// The old PV/day authority switch must be gone from productive runtime.
assert.doesNotMatch(storageTs, /_handleFeneconHybridPassThrough/);
assert.doesNotMatch(storageTs, /fenecon-day-no-write/);
assert.doesNotMatch(mainTs, /hybridAutoFeneconRows/);
assert.doesNotMatch(mainTs, /fenecon-day-no-write/);
assert.match(serviceTs, /PV-Erzeugung schaltet die Reglerhoheit nicht um/);
assert.match(storageTs, /FENECON Hybrid: PV-Feed-forward deaktiviert/);

const directCfg = {
  vendorProfile: 'fenecon-openems',
  coupling: 'dc',
  feneconControlMode: 'auto',
  feneconEssActualPowerId: 'fems.ess0.ActivePower',
  setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
};
const nativeCfg = {
  ...directCfg,
  feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
};

for (const runtime of [
  { pvW: 0, pvFresh: true, nowMs: 1 },
  { pvW: 4600, pvFresh: true, nowMs: 2 },
  { pvW: null, pvFresh: false, nowMs: 3 },
]) {
  const direct = resolveControlMode(directCfg, { writableStorageCount: 1, ...runtime });
  assert.equal(direct.mode, 'direct-ess', JSON.stringify({ runtime, direct }));
  const authority = resolveHybridAuthority(directCfg, { writableStorageCount: 1, ...runtime });
  assert.equal(authority.noWrite, false, JSON.stringify({ runtime, authority }));
  assert.equal(authority.authority, 'nexowatt');

  const native = resolveControlMode(nativeCfg, { writableStorageCount: 1, ...runtime });
  assert.equal(native.mode, 'fems-grid', JSON.stringify({ runtime, native }));
  const nativeAuthority = resolveHybridAuthority(nativeCfg, { writableStorageCount: 1, ...runtime });
  assert.equal(nativeAuthority.noWrite, false);
  assert.equal(nativeAuthority.authority, 'nexowatt');
}

assert.equal(validateSingleConfig(directCfg).ok, true);
assert.equal(validateSingleConfig(nativeCfg).ok, true);

// A direct battery setpoint masquerading as a FEMS grid target must fail.
const invalid = validateSingleConfig({
  ...directCfg,
  feneconControlMode: 'fems-grid',
  feneconGridSetpointId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
});
assert.equal(invalid.ok, false);
assert.match(invalid.reason, /grid-target|equals/);

console.log('[storage-fenecon-day-no-write] OK: PV/day no-write removed; continuous native/direct FENECON command authority verified.');
