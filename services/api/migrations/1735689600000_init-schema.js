const fs = require('fs');
const path = require('path');

// Migration initiale : applique le schéma complet ASSISTCI (source unique :
// database/schema.sql à la racine du dépôt). Les scripts SQL sont idempotents
// (CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING).
exports.up = (pgm) => {
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS
      audit_logs,
      notifications,
      reviews,
      transactions,
      messages,
      request_proposals,
      request_media,
      service_requests,
      service_areas,
      service_providers,
      service_categories,
      kyc_documents,
      users
    CASCADE;
  `);
};
