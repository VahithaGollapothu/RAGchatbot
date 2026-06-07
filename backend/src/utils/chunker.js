/**
 * Text chunker utility
 * Splits documents into overlapping chunks for embedding
 */

/**
 * Chunk text into overlapping segments
 * @param {string} text - Raw document text
 * @param {object} options
 * @param {number} options.chunkSize   - Max chars per chunk (default 800)
 * @param {number} options.overlap     - Overlap chars between chunks (default 100)
 * @param {object} options.metadata    - Metadata to attach to each chunk
 * @returns {Array<{text, metadata}>}
 */
function chunkText(text, { chunkSize = 800, overlap = 100, metadata = {} } = {}) {
  const chunks = [];
  const sentences = text.replace(/\r\n/g, '\n').split(/(?<=[.!?])\s+|\n{2,}/);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: { ...metadata, chunk_id: chunkIndex++ },
        });
        // Overlap: keep last portion
        const words = currentChunk.trim().split(' ');
        const overlapWords = words.slice(Math.max(0, words.length - Math.floor(overlap / 5)));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: { ...metadata, chunk_id: chunkIndex },
    });
  }

  return chunks;
}

/**
 * Process a list of documents into chunks
 * @param {Array<{name, content, category, source}>} documents
 * @returns {Array<{text, metadata}>}
 */
function processDocuments(documents) {
  const allChunks = [];
  for (const doc of documents) {
    const chunks = chunkText(doc.content, {
      chunkSize: 800,
      overlap: 100,
      metadata: {
        doc_name: doc.name,
        category: doc.category || 'general',
        source:   doc.source   || doc.name,
      },
    });
    allChunks.push(...chunks);
  }
  return allChunks;
}

module.exports = { chunkText, processDocuments };
