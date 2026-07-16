#!/usr/bin/env node
'use strict';

/** Feldkompatible Kunden-Schreibpolicy und Browser-Härtung statisch absichern. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
const admin = JSON.parse(fs.readFileSync(path.join(root, 'admin/jsonConfig.json'), 'utf8'));
assert.strictEqual(pkg.native.accessControl.customerWritePolicy, 'all', 'legacy field compatibility default must remain all');
assert.strictEqual(pkg.native.accessControl.allowedOrigins, '', 'allowedOrigins default must be empty');
assert.ok(admin.items && admin.items.sicherheit, 'security admin tab missing');

for (const rel of ['src-ts/runtime-executables/main.ts', 'main.js']) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(text.includes("['all', 'lan', 'session']"), `${rel}: policy modes missing`);
  assert.ok(text.includes("customerWritePolicy === 'lan' && nwIsTrustedLanIp"), `${rel}: LAN policy missing`);
  assert.ok(text.includes("customerWritePolicy === 'session'"), `${rel}: session policy missing`);
  assert.ok(text.includes('nwRequestRemoteIp(req)'), `${rel}: socket IP evaluation missing`);
  assert.ok(text.includes("req.socket && req.socket.remoteAddress"), `${rel}: real socket address missing`);
  assert.ok(!text.includes("req.headers['x-forwarded-for']"), `${rel}: untrusted forwarded header is used`);
  assert.ok(text.includes('origin_forbidden'), `${rel}: browser origin protection missing`);
  assert.ok(text.includes('login_rate_limited'), `${rel}: login rate limit missing`);
  assert.ok(text.includes("'X-Content-Type-Options'"), `${rel}: security headers missing`);
}
console.log('[customer-write-policy] OK: legacy/all, LAN/VPN and session policies are wired without trusting forwarded headers.');
