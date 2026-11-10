const path = require('path');
const { z } = require('zod');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_JWT_SECRET = 'super_secret_assistci_jwt_key_2026_change_in_production';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4001),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

    PGHOST: z.string().default('localhost'),
    PGPORT: z.coerce.number().int().positive().default(5432),
    PGDATABASE: z.string().default('assistci_db'),
    PGUSER: z.string().default('postgres'),
    PGPASSWORD: z.string().default('postgres'),
    PGSSL: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    FILE_UPLOADS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),

    // Alternative : chaîne de connexion complète (ex. Neon). Prioritaire sur PGHOST/PGUSER/…
    // Chaîne vide (= non fournie) autorisée afin de rester compatible Docker Compose.
    DATABASE_URL: z.union([z.string().url(), z.literal('')]).optional(),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET doit contenir au moins 16 caractères'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    CORS_ORIGINS: z.string().default('http://localhost:3001'),

    AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      if (val.JWT_SECRET === DEFAULT_JWT_SECRET || val.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message:
            'En production, JWT_SECRET doit être une valeur unique d’au moins 32 caractères (ne pas laisser la valeur par défaut).',
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => ` - ${issue.path.join('.') || 'ENV'}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`Configuration d’environnement invalide :\n${details}`);
  process.exit(1);
}

const env = parsed.data;

function parseDatabaseUrl(url) {
  const u = new URL(url);
  const sslMode = u.searchParams.get('sslmode');
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full',
    connectionString: url,
  };
}

const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  logLevel: env.LOG_LEVEL || (env.NODE_ENV === 'development' ? 'debug' : 'info'),
  db: env.DATABASE_URL
    ? parseDatabaseUrl(env.DATABASE_URL)
    : {
        host: env.PGHOST,
        port: env.PGPORT,
        database: env.PGDATABASE,
        user: env.PGUSER,
        password: env.PGPASSWORD,
        ssl: env.PGSSL,
        connectionString: null,
      },
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  corsOrigins: env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  fileUploadsEnabled: env.FILE_UPLOADS_ENABLED,
  ai: {
    url: env.AI_SERVICE_URL.replace(/\/$/, ''),
    timeoutMs: env.AI_TIMEOUT_MS,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
};

module.exports = { config };
