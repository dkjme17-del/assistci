const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.get('/stats', authenticateToken, adminController.getAdminStats);
router.get('/kyc/pending', authenticateToken, adminController.getPendingKyc);
router.post('/kyc/:id/review', authenticateToken, adminController.reviewKycDocument);

module.exports = router;

