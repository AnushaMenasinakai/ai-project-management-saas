const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const documentController = require('../controllers/documentController');
const { aiLimiter } = require('../middleware/rateLimiters');
const handleDocumentUpload = require('../middleware/documentUpload');

const router = express.Router();
const limitEmbeddingUpdate = (req, res, next) => (
  req.body?.content === undefined ? next() : aiLimiter(req, res, next)
);

router.post(
  '/upload',
  authMiddleware,
  aiLimiter,
  handleDocumentUpload,
  documentController.uploadDocument
);

// Create a document
router.post('/', authMiddleware, aiLimiter, documentController.createDocument);

// Get all documents for a project
router.get(
  '/project/:projectId',
  authMiddleware,
  documentController.getProjectDocuments
);

// Get one document
router.get('/:id', authMiddleware, documentController.getDocument);

// Update a document
router.patch('/:id', authMiddleware, limitEmbeddingUpdate, documentController.updateDocument);

// Delete a document
router.delete('/:id', authMiddleware, documentController.deleteDocument);

module.exports = router;
