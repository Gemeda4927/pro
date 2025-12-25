const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../utils/logger');

class DBBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.json`);
    
    try {
      // Connect to database
      await mongoose.connect(config.MONGO_URI, {
        dbName: config.MONGO_DB_NAME
      });

      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      const backupData = {};
      
      for (const collection of collections) {
        const collectionName = collection.name;
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = data;
      }

      // Write to file
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      logger.info(`Backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      logger.error('Backup failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  async restoreBackup(backupFile) {
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      // Read backup file
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      // Connect to database
      await mongoose.connect(config.MONGO_URI, {
        dbName: config.MONGO_DB_NAME
      });

      // Restore each collection
      for (const [collectionName, data] of Object.entries(backupData)) {
        // Clear existing data
        await mongoose.connection.db.collection(collectionName).deleteMany({});
        
        // Insert backup data
        if (data.length > 0) {
          await mongoose.connection.db.collection(collectionName).insertMany(data);
        }
        
        logger.info(`Restored ${data.length} documents to ${collectionName}`);
      }

      logger.info('Backup restored successfully');
    } catch (error) {
      logger.error('Restore failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  listBackups() {
    const backups = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return backups;
  }

  async deleteOldBackups(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const backups = this.listBackups();
    let deletedCount = 0;

    for (const backup of backups) {
      if (backup.created < cutoffDate) {
        fs.unlinkSync(backup.path);
        logger.info(`Deleted old backup: ${backup.name}`);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

// Command line interface
if (require.main === module) {
  const backup = new DBBackup();
  const command = process.argv[2];
  const arg = process.argv[3];

  (async () => {
    switch (command) {
      case 'create':
        const backupFile = await backup.createBackup();
        console.log(`Backup created: ${backupFile}`);
        break;
      case 'restore':
        if (!arg) {
          console.log('Please specify backup file');
          break;
        }
        const backupPath = path.isAbsolute(arg) ? arg : path.join(backup.backupDir, arg);
        await backup.restoreBackup(backupPath);
        console.log('Backup restored successfully');
        break;
      case 'list':
        const backups = backup.listBackups();
        console.table(backups.map(b => ({
          Name: b.name,
          Size: `${(b.size / 1024).toFixed(2)} KB`,
          Created: b.created.toLocaleString()
        })));
        break;
      case 'cleanup':
        const days = parseInt(arg) || 7;
        const deleted = await backup.deleteOldBackups(days);
        console.log(`Deleted ${deleted} old backups`);
        break;
      default:
        console.log(`
Usage: node scripts/dbBackup.js [command] [options]

Commands:
  create                  - Create a new backup
  restore <filename>      - Restore from backup file
  list                    - List all backups
  cleanup [days]          - Delete backups older than days (default: 7)

Examples:
  node scripts/dbBackup.js create
  node scripts/dbBackup.js restore backup-2024-01-01.json
  node scripts/dbBackup.js list
  node scripts/dbBackup.js cleanup 30
        `);
    }
    
    process.exit(0);
  })().catch(error => {
    logger.error('Backup failed:', error);
    process.exit(1);
  });
}

module.exports = DBBackup;