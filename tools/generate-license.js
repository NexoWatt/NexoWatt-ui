#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const { stableStringify } = require('../lib/license');

function getArg(name, def = '') {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage(code = 1) {
  const cmd = path.basename(process.argv[1] || 'generate-license.js');
  console.log(`\nNexoWatt License Generator (Ed25519)\n\nUsage:\n  node ${cmd} --privateKey <private.pem> --deviceId <device-id> --serial <serial> [options]\n\nOptions:\n  --product <name>        default: nexowatt-vis\n  --issuedTo <text>       optional customer name\n  --expiresAt <iso>       optional expiry (ISO 8601); omit for perpetual\n  --features <json>       optional features JSON (e.g. '{"ems":true,"vis":true}')\n  --out <file>            write license JSON to file\n  --base64                additionally print base64 encoded license\n\nExamples:\n  node ${cmd} --privateKey ./keys/private.pem --deviceId "machine-id:abcd" --serial "NW-0001" --issuedTo "Kunde" --out ./license.json --base64\n`);
  process.exit(code);
}

const privateKeyPath = getArg('privateKey');
const deviceId = getArg('deviceId');
const serial = getArg('serial');
const product = getArg('product', 'nexowatt-vis');
const issuedTo = getArg('issuedTo', '');
const expiresAt = getArg('expiresAt', '');
const featuresRaw = getArg('features', '');
const outPath = getArg('out', '');
const wantB64 = hasFlag('base64');

if (!privateKeyPath || !deviceId || !serial) usage(1);

let privateKeyPem;
try {
  privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
} catch (e) {
  console.error('Cannot read private key:', e.message);
  process.exit(2);
}

let features = {};
if (featuresRaw) {
  try {
    features = JSON.parse(featuresRaw);
  } catch (e) {
    console.error('Invalid --features JSON:', e.message);
    process.exit(3);
  }
}

const payload = {
  v: 1,
  product,
  deviceId,
  serial,
  issuedTo,
  issuedAt: new Date().toISOString(),
  ...(expiresAt ? { expiresAt } : {}),
  ...(Object.keys(features).length ? { features } : {}),
};

const msg = stableStringify(payload);
const signature = crypto.sign(null, Buffer.from(msg, 'utf8'), privateKeyPem).toString('base64');
const license = { ...payload, signature };

const json = JSON.stringify(license, null, 2);
if (outPath) {
  try {
    fs.writeFileSync(outPath, json, 'utf8');
    console.log('Wrote:', outPath);
  } catch (e) {
    console.error('Cannot write --out file:', e.message);
    process.exit(4);
  }
} else {
  console.log(json);
}

if (wantB64) {
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  console.log('\n---BASE64---\n' + b64 + '\n');
}
