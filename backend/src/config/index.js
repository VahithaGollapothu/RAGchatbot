const path = require('path');
// Load from root .env if it exists
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
// Load from backend .env if it exists
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
// Default load
require('dotenv').config();

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Groq
  groq: {
    apiKey:      process.env.GROQ_API_KEY,
    model:       process.env.GROQ_MODEL       || 'llama-3.3-70b-versatile',
    temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.1,
    maxTokens:   parseInt(process.env.GROQ_MAX_TOKENS, 10) || 1024,
  },

  // ChromaDB
  chroma: {
    url:        process.env.CHROMADB_URL        || null,
    host:       process.env.CHROMADB_HOST       || '127.0.0.1',
    port:       parseInt(process.env.CHROMADB_PORT, 10) || 8001,
    collection: process.env.CHROMADB_COLLECTION || 'college_knowledge',
  },

  // RAG
  rag: {
    topK:              parseInt(process.env.TOP_K, 10)              || 5,
    maxRetryAttempts:  parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 2,
    relevanceThreshold: parseFloat(process.env.RELEVANCE_THRESHOLD) || 0.6,
  },

  // Session
  session: {
    ttlHours:           parseInt(process.env.SESSION_TTL_HOURS, 10)        || 24,
    maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY, 10) || 10,
  },

  // Rate limiting
  rateLimit: {
    windowMs:    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)      || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)   || 30,
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info',
    file:  process.env.LOG_FILE  || 'logs/app.log',
  },
};
