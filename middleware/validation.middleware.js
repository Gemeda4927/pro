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

// Helper function for phone validation
const validatePhoneNumber = (value) => {
  if (!value) return true;
  
  // Remove all non-digit characters except + at the beginning
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Ethiopian phone number patterns
  const ethiopianPatterns = [
    /^\+251[1-9][0-9]{8}$/,     // +251 followed by 9 digits
    /^0[1-9][0-9]{8}$/,         // 0 followed by 9 digits
    /^251[1-9][0-9]{8}$/,       // 251 followed by 9 digits
    /^9[0-9]{8}$/               // 9 followed by 8 digits (mobile)
  ];
  
  // International patterns
  const internationalPatterns = [
    /^\+[1-9]\d{1,14}$/,        // E.164 international format
    /^[1-9]\d{1,14}$/,          // International without +
    /^0[1-9]\d{8,}$/,           // Local format with leading 0
    /^\(\d{3}\) \d{3}-\d{4}$/,  // US format: (123) 456-7890
    /^\d{3}-\d{3}-\d{4}$/       // US format: 123-456-7890
  ];
  
  // Check Ethiopian patterns first
  const isEthiopian = ethiopianPatterns.some(pattern => pattern.test(cleaned) || pattern.test(value));
  
  // Check international patterns
  const isInternational = internationalPatterns.some(pattern => pattern.test(cleaned) || pattern.test(value));
  
  // Check with simple length validation
  const hasValidLength = cleaned.length >= 9 && cleaned.length <= 15;
  
  if (!isEthiopian && !isInternational && !hasValidLength) {
    throw new Error('Please provide a valid phone number. Ethiopian formats: +251XXXXXXXXX, 0XXXXXXXXX, 9XXXXXXXX');
  }
  
  return true;
};

// Helper to format Ethiopian phone numbers
exports.formatEthiopianPhone = (phone) => {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format Ethiopian numbers
  if (digits.startsWith('251') && digits.length === 12) {
    return `+${digits}`; // +251XXXXXXXXX
  } else if (digits.startsWith('0') && digits.length === 10) {
    return `+251${digits.slice(1)}`; // Convert 09XXXXXXXX to +2519XXXXXXXX
  } else if (digits.startsWith('9') && digits.length === 9) {
    return `+251${digits}`; // Convert 9XXXXXXXX to +2519XXXXXXXX
  }
  
  return phone;
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
    .custom(validatePhoneNumber)
    .withMessage('Please provide a valid phone number. Accepts Ethiopian (+251, 0, 9) and international formats.')
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
    .custom(validatePhoneNumber)
    .withMessage('Please provide a valid phone number. Ethiopian formats: +251XXXXXXXXX, 0XXXXXXXXX, 9XXXXXXXX'),
  
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
    .isIn(['en', 'fr', 'es', 'de', 'am']).withMessage('Invalid language'),
  
  body('preferences.timezone')
    .optional()
    .isIn(['UTC', 'Africa/Addis_Ababa', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
    .withMessage('Invalid timezone')
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
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(image.mimetype)) {
      throw new Error('Please upload a valid image file (JPEG, PNG, GIF, WebP)');
    }
    
    // Check file size (100MB max from env or default to 10MB)
    const maxSize = process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 10 * 1024 * 1024;
    if (image.size > maxSize) {
      throw new Error(`File size should be less than ${maxSize / (1024 * 1024)}MB`);
    }
    
    return true;
  })
];

// Ethiopian specific validation rules
exports.ethiopianPhoneValidation = [
  body('phone')
    .notEmpty().withMessage('Phone number is required for Ethiopian users')
    .custom((value) => {
      const ethiopianPatterns = [
        /^\+251[1-9][0-9]{8}$/,     // +251 followed by 9 digits
        /^0[1-9][0-9]{8}$/,         // 0 followed by 9 digits
        /^251[1-9][0-9]{8}$/,       // 251 followed by 9 digits
        /^9[0-9]{8}$/               // 9 followed by 8 digits
      ];
      
      const isValid = ethiopianPatterns.some(pattern => pattern.test(value));
      
      if (!isValid) {
        throw new Error('Please provide a valid Ethiopian phone number. Formats: +251XXXXXXXXX, 0XXXXXXXXX, 9XXXXXXXX');
      }
      
      return true;
    })
];

// Additional Ethiopian user validation
exports.ethiopianUserValidation = [
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .trim(),
  
  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .custom((value) => {
      const ethiopianPatterns = [
        /^\+251[1-9][0-9]{8}$/,
        /^0[1-9][0-9]{8}$/,
        /^251[1-9][0-9]{8}$/,
        /^9[0-9]{8}$/
      ];
      
      const isValid = ethiopianPatterns.some(pattern => pattern.test(value));
      
      if (!isValid) {
        throw new Error('Please provide a valid Ethiopian phone number');
      }
      
      return true;
    })
];