const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Contact Information
  phone: {
    type: String,
    trim: true
    // Removed validator.isMobilePhone validation - using custom validation in middleware
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  // Profile Information
  profileImage: {
    type: String,
    default: 'default-profile.jpg'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },

  // Account Status
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,

  // Security
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  lastLogin: Date,
  lastPasswordChange: Date,

  // Social Media (optional)
  socialMedia: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String,
    github: String
  },

  // Settings & Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'fr', 'es', 'de', 'am'] // Added 'am' for Amharic
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    // Ethiopian specific preferences
    receiveSMS: {
      type: Boolean,
      default: false
    },
    receiveCalls: {
      type: Boolean,
      default: false
    }
  },

  // Ethiopian specific fields
  ethiopianInfo: {
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, 'Middle name cannot exceed 50 characters']
    },
    region: {
      type: String,
      enum: ['Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 
             'Gambela', 'Harari', 'Oromia', 'Sidama', 'Somali', 
             'Southern Nations', 'South West', 'Tigray']
    },
    woreda: String,
    kebele: String,
    houseNumber: String,
    emergencyContact: String,
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null]
    }
  },

  // Statistics
  loginCount: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },

  // Gallery Images
  galleryImages: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Additional fields
  occupation: {
    type: String,
    trim: true,
    maxlength: [100, 'Occupation cannot exceed 100 characters']
  },
  education: {
    type: String,
    trim: true,
    maxlength: [100, 'Education cannot exceed 100 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company cannot exceed 100 characters']
  }

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.verificationToken;
      delete ret.verificationExpires;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.verificationToken;
      delete ret.verificationExpires;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual field for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual field for Ethiopian full name (with middle name)
userSchema.virtual('fullNameEthiopian').get(function() {
  if (this.ethiopianInfo && this.ethiopianInfo.middleName) {
    return `${this.firstName} ${this.ethiopianInfo.middleName} ${this.lastName}`;
  }
  return `${this.firstName} ${this.lastName}`;
});

// Virtual field for formatted phone (Ethiopian format)
userSchema.virtual('formattedPhone').get(function() {
  if (!this.phone) return null;
  
  const digits = this.phone.replace(/\D/g, '');
  
  if (digits.startsWith('251') && digits.length === 12) {
    return `+${digits}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    return `+251${digits.slice(1)}`;
  } else if (digits.startsWith('9') && digits.length === 9) {
    return `+251${digits}`;
  }
  
  return this.phone;
});

// Virtual field for age
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { sparse: true }); // sparse index for optional field
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'ethiopianInfo.region': 1 });

// Compound indexes
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ email: 1, isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update passwordChangedAt
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Pre-save middleware for phone formatting (Ethiopian numbers)
userSchema.pre('save', function(next) {
  if (this.phone && this.isModified('phone')) {
    // Remove all non-digit characters
    const digits = this.phone.replace(/\D/g, '');
    
    // Format Ethiopian phone numbers
    if (digits.startsWith('251') && digits.length === 12) {
      // Already in +251 format, ensure it has +
      this.phone = `+${digits}`;
    } else if (digits.startsWith('0') && digits.length === 10) {
      // Convert 09XXXXXXXX to +2519XXXXXXXX
      this.phone = `+251${digits.slice(1)}`;
    } else if (digits.startsWith('9') && digits.length === 9) {
      // Convert 9XXXXXXXX to +2519XXXXXXXX
      this.phone = `+251${digits}`;
    } else if (digits.length >= 10 && digits.length <= 15) {
      // For other valid international numbers, ensure it starts with +
      if (!digits.startsWith('+') && digits.match(/^[1-9]/)) {
        this.phone = `+${digits}`;
      }
    }
    // If it doesn't match any pattern, keep as is (will be validated by middleware)
  }
  next();
});

// Pre-save middleware to set Ethiopian timezone if not set
userSchema.pre('save', function(next) {
  if (!this.preferences.timezone && this.ethiopianInfo && this.ethiopianInfo.region) {
    this.preferences.timezone = 'Africa/Addis_Ababa';
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Method to create SMS verification token (for Ethiopian users)
userSchema.methods.createSMSVerificationToken = function() {
  // Generate 6-digit code
  const smsToken = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationToken = require('crypto')
    .createHash('sha256')
    .update(smsToken)
    .digest('hex');
  this.verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes for SMS
  return smsToken;
};

// Method to create verification token
userSchema.methods.createVerificationToken = function() {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  this.verificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }
  
  return await this.updateOne(updates);
};

// Method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return await this.save();
};

// Method to check if user is Ethiopian (based on phone or region)
userSchema.methods.isEthiopian = function() {
  if (this.ethiopianInfo && this.ethiopianInfo.region) {
    return true;
  }
  
  if (this.phone) {
    const digits = this.phone.replace(/\D/g, '');
    return digits.startsWith('251') || 
           (digits.startsWith('0') && digits.length === 10) || 
           (digits.startsWith('9') && digits.length === 9);
  }
  
  return false;
};

// Static method to find by Ethiopian phone
userSchema.statics.findByEthiopianPhone = function(phone) {
  const digits = phone.replace(/\D/g, '');
  
  let searchPhone;
  if (digits.startsWith('251') && digits.length === 12) {
    searchPhone = `+${digits}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    searchPhone = `+251${digits.slice(1)}`;
  } else if (digits.startsWith('9') && digits.length === 9) {
    searchPhone = `+251${digits}`;
  } else {
    searchPhone = phone;
  }
  
  return this.findOne({ phone: searchPhone });
};

// Static method to get Ethiopian users
userSchema.statics.getEthiopianUsers = function() {
  return this.find({
    $or: [
      { phone: /^\+251/ },
      { 'ethiopianInfo.region': { $exists: true } }
    ]
  });
};

// Query helper for active users
userSchema.query.active = function() {
  return this.where({ isActive: true });
};

// Query helper for verified users
userSchema.query.verified = function() {
  return this.where({ isVerified: true });
};

// Query helper for Ethiopian users
userSchema.query.ethiopian = function() {
  return this.where({
    $or: [
      { phone: /^\+251/ },
      { 'ethiopianInfo.region': { $exists: true } }
    ]
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;