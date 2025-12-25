const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('./logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: config.EMAIL_SECURE,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASSWORD
  },
  connectionTimeout: config.EMAIL_TIMEOUT,
  socketTimeout: config.EMAIL_TIMEOUT
});

// Verify transporter configuration
transporter.verify((error) => {
  if (error) {
    logger.error('Email transporter verification failed:', error);
  } else {
    // logger.info('Email transporter is ready to send emails');
  }
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    // logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;