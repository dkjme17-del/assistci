const { config } = require('../config/env');

// Suivi en mémoire des échecs de connexion.
// Note : suffisant pour une instance unique ; à déplacer vers Redis
// ou une table dédiée en cas de déploiement multi-instances.
const attempts = new Map();

const MAX_ATTEMPTS = config.loginLock.maxAttempts;
const LOCK_MS = config.loginLock.lockMinutes * 60_000;
const WINDOW_MS = LOCK_MS;

function normalize(login) {
  return String(login || '').trim().toLowerCase();
}

function cleanup(entry, now) {
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    return { count: 0, firstAt: now, lockedUntil: 0 };
  }
  if (!entry.lockedUntil && now - entry.firstAt > WINDOW_MS) {
    return { count: 0, firstAt: now, lockedUntil: 0 };
  }
  return entry;
}

function getLockSeconds(login) {
  const key = normalize(login);
  const entry = attempts.get(key);
  if (!entry) return 0;

  const now = Date.now();
  const cleaned = cleanup(entry, now);
  if (cleaned.count === 0) {
    attempts.delete(key);
    return 0;
  }
  attempts.set(key, cleaned);

  if (cleaned.lockedUntil > now) {
    return Math.ceil((cleaned.lockedUntil - now) / 1000);
  }
  return 0;
}

function recordFailure(login) {
  const key = normalize(login);
  const now = Date.now();
  const entry = cleanup(attempts.get(key) || { count: 0, firstAt: now, lockedUntil: 0 }, now);

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
  attempts.set(key, entry);
  return entry;
}

function clearFailures(login) {
  attempts.delete(normalize(login));
}

function resetAll() {
  attempts.clear();
}

module.exports = {
  getLockSeconds,
  recordFailure,
  clearFailures,
  resetAll,
};
