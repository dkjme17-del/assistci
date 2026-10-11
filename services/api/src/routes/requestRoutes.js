const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/', authenticateToken, requestController.createRequest);
router.get('/', authenticateToken, requestController.getMyRequests);
router.get('/:id', authenticateToken, requestController.getRequestById);

module.exports = router;

