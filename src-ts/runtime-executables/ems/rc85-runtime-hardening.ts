// @runtime-transpile
/* RC85: shared stability and charging-control hardening. */
import { getHeapStatistics } from 'node:v8';

export type Rc85Log = { debug?: (msg: string) => void; info?: (msg: string) => void; warn?: (msg: string) => void; error?: (msg: string) => void };

const inFlight = new Map<string, { startedAt: number; promise: Promise<unknown> }>();
const timeoutLogAt = new Map<string, number>();
const MAX_IN_FLIGHT = 256;

export interface Rc85IsolatedResult<T> {
    ok: boolean;
    value?: T;
    error?: Error;
    timedOut: boolean;
    skipped: boolean;
    durationMs: number;
}

function boundedMapSet<K, V>(map: Map<K, V>, key: K, value: V, max = 512): void {
    map.set(key, value);
    while (map.size > max) {
        const oldest = map.keys().next().value as K | undefined;
        if (oldest === undefined) break;
        map.delete(oldest);
    }
}

export async function rc85RunIsolatedResult<T>(
    label: string,
    timeoutMs: number,
    work: () => Promise<T> | T,
    log: Rc85Log = console,
): Promise<Rc85IsolatedResult<T>> {
    const now = Date.now();
    const active = inFlight.get(label);
    if (active) {
        // Do not create another unresolved device/module operation every scheduler tick.
        if (now - active.startedAt < Math.max(timeoutMs * 8, 60_000)) {
            return {
                ok: false,
                timedOut: false,
                skipped: true,
                durationMs: Math.max(0, now - active.startedAt),
                error: new Error(`RC85_IN_FLIGHT:${label}`),
            };
        }
        inFlight.delete(label);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = Promise.resolve().then(work);
    // Promise.race attaches rejection handlers to the losing promise as well.
    task.catch(() => undefined);
    boundedMapSet(inFlight, label, { startedAt: now, promise: task }, MAX_IN_FLIGHT);
    try {
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`RC85_TIMEOUT:${label}:${timeoutMs}ms`)), timeoutMs);
            (timer as any).unref?.();
        });
        const value = await Promise.race([task, timeout]);
        return {
            ok: true,
            value,
            timedOut: false,
            skipped: false,
            durationMs: Math.max(0, Date.now() - now),
        };
    } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        const last = timeoutLogAt.get(label) ?? 0;
        if (now - last >= 60_000) {
            boundedMapSet(timeoutLogAt, label, now, 512);
            log.warn?.(`[RC85 watchdog] ${label}: ${normalizedError.message}`);
        }
        return {
            ok: false,
            error: normalizedError,
            timedOut: normalizedError.message.startsWith('RC85_TIMEOUT:'),
            skipped: false,
            durationMs: Math.max(0, Date.now() - now),
        };
    } finally {
        if (timer) clearTimeout(timer);
        task.finally(() => {
            const current = inFlight.get(label);
            if (current?.promise === task) inFlight.delete(label);
        }).catch(() => undefined);
    }
}

export async function rc85RunIsolated<T>(
    label: string,
    timeoutMs: number,
    work: () => Promise<T> | T,
    log: Rc85Log = console,
): Promise<T | undefined> {
    const result = await rc85RunIsolatedResult(label, timeoutMs, work, log);
    return result.ok ? result.value : undefined;
}

export function rc85IsHardReason(reasonValue: unknown): boolean {
    const reason = String(reasonValue ?? '').toLowerCase();
    return /(?:grid[-_ ]?hard|hard[-_ ]?limit|safety[-_ ]?stop|safe[-_ ]?zero|§?14a|emergency|not[-_ ]?aus|fuse|sicherung|phase|cable|leitung|overload|nvp.*(?:invalid|stale|offline)|central.*(?:fault|error)|writer[-_ ]?error|device[-_ ]?safety|rfid[-_ ]?stop|manual[-_ ]?stop|unplug|finished|finish)/i.test(reason);
}

export function rc85IsSoftEconomicReason(reasonValue: unknown): boolean {
    const reason = String(reasonValue ?? '').toLowerCase();
    return /(?:tarif|tariff|price|strompreis|economic|neutral|teuer|günstig|guenstig|forecast|prognose|pv|grid[-_ ]?soft|soft[-_ ]?limit|budget|redistribut|allocation|auto|storage|speicher)/i.test(reason);
}

