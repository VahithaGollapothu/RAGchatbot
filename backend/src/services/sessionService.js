const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

class SessionService {
  constructor() {
    this.sessions = new Map(); // sessionId -> { history: [{role, content}], lastAccessed }
    this.ttl = config.session.ttlHours * 60 * 60 * 1000;
    this.maxHistory = config.session.maxConversationHistory;

    // Start a cleaner interval to remove expired sessions
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // cleanup every hour
  }

  /**
   * Get or create a session
   * @param {string} sessionId 
   */
  getOrCreateSession(sessionId) {
    let id = sessionId;
    if (!id || !this.sessions.has(id)) {
      id = id || uuidv4();
      this.sessions.set(id, {
        id,
        history: [],
        lastAccessed: Date.now(),
      });
      logger.info(`Session created: ${id}`);
    } else {
      const session = this.sessions.get(id);
      session.lastAccessed = Date.now();
    }
    return this.sessions.get(id);
  }

  /**
   * Append messages to the session's conversation history
   * @param {string} sessionId 
   * @param {string} role - 'user' | 'assistant'
   * @param {string} content 
   * @param {object} metadata - Extra details (like citations)
   */
  addMessage(sessionId, role, content, metadata = null) {
    const session = this.getOrCreateSession(sessionId);
    session.history.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata }),
    });

    // Enforce max history length (each interaction is 2 messages: user + assistant)
    const limit = this.maxHistory * 2;
    if (session.history.length > limit) {
      session.history = session.history.slice(session.history.length - limit);
    }
    session.lastAccessed = Date.now();
  }

  /**
   * Return clean history formatted for Groq API
   * @param {string} sessionId 
   */
  getGroqHistory(sessionId) {
    const session = this.getOrCreateSession(sessionId);
    return session.history.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * List all conversation sessions with their metadata
   */
  listSessions() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      lastAccessed: new Date(s.lastAccessed).toISOString(),
      messagesCount: s.history.length,
      preview: s.history.length > 0 ? s.history[s.history.length - 1].content.substring(0, 60) + '...' : 'New Chat',
    })).sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
  }

  /**
   * Clear session history
   * @param {string} sessionId 
   */
  deleteSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      logger.info(`Session deleted: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Remove expired sessions
   */
  cleanup() {
    const now = Date.now();
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > this.ttl) {
        this.sessions.delete(id);
        count++;
      }
    }
    if (count > 0) {
      logger.info(`Cleaned up ${count} expired sessions.`);
    }
  }
}

module.exports = new SessionService();
