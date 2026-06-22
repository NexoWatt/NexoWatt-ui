import type { Watt } from '../contracts';
/**
 * Gemeinsame TypeScript-Achse für reine Helfer.
 *
 * Zweck:
 * Hier sollen später ausschließlich nebenwirkungsfreie Hilfsfunktionen liegen,
 * die Backend und Frontend identisch verwenden können.
 *
 * Wichtig:
 * Keine ioBroker-Adapterobjekte, keine DOM-Zugriffe und keine Dateisystemzugriffe
 * in diesem gemeinsamen Bereich. Dadurch bleiben Tests und spätere TS-Migration
 * risikoarm.
 */
export interface SharedMigrationSmokeTest {
    readonly valueW?: Watt;
}
/** Marker-Wert für Typechecks ohne Laufzeitwirkung. */
export declare const sharedMigrationScaffold: "shared-ts-scaffold-0758";
//# sourceMappingURL=index.d.ts.map