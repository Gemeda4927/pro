const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// Public routes
router.post(
  '/register',
  validationMiddleware.validate(validationMiddleware.registerValidation),
  authController.register
);

router.post(
  '/login',
  validationMiddleware.validate(validationMiddleware.loginValidation),
  authController.login
);

router.post(
  '/forgot-password',
  validationMiddleware.validate(validationMiddleware.forgotPasswordValidation),
  authController.forgotPassword
);

router.patch(
  '/reset-password/:token',
  validationMiddleware.validate(validationMiddleware.resetPasswordValidation),
  authController.resetPassword
);

router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  validationMiddleware.forgotPasswordValidation,
  authController.resendVerification
);

router.post(
  '/refresh-token',
  authController.refreshToken
);

// Protected routes
router.use(authMiddleware.protect);

router.post('/logout', authController.logout);

router.get('/me', authController.getMe);

router.patch(
  '/change-password',
  validationMiddleware.validate(validationMiddleware.changePasswordValidation),
  authController.changePassword
);

module.exports = router;