export const LICENSE_SECRET = 'nw_lis_salt_v1 change me';

function rightRotate(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256(ascii) {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i;
  let j;

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = sha256.h = sha256.h || [];
  let k = sha256.k = sha256.k || [];
  let primeCounter = k[lengthProperty];
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) {
    ascii += '\x00';
  }

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) {
      throw new Error('SHA256 unterstützt nur Byte-Strings (0..255).');
    }
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }

  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] = i < 16
          ? w[i]
          : (w[i - 16] +
              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] +
              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
            0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [
        (temp1 + temp2) | 0,
        a,
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        e,
        hash[5],
        hash[6],
      ];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

function stringToBytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    out.push(str.charCodeAt(i) & 0xff);
  }
  return out;
}

function bytesToString(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

function hexToBytes(hex) {
  const out = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

function hexToByteString(hex) {
  return bytesToString(hexToBytes(hex));
}

function hmacSha256(key, msg) {
  const blockSize = 64;
  let keyBytes = stringToBytes(String(key || ''));
  if (keyBytes.length > blockSize) {
    keyBytes = hexToBytes(sha256(bytesToString(keyBytes)));
  }
  while (keyBytes.length < blockSize) {
    keyBytes.push(0);
  }

  const outerPad = keyBytes.map(byte => byte ^ 0x5c);
  const innerPad = keyBytes.map(byte => byte ^ 0x36);
  const innerHash = sha256(bytesToString(innerPad) + String(msg || ''));
  return sha256(bytesToString(outerPad) + hexToByteString(innerHash));
}

export function generateLicenseKey(uuid, secret = LICENSE_SECRET) {
  const normalizedUuid = String(uuid || '').trim();
  if (!normalizedUuid) {
    return '';
  }
  const hex = hmacSha256(secret, normalizedUuid).toUpperCase();
  const core = hex.slice(0, 32);
  const groups = core.match(/.{1,4}/g) || [core];
  return `NW1-${groups.join('-')}`;
}
