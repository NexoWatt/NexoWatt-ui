/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/access-control.ts
 * Quell-Hash: sha256:7456ea8ce2cc62c985c37d0639c2b87bea5c753c85df412eb69d18da628ed399
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/access-control.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * Executable TypeScript source: ems/services/access-control.js
 *
 * Zweck:
 * Zentrale EOS-Rollen-/Rechte-Matrix für den NexoWatt UI Adapter.
 * Der Adapter läuft technisch auf ioBroker, die führende Oberfläche heißt im Produkt
 * aber EOS Admin. Deshalb bildet dieser Helfer EOS/ioBroker Benutzergruppen auf
 * NexoWatt-Rollen und Capabilities ab.
 *
 * Sicherheitsprinzip:
 * - UI-Sichtbarkeit ist nur Komfort.
 * - Backend-Routen und Schreibpfade müssen dieselben Capabilities prüfen.
 * - Lizenzverwaltung bleibt admin-only.
 * - Installer darf technische Funktionen nutzen, aber keine Lizenz ändern.
 * - Endkunde darf nur SmartHome, NexoLogik und Kundeneinstellungen nutzen.
 */
'use strict';

const ROLE_ADMIN = 'admin';
const ROLE_INSTALLER = 'installer';
const ROLE_CUSTOMER = 'customer';
const ROLE_DISPLAY = 'display';
const ROLE_NONE = 'none';

const DEFAULT_ADMIN_GROUPS = [
  'system.group.administrator',
  'system.group.eosAdmin',
  'system.group.nexowattAdmin',
];

const DEFAULT_INSTALLER_GROUPS = [
  // EOS nutzt unter der Oberfläche weiterhin die ioBroker-Gruppenstruktur.
  // Deshalb muss die bestehende Installer-Gruppe aus normalem Admin und EOS Admin
  // direkt als Installer-Rolle zählen. Die neuen EOS-/NexoWatt-Gruppen bleiben
  // zusätzliche Alias-Gruppen für neue Installationen.
  'system.group.installer',
  'system.group.eosInstaller',
  'system.group.nexowattInstaller',
];

const DEFAULT_CUSTOMER_GROUPS = [
  // system.group.user ist die bestehende Benutzergruppe aus normalem Admin/EOS Admin.
  // Sie wird als Endkundenrolle behandelt, nachdem Admin und Installer geprüft wurden.
  // So kann ein Installer, der zusätzlich in system.group.user liegt, nicht versehentlich
  // auf Customer heruntergestuft werden.
  'system.group.user',
  'system.group.eosUser',
  'system.group.nexowattUser',
];

const ROLE_CAPABILITIES = Object.freeze({
  [ROLE_ADMIN]: ['*', 'license.manage'],
  [ROLE_INSTALLER]: [
    'frontend.open',
    'appcenter.open',
    'simulation.open',
    'mapping.edit',
    'installer.config.read',
    'installer.config.write',
    'chargepoints.configure',
    'dcDisplay.configure',
    'mesh.configure',
    'mesh.operate',
    'exportGuard.configure',
    'storageFarm.configure',
    'smarthome.configure',
    'smarthome.configureCustomer',
    'nexologic.configure',
    'nexologic.configureCustomer',
    'diagnostics.open',
  ],
  [ROLE_CUSTOMER]: [
    'frontend.open',
    'smarthome.configureCustomer',
    'smarthome.control',
    'nexologic.configureCustomer',
    'energyWallet.customerSettings',
    'settings.customer.write',
  ],
  [ROLE_DISPLAY]: [
    'display.station.open',
    'display.station.command',
  ],
  [ROLE_NONE]: [],
});

function parseList(value, fallback) {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    const arr = value.split(',').map(v => v.trim()).filter(Boolean);
    if (arr.length) return arr;
  }
  return Array.isArray(fallback) ? fallback.slice() : [];
}

function uniqueList(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const s = String(value || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === ROLE_ADMIN) return ROLE_ADMIN;
  if (r === ROLE_INSTALLER) return ROLE_INSTALLER;
  if (r === ROLE_CUSTOMER || r === 'user' || r === 'benutzer' || r === 'kunde') return ROLE_CUSTOMER;
  if (r === ROLE_DISPLAY || r === 'kiosk') return ROLE_DISPLAY;
  return ROLE_NONE;
}

