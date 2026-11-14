const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');

router.get('/stats', authenticateToken, requireRole('admin'), adminController.getAdminStats);
router.get('/kyc/pending', authenticateToken, requireRole('admin'), adminController.getPendingKyc);
router.post(
  '/kyc/:id/review',
  authenticateToken,
  requireRole('admin'),
  validate(schemas.idParam, 'params'),
  validate(schemas.reviewKycSchema),
  adminController.reviewKycDocument
);

module.exports = router;
