"use strict";
/**
 * Code-Teil: TypeScript-Verträge für spätere Regressionstests.
 * Zweck: Beschreibt Testfälle, mit denen kritische Adapterlogik später
 *        abgesichert wird, ohne die produktive JavaScript-Logik schon jetzt
 *        umzubauen.
 * Zusammenhang: Diese Typen werden in den nächsten Versionen genutzt, um Tests
 *        für Speicher-DP, Energiefluss, Heizstab, EVCS/Farm-Sichtbarkeit,
 *        Lizenz und info.connection sauber aufzubauen.
 * Wichtig: Die Datei ist noch kein Runtime-Test. Sie definiert nur die Struktur,
 *          damit Tests später Schritt für Schritt in TypeScript entstehen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
