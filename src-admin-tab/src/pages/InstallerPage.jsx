/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: src-admin-tab/src/pages/InstallerPage.jsx
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
import { useNavigate } from 'react-router-dom';
import PageShell from './PageShell';
import {
  buildRuntimeBaseUrl,
  getInstance,
  openExternal,
  readAdapterPort,
} from '../lib/adminConnection';

const DEFAULT_PORT = 8188;

export default function InstallerPage() {
  const navigate = useNavigate();
  const instance = getInstance();
  const [port, setPort] = useState(DEFAULT_PORT);
  const [hint, setHint] = useState('Port wird geladen…');

  useEffect(() => {
    let active = true;

    (async () => {
      const resolvedPort = await readAdapterPort(instance);
      if (!active) {
        return;
      }

      setPort(resolvedPort);
      setHint('Bereit.');
    })();

    return () => {
      active = false;
    };
  }, [instance]);
  const baseUrl = useMemo(() => buildRuntimeBaseUrl(port), [port]);

  const actions = [
    {
      label: 'VIS öffnen',
      variant: 'primary',
      onClick: () => openExternal(`${baseUrl}/`),
    },
    {
      label: 'EMS Apps öffnen',
      onClick: () => openExternal(`${baseUrl}/ems-apps.html?nwAdmin=1`),
    },
    {
      label: 'Simulation',
      onClick: () => openExternal(`${baseUrl}/simulation.html?nwAdmin=1`),
    },
    {
      label: 'Lizenz',
      onClick: () => navigate('/license'),
    },
    {
      label: 'SmartHome VIS',
      onClick: () => openExternal(`${baseUrl}/smarthome.html`),
    },
    {
      label: 'SmartHome Config',
      onClick: () => openExternal(`${baseUrl}/smarthome-config.html?nwAdmin=1`),
    },
  ];

  return (
    <PageShell
      title="Installer"
      subtitle="Wähle, was geöffnet werden soll. Die URL wird aus der Adapter-Instanz ermittelt (Port). Tipp: Die Installer-Seite ist für Konfiguration und Mapping gedacht."
      showBack={false}
    >
      <section className="nw-card nw-card--centered">
        <div className="nw-button-grid">
          {actions.map(action => (
            <button
              key={action.label}
              className={`nw-button ${action.variant === 'primary' ? 'nw-button--primary' : ''}`}
              onClick={action.onClick}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
        <div className="nw-install-hint">{hint}</div>
      </section>
    </PageShell>
  );
}
