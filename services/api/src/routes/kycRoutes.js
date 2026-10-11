const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/upload', authenticateToken, kycController.uploadKycDocument);
router.get('/my-documents', authenticateToken, kycController.getMyKycDocuments);

module.exports = router;

