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
