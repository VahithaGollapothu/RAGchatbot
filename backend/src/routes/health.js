const express = require('express');
const chromaService = require('../services/chromaService');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/', async (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'UP',
    components: {
      server: 'UP',
      chromadb: 'DOWN',
    },
  };

  try {
    const chromaHealth = await chromaService.checkHealth();
    status.components.chromadb = 'UP';
    status.chromaDetails = chromaHealth;
    return res.status(200).json({ success: true, data: status });
  } catch (error) {
    logger.error('Health check partial failure:', error.message);
    // Return 200 with status DOWN for specific component
    return res.status(200).json({ success: false, data: status });
  }
});

module.exports = router;
