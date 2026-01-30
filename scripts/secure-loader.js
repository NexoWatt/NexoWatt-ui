'use strict';

// NexoWatt SecurePack Loader (IP protection layer)
// NOTE: This is NOT cryptographic security (key is shipped with the app).
// It is meant to reduce casual readability / quick copy-paste of proprietary logic.

const crypto = require('crypto');
const vm = require('vm');
const Module = require('module');
const path = require('path');

// Derive a stable 32-byte key (AES-256) from a constant seed.
const _SEED = 'NexoWattSecurePack::v1::2026-01-30';
const _KEY = crypto.createHash('sha256').update(_SEED, 'utf8').digest(); // 32 bytes

function _decryptBase64(blobB64) {
  const buf = Buffer.from(blobB64, 'base64');
  // Layout: [12 bytes IV][ciphertext...][16 bytes GCM tag]
  const iv = buf.subarray(0, 12);
  const body = buf.subarray(12);
  const tag = body.subarray(body.length - 16);
  const ciphertext = body.subarray(0, body.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', _KEY, iv);
  decipher.setAuthTag(tag);

  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString('utf8');
}

function load(module, filename, blobB64) {
  const code = _decryptBase64(blobB64);

  const wrapper = Module.wrap(code);
  const script = new vm.Script(wrapper, { filename });
  const func = script.runInThisContext();

  // Use module.require to preserve relative require() behaviour
  func(module.exports, module.require.bind(module), module, filename, path.dirname(filename));
}

module.exports = { load };
