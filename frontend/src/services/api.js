const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://ragchatbot-6ib2.onrender.com';

class APIService {
  constructor() {
    this.baseURL = BACKEND_URL;
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `HTTP ${response.status} Error`);
      }
      return data;
    } catch (err) {
      console.error(`API Error in ${endpoint}:`, err);
      throw err;
    }
  }

  // Chat API
  async sendMessage(message, sessionId = null) {
    return this.fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  // Conversations API
  async getConversations() {
    return this.fetch('/api/conversations');
  }

  async getConversationDetails(id) {
    return this.fetch(`/api/conversations/${id}`);
  }

  async deleteConversation(id) {
    return this.fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // Feedback API
  async submitFeedback(queryText, rating, feedbackText = '') {
    return this.fetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ queryText, rating, feedbackText }),
    });
  }

  // Documents API
  async getDocuments() {
    return this.fetch('/api/documents');
  }

  async reindexDocuments() {
    return this.fetch('/api/documents/reindex', {
      method: 'POST',
    });
  }

  async uploadDocument(file, category) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    // Fetch override for multipart/form-data
    const url = `${this.baseURL}/api/documents/upload`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'File upload failed');
      }
      return data;
    } catch (err) {
      console.error('File upload api error:', err);
      throw err;
    }
  }

  // Dashboard / Analytics API
  async getAnalytics() {
    return this.fetch('/api/analytics');
  }

  // Health check
  async getHealth() {
    return this.fetch('/api/health');
  }
}

export default new APIService();
