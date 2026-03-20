import React, { useMemo, useState } from 'react';
import PageShell from './PageShell';
import { generateLicenseKey, LICENSE_SECRET } from '../lib/licenseKey';

export default function LicenseGeneratorPage() {
  const queryUuid = (() => {
    try {
      return new URLSearchParams(window.location.search || '').get('uuid') || '';
    } catch {
      return '';
    }
  })();

  const [uuid, setUuid] = useState(queryUuid);
  const licenseKey = useMemo(() => generateLicenseKey(uuid), [uuid]);
  const status = !uuid ? '' : licenseKey ? 'Bereit ✅' : 'UUID ungültig oder leer.';

  const copy = async () => {
    if (!licenseKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(licenseKey);
    } catch {
      // ignore clipboard errors; field still shows the value
    }
  };

  const paste = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setUuid(String(value || '').trim());
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <PageShell
      title="Lizenz-Generator"
      subtitle="Interne Hilfsseite für Support und Vertrieb. Der Generator nutzt denselben HMAC-Mechanismus wie main.js und scripts/gen-license.js."
      compact
    >
      <section className="nw-grid nw-grid--two">
        <article className="nw-card">
          <h2>UUID</h2>
          <label className="nw-field-label" htmlFor="generatorUuid">
            ioBroker UUID
          </label>
          <div className="nw-inline-controls nw-inline-controls--stack-mobile">
            <input
              id="generatorUuid"
              className="nw-input"
              onChange={event => setUuid(event.target.value)}
              placeholder="z. B. 12345678-90ab-cdef-1234-567890abcdef"
              type="text"
              value={uuid}
            />
            <button className="nw-button" onClick={paste} type="button">
              Einfügen
            </button>
            <button className="nw-button" onClick={() => setUuid('')} type="button">
              Leeren
            </button>
          </div>
        </article>

        <article className="nw-card">
          <h2>Lizenzschlüssel</h2>
          <label className="nw-field-label" htmlFor="generatorKey">
            Generierter Schlüssel
          </label>
          <div className="nw-inline-controls nw-inline-controls--stack-mobile">
            <input id="generatorKey" className="nw-input" readOnly type="text" value={licenseKey} />
            <button className="nw-button nw-button--primary" onClick={copy} type="button">
              Kopieren
            </button>
          </div>
        </article>
      </section>

      <section className="nw-card">
        {status ? <div className="nw-status nw-status--ok">{status}</div> : null}
        <p className="nw-text-muted">
          Algorithmus: <code>HMAC-SHA256(secret, uuid)</code> → Hex → 32 Zeichen → <code>NW1-xxxx-…</code>
        </p>
        <p className="nw-text-muted">
          Secret: <code>{LICENSE_SECRET}</code>
        </p>
      </section>
    </PageShell>
  );
}
