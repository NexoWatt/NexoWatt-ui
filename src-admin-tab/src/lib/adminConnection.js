const ADAPTER_NAME = 'nexowatt-ui';
const DEFAULT_PORT = 8188;
const ADMIN_CALL_TIMEOUT_MS = 5000;
const RUNTIME_FETCH_TIMEOUT_MS = 3500;

function withTimeout(promise, ms, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label || 'Aufruf'} Timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function callbackPromise(fn, label, ms = ADMIN_CALL_TIMEOUT_MS) {
  return withTimeout(new Promise((resolve, reject) => {
    try {
      fn((err, value) => (err ? reject(err) : resolve(value || null)));
    } catch (error) {
      reject(error);
    }
  }), ms, label);
}

export function getInstance() {
  try {
    return new URLSearchParams(window.location.search || '').get('instance') || '0';
  } catch {
    return '0';
  }
}

export function getAdapterObjectId(instance = getInstance()) {
  return `system.adapter.${ADAPTER_NAME}.${instance}`;
}

export function buildRuntimeBaseUrl(port = DEFAULT_PORT) {
  const protocol = window.location.protocol || 'http:';
  const host = window.location.hostname || 'localhost';
  return `${protocol}//${host}:${port}`;
}

function safeWindowAccess(getter) {
  try {
    return getter();
  } catch {
    return null;
  }
}

function isErrorLike(value) {
  if (!value) return false;
  if (value instanceof Error) return true;
  if (typeof value === 'string') return true;
  if (typeof value !== 'object') return false;

  // ioBroker objects/states can contain "message" in common/native data.
  // Treat an object as error only if it does NOT look like a normal object/state.
  const looksLikeIoBrokerObject = value._id || value.type || value.common || value.native;
  const looksLikeState = Object.prototype.hasOwnProperty.call(value, 'val') || Object.prototype.hasOwnProperty.call(value, 'ack');
  if (looksLikeIoBrokerObject || looksLikeState) return false;

  return !!(value.error || value.err || value.message);
}

function normalizeIoBrokerCallback(cb) {
  return (arg1, arg2) => {
    // ioBroker admin APIs are inconsistent across versions:
    //   callback(obj) / callback(state)
    //   callback(err, obj) / callback(err, state)
    // Support both, otherwise the license page can hang or misread the UUID.
    if (arg2 !== undefined) {
      cb(isErrorLike(arg1) ? arg1 : null, arg2 || null);
      return;
    }
    if (isErrorLike(arg1)) {
      cb(arg1, null);
      return;
    }
    cb(null, arg1 || null);
  };
}

function pickServConn() {
  return (
    safeWindowAccess(() => window.servConn)
    || safeWindowAccess(() => window.parent && window.parent.servConn)
    || safeWindowAccess(() => window.top && window.top.servConn)
    || null
  );
}

function pickSocket() {
  return (
    safeWindowAccess(() => window.socket)
    || safeWindowAccess(() => window.parent && window.parent.socket)
    || safeWindowAccess(() => window.top && window.top.socket)
    || safeWindowAccess(() => window.__nwAdminSocket)
    || null
  );
}

async function ensureSocketIo() {
  if (window.io || pickSocket()) {
    return true;
  }

  if (typeof window.__nwSocketLoader === 'function') {
    try {
      await window.__nwSocketLoader();
    } catch {
      return false;
    }
  }

  return !!window.io || !!pickSocket();
}

