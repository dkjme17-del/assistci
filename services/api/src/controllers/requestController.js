const db = require('../config/db');

async function createRequest(req, res) {
  try {
    const clientId = req.user.userId;
    const {
      category_id,
      title,
      description,
      breakdown_type,
      vehicle_type,
      vehicle_brand,
      address_text,
      city = 'Abidjan',
      district,
      latitude,
      longitude,
      urgency = 'normal',
    } = req.body;

    if (!category_id || !title || !description) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'La catégorie, le titre et la description sont obligatoires',
      });
    }

    const result = await db.query(
      `INSERT INTO service_requests (
        client_id, category_id, title, description,
        breakdown_type, vehicle_type, vehicle_brand,
        address_text, city, district, latitude, longitude, urgency, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'created')
      RETURNING *`,
      [
        clientId,
        category_id,
        title,
        description,
        breakdown_type || 'other',
        vehicle_type || null,
        vehicle_brand || null,
        address_text || null,
        city,
        district || null,
        latitude || null,
        longitude || null,
        urgency,
      ]
    );

    const newRequest = result.rows[0];

    return res.status(201).json({
      message: 'Demande d’assistance créée avec succès',
      request: newRequest,
    });
  } catch (error) {
    console.error('Erreur createRequest:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message || 'Impossible de créer la demande d’intervention',
    });
  }
}

async function getMyRequests(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let result;
    if (role === 'client') {
      result = await db.query(
        `SELECT sr.*, sc.name AS category_name
         FROM service_requests sr
         JOIN service_categories sc ON sr.category_id = sc.id
         WHERE sr.client_id = $1
         ORDER BY sr.created_at DESC`,
        [userId]
      );
    } else if (role === 'provider') {
      // Pour un prestataire : demandes assignées ou en attente dans sa zone
      result = await db.query(
        `SELECT sr.*, sc.name AS category_name, u.first_name AS client_first_name, u.phone AS client_phone
         FROM service_requests sr
         JOIN service_categories sc ON sr.category_id = sc.id
         JOIN users u ON sr.client_id = u.id
         WHERE sr.assigned_provider_id = (SELECT id FROM service_providers WHERE user_id = $1)
            OR sr.status IN ('created', 'matching')
         ORDER BY sr.created_at DESC
         LIMIT 50`,
        [userId]
      );
    } else {
      // Admin
      result = await db.query(
        `SELECT sr.*, sc.name AS category_name, u.first_name AS client_first_name, u.last_name AS client_last_name
         FROM service_requests sr
         JOIN service_categories sc ON sr.category_id = sc.id
         JOIN users u ON sr.client_id = u.id
         ORDER BY sr.created_at DESC
         LIMIT 100`
      );
    }

    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getMyRequests:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des demandes' });
  }
}

async function getRequestById(req, res) {
  try {
    const { id } = req.params;

    const requestRes = await db.query(
      `SELECT sr.*, sc.name AS category_name, u.first_name AS client_first_name, u.last_name AS client_last_name, u.phone AS client_phone
       FROM service_requests sr
       JOIN service_categories sc ON sr.category_id = sc.id
       JOIN users u ON sr.client_id = u.id
       WHERE sr.id = $1`,
      [id]
    );

    if (requestRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const serviceRequest = requestRes.rows[0];

    // Récupérer les propositions de devis associées
    const proposalsRes = await db.query(
      `SELECT rp.*, sp.business_name, sp.rating, u.first_name, u.phone
       FROM request_proposals rp
       JOIN service_providers sp ON rp.provider_id = sp.id
       JOIN users u ON sp.user_id = u.id
       WHERE rp.request_id = $1
       ORDER BY rp.created_at DESC`,
      [id]
    );

    // Récupérer les médias (photos)
    const mediaRes = await db.query(
      'SELECT id, media_url, media_type FROM request_media WHERE request_id = $1',
      [id]
    );

    return res.json({
      request: serviceRequest,
      proposals: proposalsRes.rows,
      media: mediaRes.rows,
    });
  } catch (error) {
    console.error('Erreur getRequestById:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
};

