const db = require('../config/db');

// Récupère le profil prestataire de l'utilisateur connecté (+ zones d'intervention)
async function getMyProvider(req, res) {
  try {
    const providerRes = await db.query(
      'SELECT * FROM service_providers WHERE user_id = $1',
      [req.user.userId]
    );

    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil prestataire introuvable' });
    }

    const provider = providerRes.rows[0];

    const areasRes = await db.query(
      'SELECT id, city, district, latitude, longitude, radius_km FROM service_areas WHERE provider_id = $1 ORDER BY id ASC',
      [provider.id]
    );

    const photosRes = await db.query(
      'SELECT id, photo_url, caption, created_at FROM provider_photos WHERE provider_id = $1 ORDER BY created_at DESC',
      [provider.id]
    );

    return res.json({ provider, areas: areasRes.rows, photos: photosRes.rows });
  } catch (error) {
    console.error('Erreur getMyProvider:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Met à jour les informations de l'activité du prestataire
async function updateMyProvider(req, res) {
  try {
    const { business_name, bio, specialties, hourly_rate, availability, emergency_ready, logo_url } = req.body;

    const providerRes = await db.query('SELECT id FROM service_providers WHERE user_id = $1', [
      req.user.userId,
    ]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil prestataire introuvable' });
    }

    // Normalise les spécialités (tableau de chaînes)
    let specs = null;
    if (Array.isArray(specialties)) {
      specs = specialties.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
    }

    let rate = null;
    if (hourly_rate !== undefined && hourly_rate !== null && hourly_rate !== '') {
      rate = Number(hourly_rate);
      if (Number.isNaN(rate) || rate < 0) {
        return res.status(400).json({ error: 'Tarif horaire invalide' });
      }
    }

    const result = await db.query(
      `UPDATE service_providers
       SET business_name = $1,
           bio = $2,
           specialties = $3,
           hourly_rate = $4,
           availability = COALESCE($5, availability),
           emergency_ready = COALESCE($6, emergency_ready),
           logo_url = $8,
           updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [
        business_name || null,
        bio || null,
        specs,
        rate,
        typeof availability === 'boolean' ? availability : null,
        typeof emergency_ready === 'boolean' ? emergency_ready : null,
        req.user.userId,
        logo_url || null,
      ]
    );

    return res.json({ message: 'Activité mise à jour', provider: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateMyProvider:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Remplace les zones d'intervention du prestataire
async function setMyAreas(req, res) {
  const client = await db.pool.connect();
  try {
    const { areas } = req.body;
    if (!Array.isArray(areas) || areas.length === 0) {
      return res.status(400).json({ error: 'Au moins une zone d’intervention est requise' });
    }

    const providerRes = await client.query('SELECT id FROM service_providers WHERE user_id = $1', [
      req.user.userId,
    ]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil prestataire introuvable' });
    }
    const providerId = providerRes.rows[0].id;

    await client.query('BEGIN');
    await client.query('DELETE FROM service_areas WHERE provider_id = $1', [providerId]);

    for (const area of areas.slice(0, 10)) {
      await client.query(
        `INSERT INTO service_areas (provider_id, city, district, latitude, longitude, radius_km)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          providerId,
          (area.city || 'Abidjan').toString().trim(),
          area.district ? area.district.toString().trim() : null,
          area.latitude != null ? Number(area.latitude) : null,
          area.longitude != null ? Number(area.longitude) : null,
          area.radius_km != null ? Number(area.radius_km) : 10,
        ]
      );
    }

    await client.query('COMMIT');

    const areasRes = await client.query(
      'SELECT id, city, district, latitude, longitude, radius_km FROM service_areas WHERE provider_id = $1 ORDER BY id ASC',
      [providerId]
    );

    return res.json({ message: 'Zones d’intervention mises à jour', areas: areasRes.rows });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur setMyAreas:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

// Statistiques d'activité du prestataire connecté (missions + gains)
async function getMyProviderStats(req, res) {
  try {
    const providerRes = await db.query(
      'SELECT id, rating, total_reviews, completed_missions, availability, emergency_ready FROM service_providers WHERE user_id = $1',
      [req.user.userId]
    );
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil prestataire introuvable' });
    }
    const provider = providerRes.rows[0];

    const missionsRes = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('accepted', 'in_progress')) AS active_missions,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_missions,
         COUNT(*) FILTER (WHERE status IN ('created', 'matching')) AS open_missions
       FROM service_requests
       WHERE assigned_provider_id = $1`,
      [provider.id]
    );

    const proposalsRes = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_proposals,
         COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_proposals
       FROM request_proposals
       WHERE provider_id = $1`,
      [provider.id]
    );

    const earningsRes = await db.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total_earnings,
              COALESCE(SUM(amount) FILTER (WHERE payment_status = 'pending'), 0) AS pending_earnings
       FROM transactions
       WHERE provider_id = $1`,
      [provider.id]
    );

    return res.json({
      rating: provider.rating,
      total_reviews: provider.total_reviews,
      completed_missions: provider.completed_missions,
      availability: provider.availability,
      emergency_ready: provider.emergency_ready,
      ...missionsRes.rows[0],
      ...proposalsRes.rows[0],
      ...earningsRes.rows[0],
    });
  } catch (error) {
    console.error('Erreur getMyProviderStats:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Ajoute une photo de réalisation à la galerie du prestataire
async function addMyPhoto(req, res) {
  try {
    const { photo_url, caption } = req.body;
    if (!photo_url) {
      return res.status(400).json({ error: 'L’URL de la photo est requise' });
    }

    const providerRes = await db.query('SELECT id FROM service_providers WHERE user_id = $1', [
      req.user.userId,
    ]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil prestataire introuvable' });
    }

    const countRes = await db.query('SELECT COUNT(*) FROM provider_photos WHERE provider_id = $1', [
      providerRes.rows[0].id,
    ]);
    if (parseInt(countRes.rows[0].count, 10) >= 24) {
      return res.status(400).json({ error: 'Limite de 24 photos atteinte' });
    }

    const result = await db.query(
      `INSERT INTO provider_photos (provider_id, photo_url, caption)
       VALUES ($1, $2, $3)
       RETURNING id, photo_url, caption, created_at`,
      [providerRes.rows[0].id, photo_url, caption || null]
    );

    return res.status(201).json({ message: 'Photo ajoutée', photo: result.rows[0] });
  } catch (error) {
    console.error('Erreur addMyPhoto:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Supprime une photo de la galerie du prestataire
async function deleteMyPhoto(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM provider_photos pp
       USING service_providers sp
       WHERE pp.provider_id = sp.id AND sp.user_id = $1 AND pp.id = $2
       RETURNING pp.id`,
      [req.user.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo introuvable' });
    }

    return res.json({ message: 'Photo supprimée' });
  } catch (error) {
    console.error('Erreur deleteMyPhoto:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  getMyProvider,
  updateMyProvider,
  setMyAreas,
  getMyProviderStats,
  addMyPhoto,
  deleteMyPhoto,
};