/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/netoperator.ts
 * Quell-Hash: sha256:aa13322cedff569f61def483f8a7aafb4c83f3be2ec664ebc1a17f6f33a693a8
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/netoperator.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const text = (id, value) => { const node = $(id); if (node)
        node.textContent = value == null || value === '' ? '--' : String(value); };
    const fmt = (value, unit = '', digits = 2) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toLocaleString('de-DE', { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}` : '--';
    };
    const valueOf = (snapshot, key) => {
        const entry = snapshot?.values?.[key];
        return entry && entry.valid ? entry.value : null;
    };
    const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    function render(payload) {
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
        if (body)
            body.innerHTML = events.length ? events.map((event) => `<tr><td>${esc(new Date(event.timestamp || 0).toLocaleString('de-DE'))}</td><td>${esc(event.source || '')}</td><td>${esc(event.current?.action || '')}</td><td>${esc(event.current?.reason || '')}</td><td>${esc(event.result || '')}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Noch keine Sollwertänderung protokolliert.</td></tr>';
    }
    async function load() {
        try {
            const response = await fetch('/api/netoperator/status', { credentials: 'same-origin', cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
            render(payload);
        }
        catch (error) {
            text('netopStatus', `Fehler: ${error?.message || error}`);
        }
    }
    async function raw() {
        const box = $('netopRaw');
        try {
            const response = await fetch('/api/netoperator/raw', { credentials: 'same-origin', cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
            if (box) {
                box.style.display = '';
                box.textContent = JSON.stringify(payload, null, 2);
            }
        }
        catch (error) {
            if (box) {
                box.style.display = '';
                box.textContent = `Installer-/Admin-Zugriff erforderlich oder Fehler: ${error?.message || error}`;
            }
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        $('netopRefresh')?.addEventListener('click', () => load());
        $('netopRawBtn')?.addEventListener('click', () => raw());
        load();
        window.setInterval(load, 2000);
    });
})();
