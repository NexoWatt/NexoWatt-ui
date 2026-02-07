#!/usr/bin/env node

/**
 * NexoWatt License Generator (internal helper)
 *
 * Usage:
 *   node scripts/gen-license.js <ioBroker-UUID>
 *
 * Example:
 *   node scripts/gen-license.js 3f5b0f3b-....
 */

const crypto = require('crypto');

// IMPORTANT: Must match the secret in main.js (_nwExpectedLicenseKey).
// Keep this stable across releases.
const secret = 'nw_lis_salt_v1 change me';

const uuid = (process.argv.slice(2).join(' ') || '').trim();

if (!uuid) {
  console.error('Usage: node scripts/gen-license.js <ioBroker-UUID>');
  process.exit(1);
}

const hex = crypto
  .createHmac('sha256', secret)
  .update(String(uuid).trim())
  .digest('hex')
  .toUpperCase();

const core = hex.slice(0, 32);
const groups = core.match(/.{1,4}/g) || [core];
const key = `NW1-${groups.join('-')}`;

console.log(key);
