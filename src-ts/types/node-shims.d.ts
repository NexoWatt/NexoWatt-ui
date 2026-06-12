/**
 * Datei: src-ts/types/node-shims.d.ts
 *
 * Zweck:
 * Sehr kleine Node.js-Typ-Shims für die aktuelle Migrationsphase.
 *
 * Zusammenhang:
 * Die TypeScript-Quellen unter `src-ts/` sind momentan überwiegend Verträge, Tests und
 * Wartungsskripte. Damit `npm run typecheck` auch in Umgebungen ohne lokal installierte
 * `@types/node` verständlich laufen kann, beschreiben wir hier nur die minimal genutzten
 * Node-APIs. Sobald der TypeScript-Build vollständig über `npm ci` läuft, kann dieser
 * Shim durch die offiziellen `@types/node` ersetzt oder entfernt werden.
 *
 * Wichtig:
 * Dieser Shim gehört nicht zur Adapter-Runtime und verändert keine produktive Logik.
 */

type NexoWattNodePathLike = string;

declare module 'node:fs' {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export interface Stats {
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export function existsSync(path: NexoWattNodePathLike): boolean;
  export function statSync(path: NexoWattNodePathLike): Stats;
  export function readFileSync(path: NexoWattNodePathLike, encoding: string): string;
  export function readdirSync(path: NexoWattNodePathLike): string[];
  export function readdirSync(path: NexoWattNodePathLike, options: { withFileTypes: true }): Dirent[];
  export function readdirSync(path: NexoWattNodePathLike, options: { withFileTypes?: false }): string[];
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function relative(from: string, to: string): string;
}

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

declare const process: {
  exit(code?: number): never;
};