function normalizeAccessConfig(accessCfg, authCfg) {
  const access = accessCfg && typeof accessCfg === 'object' ? accessCfg : {};
  const auth = authCfg && typeof authCfg === 'object' ? authCfg : {};
  return {
    enabled: access.enabled !== false,
    defaultRole: normalizeRole(access.defaultRole || 'none'),
    // Admin-Fallback bleibt bewusst vorhanden, damit sich ein System nicht aussperrt.
    adminUsers: parseList(access.adminUsers, ['admin']),
    installerUsers: parseList(access.installerUsers, parseList(auth.installerUsers, ['installer'])),
    customerUsers: parseList(access.customerUsers, ['kunde', 'customer', 'user']),
    // Wichtig für Updates: Hat eine bestehende Installation bereits eigene Gruppen
    // gespeichert, würden neue Default-Gruppen sonst nicht greifen. Darum werden die
    // unverzichtbaren Kompatibilitätsgruppen aus normalem Admin/EOS Admin immer gemerged.
    adminGroups: uniqueList(parseList(access.adminGroups, DEFAULT_ADMIN_GROUPS).concat(['system.group.administrator'])),
    installerGroups: uniqueList(parseList(access.installerGroups, DEFAULT_INSTALLER_GROUPS).concat(['system.group.installer'])),
    customerGroups: uniqueList(parseList(access.customerGroups, DEFAULT_CUSTOMER_GROUPS).concat(['system.group.user'])),
    // Für spätere EOS-Admin-SSO-Integration vorbereitet. Ohne Secret bleibt die
    // normale Adapter-Login-/EOS-Benutzerprüfung die maßgebliche Quelle.
    trustedHeaderEnabled: access.trustedHeaderEnabled === true,
    trustedHeaderSecret: String(access.trustedHeaderSecret || '').trim(),
  };
}

function roleFromUserAndGroups(user, groups, config) {
  const u = String(user || '').trim();
  const groupSet = new Set((Array.isArray(groups) ? groups : []).map(g => String(g || '').trim()).filter(Boolean));
  if (!u) return normalizeRole(config.defaultRole);

  if ((config.adminUsers || []).includes(u)) return ROLE_ADMIN;
  for (const g of (config.adminGroups || [])) {
    if (groupSet.has(g)) return ROLE_ADMIN;
  }

  if ((config.installerUsers || []).includes(u)) return ROLE_INSTALLER;
  for (const g of (config.installerGroups || [])) {
    if (groupSet.has(g)) return ROLE_INSTALLER;
  }

  if ((config.customerUsers || []).includes(u)) return ROLE_CUSTOMER;
  for (const g of (config.customerGroups || [])) {
    if (groupSet.has(g)) return ROLE_CUSTOMER;
  }

  return normalizeRole(config.defaultRole);
}

function capabilitiesForRole(role) {
  const r = normalizeRole(role);
  return (ROLE_CAPABILITIES[r] || []).slice();
}

function can(roleOrAccess, capability) {
  const cap = String(capability || '').trim();
  if (!cap) return false;
  const role = typeof roleOrAccess === 'string'
    ? normalizeRole(roleOrAccess)
    : normalizeRole(roleOrAccess && roleOrAccess.role);
  const caps = typeof roleOrAccess === 'object' && Array.isArray(roleOrAccess.capabilities)
    ? roleOrAccess.capabilities
    : capabilitiesForRole(role);
  return caps.includes('*') || caps.includes(cap);
}

function buildAccessPayload(input) {
  const role = normalizeRole(input && input.role);
  const capabilities = capabilitiesForRole(role);
  return {
    ok: true,
    enabled: input && input.enabled !== false,
    user: String((input && input.user) || ''),
    role,
    roles: role === ROLE_NONE ? [] : [role],
    groups: Array.isArray(input && input.groups) ? input.groups : [],
    capabilities,
    isAdmin: role === ROLE_ADMIN,
    isInstaller: role === ROLE_ADMIN || role === ROLE_INSTALLER,
    isCustomer: role === ROLE_CUSTOMER,
    source: String((input && input.source) || 'unknown'),
  };
}

module.exports = {
  ROLE_ADMIN,
  ROLE_INSTALLER,
  ROLE_CUSTOMER,
  ROLE_DISPLAY,
  ROLE_NONE,
  DEFAULT_ADMIN_GROUPS,
  DEFAULT_INSTALLER_GROUPS,
  DEFAULT_CUSTOMER_GROUPS,
  ROLE_CAPABILITIES,
  parseList,
  uniqueList,
  normalizeRole,
  normalizeAccessConfig,
  roleFromUserAndGroups,
  capabilitiesForRole,
  can,
  buildAccessPayload,
};
