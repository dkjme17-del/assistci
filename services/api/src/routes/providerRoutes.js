const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Espace prestataire (réservé au rôle provider)
router.get('/me', authenticateToken, requireRole('provider'), providerController.getMyProvider);
router.put('/me', authenticateToken, requireRole('provider'), providerController.updateMyProvider);
router.put('/me/areas', authenticateToken, requireRole('provider'), providerController.setMyAreas);
router.get('/me/stats', authenticateToken, requireRole('provider'), providerController.getMyProviderStats);
router.post('/me/photos', authenticateToken, requireRole('provider'), providerController.addMyPhoto);
router.delete('/me/photos/:id', authenticateToken, requireRole('provider'), providerController.deleteMyPhoto);

module.exports = router;