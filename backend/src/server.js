const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./utils/logger');

// Middlewares
const requestLogger = require('./middleware/requestLogger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Routes
const chatRoutes = require('./routes/chat');
const documentRoutes = require('./routes/documents');
const conversationRoutes = require('./routes/conversations');
const feedbackRoutes = require('./routes/feedback');
const healthRoutes = require('./routes/health');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(requestLogger);
app.use('/api/', rateLimiter);

// API Mappings
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.originalUrl} not found` },
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`===============================================`);
  logger.info(`Server started in ${config.nodeEnv} mode`);
  logger.info(`Port: ${config.port}`);
  logger.info(`Frontend URL Target: ${config.frontendUrl}`);
  logger.info(`===============================================`);
});

module.exports = app;
