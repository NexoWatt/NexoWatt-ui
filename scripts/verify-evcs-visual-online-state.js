#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p, 'utf8'); }
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[evcs-visual-online-state] missing ${label}: ${needle}`); process.exit(1); } }
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[evcs-visual-online-state] forbidden ${label}: ${needle}`); process.exit(1); } }
const evcs = 'src-ts/runtime-executables/www/evcs.ts';
const pkgVersion = JSON.parse(read('package.json')).version;
if (!/^\d+\.\d+\.\d+$/.test(String(pkgVersion || ''))) { console.error(`[$evcs-visual-online-state] invalid package version: ${pkgVersion}`); process.exit(1); }
must(evcs, 'function _evcsBoolOrNull(value)', 'online bool normalizer');
must(evcs, 'function _tileStateClass({ powerW, reason, active, regEnabled, online, status })', 'tile state signature includes online/status');
must(evcs, "onlineState === false || r === 'OFFLINE' || offlineByStatus", 'offline class derived from online/reason/status');
must(evcs, "active=false", 'comment documents active=false idle semantics');
must(evcs, 'const localOnline = d(`evcs.${i}.online`);', 'render reads local online mirror');
must(evcs, 'const emsOnline = hasEms ? d(`${cm}.online`) : null;', 'render reads EMS online state');
must(evcs, 'const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;', 'local onlineId mirror wins over EMS fallback');
must(evcs, '_shortStatusText(status, emsReason, online)', 'status text gets online state');
must(evcs, '_tileStateClass({ powerW, reason: emsReason, active, regEnabled, online, status })', 'tile state gets online/status');
mustNot(evcs, 'active === false || regEnabled === false', 'online idle must not be disabled by active=false');
console.log('[evcs-visual-online-state] OK');
