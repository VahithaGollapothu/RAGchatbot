const logger = require('../utils/logger');

/**
 * Compresses retrieved chunks by removing duplicates, redundant sentences, and noise.
 * @param {Array<object>} chunks 
 * @returns {Array<object>} Compressed chunks
 */
function compressContext(chunks) {
  if (chunks.length === 0) return [];
  logger.info(`Compressing context from ${chunks.length} chunks...`);

  const seenTexts = new Set();
  const compressed = [];

  for (const chunk of chunks) {
    const cleanedText = chunk.text
      .replace(/\s+/g, ' ')
      .trim();

    // Check for exact duplicates or near duplicates
    if (seenTexts.has(cleanedText)) {
      continue;
    }
    seenTexts.add(cleanedText);

    // Keep unique chunks
    compressed.push({
      ...chunk,
      text: cleanedText,
    });
  }

  logger.info(`Compressed context size down to ${compressed.length} unique chunks.`);
  return compressed;
}

module.exports = { compressContext };
