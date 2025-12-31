'use strict';

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

/**
 * Create a deterministic JSON string for signing/verifying.
 * - Sorts object keys recursively
 * - Preserves array order
 */
function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortDeep);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      const v = value[k];
      if (v === undefined) continue;
      out[k] = sortDeep(v);
    }
    return out;
  }
  return value;
}

function readTextIfExists(p) {
  try {
    if (!p) return '';
    const raw = fs.readFileSync(p, 'utf8');
    return String(raw || '').trim();
  } catch (_e) {
    return '';
  }
}

/**
 * Returns a stable device id for offline licensing.
 * Preferred: machine-id (Linux). Fallback: MAC address. Last resort: hostname.
 */
function getDeviceId() {
  const machineId = (
    readTextIfExists('/etc/machine-id') ||
    readTextIfExists('/var/lib/dbus/machine-id')
  ).replace(/\s+/g, '').trim();

  if (machineId) return `machine-id:${machineId}`;

  try {
    const ifs = os.networkInterfaces();
    for (const name of Object.keys(ifs || {})) {
      const arr = ifs[name] || [];
      for (const it of arr) {
        if (!it || it.internal) continue;
        const mac = String(it.mac || '').toLowerCase();
        if (mac && mac !== '00:00:00:00:00:00') return `mac:${mac}`;
      }
    }
  } catch (_e) {
    // ignore
  }
  return `host:${os.hostname()}`;
}

function parseLicenseInput(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // JSON inline
  if (s.startsWith('{') && s.endsWith('}')) {
    try { return JSON.parse(s); } catch (_e) { return null; }
  }

  // base64 encoded json
  try {
    const json = Buffer.from(s, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (_e2) {
    return null;
  }
}

function loadLicenseFromFile(filePath) {
  try {
    const p = String(filePath || '').trim();
    if (!p) return null;
    const raw = fs.readFileSync(p, 'utf8');
    const txt = String(raw || '').trim();
    if (!txt) return null;
    return parseLicenseInput(txt) || JSON.parse(txt);
  } catch (_e) {
    return null;
  }
}

function toIsoDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function verifyEd25519(publicKeyPem, message, signatureB64) {
  try {
    const sig = Buffer.from(String(signatureB64 || ''), 'base64');
    if (!sig.length) return false;
    const msg = Buffer.from(String(message || ''), 'utf8');
    return crypto.verify(null, msg, publicKeyPem, sig);
  } catch (_e) {
    return false;
  }
}

/**
 * Verifies a license object and returns a normalized status.
 */
function validateLicense({
  licenseObj,
  deviceId,
  publicKeyPem,
  expectedProduct,
}) {
  const now = Date.now();
  const out = {
    valid: false,
    status: 'missing',
    reason: 'missing',
    deviceId: deviceId || '',
    product: expectedProduct || '',
    serial: '',
    issuedTo: '',
    issuedAt: '',
    notBefore: '',
    expiresAt: '',
    features: {},
    lastCheck: now,
  };

  if (!licenseObj || typeof licenseObj !== 'object') {
    return out;
  }

  // Basic fields
  const product = String(licenseObj.product || '').trim();
  const device = String(licenseObj.deviceId || '').trim();
  const signature = String(licenseObj.signature || '').trim();
  out.serial = String(licenseObj.serial || '').trim();
  out.issuedTo = String(licenseObj.issuedTo || '').trim();
  out.issuedAt = toIsoDate(licenseObj.issuedAt) || '';
  out.notBefore = toIsoDate(licenseObj.notBefore) || '';
  out.expiresAt = toIsoDate(licenseObj.expiresAt) || '';
  out.features = (licenseObj.features && typeof licenseObj.features === 'object') ? licenseObj.features : {};

  if (!product || product !== expectedProduct) {
    out.status = 'invalid';
    out.reason = 'product_mismatch';
    out.product = product;
    return out;
  }

  out.product = product;

  if (!device || device !== deviceId) {
    out.status = 'invalid';
    out.reason = 'device_mismatch';
    return out;
  }

  if (!signature) {
    out.status = 'invalid';
    out.reason = 'missing_signature';
    return out;
  }

  // Time window
  if (out.notBefore) {
    const nb = new Date(out.notBefore).getTime();
    if (Number.isFinite(nb) && now < nb) {
      out.status = 'invalid';
      out.reason = 'not_yet_valid';
      return out;
    }
  }
  if (out.expiresAt) {
    const ex = new Date(out.expiresAt).getTime();
    if (Number.isFinite(ex) && now > ex) {
      out.status = 'invalid';
      out.reason = 'expired';
      return out;
    }
  }

  // Verify signature over the payload (license without signature)
  const payload = { ...licenseObj };
  delete payload.signature;
  const msg = stableStringify(payload);
  const ok = verifyEd25519(publicKeyPem, msg, signature);
  if (!ok) {
    out.status = 'invalid';
    out.reason = 'invalid_signature';
    return out;
  }

  out.valid = true;
  out.status = 'valid';
  out.reason = 'ok';
  return out;
}

module.exports = {
  stableStringify,
  getDeviceId,
  parseLicenseInput,
  loadLicenseFromFile,
  validateLicense,
};
