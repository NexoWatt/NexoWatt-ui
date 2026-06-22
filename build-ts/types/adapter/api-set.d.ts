import type { ApiSetRequest, ApiSetResult, ApiValueKind, StateWritePlan } from '../contracts/api';
import type { StateId } from '../contracts/units';
/**
 * Datei: src-ts/adapter/api-set.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für `/api/set`-Schreibvorgänge.
 *
 * Zusammenhang:
 * Kundeneinstellungen und einfache Frontend-Schreibwerte laufen heute über `main.js`.
 * Diese Datei bereitet die spätere, testbare Normalisierung vor.
 */
export interface SettingDefinition {
    key: string;
    stateId: StateId;
    valueKind: ApiValueKind;
    min?: number;
    max?: number;
}
/**
 * Code-Teil: normalizeApiValue
 *
 * Zweck:
 * Wandelt API-Eingabewerte passend zum erwarteten Typ um.
 */
export declare function normalizeApiValue(value: unknown, kind: ApiValueKind, def?: unknown, min?: number, max?: number): unknown;
/**
 * Code-Teil: buildSettingsWritePlan
 *
 * Zweck:
 * Erstellt einen typisierten Schreibplan für spätere `settings.*`-States.
 */
export declare function buildSettingsWritePlan(request: ApiSetRequest, definitions: readonly SettingDefinition[]): ApiSetResult & {
    plan?: StateWritePlan;
};
//# sourceMappingURL=api-set.d.ts.map