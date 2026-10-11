const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/analyze', authenticateToken, aiController.analyzeRequest);
router.post('/rank-providers', authenticateToken, aiController.rankProviders);

module.exports = router;
