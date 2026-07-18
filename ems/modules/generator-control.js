/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/generator-control.ts
 * Quell-Hash: sha256:b93bd33bd3b4bb69d24ee9f54cfc57bf3f39c33b81118b5da1ac7763a2a08866
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/generator-control.js.
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
exports.GeneratorControlModule = void 0;
const { PrimeMoverControlModule } = require('./prime-mover-control');
class GeneratorControlModule extends PrimeMoverControlModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry, {
            kind: 'generator',
            label: 'Generator',
            devicePrefix: 'g',
            moduleName: 'generatorControl',
        });
    }
}
exports.GeneratorControlModule = GeneratorControlModule;
module.exports = { GeneratorControlModule };
