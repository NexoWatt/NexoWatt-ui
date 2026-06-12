import type { StateId, TimestampMs } from './units';

/**
 * Datei: src-ts/contracts/iobroker-states.ts
 *
 * Zweck:
 * Minimaler Vertrag für ioBroker-State-Werte, wie sie im Adapter-Cache und über `/api/state`
 * verarbeitet werden.
 *
 * Warum kein vollständiger ioBroker-Typ?
 * Der Adapter nutzt aktuell JavaScript und verschiedene State-Quellen. Dieser Vertrag ist
 * bewusst klein gehalten und wird später beim echten TypeScript-Umbau mit ioBroker-Typen
 * aus `@iobroker/adapter-core` verfeinert.
 */

export interface AdapterStateValue<T = unknown> {
  val?: T;
  value?: T;
  ack?: boolean;
  ts?: TimestampMs;
  lc?: TimestampMs;
  q?: number;
}

export interface CachedState<T = unknown> {
  id: StateId;
  value: T | null;
  ts?: TimestampMs;
  lc?: TimestampMs;
  ack?: boolean;
  quality?: number;
}

export type StateCache = Record<string, CachedState | AdapterStateValue | undefined>;

export interface ApiStateResponse {
  states: Record<string, AdapterStateValue | undefined>;
  generatedAt?: TimestampMs;
}
