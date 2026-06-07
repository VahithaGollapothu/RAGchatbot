const chromaService = require('../services/chromaService');
const logger = require('../utils/logger');

/**
 * Retrieve document chunks matching the query from ChromaDB
 * @param {string} query 
 * @param {number} topK 
 * @returns {Promise<Array<object>>}
 */
async function retrieve(query, topK = 5) {
  logger.info(`Retrieving top-${topK} chunks for query: "${query}"`);
  try {
    const data = await chromaService.query(query, topK);
    const results = data.results || [];
    logger.info(`ChromaDB returned ${results.length} chunks`);
    return results;
  } catch (error) {
    logger.error('Failed to retrieve chunks from ChromaDB:', error);
    return [];
  }
}

module.exports = { retrieve };
