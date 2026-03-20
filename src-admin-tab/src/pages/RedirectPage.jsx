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
    path: '/ems-apps.html',
  },
  simulation: {
    title: 'Simulation',
    path: '/simulation.html',
  },
  'smarthome-config': {
    title: 'SmartHome Config',
    path: '/smarthome-config.html',
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
      setStatus(`Öffne ${url}`);
      setTimeout(() => openExternal(url), 50);
    })();

    return () => {
      active = false;
    };
  }, [instance, target.path]);

  const targetUrl = useMemo(() => `${buildRuntimeBaseUrl(port)}${target.path}`, [port, target.path]);

  return (
    <PageShell
      title={target.title}
      subtitle="Die Seite lädt den Adapter-Port aus der Instanz und springt dann in die Runtime-Oberfläche."
    >
      <section className="nw-card">
        <div className="nw-status nw-status--ok">{status}</div>
        <div className="nw-actions-row">
          <button className="nw-button nw-button--primary" onClick={() => openExternal(targetUrl)} type="button">
            Jetzt öffnen
          </button>
        </div>
        <p className="nw-mono">{targetUrl}</p>
      </section>
    </PageShell>
  );
}
