/**
 * Datei: src-ts/backend/main-runtime/main-runtime-helpers.ts
 *
 * Zweck:
 * Erste echte TypeScript-Auslagerung kleiner, risikoarmer main.js-Helfer.
 *
 * Zusammenhang:
 * main.js bleibt aktuell weiterhin der produktive Adapter-Einstiegspunkt. Diese Datei
 * enthält bewusst nur kleine, isolierte Regeln, die später komplett aus main.js
 * herausgezogen werden können: Lizenz-Platzhalter, info.connection-Schreibplan und
 * einfache API-/Settings-Wertnormalisierung.
 *
 * Wichtig:
 * Diese Helfer dürfen keine EMS-Regelungslogik enthalten. Sie sollen den Einstieg in
 * die produktive TypeScript-Nutzung absichern, ohne Energiefluss, Heizstab, History
 * oder KI fachlich zu verändern.
 */
export interface InfoConnectionStateUpdate {
    readonly id: 'info.connection';
    readonly value: boolean;
    readonly ack: true;
    readonly ts: number;
    readonly reason: string;
}
export type NormalizedApiPrimitive = string | number | boolean | null;
export interface NormalizedApiSetValue {
    readonly value: NormalizedApiPrimitive;
    readonly valueType: 'string' | 'number' | 'boolean' | 'null';
    readonly wasStringBoolean: boolean;
}
/**
 * Code-Teil: normalizeLicenseKeyInput
 *
 * Zweck:
 * Wandelt beliebige Eingaben aus Admin/UI/API in einen getrimmten String um.
 *
 * Zusammenhang:
 * main.js nutzt diese Normalisierung beim Lesen und Speichern des Lizenzschlüssels.
 * Dadurch wird später vermieden, dass mehrere Stellen unterschiedliche Whitespace- oder
 * Null-Regeln verwenden.
 */
export declare function normalizeLicenseKeyInput(input: unknown): string;
/**
 * Code-Teil: normalizeLicenseKeyForComparison
 *
 * Zweck:
 * Erzeugt die technische Vergleichsform eines Lizenzschlüssels.
 *
 * Zusammenhang:
 * Die alte JavaScript-Logik in main.js nutzt dieselbe Regel: nur A-Z/0-9 bleiben
 * erhalten und alles wird großgeschrieben. So bleiben bestehende Lizenzprüfungen
 * kompatibel.
 */
export declare function normalizeLicenseKeyForComparison(input: unknown): string;
/**
 * Code-Teil: isMaskedLicenseKeyInput
 *
 * Zweck:
 * Erkennt maskierte Lizenz-Platzhalter aus ioBroker/Admin.
 *
 * Zusammenhang:
 * Bei protected/encrypted Feldern kann der Admin Platzhalter wie "********" oder
 * "protected" liefern. Diese Werte dürfen niemals als echter Lizenzschlüssel
 * gespeichert werden und dürfen auch keine vorhandene Lizenz überschreiben.
 *
 * Wichtig:
 * Echte NexoWatt-Schlüssel mit NW1/NW1T-Präfix werden ausdrücklich nicht als Maske
 * behandelt, selbst wenn sie Sonderzeichen/Leerzeichen in der Eingabe hatten.
 */
export declare function isMaskedLicenseKeyInput(input: unknown): boolean;
/**
 * Code-Teil: normalizeLicenseKeyForStorage
 *
 * Zweck:
 * Bereitet eine Lizenz-Eingabe zum Speichern vor.
 *
 * Zusammenhang:
 * main.js kann diesen Helfer verwenden, bevor native.licenseKey oder config.licenseKey
 * überschrieben wird. Maskierte Werte liefern bewusst einen leeren String zurück.
 */
export declare function normalizeLicenseKeyForStorage(input: unknown): string;
/**
 * Code-Teil: buildInfoConnectionStateUpdate
 *
 * Zweck:
 * Erstellt einen typisierten Schreibplan für info.connection.
 *
 * Zusammenhang:
 * main.js setzt info.connection beim Webserverstart, Heartbeat, Serverfehler und
 * Unload. Dieser Helfer kapselt den reinen Datenvertrag, damit später die verstreute
 * Connection-Logik in ein eigenes TS-Modul ausgelagert werden kann.
 */
export declare function buildInfoConnectionStateUpdate(online: unknown, reason?: unknown, ts?: number): InfoConnectionStateUpdate;
/**
 * Code-Teil: normalizeApiSetPrimitive
 *
 * Zweck:
 * Normalisiert einfache Werte aus /api/set, ohne 0 oder false zu verlieren.
 *
 * Zusammenhang:
 * main.js verarbeitet viele Kundeneinstellungen über /api/set. Dieser Helfer ist der
 * erste kleine Baustein, damit false/0/leere Werte später nicht durch Truthy-/Falsy-
 * Logik verfälscht werden.
 */
