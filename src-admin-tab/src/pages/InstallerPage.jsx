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
  const [status, setStatus] = useState({ ok: true, text: 'Port wird geladen…' });

  useEffect(() => {
    let active = true;

    (async () => {
      const resolvedPort = await readAdapterPort(instance);
      if (!active) {
        return;
      }

      setPort(resolvedPort);
      if (resolvedPort === DEFAULT_PORT) {
        setStatus({
          ok: true,
          text: 'Port nicht aus der Instanz lesbar – Fallback auf 8188 aktiv.',
        });
        return;
      }

      setStatus({ ok: true, text: `Port ${resolvedPort} geladen.` });
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
    {
      label: 'Lizenz-Generator',
      onClick: () => navigate('/license-generator'),
    },
  ];

  return (
    <PageShell
      title="Installer"
      subtitle="Die Adapter-Einstellungen laufen jetzt über JSONConfig. Diese React-Seite bündelt die Admin-Shortcuts, Redirects und die Lizenzverwaltung ohne Materialize-Legacy."
      showBack={false}
    >
      <section className="nw-card">
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
        <div className={`nw-status ${status.ok ? 'nw-status--ok' : 'nw-status--bad'}`}>{status.text}</div>
      </section>

      <section className="nw-grid nw-grid--two">
        <article className="nw-card">
          <h2>Admin-Standard</h2>
          <ul className="nw-list">
            <li>Instanz-Konfiguration über <code>admin/jsonConfig.json</code>.</li>
            <li>Admin-Tab und Hilfsseiten als React-SPA.</li>
            <li>Legacy-Materialize-Dateien werden nicht mehr verwendet.</li>
          </ul>
        </article>

        <article className="nw-card">
          <h2>Aktive Basis-URL</h2>
          <p className="nw-mono">{baseUrl}</p>
          <p className="nw-text-muted">
            Runtime-Seiten werden weiter über den Adapter-Port geöffnet. Die Admin-Oberfläche selbst bleibt im
            ioBroker-Standard: JSONConfig + React.
          </p>
        </article>
      </section>
    </PageShell>
  );
}
