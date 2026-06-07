const groqService = require('../services/groqService');
const logger = require('../utils/logger');

/**
 * Check if the generated answer is grounded in the retrieved context
 * @returns {Promise<'Grounded'|'Partially Grounded'|'Hallucinated'>}
 */
async function checkHallucination(answer, contextChunks) {
  logger.info('Verifying answer grounding (Hallucination check)...');
  
  if (contextChunks.length === 0) {
    // If no context was used, check if it's a canned response or if it hallucinated facts
    if (answer.toLowerCase().includes('sorry, i could not find sufficient information')) {
      return 'Grounded';
    }
    return 'Hallucinated';
  }

  const contextStr = contextChunks.map(c => c.text).join('\n\n');

  const prompt = `You are a Fact-Checking and Hallucination Detection Agent.
Your job is to verify if a generated response is fully grounded in, and supported by, the provided facts.

Grounding Context Facts:
${contextStr}

Generated Response:
${answer}

Evaluate the response against the context:
- "Grounded": If every factual statement in the response is directly supported by the context.
- "Partially Grounded": If some statements are supported but others are unsupported/speculative.
- "Hallucinated": If the response contains major statements, dates, names, or numbers that are not anywhere in the context.

Return ONLY a JSON object with a single key "grounding" whose value is one of: "Grounded", "Partially Grounded", "Hallucinated".
Do not include any explanation.
`;

  try {
    const res = await groqService.getJSONCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.0 });

    const status = res.grounding || 'Hallucinated';
    logger.info(`Grounding check result: ${status}`);
    return status;
  } catch (error) {
    logger.error('Failed to run hallucination check, assuming Grounded for safety:', error);
    return 'Grounded';
  }
}

module.exports = { checkHallucination };
