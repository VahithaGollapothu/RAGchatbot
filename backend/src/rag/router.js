const groqService = require('../services/groqService');
const logger = require('../utils/logger');

/**
 * Route A: Greeting
 * Route B: General Knowledge
 * Route C: College Domain Query
 * Route D: Out of Scope
 */
async function classifyQuery(query) {
  logger.info(`Classifying query: "${query}"`);

  const prompt = `You are a query classification agent for a college chatbot.
Your task is to classify the incoming user query into exactly one of four categories:
1. "greeting": Simple greetings, farewells, or basic pleasantries (e.g. "hi", "hello", "good morning", "thanks", "how are you").
2. "general": General knowledge questions not related to this specific college (e.g. "What is machine learning?", "Who is Einstein?", "Write a python script").
3. "college": Questions specifically about college admissions, hostel, transport, scholarships, examinations, academics, library, student support, placements, fees, etc. (e.g. "What are the fees?", "When are exams?", "scholarships for sports?").
4. "out_of_scope": Inappropriate queries, movies, politics, sports scores, or unrelated conversational chatter (e.g. "who won the game?", "suggest a horror movie").

Return ONLY a JSON object with a single key "route" whose value is one of: "greeting", "general", "college", "out_of_scope".
Do not include any explanation or markdown formatting.

Query: "${query}"
`;

  try {
    const res = await groqService.getJSONCompletion([
      { role: 'user', content: prompt }
    ], { temperature: 0.0 });

    logger.info(`Query classified as: ${res.route}`);
    return res.route || 'out_of_scope';
  } catch (error) {
    logger.error('Failed to route query, defaulting to out_of_scope:', error);
    return 'out_of_scope';
  }
}

module.exports = { classifyQuery };
