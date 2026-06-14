// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: src-admin-tab/src/pages/RedirectPage.jsx
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * src-admin-tab/src/pages/RedirectPage.jsx
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
 * Original-Hash: e57865edaeab906bc028495259fadd1403f0c6b058d62ea9ad48b100753bfd12
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
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: src-admin-tab/src/pages/RedirectPage.jsx
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

import React, { useEffect, useMemo, useState } from 'react';
import PageShell from './PageShell';
import {
  buildRuntimeBaseUrl,
  getInstance,
  openExternal,
  readAdapterPort,
} from '../lib/adminConnection';

const TARGETS = {
  appcenter: {
    title: 'EMS App-Center',
    path: '/ems-apps.html?nwAdmin=1',
  },
  simulation: {
    title: 'Simulation',
    path: '/simulation.html?nwAdmin=1',
  },
  'smarthome-config': {
    title: 'SmartHome Config',
    path: '/smarthome-config.html?nwAdmin=1',
  },
  'smarthome-vis': {
    title: 'SmartHome VIS',
    path: '/smarthome.html',
  },
};

export default function RedirectPage({ targetKey }) {
  const target = TARGETS[targetKey];
  const instance = getInstance();
  const [port, setPort] = useState(8188);
  const [status, setStatus] = useState('Weiterleitung wird vorbereitet…');

  useEffect(() => {
    let active = true;

    (async () => {
      const resolvedPort = await readAdapterPort(instance);
      if (!active) {
        return;
      }

      setPort(resolvedPort);
      const baseUrl = buildRuntimeBaseUrl(resolvedPort);
      const url = `${baseUrl}${target.path}`;
      setStatus('Öffne Seite…');
      setTimeout(() => openExternal(url), 50);
    })();

    return () => {
      active = false;
    };
  }, [instance, target.path]);
  const targetUrl = useMemo(() => `${buildRuntimeBaseUrl(port)}${target.path}`, [port, target.path]);

  return (
    <PageShell title={target.title} subtitle="Weiterleitung wird vorbereitet…">
      <section className="nw-card nw-card--centered">
        <div className="nw-status nw-status--ok">{status}</div>
        <div className="nw-actions-row nw-actions-row--centered">
          <button className="nw-button nw-button--primary" onClick={() => openExternal(targetUrl)} type="button">
            Jetzt öffnen
          </button>
        </div>
      </section>
    </PageShell>
  );
}
