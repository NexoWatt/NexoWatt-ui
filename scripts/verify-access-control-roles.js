#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg){ console.error('[access-control] ERROR: ' + msg); process.exit(1); }
const service = read('src-ts/runtime-executables/ems/services/access-control.ts');
const main = read('src-ts/runtime-executables/main.ts');
const io = JSON.parse(read('io-package.json'));
if (!service.includes('system.group.eosAdmin')) fail('EOS Admin Gruppe fehlt im Access-Control-Service.');
if (!service.includes('system.group.installer')) fail('Bestehende Installer-Gruppe system.group.installer fehlt im Access-Control-Service.');
if (!service.includes('system.group.eosInstaller')) fail('EOS Installer Gruppe fehlt im Access-Control-Service.');
if (!service.includes('system.group.user')) fail('Bestehende Benutzergruppe system.group.user fehlt im Access-Control-Service.');
if (!service.includes('system.group.eosUser')) fail('EOS Benutzer Gruppe fehlt im Access-Control-Service.');
if (!service.includes("'license.manage'")) fail('Capability license.manage fehlt.');
if (!service.includes("'appcenter.open'")) fail('Capability appcenter.open fehlt.');
if (!service.includes("'smarthome.configureCustomer'")) fail('Capability smarthome.configureCustomer fehlt.');
if (!service.includes("'nexologic.configureCustomer'")) fail('Capability nexologic.configureCustomer fehlt.');
if (!main.includes("app.get('/api/session/me'")) fail('/api/session/me fehlt.');
if (!main.includes("requiredCapability: 'license.manage'")) fail('Lizenz-Speichern ist nicht admin-only geschützt.');
if (!main.includes("this._nwSendProtectedFile(req, res, 'appcenter.open'")) fail('App-Center Seiten-Guard fehlt.');
if (!main.includes("this._nwSendProtectedFile(req, res, 'simulation.open'")) fail('Simulation Seiten-Guard fehlt.');
if (!main.includes("this._nwRequireCapability('nexologic.configureCustomer')")) fail('NexoLogic Customer-Capability wird nicht genutzt.');
if (!io.native || !io.native.accessControl) fail('io-package native.accessControl fehlt.');
const ac = io.native.accessControl;
if (!String(ac.adminGroups || '').includes('system.group.eosAdmin')) fail('native.accessControl.adminGroups unvollständig.');
if (!String(ac.installerGroups || '').includes('system.group.installer')) fail('native.accessControl.installerGroups muss system.group.installer enthalten.');
if (!String(ac.installerGroups || '').includes('system.group.eosInstaller')) fail('native.accessControl.installerGroups unvollständig.');
if (!String(ac.customerGroups || '').includes('system.group.user')) fail('native.accessControl.customerGroups muss system.group.user enthalten.');
if (!String(ac.customerGroups || '').includes('system.group.eosUser')) fail('native.accessControl.customerGroups unvollständig.');
console.log('[access-control] OK: EOS Rollen/Gruppen/Capability-Gates geprüft.');
