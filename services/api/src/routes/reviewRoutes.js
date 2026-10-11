const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/', authenticateToken, reviewController.createReview);
router.get('/provider/:providerId', reviewController.getProviderReviews);

module.exports = router;
