// @runtime-transpile
/**
 * Executable TypeScript source: ems/services/locale-api-service.js
 *
 * Kleiner API-Handler für die live übernommene ioBroker-/EOS-Systemsprache.
 * Die Datei wird aus strikt typisiertem TypeScript in die produktive JS-Runtime transpiliert.
 */
'use strict';

type LocaleAdapter = {
  _nwRefreshSystemLanguage(reason: string): Promise<unknown>;
  _nwBuildLocaleInfo(): unknown;
  _nwBuildCountryProfileInfo(): unknown;
};

type JsonResponse = {
  json(payload: unknown): unknown;
  status(code: number): JsonResponse;
};

type SendNoStore = (response: JsonResponse) => void;

function createLocaleHandler(adapter: LocaleAdapter, sendNoStore: SendNoStore) {
  return async function localeHandler(_req: unknown, res: JsonResponse) {
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
        message: String(error instanceof Error ? error.message : error),
      });
    }
  };
}

module.exports = { createLocaleHandler };
