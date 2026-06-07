const express = require('express');
const analyticsService = require('../services/analyticsService');
const router = express.Router();

router.post('/', (req, res) => {
  const { queryText, rating, feedbackText } = req.body;

  if (!queryText || rating === undefined) {
    return res.status(400).json({
      success: false,
      error: { message: 'queryText and rating are required' },
    });
  }

  const success = analyticsService.logFeedback(queryText, rating, feedbackText);
  if (success) {
    return res.status(200).json({ success: true, message: 'Feedback logged successfully' });
  } else {
    return res.status(404).json({ success: false, error: { message: 'Matching query log not found' } });
  }
});

module.exports = router;
