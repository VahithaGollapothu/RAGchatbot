const groqService = require('../services/groqService');
const logger = require('../utils/logger');

/**
 * Grade the final generated response for quality: relevance, accuracy, completeness.
 * @returns {Promise<'High'|'Medium'|'Low'>}
 */
async function gradeAnswer(query, answer) {
  logger.info('Evaluating answer quality...');

  const prompt = `You are an Answer Quality Grader Agent.
Evaluate the following generated answer against the user's query for relevance, accuracy, and completeness.

User Query: "${query}"
Generated Answer: "${answer}"

Grade the answer quality as one of:
- "High": The answer directly, completely, and accurately answers the query.
- "Medium": The answer is helpful and relevant, but misses minor details.
- "Low": The answer is irrelevant, doesn't address the query, or is extremely unhelpful.

Return ONLY a JSON object with a single key "quality" whose value is one of: "High", "Medium", "Low".
Do not include any explanation.
`;

  try {
    const res = await groqService.getJSONCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.0 });

    const grade = res.quality || 'High';
    logger.info(`Answer quality grade: ${grade}`);
    return grade;
  } catch (error) {
    logger.error('Failed to grade answer quality, assuming High:', error);
    return 'High';
  }
}

module.exports = { gradeAnswer };
