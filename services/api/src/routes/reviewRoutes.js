const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');

router.post('/', authenticateToken, validate(schemas.createReviewSchema), reviewController.createReview);
router.get(
  '/provider/:providerId',
  validate(schemas.providerParam, 'params'),
  reviewController.getProviderReviews
);
router.get('/mine', authenticateToken, reviewController.getMyReviews);

module.exports = router;
