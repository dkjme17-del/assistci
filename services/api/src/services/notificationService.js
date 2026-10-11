const db = require('../config/db');

// Crée une notification in-app sans jamais faire échouer l'appel métier appelant
async function notify({ userId, title, message, type, link = null, metadata = null }) {
  if (!userId) return null;
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, title, message, type, link, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0];
  } catch (error) {
    console.warn('Échec de création de notification:', error.message);
    return null;
  }
}

module.exports = { notify };
