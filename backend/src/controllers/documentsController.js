const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const chromaService = require('../services/chromaService');
const { chunkText } = require('../utils/chunker');
const logger = require('../utils/logger');

// Upload a single file and ingest
async function uploadDocument(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
  }

  const category = req.body.category || 'general';

  try {
    logger.info(`Uploading document: ${req.file.originalname} (Category: ${category})`);
    
    // Check if FastAPI is running and forward
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const result = await chromaService.uploadFile(form);

    // Clean up local uploaded file
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Cleanup if file still exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.error('Error uploading/ingesting document:', error);
    next(error);
  }
}

// List all ingested documents
async function listDocuments(req, res, next) {
  try {
    const list = await chromaService.listDocuments();
    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    logger.error('Error listing documents:', error);
    next(error);
  }
}

// Reindex the data/ directory (ingest files that the user places in /data)
async function reindexDocuments(req, res, next) {
  try {
    logger.info('Initiating collection reindexing of /data directory...');
    const dataDir = path.join(__dirname, '../../data');
    
    if (!fs.existsSync(dataDir)) {
      return res.status(400).json({ success: false, error: { message: 'Data directory does not exist' } });
    }

    // Reset Chroma DB
    await chromaService.reset();

    const categories = fs.readdirSync(dataDir);
    let totalFiles = 0;
    let totalChunks = 0;
    const documentBatches = [];

    for (const cat of categories) {
      const catPath = path.join(dataDir, cat);
      if (fs.statSync(catPath).isDirectory()) {
        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
        for (const file of files) {
          const filePath = path.join(catPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          
          totalFiles++;

          // Chunk document
          const chunks = chunkText(content, {
            chunkSize: 800,
            overlap: 100,
            metadata: {
              doc_name: file,
              category: cat,
              source: `data/${cat}/${file}`,
            },
          });

          chunks.forEach(chunk => {
            documentBatches.push({
              text: chunk.text,
              metadata: chunk.metadata,
            });
          });

          totalChunks += chunks.length;
        }
      }
    }

    if (documentBatches.length > 0) {
      // Send chunks in batches of 10 to avoid memory overloading on Render Free Tier
      const batchSize = 10;
      for (let i = 0; i < documentBatches.length; i += batchSize) {
        const batch = documentBatches.slice(i, i + batchSize);
        await chromaService.ingest(batch);
      }
    }

    logger.info(`Reindexing completed. Reindexed ${totalFiles} files, total chunks: ${totalChunks}`);
    return res.status(200).json({
      success: true,
      data: {
        message: 'Reindexing successful',
        filesProcessed: totalFiles,
        totalChunks,
      },
    });
  } catch (error) {
    logger.error('Error reindexing collection:', error);
    next(error);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  reindexDocuments,
};
