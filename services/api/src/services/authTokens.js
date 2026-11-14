const crypto = require('crypto');
const db = require('../config/db');
const { config } = require('../config/env');

const RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const EMAIL_TOKEN_TABLES = {
  password_reset: 'password_reset_tokens',
  email_verification: 'email_verification_tokens',
};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashOtp(userId, code) {
  return hashToken(`${userId}:${code}`);
}

function emailTokenTable(kind) {
  const table = EMAIL_TOKEN_TABLES[kind];
  if (!table) throw new Error(`Type de jeton inconnu : ${kind}`);
  return table;
}

async function createEmailToken(kind, userId, ttlMs) {
  const table = emailTokenTable(kind);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.query(
    `INSERT INTO ${table} (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt]
  );

  return token;
}

// Consomme un jeton à usage unique. Retourne l'utilisateur associé ou null.
async function consumeEmailToken(kind, token) {
  const table = emailTokenTable(kind);
  const result = await db.query(
    `UPDATE ${table}
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(token)]
  );

  return result.rows[0]?.user_id ?? null;
}

function createPasswordResetToken(userId) {
  return createEmailToken('password_reset', userId, RESET_TTL_MS);
}

function createEmailVerificationToken(userId) {
  return createEmailToken('email_verification', userId, EMAIL_VERIFICATION_TTL_MS);
}

async function createRefreshToken(userId, meta = {}) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashToken(token), expiresAt, meta.userAgent?.slice(0, 255) || null, meta.ip?.slice(0, 64) || null]
  );

  return token;
}

async function revokeRefreshToken(token) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hashToken(token)]
  );
}

async function revokeAllUserTokens(userId) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

// Rotation : l'ancien jeton est révoqué et un nouveau est émis.
// Détecte la réutilisation d'un jeton déjà révoqué et révoque toute la famille.
async function rotateRefreshToken(token, meta = {}) {
  const tokenHash = hashToken(token);
  const result = await db.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    const existing = await db.query(
      'SELECT user_id, revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    const row = existing.rows[0];
    if (row && row.revoked_at) {
      await revokeAllUserTokens(row.user_id);
    }
    return null;
  }

  const userId = result.rows[0].user_id;
  const newToken = await createRefreshToken(userId, meta);
  return { userId, token: newToken };
}

async function createPhoneOtp(userId, purpose = 'phone_verification') {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.query(
    `UPDATE phone_otp_codes
     SET consumed_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose]
  );

  await db.query(
    `INSERT INTO phone_otp_codes (user_id, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashOtp(userId, code), purpose, expiresAt]
  );

  return code;
}

async function verifyPhoneOtp(userId, code, purpose = 'phone_verification') {
  const result = await db.query(
    `SELECT id, code_hash, attempts
     FROM phone_otp_codes
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );

  const row = result.rows[0];
  if (!row) return { ok: false, reason: 'expired' };

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await db.query('UPDATE phone_otp_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (row.code_hash !== hashOtp(userId, code)) {
    await db.query('UPDATE phone_otp_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    return { ok: false, reason: 'invalid' };
  }

  await db.query('UPDATE phone_otp_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);
  return { ok: true };
}

module.exports = {
  RESET_TTL_MS,
  EMAIL_VERIFICATION_TTL_MS,
  OTP_TTL_MS,
  generateToken,
  hashToken,
  generateOtp,
  hashOtp,
  createPasswordResetToken,
  createEmailVerificationToken,
  consumeEmailToken,
  createRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  rotateRefreshToken,
  createPhoneOtp,
  verifyPhoneOtp,
};
