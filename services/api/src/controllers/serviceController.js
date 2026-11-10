const db = require('../config/db');

async function getCategories(req, res) {
  try {
    const result = await db.query(
      'SELECT id, name, slug, description, icon_name FROM service_categories WHERE is_active = true ORDER BY id ASC'
    );
    return res.json(result.rows);
  } catch (error) {
    // Si la table n'existe pas encore ou en attente de DB, renvoyer les données par défaut de secours
    console.warn('Fallback catégories en mémoire (DB non joignable ou vide):', error.message);
    return res.json([
      { id: 1, name: 'Assistance Automobile', slug: 'auto', description: 'Dépannage, remorquage, batterie et pneu à Abidjan', icon_name: 'car' },
      { id: 2, name: 'Plomberie', slug: 'plomberie', description: 'Réparation et dépannage fuites d urgence', icon_name: 'wrench' },
      { id: 3, name: 'Électricité', slug: 'electricite', description: 'Court-circuit et dépannage électrique', icon_name: 'zap' }
    ]);
  }
}

async function getProviders(req, res) {
  try {
    const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { emergency_only, available_only } = req.query;
    const params = [];
    let areaCondition = '';

    if (district) {
      params.push(`%${district}%`);
      areaCondition = ` AND sa.district ILIKE $${params.length}`;
    }

    let queryText = `
      SELECT 
        sp.id,
        sp.business_name,
        sp.bio,
        sp.specialties,
        sp.rating,
        sp.total_reviews,
        sp.availability,
        sp.emergency_ready,
        sp.hourly_rate,
        sp.logo_url,
        u.first_name,
        u.last_name,
        u.phone,
        u.verification_status,
        sa.district,
        sa.city,
        sa.latitude,
        sa.longitude
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT sa.district, sa.city, sa.latitude, sa.longitude
        FROM service_areas sa
        WHERE sa.provider_id = sp.id${areaCondition}
        ORDER BY
          CASE WHEN sa.latitude IS NOT NULL AND sa.longitude IS NOT NULL THEN 0 ELSE 1 END,
          sa.id ASC
        LIMIT 1
      ) sa ON true
      WHERE u.is_active = true
    `;

    if (emergency_only === 'true') {
      params.push(true);
      queryText += ` AND sp.emergency_ready = $${params.length}`;
    }

    if (available_only === 'true') {
      params.push(true);
      queryText += ` AND sp.availability = $${params.length}`;
    }

    if (district) {
      queryText += ' AND sa.district IS NOT NULL';
    }

    if (query) {
      params.push(`%${query}%`);
      queryText += ` AND (
        COALESCE(sp.business_name, '') || ' ' ||
        COALESCE(sp.bio, '') || ' ' ||
        COALESCE(array_to_string(sp.specialties, ' '), '') || ' ' ||
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
      ) ILIKE $${params.length}`;
    }

    queryText += ' ORDER BY sp.rating DESC, sp.completed_missions DESC LIMIT 50';

    const result = await db.query(queryText, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getProviders:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des prestataires' });
  }
}

async function getProviderById(req, res) {
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ error: 'Identifiant prestataire invalide' });
    }

    const result = await db.query(
      `SELECT
        sp.id,
        sp.user_id,
        sp.business_name,
        sp.bio,
        sp.specialties,
        sp.rating,
        sp.total_reviews,
        sp.completed_missions,
        sp.availability,
        sp.emergency_ready,
        sp.hourly_rate,
        sp.logo_url,
        sp.created_at,
        u.first_name,
        u.last_name,
        u.phone,
        u.phone_verified,
        u.verification_status,
        sa.district,
        sa.city,
        sa.latitude,
        sa.longitude,
        sa.radius_km,
        COALESCE(
          (SELECT COUNT(*) FROM kyc_documents k WHERE k.user_id = u.id AND k.status = 'approved'),
          0
        ) AS verified_documents
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM service_areas sa WHERE sa.provider_id = sp.id ORDER BY sa.id ASC LIMIT 1
      ) sa ON true
      WHERE sp.id = $1 AND u.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prestataire introuvable' });
    }

    const photosRes = await db.query(
      'SELECT id, photo_url, caption, created_at FROM provider_photos WHERE provider_id = $1 ORDER BY created_at DESC',
      [id]
    );

    return res.json({ ...result.rows[0], photos: photosRes.rows });
  } catch (error) {
    console.error('Erreur getProviderById:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du prestataire' });
  }
}

module.exports = {
  getCategories,
  getProviders,
  getProviderById,
};
