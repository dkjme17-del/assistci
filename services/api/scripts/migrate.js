#!/usr/bin/env node
// Wrapper autour de node-pg-migrate : construit DATABASE_URL depuis la config
// d'environnement validée (voir src/config/env.js) puis délègue la commande.
const { execFileSync } = require('child_process');
const { config } = require('../src/config/env');

const databaseUrl =
  config.db.connectionString ||
  `postgresql://${encodeURIComponent(config.db.user)}:${encodeURIComponent(config.db.password)}` +
    `@${config.db.host}:${config.db.port}/${config.db.database}`;

const cli = require.resolve('node-pg-migrate/bin/node-pg-migrate');
const args = process.argv.slice(2);

try {
  execFileSync(process.execPath, [cli, ...args], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
} catch (error) {
  process.exit(error.status || 1);
}
