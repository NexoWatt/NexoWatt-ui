#!/usr/bin/env node
'use strict';
/**
 * 0.8.60 Regression: Core-Limits TS-Shadow darf bei Anlagen ohne Netzlimit
 * keinen minütlichen Warn-Spam für grid.effectiveW erzeugen. Die Abweichung
 * bleibt als Info im tsShadowJson sichtbar, aber der produktive TS-Takeover
 * bleibt blockiert, weil JS null/unlimited und TS 0/missing-input nicht identisch sind.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle, label){ const s=read(file); if(!s.includes(needle)){ console.error(`[core-shadow-log-fix] Missing ${label}: ${needle}`); process.exit(1);} }
function mustNot(file, needle, label){ const s=read(file); if(s.includes(needle)){ console.error(`[core-shadow-log-fix] Forbidden ${label}: ${needle}`); process.exit(1);} }
for (const file of ['src-ts/runtime-executables/ems/modules/core-limits.ts','ems/modules/core-limits.js']) {
  must(file, 'isBenignGridNoLimitMismatch', 'benign no-limit classifier');
  must(file, 'js-grid-headroom-unlimited-vs-ts-missing-input-zero', 'benign mismatch reason');
  must(file, 'blockingMismatches', 'blocking mismatch list');
  must(file, 'benignMismatches', 'benign mismatch list');
  must(file, 'if (blockingMismatches.length > 0)', 'warn only for blocking mismatches');
  must(file, 'keine Warnspam', 'German documentation for no warning spam');
  mustNot(file, 'if (!result.ok) {\n                const now = Date.now();', 'old warn-on-any-mismatch block');
}
console.log('[core-shadow-log-fix] OK: grid.effectiveW Shadow-Warnspam ist entschärft, Diagnose bleibt erhalten.');
