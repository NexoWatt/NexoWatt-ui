#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[charging-grid-cap-safe] Missing in ${file}: ${needle}`); process.exit(1); } }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[charging-grid-cap-safe] Forbidden in ${file}: ${needle}`); process.exit(1); } }
must('package.json', '"version": "0.8.65"');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadRawW = gridW -');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'derived.core.building.loadRestW');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridBaseLoadW = Number.isFinite(Number(derivedBaseLoadW))');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridLocalSupportW = Math.max(0, gridBaseLoadW - Math.max(0, gridBaseLoadRawW))');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)');
must('src-ts/runtime-executables/ems/modules/charging-management.ts', 'chargingManagement.control.gridLocalSupportW');
must('src-ts/runtime-executables/main.ts', 'gridLocalSupportW: await getOwn');
must('src-ts/runtime-executables/www/ems-apps.ts', 'EVCS Cap (Netz sicher)');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Lokale Deckung');
must('ems/modules/charging-management.js', 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW)');
must('www/ems-apps.js', 'EVCS Cap (Netz sicher)');
// Make sure the old optimistic 1e12 grid cap expression is not the active formula.
mustNot('src-ts/runtime-executables/ems/modules/charging-management.ts', 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, 1e12)');
console.log('OK: EVCS grid cap uses building load when available, is clamped to effective grid import limit and local support is diagnostic-only.');