export declare function normalizeApiSetPrimitive(input: unknown): NormalizedApiSetValue;
export type ApiStateShadowValueType = 'null' | 'undefined' | 'boolean' | 'number' | 'string' | 'object' | 'array';
export interface ApiStateShadowEntry {
    readonly key: string;
    readonly hasValue: boolean;
    readonly valueType: ApiStateShadowValueType;
    readonly isZero: boolean;
    readonly isFalse: boolean;
    readonly ts: number | null;
    readonly lc: number | null;
    readonly ack: boolean | null;
    readonly rawShape: 'state-object' | 'plain-value' | 'missing';
}
export interface ApiStateShadowSnapshot {
    readonly ok: boolean;
    readonly generatedAt: number;
    readonly keyCount: number;
    readonly entriesChecked: number;
    readonly zeroValueKeys: readonly string[];
    readonly falseValueKeys: readonly string[];
    readonly missingValueKeys: readonly string[];
    readonly invalidEntryKeys: readonly string[];
    readonly sampleKeys: readonly string[];
    readonly warnings: readonly string[];
}
export interface ApiSetShadowInput {
    readonly scope: unknown;
    readonly key: unknown;
    readonly value: unknown;
}
export interface ApiSetShadowPlan {
    readonly ok: boolean;
    readonly generatedAt: number;
    readonly scope: string;
    readonly key: string;
    readonly normalized: NormalizedApiSetValue;
    readonly targetStateId: string;
    readonly blocked: boolean;
    readonly reason: string;
    readonly writeKind: 'settings-local' | 'installer-config' | 'rfid' | 'ems' | 'generic';
}
/**
 * Code-Teil: apiStateValueType
 *
 * Zweck:
 * Ermittelt den stabilen Typ eines Wertes aus dem `/api/state`-Cache.
 *
 * Zusammenhang:
 * `/api/state` ist die zentrale Datenquelle für LIVE, History, Settings und viele
 * Unterseiten. Beim späteren TypeScript-Umbau darf `0`, `false` und `null` nicht
 * durch einfache Truthy-/Falsy-Logik verfälscht werden. Dieser Helfer bildet die
 * Basis für den Shadow-Vergleich, ohne die produktive API-Antwort zu verändern.
 */
export declare function apiStateValueType(value: unknown): ApiStateShadowValueType;
/**
 * Code-Teil: normalizeApiStateShadowEntry
 *
 * Zweck:
 * Normalisiert einen einzelnen Eintrag aus dem `stateCache` für die TS-Shadow-Diagnose.
 *
 * Zusammenhang:
 * Die produktive `/api/state`-Route gibt aktuell weiterhin das originale `stateCache`
 * Objekt zurück. Diese Funktion baut nur eine typisierte Kontrollsicht daneben. So
 * können wir später sicher prüfen, ob der TS-Helfer dieselbe Semantik einhält.
 *
 * Wichtig:
 * - `0` ist ein gültiger Wert.
 * - `false` ist ein gültiger Wert.
 * - Ein State-Objekt kann `value` oder legacy-artig `val` enthalten.
 */
export declare function normalizeApiStateShadowEntry(key: string, raw: unknown): ApiStateShadowEntry;
/**
 * Code-Teil: buildApiStateShadowSnapshot
 *
 * Zweck:
 * Baut eine kompakte Diagnose-Zusammenfassung für `/api/state`, ohne die API-Antwort
 * zu verändern.
 *
 * Zusammenhang:
 * 0.7.99 bereitet die spätere Migration von `/api/state` vor. Die JavaScript-Route
 * bleibt produktiv; dieser Snapshot zeigt nur, ob der TS-Helfer die kritischen Werte
 * korrekt erkennt. Besonders wichtig sind `0 W` und `false`, weil diese Werte früher
 * mehrfach versehentlich als fehlend interpretiert wurden.
 */
export declare function buildApiStateShadowSnapshot(stateCache: unknown, sampleLimit?: number): ApiStateShadowSnapshot;
/**
 * Code-Teil: buildApiSetShadowPlan
 *
 * Zweck:
 * Erstellt einen typisierten Shadow-Schreibplan für `/api/set`.
 *
 * Zusammenhang:
 * Die produktive `/api/set`-Route bleibt in JavaScript. Dieser Helfer läuft nur
 * parallel und dokumentiert, wie TypeScript denselben Schreibwunsch später bewerten
 * würde. Dadurch können wir sehen, ob `false`, `0`, Zahlen und Strings gleich
 * behandelt werden, bevor wir die Route produktiv umstellen.
 */
export declare function buildApiSetShadowPlan(scopeInput: unknown | ApiSetShadowInput, keyInput?: unknown, valueInput?: unknown): ApiSetShadowPlan;
export interface ApiStateShadowComparison {
    readonly ok: boolean;
    readonly snapshot: ApiStateShadowSnapshot;
    readonly mismatchCount: number;
    readonly mismatches: readonly string[];
}
/**
 * Code-Teil: compareApiStateShadow
 *
 * Zweck:
 * Baut für `/api/state` einen TypeScript-Shadow-Vergleich, ohne die produktive
 * API-Antwort zu verändern. Die Funktion nutzt bewusst den vorhandenen Snapshot-
 * Helfer, damit es nur eine fachliche 0/false/empty-Wert-Auswertung gibt.
 *
 * Zusammenhang:
 * main.js ruft diesen Helfer in 0.7.99 nur diagnostisch auf. Die Frontend-Antwort
 * bleibt weiterhin `this.stateCache` aus der bestehenden JavaScript-Runtime.
 */
export declare function compareApiStateShadow(stateCache: unknown, _now?: number): ApiStateShadowComparison;
//# sourceMappingURL=main-runtime-helpers.d.ts.map