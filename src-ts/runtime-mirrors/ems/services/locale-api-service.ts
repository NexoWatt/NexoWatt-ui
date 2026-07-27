// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/locale-api-service.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * ems/services/locale-api-service.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: b2413c12669823456143fc5f67a51f05ba5e5416dd1827b818c268683ab9983f
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/locale-api-service.ts
 * Quell-Hash: sha256:6401e58572114470a83eb342816bf340be7bae7195e877e5d4af8b588996888d
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/locale-api-service.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/services/locale-api-service.js
 *
 * Kleiner API-Handler für die live übernommene ioBroker-/EOS-Systemsprache.
 * Die Datei bleibt JS-kompatibel und benötigt bewusst kein @ts-nocheck.
 */
'use strict';

/**
 * Code-Teil: createLocaleHandler
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function createLocaleHandler(adapter, sendNoStore) {
  return async function localeHandler(_req, res) {
    try {
      sendNoStore(res);
      await adapter._nwRefreshSystemLanguage('api-locale');
      return res.json({
        ok: true,
        locale: adapter._nwBuildLocaleInfo(),
        countryProfile: adapter._nwBuildCountryProfileInfo(),
        ts: Date.now(),
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: 'locale_unavailable',
        message: String(error && error.message ? error.message : error),
      });
    }
  };
}

module.exports = { createLocaleHandler };
