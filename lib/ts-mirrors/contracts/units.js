'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/contracts/units.ts
 * Quell-Hash: sha256:0e775079b3569eac26b86503625f5aad068369e9c5dfbafb212849ddbb426dcd
 * Erzeugung: npm run sync:ts-resolver-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer TypeScript-Resolver-Quelle.
 * Sie wird in 0.7.69 noch nicht produktiv geladen. Sie bereitet den späteren
 * Energiefluss-/Feature-Sichtbarkeits-Vergleichsmodus vor.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/resolvers/ oder den benötigten src-ts/utils/ vornehmen.
 * 2. npm run sync:ts-resolver-mirrors ausführen.
 * 3. npm run test:resolver-mirrors prüfen.
 */
/**
 * Datei: src-ts/contracts/units.ts
 *
 * Zweck:
 * Zentrale TypeScript-Basistypen für physikalische Einheiten.
 *
 * Warum das wichtig ist:
 * Im bisherigen JavaScript-Code sind fast alle Werte einfache Zahlen. Für Menschen ist
 * dann schwer erkennbar, ob ein Wert Watt, Kilowattstunden, Prozent oder Sekunden meint.
 * Diese Typ-Aliase sind noch keine echte Runtime-Prüfung, machen aber die spätere
 * TypeScript-Migration verständlicher und reduzieren Verwechslungen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
