require('dotenv').config();

const config = {
  // Server & Network
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  MONGO_URI: process.env.MONGO_URI,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'myDatabaseName',
  MONGO_POOL_SIZE: parseInt(process.env.MONGO_POOL_SIZE) || 10,
  MONGO_CONNECT_TIMEOUT_MS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS) || 30000,

  // Authentication & JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  PASSWORD_RESET_EXPIRES: parseInt(process.env.PASSWORD_RESET_EXPIRES) || 600000,
  LOGIN_MAX_ATTEMPTS: parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5,
  LOGIN_LOCK_TIME: parseInt(process.env.LOGIN_LOCK_TIME) || 900000,

  // Email Service
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Backend API',
  EMAIL_TIMEOUT: parseInt(process.env.EMAIL_TIMEOUT) || 10000,

  // Security
  API_RATE_LIMIT_MAX: parseInt(process.env.API_RATE_LIMIT_MAX) || 100,
  API_RATE_LIMIT_WINDOW_MS: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 900000,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  HELMET_ENABLED: process.env.HELMET_ENABLED !== 'false',
  CSRF_PROTECTION: process.env.CSRF_PROTECTION === 'true',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'combined',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs',
  LOG_MAX_SIZE: parseInt(process.env.LOG_MAX_SIZE) || 10485760,
  LOG_MAX_FILES: parseInt(process.env.LOG_MAX_FILES) || 10,

  // Application
  APP_NAME: process.env.APP_NAME || 'Backend API',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  SESSION_SECRET: process.env.SESSION_SECRET,
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760,
  PAGINATION_LIMIT: parseInt(process.env.PAGINATION_LIMIT) || 50,
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'UTC',

  // Cache
  REDIS_URL: process.env.REDIS_URL,
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600000,
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true',

  // Feature Flags
  FEATURE_SWAGGER: process.env.FEATURE_SWAGGER === 'true',
  FEATURE_GRAPHQL: process.env.FEATURE_GRAPHQL === 'true',
  FEATURE_WEBSOCKET: process.env.FEATURE_WEBSOCKET === 'true',
  FEATURE_CACHE: process.env.FEATURE_CACHE === 'true',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 104857600,
  MAX_GALLERY_IMAGES: parseInt(process.env.MAX_GALLERY_IMAGES) || 10
};

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
requiredEnvVars.forEach((envVar) => {
  if (!config[envVar]) {
    throw new Error(`Environment variable ${envVar} is required`);
  }
});

module.exports = config;