export interface Rc85DecisionInput {
    key: string;
    requested: number;
    reason?: unknown;
    unit?: 'W' | 'A';
    nowMs?: number;
    hardSafety?: boolean;
    priceUpdatePending?: boolean;
    minActive?: number;
    minRunMs?: number;
    minPauseMs?: number;
    economicDebounceMs?: number;
    rampUpPerStep?: number;
    rampDownPerStep?: number;
}
export interface Rc85DecisionResult { approved: number; held: boolean; reason: string; }
interface GuardState {
    approved: number;
    startedAt: number;
    stoppedAt: number;
    stoppedSoftEconomic: boolean;
    zeroCandidateAt: number;
    lastSeenAt: number;
}

export class Rc85EvcsDecisionGuard {
    private readonly states = new Map<string, GuardState>();
    evaluate(input: Rc85DecisionInput): Rc85DecisionResult {
        const now = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
        const key = input.key || 'unknown';
        const requested = Math.max(0, Number.isFinite(input.requested) ? Number(input.requested) : 0);
        const unit = input.unit === 'A' ? 'A' : 'W';
        const minActive = Math.max(0, input.minActive ?? (unit === 'A' ? 6 : 4_140));
        const minRunMs = Math.max(0, input.minRunMs ?? 120_000);
        const minPauseMs = Math.max(0, input.minPauseMs ?? 30_000);
        const debounceMs = Math.max(0, input.economicDebounceMs ?? 25_000);
        const rampUp = Math.max(0.1, input.rampUpPerStep ?? (unit === 'A' ? 1 : 2_300));
        const rampDown = Math.max(0.1, input.rampDownPerStep ?? (unit === 'A' ? 2 : 4_600));
        const hard = input.hardSafety === true || rc85IsHardReason(input.reason);
        const soft = input.priceUpdatePending === true || rc85IsSoftEconomicReason(input.reason);
        const previous = this.states.get(key) ?? { approved: 0, startedAt: 0, stoppedAt: 0, stoppedSoftEconomic: false, zeroCandidateAt: 0, lastSeenAt: now };
        let approved = requested;
        let held = false;
        let decisionReason = hard ? 'hard-safety' : 'normal';

        if (!hard) {
            // RC85_EVCS_SOFT_GUARD: Price/tariff refreshes must never inject a
            // single temporary zero command. The hold is deliberately bounded by
            // the economic debounce period; a permanently stale tariff can
            // therefore not keep an economically blocked charge alive forever.
            if (input.priceUpdatePending && previous.approved > 0) {
                const zeroCandidateAt = previous.zeroCandidateAt || now;
                previous.zeroCandidateAt = zeroCandidateAt;
                if (now - zeroCandidateAt < debounceMs) {
                    approved = previous.approved;
                    held = true;
                    decisionReason = 'price-update-hold';
                }
            }
            if (!held && requested <= 0 && previous.approved > 0 && soft) {
                const runtime = previous.startedAt > 0 ? now - previous.startedAt : Number.POSITIVE_INFINITY;
                const zeroCandidateAt = previous.zeroCandidateAt || now;
                previous.zeroCandidateAt = zeroCandidateAt;
                if (runtime < minRunMs || now - zeroCandidateAt < debounceMs) {
                    approved = Math.max(previous.approved, minActive);
                    held = true;
                    decisionReason = runtime < minRunMs ? 'minimum-run-hold' : 'economic-debounce-hold';
                } else if (previous.approved > minActive) {
                    approved = Math.max(minActive, previous.approved - rampDown);
                    held = true;
                    decisionReason = 'soft-ramp-down';
                } else {
                    approved = 0;
                    decisionReason = 'stable-economic-stop';
                }
            } else if (requested > 0
                && previous.approved <= 0
                && previous.stoppedSoftEconomic === true
                && previous.stoppedAt > 0
                && now - previous.stoppedAt < minPauseMs) {
                approved = 0;
                held = true;
                decisionReason = 'minimum-pause-hold';
            } else if (requested > previous.approved) {
                // A first positive command must reach the technical minimum in a
                // single step. Otherwise an AC wallbox would repeatedly receive
                // sub-minimum targets which are quantized back to 0 W, causing the
                // exact start/stop oscillation this guard is intended to prevent.
                const nextUp = previous.approved <= 0
                    ? Math.max(minActive, rampUp)
                    : previous.approved + rampUp;
                approved = Math.min(requested, nextUp);
                held = approved !== requested;
                decisionReason = held ? 'soft-ramp-up' : 'normal';
            } else if (requested < previous.approved && requested > 0) {
                approved = Math.max(requested, previous.approved - rampDown);
                held = approved !== requested;
                decisionReason = held ? 'soft-ramp-down' : 'normal';
            }
        }

        if (hard) approved = requested;
        if (previous.approved <= 0 && approved > 0) previous.startedAt = now;
        if (previous.approved > 0 && approved <= 0) {
            previous.stoppedAt = now;
            // RC86_SOFT_PAUSE_ONLY_AFTER_ECONOMIC_STOP: technical start-probe
            // timeouts, unplugging and hard safety already have their own cooldown
            // and must not receive a second hidden 30-second pause.
            previous.stoppedSoftEconomic = !hard && soft;
        }
        if (approved > 0 || requested > 0) previous.zeroCandidateAt = requested <= 0 ? previous.zeroCandidateAt : 0;
        previous.approved = approved;
        previous.lastSeenAt = now;
        boundedMapSet(this.states, key, previous, 512);
        this.prune(now);
        return { approved, held, reason: decisionReason };
    }
    prune(now = Date.now()): void {
        for (const [key, state] of this.states) if (now - state.lastSeenAt > 6 * 60 * 60 * 1000) this.states.delete(key);
        while (this.states.size > 512) {
            const oldest = this.states.keys().next().value as string | undefined;
            if (oldest === undefined) break;
            this.states.delete(oldest);
        }
    }
    clear(): void { this.states.clear(); }
}

