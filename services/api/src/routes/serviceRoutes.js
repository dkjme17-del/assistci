const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

router.get('/categories', serviceController.getCategories);
router.get('/providers', serviceController.getProviders);

module.exports = router;

