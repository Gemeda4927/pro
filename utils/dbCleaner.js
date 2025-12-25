const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('./logger');

class DBCleaner {
  constructor() {
    this.models = {
      User
    };
  }

  async connect() {
    try {
      await mongoose.connect(config.MONGO_URI, {
        dbName: config.MONGO_DB_NAME,
        maxPoolSize: config.MONGO_POOL_SIZE
      });
      logger.info('Connected to database for cleaning');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }

  // Option 1: Soft delete (mark as inactive)
  async softClean() {
    try {
      const result = await User.updateMany(
        { isActive: true },
        { 
          isActive: false,
          deletedAt: new Date()
        }
      );
      
      logger.info(`Soft cleaned ${result.modifiedCount} users (marked as inactive)`);
      return result;
    } catch (error) {
      logger.error('Soft clean failed:', error);
      throw error;
    }
  }

  // Option 2: Delete specific data only
  async selectiveClean(options = {}) {
    const { 
      deleteInactive = false,
      deleteUnverified = false,
      deleteBeforeDate = null,
      keepAdmins = true 
    } = options;

    try {
      const query = {};
      
      if (deleteInactive) {
        query.isActive = false;
      }
      
      if (deleteUnverified) {
        query.isVerified = false;
      }
      
      if (deleteBeforeDate) {
        query.createdAt = { $lt: new Date(deleteBeforeDate) };
      }
      
      if (keepAdmins) {
        query.role = { $ne: 'admin' };
      }

      const result = await User.deleteMany(query);
      logger.info(`Selective clean deleted ${result.deletedCount} users`);
      return result;
    } catch (error) {
      logger.error('Selective clean failed:', error);
      throw error;
    }
  }

  // Option 3: Full clean (delete all data)
  async fullClean(confirm = false) {
    if (!confirm) {
      logger.warn('Full clean requires confirmation. Use fullClean(true)');
      return;
    }

    try {
      const result = await User.deleteMany({});
      logger.info(`Full clean deleted ${result.deletedCount} users`);
      return result;
    } catch (error) {
      logger.error('Full clean failed:', error);
      throw error;
    }
  }

  // Option 4: Reset specific users
  async resetUsers(userIds = []) {
    try {
      const result = await User.updateMany(
        { _id: { $in: userIds } },
        {
          $set: {
            loginAttempts: 0,
            lockUntil: null,
            passwordResetToken: null,
            passwordResetExpires: null,
            verificationToken: null,
            verificationExpires: null
          }
        }
      );
      
      logger.info(`Reset ${result.modifiedCount} users`);
      return result;
    } catch (error) {
      logger.error('Reset users failed:', error);
      throw error;
    }
  }

  // Option 5: Clean old password reset tokens
  async cleanExpiredTokens() {
    try {
      const result = await User.updateMany(
        {
          $or: [
            { passwordResetExpires: { $lt: new Date() } },
            { verificationExpires: { $lt: new Date() } }
          ]
        },
        {
          $set: {
            passwordResetToken: null,
            passwordResetExpires: null,
            verificationToken: null,
            verificationExpires: null
          }
        }
      );
      
      logger.info(`Cleaned expired tokens for ${result.modifiedCount} users`);
      return result;
    } catch (error) {
      logger.error('Clean expired tokens failed:', error);
      throw error;
    }
  }

  // Option 6: Get database statistics
  async getStats() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      const adminUsers = await User.countDocuments({ role: 'admin' });
      
      const oldestUser = await User.findOne().sort({ createdAt: 1 });
      const newestUser = await User.findOne().sort({ createdAt: -1 });

      return {
        totalUsers,
        activeUsers,
        verifiedUsers,
        adminUsers,
        oldestUser: oldestUser ? oldestUser.createdAt : null,
        newestUser: newestUser ? newestUser.createdAt : null
      };
    } catch (error) {
      logger.error('Get stats failed:', error);
      throw error;
    }
  }
}

// Command line interface
if (require.main === module) {
  const cleaner = new DBCleaner();
  const command = process.argv[2];
  const arg = process.argv[3];

  (async () => {
    await cleaner.connect();

    switch (command) {
      case 'soft':
        await cleaner.softClean();
        break;
      case 'selective':
        const options = {
          deleteInactive: process.argv.includes('--inactive'),
          deleteUnverified: process.argv.includes('--unverified'),
          deleteBeforeDate: process.argv.find(arg => arg.startsWith('--before='))?.split('=')[1],
          keepAdmins: !process.argv.includes('--include-admins')
        };
        await cleaner.selectiveClean(options);
        break;
      case 'full':
        await cleaner.fullClean(arg === 'confirm');
        break;
      case 'reset':
        const userIds = arg ? arg.split(',') : [];
        await cleaner.resetUsers(userIds);
        break;
      case 'tokens':
        await cleaner.cleanExpiredTokens();
        break;
      case 'stats':
        const stats = await cleaner.getStats();
        console.table(stats);
        break;
      default:
        console.log(`
Usage: node utils/dbCleaner.js [command] [options]

Commands:
  soft                    - Mark all users as inactive
  selective [options]     - Selective cleaning
  full confirm            - Delete all users (requires confirmation)
  reset userId1,userId2   - Reset specific users
  tokens                  - Clean expired tokens
  stats                   - Get database statistics

Selective options:
  --inactive             - Delete inactive users
  --unverified           - Delete unverified users
  --before=YYYY-MM-DD    - Delete users created before date
  --include-admins       - Include admin users in deletion

Examples:
  node utils/dbCleaner.js selective --inactive --unverified
  node utils/dbCleaner.js full confirm
  node utils/dbCleaner.js stats
        `);
    }

    await cleaner.disconnect();
    process.exit(0);
  })().catch(error => {
    logger.error('Cleaner failed:', error);
    process.exit(1);
  });
}

module.exports = DBCleaner;