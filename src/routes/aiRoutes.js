const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { askProject } = require('../controllers/aiController');

const router = express.Router();

router.post(
  '/projects/:projectId/ask',
  authMiddleware,
  askProject
);

module.exports = router;