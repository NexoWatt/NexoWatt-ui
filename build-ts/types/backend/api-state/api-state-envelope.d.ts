import type { AdapterStateValue, FeatureVisibilityState, LicenseState, TimestampMs } from '../../contracts';
import type { ApiStateEnvelope } from '../../contracts/api-state';
/**
 * Datei: src-ts/backend/api-state/api-state-envelope.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der `/api/state`-Antwort aus `main.js` vor.
 *
 * Zusammenhang:
 * Das Frontend liest `/api/state` für LIVE-Dashboard, History, SmartHome, Speicherfarm und KI.
 * Wenn diese Antwort später typisiert gebaut wird, müssen States, Feature-Sichtbarkeit und
 * Lizenzinformationen zusammenbleiben.
 */
/** Eingaben zum Aufbau einer typisierten `/api/state`-Antwort. */
export interface BuildApiStateEnvelopeInput {
    readonly states: Record<string, AdapterStateValue | undefined>;
    readonly generatedAt?: TimestampMs;
    readonly features?: FeatureVisibilityState;
    readonly license?: LicenseState;
}
/**
 * Code-Teil: buildApiStateEnvelope
 *
 * Zweck:
 * Baut eine minimale, typisierte API-Antwort für `/api/state`.
 *
 * Wichtig:
 * Diese Funktion verändert keine State-Werte. Sie verpackt nur vorhandene Werte in eine klare
 * Antwortstruktur. Dadurch ist sie risikoarm und später gut nach `main.ts` übernehmbar.
 */
export declare function buildApiStateEnvelope(input: BuildApiStateEnvelopeInput): ApiStateEnvelope;
//# sourceMappingURL=api-state-envelope.d.ts.map