function wrapServConn(servConn) {
  return {
    type: 'servConn',
    getObject(id, cb) {
      try {
        servConn.getObject(id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    getState(id, cb) {
      if (typeof servConn.getState !== 'function') {
        cb(null, null);
        return;
      }
      try {
        servConn.getState(id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    setObject(id, obj, cb) {
      try {
        servConn.setObject(id, obj, err => cb(err || null));
      } catch (error) {
        cb(error);
      }
    },
  };
}

function wrapSocket(socket) {
  return {
    type: 'socket',
    getObject(id, cb) {
      try {
        socket.emit('getObject', id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    getState(id, cb) {
      try {
        socket.emit('getState', id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    setObject(id, obj, cb) {
      try {
        socket.emit('setObject', id, obj, result => {
          if (!result || result === true) {
            cb(null);
            return;
          }
          if (typeof result === 'string') {
            cb(result);
            return;
          }
          if (typeof result === 'object' && result.error) {
            cb(result.error);
            return;
          }
          cb(null);
        });
      } catch (error) {
        cb(error);
      }
    },
  };
}

export async function getAdminConnection() {
  const servConn = pickServConn();
  if (servConn && typeof servConn.getObject === 'function' && typeof servConn.setObject === 'function') {
    return wrapServConn(servConn);
  }

  const socketAlreadyThere = pickSocket();
  if (socketAlreadyThere?.emit) {
    return wrapSocket(socketAlreadyThere);
  }

  const socketIoLoaded = await withTimeout(ensureSocketIo(), 3000, 'socket.io Laden');
  if (!socketIoLoaded) {
    return null;
  }

  let socket = pickSocket();
  if (!socket && window.io && typeof window.io.connect === 'function') {
    window.__nwAdminSocket = window.__nwAdminSocket || window.io.connect();
    socket = window.__nwAdminSocket;
  }

  if (socket?.emit) {
    return wrapSocket(socket);
  }

  return null;
}

export function extractUuid(obj) {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const seen = new Set();

  const scan = (value, key = '') => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') {
      const v = value.trim();
      if (!v) return '';
      if (/uuid/i.test(key) || uuidRe.test(v)) return v;
      return '';
    }
    if (typeof value !== 'object') return '';
    if (seen.has(value)) return '';
    seen.add(value);

    const preferredKeys = ['uuid', 'UUID', '_uuid', 'systemUuid', 'systemUUID', 'val', 'value'];
    for (const k of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        const found = scan(value[k], k);
        if (found) return found;
      }
    }
    for (const [k, v] of Object.entries(value)) {
      const found = scan(v, k);
      if (found) return found;
    }
    return '';
  };

  return scan(obj);
}

export async function getObject(id, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    throw new Error('Admin-Verbindung nicht verfügbar');
  }
  return callbackPromise(cb => resolvedConn.getObject(id, cb), `getObject ${id}`);
}

export async function getState(id, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn || typeof resolvedConn.getState !== 'function') {
    return null;
  }
  return callbackPromise(cb => resolvedConn.getState(id, cb), `getState ${id}`);
}

export async function setObject(id, obj, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    throw new Error('Admin-Verbindung nicht verfügbar');
  }
  await callbackPromise(cb => resolvedConn.setObject(id, obj, cb), `setObject ${id}`);
}

export async function readAdapterPort(instance = getInstance(), conn = null) {
  try {
    const adapterObj = await getObject(getAdapterObjectId(instance), conn);
    const port = Number(adapterObj?.native?.port);
    return Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

export async function readSystemUuid(conn = null, instance = getInstance()) {
  const adapterBase = `${ADAPTER_NAME}.${instance}.license.uuid`;

  try {
    const metaObject = await getObject('system.meta.uuid', conn);
    const fromObject = extractUuid(metaObject);
    if (fromObject) return String(fromObject).trim();
  } catch {
    // ignore and continue with state fallback
  }

  try {
    const state = await getState('system.meta.uuid', conn);
    if (state?.val !== undefined && state?.val !== null && String(state.val).trim()) {
      return String(state.val).trim();
    }
  } catch {
    // ignore and continue with system.config fallback
  }

  try {
    const systemConfig = await getObject('system.config', conn);
    const nativeUuid = systemConfig?.native?.uuid || systemConfig?.native?.UUID || systemConfig?.common?.uuid || systemConfig?.common?.UUID;
    if (nativeUuid) return String(nativeUuid).trim();
  } catch {
    // ignore and continue with adapter-published fallback
  }

  try {
    const adapterUuidState = await getState(adapterBase, conn);
    if (adapterUuidState?.val !== undefined && adapterUuidState?.val !== null && String(adapterUuidState.val).trim()) {
      return String(adapterUuidState.val).trim();
    }
  } catch {
    // ignore
  }

  return '';
}

async function fetchJsonWithTimeout(url, ms = RUNTIME_FETCH_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  try {
    if (controller) timer = setTimeout(() => controller.abort(), ms);
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function postJsonWithTimeout(url, payload, ms = RUNTIME_FETCH_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  try {
    if (controller) timer = setTimeout(() => controller.abort(), ms);
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false) {
      throw new Error(json?.message || `HTTP ${response.status}`);
    }
    return json;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function readRuntimeLicenseInfo(instance = getInstance(), conn = null) {
  const ports = [];
  try {
    const configuredPort = await readAdapterPort(instance, conn);
    if (configuredPort) ports.push(configuredPort);
  } catch {
    // ignore
  }
  ports.push(DEFAULT_PORT);

  const uniquePorts = ports.filter((port, idx, arr) => port && arr.indexOf(port) === idx);
  let lastError = null;
  for (const port of uniquePorts) {
    try {
      const info = await fetchJsonWithTimeout(`${buildRuntimeBaseUrl(port)}/api/license/info?instance=${encodeURIComponent(instance)}&t=${Date.now()}`);
      if (info && typeof info === 'object') return info;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

export async function saveRuntimeLicenseKey(instance = getInstance(), licenseKey = '', conn = null) {
  const ports = [];
  try {
    const configuredPort = await readAdapterPort(instance, conn);
    if (configuredPort) ports.push(configuredPort);
  } catch {
    // ignore
  }
  ports.push(DEFAULT_PORT);

  const uniquePorts = ports.filter((port, idx, arr) => port && arr.indexOf(port) === idx);
  let lastError = null;
  for (const port of uniquePorts) {
    try {
      const info = await postJsonWithTimeout(
        `${buildRuntimeBaseUrl(port)}/api/license/save?instance=${encodeURIComponent(instance)}&t=${Date.now()}`,
        { licenseKey: String(licenseKey || '').trim() },
        5000
      );
      if (info && typeof info === 'object') return info;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

export async function readLicenseStatus(instance = getInstance(), conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    return {
      ok: false,
      text: 'Admin-Verbindung nicht verfügbar.',
    };
  }

  const base = `${ADAPTER_NAME}.${instance}.license.`;
  try {
    const [validState, typeState, messageState, daysState, expiresState] = await Promise.all([
      getState(`${base}valid`, resolvedConn),
      getState(`${base}type`, resolvedConn),
      getState(`${base}message`, resolvedConn),
      getState(`${base}daysRemaining`, resolvedConn),
      getState(`${base}expiresAt`, resolvedConn),
    ]);

    const valid = validState?.val === true;
    const type = typeState?.val !== undefined ? String(typeState.val) : '';
    const message = messageState?.val !== undefined ? String(messageState.val) : '';
    const daysRemaining = daysState?.val !== undefined ? Number(daysState.val) || 0 : 0;
    const expiresAt = expiresState?.val !== undefined ? Number(expiresState.val) || 0 : 0;

    if (type === 'trial') {
      const active = valid && daysRemaining > 0;
      let text = active
        ? `Lizenzstatus: Testlizenz aktiv – noch ${daysRemaining} Tage ✅`
        : 'Lizenzstatus: Testlizenz abgelaufen ❌';
      if (expiresAt) {
        try {
          text += ` (bis ${new Date(expiresAt).toLocaleDateString()})`;
        } catch {
          // ignore date formatting errors
        }
      }
      return { ok: active, text };
    }

    if (valid) {
      return { ok: true, text: 'Lizenzstatus: gültig ✅' };
    }

    return {
      ok: false,
      text: `Lizenzstatus: ${message || 'gesperrt/ungültig'} ❌`,
    };
  } catch {
    return { ok: true, text: 'Lizenzstatus konnte nicht gelesen werden. Adapter evtl. noch nicht gestartet.' };
  }
}

export function openExternal(url) {
  try {
    window.top.location.href = url;
  } catch {
    window.location.href = url;
  }
}
