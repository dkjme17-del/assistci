const db = require('../config/db');
const aiService = require('../services/aiService');

async function createRequest(req, res) {
  try {
    const clientId = req.user.userId;
    let {
      category_id,
      title,
      description,
      breakdown_type,
      vehicle_type,
      vehicle_brand,
      address_text,
      location_type,
      highway_axis,
      highway_milestone,
      city,
      district,
      latitude,
      longitude,
      urgency,
      media,
    } = req.body;

    if (!category_id || !title || !description) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'La catégorie, le titre et la description sont obligatoires',
      });
    }

    // Enrichissement automatique via le microservice IA (analyse en langage naturel)
    const analysis = await aiService.analyzeRequest(description, district);
    if (analysis) {
      const isAutomotive = analysis.is_automotive !== false && analysis.service_category !== 'other';
      if (isAutomotive) {
        if (!breakdown_type || breakdown_type === 'other') breakdown_type = analysis.breakdown_type;
        if (!location_type) location_type = analysis.location_type || 'city';
        if (!highway_axis && analysis.highway_axis) highway_axis = analysis.highway_axis;
        if (!highway_milestone && analysis.highway_milestone) highway_milestone = analysis.highway_milestone;
        if (!vehicle_brand && analysis.detected_brand) vehicle_brand = analysis.detected_brand;
        if (!urgency) urgency = analysis.urgency;

        if (analysis.location_type === 'highway') {
          if ((!city || city === 'Abidjan') && analysis.detected_city) city = analysis.detected_city;
          if ((!district || /autoroute|axe routier/i.test(district)) && analysis.detected_district) {
            district = analysis.detected_district;
          }
        }
      }
      if (!district && analysis.detected_district) district = analysis.detected_district;
    }

    city = city || 'Abidjan';

    const result = await db.query(
      `INSERT INTO service_requests (
        client_id, category_id, title, description,
        breakdown_type, vehicle_type, vehicle_brand,
        address_text, location_type, highway_axis, highway_milestone,
        city, district, latitude, longitude, urgency, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'created')
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
        location_type || 'city',
        highway_axis || null,
        highway_milestone || null,
        city,
        district || null,
        latitude || null,
        longitude || null,
        urgency || 'normal',
      ]
    );

    const newRequest = result.rows[0];

    // Photos jointes à la demande (URLs déjà téléversées via /api/uploads)
    if (Array.isArray(media) && media.length > 0) {
      for (const item of media.slice(0, 8)) {
        const url = typeof item === 'string' ? item : item?.url;
        const type = typeof item === 'string' ? 'image' : item?.type || 'image';
        if (url) {
          await db.query(
            'INSERT INTO request_media (request_id, media_url, media_type) VALUES ($1, $2, $3)',
            [newRequest.id, url, type === 'video' ? 'video' : 'image']
          );
        }
      }
    }

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
      // Pour un prestataire : demandes assignées, ou demandes ouvertes couvertes par ses zones
      // (si le prestataire n'a défini aucune zone, il voit toutes les demandes ouvertes)
      result = await db.query(
        `SELECT sr.*, sc.name AS category_name, u.first_name AS client_first_name, u.phone AS client_phone
         FROM service_requests sr
         JOIN service_categories sc ON sr.category_id = sc.id
         JOIN users u ON sr.client_id = u.id
         WHERE sr.assigned_provider_id = (SELECT id FROM service_providers WHERE user_id = $1)
            OR (
              sr.status IN ('created', 'matching')
              AND (
                NOT EXISTS (
                  SELECT 1 FROM service_areas sa
                  WHERE sa.provider_id = (SELECT id FROM service_providers WHERE user_id = $1)
                )
                OR sr.district IN (
                  SELECT sa.district FROM service_areas sa
                  WHERE sa.provider_id = (SELECT id FROM service_providers WHERE user_id = $1)
                    AND sa.district IS NOT NULL
                )
                OR sr.city IN (
                  SELECT sa.city FROM service_areas sa
                  WHERE sa.provider_id = (SELECT id FROM service_providers WHERE user_id = $1)
                    AND sa.city IS NOT NULL
                )
              )
            )
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

// Ajoute une photo à une demande existante (propriétaire client)
async function addRequestMedia(req, res) {
  try {
    const clientId = req.user.userId;
    const { id } = req.params;
    const { media_url, media_type } = req.body;

    if (!media_url) {
      return res.status(400).json({ error: 'L’URL du média est requise' });
    }

    const ownerRes = await db.query('SELECT client_id FROM service_requests WHERE id = $1', [id]);
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    if (ownerRes.rows[0].client_id !== clientId) {
      return res.status(403).json({ error: 'Action non autorisée' });
    }

    const mediaCountRes = await db.query(
      'SELECT COUNT(*) FROM request_media WHERE request_id = $1',
      [id]
    );
    if (parseInt(mediaCountRes.rows[0].count, 10) >= 8) {
      return res.status(400).json({ error: 'Une demande peut contenir jusqu’à 8 photos' });
    }

    const result = await db.query(
      `INSERT INTO request_media (request_id, media_url, media_type)
       VALUES ($1, $2, $3) RETURNING id, media_url, media_type, created_at`,
      [id, media_url, media_type === 'video' ? 'video' : 'image']
    );

    return res.status(201).json({ message: 'Photo ajoutée', media: result.rows[0] });
  } catch (error) {
    console.error('Erreur addRequestMedia:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Supprime une photo d'une demande (propriétaire client)
async function deleteRequestMedia(req, res) {
  try {
    const clientId = req.user.userId;
    const { id, mediaId } = req.params;

    const result = await db.query(
      `DELETE FROM request_media rm
       USING service_requests sr
       WHERE rm.request_id = sr.id AND sr.client_id = $1 AND rm.request_id = $2 AND rm.id = $3
       RETURNING rm.id`,
      [clientId, id, mediaId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Média introuvable' });
    }

    return res.json({ message: 'Média supprimé' });
  } catch (error) {
    console.error('Erreur deleteRequestMedia:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  addRequestMedia,
  deleteRequestMedia,
};

