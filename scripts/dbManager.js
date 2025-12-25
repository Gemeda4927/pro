const DBCleaner = require('../utils/dbCleaner');
const DBSeeder = require('../utils/dbSeeder');
const logger = require('../utils/logger');

class DBManager {
  constructor() {
    this.cleaner = new DBCleaner();
    this.seeder = new DBSeeder();
  }

  async resetAndSeed(options = {}) {
    try {
      logger.info('Starting database reset and seed...');
      
      // Connect
      await this.cleaner.connect();
      
      // Get stats before
      const statsBefore = await this.cleaner.getStats();
      logger.info('Before cleanup:', statsBefore);
      
      // Clean database
      if (options.softReset) {
        await this.cleaner.softClean();
      } else {
        await this.cleaner.fullClean(true);
      }
      
      // Disconnect cleaner
      await this.cleaner.disconnect();
      
      // Connect seeder
      await this.seeder.connect();
      
      // Seed data
      let seedResult;
      if (options.testData) {
        seedResult = await this.seeder.seedTestUsers();
      } else {
        seedResult = await this.seeder.seedUsers(options.seedCount || 10, {
          force: true,
          includeAdmins: options.includeAdmins,
          includeModerators: options.includeModerators
        });
      }
      
      // Get stats after
      const statsAfter = await this.seeder.getSeedingStats();
      
      // Disconnect seeder
      await this.seeder.disconnect();
      
      logger.info('Database reset and seed completed successfully!');
      logger.info('After seeding:', statsAfter);
      
      return {
        success: true,
        cleaned: statsBefore.totalUsers,
        seeded: seedResult.count,
        stats: statsAfter
      };
    } catch (error) {
      logger.error('Database reset and seed failed:', error);
      throw error;
    }
  }
}

// Command line interface
if (require.main === module) {
  const manager = new DBManager();
  const command = process.argv[2];

  (async () => {
    switch (command) {
      case 'reset':
        const options = {
          softReset: process.argv.includes('--soft'),
          testData: process.argv.includes('--test'),
          seedCount: parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1]) || 10,
          includeAdmins: process.argv.includes('--admins'),
          includeModerators: process.argv.includes('--moderators')
        };
        await manager.resetAndSeed(options);
        break;
      default:
        console.log(`
Usage: node scripts/dbManager.js [command] [options]

Commands:
  reset                   - Reset database and seed new data

Options:
  --soft                  - Soft reset (mark as inactive instead of delete)
  --test                  - Seed test users instead of random
  --count=N               - Number of users to seed (default: 10)
  --admins                - Include admin users
  --moderators            - Include moderator users

Examples:
  node scripts/dbManager.js reset --test
  node scripts/dbManager.js reset --count=50 --admins
  node scripts/dbManager.js reset --soft --count=20
        `);
    }
    
    process.exit(0);
  })().catch(error => {
    logger.error('DB Manager failed:', error);
    process.exit(1);
  });
}

module.exports = DBManager;