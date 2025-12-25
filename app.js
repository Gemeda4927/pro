// app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// Allow all CORS origins
app.use(cors({ origin: '*', credentials: true }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// File upload without size limit
app.use(fileUpload({
  useTempFiles: process.env.NODE_ENV === 'production',
  tempFileDir: '/tmp/'
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// 404 handler
app.use('*', (req, res) => res.status(404).json({ status: 'error', message: `Can't find ${req.originalUrl}` }));

// Error handler
app.use(errorMiddleware);

module.exports = app;
