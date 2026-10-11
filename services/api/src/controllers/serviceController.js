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
    const { district, emergency_only } = req.query;

    let queryText = `
      SELECT 
        sp.id,
        sp.business_name,
        sp.bio,
        sp.rating,
        sp.total_reviews,
        sp.availability,
        sp.emergency_ready,
        sp.hourly_rate,
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
      LEFT JOIN service_areas sa ON sa.provider_id = sp.id
      WHERE u.is_active = true AND sp.availability = true
    `;

    const params = [];

    if (emergency_only === 'true') {
      params.push(true);
      queryText += ` AND sp.emergency_ready = $${params.length}`;
    }

    if (district) {
      params.push(`%${district}%`);
      queryText += ` AND sa.district ILIKE $${params.length}`;
    }

    queryText += ' ORDER BY sp.rating DESC, sp.completed_missions DESC LIMIT 50';

    const result = await db.query(queryText, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getProviders:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des prestataires' });
  }
}

module.exports = {
  getCategories,
  getProviders,
};

