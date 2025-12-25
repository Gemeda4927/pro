const winston = require('winston');
const path = require('path');
const config = require('../config/env');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: config.APP_NAME },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(config.LOG_FILE_PATH, 'error.log'),
      level: 'error',
      maxsize: config.LOG_MAX_SIZE,
      maxFiles: config.LOG_MAX_FILES
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.LOG_FILE_PATH, 'combined.log'),
      maxsize: config.LOG_MAX_SIZE,
      maxFiles: config.LOG_MAX_FILES
    })
  ]
});

// If we're not in production, also log to console with simple format
if (config.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    // logger.info(message.trim());
  }
};

module.exports = logger;