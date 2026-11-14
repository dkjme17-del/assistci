const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');
const { authStrictLimiter, passwordResetLimiter, refreshLimiter, otpLimiter } = require('../middlewares/rateLimit');

const strictAuth = authStrictLimiter();

router.post('/register', strictAuth, validate(schemas.registerSchema), authController.register);
router.post('/login', strictAuth, validate(schemas.loginSchema), authController.login);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(schemas.forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(schemas.resetPasswordSchema),
  authController.resetPassword
);
router.post(
  '/verify-email',
  passwordResetLimiter,
  validate(schemas.verifyEmailSchema),
  authController.verifyEmail
);
router.post(
  '/resend-verification',
  authenticateToken,
  passwordResetLimiter,
  authController.resendVerification
);
router.post('/phone/request-otp', authenticateToken, otpLimiter, authController.requestPhoneOtp);
router.post(
  '/phone/verify-otp',
  authenticateToken,
  otpLimiter,
  validate(schemas.verifyOtpSchema),
  authController.verifyPhoneOtp
);
router.post('/refresh', refreshLimiter, validate(schemas.refreshTokenSchema), authController.refresh);
router.post(
  '/logout',
  authenticateToken,
  validate(schemas.logoutSchema),
  authController.logout
);
router.get('/me', authenticateToken, authController.getMe);
router.put('/me', authenticateToken, validate(schemas.updateMeSchema), authController.updateMe);
router.patch(
  '/me/password',
  authenticateToken,
  validate(schemas.changePasswordSchema),
  authController.changePassword
);

module.exports = router;
