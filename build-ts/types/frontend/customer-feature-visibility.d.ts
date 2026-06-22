import type { FeatureVisibilityState, EvcsPresenceProof, StorageFarmPresenceProof } from '../contracts/features';
/**
 * Datei: src-ts/frontend/customer-feature-visibility.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der kundenseitigen Feature-Sichtbarkeit vor.
 *
 * Zusammenhang:
 * Das LIVE-Dashboard, History, SmartHome und das Hamburger-Menü dürfen nur Funktionen
 * anzeigen, die in der konkreten Kundenanlage wirklich vorhanden sind. Diese Datei ist
 * noch nicht produktiv verdrahtet, dokumentiert aber die spätere gemeinsame Regel.
 *
 * Wichtig für spätere Runtime-Migration:
 * Alte Flags oder alte 0-W-States dürfen EVCS/Farm nicht sichtbar machen. Sichtbarkeit
 * entsteht nur durch echte Konfiguration oder echte Datenpunkt-Nachweise.
 */
/** Eingabe für die kundenseitige Sichtbarkeitsentscheidung. */
export interface CustomerFeatureVisibilityInput {
    /** Ladepunkt-Nachweise aus Installer-/Runtime-Konfiguration. */
    readonly evcsProofs?: ReadonlyArray<EvcsPresenceProof | undefined> | undefined;
    /** Installer-Schalter für Speicherfarm. Ohne diesen Schalter bleibt Farm unsichtbar. */
    readonly storageFarmEnabled?: boolean | undefined;
    /** Speicherfarm-Nachweise aus konfigurierten Farmspeichern. */
    readonly storageFarmProofs?: ReadonlyArray<StorageFarmPresenceProof | undefined> | undefined;
    /** SmartHome ist ein Feature-Schalter, kein Datenpunktnachweis. */
    readonly smartHomeEnabled?: boolean | undefined;
    /** Wetter-App muss aktiv sein. */
    readonly weatherEnabled?: boolean | undefined;
    /** Wetter braucht zusätzlich sichtbare Daten. */
    readonly weatherHasData?: boolean | undefined;
    /** KI-App muss installiert/aktiv sein. */
    readonly aiAdvisorInstalled?: boolean | undefined;
    /** Kundenschalter darf die KI-Kachel ausblenden. Fehlend bedeutet aktiv. */
    readonly aiAdvisorCustomerEnabled?: boolean | undefined;
}
/** Begründete Sichtbarkeit einer Funktion im Kundenfrontend. */
export interface FeatureVisibilityDecision {
    /** Technischer Funktionsschlüssel, z. B. evcs oder storageFarm. */
    readonly key: 'evcs' | 'storageFarm' | 'smartHome' | 'weather' | 'aiAdvisor';
    /** Finale Sichtbarkeit. */
    readonly visible: boolean;
    /** Kurze maschinenlesbare Ursache für Diagnose/Tests. */
    readonly reason: string;
    /** Menschlich lesbarer deutscher Hinweis für spätere Diagnoseanzeigen. */
    readonly hint: string;
}
/** Ergebnis der erklärten Sichtbarkeitsberechnung. */
export interface CustomerFeatureVisibilityExplanation {
    /** Finale boolean-Sichtbarkeit, kompatibel mit dem bisherigen Vertrag. */
    readonly visibility: FeatureVisibilityState;
    /** Einzelentscheidungen mit Gründen. */
    readonly decisions: ReadonlyArray<FeatureVisibilityDecision>;
}
/**
 * Code-Teil: hasRealEvcsProof
 *
 * Zweck:
 * Erkennt, ob ein Ladepunkt wirklich existiert.
 *
 * Zusammenhang:
 * Wird später für LIVE-Dashboard, History, EVCS-Tab und Hamburger-Menü genutzt.
 *
 * Wichtig:
 * Ein alter 0-W-State oder ein altes Flag reicht nicht. EVCS darf im Kundenfrontend
 * nur sichtbar werden, wenn ein echter Mess- oder Steuer-Datenpunkt vorhanden ist.
 */
export declare function hasRealEvcsProof(proof: EvcsPresenceProof | undefined): boolean;
/**
 * Code-Teil: hasRealStorageFarmProof
 *
 * Zweck:
 * Erkennt, ob ein Speicherfarm-Speicher wirklich konfiguriert ist.
 *
 * Zusammenhang:
 * Späterer gemeinsamer Check für Topbar, Menü und Speicherfarm-Seite.
 *
 * Wichtig:
 * Eine Speicherfarm darf nicht allein durch alte Runtime-States sichtbar werden.
 */
export declare function hasRealStorageFarmProof(proof: StorageFarmPresenceProof | undefined): boolean;
/**
 * Code-Teil: decideEvcsVisibility
 *
 * Zweck:
 * Baut die EVCS-Einzelentscheidung inklusive Grund.
 *
 * Zusammenhang:
 * Diese Funktion ist später wichtig, damit History und LIVE-Dashboard nicht wieder
 * Ladepunkte anzeigen, obwohl in der Anlage keine Wallbox installiert ist.
 */
export declare function decideEvcsVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityDecision;
/**
 * Code-Teil: decideStorageFarmVisibility
 *
 * Zweck:
 * Baut die Speicherfarm-Einzelentscheidung inklusive Grund.
 *
 * Zusammenhang:
 * Schützt Kundenanlagen ohne Speicherfarm vor falschem Speicherfarm-Reiter und
 * falschen Farm-Hinweisen im Kundenfrontend.
 */
export declare function decideStorageFarmVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityDecision;
/**
 * Code-Teil: decideSmartHomeVisibility
 * Zweck: Kapselt den SmartHome-Schalter in eine begründete Einzelentscheidung.
 */
export declare function decideSmartHomeVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityDecision;
/**
 * Code-Teil: decideWeatherVisibility
 * Zweck: Wetter wird nur sichtbar, wenn Feature aktiv und Daten vorhanden sind.
 */
export declare function decideWeatherVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityDecision;
/**
 * Code-Teil: decideAiAdvisorVisibility
 * Zweck: KI-Berater nur anzeigen, wenn App aktiv und Kundenschalter nicht aus ist.
 */
export declare function decideAiAdvisorVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityDecision;
/**
 * Code-Teil: explainCustomerFeatureVisibility
 *
 * Zweck:
 * Berechnet die Feature-Sichtbarkeit mit nachvollziehbaren Gründen.
 *
 * Zusammenhang:
 * Dieser erklärende Modus ist für die nächste sichere Migration wichtig. Bevor wir
 * `www/app.js` produktiv auf den TS-Helfer umstellen, können wir damit Tests und
 * Diagnoseausgaben gegen die vorhandene JS-Logik vergleichen.
 */
export declare function explainCustomerFeatureVisibility(input: CustomerFeatureVisibilityInput): CustomerFeatureVisibilityExplanation;
/**
 * Code-Teil: buildCustomerFeatureVisibility
 *
 * Zweck:
 * Baut die kundenseitige Feature-Sichtbarkeit aus Nachweisen und Kundenschaltern.
 *
 * Zusammenhang:
 * Späterer Kandidat für die Migration verstreuter Checks aus `www/app.js`,
 * `www/cockpit-shell.js`, `www/history.js` und Unterseiten.
 */
export declare function buildCustomerFeatureVisibility(input: CustomerFeatureVisibilityInput): FeatureVisibilityState;
//# sourceMappingURL=customer-feature-visibility.d.ts.map