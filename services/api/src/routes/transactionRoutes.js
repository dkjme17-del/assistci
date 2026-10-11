const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/', authenticateToken, transactionController.createTransaction);
router.get('/', authenticateToken, transactionController.getMyTransactions);
router.patch('/:id/status', authenticateToken, transactionController.updateTransactionStatus);

module.exports = router;
