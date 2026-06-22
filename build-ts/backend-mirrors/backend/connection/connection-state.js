"use strict";
/**
 * Datei: src-ts/backend/connection/connection-state.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der `info.connection`-Logik aus `main.js` vor.
 *
 * Zusammenhang:
 * `info.connection` darf nur den echten Adapter-/Webserverstatus widerspiegeln. Optionale
 * Teilfehler nach dem Webserverstart dürfen die Verbindung nicht fälschlich offline setzen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideConnectionState = decideConnectionState;
/**
 * Code-Teil: decideConnectionState
 *
 * Zweck:
 * Erzeugt eine fachliche Entscheidung für `info.connection`.
 *
 * Wichtig:
 * `partial-init-warning` bleibt online, wenn der Webserver bereits läuft. Genau dieser Fall war
 * früher kritisch, weil optionale Bereiche den Adapter fälschlich offline wirken lassen konnten.
 */
function decideConnectionState(reason) {
    if (reason === 'webserver-listening' || reason === 'heartbeat' || reason === 'partial-init-warning') {
        return {
            connected: true,
            reason,
            message: reason === 'partial-init-warning'
                ? 'Webserver läuft; optionaler Teilbereich meldet Warnung.'
                : 'Webserver läuft und Adapter ist erreichbar.',
        };
    }
    if (reason === 'startup') {
        return { connected: false, reason, message: 'Adapter startet, Webserver ist noch nicht bereit.' };
    }
    return { connected: false, reason, message: 'Adapter-Webserver ist nicht verbunden oder wurde beendet.' };
}
