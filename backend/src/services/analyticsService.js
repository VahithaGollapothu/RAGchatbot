const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    // In-memory database for analytics
    this.queries = []; // [{ timestamp, queryText, route, success: bool, feedback: string, rating: number, responseTimeMs }]
    this.popularQuestions = new Map(); // question -> count
  }

  /**
   * Log a new user query and pipeline classification
   */
  logQuery(queryText, route, success = true, responseTimeMs = 0) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      queryText,
      route,
      success,
      responseTimeMs,
      feedback: null,
      rating: null,
    };
    this.queries.push(logEntry);

    // Track popular questions (simple normalization)
    const normalized = queryText.trim().toLowerCase().replace(/[?.!]/g, '');
    this.popularQuestions.set(normalized, (this.popularQuestions.get(normalized) || 0) + 1);

    logger.debug('Analytics logged query', logEntry);
  }

  /**
   * Log user feedback on a response
   */
  logFeedback(queryText, rating, feedbackText = '') {
    // Find the most recent matching query log entry
    const entry = [...this.queries]
      .reverse()
      .find(q => q.queryText.trim().toLowerCase() === queryText.trim().toLowerCase());

    if (entry) {
      entry.rating = rating; // 1-5 or positive/negative (we will use +1 for thumbs up, -1 thumbs down)
      entry.feedback = feedbackText;
      logger.info(`Feedback logged for: "${queryText}" - Rating: ${rating}`);
      return true;
    }
    logger.warn(`Feedback query match not found for: "${queryText}"`);
    return false;
  }

  /**
   * Get overall analytics reports
   */
  getStats() {
    const total = this.queries.length;
    const successful = this.queries.filter(q => q.success).length;
    const successRate = total > 0 ? (successful / total) * 100 : 100;

    // Route breakdown
    const routeDistribution = {
      greeting: 0,
      general: 0,
      college: 0,
      out_of_scope: 0,
    };
    this.queries.forEach(q => {
      if (routeDistribution[q.route] !== undefined) {
        routeDistribution[q.route]++;
      }
    });

    // Feedback rating average
    const rated = this.queries.filter(q => q.rating !== null);
    const positiveCount = rated.filter(q => q.rating > 0).length;
    const positiveFeedbackRate = rated.length > 0 ? (positiveCount / rated.length) * 100 : 100;

    // Get top questions
    const popular = Array.from(this.popularQuestions.entries())
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQueries: total,
      successRate: parseFloat(successRate.toFixed(2)),
      routeDistribution,
      positiveFeedbackRate: parseFloat(positiveFeedbackRate.toFixed(2)),
      totalFeedbackCount: rated.length,
      popularQuestions: popular,
      recentQueries: this.queries.slice(-10).reverse(),
    };
  }
}

module.exports = new AnalyticsService();
