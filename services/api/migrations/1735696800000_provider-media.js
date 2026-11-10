// Médias du prestataire : logo d'activité + galerie de réalisations.
// Idempotent : réutilisable sur les bases existantes.

exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);`);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS provider_photos (
      id SERIAL PRIMARY KEY,
      provider_id INT NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
      photo_url VARCHAR(500) NOT NULL,
      caption VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_provider_photos_provider ON provider_photos(provider_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS provider_photos;`);
  pgm.sql(`ALTER TABLE service_providers DROP COLUMN IF EXISTS logo_url;`);
};