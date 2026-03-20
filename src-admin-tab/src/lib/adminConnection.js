const ADAPTER_NAME = 'nexowatt-ui';
const DEFAULT_PORT = 8188;

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
        servConn.getObject(id, (err, obj) => cb(err || null, obj || null));
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
        servConn.getState(id, (err, state) => cb(err || null, state || null));
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
        socket.emit('getObject', id, (arg1, arg2) => {
          const obj = arg2 !== undefined ? arg2 : arg1;
          const err = arg2 !== undefined ? arg1 : null;
          cb(err || null, obj || null);
        });
      } catch (error) {
        cb(error, null);
      }
    },
    getState(id, cb) {
      try {
        socket.emit('getState', id, (arg1, arg2) => {
          const state = arg2 !== undefined ? arg2 : arg1;
          const err = arg2 !== undefined ? arg1 : null;
          cb(err || null, state || null);
        });
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

  const socketIoLoaded = await ensureSocketIo();
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
  if (!obj) {
    return '';
  }
  if (obj.native && typeof obj.native.uuid === 'string') return obj.native.uuid;
  if (obj.native && typeof obj.native.UUID === 'string') return obj.native.UUID;
  if (obj.common && typeof obj.common.uuid === 'string') return obj.common.uuid;
  if (obj.common && typeof obj.common.UUID === 'string') return obj.common.UUID;
  return '';
}

export async function getObject(id, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    throw new Error('Admin-Verbindung nicht verfügbar');
  }
  return new Promise((resolve, reject) => {
    resolvedConn.getObject(id, (err, obj) => (err ? reject(err) : resolve(obj || null)));
  });
}

export async function getState(id, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn || typeof resolvedConn.getState !== 'function') {
    return null;
  }
  return new Promise((resolve, reject) => {
    resolvedConn.getState(id, (err, state) => (err ? reject(err) : resolve(state || null)));
  });
}

export async function setObject(id, obj, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    throw new Error('Admin-Verbindung nicht verfügbar');
  }
  return new Promise((resolve, reject) => {
    resolvedConn.setObject(id, obj, err => (err ? reject(err) : resolve()));
  });
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

export async function readSystemUuid(conn = null) {
  try {
    const metaObject = await getObject('system.meta.uuid', conn);
    const fromObject = extractUuid(metaObject);
    if (fromObject) {
      return fromObject;
    }
  } catch {
    // ignore and continue with state fallback
  }

  try {
    const state = await getState('system.meta.uuid', conn);
    if (state?.val !== undefined && state?.val !== null) {
      return String(state.val);
    }
  } catch {
    // ignore and continue with adapter fallback
  }

  try {
    const systemConfig = await getObject('system.config', conn);
    const nativeUuid = systemConfig?.native?.uuid || systemConfig?.common?.uuid;
    return nativeUuid ? String(nativeUuid) : '';
  } catch {
    return '';
  }
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
