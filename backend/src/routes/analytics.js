const express = require('express');
const analyticsService = require('../services/analyticsService');
const router = express.Router();

router.get('/', (req, res) => {
  const stats = analyticsService.getStats();
  return res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = router;
