import type { ApiStateBuildOptions, ApiStateEntry, ApiStateResponseV2 } from '../contracts/api';
import type { AdapterStateValue, CachedState, StateCache } from '../contracts/iobroker-states';
import type { StateId } from '../contracts/units';
/**
 * Datei: src-ts/adapter/api-state.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für den `/api/state`-Antwortaufbau.
 *
 * Zusammenhang:
 * `main.js` liefert über `/api/state` Werte an Dashboard, History, SmartHome und KI.
 * Diese Datei hält die spätere Antwortform fest, ohne die Runtime jetzt zu ändern.
 */
/**
 * Code-Teil: toApiStateEntry
 *
 * Zweck:
 * Wandelt einen Cache-Eintrag in das öffentliche API-Format um.
 *
 * Wichtig:
 * Nur wirklich fehlende Werte werden ausgelassen. `0` und `false` bleiben erhalten.
 */
export declare function toApiStateEntry<T = unknown>(id: StateId, raw: AdapterStateValue<T> | CachedState<T> | undefined): ApiStateEntry<T> | undefined;
/**
 * Code-Teil: buildApiStateResponse
 *
 * Zweck:
 * Baut aus dem StateCache die typisierte Antwort für `/api/state`.
 */
export declare function buildApiStateResponse(cache: StateCache, options?: ApiStateBuildOptions): ApiStateResponseV2;
//# sourceMappingURL=api-state.d.ts.map