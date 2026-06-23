#!/usr/bin/env node
'use strict';

/**
 * Regressionstest 0.8.32: EOS Mesh/Microgrid Datenmodell.
 * Prüft bewusst statisch, dass das neue Modul als eigene EOS-App geführt wird,
 * read-only kommentiert ist und nicht versehentlich in Energy Wallet, Ledger oder
 * DC Station Display als versteckte Zusatzlogik eingebaut wurde.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(cond, msg) { if (!cond) { console.error(`[mesh-microgrid] ERROR: ${msg}`); process.exit(1); } }

const moduleTs = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const managerTs = read('src-ts/runtime-executables/ems/module-manager.ts');
const flagsTs = read('src-ts/runtime-executables/ems/services/feature-flags.ts');
const appsTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const pkg = JSON.parse(read('package.json'));

assert(moduleTs.includes('class MeshMicrogridModule'), 'MeshMicrogridModule fehlt in TS-Quelle');
assert(moduleTs.includes('read-only') || moduleTs.includes('Read-only'), 'Read-only-Kommentar fehlt');
assert(moduleTs.includes('schaltet keine Hardware'), 'Sicherheitskommentar zu Hardwaresteuerung fehlt');
assert(moduleTs.includes('keine zweite Regelung') || moduleTs.includes('keine zweite Wallet'), 'Kommentar gegen Doppelzählung/Doppelregelung fehlt');
assert(moduleTs.includes('meshMicrogrid.cluster.nodesJson'), 'Knoten-State fehlt');
assert(moduleTs.includes('meshMicrogrid.cluster.intentsJson'), 'Energy-Intent-State fehlt');
assert(moduleTs.includes('meshMicrogrid.microgrid.lastDecisionJson'), 'Microgrid-Preview-State fehlt');

assert(managerTs.includes("require('./modules/mesh-microgrid')"), 'ModuleManager importiert MeshMicrogridModule nicht');
assert(managerTs.includes("key: 'meshMicrogrid'"), 'ModuleManager registriert meshMicrogrid nicht');
assert(managerTs.includes("_licenseAllowsApp('meshMicrogrid')"), 'EOS-Lizenzgate für meshMicrogrid fehlt');
assert(managerTs.includes('config.meshMicrogrid') && managerTs.includes('enableMeshMicrogrid'), 'Config-Gate für meshMicrogrid fehlt');

assert(flagsTs.includes("meshMicrogrid: 'meshMicrogrid'"), 'Feature-Map meshMicrogrid fehlt');
assert(flagsTs.includes("'meshMicrogrid'"), 'EOS-only Feature meshMicrogrid fehlt');
const homeFeaturesBlock = (flagsTs.match(/const HOME_FEATURES = new Set\(\[([\s\S]*?)\]\);/) || [,''])[1];
const homeAppsBlock = (flagsTs.match(/const HOME_APP_IDS = new Set\(\[([\s\S]*?)\]\);/) || [,''])[1];
assert(!homeFeaturesBlock.includes("'meshMicrogrid'"), 'meshMicrogrid darf nicht in HOME_FEATURES stehen');
assert(!homeAppsBlock.includes("'meshMicrogrid'"), 'meshMicrogrid darf nicht in HOME_APP_IDS stehen');

assert(appsTs.includes("id: 'meshMicrogrid'"), 'App-Center-Katalog enthält meshMicrogrid nicht');
assert(appsTs.includes('function buildMeshMicrogridCard'), 'Separate Installerkarte für Mesh/Microgrid fehlt');
assert(appsTs.includes('patch.meshMicrogrid'), 'Speicherlogik für meshMicrogrid fehlt');
assert(appsTs.includes('getrennt von Energy Wallet, Local kWh Ledger und DC Station Display'), 'UI-Hinweis zur getrennten App fehlt');
assert(pkg.scripts && pkg.scripts['test:mesh-microgrid-model'], 'package.json Script test:mesh-microgrid-model fehlt');

console.log('[mesh-microgrid] OK: EOS Mesh/Microgrid Datenmodell ist separate, kommentierte, read-only App.');
