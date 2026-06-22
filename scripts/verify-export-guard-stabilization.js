'use strict';

const fs = require('fs');
const path = require('path');

function read(p) {
  return fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
}

function assertHas(file, pattern, message) {
  const content = read(file);
  if (!content.includes(pattern)) {
    throw new Error(`${message}\nMissing pattern in ${file}: ${pattern}`);
  }
}

function assertRegex(file, regex, message) {
  const content = read(file);
  if (!regex.test(content)) {
    throw new Error(`${message}\nMissing regex in ${file}: ${regex}`);
  }
}

assertHas(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  '_getExportLimitRunMode',
  'Export Guard must have a central run-mode resolver.'
);
assertHas(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  '_isExportLimitActiveControl',
  'Export Guard write paths must use a central active-control guard.'
);
assertHas(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  'diagnostic_only_no_write',
  'Normal Export Guard path must support diagnostic-only no-write mode.'
);
assertHas(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  'diagnostic_only_group_no_write',
  'Grouped Export Guard path must support diagnostic-only no-write mode.'
);
assertHas(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  'gridConstraints.exportLimit.plannedWriteJson',
  'Export Guard must publish a diagnostic planned write JSON.'
);
assertHas(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  'gridConstraints.exportLimit.activeControl',
  'Export Guard must publish whether hardware control is active.'
);
assertHas(
  'src-ts/runtime-executables/www/ems-apps.ts',
  'Betriebsart Einspeisebegrenzung',
  'Installer must expose the Export Guard run-mode selector.'
);
assertHas(
  'src-ts/runtime-executables/www/ems-apps.ts',
  'Diagnose/Testmodus – nur berechnen, nicht schreiben',
  'Installer must explain that diagnostic mode is no-write.'
);
assertHas(
  'src-ts/runtime-executables/www/ems-apps.ts',
  'Runtime-Diagnose Export Guard',
  'Installer must show a runtime diagnosis card.'
);
assertHas(
  'src-ts/runtime-executables/www/ems-apps.ts',
  'gridConstraints.exportLimit.currentExportW',
  'Installer diagnosis must read current export.'
);
assertHas(
  'src-ts/runtime-executables/www/ems-apps.ts',
  'gridConstraints.exportLimit.plannedWriteJson',
  'Installer diagnosis must expose the planned write plan.'
);
assertRegex(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  /if \(!this\._isExportLimitActiveControl\(cfg\)\) \{[\s\S]{0,300}?diagnostic_only_no_write/,
  'Normal zero/export path must block writes before failsafe or setpoint writes.'
);
assertRegex(
  'src-ts/runtime-executables/ems/modules/grid-constraints.ts',
  /if \(!this\._isExportLimitActiveControl\(cfg\)\) \{[\s\S]{0,300}?diagnostic_only_group_no_write/,
  'Grouped zero/export path must block writes before failsafe or setpoint writes.'
);

console.log('Export Guard stabilization checks passed.');

// Paket-Härtung: keine gebauten Repository-/npm-Artefakte in das Arbeitsverzeichnis legen.
// Sonst werden ZIP/TGZ-Dateien beim nächsten Packen wieder mit eingepackt und blähen den Adapter auf.
const forbiddenArchives = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const abs = path.join(dir, ent.name);
    const rel = path.relative(path.join(__dirname, '..'), abs).replace(/\\/g, '/');
    if (ent.isDirectory()) walk(abs);
    else if (/\.(zip|tgz|tar|tar\.gz)$/i.test(ent.name)) forbiddenArchives.push(rel);
  }
}
walk(path.join(__dirname, '..'));
if (forbiddenArchives.length) {
  throw new Error('Keine ZIP/TGZ/TAR-Artefakte im Repository ablegen: ' + forbiddenArchives.join(', '));
}
