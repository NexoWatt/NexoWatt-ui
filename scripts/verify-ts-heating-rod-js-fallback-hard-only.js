#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8');
const fail=(m)=>{console.error('[heating-rod-js-fallback-hard-only] ERROR: '+m);process.exit(1);};
const must=(t,m,l)=>{if(!t.includes(m))fail(l+' fehlt: '+m)};
const js=read('ems/modules/heating-rod-control.js'); const ui=read('www/ems-apps.js');
for(const [m,l] of [['jsFallbackLimitedToHardBlockers','Runtime markiert harte Fallbackbegrenzung'],['jsFallbackMode','Fallbackmodus wird dokumentiert'],['legacyJsReferenceMode','Legacy-JS-Referenzmodus'],['referenceMismatches','JS-Referenzmismatches'],['mismatches = normalPathReady ? [] : referenceMismatches','Normalpfad entfernt blockierende JS-Mismatches'],['normalPathTakenOverCount','Normalpfad-Übernahmen']]) must(js,m,'runtime: '+l);
must(ui,'JS-Fallback-Modus','App-Center Fallbackmodus'); must(ui,'JS-Referenz','App-Center JS-Referenz');
if(js.includes('if (mismatches.length && normalPathReady)')) fail('Normalpfad darf keinen Mismatch-Fallbackzweig haben.');
console.log('[heating-rod-js-fallback-hard-only] OK: Heizstab-JS-Pfad ist auf harte Notfallbacks begrenzt.');
