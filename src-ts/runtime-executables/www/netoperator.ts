// @runtime-transpile
(function () {
  'use strict';
  const $ = (id: string): HTMLElement | null => document.getElementById(id);
  const text = (id: string, value: any): void => { const node = $(id); if (node) node.textContent = value == null || value === '' ? '--' : String(value); };
  const fmt = (value: any, unit = '', digits = 2): string => {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toLocaleString('de-DE', { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}` : '--';
  };
  const valueOf = (snapshot: any, key: string): any => {
    const entry = snapshot?.values?.[key];
    return entry && entry.valid ? entry.value : null;
  };
  const esc = (value: any): string => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function render(payload: any): void {
    const snapshot = payload?.snapshot || null;
    const command = snapshot?.command || {};
    text('netopStatus', payload?.enabled ? (snapshot?.valid ? 'bereit' : (snapshot?.fresh ? 'unvollständig' : 'stale / nicht bereit')) : 'deaktiviert');
    text('netopMode', payload?.mode || 'off');
    text('netopDriver', snapshot ? `${snapshot.driverId || '--'} · Mapping ${snapshot.mappingVersion || '--'}` : '--');
    text('netopSource', snapshot?.source || '--');
    text('netopComm', snapshot?.commOk ? 'OK' : 'gestört');
    const lastReceivedAt = Number(payload?.lastReceivedAt || snapshot?.receivedAt || 0);
    const lastValidAt = Number(payload?.lastValidAt || 0);
    text('netopLastTelegram', lastReceivedAt > 0 ? new Date(lastReceivedAt).toLocaleString('de-DE') : '--');
    text('netopLastValidTelegram', lastValidAt > 0 ? new Date(lastValidAt).toLocaleString('de-DE') : '--');
    text('netopCommand', `${command.action || 'monitor'} · Priorität ${command.priority ?? '--'}`);
    text('netopBinding', command.binding ? 'bindend' : 'nicht bindend');
    text('netopEnable', valueOf(snapshot, 'grid.command.enable') === true ? 'aktiv' : valueOf(snapshot, 'grid.command.enable') === false ? 'aus' : '--');
    text('netopRelease', valueOf(snapshot, 'grid.command.release') === true ? 'freigegeben' : valueOf(snapshot, 'grid.command.release') === false ? 'gesperrt' : '--');
    text('netopTrip', valueOf(snapshot, 'grid.command.trip') === true ? 'TRIP AKTIV' : valueOf(snapshot, 'grid.command.trip') === false ? 'kein Trip' : '--');
    text('netopPLimit', fmt(valueOf(snapshot, 'grid.p.limit_kw'), 'kW'));
    text('netopPTarget', fmt(valueOf(snapshot, 'grid.p.target_kw'), 'kW'));
    text('netopPTargetPct', fmt(valueOf(snapshot, 'grid.p.target_pct'), '%'));
    text('netopQTarget', fmt(valueOf(snapshot, 'grid.q.target_kvar'), 'kvar'));
    text('netopCosPhi', fmt(valueOf(snapshot, 'grid.cosphi.target'), '', 3));
    text('netopPActual', fmt(valueOf(snapshot, 'pcc.p.actual_kw'), 'kW'));
    text('netopQActual', fmt(valueOf(snapshot, 'pcc.q.actual_kvar'), 'kvar'));
    text('netopUActual', fmt(valueOf(snapshot, 'pcc.u.actual_v'), 'V', 1));
    text('netopControllerStatus', valueOf(snapshot, 'controller.status'));
    text('netopFault', valueOf(snapshot, 'controller.fault_code'));
    const banner = $('netopBindingBanner');
    if (banner) {
      banner.className = `netop-banner ${command.binding ? 'netop-banner--binding' : 'netop-banner--normal'}`;
      banner.textContent = command.binding
        ? `Externe Netzbetreiber-Vorgabe ist bindend: ${command.reason || command.action || 'Vorgabe aktiv'}. EOS darf nur innerhalb dieser Grenze optimieren.`
        : 'Keine bindende externe Vorgabe. Die Netzbetreiber-App arbeitet in RC50 ausschließlich read-only.';
    }
    const body = $('netopAuditRows');
    const events = Array.isArray(payload?.audit) ? payload.audit.slice().reverse() : [];
    if (body) body.innerHTML = events.length ? events.map((event: any) => `<tr><td>${esc(new Date(event.timestamp || 0).toLocaleString('de-DE'))}</td><td>${esc(event.source || '')}</td><td>${esc(event.current?.action || '')}</td><td>${esc(event.current?.reason || '')}</td><td>${esc(event.result || '')}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Noch keine Sollwertänderung protokolliert.</td></tr>';
  }

  async function load(): Promise<void> {
    try {
      const response = await fetch('/api/netoperator/status', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
      render(payload);
    } catch (error: any) {
      text('netopStatus', `Fehler: ${error?.message || error}`);
    }
  }

  async function raw(): Promise<void> {
    const box = $('netopRaw');
    try {
      const response = await fetch('/api/netoperator/raw', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
      if (box) { box.style.display = ''; box.textContent = JSON.stringify(payload, null, 2); }
    } catch (error: any) {
      if (box) { box.style.display = ''; box.textContent = `Installer-/Admin-Zugriff erforderlich oder Fehler: ${error?.message || error}`; }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('netopRefresh')?.addEventListener('click', () => load());
    $('netopRawBtn')?.addEventListener('click', () => raw());
    load();
    window.setInterval(load, 2000);
  });
})();
