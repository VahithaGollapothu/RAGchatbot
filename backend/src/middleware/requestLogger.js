const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom format for morgan
const requestLogger = morgan((tokens, req, res) => {
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const status = tokens.status(req, res);
  const responseTime = tokens['response-time'](req, res);
  
  logger.info(`HTTP ${method} ${url} - Status: ${status} - Time: ${responseTime}ms`, {
    method,
    url,
    status,
    responseTime,
    ip: req.ip,
  });
  
  return null; // Don't print to stdout directly, let winston handle it
});

module.exports = requestLogger;
