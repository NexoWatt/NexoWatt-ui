"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApiStateEnvelope = buildApiStateEnvelope;
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
function buildApiStateEnvelope(input) {
    const states = {};
    for (const [id, raw] of Object.entries(input.states)) {
        const value = (raw && Object.prototype.hasOwnProperty.call(raw, 'value'))
            ? (raw.value ?? null)
            : ((raw && Object.prototype.hasOwnProperty.call(raw, 'val')) ? (raw.val ?? null) : null);
        const entry = {
            id,
            value: value,
            source: raw === undefined ? 'missing' : 'state-cache',
        };
        if (raw && typeof raw.ts === 'number')
            entry.ts = raw.ts;
        if (raw && typeof raw.lc === 'number')
            entry.lc = raw.lc;
        if (raw && typeof raw.ack === 'boolean')
            entry.ack = raw.ack;
        if (raw && typeof raw.q === 'number')
            entry.q = raw.q;
        states[id] = entry;
    }
    const envelope = {
        ok: true,
        generatedAt: input.generatedAt ?? Date.now(),
        states,
        ...(input.features !== undefined ? { features: input.features } : {}),
        ...(input.license !== undefined ? { license: input.license } : {}),
    };
    return envelope;
}
