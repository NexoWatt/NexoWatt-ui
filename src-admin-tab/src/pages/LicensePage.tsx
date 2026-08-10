/**
 * Datei: src-admin-tab/src/pages/LicensePage.tsx
 * Rolle: Kompatibilitäts-Weiterleitung zur streng geschützten Runtime-Lizenzseite.
 *
 * Sicherheitsvertrag:
 * - Im Admin-Bundle werden weder System-UUID noch Lizenzschlüssel gelesen,
 *   zwischengespeichert oder bearbeitet.
 * - Die Runtime-Seite `/license.html` erzwingt server- und clientseitig die
 *   Capability `license.manage` und lädt Daten erst nach einer Installer- oder Admin-Session.
 */

import React, { useEffect } from 'react';
import RedirectPage from './RedirectPage';

function clearLegacyLicenseCache(): void {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[storageName];
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.startsWith('nexowatt-ui.licenseKey.')) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // Browser-Speicher kann durch Richtlinien blockiert sein. Die Weiterleitung
      // bleibt dennoch sicher, weil neue Lizenzdaten dort nie gespeichert werden.
    }
  }
}

export default function LicensePage() {
  useEffect(() => {
    clearLegacyLicenseCache();
  }, []);

  return <RedirectPage targetKey="license" />;
}
