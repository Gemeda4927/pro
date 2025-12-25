const mongoose = require('mongoose');
const config = require('../config/env');
const logger = require('../utils/logger');

class Migration {
  constructor() {
    this.migrations = [];
  }

  async connect() {
    await mongoose.connect(config.MONGO_URI, {
      dbName: config.MONGO_DB_NAME
    });
  }

  async disconnect() {
    await mongoose.disconnect();
  }

  addMigration(name, fn) {
    this.migrations.push({ name, fn });
  }

  async run() {
    await this.connect();
    
    const MigrationLog = mongoose.model('MigrationLog', new mongoose.Schema({
      name: String,
      appliedAt: { type: Date, default: Date.now }
    }));

    for (const migration of this.migrations) {
      const alreadyApplied = await MigrationLog.findOne({ name: migration.name });
      
      if (!alreadyApplied) {
        logger.info(`Applying migration: ${migration.name}`);
        
        try {
          await migration.fn();
          await MigrationLog.create({ name: migration.name });
          logger.info(`Migration applied: ${migration.name}`);
        } catch (error) {
          logger.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      } else {
        logger.info(`Migration already applied: ${migration.name}`);
      }
    }
    
    await this.disconnect();
  }
}

// Example migrations
const migration = new Migration();

// Add user email index migration
migration.addMigration('add_user_email_index', async () => {
  const User = mongoose.model('User');
  await User.collection.createIndex({ email: 1 }, { unique: true });
});

// Add user role index migration
migration.addMigration('add_user_role_index', async () => {
  const User = mongoose.model('User');
  await User.collection.createIndex({ role: 1 });
});

// Add login attempts field migration
migration.addMigration('add_login_attempts_field', async () => {
  const User = mongoose.model('User');
  await User.updateMany(
    { loginAttempts: { $exists: false } },
    { $set: { loginAttempts: 0 } }
  );
});

// Command line interface
if (require.main === module) {
  (async () => {
    try {
      await migration.run();
      logger.info('All migrations completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = Migration;