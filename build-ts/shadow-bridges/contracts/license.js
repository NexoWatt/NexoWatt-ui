"use strict";
/**
 * Datei: src-ts/contracts/license.ts
 *
 * Zweck:
 * Vertrag für Lizenzstatus und Lizenzspeicherung.
 *
 * Kritische Regel:
 * Maskierte Werte wie "********", "protected" oder "encrypted" dürfen niemals als
 * echter Lizenzschlüssel gespeichert werden. Diese Regel verhindert, dass ioBroker/Admin
 * einen echten Schlüssel durch einen Platzhalter überschreibt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
