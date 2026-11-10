const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.put('/me', authenticateToken, authController.updateMe);
router.patch('/me/password', authenticateToken, authController.changePassword);

module.exports = router;

