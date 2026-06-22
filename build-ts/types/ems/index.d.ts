/**
 * Datei: src-ts/ems/index.ts
 *
 * Zweck:
 * Zentrale TypeScript-Sammelstelle für EMS-nahe Migrationsbereiche.
 *
 * Strukturregel:
 * Fachliche EMS-Module liegen künftig nicht lose unter `utils`, sondern in passenden
 * Domänenordnern. Dadurch bleibt später erkennbar, ob ein TS-Codebereich zu Core-Limits,
 * Heizstab, EVCS, Speicherfarm, Peak-Shaving oder KI gehört.
 */
export * as coreLimits from './core-limits';
export * as heatingRod from './heating-rod';
/** Export: Charging-Management / EVCS TypeScript-Helfer. */
export * as chargingManagement from './charging-management';
//# sourceMappingURL=index.d.ts.map