const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadDocument, listDocuments, reindexDocuments } = require('../controllers/documentsController');

const router = express.Router();

// Multer disk storage config
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt') || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Only plain text (.txt) and markdown (.md) files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.get('/', listDocuments);
router.post('/upload', upload.single('file'), uploadDocument);
router.post('/reindex', reindexDocuments);

module.exports = router;
