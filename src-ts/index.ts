/**
 * Datei: src-ts/index.ts
 *
 * Zweck:
 * TypeScript-Einstiegspunkt für die Migrationsbasis.
 *
 * Zusammenhang:
 * Der produktive Adapter startet weiterhin über `main.js`. Diese Datei bündelt
 * zentrale Verträge direkt und stellt reine Helfer bewusst im Namensraum `utils`
 * bereit. Dadurch vermeiden wir Namenskonflikte zwischen Verträgen und Helfern,
 * während die Migration Schritt für Schritt wächst.
 */

export * from './contracts';
export * as utils from './utils';

export * as resolvers from './resolvers';

export * as ems from './ems';
