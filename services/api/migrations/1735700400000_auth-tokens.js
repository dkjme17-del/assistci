// Jetons d'authentification : réinitialisation de mot de passe,
// vérification email, refresh tokens et codes OTP téléphone.
// Idempotent : réutilisable sur les bases existantes.

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);');

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);');

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE,
      user_agent VARCHAR(255),
      ip VARCHAR(64),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);');

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS phone_otp_codes (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash VARCHAR(64) NOT NULL,
      purpose VARCHAR(30) NOT NULL DEFAULT 'phone_verification',
      attempts INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      consumed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_phone_otp_user ON phone_otp_codes(user_id, purpose);');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS phone_otp_codes;');
  pgm.sql('DROP TABLE IF EXISTS refresh_tokens;');
  pgm.sql('DROP TABLE IF EXISTS email_verification_tokens;');
  pgm.sql('DROP TABLE IF EXISTS password_reset_tokens;');
};
