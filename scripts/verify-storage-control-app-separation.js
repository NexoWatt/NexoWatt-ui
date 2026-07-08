#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.78: Speicherregelung, MultiUse und Speicherfarm müssen getrennte Rollen behalten.
 * - Speicherregelung/MultiUse starten die Regelung.
 * - Speicherfarm verteilt nur vorhandene Sollwerte und startet die Regelung nicht allein.
 * - 0-W-Grenzen in der Speicherfarm bleiben bewusste Sperren pro Richtung.
 */
const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storage-control-app-separation] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}

function mustNot(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[storage-control-app-separation] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

must('src-ts/runtime-executables/ems/modules/storage-control.ts', 'const enabled = cfgEnabled || autoTarifEnabled;', 'Speicherfarm startet Speicherregelung nicht automatisch');
must('src-ts/runtime-executables/ems/modules/storage-control.ts', 'Speicherfarm ist hier KEIN eigener Auto-Start mehr', 'Kommentar zur Rollenverteilung');
must('src-ts/runtime-executables/ems/modules/storage-control.ts', "await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', false);", 'alte Auto-Speicherfarm-Diagnose wird neutralisiert');
must('src-ts/runtime-executables/ems/modules/storage-control.ts', 'const hasFarmSetpoints = farmEnabled && farmRows.some', 'Speicherfarm bleibt Ziel-/Verteilpfad');
must('src-ts/runtime-executables/ems/modules/storage-control.ts', 'const ignoreStaleMultiUsePolicy = !!(multiUsePolicyConfigured && !multiUsePolicyActive);', 'inaktive MultiUse-Policy wird erkannt');
must('src-ts/runtime-executables/ems/modules/storage-control.ts', "await this._setIfChanged('speicher.regelung.policyMode', multiUsePolicyActive ? 'multiuse' : 'speicherregelung');", 'Policy-Modus-Diagnose');

must('src-ts/runtime-executables/main.ts', 'if (!nativeObj.enableMultiUse || mu.enabled !== true)', 'MultiUse wirkt nur bei aktiver App und aktiver Policy');
must('src-ts/runtime-executables/main.ts', 'st.multiUsePolicyActive = true;', 'aktive MultiUse-Policy wird markiert');
mustNot('src-ts/runtime-executables/main.ts', 'delete st[k]', 'MultiUse darf Storage-Config nicht loeschen');

must('src-ts/runtime-executables/main.ts', 'Eine bewusst eingetragene 0-W-Vorgabe sperrt diese Richtung', '0-W-Limit als Sperre im Farm-Status');
must('src-ts/runtime-executables/main.ts', 'if (!Number.isFinite(n) || n < 0) return null;', '0-W-Limit wird nicht als leer verworfen');
must('src-ts/runtime-executables/main.ts', 'if (Number.isFinite(v) && v >= 0) return Math.round(v);', 'Farm-Verteilung akzeptiert 0 W als echtes Limit');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Leer = unbegrenzt, 0 W = diese Richtung sperren', 'UI-Hinweis fuer 0-W-Sperre');

must('ems/modules/storage-control.js', 'const enabled = cfgEnabled || autoTarifEnabled;', 'Runtime-Speicherregelung ohne Farm-Autostart');
must('main.js', 'Eine bewusst eingetragene 0-W-Vorgabe sperrt diese Richtung', 'Runtime-Farm-Limit-Kommentar');
must('www/ems-apps.js', 'Leer = unbegrenzt, 0 W = diese Richtung sperren', 'Runtime-UI-Hinweis');

console.log('[storage-control-app-separation] OK: Speicherregelung, MultiUse, Speicherfarm und 0-W-Limits sind sauber getrennt.');
