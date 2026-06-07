const groqService = require('../services/groqService');
const logger = require('../utils/logger');

/**
 * Grade the relevance of retrieved document chunks against the query.
 * Filter out chunks that are irrelevant.
 * @param {string} query 
 * @param {Array<object>} chunks 
 * @returns {Promise<Array<object>>} Only relevant and partially relevant chunks
 */
async function gradeDocuments(query, chunks) {
  if (chunks.length === 0) return [];

  logger.info(`Grading relevance of ${chunks.length} chunks...`);
  const gradedChunks = [];

  for (const chunk of chunks) {
    const prompt = `You are a Relevance Grader Agent evaluating retrieved text chunks.
Given a user query and a retrieved text block, determine if the text is relevant, partially relevant, or irrelevant to answering the query.

User Query: "${query}"
Retrieved Text: "${chunk.text}"

Return ONLY a JSON object with a single key "grade" whose value is one of: "Relevant", "Partially Relevant", "Irrelevant".
Do not include any explanation.
`;

    try {
      const res = await groqService.getJSONCompletion([
        { role: 'user', content: prompt }
      ], { temperature: 0.0 });

      const grade = res.grade || 'Irrelevant';
      logger.debug(`Chunk ID: ${chunk.id} - Grade: ${grade}`);
      
      if (grade === 'Relevant' || grade === 'Partially Relevant') {
        gradedChunks.push({
          ...chunk,
          relevanceGrade: grade,
        });
      }
    } catch (error) {
      logger.error(`Failed to grade chunk ${chunk.id}, retaining it by default:`, error);
      gradedChunks.push(chunk);
    }
  }

  logger.info(`Retained ${gradedChunks.length} out of ${chunks.length} chunks after grading.`);
  return gradedChunks;
}

module.exports = { gradeDocuments };
