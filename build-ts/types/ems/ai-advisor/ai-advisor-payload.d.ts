/**
 * Datei: src-ts/ems/ai-advisor/ai-advisor-payload.ts
 *
 * Zweck:
 * Erster produktiv nutzbarer TypeScript-Helfer für den KI-Energieberater. Diese Datei
 * normalisiert Vorschläge und baut den Publish-Payload, den `ems/modules/ai-advisor.js`
 * später in `aiAdvisor.*` States schreibt.
 *
 * Zusammenhang:
 * Der KI-Berater bleibt beratend und darf keine Verbraucher schalten. Diese Helfer
 * betreffen nur Ausgabeform, JSON-Stabilität, Top-Vorschlag und Anzeige-Fallbacks.
 *
 * Wichtig:
 * 0.7.115 schaltet nicht die komplette KI-Logik auf TypeScript um. Die Vorschläge werden
 * weiterhin in der bestehenden JS-Runtime erzeugt. TypeScript übernimmt nur die sichere
 * Normalisierung der Ausgabe.
 */
/** Erlaubte Priorität/Schwere eines KI-Vorschlags. */
export type AiAdvisorPayloadSeverity = 'success' | 'info' | 'warning' | 'critical' | 'neutral';
/** Minimaler Rohvorschlag aus der bestehenden JS-Runtime. */
export interface AiAdvisorRawSuggestion {
    readonly id?: unknown;
    readonly category?: unknown;
    readonly severity?: unknown;
    readonly priority?: unknown;
    readonly icon?: unknown;
    readonly title?: unknown;
    readonly text?: unknown;
    readonly action?: unknown;
    readonly window?: unknown;
    readonly impact?: unknown;
    readonly confidence?: unknown;
    readonly [key: string]: unknown;
}
/** Normalisierter Vorschlag, der gefahrlos als JSON-State und UI-Kachel geschrieben wird. */
export interface AiAdvisorNormalizedSuggestion {
    readonly id: string;
    readonly category: string;
    readonly severity: AiAdvisorPayloadSeverity;
    readonly priority: number;
    readonly icon: string;
    readonly title: string;
    readonly text: string;
    readonly action: string;
    readonly window: string;
    readonly impact: string;
    readonly confidence: number | null;
}
/** Eingaben für die TS-Publish-Normalisierung. */
export interface AiAdvisorPublishInput {
    readonly suggestions?: readonly AiAdvisorRawSuggestion[] | null;
    readonly score?: unknown;
    readonly showInLive?: unknown;
    readonly dailyPlanText?: unknown;
    readonly learning?: Record<string, unknown> | null;
    readonly maxSuggestions?: unknown;
}
/** Ergebnis der TS-Normalisierung. */
export interface AiAdvisorPublishPayload {
    readonly source: 'ts-ai-advisor-payload-v1';
    readonly ok: boolean;
    readonly suggestions: readonly AiAdvisorNormalizedSuggestion[];
    readonly top: AiAdvisorNormalizedSuggestion | null;
    readonly severity: AiAdvisorPayloadSeverity;
    readonly headline: string;
    readonly summary: string;
    readonly suggestionsJson: string;
    readonly count: number;
    readonly score: number;
    readonly hashPayload: Record<string, unknown>;
}
/**
 * Code-Teil: asText
 *
 * Zweck:
 * Wandelt unbekannte Werte in sichere UI-/JSON-Texte um.
 *
 * Zusammenhang:
 * Die alte JS-Runtime liefert Vorschläge aus vielen Regeln. Einzelne Felder können
 * fehlen. Das darf die Veröffentlichung von `aiAdvisor.*` nicht abbrechen.
 */
export declare function asText(value: unknown, fallback?: string): string;
/**
 * Code-Teil: asNumber
 *
 * Zweck:
 * Liest Zahlen aus alten JS-Vorschlägen, ohne NaN/Infinity in JSON-States zu schreiben.
 */
export declare function asNumber(value: unknown, fallback?: number): number;
/**
 * Code-Teil: normalizeSeverity
 *
 * Zweck:
 * Normalisiert Schweregrade auf die Werte, die Dashboard und History sicher anzeigen können.
 */
export declare function normalizeSeverity(value: unknown, fallback?: AiAdvisorPayloadSeverity): AiAdvisorPayloadSeverity;
/**
 * Code-Teil: normalizeSuggestion
 *
 * Zweck:
 * Macht aus einem alten JS-Vorschlag ein stabiles, typisiertes Ausgabeobjekt.
 *
 * Sicherheitsregel:
 * Fehlende Titel/Textfelder werden nicht als Runtimefehler behandelt. Der KI-Berater
 * soll beraten, aber niemals das EMS blockieren.
 */
export declare function normalizeSuggestion(item: AiAdvisorRawSuggestion | null | undefined, index?: number): AiAdvisorNormalizedSuggestion;
/**
 * Code-Teil: safeJson
 *
 * Zweck:
 * Serialisiert KI-Ausgabe sicher. Fehlerhafte Sonderwerte dürfen die State-Schreibung
 * nicht abbrechen.
 */
export declare function safeJson(value: unknown, fallback?: string): string;
/**
 * Code-Teil: buildAiAdvisorPublishPayload
 *
 * Zweck:
 * Baut den produktiv verwendeten, typisierten Publish-Payload für den KI-Berater.
 *
 * Zusammenhang:
 * `ems/modules/ai-advisor.js` erzeugt weiterhin die fachlichen Vorschläge. Diese Funktion
 * übernimmt ab 0.7.115 die sichere Normalisierung für JSON, Top-Vorschlag, Count,
 * Severity, Headline und Hash-Eingang.
 */
export declare function buildAiAdvisorPublishPayload(input: AiAdvisorPublishInput): AiAdvisorPublishPayload;
//# sourceMappingURL=ai-advisor-payload.d.ts.map