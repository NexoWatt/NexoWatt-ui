import type { ApiSetRequest, ApiSetResponse, StateWritePlan } from '../../contracts/api';
/**
 * Datei: src-ts/backend/api-state/api-set-helpers.ts
 *
 * Zweck:
 * Reine TypeScript-Helfer für spätere `/api/set`-Logik aus `main.js`.
 *
 * Zusammenhang:
 * Das Frontend schreibt Einstellungen, Mappings, Lizenz- und Steuerwerte über API-Endpunkte.
 * Aktuell liegt die produktive Logik in `main.js`. Diese Datei bereitet eine kleine,
 * typisierte und testbare Schreibplanung vor.
 */
/**
 * Code-Teil: normalizeApiSetKey
 *
 * Zweck:
 * Entfernt gefährliche Randpunkte und Whitespace aus einem API-Key.
 *
 * Wichtig:
 * Aus `scope` und `key` wird später eine State-ID gebaut. Leere oder kaputte Keys dürfen nicht
 * zu falschen Adapter-States führen.
 */
export declare function normalizeApiSetKey(key: unknown): string;
/**
 * Code-Teil: buildScopedStateId
 *
 * Zweck:
 * Baut eine lokale Adapter-State-ID aus Scope und Key.
 *
 * Beispiel:
 * `settings` + `aiAdvisorEnabled` wird zu `settings.aiAdvisorEnabled`.
 */
export declare function buildScopedStateId(scope: string, key: string): string;
/**
 * Code-Teil: planApiStateWrite
 *
 * Zweck:
 * Erstellt aus einem API-Set-Request eine geplante State-Schreiboperation.
 *
 * Wichtig:
 * Diese Funktion schreibt noch nichts. Sie hält nur die spätere Regel fest, dass API-Requests
 * als Steuer-/Konfigurationsschreibungen standardmäßig `ack=false` verwenden.
 */
export declare function planApiStateWrite(request: ApiSetRequest, ack?: boolean): StateWritePlan;
/**
 * Code-Teil: createApiSetResponse
 *
 * Zweck:
 * Baut eine kleine typisierte Antwort für erfolgreiche Set-Operationen.
 */
export declare function createApiSetResponse(request: ApiSetRequest, plan: StateWritePlan): ApiSetResponse;
//# sourceMappingURL=api-set-helpers.d.ts.map