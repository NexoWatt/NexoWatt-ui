/**
 * Datei: src-ts/adapter/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die TypeScript-Vorbereitung der Adapter-API-Schicht.
 *
 * Zusammenhang:
 * Alles unter `src-ts/adapter/*` gehört fachlich zu `main.js`: StateCache, HTTP-API,
 * Schreibpläne und `info.connection`. Produktive Runtime bleibt in 0.7.63 weiterhin JS.
 */
export * as stateCache from './state-cache';
export * as apiState from './api-state';
export * as apiSet from './api-set';
export * as connectionState from './connection-state';
export * as settingsWrites from './settings-writes';
