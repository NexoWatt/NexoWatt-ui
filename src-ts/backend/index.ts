import type { EnergyFlowSnapshot, StorageFlowResult } from '../contracts';

/**
 * Backend-TypeScript-Einstieg für die schrittweise Migration.
 *
 * Zweck:
 * Diese Datei enthält noch keine produktive Laufzeitlogik. Sie erzwingt aber,
 * dass zentrale Energiefluss-Verträge im Backend-Kontext typisierbar bleiben.
 *
 * Zusammenhang:
 * Spätere Versionen lagern aus `main.js` und `ems/modules/*` zuerst reine
 * Helfer hierher aus, bevor kritische Regelungslogik migriert wird.
 */
export interface BackendMigrationSmokeTest {
  readonly snapshot?: EnergyFlowSnapshot;
  readonly storage?: StorageFlowResult;
}

/** Marker-Wert für Typechecks ohne Laufzeitwirkung. */
export const backendMigrationScaffold = 'backend-ts-scaffold-0758' as const;
