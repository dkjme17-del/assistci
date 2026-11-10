const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const pinoHttp = require('pino-http');

const { config } = require('./config/env');
const logger = require('./config/logger');
const { pool } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const requestRoutes = require('./routes/requestRoutes');
const kycRoutes = require('./routes/kycRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const providerRoutes = require('./routes/providerRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { UPLOADS_DIR, ensureUploadDirs } = require('./config/uploads');
const { ensureKycUploadDir } = require('./config/kycStorage');

const app = express();

// Derrière un reverse proxy (Caddy/Nginx) : fait confiance à X-Forwarded-*
app.set('trust proxy', 1);

// Sécurité des en-têtes HTTP
// crossOriginResourcePolicy "cross-origin" : autorise l'app web (autre origine) à afficher les images /uploads
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Journalisation structurée avec identifiant de requête
app.use(
  pinoHttp({
    logger,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// CORS : liste blanche d'origines
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // clients mobiles / curl
      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

// Corps JSON limité
app.use(express.json({ limit: '1mb' }));

// Fichiers téléversés (avatars, logos, photos) servis en statique
ensureUploadDirs();
ensureKycUploadDir();
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', fallthrough: true }));

// Healthcheck (exclu du rate limiting)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const dbTest = await pool.query('SELECT 1 AS alive');
    if (dbTest.rows[0]?.alive === 1) dbStatus = 'connected';
  } catch (err) {
    dbStatus = `offline (${err.message})`;
  }

  res.json({
    status: 'ok',
    service: 'assistci-api',
    environment: config.nodeEnv,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting global sur l'API
if (!config.isTest) {
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Limite renforcée sur l'authentification (anti brute-force)
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.authMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Trop de tentatives', message: 'Veuillez réessayer dans quelques instants.' },
    })
  );
}

// Montage des routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/uploads', uploadRoutes);

// Route inexistante
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

// Gestion globale des erreurs
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  (req.log || logger)[status >= 500 ? 'error' : 'warn']({ err }, 'Erreur HTTP');

  res.status(status).json({
    error: status >= 500 ? 'Erreur interne du serveur' : 'Erreur de requête',
    message: status >= 500 && config.isProduction ? 'Une erreur est survenue' : err.message,
    requestId: req.id,
  });
});

let server;
if (require.main === module) {
  server = app.listen(config.port, () => {
    logger.info(`Serveur API ASSISTCI en écoute sur le port ${config.port} (${config.nodeEnv})`);
  });
}

// Arrêt gracieux (Docker / orchestrateurs)
function shutdown(signal) {
  logger.info(`Signal ${signal} reçu, arrêt en cours...`);
  if (server) {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
