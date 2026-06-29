#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`Missing in ${file}: ${needle}`); process.exit(1);} }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`Forbidden in ${file}: ${needle}`); process.exit(1);} }
must('package.json', '"version": "0.8.59"');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'nexowatt.mesh-microgrid-target-group-fairness.v1');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildTargetGroupFairnessPlan');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'fairShareWeight');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'minSharePercent');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'target_group_fairness_blocked');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.targetGroups.fairnessJson');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'Fairness Budget / Rest');
must('www/mesh-microgrid.html', 'Fairness-Budget');
must('src-ts/runtime-executables/main.ts', 'TargetGroupFairness');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(mapping.commandStateDp');
console.log('OK: Mesh/Microgrid Zielgruppen-Fairness ist neutral und app-center-konform abgesichert.');
