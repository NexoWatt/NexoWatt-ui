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
  saveRuntimeLicenseKey,
  setObject,
} from '../lib/adminConnection';

function getLicenseStorageKey(instance) {
  return `nexowatt-ui.licenseKey.${instance}`;
}

function readCachedLicenseKey(instance) {
  try {
    return String(window.localStorage.getItem(getLicenseStorageKey(instance)) || '').trim();
  } catch {
    return '';
  }
}

function writeCachedLicenseKey(instance, key) {
  try {
    const clean = String(key || '').trim();
    if (clean) window.localStorage.setItem(getLicenseStorageKey(instance), clean);
    else window.localStorage.removeItem(getLicenseStorageKey(instance));
  } catch {
    // Browser storage may be blocked inside some ioBroker/Admin iframes. Ignore.
  }
}

export default function LicensePage() {
  const instance = getInstance();
  const [uuid, setUuid] = useState('');
  const [licenseKey, setLicenseKey] = useState(() => readCachedLicenseKey(getInstance()));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ ok: true, text: 'Lade Daten…' });

  const loadAll = useCallback(async () => {
    setBusy(true);
    setStatus({ ok: true, text: 'Lade Daten…' });

    const cachedKey = readCachedLicenseKey(instance);
    if (cachedKey) setLicenseKey(cachedKey);

    let conn = null;
    let resolvedUuid = '';
    let adapterObject = null;
    let licenseStatus = null;
    let runtimeInfo = null;
    let loadError = null;

    // Fast path: Der Adapter selbst liefert UUID, Status und den gespeicherten
    // Lizenzschlüssel schneller als die Admin-Socket-Fallbacks. Dadurch bleibt
    // die Voll-Lizenz nach erneutem Öffnen sofort sichtbar.
    try {
      runtimeInfo = await readRuntimeLicenseInfo(instance, null);
      if (runtimeInfo?.uuid) resolvedUuid = String(runtimeInfo.uuid);
      if (runtimeInfo?.licenseKey) {
        const runtimeKey = String(runtimeInfo.licenseKey).trim();
        setLicenseKey(runtimeKey);
        writeCachedLicenseKey(instance, runtimeKey);
      }
      if (runtimeInfo) {
        licenseStatus = {
          ok: runtimeInfo.valid !== false,
          text: runtimeInfo.message || (runtimeInfo.valid ? 'Lizenzstatus: gültig ✅' : 'Lizenzstatus: gesperrt/ungültig ❌'),
        };
      }
    } catch (error) {
      loadError = error;
    }

    const runtimeComplete = !!resolvedUuid && !!licenseStatus;

    // Wenn der Adapter-Webserver UUID + Status bereits geliefert hat, nicht mehr
    // auf die langsamen ioBroker-Admin-Fallbacks warten. Diese waren der Grund,
    // warum die UUID-Anzeige trotz funktionierendem /api/license/info lange dauerte.
    if (!runtimeComplete) {
      try {
        conn = await getAdminConnection();
      } catch (error) {
        loadError = loadError || error;
      }

      if (conn) {
        if (!resolvedUuid) {
          try {
            resolvedUuid = await readSystemUuid(conn, instance);
          } catch (error) {
            loadError = error;
          }
        }

        if (!runtimeInfo?.licenseKey) {
          try {
            adapterObject = await getObject(getAdapterObjectId(instance), conn);
          } catch (error) {
            loadError = error;
          }
        }

        if (!licenseStatus) {
          try {
            licenseStatus = await readLicenseStatus(instance, conn);
          } catch (error) {
            loadError = error;
          }
        }
      }
    }

    // Fallback über den laufenden Adapter-Webserver. Dieser Endpunkt ist bewusst
    // vor dem Lizenz-Gate erreichbar, damit die UUID auch ohne gültigen Schlüssel
    // zuverlässig angezeigt werden kann.
    if (!resolvedUuid || !licenseStatus) {
      try {
        runtimeInfo = await readRuntimeLicenseInfo(instance, conn);
        if (runtimeInfo?.uuid) resolvedUuid = String(runtimeInfo.uuid);
        if (runtimeInfo?.licenseKey) {
          const runtimeKey = String(runtimeInfo.licenseKey).trim();
          setLicenseKey(runtimeKey);
          writeCachedLicenseKey(instance, runtimeKey);
        }
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
    const configuredKey = adapterObject?.native?.licenseKey
      ? String(adapterObject.native.licenseKey).trim()
      : (runtimeInfo?.licenseKey ? String(runtimeInfo.licenseKey).trim() : cachedKey);
    if (configuredKey) {
      setLicenseKey(configuredKey);
      writeCachedLicenseKey(instance, configuredKey);
    }

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

    const key = String(licenseKey || '').trim();
    setLicenseKey(key);
    let adminError = null;

    // Primär über den laufenden Adapter speichern/aktivieren.
    // Das funktioniert auch dann, wenn die Admin-Socket-API im Browser/iframe zickt.
    try {
      const info = await saveRuntimeLicenseKey(instance, key);
      if (info?.uuid) setUuid(String(info.uuid));
      if (info?.licenseKey) setLicenseKey(String(info.licenseKey));
      writeCachedLicenseKey(instance, info?.licenseKey || key);
      setStatus({
        ok: info?.valid !== false,
        text: info?.message || (info?.valid ? 'Gespeichert und aktiviert ✅' : 'Gespeichert, aber Lizenz noch ungültig ❌'),
      });
      setBusy(false);
      return;
    } catch (error) {
      adminError = error;
    }

    // Fallback: klassische Admin-Objekt-Speicherung.
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
      adapterObject.native.licenseKey = key;
      await setObject(adapterId, adapterObject, conn);
      writeCachedLicenseKey(instance, key);

      setStatus({ ok: true, text: 'Gespeichert ✅ Bitte Adapter neu starten, falls der Status nicht sofort wechselt.' });
    } catch (error) {
      setStatus({
        ok: false,
        text: `Speichern fehlgeschlagen: Runtime ${adminError?.message || String(adminError || 'nicht erreichbar')} / Admin ${error?.message || String(error)}`,
      });
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
