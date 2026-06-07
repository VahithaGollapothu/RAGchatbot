const groqService = require('../services/groqService');
const logger = require('../utils/logger');

/**
 * Rewrites and expands a college query to resolve ambiguous terms or abbreviations.
 * Example: "when are exams" -> "what is the examination schedule or academic exam calendar for students"
 */
async function rewriteQuery(query, history = []) {
  logger.info(`Rewriting query: "${query}"`);

  const historyContext = history.length > 0 
    ? `\nConversation History:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}\n`
    : '';

  const prompt = `You are a Query Rewriter Agent for a college information retrieval system.
Your goal is to rewrite, expand, and disambiguate the user's latest query to improve semantic retrieval quality.
- Expand common abbreviations (e.g., "exams" to "examinations", "hostel fee" to "hostel accommodation fee structure", "fees" to "tuition fees structure", "placements" to "campus placements recruitment").
- If the user uses pronouns or references previous questions (e.g., "when does it start?", "how much is it?"), use the conversation history to resolve the subject.
- Keep the search query natural, clear, and relevant to a vector DB retrieval search.

${historyContext}
Original User Query: "${query}"

Return ONLY a JSON object with a single key "rewrittenQuery" containing the expanded query string. Do not include markdown formatting or extra text.
`;

  try {
    const res = await groqService.getJSONCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.1 });

    const rewritten = res.rewrittenQuery || query;
    logger.info(`Rewrote query to: "${rewritten}"`);
    return rewritten;
  } catch (error) {
    logger.error('Failed to rewrite query, using original query:', error);
    return query;
  }
}

module.exports = { rewriteQuery };
