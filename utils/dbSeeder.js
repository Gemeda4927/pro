const mongoose = require('mongoose');
const faker = require('faker');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('./logger');
const bcrypt = require('bcryptjs');

class DBSeeder {
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
      logger.info('Connected to database for seeding');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }

  // Generate fake user data
  generateUserData(count = 10, options = {}) {
    const users = [];
    const roles = ['user', 'moderator', 'admin'];
    
    for (let i = 0; i < count; i++) {
      const firstName = faker.name.firstName();
      const lastName = faker.name.lastName();
      const email = faker.internet.email(firstName, lastName).toLowerCase();
      
      const user = {
        firstName,
        lastName,
        email,
        password: 'Password123!', // Default password
        phone: faker.phone.phoneNumber(),
        bio: faker.lorem.paragraph(),
        dateOfBirth: faker.date.past(30, new Date(2000, 0, 1)),
        gender: faker.random.arrayElement(['male', 'female', 'other', 'prefer-not-to-say']),
        address: {
          street: faker.address.streetAddress(),
          city: faker.address.city(),
          state: faker.address.state(),
          country: faker.address.country(),
          zipCode: faker.address.zipCode()
        },
        profileImage: `https://i.pravatar.cc/150?img=${i + 1}`,
        role: options.includeAdmins && i === 0 ? 'admin' : 
              options.includeModerators && i === 1 ? 'moderator' : 'user',
        isActive: options.activeOnly !== false,
        isVerified: options.verifiedOnly !== false,
        preferences: {
          emailNotifications: faker.datatype.boolean(),
          pushNotifications: faker.datatype.boolean(),
          language: faker.random.arrayElement(['en', 'fr', 'es', 'de']),
          timezone: faker.random.arrayElement(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
        },
        socialMedia: {
          facebook: `https://facebook.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          twitter: `https://twitter.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          github: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`
        },
        galleryImages: Array.from({ length: faker.datatype.number({ min: 0, max: 5 }) }, () => ({
          url: `https://picsum.photos/seed/${faker.datatype.uuid()}/800/600`,
          caption: faker.lorem.sentence(),
          uploadedAt: faker.date.past(1)
        }))
      };

      users.push(user);
    }

    return users;
  }

  // Hash passwords before saving
  async hashPasswords(users) {
    for (const user of users) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(user.password, salt);
    }
    return users;
  }

  // Seed users
  async seedUsers(count = 10, options = {}) {
    try {
      // Check if users already exist
      const existingCount = await User.countDocuments();
      if (existingCount > 0 && !options.force) {
        logger.warn(`Database already has ${existingCount} users. Use --force to overwrite`);
        return { skipped: true, count: existingCount };
      }

      // Generate user data
      let users = this.generateUserData(count, options);
      
      // Hash passwords
      users = await this.hashPasswords(users);

      // Insert users
      const result = await User.insertMany(users);
      
      logger.info(`Seeded ${result.length} users successfully`);
      return { success: true, count: result.length, users: result };
    } catch (error) {
      logger.error('Seed users failed:', error);
      throw error;
    }
  }

  // Seed specific test users
  async seedTestUsers() {
    const testUsers = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: 'Admin123!',
        phone: '+1234567890',
        role: 'admin',
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Moderator',
        lastName: 'User',
        email: 'moderator@test.com',
        password: 'Moderator123!',
        phone: '+1234567891',
        role: 'moderator',
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@test.com',
        password: 'User123!',
        phone: '+1234567892',
        role: 'user',
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Inactive',
        lastName: 'User',
        email: 'inactive@test.com',
        password: 'Inactive123!',
        phone: '+1234567893',
        role: 'user',
        isActive: false,
        isVerified: true
      },
      {
        firstName: 'Unverified',
        lastName: 'User',
        email: 'unverified@test.com',
        password: 'Unverified123!',
        phone: '+1234567894',
        role: 'user',
        isActive: true,
        isVerified: false
      }
    ];

    try {
      // Hash passwords
      const hashedUsers = await this.hashPasswords(testUsers);

      // Insert test users
      const result = await User.insertMany(hashedUsers);
      
      logger.info(`Seeded ${result.length} test users successfully`);
      return { success: true, count: result.length, users: result };
    } catch (error) {
      logger.error('Seed test users failed:', error);
      throw error;
    }
  }

  // Update specific user
  async updateUser(email, updates) {
    try {
      const user = await User.findOneAndUpdate(
        { email },
        { $set: updates },
        { new: true }
      );

      if (!user) {
        throw new Error(`User with email ${email} not found`);
      }

      logger.info(`Updated user: ${email}`);
      return user;
    } catch (error) {
      logger.error('Update user failed:', error);
      throw error;
    }
  }

  // Get seeding statistics
  async getSeedingStats() {
    try {
      const totalUsers = await User.countDocuments();
      const byRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      const byStatus = await User.aggregate([
        { 
          $group: { 
            _id: {
              isActive: '$isActive',
              isVerified: '$isVerified'
            },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        totalUsers,
        byRole: byRole.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byStatus
      };
    } catch (error) {
      logger.error('Get seeding stats failed:', error);
      throw error;
    }
  }
}

// Command line interface
if (require.main === module) {
  const seeder = new DBSeeder();
  const command = process.argv[2];
  const arg = process.argv[3];

  (async () => {
    await seeder.connect();

    switch (command) {
      case 'seed':
        const count = parseInt(arg) || 10;
        const options = {
          force: process.argv.includes('--force'),
          includeAdmins: process.argv.includes('--admins'),
          includeModerators: process.argv.includes('--moderators'),
          activeOnly: !process.argv.includes('--inactive'),
          verifiedOnly: !process.argv.includes('--unverified')
        };
        await seeder.seedUsers(count, options);
        break;
      case 'test':
        await seeder.seedTestUsers();
        break;
      case 'update':
        const email = arg;
        const updates = {};
        
        // Parse updates from command line
        process.argv.slice(4).forEach(arg => {
          if (arg.includes('=')) {
            const [key, value] = arg.split('=');
            updates[key] = value;
          }
        });
        
        await seeder.updateUser(email, updates);
        break;
      case 'stats':
        const stats = await seeder.getSeedingStats();
        console.log('Seeding Statistics:');
        console.log(`Total Users: ${stats.totalUsers}`);
        console.log('By Role:', stats.byRole);
        console.log('By Status:', stats.byStatus);
        break;
      default:
        console.log(`
Usage: node utils/dbSeeder.js [command] [options]

Commands:
  seed [count]           - Seed random users (default: 10)
  test                   - Seed test users (admin, moderator, regular, etc.)
  update email [updates] - Update specific user
  stats                  - Get seeding statistics

Options for seed command:
  --force                - Overwrite existing users
  --admins               - Include admin users
  --moderators           - Include moderator users
  --inactive             - Include inactive users
  --unverified           - Include unverified users

Examples:
  node utils/dbSeeder.js seed 50 --force --admins
  node utils/dbSeeder.js test
  node utils/dbSeeder.js update admin@test.com role=admin isVerified=true
  node utils/dbSeeder.js stats
        `);
    }

    await seeder.disconnect();
    process.exit(0);
  })().catch(error => {
    logger.error('Seeder failed:', error);
    process.exit(1);
  });
}

module.exports = DBSeeder;