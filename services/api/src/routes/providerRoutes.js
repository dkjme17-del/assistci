const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');

// Espace prestataire (réservé au rôle provider)
router.get('/me', authenticateToken, requireRole('provider'), providerController.getMyProvider);
router.put(
  '/me',
  authenticateToken,
  requireRole('provider'),
  validate(schemas.updateProviderSchema),
  providerController.updateMyProvider
);
router.put(
  '/me/areas',
  authenticateToken,
  requireRole('provider'),
  validate(schemas.providerAreasSchema),
  providerController.setMyAreas
);
router.get('/me/stats', authenticateToken, requireRole('provider'), providerController.getMyProviderStats);
router.post(
  '/me/photos',
  authenticateToken,
  requireRole('provider'),
  validate(schemas.providerPhotoSchema),
  providerController.addMyPhoto
);
router.delete(
  '/me/photos/:id',
  authenticateToken,
  requireRole('provider'),
  validate(schemas.idParam, 'params'),
  providerController.deleteMyPhoto
);

module.exports = router;
