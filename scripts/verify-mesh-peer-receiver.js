#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const mustContain = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`${label} fehlt: ${needle}`);
};
const mustNotContain = (text, needle, label) => {
  if (text.includes(needle)) throw new Error(`${label} darf nicht enthalten sein: ${needle}`);
};

const moduleTs = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const moduleJs = read('ems/modules/mesh-microgrid.js');
const mainTs = read('src-ts/runtime-executables/main.ts');
const mainJs = read('main.js');
const uiTs = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const uiJs = read('www/mesh-microgrid.js');
const html = read('www/mesh-microgrid.html');
const appCenterTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const pkg = JSON.parse(read('package.json'));

for (const src of [moduleTs, moduleJs]) {
  mustContain(src, 'normalizeReceiverCfg', 'Receiver-Konfiguration im Mesh-Modul');
  mustContain(src, 'meshMicrogrid.receiver.enabled', 'Receiver Enabled State');
  mustContain(src, 'meshMicrogrid.receiver.processedCommandIdsJson', 'Replay-Schutz State');
  mustContain(src, '/api/mesh/command/receive', 'Receiver URL im Modul');
  mustContain(src, 'directHardwareWrite: false', 'direkte Hardware-Schreibpfade gesperrt');
  mustContain(src, 'neutralCommandOnly: true', 'nur neutrale Commands');
}

for (const src of [mainTs, mainJs]) {
  mustContain(src, '/api/mesh/handshake', 'Peer-Handshake API');
  mustContain(src, '/api/mesh/status', 'Peer-Status API');
  mustContain(src, "/api/mesh/command/receive", 'Command-Receiver API');
  mustContain(src, 'nexowatt.mesh-peer-handshake.v1', 'Handshake-Schema');
  mustContain(src, 'nexowatt.mesh-received-command-envelope.v1', 'Receiver-Envelope-Schema');
  mustContain(src, 'duplicate_command', 'Replay-/Duplikat-Schutz');
  mustContain(src, 'direct_hardware_write_forbidden', 'Hardware-Write-Sperre im Receiver');
  mustContain(src, 'setForeignStateAsync(rcfg.commandStateDp', 'Receiver schreibt nur lokalen JSON-Command-State');
  mustNotContain(src, 'setForeignStateAsync(cmd.', 'keine dynamischen Hardware-Rohschreibungen aus Remote-Commands');
}

for (const src of [uiTs, uiJs]) {
  mustContain(src, 'renderReceiver', 'Betreiberansicht rendert Receiver');
  mustContain(src, 'meshReceiverStatus', 'Receiver Status in UI');
  mustContain(src, 'meshReceiverAck', 'Receiver ACK in UI');
}

mustContain(html, 'Command Receiver', 'Command Receiver Abschnitt im HTML');
mustContain(html, 'meshReceiverStatus', 'Receiver Status Element im HTML');
mustContain(appCenterTs, 'meshMicrogridReceiverEnabled', 'Receiver aktiv im Mesh/Microgrid-Reiter');
mustContain(appCenterTs, 'meshMicrogridReceiverCommandStateDp', 'Receiver Command-State im Mesh/Microgrid-Reiter');
mustContain(appCenterTs, 'meshMicrogridReceiverAllowedPeers', 'erlaubte Peer-IDs im Mesh/Microgrid-Reiter');
mustContain(pkg.scripts['test:mesh-peer-receiver'] || '', 'verify-mesh-peer-receiver.js', 'npm-Script für Receiver-Test');

console.log('OK: Mesh/Microgrid Peer-Handshake und Command-Receiver sind herstellerneutral, tokenisiert und replay-geschützt vorbereitet.');
