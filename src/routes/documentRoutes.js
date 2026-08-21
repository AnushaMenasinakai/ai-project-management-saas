const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const documentController = require('../controllers/documentController');

const router = express.Router();

// Create a document
router.post('/', authMiddleware, documentController.createDocument);

// Get all documents for a project
router.get(
  '/project/:projectId',
  authMiddleware,
  documentController.getProjectDocuments
);

// Get one document
router.get('/:id', authMiddleware, documentController.getDocument);

// Update a document
router.patch('/:id', authMiddleware, documentController.updateDocument);

// Delete a document
router.delete('/:id', authMiddleware, documentController.deleteDocument);

module.exports = router;