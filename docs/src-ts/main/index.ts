/**
 * Datei: src-ts/main/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die ersten echten TypeScript-Helfer aus main.js.
 *
 * Zusammenhang:
 * Diese Helfer werden in 0.7.98 noch nicht produktiv von main.js genutzt. Sie sind aber
 * echte, kompilierbare TS-Module mit CommonJS-Spiegeln unter `lib/ts-mirrors/main/`.
 */
/**
 * Code-Teil: Main-Helfer exportieren
 *
 * Zweck:
 * Bündelt die einzelnen TypeScript-Helfer für StateCache, /api/state, /api/set,
 * info.connection und Lizenz. Später kann main.ts über diesen Exportpunkt gezielt
 * Teile aus main.js übernehmen, ohne direkte Querimporte zu verteilen.
 */
export * from './state-cache';
export * from './api-state';
export * from './api-set';
export * from './info-connection';
export * from './license-key';
export { buildMainApiStateShadowSummary, buildMainApiSetShadowSummary } from './api-shadow';
export type { MainApiStateShadowSummary, MainApiSetShadowSummary } from './api-shadow';
