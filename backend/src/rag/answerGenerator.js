const groqService = require('../services/groqService');
const logger = require('../utils/logger');

/**
 * Generate answer using user query, retrieved context, and conversation history
 */
async function generateAnswer(query, contextChunks, history = []) {
  logger.info(`Generating final answer for query: "${query}"`);

  const contextStr = contextChunks.map((c, idx) => `[Source ${idx + 1}]: ${c.text} (Document: ${c.metadata.doc_name}, Category: ${c.metadata.category})`).join('\n\n');

  const historyContext = history.length > 0
    ? `\nConversation History:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}\n`
    : '';

  const systemPrompt = `You are a helpful, professional, and accurate College Student Support Assistant.
Your goal is to answer the user's query factually and concisely using ONLY the provided verified context source blocks.

CRITICAL RULES:
1. Base your answer solely on the provided verified context blocks.
2. If you do not have sufficient information in the context to answer the question, output: "Sorry, I could not find sufficient information in the college knowledge base."
3. Avoid all speculation, assumption, and hallucination.
4. Cite your sources inline using [Source 1], [Source 2], etc. where appropriate.
5. Keep answers highly concise, structured, and easy to read.

Verified Context Block:
${contextStr}
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: query }
  ];

  try {
    const response = await groqService.getChatCompletion(messages, { temperature: 0.2 });
    return response;
  } catch (error) {
    logger.error('Error generating answer:', error);
    throw error;
  }
}

module.exports = { generateAnswer };
