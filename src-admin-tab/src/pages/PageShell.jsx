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