export interface Rc85GridEnvelopeInput {
    hardLimitW: number;
    signedNvpW: number;
    currentControlledLoadW?: number;
    offlineReserveW?: number;
    pendingIncreaseW?: number;
}
export interface Rc85GridEnvelope {
    hardLimitW: number; softLimitW: number; reserveW: number;
    hardHeadroomW: number; hardHeadroomRawW: number; softHeadroomW: number;
    progressiveIncrementW: number; maxControlledLoadW: number;
    softRampFactor: number; predictedNvpAtMaximumW: number;
    offlineReserveW: number; pendingIncreaseW: number;
}
export function rc85GridEnvelope(input: Rc85GridEnvelopeInput): Rc85GridEnvelope {
    const hardLimitW = Math.max(0, Number(input.hardLimitW) || 0);
    const softLimitW = hardLimitW * 0.9;
    const reserveW = hardLimitW * 0.1;
    const signedNvpW = Number(input.signedNvpW) || 0;
    const current = Math.max(0, Number(input.currentControlledLoadW) || 0);
    const offlineReserveW = Math.max(0, Number(input.offlineReserveW) || 0);
    const pendingIncreaseW = Math.max(0, Number(input.pendingIncreaseW) || 0);
    const hardHeadroomRawW = hardLimitW - signedNvpW - offlineReserveW - pendingIncreaseW;
    const hardHeadroomW = Math.max(0, hardHeadroomRawW);
    const softHeadroomW = Math.max(0, softLimitW - signedNvpW - offlineReserveW - pendingIncreaseW);
    const span = Math.max(1, hardLimitW - softLimitW);
    const softRampFactor = hardLimitW <= 0
        ? 0
        : (signedNvpW <= softLimitW
            ? 1
            : Math.max(0, Math.min(1, (hardLimitW - signedNvpW) / span)));
    // RC85_SOFT_PROGRESSIVE: 90 % is the beginning of a progressive ramp
    // restriction, never an absolute 90-% load ceiling. Below the soft limit the
    // full headroom up to the hard NVP import limit is available. Inside the
    // soft band only positive increases are tapered. Above the hard limit the
    // signed negative correction remains intact and actively reduces running
    // controlled load.
    const progressiveIncrementW = hardHeadroomRawW <= 0
        ? hardHeadroomRawW
        : hardHeadroomRawW * softRampFactor;
    const maxControlledLoadW = Math.max(0, current + progressiveIncrementW);
    return {
        hardLimitW,
        softLimitW,
        reserveW,
        hardHeadroomW,
        hardHeadroomRawW,
        softHeadroomW,
        progressiveIncrementW,
        maxControlledLoadW,
        softRampFactor,
        predictedNvpAtMaximumW: signedNvpW + (maxControlledLoadW - current),
        offlineReserveW,
        pendingIncreaseW,
    };
}


export interface Rc86GridBindingInput {
    requestedW: number;
    gridCapW: number | null | undefined;
    finalTargetW: number;
    activePoints?: number;
    phaseCapW?: number | null;
    para14aCapW?: number | null;
}

export interface Rc86GridBindingResult {
    binding: boolean;
    requestedBeforeGridW: number;
    allowedW: number;
    reductionW: number;
    quantizationToleranceW: number;
    finalPlanTouchesGridEdge: boolean;
}

