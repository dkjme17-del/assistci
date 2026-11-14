const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');
const { transactionLimiter } = require('../middlewares/rateLimit');

router.post(
  '/',
  authenticateToken,
  transactionLimiter,
  validate(schemas.createTransactionSchema),
  transactionController.createTransaction
);
router.get('/', authenticateToken, transactionController.getMyTransactions);
router.post(
  '/:id/pay',
  authenticateToken,
  transactionLimiter,
  validate(schemas.idParam, 'params'),
  paymentController.initiatePayment
);
router.get(
  '/:id/payment',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  paymentController.getPaymentStatus
);
router.patch(
  '/:id/status',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  validate(schemas.updateTransactionStatusSchema),
  transactionController.updateTransactionStatus
);

module.exports = router;
