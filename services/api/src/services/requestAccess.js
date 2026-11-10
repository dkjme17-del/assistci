const db = require('../config/db');

const OPEN_STATUSES = ['created', 'matching'];

// Détermine les droits d'un utilisateur sur une demande d'intervention.
// Retourne { request, allowed, isAdmin, isClientOwner, isAssignedProvider, providerId }.
async function getRequestAccess(user, requestId) {
  const result = await db.query(
    `SELECT id, client_id, assigned_provider_id, status, city, district
     FROM service_requests
     WHERE id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    return { request: null, allowed: false, reason: 'not_found' };
  }

  const request = result.rows[0];
  const userId = Number(user.userId);
  const role = user.role;

  if (role === 'admin' || role === 'moderator') {
    return { request, allowed: true, isAdmin: true, isClientOwner: false, isAssignedProvider: false, providerId: null };
  }

  if (role === 'client' && Number(request.client_id) === userId) {
    return { request, allowed: true, isAdmin: false, isClientOwner: true, isAssignedProvider: false, providerId: null };
  }

  if (role === 'provider') {
    const providerRes = await db.query(
      'SELECT id FROM service_providers WHERE user_id = $1',
      [userId]
    );
    const providerId = providerRes.rows[0]?.id ?? null;

    if (providerId && Number(request.assigned_provider_id) === Number(providerId)) {
      return { request, allowed: true, isAdmin: false, isClientOwner: false, isAssignedProvider: true, providerId };
    }

    if (providerId && OPEN_STATUSES.includes(request.status)) {
      const areasRes = await db.query(
        `SELECT 1 FROM service_areas
         WHERE provider_id = $1
           AND (
             (district IS NOT NULL AND district = $2)
             OR (city IS NOT NULL AND city = $3)
           )
         LIMIT 1`,
        [providerId, request.district, request.city]
      );

      const hasAreasRes = await db.query(
        'SELECT 1 FROM service_areas WHERE provider_id = $1 LIMIT 1',
        [providerId]
      );

      // Un prestataire sans zone déclarée voit les demandes ouvertes (comme dans getMyRequests)
      if (hasAreasRes.rows.length === 0 || areasRes.rows.length > 0) {
        return { request, allowed: true, isAdmin: false, isClientOwner: false, isAssignedProvider: false, providerId };
      }
    }
  }

  return { request, allowed: false, reason: 'forbidden', providerId: null };
}

module.exports = { getRequestAccess, OPEN_STATUSES };
