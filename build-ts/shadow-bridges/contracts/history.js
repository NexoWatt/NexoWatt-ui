"use strict";
/**
 * Datei: src-ts/contracts/history.ts
 *
 * Zweck:
 * Enthält die ersten typisierten Datenverträge für History, Diagramme, Reports und
 * featureabhängige History-Anzeigen. Diese Typen sind die fachliche Vorbereitung für
 * die spätere Migration von `www/history.js` nach TypeScript.
 *
 * Wichtig:
 * History darf keine andere Energiefluss-Semantik verwenden als LIVE-Dashboard,
 * Backend-Resolver und EMS-Module. Speicherwerte, 0-W-Werte, EVCS-Sichtbarkeit und
 * Speicherfarm-Sichtbarkeit müssen deshalb explizit beschrieben bleiben.
 */
Object.defineProperty(exports, "__esModule", { value: true });
