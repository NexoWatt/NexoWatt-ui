// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: src-admin-tab/src/App.jsx
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * src-admin-tab/src/App.jsx
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
 * Original-Hash: eba71b020415972ec5546fbc73b3cba4c8bc164669ef4c36fac4f40e5e639175
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
 * Datei: src-admin-tab/src/App.jsx
 * Rolle im Projekt: Admin-React-Quelle.
 * Zweck: React-Quellcode für ioBroker-Admin-Tab und Installer-Einstiegsseiten.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Quellcode der React-Admin-Tab-Oberfläche.
 * Zusammenhänge:
 * - Baut nach admin/react/ und öffnet Installer-/Lizenz-/Redirect-Seiten.
 * - Kommuniziert über AdminConnection/ioBroker Admin APIs.
 * Wartungshinweise:
 * - Bei UI-Änderungen anschließend admin:build ausführen.
 */

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import InstallerPage from './pages/InstallerPage';
import LicensePage from './pages/LicensePage';
import RedirectPage from './pages/RedirectPage';

export default function App() {
  return (
    <Routes>
      <Route element={<InstallerPage />} path="/" />
      <Route element={<InstallerPage />} path="/installer" />
      <Route element={<LicensePage />} path="/license" />
      <Route element={<RedirectPage targetKey="appcenter" />} path="/redirect/appcenter" />
      <Route element={<RedirectPage targetKey="simulation" />} path="/redirect/simulation" />
      <Route element={<RedirectPage targetKey="smarthome-config" />} path="/redirect/smarthome-config" />
      <Route element={<RedirectPage targetKey="smarthome-vis" />} path="/redirect/smarthome-vis" />
      <Route element={<Navigate replace to="/installer" />} path="*" />
    </Routes>
  );
}
