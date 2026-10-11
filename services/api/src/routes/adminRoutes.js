const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.get('/stats', authenticateToken, requireRole('admin'), adminController.getAdminStats);
router.get('/kyc/pending', authenticateToken, requireRole('admin'), adminController.getPendingKyc);
router.post('/kyc/:id/review', authenticateToken, requireRole('admin'), adminController.reviewKycDocument);

module.exports = router;

