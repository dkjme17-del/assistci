const db = require('../config/db');

// Le client laisse un avis sur une intervention terminée
async function createReview(req, res) {
  try {
    const clientId = req.user.userId;
    const { request_id, rating, comment, punctuality_rating, quality_rating } = req.body;

    if (!request_id || !rating) {
      return res.status(400).json({ error: 'La demande et la note (1 à 5) sont obligatoires' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5' });
    }

    const reqRes = await db.query(
      'SELECT id, client_id, assigned_provider_id, status FROM service_requests WHERE id = $1',
      [request_id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const serviceRequest = reqRes.rows[0];

    if (serviceRequest.client_id !== clientId) {
      return res.status(403).json({ error: 'Vous ne pouvez noter que vos propres demandes' });
    }

    if (serviceRequest.status !== 'completed') {
      return res.status(400).json({ error: 'La demande doit être terminée pour laisser un avis' });
    }

    if (!serviceRequest.assigned_provider_id) {
      return res.status(400).json({ error: 'Aucun prestataire assigné à cette demande' });
    }

    const existing = await db.query('SELECT id FROM reviews WHERE request_id = $1', [request_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Un avis a déjà été laissé pour cette demande' });
    }

    const insertRes = await db.query(
      `INSERT INTO reviews (request_id, client_id, provider_id, rating, comment, punctuality_rating, quality_rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        request_id,
        clientId,
        serviceRequest.assigned_provider_id,
        rating,
        comment || null,
        punctuality_rating || null,
        quality_rating || null,
      ]
    );

    // Recalcul de la note moyenne et du nombre d'avis du prestataire
    await db.query(
      `UPDATE service_providers sp
       SET rating = sub.avg_rating, total_reviews = sub.cnt, updated_at = NOW()
       FROM (
         SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*) AS cnt
         FROM reviews WHERE provider_id = $1
       ) sub
       WHERE sp.id = $1`,
      [serviceRequest.assigned_provider_id]
    );

    return res.status(201).json({
      message: 'Merci, votre avis a bien été enregistré',
      review: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Erreur createReview:', error);
    return res.status(500).json({ error: 'Erreur lors de l’enregistrement de l’avis' });
  }
}

// Liste des avis d'un prestataire
async function getProviderReviews(req, res) {
  try {
    const { providerId } = req.params;
    const result = await db.query(
      `SELECT r.id, r.rating, r.comment, r.punctuality_rating, r.quality_rating, r.created_at,
              u.first_name AS client_first_name
       FROM reviews r
       JOIN users u ON r.client_id = u.id
       WHERE r.provider_id = $1 AND r.is_reported = false
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [providerId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getProviderReviews:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
}

// Liste des avis laissés par le client connecté
async function getMyReviews(req, res) {
  try {
    const clientId = req.user.userId;
    const result = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              sp.id AS provider_id, sp.business_name,
              sr.id AS request_id, sr.title AS request_title
       FROM reviews r
       JOIN service_providers sp ON r.provider_id = sp.id
       JOIN service_requests sr ON r.request_id = sr.id
       WHERE r.client_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [clientId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getMyReviews:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de vos avis' });
  }
}

module.exports = {
  createReview,
  getProviderReviews,
  getMyReviews,
};
