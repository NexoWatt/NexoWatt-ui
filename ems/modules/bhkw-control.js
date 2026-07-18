/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/bhkw-control.ts
 * Quell-Hash: sha256:5a53c4fbc91805898a3f113814dbc120977fdd4643258b37788fad277bda2d41
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/bhkw-control.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.BhkwControlModule = void 0;
const { PrimeMoverControlModule } = require('./prime-mover-control');
class BhkwControlModule extends PrimeMoverControlModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry, {
            kind: 'bhkw',
            label: 'BHKW',
            devicePrefix: 'b',
            moduleName: 'bhkwControl',
        });
    }
}
exports.BhkwControlModule = BhkwControlModule;
module.exports = { BhkwControlModule };
