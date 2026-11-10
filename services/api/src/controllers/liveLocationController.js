const db = require('../config/db');
const { getRequestAccess } = require('../services/requestAccess');

const LIVE_STATUSES = ['accepted', 'in_progress'];
const LOCATION_EXPIRY_SECONDS = 90;

async function cleanupExpiredLiveLocations() {
  return db.query(
    `DELETE FROM request_live_locations
     WHERE updated_at < NOW() - ($1 * INTERVAL '1 second')`,
    [LOCATION_EXPIRY_SECONDS]
  );
}

async function getLocationAccess(user, requestId) {
  const access = await getRequestAccess(user, requestId);
  if (!access.request) return { response: { status: 404, body: { error: 'Demande introuvable' } } };
  if (!access.allowed || (!access.isClientOwner && !access.isAssignedProvider)) {
    return { response: { status: 403, body: { error: 'Seuls le client et le prestataire assigné peuvent partager leur position' } } };
  }
  if (!LIVE_STATUSES.includes(access.request.status) || !access.request.assigned_provider_id) {
    return { response: { status: 409, body: { error: 'Le suivi GPS est disponible après acceptation du devis' } } };
  }
  return { access };
}

async function getLiveLocations(req, res) {
  try {
    const result = await getLocationAccess(req.user, req.params.id);
    if (result.response) return res.status(result.response.status).json(result.response.body);

    await db.query(
      `DELETE FROM request_live_locations
       WHERE request_id = $1
         AND updated_at < NOW() - ($2 * INTERVAL '1 second')`,
      [req.params.id, LOCATION_EXPIRY_SECONDS]
    );

    const locations = await db.query(
      `SELECT
         client_location.latitude AS client_latitude,
         client_location.longitude AS client_longitude,
         client_location.updated_at AS client_updated_at,
         provider_location.latitude AS provider_latitude,
         provider_location.longitude AS provider_longitude,
         provider_location.updated_at AS provider_updated_at
       FROM service_requests sr
       LEFT JOIN service_providers sp ON sp.id = sr.assigned_provider_id
       LEFT JOIN request_live_locations client_location
         ON client_location.request_id = sr.id AND client_location.user_id = sr.client_id
       LEFT JOIN request_live_locations provider_location
         ON provider_location.request_id = sr.id AND provider_location.user_id = sp.user_id
       WHERE sr.id = $1`,
      [req.params.id]
    );

    if (locations.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const row = locations.rows[0];
    const participantLocation = (latitude, longitude, updatedAt) => (
      latitude == null || longitude == null
        ? null
        : { latitude: Number(latitude), longitude: Number(longitude), updated_at: updatedAt }
    );

    return res.json({
      client: participantLocation(row.client_latitude, row.client_longitude, row.client_updated_at),
      provider: participantLocation(row.provider_latitude, row.provider_longitude, row.provider_updated_at),
      expires_after_seconds: LOCATION_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.error('Erreur getLiveLocations:', error);
    return res.status(500).json({ error: 'Impossible de récupérer les positions partagées' });
  }
}

async function updateLiveLocation(req, res) {
  try {
    const result = await getLocationAccess(req.user, req.params.id);
    if (result.response) return res.status(result.response.status).json(result.response.body);

    const { latitude, longitude } = req.body;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ error: 'Coordonnées GPS invalides' });
    }

    const saved = await db.query(
      `INSERT INTO request_live_locations (request_id, user_id, latitude, longitude, updated_at)
       SELECT sr.id, $2, $3, $4, NOW()
       FROM service_requests sr
       JOIN service_providers sp ON sp.id = sr.assigned_provider_id
       WHERE sr.id = $1
         AND sr.status IN ('accepted', 'in_progress')
         AND (sr.client_id = $2 OR sp.user_id = $2)
       ON CONFLICT (request_id, user_id)
       DO UPDATE SET latitude = EXCLUDED.latitude,
                     longitude = EXCLUDED.longitude,
                     updated_at = NOW()
       RETURNING latitude, longitude, updated_at`,
      [req.params.id, req.user.userId, latitude, longitude]
    );

    if (saved.rows.length === 0) {
      return res.status(409).json({ error: 'Le suivi GPS n’est plus actif pour cette intervention' });
    }

    return res.json({
      location: {
        latitude: Number(saved.rows[0].latitude),
        longitude: Number(saved.rows[0].longitude),
        updated_at: saved.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error('Erreur updateLiveLocation:', error);
    return res.status(500).json({ error: 'Impossible de partager la position GPS' });
  }
}

async function stopLiveLocation(req, res) {
  try {
    const access = await getRequestAccess(req.user, req.params.id);
    if (!access.request) return res.status(404).json({ error: 'Demande introuvable' });
    if (!access.allowed || (!access.isClientOwner && !access.isAssignedProvider)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier le partage GPS de cette demande' });
    }

    await db.query(
      'DELETE FROM request_live_locations WHERE request_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    return res.json({ message: 'Partage de position arrêté' });
  } catch (error) {
    console.error('Erreur stopLiveLocation:', error);
    return res.status(500).json({ error: 'Impossible d’arrêter le partage GPS' });
  }
}

module.exports = {
  getLiveLocations,
  updateLiveLocation,
  stopLiveLocation,
  cleanupExpiredLiveLocations,
};
