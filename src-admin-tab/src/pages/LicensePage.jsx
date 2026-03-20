import React, { useCallback, useEffect, useState } from 'react';
import PageShell from './PageShell';
import {
  getAdminConnection,
  getAdapterObjectId,
  getInstance,
  getObject,
  readLicenseStatus,
  readSystemUuid,
  setObject,
} from '../lib/adminConnection';

export default function LicensePage() {
  const instance = getInstance();
  const [uuid, setUuid] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ ok: true, text: 'Lade Daten…' });

  const loadAll = useCallback(async () => {
    setBusy(true);
    setStatus({ ok: true, text: 'Lade Daten…' });

    const conn = await getAdminConnection();
    if (!conn) {
      setStatus({
        ok: false,
        text: 'Admin-Verbindung nicht verfügbar. Bitte Seite im ioBroker-Admin öffnen.',
      });
      setBusy(false);
      return;
    }

    try {
      const [resolvedUuid, adapterObject] = await Promise.all([
        readSystemUuid(conn),
        getObject(getAdapterObjectId(instance), conn),
      ]);

      setUuid(resolvedUuid || 'Nicht verfügbar');
      setLicenseKey(adapterObject?.native?.licenseKey ? String(adapterObject.native.licenseKey) : '');

      const licenseStatus = await readLicenseStatus(instance, conn);
      setStatus(licenseStatus);
    } catch (error) {
      setStatus({
        ok: false,
        text: `Laden fehlgeschlagen: ${error?.message || String(error)}`,
      });
    } finally {
      setBusy(false);
    }
  }, [instance]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const copyUuid = async () => {
    try {
      await navigator.clipboard.writeText(uuid || '');
      setStatus({ ok: true, text: 'UUID kopiert ✅' });
    } catch {
      setStatus({ ok: false, text: 'Kopieren nicht möglich – bitte manuell markieren.' });
    }
  };

  const save = async () => {
    setBusy(true);

    try {
      const conn = await getAdminConnection();
      if (!conn) {
        throw new Error('Admin-Verbindung fehlt.');
      }

      const adapterId = getAdapterObjectId(instance);
      const adapterObject = await getObject(adapterId, conn);
      if (!adapterObject) {
        throw new Error(`Adapter-Objekt nicht gefunden: ${adapterId}`);
      }

      adapterObject.native = adapterObject.native || {};
      adapterObject.native.licenseKey = String(licenseKey || '').trim();
      await setObject(adapterId, adapterObject, conn);

      setStatus({ ok: true, text: 'Gespeichert ✅ Bitte Adapter ggf. neu starten.' });
    } catch (error) {
      setStatus({ ok: false, text: `Speichern fehlgeschlagen: ${error?.message || String(error)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Lizenz"
      subtitle="Der Lizenzschlüssel wird direkt in der Adapter-Instanz gespeichert (native.licenseKey). Die System-UUID dient als Referenz für Vertrieb und Support."
    >
      <section className="nw-grid nw-grid--two">
        <article className="nw-card">
          <h2>System-UUID</h2>
          <label className="nw-field-label" htmlFor="uuid">
            ioBroker UUID
          </label>
          <div className="nw-inline-controls">
            <input id="uuid" className="nw-input" readOnly type="text" value={uuid} />
            <button className="nw-button" onClick={copyUuid} type="button">
              Kopieren
            </button>
          </div>
          <p className="nw-text-muted">
            Diese UUID bitte beim Support oder Vertrieb angeben. Daraus wird der Lizenzschlüssel erzeugt.
          </p>
        </article>

        <article className="nw-card">
          <h2>Lizenzschlüssel</h2>
          <label className="nw-field-label" htmlFor="licenseKey">
            Lizenzschlüssel
          </label>
          <input
            id="licenseKey"
            className="nw-input"
            onChange={event => setLicenseKey(event.target.value)}
            placeholder="z. B. NW1-XXXX-XXXX-..."
            type="text"
            value={licenseKey}
          />
          <p className="nw-text-muted">
            Nach dem Speichern startet der Adapter je nach Setup neu oder muss manuell neu gestartet werden.
          </p>
        </article>
      </section>

      <section className="nw-card">
        <div className="nw-actions-row">
          <button className="nw-button nw-button--primary" disabled={busy} onClick={save} type="button">
            Speichern
          </button>
          <button className="nw-button" disabled={busy} onClick={loadAll} type="button">
            Neu laden
          </button>
        </div>
        <div className={`nw-status ${status.ok ? 'nw-status--ok' : 'nw-status--bad'}`}>{status.text}</div>
      </section>
    </PageShell>
  );
}
