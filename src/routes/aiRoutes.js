const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { askProject } = require('../controllers/aiController');
const { generateTasks } = require('../controllers/aiTaskController');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post(
  '/projects/:projectId/ask',
  authMiddleware,
  aiLimiter,
  askProject
);

router.post(
  '/projects/:projectId/ai/generate-tasks',
  authMiddleware,
  aiLimiter,
  generateTasks
);

module.exports = router;
