/**
 * Datei: src-ts/index.ts
 *
 * Zweck:
 * TypeScript-Einstiegspunkt für die Migrationsbasis.
 *
 * Zusammenhang:
 * Der produktive Adapter startet weiterhin über `main.js`. Diese Datei bündelt nur
 * Typverträge und reine Helfer, damit `tsc` die zukünftige Struktur prüfen und bauen kann.
 */

export * from './contracts';
export * from './utils';
