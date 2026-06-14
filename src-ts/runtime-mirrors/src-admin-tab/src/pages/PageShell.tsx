// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: src-admin-tab/src/pages/PageShell.jsx
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * src-admin-tab/src/pages/PageShell.jsx
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
 * Original-Hash: b29d50d8a4446ec7cf35118922aa41b778ece23cfd9d35067954cb469f360bad
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
 * Datei: src-admin-tab/src/pages/PageShell.jsx
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

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInstance } from '../lib/adminConnection';

export default function PageShell({
  title,
  subtitle,
  children,
  actions = null,
  compact = false,
  showBack = true,
  backLabel = 'Zurück zum Installer',
}) {
  useEffect(() => {
    document.title = title ? `NexoWatt – ${title}` : 'NexoWatt Admin';
  }, [title]);

  const instance = getInstance();

  return (
    <div className="nw-page-shell">
      <div className="nw-page-gradient" />
      <div className={`nw-page-wrap ${compact ? 'nw-page-wrap--compact' : ''}`}>
        <header className="nw-hero">
          <div className="nw-brand">
            <img className="nw-brand__logo" src="../admin.png" alt="NexoWatt" />
            <div>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="nw-instance-badge">Instanz {instance}</div>
        </header>

        {(subtitle || showBack || actions) ? (
          <section className="nw-header-card">
            {subtitle ? <p className="nw-subtitle">{subtitle}</p> : null}
            <div className="nw-header-card__actions">
              {showBack ? (
                <Link className="nw-link-button" to="/installer">
                  {backLabel}
                </Link>
              ) : null}
              {actions}
            </div>
          </section>
        ) : null}

        {children}
      </div>
    </div>
  );
}
