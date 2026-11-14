const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { config } = require('../config/env');

const DEFAULT_MESSAGE = {
  error: 'Trop de requêtes',
  message: 'Veuillez réessayer dans quelques instants.',
};

// Clé basée sur l'utilisateur authentifié, avec repli sur l'IP (IPv6-safe).
function userOrIpKey(req) {
  if (req.user && req.user.userId) return `user:${req.user.userId}`;
  return ipKeyGenerator(req.ip);
}

function createRateLimiter({ windowMs, max, message, keyGenerator }) {
  // Désactivé en environnement de test pour ne pas perturber la suite.
  if (config.isTest) {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || userOrIpKey,
    message: message || DEFAULT_MESSAGE,
  });
}

// Limite stricte pour les routes d'authentification (anti brute-force)
function authStrictLimiter() {
  return createRateLimiter({
    windowMs: config.rateLimit.strictWindowMs,
    max: config.rateLimit.strictMax,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: {
      error: 'Trop de tentatives',
      message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
    },
  });
}

const messageLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const requestCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
const proposalLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const transactionLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

// Réinitialisation de mot de passe : 5 demandes / 15 min par IP
const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: {
    error: 'Trop de demandes',
    message: 'Trop de demandes de réinitialisation. Réessayez dans quelques minutes.',
  },
});

// Rafraîchissement de session : 60 / 15 min par IP
const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 60,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// OTP téléphone : 5 codes / 15 min par utilisateur
const otpLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });

module.exports = {
  createRateLimiter,
  authStrictLimiter,
  messageLimiter,
  requestCreateLimiter,
  proposalLimiter,
  uploadLimiter,
  transactionLimiter,
  passwordResetLimiter,
  refreshLimiter,
  otpLimiter,
};
