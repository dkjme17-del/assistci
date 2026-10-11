const { Pool } = require('pg');
const { config } = require('./env');
const logger = require('./logger');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Erreur inattendue sur un client PostgreSQL idle');
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (!config.isProduction) {
    logger.debug({ durationMs: duration, query: text.slice(0, 80) }, 'SQL query');
  }
  return res;
}

module.exports = {
  pool,
  query,
};
