const { Groq } = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

class GroqService {
  constructor() {
    this.hasKey = !!config.groq.apiKey;
    if (!this.hasKey) {
      logger.error('GROQ_API_KEY environment variable is not defined. LLM features will fail.');
    }
    this.client = new Groq({ apiKey: config.groq.apiKey || 'missing_groq_api_key_placeholder' });
    this.model = config.groq.model;
    this.temperature = config.groq.temperature;
    this.maxTokens = config.groq.maxTokens;
  }

  /**
   * Send a completion request to Groq LLM
   * @param {Array<{role: string, content: string}>} messages 
   * @param {object} options 
   * @returns {Promise<string>}
   */
  async getChatCompletion(messages, options = {}) {
    if (!this.hasKey) {
      throw new Error('GROQ_API_KEY environment variable is missing. Please add it to your .env file and restart the server.');
    }
    try {
      logger.debug(`Sending completion request to Groq model: ${options.model || this.model}`);
      const response = await this.client.chat.completions.create({
        messages,
        model: options.model || this.model,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        response_format: options.responseFormat, // can be {type: 'json_object'}
      });
      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Error in Groq API request:', error);
      throw new Error(`Groq Completion Failed: ${error.message}`);
    }
  }

  /**
   * Helper to perform a completion and parse it as JSON
   * @param {Array<{role: string, content: string}>} messages 
   * @param {object} options 
   */
  async getJSONCompletion(messages, options = {}) {
    const responseText = await this.getChatCompletion(messages, {
      ...options,
      responseFormat: { type: 'json_object' },
    });
    try {
      return JSON.parse(responseText);
    } catch (e) {
      logger.error('Failed to parse JSON response from Groq. Raw response:', responseText);
      throw new Error('Groq LLM did not return valid JSON when requested');
    }
  }
}

module.exports = new GroqService();
