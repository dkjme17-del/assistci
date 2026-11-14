const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Webhooks fournisseurs (pas d'authentification : signature HMAC vérifiée).
router.post('/:provider', paymentController.handleWebhook);

module.exports = router;
