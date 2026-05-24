import React, { useCallback, useEffect, useState } from 'react';
import PageShell from './PageShell';
import {
  getAdminConnection,
  getAdapterObjectId,
  getObject,
  getInstance,
  readLicenseStatus,
  readRuntimeLicenseInfo,
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

    let conn = null;
    let resolvedUuid = '';
    let adapterObject = null;
    let licenseStatus = null;
    let loadError = null;

    try {
      conn = await getAdminConnection();
    } catch (error) {
      loadError = error;
    }

    if (conn) {
      try {
        resolvedUuid = await readSystemUuid(conn, instance);
      } catch (error) {
        loadError = error;
      }

      try {
        adapterObject = await getObject(getAdapterObjectId(instance), conn);
      } catch (error) {
        loadError = error;
      }

      try {
        licenseStatus = await readLicenseStatus(instance, conn);
      } catch (error) {
        loadError = error;
      }
    }

    // Fallback über den laufenden Adapter-Webserver. Dieser Endpunkt ist bewusst
    // vor dem Lizenz-Gate erreichbar, damit die UUID auch ohne gültigen Schlüssel
    // zuverlässig angezeigt werden kann.
    if (!resolvedUuid || !licenseStatus) {
      try {
        const runtimeInfo = await readRuntimeLicenseInfo(instance, conn);
        if (runtimeInfo?.uuid) resolvedUuid = String(runtimeInfo.uuid);
        if (!licenseStatus && runtimeInfo) {
          licenseStatus = {
            ok: runtimeInfo.valid !== false,
            text: runtimeInfo.message || (runtimeInfo.valid ? 'Lizenzstatus: gültig ✅' : 'Lizenzstatus: gesperrt/ungültig ❌'),
          };
        }
      } catch (error) {
        loadError = loadError || error;
      }
    }

    setUuid(resolvedUuid || 'Nicht verfügbar');
    setLicenseKey(adapterObject?.native?.licenseKey ? String(adapterObject.native.licenseKey) : '');

    if (licenseStatus) {
      setStatus(licenseStatus);
    } else if (!conn) {
      setStatus({
        ok: false,
        text: 'Admin-Verbindung nicht verfügbar und Adapter-Webserver nicht erreichbar. Bitte Seite im ioBroker-Admin öffnen oder Adapter-Port prüfen.',
      });
    } else {
      setStatus({
        ok: false,
        text: `Laden teilweise fehlgeschlagen: ${loadError?.message || String(loadError || 'unbekannter Fehler')}`,
      });
    }

    setBusy(false);
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
      subtitle="Hier wird der Lizenzschlüssel für diese ioBroker-Instanz hinterlegt. Der Schlüssel ist an die System-UUID gekoppelt. Hinweis: Der Lizenzschlüssel ist bewusst nur im Admin verfügbar."
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
            Nach dem Speichern startet der Adapter ggf. neu. Bei ungültigem Schlüssel bleibt der Adapter gesperrt.
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
