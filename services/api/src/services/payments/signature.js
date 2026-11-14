const crypto = require('crypto');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Signature générique : HMAC-SHA256 hexadécimal du corps brut.
function verifyHmacSignature(rawBody, secret, signature) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

// Signature Wave : en-tête `Wave-Signature: t=timestamp,v1=signature`.
// La signature porte sur `${timestamp}.${corps brut}` et expire après 5 minutes.
function verifyWaveSignature(rawBody, header, secret, toleranceSeconds = 300) {
  if (!secret || !header) return false;

  const parts = {};
  for (const part of String(header).split(',')) {
    const index = part.indexOf('=');
    if (index > 0) parts[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex');

  return safeEqual(expected, parts.v1);
}

module.exports = { safeEqual, verifyHmacSignature, verifyWaveSignature };
