// @runtime-transpile
'use strict';

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { PrimeMoverControlModule } = require('./prime-mover-control');

export class BhkwControlModule extends PrimeMoverControlModule {
  constructor(adapter: Record<string, any>, dpRegistry: Record<string, any> | null) {
    super(adapter, dpRegistry, {
      kind: 'bhkw',
      label: 'BHKW',
      devicePrefix: 'b',
      moduleName: 'bhkwControl',
    });
  }
}

module.exports = { BhkwControlModule };
