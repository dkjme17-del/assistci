// Les positions partagées sont temporaires : une seule position courante par participant.
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS request_live_locations (
      request_id INT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude NUMERIC(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (request_id, user_id)
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_live_locations_updated_at
    ON request_live_locations (updated_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS request_live_locations;');
};
