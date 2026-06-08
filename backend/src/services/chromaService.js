const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class ChromaService {
  constructor() {
    let url = config.chroma.url;
    if (url && url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    this.baseURL = url || `http://${config.chroma.host}:${config.chroma.port}`;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // 120s timeout for cold starts and ingestion
    });
  }

  async requestWithRetry(requestFn, maxRetries = 3, initialDelay = 1000) {
    let attempts = 0;
    let delay = initialDelay;
    while (true) {
      try {
        return await requestFn();
      } catch (error) {
        attempts++;
        const is429 = error.response && error.response.status === 429;
        if (is429 && attempts < maxRetries) {
          logger.warn(`Chroma service request rate limited (429). Retrying in ${delay}ms... (Attempt ${attempts}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  }

  async checkHealth() {
    try {
      const response = await this.requestWithRetry(() => this.client.get('/health'));
      return response.data;
    } catch (error) {
      logger.error('Error connecting to ChromaDB service:', error.message);
      throw new Error(`ChromaDB microservice connection failed: ${error.message}`);
    }
  }

  async query(queryText, topK = null, where = null) {
    try {
      const k = topK || config.rag.topK;
      const response = await this.requestWithRetry(() => this.client.post('/query', {
        query: queryText,
        top_k: k,
        where,
      }));
      return response.data;
    } catch (error) {
      logger.error('Error querying ChromaDB:', error.message);
      throw new Error(`ChromaDB query failed: ${error.message}`);
    }
  }

  async ingest(documents) {
    try {
      // documents: [{ text, metadata }]
      const response = await this.requestWithRetry(() => this.client.post('/ingest', { documents }));
      return response.data;
    } catch (error) {
      logger.error('Error ingesting into ChromaDB:', error.message);
      throw new Error(`ChromaDB ingestion failed: ${error.message}`);
    }
  }

  async listDocuments() {
    try {
      const response = await this.requestWithRetry(() => this.client.get('/documents'));
      return response.data;
    } catch (error) {
      logger.error('Error listing documents from ChromaDB:', error.message);
      throw new Error(`ChromaDB list documents failed: ${error.message}`);
    }
  }

  async getStats() {
    try {
      const response = await this.requestWithRetry(() => this.client.get('/stats'));
      return response.data;
    } catch (error) {
      logger.error('Error getting stats from ChromaDB:', error.message);
      throw new Error(`ChromaDB stats failed: ${error.message}`);
    }
  }

  async reset() {
    try {
      const response = await this.requestWithRetry(() => this.client.post('/reset'));
      return response.data;
    } catch (error) {
      logger.error('Error resetting ChromaDB:', error.message);
      throw new Error(`ChromaDB reset failed: ${error.message}`);
    }
  }

  async uploadFile(formData) {
    try {
      const response = await this.requestWithRetry(() => this.client.post('/upload-file', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      }));
      return response.data;
    } catch (error) {
      logger.error('Error uploading file to ChromaDB:', error.message);
      throw new Error(`ChromaDB file upload failed: ${error.message}`);
    }
  }
}

module.exports = new ChromaService();
