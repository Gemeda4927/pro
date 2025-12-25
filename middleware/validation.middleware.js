const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/appError');

exports.validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    return next(new AppError('Validation failed', 400, extractedErrors));
  };
};

// Auth validation rules
exports.registerValidation = [
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .trim(),
  
  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .trim(),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number')
];

exports.loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

exports.forgotPasswordValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
];

exports.resetPasswordValidation = [
  param('token')
    .notEmpty().withMessage('Token is required'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

exports.changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// User validation rules
exports.updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .trim(),
  
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number'),
  
  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Please provide a valid date')
    .custom(value => {
      if (new Date(value) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Invalid gender value'),
  
  body('address.street')
    .optional()
    .trim(),
  
  body('address.city')
    .optional()
    .trim(),
  
  body('address.state')
    .optional()
    .trim(),
  
  body('address.country')
    .optional()
    .trim(),
  
  body('address.zipCode')
    .optional()
    .isPostalCode('any').withMessage('Invalid zip code'),
  
  body('preferences.emailNotifications')
    .optional()
    .isBoolean().withMessage('Email notifications must be a boolean value'),
  
  body('preferences.pushNotifications')
    .optional()
    .isBoolean().withMessage('Push notifications must be a boolean value'),
  
  body('preferences.language')
    .optional()
    .isIn(['en', 'fr', 'es', 'de']).withMessage('Invalid language'),
  
  body('preferences.timezone')
    .optional()
    .isLength({ min: 1 }).withMessage('Timezone is required')
];

exports.updateUserRoleValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['user', 'admin', 'moderator']).withMessage('Invalid role')
];

// Query validation rules
exports.paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('search')
    .optional()
    .trim(),
  
  query('role')
    .optional()
    .isIn(['user', 'admin', 'moderator']).withMessage('Invalid role'),
  
  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value')
    .toBoolean(),
  
  query('isVerified')
    .optional()
    .isBoolean().withMessage('isVerified must be a boolean value')
    .toBoolean()
];

// File upload validation
exports.fileUploadValidation = [
  body().custom((value, { req }) => {
    if (!req.files || !req.files.image) {
      throw new Error('Image file is required');
    }
    
    const image = req.files.image;
    
    // Check file type
    if (!image.mimetype.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }
    
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (image.size > maxSize) {
      throw new Error('File size should be less than 10MB');
    }
    
    return true;
  })
];