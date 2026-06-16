// @ts-nocheck
/**
 * Executable TypeScript source: .nwcore/modules/base.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `.nwcore/modules/base.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * Datei: .nwcore/modules/base.js
 * Rolle im Projekt: EMS-Modul base.
 * Zweck: Führt eine fachliche EMS-Funktion zyklisch aus und veröffentlicht States für Frontend/Regelung.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Interne EMS-Kern-/Referenzdatei im .nwcore-Bereich. Dieser Bereich spiegelt wiederverwendbare EMS-Logik.
 * Zusammenhänge:
 * - Die produktive Variante liegt häufig parallel unter ems/.
 * - Änderungen müssen mit dem produktiven ems/-Pfad abgeglichen werden.
 * Wartungshinweise:
 * - Nicht isoliert ändern, sonst laufen .nwcore und ems auseinander.
 */

'use strict';
require('../../scripts/secure-loader').load(module, __filename, 'uddkJ4AccLAAllLJ3L77rKOEbI8yjzu4f7/xWNCPQ6RQryjymVkjAEeNWYr8R1m1ufA9BxSYb+0/tNZB49o2nFBPmPruRJB90Zw24cm5Nvf+rSXTCRNjSnKqVVosXkAhdOe5SxON5BY8HRsHu05M34LpUsacyzWpwj+Wesq3JoWsRBhW9ZaQJ+6dEzD3BlhU09FiU6PfiQbdwprOmo2zKUwdFZTdAh/DpVNtacRCnNJHIw+w8UqlYl/DEZe5fb4+8Pd2BrFLxHAuJjYMWXz3Er5rC4r8DqyP+BWH/rF57UMwux8lOX7nQjvVqBIHpKfYNwu6ufjiA9XqLs2ua9iaFFqe1IPDN7ZxchbneyVahOhbiLtb+t9pKhTmrktVuaiH3rIgr4vnoRJAs3u6wIFgdcdfEY9kmTC3b05gJXEH7fJfFjeJ0qzZ9iqRuoYskQ7jltedwln89KvY/MuvxCUISfCkO2CoQ/uagos4sydD1SDbQ+a4aHfA9ytjBD3zZ8h+66UCL/DSVmGfes5iiqZrrbLZ6lNb3Euga084N7MZvCwATgqH5CY48DOXORFlh9cXxGcmV55JfAmrIoFwPbjbn4Hzf16SRE+5B4s8PWgCNOvVsSzeaC0TpSX7Gh7X5oa1pgF/j4VJXiFAcuZPhxxTQzZL4xHQfLlrvnNv+WEIaEzAUu2zVNDShUPZ');
