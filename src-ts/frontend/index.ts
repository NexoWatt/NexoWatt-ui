import type { AiAdvisorSuggestion, FeatureVisibilityState } from '../contracts';

/**
 * Frontend-TypeScript-Einstieg für die schrittweise Migration.
 *
 * Zweck:
 * Diese Datei enthält noch keine produktive Browserlogik. Sie prüft nur, dass
 * zentrale VIS-Verträge im Frontend-Kontext ohne Node-spezifische Typen nutzbar sind.
 *
 * Zusammenhang:
 * Spätere Versionen lagern aus `www/app.js`, `www/history.js` und
 * `www/smarthome.js` zunächst reine Format-/Visibility-Helfer hierher aus.
 */
export interface FrontendMigrationSmokeTest {
  readonly featureVisibility?: FeatureVisibilityState;
  readonly topSuggestion?: AiAdvisorSuggestion;
}

/** Marker-Wert für Typechecks ohne Laufzeitwirkung. */
export const frontendMigrationScaffold = 'frontend-ts-scaffold-0758' as const;

export * from './display-format';
export * from './customer-feature-visibility';

export * from './dashboard-display';
export * from './history-controls';