/**
 * RC86: Ein konfiguriertes Netz-Gate ist nur dann "bindend", wenn es eine
 * reale EVCS-Anforderung tatsächlich reduziert. Ein endliches Hard-Headroom
 * bei 0 W Nachfrage ist reine Überwachung und darf weder GRID-IMPORT-LIMIT noch
 * einen globalen Safety-Status auslösen.
 */
export function rc86GridBinding(input: Rc86GridBindingInput): Rc86GridBindingResult {
    let requestedBeforeGridW = Math.max(0, Number(input.requestedW) || 0);
    const hasPhaseCap = input.phaseCapW !== null && input.phaseCapW !== undefined;
    const phaseCapW = hasPhaseCap ? Number(input.phaseCapW) : Number.NaN;
    if (Number.isFinite(phaseCapW) && phaseCapW >= 0) {
        requestedBeforeGridW = Math.min(requestedBeforeGridW, phaseCapW);
    }
    const hasPara14aCap = input.para14aCapW !== null && input.para14aCapW !== undefined;
    const para14aCapW = hasPara14aCap ? Number(input.para14aCapW) : Number.NaN;
    if (Number.isFinite(para14aCapW) && para14aCapW >= 0) {
        requestedBeforeGridW = Math.min(requestedBeforeGridW, para14aCapW);
    }

    const rawGridCapW = Number(input.gridCapW);
    if (!Number.isFinite(rawGridCapW)) {
        return {
            binding: false,
            requestedBeforeGridW,
            allowedW: requestedBeforeGridW,
            reductionW: 0,
            quantizationToleranceW: 0,
            finalPlanTouchesGridEdge: false,
        };
    }

    const gridCapW = Math.max(0, rawGridCapW);
    const allowedW = Math.min(requestedBeforeGridW, gridCapW);
    const candidateReductionW = Math.max(0, requestedBeforeGridW - allowedW);
    const activePoints = Math.max(0, Math.round(Number(input.activePoints) || 0));
    const quantizationToleranceW = Math.max(100, Math.min(4_000, activePoints * 800));
    const finalTargetW = Math.max(0, Number(input.finalTargetW) || 0);
    const finalPlanTouchesGridEdge = allowedW <= 0
        ? finalTargetW <= quantizationToleranceW
        : finalTargetW + quantizationToleranceW >= allowedW;
    const binding = candidateReductionW > 50 && finalPlanTouchesGridEdge;

    return {
        binding,
        requestedBeforeGridW,
        allowedW,
        reductionW: binding ? candidateReductionW : 0,
        quantizationToleranceW,
        finalPlanTouchesGridEdge,
    };
}

export function rc85OfflineReserveW(points: readonly any[]): number {
    let total = 0;
    for (const point of points ?? []) {
        const status = String(point?.status ?? point?.availability ?? '').toLowerCase();
        if (!/(?:offline|unavailable|stale|fault|error)/.test(status)) continue;
        const actual = Math.max(0, Number(point?.actualW ?? point?.lastActualW ?? point?.powerW) || 0);
        const vehicle = Boolean(point?.vehicleConnected ?? point?.connected ?? point?.plugged);
        const fallback = vehicle ? Math.max(0, Number(point?.minPowerW ?? point?.minimumW) || 4_140) : 0;
        total += actual > 0 ? actual : fallback;
    }
    return total;
}

let heapTimer: ReturnType<typeof setTimeout> | undefined;
let criticalHeapSamples = 0;
export function startRc85HeapMonitor(log: Rc85Log = console): () => void {
    if (heapTimer) return () => undefined;
    heapTimer = setInterval(() => {
        const used = process.memoryUsage().heapUsed;
        const limit = getHeapStatistics().heap_size_limit;
        const ratio = limit > 0 ? used / limit : 0;
        if (ratio >= 0.82) log.warn?.(`[RC85 heap] ${(used/1048576).toFixed(0)} MiB / ${(limit/1048576).toFixed(0)} MiB (${(ratio*100).toFixed(1)}%)`);
        criticalHeapSamples = ratio >= 0.94 ? criticalHeapSamples + 1 : 0;
        // Last-resort controlled exit only after five sustained critical samples.
        if (criticalHeapSamples >= 5) {
            log.error?.('[RC85 heap] sustained critical heap pressure; requesting controlled adapter restart before V8 SIGABRT');
            setTimeout(() => process.exit(75), 250).unref?.();
            criticalHeapSamples = 0;
        }
    }, 60_000);
    (heapTimer as any).unref?.();
    return () => { if (heapTimer) clearInterval(heapTimer); heapTimer = undefined; criticalHeapSamples = 0; };
}
