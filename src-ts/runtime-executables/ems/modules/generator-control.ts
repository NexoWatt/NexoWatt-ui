// @runtime-transpile
'use strict';

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { PrimeMoverControlModule } = require('./prime-mover-control');

export class GeneratorControlModule extends PrimeMoverControlModule {
  constructor(adapter: Record<string, any>, dpRegistry: Record<string, any> | null) {
    super(adapter, dpRegistry, {
      kind: 'generator',
      label: 'Generator',
      devicePrefix: 'g',
      moduleName: 'generatorControl',
    });
  }
}

module.exports = { GeneratorControlModule };
