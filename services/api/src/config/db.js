const { Pool } = require('pg');
const { config } = require('./env');
const logger = require('./logger');

// Neon (et les proxies type PgBouncer) ferme les connexions inactives : on garde
// la socket active et on recycle les clients plus tôt pour éviter de récupérer
// un client mort depuis le pool.
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Erreur inattendue sur un client PostgreSQL idle');
});

const RETRYABLE_DB_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '57P01',
  '57P02',
  '57P03',
]);

function isRetryableConnectionError(err) {
  if (!err) return false;
  if (RETRYABLE_DB_CODES.has(err.code)) return true;
  return /connection terminated|connection timeout|terminating connection|server closed the connection/i.test(
    String(err.message || '')
  );
}

async function query(text, params, options = {}) {
  const retries = Number.isInteger(options.retries) ? options.retries : 0;
  let attempt = 0;

  for (;;) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (!config.isProduction) {
        logger.debug({ durationMs: duration, query: text.slice(0, 80) }, 'SQL query');
      }
      return res;
    } catch (err) {
      if (attempt >= retries || !isRetryableConnectionError(err)) throw err;
      attempt += 1;
      logger.warn({ err, attempt }, 'Connexion PostgreSQL interrompue, nouvelle tentative');
    }
  }
}

module.exports = {
  pool,
  query,
};
