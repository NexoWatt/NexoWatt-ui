/**
 * Executable TypeScript source: ems/services/locale-api-service.js
 *
 * Kleiner API-Handler für die live übernommene ioBroker-/EOS-Systemsprache.
 * Die Datei bleibt JS-kompatibel und benötigt bewusst kein @ts-nocheck.
 */
'use strict';

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
