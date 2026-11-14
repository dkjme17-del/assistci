const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');

router.post(
  '/analyze',
  authenticateToken,
  validate(schemas.aiAnalyzeSchema),
  aiController.analyzeRequest
);
router.post(
  '/rank-providers',
  authenticateToken,
  validate(schemas.aiRankSchema),
  aiController.rankProviders
);

module.exports = router;
