const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { askProject } = require('../controllers/aiController');
const { generateTasks } = require('../controllers/aiTaskController');

const router = express.Router();

router.post(
  '/projects/:projectId/ask',
  authMiddleware,
  askProject
);

router.post(
  '/projects/:projectId/ai/generate-tasks',
  authMiddleware,
  generateTasks
);

module.exports = router;