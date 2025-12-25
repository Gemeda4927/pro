const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// User profile routes
router.patch(
  '/profile',
  validationMiddleware.validate(validationMiddleware.updateProfileValidation),
  userController.updateProfile
);

router.patch(
  '/profile/image',
  validationMiddleware.validate(validationMiddleware.fileUploadValidation),
  userController.updateProfileImage
);

router.patch(
  '/deactivate',
  userController.deactivateAccount
);

// Gallery routes
router.post(
  '/gallery',
  validationMiddleware.validate(validationMiddleware.fileUploadValidation),
  userController.addGalleryImage
);

router.delete(
  '/gallery/:imageId',
  userController.deleteGalleryImage
);

// Admin routes - require admin role
router.use(authMiddleware.restrictTo('admin'));

router.get(
  '/',
  validationMiddleware.validate(validationMiddleware.paginationValidation),
  userController.getAllUsers
);

router.get(
  '/statistics',
  userController.getUserStatistics
);

router.get(
  '/:id',
  userController.getUser
);

router.patch(
  '/:id/role',
  validationMiddleware.validate(validationMiddleware.updateUserRoleValidation),
  userController.updateUserRole
);

router.patch(
  '/:id/activate',
  userController.activateAccount
);

router.delete(
  '/:id',
  userController.deleteUser
);

module.exports = router;