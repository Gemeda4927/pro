const User = require('../models/User');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const cloudinary = require('cloudinary').v2;
const config = require('../config/env');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || config.PAGINATION_LIMIT;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    // Filter by role if provided
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    
    // Filter by verified status if provided
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === 'true';
    }

    // Search functionality
    if (req.query.search) {
      query.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PATCH /api/v1/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, bio, dateOfBirth, gender, address, preferences } = req.body;
    const userId = req.user.id;

    // Build update object
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;
    
    if (address) {
      updateData.address = {
        ...req.user.address,
        ...address
      };
    }
    
    if (preferences) {
      updateData.preferences = {
        ...req.user.preferences,
        ...preferences
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile image
// @route   PATCH /api/v1/users/profile/image
// @access  Private
exports.updateProfileImage = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return next(new AppError('Please upload an image', 400));
    }

    const image = req.files.image;
    
    // Check file size
    if (image.size > config.MAX_FILE_SIZE) {
      return next(new AppError(`File size should be less than ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
    }

    // Check file type
    if (!image.mimetype.startsWith('image')) {
      return next(new AppError('Please upload an image file', 400));
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image.tempFilePath, {
      folder: 'user-profiles',
      width: 500,
      height: 500,
      crop: 'fill',
      gravity: 'face'
    });

    // Delete old image if it's not the default
    if (req.user.profileImage && req.user.profileImage !== 'default-profile.jpg') {
      const publicId = req.user.profileImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`user-profiles/${publicId}`);
    }

    // Update user profile image
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: result.secure_url },
      { new: true }
    ).select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add gallery image
// @route   POST /api/v1/users/gallery
// @access  Private
exports.addGalleryImage = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return next(new AppError('Please upload an image', 400));
    }

    const image = req.files.image;
    const { caption } = req.body;
    
    // Check file size
    if (image.size > config.MAX_FILE_SIZE) {
      return next(new AppError(`File size should be less than ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
    }

    // Check file type
    if (!image.mimetype.startsWith('image')) {
      return next(new AppError('Please upload an image file', 400));
    }

    // Check gallery limit
    const user = await User.findById(req.user.id);
    if (user.galleryImages.length >= config.MAX_GALLERY_IMAGES) {
      return next(new AppError(`Maximum ${config.MAX_GALLERY_IMAGES} images allowed in gallery`, 400));
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image.tempFilePath, {
      folder: 'user-gallery',
      transformation: [
        { width: 1200, height: 800, crop: 'fill' }
      ]
    });

    // Add to gallery
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          galleryImages: {
            url: result.secure_url,
            caption: caption || ''
          }
        }
      },
      { new: true }
    ).select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete gallery image
// @route   DELETE /api/v1/users/gallery/:imageId
// @access  Private
exports.deleteGalleryImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;

    // Find user and image
    const user = await User.findById(req.user.id);
    const image = user.galleryImages.id(imageId);

    if (!image) {
      return next(new AppError('Image not found', 404));
    }

    // Delete from Cloudinary
    const publicId = image.url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`user-gallery/${publicId}`);

    // Remove from gallery
    user.galleryImages.pull(imageId);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/v1/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      {
        new: true,
        runValidators: true
      }
    ).select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user account
// @route   PATCH /api/v1/users/deactivate
// @access  Private
exports.deactivateAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isActive: false },
      { new: true }
    ).select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    res.status(200).json({
      status: 'success',
      message: 'Account deactivated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate user account
// @route   PATCH /api/v1/users/:id/activate
// @access  Private/Admin
exports.activateAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-__v -passwordChangedAt -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Account activated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Delete profile image from Cloudinary if not default
    if (user.profileImage && user.profileImage !== 'default-profile.jpg') {
      const publicId = user.profileImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`user-profiles/${publicId}`);
    }

    // Delete gallery images from Cloudinary
    for (const image of user.galleryImages) {
      const publicId = image.url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`user-gallery/${publicId}`);
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/v1/users/statistics
// @access  Private/Admin
exports.getUserStatistics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByRole,
        recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};