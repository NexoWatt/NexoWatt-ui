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
      onClick: () => openExternal(`${baseUrl}/ems-apps.html`),
    },
    {
      label: 'Simulation',
      onClick: () => openExternal(`${baseUrl}/simulation.html`),
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
      onClick: () => openExternal(`${baseUrl}/smarthome-config.html`),
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
